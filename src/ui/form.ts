import type { ActionRegistrar } from "../registry";
import type {
  FormTarget,
  StarContext,
  StarFormErrors,
  StarFormStatic,
  StarFormValidateOptions,
} from "../types";

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface FormRecord {
  cleanup: () => void;
  form: HTMLFormElement;
  invalidQueued: boolean;
}

interface FormEventDetail {
  controls?: FormControl[];
  errors?: StarFormErrors;
  form: HTMLFormElement;
  submitter?: HTMLElement | null;
}

interface FormCollection {
  api: StarFormStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLFormElement, FormRecord>();
let formId = 0;
let messageId = 0;

function formRoot(value: Element | null): HTMLFormElement | undefined {
  return value instanceof HTMLFormElement && value.matches('form[data-jqs="form"]')
    ? value
    : undefined;
}

function resolveForm(target: FormTarget, root: ParentNode = document): HTMLFormElement {
  const resolved =
    typeof target === "string" ? formRoot(root.querySelector(target)) : formRoot(target);
  if (resolved) return resolved;
  throw new Error(`Form target did not match form[data-jqs="form"]: ${String(target)}`);
}

function allControls(form: HTMLFormElement): FormControl[] {
  return Array.from(form.querySelectorAll<FormControl>("input, select, textarea")).filter(
    (control) => control.form === form,
  );
}

function controls(form: HTMLFormElement): FormControl[] {
  return allControls(form).filter((control) => control.willValidate);
}

function fieldFor(control: FormControl): HTMLElement | undefined {
  const field = control.closest('[data-jqs="field"]');
  return field instanceof HTMLElement ? field : undefined;
}

function messageFor(field: HTMLElement | undefined): HTMLElement | undefined {
  if (!field) return undefined;
  return Array.from(field.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "message",
  );
}

function describedBy(control: FormControl, id: string, add: boolean): void {
  const tokens = new Set(
    (control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean),
  );
  if (add) tokens.add(id);
  else tokens.delete(id);
  if (tokens.size > 0) control.setAttribute("aria-describedby", [...tokens].join(" "));
  else control.removeAttribute("aria-describedby");
}

function markInvalid(control: FormControl): void {
  const field = fieldFor(control);
  const message = messageFor(field);
  control.setAttribute("aria-invalid", "true");
  control.dataset.jqsValidation = "invalid";
  if (field) {
    field.dataset.invalid = "true";
    field.dataset.jqsValidation = "invalid";
  }
  if (!message) return;
  message.id ||= `jqs-form-message-${++messageId}`;
  message.dataset.jqsValidation = "invalid";
  message.textContent = control.validationMessage;
  message.hidden = false;
  message.setAttribute("aria-live", "polite");
  describedBy(control, message.id, true);
}

function clearInvalid(control: FormControl): void {
  if (control.dataset.jqsValidation !== "invalid") return;
  const field = fieldFor(control);
  const message = messageFor(field);
  control.removeAttribute("aria-invalid");
  delete control.dataset.jqsValidation;
  if (field?.dataset.jqsValidation === "invalid") {
    delete field.dataset.invalid;
    delete field.dataset.jqsValidation;
  }
  if (message?.dataset.jqsValidation === "invalid") {
    if (message.id) describedBy(control, message.id, false);
    message.textContent = "";
    message.hidden = true;
    message.removeAttribute("aria-live");
    delete message.dataset.jqsValidation;
  }
}

function clearServerError(control: FormControl): void {
  if (control.dataset.jqsServerValidation !== "invalid") return;
  control.setCustomValidity("");
  delete control.dataset.jqsServerValidation;
  clearInvalid(control);
}

function formMessage(form: HTMLFormElement): HTMLElement | undefined {
  return Array.from(form.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "server-message",
  );
}

function clearFormMessage(form: HTMLFormElement): void {
  const message = formMessage(form);
  if (message?.dataset.jqsServerValidation === "invalid") {
    message.textContent = "";
    message.hidden = true;
    if (message.dataset.jqsServerRole === "added") message.removeAttribute("role");
    if (message.dataset.jqsServerTabindex === "added") message.removeAttribute("tabindex");
    delete message.dataset.jqsServerRole;
    delete message.dataset.jqsServerTabindex;
    delete message.dataset.jqsServerValidation;
  }
  delete form.dataset.serverInvalid;
}

function clearServerErrors(form: HTMLFormElement, names?: string | readonly string[]): void {
  const selected = new Set(typeof names === "string" ? [names] : (names ?? []));
  const all = selected.size === 0;
  for (const control of allControls(form)) {
    if (all || selected.has(control.name)) clearServerError(control);
  }
  if (all || selected.has("_form")) clearFormMessage(form);
  if (
    !allControls(form).some((control) => control.dataset.jqsServerValidation === "invalid") &&
    formMessage(form)?.dataset.jqsServerValidation !== "invalid"
  ) {
    delete form.dataset.serverInvalid;
  }
}

function errorMessage(value: StarFormErrors[string]): string {
  return (Array.isArray(value) ? value : [value])
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" ");
}

function setFormMessage(form: HTMLFormElement, message: string): void {
  const target = formMessage(form);
  if (!target) return;
  target.textContent = message;
  target.hidden = false;
  if (!target.hasAttribute("role")) {
    target.setAttribute("role", "alert");
    target.dataset.jqsServerRole = "added";
  }
  if (!target.hasAttribute("tabindex")) {
    target.tabIndex = -1;
    target.dataset.jqsServerTabindex = "added";
  }
  target.dataset.jqsServerValidation = "invalid";
  form.dataset.serverInvalid = "true";
}

function applyServerErrors(form: HTMLFormElement, errors: StarFormErrors): FormControl[] {
  const invalid: FormControl[] = [];
  const unmatched: string[] = [];
  for (const [name, value] of Object.entries(errors)) {
    const message = errorMessage(value);
    if (!message) continue;
    if (name === "_form") {
      setFormMessage(form, message);
      continue;
    }
    const control = controls(form).find((candidate) => candidate.name === name);
    if (!control) {
      unmatched.push(message);
      continue;
    }
    control.setCustomValidity(message);
    control.dataset.jqsServerValidation = "invalid";
    markInvalid(control);
    invalid.push(control);
  }
  if (unmatched.length > 0) setFormMessage(form, unmatched.join(" "));
  if (invalid.length > 0) form.dataset.serverInvalid = "true";
  return invalid;
}

function syncMarkedControl(control: FormControl): void {
  if (control.dataset.jqsValidation !== "invalid") return;
  if (control.validity.valid) clearInvalid(control);
  else markInvalid(control);
}

function emit(
  form: HTMLFormElement,
  name: "before-submit" | "submit" | "invalid" | "server-invalid" | "reset",
  detail: FormEventDetail,
  cancelable = false,
): boolean {
  return form.dispatchEvent(
    new CustomEvent(`jquery-star:form:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function invalidControls(form: HTMLFormElement): FormControl[] {
  return controls(form).filter((control) => !control.validity.valid);
}

function focusInvalid(form: HTMLFormElement): FormControl | undefined {
  const control = invalidControls(form)[0];
  control?.focus();
  return control;
}

function queueInvalid(record: FormRecord): void {
  if (record.invalidQueued) return;
  record.invalidQueued = true;
  queueMicrotask(() => {
    record.invalidQueued = false;
    const invalid = invalidControls(record.form);
    if (invalid.length > 0) {
      emit(record.form, "invalid", { controls: invalid, form: record.form });
    }
  });
}

function clearForm(form: HTMLFormElement): void {
  clearServerErrors(form);
  for (const control of controls(form)) clearInvalid(control);
}

function wire(record: FormRecord): () => void {
  const invalid = (event: Event): void => {
    if (!(event.target instanceof Element)) return;
    const control = event.target;
    if (
      !(control instanceof HTMLInputElement) &&
      !(control instanceof HTMLSelectElement) &&
      !(control instanceof HTMLTextAreaElement)
    ) {
      return;
    }
    if (control.form !== record.form) return;
    markInvalid(control);
    queueInvalid(record);
  };
  const input = (event: Event): void => {
    const control = event.target;
    if (
      control instanceof HTMLInputElement ||
      control instanceof HTMLSelectElement ||
      control instanceof HTMLTextAreaElement
    ) {
      if (control.form !== record.form) return;
      if (control.dataset.jqsServerValidation === "invalid") {
        clearServerError(control);
        if (!control.validity.valid) markInvalid(control);
      } else {
        syncMarkedControl(control);
      }
    }
  };
  const submit = (event: SubmitEvent): void => {
    const submitter = event.submitter instanceof HTMLElement ? event.submitter : null;
    const detail = { form: record.form, submitter };
    if (!emit(record.form, "before-submit", detail, true)) {
      event.preventDefault();
      return;
    }
    emit(record.form, "submit", detail);
  };
  const reset = (): void => {
    queueMicrotask(() => {
      clearForm(record.form);
      emit(record.form, "reset", { form: record.form });
    });
  };
  record.form.addEventListener("invalid", invalid, true);
  record.form.addEventListener("input", input);
  record.form.addEventListener("change", input);
  record.form.addEventListener("submit", submit);
  record.form.addEventListener("reset", reset);
  return () => {
    record.form.removeEventListener("invalid", invalid, true);
    record.form.removeEventListener("input", input);
    record.form.removeEventListener("change", input);
    record.form.removeEventListener("submit", submit);
    record.form.removeEventListener("reset", reset);
  };
}

function enhanceForm(form: HTMLFormElement): FormRecord {
  form.id ||= `jqs-form-${++formId}`;
  let record = records.get(form);
  if (!record) {
    record = { cleanup: () => undefined, form, invalidQueued: false };
    records.set(form, record);
    record.cleanup = wire(record);
  }
  return record;
}

function validateForm(form: HTMLFormElement, options: StarFormValidateOptions = {}): boolean {
  enhanceForm(form);
  const valid = options.report ? form.reportValidity() : form.checkValidity();
  if (!valid && options.focus !== false) focusInvalid(form);
  return valid;
}

function controlledForm(context: StarContext, target?: unknown): HTMLFormElement {
  if (target instanceof HTMLFormElement && target.matches('[data-jqs="form"]')) return target;
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return resolveForm(local instanceof HTMLFormElement ? local : target);
  }
  const closest = context.element?.closest('form[data-jqs="form"]') ?? null;
  const resolved = formRoot(closest);
  if (resolved) return resolved;
  throw new Error('Form action needs a selector or an element inside form[data-jqs="form"].');
}

export function createForms(registerAction: ActionRegistrar): FormCollection {
  const api: StarFormStatic = {
    validate: (target, options) => validateForm(resolveForm(target), options),
    valid: (target) => invalidControls(resolveForm(target)).length === 0,
    focusInvalid: (target) => focusInvalid(resolveForm(target)),
    setErrors: (target, errors, options = {}) => {
      const form = resolveForm(target);
      enhanceForm(form);
      if (options.replace !== false) clearServerErrors(form);
      const invalid = applyServerErrors(form, errors);
      emit(form, "server-invalid", { controls: invalid, errors, form });
      if (options.focus !== false) (invalid[0] ?? formMessage(form))?.focus();
      return form;
    },
    clearErrors: (target, names) => {
      const form = resolveForm(target);
      clearServerErrors(form, names);
      return form;
    },
    reset: (target) => {
      const form = resolveForm(target);
      enhanceForm(form);
      form.reset();
      return form;
    },
  };
  registerAction("ui.form.validate", (context) =>
    api.validate(controlledForm(context, context.args?.[0])),
  );
  registerAction("ui.form.focus-invalid", (context) =>
    api.focusInvalid(controlledForm(context, context.args?.[0])),
  );
  registerAction("ui.form.set-errors", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const form = controlledForm(context, explicit ? first : undefined);
    const errors = (explicit ? context.args?.[1] : first) as StarFormErrors | undefined;
    if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
      throw new Error("ui.form.set-errors needs a field-error object.");
    }
    return api.setErrors(form, errors);
  });
  registerAction("ui.form.clear-errors", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const form = controlledForm(context, explicit ? first : undefined);
    const names = explicit ? context.args?.[1] : first;
    if (
      names !== undefined &&
      typeof names !== "string" &&
      !(Array.isArray(names) && names.every((name) => typeof name === "string"))
    ) {
      throw new Error("ui.form.clear-errors names must be a string or string array.");
    }
    return api.clearErrors(form, names as string | string[] | undefined);
  });
  registerAction("ui.form.reset", (context) =>
    api.reset(controlledForm(context, context.args?.[0])),
  );

  const enhance = (root: ParentNode): void => {
    const forms = Array.from(root.querySelectorAll<HTMLFormElement>('form[data-jqs="form"]'));
    if (root instanceof HTMLFormElement && root.matches('[data-jqs="form"]')) forms.unshift(root);
    for (const form of forms) enhanceForm(form);
  };
  return { api, enhance };
}

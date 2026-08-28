import { registerAction } from "../registry";
import type { FormTarget, StarContext, StarFormStatic, StarFormValidateOptions } from "../types";

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface FormRecord {
  cleanup: () => void;
  form: HTMLFormElement;
  invalidQueued: boolean;
}

interface FormEventDetail {
  controls?: FormControl[];
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

function controls(form: HTMLFormElement): FormControl[] {
  return Array.from(form.querySelectorAll<FormControl>("input, select, textarea")).filter(
    (control) => control.form === form && control.willValidate,
  );
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

function syncMarkedControl(control: FormControl): void {
  if (control.dataset.jqsValidation !== "invalid") return;
  if (control.validity.valid) clearInvalid(control);
  else markInvalid(control);
}

function emit(
  form: HTMLFormElement,
  name: "before-submit" | "submit" | "invalid" | "reset",
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
      if (control.form === record.form) syncMarkedControl(control);
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

export function createForms(): FormCollection {
  const api: StarFormStatic = {
    validate: (target, options) => validateForm(resolveForm(target), options),
    valid: (target) => invalidControls(resolveForm(target)).length === 0,
    focusInvalid: (target) => focusInvalid(resolveForm(target)),
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

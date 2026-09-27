import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import { isHTMLElement, isHTMLTag } from "../dom";
import type {
  FormTarget,
  StarContext,
  StarFormErrors,
  StarFormErrorOptions,
  StarFormStatic,
  StarFormValidateOptions,
} from "../types";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

type FormControl = HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;

interface FormRecord extends UIResources {
  form: HTMLFormElement;
  invalidQueued: object | undefined;
  validating: FormOperation | undefined;
}

interface FormOperation {
  record: FormRecord;
  valid: () => boolean;
  write: (callback: () => void) => boolean;
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
const intents = new WeakMap<HTMLFormElement, number>();
const serverMessages = new WeakMap<FormControl, string>();
const descriptions = new WeakMap<FormControl, string>();
let formId = 0;
let messageId = 0;

function formRoot(value: Element | null): HTMLFormElement | undefined {
  return isHTMLTag(value, "form") && value.matches('form[data-jqs="form"]') ? value : undefined;
}

function resolveForm(
  target: FormTarget | HTMLElement,
  root: ParentNode = document,
): HTMLFormElement {
  const resolved =
    typeof target === "string"
      ? formRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : formRoot(target);
  if (resolved) return resolved;
  throw new Error(`Form target did not match form[data-jqs="form"]: ${String(target)}`);
}

function allControls(form: HTMLFormElement): FormControl[] {
  const elements = Object.getOwnPropertyDescriptor(
    HTMLFormElement.prototype,
    "elements",
  )?.get?.call(form) as HTMLFormControlsCollection;
  return Array.from(elements).filter(isControl);
}

function isControl(value: EventTarget | null): value is FormControl {
  return isHTMLTag(value, "input") || isHTMLTag(value, "select") || isHTMLTag(value, "textarea");
}

function controls(form: HTMLFormElement): FormControl[] {
  return allControls(form).filter((control) => control.willValidate);
}

function fieldFor(control: FormControl): HTMLElement | undefined {
  const field = control.closest('[data-jqs="field"]');
  return isHTMLElement(field) ? field : undefined;
}

function messageFor(field: HTMLElement | undefined): HTMLElement | undefined {
  if (!field) return undefined;
  return Array.from(field.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "message",
  );
}

function describedBy(control: FormControl, id: string, add: boolean, op: FormOperation): void {
  const tokens = new Set(
    (control.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean),
  );
  if (add) tokens.add(id);
  else tokens.delete(id);
  op.write(() => {
    if (tokens.size > 0) control.setAttribute("aria-describedby", [...tokens].join(" "));
    else control.removeAttribute("aria-describedby");
  });
}

function markInvalid(control: FormControl, op: FormOperation): void {
  const field = fieldFor(control);
  const message = messageFor(field);
  if (
    !op.write(() => {
      control.dataset.jqsValidation = "invalid";
    })
  )
    return;
  if (!op.write(() => control.setAttribute("aria-invalid", "true"))) return;
  if (field) {
    if (
      !op.write(() => {
        field.dataset.invalid = "true";
      })
    )
      return;
    if (
      !op.write(() => {
        field.dataset.jqsValidation = "invalid";
      })
    )
      return;
  }
  if (!message) return;
  if (
    !op.write(() => {
      message.id ||= `jqs-form-message-${++messageId}`;
    })
  )
    return;
  if (
    !op.write(() => {
      message.dataset.jqsValidation = "invalid";
    })
  )
    return;
  if (
    !op.write(() => {
      message.textContent = control.validationMessage;
    })
  )
    return;
  if (
    !op.write(() => {
      message.hidden = false;
    })
  )
    return;
  if (!op.write(() => message.setAttribute("aria-live", "polite"))) return;
  const previous = descriptions.get(control);
  if (previous && previous !== message.id) describedBy(control, previous, false, op);
  if (!op.valid()) return;
  if (!(control.getAttribute("aria-describedby") ?? "").split(/\s+/).includes(message.id)) {
    descriptions.set(control, message.id);
    describedBy(control, message.id, true, op);
  }
}

function clearInvalid(control: FormControl, op: FormOperation): void {
  if (control.dataset.jqsValidation !== "invalid") return;
  const field = fieldFor(control);
  const message = messageFor(field);
  const description = descriptions.get(control);
  if (description) describedBy(control, description, false, op);
  if (!op.valid()) return;
  descriptions.delete(control);
  if (!op.write(() => control.removeAttribute("aria-invalid"))) return;
  if (
    !op.write(() => {
      delete control.dataset.jqsValidation;
    })
  )
    return;
  if (field?.dataset.jqsValidation === "invalid") {
    if (
      !op.write(() => {
        delete field.dataset.invalid;
      })
    )
      return;
    if (
      !op.write(() => {
        delete field.dataset.jqsValidation;
      })
    )
      return;
  }
  if (message?.dataset.jqsValidation === "invalid") {
    if (
      !op.write(() => {
        message.textContent = "";
      })
    )
      return;
    if (
      !op.write(() => {
        message.hidden = true;
      })
    )
      return;
    if (!op.write(() => message.removeAttribute("aria-live"))) return;
    op.write(() => {
      delete message.dataset.jqsValidation;
    });
  }
}

function clearServerError(control: FormControl, op: FormOperation): void {
  if (control.dataset.jqsServerValidation !== "invalid") return;
  if (
    (!control.willValidate || control.validationMessage === serverMessages.get(control)) &&
    !op.write(() => control.setCustomValidity(""))
  )
    return;
  if (!op.valid()) return;
  serverMessages.delete(control);
  if (
    !op.write(() => {
      delete control.dataset.jqsServerValidation;
    })
  )
    return;
  clearInvalid(control, op);
}

function formMessage(form: HTMLFormElement): HTMLElement | undefined {
  return Array.from(form.children).find(
    (child): child is HTMLElement =>
      isHTMLElement(child) && child.dataset.part === "server-message",
  );
}

function clearFormMessage(form: HTMLFormElement, op: FormOperation): void {
  const message = formMessage(form);
  if (message?.dataset.jqsServerValidation === "invalid") {
    if (
      !op.write(() => {
        message.textContent = "";
      })
    )
      return;
    if (
      !op.write(() => {
        message.hidden = true;
      })
    )
      return;
    if (
      message.dataset.jqsServerRole === "added" &&
      !op.write(() => message.removeAttribute("role"))
    )
      return;
    if (
      message.dataset.jqsServerTabindex === "added" &&
      !op.write(() => message.removeAttribute("tabindex"))
    )
      return;
    if (
      !op.write(() => {
        delete message.dataset.jqsServerRole;
      })
    )
      return;
    if (
      !op.write(() => {
        delete message.dataset.jqsServerTabindex;
      })
    )
      return;
    if (
      !op.write(() => {
        delete message.dataset.jqsServerValidation;
      })
    )
      return;
  }
  op.write(() => {
    delete form.dataset.serverInvalid;
  });
}

function clearServerErrors(
  form: HTMLFormElement,
  op: FormOperation,
  names?: string | readonly string[],
): void {
  const selected = new Set(typeof names === "string" ? [names] : (names ?? []));
  const all = selected.size === 0;
  for (const control of allControls(form)) {
    if (!op.valid()) return;
    if (all || selected.has(control.name)) clearServerError(control, op);
  }
  if (all || selected.has("_form")) clearFormMessage(form, op);
  if (
    !allControls(form).some((control) => control.dataset.jqsServerValidation === "invalid") &&
    formMessage(form)?.dataset.jqsServerValidation !== "invalid"
  ) {
    op.write(() => {
      delete form.dataset.serverInvalid;
    });
  }
}

function errorMessage(value: StarFormErrors[string]): string {
  return (Array.isArray(value) ? value : [value])
    .filter((item): item is string => typeof item === "string" && item.trim().length > 0)
    .join(" ");
}

function setFormMessage(form: HTMLFormElement, message: string, op: FormOperation): void {
  const target = formMessage(form);
  if (!target) return;
  if (
    !op.write(() => {
      target.textContent = message;
    })
  )
    return;
  if (
    !op.write(() => {
      target.hidden = false;
    })
  )
    return;
  if (!target.hasAttribute("role")) {
    if (!op.write(() => target.setAttribute("role", "alert"))) return;
    if (
      !op.write(() => {
        target.dataset.jqsServerRole = "added";
      })
    )
      return;
  }
  if (!target.hasAttribute("tabindex")) {
    if (
      !op.write(() => {
        target.tabIndex = -1;
      })
    )
      return;
    if (
      !op.write(() => {
        target.dataset.jqsServerTabindex = "added";
      })
    )
      return;
  }
  if (
    !op.write(() => {
      target.dataset.jqsServerValidation = "invalid";
    })
  )
    return;
  op.write(() => {
    form.dataset.serverInvalid = "true";
  });
}

function applyServerErrors(
  form: HTMLFormElement,
  errors: StarFormErrors,
  op: FormOperation,
): FormControl[] {
  const invalid: FormControl[] = [];
  const unmatched: string[] = [];
  for (const name of Object.keys(errors)) {
    if (!op.valid()) break;
    const value = errors[name];
    const message = errorMessage(value);
    if (!op.valid()) break;
    if (!message) continue;
    if (name === "_form") {
      setFormMessage(form, message, op);
      continue;
    }
    const control = controls(form).find((candidate) => candidate.name === name);
    if (!control) {
      unmatched.push(message);
      continue;
    }
    if (
      !op.write(() => {
        control.dataset.jqsServerValidation = "invalid";
      })
    )
      break;
    serverMessages.set(control, message);
    if (!op.write(() => control.setCustomValidity(message))) break;
    markInvalid(control, op);
    invalid.push(control);
  }
  if (unmatched.length > 0) setFormMessage(form, unmatched.join(" "), op);
  if (invalid.length > 0)
    op.write(() => {
      form.dataset.serverInvalid = "true";
    });
  return invalid;
}

function syncMarkedControl(control: FormControl, op: FormOperation): void {
  if (control.dataset.jqsValidation !== "invalid") return;
  if (control.validity.valid) clearInvalid(control, op);
  else markInvalid(control, op);
}

function emit(
  record: FormRecord,
  name: "before-submit" | "submit" | "invalid" | "server-invalid" | "reset",
  detail: FormEventDetail,
  cancelable = false,
): boolean {
  return record.form.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:form:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function invalidControls(form: HTMLFormElement): FormControl[] {
  return controls(form).filter((control) => !control.validity.valid);
}

function focusInvalid(form: HTMLFormElement, op: FormOperation): FormControl | undefined {
  const control = op.valid() ? invalidControls(form)[0] : undefined;
  if (control) op.write(() => control.focus());
  return control;
}

function queueInvalid(record: FormRecord, op: FormOperation): void {
  if (record.invalidQueued) return;
  const token = {};
  record.invalidQueued = token;
  record.window.queueMicrotask(() => {
    if (record.invalidQueued !== token) return;
    record.invalidQueued = undefined;
    if (!op.valid()) return;
    const invalid = invalidControls(record.form);
    if (invalid.length > 0) {
      emit(record, "invalid", { controls: invalid, form: record.form });
    }
  });
}

function clearForm(form: HTMLFormElement, op: FormOperation): void {
  clearServerErrors(form, op);
  for (const control of allControls(form)) {
    if (!op.valid()) return;
    clearInvalid(control, op);
  }
}

function controlEvent(event: Event, record: FormRecord): void {
  if (!current(record)) return;
  if (event.type === "invalid" && record.validating && !record.validating.valid()) return;
  const control = event.target;
  if (!isControl(control) || control.form !== record.form || event.defaultPrevented) return;
  const allowed = (): boolean => !constrained(record.form, control);
  if (!allowed()) return;
  const op = event.type === "invalid" ? operation(record, allowed) : begin(record.form, allowed);
  if (event.type === "invalid") {
    markInvalid(control, op);
    if (op.valid()) queueInvalid(record, op);
  } else if (control.dataset.jqsServerValidation === "invalid") {
    clearServerError(control, op);
    if (op.valid() && !control.validity.valid) markInvalid(control, op);
  } else {
    syncMarkedControl(control, op);
  }
}

function wire(record: FormRecord): void {
  const input = (event: Event): void => controlEvent(event, record);
  const submit = (event: Event): void => {
    if (event.defaultPrevented || constrained(record.form)) return;
    const candidate = "submitter" in event ? event.submitter : null;
    const submitter = isHTMLElement(candidate) ? candidate : null;
    const op = begin(
      record.form,
      () => !event.defaultPrevented && !constrained(record.form, submitter),
    );
    const validation = allControls(record.form).map((control) => control.validationMessage);
    const detail = { form: record.form, submitter };
    if (
      !op.valid() ||
      !emit(record, "before-submit", detail, true) ||
      !op.valid() ||
      allControls(record.form).some(
        (control, index) => control.validationMessage !== validation[index],
      )
    ) {
      event.preventDefault();
      return;
    }
    emit(record, "submit", { form: record.form, submitter });
  };
  const reset = (event: Event): void => {
    const op = begin(record.form, () => !event.defaultPrevented, false);
    record.window.queueMicrotask(() => {
      if (!op.valid()) return;
      const accepted = operation(record, op.valid);
      clearForm(record.form, accepted);
      if (accepted.valid()) emit(record, "reset", { form: record.form });
    });
  };
  const valid = (): boolean => current(record);
  listenUI(record, valid, record.form, "invalid", input, true);
  listenUI(record, valid, record.form, "input", input);
  listenUI(record, valid, record.form, "change", input);
  listenUI(record, valid, record.form, "submit", submit);
  listenUI(record, valid, record.form, "reset", reset);
}

function enhanceForm(form: HTMLFormElement): FormRecord {
  const previous = records.get(form);
  if (previous && current(previous)) return previous;
  previous?.cleanup();
  const reentered = records.get(form);
  if (reentered) return reentered;
  const record: FormRecord = {
    ...uiResources(form),
    form,
    invalidQueued: undefined,
    validating: undefined,
  };
  record.cleanup = ownUIRecord(records, form, record, () => releaseUIResources(record));
  try {
    form.id ||= `jqs-form-${++formId}`;
    wire(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function validateForm(
  form: HTMLFormElement,
  options: StarFormValidateOptions = {},
  allowed?: () => boolean,
): boolean {
  const op = begin(form, allowed);
  if (!op.valid()) return invalidControls(form).length === 0;
  const report = options.report;
  if (!op.valid()) return invalidControls(form).length === 0;
  const focus = options.focus !== false;
  if (!op.valid()) return invalidControls(form).length === 0;
  const previous = op.record.validating;
  op.record.validating = op;
  let valid: boolean;
  try {
    valid = report
      ? HTMLFormElement.prototype.reportValidity.call(form)
      : HTMLFormElement.prototype.checkValidity.call(form);
  } finally {
    op.record.validating = previous;
  }
  if (!valid && focus) focusInvalid(form, op);
  return valid;
}

function controlledForm(context: StarContext, target?: unknown): HTMLFormElement {
  if (isHTMLElement(target)) return resolveForm(target, context.root);
  if (typeof target === "string") return resolveForm(target, context.root);
  const closest =
    context.element?.closest('form[data-jqs="form"]') ??
    (isHTMLElement(context.root) ? context.root : null);
  const resolved = formRoot(closest);
  if (resolved) return resolved;
  throw new Error('Form action needs a selector or an element inside form[data-jqs="form"].');
}

function current(record: FormRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.form) === record &&
    record.form.dataset.jqs === "form"
  );
}

function controlSource(control: FormControl, values: boolean): string {
  return JSON.stringify([
    control.name,
    control.willValidate,
    ...[
      "form",
      "type",
      "required",
      "disabled",
      "readonly",
      "min",
      "max",
      "step",
      "pattern",
      "minlength",
      "maxlength",
      "multiple",
    ].map((name) => control.getAttribute(name)),
    ...(values ? [control.value, isHTMLTag(control, "input") ? control.checked : undefined] : []),
  ]);
}

function operation(
  record: FormRecord,
  allowed: () => boolean = () => true,
  values = true,
): FormOperation {
  const revision = record.revision;
  const parts = allControls(record.form).map((control) => ({
    control,
    field: fieldFor(control),
    message: messageFor(fieldFor(control)),
    source: controlSource(control, values),
  }));
  const message = formMessage(record.form);
  const valid = (): boolean => {
    if (!current(record, revision) || !allowed() || formMessage(record.form) !== message)
      return false;
    const live = allControls(record.form);
    return (
      live.length === parts.length &&
      parts.every(
        (part, index) =>
          live[index] === part.control &&
          part.control.form === record.form &&
          fieldFor(part.control) === part.field &&
          messageFor(part.field) === part.message &&
          controlSource(part.control, values) === part.source,
      )
    );
  };
  return {
    record,
    valid,
    write(callback) {
      if (!valid()) return false;
      callback();
      return valid();
    },
  };
}

function begin(
  form: HTMLFormElement,
  allowed: () => boolean = () => true,
  values = true,
): FormOperation {
  const intent = (intents.get(form) ?? 0) + 1;
  intents.set(form, intent);
  const record = enhanceForm(form);
  if (intents.get(form) === intent) {
    record.revision += 1;
    record.invalidQueued = undefined;
  }
  return operation(record, () => intents.get(form) === intent && allowed(), values);
}

function constrained(form: HTMLFormElement, element?: Element | null): boolean {
  const selector =
    ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]';
  return Boolean(form.closest(selector) || element?.closest(selector));
}

function setErrors(
  form: HTMLFormElement,
  errors: StarFormErrors,
  options: StarFormErrorOptions = {},
  allowed?: () => boolean,
): HTMLFormElement {
  const op = begin(form, allowed);
  if (!op.valid()) return form;
  const replace = options.replace !== false;
  if (!op.valid()) return form;
  const focus = options.focus !== false;
  if (!op.valid()) return form;
  if (replace) clearServerErrors(form, op);
  if (!op.valid()) return form;
  const invalid = applyServerErrors(form, errors, op);
  if (op.valid()) emit(op.record, "server-invalid", { controls: [...invalid], errors, form });
  if (focus && op.valid()) (invalid[0] ?? formMessage(form))?.focus();
  return form;
}

function clearErrors(
  form: HTMLFormElement,
  names?: string | readonly string[],
  allowed?: () => boolean,
): HTMLFormElement {
  clearServerErrors(form, begin(form, allowed), names);
  return form;
}

function resetForm(form: HTMLFormElement, allowed?: () => boolean): HTMLFormElement {
  const op = begin(form, allowed);
  if (op.valid()) HTMLFormElement.prototype.reset.call(form);
  return form;
}

export function createForms(host: DocumentHost, registerAction: ActionRegistrar): FormCollection {
  const external = (event: Event): void => {
    const control = event.target;
    if (!isControl(control) || !control.form || control.form.contains(control)) return;
    const record = records.get(control.form);
    if (record?.document === host.document) controlEvent(event, record);
  };
  host.listen(host.document, "invalid", external, true);
  host.listen(host.document, "input", external);
  host.listen(host.document, "change", external);
  const api: StarFormStatic = {
    validate: (target, options) => validateForm(resolveForm(target), options),
    valid: (target) => invalidControls(enhanceForm(resolveForm(target)).form).length === 0,
    focusInvalid: (target) => {
      const form = resolveForm(target);
      return focusInvalid(form, begin(form));
    },
    setErrors: (target, errors, options) => setErrors(resolveForm(target), errors, options),
    clearErrors: (target, names) => clearErrors(resolveForm(target), names),
    reset: (target) => resetForm(resolveForm(target)),
  };
  const target = (context: StarContext, value?: unknown): HTMLFormElement => {
    const form = controlledForm(context, value);
    if (form.ownerDocument !== host.document || !uiActive(form))
      throw new Error("This UI target is unavailable in its owning Document.");
    return form;
  };
  const allowed =
    (context: StarContext, form: HTMLFormElement): (() => boolean) =>
    () =>
      !constrained(form, context.element) &&
      !(context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) &&
      !(
        context.event &&
        "isDefaultPrevented" in context.event &&
        context.event.isDefaultPrevented()
      );
  registerAction("ui.form.validate", (context) => {
    const form = target(context, context.args?.[0]);
    return validateForm(form, {}, allowed(context, form));
  });
  registerAction("ui.form.focus-invalid", (context) => {
    const form = target(context, context.args?.[0]);
    return focusInvalid(form, begin(form, allowed(context, form)));
  });
  registerAction("ui.form.set-errors", (context) => {
    const first = context.args?.[0];
    const explicit = isHTMLElement(first) || typeof first === "string";
    const form = target(context, explicit ? first : undefined);
    const errors = (explicit ? context.args?.[1] : first) as StarFormErrors | undefined;
    if (!errors || typeof errors !== "object" || Array.isArray(errors)) {
      throw new Error("ui.form.set-errors needs a field-error object.");
    }
    return setErrors(form, errors, {}, allowed(context, form));
  });
  registerAction("ui.form.clear-errors", (context) => {
    const first = context.args?.[0];
    const explicit =
      isHTMLElement(first) ||
      context.args?.[1] !== undefined ||
      (typeof first === "string" && first.startsWith("#"));
    const form = target(context, explicit ? first : undefined);
    const names = explicit ? context.args?.[1] : first;
    if (
      names !== undefined &&
      typeof names !== "string" &&
      !(Array.isArray(names) && names.every((name) => typeof name === "string"))
    ) {
      throw new Error("ui.form.clear-errors names must be a string or string array.");
    }
    return clearErrors(form, names, allowed(context, form));
  });
  registerAction("ui.form.reset", (context) => {
    const form = target(context, context.args?.[0]);
    return resetForm(form, allowed(context, form));
  });

  const enhance = (root: ParentNode): void => {
    for (const form of uiElements(root, 'form[data-jqs="form"]')) {
      if (isHTMLTag(form, "form")) enhanceForm(form);
    }
  };
  return { api, enhance };
}

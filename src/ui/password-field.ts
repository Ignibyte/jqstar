import { registerAction } from "../registry";
import type { PasswordFieldTarget, StarContext, StarPasswordFieldStatic } from "../types";

interface PasswordFieldRecord {
  cleanup: () => void;
  control: HTMLInputElement;
  root: HTMLElement;
  status: HTMLElement | undefined;
  toggle: HTMLButtonElement;
  visible: boolean;
}

interface PasswordFieldEventDetail {
  control: HTMLInputElement;
  passwordField: HTMLElement;
  visible: boolean;
}

interface PasswordFieldCollection {
  api: StarPasswordFieldStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, PasswordFieldRecord>();
let passwordFieldId = 0;

function passwordFieldRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="password-field"]')
    ? value
    : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      child instanceof HTMLInputElement && child.dataset.part === "control",
  );
  if (!control) {
    throw new Error(`Password Field #${root.id} needs a direct <input data-part="control">.`);
  }
  if (control.type !== "password" && control.type !== "text") {
    throw new Error(`Password Field #${root.id} control must use type="password" or type="text".`);
  }
  return control;
}

function directToggle(root: HTMLElement): HTMLButtonElement {
  const toggle = Array.from(root.children).find(
    (child): child is HTMLButtonElement =>
      child instanceof HTMLButtonElement && child.dataset.part === "toggle",
  );
  if (!toggle) {
    throw new Error(`Password Field #${root.id} needs a direct <button data-part="toggle">.`);
  }
  return toggle;
}

function directStatus(root: HTMLElement): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "status",
  );
}

function unavailable(record: PasswordFieldRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    record.control.disabled
  );
}

function emit(
  record: PasswordFieldRecord,
  name: "before-change" | "change",
  visible: boolean,
  cancelable = false,
): boolean {
  const detail: PasswordFieldEventDetail = {
    control: record.control,
    passwordField: record.root,
    visible,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:password-field:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function sync(record: PasswordFieldRecord): void {
  record.visible = record.control.type === "text";
  const showLabel = record.root.dataset.showLabel || "Show password";
  const hideLabel = record.root.dataset.hideLabel || "Hide password";
  if (record.toggle.type !== "button") record.toggle.type = "button";
  const disabled = unavailable(record);
  if (record.toggle.disabled !== disabled) record.toggle.disabled = disabled;
  record.toggle.setAttribute("aria-controls", record.control.id);
  record.toggle.setAttribute("aria-pressed", String(record.visible));
  record.toggle.setAttribute("aria-label", record.visible ? hideLabel : showLabel);
  record.root.dataset.state = record.visible ? "visible" : "hidden";
  const label = record.toggle.querySelector<HTMLElement>('[data-part="toggle-label"]');
  if (label) label.textContent = record.visible ? hideLabel : showLabel;
}

function requestVisibility(root: HTMLElement, visible: boolean): HTMLElement {
  const record = records.get(root) ?? enhancePasswordField(root);
  if (unavailable(record) || record.visible === visible) return root;
  if (!emit(record, "before-change", visible, true)) return root;
  const selectionStart = record.control.selectionStart;
  const selectionEnd = record.control.selectionEnd;
  record.control.type = visible ? "text" : "password";
  sync(record);
  if (
    document.activeElement === record.control &&
    selectionStart !== null &&
    selectionEnd !== null
  ) {
    record.control.setSelectionRange(selectionStart, selectionEnd);
  }
  emit(record, "change", visible);
  return root;
}

function announceCapsLock(record: PasswordFieldRecord, event: KeyboardEvent): void {
  if (!record.status) return;
  const active = event.getModifierState("CapsLock");
  record.status.textContent = active ? "Caps Lock is on." : "";
  record.status.hidden = !active;
}

function enhancePasswordField(root: HTMLElement): PasswordFieldRecord {
  const existing = records.get(root);
  if (existing) {
    sync(existing);
    return existing;
  }
  root.id ||= `jqs-password-field-${++passwordFieldId}`;
  const control = directControl(root);
  const toggle = directToggle(root);
  const status = directStatus(root);
  control.id ||= `${root.id}-control`;
  if (status) {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;
  }
  const record: PasswordFieldRecord = {
    cleanup: () => undefined,
    control,
    root,
    status,
    toggle,
    visible: control.type === "text",
  };
  const click = (): void => void requestVisibility(root, !record.visible);
  const key = (event: KeyboardEvent): void => announceCapsLock(record, event);
  const blur = (): void => {
    if (!status) return;
    status.textContent = "";
    status.hidden = true;
  };
  toggle.addEventListener("click", click);
  control.addEventListener("keydown", key);
  control.addEventListener("keyup", key);
  control.addEventListener("blur", blur);
  record.cleanup = () => {
    toggle.removeEventListener("click", click);
    control.removeEventListener("keydown", key);
    control.removeEventListener("keyup", key);
    control.removeEventListener("blur", blur);
  };
  records.set(root, record);
  sync(record);
  return record;
}

function resolvePasswordField(
  target: PasswordFieldTarget,
  root: ParentNode = document,
): HTMLElement {
  const resolved =
    typeof target === "string"
      ? passwordFieldRoot(root.querySelector(target))
      : passwordFieldRoot(target);
  if (resolved) return resolved;
  throw new Error(
    `Password Field target did not match data-jqs="password-field": ${String(target)}`,
  );
}

function controlledPasswordField(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="password-field"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolvePasswordField(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="password-field"]');
  return resolvePasswordField(closest instanceof HTMLElement ? closest : String(target));
}

function registerActions(api: StarPasswordFieldStatic): void {
  registerAction("ui.password-field.show", (context) =>
    api.show(controlledPasswordField(context, context.args?.[0])),
  );
  registerAction("ui.password-field.hide", (context) =>
    api.hide(controlledPasswordField(context, context.args?.[0])),
  );
  registerAction("ui.password-field.toggle", (context) =>
    api.toggle(controlledPasswordField(context, context.args?.[0])),
  );
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="password-field"]')));
  for (const element of elements) {
    const field = passwordFieldRoot(element);
    if (field) enhancePasswordField(field);
  }
}

export function createPasswordFields(): PasswordFieldCollection {
  const api: StarPasswordFieldStatic = {
    show: (target) => requestVisibility(resolvePasswordField(target), true),
    hide: (target) => requestVisibility(resolvePasswordField(target), false),
    toggle: (target) => {
      const root = resolvePasswordField(target);
      const record = records.get(root) ?? enhancePasswordField(root);
      return requestVisibility(root, !record.visible);
    },
    visible: (target) => {
      const root = resolvePasswordField(target);
      return (records.get(root) ?? enhancePasswordField(root)).visible;
    },
  };
  registerActions(api);
  return { api, enhance: enhanceTree };
}

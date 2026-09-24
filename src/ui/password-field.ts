import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { PasswordFieldTarget, StarContext, StarPasswordFieldStatic } from "../types";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

interface PasswordFieldRecord extends UIResources {
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
  return isHTMLElement(value) && value.matches('[data-jqs="password-field"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      isHTMLTag(child, "input") && child.dataset.part === "control",
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
      isHTMLTag(child, "button") && child.dataset.part === "toggle",
  );
  if (!toggle) {
    throw new Error(`Password Field #${root.id} needs a direct <button data-part="toggle">.`);
  }
  return toggle;
}

function directStatus(root: HTMLElement): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "status",
  );
}

function unavailable(record: PasswordFieldRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    record.control.disabled
  );
}

function current(record: PasswordFieldRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.querySelector(':scope > input[data-part="control"]') === record.control &&
    record.root.querySelector(':scope > button[data-part="toggle"]') === record.toggle &&
    (record.root.querySelector(':scope > [data-part="status"]') ?? undefined) === record.status
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:password-field:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
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
  const record = recordFor(root);
  const revision = ++record.revision;
  if (unavailable(record) || record.visible === visible) return root;
  if (
    !emit(record, "before-change", visible, true) ||
    !current(record, revision) ||
    unavailable(record)
  )
    return root;
  const selectionStart = record.control.selectionStart;
  const selectionEnd = record.control.selectionEnd;
  record.control.type = visible ? "text" : "password";
  sync(record);
  if (
    record.document.activeElement === record.control &&
    selectionStart !== null &&
    selectionEnd !== null
  ) {
    record.control.setSelectionRange(selectionStart, selectionEnd);
  }
  if (!current(record, revision)) return root;
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
  const control = directControl(root);
  const toggle = directToggle(root);
  const status = directStatus(root);
  if (
    existing &&
    current(existing) &&
    existing.control === control &&
    existing.toggle === toggle &&
    existing.status === status
  ) {
    if (existing.visible !== (control.type === "text")) existing.revision += 1;
    sync(existing);
    return existing;
  }
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  root.id ||= `jqs-password-field-${++passwordFieldId}`;
  control.id ||= `${root.id}-control`;
  if (status) {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
    status.hidden = true;
  }
  const record: PasswordFieldRecord = {
    ...uiResources(root),
    control,
    root,
    status,
    toggle,
    visible: control.type === "text",
  };
  const click = (): void => void requestVisibility(root, !record.visible);
  const key = (event: Event): void => announceCapsLock(record, event as KeyboardEvent);
  const blur = (): void => {
    if (!status) return;
    status.textContent = "";
    status.hidden = true;
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const listen = listenUI.bind(undefined, record, () => current(record));
    listen(toggle, "click", click);
    listen(control, "keydown", key);
    listen(control, "keyup", key);
    listen(control, "blur", blur);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    sync(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): PasswordFieldRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhancePasswordField(root);
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
  if (isHTMLElement(target)) return resolvePasswordField(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) {
    return resolvePasswordField(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="password-field"]');
  return resolvePasswordField(isHTMLElement(closest) ? closest : String(target));
}

function registerActions(api: StarPasswordFieldStatic, registerAction: ActionRegistrar): void {
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
  for (const element of uiElements(root, '[data-jqs="password-field"]')) {
    const field = passwordFieldRoot(element);
    if (field) enhancePasswordField(field);
  }
}

export function createPasswordFields(registerAction: ActionRegistrar): PasswordFieldCollection {
  const api: StarPasswordFieldStatic = {
    show: (target) => requestVisibility(resolvePasswordField(target), true),
    hide: (target) => requestVisibility(resolvePasswordField(target), false),
    toggle: (target) => {
      const root = resolvePasswordField(target);
      const record = recordFor(root);
      return requestVisibility(root, !record.visible);
    },
    visible: (target) => {
      const root = resolvePasswordField(target);
      return recordFor(root).visible;
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}

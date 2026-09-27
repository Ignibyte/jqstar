import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { InputOTPTarget, StarContext, StarInputOTPStatic } from "../types";
import {
  failUISetup,
  listenUI,
  listenUIReset,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

interface InputOTPRecord extends UIResources {
  form: HTMLFormElement | null;
  input: HTMLInputElement;
  completed: boolean;
  signature: string;
  root: HTMLElement;
  slots: HTMLElement;
  status: HTMLElement | undefined;
  value: string;
}

interface InputOTPEventDetail {
  complete: boolean;
  control: HTMLInputElement;
  inputOTP: HTMLElement;
  previousValue: string;
  value: string;
}

interface InputOTPCollection {
  api: StarInputOTPStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, InputOTPRecord>();
const reflected = new WeakMap<HTMLElement, string>();
let inputOTPId = 0;

function inputOTPRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="input-otp"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      isHTMLTag(child, "input") && child.dataset.part === "control",
  );
  if (!control) {
    throw new Error(`Input OTP #${root.id} needs a direct <input data-part="control">.`);
  }
  if (!["text", "password", "tel"].includes(control.type)) {
    throw new Error(`Input OTP #${root.id} control must use type="text", "password", or "tel".`);
  }
  return control;
}

function directPart(root: HTMLElement, part: "slots" | "status"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}

function createSlots(root: HTMLElement): HTMLElement {
  const slots = root.ownerDocument.createElement("div");
  slots.dataset.part = "slots";
  slots.dataset.generated = "";
  slots.setAttribute("aria-hidden", "true");
  root.append(slots);
  return slots;
}

function length(record: Pick<InputOTPRecord, "root" | "input">): number {
  const configured = Number(record.root.dataset.length);
  if (Number.isInteger(configured) && configured > 0) return configured;
  if (record.input.maxLength > 0) return record.input.maxLength;
  return 6;
}

function characterPattern(root: HTMLElement): RegExp {
  const source = root.dataset.pattern?.trim() || "[0-9]";
  try {
    return new RegExp(`^(?:${source})$`, "u");
  } catch {
    throw new Error(`Input OTP #${root.id} has an invalid data-pattern: ${source}`);
  }
}

function normalize(record: InputOTPRecord, value: string): string {
  const pattern = characterPattern(record.root);
  return Array.from(value.normalize("NFKC"))
    .filter((character) => pattern.test(character))
    .slice(0, length(record))
    .join("");
}

function complete(record: InputOTPRecord, value = record.value): boolean {
  return value.length === length(record);
}

function configuration(record: InputOTPRecord): string {
  return JSON.stringify([length(record), record.root.dataset.pattern, record.input.type]);
}

function unavailable(record: InputOTPRecord): boolean {
  return record.input.disabled || record.input.readOnly;
}

function current(record: InputOTPRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.querySelector(':scope > input[data-part="control"]') === record.input &&
    directPart(record.root, "slots") === record.slots &&
    directPart(record.root, "status") === record.status &&
    record.input.form === record.form
  );
}

function emit(
  record: InputOTPRecord,
  name: "before-change" | "change" | "complete",
  value: string,
  previousValue: string,
  cancelable = false,
): boolean {
  const detail: InputOTPEventDetail = {
    complete: complete(record, value),
    control: record.input,
    inputOTP: record.root,
    previousValue,
    value,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:input-otp:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function slotElement(index: number, document: Document): HTMLElement {
  const slot = document.createElement("span");
  slot.dataset.part = "slot";
  slot.dataset.index = String(index);
  return slot;
}

function ensureSlots(record: InputOTPRecord): HTMLElement[] {
  const count = length(record);
  let slots = Array.from(record.slots.children).filter(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "slot",
  );
  if (slots.length !== count) {
    slots = Array.from({ length: count }, (_, index) =>
      slotElement(index, record.root.ownerDocument),
    );
    record.slots.replaceChildren(...slots);
  }
  return slots;
}

function sync(record: InputOTPRecord): void {
  const count = length(record);
  record.root.style.setProperty("--jqs-otp-length", String(count));
  if (record.input.maxLength !== count) record.input.maxLength = count;
  const next = normalize(record, record.input.value);
  if (record.input.value !== next) record.input.value = next;
  record.value = next;
  record.signature = configuration(record);
  const serialized = record.value;
  reflected.set(record.root, serialized);
  if (record.root.dataset.value !== serialized) record.root.dataset.value = serialized;
  const isComplete = complete(record);
  record.root.dataset.state = isComplete ? "complete" : "incomplete";
  const focused = record.root.ownerDocument.activeElement === record.input;
  const activeIndex = Math.min(record.value.length, count - 1);
  const masked = record.input.type === "password";
  for (const [index, slot] of ensureSlots(record).entries()) {
    const character = record.value[index];
    const content = character ? (masked ? "•" : character) : "";
    if (slot.textContent !== content) slot.textContent = content;
    slot.dataset.state = character ? "filled" : "empty";
    if (focused && index === activeIndex && !isComplete) slot.dataset.active = "";
    else delete slot.dataset.active;
  }
}

function notifyChange(
  record: InputOTPRecord,
  value: string,
  previousValue: string,
  revision: number,
): void {
  const isComplete = complete(record);
  const completed = isComplete && !record.completed;
  record.completed = isComplete;
  emit(record, "change", value, previousValue);
  if (!current(record, revision) || record.input.value !== value) return;
  if (completed) {
    if (record.status) record.status.textContent = "Code complete.";
    emit(record, "complete", value, previousValue);
  } else if (!isComplete && record.status?.textContent === "Code complete.") {
    record.status.textContent = "";
  }
}

function acceptNativeValue(record: InputOTPRecord): void {
  const previousValue = record.value;
  const value = normalize(record, record.input.value);
  if (value !== record.input.value) record.input.value = value;
  if (value === previousValue) {
    sync(record);
    return;
  }
  const revision = ++record.revision;
  const signature = configuration(record);
  const accepted = emit(record, "before-change", value, previousValue, true);
  if (
    !current(record, revision) ||
    record.input.value !== value ||
    configuration(record) !== signature ||
    normalize(record, value) !== value
  )
    return;
  if (!accepted) {
    record.input.value = previousValue;
    sync(record);
    return;
  }
  record.value = value;
  sync(record);
  notifyChange(record, value, previousValue, revision);
}

function requestValue(root: HTMLElement, rawValue: string): HTMLElement {
  const record = recordFor(root);
  const revision = ++record.revision;
  if (unavailable(record)) return root;
  const previousValue = record.value;
  const nativeValue = record.input.value;
  const signature = configuration(record);
  const value = normalize(record, rawValue);
  if (
    value === previousValue ||
    !emit(record, "before-change", value, previousValue, true) ||
    !current(record, revision) ||
    unavailable(record) ||
    record.input.value !== nativeValue ||
    configuration(record) !== signature ||
    normalize(record, rawValue) !== value
  ) {
    return root;
  }
  record.input.value = value;
  record.value = value;
  sync(record);
  record.input.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  if (!current(record, revision) || record.input.value !== value) return root;
  record.input.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
  );
  if (current(record, revision) && record.input.value === value)
    notifyChange(record, value, previousValue, revision);
  return root;
}

function enhanceInputOTP(root: HTMLElement): InputOTPRecord {
  const existing = records.get(root);
  root.id ||= `jqs-input-otp-${++inputOTPId}`;
  const control = directControl(root);
  const slots = directPart(root, "slots") ?? createSlots(root);
  const status = directPart(root, "status");
  control.id ||= `${root.id}-control`;
  slots.setAttribute("aria-hidden", "true");
  control.autocomplete ||= "one-time-code";
  if (!control.inputMode) control.inputMode = "numeric";
  if (status) {
    status.setAttribute("role", "status");
    status.setAttribute("aria-live", "polite");
  }
  const authored = root.dataset.value;
  const patched =
    authored !== undefined &&
    (authored !== reflected.get(root) || (existing && existing.input !== control));
  if (existing && current(existing)) {
    if (existing.resetRevision === existing.revision && !patched) return existing;
    if (patched) control.value = authored;
    const changed =
      existing.value !== normalize(existing, control.value) ||
      existing.signature !== configuration(existing);
    if (changed) existing.revision += 1;
    sync(existing);
    if (changed) existing.completed = complete(existing);
    return existing;
  }
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  const record: InputOTPRecord = {
    ...uiResources(root),
    input: control,
    form: control.form,
    slots,
    status,
    completed: false,
    signature: "",
    value: "",
  };
  if (patched) control.value = authored;
  const input = (): void => acceptNativeValue(record);
  const refresh = (): void => {
    const changed =
      record.value !== normalize(record, control.value) ||
      record.signature !== configuration(record);
    if (changed) record.revision += 1;
    sync(record);
    if (changed) record.completed = complete(record);
    if (!record.completed && status?.textContent === "Code complete.") status.textContent = "";
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const listen = listenUI.bind(undefined, record, () => current(record));
    listen(control, "input", input);
    listen(control, "focus", refresh);
    listen(control, "blur", refresh);
    listenUIReset(record, () => current(record), record.form, refresh);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    refresh();
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): InputOTPRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceInputOTP(root);
}

function resolveInputOTP(target: InputOTPTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? inputOTPRoot(root.querySelector(target)) : inputOTPRoot(target);
  if (resolved) return resolved;
  throw new Error(`Input OTP target did not match data-jqs="input-otp": ${String(target)}`);
}

function controlledInputOTP(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveInputOTP(target, context.root);
  if (typeof target === "string" && target.startsWith("#"))
    return resolveInputOTP(target, context.root);
  const closest = context.element?.closest('[data-jqs="input-otp"]');
  return resolveInputOTP(isHTMLElement(closest) ? closest : String(target));
}

function registerActions(api: StarInputOTPStatic, registerAction: ActionRegistrar): void {
  registerAction("ui.input-otp.set", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlledInputOTP(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error("ui.input-otp.set needs a code value.");
    }
    return api.set(target, String(value));
  });
  registerAction("ui.input-otp.clear", (context) =>
    api.clear(controlledInputOTP(context, context.args?.[0])),
  );
  registerAction("ui.input-otp.focus", (context) =>
    api.focus(controlledInputOTP(context, context.args?.[0])),
  );
}

function enhanceTree(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="input-otp"]')) {
    const input = inputOTPRoot(element);
    if (input) enhanceInputOTP(input);
  }
}

export function createInputOTPs(registerAction: ActionRegistrar): InputOTPCollection {
  const api: StarInputOTPStatic = {
    set: (target, value) => requestValue(resolveInputOTP(target), value),
    clear: (target) => requestValue(resolveInputOTP(target), ""),
    focus: (target) => {
      const root = resolveInputOTP(target);
      const record = recordFor(root);
      record.input.focus();
      return root;
    },
    value: (target) => {
      const root = resolveInputOTP(target);
      return recordFor(root).value;
    },
    complete: (target) => {
      const root = resolveInputOTP(target);
      return complete(recordFor(root));
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}

import { registerAction } from "../registry";
import type { InputOTPTarget, StarContext, StarInputOTPStatic } from "../types";

interface InputOTPRecord {
  cleanup: () => void;
  control: HTMLInputElement;
  lastComplete: boolean;
  root: HTMLElement;
  slots: HTMLElement;
  status: HTMLElement | undefined;
  suppressInput: boolean;
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
let inputOTPId = 0;

function inputOTPRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="input-otp"]')
    ? value
    : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      child instanceof HTMLInputElement && child.dataset.part === "control",
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
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
  );
}

function createSlots(root: HTMLElement): HTMLElement {
  const slots = document.createElement("div");
  slots.dataset.part = "slots";
  slots.dataset.generated = "";
  slots.setAttribute("aria-hidden", "true");
  root.append(slots);
  return slots;
}

function length(record: Pick<InputOTPRecord, "root" | "control">): number {
  const configured = Number(record.root.dataset.length);
  if (Number.isInteger(configured) && configured > 0) return configured;
  if (record.control.maxLength > 0) return record.control.maxLength;
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

function emit(
  record: InputOTPRecord,
  name: "before-change" | "change" | "complete",
  value: string,
  previousValue: string,
  cancelable = false,
): boolean {
  const detail: InputOTPEventDetail = {
    complete: complete(record, value),
    control: record.control,
    inputOTP: record.root,
    previousValue,
    value,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:input-otp:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function slotElement(index: number): HTMLElement {
  const slot = document.createElement("span");
  slot.dataset.part = "slot";
  slot.dataset.index = String(index);
  return slot;
}

function ensureSlots(record: InputOTPRecord): HTMLElement[] {
  const count = length(record);
  let slots = Array.from(record.slots.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "slot",
  );
  if (slots.length !== count) {
    slots = Array.from({ length: count }, (_, index) => slotElement(index));
    record.slots.replaceChildren(...slots);
  }
  return slots;
}

function sync(record: InputOTPRecord): void {
  const count = length(record);
  record.root.style.setProperty("--jqs-otp-length", String(count));
  if (record.control.maxLength !== count) record.control.maxLength = count;
  const next = normalize(record, record.control.value);
  if (record.control.value !== next) record.control.value = next;
  record.value = next;
  const serialized = record.value;
  if (record.root.dataset.value !== serialized) record.root.dataset.value = serialized;
  const isComplete = complete(record);
  record.root.dataset.state = isComplete ? "complete" : "incomplete";
  const focused = document.activeElement === record.control;
  const activeIndex = Math.min(record.value.length, count - 1);
  const masked = record.control.type === "password";
  for (const [index, slot] of ensureSlots(record).entries()) {
    const character = record.value[index];
    const content = character ? (masked ? "•" : character) : "";
    if (slot.textContent !== content) slot.textContent = content;
    slot.dataset.state = character ? "filled" : "empty";
    if (focused && index === activeIndex && !isComplete) slot.dataset.active = "";
    else delete slot.dataset.active;
  }
}

function announceComplete(record: InputOTPRecord): void {
  if (record.status) record.status.textContent = "Code complete.";
}

function acceptNativeValue(record: InputOTPRecord): void {
  if (record.suppressInput) return;
  const previousValue = record.value;
  const value = normalize(record, record.control.value);
  if (value !== record.control.value) record.control.value = value;
  if (value === previousValue) {
    sync(record);
    return;
  }
  if (!emit(record, "before-change", value, previousValue, true)) {
    record.control.value = previousValue;
    sync(record);
    return;
  }
  record.value = value;
  sync(record);
  emit(record, "change", value, previousValue);
  const isComplete = complete(record);
  if (isComplete && !record.lastComplete) {
    announceComplete(record);
    emit(record, "complete", value, previousValue);
  } else if (!isComplete && record.status?.textContent === "Code complete.") {
    record.status.textContent = "";
  }
  record.lastComplete = isComplete;
}

function requestValue(root: HTMLElement, rawValue: string): HTMLElement {
  const record = records.get(root) ?? enhanceInputOTP(root);
  if (record.control.disabled || record.control.readOnly) return root;
  const previousValue = record.value;
  const value = normalize(record, rawValue);
  if (value === previousValue || !emit(record, "before-change", value, previousValue, true)) {
    return root;
  }
  record.control.value = value;
  record.value = value;
  sync(record);
  record.suppressInput = true;
  record.control.dispatchEvent(new Event("input", { bubbles: true }));
  record.control.dispatchEvent(new Event("change", { bubbles: true }));
  record.suppressInput = false;
  emit(record, "change", value, previousValue);
  const isComplete = complete(record);
  if (isComplete && !record.lastComplete) {
    announceComplete(record);
    emit(record, "complete", value, previousValue);
  } else if (!isComplete && record.status?.textContent === "Code complete.") {
    record.status.textContent = "";
  }
  record.lastComplete = isComplete;
  return root;
}

function enhanceInputOTP(root: HTMLElement): InputOTPRecord {
  const existing = records.get(root);
  if (existing) {
    const patched = root.dataset.value;
    if (patched !== undefined && patched !== existing.control.value) {
      existing.control.value = normalize(existing, patched);
    }
    sync(existing);
    existing.lastComplete = complete(existing);
    return existing;
  }

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
  const record: InputOTPRecord = {
    cleanup: () => undefined,
    control,
    lastComplete: false,
    root,
    slots,
    status,
    suppressInput: false,
    value: "",
  };
  const input = (): void => acceptNativeValue(record);
  const focus = (): void => sync(record);
  const blur = (): void => sync(record);
  control.addEventListener("input", input);
  control.addEventListener("focus", focus);
  control.addEventListener("blur", blur);
  record.cleanup = () => {
    control.removeEventListener("input", input);
    control.removeEventListener("focus", focus);
    control.removeEventListener("blur", blur);
  };
  records.set(root, record);
  const initial = root.dataset.value ?? control.value;
  control.value = normalize(record, initial);
  sync(record);
  record.lastComplete = complete(record);
  return record;
}

function resolveInputOTP(target: InputOTPTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? inputOTPRoot(root.querySelector(target)) : inputOTPRoot(target);
  if (resolved) return resolved;
  throw new Error(`Input OTP target did not match data-jqs="input-otp": ${String(target)}`);
}

function controlledInputOTP(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="input-otp"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveInputOTP(target, context.root);
  const closest = context.element?.closest('[data-jqs="input-otp"]');
  return resolveInputOTP(closest instanceof HTMLElement ? closest : String(target));
}

function registerActions(api: StarInputOTPStatic): void {
  registerAction("ui.input-otp.set", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
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
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="input-otp"]')));
  for (const element of elements) {
    const input = inputOTPRoot(element);
    if (input) enhanceInputOTP(input);
  }
}

export function createInputOTPs(): InputOTPCollection {
  const api: StarInputOTPStatic = {
    set: (target, value) => requestValue(resolveInputOTP(target), value),
    clear: (target) => requestValue(resolveInputOTP(target), ""),
    focus: (target) => {
      const root = resolveInputOTP(target);
      const record = records.get(root) ?? enhanceInputOTP(root);
      record.control.focus();
      return root;
    },
    value: (target) => {
      const root = resolveInputOTP(target);
      return (records.get(root) ?? enhanceInputOTP(root)).value;
    },
    complete: (target) => {
      const root = resolveInputOTP(target);
      return complete(records.get(root) ?? enhanceInputOTP(root));
    },
  };
  registerActions(api);
  return { api, enhance: enhanceTree };
}

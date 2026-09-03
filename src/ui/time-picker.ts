import type { ActionRegistrar } from "../registry";
import type { StarContext, StarTimePickerStatic, TimePickerTarget } from "../types";

interface TimePickerRecord {
  cleanup: () => void;
  control: HTMLInputElement;
  decrement: HTMLButtonElement;
  increment: HTMLButtonElement;
  root: HTMLElement;
  value: string;
}

interface TimePickerCollection {
  api: StarTimePickerStatic;
  enhance(root: ParentNode): void;
}

interface TimePickerEventDetail {
  control: HTMLInputElement;
  previousValue: string;
  timePicker: HTMLElement;
  value: string;
}

const records = new WeakMap<HTMLElement, TimePickerRecord>();
let timePickerId = 0;

function timePickerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="time-picker"]')
    ? value
    : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      child instanceof HTMLInputElement && child.dataset.part === "control",
  );
  if (!control)
    throw new Error(`Time Picker #${root.id} needs a direct input[data-part="control"].`);
  if (control.type !== "time")
    throw new Error(`Time Picker #${root.id} control must use type="time".`);
  return control;
}

function directButton(root: HTMLElement, part: "decrement" | "increment"): HTMLButtonElement {
  const button = Array.from(root.children).find(
    (child): child is HTMLButtonElement =>
      child instanceof HTMLButtonElement && child.dataset.part === part,
  );
  if (!button)
    throw new Error(`Time Picker #${root.id} needs a direct button[data-part="${part}"].`);
  return button;
}

function unavailable(record: TimePickerRecord): boolean {
  return (
    record.control.disabled ||
    record.control.readOnly ||
    record.root.hasAttribute("disabled") ||
    record.root.dataset.disabled !== undefined
  );
}

function emit(
  record: TimePickerRecord,
  name: "before-change" | "change" | "invalid",
  value: string,
  previousValue: string,
  cancelable = false,
): boolean {
  const detail: TimePickerEventDetail = {
    control: record.control,
    previousValue,
    timePicker: record.root,
    value,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:time-picker:${name}`, { bubbles: true, cancelable, detail }),
  );
}

function normalized(control: HTMLInputElement, value: string): string | undefined {
  const probe = control.cloneNode() as HTMLInputElement;
  probe.value = value;
  return probe.value && probe.checkValidity()
    ? probe.value
    : value === "" && !probe.required
      ? ""
      : undefined;
}

function fallbackStep(control: HTMLInputElement, direction: 1 | -1, amount: number): string {
  const step = control.step === "any" ? 60 : Number(control.step || 60);
  const unit = Number.isFinite(step) && step > 0 ? step : 60;
  const source = control.value || control.min || "00:00";
  const [hours = 0, minutes = 0, seconds = 0] = source.split(":").map(Number);
  const current = hours * 3600 + minutes * 60 + seconds;
  const next = (((current + direction * unit * amount) % 86400) + 86400) % 86400;
  const hh = String(Math.floor(next / 3600)).padStart(2, "0");
  const mm = String(Math.floor((next % 3600) / 60)).padStart(2, "0");
  const ss = String(Math.floor(next % 60)).padStart(2, "0");
  return unit % 60 !== 0 || source.split(":").length === 3 ? `${hh}:${mm}:${ss}` : `${hh}:${mm}`;
}

function wouldStep(control: HTMLInputElement, direction: 1 | -1, amount: number): string {
  const previous = control.value;
  try {
    if (direction === 1) control.stepUp(amount);
    else control.stepDown(amount);
    const stepped = control.value;
    control.value = previous;
    return stepped;
  } catch {
    control.value = previous;
    return normalized(control, fallbackStep(control, direction, amount)) ?? previous;
  }
}

function canStep(record: TimePickerRecord, direction: 1 | -1): boolean {
  if (unavailable(record)) return false;
  return wouldStep(record.control, direction, 1) !== record.control.value;
}

function status(record: TimePickerRecord, message?: string): void {
  const element = Array.from(record.root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "status",
  );
  if (element)
    element.textContent =
      message ??
      (record.control.value ? `Selected time ${record.control.value}.` : "No time selected.");
}

function sync(record: TimePickerRecord): void {
  const disabled = unavailable(record);
  const decrementDisabled = disabled || !canStep(record, -1);
  const incrementDisabled = disabled || !canStep(record, 1);
  if (record.decrement.disabled !== decrementDisabled)
    record.decrement.disabled = decrementDisabled;
  if (record.increment.disabled !== incrementDisabled)
    record.increment.disabled = incrementDisabled;
  if (record.root.dataset.value !== record.control.value)
    record.root.dataset.value = record.control.value;
  record.root.dataset.state = disabled
    ? "disabled"
    : record.control.validity.valid
      ? "ready"
      : "invalid";
  for (const preset of record.root.querySelectorAll<HTMLButtonElement>('[data-part="preset"]')) {
    const selected = preset.dataset.value === record.control.value;
    preset.type = "button";
    preset.setAttribute("aria-pressed", String(selected));
    preset.dataset.state = selected ? "selected" : "unselected";
    if (preset.disabled !== disabled) preset.disabled = disabled;
  }
  status(record);
}

function commit(record: TimePickerRecord, value: string): HTMLElement {
  if (unavailable(record)) return record.root;
  const next = normalized(record.control, value);
  if (next === undefined) {
    record.root.dataset.state = "invalid";
    status(record, `Time ${value || "(empty)"} is outside the allowed range or step.`);
    emit(record, "invalid", value, record.control.value);
    return record.root;
  }
  const previousValue = record.control.value;
  if (next === previousValue || !emit(record, "before-change", next, previousValue, true))
    return record.root;
  record.control.value = next;
  record.value = next;
  sync(record);
  record.control.dispatchEvent(new Event("input", { bubbles: true }));
  record.control.dispatchEvent(new Event("change", { bubbles: true }));
  emit(record, "change", next, previousValue);
  return record.root;
}

function step(root: HTMLElement, direction: 1 | -1, amount = 1): HTMLElement {
  const record = records.get(root) ?? enhanceTimePicker(root);
  if (unavailable(record) || !Number.isFinite(amount) || amount <= 0) return root;
  return commit(record, wouldStep(record.control, direction, Math.max(1, Math.trunc(amount))));
}

function wire(record: TimePickerRecord): () => void {
  const decrement = (): void => void step(record.root, -1);
  const increment = (): void => void step(record.root, 1);
  const input = (): void => {
    const previousValue = record.value;
    record.value = record.control.value;
    sync(record);
    if (previousValue !== record.value) emit(record, "change", record.value, previousValue);
  };
  const click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const preset = event.target.closest<HTMLElement>('[data-part="preset"]');
    if (preset?.dataset.value !== undefined) commit(record, preset.dataset.value);
  };
  const reset = (): void => {
    window.setTimeout(input, 0);
  };
  record.decrement.addEventListener("click", decrement);
  record.increment.addEventListener("click", increment);
  record.control.addEventListener("input", input);
  record.root.addEventListener("click", click);
  record.control.form?.addEventListener("reset", reset);
  return () => {
    record.decrement.removeEventListener("click", decrement);
    record.increment.removeEventListener("click", increment);
    record.control.removeEventListener("input", input);
    record.root.removeEventListener("click", click);
    record.control.form?.removeEventListener("reset", reset);
  };
}

function enhanceTimePicker(root: HTMLElement): TimePickerRecord {
  root.id ||= `jqs-time-picker-${++timePickerId}`;
  const control = directControl(root);
  const decrement = directButton(root, "decrement");
  const increment = directButton(root, "increment");
  control.id ||= `${root.id}-control`;
  decrement.type = "button";
  increment.type = "button";
  decrement.setAttribute("aria-controls", control.id);
  increment.setAttribute("aria-controls", control.id);
  if (!decrement.hasAttribute("aria-label")) decrement.setAttribute("aria-label", "Earlier time");
  if (!increment.hasAttribute("aria-label")) increment.setAttribute("aria-label", "Later time");
  const statusElement = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "status",
  );
  if (statusElement) {
    statusElement.setAttribute("aria-live", "polite");
    statusElement.setAttribute("aria-atomic", "true");
  }
  const existing = records.get(root);
  if (
    existing?.control === control &&
    existing.decrement === decrement &&
    existing.increment === increment
  ) {
    if (root.dataset.value !== undefined && root.dataset.value !== existing.value) {
      const value = normalized(control, root.dataset.value);
      if (value !== undefined) control.value = value;
    }
    existing.value = control.value;
    sync(existing);
    return existing;
  }
  existing?.cleanup();
  if (root.dataset.value !== undefined) {
    const value = normalized(control, root.dataset.value);
    if (value !== undefined) control.value = value;
  }
  const record: TimePickerRecord = {
    cleanup: () => undefined,
    control,
    decrement,
    increment,
    root,
    value: control.value,
  };
  records.set(root, record);
  sync(record);
  record.cleanup = wire(record);
  return record;
}

function resolve(target: TimePickerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? timePickerRoot(root.querySelector(target))
      : timePickerRoot(target);
  if (resolved) return resolved;
  throw new Error(`Time Picker target did not match data-jqs="time-picker": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="time-picker"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="time-picker"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="time-picker"]')));
  for (const element of elements) {
    const component = timePickerRoot(element);
    if (component) enhanceTimePicker(component);
  }
}

export function createTimePickers(registerAction: ActionRegistrar): TimePickerCollection {
  const api: StarTimePickerStatic = {
    increment: (target, amount = 1) => step(resolve(target), 1, amount),
    decrement: (target, amount = 1) => step(resolve(target), -1, amount),
    set: (target, value) => {
      const root = resolve(target);
      return commit(records.get(root) ?? enhanceTimePicker(root), value);
    },
    value: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhanceTimePicker(root)).control.value;
    },
  };
  for (const [operation, direction] of [
    ["increment", 1],
    ["decrement", -1],
  ] as const) {
    registerAction(`ui.time-picker.${operation}`, (context) => {
      const first = context.args?.[0];
      const explicit = typeof first === "string" && first.startsWith("#");
      const target = controlled(context, explicit ? first : undefined);
      const amount = explicit ? context.args?.[1] : first;
      return direction === 1
        ? api.increment(target, typeof amount === "number" ? amount : 1)
        : api.decrement(target, typeof amount === "number" ? amount : 1);
    });
  }
  registerAction("ui.time-picker.set", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string") throw new Error("ui.time-picker.set needs an HH:mm time value.");
    return api.set(target, value);
  });
  return { api, enhance: enhanceAll };
}

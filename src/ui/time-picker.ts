import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { StarContext, StarTimePickerStatic, TimePickerTarget } from "../types";

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

interface TimePickerRecord extends UIResources {
  form: HTMLFormElement | null;
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
const reflected = new WeakMap<HTMLElement, string>();
let timePickerId = 0;

function timePickerRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="time-picker"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      isHTMLTag(child, "input") && child.dataset.part === "control",
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
      isHTMLTag(child, "button") && child.dataset.part === part,
  );
  if (!button)
    throw new Error(`Time Picker #${root.id} needs a direct button[data-part="${part}"].`);
  return button;
}

function unavailable(record: TimePickerRecord): boolean {
  return (
    record.control.matches(":disabled") ||
    record.control.readOnly ||
    record.root.hasAttribute("disabled") ||
    record.root.dataset.disabled !== undefined
  );
}

function current(record: TimePickerRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.matches('[data-jqs="time-picker"]') &&
    record.root.querySelector(':scope > input[data-part="control"]') === record.control &&
    record.root.querySelector(':scope > button[data-part="decrement"]') === record.decrement &&
    record.root.querySelector(':scope > button[data-part="increment"]') === record.increment &&
    record.control.type === "time" &&
    record.control.form === record.form
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
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:time-picker:${name}`,
      { bubbles: true, cancelable, detail },
    ),
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
  const probe = control.cloneNode() as HTMLInputElement;
  probe.value = control.value;
  try {
    if (direction === 1) probe.stepUp(amount);
    else probe.stepDown(amount);
    return probe.value;
  } catch {
    return normalized(control, fallbackStep(control, direction, amount)) ?? control.value;
  }
}

function canStep(record: TimePickerRecord, direction: 1 | -1): boolean {
  if (unavailable(record)) return false;
  return wouldStep(record.control, direction, 1) !== record.control.value;
}

function status(record: TimePickerRecord, message?: string): void {
  const element = Array.from(record.root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "status",
  );
  if (element)
    element.textContent =
      message ??
      (record.control.value ? `Selected time ${record.control.value}.` : "No time selected.");
}

function sync(record: TimePickerRecord): void {
  record.value = record.control.value;
  reflected.set(record.root, record.value);
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
  for (const preset of record.root.querySelectorAll('button[data-part="preset"]')) {
    if (!isHTMLTag(preset, "button") || preset.closest('[data-jqs="time-picker"]') !== record.root)
      continue;
    const selected = preset.dataset.value === record.control.value;
    preset.type = "button";
    preset.setAttribute("aria-pressed", String(selected));
    preset.dataset.state = selected ? "selected" : "unselected";
    if (preset.disabled !== disabled) preset.disabled = disabled;
  }
  status(record);
}

function constraints(control: HTMLInputElement): string {
  return [control.type, control.min, control.max, control.step, control.required].join("\0");
}

function commit(record: TimePickerRecord, value: string): HTMLElement {
  const revision = ++record.revision;
  if (!current(record, revision) || unavailable(record)) return record.root;
  const previousValue = record.control.value;
  const signature = constraints(record.control);
  const next = normalized(record.control, value);
  if (!current(record, revision) || record.control.value !== previousValue) return record.root;
  if (next === undefined) {
    record.root.dataset.state = "invalid";
    status(record, `Time ${value || "(empty)"} is outside the allowed range or step.`);
    emit(record, "invalid", value, record.control.value);
    return record.root;
  }
  if (next === previousValue) {
    sync(record);
    return record.root;
  }
  if (
    !emit(record, "before-change", next, previousValue, true) ||
    !current(record, revision) ||
    unavailable(record) ||
    record.control.value !== previousValue ||
    constraints(record.control) !== signature
  )
    return record.root;
  record.control.value = next;
  record.value = next;
  sync(record);
  record.control.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  if (!current(record, revision) || record.control.value !== next) return record.root;
  record.control.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
  );
  if (current(record, revision) && record.control.value === next)
    emit(record, "change", next, previousValue);
  return record.root;
}

function step(root: HTMLElement, direction: 1 | -1, amount = 1): HTMLElement {
  const record = recordFor(root);
  if (unavailable(record) || !Number.isFinite(amount) || amount <= 0) return root;
  return commit(record, wouldStep(record.control, direction, Math.max(1, Math.trunc(amount))));
}

function wire(record: TimePickerRecord): void {
  const decrement = (): void => void step(record.root, -1);
  const increment = (): void => void step(record.root, 1);
  const input = (): void => {
    const previousValue = record.value;
    if (previousValue !== record.control.value) record.revision += 1;
    sync(record);
    if (previousValue !== record.value) emit(record, "change", record.value, previousValue);
  };
  const click = (event: Event): void => {
    if (!isElementNode(event.target)) return;
    const preset = event.target.closest('button[data-part="preset"]');
    if (
      isHTMLTag(preset, "button") &&
      preset.closest('[data-jqs="time-picker"]') === record.root &&
      !preset.matches(":disabled") &&
      preset.dataset.value !== undefined
    )
      commit(record, preset.dataset.value);
  };
  const listen = listenUI.bind(undefined, record, () => current(record));
  listen(record.decrement, "click", decrement);
  listen(record.increment, "click", increment);
  listen(record.control, "input", input);
  listen(record.control, "change", input);
  listen(record.root, "click", click);
  listenUIReset(record, () => current(record), record.form, input);
}

function enhanceTimePicker(root: HTMLElement): TimePickerRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    if (existing.resetRevision === existing.revision && root.dataset.value === reflected.get(root))
      return existing;
    if (root.dataset.value !== undefined && root.dataset.value !== reflected.get(root)) {
      const value = normalized(existing.control, root.dataset.value);
      if (value !== undefined) existing.control.value = value;
    }
    if (existing.value !== existing.control.value) existing.revision += 1;
    sync(existing);
    return existing;
  }
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
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
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "status",
  );
  if (statusElement) {
    statusElement.setAttribute("aria-live", "polite");
    statusElement.setAttribute("aria-atomic", "true");
  }
  if (root.dataset.value !== undefined && root.dataset.value !== reflected.get(root)) {
    const value = normalized(control, root.dataset.value);
    if (value !== undefined) control.value = value;
  }
  const record: TimePickerRecord = {
    ...uiResources(root),
    form: control.form,
    control,
    decrement,
    increment,
    root,
    value: control.value,
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    sync(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): TimePickerRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceTimePicker(root);
}

function resolve(target: TimePickerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? timePickerRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : timePickerRoot(target);
  if (resolved) return resolved;
  throw new Error(`Time Picker target did not match data-jqs="time-picker": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target);
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="time-picker"]');
  return resolve(isHTMLElement(closest) ? closest : String(target), context.root);
}

function enhanceAll(root: ParentNode): void {
  const elements = uiElements(root, '[data-jqs="time-picker"]');
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
      return commit(recordFor(root), value);
    },
    value: (target) => {
      const root = resolve(target);
      return recordFor(root).control.value;
    },
  };
  for (const [operation, direction] of [
    ["increment", 1],
    ["decrement", -1],
  ] as const) {
    registerAction(`ui.time-picker.${operation}`, (context) => {
      const first = context.args?.[0];
      const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
      const target = controlled(context, explicit ? first : undefined);
      const amount = explicit ? context.args?.[1] : first;
      return direction === 1
        ? api.increment(target, typeof amount === "number" ? amount : 1)
        : api.decrement(target, typeof amount === "number" ? amount : 1);
    });
  }
  registerAction("ui.time-picker.set", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string") throw new Error("ui.time-picker.set needs an HH:mm time value.");
    return api.set(target, value);
  });
  return { api, enhance: enhanceAll };
}

import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { NumberFieldTarget, StarContext, StarNumberFieldStatic } from "../types";
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

interface NumberFieldRecord extends UIResources {
  form: HTMLFormElement | null;
  control: HTMLInputElement;
  decrement: HTMLButtonElement;
  increment: HTMLButtonElement;
  root: HTMLElement;
  value: string;
}

interface NumberFieldEventDetail {
  control: HTMLInputElement;
  numberField: HTMLElement;
  previousValue: number | undefined;
  value: number | undefined;
}

interface NumberFieldCollection {
  api: StarNumberFieldStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, NumberFieldRecord>();
const reflected = new WeakMap<HTMLElement, string>();
let numberFieldId = 0;

function numberFieldRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="number-field"]') ? value : undefined;
}

function directControl(root: HTMLElement): HTMLInputElement {
  const control = Array.from(root.children).find(
    (child): child is HTMLInputElement =>
      isHTMLTag(child, "input") && child.dataset.part === "control",
  );
  if (!control) {
    throw new Error(`Number Field #${root.id} needs a direct <input data-part="control">.`);
  }
  if (control.type !== "number") {
    throw new Error(`Number Field #${root.id} control must use type="number".`);
  }
  return control;
}

function directButton(root: HTMLElement, part: "decrement" | "increment"): HTMLButtonElement {
  const button = Array.from(root.children).find(
    (child): child is HTMLButtonElement =>
      isHTMLTag(child, "button") && child.dataset.part === part,
  );
  if (!button) {
    throw new Error(`Number Field #${root.id} needs a direct <button data-part="${part}">.`);
  }
  return button;
}

function numericValue(value: string): number | undefined {
  if (value === "") return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function current(record: NumberFieldRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.querySelector(':scope > input[data-part="control"]') === record.control &&
    record.root.querySelector(':scope > button[data-part="decrement"]') === record.decrement &&
    record.root.querySelector(':scope > button[data-part="increment"]') === record.increment &&
    record.control.form === record.form
  );
}

function isUnavailable(record: NumberFieldRecord): boolean {
  return (
    record.root.hasAttribute("disabled") ||
    record.root.getAttribute("aria-disabled") === "true" ||
    record.control.disabled ||
    record.control.readOnly
  );
}

function emit(
  record: NumberFieldRecord,
  name: "before-change" | "change",
  nextValue: string,
  previousValue: string,
  cancelable = false,
): boolean {
  const detail: NumberFieldEventDetail = {
    control: record.control,
    numberField: record.root,
    previousValue: numericValue(previousValue),
    value: numericValue(nextValue),
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:number-field:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
  );
}

function wouldStep(control: HTMLInputElement, direction: 1 | -1, amount: number): string {
  const previous = control.value;
  try {
    if (direction === 1) control.stepUp(amount);
    else control.stepDown(amount);
    return control.value;
  } finally {
    control.value = previous;
  }
}

function canStep(record: NumberFieldRecord, direction: 1 | -1): boolean {
  if (isUnavailable(record)) return false;
  try {
    return wouldStep(record.control, direction, 1) !== record.control.value;
  } catch {
    return false;
  }
}

function sync(record: NumberFieldRecord): void {
  record.value = record.control.value;
  reflected.set(record.root, record.value);
  const unavailable = isUnavailable(record);
  const decrementDisabled = unavailable || !canStep(record, -1);
  const incrementDisabled = unavailable || !canStep(record, 1);
  if (record.decrement.disabled !== decrementDisabled)
    record.decrement.disabled = decrementDisabled;
  if (record.increment.disabled !== incrementDisabled)
    record.increment.disabled = incrementDisabled;
  if (record.root.dataset.value !== record.control.value) {
    record.root.dataset.value = record.control.value;
  }
  record.root.dataset.state = unavailable ? "disabled" : "ready";
}

function constraints(control: HTMLInputElement): string {
  return [control.min, control.max, control.step, control.type].join("\0");
}

function commit(record: NumberFieldRecord, nextValue: string): HTMLElement {
  const revision = ++record.revision;
  const previousValue = record.control.value;
  const signature = constraints(record.control);
  if (
    nextValue === previousValue ||
    !emit(record, "before-change", nextValue, previousValue, true) ||
    !current(record, revision) ||
    isUnavailable(record) ||
    record.control.value !== previousValue ||
    constraints(record.control) !== signature
  ) {
    return record.root;
  }
  record.control.value = nextValue;
  record.value = nextValue;
  sync(record);
  record.control.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  if (!current(record, revision) || record.control.value !== nextValue) return record.root;
  record.control.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
  );
  if (!current(record, revision) || record.control.value !== nextValue) return record.root;
  emit(record, "change", nextValue, previousValue);
  return record.root;
}

function requestStep(root: HTMLElement, direction: 1 | -1, amount = 1): HTMLElement {
  const record = recordFor(root);
  if (isUnavailable(record) || !Number.isFinite(amount) || amount <= 0) return root;
  let nextValue: string;
  try {
    nextValue = wouldStep(record.control, direction, Math.max(1, Math.trunc(amount)));
  } catch {
    return root;
  }
  return commit(record, nextValue);
}

function requestSet(root: HTMLElement, value: number | string): HTMLElement {
  const record = recordFor(root);
  if (isUnavailable(record)) return root;
  const probe = record.control.cloneNode() as HTMLInputElement;
  probe.value = String(value);
  return commit(record, probe.value);
}

function enhanceNumberField(root: HTMLElement): NumberFieldRecord {
  const existing = records.get(root);
  const control = directControl(root);
  const decrement = directButton(root, "decrement");
  const increment = directButton(root, "increment");
  if (
    existing?.control === control &&
    current(existing) &&
    existing.decrement === decrement &&
    existing.increment === increment
  ) {
    if (existing.resetRevision === existing.revision && root.dataset.value === reflected.get(root))
      return existing;
    if (root.dataset.value !== undefined && root.dataset.value !== reflected.get(root)) {
      const probe = existing.control.cloneNode() as HTMLInputElement;
      probe.value = root.dataset.value;
      existing.control.value = probe.value;
    }
    if (existing.value !== control.value) existing.revision += 1;
    sync(existing);
    existing.value = existing.control.value;
    return existing;
  }

  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  root.id ||= `jqs-number-field-${++numberFieldId}`;
  control.id ||= `${root.id}-control`;
  decrement.type = "button";
  increment.type = "button";
  decrement.setAttribute("aria-controls", control.id);
  increment.setAttribute("aria-controls", control.id);
  if (!decrement.hasAttribute("aria-label")) decrement.setAttribute("aria-label", "Decrease value");
  if (!increment.hasAttribute("aria-label")) increment.setAttribute("aria-label", "Increase value");

  const record: NumberFieldRecord = {
    ...uiResources(root),
    form: control.form,
    control,
    decrement,
    increment,
    root,
    value: control.value,
  };
  const decrementClick = (): void => void requestStep(root, -1);
  const incrementClick = (): void => void requestStep(root, 1);
  const nativeInput = (): void => {
    const previousValue = record.value;
    if (previousValue !== control.value) record.revision += 1;
    sync(record);
    if (previousValue !== record.value) emit(record, "change", record.value, previousValue);
  };
  const nativeChange = (): void => sync(record);
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const listen = listenUI.bind(undefined, record, () => current(record));
    listen(decrement, "click", decrementClick);
    listen(increment, "click", incrementClick);
    listen(control, "input", nativeInput);
    listen(control, "change", nativeChange);
    listenUIReset(
      record,
      () => current(record),
      record.form,
      () => sync(record),
    );
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    sync(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): NumberFieldRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceNumberField(root);
}

function resolveNumberField(target: NumberFieldTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? numberFieldRoot(root.querySelector(target))
      : numberFieldRoot(target);
  if (resolved) return resolved;
  throw new Error(`Number Field target did not match data-jqs="number-field": ${String(target)}`);
}

function controlledNumberField(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveNumberField(target);
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveNumberField(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="number-field"]');
  return resolveNumberField(isHTMLElement(closest) ? closest : String(target));
}

function registerActions(api: StarNumberFieldStatic, registerAction: ActionRegistrar): void {
  for (const [name, direction] of [
    ["increment", 1],
    ["decrement", -1],
  ] as const) {
    registerAction(`ui.number-field.${name}`, (context) => {
      const first = context.args?.[0];
      const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
      const target = controlledNumberField(context, explicit ? first : undefined);
      const amount = explicit ? context.args?.[1] : first;
      return direction === 1
        ? api.increment(target, typeof amount === "number" ? amount : 1)
        : api.decrement(target, typeof amount === "number" ? amount : 1);
    });
  }
  registerAction("ui.number-field.set", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlledNumberField(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error("ui.number-field.set needs a number or numeric string.");
    }
    return api.set(target, value);
  });
}

function enhanceTree(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="number-field"]')) {
    const field = numberFieldRoot(element);
    if (field) enhanceNumberField(field);
  }
}

export function createNumberFields(registerAction: ActionRegistrar): NumberFieldCollection {
  const api: StarNumberFieldStatic = {
    increment: (target, amount = 1) => requestStep(resolveNumberField(target), 1, amount),
    decrement: (target, amount = 1) => requestStep(resolveNumberField(target), -1, amount),
    set: (target, value) => requestSet(resolveNumberField(target), value),
    value: (target) => {
      const root = resolveNumberField(target);
      const record = recordFor(root);
      return numericValue(record.control.value);
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}

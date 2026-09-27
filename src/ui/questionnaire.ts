import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import { syncGeneratedAttribute } from "./floating";
import {
  failUISetup,
  listenUI,
  listenUIReset,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswers,
  QuestionnaireTarget,
  StarContext,
  StarQuestionnaireStatic,
} from "../types";

type Control = HTMLInputElement | HTMLTextAreaElement;
interface QuestionnaireRecord extends UIResources {
  activeIndex: number;
  buttons: (HTMLElement | undefined)[];
  busy: number;
  committing: boolean;
  defaultValue: string;
  form: HTMLFormElement;
  items: HTMLFieldSetElement[];
  lastValue: string;
  parts: (Element | undefined)[];
  submitted: boolean;
}
interface QuestionnaireCollection {
  api: StarQuestionnaireStatic;
  enhance(root: ParentNode): void;
}
type QuestionnaireEventName =
  | "answer-change"
  | "before-change"
  | "before-skip"
  | "before-submit"
  | "change"
  | "invalid"
  | "reset"
  | "skip"
  | "submit";
interface QuestionnaireEventDetail {
  answers: QuestionnaireAnswers;
  index: number;
  item: HTMLFieldSetElement;
  previousIndex?: number;
  previousValue?: string;
  questionnaire: HTMLElement;
  value: string;
}
interface Operation {
  record: QuestionnaireRecord;
  revision: number;
  valid: () => boolean;
  expect: (target: Element, key: string, value: unknown) => void;
  write: (callback: () => void, expected?: () => void) => boolean;
}
const records = new WeakMap<HTMLElement, QuestionnaireRecord>();
const retainedState = new WeakMap<
  HTMLElement,
  Pick<QuestionnaireRecord, "defaultValue" | "submitted">
>();
const intents = new WeakMap<HTMLElement, number>();
const disabledButtons = new WeakSet<HTMLButtonElement>();
let questionnaireId = 0;
const buttonNames = ["previous", "next", "skip", "reset", "submit"] as const;
const boundary = '[data-jqs]:not(button[data-jqs="button"])';
function questionnaireRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="questionnaire"]') ? value : undefined;
}
function owned<T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter(
    (element) => element.closest(boundary) === root,
  );
}
function part<T extends HTMLElement = HTMLElement>(root: HTMLElement, name: string): T | undefined {
  return owned<T>(root, `[data-part="${name}"]`)[0];
}
function itemsFor(root: HTMLElement): HTMLFieldSetElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLFieldSetElement =>
      isHTMLTag(child, "fieldset") && child.dataset.part === "item",
  );
}
function itemControls(item: HTMLFieldSetElement, selector: string): Element[] {
  const root = item.closest('[data-jqs="questionnaire"]');
  return Array.from(item.querySelectorAll(selector)).filter(
    (control) =>
      control.closest('[data-part="item"]') === item && control.closest(boundary) === root,
  );
}
function fixedControls(item: HTMLFieldSetElement): HTMLInputElement[] {
  return itemControls(item, 'input[data-part="control"]').filter(
    (element): element is HTMLInputElement => isHTMLTag(element, "input"),
  );
}
function freeformControl(item: HTMLFieldSetElement): Control | undefined {
  return itemControls(item, 'input[data-part="freeform"],textarea[data-part="freeform"]').find(
    (element): element is Control => isHTMLTag(element, "input") || isHTMLTag(element, "textarea"),
  );
}
function directPart(item: HTMLFieldSetElement, name: string): HTMLElement | undefined {
  return Array.from(item.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === name,
  );
}
function skipControl(item: HTMLFieldSetElement): HTMLInputElement | undefined {
  const skip = directPart(item, "skip-value");
  return isHTMLTag(skip, "input") ? skip : undefined;
}
function errorPart(item: HTMLFieldSetElement): HTMLElement | undefined {
  return directPart(item, "error");
}
function descriptionPart(item: HTMLFieldSetElement): HTMLElement | undefined {
  return directPart(item, "description");
}
function partsFor(root: HTMLElement): (Element | undefined)[] {
  return [
    ...buttonNames.map((name) => part(root, name)),
    ...["progress", "progress-label", "status"].map((name) => part(root, name)),
    ...itemsFor(root).flatMap((item) => [
      item,
      ...fixedControls(item),
      freeformControl(item),
      errorPart(item),
      descriptionPart(item),
      Array.from(item.children).find((child) => isHTMLTag(child, "legend")),
    ]),
  ];
}
function current(record: QuestionnaireRecord, revision = record.revision): boolean {
  if (
    !uiCurrent(record, revision) ||
    records.get(record.root) !== record ||
    record.root.dataset.jqs !== "questionnaire" ||
    record.root.closest("form") !== record.form
  )
    return false;
  const parts = partsFor(record.root);
  return (
    parts.length === record.parts.length &&
    parts.every((value, index) => value === record.parts[index])
  );
}
function itemName(item: HTMLFieldSetElement): string {
  const name = item.dataset.name?.trim();
  if (!name) throw new Error(`Questionnaire item #${item.id} needs a non-empty data-name.`);
  return name;
}
function itemValue(item: HTMLFieldSetElement): string {
  const value = item.dataset.value?.trim();
  if (!value) throw new Error(`Questionnaire item #${item.id} needs a non-empty data-value.`);
  return value;
}
function flag(item: HTMLElement, name: string): boolean {
  return item.hasAttribute(`data-${name}`) && item.getAttribute(`data-${name}`) !== "false";
}
function multiple(item: HTMLFieldSetElement): boolean {
  return flag(item, "multiple");
}
function required(item: HTMLFieldSetElement): boolean {
  return flag(item, "required");
}
function skippable(item: HTMLFieldSetElement): boolean {
  return flag(item, "skippable");
}
function disabled(item: HTMLFieldSetElement): boolean {
  return flag(item, "disabled");
}
function enabledIndexes(record: QuestionnaireRecord): number[] {
  return record.items.map((_, index) => index).filter((index) => !disabled(record.items[index]!));
}
function currentItem(record: QuestionnaireRecord): HTMLFieldSetElement {
  return record.items[record.activeIndex]!;
}
function currentValue(record: QuestionnaireRecord): string {
  return itemValue(currentItem(record));
}
function selectedValues(item: HTMLFieldSetElement): string[] {
  const values = fixedControls(item)
    .filter((control) => control.checked)
    .map((control) => control.value);
  const freeform = freeformControl(item)?.value.trim();
  if (freeform) values.push(freeform);
  return values;
}
function skipped(item: HTMLFieldSetElement): boolean {
  return Boolean(skipControl(item));
}
function answerFor(item: HTMLFieldSetElement): QuestionnaireAnswer {
  const skip = skipControl(item);
  if (skip) return skip.value;
  const values = selectedValues(item);
  return multiple(item) ? values : values[0];
}
function answersFor(record: QuestionnaireRecord): QuestionnaireAnswers {
  return Object.fromEntries(record.items.map((item) => [itemName(item), answerFor(item)]));
}
function operation(record: QuestionnaireRecord, allowed: () => boolean = () => true): Operation {
  const revision = record.revision;
  const observations = new Map<Element, Map<string, { value: unknown; read: () => unknown }>>();
  const watch = (element: Element, key: string, read: () => unknown): void => {
    let entries = observations.get(element);
    if (!entries) {
      entries = new Map();
      observations.set(element, entries);
    }
    entries.set(key, { value: read(), read });
  };
  const attrs = (element: Element, names: string[]): void => {
    for (const name of names) watch(element, `@${name}`, () => element.getAttribute(name));
  };
  attrs(record.root, [
    "data-value",
    "data-state",
    "data-validate",
    "data-disabled",
    "aria-disabled",
    "inert",
  ]);
  for (const item of record.items) {
    attrs(item, [
      "data-name",
      "data-value",
      "data-required",
      "data-min",
      "data-max",
      "data-multiple",
      "data-skippable",
      "data-skip-value",
      "data-disabled",
      "data-error-message",
    ]);
    watch(item, "disabled", () => item.disabled);
    watch(item, "skip", () => skipControl(item));
    watch(item, "skipValue", () => skipControl(item)?.value);
    watch(item, "skipName", () => skipControl(item)?.name);
    for (const control of [...fixedControls(item), freeformControl(item)].filter(
      (value): value is Control => Boolean(value),
    )) {
      watch(control, "value", () => control.value);
      watch(control, "defaultValue", () => control.defaultValue);
      watch(control, "name", () => control.name);
      watch(control, "disabled", () => control.disabled);
      if (isHTMLTag(control, "input")) {
        watch(control, "checked", () => control.checked);
        watch(control, "defaultChecked", () => control.defaultChecked);
      }
      attrs(control, [
        "type",
        "required",
        "readonly",
        "pattern",
        "min",
        "max",
        "minlength",
        "maxlength",
        "data-disabled",
        "aria-disabled",
        "inert",
      ]);
    }
  }
  for (const button of record.buttons) {
    if (!button) continue;
    attrs(button, ["aria-disabled", "data-disabled", "inert"]);
    if (isHTMLTag(button, "button")) watch(button, "disabled", () => button.disabled);
  }
  const ancestors = new Set<Element>();
  for (const part of record.parts) {
    let element = part;
    while (element && element !== record.root && !ancestors.has(element)) {
      ancestors.add(element);
      attrs(element, ["disabled", "inert", "aria-disabled", "data-disabled"]);
      element = element.parentElement ?? undefined;
    }
  }
  const valid = (): boolean =>
    current(record, revision) &&
    allowed() &&
    [...observations.values()].every((entries) =>
      [...entries.values()].every((entry) => entry.read() === entry.value),
    );
  const expect = (target: Element, key: string, value: unknown): void => {
    const entry = observations.get(target)?.get(key);
    if (entry) entry.value = value;
  };
  return {
    record,
    revision,
    valid,
    expect,
    write(callback, expected) {
      if (!valid()) return false;
      expected?.();
      callback();
      return valid();
    },
  };
}
function setProperty<T extends Element, K extends keyof T>(
  op: Operation,
  target: T,
  key: K,
  value: T[K],
): boolean {
  if (!op.valid()) return false;
  if (target[key] === value) return true;
  return op.write(
    () => {
      target[key] = value;
    },
    () => {
      op.expect(target, String(key), value);
      if (key === "disabled") op.expect(target, "@disabled", value ? "" : null);
      if (
        key === "checked" &&
        value === true &&
        isHTMLTag(target, "input") &&
        target.type === "radio"
      ) {
        for (const item of op.record.items)
          for (const other of fixedControls(item))
            if (
              other !== target &&
              other.type === "radio" &&
              other.name === target.name &&
              other.form === target.form
            )
              op.expect(other, "checked", false);
      }
    },
  );
}
function attribute(op: Operation, target: Element, key: string, value: string | null): boolean {
  if (!op.valid()) return false;
  if (target.getAttribute(key) === value) return true;
  return op.write(
    () => {
      if (value === null) target.removeAttribute(key);
      else target.setAttribute(key, value);
    },
    () => {
      op.expect(target, `@${key}`, value);
      if (key === "name" && isHTMLTag(target, "input")) op.expect(target, "name", value ?? "");
      if (key === "name" && isHTMLTag(target, "textarea")) op.expect(target, "name", value ?? "");
    },
  );
}
function perform(op: Operation, callback: () => void): HTMLElement {
  const record = op.record;
  record.busy += 1;
  try {
    if (op.valid()) callback();
  } finally {
    record.busy -= 1;
  }
  return record.root;
}
function emit(
  op: Operation,
  name: QuestionnaireEventName,
  options: { cancelable?: boolean; previousIndex?: number } = {},
): boolean {
  if (!op.valid()) return false;
  const record = op.record;
  const detail: QuestionnaireEventDetail = {
    answers: answersFor(record),
    index: record.activeIndex,
    item: currentItem(record),
    questionnaire: record.root,
    value: currentValue(record),
    ...(options.previousIndex === undefined
      ? {}
      : {
          previousIndex: options.previousIndex,
          previousValue: itemValue(record.items[options.previousIndex]!),
        }),
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:questionnaire:${name}`,
      { bubbles: true, cancelable: options.cancelable ?? false, detail },
    ),
  );
}
function syncFreeformName(op: Operation, item: HTMLFieldSetElement): void {
  const control = freeformControl(item);
  if (!control) return;
  const name = control.value.trim() && !skipped(item) ? itemName(item) : "";
  if (name) setProperty(op, control, "name", name);
  else attribute(op, control, "name", null);
}
function clearSkip(op: Operation, item: HTMLFieldSetElement): void {
  const control = skipControl(item);
  if (control)
    op.write(
      () => control.remove(),
      () => {
        op.expect(item, "skip", undefined);
        op.expect(item, "skipValue", undefined);
        op.expect(item, "skipName", undefined);
      },
    );
}
function clearAnswer(op: Operation, item: HTMLFieldSetElement): void {
  for (const control of fixedControls(item))
    if (!setProperty(op, control, "checked", false)) return;
  const freeform = freeformControl(item);
  if (freeform && !setProperty(op, freeform, "value", "")) return;
  clearSkip(op, item);
  syncFreeformName(op, item);
}
function setSkipped(op: Operation, item: HTMLFieldSetElement): void {
  clearAnswer(op, item);
  if (!op.valid()) return;
  const input = op.record.document.createElement("input");
  input.type = "hidden";
  input.dataset.part = "skip-value";
  input.name = itemName(item);
  input.value = item.dataset.skipValue?.trim() || "__skipped";
  op.write(
    () => item.append(input),
    () => {
      op.expect(item, "skip", input);
      op.expect(item, "skipValue", input.value);
      op.expect(item, "skipName", input.name);
    },
  );
}
function selectionLimits(item: HTMLFieldSetElement): { max: number; min: number } {
  const authoredMin = Number(item.dataset.min),
    authoredMax = Number(item.dataset.max);
  const min =
    Number.isInteger(authoredMin) && authoredMin >= 0 ? authoredMin : required(item) ? 1 : 0;
  const max =
    Number.isInteger(authoredMax) && authoredMax >= min ? authoredMax : Number.POSITIVE_INFINITY;
  return { max, min };
}
function clearError(op: Operation, item: HTMLFieldSetElement): void {
  if (!attribute(op, item, "aria-invalid", null) || !attribute(op, item, "data-error", null))
    return;
  for (const control of [...fixedControls(item), freeformControl(item)])
    if (control && !attribute(op, control, "aria-invalid", null)) return;
  const error = errorPart(item);
  if (error) setProperty(op, error, "hidden", true);
}
function showError(op: Operation, item: HTMLFieldSetElement, message: string): void {
  if (!attribute(op, item, "data-error", "true") || !attribute(op, item, "aria-invalid", "true"))
    return;
  for (const control of [...fixedControls(item), freeformControl(item)])
    if (control && !attribute(op, control, "aria-invalid", "true")) return;
  const error = errorPart(item);
  if (
    error &&
    (!setProperty(op, error, "textContent", message) || !setProperty(op, error, "hidden", false))
  )
    return;
  const target =
    fixedControls(item).find((control) => !control.disabled) ?? freeformControl(item) ?? item;
  if (op.write(() => target.focus())) emit(op, "invalid");
}
function itemValidationMessage(record: QuestionnaireRecord, item: HTMLFieldSetElement): string {
  if (record.root.dataset.validate === "false" || disabled(item) || skipped(item)) return "";
  const values = selectedValues(item),
    { max, min } = selectionLimits(item);
  if (values.length < min) return item.dataset.errorMessage || "Choose an answer to continue.";
  if (values.length > max) return `Choose no more than ${max} answer${max === 1 ? "" : "s"}.`;
  const freeform = freeformControl(item);
  if (freeform?.value.trim() && !freeform.checkValidity()) return freeform.validationMessage;
  return "";
}
function validateItem(op: Operation, item: HTMLFieldSetElement): boolean {
  if (!op.valid()) return false;
  const message = itemValidationMessage(op.record, item);
  if (!op.valid()) return false;
  if (message) {
    showError(op, item, message);
    return false;
  }
  clearError(op, item);
  return op.valid();
}
function itemState(item: HTMLFieldSetElement): "answered" | "disabled" | "skipped" | "unanswered" {
  if (disabled(item)) return "disabled";
  if (skipped(item)) return "skipped";
  return selectedValues(item).length ? "answered" : "unanswered";
}
function syncDescription(op: Operation, item: HTMLFieldSetElement): void {
  const ids: string[] = [];
  const description = descriptionPart(item),
    error = errorPart(item);
  if (description) {
    if (!description.id && !setProperty(op, description, "id", `${item.id}-description`)) return;
    ids.push(description.id);
  }
  if (error) {
    if (!error.id && !setProperty(op, error, "id", `${item.id}-error`)) return;
    ids.push(error.id);
  }
  op.write(() => syncGeneratedAttribute(item, "aria-describedby", ids.join(" ")));
}
function setPreviousDisabled(op: Operation, button: HTMLButtonElement, value: boolean): void {
  if (!op.valid()) return;
  if (!value && disabledButtons.has(button)) {
    disabledButtons.delete(button);
    setProperty(op, button, "disabled", false);
  } else if (value && !button.disabled) {
    disabledButtons.add(button);
    setProperty(op, button, "disabled", true);
  }
}
function render(op: Operation): void {
  if (!op.valid()) return;
  const record = op.record;
  const enabled = enabledIndexes(record);
  if (!enabled.includes(record.activeIndex)) record.activeIndex = enabled[0] ?? 0;
  const activePosition = Math.max(0, enabled.indexOf(record.activeIndex)),
    value = currentValue(record);
  record.lastValue = value;
  if (
    !attribute(op, record.root, "data-value", value) ||
    !attribute(op, record.root, "data-state", record.submitted ? "submitted" : "active")
  )
    return;
  for (const [index, item] of record.items.entries()) {
    const active = index === record.activeIndex && !disabled(item),
      state = itemState(item);
    if (
      !setProperty(op, item, "hidden", !active) ||
      !attribute(op, item, "inert", active ? null : "") ||
      !attribute(op, item, "tabindex", "-1") ||
      !attribute(op, item, "data-state", active ? "active" : state) ||
      !attribute(op, item, "data-answered", String(state === "answered"))
    )
      return;
    for (const control of [...fixedControls(item), freeformControl(item), skipControl(item)]) {
      if (!control) continue;
      if (disabled(item) && !control.disabled) {
        if (
          !attribute(op, control, "data-questionnaire-disabled", "true") ||
          !setProperty(op, control, "disabled", true)
        )
          return;
      } else if (!disabled(item) && control.dataset.questionnaireDisabled === "true") {
        if (
          !setProperty(op, control, "disabled", false) ||
          !attribute(op, control, "data-questionnaire-disabled", null)
        )
          return;
      }
    }
    syncFreeformName(op, item);
    if (!op.valid()) return;
  }
  const progress = part(record.root, "progress");
  if (isHTMLTag(progress, "progress")) {
    const max = Math.max(1, enabled.length);
    if (
      !setProperty(op, progress, "max", max) ||
      !setProperty(op, progress, "value", Math.min(activePosition + 1, max))
    )
      return;
  }
  const label = part(record.root, "progress-label");
  if (
    label &&
    !setProperty(
      op,
      label,
      "textContent",
      `Question ${Math.min(activePosition + 1, enabled.length)} of ${enabled.length}`,
    )
  )
    return;
  const status = part(record.root, "status");
  if (
    status &&
    !setProperty(
      op,
      status,
      "textContent",
      `${itemState(currentItem(record)) === "skipped" ? "Skipped" : "Current"}: ${currentItem(record).querySelector("legend")?.textContent?.trim() || value}`,
    )
  )
    return;
  const previous = part(record.root, "previous");
  if (isHTMLTag(previous, "button")) setPreviousDisabled(op, previous, activePosition <= 0);
  const skip = part(record.root, "skip"),
    next = part(record.root, "next"),
    submit = part(record.root, "submit");
  if (skip && !setProperty(op, skip, "hidden", !skippable(currentItem(record)))) return;
  if (next && !setProperty(op, next, "hidden", activePosition >= enabled.length - 1)) return;
  if (submit) setProperty(op, submit, "hidden", activePosition < enabled.length - 1);
}
function focusItem(op: Operation): void {
  const item = currentItem(op.record);
  if (op.write(() => item.focus({ preventScroll: true })))
    op.write(() => item.scrollIntoView?.({ block: "nearest" }));
}
function indexFor(record: QuestionnaireRecord, value: string | number): number {
  if (typeof value === "number") {
    const enabled = enabledIndexes(record);
    return (
      enabled[Math.max(0, Math.min(enabled.length - 1, Math.floor(value)))] ?? record.activeIndex
    );
  }
  const index = record.items.findIndex((item) => itemValue(item) === value);
  if (index < 0) throw new Error(`Questionnaire #${record.root.id} has no item "${value}".`);
  return index;
}
function requestItem(op: Operation, index: number, validate = true): void {
  const record = op.record;
  if (!op.valid() || index === record.activeIndex || disabled(record.items[index]!)) return;
  const previousIndex = record.activeIndex;
  if (validate && index > previousIndex && !validateItem(op, currentItem(record))) return;
  record.activeIndex = index;
  const accepted = emit(op, "before-change", { cancelable: true, previousIndex });
  if (!op.valid() || !accepted) {
    if (current(record, op.revision)) record.activeIndex = previousIndex;
    return;
  }
  record.submitted = false;
  render(op);
  if (!op.valid()) return;
  focusItem(op);
  emit(op, "change", { previousIndex });
}
function adjacent(op: Operation, direction: -1 | 1): void {
  const enabled = enabledIndexes(op.record),
    index = enabled[enabled.indexOf(op.record.activeIndex) + direction];
  if (index !== undefined) requestItem(op, index, direction > 0);
}
function skipCurrent(op: Operation): void {
  const record = op.record,
    item = currentItem(record);
  if (!skippable(item) || !emit(op, "before-skip", { cancelable: true }) || !op.valid()) return;
  setSkipped(op, item);
  clearError(op, item);
  render(op);
  emit(op, "skip");
  if (!op.valid()) return;
  const enabled = enabledIndexes(record),
    next = enabled[enabled.indexOf(record.activeIndex) + 1];
  if (next !== undefined) requestItem(op, next, false);
}
function validateAll(op: Operation): boolean {
  const record = op.record;
  for (const item of record.items) {
    clearError(op, item);
    if (!op.valid()) return false;
  }
  for (const index of enabledIndexes(record)) {
    const item = record.items[index]!;
    const message = itemValidationMessage(record, item);
    if (!op.valid()) return false;
    if (!message) continue;
    record.activeIndex = index;
    render(op);
    if (!op.valid()) return false;
    focusItem(op);
    if (op.valid()) showError(op, item, message);
    return false;
  }
  return true;
}
function resetQuestionnaire(op: Operation): void {
  const record = op.record;
  for (const item of record.items) {
    clearSkip(op, item);
    clearError(op, item);
    for (const control of fixedControls(item))
      if (!setProperty(op, control, "checked", control.defaultChecked)) return;
    const freeform = freeformControl(item);
    if (freeform && !setProperty(op, freeform, "value", freeform.defaultValue)) return;
    syncFreeformName(op, item);
    if (!op.valid()) return;
  }
  record.activeIndex = record.items.findIndex((item) => itemValue(item) === record.defaultValue);
  record.submitted = false;
  render(op);
  if (op.valid()) focusItem(op);
  emit(op, "reset");
}
function nativeValue(control: Control): string | boolean {
  return isHTMLTag(control, "input") && ["checkbox", "radio"].includes(control.type)
    ? control.checked
    : control.value;
}
function setAnswer(op: Operation, name: string, answer: QuestionnaireAnswer): void {
  const record = op.record;
  const item = record.items.find((candidate) => itemName(candidate) === name);
  if (!item) throw new Error(`Questionnaire #${record.root.id} has no answer named "${name}".`);
  const controls = fixedControls(item),
    freeform = freeformControl(item);
  const values = answer === undefined ? [] : Array.isArray(answer) ? [...answer] : [answer];
  if (!op.valid()) return;
  if (!multiple(item) && values.length > 1)
    throw new Error(`Questionnaire item "${name}" accepts one answer.`);
  const known = new Set(controls.map((control) => control.value)),
    unknown = values.filter((value) => !known.has(value));
  if (unknown.length > 1 || (unknown.length && !freeform))
    throw new Error(
      `Questionnaire item "${name}" cannot represent answer ${JSON.stringify(answer)}.`,
    );
  const before = new Map<Control, string | boolean>(
    [...controls, ...(freeform ? [freeform] : [])].map((control) => [
      control,
      nativeValue(control),
    ]),
  );
  clearAnswer(op, item);
  if (!op.valid()) return;
  for (const value of values) {
    const control = controls.find((candidate) => candidate.value === value);
    if (control && !setProperty(op, control, "checked", true)) return;
  }
  if (freeform && unknown[0] && !setProperty(op, freeform, "value", unknown[0])) return;
  syncFreeformName(op, item);
  clearError(op, item);
  if (!op.valid()) return;
  const committing = record.committing;
  record.committing = true;
  try {
    for (const [control, value] of before) {
      if (nativeValue(control) === value) continue;
      for (const type of ["input", "change"]) {
        if (
          !op.write(() =>
            control.dispatchEvent(
              new (record.window as Window & typeof globalThis).Event(type, { bubbles: true }),
            ),
          )
        )
          return;
      }
    }
  } finally {
    record.committing = committing;
  }
  render(op);
  emit(op, "answer-change");
}
function constrained(root: HTMLElement, element?: Element | null): boolean {
  const selector =
    ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]';
  return Boolean(root.closest(selector) || element?.closest(selector));
}
function interactionAllowed(
  record: QuestionnaireRecord,
  element: Element | undefined,
  event?: Event,
): () => boolean {
  return () =>
    !constrained(record.root) &&
    !event?.defaultPrevented &&
    (!element || element.closest(boundary) === record.root || element === record.root);
}
function begin(root: HTMLElement, allowed: () => boolean = () => true): Operation {
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  const record = enhanceQuestionnaire(root);
  if (intents.get(root) === intent) record.revision += 1;
  return operation(record, () => intents.get(root) === intent && allowed());
}
function wire(record: QuestionnaireRecord): void {
  const listen = (
    target: EventTarget | undefined,
    name: string,
    callback: EventListener,
    capture?: boolean,
  ): void => listenUI(record, () => current(record), target, name, callback, capture);
  const input = (event: Event): void => {
    if (record.committing || event.defaultPrevented) return;
    const target = event.target;
    if (
      !(isHTMLTag(target, "input") || isHTMLTag(target, "textarea")) ||
      constrained(record.root, target)
    )
      return;
    if (
      (event.type === "input" && target.dataset.part === "control") ||
      (event.type === "change" && target.dataset.part === "freeform")
    )
      return;
    const item = target.closest('[data-part="item"]');
    if (
      !isHTMLTag(item, "fieldset") ||
      !record.items.includes(item) ||
      target.closest(boundary) !== record.root
    )
      return;
    const op = begin(record.root, interactionAllowed(record, target, event));
    perform(op, () => {
      clearSkip(op, item);
      if (target.dataset.part === "freeform") {
        if (!multiple(item) && target.value.trim())
          for (const control of fixedControls(item))
            if (!setProperty(op, control, "checked", false)) return;
        syncFreeformName(op, item);
      } else if (
        isHTMLTag(target, "input") &&
        target.dataset.part === "control" &&
        target.checked &&
        !multiple(item)
      ) {
        const freeform = freeformControl(item);
        if (freeform && !setProperty(op, freeform, "value", "")) return;
        syncFreeformName(op, item);
      }
      clearError(op, item);
      if (!op.valid()) return;
      record.submitted = false;
      render(op);
      emit(op, "answer-change");
    });
  };
  listen(record.root, "input", input);
  listen(record.root, "change", input);
  listen(record.root, "keydown", (value) => {
    const event = value as KeyboardEvent;
    if (
      event.defaultPrevented ||
      constrained(record.root, isHTMLElement(event.target) ? event.target : undefined) ||
      event.ctrlKey ||
      event.metaKey ||
      event.altKey ||
      event.key.length !== 1
    )
      return;
    const target = event.target;
    if (
      isHTMLTag(target, "textarea") ||
      (isHTMLTag(target, "input") && !["radio", "checkbox"].includes(target.type))
    )
      return;
    if (isHTMLElement(target) && target.closest(boundary) !== record.root) return;
    const choice = fixedControls(currentItem(record)).find(
      (control) =>
        (
          control.dataset.shortcut ??
          control.closest<HTMLElement>('[data-part="choice"]')?.dataset.shortcut
        )?.toLocaleLowerCase() === event.key.toLocaleLowerCase(),
    );
    if (!choice || constrained(record.root, choice)) return;
    event.preventDefault();
    choice.click();
  });
  for (const [index, callback] of [
    (op: Operation) => adjacent(op, -1),
    (op: Operation) => adjacent(op, 1),
    skipCurrent,
    resetQuestionnaire,
  ].entries()) {
    const button = record.buttons[index];
    listen(button, "click", (event) => {
      if (!button || event.defaultPrevented || constrained(record.root, button)) return;
      const op = begin(record.root, interactionAllowed(record, button, event));
      perform(op, () => callback(op));
    });
  }
  listen(
    record.form,
    "submit",
    (event) => {
      if (event.defaultPrevented || constrained(record.root)) return;
      const candidate = "submitter" in event ? event.submitter : null;
      if (isHTMLElement(candidate) && constrained(record.root, candidate)) return;
      const op = begin(record.root, () => !event.defaultPrevented && !constrained(record.root));
      const stop = (): void => {
        event.preventDefault();
        event.stopImmediatePropagation();
      };
      perform(op, () => {
        if (!validateAll(op) || !emit(op, "before-submit", { cancelable: true }) || !op.valid()) {
          stop();
          return;
        }
        record.submitted = true;
        render(op);
        emit(op, "submit");
        if (!op.valid()) stop();
      });
      if (!op.valid()) stop();
    },
    true,
  );
  listenUIReset(
    record,
    () => current(record),
    record.form,
    () => {
      const op = begin(record.root);
      perform(op, () => resetQuestionnaire(op));
    },
  );
}
function validateParts(root: HTMLElement, items: HTMLFieldSetElement[]): void {
  if (!items.length)
    throw new Error(`Questionnaire #${root.id} needs fieldset data-part="item" questions.`);
  const values = new Set<string>(),
    names = new Set<string>();
  for (const item of items) {
    const value = itemValue(item),
      name = itemName(item);
    if (values.has(value)) throw new Error(`Questionnaire #${root.id} item values must be unique.`);
    if (names.has(name)) throw new Error(`Questionnaire #${root.id} item names must be unique.`);
    values.add(value);
    names.add(name);
    const expectedType = multiple(item) ? "checkbox" : "radio";
    if (
      fixedControls(item).some(
        (control) => control.type !== expectedType || control.name !== name || !control.value,
      )
    )
      throw new Error(
        `Questionnaire item #${item.id} needs named ${expectedType} controls with non-empty values.`,
      );
  }
  if (items.every(disabled))
    throw new Error(`Questionnaire #${root.id} needs at least one enabled item.`);
}
function acquire(root: HTMLElement): QuestionnaireRecord {
  const existing = records.get(root);
  if (existing && current(existing)) return existing;
  existing?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  const form = root.closest("form");
  if (!isHTMLTag(form, "form"))
    throw new Error(`Questionnaire #${root.id} needs to be inside a form.`);
  const items = itemsFor(root);
  validateParts(root, items);
  const authored = root.dataset.value?.trim(),
    retained = retainedState.get(root);
  const record: QuestionnaireRecord = {
    ...uiResources(root),
    activeIndex: Math.max(
      0,
      items.findIndex((item) => itemValue(item) === (authored || itemValue(items[0]!))),
    ),
    buttons: buttonNames.map((name) => part(root, name)),
    busy: 0,
    committing: false,
    defaultValue: retained?.defaultValue ?? (authored || itemValue(items[0]!)),
    form,
    items,
    lastValue: root.dataset.value ?? "",
    parts: partsFor(root),
    submitted: retained?.submitted ?? false,
  };
  record.cleanup = ownUIRecord(records, root, record, () => {
    retainedState.set(root, { defaultValue: record.defaultValue, submitted: record.submitted });
    releaseUIResources(record);
  });
  try {
    const op = operation(record);
    perform(op, () => {
      if (!root.id) setProperty(op, root, "id", `jqs-questionnaire-${++questionnaireId}`);
      initialize(op);
      render(op);
    });
    wire(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function initialize(op: Operation): void {
  const record = op.record;
  for (const [index, item] of record.items.entries()) {
    if (!item.id && !setProperty(op, item, "id", `${record.root.id}-item-${index + 1}`)) return;
    syncDescription(op, item);
    const error = errorPart(item);
    if (error && !item.dataset.error && !setProperty(op, error, "hidden", true)) return;
  }
  for (const [index, button] of record.buttons.entries())
    if (
      isHTMLTag(button, "button") &&
      !setProperty(op, button, "type", index === 4 ? "submit" : "button")
    )
      return;
  const status = part(record.root, "status");
  if (status) {
    if (!attribute(op, status, "aria-live", "polite")) return;
    attribute(op, status, "aria-atomic", "true");
  }
}
function enhanceQuestionnaire(root: HTMLElement): QuestionnaireRecord {
  const record = acquire(root);
  if (!current(record) || record.busy) return record;
  validateParts(root, record.items);
  const authored = root.dataset.value?.trim();
  if (authored !== undefined && authored !== record.lastValue)
    record.activeIndex = Math.max(
      0,
      record.items.findIndex((item) => itemValue(item) === authored),
    );
  const op = operation(record);
  try {
    perform(op, () => {
      initialize(op);
      render(op);
    });
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function resolve(target: QuestionnaireTarget, root: ParentNode = document): HTMLElement {
  const value =
    typeof target === "string"
      ? questionnaireRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : questionnaireRoot(target);
  if (value) return value;
  throw new Error(`Questionnaire target did not match data-jqs="questionnaire": ${String(target)}`);
}
function controlled(context: StarContext, owner: Document, target?: unknown): HTMLElement {
  const root = isHTMLElement(target)
    ? resolve(target)
    : typeof target === "string"
      ? resolve(target, context.root)
      : resolve(
          questionnaireRoot(context.element?.closest('[data-jqs="questionnaire"]') ?? null) ??
            (isHTMLElement(context.root) ? context.root : String(target)),
        );
  if (root.ownerDocument !== owner || !uiActive(root))
    throw new Error("This UI target is unavailable in its owning Document.");
  return root;
}
function enhanceAll(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="questionnaire"]')) {
    const questionnaire = questionnaireRoot(element);
    if (questionnaire) enhanceQuestionnaire(questionnaire);
  }
}
function submitQuestionnaire(op: Operation): void {
  if (!op.valid()) return;
  const button = part(op.record.root, "submit");
  HTMLFormElement.prototype.requestSubmit.call(
    op.record.form,
    isHTMLTag(button, "button") ? button : undefined,
  );
}
export function createQuestionnaires(
  registerAction: ActionRegistrar,
  owner: Document,
): QuestionnaireCollection {
  const request = (
    target: QuestionnaireTarget,
    callback: (op: Operation) => void,
    allowed?: () => boolean,
  ): HTMLElement => {
    const op = begin(resolve(target), allowed);
    return perform(op, () => callback(op));
  };
  const api: StarQuestionnaireStatic = {
    next: (target) => request(target, (op) => adjacent(op, 1)),
    previous: (target) => request(target, (op) => adjacent(op, -1)),
    go: (target, value) => request(target, (op) => requestItem(op, indexFor(op.record, value))),
    skip: (target) => request(target, skipCurrent),
    reset: (target) => request(target, resetQuestionnaire),
    submit: (target) => request(target, submitQuestionnaire),
    value: (target) => currentValue(enhanceQuestionnaire(resolve(target))),
    answer: (target, name, answer) => request(target, (op) => setAnswer(op, name, answer)),
    answers: (target) => answersFor(enhanceQuestionnaire(resolve(target))),
  };
  const allowed =
    (context: StarContext, root: HTMLElement): (() => boolean) =>
    () =>
      !constrained(root) &&
      !(context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) &&
      !(
        context.event &&
        "isDefaultPrevented" in context.event &&
        context.event.isDefaultPrevented()
      );
  const initial = (context: StarContext, root: HTMLElement): boolean =>
    !constrained(root, context.element) && allowed(context, root)();
  for (const name of ["next", "previous", "skip", "reset", "submit"] as const)
    registerAction(`ui.questionnaire.${name}`, (context) => {
      const root = controlled(context, owner, context.args?.[0]);
      if (!initial(context, root)) return root;
      const callback =
        name === "next"
          ? (op: Operation) => adjacent(op, 1)
          : name === "previous"
            ? (op: Operation) => adjacent(op, -1)
            : name === "skip"
              ? skipCurrent
              : name === "reset"
                ? resetQuestionnaire
                : submitQuestionnaire;
      return request(root, callback, allowed(context, root));
    });
  registerAction("ui.questionnaire.go", (context) => {
    const first = context.args?.[0],
      explicit = isHTMLElement(first) || context.args?.[1] !== undefined;
    const root = controlled(context, owner, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && typeof value !== "number")
      throw new Error("ui.questionnaire.go needs an item value or index.");
    if (!initial(context, root)) return root;
    return request(
      root,
      (op) => requestItem(op, indexFor(op.record, value)),
      allowed(context, root),
    );
  });
  registerAction("ui.questionnaire.answer", (context) => {
    const first = context.args?.[0],
      explicit =
        isHTMLElement(first) ||
        (typeof first === "string" && (first.startsWith("#") || context.args?.length === 3));
    const root = controlled(context, owner, explicit ? first : undefined),
      name = explicit ? context.args?.[1] : first,
      answer = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof name !== "string") throw new Error("ui.questionnaire.answer needs an answer name.");
    if (!initial(context, root)) return root;
    return request(
      root,
      (op) => {
        if (
          answer !== undefined &&
          typeof answer !== "string" &&
          !(Array.isArray(answer) && answer.every((value) => typeof value === "string"))
        )
          throw new Error(
            "ui.questionnaire.answer needs a string, string array, or undefined value.",
          );
        if (op.valid()) setAnswer(op, name, answer);
      },
      allowed(context, root),
    );
  });
  return { api, enhance: enhanceAll };
}

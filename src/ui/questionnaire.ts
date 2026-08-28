import { registerAction } from "../registry";
import type {
  QuestionnaireAnswer,
  QuestionnaireAnswers,
  QuestionnaireTarget,
  StarContext,
  StarQuestionnaireStatic,
} from "../types";

interface QuestionnaireRecord {
  activeIndex: number;
  cleanup: () => void;
  committing: boolean;
  defaultValue: string;
  form: HTMLFormElement;
  items: HTMLFieldSetElement[];
  lastValue: string;
  root: HTMLElement;
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

const records = new WeakMap<HTMLElement, QuestionnaireRecord>();
let questionnaireId = 0;

function questionnaireRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="questionnaire"]')
    ? value
    : undefined;
}

function owned<T extends HTMLElement = HTMLElement>(root: HTMLElement, selector: string): T[] {
  return Array.from(root.querySelectorAll<T>(selector)).filter(
    (element) => element.closest('[data-jqs="questionnaire"]') === root,
  );
}

function part<T extends HTMLElement = HTMLElement>(root: HTMLElement, name: string): T | undefined {
  return owned<T>(root, `[data-part="${name}"]`)[0];
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

function fixedControls(item: HTMLFieldSetElement): HTMLInputElement[] {
  return Array.from(item.querySelectorAll<HTMLInputElement>('input[data-part="control"]')).filter(
    (control) => control.closest('[data-part="item"]') === item,
  );
}

function freeformControl(
  item: HTMLFieldSetElement,
): HTMLInputElement | HTMLTextAreaElement | undefined {
  return Array.from(
    item.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(
      'input[data-part="freeform"], textarea[data-part="freeform"]',
    ),
  ).find((control) => control.closest('[data-part="item"]') === item);
}

function skipControl(item: HTMLFieldSetElement): HTMLInputElement | undefined {
  return Array.from(item.children).find(
    (child): child is HTMLInputElement =>
      child instanceof HTMLInputElement && child.dataset.part === "skip-value",
  );
}

function errorPart(item: HTMLFieldSetElement): HTMLElement | undefined {
  return Array.from(item.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "error",
  );
}

function descriptionPart(item: HTMLFieldSetElement): HTMLElement | undefined {
  return Array.from(item.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.dataset.part === "description",
  );
}

function multiple(item: HTMLFieldSetElement): boolean {
  return item.hasAttribute("data-multiple") && item.dataset.multiple !== "false";
}

function required(item: HTMLFieldSetElement): boolean {
  return item.hasAttribute("data-required") && item.dataset.required !== "false";
}

function skippable(item: HTMLFieldSetElement): boolean {
  return item.hasAttribute("data-skippable") && item.dataset.skippable !== "false";
}

function disabled(item: HTMLFieldSetElement): boolean {
  return item.hasAttribute("data-disabled") && item.dataset.disabled !== "false";
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
  if (skipped(item)) return skipControl(item)!.value;
  const values = selectedValues(item);
  if (multiple(item)) return values;
  return values[0];
}

function answersFor(record: QuestionnaireRecord): QuestionnaireAnswers {
  return Object.fromEntries(record.items.map((item) => [itemName(item), answerFor(item)]));
}

function emit(
  record: QuestionnaireRecord,
  name: QuestionnaireEventName,
  options: { cancelable?: boolean; previousIndex?: number } = {},
): boolean {
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
    new CustomEvent(`jquery-star:questionnaire:${name}`, {
      bubbles: true,
      cancelable: options.cancelable ?? false,
      detail,
    }),
  );
}

function syncFreeformName(item: HTMLFieldSetElement): void {
  const control = freeformControl(item);
  if (!control) return;
  const name = control.value.trim() && !skipped(item) ? itemName(item) : "";
  if (name && control.name !== name) control.name = name;
  else if (!name && control.hasAttribute("name")) control.removeAttribute("name");
}

function clearSkip(item: HTMLFieldSetElement): void {
  skipControl(item)?.remove();
}

function clearAnswer(item: HTMLFieldSetElement): void {
  for (const control of fixedControls(item)) control.checked = false;
  const freeform = freeformControl(item);
  if (freeform) freeform.value = "";
  clearSkip(item);
  syncFreeformName(item);
}

function setSkipped(item: HTMLFieldSetElement): void {
  clearAnswer(item);
  const input = document.createElement("input");
  input.type = "hidden";
  input.dataset.part = "skip-value";
  input.name = itemName(item);
  input.value = item.dataset.skipValue?.trim() || "__skipped";
  item.append(input);
}

function selectionLimits(item: HTMLFieldSetElement): { max: number; min: number } {
  const authoredMin = Number(item.dataset.min);
  const authoredMax = Number(item.dataset.max);
  const min =
    Number.isInteger(authoredMin) && authoredMin >= 0 ? authoredMin : required(item) ? 1 : 0;
  const max =
    Number.isInteger(authoredMax) && authoredMax >= min ? authoredMax : Number.POSITIVE_INFINITY;
  return { max, min };
}

function clearError(item: HTMLFieldSetElement): void {
  item.removeAttribute("aria-invalid");
  delete item.dataset.error;
  for (const control of [...fixedControls(item), freeformControl(item)].filter(
    (value): value is HTMLInputElement | HTMLTextAreaElement => Boolean(value),
  )) {
    control.removeAttribute("aria-invalid");
  }
  const error = errorPart(item);
  if (error) error.hidden = true;
}

function showError(record: QuestionnaireRecord, item: HTMLFieldSetElement, message: string): void {
  item.dataset.error = "true";
  item.setAttribute("aria-invalid", "true");
  for (const control of [...fixedControls(item), freeformControl(item)].filter(
    (value): value is HTMLInputElement | HTMLTextAreaElement => Boolean(value),
  )) {
    control.setAttribute("aria-invalid", "true");
  }
  const error = errorPart(item);
  if (error) {
    error.textContent = message;
    error.hidden = false;
  }
  const focusTarget =
    fixedControls(item).find((control) => !control.disabled) ?? freeformControl(item) ?? item;
  focusTarget.focus();
  emit(record, "invalid");
}

function itemValidationMessage(record: QuestionnaireRecord, item: HTMLFieldSetElement): string {
  if (record.root.dataset.validate === "false" || disabled(item) || skipped(item)) {
    return "";
  }
  const values = selectedValues(item);
  const { max, min } = selectionLimits(item);
  if (values.length < min) {
    return item.dataset.errorMessage || "Choose an answer to continue.";
  }
  if (values.length > max) return `Choose no more than ${max} answer${max === 1 ? "" : "s"}.`;
  const freeform = freeformControl(item);
  if (freeform?.value.trim() && !freeform.checkValidity()) return freeform.validationMessage;
  return "";
}

function validateItem(record: QuestionnaireRecord, item: HTMLFieldSetElement): boolean {
  const message = itemValidationMessage(record, item);
  if (message) {
    showError(record, item, message);
    return false;
  }
  clearError(item);
  return true;
}

function itemState(item: HTMLFieldSetElement): "answered" | "disabled" | "skipped" | "unanswered" {
  if (disabled(item)) return "disabled";
  if (skipped(item)) return "skipped";
  return selectedValues(item).length ? "answered" : "unanswered";
}

function syncDescription(item: HTMLFieldSetElement): void {
  const ids: string[] = [];
  const description = descriptionPart(item);
  if (description) {
    description.id ||= `${item.id}-description`;
    ids.push(description.id);
  }
  const error = errorPart(item);
  if (error) {
    error.id ||= `${item.id}-error`;
    ids.push(error.id);
  }
  if (ids.length) item.setAttribute("aria-describedby", ids.join(" "));
}

function setButtonDisabled(button: HTMLButtonElement | undefined, value: boolean): void {
  if (button && button.disabled !== value) button.disabled = value;
}

function render(record: QuestionnaireRecord): void {
  const enabled = enabledIndexes(record);
  if (!enabled.includes(record.activeIndex)) record.activeIndex = enabled[0] ?? 0;
  const activePosition = Math.max(0, enabled.indexOf(record.activeIndex));
  const value = currentValue(record);
  record.lastValue = value;
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  const rootState = record.submitted ? "submitted" : "active";
  if (record.root.dataset.state !== rootState) record.root.dataset.state = rootState;

  for (const [index, item] of record.items.entries()) {
    const active = index === record.activeIndex && !disabled(item);
    const state = itemState(item);
    item.hidden = !active;
    item.inert = !active;
    item.tabIndex = -1;
    const renderedState = active ? "active" : state;
    if (item.dataset.state !== renderedState) item.dataset.state = renderedState;
    const answered = String(state === "answered");
    if (item.dataset.answered !== answered) item.dataset.answered = answered;
    for (const control of [...fixedControls(item), freeformControl(item), skipControl(item)].filter(
      (candidate): candidate is HTMLInputElement | HTMLTextAreaElement => Boolean(candidate),
    )) {
      if (disabled(item) && !control.disabled) {
        control.disabled = true;
        control.dataset.questionnaireDisabled = "true";
      } else if (!disabled(item) && control.dataset.questionnaireDisabled === "true") {
        control.disabled = false;
        delete control.dataset.questionnaireDisabled;
      }
    }
    syncFreeformName(item);
  }

  const progress = part<HTMLProgressElement>(record.root, "progress");
  if (progress) {
    const max = Math.max(1, enabled.length);
    const nextValue = Math.min(activePosition + 1, max);
    if (progress.max !== max) progress.max = max;
    if (progress.value !== nextValue) progress.value = nextValue;
  }
  const progressLabel = part(record.root, "progress-label");
  if (progressLabel) {
    const label = `Question ${Math.min(activePosition + 1, enabled.length)} of ${enabled.length}`;
    if (progressLabel.textContent !== label) progressLabel.textContent = label;
  }
  const status = part(record.root, "status");
  if (status) {
    const prefix = itemState(currentItem(record)) === "skipped" ? "Skipped" : "Current";
    const message = `${prefix}: ${currentItem(record).querySelector("legend")?.textContent?.trim() || value}`;
    if (status.textContent !== message) status.textContent = message;
  }

  const previous = part<HTMLButtonElement>(record.root, "previous");
  const next = part<HTMLButtonElement>(record.root, "next");
  const skip = part<HTMLButtonElement>(record.root, "skip");
  const submit = part<HTMLButtonElement>(record.root, "submit");
  setButtonDisabled(previous, activePosition <= 0);
  if (skip) skip.hidden = !skippable(currentItem(record));
  if (next) next.hidden = activePosition >= enabled.length - 1;
  if (submit) submit.hidden = activePosition < enabled.length - 1;
}

function focusItem(record: QuestionnaireRecord): void {
  const item = currentItem(record);
  item.focus({ preventScroll: true });
  item.scrollIntoView?.({ block: "nearest" });
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

function requestItem(record: QuestionnaireRecord, index: number, validate = true): HTMLElement {
  if (index === record.activeIndex || disabled(record.items[index]!)) return record.root;
  const previousIndex = record.activeIndex;
  if (validate && index > previousIndex && !validateItem(record, currentItem(record))) {
    return record.root;
  }
  record.activeIndex = index;
  record.submitted = false;
  if (!emit(record, "before-change", { cancelable: true, previousIndex })) {
    record.activeIndex = previousIndex;
    return record.root;
  }
  render(record);
  focusItem(record);
  emit(record, "change", { previousIndex });
  return record.root;
}

function adjacent(record: QuestionnaireRecord, direction: -1 | 1): HTMLElement {
  const enabled = enabledIndexes(record);
  const position = enabled.indexOf(record.activeIndex);
  const index = enabled[position + direction];
  return index === undefined ? record.root : requestItem(record, index, direction > 0);
}

function skipCurrent(record: QuestionnaireRecord): HTMLElement {
  const item = currentItem(record);
  if (!skippable(item) || !emit(record, "before-skip", { cancelable: true })) return record.root;
  setSkipped(item);
  clearError(item);
  render(record);
  emit(record, "skip");
  const enabled = enabledIndexes(record);
  const next = enabled[enabled.indexOf(record.activeIndex) + 1];
  return next === undefined ? record.root : requestItem(record, next, false);
}

function validateAll(record: QuestionnaireRecord): boolean {
  for (const item of record.items) clearError(item);
  const invalidIndex = enabledIndexes(record).find((index) =>
    Boolean(itemValidationMessage(record, record.items[index]!)),
  );
  if (invalidIndex === undefined) return true;
  if (record.activeIndex !== invalidIndex) {
    record.activeIndex = invalidIndex;
    render(record);
    focusItem(record);
  }
  validateItem(record, record.items[invalidIndex]!);
  return false;
}

function resetQuestionnaire(record: QuestionnaireRecord): HTMLElement {
  for (const item of record.items) {
    clearSkip(item);
    clearError(item);
    for (const control of fixedControls(item)) control.checked = control.defaultChecked;
    const freeform = freeformControl(item);
    if (freeform) freeform.value = freeform.defaultValue;
    syncFreeformName(item);
  }
  record.activeIndex = indexFor(record, record.defaultValue);
  record.submitted = false;
  render(record);
  focusItem(record);
  emit(record, "reset");
  return record.root;
}

function setAnswer(
  record: QuestionnaireRecord,
  name: string,
  answer: QuestionnaireAnswer,
): HTMLElement {
  const item = record.items.find((candidate) => itemName(candidate) === name);
  if (!item) throw new Error(`Questionnaire #${record.root.id} has no answer named "${name}".`);
  const controls = fixedControls(item);
  const freeform = freeformControl(item);
  const values = answer === undefined ? [] : Array.isArray(answer) ? [...answer] : [answer];
  if (!multiple(item) && values.length > 1) {
    throw new Error(`Questionnaire item "${name}" accepts one answer.`);
  }
  const known = new Set(controls.map((control) => control.value));
  const unknown = values.filter((value) => !known.has(value));
  if (unknown.length > 1 || (unknown.length && !freeform)) {
    throw new Error(
      `Questionnaire item "${name}" cannot represent answer ${JSON.stringify(answer)}.`,
    );
  }
  const before = new Map<HTMLInputElement | HTMLTextAreaElement, string | boolean>(
    [...controls, ...(freeform ? [freeform] : [])].map((control) => [
      control,
      control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)
        ? control.checked
        : control.value,
    ]),
  );

  clearAnswer(item);
  for (const value of values) {
    const control = controls.find((candidate) => candidate.value === value);
    if (control) control.checked = true;
  }
  if (freeform && unknown[0]) freeform.value = unknown[0];
  syncFreeformName(item);
  clearError(item);

  record.committing = true;
  for (const [control, value] of before) {
    const next =
      control instanceof HTMLInputElement && ["checkbox", "radio"].includes(control.type)
        ? control.checked
        : control.value;
    if (next === value) continue;
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  record.committing = false;
  render(record);
  emit(record, "answer-change");
  return record.root;
}

function choiceForShortcut(item: HTMLFieldSetElement, key: string): HTMLInputElement | undefined {
  return fixedControls(item).find((control) => {
    const owner = control.closest<HTMLElement>('[data-part="choice"]');
    return (control.dataset.shortcut ?? owner?.dataset.shortcut)?.toLocaleLowerCase() === key;
  });
}

function wire(record: QuestionnaireRecord): () => void {
  const input = (event: Event): void => {
    if (record.committing) return;
    const target = event.target;
    if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
    if (event.type === "input" && target.dataset.part === "control") return;
    if (event.type === "change" && target.dataset.part === "freeform") return;
    const item = target.closest<HTMLFieldSetElement>('[data-part="item"]');
    if (!item || !record.items.includes(item)) return;
    clearSkip(item);
    if (target.dataset.part === "freeform") {
      if (!multiple(item) && target.value.trim()) {
        for (const control of fixedControls(item)) control.checked = false;
      }
      syncFreeformName(item);
    } else if (
      target instanceof HTMLInputElement &&
      target.dataset.part === "control" &&
      target.checked &&
      !multiple(item)
    ) {
      const freeform = freeformControl(item);
      if (freeform) freeform.value = "";
      syncFreeformName(item);
    }
    clearError(item);
    record.submitted = false;
    render(record);
    emit(record, "answer-change");
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.ctrlKey || event.metaKey || event.altKey || event.key.length !== 1) return;
    if (
      event.target instanceof HTMLInputElement &&
      !["radio", "checkbox"].includes(event.target.type)
    ) {
      return;
    }
    if (event.target instanceof HTMLTextAreaElement) return;
    const choice = choiceForShortcut(currentItem(record), event.key.toLocaleLowerCase());
    if (!choice || choice.disabled) return;
    event.preventDefault();
    choice.click();
  };
  const onPrevious = (): void => {
    adjacent(record, -1);
  };
  const onNext = (): void => {
    adjacent(record, 1);
  };
  const onSkip = (): void => {
    skipCurrent(record);
  };
  const onReset = (): void => {
    resetQuestionnaire(record);
  };
  const onSubmit = (event: SubmitEvent): void => {
    if (!validateAll(record) || !emit(record, "before-submit", { cancelable: true })) {
      event.preventDefault();
      event.stopImmediatePropagation();
      return;
    }
    record.submitted = true;
    render(record);
    emit(record, "submit");
  };
  const onFormReset = (): void => {
    window.setTimeout(() => resetQuestionnaire(record), 0);
  };
  record.root.addEventListener("input", input);
  record.root.addEventListener("change", input);
  record.root.addEventListener("keydown", keydown);
  part(record.root, "previous")?.addEventListener("click", onPrevious);
  part(record.root, "next")?.addEventListener("click", onNext);
  part(record.root, "skip")?.addEventListener("click", onSkip);
  part(record.root, "reset")?.addEventListener("click", onReset);
  record.form.addEventListener("submit", onSubmit, true);
  record.form.addEventListener("reset", onFormReset);
  return () => {
    record.root.removeEventListener("input", input);
    record.root.removeEventListener("change", input);
    record.root.removeEventListener("keydown", keydown);
    part(record.root, "previous")?.removeEventListener("click", onPrevious);
    part(record.root, "next")?.removeEventListener("click", onNext);
    part(record.root, "skip")?.removeEventListener("click", onSkip);
    part(record.root, "reset")?.removeEventListener("click", onReset);
    record.form.removeEventListener("submit", onSubmit, true);
    record.form.removeEventListener("reset", onFormReset);
  };
}

function enhanceQuestionnaire(root: HTMLElement): QuestionnaireRecord {
  root.id ||= `jqs-questionnaire-${++questionnaireId}`;
  const form = root.closest("form");
  if (!(form instanceof HTMLFormElement)) {
    throw new Error(`Questionnaire #${root.id} needs to be inside a form.`);
  }
  const items = Array.from(root.children).filter(
    (child): child is HTMLFieldSetElement =>
      child instanceof HTMLFieldSetElement && child.dataset.part === "item",
  );
  if (!items.length) {
    throw new Error(`Questionnaire #${root.id} needs fieldset data-part="item" questions.`);
  }
  const values = new Set<string>();
  const names = new Set<string>();
  items.forEach((item, index) => {
    item.id ||= `${root.id}-item-${index + 1}`;
    const value = itemValue(item);
    const name = itemName(item);
    if (values.has(value)) throw new Error(`Questionnaire #${root.id} item values must be unique.`);
    if (names.has(name)) throw new Error(`Questionnaire #${root.id} item names must be unique.`);
    values.add(value);
    names.add(name);
    const controls = fixedControls(item);
    const expectedType = multiple(item) ? "checkbox" : "radio";
    if (
      controls.some(
        (control) => control.type !== expectedType || control.name !== name || !control.value,
      )
    ) {
      throw new Error(
        `Questionnaire item #${item.id} needs named ${expectedType} controls with non-empty values.`,
      );
    }
    syncDescription(item);
    const error = errorPart(item);
    if (error && !item.dataset.error) error.hidden = true;
  });
  if (items.every(disabled)) {
    throw new Error(`Questionnaire #${root.id} needs at least one enabled item.`);
  }
  const existing = records.get(root);
  existing?.cleanup();
  const authored = root.dataset.value?.trim();
  const patched = authored !== undefined && authored !== existing?.lastValue;
  const current = existing ? currentValue(existing) : undefined;
  const activeValue = patched ? authored : (current ?? authored ?? itemValue(items[0]!));
  const activeIndex = Math.max(
    0,
    items.findIndex((item) => itemValue(item) === activeValue),
  );
  const record: QuestionnaireRecord = {
    activeIndex,
    cleanup: () => undefined,
    committing: false,
    defaultValue: existing?.defaultValue ?? (authored || itemValue(items[0]!)),
    form,
    items,
    lastValue: root.dataset.value ?? "",
    root,
    submitted: existing?.submitted ?? false,
  };
  records.set(root, record);
  for (const name of ["previous", "next", "skip", "reset"] as const) {
    const button = part<HTMLButtonElement>(root, name);
    if (button) button.type = "button";
  }
  const submit = part<HTMLButtonElement>(root, "submit");
  if (submit) submit.type = "submit";
  const status = part(root, "status");
  if (status) {
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  }
  render(record);
  record.cleanup = wire(record);
  return record;
}

function resolve(target: QuestionnaireTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? questionnaireRoot(root.querySelector(target))
      : questionnaireRoot(target);
  if (resolved) return resolved;
  throw new Error(`Questionnaire target did not match data-jqs="questionnaire": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="questionnaire"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="questionnaire"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="questionnaire"]')));
  for (const element of elements) {
    const questionnaire = questionnaireRoot(element);
    if (questionnaire) enhanceQuestionnaire(questionnaire);
  }
}

export function createQuestionnaires(): QuestionnaireCollection {
  const api: StarQuestionnaireStatic = {
    next: (target) => {
      const root = resolve(target);
      return adjacent(records.get(root) ?? enhanceQuestionnaire(root), 1);
    },
    previous: (target) => {
      const root = resolve(target);
      return adjacent(records.get(root) ?? enhanceQuestionnaire(root), -1);
    },
    go: (target, value) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceQuestionnaire(root);
      return requestItem(record, indexFor(record, value), true);
    },
    skip: (target) => {
      const root = resolve(target);
      return skipCurrent(records.get(root) ?? enhanceQuestionnaire(root));
    },
    reset: (target) => {
      const root = resolve(target);
      return resetQuestionnaire(records.get(root) ?? enhanceQuestionnaire(root));
    },
    submit: (target) => {
      const root = resolve(target);
      const record = records.get(root) ?? enhanceQuestionnaire(root);
      record.form.requestSubmit(part<HTMLButtonElement>(root, "submit"));
      return root;
    },
    value: (target) => {
      const root = resolve(target);
      return currentValue(records.get(root) ?? enhanceQuestionnaire(root));
    },
    answer: (target, name, answer) => {
      const root = resolve(target);
      return setAnswer(records.get(root) ?? enhanceQuestionnaire(root), name, answer);
    },
    answers: (target) => {
      const root = resolve(target);
      return answersFor(records.get(root) ?? enhanceQuestionnaire(root));
    },
  };
  for (const operation of ["next", "previous", "skip", "reset", "submit"] as const) {
    registerAction(`ui.questionnaire.${operation}`, (context) =>
      api[operation](controlled(context, context.args?.[0])),
    );
  }
  registerAction("ui.questionnaire.go", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && typeof value !== "number") {
      throw new Error("ui.questionnaire.go needs an item value or index.");
    }
    return api.go(target, value);
  });
  registerAction("ui.questionnaire.answer", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const name = explicit ? context.args?.[1] : first;
    const answer = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof name !== "string") throw new Error("ui.questionnaire.answer needs an answer name.");
    if (
      answer !== undefined &&
      typeof answer !== "string" &&
      !(Array.isArray(answer) && answer.every((value) => typeof value === "string"))
    ) {
      throw new Error("ui.questionnaire.answer needs a string, string array, or undefined value.");
    }
    return api.answer(target, name, answer as QuestionnaireAnswer);
  });
  return { api, enhance: enhanceAll };
}

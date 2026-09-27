import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { RatingTarget, StarContext, StarRatingStatic } from "../types";
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

interface RatingRecord extends UIResources {
  form: HTMLFormElement | null;
  controls: HTMLInputElement[];
  lastValue: string;
  root: HTMLElement;
  value: string | undefined;
}

interface RatingCollection {
  api: StarRatingStatic;
  enhance(root: ParentNode): void;
}

interface RatingEventDetail {
  control: HTMLInputElement | undefined;
  previousValue: string | undefined;
  rating: HTMLElement;
  value: string | undefined;
}

const records = new WeakMap<HTMLElement, RatingRecord>();
const reflected = new WeakMap<HTMLElement, string>();
let ratingId = 0;

function ratingRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="rating"]') ? value : undefined;
}

function ratingControls(root: HTMLElement): HTMLInputElement[] {
  const controls = Array.from(
    root.querySelectorAll<HTMLInputElement>('input[type="radio"][data-part="control"]'),
  ).filter((control) => control.closest('[data-jqs="rating"]') === root);
  if (!controls.length) throw new Error(`Rating #${root.id} needs native radio controls.`);
  const name = controls[0]?.name.trim();
  if (!name || controls.some((control) => control.name !== name)) {
    throw new Error(`Rating #${root.id} controls need one shared, non-empty name.`);
  }
  const values = new Set<string>();
  for (const control of controls) {
    if (!control.value || values.has(control.value)) {
      throw new Error(`Rating #${root.id} controls need unique, non-empty values.`);
    }
    values.add(control.value);
  }
  return controls;
}

function selectedControl(record: RatingRecord): HTMLInputElement | undefined {
  return record.controls.find((control) => control.checked);
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}

function itemFor(root: HTMLElement, control: HTMLInputElement): HTMLElement | undefined {
  const item = control.closest<HTMLElement>('[data-part="item"]');
  return item?.closest('[data-jqs="rating"]') === root ? item : undefined;
}

function unavailable(record: RatingRecord): boolean {
  return (
    record.root.hasAttribute("disabled") || record.controls.every((control) => control.disabled)
  );
}

function current(record: RatingRecord, revision = record.revision): boolean {
  if (!uiCurrent(record, revision) || records.get(record.root) !== record) return false;
  const controls = Array.from(
    record.root.querySelectorAll('input[type="radio"][data-part="control"]'),
  ).filter((control) => control.closest('[data-jqs="rating"]') === record.root);
  return (
    controls.length === record.controls.length &&
    controls.every((control, index) => control === record.controls[index]) &&
    (record.controls[0]?.form ?? null) === record.form
  );
}

function emit(
  record: RatingRecord,
  name: "before-change" | "change",
  value: string | undefined,
  previousValue: string | undefined,
  cancelable = false,
): boolean {
  const detail: RatingEventDetail = {
    control: record.controls.find((control) => control.value === value),
    previousValue,
    rating: record.root,
    value,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:rating:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function status(record: RatingRecord): void {
  const output = directPart(record.root, "status");
  if (!output) return;
  const selected = selectedControl(record);
  output.textContent = selected
    ? selected.dataset.label || `${selected.value} of ${record.controls.length} selected.`
    : "No rating selected.";
}

function render(record: RatingRecord): void {
  record.value = selectedControl(record)?.value;
  record.lastValue = record.value ?? "";
  reflected.set(record.root, record.lastValue);
  if (record.root.dataset.value !== record.lastValue) record.root.dataset.value = record.lastValue;
  record.root.dataset.state = unavailable(record)
    ? "disabled"
    : record.value === undefined
      ? "empty"
      : "selected";
  const selectedIndex = record.controls.findIndex((control) => control.checked);
  record.controls.forEach((control, index) => {
    const item = itemFor(record.root, control);
    if (item)
      item.dataset.state = selectedIndex >= 0 && index <= selectedIndex ? "filled" : "empty";
  });
  const clear = directPart(record.root, "clear");
  if (isHTMLTag(clear, "button")) {
    clear.type = "button";
    const disabled = unavailable(record) || record.value === undefined;
    if (clear.disabled !== disabled) clear.disabled = disabled;
  }
  status(record);
}

function restore(record: RatingRecord, value: string | undefined): void {
  for (const control of record.controls) control.checked = control.value === value;
  render(record);
}

function commit(record: RatingRecord, value: string | undefined, nativeEvents = true): HTMLElement {
  const revision = ++record.revision;
  if (unavailable(record)) return record.root;
  const next = value === "" ? undefined : value;
  const control = next ? record.controls.find((candidate) => candidate.value === next) : undefined;
  if (next !== undefined && (!control || control.disabled)) {
    throw new Error(`Rating #${record.root.id} has no enabled control with value "${next}".`);
  }
  const previousValue = record.value;
  if (
    next === previousValue ||
    !emit(record, "before-change", next, previousValue, true) ||
    !current(record, revision) ||
    unavailable(record) ||
    control?.disabled ||
    (control && control.value !== next)
  )
    return record.root;
  restore(record, next);
  if (nativeEvents && control) {
    control.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
    );
    if (!current(record, revision) || selectedControl(record)?.value !== next) return record.root;
    control.dispatchEvent(
      new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
    );
    if (!current(record, revision) || selectedControl(record)?.value !== next) return record.root;
  }
  emit(record, "change", next, previousValue);
  return record.root;
}

function wire(record: RatingRecord): void {
  const change = (event: Event): void => {
    if (!isHTMLTag(event.target, "input") || !record.controls.includes(event.target)) return;
    const previousValue = record.value;
    const next = selectedControl(record)?.value;
    if (next === previousValue) return;
    const revision = ++record.revision;
    if (!emit(record, "before-change", next, previousValue, true)) {
      if (current(record, revision)) restore(record, previousValue);
      return;
    }
    if (!current(record, revision) || selectedControl(record)?.value !== next) return;
    render(record);
    emit(record, "change", next, previousValue);
  };
  const modelWrite = (): void => {
    const previousValue = record.value;
    if (previousValue !== selectedControl(record)?.value) record.revision += 1;
    render(record);
    if (record.value !== previousValue) emit(record, "change", record.value, previousValue);
  };
  const click = (event: Event): void => {
    if (!isElementNode(event.target)) return;
    const clear = event.target.closest<HTMLElement>('[data-part="clear"]');
    if (clear?.closest('[data-jqs="rating"]') === record.root) commit(record, undefined);
  };
  const listen = listenUI.bind(undefined, record, () => current(record));
  listen(record.root, "change", change);
  listen(record.root, "jquery-star:model-write", modelWrite);
  listen(record.root, "click", click);
  listenUIReset(record, () => current(record), record.form, modelWrite);
}

function enhanceRating(root: HTMLElement): RatingRecord {
  root.id ||= `jqs-rating-${++ratingId}`;
  const controls = ratingControls(root);
  const existing = records.get(root);
  const sameControls =
    existing?.controls.length === controls.length &&
    existing.controls.every((control, index) => control === controls[index]);
  if (existing && sameControls && current(existing)) {
    if (existing.resetRevision === existing.revision && root.dataset.value === reflected.get(root))
      return existing;
    if (root.dataset.value !== undefined && root.dataset.value !== existing.lastValue) {
      existing.revision += 1;
      const next = root.dataset.value;
      if (next === "" || controls.some((control) => control.value === next && !control.disabled))
        restore(existing, next || undefined);
    }
    if (existing.value !== selectedControl(existing)?.value) existing.revision += 1;
    render(existing);
    return existing;
  }
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  const record: RatingRecord = {
    ...uiResources(root),
    form: controls[0]?.form ?? null,
    controls,
    lastValue: "",
    root,
    value: controls.find((control) => control.checked)?.value,
  };
  if (root.dataset.value !== undefined && root.dataset.value !== reflected.get(root)) {
    const authored = root.dataset.value;
    if (
      authored === "" ||
      controls.some((control) => control.value === authored && !control.disabled)
    )
      for (const control of controls) control.checked = control.value === authored;
  }
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    render(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function recordFor(root: HTMLElement): RatingRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceRating(root);
}

function resolve(target: RatingTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? ratingRoot(root.querySelector(target)) : ratingRoot(target);
  if (resolved) return resolved;
  throw new Error(`Rating target did not match data-jqs="rating": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target);
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="rating"]');
  return resolve(isHTMLElement(closest) ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="rating"]')) {
    const rating = ratingRoot(element);
    if (rating) enhanceRating(rating);
  }
}

export function createRatings(registerAction: ActionRegistrar): RatingCollection {
  const api: StarRatingStatic = {
    set: (target, value) => {
      const root = resolve(target);
      return commit(recordFor(root), value);
    },
    clear: (target) => {
      const root = resolve(target);
      return commit(recordFor(root), undefined);
    },
    value: (target) => {
      const root = resolve(target);
      return recordFor(root).value;
    },
  };
  registerAction("ui.rating.set", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    return typeof value === "string" ? api.set(target, value) : target;
  });
  registerAction("ui.rating.clear", (context) => api.clear(controlled(context, context.args?.[0])));
  return { api, enhance: enhanceAll };
}

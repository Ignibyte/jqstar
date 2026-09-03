import type { ActionRegistrar } from "../registry";
import type { RatingTarget, StarContext, StarRatingStatic } from "../types";

interface RatingRecord {
  cleanup: () => void;
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
let ratingId = 0;

function ratingRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="rating"]') ? value : undefined;
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
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
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
    new CustomEvent(`jquery-star:rating:${name}`, { bubbles: true, cancelable, detail }),
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
  if (clear instanceof HTMLButtonElement) {
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
  if (unavailable(record)) return record.root;
  const next = value === "" ? undefined : value;
  const control = next ? record.controls.find((candidate) => candidate.value === next) : undefined;
  if (next !== undefined && (!control || control.disabled)) {
    throw new Error(`Rating #${record.root.id} has no enabled control with value "${next}".`);
  }
  const previousValue = record.value;
  if (next === previousValue || !emit(record, "before-change", next, previousValue, true))
    return record.root;
  restore(record, next);
  if (nativeEvents && control) {
    control.dispatchEvent(new Event("input", { bubbles: true }));
    control.dispatchEvent(new Event("change", { bubbles: true }));
  }
  emit(record, "change", next, previousValue);
  return record.root;
}

function wire(record: RatingRecord): () => void {
  const change = (event: Event): void => {
    if (!(event.target instanceof HTMLInputElement) || !record.controls.includes(event.target))
      return;
    const previousValue = record.value;
    const next = selectedControl(record)?.value;
    if (next === previousValue) return;
    if (!emit(record, "before-change", next, previousValue, true)) {
      restore(record, previousValue);
      return;
    }
    render(record);
    emit(record, "change", next, previousValue);
  };
  const modelWrite = (): void => {
    const previousValue = record.value;
    render(record);
    if (record.value !== previousValue) emit(record, "change", record.value, previousValue);
  };
  const click = (event: MouseEvent): void => {
    if (!(event.target instanceof Element)) return;
    const clear = event.target.closest<HTMLElement>('[data-part="clear"]');
    if (clear?.closest('[data-jqs="rating"]') === record.root) commit(record, undefined);
  };
  const reset = (): void => {
    window.setTimeout(modelWrite, 0);
  };
  record.root.addEventListener("change", change);
  record.root.addEventListener("jquery-star:model-write", modelWrite);
  record.root.addEventListener("click", click);
  record.controls[0]?.form?.addEventListener("reset", reset);
  return () => {
    record.root.removeEventListener("change", change);
    record.root.removeEventListener("jquery-star:model-write", modelWrite);
    record.root.removeEventListener("click", click);
    record.controls[0]?.form?.removeEventListener("reset", reset);
  };
}

function enhanceRating(root: HTMLElement): RatingRecord {
  root.id ||= `jqs-rating-${++ratingId}`;
  const controls = ratingControls(root);
  const existing = records.get(root);
  const sameControls =
    existing?.controls.length === controls.length &&
    existing.controls.every((control, index) => control === controls[index]);
  if (existing && sameControls) {
    if (root.dataset.value !== undefined && root.dataset.value !== existing.lastValue) {
      const next = root.dataset.value;
      if (next === "" || controls.some((control) => control.value === next && !control.disabled))
        restore(existing, next || undefined);
    }
    render(existing);
    return existing;
  }
  existing?.cleanup();
  const record: RatingRecord = {
    cleanup: () => undefined,
    controls,
    lastValue: "",
    root,
    value: controls.find((control) => control.checked)?.value,
  };
  records.set(root, record);
  if (root.dataset.value !== undefined) {
    const authored = root.dataset.value;
    if (
      authored === "" ||
      controls.some((control) => control.value === authored && !control.disabled)
    )
      for (const control of controls) control.checked = control.value === authored;
  }
  render(record);
  record.cleanup = wire(record);
  return record;
}

function resolve(target: RatingTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? ratingRoot(root.querySelector(target)) : ratingRoot(target);
  if (resolved) return resolved;
  throw new Error(`Rating target did not match data-jqs="rating": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="rating"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="rating"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceAll(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="rating"]')));
  for (const element of elements) {
    const rating = ratingRoot(element);
    if (rating) enhanceRating(rating);
  }
}

export function createRatings(registerAction: ActionRegistrar): RatingCollection {
  const api: StarRatingStatic = {
    set: (target, value) => {
      const root = resolve(target);
      return commit(records.get(root) ?? enhanceRating(root), value);
    },
    clear: (target) => {
      const root = resolve(target);
      return commit(records.get(root) ?? enhanceRating(root), undefined);
    },
    value: (target) => {
      const root = resolve(target);
      return (records.get(root) ?? enhanceRating(root)).value;
    },
  };
  registerAction("ui.rating.set", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlled(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    return typeof value === "string" ? api.set(target, value) : target;
  });
  registerAction("ui.rating.clear", (context) => api.clear(controlled(context, context.args?.[0])));
  return { api, enhance: enhanceAll };
}

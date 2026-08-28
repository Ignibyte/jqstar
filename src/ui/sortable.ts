import { registerAction } from "../registry";
import type { SortableTarget, StarContext, StarSortableStatic } from "../types";

interface SortableRecord {
  cleanup: () => void;
  grabbed: HTMLElement | undefined;
  items: HTMLElement[];
  lastValue: string;
  list: HTMLElement;
  originalOrder: string[] | undefined;
  preview: boolean;
  root: HTMLElement;
}

interface SortableCollection {
  api: StarSortableStatic;
  enhance(root: ParentNode): void;
}

interface SortableEventDetail {
  item?: HTMLElement;
  previousValue: string[];
  sortable: HTMLElement;
  value: string[];
}

const records = new WeakMap<HTMLElement, SortableRecord>();
let sortableId = 0;

function sortableRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="sortable"]') ? value : undefined;
}

function scopedParts(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)).filter(
    (element) => element.parentElement?.closest("[data-jqs]") === root,
  );
}

function listFor(root: HTMLElement): HTMLElement {
  const list = scopedParts(root, "list")[0];
  if (!list) throw new Error(`Sortable #${root.id} needs data-part="list".`);
  return list;
}

function itemsFor(list: HTMLElement): HTMLElement[] {
  return Array.from(list.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "item",
  );
}

function itemValue(item: HTMLElement): string {
  const value = item.dataset.value?.trim();
  if (!value) throw new Error(`Sortable item #${item.id} needs a non-empty data-value.`);
  return value;
}

function order(record: SortableRecord): string[] {
  return itemsFor(record.list).map(itemValue);
}

function disabled(record: SortableRecord): boolean {
  return record.root.hasAttribute("disabled") || record.root.dataset.disabled !== undefined;
}

function itemDisabled(item: HTMLElement): boolean {
  return item.dataset.disabled !== undefined || item.getAttribute("aria-disabled") === "true";
}

function statusFor(record: SortableRecord): HTMLElement | undefined {
  return scopedParts(record.root, "status")[0];
}

function labelFor(item: HTMLElement): string {
  return (
    item.dataset.label?.trim() ||
    item.querySelector<HTMLElement>('[data-part="label"]')?.textContent?.trim() ||
    itemValue(item)
  );
}

function announce(record: SortableRecord, message: string): void {
  const status = statusFor(record);
  if (status) status.textContent = message;
}

function emit(
  record: SortableRecord,
  name: "before-change" | "change" | "grab" | "drop" | "cancel",
  value: string[],
  previousValue: string[],
  item?: HTMLElement,
  cancelable = false,
): boolean {
  const detail: SortableEventDetail = {
    ...(item ? { item } : {}),
    previousValue,
    sortable: record.root,
    value,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:sortable:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function replaceHiddenInputs(record: SortableRecord, values: string[]): void {
  const name = record.root.dataset.name?.trim();
  const current = Array.from(
    record.root.querySelectorAll<HTMLInputElement>('input[data-jqs-generated="sortable"]'),
  );
  if (
    name &&
    current.length === values.length &&
    current.every((input, index) => input.name === name && input.value === values[index])
  ) {
    return;
  }
  for (const input of current) input.remove();
  if (!name) return;
  for (const value of values) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = name;
    input.value = value;
    input.dataset.jqsGenerated = "sortable";
    record.root.append(input);
  }
}

function render(record: SortableRecord, values = order(record)): void {
  record.items = itemsFor(record.list);
  record.lastValue = JSON.stringify(values);
  if (record.root.dataset.value !== record.lastValue) record.root.dataset.value = record.lastValue;
  record.root.dataset.state = record.preview ? "sorting" : "idle";
  record.root.setAttribute("aria-disabled", String(disabled(record)));
  replaceHiddenInputs(record, values);

  for (const [index, item] of record.items.entries()) {
    item.dataset.index = String(index);
    item.dataset.state = item === record.grabbed ? "grabbed" : "idle";
    const unavailable = disabled(record) || itemDisabled(item);
    const handle = item.querySelector<HTMLElement>('[data-part="handle"]');
    if (handle) {
      handle.setAttribute("draggable", String(!unavailable));
      handle.setAttribute("aria-disabled", String(unavailable));
      if (!handle.hasAttribute("aria-label"))
        handle.setAttribute("aria-label", `Reorder ${labelFor(item)}`);
      if (handle instanceof HTMLButtonElement) handle.type = "button";
    }
    const up = item.querySelector<HTMLButtonElement>('[data-part="up"]');
    const down = item.querySelector<HTMLButtonElement>('[data-part="down"]');
    if (up) {
      up.type = "button";
      const isDisabled = unavailable || index === 0;
      if (up.disabled !== isDisabled) up.disabled = isDisabled;
    }
    if (down) {
      down.type = "button";
      const isDisabled = unavailable || index === record.items.length - 1;
      if (down.disabled !== isDisabled) down.disabled = isDisabled;
    }
  }
}

function restore(record: SortableRecord, values: string[]): void {
  if (order(record).join("\u0000") === values.join("\u0000")) return;
  const byValue = new Map(itemsFor(record.list).map((item) => [itemValue(item), item]));
  for (const value of values) {
    const item = byValue.get(value);
    if (item) record.list.append(item);
  }
}

function commit(
  record: SortableRecord,
  values: string[],
  previousValue: string[],
  item?: HTMLElement,
): HTMLElement {
  if (values.join("\u0000") === previousValue.join("\u0000")) {
    restore(record, previousValue);
    render(record, previousValue);
    return record.root;
  }
  if (!emit(record, "before-change", values, previousValue, item, true)) {
    restore(record, previousValue);
    render(record, previousValue);
    return record.root;
  }
  restore(record, values);
  render(record, values);
  emit(record, "change", values, previousValue, item);
  record.root.dispatchEvent(new Event("input", { bubbles: true }));
  record.root.dispatchEvent(new Event("change", { bubbles: true }));
  return record.root;
}

function moveItem(record: SortableRecord, value: string, index: number): HTMLElement {
  if (disabled(record)) return record.root;
  const previousValue = order(record);
  const item = record.items.find((candidate) => itemValue(candidate) === value);
  if (!item || itemDisabled(item)) return record.root;
  const without = previousValue.filter((candidate) => candidate !== value);
  const target = Math.max(0, Math.min(without.length, index));
  without.splice(target, 0, value);
  return commit(record, without, previousValue, item);
}

function startPreview(record: SortableRecord, item: HTMLElement): void {
  if (record.preview || disabled(record) || itemDisabled(item)) return;
  record.preview = true;
  record.grabbed = item;
  record.originalOrder = order(record);
  render(record, record.originalOrder);
  emit(record, "grab", record.originalOrder, record.originalOrder, item);
  announce(
    record,
    `${labelFor(item)} grabbed. Use arrow keys to move, Space to drop, or Escape to cancel.`,
  );
}

function previewAt(record: SortableRecord, index: number): void {
  const item = record.grabbed;
  if (!record.preview || !item) return;
  const items = itemsFor(record.list).filter((candidate) => candidate !== item);
  const target = Math.max(0, Math.min(items.length, index));
  const before = items[target];
  if (before) record.list.insertBefore(item, before);
  else record.list.append(item);
  record.items = itemsFor(record.list);
  announce(
    record,
    `${labelFor(item)} is now position ${record.items.indexOf(item) + 1} of ${record.items.length}.`,
  );
}

function finishPreview(record: SortableRecord, canceled = false): void {
  if (!record.preview || !record.originalOrder) return;
  const item = record.grabbed;
  const previousValue = record.originalOrder;
  const nextValue = order(record);
  record.preview = false;
  record.grabbed = undefined;
  record.originalOrder = undefined;
  if (canceled) {
    restore(record, previousValue);
    render(record, previousValue);
    emit(record, "cancel", previousValue, previousValue, item);
    announce(record, "Reordering canceled.");
    return;
  }
  commit(record, nextValue, previousValue, item);
  emit(record, "drop", nextValue, previousValue, item);
  if (item)
    announce(
      record,
      `${labelFor(item)} dropped at position ${order(record).indexOf(itemValue(item)) + 1}.`,
    );
}

function itemFromEvent(
  record: SortableRecord,
  target: EventTarget | null,
): HTMLElement | undefined {
  if (!(target instanceof Element)) return undefined;
  const item = target.closest<HTMLElement>('[data-part="item"]');
  return item && item.parentElement === record.list ? item : undefined;
}

function wire(record: SortableRecord): () => void {
  const click = (event: MouseEvent): void => {
    const item = itemFromEvent(record, event.target);
    if (!item || !(event.target instanceof Element)) return;
    const index = record.items.indexOf(item);
    if (event.target.closest('[data-part="up"]')) moveItem(record, itemValue(item), index - 1);
    else if (event.target.closest('[data-part="down"]'))
      moveItem(record, itemValue(item), index + 1);
  };
  const keydown = (event: KeyboardEvent): void => {
    const item = itemFromEvent(record, event.target);
    const handle = event.target instanceof Element && event.target.closest('[data-part="handle"]');
    if (!item || !handle) return;
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault();
      if (record.preview) finishPreview(record);
      else startPreview(record, item);
      return;
    }
    if (!record.preview) return;
    if (event.key === "Escape") {
      event.preventDefault();
      finishPreview(record, true);
      return;
    }
    if (!["ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const current = itemsFor(record.list).indexOf(item);
    const target =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? record.items.length - 1
          : current + (event.key === "ArrowUp" ? -1 : 1);
    previewAt(record, target);
  };
  const dragstart = (event: DragEvent): void => {
    const item = itemFromEvent(record, event.target);
    const handle = event.target instanceof Element && event.target.closest('[data-part="handle"]');
    if (!item || !handle) {
      event.preventDefault();
      return;
    }
    startPreview(record, item);
    event.dataTransfer?.setData("text/plain", itemValue(item));
    if (event.dataTransfer) event.dataTransfer.effectAllowed = "move";
  };
  const dragover = (event: DragEvent): void => {
    if (!record.preview || !record.grabbed) return;
    event.preventDefault();
    const over = itemFromEvent(record, event.target);
    if (over && over !== record.grabbed) previewAt(record, itemsFor(record.list).indexOf(over));
  };
  const drop = (event: DragEvent): void => {
    if (!record.preview) return;
    event.preventDefault();
    finishPreview(record);
  };
  const dragend = (): void => {
    if (record.preview) finishPreview(record, true);
  };
  record.list.addEventListener("click", click);
  record.list.addEventListener("keydown", keydown);
  record.list.addEventListener("dragstart", dragstart);
  record.list.addEventListener("dragover", dragover);
  record.list.addEventListener("drop", drop);
  record.list.addEventListener("dragend", dragend);
  return () => {
    record.list.removeEventListener("click", click);
    record.list.removeEventListener("keydown", keydown);
    record.list.removeEventListener("dragstart", dragstart);
    record.list.removeEventListener("dragover", dragover);
    record.list.removeEventListener("drop", drop);
    record.list.removeEventListener("dragend", dragend);
  };
}

function parseValue(root: HTMLElement): string[] | undefined {
  if (!root.dataset.value) return undefined;
  try {
    const value: unknown = JSON.parse(root.dataset.value);
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}

function enhanceSortable(root: HTMLElement): SortableRecord {
  const existing = records.get(root);
  if (existing?.preview) return existing;
  root.id ||= `jqs-sortable-${++sortableId}`;
  const list = listFor(root);
  const items = itemsFor(list);
  if (items.length === 0) throw new Error(`Sortable #${root.id} needs data-part="item" children.`);
  for (const [index, item] of items.entries()) item.id ||= `${root.id}-item-${index + 1}`;
  const values = items.map(itemValue);
  if (new Set(values).size !== values.length) {
    throw new Error(`Sortable #${root.id} item values must be unique.`);
  }
  const authored = parseValue(root);
  const patched = authored && root.dataset.value !== existing?.lastValue;
  const desired = patched ? authored.filter((value) => values.includes(value)) : values;
  for (const value of values) if (!desired.includes(value)) desired.push(value);

  existing?.cleanup();
  const record: SortableRecord = {
    cleanup: () => undefined,
    grabbed: undefined,
    items,
    lastValue: root.dataset.value ?? "",
    list,
    originalOrder: undefined,
    preview: false,
    root,
  };
  records.set(root, record);
  restore(record, desired);
  const status = statusFor(record);
  if (status) {
    status.setAttribute("aria-live", "polite");
    status.setAttribute("aria-atomic", "true");
  }
  render(record, desired);
  record.cleanup = wire(record);
  return record;
}

function resolveSortable(target: SortableTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? sortableRoot(root.querySelector(target)) : sortableRoot(target);
  if (resolved) return resolved;
  throw new Error(`Sortable target did not match data-jqs="sortable": ${String(target)}`);
}

function controlledSortable(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="sortable"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveSortable(target, context.root);
  const closest = context.element?.closest('[data-jqs="sortable"]');
  return resolveSortable(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceSortables(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="sortable"]')));
  for (const element of elements) {
    const sortable = sortableRoot(element);
    if (sortable) enhanceSortable(sortable);
  }
}

export function createSortables(): SortableCollection {
  const api: StarSortableStatic = {
    move: (target, value, index) => {
      const root = resolveSortable(target);
      return moveItem(records.get(root) ?? enhanceSortable(root), value, index);
    },
    up: (target, value) => {
      const root = resolveSortable(target);
      const record = records.get(root) ?? enhanceSortable(root);
      return moveItem(
        record,
        value,
        record.items.findIndex((item) => itemValue(item) === value) - 1,
      );
    },
    down: (target, value) => {
      const root = resolveSortable(target);
      const record = records.get(root) ?? enhanceSortable(root);
      return moveItem(
        record,
        value,
        record.items.findIndex((item) => itemValue(item) === value) + 1,
      );
    },
    value: (target) => {
      const root = resolveSortable(target);
      return order(records.get(root) ?? enhanceSortable(root));
    },
  };
  for (const operation of ["up", "down"] as const) {
    registerAction(`ui.sortable.${operation}`, (context) => {
      const first = context.args?.[0];
      const explicit = typeof first === "string" && first.startsWith("#");
      const target = controlledSortable(context, explicit ? first : undefined);
      const value = explicit ? context.args?.[1] : first;
      if (typeof value !== "string")
        throw new Error(`ui.sortable.${operation} needs an item value.`);
      return api[operation](target, value);
    });
  }
  registerAction("ui.sortable.move", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledSortable(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    const index = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof value !== "string" || typeof index !== "number")
      throw new Error("ui.sortable.move needs an item value and index.");
    return api.move(target, value, index);
  });
  return { api, enhance: enhanceSortables };
}

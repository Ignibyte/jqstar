import type { ActionRegistrar } from "../registry";
import type { SortableTarget, StarContext, StarSortableStatic } from "../types";
import { isElementNode, isHTMLElement } from "../dom";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiActive,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

type Current = () => boolean;
interface SortableRecord extends UIResources {
  busy: boolean;
  grabbed: HTMLElement | undefined;
  items: HTMLElement[];
  lastValue: string;
  list: HTMLElement;
  originalOrder: string[] | undefined;
  parts: HTMLElement[];
  preview: boolean;
}
interface SortableCollection {
  api: StarSortableStatic;
  enhance(root: ParentNode): void;
}
const records = new WeakMap<HTMLElement, SortableRecord>();
const intents = new WeakMap<HTMLElement, number>();
let sortableId = 0;
function sortableRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="sortable"]') ? value : undefined;
}
function partsFor(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll("[data-part]")).filter(
    (element): element is HTMLElement =>
      isHTMLElement(element) && element.closest("[data-jqs]") === root,
  );
}
function itemsFor(list: HTMLElement): HTMLElement[] {
  return Array.from(list.children).filter(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "item",
  );
}
function itemValue(item: HTMLElement): string {
  const value = item.dataset.value?.trim();
  if (!value) throw new Error("Sortable item #" + item.id + " needs a non-empty data-value.");
  return value;
}
function order(record: SortableRecord): string[] {
  return itemsFor(record.list).map(itemValue);
}
function disabled(element: HTMLElement): boolean {
  return (
    element.hasAttribute("disabled") ||
    (element.hasAttribute("data-disabled") && element.dataset.disabled !== "false")
  );
}
function constrained(element: Element): boolean {
  return Boolean(
    element.closest(
      '[disabled],[hidden],[inert],[aria-disabled="true"],[aria-hidden="true"],[data-disabled]:not([data-disabled="false"])',
    ),
  );
}
function same<T>(left: T[], right: T[]): boolean {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}
function structure(record: SortableRecord): boolean {
  const parts = partsFor(record.root);
  return (
    sortableRoot(record.root) === record.root &&
    parts.find((part) => part.dataset.part === "list") === record.list &&
    same(itemsFor(record.list), record.items) &&
    parts.length === record.parts.length &&
    parts.every((part) => record.parts.includes(part))
  );
}
function current(record: SortableRecord, revision = record.revision): boolean {
  return uiCurrent(record, revision) && records.get(record.root) === record && structure(record);
}
function partFor(
  record: SortableRecord,
  part: string,
  item?: HTMLElement,
): HTMLElement | undefined {
  return record.parts.find(
    (element) =>
      element.dataset.part === part && (!item || element.closest('[data-part="item"]') === item),
  );
}
function generated(record: SortableRecord): HTMLInputElement[] {
  return Array.from(
    record.root.querySelectorAll<HTMLInputElement>('input[data-jqs-generated="sortable"]'),
  ).filter((input) => input.closest('[data-jqs="sortable"]') === record.root);
}
function operation(record: SortableRecord, permit: Current = () => true, retiring = false) {
  const revision = record.revision;
  const identity = (): boolean =>
    retiring
      ? record.revision === revision &&
        !records.has(record.root) &&
        record.root.ownerDocument === record.document &&
        structure(record)
      : current(record, revision);
  const attributes = new Map<HTMLElement, Map<string, string | null>>();
  const parents = new Map<HTMLElement, HTMLElement | null>();
  const texts = new Map<HTMLElement, string | null>();
  let inputs = generated(record);
  const observe = (element: HTMLElement, names: string[]): void => {
    const values = attributes.get(element) ?? new Map<string, string | null>();
    for (const name of names) values.set(name, element.getAttribute(name));
    attributes.set(element, values);
    parents.set(element, element.parentElement);
  };
  for (const element of [record.root, ...record.parts, ...inputs]) {
    observe(element, [
      "id",
      "data-part",
      "data-value",
      "data-name",
      "data-label",
      "data-index",
      "data-state",
      "data-disabled",
      "disabled",
      "hidden",
      "inert",
      "aria-disabled",
      "aria-hidden",
      "aria-label",
      "aria-labelledby",
      "aria-live",
      "aria-atomic",
      "draggable",
      "type",
      "name",
      "value",
    ]);
    if (element.dataset.part === "label" || element.dataset.part === "status")
      texts.set(element, element.textContent);
    for (let node = element.parentElement; node; node = node.parentElement)
      observe(node, [
        "disabled",
        "hidden",
        "inert",
        "aria-disabled",
        "aria-hidden",
        "data-disabled",
      ]);
  }
  const valid = (): boolean =>
    identity() &&
    permit() &&
    same(generated(record), inputs) &&
    [...parents].every(([element, parent]) => element.parentElement === parent) &&
    [...texts].every(([element, text]) => element.textContent === text) &&
    [...attributes].every(([element, values]) =>
      [...values].every(([name, value]) => element.getAttribute(name) === value),
    ) &&
    identity();
  const attribute = (element: HTMLElement, name: string, value: string | null): boolean => {
    if (!valid()) return false;
    if (element.getAttribute(name) === value) return true;
    attributes.get(element)?.set(name, value);
    if (value === null) element.removeAttribute(name);
    else element.setAttribute(name, value);
    return valid();
  };
  const text = (element: HTMLElement, value: string): boolean => {
    if (!valid()) return false;
    texts.set(element, value);
    if (element.textContent !== value) element.textContent = value;
    return valid();
  };
  const write = (run: () => void): boolean => {
    if (!valid()) return false;
    run();
    return valid();
  };
  const append = (item: HTMLElement): boolean => {
    if (!valid()) return false;
    record.items = [...record.items.filter((candidate) => candidate !== item), item];
    record.list.append(item);
    return valid();
  };
  const removeInput = (input: HTMLInputElement): boolean => {
    if (!valid()) return false;
    inputs = inputs.filter((candidate) => candidate !== input);
    attributes.delete(input);
    parents.delete(input);
    input.remove();
    return valid();
  };
  const appendInput = (input: HTMLInputElement): boolean => {
    if (!valid()) return false;
    inputs.push(input);
    observe(input, ["type", "name", "value", "data-jqs-generated"]);
    parents.set(input, record.root);
    record.root.append(input);
    return valid();
  };
  return { valid, attribute, text, write, append, removeInput, appendInput };
}
type Operation = ReturnType<typeof operation>;
function identifier(
  record: SortableRecord,
  op: Operation,
  element: HTMLElement,
  preferred: string,
): boolean {
  if (element.id) return op.valid();
  const ids = new Set(Array.from(record.root.querySelectorAll("[id]"), (node) => node.id));
  let candidate = preferred,
    count = 1;
  while (ids.has(candidate) || record.document.getElementById(candidate))
    candidate = preferred + "-" + String(++count);
  return op.attribute(element, "id", candidate);
}
function labelFor(record: SortableRecord, item: HTMLElement): string {
  return (
    item.dataset.label?.trim() ||
    partFor(record, "label", item)?.textContent?.trim() ||
    itemValue(item)
  );
}
function announce(record: SortableRecord, op: Operation, message: string): void {
  const status = partFor(record, "status");
  if (status) op.text(status, message);
}
function emit(
  record: SortableRecord,
  name: "before-change" | "change" | "grab" | "drop" | "cancel",
  value: string[],
  previousValue: string[],
  item?: HTMLElement,
  cancelable = false,
): boolean {
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent("jquery-star:sortable:" + name, {
      bubbles: true,
      cancelable,
      detail: {
        ...(item ? { item } : {}),
        previousValue: [...previousValue],
        sortable: record.root,
        value: [...value],
      },
    }),
  );
}
function replaceHiddenInputs(record: SortableRecord, values: string[], op: Operation): void {
  const name = record.root.dataset.name?.trim();
  const inputs = generated(record);
  if (
    name &&
    inputs.length === values.length &&
    inputs.every((input, index) => input.name === name && input.value === values[index])
  )
    return;
  for (const input of inputs) if (!op.removeInput(input)) return;
  if (!name) return;
  for (const value of values) {
    if (!op.valid()) return;
    const input = record.document.createElement("input");
    if (
      !op.write(() => {
        input.type = "hidden";
      })
    )
      return;
    if (
      !op.write(() => {
        input.name = name;
      })
    )
      return;
    if (
      !op.write(() => {
        input.value = value;
      })
    )
      return;
    if (
      !op.write(() => {
        input.dataset.jqsGenerated = "sortable";
      })
    )
      return;
    if (!op.appendInput(input)) return;
  }
}
function render(record: SortableRecord, op: Operation, values = order(record)): void {
  if (!op.valid()) return;
  if (
    !record.root.id &&
    !identifier(record, op, record.root, "jqs-sortable-" + String(++sortableId))
  )
    return;
  record.lastValue = JSON.stringify(values);
  if (!op.attribute(record.root, "data-value", record.lastValue)) return;
  if (!op.attribute(record.root, "data-state", record.preview ? "sorting" : "idle")) return;
  if (!op.attribute(record.root, "aria-disabled", String(disabled(record.root)))) return;
  replaceHiddenInputs(record, values, op);
  const status = partFor(record, "status");
  if (
    status &&
    (!op.attribute(status, "aria-live", "polite") || !op.attribute(status, "aria-atomic", "true"))
  )
    return;
  for (const [index, item] of record.items.entries()) {
    if (!identifier(record, op, item, record.root.id + "-item-" + String(index + 1))) return;
    if (!op.attribute(item, "data-index", String(index))) return;
    if (!op.attribute(item, "data-state", item === record.grabbed ? "grabbed" : "idle")) return;
    const unavailable =
      disabled(record.root) || disabled(item) || item.getAttribute("aria-disabled") === "true";
    const handle = partFor(record, "handle", item);
    if (handle) {
      if (!op.attribute(handle, "draggable", String(!unavailable))) return;
      if (!op.attribute(handle, "aria-disabled", String(unavailable))) return;
      if (
        !handle.hasAttribute("aria-label") &&
        !handle.hasAttribute("aria-labelledby") &&
        !op.attribute(handle, "aria-label", "Reorder " + labelFor(record, item))
      )
        return;
      if (handle.localName === "button" && !op.attribute(handle, "type", "button")) return;
    }
    for (const direction of ["up", "down"] as const) {
      const control = partFor(record, direction, item);
      if (!control) continue;
      if (!op.attribute(control, "type", "button")) return;
      const blocked =
        unavailable || (direction === "up" ? index === 0 : index === record.items.length - 1);
      if (!op.attribute(control, "disabled", blocked ? "" : null)) return;
    }
  }
}
function restore(record: SortableRecord, values: string[], op: Operation): void {
  if (!op.valid() || same(order(record), values)) return;
  const focused = record.document.activeElement;
  const byValue = new Map(record.items.map((item) => [itemValue(item), item]));
  for (const value of values) {
    const item = byValue.get(value);
    if (item && !op.append(item)) return;
  }
  if (
    isHTMLElement(focused) &&
    record.list.contains(focused) &&
    record.document.activeElement === record.document.body
  )
    op.write(() => focused.focus());
}
function clearPreview(record: SortableRecord): void {
  record.preview = false;
  record.grabbed = undefined;
  record.originalOrder = undefined;
}
function commit(
  record: SortableRecord,
  values: string[],
  previousValue: string[],
  op: Operation,
  item?: HTMLElement,
): boolean {
  if (!op.valid()) return false;
  if (same(values, previousValue)) {
    restore(record, previousValue, op);
    render(record, op, previousValue);
    return op.valid();
  }
  const accepted = emit(record, "before-change", values, previousValue, item, true);
  if (!op.valid()) return false;
  restore(record, accepted ? values : previousValue, op);
  render(record, op, accepted ? values : previousValue);
  if (!accepted || !op.valid()) return false;
  record.originalOrder = undefined;
  emit(record, "change", values, previousValue, item);
  if (!op.valid()) return false;
  record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("input", { bubbles: true }),
  );
  if (!op.valid()) return false;
  record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).Event("change", { bubbles: true }),
  );
  return op.valid();
}
function moveItem(record: SortableRecord, value: string, index: number, op: Operation): void {
  if (disabled(record.root) || !Number.isFinite(index) || !op.valid()) return;
  const item = record.items.find((candidate) => itemValue(candidate) === value);
  if (!item || disabled(item) || item.getAttribute("aria-disabled") === "true") return;
  const previous = order(record),
    next = previous.filter((candidate) => candidate !== value);
  next.splice(Math.max(0, Math.min(next.length, Math.trunc(index))), 0, value);
  commit(record, next, previous, op, item);
}
function request(
  root: HTMLElement,
  run: (record: SortableRecord, op: Operation) => void,
  permit: Current = () => true,
  preserve = false,
): HTMLElement {
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  if (!permit()) return root;
  const record = enhanceSortable(root);
  if (!current(record) || intents.get(root) !== intent || !permit()) return root;
  ++record.revision;
  const op = operation(record, () => intents.get(root) === intent && permit()),
    busy = record.busy;
  record.busy = true;
  try {
    if (!preserve && record.originalOrder) {
      const previous = record.originalOrder;
      clearPreview(record);
      restore(record, previous, op);
      render(record, op, previous);
    }
    if (op.valid()) run(record, op);
  } finally {
    record.busy = busy;
  }
  return root;
}
function startPreview(record: SortableRecord, item: HTMLElement, op: Operation): void {
  if (record.preview || constrained(item) || !op.valid()) return;
  record.preview = true;
  record.grabbed = item;
  record.originalOrder = order(record);
  render(record, op, record.originalOrder);
  if (!op.valid()) return;
  emit(record, "grab", record.originalOrder, record.originalOrder, item);
  if (op.valid())
    announce(
      record,
      op,
      labelFor(record, item) +
        " grabbed. Use arrow keys to move, Space to drop, or Escape to cancel.",
    );
}
function previewAt(record: SortableRecord, index: number, op: Operation): void {
  const item = record.grabbed;
  if (!record.preview || !item || constrained(item) || !op.valid()) return;
  const values = order(record).filter((value) => value !== itemValue(item));
  values.splice(Math.max(0, Math.min(values.length, index)), 0, itemValue(item));
  restore(record, values, op);
  render(record, op, record.originalOrder);
  if (op.valid())
    announce(
      record,
      op,
      labelFor(record, item) +
        " is now position " +
        String(record.items.indexOf(item) + 1) +
        " of " +
        String(record.items.length) +
        ".",
    );
}
function finishPreview(record: SortableRecord, op: Operation, canceled = false): void {
  if (!record.preview || !record.originalOrder || !op.valid()) return;
  const item = record.grabbed,
    previous = [...record.originalOrder],
    next = order(record);
  record.preview = false;
  record.grabbed = undefined;
  if (canceled) {
    restore(record, previous, op);
    render(record, op, previous);
    if (!op.valid()) return;
    record.originalOrder = undefined;
    emit(record, "cancel", previous, previous, item);
    if (op.valid()) announce(record, op, "Reordering canceled.");
    return;
  }
  const accepted = commit(record, next, previous, op, item);
  if (!op.valid()) return;
  record.originalOrder = undefined;
  emit(record, "drop", accepted ? next : previous, previous, item);
  if (op.valid() && item)
    announce(
      record,
      op,
      labelFor(record, item) +
        " dropped at position " +
        String(order(record).indexOf(itemValue(item)) + 1) +
        ".",
    );
}
function eventItem(record: SortableRecord, event: Event): HTMLElement | undefined {
  const target = event.target;
  if (
    event.defaultPrevented ||
    !isElementNode(target) ||
    constrained(target) ||
    target.closest("[data-jqs]") !== record.root
  )
    return undefined;
  const item = target.closest('[data-part="item"]');
  if (isHTMLElement(item) && item.parentElement === record.list) return item;
  return ["dragover", "drop", "dragend"].includes(event.type) ? record.grabbed : undefined;
}
function wire(record: SortableRecord, op: Operation): void {
  let acquisition: Current | undefined = op.valid;
  const valid = (): boolean => current(record) && (acquisition?.() ?? true);
  const handleEvent = (
    event: Event,
    run: (active: SortableRecord, op: Operation, item: HTMLElement) => void,
    prevent = false,
    preserve = true,
  ): void => {
    const item = eventItem(record, event);
    if (!item || !isElementNode(event.target)) return;
    const target = event.target;
    if (prevent) event.preventDefault();
    request(
      record.root,
      (active, next) => run(active, next, item),
      () => target.closest("[data-jqs]") === record.root,
      preserve,
    );
  };
  try {
    listenUI(record, valid, record.list, "click", (event) =>
      handleEvent(
        event,
        (active, next, item) => {
          const target = event.target;
          if (!isElementNode(target)) return;
          const control = target.closest('[data-part="up"],[data-part="down"]');
          if (!control || control.closest('[data-part="item"]') !== item) return;
          moveItem(
            active,
            itemValue(item),
            active.items.indexOf(item) + (control.getAttribute("data-part") === "up" ? -1 : 1),
            next,
          );
        },
        false,
        false,
      ),
    );
    listenUI(record, valid, record.list, "keydown", (event) => {
      const key = (event as KeyboardEvent).key;
      if (![" ", "Enter", "Escape", "ArrowUp", "ArrowDown", "Home", "End"].includes(key)) return;
      if (!record.preview && key !== " " && key !== "Enter") return;
      if (!isElementNode(event.target) || !event.target.closest('[data-part="handle"]')) return;
      handleEvent(
        event,
        (active, next, item) => {
          if (key === " " || key === "Enter") {
            if (active.preview) finishPreview(active, next);
            else startPreview(active, item, next);
          } else if (active.preview) {
            if (key === "Escape") finishPreview(active, next, true);
            else
              previewAt(
                active,
                key === "Home"
                  ? 0
                  : key === "End"
                    ? active.items.length - 1
                    : active.items.indexOf(item) + (key === "ArrowUp" ? -1 : 1),
                next,
              );
          }
        },
        true,
      );
    });
    listenUI(record, valid, record.list, "dragstart", (event) => {
      if (!isElementNode(event.target) || !event.target.closest('[data-part="handle"]')) {
        event.preventDefault();
        return;
      }
      handleEvent(event, (active, next, item) => {
        startPreview(active, item, next);
        if (!next.valid() || !active.preview) {
          event.preventDefault();
          return;
        }
        const data = (event as DragEvent).dataTransfer;
        if (!next.valid() || !data) return;
        if (!next.write(() => data.setData("text/plain", itemValue(item)))) return;
        next.write(() => {
          data.effectAllowed = "move";
        });
      });
    });
    listenUI(record, valid, record.list, "dragover", (event) => {
      if (!record.preview) return;
      handleEvent(
        event,
        (active, next, item) => {
          if (active.grabbed !== item) previewAt(active, active.items.indexOf(item), next);
        },
        true,
      );
    });
    for (const type of ["drop", "dragend"] as const)
      listenUI(record, valid, record.list, type, (event) => {
        if (!record.preview) return;
        handleEvent(
          event,
          (active, next) => finishPreview(active, next, type === "dragend"),
          type === "drop",
        );
      });
  } finally {
    acquisition = undefined;
  }
}
function parseValue(root: HTMLElement): string[] | undefined {
  try {
    const value: unknown = JSON.parse(root.dataset.value ?? "");
    return Array.isArray(value) && value.every((item) => typeof item === "string")
      ? value
      : undefined;
  } catch {
    return undefined;
  }
}
function desiredValue(root: HTMLElement, values: string[], patched: boolean): string[] {
  const authored = patched ? parseValue(root) : undefined;
  const desired = authored
    ? [...new Set(authored.filter((value) => values.includes(value)))]
    : [...values];
  for (const value of values) if (!desired.includes(value)) desired.push(value);
  return desired;
}
function enhanceSortable(root: HTMLElement): SortableRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    if (existing.busy) return existing;
    const values = order(existing);
    if (new Set(values).size !== values.length)
      throw new Error("Sortable #" + root.id + " item values must be unique.");
    const patched = root.dataset.value !== existing.lastValue;
    if (patched) ++existing.revision;
    const op = operation(existing);
    existing.busy = true;
    try {
      if (patched) {
        clearPreview(existing);
        const desired = desiredValue(root, order(existing), true);
        restore(existing, desired, op);
        render(existing, op, desired);
      } else render(existing, op, existing.preview ? existing.originalOrder : order(existing));
    } catch (error) {
      failUISetup(existing, error);
    } finally {
      existing.busy = false;
    }
    return existing;
  }
  existing?.cleanup();
  const newer = records.get(root);
  if (newer) return newer;
  if (existing && !uiActive(root)) return existing;
  const parts = partsFor(root),
    list = parts.find((part) => part.dataset.part === "list");
  if (!list) throw new Error("Sortable #" + root.id + ' needs data-part="list".');
  const items = itemsFor(list),
    values = items.map(itemValue);
  if (!items.length) throw new Error("Sortable #" + root.id + ' needs data-part="item" children.');
  if (new Set(values).size !== values.length)
    throw new Error("Sortable #" + root.id + " item values must be unique.");
  const desired = desiredValue(root, values, root.dataset.value !== existing?.lastValue);
  const record: SortableRecord = {
    ...uiResources(root),
    busy: true,
    grabbed: undefined,
    items,
    lastValue: root.dataset.value ?? "",
    list,
    originalOrder: undefined,
    parts,
    preview: false,
  };
  record.cleanups.add(() => {
    const previous = record.originalOrder;
    if (!previous) return;
    clearPreview(record);
    if (
      records.has(root) ||
      root.ownerDocument !== record.document ||
      root.dataset.value !== record.lastValue ||
      !structure(record)
    )
      return;
    const op = operation(record, () => true, true);
    restore(record, previous, op);
    render(record, op, previous);
  });
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  const op = operation(record);
  let wired = false;
  try {
    restore(record, desired, op);
    render(record, op, desired);
    if (op.valid()) wire(record, op);
    wired = op.valid();
  } catch (error) {
    failUISetup(record, error);
  } finally {
    record.busy = false;
    if (!wired && record.active) record.cleanup();
  }
  return record;
}
function resolve(owner: Document, target: SortableTarget, within: ParentNode = owner): HTMLElement {
  const root =
    typeof target === "string"
      ? sortableRoot(
          isHTMLElement(within) && within.matches(target) ? within : within.querySelector(target),
        )
      : sortableRoot(target);
  if (!root)
    throw new Error('Sortable target did not match data-jqs="sortable": ' + String(target));
  if (root.ownerDocument !== owner || !uiActive(root))
    throw new Error("This Sortable target is unavailable in its owning Document.");
  return root;
}
function controlled(owner: Document, context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target) || typeof target === "string")
    return resolve(owner, target, context.root);
  const root =
    sortableRoot(context.element?.closest('[data-jqs="sortable"]') ?? null) ??
    sortableRoot(context.root);
  if (root) return resolve(owner, root);
  throw new Error('Sortable action needs a selector or an element inside data-jqs="sortable".');
}
export function createSortables(
  registerAction: ActionRegistrar,
  owner: Document,
): SortableCollection {
  const move = (
    root: HTMLElement,
    value: string,
    direction: "move" | "up" | "down",
    index = 0,
    permit: Current = () => true,
  ): HTMLElement =>
    request(
      root,
      (record, op) =>
        moveItem(
          record,
          value,
          direction === "move"
            ? index
            : record.items.findIndex((item) => itemValue(item) === value) +
                (direction === "up" ? -1 : 1),
          op,
        ),
      permit,
    );
  const api: StarSortableStatic = {
    move: (target, value, index) => move(resolve(owner, target), value, "move", index),
    up: (target, value) => move(resolve(owner, target), value, "up"),
    down: (target, value) => move(resolve(owner, target), value, "down"),
    value: (target) => {
      const root = resolve(owner, target),
        record = enhanceSortable(root);
      return desiredValue(root, order(record), root.dataset.value !== record.lastValue);
    },
  };
  const allowed = (context: StarContext, root: HTMLElement): boolean =>
    uiActive(root) &&
    root.ownerDocument === owner &&
    !constrained(root) &&
    uiActive(context.root) &&
    context.root.ownerDocument === owner &&
    !constrained(context.root) &&
    (!context.element ||
      (context.element.ownerDocument === owner &&
        uiActive(context.element) &&
        !constrained(context.element))) &&
    !(context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) &&
    !(context.event && "isDefaultPrevented" in context.event && context.event.isDefaultPrevented());
  for (const name of ["up", "down", "move"] as const)
    registerAction("ui.sortable." + name, (context) => {
      const args = context.args ?? [],
        first = args[0];
      const explicit = isHTMLElement(first) || args.length >= (name === "move" ? 3 : 2);
      const root = controlled(owner, context, explicit ? first : undefined);
      const value = args[explicit ? 1 : 0],
        index = name === "move" ? args[explicit ? 2 : 1] : 0;
      if (typeof value !== "string" || typeof index !== "number")
        throw new Error(
          "ui.sortable." + name + " needs an item value" + (name === "move" ? " and index." : "."),
        );
      return move(root, value, name, index, () => allowed(context, root));
    });
  return {
    api,
    enhance(root) {
      for (const element of uiElements(root, '[data-jqs="sortable"]')) {
        const target = sortableRoot(element);
        if (target && target.ownerDocument === owner) enhanceSortable(target);
      }
    },
  };
}

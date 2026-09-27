import { isElementNode, isHTMLElement } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { StarContext, StarTreeStatic, TreeTarget } from "../types";
import {
  copyGeneratedAttributes,
  identifyElements,
  identifyLabel,
  syncGeneratedAttribute,
} from "./floating";
import {
  acquireUIResource,
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

type TreeSelection = "multiple" | "none" | "single";

interface TreeRecord extends UIResources {
  activeItem: HTMLElement | undefined;
  items: HTMLElement[];
  rows: HTMLElement[];
  labels: HTMLElement[];
  groups: Array<HTMLElement | undefined>;
  parents: Array<HTMLElement | null>;
  search: string;
  searchExpires: number;
  cancelSearch?: () => void;
  selected: Set<string>;
  selection: TreeSelection;
  state: string;
}

interface TreeSnapshot {
  activeItem: HTMLElement | undefined;
  activeValue: string | undefined;
  search: string;
  searchExpires: number;
}

interface TreeEventDetail {
  item: HTMLElement;
  selected: boolean;
  tree: HTMLElement;
  value: string;
  values: string[];
}

interface TreeCollection {
  api: StarTreeStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, TreeRecord>();
const snapshots = new WeakMap<HTMLElement, TreeSnapshot>();
const intents = new WeakMap<HTMLElement, number>();
let treeId = 0;

function treeRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="tree"]') ? value : undefined;
}

function selectionMode(root: HTMLElement): TreeSelection {
  if (root.dataset.selection === "multiple") return "multiple";
  if (root.dataset.selection === "none") return "none";
  return "single";
}

function treeItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-part="item"]')).filter(
    (item) => isHTMLElement(item) && item.closest("[data-jqs]") === root,
  );
}

function directPart(parent: HTMLElement, name: string): HTMLElement | undefined {
  return Array.from(parent.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === name,
  );
}

function directGroup(item: HTMLElement): HTMLElement | undefined {
  return directPart(item, "group");
}

function directRow(item: HTMLElement): HTMLElement {
  const row = directPart(item, "row");
  if (!row) throw new Error(`Tree item #${item.id} needs a direct data-part="row" child.`);
  return row;
}

function directLabel(item: HTMLElement): HTMLElement {
  const label = directPart(directRow(item), "label");
  if (!label) throw new Error(`Tree item #${item.id} needs data-part="label" inside its row.`);
  return label;
}

function current(record: TreeRecord, revision = record.revision): boolean {
  if (!uiCurrent(record, revision) || records.get(record.root) !== record) return false;
  const items = treeItems(record.root);
  return (
    selectionMode(record.root) === record.selection &&
    items.length === record.items.length &&
    items.every(
      (item, index) =>
        item === record.items[index] &&
        directPart(item, "row") === record.rows[index] &&
        (record.rows[index] && directPart(record.rows[index], "label")) === record.labels[index] &&
        directGroup(item) === record.groups[index] &&
        item.parentElement === record.parents[index],
    )
  );
}

function state(record: TreeRecord): string {
  return JSON.stringify([
    record.root.dataset.value,
    record.root.dataset.selection,
    disabled(record.root),
    record.items.map((item) => [
      item.dataset.value,
      disabled(item),
      item.dataset.expanded,
      item.getAttribute("aria-expanded"),
      directGroup(item)?.hidden,
      item.hidden,
    ]),
  ]);
}

function continuation(record: TreeRecord, revision: number): () => boolean {
  const captured = state(record);
  return () => current(record, revision) && state(record) === captured;
}

function nextIntent(root: HTMLElement): number {
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  return intent;
}

function begin(record: TreeRecord): number {
  nextIntent(record.root);
  return ++record.revision;
}

function itemValue(item: HTMLElement): string {
  const value = item.dataset.value?.trim();
  if (!value) throw new Error(`Tree item #${item.id} needs a non-empty data-value.`);
  return value;
}

function disabled(item: HTMLElement): boolean {
  return (
    item.getAttribute("aria-disabled") === "true" ||
    item.dataset.disabled !== undefined ||
    item.hasAttribute("disabled")
  );
}

function expanded(item: HTMLElement): boolean {
  if (item.dataset.expanded !== undefined) return item.dataset.expanded === "true";
  return item.getAttribute("aria-expanded") === "true";
}

function parentItem(item: HTMLElement, root: HTMLElement): HTMLElement | undefined {
  const group = item.parentElement?.closest<HTMLElement>('[data-part="group"]');
  const parent = group?.parentElement;
  return isHTMLElement(parent) && parent.matches('[data-part="item"]') && root.contains(parent)
    ? parent
    : undefined;
}

function siblingItems(item: HTMLElement): HTMLElement[] {
  return item.parentElement
    ? Array.from(item.parentElement.children).filter(
        (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "item",
      )
    : [];
}

function visibleItems(record: TreeRecord): HTMLElement[] {
  return record.items.filter((item) => {
    if (item.hidden) return false;
    let parent = parentItem(item, record.root);
    while (parent) {
      if (!expanded(parent) || parent.hidden || directGroup(parent)?.hidden) return false;
      parent = parentItem(parent, record.root);
    }
    return true;
  });
}

function orderedValues(record: TreeRecord): string[] {
  return record.items.map(itemValue).filter((value) => record.selected.has(value));
}

function serialized(record: TreeRecord): string {
  const values = orderedValues(record);
  return record.selection === "multiple" ? JSON.stringify(values) : (values[0] ?? "");
}

function parseValue(root: HTMLElement, mode: TreeSelection): Set<string> {
  if (mode === "none") return new Set();
  const authored = root.dataset.value;
  if (mode === "single") return new Set(authored?.trim() ? [authored.trim()] : []);
  if (!authored?.trim()) return new Set();
  try {
    const parsed: unknown = JSON.parse(authored);
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((value): value is string => typeof value === "string")
        : [],
    );
  } catch {
    return new Set(authored.split(/[\s,]+/).filter(Boolean));
  }
}

function emit(
  record: TreeRecord,
  name:
    | "activate"
    | "before-collapse"
    | "before-expand"
    | "before-select"
    | "collapse"
    | "expand"
    | "select",
  item: HTMLElement,
  selected: boolean,
  cancelable = false,
): boolean {
  const detail: TreeEventDetail = {
    item,
    selected,
    tree: record.root,
    value: itemValue(item),
    values: orderedValues(record),
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:tree:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function setActive(record: TreeRecord, item: HTMLElement, revision: number, focus = false): void {
  if (
    !current(record, revision) ||
    disabled(record.root) ||
    disabled(item) ||
    !visibleItems(record).includes(item)
  )
    return;
  record.activeItem = item;
  for (const candidate of record.items) candidate.tabIndex = candidate === item ? 0 : -1;
  if (focus) item.focus();
}

function syncSelection(record: TreeRecord): void {
  const allowed = new Set(record.items.map(itemValue));
  for (const value of [...record.selected]) {
    if (!allowed.has(value)) record.selected.delete(value);
  }
  if (record.selection === "single" && record.selected.size > 1) {
    const first = orderedValues(record)[0];
    record.selected = new Set(first ? [first] : []);
  } else if (record.selection === "none") {
    record.selected.clear();
  }
  for (const item of record.items) {
    const selected = record.selected.has(itemValue(item));
    if (record.selection === "none") item.removeAttribute("aria-selected");
    else item.setAttribute("aria-selected", String(selected));
    item.dataset.state = selected ? "selected" : "unselected";
  }
  if (record.selection === "none") {
    delete record.root.dataset.value;
  } else {
    const value = serialized(record);
    if (record.root.dataset.value !== value) record.root.dataset.value = value;
  }
}

function setExpanded(record: TreeRecord, item: HTMLElement, next: boolean, revision: number): void {
  if (!current(record, revision) || disabled(record.root)) return;
  const group = directGroup(item);
  if (!record.items.includes(item) || !group || disabled(item) || expanded(item) === next) return;
  const valid = continuation(record, revision);
  if (
    !emit(
      record,
      next ? "before-expand" : "before-collapse",
      item,
      record.selected.has(itemValue(item)),
      true,
    ) ||
    !valid()
  )
    return;
  item.dataset.expanded = String(next);
  item.setAttribute("aria-expanded", String(next));
  group.hidden = !next;
  const toggle = directRow(item).querySelector<HTMLElement>('[data-part="toggle"]');
  if (toggle) toggle.dataset.state = next ? "open" : "closed";
  record.state = state(record);
  const committed = continuation(record, revision);
  if (!next && record.activeItem && group.contains(record.activeItem))
    setActive(record, item, revision, true);
  if (committed())
    emit(record, next ? "expand" : "collapse", item, record.selected.has(itemValue(item)));
}

function setSelected(record: TreeRecord, item: HTMLElement, next: boolean, revision: number): void {
  if (
    !current(record, revision) ||
    disabled(record.root) ||
    record.selection === "none" ||
    disabled(item)
  )
    return;
  const value = itemValue(item);
  const valid = continuation(record, revision);
  if (
    record.selected.has(value) === next ||
    !emit(record, "before-select", item, next, true) ||
    !valid()
  )
    return;
  if (record.selection === "single") record.selected.clear();
  if (next) record.selected.add(value);
  else record.selected.delete(value);
  syncSelection(record);
  record.state = state(record);
  emit(record, "select", item, next);
}

function selectAll(record: TreeRecord, revision: number): void {
  if (record.selection !== "multiple") return;
  const visible = visibleItems(record).filter((item) => !disabled(item));
  const allSelected = visible.every((item) => record.selected.has(itemValue(item)));
  const valid = continuation(record, revision);
  if (record.activeItem && !emit(record, "before-select", record.activeItem, !allSelected, true))
    return;
  if (!valid()) return;
  for (const item of visible) {
    const value = itemValue(item);
    if (allSelected) record.selected.delete(value);
    else record.selected.add(value);
  }
  syncSelection(record);
  record.state = state(record);
  if (record.activeItem) emit(record, "select", record.activeItem, !allSelected);
}

function moveFocus(
  record: TreeRecord,
  item: HTMLElement,
  offset: number,
  revision: number,
  extend: boolean,
): void {
  const visible = visibleItems(record).filter((candidate) => !disabled(candidate));
  const index = visible.indexOf(item);
  const next = visible[Math.max(0, Math.min(visible.length - 1, index + offset))];
  if (!next || next === item) return;
  const valid = continuation(record, revision);
  setActive(record, next, revision, true);
  if (valid() && extend && record.selection === "multiple")
    setSelected(record, next, !record.selected.has(itemValue(next)), revision);
}

function scheduleSearch(
  record: TreeRecord,
  delay = Math.max(0, record.searchExpires - Date.now()),
): void {
  let timer: number | undefined;
  let active = true;
  const valid = (): boolean => active && current(record) && record.cancelSearch === cancel;
  const cancel = (): void => {
    active = false;
    if (record.cancelSearch === cancel) delete record.cancelSearch;
    record.cleanups.delete(cancel);
    const handle = timer;
    timer = undefined;
    if (handle !== undefined) record.window.clearTimeout(handle);
  };
  record.cancelSearch = cancel;
  acquireUIResource(
    record,
    valid,
    () => {
      timer = record.window.setTimeout(() => {
        const accepted = valid();
        cancel();
        if (accepted && current(record) && !record.cancelSearch) {
          record.search = "";
          record.searchExpires = 0;
        }
      }, delay);
    },
    cancel,
  );
}

function typeahead(record: TreeRecord, item: HTMLElement, key: string, revision: number): void {
  const valid = continuation(record, revision);
  record.cancelSearch?.();
  if (!valid()) return;
  if (Date.now() >= record.searchExpires) record.search = "";
  record.search += key.toLocaleLowerCase();
  record.searchExpires = Date.now() + 500;
  scheduleSearch(record, 500);
  if (!valid()) return;
  const visible = visibleItems(record).filter((candidate) => !disabled(candidate));
  const index = visible.indexOf(item);
  const ordered = [...visible.slice(index + 1), ...visible.slice(0, index + 1)];
  const match = ordered.find((candidate) =>
    directLabel(candidate).textContent?.trim().toLocaleLowerCase().startsWith(record.search),
  );
  if (match) setActive(record, match, revision, true);
}

function itemKeydown(record: TreeRecord, item: HTMLElement, event: KeyboardEvent): void {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    event.altKey ||
    disabled(record.root) ||
    disabled(item)
  )
    return;
  const all = (event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "a";
  if ((event.ctrlKey || event.metaKey) && !all) return;
  const revision = begin(record);
  if (all) {
    event.preventDefault();
    selectAll(record, revision);
  } else if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveFocus(record, item, event.key === "ArrowDown" ? 1 : -1, revision, event.shiftKey);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    const group = directGroup(item);
    if (group && !expanded(item)) setExpanded(record, item, true, revision);
    else {
      const child =
        group &&
        record.items.find((candidate) => candidate.parentElement === group && !disabled(candidate));
      if (child) setActive(record, child, revision, true);
    }
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (directGroup(item) && expanded(item)) setExpanded(record, item, false, revision);
    else {
      const parent = parentItem(item, record.root);
      if (parent) setActive(record, parent, revision, true);
    }
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    const visible = visibleItems(record).filter((candidate) => !disabled(candidate));
    const edge = event.key === "End" ? visible.at(-1) : visible[0];
    if (edge) setActive(record, edge, revision, true);
  } else if (event.key === "*") {
    event.preventDefault();
    for (const sibling of siblingItems(item)) {
      if (!current(record, revision)) break;
      setExpanded(record, sibling, true, revision);
      if (state(record) !== record.state) break;
    }
  } else if (event.key === " ") {
    event.preventDefault();
    setSelected(record, item, !record.selected.has(itemValue(item)), revision);
  } else if (event.key === "Enter") {
    event.preventDefault();
    emit(record, "activate", item, record.selected.has(itemValue(item)));
  } else if (event.key.length === 1 && /\S/.test(event.key))
    typeahead(record, item, event.key, revision);
}

function rowTarget(record: TreeRecord, item: HTMLElement, event: Event): Element | undefined {
  const target = event.target;
  if (
    event.defaultPrevented ||
    !isElementNode(target) ||
    target.closest("[data-jqs]") !== record.root ||
    disabled(record.root) ||
    disabled(item)
  )
    return undefined;
  const toggle = target.closest('[data-part="toggle"]');
  if (toggle?.closest('[data-part="item"]') === item)
    return toggle.matches(':disabled,[aria-disabled="true"],[data-disabled]') ? undefined : toggle;
  return target.closest(
    'input,button,select,textarea,a[href],[contenteditable]:not([contenteditable="false"])',
  )
    ? undefined
    : target;
}

function wire(record: TreeRecord): void {
  const valid = (): boolean => current(record);
  for (const item of record.items) {
    const row = directRow(item);
    listenUI(record, valid, row, "click", (event) => {
      const target = rowTarget(record, item, event);
      if (!target) return;
      refresh(record);
      const revision = begin(record);
      const accepted = continuation(record, revision);
      setActive(record, item, revision, true);
      if (!accepted()) return;
      if (target.matches('[data-part="toggle"]'))
        setExpanded(record, item, !expanded(item), revision);
      else
        setSelected(
          record,
          item,
          record.selection === "multiple" ? !record.selected.has(itemValue(item)) : true,
          revision,
        );
    });
    listenUI(record, valid, row, "dblclick", (event) => {
      if (rowTarget(record, item, event)) {
        refresh(record);
        begin(record);
        emit(record, "activate", item, record.selected.has(itemValue(item)));
      }
    });
    listenUI(record, valid, item, "focus", () => {
      if (record.activeItem !== item) setActive(record, item, begin(record));
    });
    listenUI(record, valid, item, "keydown", (event) => {
      if (event.target === item) {
        refresh(record);
        itemKeydown(record, item, event as KeyboardEvent);
      }
    });
  }
}

function prepareItem(record: TreeRecord, item: HTMLElement): void {
  const label = directLabel(item);
  label.id ||= `${item.id}-label`;
  item.setAttribute("role", "treeitem");
  identifyLabel(item, label.id);
  syncGeneratedAttribute(
    item,
    "aria-disabled",
    item.dataset.disabled !== undefined ? "true" : undefined,
  );
  const group = directGroup(item);
  if (group) {
    group.setAttribute("role", "group");
    const isExpanded = expanded(item);
    if (item.dataset.expanded !== String(isExpanded)) {
      item.dataset.expanded = String(isExpanded);
    }
    item.setAttribute("aria-expanded", String(isExpanded));
    group.hidden = !isExpanded;
    const toggle = directRow(item).querySelector<HTMLElement>('[data-part="toggle"]');
    if (toggle) {
      toggle.setAttribute("aria-hidden", "true");
      toggle.dataset.state = isExpanded ? "open" : "closed";
    }
  } else {
    item.removeAttribute("aria-expanded");
    delete item.dataset.expanded;
  }
  const siblings = siblingItems(item);
  item.setAttribute("aria-setsize", String(siblings.length));
  item.setAttribute("aria-posinset", String(siblings.indexOf(item) + 1));
  let level = 1;
  let parent = parentItem(item, record.root);
  while (parent) {
    level += 1;
    parent = parentItem(parent, record.root);
  }
  item.setAttribute("aria-level", String(level));
}

function refresh(record: TreeRecord): void {
  if (record.state && record.state !== state(record)) record.revision += 1;
  if (record.root.dataset.value !== undefined)
    record.selected = parseValue(record.root, record.selection);
  for (const item of record.items) prepareItem(record, item);
  syncSelection(record);
  const visible = visibleItems(record).filter((item) => !disabled(item));
  const active =
    (record.activeItem && visible.includes(record.activeItem) ? record.activeItem : undefined) ??
    visible.find((item) => record.selected.has(itemValue(item))) ??
    visible[0];
  record.activeItem = active;
  for (const item of record.items) item.tabIndex = item === active ? 0 : -1;
  record.state = state(record);
}

function retain(record: TreeRecord): void {
  snapshots.set(record.root, {
    activeItem: record.activeItem,
    activeValue: record.activeItem?.dataset.value?.trim(),
    search: record.search,
    searchExpires: record.searchExpires,
  });
}

function enhanceTreeRoot(root: HTMLElement): TreeRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    refresh(existing);
    return existing;
  }
  existing?.cleanup();
  if (existing && !uiActive(root)) return existing;
  const replacement = records.get(root);
  if (replacement) return replacement;
  root.id ||= `jqs-tree-${++treeId}`;
  root.setAttribute("role", "tree");
  const selection = selectionMode(root);
  if (selection === "multiple") root.setAttribute("aria-multiselectable", "true");
  else root.removeAttribute("aria-multiselectable");
  const items = treeItems(root);
  if (items.length === 0) throw new Error(`Tree #${root.id} needs data-part="item" descendants.`);
  const snapshot = snapshots.get(root);
  const record: TreeRecord = {
    ...uiResources(root),
    activeItem:
      items.find((item) => item === snapshot?.activeItem) ??
      items.find((item) => itemValue(item) === snapshot?.activeValue),
    items,
    rows: items.map(directRow),
    labels: items.map(directLabel),
    groups: items.map(directGroup),
    parents: items.map((item) => item.parentElement),
    search: snapshot && snapshot.searchExpires > Date.now() ? snapshot.search : "",
    searchExpires: snapshot?.searchExpires ?? 0,
    selected: new Set(
      items
        .filter(
          (item) =>
            item.dataset.selected === "true" || item.getAttribute("aria-selected") === "true",
        )
        .map(itemValue),
    ),
    selection,
    state: "",
  };
  record.cleanup = ownUIRecord(records, root, record, () => {
    retain(record);
    releaseUIResources(record);
  });
  try {
    if (!record.active) return record;
    identifyElements(items, `${root.id}-item`, 1);
    for (const item of items) {
      const previous = existing?.items.find(
        (candidate) => itemValue(candidate) === itemValue(item),
      );
      if (previous) copyGeneratedAttributes(previous, item);
    }
    refresh(record);
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    if (record.search) scheduleSearch(record);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function resolveTree(target: TreeTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? treeRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : treeRoot(target);
  if (resolved) return resolved;
  throw new Error(`Tree target did not match data-jqs="tree": ${String(target)}`);
}

function resolveItem(record: TreeRecord, value: string): HTMLElement {
  const item = record.items.find((candidate) => itemValue(candidate) === value);
  if (item) return item;
  throw new Error(`Tree #${record.root.id} has no item with value "${value}".`);
}

function controlledTree(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveTree(target, context.root);
  if (typeof target === "string" && target.startsWith("#"))
    return resolveTree(target, context.root);
  const closest = context.element?.closest('[data-jqs="tree"]');
  return resolveTree(isHTMLElement(closest) ? closest : String(target), context.root);
}

function enhanceTree(root: ParentNode): void {
  const elements = uiElements(root, '[data-jqs="tree"]');
  for (const element of elements) {
    const tree = treeRoot(element);
    if (tree) enhanceTreeRoot(tree);
  }
}

function operate(
  target: TreeTarget,
  value: string,
  change: (record: TreeRecord, item: HTMLElement, revision: number) => void,
): HTMLElement {
  const root = resolveTree(target);
  const intent = nextIntent(root);
  const record = enhanceTreeRoot(root);
  if (intents.get(root) === intent && current(record) && record.state === state(record))
    change(record, resolveItem(record, value), ++record.revision);
  return root;
}

function focusItem(record: TreeRecord, item: HTMLElement, revision: number): void {
  if (disabled(record.root) || disabled(item)) return;
  const parents: HTMLElement[] = [];
  let parent = parentItem(item, record.root);
  while (parent) {
    parents.push(parent);
    parent = parentItem(parent, record.root);
  }
  for (const ancestor of parents) {
    if (!current(record, revision)) return;
    setExpanded(record, ancestor, true, revision);
    if (!expanded(ancestor) || state(record) !== record.state) return;
  }
  setActive(record, item, revision, true);
}

export function createTrees(registerAction: ActionRegistrar): TreeCollection {
  const api: StarTreeStatic = {
    select: (target, value, selected) =>
      operate(target, value, (record, item, revision) =>
        setSelected(record, item, selected ?? !record.selected.has(value), revision),
      ),
    expand: (target, value) =>
      operate(target, value, (record, item, revision) => setExpanded(record, item, true, revision)),
    collapse: (target, value) =>
      operate(target, value, (record, item, revision) =>
        setExpanded(record, item, false, revision),
      ),
    toggle: (target, value) =>
      operate(target, value, (record, item, revision) =>
        setExpanded(record, item, !expanded(item), revision),
      ),
    focus: (target, value) => operate(target, value, focusItem),
    value: (target) => {
      const record = enhanceTreeRoot(resolveTree(target));
      const values = orderedValues(record);
      return record.selection === "multiple" ? values : values[0];
    },
  };
  registerAction("ui.tree.select", (context) => {
    const first = context.args?.[0];
    const explicit = isHTMLElement(first) || (typeof first === "string" && first.startsWith("#"));
    const target = controlledTree(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    const selected = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof value !== "string") throw new Error("ui.tree.select needs an item value.");
    return api.select(target, value, typeof selected === "boolean" ? selected : undefined);
  });
  for (const operation of ["expand", "collapse", "toggle", "focus"] as const) {
    registerAction(`ui.tree.${operation}`, (context) => {
      const first = context.args?.[0];
      const explicit = isHTMLElement(first) || (typeof first === "string" && first.startsWith("#"));
      const target = controlledTree(context, explicit ? first : undefined);
      const value = explicit ? context.args?.[1] : first;
      if (typeof value !== "string") {
        throw new Error(`ui.tree.${operation} needs an item value.`);
      }
      return api[operation](target, value);
    });
  }
  return { api, enhance: enhanceTree };
}

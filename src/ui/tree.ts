import type { ActionRegistrar } from "../registry";
import type { StarContext, StarTreeStatic, TreeTarget } from "../types";

type TreeSelection = "multiple" | "none" | "single";

interface TreeRecord {
  active: HTMLElement | undefined;
  cleanup: () => void;
  items: HTMLElement[];
  root: HTMLElement;
  search: string;
  searchTimer: number | undefined;
  selected: Set<string>;
  selection: TreeSelection;
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
let treeId = 0;

function treeRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="tree"]') ? value : undefined;
}

function selectionMode(root: HTMLElement): TreeSelection {
  if (root.dataset.selection === "multiple") return "multiple";
  if (root.dataset.selection === "none") return "none";
  return "single";
}

function treeItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-part="item"]')).filter(
    (item) => item.closest('[data-jqs="tree"]') === root,
  );
}

function directGroup(item: HTMLElement): HTMLElement | undefined {
  return Array.from(item.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "group",
  );
}

function directRow(item: HTMLElement): HTMLElement {
  const row = Array.from(item.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "row",
  );
  if (!row) throw new Error(`Tree item #${item.id} needs a direct data-part="row" child.`);
  return row;
}

function directLabel(item: HTMLElement): HTMLElement {
  const row = directRow(item);
  const label = Array.from(row.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "label",
  );
  if (!label) throw new Error(`Tree item #${item.id} needs data-part="label" inside its row.`);
  return label;
}

function itemValue(item: HTMLElement): string {
  const value = item.dataset.value?.trim();
  if (!value) throw new Error(`Tree item #${item.id} needs a non-empty data-value.`);
  return value;
}

function disabled(item: HTMLElement): boolean {
  return item.getAttribute("aria-disabled") === "true" || item.dataset.disabled !== undefined;
}

function expanded(item: HTMLElement): boolean {
  if (item.dataset.expanded !== undefined) return item.dataset.expanded === "true";
  return item.getAttribute("aria-expanded") === "true";
}

function parentItem(item: HTMLElement, root: HTMLElement): HTMLElement | undefined {
  const group = item.parentElement?.closest<HTMLElement>('[data-part="group"]');
  const parent = group?.parentElement;
  return parent instanceof HTMLElement &&
    parent.matches('[data-part="item"]') &&
    root.contains(parent)
    ? parent
    : undefined;
}

function siblingItems(item: HTMLElement): HTMLElement[] {
  return item.parentElement
    ? Array.from(item.parentElement.children).filter(
        (child): child is HTMLElement =>
          child instanceof HTMLElement && child.dataset.part === "item",
      )
    : [];
}

function visibleItems(record: TreeRecord): HTMLElement[] {
  return record.items.filter((item) => {
    let parent = parentItem(item, record.root);
    while (parent) {
      if (!expanded(parent)) return false;
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
    new CustomEvent(`jquery-star:tree:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function setActive(record: TreeRecord, item: HTMLElement, focus = false): void {
  if (!record.items.includes(item) || disabled(item)) return;
  record.active = item;
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

function setExpanded(record: TreeRecord, item: HTMLElement, next: boolean): HTMLElement {
  const group = directGroup(item);
  if (!group || disabled(item) || expanded(item) === next) return record.root;
  if (
    !emit(
      record,
      next ? "before-expand" : "before-collapse",
      item,
      record.selected.has(itemValue(item)),
      true,
    )
  ) {
    return record.root;
  }
  item.dataset.expanded = String(next);
  item.setAttribute("aria-expanded", String(next));
  group.hidden = !next;
  const toggle = directRow(item).querySelector<HTMLElement>('[data-part="toggle"]');
  if (toggle) toggle.dataset.state = next ? "open" : "closed";
  if (!next && record.active && group.contains(record.active)) setActive(record, item, true);
  emit(record, next ? "expand" : "collapse", item, record.selected.has(itemValue(item)));
  return record.root;
}

function setSelected(record: TreeRecord, item: HTMLElement, next: boolean): HTMLElement {
  if (record.selection === "none" || disabled(item)) return record.root;
  const value = itemValue(item);
  const current = record.selected.has(value);
  if (current === next || !emit(record, "before-select", item, next, true)) return record.root;
  if (record.selection === "single") record.selected.clear();
  if (next) record.selected.add(value);
  else record.selected.delete(value);
  syncSelection(record);
  emit(record, "select", item, next);
  return record.root;
}

function selectAll(record: TreeRecord): void {
  if (record.selection !== "multiple") return;
  const visible = visibleItems(record).filter((item) => !disabled(item));
  const allSelected = visible.every((item) => record.selected.has(itemValue(item)));
  if (record.active && !emit(record, "before-select", record.active, !allSelected, true)) {
    return;
  }
  for (const item of visible) {
    const value = itemValue(item);
    if (allSelected) record.selected.delete(value);
    else record.selected.add(value);
  }
  syncSelection(record);
  if (record.active) emit(record, "select", record.active, !allSelected);
}

function moveFocus(record: TreeRecord, item: HTMLElement, offset: number, extend = false): void {
  const visible = visibleItems(record).filter((candidate) => !disabled(candidate));
  const index = visible.indexOf(item);
  const next = visible[Math.max(0, Math.min(visible.length - 1, index + offset))];
  if (!next || next === item) return;
  setActive(record, next, true);
  if (extend && record.selection === "multiple") {
    setSelected(record, next, !record.selected.has(itemValue(next)));
  }
}

function focusEdge(record: TreeRecord, last: boolean): void {
  const visible = visibleItems(record).filter((item) => !disabled(item));
  const item = last ? visible.at(-1) : visible[0];
  if (item) setActive(record, item, true);
}

function clearSearch(record: TreeRecord): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.search = "";
  record.searchTimer = undefined;
}

function typeahead(record: TreeRecord, item: HTMLElement, key: string): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.search += key.toLocaleLowerCase();
  record.searchTimer = window.setTimeout(() => clearSearch(record), 500);
  const visible = visibleItems(record).filter((candidate) => !disabled(candidate));
  const current = visible.indexOf(item);
  const ordered = [...visible.slice(current + 1), ...visible.slice(0, current + 1)];
  const match = ordered.find((candidate) =>
    directLabel(candidate).textContent?.trim().toLocaleLowerCase().startsWith(record.search),
  );
  if (match) setActive(record, match, true);
}

function itemKeydown(record: TreeRecord, item: HTMLElement, event: KeyboardEvent): void {
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveFocus(record, item, event.key === "ArrowDown" ? 1 : -1, event.shiftKey);
  } else if (event.key === "ArrowRight") {
    event.preventDefault();
    const group = directGroup(item);
    if (group && !expanded(item)) setExpanded(record, item, true);
    else {
      const child = group?.querySelector<HTMLElement>(':scope > [data-part="item"]');
      if (child && !disabled(child)) setActive(record, child, true);
    }
  } else if (event.key === "ArrowLeft") {
    event.preventDefault();
    if (directGroup(item) && expanded(item)) setExpanded(record, item, false);
    else {
      const parent = parentItem(item, record.root);
      if (parent) setActive(record, parent, true);
    }
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    focusEdge(record, event.key === "End");
  } else if (event.key === "*") {
    event.preventDefault();
    for (const sibling of siblingItems(item)) {
      if (directGroup(sibling)) setExpanded(record, sibling, true);
    }
  } else if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "a") {
    event.preventDefault();
    selectAll(record);
  } else if (event.key === " ") {
    event.preventDefault();
    setSelected(record, item, !record.selected.has(itemValue(item)));
  } else if (event.key === "Enter") {
    event.preventDefault();
    emit(record, "activate", item, record.selected.has(itemValue(item)));
  } else if (event.key.length === 1 && /\S/.test(event.key)) {
    typeahead(record, item, event.key);
  }
}

function wire(record: TreeRecord): () => void {
  const cleanups: Array<() => void> = [];
  for (const item of record.items) {
    const row = directRow(item);
    const click = (event: MouseEvent): void => {
      setActive(record, item, true);
      if (
        event.target instanceof Element &&
        event.target.closest('[data-part="toggle"]')?.closest('[data-part="item"]') === item
      ) {
        setExpanded(record, item, !expanded(item));
      } else {
        const next = record.selection === "multiple" ? !record.selected.has(itemValue(item)) : true;
        setSelected(record, item, next);
      }
    };
    const doubleClick = (): void => {
      emit(record, "activate", item, record.selected.has(itemValue(item)));
    };
    const focus = (): void => setActive(record, item);
    const keydown = (event: KeyboardEvent): void => {
      if (event.target === item) itemKeydown(record, item, event);
    };
    row.addEventListener("click", click);
    row.addEventListener("dblclick", doubleClick);
    item.addEventListener("focus", focus);
    item.addEventListener("keydown", keydown);
    cleanups.push(
      () => row.removeEventListener("click", click),
      () => row.removeEventListener("dblclick", doubleClick),
      () => item.removeEventListener("focus", focus),
      () => item.removeEventListener("keydown", keydown),
    );
  }
  return () => {
    clearSearch(record);
    cleanups.forEach((cleanup) => cleanup());
  };
}

function prepareItem(record: TreeRecord, item: HTMLElement, index: number): void {
  item.id ||= `${record.root.id}-item-${index + 1}`;
  const label = directLabel(item);
  label.id ||= `${item.id}-label`;
  item.setAttribute("role", "treeitem");
  item.setAttribute("aria-labelledby", label.id);
  if (disabled(item)) item.setAttribute("aria-disabled", "true");
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

function enhanceTreeRoot(root: HTMLElement): TreeRecord {
  root.id ||= `jqs-tree-${++treeId}`;
  root.setAttribute("role", "tree");
  const selection = selectionMode(root);
  if (selection === "multiple") root.setAttribute("aria-multiselectable", "true");
  else root.removeAttribute("aria-multiselectable");
  const items = treeItems(root);
  if (items.length === 0) throw new Error(`Tree #${root.id} needs data-part="item" descendants.`);

  const existing = records.get(root);
  existing?.cleanup();
  const patched = root.dataset.value;
  const authoredSelected = items
    .filter(
      (item) => item.dataset.selected === "true" || item.getAttribute("aria-selected") === "true",
    )
    .map(itemValue);
  const selected =
    patched !== undefined
      ? parseValue(root, selection)
      : (existing?.selected ?? new Set(authoredSelected));
  const activeValue = existing?.active ? itemValue(existing.active) : undefined;
  const record: TreeRecord = {
    active: undefined,
    cleanup: () => undefined,
    items,
    root,
    search: "",
    searchTimer: undefined,
    selected,
    selection,
  };
  records.set(root, record);
  for (const [index, item] of items.entries()) prepareItem(record, item, index);
  syncSelection(record);
  const visible = visibleItems(record).filter((item) => !disabled(item));
  const active =
    items.find((item) => itemValue(item) === activeValue && visible.includes(item)) ??
    visible.find((item) => record.selected.has(itemValue(item))) ??
    visible[0];
  if (active) setActive(record, active);
  record.cleanup = wire(record);
  return record;
}

function resolveTree(target: TreeTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? treeRoot(root.querySelector(target)) : treeRoot(target);
  if (resolved) return resolved;
  throw new Error(`Tree target did not match data-jqs="tree": ${String(target)}`);
}

function resolveItem(record: TreeRecord, value: string): HTMLElement {
  const item = record.items.find((candidate) => itemValue(candidate) === value);
  if (item) return item;
  throw new Error(`Tree #${record.root.id} has no item with value "${value}".`);
}

function controlledTree(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="tree"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveTree(target, context.root);
  const closest = context.element?.closest('[data-jqs="tree"]');
  return resolveTree(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="tree"]')));
  for (const element of elements) {
    const tree = treeRoot(element);
    if (tree) enhanceTreeRoot(tree);
  }
}

export function createTrees(registerAction: ActionRegistrar): TreeCollection {
  const api: StarTreeStatic = {
    select: (target, value, selected) => {
      const root = resolveTree(target);
      const record = records.get(root) ?? enhanceTreeRoot(root);
      const item = resolveItem(record, value);
      return setSelected(record, item, selected ?? !record.selected.has(value));
    },
    expand: (target, value) => {
      const root = resolveTree(target);
      const record = records.get(root) ?? enhanceTreeRoot(root);
      return setExpanded(record, resolveItem(record, value), true);
    },
    collapse: (target, value) => {
      const root = resolveTree(target);
      const record = records.get(root) ?? enhanceTreeRoot(root);
      return setExpanded(record, resolveItem(record, value), false);
    },
    toggle: (target, value) => {
      const root = resolveTree(target);
      const record = records.get(root) ?? enhanceTreeRoot(root);
      const item = resolveItem(record, value);
      return setExpanded(record, item, !expanded(item));
    },
    focus: (target, value) => {
      const root = resolveTree(target);
      const record = records.get(root) ?? enhanceTreeRoot(root);
      const item = resolveItem(record, value);
      let parent = parentItem(item, root);
      while (parent) {
        setExpanded(record, parent, true);
        parent = parentItem(parent, root);
      }
      if (!visibleItems(record).includes(item)) return root;
      setActive(record, item, true);
      return root;
    },
    value: (target) => {
      const root = resolveTree(target);
      const record = records.get(root) ?? enhanceTreeRoot(root);
      const values = orderedValues(record);
      return record.selection === "multiple" ? values : values[0];
    },
  };
  registerAction("ui.tree.select", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledTree(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    const selected = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof value !== "string") throw new Error("ui.tree.select needs an item value.");
    return api.select(target, value, typeof selected === "boolean" ? selected : undefined);
  });
  for (const operation of ["expand", "collapse", "toggle", "focus"] as const) {
    registerAction(`ui.tree.${operation}`, (context) => {
      const first = context.args?.[0];
      const explicit = typeof first === "string" && first.startsWith("#");
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

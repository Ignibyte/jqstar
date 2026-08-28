import { registerAction } from "../registry";
import type { StarContext, StarToolbarStatic, ToolbarTarget } from "../types";

type Orientation = "horizontal" | "vertical";

interface ToolbarRecord {
  active: HTMLElement | undefined;
  cleanup: () => void;
  items: HTMLElement[];
  root: HTMLElement;
}

interface ToolbarCollection {
  api: StarToolbarStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, ToolbarRecord>();
let toolbarId = 0;

function toolbarRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="toolbar"]') ? value : undefined;
}

function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}

function toolbarItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-part="item"]')).filter(
    (item) => item.closest('[data-jqs="toolbar"]') === root,
  );
}

function disabled(item: HTMLElement): boolean {
  return (
    item.hasAttribute("disabled") ||
    item.getAttribute("aria-disabled") === "true" ||
    item.dataset.disabled !== undefined
  );
}

function itemValue(item: HTMLElement, index: number): string {
  return (
    item.dataset.value?.trim() ||
    item.getAttribute("aria-label")?.trim() ||
    item.textContent?.trim() ||
    String(index)
  );
}

function valueIndex(record: ToolbarRecord, value: string): number {
  return record.items.findIndex((item, index) => itemValue(item, index) === value);
}

function availableItems(record: ToolbarRecord): HTMLElement[] {
  return record.items.filter((item) => !disabled(item));
}

function setActive(record: ToolbarRecord, item: HTMLElement, focus = false): HTMLElement {
  if (!record.items.includes(item) || disabled(item)) return record.root;
  record.active = item;
  for (const candidate of record.items) candidate.tabIndex = candidate === item ? 0 : -1;
  const value = itemValue(item, record.items.indexOf(item));
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  if (focus) item.focus();
  return record.root;
}

function move(record: ToolbarRecord, offset: number): HTMLElement {
  const items = availableItems(record);
  if (items.length === 0) return record.root;
  const current = record.active ? items.indexOf(record.active) : -1;
  let index = current + offset;
  if (record.root.dataset.loop === "false") {
    index = Math.max(0, Math.min(items.length - 1, index));
  } else {
    index = (index + items.length) % items.length;
  }
  return setActive(record, items[index]!, true);
}

function nativeArrowControl(element: EventTarget | null): boolean {
  if (!(element instanceof HTMLElement)) return false;
  if (element.dataset.toolbarNav === "roving") return false;
  if (element instanceof HTMLTextAreaElement || element instanceof HTMLSelectElement) return true;
  if (!(element instanceof HTMLInputElement)) return element.isContentEditable;
  return !["button", "checkbox", "radio", "reset", "submit"].includes(element.type);
}

function wire(record: ToolbarRecord): () => void {
  const focusin = (event: FocusEvent): void => {
    const item = record.items.find(
      (candidate) => candidate === event.target || candidate.contains(event.target as Node),
    );
    if (item) setActive(record, item);
  };
  const keydown = (event: KeyboardEvent): void => {
    const item = record.items.find(
      (candidate) => candidate === event.target || candidate.contains(event.target as Node),
    );
    if (!item || nativeArrowControl(event.target)) return;
    const vertical = orientation(record.root) === "vertical";
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    if (![previousKey, nextKey, "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    setActive(record, item);
    if (event.key === previousKey) move(record, -1);
    else if (event.key === nextKey) move(record, 1);
    else {
      const items = availableItems(record);
      const edge = event.key === "Home" ? items[0] : items.at(-1);
      if (edge) setActive(record, edge, true);
    }
  };
  record.root.addEventListener("focusin", focusin);
  record.root.addEventListener("keydown", keydown);
  return () => {
    record.root.removeEventListener("focusin", focusin);
    record.root.removeEventListener("keydown", keydown);
  };
}

function enhanceToolbar(root: HTMLElement): ToolbarRecord {
  root.id ||= `jqs-toolbar-${++toolbarId}`;
  root.setAttribute("role", "toolbar");
  root.setAttribute("aria-orientation", orientation(root));
  const items = toolbarItems(root);
  if (items.length === 0) throw new Error(`Toolbar #${root.id} needs data-part="item" controls.`);

  const existing = records.get(root);
  const activeValue =
    root.dataset.value ||
    (existing?.active ? itemValue(existing.active, existing.items.indexOf(existing.active)) : "");
  existing?.cleanup();
  const record: ToolbarRecord = { active: undefined, cleanup: () => undefined, items, root };
  records.set(root, record);
  const active =
    items.find((item, index) => itemValue(item, index) === activeValue && !disabled(item)) ??
    items.find((item) => item.tabIndex === 0 && !disabled(item)) ??
    items.find((item) => !disabled(item));
  if (active) setActive(record, active);
  for (const item of items) {
    if (item instanceof HTMLButtonElement && !item.hasAttribute("type")) item.type = "button";
    if (disabled(item)) item.tabIndex = -1;
  }
  record.cleanup = wire(record);
  return record;
}

function resolveToolbar(target: ToolbarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? toolbarRoot(root.querySelector(target)) : toolbarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Toolbar target did not match data-jqs="toolbar": ${String(target)}`);
}

function controlledToolbar(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="toolbar"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveToolbar(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="toolbar"]');
  return resolveToolbar(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceToolbars(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="toolbar"]')));
  for (const element of elements) {
    const toolbar = toolbarRoot(element);
    if (toolbar) enhanceToolbar(toolbar);
  }
}

export function createToolbars(): ToolbarCollection {
  const api: StarToolbarStatic = {
    focus: (target, value) => {
      const root = resolveToolbar(target);
      const record = records.get(root) ?? enhanceToolbar(root);
      const item = value === undefined ? record.active : record.items[valueIndex(record, value)];
      if (!item) throw new Error(`Toolbar #${root.id} has no item with value "${value}".`);
      return setActive(record, item, true);
    },
    next: (target) => {
      const root = resolveToolbar(target);
      return move(records.get(root) ?? enhanceToolbar(root), 1);
    },
    previous: (target) => {
      const root = resolveToolbar(target);
      return move(records.get(root) ?? enhanceToolbar(root), -1);
    },
    value: (target) => {
      const root = resolveToolbar(target);
      const record = records.get(root) ?? enhanceToolbar(root);
      return record.active
        ? itemValue(record.active, record.items.indexOf(record.active))
        : undefined;
    },
  };
  registerAction("ui.toolbar.focus", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledToolbar(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    return api.focus(target, typeof value === "string" ? value : undefined);
  });
  registerAction("ui.toolbar.next", (context) =>
    api.next(controlledToolbar(context, context.args?.[0])),
  );
  registerAction("ui.toolbar.previous", (context) =>
    api.previous(controlledToolbar(context, context.args?.[0])),
  );
  return { api, enhance: enhanceToolbars };
}

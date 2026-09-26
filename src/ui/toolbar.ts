import { isHTMLElement, isHTMLTag, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { StarContext, StarToolbarStatic, ToolbarTarget } from "../types";
import {
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

type Orientation = "horizontal" | "vertical";

interface ToolbarRecord extends UIResources {
  activeItem: HTMLElement | undefined;
  items: HTMLElement[];
}

interface ToolbarCollection {
  api: StarToolbarStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, ToolbarRecord>();
let toolbarId = 0;

function toolbarRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="toolbar"]') ? value : undefined;
}

function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}

function toolbarItems(root: HTMLElement): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('[data-part="item"]')).filter(
    (item) => isHTMLElement(item) && item.closest('[data-jqs="toolbar"]') === root,
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

function current(record: ToolbarRecord): boolean {
  const items = toolbarItems(record.root);
  return (
    uiCurrent(record) &&
    records.get(record.root) === record &&
    items.length === record.items.length &&
    items.every((item, index) => item === record.items[index])
  );
}

function recordFor(root: HTMLElement): ToolbarRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceToolbar(root);
}

function setActive(record: ToolbarRecord, item: HTMLElement, focus = false): HTMLElement {
  record.revision += 1;
  if (!current(record) || !record.items.includes(item) || disabled(item)) return record.root;
  record.activeItem = item;
  for (const candidate of record.items) candidate.tabIndex = candidate === item ? 0 : -1;
  const value = itemValue(item, record.items.indexOf(item));
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  if (focus) item.focus();
  return record.root;
}

function move(record: ToolbarRecord, offset: number): HTMLElement {
  const items = availableItems(record);
  if (items.length === 0) return record.root;
  const current = record.activeItem ? items.indexOf(record.activeItem) : -1;
  let index = current + offset;
  if (record.root.dataset.loop === "false") {
    index = Math.max(0, Math.min(items.length - 1, index));
  } else {
    index = (index + items.length) % items.length;
  }
  return setActive(record, items[index]!, true);
}

function nativeArrowControl(element: EventTarget | null): boolean {
  if (!isHTMLElement(element)) return false;
  if (element.dataset.toolbarNav === "roving") return false;
  if (isHTMLTag(element, "textarea") || isHTMLTag(element, "select")) return true;
  if (!isHTMLTag(element, "input")) return element.isContentEditable;
  return !["button", "checkbox", "radio", "reset", "submit"].includes(element.type);
}

function wire(record: ToolbarRecord): void {
  const focusin = (event: FocusEvent): void => {
    const item = record.items.find(
      (candidate) =>
        candidate === event.target || (isNode(event.target) && candidate.contains(event.target)),
    );
    if (item) setActive(record, item);
  };
  const keydown = (event: KeyboardEvent): void => {
    const item = record.items.find(
      (candidate) =>
        candidate === event.target || (isNode(event.target) && candidate.contains(event.target)),
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
  listenUI(record, () => current(record), record.root, "focusin", focusin as EventListener);
  listenUI(record, () => current(record), record.root, "keydown", keydown as EventListener);
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
    (existing?.activeItem
      ? itemValue(existing.activeItem, existing.items.indexOf(existing.activeItem))
      : "");
  const reusable = existing && current(existing);
  if (!reusable) existing?.cleanup();
  const replacement = records.get(root);
  if (!reusable && replacement) return replacement;
  const record: ToolbarRecord = reusable
    ? existing
    : { ...uiResources(root), activeItem: undefined, items };
  if (!reusable)
    record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const active =
      items.find((item, index) => itemValue(item, index) === activeValue && !disabled(item)) ??
      items.find((item) => item.tabIndex === 0 && !disabled(item)) ??
      items.find((item) => !disabled(item));
    if (active) setActive(record, active);
    for (const item of items) {
      if (isHTMLTag(item, "button") && !item.hasAttribute("type")) item.type = "button";
      if (disabled(item)) item.tabIndex = -1;
    }
    if (!reusable) wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function resolveToolbar(target: ToolbarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? toolbarRoot(root.querySelector(target)) : toolbarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Toolbar target did not match data-jqs="toolbar": ${String(target)}`);
}

function controlledToolbar(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveToolbar(target);
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveToolbar(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="toolbar"]');
  return resolveToolbar(isHTMLElement(closest) ? closest : String(target), context.root);
}

function enhanceToolbars(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="toolbar"]')) {
    const toolbar = toolbarRoot(element);
    if (toolbar) enhanceToolbar(toolbar);
  }
}

export function createToolbars(registerAction: ActionRegistrar): ToolbarCollection {
  const api: StarToolbarStatic = {
    focus: (target, value) => {
      const root = resolveToolbar(target);
      const record = recordFor(root);
      const item =
        value === undefined ? record.activeItem : record.items[valueIndex(record, value)];
      if (!item) throw new Error(`Toolbar #${root.id} has no item with value "${value}".`);
      return setActive(record, item, true);
    },
    next: (target) => {
      const root = resolveToolbar(target);
      return move(recordFor(root), 1);
    },
    previous: (target) => {
      const root = resolveToolbar(target);
      return move(recordFor(root), -1);
    },
    value: (target) => {
      const root = resolveToolbar(target);
      const record = recordFor(root);
      return record.activeItem
        ? itemValue(record.activeItem, record.items.indexOf(record.activeItem))
        : undefined;
    },
  };
  registerAction("ui.toolbar.focus", (context) => {
    const first = context.args?.[0];
    const explicit = (typeof first === "string" && first.startsWith("#")) || isHTMLElement(first);
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

import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type {
  ContextMenuTarget,
  MenuTarget,
  StarContext,
  StarContextMenuStatic,
  StarMenuStatic,
} from "../types";
import {
  documentRecordCleanup,
  documentRecords,
  hideFloating,
  listenToViewportChanges,
  positionFloating,
  positionFloatingAtPoint,
  prepareFloating,
  showFloating,
  usesNativePopover,
} from "./floating";

type MenuItemPart = "item" | "checkbox-item" | "radio-item";
type InitialFocus = "first" | "last";
type MenuKind = "context-menu" | "menu";

interface MenuPoint {
  x: number;
  y: number;
}

interface MenuRecord {
  cleanups: Array<() => void>;
  content: HTMLElement;
  kind: MenuKind;
  open: boolean;
  point: MenuPoint | undefined;
  root: HTMLElement;
  search: string;
  searchTimer: number | undefined;
  trigger: HTMLElement;
}

interface MenuEventDetail {
  content: HTMLElement;
  item?: HTMLElement;
  menu: HTMLElement;
  trigger: HTMLElement;
  value?: string;
}

interface MenuCollection {
  api: StarMenuStatic;
  contextApi: StarContextMenuStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, MenuRecord>();
const activeRecords = new Set<MenuRecord>();
let menuId = 0;

function menuRoot(value: Element | null, kind?: MenuKind): HTMLElement | undefined {
  if (!(value instanceof HTMLElement)) return undefined;
  const valueKind = value.dataset.jqs;
  if (valueKind !== "menu" && valueKind !== "context-menu") return undefined;
  return kind === undefined || valueKind === kind ? value : undefined;
}

function menuKind(root: HTMLElement): MenuKind {
  return root.dataset.jqs === "context-menu" ? "context-menu" : "menu";
}

function directPart(root: HTMLElement, part: "trigger" | "content"): HTMLElement {
  const element = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === part,
  );
  if (!element) throw new Error(`Menu #${root.id} needs a direct data-part="${part}" child.`);
  return element;
}

function itemPart(item: HTMLElement): MenuItemPart | undefined {
  const part = item.getAttribute("data-part");
  return part === "item" || part === "checkbox-item" || part === "radio-item" ? part : undefined;
}

function menuItems(record: MenuRecord): HTMLElement[] {
  return Array.from(
    record.content.querySelectorAll<HTMLElement>(
      '[data-part="item"], [data-part="checkbox-item"], [data-part="radio-item"]',
    ),
  ).filter((item) => item.closest('[data-jqs="menu"], [data-jqs="context-menu"]') === record.root);
}

function isDisabled(item: HTMLElement): boolean {
  return (
    item.hasAttribute("disabled") ||
    item.getAttribute("aria-disabled") === "true" ||
    item.dataset.disabled !== undefined
  );
}

function focusableItems(record: MenuRecord): HTMLElement[] {
  return menuItems(record).filter((item) => !item.hasAttribute("disabled"));
}

function itemValue(item: HTMLElement): string {
  return item.getAttribute("data-value")?.trim() || item.textContent?.trim() || "";
}

function emit(
  record: MenuRecord,
  name: "before-open" | "open" | "before-close" | "close" | "select",
  cancelable = false,
  item?: HTMLElement,
): boolean {
  const detail: MenuEventDetail = {
    content: record.content,
    menu: record.root,
    trigger: record.trigger,
    ...(item ? { item, value: itemValue(item) } : {}),
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:${record.kind}:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function clearSearch(record: MenuRecord): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.searchTimer = undefined;
  record.search = "";
}

function syncState(record: MenuRecord, open: boolean): void {
  record.open = open;
  if (open) {
    for (const other of [...activeRecords]) {
      if (other !== record) closeMenu(other.root, false);
    }
    activeRecords.delete(record);
    activeRecords.add(record);
  } else {
    activeRecords.delete(record);
    clearSearch(record);
  }
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  if (record.kind === "menu") record.trigger.setAttribute("aria-expanded", String(open));
  else record.trigger.removeAttribute("aria-expanded");
}

function focusItem(record: MenuRecord, which: InitialFocus): void {
  const items = focusableItems(record);
  const item = which === "last" ? items[items.length - 1] : items[0];
  (item ?? record.content).focus();
}

function positionMenu(record: MenuRecord): void {
  if (record.kind === "context-menu" && record.point) {
    positionFloatingAtPoint(record.content, record.point.x, record.point.y);
    return;
  }
  positionFloating(record.root, record.trigger, record.content, {
    align: "start",
    side: "bottom",
  });
}

function triggerPoint(record: MenuRecord): MenuPoint {
  const rect = record.trigger.getBoundingClientRect();
  return { x: rect.left, y: rect.bottom };
}

function openMenu(
  root: HTMLElement,
  initialFocus: InitialFocus = "first",
  point?: MenuPoint,
): HTMLElement {
  const record = records.get(root) ?? enhanceMenu(root);
  if (record.kind === "context-menu") record.point = point ?? triggerPoint(record);
  if (record.open) {
    positionMenu(record);
    focusItem(record, initialFocus);
    return root;
  }
  if (!emit(record, "before-open", true)) return root;
  record.root.dataset.state = "opening";
  record.content.dataset.state = "opening";
  showFloating(record.content);
  syncState(record, true);
  positionMenu(record);
  focusItem(record, initialFocus);
  emit(record, "open");
  return root;
}

function closeMenu(root: HTMLElement, restoreFocus = true): HTMLElement {
  const record = records.get(root) ?? enhanceMenu(root);
  if (!record.open || !emit(record, "before-close", true)) return root;
  record.root.dataset.state = "closing";
  record.content.dataset.state = "closing";
  hideFloating(record.content);
  syncState(record, false);
  if (restoreFocus && record.trigger.isConnected) record.trigger.focus();
  record.point = undefined;
  emit(record, "close");
  return root;
}

function toggleMenu(root: HTMLElement): HTMLElement {
  return (records.get(root) ?? enhanceMenu(root)).open ? closeMenu(root) : openMenu(root);
}

function setChecked(item: HTMLElement, checked: boolean): void {
  item.dataset.checked = String(checked);
  item.dataset.state = checked ? "checked" : "unchecked";
  item.setAttribute("aria-checked", String(checked));
}

function updateCheckedItem(record: MenuRecord, item: HTMLElement): void {
  const part = itemPart(item);
  if (part === "checkbox-item") {
    setChecked(item, item.getAttribute("aria-checked") !== "true");
  } else if (part === "radio-item") {
    const group = item.closest('[data-part="radio-group"]') ?? record.content;
    for (const candidate of group.querySelectorAll<HTMLElement>('[data-part="radio-item"]')) {
      if (candidate.closest('[data-jqs="menu"], [data-jqs="context-menu"]') === record.root) {
        setChecked(candidate, candidate === item);
      }
    }
  }
}

function activateItem(record: MenuRecord, item: HTMLElement, event: MouseEvent): void {
  if (isDisabled(item)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  if (!emit(record, "select", true, item)) {
    event.preventDefault();
    event.stopImmediatePropagation();
    return;
  }
  updateCheckedItem(record, item);
  if (item.getAttribute("data-close-on-select") !== "false") closeMenu(record.root);
}

function moveFocus(record: MenuRecord, item: HTMLElement, offset: number): void {
  const items = focusableItems(record);
  const current = items.indexOf(item);
  if (current < 0 || items.length === 0) return;
  items[(current + offset + items.length) % items.length]?.focus();
}

function typeahead(record: MenuRecord, item: HTMLElement, key: string): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.search += key.toLocaleLowerCase();
  record.searchTimer = window.setTimeout(() => clearSearch(record), 500);
  const items = focusableItems(record);
  const current = items.indexOf(item);
  const ordered = [...items.slice(current + 1), ...items.slice(0, current + 1)];
  ordered
    .find((candidate) =>
      candidate.textContent?.trim().toLocaleLowerCase().startsWith(record.search),
    )
    ?.focus();
}

function contentKeydown(record: MenuRecord, event: KeyboardEvent): void {
  const item =
    event.target instanceof HTMLElement
      ? event.target.closest<HTMLElement>(
          '[data-part="item"], [data-part="checkbox-item"], [data-part="radio-item"]',
        )
      : null;
  if (event.key === "Escape") {
    event.preventDefault();
    closeMenu(record.root);
    return;
  }
  if (event.key === "Tab") {
    closeMenu(record.root, false);
    return;
  }
  if (!item || !itemPart(item)) return;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    moveFocus(record, item, event.key === "ArrowDown" ? 1 : -1);
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    focusItem(record, event.key === "Home" ? "first" : "last");
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    item.click();
  } else if (event.key.length === 1 && /\S/.test(event.key)) {
    typeahead(record, item, event.key);
  }
}

function hasClickAction(trigger: HTMLElement): boolean {
  return Array.from(trigger.attributes).some((attribute) => attribute.name === "data-on:click");
}

function wire(record: MenuRecord): void {
  const triggerClick = (): void => {
    toggleMenu(record.root);
  };
  const triggerKeydown = (event: KeyboardEvent): void => {
    if (
      record.trigger.closest<HTMLElement>('[data-jqs="menubar"]')?.dataset.orientation ===
      "vertical"
    ) {
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    event.preventDefault();
    openMenu(record.root, event.key === "ArrowUp" ? "last" : "first");
  };
  if (record.kind === "context-menu") {
    const contextmenu = (event: MouseEvent): void => {
      event.preventDefault();
      openMenu(record.root, "first", { x: event.clientX, y: event.clientY });
    };
    const contextKeydown = (event: KeyboardEvent): void => {
      if (event.key !== "ContextMenu" && !(event.shiftKey && event.key === "F10")) return;
      event.preventDefault();
      openMenu(record.root, "first", triggerPoint(record));
    };
    let longPressTimer: number | undefined;
    const clearLongPress = (): void => {
      if (longPressTimer !== undefined) window.clearTimeout(longPressTimer);
      longPressTimer = undefined;
    };
    const pointerdown = (event: PointerEvent): void => {
      if (event.pointerType !== "touch") return;
      clearLongPress();
      longPressTimer = window.setTimeout(() => {
        longPressTimer = undefined;
        openMenu(record.root, "first", { x: event.clientX, y: event.clientY });
      }, 550);
    };
    record.trigger.addEventListener("contextmenu", contextmenu);
    record.trigger.addEventListener("keydown", contextKeydown);
    record.trigger.addEventListener("pointerdown", pointerdown);
    record.trigger.addEventListener("pointermove", clearLongPress);
    record.trigger.addEventListener("pointerup", clearLongPress);
    record.trigger.addEventListener("pointercancel", clearLongPress);
    record.cleanups.push(
      () => record.trigger.removeEventListener("contextmenu", contextmenu),
      () => record.trigger.removeEventListener("keydown", contextKeydown),
      () => record.trigger.removeEventListener("pointerdown", pointerdown),
      () => record.trigger.removeEventListener("pointermove", clearLongPress),
      () => record.trigger.removeEventListener("pointerup", clearLongPress),
      () => record.trigger.removeEventListener("pointercancel", clearLongPress),
      clearLongPress,
    );
  } else {
    if (!hasClickAction(record.trigger)) {
      record.trigger.addEventListener("click", triggerClick);
      record.cleanups.push(() => record.trigger.removeEventListener("click", triggerClick));
    }
    record.trigger.addEventListener("keydown", triggerKeydown);
    record.cleanups.push(() => record.trigger.removeEventListener("keydown", triggerKeydown));
  }

  const keydown = (event: KeyboardEvent): void => contentKeydown(record, event);
  record.content.addEventListener("keydown", keydown);
  record.cleanups.push(() => record.content.removeEventListener("keydown", keydown));

  for (const item of menuItems(record)) {
    const click = (event: MouseEvent): void => activateItem(record, item, event);
    const pointerMove = (): void => {
      if (!item.hasAttribute("disabled")) item.focus();
    };
    item.addEventListener("click", click);
    item.addEventListener("pointermove", pointerMove);
    record.cleanups.push(
      () => item.removeEventListener("click", click),
      () => item.removeEventListener("pointermove", pointerMove),
    );
  }
}

function installGlobalListeners(host: DocumentHost): void {
  const { document } = host;
  host.listen(
    document,
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) return;
      for (const record of documentRecords(activeRecords, document)) {
        if (!record.root.isConnected) activeRecords.delete(record);
        else if (!record.root.contains(event.target)) closeMenu(record.root, false);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (record.root.isConnected) {
        positionMenu(record);
      } else {
        activeRecords.delete(record);
      }
    }
  };
  listenToViewportChanges(host, reposition);
  host.own("service", "ui:menu:active-records", documentRecordCleanup(activeRecords, document));
}

function prepareItems(record: MenuRecord): void {
  for (const item of menuItems(record)) {
    const part = itemPart(item)!;
    item.setAttribute(
      "role",
      part === "checkbox-item"
        ? "menuitemcheckbox"
        : part === "radio-item"
          ? "menuitemradio"
          : "menuitem",
    );
    item.tabIndex = -1;
    if (item.hasAttribute("disabled") || item.dataset.disabled !== undefined) {
      item.setAttribute("aria-disabled", "true");
    }
    if (part !== "item") {
      const checked =
        item.getAttribute("aria-checked") === "true" || item.dataset.checked === "true";
      setChecked(item, checked);
    }
  }
  for (const separator of record.content.querySelectorAll<HTMLElement>('[data-part="separator"]')) {
    separator.setAttribute("role", "separator");
  }
  for (const group of record.content.querySelectorAll<HTMLElement>('[data-part="radio-group"]')) {
    group.setAttribute("role", "group");
  }
}

function enhanceMenu(root: HTMLElement): MenuRecord {
  const kind = menuKind(root);
  root.id ||= `jqs-${kind}-${++menuId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  trigger.id ||= `${root.id}-trigger`;
  content.id ||= `${root.id}-content`;
  prepareFloating(content);
  content.setAttribute("role", "menu");
  content.tabIndex = -1;
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-controls", content.id);
  if (!content.hasAttribute("aria-label") && !content.hasAttribute("aria-labelledby")) {
    content.setAttribute("aria-labelledby", trigger.id);
  }

  let record = records.get(root);
  if (!record) {
    record = {
      cleanups: [],
      content,
      kind,
      open: false,
      point: undefined,
      root,
      search: "",
      searchTimer: undefined,
      trigger,
    };
    records.set(root, record);
    if (!usesNativePopover(content)) content.hidden = true;
  } else {
    const contentChanged = record.content !== content;
    if (contentChanged && record.open) hideFloating(record.content);
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.kind = kind;
    record.trigger = trigger;
    record.content = content;
    if (!usesNativePopover(content)) content.hidden = !record.open;
    if (contentChanged && record.open) showFloating(content);
  }

  prepareItems(record);
  syncState(record, record.open);
  wire(record);
  if (record.open) {
    positionMenu(record);
    if (!record.content.contains(root.ownerDocument.activeElement)) focusItem(record, "first");
  }
  return record;
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(
    ...Array.from(root.querySelectorAll('[data-jqs="menu"], [data-jqs="context-menu"]')),
  );
  for (const element of elements) {
    const menu = menuRoot(element);
    if (menu) enhanceMenu(menu);
  }
}

function resolveRoot(
  target: MenuTarget | ContextMenuTarget,
  root: ParentNode = document,
  kind: MenuKind = "menu",
): HTMLElement {
  const resolved =
    typeof target === "string"
      ? menuRoot(root.querySelector(target), kind)
      : menuRoot(target, kind);
  if (resolved) return resolved;
  throw new Error(
    `${kind === "menu" ? "Menu" : "Context Menu"} target did not match a data-jqs="${kind}" element: ${String(target)}`,
  );
}

function controlledMenu(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="menu"]')) return target;
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
  }
  const root = context.element?.closest('[data-jqs="menu"]') ?? null;
  const resolved = menuRoot(root);
  if (resolved) return resolved;
  throw new Error('Menu action needs a root selector or an element inside data-jqs="menu".');
}

function registerActions(api: StarMenuStatic, registerAction: ActionRegistrar): void {
  for (const operation of ["open", "close", "toggle"] as const) {
    registerAction(`ui.menu.${operation}`, (context) => {
      const root = controlledMenu(context, context.args?.[0]);
      return api[operation](root);
    });
  }
}

function controlledContextMenu(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="context-menu"]')) {
    return target;
  }
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target, document, "context-menu");
  }
  const root = context.element?.closest('[data-jqs="context-menu"]') ?? null;
  const resolved = menuRoot(root, "context-menu");
  if (resolved) return resolved;
  throw new Error(
    'Context Menu action needs a root selector or an element inside data-jqs="context-menu".',
  );
}

function registerContextActions(api: StarContextMenuStatic, registerAction: ActionRegistrar): void {
  registerAction("ui.context-menu.open", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledContextMenu(context, explicit ? first : undefined);
    const x = Number(explicit ? context.args?.[1] : first);
    const y = Number(explicit ? context.args?.[2] : context.args?.[1]);
    return Number.isFinite(x) && Number.isFinite(y) ? api.open(target, x, y) : api.open(target);
  });
  registerAction("ui.context-menu.close", (context) =>
    api.close(controlledContextMenu(context, context.args?.[0])),
  );
}

export function createMenus(host: DocumentHost, registerAction: ActionRegistrar): MenuCollection {
  installGlobalListeners(host);
  const api: StarMenuStatic = {
    open: (target) => openMenu(resolveRoot(target)),
    close: (target) => closeMenu(resolveRoot(target)),
    toggle: (target) => toggleMenu(resolveRoot(target)),
  };
  const contextApi: StarContextMenuStatic = {
    open: (target, x, y) =>
      openMenu(
        resolveRoot(target, document, "context-menu"),
        "first",
        x === undefined || y === undefined ? undefined : { x, y },
      ),
    close: (target) => closeMenu(resolveRoot(target, document, "context-menu")),
  };
  registerActions(api, registerAction);
  registerContextActions(contextApi, registerAction);
  return { api, contextApi, enhance: enhanceTree };
}

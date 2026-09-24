import { isElementNode, isHTMLElement, isNode } from "../dom";
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
  afterFloating,
  callFloating,
  claimFloatingContent,
  copyGeneratedAttributes,
  currentFloatingOwner,
  floatingBusy,
  floatingOpen,
  identifyLabel,
  listenToViewportChanges,
  positionFloating,
  positionFloatingAtPoint,
  prepareFloating,
  reconcileFloating,
  syncGeneratedAttribute,
  usesNativePopover,
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

type MenuItemPart = "item" | "checkbox-item" | "radio-item";
type InitialFocus = "first" | "last";
type MenuKind = "context-menu" | "menu";
interface MenuPoint {
  x: number;
  y: number;
}
interface MenuPending {
  deadline: number;
  cancel: () => void;
}
interface MenuRecord extends UIResources {
  content: HTMLElement;
  trigger: HTMLElement;
  kind: MenuKind;
  items: HTMLElement[];
  clickAction: boolean;
  open: boolean;
  nativeDepth: number;
  focused: HTMLElement | undefined;
  point: MenuPoint | undefined;
  search: string;
  searchPending: MenuPending | undefined;
  pressPending: MenuPending | undefined;
  pressPoint: MenuPoint | undefined;
}
interface MenuSnapshot {
  kind: MenuKind;
  document: Document;
  content: HTMLElement;
  trigger: HTMLElement;
  open: boolean;
  focused: HTMLElement | undefined;
  point: MenuPoint | undefined;
  search: string;
  searchDeadline: number | undefined;
  pressPoint: MenuPoint | undefined;
  pressDeadline: number | undefined;
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
const retained = new WeakMap<HTMLElement, MenuSnapshot>();
const intents = new WeakMap<HTMLElement, number>();
let menuId = 0;

function menuRoot(value: Element | null, kind?: MenuKind): HTMLElement | undefined {
  if (!isHTMLElement(value) || !value.matches('[data-jqs="menu"], [data-jqs="context-menu"]'))
    return undefined;
  return kind === undefined || value.dataset.jqs === kind ? value : undefined;
}
function part(root: HTMLElement, name: "trigger" | "content"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === name,
  );
}
function directPart(root: HTMLElement, name: "trigger" | "content"): HTMLElement {
  const element = part(root, name);
  if (!element) throw new Error(`Menu #${root.id} needs a direct data-part="${name}" child.`);
  return element;
}
function owned(record: Pick<MenuRecord, "root">, element: Element): boolean {
  return element.closest('[data-jqs]:not(button[data-jqs="button"])') === record.root;
}
function itemPart(item: HTMLElement): MenuItemPart | undefined {
  const value = item.dataset.part;
  return value === "item" || value === "checkbox-item" || value === "radio-item"
    ? value
    : undefined;
}
function menuItems(record: Pick<MenuRecord, "root" | "content">): HTMLElement[] {
  return Array.from(
    record.content.querySelectorAll<HTMLElement>(
      '[data-part="item"], [data-part="checkbox-item"], [data-part="radio-item"]',
    ),
  ).filter((item) => isHTMLElement(item) && owned(record, item));
}
function current(record: MenuRecord, revision = record.revision): boolean {
  if (
    !uiCurrent(record, revision) ||
    records.get(record.root) !== record ||
    !menuRoot(record.root, record.kind) ||
    part(record.root, "trigger") !== record.trigger ||
    part(record.root, "content") !== record.content ||
    record.trigger.hasAttribute("data-on:click") !== record.clickAction
  )
    return false;
  const items = menuItems(record);
  return (
    items.length === record.items.length &&
    items.every((item, index) => item === record.items[index])
  );
}
function currentState(record: MenuRecord, revision: number, open: boolean): boolean {
  return current(record, revision) && record.open === open;
}
function disabled(element: HTMLElement): boolean {
  return (
    element.hasAttribute("disabled") ||
    element.matches(":disabled") ||
    element.getAttribute("aria-disabled") === "true" ||
    (element.dataset.disabled !== undefined && element.dataset.disabled !== "false") ||
    !!element.closest("[inert]")
  );
}
function unavailable(record: MenuRecord): boolean {
  return unavailableTarget(record.root) || disabled(record.trigger);
}
function unavailableTarget(element: Element): boolean {
  return !!element.closest(
    ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]',
  );
}
function focusableItems(record: MenuRecord): HTMLElement[] {
  return menuItems(record).filter(
    (item) =>
      !item.hasAttribute("disabled") && !item.matches(":disabled") && !item.closest("[inert]"),
  );
}
function intent(root: HTMLElement): number {
  const next = (intents.get(root) ?? 0) + 1;
  intents.set(root, next);
  return next;
}
function snapshot(record: MenuRecord): MenuSnapshot {
  const active = record.document.activeElement;
  return {
    kind: record.kind,
    document: record.document,
    content: record.content,
    trigger: record.trigger,
    open: record.open,
    focused: isHTMLElement(active) && record.content.contains(active) ? active : record.focused,
    point: record.point,
    search: record.search,
    searchDeadline: record.searchPending?.deadline,
    pressPoint: record.pressPoint,
    pressDeadline: record.pressPending?.deadline,
  };
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
    ...(item
      ? { item, value: item.getAttribute("data-value")?.trim() || item.textContent?.trim() || "" }
      : {}),
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:${record.kind}:${name}`,
      { bubbles: true, cancelable, detail },
    ),
  );
}
function syncState(record: MenuRecord, open: boolean): void {
  record.open = open;
  activeRecords.delete(record);
  if (open) activeRecords.add(record);
  else record.focused = undefined;
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  if (record.kind === "menu") record.trigger.setAttribute("aria-expanded", String(open));
  else record.trigger.removeAttribute("aria-expanded");
}
function timer(
  record: MenuRecord,
  field: "searchPending" | "pressPending",
  deadline: number,
  run: () => void,
): void {
  const revision = record.revision;
  record[field]?.cancel();
  if (!current(record, revision)) return;
  let handle: number | undefined;
  let active = true;
  const pending: MenuPending = { deadline, cancel };
  function cancel(): void {
    active = false;
    if (record[field] === pending) record[field] = undefined;
    record.cleanups.delete(cancel);
    const acquired = handle;
    handle = undefined;
    if (acquired !== undefined) record.window.clearTimeout(acquired);
  }
  const valid = (): boolean => active && current(record) && record[field] === pending;
  record[field] = pending;
  acquireUIResource(
    record,
    valid,
    () => {
      handle = record.window.setTimeout(
        () => {
          const accepted = valid();
          const revision = record.revision;
          cancel();
          if (accepted && current(record, revision)) run();
        },
        Math.max(0, deadline - Date.now()),
      );
    },
    cancel,
  );
}
function clearSearch(record: MenuRecord): void {
  record.search = "";
  record.searchPending?.cancel();
}
function clearPress(record: MenuRecord): void {
  record.pressPoint = undefined;
  record.pressPending?.cancel();
}
function focusItem(record: MenuRecord, which: InitialFocus, revision: number): void {
  if (!currentState(record, revision, true) || unavailable(record)) return;
  const items = focusableItems(record);
  const item = which === "last" ? items.at(-1) : items[0];
  (item ?? record.content).focus();
}
function positionMenu(record: MenuRecord, revision = record.revision): void {
  const valid = (): boolean => currentState(record, revision, true) && !unavailable(record);
  if (!valid()) return;
  if (record.kind === "context-menu" && record.point)
    positionFloatingAtPoint(record.content, record.point.x, record.point.y, 8, valid);
  else
    positionFloating(
      record.root,
      record.trigger,
      record.content,
      { align: "start", side: "bottom" },
      valid,
    );
}
function show(record: MenuRecord, revision: number): boolean {
  if (!current(record, revision) || unavailable(record)) return false;
  syncState(record, true);
  record.root.dataset.state = record.content.dataset.state = "opening";
  record.nativeDepth++;
  try {
    callFloating(record.content, true);
  } catch (error) {
    if (current(record, revision)) {
      syncState(record, false);
      callFloating(record.content, false);
    }
    throw error;
  } finally {
    record.nativeDepth--;
  }
  if (!currentState(record, revision, true)) {
    reconcileFloating(record.content, true);
    return false;
  }
  if (floatingBusy(record.content)) return true;
  if (unavailable(record) || floatingOpen(record.content) === false) {
    syncState(record, false);
    callFloating(record.content, false);
    reconcileFloating(record.content, false);
    return false;
  }
  syncState(record, true);
  return true;
}
function openRecord(
  record: MenuRecord,
  revision: number,
  initialFocus: InitialFocus,
  point?: MenuPoint,
): void {
  if (unavailable(record)) return;
  if (record.kind === "context-menu") {
    if (point) record.point = point;
    else {
      const rect = record.trigger.getBoundingClientRect();
      if (!current(record, revision)) return;
      record.point = { x: rect.left, y: rect.bottom };
    }
  }
  const notify = !record.open;
  if (notify) {
    if (!emit(record, "before-open", true) || !current(record, revision) || unavailable(record))
      return;
    for (const other of [...activeRecords]) {
      if (other !== record && other.document === record.document && current(other)) {
        operate(other.root, "close", "first", undefined, false);
        if (!current(record, revision) || unavailable(record) || (current(other) && other.open))
          return;
      }
    }
    if (!show(record, revision)) return;
  }
  afterFloating(record, revision, () => {
    positionMenu(record, revision);
    focusItem(record, initialFocus, revision);
    if (notify && currentState(record, revision, true) && !unavailable(record))
      emit(record, "open");
  });
}
function closeRecord(record: MenuRecord, revision: number, restoreFocus: boolean): void {
  if (!record.open || !emit(record, "before-close", true) || !current(record, revision)) return;
  clearSearch(record);
  if (!current(record, revision)) return;
  syncState(record, false);
  record.root.dataset.state = record.content.dataset.state = "closing";
  record.nativeDepth++;
  try {
    callFloating(record.content, false);
  } finally {
    record.nativeDepth--;
  }
  if (!currentState(record, revision, false)) {
    reconcileFloating(record.content, false);
    return;
  }
  afterFloating(record, revision, () => {
    if (floatingOpen(record.content) === true) {
      syncState(record, true);
      return;
    }
    syncState(record, false);
    record.point = undefined;
    if (restoreFocus && record.trigger.isConnected && !unavailable(record)) record.trigger.focus();
    if (currentState(record, revision, false)) emit(record, "close");
  });
}
function operate(
  root: HTMLElement,
  operation: "open" | "close" | "toggle",
  initialFocus: InitialFocus = "first",
  point?: MenuPoint,
  restoreFocus = true,
): HTMLElement {
  const requested = intent(root);
  const record = enhanceMenu(root, false);
  if (intents.get(root) !== requested || !current(record)) return root;
  const revision = ++record.revision;
  clearPress(record);
  if (!current(record, revision)) return root;
  if (!record.nativeDepth && !floatingBusy(record.content)) {
    const native = floatingOpen(record.content);
    if (native !== undefined) syncState(record, native);
  }
  if (operation === "close" || (operation === "toggle" && record.open))
    closeRecord(record, revision, restoreFocus);
  else openRecord(record, revision, initialFocus, point);
  return root;
}
function setChecked(item: HTMLElement, checked: boolean): void {
  item.dataset.checked = String(checked);
  item.dataset.state = checked ? "checked" : "unchecked";
  item.setAttribute("aria-checked", String(checked));
}
function group(record: MenuRecord, item: HTMLElement): Element {
  return item.closest('[data-part="radio-group"]') ?? record.content;
}
function activateItem(record: MenuRecord, item: HTMLElement, event: Event): void {
  if (event.defaultPrevented || !isElementNode(event.target) || !owned(record, event.target))
    return;
  const reject = (): void => {
    event.preventDefault();
    event.stopImmediatePropagation();
  };
  if (!record.open || unavailable(record) || disabled(item) || unavailableTarget(event.target)) {
    reject();
    return;
  }
  intent(record.root);
  const revision = ++record.revision;
  const kind = itemPart(item);
  const container = group(record, item);
  if (
    !emit(record, "select", true, item) ||
    !currentState(record, revision, true) ||
    unavailable(record) ||
    disabled(item) ||
    unavailableTarget(event.target) ||
    itemPart(item) !== kind ||
    group(record, item) !== container
  ) {
    reject();
    return;
  }
  if (kind === "checkbox-item") setChecked(item, item.getAttribute("aria-checked") !== "true");
  else if (kind === "radio-item")
    for (const candidate of menuItems(record)) {
      if (itemPart(candidate) === "radio-item" && group(record, candidate) === container)
        setChecked(candidate, candidate === item);
    }
  if (currentState(record, revision, true) && item.dataset.closeOnSelect !== "false")
    operate(record.root, "close");
}
function typeahead(record: MenuRecord, item: HTMLElement, key: string, revision: number): void {
  const search = record.search + key.toLocaleLowerCase();
  record.searchPending?.cancel();
  if (!currentState(record, revision, true)) return;
  record.search = search;
  timer(record, "searchPending", Date.now() + 500, () => {
    record.search = "";
  });
  if (!currentState(record, revision, true)) return;
  const items = focusableItems(record);
  const index = items.indexOf(item);
  [...items.slice(index + 1), ...items.slice(0, index + 1)]
    .find((candidate) => candidate.textContent?.trim().toLocaleLowerCase().startsWith(search))
    ?.focus();
}
function contentKeydown(record: MenuRecord, event: KeyboardEvent): void {
  if (
    event.defaultPrevented ||
    event.isComposing ||
    !isElementNode(event.target) ||
    !owned(record, event.target) ||
    !record.open ||
    unavailable(record)
  )
    return;
  if (event.key === "Escape") {
    event.preventDefault();
    operate(record.root, "close");
    return;
  }
  if (event.key === "Tab") {
    operate(record.root, "close", "first", undefined, false);
    return;
  }
  const item = event.target.closest<HTMLElement>(
    '[data-part="item"], [data-part="checkbox-item"], [data-part="radio-item"]',
  );
  if (!item || !record.items.includes(item)) return;
  intent(record.root);
  const revision = ++record.revision;
  if (event.key === "ArrowDown" || event.key === "ArrowUp") {
    event.preventDefault();
    const items = focusableItems(record);
    const index = items.indexOf(item);
    if (index >= 0)
      items[(index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length]?.focus();
  } else if (event.key === "Home" || event.key === "End") {
    event.preventDefault();
    focusItem(record, event.key === "Home" ? "first" : "last", revision);
  } else if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    item.click();
  } else if (
    event.key.length === 1 &&
    /\S/.test(event.key) &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.altKey
  )
    typeahead(record, item, event.key, revision);
}
function schedulePress(record: MenuRecord, point: MenuPoint, deadline = Date.now() + 550): void {
  const revision = record.revision;
  clearPress(record);
  if (!current(record, revision) || unavailable(record)) return;
  record.pressPoint = point;
  timer(record, "pressPending", deadline, () => {
    if (!unavailable(record)) operate(record.root, "open", "first", point);
  });
}
function wire(record: MenuRecord): void {
  const valid = (): boolean => current(record);
  const interaction = (event: Event): boolean =>
    !event.defaultPrevented &&
    isElementNode(event.target) &&
    owned(record, event.target) &&
    !unavailable(record) &&
    !unavailableTarget(event.target);
  if (record.kind === "menu") {
    if (!record.clickAction)
      listenUI(record, valid, record.trigger, "click", (event) => {
        if (interaction(event)) operate(record.root, "toggle");
      });
    listenUI(record, valid, record.trigger, "keydown", (event) => {
      const key = event as KeyboardEvent;
      if (
        !interaction(event) ||
        key.isComposing ||
        record.trigger.closest<HTMLElement>('[data-jqs="menubar"]')?.dataset.orientation ===
          "vertical" ||
        (key.key !== "ArrowDown" && key.key !== "ArrowUp")
      )
        return;
      event.preventDefault();
      operate(record.root, "open", key.key === "ArrowUp" ? "last" : "first");
    });
  } else {
    listenUI(record, valid, record.trigger, "contextmenu", (event) => {
      if (!interaction(event)) return;
      event.preventDefault();
      const pointer = event as MouseEvent;
      operate(record.root, "open", "first", { x: pointer.clientX, y: pointer.clientY });
    });
    listenUI(record, valid, record.trigger, "keydown", (event) => {
      const key = event as KeyboardEvent;
      if (
        !interaction(event) ||
        key.isComposing ||
        (key.key !== "ContextMenu" && !(key.shiftKey && key.key === "F10"))
      )
        return;
      event.preventDefault();
      operate(record.root, "open");
    });
    listenUI(record, valid, record.trigger, "pointerdown", (event) => {
      const pointer = event as PointerEvent;
      if (!interaction(event) || pointer.pointerType !== "touch") return;
      intent(record.root);
      record.revision++;
      schedulePress(record, { x: pointer.clientX, y: pointer.clientY });
    });
    for (const name of ["pointermove", "pointerup", "pointercancel"])
      listenUI(record, valid, record.trigger, name, () => clearPress(record));
  }
  listenUI(record, valid, record.content, "keydown", (event) =>
    contentKeydown(record, event as KeyboardEvent),
  );
  listenUI(record, valid, record.content, "focusin", (event) => {
    if (isHTMLElement(event.target) && owned(record, event.target)) record.focused = event.target;
  });
  listenUI(record, valid, record.content, "focusout", (event) => {
    if (!record.root.isConnected || (record.open && floatingOpen(record.content) === false)) return;
    const next = (event as FocusEvent).relatedTarget;
    if (!isNode(next) || !record.content.contains(next)) record.focused = undefined;
  });
  listenUI(record, valid, record.content, "toggle", (event) => {
    if (
      event.target !== record.content ||
      record.nativeDepth ||
      floatingBusy(record.content) ||
      !record.root.isConnected
    )
      return;
    const open = floatingOpen(record.content);
    if (open === undefined || open === record.open) return;
    intent(record.root);
    const revision = ++record.revision;
    clearPress(record);
    if (!open) clearSearch(record);
    if (current(record, revision)) syncState(record, open);
  });
  for (const item of record.items) {
    listenUI(record, valid, item, "click", (event) => activateItem(record, item, event));
    listenUI(record, valid, item, "pointermove", (event) => {
      if (
        event.defaultPrevented ||
        !isElementNode(event.target) ||
        !owned(record, event.target) ||
        !record.open ||
        unavailable(record) ||
        !focusableItems(record).includes(item)
      )
        return;
      intent(record.root);
      record.revision++;
      item.focus();
    });
  }
}
function metadata(record: MenuRecord): void {
  const { root, trigger, content } = record;
  trigger.id ||= `${root.id}-trigger`;
  content.id ||= `${root.id}-content`;
  prepareFloating(content);
  content.setAttribute("role", "menu");
  content.tabIndex = -1;
  trigger.setAttribute("aria-haspopup", "menu");
  trigger.setAttribute("aria-controls", content.id);
  identifyLabel(content, trigger.id);
  for (const item of record.items) {
    const part = itemPart(item);
    item.setAttribute(
      "role",
      part === "checkbox-item"
        ? "menuitemcheckbox"
        : part === "radio-item"
          ? "menuitemradio"
          : "menuitem",
    );
    item.tabIndex = -1;
    syncGeneratedAttribute(
      item,
      "aria-disabled",
      item.hasAttribute("disabled") ||
        (item.dataset.disabled !== undefined && item.dataset.disabled !== "false")
        ? "true"
        : undefined,
    );
    if (part === "checkbox-item" || part === "radio-item")
      setChecked(
        item,
        item.getAttribute("aria-checked") === "true" || item.dataset.checked === "true",
      );
  }
  for (const element of content.querySelectorAll<HTMLElement>(
    '[data-part="separator"], [data-part="radio-group"]',
  ))
    if (owned(record, element))
      element.setAttribute("role", element.dataset.part === "separator" ? "separator" : "group");
}
function restoreFocus(
  record: MenuRecord,
  revision: number,
  focused: HTMLElement | undefined,
): void {
  if (!focused || !currentState(record, revision, true) || unavailable(record)) return;
  if (
    record.content.contains(focused) &&
    (focused === record.content || focusableItems(record).includes(focused))
  )
    focused.focus();
  else focusItem(record, "first", revision);
}
function enhanceMenu(root: HTMLElement, refresh = true): MenuRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    metadata(existing);
    if (
      refresh &&
      !existing.nativeDepth &&
      !floatingBusy(existing.content) &&
      root.isConnected &&
      existing.open &&
      floatingOpen(existing.content) === false &&
      !unavailable(existing)
    ) {
      const focused = existing.focused;
      const revision = existing.revision;
      if (show(existing, revision))
        afterFloating(existing, revision, () => restoreFocus(existing, revision, focused));
    }
    if (refresh) positionMenu(existing);
    return existing;
  }
  const saved = existing ? snapshot(existing) : retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && !uiActive(root)) return existing;
  const kind: MenuKind = root.dataset.jqs === "context-menu" ? "context-menu" : "menu";
  root.id ||= `jqs-${kind}-${++menuId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  if (existing) copyGeneratedAttributes(existing.content, content);
  const restore =
    saved && saved.kind === kind && (existing || saved.document !== root.ownerDocument);
  const sameParts = restore && saved.content === content && saved.trigger === trigger;
  const record: MenuRecord = {
    ...uiResources(root),
    kind,
    trigger,
    content,
    items: menuItems({ root, content }),
    clickAction: trigger.hasAttribute("data-on:click"),
    open: false,
    nativeDepth: 0,
    focused: undefined,
    point: restore ? saved.point : undefined,
    search: sameParts ? saved.search : "",
    searchPending: undefined,
    pressPending: undefined,
    pressPoint: undefined,
  };
  let initialized = false;
  record.cleanups.add(() => {
    retained.set(root, snapshot(record));
    activeRecords.delete(record);
  });
  record.cleanups.add(() => {
    const wasOpen = record.open;
    record.open = false;
    if (!initialized && !wasOpen) return;
    const latest = records.get(root);
    const owner = currentFloatingOwner(content);
    if (!latest && owner?.root !== root) root.dataset.state = "closed";
    if ((!latest || latest.trigger !== trigger) && owner?.trigger !== trigger && kind === "menu")
      trigger.setAttribute("aria-expanded", "false");
    if ((!latest || latest.content !== content) && owner?.content !== content) {
      content.dataset.state = "closed";
      if (wasOpen) {
        callFloating(content, false);
        reconcileFloating(content, false);
      }
    }
  });
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    const revision = record.revision;
    claimFloatingContent(
      record,
      (revision) => current(record, revision),
      () => !unavailable(record),
      (open) => syncState(record, open),
    );
    if (!current(record)) return record;
    initialized = true;
    metadata(record);
    if (current(record, revision)) {
      syncState(record, false);
      if (!usesNativePopover(content)) content.hidden = true;
    }
    if (restore && saved.open && !unavailable(record) && show(record, revision))
      afterFloating(record, revision, () => {
        positionMenu(record, revision);
        restoreFocus(record, revision, saved.focused);
      });
    if (!current(record)) return record;
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    if (sameParts && current(record, revision)) {
      if (saved.searchDeadline !== undefined)
        timer(record, "searchPending", saved.searchDeadline, () => {
          record.search = "";
        });
      if (saved.pressPoint && saved.pressDeadline !== undefined && current(record, revision))
        schedulePress(record, saved.pressPoint, saved.pressDeadline);
    }
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function installGlobalListeners(host: DocumentHost): void {
  const ownedRecords = (): MenuRecord[] =>
    [...activeRecords].filter((record) => record.document === host.document && current(record));
  host.listen(
    host.document,
    "pointerdown",
    (event) => {
      if (event.defaultPrevented || !isNode(event.target)) return;
      for (const record of ownedRecords())
        if (current(record) && !record.root.contains(event.target))
          operate(record.root, "close", "first", undefined, false);
    },
    true,
  );
  listenToViewportChanges(host, () => {
    for (const record of ownedRecords()) positionMenu(record);
  });
}
function enhanceTree(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="menu"], [data-jqs="context-menu"]')) {
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
      ? menuRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
          kind,
        )
      : menuRoot(target, kind);
  if (resolved) return resolved;
  throw new Error(
    `${kind === "menu" ? "Menu" : "Context Menu"} target did not match a data-jqs="${kind}" element: ${String(target)}`,
  );
}
function controlledMenu(
  context: StarContext,
  target?: unknown,
  kind: MenuKind = "menu",
): HTMLElement {
  if (isHTMLElement(target)) return resolveRoot(target, context.root, kind);
  if (typeof target === "string") return resolveRoot(target, context.root, kind);
  const resolved =
    menuRoot(context.element?.closest(`[data-jqs="${kind}"]`) ?? null, kind) ??
    (isHTMLElement(context.root) ? menuRoot(context.root, kind) : undefined);
  if (resolved) return resolved;
  throw new Error(`${kind} action needs a root selector or an element inside data-jqs="${kind}".`);
}
export function createMenus(host: DocumentHost, registerAction: ActionRegistrar): MenuCollection {
  installGlobalListeners(host);
  const api: StarMenuStatic = {
    open: (target) => operate(resolveRoot(target), "open"),
    close: (target) => operate(resolveRoot(target), "close"),
    toggle: (target) => operate(resolveRoot(target), "toggle"),
  };
  const contextApi: StarContextMenuStatic = {
    open: (target, x, y) =>
      operate(
        resolveRoot(target, document, "context-menu"),
        "open",
        "first",
        x === undefined || y === undefined ? undefined : { x, y },
      ),
    close: (target) => operate(resolveRoot(target, document, "context-menu"), "close"),
  };
  for (const operation of ["open", "close", "toggle"] as const)
    registerAction(`ui.menu.${operation}`, (context) =>
      api[operation](controlledMenu(context, context.args?.[0])),
    );
  registerAction("ui.context-menu.open", (context) => {
    const first = context.args?.[0];
    const explicit =
      isHTMLElement(first) || (typeof first === "string" && !Number.isFinite(Number(first)));
    const target = controlledMenu(context, explicit ? first : undefined, "context-menu");
    const x = Number(explicit ? context.args?.[1] : first);
    const y = Number(explicit ? context.args?.[2] : context.args?.[1]);
    return Number.isFinite(x) && Number.isFinite(y)
      ? contextApi.open(target, x, y)
      : contextApi.open(target);
  });
  registerAction("ui.context-menu.close", (context) =>
    contextApi.close(controlledMenu(context, context.args?.[0], "context-menu")),
  );
  return { api, contextApi, enhance: enhanceTree };
}

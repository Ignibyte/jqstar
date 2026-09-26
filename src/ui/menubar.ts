import { isElementNode, isHTMLElement } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { MenubarTarget, StarContext, StarMenuStatic, StarMenubarStatic } from "../types";
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

interface MenubarRecord extends UIResources {
  activeIndex: number;
  focused: HTMLElement | undefined;
  menus: HTMLElement[];
  openIndex: number | undefined;
  search: string;
  pending: { deadline: number; cancel(): void } | undefined;
  triggers: HTMLElement[];
}
interface MenubarSnapshot {
  document: Document;
  menus: HTMLElement[];
  triggers: HTMLElement[];
  activeValue: string;
  focused: HTMLElement | undefined;
  search: string;
  deadline: number | undefined;
}
interface ChildMenus {
  api: StarMenuStatic;
  enhance(root: ParentNode): void;
}
interface MenubarCollection {
  api: StarMenubarStatic;
  enhance(root: ParentNode): void;
}
const records = new WeakMap<HTMLElement, MenubarRecord>();
const retained = new WeakMap<HTMLElement, MenubarSnapshot>();
const intents = new WeakMap<HTMLElement, number>();
let menubarId = 0;

function menubarRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="menubar"]') ? value : undefined;
}
function directMenus(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "menu",
  );
}
function triggerPart(menu: HTMLElement): HTMLElement | undefined {
  return Array.from(menu.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === "trigger",
  );
}
function current(record: MenubarRecord, revision = record.revision): boolean {
  if (
    !uiCurrent(record, revision) ||
    records.get(record.root) !== record ||
    !menubarRoot(record.root)
  )
    return false;
  const menus = directMenus(record.root);
  return (
    menus.length === record.menus.length &&
    menus.every(
      (menu, index) =>
        menu === record.menus[index] &&
        menu.matches('[data-jqs="menu"]') &&
        triggerPart(menu) === record.triggers[index],
    )
  );
}
function intent(root: HTMLElement): number {
  const next = (intents.get(root) ?? 0) + 1;
  intents.set(root, next);
  return next;
}
function begin(record: MenubarRecord): number {
  intent(record.root);
  return ++record.revision;
}
function menuValue(record: Pick<MenubarRecord, "menus" | "triggers">, index: number): string {
  return (
    record.menus[index]?.dataset.value?.trim() ||
    record.triggers[index]?.textContent?.trim() ||
    String(index)
  );
}
function unavailable(element: Element): boolean {
  return !!element.closest(
    ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]',
  );
}
function availableIndexes(record: MenubarRecord): number[] {
  return record.triggers.flatMap((trigger, index) => (unavailable(trigger) ? [] : [index]));
}
function setActive(
  record: MenubarRecord,
  index: number,
  focus = false,
  revision = record.revision,
): void {
  const trigger = record.triggers[index];
  if (!current(record, revision) || !trigger || unavailable(trigger)) return;
  record.activeIndex = index;
  for (const [candidate, trigger] of record.triggers.entries())
    trigger.tabIndex = candidate === index ? 0 : -1;
  if (focus) trigger.focus();
}
function move(record: MenubarRecord, offset: number, activeIndex = record.activeIndex): number {
  const indexes = availableIndexes(record);
  const index = indexes.indexOf(activeIndex);
  return indexes[(Math.max(index, 0) + offset + indexes.length) % indexes.length] ?? activeIndex;
}
function resolveIndex(record: MenubarRecord, value?: string): number {
  if (value === undefined) return record.activeIndex;
  const index = record.menus.findIndex((_, candidate) => menuValue(record, candidate) === value);
  if (index >= 0) return index;
  throw new Error(`Menubar #${record.root.id} has no menu with value "${value}".`);
}
function syncState(record: MenubarRecord): void {
  if (!current(record)) return;
  const open = record.menus.findIndex((menu) => menu.dataset.state === "open");
  record.openIndex = open < 0 ? undefined : open;
  record.root.dataset.state = open < 0 ? "closed" : "open";
  if (open < 0) delete record.root.dataset.value;
  else {
    const value = menuValue(record, open);
    if (record.root.dataset.value !== value) record.root.dataset.value = value;
  }
}
function closeAll(record: MenubarRecord, menuApi: StarMenuStatic, revision: number): void {
  for (const menu of record.menus) {
    if (!current(record, revision)) return;
    menuApi.close(menu);
  }
  if (current(record, revision)) syncState(record);
}
function openIndex(
  record: MenubarRecord,
  menuApi: StarMenuStatic,
  index: number,
  revision: number,
): void {
  const menu = record.menus[index];
  const trigger = record.triggers[index];
  if (!current(record, revision) || !menu || !trigger || unavailable(trigger)) return;
  setActive(record, index, false, revision);
  menuApi.open(menu);
  if (current(record, revision)) syncState(record);
}
function switchMenu(
  record: MenubarRecord,
  menuApi: StarMenuStatic,
  index: number,
  revision: number,
): void {
  const wasOpen = record.openIndex !== undefined;
  setActive(record, index, true, revision);
  if (wasOpen && current(record, revision)) openIndex(record, menuApi, index, revision);
}
function scheduleSearch(record: MenubarRecord, deadline: number): void {
  const revision = record.revision;
  record.pending?.cancel();
  if (!current(record, revision)) return;
  let handle: number | undefined;
  let active = true;
  const pending = { deadline, cancel };
  function cancel(): void {
    active = false;
    if (record.pending === pending) record.pending = undefined;
    record.cleanups.delete(cancel);
    const acquired = handle;
    handle = undefined;
    if (acquired !== undefined) record.window.clearTimeout(acquired);
  }
  const valid = (): boolean => active && current(record) && record.pending === pending;
  record.pending = pending;
  acquireUIResource(
    record,
    valid,
    () => {
      handle = record.window.setTimeout(
        () => {
          const accepted = valid();
          const revision = record.revision;
          cancel();
          if (accepted && current(record, revision)) record.search = "";
        },
        Math.max(0, deadline - Date.now()),
      );
    },
    cancel,
  );
}
function typeahead(record: MenubarRecord, key: string, revision: number): void {
  record.search += key.toLocaleLowerCase();
  scheduleSearch(record, Date.now() + 500);
  if (!current(record, revision)) return;
  const indexes = availableIndexes(record);
  const index = indexes.indexOf(record.activeIndex);
  const ordered = [...indexes.slice(index + 1), ...indexes.slice(0, index + 1)];
  const match = ordered.find((index) =>
    record.triggers[index]?.textContent?.trim().toLocaleLowerCase().startsWith(record.search),
  );
  if (match !== undefined) setActive(record, match, true, revision);
}
function ownedMenu(record: MenubarRecord, target: EventTarget | null): HTMLElement | undefined {
  if (!isElementNode(target)) return undefined;
  const owner = target.closest('[data-jqs]:not(button[data-jqs="button"])');
  return record.menus.find((menu) => menu === owner);
}
function wire(record: MenubarRecord, menuApi: StarMenuStatic): void {
  const valid = (): boolean => current(record);
  listenUI(record, valid, record.root, "keydown", (event) => {
    const keyboard = event as KeyboardEvent;
    const menu = ownedMenu(record, event.target);
    if (
      event.defaultPrevented ||
      keyboard.isComposing ||
      !menu ||
      !isElementNode(event.target) ||
      !!event.target.closest(":disabled,[disabled],[inert]")
    )
      return;
    const vertical = record.root.dataset.orientation === "vertical";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    const index = record.menus.indexOf(menu);
    const trigger = record.triggers[index];
    if (!trigger || unavailable(trigger)) return;
    const atTrigger = trigger.contains(event.target);
    if (atTrigger && unavailable(event.target)) return;
    if (keyboard.key === "Tab") {
      closeAll(record, menuApi, begin(record));
      return;
    }
    if (!atTrigger) {
      if (!vertical && (keyboard.key === "ArrowRight" || keyboard.key === "ArrowLeft")) {
        event.preventDefault();
        const revision = begin(record);
        openIndex(
          record,
          menuApi,
          move(record, keyboard.key === "ArrowRight" ? 1 : -1, index),
          revision,
        );
      }
      return;
    }
    const key = keyboard.key;
    if (
      ![nextKey, previousKey, "Home", "End", "Escape"].includes(key) &&
      !(vertical && (key === "ArrowLeft" || key === "ArrowRight")) &&
      !(
        key.length === 1 &&
        /\S/.test(key) &&
        !keyboard.ctrlKey &&
        !keyboard.metaKey &&
        !keyboard.altKey
      )
    )
      return;
    const revision = begin(record);
    setActive(record, index, false, revision);
    if (key === nextKey || key === previousKey) {
      event.preventDefault();
      switchMenu(record, menuApi, move(record, key === nextKey ? 1 : -1), revision);
    } else if (vertical && key === "ArrowRight") {
      event.preventDefault();
      openIndex(record, menuApi, index, revision);
    } else if ((vertical && key === "ArrowLeft") || key === "Escape") {
      event.preventDefault();
      closeAll(record, menuApi, revision);
      if (current(record, revision) && !unavailable(trigger)) trigger.focus();
    } else if (key === "Home" || key === "End") {
      event.preventDefault();
      const indexes = availableIndexes(record);
      const edge = key === "Home" ? indexes[0] : indexes.at(-1);
      if (edge !== undefined) switchMenu(record, menuApi, edge, revision);
    } else typeahead(record, key, revision);
  });
  listenUI(record, valid, record.root, "focusin", (event) => {
    const menu = ownedMenu(record, event.target);
    const index = menu ? record.menus.indexOf(menu) : -1;
    const trigger = record.triggers[index];
    record.focused =
      trigger && isElementNode(event.target) && trigger.contains(event.target)
        ? trigger
        : undefined;
    if (record.focused) setActive(record, index);
  });
  for (const [index, menu] of record.menus.entries()) {
    const trigger = record.triggers[index];
    listenUI(record, valid, trigger, "pointerenter", (event) => {
      if (
        !event.defaultPrevented &&
        record.openIndex !== undefined &&
        record.openIndex !== index &&
        trigger &&
        !unavailable(trigger)
      )
        openIndex(record, menuApi, index, begin(record));
    });
    for (const name of ["open", "close"] as const)
      listenUI(record, valid, menu, `jquery-star:menu:${name}`, (event) => {
        if (event.target !== menu) return;
        syncState(record);
        if (name === "open" && record.openIndex === index) setActive(record, index);
      });
  }
}
function snapshot(record: MenubarRecord): MenubarSnapshot {
  return {
    document: record.document,
    menus: record.menus,
    triggers: record.triggers,
    activeValue: menuValue(record, record.activeIndex),
    focused: record.focused,
    search: record.search,
    deadline: record.pending?.deadline,
  };
}
function metadata(record: MenubarRecord): void {
  record.root.setAttribute("role", "menubar");
  record.root.setAttribute(
    "aria-orientation",
    record.root.dataset.orientation === "vertical" ? "vertical" : "horizontal",
  );
  for (const menu of record.menus) menu.setAttribute("role", "none");
  for (const trigger of record.triggers) trigger.setAttribute("role", "menuitem");
}
function enhanceMenubar(root: HTMLElement, children: ChildMenus): MenubarRecord {
  const requested = intents.get(root);
  const previous = records.get(root);
  if (previous && current(previous)) {
    const revision = previous.revision;
    children.enhance(root);
    if (!current(previous, revision)) return previous;
    metadata(previous);
    const indexes = availableIndexes(previous);
    setActive(
      previous,
      indexes.includes(previous.activeIndex) ? previous.activeIndex : (indexes[0] ?? 0),
    );
    syncState(previous);
    return previous;
  }
  const saved = previous ? snapshot(previous) : retained.get(root);
  previous?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (previous && !uiActive(root)) return previous;
  root.id ||= `jqs-menubar-${++menubarId}`;
  const menus = directMenus(root);
  if (!menus.length) throw new Error(`Menubar #${root.id} needs direct data-part="menu" children.`);
  const triggers = menus.map((menu) => {
    if (!menu.matches('[data-jqs="menu"]'))
      throw new Error(`Menubar #${root.id} menu parts must also use data-jqs="menu".`);
    const trigger = triggerPart(menu);
    if (!trigger) throw new Error(`Menubar menu #${menu.id} needs data-part="trigger".`);
    return trigger;
  });
  const restore = saved && (previous || saved.document !== root.ownerDocument);
  const sameParts =
    restore &&
    saved.menus.length === menus.length &&
    saved.menus.every(
      (menu, index) => menu === menus[index] && saved.triggers[index] === triggers[index],
    );
  const record: MenubarRecord = {
    ...uiResources(root),
    menus,
    triggers,
    activeIndex: 0,
    openIndex: undefined,
    focused: undefined,
    search: sameParts ? saved.search : "",
    pending: undefined,
  };
  const indexes = availableIndexes(record);
  const restored = restore
    ? menus.findIndex((_, index) => menuValue(record, index) === saved.activeValue)
    : -1;
  record.activeIndex = indexes.includes(restored) ? restored : (indexes[0] ?? 0);
  record.cleanups.add(() => {
    retained.set(root, snapshot(record));
    if (!records.has(root)) {
      root.dataset.state = "closed";
      delete root.dataset.value;
    }
  });
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    if (!record.active) return record;
    const revision = record.revision;
    metadata(record);
    setActive(record, record.activeIndex);
    wire(record, children.api);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    children.enhance(root);
    if (current(record, revision) && intents.get(root) === requested) {
      syncState(record);
      if (sameParts && saved.deadline !== undefined) scheduleSearch(record, saved.deadline);
      if (sameParts && saved.focused && record.openIndex === undefined && current(record, revision))
        setActive(record, record.triggers.indexOf(saved.focused), true, revision);
    }
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function matchingMenubar(selector: string, root: ParentNode): HTMLElement | undefined {
  try {
    if (isHTMLElement(root) && root.matches(selector) && menubarRoot(root)) return root;
    for (const element of root.querySelectorAll(selector)) {
      const match = menubarRoot(element);
      if (match) return match;
    }
  } catch (error) {
    if (!["SyntaxError", "TypeError"].includes((error as { name?: string }).name ?? ""))
      throw error;
  }
  return undefined;
}
function resolveMenubar(target: MenubarTarget, root: ParentNode = document): HTMLElement {
  const resolved = typeof target === "string" ? matchingMenubar(target, root) : menubarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Menubar target did not match data-jqs="menubar".`);
}
function localMenubar(context: StarContext): HTMLElement | undefined {
  const closest =
    context.element?.closest('[data-jqs="menubar"]') ??
    (isHTMLElement(context.root) && menubarRoot(context.root));
  return isHTMLElement(closest) ? closest : undefined;
}
function hasMenuValue(root: HTMLElement, value: string): boolean {
  return directMenus(root).some((menu, index) => {
    if (!menu.matches('[data-jqs="menu"]')) return false;
    return (
      (menu.dataset.value?.trim() || triggerPart(menu)?.textContent.trim() || String(index)) ===
      value
    );
  });
}
function controlledMenubar(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveMenubar(target, context.root);
  if (typeof target === "string") return resolveMenubar(target, context.root);
  const closest = localMenubar(context);
  if (closest) return resolveMenubar(closest, context.root);
  throw new Error('ui.menubar requires a selector or an element inside data-jqs="menubar".');
}
export function createMenubars(
  children: ChildMenus,
  registerAction: ActionRegistrar,
): MenubarCollection {
  const operate = (
    target: MenubarTarget,
    operation: "open" | "close" | "focus",
    value?: string,
  ): HTMLElement => {
    const root = resolveMenubar(target);
    const requested = intent(root);
    const record = enhanceMenubar(root, children);
    if (intents.get(root) !== requested || !current(record)) return root;
    const revision = ++record.revision;
    if (operation === "close") closeAll(record, children.api, revision);
    else if (operation === "open")
      openIndex(record, children.api, resolveIndex(record, value), revision);
    else setActive(record, resolveIndex(record, value), true, revision);
    return root;
  };
  const api: StarMenubarStatic = {
    open: (target, value) => operate(target, "open", value),
    close: (target) => operate(target, "close"),
    focus: (target, value) => operate(target, "focus", value),
    value: (target) => {
      const record = enhanceMenubar(resolveMenubar(target), children);
      return current(record) && record.openIndex !== undefined
        ? menuValue(record, record.openIndex)
        : undefined;
    },
  };
  for (const operation of ["open", "focus"] as const)
    registerAction(`ui.menubar.${operation}`, (context) => {
      const first = context.args?.[0];
      const local = localMenubar(context);
      const twoArgument = (context.args?.length ?? 0) > 1;
      if (twoArgument && !isHTMLElement(first) && typeof first !== "string")
        throw new Error('Menubar target did not match data-jqs="menubar".');
      const explicit =
        twoArgument ||
        isHTMLElement(first) ||
        (typeof first === "string" &&
          !(local && hasMenuValue(local, first)) &&
          (first.startsWith("#") || !!matchingMenubar(first, context.root) || !local));
      const target = controlledMenubar(context, explicit ? first : undefined);
      const value = explicit ? context.args?.[1] : first;
      return api[operation](target, typeof value === "string" ? value : undefined);
    });
  registerAction("ui.menubar.close", (context) =>
    api.close(controlledMenubar(context, context.args?.[0])),
  );
  return {
    api,
    enhance: (root) => {
      for (const element of uiElements(root, '[data-jqs="menubar"]')) {
        const menubar = menubarRoot(element);
        if (menubar) enhanceMenubar(menubar, children);
      }
    },
  };
}

import type { ActionRegistrar } from "../registry";
import type { MenubarTarget, StarContext, StarMenuStatic, StarMenubarStatic } from "../types";

interface MenubarRecord {
  activeIndex: number;
  cleanup: () => void;
  menus: HTMLElement[];
  openIndex: number | undefined;
  root: HTMLElement;
  search: string;
  searchTimer: number | undefined;
  triggers: HTMLElement[];
}

interface MenubarCollection {
  api: StarMenubarStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, MenubarRecord>();
let menubarId = 0;

function menubarRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="menubar"]') ? value : undefined;
}

function directMenus(root: HTMLElement): HTMLElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === "menu",
  );
}

function directPart(menu: HTMLElement, part: "trigger" | "content"): HTMLElement {
  const element = Array.from(menu.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
  );
  if (!element) throw new Error(`Menubar menu #${menu.id} needs data-part="${part}".`);
  return element;
}

function menuValue(record: MenubarRecord, index: number): string {
  const menu = record.menus[index];
  return (
    menu?.dataset.value?.trim() || record.triggers[index]?.textContent?.trim() || String(index)
  );
}

function disabled(trigger: HTMLElement): boolean {
  return (
    trigger.hasAttribute("disabled") ||
    trigger.getAttribute("aria-disabled") === "true" ||
    trigger.dataset.disabled !== undefined
  );
}

function availableIndexes(record: MenubarRecord): number[] {
  return record.triggers
    .map((trigger, index) => ({ index, trigger }))
    .filter(({ trigger }) => !disabled(trigger))
    .map(({ index }) => index);
}

function setActive(record: MenubarRecord, index: number, focus = false): void {
  if (!record.triggers[index] || disabled(record.triggers[index]!)) return;
  record.activeIndex = index;
  for (const [candidate, trigger] of record.triggers.entries()) {
    trigger.tabIndex = candidate === index ? 0 : -1;
  }
  if (focus) record.triggers[index]?.focus();
}

function move(record: MenubarRecord, offset: number): number {
  const indexes = availableIndexes(record);
  const current = indexes.indexOf(record.activeIndex);
  if (indexes.length === 0) return record.activeIndex;
  return indexes[(Math.max(current, 0) + offset + indexes.length) % indexes.length] ?? 0;
}

function resolveIndex(record: MenubarRecord, value?: string): number {
  if (value === undefined) return record.activeIndex;
  const index = record.menus.findIndex((_, candidate) => menuValue(record, candidate) === value);
  if (index >= 0) return index;
  throw new Error(`Menubar #${record.root.id} has no menu with value "${value}".`);
}

function closeAll(record: MenubarRecord, menuApi: StarMenuStatic): HTMLElement {
  for (const menu of record.menus) {
    if (menu.dataset.state === "open") menuApi.close(menu);
  }
  record.openIndex = undefined;
  record.root.dataset.state = "closed";
  delete record.root.dataset.value;
  return record.root;
}

function openIndex(record: MenubarRecord, menuApi: StarMenuStatic, index: number): HTMLElement {
  const menu = record.menus[index];
  if (!menu || disabled(record.triggers[index]!)) return record.root;
  setActive(record, index);
  menuApi.open(menu);
  return record.root;
}

function switchMenu(record: MenubarRecord, menuApi: StarMenuStatic, index: number): void {
  const wasOpen = record.openIndex !== undefined;
  setActive(record, index, true);
  if (wasOpen) openIndex(record, menuApi, index);
}

function clearSearch(record: MenubarRecord): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.search = "";
  record.searchTimer = undefined;
}

function typeahead(record: MenubarRecord, key: string): void {
  if (record.searchTimer !== undefined) window.clearTimeout(record.searchTimer);
  record.search += key.toLocaleLowerCase();
  record.searchTimer = window.setTimeout(() => clearSearch(record), 500);
  const indexes = availableIndexes(record);
  const current = indexes.indexOf(record.activeIndex);
  const ordered = [...indexes.slice(current + 1), ...indexes.slice(0, current + 1)];
  const match = ordered.find((index) =>
    record.triggers[index]?.textContent?.trim().toLocaleLowerCase().startsWith(record.search),
  );
  if (match !== undefined) setActive(record, match, true);
}

function wire(record: MenubarRecord, menuApi: StarMenuStatic): () => void {
  const cleanups: Array<() => void> = [];
  const keydown = (event: KeyboardEvent): void => {
    const vertical = record.root.dataset.orientation === "vertical";
    const nextKey = vertical ? "ArrowDown" : "ArrowRight";
    const previousKey = vertical ? "ArrowUp" : "ArrowLeft";
    if (event.key === "Tab") {
      closeAll(record, menuApi);
      return;
    }
    const trigger = record.triggers.find(
      (candidate) => candidate === event.target || candidate.contains(event.target as Node),
    );
    const contentMenu =
      event.target instanceof Element
        ? event.target.closest<HTMLElement>('[data-part="menu"][data-jqs="menu"]')
        : null;
    if (
      contentMenu &&
      !trigger &&
      !vertical &&
      (event.key === "ArrowRight" || event.key === "ArrowLeft")
    ) {
      event.preventDefault();
      const current = record.menus.indexOf(contentMenu);
      const next = move(
        { ...record, activeIndex: Math.max(0, current) },
        event.key === "ArrowRight" ? 1 : -1,
      );
      setActive(record, next);
      openIndex(record, menuApi, next);
      return;
    }
    if (!trigger || event.defaultPrevented) return;
    const index = record.triggers.indexOf(trigger);
    setActive(record, index);
    if (event.key === nextKey || event.key === previousKey) {
      event.preventDefault();
      switchMenu(record, menuApi, move(record, event.key === nextKey ? 1 : -1));
    } else if (vertical && event.key === "ArrowRight") {
      event.preventDefault();
      openIndex(record, menuApi, index);
    } else if ((vertical && event.key === "ArrowLeft") || event.key === "Escape") {
      event.preventDefault();
      closeAll(record, menuApi);
      trigger.focus();
    } else if (event.key === "Home" || event.key === "End") {
      event.preventDefault();
      const indexes = availableIndexes(record);
      switchMenu(record, menuApi, event.key === "Home" ? (indexes[0] ?? 0) : (indexes.at(-1) ?? 0));
    } else if (event.key.length === 1 && /\S/.test(event.key)) {
      typeahead(record, event.key);
    }
  };
  record.root.addEventListener("keydown", keydown);
  cleanups.push(() => record.root.removeEventListener("keydown", keydown));

  for (const [index, menu] of record.menus.entries()) {
    const trigger = record.triggers[index]!;
    const focusin = (): void => setActive(record, index);
    const pointerenter = (): void => {
      if (record.openIndex !== undefined && record.openIndex !== index) {
        openIndex(record, menuApi, index);
      }
    };
    const opened = (): void => {
      record.openIndex = index;
      record.root.dataset.state = "open";
      record.root.dataset.value = menuValue(record, index);
      setActive(record, index);
    };
    const closed = (): void => {
      if (record.openIndex === index) record.openIndex = undefined;
      if (!record.menus.some((candidate) => candidate.dataset.state === "open")) {
        record.root.dataset.state = "closed";
        delete record.root.dataset.value;
      }
    };
    trigger.addEventListener("focusin", focusin);
    trigger.addEventListener("pointerenter", pointerenter);
    menu.addEventListener("jquery-star:menu:open", opened);
    menu.addEventListener("jquery-star:menu:close", closed);
    cleanups.push(
      () => trigger.removeEventListener("focusin", focusin),
      () => trigger.removeEventListener("pointerenter", pointerenter),
      () => menu.removeEventListener("jquery-star:menu:open", opened),
      () => menu.removeEventListener("jquery-star:menu:close", closed),
    );
  }
  return () => {
    clearSearch(record);
    cleanups.forEach((cleanup) => cleanup());
  };
}

function enhanceMenubar(root: HTMLElement, menuApi: StarMenuStatic): MenubarRecord {
  root.id ||= `jqs-menubar-${++menubarId}`;
  root.setAttribute("role", "menubar");
  root.setAttribute(
    "aria-orientation",
    root.dataset.orientation === "vertical" ? "vertical" : "horizontal",
  );
  const menus = directMenus(root);
  if (menus.length === 0)
    throw new Error(`Menubar #${root.id} needs direct data-part="menu" children.`);
  for (const menu of menus) {
    if (!menu.matches('[data-jqs="menu"]')) {
      throw new Error(`Menubar #${root.id} menu parts must also use data-jqs="menu".`);
    }
    menu.setAttribute("role", "none");
  }
  const triggers = menus.map((menu) => directPart(menu, "trigger"));
  triggers.forEach((trigger) => trigger.setAttribute("role", "menuitem"));

  const previous = records.get(root);
  const activeValue = previous ? menuValue(previous, previous.activeIndex) : undefined;
  previous?.cleanup();
  const activeIndex = Math.max(
    0,
    activeValue === undefined
      ? triggers.findIndex((trigger) => !disabled(trigger))
      : menus.findIndex(
          (_, index) => menuValue({ ...previous!, menus, triggers }, index) === activeValue,
        ),
  );
  const openIndexValue = menus.findIndex((menu) => menu.dataset.state === "open");
  const record: MenubarRecord = {
    activeIndex,
    cleanup: () => undefined,
    menus,
    openIndex: openIndexValue < 0 ? undefined : openIndexValue,
    root,
    search: "",
    searchTimer: undefined,
    triggers,
  };
  records.set(root, record);
  setActive(record, activeIndex);
  root.dataset.state = record.openIndex === undefined ? "closed" : "open";
  record.cleanup = wire(record, menuApi);
  return record;
}

function resolveMenubar(target: MenubarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? menubarRoot(root.querySelector(target)) : menubarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Menubar target did not match data-jqs="menubar": ${String(target)}`);
}

function controlledMenubar(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="menubar"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveMenubar(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="menubar"]');
  return resolveMenubar(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceTree(root: ParentNode, menuApi: StarMenuStatic): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="menubar"]')));
  for (const element of elements) {
    const menubar = menubarRoot(element);
    if (menubar) enhanceMenubar(menubar, menuApi);
  }
}

export function createMenubars(
  menuApi: StarMenuStatic,
  registerAction: ActionRegistrar,
): MenubarCollection {
  const api: StarMenubarStatic = {
    open: (target, value) => {
      const root = resolveMenubar(target);
      const record = records.get(root) ?? enhanceMenubar(root, menuApi);
      return openIndex(record, menuApi, resolveIndex(record, value));
    },
    close: (target) => {
      const root = resolveMenubar(target);
      return closeAll(records.get(root) ?? enhanceMenubar(root, menuApi), menuApi);
    },
    focus: (target, value) => {
      const root = resolveMenubar(target);
      const record = records.get(root) ?? enhanceMenubar(root, menuApi);
      setActive(record, resolveIndex(record, value), true);
      return root;
    },
    value: (target) => {
      const root = resolveMenubar(target);
      const record = records.get(root) ?? enhanceMenubar(root, menuApi);
      return record.openIndex === undefined ? undefined : menuValue(record, record.openIndex);
    },
  };
  registerAction("ui.menubar.open", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledMenubar(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    return api.open(target, typeof value === "string" ? value : undefined);
  });
  registerAction("ui.menubar.close", (context) =>
    api.close(controlledMenubar(context, context.args?.[0])),
  );
  registerAction("ui.menubar.focus", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledMenubar(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    return api.focus(target, typeof value === "string" ? value : undefined);
  });
  return { api, enhance: (root) => enhanceTree(root, menuApi) };
}

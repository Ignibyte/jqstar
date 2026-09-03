import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { SidebarTarget, StarContext, StarSidebarStatic } from "../types";

type SidebarCollapsible = "icon" | "none" | "offcanvas";

interface SidebarRecord {
  activeTrigger: HTMLElement | undefined;
  cleanup: () => void;
  desktopExpanded: boolean;
  expanded: boolean;
  lastValue: string;
  media: MediaQueryList | undefined;
  mobile: boolean;
  panel: HTMLElement;
  root: HTMLElement;
  triggers: HTMLElement[];
}

interface SidebarEventDetail {
  expanded: boolean;
  mobile: boolean;
  sidebar: HTMLElement;
  trigger: HTMLElement | undefined;
}

interface SidebarCollection {
  api: StarSidebarStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, SidebarRecord>();
let sidebarId = 0;

function sidebarRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="sidebar"]') ? value : undefined;
}

function collapsible(root: HTMLElement): SidebarCollapsible {
  if (root.dataset.collapsible === "none") return "none";
  if (root.dataset.collapsible === "offcanvas") return "offcanvas";
  return "icon";
}

function scopedParts(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)).filter(
    (element) => element.parentElement?.closest("[data-jqs]") === root,
  );
}

function storageKey(root: HTMLElement): string | undefined {
  const key = root.dataset.storageKey?.trim();
  return key ? `jquery-star:sidebar:${key}` : undefined;
}

function storedValue(root: HTMLElement): boolean | undefined {
  const key = storageKey(root);
  if (!key) return undefined;
  try {
    const value = localStorage.getItem(key);
    return value === "expanded" ? true : value === "collapsed" ? false : undefined;
  } catch {
    return undefined;
  }
}

function persist(record: SidebarRecord): void {
  const key = storageKey(record.root);
  if (!key || record.mobile) return;
  try {
    localStorage.setItem(key, record.expanded ? "expanded" : "collapsed");
  } catch {
    // Storage can be unavailable in privacy modes; the current sidebar still works.
  }
}

function parsedValue(value: string | undefined): boolean | undefined {
  if (value === "expanded" || value === "true" || value === "open") return true;
  if (value === "collapsed" || value === "false" || value === "closed") return false;
  return undefined;
}

function mobileQuery(): MediaQueryList | undefined {
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 48rem)")
    : undefined;
}

function emit(
  record: SidebarRecord,
  name: "before-change" | "change",
  cancelable = false,
): boolean {
  const detail: SidebarEventDetail = {
    expanded: record.expanded,
    mobile: record.mobile,
    sidebar: record.root,
    trigger: record.activeTrigger,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:sidebar:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function render(record: SidebarRecord): void {
  const value = record.expanded ? "expanded" : "collapsed";
  record.lastValue = value;
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  record.root.dataset.state = value;
  record.root.dataset.mobile = String(record.mobile);
  const inaccessible =
    !record.expanded && (record.mobile || collapsible(record.root) === "offcanvas");
  record.panel.setAttribute("aria-hidden", String(inaccessible));
  record.panel.inert = inaccessible;
  for (const trigger of record.triggers) {
    trigger.setAttribute("aria-controls", record.panel.id);
    trigger.setAttribute("aria-expanded", String(record.expanded));
    if (trigger instanceof HTMLButtonElement && !trigger.hasAttribute("type")) {
      trigger.type = "button";
    }
  }
  for (const backdrop of scopedParts(record.root, "backdrop")) {
    backdrop.hidden = !(record.mobile && record.expanded);
    backdrop.setAttribute("aria-hidden", "true");
    if (backdrop instanceof HTMLButtonElement && !backdrop.hasAttribute("type")) {
      backdrop.type = "button";
    }
  }
}

function setExpanded(
  record: SidebarRecord,
  expanded: boolean,
  trigger?: HTMLElement,
  events = true,
): HTMLElement {
  if (collapsible(record.root) === "none") expanded = true;
  if (record.expanded === expanded) return record.root;
  const previous = record.expanded;
  record.expanded = expanded;
  if (trigger) record.activeTrigger = trigger;
  if (events && !emit(record, "before-change", true)) {
    record.expanded = previous;
    return record.root;
  }
  if (!record.mobile) record.desktopExpanded = expanded;
  render(record);
  persist(record);
  if (events) emit(record, "change");
  return record.root;
}

function wire(record: SidebarRecord): () => void {
  const cleanups: Array<() => void> = [];
  for (const trigger of record.triggers) {
    const click = (): void => {
      setExpanded(record, !record.expanded, trigger);
    };
    trigger.addEventListener("click", click);
    cleanups.push(() => trigger.removeEventListener("click", click));
  }
  for (const rail of scopedParts(record.root, "rail")) {
    const click = (): void => {
      setExpanded(record, !record.expanded, rail);
    };
    rail.addEventListener("click", click);
    cleanups.push(() => rail.removeEventListener("click", click));
  }
  for (const backdrop of scopedParts(record.root, "backdrop")) {
    const click = (): void => {
      setExpanded(record, false, record.activeTrigger);
      record.activeTrigger?.focus();
    };
    backdrop.addEventListener("click", click);
    cleanups.push(() => backdrop.removeEventListener("click", click));
  }
  const keydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && record.mobile && record.expanded) {
      event.preventDefault();
      setExpanded(record, false, record.activeTrigger);
      record.activeTrigger?.focus();
    }
  };
  record.root.addEventListener("keydown", keydown);
  cleanups.push(() => record.root.removeEventListener("keydown", keydown));

  const change = (event: MediaQueryListEvent): void => {
    const nextMobile = event.matches && collapsible(record.root) !== "none";
    if (nextMobile === record.mobile) return;
    if (nextMobile) {
      record.desktopExpanded = record.expanded;
      record.mobile = true;
      record.expanded = false;
    } else {
      record.mobile = false;
      record.expanded = record.desktopExpanded;
    }
    render(record);
  };
  record.media?.addEventListener("change", change);
  cleanups.push(() => record.media?.removeEventListener("change", change));
  return () => cleanups.forEach((cleanup) => cleanup());
}

function installShortcutHandler(host: DocumentHost): void {
  const owner = host.document;
  host.listen(owner, "keydown", (event: KeyboardEvent) => {
    const root = sidebarRoot(owner.querySelector('[data-jqs="sidebar"]'));
    if (!root) return;
    const shortcut = root.dataset.shortcut ?? "b";
    if (
      shortcut === "false" ||
      (!event.metaKey && !event.ctrlKey) ||
      event.key.toLocaleLowerCase() !== shortcut.toLocaleLowerCase()
    ) {
      return;
    }
    event.preventDefault();
    const record = records.get(root) ?? enhanceSidebar(root);
    setExpanded(record, !record.expanded, record.activeTrigger);
  });
}

function enhanceSidebar(root: HTMLElement): SidebarRecord {
  root.id ||= `jqs-sidebar-${++sidebarId}`;
  const panel = scopedParts(root, "panel")[0];
  if (!panel) throw new Error(`Sidebar #${root.id} needs data-part="panel".`);
  panel.id ||= `${root.id}-panel`;
  const triggers = scopedParts(root, "trigger");
  if (triggers.length === 0 && collapsible(root) !== "none") {
    throw new Error(`Sidebar #${root.id} needs a data-part="trigger" control.`);
  }

  const existing = records.get(root);
  existing?.cleanup();
  const media = mobileQuery();
  const mobile = (media?.matches ?? false) && collapsible(root) !== "none";
  const patched = parsedValue(root.dataset.value);
  const internallyRendered = existing && root.dataset.value === existing.lastValue;
  const initial =
    collapsible(root) === "none"
      ? true
      : internallyRendered
        ? existing.expanded
        : (patched ?? storedValue(root) ?? !mobile);
  const record: SidebarRecord = {
    activeTrigger: existing?.activeTrigger,
    cleanup: () => undefined,
    desktopExpanded: existing?.desktopExpanded ?? (mobile ? true : initial),
    expanded: initial,
    lastValue: root.dataset.value ?? "",
    media,
    mobile,
    panel,
    root,
    triggers,
  };
  records.set(root, record);
  render(record);
  record.cleanup = wire(record);
  return record;
}

function resolveSidebar(target: SidebarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? sidebarRoot(root.querySelector(target)) : sidebarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Sidebar target did not match data-jqs="sidebar": ${String(target)}`);
}

function controlledSidebar(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="sidebar"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveSidebar(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="sidebar"]');
  return resolveSidebar(closest instanceof HTMLElement ? closest : String(target));
}

function enhanceSidebars(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="sidebar"]')));
  for (const element of elements) {
    const sidebar = sidebarRoot(element);
    if (sidebar) enhanceSidebar(sidebar);
  }
}

export function createSidebars(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): SidebarCollection {
  installShortcutHandler(host);
  const api: StarSidebarStatic = {
    open: (target) => {
      const root = resolveSidebar(target);
      return setExpanded(records.get(root) ?? enhanceSidebar(root), true);
    },
    close: (target) => {
      const root = resolveSidebar(target);
      return setExpanded(records.get(root) ?? enhanceSidebar(root), false);
    },
    toggle: (target) => {
      const root = resolveSidebar(target);
      const record = records.get(root) ?? enhanceSidebar(root);
      return setExpanded(record, !record.expanded);
    },
    value: (target) => {
      const root = resolveSidebar(target);
      return (records.get(root) ?? enhanceSidebar(root)).expanded;
    },
  };
  for (const operation of ["open", "close", "toggle"] as const) {
    registerAction(`ui.sidebar.${operation}`, (context) =>
      api[operation](controlledSidebar(context, context.args?.[0])),
    );
  }
  return { api, enhance: enhanceSidebars };
}

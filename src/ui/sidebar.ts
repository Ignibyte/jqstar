import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { SidebarTarget, StarContext, StarSidebarStatic } from "../types";
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

type SidebarCollapsible = "icon" | "none" | "offcanvas";

interface SidebarRecord extends UIResources {
  activeTrigger: HTMLElement | undefined;
  parts: HTMLElement[];
  desktopExpanded: boolean;
  expanded: boolean;
  lastValue: string;
  media: MediaQueryList | undefined;
  mobile: boolean;
  panel: HTMLElement;
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
const retained = new WeakMap<
  HTMLElement,
  { desktopExpanded: boolean; expanded: boolean; mobile: boolean; lastValue: string }
>();
let sidebarId = 0;

function sidebarRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="sidebar"]') ? value : undefined;
}

function collapsible(root: HTMLElement): SidebarCollapsible {
  if (root.dataset.collapsible === "none") return "none";
  if (root.dataset.collapsible === "offcanvas") return "offcanvas";
  return "icon";
}

function scopedParts(root: HTMLElement, part: string): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>(`[data-part="${part}"]`)).filter(
    (element) => isHTMLElement(element) && element.parentElement?.closest("[data-jqs]") === root,
  );
}

function storageKey(root: HTMLElement): string | undefined {
  const key = root.dataset.storageKey?.trim();
  return key ? `jquery-star:sidebar:${key}` : undefined;
}

function storedValue(record: SidebarRecord): boolean | undefined {
  const key = storageKey(record.root);
  if (!key) return undefined;
  try {
    const value = record.window.localStorage.getItem(key);
    return value === "expanded" ? true : value === "collapsed" ? false : undefined;
  } catch {
    return undefined;
  }
}

function persist(record: SidebarRecord): void {
  const key = storageKey(record.root);
  if (!key || record.mobile) return;
  try {
    record.window.localStorage.setItem(key, record.expanded ? "expanded" : "collapsed");
  } catch {
    // Storage can be unavailable in privacy modes; the current sidebar still works.
  }
}

function parsedValue(value: string | undefined): boolean | undefined {
  if (value === "expanded" || value === "true" || value === "open") return true;
  if (value === "collapsed" || value === "false" || value === "closed") return false;
  return undefined;
}

function mobileQuery(record: SidebarRecord): MediaQueryList | undefined {
  const window = record.window;
  return typeof window.matchMedia === "function"
    ? window.matchMedia("(max-width: 48rem)")
    : undefined;
}

function emit(
  record: SidebarRecord,
  name: "before-change" | "change",
  cancelable = false,
  expanded = record.expanded,
): boolean {
  const detail: SidebarEventDetail = {
    expanded,
    mobile: record.mobile,
    sidebar: record.root,
    trigger: record.activeTrigger,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:sidebar:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function render(record: SidebarRecord): void {
  const value = record.expanded ? "expanded" : "collapsed";
  record.lastValue = value;
  retained.set(record.root, {
    desktopExpanded: record.desktopExpanded,
    expanded: record.expanded,
    mobile: record.mobile,
    lastValue: value,
  });
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
    if (isHTMLTag(trigger, "button") && !trigger.hasAttribute("type")) {
      trigger.type = "button";
    }
  }
  for (const backdrop of scopedParts(record.root, "backdrop")) {
    backdrop.hidden = !(record.mobile && record.expanded);
    backdrop.setAttribute("aria-hidden", "true");
    if (isHTMLTag(backdrop, "button") && !backdrop.hasAttribute("type")) {
      backdrop.type = "button";
    }
  }
}

function currentParts(root: HTMLElement): HTMLElement[] {
  return ["panel", "trigger", "rail", "backdrop"].flatMap((part) => scopedParts(root, part));
}

function current(record: SidebarRecord, revision = record.revision): boolean {
  const parts = currentParts(record.root);
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    parts.length === record.parts.length &&
    parts.every((part, index) => part === record.parts[index])
  );
}

function recordFor(root: HTMLElement): SidebarRecord {
  const record = records.get(root);
  return record && current(record) ? record : enhanceSidebar(root);
}

function setExpanded(record: SidebarRecord, expanded: boolean, trigger?: HTMLElement): HTMLElement {
  const revision = ++record.revision;
  if (!current(record)) return record.root;
  if (collapsible(record.root) === "none") expanded = true;
  if (trigger) record.activeTrigger = trigger;
  if (record.expanded === expanded) return record.root;
  const authored = record.root.dataset.value;
  const mode = collapsible(record.root);
  if (
    !emit(record, "before-change", true, expanded) ||
    !current(record, revision) ||
    record.root.dataset.value !== authored ||
    collapsible(record.root) !== mode
  )
    return record.root;
  record.expanded = expanded;
  if (!record.mobile) record.desktopExpanded = expanded;
  render(record);
  persist(record);
  if (current(record, revision)) emit(record, "change");
  return record.root;
}

function closeAndFocus(record: SidebarRecord): void {
  const revision = record.revision + 1;
  setExpanded(record, false, record.activeTrigger);
  if (
    current(record, revision) &&
    !record.expanded &&
    record.activeTrigger?.ownerDocument === record.document &&
    record.root.contains(record.activeTrigger)
  )
    record.activeTrigger.focus();
}

function updateMobile(record: SidebarRecord, matches: boolean): void {
  const nextMobile = matches && collapsible(record.root) !== "none";
  if (nextMobile === record.mobile) return;
  record.revision += 1;
  if (nextMobile) {
    record.desktopExpanded = record.expanded;
    record.mobile = true;
    record.expanded = false;
  } else {
    record.mobile = false;
    record.expanded = record.desktopExpanded;
  }
}

function wire(record: SidebarRecord): void {
  for (const trigger of record.triggers) {
    const click = (): void => {
      setExpanded(record, !record.expanded, trigger);
    };
    listenUI(record, () => current(record), trigger, "click", click);
  }
  for (const rail of scopedParts(record.root, "rail")) {
    const click = (): void => {
      setExpanded(record, !record.expanded, rail);
    };
    listenUI(record, () => current(record), rail, "click", click);
  }
  for (const backdrop of scopedParts(record.root, "backdrop")) {
    const click = (): void => {
      closeAndFocus(record);
    };
    listenUI(record, () => current(record), backdrop, "click", click);
  }
  const keydown = (event: KeyboardEvent): void => {
    if (event.key === "Escape" && record.mobile && record.expanded) {
      event.preventDefault();
      closeAndFocus(record);
    }
  };
  listenUI(record, () => current(record), record.root, "keydown", keydown as EventListener);

  const change = (event: MediaQueryListEvent): void => {
    updateMobile(record, event.matches);
    render(record);
  };
  listenUI(record, () => current(record), record.media, "change", change as EventListener);
}

function installShortcutHandler(host: DocumentHost): void {
  const owner = host.document;
  host.listen(owner, "keydown", (event: KeyboardEvent) => {
    const root = uiElements(owner, '[data-jqs="sidebar"]').find(isHTMLElement);
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
    const record = recordFor(root);
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
  if (existing && current(existing)) {
    updateMobile(existing, existing.media?.matches ?? false);
    const patched = parsedValue(root.dataset.value);
    if (patched !== undefined && root.dataset.value !== existing.lastValue) {
      existing.revision += 1;
      existing.expanded = patched;
      if (!existing.mobile) existing.desktopExpanded = patched;
    }
    if (collapsible(root) === "none") {
      existing.mobile = false;
      existing.expanded = true;
      existing.desktopExpanded = true;
    }
    render(existing);
    return existing;
  }
  const previous = retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  const record: SidebarRecord = {
    ...uiResources(root),
    activeTrigger: existing?.activeTrigger,
    desktopExpanded: previous?.desktopExpanded ?? true,
    expanded: true,
    lastValue: root.dataset.value ?? "",
    media: undefined,
    mobile: false,
    panel,
    parts: currentParts(root),
    triggers,
  };
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    record.media = mobileQuery(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    record.mobile = (record.media?.matches ?? false) && collapsible(root) !== "none";
    const patched = parsedValue(root.dataset.value);
    const internallyRendered = previous && root.dataset.value === previous.lastValue;
    const initial = internallyRendered
      ? previous.mobile === record.mobile
        ? previous.expanded
        : record.mobile
          ? false
          : previous.desktopExpanded
      : (patched ?? storedValue(record) ?? !record.mobile);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    record.expanded = collapsible(root) === "none" ? true : initial;
    if (!record.mobile) record.desktopExpanded = record.expanded;
    render(record);
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}

function resolveSidebar(target: SidebarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? sidebarRoot(root.querySelector(target)) : sidebarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Sidebar target did not match data-jqs="sidebar": ${String(target)}`);
}

function controlledSidebar(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveSidebar(target, context.root);
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveSidebar(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="sidebar"]');
  return resolveSidebar(isHTMLElement(closest) ? closest : String(target), context.root);
}

function enhanceSidebars(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="sidebar"]')) {
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
      return setExpanded(recordFor(root), true);
    },
    close: (target) => {
      const root = resolveSidebar(target);
      return setExpanded(recordFor(root), false);
    },
    toggle: (target) => {
      const root = resolveSidebar(target);
      const record = recordFor(root);
      return setExpanded(record, !record.expanded);
    },
    value: (target) => {
      const root = resolveSidebar(target);
      return recordFor(root).expanded;
    },
  };
  for (const operation of ["open", "close", "toggle"] as const) {
    registerAction(`ui.sidebar.${operation}`, (context) =>
      api[operation](controlledSidebar(context, context.args?.[0])),
    );
  }
  return { api, enhance: enhanceSidebars };
}

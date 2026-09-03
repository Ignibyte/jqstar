import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { HoverCardTarget, StarContext, StarHoverCardStatic } from "../types";
import {
  documentRecordCleanup,
  documentRecords,
  hideFloating,
  listenToViewportChanges,
  positionFloating,
  prepareFloating,
  showFloating,
  usesNativePopover,
} from "./floating";

interface HoverCardRecord {
  cleanups: Array<() => void>;
  closeTimer: number | undefined;
  content: HTMLElement;
  focused: boolean;
  open: boolean;
  openTimer: number | undefined;
  pointed: boolean;
  root: HTMLElement;
  suppressFocusOpen: boolean;
  trigger: HTMLElement;
}

interface HoverCardCollection {
  api: StarHoverCardStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, HoverCardRecord>();
const activeRecords = new Set<HoverCardRecord>();
let hoverCardId = 0;

function hoverCardRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="hover-card"]')
    ? value
    : undefined;
}

function directPart(root: HTMLElement, part: "trigger" | "content"): HTMLElement {
  const element = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === part,
  );
  if (!element) throw new Error(`Hover Card #${root.id} needs a direct data-part="${part}" child.`);
  return element;
}

function delay(
  root: HTMLElement,
  attribute: "data-delay" | "data-close-delay",
  fallback: number,
): number {
  const raw = root.getAttribute(attribute);
  if (raw === null) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}

function clearTimer(record: HoverCardRecord, timer: "openTimer" | "closeTimer"): void {
  if (record[timer] !== undefined) window.clearTimeout(record[timer]);
  record[timer] = undefined;
}

function emit(
  record: HoverCardRecord,
  name: "before-open" | "open" | "before-close" | "close",
  cancelable = false,
): boolean {
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:hover-card:${name}`, {
      bubbles: true,
      cancelable,
      detail: { content: record.content, hoverCard: record.root, trigger: record.trigger },
    }),
  );
}

function syncState(record: HoverCardRecord, open: boolean): void {
  record.open = open;
  if (open) activeRecords.add(record);
  else activeRecords.delete(record);
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(open));
}

function openHoverCard(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceHoverCard(root);
  clearTimer(record, "openTimer");
  clearTimer(record, "closeTimer");
  if (record.open || !emit(record, "before-open", true)) return root;
  record.root.dataset.state = "opening";
  record.content.dataset.state = "opening";
  showFloating(record.content);
  syncState(record, true);
  positionFloating(record.root, record.trigger, record.content, {
    align: "start",
    gap: 8,
    side: "bottom",
  });
  emit(record, "open");
  return root;
}

function closeHoverCard(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceHoverCard(root);
  clearTimer(record, "openTimer");
  clearTimer(record, "closeTimer");
  if (!record.open || !emit(record, "before-close", true)) return root;
  const returnFocus = record.content.contains(document.activeElement);
  record.root.dataset.state = "closing";
  record.content.dataset.state = "closing";
  hideFloating(record.content);
  syncState(record, false);
  if (returnFocus && record.trigger.isConnected) {
    record.suppressFocusOpen = true;
    record.trigger.focus();
  }
  emit(record, "close");
  return root;
}

function scheduleOpen(record: HoverCardRecord): void {
  clearTimer(record, "closeTimer");
  if (record.open || record.openTimer !== undefined) return;
  record.openTimer = window.setTimeout(
    () => {
      record.openTimer = undefined;
      if (record.focused || record.pointed) openHoverCard(record.root);
    },
    delay(record.root, "data-delay", 300),
  );
}

function scheduleClose(record: HoverCardRecord): void {
  clearTimer(record, "openTimer");
  if (!record.open || record.closeTimer !== undefined) return;
  record.closeTimer = window.setTimeout(
    () => {
      record.closeTimer = undefined;
      if (!record.focused && !record.pointed) closeHoverCard(record.root);
    },
    delay(record.root, "data-close-delay", 120),
  );
}

function wire(record: HoverCardRecord): void {
  const pointerEnter = (): void => {
    record.pointed = true;
    scheduleOpen(record);
  };
  const pointerLeave = (): void => {
    record.pointed = false;
    scheduleClose(record);
  };
  const focusIn = (): void => {
    record.focused = true;
    if (record.suppressFocusOpen) {
      record.suppressFocusOpen = false;
      return;
    }
    scheduleOpen(record);
  };
  const focusOut = (): void => {
    record.focused = false;
    scheduleClose(record);
  };
  for (const element of [record.trigger, record.content]) {
    element.addEventListener("pointerenter", pointerEnter);
    element.addEventListener("pointerleave", pointerLeave);
    element.addEventListener("focusin", focusIn);
    element.addEventListener("focusout", focusOut);
    record.cleanups.push(
      () => element.removeEventListener("pointerenter", pointerEnter),
      () => element.removeEventListener("pointerleave", pointerLeave),
      () => element.removeEventListener("focusin", focusIn),
      () => element.removeEventListener("focusout", focusOut),
    );
  }
}

function identifyContent(record: HoverCardRecord): void {
  record.content.id ||= `${record.root.id}-content`;
  record.trigger.setAttribute("aria-controls", record.content.id);
  const title = record.content.querySelector<HTMLElement>('[data-part="title"]');
  if (title) {
    title.id ||= `${record.root.id}-title`;
    if (
      !record.content.hasAttribute("aria-label") &&
      !record.content.hasAttribute("aria-labelledby")
    ) {
      record.content.setAttribute("aria-labelledby", title.id);
    }
  }
}

function installGlobalListeners(host: DocumentHost): void {
  const { document } = host;
  host.listen(document, "keydown", (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const record = documentRecords(activeRecords, document).at(-1);
    if (!record) return;
    event.preventDefault();
    closeHoverCard(record.root);
  });
  host.listen(
    document,
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) return;
      for (const record of documentRecords(activeRecords, document)) {
        if (!record.root.isConnected) activeRecords.delete(record);
        else if (!record.root.contains(event.target)) closeHoverCard(record.root);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (record.root.isConnected) {
        positionFloating(record.root, record.trigger, record.content, {
          align: "start",
          gap: 8,
          side: "bottom",
        });
      } else activeRecords.delete(record);
    }
  };
  listenToViewportChanges(host, reposition);
  host.own(
    "service",
    "ui:hover-card:active-records",
    documentRecordCleanup(activeRecords, document),
  );
}

function enhanceHoverCard(root: HTMLElement): HoverCardRecord {
  root.id ||= `jqs-hover-card-${++hoverCardId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  prepareFloating(content);
  let record = records.get(root);
  if (!record) {
    record = {
      cleanups: [],
      closeTimer: undefined,
      content,
      focused: false,
      open: false,
      openTimer: undefined,
      pointed: false,
      root,
      suppressFocusOpen: false,
      trigger,
    };
    records.set(root, record);
    if (!usesNativePopover(content)) content.hidden = true;
  } else if (record.trigger !== trigger || record.content !== content) {
    const contentChanged = record.content !== content;
    if (contentChanged && record.open) hideFloating(record.content);
    clearTimer(record, "openTimer");
    clearTimer(record, "closeTimer");
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.trigger = trigger;
    record.content = content;
    record.focused = false;
    record.pointed = false;
    record.suppressFocusOpen = false;
    if (!usesNativePopover(content)) content.hidden = !record.open;
    if (contentChanged && record.open) showFloating(content);
  }
  identifyContent(record);
  syncState(record, record.open);
  if (record.cleanups.length === 0) wire(record);
  if (record.open) {
    positionFloating(record.root, record.trigger, record.content, {
      align: "start",
      gap: 8,
      side: "bottom",
    });
  }
  return record;
}

function resolveRoot(target: HoverCardTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? hoverCardRoot(root.querySelector(target)) : hoverCardRoot(target);
  if (resolved) return resolved;
  throw new Error(`Hover Card target did not match data-jqs="hover-card": ${String(target)}`);
}

function controlledHoverCard(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="hover-card"]')) return target;
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
  }
  const closest = context.element?.closest('[data-jqs="hover-card"]') ?? null;
  const resolved = hoverCardRoot(closest);
  if (resolved) return resolved;
  throw new Error('Hover Card action needs a selector or an element inside data-jqs="hover-card".');
}

export function createHoverCards(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): HoverCardCollection {
  installGlobalListeners(host);
  const api: StarHoverCardStatic = {
    open: (target) => openHoverCard(resolveRoot(target)),
    close: (target) => closeHoverCard(resolveRoot(target)),
  };
  for (const operation of ["open", "close"] as const) {
    registerAction(`ui.hover-card.${operation}`, (context) =>
      api[operation](controlledHoverCard(context, context.args?.[0])),
    );
  }
  const enhance = (root: ParentNode): void => {
    const elements: Element[] = root instanceof Element ? [root] : [];
    elements.push(...Array.from(root.querySelectorAll('[data-jqs="hover-card"]')));
    for (const element of elements) {
      const hoverCard = hoverCardRoot(element);
      if (hoverCard) enhanceHoverCard(hoverCard);
    }
  };
  return { api, enhance };
}

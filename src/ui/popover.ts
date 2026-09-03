import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { PopoverTarget, StarContext, StarPopoverStatic } from "../types";
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

interface PopoverRecord {
  cleanups: Array<() => void>;
  content: HTMLElement;
  open: boolean;
  root: HTMLElement;
  trigger: HTMLElement;
}

interface PopoverEventDetail {
  content: HTMLElement;
  popover: HTMLElement;
  trigger: HTMLElement;
}

interface PopoverCollection {
  api: StarPopoverStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, PopoverRecord>();
const activeRecords = new Set<PopoverRecord>();
let popoverId = 0;

function popoverRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="popover"]') ? value : undefined;
}

function directPart(root: HTMLElement, part: "trigger" | "content"): HTMLElement {
  const element = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === part,
  );
  if (!element) throw new Error(`Popover #${root.id} needs a direct data-part="${part}" child.`);
  return element;
}

function emit(
  record: PopoverRecord,
  name: "before-open" | "open" | "before-close" | "close",
  cancelable = false,
): boolean {
  const detail: PopoverEventDetail = {
    content: record.content,
    popover: record.root,
    trigger: record.trigger,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:popover:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function position(record: PopoverRecord): void {
  if (!record.open) return;
  positionFloating(record.root, record.trigger, record.content);
}

function focusInitial(record: PopoverRecord): void {
  const selector = record.root.getAttribute("data-initial-focus");
  if (!selector) return;
  record.content.querySelector<HTMLElement>(selector)?.focus();
}

function syncState(record: PopoverRecord, open: boolean): void {
  record.open = open;
  if (open) {
    activeRecords.delete(record);
    activeRecords.add(record);
  } else {
    activeRecords.delete(record);
  }
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(open));
}

function showContent(record: PopoverRecord): void {
  showFloating(record.content);
}

function hideContent(record: PopoverRecord): void {
  hideFloating(record.content);
}

function openPopover(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhancePopover(root);
  if (record.open || !emit(record, "before-open", true)) return root;
  record.root.dataset.state = "opening";
  record.content.dataset.state = "opening";
  showContent(record);
  syncState(record, true);
  position(record);
  focusInitial(record);
  emit(record, "open");
  return root;
}

function closePopover(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhancePopover(root);
  if (!record.open || !emit(record, "before-close", true)) return root;
  const returnFocus = record.content.contains(document.activeElement);
  record.root.dataset.state = "closing";
  record.content.dataset.state = "closing";
  hideContent(record);
  syncState(record, false);
  if (returnFocus && record.trigger.isConnected) record.trigger.focus();
  emit(record, "close");
  return root;
}

function togglePopover(root: HTMLElement): HTMLElement {
  return (records.get(root) ?? enhancePopover(root)).open ? closePopover(root) : openPopover(root);
}

function hasClickAction(trigger: HTMLElement): boolean {
  return Array.from(trigger.attributes).some((attribute) => attribute.name === "data-on:click");
}

function identifyTitle(record: PopoverRecord): void {
  const title = record.content.querySelector<HTMLElement>('[data-part="title"]');
  if (!title) return;
  title.id ||= `${record.root.id}-title`;
  if (
    !record.content.hasAttribute("aria-label") &&
    !record.content.hasAttribute("aria-labelledby")
  ) {
    record.content.setAttribute("aria-labelledby", title.id);
  }
}

function wire(record: PopoverRecord): void {
  const click = (): void => {
    togglePopover(record.root);
  };
  if (!hasClickAction(record.trigger)) {
    record.trigger.addEventListener("click", click);
    record.cleanups.push(() => record.trigger.removeEventListener("click", click));
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
        if (!record.root.isConnected) {
          activeRecords.delete(record);
        } else if (!record.root.contains(event.target)) {
          closePopover(record.root);
        }
      }
    },
    true,
  );
  host.listen(document, "keydown", (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const open = documentRecords(activeRecords, document);
    const record = open[open.length - 1];
    if (!record) return;
    event.preventDefault();
    closePopover(record.root);
  });
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (record.root.isConnected) position(record);
      else activeRecords.delete(record);
    }
  };
  listenToViewportChanges(host, reposition);
  host.own("service", "ui:popover:active-records", documentRecordCleanup(activeRecords, document));
}

function enhancePopover(root: HTMLElement): PopoverRecord {
  root.id ||= `jqs-popover-${++popoverId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  content.id ||= `${root.id}-content`;
  prepareFloating(content);
  content.setAttribute("role", content.getAttribute("role") || "dialog");
  trigger.setAttribute("aria-controls", content.id);
  trigger.setAttribute("aria-haspopup", content.getAttribute("role") || "dialog");

  let record = records.get(root);
  if (!record) {
    record = { cleanups: [], content, open: false, root, trigger };
    records.set(root, record);
    if (!usesNativePopover(content)) content.hidden = true;
  } else if (record.trigger !== trigger || record.content !== content) {
    const contentChanged = record.content !== content;
    if (contentChanged && record.open) hideContent(record);
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.trigger = trigger;
    record.content = content;
    if (!usesNativePopover(content)) content.hidden = !record.open;
    if (contentChanged && record.open) showContent(record);
  }

  identifyTitle(record);
  syncState(record, record.open);
  if (record.cleanups.length === 0) wire(record);
  if (record.open) position(record);
  return record;
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="popover"]')));
  for (const element of elements) {
    const popover = popoverRoot(element);
    if (popover) enhancePopover(popover);
  }
}

function resolveRoot(target: PopoverTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? popoverRoot(root.querySelector(target)) : popoverRoot(target);
  if (resolved) return resolved;
  throw new Error(`Popover target did not match a data-jqs="popover" element: ${String(target)}`);
}

function controlledPopover(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="popover"]')) return target;
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
  }
  const root = context.element?.closest('[data-jqs="popover"]') ?? null;
  const resolved = popoverRoot(root);
  if (resolved) return resolved;
  throw new Error('Popover action needs a root selector or an element inside data-jqs="popover".');
}

function registerActions(api: StarPopoverStatic, registerAction: ActionRegistrar): void {
  for (const operation of ["open", "close", "toggle"] as const) {
    registerAction(`ui.popover.${operation}`, (context) => {
      const root = controlledPopover(context, context.args?.[0]);
      return api[operation](root);
    });
  }
}

export function createPopovers(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): PopoverCollection {
  installGlobalListeners(host);
  const api: StarPopoverStatic = {
    open: (target) => openPopover(resolveRoot(target)),
    close: (target) => closePopover(resolveRoot(target)),
    toggle: (target) => togglePopover(resolveRoot(target)),
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}

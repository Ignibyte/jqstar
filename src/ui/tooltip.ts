import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { StarContext, StarTooltipStatic, TooltipTarget } from "../types";
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

interface TooltipRecord {
  cleanups: Array<() => void>;
  closeTimer: number | undefined;
  content: HTMLElement;
  describedById: string;
  focused: boolean;
  open: boolean;
  openTimer: number | undefined;
  pointed: boolean;
  root: HTMLElement;
  trigger: HTMLElement;
}

interface TooltipEventDetail {
  content: HTMLElement;
  tooltip: HTMLElement;
  trigger: HTMLElement;
}

interface TooltipCollection {
  api: StarTooltipStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, TooltipRecord>();
const activeRecords = new Set<TooltipRecord>();
let tooltipId = 0;

function tooltipRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="tooltip"]') ? value : undefined;
}

function directPart(root: HTMLElement, part: "trigger" | "content"): HTMLElement {
  const element = Array.from(root.children).find(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && child.getAttribute("data-part") === part,
  );
  if (!element) throw new Error(`Tooltip #${root.id} needs a direct data-part="${part}" child.`);
  return element;
}

function emit(
  record: TooltipRecord,
  name: "before-open" | "open" | "before-close" | "close",
  cancelable = false,
): boolean {
  const detail: TooltipEventDetail = {
    content: record.content,
    tooltip: record.root,
    trigger: record.trigger,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:tooltip:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
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

function clearTimer(record: TooltipRecord, timer: "openTimer" | "closeTimer"): void {
  if (record[timer] !== undefined) window.clearTimeout(record[timer]);
  record[timer] = undefined;
}

function syncState(record: TooltipRecord, open: boolean): void {
  record.open = open;
  if (open) {
    activeRecords.delete(record);
    activeRecords.add(record);
  } else {
    activeRecords.delete(record);
  }
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
}

function openTooltip(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceTooltip(root);
  clearTimer(record, "openTimer");
  clearTimer(record, "closeTimer");
  if (record.open || !emit(record, "before-open", true)) return root;
  record.root.dataset.state = "opening";
  record.content.dataset.state = "opening";
  showFloating(record.content);
  syncState(record, true);
  positionFloating(record.root, record.trigger, record.content, {
    align: "center",
    gap: 6,
    side: "top",
  });
  emit(record, "open");
  return root;
}

function closeTooltip(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceTooltip(root);
  clearTimer(record, "openTimer");
  clearTimer(record, "closeTimer");
  if (!record.open || !emit(record, "before-close", true)) return root;
  record.root.dataset.state = "closing";
  record.content.dataset.state = "closing";
  hideFloating(record.content);
  syncState(record, false);
  emit(record, "close");
  return root;
}

function scheduleOpen(record: TooltipRecord): void {
  clearTimer(record, "closeTimer");
  if (record.open || record.openTimer !== undefined) return;
  record.openTimer = window.setTimeout(
    () => {
      record.openTimer = undefined;
      if (record.focused || record.pointed) openTooltip(record.root);
    },
    delay(record.root, "data-delay", 400),
  );
}

function scheduleClose(record: TooltipRecord): void {
  clearTimer(record, "openTimer");
  if (!record.open || record.closeTimer !== undefined) return;
  record.closeTimer = window.setTimeout(
    () => {
      record.closeTimer = undefined;
      if (!record.focused && !record.pointed) closeTooltip(record.root);
    },
    delay(record.root, "data-close-delay", 100),
  );
}

function describedBy(trigger: HTMLElement, id: string, add: boolean): void {
  const tokens = new Set(
    (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean),
  );
  if (add) tokens.add(id);
  else tokens.delete(id);
  if (tokens.size > 0) trigger.setAttribute("aria-describedby", [...tokens].join(" "));
  else trigger.removeAttribute("aria-describedby");
}

function wire(record: TooltipRecord): void {
  const triggerEnter = (): void => {
    record.pointed = true;
    scheduleOpen(record);
  };
  const triggerLeave = (): void => {
    record.pointed = false;
    scheduleClose(record);
  };
  const focusIn = (): void => {
    record.focused = true;
    scheduleOpen(record);
  };
  const focusOut = (): void => {
    record.focused = false;
    scheduleClose(record);
  };
  const contentEnter = (): void => {
    record.pointed = true;
    clearTimer(record, "closeTimer");
  };
  const contentLeave = (): void => {
    record.pointed = false;
    scheduleClose(record);
  };
  record.trigger.addEventListener("pointerenter", triggerEnter);
  record.trigger.addEventListener("pointerleave", triggerLeave);
  record.trigger.addEventListener("focusin", focusIn);
  record.trigger.addEventListener("focusout", focusOut);
  record.content.addEventListener("pointerenter", contentEnter);
  record.content.addEventListener("pointerleave", contentLeave);
  record.cleanups.push(
    () => record.trigger.removeEventListener("pointerenter", triggerEnter),
    () => record.trigger.removeEventListener("pointerleave", triggerLeave),
    () => record.trigger.removeEventListener("focusin", focusIn),
    () => record.trigger.removeEventListener("focusout", focusOut),
    () => record.content.removeEventListener("pointerenter", contentEnter),
    () => record.content.removeEventListener("pointerleave", contentLeave),
  );
}

function installGlobalListeners(host: DocumentHost): void {
  const { document } = host;
  host.listen(document, "keydown", (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    const open = documentRecords(activeRecords, document);
    const record = open[open.length - 1];
    if (!record) return;
    event.preventDefault();
    closeTooltip(record.root);
  });
  host.listen(
    document,
    "pointerdown",
    (event) => {
      if (!(event.target instanceof Node)) return;
      for (const record of documentRecords(activeRecords, document)) {
        if (!record.root.isConnected) activeRecords.delete(record);
        else if (!record.root.contains(event.target)) closeTooltip(record.root);
      }
    },
    true,
  );
  const reposition = (): void => {
    for (const record of documentRecords(activeRecords, document)) {
      if (record.root.isConnected) {
        positionFloating(record.root, record.trigger, record.content, {
          align: "center",
          gap: 6,
          side: "top",
        });
      } else {
        activeRecords.delete(record);
      }
    }
  };
  listenToViewportChanges(host, reposition);
  host.own("service", "ui:tooltip:active-records", documentRecordCleanup(activeRecords, document));
}

function assertNonInteractive(content: HTMLElement): void {
  if (
    content.querySelector(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
  ) {
    throw new Error("Tooltip content cannot be interactive; use Popover for interactive content.");
  }
}

function enhanceTooltip(root: HTMLElement): TooltipRecord {
  root.id ||= `jqs-tooltip-${++tooltipId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  content.id ||= `${root.id}-content`;
  assertNonInteractive(content);
  prepareFloating(content);
  content.setAttribute("role", "tooltip");

  let record = records.get(root);
  if (!record) {
    record = {
      cleanups: [],
      closeTimer: undefined,
      content,
      describedById: content.id,
      focused: false,
      open: false,
      openTimer: undefined,
      pointed: false,
      root,
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
    describedBy(record.trigger, record.describedById, false);
    record.cleanups = [];
    record.trigger = trigger;
    record.content = content;
    record.describedById = content.id;
    if (!usesNativePopover(content)) content.hidden = !record.open;
    if (contentChanged && record.open) showFloating(content);
  }

  describedBy(record.trigger, record.describedById, true);
  syncState(record, record.open);
  if (record.cleanups.length === 0) wire(record);
  if (record.open) {
    positionFloating(record.root, record.trigger, record.content, {
      align: "center",
      gap: 6,
      side: "top",
    });
  }
  return record;
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="tooltip"]')));
  for (const element of elements) {
    const tooltip = tooltipRoot(element);
    if (tooltip) enhanceTooltip(tooltip);
  }
}

function resolveRoot(target: TooltipTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? tooltipRoot(root.querySelector(target)) : tooltipRoot(target);
  if (resolved) return resolved;
  throw new Error(`Tooltip target did not match a data-jqs="tooltip" element: ${String(target)}`);
}

function controlledTooltip(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="tooltip"]')) return target;
  if (typeof target === "string") {
    const local = context.root.querySelector(target);
    return resolveRoot(local instanceof HTMLElement ? local : target);
  }
  const root = context.element?.closest('[data-jqs="tooltip"]') ?? null;
  const resolved = tooltipRoot(root);
  if (resolved) return resolved;
  throw new Error('Tooltip action needs a root selector or an element inside data-jqs="tooltip".');
}

function registerActions(api: StarTooltipStatic, registerAction: ActionRegistrar): void {
  for (const operation of ["open", "close"] as const) {
    registerAction(`ui.tooltip.${operation}`, (context) => {
      const root = controlledTooltip(context, context.args?.[0]);
      return api[operation](root);
    });
  }
}

export function createTooltips(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): TooltipCollection {
  installGlobalListeners(host);
  const api: StarTooltipStatic = {
    open: (target) => openTooltip(resolveRoot(target)),
    close: (target) => closeTooltip(resolveRoot(target)),
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}

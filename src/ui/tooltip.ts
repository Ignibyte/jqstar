import { isElementNode, isHTMLElement, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { TooltipTarget, StarContext, StarTooltipStatic } from "../types";
import {
  afterFloating,
  callFloating,
  floatingBusy,
  claimFloatingContent,
  currentFloatingOwner,
  floatingOpen,
  reconcileFloating,
  listenToViewportChanges,
  positionFloating,
  prepareFloating,
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

interface TooltipPending {
  open: boolean;
  deadline: number;
  cancel: () => void;
}
interface TooltipRecord extends UIResources {
  content: HTMLElement;
  trigger: HTMLElement;
  open: boolean;
  focused: boolean;
  pointed: boolean;
  nativeDepth: number;
  describedById: string;
  describedByOwned: boolean;
  pending: TooltipPending | undefined;
}
interface TooltipSnapshot {
  document: Document;
  trigger: HTMLElement;
  content: HTMLElement;
  open: boolean;
  focused: boolean;
  pointed: boolean;
  pending: Pick<TooltipPending, "open" | "deadline"> | undefined;
}
interface TooltipCollection {
  api: StarTooltipStatic;
  enhance(root: ParentNode): void;
}
const records = new WeakMap<HTMLElement, TooltipRecord>();
const activeRecords = new Set<TooltipRecord>();
const retained = new WeakMap<HTMLElement, TooltipSnapshot>();
const intents = new WeakMap<HTMLElement, number>();
let tooltipId = 0;

function tooltipRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="tooltip"]') ? value : undefined;
}
function part(root: HTMLElement, name: "trigger" | "content"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === name,
  );
}
function directPart(root: HTMLElement, name: "trigger" | "content"): HTMLElement {
  const element = part(root, name);
  if (!element) throw new Error(`Tooltip #${root.id} needs a direct data-part="${name}" child.`);
  return element;
}
function owned(record: TooltipRecord, element: Element): boolean {
  return element.closest('[data-jqs]:not(button[data-jqs="button"])') === record.root;
}
function current(record: TooltipRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    !!tooltipRoot(record.root) &&
    part(record.root, "trigger") === record.trigger &&
    part(record.root, "content") === record.content
  );
}
function currentState(record: TooltipRecord, revision: number, open: boolean): boolean {
  return current(record, revision) && record.open === open;
}
function unavailable(record: TooltipRecord): boolean {
  return [record.root, record.trigger].some(
    (element) =>
      element.hasAttribute("disabled") ||
      element.matches(":disabled") ||
      element.getAttribute("aria-disabled") === "true" ||
      (element.dataset.disabled !== undefined && element.dataset.disabled !== "false") ||
      element.closest("[inert]") !== null,
  );
}
function intent(root: HTMLElement): number {
  const next = (intents.get(root) ?? 0) + 1;
  intents.set(root, next);
  return next;
}
function snapshot(record: TooltipRecord): TooltipSnapshot {
  return {
    document: record.document,
    trigger: record.trigger,
    content: record.content,
    open: record.open,
    focused: record.focused,
    pointed: record.pointed,
    pending: record.pending
      ? { open: record.pending.open, deadline: record.pending.deadline }
      : undefined,
  };
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
function emit(
  record: TooltipRecord,
  name: "before-open" | "open" | "before-close" | "close",
  cancelable = false,
): boolean {
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:tooltip:${name}`, {
      bubbles: true,
      cancelable,
      detail: { content: record.content, tooltip: record.root, trigger: record.trigger },
    }),
  );
}
function show(record: TooltipRecord, revision: number): boolean {
  if (!current(record, revision) || unavailable(record)) return false;
  syncState(record, true);
  record.root.dataset.state = "opening";
  record.content.dataset.state = "opening";
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
  if (!current(record, revision) || !record.open) {
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
function position(record: TooltipRecord, revision = record.revision): void {
  if (current(record, revision) && record.open)
    positionFloating(
      record.root,
      record.trigger,
      record.content,
      { align: "center", gap: 6, side: "top" },
      () => current(record, revision) && record.open && !unavailable(record),
    );
}
function openRecord(record: TooltipRecord, revision: number): void {
  if (
    record.open &&
    !record.nativeDepth &&
    !floatingBusy(record.content) &&
    floatingOpen(record.content) === false
  )
    syncState(record, false);
  if (
    record.open ||
    unavailable(record) ||
    !emit(record, "before-open", true) ||
    !current(record, revision) ||
    unavailable(record)
  )
    return;
  if (!show(record, revision)) return;
  afterFloating(record, revision, () => {
    position(record, revision);
    if (!currentState(record, revision, true) || unavailable(record)) return;
    if (currentState(record, revision, true) && !unavailable(record)) emit(record, "open");
  });
}
function closeRecord(record: TooltipRecord, revision: number): void {
  if (!record.open || !emit(record, "before-close", true) || !current(record, revision)) return;
  syncState(record, false);
  record.root.dataset.state = "closing";
  record.content.dataset.state = "closing";
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
    if (currentState(record, revision, false)) emit(record, "close");
  });
}
function delay(root: HTMLElement, opening: boolean): number {
  const raw = root.getAttribute(opening ? "data-delay" : "data-close-delay");
  const fallback = opening ? 400 : 100;
  const value = raw === null ? fallback : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
function schedule(
  record: TooltipRecord,
  opening: boolean,
  deadline = Date.now() + delay(record.root, opening),
): void {
  if (record.pending?.open === opening) return;
  const revision = record.revision;
  record.pending?.cancel();
  if (!current(record, revision) || record.open === opening || (opening && unavailable(record)))
    return;
  let timer: number | undefined;
  let active = true;
  const pending: TooltipPending = { open: opening, deadline, cancel };
  function cancel(): void {
    active = false;
    if (record.pending === pending) record.pending = undefined;
    record.cleanups.delete(cancel);
    const handle = timer;
    timer = undefined;
    if (handle !== undefined) record.window.clearTimeout(handle);
  }
  const valid = (): boolean => active && current(record) && record.pending === pending;
  record.pending = pending;
  acquireUIResource(
    record,
    valid,
    () => {
      timer = record.window.setTimeout(
        () => {
          const accepted =
            valid() &&
            (opening ? record.focused || record.pointed : !record.focused && !record.pointed);
          const revision = record.revision;
          cancel();
          if (accepted && current(record, revision))
            operate(record.root, opening ? "open" : "close");
        },
        Math.max(0, deadline - Date.now()),
      );
    },
    cancel,
  );
}
function describedBy(trigger: HTMLElement, id: string, add: boolean): void {
  const tokens = new Set(
    (trigger.getAttribute("aria-describedby") ?? "").split(/\s+/).filter(Boolean),
  );
  if (add) tokens.add(id);
  else tokens.delete(id);
  const value = [...tokens].join(" ");
  if (value) {
    if (trigger.getAttribute("aria-describedby") !== value)
      trigger.setAttribute("aria-describedby", value);
  } else trigger.removeAttribute("aria-describedby");
}
function metadata(record: TooltipRecord): void {
  const { content, trigger } = record;
  if (
    content.querySelector(
      'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])',
    )
  )
    throw new Error("Tooltip content cannot be interactive; use Popover for interactive content.");
  content.id ||= `${record.root.id}-content`;
  prepareFloating(content);
  content.setAttribute("role", "tooltip");
  if (record.describedById !== content.id) {
    if (record.describedByOwned) describedBy(trigger, record.describedById, false);
    record.describedById = content.id;
    record.describedByOwned = false;
  }
  record.describedByOwned ||= !(trigger.getAttribute("aria-describedby") ?? "")
    .split(/\s+/)
    .includes(content.id);
  describedBy(trigger, content.id, true);
}
function wire(record: TooltipRecord): void {
  const valid = (): boolean => current(record);
  const interaction = (
    event: Event,
    field: "pointed" | "focused",
    active: boolean,
    opening: boolean,
  ): void => {
    if (event.defaultPrevented || !isElementNode(event.target) || !owned(record, event.target))
      return;
    if (
      active &&
      (unavailable(record) ||
        event.target.closest(
          ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]',
        ))
    )
      return;
    if (
      field === "focused" &&
      !active &&
      isNode((event as FocusEvent).relatedTarget) &&
      record.trigger.contains((event as FocusEvent).relatedTarget as Node)
    )
      return;
    intent(record.root);
    record.revision++;
    record[field] = active;
    if (opening) schedule(record, true);
    else if (!record.focused && !record.pointed) schedule(record, false);
    else if (record.pending?.open === false) record.pending.cancel();
  };
  listenUI(record, valid, record.trigger, "pointerenter", (event) =>
    interaction(event, "pointed", true, true),
  );
  listenUI(record, valid, record.trigger, "pointerleave", (event) =>
    interaction(event, "pointed", false, false),
  );
  listenUI(record, valid, record.trigger, "focusin", (event) =>
    interaction(event, "focused", true, true),
  );
  listenUI(record, valid, record.trigger, "focusout", (event) =>
    interaction(event, "focused", false, false),
  );
  listenUI(record, valid, record.content, "pointerenter", (event) =>
    interaction(event, "pointed", true, false),
  );
  listenUI(record, valid, record.content, "pointerleave", (event) =>
    interaction(event, "pointed", false, false),
  );
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
    record.pending?.cancel();
    if (current(record, revision)) syncState(record, open);
  });
}
function enhanceTooltip(root: HTMLElement, refresh = true): TooltipRecord {
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
    )
      show(existing, existing.revision);
    if (refresh) position(existing);
    return existing;
  }
  const saved = existing ? snapshot(existing) : retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && !uiActive(root)) return existing;
  root.id ||= `jqs-tooltip-${++tooltipId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  const restore = saved && (existing || saved.document !== root.ownerDocument);
  const sameParts = restore && saved.trigger === trigger && saved.content === content;
  const record: TooltipRecord = {
    ...uiResources(root),
    trigger,
    content,
    open: false,
    focused: !!sameParts && saved.focused,
    pointed: !!sameParts && saved.pointed,
    pending: undefined,
    nativeDepth: 0,
    describedById: "",
    describedByOwned: false,
  };
  let initialized = false;
  record.cleanups.add(() => {
    retained.set(root, snapshot(record));
    activeRecords.delete(record);
  });
  record.cleanups.add(() => {
    const latest = records.get(root);
    if (
      record.describedByOwned &&
      !(latest?.trigger === trigger && latest.describedById === record.describedById)
    )
      describedBy(trigger, record.describedById, false);
  });
  record.cleanups.add(() => {
    const wasOpen = record.open;
    record.open = false;
    if (!initialized && !wasOpen) return;
    const latest = records.get(root);
    const owner = currentFloatingOwner(content);
    if (!latest && owner?.root !== root) root.dataset.state = "closed";
    if ((!latest || latest.content !== content) && owner?.content !== content) {
      content.dataset.state = "closed";
      if (wasOpen) {
        callFloating(content, false);
        reconcileFloating(record.content, false);
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
      afterFloating(record, revision, () => position(record, revision));
    if (!current(record)) return record;
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
    if (sameParts && saved.pending && current(record, revision))
      schedule(record, saved.pending.open, saved.pending.deadline);
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function operate(root: HTMLElement, operation: "open" | "close"): HTMLElement {
  const requested = intent(root);
  const record = enhanceTooltip(root, false);
  if (intents.get(root) !== requested || !current(record)) return root;
  const revision = ++record.revision;
  record.pending?.cancel();
  if (!current(record, revision)) return root;
  if (!record.nativeDepth && !floatingBusy(record.content)) {
    const native = floatingOpen(record.content);
    if (native !== undefined) syncState(record, native);
  }
  if (operation === "close") closeRecord(record, revision);
  else openRecord(record, revision);
  return root;
}
function installGlobalListeners(host: DocumentHost): void {
  const ownedRecords = (): TooltipRecord[] =>
    [...activeRecords].filter((record) => record.document === host.document && current(record));
  host.listen(
    host.document,
    "pointerdown",
    (event) => {
      if (event.defaultPrevented || !isNode(event.target)) return;
      for (const record of ownedRecords()) {
        if (current(record) && !record.root.contains(event.target)) operate(record.root, "close");
      }
    },
    true,
  );
  host.listen(host.document, "keydown", (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing || event.key !== "Escape") return;
    const record = ownedRecords().at(-1);
    if (!record) return;
    event.preventDefault();
    operate(record.root, "close");
  });
  listenToViewportChanges(host, () => {
    for (const record of ownedRecords()) position(record);
  });
}
function enhanceTree(root: ParentNode): void {
  for (const element of uiElements(root, '[data-jqs="tooltip"]')) {
    const tooltip = tooltipRoot(element);
    if (tooltip) enhanceTooltip(tooltip);
  }
}
function resolveRoot(target: TooltipTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? tooltipRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : tooltipRoot(target);
  if (resolved) return resolved;
  throw new Error(`Tooltip target did not match a data-jqs="tooltip" element: ${String(target)}`);
}
function controlledTooltip(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveRoot(target, context.root);
  if (typeof target === "string") return resolveRoot(target, context.root);
  const resolved = tooltipRoot(context.element?.closest('[data-jqs="tooltip"]') ?? null);
  if (resolved) return resolved;
  throw new Error('Tooltip action needs a root selector or an element inside data-jqs="tooltip".');
}
export function createTooltips(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): TooltipCollection {
  installGlobalListeners(host);
  const api: StarTooltipStatic = {
    open: (target) => operate(resolveRoot(target), "open"),
    close: (target) => operate(resolveRoot(target), "close"),
  };
  for (const operation of ["open", "close"] as const)
    registerAction(`ui.tooltip.${operation}`, (context) =>
      api[operation](controlledTooltip(context, context.args?.[0])),
    );
  return { api, enhance: enhanceTree };
}

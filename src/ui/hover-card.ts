import { isElementNode, isHTMLElement, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { HoverCardTarget, StarContext, StarHoverCardStatic } from "../types";
import {
  afterFloating,
  callFloating,
  floatingBusy,
  copyGeneratedAttributes,
  identifyLabel,
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

interface HoverCardPending {
  open: boolean;
  deadline: number;
  cancel: () => void;
}
interface HoverCardRecord extends UIResources {
  content: HTMLElement;
  trigger: HTMLElement;
  open: boolean;
  focused: boolean;
  pointed: boolean;
  nativeDepth: number;
  focusTarget: HTMLElement | undefined;
  focusReturnRevision: number | undefined;
  pending: HoverCardPending | undefined;
}
interface HoverCardSnapshot {
  focusTarget: HTMLElement | undefined;
  document: Document;
  trigger: HTMLElement;
  content: HTMLElement;
  open: boolean;
  focused: boolean;
  pointed: boolean;
  pending: Pick<HoverCardPending, "open" | "deadline"> | undefined;
}
interface HoverCardCollection {
  api: StarHoverCardStatic;
  enhance(root: ParentNode): void;
}
const records = new WeakMap<HTMLElement, HoverCardRecord>();
const activeRecords = new Set<HoverCardRecord>();
const retained = new WeakMap<HTMLElement, HoverCardSnapshot>();
const intents = new WeakMap<HTMLElement, number>();
let hoverCardId = 0;

function hoverCardRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="hover-card"]') ? value : undefined;
}
function part(root: HTMLElement, name: "trigger" | "content"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === name,
  );
}
function directPart(root: HTMLElement, name: "trigger" | "content"): HTMLElement {
  const element = part(root, name);
  if (!element) throw new Error(`Hover Card #${root.id} needs a direct data-part="${name}" child.`);
  return element;
}
function owned(record: HoverCardRecord, element: Element): boolean {
  return element.closest('[data-jqs]:not(button[data-jqs="button"])') === record.root;
}
function current(record: HoverCardRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    !!hoverCardRoot(record.root) &&
    part(record.root, "trigger") === record.trigger &&
    part(record.root, "content") === record.content
  );
}
function currentState(record: HoverCardRecord, revision: number, open: boolean): boolean {
  return current(record, revision) && record.open === open;
}
function unavailable(record: HoverCardRecord): boolean {
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
function snapshot(record: HoverCardRecord): HoverCardSnapshot {
  const active = record.document.activeElement;
  return {
    focusTarget:
      isHTMLElement(active) && record.content.contains(active) ? active : record.focusTarget,
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
function syncState(record: HoverCardRecord, open: boolean): void {
  record.open = open;
  if (open) {
    activeRecords.delete(record);
    activeRecords.add(record);
  } else {
    activeRecords.delete(record);
    record.focusTarget = undefined;
  }
  record.trigger.setAttribute("aria-expanded", String(open));
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
}
function emit(
  record: HoverCardRecord,
  name: "before-open" | "open" | "before-close" | "close",
  cancelable = false,
): boolean {
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:hover-card:${name}`,
      {
        bubbles: true,
        cancelable,
        detail: { content: record.content, hoverCard: record.root, trigger: record.trigger },
      },
    ),
  );
}
function show(record: HoverCardRecord, revision: number): boolean {
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
function position(record: HoverCardRecord, revision = record.revision): void {
  if (current(record, revision) && record.open)
    positionFloating(
      record.root,
      record.trigger,
      record.content,
      { align: "start", gap: 8, side: "bottom" },
      () => current(record, revision) && record.open && !unavailable(record),
    );
}
function openRecord(record: HoverCardRecord, revision: number): void {
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
function closeRecord(record: HoverCardRecord, revision: number): void {
  if (!record.open || !emit(record, "before-close", true) || !current(record, revision)) return;
  const returnFocus = record.content.contains(record.document.activeElement);
  record.focusReturnRevision = revision;
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
    try {
      if (floatingOpen(record.content) === true) {
        syncState(record, true);
        return;
      }
      syncState(record, false);
      if (returnFocus && record.trigger.isConnected && !unavailable(record)) record.trigger.focus();
      if (currentState(record, revision, false)) emit(record, "close");
    } finally {
      if (record.focusReturnRevision === revision) record.focusReturnRevision = undefined;
    }
  });
}
function delay(root: HTMLElement, opening: boolean): number {
  const raw = root.getAttribute(opening ? "data-delay" : "data-close-delay");
  const fallback = opening ? 300 : 120;
  const value = raw === null ? fallback : Number(raw);
  return Number.isFinite(value) && value >= 0 ? value : fallback;
}
function schedule(
  record: HoverCardRecord,
  opening: boolean,
  deadline = Date.now() + delay(record.root, opening),
): void {
  if (record.pending?.open === opening) return;
  const revision = record.revision;
  record.pending?.cancel();
  if (!current(record, revision) || record.open === opening || (opening && unavailable(record)))
    return;
  const connected = record.root.isConnected;
  let timer: number | undefined;
  let active = true;
  const pending: HoverCardPending = { open: opening, deadline, cancel };
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
            (!connected || record.root.isConnected) &&
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
function metadata(record: HoverCardRecord): void {
  record.content.id ||= `${record.root.id}-content`;
  prepareFloating(record.content);
  record.trigger.setAttribute("aria-controls", record.content.id);
  const title = Array.from(
    record.content.querySelectorAll<HTMLElement>('[data-part="title"]'),
  ).find((element) => isHTMLElement(element) && owned(record, element));
  if (title) title.id ||= `${record.root.id}-title`;
  identifyLabel(record.content, title?.id);
}
function wire(record: HoverCardRecord): void {
  const valid = (): boolean => current(record);
  const interaction = (event: Event, field: "pointed" | "focused", active: boolean): void => {
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
    if (field === "focused") {
      if (!active) {
        if (!record.root.isConnected || (record.open && floatingOpen(record.content) === false))
          return;
        const next = (event as FocusEvent).relatedTarget;
        if (isNode(next) && (record.trigger.contains(next) || record.content.contains(next)))
          return;
      }
      record.focusTarget =
        active && isHTMLElement(event.target) && record.content.contains(event.target)
          ? event.target
          : undefined;
      if (record.focusReturnRevision === record.revision) {
        record.focused = active;
        return;
      }
    }
    intent(record.root);
    record.revision++;
    record[field] = active;
    if (active) schedule(record, true);
    else if (!record.focused && !record.pointed) schedule(record, false);
    else if (record.pending?.open === false) record.pending.cancel();
  };
  for (const element of [record.trigger, record.content]) {
    listenUI(record, valid, element, "pointerenter", (event) =>
      interaction(event, "pointed", true),
    );
    listenUI(record, valid, element, "pointerleave", (event) =>
      interaction(event, "pointed", false),
    );
    listenUI(record, valid, element, "focusin", (event) => interaction(event, "focused", true));
    listenUI(record, valid, element, "focusout", (event) => interaction(event, "focused", false));
  }
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
function restoreFocus(
  record: HoverCardRecord,
  revision: number,
  target: HTMLElement | undefined,
): void {
  if (target && currentState(record, revision, true) && record.content.contains(target)) {
    target.focus();
    const active = record.document.activeElement;
    record.focusTarget =
      isHTMLElement(active) && record.content.contains(active) ? active : undefined;
  }
}
function enhanceHoverCard(root: HTMLElement, refresh = true): HoverCardRecord {
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
      const target = existing.focusTarget;
      const revision = existing.revision;
      if (show(existing, revision))
        afterFloating(existing, revision, () => restoreFocus(existing, revision, target));
    }
    if (refresh) position(existing);
    return existing;
  }
  const saved = existing ? snapshot(existing) : retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && !uiActive(root)) return existing;
  root.id ||= `jqs-hover-card-${++hoverCardId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  if (existing) copyGeneratedAttributes(existing.content, content);
  const restore = saved && (existing || saved.document !== root.ownerDocument);
  const sameParts = restore && saved.trigger === trigger && saved.content === content;
  const record: HoverCardRecord = {
    ...uiResources(root),
    trigger,
    content,
    open: false,
    focused: !!sameParts && saved.focused,
    pointed: !!sameParts && saved.pointed,
    pending: undefined,
    nativeDepth: 0,
    focusTarget: undefined,
    focusReturnRevision: undefined,
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
    if ((!latest || latest.trigger !== trigger) && owner?.trigger !== trigger)
      trigger.setAttribute("aria-expanded", "false");
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
      afterFloating(record, revision, () => {
        position(record, revision);
        if (saved.document !== record.document) restoreFocus(record, revision, saved.focusTarget);
      });
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
  const record = enhanceHoverCard(root, false);
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
  const ownedRecords = (): HoverCardRecord[] =>
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
  for (const element of uiElements(root, '[data-jqs="hover-card"]')) {
    const hoverCard = hoverCardRoot(element);
    if (hoverCard) enhanceHoverCard(hoverCard);
  }
}
function resolveRoot(target: HoverCardTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? hoverCardRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : hoverCardRoot(target);
  if (resolved) return resolved;
  throw new Error(
    `Hover Card target did not match a data-jqs="hover-card" element: ${String(target)}`,
  );
}
function controlledHoverCard(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveRoot(target, context.root);
  if (typeof target === "string") return resolveRoot(target, context.root);
  const resolved = hoverCardRoot(context.element?.closest('[data-jqs="hover-card"]') ?? null);
  if (resolved) return resolved;
  throw new Error(
    'Hover Card action needs a root selector or an element inside data-jqs="hover-card".',
  );
}
export function createHoverCards(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): HoverCardCollection {
  installGlobalListeners(host);
  const api: StarHoverCardStatic = {
    open: (target) => operate(resolveRoot(target), "open"),
    close: (target) => operate(resolveRoot(target), "close"),
  };
  for (const operation of ["open", "close"] as const)
    registerAction(`ui.hover-card.${operation}`, (context) =>
      api[operation](controlledHoverCard(context, context.args?.[0])),
    );
  return { api, enhance: enhanceTree };
}

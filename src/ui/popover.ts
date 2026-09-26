import { isElementNode, isHTMLElement, isNode } from "../dom";
import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { PopoverTarget, StarContext, StarPopoverStatic } from "../types";
import {
  copyGeneratedAttributes,
  afterFloating,
  callFloating,
  floatingBusy,
  claimFloatingContent,
  currentFloatingOwner,
  floatingOpen,
  reconcileFloating,
  identifyLabel,
  listenToViewportChanges,
  positionFloating,
  prepareFloating,
  usesNativePopover,
} from "./floating";
import {
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

interface PopoverRecord extends UIResources {
  content: HTMLElement;
  open: boolean;
  trigger: HTMLElement;
  clickAction: boolean;
  focused: HTMLElement | undefined;
  nativeDepth: number;
}
interface PopoverSnapshot {
  document: Document;
  open: boolean;
  focused: HTMLElement | undefined;
}
interface PopoverCollection {
  api: StarPopoverStatic;
  enhance(root: ParentNode): void;
}
const records = new WeakMap<HTMLElement, PopoverRecord>();
const activeRecords = new Set<PopoverRecord>();
const retained = new WeakMap<HTMLElement, PopoverSnapshot>();
const intents = new WeakMap<HTMLElement, number>();
let popoverId = 0;

function popoverRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="popover"]') ? value : undefined;
}
function part(root: HTMLElement, name: "trigger" | "content"): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === name,
  );
}
function directPart(root: HTMLElement, name: "trigger" | "content"): HTMLElement {
  const element = part(root, name);
  if (!element) throw new Error(`Popover #${root.id} needs a direct data-part="${name}" child.`);
  return element;
}
function owned(record: PopoverRecord, element: Element): boolean {
  return element.closest('[data-jqs]:not(button[data-jqs="button"])') === record.root;
}
function hasClickAction(trigger: HTMLElement): boolean {
  return trigger.hasAttribute("data-on:click");
}
function current(record: PopoverRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    !!popoverRoot(record.root) &&
    part(record.root, "trigger") === record.trigger &&
    part(record.root, "content") === record.content &&
    hasClickAction(record.trigger) === record.clickAction
  );
}
function currentState(record: PopoverRecord, revision: number, open: boolean): boolean {
  return current(record, revision) && record.open === open;
}
function unavailable(record: PopoverRecord): boolean {
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
function snapshot(record: PopoverRecord): PopoverSnapshot {
  const active = record.document.activeElement;
  return {
    document: record.document,
    open: record.open,
    focused: isHTMLElement(active) && record.content.contains(active) ? active : record.focused,
  };
}
function syncState(record: PopoverRecord, open: boolean): void {
  record.open = open;
  if (open) {
    activeRecords.delete(record);
    activeRecords.add(record);
  } else {
    activeRecords.delete(record);
    record.focused = undefined;
  }
  record.root.dataset.state = open ? "open" : "closed";
  record.content.dataset.state = open ? "open" : "closed";
  record.trigger.setAttribute("aria-expanded", String(open));
}
function emit(
  record: PopoverRecord,
  name: "before-open" | "open" | "before-close" | "close",
  cancelable = false,
): boolean {
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:popover:${name}`, {
      bubbles: true,
      cancelable,
      detail: { content: record.content, popover: record.root, trigger: record.trigger },
    }),
  );
}
function show(record: PopoverRecord, revision: number): boolean {
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
function position(record: PopoverRecord, revision = record.revision): void {
  if (current(record, revision) && record.open)
    positionFloating(
      record.root,
      record.trigger,
      record.content,
      {},
      () => current(record, revision) && record.open && !unavailable(record),
    );
}
function openRecord(record: PopoverRecord, revision: number): void {
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
    const selector = record.root.getAttribute("data-initial-focus");
    const target = selector ? record.content.querySelector<HTMLElement>(selector) : null;
    if (isHTMLElement(target) && !target.matches(':disabled,[aria-disabled="true"]'))
      target.focus();
    if (currentState(record, revision, true) && !unavailable(record)) emit(record, "open");
  });
}
function closeRecord(record: PopoverRecord, revision: number): void {
  if (!record.open || !emit(record, "before-close", true) || !current(record, revision)) return;
  const returnFocus = record.content.contains(record.document.activeElement);
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
    if (returnFocus && record.trigger.isConnected && !unavailable(record)) record.trigger.focus();
    if (currentState(record, revision, false)) emit(record, "close");
  });
}
function metadata(record: PopoverRecord): void {
  record.content.id ||= `${record.root.id}-content`;
  prepareFloating(record.content);
  record.content.setAttribute("role", record.content.getAttribute("role") || "dialog");
  record.trigger.setAttribute("aria-controls", record.content.id);
  record.trigger.setAttribute("aria-haspopup", record.content.getAttribute("role") || "dialog");
  const title = Array.from(
    record.content.querySelectorAll<HTMLElement>('[data-part="title"]'),
  ).find((element) => isHTMLElement(element) && owned(record, element));
  if (title) title.id ||= `${record.root.id}-title`;
  identifyLabel(record.content, title?.id);
}
function wire(record: PopoverRecord): void {
  const valid = (): boolean => current(record);
  if (!record.clickAction)
    listenUI(record, valid, record.trigger, "click", (event) => {
      if (
        event.defaultPrevented ||
        !isElementNode(event.target) ||
        !owned(record, event.target) ||
        event.target.closest(
          ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]',
        ) ||
        unavailable(record)
      )
        return;
      operate(record.root, "toggle");
    });
  listenUI(record, valid, record.content, "focusin", (event) => {
    if (isHTMLElement(event.target)) record.focused = event.target;
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
    record.revision++;
    syncState(record, open);
  });
}
function enhancePopover(root: HTMLElement, refresh = true): PopoverRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    metadata(existing);
    if (
      refresh &&
      !existing.nativeDepth &&
      !floatingBusy(existing.content) &&
      existing.root.isConnected &&
      existing.open &&
      floatingOpen(existing.content) === false &&
      !unavailable(existing)
    ) {
      const focused = existing.focused;
      const revision = existing.revision;
      if (
        show(existing, revision) &&
        focused &&
        currentState(existing, revision, true) &&
        existing.content.contains(focused)
      )
        afterFloating(existing, revision, () => focused.focus());
    }
    if (refresh) position(existing);
    return existing;
  }
  const saved = existing ? snapshot(existing) : retained.get(root);
  existing?.cleanup();
  const replacement = records.get(root);
  if (replacement) return replacement;
  if (existing && !uiActive(root)) return existing;
  root.id ||= `jqs-popover-${++popoverId}`;
  const trigger = directPart(root, "trigger");
  const content = directPart(root, "content");
  if (existing) copyGeneratedAttributes(existing.content, content);
  const record: PopoverRecord = {
    ...uiResources(root),
    trigger,
    content,
    clickAction: hasClickAction(trigger),
    open: false,
    focused: undefined,
    nativeDepth: 0,
  };
  let initialized = false;
  record.cleanups.add(() => {
    retained.set(root, snapshot(record));
    const wasOpen = record.open;
    activeRecords.delete(record);
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
    if (
      saved?.open &&
      (existing || saved.document !== record.document) &&
      !unavailable(record) &&
      show(record, revision)
    ) {
      afterFloating(record, revision, () => {
        position(record, revision);
        if (
          current(record, revision) &&
          record.open &&
          saved.focused &&
          content.contains(saved.focused) &&
          saved.document !== record.document
        ) {
          saved.focused.focus();
          const focused = record.document.activeElement;
          record.focused =
            isHTMLElement(focused) && content.contains(focused) ? focused : undefined;
        }
      });
    }
    if (!current(record)) return record;
    wire(record);
    if (!current(record)) throw new Error("This UI root cannot acquire resources.");
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function operate(root: HTMLElement, operation: "open" | "close" | "toggle"): HTMLElement {
  const requested = intent(root);
  const record = enhancePopover(root, false);
  if (intents.get(root) !== requested || !current(record)) return root;
  const revision = ++record.revision;
  if (!record.nativeDepth && !floatingBusy(record.content)) {
    const native = floatingOpen(record.content);
    if (native !== undefined) syncState(record, native);
  }
  if (operation === "close" || (operation === "toggle" && record.open))
    closeRecord(record, revision);
  else openRecord(record, revision);
  return root;
}
function installGlobalListeners(host: DocumentHost): void {
  const ownedRecords = (): PopoverRecord[] =>
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
  for (const element of uiElements(root, '[data-jqs="popover"]')) {
    const popover = popoverRoot(element);
    if (popover) enhancePopover(popover);
  }
}
function resolveRoot(target: PopoverTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? popoverRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : popoverRoot(target);
  if (resolved) return resolved;
  throw new Error(`Popover target did not match a data-jqs="popover" element: ${String(target)}`);
}
function controlledPopover(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolveRoot(target, context.root);
  if (typeof target === "string") return resolveRoot(target, context.root);
  const resolved = popoverRoot(context.element?.closest('[data-jqs="popover"]') ?? null);
  if (resolved) return resolved;
  throw new Error('Popover action needs a root selector or an element inside data-jqs="popover".');
}
export function createPopovers(
  host: DocumentHost,
  registerAction: ActionRegistrar,
): PopoverCollection {
  installGlobalListeners(host);
  const api: StarPopoverStatic = {
    open: (target) => operate(resolveRoot(target), "open"),
    close: (target) => operate(resolveRoot(target), "close"),
    toggle: (target) => operate(resolveRoot(target), "toggle"),
  };
  for (const operation of ["open", "close", "toggle"] as const)
    registerAction(`ui.popover.${operation}`, (context) =>
      api[operation](controlledPopover(context, context.args?.[0])),
    );
  return { api, enhance: enhanceTree };
}

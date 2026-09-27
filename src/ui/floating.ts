import type { DocumentHost } from "../kernel";
import { uiWindow, type UIResources } from "./lifecycle";

interface DocumentRecord {
  readonly root: Element;
}

interface NativeFloatingRecord extends UIResources {
  content: HTMLElement;
  trigger: HTMLElement;
  open: boolean;
  nativeDepth: number;
}
interface NativeFloatingOwner {
  record: NativeFloatingRecord;
  current: (revision?: number) => boolean;
  available: () => boolean;
  sync: (open: boolean) => void;
  completions: Array<{ revision: number; open: boolean; run: () => void }>;
}
const floatingOwners = new WeakMap<HTMLElement, NativeFloatingOwner>();
const reconciling = new WeakSet<HTMLElement>();
const nativeCalls = new WeakSet<HTMLElement>();

export function currentFloatingOwner(content: HTMLElement): NativeFloatingRecord | undefined {
  const owner = floatingOwners.get(content);
  return owner?.current() ? owner.record : undefined;
}

export function claimFloatingContent(
  record: NativeFloatingRecord,
  current: NativeFloatingOwner["current"],
  available: NativeFloatingOwner["available"],
  sync: NativeFloatingOwner["sync"],
): void {
  if (!current()) return;
  const previous = floatingOwners.get(record.content);
  if (previous?.record === record) return;
  const owner: NativeFloatingOwner = { record, current, available, sync, completions: [] };
  record.cleanups.add(() => {
    owner.completions.length = 0;
    if (floatingOwners.get(record.content) === owner) floatingOwners.delete(record.content);
  });
  floatingOwners.set(record.content, owner);
  previous?.record.cleanup();
}

export function floatingOpen(content: HTMLElement): boolean | undefined {
  if (!usesNativePopover(content)) return undefined;
  try {
    return content.matches(":popover-open");
  } catch {
    return undefined;
  }
}

export function floatingBusy(content: HTMLElement): boolean {
  return nativeCalls.has(content);
}

export function callFloating(content: HTMLElement, opening: boolean): void {
  if (floatingBusy(content)) return;
  nativeCalls.add(content);
  try {
    if (opening) showFloating(content);
    else hideFloating(content);
  } finally {
    nativeCalls.delete(content);
  }
}

export function afterFloating(
  record: NativeFloatingRecord,
  revision: number,
  run: () => void,
): void {
  const owner = floatingOwners.get(record.content);
  if (owner?.record !== record || !owner.current(revision)) return;
  if (floatingBusy(record.content) || reconciling.has(record.content))
    owner.completions.push({ revision, open: record.open, run });
  else run();
}

export function reconcileFloating(content: HTMLElement, opening: boolean): void {
  if (floatingBusy(content) || reconciling.has(content)) return;
  reconciling.add(content);
  let actual = floatingOpen(content) ?? opening;
  try {
    for (;;) {
      const owner = floatingOwners.get(content);
      const live = !!owner?.current();
      const wantsOpen = live && !!owner?.record.open && owner.available();
      const revision = owner?.record.revision;
      if (wantsOpen !== actual) {
        callFloating(content, wantsOpen);
        actual = floatingOpen(content) ?? wantsOpen;
        if (
          floatingOwners.get(content) !== owner ||
          owner?.record.revision !== revision ||
          !!owner?.current() !== live ||
          (live && !!owner?.record.open && owner.available()) !== wantsOpen
        )
          continue;
      }
      if (owner?.current()) owner.sync(actual);
      for (const completion of owner?.completions.splice(0) ?? []) {
        if (
          floatingOwners.get(content) === owner &&
          owner?.current(completion.revision) &&
          owner.record.open === completion.open
        )
          completion.run();
      }
      if (
        floatingOwners.get(content) === owner &&
        owner?.record.revision === revision &&
        !owner?.completions.length
      )
        return;
      actual = floatingOpen(content) ?? !!floatingOwners.get(content)?.record.open;
    }
  } finally {
    reconciling.delete(content);
  }
}

const generatedAttributes = new WeakMap<HTMLElement, Record<string, string | undefined>>();

function authoredAttribute(element: HTMLElement, attribute: string): boolean {
  const current = element.getAttribute(attribute);
  return !!current && current !== generatedAttributes.get(element)?.[attribute];
}

export function copyGeneratedAttributes(previous: HTMLElement, current: HTMLElement): void {
  if (previous !== current && !generatedAttributes.has(current))
    generatedAttributes.set(current, { ...generatedAttributes.get(previous) });
}

export function syncGeneratedAttribute(
  element: HTMLElement,
  attribute: string,
  value?: string,
): void {
  if (authoredAttribute(element, attribute)) return;
  if (value) {
    if (element.getAttribute(attribute) !== value) element.setAttribute(attribute, value);
  } else element.removeAttribute(attribute);
  const owned = generatedAttributes.get(element) ?? {};
  owned[attribute] = value;
  generatedAttributes.set(element, owned);
}

export function identifyLabel(element: HTMLElement, labelledBy?: string, label?: string): void {
  syncGeneratedAttribute(
    element,
    "aria-labelledby",
    authoredAttribute(element, "aria-label") ? undefined : labelledBy,
  );
  syncGeneratedAttribute(
    element,
    "aria-label",
    element.hasAttribute("aria-labelledby") ? undefined : label,
  );
}

export function identifyPart(
  root: HTMLElement,
  part: string,
  prefix = root.id,
): string | undefined {
  const element = root.querySelector<HTMLElement>(`[data-part="${part}"]`);
  if (element) element.id ||= `${prefix}-${part}`;
  return element?.id;
}

export function identifyControlLabel(
  root: HTMLElement,
  control: HTMLInputElement | HTMLSelectElement,
  target: HTMLElement,
  fallback: string,
): void {
  const label = control.labels?.[0];
  if (label) label.id ||= `${root.id}-label`;
  identifyLabel(
    target,
    label?.id || control.getAttribute("aria-labelledby") || undefined,
    control.getAttribute("aria-label") ||
      root.getAttribute("aria-label") ||
      control.name ||
      fallback,
  );
}

export function identifyElements(
  elements: readonly HTMLElement[],
  prefix: string,
  start = 0,
): void {
  const ids = new Set(elements.map((element) => element.id));
  let index = start;
  for (const element of elements) {
    if (element.id) continue;
    do element.id = `${prefix}-${index++}`;
    while (ids.has(element.id));
    ids.add(element.id);
  }
}

export function listenToViewportChanges(host: DocumentHost, listener: () => void): void {
  host.listen(host.window, "resize", listener);
  host.listen(host.window, "scroll", listener, true);
}

export function documentRecords<Record extends DocumentRecord>(
  records: ReadonlySet<Record>,
  document: Document,
): Record[] {
  return [...records].filter((record) => record.root.ownerDocument === document);
}

export function documentRecordCleanup<Record extends DocumentRecord>(
  records: Set<Record>,
  document: Document,
  cleanup: (record: Record) => void = (record) => records.delete(record),
): () => void {
  return () => {
    for (const record of documentRecords(records, document)) cleanup(record);
  };
}

type FloatingSide = "top" | "right" | "bottom" | "left";
type FloatingAlignment = "start" | "center" | "end";

interface NativePopoverElement extends HTMLElement {
  hidePopover(): void;
  showPopover(): void;
}

export interface FloatingDefaults {
  align?: FloatingAlignment;
  edge?: number;
  gap?: number;
  side?: FloatingSide;
}

function supportsPopover(content: HTMLElement): boolean {
  const native = content as Partial<NativePopoverElement>;
  return typeof native.showPopover === "function" && typeof native.hidePopover === "function";
}

export function prepareFloating(content: HTMLElement): void {
  content.setAttribute("popover", "manual");
  content.style.margin = "0";
}

export function showFloating(content: HTMLElement): void {
  if (supportsPopover(content)) content.showPopover();
  else content.hidden = false;
}

export function hideFloating(content: HTMLElement): void {
  if (supportsPopover(content)) {
    try {
      content.hidePopover();
    } catch {
      // A detached or already-hidden native popover needs no further work.
    }
  } else {
    content.hidden = true;
  }
}

export function usesNativePopover(content: HTMLElement): boolean {
  return supportsPopover(content);
}

function side(root: HTMLElement, fallback: FloatingSide): FloatingSide {
  const value = root.getAttribute("data-side");
  return value === "top" || value === "right" || value === "bottom" || value === "left"
    ? value
    : fallback;
}

function alignment(root: HTMLElement, fallback: FloatingAlignment): FloatingAlignment {
  const value = root.getAttribute("data-align");
  return value === "start" || value === "center" || value === "end" ? value : fallback;
}

function opposite(value: FloatingSide): FloatingSide {
  if (value === "top") return "bottom";
  if (value === "bottom") return "top";
  if (value === "left") return "right";
  return "left";
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), Math.max(minimum, maximum));
}

export function positionFloating(
  root: HTMLElement,
  trigger: HTMLElement,
  content: HTMLElement,
  defaults: FloatingDefaults = {},
  current?: () => boolean,
): void {
  const window = uiWindow(root);
  const triggerRect = trigger.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const width = content.offsetWidth || contentRect.width;
  const height = content.offsetHeight || contentRect.height;
  if (current && !current()) return;
  const gap = defaults.gap ?? 8;
  const edge = defaults.edge ?? 8;
  const preferred = side(root, defaults.side ?? "bottom");
  const currentAlignment = alignment(root, defaults.align ?? "start");
  const rooms: Record<FloatingSide, number> = {
    top: triggerRect.top,
    right: window.innerWidth - triggerRect.right,
    bottom: window.innerHeight - triggerRect.bottom,
    left: triggerRect.left,
  };
  const required = preferred === "top" || preferred === "bottom" ? height : width;
  const alternate = opposite(preferred);
  const actual =
    root.getAttribute("data-avoid-collisions") !== "false" &&
    rooms[preferred] < required + gap &&
    rooms[alternate] > rooms[preferred]
      ? alternate
      : preferred;

  let left: number;
  let top: number;
  if (actual === "top" || actual === "bottom") {
    left = triggerRect.left;
    if (currentAlignment === "center") left += (triggerRect.width - width) / 2;
    else if (currentAlignment === "end") left = triggerRect.right - width;
    top = actual === "bottom" ? triggerRect.bottom + gap : triggerRect.top - height - gap;
  } else {
    top = triggerRect.top;
    if (currentAlignment === "center") top += (triggerRect.height - height) / 2;
    else if (currentAlignment === "end") top = triggerRect.bottom - height;
    left = actual === "right" ? triggerRect.right + gap : triggerRect.left - width - gap;
  }

  content.style.left = `${clamp(left, edge, window.innerWidth - width - edge)}px`;
  content.style.top = `${clamp(top, edge, window.innerHeight - height - edge)}px`;
  content.dataset.side = actual;
  content.dataset.align = currentAlignment;
}

export function positionFloatingAtPoint(
  content: HTMLElement,
  x: number,
  y: number,
  edge = 8,
  current?: () => boolean,
): void {
  const window = uiWindow(content);
  const contentRect = content.getBoundingClientRect();
  const width = content.offsetWidth || contentRect.width;
  const height = content.offsetHeight || contentRect.height;
  if (current && !current()) return;
  const left = clamp(x, edge, window.innerWidth - width - edge);
  const top = clamp(y, edge, window.innerHeight - height - edge);
  content.style.left = `${left}px`;
  content.style.top = `${top}px`;
  content.dataset.side = top < y ? "top" : "bottom";
  content.dataset.align = left < x ? "end" : "start";
}

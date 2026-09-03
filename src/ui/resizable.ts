import type { ActionRegistrar } from "../registry";
import type { ResizableTarget, StarContext, StarResizableStatic } from "../types";

type Orientation = "horizontal" | "vertical";

interface DragState {
  handleIndex: number;
  pointerId: number;
  startPosition: number;
  startSize: number;
  startSizes: number[];
  usableSize: number;
}

interface ResizableRecord {
  cleanup: () => void;
  drag: DragState | undefined;
  handles: HTMLElement[];
  panels: HTMLElement[];
  restoreSizes: Map<number, number>;
  root: HTMLElement;
  sizes: number[];
}

interface ResizableEventDetail {
  handle: HTMLElement | undefined;
  handleIndex: number | undefined;
  previousSizes: number[];
  resizable: HTMLElement;
  sizes: number[];
}

interface ResizableCollection {
  api: StarResizableStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, ResizableRecord>();
let resizableId = 0;

function resizableRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="resizable"]')
    ? value
    : undefined;
}

function directParts(root: HTMLElement, part: "panel" | "handle"): HTMLElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
  );
}

function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}

function disabled(root: HTMLElement): boolean {
  return root.hasAttribute("disabled") || root.dataset.disabled !== undefined;
}

function panelMinimum(panel: HTMLElement): number {
  const value = Number(panel.dataset.min);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
}

function panelMaximum(panel: HTMLElement): number {
  const value = Number(panel.dataset.max);
  return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 100;
}

function validateConstraints(panels: HTMLElement[]): void {
  const minimum = panels.reduce((sum, panel) => sum + panelMinimum(panel), 0);
  const maximum = panels.reduce((sum, panel) => sum + panelMaximum(panel), 0);
  if (panels.some((panel) => panelMinimum(panel) > panelMaximum(panel))) {
    throw new Error("Resizable panel data-min cannot exceed data-max.");
  }
  if (minimum > 100.0001 || maximum < 99.9999) {
    throw new Error("Resizable panel constraints must allow the group to total 100 percent.");
  }
}

function parseSizes(value: string | undefined, count: number): number[] | undefined {
  if (!value?.trim()) return undefined;
  let values: unknown;
  try {
    values = JSON.parse(value);
  } catch {
    values = value.split(/[\s,]+/).map(Number);
  }
  if (!Array.isArray(values) || values.length !== count) return undefined;
  const parsed = values.map(Number);
  return parsed.every((size) => Number.isFinite(size) && size >= 0) ? parsed : undefined;
}

function normalizedSizes(panels: HTMLElement[], input: number[]): number[] {
  validateConstraints(panels);
  const total = input.reduce((sum, value) => sum + Math.max(0, value), 0);
  const equal = 100 / panels.length;
  const sizes = input.map((value) => (total > 0 ? (Math.max(0, value) / total) * 100 : equal));
  for (const [index, panel] of panels.entries()) {
    sizes[index] = Math.max(
      panelMinimum(panel),
      Math.min(panelMaximum(panel), sizes[index] ?? equal),
    );
  }

  for (let pass = 0; pass < panels.length * 2; pass += 1) {
    const difference = 100 - sizes.reduce((sum, value) => sum + value, 0);
    if (Math.abs(difference) < 0.0001) break;
    const candidates = panels
      .map((panel, index) => ({
        capacity:
          difference > 0
            ? panelMaximum(panel) - (sizes[index] ?? 0)
            : (sizes[index] ?? 0) - panelMinimum(panel),
        index,
      }))
      .filter(({ capacity }) => capacity > 0.0001);
    if (candidates.length === 0) break;
    const share = Math.abs(difference) / candidates.length;
    for (const { capacity, index } of candidates) {
      const amount = Math.min(capacity, share);
      sizes[index] = (sizes[index] ?? 0) + (difference > 0 ? amount : -amount);
    }
  }
  const difference = 100 - sizes.reduce((sum, value) => sum + value, 0);
  if (Math.abs(difference) > 0.0001) {
    const index = sizes.length - 1;
    sizes[index] = (sizes[index] ?? 0) + difference;
  }
  return sizes.map((size) => Math.round(size * 1000) / 1000);
}

function serialized(sizes: number[]): string {
  return JSON.stringify(sizes.map((size) => Math.round(size * 1000) / 1000));
}

function storedSizes(root: HTMLElement, count: number): number[] | undefined {
  const key = root.dataset.storageKey?.trim();
  if (!key) return undefined;
  try {
    return parseSizes(localStorage.getItem(`jquery-star:resizable:${key}`) ?? undefined, count);
  } catch {
    return undefined;
  }
}

function persist(record: ResizableRecord): void {
  const key = record.root.dataset.storageKey?.trim();
  if (!key) return;
  try {
    localStorage.setItem(`jquery-star:resizable:${key}`, serialized(record.sizes));
  } catch {
    // Storage can be unavailable in privacy modes; resizing still works for this session.
  }
}

function emit(
  record: ResizableRecord,
  name: "before-change" | "change" | "resize-start" | "resize-end",
  previousSizes: number[],
  sizes: number[],
  handleIndex?: number,
  cancelable = false,
): boolean {
  const detail: ResizableEventDetail = {
    handle: handleIndex === undefined ? undefined : record.handles[handleIndex],
    handleIndex,
    previousSizes,
    resizable: record.root,
    sizes,
  };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:resizable:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function handleBounds(
  record: ResizableRecord,
  index: number,
): { maximum: number; minimum: number } {
  const primary = record.panels[index];
  const secondary = record.panels[index + 1];
  if (!primary || !secondary) return { minimum: 0, maximum: 0 };
  const total = (record.sizes[index] ?? 0) + (record.sizes[index + 1] ?? 0);
  return {
    minimum: Math.max(panelMinimum(primary), total - panelMaximum(secondary)),
    maximum: Math.min(panelMaximum(primary), total - panelMinimum(secondary)),
  };
}

function syncHandle(record: ResizableRecord, handle: HTMLElement, index: number): void {
  const primary = record.panels[index];
  const secondary = record.panels[index + 1];
  if (!primary || !secondary) return;
  const bounds = handleBounds(record, index);
  handle.id ||= `${record.root.id}-handle-${index + 1}`;
  primary.id ||= `${record.root.id}-panel-${index + 1}`;
  secondary.id ||= `${record.root.id}-panel-${index + 2}`;
  handle.setAttribute("role", "separator");
  handle.tabIndex = disabled(record.root) ? -1 : 0;
  handle.setAttribute("aria-disabled", String(disabled(record.root)));
  handle.setAttribute(
    "aria-orientation",
    orientation(record.root) === "horizontal" ? "vertical" : "horizontal",
  );
  handle.setAttribute("aria-controls", primary.id);
  handle.setAttribute("aria-valuemin", String(Math.round(bounds.minimum)));
  handle.setAttribute("aria-valuemax", String(Math.round(bounds.maximum)));
  handle.setAttribute("aria-valuenow", String(Math.round(record.sizes[index] ?? 0)));
  if (!handle.hasAttribute("aria-label") && !handle.hasAttribute("aria-labelledby")) {
    handle.setAttribute("aria-label", `Resize panel ${index + 1}`);
  }
  handle.dataset.state = record.drag?.handleIndex === index ? "dragging" : "idle";
}

function render(record: ResizableRecord): void {
  const value = serialized(record.sizes);
  if (record.root.dataset.value !== value) record.root.dataset.value = value;
  const currentOrientation = orientation(record.root);
  if (record.root.dataset.orientation !== currentOrientation) {
    record.root.dataset.orientation = currentOrientation;
  }
  const tracks: string[] = [];
  for (const [index, size] of record.sizes.entries()) {
    tracks.push(`${Math.max(size, 0.001)}fr`);
    if (index < record.handles.length) tracks.push("var(--jqs-resizable-handle-size, 0.75rem)");
  }
  if (orientation(record.root) === "horizontal") {
    record.root.style.gridTemplateColumns = tracks.join(" ");
    record.root.style.gridTemplateRows = "minmax(0, 1fr)";
  } else {
    record.root.style.gridTemplateRows = tracks.join(" ");
    record.root.style.gridTemplateColumns = "minmax(0, 1fr)";
  }
  for (const [index, panel] of record.panels.entries()) {
    panel.dataset.size = String(record.sizes[index] ?? 0);
  }
  for (const [index, handle] of record.handles.entries()) syncHandle(record, handle, index);
}

function applySizes(
  record: ResizableRecord,
  input: number[],
  handleIndex?: number,
  emitEvents = true,
): HTMLElement {
  const previousSizes = [...record.sizes];
  const sizes = normalizedSizes(record.panels, input);
  if (serialized(previousSizes) === serialized(sizes)) return record.root;
  if (emitEvents && !emit(record, "before-change", previousSizes, sizes, handleIndex, true)) {
    return record.root;
  }
  record.sizes = sizes;
  render(record);
  persist(record);
  if (emitEvents) emit(record, "change", previousSizes, sizes, handleIndex);
  return record.root;
}

function requestPair(record: ResizableRecord, index: number, primarySize: number): HTMLElement {
  if (disabled(record.root)) return record.root;
  const bounds = handleBounds(record, index);
  const previousPrimary = record.sizes[index];
  const previousSecondary = record.sizes[index + 1];
  if (previousPrimary === undefined || previousSecondary === undefined) return record.root;
  const nextPrimary = Math.max(bounds.minimum, Math.min(bounds.maximum, primarySize));
  const next = [...record.sizes];
  next[index] = nextPrimary;
  next[index + 1] = previousPrimary + previousSecondary - nextPrimary;
  return applySizes(record, next, index);
}

function step(record: ResizableRecord): number {
  const value = Number(record.root.dataset.step);
  return Number.isFinite(value) && value > 0 ? value : 5;
}

function collapse(record: ResizableRecord, index: number): HTMLElement {
  const bounds = handleBounds(record, index);
  const current = record.sizes[index] ?? bounds.minimum;
  if (current > bounds.minimum + 0.001) {
    record.restoreSizes.set(index, current);
    return requestPair(record, index, bounds.minimum);
  }
  const restore = record.restoreSizes.get(index) ?? Math.min(bounds.maximum, bounds.minimum + 25);
  return requestPair(record, index, restore);
}

function keydown(record: ResizableRecord, index: number, event: KeyboardEvent): void {
  if (disabled(record.root)) return;
  const current = record.sizes[index] ?? 0;
  const amount = step(record) * (event.shiftKey ? 2 : 1);
  const horizontal = orientation(record.root) === "horizontal";
  const decreaseKey = horizontal ? "ArrowLeft" : "ArrowUp";
  const increaseKey = horizontal ? "ArrowRight" : "ArrowDown";
  if (![decreaseKey, increaseKey, "Home", "End", "Enter"].includes(event.key)) return;
  event.preventDefault();
  if (event.key === decreaseKey) requestPair(record, index, current - amount);
  else if (event.key === increaseKey) requestPair(record, index, current + amount);
  else if (event.key === "Home") requestPair(record, index, handleBounds(record, index).minimum);
  else if (event.key === "End") requestPair(record, index, handleBounds(record, index).maximum);
  else collapse(record, index);
}

function pointerPosition(event: PointerEvent, currentOrientation: Orientation): number {
  return currentOrientation === "horizontal" ? event.clientX : event.clientY;
}

function startDrag(record: ResizableRecord, index: number, event: PointerEvent): void {
  if (disabled(record.root) || event.button !== 0) return;
  const rect = record.root.getBoundingClientRect();
  const handlePixels = record.handles.reduce((total, handle) => {
    const handleRect = handle.getBoundingClientRect();
    return (
      total + (orientation(record.root) === "horizontal" ? handleRect.width : handleRect.height)
    );
  }, 0);
  const axisSize = orientation(record.root) === "horizontal" ? rect.width : rect.height;
  const usableSize = Math.max(1, axisSize - handlePixels);
  record.drag = {
    handleIndex: index,
    pointerId: event.pointerId,
    startPosition: pointerPosition(event, orientation(record.root)),
    startSize: record.sizes[index] ?? 0,
    startSizes: [...record.sizes],
    usableSize,
  };
  event.preventDefault();
  record.handles[index]?.setPointerCapture?.(event.pointerId);
  render(record);
  emit(record, "resize-start", [...record.sizes], [...record.sizes], index);
}

function moveDrag(record: ResizableRecord, event: PointerEvent): void {
  const drag = record.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  const delta = pointerPosition(event, orientation(record.root)) - drag.startPosition;
  requestPair(record, drag.handleIndex, drag.startSize + (delta / drag.usableSize) * 100);
}

function endDrag(record: ResizableRecord, event: PointerEvent): void {
  const drag = record.drag;
  if (!drag || drag.pointerId !== event.pointerId) return;
  try {
    record.handles[drag.handleIndex]?.releasePointerCapture?.(event.pointerId);
  } catch {
    // The pointer may already have been released by the browser.
  }
  record.drag = undefined;
  render(record);
  emit(record, "resize-end", drag.startSizes, [...record.sizes], drag.handleIndex);
}

function wire(record: ResizableRecord): () => void {
  const cleanups: Array<() => void> = [];
  for (const [index, handle] of record.handles.entries()) {
    const down = (event: PointerEvent): void => startDrag(record, index, event);
    const key = (event: KeyboardEvent): void => keydown(record, index, event);
    handle.addEventListener("pointerdown", down);
    handle.addEventListener("keydown", key);
    cleanups.push(() => {
      handle.removeEventListener("pointerdown", down);
      handle.removeEventListener("keydown", key);
    });
  }
  const move = (event: PointerEvent): void => moveDrag(record, event);
  const up = (event: PointerEvent): void => endDrag(record, event);
  window.addEventListener("pointermove", move);
  window.addEventListener("pointerup", up);
  window.addEventListener("pointercancel", up);
  cleanups.push(() => {
    window.removeEventListener("pointermove", move);
    window.removeEventListener("pointerup", up);
    window.removeEventListener("pointercancel", up);
  });
  return () => cleanups.forEach((cleanup) => cleanup());
}

function enhanceResizable(root: HTMLElement): ResizableRecord {
  const existing = records.get(root);
  if (existing) {
    const patched = parseSizes(root.dataset.value, existing.panels.length);
    if (patched && serialized(patched) !== serialized(existing.sizes)) {
      existing.sizes = normalizedSizes(existing.panels, patched);
    }
    render(existing);
    return existing;
  }

  root.id ||= `jqs-resizable-${++resizableId}`;
  const panels = directParts(root, "panel");
  const handles = directParts(root, "handle");
  if (panels.length < 2 || handles.length !== panels.length - 1) {
    throw new Error("Resizable needs at least two direct panels and one handle between each pair.");
  }
  const sequence = Array.from(root.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement && ["panel", "handle"].includes(child.dataset.part ?? ""),
  );
  if (
    sequence.some((part, index) => part.dataset.part !== (index % 2 === 0 ? "panel" : "handle"))
  ) {
    throw new Error("Resizable direct parts must alternate panel, handle, panel.");
  }
  validateConstraints(panels);
  const authored = parseSizes(root.dataset.value, panels.length);
  const stored = storedSizes(root, panels.length);
  const panelDefaults = panels.map((panel) => Number(panel.dataset.size));
  const defaults = panelDefaults.every((size) => Number.isFinite(size) && size >= 0)
    ? panelDefaults
    : panels.map(() => 100 / panels.length);
  const record: ResizableRecord = {
    cleanup: () => undefined,
    drag: undefined,
    handles,
    panels,
    restoreSizes: new Map(),
    root,
    sizes: normalizedSizes(panels, authored ?? stored ?? defaults),
  };
  record.cleanup = wire(record);
  records.set(root, record);
  render(record);
  return record;
}

function resolveResizable(target: ResizableTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? resizableRoot(root.querySelector(target)) : resizableRoot(target);
  if (resolved) return resolved;
  throw new Error(`Resizable target did not match data-jqs="resizable": ${String(target)}`);
}

function controlledResizable(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="resizable"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveResizable(target, context.root);
  const closest = context.element?.closest('[data-jqs="resizable"]');
  return resolveResizable(closest instanceof HTMLElement ? closest : String(target));
}

function registerActions(api: StarResizableStatic, registerAction: ActionRegistrar): void {
  registerAction("ui.resizable.set", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledResizable(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (!Array.isArray(value) || !value.every((size) => typeof size === "number")) {
      throw new Error("ui.resizable.set needs an array of panel sizes.");
    }
    return api.set(target, value);
  });
  registerAction("ui.resizable.resize", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledResizable(context, explicit ? first : undefined);
    const index = explicit ? context.args?.[1] : first;
    const size = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof index !== "number" || typeof size !== "number") {
      throw new Error("ui.resizable.resize needs a zero-based handle index and primary size.");
    }
    return api.resize(target, index, size);
  });
  registerAction("ui.resizable.collapse", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const target = controlledResizable(context, explicit ? first : undefined);
    const index = explicit ? context.args?.[1] : first;
    return api.collapse(target, typeof index === "number" ? index : 0);
  });
  registerAction("ui.resizable.reset", (context) =>
    api.reset(controlledResizable(context, context.args?.[0])),
  );
}

function enhanceTree(root: ParentNode): void {
  const elements: Element[] = root instanceof Element ? [root] : [];
  elements.push(...Array.from(root.querySelectorAll('[data-jqs="resizable"]')));
  for (const element of elements) {
    const resizable = resizableRoot(element);
    if (resizable) enhanceResizable(resizable);
  }
}

export function createResizables(registerAction: ActionRegistrar): ResizableCollection {
  const api: StarResizableStatic = {
    set: (target, sizes) => {
      const root = resolveResizable(target);
      const record = records.get(root) ?? enhanceResizable(root);
      if (sizes.length !== record.panels.length) {
        throw new Error(`Resizable #${root.id} needs ${record.panels.length} panel sizes.`);
      }
      return applySizes(record, [...sizes]);
    },
    resize: (target, handleIndex, primarySize) => {
      const root = resolveResizable(target);
      return requestPair(records.get(root) ?? enhanceResizable(root), handleIndex, primarySize);
    },
    collapse: (target, handleIndex = 0) => {
      const root = resolveResizable(target);
      return collapse(records.get(root) ?? enhanceResizable(root), handleIndex);
    },
    reset: (target) => {
      const root = resolveResizable(target);
      const record = records.get(root) ?? enhanceResizable(root);
      const defaults = record.panels.map((panel) =>
        Number(panel.getAttribute("data-default-size")),
      );
      const sizes = defaults.every((size) => Number.isFinite(size) && size >= 0)
        ? defaults
        : record.panels.map(() => 100 / record.panels.length);
      record.restoreSizes.clear();
      return applySizes(record, sizes);
    },
    value: (target) => {
      const root = resolveResizable(target);
      return [...(records.get(root) ?? enhanceResizable(root)).sizes];
    },
  };
  registerActions(api, registerAction);
  return { api, enhance: enhanceTree };
}

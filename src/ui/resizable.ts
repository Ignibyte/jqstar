import type { ActionRegistrar } from "../registry";
import type { ResizableTarget, StarContext, StarResizableStatic } from "../types";
import { isElementNode, isHTMLElement } from "../dom";
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

type Orientation = "horizontal" | "vertical";
type Current = () => boolean;
interface DragState extends UIResources {
  handleIndex: number;
  pointerId: number;
  startPosition: number;
  startSize: number;
  startSizes: number[];
  usableSize: number;
  configuration: string;
}
interface ResizableRecord extends UIResources {
  busy: boolean;
  drag: DragState | undefined;
  handles: HTMLElement[];
  panels: HTMLElement[];
  restoreSizes: Map<number, number>;
  sizes: number[];
  stop: ((op?: Operation) => void) | undefined;
}
interface ResizableCollection {
  api: StarResizableStatic;
  enhance(root: ParentNode): void;
}
const records = new WeakMap<HTMLElement, ResizableRecord>();
const intents = new WeakMap<HTMLElement, number>();
const retained = new WeakMap<HTMLElement, { sizes: number[]; restoreSizes: Map<number, number> }>();
let resizableId = 0;
function resizableRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="resizable"]') ? value : undefined;
}
function directParts(root: HTMLElement, part: "panel" | "handle"): HTMLElement[] {
  return Array.from(root.children).filter(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}
function alternating(root: HTMLElement): boolean {
  return Array.from(root.children)
    .filter(
      (child) => isHTMLElement(child) && ["panel", "handle"].includes(child.dataset.part ?? ""),
    )
    .every(
      (part, index) => part.getAttribute("data-part") === (index % 2 === 0 ? "panel" : "handle"),
    );
}
function orientation(root: HTMLElement): Orientation {
  return root.dataset.orientation === "vertical" ? "vertical" : "horizontal";
}
function disabled(root: HTMLElement): boolean {
  return (
    root.hasAttribute("disabled") ||
    (root.hasAttribute("data-disabled") && root.dataset.disabled !== "false")
  );
}
function constrained(element: Element): boolean {
  return Boolean(
    element.closest(
      '[disabled],[hidden],[inert],[aria-disabled="true"],[aria-hidden="true"],[data-disabled]:not([data-disabled="false"])',
    ),
  );
}
function current(record: ResizableRecord, revision = record.revision): boolean {
  const panels = directParts(record.root, "panel"),
    handles = directParts(record.root, "handle");
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    resizableRoot(record.root) === record.root &&
    alternating(record.root) &&
    panels.length === record.panels.length &&
    panels.every((panel, index) => panel === record.panels[index]) &&
    handles.length === record.handles.length &&
    handles.every((handle, index) => handle === record.handles[index])
  );
}
function configuration(record: ResizableRecord): string {
  return JSON.stringify([
    orientation(record.root),
    record.root.dataset.step,
    ...record.panels.flatMap((panel) => [panel.dataset.min, panel.dataset.max]),
  ]);
}
function operation(record: ResizableRecord, allowed: Current = () => true) {
  const revision = record.revision;
  const attributes = new Map<HTMLElement, Map<string, string | null>>();
  const parents = new Map<HTMLElement, HTMLElement | null>();
  const observe = (element: HTMLElement, names: string[]): void => {
    const values = attributes.get(element) ?? new Map<string, string | null>();
    for (const name of names) values.set(name, element.getAttribute(name));
    attributes.set(element, values);
    parents.set(element, element.parentElement);
  };
  observe(record.root, [
    "id",
    "data-value",
    "data-orientation",
    "data-step",
    "data-storage-key",
    "style",
  ]);
  for (const panel of record.panels)
    observe(panel, ["id", "data-min", "data-max", "data-size", "data-default-size"]);
  for (const handle of record.handles)
    observe(handle, [
      "id",
      "role",
      "tabindex",
      "aria-controls",
      "aria-label",
      "aria-labelledby",
      "aria-orientation",
      "aria-valuemin",
      "aria-valuemax",
      "aria-valuenow",
      "data-state",
    ]);
  for (const part of [record.root, ...record.panels, ...record.handles])
    for (let node: HTMLElement | null = part; node; node = node.parentElement)
      observe(node, [
        "disabled",
        "hidden",
        "inert",
        "aria-disabled",
        "aria-hidden",
        "data-disabled",
      ]);
  const valid = (): boolean =>
    current(record, revision) &&
    allowed() &&
    [...parents].every(([element, parent]) => element.parentElement === parent) &&
    [...attributes].every(([element, values]) =>
      [...values].every(([name, value]) => element.getAttribute(name) === value),
    );
  const attribute = (element: HTMLElement, name: string, value: string): boolean => {
    if (!valid()) return false;
    if (element.getAttribute(name) === value) return true;
    attributes.get(element)?.set(name, value);
    element.setAttribute(name, value);
    return valid();
  };
  const style = (name: string, value: string): boolean => {
    if (!valid()) return false;
    if (record.root.style.getPropertyValue(name) === value) return true;
    const next = record.document.createElement("div").style;
    next.cssText = record.root.style.cssText;
    next.setProperty(name, value);
    return attribute(record.root, "style", next.cssText);
  };
  const write = (run: () => void): boolean => {
    if (!valid()) return false;
    run();
    return valid();
  };
  return { valid, attribute, style, write };
}
type Operation = ReturnType<typeof operation>;
function identifier(
  record: ResizableRecord,
  op: Operation,
  element: HTMLElement,
  preferred: string,
): boolean {
  if (element.id) return op.valid();
  const ids = new Set(Array.from(record.root.querySelectorAll("[id]"), (element) => element.id));
  let candidate = preferred,
    index = 1;
  while (ids.has(candidate) || record.document.getElementById(candidate))
    candidate = `${preferred}-${++index}`;
  return op.attribute(element, "id", candidate);
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

function emit(
  record: ResizableRecord,
  name: "before-change" | "change" | "resize-start" | "resize-end",
  previousSizes: number[],
  sizes: number[],
  handleIndex?: number,
  cancelable = false,
): boolean {
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(`jquery-star:resizable:${name}`, {
      bubbles: true,
      cancelable,
      detail: {
        handle: handleIndex === undefined ? undefined : record.handles[handleIndex],
        handleIndex,
        previousSizes: [...previousSizes],
        resizable: record.root,
        sizes: [...sizes],
      },
    }),
  );
}
function handleBounds(
  record: ResizableRecord,
  index: number,
): { maximum: number; minimum: number } {
  const primary = record.panels[index],
    secondary = record.panels[index + 1];
  if (!primary || !secondary) return { minimum: 0, maximum: 0 };
  const total = (record.sizes[index] ?? 0) + (record.sizes[index + 1] ?? 0);
  return {
    minimum: Math.max(panelMinimum(primary), total - panelMaximum(secondary)),
    maximum: Math.min(panelMaximum(primary), total - panelMinimum(secondary)),
  };
}
function render(record: ResizableRecord, op: Operation): void {
  const { root } = record;
  if (!root.id && !identifier(record, op, root, `jqs-resizable-${++resizableId}`)) return;
  if (!op.attribute(root, "data-value", serialized(record.sizes))) return;
  const axis = orientation(root);
  if (!op.attribute(root, "data-orientation", axis)) return;
  const tracks: string[] = [];
  for (const [index, size] of record.sizes.entries()) {
    tracks.push(`${Math.max(size, 0.001)}fr`);
    if (index < record.handles.length) tracks.push("var(--jqs-resizable-handle-size, 0.75rem)");
  }
  if (
    !op.style("grid-template-columns", axis === "horizontal" ? tracks.join(" ") : "minmax(0, 1fr)")
  )
    return;
  if (!op.style("grid-template-rows", axis === "vertical" ? tracks.join(" ") : "minmax(0, 1fr)"))
    return;
  for (const [index, panel] of record.panels.entries()) {
    if (!identifier(record, op, panel, `${root.id}-panel-${index + 1}`)) return;
    if (!op.attribute(panel, "data-size", String(record.sizes[index] ?? 0))) return;
  }
  for (const [index, handle] of record.handles.entries()) {
    const primary = record.panels[index];
    if (!primary) return;
    const bounds = handleBounds(record, index);
    if (!identifier(record, op, handle, `${root.id}-handle-${index + 1}`)) return;
    for (const [name, value] of [
      ["role", "separator"],
      ["tabindex", disabled(root) ? "-1" : "0"],
      ["aria-disabled", String(disabled(root))],
      ["aria-orientation", axis === "horizontal" ? "vertical" : "horizontal"],
      ["aria-controls", primary.id],
      ["aria-valuemin", String(Math.round(bounds.minimum))],
      ["aria-valuemax", String(Math.round(bounds.maximum))],
      ["aria-valuenow", String(Math.round(record.sizes[index] ?? 0))],
      ["data-state", record.drag?.handleIndex === index ? "dragging" : "idle"],
    ] as const)
      if (!op.attribute(handle, name, value)) return;
    if (
      !handle.hasAttribute("aria-label") &&
      !handle.hasAttribute("aria-labelledby") &&
      !op.attribute(handle, "aria-label", `Resize panel ${index + 1}`)
    )
      return;
  }
}
function persist(record: ResizableRecord, op: Operation): void {
  const key = record.root.dataset.storageKey?.trim();
  if (!key || !op.valid()) return;
  try {
    const storage = record.window.localStorage;
    if (op.valid()) storage.setItem(`jquery-star:resizable:${key}`, serialized(record.sizes));
  } catch {
    /* Unavailable storage must not prevent resizing. */
  }
}
function applySizes(
  record: ResizableRecord,
  input: number[],
  op: Operation,
  handleIndex?: number,
): void {
  if (!op.valid()) return;
  const previousSizes = [...record.sizes],
    sizes = normalizedSizes(record.panels, input);
  if (!op.valid() || serialized(previousSizes) === serialized(sizes)) return;
  if (!emit(record, "before-change", previousSizes, sizes, handleIndex, true) || !op.valid())
    return;
  record.sizes = sizes;
  render(record, op);
  persist(record, op);
  if (op.valid()) emit(record, "change", previousSizes, sizes, handleIndex);
}
function requestPair(
  record: ResizableRecord,
  index: number,
  primarySize: number,
  op: Operation,
): void {
  if (disabled(record.root) || !op.valid() || !Number.isFinite(primarySize)) return;
  const bounds = handleBounds(record, index),
    primary = record.sizes[index],
    secondary = record.sizes[index + 1];
  if (primary === undefined || secondary === undefined) return;
  const next = [...record.sizes];
  next[index] = Math.max(bounds.minimum, Math.min(bounds.maximum, primarySize));
  next[index + 1] = primary + secondary - next[index];
  applySizes(record, next, op, index);
}
function collapse(record: ResizableRecord, index: number, op: Operation): void {
  const bounds = handleBounds(record, index),
    value = record.sizes[index] ?? bounds.minimum;
  if (value > bounds.minimum + 0.001) {
    requestPair(record, index, bounds.minimum, op);
    if (op.valid() && record.sizes[index] === bounds.minimum) record.restoreSizes.set(index, value);
  } else
    requestPair(
      record,
      index,
      record.restoreSizes.get(index) ?? Math.min(bounds.maximum, bounds.minimum + 25),
      op,
    );
}
function request(
  root: HTMLElement,
  run: (record: ResizableRecord, op: Operation) => void,
  allowed: Current = () => true,
  preserve?: DragState,
): HTMLElement {
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  if (!allowed()) return root;
  const record = enhanceResizable(root);
  if (!current(record) || intents.get(root) !== intent || !allowed()) return root;
  ++record.revision;
  const op = operation(record, () => intents.get(root) === intent && allowed()),
    busy = record.busy;
  record.busy = true;
  try {
    if (record.drag && record.drag !== preserve) record.stop?.(op);
    if (op.valid()) run(record, op);
  } finally {
    record.busy = busy;
  }
  return root;
}
function keydown(record: ResizableRecord, index: number, event: KeyboardEvent): void {
  const handle = record.handles[index];
  if (
    event.defaultPrevented ||
    !handle ||
    constrained(handle) ||
    !isElementNode(event.target) ||
    event.target.closest("[data-jqs]") !== record.root
  )
    return;
  const axis = orientation(record.root),
    decrease = axis === "horizontal" ? "ArrowLeft" : "ArrowUp",
    increase = axis === "horizontal" ? "ArrowRight" : "ArrowDown";
  if (![decrease, increase, "Home", "End", "Enter"].includes(event.key)) return;
  event.preventDefault();
  request(
    record.root,
    (active, op) => {
      const step = Number(active.root.dataset.step),
        amount = (Number.isFinite(step) && step > 0 ? step : 5) * (event.shiftKey ? 2 : 1);
      const value = active.sizes[index] ?? 0;
      if (event.key === decrease) requestPair(active, index, value - amount, op);
      else if (event.key === increase) requestPair(active, index, value + amount, op);
      else if (event.key === "Home")
        requestPair(active, index, handleBounds(active, index).minimum, op);
      else if (event.key === "End")
        requestPair(active, index, handleBounds(active, index).maximum, op);
      else collapse(active, index, op);
    },
    () => !constrained(handle),
  );
}
function pointerPosition(event: PointerEvent, axis: Orientation): number {
  return axis === "horizontal" ? event.clientX : event.clientY;
}
function dragCurrent(record: ResizableRecord, drag: DragState): boolean {
  const handle = record.handles[drag.handleIndex];
  return (
    current(record) &&
    record.drag === drag &&
    drag.active &&
    record.root.isConnected &&
    Boolean(handle && !constrained(handle)) &&
    configuration(record) === drag.configuration &&
    record.root.dataset.value === serialized(record.sizes)
  );
}
function moveDrag(record: ResizableRecord, drag: DragState, event: PointerEvent): void {
  if (event.pointerId !== drag.pointerId) return;
  if (!dragCurrent(record, drag)) {
    record.stop?.();
    return;
  }
  const delta = pointerPosition(event, orientation(record.root)) - drag.startPosition;
  request(
    record.root,
    (active, op) =>
      requestPair(active, drag.handleIndex, drag.startSize + (delta / drag.usableSize) * 100, op),
    () => record.drag === drag && drag.active,
    drag,
  );
}
function endDrag(record: ResizableRecord, drag: DragState, event: PointerEvent): void {
  if (event.pointerId !== drag.pointerId) return;
  if (!dragCurrent(record, drag)) {
    record.stop?.();
    return;
  }
  request(
    record.root,
    (active, op) => {
      active.stop?.(op);
      if (!op.valid()) return;
      render(active, op);
      if (op.valid()) emit(active, "resize-end", drag.startSizes, active.sizes, drag.handleIndex);
    },
    () => true,
    drag,
  );
}
function startDrag(record: ResizableRecord, index: number, event: PointerEvent): void {
  const handle = record.handles[index];
  if (
    event.defaultPrevented ||
    event.button !== 0 ||
    !handle ||
    constrained(handle) ||
    !isElementNode(event.target) ||
    event.target.closest("[data-jqs]") !== record.root
  )
    return;
  event.preventDefault();
  request(
    record.root,
    (active, op) => {
      const rect = active.root.getBoundingClientRect();
      if (!op.valid()) return;
      const axis = orientation(active.root);
      let handlePixels = 0;
      for (const part of active.handles) {
        const bounds = part.getBoundingClientRect();
        if (!op.valid()) return;
        handlePixels += axis === "horizontal" ? bounds.width : bounds.height;
      }
      const drag: DragState = {
        ...uiResources(active.root),
        handleIndex: index,
        pointerId: event.pointerId,
        startPosition: pointerPosition(event, axis),
        startSize: active.sizes[index] ?? 0,
        startSizes: [...active.sizes],
        usableSize: Math.max(1, (axis === "horizontal" ? rect.width : rect.height) - handlePixels),
        configuration: configuration(active),
      };
      let closing: Operation | undefined;
      const stop = (operation?: Operation): void => {
        if (!drag.active) return;
        active.cleanups.delete(stop);
        if (active.drag === drag) {
          active.drag = undefined;
          active.stop = undefined;
        }
        closing = operation;
        releaseUIResources(drag);
      };
      active.drag = drag;
      active.stop = stop;
      active.cleanups.add(stop);
      drag.cleanups.add(() => {
        const replacement = records.get(active.root);
        if ((!replacement || replacement === active) && !active.drag) {
          if (closing) closing.attribute(handle, "data-state", "idle");
          else handle.setAttribute("data-state", "idle");
        }
      });
      let acquisition: Current | undefined = op.valid;
      const available = (): boolean =>
        drag.active && current(active) && active.drag === drag && (acquisition?.() ?? true);
      try {
        for (const type of ["pointermove", "pointerup", "pointercancel"] as const)
          listenUI(
            drag,
            () => drag.active && (acquisition?.() ?? true),
            active.window,
            type,
            (next) =>
              type === "pointermove"
                ? moveDrag(active, drag, next as PointerEvent)
                : endDrag(active, drag, next as PointerEvent),
          );
        if (!available()) {
          stop();
          return;
        }
        acquireUIResource(
          drag,
          available,
          () => {
            handle.setPointerCapture?.(event.pointerId);
          },
          () => {
            const next = records.get(active.root)?.drag;
            if (
              next &&
              next !== drag &&
              next.pointerId === drag.pointerId &&
              records.get(active.root)?.handles[next.handleIndex] === handle
            )
              return;
            try {
              handle.releasePointerCapture?.(event.pointerId);
            } catch {
              /* Capture may already be released. */
            }
          },
        );
        if (!available()) {
          stop();
          return;
        }
        render(active, op);
        if (op.valid()) emit(active, "resize-start", active.sizes, active.sizes, index);
        if (!available()) stop();
      } catch (error) {
        try {
          stop();
        } catch (cleanupError) {
          throw new AggregateError(
            [error, cleanupError],
            "Resizable pointer setup and cleanup failed.",
            { cause: cleanupError },
          );
        }
        throw error;
      } finally {
        acquisition = undefined;
      }
    },
    () => !constrained(handle),
  );
}
function wire(record: ResizableRecord, op: Operation): void {
  let acquisition: Current | undefined = op.valid;
  const valid = (): boolean => current(record) && (acquisition?.() ?? true);
  try {
    for (const [index, handle] of record.handles.entries()) {
      listenUI(record, valid, handle, "pointerdown", (event) =>
        startDrag(record, index, event as PointerEvent),
      );
      listenUI(record, valid, handle, "keydown", (event) =>
        keydown(record, index, event as KeyboardEvent),
      );
    }
  } finally {
    acquisition = undefined;
  }
}
function enhanceResizable(root: HTMLElement): ResizableRecord {
  const existing = records.get(root);
  if (existing && current(existing)) {
    if (existing.busy) return existing;
    const sizes = normalizedSizes(
      existing.panels,
      parseSizes(root.dataset.value, existing.panels.length) ?? existing.sizes,
    );
    if (serialized(sizes) !== serialized(existing.sizes)) ++existing.revision;
    const op = operation(existing);
    existing.busy = true;
    try {
      if (
        existing.drag &&
        (existing.drag.configuration !== configuration(existing) ||
          serialized(sizes) !== serialized(existing.sizes) ||
          constrained(root))
      )
        existing.stop?.(op);
      if (!op.valid()) return existing;
      existing.sizes = sizes;
      render(existing, op);
    } catch (error) {
      failUISetup(existing, error);
    } finally {
      existing.busy = false;
    }
    return existing;
  }
  const saved = existing ?? retained.get(root);
  existing?.cleanup();
  const newer = records.get(root);
  if (newer) return newer;
  if (existing && !uiActive(root)) return existing;
  const panels = directParts(root, "panel"),
    handles = directParts(root, "handle");
  if (panels.length < 2 || handles.length !== panels.length - 1)
    throw new Error("Resizable needs at least two direct panels and one handle between each pair.");
  if (!alternating(root))
    throw new Error("Resizable direct parts must alternate panel, handle, panel.");
  validateConstraints(panels);
  const authored = parseSizes(root.dataset.value, panels.length),
    defaults = panels.map((panel) => Number(panel.dataset.size));
  const record: ResizableRecord = {
    ...uiResources(root),
    busy: true,
    drag: undefined,
    handles,
    panels,
    restoreSizes: new Map(saved?.restoreSizes),
    sizes: normalizedSizes(
      panels,
      authored ??
        (saved?.sizes.length === panels.length ? saved.sizes : undefined) ??
        (defaults.every((value) => Number.isFinite(value) && value >= 0)
          ? defaults
          : panels.map(() => 100 / panels.length)),
    ),
    stop: undefined,
  };
  record.cleanups.add(() =>
    retained.set(root, { sizes: [...record.sizes], restoreSizes: new Map(record.restoreSizes) }),
  );
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  const op = operation(record);
  let wired = false;
  try {
    const key = root.dataset.storageKey?.trim();
    if (!authored && !saved && key) {
      try {
        const storage = record.window.localStorage;
        if (op.valid()) {
          const value = storage.getItem(`jquery-star:resizable:${key}`);
          if (op.valid())
            record.sizes = normalizedSizes(
              panels,
              parseSizes(value ?? undefined, panels.length) ?? record.sizes,
            );
        }
      } catch {
        /* Optional storage. */
      }
    }
    render(record, op);
    if (op.valid()) wire(record, op);
    wired = op.valid();
  } catch (error) {
    failUISetup(record, error);
  } finally {
    record.busy = false;
    if (!wired && record.active) record.cleanup();
  }
  return record;
}
function resolve(
  owner: Document,
  target: ResizableTarget,
  within: ParentNode = owner,
): HTMLElement {
  const root =
    typeof target === "string"
      ? resizableRoot(
          isHTMLElement(within) && within.matches(target) ? within : within.querySelector(target),
        )
      : resizableRoot(target);
  if (!root)
    throw new Error(`Resizable target did not match data-jqs="resizable": ${String(target)}`);
  if (root.ownerDocument !== owner || !uiActive(root))
    throw new Error("This Resizable target is unavailable in its owning Document.");
  return root;
}
function controlled(owner: Document, context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target) || typeof target === "string")
    return resolve(owner, target, context.root);
  const root =
    resizableRoot(context.element?.closest('[data-jqs="resizable"]') ?? null) ??
    resizableRoot(context.root);
  if (root) return resolve(owner, root);
  throw new Error('Resizable action needs a selector or an element inside data-jqs="resizable".');
}
export function createResizables(
  registerAction: ActionRegistrar,
  owner: Document,
): ResizableCollection {
  const set = (
    root: HTMLElement,
    input: readonly number[],
    permit: Current = () => true,
  ): HTMLElement =>
    request(
      root,
      (record, op) => {
        const sizes = [...input];
        if (!op.valid()) return;
        if (sizes.length !== record.panels.length)
          throw new Error(`Resizable #${root.id} needs ${record.panels.length} panel sizes.`);
        if (!sizes.every((size) => typeof size === "number" && Number.isFinite(size)))
          throw new Error("Resizable needs finite panel sizes.");
        applySizes(record, sizes, op);
      },
      permit,
    );
  const reset = (root: HTMLElement, permit: Current = () => true): HTMLElement =>
    request(
      root,
      (record, op) => {
        const defaults = record.panels.map((panel) =>
          Number(panel.getAttribute("data-default-size")),
        );
        applySizes(
          record,
          defaults.every((size) => Number.isFinite(size) && size >= 0)
            ? defaults
            : record.panels.map(() => 100 / record.panels.length),
          op,
        );
        if (op.valid()) record.restoreSizes.clear();
      },
      permit,
    );
  const api: StarResizableStatic = {
    set: (target, sizes) => set(resolve(owner, target), sizes),
    resize: (target, index, size) =>
      request(resolve(owner, target), (record, op) => requestPair(record, index, size, op)),
    collapse: (target, index = 0) =>
      request(resolve(owner, target), (record, op) => collapse(record, index, op)),
    reset: (target) => reset(resolve(owner, target)),
    value: (target) => {
      const root = resolve(owner, target),
        record = enhanceResizable(root);
      return normalizedSizes(
        record.panels,
        parseSizes(root.dataset.value, record.panels.length) ?? record.sizes,
      );
    },
  };
  const allowed = (context: StarContext, root: HTMLElement): boolean =>
    uiActive(root) &&
    root.ownerDocument === owner &&
    !constrained(root) &&
    uiActive(context.root) &&
    context.root.ownerDocument === owner &&
    !constrained(context.root) &&
    (!context.element ||
      (context.element.ownerDocument === owner &&
        uiActive(context.element) &&
        !constrained(context.element))) &&
    !(context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) &&
    !(context.event && "isDefaultPrevented" in context.event && context.event.isDefaultPrevented());
  for (const name of ["set", "resize", "collapse", "reset"] as const)
    registerAction(`ui.resizable.${name}`, (context) => {
      const first = context.args?.[0],
        explicit = isHTMLElement(first) || typeof first === "string";
      const root = controlled(owner, context, explicit ? first : undefined),
        permit = () => allowed(context, root);
      const value = explicit ? context.args?.[1] : first,
        next = explicit ? context.args?.[2] : context.args?.[1];
      if (name === "set") {
        if (!Array.isArray(value))
          throw new Error("ui.resizable.set needs an array of panel sizes.");
        return set(root, value as number[], permit);
      }
      if (name === "reset") return reset(root, permit);
      if (name === "resize" && (typeof value !== "number" || typeof next !== "number"))
        throw new Error("ui.resizable.resize needs a zero-based handle index and primary size.");
      return request(
        root,
        (record, op) =>
          name === "collapse"
            ? collapse(record, typeof value === "number" ? value : 0, op)
            : requestPair(record, Number(value), Number(next), op),
        permit,
      );
    });
  return {
    api,
    enhance(root) {
      for (const element of uiElements(root, '[data-jqs="resizable"]')) {
        const target = resizableRoot(element);
        if (target && target.ownerDocument === owner) enhanceResizable(target);
      }
    },
  };
}

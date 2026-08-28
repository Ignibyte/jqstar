export type FloatingSide = "top" | "right" | "bottom" | "left";
export type FloatingAlignment = "start" | "center" | "end";

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
}

export function showFloating(content: HTMLElement): void {
  if (supportsPopover(content)) (content as NativePopoverElement).showPopover();
  else content.hidden = false;
}

export function hideFloating(content: HTMLElement): void {
  if (supportsPopover(content)) {
    try {
      (content as NativePopoverElement).hidePopover();
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
): void {
  const triggerRect = trigger.getBoundingClientRect();
  const contentRect = content.getBoundingClientRect();
  const width = content.offsetWidth || contentRect.width;
  const height = content.offsetHeight || contentRect.height;
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
): void {
  const contentRect = content.getBoundingClientRect();
  const width = content.offsetWidth || contentRect.width;
  const height = content.offsetHeight || contentRect.height;
  const left = clamp(x, edge, window.innerWidth - width - edge);
  const top = clamp(y, edge, window.innerHeight - height - edge);
  content.style.left = `${left}px`;
  content.style.top = `${top}px`;
  content.dataset.side = top < y ? "top" : "bottom";
  content.dataset.align = left < x ? "end" : "start";
}

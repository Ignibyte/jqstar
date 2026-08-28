import { registerAction } from "../registry";
import type { StarContext, StarToastStatic, ToastOptions, ToastTarget } from "../types";

interface ToastRecord {
  cleanups: Array<() => void>;
  duration: number;
  focused: boolean;
  open: boolean;
  pointed: boolean;
  remaining: number;
  root: HTMLElement;
  startedAt: number;
  swipeStart: number | undefined;
  timer: number | undefined;
  viewport: HTMLElement;
}

interface ToastEventDetail {
  toast: HTMLElement;
  viewport: HTMLElement;
}

interface ToastCollection {
  api: StarToastStatic;
  enhance(root: ParentNode): void;
}

const records = new WeakMap<HTMLElement, ToastRecord>();
const activeRecords = new Set<ToastRecord>();
let toastId = 0;
let viewportId = 0;
let globalListenersInstalled = false;

function toastRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="toast"]') ? value : undefined;
}

function viewportRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="toast-viewport"]')
    ? value
    : undefined;
}

function enhanceViewport(viewport: HTMLElement): HTMLElement {
  viewport.id ||= `jqs-toast-viewport-${++viewportId}`;
  viewport.setAttribute("role", "region");
  viewport.setAttribute(
    "aria-label",
    viewport.getAttribute("aria-label") || `Notifications (${viewport.dataset.hotkey || "F8"})`,
  );
  viewport.tabIndex = -1;
  return viewport;
}

function resolveViewport(target?: ToastTarget): HTMLElement {
  if (target !== undefined) {
    const resolved =
      typeof target === "string"
        ? viewportRoot(document.querySelector(target))
        : viewportRoot(target);
    if (resolved) return enhanceViewport(resolved);
    throw new Error(
      `Toast viewport target did not match data-jqs="toast-viewport": ${String(target)}`,
    );
  }
  const existing = viewportRoot(document.querySelector('[data-jqs="toast-viewport"]'));
  if (existing) return enhanceViewport(existing);
  const viewport = document.createElement("div");
  viewport.dataset.jqs = "toast-viewport";
  document.body.append(viewport);
  return enhanceViewport(viewport);
}

function emit(
  record: ToastRecord,
  name: "open" | "before-dismiss" | "dismiss",
  cancelable = false,
): boolean {
  const detail: ToastEventDetail = { toast: record.root, viewport: record.viewport };
  return record.root.dispatchEvent(
    new CustomEvent(`jquery-star:toast:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function textPart(root: HTMLElement, part: "title" | "description"): HTMLElement | undefined {
  return root.querySelector<HTMLElement>(`[data-part="${part}"]`) ?? undefined;
}

function identifyParts(root: HTMLElement): void {
  const title = textPart(root, "title");
  const description = textPart(root, "description");
  if (title) title.id ||= `${root.id}-title`;
  if (description) description.id ||= `${root.id}-description`;
  if (!root.hasAttribute("aria-label") && !root.hasAttribute("aria-labelledby")) {
    if (title) root.setAttribute("aria-labelledby", title.id);
    else if (description) root.setAttribute("aria-labelledby", description.id);
    else root.setAttribute("aria-label", root.textContent?.trim() || "Notification");
  }
  if (title && description && !root.hasAttribute("aria-describedby")) {
    root.setAttribute("aria-describedby", description.id);
  }
}

function actionAltText(root: HTMLElement): string | undefined {
  const action = root.querySelector<HTMLElement>('[data-part="action"]');
  if (!action) return undefined;
  const alt = action.getAttribute("data-alt-text")?.trim();
  if (!alt) throw new Error("Toast actions need non-empty data-alt-text fallback instructions.");
  return alt;
}

function announce(record: ToastRecord): void {
  const title = textPart(record.root, "title")?.textContent?.trim();
  const description = textPart(record.root, "description")?.textContent?.trim();
  const alt = actionAltText(record.root);
  const message = [title, description, alt].filter(Boolean).join(". ");
  if (!message) return;
  const announcer = document.createElement("div");
  announcer.dataset.part = "announcer";
  announcer.setAttribute(
    "role",
    record.root.getAttribute("data-priority") === "assertive" ? "alert" : "status",
  );
  announcer.setAttribute("aria-atomic", "true");
  announcer.textContent = message;
  record.viewport.append(announcer);
  window.setTimeout(() => announcer.remove(), 10_000);
}

function durationFor(root: HTMLElement, viewport: HTMLElement): number {
  const value = root.getAttribute("data-duration") ?? viewport.getAttribute("data-duration");
  if (value !== null) {
    const duration = Number(value);
    if (Number.isFinite(duration) && duration >= 0) return duration;
  }
  return root.querySelector('[data-part="action"]') ? 0 : 5000;
}

function clearTimer(record: ToastRecord): void {
  if (record.timer !== undefined) window.clearTimeout(record.timer);
  record.timer = undefined;
}

function pause(record: ToastRecord): void {
  if (!record.open || record.timer === undefined) return;
  record.remaining = Math.max(0, record.remaining - (Date.now() - record.startedAt));
  clearTimer(record);
  record.root.dataset.paused = "true";
}

function resume(record: ToastRecord): void {
  if (!record.open || record.duration === 0 || record.timer !== undefined || record.remaining <= 0)
    return;
  record.root.dataset.paused = "false";
  record.startedAt = Date.now();
  record.timer = window.setTimeout(() => {
    record.timer = undefined;
    dismissToast(record.root);
  }, record.remaining);
}

function nextFocus(record: ToastRecord): HTMLElement {
  for (const candidate of activeRecords) {
    if (candidate === record || !candidate.root.isConnected) continue;
    const focusable = candidate.root.querySelector<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (focusable) return focusable;
  }
  return record.viewport;
}

function cleanupRecord(record: ToastRecord): void {
  clearTimer(record);
  for (const cleanup of record.cleanups) cleanup();
  record.cleanups = [];
  record.open = false;
  activeRecords.delete(record);
}

function dismissToast(root: HTMLElement): HTMLElement {
  const record = records.get(root) ?? enhanceToast(root);
  if (!record.open || !emit(record, "before-dismiss", true)) return root;
  const focus = root.contains(document.activeElement) ? nextFocus(record) : undefined;
  root.dataset.state = "closed";
  cleanupRecord(record);
  root.remove();
  focus?.focus();
  emit(record, "dismiss");
  return root;
}

function resetSwipe(record: ToastRecord): void {
  record.swipeStart = undefined;
  record.root.style.removeProperty("--jqs-toast-swipe-x");
  delete record.root.dataset.swipe;
}

function wireToast(record: ToastRecord): void {
  const pointerEnter = (): void => {
    record.pointed = true;
    pause(record);
  };
  const pointerLeave = (): void => {
    record.pointed = false;
    if (!record.focused) resume(record);
  };
  const focusIn = (): void => {
    record.focused = true;
    pause(record);
  };
  const focusOut = (): void => {
    record.focused = false;
    if (!record.pointed) resume(record);
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    dismissToast(record.root);
  };
  const pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0) return;
    record.swipeStart = event.clientX;
    record.root.dataset.swipe = "start";
    pause(record);
    record.root.setPointerCapture?.(event.pointerId);
  };
  const pointerMove = (event: PointerEvent): void => {
    if (record.swipeStart === undefined) return;
    const distance = event.clientX - record.swipeStart;
    record.root.dataset.swipe = "move";
    record.root.style.setProperty("--jqs-toast-swipe-x", `${distance}px`);
  };
  const pointerUp = (event: PointerEvent): void => {
    if (record.swipeStart === undefined) return;
    const distance = event.clientX - record.swipeStart;
    if (Math.abs(distance) >= 50) {
      record.root.dataset.swipe = "end";
      dismissToast(record.root);
    } else {
      record.root.dataset.swipe = "cancel";
      resetSwipe(record);
      if (!record.pointed && !record.focused) resume(record);
    }
  };
  record.root.addEventListener("pointerenter", pointerEnter);
  record.root.addEventListener("pointerleave", pointerLeave);
  record.root.addEventListener("focusin", focusIn);
  record.root.addEventListener("focusout", focusOut);
  record.root.addEventListener("keydown", keydown);
  record.root.addEventListener("pointerdown", pointerDown);
  record.root.addEventListener("pointermove", pointerMove);
  record.root.addEventListener("pointerup", pointerUp);
  record.cleanups.push(
    () => record.root.removeEventListener("pointerenter", pointerEnter),
    () => record.root.removeEventListener("pointerleave", pointerLeave),
    () => record.root.removeEventListener("focusin", focusIn),
    () => record.root.removeEventListener("focusout", focusOut),
    () => record.root.removeEventListener("keydown", keydown),
    () => record.root.removeEventListener("pointerdown", pointerDown),
    () => record.root.removeEventListener("pointermove", pointerMove),
    () => record.root.removeEventListener("pointerup", pointerUp),
  );

  for (const close of record.root.querySelectorAll<HTMLElement>('[data-part="close"]')) {
    close.setAttribute("aria-label", close.getAttribute("aria-label") || "Dismiss notification");
    const click = (): void => {
      dismissToast(record.root);
    };
    close.addEventListener("click", click);
    record.cleanups.push(() => close.removeEventListener("click", click));
  }
  for (const action of record.root.querySelectorAll<HTMLElement>('[data-part="action"]')) {
    const click = (): void => {
      if (action.getAttribute("data-close-on-action") !== "false") dismissToast(record.root);
    };
    action.addEventListener("click", click);
    record.cleanups.push(() => action.removeEventListener("click", click));
  }
}

function enhanceToast(root: HTMLElement): ToastRecord {
  root.id ||= `jqs-toast-${++toastId}`;
  root.setAttribute("role", "group");
  root.dataset.variant ||= "default";
  identifyParts(root);
  actionAltText(root);
  let viewport = viewportRoot(root.closest('[data-jqs="toast-viewport"]'));
  if (!viewport) {
    viewport = resolveViewport();
    viewport.append(root);
  }
  enhanceViewport(viewport);

  let record = records.get(root);
  if (!record) {
    const duration = durationFor(root, viewport);
    record = {
      cleanups: [],
      duration,
      focused: false,
      open: true,
      pointed: false,
      remaining: duration,
      root,
      startedAt: Date.now(),
      swipeStart: undefined,
      timer: undefined,
      viewport,
    };
    records.set(root, record);
    activeRecords.add(record);
    root.dataset.state = "open";
    wireToast(record);
    announce(record);
    resume(record);
    emit(record, "open");
  } else {
    for (const cleanup of record.cleanups) cleanup();
    record.cleanups = [];
    record.viewport = viewport;
    wireToast(record);
  }
  return record;
}

function toastElements(root: ParentNode): HTMLElement[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-jqs="toast"]'));
  const toast = root instanceof Element ? toastRoot(root) : undefined;
  if (toast) elements.unshift(toast);
  return elements;
}

function viewportElements(root: ParentNode): HTMLElement[] {
  const elements = Array.from(root.querySelectorAll<HTMLElement>('[data-jqs="toast-viewport"]'));
  const viewport = root instanceof Element ? viewportRoot(root) : undefined;
  if (viewport) elements.unshift(viewport);
  return elements;
}

function enhanceTree(root: ParentNode): void {
  for (const viewport of viewportElements(root)) enhanceViewport(viewport);
  for (const toast of toastElements(root)) enhanceToast(toast);
}

function resolveToast(target: ToastTarget): HTMLElement {
  const resolved =
    typeof target === "string" ? toastRoot(document.querySelector(target)) : toastRoot(target);
  if (resolved) return resolved;
  throw new Error(`Toast target did not match data-jqs="toast": ${String(target)}`);
}

function showToast(options: string | ToastOptions): HTMLElement {
  const normalized: ToastOptions = typeof options === "string" ? { description: options } : options;
  const viewport = resolveViewport(normalized.viewport);
  const root = document.createElement("div");
  root.dataset.jqs = "toast";
  root.dataset.priority = normalized.priority ?? "polite";
  root.dataset.variant = normalized.variant ?? "default";
  if (normalized.duration === false) root.dataset.duration = "0";
  else if (normalized.duration !== undefined) root.dataset.duration = String(normalized.duration);
  if (normalized.title) {
    const title = document.createElement("div");
    title.dataset.part = "title";
    title.textContent = normalized.title;
    root.append(title);
  }
  const description = document.createElement("div");
  description.dataset.part = "description";
  description.textContent = normalized.description;
  root.append(description);
  const close = document.createElement("button");
  close.dataset.part = "close";
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "×";
  root.append(close);
  viewport.append(root);
  enhanceToast(root);
  return root;
}

function controlledToast(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="toast"]')) return target;
  if (typeof target === "string") return resolveToast(target);
  const toast = context.element?.closest('[data-jqs="toast"]') ?? null;
  const resolved = toastRoot(toast);
  if (resolved) return resolved;
  throw new Error('Toast dismiss action needs a selector or an element inside data-jqs="toast".');
}

function installGlobalListeners(): void {
  if (globalListenersInstalled || typeof document === "undefined") return;
  document.addEventListener("keydown", (event) => {
    if (event.key !== "F8") return;
    const viewport = viewportRoot(document.querySelector('[data-jqs="toast-viewport"]'));
    if (!viewport) return;
    event.preventDefault();
    enhanceViewport(viewport).focus();
  });
  window.addEventListener("blur", () => {
    for (const record of activeRecords) pause(record);
  });
  window.addEventListener("focus", () => {
    for (const record of activeRecords) {
      if (!record.pointed && !record.focused) resume(record);
    }
  });
  document.addEventListener("visibilitychange", () => {
    for (const record of activeRecords) {
      if (document.hidden) pause(record);
      else if (!record.pointed && !record.focused) resume(record);
    }
  });
  new MutationObserver(() => {
    for (const record of [...activeRecords]) {
      if (!record.root.isConnected) cleanupRecord(record);
    }
  }).observe(document.documentElement, { childList: true, subtree: true });
  globalListenersInstalled = true;
}

function registerActions(api: StarToastStatic): void {
  registerAction("ui.toast.show", (context) => {
    const value = context.args?.[0];
    if (typeof value !== "string" && (typeof value !== "object" || value === null)) {
      throw new Error("ui.toast.show needs a message string or Toast options object.");
    }
    return api.show(value as string | ToastOptions);
  });
  registerAction("ui.toast.dismiss", (context) =>
    api.dismiss(controlledToast(context, context.args?.[0])),
  );
  registerAction("ui.toast.clear", () => api.clear());
}

export function createToasts(): ToastCollection {
  const api: StarToastStatic = {
    show: showToast,
    dismiss: (target) => dismissToast(resolveToast(target)),
    clear: () => {
      for (const record of [...activeRecords]) dismissToast(record.root);
    },
  };
  registerActions(api);
  installGlobalListeners();
  return { api, enhance: enhanceTree };
}

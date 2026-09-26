import type { ActionRegistrar } from "../registry";
import type { DocumentHost } from "../kernel";
import type { StarContext, StarToastStatic, ToastOptions, ToastTarget } from "../types";
import { isElementNode, isHTMLElement } from "../dom";
import { documentRecords } from "./floating";
import { ownUI, ownUIRecord, uiActive, uiElements } from "./lifecycle";

interface ToastScope {
  active: boolean;
  blurred: boolean;
  document: Document;
  window: Window;
  now: () => number;
  revision: number;
}

interface ToastRecord {
  active: boolean;
  announcement: (() => void) | undefined;
  binding: number;
  busy: boolean;
  cleanups: Array<() => void>;
  closes: HTMLElement[];
  actions: HTMLElement[];
  duration: number;
  focused: boolean;
  open: boolean;
  pointed: boolean;
  parts: HTMLElement[];
  pointer: number | undefined;
  cleanup: () => void;
  remaining: number;
  revision: number;
  root: HTMLElement;
  startedAt: number;
  scope: ToastScope;
  swipeStart: number | undefined;
  timer: number | undefined;
  timerRevision: number;
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
const intents = new WeakMap<HTMLElement, number>();
const generated = new WeakMap<HTMLElement, Map<string, string | undefined>>();
const activeRecords = new Set<ToastRecord>();
const retainedState = new WeakMap<
  HTMLElement,
  Pick<ToastRecord, "duration" | "remaining" | "open">
>();
let toastId = 0;
let viewportId = 0;

type Current = () => boolean;

function owned(root: HTMLElement, selector: string): HTMLElement[] {
  return Array.from(root.querySelectorAll(selector)).filter(
    (element): element is HTMLElement =>
      isHTMLElement(element) &&
      element.closest('[data-jqs]:not(button[data-jqs="button"])') === root,
  );
}

function parts(root: HTMLElement): HTMLElement[] {
  return owned(
    root,
    '[data-part="title"],[data-part="description"],[data-part="close"],[data-part="action"]',
  );
}

function live(record: ToastRecord): boolean {
  return (
    record.active &&
    record.scope.active &&
    record.root.ownerDocument === record.scope.document &&
    records.get(record.root) === record &&
    uiActive(record.root)
  );
}

function current(record: ToastRecord, revision = record.revision): boolean {
  if (
    !live(record) ||
    record.revision !== revision ||
    toastRoot(record.root) !== record.root ||
    viewportRoot(record.root.closest('[data-jqs="toast-viewport"]')) !== record.viewport ||
    record.viewport.ownerDocument !== record.scope.document ||
    !uiActive(record.viewport)
  )
    return false;
  const elements = parts(record.root);
  return (
    elements.length === record.parts.length &&
    elements.every((element, index) => element === record.parts[index])
  );
}

function disabled(element: Element): boolean {
  return Boolean(
    element.closest(
      ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]',
    ),
  );
}

function nativeAllowed(record: ToastRecord, event: Event): boolean {
  return (
    !event.defaultPrevented &&
    current(record) &&
    !disabled(record.root) &&
    (!isElementNode(event.target) ||
      (event.target.closest('[data-jqs]:not(button[data-jqs="button"])') === record.root &&
        !disabled(event.target)))
  );
}

function operation(record: ToastRecord, allowed: Current = () => true) {
  const revision = record.revision;
  const attributes = new Map<Element, Map<string, string | null>>();
  const observe = (element: Element, names: string[]): void => {
    const values = attributes.get(element) ?? new Map<string, string | null>();
    for (const name of names) values.set(name, element.getAttribute(name));
    attributes.set(element, values);
  };
  observe(record.root, [
    "data-state",
    "data-duration",
    "data-priority",
    "data-variant",
    "aria-label",
    "aria-labelledby",
    "aria-describedby",
  ]);
  observe(record.viewport, ["data-duration", "data-hotkey"]);
  for (const part of record.parts)
    observe(part, ["id", "data-alt-text", "data-close-on-action", "aria-label"]);
  for (const part of [record.root, ...record.parts])
    for (let element: Element | null = part; element; element = element.parentElement)
      observe(element, ["disabled", "inert", "aria-disabled", "data-disabled"]);
  const text = record.parts
    .filter((part) => ["title", "description"].includes(part.dataset.part ?? ""))
    .map((part) => [part, part.textContent] as const);
  const source = (): boolean =>
    [...attributes].every(([element, values]) =>
      [...values].every(([name, value]) => element.getAttribute(name) === value),
    ) && text.every(([part, value]) => part.textContent === value);
  const valid = (): boolean => current(record, revision) && source() && allowed();
  const write = (run: () => void): boolean => {
    if (!valid()) return false;
    run();
    return valid();
  };
  const attribute = (element: HTMLElement, name: string, value: string | undefined): boolean => {
    if (!valid()) return false;
    const next = value ?? null;
    if (element.getAttribute(name) === next) return true;
    if (attributes.get(element)?.has(name)) attributes.get(element)?.set(name, next);
    if (next === null) element.removeAttribute(name);
    else element.setAttribute(name, next);
    return valid();
  };
  return { valid, source, write, attribute };
}

type Operation = ReturnType<typeof operation>;

function authored(element: HTMLElement, name: string): string | undefined {
  const value = element.getAttribute(name) || undefined;
  return value && generated.get(element)?.get(name) !== value ? value : undefined;
}

function generatedAttribute(
  op: Operation,
  element: HTMLElement,
  name: string,
  value?: string,
): boolean {
  if (!op.valid()) return false;
  if (authored(element, name)) return true;
  const values = generated.get(element) ?? new Map<string, string | undefined>();
  values.set(name, value);
  generated.set(element, values);
  return op.attribute(element, name, value);
}

function cleanupAll(cleanups: Array<() => void>): void {
  const errors: unknown[] = [];
  for (const cleanup of cleanups) {
    try {
      cleanup();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length) throw new AggregateError(errors, "Toast cleanup failed.");
}

function toastRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="toast"]') ? value : undefined;
}

function viewportRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="toast-viewport"]') ? value : undefined;
}

function enhanceViewport(viewport: HTMLElement, valid: Current): HTMLElement {
  const attribute = (name: string, value: string): void => {
    if (valid() && viewport.getAttribute(name) !== value) viewport.setAttribute(name, value);
  };
  if (!viewport.id) attribute("id", `jqs-toast-viewport-${++viewportId}`);
  attribute("role", "region");
  attribute(
    "aria-label",
    viewport.getAttribute("aria-label") || `Notifications (${viewport.dataset.hotkey || "F8"})`,
  );
  attribute("tabindex", "-1");
  return viewport;
}

function resolveViewport(
  scope: ToastScope,
  target: ToastTarget | undefined,
  valid: (viewport?: HTMLElement) => boolean,
): HTMLElement {
  const { document } = scope;
  if (target !== undefined) {
    const resolved =
      typeof target === "string"
        ? viewportRoot(document.querySelector(target))
        : viewportRoot(target);
    if (!resolved)
      throw new Error(
        `Toast viewport target did not match data-jqs="toast-viewport": ${String(target)}`,
      );
    if (resolved.ownerDocument !== document || !uiActive(resolved))
      throw new Error("This Toast viewport is unavailable in its owning Document.");
    return enhanceViewport(
      resolved,
      () => valid(resolved) && uiActive(resolved) && resolved.ownerDocument === document,
    );
  }
  const existing = viewportRoot(uiElements(document, '[data-jqs="toast-viewport"]')[0] ?? null);
  if (existing) return enhanceViewport(existing, () => valid(existing) && uiActive(existing));
  if (!uiActive(document.body)) throw new Error("This Toast viewport is unavailable.");
  const viewport = document.createElement("div");
  viewport.dataset.jqs = "toast-viewport";
  if (valid(viewport)) document.body.append(viewport);
  return enhanceViewport(viewport, () => valid(viewport) && uiActive(viewport));
}

function emit(
  record: ToastRecord,
  name: "open" | "before-dismiss" | "dismiss",
  cancelable = false,
): boolean {
  const detail: ToastEventDetail = { toast: record.root, viewport: record.viewport };
  return record.root.dispatchEvent(
    new (record.scope.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:toast:${name}`,
      {
        bubbles: true,
        cancelable,
        detail,
      },
    ),
  );
}

function textPart(root: HTMLElement, part: "title" | "description"): HTMLElement | undefined {
  return owned(root, `[data-part="${part}"]`)[0];
}

function identifyParts(record: ToastRecord, op: Operation): void {
  const { root } = record;
  const title = textPart(root, "title"),
    description = textPart(root, "description");
  for (const [part, name] of [
    [title, "title"],
    [description, "description"],
  ] as const)
    if (part && !part.id && !op.attribute(part, "id", `${root.id}-${name}`)) return;
  const labelledBy = authored(root, "aria-label") ? undefined : title?.id || description?.id;
  if (!generatedAttribute(op, root, "aria-labelledby", labelledBy)) return;
  if (
    !generatedAttribute(
      op,
      root,
      "aria-label",
      root.hasAttribute("aria-labelledby") ? undefined : root.textContent.trim() || "Notification",
    )
  )
    return;
  generatedAttribute(op, root, "aria-describedby", title ? description?.id : undefined);
}

function actionAltText(root: HTMLElement): string | undefined {
  const actions = owned(root, '[data-part="action"]');
  const alternatives = actions.map((action) => action.getAttribute("data-alt-text")?.trim());
  if (alternatives.some((value) => !value))
    throw new Error("Toast actions need non-empty data-alt-text fallback instructions.");
  return alternatives.filter(Boolean).join(". ") || undefined;
}

function announce(record: ToastRecord): void {
  const op = operation(record);
  const title = textPart(record.root, "title")?.textContent.trim();
  const description = textPart(record.root, "description")?.textContent.trim();
  const alt = actionAltText(record.root);
  const message = [title, description, alt].filter(Boolean).join(". ");
  if (!message) return;
  const { document, window } = record.scope;
  const announcer = document.createElement("div");
  announcer.dataset.part = "announcer";
  announcer.setAttribute(
    "role",
    record.root.getAttribute("data-priority") === "assertive" ? "alert" : "status",
  );
  announcer.setAttribute("aria-atomic", "true");
  announcer.textContent = message;
  const lifetime = { active: true };
  let timer: number | undefined;
  const release = ownUI(record.viewport, () => {
    lifetime.active = false;
    cleanupAll([
      () => {
        if (timer !== undefined) window.clearTimeout(timer);
        timer = undefined;
      },
      () => announcer.remove(),
    ]);
  });
  if (!op.valid()) {
    release();
    return;
  }
  record.announcement = release;
  record.viewport.append(announcer);
  if (!lifetime.active || !op.valid()) {
    release();
    announcer.remove();
    return;
  }
  const scheduled = window.setTimeout(release, 10_000);
  if (lifetime.active && op.valid()) timer = scheduled;
  else {
    window.clearTimeout(scheduled);
    release();
  }
}

function durationFor(root: HTMLElement, viewport: HTMLElement): number {
  const value = root.getAttribute("data-duration") ?? viewport.getAttribute("data-duration");
  if (value !== null) {
    const duration = Number(value);
    if (Number.isFinite(duration) && duration >= 0) return duration;
  }
  return owned(root, '[data-part="action"]').length ? 0 : 5000;
}

function clearTimer(record: ToastRecord): void {
  const timer = record.timer;
  record.timer = undefined;
  ++record.timerRevision;
  if (timer !== undefined) record.scope.window.clearTimeout(timer);
}

function pause(record: ToastRecord): void {
  if (!current(record) || !record.open) return;
  const op = operation(record);
  if (record.timer !== undefined)
    record.remaining = Math.max(0, record.remaining - (record.scope.now() - record.startedAt));
  clearTimer(record);
  op.attribute(record.root, "data-paused", "true");
}

function resume(record: ToastRecord): void {
  const op = operation(record);
  if (
    !current(record) ||
    !record.open ||
    record.duration === 0 ||
    record.timer !== undefined ||
    record.remaining <= 0
  )
    return;
  if (
    record.scope.blurred ||
    record.scope.document.hidden ||
    record.pointed ||
    record.focused ||
    record.pointer !== undefined
  ) {
    op.attribute(record.root, "data-paused", "true");
    return;
  }
  if (!op.attribute(record.root, "data-paused", "false")) return;
  const window = record.scope.window;
  record.startedAt = record.scope.now();
  if (!op.valid()) return;
  const revision = ++record.timerRevision;
  const timer = window.setTimeout(() => {
    if (!live(record) || record.timerRevision !== revision) return;
    record.timer = undefined;
    record.remaining = 0;
    const active = enhanceToast(record.scope, record.root);
    if (active === record && record.timerRevision === revision) dismissToast(record);
  }, record.remaining);
  if (op.valid() && record.timerRevision === revision) record.timer = timer;
  else window.clearTimeout(timer);
}

function nextFocus(record: ToastRecord): HTMLElement {
  for (const candidate of documentRecords(activeRecords, record.scope.document)) {
    if (candidate === record || !candidate.root.isConnected || !current(candidate)) continue;
    const focusable = owned(
      candidate.root,
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    ).find((element) => !disabled(element) && !element.hidden);
    if (focusable) return focusable;
  }
  return record.viewport;
}

function cleanupRecord(record: ToastRecord): void {
  record.active = false;
  ++record.binding;
  activeRecords.delete(record);
  if (record.timer !== undefined)
    record.remaining = Math.max(0, record.remaining - (record.scope.now() - record.startedAt));
  retainedState.set(record.root, {
    duration: record.duration,
    remaining: record.remaining,
    open: record.open,
  });
  record.open = false;
  const announcement = record.announcement;
  record.announcement = undefined;
  cleanupAll([
    () => clearTimer(record),
    () => announcement?.(),
    () => resetSwipe(record),
    ...record.cleanups.splice(0),
  ]);
}

function dismissToast(record: ToastRecord, allowed: Current = () => true): HTMLElement {
  const { root } = record;
  if (!current(record) || !record.open || !allowed()) return root;
  const revision = ++record.revision;
  const op = operation(record, allowed);
  if (!emit(record, "before-dismiss", true) || !op.valid()) return root;
  const focus = root.contains(record.scope.document.activeElement) ? nextFocus(record) : undefined;
  let parent = root.parentNode;
  if (!op.attribute(root, "data-state", "closed")) return root;
  record.open = false;
  record.announcement = undefined;
  record.cleanup();
  const continuing = (): boolean =>
    record.scope.active &&
    !records.has(root) &&
    root.ownerDocument === record.scope.document &&
    record.revision === revision &&
    root.parentNode === parent &&
    (!parent || root.closest('[data-jqs="toast-viewport"]') === record.viewport) &&
    record.viewport.ownerDocument === record.scope.document &&
    uiActive(record.viewport) &&
    uiActive(root) &&
    op.source() &&
    allowed() &&
    parts(root).length === record.parts.length &&
    parts(root).every((part, index) => part === record.parts[index]);
  if (!continuing()) return root;
  root.remove();
  parent = null;
  if (!continuing() || root.parentNode !== null) return root;
  if (focus && focus.ownerDocument === record.scope.document && uiActive(focus) && !disabled(focus))
    focus.focus();
  if (continuing()) emit(record, "dismiss");
  return root;
}

function resetSwipe(record: ToastRecord): void {
  const pointer = record.pointer;
  record.pointer = undefined;
  record.swipeStart = undefined;
  const available = (): boolean =>
    (!records.has(record.root) || records.get(record.root) === record) &&
    record.pointer === undefined;
  if (available()) record.root.style.removeProperty("--jqs-toast-swipe-x");
  if (available()) delete record.root.dataset.swipe;
  if (pointer !== undefined) record.root.releasePointerCapture?.(pointer);
}

function wireToast(record: ToastRecord, op: Operation): void {
  const binding = ++record.binding;
  const listen = <Name extends keyof HTMLElementEventMap>(
    target: HTMLElement,
    name: Name,
    callback: (event: HTMLElementEventMap[Name]) => void,
  ): void => {
    if (!op.valid() || binding !== record.binding) return;
    const listener = (event: HTMLElementEventMap[Name]): void => {
      if (current(record) && binding === record.binding) callback(event);
    };
    const cleanup = (): void => target.removeEventListener(name, listener);
    record.cleanups.push(cleanup);
    try {
      target.addEventListener(name, listener);
    } finally {
      if (!op.valid() || binding !== record.binding) cleanup();
    }
  };
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
  const focusOut = (event: FocusEvent): void => {
    record.focused =
      isElementNode(event.relatedTarget) && record.root.contains(event.relatedTarget);
    if (!record.pointed && !record.focused) resume(record);
  };
  const keydown = (event: KeyboardEvent): void => {
    if (event.key !== "Escape" || !nativeAllowed(record, event)) return;
    event.preventDefault();
    dismissToast(
      record,
      () => !disabled(record.root) && (!isElementNode(event.target) || !disabled(event.target)),
    );
  };
  const pointerDown = (event: PointerEvent): void => {
    if (event.button !== 0 || !nativeAllowed(record, event)) return;
    ++record.revision;
    const pointerOp = operation(record);
    record.swipeStart = event.clientX;
    record.pointer = event.pointerId;
    if (!pointerOp.attribute(record.root, "data-swipe", "start")) return;
    pause(record);
    if (!pointerOp.valid()) return;
    try {
      record.root.setPointerCapture?.(event.pointerId);
    } catch (error) {
      record.pointer = undefined;
      resetSwipe(record);
      if (!record.pointed && !record.focused) resume(record);
      throw error;
    }
    if (!pointerOp.valid()) record.root.releasePointerCapture?.(event.pointerId);
  };
  const pointerMove = (event: PointerEvent): void => {
    if (
      record.swipeStart === undefined ||
      record.pointer !== event.pointerId ||
      !nativeAllowed(record, event)
    )
      return;
    const distance = event.clientX - record.swipeStart;
    const pointerOp = operation(record);
    if (pointerOp.attribute(record.root, "data-swipe", "move"))
      pointerOp.write(() => record.root.style.setProperty("--jqs-toast-swipe-x", `${distance}px`));
  };
  const pointerUp = (event: PointerEvent): void => {
    if (record.swipeStart === undefined || record.pointer !== event.pointerId) return;
    const distance = event.clientX - record.swipeStart;
    if (Math.abs(distance) >= 50 && nativeAllowed(record, event)) {
      record.root.dataset.swipe = "end";
      dismissToast(record);
      if (current(record)) {
        resetSwipe(record);
        if (!record.pointed && !record.focused) resume(record);
      }
    } else {
      record.root.dataset.swipe = "cancel";
      resetSwipe(record);
      if (!record.pointed && !record.focused) resume(record);
    }
  };
  const pointerCancel = (event: PointerEvent): void => {
    if (record.pointer !== event.pointerId) return;
    resetSwipe(record);
    if (!record.pointed && !record.focused) resume(record);
  };
  listen(record.root, "pointerenter", pointerEnter);
  listen(record.root, "pointerleave", pointerLeave);
  listen(record.root, "focusin", focusIn);
  listen(record.root, "focusout", focusOut);
  listen(record.root, "keydown", keydown);
  listen(record.root, "pointerdown", pointerDown);
  listen(record.root, "pointermove", pointerMove);
  listen(record.root, "pointerup", pointerUp);
  listen(record.root, "pointercancel", pointerCancel);
  listen(record.root, "lostpointercapture", pointerCancel);

  for (const close of record.closes) {
    if (!op.valid() || binding !== record.binding) return;
    if (
      !op.attribute(close, "aria-label", close.getAttribute("aria-label") || "Dismiss notification")
    )
      return;
    const click = (event: MouseEvent): void => {
      if (nativeAllowed(record, event))
        dismissToast(record, () => !event.defaultPrevented && !disabled(close));
    };
    listen(close, "click", click);
  }
  for (const action of record.actions) {
    const click = (event: MouseEvent): void => {
      if (nativeAllowed(record, event) && action.getAttribute("data-close-on-action") !== "false")
        dismissToast(record, () => !event.defaultPrevented && !disabled(action));
    };
    listen(action, "click", click);
  }
}

function enhanceToast(scope: ToastScope, root: HTMLElement): ToastRecord {
  let record = records.get(root);
  if (record && record.scope !== scope) {
    record.cleanup();
    record = records.get(root);
  }
  if (record?.busy || (record && !live(record))) return record;
  const available = (): boolean =>
    scope.active && root.ownerDocument === scope.document && uiActive(root);
  actionAltText(root);
  let viewport = viewportRoot(root.closest('[data-jqs="toast-viewport"]'));
  if (!viewport) {
    viewport = resolveViewport(scope, undefined, available);
    if (available()) viewport.append(root);
  }
  const elements = parts(root);
  const closes = elements.filter((part) => part.dataset.part === "close");
  const actions = elements.filter((part) => part.dataset.part === "action");
  const fresh = !record;
  if (!record) {
    const retained = retainedState.get(root);
    const duration = retained?.duration ?? durationFor(root, viewport);
    record = {
      active: true,
      announcement: undefined,
      binding: 0,
      busy: false,
      cleanups: [],
      closes,
      actions,
      duration,
      focused: root.contains(scope.document.activeElement),
      open: retained?.open ?? true,
      pointed: false,
      parts: elements,
      pointer: undefined,
      cleanup: () => undefined,
      remaining: retained?.remaining ?? duration,
      revision: 0,
      root,
      scope,
      startedAt: scope.now(),
      swipeStart: undefined,
      timer: undefined,
      timerRevision: 0,
      viewport,
    };
    const owned = record;
    record.cleanup = ownUIRecord(records, root, record, () => cleanupRecord(owned));
    retainedState.delete(root);
  }
  const changed =
    record.viewport !== viewport ||
    record.parts.length !== elements.length ||
    record.parts.some((part, index) => part !== elements[index]);
  if (changed) {
    ++record.revision;
    ++record.binding;
    record.viewport = viewport;
    record.parts = elements;
    record.closes = closes;
    record.actions = actions;
  }
  const op = operation(record);
  const active = record;
  active.busy = true;
  let initialized = !(fresh || changed);
  try {
    if (changed) cleanupAll(active.cleanups.splice(0));
    if (!op.valid()) return active;
    if (!root.id && !op.attribute(root, "id", `jqs-toast-${++toastId}`)) return active;
    if (!op.attribute(root, "role", "group")) return active;
    if (!root.dataset.variant && !op.attribute(root, "data-variant", "default")) return active;
    identifyParts(active, op);
    if (!op.valid()) return active;
    enhanceViewport(viewport, op.valid);
    if (fresh && !op.attribute(root, "data-state", active.open ? "open" : "closed")) return active;
    if (!op.valid() || !active.open) return active;
    activeRecords.add(active);
    if (fresh || changed) wireToast(active, op);
    initialized = op.valid();
    if (!op.valid()) return active;
    if (fresh) announce(active);
    if (op.valid()) resume(active);
    if (fresh && op.valid()) emit(active, "open");
  } catch (error) {
    releaseFailed(active, error);
  } finally {
    active.busy = false;
    if (!initialized && live(active)) active.cleanup();
  }
  return active;
}

function releaseFailed(record: ToastRecord, error: unknown): never {
  try {
    record.cleanup();
  } catch (cleanupError) {
    throw new AggregateError([error, cleanupError], "Toast setup and cleanup failed.", {
      cause: cleanupError,
    });
  }
  throw error;
}

function enhanceTree(scope: ToastScope, root: ParentNode): void {
  const available = (): boolean => scope.active;
  for (const element of uiElements(root, '[data-jqs="toast-viewport"]')) {
    const viewport = viewportRoot(element);
    if (viewport && viewport.ownerDocument === scope.document)
      enhanceViewport(viewport, () => available() && uiActive(viewport));
  }
  for (const element of uiElements(root, '[data-jqs="toast"]')) {
    const toast = toastRoot(element);
    if (toast && available() && toast.ownerDocument === scope.document) enhanceToast(scope, toast);
  }
}

function resolveToast(
  scope: ToastScope,
  target: ToastTarget,
  within: ParentNode = scope.document,
): HTMLElement {
  const resolved =
    typeof target === "string"
      ? toastRoot(
          isHTMLElement(within) && within.matches(target) ? within : within.querySelector(target),
        )
      : toastRoot(target);
  if (!resolved) throw new Error(`Toast target did not match data-jqs="toast": ${String(target)}`);
  if (!scope.active || resolved.ownerDocument !== scope.document || !uiActive(resolved))
    throw new Error("This Toast target is unavailable in its owning Document.");
  return resolved;
}

function showToast(
  scope: ToastScope,
  options: string | ToastOptions,
  allowed: (viewport?: HTMLElement) => boolean = () => true,
): HTMLElement {
  const { document } = scope;
  const revision = ++scope.revision;
  const valid = (viewport?: HTMLElement): boolean =>
    scope.active &&
    scope.revision === revision &&
    uiActive(document.documentElement) &&
    allowed(viewport);
  const root = document.createElement("div");
  root.dataset.jqs = "toast";
  const normalized: ToastOptions = typeof options === "string" ? { description: options } : options;
  if (!valid()) return root;
  const target = normalized.viewport;
  if (!valid()) return root;
  const descriptionText = normalized.description;
  if (!valid()) return root;
  const titleText = normalized.title;
  if (!valid()) return root;
  const duration = normalized.duration;
  if (!valid()) return root;
  const priority = normalized.priority;
  if (!valid()) return root;
  const variant = normalized.variant;
  if (!valid()) return root;
  const viewport = resolveViewport(scope, target, valid);
  root.dataset.priority = priority ?? "polite";
  root.dataset.variant = variant ?? "default";
  if (duration === false) root.dataset.duration = "0";
  else if (duration !== undefined) root.dataset.duration = String(duration);
  if (titleText) {
    const title = document.createElement("div");
    title.dataset.part = "title";
    title.textContent = titleText;
    root.append(title);
  }
  const description = document.createElement("div");
  description.dataset.part = "description";
  description.textContent = descriptionText;
  root.append(description);
  const close = document.createElement("button");
  close.dataset.part = "close";
  close.type = "button";
  close.setAttribute("aria-label", "Dismiss notification");
  close.textContent = "×";
  root.append(close);
  try {
    if (!valid(viewport) || viewport.ownerDocument !== document || !uiActive(viewport)) return root;
    viewport.append(root);
    if (valid(viewport) && uiActive(root)) enhanceToast(scope, root);
    else root.remove();
  } catch (error) {
    try {
      root.remove();
    } catch (cleanupError) {
      throw new AggregateError([error, cleanupError], "Toast creation and cleanup failed.", {
        cause: cleanupError,
      });
    }
    throw error;
  }
  return root;
}

function controlledToast(scope: ToastScope, context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target) || typeof target === "string")
    return resolveToast(scope, target, context.root);
  const root =
    toastRoot(context.element?.closest('[data-jqs="toast"]') ?? null) ??
    (isHTMLElement(context.root) ? toastRoot(context.root) : undefined);
  if (root) return resolveToast(scope, root);
  throw new Error('Toast dismiss action needs a selector or an element inside data-jqs="toast".');
}

function requestDismiss(
  scope: ToastScope,
  target: ToastTarget,
  allowed: Current = () => true,
): HTMLElement {
  const root = resolveToast(scope, target);
  if (!allowed()) return root;
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  const record = enhanceToast(scope, root);
  if (intents.get(root) === intent) dismissToast(record, allowed);
  return root;
}

function clearToasts(
  scope: ToastScope,
  allowed: (root?: HTMLElement) => boolean = () => true,
): void {
  const revision = ++scope.revision;
  for (const record of documentRecords(activeRecords, scope.document)) {
    if (!scope.active || scope.revision !== revision || !allowed()) break;
    requestDismiss(scope, record.root, () => allowed(record.root));
  }
}

function installGlobalListeners(scope: ToastScope, host: DocumentHost): void {
  const { document, window } = host;
  host.listen(document, "keydown", (event: KeyboardEvent) => {
    if (
      event.key !== "F8" ||
      event.defaultPrevented ||
      !scope.active ||
      (isElementNode(event.target) && disabled(event.target))
    )
      return;
    const viewport = viewportRoot(
      uiElements(document, '[data-jqs="toast-viewport"]').find((element) => !disabled(element)) ??
        null,
    );
    if (!viewport) return;
    event.preventDefault();
    const valid = (): boolean =>
      scope.active &&
      viewport.ownerDocument === document &&
      uiActive(viewport) &&
      !disabled(viewport);
    enhanceViewport(viewport, valid);
    if (valid()) viewport.focus();
  });
  host.listen(window, "blur", () => {
    scope.blurred = true;
    for (const record of documentRecords(activeRecords, document)) pause(record);
  });
  host.listen(window, "focus", () => {
    scope.blurred = false;
    for (const record of documentRecords(activeRecords, document)) {
      if (!record.pointed && !record.focused) {
        resume(record);
      }
    }
  });
  host.listen(document, "visibilitychange", () => {
    for (const record of documentRecords(activeRecords, document)) {
      if (document.hidden) pause(record);
      else if (!record.pointed && !record.focused) resume(record);
    }
  });
}

function registerActions(scope: ToastScope, registerAction: ActionRegistrar): void {
  const allowed = (context: StarContext): boolean =>
    scope.active &&
    !(context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) &&
    !(
      context.event &&
      "isDefaultPrevented" in context.event &&
      context.event.isDefaultPrevented()
    ) &&
    context.root.ownerDocument === scope.document &&
    uiActive(context.root) &&
    !disabled(context.root) &&
    (!context.element ||
      (context.element.ownerDocument === scope.document &&
        uiActive(context.element) &&
        !disabled(context.element)));
  registerAction("ui.toast.show", (context) => {
    const value = context.args?.[0];
    if (typeof value !== "string" && (typeof value !== "object" || value === null))
      throw new Error("ui.toast.show needs a message string or Toast options object.");
    if (!allowed(context)) return context.root;
    return showToast(
      scope,
      value as string | ToastOptions,
      (viewport) => allowed(context) && (!viewport || !disabled(viewport)),
    );
  });
  registerAction("ui.toast.dismiss", (context) => {
    const root = controlledToast(scope, context, context.args?.[0]);
    return requestDismiss(scope, root, () => allowed(context) && !disabled(root));
  });
  registerAction("ui.toast.clear", (context) => {
    if (allowed(context))
      clearToasts(scope, (root) => allowed(context) && (!root || !disabled(root)));
  });
}

export function createToasts(host: DocumentHost, registerAction: ActionRegistrar): ToastCollection {
  const { document, window } = host;
  const scope: ToastScope = {
    active: true,
    blurred: false,
    document,
    window,
    now: () => (window as Window & typeof globalThis).Date.now(),
    revision: 0,
  };
  host.own("service", "ui:toast:lifetime", () => {
    scope.active = false;
  });
  const api: StarToastStatic = {
    show: (options) => showToast(scope, options),
    dismiss: (target) => requestDismiss(scope, target),
    clear: () => clearToasts(scope),
  };
  registerActions(scope, registerAction);
  installGlobalListeners(scope, host);
  return { api, enhance: (root) => enhanceTree(scope, root) };
}

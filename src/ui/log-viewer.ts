import { isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import type {
  LogEntryInput,
  LogFilter,
  LogLevel,
  LogViewerState,
  LogViewerTarget,
  StarContext,
  StarLogViewerStatic,
} from "../types";
import {
  acquireUIResource,
  failUISetup,
  listenUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiElements,
  uiResources,
  type UIResources,
} from "./lifecycle";

interface LogViewerCollection {
  api: StarLogViewerStatic;
  enhance(root: ParentNode): void;
}

interface LogViewerRecord extends UIResources {
  pending: { cancel(): void } | undefined;
  list: HTMLElement;
  filter: HTMLSelectElement | undefined;
  follow: boolean;
  count: number;
  pause: HTMLButtonElement | undefined;
  paused: boolean;
  status: HTMLElement | undefined;
  view: HTMLElement;
}

interface LogViewerEventDetail extends LogViewerState {
  entry?: HTMLElement;
  logViewer: HTMLElement;
}

const records = new WeakMap<HTMLElement, LogViewerRecord>();
const retained = new WeakMap<HTMLElement, Pick<LogViewerRecord, "follow" | "paused" | "count">>();
const intents = new WeakMap<HTMLElement, number>();
const levels: readonly LogLevel[] = ["debug", "info", "warn", "error"];
let logViewerId = 0;
let logEntryId = 0;

function logViewerRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="log-viewer"]') ? value : undefined;
}

function owned(root: HTMLElement, selector: string): HTMLElement | undefined {
  return Array.from(root.querySelectorAll(selector)).find(
    (element): element is HTMLElement =>
      isHTMLElement(element) &&
      element.closest('[data-jqs]:not(button[data-jqs="button"])') === root,
  );
}
function current(record: LogViewerRecord, revision = record.revision): boolean {
  return (
    uiCurrent(record, revision) &&
    records.get(record.root) === record &&
    record.root.dataset.jqs === "log-viewer" &&
    owned(record.root, '[data-part="entries"]') === record.list &&
    owned(record.root, '[data-part="viewport"]') === record.view &&
    owned(record.root, 'select[data-part="filter"]') === record.filter &&
    owned(record.root, 'button[data-part="pause"]') === record.pause &&
    owned(record.root, '[data-part="status"]') === record.status
  );
}
function unavailable(element: Element): boolean {
  return !!element.closest(
    ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]',
  );
}

function resolve(target: LogViewerTarget, root: ParentNode = document): HTMLElement {
  const value =
    typeof target === "string"
      ? logViewerRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : logViewerRoot(target);
  if (value) return value;
  throw new Error(`Log Viewer target did not match data-jqs="log-viewer": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string") return resolve(target, context.root);
  const closest =
    context.element?.closest('[data-jqs="log-viewer"]') ??
    (isHTMLElement(context.root) ? logViewerRoot(context.root) : undefined);
  return resolve(isHTMLElement(closest) ? closest : String(target));
}

function normalizeFilter(value: unknown): LogFilter {
  return value === "all" || levels.includes(value as LogLevel) ? (value as LogFilter) : "all";
}

function normalizeLevel(value: unknown): LogLevel {
  return levels.includes(value as LogLevel) ? (value as LogLevel) : "info";
}

function entries(record: LogViewerRecord): HTMLElement[] {
  return Array.from(record.list.children).filter(
    (child): child is HTMLElement =>
      isHTMLElement(child) &&
      child.dataset.part === "entry" &&
      child.closest("[data-jqs]") === record.root,
  );
}

function viewerState(record: LogViewerRecord): LogViewerState {
  const all = entries(record);
  return {
    count: all.length,
    filter: normalizeFilter(record.root.dataset.level),
    following: record.follow,
    paused: record.paused,
    visible: all.filter((entry) => !entry.hidden).length,
  };
}

function emit(
  record: LogViewerRecord,
  name:
    | "before-append"
    | "append"
    | "before-clear"
    | "clear"
    | "pause"
    | "resume"
    | "filter"
    | "follow",
  options: { cancelable?: boolean; entry?: HTMLElement } = {},
): boolean {
  const detail: LogViewerEventDetail = {
    ...viewerState(record),
    ...(options.entry ? { entry: options.entry } : {}),
    logViewer: record.root,
  };
  return record.root.dispatchEvent(
    new (record.window as Window & typeof globalThis).CustomEvent(
      `jquery-star:log-viewer:${name}`,
      {
        bubbles: true,
        cancelable: options.cancelable ?? false,
        detail,
      },
    ),
  );
}

function setAttribute(element: Element, name: string, value: string, valid: () => boolean): void {
  if (valid() && element.getAttribute(name) !== value && valid()) element.setAttribute(name, value);
}
function setText(element: HTMLElement | undefined, value: string, valid: () => boolean): void {
  if (element && valid() && element.textContent !== value && valid()) element.textContent = value;
}
function maximum(record: LogViewerRecord): number {
  const value = Number(record.root.dataset.max);
  return Number.isInteger(value) && value > 0 ? value : 200;
}
function shouldShow(level: LogLevel, filter: LogFilter): boolean {
  return filter === "all" || levels.indexOf(level) >= levels.indexOf(filter);
}
function scheduleFollow(record: LogViewerRecord): void {
  const revision = record.revision;
  record.pending?.cancel();
  if (!current(record, revision)) return;
  let active = true;
  const pending = { cancel };
  function cancel(): void {
    active = false;
    if (record.pending === pending) record.pending = undefined;
    record.cleanups.delete(cancel);
  }
  const valid = (): boolean => active && record.pending === pending && current(record);
  record.pending = pending;
  acquireUIResource(
    record,
    valid,
    () =>
      record.window.queueMicrotask(() => {
        const accepted = valid() && record.root.isConnected && record.follow && !record.paused;
        cancel();
        if (!accepted) return;
        const revision = record.revision;
        const height = record.view.scrollHeight;
        if (current(record, revision) && record.root.isConnected && record.follow && !record.paused)
          record.view.scrollTop = height;
      }),
    cancel,
  );
}
function sync(record: LogViewerRecord, forceFollow = false): void {
  const revision = record.revision;
  const valid = (): boolean => current(record, revision);
  if (!valid()) return;
  const all = entries(record);
  const overflow = Math.max(0, all.length - maximum(record));
  for (const entry of all.splice(0, overflow)) {
    if (!valid()) return;
    entry.remove();
  }
  const filter = normalizeFilter(record.root.dataset.level);
  let visible = 0;
  for (const entry of all) {
    if (!valid()) return;
    if (!entry.id) {
      let id: string;
      do {
        id = `${record.root.id}-entry-${++logEntryId}`;
      } while (record.document.getElementById(id) || all.some((candidate) => candidate.id === id));
      if (!valid()) return;
      entry.id = id;
    }
    if (!valid()) return;
    const level = normalizeLevel(entry.dataset.level);
    if (entry.dataset.level !== level) entry.dataset.level = level;
    if (!valid()) return;
    const hidden = !shouldShow(level, filter);
    if (entry.hidden !== hidden) entry.hidden = hidden;
    if (!hidden) visible += 1;
  }
  if (!valid()) return;
  if (record.list.hasAttribute("role")) record.list.removeAttribute("role");
  setAttribute(record.view, "role", "log", valid);
  setAttribute(record.view, "aria-live", record.paused ? "off" : "polite", valid);
  setAttribute(record.view, "aria-relevant", "additions text", valid);
  setAttribute(record.view, "aria-atomic", "false", valid);
  if (!valid()) return;
  if (!record.view.hasAttribute("tabindex")) record.view.tabIndex = 0;
  if (!valid()) return;
  const state = record.paused ? "paused" : "live";
  if (record.root.dataset.state !== state) record.root.dataset.state = state;
  if (!valid()) return;
  if (record.root.dataset.following !== String(record.follow))
    record.root.dataset.following = String(record.follow);
  if (!valid()) return;
  if (record.root.dataset.level !== filter) record.root.dataset.level = filter;
  if (!valid()) return;
  if (record.filter && record.filter.value !== filter) record.filter.value = filter;
  if (!valid()) return;
  if (record.pause) {
    if (record.pause.type !== "button") record.pause.type = "button";
    setAttribute(record.pause, "aria-pressed", String(record.paused), valid);
    setText(record.pause, record.paused ? "Resume logs" : "Pause logs", valid);
  }
  setText(
    record.status,
    `${visible} of ${all.length} ${all.length === 1 ? "entry" : "entries"} · ${record.paused ? "Paused" : "Live"}`,
    valid,
  );
  if (!valid()) return;
  const appended = all.length > record.count;
  record.count = all.length;
  if ((forceFollow || appended) && record.follow && !record.paused) scheduleFollow(record);
}
function wire(record: LogViewerRecord): void {
  const { filter, view } = record;
  const listen = listenUI.bind(undefined, record, () => current(record));
  listen(filter, "change", (event) => {
    if (event.defaultPrevented || event.target !== filter || unavailable(filter)) return;
    setFilter(record, normalizeFilter(filter.value));
  });
  listen(view, "scroll", (event) => {
    if (event.defaultPrevented || event.target !== view) return;
    const revision = record.revision;
    const gap = view.scrollHeight - view.scrollTop - view.clientHeight;
    if (!current(record, revision)) return;
    follow(record, gap <= 24);
  });
}
function enhanceLogViewer(root: HTMLElement): LogViewerRecord {
  const previous = records.get(root);
  if (previous && current(previous)) {
    sync(previous);
    return previous;
  }
  const saved = previous ?? retained.get(root);
  const pending = !!previous?.pending;
  previous?.cleanup();
  const reentered = records.get(root);
  if (reentered) return reentered;
  const list = owned(root, '[data-part="entries"]');
  const view = owned(root, '[data-part="viewport"]');
  if (!list || !view)
    throw new Error(`Log Viewer #${root.id} needs data-part="viewport" and data-part="entries".`);
  const filter = owned(root, 'select[data-part="filter"]');
  const pause = owned(root, 'button[data-part="pause"]');
  const record: LogViewerRecord = {
    ...uiResources(root),
    list,
    view,
    filter: isHTMLTag(filter, "select") ? filter : undefined,
    pause: isHTMLTag(pause, "button") ? pause : undefined,
    status: owned(root, '[data-part="status"]'),
    follow: saved?.follow ?? root.dataset.following !== "false",
    paused: saved?.paused ?? root.dataset.paused === "true",
    count: saved?.count ?? 0,
    pending: undefined,
  };
  record.cleanups.add(() =>
    retained.set(root, { follow: record.follow, paused: record.paused, count: record.count }),
  );
  record.cleanup = ownUIRecord(records, root, record, () => releaseUIResources(record));
  try {
    root.id ||= `jqs-log-viewer-${++logViewerId}`;
    if (current(record)) wire(record);
    if (current(record))
      sync(
        record,
        !previous ||
          previous.document !== record.document ||
          previous.list !== list ||
          previous.view !== view ||
          pending,
      );
  } catch (error) {
    failUISetup(record, error);
  }
  return record;
}
function recordFor(target: LogViewerTarget): LogViewerRecord {
  return enhanceLogViewer(resolve(target));
}
function request(target: LogViewerTarget, run: (record: LogViewerRecord) => void): HTMLElement {
  const root = resolve(target);
  const requested = (intents.get(root) ?? 0) + 1;
  intents.set(root, requested);
  const record = enhanceLogViewer(root);
  if (current(record) && intents.get(root) === requested) run(record);
  return root;
}

function timestamp(value: string | Date | undefined): { datetime: string; label: string } {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  const valid = !Number.isNaN(date.valueOf()) ? date : new Date();
  return {
    datetime: valid.toISOString(),
    label: valid.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

function append(record: LogViewerRecord, input: LogEntryInput): void {
  const revision = ++record.revision;
  const valid = (): boolean => current(record, revision);
  const document = record.document;
  const levelValue = normalizeLevel(input.level);
  if (!valid()) return;
  const id = input.id;
  if (!valid()) return;
  const timeValue = timestamp(input.timestamp);
  if (!valid()) return;
  const messageValue = input.message;
  if (!valid()) return;
  const sourceValue = input.source;
  if (!valid()) return;
  const entry = document.createElement("li");
  entry.dataset.part = "entry";
  entry.dataset.level = levelValue;
  if (id) entry.dataset.value = id;
  const time = document.createElement("time");
  time.dataset.part = "timestamp";
  time.dateTime = timeValue.datetime;
  time.textContent = timeValue.label;
  const level = document.createElement("span");
  level.dataset.part = "level";
  level.textContent = levelValue.toLocaleUpperCase();
  const message = document.createElement("span");
  message.dataset.part = "message";
  message.textContent = messageValue;
  entry.append(time, level);
  if (sourceValue) {
    const source = document.createElement("span");
    source.dataset.part = "source";
    source.textContent = sourceValue;
    entry.append(source);
  }
  entry.append(message);
  if (!valid() || !emit(record, "before-append", { cancelable: true, entry }) || !valid()) return;
  record.list.append(entry);
  if (!valid()) return;
  sync(record, true);
  if (valid()) emit(record, "append", { entry });
}
function clear(record: LogViewerRecord): void {
  const revision = ++record.revision;
  const valid = (): boolean => current(record, revision);
  if (!emit(record, "before-clear", { cancelable: true }) || !valid()) return;
  record.pending?.cancel();
  record.list.replaceChildren();
  if (!valid()) return;
  sync(record);
  if (valid()) emit(record, "clear");
}
function pause(record: LogViewerRecord): void {
  const revision = ++record.revision;
  if (record.paused) return;
  record.paused = true;
  record.pending?.cancel();
  sync(record);
  if (current(record, revision)) emit(record, "pause");
}
function resume(record: LogViewerRecord): void {
  const revision = ++record.revision;
  if (!record.paused) return;
  record.paused = false;
  record.follow = true;
  sync(record, true);
  if (current(record, revision)) emit(record, "resume");
}
function setFilter(record: LogViewerRecord, filter: LogFilter): void {
  const revision = ++record.revision;
  const next = normalizeFilter(filter);
  if (record.root.dataset.level === next) return;
  record.root.dataset.level = next;
  if (!current(record, revision)) return;
  sync(record);
  if (current(record, revision)) emit(record, "filter");
}
function follow(record: LogViewerRecord, following = true): void {
  const revision = ++record.revision;
  if (record.follow === following) return;
  record.follow = following;
  if (!following) record.pending?.cancel();
  sync(record, following);
  if (current(record, revision)) emit(record, "follow");
}

function enhanceAll(root: ParentNode): void {
  for (const candidate of uiElements(root, '[data-jqs="log-viewer"]')) {
    const viewer = logViewerRoot(candidate);
    if (viewer) enhanceLogViewer(viewer);
  }
}

export function createLogViewers(registerAction: ActionRegistrar): LogViewerCollection {
  const api: StarLogViewerStatic = {
    append: (target, entry) => request(target, (record) => append(record, entry)),
    clear: (target) => request(target, clear),
    pause: (target) => request(target, pause),
    resume: (target) => request(target, resume),
    toggle: (target) =>
      request(target, (record) => (record.paused ? resume(record) : pause(record))),
    filter: (target, filter) => request(target, (record) => setFilter(record, filter)),
    follow: (target, following) => request(target, (record) => follow(record, following)),
    state: (target) => viewerState(recordFor(target)),
  };
  const action = (
    context: StarContext,
    target: unknown,
    call: (root: HTMLElement) => HTMLElement,
  ): HTMLElement => {
    const root = controlled(context, target);
    return unavailable(root) || (context.element && unavailable(context.element))
      ? root
      : call(root);
  };
  for (const method of ["pause", "resume", "toggle", "clear"] as const)
    registerAction(`ui.log-viewer.${method}`, (context) =>
      action(context, context.args?.[0], (root) => api[method](root)),
    );
  registerAction("ui.log-viewer.filter", (context) => {
    const value =
      context.args?.[0] ??
      (isHTMLTag(context.element, "select") ? context.element.value : undefined);
    return action(context, context.args?.[1], (root) => api.filter(root, normalizeFilter(value)));
  });
  registerAction("ui.log-viewer.follow", (context) =>
    action(context, context.args?.[1], (root) => api.follow(root, context.args?.[0] !== false)),
  );
  return { api, enhance: enhanceAll };
}

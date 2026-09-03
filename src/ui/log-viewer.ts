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

interface LogViewerCollection {
  api: StarLogViewerStatic;
  enhance(root: ParentNode): void;
}

interface LogViewerRecord {
  entries: HTMLElement;
  filterControl: HTMLSelectElement | undefined;
  following: boolean;
  lastCount: number;
  pauseControl: HTMLButtonElement | undefined;
  paused: boolean;
  root: HTMLElement;
  status: HTMLElement | undefined;
  viewport: HTMLElement;
}

interface LogViewerEventDetail extends LogViewerState {
  entry?: HTMLElement;
  logViewer: HTMLElement;
}

const records = new WeakMap<HTMLElement, LogViewerRecord>();
const levels: readonly LogLevel[] = ["debug", "info", "warn", "error"];
let logViewerId = 0;

function logViewerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="log-viewer"]')
    ? value
    : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="log-viewer"]') === root,
  );
}

function resolve(target: LogViewerTarget, root: ParentNode = document): HTMLElement {
  const value =
    typeof target === "string" ? logViewerRoot(root.querySelector(target)) : logViewerRoot(target);
  if (value) return value;
  throw new Error(`Log Viewer target did not match data-jqs="log-viewer": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="log-viewer"]')) return target;
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="log-viewer"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function normalizeFilter(value: unknown): LogFilter {
  return value === "all" || levels.includes(value as LogLevel) ? (value as LogFilter) : "all";
}

function normalizeLevel(value: unknown): LogLevel {
  return levels.includes(value as LogLevel) ? (value as LogLevel) : "info";
}

function entries(record: LogViewerRecord): HTMLElement[] {
  return Array.from(record.entries.children).filter(
    (child): child is HTMLElement =>
      child instanceof HTMLElement &&
      child.dataset.part === "entry" &&
      child.closest('[data-jqs="log-viewer"]') === record.root,
  );
}

function viewerState(record: LogViewerRecord): LogViewerState {
  const all = entries(record);
  return {
    count: all.length,
    filter: normalizeFilter(record.root.dataset.level),
    following: record.following,
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
    new CustomEvent(`jquery-star:log-viewer:${name}`, {
      bubbles: true,
      cancelable: options.cancelable ?? false,
      detail,
    }),
  );
}

function setAttribute(element: Element, name: string, value: string): void {
  if (element.getAttribute(name) !== value) element.setAttribute(name, value);
}

function setText(element: HTMLElement | undefined, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

function maximum(record: LogViewerRecord): number {
  const value = Number(record.root.dataset.max);
  return Number.isInteger(value) && value > 0 ? value : 200;
}

function trim(record: LogViewerRecord): void {
  const all = entries(record);
  const overflow = all.length - maximum(record);
  if (overflow > 0) all.slice(0, overflow).forEach((entry) => entry.remove());
}

function shouldShow(level: LogLevel, filter: LogFilter): boolean {
  return filter === "all" || levels.indexOf(level) >= levels.indexOf(filter);
}

function scrollToLatest(record: LogViewerRecord): void {
  record.viewport.scrollTop = record.viewport.scrollHeight;
}

function sync(record: LogViewerRecord, forceFollow = false): void {
  trim(record);
  const all = entries(record);
  const filter = normalizeFilter(record.root.dataset.level);
  let visible = 0;
  all.forEach((entry, index) => {
    entry.id ||= `${record.root.id}-entry-${index + 1}`;
    const level = normalizeLevel(entry.dataset.level);
    if (entry.dataset.level !== level) entry.dataset.level = level;
    const hidden = !shouldShow(level, filter);
    if (entry.hidden !== hidden) entry.hidden = hidden;
    if (!hidden) visible += 1;
  });

  if (record.entries.hasAttribute("role")) record.entries.removeAttribute("role");
  setAttribute(record.viewport, "role", "log");
  setAttribute(record.viewport, "aria-live", record.paused ? "off" : "polite");
  setAttribute(record.viewport, "aria-relevant", "additions text");
  setAttribute(record.viewport, "aria-atomic", "false");
  if (!record.viewport.hasAttribute("tabindex")) record.viewport.tabIndex = 0;
  if (record.root.dataset.state !== (record.paused ? "paused" : "live")) {
    record.root.dataset.state = record.paused ? "paused" : "live";
  }
  if (record.root.dataset.following !== String(record.following)) {
    record.root.dataset.following = String(record.following);
  }
  if (record.root.dataset.level !== filter) record.root.dataset.level = filter;
  if (record.filterControl && record.filterControl.value !== filter) {
    record.filterControl.value = filter;
  }
  if (record.pauseControl) {
    record.pauseControl.type = "button";
    setAttribute(record.pauseControl, "aria-pressed", String(record.paused));
    setText(record.pauseControl, record.paused ? "Resume logs" : "Pause logs");
  }
  setText(
    record.status,
    `${visible} of ${all.length} ${all.length === 1 ? "entry" : "entries"} · ${record.paused ? "Paused" : "Live"}`,
  );

  const appended = all.length > record.lastCount;
  record.lastCount = all.length;
  if ((forceFollow || appended) && record.following && !record.paused) {
    queueMicrotask(() => {
      if (record.root.isConnected) scrollToLatest(record);
    });
  }
}

function wire(record: LogViewerRecord): void {
  record.filterControl?.addEventListener("change", () => {
    setFilter(record, normalizeFilter(record.filterControl?.value));
  });
  record.viewport.addEventListener("scroll", () => {
    const gap =
      record.viewport.scrollHeight - record.viewport.scrollTop - record.viewport.clientHeight;
    const following = gap <= 24;
    if (record.following === following) return;
    record.following = following;
    sync(record);
    emit(record, "follow");
  });
}

function enhanceLogViewer(root: HTMLElement): LogViewerRecord {
  let record = records.get(root);
  if (record) {
    sync(record);
    return record;
  }
  root.id ||= `jqs-log-viewer-${++logViewerId}`;
  const entriesPart = owned<HTMLElement>(root, '[data-part="entries"]');
  const viewport = owned<HTMLElement>(root, '[data-part="viewport"]');
  if (!entriesPart || !viewport) {
    throw new Error(`Log Viewer #${root.id} needs data-part="viewport" and data-part="entries".`);
  }
  record = {
    entries: entriesPart,
    filterControl: owned<HTMLSelectElement>(root, 'select[data-part="filter"]'),
    following: root.dataset.following !== "false",
    lastCount: 0,
    pauseControl: owned<HTMLButtonElement>(root, 'button[data-part="pause"]'),
    paused: root.dataset.paused === "true",
    root,
    status: owned<HTMLElement>(root, '[data-part="status"]'),
    viewport,
  };
  records.set(root, record);
  wire(record);
  sync(record, true);
  return record;
}

function recordFor(target: LogViewerTarget): LogViewerRecord {
  const root = resolve(target);
  return records.get(root) ?? enhanceLogViewer(root);
}

function timestamp(value: string | Date | undefined): { datetime: string; label: string } {
  const date = value instanceof Date ? value : value ? new Date(value) : new Date();
  const valid = !Number.isNaN(date.valueOf()) ? date : new Date();
  return {
    datetime: valid.toISOString(),
    label: valid.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
  };
}

function append(record: LogViewerRecord, input: LogEntryInput): HTMLElement {
  const entry = document.createElement("li");
  entry.dataset.part = "entry";
  entry.dataset.level = normalizeLevel(input.level);
  if (input.id) entry.dataset.value = input.id;

  const timeValue = timestamp(input.timestamp);
  const time = document.createElement("time");
  time.dataset.part = "timestamp";
  time.dateTime = timeValue.datetime;
  time.textContent = timeValue.label;
  const level = document.createElement("span");
  level.dataset.part = "level";
  level.textContent = entry.dataset.level.toLocaleUpperCase();
  const message = document.createElement("span");
  message.dataset.part = "message";
  message.textContent = input.message;
  entry.append(time, level);
  if (input.source) {
    const source = document.createElement("span");
    source.dataset.part = "source";
    source.textContent = input.source;
    entry.append(source);
  }
  entry.append(message);

  if (!emit(record, "before-append", { cancelable: true, entry })) return record.root;
  record.entries.append(entry);
  sync(record, true);
  emit(record, "append", { entry });
  return record.root;
}

function clear(record: LogViewerRecord): HTMLElement {
  if (!emit(record, "before-clear", { cancelable: true })) return record.root;
  record.entries.replaceChildren();
  sync(record);
  emit(record, "clear");
  return record.root;
}

function pause(record: LogViewerRecord): HTMLElement {
  if (record.paused) return record.root;
  record.paused = true;
  sync(record);
  emit(record, "pause");
  return record.root;
}

function resume(record: LogViewerRecord): HTMLElement {
  if (!record.paused) return record.root;
  record.paused = false;
  record.following = true;
  sync(record, true);
  emit(record, "resume");
  return record.root;
}

function setFilter(record: LogViewerRecord, filter: LogFilter): HTMLElement {
  const next = normalizeFilter(filter);
  if (record.root.dataset.level === next) return record.root;
  record.root.dataset.level = next;
  sync(record);
  emit(record, "filter");
  return record.root;
}

function follow(record: LogViewerRecord, following = true): HTMLElement {
  if (record.following === following) return record.root;
  record.following = following;
  sync(record, following);
  emit(record, "follow");
  return record.root;
}

function enhanceAll(root: ParentNode): void {
  const candidates: Element[] = root instanceof Element ? [root] : [];
  candidates.push(...Array.from(root.querySelectorAll('[data-jqs="log-viewer"]')));
  for (const candidate of candidates) {
    const viewer = logViewerRoot(candidate);
    if (viewer) enhanceLogViewer(viewer);
  }
}

export function createLogViewers(registerAction: ActionRegistrar): LogViewerCollection {
  const api: StarLogViewerStatic = {
    append: (target, entry) => append(recordFor(target), entry),
    clear: (target) => clear(recordFor(target)),
    pause: (target) => pause(recordFor(target)),
    resume: (target) => resume(recordFor(target)),
    toggle: (target) => {
      const record = recordFor(target);
      return record.paused ? resume(record) : pause(record);
    },
    filter: (target, filter) => setFilter(recordFor(target), filter),
    follow: (target, following) => follow(recordFor(target), following),
    state: (target) => viewerState(recordFor(target)),
  };
  registerAction("ui.log-viewer.pause", (context) =>
    api.pause(controlled(context, context.args?.[0])),
  );
  registerAction("ui.log-viewer.resume", (context) =>
    api.resume(controlled(context, context.args?.[0])),
  );
  registerAction("ui.log-viewer.toggle", (context) =>
    api.toggle(controlled(context, context.args?.[0])),
  );
  registerAction("ui.log-viewer.clear", (context) =>
    api.clear(controlled(context, context.args?.[0])),
  );
  registerAction("ui.log-viewer.filter", (context) => {
    const value =
      context.args?.[0] ??
      (context.element instanceof HTMLSelectElement ? context.element.value : undefined);
    return api.filter(controlled(context, context.args?.[1]), normalizeFilter(value));
  });
  registerAction("ui.log-viewer.follow", (context) =>
    api.follow(controlled(context, context.args?.[1]), context.args?.[0] !== false),
  );
  return { api, enhance: enhanceAll };
}

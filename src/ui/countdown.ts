import { isHTMLElement } from "../dom";
import type { ActionRegistrar } from "../registry";
import { ownUI, uiActive, uiElements, uiWindow } from "./lifecycle";
import type {
  CountdownState,
  CountdownTarget,
  CountdownUntil,
  StarContext,
  StarCountdownStatic,
} from "../types";

interface CountdownCollection {
  api: StarCountdownStatic;
  enhance(root: ParentNode): void;
}

interface CountdownRecord {
  ownership: CountdownOwnership | undefined;
  revision: number;
  complete: boolean;
  announced: boolean;
  days: HTMLElement | undefined;
  hours: HTMLElement | undefined;
  duration: number;
  minutes: HTMLElement | undefined;
  paused: boolean;
  remaining: number;
  root: HTMLElement;
  seconds: HTMLElement;
  status: HTMLElement | undefined;
  until: number | undefined;
  value: HTMLElement | undefined;
}

interface CountdownEventDetail extends CountdownState {
  countdown: HTMLElement;
}

const records = new WeakMap<HTMLElement, CountdownRecord>();
interface CountdownInterval {
  active: boolean;
  timer: number | undefined;
}
interface CountdownOwnership {
  active: boolean;
  clock: CountdownClock;
  record: CountdownRecord;
  release: () => void;
}
interface CountdownClock {
  document: Document;
  scheduled: Set<CountdownOwnership>;
  interval: CountdownInterval | undefined;
  window: Window;
}
const clocks = new WeakMap<Document, CountdownClock>();
let countdownId = 0;

function clockFor(root: HTMLElement): CountdownClock {
  const owner = root.ownerDocument;
  let clock = clocks.get(owner);
  if (!clock) {
    clock = { document: owner, scheduled: new Set(), interval: undefined, window: uiWindow(root) };
    clocks.set(owner, clock);
  }
  return clock;
}

function countdownRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="countdown"]') ? value : undefined;
}

function owned<T extends HTMLElement>(root: HTMLElement, selector: string): T | undefined {
  return Array.from(root.querySelectorAll<T>(selector)).find(
    (element) => element.closest('[data-jqs="countdown"]') === root,
  );
}

function resolve(target: CountdownTarget, root: ParentNode = document): HTMLElement {
  const value =
    typeof target === "string" ? countdownRoot(root.querySelector(target)) : countdownRoot(target);
  if (value) return value;
  throw new Error(`Countdown target did not match data-jqs="countdown": ${String(target)}`);
}

function controlled(context: StarContext, target?: unknown): HTMLElement {
  if (isHTMLElement(target)) return resolve(target, context.root);
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="countdown"]');
  return resolve(isHTMLElement(closest) ? closest : String(target));
}

function setText(element: HTMLElement | undefined, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

function state(record: CountdownRecord): CountdownState {
  return {
    complete: record.complete,
    paused: record.paused,
    remaining: Math.max(0, Math.ceil(record.remaining / 1_000)),
    ...(record.until === undefined ? {} : { until: new Date(record.until).toISOString() }),
  };
}

function emit(
  record: CountdownRecord,
  name: "start" | "pause" | "resume" | "reset" | "complete",
): void {
  const detail: CountdownEventDetail = { ...state(record), countdown: record.root };
  record.root.dispatchEvent(
    new (uiWindow(record.root) as Window & typeof globalThis).CustomEvent(
      `jquery-star:countdown:${name}`,
      { bubbles: true, detail },
    ),
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function sync(record: CountdownRecord): void {
  const total = Math.max(0, Math.ceil(record.remaining / 1_000));
  const days = Math.floor(total / 86_400);
  const hours = Math.floor((total % 86_400) / 3_600);
  const minutes = Math.floor((total % 3_600) / 60);
  const seconds = total % 60;
  setText(record.days, String(days));
  setText(record.hours, pad(hours));
  setText(record.minutes, pad(minutes));
  setText(record.seconds, pad(seconds));
  setText(record.value, String(total));
  const nextState = record.complete ? "complete" : record.paused ? "paused" : "running";
  if (record.root.dataset.state !== nextState) record.root.dataset.state = nextState;
  record.root.setAttribute(
    "aria-label",
    record.complete ? "Countdown complete" : `${total} seconds remaining`,
  );
  if (record.complete) setText(record.status, "Countdown complete.");
  else if (record.status?.textContent === "Countdown complete.") setText(record.status, "");
}

function current(record: CountdownRecord, revision = record.revision): boolean {
  const ownership = record.ownership;
  return Boolean(
    ownership?.active &&
    record.revision === revision &&
    ownership.clock.document === record.root.ownerDocument &&
    uiActive(record.root),
  );
}

function intervalCurrent(clock: CountdownClock, interval: CountdownInterval): boolean {
  return interval.active && clock.interval === interval;
}

function running(record: CountdownRecord): boolean {
  return !record.paused && !record.complete;
}

function stopInterval(clock: CountdownClock, interval: CountdownInterval): void {
  if (clock.interval === interval) clock.interval = undefined;
  interval.active = false;
  const timer = interval.timer;
  interval.timer = undefined;
  if (timer !== undefined) clock.window.clearInterval(timer);
}

function stopClockWhenIdle(clock: CountdownClock): void {
  if (clock.scheduled.size === 0 && clock.interval) stopInterval(clock, clock.interval);
}

function update(record: CountdownRecord, now = Date.now()): void {
  if (!current(record)) return;
  const revision = record.revision;
  if (!record.paused && record.until !== undefined && !record.complete) {
    record.remaining = Math.max(0, record.until - now);
    if (record.remaining === 0) {
      record.complete = true;
      const ownership = record.ownership;
      if (ownership) {
        ownership.clock.scheduled.delete(ownership);
        stopClockWhenIdle(ownership.clock);
      }
      if (!current(record, revision)) return;
      if (!record.announced) {
        record.announced = true;
        sync(record);
        if (current(record, revision)) emit(record, "complete");
        return;
      }
    }
  }
  if (current(record, revision)) sync(record);
}

function tick(clock: CountdownClock, interval: CountdownInterval): void {
  if (!intervalCurrent(clock, interval)) return;
  const now = Date.now();
  const scheduled = Array.from(clock.scheduled, (owner) => ({
    owner,
    revision: owner.record.revision,
  }));
  for (const { owner, revision } of scheduled) {
    if (!intervalCurrent(clock, interval)) break;
    const record = owner.record;
    if (!record.root.isConnected || record.root.ownerDocument !== clock.document) {
      owner.release();
      continue;
    }
    if (record.ownership === owner && clock.scheduled.has(owner) && current(record, revision))
      update(record, now);
  }
  stopClockWhenIdle(clock);
}

function acquire(record: CountdownRecord): void {
  if (current(record)) return;
  record.ownership?.release();
  // Cancellation may synchronously acquire the replacement owner.
  if (current(record) || !uiActive(record.root)) return;
  const clock = clockFor(record.root);
  const ownership: CountdownOwnership = { active: true, clock, record, release: () => undefined };
  record.ownership = ownership;
  ownership.release = ownUI(record.root, () => {
    ownership.active = false;
    if (record.ownership === ownership) {
      record.ownership = undefined;
      record.revision += 1;
    }
    clock.scheduled.delete(ownership);
    stopClockWhenIdle(clock);
  });
}

function schedule(record: CountdownRecord): void {
  const owner = record.ownership;
  if (!owner || !current(record)) return;
  const clock = owner.clock;
  if (running(record)) clock.scheduled.add(owner);
  if (clock.scheduled.size === 0 || clock.interval) return;
  const interval: CountdownInterval = { active: true, timer: undefined };
  clock.interval = interval;
  try {
    interval.timer = clock.window.setInterval(() => tick(clock, interval), 1_000);
    if (!intervalCurrent(clock, interval) || clock.scheduled.size === 0)
      stopInterval(clock, interval);
  } catch (error) {
    const failures: unknown[] = [error];
    const participants = clock.interval === interval ? [...clock.scheduled] : [];
    try {
      stopInterval(clock, interval);
    } catch (cleanupError) {
      failures.push(cleanupError);
    }
    for (const participant of participants) {
      try {
        participant.release();
      } catch (cleanupError) {
        failures.push(cleanupError);
      }
    }
    if (failures.length > 1)
      throw new AggregateError(failures, "Countdown scheduling and cleanup failed.", {
        cause: error,
      });
    throw error;
  }
}

function duration(root: HTMLElement): number {
  const seconds = Number(root.dataset.duration);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1_000 : 60_000;
}

function untilTime(value: CountdownUntil): number {
  const result =
    value instanceof Date ? value.valueOf() : typeof value === "number" ? value : Date.parse(value);
  if (!Number.isFinite(result))
    throw new Error(`Countdown until value is invalid: ${String(value)}`);
  return result;
}

function enhanceCountdown(root: HTMLElement): CountdownRecord {
  let record = records.get(root);
  root.id ||= `jqs-countdown-${++countdownId}`;
  const seconds = owned<HTMLElement>(root, '[data-part="seconds"]');
  if (!seconds) throw new Error(`Countdown #${root.id} needs data-part="seconds".`);
  if (!root.hasAttribute("role")) root.setAttribute("role", "timer");
  const parts = {
    days: owned(root, '[data-part="days"]'),
    hours: owned(root, '[data-part="hours"]'),
    minutes: owned(root, '[data-part="minutes"]'),
    seconds,
    status: owned(root, '[data-part="status"]'),
    value: owned(root, '[data-part="value"]'),
  };
  if (parts.status) {
    parts.status.setAttribute("aria-live", "polite");
    parts.status.setAttribute("aria-atomic", "true");
  }
  if (record) {
    const existing = record;
    if (Object.entries(parts).some(([key, part]) => existing[key as keyof typeof parts] !== part))
      record.revision += 1;
    Object.assign(record, parts);
    acquire(record);
    const revision = record.revision;
    update(record);
    if (current(record, revision)) schedule(record);
    return record;
  }
  const initialDuration = duration(root);
  const authoredUntil = root.dataset.until
    ? untilTime(root.dataset.until)
    : Date.now() + initialDuration;
  const paused = root.dataset.paused === "true";
  const remainingMs = Math.max(0, authoredUntil - Date.now());
  record = {
    ...parts,
    ownership: undefined,
    revision: 0,
    complete: remainingMs === 0,
    announced: false,
    duration: initialDuration,
    paused,
    remaining: remainingMs,
    root,
    until: paused ? undefined : authoredUntil,
  };
  records.set(root, record);
  acquire(record);
  if (current(record)) sync(record);
  schedule(record);
  return record;
}

function recordFor(target: CountdownTarget): CountdownRecord {
  const root = resolve(target);
  const record = records.get(root);
  return record && current(record) ? record : enhanceCountdown(root);
}

function begin(
  record: CountdownRecord,
  milliseconds: number,
  until: number,
  event: "start" | "reset",
): HTMLElement {
  if (!Number.isFinite(milliseconds))
    throw new Error("Countdown duration must be a finite number.");
  const revision = ++record.revision;
  if (!current(record, revision)) return record.root;
  record.remaining = milliseconds;
  record.until = until;
  record.paused = false;
  record.complete = false;
  record.announced = false;
  sync(record);
  if (!current(record, revision)) return record.root;
  emit(record, event);
  if (!current(record, revision)) return record.root;
  update(record);
  if (current(record, revision)) schedule(record);
  return record.root;
}

function start(record: CountdownRecord, seconds?: number): HTMLElement {
  const milliseconds = seconds === undefined ? record.duration : Math.max(0, seconds * 1_000);
  return begin(record, milliseconds, Date.now() + milliseconds, "start");
}

function setUntil(record: CountdownRecord, value: CountdownUntil): HTMLElement {
  const next = untilTime(value);
  return begin(record, Math.max(0, next - Date.now()), next, "start");
}

function pause(record: CountdownRecord): HTMLElement {
  if (!current(record) || !running(record)) return record.root;
  const revision = ++record.revision;
  update(record);
  if (!current(record, revision) || record.complete) return record.root;
  record.paused = true;
  record.until = undefined;
  const ownership = record.ownership;
  if (ownership) ownership.clock.scheduled.delete(ownership);
  sync(record);
  if (ownership) stopClockWhenIdle(ownership.clock);
  if (current(record, revision)) emit(record, "pause");
  return record.root;
}

function resume(record: CountdownRecord): HTMLElement {
  if (!current(record) || !record.paused || record.complete) return record.root;
  const revision = ++record.revision;
  record.paused = false;
  record.until = Date.now() + record.remaining;
  sync(record);
  if (!current(record, revision)) return record.root;
  schedule(record);
  if (current(record, revision)) emit(record, "resume");
  return record.root;
}

function reset(record: CountdownRecord): HTMLElement {
  return begin(record, record.duration, Date.now() + record.duration, "reset");
}

function enhanceAll(root: ParentNode): void {
  for (const candidate of uiElements(root, '[data-jqs="countdown"]')) {
    const countdown = countdownRoot(candidate);
    if (countdown) enhanceCountdown(countdown);
  }
}

export function createCountdowns(registerAction: ActionRegistrar): CountdownCollection {
  const api: StarCountdownStatic = {
    start: (target, seconds) => start(recordFor(target), seconds),
    until: (target, value) => setUntil(recordFor(target), value),
    pause: (target) => pause(recordFor(target)),
    resume: (target) => resume(recordFor(target)),
    reset: (target) => reset(recordFor(target)),
    remaining: (target) => {
      const record = recordFor(target);
      update(record);
      return state(record).remaining;
    },
    state: (target) => {
      const record = recordFor(target);
      update(record);
      return state(record);
    },
  };
  registerAction("ui.countdown.start", (context) => {
    const value = context.args?.[0];
    return api.start(
      controlled(context, context.args?.[1]),
      typeof value === "number" ? value : undefined,
    );
  });
  registerAction("ui.countdown.until", (context) => {
    const value = context.args?.[0];
    if (!(typeof value === "string" || typeof value === "number" || value instanceof Date)) {
      throw new Error("Countdown until action needs a date, timestamp, or date string.");
    }
    return api.until(controlled(context, context.args?.[1]), value);
  });
  registerAction("ui.countdown.pause", (context) =>
    api.pause(controlled(context, context.args?.[0])),
  );
  registerAction("ui.countdown.resume", (context) =>
    api.resume(controlled(context, context.args?.[0])),
  );
  registerAction("ui.countdown.reset", (context) =>
    api.reset(controlled(context, context.args?.[0])),
  );
  return { api, enhance: enhanceAll };
}

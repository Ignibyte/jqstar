import type { ActionRegistrar } from "../registry";
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
  complete: boolean;
  completeEmitted: boolean;
  days: HTMLElement | undefined;
  hours: HTMLElement | undefined;
  initialDuration: number;
  minutes: HTMLElement | undefined;
  paused: boolean;
  remainingMs: number;
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
const scheduled = new Set<CountdownRecord>();
let countdownId = 0;
let clock: number | undefined;

function countdownRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="countdown"]')
    ? value
    : undefined;
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
  if (target instanceof HTMLElement && target.matches('[data-jqs="countdown"]')) return target;
  if (typeof target === "string") return resolve(target, context.root);
  const closest = context.element?.closest('[data-jqs="countdown"]');
  return resolve(closest instanceof HTMLElement ? closest : String(target));
}

function setText(element: HTMLElement | undefined, value: string): void {
  if (element && element.textContent !== value) element.textContent = value;
}

function state(record: CountdownRecord): CountdownState {
  return {
    complete: record.complete,
    paused: record.paused,
    remaining: Math.max(0, Math.ceil(record.remainingMs / 1_000)),
    ...(record.until === undefined ? {} : { until: new Date(record.until).toISOString() }),
  };
}

function emit(
  record: CountdownRecord,
  name: "start" | "pause" | "resume" | "reset" | "complete",
): void {
  const detail: CountdownEventDetail = { ...state(record), countdown: record.root };
  record.root.dispatchEvent(
    new CustomEvent(`jquery-star:countdown:${name}`, { bubbles: true, detail }),
  );
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function sync(record: CountdownRecord): void {
  const total = Math.max(0, Math.ceil(record.remainingMs / 1_000));
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

function update(record: CountdownRecord, now = Date.now()): void {
  if (!record.paused && record.until !== undefined && !record.complete) {
    record.remainingMs = Math.max(0, record.until - now);
    if (record.remainingMs === 0) {
      record.complete = true;
      scheduled.delete(record);
      if (!record.completeEmitted) {
        record.completeEmitted = true;
        sync(record);
        emit(record, "complete");
        return;
      }
    }
  }
  sync(record);
}

function stopClockWhenIdle(): void {
  if (scheduled.size > 0 || clock === undefined) return;
  window.clearInterval(clock);
  clock = undefined;
}

function tick(): void {
  const now = Date.now();
  for (const record of scheduled) {
    if (!record.root.isConnected) {
      scheduled.delete(record);
      continue;
    }
    update(record, now);
  }
  stopClockWhenIdle();
}

function schedule(record: CountdownRecord): void {
  if (!record.paused && !record.complete) scheduled.add(record);
  if (scheduled.size > 0 && clock === undefined) clock = window.setInterval(tick, 1_000);
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
  if (record) {
    update(record);
    return record;
  }
  root.id ||= `jqs-countdown-${++countdownId}`;
  const seconds = owned<HTMLElement>(root, '[data-part="seconds"]');
  if (!seconds) throw new Error(`Countdown #${root.id} needs data-part="seconds".`);
  if (!root.hasAttribute("role")) root.setAttribute("role", "timer");
  const initialDuration = duration(root);
  const authoredUntil = root.dataset.until
    ? untilTime(root.dataset.until)
    : Date.now() + initialDuration;
  const paused = root.dataset.paused === "true";
  const remainingMs = Math.max(0, authoredUntil - Date.now());
  record = {
    complete: remainingMs === 0,
    completeEmitted: false,
    days: owned(root, '[data-part="days"]'),
    hours: owned(root, '[data-part="hours"]'),
    initialDuration,
    minutes: owned(root, '[data-part="minutes"]'),
    paused,
    remainingMs,
    root,
    seconds,
    status: owned(root, '[data-part="status"]'),
    until: paused ? undefined : authoredUntil,
    value: owned(root, '[data-part="value"]'),
  };
  if (record.status) {
    record.status.setAttribute("aria-live", "polite");
    record.status.setAttribute("aria-atomic", "true");
  }
  records.set(root, record);
  sync(record);
  schedule(record);
  return record;
}

function recordFor(target: CountdownTarget): CountdownRecord {
  const root = resolve(target);
  return records.get(root) ?? enhanceCountdown(root);
}

function begin(
  record: CountdownRecord,
  milliseconds: number,
  until: number,
  event: "start" | "reset",
): HTMLElement {
  if (!Number.isFinite(milliseconds))
    throw new Error("Countdown duration must be a finite number.");
  record.remainingMs = milliseconds;
  record.until = until;
  record.paused = false;
  record.complete = false;
  record.completeEmitted = false;
  sync(record);
  emit(record, event);
  update(record);
  schedule(record);
  return record.root;
}

function start(record: CountdownRecord, seconds?: number): HTMLElement {
  const milliseconds =
    seconds === undefined ? record.initialDuration : Math.max(0, seconds * 1_000);
  return begin(record, milliseconds, Date.now() + milliseconds, "start");
}

function setUntil(record: CountdownRecord, value: CountdownUntil): HTMLElement {
  const next = untilTime(value);
  return begin(record, Math.max(0, next - Date.now()), next, "start");
}

function pause(record: CountdownRecord): HTMLElement {
  if (record.paused || record.complete) return record.root;
  update(record);
  record.paused = true;
  record.until = undefined;
  scheduled.delete(record);
  sync(record);
  stopClockWhenIdle();
  emit(record, "pause");
  return record.root;
}

function resume(record: CountdownRecord): HTMLElement {
  if (!record.paused || record.complete) return record.root;
  record.paused = false;
  record.until = Date.now() + record.remainingMs;
  sync(record);
  schedule(record);
  emit(record, "resume");
  return record.root;
}

function reset(record: CountdownRecord): HTMLElement {
  return begin(record, record.initialDuration, Date.now() + record.initialDuration, "reset");
}

function enhanceAll(root: ParentNode): void {
  const candidates: Element[] = root instanceof Element ? [root] : [];
  candidates.push(...Array.from(root.querySelectorAll('[data-jqs="countdown"]')));
  for (const candidate of candidates) {
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

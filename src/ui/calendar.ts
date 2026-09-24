import { isElementNode, isHTMLElement, isHTMLTag } from "../dom";
import type { ActionRegistrar } from "../registry";
import {
  failUISetup as rollback,
  listenUI,
  ownUIRecord,
  releaseUIResources as retire,
  uiActive,
  uiCurrent as current,
  uiElements,
  uiResources as lifetime,
  uiWindow,
  type UIResources,
} from "./lifecycle";
import type {
  CalendarTarget,
  DateRangePickerTarget,
  DatePickerTarget,
  RangeCalendarTarget,
  RangeCalendarValue,
  StarCalendarStatic,
  StarContext,
  StarDateRangePickerStatic,
  StarDatePickerStatic,
  StarPopoverStatic,
  StarRangeCalendarStatic,
} from "../types";

interface CalendarPopovers {
  api: StarPopoverStatic;
  enhance(root: ParentNode): void;
}

interface CalendarRecord extends UIResources {
  grid: HTMLElement;
  header: HTMLElement;
  heading: HTMLElement;
  status: HTMLElement | undefined;
  previous: HTMLElement | undefined;
  next: HTMLElement | undefined;
  rendering: object | undefined;
  signature: string | undefined;
  content: ChildNode | null;

  end: string | undefined;
  focusDate: string | undefined;
  range: boolean;
  start: string | undefined;
  value: string | undefined;
  view: Date;
}

interface DatePickerRecord extends UIResources {
  calendar: HTMLElement;
  popover: HTMLElement;
  controls: [HTMLInputElement, ...HTMLInputElement[]];
  forms: (HTMLFormElement | null)[];
  focusRevision: number;
  trigger: HTMLElement | undefined;
  content: HTMLElement | undefined;
  label: HTMLElement | undefined;
  range: boolean;
  syncing: object | undefined;
  enhancing: object | undefined;
}

interface CalendarEventDetail {
  calendar: HTMLElement;
  date: string;
  previousValue?: string | undefined;
  value?: string | undefined;
}

interface RangeCalendarEventDetail {
  calendar: HTMLElement;
  complete: boolean;
  end?: string | undefined;
  previousEnd?: string | undefined;
  previousStart?: string | undefined;
  start?: string | undefined;
}

interface CalendarCollection {
  calendar: StarCalendarStatic;
  dateRangePicker: StarDateRangePickerStatic;
  datePicker: StarDatePickerStatic;
  enhance(root: ParentNode): void;
  rangeCalendar: StarRangeCalendarStatic;
}

const initializedPickers = new WeakSet<HTMLElement>();
const calendarFocus = new WeakMap<HTMLElement, string | undefined>();
const calendarOutput = new WeakMap<
  HTMLElement,
  { grid: HTMLElement; content: ChildNode | null; signature: string | undefined }
>();
const calendarRecords = new WeakMap<HTMLElement, CalendarRecord>();
const pickerRecords = new WeakMap<HTMLElement, DatePickerRecord>();
const rangePickerRecords = new WeakMap<HTMLElement, DatePickerRecord>();
const intents = new WeakMap<HTMLElement, number>();
const calendarEvents = new WeakMap<Event, () => boolean>();
let calendarId = 0;
let pickerId = 0;
let rangePickerId = 0;

function listen(
  record: UIResources,
  target: HTMLElement,
  name: string,
  callback: EventListener,
  capture?: boolean,
): void {
  listenUI(record, () => current(record), target, name, callback, capture);
}

function calendarParts(root: HTMLElement) {
  const grid = directPart(root, "grid");
  const header = directPart(root, "header");
  const heading = header && directPart(header, "heading");
  if (!grid) throw new Error(`Calendar #${root.id} needs a direct data-part="grid" child.`);
  if (!header || !heading)
    throw new Error(`Calendar #${root.id} needs a direct data-part="heading" child.`);
  return {
    grid,
    header,
    heading,
    status: directPart(root, "status"),
    previous: directPart(header, "previous"),
    next: directPart(header, "next"),
  };
}

function calendarCurrent(record: CalendarRecord, revision = record.revision): boolean {
  return (
    current(record, revision) &&
    calendarRecords.get(record.root) === record &&
    record.root.dataset.jqs === (record.range ? "range-calendar" : "calendar") &&
    directPart(record.root, "grid") === record.grid &&
    directPart(record.root, "header") === record.header &&
    directPart(record.header, "heading") === record.heading &&
    directPart(record.root, "status") === record.status &&
    directPart(record.header, "previous") === record.previous &&
    directPart(record.header, "next") === record.next
  );
}

function pickerCurrent(record: DatePickerRecord, revision = record.revision): boolean {
  const { root, popover, calendar, controls, range } = record;
  return (
    current(record, revision) &&
    (range ? rangePickerRecords : pickerRecords).get(root) === record &&
    root.dataset.jqs === (range ? "date-range-picker" : "date-picker") &&
    uiActive(calendar) &&
    uiActive(popover) &&
    directPart(root, "popover") === popover &&
    popover.dataset.jqs === "popover" &&
    pickerCalendar(popover, range) === calendar &&
    directPart(popover, "trigger") === record.trigger &&
    directPart(popover, "content") === record.content &&
    pickerLabel(popover) === record.label &&
    controls.every(
      (control, index) =>
        directPart(root, range ? (index === 0 ? "start-control" : "end-control") : "control") ===
          control && control.form === record.forms[index],
    )
  );
}

function pickerCalendar(popover: HTMLElement, range: boolean): HTMLElement | undefined {
  return Array.from(
    popover.querySelectorAll<HTMLElement>(`[data-jqs="${range ? "range-calendar" : "calendar"}"]`),
  ).find((element) => element.parentElement?.closest("[data-jqs]") === popover);
}
function pickerLabel(popover: HTMLElement): HTMLElement | undefined {
  const trigger = directPart(popover, "trigger");
  return Array.from(trigger?.querySelectorAll<HTMLElement>('[data-part="value"]') ?? []).find(
    (element) => element.closest('[data-jqs]:not(button[data-jqs="button"])') === popover,
  );
}

const ISO_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const monthFormatter = new Intl.DateTimeFormat(undefined, {
  month: "long",
  timeZone: "UTC",
  year: "numeric",
});
const dayFormatter = new Intl.DateTimeFormat(undefined, {
  day: "numeric",
  month: "long",
  timeZone: "UTC",
  weekday: "long",
  year: "numeric",
});
const weekdayFormatter = new Intl.DateTimeFormat(undefined, {
  timeZone: "UTC",
  weekday: "short",
});

function today(): Date {
  const current = new Date();
  return utcDate(current.getFullYear(), current.getMonth(), current.getDate());
}

function utcDate(year: number, month: number, day: number): Date {
  const date = new Date(0);
  date.setUTCFullYear(year, month, day);
  return date;
}

function dateValue(value: unknown): value is Date {
  try {
    return Number.isFinite(Date.prototype.getTime.call(value));
  } catch {
    return false;
  }
}

function parseDate(value: string | Date, label = "date"): Date {
  if (typeof value !== "string" && dateValue(value)) {
    const date = new Date(Date.prototype.getTime.call(value));
    return utcDate(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  }
  if (typeof value !== "string") throw new Error(`Calendar ${label} must be an ISO date.`);
  const match = ISO_DATE.exec(value.trim());
  if (!match) throw new Error(`Calendar ${label} must use YYYY-MM-DD: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = utcDate(year, month, day);
  if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month || date.getUTCDate() !== day) {
    throw new Error(`Calendar ${label} is not a real date: ${value}`);
  }
  return date;
}

function dateIso(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function monthIso(date: Date): string {
  return date.toISOString().slice(0, 7);
}

function startOfMonth(date: Date): Date {
  return utcDate(date.getUTCFullYear(), date.getUTCMonth(), 1);
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function addMonths(date: Date, amount: number): Date {
  const day = date.getUTCDate();
  const result = utcDate(date.getUTCFullYear(), date.getUTCMonth() + amount, 1);
  const lastDay = utcDate(result.getUTCFullYear(), result.getUTCMonth() + 1, 0).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => isHTMLElement(child) && child.dataset.part === part,
  );
}

function calendarRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="calendar"]') ? value : undefined;
}

function rangeCalendarRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="range-calendar"]') ? value : undefined;
}

function pickerRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="date-picker"]') ? value : undefined;
}

function rangePickerRoot(value: Element | null): HTMLElement | undefined {
  return isHTMLElement(value) && value.matches('[data-jqs="date-range-picker"]')
    ? value
    : undefined;
}

function resolveCalendar(target: CalendarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? calendarRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : calendarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Calendar target did not match data-jqs="calendar": ${String(target)}`);
}

function resolveRangeCalendar(
  target: RangeCalendarTarget,
  root: ParentNode = document,
): HTMLElement {
  const resolved =
    typeof target === "string"
      ? rangeCalendarRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : rangeCalendarRoot(target);
  if (resolved) return resolved;
  throw new Error(
    `Range Calendar target did not match data-jqs="range-calendar": ${String(target)}`,
  );
}

function resolvePicker(target: DatePickerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string"
      ? pickerRoot(isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target))
      : pickerRoot(target);
  if (resolved) return resolved;
  throw new Error(`Date Picker target did not match data-jqs="date-picker": ${String(target)}`);
}

function resolveRangePicker(
  target: DateRangePickerTarget,
  root: ParentNode = document,
): HTMLElement {
  const resolved =
    typeof target === "string"
      ? rangePickerRoot(
          isHTMLElement(root) && root.matches(target) ? root : root.querySelector(target),
        )
      : rangePickerRoot(target);
  if (resolved) return resolved;
  throw new Error(
    `Date Range Picker target did not match data-jqs="date-range-picker": ${String(target)}`,
  );
}

function dateLimit(root: HTMLElement, name: "min" | "max"): Date | undefined {
  const value = root.dataset[name]?.trim();
  return value ? parseDate(value, `data-${name}`) : undefined;
}

function disabledDates(root: HTMLElement): Set<string> {
  return new Set((root.dataset.disabledDates ?? "").split(/\s+/).filter(Boolean));
}

function isDisabled(root: HTMLElement, date: Date): boolean {
  const iso = dateIso(date);
  const min = dateLimit(root, "min");
  const max = dateLimit(root, "max");
  return (
    (min !== undefined && date < min) ||
    (max !== undefined && date > max) ||
    disabledDates(root).has(iso) ||
    (root.hasAttribute("data-disable-weekends") && [0, 6].includes(date.getUTCDay()))
  );
}

function calendarEvent(
  root: HTMLElement,
  name: string,
  detail: CalendarEventDetail | RangeCalendarEventDetail,
  cancelable: boolean,
): boolean {
  const record = calendarRecords.get(root);
  if (!record || !calendarCurrent(record)) return false;
  const revision = record.revision;
  const source = sourceState(root);
  const event = new (record.window as Window & typeof globalThis).CustomEvent(name, {
    bubbles: true,
    cancelable,
    detail,
  });
  calendarEvents.set(event, () => calendarCurrent(record, revision) && sameSource(root, source));
  return root.dispatchEvent(event);
}
function emit(
  root: HTMLElement,
  name: "before-change" | "change" | "view-change",
  detail: CalendarEventDetail,
  cancelable = false,
): boolean {
  return calendarEvent(root, `jquery-star:calendar:${name}`, detail, cancelable);
}
function emitRange(
  root: HTMLElement,
  name: "before-change" | "change" | "invalid-range" | "view-change",
  detail: RangeCalendarEventDetail,
  cancelable = false,
): boolean {
  return calendarEvent(root, `jquery-star:range-calendar:${name}`, detail, cancelable);
}

function rangeValue(record: CalendarRecord): RangeCalendarValue {
  return {
    ...(record.start ? { start: record.start } : {}),
    ...(record.end ? { end: record.end } : {}),
  };
}

function orderedRange(start: Date, end: Date): [Date, Date] {
  return start <= end ? [start, end] : [end, start];
}

function inRange(value: string, start: string | undefined, end: string | undefined): boolean {
  return start !== undefined && end !== undefined && value >= start && value <= end;
}

function rangeHasDisabled(root: HTMLElement, start: Date, end: Date): boolean {
  const [first, last] = orderedRange(start, end);
  for (let current = first; current <= last; current = addDays(current, 1)) {
    if (isDisabled(root, current)) return true;
  }
  return false;
}

function rangeStatus(
  record: CalendarRecord,
  message: string,
  valid: () => boolean = () => calendarCurrent(record),
): boolean {
  const revision = record.revision;
  const active = (): boolean => calendarCurrent(record, revision) && valid();
  const status = record.status;
  if (!status) return active();
  const source = sourceState(record.root);
  if (!active()) return false;
  status.setAttribute("aria-live", "polite");
  if (!active() || !sameSource(record.root, source)) return false;
  if (status.textContent !== message) status.textContent = message;
  return active() && sameSource(record.root, source);
}

function weekStart(root: HTMLElement): number {
  return root.dataset.weekStart === "1" ? 1 : 0;
}

function firstGridDate(root: HTMLElement, view: Date): Date {
  const offset = (view.getUTCDay() - weekStart(root) + 7) % 7;
  return addDays(view, -offset);
}

function renderSignature(root: HTMLElement, record: CalendarRecord): string {
  return [
    monthIso(record.view),
    record.range ? "range" : "single",
    record.value ?? "",
    record.start ?? "",
    record.end ?? "",
    record.focusDate ?? "",
    root.dataset.min ?? "",
    root.dataset.max ?? "",
    root.dataset.disabledDates ?? "",
    root.dataset.weekStart ?? "0",
    root.hasAttribute("data-disable-weekends") ? "weekends" : "",
    dateIso(today()),
  ].join("|");
}

function dayButton(root: HTMLElement, date: Date, record: CalendarRecord): HTMLButtonElement {
  const value = dateIso(date);
  const button = root.ownerDocument.createElement("button");
  button.type = "button";
  button.dataset.part = "day";
  button.dataset.value = value;
  button.dataset.month = monthIso(date) === monthIso(record.view) ? "current" : "adjacent";
  button.textContent = String(date.getUTCDate());
  let label = dayFormatter.format(date);
  if (record.range) {
    if (record.start === value && record.end === value) {
      button.dataset.state = "range-start-end";
      label += ", selected range";
    } else if (record.start === value) {
      button.dataset.state = "range-start";
      label += record.end ? ", start of selected range" : ", start date, choose an end date";
    } else if (record.end === value) {
      button.dataset.state = "range-end";
      label += ", end of selected range";
    } else if (inRange(value, record.start, record.end)) {
      button.dataset.state = "in-range";
      label += ", in selected range";
    } else {
      button.dataset.state = "unselected";
    }
  } else {
    button.dataset.state = record.value === value ? "selected" : "unselected";
  }
  button.setAttribute("aria-label", label);
  if (value === dateIso(today())) button.setAttribute("aria-current", "date");
  button.disabled = isDisabled(root, date);
  button.tabIndex = -1;
  return button;
}

function renderCalendar(
  root: HTMLElement,
  record: CalendarRecord,
  allowed: () => boolean = () => true,
): void {
  if (!calendarCurrent(record) || record.rendering) return;
  const revision = record.revision;
  const { grid, heading } = record;
  const token = {};
  record.rendering = token;
  const signature = renderSignature(root, record);
  const attributes = {
    value: root.dataset.value,
    start: root.dataset.start,
    end: root.dataset.end,
    month: root.dataset.month,
  };
  const valid = (): boolean =>
    calendarCurrent(record, revision) &&
    allowed() &&
    record.rendering === token &&
    renderSignature(root, record) === signature &&
    Object.entries(attributes).every(([name, value]) => root.dataset[name] === value);
  const write = (operation: () => void): boolean => {
    if (!valid()) return false;
    operation();
    return valid();
  };
  let complete = false;
  try {
    if (!valid()) return;
    attributes.month = monthIso(record.view);
    if (root.dataset.month !== attributes.month) root.dataset.month = attributes.month;
    if (!valid()) return;
    const title = monthFormatter.format(record.view);
    if (
      heading.textContent !== title &&
      !write(() => {
        heading.textContent = title;
      })
    )
      return;
    if (
      !write(() => {
        heading.setAttribute("aria-live", "polite");
      })
    )
      return;
    if (
      !write(() => {
        grid.setAttribute("role", "grid");
      })
    )
      return;
    if (
      !write(() => {
        grid.setAttribute("aria-label", title);
      })
    )
      return;
    const min = dateLimit(root, "min");
    const max = dateLimit(root, "max");
    for (const [button, disabled] of [
      [record.previous, min !== undefined && record.view <= startOfMonth(min)],
      [record.next, max !== undefined && record.view >= startOfMonth(max)],
    ] as const) {
      if (!isHTMLTag(button, "button")) continue;
      if (
        !write(() => {
          button.type = "button";
        })
      )
        return;
      if (
        button.disabled !== disabled &&
        !write(() => {
          button.disabled = disabled;
        })
      )
        return;
    }
    if (
      record.signature === signature &&
      record.content === grid.firstChild &&
      grid.childElementCount === 7
    ) {
      complete = true;
      return;
    }

    const fragment = root.ownerDocument.createDocumentFragment();
    const header = root.ownerDocument.createElement("div");
    header.dataset.part = "weekdays";
    header.setAttribute("role", "row");
    const base = new Date(Date.UTC(2026, 7, 2 + weekStart(root)));
    for (const index of [0, 1, 2, 3, 4, 5, 6]) {
      const weekday = root.ownerDocument.createElement("span");
      weekday.setAttribute("role", "columnheader");
      weekday.setAttribute("aria-label", dayFormatter.format(addDays(base, index)).split(",")[0]!);
      weekday.textContent = weekdayFormatter.format(addDays(base, index)).slice(0, 2);
      header.append(weekday);
    }
    fragment.append(header);

    const first = firstGridDate(root, record.view);
    const buttons: HTMLButtonElement[] = [];
    for (const rowIndex of [0, 1, 2, 3, 4, 5]) {
      const row = root.ownerDocument.createElement("div");
      row.dataset.part = "week";
      row.setAttribute("role", "row");
      for (const column of [0, 1, 2, 3, 4, 5, 6]) {
        const date = addDays(first, rowIndex * 7 + column);
        const cell = root.ownerDocument.createElement("span");
        cell.setAttribute("role", "gridcell");
        const value = dateIso(date);
        const selected = record.range
          ? record.start === value || inRange(value, record.start, record.end)
          : record.value === value;
        cell.setAttribute("aria-selected", String(selected));
        const button = dayButton(root, date, record);
        buttons.push(button);
        cell.append(button);
        row.append(cell);
      }
      fragment.append(row);
    }

    const preferred =
      buttons.find((button) => button.dataset.value === record.focusDate && !button.disabled) ??
      buttons.find((button) => button.dataset.value === record.value && !button.disabled) ??
      buttons.find(
        (button) => button.getAttribute("aria-current") === "date" && !button.disabled,
      ) ??
      buttons.find((button) => button.dataset.month === "current" && !button.disabled) ??
      buttons.find((button) => !button.disabled);
    if (preferred) preferred.tabIndex = 0;
    if (
      !write(() => {
        grid.replaceChildren(fragment);
      })
    )
      return;
    record.focusDate = preferred?.dataset.value ?? record.focusDate;
    record.content = grid.firstChild;
    const completedSignature = renderSignature(root, record);
    grid.dataset.rendered = completedSignature;
    if (
      !calendarCurrent(record, revision) ||
      record.rendering !== token ||
      renderSignature(root, record) !== completedSignature ||
      !allowed() ||
      Object.entries(attributes).some(([name, value]) => root.dataset[name] !== value)
    )
      return;
    record.signature = completedSignature;
    complete = true;
  } finally {
    if (record.rendering === token) record.rendering = undefined;
    if (!complete && record.revision === revision) record.signature = undefined;
  }
}

function beginRequest(root: HTMLElement): number {
  const intent = (intents.get(root) ?? 0) + 1;
  intents.set(root, intent);
  return intent;
}

const sourceNames = [
  "value",
  "start",
  "end",
  "month",
  "min",
  "max",
  "disabledDates",
  "weekStart",
  "disableWeekends",
] as const;
function sourceState(root: HTMLElement): (string | undefined)[] {
  return sourceNames.map((name) => root.dataset[name]);
}
function sameSource(root: HTMLElement, values: (string | undefined)[]): boolean {
  return sourceNames.every((name, index) => root.dataset[name] === values[index]);
}
function calendarRequest(root: HTMLElement) {
  const intent = beginRequest(root);
  const record = enhanceCalendar(root);
  if (intents.get(root) === intent) {
    record.revision += 1;
    record.rendering = undefined;
  }
  const revision = record.revision;
  return {
    record,
    valid: (): boolean => calendarCurrent(record, revision) && intents.get(root) === intent,
  };
}
function reflectCalendar(
  record: CalendarRecord,
  values: Partial<Record<"value" | "start" | "end" | "month", string | undefined>>,
  valid: () => boolean,
): boolean {
  const source = sourceState(record.root);
  for (const name of ["value", "start", "end", "month"] as const) {
    if (!(name in values)) continue;
    if (!valid() || !sameSource(record.root, source)) return false;
    source[sourceNames.indexOf(name)] = values[name];
    if (values[name] === undefined) record.root.removeAttribute(`data-${name}`);
    else if (record.root.dataset[name] !== values[name]) record.root.dataset[name] = values[name];
  }
  return valid() && sameSource(record.root, source);
}
function rendered(record: CalendarRecord): boolean {
  return (
    calendarCurrent(record) &&
    record.signature === renderSignature(record.root, record) &&
    record.content === record.grid.firstChild
  );
}

function requestView(
  root: HTMLElement,
  requested: string | Date | number,
  focus = false,
): HTMLElement {
  if (!uiActive(root)) return root;
  const { record, valid } = calendarRequest(root);
  if (!valid()) return root;
  const date =
    typeof requested === "number" ? addMonths(record.view, requested) : parseDate(requested);
  const previous = monthIso(record.view);
  record.view = startOfMonth(date);
  if (!reflectCalendar(record, { month: monthIso(record.view) }, valid)) return root;
  renderCalendar(root, record);
  if (!valid() || !rendered(record)) return root;
  if (previous !== monthIso(record.view)) {
    if (record.range) {
      emitRange(root, "view-change", {
        calendar: root,
        complete: record.end !== undefined,
        ...rangeValue(record),
      });
    } else {
      emit(root, "view-change", { calendar: root, date: monthIso(record.view) });
    }
  }
  if (focus && valid()) {
    const button = root.querySelector<HTMLButtonElement>(
      `[data-part="day"][data-value="${dateIso(date)}"]`,
    );
    button?.focus();
  }
  return root;
}

function requestSelection(
  root: HTMLElement,
  requested: string | Date,
  allowed: () => boolean = () => true,
): HTMLElement {
  if (!uiActive(root)) return root;
  const request = calendarRequest(root);
  const { record } = request;
  const valid = (): boolean => request.valid() && allowed();
  if (!valid()) return root;
  const date = parseDate(requested);
  if (isDisabled(root, date) || !allowed()) return root;
  const value = dateIso(date);
  if (record.value === value) return root;
  const activeDay =
    isHTMLTag(root.ownerDocument.activeElement, "button") &&
    root.contains(root.ownerDocument.activeElement) &&
    root.ownerDocument.activeElement.getAttribute("data-part") === "day";
  const detail: CalendarEventDetail = {
    calendar: root,
    date: value,
    previousValue: record.value,
    value,
  };
  const source = sourceState(root);
  if (
    !emit(root, "before-change", { ...detail }, true) ||
    !valid() ||
    !sameSource(root, source) ||
    isDisabled(root, date) ||
    !allowed()
  )
    return root;
  record.value = value;
  record.focusDate = value;
  record.view = startOfMonth(date);
  if (!reflectCalendar(record, { value }, valid)) return root;
  renderCalendar(root, record, valid);
  if (!valid() || !rendered(record)) return root;
  if (activeDay) {
    root.querySelector<HTMLButtonElement>(`[data-part="day"][data-value="${value}"]`)?.focus();
  }
  if (valid()) emit(root, "change", detail);
  return root;
}

function requestRangeSelection(
  root: HTMLElement,
  requested: string | Date,
  requestedEnd?: string | Date,
  allowed: () => boolean = () => true,
): HTMLElement {
  if (!uiActive(root)) return root;
  const request = calendarRequest(root);
  const { record } = request;
  const valid = (): boolean => request.valid() && allowed();
  if (!valid()) return root;
  const date = parseDate(requested);
  const endDate = requestedEnd === undefined ? undefined : parseDate(requestedEnd);
  if (
    !record.range ||
    !allowed() ||
    isDisabled(root, date) ||
    (endDate && isDisabled(root, endDate))
  )
    return root;

  const previousStart = record.start;
  const previousEnd = record.end;
  let nextStart: Date;
  let nextEnd: Date | undefined;
  if (endDate) {
    [nextStart, nextEnd] = orderedRange(date, endDate);
  } else if (!record.start || record.end) {
    nextStart = date;
  } else {
    [nextStart, nextEnd] = orderedRange(parseDate(record.start), date);
  }

  if (nextEnd && rangeHasDisabled(root, nextStart, nextEnd)) {
    const detail = {
      calendar: root,
      complete: record.end !== undefined,
      previousEnd,
      previousStart,
      ...rangeValue(record),
    };
    if (
      rangeStatus(
        record,
        "That range includes an unavailable date. Choose another end date.",
        valid,
      )
    )
      emitRange(root, "invalid-range", detail);
    return root;
  }

  const start = dateIso(nextStart);
  const end = nextEnd ? dateIso(nextEnd) : undefined;
  const detail: RangeCalendarEventDetail = {
    calendar: root,
    complete: end !== undefined,
    end,
    previousEnd,
    previousStart,
    start,
  };
  const source = sourceState(root);
  if (
    !emitRange(root, "before-change", { ...detail }, true) ||
    !valid() ||
    !sameSource(root, source)
  )
    return root;

  if (
    !allowed() ||
    isDisabled(root, nextStart) ||
    (nextEnd && rangeHasDisabled(root, nextStart, nextEnd))
  )
    return root;

  const activeDay =
    isHTMLTag(root.ownerDocument.activeElement, "button") &&
    root.contains(root.ownerDocument.activeElement) &&
    root.ownerDocument.activeElement.getAttribute("data-part") === "day";
  record.start = start;
  record.end = end;
  record.focusDate = dateIso(endDate ?? date);
  record.view = startOfMonth(endDate ?? date);
  if (!reflectCalendar(record, { start, end }, valid)) return root;
  renderCalendar(root, record, valid);
  if (!valid() || !rendered(record)) return root;
  if (activeDay) {
    root
      .querySelector<HTMLButtonElement>(`[data-part="day"][data-value="${record.focusDate}"]`)
      ?.focus();
  }
  if (!valid()) return root;
  rangeStatus(
    record,
    end
      ? `Range selected, ${dayFormatter.format(nextStart)} through ${dayFormatter.format(nextEnd)}.`
      : `${dayFormatter.format(nextStart)} selected as the start date. Choose an end date.`,
    valid,
  );
  if (valid()) emitRange(root, "change", detail);
  return root;
}

function clearRange(root: HTMLElement, allowed: () => boolean = () => true): HTMLElement {
  if (!uiActive(root)) return root;
  const request = calendarRequest(root);
  const { record } = request;
  const valid = (): boolean => request.valid() && allowed();
  if (!valid() || !allowed()) return root;
  if (!record.range || (!record.start && !record.end)) return root;
  const detail: RangeCalendarEventDetail = {
    calendar: root,
    complete: false,
    previousEnd: record.end,
    previousStart: record.start,
  };
  const source = sourceState(root);
  if (
    !emitRange(root, "before-change", { ...detail }, true) ||
    !valid() ||
    !sameSource(root, source) ||
    !allowed()
  )
    return root;
  record.start = undefined;
  record.end = undefined;
  if (!reflectCalendar(record, { start: undefined, end: undefined }, valid)) return root;
  renderCalendar(root, record, valid);
  if (!valid() || !rendered(record)) return root;
  rangeStatus(record, "Date range cleared.", valid);
  if (valid()) emitRange(root, "change", detail);
  return root;
}

function keyboardDate(
  root: HTMLElement,
  button: HTMLButtonElement,
  event: KeyboardEvent,
): Date | undefined {
  const date = parseDate(button.dataset.value ?? "", "day value");
  if (event.key === "ArrowLeft") return addDays(date, -1);
  if (event.key === "ArrowRight") return addDays(date, 1);
  if (event.key === "ArrowUp") return addDays(date, -7);
  if (event.key === "ArrowDown") return addDays(date, 7);
  if (event.key === "Home") return addDays(date, -((date.getUTCDay() - weekStart(root) + 7) % 7));
  if (event.key === "End") return addDays(date, 6 - ((date.getUTCDay() - weekStart(root) + 7) % 7));
  if (event.key === "PageUp") return addMonths(date, event.shiftKey ? -12 : -1);
  if (event.key === "PageDown") return addMonths(date, event.shiftKey ? 12 : 1);
  return undefined;
}

function closestEnabled(root: HTMLElement, date: Date, direction: number): Date | undefined {
  let candidate = date;
  for (let index = 0; index < 370; index += 1) {
    if (!isDisabled(root, candidate)) return candidate;
    candidate = addDays(candidate, direction);
  }
  return undefined;
}

function wireCalendar(root: HTMLElement, record: CalendarRecord): void {
  const click = (event: MouseEvent): void => {
    const target = isElementNode(event.target) ? event.target.closest("button") : null;
    if (
      !isHTMLTag(target, "button") ||
      !calendarCurrent(record) ||
      target.closest('[data-jqs]:not(button[data-jqs="button"])') !== root ||
      event.defaultPrevented ||
      blocked(target)
    )
      return;
    if (target.dataset.part === "previous") {
      requestView(root, addMonths(record.view, -1));
    } else if (target.dataset.part === "next") {
      requestView(root, addMonths(record.view, 1));
    } else if (target.dataset.part === "day" && target.dataset.value) {
      const date = parseDate(target.dataset.value);
      if (record.range)
        requestRangeSelection(root, date, undefined, () => !blocked(root) && !blocked(target));
      else requestSelection(root, date, () => !blocked(root) && !blocked(target));
    }
  };
  const keydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (
      !isHTMLTag(target, "button") ||
      target.dataset.part !== "day" ||
      !calendarCurrent(record) ||
      target.closest('[data-jqs]:not(button[data-jqs="button"])') !== root ||
      event.defaultPrevented ||
      blocked(target)
    )
      return;
    const date = keyboardDate(root, target, event);
    if (!date) return;
    event.preventDefault();
    const direction = date < parseDate(target.dataset.value ?? "") ? -1 : 1;
    const enabled = closestEnabled(root, date, direction);
    if (!enabled) return;
    record.focusDate = dateIso(enabled);
    requestView(root, enabled, true);
  };
  listen(record, root, "click", click as EventListener);
  listen(record, root, "keydown", keydown as EventListener);
}

function enhanceCalendar(root: HTMLElement): CalendarRecord {
  root.id ||= `jqs-calendar-${++calendarId}`;
  let record = calendarRecords.get(root);
  if (record && !calendarCurrent(record)) {
    record.cleanup();
    record = calendarRecords.get(root);
  }
  const range = root.matches('[data-jqs="range-calendar"]');
  const requestedValue = root.dataset.value?.trim();
  let requestedStart = root.dataset.start?.trim();
  let requestedEnd = root.dataset.end?.trim();
  const requestedMonth = root.dataset.month?.trim();
  const valueDate = requestedValue ? parseDate(requestedValue, "data-value") : undefined;
  let startDate = requestedStart ? parseDate(requestedStart, "data-start") : undefined;
  let endDate = requestedEnd ? parseDate(requestedEnd, "data-end") : undefined;
  if (endDate && !startDate) {
    throw new Error(`Range Calendar #${root.id} needs data-start when data-end is present.`);
  }
  if (startDate && endDate && endDate < startDate) {
    [startDate, endDate] = orderedRange(startDate, endDate);
    requestedStart = dateIso(startDate);
    requestedEnd = dateIso(endDate);
    root.dataset.start = requestedStart;
    root.dataset.end = requestedEnd;
  }
  const monthDate = requestedMonth ? parseDate(`${requestedMonth}-01`, "data-month") : undefined;

  if (!record) {
    record = {
      ...lifetime(root),
      ...calendarParts(root),
      rendering: undefined,
      signature:
        calendarOutput.get(root)?.grid === directPart(root, "grid")
          ? calendarOutput.get(root)?.signature
          : undefined,
      content: calendarOutput.get(root)?.content ?? null,
      end: range ? requestedEnd : undefined,
      focusDate:
        calendarFocus.get(root) ?? (range ? (requestedEnd ?? requestedStart) : requestedValue),
      range,
      start: range ? requestedStart : undefined,
      value: range ? undefined : requestedValue,
      view: startOfMonth(monthDate ?? (range ? startDate : valueDate) ?? today()),
    };
    const owned = record;
    record.cleanup = ownUIRecord(calendarRecords, root, record, () => {
      calendarFocus.set(root, owned.focusDate);
      calendarOutput.set(root, {
        grid: owned.grid,
        content: owned.content,
        signature: owned.signature,
      });
      retire(owned);
    });
    try {
      wireCalendar(root, record);
    } catch (error) {
      rollback(record, error);
    }
  } else {
    if (record.rendering) return record;
    const previous = record.signature;
    if (range) {
      if (requestedStart !== record.start || requestedEnd !== record.end) {
        record.start = requestedStart || undefined;
        record.end = requestedEnd || undefined;
        record.focusDate = requestedEnd || requestedStart || record.focusDate;
      }
    } else if (requestedValue !== record.value) {
      record.value = requestedValue || undefined;
      record.focusDate = requestedValue || record.focusDate;
    }
    if (monthDate && monthIso(monthDate) !== monthIso(record.view)) record.view = monthDate;
    if (previous !== renderSignature(root, record) || record.grid !== directPart(root, "grid"))
      record.revision += 1;
  }

  try {
    renderCalendar(root, record);
  } catch (error) {
    rollback(record, error);
  }
  if (range && current(record)) {
    if (record.start && record.end) {
      rangeStatus(
        record,
        `Range selected, ${dayFormatter.format(parseDate(record.start))} through ${dayFormatter.format(parseDate(record.end))}.`,
      );
    } else if (record.start) {
      rangeStatus(
        record,
        `${dayFormatter.format(parseDate(record.start))} selected as the start date. Choose an end date.`,
      );
    }
  }
  return record;
}

function pickerParts(root: HTMLElement): {
  calendar: HTMLElement;
  control: HTMLInputElement;
  popover: HTMLElement;
  value: HTMLElement | undefined;
} {
  const control = directPart(root, "control");
  const popover = directPart(root, "popover");
  const calendar = popover && pickerCalendar(popover, false);
  if (!isHTMLTag(control, "input")) {
    throw new Error(`Date Picker #${root.id} needs a direct input[data-part="control"] child.`);
  }
  if (!isHTMLElement(popover) || !popover.matches('[data-jqs="popover"]')) {
    throw new Error(`Date Picker #${root.id} needs a direct data-part="popover" Popover child.`);
  }
  if (!isHTMLElement(calendar)) {
    throw new Error(`Date Picker #${root.id} needs a Calendar inside its Popover.`);
  }
  return {
    calendar,
    control,
    popover,
    value: pickerLabel(popover),
  };
}

function rangePickerParts(root: HTMLElement): {
  calendar: HTMLElement;
  endControl: HTMLInputElement;
  popover: HTMLElement;
  startControl: HTMLInputElement;
  value: HTMLElement | undefined;
} {
  const startControl = directPart(root, "start-control");
  const endControl = directPart(root, "end-control");
  const popover = directPart(root, "popover");
  const calendar = popover && pickerCalendar(popover, true);
  if (!isHTMLTag(startControl, "input")) {
    throw new Error(
      `Date Range Picker #${root.id} needs a direct input[data-part="start-control"] child.`,
    );
  }
  if (!isHTMLTag(endControl, "input")) {
    throw new Error(
      `Date Range Picker #${root.id} needs a direct input[data-part="end-control"] child.`,
    );
  }
  if (!isHTMLElement(popover) || !popover.matches('[data-jqs="popover"]')) {
    throw new Error(
      `Date Range Picker #${root.id} needs a direct data-part="popover" Popover child.`,
    );
  }
  if (!isHTMLElement(calendar)) {
    throw new Error(`Date Range Picker #${root.id} needs a Range Calendar inside its Popover.`);
  }
  return {
    calendar,
    endControl,
    popover,
    startControl,
    value: pickerLabel(popover),
  };
}

function rangePickerLabel(start: string | undefined, end: string | undefined): string {
  if (start && end) {
    return `${dayFormatter.format(parseDate(start))} through ${dayFormatter.format(parseDate(end))}`;
  }
  if (start) return `${dayFormatter.format(parseDate(start))}, choose an end date`;
  return "Choose date range";
}

function syncPicker(record: DatePickerRecord, start: string | undefined, end?: string): void {
  if (!pickerCurrent(record)) return;
  if (record.range && start && end && parseDate(end) < parseDate(start))
    [start, end] = [end, start];
  const revision = record.revision;
  const token = {};
  record.syncing = token;
  const valid = (): boolean => pickerCurrent(record, revision) && record.syncing === token;
  const write = (operation: () => void): boolean => {
    if (!valid()) return false;
    operation();
    return valid();
  };
  try {
    const values = record.range ? [start, end] : [start];
    for (const [index, control] of record.controls.entries()) {
      if (
        !control.readOnly &&
        !write(() => {
          control.readOnly = true;
        })
      )
        return;
      const value = values[index] ?? "";
      if (
        control.value !== value &&
        !write(() => {
          control.value = value;
        })
      )
        return;
    }
    const names = record.range ? (["start", "end"] as const) : (["value"] as const);
    for (const [index, name] of names.entries()) {
      const value = values[index];
      if (
        record.calendar.dataset[name] !== (value ?? "") &&
        !write(() => {
          if (value || !record.range) record.calendar.dataset[name] = value ?? "";
          else record.calendar.removeAttribute(`data-${name}`);
        })
      )
        return;
    }
    if (!valid()) return;
    enhanceCalendar(record.calendar);
    if (!valid()) return;
    const visible = record.range
      ? start
        ? `${start}${end ? ` – ${end}` : " – …"}`
        : "Choose dates"
      : start || "Choose date";
    const label = record.range
      ? rangePickerLabel(start, end)
      : start
        ? dayFormatter.format(parseDate(start))
        : "Choose date";
    if (
      record.label &&
      record.label.textContent !== visible &&
      !write(() => {
        if (record.label) record.label.textContent = visible;
      })
    )
      return;
    if (record.trigger)
      write(() => {
        record.trigger?.setAttribute("aria-label", label);
      });
  } finally {
    if (record.syncing === token) record.syncing = undefined;
  }
}

function focusPicker(record: DatePickerRecord): void {
  const revision = record.focusRevision;
  uiWindow(record.root).queueMicrotask(() => {
    if (
      !pickerCurrent(record) ||
      record.focusRevision !== revision ||
      record.popover.dataset.state !== "open"
    )
      return;
    record.calendar.querySelector<HTMLButtonElement>('[data-part="day"][tabindex="0"]')?.focus();
  });
}

function pickerRequest(root: HTMLElement, popovers: CalendarPopovers, range: boolean) {
  const intent = beginRequest(root);
  const record = enhanceDatePicker(root, popovers, range);
  if (!record || intents.get(root) !== intent || !pickerCurrent(record)) return undefined;
  const revision = ++record.revision;
  record.focusRevision += 1;
  return {
    record,
    valid: (): boolean => pickerCurrent(record, revision) && intents.get(root) === intent,
  };
}

function selectPicker(
  root: HTMLElement,
  popovers: CalendarPopovers,
  range: boolean,
  start: string | Date,
  end?: string | Date,
  allowed: () => boolean = () => true,
): HTMLElement {
  if (!allowed()) return root;
  const request = pickerRequest(root, popovers, range);
  if (!request || !request.valid() || !allowed()) return root;
  const valid = (): boolean => request.valid() && allowed();
  if (range) requestRangeSelection(request.record.calendar, start, end, valid);
  else requestSelection(request.record.calendar, start, valid);
  return root;
}
function clearPicker(
  root: HTMLElement,
  popovers: CalendarPopovers,
  allowed: () => boolean = () => true,
): HTMLElement {
  if (!allowed()) return root;
  const request = pickerRequest(root, popovers, true);
  if (request?.valid() && allowed())
    clearRange(request.record.calendar, () => request.valid() && allowed());
  return root;
}

function closePicker(root: HTMLElement, popovers: CalendarPopovers, range: boolean): HTMLElement {
  const request = pickerRequest(root, popovers, range);
  if (request?.valid()) popovers.api.close(request.record.popover);
  return root;
}

function openDatePicker(
  root: HTMLElement,
  popovers: CalendarPopovers,
  range: boolean,
  allowed: () => boolean = () => true,
): HTMLElement {
  if (!allowed()) return root;
  const request = pickerRequest(root, popovers, range);
  if (!request) return root;
  const { record, valid } = request;
  const calendar = calendarRecords.get(record.calendar);
  if (!valid() || !calendar || !calendarCurrent(calendar)) return root;
  const date = range ? (calendar.end ?? calendar.start) : record.controls[0].value;
  requestView(record.calendar, date ? parseDate(date) : today());
  if (!valid() || !allowed()) return root;
  popovers.api.open(record.popover);
  if (valid() && allowed()) focusPicker(record);
  return root;
}

function syncDatePicker(record: DatePickerRecord): void {
  const [start, end] = record.controls.map((control) => control.value || undefined);
  syncPicker(record, start, end);
}

function wirePickerReset(record: DatePickerRecord): void {
  const window = uiWindow(record.root);
  const timers = new Set<number>();
  record.cleanups.add(() => {
    for (const timer of timers) window.clearTimeout(timer);
    timers.clear();
  });
  for (const form of new Set(record.forms)) {
    if (!form) continue;
    listen(record, form, "reset", (event) => {
      if (!pickerCurrent(record)) return;
      const revision = record.revision;
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!event.defaultPrevented && pickerCurrent(record, revision)) {
          record.focusRevision += 1;
          syncDatePicker(record);
        }
      }, 0);
      if (pickerCurrent(record, revision)) timers.add(timer);
      else window.clearTimeout(timer);
    });
  }
}

function wireDatePicker(
  record: DatePickerRecord,
  popovers: CalendarPopovers,
  range: boolean,
): void {
  const { root, calendar, controls, popover } = record;
  const calendarChange = (event: Event): void => {
    if (
      !pickerCurrent(record) ||
      event.target !== calendar ||
      calendarEvents.get(event)?.() === false
    )
      return;
    const revision = ++record.revision;
    record.focusRevision += 1;
    const previous = controls.map((control) => control.value);
    const accepted = calendarRecords.get(calendar);
    if (!accepted || !calendarCurrent(accepted)) return;
    const detail = {
      value: accepted.value,
      start: accepted.start,
      end: accepted.end,
      complete: accepted.end !== undefined,
      previousValue: previous[0],
    };
    syncPicker(record, range ? detail.start : detail.value, detail.end);
    const expected = range ? [detail.start ?? "", detail.end ?? ""] : [detail.value ?? ""];
    const source = sourceState(calendar);
    const valid = (): boolean =>
      pickerCurrent(record, revision) &&
      sameSource(calendar, source) &&
      controls.every((control, index) => control.value === expected[index]);
    const realm = record.window as Window & typeof globalThis;
    for (const [index, control] of controls.entries()) {
      if (range && previous[index] === control.value) continue;
      if (!valid()) return;
      control.dispatchEvent(new realm.Event("input", { bubbles: true }));
      if (!valid()) return;
      control.dispatchEvent(new realm.Event("change", { bubbles: true }));
    }
    if (!valid()) return;
    root.dispatchEvent(
      new realm.CustomEvent(`jquery-star:${range ? "date-range-picker" : "date-picker"}:change`, {
        bubbles: true,
        detail: range
          ? {
              complete: detail.complete,
              dateRangePicker: root,
              end: detail.end,
              previousEnd: previous[1],
              previousStart: previous[0],
              start: detail.start,
            }
          : { datePicker: root, previousValue: detail.previousValue, value: detail.value },
      }),
    );
    if (!valid() || (range && !detail.complete)) return;
    popovers.api.close(popover);
    if (valid() && popover.dataset.state === "closed") directPart(popover, "trigger")?.focus();
  };
  const controlClick = (event: Event): void => {
    if (
      !event.defaultPrevented &&
      isElementNode(event.currentTarget) &&
      !blocked(event.currentTarget) &&
      pickerCurrent(record)
    )
      openDatePicker(root, popovers, range, () => !blocked(root));
  };
  const controlKeydown = (event: KeyboardEvent): void => {
    if (
      event.key !== "ArrowDown" ||
      event.defaultPrevented ||
      !isElementNode(event.currentTarget) ||
      blocked(event.currentTarget) ||
      !pickerCurrent(record)
    )
      return;
    event.preventDefault();
    openDatePicker(root, popovers, range, () => !blocked(root));
  };
  const triggerClick = (event: MouseEvent): void => {
    if (!pickerCurrent(record) || event.defaultPrevented || blocked(root)) return;
    const target = isElementNode(event.target) ? event.target.closest("button") : null;
    if (!target || target !== directPart(popover, "trigger") || blocked(target)) return;
    event.preventDefault();
    event.stopPropagation();
    if (popover.dataset.state === "open") closePicker(root, popovers, range);
    else openDatePicker(root, popovers, range, () => !blocked(root));
  };
  listen(
    record,
    calendar,
    `jquery-star:${range ? "range-calendar" : "calendar"}:change`,
    calendarChange,
  );
  for (const control of controls) {
    listen(record, control, "click", controlClick);
    listen(record, control, "keydown", controlKeydown as EventListener);
  }
  listen(record, root, "click", triggerClick as EventListener, true);
  if (pickerCurrent(record)) wirePickerReset(record);
}

function enhanceDatePicker(
  root: HTMLElement,
  popovers: CalendarPopovers,
  range: boolean,
): DatePickerRecord | undefined {
  if (!uiActive(root)) return undefined;
  root.id ||= range ? `jqs-date-range-picker-${++rangePickerId}` : `jqs-date-picker-${++pickerId}`;
  const parts = range ? rangePickerParts(root) : pickerParts(root);
  if (!uiActive(parts.calendar) || !uiActive(parts.popover)) return undefined;
  const controls: [HTMLInputElement, ...HTMLInputElement[]] =
    "control" in parts ? [parts.control] : [parts.startControl, parts.endControl];
  const records = range ? rangePickerRecords : pickerRecords;
  let record = records.get(root);
  if (
    record &&
    (!pickerCurrent(record) ||
      record.calendar !== parts.calendar ||
      record.popover !== parts.popover ||
      record.controls.some((control, index) => controls[index] !== control))
  ) {
    record.cleanup();
    record = records.get(root);
    if (record) return record;
    if (!uiActive(root)) return undefined;
  }
  if (!record) {
    record = {
      ...lifetime(root),
      calendar: parts.calendar,
      popover: parts.popover,
      controls,
      forms: controls.map((control) => control.form),
      focusRevision: 0,
      trigger: directPart(parts.popover, "trigger"),
      content: directPart(parts.popover, "content"),
      label: parts.value,
      range,
      syncing: undefined,
      enhancing: undefined,
    };
    const owned = record;
    record.cleanup = ownUIRecord(records, root, record, () => retire(owned));
    try {
      wireDatePicker(record, popovers, range);
    } catch (error) {
      rollback(record, error);
    }
  }
  if (!pickerCurrent(record) || record.syncing || record.enhancing) return record;
  const revision = record.revision;
  const token = {};
  record.enhancing = token;
  try {
    popovers.enhance(record.popover);
    if (!pickerCurrent(record, revision)) return record;
    const content = directPart(parts.popover, "content");
    if (
      content &&
      !content.hasAttribute("aria-label") &&
      !content.hasAttribute("aria-labelledby")
    ) {
      const fieldLabel = controls[0].labels?.[0]?.textContent.trim();
      const controlLabel = range ? undefined : controls[0].getAttribute("aria-label")?.trim();
      content.setAttribute(
        "aria-label",
        `${fieldLabel || controlLabel || (range ? "Choose dates" : "Choose date")} calendar`,
      );
    }
    if (!pickerCurrent(record, revision)) return record;
    if (!initializedPickers.has(root)) {
      if (range)
        syncPicker(
          record,
          controls[0].value || parts.calendar.dataset.start || undefined,
          controls[1]?.value || parts.calendar.dataset.end || undefined,
        );
      else syncPicker(record, controls[0].value || parts.calendar.dataset.value || undefined);
    }
    if (pickerCurrent(record, revision)) syncDatePicker(record);
    if (pickerCurrent(record, revision)) initializedPickers.add(root);
  } catch (error) {
    rollback(record, error);
  } finally {
    if (record.enhancing === token) record.enhancing = undefined;
  }
  return record;
}

function enhancePicker(
  root: HTMLElement,
  popovers: CalendarPopovers,
): DatePickerRecord | undefined {
  return enhanceDatePicker(root, popovers, false);
}

function enhanceRangePicker(
  root: HTMLElement,
  popovers: CalendarPopovers,
): DatePickerRecord | undefined {
  return enhanceDatePicker(root, popovers, true);
}

const constraintSelector =
  ':disabled,[disabled],[aria-disabled="true"],[data-disabled]:not([data-disabled="false"]),[inert]';

function blocked(element: Element): boolean {
  if (element.closest(constraintSelector)) return true;
  const picker = element.closest('[data-jqs="date-picker"], [data-jqs="date-range-picker"]');
  return (
    !!picker &&
    Array.from(picker.children).some(
      (child) =>
        isHTMLTag(child, "input") &&
        ["control", "start-control", "end-control"].includes(child.dataset.part ?? "") &&
        child.matches(constraintSelector),
    )
  );
}

function controlled(
  context: StarContext,
  kind: string,
  owner: Document,
  target?: unknown,
): HTMLElement {
  const selector = `[data-jqs="${kind}"]`;
  const candidate =
    typeof target === "string"
      ? isHTMLElement(context.root) && context.root.matches(target)
        ? context.root
        : context.root.querySelector(target)
      : isHTMLElement(target)
        ? target
        : (context.element?.closest(selector) ??
          (isHTMLElement(context.root) && context.root.matches(selector)
            ? context.root
            : undefined));
  if (!isHTMLElement(candidate) || !candidate.matches(selector))
    throw new Error(`Calendar action target did not match ${selector}.`);
  if (candidate.ownerDocument !== owner || !uiActive(candidate))
    throw new Error("This UI target is unavailable in its owning Document.");
  return candidate;
}

function actionAllowed(context: StarContext, root: HTMLElement): boolean {
  return !(
    blocked(root) ||
    (context.element && blocked(context.element)) ||
    (context.event && "defaultPrevented" in context.event && context.event.defaultPrevented) ||
    (context.event && "isDefaultPrevented" in context.event && context.event.isDefaultPrevented())
  );
}

export function createCalendars(
  popovers: CalendarPopovers,
  registerAction: ActionRegistrar,
  owner: Document,
): CalendarCollection {
  const calendar: StarCalendarStatic = {
    select: (target, date) => requestSelection(resolveCalendar(target), date),
    month: (target, date) => requestView(resolveCalendar(target), date),
    next: (target) => {
      const root = resolveCalendar(target);
      return requestView(root, 1);
    },
    previous: (target) => {
      const root = resolveCalendar(target);
      return requestView(root, -1);
    },
    value: (target) => {
      const root = resolveCalendar(target);
      return enhanceCalendar(root).value;
    },
  };
  const rangeCalendar: StarRangeCalendarStatic = {
    select: (target, start, end) => requestRangeSelection(resolveRangeCalendar(target), start, end),
    clear: (target) => clearRange(resolveRangeCalendar(target)),
    month: (target, date) => requestView(resolveRangeCalendar(target), date),
    next: (target) => {
      const root = resolveRangeCalendar(target);
      return requestView(root, 1);
    },
    previous: (target) => {
      const root = resolveRangeCalendar(target);
      return requestView(root, -1);
    },
    value: (target) => {
      const root = resolveRangeCalendar(target);
      return rangeValue(enhanceCalendar(root));
    },
  };
  const datePicker: StarDatePickerStatic = {
    open: (target) => openDatePicker(resolvePicker(target), popovers, false),
    close: (target) => {
      const root = resolvePicker(target);
      closePicker(root, popovers, false);
      return root;
    },
    select: (target, date) => selectPicker(resolvePicker(target), popovers, false, date),
    value: (target) => {
      const root = resolvePicker(target);
      enhancePicker(root, popovers);
      return pickerParts(root).control.value || undefined;
    },
  };
  const dateRangePicker: StarDateRangePickerStatic = {
    open: (target) => openDatePicker(resolveRangePicker(target), popovers, true),
    close: (target) => {
      const root = resolveRangePicker(target);
      closePicker(root, popovers, true);
      return root;
    },
    select: (target, start, end) =>
      selectPicker(resolveRangePicker(target), popovers, true, start, end),
    clear: (target) => clearPicker(resolveRangePicker(target), popovers),
    value: (target) => {
      const root = resolveRangePicker(target);
      enhanceRangePicker(root, popovers);
      const parts = rangePickerParts(root);
      return {
        ...(parts.startControl.value ? { start: parts.startControl.value } : {}),
        ...(parts.endControl.value ? { end: parts.endControl.value } : {}),
      };
    },
  };

  for (const kind of ["calendar", "range-calendar", "date-picker", "date-range-picker"] as const) {
    const range = kind.includes("range");
    const picker = kind.includes("picker");
    registerAction(`ui.${kind}.select`, (context) => {
      const first = context.args?.[0];
      const explicit =
        isHTMLElement(first) || (typeof first === "string" && !ISO_DATE.test(first.trim()));
      const root = controlled(context, kind, owner, explicit ? first : undefined);
      const start = context.args?.[explicit ? 1 : 0];
      const end = range ? context.args?.[explicit ? 2 : 1] : undefined;
      if (typeof start !== "string" && !dateValue(start))
        throw new Error(`ui.${kind}.select needs an ISO date.`);
      if (end !== undefined && typeof end !== "string" && !dateValue(end))
        throw new Error(`ui.${kind}.select end must be an ISO date.`);
      const allowed = (): boolean => actionAllowed(context, root);
      if (!allowed()) return root;
      if (picker) {
        selectPicker(root, popovers, range, start, end, allowed);
      } else if (range) requestRangeSelection(root, start, end, allowed);
      else requestSelection(root, start, allowed);
      return root;
    });
    if (picker) {
      for (const operation of ["open", "close"] as const)
        registerAction(`ui.${kind}.${operation}`, (context) => {
          const root = controlled(context, kind, owner, context.args?.[0]);
          if (!actionAllowed(context, root)) return root;
          return operation === "open"
            ? openDatePicker(root, popovers, range, () => actionAllowed(context, root))
            : closePicker(root, popovers, range);
        });
    } else {
      for (const operation of ["next", "previous"] as const)
        registerAction(`ui.${kind}.${operation}`, (context) => {
          const root = controlled(context, kind, owner, context.args?.[0]);
          if (!actionAllowed(context, root)) return root;
          return (range ? rangeCalendar : calendar)[operation](root);
        });
    }
    if (range)
      registerAction(`ui.${kind}.clear`, (context) => {
        const root = controlled(context, kind, owner, context.args?.[0]);
        if (!actionAllowed(context, root)) return root;
        return picker
          ? clearPicker(root, popovers, () => actionAllowed(context, root))
          : clearRange(root, () => actionAllowed(context, root));
      });
  }

  const enhance = (root: ParentNode): void => {
    const calendars = uiElements(root, '[data-jqs="calendar"]');
    for (const element of calendars) {
      const calendarElement = calendarRoot(element);
      if (calendarElement) enhanceCalendar(calendarElement);
    }

    const rangeCalendars = uiElements(root, '[data-jqs="range-calendar"]');
    for (const element of rangeCalendars) {
      const calendarElement = rangeCalendarRoot(element);
      if (calendarElement) enhanceCalendar(calendarElement);
    }

    const pickers = uiElements(root, '[data-jqs="date-picker"]');
    for (const element of pickers) {
      const picker = pickerRoot(element);
      if (picker) enhancePicker(picker, popovers);
    }

    const rangePickers = uiElements(root, '[data-jqs="date-range-picker"]');
    for (const element of rangePickers) {
      const picker = rangePickerRoot(element);
      if (picker) enhanceRangePicker(picker, popovers);
    }
  };

  return { calendar, datePicker, dateRangePicker, enhance, rangeCalendar };
}

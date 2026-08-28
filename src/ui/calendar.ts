import { registerAction } from "../registry";
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

interface CalendarRecord {
  cleanup: () => void;
  end: string | undefined;
  focusDate: string | undefined;
  range: boolean;
  start: string | undefined;
  value: string | undefined;
  view: Date;
}

interface DatePickerRecord {
  cleanup: () => void;
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

const calendarRecords = new WeakMap<HTMLElement, CalendarRecord>();
const pickerRecords = new WeakMap<HTMLElement, DatePickerRecord>();
const rangePickerRecords = new WeakMap<HTMLElement, DatePickerRecord>();
let calendarId = 0;
let pickerId = 0;
let rangePickerId = 0;

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
  return new Date(Date.UTC(current.getFullYear(), current.getMonth(), current.getDate()));
}

function parseDate(value: string | Date, label = "date"): Date {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
  }
  if (typeof value !== "string") throw new Error(`Calendar ${label} must be an ISO date.`);
  const match = ISO_DATE.exec(value.trim());
  if (!match) throw new Error(`Calendar ${label} must use YYYY-MM-DD: ${value}`);
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month, day));
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
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function addDays(date: Date, amount: number): Date {
  const result = new Date(date);
  result.setUTCDate(result.getUTCDate() + amount);
  return result;
}

function addMonths(date: Date, amount: number): Date {
  const day = date.getUTCDate();
  const result = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + amount, 1));
  const lastDay = new Date(
    Date.UTC(result.getUTCFullYear(), result.getUTCMonth() + 1, 0),
  ).getUTCDate();
  result.setUTCDate(Math.min(day, lastDay));
  return result;
}

function directPart(root: HTMLElement, part: string): HTMLElement | undefined {
  return Array.from(root.children).find(
    (child): child is HTMLElement => child instanceof HTMLElement && child.dataset.part === part,
  );
}

function calendarRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="calendar"]') ? value : undefined;
}

function rangeCalendarRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="range-calendar"]')
    ? value
    : undefined;
}

function pickerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="date-picker"]')
    ? value
    : undefined;
}

function rangePickerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="date-range-picker"]')
    ? value
    : undefined;
}

function resolveCalendar(target: CalendarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? calendarRoot(root.querySelector(target)) : calendarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Calendar target did not match data-jqs="calendar": ${String(target)}`);
}

function resolveRangeCalendar(
  target: RangeCalendarTarget,
  root: ParentNode = document,
): HTMLElement {
  const resolved =
    typeof target === "string"
      ? rangeCalendarRoot(root.querySelector(target))
      : rangeCalendarRoot(target);
  if (resolved) return resolved;
  throw new Error(
    `Range Calendar target did not match data-jqs="range-calendar": ${String(target)}`,
  );
}

function resolvePicker(target: DatePickerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? pickerRoot(root.querySelector(target)) : pickerRoot(target);
  if (resolved) return resolved;
  throw new Error(`Date Picker target did not match data-jqs="date-picker": ${String(target)}`);
}

function resolveRangePicker(
  target: DateRangePickerTarget,
  root: ParentNode = document,
): HTMLElement {
  const resolved =
    typeof target === "string"
      ? rangePickerRoot(root.querySelector(target))
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

function emit(
  root: HTMLElement,
  name: "before-change" | "change" | "view-change",
  detail: CalendarEventDetail,
  cancelable = false,
): boolean {
  return root.dispatchEvent(
    new CustomEvent(`jquery-star:calendar:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
}

function emitRange(
  root: HTMLElement,
  name: "before-change" | "change" | "invalid-range" | "view-change",
  detail: RangeCalendarEventDetail,
  cancelable = false,
): boolean {
  return root.dispatchEvent(
    new CustomEvent(`jquery-star:range-calendar:${name}`, {
      bubbles: true,
      cancelable,
      detail,
    }),
  );
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

function rangeStatus(root: HTMLElement, message: string): void {
  const status = directPart(root, "status");
  if (!status) return;
  status.setAttribute("aria-live", "polite");
  status.textContent = message;
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
  const button = document.createElement("button");
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

function syncNavigation(root: HTMLElement, record: CalendarRecord): void {
  const header = directPart(root, "header");
  const previous = header?.querySelector(':scope > [data-part="previous"]');
  const next = header?.querySelector(':scope > [data-part="next"]');
  const min = dateLimit(root, "min");
  const max = dateLimit(root, "max");
  if (previous instanceof HTMLButtonElement) {
    previous.type = "button";
    const disabled = min !== undefined && startOfMonth(record.view) <= startOfMonth(min);
    if (previous.disabled !== disabled) previous.disabled = disabled;
  }
  if (next instanceof HTMLButtonElement) {
    next.type = "button";
    const disabled = max !== undefined && startOfMonth(record.view) >= startOfMonth(max);
    if (next.disabled !== disabled) next.disabled = disabled;
  }
}

function renderCalendar(root: HTMLElement, record: CalendarRecord): void {
  const grid = directPart(root, "grid");
  const heading = directPart(root, "header")?.querySelector(':scope > [data-part="heading"]');
  if (!grid) throw new Error(`Calendar #${root.id} needs a direct data-part="grid" child.`);
  if (!heading) throw new Error(`Calendar #${root.id} needs a direct data-part="heading" child.`);

  if (root.dataset.month !== monthIso(record.view)) root.dataset.month = monthIso(record.view);
  const title = monthFormatter.format(record.view);
  if (heading.textContent !== title) heading.textContent = title;
  heading.setAttribute("aria-live", "polite");
  grid.setAttribute("role", "grid");
  grid.setAttribute("aria-label", title);
  syncNavigation(root, record);

  const signature = renderSignature(root, record);
  if (grid.dataset.rendered === signature) return;

  const fragment = document.createDocumentFragment();
  const header = document.createElement("div");
  header.dataset.part = "weekdays";
  header.setAttribute("role", "row");
  const base = new Date(Date.UTC(2026, 7, 2 + weekStart(root)));
  for (let index = 0; index < 7; index += 1) {
    const weekday = document.createElement("span");
    weekday.setAttribute("role", "columnheader");
    weekday.setAttribute("aria-label", dayFormatter.format(addDays(base, index)).split(",")[0]!);
    weekday.textContent = weekdayFormatter.format(addDays(base, index)).slice(0, 2);
    header.append(weekday);
  }
  fragment.append(header);

  const first = firstGridDate(root, record.view);
  const buttons: HTMLButtonElement[] = [];
  for (let rowIndex = 0; rowIndex < 6; rowIndex += 1) {
    const row = document.createElement("div");
    row.dataset.part = "week";
    row.setAttribute("role", "row");
    for (let column = 0; column < 7; column += 1) {
      const date = addDays(first, rowIndex * 7 + column);
      const cell = document.createElement("span");
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
    buttons.find((button) => button.getAttribute("aria-current") === "date" && !button.disabled) ??
    buttons.find((button) => button.dataset.month === "current" && !button.disabled) ??
    buttons.find((button) => !button.disabled);
  if (preferred) {
    preferred.tabIndex = 0;
    record.focusDate = preferred.dataset.value;
  }
  grid.replaceChildren(fragment);
  grid.dataset.rendered = signature;
}

function requestView(root: HTMLElement, date: Date, focus = false): HTMLElement {
  const record = calendarRecords.get(root) ?? enhanceCalendar(root);
  const previous = monthIso(record.view);
  record.view = startOfMonth(date);
  if (root.dataset.month !== monthIso(record.view)) root.dataset.month = monthIso(record.view);
  renderCalendar(root, record);
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
  if (focus) {
    const button = root.querySelector<HTMLButtonElement>(
      `[data-part="day"][data-value="${dateIso(date)}"]`,
    );
    button?.focus();
  }
  return root;
}

function requestSelection(root: HTMLElement, date: Date): HTMLElement {
  const record = calendarRecords.get(root) ?? enhanceCalendar(root);
  if (isDisabled(root, date)) return root;
  const value = dateIso(date);
  if (record.value === value) return root;
  const activeDay =
    document.activeElement instanceof HTMLButtonElement &&
    root.contains(document.activeElement) &&
    document.activeElement.dataset.part === "day";
  const detail: CalendarEventDetail = {
    calendar: root,
    date: value,
    previousValue: record.value,
    value,
  };
  if (!emit(root, "before-change", detail, true)) return root;
  record.value = value;
  record.focusDate = value;
  record.view = startOfMonth(date);
  if (root.dataset.value !== value) root.dataset.value = value;
  renderCalendar(root, record);
  if (activeDay) {
    root.querySelector<HTMLButtonElement>(`[data-part="day"][data-value="${value}"]`)?.focus();
  }
  emit(root, "change", detail);
  return root;
}

function requestRangeSelection(root: HTMLElement, date: Date, endDate?: Date): HTMLElement {
  const record = calendarRecords.get(root) ?? enhanceCalendar(root);
  if (!record.range || isDisabled(root, date) || (endDate && isDisabled(root, endDate)))
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
    rangeStatus(root, "That range includes an unavailable date. Choose another end date.");
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
  if (!emitRange(root, "before-change", detail, true)) return root;

  const activeDay =
    document.activeElement instanceof HTMLButtonElement &&
    root.contains(document.activeElement) &&
    document.activeElement.dataset.part === "day";
  record.start = start;
  record.end = end;
  record.focusDate = dateIso(endDate ?? date);
  record.view = startOfMonth(endDate ?? date);
  root.dataset.start = start;
  if (end) root.dataset.end = end;
  else delete root.dataset.end;
  renderCalendar(root, record);
  if (activeDay) {
    root
      .querySelector<HTMLButtonElement>(`[data-part="day"][data-value="${record.focusDate}"]`)
      ?.focus();
  }
  rangeStatus(
    root,
    end
      ? `Range selected, ${dayFormatter.format(nextStart)} through ${dayFormatter.format(nextEnd!)}.`
      : `${dayFormatter.format(nextStart)} selected as the start date. Choose an end date.`,
  );
  emitRange(root, "change", detail);
  return root;
}

function clearRange(root: HTMLElement): HTMLElement {
  const record = calendarRecords.get(root) ?? enhanceCalendar(root);
  if (!record.range || (!record.start && !record.end)) return root;
  const detail: RangeCalendarEventDetail = {
    calendar: root,
    complete: false,
    previousEnd: record.end,
    previousStart: record.start,
  };
  if (!emitRange(root, "before-change", detail, true)) return root;
  record.start = undefined;
  record.end = undefined;
  delete root.dataset.start;
  delete root.dataset.end;
  renderCalendar(root, record);
  rangeStatus(root, "Date range cleared.");
  emitRange(root, "change", detail);
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

function wireCalendar(root: HTMLElement): () => void {
  const click = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    if (!(target instanceof HTMLButtonElement)) return;
    if (target.dataset.part === "previous") {
      requestView(root, addMonths((calendarRecords.get(root) ?? enhanceCalendar(root)).view, -1));
    } else if (target.dataset.part === "next") {
      requestView(root, addMonths((calendarRecords.get(root) ?? enhanceCalendar(root)).view, 1));
    } else if (target.dataset.part === "day" && target.dataset.value) {
      const record = calendarRecords.get(root) ?? enhanceCalendar(root);
      const date = parseDate(target.dataset.value);
      if (record.range) requestRangeSelection(root, date);
      else requestSelection(root, date);
    }
  };
  const keydown = (event: KeyboardEvent): void => {
    const target = event.target;
    if (!(target instanceof HTMLButtonElement) || target.dataset.part !== "day") return;
    const date = keyboardDate(root, target, event);
    if (!date) return;
    event.preventDefault();
    const direction = date < parseDate(target.dataset.value ?? "") ? -1 : 1;
    const enabled = closestEnabled(root, date, direction);
    if (!enabled) return;
    const record = calendarRecords.get(root) ?? enhanceCalendar(root);
    record.focusDate = dateIso(enabled);
    requestView(root, enabled, true);
  };
  root.addEventListener("click", click);
  root.addEventListener("keydown", keydown);
  return () => {
    root.removeEventListener("click", click);
    root.removeEventListener("keydown", keydown);
  };
}

function enhanceCalendar(root: HTMLElement): CalendarRecord {
  root.id ||= `jqs-calendar-${++calendarId}`;
  let record = calendarRecords.get(root);
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
      cleanup: () => undefined,
      end: range ? requestedEnd : undefined,
      focusDate: range ? (requestedEnd ?? requestedStart) : requestedValue,
      range,
      start: range ? requestedStart : undefined,
      value: range ? undefined : requestedValue,
      view: startOfMonth(monthDate ?? (range ? startDate : valueDate) ?? today()),
    };
    calendarRecords.set(root, record);
    record.cleanup = wireCalendar(root);
  } else {
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
  }

  renderCalendar(root, record);
  if (range) {
    if (record.start && record.end) {
      rangeStatus(
        root,
        `Range selected, ${dayFormatter.format(parseDate(record.start))} through ${dayFormatter.format(parseDate(record.end))}.`,
      );
    } else if (record.start) {
      rangeStatus(
        root,
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
  const calendar = popover?.querySelector('[data-jqs="calendar"]') ?? null;
  if (!(control instanceof HTMLInputElement)) {
    throw new Error(`Date Picker #${root.id} needs a direct input[data-part="control"] child.`);
  }
  if (!(popover instanceof HTMLElement) || !popover.matches('[data-jqs="popover"]')) {
    throw new Error(`Date Picker #${root.id} needs a direct data-part="popover" Popover child.`);
  }
  if (!(calendar instanceof HTMLElement)) {
    throw new Error(`Date Picker #${root.id} needs a Calendar inside its Popover.`);
  }
  return {
    calendar,
    control,
    popover,
    value:
      popover.querySelector<HTMLElement>('[data-part="trigger"] [data-part="value"]') ?? undefined,
  };
}

function syncPicker(root: HTMLElement, value: string | undefined): void {
  const parts = pickerParts(root);
  parts.control.readOnly = true;
  if (parts.control.value !== (value ?? "")) parts.control.value = value ?? "";
  if (parts.calendar.dataset.value !== (value ?? "")) parts.calendar.dataset.value = value ?? "";
  const label = value ? dayFormatter.format(parseDate(value)) : "Choose date";
  if (parts.value && parts.value.textContent !== (value || "Choose date")) {
    parts.value.textContent = value || "Choose date";
  }
  const trigger = directPart(parts.popover, "trigger");
  if (trigger) trigger.setAttribute("aria-label", label);
}

function openPicker(root: HTMLElement, popovers: StarPopoverStatic): HTMLElement {
  const parts = pickerParts(root);
  const date = parts.control.value ? parseDate(parts.control.value) : today();
  enhanceCalendar(parts.calendar);
  requestView(parts.calendar, date);
  popovers.open(parts.popover);
  queueMicrotask(() => {
    parts.calendar
      .querySelector<HTMLButtonElement>(`[data-part="day"][data-value="${dateIso(date)}"]`)
      ?.focus();
  });
  return root;
}

function wirePicker(root: HTMLElement, popovers: StarPopoverStatic): () => void {
  const parts = pickerParts(root);
  const calendarChange = (event: Event): void => {
    const detail = (event as CustomEvent<CalendarEventDetail>).detail;
    syncPicker(root, detail.value);
    parts.control.dispatchEvent(new Event("input", { bubbles: true }));
    parts.control.dispatchEvent(new Event("change", { bubbles: true }));
    root.dispatchEvent(
      new CustomEvent("jquery-star:date-picker:change", {
        bubbles: true,
        detail: { datePicker: root, previousValue: detail.previousValue, value: detail.value },
      }),
    );
    popovers.close(parts.popover);
    if (parts.popover.dataset.state === "closed") {
      directPart(parts.popover, "trigger")?.focus();
    }
  };
  const controlClick = (): void => {
    openPicker(root, popovers);
  };
  const controlKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    openPicker(root, popovers);
  };
  const triggerClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    const trigger = directPart(parts.popover, "trigger");
    if (target !== trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (parts.popover.dataset.state === "open") popovers.close(parts.popover);
    else openPicker(root, popovers);
  };
  parts.calendar.addEventListener("jquery-star:calendar:change", calendarChange);
  parts.control.addEventListener("click", controlClick);
  parts.control.addEventListener("keydown", controlKeydown);
  root.addEventListener("click", triggerClick, true);
  return () => {
    parts.calendar.removeEventListener("jquery-star:calendar:change", calendarChange);
    parts.control.removeEventListener("click", controlClick);
    parts.control.removeEventListener("keydown", controlKeydown);
    root.removeEventListener("click", triggerClick, true);
  };
}

function enhancePicker(root: HTMLElement, popovers: StarPopoverStatic): DatePickerRecord {
  root.id ||= `jqs-date-picker-${++pickerId}`;
  const parts = pickerParts(root);
  const content = directPart(parts.popover, "content");
  if (content && !content.hasAttribute("aria-label") && !content.hasAttribute("aria-labelledby")) {
    const fieldLabel = parts.control.labels?.[0]?.textContent?.trim();
    const controlLabel = parts.control.getAttribute("aria-label")?.trim();
    content.setAttribute("aria-label", `${fieldLabel || controlLabel || "Choose date"} calendar`);
  }
  enhanceCalendar(parts.calendar);
  let record = pickerRecords.get(root);
  if (!record) {
    record = { cleanup: wirePicker(root, popovers) };
    pickerRecords.set(root, record);
  }
  syncPicker(root, parts.control.value || parts.calendar.dataset.value || undefined);
  return record;
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
  const calendar = popover?.querySelector('[data-jqs="range-calendar"]') ?? null;
  if (!(startControl instanceof HTMLInputElement)) {
    throw new Error(
      `Date Range Picker #${root.id} needs a direct input[data-part="start-control"] child.`,
    );
  }
  if (!(endControl instanceof HTMLInputElement)) {
    throw new Error(
      `Date Range Picker #${root.id} needs a direct input[data-part="end-control"] child.`,
    );
  }
  if (!(popover instanceof HTMLElement) || !popover.matches('[data-jqs="popover"]')) {
    throw new Error(
      `Date Range Picker #${root.id} needs a direct data-part="popover" Popover child.`,
    );
  }
  if (!(calendar instanceof HTMLElement)) {
    throw new Error(`Date Range Picker #${root.id} needs a Range Calendar inside its Popover.`);
  }
  return {
    calendar,
    endControl,
    popover,
    startControl,
    value:
      popover.querySelector<HTMLElement>('[data-part="trigger"] [data-part="value"]') ?? undefined,
  };
}

function rangePickerLabel(start: string | undefined, end: string | undefined): string {
  if (start && end) {
    return `${dayFormatter.format(parseDate(start))} through ${dayFormatter.format(parseDate(end))}`;
  }
  if (start) return `${dayFormatter.format(parseDate(start))}, choose an end date`;
  return "Choose date range";
}

function syncRangePicker(
  root: HTMLElement,
  start: string | undefined,
  end: string | undefined,
): void {
  const parts = rangePickerParts(root);
  parts.startControl.readOnly = true;
  parts.endControl.readOnly = true;
  if (parts.startControl.value !== (start ?? "")) parts.startControl.value = start ?? "";
  if (parts.endControl.value !== (end ?? "")) parts.endControl.value = end ?? "";
  if (parts.calendar.dataset.start !== (start ?? "")) {
    if (start) parts.calendar.dataset.start = start;
    else delete parts.calendar.dataset.start;
  }
  if (parts.calendar.dataset.end !== (end ?? "")) {
    if (end) parts.calendar.dataset.end = end;
    else delete parts.calendar.dataset.end;
  }
  enhanceCalendar(parts.calendar);
  const visible = start ? `${start}${end ? ` – ${end}` : " – …"}` : "Choose dates";
  if (parts.value && parts.value.textContent !== visible) parts.value.textContent = visible;
  const trigger = directPart(parts.popover, "trigger");
  if (trigger) trigger.setAttribute("aria-label", rangePickerLabel(start, end));
}

function openRangePicker(root: HTMLElement, popovers: StarPopoverStatic): HTMLElement {
  const parts = rangePickerParts(root);
  const record = calendarRecords.get(parts.calendar) ?? enhanceCalendar(parts.calendar);
  const focusDate = record.end ?? record.start ?? dateIso(today());
  requestView(parts.calendar, parseDate(focusDate));
  popovers.open(parts.popover);
  queueMicrotask(() => {
    parts.calendar
      .querySelector<HTMLButtonElement>(`[data-part="day"][data-value="${focusDate}"]`)
      ?.focus();
  });
  return root;
}

function dispatchControlChange(control: HTMLInputElement): void {
  control.dispatchEvent(new Event("input", { bubbles: true }));
  control.dispatchEvent(new Event("change", { bubbles: true }));
}

function wireRangePicker(root: HTMLElement, popovers: StarPopoverStatic): () => void {
  const parts = rangePickerParts(root);
  const calendarChange = (event: Event): void => {
    const detail = (event as CustomEvent<RangeCalendarEventDetail>).detail;
    const previousStart = parts.startControl.value;
    const previousEnd = parts.endControl.value;
    syncRangePicker(root, detail.start, detail.end);
    if (previousStart !== parts.startControl.value) dispatchControlChange(parts.startControl);
    if (previousEnd !== parts.endControl.value) dispatchControlChange(parts.endControl);
    root.dispatchEvent(
      new CustomEvent("jquery-star:date-range-picker:change", {
        bubbles: true,
        detail: {
          complete: detail.complete,
          dateRangePicker: root,
          end: detail.end,
          previousEnd,
          previousStart,
          start: detail.start,
        },
      }),
    );
    if (!detail.complete) return;
    popovers.close(parts.popover);
    if (parts.popover.dataset.state === "closed") directPart(parts.popover, "trigger")?.focus();
  };
  const controlClick = (): void => {
    openRangePicker(root, popovers);
  };
  const controlKeydown = (event: KeyboardEvent): void => {
    if (event.key !== "ArrowDown") return;
    event.preventDefault();
    openRangePicker(root, popovers);
  };
  const triggerClick = (event: MouseEvent): void => {
    const target = event.target instanceof Element ? event.target.closest("button") : null;
    const trigger = directPart(parts.popover, "trigger");
    if (target !== trigger) return;
    event.preventDefault();
    event.stopPropagation();
    if (parts.popover.dataset.state === "open") popovers.close(parts.popover);
    else openRangePicker(root, popovers);
  };
  parts.calendar.addEventListener("jquery-star:range-calendar:change", calendarChange);
  for (const control of [parts.startControl, parts.endControl]) {
    control.addEventListener("click", controlClick);
    control.addEventListener("keydown", controlKeydown);
  }
  root.addEventListener("click", triggerClick, true);
  return () => {
    parts.calendar.removeEventListener("jquery-star:range-calendar:change", calendarChange);
    for (const control of [parts.startControl, parts.endControl]) {
      control.removeEventListener("click", controlClick);
      control.removeEventListener("keydown", controlKeydown);
    }
    root.removeEventListener("click", triggerClick, true);
  };
}

function enhanceRangePicker(root: HTMLElement, popovers: StarPopoverStatic): DatePickerRecord {
  root.id ||= `jqs-date-range-picker-${++rangePickerId}`;
  const parts = rangePickerParts(root);
  const content = directPart(parts.popover, "content");
  if (content && !content.hasAttribute("aria-label") && !content.hasAttribute("aria-labelledby")) {
    const fieldLabel = parts.startControl.labels?.[0]?.textContent?.trim();
    content.setAttribute("aria-label", `${fieldLabel || "Choose dates"} calendar`);
  }
  syncRangePicker(
    root,
    parts.startControl.value || parts.calendar.dataset.start || undefined,
    parts.endControl.value || parts.calendar.dataset.end || undefined,
  );
  let record = rangePickerRecords.get(root);
  if (!record) {
    record = { cleanup: wireRangePicker(root, popovers) };
    rangePickerRecords.set(root, record);
  }
  return record;
}

function controlledCalendar(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="calendar"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveCalendar(target, context.root);
  const closest = context.element?.closest('[data-jqs="calendar"]') ?? null;
  return resolveCalendar(closest instanceof HTMLElement ? closest : String(target));
}

function controlledRangeCalendar(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="range-calendar"]')) return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveRangeCalendar(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="range-calendar"]') ?? null;
  return resolveRangeCalendar(closest instanceof HTMLElement ? closest : String(target));
}

function controlledPicker(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="date-picker"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolvePicker(target, context.root);
  const closest = context.element?.closest('[data-jqs="date-picker"]') ?? null;
  return resolvePicker(closest instanceof HTMLElement ? closest : String(target));
}

function controlledRangePicker(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="date-range-picker"]'))
    return target;
  if (typeof target === "string" && target.startsWith("#")) {
    return resolveRangePicker(target, context.root);
  }
  const closest = context.element?.closest('[data-jqs="date-range-picker"]') ?? null;
  return resolveRangePicker(closest instanceof HTMLElement ? closest : String(target));
}

export function createCalendars(popovers: StarPopoverStatic): CalendarCollection {
  const calendar: StarCalendarStatic = {
    select: (target, date) => requestSelection(resolveCalendar(target), parseDate(date)),
    month: (target, date) => requestView(resolveCalendar(target), parseDate(date)),
    next: (target) => {
      const root = resolveCalendar(target);
      const record = calendarRecords.get(root) ?? enhanceCalendar(root);
      return requestView(root, addMonths(record.view, 1));
    },
    previous: (target) => {
      const root = resolveCalendar(target);
      const record = calendarRecords.get(root) ?? enhanceCalendar(root);
      return requestView(root, addMonths(record.view, -1));
    },
    value: (target) => {
      const root = resolveCalendar(target);
      return (calendarRecords.get(root) ?? enhanceCalendar(root)).value;
    },
  };
  const rangeCalendar: StarRangeCalendarStatic = {
    select: (target, start, end) =>
      requestRangeSelection(
        resolveRangeCalendar(target),
        parseDate(start),
        end === undefined ? undefined : parseDate(end),
      ),
    clear: (target) => clearRange(resolveRangeCalendar(target)),
    month: (target, date) => requestView(resolveRangeCalendar(target), parseDate(date)),
    next: (target) => {
      const root = resolveRangeCalendar(target);
      const record = calendarRecords.get(root) ?? enhanceCalendar(root);
      return requestView(root, addMonths(record.view, 1));
    },
    previous: (target) => {
      const root = resolveRangeCalendar(target);
      const record = calendarRecords.get(root) ?? enhanceCalendar(root);
      return requestView(root, addMonths(record.view, -1));
    },
    value: (target) => {
      const root = resolveRangeCalendar(target);
      return rangeValue(calendarRecords.get(root) ?? enhanceCalendar(root));
    },
  };
  const datePicker: StarDatePickerStatic = {
    open: (target) => openPicker(resolvePicker(target), popovers),
    close: (target) => {
      const root = resolvePicker(target);
      popovers.close(pickerParts(root).popover);
      return root;
    },
    select: (target, date) => {
      const root = resolvePicker(target);
      enhancePicker(root, popovers);
      requestSelection(pickerParts(root).calendar, parseDate(date));
      return root;
    },
    value: (target) => pickerParts(resolvePicker(target)).control.value || undefined,
  };
  const dateRangePicker: StarDateRangePickerStatic = {
    open: (target) => openRangePicker(resolveRangePicker(target), popovers),
    close: (target) => {
      const root = resolveRangePicker(target);
      popovers.close(rangePickerParts(root).popover);
      return root;
    },
    select: (target, start, end) => {
      const root = resolveRangePicker(target);
      enhanceRangePicker(root, popovers);
      requestRangeSelection(
        rangePickerParts(root).calendar,
        parseDate(start),
        end === undefined ? undefined : parseDate(end),
      );
      return root;
    },
    clear: (target) => {
      const root = resolveRangePicker(target);
      enhanceRangePicker(root, popovers);
      clearRange(rangePickerParts(root).calendar);
      return root;
    },
    value: (target) => {
      const parts = rangePickerParts(resolveRangePicker(target));
      return {
        ...(parts.startControl.value ? { start: parts.startControl.value } : {}),
        ...(parts.endControl.value ? { end: parts.endControl.value } : {}),
      };
    },
  };

  registerAction("ui.calendar.select", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const root = controlledCalendar(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && !(value instanceof Date)) {
      throw new Error("ui.calendar.select needs an ISO date.");
    }
    return calendar.select(root, value);
  });
  for (const operation of ["next", "previous"] as const) {
    registerAction(`ui.calendar.${operation}`, (context) =>
      calendar[operation](controlledCalendar(context, context.args?.[0])),
    );
  }
  registerAction("ui.range-calendar.select", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const root = controlledRangeCalendar(context, explicit ? first : undefined);
    const start = explicit ? context.args?.[1] : first;
    const end = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof start !== "string" && !(start instanceof Date)) {
      throw new Error("ui.range-calendar.select needs an ISO start date.");
    }
    if (end !== undefined && typeof end !== "string" && !(end instanceof Date)) {
      throw new Error("ui.range-calendar.select end must be an ISO date.");
    }
    return rangeCalendar.select(root, start, end);
  });
  registerAction("ui.range-calendar.clear", (context) =>
    rangeCalendar.clear(controlledRangeCalendar(context, context.args?.[0])),
  );
  for (const operation of ["next", "previous"] as const) {
    registerAction(`ui.range-calendar.${operation}`, (context) =>
      rangeCalendar[operation](controlledRangeCalendar(context, context.args?.[0])),
    );
  }
  registerAction("ui.date-picker.open", (context) =>
    datePicker.open(controlledPicker(context, context.args?.[0])),
  );
  registerAction("ui.date-picker.close", (context) =>
    datePicker.close(controlledPicker(context, context.args?.[0])),
  );
  registerAction("ui.date-picker.select", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const root = controlledPicker(context, explicit ? first : undefined);
    const value = explicit ? context.args?.[1] : first;
    if (typeof value !== "string" && !(value instanceof Date)) {
      throw new Error("ui.date-picker.select needs an ISO date.");
    }
    return datePicker.select(root, value);
  });
  registerAction("ui.date-range-picker.open", (context) =>
    dateRangePicker.open(controlledRangePicker(context, context.args?.[0])),
  );
  registerAction("ui.date-range-picker.close", (context) =>
    dateRangePicker.close(controlledRangePicker(context, context.args?.[0])),
  );
  registerAction("ui.date-range-picker.clear", (context) =>
    dateRangePicker.clear(controlledRangePicker(context, context.args?.[0])),
  );
  registerAction("ui.date-range-picker.select", (context) => {
    const first = context.args?.[0];
    const explicit = typeof first === "string" && first.startsWith("#");
    const root = controlledRangePicker(context, explicit ? first : undefined);
    const start = explicit ? context.args?.[1] : first;
    const end = explicit ? context.args?.[2] : context.args?.[1];
    if (typeof start !== "string" && !(start instanceof Date)) {
      throw new Error("ui.date-range-picker.select needs an ISO start date.");
    }
    if (end !== undefined && typeof end !== "string" && !(end instanceof Date)) {
      throw new Error("ui.date-range-picker.select end must be an ISO date.");
    }
    return dateRangePicker.select(root, start, end);
  });

  const enhance = (root: ParentNode): void => {
    const calendars: Element[] = root instanceof Element ? [root] : [];
    calendars.push(...Array.from(root.querySelectorAll('[data-jqs="calendar"]')));
    for (const element of calendars) {
      const calendarElement = calendarRoot(element);
      if (calendarElement) enhanceCalendar(calendarElement);
    }

    const rangeCalendars: Element[] = root instanceof Element ? [root] : [];
    rangeCalendars.push(...Array.from(root.querySelectorAll('[data-jqs="range-calendar"]')));
    for (const element of rangeCalendars) {
      const calendarElement = rangeCalendarRoot(element);
      if (calendarElement) enhanceCalendar(calendarElement);
    }

    const pickers: Element[] = root instanceof Element ? [root] : [];
    pickers.push(...Array.from(root.querySelectorAll('[data-jqs="date-picker"]')));
    for (const element of pickers) {
      const picker = pickerRoot(element);
      if (picker) enhancePicker(picker, popovers);
    }

    const rangePickers: Element[] = root instanceof Element ? [root] : [];
    rangePickers.push(...Array.from(root.querySelectorAll('[data-jqs="date-range-picker"]')));
    for (const element of rangePickers) {
      const picker = rangePickerRoot(element);
      if (picker) enhanceRangePicker(picker, popovers);
    }
  };

  return { calendar, datePicker, dateRangePicker, enhance, rangeCalendar };
}

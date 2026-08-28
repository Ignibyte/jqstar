import { registerAction } from "../registry";
import type {
  CalendarTarget,
  DatePickerTarget,
  StarCalendarStatic,
  StarContext,
  StarDatePickerStatic,
  StarPopoverStatic,
} from "../types";

interface CalendarRecord {
  cleanup: () => void;
  focusDate: string | undefined;
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

interface CalendarCollection {
  calendar: StarCalendarStatic;
  datePicker: StarDatePickerStatic;
  enhance(root: ParentNode): void;
}

const calendarRecords = new WeakMap<HTMLElement, CalendarRecord>();
const pickerRecords = new WeakMap<HTMLElement, DatePickerRecord>();
let calendarId = 0;
let pickerId = 0;

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

function pickerRoot(value: Element | null): HTMLElement | undefined {
  return value instanceof HTMLElement && value.matches('[data-jqs="date-picker"]')
    ? value
    : undefined;
}

function resolveCalendar(target: CalendarTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? calendarRoot(root.querySelector(target)) : calendarRoot(target);
  if (resolved) return resolved;
  throw new Error(`Calendar target did not match data-jqs="calendar": ${String(target)}`);
}

function resolvePicker(target: DatePickerTarget, root: ParentNode = document): HTMLElement {
  const resolved =
    typeof target === "string" ? pickerRoot(root.querySelector(target)) : pickerRoot(target);
  if (resolved) return resolved;
  throw new Error(`Date Picker target did not match data-jqs="date-picker": ${String(target)}`);
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
    record.value ?? "",
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
  button.setAttribute("aria-label", dayFormatter.format(date));
  button.dataset.state = record.value === value ? "selected" : "unselected";
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
      cell.setAttribute("aria-selected", String(record.value === dateIso(date)));
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
    emit(root, "view-change", { calendar: root, date: monthIso(record.view) });
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
      requestSelection(root, parseDate(target.dataset.value));
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
  const requestedValue = root.dataset.value?.trim();
  const requestedMonth = root.dataset.month?.trim();
  const valueDate = requestedValue ? parseDate(requestedValue, "data-value") : undefined;
  const monthDate = requestedMonth ? parseDate(`${requestedMonth}-01`, "data-month") : undefined;

  if (!record) {
    record = {
      cleanup: () => undefined,
      focusDate: requestedValue,
      value: requestedValue,
      view: startOfMonth(monthDate ?? valueDate ?? today()),
    };
    calendarRecords.set(root, record);
    record.cleanup = wireCalendar(root);
  } else {
    if (requestedValue !== record.value) {
      record.value = requestedValue || undefined;
      record.focusDate = requestedValue || record.focusDate;
    }
    if (monthDate && monthIso(monthDate) !== monthIso(record.view)) record.view = monthDate;
  }

  renderCalendar(root, record);
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

function controlledCalendar(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="calendar"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolveCalendar(target, context.root);
  const closest = context.element?.closest('[data-jqs="calendar"]') ?? null;
  return resolveCalendar(closest instanceof HTMLElement ? closest : String(target));
}

function controlledPicker(context: StarContext, target?: unknown): HTMLElement {
  if (target instanceof HTMLElement && target.matches('[data-jqs="date-picker"]')) return target;
  if (typeof target === "string" && target.startsWith("#"))
    return resolvePicker(target, context.root);
  const closest = context.element?.closest('[data-jqs="date-picker"]') ?? null;
  return resolvePicker(closest instanceof HTMLElement ? closest : String(target));
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

  const enhance = (root: ParentNode): void => {
    const calendars: Element[] = root instanceof Element ? [root] : [];
    calendars.push(...Array.from(root.querySelectorAll('[data-jqs="calendar"]')));
    for (const element of calendars) {
      const calendarElement = calendarRoot(element);
      if (calendarElement) enhanceCalendar(calendarElement);
    }

    const pickers: Element[] = root instanceof Element ? [root] : [];
    pickers.push(...Array.from(root.querySelectorAll('[data-jqs="date-picker"]')));
    for (const element of pickers) {
      const picker = pickerRoot(element);
      if (picker) enhancePicker(picker, popovers);
    }
  };

  return { calendar, datePicker, enhance };
}

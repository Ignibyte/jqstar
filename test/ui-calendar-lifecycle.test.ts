import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function find(root: ParentNode, selector: string): HTMLElement {
  const value = root.querySelector<HTMLElement>(selector);
  if (!value) throw new Error(`Missing calendar fixture: ${selector}`);
  return value;
}

function calendarMarkup(range: boolean): string {
  return `<div data-jqs="${range ? "range-calendar" : "calendar"}" data-month="2026-09"><div data-part="header"><button data-part="previous">Previous</button><h2 data-part="heading"></h2><button data-part="next">Next</button></div><div data-part="grid"></div></div>`;
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe.each([false, true])("Calendar range=%s current parts", (range) => {
  it("renders a replacement grid with a copied cache marker and preserves unchanged days", () => {
    const wrapper = document.createElement("div");
    wrapper.innerHTML = calendarMarkup(range);
    const root = find(wrapper, "[data-jqs]");
    $.star.ui.enhance(root);
    const original = find(root, '[data-part="day"]');
    $.star.ui.enhance(root);
    expect(find(root, '[data-part="day"]')).toBe(original);
    const grid = find(root, '[data-part="grid"]');
    const replacement = grid.cloneNode(false);
    grid.replaceWith(replacement);
    $.star.ui.enhance(root);
    expect(root.querySelectorAll('[data-part="day"]')).toHaveLength(42);
    expect(find(root, '[data-part="day"]')).not.toBe(original);
  });
});

describe.each([false, true])("Date Picker range=%s current parts", (range) => {
  function fixture() {
    const root = document.createElement("div");
    root.dataset.jqs = range ? "date-range-picker" : "date-picker";
    root.innerHTML = `${range ? '<input data-part="start-control" value="2026-09-02"><input data-part="end-control" value="2026-09-05">' : '<input data-part="control" value="2026-09-02">'}<div data-jqs="popover" data-part="popover"><button data-part="trigger">Choose</button><div data-part="content">${calendarMarkup(range)}</div></div>`;
    document.body.append(root);
    $.star.ui.enhance(root);
    const popover = find(root, '[data-part="popover"]');
    const calendar = find(root, `[data-jqs="${range ? "range-calendar" : "calendar"}"]`);
    const selector = `[data-part="${range ? "start-control" : "control"}"]`;
    const select = () =>
      range
        ? $.star.ui.dateRangePicker.select(root, "2026-09-10", "2026-09-12")
        : $.star.ui.datePicker.select(root, "2026-09-10");
    const open = () =>
      range ? $.star.ui.dateRangePicker.open(root) : $.star.ui.datePicker.open(root);
    const close = () =>
      range ? $.star.ui.dateRangePicker.close(root) : $.star.ui.datePicker.close(root);
    return { root, popover, calendar, selector, select, open, close };
  }

  it.each(["click", "ArrowDown"])(
    "binds the replacement control for %s and public selection",
    async (action) => {
      const { root, popover, selector, select, close } = fixture();
      const old = find(root, selector) as HTMLInputElement;
      const current = old.cloneNode(true) as HTMLInputElement;
      old.replaceWith(current);
      $.star.ui.enhance(root);
      $.star.ui.enhance(root);
      const oldInput = vi.fn();
      const input = vi.fn();
      old.addEventListener("input", oldInput);
      current.addEventListener("input", input);
      if (action === "click") current.click();
      else current.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
      expect(popover.dataset.state).toBe("open");
      await $.star.whenEnhanced();
      select();
      expect(current.value).toBe("2026-09-10");
      expect(input).toHaveBeenCalledOnce();
      expect(oldInput).not.toHaveBeenCalled();
      close();
      old.click();
      expect(popover.dataset.state).toBe("closed");
    },
  );

  it("releases the replaced calendar's event handler", () => {
    const { root, calendar, selector, select } = fixture();
    const replacement = calendar.cloneNode(true);
    calendar.replaceWith(replacement);
    $.star.ui.enhance(root);
    const input = vi.fn();
    find(root, selector).addEventListener("input", input);
    if (range) $.star.ui.rangeCalendar.select(calendar, "2026-09-20", "2026-09-22");
    else $.star.ui.calendar.select(calendar, "2026-09-20");
    expect(input).not.toHaveBeenCalled();
    select();
    expect(input).toHaveBeenCalledOnce();
    expect((find(root, selector) as HTMLInputElement).value).toBe("2026-09-10");
  });

  it.each(["closed", "replaced", "control-replaced", "popover-replaced"])(
    "does not run delayed focus on a %s calendar",
    async (mode) => {
      const { root, calendar, popover, selector, open, close } = fixture();
      const focused = vi.fn();
      open();
      for (const day of calendar.querySelectorAll<HTMLButtonElement>('[data-part="day"]'))
        vi.spyOn(day, "focus").mockImplementation(focused);
      if (mode === "closed") close();
      else {
        if (mode === "control-replaced") {
          const control = find(root, selector);
          control.replaceWith(control.cloneNode(true));
        } else if (mode === "popover-replaced") {
          const replacement = popover.cloneNode(true) as HTMLElement;
          find(replacement, `[data-jqs="${range ? "range-calendar" : "calendar"}"]`).replaceWith(
            calendar,
          );
          popover.replaceWith(replacement);
          replacement.dataset.state = "closed";
        } else calendar.replaceWith(calendar.cloneNode(true));
        $.star.ui.enhance(root);
      }
      await Promise.resolve();
      expect(focused).not.toHaveBeenCalled();
      close();
    },
  );
});

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function calendar(selector = "#calendar"): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

function day(value: string, selector = "#calendar"): HTMLButtonElement {
  return calendar(selector).querySelector<HTMLButtonElement>(
    `[data-part="day"][data-value="${value}"]`,
  )!;
}

describe("jQuery Star Calendar and Date Picker", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.calendar.select('#calendar', '2026-08-29')">
          Select externally
        </button>
        <div
          id="calendar"
          data-jqs="calendar"
          data-month="2026-08"
          data-value="2026-08-28"
          data-min="2026-08-05"
          data-max="2026-09-20"
          data-disabled-dates="2026-08-30"
          data-week-start="1"
        >
          <div data-part="header">
            <button data-part="previous" aria-label="Previous month">Previous</button>
            <h2 data-part="heading"></h2>
            <button data-part="next" aria-label="Next month">Next</button>
          </div>
          <div data-part="grid"></div>
        </div>

        <label for="date-control">Due date</label>
        <div id="picker" data-jqs="date-picker">
          <input id="date-control" data-part="control" name="dueDate" value="2026-08-28">
          <div id="picker-popover" data-jqs="popover" data-part="popover">
            <button data-part="trigger"><span data-part="value"></span></button>
            <div data-part="content">
              <div id="picker-calendar" data-jqs="calendar" data-month="2026-08">
                <div data-part="header">
                  <button data-part="previous" aria-label="Previous month">Previous</button>
                  <h2 data-part="heading"></h2>
                  <button data-part="next" aria-label="Next month">Next</button>
                </div>
                <div data-part="grid"></div>
              </div>
            </div>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("renders a labelled grid with one roving tab stop and date state", () => {
    const grid = calendar().querySelector<HTMLElement>('[data-part="grid"]')!;
    const buttons = Array.from(calendar().querySelectorAll<HTMLButtonElement>('[data-part="day"]'));
    expect(grid.getAttribute("role")).toBe("grid");
    expect(grid.getAttribute("aria-label")).toContain("2026");
    expect(buttons).toHaveLength(42);
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
    expect(day("2026-08-28").closest('[role="gridcell"]')?.getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(day("2026-08-04").disabled).toBe(true);
    expect(day("2026-08-30").disabled).toBe(true);
    expect(calendar().querySelector('[role="columnheader"]')?.getAttribute("aria-label")).toBe(
      "Monday",
    );
  });

  it("supports cancelable selection, named actions, API value, and server-patched state", () => {
    const changed = vi.fn();
    calendar().addEventListener("jquery-star:calendar:change", changed);
    day("2026-08-29").focus();
    day("2026-08-29").click();
    expect($.star.ui.calendar.value(calendar())).toBe("2026-08-29");
    expect(calendar().dataset.value).toBe("2026-08-29");
    expect(changed).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(day("2026-08-29"));

    calendar().addEventListener("jquery-star:calendar:before-change", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      if (detail.value === "2026-09-01") event.preventDefault();
    });
    $.star.ui.calendar.select(calendar(), "2026-09-01");
    expect($.star.ui.calendar.value(calendar())).toBe("2026-08-29");

    $("#external").trigger("click");
    expect($.star.ui.calendar.value(calendar())).toBe("2026-08-29");

    calendar().dataset.value = "2026-09-02";
    calendar().dataset.month = "2026-09";
    $.star.ui.enhance(calendar());
    expect($.star.ui.calendar.value(calendar())).toBe("2026-09-02");
    expect(day("2026-09-02").closest('[role="gridcell"]')?.getAttribute("aria-selected")).toBe(
      "true",
    );
  });

  it("moves focus by day, week, week edge, and month while skipping disabled dates", () => {
    const selected = day("2026-08-28");
    selected.focus();
    selected.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect(document.activeElement).toBe(day("2026-08-29"));

    day("2026-08-29").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    expect(document.activeElement).toBe(day("2026-08-31"));

    day("2026-08-31").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }),
    );
    expect(document.activeElement).toBe(day("2026-09-07"));

    day("2026-09-07").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect(document.activeElement).toBe(day("2026-09-07"));

    day("2026-09-07").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "PageUp" }));
    expect(calendar().dataset.month).toBe("2026-08");
    expect(document.activeElement).toBe(day("2026-08-07"));
  });

  it("composes Date Picker from the native field, Popover, and Calendar", async () => {
    const picker = document.querySelector<HTMLElement>("#picker")!;
    const control = document.querySelector<HTMLInputElement>("#date-control")!;
    const popover = document.querySelector<HTMLElement>("#picker-popover")!;
    const trigger = popover.querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
    expect(control.readOnly).toBe(true);
    expect(trigger.getAttribute("aria-label")).toContain("2026");

    $.star.ui.datePicker.open(picker);
    await Promise.resolve();
    expect(popover.dataset.state).toBe("open");
    expect(document.activeElement).toBe(day("2026-08-28", "#picker-calendar"));

    day("2026-08-31", "#picker-calendar").click();
    expect(control.value).toBe("2026-08-31");
    expect($.star.ui.datePicker.value(picker)).toBe("2026-08-31");
    expect(popover.dataset.state).toBe("closed");
    expect(document.activeElement).toBe(trigger);
  });
});

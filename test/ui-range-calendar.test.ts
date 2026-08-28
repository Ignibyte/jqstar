import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function rangeCalendar(selector = "#range-calendar"): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

function rangeDay(value: string, selector = "#range-calendar"): HTMLButtonElement {
  return rangeCalendar(selector).querySelector<HTMLButtonElement>(
    `[data-part="day"][data-value="${value}"]`,
  )!;
}

describe("jQuery Star Range Calendar and Date Range Picker", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="clear-range" data-on:click="@ui.range-calendar.clear('#range-calendar')">
          Clear range
        </button>
        <div
          id="range-calendar"
          data-jqs="range-calendar"
          data-month="2026-08"
          data-start="2026-08-20"
          data-end="2026-08-22"
          data-disabled-dates="2026-08-30"
          data-week-start="1"
        >
          <div data-part="header">
            <button data-part="previous" aria-label="Previous month">Previous</button>
            <h2 data-part="heading"></h2>
            <button data-part="next" aria-label="Next month">Next</button>
          </div>
          <div data-part="grid"></div>
          <p data-part="status"></p>
        </div>

        <label for="trip-start">Trip dates</label>
        <div id="range-picker" data-jqs="date-range-picker">
          <input id="trip-start" data-part="start-control" name="start" value="2026-08-24">
          <input data-part="end-control" name="end" value="2026-08-26" aria-label="Trip end">
          <div id="range-popover" data-jqs="popover" data-part="popover">
            <button data-part="trigger"><span data-part="value"></span></button>
            <div data-part="content">
              <div id="picker-range-calendar" data-jqs="range-calendar" data-month="2026-08">
                <div data-part="header">
                  <button data-part="previous" aria-label="Previous month">Previous</button>
                  <h2 data-part="heading"></h2>
                  <button data-part="next" aria-label="Next month">Next</button>
                </div>
                <div data-part="grid"></div>
                <p data-part="status"></p>
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

  it("renders an announced range with one roving tab stop", () => {
    const buttons = Array.from(
      rangeCalendar().querySelectorAll<HTMLButtonElement>('[data-part="day"]'),
    );
    expect(buttons).toHaveLength(42);
    expect(buttons.filter((button) => button.tabIndex === 0)).toHaveLength(1);
    expect(rangeDay("2026-08-20").dataset.state).toBe("range-start");
    expect(rangeDay("2026-08-21").dataset.state).toBe("in-range");
    expect(rangeDay("2026-08-22").dataset.state).toBe("range-end");
    expect(rangeDay("2026-08-21").closest('[role="gridcell"]')?.getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(rangeDay("2026-08-20").getAttribute("aria-label")).toContain("start of selected range");
    expect(rangeCalendar().querySelector('[data-part="status"]')?.textContent).toContain(
      "Range selected",
    );
  });

  it("builds, normalizes, rejects unavailable, clears, and accepts server-patched ranges", () => {
    const changed = vi.fn();
    const invalid = vi.fn();
    rangeCalendar().addEventListener("jquery-star:range-calendar:change", changed);
    rangeCalendar().addEventListener("jquery-star:range-calendar:invalid-range", invalid);

    rangeDay("2026-08-28").click();
    expect($.star.ui.rangeCalendar.value(rangeCalendar())).toEqual({ start: "2026-08-28" });
    expect(rangeDay("2026-08-28").getAttribute("aria-label")).toContain("choose an end date");

    rangeDay("2026-08-31").click();
    expect(invalid).toHaveBeenCalledOnce();
    expect($.star.ui.rangeCalendar.value(rangeCalendar())).toEqual({ start: "2026-08-28" });

    rangeDay("2026-08-29").click();
    expect($.star.ui.rangeCalendar.value(rangeCalendar())).toEqual({
      start: "2026-08-28",
      end: "2026-08-29",
    });

    $.star.ui.rangeCalendar.select(rangeCalendar(), "2026-08-27", "2026-08-25");
    expect($.star.ui.rangeCalendar.value(rangeCalendar())).toEqual({
      start: "2026-08-25",
      end: "2026-08-27",
    });
    expect(changed).toHaveBeenCalledTimes(3);

    $("#clear-range").trigger("click");
    expect($.star.ui.rangeCalendar.value(rangeCalendar())).toEqual({});

    rangeCalendar().dataset.start = "2026-09-02";
    rangeCalendar().dataset.end = "2026-09-05";
    rangeCalendar().dataset.month = "2026-09";
    $.star.ui.enhance(rangeCalendar());
    expect($.star.ui.rangeCalendar.value(rangeCalendar())).toEqual({
      start: "2026-09-02",
      end: "2026-09-05",
    });
    expect(rangeDay("2026-09-03").dataset.state).toBe("in-range");
  });

  it("keeps the established calendar keyboard model", () => {
    rangeDay("2026-08-22").focus();
    rangeDay("2026-08-22").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    expect(document.activeElement).toBe(rangeDay("2026-08-23"));

    rangeDay("2026-08-23").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "PageDown" }),
    );
    expect(rangeCalendar().dataset.month).toBe("2026-09");
    expect(document.activeElement).toBe(rangeDay("2026-09-23"));
  });

  it("keeps two native form values and closes only when the range is complete", async () => {
    const picker = document.querySelector<HTMLElement>("#range-picker")!;
    const popover = document.querySelector<HTMLElement>("#range-popover")!;
    const start = document.querySelector<HTMLInputElement>("#trip-start")!;
    const end = picker.querySelector<HTMLInputElement>('[data-part="end-control"]')!;
    const trigger = popover.querySelector<HTMLButtonElement>('[data-part="trigger"]')!;
    expect(start.readOnly).toBe(true);
    expect(end.readOnly).toBe(true);
    expect($.star.ui.dateRangePicker.value(picker)).toEqual({
      start: "2026-08-24",
      end: "2026-08-26",
    });

    $.star.ui.dateRangePicker.open(picker);
    await Promise.resolve();
    expect(popover.dataset.state).toBe("open");
    expect(document.activeElement).toBe(rangeDay("2026-08-26", "#picker-range-calendar"));

    rangeDay("2026-08-28", "#picker-range-calendar").click();
    expect(start.value).toBe("2026-08-28");
    expect(end.value).toBe("");
    expect(popover.dataset.state).toBe("open");

    rangeDay("2026-08-30", "#picker-range-calendar").click();
    expect(start.value).toBe("2026-08-28");
    expect(end.value).toBe("2026-08-30");
    expect(popover.dataset.state).toBe("closed");
    expect(document.activeElement).toBe(trigger);
  });
});

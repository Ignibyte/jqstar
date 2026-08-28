import $ from "jquery";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#retry-countdown")!;
}

describe("jQuery Star Countdown", () => {
  beforeAll(() => {
    vi.useFakeTimers();
  });

  beforeEach(() => {
    vi.setSystemTime(new Date("2026-08-28T18:30:00Z"));
    document.body.innerHTML = `
      <main id="app">
        <div id="retry-countdown" data-jqs="countdown" data-duration="5">
          <span data-part="minutes"></span>:<span data-part="seconds"></span>
          <span data-part="value"></span>
          <output data-part="status"></output>
        </div>
        <button data-on:click="@ui.countdown.pause('#retry-countdown')">Pause timer</button>
        <button data-on:click="@ui.countdown.resume('#retry-countdown')">Resume timer</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    const countdown = document.querySelector<HTMLElement>('[data-jqs="countdown"]');
    if (countdown && !$.star.ui.countdown.state(countdown).complete) {
      $.star.ui.countdown.pause(countdown);
    }
    $("#app").star("destroy");
  });

  afterAll(() => {
    vi.useRealTimers();
  });

  it("starts from authored duration and renders a timer contract", () => {
    expect($.star.ui.countdown.state(root())).toMatchObject({
      complete: false,
      paused: false,
      remaining: 5,
    });
    expect(root().querySelector('[data-part="minutes"]')?.textContent).toBe("00");
    expect(root().querySelector('[data-part="seconds"]')?.textContent).toBe("05");
    expect(root().dataset.state).toBe("running");
    expect(root().getAttribute("role")).toBe("timer");
    expect(root().getAttribute("aria-label")).toBe("5 seconds remaining");
  });

  it("uses one shared clock for multiple countdown instances", () => {
    document.body.insertAdjacentHTML(
      "beforeend",
      '<div id="second-countdown" data-jqs="countdown" data-duration="10"><span data-part="seconds"></span></div>',
    );
    const second = document.querySelector<HTMLElement>("#second-countdown")!;
    $.star.ui.enhance(second);
    expect(vi.getTimerCount()).toBe(1);
    vi.advanceTimersByTime(2_000);
    expect($.star.ui.countdown.remaining(root())).toBe(3);
    expect($.star.ui.countdown.remaining(second)).toBe(8);
  });

  it("pauses and resumes without losing the remaining duration", async () => {
    document.querySelectorAll<HTMLButtonElement>("button")[0]!.click();
    await vi.waitFor(() => expect($.star.ui.countdown.state(root()).paused).toBe(true));
    vi.advanceTimersByTime(3_000);
    expect($.star.ui.countdown.remaining(root())).toBe(5);
    document.querySelectorAll<HTMLButtonElement>("button")[1]!.click();
    await vi.waitFor(() => expect($.star.ui.countdown.state(root()).paused).toBe(false));
    vi.advanceTimersByTime(1_000);
    expect($.star.ui.countdown.remaining(root())).toBe(4);
  });

  it("accepts an absolute backend deadline and can reset to authored duration", () => {
    const start = vi.fn();
    const reset = vi.fn();
    root().addEventListener("jquery-star:countdown:start", start);
    root().addEventListener("jquery-star:countdown:reset", reset);
    $.star.ui.countdown.until(root(), "2026-08-28T18:30:12Z");
    expect($.star.ui.countdown.remaining(root())).toBe(12);
    vi.advanceTimersByTime(2_000);
    expect($.star.ui.countdown.remaining(root())).toBe(10);
    $.star.ui.countdown.reset(root());
    expect($.star.ui.countdown.remaining(root())).toBe(5);
    expect(start).toHaveBeenCalledOnce();
    expect(reset).toHaveBeenCalledOnce();
  });

  it("completes once, stops scheduling, and announces the result", () => {
    const complete = vi.fn();
    root().addEventListener("jquery-star:countdown:complete", complete);
    vi.advanceTimersByTime(5_000);
    expect($.star.ui.countdown.state(root())).toMatchObject({ complete: true, remaining: 0 });
    expect(root().dataset.state).toBe("complete");
    expect(root().querySelector('[data-part="seconds"]')?.textContent).toBe("00");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Countdown complete.");
    expect(complete).toHaveBeenCalledOnce();
    vi.advanceTimersByTime(2_000);
    expect(complete).toHaveBeenCalledOnce();
  });
});

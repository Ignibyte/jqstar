import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function tooltip(): HTMLElement {
  return document.querySelector<HTMLElement>("#tooltip")!;
}

function trigger(): HTMLButtonElement {
  return tooltip().querySelector<HTMLButtonElement>(':scope > [data-part="trigger"]')!;
}

function content(): HTMLElement {
  return tooltip().querySelector<HTMLElement>(':scope > [data-part="content"]')!;
}

describe("jQuery Star Tooltip", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.tooltip.open('#tooltip')">Explain</button>
        <div id="tooltip" data-jqs="tooltip" data-delay="20" data-close-delay="10">
          <button data-part="trigger" aria-describedby="existing-help">Hover or focus</button>
          <div data-part="content">Helpful text</div>
        </div>
        <p id="existing-help">Existing description</p>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    if (tooltip()?.dataset.state === "open") $.star.ui.tooltip.close(tooltip());
    $("#app").star("destroy");
    vi.useRealTimers();
  });

  it("adds tooltip semantics while preserving existing descriptions", () => {
    expect(content().getAttribute("role")).toBe("tooltip");
    expect(content().getAttribute("popover")).toBe("manual");
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute("aria-describedby")?.split(" ")).toEqual([
      "existing-help",
      content().id,
    ]);
    expect(tooltip().dataset.state).toBe("closed");
  });

  it("opens after hover or focus delay and remains open while the tooltip is hovered", () => {
    vi.useFakeTimers();
    trigger().dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(19);
    expect(content().hidden).toBe(true);
    vi.advanceTimersByTime(1);
    expect(content().hidden).toBe(false);
    expect(document.activeElement).not.toBe(content());

    trigger().dispatchEvent(new Event("pointerleave"));
    content().dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(10);
    expect(content().hidden).toBe(false);
    content().dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(10);
    expect(content().hidden).toBe(true);

    trigger().focus();
    vi.advanceTimersByTime(20);
    expect(content().hidden).toBe(false);
    expect(document.activeElement).toBe(trigger());
  });

  it("supports named actions, APIs, Escape, and cancelable lifecycle events", () => {
    const opened = vi.fn();
    tooltip().addEventListener("jquery-star:tooltip:open", opened);
    $("#external").trigger("click");
    expect(content().hidden).toBe(false);
    expect(opened).toHaveBeenCalledOnce();

    const preventClose = (event: Event): void => event.preventDefault();
    tooltip().addEventListener("jquery-star:tooltip:before-close", preventClose);
    $.star.ui.tooltip.close(tooltip());
    expect(content().hidden).toBe(false);
    tooltip().removeEventListener("jquery-star:tooltip:before-close", preventClose);

    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(content().hidden).toBe(true);
  });

  it("re-enhances replaced triggers and rejects interactive tooltip content", () => {
    const replacement = document.createElement("button");
    replacement.dataset.part = "trigger";
    replacement.textContent = "Replacement";
    trigger().replaceWith(replacement);
    $.star.ui.enhance(tooltip());
    expect(replacement.getAttribute("aria-describedby")).toBe(content().id);

    const invalid = document.createElement("div");
    invalid.dataset.jqs = "tooltip";
    invalid.innerHTML = `
      <button data-part="trigger">Invalid</button>
      <div data-part="content"><a href="#bad">Interactive</a></div>
    `;
    expect(() => $.star.ui.enhance(invalid)).toThrow(/cannot be interactive/);
  });
});

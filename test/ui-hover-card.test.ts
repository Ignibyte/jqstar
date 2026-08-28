import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#profile-card")!;
}

function trigger(): HTMLAnchorElement {
  return root().querySelector<HTMLAnchorElement>(':scope > [data-part="trigger"]')!;
}

function content(): HTMLElement {
  return root().querySelector<HTMLElement>(':scope > [data-part="content"]')!;
}

describe("jQuery Star Hover Card", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.hover-card.open('#profile-card')">Preview</button>
        <div id="profile-card" data-jqs="hover-card" data-delay="20" data-close-delay="10">
          <a data-part="trigger" href="#ada">Ada Lovelace</a>
          <div data-part="content">
            <h2 data-part="title">Ada Lovelace</h2>
            <p data-part="description">Mathematician</p>
            <a id="profile-link" href="#profile">View profile</a>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    if (root()?.dataset.state === "open") $.star.ui.hoverCard.close(root());
    $("#app").star("destroy");
    vi.useRealTimers();
  });

  it("connects trigger and content without flattening interactive content into a description", () => {
    expect(content().getAttribute("popover")).toBe("manual");
    expect(content().hidden).toBe(true);
    expect(trigger().getAttribute("aria-controls")).toBe(content().id);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(content().getAttribute("aria-labelledby")).toBe(
      content().querySelector('[data-part="title"]')?.id,
    );
    expect(content().hasAttribute("aria-describedby")).toBe(false);
  });

  it("opens on hover or focus and persists across pointer and keyboard entry", () => {
    vi.useFakeTimers();
    trigger().dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(20);
    expect(content().hidden).toBe(false);

    trigger().dispatchEvent(new Event("pointerleave"));
    content().dispatchEvent(new Event("pointerenter"));
    vi.advanceTimersByTime(10);
    expect(content().hidden).toBe(false);

    content().dispatchEvent(new Event("pointerleave"));
    vi.advanceTimersByTime(10);
    expect(content().hidden).toBe(true);

    trigger().focus();
    vi.advanceTimersByTime(20);
    document.querySelector<HTMLAnchorElement>("#profile-link")!.focus();
    vi.advanceTimersByTime(10);
    expect(content().hidden).toBe(false);
  });

  it("supports actions, cancelable lifecycle, Escape dismissal, and focus return", () => {
    const opened = vi.fn();
    root().addEventListener("jquery-star:hover-card:open", opened);
    $("#external").trigger("click");
    expect(content().hidden).toBe(false);
    expect(opened).toHaveBeenCalledOnce();

    const prevent = (event: Event): void => event.preventDefault();
    root().addEventListener("jquery-star:hover-card:before-close", prevent);
    $.star.ui.hoverCard.close(root());
    expect(content().hidden).toBe(false);
    root().removeEventListener("jquery-star:hover-card:before-close", prevent);

    document.querySelector<HTMLAnchorElement>("#profile-link")!.focus();
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
  });

  it("re-enhances server-replaced parts while preserving open state", () => {
    $.star.ui.hoverCard.open(root());
    const replacement = document.createElement("a");
    replacement.dataset.part = "trigger";
    replacement.href = "#grace";
    replacement.textContent = "Grace Hopper";
    trigger().replaceWith(replacement);
    $.star.ui.enhance(root());

    expect(root().dataset.state).toBe("open");
    expect(replacement.getAttribute("aria-expanded")).toBe("true");
    expect(replacement.getAttribute("aria-controls")).toBe(content().id);
  });
});

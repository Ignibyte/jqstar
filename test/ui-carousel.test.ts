import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function carousel(): HTMLElement {
  return document.querySelector<HTMLElement>("#feature-carousel")!;
}

function slide(value: string): HTMLElement {
  return carousel().querySelector<HTMLElement>(`[data-part="slide"][data-value="${value}"]`)!;
}

describe("jQuery Star Carousel", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <main id="app">
        <section
          id="feature-carousel"
          data-jqs="carousel"
          data-value="intro"
          data-loop
          aria-label="Feature tour"
        >
          <div data-part="content">
            <div data-part="slide" data-value="intro"><button type="button">Intro action</button></div>
            <div data-part="slide" data-value="details">Details</div>
            <div data-part="slide" data-value="done">Done</div>
          </div>
          <button data-part="previous">Previous</button>
          <button data-part="next">Next</button>
          <div data-part="indicators">
            <button data-part="indicator" data-value="intro">Intro</button>
            <button data-part="indicator" data-value="details">Details</button>
            <button data-part="indicator" data-value="done">Done</button>
          </div>
          <button data-part="rotation"></button>
          <span data-part="status"></span>
        </section>
        <button id="go-done" data-on:click="@ui.carousel.go('#feature-carousel', 'done')">
          Finish tour
        </button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
    vi.useRealTimers();
  });

  it("derives carousel and slide semantics from source-owned HTML", () => {
    expect(carousel().getAttribute("role")).toBe("region");
    expect(carousel().getAttribute("aria-roledescription")).toBe("carousel");
    expect(slide("intro").getAttribute("role")).toBe("group");
    expect(slide("intro").hidden).toBe(false);
    expect(slide("details").hidden).toBe(true);
    expect(carousel().querySelector('[data-part="status"]')?.textContent).toBe("Slide 1 of 3");
  });

  it("changes slides through controls, API, named actions, and keyboard", () => {
    carousel().querySelector<HTMLButtonElement>('[data-part="next"]')!.click();
    expect($.star.ui.carousel.value(carousel())).toBe("details");
    expect(slide("details").hidden).toBe(false);

    $.star.ui.carousel.previous(carousel());
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    $("#go-done").trigger("click");
    expect($.star.ui.carousel.value(carousel())).toBe("done");

    const content = carousel().querySelector<HTMLElement>('[data-part="content"]')!;
    content.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
  });

  it("honors cancelable changes and accepts server-patched values", () => {
    carousel().addEventListener("jquery-star:carousel:before-change", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      if (detail.value === "details") event.preventDefault();
    });
    $.star.ui.carousel.next(carousel());
    expect($.star.ui.carousel.value(carousel())).toBe("intro");

    carousel().dataset.value = "done";
    $.star.ui.enhance(carousel());
    expect($.star.ui.carousel.value(carousel())).toBe("done");
    expect(slide("done").hidden).toBe(false);
  });

  it("returns focus to the carousel when a focused slide becomes hidden", () => {
    slide("intro").querySelector("button")!.focus();
    $.star.ui.carousel.next(carousel());
    expect(document.activeElement).toBe(
      carousel().querySelector<HTMLElement>('[data-part="content"]'),
    );
  });

  it("rotates on a bounded timer and stays paused after user navigation", () => {
    carousel().dataset.autoplay = "1000";
    $.star.ui.enhance(carousel());
    expect(carousel().dataset.rotation).toBe("playing");
    vi.advanceTimersByTime(1000);
    expect($.star.ui.carousel.value(carousel())).toBe("details");

    $.star.ui.carousel.next(carousel());
    expect(carousel().dataset.rotation).toBe("paused");
    vi.advanceTimersByTime(3000);
    expect($.star.ui.carousel.value(carousel())).toBe("done");

    $.star.ui.carousel.play(carousel());
    vi.advanceTimersByTime(1000);
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    $.star.ui.carousel.pause(carousel());
    expect(carousel().dataset.rotation).toBe("paused");
  });
});

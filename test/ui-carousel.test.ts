import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
// cspell:ignore roledescription

function required<T extends Element>(element: T | null, selector: string): T {
  if (!element) throw new Error(`Missing Carousel fixture element: ${selector}`);
  return element;
}

function carousel(): HTMLElement {
  return required(document.querySelector<HTMLElement>("#feature-carousel"), "#feature-carousel");
}

function slide(value: string): HTMLElement {
  const selector = `[data-part="slide"][data-value="${value}"]`;
  return required(carousel().querySelector<HTMLElement>(selector), selector);
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

  it("rejects a wrong-kind element action target without advancing the nearby carousel", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Carousel application did not start.");
    const foreign = slide("intro").querySelector<HTMLButtonElement>("button");
    if (!foreign) throw new Error("Missing Carousel slide action.");
    await expect(
      app.run("ui.carousel.next", { element: foreign, args: [foreign] }),
    ).rejects.toThrow('Carousel target did not match data-jqs="carousel"');
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    await app.run("ui.carousel.next", { args: [carousel()] });
    expect($.star.ui.carousel.value(carousel())).toBe("details");
    await app.run("ui.carousel.previous", { args: ["#feature-carousel"] });
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    await app.run("ui.carousel.next", { element: foreign });
    expect($.star.ui.carousel.value(carousel())).toBe("details");
  });

  it("treats a native carousel root as an explicit go target", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Carousel application did not start.");
    await app.run("ui.carousel.go", { args: [carousel(), "done"] });
    expect($.star.ui.carousel.value(carousel())).toBe("done");
    await app.run("ui.carousel.go", { args: ["#feature-carousel", "intro"] });
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    await app.run("ui.carousel.go", { element: slide("intro"), args: ["details"] });
    expect($.star.ui.carousel.value(carousel())).toBe("details");
  });

  it("derives carousel and slide semantics from source-owned HTML", () => {
    expect(carousel().getAttribute("role")).toBe("region");
    expect(carousel().getAttribute("aria-roledescription")).toBe("carousel");
    expect(slide("intro").getAttribute("role")).toBe("group");
    expect(slide("intro").hidden).toBe(false);
    expect(slide("details").hidden).toBe(true);
    expect(carousel().querySelector('[data-part="status"]')?.textContent).toBe("Slide 1 of 3");
  });

  it("does not rewrite an unchanged selected value during enhancement", () => {
    const observer = new MutationObserver(() => {});
    observer.observe(carousel(), { attributes: true, attributeFilter: ["data-value"] });
    $.star.ui.enhance(carousel());
    $.star.ui.enhance(carousel());
    expect(observer.takeRecords()).toHaveLength(0);
    observer.disconnect();
  });

  it("keeps nested carousels and their indicators in their own roots", () => {
    slide("intro").insertAdjacentHTML(
      "beforeend",
      `<section id="nested-carousel" data-jqs="carousel" data-value="inside-a">
        <div data-part="content">
          <div data-part="slide" data-value="inside-a">Inside A</div>
          <div data-part="slide" data-value="inside-b">Inside B</div>
        </div>
        <button data-part="next">Next inside</button>
        <button data-part="indicator" data-value="inside-a">A</button>
        <button data-part="indicator" data-value="inside-b">B</button>
        <span data-part="status"></span>
      </section>`,
    );
    $.star.ui.enhance(document);
    const nested = required(
      document.querySelector<HTMLElement>("#nested-carousel"),
      "#nested-carousel",
    );

    expect(carousel().querySelector(':scope > [data-part="status"]')?.textContent).toBe(
      "Slide 1 of 3",
    );
    expect(nested.querySelector('[data-part="status"]')?.textContent).toBe("Slide 1 of 2");
    required(
      nested.querySelector<HTMLButtonElement>('[data-part="next"]'),
      '[data-part="next"]',
    ).click();
    expect($.star.ui.carousel.value(nested)).toBe("inside-b");
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    expect(
      carousel().querySelectorAll('[data-part="indicator"][aria-current="true"]'),
    ).toHaveLength(2);
    expect(
      carousel()
        .querySelector(':scope > [data-part="indicators"] [data-value="intro"]')
        ?.getAttribute("aria-current"),
    ).toBe("true");

    $.star.ui.carousel.next(carousel());
    expect($.star.ui.carousel.value(carousel())).toBe("details");
    expect($.star.ui.carousel.value(nested)).toBe("inside-b");
    expect(
      Array.from(nested.querySelectorAll<HTMLElement>('[data-part="indicator"]')).map((indicator) =>
        indicator.getAttribute("aria-current"),
      ),
    ).toEqual(["false", "true"]);

    const outerNext = required(
      carousel().querySelector<HTMLButtonElement>(':scope > [data-part="next"]'),
      ':scope > [data-part="next"]',
    );
    const outerBindings = vi.spyOn(outerNext, "addEventListener");
    required(
      nested.querySelector<HTMLElement>('[data-part="indicator"][data-value="inside-a"]'),
      '[data-part="indicator"][data-value="inside-a"]',
    ).replaceWith(document.createElement("span"));
    $.star.ui.enhance(document);
    expect(outerBindings).not.toHaveBeenCalled();
    outerBindings.mockRestore();
  });

  it("normalizes slide values and uses their position when a value is absent", () => {
    const first = slide("intro");
    const second = slide("details");
    first.dataset.value = "  intro  ";
    delete second.dataset.value;
    $.star.ui.enhance(carousel());
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    required(
      carousel().querySelector<HTMLButtonElement>('[data-part="next"]'),
      '[data-part="next"]',
    ).click();
    expect($.star.ui.carousel.value(carousel())).toBe("2");
    expect(carousel().dataset.value).toBe("2");
  });

  it("disables boundary controls when looping is off and reflects the selected indicator", () => {
    carousel().removeAttribute("data-loop");
    $.star.ui.enhance(carousel());
    const previous = required(
      carousel().querySelector<HTMLButtonElement>('[data-part="previous"]'),
      '[data-part="previous"]',
    );
    const next = required(
      carousel().querySelector<HTMLButtonElement>('[data-part="next"]'),
      '[data-part="next"]',
    );
    const indicators = Array.from(
      carousel().querySelectorAll<HTMLElement>('[data-part="indicator"]'),
    );
    expect(previous.disabled).toBe(true);
    expect(next.disabled).toBe(false);
    const previousWrites = vi.spyOn(previous, "disabled", "set");
    $.star.ui.enhance(carousel());
    $.star.ui.enhance(carousel());
    expect(previousWrites).not.toHaveBeenCalled();
    previousWrites.mockRestore();

    next.click();
    expect(previous.disabled).toBe(false);
    expect(next.disabled).toBe(false);
    expect(indicators.map((indicator) => indicator.getAttribute("aria-current"))).toEqual([
      "false",
      "true",
      "false",
    ]);

    next.click();
    expect(next.disabled).toBe(true);
    expect(carousel().querySelector('[data-part="status"]')?.textContent).toBe("Slide 3 of 3");
    expect(indicators.map((indicator) => indicator.dataset.state)).toEqual([
      "inactive",
      "inactive",
      "active",
    ]);
    previous.click();
    expect(next.disabled).toBe(false);
    expect($.star.ui.carousel.value(carousel())).toBe("details");
  });

  it("reports the previous and selected slide in cancelable change events", () => {
    const events: Array<{
      cancelable: boolean;
      detail: { index: number; previousIndex: number; previousValue: string; value: string };
      type: string;
    }> = [];
    const bubbled: string[] = [];
    for (const name of ["before-change", "change"]) {
      carousel().addEventListener(`jquery-star:carousel:${name}`, (event) => {
        const custom = event as CustomEvent<(typeof events)[number]["detail"]>;
        events.push({ cancelable: custom.cancelable, detail: custom.detail, type: custom.type });
      });
      required(document.querySelector("#app"), "#app").addEventListener(
        `jquery-star:carousel:${name}`,
        (event) => {
          bubbled.push(event.type);
        },
      );
    }
    $.star.ui.carousel.next(carousel());
    expect(events).toEqual([
      {
        type: "jquery-star:carousel:before-change",
        cancelable: true,
        detail: expect.objectContaining({
          index: 1,
          previousIndex: 0,
          previousValue: "intro",
          value: "details",
        }),
      },
      {
        type: "jquery-star:carousel:change",
        cancelable: false,
        detail: expect.objectContaining({
          index: 1,
          previousIndex: 0,
          previousValue: "intro",
          value: "details",
        }),
      },
    ]);
    expect(bubbled).toEqual(["jquery-star:carousel:before-change", "jquery-star:carousel:change"]);
  });

  it("lets the rotation control pause and resume autoplay", () => {
    carousel().dataset.autoplay = "1000";
    $.star.ui.enhance(carousel());
    const rotation = required(
      carousel().querySelector<HTMLButtonElement>('[data-part="rotation"]'),
      '[data-part="rotation"]',
    );
    expect(carousel().dataset.rotation).toBe("playing");
    rotation.click();
    expect(carousel().dataset.rotation).toBe("paused");
    expect(rotation.getAttribute("aria-label")).toBe("Start slide rotation");
    rotation.click();
    expect(carousel().dataset.rotation).toBe("playing");
    expect(rotation.getAttribute("aria-label")).toBe("Stop slide rotation");
  });

  it("rebinds replacement rotation and indicator controls after enhancement", () => {
    carousel().dataset.autoplay = "1000";
    $.star.ui.enhance(carousel());
    const previousRotation = required(
      carousel().querySelector<HTMLButtonElement>('[data-part="rotation"]'),
      '[data-part="rotation"]',
    );
    const rotation = previousRotation.cloneNode(true) as HTMLButtonElement;
    previousRotation.replaceWith(rotation);
    $.star.ui.enhance(carousel());
    rotation.click();
    expect(carousel().dataset.rotation).toBe("paused");

    const previousIndicator = required(
      carousel().querySelector<HTMLButtonElement>('[data-part="indicator"][data-value="done"]'),
      '[data-part="indicator"][data-value="done"]',
    );
    const indicator = previousIndicator.cloneNode(true) as HTMLButtonElement;
    previousIndicator.replaceWith(indicator);
    $.star.ui.enhance(carousel());
    indicator.click();
    expect($.star.ui.carousel.value(carousel())).toBe("done");
    expect(indicator.getAttribute("aria-current")).toBe("true");
  });

  it("changes slides through controls, API, named actions, and keyboard", () => {
    required(
      carousel().querySelector<HTMLButtonElement>('[data-part="next"]'),
      '[data-part="next"]',
    ).click();
    expect($.star.ui.carousel.value(carousel())).toBe("details");
    expect(slide("details").hidden).toBe(false);

    $.star.ui.carousel.previous(carousel());
    expect($.star.ui.carousel.value(carousel())).toBe("intro");
    $("#go-done").trigger("click");
    expect($.star.ui.carousel.value(carousel())).toBe("done");

    const content = required(
      carousel().querySelector<HTMLElement>('[data-part="content"]'),
      '[data-part="content"]',
    );
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
    required(slide("intro").querySelector<HTMLElement>("button"), "button").focus();
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

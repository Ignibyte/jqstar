import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#feedback-rating")!;
}

function control(value: string): HTMLInputElement {
  return root().querySelector<HTMLInputElement>(`input[value="${value}"]`)!;
}

describe("jQuery Star Rating", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <fieldset id="feedback-rating" data-jqs="rating" data-value="4">
            <legend>Support rating</legend>
            <div data-part="items">
              ${[1, 2, 3, 4, 5]
                .map(
                  (value) => `<label data-part="item">
                    <input data-part="control" type="radio" name="rating" value="${value}" data-label="${value} stars">
                    <span data-part="icon" aria-hidden="true">★</span><span>${value} stars</span>
                  </label>`,
                )
                .join("")}
            </div>
            <button data-part="clear">Clear</button>
            <output data-part="status"></output>
          </fieldset>
        </form>
        <button id="set-five" data-on:click="@ui.rating.set('#feedback-rating', '5')">Five</button>
        <button id="clear" data-on:click="@ui.rating.clear('#feedback-rating')">Clear</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("keeps one native radio as the form value", () => {
    expect(control("4").checked).toBe(true);
    expect($.star.ui.rating.value(root())).toBe("4");
    expect(new FormData(document.querySelector<HTMLFormElement>("#form")!).get("rating")).toBe("4");
    expect(control("3").closest('[data-part="item"]')?.getAttribute("data-state")).toBe("filled");
    expect(control("5").closest('[data-part="item"]')?.getAttribute("data-state")).toBe("empty");
  });

  it("changes through native radios, APIs, controls, and named actions", () => {
    control("2").click();
    expect($.star.ui.rating.value(root())).toBe("2");
    $("#set-five").trigger("click");
    expect(control("5").checked).toBe(true);
    root().querySelector<HTMLButtonElement>('[data-part="clear"]')!.click();
    expect($.star.ui.rating.value(root())).toBeUndefined();
    $("#set-five").trigger("click");
    $("#clear").trigger("click");
    expect($.star.ui.rating.value(root())).toBeUndefined();
  });

  it("honors canceled changes and accepts server-patched values", () => {
    root().addEventListener("jquery-star:rating:before-change", (event) => {
      const detail = (event as CustomEvent<{ value?: string }>).detail;
      if (detail.value === "1") event.preventDefault();
    });
    control("1").click();
    expect(control("4").checked).toBe(true);

    root().dataset.value = "3";
    $.star.ui.enhance(root());
    expect(control("3").checked).toBe(true);
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("3 stars");
  });

  it("emits ordinary form events for API changes", () => {
    const input = vi.fn();
    const change = vi.fn();
    const lifecycle = vi.fn();
    control("2").addEventListener("input", input);
    control("2").addEventListener("change", change);
    root().addEventListener("jquery-star:rating:change", lifecycle);
    $.star.ui.rating.set(root(), "2");
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledOnce();
  });
});

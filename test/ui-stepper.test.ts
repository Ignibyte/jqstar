import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#onboarding")!;
}

function panel(value: string): HTMLElement {
  return root().querySelector<HTMLElement>(`[data-part="panel"][data-value="${value}"]`)!;
}

describe("jQuery Star Stepper", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <div id="onboarding" data-jqs="stepper" data-linear data-value="profile">
          <ol data-part="list">
            <li data-part="step" data-value="profile"><button data-part="trigger">Profile</button></li>
            <li data-part="step" data-value="assets"><button data-part="trigger">Assets</button></li>
            <li data-part="step" data-value="review"><button data-part="trigger">Review</button></li>
          </ol>
          <section data-part="panel" data-value="profile"><input name="name" required></section>
          <section data-part="panel" data-value="assets">Assets</section>
          <section data-part="panel" data-value="review">Review</section>
          <button data-part="previous">Back</button>
          <button data-part="next">Continue</button>
          <p data-part="status"></p>
        </div>
        <button id="review" data-on:click="@ui.stepper.go('#onboarding', 'review')">Review</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("uses ordered step semantics and controls one visible panel", () => {
    const triggers = root().querySelectorAll<HTMLButtonElement>('[data-part="trigger"]');
    expect(triggers[0]?.getAttribute("aria-current")).toBe("step");
    expect(triggers[0]?.getAttribute("aria-controls")).toBe(panel("profile").id);
    expect(panel("profile").hidden).toBe(false);
    expect(panel("assets").hidden).toBe(true);
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Step 1 of 3: Profile");
  });

  it("validates each linear step before moving forward", () => {
    const invalid = vi.fn();
    root().addEventListener("jquery-star:stepper:invalid", invalid);
    root().querySelector<HTMLButtonElement>('[data-part="next"]')!.click();
    expect($.star.ui.stepper.value(root())).toBe("profile");
    expect(invalid).toHaveBeenCalledOnce();

    root().querySelector<HTMLInputElement>('input[name="name"]')!.value = "Ada";
    $.star.ui.stepper.next(root());
    expect($.star.ui.stepper.value(root())).toBe("assets");
    expect(root().querySelector('[data-value="profile"]')?.getAttribute("data-completed")).toBe(
      "true",
    );
  });

  it("supports named actions and server-patched values", () => {
    root().dataset.validate = "false";
    $("#review").trigger("click");
    expect($.star.ui.stepper.value(root())).toBe("profile");
    root().dataset.linear = "false";
    $("#review").trigger("click");
    expect($.star.ui.stepper.value(root())).toBe("review");

    root().dataset.value = "assets";
    $.star.ui.enhance(root());
    expect($.star.ui.stepper.value(root())).toBe("assets");
  });

  it("restores active and completed state when a transition is canceled", () => {
    root().dataset.validate = "false";
    root().addEventListener("jquery-star:stepper:before-change", (event) => event.preventDefault());
    $.star.ui.stepper.next(root());
    expect($.star.ui.stepper.value(root())).toBe("profile");
    expect(root().querySelector('[data-part="step"]')?.getAttribute("data-completed")).toBe(
      "false",
    );
  });
});

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

  it("uses an explicit native root in value actions and rejects a different component", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Stepper application did not start.");
    root().dataset.linear = "false";
    await app.run("ui.stepper.go", { args: [root(), "review"] });
    expect($.star.ui.stepper.value(root())).toBe("review");
    await app.run("ui.stepper.complete", { args: [root(), "review", true] });
    expect(
      root()
        .querySelector('[data-part="step"][data-value="review"]')
        ?.getAttribute("data-completed"),
    ).toBe("true");
    const foreign = document.getElementById("review");
    if (!foreign) throw new Error("Missing Stepper external action.");
    await expect(
      app.run("ui.stepper.go", { element: root(), args: [foreign, "assets"] }),
    ).rejects.toThrow('Stepper target did not match data-jqs="stepper"');
    expect($.star.ui.stepper.value(root())).toBe("review");
    await app.run("ui.stepper.go", { element: root(), args: ["assets"] });
    expect($.star.ui.stepper.value(root())).toBe("assets");
  });

  it("skips disabled native validation and supports previous and disabled completion", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Stepper application did not start.");
    const name = root().querySelector<HTMLInputElement>('input[name="name"]');
    const profile = root().querySelector<HTMLElement>('[data-part="step"][data-value="profile"]');
    if (!name || !profile) throw new Error("Missing Stepper native parts.");
    name.disabled = true;
    $.star.ui.stepper.next(root());
    expect($.star.ui.stepper.value(root())).toBe("assets");
    await app.run("ui.stepper.previous", { args: [root()] });
    expect($.star.ui.stepper.value(root())).toBe("profile");
    $.star.ui.stepper.complete(root(), "profile", true);
    expect(profile.dataset.completed).toBe("true");
    profile.dataset.disabled = "";
    $.star.ui.stepper.complete(root(), "profile", false);
    expect(profile.dataset.completed).toBe("true");
  });

  it("lets an invalid listener start a newer transition without stale validation", () => {
    const name = root().querySelector<HTMLInputElement>('input[name="name"]');
    if (!name) throw new Error("Missing Stepper name input.");
    const report = vi.spyOn(name, "reportValidity");
    root().addEventListener("jquery-star:stepper:invalid", () => {
      root().dataset.linear = "false";
      $.star.ui.stepper.go(root(), "assets");
    });
    $.star.ui.stepper.next(root());
    expect($.star.ui.stepper.value(root())).toBe("assets");
    expect(report).not.toHaveBeenCalled();
  });

  it("stops forward validation when the native check changes the step", () => {
    const name = root().querySelector<HTMLInputElement>('input[name="name"]');
    if (!name) throw new Error("Missing Stepper name input.");
    vi.spyOn(name, "checkValidity").mockImplementation(() => {
      root().dataset.linear = "false";
      $.star.ui.stepper.go(root(), "review");
      return true;
    });
    $.star.ui.stepper.next(root());
    expect($.star.ui.stepper.value(root())).toBe("review");
    expect(panel("review").hidden).toBe(false);
  });

  it("rechecks native validity after the before-complete callback", () => {
    const name = root().querySelector<HTMLInputElement>('input[name="name"]');
    if (!name) throw new Error("Missing Stepper name input.");
    name.value = "Ada";
    $.star.ui.stepper.next(root());
    $.star.ui.stepper.next(root());
    expect($.star.ui.stepper.value(root())).toBe("review");
    const review = document.createElement("input");
    review.required = true;
    review.value = "approved";
    panel("review").append(review);
    $.star.ui.enhance(root());
    const complete = vi.fn();
    root().addEventListener("jquery-star:stepper:complete", complete);
    root().addEventListener("jquery-star:stepper:before-complete", () => {
      review.value = "";
    });
    $.star.ui.stepper.next(root());
    expect(complete).not.toHaveBeenCalled();
    expect($.star.ui.stepper.value(root())).toBe("review");
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

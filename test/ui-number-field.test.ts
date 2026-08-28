import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#quantity")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

function button(part: "decrement" | "increment"): HTMLButtonElement {
  return root().querySelector<HTMLButtonElement>(`[data-part="${part}"]`)!;
}

describe("jQuery Star Number Field", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <div id="quantity" data-jqs="number-field">
          <button data-part="decrement">−</button>
          <input data-part="control" type="number" name="quantity" min="1" max="5" step="2" value="1">
          <button data-part="increment">+</button>
        </div>
        <button id="external" data-on:click="@ui.number-field.increment('#quantity')">More</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("steps a native number input through buttons, API, and named actions", () => {
    expect(button("decrement").disabled).toBe(true);
    expect(button("increment").type).toBe("button");
    expect(button("increment").getAttribute("aria-controls")).toBe(control().id);

    button("increment").click();
    expect(control().value).toBe("3");
    expect($.star.ui.numberField.value(root())).toBe(3);

    $("#external").trigger("click");
    expect(control().value).toBe("5");
    expect(button("increment").disabled).toBe(true);

    $.star.ui.numberField.decrement(root(), 2);
    expect(control().value).toBe("1");
  });

  it("emits ordinary form events and cancelable lifecycle events", () => {
    const input = vi.fn();
    const change = vi.fn();
    const lifecycle = vi.fn();
    control().addEventListener("input", input);
    control().addEventListener("change", change);
    root().addEventListener("jquery-star:number-field:change", lifecycle);
    root().addEventListener("jquery-star:number-field:before-change", (event) => {
      const detail = (event as CustomEvent<{ value?: number }>).detail;
      if (detail.value === 5) event.preventDefault();
    });

    button("increment").click();
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledOnce();

    button("increment").click();
    expect(control().value).toBe("3");
    expect(input).toHaveBeenCalledOnce();
  });

  it("keeps typed values, constraints, readonly state, and native form serialization", () => {
    control().value = "4";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(root().dataset.value).toBe("4");

    root().dataset.value = "5";
    $.star.ui.enhance(root());
    expect(control().value).toBe("5");

    const form = document.createElement("form");
    root().before(form);
    form.append(root());
    expect(new FormData(form).get("quantity")).toBe("5");

    control().readOnly = true;
    $.star.ui.enhance(root());
    expect(button("increment").disabled).toBe(true);
    expect(button("decrement").disabled).toBe(true);
  });
});

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

  it("accepts its native root as a named-action target", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Number Field application did not start.");

    await app.run("ui.number-field.increment", { args: [root(), 1] });
    expect(control().value).toBe("3");
    await app.run("ui.number-field.set", { args: [root(), 5] });
    expect(control().value).toBe("5");
    const external = document.getElementById("external");
    if (!external) throw new Error("Missing external Number Field action.");
    await expect(
      app.run("ui.number-field.increment", {
        element: button("increment"),
        args: [external],
      }),
    ).rejects.toThrow('Number Field target did not match data-jqs="number-field"');
    expect(control().value).toBe("5");
    await app.run("ui.number-field.decrement", { element: button("decrement"), args: [1] });
    expect(control().value).toBe("3");
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

  it("announces only the newer value when a native change listener reenters", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:number-field:change", changed);
    control().addEventListener("change", () => $.star.ui.numberField.set(root(), 5), {
      once: true,
    });

    $.star.ui.numberField.increment(root());
    expect(control().value).toBe("5");
    expect(changed).toHaveBeenCalledOnce();
    expect((changed.mock.calls[0]?.[0] as CustomEvent<{ value: number }>).detail.value).toBe(5);
  });

  it("keeps one current record when native listener cleanup reenters enhancement", () => {
    const oldControl = control();
    oldControl.replaceWith(oldControl.cloneNode(true));
    const nativeRemove = oldControl.removeEventListener.bind(oldControl);
    let reentered = false;
    const removal = vi.spyOn(oldControl, "removeEventListener").mockImplementation((...args) => {
      nativeRemove(...args);
      if (!reentered) {
        reentered = true;
        $.star.ui.enhance(root());
      }
    });
    try {
      $.star.ui.enhance(root());
    } finally {
      removal.mockRestore();
    }

    const changed = vi.fn();
    root().addEventListener("jquery-star:number-field:change", changed);
    button("increment").click();
    expect(reentered).toBe(true);
    expect(control().value).toBe("3");
    expect(changed).toHaveBeenCalledOnce();
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

  it.each(["all", "control", "decrement", "increment"])(
    "binds current native parts after replacing %s",
    async (part) => {
      const oldControl = control();
      const oldDecrement = button("decrement");
      const oldIncrement = button("increment");
      if (part === "all") {
        const markup = root().innerHTML;
        root().innerHTML = markup;
      } else {
        const original = part === "control" ? control() : button(part as "decrement" | "increment");
        original.replaceWith(original.cloneNode(true));
      }
      $.star.ui.enhance(root());
      await $.star.whenEnhanced();
      button("increment").click();
      expect(control().value).toBe("3");
      button("decrement").click();
      expect(control().value).toBe("1");
      $.star.ui.numberField.set(root(), 5);
      expect(control().value).toBe("5");
      expect($.star.ui.numberField.value(root())).toBe(5);
      $.star.ui.numberField.set(root(), 3);
      if (oldControl !== control()) {
        oldControl.value = "4";
        oldControl.dispatchEvent(new Event("input", { bubbles: true }));
        oldControl.dispatchEvent(new Event("change", { bubbles: true }));
      }
      if (oldDecrement !== button("decrement")) oldDecrement.dispatchEvent(new MouseEvent("click"));
      if (oldIncrement !== button("increment")) oldIncrement.dispatchEvent(new MouseEvent("click"));
      expect(control().value).toBe("3");
      expect(root().dataset.value).toBe("3");
      expect(button("increment").getAttribute("aria-controls")).toBe(control().id);
    },
  );

  it("preserves current values and one listener set on unchanged enhancement", async () => {
    const current = control();
    current.value = "3";
    current.dispatchEvent(new Event("input", { bubbles: true }));
    $.star.ui.enhance(root());
    $.star.ui.enhance(root());
    await $.star.whenEnhanced();
    expect(control()).toBe(current);
    expect(current.value).toBe("3");
    const change = vi.fn();
    root().addEventListener("jquery-star:number-field:change", change);
    button("increment").click();
    expect(current.value).toBe("5");
    expect(change).toHaveBeenCalledOnce();
  });
});

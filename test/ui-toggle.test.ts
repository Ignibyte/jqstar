import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function toggle(): HTMLButtonElement {
  return document.querySelector<HTMLButtonElement>("#preview-toggle")!;
}

function group(selector = "#formatting"): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

function item(value: string, selector = "#formatting"): HTMLButtonElement {
  return group(selector).querySelector<HTMLButtonElement>(`[data-value=${value}]`)!;
}

describe("jQuery Star Toggle and Toggle Group", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="preview-toggle" data-jqs="toggle" type="button">Preview</button>
        <button id="external-toggle" data-on:click="@ui.toggle.toggle('#preview-toggle')">External</button>

        <div
          id="formatting"
          data-jqs="toggle-group"
          data-type="multiple"
          data-value="bold"
          data-name="format"
          aria-label="Formatting"
        >
          <button data-part="item" data-value="bold">Bold</button>
          <button data-part="item" data-value="italic">Italic</button>
          <button data-part="item" data-value="disabled" disabled>Disabled</button>
          <button data-part="item" data-value="underline">Underline</button>
        </div>

        <div
          id="alignment"
          data-jqs="toggle-group"
          data-required
          data-value="left"
          aria-label="Alignment"
        >
          <button data-part="item" data-value="left">Left</button>
          <button data-part="item" data-value="center">Center</button>
          <button data-part="item" data-value="right">Right</button>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("maintains standalone pressed state through pointer, API, and named actions", () => {
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    toggle().click();
    expect(toggle().dataset.state).toBe("on");
    expect($.star.ui.toggle.pressed(toggle())).toBe(true);

    $("#external-toggle").trigger("click");
    expect($.star.ui.toggle.pressed(toggle())).toBe(false);

    $.star.ui.toggle.press(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
  });

  it("supports multiple values, ordered form fields, and cancelable changes", () => {
    const changed = vi.fn();
    group().addEventListener("jquery-star:toggle-group:change", changed);

    item("italic").click();
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold", "italic"]);
    expect(
      Array.from(group().querySelectorAll<HTMLInputElement>('input[name="format"]')).map(
        (input) => input.value,
      ),
    ).toEqual(["bold", "italic"]);
    expect(changed).toHaveBeenCalledOnce();

    group().addEventListener("jquery-star:toggle-group:before-change", (event) => {
      const detail = (event as CustomEvent<{ value: string }>).detail;
      if (detail.value === "underline") event.preventDefault();
    });
    item("underline").click();
    expect($.star.ui.toggleGroup.value(group())).toEqual(["bold", "italic"]);
  });

  it("enforces required single selection and accepts server-patched values", () => {
    const alignment = group("#alignment");
    item("left", "#alignment").click();
    expect($.star.ui.toggleGroup.value(alignment)).toBe("left");

    $.star.ui.toggleGroup.select(alignment, "center");
    expect($.star.ui.toggleGroup.value(alignment)).toBe("center");
    expect(item("left", "#alignment").getAttribute("aria-pressed")).toBe("false");

    alignment.dataset.value = "right";
    $.star.ui.enhance(alignment);
    expect($.star.ui.toggleGroup.value(alignment)).toBe("right");
  });

  it("uses orientation-aware roving focus and skips disabled items", () => {
    const bold = item("bold");
    const italic = item("italic");
    const underline = item("underline");
    expect(group().getAttribute("role")).toBe("toolbar");
    expect(group().getAttribute("aria-orientation")).toBe("horizontal");

    bold.focus();
    bold.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect(document.activeElement).toBe(italic);
    italic.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect(document.activeElement).toBe(underline);
    underline.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect(document.activeElement).toBe(bold);
  });
});

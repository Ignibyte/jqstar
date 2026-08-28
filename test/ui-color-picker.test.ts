import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#accent")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

function text(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="value"]')!;
}

describe("jQuery Star Color Picker", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <label for="accent-control">Accent color</label>
          <div id="accent" data-jqs="color-picker">
            <input id="accent-control" data-part="control" type="color" name="accent" value="#0f766e">
            <span data-part="preview"></span>
            <input data-part="value">
            <button data-part="swatch" data-value="#2563eb">Blue</button>
            <button data-part="swatch" data-value="#9333ea">Purple</button>
            <p data-part="status"></p>
          </div>
        </form>
        <button id="set" data-on:click="@ui.color-picker.set('#accent', '#dc2626')">Set red</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("keeps the native color input as the form source", () => {
    expect($.star.ui.colorPicker.value(root())).toBe("#0f766e");
    expect(text().value).toBe("#0f766e");
    expect(new FormData(document.querySelector<HTMLFormElement>("#form")!).get("accent")).toBe(
      "#0f766e",
    );
    expect(root().querySelector('[data-part="preview"]')?.getAttribute("aria-label")).toBe(
      "Selected color #0f766e",
    );
  });

  it("sets colors through swatches, text, API, and named actions", () => {
    root().querySelector<HTMLButtonElement>('[data-part="swatch"][data-value="#2563eb"]')!.click();
    expect(control().value).toBe("#2563eb");
    expect(root().querySelector('[data-value="#2563eb"]')?.getAttribute("aria-pressed")).toBe(
      "true",
    );

    text().value = "#9333ea";
    text().dispatchEvent(new Event("change", { bubbles: true }));
    expect(control().value).toBe("#9333ea");
    $("#set").trigger("click");
    expect(control().value).toBe("#dc2626");
  });

  it("rejects unsupported values and restores canceled native changes", () => {
    text().value = "not-a-color";
    text().dispatchEvent(new Event("change", { bubbles: true }));
    expect(control().value).toBe("#0f766e");
    expect(text().getAttribute("aria-invalid")).toBe("true");

    root().addEventListener("jquery-star:color-picker:before-change", (event) =>
      event.preventDefault(),
    );
    control().value = "#2563eb";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(control().value).toBe("#0f766e");
  });

  it("accepts server patches and emits ordinary and component events", () => {
    const input = vi.fn();
    const change = vi.fn();
    const lifecycle = vi.fn();
    control().addEventListener("input", input);
    control().addEventListener("change", change);
    root().addEventListener("jquery-star:color-picker:change", lifecycle);
    root().dataset.value = "#2563eb";
    $.star.ui.enhance(root());
    expect(control().value).toBe("#2563eb");

    $.star.ui.colorPicker.set(root(), "#9333ea");
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledOnce();
  });
});

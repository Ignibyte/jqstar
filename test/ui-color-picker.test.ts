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
    vi.unstubAllGlobals();
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

  it("rejects a wrong-kind element action target without changing the nearby color input", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Color Picker application did not start.");
    await expect(
      app.run("ui.color-picker.set", { element: text(), args: [text(), "#2563eb"] }),
    ).rejects.toThrow('Color Picker target did not match data-jqs="color-picker"');
    expect(control().value).toBe("#0f766e");
    await app.run("ui.color-picker.set", { args: [root(), "#2563eb"] });
    expect(control().value).toBe("#2563eb");
    await app.run("ui.color-picker.set", { args: ["#accent", "#9333ea"] });
    expect(control().value).toBe("#9333ea");
    await app.run("ui.color-picker.set", { element: text(), args: ["#dc2626"] });
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

  it("retains an authored disabled swatch while a disabled native color value changes", () => {
    const swatch = root().querySelector<HTMLButtonElement>('[data-value="#2563eb"]');
    if (!swatch) throw new Error("Missing authored color swatch.");
    const changed = vi.fn();
    const before = vi.fn();
    root().addEventListener("jquery-star:color-picker:change", changed);
    root().addEventListener("jquery-star:color-picker:before-change", before);
    swatch.disabled = true;
    root().dataset.disabled = "";
    control().value = "#9333ea";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(root().dataset.value).toBe("#9333ea");
    expect(text().value).toBe("#9333ea");
    expect(root().dataset.state).toBe("disabled");
    expect(changed).toHaveBeenCalledOnce();
    expect(before).not.toHaveBeenCalled();
    delete root().dataset.disabled;
    $.star.ui.colorPicker.set(root(), "#dc2626");
    expect(root().dataset.state).toBe("ready");
    expect(swatch.disabled).toBe(true);
    expect(text().disabled).toBe(false);
  });

  it("rejects a context-dependent CSS color even when CSS parsing accepts it", () => {
    vi.stubGlobal("CSS", { supports: vi.fn(() => true) });
    $.star.ui.colorPicker.set(root(), "currentColor");
    expect(control().value).toBe("#0f766e");
    expect(root().dataset.state).toBe("invalid");
  });

  it("keeps an authored patch made during native color normalization", () => {
    const nativeClone = control().cloneNode.bind(control());
    vi.spyOn(control(), "cloneNode").mockImplementation((deep) => {
      root().dataset.value = "#778899";
      return nativeClone(deep);
    });
    $.star.ui.colorPicker.set(root(), "#2563eb");
    expect(control().value).toBe("#0f766e");
    expect(root().dataset.value).toBe("#778899");
    $.star.ui.enhance(root());
    expect(control().value).toBe("#778899");
  });

  it("keeps a replacement controller acquired during old listener cleanup", () => {
    const previous = control();
    const replacement = previous.cloneNode(true) as HTMLInputElement;
    previous.replaceWith(replacement);
    const remove = previous.removeEventListener.bind(previous);
    let reentered = false;
    vi.spyOn(previous, "removeEventListener").mockImplementation((type, listener, options) => {
      remove(type, listener, options);
      if (reentered) return;
      reentered = true;
      $.star.ui.enhance(root());
    });
    $.star.ui.enhance(root());
    expect(reentered).toBe(true);
    $.star.ui.colorPicker.set(root(), "#445566");
    expect(replacement.value).toBe("#445566");
    previous.value = "#aabbcc";
    previous.dispatchEvent(new Event("input", { bubbles: true }));
    expect(root().dataset.value).toBe("#445566");
  });

  it("ignores a bubbled click whose target is not an element", () => {
    const textNode = document.createTextNode("Plain text");
    root().append(textNode);
    textNode.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    expect(control().value).toBe("#0f766e");
    expect(root().dataset.value).toBe("#0f766e");
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

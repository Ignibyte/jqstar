import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../src/index";

function toolbar(): HTMLElement {
  return document.querySelector<HTMLElement>("#editor-toolbar")!;
}

function item(value: string): HTMLElement {
  return toolbar().querySelector<HTMLElement>(`[data-value="${value}"]`)!;
}

describe("jQuery Star Toolbar", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <div id="editor-toolbar" data-jqs="toolbar" aria-label="Editor tools">
          <button data-part="item" data-value="bold" type="button">Bold</button>
          <button data-part="item" data-value="italic" type="button">Italic</button>
          <button data-part="item" data-value="disabled" type="button" disabled>Disabled</button>
          <input data-part="item" data-value="font-size" type="number" aria-label="Font size" />
          <button data-part="item" data-value="link" type="button">Link</button>
        </div>
        <button id="focus-link" data-on:click="@ui.toolbar.focus('#editor-toolbar', 'link')">
          Focus link
        </button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("creates one roving tab stop with toolbar semantics", () => {
    expect(toolbar().getAttribute("role")).toBe("toolbar");
    expect(toolbar().getAttribute("aria-orientation")).toBe("horizontal");
    expect(item("bold").tabIndex).toBe(0);
    expect(item("italic").tabIndex).toBe(-1);
    expect(item("disabled").tabIndex).toBe(-1);
    expect($.star.ui.toolbar.value(toolbar())).toBe("bold");
  });

  it("moves focus with orientation-aware keys and skips disabled controls", () => {
    item("bold").focus();
    item("bold").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect(document.activeElement).toBe(item("italic"));
    item("italic").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    expect(document.activeElement).toBe(item("font-size"));
    item("font-size").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }),
    );
    expect(document.activeElement).toBe(item("font-size"));

    toolbar().dataset.orientation = "vertical";
    $.star.ui.enhance(toolbar());
    $.star.ui.toolbar.focus(toolbar(), "italic");
    item("italic").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    expect(document.activeElement).toBe(item("font-size"));
  });

  it("supports API, named-action, and server-patched focus", () => {
    $.star.ui.toolbar.focus(toolbar(), "italic");
    expect(document.activeElement).toBe(item("italic"));
    $.star.ui.toolbar.next(toolbar());
    expect(document.activeElement).toBe(item("font-size"));

    $("#focus-link").trigger("click");
    expect(document.activeElement).toBe(item("link"));
    expect(toolbar().dataset.value).toBe("link");

    toolbar().dataset.value = "bold";
    $.star.ui.enhance(toolbar());
    expect($.star.ui.toolbar.value(toolbar())).toBe("bold");
    expect(item("bold").tabIndex).toBe(0);
  });

  it("can stop arrow navigation at the edges", () => {
    toolbar().dataset.loop = "false";
    $.star.ui.enhance(toolbar());
    $.star.ui.toolbar.focus(toolbar(), "bold");
    $.star.ui.toolbar.previous(toolbar());
    expect(document.activeElement).toBe(item("bold"));
  });
});

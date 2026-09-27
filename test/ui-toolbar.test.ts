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

  it("accepts its native root as a named-action target", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Toolbar application did not start.");

    await app.run("ui.toolbar.focus", { args: [toolbar(), "italic"] });
    expect(document.activeElement).toBe(item("italic"));
    await app.run("ui.toolbar.next", { args: [toolbar()] });
    expect(document.activeElement).toBe(item("font-size"));
    const external = document.getElementById("focus-link");
    if (!external) throw new Error("Missing external Toolbar action.");
    await expect(
      app.run("ui.toolbar.focus", {
        element: item("bold"),
        args: [external, "bold"],
      }),
    ).rejects.toThrow('Toolbar target did not match data-jqs="toolbar"');
    expect(document.activeElement).toBe(item("font-size"));
    await app.run("ui.toolbar.focus", { element: item("bold"), args: ["bold"] });
    expect(document.activeElement).toBe(item("bold"));
  });

  it("can stop arrow navigation at the edges", () => {
    toolbar().dataset.loop = "false";
    $.star.ui.enhance(toolbar());
    $.star.ui.toolbar.focus(toolbar(), "bold");
    $.star.ui.toolbar.previous(toolbar());
    expect(document.activeElement).toBe(item("bold"));
  });

  it("preserves native arrow keys in textarea and select items", () => {
    const textarea = document.createElement("textarea");
    textarea.dataset.part = "item";
    textarea.dataset.value = "notes";
    const select = document.createElement("select");
    select.dataset.part = "item";
    select.dataset.value = "style";
    toolbar().append(textarea, select);
    $.star.ui.enhance(toolbar());

    for (const control of [textarea, select]) {
      control.focus();
      const key = new KeyboardEvent("keydown", {
        bubbles: true,
        cancelable: true,
        key: "ArrowRight",
      });
      control.dispatchEvent(key);
      expect(key.defaultPrevented).toBe(false);
      expect(document.activeElement).toBe(control);
    }
  });

  it("handles a synthetic key event from text inside an item", () => {
    const text = item("bold").firstChild;
    if (!text) throw new Error("Missing Toolbar item text.");
    const key = new KeyboardEvent("keydown", {
      bubbles: true,
      cancelable: true,
      key: "ArrowRight",
    });
    text.dispatchEvent(key);
    expect(key.defaultPrevented).toBe(true);
    expect(document.activeElement).toBe(item("italic"));
  });

  it("recovers the first enabled item when a patch removes the active and tab-stop items", () => {
    toolbar().dataset.value = "disabled";
    toolbar().innerHTML = `
      <button data-part="item" data-value="disabled" disabled tabindex="-1">Disabled</button>
      <button data-part="item" data-value="new" tabindex="-1">New</button>
      <button data-part="item" data-value="other" tabindex="-1">Other</button>
    `;
    $.star.ui.enhance(toolbar());
    expect($.star.ui.toolbar.value(toolbar())).toBe("new");
    expect(item("new").tabIndex).toBe(0);
    expect(item("disabled").tabIndex).toBe(-1);
  });
});

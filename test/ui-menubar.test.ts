import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#menubar")!;
}

function menu(value: string): HTMLElement {
  return root().querySelector<HTMLElement>(`:scope > [data-part="menu"][data-value="${value}"]`)!;
}

function trigger(value: string): HTMLElement {
  return menu(value).querySelector<HTMLElement>(':scope > [data-part="trigger"]')!;
}

function item(menuValue: string, value: string): HTMLElement {
  return menu(menuValue).querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`)!;
}

describe("jQuery Star Menubar", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <div id="menubar" data-jqs="menubar" aria-label="Editor commands" data-on:open-edit="@ui.menubar.open('edit')">
          <div data-part="menu" data-jqs="menu" data-value="file">
            <button data-part="trigger">File</button>
            <div data-part="content">
              <button data-part="item" data-value="new">New</button>
              <button data-part="item" data-value="open">Open</button>
            </div>
          </div>
          <div data-part="menu" data-jqs="menu" data-value="edit">
            <button data-part="trigger">Edit</button>
            <div data-part="content">
              <button data-part="item" data-value="undo">Undo</button>
              <button data-part="item" data-value="redo">Redo</button>
            </div>
          </div>
          <div data-part="menu" data-jqs="menu" data-value="view">
            <button data-part="trigger">View</button>
            <div data-part="content">
              <button data-part="item" data-value="zoom">Zoom</button>
            </div>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $.star.ui.menubar.close(root());
    $("#app").star("destroy");
  });

  it("creates a labelled menubar with one top-level tab stop", () => {
    expect(root().getAttribute("role")).toBe("menubar");
    expect(root().getAttribute("aria-orientation")).toBe("horizontal");
    expect(trigger("file").getAttribute("role")).toBe("menuitem");
    expect(trigger("file").tabIndex).toBe(0);
    expect(trigger("edit").tabIndex).toBe(-1);
    expect(trigger("file").getAttribute("aria-haspopup")).toBe("menu");
    expect(root().dataset.state).toBe("closed");
  });

  it("moves across top-level items and switches open menus", () => {
    trigger("file").focus();
    trigger("file").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }),
    );
    expect(document.activeElement).toBe(trigger("edit"));

    trigger("edit").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    expect(menu("edit").dataset.state).toBe("open");
    expect(document.activeElement).toBe(item("edit", "undo"));

    item("edit", "undo").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }),
    );
    expect(menu("edit").dataset.state).toBe("closed");
    expect(menu("view").dataset.state).toBe("open");
    expect(document.activeElement).toBe(item("view", "zoom"));
    expect($.star.ui.menubar.value(root())).toBe("view");
  });

  it("supports Home, End, wrapping, and top-level typeahead", () => {
    trigger("file").focus();
    trigger("file").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "End" }),
    );
    expect(document.activeElement).toBe(trigger("view"));
    trigger("view").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }),
    );
    expect(document.activeElement).toBe(trigger("file"));
    trigger("file").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "e" }));
    expect(document.activeElement).toBe(trigger("edit"));
  });

  it("maps top-level navigation to the authored vertical orientation", () => {
    root().dataset.orientation = "vertical";
    $.star.ui.enhance(root());
    trigger("file").focus();
    trigger("file").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowDown" }),
    );
    expect(document.activeElement).toBe(trigger("edit"));
    trigger("edit").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "ArrowRight" }),
    );
    expect(document.activeElement).toBe(item("edit", "undo"));
  });

  it("supports APIs, named actions, item selection, and re-enhancement", () => {
    $.star.ui.menubar.open("#menubar", "file");
    expect(document.activeElement).toBe(item("file", "new"));
    item("file", "new").click();
    expect(root().dataset.state).toBe("closed");
    expect(document.activeElement).toBe(trigger("file"));

    root().dispatchEvent(new CustomEvent("open-edit", { bubbles: true }));
    expect($.star.ui.menubar.value(root())).toBe("edit");

    menu("view").remove();
    $.star.ui.enhance(root());
    $.star.ui.menubar.focus(root(), "file");
    expect(document.activeElement).toBe(trigger("file"));
  });
});

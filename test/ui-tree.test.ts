import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#tree")!;
}

function item(value: string): HTMLElement {
  return root().querySelector<HTMLElement>(`[data-part="item"][data-value="${value}"]`)!;
}

function row(value: string): HTMLElement {
  return item(value).querySelector<HTMLElement>(':scope > [data-part="row"]')!;
}

function key(value: string, keyValue: string, options: KeyboardEventInit = {}): void {
  item(value).dispatchEvent(
    new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: keyValue, ...options }),
  );
}

describe("jQuery Star Tree View", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <ul id="tree" data-jqs="tree" data-selection="multiple" data-value='["src"]' aria-label="Project files">
          <li data-part="item" data-value="src" data-expanded="true">
            <div data-part="row"><span data-part="toggle"></span><span data-part="label">Source</span><span data-part="meta">2</span></div>
            <ul data-part="group">
              <li data-part="item" data-value="index">
                <div data-part="row"><span data-part="spacer"></span><span data-part="label">index.ts</span></div>
              </li>
              <li data-part="item" data-value="ui" data-expanded="false">
                <div data-part="row"><span data-part="toggle"></span><span data-part="label">UI</span></div>
                <ul data-part="group">
                  <li data-part="item" data-value="button">
                    <div data-part="row"><span data-part="spacer"></span><span data-part="label">button.ts</span></div>
                  </li>
                </ul>
              </li>
            </ul>
          </li>
          <li data-part="item" data-value="readme">
            <div data-part="row"><span data-part="spacer"></span><span data-part="label">README.md</span></div>
          </li>
          <li data-part="item" data-value="locked" data-disabled>
            <div data-part="row"><span data-part="spacer"></span><span data-part="label">Locked</span></div>
          </li>
        </ul>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("derives tree roles, hierarchy metadata, expansion, and independent selection", () => {
    expect(root().getAttribute("role")).toBe("tree");
    expect(root().getAttribute("aria-multiselectable")).toBe("true");
    expect(item("src").getAttribute("role")).toBe("treeitem");
    expect(item("src").getAttribute("aria-level")).toBe("1");
    expect(item("index").getAttribute("aria-level")).toBe("2");
    expect(item("src").getAttribute("aria-expanded")).toBe("true");
    expect(item("ui").getAttribute("aria-expanded")).toBe("false");
    expect(item("button").parentElement?.hidden).toBe(true);
    expect(item("src").getAttribute("aria-selected")).toBe("true");
    expect(item("src").tabIndex).toBe(0);
    expect(item("locked").getAttribute("aria-disabled")).toBe("true");
  });

  it("implements the APG arrow, edge, sibling expansion, and typeahead model", () => {
    item("src").focus();
    key("src", "ArrowRight");
    expect(document.activeElement).toBe(item("index"));
    key("index", "ArrowDown");
    expect(document.activeElement).toBe(item("ui"));
    key("ui", "ArrowRight");
    expect(item("ui").getAttribute("aria-expanded")).toBe("true");
    key("ui", "ArrowRight");
    expect(document.activeElement).toBe(item("button"));
    key("button", "ArrowLeft");
    expect(document.activeElement).toBe(item("ui"));
    key("ui", "*");
    expect(item("src").getAttribute("aria-expanded")).toBe("true");
    key("ui", "End");
    expect(document.activeElement).toBe(item("readme"));
    key("readme", "s");
    expect(document.activeElement).toBe(item("src"));
  });

  it("keeps focus separate from multi-selection and supports range-like shortcuts", () => {
    item("src").focus();
    key("src", "ArrowDown");
    expect(document.activeElement).toBe(item("index"));
    expect($.star.ui.tree.value(root())).toEqual(["src"]);

    key("index", " ");
    expect($.star.ui.tree.value(root())).toEqual(["src", "index"]);
    key("index", "ArrowDown", { shiftKey: true });
    expect(document.activeElement).toBe(item("ui"));
    expect($.star.ui.tree.value(root())).toEqual(["src", "index", "ui"]);

    root().addEventListener("jquery-star:tree:before-select", (event) => event.preventDefault(), {
      once: true,
    });
    key("ui", "a", { ctrlKey: true });
    expect($.star.ui.tree.value(root())).toEqual(["src", "index", "ui"]);
    key("ui", "a", { ctrlKey: true });
    expect($.star.ui.tree.value(root())).toEqual(["src", "index", "ui", "readme"]);
    key("ui", "a", { ctrlKey: true });
    expect($.star.ui.tree.value(root())).toEqual([]);
  });

  it("supports pointer selection, activation, cancelable events, APIs, and server patches", () => {
    const activate = vi.fn();
    root().addEventListener("jquery-star:tree:activate", activate);
    row("readme").click();
    expect($.star.ui.tree.value(root())).toEqual(["src", "readme"]);
    row("readme").dispatchEvent(new MouseEvent("dblclick", { bubbles: true }));
    expect(activate).toHaveBeenCalledOnce();

    const prevent = (event: Event): void => event.preventDefault();
    root().addEventListener("jquery-star:tree:before-expand", prevent, { once: true });
    $.star.ui.tree.expand(root(), "ui");
    expect(item("ui").getAttribute("aria-expanded")).toBe("false");
    $.star.ui.tree.expand(root(), "ui");
    $.star.ui.tree.focus(root(), "button");
    expect(document.activeElement).toBe(item("button"));

    item("ui").dataset.expanded = "false";
    $.star.ui.enhance(root());
    expect(item("ui").getAttribute("aria-expanded")).toBe("false");
    expect(item("button").parentElement?.hidden).toBe(true);

    root().dataset.value = '["index"]';
    $.star.ui.enhance(root());
    expect($.star.ui.tree.value(root())).toEqual(["index"]);
    expect(item("index").getAttribute("aria-selected")).toBe("true");
    expect(item("src").getAttribute("aria-selected")).toBe("false");
  });
});

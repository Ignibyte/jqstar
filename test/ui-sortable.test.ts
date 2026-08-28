import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#priority")!;
}

function handle(value: string): HTMLButtonElement {
  return root().querySelector<HTMLButtonElement>(
    `[data-part="item"][data-value="${value}"] [data-part="handle"]`,
  )!;
}

describe("jQuery Star Sortable", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <div id="priority" data-jqs="sortable" data-name="priority">
            <ol data-part="list">
              <li data-part="item" data-value="design" data-label="Design"><button data-part="handle">Move</button><span data-part="label">Design</span><button data-part="up">Up</button><button data-part="down">Down</button></li>
              <li data-part="item" data-value="api" data-label="API"><button data-part="handle">Move</button><span data-part="label">API</span><button data-part="up">Up</button><button data-part="down">Down</button></li>
              <li data-part="item" data-value="docs" data-label="Docs"><button data-part="handle">Move</button><span data-part="label">Docs</span><button data-part="up">Up</button><button data-part="down">Down</button></li>
            </ol>
            <p data-part="status"></p>
          </div>
        </form>
        <button id="first" data-on:click="@ui.sortable.move('#priority', 'docs', 0)">Docs first</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("serializes a stable repeated order and exposes pointer alternatives", () => {
    expect($.star.ui.sortable.value(root())).toEqual(["design", "api", "docs"]);
    expect(
      new FormData(document.querySelector<HTMLFormElement>("#form")!).getAll("priority"),
    ).toEqual(["design", "api", "docs"]);
    expect(
      root().querySelector<HTMLButtonElement>('[data-value="design"] [data-part="up"]')!.disabled,
    ).toBe(true);
    expect(
      root().querySelector<HTMLButtonElement>('[data-value="docs"] [data-part="down"]')!.disabled,
    ).toBe(true);
  });

  it("moves through buttons, API, and named actions", () => {
    root().querySelector<HTMLButtonElement>('[data-value="api"] [data-part="up"]')!.click();
    expect($.star.ui.sortable.value(root())).toEqual(["api", "design", "docs"]);
    $.star.ui.sortable.down(root(), "api");
    expect($.star.ui.sortable.value(root())).toEqual(["design", "api", "docs"]);
    $("#first").trigger("click");
    expect($.star.ui.sortable.value(root())).toEqual(["docs", "design", "api"]);
  });

  it("supports keyboard grab, move, drop, and cancellation", () => {
    handle("api").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    handle("api").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }));
    handle("api").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    expect($.star.ui.sortable.value(root())).toEqual(["api", "design", "docs"]);

    handle("api").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    handle("api").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
    handle("api").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect($.star.ui.sortable.value(root())).toEqual(["api", "design", "docs"]);
  });

  it("honors canceled changes and accepts server-patched order", () => {
    const blocked = vi.fn((event: Event) => event.preventDefault());
    root().addEventListener("jquery-star:sortable:before-change", blocked);
    $.star.ui.sortable.move(root(), "docs", 0);
    expect($.star.ui.sortable.value(root())).toEqual(["design", "api", "docs"]);
    root().removeEventListener("jquery-star:sortable:before-change", blocked);

    root().dataset.value = '["docs","api","design"]';
    $.star.ui.enhance(root());
    expect($.star.ui.sortable.value(root())).toEqual(["docs", "api", "design"]);
  });
});

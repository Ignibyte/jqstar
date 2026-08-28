import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#component-search")!;
}

function control(): HTMLInputElement {
  return root().querySelector<HTMLInputElement>('[data-part="control"]')!;
}

describe("jQuery Star Search Field", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="search-form" role="search">
          <div id="component-search" data-jqs="search-field" data-value="jquery">
            <label for="query">Search components</label>
            <input id="query" data-part="control" type="search" name="query">
            <button data-part="clear">Clear</button>
            <button data-part="submit">Search</button>
          </div>
        </form>
        <button id="set" data-on:click="@ui.search-field.set('#component-search', 'datastar')">Set query</button>
        <button id="clear" data-on:click="@ui.search-field.clear('#component-search')">Clear query</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("keeps native search input and form submission values", () => {
    expect(control().type).toBe("search");
    expect(control().value).toBe("jquery");
    expect(
      new FormData(document.querySelector<HTMLFormElement>("#search-form")!).get("query"),
    ).toBe("jquery");
    expect(root().querySelector<HTMLButtonElement>('[data-part="clear"]')!.hidden).toBe(false);
  });

  it("changes through typing, APIs, clear control, and named actions", () => {
    control().value = "tailwind";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect($.star.ui.searchField.value(root())).toBe("tailwind");
    expect(root().dataset.value).toBe("tailwind");

    $("#set").trigger("click");
    expect(control().value).toBe("datastar");
    root().querySelector<HTMLButtonElement>('[data-part="clear"]')!.click();
    expect(control().value).toBe("");
    expect(document.activeElement).toBe(control());

    $.star.ui.searchField.set(root(), "jQuery Star");
    $("#clear").trigger("click");
    expect($.star.ui.searchField.value(root())).toBe("");
  });

  it("honors canceled changes and accepts server-patched values", () => {
    root().addEventListener("jquery-star:search-field:before-change", (event) => {
      if ((event as CustomEvent<{ value: string }>).detail.value === "blocked") {
        event.preventDefault();
      }
    });
    $.star.ui.searchField.set(root(), "blocked");
    expect(control().value).toBe("jquery");

    root().dataset.value = "patched";
    $.star.ui.enhance(root());
    expect(control().value).toBe("patched");
  });

  it("emits native and component events and preserves native submit", () => {
    const input = vi.fn();
    const change = vi.fn();
    const lifecycle = vi.fn();
    const search = vi.fn((event: Event) => event.preventDefault());
    control().addEventListener("input", input);
    control().addEventListener("change", change);
    root().addEventListener("jquery-star:search-field:change", lifecycle);
    document.querySelector("#search-form")!.addEventListener("submit", search);

    $.star.ui.searchField.set(root(), "proof");
    $.star.ui.searchField.submit(root());
    expect(input).toHaveBeenCalledOnce();
    expect(change).toHaveBeenCalledOnce();
    expect(lifecycle).toHaveBeenCalledOnce();
    expect(search).toHaveBeenCalledOnce();
  });

  it("reflects a server loading patch without looping", () => {
    root().dataset.loading = "true";
    $.star.ui.enhance(root());
    expect(control().getAttribute("aria-busy")).toBe("true");
    expect(root().querySelector<HTMLButtonElement>('[data-part="submit"]')!.disabled).toBe(true);
    root().dataset.loading = "false";
    $.star.ui.enhance(root());
    expect(root().querySelector<HTMLButtonElement>('[data-part="submit"]')!.disabled).toBe(false);
  });
});

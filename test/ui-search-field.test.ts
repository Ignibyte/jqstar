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

  it("uses an explicit native root in the set action and rejects a different component", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Search Field application did not start.");
    await app.run("ui.search-field.set", { args: [root(), "native target"] });
    expect(control().value).toBe("native target");
    const foreign = document.getElementById("set");
    if (!foreign) throw new Error("Missing Search Field external action.");
    await expect(
      app.run("ui.search-field.set", { element: control(), args: [foreign, "redirected"] }),
    ).rejects.toThrow('Search Field target did not match data-jqs="search-field"');
    expect(control().value).toBe("native target");
    await app.run("ui.search-field.set", { element: control(), args: ["implicit"] });
    expect(control().value).toBe("implicit");
  });

  it("leaves disabled native search and submit controls inert", () => {
    const search = vi.fn((event: Event) => event.preventDefault());
    const form = document.querySelector<HTMLFormElement>("#search-form");
    if (!form) throw new Error("Missing Search Field form.");
    form.addEventListener("submit", search);
    control().disabled = true;
    $.star.ui.searchField.set(root(), "blocked");
    $.star.ui.searchField.submit(root());
    expect(control().value).toBe("jquery");
    expect(search).not.toHaveBeenCalled();
  });

  it("restores canceled typing and lets a newer native change win", () => {
    const lifecycle = vi.fn();
    root().addEventListener("jquery-star:search-field:change", lifecycle);
    const cancel = (event: Event): void => {
      if ((event as CustomEvent<{ value: string }>).detail.value === "blocked")
        event.preventDefault();
    };
    root().addEventListener("jquery-star:search-field:before-change", cancel);
    control().value = "blocked";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(control().value).toBe("jquery");
    expect(lifecycle).not.toHaveBeenCalled();
    root().removeEventListener("jquery-star:search-field:before-change", cancel);

    control().addEventListener("change", () => {
      if (control().value === "older") $.star.ui.searchField.set(root(), "newer");
    });
    $.star.ui.searchField.set(root(), "older");
    expect(control().value).toBe("newer");
    expect(root().dataset.value).toBe("newer");
    expect(lifecycle).toHaveBeenCalledOnce();
    expect((lifecycle.mock.calls[0]?.[0] as CustomEvent<{ value: string }>).detail.value).toBe(
      "newer",
    );
  });

  it("keeps a newer before-change write when native typing reenters", () => {
    const lifecycle = vi.fn();
    root().addEventListener("jquery-star:search-field:change", lifecycle);
    root().addEventListener("jquery-star:search-field:before-change", (event) => {
      if ((event as CustomEvent<{ value: string }>).detail.value === "draft")
        $.star.ui.searchField.set(root(), "newer");
    });
    control().value = "draft";
    control().dispatchEvent(new Event("input", { bubbles: true }));
    expect(control().value).toBe("newer");
    expect(root().dataset.value).toBe("newer");
    expect(lifecycle).toHaveBeenCalledOnce();
    $.star.ui.searchField.focus(root());
    expect(document.activeElement).toBe(control());
  });

  it("keeps a reentrant replacement binding during old listener cleanup", () => {
    const previous = control();
    const replacement = document.createElement("input");
    replacement.type = "search";
    replacement.name = "query";
    replacement.dataset.part = "control";
    previous.replaceWith(replacement);
    const remove = previous.removeEventListener.bind(previous);
    let reentered = false;
    vi.spyOn(previous, "removeEventListener").mockImplementation((type, listener, options) => {
      remove(type, listener, options);
      if (reentered) return;
      reentered = true;
      $.star.ui.searchField.value(root());
    });
    $.star.ui.enhance(root());
    expect(reentered).toBe(true);
    $.star.ui.searchField.set(root(), "current");
    expect(replacement.value).toBe("current");
    previous.value = "stale";
    previous.dispatchEvent(new Event("input", { bubbles: true }));
    expect(replacement.value).toBe("current");
  });

  it("rejects a missing native search control during enhancement", () => {
    control().remove();
    expect(() => $.star.ui.enhance(root())).toThrow('needs an input data-part="control"');
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

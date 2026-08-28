import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#teams")!;
}

function control(): HTMLSelectElement {
  return root().querySelector<HTMLSelectElement>('[data-part="control"]')!;
}

function listbox(): HTMLElement {
  return root().querySelector<HTMLElement>('[data-part="content"]')!;
}

describe("jQuery Star Multi Select", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <form id="form">
          <label for="team-control">Project teams</label>
          <div id="teams" data-jqs="multi-select" data-placeholder="Choose teams" data-max="3">
            <select id="team-control" data-part="control" name="teams" multiple required>
              <option value="design" selected>Design</option>
              <option value="api">API</option>
              <option value="docs">Documentation</option>
              <option value="qa">Quality</option>
              <option value="legacy" disabled>Legacy</option>
            </select>
            <p data-part="status"></p>
          </div>
        </form>
        <button id="set" data-on:click="@ui.multi-select.set('#teams', ['api', 'docs'])">Set teams</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("keeps the native multiple select as the form source", () => {
    expect($.star.ui.multiSelect.value(root())).toEqual(["design"]);
    expect(new FormData(document.querySelector<HTMLFormElement>("#form")!).getAll("teams")).toEqual(
      ["design"],
    );
    expect(listbox().getAttribute("role")).toBe("listbox");
    expect(listbox().getAttribute("aria-multiselectable")).toBe("true");
    expect(root().querySelector('[data-value="design"]')?.getAttribute("aria-selected")).toBe(
      "true",
    );
    expect(root().querySelector('[data-part="trigger"]')?.textContent).toContain("Design");
  });

  it("separates listbox focus from selection and toggles with Space", () => {
    root().querySelector<HTMLButtonElement>('[data-part="trigger"]')!.click();
    expect(root().dataset.state).toBe("open");
    expect(document.activeElement).toBe(listbox());
    listbox().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    listbox().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: " " }));
    expect($.star.ui.multiSelect.value(root())).toEqual(["design", "api"]);
    expect(root().querySelector('[data-value="api"]')?.getAttribute("aria-selected")).toBe("true");
  });

  it("supports select-all, tags, API, named actions, and the maximum", () => {
    $.star.ui.multiSelect.open(root());
    listbox().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "a", ctrlKey: true }),
    );
    expect($.star.ui.multiSelect.value(root())).toEqual(["design", "api", "docs"]);
    expect(root().querySelectorAll('[data-part="tag"]')).toHaveLength(3);

    $.star.ui.multiSelect.select(root(), "qa");
    expect($.star.ui.multiSelect.value(root())).toHaveLength(3);
    expect(root().querySelector('[data-part="status"]')?.textContent).toContain("no more than 3");

    $("#set").trigger("click");
    expect($.star.ui.multiSelect.value(root())).toEqual(["api", "docs"]);
    root().querySelector<HTMLButtonElement>('[data-part="remove"][data-value="api"]')!.click();
    expect($.star.ui.multiSelect.value(root())).toEqual(["docs"]);
  });

  it("honors canceled changes and accepts server-patched JSON", () => {
    const before = vi.fn((event: Event) => event.preventDefault());
    root().addEventListener("jquery-star:multi-select:before-change", before);
    $.star.ui.multiSelect.set(root(), ["api", "docs"]);
    expect($.star.ui.multiSelect.value(root())).toEqual(["design"]);
    expect(selected()).toEqual(["design"]);
    root().removeEventListener("jquery-star:multi-select:before-change", before);

    root().dataset.value = '["qa","docs"]';
    $.star.ui.enhance(root());
    expect($.star.ui.multiSelect.value(root())).toEqual(["docs", "qa"]);
    expect(selected()).toEqual(["docs", "qa"]);
  });

  function selected(): string[] {
    return Array.from(control().selectedOptions).map((option) => option.value);
  }
});

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

  it.each([
    [
      "nested control",
      '<div data-part="control"><select multiple></select></div>',
      'needs a direct select[data-part="control"]',
    ],
    [
      "wrong direct element",
      '<div data-part="control"></div>',
      'needs a direct select[data-part="control"]',
    ],
    [
      "wrong direct part",
      '<select data-part="other" multiple></select>',
      'needs a direct select[data-part="control"]',
    ],
    [
      "single select",
      '<select data-part="control"></select>',
      "control needs the multiple attribute",
    ],
  ])("rejects a %s", (_kind, markup, message) => {
    const invalid = document.createElement("div");
    invalid.id = "invalid-multi-select";
    invalid.dataset.jqs = "multi-select";
    invalid.innerHTML = markup;
    document.body.append(invalid);

    expect(() => $.star.ui.enhance(invalid)).toThrow(message);
    invalid.remove();
  });

  it("recreates a missing status with the native paragraph part", () => {
    expect(root().querySelector('[data-part="content"]')?.tagName).toBe("DIV");
    expect(root().querySelector('[data-part="tags"]')?.tagName).toBe("DIV");
    root().querySelector('[data-part="status"]')?.remove();

    $.star.ui.enhance(root());

    const status = root().querySelector<HTMLElement>('[data-part="status"]');
    expect(status?.tagName).toBe("P");
    expect(status?.dataset.generated).toBe("");
    expect(status?.getAttribute("aria-live")).toBe("polite");
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

  it("skips disabled options while wrapping keyboard focus", () => {
    const qa = root().querySelector<HTMLElement>('[data-part="option"][data-value="qa"]');
    const legacy = root().querySelector<HTMLElement>('[data-part="option"][data-value="legacy"]');
    expect(qa).toBeTruthy();
    expect(legacy?.getAttribute("aria-disabled")).toBe("true");
    expect(legacy?.getAttribute("data-disabled")).toBe("");
    $.star.ui.multiSelect.open(root());

    listbox().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }));
    expect(listbox().getAttribute("aria-activedescendant")).toBe(qa?.id);

    listbox().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    const design = root().querySelector<HTMLElement>('[data-part="option"][data-value="design"]');
    expect(listbox().getAttribute("aria-activedescendant")).toBe(design?.id);
    expect($.star.ui.multiSelect.value(root())).toEqual(["design"]);
  });

  it("ignores listbox background and disabled-option clicks", () => {
    $.star.ui.multiSelect.open(root());
    const active = listbox().getAttribute("aria-activedescendant");
    const disabled = root().querySelector<HTMLElement>('[data-part="option"][data-value="legacy"]');
    if (!disabled) throw new Error("Missing generated disabled option.");

    const errors: Event[] = [];
    const captureError = (event: Event): void => {
      errors.push(event);
      event.preventDefault();
    };
    window.addEventListener("error", captureError);
    try {
      listbox().click();
      disabled.click();
    } finally {
      window.removeEventListener("error", captureError);
    }

    expect(errors).toHaveLength(0);
    expect($.star.ui.multiSelect.value(root())).toEqual(["design"]);
    expect(listbox().getAttribute("aria-activedescendant")).toBe(active);
  });

  it("ignores a rendered option marked aria-disabled", () => {
    $.star.ui.multiSelect.open(root());
    const active = listbox().getAttribute("aria-activedescendant");
    const option = root().querySelector<HTMLElement>('[data-part="option"][data-value="api"]');
    if (!option) throw new Error("Missing generated option fixture.");
    expect(option.hasAttribute("aria-disabled")).toBe(false);

    option.setAttribute("aria-disabled", "true");
    option.click();

    expect($.star.ui.multiSelect.value(root())).toEqual(["design"]);
    expect(listbox().getAttribute("aria-activedescendant")).toBe(active);
  });

  it("toggles an enabled option when clicked", () => {
    $.star.ui.multiSelect.open(root());
    const option = root().querySelector<HTMLElement>('[data-part="option"][data-value="api"]');
    if (!option) throw new Error("Missing generated enabled option.");

    option.click();

    expect($.star.ui.multiSelect.value(root())).toEqual(["design", "api"]);
    expect(option.getAttribute("aria-selected")).toBe("true");
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

  it("uses an explicit native root in value actions and rejects a different component", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Multi Select application did not start.");
    await app.run("ui.multi-select.set", { args: [root(), ["api", "docs"]] });
    expect($.star.ui.multiSelect.value(root())).toEqual(["api", "docs"]);
    await app.run("ui.multi-select.select", { args: [root(), "qa", true] });
    expect($.star.ui.multiSelect.value(root())).toEqual(["api", "docs", "qa"]);
    const foreign = document.getElementById("set");
    if (!foreign) throw new Error("Missing Multi Select external action.");
    await expect(
      app.run("ui.multi-select.set", { element: control(), args: [foreign, ["design"]] }),
    ).rejects.toThrow('Multi Select target did not match data-jqs="multi-select"');
    expect($.star.ui.multiSelect.value(root())).toEqual(["api", "docs", "qa"]);
    await app.run("ui.multi-select.select", { element: control(), args: ["api", false] });
    expect($.star.ui.multiSelect.value(root())).toEqual(["docs", "qa"]);
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

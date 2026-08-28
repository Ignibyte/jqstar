import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function menu(): HTMLElement {
  return document.querySelector<HTMLElement>("#menu")!;
}

function trigger(): HTMLButtonElement {
  return menu().querySelector<HTMLButtonElement>(':scope > [data-part="trigger"]')!;
}

function content(): HTMLElement {
  return menu().querySelector<HTMLElement>(':scope > [data-part="content"]')!;
}

function item(value: string): HTMLElement {
  return content().querySelector<HTMLElement>(`[data-value="${value}"]`)!;
}

describe("jQuery Star Dropdown Menu", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.menu.open('#menu')">Open menu</button>
        <div id="menu" data-jqs="menu">
          <button data-part="trigger">Actions</button>
          <div data-part="content">
            <div data-part="label">Actions</div>
            <button data-part="item" data-value="alpha">Alpha</button>
            <button data-part="checkbox-item" data-value="persistent" data-checked="true" data-close-on-select="false">Persistent</button>
            <button data-part="item" data-value="disabled" data-disabled>Disabled</button>
            <div data-part="radio-group">
              <button data-part="radio-item" data-value="compact" data-checked="true">Compact</button>
              <button data-part="radio-item" data-value="comfortable">Comfortable</button>
            </div>
            <div data-part="separator"></div>
            <button data-part="item" data-value="omega">Omega</button>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    if (menu().dataset.state === "open") $.star.ui.menu.close(menu());
    $("#app").star("destroy");
  });

  it("wires menu-button semantics, item roles, checked state, and separators", () => {
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-controls")).toBe(content().id);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(content().getAttribute("role")).toBe("menu");
    expect(content().getAttribute("aria-labelledby")).toBe(trigger().id);
    expect(content().hidden).toBe(true);
    expect(item("alpha").getAttribute("role")).toBe("menuitem");
    expect(item("persistent").getAttribute("role")).toBe("menuitemcheckbox");
    expect(item("persistent").getAttribute("aria-checked")).toBe("true");
    expect(item("compact").getAttribute("role")).toBe("menuitemradio");
    expect(content().querySelector('[data-part="separator"]')?.getAttribute("role")).toBe(
      "separator",
    );
  });

  it("opens to first or last item and supports wrapping navigation", () => {
    trigger().click();
    expect(content().hidden).toBe(false);
    expect(document.activeElement).toBe(item("alpha"));

    item("alpha").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }));
    expect(document.activeElement).toBe(item("omega"));
    item("omega").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect(document.activeElement).toBe(item("alpha"));
    item("alpha").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
    expect(document.activeElement).toBe(item("omega"));
    $.star.ui.menu.close(menu());

    trigger().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowUp" }));
    expect(document.activeElement).toBe(item("omega"));
  });

  it("handles disabled, checkbox, radio, close-on-select, and cancelable selection", () => {
    trigger().click();
    item("persistent").click();
    expect(item("persistent").getAttribute("aria-checked")).toBe("false");
    expect(menu().dataset.state).toBe("open");

    item("disabled").click();
    expect(menu().dataset.state).toBe("open");
    item("comfortable").click();
    expect(item("compact").getAttribute("aria-checked")).toBe("false");
    expect(item("comfortable").getAttribute("aria-checked")).toBe("true");
    expect(menu().dataset.state).toBe("closed");
    expect(document.activeElement).toBe(trigger());

    trigger().click();
    const prevent = vi.fn((event: Event) => event.preventDefault());
    menu().addEventListener("jquery-star:menu:select", prevent);
    item("alpha").click();
    expect(prevent).toHaveBeenCalledOnce();
    expect(menu().dataset.state).toBe("open");
  });

  it("supports typeahead and restores trigger focus on Escape", () => {
    trigger().click();
    item("alpha").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "o" }));
    expect(document.activeElement).toBe(item("omega"));
    item("omega").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(menu().dataset.state).toBe("closed");
    expect(document.activeElement).toBe(trigger());
  });

  it("supports named actions, APIs, and re-enhancement after a server morph", () => {
    $("#external").trigger("click");
    expect(menu().dataset.state).toBe("open");
    $.star.ui.menu.close("#menu");
    expect(menu().dataset.state).toBe("closed");

    trigger().click();
    item("alpha").remove();
    $.star.ui.enhance(menu());
    expect(document.activeElement).toBe(item("persistent"));
    expect(item("persistent").getAttribute("role")).toBe("menuitemcheckbox");
  });
});

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

  it("rejects a wrong-kind element target without opening the nearby menu", async () => {
    const app = $("#app").star("instance");
    if (!app) throw new Error("The Menu application did not start.");
    await expect(
      app.run("ui.menu.open", { element: trigger(), args: [trigger()] }),
    ).rejects.toThrow('Menu target did not match a data-jqs="menu" element');
    expect(menu().dataset.state).toBe("closed");
    await app.run("ui.menu.open", { args: [menu()] });
    expect(menu().dataset.state).toBe("open");
    await app.run("ui.menu.close", { args: ["#menu"] });
    expect(menu().dataset.state).toBe("closed");
    await app.run("ui.menu.open", { element: trigger() });
    expect(menu().dataset.state).toBe("open");
  });

  it("wires menu-button semantics, item roles, checked state, and separators", () => {
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().getAttribute("aria-controls")).toBe(content().id);
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(content().getAttribute("role")).toBe("menu");
    expect(content().getAttribute("aria-labelledby")).toBe(trigger().id);
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(document.body);
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

  it("lets authored disabled items be explored but skips native disabled items", () => {
    const selected = vi.fn();
    menu().addEventListener("jquery-star:menu:select", selected);
    trigger().click();
    item("persistent").focus();
    item("persistent").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }),
    );
    expect(document.activeElement).toBe(item("disabled"));
    item("disabled").click();
    expect(selected).not.toHaveBeenCalled();
    expect(menu().dataset.state).toBe("open");

    item("omega").setAttribute("disabled", "");
    item("omega").dispatchEvent(new Event("pointermove", { bubbles: true }));
    expect(document.activeElement).toBe(item("disabled"));
    item("disabled").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
    expect(document.activeElement).toBe(item("comfortable"));

    item("omega").removeAttribute("disabled");
    item("omega").setAttribute("aria-disabled", "true");
    item("omega").dispatchEvent(new Event("pointermove", { bubbles: true }));
    expect(document.activeElement).toBe(item("omega"));
    item("omega").click();
    expect(selected).not.toHaveBeenCalled();
    expect(menu().dataset.state).toBe("open");
  });

  it("reflects external native popover toggles and still dismisses outside", () => {
    const panel = content();
    let nativeOpen = false;
    const matches = panel.matches.bind(panel);
    vi.spyOn(panel, "matches").mockImplementation((selector) =>
      selector === ":popover-open" ? nativeOpen : matches(selector),
    );
    panel.showPopover = () => {
      nativeOpen = true;
    };
    panel.hidePopover = () => {
      nativeOpen = false;
    };
    panel.hidden = false;
    const opened = vi.fn();
    const closed = vi.fn();
    menu().addEventListener("jquery-star:menu:open", opened);
    menu().addEventListener("jquery-star:menu:close", closed);

    $.star.ui.enhance(menu());
    trigger().click();
    expect(nativeOpen).toBe(true);
    expect(menu().dataset.state).toBe("open");
    nativeOpen = false;
    panel.dispatchEvent(new Event("toggle"));
    expect(menu().dataset.state).toBe("closed");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");

    nativeOpen = true;
    panel.dispatchEvent(new Event("toggle"));
    expect(menu().dataset.state).toBe("open");
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(nativeOpen).toBe(false);
    expect(menu().dataset.state).toBe("closed");
    expect(opened).toHaveBeenCalledOnce();
    expect(closed).toHaveBeenCalledOnce();
  });

  it("preserves focus inside an open menu during re-enhancement", () => {
    trigger().click();
    item("omega").focus();
    content().style.removeProperty("left");
    content().style.removeProperty("top");
    delete content().dataset.side;
    delete content().dataset.align;

    $.star.ui.enhance(menu());

    expect(document.activeElement).toBe(item("omega"));
    expect(content().style.left).not.toBe("");
    expect(content().style.top).not.toBe("");
    expect(content().dataset.side).toMatch(/^(top|bottom)$/);
    expect(content().dataset.align).toBe("start");
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

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#context-menu")!;
}

function trigger(): HTMLElement {
  return root().querySelector<HTMLElement>(':scope > [data-part="trigger"]')!;
}

function content(): HTMLElement {
  return root().querySelector<HTMLElement>(':scope > [data-part="content"]')!;
}

function item(value: string): HTMLElement {
  return content().querySelector<HTMLElement>(`[data-value="${value}"]`)!;
}

describe("jQuery Star Context Menu", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="open-context" data-on:click="@ui.context-menu.open('#context-menu', 24, 32)">Open context actions</button>
        <div id="context-menu" data-jqs="context-menu">
          <div data-part="trigger" tabindex="0">Canvas</div>
          <div data-part="content" aria-label="Canvas actions">
            <button data-part="item" data-value="duplicate">Duplicate</button>
            <button data-part="checkbox-item" data-value="snap" data-checked="true" data-close-on-select="false">Snap to grid</button>
            <button data-part="item" data-value="delete">Delete</button>
          </div>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    vi.useRealTimers();
    if (root().dataset.state === "open") $.star.ui.contextMenu.close(root());
    $("#app").star("destroy");
  });

  it("shares complete menu semantics without turning a normal click into a trigger", () => {
    expect(trigger().getAttribute("aria-haspopup")).toBe("menu");
    expect(trigger().hasAttribute("aria-expanded")).toBe(false);
    expect(content().getAttribute("role")).toBe("menu");
    expect(item("duplicate").getAttribute("role")).toBe("menuitem");
    expect(item("snap").getAttribute("role")).toBe("menuitemcheckbox");
    expect(content().hidden).toBe(true);

    trigger().click();
    expect(root().dataset.state).toBe("closed");
  });

  it("opens at pointer coordinates, focuses the first item, and emits its own events", () => {
    const selected = vi.fn();
    root().addEventListener("jquery-star:context-menu:select", selected);
    trigger().dispatchEvent(
      new MouseEvent("contextmenu", { bubbles: true, cancelable: true, clientX: 120, clientY: 80 }),
    );

    expect(root().dataset.state).toBe("open");
    expect(content().style.left).toBe("120px");
    expect(content().style.top).toBe("80px");
    expect(document.activeElement).toBe(item("duplicate"));

    item("duplicate").click();
    expect(selected).toHaveBeenCalledOnce();
    expect(root().dataset.state).toBe("closed");
    expect(document.activeElement).toBe(trigger());
  });

  it("supports Shift+F10, menu navigation, persistent checked items, and Escape", () => {
    trigger().focus();
    trigger().dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, cancelable: true, key: "F10", shiftKey: true }),
    );
    expect(document.activeElement).toBe(item("duplicate"));

    item("duplicate").dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }),
    );
    expect(document.activeElement).toBe(item("snap"));
    item("snap").click();
    expect(item("snap").getAttribute("aria-checked")).toBe("false");
    expect(root().dataset.state).toBe("open");

    item("snap").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(root().dataset.state).toBe("closed");
    expect(document.activeElement).toBe(trigger());
  });

  it("opens from a stationary touch long-press", () => {
    vi.useFakeTimers();
    const event = new Event("pointerdown", { bubbles: true });
    Object.defineProperties(event, {
      clientX: { value: 64 },
      clientY: { value: 72 },
      pointerType: { value: "touch" },
    });
    trigger().dispatchEvent(event);
    vi.advanceTimersByTime(550);
    expect(root().dataset.state).toBe("open");
    expect(content().style.left).toBe("64px");
    expect(document.activeElement).toBe(item("duplicate"));
  });

  it("supports APIs, named actions, cancelable opening, and server re-enhancement", () => {
    const cancel = vi.fn((event: Event) => event.preventDefault());
    root().addEventListener("jquery-star:context-menu:before-open", cancel, { once: true });
    $.star.ui.contextMenu.open("#context-menu", 40, 50);
    expect(cancel).toHaveBeenCalledOnce();
    expect(root().dataset.state).toBe("closed");

    $("#open-context").trigger("click");
    expect(root().dataset.state).toBe("open");
    expect(content().style.left).toBe("24px");

    item("duplicate").remove();
    $.star.ui.enhance(root());
    expect(document.activeElement).toBe(item("snap"));
  });
});

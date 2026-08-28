import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function popover(): HTMLElement {
  return document.querySelector<HTMLElement>("#popover")!;
}

function trigger(): HTMLButtonElement {
  return popover().querySelector<HTMLButtonElement>(':scope > [data-part="trigger"]')!;
}

function content(): HTMLElement {
  return popover().querySelector<HTMLElement>(':scope > [data-part="content"]')!;
}

describe("jQuery Star Popover", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.popover.open('#popover')">Open externally</button>
        <div id="popover" data-jqs="popover" data-initial-focus="#inside">
          <button data-part="trigger">Open</button>
          <div data-part="content">
            <h2 data-part="title">Popover title</h2>
            <button id="inside">Inside</button>
            <button id="close" data-on:click="@ui.popover.close">Close</button>
          </div>
        </div>
        <button id="outside">Outside</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("wires the trigger, dialog relationship, title, and closed state", () => {
    expect(trigger().getAttribute("aria-controls")).toBe(content().id);
    expect(trigger().getAttribute("aria-haspopup")).toBe("dialog");
    expect(trigger().getAttribute("aria-expanded")).toBe("false");
    expect(content().getAttribute("role")).toBe("dialog");
    expect(content().getAttribute("aria-labelledby")).toBe("popover-title");
    expect(content().getAttribute("popover")).toBe("manual");
    expect(content().hidden).toBe(true);
    expect(popover().dataset.state).toBe("closed");
  });

  it("opens from its trigger and closes from a local named action", () => {
    const opened = vi.fn();
    const closed = vi.fn();
    popover().addEventListener("jquery-star:popover:open", opened);
    popover().addEventListener("jquery-star:popover:close", closed);

    trigger().click();
    expect(content().hidden).toBe(false);
    expect(trigger().getAttribute("aria-expanded")).toBe("true");
    expect(document.activeElement).toBe(document.querySelector("#inside"));
    expect(opened).toHaveBeenCalledOnce();

    $("#close").trigger("click");
    expect(content().hidden).toBe(true);
    expect(document.activeElement).toBe(trigger());
    expect(closed).toHaveBeenCalledOnce();
  });

  it("supports its API, external action, Escape, outside press, and cancelable events", () => {
    const preventOpen = (event: Event): void => event.preventDefault();
    popover().addEventListener("jquery-star:popover:before-open", preventOpen);
    $.star.ui.popover.open(popover());
    expect(content().hidden).toBe(true);
    popover().removeEventListener("jquery-star:popover:before-open", preventOpen);

    $("#external").trigger("click");
    expect(content().hidden).toBe(false);
    document.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Escape" }));
    expect(content().hidden).toBe(true);

    $.star.ui.popover.toggle("#popover");
    document
      .querySelector("#outside")!
      .dispatchEvent(new MouseEvent("pointerdown", { bubbles: true }));
    expect(content().hidden).toBe(true);
  });

  it("re-enhances a replaced trigger without duplicate activation", () => {
    const replacement = document.createElement("button");
    replacement.dataset.part = "trigger";
    replacement.textContent = "Replacement";
    trigger().replaceWith(replacement);
    $.star.ui.enhance(popover());

    replacement.click();
    expect(popover().dataset.state).toBe("open");
    expect(replacement.getAttribute("aria-expanded")).toBe("true");
    replacement.click();
    expect(popover().dataset.state).toBe("closed");
  });

  it("keeps an open popover usable when server morphing replaces its content", () => {
    $.star.ui.popover.open(popover());
    const replacement = document.createElement("div");
    replacement.dataset.part = "content";
    replacement.innerHTML = '<h2 data-part="title">Replaced title</h2><button>New action</button>';
    content().replaceWith(replacement);
    $.star.ui.enhance(popover());

    expect(replacement.hidden).toBe(false);
    expect(replacement.dataset.state).toBe("open");
    expect(replacement.getAttribute("role")).toBe("dialog");
    expect(trigger().getAttribute("aria-controls")).toBe(replacement.id);
    $.star.ui.popover.close(popover());
    expect(replacement.hidden).toBe(true);
  });
});

import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function details(selector: string): HTMLDetailsElement {
  return document.querySelector<HTMLDetailsElement>(selector)!;
}

describe("jQuery Star disclosure components", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.collapsible.toggle('#more')">Toggle</button>
        <details id="more" data-jqs="collapsible">
          <summary data-part="trigger">More</summary>
          <div data-part="content">More content</div>
        </details>

        <div id="single" data-jqs="accordion" data-mode="single" data-collapsible="false">
          <details id="first" data-part="item" open>
            <summary data-part="trigger">First</summary>
            <div data-part="content">First content</div>
          </details>
          <details id="second" data-part="item">
            <summary data-part="trigger">Second</summary>
            <div data-part="content">Second content</div>
          </details>
          <details id="third" data-part="item">
            <summary data-part="trigger">Third</summary>
            <div data-part="content">Third content</div>
          </details>
        </div>

        <div id="multiple" data-jqs="accordion" data-mode="multiple">
          <details id="multi-a" data-part="item" open>
            <summary data-part="trigger">Multi A</summary>
            <div data-part="content">A</div>
          </details>
          <details id="multi-b" data-part="item">
            <summary data-part="trigger">Multi B</summary>
            <div data-part="content">B</div>
          </details>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("wires disclosure state and accessible relationships", () => {
    const item = details("#more");
    const trigger = item.querySelector("summary")!;
    const content = item.querySelector<HTMLElement>("[data-part=content]")!;

    expect(item.dataset.state).toBe("closed");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(trigger.getAttribute("aria-controls")).toBe(content.id);
    expect(content.getAttribute("role")).toBe("region");
    expect(content.getAttribute("aria-labelledby")).toBe(trigger.id);
  });

  it("opens, closes, and toggles through APIs and named actions", () => {
    const item = details("#more");
    const opened = vi.fn();
    item.addEventListener("jquery-star:collapsible:open", opened);

    $.star.ui.collapsible.open(item);
    expect(item.open).toBe(true);
    expect(item.dataset.state).toBe("open");
    expect(opened).toHaveBeenCalledOnce();

    $.star.ui.collapsible.close(item);
    expect(item.open).toBe(false);

    $("#external").trigger("click");
    expect(item.open).toBe(true);
  });

  it("honors cancelable before events", () => {
    const item = details("#more");
    const prevent = (event: Event): void => event.preventDefault();
    item.addEventListener("jquery-star:collapsible:before-open", prevent);

    $.star.ui.collapsible.open(item);
    expect(item.open).toBe(false);
  });

  it("keeps one item open in a required single accordion", () => {
    const first = details("#first");
    const second = details("#second");

    expect(first.name).toBe(second.name);
    expect(first.querySelector("summary")?.getAttribute("aria-disabled")).toBe("true");
    $.star.ui.accordion.close(first);
    expect(first.open).toBe(true);

    $.star.ui.accordion.open(second);
    expect(first.open).toBe(false);
    expect(second.open).toBe(true);
    expect(second.querySelector("summary")?.getAttribute("aria-disabled")).toBe("true");
  });

  it("allows multiple accordion items to remain open", () => {
    const first = details("#multi-a");
    const second = details("#multi-b");

    expect(first.hasAttribute("name")).toBe(false);
    $.star.ui.accordion.open(second);
    expect(first.open).toBe(true);
    expect(second.open).toBe(true);
  });

  it("moves focus between accordion headers with optional navigation keys", () => {
    const first = details("#first").querySelector<HTMLElement>("summary")!;
    const second = details("#second").querySelector<HTMLElement>("summary")!;
    const third = details("#third").querySelector<HTMLElement>("summary")!;

    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    expect(document.activeElement).toBe(second);
    second.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
    expect(document.activeElement).toBe(third);
    third.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect(document.activeElement).toBe(first);
  });
});

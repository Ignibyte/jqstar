import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(selector = "#tabs"): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

function trigger(value: string, selector = "#tabs"): HTMLButtonElement {
  return root(selector).querySelector<HTMLButtonElement>(
    `[data-part=trigger][data-value=${value}]`,
  )!;
}

function panel(value: string, selector = "#tabs"): HTMLElement {
  return root(selector).querySelector<HTMLElement>(`[data-part=panel][data-value=${value}]`)!;
}

describe("jQuery Star Tabs", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="external" data-on:click="@ui.tabs.activate('#tabs', 'three')">Third</button>
        <div id="tabs" data-jqs="tabs" data-activation="manual" data-value="one">
          <div data-part="list" aria-label="Manual tabs">
            <button data-part="trigger" data-value="one">One</button>
            <button data-part="trigger" data-value="two">Two</button>
            <button data-part="trigger" data-value="disabled" disabled>Disabled</button>
            <button data-part="trigger" data-value="three">Three</button>
          </div>
          <section data-part="panel" data-value="one">One panel</section>
          <section data-part="panel" data-value="two">Two panel</section>
          <section data-part="panel" data-value="disabled">Disabled panel</section>
          <section data-part="panel" data-value="three"><a href="#next">Three panel</a></section>
        </div>

        <div id="automatic" data-jqs="tabs" data-orientation="vertical">
          <div data-part="list" aria-label="Automatic tabs">
            <button data-part="trigger" data-value="a">A</button>
            <button data-part="trigger" data-value="b">B</button>
          </div>
          <section data-part="panel" data-value="a">A panel</section>
          <section data-part="panel" data-value="b">B panel</section>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
  });

  it("wires roles, relationships, roving focus, and panel visibility", () => {
    const first = trigger("one");
    const second = trigger("two");

    expect(first.closest("[data-part=list]")?.getAttribute("role")).toBe("tablist");
    expect(first.getAttribute("role")).toBe("tab");
    expect(first.getAttribute("aria-selected")).toBe("true");
    expect(first.tabIndex).toBe(0);
    expect(second.tabIndex).toBe(-1);
    expect(first.getAttribute("aria-controls")).toBe(panel("one").id);
    expect(panel("one").getAttribute("role")).toBe("tabpanel");
    expect(panel("one").hidden).toBe(false);
    expect(panel("two").hidden).toBe(true);
    expect(panel("one").tabIndex).toBe(0);
    expect(panel("three").hasAttribute("tabindex")).toBe(false);
  });

  it("activates through the API and named action with cancelable events", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:tabs:change", changed);

    $.star.ui.tabs.activate(root(), "two");
    expect($.star.ui.tabs.value(root())).toBe("two");
    expect(panel("two").hidden).toBe(false);
    expect(changed).toHaveBeenCalledOnce();

    $("#external").trigger("click");
    expect($.star.ui.tabs.value(root())).toBe("three");

    root().addEventListener("jquery-star:tabs:before-change", (event) => event.preventDefault());
    $.star.ui.tabs.activate(root(), "one");
    expect($.star.ui.tabs.value(root())).toBe("three");
  });

  it("keeps manual arrow navigation separate from activation", () => {
    const first = trigger("one");
    const second = trigger("two");
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));

    expect(document.activeElement).toBe(second);
    expect($.star.ui.tabs.value(root())).toBe("one");
    second.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    expect($.star.ui.tabs.value(root())).toBe("two");
  });

  it("skips disabled tabs and supports Home and End", () => {
    const second = trigger("two");
    const third = trigger("three");
    second.focus();
    second.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect(document.activeElement).toBe(third);
    third.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect(document.activeElement).toBe(trigger("one"));
    trigger("one").dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "End" }));
    expect(document.activeElement).toBe(third);
  });

  it("automatically activates focused vertical tabs", () => {
    const first = trigger("a", "#automatic");
    const second = trigger("b", "#automatic");
    first.focus();
    first.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));

    expect(document.activeElement).toBe(second);
    expect($.star.ui.tabs.value(root("#automatic"))).toBe("b");
    expect(second.closest("[data-part=list]")?.getAttribute("aria-orientation")).toBe("vertical");
  });

  it("re-enhances replaced triggers and applies externally patched values", () => {
    const list = root().querySelector<HTMLElement>("[data-part=list]")!;
    trigger("two").replaceWith(
      Object.assign(document.createElement("button"), {
        textContent: "Two replaced",
      }),
    );
    const replacement = list.children[1] as HTMLElement;
    replacement.dataset.part = "trigger";
    replacement.dataset.value = "two";
    root().dataset.value = "two";
    $.star.ui.enhance(root());

    expect(replacement.getAttribute("role")).toBe("tab");
    expect(replacement.getAttribute("aria-selected")).toBe("true");
    expect(panel("two").hidden).toBe(false);
  });
});

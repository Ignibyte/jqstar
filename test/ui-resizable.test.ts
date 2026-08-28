import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(selector = "#split"): HTMLElement {
  return document.querySelector<HTMLElement>(selector)!;
}

function handle(index = 0, selector = "#split"): HTMLElement {
  return root(selector).querySelectorAll<HTMLElement>('[data-part="handle"]')[index]!;
}

describe("jQuery Star Resizable Panels", () => {
  beforeEach(() => {
    const values = new Map<string, string>();
    vi.stubGlobal("localStorage", {
      clear: () => values.clear(),
      getItem: (key: string) => values.get(key) ?? null,
      removeItem: (key: string) => values.delete(key),
      setItem: (key: string, value: string) => values.set(key, String(value)),
    });
    localStorage.clear();
    document.body.innerHTML = `
      <main id="app">
        <div id="split" data-jqs="resizable" data-value="[30,70]" data-step="5">
          <section id="navigation" data-part="panel" data-min="20" data-max="60">Navigation</section>
          <div data-part="handle" aria-label="Resize navigation"></div>
          <section data-part="panel" data-min="30">Content</section>
        </div>
        <button id="external" data-on:click="@ui.resizable.resize('#split', 0, 40)">Resize</button>

        <div id="vertical" data-jqs="resizable" data-orientation="vertical" data-value="[25,50,25]">
          <section data-part="panel" data-default-size="25">Header</section>
          <div data-part="handle" aria-label="Resize header"></div>
          <section data-part="panel" data-default-size="50">Content</section>
          <div data-part="handle" aria-label="Resize content"></div>
          <section data-part="panel" data-default-size="25">Footer</section>
        </div>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("creates focusable splitter semantics and constrained grid tracks", () => {
    expect($.star.ui.resizable.value(root())).toEqual([30, 70]);
    expect(handle().getAttribute("role")).toBe("separator");
    expect(handle().getAttribute("aria-orientation")).toBe("vertical");
    expect(handle().getAttribute("aria-controls")).toBe("navigation");
    expect(handle().getAttribute("aria-valuemin")).toBe("20");
    expect(handle().getAttribute("aria-valuemax")).toBe("60");
    expect(handle().getAttribute("aria-valuenow")).toBe("30");
    expect(root().style.gridTemplateColumns).toContain("30fr");
  });

  it("resizes with orientation-aware arrows, Home, End, and collapse restore", () => {
    handle().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowRight" }));
    expect($.star.ui.resizable.value(root())).toEqual([35, 65]);
    expect(handle().getAttribute("aria-valuenow")).toBe("35");

    handle().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    expect($.star.ui.resizable.value(root())).toEqual([20, 80]);
    handle().dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Enter" }));
    expect($.star.ui.resizable.value(root())).toEqual([35, 65]);

    const vertical = handle(0, "#vertical");
    vertical.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    expect($.star.ui.resizable.value(root("#vertical"))).toEqual([30, 45, 25]);
    vertical.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "Home" }));
    expect($.star.ui.resizable.value(root("#vertical"))[0]).toBe(0);
  });

  it("supports APIs, named actions, cancellation, reset, and server patches", () => {
    const changed = vi.fn();
    root().addEventListener("jquery-star:resizable:change", changed);
    $.star.ui.resizable.resize(root(), 0, 45);
    expect($.star.ui.resizable.value(root())).toEqual([45, 55]);

    root().addEventListener("jquery-star:resizable:before-change", (event) => {
      const detail = (event as CustomEvent<{ sizes: number[] }>).detail;
      if ((detail.sizes[0] ?? 0) > 50) event.preventDefault();
    });
    $.star.ui.resizable.resize(root(), 0, 55);
    expect($.star.ui.resizable.value(root())).toEqual([45, 55]);

    $("#external").trigger("click");
    expect($.star.ui.resizable.value(root())).toEqual([40, 60]);
    expect(changed).toHaveBeenCalledTimes(2);

    $.star.ui.resizable.set(root("#vertical"), [20, 60, 20]);
    expect($.star.ui.resizable.value(root("#vertical"))).toEqual([20, 60, 20]);
    $.star.ui.resizable.reset(root("#vertical"));
    expect($.star.ui.resizable.value(root("#vertical"))).toEqual([25, 50, 25]);

    root().dataset.value = "[50,50]";
    $.star.ui.enhance(root());
    expect($.star.ui.resizable.value(root())).toEqual([50, 50]);
  });

  it("persists an authored storage key without making storage mandatory", () => {
    root().dataset.storageKey = "workspace";
    $.star.ui.enhance(root());
    $.star.ui.resizable.resize(root(), 0, 42);
    expect(localStorage.getItem("jquery-star:resizable:workspace")).toBe("[42,58]");

    const copy = document.createElement("div");
    copy.id = "stored-copy";
    copy.dataset.jqs = "resizable";
    copy.dataset.storageKey = "workspace";
    copy.innerHTML = `
      <section data-part="panel" data-min="20">Navigation</section>
      <div data-part="handle"></div>
      <section data-part="panel">Content</section>
    `;
    document.body.append(copy);
    $.star.ui.enhance(copy);
    expect($.star.ui.resizable.value(copy)).toEqual([42, 58]);
  });
});

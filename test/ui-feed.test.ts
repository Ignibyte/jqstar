import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function item(value: string): string {
  return `<article data-jqs="item" data-part="item" data-value="${value}">
    <h3 data-part="title">${value}</h3>
    <p data-part="description">Description for ${value}</p>
  </article>`;
}

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#results-feed")!;
}

function entries(): HTMLElement[] {
  return Array.from(
    root().querySelectorAll<HTMLElement>('[data-part="content"] > [data-part="item"]'),
  );
}

describe("jQuery Star Feed", () => {
  beforeEach(() => {
    document.body.innerHTML = `
      <main id="app">
        <button id="before">Before feed</button>
        <section id="results-feed" data-jqs="feed" data-cursor="2" aria-labelledby="results-title">
          <h2 id="results-title">Component results</h2>
          <div data-part="content">${item("jQuery Star")}${item("Datastar")}</div>
          <button data-part="more" data-on:click="@appendResults">Load more</button>
          <div data-part="sentinel" aria-hidden="true"></div>
          <p data-part="status">2 results loaded.</p>
        </section>
        <button id="after">After feed</button>
      </main>
    `;
    $.star.action("appendResults", () => {
      root()
        .querySelector('[data-part="content"]')!
        .insertAdjacentHTML("beforeend", item("Tailwind CSS"));
      $.star.ui.feed.complete(root(), { added: 1, cursor: "3", done: true });
    });
    $.star.ui.enhance(document);
    $("#app").star();
  });

  afterEach(() => {
    $("#app").star("destroy");
    vi.unstubAllGlobals();
  });

  it("applies the feed and article accessibility contract", () => {
    const content = root().querySelector<HTMLElement>('[data-part="content"]')!;
    expect(content.getAttribute("role")).toBe("feed");
    expect(content.getAttribute("aria-labelledby")).toBe("results-title");
    expect(content.getAttribute("aria-busy")).toBe("false");
    expect(entries()[0]!.getAttribute("aria-posinset")).toBe("1");
    expect(entries()[0]!.getAttribute("aria-setsize")).toBe("-1");
    expect(entries()[0]!.getAttribute("aria-labelledby")).toContain("title");
    expect(entries()[0]!.getAttribute("aria-describedby")).toContain("description");
    expect(entries()[0]!.tabIndex).toBe(0);
  });

  it("routes the visible button and API through one authored load action", async () => {
    const beforeLoad = vi.fn();
    const load = vi.fn();
    const complete = vi.fn();
    root().addEventListener("jquery-star:feed:before-load", beforeLoad);
    root().addEventListener("jquery-star:feed:load", load);
    root().addEventListener("jquery-star:feed:complete", complete);

    $.star.ui.feed.load(root());
    await vi.waitFor(() => expect(entries()).toHaveLength(3));
    expect(beforeLoad).toHaveBeenCalledOnce();
    expect(load).toHaveBeenCalledOnce();
    expect(complete).toHaveBeenCalledOnce();
    expect($.star.ui.feed.state(root())).toEqual({ cursor: "3", done: true, loading: false });
    expect(entries()[2]!.getAttribute("aria-posinset")).toBe("3");
    expect(entries()[2]!.getAttribute("aria-setsize")).toBe("3");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("All 3 items loaded.");
  });

  it("supports loading, failure, reset, and canceled requests", () => {
    const more = root().querySelector<HTMLButtonElement>('[data-part="more"]')!;
    const cancel = (event: Event): void => event.preventDefault();
    root().addEventListener("jquery-star:feed:before-load", cancel);
    more.click();
    expect($.star.ui.feed.state(root()).loading).toBe(false);
    root().removeEventListener("jquery-star:feed:before-load", cancel);

    $(more).off("click");
    more.click();
    expect(root().querySelector('[data-part="content"]')?.getAttribute("aria-busy")).toBe("true");
    $.star.ui.feed.fail(root(), "The backend is unavailable.");
    expect(root().dataset.state).toBe("error");
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe(
      "The backend is unavailable.",
    );
    $.star.ui.feed.reset(root(), { cursor: "0", message: "Ready again." });
    expect($.star.ui.feed.state(root())).toEqual({ cursor: "0", done: false, loading: false });
    expect(root().querySelector('[data-part="status"]')?.textContent).toBe("Ready again.");
  });

  it("moves between articles and across feed boundaries with the recommended keys", async () => {
    entries()[0]!.focus();
    entries()[0]!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "PageDown" }));
    expect(document.activeElement).toBe(entries()[1]);
    entries()[1]!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "PageUp" }));
    expect(document.activeElement).toBe(entries()[0]);
    entries()[0]!.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, ctrlKey: true, key: "End" }),
    );
    expect(document.activeElement).toBe(document.querySelector("#after"));
    entries()[0]!.focus();
    entries()[0]!.dispatchEvent(
      new KeyboardEvent("keydown", { bubbles: true, ctrlKey: true, key: "Home" }),
    );
    expect(document.activeElement).toBe(document.querySelector("#before"));

    entries()[1]!.focus();
    entries()[1]!.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "PageDown" }));
    await vi.waitFor(() => expect(document.activeElement).toBe(entries()[2]));
  });

  it("uses an optional Intersection Observer to activate the same load button", () => {
    let callback: IntersectionObserverCallback | undefined;
    const observe = vi.fn();
    const disconnect = vi.fn();
    class MockIntersectionObserver {
      constructor(next: IntersectionObserverCallback) {
        callback = next;
      }
      observe = observe;
      disconnect = disconnect;
    }
    vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
    document.body.insertAdjacentHTML(
      "beforeend",
      `<section id="auto-feed" data-jqs="feed" data-auto>
        <div data-part="content">${item("Automatic")}</div>
        <button data-part="more">Load automatically</button>
        <div data-part="sentinel"></div><p data-part="status"></p>
      </section>`,
    );
    const autoFeed = document.querySelector<HTMLElement>("#auto-feed")!;
    $.star.ui.enhance(autoFeed);
    expect(observe).toHaveBeenCalledOnce();
    callback?.([{ isIntersecting: true } as IntersectionObserverEntry], {} as IntersectionObserver);
    expect($.star.ui.feed.state(autoFeed).loading).toBe(true);
    $.star.ui.feed.complete(autoFeed, { done: true });
    expect(disconnect).toHaveBeenCalled();
  });
});

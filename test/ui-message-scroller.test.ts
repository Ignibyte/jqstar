import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function root(): HTMLElement {
  return document.querySelector<HTMLElement>("#thread")!;
}

function viewport(): HTMLElement {
  return root().querySelector<HTMLElement>('[data-part="viewport"]')!;
}

function content(): HTMLElement {
  return root().querySelector<HTMLElement>('[data-part="content"]')!;
}

function setGeometry(scrollTop: number): void {
  Object.defineProperties(viewport(), {
    clientHeight: { configurable: true, value: 200 },
    scrollHeight: { configurable: true, value: 600 },
  });
  viewport().scrollTop = scrollTop;
}

async function flushMessages(): Promise<void> {
  await Promise.resolve();
  vi.runAllTimers();
}

describe("jQuery Star Message Scroller", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = `
      <main id="app">
        <section id="thread" data-jqs="message-scroller" data-threshold="24">
          <div data-part="viewport" aria-label="Support conversation">
            <div data-part="content">
              <article data-jqs="message"><div data-part="content">First</div></article>
              <article data-jqs="message"><div data-part="content">Second</div></article>
            </div>
          </div>
          <button data-part="latest"><span data-part="latest-label">Latest</span></button>
          <p data-part="status">Conversation updates appear here.</p>
        </section>
        <button id="latest" data-on:click="@ui.message-scroller.latest('#thread')">Go latest</button>
        <button id="pause" data-on:click="@ui.message-scroller.follow('#thread', false)">Pause</button>
      </main>
    `;
    $.star.ui.enhance(document);
    $("#app").star();
    setGeometry(400);
    vi.runAllTimers();
  });

  afterEach(() => {
    $("#app").star("destroy");
    vi.useRealTimers();
  });

  it("creates a named, focusable log and follows the initial messages", () => {
    expect(viewport().getAttribute("role")).toBe("log");
    expect(viewport().getAttribute("aria-label")).toBe("Support conversation");
    expect(viewport().tabIndex).toBe(0);
    expect(root().querySelector('[data-part="latest"]')?.getAttribute("aria-controls")).toBe(
      viewport().id,
    );
    expect($.star.ui.messageScroller.isFollowing(root())).toBe(true);
    expect($.star.ui.messageScroller.unread(root())).toBe(0);
  });

  it("counts appended messages without pulling a reader away from history", async () => {
    setGeometry(100);
    viewport().dispatchEvent(new Event("scroll"));
    expect($.star.ui.messageScroller.isFollowing(root())).toBe(false);

    content().insertAdjacentHTML(
      "beforeend",
      '<article data-jqs="message"><div data-part="content">Third</div></article>',
    );
    await flushMessages();
    expect($.star.ui.messageScroller.unread(root())).toBe(1);
    const latest = root().querySelector<HTMLButtonElement>('[data-part="latest"]')!;
    expect(latest.hidden).toBe(false);
    expect(latest.textContent).toContain("Latest (1)");
    expect(viewport().scrollTop).toBe(100);

    latest.click();
    expect($.star.ui.messageScroller.isFollowing(root())).toBe(true);
    expect($.star.ui.messageScroller.unread(root())).toBe(0);
    expect(viewport().scrollTop).toBe(600);
  });

  it("follows appended messages and emits one addition event", async () => {
    const messages = vi.fn();
    root().addEventListener("jquery-star:message-scroller:messages", messages);
    content().insertAdjacentHTML(
      "beforeend",
      '<article data-jqs="message"><div data-part="content">Third</div></article>',
    );
    await flushMessages();
    expect(messages).toHaveBeenCalledOnce();
    expect($.star.ui.messageScroller.unread(root())).toBe(0);
    expect(viewport().scrollTop).toBe(600);
  });

  it("supports APIs and named actions", () => {
    $.star.ui.messageScroller.follow(root(), false);
    expect(root().dataset.state).toBe("paused");
    $.star.ui.messageScroller.latest(root());
    expect(root().dataset.state).toBe("following");
    $("#pause").trigger("click");
    expect($.star.ui.messageScroller.isFollowing(root())).toBe(false);
    $("#latest").trigger("click");
    expect($.star.ui.messageScroller.isFollowing(root())).toBe(true);
  });
});

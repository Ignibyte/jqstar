import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";

function part(root: ParentNode, name: string): HTMLElement {
  const element = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!element) throw new Error(`Missing ${name} fixture part.`);
  return element;
}

async function enhance(root: HTMLElement): Promise<void> {
  $.star.ui.enhance(root);
  await $.star.whenEnhanced();
}

beforeEach(() => document.body.replaceChildren());
afterEach(() => {
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("Message Scroller automatic work", () => {
  async function fixture(phase: string): Promise<{ root: HTMLElement; view: HTMLElement }> {
    vi.useFakeTimers();
    const root = document.createElement("section");
    root.dataset.jqs = "message-scroller";
    root.innerHTML =
      '<div data-part="viewport"><div data-part="content"><p data-jqs="message">Original</p></div></div><button data-part="latest">Latest</button>';
    const view = part(root, "viewport");
    Object.defineProperties(view, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 100 },
    });
    view.scrollTo = (options?: ScrollToOptions | number): void => {
      view.scrollTop = typeof options === "object" ? (options.top ?? 0) : (options ?? 0);
    };
    document.body.append(root);
    await enhance(root);
    if (phase === "append") {
      vi.runOnlyPendingTimers();
      const message = document.createElement("p");
      message.dataset.jqs = "message";
      part(root, "content").append(message);
      await $.star.whenEnhanced();
      await Promise.resolve();
    }
    return { root, view };
  }

  it.each(["initial", "append"])(
    "preserves native unfollow before %s automatic scroll",
    async (phase) => {
      const { root, view } = await fixture(phase);
      view.scrollTop = 0;
      view.dispatchEvent(new Event("scroll"));
      expect($.star.ui.messageScroller.isFollowing(root)).toBe(false);
      vi.runOnlyPendingTimers();
      expect(view.scrollTop).toBe(0);
      expect($.star.ui.messageScroller.isFollowing(root)).toBe(false);
      $.star.ui.messageScroller.latest(root);
      expect(view.scrollTop).toBe(1000);
      expect($.star.ui.messageScroller.isFollowing(root)).toBe(true);
    },
  );

  it.each(["initial", "append"])("skips %s automatic writes after removal", async (phase) => {
    const { root, view } = await fixture(phase);
    view.scrollTop = 17;
    const latest = vi.fn();
    root.addEventListener("jquery-star:message-scroller:latest", latest);
    root.remove();
    vi.runOnlyPendingTimers();
    expect(view.scrollTop).toBe(17);
    expect(latest).not.toHaveBeenCalled();
  });

  it.each(["initial", "append"])("still follows when %s work remains current", async (phase) => {
    const { root, view } = await fixture(phase);
    view.scrollTop = 23;
    const latest = vi.fn();
    root.addEventListener("jquery-star:message-scroller:latest", latest);
    vi.runOnlyPendingTimers();
    expect(view.scrollTop).toBe(1000);
    expect(latest).toHaveBeenCalledOnce();
  });

  it("coalesces consecutive message batches into one pending follow", async () => {
    const { root, view } = await fixture("initial");
    const latest = vi.fn();
    root.addEventListener("jquery-star:message-scroller:latest", latest);
    for (const label of ["One", "Two"]) {
      const message = document.createElement("p");
      message.dataset.jqs = "message";
      message.textContent = label;
      part(root, "content").append(message);
      await $.star.whenEnhanced();
    }
    expect(latest).not.toHaveBeenCalled();
    vi.runOnlyPendingTimers();
    expect(view.scrollTop).toBe(1000);
    expect(latest).toHaveBeenCalledOnce();
  });

  it("cancels old automatic work when current parts replace the viewport", async () => {
    const { root, view } = await fixture("initial");
    const replacement = view.cloneNode(true) as HTMLElement;
    replacement.scrollTo = vi.fn();
    view.replaceWith(replacement);
    await enhance(root);
    vi.runOnlyPendingTimers();
    expect(view.scrollTop).toBe(0);
    expect(replacement.scrollTo).toHaveBeenCalledOnce();
  });
});

describe("Feed article association ownership", () => {
  async function fixture(attributes = ""): Promise<{ root: HTMLElement; item: HTMLElement }> {
    const root = document.createElement("section");
    root.dataset.jqs = "feed";
    root.innerHTML = `<div data-part="content"><article data-part="item" ${attributes}><h2 data-part="title">Original</h2><p data-part="description">Original description</p></article></div><button data-part="more">More</button>`;
    document.body.append(root);
    await enhance(root);
    return { root, item: part(root, "item") };
  }

  it.each(["title", "description", "both"])("refreshes replaced %s parts", async (name) => {
    const { root, item } = await fixture();
    for (const key of name === "both" ? ["title", "description"] : [name]) {
      const replacement = document.createElement("p");
      replacement.dataset.part = key;
      replacement.id = `current-${key}`;
      part(item, key).replaceWith(replacement);
    }
    await enhance(root);
    for (const [key, attribute] of [
      ["title", "aria-labelledby"],
      ["description", "aria-describedby"],
    ] as const) {
      expect(item.getAttribute(attribute)).toBe(part(item, key).id);
      expect(document.getElementById(item.getAttribute(attribute) ?? "")).toBe(part(item, key));
    }
    expect(item.getAttribute("aria-posinset")).toBe("1");
    expect(item.getAttribute("aria-setsize")).toBe("-1");
  });

  it.each(["title", "description", "both"])(
    "removes owned references for removed %s parts",
    async (name) => {
      const { root, item } = await fixture();
      for (const key of name === "both" ? ["title", "description"] : [name])
        part(item, key).remove();
      await enhance(root);
      if (name !== "description") expect(item.hasAttribute("aria-labelledby")).toBe(false);
      if (name !== "title") expect(item.hasAttribute("aria-describedby")).toBe(false);
    },
  );

  it.each(["before", "after"])(
    "preserves authored associations supplied %s enhancement",
    async (when) => {
      const { root, item } = await fixture(
        when === "before"
          ? 'aria-labelledby="authored-title" aria-describedby="authored-description"'
          : "",
      );
      item.setAttribute("aria-labelledby", "authored-title");
      item.setAttribute("aria-describedby", "authored-description");
      part(item, "title").remove();
      part(item, "description").remove();
      await enhance(root);
      expect(item.getAttribute("aria-labelledby")).toBe("authored-title");
      expect(item.getAttribute("aria-describedby")).toBe("authored-description");
    },
  );

  it("honors an authored aria-label and can restore generated labels later", async () => {
    const { root, item } = await fixture();
    item.setAttribute("aria-label", "Summary");
    await enhance(root);
    expect(item.hasAttribute("aria-labelledby")).toBe(false);
    item.removeAttribute("aria-label");
    await enhance(root);
    expect(item.getAttribute("aria-labelledby")).toBe(part(item, "title").id);
    const title = part(item, "title");
    await enhance(root);
    expect(part(item, "title")).toBe(title);
  });

  it("uses authored associations on a replacement article without taking ownership", async () => {
    const { root, item } = await fixture();
    const replacement = item.cloneNode(true) as HTMLElement;
    replacement.setAttribute("aria-labelledby", "replacement-label");
    item.replaceWith(replacement);
    await enhance(root);
    part(replacement, "title").remove();
    await enhance(root);
    expect(replacement.getAttribute("aria-labelledby")).toBe("replacement-label");
  });
});

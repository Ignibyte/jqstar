import { createRequire } from "node:module";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(owner: Window): JQueryStatic;
};
const expectedDisposalFailures = new Set<ReturnType<typeof installStarCore>["star"]>();
const stars: ReturnType<typeof installStarCore>["star"][] = [];
function required<T>(value: T | undefined | null): T {
  if (value == null) throw new Error("Missing Feed fixture");
  return value;
}
function realm(): Window & typeof globalThis {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  return required(frame.contentWindow) as Window & typeof globalThis;
}
function install(owner: Window & typeof globalThis = window) {
  const jquery = installStarCore(jQueryFactory(owner), { document: owner.document });
  stars.push(jquery.star);
  return { owner, jquery, star: jquery.star, ui: jquery.star.use(uiPlugin) };
}
function fixture(owner: Window & typeof globalThis = window) {
  const root = owner.document.createElement("section");
  root.id = "feed-document";
  root.className = "feed-target";
  root.dataset.jqs = "feed";
  root.dataset.cursor = "one";
  root.innerHTML =
    '<div data-part="content"><article data-jqs="item" data-part="item"><h2 data-part="title">First</h2><p data-part="description">First description</p></article><article data-jqs="item" data-part="item"><h2 data-part="title">Second</h2></article></div><button data-part="more">More</button><div data-part="sentinel"></div><p data-part="status">Ready</p>';
  owner.document.body.append(root);
  return {
    root,
    more: required(root.querySelector<HTMLButtonElement>('[data-part="more"]')),
    content: required(root.querySelector<HTMLElement>('[data-part="content"]')),
    status: required(root.querySelector<HTMLElement>('[data-part="status"]')),
    item: required(root.querySelector<HTMLElement>("article")),
  };
}
function key(owner: Window & typeof globalThis, target: EventTarget, value: string): void {
  target.dispatchEvent(
    new owner.KeyboardEvent("keydown", { key: value, bubbles: true, cancelable: true }),
  );
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const star of stars.splice(0).reverse()) {
    if (expectedDisposalFailures.has(star)) expect(() => star.dispose()).toThrow();
    else star.dispose();
  }
  expectedDisposalFailures.clear();
  vi.unstubAllGlobals();
  document.body.replaceChildren();
});
function observers(owner: Window & typeof globalThis, hook: () => void = () => undefined) {
  const captured: Observer[] = [];
  class Observer {
    observing = false;
    constructor(readonly callback: IntersectionObserverCallback) {
      captured.push(this);
    }
    observe = vi.fn(() => {
      hook();
      this.observing = true;
    });
    disconnect = vi.fn(() => {
      this.observing = false;
    });
  }
  if (owner === window) vi.stubGlobal("IntersectionObserver", Observer);
  else
    Object.defineProperty(owner, "IntersectionObserver", { configurable: true, value: Observer });
  return captured;
}
describe.each(["local", "foreign"])("Feed %s document", (scope) => {
  function setup() {
    const installed = install(scope === "local" ? window : realm());
    return { ...installed, ...fixture(installed.owner) };
  }
  it.each(["append", "remove-append", "prepend", "authored-collision", "detached-remove-append"])(
    "keeps generated article and label identities unique during %s",
    (mode) => {
      const { ui, root, owner, content } = setup();
      ui.enhance(root);
      const existing = required(content.lastElementChild);
      const existingId = existing.id;
      expect(existingId).not.toBe("");
      if (mode.includes("remove-append")) required(content.firstElementChild).remove();
      if (mode === "detached-remove-append") root.remove();
      if (mode === "authored-collision") {
        const outside = owner.document.createElement("p");
        outside.id = `${root.id}-item-3`;
        owner.document.body.append(outside);
      }
      const article = owner.document.createElement("article");
      article.dataset.part = "item";
      article.innerHTML =
        '<h2 data-part="title">New article</h2><p data-part="description">New description</p>';
      if (mode === "prepend") content.prepend(article);
      else content.append(article);
      ui.feed.complete(root, { added: 1 });
      if (mode === "detached-remove-append") owner.document.body.append(root);
      const ids = Array.from(owner.document.querySelectorAll("[id]"), (element) => element.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(existing.id).toBe(existingId);
      expect(owner.document.getElementById(required(article.getAttribute("aria-labelledby")))).toBe(
        article.querySelector('[data-part="title"]'),
      );
      expect(
        owner.document.getElementById(required(article.getAttribute("aria-describedby"))),
      ).toBe(article.querySelector('[data-part="description"]'));
    },
  );
  it("avoids authored title and description IDs elsewhere in its document", () => {
    const { ui, root, item, owner } = setup();
    const outside = owner.document.createElement("aside");
    for (const part of ["title", "description"]) {
      const label = owner.document.createElement("p");
      label.id = `${root.id}-item-1-${part}`;
      outside.append(label);
    }
    owner.document.body.append(outside);
    ui.enhance(root);
    for (const [part, attribute] of [
      ["title", "aria-labelledby"],
      ["description", "aria-describedby"],
    ] as const)
      expect(owner.document.getElementById(required(item.getAttribute(attribute)))).toBe(
        item.querySelector(`[data-part="${part}"]`),
      );
  });
  it("keeps its observer through unchanged enhancement", () => {
    const { ui, root, owner } = setup();
    const captured = observers(owner);
    root.dataset.auto = "";
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    ui.enhance(root);
    ui.enhance(root);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.observe).toHaveBeenCalledOnce();
    expect(captured[0]?.disconnect).not.toHaveBeenCalled();
  });
  it("enables an observer after data-auto is patched", () => {
    const { ui, root, owner } = setup();
    const captured = observers(owner);
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    root.dataset.auto = "";
    ui.enhance(root);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.observing).toBe(true);
  });
  it("disables an observer after data-auto is removed", () => {
    const { ui, root, owner } = setup();
    const captured = observers(owner);
    root.dataset.auto = "";
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    expect(captured[0]?.observing).toBe(true);
    root.removeAttribute("data-auto");
    ui.enhance(root);
    expect(captured[0]?.observing).toBe(false);
  });
  it("retires native observation acquired after disposal during observe", () => {
    const { ui, star, root, owner } = setup();
    const captured = observers(owner, () => star.dispose());
    root.dataset.auto = "";
    ui.enhance(root);
    expect(captured).toHaveLength(1);
    expect(captured[0]?.observe).toHaveBeenCalledOnce();
    expect(captured[0]?.observing).toBe(false);
  });
  it("sweeps content listeners after More listener cleanup throws", () => {
    const { ui, star, root, content, more } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const removed = vi.spyOn(content, "removeEventListener");
    vi.spyOn(more, "removeEventListener").mockImplementationOnce(() => {
      throw new Error("cleanup");
    });
    expectedDisposalFailures.add(star);
    expect(() => star.dispose()).toThrow();
    expect(removed).toHaveBeenCalledWith("keydown", expect.any(Function));
  });
  it("constructs native events in the owning document", () => {
    const { ui, root, owner } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const seen: Event[] = [];
    root.addEventListener("jquery-star:feed:complete", (event) => seen.push(event));
    ui.feed.complete(root, { cursor: "two", added: 1 });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toBeInstanceOf(owner.CustomEvent);
  });
  it("honors canceled native More activation", () => {
    const { ui, root, more, owner } = setup();
    more.addEventListener("click", (e) => e.preventDefault());
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    more.dispatchEvent(new owner.MouseEvent("click", { bubbles: true, cancelable: true }));
    expect(ui.feed.state(root).loading).toBe(false);
  });
  it.each(["inert", "data-disabled", "aria-disabled"])(
    "honors native %s constraints",
    (constraint) => {
      const { ui, root, more } = setup();
      ui.enhance(root);
      expect(root.dataset.state).toBe("idle");
      root.setAttribute(constraint, "true");
      more.click();
      expect(ui.feed.state(root).loading).toBe(false);
    },
  );
  it.each(["implicit", "id", "class", "element"])(
    "resolves %s complete actions on the application root",
    async (mode) => {
      const { ui, jquery, root } = setup();
      ui.enhance(root);
      expect(root.dataset.state).toBe("idle");
      const app = required(jquery(root).star().star("instance"));
      const target = mode === "id" ? "#feed-document" : mode === "class" ? ".feed-target" : root;
      await app.run("ui.feed.complete", {
        args: mode === "implicit" ? [{ cursor: "two" }] : [target, { cursor: "two" }],
      });
      expect(ui.feed.state(root).cursor).toBe("two");
    },
  );
  it.each(["id", "element"])(
    "uses the default failure message for an explicit %s target",
    async (kind) => {
      const { jquery, ui, owner, root, status } = setup();
      const app = owner.document.createElement("main");
      owner.document.body.append(app);
      app.append(root);
      const instance = required(jquery(app).star().star("instance"));
      ui.enhance(root);
      expect(root.dataset.state).toBe("idle");
      await instance.run("ui.feed.fail", { args: [kind === "id" ? "#feed-document" : root] });
      expect(root.dataset.state).toBe("error");
      expect(status.textContent).toBe("Could not load more items.");
    },
  );
  it.each(["native", "jquery"])("honors canceled %s named completion", async (kind) => {
    const { ui, jquery, owner, root } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const app = required(jquery(owner.document.body).star().star("instance"));
    const event =
      kind === "native"
        ? new owner.MouseEvent("click", { cancelable: true })
        : jquery.Event("click");
    event.preventDefault();
    await app.run("ui.feed.complete", {
      args: ["#feed-document", { cursor: "two", done: true }],
      event,
    });
    expect(ui.feed.state(root)).toEqual({ cursor: "one", loading: false, done: false });
  });
  it("refreshes directly patched cursor and done through state", () => {
    const { ui, root } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    root.dataset.cursor = "patch";
    root.dataset.done = "true";
    expect(ui.feed.state(root)).toEqual({ cursor: "patch", done: true, loading: false });
  });
  it("clicks the current replacement More button through load", () => {
    const { ui, root, more } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const replacement = more.cloneNode(true) as HTMLButtonElement;
    more.replaceWith(replacement);
    const old = vi.spyOn(more, "click"),
      current = vi.spyOn(replacement, "click");
    ui.feed.load(root);
    expect(old).not.toHaveBeenCalled();
    expect(current).toHaveBeenCalledOnce();
    expect(ui.feed.state(root).loading).toBe(true);
  });
  it("makes a detached old More button inert before enhancement", () => {
    const { ui, root, more } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    more.replaceWith(more.cloneNode(true));
    more.click();
    expect(root.dataset.state).toBe("idle");
  });
  it.each(["reset", "complete", "fail", "focus"])(
    "keeps newer %s requested during before-load",
    (mode) => {
      const { ui, root } = setup();
      ui.enhance(root);
      expect(root.dataset.state).toBe("idle");
      const loaded = vi.fn();
      root.addEventListener("jquery-star:feed:load", loaded);
      root.addEventListener(
        "jquery-star:feed:before-load",
        () => {
          if (mode === "reset") ui.feed.reset(root, { cursor: "newer" });
          else if (mode === "complete") ui.feed.complete(root, { cursor: "newer", done: true });
          else if (mode === "fail") ui.feed.fail(root, "newer");
          else ui.feed.focus(root, 0);
        },
        { once: true },
      );
      ui.feed.load(root);
      expect(loaded).not.toHaveBeenCalled();
      expect(ui.feed.state(root).loading).toBe(false);
    },
  );
  it.each(["more", "content", "status", "cursor", "done"])(
    "stops before-load after a %s source change",
    (part) => {
      const { ui, root, more, content, status } = setup();
      ui.enhance(root);
      expect(root.dataset.state).toBe("idle");
      const loaded = vi.fn();
      root.addEventListener("jquery-star:feed:load", loaded);
      root.addEventListener(
        "jquery-star:feed:before-load",
        () => {
          if (part === "cursor") root.dataset.cursor = "patched";
          else if (part === "done") root.dataset.done = "true";
          else {
            const element = part === "more" ? more : part === "content" ? content : status;
            element.replaceWith(element.cloneNode(true));
          }
        },
        { once: true },
      );
      ui.feed.load(root);
      expect(loaded).not.toHaveBeenCalled();
      expect(root.dataset.state).toBe("idle");
    },
  );
  it("does not supersede loading through unchanged enhancement", () => {
    const { ui, root } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const loaded = vi.fn();
    root.addEventListener("jquery-star:feed:load", loaded);
    root.addEventListener("jquery-star:feed:before-load", () => ui.enhance(root), { once: true });
    ui.feed.load(root);
    expect(loaded).toHaveBeenCalledOnce();
    expect(ui.feed.state(root).loading).toBe(true);
  });
  it.each(["cursor", "done", "added"])(
    "establishes completion intent before the %s getter",
    (property) => {
      const { ui, root } = setup();
      ui.enhance(root);
      expect(root.dataset.state).toBe("idle");
      const complete = vi.fn();
      root.addEventListener("jquery-star:feed:complete", complete);
      const options = { cursor: "older", done: true, added: 1 };
      Object.defineProperty(options, property, {
        get() {
          ui.feed.reset(root, { cursor: "newer" });
          return property === "cursor" ? "older" : property === "done" ? true : 1;
        },
      });
      ui.feed.complete(root, options);
      expect(ui.feed.state(root)).toEqual({ cursor: "newer", loading: false, done: false });
      expect(complete).not.toHaveBeenCalled();
    },
  );
  it("stops initial live writes after attribute disposal", () => {
    const { ui, star, root, content } = setup();
    const attribute = content.setAttribute.bind(content);
    let snapshot = "";
    vi.spyOn(content, "setAttribute").mockImplementationOnce((...args) => {
      star.dispose();
      attribute(...args);
      snapshot = root.outerHTML;
    });
    ui.enhance(root);
    expect(snapshot).not.toBe("");
    expect(root.outerHTML).toBe(snapshot);
  });
  it("stops later acquisition after first-listener disposal", () => {
    const { ui, star, root, more, content } = setup();
    const add = more.addEventListener.bind(more),
      later = vi.spyOn(content, "addEventListener");
    const first = vi.spyOn(more, "addEventListener").mockImplementationOnce((...args) => {
      star.dispose();
      add(...args);
    });
    ui.enhance(root);
    expect(first).toHaveBeenCalledOnce();
    expect(later).not.toHaveBeenCalled();
  });
  it("releases earlier registration after a second registration error", () => {
    const { ui, root, more, content } = setup();
    const removed = vi.spyOn(more, "removeEventListener");
    vi.spyOn(content, "addEventListener").mockImplementationOnce(() => {
      throw new Error("second registration");
    });
    expect(() => ui.enhance(root)).toThrow("second registration");
    expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
  });
  it("keeps newer focus requested by a completion callback", () => {
    const { ui, root, content, owner, item } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const last = required(content.lastElementChild);
    key(owner, last, "PageDown");
    const added = owner.document.createElement("article");
    added.dataset.part = "item";
    content.append(added);
    root.addEventListener("jquery-star:feed:complete", () => ui.feed.focus(root, 0), {
      once: true,
    });
    ui.feed.complete(root, { added: 1 });
    expect(owner.document.activeElement).toBe(item);
  });
  it("does not scroll an older focus after native focus starts a newer request", () => {
    const { ui, root, content, item } = setup();
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    const second = required(content.querySelectorAll<HTMLElement>("article")[1]);
    const scroll = vi.fn();
    second.scrollIntoView = scroll;
    second.addEventListener("focus", () => ui.feed.focus(root, 0), { once: true });
    ui.feed.focus(root, 1);
    expect(scroll).not.toHaveBeenCalled();
    expect(root.ownerDocument.activeElement).toBe(item);
  });
  it("reads a direct source patch inside before-load without committing an older load", () => {
    const { ui, root } = setup();
    ui.enhance(root);
    let cursor: string | undefined;
    root.addEventListener(
      "jquery-star:feed:before-load",
      () => {
        root.dataset.cursor = "patched";
        cursor = ui.feed.state(root).cursor;
      },
      { once: true },
    );
    ui.feed.load(root);
    expect(cursor).toBe("patched");
    expect(root.dataset.state).toBe("idle");
  });
  it("ignores observer delivery before construction publishes its handle", () => {
    const { ui, root, owner } = setup();
    class Observer {
      constructor(callback: IntersectionObserverCallback) {
        callback(
          [{ isIntersecting: true } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      }
      observe = vi.fn();
      disconnect = vi.fn();
    }
    if (owner === window) vi.stubGlobal("IntersectionObserver", Observer);
    else
      Object.defineProperty(owner, "IntersectionObserver", { configurable: true, value: Observer });
    root.dataset.auto = "";
    const loaded = vi.fn();
    root.addEventListener("jquery-star:feed:load", loaded);
    ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    expect(loaded).not.toHaveBeenCalled();
  });
  it("stops later listener acquisition after the first registration patches source", () => {
    const { ui, root, more, content } = setup();
    const add = more.addEventListener.bind(more);
    const later = vi.spyOn(content, "addEventListener");
    vi.spyOn(more, "addEventListener").mockImplementationOnce((...args) => {
      root.dataset.cursor = "patched";
      add(...args);
    });
    ui.enhance(root);
    expect(later).not.toHaveBeenCalled();
    ui.enhance(root);
    expect(ui.feed.state(root).cursor).toBe("patched");
    more.click();
    expect(ui.feed.state(root).loading).toBe(true);
  });
  it("stops generated article labels after an earlier label disposes the owner", () => {
    const { ui, star, root, item } = setup();
    const attribute = item.setAttribute.bind(item);
    let snapshot = "";
    vi.spyOn(item, "setAttribute").mockImplementation((name, value) => {
      attribute(name, value);
      if (name === "aria-labelledby" && !snapshot) {
        star.dispose();
        snapshot = root.outerHTML;
      }
    });
    ui.enhance(root);
    expect(snapshot).not.toBe("");
    expect(root.outerHTML).toBe(snapshot);
  });
  it.each(["cursor", "message"])("keeps a newer reset from the %s option getter", (name) => {
    const { ui, root, status } = setup();
    ui.enhance(root);
    const options = { cursor: "older", message: "Older" };
    Object.defineProperty(options, name, {
      get() {
        ui.feed.reset(root, { cursor: "newer", message: "Newer" });
        return "Older";
      },
    });
    ui.feed.reset(root, options);
    expect(ui.feed.state(root).cursor).toBe("newer");
    expect(status.textContent).toBe("Newer");
  });
  it("preserves authored More constraints through rendering and programmatic completion", () => {
    const { ui, root, more } = setup();
    more.disabled = true;
    more.hidden = true;
    ui.enhance(root);
    ui.feed.complete(root, { cursor: "two", done: true });
    ui.feed.reset(root, { cursor: "three" });
    expect(more.disabled).toBe(true);
    expect(more.hidden).toBe(true);
    expect(ui.feed.state(root)).toEqual({ cursor: "three", done: false, loading: false });
  });
  it("disconnects late observation when observe disposes and then throws", () => {
    const { ui, star, root, owner } = setup();
    let observing = false;
    class Observer {
      observe(): void {
        star.dispose();
        observing = true;
        throw new Error("late observe failure");
      }
      disconnect(): void {
        observing = false;
      }
    }
    if (owner === window) vi.stubGlobal("IntersectionObserver", Observer);
    else
      Object.defineProperty(owner, "IntersectionObserver", { configurable: true, value: Observer });
    root.dataset.auto = "";
    expect(() => ui.enhance(root)).toThrow("late observe failure");
    expect(observing).toBe(false);
  });
});
it.each([false, true])(
  "Feed adoption preserves native items, source disposed first=%s",
  (disposeFirst) => {
    const source = install(realm()),
      destination = install(realm());
    const { root, item, more } = fixture(source.owner);
    source.ui.enhance(root);
    expect(root.dataset.state).toBe("idle");
    source.ui.feed.complete(root, { cursor: "retained" });
    if (disposeFirst) source.star.dispose();
    destination.owner.document.body.append(destination.owner.document.adoptNode(root));
    destination.ui.enhance(root);
    if (!disposeFirst) source.star.dispose();
    expect(destination.ui.feed.state(root)).toEqual({
      cursor: "retained",
      done: false,
      loading: false,
    });
    expect(root.querySelector("article")).toBe(item);
    expect(root.querySelector("button")).toBe(more);
    expect(() => source.ui.feed.state(root)).toThrow();
    more.click();
    expect(destination.ui.feed.state(root).loading).toBe(true);
  },
);

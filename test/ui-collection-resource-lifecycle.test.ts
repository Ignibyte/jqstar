import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { withStarDOMRealm } from "../src/testing";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const modes = ["render", "native", "dispose", "preserve"] as const;
let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});

afterEach(() => {
  star.dispose();
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function part<T extends HTMLElement>(root: HTMLElement, selector: string, kind: new () => T): T {
  const element = root.querySelector<T>(selector);
  if (!(element instanceof kind)) throw new Error(`Missing collection fixture: ${selector}`);
  return element;
}

function transfer(owner = document) {
  const root = owner.createElement("div");
  root.dataset.jqs = "transfer-list";
  root.dataset.name = "items";
  root.innerHTML = `<select data-part="available" multiple><option value="alpha">Alpha</option></select>
    <select data-part="selected" multiple><option value="beta">Beta</option></select>
    <button data-part="add">Add</button><button data-part="add-all">Add all</button>
    <button data-part="remove">Remove</button><button data-part="remove-all">Remove all</button>
    <button data-part="move-up">Up</button><button data-part="move-down">Down</button>
    <p data-part="status"></p>`;
  owner.body.append(root);
  return {
    root,
    available: part(root, '[data-part="available"]', HTMLSelectElement),
    selected: part(root, '[data-part="selected"]', HTMLSelectElement),
    add: part(root, '[data-part="add-all"]', HTMLButtonElement),
  };
}

function tree(owner = document) {
  const root = owner.createElement("ul");
  root.dataset.jqs = "tree";
  root.dataset.selection = "multiple";
  root.innerHTML = `<li data-part="item" data-value="alpha"><div data-part="row"><span data-part="toggle"></span><span data-part="label">Alpha</span></div>
    <ul data-part="group"><li data-part="item" data-value="child"><div data-part="row"><span data-part="toggle"></span><span data-part="label">Child</span></div>
    <ul data-part="group"><li data-part="item" data-value="leaf"><div data-part="row"><span data-part="label">Leaf</span></div></li></ul></li></ul></li>
    <li data-part="item" data-value="beta"><div data-part="row"><span data-part="toggle"></span><span data-part="label">Beta</span></div>
    <ul data-part="group"><li data-part="item" data-value="beta-child"><div data-part="row"><span data-part="label">Beta child</span></div></li></ul></li>
    <li data-part="item" data-value="berry"><div data-part="row"><span data-part="label">Berry</span></div></li>`;
  owner.body.append(root);
  const item = (value: string): HTMLElement =>
    part(root, `[data-part="item"][data-value="${value}"]`, HTMLElement);
  const row = (value: string): HTMLElement =>
    part(item(value), ':scope > [data-part="row"]', HTMLElement);
  return { root, item, row };
}

function key(item: HTMLElement, value: string, options: KeyboardEventInit = {}): void {
  item.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: value, ...options }));
}

async function boundary(root: HTMLElement, mode: (typeof modes)[number]) {
  if (mode === "dispose") star.dispose();
  else if (mode === "native") {
    root.remove();
    await star.whenEnhanced();
  } else {
    const render = createRenderAdapter(installed).begin(
      document.body,
      mode === "preserve" ? { preserveRoots: [root] } : {},
    );
    render.beforeRemove(root);
    ui.enhance(document);
    return async () => {
      if (mode === "render") root.remove();
      await render.commit();
    };
  }
  return undefined;
}

it.each(modes)("Transfer List releases native/button listeners across %s", async (mode) => {
  const { root, available, selected, add } = transfer();
  ui.enhance(root);
  await star.whenEnhanced();
  const removed = vi.spyOn(available, "removeEventListener");
  const removedButton = vi.spyOn(add, "removeEventListener");
  const changed = vi.fn();
  root.addEventListener("jquery-star:transfer-list:change", changed);
  available.value = "alpha";
  const finish = await boundary(root, mode);
  const before = root.outerHTML;
  add.click();
  if (mode === "preserve") {
    expect(changed).toHaveBeenCalledOnce();
    expect(Array.from(selected.options, (option) => option.value)).toEqual(["beta", "alpha"]);
  } else {
    available.dispatchEvent(new Event("change"));
    available.dispatchEvent(new MouseEvent("dblclick"));
    key(available, "Enter");
    expect(root.outerHTML).toBe(before);
    expect(changed).not.toHaveBeenCalled();
    for (const name of ["change", "dblclick", "keydown"])
      expect(removed).toHaveBeenCalledWith(name, expect.any(Function));
    expect(removedButton).toHaveBeenCalledWith("click", expect.any(Function));
  }
  await finish?.();
});

it.each(modes)("Tree releases rows/items and typeahead across %s", async (mode) => {
  const { root, item, row } = tree();
  ui.enhance(root);
  await star.whenEnhanced();
  const scheduled = vi.spyOn(window, "setTimeout");
  const cleared = vi.spyOn(window, "clearTimeout");
  const removed = vi.spyOn(item("alpha"), "removeEventListener");
  const removedRow = vi.spyOn(row("alpha"), "removeEventListener");
  key(item("alpha"), "b");
  const timerIndex = scheduled.mock.calls.findIndex(([, delay]) => delay === 500);
  expect(timerIndex).toBeGreaterThanOrEqual(0);
  const timer = scheduled.mock.results[timerIndex]?.value as number;
  expect(document.activeElement).toBe(item("beta"));
  const finish = await boundary(root, mode);
  const selected = vi.fn();
  const activated = vi.fn();
  root.addEventListener("jquery-star:tree:select", selected);
  root.addEventListener("jquery-star:tree:activate", activated);
  if (mode === "preserve") {
    expect(cleared).not.toHaveBeenCalledWith(timer);
    key(item("beta"), "e");
    expect(document.activeElement).toBe(item("berry"));
    row("alpha").click();
    expect(selected).toHaveBeenCalledOnce();
  } else {
    const before = root.outerHTML;
    row("alpha").click();
    row("alpha").dispatchEvent(new MouseEvent("dblclick"));
    key(item("alpha"), " ");
    key(item("alpha"), "Enter");
    key(item("alpha"), "b");
    expect(root.outerHTML).toBe(before);
    expect(selected).not.toHaveBeenCalled();
    expect(activated).not.toHaveBeenCalled();
    expect(cleared).toHaveBeenCalledWith(timer);
    for (const name of ["focus", "keydown"])
      expect(removed).toHaveBeenCalledWith(name, expect.any(Function));
    for (const name of ["click", "dblclick"])
      expect(removedRow).toHaveBeenCalledWith(name, expect.any(Function));
  }
  await finish?.();
});

for (const kind of ["transferList", "tree"] as const) {
  it(`${kind} reacquires one binding after native removal`, async () => {
    const fixture = kind === "tree" ? tree() : transfer();
    const { root } = fixture;
    ui.enhance(root);
    await star.whenEnhanced();
    root.remove();
    await star.whenEnhanced();
    document.body.append(root);
    ui.enhance(root);
    ui.enhance(root);
    const changed = vi.fn();
    root.addEventListener(
      kind === "tree" ? "jquery-star:tree:select" : "jquery-star:transfer-list:change",
      changed,
    );
    if ("row" in fixture) fixture.row("alpha").click();
    else fixture.add.click();
    expect(changed).toHaveBeenCalledOnce();
  });

  it(`${kind} releases replaced parts and keeps one current binding`, () => {
    const fixture = kind === "tree" ? tree() : transfer();
    const { root } = fixture;
    ui.enhance(root);
    const old = "row" in fixture ? fixture.row("alpha") : fixture.add;
    const fresh = old.cloneNode(true) as HTMLElement;
    old.replaceWith(fresh);
    ui.enhance(root);
    ui.enhance(root);
    const changed = vi.fn();
    root.addEventListener(
      kind === "tree" ? "jquery-star:tree:select" : "jquery-star:transfer-list:change",
      changed,
    );
    old.click();
    expect(changed).not.toHaveBeenCalled();
    fresh.click();
    expect(changed).toHaveBeenCalledOnce();
  });
}

it.each(["before-change", "component-change", "input"] as const)(
  "Transfer List stops native event continuation after %s disposal",
  (phase) => {
    const { root } = transfer();
    ui.enhance(root);
    const component = vi.fn();
    const input = vi.fn();
    const change = vi.fn();
    root.addEventListener("jquery-star:transfer-list:change", component);
    root.addEventListener("input", input);
    root.addEventListener("change", change);
    root.addEventListener(
      phase === "input" ? phase : `jquery-star:transfer-list:${phase.replace("component-", "")}`,
      () => star.dispose(),
    );
    ui.transferList.addAll(root);
    expect(() => ui.transferList.value(root)).toThrow("disposed");
    expect(root.dataset.value).toBe(phase === "before-change" ? '["beta"]' : '["beta","alpha"]');
    expect(component).toHaveBeenCalledTimes(phase === "before-change" ? 0 : 1);
    expect(input).toHaveBeenCalledTimes(phase === "input" ? 1 : 0);
    expect(change).not.toHaveBeenCalled();
  },
);

it("Transfer List does not render a canceled transition after disposal", () => {
  const { root } = transfer();
  ui.enhance(root);
  root.addEventListener("jquery-star:transfer-list:before-change", (event) => {
    event.preventDefault();
    star.dispose();
    root.dataset.state = "retired";
  });
  ui.transferList.addAll(root);
  expect(root.dataset.state).toBe("retired");
});

it("Transfer List rebinds a button whose operation changes", () => {
  const { root, add } = transfer();
  ui.enhance(root);
  part(root, '[data-part="remove-all"]', HTMLButtonElement).remove();
  ui.enhance(root);
  add.dataset.part = "remove-all";
  ui.enhance(root);
  add.click();
  expect(ui.transferList.value(root)).toEqual([]);
});

it.each(["before-change", "change", "input"] as const)(
  "Transfer List stops a retired record after %s replaces its bindings",
  (phase) => {
    const { root, add } = transfer();
    ui.enhance(root);
    const native = vi.fn();
    root.addEventListener("change", native);
    root.addEventListener(
      phase === "input" ? phase : `jquery-star:transfer-list:${phase}`,
      () => {
        add.replaceWith(add.cloneNode(true));
        ui.enhance(root);
      },
      { once: true },
    );
    ui.transferList.addAll(root);
    expect(native).not.toHaveBeenCalled();
    expect(ui.transferList.value(root)).toEqual(
      phase === "before-change" ? ["beta"] : ["beta", "alpha"],
    );
  },
);

it("Tree stops a retired record after before-select replaces a row", () => {
  const { root, row } = tree();
  ui.enhance(root);
  const selected = vi.fn();
  root.addEventListener("jquery-star:tree:select", selected);
  root.addEventListener(
    "jquery-star:tree:before-select",
    () => {
      row("alpha").replaceWith(row("alpha").cloneNode(true));
      ui.enhance(root);
    },
    { once: true },
  );
  ui.tree.select(root, "alpha");
  expect(selected).not.toHaveBeenCalled();
  expect(ui.tree.value(root)).toEqual([]);
  row("alpha").click();
  expect(selected).toHaveBeenCalledOnce();
});

it.each(["before-select", "before-expand", "before-collapse"] as const)(
  "Tree stops %s after disposal",
  (phase) => {
    const { root, item } = tree();
    ui.enhance(root);
    if (phase === "before-collapse") ui.tree.expand(root, "alpha");
    const before = root.outerHTML;
    const after = vi.fn();
    root.addEventListener(`jquery-star:tree:${phase.slice(7)}`, after);
    root.addEventListener(`jquery-star:tree:${phase}`, () => star.dispose());
    if (phase === "before-select") ui.tree.select(root, "alpha");
    else if (phase === "before-expand") ui.tree.expand(root, "alpha");
    else ui.tree.collapse(root, "alpha");
    expect(() => ui.tree.value(root)).toThrow("disposed");
    expect(root.outerHTML).toBe(before);
    expect(after).not.toHaveBeenCalled();
    expect(item("alpha").getAttribute("aria-selected")).toBe("false");
  },
);

it("Tree stops bulk selection after before-select disposal", () => {
  const { root, item } = tree();
  ui.enhance(root);
  root.addEventListener("jquery-star:tree:before-select", () => star.dispose());
  key(item("alpha"), "a", { ctrlKey: true });
  expect(root.dataset.value).toBe("[]");
});

it.each(["row", "shift-arrow"] as const)("Tree stops selection after %s focus disposal", (mode) => {
  const { root, item, row } = tree();
  ui.enhance(root);
  item("beta").addEventListener("focus", () => star.dispose());
  const before = vi.fn();
  root.addEventListener("jquery-star:tree:before-select", before);
  if (mode === "row") row("beta").click();
  else key(item("alpha"), "ArrowDown", { shiftKey: true });
  expect(() => ui.tree.value(root)).toThrow("disposed");
  expect(root.dataset.value).toBe("[]");
  expect(before).not.toHaveBeenCalled();
});

it("Tree stops sibling expansion after an expand callback disposes it", () => {
  const { root, item } = tree();
  ui.enhance(root);
  root.addEventListener("jquery-star:tree:expand", () => star.dispose());
  key(item("alpha"), "*");
  expect(item("alpha").dataset.expanded).toBe("true");
  expect(item("beta").dataset.expanded).toBe("false");
});

it("Tree stops ancestor expansion and final focus after disposal", () => {
  const { root, item } = tree();
  ui.enhance(root);
  const focused = vi.spyOn(item("leaf"), "focus");
  root.addEventListener("jquery-star:tree:expand", () => star.dispose());
  ui.tree.focus(root, "leaf");
  expect(item("child").dataset.expanded).toBe("true");
  expect(item("alpha").dataset.expanded).toBe("false");
  expect(focused).not.toHaveBeenCalled();
});

it("Tree stops collapse notification after restoring focus disposes it", () => {
  const { root, item } = tree();
  ui.enhance(root);
  ui.tree.focus(root, "leaf");
  const collapsed = vi.fn();
  root.addEventListener("jquery-star:tree:collapse", collapsed);
  item("alpha").addEventListener("focus", () => star.dispose());
  ui.tree.collapse(root, "alpha");
  expect(collapsed).not.toHaveBeenCalled();
});

it.each(["unchanged", "move"] as const)(
  "Tree preserves typeahead after %s enhancement",
  async (mode) => {
    const { root, item } = tree();
    ui.enhance(root);
    await star.whenEnhanced();
    key(item("alpha"), "b");
    if (mode === "move") {
      const wrapper = document.createElement("div");
      document.body.append(wrapper);
      wrapper.append(root);
    }
    ui.enhance(root);
    key(item("beta"), "e");
    expect(document.activeElement).toBe(item("berry"));
  },
);

it("Tree cancels typeahead in its captured document without retiring another document", async () => {
  const frames = [document.createElement("iframe"), document.createElement("iframe")];
  document.body.append(...frames);
  const owners: Array<ReturnType<typeof installStarCore>["star"]> = [];
  const timers: Array<Map<number, () => void>> = [];
  try {
    for (const frame of frames) {
      const window = frame.contentWindow as Window & typeof globalThis;
      const jquery = jQueryFactory(window);
      const pending = new Map<number, () => void>();
      timers.push(pending);
      await withStarDOMRealm({ window, jQuery: jquery }, () => {
        const owner = installStarCore(jquery, { document: window.document }).star;
        owners.push(owner);
        const localUI = owner.use(uiPlugin);
        const { root, item } = tree(window.document);
        localUI.enhance(root);
        vi.spyOn(window as Window, "setTimeout").mockImplementation((callback) => {
          pending.set(17, callback as () => void);
          return 17;
        });
        vi.spyOn(window as Window, "clearTimeout").mockImplementation((timer) => {
          if (timer !== undefined) pending.delete(timer);
        });
        key(item("alpha"), "b");
        expect(pending.size).toBe(1);
      });
    }
    owners[0]?.dispose();
    expect(timers.map((pending) => pending.size)).toEqual([0, 1]);
    owners[1]?.dispose();
    expect(timers.map((pending) => pending.size)).toEqual([0, 0]);
  } finally {
    for (const owner of owners) owner.dispose();
    for (const frame of frames) frame.remove();
  }
});

function observeFeeds(owner: Window = window, hooks: { create?(): void; observe?(): void } = {}) {
  const observers: FeedObserver[] = [];
  class FeedObserver {
    constructor(readonly callback: IntersectionObserverCallback) {
      observers.push(this);
      hooks.create?.();
    }
    observe = vi.fn(() => hooks.observe?.());
    disconnect = vi.fn();
    deliver(): void {
      this.callback(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        this as unknown as IntersectionObserver,
      );
    }
  }
  if (owner === window) vi.stubGlobal("IntersectionObserver", FeedObserver);
  else
    Object.defineProperty(owner, "IntersectionObserver", {
      configurable: true,
      writable: true,
      value: FeedObserver,
    });
  return observers;
}

function feed(owner = document) {
  const root = owner.createElement("section");
  root.dataset.jqs = "feed";
  root.dataset.auto = "";
  root.innerHTML = `<div data-part="content"><article data-part="item">First</article><article data-part="item">Second</article></div>
    <button data-part="more">More</button><div data-part="sentinel"></div><p data-part="status">Ready</p>`;
  owner.body.append(root);
  return {
    root,
    content: part(root, '[data-part="content"]', HTMLElement),
    more: part(root, '[data-part="more"]', HTMLButtonElement),
    item: (index: number): HTMLElement =>
      part(root, `article:nth-child(${index + 1})`, HTMLElement),
  };
}

it.each(modes)("Feed releases native listeners and observer across %s", async (mode) => {
  const observers = observeFeeds();
  const { root, more, content, item } = feed();
  ui.enhance(root);
  await star.whenEnhanced();
  expect(observers).toHaveLength(1);
  const observer = observers[0];
  if (!observer) throw new Error("Missing Feed observer.");
  const removedMore = vi.spyOn(more, "removeEventListener");
  const removedContent = vi.spyOn(content, "removeEventListener");
  const clicked = vi.spyOn(more, "click");
  const loaded = vi.fn();
  root.addEventListener("jquery-star:feed:load", loaded);
  const finish = await boundary(root, mode);
  observer.deliver();
  if (mode === "preserve") {
    expect(observer.disconnect).not.toHaveBeenCalled();
    expect(loaded).toHaveBeenCalledOnce();
  } else {
    expect(observer.disconnect).toHaveBeenCalledOnce();
    expect(clicked).not.toHaveBeenCalled();
    expect(removedMore).toHaveBeenCalledWith("click", expect.any(Function));
    expect(removedContent).toHaveBeenCalledWith("keydown", expect.any(Function));
    const nextFocus = vi.spyOn(item(1), "focus");
    key(item(0), "PageDown");
    more.click();
    expect(nextFocus).not.toHaveBeenCalled();
    expect(loaded).not.toHaveBeenCalled();
  }
  await finish?.();
});

it("Feed discards a superseded observer callback while its controller stays live", () => {
  const observers = observeFeeds();
  const { root, more } = feed();
  ui.enhance(root);
  ui.feed.reset(root);
  expect(observers).toHaveLength(2);
  const click = vi.spyOn(more, "click");
  observers[0]?.deliver();
  expect(click).not.toHaveBeenCalled();
  observers[1]?.deliver();
  expect(click).toHaveBeenCalledOnce();
});

it("Feed reacquires one observer and listener set after native removal", async () => {
  const observers = observeFeeds();
  const { root } = feed();
  ui.enhance(root);
  await star.whenEnhanced();
  root.remove();
  await star.whenEnhanced();
  document.body.append(root);
  ui.enhance(root);
  ui.enhance(root);
  expect(observers).toHaveLength(2);
  const loaded = vi.fn();
  root.addEventListener("jquery-star:feed:load", loaded);
  observers[0]?.deliver();
  expect(loaded).not.toHaveBeenCalled();
  observers[1]?.deliver();
  expect(loaded).toHaveBeenCalledOnce();
});

it("Feed replaces its exact parts and keeps former observer delivery inert", () => {
  const observers = observeFeeds();
  const { root, more } = feed();
  ui.enhance(root);
  more.replaceWith(more.cloneNode(true));
  ui.enhance(root);
  const loaded = vi.fn();
  root.addEventListener("jquery-star:feed:load", loaded);
  const clicked = vi.spyOn(more, "click");
  observers[0]?.deliver();
  expect(clicked).not.toHaveBeenCalled();
  more.click();
  expect(loaded).not.toHaveBeenCalled();
  observers[1]?.deliver();
  expect(loaded).toHaveBeenCalledOnce();
});

it.each(["before-load", "load"] as const)(
  "Feed stops authored load continuation after %s disposal",
  (phase) => {
    observeFeeds();
    const { root, more } = feed();
    ui.enhance(root);
    const loaded = vi.fn();
    const authored = vi.fn();
    root.addEventListener("jquery-star:feed:load", loaded);
    root.addEventListener(`jquery-star:feed:${phase}`, () => star.dispose());
    more.addEventListener("click", authored);
    ui.feed.load(root);
    expect(() => ui.feed.state(root)).toThrow("disposed");
    expect(loaded).toHaveBeenCalledTimes(phase === "load" ? 1 : 0);
    expect(authored).not.toHaveBeenCalled();
    expect(root.dataset.state).toBe(phase === "load" ? "loading" : "idle");
  },
);

it.each(["complete", "reset"] as const)(
  "Feed stops observer acquisition after %s disposal",
  (phase) => {
    const observers = observeFeeds();
    const { root } = feed();
    ui.enhance(root);
    root.addEventListener(`jquery-star:feed:${phase}`, () => star.dispose());
    ui.feed[phase](root);
    expect(observers).toHaveLength(1);
  },
);

it("Feed stops pending focus after complete disposal", () => {
  observeFeeds();
  const { root, content, item } = feed();
  ui.enhance(root);
  key(item(1), "PageDown");
  content.insertAdjacentHTML("beforeend", '<article data-part="item">Third</article>');
  const focus = vi.spyOn(item(2), "focus");
  root.addEventListener("jquery-star:feed:complete", () => star.dispose());
  ui.feed.complete(root, { added: 1 });
  expect(focus).not.toHaveBeenCalled();
});

it("Feed stops scrolling and observer acquisition after pending focus disposes it", () => {
  const observers = observeFeeds();
  const { root, content, item } = feed();
  ui.enhance(root);
  key(item(1), "PageDown");
  content.insertAdjacentHTML("beforeend", '<article data-part="item">Third</article>');
  const scroll = vi.fn();
  item(2).scrollIntoView = scroll;
  item(2).addEventListener("focus", () => star.dispose());
  ui.feed.complete(root, { added: 1 });
  expect(scroll).not.toHaveBeenCalled();
  expect(observers).toHaveLength(1);
});

it("Feed stops observer replacement when disconnect disposes the kernel", () => {
  const observers = observeFeeds();
  const { root } = feed();
  ui.enhance(root);
  observers[0]?.disconnect.mockImplementationOnce(() => star.dispose());
  ui.feed.reset(root);
  expect(observers).toHaveLength(1);
});

it.each(["create", "observe"] as const)("Feed cleans up disposal during observer %s", (phase) => {
  const observers = observeFeeds(window, { [phase]: () => star.dispose() });
  const { root } = feed();
  ui.enhance(root);
  expect(observers).toHaveLength(1);
  // Observation can be acquired after disposal's first disconnect, before observe returns.
  expect(observers[0]?.disconnect).toHaveBeenCalledTimes(phase === "observe" ? 2 : 1);
  expect(() => ui.feed.state(root)).toThrow("disposed");
});

it("Feed does not acquire replacement parts when old observer cleanup disposes it", () => {
  const observers = observeFeeds();
  const { root, more } = feed();
  ui.enhance(root);
  observers[0]?.disconnect.mockImplementationOnce(() => star.dispose());
  more.replaceWith(more.cloneNode(true));
  expect(() => ui.enhance(root)).not.toThrow();
  expect(observers).toHaveLength(1);
});

it("Feed keeps the observer acquired by a reentrant disconnect callback", () => {
  const observers = observeFeeds();
  const { root } = feed();
  ui.enhance(root);
  observers[0]?.disconnect.mockImplementationOnce(() => ui.feed.reset(root));
  ui.feed.reset(root);
  expect(observers).toHaveLength(2);
  expect(observers[1]?.disconnect).not.toHaveBeenCalled();
  star.dispose();
  expect(observers[1]?.disconnect).toHaveBeenCalledOnce();
});

it("Feed releases a provisional observer superseded during its construction", () => {
  let reenter = false;
  const observers = observeFeeds(window, {
    create: () => {
      if (reenter) {
        reenter = false;
        ui.feed.reset(root);
      }
    },
  });
  const { root } = feed();
  ui.enhance(root);
  reenter = true;
  ui.feed.reset(root);
  expect(observers).toHaveLength(3);
  expect(observers[1]?.disconnect).toHaveBeenCalledOnce();
  expect(observers[1]?.observe).not.toHaveBeenCalled();
  expect(observers[2]?.disconnect).not.toHaveBeenCalled();
  star.dispose();
  expect(observers[2]?.disconnect).toHaveBeenCalledOnce();
});

it("Feed keeps one observer through a connected move", async () => {
  const observers = observeFeeds();
  const { root } = feed();
  ui.enhance(root);
  await star.whenEnhanced();
  const wrapper = document.createElement("div");
  document.body.append(wrapper);
  wrapper.append(root);
  ui.enhance(root);
  await star.whenEnhanced();
  expect(observers).toHaveLength(1);
  expect(observers[0]?.disconnect).not.toHaveBeenCalled();
});

it("Feed observer constructors and disposal remain isolated by document", async () => {
  const frames = [document.createElement("iframe"), document.createElement("iframe")];
  document.body.append(...frames);
  const owners: Array<ReturnType<typeof installStarCore>["star"]> = [];
  const groups: Array<ReturnType<typeof observeFeeds>> = [];
  try {
    for (const frame of frames) {
      const window = frame.contentWindow as Window & typeof globalThis;
      const observers = observeFeeds(window);
      groups.push(observers);
      const jquery = jQueryFactory(window);
      await withStarDOMRealm({ window, jQuery: jquery }, () => {
        const owner = installStarCore(jquery, { document: window.document }).star;
        owners.push(owner);
        owner.use(uiPlugin).enhance(feed(window.document).root);
        expect(observers).toHaveLength(1);
      });
    }
    owners[0]?.dispose();
    expect(groups[0]?.[0]?.disconnect).toHaveBeenCalledOnce();
    expect(groups[1]?.[0]?.disconnect).not.toHaveBeenCalled();
    owners[1]?.dispose();
    expect(groups[1]?.[0]?.disconnect).toHaveBeenCalledOnce();
  } finally {
    for (const owner of owners) owner.dispose();
    for (const frame of frames) frame.remove();
  }
});

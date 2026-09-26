import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { claimFloatingContent, currentFloatingOwner, reconcileFloating } from "../src/ui/floating";
import { releaseUIResources, uiResources } from "../src/ui/lifecycle";
import { withStarDOMRealm } from "../src/testing";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
const kinds = ["tooltip", "hoverCard", "popover", "menu", "contextMenu"] as const;
type Kind = (typeof kinds)[number];
const modes = ["render", "native", "dispose", "preserve"] as const;
let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;

beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
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
});

function part(root: ParentNode, name: string): HTMLElement {
  const found = root.querySelector<HTMLElement>(`[data-part="${name}"]`);
  if (!found) throw new Error(`Missing floating fixture part: ${name}`);
  return found;
}

function isHover(kind: Kind): boolean {
  return kind === "tooltip" || kind === "hoverCard";
}

function interaction(kind: Kind): string {
  return isHover(kind) ? "pointerenter" : kind === "contextMenu" ? "contextmenu" : "click";
}

function fixture(kind: Kind, owner = document) {
  const name = kind === "hoverCard" ? "hover-card" : kind === "contextMenu" ? "context-menu" : kind;
  const root = owner.createElement("div");
  root.dataset.jqs = name;
  root.dataset.delay = "50";
  root.dataset.closeDelay = "50";
  root.innerHTML = `<button data-part="trigger" aria-describedby="authored-hint">Open</button><div data-part="content">${kind === "tooltip" ? "Hint" : '<button data-part="checkbox-item">Inside</button>'}</div>`;
  owner.body.append(root);
  const trigger = part(root, "trigger");
  const content = part(root, "content");
  return { root, trigger, content, name };
}

function nativeFixture(kind: Kind) {
  const parts = fixture(kind);
  const { content } = parts;
  let nativeOpen = false;
  const matches = content.matches.bind(content);
  vi.spyOn(content, "matches").mockImplementation((selector) =>
    selector === ":popover-open" ? nativeOpen : matches(selector),
  );
  content.showPopover = () => {
    nativeOpen = true;
  };
  content.hidePopover = () => {
    nativeOpen = false;
  };
  ui.enhance(parts.root);
  return { ...parts, nativeOpen: () => nativeOpen, loseNativeOverlay: () => (nativeOpen = false) };
}

it("keeps the current floating owner when an old claim arrives after handoff", () => {
  const root = document.createElement("section");
  const trigger = document.createElement("button");
  const content = document.createElement("div");
  root.append(trigger, content);
  document.body.append(root);
  const first = { ...uiResources(root), content, trigger, open: false, nativeDepth: 0 };
  const second = { ...uiResources(root), content, trigger, open: false, nativeDepth: 0 };
  const stale = { ...uiResources(root), content, trigger, open: false, nativeDepth: 0 };
  const released = vi.fn();
  first.cleanup = () => {
    releaseUIResources(first);
    released();
  };
  second.cleanup = () => releaseUIResources(second);
  stale.cleanup = () => releaseUIResources(stale);
  const sync = vi.fn();

  claimFloatingContent(
    first,
    () => first.active,
    () => true,
    vi.fn(),
  );
  claimFloatingContent(
    second,
    () => second.active,
    () => true,
    sync,
  );
  expect(released).toHaveBeenCalledOnce();
  expect(currentFloatingOwner(content)).toBe(second);

  claimFloatingContent(
    second,
    () => second.active,
    () => true,
    sync,
  );
  expect(currentFloatingOwner(content)).toBe(second);
  expect(released).toHaveBeenCalledOnce();

  claimFloatingContent(
    stale,
    () => false,
    () => true,
    vi.fn(),
  );
  expect(currentFloatingOwner(content)).toBe(second);
  reconcileFloating(content, false);
  expect(sync).toHaveBeenCalledOnce();
  expect(currentFloatingOwner(content)).toBe(second);

  second.cleanup();
  expect(currentFloatingOwner(content)).toBeUndefined();
});

it("reconciles again when a live owner changes revision during synchronization", () => {
  const root = document.createElement("section");
  const trigger = document.createElement("button");
  const content = document.createElement("div");
  root.append(trigger, content);
  document.body.append(root);
  const record = { ...uiResources(root), content, trigger, open: false, nativeDepth: 0 };
  record.cleanup = () => releaseUIResources(record);
  const sync = vi.fn(() => {
    if (record.revision === 0) record.revision += 1;
  });

  claimFloatingContent(
    record,
    () => record.active,
    () => true,
    sync,
  );
  reconcileFloating(content, false);
  expect(sync).toHaveBeenCalledTimes(2);
  expect(currentFloatingOwner(content)).toBe(record);

  record.cleanup();
  expect(currentFloatingOwner(content)).toBeUndefined();
});

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

for (const kind of kinds) {
  it.each(modes)(
    `${kind} releases native interaction and delayed opening across %s`,
    async (mode) => {
      const { root, trigger, content, name } = fixture(kind);
      ui.enhance(root);
      await star.whenEnhanced();
      const opened = vi.fn();
      root.addEventListener(`jquery-star:${name}:open`, opened);
      if (isHover(kind)) trigger.dispatchEvent(new Event("pointerenter"));
      const finish = await boundary(root, mode);
      trigger.dispatchEvent(new Event(interaction(kind)));
      vi.advanceTimersByTime(100);
      expect(opened).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
      expect(content.hidden).toBe(mode !== "preserve");
      if (kind === "tooltip" && mode !== "preserve")
        expect(trigger.getAttribute("aria-describedby")).toBe("authored-hint");
      await finish?.();
    },
  );

  it.each(modes)(
    `${kind} releases an open panel without notifications or focus across %s`,
    async (mode) => {
      const { root, trigger, content, name } = fixture(kind);
      ui[kind].open(root);
      await star.whenEnhanced();
      content.querySelector<HTMLElement>("button")?.focus();
      const focused = vi.spyOn(trigger, "focus");
      const closed = vi.fn();
      root.addEventListener(`jquery-star:${name}:close`, closed);
      if (isHover(kind)) trigger.dispatchEvent(new Event("pointerleave"));
      const finish = await boundary(root, mode);
      expect(root.dataset.state).toBe(mode === "preserve" ? "open" : "closed");
      expect(content.hidden).toBe(mode !== "preserve");
      if (mode !== "preserve") vi.advanceTimersByTime(100);
      expect(closed).not.toHaveBeenCalled();
      expect(focused).not.toHaveBeenCalled();
      await finish?.();
    },
  );

  it(`${kind} reacquires exactly one listener set after native removal`, async () => {
    const { root, trigger, name } = fixture(kind);
    ui.enhance(root);
    root.remove();
    await star.whenEnhanced();
    document.body.append(root);
    ui.enhance(root);
    ui.enhance(root);
    const opened = vi.fn();
    const closed = vi.fn();
    root.addEventListener(`jquery-star:${name}:open`, opened);
    root.addEventListener(`jquery-star:${name}:close`, closed);
    trigger.dispatchEvent(new Event(interaction(kind)));
    vi.advanceTimersByTime(100);
    expect(opened).toHaveBeenCalledOnce();
    expect(closed).not.toHaveBeenCalled();
    expect(root.dataset.state).toBe("open");
  });

  it(`${kind} retains a connected move and explicit preservation`, async () => {
    const { root, trigger } = fixture(kind);
    ui.enhance(root);
    if (!isHover(kind)) ui[kind].open(root);
    else trigger.dispatchEvent(new Event("pointerenter"));
    const parent = document.createElement("section");
    document.body.append(parent);
    parent.append(root);
    await star.whenEnhanced();
    vi.advanceTimersByTime(100);
    const finish = await boundary(root, "preserve");
    expect(root.dataset.state).toBe("open");
    await finish?.();
    expect(root.dataset.state).toBe("open");
  });

  it.each(["before-open", "before-close"])(`${kind} stops after disposal from %s`, (phase) => {
    const { root, content, name } = fixture(kind);
    if (phase === "before-close") ui[kind].open(root);
    else ui.enhance(root);
    const emitted = vi.fn();
    const operation = phase === "before-open" ? "open" : "close";
    root.addEventListener(`jquery-star:${name}:${operation}`, emitted);
    root.addEventListener(`jquery-star:${name}:${phase}`, () => star.dispose());
    ui[kind][operation](root);
    expect(emitted).not.toHaveBeenCalled();
    expect(root.dataset.state).toBe("closed");
    expect(content.hidden).toBe(true);
  });

  it.each(["showPopover", "hidePopover"] as const)(
    `${kind} stops after disposal inside native %s`,
    (operation) => {
      const { root, content, name } = fixture(kind);
      const native = content as HTMLElement & { showPopover(): void; hidePopover(): void };
      native.showPopover = () => {
        content.hidden = false;
      };
      native.hidePopover = () => {
        content.hidden = true;
      };
      ui.enhance(root);
      if (operation === "hidePopover") ui[kind].open(root);
      native[operation] = () => {
        star.dispose();
        content.hidden = operation !== "showPopover";
      };
      const emitted = vi.fn();
      root.addEventListener(
        `jquery-star:${name}:${operation === "showPopover" ? "open" : "close"}`,
        emitted,
      );
      ui[kind][operation === "showPopover" ? "open" : "close"](root);
      expect(content.hidden).toBe(true);
      expect(root.dataset.state).toBe("closed");
      expect(emitted).not.toHaveBeenCalled();
    },
  );
}

for (const kind of kinds) {
  it(`${kind} reflects external native toggles and retains outside dismissal`, () => {
    const { root, trigger, content, name, nativeOpen } = nativeFixture(kind);
    const opened = vi.fn();
    const closed = vi.fn();
    root.addEventListener(`jquery-star:${name}:open`, opened);
    root.addEventListener(`jquery-star:${name}:close`, closed);
    ui[kind].open(root);
    expect(nativeOpen()).toBe(true);
    expect(opened).toHaveBeenCalledOnce();

    content.hidePopover();
    content.dispatchEvent(new Event("toggle"));
    expect(root.dataset.state).toBe("closed");
    expect(content.dataset.state).toBe("closed");
    if (kind === "popover" || kind === "hoverCard" || kind === "menu")
      expect(trigger.getAttribute("aria-expanded")).toBe("false");
    else expect(trigger.hasAttribute("aria-expanded")).toBe(false);

    content.showPopover();
    content.dispatchEvent(new Event("toggle"));
    expect(root.dataset.state).toBe("open");
    expect(content.dataset.state).toBe("open");
    if (kind === "popover" || kind === "hoverCard" || kind === "menu")
      expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(opened).toHaveBeenCalledOnce();
    expect(closed).not.toHaveBeenCalled();

    document.body.dispatchEvent(new Event("pointerdown", { bubbles: true }));
    expect(nativeOpen()).toBe(false);
    expect(root.dataset.state).toBe("closed");
    expect(closed).toHaveBeenCalledOnce();
  });
}

for (const kind of ["popover", "hoverCard"] as const) {
  it(`${kind} restores a lost native overlay, focus and viewport positioning`, () => {
    const { root, content, nativeOpen, loseNativeOverlay } = nativeFixture(kind);
    const opened = vi.fn();
    root.addEventListener(`jquery-star:${kind === "hoverCard" ? "hover-card" : kind}:open`, opened);
    ui[kind].open(root);
    const focused = part(content, "checkbox-item");
    focused.focus();
    expect(document.activeElement).toBe(focused);
    loseNativeOverlay();
    content.style.removeProperty("left");
    content.style.removeProperty("top");

    ui.enhance(root);
    expect(nativeOpen()).toBe(true);
    expect(root.dataset.state).toBe("open");
    expect(document.activeElement).toBe(focused);
    expect(opened).toHaveBeenCalledOnce();

    content.style.removeProperty("left");
    content.style.removeProperty("top");
    window.dispatchEvent(new Event("resize"));
    expect(content.style.left).not.toBe("");
    expect(content.style.top).not.toBe("");
  });
}

for (const kind of ["tooltip", "hoverCard"] as const) {
  it(`${kind} physically cancels timers and ignores an already queued callback`, async () => {
    const { root, trigger } = fixture(kind);
    ui.enhance(root);
    await star.whenEnhanced();
    const callbacks: Array<() => void> = [];
    const set = window.setTimeout.bind(window);
    vi.spyOn(window as Window, "setTimeout").mockImplementation((callback, delay) => {
      if (typeof callback === "function") callbacks.push(callback as () => void);
      return set(callback, delay);
    });
    const timers = vi.getTimerCount();
    trigger.dispatchEvent(new Event("pointerenter"));
    expect(vi.getTimerCount()).toBe(timers + 1);
    star.dispose();
    expect(vi.getTimerCount()).toBe(timers);
    for (const callback of callbacks) callback();
    expect(root.dataset.state).toBe("closed");
  });
}

it("Popover stops its open notification after initial focus disposes the owner", () => {
  const { root, content } = fixture("popover");
  root.dataset.initialFocus = "button";
  part(content, "checkbox-item").addEventListener("focus", () => star.dispose());
  const opened = vi.fn();
  root.addEventListener("jquery-star:popover:open", opened);
  ui.popover.open(root);
  expect(opened).not.toHaveBeenCalled();
  expect(content.hidden).toBe(true);
});

it.each(["popover", "hoverCard"] as const)(
  "%s stops its close notification after focus disposal",
  (kind) => {
    const { root, content, trigger, name } = fixture(kind);
    ui[kind].open(root);
    part(content, "checkbox-item").focus();
    trigger.addEventListener("focus", () => star.dispose());
    const closed = vi.fn();
    root.addEventListener(`jquery-star:${name}:close`, closed);
    ui[kind].close(root);
    expect(closed).not.toHaveBeenCalled();
  },
);

it.each(["tooltip", "hoverCard"] as const)(
  "%s owns timers and geometry in two documents",
  async (kind) => {
    const frames = [document.createElement("iframe"), document.createElement("iframe")];
    document.body.append(...frames);
    const stars: Array<ReturnType<typeof installStarCore>["star"]> = [];
    const pending: Array<Map<number, () => void>> = [];
    const contents: HTMLElement[] = [];
    try {
      for (const [index, frame] of frames.entries()) {
        const owner = frame.contentWindow as Window & typeof globalThis;
        const jquery = jQueryFactory(owner);
        const timers = new Map<number, () => void>();
        pending.push(timers);
        vi.spyOn(owner as Window, "setTimeout").mockImplementation((callback) => {
          const id = 100 + timers.size;
          timers.set(id, callback as () => void);
          return id;
        });
        vi.spyOn(owner as Window, "clearTimeout").mockImplementation((id) => {
          if (id !== undefined) timers.delete(id);
        });
        vi.spyOn(owner, "innerWidth", "get").mockReturnValue(140 + index * 100);
        await withStarDOMRealm({ window: owner, jQuery: jquery }, () => {
          const local = installStarCore(jquery, { document: owner.document }).star;
          stars.push(local);
          const localUI = local.use(uiPlugin);
          const { root, trigger, content } = fixture(kind, owner.document);
          contents.push(content);
          localUI.enhance(root);
          trigger.dispatchEvent(new Event("pointerenter"));
        });
        expect(timers.size).toBe(1);
      }
      stars[0]?.dispose();
      expect(pending.map((timers) => timers.size)).toEqual([0, 1]);
      const content = contents[1];
      if (!content) throw new Error("Missing second floating document.");
      const trigger = content.previousElementSibling as HTMLElement;
      vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue(new DOMRect(300, 100, 20, 10));
      vi.spyOn(content, "getBoundingClientRect").mockReturnValue(new DOMRect(0, 0, 50, 20));
      for (const callback of pending[1]?.values() ?? []) callback();
      expect(content.style.left).toBe("182px");
    } finally {
      stars.forEach((owner) => owner.dispose());
      frames.forEach((frame) => frame.remove());
    }
  },
);

it("Tooltip preserves an authored description that already names its content", () => {
  const { root, trigger, content } = fixture("tooltip");
  content.id = "authored-tooltip-content";
  trigger.setAttribute("aria-describedby", "authored-hint authored-tooltip-content");
  ui.enhance(root);
  ui.enhance(root);
  star.dispose();
  expect(trigger.getAttribute("aria-describedby")).toBe("authored-hint authored-tooltip-content");
});

for (const kind of kinds) {
  it.each(["showPopover", "hidePopover"] as const)(
    `${kind} stops replacement enhancement after native %s disposes`,
    (operation) => {
      const { root, trigger, content } = fixture(kind);
      const native = content as HTMLElement & { showPopover(): void; hidePopover(): void };
      native.showPopover = () => {
        content.hidden = false;
      };
      native.hidePopover = () => {
        content.hidden = true;
      };
      ui[kind].open(root);
      const replacement = content.cloneNode(true) as typeof native;
      replacement.showPopover = () => {
        if (operation === "showPopover") star.dispose();
        replacement.hidden = false;
      };
      replacement.hidePopover = () => {
        replacement.hidden = true;
      };
      native.hidePopover = () => {
        if (operation === "hidePopover") star.dispose();
        content.hidden = true;
      };
      content.replaceWith(replacement);
      const added = vi.spyOn(trigger, "addEventListener");
      ui.enhance(root);
      expect(added).not.toHaveBeenCalled();
      expect(root.dataset.state).toBe("closed");
      if (operation === "showPopover") expect(replacement.hidden).toBe(true);
    },
  );
}

it.each(["menu", "contextMenu"] as const)("%s stops selection changes after disposal", (kind) => {
  const { root, content, name } = fixture(kind);
  ui[kind].open(root);
  root.addEventListener(`jquery-star:${name}:select`, () => star.dispose());
  const item = part(content, "checkbox-item");
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });
  item.dispatchEvent(event);
  expect(item.getAttribute("aria-checked")).toBe("false");
  expect(event.defaultPrevented).toBe(true);
});

it.each(["menu", "contextMenu"] as const)("%s releases typeahead timers with its owner", (kind) => {
  const { root, content } = fixture(kind);
  ui[kind].open(root);
  const timers = vi.getTimerCount();
  part(content, "checkbox-item").dispatchEvent(
    new KeyboardEvent("keydown", { key: "i", bubbles: true }),
  );
  expect(vi.getTimerCount()).toBe(timers + 1);
  star.dispose();
  expect(vi.getTimerCount()).toBe(timers);
});

it.each(modes)("Context Menu owns a pending touch long press across %s", async (mode) => {
  const { root, trigger } = fixture("contextMenu");
  ui.enhance(root);
  await star.whenEnhanced();
  const event = new MouseEvent("pointerdown", { bubbles: true, clientX: 20, clientY: 30 });
  Object.defineProperty(event, "pointerType", { value: "touch" });
  trigger.dispatchEvent(event);
  const finish = await boundary(root, mode);
  vi.advanceTimersByTime(600);
  expect(root.dataset.state).toBe(mode === "preserve" ? "open" : "closed");
  await finish?.();
});

it("Menu stops opening a sibling when before-close disposes the installation", () => {
  const first = fixture("menu");
  const second = fixture("menu");
  ui.menu.open(first.root);
  first.root.addEventListener("jquery-star:menu:before-close", () => star.dispose());
  const opened = vi.fn();
  second.root.addEventListener("jquery-star:menu:open", opened);
  ui.menu.open(second.root);
  expect(opened).not.toHaveBeenCalled();
  expect(second.root.dataset.state).toBe("closed");
  expect(second.content.hidden).toBe(true);
});

function menubarFixture() {
  const root = document.createElement("div");
  root.dataset.jqs = "menubar";
  for (const label of ["Alpha", "Beta"]) {
    const { root: menu, trigger } = fixture("menu");
    menu.dataset.part = "menu";
    menu.dataset.value = label;
    trigger.textContent = label;
    root.append(menu);
  }
  document.body.append(root);
  ui.enhance(root);
  const menus = [...root.children] as HTMLElement[];
  return { root, menus, triggers: menus.map((menu) => part(menu, "trigger")) };
}

it.each(modes)("Menubar owns keyboard listeners and open child panels across %s", async (mode) => {
  const { root, triggers, menus } = menubarFixture();
  ui.menubar.open(root, "Alpha");
  await star.whenEnhanced();
  const first = triggers[0];
  const second = triggers[1];
  if (!first || !second) throw new Error("Missing Menubar triggers.");
  const focused = vi.spyOn(second, "focus");
  const finish = await boundary(root, mode);
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  expect(focused).toHaveBeenCalledTimes(mode === "preserve" ? 1 : 0);
  expect(root.dataset.state).toBe(mode === "preserve" ? "open" : "closed");
  if (mode !== "preserve")
    expect(menus.every((menu) => menu.dataset.state === "closed")).toBe(true);
  await finish?.();
});

it("Menubar releases typeahead and reacquires one keyboard listener set", async () => {
  const { root, triggers } = menubarFixture();
  const first = triggers[0];
  const second = triggers[1];
  if (!first || !second) throw new Error("Missing Menubar triggers.");
  const scheduled = vi.spyOn(window as Window, "setTimeout");
  const cleared = vi.spyOn(window as Window, "clearTimeout");
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
  const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 500);
  expect(index).toBeGreaterThanOrEqual(0);
  const timer = scheduled.mock.results[index]?.value;
  root.remove();
  await star.whenEnhanced();
  expect(cleared).toHaveBeenCalledWith(timer);
  document.body.append(root);
  ui.enhance(root);
  ui.enhance(root);
  const focused = vi.spyOn(second, "focus");
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  expect(focused).toHaveBeenCalledOnce();
});

it("Menubar stops a menu switch after focus disposes its owner", () => {
  const { root, triggers } = menubarFixture();
  ui.menubar.open(root, "Alpha");
  const first = triggers[0];
  const second = triggers[1];
  if (!first || !second) throw new Error("Missing Menubar triggers.");
  second.addEventListener("focus", () => star.dispose());
  const opened = vi.fn();
  root.addEventListener("jquery-star:menu:open", opened);
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }));
  expect(opened).not.toHaveBeenCalled();
  expect(root.dataset.state).toBe("closed");
});

it("Menubar stops closing siblings after a child callback disposes its owner", () => {
  const { root, menus } = menubarFixture();
  for (const menu of menus) {
    ui.menu.open(menu);
    menu.addEventListener("jquery-star:menu:before-close", (event) => event.preventDefault());
  }
  menus[0]?.addEventListener("jquery-star:menu:before-close", () => star.dispose());
  expect(() => ui.menubar.close(root)).not.toThrow();
  expect(root.dataset.state).toBe("closed");
});

it("Menubar preserves a pending typeahead timer across unchanged enhancement", () => {
  const { root, triggers } = menubarFixture();
  const first = triggers[0];
  if (!first) throw new Error("Missing Menubar trigger.");
  const scheduled = vi.spyOn(window as Window, "setTimeout");
  const cleared = vi.spyOn(window as Window, "clearTimeout");
  first.dispatchEvent(new KeyboardEvent("keydown", { key: "b", bubbles: true }));
  const index = scheduled.mock.calls.findIndex(([, delay]) => delay === 500);
  expect(index).toBeGreaterThanOrEqual(0);
  const timer = scheduled.mock.results[index]?.value;
  ui.enhance(root);
  expect(cleared).not.toHaveBeenCalledWith(timer);
});

it.each(["menu", "contextMenu", "menubar"] as const)(
  "%s releases only its own document's timer",
  async (kind) => {
    const frames = [document.createElement("iframe"), document.createElement("iframe")];
    document.body.append(...frames);
    const owners: Array<ReturnType<typeof installStarCore>["star"]> = [];
    const pending: Array<Map<number, () => void>> = [];
    try {
      for (const frame of frames) {
        const owner = frame.contentWindow as Window & typeof globalThis;
        const jquery = jQueryFactory(owner);
        const timers = new Map<number, () => void>();
        pending.push(timers);
        await withStarDOMRealm({ window: owner, jQuery: jquery }, () => {
          const local = installStarCore(jquery, { document: owner.document }).star;
          owners.push(local);
          const localUI = local.use(uiPlugin);
          const root =
            kind === "menubar"
              ? owner.document.createElement("div")
              : fixture(kind, owner.document).root;
          if (kind === "menubar") {
            root.dataset.jqs = "menubar";
            root.innerHTML =
              '<div data-part="menu" data-jqs="menu"><button data-part="trigger">Alpha</button><div data-part="content"><button data-part="item">A</button></div></div>';
            owner.document.body.append(root);
          }
          localUI.enhance(root);
          if (kind === "menu") localUI.menu.open(root);
          const schedule = owner.setTimeout.bind(owner);
          vi.spyOn(owner as Window, "setTimeout").mockImplementation((callback, delay) => {
            if (delay !== 500 && delay !== 550) return schedule(callback, delay);
            timers.set(500, callback as () => void);
            return 500;
          });
          vi.spyOn(owner as Window, "clearTimeout").mockImplementation((id) => {
            if (id !== undefined) timers.delete(id);
          });
          if (kind === "contextMenu") {
            const event = new MouseEvent("pointerdown", { bubbles: true });
            Object.defineProperty(event, "pointerType", { value: "touch" });
            part(root, "trigger").dispatchEvent(event);
          } else {
            part(root, kind === "menu" ? "checkbox-item" : "trigger").dispatchEvent(
              new KeyboardEvent("keydown", { key: "a", bubbles: true }),
            );
          }
        });
        expect(timers.size).toBe(1);
      }
      owners[0]?.dispose();
      expect(pending.map((timers) => timers.size)).toEqual([0, 1]);
      owners[1]?.dispose();
      expect(pending.map((timers) => timers.size)).toEqual([0, 0]);
    } finally {
      owners.forEach((owner) => owner.dispose());
      frames.forEach((frame) => frame.remove());
    }
  },
);

it.each(kinds)("%s ignores an added root removed before automatic enhancement", async (kind) => {
  const { root, trigger, name } = fixture(kind);
  root.remove();
  await star.whenEnhanced();
  const opened = vi.fn();
  root.addEventListener(`jquery-star:${name}:open`, opened);
  trigger.dispatchEvent(new Event(interaction(kind)));
  vi.advanceTimersByTime(100);
  expect(opened).not.toHaveBeenCalled();
  // Explicit acquisition is still allowed for this detached root.
  ui.enhance(root);
  trigger.dispatchEvent(new Event(interaction(kind)));
  vi.advanceTimersByTime(100);
  expect(opened).toHaveBeenCalledOnce();
});

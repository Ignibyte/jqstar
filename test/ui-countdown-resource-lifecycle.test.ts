import $ from "jquery";
import { createRequire } from "node:module";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { withStarDOMRealm } from "../src/testing";
import { uiPlugin } from "../src/ui";

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(window: Window): JQueryStatic;
};
let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;
beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-19T12:00:00Z"));
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});
afterEach(() => {
  star.dispose();
  // Drain escaped callbacks in the negative implementation before replacing fake timers.
  vi.runOnlyPendingTimers();
  vi.clearAllTimers();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function fixture(paused = false, owner = document) {
  const root = owner.createElement("section");
  root.dataset.jqs = "countdown";
  root.dataset.duration = "10";
  if (paused) root.dataset.paused = "true";
  root.innerHTML =
    '<span data-part="seconds"></span><span data-part="value"></span><output data-part="status"></output>';
  owner.body.append(root);
  return root;
}
function rendered(root: HTMLElement) {
  return root.querySelector('[data-part="value"]')?.textContent;
}
function observe(root: HTMLElement, name: string, listener: EventListener, once = false) {
  root.addEventListener(`jquery-star:countdown:${name}`, listener, { once });
}

it.each(["dispose", "render"] as const)(
  "cancels an interval acquired during %s retirement",
  async (mode) => {
    const root = fixture();
    const owner: Window = window;
    const schedule = owner.setInterval.bind(owner);
    const clear = vi.spyOn(owner, "clearInterval");
    let timer: number | undefined;
    let operation: ReturnType<ReturnType<typeof createRenderAdapter>["begin"]> | undefined;
    vi.spyOn(owner, "setInterval").mockImplementationOnce((...args) => {
      if (mode === "dispose") star.dispose();
      else {
        operation = createRenderAdapter(installed).begin(document.body);
        operation.beforeRemove(root);
      }
      timer = schedule(...args);
      return timer;
    });
    ui.enhance(root);
    expect(clear.mock.calls.some(([cleared]) => cleared === timer)).toBe(true);
    expect(vi.getTimerCount()).toBe(0);
    const original = root.innerHTML;
    vi.advanceTimersByTime(20_000);
    expect(root.innerHTML).toBe(original);
    root.remove();
    await operation?.commit();
  },
);

it("shares one provisional clock when native scheduling enhances another Countdown", () => {
  const first = fixture();
  const second = fixture();
  const owner: Window = window;
  const schedule = owner.setInterval.bind(owner);
  vi.spyOn(owner, "setInterval").mockImplementationOnce((...args) => {
    ui.enhance(second);
    return schedule(...args);
  });
  ui.enhance(first);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(rendered(first)).toBe("9");
  expect(rendered(second)).toBe("9");
});

it("keeps the replacement clock acquired during native cancellation", () => {
  const first = fixture();
  const second = fixture(true);
  ui.enhance(first);
  ui.enhance(second);
  const owner: Window = window;
  const clear = owner.clearInterval.bind(owner);
  vi.spyOn(owner, "clearInterval").mockImplementationOnce((timer) => {
    ui.countdown.start(second, 20);
    clear(timer);
  });
  ui.countdown.pause(first);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(rendered(first)).toBe("10");
  expect(rendered(second)).toBe("19");
});

it("releases a failed enrollment before another root acquires its shared clock", () => {
  const failed = fixture();
  const second = fixture();
  vi.spyOn(window, "setInterval").mockImplementationOnce(() => {
    throw new Error("schedule failed");
  });
  expect(() => ui.enhance(failed)).toThrow("schedule failed");
  ui.enhance(second);
  vi.advanceTimersByTime(1000);
  expect(rendered(failed)).toBe("10");
  expect(rendered(second)).toBe("9");
  ui.enhance(failed);
  expect(rendered(failed)).toBe("9");
  expect(vi.getTimerCount()).toBe(1);
});

it("releases a cleared lease even when native cancellation throws", () => {
  const first = fixture();
  const second = fixture(true);
  ui.enhance(first);
  ui.enhance(second);
  const owner: Window = window;
  const clear = owner.clearInterval.bind(owner);
  vi.spyOn(owner, "clearInterval").mockImplementationOnce((timer) => {
    clear(timer);
    throw new Error("cancel failed");
  });
  expect(() => ui.countdown.pause(first)).toThrow("cancel failed");
  ui.countdown.start(second, 20);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(rendered(second)).toBe("19");
});

it("ignores a late tick from a superseded interval", () => {
  const root = fixture();
  const owner: Window = window;
  const schedule = owner.setInterval.bind(owner);
  let late: (() => void) | undefined;
  vi.spyOn(owner, "setInterval").mockImplementationOnce((callback, ...args) => {
    if (typeof callback !== "function") throw new Error("Expected interval callback");
    late = callback as () => void;
    return schedule(callback, ...args);
  });
  ui.enhance(root);
  ui.countdown.pause(root);
  ui.countdown.resume(root);
  vi.setSystemTime(Date.now() + 2000);
  late?.();
  expect(rendered(root)).toBe("10");
  vi.advanceTimersByTime(1000);
  expect(rendered(root)).toBe("7");
});

it.each(["start", "reset"] as const)(
  "stops %s completion after its event disposes the controller",
  (operation) => {
    const root = fixture(true);
    root.dataset.duration = "0";
    ui.enhance(root);
    const complete = vi.fn();
    observe(root, operation, () => star.dispose());
    observe(root, "complete", complete);
    ui.countdown[operation](root);
    expect(complete).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("does not notify resume after disposal during scheduling", () => {
  const root = fixture(true);
  ui.enhance(root);
  const owner: Window = window;
  const schedule = owner.setInterval.bind(owner);
  vi.spyOn(owner, "setInterval").mockImplementationOnce((...args) => {
    star.dispose();
    return schedule(...args);
  });
  const resumed = vi.fn();
  observe(root, "resume", resumed);
  ui.countdown.resume(root);
  expect(resumed).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it.each(["dispose", "restart"] as const)("stops pause after completion causes %s", (operation) => {
  const root = fixture();
  ui.enhance(root);
  const paused = vi.fn();
  observe(root, "pause", paused);
  observe(
    root,
    "complete",
    () => {
      if (operation === "dispose") star.dispose();
      else ui.countdown.start(root, 20);
    },
    true,
  );
  vi.setSystemTime(Date.now() + 20_000);
  ui.countdown.pause(root);
  expect(paused).not.toHaveBeenCalled();
  if (operation === "restart") {
    expect(root.dataset.state).toBe("running");
    expect(rendered(root)).toBe("20");
    expect(vi.getTimerCount()).toBe(1);
  }
});

it.each([false, true])(
  "does not visit restarted roots with an older tick timestamp (paused=%s)",
  (paused) => {
    const first = fixture();
    const second = fixture(paused);
    ui.enhance(first);
    ui.enhance(second);
    ui.countdown.start(first, 1);
    observe(first, "complete", () => {
      vi.setSystemTime(Date.now() + 2000);
      ui.countdown.start(second, 10);
    });
    vi.advanceTimersByTime(1000);
    expect(rendered(second)).toBe("10");
    expect(vi.getTimerCount()).toBe(1);
  },
);

it("keeps one live interval when disposal installs a replacement kernel during scheduling", () => {
  const oldRoot = fixture();
  const newRoot = fixture();
  const previousUI = ui;
  const owner: Window = window;
  const schedule = owner.setInterval.bind(owner);
  vi.spyOn(owner, "setInterval").mockImplementationOnce((...args) => {
    star.dispose();
    installed = installStarCore($, { document });
    star = installed.star;
    ui = star.use(uiPlugin);
    ui.enhance(newRoot);
    return schedule(...args);
  });
  previousUI.enhance(oldRoot);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(1000);
  expect(rendered(oldRoot)).toBe("10");
  expect(rendered(newRoot)).toBe("9");
  star.dispose();
  expect(vi.getTimerCount()).toBe(0);
});

it("retires every participant when the shared provisional schedule fails", () => {
  const first = fixture();
  const second = fixture();
  const live = fixture();
  vi.spyOn(window, "setInterval").mockImplementationOnce(() => {
    ui.enhance(second);
    throw new Error("shared schedule failed");
  });
  expect(() => ui.enhance(first)).toThrow("shared schedule failed");
  ui.enhance(live);
  vi.advanceTimersByTime(1000);
  expect(rendered(first)).toBe("10");
  expect(rendered(second)).toBe("10");
  expect(rendered(live)).toBe("9");
  ui.enhance(first);
  ui.enhance(second);
  expect(rendered(first)).toBe("9");
  expect(rendered(second)).toBe("9");
  expect(vi.getTimerCount()).toBe(1);
});

it("preserves deadlines through retirement and binds one clock after reinstallation", async () => {
  const root = fixture();
  ui.enhance(root);
  await star.whenEnhanced();
  vi.advanceTimersByTime(2000);
  star.dispose();
  vi.advanceTimersByTime(3000);
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
  ui.enhance(root);
  ui.enhance(root);
  expect(rendered(root)).toBe("5");
  expect(vi.getTimerCount()).toBe(1);
  const complete = vi.fn();
  observe(root, "complete", complete);
  vi.advanceTimersByTime(5000);
  expect(rendered(root)).toBe("0");
  expect(complete).toHaveBeenCalledOnce();
  expect(vi.getTimerCount()).toBe(0);
});

it("retires old-document clock work immediately after native adoption", () => {
  const root = fixture();
  ui.enhance(root);
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const foreign = frame.contentDocument;
  if (!foreign) throw new Error("Missing foreign document");
  foreign.body.append(root);
  const changed = vi.fn();
  observe(root, "complete", changed);
  const original = root.innerHTML;
  vi.advanceTimersByTime(20_000);
  expect(root.innerHTML).toBe(original);
  expect(changed).not.toHaveBeenCalled();
  expect(vi.getTimerCount()).toBe(0);
});

it("dispatches completion in the clock's owning document after its realm lease ends", async () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const foreign = frame.contentWindow as (Window & typeof globalThis) | null;
  if (!foreign) throw new Error("Missing foreign window");
  const owner: Window = foreign;
  let tick: (() => void) | undefined;
  vi.spyOn(owner, "setInterval").mockImplementation((callback) => {
    if (typeof callback !== "function") throw new Error("Expected interval callback");
    tick = callback as () => void;
    return 1;
  });
  const cleared = vi.spyOn(owner, "clearInterval");
  const owned = await withStarDOMRealm({ window: foreign, document: foreign.document }, () => {
    const other = installStarCore(jQueryFactory(foreign), { document: foreign.document });
    const otherStar = other.star;
    const otherUI = otherStar.use(uiPlugin);
    const root = fixture(false, foreign.document);
    otherUI.enhance(root);
    return { root, star: otherStar };
  });
  try {
    const events: Event[] = [];
    observe(owned.root, "complete", (event) => events.push(event));
    vi.setSystemTime(Date.now() + 20_000);
    tick?.();
    expect(events).toHaveLength(1);
    expect(events[0]).toBeInstanceOf(foreign.CustomEvent);
    expect(cleared).toHaveBeenCalledWith(1);
  } finally {
    owned.star.dispose();
  }
});

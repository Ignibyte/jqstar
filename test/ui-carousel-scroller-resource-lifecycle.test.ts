import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRenderAdapter, installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";

let installed: ReturnType<typeof installStarCore>;
let star: ReturnType<typeof installStarCore>["star"];
let ui: ReturnType<typeof uiPlugin.install>;
let failedDisposal = false;
beforeEach(() => {
  document.body.replaceChildren();
  vi.useFakeTimers();
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
  failedDisposal = false;
});
afterEach(() => {
  if (failedDisposal) expect(() => star.dispose()).toThrow();
  else star.dispose();
  document.body.replaceChildren();
  vi.clearAllTimers();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

type Kind = "carousel" | "message-scroller";
function part<T extends Element>(root: ParentNode, name: string, type: new () => T): T {
  const found = root.querySelector(`[data-part="${name}"]`);
  if (!(found instanceof type)) throw new Error(`Missing ${name} fixture part`);
  return found;
}
function fixture(kind: Kind) {
  const root = document.createElement("section");
  root.dataset.jqs = kind;
  if (kind === "carousel") {
    root.dataset.autoplay = "1000";
    root.dataset.loop = "";
    root.innerHTML =
      '<div data-part="content"><article data-part="slide" data-value="a"><button>First action</button></article><article data-part="slide" data-value="b">B</article><article data-part="slide" data-value="c">C</article></div><button data-part="previous">Previous</button><button data-part="next">Next</button><button data-part="rotation">Rotate</button><span data-part="status"></span>';
  } else {
    root.innerHTML =
      '<div data-part="viewport"><div data-part="content"><p data-jqs="message">Original</p></div></div><button data-part="latest"><span data-part="latest-label">Latest</span></button>';
    const view = part(root, "viewport", HTMLElement);
    Object.defineProperties(view, {
      scrollHeight: { configurable: true, value: 1000 },
      clientHeight: { configurable: true, value: 100 },
    });
    view.scrollTo = (options?: ScrollToOptions | number): void => {
      view.scrollTop = typeof options === "object" ? (options.top ?? 0) : (options ?? 0);
    };
  }
  document.body.append(root);
  return root;
}
function on(root: HTMLElement, name: string, callback: EventListener, once = false) {
  root.addEventListener(`jquery-star:${root.dataset.jqs}:${name}`, callback, { once });
}
function pause(root: HTMLElement, kind: Kind) {
  if (kind === "carousel") ui.carousel.pause(root);
  else ui.messageScroller.follow(root, false);
}
function resume(root: HTMLElement, kind: Kind) {
  if (kind === "carousel") ui.carousel.play(root);
  else ui.messageScroller.follow(root, true);
}

describe.each(["carousel", "message-scroller"] as const)("%s provisional resources", (kind) => {
  it.each(["dispose", "render"] as const)(
    "cancels a timeout acquired during %s cleanup",
    async (mode) => {
      const root = fixture(kind);
      const owner: Window = window;
      const schedule = owner.setTimeout.bind(owner);
      const cleared = vi.spyOn(owner, "clearTimeout");
      let timer: number | undefined;
      let operation: ReturnType<ReturnType<typeof createRenderAdapter>["begin"]> | undefined;
      vi.spyOn(owner, "setTimeout").mockImplementationOnce((...args) => {
        if (mode === "dispose") star.dispose();
        else {
          operation = createRenderAdapter(installed).begin(document.body);
          operation.beforeRemove(root);
        }
        timer = schedule(...args);
        return timer;
      });
      ui.enhance(root);
      expect(cleared.mock.calls.some(([handle]) => handle === timer)).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
      root.remove();
      await operation?.commit();
    },
  );

  it("rolls back earlier native listeners when a later registration throws", () => {
    const root = fixture(kind);
    root.remove();
    const earlier = part(root, kind === "carousel" ? "next" : "viewport", HTMLElement);
    const target = part(root, kind === "carousel" ? "content" : "latest", HTMLElement);
    const removed = vi.spyOn(earlier, "removeEventListener");
    const observed = vi.spyOn(MutationObserver.prototype, "observe");
    const add = target.addEventListener.bind(target);
    vi.spyOn(target, "addEventListener").mockImplementation((...args) => {
      add(...args);
      throw new Error("registration failed");
    });
    try {
      expect(() => ui.enhance(root)).toThrow("registration failed");
      expect(
        removed.mock.calls.some(([name]) => name === (kind === "carousel" ? "click" : "scroll")),
      ).toBe(true);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      for (const observer of observed.mock.contexts) {
        if (observer instanceof MutationObserver) observer.disconnect();
      }
    }
  });

  it("stops native acquisition when an early registration disposes the installation", () => {
    const root = fixture(kind);
    const target = part(root, kind === "carousel" ? "previous" : "viewport", HTMLElement);
    const add = target.addEventListener.bind(target);
    const removed = vi.spyOn(target, "removeEventListener");
    vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
      star.dispose();
      add(...args);
    });
    const later = part(root, kind === "carousel" ? "next" : "latest", HTMLElement);
    const addedLater = vi.spyOn(later, "addEventListener");
    expect(() => ui.enhance(root)).not.toThrow();
    expect(addedLater).not.toHaveBeenCalled();
    expect(removed).toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("sweeps the remaining bindings and timers when one removal throws", () => {
    const root = fixture(kind);
    ui.enhance(root);
    const earlier = part(root, kind === "carousel" ? "previous" : "viewport", HTMLElement);
    const later = part(root, kind === "carousel" ? "next" : "latest", HTMLElement);
    const remove = earlier.removeEventListener.bind(earlier);
    vi.spyOn(earlier, "removeEventListener").mockImplementationOnce((...args) => {
      remove(...args);
      throw new Error("removal failed");
    });
    const removedLater = vi.spyOn(later, "removeEventListener");
    failedDisposal = true;
    expect(() => star.dispose()).toThrow();
    expect(removedLater).toHaveBeenCalledWith("click", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
  });

  it("ignores canceled timer callbacks even while the same root remains active", () => {
    const root = fixture(kind);
    const owner: Window = window;
    const schedule = owner.setTimeout.bind(owner);
    let late: (() => void) | undefined;
    vi.spyOn(owner, "setTimeout").mockImplementationOnce((callback, ...args) => {
      if (typeof callback !== "function") throw new Error("Expected timer callback");
      late = callback as () => void;
      return schedule(callback, ...args);
    });
    ui.enhance(root);
    pause(root, kind);
    resume(root, kind);
    const changed = vi.fn();
    on(root, kind === "carousel" ? "change" : "latest", changed);
    late?.();
    expect(changed).not.toHaveBeenCalled();
  });

  it("keeps the replacement record acquired during native listener cleanup", () => {
    const root = fixture(kind);
    ui.enhance(root);
    const old = part(root, kind === "carousel" ? "next" : "latest", HTMLButtonElement);
    const replacement = old.cloneNode(true) as HTMLButtonElement;
    old.replaceWith(replacement);
    const remove = old.removeEventListener.bind(old);
    let reentered = false;
    vi.spyOn(old, "removeEventListener").mockImplementation((...args) => {
      remove(...args);
      if (!reentered) {
        reentered = true;
        ui.enhance(root);
      }
    });
    ui.enhance(root);
    const changed = vi.fn();
    on(root, kind === "carousel" ? "change" : "latest", changed);
    replacement.click();
    expect(changed).toHaveBeenCalledOnce();
    const removed = vi.spyOn(replacement, "removeEventListener");
    star.dispose();
    expect(removed.mock.calls.filter(([name]) => name === "click")).toHaveLength(1);
  });

  it("retains explicit paused state across removal and reacquisition", async () => {
    const root = fixture(kind);
    ui.enhance(root);
    pause(root, kind);
    root.remove();
    await star.whenEnhanced();
    document.body.append(root);
    ui.enhance(root);
    expect(kind === "carousel" ? root.dataset.rotation : root.dataset.state).toBe("paused");
    expect(vi.getTimerCount()).toBe(0);
  });
});

it("Carousel unchanged enhancement preserves bindings and the pending autoplay deadline", () => {
  const root = fixture("carousel");
  ui.enhance(root);
  const next = part(root, "next", HTMLButtonElement);
  const added = vi.spyOn(next, "addEventListener");
  const schedule = vi.spyOn(window, "setTimeout");
  vi.advanceTimersByTime(600);
  ui.enhance(root);
  ui.enhance(root);
  expect(added).not.toHaveBeenCalled();
  expect(schedule).not.toHaveBeenCalled();
  vi.advanceTimersByTime(400);
  expect(ui.carousel.value(root)).toBe("b");
});

it.each([false, true])(
  "Carousel keeps a newer selection from before-change (canceled=%s)",
  (cancel) => {
    const root = fixture("carousel");
    ui.enhance(root);
    const changed = vi.fn();
    on(root, "change", changed);
    on(
      root,
      "before-change",
      (event) => {
        ui.carousel.go(root, "c");
        if (cancel) event.preventDefault();
      },
      true,
    );
    ui.carousel.next(root);
    expect(ui.carousel.value(root)).toBe("c");
    expect(root.dataset.value).toBe("c");
    expect(changed).toHaveBeenCalledOnce();
  },
);

it("Carousel stops change notification after focus disposes the controller", () => {
  const root = fixture("carousel");
  ui.enhance(root);
  root.querySelector("article button")?.dispatchEvent(new Event("focus"));
  const action = root.querySelector<HTMLButtonElement>("article button");
  action?.focus();
  const content = part(root, "content", HTMLElement);
  content.addEventListener("focus", () => star.dispose());
  const changed = vi.fn();
  on(root, "change", changed);
  ui.carousel.next(root);
  expect(changed).not.toHaveBeenCalled();
});

it("Carousel does not notify play after native scheduling disposes the controller", () => {
  const root = fixture("carousel");
  ui.enhance(root);
  ui.carousel.pause(root);
  const owner: Window = window;
  const schedule = owner.setTimeout.bind(owner);
  vi.spyOn(owner, "setTimeout").mockImplementationOnce((...args) => {
    star.dispose();
    return schedule(...args);
  });
  const played = vi.fn();
  on(root, "play", played);
  ui.carousel.play(root);
  expect(played).not.toHaveBeenCalled();
});

it.each(["throw", "dispose"] as const)(
  "Message Scroller releases provisional observers after observe %s",
  (mode) => {
    const root = fixture("message-scroller");
    root.remove();
    const content = part(root, "content", HTMLElement);
    const observers: MutationObserver[] = [];
    const native = MutationObserver.prototype.observe;
    const disconnected = vi.spyOn(MutationObserver.prototype, "disconnect");
    const observed = vi.spyOn(MutationObserver.prototype, "observe").mockImplementation(function (
      this: MutationObserver,
      ...args
    ) {
      if (args[0] !== content) return native.apply(this, args);
      observers.push(this);
      if (mode === "dispose") star.dispose();
      native.apply(this, args);
      if (mode === "throw") throw new Error("observe failed");
    });
    try {
      if (mode === "throw") expect(() => ui.enhance(root)).toThrow("observe failed");
      else expect(() => ui.enhance(root)).not.toThrow();
      expect(observers).toHaveLength(1);
      expect(disconnected.mock.contexts).toContain(observers[0]);
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      for (const observer of observed.mock.contexts) {
        if (observer instanceof MutationObserver) observer.disconnect();
      }
    }
  },
);

it.each(["dispose", "unfollow", "replace"] as const)(
  "Message Scroller stops scroll continuation after %s in scrollTo",
  (mode) => {
    const root = fixture("message-scroller");
    ui.enhance(root);
    ui.messageScroller.follow(root, false);
    const view = part(root, "viewport", HTMLElement);
    view.scrollTop = 17;
    view.scrollTo = () => {
      if (mode === "dispose") star.dispose();
      else if (mode === "unfollow") ui.messageScroller.follow(root, false);
      else {
        const replacement = view.cloneNode(true) as HTMLElement;
        view.replaceWith(replacement);
        ui.enhance(root);
      }
    };
    const latest = vi.fn();
    on(root, "latest", latest);
    ui.messageScroller.latest(root);
    expect(view.scrollTop).toBe(17);
    expect(latest).not.toHaveBeenCalled();
  },
);

it("Message Scroller does not focus the viewport after latest notification disposes it", () => {
  const root = fixture("message-scroller");
  ui.enhance(root);
  const view = part(root, "viewport", HTMLElement);
  const focused = vi.spyOn(view, "focus");
  on(root, "latest", () => star.dispose());
  part(root, "latest", HTMLButtonElement).click();
  expect(focused).not.toHaveBeenCalled();
});

it("Message Scroller keeps unread state and known message identity after reacquisition", async () => {
  const root = fixture("message-scroller");
  ui.enhance(root);
  ui.messageScroller.follow(root, false);
  const content = part(root, "content", HTMLElement);
  const message = document.createElement("p");
  message.dataset.jqs = "message";
  content.append(message);
  await star.whenEnhanced();
  expect(ui.messageScroller.unread(root)).toBe(1);
  root.remove();
  await star.whenEnhanced();
  document.body.append(root);
  ui.enhance(root);
  expect(ui.messageScroller.unread(root)).toBe(1);
  expect(ui.messageScroller.isFollowing(root)).toBe(false);
  content.prepend(message);
  await star.whenEnhanced();
  expect(ui.messageScroller.unread(root)).toBe(1);
});

it.each(["carousel", "message-scroller"] as const)(
  "%s preserves both native setup and cleanup failures",
  (kind) => {
    const root = fixture(kind);
    const target = part(root, kind === "carousel" ? "previous" : "viewport", HTMLElement);
    const add = target.addEventListener.bind(target);
    const remove = target.removeEventListener.bind(target);
    const setupError = new Error("native setup failure");
    const cleanupError = new Error("native cleanup failure");
    vi.spyOn(target, "removeEventListener").mockImplementation((...args) => {
      remove(...args);
      throw cleanupError;
    });
    vi.spyOn(target, "addEventListener").mockImplementationOnce((...args) => {
      expect(() => star.dispose()).toThrow();
      add(...args);
      throw setupError;
    });
    failedDisposal = true;
    const causes = (error: unknown): unknown[] =>
      error instanceof AggregateError ? error.errors.flatMap(causes) : [error];
    let failure: unknown;
    try {
      ui.enhance(root);
    } catch (error) {
      failure = error;
    }
    expect(causes(failure)).toContain(setupError);
    expect(causes(failure)).toContain(cleanupError);
    expect(vi.getTimerCount()).toBe(0);
  },
);

it.each(["carousel", "message-scroller"] as const)(
  "%s keeps newer work started during timeout cancellation",
  (kind) => {
    const root = fixture(kind);
    ui.enhance(root);
    const cancel = window.clearTimeout.bind(window);
    vi.spyOn(window, "clearTimeout").mockImplementationOnce((...args) => {
      cancel(...args);
      if (kind === "carousel") ui.carousel.play(root);
      else ui.messageScroller.latest(root);
    });
    pause(root, kind);
    expect(kind === "carousel" ? root.dataset.rotation : root.dataset.state).toBe(
      kind === "carousel" ? "playing" : "following",
    );
    if (kind === "carousel") {
      expect(vi.getTimerCount()).toBe(1);
      vi.advanceTimersByTime(1000);
      expect(ui.carousel.value(root)).toBe("b");
    } else expect(vi.getTimerCount()).toBe(0);
  },
);

it("Carousel keeps its committed selection when before-change starts a newer pause", () => {
  const root = fixture("carousel");
  ui.enhance(root);
  const changed = vi.fn();
  on(root, "change", changed);
  on(root, "before-change", () => ui.carousel.pause(root), true);
  ui.carousel.next(root);
  expect(ui.carousel.value(root)).toBe("a");
  expect(root.dataset.value).toBe("a");
  expect(root.dataset.rotation).toBe("paused");
  expect(changed).not.toHaveBeenCalled();
});

it("Carousel continues an accepted selection through unchanged enhancement", () => {
  const root = fixture("carousel");
  ui.enhance(root);
  const changed = vi.fn();
  on(root, "change", changed);
  on(root, "before-change", () => ui.enhance(root), true);
  ui.carousel.next(root);
  expect(ui.carousel.value(root)).toBe("b");
  expect(changed).toHaveBeenCalledOnce();
});

it("Carousel retains a native swipe through unchanged enhancement", () => {
  const root = fixture("carousel");
  ui.enhance(root);
  const content = part(root, "content", HTMLElement);
  const pointer = (type: string, position: number) => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperties(event, {
      button: { value: 0 },
      pointerId: { value: 3 },
      clientX: { value: position },
    });
    content.dispatchEvent(event);
  };
  pointer("pointerdown", 100);
  ui.enhance(root);
  pointer("pointerup", 50);
  expect(ui.carousel.value(root)).toBe("b");
});

it("Message Scroller retains its observer and queued follow through unchanged enhancement", () => {
  const root = fixture("message-scroller");
  ui.enhance(root);
  const observed = vi.spyOn(MutationObserver.prototype, "observe");
  const scheduled = vi.spyOn(window, "setTimeout");
  const latest = vi.fn();
  on(root, "latest", latest);
  ui.enhance(root);
  ui.enhance(root);
  expect(observed).not.toHaveBeenCalled();
  expect(scheduled).not.toHaveBeenCalled();
  vi.runOnlyPendingTimers();
  expect(latest).toHaveBeenCalledOnce();
});

it("Carousel reports a normal change after restoring focus from its hidden slide", () => {
  const root = fixture("carousel");
  ui.enhance(root);
  root.querySelector<HTMLButtonElement>("article button")?.focus();
  const changed = vi.fn();
  on(root, "change", changed);
  ui.carousel.next(root);
  expect(document.activeElement).toBe(part(root, "content", HTMLElement));
  expect(ui.carousel.value(root)).toBe("b");
  expect(changed).toHaveBeenCalledOnce();
});

it.each(["carousel", "message-scroller"] as const)(
  "%s releases listeners after a scheduler failure and can retry",
  (kind) => {
    const root = fixture(kind);
    const control = part(root, kind === "carousel" ? "next" : "latest", HTMLButtonElement);
    const removed = vi.spyOn(control, "removeEventListener");
    vi.spyOn(window, "setTimeout").mockImplementationOnce(() => {
      throw new Error("timer unavailable");
    });
    expect(() => ui.enhance(root)).toThrow("timer unavailable");
    expect(removed).toHaveBeenCalledWith("click", expect.any(Function));
    expect(vi.getTimerCount()).toBe(0);
    ui.enhance(root);
    const changed = vi.fn();
    on(root, kind === "carousel" ? "change" : "latest", changed);
    control.click();
    expect(changed).toHaveBeenCalledOnce();
  },
);

it.each(["carousel", "message-scroller"] as const)(
  "%s stops binding after native registration replaces its parts",
  (kind) => {
    const root = fixture(kind);
    const first = part(root, kind === "carousel" ? "previous" : "viewport", HTMLElement);
    const later = part(root, kind === "carousel" ? "next" : "latest", HTMLElement);
    const add = first.addEventListener.bind(first);
    const addedLater = vi.spyOn(later, "addEventListener");
    vi.spyOn(first, "addEventListener").mockImplementationOnce((...args) => {
      add(...args);
      first.replaceWith(first.cloneNode(true));
    });
    ui.enhance(root);
    expect(addedLater).not.toHaveBeenCalled();
    expect(vi.getTimerCount()).toBe(0);
  },
);

it("Message Scroller disconnects an observer returned after constructor disposal", () => {
  const root = fixture("message-scroller");
  ui.enhance(fixture("carousel"));
  const NativeObserver = window.MutationObserver;
  const constructed: MutationObserver[] = [];
  const disconnected = vi.spyOn(NativeObserver.prototype, "disconnect");
  window.MutationObserver = class extends NativeObserver {
    constructor(callback: MutationCallback) {
      super(callback);
      constructed.push(this);
      star.dispose();
    }
  };
  try {
    ui.enhance(root);
  } finally {
    window.MutationObserver = NativeObserver;
  }
  expect(constructed).toHaveLength(1);
  expect(disconnected.mock.contexts).toContain(constructed[0]);
  expect(vi.getTimerCount()).toBe(0);
});

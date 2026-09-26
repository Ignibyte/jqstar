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
let expectedDisposalFailure = false;

beforeEach(() => {
  expectedDisposalFailure = false;
  document.body.replaceChildren();
  installed = installStarCore($, { document });
  star = installed.star;
  ui = star.use(uiPlugin);
});
afterEach(() => {
  if (expectedDisposalFailure) expect(() => star.dispose()).toThrow();
  else star.dispose();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function fixture(owner = document, duration = 100) {
  const viewport = owner.createElement("div");
  viewport.dataset.jqs = "toast-viewport";
  const root = owner.createElement("div");
  root.dataset.jqs = "toast";
  root.dataset.duration = String(duration);
  root.innerHTML =
    '<p data-part="description">Saved</p><button data-part="close">Close</button><button data-part="action" data-alt-text="Open history">Undo</button>';
  viewport.append(root);
  owner.body.append(viewport);
  const close = root.querySelector<HTMLButtonElement>('[data-part="close"]');
  const action = root.querySelector<HTMLButtonElement>('[data-part="action"]');
  if (!close || !action) throw new Error("Missing toast controls");
  return { viewport, root, close, action };
}
function observe(root: HTMLElement, name: string, listener: EventListener, once = false) {
  root.addEventListener(`jquery-star:toast:${name}`, listener, { once });
}
function pointer(root: HTMLElement, type: string, x = 0, id = 17) {
  const event = new Event(type);
  Object.defineProperties(event, {
    button: { value: 0 },
    pointerId: { value: id },
    clientX: { value: x },
  });
  root.dispatchEvent(event);
}

it.each(["render", "native", "dispose", "preserve"] as const)(
  "Toast owns captured listeners, timers and announcements across %s",
  async (mode) => {
    vi.useFakeTimers();
    const { root, viewport, close, action } = fixture();
    ui.enhance(root);
    await star.whenEnhanced();
    const removedRoot = vi.spyOn(root, "removeEventListener");
    const removedClose = vi.spyOn(close, "removeEventListener");
    const removedAction = vi.spyOn(action, "removeEventListener");
    const clear = vi.spyOn(window, "clearTimeout");
    const announcer = viewport.querySelector('[data-part="announcer"]');
    expect(announcer).not.toBeNull();
    const dismissed = vi.fn();
    observe(root, "dismiss", dismissed);
    let operation: ReturnType<ReturnType<typeof createRenderAdapter>["begin"]> | undefined;
    if (mode === "dispose") star.dispose();
    else if (mode === "native") {
      root.remove();
      await star.whenEnhanced();
    } else {
      operation = createRenderAdapter(installed).begin(
        document.body,
        mode === "preserve" ? { preserveRoots: [root] } : {},
      );
      operation.beforeRemove(root);
      ui.enhance(document);
    }
    if (mode === "preserve") {
      expect(announcer?.isConnected).toBe(true);
      await operation?.commit();
      operation = undefined;
      vi.advanceTimersByTime(100);
      expect(dismissed).toHaveBeenCalledOnce();
      expect(announcer?.isConnected).toBe(true);
    } else {
      expect(clear).toHaveBeenCalledTimes(2);
      expect(announcer?.isConnected).toBe(false);
      expect(removedRoot).toHaveBeenCalledWith("pointerenter", expect.any(Function));
      expect(removedClose).toHaveBeenCalledWith("click", expect.any(Function));
      expect(removedAction).toHaveBeenCalledWith("click", expect.any(Function));
      const before = root.outerHTML;
      close.click();
      action.click();
      root.dispatchEvent(new Event("pointerenter"));
      root.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      vi.advanceTimersByTime(10_000);
      expect(dismissed).not.toHaveBeenCalled();
      expect(root.outerHTML).toBe(before);
    }
    if (mode === "render") root.remove();
    await operation?.commit();
  },
);

it("Toast preserves timer, pause and announcement across unchanged enhancement", () => {
  vi.useFakeTimers();
  const { root, viewport } = fixture();
  ui.enhance(root);
  const announcer = viewport.querySelector('[data-part="announcer"]');
  const removed = vi.spyOn(root, "removeEventListener");
  vi.advanceTimersByTime(60);
  root.dispatchEvent(new Event("pointerenter"));
  ui.enhance(root);
  ui.enhance(root);
  vi.advanceTimersByTime(500);
  expect(root.isConnected).toBe(true);
  expect(viewport.querySelector('[data-part="announcer"]')).toBe(announcer);
  expect(removed).not.toHaveBeenCalled();
  root.dispatchEvent(new Event("pointerleave"));
  vi.advanceTimersByTime(39);
  expect(root.isConnected).toBe(true);
  vi.advanceTimersByTime(1);
  expect(root.isConnected).toBe(false);
});

it("Toast resumes its remaining display budget after scope reacquisition", async () => {
  vi.useFakeTimers();
  const { root, viewport } = fixture();
  ui.enhance(root);
  vi.advanceTimersByTime(60);
  root.remove();
  await star.whenEnhanced();
  vi.advanceTimersByTime(500);
  viewport.append(root);
  ui.enhance(root);
  ui.enhance(root);
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  vi.advanceTimersByTime(39);
  expect(root.isConnected).toBe(true);
  vi.advanceTimersByTime(1);
  expect(root.isConnected).toBe(false);
  expect(dismissed).toHaveBeenCalledOnce();
});

it("Toast rebinds replaced close/action controls without restarting its timer", () => {
  vi.useFakeTimers();
  const { root, close, action } = fixture();
  ui.enhance(root);
  vi.advanceTimersByTime(60);
  const nextClose = close.cloneNode(true) as HTMLButtonElement;
  const nextAction = action.cloneNode(true) as HTMLButtonElement;
  close.replaceWith(nextClose);
  action.replaceWith(nextAction);
  ui.enhance(root);
  ui.enhance(root);
  close.click();
  action.click();
  expect(root.isConnected).toBe(true);
  vi.advanceTimersByTime(39);
  expect(root.isConnected).toBe(true);
  vi.advanceTimersByTime(1);
  expect(root.isConnected).toBe(false);
});

it.each([false, true])(
  "Toast stops dismissal after before-dismiss disposal, canceled %s",
  (cancel) => {
    const { root } = fixture(document, 0);
    ui.enhance(root);
    const dismissed = vi.fn();
    observe(root, "dismiss", dismissed);
    observe(
      root,
      "before-dismiss",
      (event) => {
        if (cancel) event.preventDefault();
        star.dispose();
        root.dataset.state = "retired";
      },
      true,
    );
    ui.toast.dismiss(root);
    expect(root.isConnected).toBe(true);
    expect(root.dataset.state).toBe("retired");
    expect(dismissed).not.toHaveBeenCalled();
  },
);

it.each([false, true])("Toast keeps the newer nested dismissal, canceled outer %s", (cancel) => {
  const { root } = fixture(document, 0);
  ui.enhance(root);
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  observe(
    root,
    "before-dismiss",
    (event) => {
      if (cancel) event.preventDefault();
      ui.toast.dismiss(root);
    },
    true,
  );
  ui.toast.dismiss(root);
  expect(root.isConnected).toBe(false);
  expect(dismissed).toHaveBeenCalledOnce();
});

it("Toast stops an old dismissal after replacement enhancement", () => {
  const { root, close } = fixture(document, 0);
  ui.enhance(root);
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  observe(
    root,
    "before-dismiss",
    () => {
      close.replaceWith(close.cloneNode(true));
      ui.enhance(root);
    },
    true,
  );
  ui.toast.dismiss(root);
  expect(root.isConnected).toBe(true);
  expect(dismissed).not.toHaveBeenCalled();
});

it("Toast keeps its ordinary dismissal announcement until expiry and releases it on viewport removal", async () => {
  vi.useFakeTimers();
  const { root, viewport } = fixture(document, 0);
  ui.enhance(root);
  const announcer = viewport.querySelector('[data-part="announcer"]');
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  ui.toast.dismiss(root);
  expect(dismissed).toHaveBeenCalledOnce();
  expect(announcer?.isConnected).toBe(true);
  viewport.remove();
  await star.whenEnhanced();
  expect(announcer?.parentNode).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it("Toast clears announcements after connected kernel disposal following dismissal", () => {
  vi.useFakeTimers();
  const { root, viewport } = fixture(document, 0);
  ui.enhance(root);
  ui.toast.dismiss(root);
  expect(viewport.querySelector('[data-part="announcer"]')).not.toBeNull();
  star.dispose();
  expect(viewport.querySelector('[data-part="announcer"]')).toBeNull();
  expect(vi.getTimerCount()).toBe(0);
});

it("Toast leaves intentionally dismissed nodes closed after re-enhancement", () => {
  vi.useFakeTimers();
  const { root, viewport, close } = fixture();
  ui.enhance(root);
  ui.toast.dismiss(root);
  viewport.append(root);
  ui.enhance(root);
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  close.click();
  vi.advanceTimersByTime(100);
  expect(root.dataset.state).toBe("closed");
  expect(root.isConnected).toBe(true);
  expect(dismissed).not.toHaveBeenCalled();
});

it("Toast stops dismissal notification after focus recovery disposes the installation", () => {
  const { root, viewport, close } = fixture(document, 0);
  ui.enhance(root);
  close.focus();
  viewport.addEventListener("focus", () => star.dispose(), { once: true });
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  ui.toast.dismiss(root);
  expect(root.isConnected).toBe(false);
  expect(dismissed).not.toHaveBeenCalled();
});

it("Toast clear stops after a dismissal callback disposes the installation", () => {
  const first = fixture(document, 0);
  const second = fixture(document, 0);
  ui.enhance(document);
  observe(first.root, "dismiss", () => star.dispose(), true);
  const secondBefore = vi.fn();
  observe(second.root, "before-dismiss", secondBefore);
  ui.toast.clear();
  expect(first.root.isConnected).toBe(false);
  expect(second.root.isConnected).toBe(true);
  expect(secondBefore).not.toHaveBeenCalled();
});

it("Toast refuses an outgoing explicit viewport and F8 skips it", async () => {
  const { viewport, root } = fixture(document, 0);
  const live = fixture(document, 0);
  ui.enhance(document);
  const operation = createRenderAdapter(installed).begin(document.body);
  operation.beforeRemove(viewport);
  const before = viewport.outerHTML;
  expect(() => ui.toast.show({ description: "late", viewport })).toThrow(/unavailable/);
  expect(viewport.outerHTML).toBe(before);
  document.dispatchEvent(new KeyboardEvent("keydown", { key: "F8", bubbles: true }));
  expect(document.activeElement).toBe(live.viewport);
  expect(root.dataset.state).toBe("open");
  viewport.remove();
  await operation.commit();
});

it("Toast rejects a foreign viewport without moving or altering it", () => {
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const owner = iframe.contentDocument;
  if (!owner) throw new Error("Missing foreign document");
  const { viewport } = fixture(owner, 0);
  const before = viewport.outerHTML;
  expect(() => ui.toast.show({ description: "foreign", viewport })).toThrow();
  expect(viewport.ownerDocument).toBe(owner);
  expect(viewport.outerHTML).toBe(before);
});

it.each(["throw", "dispose"] as const)(
  "Toast releases provisional native registration after %s",
  (mode) => {
    const { root, close, viewport } = fixture();
    const add = close.addEventListener.bind(close);
    vi.spyOn(close, "addEventListener").mockImplementationOnce((...args) => {
      if (mode === "throw") throw new Error("registration failed");
      star.dispose();
      add(...args);
    });
    const removed = vi.spyOn(root, "removeEventListener");
    if (mode === "throw") expect(() => ui.enhance(root)).toThrow("registration failed");
    else ui.enhance(root);
    const before = root.outerHTML;
    close.click();
    expect(root.outerHTML).toBe(before);
    expect(root.isConnected).toBe(true);
    expect(removed).toHaveBeenCalledWith("pointerenter", expect.any(Function));
    expect(viewport.querySelector('[data-part="announcer"]')).toBeNull();
  },
);

it("Toast releases pointer capture during scoped removal", async () => {
  const { root } = fixture(document, 0);
  const release = vi.fn();
  root.setPointerCapture = vi.fn();
  root.releasePointerCapture = release;
  ui.enhance(root);
  pointer(root, "pointerdown");
  pointer(root, "pointermove", 20);
  const operation = createRenderAdapter(installed).begin(document.body);
  operation.beforeRemove(root);
  expect(release).toHaveBeenCalledWith(17);
  expect(root.style.getPropertyValue("--jqs-toast-swipe-x")).toBe("");
  const before = root.outerHTML;
  pointer(root, "pointerup", 80);
  expect(root.outerHTML).toBe(before);
  root.remove();
  await operation.commit();
});

it("Toast isolates timers and recovery focus by owning document", async () => {
  vi.useFakeTimers();
  const local = fixture(document, 0);
  ui.enhance(local.root);
  const localFocus = vi.spyOn(local.close, "focus");
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const realm = iframe.contentWindow as (Window & typeof globalThis) | null;
  if (!realm) throw new Error("Missing foreign window");
  await withStarDOMRealm({ window: realm }, async () => {
    const other = installStarCore(jQueryFactory(realm), { document: realm.document });
    const otherStar = other.star;
    try {
      const otherUI = otherStar.use(uiPlugin);
      const otherFixture = fixture(realm.document);
      const scheduling = vi.spyOn(realm, "setTimeout");
      const clearing = vi.spyOn(realm, "clearTimeout");
      otherUI.enhance(otherFixture.root);
      expect(scheduling).toHaveBeenCalledWith(expect.any(Function), 100);
      expect(scheduling).toHaveBeenCalledWith(expect.any(Function), 10_000);
      otherFixture.close.focus();
      otherUI.toast.dismiss(otherFixture.root);
      expect(realm.document.activeElement).toBe(otherFixture.viewport);
      expect(localFocus).not.toHaveBeenCalled();
      otherStar.dispose();
      expect(clearing).toHaveBeenCalledTimes(2);
    } finally {
      otherStar.dispose();
    }
  });
  expect(local.root.isConnected).toBe(true);
  local.close.click();
  expect(local.root.isConnected).toBe(false);
});

it("Toast releases setup resources after its open callback disposes the installation", () => {
  vi.useFakeTimers();
  const { root, viewport } = fixture();
  observe(root, "open", () => star.dispose(), true);
  ui.enhance(root);
  expect(vi.getTimerCount()).toBe(0);
  expect(viewport.querySelector('[data-part="announcer"]')).toBeNull();
  const before = root.outerHTML;
  root.dispatchEvent(new Event("pointerenter"));
  expect(root.outerHTML).toBe(before);
});

it.each([100, 10_000])("Toast cancels a %s ms timer acquired during disposal", (delay) => {
  vi.useFakeTimers();
  const { root, viewport } = fixture();
  const owner: Window = window;
  const schedule = owner.setTimeout.bind(owner);
  vi.spyOn(owner, "setTimeout").mockImplementation((callback, timeout, ...args) => {
    if (timeout === delay) star.dispose();
    return schedule(callback, timeout, ...args);
  });
  ui.enhance(root);
  expect(vi.getTimerCount()).toBe(0);
  expect(viewport.querySelector('[data-part="announcer"]')).toBeNull();
});

it("Toast ignores a queued timeout after pause or scope disposal", () => {
  vi.useFakeTimers();
  const { root, close } = fixture();
  const schedule = vi.spyOn(window, "setTimeout");
  ui.enhance(root);
  const call = schedule.mock.calls.find(([, delay]) => delay === 100);
  const callback = call?.[0];
  if (typeof callback !== "function") throw new Error("Missing timer callback");
  root.dispatchEvent(new Event("pointerenter"));
  callback();
  expect(root.isConnected).toBe(true);
  star.dispose();
  callback();
  close.click();
  expect(root.isConnected).toBe(true);
});

it("Toast removes an announcement appended during disposal", () => {
  const { root, viewport } = fixture();
  const append = viewport.append.bind(viewport);
  vi.spyOn(viewport, "append").mockImplementationOnce((...nodes) => {
    star.dispose();
    append(...nodes);
  });
  ui.enhance(root);
  expect(viewport.querySelector('[data-part="announcer"]')).toBeNull();
});

it("Toast keeps one set of replacement bindings when listener removal reenters enhancement", () => {
  const { root, close } = fixture(document, 0);
  ui.enhance(root);
  const replacement = close.cloneNode(true) as HTMLButtonElement;
  close.replaceWith(replacement);
  const remove = root.removeEventListener.bind(root);
  vi.spyOn(root, "removeEventListener").mockImplementationOnce((...args) => {
    ui.enhance(root);
    remove(...args);
  });
  ui.enhance(root);
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  const removed = vi.spyOn(replacement, "removeEventListener");
  replacement.click();
  expect(dismissed).toHaveBeenCalledOnce();
  expect(removed.mock.calls.filter(([name]) => name === "click")).toHaveLength(1);
});

it("Toast sweeps all removals after a listener cleanup fails", () => {
  const { root, close, action } = fixture();
  ui.enhance(root);
  const failure = new Error("removal failed");
  vi.spyOn(root, "removeEventListener").mockImplementationOnce(() => {
    throw failure;
  });
  const removedClose = vi.spyOn(close, "removeEventListener");
  const removedAction = vi.spyOn(action, "removeEventListener");
  expect(() => star.dispose()).toThrow();
  expectedDisposalFailure = true;
  expect(removedClose).toHaveBeenCalledWith("click", expect.any(Function));
  expect(removedAction).toHaveBeenCalledWith("click", expect.any(Function));
  const before = root.outerHTML;
  close.click();
  action.click();
  expect(root.outerHTML).toBe(before);
});

it("Toast releases capture acquired after disposal and cancels a native swipe", () => {
  const { root } = fixture(document, 0);
  let captured = false;
  root.setPointerCapture = () => {
    star.dispose();
    captured = true;
  };
  root.releasePointerCapture = () => {
    captured = false;
  };
  ui.enhance(root);
  pointer(root, "pointerdown");
  expect(captured).toBe(false);
  expect(root.dataset.swipe).toBeUndefined();
});

it("Toast resumes a paused deadline after pointer cancellation", () => {
  vi.useFakeTimers();
  const { root } = fixture();
  root.setPointerCapture = vi.fn();
  root.releasePointerCapture = vi.fn();
  ui.enhance(root);
  vi.advanceTimersByTime(60);
  pointer(root, "pointerdown");
  vi.advanceTimersByTime(200);
  pointer(root, "pointercancel");
  vi.advanceTimersByTime(39);
  expect(root.isConnected).toBe(true);
  vi.advanceTimersByTime(1);
  expect(root.isConnected).toBe(false);
});

it("Toast stops removal continuation after native removal disposes the installation", () => {
  const { root, viewport, close } = fixture(document, 0);
  ui.enhance(root);
  close.focus();
  const remove = root.remove.bind(root);
  vi.spyOn(root, "remove").mockImplementationOnce(() => {
    remove();
    star.dispose();
  });
  const focus = vi.spyOn(viewport, "focus");
  const dismissed = vi.fn();
  observe(root, "dismiss", dismissed);
  ui.toast.dismiss(root);
  expect(focus).not.toHaveBeenCalled();
  expect(dismissed).not.toHaveBeenCalled();
});

it("Toast uses its installation document after the ambient realm lease ends", async () => {
  const local = fixture(document, 0);
  ui.enhance(local.root);
  const iframe = document.createElement("iframe");
  document.body.append(iframe);
  const realm = iframe.contentWindow as (Window & typeof globalThis) | null;
  if (!realm) throw new Error("Missing foreign window");
  const other = await withStarDOMRealm({ window: realm }, async () => {
    const otherStar = installStarCore(jQueryFactory(realm), { document: realm.document }).star;
    return { star: otherStar, ui: otherStar.use(uiPlugin) };
  });
  try {
    const root = other.ui.toast.show({ description: "Foreign", duration: false });
    expect(root.ownerDocument).toBe(realm.document);
    expect(realm.document.body.contains(root)).toBe(true);
    expect(local.viewport.querySelectorAll('[data-jqs="toast"]')).toHaveLength(1);
  } finally {
    other.star.dispose();
  }
});

it.each(["throw", "dispose"] as const)(
  "Toast rolls back generated markup when append encounters %s",
  (mode) => {
    const { viewport } = fixture(document, 0);
    ui.enhance(viewport);
    const before = [...viewport.children];
    const append = viewport.append.bind(viewport);
    vi.spyOn(viewport, "append").mockImplementationOnce((...nodes) => {
      if (mode === "dispose") star.dispose();
      append(...nodes);
      if (mode === "throw") throw new Error("append failed");
    });
    if (mode === "throw")
      expect(() => ui.toast.show({ description: "Generated", viewport })).toThrow("append failed");
    else expect(ui.toast.show({ description: "Generated", viewport }).isConnected).toBe(false);
    expect(
      [...viewport.children].filter((node) => node.getAttribute("data-part") !== "announcer"),
    ).toEqual(before.filter((node) => node.getAttribute("data-part") !== "announcer"));
  },
);

it("Toast resumes the remaining deadline after a canceled swipe dismissal", () => {
  vi.useFakeTimers();
  const { root } = fixture();
  root.setPointerCapture = vi.fn();
  root.releasePointerCapture = vi.fn();
  ui.enhance(root);
  vi.advanceTimersByTime(60);
  pointer(root, "pointerdown");
  observe(root, "before-dismiss", (event) => event.preventDefault(), true);
  pointer(root, "pointerup", 80);
  vi.advanceTimersByTime(39);
  expect(root.isConnected).toBe(true);
  vi.advanceTimersByTime(1);
  expect(root.isConnected).toBe(false);
});

it("Toast ignores cancellation for a different pointer", () => {
  const { root } = fixture(document, 0);
  root.setPointerCapture = vi.fn();
  root.releasePointerCapture = vi.fn();
  ui.enhance(root);
  pointer(root, "pointerdown");
  pointer(root, "pointercancel", 0, 18);
  pointer(root, "pointermove", 20);
  expect(root.style.getPropertyValue("--jqs-toast-swipe-x")).toBe("20px");
  pointer(root, "pointercancel");
  expect(root.style.getPropertyValue("--jqs-toast-swipe-x")).toBe("");
});

it("Toast refuses default creation inside an outgoing body", async () => {
  const operation = createRenderAdapter(installed).begin(document.documentElement);
  operation.beforeRemove(document.body);
  const before = document.body.outerHTML;
  expect(() => ui.toast.show("late")).toThrow(/unavailable/);
  expect(document.body.outerHTML).toBe(before);
  await operation.commit();
});

it.each(["blur", "hidden"] as const)(
  "Toast keeps %s pause across pointer leave and new toast creation",
  (mode) => {
    vi.useFakeTimers();
    const { root } = fixture();
    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(false);
    ui.enhance(root);
    vi.advanceTimersByTime(60);
    if (mode === "blur") window.dispatchEvent(new Event("blur"));
    else {
      hidden.mockReturnValue(true);
      document.dispatchEvent(new Event("visibilitychange"));
    }
    root.dispatchEvent(new Event("pointerenter"));
    root.dispatchEvent(new Event("pointerleave"));
    const next = ui.toast.show({ description: "New", duration: 100 });
    vi.advanceTimersByTime(200);
    expect(root.isConnected).toBe(true);
    expect(next.isConnected).toBe(true);
    if (mode === "blur") window.dispatchEvent(new Event("focus"));
    else {
      hidden.mockReturnValue(false);
      document.dispatchEvent(new Event("visibilitychange"));
    }
    vi.advanceTimersByTime(40);
    expect(root.isConnected).toBe(false);
    expect(next.isConnected).toBe(true);
    vi.advanceTimersByTime(60);
    expect(next.isConnected).toBe(false);
  },
);

it("Toast cancels a provisional timer when pointer entry pauses setup", () => {
  vi.useFakeTimers();
  const { root } = fixture();
  const owner: Window = window;
  const schedule = owner.setTimeout.bind(owner);
  const spy = vi.spyOn(owner, "setTimeout").mockImplementation((callback, delay, ...args) => {
    if (delay === 100) root.dispatchEvent(new Event("pointerenter"));
    return schedule(callback, delay, ...args);
  });
  ui.enhance(root);
  spy.mockRestore();
  vi.advanceTimersByTime(100);
  expect(root.isConnected).toBe(true);
  expect(root.dataset.paused).toBe("true");
  root.dispatchEvent(new Event("pointerleave"));
  vi.advanceTimersByTime(100);
  expect(root.isConnected).toBe(false);
});

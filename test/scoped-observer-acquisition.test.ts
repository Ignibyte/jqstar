import { createRequire } from "node:module";
import { installStarCore } from "../src/core";
import { uiPlugin } from "../src/ui";
import { afterEach, expect, it, vi } from "vitest";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";
import {
  createUILifecycle,
  listenUIReset,
  ownUI,
  ownUIRecord,
  releaseUIResources,
  uiCurrent,
  uiResources,
  uiWindow,
} from "../src/ui/lifecycle";

const kernels: Kernel[] = [];
function uiRecord(name: string) {
  return { name, cleanup: () => undefined };
}
function setup() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as (Window & typeof globalThis) | null;
  if (!owner) throw new Error("Missing native window.");
  const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, owner.document);
  kernels.push(kernel);
  const root = owner.document.createElement("section");
  root.dataset.jqs = "probe";
  owner.document.body.append(root);
  return { owner, kernel, host: kernel.documentHost, root };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const kernel of kernels.splice(0)) if (!kernel.disposed) kernel.dispose();
  document.body.replaceChildren();
});

it("normal scoped acquisition uses one observer and native removal releases each owner once", async () => {
  const { owner, host, root, kernel } = setup();
  const first = vi.fn(),
    second = vi.fn();
  host.own("task", "first", first, root);
  host.own("task", "second", second, root);
  expect(
    kernel.resourceSummary().filter((r) => r.owner === "document:resource-removal"),
  ).toHaveLength(1);
  root.remove();
  await kernel.whenEnhanced();
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
  owner.document.body.append(root);
  await kernel.whenEnhanced();
  expect(first).toHaveBeenCalledOnce();
  expect(second).toHaveBeenCalledOnce();
});
it("native observer delivery stops after ordinary disposal", async () => {
  const { owner, host, root, kernel } = setup();
  const callback = vi.fn();
  const observer = host.observe(root, callback, { childList: true });
  root.append(owner.document.createElement("i"));
  await new Promise((resolve) => owner.setTimeout(resolve, 0));
  expect(callback).toHaveBeenCalledOnce();
  expect(callback.mock.contexts[0]).toBe(observer);
  expect(callback.mock.calls[0]?.[1]).toBe(observer);
  expect(callback.mock.calls[0]?.[0][0].target).toBe(root);
  kernel.dispose();
  root.append(owner.document.createElement("b"));
  await new Promise((resolve) => owner.setTimeout(resolve, 0));
  expect(callback).toHaveBeenCalledOnce();
});
it("does not deliver observation installed after observe disposes its owner", async () => {
  const { owner, host, root, kernel } = setup();
  const native = owner.MutationObserver.prototype.observe,
    callback = vi.fn();
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    kernel.dispose();
    native.apply(this, args);
  });
  try {
    host.observe(root, callback, { childList: true });
  } catch {
    /* Retired acquisition may reject. */
  }
  root.append(owner.document.createElement("i"));
  await new Promise((resolve) => owner.setTimeout(resolve, 0));
  expect(callback).not.toHaveBeenCalled();
});
it("retires late native observation when setup also throws", async () => {
  const { owner, host, root, kernel } = setup();
  const native = owner.MutationObserver.prototype.observe,
    callback = vi.fn();
  const failure = new Error("late native observe failure");
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    kernel.dispose();
    native.apply(this, args);
    throw failure;
  });
  expect(() => host.observe(root, callback, { childList: true })).toThrow(failure);
  root.append(owner.document.createElement("i"));
  await new Promise((resolve) => owner.setTimeout(resolve, 0));
  expect(callback).not.toHaveBeenCalled();
});
it("releases native observation when ordinary setup throws", async () => {
  const { owner, host, root, kernel } = setup();
  const native = owner.MutationObserver.prototype.observe,
    callback = vi.fn();
  const failure = new Error("native observe failure");
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    native.apply(this, args);
    throw failure;
  });
  expect(() => host.observe(root, callback, { childList: true })).toThrow(failure);
  root.append(owner.document.createElement("i"));
  await new Promise((resolve) => owner.setTimeout(resolve, 0));
  expect(callback).not.toHaveBeenCalled();
  expect(kernel.resourceSummary().filter((r) => r.kind === "observer")).toHaveLength(0);
});
it("preserves setup and cleanup errors when both native calls throw", () => {
  const { owner, host, root, kernel } = setup();
  const observe = owner.MutationObserver.prototype.observe;
  const disconnect = owner.MutationObserver.prototype.disconnect;
  const setupError = new Error("observe failed"),
    cleanupError = new Error("disconnect failed");
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    observe.apply(this, args);
    throw setupError;
  });
  vi.spyOn(owner.MutationObserver.prototype, "disconnect").mockImplementationOnce(function (
    this: MutationObserver,
  ) {
    disconnect.call(this);
    throw cleanupError;
  });
  let caught: unknown;
  try {
    host.observe(root, () => undefined, { childList: true });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  expect((caught as AggregateError).errors).toEqual([setupError, cleanupError]);
  expect(kernel.resourceSummary().filter((r) => r.kind === "observer")).toHaveLength(0);
});
it("does not retain an observer record when the native constructor throws", () => {
  const { owner, host, root, kernel } = setup();
  const error = new Error("constructor failed");
  vi.spyOn(owner, "MutationObserver").mockImplementationOnce(function () {
    throw error;
  });
  expect(() => host.observe(root, () => undefined, { childList: true })).toThrow(error);
  expect(kernel.resourceSummary().filter((r) => r.kind === "observer")).toHaveLength(0);
});
it("native removal after reentry releases both owners with one retained observer", async () => {
  const { owner, host, root, kernel } = setup();
  const native = owner.MutationObserver.prototype.observe,
    oldCleanup = vi.fn(),
    newCleanup = vi.fn();
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    host.own("task", "newer", newCleanup, root);
    native.apply(this, args);
  });
  host.own("task", "older", oldCleanup, root);
  root.remove();
  await kernel.whenEnhanced();
  expect(oldCleanup).toHaveBeenCalledOnce();
  expect(newCleanup).toHaveBeenCalledOnce();
  expect(
    kernel.resourceSummary().filter((r) => r.owner === "document:resource-removal"),
  ).toHaveLength(1);
});
it("releases the superseded UI record without retiring its replacement", () => {
  const { owner, host, root } = setup();
  createUILifecycle(host);
  const records = new WeakMap<Element, ReturnType<typeof uiRecord>>();
  const old = uiRecord("old"),
    replacement = uiRecord("replacement");
  const oldCleanup = vi.fn(),
    newCleanup = vi.fn();
  const native = owner.MutationObserver.prototype.observe;
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    ownUIRecord(records, root, replacement, newCleanup);
    native.apply(this, args);
  });
  const release = ownUIRecord(records, root, old, oldCleanup);
  expect(oldCleanup).toHaveBeenCalledOnce();
  expect(newCleanup).not.toHaveBeenCalled();
  release();
  expect(records.get(root)).toBe(replacement);
  expect(newCleanup).not.toHaveBeenCalled();
});
it("preserves a newer UI record when the older acquisition throws", () => {
  const { owner, host, root } = setup();
  createUILifecycle(host);
  const records = new WeakMap<Element, ReturnType<typeof uiRecord>>();
  const old = uiRecord("old"),
    replacement = uiRecord("replacement");
  const oldCleanup = vi.fn(),
    newCleanup = vi.fn(),
    failure = new Error("older setup failed");
  const native = owner.MutationObserver.prototype.observe;
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    ownUIRecord(records, root, replacement, newCleanup);
    native.apply(this, args);
    throw failure;
  });
  expect(() => ownUIRecord(records, root, old, oldCleanup)).toThrow(failure);
  expect(oldCleanup).toHaveBeenCalledOnce();
  expect(newCleanup).not.toHaveBeenCalled();
  expect(records.get(root)).toBe(replacement);
});
it("rejects a detached Document as a UI Window without acquiring resources", () => {
  const detached = document.implementation.createHTMLDocument("detached");
  const root = detached.createElement("div");
  expect(detached.defaultView).toBeNull();
  expect(() => uiWindow(root)).toThrow("UI requires a Document attached to a Window.");
});
it("preserves acquisition and cleanup failures when a UI scope has been retired", () => {
  const { kernel, root, host } = setup();
  createUILifecycle(host);
  kernel.dispose();
  const cleanupError = new Error("cleanup failed");
  const cleanup = vi.fn(() => {
    throw cleanupError;
  });
  let caught: unknown;
  try {
    ownUI(root, cleanup);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  expect((caught as AggregateError).errors).toEqual([
    expect.objectContaining({ message: "This UI root cannot acquire resources." }),
    cleanupError,
  ]);
  expect((caught as AggregateError).cause).toBe(cleanupError);
  expect(cleanup).toHaveBeenCalledOnce();
});
it("does not schedule a second reset after cancellation retires its UI owner", async () => {
  const { owner, host, root } = setup();
  createUILifecycle(host);
  const form = owner.document.createElement("form");
  root.replaceWith(form);
  form.append(root);
  const record = uiResources(root);
  const callback = vi.fn();
  listenUIReset(record, () => uiCurrent(record), form, callback);
  const clear = owner.clearTimeout.bind(owner);
  let retired = false;
  vi.spyOn(owner, "clearTimeout").mockImplementation((handle) => {
    clear(handle);
    if (retired) return;
    retired = true;
    releaseUIResources(record);
  });
  const reset = (): void => {
    form.dispatchEvent(new owner.Event("reset", { bubbles: true, cancelable: true }));
  };
  reset();
  reset();
  await new Promise((resolve) => owner.setTimeout(resolve, 0));
  expect(retired).toBe(true);
  expect(record.active).toBe(false);
  expect(callback).not.toHaveBeenCalled();
});
it("ignores an injected queued callback after observer retirement", () => {
  const { owner, host, root, kernel } = setup();
  const Native = owner.MutationObserver,
    callback = vi.fn();
  let queued: MutationCallback | undefined, observer: MutationObserver | undefined;
  vi.spyOn(owner, "MutationObserver").mockImplementationOnce(function (next) {
    queued = next;
    observer = new Native(next);
    return observer;
  });
  host.observe(root, callback, { childList: true });
  kernel.dispose();
  expect(queued).toBeTypeOf("function");
  if (!queued || !observer) throw new Error("Missing captured observer.");
  queued([], observer);
  expect(callback).not.toHaveBeenCalled();
});

it("keeps a public Resizable request started by first-scope native acquisition", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as (Window & typeof globalThis) | null;
  if (!owner) throw new Error("Missing native owner.");
  const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
    jQueryFactory(owner: Window): JQueryStatic;
  };
  const $ = installStarCore(jQueryFactory(owner), { document: owner.document });
  const ui = $.star.use(uiPlugin);
  try {
    const root = owner.document.createElement("section");
    root.dataset.jqs = "resizable";
    root.dataset.value = "[50,50]";
    root.innerHTML =
      '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
    owner.document.body.append(root);
    const handle = root.querySelector<HTMLElement>('[data-part="handle"]');
    if (!handle) throw new Error("Missing native handle.");
    const add = vi.spyOn(handle, "addEventListener");
    const native = owner.MutationObserver.prototype.observe;
    let reentered = false;
    vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
      this: MutationObserver,
      ...args
    ) {
      reentered = true;
      ui.resizable.set(root, [70, 30]);
      native.apply(this, args);
    });
    ui.enhance(root);
    expect(reentered).toBe(true);
    expect(ui.resizable.value(root)).toEqual([70, 30]);
    expect(add.mock.calls.filter(([type]) => type === "keydown")).toHaveLength(1);
    handle.dispatchEvent(
      new owner.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    expect(ui.resizable.value(root)).toEqual([75, 25]);
  } finally {
    $.star.dispose();
    frame.remove();
  }
});

it("reacquires replaced Resizable parts during first-scope native acquisition", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as (Window & typeof globalThis) | null;
  if (!owner) throw new Error("Missing native owner.");
  const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
    jQueryFactory(owner: Window): JQueryStatic;
  };
  const $ = installStarCore(jQueryFactory(owner), { document: owner.document });
  const ui = $.star.use(uiPlugin);
  try {
    const root = owner.document.createElement("section");
    root.dataset.jqs = "resizable";
    root.dataset.value = "[50,50]";
    root.innerHTML =
      '<div data-part="panel"></div><div data-part="handle"></div><div data-part="panel"></div>';
    owner.document.body.append(root);
    const previous = root.querySelector<HTMLElement>('[data-part="handle"]');
    if (!previous) throw new Error("Missing native handle.");
    const oldBinding = vi.spyOn(previous, "addEventListener");
    const observe = owner.MutationObserver.prototype.observe;
    let entered = false;
    vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
      this: MutationObserver,
      ...args
    ) {
      entered = true;
      root.replaceChildren(...Array.from(root.children, (part) => part.cloneNode(true)));
      ui.resizable.set(root, [70, 30]);
      expect(ui.resizable.value(root)).toEqual([70, 30]);
      observe.apply(this, args);
    });
    ui.enhance(root);
    expect(entered).toBe(true);
    expect(ui.resizable.value(root)).toEqual([70, 30]);
    expect(oldBinding).not.toHaveBeenCalled();
    const handle = root.querySelector<HTMLElement>('[data-part="handle"]');
    if (!handle) throw new Error("Missing replacement handle.");
    handle.dispatchEvent(
      new owner.KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true, cancelable: true }),
    );
    expect(ui.resizable.value(root)).toEqual([75, 25]);
  } finally {
    $.star.dispose();
    frame.remove();
  }
});

it("preserves the newer removal observer after constructor reentry", async () => {
  const { owner, host, root, kernel } = setup();
  const Native = owner.MutationObserver,
    older = vi.fn(),
    newer = vi.fn();
  let entered = false;
  vi.spyOn(owner, "MutationObserver").mockImplementation(function (callback) {
    if (!entered) {
      entered = true;
      host.own("task", "nested-constructor", newer, root);
    }
    return new Native(callback);
  });
  host.own("task", "outer-constructor", older, root);
  root.remove();
  await kernel.whenEnhanced();
  expect(older).toHaveBeenCalledOnce();
  expect(newer).toHaveBeenCalledOnce();
  expect(
    kernel.resourceSummary().filter((r) => r.owner === "document:resource-removal"),
  ).toHaveLength(1);
});
it("preserves the newer observer when outer native setup fails after reentry", async () => {
  const { owner, host, root, kernel } = setup();
  const native = owner.MutationObserver.prototype.observe,
    newer = vi.fn(),
    older = vi.fn();
  const failure = new Error("outer setup failed");
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    host.own("task", "nested-survivor", newer, root);
    native.apply(this, args);
    throw failure;
  });
  expect(() => host.own("task", "outer-failure", older, root)).toThrow(failure);
  expect(
    kernel.resourceSummary().filter((r) => r.owner === "document:resource-removal"),
  ).toHaveLength(1);
  root.remove();
  await kernel.whenEnhanced();
  expect(newer).toHaveBeenCalledOnce();
  expect(older).not.toHaveBeenCalled();
});
it("does not construct an observer after its constructor getter disposes the owner", () => {
  const { owner, host, root, kernel } = setup();
  const Native = owner.MutationObserver,
    construct = vi.fn();
  vi.spyOn(owner, "MutationObserver", "get").mockImplementationOnce(() => {
    kernel.dispose();
    return class extends Native {
      constructor(callback: MutationCallback) {
        super(callback);
        construct();
      }
    };
  });
  expect(() => host.observe(root, () => undefined, { childList: true })).toThrow();
  expect(construct).not.toHaveBeenCalled();
});
it("retains a newer UI map entry when superseded cleanup throws", () => {
  const { owner, host, root } = setup();
  createUILifecycle(host);
  const records = new WeakMap<Element, ReturnType<typeof uiRecord>>();
  const old = uiRecord("old"),
    replacement = uiRecord("new");
  const error = new Error("old cleanup failed"),
    newCleanup = vi.fn();
  const native = owner.MutationObserver.prototype.observe;
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    ownUIRecord(records, root, replacement, newCleanup);
    native.apply(this, args);
  });
  let throwing = true;
  try {
    expect(() =>
      ownUIRecord(records, root, old, () => {
        if (throwing) throw error;
      }),
    ).toThrow(error);
    expect(records.get(root)).toBe(replacement);
    expect(newCleanup).not.toHaveBeenCalled();
  } finally {
    throwing = false;
  }
});

it("releases an observer returned after its constructor disposes the kernel", () => {
  const { owner, host, root, kernel } = setup();
  const NativeObserver = owner.MutationObserver;
  const disconnect = vi.spyOn(NativeObserver.prototype, "disconnect");
  vi.spyOn(owner, "MutationObserver").mockImplementation(function (callback) {
    const observer = new NativeObserver(callback);
    kernel.dispose();
    return observer;
  });
  expect(() => host.own("task", "first", () => undefined, root)).toThrow();
  expect(disconnect).toHaveBeenCalledOnce();
});

it("releases observation acquired after disposal inside observe", () => {
  const { owner, host, root, kernel } = setup();
  const NativeObserver = owner.MutationObserver;
  const original = NativeObserver.prototype.observe;
  const disconnect = vi.spyOn(NativeObserver.prototype, "disconnect");
  vi.spyOn(NativeObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    kernel.dispose();
    original.apply(this, args);
  });
  expect(() => host.own("task", "first", () => undefined, root)).toThrow();
  expect(disconnect).toHaveBeenCalledTimes(2);
});

it("keeps one removal observer when first scoped acquisition reenters", () => {
  const { owner, host, root, kernel } = setup();
  const original = owner.MutationObserver.prototype.observe;
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    host.own("task", "newer", () => undefined, root);
    original.apply(this, args);
  });
  host.own("task", "older", () => undefined, root);
  expect(
    kernel.resourceSummary().filter((r) => r.owner === "document:resource-removal"),
  ).toHaveLength(1);
});

it("keeps the UI record installed by first-scope acquisition reentry", () => {
  const { owner, host, root } = setup();
  createUILifecycle(host);
  const records = new WeakMap<Element, ReturnType<typeof uiRecord>>();
  const old = uiRecord("older");
  const current = uiRecord("newer");
  const original = owner.MutationObserver.prototype.observe;
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    ownUIRecord(records, root, current);
    original.apply(this, args);
  });
  ownUIRecord(records, root, old);
  expect(records.get(root)).toBe(current);
});

it("suppresses a queued observer callback during earlier disposal cleanup", () => {
  const { owner, host, root, kernel } = setup();
  const Native = owner.MutationObserver;
  const callback = vi.fn();
  let queued: MutationCallback | undefined;
  vi.spyOn(owner, "MutationObserver").mockImplementationOnce(function (next) {
    queued = next;
    return new Native(next);
  });
  const observer = host.observe(root, callback, { childList: true });
  host.own("service", "queued-before-observer-cleanup", () => {
    if (!queued) throw new Error("Missing queued callback.");
    queued([], observer);
  });
  kernel.dispose();
  expect(callback).not.toHaveBeenCalled();
});

it("retires provisional ownership when the native constructor getter throws", () => {
  const { host, root, kernel } = setup();
  const error = new Error("constructor lookup failed");
  const original = host.window;
  Object.defineProperty(host, "window", {
    configurable: true,
    value: new Proxy(original, {
      get(target, name) {
        if (name === "MutationObserver") throw error;
        return Reflect.get(target, name);
      },
    }),
  });
  try {
    expect(() => host.observe(root, () => undefined, { childList: true })).toThrow(error);
  } finally {
    Object.defineProperty(host, "window", { configurable: true, value: original });
  }
  expect(kernel.resourceSummary().filter(({ kind }) => kind === "observer")).toHaveLength(0);
});

it("preserves late setup and disconnect errors after disposal", () => {
  const { owner, host, root, kernel } = setup();
  const prototype = owner.MutationObserver.prototype;
  const observe = prototype.observe;
  const disconnect = prototype.disconnect;
  const setupError = new Error("late observe failed");
  const cleanupError = new Error("late disconnect failed");
  let disconnects = 0;
  vi.spyOn(prototype, "disconnect").mockImplementation(function (this: MutationObserver) {
    disconnect.call(this);
    if (++disconnects === 2) throw cleanupError;
  });
  vi.spyOn(prototype, "observe").mockImplementationOnce(function (this: MutationObserver, ...args) {
    kernel.dispose();
    observe.apply(this, args);
    throw setupError;
  });
  let caught: unknown;
  try {
    host.observe(root, () => undefined, { childList: true });
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  expect((caught as AggregateError).errors).toEqual([setupError, cleanupError]);
  expect(disconnects).toBe(2);
  expect(kernel.resourceSummary().filter(({ kind }) => kind === "observer")).toHaveLength(0);
});

it("preserves the newer removal observer when retiring its predecessor throws", async () => {
  const { owner, host, root, kernel } = setup();
  const prototype = owner.MutationObserver.prototype;
  const observe = prototype.observe;
  const disconnect = prototype.disconnect;
  const error = new Error("superseded disconnect failed");
  const newer = vi.fn();
  const older = vi.fn();
  vi.spyOn(prototype, "observe").mockImplementationOnce(function (this: MutationObserver, ...args) {
    host.own("task", "nested-after-cleanup-error", newer, root);
    observe.apply(this, args);
  });
  vi.spyOn(prototype, "disconnect").mockImplementationOnce(function (this: MutationObserver) {
    disconnect.call(this);
    throw error;
  });
  expect(() => host.own("task", "outer-cleanup-error", older, root)).toThrow(error);
  expect(
    kernel.resourceSummary().filter(({ owner }) => owner === "document:resource-removal"),
  ).toHaveLength(1);
  root.remove();
  await kernel.whenEnhanced();
  expect(newer).toHaveBeenCalledOnce();
  expect(older).not.toHaveBeenCalled();
});

it("rejects connected scoped work removed during first native observer setup", () => {
  const { owner, host, root, kernel } = setup();
  const observe = owner.MutationObserver.prototype.observe;
  const cleanup = vi.fn();
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    root.remove();
    observe.apply(this, args);
  });
  expect(() => host.own("task", "removed-during-setup", cleanup, root)).toThrow(
    "cannot acquire resources",
  );
  expect(kernel.resourceSummary().some(({ owner }) => owner === "removed-during-setup")).toBe(
    false,
  );
  expect(cleanup).not.toHaveBeenCalled();
});

it("preserves initially detached scoped work and connected moves during setup", () => {
  const { owner, host, root, kernel } = setup();
  const detached = owner.document.createElement("aside");
  const destination = owner.document.createElement("main");
  owner.document.body.append(destination);
  const observe = owner.MutationObserver.prototype.observe;
  const detachedCleanup = vi.fn();
  const movedCleanup = vi.fn();
  vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
    this: MutationObserver,
    ...args
  ) {
    destination.append(root);
    observe.apply(this, args);
  });
  host.own("task", "moved-during-setup", movedCleanup, root);
  host.own("task", "initially-detached", detachedCleanup, detached);
  expect(movedCleanup).not.toHaveBeenCalled();
  expect(detachedCleanup).not.toHaveBeenCalled();
  kernel.dispose();
  expect(movedCleanup).toHaveBeenCalledOnce();
  expect(detachedCleanup).toHaveBeenCalledOnce();
});

it("closes a Popover opened reentrantly before initial scope acquisition ends", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as (Window & typeof globalThis) | null;
  if (!owner) throw new Error("Missing native owner.");
  const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
    jQueryFactory(owner: Window): JQueryStatic;
  };
  const $ = installStarCore(jQueryFactory(owner), { document: owner.document });
  const ui = $.star.use(uiPlugin);
  try {
    const root = owner.document.createElement("section");
    root.dataset.jqs = "popover";
    root.innerHTML =
      '<button data-part="trigger">Open</button><div data-part="content">Content</div>';
    owner.document.body.append(root);
    const content = root.querySelector<HTMLElement>('[data-part="content"]');
    if (!content) throw new Error("Missing native content.");
    const observe = owner.MutationObserver.prototype.observe;
    let entered = false;
    vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
      this: MutationObserver,
      ...args
    ) {
      entered = true;
      ui.popover.open(root);
      expect(root.dataset.state).toBe("open");
      root.remove();
      observe.apply(this, args);
    });
    expect(() => ui.enhance(root)).toThrow("cannot acquire resources");
    expect(entered).toBe(true);
    expect(root.dataset.state).toBe("closed");
    expect(content.dataset.state).toBe("closed");
    expect(content.hidden).toBe(true);
  } finally {
    $.star.dispose();
    frame.remove();
  }
});

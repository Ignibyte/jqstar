import { afterEach, expect, it, vi } from "vitest";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";
import { createRequire } from "node:module";
import { installStarCore, type StarPluginRegistrar } from "../src/core";

for (const previous of [false, true]) {
  it.each(["method", "capture", "once", "passive", "signal"])(
    `preserves registration from %s getter with previous owner=${previous}`,
    (key) => {
      const { root, owner, host } = fixture();
      const callback = vi.fn();
      const first = previous ? host.listen(root, "probe", callback) : () => undefined;
      const add = root.addEventListener;
      let entered = false;
      let newer: () => void = () => undefined;
      const reenter = () => {
        if (entered) return;
        entered = true;
        newer = host.listen(root, "probe", callback);
      };
      const options: AddEventListenerOptions = {};
      if (key === "method") {
        Object.defineProperty(root, "addEventListener", {
          get() {
            reenter();
            return add;
          },
        });
      } else {
        Object.defineProperty(options, key, {
          get() {
            reenter();
            return key === "signal" ? undefined : false;
          },
        });
      }
      const older = host.listen(root, "probe", callback, options);
      older();
      expect(entered).toBe(true);
      root.dispatchEvent(new owner.Event("probe"));
      expect(callback).toHaveBeenCalledOnce();
      newer();
      first();
      root.dispatchEvent(new owner.Event("probe"));
      expect(callback).toHaveBeenCalledOnce();
    },
  );
}

it.each([false, true])(
  "retires older duplicate setup after a newer duplicate completes, native first=%s",
  (nativeFirst) => {
    const { root, owner, host } = fixture();
    const callback = vi.fn(),
      add = root.addEventListener;
    const first = host.listen(root, "probe", callback);
    let newer: () => void = () => undefined;
    vi.spyOn(root, "addEventListener").mockImplementationOnce(function (
      this: HTMLElement,
      ...args
    ) {
      if (nativeFirst) add.apply(this, args);
      newer = host.listen(root, "probe", callback);
      if (!nativeFirst) add.apply(this, args);
    });
    const older = host.listen(root, "probe", callback);
    older();
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).toHaveBeenCalledOnce();
    newer();
    first();
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).toHaveBeenCalledOnce();
  },
);

it.each([false, true])(
  "keeps newer nested listener options when outer native registration happens first=%s",
  (outerFirst) => {
    const { root, owner, host } = fixture();
    const callback = vi.fn();
    const add = root.addEventListener;
    let nested: () => void = () => undefined;
    vi.spyOn(root, "addEventListener").mockImplementationOnce(function (
      this: HTMLElement,
      ...args
    ) {
      if (outerFirst) add.apply(this, args);
      nested = host.listen(root, "probe", callback, { once: false });
      if (!outerFirst) add.apply(this, args);
    });
    const outer = host.listen(root, "probe", callback, { once: true });
    outer();
    root.dispatchEvent(new owner.Event("probe"));
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).toHaveBeenCalledTimes(2);
    nested();
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).toHaveBeenCalledTimes(2);
  },
);
it.each([0, 1])(
  "deduplicates matching callbacks and either release removes the registration (%s)",
  (index) => {
    const { root, owner, host } = fixture();
    const callback = vi.fn();
    const releases = [
      host.listen(root, "probe", callback),
      host.listen(root, "probe", callback, { capture: false }),
    ];
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).toHaveBeenCalledOnce();
    const release = releases[index];
    if (!release) throw new Error("Missing listener release.");
    release();
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).toHaveBeenCalledOnce();
    const remaining = releases[1 - index];
    if (!remaining) throw new Error("Missing remaining listener release.");
    remaining();
  },
);
it("keeps capture and bubble registrations separate", () => {
  const { root, owner, host } = fixture();
  const callback = vi.fn();
  const capture = host.listen(root, "probe", callback, true),
    bubble = host.listen(root, "probe", callback, false);
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledTimes(2);
  capture();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledTimes(3);
  bubble();
});
it.each(["once", "abort"])(
  "old %s cleanup preserves a later registration of the same callback",
  (mode) => {
    const { root, owner, host } = fixture();
    const callback = vi.fn();
    const controller = new owner.AbortController();
    const old = host.listen(
      root,
      "probe",
      callback,
      mode === "once" ? { once: true } : { signal: controller.signal },
    );
    if (mode === "once") root.dispatchEvent(new owner.Event("probe"));
    else controller.abort();
    callback.mockClear();
    const current = host.listen(root, "probe", callback);
    old();
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).toHaveBeenCalledOnce();
    current();
  },
);
it("preserves the first registration options when a duplicate requests once and passive", () => {
  const { root, owner, host } = fixture();
  const callback = vi.fn((event: Event) => event.preventDefault());
  const first = host.listen(root, "probe", callback, { passive: false }),
    second = host.listen(root, "probe", callback, { once: true, passive: true });
  const event = new owner.Event("probe", { cancelable: true });
  root.dispatchEvent(event);
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledTimes(2);
  expect(event.defaultPrevented).toBe(true);
  first();
  second();
});
it("preserves a previously owned duplicate when a new registration fails", () => {
  const { root, owner, host } = fixture();
  const callback = vi.fn(),
    failure = new Error("duplicate failed");
  const add = root.addEventListener;
  const first = host.listen(root, "probe", callback);
  vi.spyOn(root, "addEventListener").mockImplementationOnce(function (this: HTMLElement, ...args) {
    add.apply(this, args);
    throw failure;
  });
  expect(() => host.listen(root, "probe", callback)).toThrow(failure);
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
  first();
});
it("preserves nested successful registration when outer setup fails", () => {
  const { root, owner, host } = fixture();
  const callback = vi.fn(),
    failure = new Error("outer failed");
  const add = root.addEventListener;
  let nested: () => void = () => undefined;
  vi.spyOn(root, "addEventListener").mockImplementationOnce(function (this: HTMLElement, ...args) {
    nested = host.listen(root, "probe", callback);
    add.apply(this, args);
    throw failure;
  });
  expect(() => host.listen(root, "probe", callback)).toThrow(failure);
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
  nested();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
});
it("reads native option getters once in native order with the original receiver", () => {
  const { root, owner, host } = fixture();
  const reads: string[] = [],
    receivers: unknown[] = [];
  const controller = new owner.AbortController();
  const options = {
    get capture() {
      reads.push("capture");
      receivers.push(this);
      return true;
    },
    get once() {
      reads.push("once");
      receivers.push(this);
      return false;
    },
    get passive() {
      reads.push("passive");
      receivers.push(this);
      return false;
    },
    get signal() {
      reads.push("signal");
      receivers.push(this);
      return controller.signal;
    },
  };
  const release = host.listen(root, "probe", () => undefined, options);
  release();
  expect(reads).toEqual(["capture", "once", "passive", "signal"]);
  expect(receivers).toEqual([options, options, options, options]);
});
it.each(["capture", "once", "passive", "signal"])(
  "stops reading options after %s retires the kernel",
  (key) => {
    const { root, owner, host, kernel } = fixture();
    const reads: string[] = [];
    const callback = vi.fn();
    const options: AddEventListenerOptions = {};
    const keys = ["capture", "once", "passive", "signal"];
    for (const name of keys)
      Object.defineProperty(options, name, {
        get() {
          reads.push(name);
          if (name === key) kernel.dispose();
          return name === "signal" ? undefined : false;
        },
      });
    expect(() => host.listen(root, "probe", callback, options)).toThrow();
    expect(reads).toEqual(keys.slice(0, keys.indexOf(key) + 1));
    root.dispatchEvent(new owner.Event("probe"));
    expect(callback).not.toHaveBeenCalled();
  },
);
it("does not remove an unregistered listener after the signal getter retires the kernel", () => {
  const { root, host, kernel } = fixture();
  const add = vi.spyOn(root, "addEventListener");
  const remove = vi.spyOn(root, "removeEventListener");
  const signal = new AbortController().signal;
  const options = {
    get signal() {
      kernel.dispose();
      return signal;
    },
  };
  expect(() => host.listen(root, "probe", vi.fn(), options)).toThrow();
  expect(add).not.toHaveBeenCalled();
  expect(remove).not.toHaveBeenCalled();
});
it("guards delivery before native cleanup even when removal dispatches synchronously", () => {
  const { root, owner, host } = fixture();
  const callback = vi.fn();
  const remove = root.removeEventListener;
  const release = host.listen(root, "probe", callback);
  vi.spyOn(root, "removeEventListener").mockImplementationOnce(function (
    this: HTMLElement,
    ...args
  ) {
    root.dispatchEvent(new owner.Event("probe"));
    remove.apply(this, args);
  });
  release();
  expect(callback).not.toHaveBeenCalled();
});
it("keeps a newer same-callback registration created during native removal", () => {
  const { root, owner, host } = fixture();
  const callback = vi.fn();
  const remove = root.removeEventListener;
  let newer: () => void = () => undefined;
  const old = host.listen(root, "probe", callback);
  vi.spyOn(root, "removeEventListener").mockImplementationOnce(function (
    this: HTMLElement,
    ...args
  ) {
    newer = host.listen(root, "probe", callback);
    remove.apply(this, args);
  });
  old();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
  newer();
});
const kernels: Kernel[] = [];
function fixture() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, owner.document);
  kernels.push(kernel);
  const root = owner.document.createElement("section");
  owner.document.body.append(root);
  return { owner, root, kernel, host: kernel.documentHost };
}
afterEach(() => {
  vi.restoreAllMocks();
  for (const kernel of kernels.splice(0)) if (!kernel.disposed) kernel.dispose();
  document.body.replaceChildren();
});
it("releases ordinary native listeners once with their captured receiver", () => {
  const { root, owner, host } = fixture();
  const listener = vi.fn();
  const release = host.listen(root, "probe", listener, true);
  root.dispatchEvent(new owner.Event("probe"));
  expect(listener).toHaveBeenCalledOnce();
  expect(listener.mock.contexts[0]).toBe(root);
  release();
  release();
  root.dispatchEvent(new owner.Event("probe"));
  expect(listener).toHaveBeenCalledOnce();
});
it("retains native capture identity after the options object changes", () => {
  const { root, owner, host } = fixture();
  const listener = vi.fn();
  const options = { capture: true };
  const release = host.listen(root, "probe", listener, options);
  options.capture = false;
  release();
  root.dispatchEvent(new owner.Event("probe"));
  expect(listener).not.toHaveBeenCalled();
});
it("releases a native listener added after reentrant kernel disposal", () => {
  const { root, owner, host, kernel } = fixture();
  const add = root.addEventListener;
  const listener = vi.fn();
  vi.spyOn(root, "addEventListener").mockImplementationOnce(function (this: HTMLElement, ...args) {
    kernel.dispose();
    add.apply(this, args);
  });
  expect(() => host.listen(root, "probe", listener)).toThrow();
  root.dispatchEvent(new owner.Event("probe"));
  expect(listener).not.toHaveBeenCalled();
});
it.each([false, true])(
  "releases native registration after setup throws, disposed=%s",
  (disposed) => {
    const { root, owner, host, kernel } = fixture();
    const add = root.addEventListener;
    const listener = vi.fn();
    const failure = new Error("add failed");
    vi.spyOn(root, "addEventListener").mockImplementationOnce(function (
      this: HTMLElement,
      ...args
    ) {
      if (disposed) kernel.dispose();
      add.apply(this, args);
      throw failure;
    });
    expect(() => host.listen(root, "probe", listener)).toThrow(failure);
    root.dispatchEvent(new owner.Event("probe"));
    expect(listener).not.toHaveBeenCalled();
  },
);
it("preserves setup and native listener cleanup errors", () => {
  const { root, host, kernel } = fixture();
  const add = root.addEventListener,
    remove = root.removeEventListener;
  const setup = new Error("add failed"),
    cleanup = new Error("remove failed");
  vi.spyOn(root, "addEventListener").mockImplementationOnce(function (this: HTMLElement, ...args) {
    add.apply(this, args);
    throw setup;
  });
  vi.spyOn(root, "removeEventListener").mockImplementationOnce(function (
    this: HTMLElement,
    ...args
  ) {
    remove.apply(this, args);
    throw cleanup;
  });
  let caught: unknown;
  try {
    host.listen(root, "probe", () => undefined);
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  expect((caught as AggregateError).errors).toEqual([setup, cleanup]);
  expect(kernel.resourceSummary().filter((r) => r.kind === "listener")).toHaveLength(0);
});
it("does not register after the listener method getter disposes the kernel", () => {
  const { root, host, kernel } = fixture();
  const add = root.addEventListener;
  const called = vi.fn();
  Object.defineProperty(root, "addEventListener", {
    configurable: true,
    get() {
      kernel.dispose();
      return function (this: HTMLElement, ...args: Parameters<typeof add>) {
        called();
        add.apply(this, args);
      };
    },
  });
  expect(() => host.listen(root, "probe", () => undefined)).toThrow();
  expect(called).not.toHaveBeenCalled();
});
it("ignores an injected listener callback after release", () => {
  const { root, owner, host } = fixture();
  const add = root.addEventListener,
    callback = vi.fn();
  let queued: EventListenerOrEventListenerObject | null = null;
  vi.spyOn(root, "addEventListener").mockImplementationOnce(function (this: HTMLElement, ...args) {
    queued = args[1];
    add.apply(this, args);
  });
  const release = host.listen(root, "probe", callback);
  release();
  function invoke(listener: EventListenerOrEventListenerObject | null) {
    if (typeof listener !== "function") throw new Error("Missing listener");
    listener.call(root, new owner.Event("probe"));
  }
  invoke(queued);
  expect(callback).not.toHaveBeenCalled();
});

const { jQueryFactory } = createRequire(import.meta.url)("jquery/factory") as {
  jQueryFactory(owner: Window): JQueryStatic;
};
function pluginFixture() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as Window & typeof globalThis;
  const star = installStarCore(jQueryFactory(owner), { document: owner.document }).star;
  const root = owner.document.createElement("section");
  owner.document.body.append(root);
  return { owner, root, star, frame };
}
function plugin(install: (registrar: StarPluginRegistrar) => void) {
  return { name: "probe.native-acquisition", version: "1.0.0", apiVersion: "^0.1.0", install };
}
it("preserves ordinary staged native observer delivery and disposal", async () => {
  const { owner, root, star, frame } = pluginFixture();
  const callback = vi.fn();
  try {
    star.use(
      plugin((r) => {
        r.documentHost.observe(root, callback, { childList: true });
      }),
    );
    root.append(owner.document.createElement("i"));
    await new Promise((resolve) => owner.setTimeout(resolve, 0));
    expect(callback).toHaveBeenCalledOnce();
    star.dispose();
    root.append(owner.document.createElement("b"));
    await new Promise((resolve) => owner.setTimeout(resolve, 0));
    expect(callback).toHaveBeenCalledOnce();
  } finally {
    star.dispose();
    frame.remove();
  }
});
it.each([false, true])(
  "staged observer retires late native observation with throw=%s",
  async (throws) => {
    const { owner, root, star, frame } = pluginFixture();
    const observe = owner.MutationObserver.prototype.observe;
    const callback = vi.fn();
    let entered = false;
    let registered = false;
    try {
      vi.spyOn(owner.MutationObserver.prototype, "observe").mockImplementationOnce(function (
        this: MutationObserver,
        ...args
      ) {
        entered = true;
        star.dispose();
        observe.apply(this, args);
        registered = true;
        if (throws) throw new Error("late staged observation");
      });
      expect(() =>
        star.use(
          plugin((r) => {
            r.documentHost.observe(root, callback, { childList: true });
          }),
        ),
      ).toThrow();
      expect(entered).toBe(true);
      expect(registered).toBe(true);
      root.append(owner.document.createElement("i"));
      await new Promise((resolve) => owner.setTimeout(resolve, 0));
      expect(callback).not.toHaveBeenCalled();
    } finally {
      star.dispose();
      frame.remove();
    }
  },
);

it("preserves native once and passive options", () => {
  const { owner, root, host } = fixture();
  const callback = vi.fn((event: Event) => event.preventDefault());
  const release = host.listen(root, "probe", callback, { once: true, passive: true });
  const first = new owner.Event("probe", { cancelable: true });
  root.dispatchEvent(first);
  root.dispatchEvent(new owner.Event("probe"));
  expect(first.defaultPrevented).toBe(false);
  expect(callback).toHaveBeenCalledOnce();
  release();
});
it("preserves native AbortSignal cancellation", () => {
  const { owner, root, host } = fixture();
  const callback = vi.fn();
  const controller = new owner.AbortController();
  const release = host.listen(root, "probe", callback, { signal: controller.signal });
  controller.abort();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).not.toHaveBeenCalled();
  release();
});

it("keeps a duplicate's abort signal from replacing the original cancellation", () => {
  const { owner, root, host } = fixture();
  const callback = vi.fn();
  const first = new owner.AbortController(),
    second = new owner.AbortController();
  const releaseFirst = host.listen(root, "probe", callback, { signal: first.signal });
  const releaseSecond = host.listen(root, "probe", callback, { signal: second.signal });
  second.abort();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
  first.abort();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
  releaseFirst();
  releaseSecond();
});

it("does not revive an already aborted native registration", () => {
  const { owner, root, host } = fixture();
  const callback = vi.fn(),
    controller = new owner.AbortController();
  controller.abort();
  const old = host.listen(root, "probe", callback, { signal: controller.signal });
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).not.toHaveBeenCalled();
  const current = host.listen(root, "probe", callback);
  old();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
  current();
});

it("leaves signal validation to the native target and preserves existing registration", () => {
  const { owner, root, host, kernel } = fixture();
  const callback = vi.fn();
  const release = host.listen(root, "probe", callback);
  expect(() => host.listen(root, "probe", callback, { signal: {} as AbortSignal })).toThrow();
  expect(kernel.resourceSummary().filter((r) => r.kind === "listener")).toHaveLength(1);
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).toHaveBeenCalledOnce();
  release();
});

it.each([false, true])(
  "staged listeners remove late native registration with throw=%s",
  (throws) => {
    const { owner, root, star, frame } = pluginFixture();
    const callback = vi.fn(),
      add = root.addEventListener;
    let registered = false;
    try {
      vi.spyOn(root, "addEventListener").mockImplementationOnce(function (
        this: HTMLElement,
        ...args
      ) {
        star.dispose();
        add.apply(this, args);
        registered = true;
        if (throws) throw new Error("late staged listener");
      });
      expect(() =>
        star.use(
          plugin((r) => {
            r.documentHost.listen(root, "probe", callback);
          }),
        ),
      ).toThrow();
      expect(registered).toBe(true);
      root.dispatchEvent(new owner.Event("probe"));
      expect(callback).not.toHaveBeenCalled();
    } finally {
      star.dispose();
      frame.remove();
    }
  },
);
it("does not deliver registered work when option conversion disposes the kernel", () => {
  const { owner, root, host, kernel } = fixture();
  const callback = vi.fn();
  const options = {
    get capture() {
      kernel.dispose();
      return true;
    },
  };
  expect(() => host.listen(root, "probe", callback, options)).toThrow();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).not.toHaveBeenCalled();
});
it("retires accounting before native listener cleanup throws", () => {
  const { owner, root, host, kernel } = fixture();
  const callback = vi.fn();
  const remove = root.removeEventListener;
  const failure = new Error("remove failure");
  const release = host.listen(root, "probe", callback);
  vi.spyOn(root, "removeEventListener").mockImplementationOnce(function (
    this: HTMLElement,
    ...args
  ) {
    remove.apply(this, args);
    throw failure;
  });
  expect(release).toThrow(failure);
  expect(kernel.resourceSummary().filter((r) => r.kind === "listener")).toHaveLength(0);
  expect(release).not.toThrow();
  root.dispatchEvent(new owner.Event("probe"));
  expect(callback).not.toHaveBeenCalled();
});

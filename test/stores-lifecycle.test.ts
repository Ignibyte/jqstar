import $ from "jquery";
import { afterEach, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { kernelForDocument } from "../src/kernel";
import { nextUpdate, reactive } from "../src/reactivity";
import { defineStore, storesPlugin, type StarStoreSetupContext } from "../src/stores";

const installations: {
  frame: HTMLIFrameElement;
  star: ReturnType<typeof installStarCore>["star"];
}[] = [];

function install() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentDocument;
  if (!owner) throw new Error("Missing test document.");
  const star = installStarCore($, { document: owner }).star;
  installations.push({ frame, star });
  const kernel = kernelForDocument(owner);
  if (!kernel) throw new Error("Missing test kernel.");
  return { star, kernel, stores: star.use(storesPlugin) };
}

afterEach(() => {
  vi.restoreAllMocks();
  for (const { frame, star } of installations.splice(0).reverse()) {
    try {
      star.dispose();
    } finally {
      frame.remove();
    }
  }
});

it("does not invoke a selector after an option getter disposes its store", () => {
  const { star, stores } = install();
  stores.define("preferences", defineStore({ initial: { value: 1 } }));
  const selector = vi.fn(() => 1);
  const listener = vi.fn();
  expect(() =>
    stores.subscribe("preferences", selector, listener, {
      get equality() {
        star.dispose();
        return Object.is;
      },
    }),
  ).toThrow();
  expect(selector).not.toHaveBeenCalled();
  expect(listener).not.toHaveBeenCalled();
});

it("stops an effect whose initial evaluation disposes the kernel", async () => {
  const { star, stores } = install();
  const source = reactive({ value: 0 });
  const calls: number[] = [];
  expect(() =>
    stores.define(
      "session",
      defineStore({
        initial: {},
        setup(context) {
          context.effect(() => {
            calls.push(source.value);
            star.dispose();
          });
        },
      }),
    ),
  ).toThrow();
  source.value++;
  await nextUpdate();
  expect(calls).toEqual([0]);
});

it.each(["effect", "subscribe", "task"] as const)(
  "refuses retained setup %s work after rollback without invoking callbacks",
  (operation) => {
    const { stores } = install();
    let retained: StarStoreSetupContext<object> | undefined;
    expect(() =>
      stores.define(
        "failed",
        defineStore({
          initial: {},
          setup(context) {
            retained = context;
            throw new Error("setup failed");
          },
        }),
      ),
    ).toThrow("setup failed");
    if (!retained) throw new Error("Missing retained context.");
    const context = retained;
    const callback = vi.fn(() => Promise.resolve());
    expect(() => {
      if (operation === "subscribe") context.subscribe(callback, vi.fn());
      else context[operation](callback);
    }).toThrow("disposed");
    expect(callback).not.toHaveBeenCalled();
    expect(context.signal.aborted).toBe(true);
    expect(context.signal.reason).toBe("rollback");
    expect(stores.names()).toEqual([]);
  },
);

it.each([false, true])(
  "releases cleanup supplied after rollback, throwing cleanup: %s",
  (throws) => {
    const { stores } = install();
    let retained: StarStoreSetupContext<object> | undefined;
    expect(() =>
      stores.define(
        "failed",
        defineStore({
          initial: {},
          setup(context) {
            retained = context;
            throw new Error("setup failed");
          },
        }),
      ),
    ).toThrow("setup failed");
    if (!retained) throw new Error("Missing retained context.");
    const context = retained;
    const failure = new Error("late cleanup failed");
    const cleanup = vi.fn(() => {
      if (throws) throw failure;
    });
    try {
      context.cleanup(cleanup);
      expect.unreachable("Ended ownership must be refused.");
    } catch (error) {
      if (throws) {
        expect(error).toBeInstanceOf(AggregateError);
        expect((error as AggregateError).errors).toContain(failure);
      } else expect(String(error)).toContain("disposed");
    }
    expect(cleanup).toHaveBeenCalledOnce();
  },
);

it("aborts the provisional signal before disposal returns and releases returned cleanup", () => {
  const { star, stores } = install();
  const cleanup = vi.fn();
  let aborted: boolean | undefined;
  let reason: unknown;
  expect(() =>
    stores.define(
      "session",
      defineStore({
        initial: {},
        setup(context) {
          star.dispose();
          aborted = context.signal.aborted;
          reason = context.signal.reason;
          return cleanup;
        },
      }),
    ),
  ).toThrow();
  expect(aborted).toBe(true);
  expect(reason).toBe("cleanup");
  expect(cleanup).toHaveBeenCalledOnce();
  star.dispose();
  expect(cleanup).toHaveBeenCalledOnce();
});

it.each(["facade", "setup"])(
  "stops %s subscription delivery after its initial selector disposes",
  async (scope) => {
    const { star, stores } = install();
    const source = reactive({ value: 0 });
    const selector = vi.fn(() => {
      const value = source.value;
      star.dispose();
      return value;
    });
    const listener = vi.fn();
    expect(() => {
      stores.define(
        "session",
        defineStore({
          initial: {},
          setup(context) {
            if (scope === "setup") context.subscribe(selector, listener, { immediate: true });
          },
        }),
      );
      if (scope === "facade") stores.subscribe("session", selector, listener, { immediate: true });
    }).toThrow();
    source.value++;
    await nextUpdate();
    expect(selector).toHaveBeenCalledOnce();
    expect(listener.mock.calls.length).toBe(0);
  },
);

it.each(["selector", "equality"])("stops later delivery after disposal in %s", async (phase) => {
  const { star, stores } = install();
  const store = stores.define("session", defineStore({ initial: { value: 0 } }));
  const listener = vi.fn();
  stores.subscribe<{ value: number }, number>(
    "session",
    (value) => {
      const current = value.value;
      if (current === 1 && phase === "selector") star.dispose();
      return current;
    },
    listener,
    {
      equality() {
        star.dispose();
        return false;
      },
    },
  );
  store.value = 1;
  await nextUpdate();
  expect(listener.mock.calls.length).toBe(0);
});

it("aborts a task that disposes during its factory and contains its rejected promise", async () => {
  const { star, stores } = install();
  let aborted: boolean | undefined;
  expect(() =>
    stores.define(
      "session",
      defineStore({
        initial: {},
        setup(context) {
          context.task((signal) => {
            star.dispose();
            aborted = signal.aborted;
            return Promise.reject(new Error("task failed"));
          });
        },
      }),
    ),
  ).toThrow();
  await Promise.resolve();
  await Promise.resolve();
  expect(aborted).toBe(true);
});

it("rolls failed setup back in reverse order and leaves a sibling live", async () => {
  const { star, stores } = install();
  const sibling = stores.define("sibling", defineStore({ initial: { value: 0 } }));
  const source = reactive({ value: 0 });
  const effect = vi.fn(() => source.value);
  const calls: string[] = [];
  const primary = new Error("setup failed");
  const failure = new Error("cleanup failed");
  expect(() =>
    stores.define(
      "failed",
      defineStore({
        initial: {},
        setup(context) {
          context.cleanup(() => calls.push(`first:${context.signal.reason}`));
          context.effect(effect);
          context.cleanup(() => {
            calls.push(`second:${context.signal.reason}`);
            throw failure;
          });
          throw primary;
        },
      }),
    ),
  ).toThrow(expect.objectContaining({ errors: [primary, failure] }));
  expect(calls).toEqual(["second:rollback", "first:rollback"]);
  source.value++;
  sibling.value++;
  await nextUpdate();
  expect(effect).toHaveBeenCalledOnce();
  expect(sibling.value).toBe(1);
  expect(stores.names()).toEqual(["sibling"]);
  star.dispose();
  expect(calls).toHaveLength(2);
});

it("keeps normal cleanup reverse ordered, aborted and idempotent", async () => {
  const { star, stores } = install();
  const source = reactive({ value: 0 });
  const effect = vi.fn(() => source.value);
  const listener = vi.fn();
  const calls: string[] = [];
  stores.define(
    "session",
    defineStore({
      initial: {},
      setup(context) {
        context.cleanup(() => calls.push(`first:${context.signal.aborted}`));
        context.effect(effect);
        context.subscribe(() => source.value, listener, { immediate: true });
        context.cleanup(() => calls.push(`second:${context.signal.aborted}`));
        return () => calls.push(`returned:${context.signal.aborted}`);
      },
    }),
  );
  source.value++;
  await nextUpdate();
  expect(effect).toHaveBeenCalledTimes(2);
  expect(listener).toHaveBeenCalledTimes(2);
  star.dispose();
  star.dispose();
  source.value++;
  await nextUpdate();
  expect(calls).toEqual(["returned:true", "second:true", "first:true"]);
  expect(effect).toHaveBeenCalledTimes(2);
  expect(listener).toHaveBeenCalledTimes(2);
});

it.each(["effect", "subscription"])(
  "releases %s after injected ownership failure",
  async (kind) => {
    const { stores, kernel } = install();
    const source = reactive({ value: 0 });
    const callback = vi.fn(() => source.value);
    const own = kernel.own.bind(kernel);
    const failure = new Error("ownership failed");
    vi.spyOn(kernel, "own").mockImplementation((category, owner, cleanup) => {
      if (category === kind) throw failure;
      return own(category, owner, cleanup);
    });
    if (kind === "effect") {
      expect(() =>
        stores.define(
          "failed",
          defineStore({
            initial: {},
            setup(context) {
              context.effect(callback);
            },
          }),
        ),
      ).toThrow(failure);
    } else {
      stores.define("session", defineStore({ initial: {} }));
      expect(() => stores.subscribe("session", callback, vi.fn())).toThrow(failure);
    }
    source.value++;
    await nextUpdate();
    expect(callback).toHaveBeenCalledOnce();
  },
);

it.each([1, 2])("rolls ownership back when lifetime acquisition %s fails", (attempt) => {
  const { stores, kernel } = install();
  const own = kernel.own.bind(kernel);
  const failure = new Error("lifetime failed");
  let lifetimes = 0;
  vi.spyOn(kernel, "own").mockImplementation((category, owner, cleanup) => {
    if (owner.endsWith(":lifetime") && ++lifetimes === attempt) throw failure;
    return own(category, owner, cleanup);
  });
  const calls: string[] = [];
  const setup = vi.fn((context: StarStoreSetupContext<object>) => {
    context.cleanup(() => calls.push(`owned:${context.signal.reason}`));
    return () => calls.push(`returned:${context.signal.reason}`);
  });
  expect(() => stores.define("failed", defineStore({ initial: {}, setup }))).toThrow(failure);
  expect(setup.mock.calls.length).toBe(attempt - 1);
  expect(calls).toEqual(attempt === 1 ? [] : ["returned:rollback", "owned:rollback"]);
  expect(stores.names()).toEqual([]);
});

it("stops an initial subscription listener that disposes its kernel", async () => {
  const { star, stores } = install();
  const source = reactive({ value: 0 });
  const listener = vi.fn(() => {
    star.dispose();
  });
  stores.define("session", defineStore({ initial: {} }));
  expect(() =>
    stores.subscribe("session", () => source.value, listener, { immediate: true }),
  ).toThrow();
  source.value++;
  await nextUpdate();
  expect(listener.mock.calls.length).toBe(1);
});

it("preserves a returned cleanup failure after setup disposes the kernel", () => {
  const { star, stores } = install();
  const failure = new Error("returned cleanup failed");
  const cleanup = vi.fn(() => {
    throw failure;
  });
  expect(() =>
    stores.define(
      "session",
      defineStore({
        initial: {},
        setup() {
          star.dispose();
          return cleanup;
        },
      }),
    ),
  ).toThrow(expect.objectContaining({ errors: [expect.any(Error), failure] }));
  expect(cleanup).toHaveBeenCalledOnce();
});

it("refuses setup after the initial value factory disposes its kernel", () => {
  const { star, stores } = install();
  const setup = vi.fn();
  expect(() =>
    stores.define(
      "session",
      defineStore({
        initial() {
          star.dispose();
          return {};
        },
        setup,
      }),
    ),
  ).toThrow();
  expect(setup).not.toHaveBeenCalled();
});

it("releases acquisitions completed during observation-triggered disposal", async () => {
  const { star, stores } = install();
  const source = reactive({ value: 0 });
  const run = vi.fn(() => source.value);
  star.observeOperations((event) => {
    if (
      event.kind === "store" &&
      event.store.category === "effect" &&
      event.phase === "completed"
    ) {
      star.dispose();
    }
  });
  expect(() =>
    stores.define(
      "session",
      defineStore({
        initial: {},
        setup(context) {
          context.effect(run);
        },
      }),
    ),
  ).toThrow();
  source.value++;
  await nextUpdate();
  expect(run).toHaveBeenCalledOnce();
});

it.each([
  ["initial", "name"],
  ["setup", "name"],
  ["initial", "definition"],
  ["setup", "definition"],
])("rejects %s reentry for the same %s and permits retry", (phase, conflict) => {
  const { stores } = install();
  let retry = false;
  const other = defineStore({ initial: { value: 2 } });
  const reenter = () => {
    expect(stores.names()).toEqual([]);
    expect(stores.get("session")).toBeUndefined();
    if (!retry)
      stores.define(
        conflict === "name" ? "session" : "other",
        conflict === "name" ? other : definition,
      );
  };
  const definition = defineStore({
    initial() {
      if (phase === "initial") reenter();
      return { value: 1 };
    },
    setup() {
      if (phase === "setup") reenter();
    },
  });
  expect(() => stores.define("session", definition)).toThrow("already being defined");
  expect(stores.names()).toEqual([]);
  retry = true;
  const store = stores.define("session", definition);
  expect(stores.define("session", definition)).toBe(store);
  expect(store.value).toBe(1);
  expect(stores.names()).toEqual(["session"]);
});

it("permits another definition and name during setup", () => {
  const { stores } = install();
  const inner = defineStore({ initial: { value: 2 } });
  stores.define(
    "outer",
    defineStore({
      initial: { value: 1 },
      setup() {
        stores.define("inner", inner);
      },
    }),
  );
  expect(stores.names()).toEqual(["inner", "outer"]);
  expect(stores.get("inner")).toBe(stores.define("inner", inner));
});

it("rejects transaction commit after its updater disposes the kernel", () => {
  const { star, stores } = install();
  stores.define("session", defineStore({ initial: { value: 0 } }));
  expect(() =>
    stores.transaction<{ value: number }>("session", (draft) => {
      draft.value = 1;
      star.dispose();
    }),
  ).toThrow("disposed");
});

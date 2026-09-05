import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createCSPExpressionEngine } from "../src/csp";
import { installStarCore } from "../src/core";
import { nextUpdate } from "../src/reactivity";
import { defineStore, storesPlugin, type StarStoresFacade } from "../src/stores";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

const frames: HTMLIFrameElement[] = [];
const kernels: Kernel[] = [];

function kernel(): Kernel {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const current = new Kernel((() => undefined) as unknown as JQueryStatic, frame.contentDocument!);
  kernels.push(current);
  return current;
}

function install(current = kernel()): { facade: StarStoresFacade; kernel: Kernel } {
  return { facade: current.plugins.use(storesPlugin), kernel: current };
}

afterEach(() => {
  for (const current of kernels.splice(0).reverse()) {
    if (!current.disposed) current.dispose();
  }
  for (const frame of frames.splice(0).reverse()) frame.remove();
});

describe("shared stores", () => {
  it("installs one frozen facade and fixed reactive namespace per kernel", async () => {
    const { facade, kernel: current } = install();
    const again = current.plugins.use(storesPlugin);
    const reads: unknown[] = [];

    expect(again).toBe(facade);
    expect(Object.isFrozen(storesPlugin)).toBe(true);
    expect(Object.isFrozen(facade)).toBe(true);
    expect(current.applicationCapabilities.stores).toBe(facade.stores);

    const expression = current.expressions.compileValue("stores.session?.count");
    const context = {
      $: (() => undefined) as unknown as JQueryStatic,
      state: {},
      computed: {},
      stores: facade.stores,
      root: current.documentHost.document.body,
      $root: {} as JQuery<Element>,
      instance: {} as never,
    };
    const { effect, stop } = await import("../src/reactivity");
    const runner = effect(() => reads.push(expression(context)));

    const session = facade.define("session", defineStore({ initial: { count: 1 } }));
    expect(facade.stores.session).toBe(session);
    await nextUpdate();
    session.count = 2;
    await nextUpdate();

    expect(reads).toEqual([undefined, 1, 2]);
    expect(facade.names()).toEqual(["session"]);
    expect(Object.isFrozen(facade.names())).toBe(true);
    expect(() => Reflect.set(facade.stores, "other", {})).toThrow("read-only");
    stop(runner);
  });

  it("clones descriptor-safe graphs, preserves shared references, and keeps method receivers", () => {
    const { facade } = install();
    const shared = { enabled: true };
    const reset = function (this: { count: number }) {
      this.count = 0;
    };
    const initial = { count: 2, first: shared, second: shared, reset };
    const definition = defineStore({ initial });
    const store = facade.define("session", definition) as typeof initial;

    expect(store).not.toBe(initial);
    expect(store.first).not.toBe(shared);
    expect(store.first).toBe(store.second);
    expect(store.reset).toBe(reset);
    store.reset();
    expect(store.count).toBe(0);
    expect(initial.count).toBe(2);
    expect(facade.define("session", definition)).toBe(store);
    expect(() => facade.define("session", defineStore({ initial: { count: 3 } }))).toThrow(
      "another definition object",
    );
    expect(() => facade.define("other", definition)).toThrow("already owns the name session");

    const cycle: Record<string, unknown> = {};
    cycle.self = cycle;
    expect(() => facade.define("cyclic", defineStore({ initial: cycle }))).toThrow("cycle");
    const accessor = Object.defineProperty({}, "value", { enumerable: true, get: () => 1 });
    expect(() => facade.define("accessor", defineStore({ initial: accessor }))).toThrow(
      "accessors",
    );
    const definitionAccessor = Object.defineProperty({}, "initial", {
      enumerable: true,
      get: () => {
        throw new Error("must not run");
      },
    });
    expect(() => defineStore(definitionAccessor as never)).toThrow("accessors");
    expect(() =>
      defineStore(
        new (class Definition {
          marker = true;
        })() as never,
      ),
    ).toThrow("plain records");
    expect(() => facade.define("bad-name", defineStore({ initial: {} }))).toThrow("lower-camel");
  });

  it("rejects unsupported definition and data graph boundaries without invoking them", () => {
    const { facade } = install();
    expect(() => defineStore(null as never)).toThrow("definition object");
    expect(() => defineStore([] as never)).toThrow("definition object");
    expect(() =>
      defineStore(
        new Proxy(
          {},
          {
            getPrototypeOf() {
              throw new Error("unreadable");
            },
          },
        ) as never,
      ),
    ).toThrow("readable plain records");

    const symbolDefinition = { initial: {} } as Record<PropertyKey, unknown>;
    symbolDefinition[Symbol("definition")] = true;
    expect(() => defineStore(symbolDefinition as never)).toThrow("symbol keys");
    expect(() => defineStore({ initial: {}, extra: true } as never)).toThrow("Unknown");
    expect(() => defineStore({} as never)).toThrow("initial value");
    expect(() => defineStore({ initial: {}, setup: true } as never)).toThrow("setup");
    expect(() =>
      defineStore(
        new Proxy(
          {},
          {
            ownKeys: () => ["initial"],
            getOwnPropertyDescriptor: () => undefined,
          },
        ) as never,
      ),
    ).toThrow("stable");
    expect(() =>
      defineStore(
        new Proxy(
          {},
          {
            ownKeys: () => ["initial"],
            getOwnPropertyDescriptor() {
              throw new Error("unreadable descriptor");
            },
          },
        ) as never,
      ),
    ).toThrow("fields must be readable");
    expect(() => facade.define("raw", { initial: {} } as never)).toThrow("defineStore");

    const invalidValues: unknown[] = [Symbol("value"), 1n, Number.NaN, new Date(), []];
    for (const [index, value] of invalidValues.entries()) {
      const definition = defineStore({ initial: index === 4 ? (value as never) : { value } });
      expect(() => facade.define(`invalid${index}`, definition as never)).toThrow();
    }

    const symbolData = {} as Record<PropertyKey, unknown>;
    symbolData[Symbol("data")] = true;
    expect(() => facade.define("symbolData", defineStore({ initial: symbolData }))).toThrow(
      "symbol keys",
    );
    expect(() =>
      facade.define(
        "magicData",
        defineStore({ initial: Object.assign(Object.create(null), { constructor: true }) }),
      ),
    ).toThrow("magic key");
    const namedArray: unknown[] & { extra?: number } = [];
    namedArray.extra = 1;
    expect(() =>
      facade.define("namedArray", defineStore({ initial: { value: namedArray } })),
    ).toThrow("named properties");

    const deep: Record<string, unknown> = {};
    let cursor = deep;
    for (let depth = 0; depth < 66; depth += 1) {
      cursor.next = {};
      cursor = cursor.next as Record<string, unknown>;
    }
    expect(() => facade.define("deep", defineStore({ initial: deep }))).toThrow("maximum depth");
    expect(() =>
      facade.define(
        "wide",
        defineStore({ initial: { values: Array.from({ length: 10_001 }, () => ({})) } }),
      ),
    ).toThrow("maximum of 10000");

    const unreadable = new Proxy(
      {},
      {
        getPrototypeOf() {
          throw new Error("unreadable");
        },
      },
    );
    expect(() => facade.define("unreadable", defineStore({ initial: { unreadable } }))).toThrow(
      "unreadable prototype",
    );
    let prototypeReads = 0;
    const hostileThenable = new Proxy(
      {},
      {
        getPrototypeOf() {
          prototypeReads += 1;
          if (prototypeReads > 1) throw new Error("unreadable then");
          return Object.prototype;
        },
      },
    );
    expect(() =>
      facade.define("hostileThenable", defineStore({ initial: { hostileThenable } })),
    ).toThrow("promise");
    expect(() =>
      facade.define("asyncInitial", defineStore({ initial: (() => Promise.resolve({})) as never })),
    ).toThrow("cannot be a promise");
  });

  it("guards namespace and live-store reflection, deletion, and method structure", () => {
    const { facade, kernel: current } = install();
    const method = () => undefined;
    const store = facade.define(
      "guarded",
      defineStore({ initial: { data: { value: 1 }, scalar: 1 as unknown, method } }),
    );

    expect("guarded" in facade.stores).toBe(true);
    expect(Symbol.iterator in facade.stores).toBe(false);
    expect(Object.keys(facade.stores)).toEqual(["guarded"]);
    expect(Object.getOwnPropertyDescriptor(facade.stores, Symbol.iterator)).toBeUndefined();
    expect(Object.getOwnPropertyDescriptor(facade.stores, "missing")).toBeUndefined();
    expect(() => Reflect.deleteProperty(facade.stores, "guarded")).toThrow("read-only");
    expect(() => Object.defineProperty(facade.stores, "other", { value: {} })).toThrow("read-only");
    expect(() => Object.setPrototypeOf(facade.stores, null)).toThrow("prototype is fixed");
    expect(() => Object.getPrototypeOf(facade.stores)).toThrow("prototype is fixed");

    expect(() => Reflect.set(store, Symbol("value"), 1)).toThrow("cannot write");
    expect(() => Reflect.set(store, "constructor", 1)).toThrow("cannot write");
    expect(() => Reflect.set(store, "method", method)).toThrow("methods cannot be");
    const shared = { value: 2 };
    store.scalar = { left: shared, right: shared };
    expect(() => {
      store.scalar = { nested: { method } };
    }).toThrow("methods cannot be");
    expect(() => Reflect.deleteProperty(store, Symbol("value"))).toThrow("cannot delete");
    expect(() => Reflect.deleteProperty(store, "constructor")).toThrow("cannot delete");
    expect(() => Reflect.deleteProperty(store, "method")).toThrow("methods cannot be");
    expect(Reflect.deleteProperty(store, "data")).toBe(true);
    expect(() => Object.defineProperty(store, "data", { value: {} })).toThrow(
      "property descriptors",
    );

    current.dispose();
    expect(() => Reflect.deleteProperty(store, "scalar")).toThrow("disposed");
    expect(() => Object.keys(store)).toThrow("disposed");
    expect(() => Object.getOwnPropertyDescriptor(store, "scalar")).toThrow("disposed");
    expect(() => "guarded" in facade.stores).toThrow("disposed");
  });

  it("batches selector subscriptions and commits only accepted synchronous transactions", async () => {
    const { facade } = install();
    const method = function (this: { count: number }) {
      this.count += 1;
    };
    const store = facade.define(
      "counter",
      defineStore({ initial: { count: 0, nested: { label: "a" }, increment: method } }),
    );
    const listener = vi.fn();
    const release = facade.subscribe("counter", (value: typeof store) => value.count, listener, {
      immediate: true,
    });

    facade.transaction<typeof store>("counter", (draft) => {
      draft.count = 1;
      draft.nested.label = "b";
      draft.count = 2;
    });
    await nextUpdate();

    expect(listener).toHaveBeenCalledTimes(2);
    expect(listener.mock.calls[0]![0]).toMatchObject({ current: 0, previous: 0 });
    expect(listener.mock.calls[1]![0]).toMatchObject({ current: 2, previous: 0 });
    expect(store.nested.label).toBe("b");
    expect(store.increment).toBe(method);

    expect(() =>
      facade.transaction<typeof store>("counter", (draft) => {
        draft.count = 9;
        throw new Error("stop");
      }),
    ).toThrow("stop");
    expect(store.count).toBe(2);
    expect(() => facade.transaction("counter", (() => Promise.resolve()) as never)).toThrow(
      "synchronous",
    );
    expect(store.count).toBe(2);
    expect(() =>
      facade.transaction<typeof store>("counter", (draft) => {
        draft.increment = (() => undefined) as never;
      }),
    ).toThrow("cannot add, remove, or replace methods");
    expect(() => {
      store.nested = { label: "c", added: () => undefined } as never;
    }).toThrow("cannot add, remove, or replace methods");

    release();
    release();
    store.count = 3;
    await nextUpdate();
    expect(listener).toHaveBeenCalledTimes(2);
  });

  it("contains subscription validation, selector, equality, and listener failures", async () => {
    const { facade, kernel: current } = install();
    const observations: Array<{ kind: string; phase: string }> = [];
    current.observeOperations(
      (value) => {
        observations.push(value);
      },
      { kinds: ["store"] },
    );
    const store = facade.define("subscribed", defineStore({ initial: { count: 0 } }));

    expect(() =>
      facade.subscribe(
        "missing",
        () => 0,
        () => undefined,
      ),
    ).toThrow("not defined");
    expect(() => facade.subscribe("subscribed", 1 as never, () => undefined)).toThrow(
      "selector and listener",
    );
    expect(() =>
      facade.subscribe(
        "subscribed",
        () => 0,
        () => undefined,
        1 as never,
      ),
    ).toThrow("options");
    expect(() =>
      facade.subscribe(
        "subscribed",
        () => 0,
        () => undefined,
        { equality: 1 as never },
      ),
    ).toThrow("equality");

    const releases = [
      facade.subscribe(
        "subscribed",
        (value: typeof store) => value.count,
        () => {
          throw new Error("immediate listener");
        },
        { immediate: true },
      ),
      facade.subscribe(
        "subscribed",
        (value: typeof store) => value.count,
        () => Promise.resolve() as never,
        {
          immediate: true,
        },
      ),
      facade.subscribe(
        "subscribed",
        (value: typeof store) => value.count,
        () => {
          throw new Error("deferred listener");
        },
      ),
      facade.subscribe(
        "subscribed",
        (value: typeof store) => value.count,
        () => Promise.resolve() as never,
      ),
      facade.subscribe(
        "subscribed",
        (value: typeof store) => value.count,
        () => undefined,
        {
          equality: () => {
            throw new Error("equality");
          },
        },
      ),
      facade.subscribe(
        "subscribed",
        (value: typeof store) => {
          if (value.count > 0) throw new Error("selector");
          return value.count;
        },
        () => undefined,
      ),
    ];
    store.count = 1;
    await nextUpdate();
    for (const release of releases) release();
    expect(
      observations.filter(({ kind, phase }) => kind === "store" && phase === "failed").length,
    ).toBeGreaterThanOrEqual(6);
  });

  it("validates setup capabilities and aggregates rollback and disposal failures", async () => {
    const { facade, kernel: current } = install();
    expect(() =>
      facade.define(
        "badCleanup",
        defineStore({ initial: {}, setup: (context) => context.cleanup(1 as never) }),
      ),
    ).toThrow("cleanup must be a function");
    expect(() =>
      facade.define(
        "badEffect",
        defineStore({ initial: {}, setup: (context) => context.effect(1 as never) }),
      ),
    ).toThrow("effect must be a function");
    expect(() =>
      facade.define(
        "badTask",
        defineStore({ initial: {}, setup: (context) => context.task(1 as never) }),
      ),
    ).toThrow("task must be a function");
    expect(() =>
      facade.define(
        "badTaskResult",
        defineStore({ initial: {}, setup: (context) => context.task((() => 1) as never) }),
      ),
    ).toThrow("return a promise");
    expect(() =>
      facade.define("badSetupReturn", defineStore({ initial: {}, setup: (() => 1) as never })),
    ).toThrow("invalid cleanup");
    expect(() =>
      facade.define(
        "rollbackFailure",
        defineStore({
          initial: {},
          setup(context) {
            context.cleanup(() => {
              throw new Error("cleanup failed");
            });
            throw new Error("setup failed");
          },
        }),
      ),
    ).toThrow("setup rollback failed");

    const active = facade.define(
      "ownedFailures",
      defineStore({
        initial: { count: 0 },
        setup(context) {
          context.effect(() => {
            if (context.store.count > 0) throw new Error("effect failed");
          });
          context.subscribe(
            (store) => {
              if (store.count > 0) throw new Error("selector failed");
              return store.count;
            },
            () => undefined,
          );
          context.task(() => Promise.resolve());
          context.task(() => Promise.reject(new Error("task failed")));
          context.cleanup(() => {
            throw new Error("context cleanup failed");
          });
          return () => {
            throw new Error("returned cleanup failed");
          };
        },
      }),
    );
    active.count = 1;
    await nextUpdate();
    await Promise.resolve();
    expect(() => current.dispose()).toThrow("disposal failed");
  });

  it("rejects missing stores and invalid transaction updaters", () => {
    const { facade } = install();
    expect(facade.get("missing")).toBeUndefined();
    expect(facade.has("missing")).toBe(false);
    expect(() => facade.transaction("missing", () => undefined)).toThrow("not defined");
    facade.define("present", defineStore({ initial: { count: 0 } }));
    expect(() => facade.transaction("present", 1 as never)).toThrow("updater");
  });

  it("rolls setup back and terminates owned work and retained values at disposal", () => {
    const { facade, kernel: current } = install();
    const observations: unknown[] = [];
    current.observeOperations(
      (observation) => {
        observations.push(observation);
      },
      {
        kinds: ["store"],
      },
    );
    const calls: string[] = [];
    const failed = defineStore({
      initial: { count: 0 },
      setup(context) {
        context.cleanup(() => calls.push("first"));
        context.cleanup(() => calls.push("second"));
        throw new Error("setup failed");
      },
    });

    expect(() => facade.define("failed", failed)).toThrow("setup failed");
    expect(calls).toEqual(["second", "first"]);
    expect(facade.has("failed")).toBe(false);

    const cleanup = vi.fn();
    const active = facade.define(
      "active",
      defineStore({
        initial: { count: 1 },
        setup(context) {
          context.effect(() => void context.store.count);
          context.subscribe(
            (store) => store.count,
            () => undefined,
          );
          context.task(
            (signal) =>
              new Promise<void>((resolve) => signal.addEventListener("abort", () => resolve())),
          );
          return cleanup;
        },
      }),
    );
    active.count = 2;
    const report = current.dispose();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(report.released).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ category: "service", owner: "store-2:lifetime" }),
      ]),
    );
    expect(() => active.count).toThrow("disposed");
    expect(() => facade.names()).toThrow("disposed");
    const storeObservations = observations as Array<{
      kind: string;
      owner: { mode: string };
      store: { category: string };
    }>;
    expect(new Set(storeObservations.map(({ store }) => store.category))).toEqual(
      new Set(["cleanup", "definition", "effect", "setup", "subscription", "task", "change"]),
    );
    expect(
      storeObservations.every(({ kind, owner }) => kind === "store" && owner.mode === "kernel"),
    ).toBe(true);
    expect(JSON.stringify(storeObservations)).not.toContain('"count"');
  });

  it("keeps stores fixed and local $store signals separate in the CSP engine", async () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    frames.push(frame);
    const cspKernel = new Kernel(
      (() => undefined) as unknown as JQueryStatic,
      frame.contentDocument!,
      createCSPExpressionEngine(),
    );
    kernels.push(cspKernel);
    const facade = cspKernel.plugins.use(storesPlugin);
    const local = { store: 4 };
    const context = {
      $: (() => undefined) as unknown as JQueryStatic,
      state: local,
      computed: {},
      stores: facade.stores,
      root: cspKernel.documentHost.document.body,
      $root: {} as JQuery<Element>,
      instance: {} as never,
    };
    const readShared = cspKernel.expressions.compileValue("stores.session && stores.session.count");
    const increment = cspKernel.expressions.compileStatement("stores.session.count++");
    const replace = cspKernel.expressions.compileStatement("stores.session = {}");
    const readLocal = cspKernel.expressions.compileValue("$store");
    const reads: unknown[] = [];
    const { effect, stop } = await import("../src/reactivity");
    const runner = effect(() => reads.push(readShared(context)));

    const shared = facade.define("session", defineStore({ initial: { count: 1 } }));
    await nextUpdate();
    increment(context);
    await nextUpdate();

    expect(reads).toEqual([undefined, 1, 2]);
    expect(shared.count).toBe(2);
    expect(readLocal(context)).toBe(4);
    expect(() => replace(context)).toThrow();
    stop(runner);
  });

  it.each([
    ["trusted", undefined],
    ["CSP", createCSPExpressionEngine],
  ] as const)(
    "shares a late-defined store across behavior and declarative roots in the %s engine",
    async (_label, createEngine) => {
      const frame = document.createElement("iframe");
      document.body.append(frame);
      frames.push(frame);
      const owner = frame.contentDocument!;
      const installed = installStarCore($, {
        document: owner,
        ...(createEngine ? { expressionEngine: createEngine() } : {}),
      });
      const facade = installed.star.use(storesPlugin);
      owner.body.innerHTML = `
        <section id="behavior"><output class="shared"></output><output class="local"></output></section>
        <section id="declarative" data-signals="{ store: 'declarative' }">
          <button data-on:click="stores.session.count++">increment shared</button>
          <output class="shared" data-text="stores.session && stores.session.count"></output>
          <output class="local" data-text="$store"></output>
        </section>
      `;
      const behavior = owner.querySelector<HTMLElement>("#behavior")!;
      const declarative = owner.querySelector<HTMLElement>("#declarative")!;
      installed(behavior).star({
        state: { store: "behavior" },
        ui: {
          ".shared": {
            text: ({ stores }) => (stores?.session?.count as number | undefined) ?? "missing",
          },
          ".local": { text: ({ state }) => state.store },
        },
      });
      installed(declarative).star();

      expect(behavior.querySelector(".shared")?.textContent).toBe("missing");
      expect(behavior.querySelector(".local")?.textContent).toBe("behavior");
      expect(declarative.querySelector(".local")?.textContent).toBe("declarative");

      const session = facade.define("session", defineStore({ initial: { count: 1 } }));
      await installed.star.nextUpdate();
      expect([...owner.querySelectorAll(".shared")].map(({ textContent }) => textContent)).toEqual([
        "1",
        "1",
      ]);

      installed(declarative.querySelector("button")!).trigger("click");
      await installed.star.nextUpdate();
      expect(session.count).toBe(2);
      expect([...owner.querySelectorAll(".shared")].map(({ textContent }) => textContent)).toEqual([
        "2",
        "2",
      ]);

      installed(behavior).star("destroy");
      session.count = 7;
      await installed.star.nextUpdate();
      expect(behavior.querySelector(".shared")?.textContent).toBe("2");
      expect(declarative.querySelector(".shared")?.textContent).toBe("7");
      expect(facade.get("session")).toBe(session);
      installed.star.dispose();
    },
  );
});

import $ from "jquery";
import { afterEach, describe, expect, it } from "vitest";
import { installStarCore, STAR_PLUGIN_API_VERSION, type StarPlugin } from "../src/core";
import {
  assertStarDisposal,
  createResponseController,
  createStarHarness,
  runCoreConformance,
  runPluginConformance,
  StarConformanceError,
  type StarDOMWindow,
  type StarHarness,
  type StarResponseController,
} from "../src/testing";

const frames: HTMLIFrameElement[] = [];
const harnesses: StarHarness[] = [];

function thrownValue(value: unknown): never {
  const iterator = (function* () {
    yield undefined;
  })();
  iterator.next();
  return iterator.throw(value) as never;
}

async function rejectedValue(value: unknown): Promise<never> {
  const iterator = (async function* () {
    yield undefined;
  })();
  await iterator.next();
  return iterator.throw(value) as never;
}

function realm(): StarDOMWindow {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  return frame.contentWindow as StarDOMWindow;
}

function harness(responses = createResponseController()): StarHarness {
  const owner = realm();
  const created = createStarHarness({ window: owner, jQuery: $, responses });
  harnesses.push(created);
  return created;
}

afterEach(() => {
  for (const active of harnesses.splice(0).reverse()) {
    try {
      active.dispose();
    } catch {
      // Assertions exercise failed cleanup separately.
    }
  }
  for (const frame of frames.splice(0).reverse()) frame.remove();
});

describe("public testing harness", () => {
  it("mounts both application modes, captures operations, settles requests, and disposes", async () => {
    const responses = createResponseController();
    responses.json({ url: "https://example.test/state" }, { loaded: true });
    const active = harness(responses);
    const behaviorRoot = active.document.createElement("section");
    behaviorRoot.innerHTML = '<button type="button">Load</button><output></output>';
    active.document.body.append(behaviorRoot);
    const behavior = active.mountBehavior(behaviorRoot, {
      state: { loaded: false },
      actions: { load: active.installed.star.get("https://example.test/state") },
      ui: {
        button: { on: { click: "load" } },
        output: { text: ({ state }) => String(state.loaded) },
      },
    });
    active.triggerNative(behaviorRoot.querySelector("button")!, "click");
    const result = await active.flush();
    expect(result.rounds).toBeGreaterThanOrEqual(2);
    expect(active.state(behavior)).toEqual({ loaded: true });
    expect(active.observations().map(({ phase }) => phase)).toEqual(
      expect.arrayContaining(["started", "completed"]),
    );
    expect(responses.requests()).toHaveLength(1);

    const declarativeRoot = active.document.createElement("section");
    declarativeRoot.setAttribute("data-signals", "{ count: 0 }");
    declarativeRoot.innerHTML = '<button data-on:click="$count += 1"></button>';
    active.document.body.append(declarativeRoot);
    const declarative = active.mountDeclarative<{ count: number }>(declarativeRoot);
    active.triggerJQuery(declarativeRoot.querySelector("button")!, "click");
    await active.flush();
    expect(declarative.state.count).toBe(1);
    active.destroy(declarative);
    expect(declarative.destroyed).toBe(true);

    const report = active.dispose();
    expect(report.failed).toEqual([]);
    expect(report.remaining).toEqual([]);
    expect(active.dispose()).toBe(report);
  });

  it("includes only owned outstanding work in bounded flush diagnostics", async () => {
    const responses = createResponseController();
    responses.enqueue({
      url: "https://example.test/wait",
      response: { kind: "abort" },
    });
    const active = harness(responses);
    const root = active.document.createElement("section");
    active.document.body.append(root);
    const application = active.mountBehavior(root, {
      state: {},
      actions: { wait: active.installed.star.get("https://example.test/wait") },
    });
    void application.instance.run("wait").catch(() => undefined);
    let failure: unknown;
    try {
      await active.flush({ timeoutMs: 10, maxRounds: 3 });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      name: "StarFlushError",
      diagnostic: expect.objectContaining({
        schema: "jquery-star-flush-diagnostic/1",
        outstanding: expect.arrayContaining([
          expect.objectContaining({ category: "operation" }),
          expect.objectContaining({ category: "request" }),
        ]),
      }),
    });
    expect(() => JSON.stringify((failure as { diagnostic: unknown }).diagnostic)).not.toThrow();
  });

  it("settles transitively registered tasks and emits JSON-safe round-limit diagnostics", async () => {
    const active = harness();
    const order: string[] = [];
    active.task(
      "fixture:outer",
      Promise.resolve().then(() => {
        order.push("outer");
        active.task(
          "fixture:inner",
          Promise.resolve().then(() => {
            order.push("inner");
          }),
        );
      }),
    );
    await active.flush();
    expect(order).toEqual(["outer", "inner"]);

    expect(active.dispose().remaining).toEqual([]);
  });

  it("restores fetch exactly when harness setup fails", () => {
    const owner = realm();
    const globalDescriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const windowDescriptor = Object.getOwnPropertyDescriptor(owner, "fetch");
    const failingPlugin: StarPlugin = {
      name: "acme.setup-failure",
      version: "1.0.0",
      apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
      install() {
        throw new Error("fixture setup failed");
      },
    };

    expect(() =>
      createStarHarness({
        window: owner,
        jQuery: $,
        plugins: [failingPlugin],
        responses: createResponseController({ window: owner }),
      }),
    ).toThrow("fixture setup failed");
    expect(Object.getOwnPropertyDescriptor(globalThis, "fetch")).toEqual(globalDescriptor);
    expect(Object.getOwnPropertyDescriptor(owner, "fetch")).toEqual(windowDescriptor);
  });

  it("rejects roots from another realm before mounting", () => {
    const active = harness();
    const foreign = realm().document.createElement("section");
    expect(() => active.mountDeclarative(foreign)).toThrow("must belong");
  });
});

describe("runner-neutral conformance", () => {
  it("runs the same core cases without runner imports in production code", async () => {
    const report = await runCoreConformance(() => harness());
    expect(report.passed).toBe(3);
    expect(report.cases.every(({ status }) => status === "pass")).toBe(true);
  });

  it("proves plugin installation, use, rollback, and cleanup", async () => {
    let cleanups = 0;
    const plugin: StarPlugin<{ readonly label: "fixture" }> = {
      name: "acme.conformance",
      version: "1.0.0",
      apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
      install(registrar) {
        registrar.action("acme.conformance.mark", ({ state }) => {
          state.marked = true;
        });
        registrar.cleanup(() => {
          cleanups += 1;
        });
        return Object.freeze({ label: "fixture" as const });
      },
    };
    const failing: StarPlugin = {
      name: "acme.failure",
      version: "1.0.0",
      apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
      install(registrar) {
        registrar.cleanup(() => undefined);
        throw new Error("fixture install failed");
      },
    };
    const report = await runPluginConformance({
      createHarness: () => harness(),
      plugin,
      failingPlugin: failing,
      async exercise(active, facade) {
        expect(facade).toMatchObject({ label: "fixture" });
        const root = active.document.createElement("section");
        active.document.body.append(root);
        const application = active.mountBehavior(root, { state: { marked: false } });
        await application.instance.run("acme.conformance.mark");
        expect(application.state.marked).toBe(true);
      },
    });
    expect(report.passed).toBe(2);
    expect(cleanups).toBe(2);
  });

  it("returns bounded typed diagnostics when conformance cases fail", async () => {
    let thrownValueFailure: unknown;
    try {
      await runCoreConformance(() => rejectedValue("fixture rejection"));
    } catch (error) {
      thrownValueFailure = error;
    }
    expect(thrownValueFailure).toBeInstanceOf(StarConformanceError);
    expect((thrownValueFailure as StarConformanceError).failures).toHaveLength(3);
    expect((thrownValueFailure as StarConformanceError).failures[0]).toMatchObject({
      error: { name: "ThrownValue", message: "fixture rejection" },
    });
    expect(() =>
      JSON.stringify((thrownValueFailure as StarConformanceError).failures),
    ).not.toThrow();

    await expect(
      runPluginConformance({
        createHarness: () => harness(),
        plugin: {
          name: "acme.exercise-failure",
          version: "1.0.0",
          apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
          install: () => Object.freeze({}),
        },
        exercise() {
          throw new Error("exercise failed");
        },
      }),
    ).rejects.toMatchObject({
      name: "StarConformanceError",
      failures: [{ error: { name: "Error", message: "exercise failed" } }],
    });

    const terminal = Object.freeze({
      schema: "jquery-star-disposal/1" as const,
      attempted: Object.freeze(
        ["plugin", "service", "subscription"].map((category) =>
          Object.freeze({ category, owner: `fixture:${category}` }),
        ),
      ),
      released: Object.freeze([]),
      failed: Object.freeze([]),
      remaining: Object.freeze([]),
    });
    let factoryCalls = 0;
    await expect(
      runPluginConformance({
        createHarness() {
          factoryCalls += 1;
          const facade = Object.freeze({});
          return {
            install: () => facade,
            flush: async () =>
              Object.freeze({ schema: "jquery-star-flush/1", elapsedMs: 0, rounds: 1 }),
            dispose() {
              if (factoryCalls === 2) {
                throw new AggregateError([new Error("generic disposal failure")]);
              }
              return terminal;
            },
          } as unknown as StarHarness;
        },
        plugin: {
          name: "acme.generic-disposal",
          version: "1.0.0",
          apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
          install: () => Object.freeze({}),
        },
        cleanupFailingPlugin: {
          name: "acme.missing-report",
          version: "1.0.0",
          apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
          install: () => Object.freeze({}),
        },
      }),
    ).rejects.toBeInstanceOf(StarConformanceError);
  });

  it("rejects incomplete or unstable disposal reports", () => {
    const complete = Object.freeze({
      schema: "jquery-star-disposal/1" as const,
      attempted: Object.freeze(
        [
          "application",
          "effect",
          "hook",
          "listener",
          "observer",
          "plugin",
          "request",
          "service",
          "subscription",
          "task",
        ].map((category) => Object.freeze({ category, owner: `fixture:${category}` })),
      ),
      released: Object.freeze([]),
      failed: Object.freeze([]),
      remaining: Object.freeze([]),
    });
    expect(() =>
      assertStarDisposal(complete as Parameters<typeof assertStarDisposal>[0]),
    ).not.toThrow();
    expect(() => assertStarDisposal({ ...complete, schema: "other" } as never)).toThrow("schema");
    expect(() => assertStarDisposal({ ...complete } as never)).toThrow("frozen");
    expect(() => assertStarDisposal(Object.freeze({ ...complete, failed: [{}] }) as never)).toThrow(
      "failures",
    );
    expect(() =>
      assertStarDisposal(Object.freeze({ ...complete, remaining: [{}] }) as never),
    ).toThrow("remaining");
    expect(() => assertStarDisposal(complete as never, ["plugin", "task"])).not.toThrow();
    expect(() =>
      assertStarDisposal(Object.freeze({ ...complete, attempted: [] }) as never, ["plugin"]),
    ).toThrow("plugin");
    expect(() =>
      assertStarDisposal(
        Object.freeze({ ...complete, attempted: [{ category: "plugin", owner: " " }] }) as never,
        ["plugin"],
      ),
    ).toThrow("stable owner");
  });
});

describe("harness failure boundaries", () => {
  it("validates input, event, task, and flush arguments", async () => {
    expect(() => createStarHarness(null as never)).toThrow("options");
    const active = harness();
    expect(() => active.triggerNative(null as never, "click")).toThrow("dispatchEvent");
    expect(() => active.task("", Promise.resolve())).toThrow("non-empty");
    await expect(active.flush({ maxRounds: 0 })).rejects.toThrow("maxRounds");
    await expect(active.flush({ timeoutMs: Number.NaN })).rejects.toThrow("timeoutMs");

    active.task("fixture:rejection", rejectedValue("task failed"));
    await expect(active.flush()).rejects.toMatchObject({
      name: "AggregateError",
      errors: ["task failed"],
    });
  });

  it("reports pending harness tasks and remains disposable after a bound breach", async () => {
    const active = harness();
    active.task("fixture:pending", new Promise(() => undefined));
    let failure: unknown;
    try {
      await active.flush({ timeoutMs: 5, maxRounds: 2 });
    } catch (error) {
      failure = error;
    }
    expect(failure).toMatchObject({
      name: "StarFlushError",
      diagnostic: {
        outstanding: [expect.objectContaining({ category: "task", owner: "fixture:pending" })],
      },
    });
    expect(active.dispose().remaining).toEqual([]);
  });

  it("distinguishes Error rejection and max-round failures", async () => {
    const owner = realm();
    const responses = {
      install: () => () => undefined,
      outstanding: () => [],
      settle: () => Promise.reject(new Error("fixture settle failed")),
      dispose: () => undefined,
    } as unknown as StarResponseController;
    const rejected = createStarHarness({ window: owner, jQuery: $, responses });
    harnesses.push(rejected);
    await expect(rejected.flush()).rejects.toThrow("fixture settle failed");
    rejected.dispose();

    const active = harness();
    let release!: () => void;
    const root = active.document.createElement("section");
    active.document.body.append(root);
    const application = active.mountBehavior(root, {
      state: {},
      actions: {
        wait: () =>
          new Promise<void>((resolve) => {
            release = resolve;
          }),
      },
    });
    const running = application.instance.run("wait");
    await expect(active.flush({ maxRounds: 1, timeoutMs: 1_000 })).rejects.toMatchObject({
      name: "StarFlushError",
      diagnostic: { rounds: 1 },
    });
    release();
    await running;
  });

  it("uses element state, rejects foreign handles, and destroys unmanaged roots", () => {
    const active = harness();
    const root = active.document.createElement("section");
    active.document.body.append(root);
    const application = active.mountBehavior(root, { state: { ready: true } });
    expect(active.state<{ ready: boolean }>(root).ready).toBe(true);

    const otherRoot = realm().document.createElement("section");
    expect(() => active.state({ root: otherRoot } as never)).toThrow("not owned");

    application.destroy();
    active.installed(root).star({ state: {} });
    active.destroy(root);
    expect(active.installed(root).star("instance")).toBeUndefined();
  });

  it("detects a missing application method and a missing mounted instance", () => {
    const active = harness();
    const descriptor = Object.getOwnPropertyDescriptor(active.installed.fn, "star")!;
    const root = active.document.createElement("section");
    active.document.body.append(root);
    Reflect.deleteProperty(active.installed.fn, "star");
    expect(() => active.mountBehavior(root, { state: {} })).toThrow("method is unavailable");
    Object.defineProperty(active.installed.fn, "star", descriptor);

    const original = descriptor.value as (...arguments_: unknown[]) => unknown;
    Object.defineProperty(active.installed.fn, "star", {
      ...descriptor,
      value(this: JQuery, ...arguments_: unknown[]) {
        if (arguments_[0] === "instance") return undefined;
        return Reflect.apply(original, this, arguments_);
      },
    });
    expect(() => active.mountBehavior(root, { state: {} })).toThrow("did not create");
    Object.defineProperty(active.installed.fn, "star", descriptor);
    active.destroy(root);
  });

  it("aggregates response setup and rollback failures without changing fetch", () => {
    const owner = realm();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    let installs = 0;
    const responses = {
      install() {
        installs += 1;
        if (installs === 2) return thrownValue("response install failed");
        return () => {
          thrownValue("response restore failed");
        };
      },
    } as unknown as StarResponseController;
    expect(() => createStarHarness({ window: owner, jQuery: $, responses })).toThrow(
      "setup and rollback failed",
    );
    expect(Object.getOwnPropertyDescriptor(globalThis, "fetch")).toEqual(descriptor);
  });

  it("attempts subscription, response, and fetch cleanup after individual failures", () => {
    const owner = realm();
    const installed = installStarCore($, { document: owner.document });
    const originalObserve = installed.star.observeOperations;
    (installed.star as { observeOperations: typeof originalObserve }).observeOperations =
      () => () => {
        throw new Error("unsubscribe failed");
      };
    const responses = {
      install: () => () => {
        throw new Error("fetch restore failed");
      },
      outstanding: () => [],
      settle: async () => undefined,
      dispose() {
        throw new Error("response dispose failed");
      },
    } as unknown as StarResponseController;
    const active = createStarHarness({ window: owner, jQuery: $, responses });
    harnesses.push(active);
    (installed.star as { observeOperations: typeof originalObserve }).observeOperations =
      originalObserve;

    let first: unknown;
    try {
      active.dispose();
    } catch (error) {
      first = error;
    }
    expect(first).toMatchObject({
      name: "AggregateError",
      errors: expect.arrayContaining([
        expect.objectContaining({ message: "unsubscribe failed" }),
        expect.objectContaining({ message: "response dispose failed" }),
        expect.objectContaining({ message: "fetch restore failed" }),
      ]),
    });
    expect(() => active.dispose()).toThrow(first as Error);
  });
});

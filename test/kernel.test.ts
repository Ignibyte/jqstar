import { afterEach, describe, expect, it, vi } from "vitest";
import { createStarDisposalReport, StarDisposalError } from "../src/disposal";
import { createTrustedExpressionEngine } from "../src/expression";
import { compareElementDepth, kernelForDocument } from "../src/kernel";
import { effect, reactive, stop } from "../src/reactivity";
import type { StarInstance } from "../src/types";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

const realms: HTMLIFrameElement[] = [];

function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow!;
  owner.document.body.innerHTML = "<main></main>";
  realms.push(frame);
  return owner;
}

function jqueryStub(): JQueryStatic {
  return (() => undefined) as unknown as JQueryStatic;
}

function event(owner: Window, type: string): Event {
  const EventConstructor = (owner as Window & typeof globalThis).Event;
  return new EventConstructor(type);
}

function application(kernel: Kernel, root: Element, destroy: () => void = vi.fn()): StarInstance {
  let destroyed = false;
  const instance = {
    mode: "behavior" as const,
    root,
    $root: {} as JQuery<Element>,
    state: {},
    computed: {},
    get destroyed() {
      return destroyed;
    },
    observeOperations: vi.fn(() => vi.fn()),
    run: async () => undefined,
    refresh: vi.fn(),
    destroy: () => {
      if (destroyed) return;
      destroyed = true;
      destroy();
      kernel.applicationCapabilities.applicationDestroyed(instance);
    },
  } satisfies StarInstance;
  return instance;
}

afterEach(() => {
  for (const current of realms.splice(0)) {
    const kernel = kernelForDocument(current.contentDocument!);
    if (kernel && !kernel.disposed) kernel.dispose();
    current.remove();
  }
});

describe("kernel ownership", () => {
  it("isolates actions, expression caches, and application records by document", () => {
    const first = realm();
    const second = realm();
    const firstKernel = new Kernel(jqueryStub(), first.document);
    const secondKernel = new Kernel(jqueryStub(), second.document);
    const firstAction = vi.fn();
    const secondAction = vi.fn();

    firstKernel.registerAction("example.first", firstAction);
    firstKernel.registerAction("example.alpha", firstAction);
    secondKernel.registerAction("example.second", secondAction);
    const firstCompiled = firstKernel.expressions.compileValue("$count");
    const secondCompiled = secondKernel.expressions.compileValue("$count");
    const firstApplication = application(firstKernel, first.document.querySelector("main")!);
    firstKernel.trackApplication(firstApplication);

    expect(firstKernel.actions.resolve("example.first")).toBe(firstAction);
    expect(firstKernel.actions.names()).toEqual(["example.alpha", "example.first"]);
    expect(firstKernel.actions.resolve("example.second")).toBeUndefined();
    expect(secondKernel.actions.resolve("example.first")).toBeUndefined();
    expect(secondKernel.actions.resolve("example.second")).toBe(secondAction);
    expect(firstCompiled).not.toBe(secondCompiled);
    expect(firstKernel.applicationCount()).toBe(1);
    expect(secondKernel.applicationCount()).toBe(0);
    expect(firstKernel.applicationCapabilities.nextApplicationId()).toBe(1);
    expect(firstKernel.applicationCapabilities.nextApplicationId()).toBe(2);
    expect(() => firstKernel.registerAction("   ", firstAction)).toThrow(
      "A global action needs a name.",
    );

    firstApplication.destroy();
    expect(firstKernel.applicationCount()).toBe(0);

    firstKernel.dispose();
    expect(secondKernel.expressions.compileValue("$count")).toBe(secondCompiled);
  });

  it("refuses to share one stateful expression engine across kernels", () => {
    const first = realm();
    const second = realm();
    const expressions = createTrustedExpressionEngine();
    new Kernel(jqueryStub(), first.document, expressions);

    expect(() => new Kernel(jqueryStub(), second.document, expressions)).toThrow(
      "This expression engine is already claimed by a jQStar kernel.",
    );
    expect(kernelForDocument(second.document)).toBeUndefined();
  });

  it("refuses a second live kernel and releases the document claim on disposal", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);

    expect(kernelForDocument(current.document)).toBe(kernel);
    expect(() => new Kernel(jqueryStub(), current.document)).toThrow(
      "This Document is already claimed by a jQuery Star kernel.",
    );

    kernel.dispose();
    const replacement = new Kernel(jqueryStub(), current.document);
    expect(kernelForDocument(current.document)).toBe(replacement);
    replacement.dispose();
  });

  it("keeps a terminally disposed expression engine claimed", () => {
    const current = realm();
    const expressions = createTrustedExpressionEngine();
    const kernel = new Kernel(jqueryStub(), current.document, expressions);

    kernel.dispose();

    expect(() => new Kernel(jqueryStub(), current.document, expressions)).toThrow(
      "This expression engine is already claimed by a jQStar kernel.",
    );
    expect(kernelForDocument(current.document)).toBeUndefined();

    const replacement = new Kernel(jqueryStub(), current.document, createTrustedExpressionEngine());
    expect(kernelForDocument(current.document)).toBe(replacement);
    replacement.dispose();
  });

  it("requires a document attached to a window", () => {
    const detached = document.implementation.createHTMLDocument("detached");
    expect(detached.defaultView).toBeNull();
    expect(() => new Kernel(jqueryStub(), detached)).toThrow(
      "jQuery Star needs a Document attached to a Window.",
    );
  });

  it("owns document listeners, observers, subscriptions, and service cleanup", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const listener = vi.fn();
    const observer = vi.fn();
    const subscription = vi.fn();
    const service = vi.fn();
    const target = current.document.querySelector("main")!;

    kernel.documentHost.listen(current.document, "example", listener);
    kernel.documentHost.observe(target, observer, { childList: true });
    kernel.subscribe("test:subscription", subscription);
    kernel.own("service", "test:service", service);

    current.document.dispatchEvent(event(current, "example"));
    target.append(current.document.createElement("span"));
    await new Promise<void>((resolve) => current.queueMicrotask(resolve));

    expect(listener).toHaveBeenCalledOnce();
    expect(observer).toHaveBeenCalledOnce();
    expect(kernel.resourceSummary()).toEqual(
      expect.arrayContaining([
        { kind: "listener", owner: "document:example" },
        { kind: "observer", owner: "document:mutation" },
        { kind: "subscription", owner: "test:subscription" },
        { kind: "service", owner: "test:service" },
      ]),
    );

    kernel.dispose();
    current.document.dispatchEvent(event(current, "example"));
    target.append(current.document.createElement("span"));
    await new Promise<void>((resolve) => current.queueMicrotask(resolve));

    expect(listener).toHaveBeenCalledOnce();
    expect(observer).toHaveBeenCalledOnce();
    expect(subscription).toHaveBeenCalledOnce();
    expect(service).toHaveBeenCalledOnce();
    expect(kernel.resourceSummary()).toEqual([]);
  });

  it("releases owned resources exactly once before or after disposal", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const firstCleanup = vi.fn();
    const secondCleanup = vi.fn();
    const releaseFirst = kernel.own("service", "first", firstCleanup);
    const releaseSecond = kernel.own("service", "second", secondCleanup);

    releaseFirst();
    releaseFirst();
    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(kernel.resourceSummary()).toEqual([{ kind: "service", owner: "second" }]);

    kernel.dispose();
    releaseSecond();
    expect(secondCleanup).toHaveBeenCalledOnce();
  });

  it("attempts every disposal callback and reports cleanup failures", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const applicationFailure = new Error("application cleanup failed");
    const first = new Error("first cleanup failed");
    const second = new Error("second cleanup failed");
    const completed = vi.fn();
    kernel.trackApplication(
      application(kernel, current.document.querySelector("main")!, () => {
        throw applicationFailure;
      }),
    );
    kernel.own("service", "completed", completed);
    kernel.own("service", "first", () => {
      throw first;
    });
    kernel.own("service", "second", () => {
      throw second;
    });

    let failure: unknown;
    try {
      kernel.dispose();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(StarDisposalError);
    const disposalFailure = failure as StarDisposalError;
    expect(disposalFailure.message).toBe("jQuery Star kernel disposal failed.");
    expect(disposalFailure.errors).toEqual([applicationFailure, second, first]);
    expect(
      disposalFailure.report.failed.map(({ category, owner }) => ({ category, owner })),
    ).toEqual(
      expect.arrayContaining([
        { category: "application", owner: "application:1" },
        { category: "service", owner: "second" },
        { category: "service", owner: "first" },
      ]),
    );
    expect(disposalFailure.report.remaining).toEqual([]);
    expect(Object.isFrozen(disposalFailure.report)).toBe(true);
    expect(Object.isFrozen(disposalFailure.report.failed)).toBe(true);
    expect(() => JSON.stringify(disposalFailure.report)).not.toThrow();
    expect(completed).toHaveBeenCalledOnce();
    expect(kernel.applicationCount()).toBe(0);
    expect(kernel.resourceSummary()).toEqual([]);
    let repeatedFailure: unknown;
    try {
      kernel.dispose();
    } catch (error) {
      repeatedFailure = error;
    }
    expect(repeatedFailure).toBe(disposalFailure);
    expect((repeatedFailure as StarDisposalError).report).toBe(disposalFailure.report);
  });

  it("bounds hostile disposal failures and snapshots remaining resources", () => {
    const controller = createStarDisposalReport();
    const resource = { category: "service" as const, owner: "hostile" };
    const hostile = new Error();
    Object.defineProperties(hostile, {
      message: {
        configurable: true,
        get: () => {
          throw new Error("message accessor escaped");
        },
      },
      name: {
        configurable: true,
        get: () => {
          throw new Error("name accessor escaped");
        },
      },
    });

    controller.attempt(resource);
    controller.fail(resource, hostile);
    controller.fail(resource, "x".repeat(1_100));
    controller.remain(resource);

    expect(controller.report.failed).toEqual([
      { ...resource, error: { message: "Cleanup failed.", name: "Error" } },
      {
        ...resource,
        error: { message: "x".repeat(1_024), name: "ThrownValue" },
      },
    ]);
    expect(controller.report.remaining).toEqual([resource]);
    expect(Object.isFrozen(controller.report.failed[0]?.error)).toBe(true);
    expect(Object.isFrozen(controller.report.remaining[0])).toBe(true);
    expect(() => JSON.stringify(controller.report)).not.toThrow();
  });

  it("owns plugin application hooks across patch removal and plugin cleanup at disposal", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const order: string[] = [];
    kernel.plugins.use({
      name: "acme.lifecycle",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        registrar.application((instance) => {
          order.push(`setup:${instance.root.id}`);
          return () => order.push(`cleanup:${instance.root.id}`);
        });
        registrar.cleanup(() => order.push("plugin-cleanup"));
        return {};
      },
    });
    const main = current.document.querySelector("main")!;
    main.id = "owned";
    const instance = application(kernel, main, () => order.push("application-destroy"));
    kernel.trackApplication(instance);

    const transaction = kernel.beginRender(main);
    transaction.beforeRemove(main);
    transaction.commit();
    await kernel.whenEnhanced();
    kernel.dispose();

    expect(order).toEqual([
      "setup:owned",
      "application-destroy",
      "cleanup:owned",
      "plugin-cleanup",
    ]);
    expect(kernel.applicationCount()).toBe(0);
  });

  it("rolls back hook setup and releases hook cleanup when application destruction fails", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const setupCleanup = vi.fn();
    kernel.plugins.use({
      name: "acme.hooks",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        registrar.application((instance) => {
          if (instance.root.id === "rejected") throw new Error("hook setup failed");
          if (instance.root.id === "destroyed") instance.destroy();
          return setupCleanup;
        });
        return {};
      },
    });
    const main = current.document.querySelector("main")!;
    main.id = "rejected";
    expect(() => kernel.trackApplication(application(kernel, main))).toThrow("hook setup failed");
    expect(kernel.applicationCount()).toBe(0);

    main.id = "destroyed";
    expect(() => kernel.trackApplication(application(kernel, main))).toThrow(
      "destroyed the application during setup",
    );
    expect(setupCleanup).toHaveBeenCalledOnce();

    main.id = "accepted";
    const destructionFailure = new Error("application destruction failed");
    const accepted = application(kernel, main, () => {
      throw destructionFailure;
    });
    kernel.trackApplication(accepted);
    expect(() => kernel.trackApplication(accepted)).toThrow("already tracked by its kernel");

    let failure: unknown;
    try {
      kernel.dispose();
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(StarDisposalError);
    expect((failure as StarDisposalError).errors).toEqual([destructionFailure]);
    expect(setupCleanup).toHaveBeenCalledTimes(2);
    expect(kernel.applicationCount()).toBe(0);
  });

  it("preserves a single cleanup error after completing disposal", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const failure = new Error("cleanup failed");
    kernel.own("service", "failure", () => {
      throw failure;
    });

    let disposalFailure: unknown;
    try {
      kernel.dispose();
    } catch (error) {
      disposalFailure = error;
    }
    expect(disposalFailure).toBeInstanceOf(StarDisposalError);
    expect((disposalFailure as StarDisposalError).errors).toEqual([failure]);
    expect(kernel.disposed).toBe(true);
  });

  it("returns one report when cleanup recursively requests disposal", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    let recursiveReport;
    const cleanup = vi.fn(() => {
      recursiveReport = kernel.dispose();
    });
    kernel.own("service", "recursive", cleanup);

    const report = kernel.dispose();

    expect(cleanup).toHaveBeenCalledOnce();
    expect(recursiveReport).toBe(report);
    expect(kernel.dispose()).toBe(report);
    expect(report.failed).toEqual([]);
    expect(report.remaining).toEqual([]);
  });

  it("disposes applications and kernel state once, then refuses structural work", () => {
    const current = realm();
    const expressions = createTrustedExpressionEngine();
    const disposeExpressions = vi.spyOn(expressions, "dispose");
    const kernel = new Kernel(jqueryStub(), current.document, expressions);
    const destroyed = vi.fn();
    const cleaned = vi.fn();
    const instance = application(kernel, current.document.querySelector("main")!, destroyed);
    const action = vi.fn();
    kernel.trackApplication(instance);
    kernel.registerAction("example.action", action);
    kernel.own("service", "example.service", cleaned);
    const compiled = kernel.expressions.compileValue("$count");

    kernel.dispose();
    kernel.dispose();

    expect(kernel.disposed).toBe(true);
    expect(destroyed).toHaveBeenCalledOnce();
    expect(cleaned).toHaveBeenCalledOnce();
    expect(disposeExpressions).toHaveBeenCalledOnce();
    expect(kernel.applicationCount()).toBe(0);
    expect(kernel.actions.names()).toEqual([]);
    expect(() => compiled({} as never)).toThrow("This jQStar expression engine has been disposed.");
    expect(() => kernel.expressions.compileValue("$count")).toThrow(
      "This jQStar expression engine has been disposed.",
    );
    expect(() => kernel.registerAction("late", action)).toThrow("cannot register actions");
    expect(() => kernel.trackApplication(instance)).toThrow("cannot boot applications");
    expect(() => kernel.own("service", "late", vi.fn())).toThrow("cannot own resources");
    expect(() => kernel.subscribe("late", vi.fn())).toThrow("cannot own resources");
    expect(() => kernel.beginRender(current.document.querySelector("main")!)).toThrow(
      "This jQuery Star kernel has been disposed and cannot render patches.",
    );
    expect(() => kernel.applicationCapabilities.nextApplicationId()).toThrow(
      "cannot allocate application identities",
    );
    expect(() => kernel.documentHost.listen(current.document, "late", vi.fn())).toThrow(
      "cannot install document listeners",
    );
    expect(() =>
      kernel.documentHost.observe(current.document.body, vi.fn(), { childList: true }),
    ).toThrow("cannot install document observers");
  });

  it("does not carry disposed state into a fresh supported host", () => {
    const first = realm();
    const firstKernel = new Kernel(jqueryStub(), first.document);
    firstKernel.registerAction("example.old", vi.fn());
    firstKernel.subscribe("example.old", vi.fn());
    firstKernel.trackApplication(application(firstKernel, first.document.querySelector("main")!));
    firstKernel.dispose();

    const second = realm();
    const secondKernel = new Kernel(jqueryStub(), second.document);

    expect(secondKernel.actions.resolve("example.old")).toBeUndefined();
    expect(secondKernel.applicationCount()).toBe(0);
    expect(secondKernel.resourceSummary()).toEqual([]);
    expect(secondKernel.disposed).toBe(false);
  });

  it("closes structural plugin installation when the first application identity is allocated", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    kernel.plugins.use({
      name: "acme.before",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install: () => ({}),
    });

    kernel.applicationCapabilities.nextApplicationId();

    expect(() =>
      kernel.plugins.use({
        name: "acme.after",
        version: "1.0.0",
        apiVersion: "^0.1.0",
        install: () => ({}),
      }),
    ).toThrow("closes when the first application starts");
  });

  it("destroys outgoing roots deepest-first before releasing their surviving owner", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const main = current.document.querySelector("main")!;
    main.innerHTML = `<section id="outer"><section id="inner"></section></section>`;
    const outer = main.querySelector("#outer")!;
    const inner = main.querySelector("#inner")!;
    const order: string[] = [];
    const owner = application(kernel, main, () => order.push("owner-destroy"));
    const outerApplication = application(kernel, outer, () => order.push("outer"));
    const innerApplication = application(kernel, inner, () => order.push("inner"));

    kernel.trackApplication(owner, { releaseTree: () => order.push("owner-release") });
    kernel.trackApplication(outerApplication);
    kernel.trackApplication(innerApplication);
    const transaction = kernel.beginRender(main);
    transaction.beforeRemove(outer);
    outer.remove();
    transaction.commit();
    await kernel.whenEnhanced();

    expect(order).toEqual(["inner", "outer", "owner-release"]);
    expect(kernel.applicationCount()).toBe(1);
  });

  it("sorts nested roots deepest-first regardless of registration order", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const main = current.document.querySelector("main")!;
    main.innerHTML = `<section id="outer"><section id="inner"></section></section>`;
    const outer = main.querySelector("#outer")!;
    const inner = main.querySelector("#inner")!;
    const order: string[] = [];
    const innerApplication = application(kernel, inner, () => order.push("inner"));
    const outerApplication = application(kernel, outer, () => order.push("outer"));
    const owner = application(kernel, main, () => order.push("owner"));

    kernel.trackApplication(innerApplication);
    kernel.trackApplication(outerApplication);
    kernel.trackApplication(owner);
    const transaction = kernel.beginRender(main);
    transaction.beforeRemove(main);
    transaction.commit();
    await kernel.whenEnhanced();

    expect(order).toEqual(["inner", "outer", "owner"]);
  });

  it("compares nested element depth in both sort argument orders", () => {
    const current = realm();
    const main = current.document.querySelector("main")!;
    main.innerHTML = `<section id="outer"><section id="inner"></section></section><aside></aside>`;
    const outer = main.querySelector("#outer")!;
    const inner = main.querySelector("#inner")!;
    const unrelated = main.querySelector("aside")!;

    expect(compareElementDepth(inner, outer)).toBe(-1);
    expect(compareElementDepth(outer, inner)).toBe(1);
    expect(compareElementDepth(outer, unrelated)).toBe(0);
  });

  it("owns and idempotently releases application observers", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const target = current.document.querySelector("main")!;
    const owned = kernel.applicationCapabilities.observe(
      "application:test:mutation",
      target,
      vi.fn(),
      { childList: true },
    );

    expect(kernel.resourceSummary()).toContainEqual({
      kind: "observer",
      owner: "application:test:mutation",
    });
    owned.release();
    owned.release();

    expect(kernel.resourceSummary()).not.toContainEqual({
      kind: "observer",
      owner: "application:test:mutation",
    });
  });

  it("owns kernel and application operation subscriptions without orphaning resources", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const instance = application(kernel, current.document.querySelector("main")!);
    kernel.trackApplication(instance);
    const releaseKernel = kernel.observeOperations(vi.fn());
    const releaseApplication = kernel.applicationCapabilities.observeOperations(instance, vi.fn());

    expect(kernel.resourceSummary()).toContainEqual({
      kind: "subscription",
      owner: "operations:kernel",
    });
    expect(kernel.resourceSummary()).toContainEqual({
      kind: "subscription",
      owner: "application-1:operations",
    });

    instance.destroy();
    expect(kernel.resourceSummary()).not.toContainEqual({
      kind: "subscription",
      owner: "application-1:operations",
    });
    expect(kernel.resourceSummary()).toContainEqual({
      kind: "subscription",
      owner: "operations:kernel",
    });

    releaseApplication();
    releaseKernel();
    releaseKernel();
    expect(kernel.resourceSummary()).toEqual([]);
  });

  it("rejects render roots from another document", () => {
    const first = realm();
    const second = realm();
    const kernel = new Kernel(jqueryStub(), first.document);

    expect(() => kernel.beginRender(second.document.querySelector("main")!)).toThrow(
      "A render root must belong to this jQuery Star kernel's Document.",
    );
  });

  it("settles failed render transactions and preserves their exact errors", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const root = current.document.querySelector("main")!;
    const firstFailure = new Error("render failed");
    const secondFailure = new Error("already finished");
    const transaction = kernel.beginRender(root);

    expect(transaction.operationId).toBe(1);
    expect(() => transaction.fail(firstFailure)).toThrow(firstFailure);
    expect(() => transaction.fail(secondFailure)).toThrow(secondFailure);
    await expect(kernel.whenEnhanced()).resolves.toBeUndefined();
  });

  it("keeps the enhancement barrier pending until an idempotent commit settles", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const root = current.document.querySelector("main")!;
    const transaction = kernel.beginRender(root);
    const internals = kernel as unknown as { pendingEnhancements: Set<Promise<void>> };
    let enhanced = false;
    const barrier = kernel.whenEnhanced().then(() => {
      enhanced = true;
    });
    await new Promise<void>((resolve) => current.queueMicrotask(resolve));

    expect(enhanced).toBe(false);
    expect(internals.pendingEnhancements.size).toBe(1);
    const queued = vi.spyOn(globalThis, "queueMicrotask");
    try {
      transaction.commit();
      const firstCommitCalls = queued.mock.calls.length;
      expect(firstCommitCalls).toBe(1);
      transaction.commit();
      expect(queued).toHaveBeenCalledTimes(firstCommitCalls);
    } finally {
      queued.mockRestore();
    }
    await barrier;

    expect(enhanced).toBe(true);
    expect(internals.pendingEnhancements.size).toBe(0);
  });

  it("waits for observer work queued in a later enhancement round", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const root = current.document.querySelector("main")!;
    let rounds = 0;
    const observer = kernel.documentHost.observe(
      root,
      () => {
        rounds += 1;
        if (rounds === 1) {
          current.queueMicrotask(() => root.append(current.document.createElement("i")));
        }
      },
      { childList: true },
    );
    const transaction = kernel.beginRender(root);
    const enhanced = kernel.whenEnhanced();
    await new Promise<void>((resolve) => current.setTimeout(resolve, 0));

    root.append(current.document.createElement("b"));
    transaction.commit();
    await enhanced;

    expect(rounds).toBe(2);
    observer.disconnect();
  });

  it("waits for reactive work scheduled immediately after render commit", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const root = current.document.querySelector("main")!;
    const state = reactive({ value: 0 });
    let observed = 0;
    const runner = effect(() => {
      observed = state.value;
    });
    const transaction = kernel.beginRender(root);
    const enhanced = kernel.whenEnhanced();
    await new Promise<void>((resolve) => current.setTimeout(resolve, 0));

    transaction.commit();
    state.value = 1;
    await enhanced;

    expect(observed).toBe(1);
    stop(runner);
  });

  it("aggregates teardown failures with the render operation identity", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const root = current.document.querySelector("main")!;
    root.innerHTML = `<section id="target"></section><aside id="unrelated"></aside>`;
    const target = root.querySelector("#target")!;
    const unrelated = root.querySelector("#unrelated")!;
    const cleanupFailure = new Error("cleanup failed");
    const patchFailure = new Error("patch failed");
    const targetApplication = application(kernel, target, () => {
      throw cleanupFailure;
    });
    const unrelatedApplication = application(kernel, unrelated);
    kernel.trackApplication(unrelatedApplication);
    kernel.trackApplication(targetApplication);
    const transaction = kernel.beginRender(root);

    transaction.beforeRemove(current.document.createTextNode("not an element"));
    transaction.beforeRemove(target);
    let failure: unknown;
    try {
      transaction.fail(patchFailure);
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).message).toBe("jQuery Star render operation 1 failed.");
    expect((failure as AggregateError).errors).toEqual([cleanupFailure, patchFailure]);
    expect(kernel.applicationCount()).toBe(1);
    await kernel.whenEnhanced();
  });

  it("identifies cleanup failures raised while committing a render", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const root = current.document.querySelector("main")!;
    root.innerHTML = `<i id="first"></i><i id="second"></i>`;
    const firstFailure = new Error("first failed");
    const secondFailure = new Error("second failed");
    kernel.trackApplication(
      application(kernel, root.querySelector("#first")!, () => {
        throw firstFailure;
      }),
    );
    kernel.trackApplication(
      application(kernel, root.querySelector("#second")!, () => {
        throw secondFailure;
      }),
    );
    const transaction = kernel.beginRender(root);
    transaction.beforeRemove(root);

    expect(() => transaction.commit()).toThrow(
      expect.objectContaining({
        message: "jQuery Star render operation 1 failed.",
        errors: [firstFailure, secondFailure],
      }),
    );
    await kernel.whenEnhanced();
  });

  it("reports reactive failures captured while a render barrier settles", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const state = reactive({ fail: false });
    const failure = new Error("enhancement failed");
    const runner = effect(() => {
      if (state.fail) throw failure;
    });
    const transaction = kernel.beginRender(current.document.querySelector("main")!);

    state.fail = true;
    transaction.commit();
    await new Promise<void>((resolve) => current.setTimeout(resolve, 0));
    await expect(kernel.whenEnhanced()).rejects.toThrow(failure);
    await expect(kernel.whenEnhanced()).resolves.toBeUndefined();
    stop(runner);
  });

  it("reports a reactive failure already pending at the enhancement barrier", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const state = reactive({ fail: false });
    const failure = new Error("pending update failed");
    const runner = effect(() => {
      if (state.fail) throw failure;
    });

    state.fail = true;
    await expect(kernel.whenEnhanced()).rejects.toThrow(failure);
    await expect(kernel.whenEnhanced()).resolves.toBeUndefined();
    stop(runner);
  });

  it("aggregates enhancement errors with the documented barrier message", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const first = new Error("first enhancement failed");
    const second = new Error("second enhancement failed");
    const internals = kernel as unknown as { enhancementErrors: unknown[] };
    internals.enhancementErrors.push(first, second);

    await expect(kernel.whenEnhanced()).rejects.toMatchObject({
      message: "jQuery Star enhancement failed.",
      errors: [first, second],
    });
  });

  it("retains both a task failure and a failing error reporter", async () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const taskFailure = new Error("task failed");
    const reportingFailure = new Error("reporting failed");

    kernel.applicationCapabilities.task(
      "application:test:task",
      Promise.reject(taskFailure),
      () => {
        throw reportingFailure;
      },
    );

    await expect(kernel.whenEnhanced()).rejects.toMatchObject({
      message: "jQuery Star enhancement failed.",
      errors: [taskFailure, reportingFailure],
    });
    expect(kernel.resourceSummary()).not.toContainEqual({
      kind: "task",
      owner: "application:test:task",
    });
  });

  it("releases an owned observer if observation setup fails", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const target = current.document.querySelector("main")!;
    const Observer = (current as Window & typeof globalThis).MutationObserver;
    const failure = new Error("observe failed");
    const observe = vi.spyOn(Observer.prototype, "observe").mockImplementation(() => {
      throw failure;
    });
    const disconnect = vi.spyOn(Observer.prototype, "disconnect");

    expect(() =>
      kernel.applicationCapabilities.observe("application:failed", target, vi.fn(), {
        childList: true,
      }),
    ).toThrow(failure);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(kernel.resourceSummary()).not.toContainEqual({
      kind: "observer",
      owner: "application:failed",
    });
    observe.mockRestore();
    disconnect.mockRestore();
  });

  it("names application observer work rejected after disposal", () => {
    const current = realm();
    const kernel = new Kernel(jqueryStub(), current.document);
    const capabilities = kernel.applicationCapabilities;
    kernel.dispose();

    expect(() =>
      capabilities.observe("late", current.document.body, vi.fn(), { childList: true }),
    ).toThrow(
      "This jQuery Star kernel has been disposed and cannot install application observers.",
    );
  });
});

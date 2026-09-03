import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import "../src/index";
import { isStarExpressionCallResult, starExpressionRuntimeFor } from "../src/expression-runtime";
import { kernelForDocument } from "../src/kernel";
import { installStar } from "../src/compatibility";
import type { StarContext } from "../src/types";

async function updated(): Promise<void> {
  await $.star.nextUpdate();
}

const expressionRuntimeAction = vi.fn(() => "global-result");
const expressionRuntimeHelper = vi.fn((value: string) => value.toUpperCase());
$.star.use({
  name: "acme.expressionruntime",
  version: "1.0.0",
  apiVersion: "^0.1.0",
  install(registrar) {
    registrar.action("acme.expressionruntime.run", expressionRuntimeAction);
    registrar.helper("acme.expressionruntime.upper", expressionRuntimeHelper);
    return {};
  },
});

describe("jQuery Star", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  afterEach(() => {
    $("body").children().star("destroy");
    vi.useRealTimers();
  });

  it("reactively binds state and computed values to scoped selectors", async () => {
    document.body.innerHTML = `
      <section id="counter">
        <button class="decrement">-</button>
        <output class="count"></output>
      </section>
    `;

    $("#counter").star({
      state: { count: 0 },
      computed: {
        doubled: ({ state }) => state.count * 2,
      },
      actions: {
        decrement: ({ state }) => state.count--,
      },
      ui: {
        ".count": {
          text: ({ state, computed }) => `${state.count} / ${computed.doubled}`,
        },
        ".decrement": {
          disabled: ({ state }) => state.count === 0,
          on: { click: "decrement" },
        },
      },
    });

    const state = $("#counter").star<{ count: number }>("state")!;
    expect($(".count").text()).toBe("0 / 0");
    expect($(".decrement").prop("disabled")).toBe(true);

    state.count = 3;
    await updated();

    expect($(".count").text()).toBe("3 / 6");
    expect($(".decrement").prop("disabled")).toBe(false);
  });

  it("uses delegated named actions for elements inserted later", async () => {
    document.body.innerHTML = `<section id="app"><output></output></section>`;

    $("#app").star({
      state: { count: 0 },
      actions: {
        increment: ({ state }) => state.count++,
      },
      ui: {
        output: { text: ({ state }) => state.count },
        ".increment": { on: { click: "increment" } },
      },
    });

    $("#app").append('<button class="increment">+</button>');
    $(".increment").trigger("click");
    await updated();

    expect($("output").text()).toBe("1");
  });

  it("binds local actions to the internal expression runtime until destruction", () => {
    document.body.innerHTML = `<section id="app"></section>`;
    let thenReads = 0;
    const raw = Object.defineProperty({}, "then", {
      get: () => {
        thenReads += 1;
        return vi.fn();
      },
    });
    const action = vi.fn((_context: StarContext) => raw);
    $("#app").star({ actions: { save: action } });
    const instance = $("#app").star("instance")!;
    const lookup = { instance } as Pick<StarContext, "instance">;
    const runtime = starExpressionRuntimeFor(lookup)!;

    const result = runtime.invokeAction("save", ["record-1"], lookup as StarContext);

    expect(action).toHaveBeenCalledWith(expect.objectContaining({ args: ["record-1"] }));
    expect(result.value).toBe(raw);
    expect(isStarExpressionCallResult(result)).toBe(true);
    expect(thenReads).toBe(0);
    result.failed(new Error("CSP rejected the raw result"));
    instance.destroy();
    expect(starExpressionRuntimeFor(lookup)).toBeUndefined();
  });

  it("resolves installed actions and helpers through the behavior runtime", () => {
    document.body.innerHTML = `<section id="app"></section>`;
    $("#app").star({});
    const instance = $("#app").star("instance")!;
    const context = { instance } as StarContext;
    const runtime = starExpressionRuntimeFor(context)!;

    const actionResult = runtime.invokeAction("acme.expressionruntime.run", [], context);
    expect(actionResult.value).toBe("global-result");
    actionResult.completed();
    const helperResult = runtime.invokeHelper("acme.expressionruntime.upper", ["ready"]);
    expect(helperResult.value).toBe("READY");
    helperResult.completed();

    instance.destroy();
  });

  it("supports text, visibility, class, attribute, property, and style bindings", async () => {
    document.body.innerHTML = `
      <section id="app">
        <a class="status"></a>
        <div class="markup"></div>
      </section>
    `;

    $("#app").star({
      state: { ready: false },
      ui: {
        ".status": {
          text: ({ state }) => (state.ready ? "Ready" : "Waiting"),
          show: ({ state }) => state.ready,
          class: { ready: ({ state }) => state.ready },
          attr: {
            href: ({ state }) => (state.ready ? "/ready" : null),
            "aria-live": "polite",
          },
          prop: { title: ({ state }) => (state.ready ? "Done" : "Pending") },
          style: { color: ({ state }) => (state.ready ? "green" : "red") },
        },
        ".markup": {
          html: ({ state }) => (state.ready ? "<strong>Complete</strong>" : ""),
        },
      },
    });

    const state = $("#app").star<{ ready: boolean }>("state")!;
    expect($(".status").text()).toBe("Waiting");
    expect($(".status").css("display")).toBe("none");
    expect($(".status").attr("href")).toBeUndefined();

    state.ready = true;
    await updated();

    expect($(".status").text()).toBe("Ready");
    expect($(".status").hasClass("ready")).toBe(true);
    expect($(".status").attr("href")).toBe("/ready");
    expect($(".status").attr("aria-live")).toBe("polite");
    expect($(".status").prop("title")).toBe("Done");
    expect($<HTMLElement>(".status").get(0)?.style.color).toBe("green");
    expect($(".markup strong").text()).toBe("Complete");
  });

  it("provides two-way model binding for text, checkbox, and nested state", async () => {
    document.body.innerHTML = `
      <form id="form">
        <input name="query">
        <input name="enabled" type="checkbox">
        <output></output>
      </form>
    `;

    $("#form").star({
      state: { filters: { query: "initial", enabled: false } },
      ui: {
        '[name="query"]': { model: "filters.query" },
        '[name="enabled"]': { model: "filters.enabled" },
        output: {
          text: ({ state }) => `${state.filters.query}:${state.filters.enabled}`,
        },
      },
    });

    expect($("[name=query]").val()).toBe("initial");

    $("[name=query]").val("changed").trigger("input");
    $("[name=enabled]").prop("checked", true).trigger("change");
    await updated();

    const state = $("#form").star<{
      filters: { query: string; enabled: boolean };
    }>("state")!;
    expect(state.filters).toEqual({ query: "changed", enabled: true });
    expect($("output").text()).toBe("changed:true");
  });

  it("applies prevent, stop, once, debounce, and throttle event options", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<section id="app"><button class="run">Run</button></section>`;
    const action = vi.fn();

    $("#app").star({
      actions: { run: action },
      ui: {
        ".run": {
          on: {
            click: {
              action: "run",
              prevent: true,
              stop: true,
              once: true,
              debounce: 50,
            },
          },
        },
      },
    });

    const first = $.Event("click");
    $(".run").trigger(first);
    $(".run").trigger("click");

    expect(first.isDefaultPrevented()).toBe(true);
    expect(first.isPropagationStopped()).toBe(true);
    expect(action).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(50);
    expect(action).toHaveBeenCalledTimes(1);

    $("#app").star("destroy");

    const throttled = vi.fn();
    $("#app").star({
      actions: { run: throttled },
      ui: {
        ".run": { on: { click: { action: "run", throttle: 100 } } },
      },
    });

    $(".run").trigger("click").trigger("click");
    expect(throttled).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(100);
    $(".run").trigger("click");
    expect(throttled).toHaveBeenCalledTimes(2);
  });

  it("tracks binding dependencies instead of refreshing unrelated rules", async () => {
    document.body.innerHTML = `
      <section id="app"><output class="a"></output><output class="b"></output></section>
    `;
    const renderA = vi.fn(({ state }: { state: { a: number } }) => state.a);
    const renderB = vi.fn(({ state }: { state: { b: number } }) => state.b);

    $("#app").star({
      state: { a: 0, b: 0 },
      ui: {
        ".a": { text: renderA },
        ".b": { text: renderB },
      },
    });

    const state = $("#app").star<{ a: number; b: number }>("state")!;
    state.a = 1;
    await updated();

    expect(renderA).toHaveBeenCalledTimes(2);
    expect(renderB).toHaveBeenCalledTimes(1);
  });

  it("supports global actions and explicit refreshes", () => {
    document.body.innerHTML = `<section id="app"><button>Run</button><output></output></section>`;
    let label = "before";

    $.star.action("test:global", ({ $root }) => {
      $root.attr("data-global-action", "called");
    });

    $("#app").star({
      ui: {
        button: { on: { click: "test:global" } },
        output: { text: () => label },
      },
    });

    $("button").trigger("click");
    expect($("#app").attr("data-global-action")).toBe("called");
    expect($("output").text()).toBe("before");

    label = "after";
    $("#app").star("refresh");
    expect($("output").text()).toBe("after");
  });

  it("tracks installed applications until they are destroyed", () => {
    document.body.innerHTML = `<section id="app" data-signals="{ count: 0 }"></section>`;
    const kernel = kernelForDocument(document)!;
    const before = kernel.applicationCount();

    $("#app").star();
    expect(kernel.applicationCount()).toBe(before + 1);

    $("#app").star("destroy");
    expect(kernel.applicationCount()).toBe(before);
  });

  it("owns persistent UI document behavior in the installed kernel ledger", () => {
    const resources = kernelForDocument(document)!.resourceSummary();
    const services = resources
      .filter(({ kind }) => kind === "service")
      .map(({ owner }) => owner)
      .sort();

    expect(services).toEqual([
      "ui:auto-enhancement",
      "ui:combobox:active-records",
      "ui:hover-card:active-records",
      "ui:menu:active-records",
      "ui:multi-select:active-records",
      "ui:popover:active-records",
      "ui:select:active-records",
      "ui:toast:active-records",
      "ui:tooltip:active-records",
    ]);
    expect(resources.some(({ kind }) => kind === "listener")).toBe(true);
    expect(resources.filter(({ kind }) => kind === "observer")).toHaveLength(2);
  });

  it("records application observers with their exact owner and full subtree scope", async () => {
    document.body.innerHTML = `<section id="app"><div class="nested"></div></section>`;
    const mounted = vi.fn();
    $("#app").star({
      ui: { ".dynamic": { mount: mounted } },
    });
    const resources = kernelForDocument(document)!.resourceSummary();
    const applicationObserver = resources.find(
      ({ kind, owner }) => kind === "observer" && owner.startsWith("application:.jqueryStar"),
    );

    expect(applicationObserver?.owner).toMatch(/^application:\.jqueryStar\d+:mutation$/);
    $(".nested").append('<i class="dynamic"></i>');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mounted).toHaveBeenCalledOnce();
  });

  it("rejects installation without an ambient document", () => {
    const isolated$ = (() => undefined) as unknown as JQueryStatic;
    vi.stubGlobal("document", undefined);

    expect(() => installStar(isolated$)).toThrow("jQuery Star needs an ambient Document.");
    vi.unstubAllGlobals();
  });

  it("models radio groups and multi-select values", async () => {
    document.body.innerHTML = `
      <form id="form">
        <input type="radio" name="size" value="small">
        <input type="radio" name="size" value="large">
        <select name="colors" multiple>
          <option value="red">Red</option>
          <option value="blue">Blue</option>
          <option value="green">Green</option>
        </select>
      </form>
    `;

    $("#form").star({
      state: { size: "large", colors: ["red", "green"] },
      ui: {
        '[name="size"]': { model: "size" },
        '[name="colors"]': { model: "colors" },
      },
    });

    expect($("[name=size][value=large]").prop("checked")).toBe(true);
    expect($("[name=colors]").val()).toEqual(["red", "green"]);

    $("[name=size][value=small]").prop("checked", true).trigger("change");
    $("[name=colors]").val(["blue"]).trigger("change");
    await updated();

    const state = $("#form").star<{ size: string; colors: string[] }>("state")!;
    expect(state.size).toBe("small");
    expect(state.colors).toEqual(["blue"]);
  });

  it("runs each owned mount cleanup and unmount hook exactly once", async () => {
    document.body.innerHTML = `<section id="app"><input class="widget"></section>`;
    const mounted = vi.fn();
    const cleaned = vi.fn();
    const unmounted = vi.fn();

    $("#app").star({
      ui: {
        ".widget": {
          mount: ({ $element }) => {
            const element = $element?.get(0);
            mounted(element);
            return () => cleaned(element);
          },
          unmount: ({ $element }) => unmounted($element?.get(0)),
        },
      },
    });

    expect(mounted).toHaveBeenCalledTimes(1);
    $("#app").append('<input class="widget dynamic">');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(mounted).toHaveBeenCalledTimes(2);
    const original = $(".widget").get(0);
    const dynamic = $(".dynamic").get(0);

    $(".dynamic").remove();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(cleaned).toHaveBeenCalledOnce();
    expect(cleaned).toHaveBeenLastCalledWith(dynamic);
    expect(unmounted).toHaveBeenCalledOnce();
    expect(unmounted).toHaveBeenLastCalledWith(dynamic);

    $("#app").star("destroy");
    expect(cleaned).toHaveBeenCalledTimes(2);
    expect(cleaned).toHaveBeenLastCalledWith(original);
    expect(unmounted).toHaveBeenCalledTimes(2);
    expect(unmounted).toHaveBeenLastCalledWith(original);

    $("#app").star("destroy");
    expect(cleaned).toHaveBeenCalledTimes(2);
    expect(unmounted).toHaveBeenCalledTimes(2);
  });

  it("isolates state per root and stops reacting after destruction", async () => {
    document.body.innerHTML = `
      <section class="counter"><output></output></section>
      <section class="counter"><output></output></section>
    `;

    $(".counter").star({
      state: { count: 0 },
      ui: { output: { text: ({ state }) => state.count } },
    });

    const first = $(".counter").eq(0);
    const second = $(".counter").eq(1);
    const firstState = first.star<{ count: number }>("state")!;
    firstState.count = 4;
    await updated();

    expect(first.find("output").text()).toBe("4");
    expect(second.find("output").text()).toBe("0");

    first.star("destroy");
    firstState.count = 8;
    await updated();
    expect(first.find("output").text()).toBe("4");
  });

  it("rolls back every staged resource when a later mount fails", async () => {
    document.body.innerHTML = `
      <section id="app">
        <button class="action">Run</button>
        <output></output>
        <i class="first"></i>
        <i class="broken"></i>
      </section>
    `;
    const kernel = kernelForDocument(document)!;
    const applicationCount = kernel.applicationCount();
    const resourceCount = kernel.resourceSummary().length;
    const action = vi.fn();
    const firstCleanup = vi.fn();
    const firstUnmount = vi.fn();
    const brokenUnmount = vi.fn();
    const bindingRuns = vi.fn();
    let stagedState: { count: number } | undefined;

    expect(() =>
      $("#app").star({
        state: { count: 0 },
        actions: { run: action },
        ui: {
          output: {
            text: ({ state }) => {
              stagedState = state;
              bindingRuns();
              return state.count;
            },
          },
          ".action": { on: { click: "run" } },
          ".first": { mount: () => firstCleanup, unmount: firstUnmount },
          ".broken": {
            mount: () => {
              throw new Error("mount failed");
            },
            unmount: brokenUnmount,
          },
        },
      }),
    ).toThrow("mount failed");

    $(".action").trigger("click");
    stagedState!.count = 1;
    await $.star.nextUpdate();

    expect(action).not.toHaveBeenCalled();
    expect(bindingRuns).toHaveBeenCalledOnce();
    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(firstUnmount).toHaveBeenCalledOnce();
    expect(brokenUnmount).toHaveBeenCalledOnce();
    expect($("#app").star("instance")).toBeUndefined();
    expect(kernel.applicationCount()).toBe(applicationCount);
    expect(kernel.resourceSummary()).toHaveLength(resourceCount);
  });

  it("marks a failed staged instance destroyed and identifies rollback cleanup failures", () => {
    document.body.innerHTML = `<section id="app"><i class="first"></i><i class="broken"></i></section>`;
    const setupFailure = new Error("setup failed");
    const cleanupFailure = new Error("rollback cleanup failed");
    let stagedInstance: { readonly destroyed: boolean } | undefined;
    let failure: unknown;

    try {
      $("#app").star({
        ui: {
          ".first": {
            mount: ({ instance }) => {
              stagedInstance = instance;
              return () => {
                throw cleanupFailure;
              };
            },
          },
          ".broken": {
            mount: () => {
              throw setupFailure;
            },
          },
        },
      });
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).message).toBe(
      "jQuery Star application setup rollback failed.",
    );
    expect((failure as AggregateError).errors).toEqual([setupFailure, cleanupFailure]);
    expect(stagedInstance!.destroyed).toBe(true);
  });

  it("attempts every mount cleanup exactly once when destruction fails", () => {
    document.body.innerHTML = `
      <section id="app"><i class="first"></i><i class="second"></i></section>
    `;
    const firstFailure = new Error("first cleanup failed");
    const secondFailure = new Error("second cleanup failed");
    const firstCleanup = vi.fn(() => {
      throw firstFailure;
    });
    const secondCleanup = vi.fn(() => {
      throw secondFailure;
    });
    const unmount = vi.fn();

    $("#app").star({
      ui: {
        ".first": { mount: () => firstCleanup, unmount },
        ".second": { mount: () => secondCleanup, unmount },
      },
    });
    const instance = $("#app").star("instance")!;
    let failure: unknown;
    try {
      instance.destroy();
    } catch (error) {
      failure = error;
    }

    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).message).toBe("jQuery Star subtree cleanup failed.");
    expect((failure as AggregateError).errors).toEqual([firstFailure, secondFailure]);
    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(secondCleanup).toHaveBeenCalledOnce();
    expect(unmount).toHaveBeenCalledTimes(2);
    expect(instance.destroyed).toBe(true);
    expect($("#app").star("instance")).toBeUndefined();
    expect(() => instance.destroy()).not.toThrow();
    expect(firstCleanup).toHaveBeenCalledOnce();
    expect(secondCleanup).toHaveBeenCalledOnce();
  });

  it("identifies failures aggregated across application-owned resource groups", () => {
    document.body.innerHTML = `<section id="app"><i></i></section>`;
    const listenerFailure = new Error("listener release failed");
    const mountFailure = new Error("mount release failed");
    $("#app").star({
      ui: {
        i: {
          mount: () => () => {
            throw mountFailure;
          },
        },
      },
    });
    const instance = $("#app").star("instance")!;
    vi.spyOn(instance.$root, "off").mockImplementation(() => {
      throw listenerFailure;
    });

    expect(() => instance.destroy()).toThrow(
      expect.objectContaining({
        message: "jQuery Star application destruction failed.",
        errors: [listenerFailure, mountFailure],
      }),
    );
  });

  it("aggregates explicit refresh failures without skipping later effects", () => {
    document.body.innerHTML = `<section id="app"><i class="first"></i><i class="second"></i></section>`;
    const firstFailure = new Error("first refresh failed");
    const secondFailure = new Error("second refresh failed");
    let fail = false;
    $("#app").star({
      ui: {
        ".first": {
          text: () => {
            if (fail) throw firstFailure;
            return "first";
          },
        },
        ".second": {
          text: () => {
            if (fail) throw secondFailure;
            return "second";
          },
        },
      },
    });
    const instance = $("#app").star("instance")!;
    fail = true;

    expect(() => instance.refresh()).toThrow(
      expect.objectContaining({
        message: "jQuery Star application refresh failed.",
        errors: [firstFailure, secondFailure],
      }),
    );
  });

  it("removes subtree ownership before reporting every subtree cleanup failure", () => {
    document.body.innerHTML = `<section id="app"><i class="widget"></i></section>`;
    const cleanupFailure = new Error("subtree cleanup failed");
    const unmountFailure = new Error("subtree unmount failed");
    const mounted = vi.fn();
    $("#app").star({
      ui: {
        ".widget": {
          mount: () => {
            mounted();
            return () => {
              throw cleanupFailure;
            };
          },
          unmount: () => {
            throw unmountFailure;
          },
        },
      },
    });
    const instance = $("#app").star("instance")!;
    const widget = document.querySelector(".widget")!;
    const internals = instance as unknown as {
      releaseTree(tree: Element): void;
      mounted: Map<Element, unknown>;
    };

    expect(() => internals.releaseTree(widget)).toThrow(
      expect.objectContaining({
        message: "jQuery Star subtree cleanup failed.",
        errors: [cleanupFailure, unmountFailure],
      }),
    );
    expect(internals.mounted.has(widget)).toBe(false);
    expect(() => internals.releaseTree(widget)).not.toThrow();
    expect(mounted).toHaveBeenCalledOnce();
  });

  it("contains an owned binding failure without skipping later bindings", async () => {
    document.body.innerHTML = `
      <section id="app"><output class="bad"></output><output class="good"></output></section>
    `;
    const errors: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, error) => errors.push(error));
    $("#app").star({
      state: { fail: false, count: 0 },
      ui: {
        ".bad": {
          text: ({ state }) => {
            if (state.fail) throw new Error("binding failed");
            return "ready";
          },
        },
        ".good": { text: ({ state }) => state.count },
      },
    });
    const state = $("#app").star<{ fail: boolean; count: number }>("state")!;

    state.fail = true;
    state.count = 2;
    await $.star.nextUpdate();

    expect((errors[0] as Error).message).toBe("binding failed");
    expect($(".good").text()).toBe("2");
  });

  it("cancels application-owned debounce timers during destruction", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<section id="app"><button>Run</button></section>`;
    const action = vi.fn();
    const errors: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, error) => errors.push(error));
    $("#app").star({
      actions: { run: action },
      ui: { button: { on: { click: { action: "run", debounce: 50 } } } },
    });
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as { timers: Set<ReturnType<typeof setTimeout>> };

    $("button").trigger("click");
    expect(vi.getTimerCount()).toBe(1);
    expect(internals.timers.size).toBe(1);
    $("#app").star("destroy");
    expect(vi.getTimerCount()).toBe(0);
    expect(internals.timers.size).toBe(0);
    await vi.advanceTimersByTimeAsync(50);

    expect(action).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });

  it("replaces an application-owned debounce timer when an event repeats", async () => {
    vi.useFakeTimers();
    document.body.innerHTML = `<section id="app"><button>Run</button></section>`;
    const action = vi.fn();
    $("#app").star({
      actions: { run: action },
      ui: { button: { on: { click: { action: "run", debounce: 50 } } } },
    });

    $("button").trigger("click");
    await vi.advanceTimersByTimeAsync(25);
    $("button").trigger("click");
    await vi.advanceTimersByTimeAsync(49);
    expect(action).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);

    expect(action).toHaveBeenCalledOnce();
  });

  it("refreshes inserted bindings and reports inserted mount failures", async () => {
    document.body.innerHTML = `<section id="app"><div class="nested"></div></section>`;
    const mountFailure = new Error("dynamic mount failed");
    const errors: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, error) => errors.push(error));
    $("#app").star({
      ui: {
        ".dynamic": { text: () => "enhanced" },
        ".broken": {
          mount: () => {
            throw mountFailure;
          },
        },
      },
    });

    $(".nested").append('<output class="dynamic"></output><i class="broken"></i>');
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect($(".dynamic").text()).toBe("enhanced");
    expect(errors).toEqual([mountFailure]);
  });

  it("cancels subtree requests and remounts a released element", async () => {
    document.body.innerHTML = `<section id="app"><i class="widget"></i></section>`;
    const mounted = vi.fn();
    let signal: AbortSignal | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal!.addEventListener("abort", () => reject(new Error("request aborted")), {
          once: true,
        });
      });
    });
    $("#app").star({ ui: { ".widget": { mount: mounted } } });
    const instance = $("#app").star("instance")!;
    const widget = document.querySelector(".widget")!;
    const request = instance.run(
      $.star.get("/slow", { openWhenHidden: true, requestCancellation: "cleanup" }),
      {
        element: widget,
        $element: $(widget),
      },
    );

    widget.remove();
    await new Promise<void>((resolve) => setTimeout(resolve, 0));
    expect(signal?.aborted).toBe(true);
    document.querySelector("#app")!.append(widget);
    await new Promise<void>((resolve) => setTimeout(resolve, 0));

    expect(mounted).toHaveBeenCalledTimes(2);
    fetchMock.mockRestore();
    await request;
  });

  it("cancels requests owned by the application root during destruction", async () => {
    document.body.innerHTML = `<section id="app"></section>`;
    let signal: AbortSignal | undefined;
    const fetchMock = vi.spyOn(globalThis, "fetch").mockImplementation((_input, init) => {
      signal = init?.signal as AbortSignal;
      return new Promise<Response>((_resolve, reject) => {
        signal!.addEventListener("abort", () => reject(new Error("request aborted")), {
          once: true,
        });
      });
    });
    $("#app").star({});
    const instance = $("#app").star("instance")!;
    const request = instance.run(
      $.star.get("/slow", { openWhenHidden: true, requestCancellation: "cleanup" }),
    );

    instance.destroy();

    expect(signal?.aborted).toBe(true);
    fetchMock.mockRestore();
    await request;
  });

  it("clears behavior listeners and owned effect records during destruction", async () => {
    document.body.innerHTML = `<section id="app"><button>Run</button><output></output></section>`;
    const action = vi.fn();
    const errors: unknown[] = [];
    $("#app").on("jquery-star:error", (_event, error) => errors.push(error));
    $("#app").star({
      state: { count: 0 },
      actions: { run: action },
      ui: {
        button: { on: { click: "run" } },
        output: { text: ({ state }) => state.count },
      },
    });
    const instance = $("#app").star("instance")!;
    const internals = instance as unknown as { effects: Set<unknown> };
    expect(internals.effects.size).toBe(1);

    instance.destroy();
    $("button").trigger("click");
    await $.star.nextUpdate();

    expect(internals.effects.size).toBe(0);
    expect(action).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
  });
});

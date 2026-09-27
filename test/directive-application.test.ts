import $ from "jquery";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { DeclarativeApplication } from "../src/declarative";
import { patchElements } from "../src/patch";
import { nextUpdate, stop, type ReactiveEffect } from "../src/reactivity";
import type { StarDirective, StarDirectiveContext } from "../src/directive";
import type { StarPlugin, StarPluginRegistrar } from "../src/plugin";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

describe("built-in binding registration after initial teardown", () => {
  let api: ReturnType<typeof installStarCore>["star"];
  let retained: StarDirectiveContext | undefined;
  let evaluations: number;
  let removeTestListener: (() => void) | undefined;

  function current(): StarDirectiveContext {
    if (!retained) throw new Error("The capture directive did not mount.");
    return retained;
  }

  function effects(): Set<ReactiveEffect> {
    return (current().application as unknown as { ownedEffects: Set<ReactiveEffect> }).ownedEffects;
  }

  function bootBinding(attribute: string, destroyInitially: boolean): HTMLInputElement {
    api.use({
      name: "proof.binding",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        registrar.directive({
          id: "proof.binding.capture",
          match: { name: "data-proof.binding:capture" },
          mount(context) {
            retained = context;
          },
        });
        registrar.helper("proof.binding.value", (value: unknown) => {
          evaluations++;
          if (destroyInitially) current().application.destroy();
          return value;
        });
        return {};
      },
    });
    document.body.innerHTML = `
      <section id="binding" data-signals="{ count: 0 }" data-proof.binding:capture="">
        <input><output data-text="$count"></output>
      </section>`;
    const input = document.querySelector("input");
    if (!input) throw new Error("The binding fixture has no input.");
    input.setAttribute(
      attribute,
      attribute === "data-bind:count" ? "" : "proof.binding.value($count)",
    );
    if (attribute === "data-bind:count") {
      const onWrite = (): void => {
        evaluations++;
        if (destroyInitially) current().application.destroy();
      };
      input.addEventListener("jquery-star:model-write", onWrite);
      removeTestListener = () => input.removeEventListener("jquery-star:model-write", onWrite);
    }
    if (destroyInitially)
      expect(() => api.boot("#binding")).toThrow("destroyed the application during setup");
    else api.boot("#binding");
    return input;
  }

  beforeEach(() => {
    document.body.innerHTML = "";
    retained = undefined;
    evaluations = 0;
    removeTestListener = undefined;
    api = installStarCore($, { document }).star;
  });

  afterEach(() => {
    removeTestListener?.();
    if (retained) {
      retained.application.destroy();
      // Original-source controls can retain effects and input handlers after destruction.
      for (const runner of effects()) stop(runner);
      effects().clear();
      $("#binding input").off();
    }
    api.dispose();
    document.body.innerHTML = "";
  });

  it.each(["data-effect", "data-show", "data-text"])(
    "stops %s when its first evaluation destroys its application",
    async (attribute) => {
      bootBinding(attribute, true);
      expect(current().application.destroyed).toBe(true);
      expect(evaluations).toBe(1);
      current().application.state.count = 7;
      await api.nextUpdate();
      expect(evaluations).toBe(1);
      expect(effects().size).toBe(0);
      expect(document.querySelector("output")?.textContent).toBe("");
    },
  );

  it.each(["data-effect", "data-show", "data-text"])(
    "retains ordinary %s reactivity until destruction",
    async (attribute) => {
      bootBinding(attribute, false);
      expect(evaluations).toBe(1);
      current().application.state.count = 7;
      await api.nextUpdate();
      expect(evaluations).toBe(2);
      expect(document.querySelector("output")?.textContent).toBe("7");
      current().application.destroy();
      current().application.state.count = 9;
      await api.nextUpdate();
      expect(evaluations).toBe(2);
      expect(effects().size).toBe(0);
    },
  );

  it.each([true, false])(
    "owns model effects and input handlers after initial destruction=%s",
    async (destroyInitially) => {
      const input = bootBinding("data-bind:count", destroyInitially);
      expect(input.value).toBe("0");
      current().application.state.count = 7;
      await api.nextUpdate();
      expect(input.value).toBe(destroyInitially ? "0" : "7");
      input.value = "42";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      expect(current().application.state.count).toBe(destroyInitially ? 7 : "42");
      await api.nextUpdate();
      current().application.destroy();
      input.value = "99";
      input.dispatchEvent(new Event("change", { bubbles: true }));
      expect(current().application.state.count).toBe(destroyInitially ? 7 : "42");
      expect(effects().size).toBe(0);
    },
  );
});

const mounts: string[] = [];
const updates: string[] = [];
const cleanups: string[] = [];
const order: string[] = [];
let retainedContext: StarDirectiveContext | undefined;
const tasks = new Map<
  string,
  {
    readonly signal: AbortSignal;
    readonly resolve: () => void;
    readonly reject: (error: unknown) => void;
  }
>();

function extensionPlugin(): StarPlugin<{ readonly label: "directive fixture" }> {
  return {
    name: "acme.extensions",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install(registrar: StarPluginRegistrar) {
      registrar.helper("acme.extensions.double", (value: number) => value * 2);
      registrar.directive<number>({
        id: "acme.extensions.label",
        match: { name: "data-acme.extensions:label" },
        parse: ({ value }) => Number(value),
        mount(context) {
          mounts.push(`label:${context.attribute.parsed}`);
          const evaluate = context.expressions.compileValue(
            "acme.extensions.double($count) + args[0]",
            { attribute: context.attribute.name },
          );
          context.effect(() => {
            const value = evaluate({
              ...context.context,
              args: [context.attribute.parsed],
            });
            context.$element.text(String(value));
          });
          context.cleanup(() => cleanups.push(`label:${context.attribute.parsed}`));
        },
      });
      registrar.directive<number>({
        id: "acme.extensions.update",
        match: { name: "data-acme.extensions:update" },
        parse: ({ value }) => Number(value),
        mount(context) {
          mounts.push(`update:${context.attribute.parsed}`);
          context.element.setAttribute("data-current", String(context.attribute.parsed));
          context.cleanup(() => cleanups.push(`update:${context.attribute.parsed}`));
        },
        update(context) {
          updates.push(`${String(context.previous?.parsed)}->${String(context.attribute.parsed)}`);
          context.cleanup(() => cleanups.push(`update-step:${context.attribute.parsed}`));
          if (context.attribute.parsed === 99) throw new Error("directive update failed");
          context.element.setAttribute("data-current", String(context.attribute.parsed));
        },
      });
      registrar.directive({
        id: "acme.extensions.lifecycle",
        match: { name: "data-acme.extensions:lifecycle" },
        mount(context) {
          const label = context.attribute.value;
          mounts.push(`lifecycle:${label}`);
          context.cleanup(() => cleanups.push(`${label}:first`));
          context.cleanup(() => cleanups.push(`${label}:second`));
          if (label === "fail-mount") throw new Error("directive mount failed");
          return () => cleanups.push(`${label}:returned`);
        },
      });
      registrar.directive({
        id: "acme.extensions.task",
        match: { name: "data-acme.extensions:task" },
        mount(context) {
          context.task(
            (signal) =>
              new Promise<void>((resolve, reject) => {
                tasks.set(context.attribute.value, { signal, resolve, reject });
                signal.addEventListener("abort", () => reject(new Error("task aborted")), {
                  once: true,
                });
              }),
          );
        },
      });
      registrar.directive({
        id: "acme.extensions.high",
        match: { name: "data-acme.extensions:high" },
        priority: 10,
        mount: () => {
          order.push("high");
        },
      });
      registrar.directive({
        id: "acme.extensions.low",
        match: { name: "data-acme.extensions:low" },
        priority: -10,
        mount: () => {
          order.push("low");
        },
      });
      registrar.directive({
        id: "acme.extensions.parse",
        match: { name: "data-acme.extensions:parse" },
        parse: ({ value }) => {
          if (value === "fail") throw new Error("directive parse failed");
          return Number(value);
        },
        mount(context) {
          context.cleanup(() => {
            cleanups.push("parse:first");
            throw new Error("directive parse cleanup failed");
          });
          context.cleanup(() => cleanups.push("parse:second"));
        },
      });
      registrar.directive({
        id: "acme.extensions.invalid",
        match: { name: "data-acme.extensions:invalid" },
        mount(context) {
          switch (context.attribute.value) {
            case "effect":
              context.effect(null as unknown as () => void);
              return;
            case "task":
              context.task(null as unknown as (signal: AbortSignal) => PromiseLike<unknown>);
              return;
            case "task-result":
              context.task(() => undefined as unknown as PromiseLike<unknown>);
              return;
            case "cleanup":
              context.cleanup(null as unknown as () => void);
              return;
            case "async-result":
              return Promise.resolve() as unknown as () => void;
            case "invalid-result":
              return 1 as unknown as () => void;
            case "retained":
              retainedContext = context;
              return;
          }
        },
      });
      return { label: "directive fixture" as const };
    },
  };
}

async function settled(): Promise<void> {
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
  await nextUpdate();
}

describe("registered directive applications", () => {
  let kernel: Kernel;
  const applications = new Set<DeclarativeApplication>();

  function boot(markup: string): DeclarativeApplication {
    document.body.innerHTML = markup;
    const root = document.body.firstElementChild!;
    const application = new DeclarativeApplication($, root, kernel.applicationCapabilities);
    kernel.trackApplication(application, application);
    applications.add(application);
    return application;
  }

  beforeAll(() => {
    kernel = new Kernel($, document);
    expect(kernel.plugins.use(extensionPlugin()).label).toBe("directive fixture");
  });

  beforeEach(() => {
    mounts.length = 0;
    updates.length = 0;
    cleanups.length = 0;
    order.length = 0;
    tasks.clear();
    retainedContext = undefined;
  });

  afterEach(() => {
    for (const application of applications) {
      if (!application.destroyed) application.destroy();
    }
    applications.clear();
    document.body.innerHTML = "";
  });

  afterAll(() => kernel.dispose());

  it("resolves helpers, honors priority, updates once, and remounts definitions without update", async () => {
    const application = boot(`
      <section data-signals="{ count: 2 }">
        <div data-acme.extensions:low="" data-acme.extensions:high=""></div>
        <output data-acme.extensions:label="3"></output>
        <i data-acme.extensions:update="1"></i>
      </section>
    `);
    const output = document.querySelector("output")!;
    const updated = document.querySelector("i")!;

    expect(order).toEqual(["high", "low"]);
    expect(output.textContent).toBe("7");
    expect(updated.getAttribute("data-current")).toBe("1");
    expect(Object.isFrozen(application["context"]().helpers?.acme)).toBe(true);

    application.state.count = 4;
    await nextUpdate();
    expect(output.textContent).toBe("11");

    updated.setAttribute("data-acme.extensions:update", "2");
    await settled();
    expect(updates).toEqual(["1->2"]);
    expect(updated.getAttribute("data-current")).toBe("2");
    expect(mounts.filter((entry) => entry.startsWith("update:"))).toEqual(["update:1"]);

    output.setAttribute("data-acme.extensions:label", "5");
    await settled();
    expect(output.textContent).toBe("13");
    expect(mounts.filter((entry) => entry.startsWith("label:"))).toEqual(["label:3", "label:5"]);
    expect(cleanups).toContain("label:3");

    output.setAttribute("data-acme.extensions:label", "5");
    await settled();
    expect(mounts.filter((entry) => entry.startsWith("label:"))).toHaveLength(2);

    const inserted = document.createElement("b");
    inserted.setAttribute("data-acme.extensions:label", "6");
    application.root.append(inserted);
    await settled();
    expect(inserted.textContent).toBe("14");
    expect(mounts.filter((entry) => entry === "label:6")).toHaveLength(1);
  });

  it("releases directives once for attributes, ignored trees, removals, and failed setup or update", async () => {
    const reports: unknown[] = [];
    const application = boot(`
      <section>
        <i id="attribute" data-acme.extensions:lifecycle="attribute"></i>
        <i id="ignored" data-acme.extensions:lifecycle="ignored"></i>
        <i id="removed" data-acme.extensions:lifecycle="removed"></i>
        <i id="failed" data-acme.extensions:lifecycle="fail-mount"></i>
        <i id="update" data-acme.extensions:update="1"></i>
        <i id="destroyed" data-acme.extensions:lifecycle="destroyed"></i>
      </section>
    `);
    application.$root.on("jquery-star:error", (_event, detail) => reports.push(detail));

    document.querySelector("#attribute")!.removeAttribute("data-acme.extensions:lifecycle");
    document.querySelector("#ignored")!.setAttribute("data-ignore", "");
    document.querySelector("#removed")!.remove();
    document.querySelector("#update")!.setAttribute("data-acme.extensions:update", "99");
    await settled();

    expect(cleanups.filter((entry) => entry.startsWith("attribute:"))).toEqual([
      "attribute:returned",
      "attribute:second",
      "attribute:first",
    ]);
    expect(cleanups.filter((entry) => entry.startsWith("ignored:"))).toEqual([
      "ignored:returned",
      "ignored:second",
      "ignored:first",
    ]);
    expect(cleanups.filter((entry) => entry.startsWith("removed:"))).toEqual([
      "removed:returned",
      "removed:second",
      "removed:first",
    ]);
    expect(cleanups.filter((entry) => entry.startsWith("fail-mount:"))).toEqual([
      "fail-mount:second",
      "fail-mount:first",
    ]);
    expect(cleanups).toEqual(expect.arrayContaining(["update-step:99", "update:1"]));
    expect(reports).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          error: expect.objectContaining({ message: "directive update failed" }),
          attribute: "data-acme.extensions:update",
        }),
      ]),
    );

    application.destroy();
    application.destroy();
    expect(cleanups.filter((entry) => entry.startsWith("destroyed:"))).toEqual([
      "destroyed:returned",
      "destroyed:second",
      "destroyed:first",
    ]);
  });

  it("releases directive records before direct and Idiomorph patch replacement", async () => {
    const application = boot(`
      <section id="app">
        <div id="direct" data-acme.extensions:lifecycle="direct"></div>
        <div id="morph" data-acme.extensions:lifecycle="morph"></div>
      </section>
    `);

    patchElements(application.root, '<div id="direct-next"></div>', {
      mode: "replace",
      selector: "#direct",
    });
    patchElements(application.root, '<div id="morph"></div>');
    await kernel.whenEnhanced();

    expect(cleanups.filter((entry) => entry.startsWith("direct:"))).toEqual([
      "direct:returned",
      "direct:second",
      "direct:first",
    ]);
    expect(cleanups.filter((entry) => entry.startsWith("morph:"))).toEqual([
      "morph:returned",
      "morph:second",
      "morph:first",
    ]);
  });

  it("tracks finite tasks through the enhancement barrier and suppresses released failures", async () => {
    const application = boot(`
      <section>
        <i id="task" data-acme.extensions:task="complete"></i>
      </section>
    `);
    expect(kernel.resourceSummary()).toContainEqual({
      kind: "task",
      owner: expect.stringContaining("application:attributes:"),
    });

    let enhanced = false;
    const barrier = kernel.whenEnhanced().then(() => {
      enhanced = true;
    });
    await Promise.resolve();
    expect(enhanced).toBe(false);
    tasks.get("complete")!.resolve();
    await barrier;
    expect(kernel.resourceSummary().filter(({ kind }) => kind === "task")).toEqual([]);

    const reports: unknown[] = [];
    application.$root.on("jquery-star:error", (_event, detail) => reports.push(detail));
    const failed = document.createElement("i");
    failed.setAttribute("data-acme.extensions:task", "failed");
    application.root.append(failed);
    await settled();
    const failure = new Error("task failed");
    const failedBarrier = kernel.whenEnhanced();
    tasks.get("failed")!.reject(failure);
    await expect(failedBarrier).rejects.toBe(failure);
    expect(reports).toContainEqual(expect.objectContaining({ error: failure }));

    const pending = document.createElement("i");
    pending.setAttribute("data-acme.extensions:task", "released");
    application.root.append(pending);
    await settled();
    const released = tasks.get("released")!;
    pending.removeAttribute("data-acme.extensions:task");
    await settled();
    expect(released.signal.aborted).toBe(true);
    expect(kernel.resourceSummary().filter(({ kind }) => kind === "task")).toEqual([]);
    await expect(kernel.whenEnhanced()).resolves.toBeUndefined();
  });

  it("rejects invalid capabilities and retained contexts without leaking directive work", async () => {
    const reports: Array<{ error: unknown }> = [];
    const application = boot("<section></section>");
    application.$root.on("jquery-star:error", (_event, detail) => reports.push(detail));

    for (const mode of [
      "effect",
      "task",
      "task-result",
      "cleanup",
      "async-result",
      "invalid-result",
      "retained",
    ]) {
      const element = document.createElement("i");
      element.setAttribute("data-acme.extensions:invalid", mode);
      application.root.append(element);
      await settled();
      if (mode === "retained") {
        element.removeAttribute("data-acme.extensions:invalid");
        await settled();
      }
    }

    expect(reports.map(({ error }) => (error as Error).message)).toEqual(
      expect.arrayContaining([
        expect.stringContaining("effect must be a function"),
        expect.stringContaining("task must be a function"),
        expect.stringContaining("task must return a thenable"),
        expect.stringContaining("cleanup must be a function"),
        expect.stringContaining("returned an asynchronous result"),
        expect.stringContaining("must return cleanup or undefined"),
      ]),
    );
    expect(retainedContext).toBeDefined();
    expect(() => retainedContext!.effect(() => undefined)).toThrow("already been released");
    expect(() => retainedContext!.cleanup(() => undefined)).toThrow("already been released");
    expect(() => retainedContext!.task(async () => undefined)).toThrow("already been released");
    expect(kernel.resourceSummary().filter(({ kind }) => kind === "task")).toEqual([]);
  });

  it("aggregates parser and cleanup failures while attempting cleanup in reverse order", async () => {
    const reports: Array<{ error: unknown }> = [];
    const application = boot('<section><i data-acme.extensions:parse="1"></i></section>');
    application.$root.on("jquery-star:error", (_event, detail) => reports.push(detail));
    const element = application.root.querySelector("i")!;

    element.setAttribute("data-acme.extensions:parse", "fail");
    await settled();

    expect(cleanups).toEqual(["parse:second", "parse:first"]);
    expect(reports).toHaveLength(1);
    expect(reports[0]!.error).toMatchObject({
      message: "Directive acme.extensions.parse parse failed.",
      errors: [
        expect.objectContaining({ message: "directive parse failed" }),
        expect.objectContaining({ message: "directive parse cleanup failed" }),
      ],
    });
  });

  it("destroys application-owned directive work before kernel plugin disposal", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    const owner = frame.contentDocument!;
    const isolated = new Kernel($, owner);
    isolated.plugins.use(extensionPlugin());
    const root = owner.createElement("section");
    root.innerHTML = '<i data-acme.extensions:lifecycle="kernel"></i>';
    owner.body.append(root);
    const application = new DeclarativeApplication($, root, isolated.applicationCapabilities);
    isolated.trackApplication(application, application);

    isolated.dispose();
    isolated.dispose();

    expect(application.destroyed).toBe(true);
    expect(cleanups.filter((entry) => entry.startsWith("kernel:"))).toEqual([
      "kernel:returned",
      "kernel:second",
      "kernel:first",
    ]);
    frame.remove();
  });
});

describe("directive registration rollback", () => {
  let api: ReturnType<typeof installStarCore>["star"];
  let retained: StarDirectiveContext | undefined;
  let failures: unknown[];

  function boot(
    mount: StarDirective["mount"],
    update?: StarDirective["update"],
  ): StarDirectiveContext {
    api.use({
      name: "proof.rollback",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        registrar.directive({
          id: "proof.rollback.run",
          match: { name: "data-proof.rollback:run" },
          mount(context) {
            retained = context;
            return mount(context);
          },
          ...(update ? { update } : {}),
        });
        return {};
      },
    });
    document.body.innerHTML = `
      <section id="rollback" data-signals="{ count: 0 }" data-proof.rollback:run="first">
        <output data-text="$count"></output>
      </section>`;
    $("#rollback").on("jquery-star:error", (_event, detail: unknown) => {
      failures.push(
        detail !== null && typeof detail === "object" && "error" in detail ? detail.error : detail,
      );
    });
    try {
      api.boot("#rollback");
    } catch (error) {
      failures.push(error);
    }
    if (!retained) throw new Error("The registered directive did not mount.");
    return retained;
  }

  beforeEach(() => {
    document.body.innerHTML = "";
    failures = [];
    retained = undefined;
    api = installStarCore($, { document }).star;
  });

  afterEach(() => {
    const application = retained?.application;
    if (application) {
      application.destroy();
      // Original-source controls can expose a runner that destruction already missed.
      const effects = (application as unknown as { ownedEffects: Set<ReactiveEffect> })
        .ownedEffects;
      for (const runner of effects) stop(runner);
      effects.clear();
    }
    api.dispose();
    document.body.innerHTML = "";
  });

  it.each(["throw", "invalid"] as const)("aborts a task whose factory is %s", (failure) => {
    let signal: AbortSignal | undefined;
    const original = new Error("Factory failed.");
    const cleanup = vi.fn();
    const context = boot((directive) => {
      directive.cleanup(cleanup);
      directive.task((current) => {
        signal = current;
        if (failure === "throw") throw original;
        return undefined as unknown as PromiseLike<unknown>;
      });
    });
    expect(signal?.aborted).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(failures).toHaveLength(1);
    if (failure === "throw") expect(failures[0]).toBe(original);
    else
      expect(failures[0]).toMatchObject({
        message: expect.stringContaining("must return a thenable"),
      });
    context.application.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
  });

  it("preserves a factory failure while attempting every registered rollback", () => {
    let signal: AbortSignal | undefined;
    const factoryFailure = new Error("Factory failed.");
    const cleanupFailure = new Error("Cleanup failed.");
    const completed = vi.fn();
    boot((context) => {
      context.cleanup(completed);
      context.cleanup(() => {
        throw cleanupFailure;
      });
      context.task((current) => {
        signal = current;
        throw factoryFailure;
      });
    });
    expect(signal?.aborted).toBe(true);
    expect(completed).toHaveBeenCalledOnce();
    expect(failures).toEqual([
      expect.objectContaining({ name: "AggregateError", errors: [factoryFailure, cleanupFailure] }),
    ]);
  });

  it.each(["task", "effect"] as const)(
    "rolls back %s registration when its initial callback destroys the application",
    async (kind) => {
      let signal: AbortSignal | undefined;
      let rejectTask: ((error: Error) => void) | undefined;
      const pending = new Promise<void>((_resolve, reject) => {
        rejectTask = reject;
      });
      const cleanup = vi.fn();
      const effect = vi.fn();
      try {
        const context = boot((directive) => {
          directive.cleanup(cleanup);
          if (kind === "task") {
            directive.task((current) => {
              signal = current;
              directive.application.destroy();
              return pending;
            });
          } else {
            directive.effect(() => {
              void directive.application.state.count;
              effect();
              directive.application.destroy();
            });
          }
        });
        expect(context.application.destroyed).toBe(true);
        expect(cleanup).toHaveBeenCalledOnce();
        if (kind === "task") expect(signal?.aborted).toBe(true);
        const reportsBeforeRejection = failures.length;
        if (kind === "task") rejectTask?.(new Error("Released task failed later."));
        context.application.state.count = 1;
        await nextUpdate();
        expect(effect).toHaveBeenCalledTimes(kind === "effect" ? 1 : 0);
        expect($("output").text()).toBe("");
        expect(failures).toHaveLength(reportsBeforeRejection);
        const later = vi.fn();
        expect(() => context.effect(later)).toThrow("already been released");
        expect(() =>
          context.task(async () => {
            later();
          }),
        ).toThrow("already been released");
        expect(later).not.toHaveBeenCalled();
        await api.whenEnhanced();
      } finally {
        void pending.catch(() => undefined);
        rejectTask?.(new Error("Fixture cleanup."));
      }
    },
  );

  it.each(["mount", "update"] as const)(
    "runs registered and returned cleanup when %s destroys its application",
    async (phase) => {
      const registered = vi.fn();
      const returned = vi.fn();
      const destroy = (context: StarDirectiveContext): (() => void) => {
        context.cleanup(registered);
        context.application.destroy();
        return returned;
      };
      const context = boot(
        phase === "mount" ? destroy : () => undefined,
        phase === "update" ? destroy : undefined,
      );
      if (phase === "update") {
        $("#rollback").attr("data-proof.rollback:run", "second");
        await api.whenEnhanced();
      }
      expect(context.application.destroyed).toBe(true);
      expect(registered).toHaveBeenCalledOnce();
      expect(returned).toHaveBeenCalledOnce();
      context.application.state.count = 1;
      await nextUpdate();
      expect($("output").text()).toBe(phase === "mount" ? "" : "0");
      context.application.destroy();
      expect(registered).toHaveBeenCalledOnce();
      expect(returned).toHaveBeenCalledOnce();
    },
  );

  it("aborts and observes a task rejected after kernel registration fails", async () => {
    let signal: AbortSignal | undefined;
    let rejectTask: ((error: Error) => void) | undefined;
    const pending = new Promise<void>((_resolve, reject) => {
      rejectTask = reject;
    });
    try {
      boot((context) => {
        context.task((current) => {
          signal = current;
          api.dispose();
          return pending;
        });
      });
      expect(signal?.aborted).toBe(true);
      expect(
        failures.some((error) => error instanceof Error && error.message.includes("disposed")),
      ).toBe(true);
      const reports = failures.length;
      rejectTask?.(new Error("Task rejected after failed registration."));
      await nextUpdate();
      expect(failures).toHaveLength(reports);
    } finally {
      void pending.catch(() => undefined);
      rejectTask?.(new Error("Fixture cleanup."));
    }
  });

  it.each([false, true])(
    "detaches task registration that releases its owner before returning (detach throws: %s)",
    async (detachThrows) => {
      const frame = document.createElement("iframe");
      document.body.append(frame);
      const owner = frame.contentDocument;
      if (!owner) throw new Error("The fixture frame has no document.");
      const isolated = new Kernel($, owner);
      const root = owner.createElement("section");
      root.setAttribute("data-proof.rollback:run", "");
      owner.body.append(root);
      let context: StarDirectiveContext | undefined;
      let signal: AbortSignal | undefined;
      let finish: (() => void) | undefined;
      const pending = new Promise<void>((resolve) => {
        finish = resolve;
      });
      const detachFailure = new Error("Task detach failed.");
      const detach = vi.fn();
      const reports: unknown[] = [];
      $(root).on("jquery-star:error", (_event, detail: { error: unknown }) =>
        reports.push(detail.error),
      );
      isolated.plugins.use({
        name: "proof.rollback",
        version: "1.0.0",
        apiVersion: "^0.1.0",
        install(registrar) {
          registrar.directive({
            id: "proof.rollback.run",
            match: { name: "data-proof.rollback:run" },
            mount(current) {
              context = current;
              current.task((currentSignal) => {
                signal = currentSignal;
                return pending;
              });
            },
          });
          return {};
        },
      });
      const capabilities = isolated.applicationCapabilities;
      try {
        const application = new DeclarativeApplication($, root, {
          ...capabilities,
          task(taskOwner, work, report) {
            const release = capabilities.task(taskOwner, work, report);
            if (!context) throw new Error("Task registration did not have a directive owner.");
            context.application.destroy();
            return () => {
              detach();
              release();
              if (detachThrows) throw detachFailure;
            };
          },
        });
        expect(application.destroyed).toBe(true);
        expect(signal?.aborted).toBe(true);
        expect(detach).toHaveBeenCalledOnce();
        expect(isolated.resourceSummary().filter(({ kind }) => kind === "task")).toEqual([]);
        await isolated.whenEnhanced();
        if (detachThrows) expect(reports).toEqual([detachFailure]);
        else
          expect(reports).toEqual([
            expect.objectContaining({ message: expect.stringContaining("already been released") }),
          ]);
        application.destroy();
        expect(detach).toHaveBeenCalledOnce();
      } finally {
        finish?.();
        isolated.dispose();
        frame.remove();
      }
    },
  );
});

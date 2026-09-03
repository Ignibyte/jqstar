import $ from "jquery";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { DeclarativeApplication } from "../src/declarative";
import { patchElements } from "../src/patch";
import { nextUpdate } from "../src/reactivity";
import type { StarDirectiveContext } from "../src/directive";
import type { StarPlugin, StarPluginRegistrar } from "../src/plugin";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

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

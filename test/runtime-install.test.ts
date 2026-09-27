import $ from "jquery";
import { afterEach, expect, it, vi } from "vitest";
import { createTrustedExpressionEngine } from "../src/expression";
import { kernelForDocument } from "../src/kernel";
import { STAR_PLUGIN_API_VERSION, type StarPluginRegistrar } from "../src/plugin";
import { installStarRuntime } from "../src/runtime";
import { installStar } from "../src/compatibility";

const frames: HTMLIFrameElement[] = [];

afterEach(() => {
  vi.unstubAllGlobals();
  for (const frame of frames.splice(0)) frame.remove();
});

it("disposes an owned expression engine when kernel construction fails", () => {
  const detached = document.implementation.createHTMLDocument("detached");
  const expressions = createTrustedExpressionEngine();
  const disposeExpressions = vi.spyOn(expressions, "dispose");

  expect(() =>
    installStarRuntime($, {
      document: detached,
      createExpressionEngine: () => expressions,
    }),
  ).toThrow("jQuery Star needs a Document attached to a Window.");
  expect(disposeExpressions).toHaveBeenCalledOnce();
  expect(($ as JQueryStatic & { star?: unknown }).star).toBeUndefined();
});

it("installs one complete runtime into a fresh document and tears applications down", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const owner = frame.contentDocument!;
  vi.stubGlobal("document", owner);
  const expressions = createTrustedExpressionEngine();
  const disposeExpressions = vi.spyOn(expressions, "dispose");
  const star = installStar($, { expressionEngine: expressions });
  const kernel = kernelForDocument(owner)!;

  expect(star.version).toBe("1.1.0");
  expect(kernel.expressions).toBe(expressions);
  expect(installStar($)).toBe(star);
  expect(kernel.actions.names()).toEqual(
    expect.arrayContaining(["delete", "get", "patch", "post", "put"]),
  );

  const applicationSetup = vi.fn();
  const applicationCleanup = vi.fn();
  const pluginCleanup = vi.fn();
  const directiveCleanup = vi.fn();
  const pluginAction = vi.fn();
  const plugin = {
    name: "acme.runtime",
    version: "1.0.0",
    apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
    install(registrar: StarPluginRegistrar) {
      registrar.action("acme.runtime.run", pluginAction);
      registrar.helper("acme.runtime.upper", (value: unknown) => String(value).toUpperCase());
      registrar.directive({
        id: "acme.runtime.label",
        match: { name: "data-acme.runtime:label" },
        mount(context) {
          const evaluate = context.expressions.compileValue("acme.runtime.upper($message)", {
            attribute: context.attribute.name,
          });
          context.effect(() => context.$element.text(String(evaluate(context.context))));
          context.cleanup(directiveCleanup);
        },
      });
      registrar.application((application) => {
        applicationSetup(application.mode, application.root.id);
        if (application.root.id === "plugin-failure") throw new Error("plugin hook failed");
        return () => applicationCleanup(application.mode, application.root.id);
      });
      registrar.cleanup(pluginCleanup);
      return { label: "runtime facade" as const };
    },
  };
  const facade = star.use(plugin);
  expect(facade.label).toBe("runtime facade");
  expect(star.use(plugin)).toBe(facade);
  expect(kernel.actions.resolve("acme.runtime.run")).toBe(pluginAction);
  expect(kernel.extensions.resolve("data-acme.runtime:label")?.id).toBe("acme.runtime.label");
  expect(() => star.action("acme.runtime.other", vi.fn())).toThrow(
    "belongs to the installed plugin namespace acme.runtime",
  );
  const legacyFirst = vi.fn();
  const legacySecond = vi.fn();
  expect(star.action("legacy.runtime", legacyFirst)).toBe(star);
  expect(star.action("legacy.runtime", legacySecond)).toBe(star);
  expect(kernel.actions.resolve("legacy.runtime")).toBe(legacySecond);
  const batchFirst = {
    name: "acme.batch-first",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install: () => ({ order: 1 as const }),
  };
  const batchSecond = {
    name: "acme.batch-second",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    dependencies: { "acme.batch-first": "^1.0.0" },
    install: () => ({ order: 2 as const }),
  };
  const [secondFacade, firstFacade] = star.use([batchSecond, batchFirst] as const);
  expect([secondFacade.order, firstFacade.order]).toEqual([2, 1]);

  const compiled = kernel.expressions.compileValue("$count");
  star.clearExpressionCache();
  expect(kernel.expressions.compileValue("$count")).not.toBe(compiled);
  expect(() => installStar($, { expressionEngine: createTrustedExpressionEngine() })).toThrow(
    "jQStar is already installed. Select an expression engine during initial installation.",
  );

  const root = owner.createElement("section");
  root.innerHTML = '<button type="button">Increment</button>';
  owner.body.append(root);
  const action = vi.fn();
  const userHandler = vi.fn();
  $(root).on("user-event", userHandler);
  $(root).star({ actions: { increment: action }, ui: { button: { on: { click: "increment" } } } });
  expect(kernel.applicationCount()).toBe(1);
  expect(applicationSetup).toHaveBeenLastCalledWith("behavior", "");
  expect(() =>
    star.use({
      name: "acme.late",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install: () => ({}),
    }),
  ).toThrow("closes when the first application starts");
  $(root).find("button").trigger("click");
  expect(action).toHaveBeenCalledOnce();

  $(root).star("destroy");
  $(root).find("button").trigger("click");
  $(root).trigger("user-event");
  expect(action).toHaveBeenCalledOnce();
  expect(userHandler).toHaveBeenCalledOnce();
  expect(applicationCleanup).toHaveBeenCalledWith("behavior", "");
  expect(kernel.applicationCount()).toBe(0);

  const declarativeRoot = owner.createElement("section");
  declarativeRoot.id = "declarative-plugin";
  declarativeRoot.dataset.signals = "{ count: 0, message: 'ready' }";
  declarativeRoot.innerHTML = "<output data-acme.runtime:label></output>";
  owner.body.append(declarativeRoot);
  $(declarativeRoot).star();
  expect(applicationSetup).toHaveBeenLastCalledWith("attributes", "declarative-plugin");
  expect(declarativeRoot.querySelector("output")?.textContent).toBe("READY");
  $(declarativeRoot).star("destroy");
  expect(applicationCleanup).toHaveBeenLastCalledWith("attributes", "declarative-plugin");
  expect(directiveCleanup).toHaveBeenCalledOnce();

  const brokenRoot = owner.createElement("section");
  brokenRoot.id = "plugin-failure";
  owner.body.append(brokenRoot);
  expect(() => $(brokenRoot).star({})).toThrow("plugin hook failed");
  expect($(brokenRoot).star("instance")).toBeUndefined();
  expect(kernel.applicationCount()).toBe(0);

  const disposal = star.dispose();
  expect(disposal.failed).toEqual([]);
  expect(disposal.remaining).toEqual([]);
  expect(disposeExpressions).toHaveBeenCalledOnce();
  expect(pluginCleanup).toHaveBeenCalledOnce();
  expect(() => star.boot(root)).toThrow(
    "This jQuery Star kernel has been disposed and cannot boot applications.",
  );
  expect(() => star.clearExpressionCache()).toThrow(
    "This jQuery Star kernel has been disposed and cannot clear expression caches.",
  );
});

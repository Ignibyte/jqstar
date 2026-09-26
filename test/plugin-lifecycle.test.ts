import $ from "jquery";
import { afterEach, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import { kernelForDocument } from "../src/kernel";
import type { StarPluginRegistrar } from "../src/core";

type StarStatic = ReturnType<typeof installStarCore>["star"];

const installations: { frame: HTMLIFrameElement; star: StarStatic }[] = [];

function install() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentDocument;
  if (!owner) throw new Error("Missing test document.");
  const star = installStarCore($, { document: owner }).star;
  installations.push({ frame, star });
  const kernel = kernelForDocument(owner);
  if (!kernel) throw new Error("Missing test kernel.");
  const root = owner.createElement("main");
  owner.body.append(root);
  return { star, kernel, root, owner };
}

function plugin(installPlugin: (registrar: StarPluginRegistrar) => void) {
  return {
    name: "review.lifecycle",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install(registrar: StarPluginRegistrar) {
      installPlugin(registrar);
      return { installed: true };
    },
  };
}

afterEach(() => {
  for (const { frame, star } of installations.splice(0).reverse()) {
    try {
      star.dispose();
    } finally {
      frame.remove();
    }
  }
  vi.restoreAllMocks();
});

it("forwards staged resource scope and availability to render cleanup", async () => {
  const { star, kernel, root, owner } = install();
  const cleanup = vi.fn();
  star.use(
    plugin((registrar) => {
      expect(registrar.documentHost.canOwn?.(root)).toBe(true);
      registrar.documentHost.own("listener", "review:scoped", cleanup, root);
    }),
  );
  const render = kernel.beginRender(owner.body);
  render.beforeRemove(root);
  expect(cleanup).toHaveBeenCalledOnce();
  root.remove();
  render.commit();
  await star.whenEnhanced();
  star.dispose();
  expect(cleanup).toHaveBeenCalledOnce();
});

it("rolls back provisional cleanup when staged scope is unavailable at activation", () => {
  const { star, kernel, root, owner } = install();
  const cleanup = vi.fn();
  const render = kernel.beginRender(owner.body);
  render.beforeRemove(root);
  expect(() =>
    star.use(
      plugin((registrar) => {
        expect(registrar.documentHost.canOwn?.(root)).toBe(false);
        registrar.documentHost.own("task", "review:blocked", cleanup, root);
      }),
    ),
  ).toThrow("cannot acquire resources");
  expect(cleanup).toHaveBeenCalledOnce();
  expect(kernel.plugins.names()).toEqual([]);
  render.commit();
});

it.each(["installer", "activation"])(
  "refuses publication and later callbacks when the %s disposes the kernel",
  (phase) => {
    const { star, kernel } = install();
    const calls: string[] = [];
    const current = plugin((registrar) => {
      registrar.cleanup(() => calls.push("installer cleanup"));
      registrar.action("review.lifecycle.run", vi.fn());
      registrar.helper("review.lifecycle.label", "ready");
      if (phase === "installer") star.dispose();
      registrar.activate(() => {
        calls.push("activate");
        star.dispose();
        return () => calls.push("activation cleanup");
      });
      registrar.activate(() => {
        calls.push("late activation");
      });
    });

    expect(() => star.use(current)).toThrow();
    expect(calls).toEqual(
      phase === "installer"
        ? ["installer cleanup"]
        : ["activate", "activation cleanup", "installer cleanup"],
    );
    expect(kernel.plugins.names()).toEqual([]);
    expect(kernel.actions.resolve("review.lifecycle.run")).toBeUndefined();
    expect(kernel.extensions.resolveHelper("review.lifecycle.label")).toBeUndefined();
    star.dispose();
    expect(calls.filter((call) => call === "installer cleanup")).toHaveLength(1);
  },
);

it.each(["installer", "activation"])(
  "rechecks the application lock after %s callbacks",
  (phase) => {
    const { star, kernel, root } = install();
    const cleanup = vi.fn();
    expect(() =>
      star.use(
        plugin((registrar) => {
          registrar.cleanup(cleanup);
          const start = () => {
            $(root).star({ state: { count: 1 } });
          };
          if (phase === "installer") start();
          else registrar.activate(start);
        }),
      ),
    ).toThrow("closes when the first application starts");
    expect(cleanup).toHaveBeenCalledOnce();
    expect(kernel.plugins.names()).toEqual([]);
    expect(kernel.applicationCount()).toBe(1);
    $(root).star("destroy");
    expect(kernel.applicationCount()).toBe(0);
  },
);

it.each([
  ["destroy", "behavior"],
  ["destroy", "declarative"],
  ["dispose", "behavior"],
  ["dispose", "declarative"],
])(
  "stops later application hooks after %s in %s mode and releases returned cleanup",
  (operation, mode) => {
    const { star, kernel, root } = install();
    const calls: string[] = [];
    star.use(
      plugin((registrar) => {
        registrar.application(() => () => calls.push("earlier cleanup"));
        registrar.application((application) => {
          if (operation === "destroy") application.destroy();
          else star.dispose();
          return () => calls.push("returned cleanup");
        });
        registrar.application(() => {
          calls.push("late setup");
        });
      }),
    );
    expect(() => {
      if (mode === "behavior") $(root).star({ state: {} });
      else {
        root.setAttribute("data-signals", "{}");
        $(root).star();
      }
    }).toThrow();
    expect(calls).toEqual(["returned cleanup", "earlier cleanup"]);
    expect(kernel.applicationCount()).toBe(0);
    expect($.data(root, "jqueryStar.instance")).toBeUndefined();
    star.dispose();
    expect(calls).toHaveLength(2);
  },
);

it("attempts all returned hook cleanup after disposal even when cleanup throws", () => {
  const { star, kernel, root } = install();
  const cleanupFailure = new Error("returned cleanup failed");
  const earlier = vi.fn();
  star.use(
    plugin((registrar) => {
      registrar.application(() => earlier);
      registrar.application(() => {
        star.dispose();
        return () => {
          throw cleanupFailure;
        };
      });
    }),
  );
  expect(() => $(root).star({ state: {} })).toThrow(AggregateError);
  expect(earlier).toHaveBeenCalledOnce();
  expect(kernel.applicationCount()).toBe(0);
});

it.each(["installer", "preparation", "activation"])(
  "releases provisional resources when %s fails",
  (phase) => {
    const { star, kernel } = install();
    const calls: string[] = [];
    expect(() =>
      star.use(
        plugin((registrar) => {
          registrar.documentHost.own("service", "review:first", () => calls.push("first"));
          registrar.documentHost.own("service", "review:second", () => calls.push("second"));
          if (phase === "installer") throw new Error("installer failure");
          if (phase === "preparation") registrar.action("outside.name", vi.fn());
          if (phase === "activation")
            registrar.activate(() => {
              throw new Error("activation failure");
            });
        }),
      ),
    ).toThrow();
    expect(calls).toEqual(["second", "first"]);
    expect(kernel.resourceSummary()).toEqual([]);
    expect(kernel.plugins.names()).toEqual([]);
    star.dispose();
    expect(calls).toHaveLength(2);
  },
);

it("retains installer and cleanup errors while releasing sibling provisional resources", () => {
  const { star } = install();
  const original = new Error("installer failure");
  const failure = new Error("cleanup failure");
  const sibling = vi.fn();
  let caught: unknown;
  try {
    star.use(
      plugin((registrar) => {
        registrar.documentHost.own("service", "review:first", sibling);
        registrar.documentHost.own("service", "review:second", () => {
          throw failure;
        });
        throw original;
      }),
    );
  } catch (error) {
    caught = error;
  }
  expect(caught).toBeInstanceOf(AggregateError);
  expect((caught as AggregateError).errors).toEqual([original, failure]);
  expect(sibling).toHaveBeenCalledOnce();
});

it("disconnects a provisional observer if resource acquisition fails", async () => {
  const { star, kernel, root } = install();
  const callback = vi.fn();
  vi.spyOn(kernel, "own").mockImplementationOnce(() => {
    throw new Error("acquisition failed");
  });
  expect(() =>
    star.use(
      plugin((registrar) => {
        registrar.documentHost.observe(root, callback, { childList: true });
      }),
    ),
  ).toThrow("acquisition failed");
  root.append(document.createElement("span"));
  await Promise.resolve();
  expect(callback).not.toHaveBeenCalled();
  expect(kernel.plugins.names()).toEqual([]);
});

it("releases an acquisition that completes after cancellation without repeating cleanup", () => {
  const { star, kernel } = install();
  const cleanup = vi.fn();
  let cancel: () => void = () => undefined;
  const acquire = kernel.own.bind(kernel);
  vi.spyOn(kernel, "own").mockImplementationOnce((kind, owner, release) => {
    cancel();
    return acquire(kind, owner, release);
  });
  star.use(
    plugin((registrar) => {
      cancel = registrar.documentHost.own("service", "review:cancelled", cleanup);
    }),
  );
  expect(cleanup).toHaveBeenCalledOnce();
  expect(kernel.resourceSummary()).toEqual([]);
  cancel();
  star.dispose();
  expect(cleanup).toHaveBeenCalledOnce();
});

it("retains successful staged listeners and observers until exactly one disposal", async () => {
  const { star, kernel, root } = install();
  const listener = vi.fn();
  const observer = vi.fn();
  const cleanup = vi.fn();
  star.use(
    plugin((registrar) => {
      registrar.documentHost.listen(root, "review", listener);
      registrar.documentHost.observe(root, observer, { childList: true });
      registrar.documentHost.own("service", "review:live", cleanup);
    }),
  );
  root.dispatchEvent(new Event("review"));
  root.append(document.createElement("span"));
  await Promise.resolve();
  expect(listener).toHaveBeenCalledOnce();
  expect(observer).toHaveBeenCalledOnce();
  star.dispose();
  star.dispose();
  root.dispatchEvent(new Event("review"));
  root.append(document.createElement("span"));
  await Promise.resolve();
  expect(listener).toHaveBeenCalledOnce();
  expect(observer).toHaveBeenCalledOnce();
  expect(cleanup).toHaveBeenCalledOnce();
  expect(kernel.resourceSummary()).toEqual([]);
});

it("refuses an already destroyed application before invoking any plugin hook", () => {
  const { star, kernel, root } = install();
  const hook = vi.fn();
  star.use(plugin((registrar) => registrar.application(hook)));
  $(root).star({ state: {} });
  const application = $(root).star("instance");
  if (!application) throw new Error("Missing test application.");
  application.destroy();
  hook.mockClear();
  expect(() => kernel.trackApplication(application)).toThrow(
    "destroyed the application during setup",
  );
  expect(hook).not.toHaveBeenCalled();
  expect(kernel.applicationCount()).toBe(0);
});

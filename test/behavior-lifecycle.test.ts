import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installStarCore, patchElements, type StarInstance } from "../src/core";
import { kernelForDocument } from "../src/kernel";

function required<Value>(value: Value | null | undefined): Value {
  if (value === null || value === undefined) {
    throw new Error("The lifecycle fixture is missing its required element or owner.");
  }
  return value;
}

describe("behavior application lifecycle", () => {
  let api: ReturnType<typeof installStarCore>["star"];

  beforeEach(() => {
    document.body.innerHTML = `<section id="app"><input class="first"><i class="second"></i></section>`;
    api = installStarCore($, { document }).star;
  });

  afterEach(() => {
    api.dispose();
    document.body.innerHTML = "";
  });

  it("stops initial bindings and later setup when the binding destroys its application", async () => {
    const kernel = required(kernelForDocument(document));
    const resources = kernel.resourceSummary();
    const calls = vi.fn();
    const action = vi.fn();
    const laterMount = vi.fn();
    let instance: StarInstance<{ count: number }> | undefined;

    expect(() =>
      $("#app").star({
        state: { count: 0 },
        ui: {
          ".first": {
            text(context) {
              instance = context.instance;
              const count = context.state.count;
              calls();
              instance.destroy();
              return count;
            },
            model: "count",
            on: { click: action },
          },
          ".second": { mount: laterMount },
        },
      }),
    ).toThrow(/destroyed/);

    const application = required(instance);
    expect(application.destroyed).toBe(true);
    $(".first").val("7").trigger("input").trigger("change").trigger("click");
    expect(application.state.count).toBe(0);
    application.state.count = 1;
    await api.nextUpdate();

    expect(calls).toHaveBeenCalledOnce();
    expect(action).not.toHaveBeenCalled();
    expect(laterMount).not.toHaveBeenCalled();
    expect($("#app").star("instance")).toBeUndefined();
    expect(kernel.applicationCount()).toBe(0);
    expect(kernel.resourceSummary()).toEqual(resources);
  });

  it.each([false, true])(
    "releases cleanup returned after initial mount destruction (cleanup throws: %s)",
    (throws) => {
      const kernel = required(kernelForDocument(document));
      const resources = kernel.resourceSummary();
      const cleanupFailure = new Error("late mount cleanup failed");
      const cleanup = vi.fn(() => {
        if (throws) throw cleanupFailure;
      });
      const unmount = vi.fn();
      const laterMount = vi.fn();
      let instance: StarInstance | undefined;
      let failure: unknown;

      try {
        $("#app").star({
          ui: {
            ".first": {
              mount(context) {
                instance = context.instance;
                instance.destroy();
                return cleanup;
              },
              unmount,
            },
            ".second": { mount: laterMount },
          },
        });
      } catch (error) {
        failure = error;
      }

      if (throws) expect(failure).toBe(cleanupFailure);
      else
        expect(failure).toEqual(
          expect.objectContaining({ message: expect.stringMatching(/destroyed/) }),
        );
      expect(instance?.destroyed).toBe(true);
      expect(cleanup).toHaveBeenCalledOnce();
      expect(unmount).toHaveBeenCalledOnce();
      expect(laterMount).not.toHaveBeenCalled();
      expect($("#app").star("instance")).toBeUndefined();
      expect(kernel.applicationCount()).toBe(0);
      expect(kernel.resourceSummary()).toEqual(resources);
      required(instance).destroy();
      expect(cleanup).toHaveBeenCalledOnce();
    },
  );

  it("stops dynamic mounts and releases cleanup when a mount destroys its application", async () => {
    const kernel = required(kernelForDocument(document));
    const resources = kernel.resourceSummary();
    required(document.querySelector("#app")).replaceChildren();
    const cleanup = vi.fn();
    const unmount = vi.fn();
    const laterMount = vi.fn();
    $("#app").star({
      ui: {
        ".first": {
          mount({ instance }) {
            instance.destroy();
            return cleanup;
          },
          unmount,
        },
        ".second": { mount: laterMount },
      },
    });
    const instance = required($("#app").star("instance"));
    $("#app").append('<i class="first"></i><i class="second"></i>');
    await api.whenEnhanced();

    expect(instance.destroyed).toBe(true);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(unmount).toHaveBeenCalledOnce();
    expect(laterMount).not.toHaveBeenCalled();
    expect(kernel.applicationCount()).toBe(0);
    expect(kernel.resourceSummary()).toEqual(resources);
  });

  it.each(["application", "kernel"] as const)(
    "releases a detached mount before observer delivery during %s destruction",
    async (teardown) => {
      const cleanup = vi.fn();
      const unmount = vi.fn();
      $("#app").star({ ui: { ".first": { mount: () => cleanup, unmount } } });
      const instance = required($("#app").star("instance"));
      required(document.querySelector(".first")).remove();
      if (teardown === "application") instance.destroy();
      else api.dispose();
      await Promise.resolve();

      expect(instance.destroyed).toBe(true);
      expect(cleanup).toHaveBeenCalledOnce();
      expect(unmount).toHaveBeenCalledOnce();
      expect($("#app").data("jqueryStar.instance")).toBeUndefined();
      instance.destroy();
      expect(cleanup).toHaveBeenCalledOnce();
    },
  );

  it("releases returned cleanup when a dynamic mount removes its own subtree", async () => {
    required(document.querySelector("#app")).replaceChildren();
    const cleanup = vi.fn();
    const unmount = vi.fn();
    $("#app").star({
      ui: {
        ".first": {
          mount({ root }) {
            patchElements(root, "", { selector: ".first", mode: "remove" });
            return cleanup;
          },
          unmount,
        },
      },
    });
    const instance = required($("#app").star("instance"));
    $("#app").append('<i class="first"></i>');
    await api.whenEnhanced();

    expect(instance.destroyed).toBe(false);
    expect(document.querySelector(".first")).toBeNull();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(unmount).toHaveBeenCalledOnce();
    instance.destroy();
    expect(cleanup).toHaveBeenCalledOnce();
  });
});

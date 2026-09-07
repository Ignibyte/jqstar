import $ from "jquery";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { installStarCore, patchElements, type StarInstance } from "../src/core";
import type { DeclarativeApplication } from "../src/declarative";

function required<Value>(value: Value | null | undefined): Value {
  if (value === null || value === undefined) throw new Error("The cleanup fixture is incomplete.");
  return value;
}

describe("detached declarative cleanup", () => {
  let api: ReturnType<typeof installStarCore>["star"];
  let application: DeclarativeApplication | undefined;
  const removed: Element[] = [];
  const errors: ErrorEvent[] = [];
  const onError = (event: ErrorEvent): void => {
    errors.push(event);
    event.preventDefault();
  };

  beforeEach(() => {
    document.body.innerHTML = `<section id="app" data-signals="{ count: 0 }">
      <div id="first" data-proof.detached:owned="first">
        <input data-bind:count>
        <i data-on:click__window="$count += 1"></i>
      </div>
      <div id="second" data-proof.detached:owned="second">
        <button data-on:click="$count += 1"></button>
        <output data-text="$count"></output>
      </div>
    </section>`;
    errors.length = 0;
    application = undefined;
    window.addEventListener("error", onError);
    api = installStarCore($, { document }).star;
  });

  afterEach(() => {
    // The unchanged-source controls need explicit cleanup of their detached fixture nodes.
    for (const node of removed.splice(0)) {
      try {
        application?.releaseTree(node);
      } catch {
        // Individual cases assert the deliberately throwing cleanup callback.
      }
    }
    try {
      api.dispose();
    } catch {
      // Failure cases retain the original terminal disposal error for their assertions.
    }
    window.removeEventListener("error", onError);
    document.body.innerHTML = "";
  });

  function boot(cleanup: (name: string) => void): StarInstance {
    api.use({
      name: "proof.detached",
      version: "1.0.0",
      apiVersion: "^0.1.0",
      install(registrar) {
        registrar.directive({
          id: "proof.detached.owned",
          match: { name: "data-proof.detached:owned" },
          mount({ attribute }) {
            return () => cleanup(attribute.value);
          },
        });
        return {};
      },
    });
    $("#app").star();
    const instance = required($("#app").star("instance"));
    application = instance as DeclarativeApplication;
    return instance;
  }

  it.each([
    ["application", false],
    ["application", true],
    ["kernel", false],
    ["kernel", true],
  ] as const)(
    "releases detached records during %s destruction (cleanup throws: %s)",
    async (destroyVia, throws) => {
      const cleanup = vi.fn((name: string) => {
        if (throws && name === "first") throw new Error("detached cleanup failed");
      });
      const instance = boot(cleanup);
      const first = required(document.querySelector("#first"));
      const second = required(document.querySelector("#second"));
      const input = required(first.querySelector("input"));
      const button = required(second.querySelector("button"));
      first.remove();
      second.remove();
      removed.push(first, second);

      let failure: unknown;
      try {
        if (destroyVia === "application") instance.destroy();
        else api.dispose();
      } catch (error) {
        failure = error;
      }
      window.dispatchEvent(new Event("click"));
      input.value = "42";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      $(button).trigger("click");
      await Promise.resolve();

      expect(instance.destroyed).toBe(true);
      expect(cleanup.mock.calls).toEqual([["first"], ["second"]]);
      expect(failure instanceof Error).toBe(throws);
      expect(instance.state.count).toBe(0);
      expect(errors).toEqual([]);
      instance.destroy();
      expect(cleanup).toHaveBeenCalledTimes(2);
    },
  );

  it("keeps a live sibling active when a patch removes only one subtree", async () => {
    const cleanup = vi.fn();
    const instance = boot(cleanup);
    patchElements(required(document.querySelector("#app")), "", {
      mode: "remove",
      selector: "#first",
    });
    await api.whenEnhanced();

    expect(cleanup.mock.calls).toEqual([["first"]]);
    expect(instance.destroyed).toBe(false);
    window.dispatchEvent(new Event("click"));
    expect(instance.state.count).toBe(0);
    $("#second button").trigger("click");
    await api.nextUpdate();
    expect(instance.state.count).toBe(1);
    expect($("#second output").text()).toBe("1");
    instance.destroy();
    expect(cleanup.mock.calls).toEqual([["first"], ["second"]]);
    expect(errors).toEqual([]);
  });
});

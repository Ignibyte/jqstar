import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { StarPlugin } from "../src/core";
import {
  createStarHarness,
  runCoreConformance,
  runPluginConformance,
  StarConformanceError,
  type StarHarness,
} from "../src/testing";

const harnesses: StarHarness[] = [];

afterEach(() => {
  for (const harness of harnesses.splice(0)) {
    try {
      harness.dispose();
    } catch {
      // Failure cases assert the original terminal cleanup error before fallback teardown.
    }
  }
  document.body.innerHTML = "";
});

function createHarness(): StarHarness {
  const harness = createStarHarness({ window, jQuery: $ });
  harnesses.push(harness);
  return harness;
}

function required<Value>(value: Value | undefined): Value {
  if (value === undefined) throw new Error("The conformance fixture did not create its harness.");
  return value;
}

function errorsWithin(error: unknown): unknown[] {
  return error instanceof AggregateError
    ? [error, ...error.errors.flatMap((nested: unknown) => errorsWithin(nested))]
    : [error];
}

function plugin(cleanup?: () => void): StarPlugin {
  return {
    name: "proof.case-cleanup",
    version: "1.0.0",
    apiVersion: "^0.1.0",
    install(registrar) {
      if (cleanup) registrar.cleanup(cleanup);
      return {};
    },
  };
}

describe("conformance case ownership", () => {
  it.each([
    [1, false],
    [1, true],
    [2, false],
    [2, true],
    [3, false],
    [3, true],
  ] as const)(
    "disposes core case %s after task failure (cleanup also fails: %s)",
    async (selectedCase, cleanupFails) => {
      const workFailure = new Error("case task failed");
      const cleanupFailure = new Error("case cleanup failed");
      const cleanup = vi.fn(() => {
        if (cleanupFails) throw cleanupFailure;
      });
      let last: StarHarness | undefined;
      let count = 0;
      let failure: unknown;
      try {
        await runCoreConformance(() => {
          const harness = createHarness();
          count++;
          if (count === selectedCase) {
            last = harness;
            harness.install(plugin(cleanup));
            harness.task("fixture:failure", Promise.reject(workFailure));
          }
          return harness;
        });
      } catch (error) {
        failure = error;
      }

      expect(failure).toBeInstanceOf(StarConformanceError);
      expect(cleanup).toHaveBeenCalledOnce();
      expect(errorsWithin(failure)).toContain(workFailure);
      if (cleanupFails) expect(errorsWithin(failure)).toContain(cleanupFailure);
      expect(() => required(last).task("fixture:late", Promise.resolve())).toThrow("disposed");
    },
  );

  it("disposes the optional plugin case when its installation fails", async () => {
    const installFailure = new Error("cleanup fixture installation failed");
    const failing: StarPlugin = {
      ...plugin(),
      install() {
        throw installFailure;
      },
    };
    let last: StarHarness | undefined;
    let failure: unknown;
    try {
      await runPluginConformance({
        createHarness() {
          last = createHarness();
          return last;
        },
        plugin: plugin(),
        cleanupFailingPlugin: failing,
      });
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(StarConformanceError);
    expect(errorsWithin(failure)).toContain(installFailure);
    expect(() => required(last).task("fixture:late", Promise.resolve())).toThrow("disposed");
  });

  it("preserves the same terminal disposal error without duplicating it", async () => {
    const cleanupFailure = new Error("terminal cleanup failed");
    let count = 0;
    let last: StarHarness | undefined;
    let failure: unknown;
    try {
      await runCoreConformance(() => {
        const harness = createHarness();
        count++;
        if (count === 3) {
          last = harness;
          harness.install(
            plugin(() => {
              throw cleanupFailure;
            }),
          );
        }
        return harness;
      });
    } catch (error) {
      failure = error;
    }
    if (!(failure instanceof StarConformanceError)) {
      throw new Error("The expected conformance error was not reported.");
    }
    let terminal: unknown;
    try {
      required(last).dispose();
    } catch (error) {
      terminal = error;
    }
    expect(failure.errors).toEqual([terminal]);
    expect(errorsWithin(failure).filter((error) => error === cleanupFailure)).toHaveLength(1);
  });

  it("keeps successful core and expected plugin-cleanup cases passing", async () => {
    const core = await runCoreConformance(createHarness);
    expect(core.passed).toBe(3);
    const cleanup = vi.fn(() => {
      throw new Error("expected cleanup failure");
    });
    const result = await runPluginConformance({
      createHarness,
      plugin: plugin(),
      cleanupFailingPlugin: plugin(cleanup),
    });
    expect(result.passed).toBe(2);
    expect(cleanup).toHaveBeenCalledOnce();
  });
});

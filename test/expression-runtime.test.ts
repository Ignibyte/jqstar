import { describe, expect, it, vi } from "vitest";
import {
  bindStarExpressionRuntime,
  isStarExpressionCallResult,
  starExpressionRuntimeFor,
} from "../src/expression-runtime";
import type { ActionOperation } from "../src/observation";
import type { StarAction, StarContext, StarInstance } from "../src/types";

function application(): StarInstance {
  return { mode: "behavior" } as StarInstance;
}

function context(instance: StarInstance): StarContext {
  return { instance } as StarContext;
}

describe("internal expression runtime", () => {
  it("brands untouched action results and preserves application identity and arguments", () => {
    const instance = application();
    const action = vi.fn<StarAction>();
    const completed = vi.fn();
    const failed = vi.fn();
    let thenReads = 0;
    const value = Object.defineProperty({}, "then", {
      get: () => {
        thenReads += 1;
        return vi.fn();
      },
    });
    const startAction = vi.fn(
      (_label: string, _action: StarAction, _context: StarContext): ActionOperation =>
        Object.freeze({
          id: "operation-1",
          result: value,
          active: () => true,
          completed,
          failed,
          settle: vi.fn(),
        }),
    );
    const release = bindStarExpressionRuntime(instance, {
      resolveAction: (name) => (name === "save" ? action : undefined),
      resolveHelper: () => undefined,
      startAction,
    });
    const inputContext = context(instance);

    const result = starExpressionRuntimeFor(inputContext)!.invokeAction(
      "save",
      [1, "two"],
      inputContext,
    );

    expect(thenReads).toBe(0);
    expect(result).toMatchObject({ kind: "action", name: "save", value });
    expect(isStarExpressionCallResult(result)).toBe(true);
    expect(
      isStarExpressionCallResult({
        kind: "action",
        name: "save",
        value,
        active: expect.any(Function),
        completed,
        failed,
      }),
    ).toBe(false);
    expect(startAction).toHaveBeenCalledWith("save", action, {
      instance,
      args: [1, "two"],
    });
    result.completed();
    result.failed(new Error("ignored"));
    expect(completed).toHaveBeenCalledOnce();
    expect(failed).toHaveBeenCalledOnce();

    release();
    release();
    expect(starExpressionRuntimeFor(inputContext)).toBeUndefined();
  });

  it("invokes only the exact committed helper record and brands its raw result", () => {
    const instance = application();
    const helper = vi.fn((left: number, right: number) => ({ total: left + right }));
    bindStarExpressionRuntime(instance, {
      resolveAction: () => undefined,
      resolveHelper: (name) =>
        name === "acme.math.sum"
          ? Object.freeze({ name: "acme.math.sum", value: helper })
          : undefined,
      startAction: vi.fn(),
    });
    const runtime = starExpressionRuntimeFor(context(instance))!;

    const result = runtime.invokeHelper("acme.math.sum", [2, 3]);

    expect(helper).toHaveBeenCalledWith(2, 3);
    expect(result).toEqual({
      kind: "helper",
      name: "acme.math.sum",
      value: { total: 5 },
      active: expect.any(Function),
      completed: expect.any(Function),
      failed: expect.any(Function),
    });
    expect(isStarExpressionCallResult(result)).toBe(true);
    expect(() => runtime.invokeHelper("acme.math.missing", [])).toThrow(
      "Unknown jQuery Star expression helper",
    );
  });

  it("rejects a second runtime binding for one application", () => {
    const instance = application();
    const binding = {
      resolveAction: () => undefined,
      resolveHelper: () => undefined,
      startAction: vi.fn(),
    };
    bindStarExpressionRuntime(instance, binding);
    expect(() => bindStarExpressionRuntime(instance, binding)).toThrow(
      "already has an expression runtime",
    );
  });
});

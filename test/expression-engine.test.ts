import $ from "jquery";
import { expect, it, vi } from "vitest";
import {
  clearExpressionCache,
  compileStatement,
  createTrustedExpressionEngine,
} from "../src/expression";
import type { StarExpressionError } from "../src/expression";
import type { StarContext } from "../src/types";
import { runExpressionEngineConformance } from "./expression-engine-conformance";

function context(state: Record<string, unknown> = {}): StarContext {
  const root = document.createElement("section");
  const run = vi.fn();
  return {
    $,
    state,
    computed: {},
    root,
    $root: $(root),
    element: root,
    $element: $(root),
    instance: { run } as unknown as StarContext["instance"],
  };
}

runExpressionEngineConformance("trusted JavaScript", createTrustedExpressionEngine);

it("caches and clears values and statements by source and structural location", () => {
  const engine = createTrustedExpressionEngine();
  const location = { attribute: "data-text" };
  const value = engine.compileValue("$count", location);
  const statement = engine.compileStatement("state.count += 1", location);

  expect(engine.compileValue("$count", location)).toBe(value);
  expect(engine.compileStatement(" state.count += 1 ", location)).toBe(statement);
  expect(engine.compileValue("$count", { attribute: "data-show" })).not.toBe(value);

  engine.clearCache();

  expect(engine.compileValue("$count", location)).not.toBe(value);
  expect(engine.compileStatement("state.count += 1", location)).not.toBe(statement);
});

it("compiles action statements with and without arguments", async () => {
  const engine = createTrustedExpressionEngine();
  const current = context({ count: 3 });
  const action = engine.compileStatement("@save");

  expect(engine.compileStatement("@save")).toBe(action);
  await action(current);
  expect(current.instance.run).toHaveBeenLastCalledWith(
    "save",
    expect.objectContaining({ args: [] }),
  );

  await engine.compileStatement("@save($count, 'ready')")(current);
  expect(current.instance.run).toHaveBeenLastCalledWith(
    "save",
    expect.objectContaining({ args: [3, "ready"] }),
  );
});

it("preserves a structured argument failure through the named-action boundary", () => {
  const engine = createTrustedExpressionEngine();
  const current = context({});
  let failure: StarExpressionError | undefined;

  try {
    engine.compileStatement("@save(state.missing.call())", { attribute: "data-on:click" })(current);
  } catch (error) {
    failure = error as StarExpressionError;
  }

  expect(failure).toMatchObject({
    name: "StarExpressionError",
    phase: "evaluate",
    source: "[state.missing.call()]",
    location: { attribute: "data-on:click" },
  });
  expect(current.instance.run).not.toHaveBeenCalled();
});

it("disposes once and invalidates retained evaluators", () => {
  const engine = createTrustedExpressionEngine();
  const evaluate = engine.compileValue("$count");
  const current = context({ count: 3 });
  expect(evaluate(current)).toBe(3);

  engine.dispose();
  engine.dispose();

  expect(() => evaluate(current)).toThrow("This jQStar expression engine has been disposed.");
  expect(() => engine.compileValue("$count")).toThrow(
    "This jQStar expression engine has been disposed.",
  );
  expect(() => engine.clearCache()).toThrow("This jQStar expression engine has been disposed.");
});

it("clears the compatibility statement cache independently", () => {
  const engine = createTrustedExpressionEngine();
  const kernelStatement = engine.compileStatement("state.count += 1");
  const statement = compileStatement("state.count += 1");
  expect(compileStatement("state.count += 1")).toBe(statement);

  engine.clearCache();
  expect(compileStatement("state.count += 1")).toBe(statement);

  clearExpressionCache();

  expect(compileStatement("state.count += 1")).not.toBe(statement);
  expect(engine.compileStatement("state.count += 1")).not.toBe(kernelStatement);
});

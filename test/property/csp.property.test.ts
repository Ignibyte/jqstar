import fc from "fast-check";
import $ from "jquery";
import { describe, expect, it } from "vitest";
import { createCSPExpressionEngine } from "../../src/csp/engine";
import { isStarCSPExpressionError } from "../../src/csp/diagnostics";
import { parseCSP } from "../../src/csp/parser";
import type { StarContext } from "../../src/types";
import { assertProperty } from "./helpers";

function context(state: Record<string, unknown> = {}): StarContext {
  const root = document.createElement("section");
  return {
    $,
    state,
    computed: {},
    root,
    $root: $(root),
    element: root,
    $element: $(root),
    instance: {} as StarContext["instance"],
  };
}

function parseOutcome(source: string): string {
  try {
    return JSON.stringify(parseCSP(source, "value"));
  } catch (error) {
    expect(isStarCSPExpressionError(error)).toBe(true);
    const diagnostic = error as { readonly code: string; readonly span: unknown };
    return JSON.stringify({ code: diagnostic.code, span: diagnostic.span });
  }
}

describe("CSP parser and evaluator properties", () => {
  it("is total and deterministic for bounded UTF-16 input", () => {
    assertProperty(
      "csp-tokenizer-parser-totality",
      fc.property(fc.string({ maxLength: 300 }), (source) => {
        expect(parseOutcome(source)).toBe(parseOutcome(source));
      }),
    );
  });

  it("matches the finite arithmetic model", () => {
    assertProperty(
      "csp-arithmetic-model",
      fc.property(
        fc.integer({ min: -1_000, max: 1_000 }),
        fc.integer({ min: -1_000, max: 1_000 }),
        fc.constantFrom("+" as const, "-" as const, "*" as const),
        (left, right, operator) => {
          const engine = createCSPExpressionEngine();
          try {
            const result = engine.compileValue(`(${left}) ${operator} (${right})`)(context());
            const expected =
              operator === "+" ? left + right : operator === "-" ? left - right : left * right;
            expect(result).toBe(expected);
          } finally {
            engine.dispose();
          }
        },
      ),
    );
  });

  it("writes only the generated signal", () => {
    const signal = fc.stringMatching(/^[a-z][a-z0-9]{0,10}$/);
    assertProperty(
      "csp-signal-write-model",
      fc.property(
        signal,
        fc.integer({ min: -10_000, max: 10_000 }),
        fc.integer({ min: -1_000, max: 1_000 }),
        (name, initial, increment) => {
          const state = { [name]: initial, untouched: "same" };
          const engine = createCSPExpressionEngine();
          try {
            const result = engine.compileStatement(`$${name} += ${increment}; return $${name}`)(
              context(state),
            );
            expect(result).toBe(initial + increment);
            expect(state).toEqual({ [name]: initial + increment, untouched: "same" });
          } finally {
            engine.dispose();
          }
        },
      ),
    );
  });
});

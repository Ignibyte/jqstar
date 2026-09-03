import $ from "jquery";
import { describe, expect, it, vi } from "vitest";
import type {
  StarExpressionEngine,
  StarExpressionError,
  StarExpressionLocation,
} from "../src/expression";
import type { StarContext } from "../src/types";

export const expressionEngineConformanceCaseIds = [
  "values-and-statements",
  "jquery-and-context",
  "helpers-and-fixed-bindings",
  "named-actions",
  "asynchronous-results",
  "location-aware-errors",
] as const;

export type ExpressionEngineConformanceCaseId = (typeof expressionEngineConformanceCaseIds)[number];

export type CspConformanceDisposition = "exact-parity" | "csp-equivalent";

export interface CspConformanceAssignment {
  readonly disposition: CspConformanceDisposition;
  readonly downstreamCaseId: string;
}

export const expressionEngineCspAssignments = {
  "values-and-statements": {
    disposition: "exact-parity",
    downstreamCaseId: "csp-shared-values-statements",
  },
  "jquery-and-context": {
    disposition: "csp-equivalent",
    downstreamCaseId: "csp-shared-jquery-context",
  },
  "helpers-and-fixed-bindings": {
    disposition: "exact-parity",
    downstreamCaseId: "csp-shared-helpers",
  },
  "named-actions": {
    disposition: "exact-parity",
    downstreamCaseId: "csp-shared-actions",
  },
  "asynchronous-results": {
    disposition: "csp-equivalent",
    downstreamCaseId: "csp-shared-async",
  },
  "location-aware-errors": {
    disposition: "csp-equivalent",
    downstreamCaseId: "csp-shared-errors",
  },
} as const satisfies Record<ExpressionEngineConformanceCaseId, CspConformanceAssignment>;

interface ContextHarness {
  readonly context: StarContext;
  readonly element: HTMLElement;
  readonly root: HTMLElement;
  readonly run: ReturnType<typeof vi.fn>;
}

interface ExpressionEngineConformanceCase {
  readonly id: (typeof expressionEngineConformanceCaseIds)[number];
  run(engine: StarExpressionEngine): Promise<void> | void;
}

function harness(state: Record<string, unknown> = {}): ContextHarness {
  const root = document.createElement("section");
  const element = document.createElement("button");
  element.dataset.role = "save";
  root.append(element);
  const run = vi.fn(async () => "action-result");
  const event = $.Event("click");
  const context: StarContext = {
    $,
    state,
    computed: { doubled: 6 },
    root,
    $root: $(root),
    element,
    $element: $(element),
    event,
    args: ["input"],
    instance: { run } as unknown as StarContext["instance"],
  };
  return { context, element, root, run };
}

function thrown(work: () => unknown): StarExpressionError {
  try {
    work();
  } catch (error) {
    return error as StarExpressionError;
  }
  throw new Error("Expected an expression failure.");
}

const expressionEngineConformanceCases: readonly ExpressionEngineConformanceCase[] = [
  {
    id: "values-and-statements",
    async run(engine) {
      const current = harness({ count: 3 });

      expect(engine.compileValue("$count + computed.doubled")(current.context)).toBe(9);
      expect(engine.compileValue("signals === state")(current.context)).toBe(true);

      await engine.compileStatement("$count += 2")(current.context);
      expect(current.context.state.count).toBe(5);
    },
  },
  {
    id: "jquery-and-context",
    run(engine) {
      const current = harness({});
      const result = engine.compileValue(`[
        $ === state.jquery,
        $(el).attr("data-role"),
        el === $el[0],
        evt.type,
        root === $root[0],
        args[0],
        this === el
      ]`)({ ...current.context, state: { jquery: $ } });

      expect(result).toEqual([true, "save", true, "click", true, "input", true]);
    },
  },
  {
    id: "helpers-and-fixed-bindings",
    run(engine) {
      const current = harness({ count: 3, jquery: $ });
      const sum = vi.fn((left: number, right: number) => left + right);
      const result = engine.compileValue(`[
        $ === state.jquery,
        signals === state,
        acme.math.sum($count, computed.doubled)
      ]`)({
        ...current.context,
        helpers: {
          $: "shadowed helper",
          state: "shadowed helper",
          acme: { math: { sum } },
        },
      });

      expect(result).toEqual([true, true, 9]);
      expect(sum).toHaveBeenCalledWith(3, 6);
    },
  },
  {
    id: "named-actions",
    async run(engine) {
      const current = harness({ count: 3 });

      await expect(
        engine.compileStatement("@save($count, args[0])")(current.context),
      ).resolves.toBe("action-result");
      await expect(
        engine.compileValue(`action("save", $count, args[0])`)(current.context),
      ).resolves.toBe("action-result");
      expect(current.run).toHaveBeenNthCalledWith(
        1,
        "save",
        expect.objectContaining({ args: [3, "input"] }),
      );
      expect(current.run).toHaveBeenNthCalledWith(
        2,
        "save",
        expect.objectContaining({ args: [3, "input"] }),
      );
    },
  },
  {
    id: "asynchronous-results",
    async run(engine) {
      const current = harness({ count: 1 });

      await expect(engine.compileValue("Promise.resolve($count)")(current.context)).resolves.toBe(
        1,
      );
      await expect(
        engine.compileStatement("await Promise.resolve(); $count += 2; return $count")(
          current.context,
        ),
      ).resolves.toBe(3);
      expect(current.context.state.count).toBe(3);
    },
  },
  {
    id: "location-aware-errors",
    async run(engine) {
      const current = harness({});
      const location: StarExpressionLocation = {
        attribute: "data-text",
        line: 2,
        column: 4,
      };
      const compileFailure = thrown(() => engine.compileValue(")", location));
      expect(compileFailure).toMatchObject({
        name: "StarExpressionError",
        phase: "compile",
        source: ")",
        location,
      });
      expect(thrown(() => engine.compileStatement("if (", location))).toMatchObject({
        name: "StarExpressionError",
        phase: "compile",
        source: "if (",
        location,
      });

      const evaluationFailure = thrown(() =>
        engine.compileValue("state.missing.call()", location)(current.context),
      );
      expect(evaluationFailure).toMatchObject({
        name: "StarExpressionError",
        phase: "evaluate",
        source: "state.missing.call()",
        location,
      });
      expect(evaluationFailure.message).toContain("at data-text");

      await expect(
        engine.compileStatement(
          'await Promise.resolve(); throw new Error("async expression failure")',
          location,
        )(current.context),
      ).rejects.toMatchObject({
        name: "StarExpressionError",
        phase: "evaluate",
        location,
      });
    },
  },
];

export function runExpressionEngineConformance(
  name: string,
  createEngine: () => StarExpressionEngine,
): void {
  describe(`${name} expression-engine conformance`, () => {
    for (const conformanceCase of expressionEngineConformanceCases) {
      it(conformanceCase.id, async () => {
        const engine = createEngine();
        try {
          await conformanceCase.run(engine);
        } finally {
          engine.dispose();
        }
      });
    }
  });
}

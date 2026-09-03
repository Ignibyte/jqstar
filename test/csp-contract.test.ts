import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import $ from "jquery";
import { describe, expect, it, vi } from "vitest";
import { createTrustedExpressionEngine } from "../src/expression";
import type { StarContext } from "../src/types";
import { validateCspContract } from "../scripts/validate-csp-contract.mjs";
import {
  expressionEngineCspAssignments,
  expressionEngineConformanceCaseIds,
} from "./expression-engine-conformance";

interface AcceptedCase {
  readonly entryKind: "statement" | "value";
  readonly expected: {
    readonly outcome: string;
    readonly state?: Record<string, unknown>;
    readonly value?: unknown;
  };
  readonly id: string;
  readonly source: string;
}

interface ConformanceCase {
  readonly disposition:
    "csp-equivalent" | "exact-parity" | "intentionally-unsupported" | "migration-required";
  readonly downstreamCaseId: string;
  readonly id: string;
}

interface ConformanceMap {
  readonly featureCases: readonly ConformanceCase[];
  readonly publicExamples: readonly (ConformanceCase & { readonly source: string })[];
  readonly sharedCases: readonly ConformanceCase[];
}

const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

async function fixture<T>(name: string): Promise<T> {
  return JSON.parse(
    await readFile(resolve(repositoryRoot, "test/fixtures/csp", name), "utf8"),
  ) as T;
}

function trustedHarness(args: readonly unknown[] = ["input", "second"]) {
  const root = document.createElement("section");
  root.id = "app";
  root.setAttribute("data-jqs", "");
  const label = document.createElement("span");
  label.dataset.part = "label";
  const element = document.createElement("input");
  element.dataset.role = "save";
  element.value = "save";
  root.append(label, element);
  const state: Record<string, unknown> = {
    count: 2,
    name: " Ada ",
    profile: { name: "Ada" },
  };
  const run = vi.fn(async (name: string) => (name === "save" ? "saved" : "loaded"));
  const sum = vi.fn((left: number, right: number) => left + right);
  const context: StarContext = {
    $,
    state,
    computed: { double: 4 },
    root,
    $root: $(root),
    element,
    $element: $(element),
    event: $.Event("click"),
    args,
    helpers: { acme: { math: { sum } } },
    instance: { run } as unknown as StarContext["instance"],
  };
  return { context, label, run, state, sum };
}

describe("frozen CSP expression contract", () => {
  it("validates schemas, generated artifacts, coverage, boundaries, and inventory freshness", async () => {
    const result = await validateCspContract(repositoryRoot);

    expect(result).toMatchObject({
      grammarVersion: "jqstar-csp-expression/1",
      accepted: 34,
      denied: 57,
      adversarial: 46,
      contexts: 33,
    });
    expect(result.digest).toMatch(/^[a-f\d]{64}$/);
    expect(result.publicSources).toBeGreaterThan(200);
    expect(result.publicOccurrences).toBeGreaterThan(300);
  });

  it("keeps shared conformance metadata aligned with the authoritative map", async () => {
    const conformance = await fixture<ConformanceMap>("conformance-map.json");
    const mapped = Object.fromEntries(
      conformance.sharedCases.map(({ id, disposition, downstreamCaseId }) => [
        id,
        { disposition, downstreamCaseId },
      ]),
    );

    expect(conformance.sharedCases.map(({ id }) => id)).toEqual([
      ...expressionEngineConformanceCaseIds,
    ]);
    expect(mapped).toEqual(expressionEngineCspAssignments);
  });

  it("records every compatibility disposition and the known public migrations", async () => {
    const conformance = await fixture<ConformanceMap>("conformance-map.json");
    const dispositions = new Set(
      [...conformance.featureCases, ...conformance.sharedCases, ...conformance.publicExamples].map(
        ({ disposition }) => disposition,
      ),
    );

    expect(dispositions).toEqual(
      new Set([
        "exact-parity",
        "csp-equivalent",
        "migration-required",
        "intentionally-unsupported",
      ]),
    );
    expect(
      conformance.publicExamples.find(({ source }) => source.includes("console.log")),
    ).toMatchObject({
      disposition: "migration-required",
      id: expect.stringMatching(/^public-/),
    });
    expect(
      conformance.publicExamples.find(({ source }) => source === "$(el).datepicker()"),
    ).toMatchObject({ disposition: "migration-required" });
  });

  it("runs the positive finite-language vectors against the trusted engine where parity is exact", async () => {
    const accepted = await fixture<{ readonly cases: readonly AcceptedCase[] }>("accepted.json");
    const byId = new Map(accepted.cases.map((item) => [item.id, item]));
    const valueCases = [
      "literal-array",
      "object-literal",
      "all-bindings",
      "unary-operators",
      "arithmetic-precedence",
      "relational-equality",
      "short-circuit",
      "nullish-conditional",
      "computed-member",
      "action-call",
      "helper-call",
      "jquery-read",
      "string-method",
      "array-method",
      "property-absence",
      "multiline-span",
    ];
    const statementCases = [
      "signal-state-assignment",
      "compound-assignment",
      "postfix-update",
      "empty-return",
      "action-shorthand",
      "jquery-chain",
      "approved-async",
    ];

    for (const id of [...valueCases, ...statementCases]) {
      const item = byId.get(id);
      expect(item, `${id} must remain in the accepted corpus`).toBeDefined();
      const current = trustedHarness(id === "array-method" ? ["a", "b"] : undefined);
      const engine = createTrustedExpressionEngine();
      try {
        const result = await (item!.entryKind === "value"
          ? engine.compileValue(item!.source)(current.context)
          : engine.compileStatement(item!.source)(current.context));
        if (item!.expected.outcome !== "effect") expect(result).toEqual(item!.expected.value);
        if (item!.expected.state) expect(current.state).toMatchObject(item!.expected.state);
        if (id === "short-circuit") expect(current.run).not.toHaveBeenCalled();
        if (id === "jquery-chain") expect(current.label.textContent).toBe("Saved");
        if (id === "helper-call") expect(current.sum).toHaveBeenCalledWith(2, 2);
      } finally {
        engine.dispose();
      }
    }
  });
});

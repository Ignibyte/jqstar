import assert from "node:assert/strict";
import test from "node:test";
import { evaluateCoverage } from "../scripts/quality/coverage-report.mjs";

const path = "src/fixture.ts";
const metric = { total: 1, covered: 0, skipped: 0, pct: 0 };
const summary = {
  total: { lines: metric, functions: metric, statements: metric, branches: metric },
  [path]: { lines: metric, functions: metric, statements: metric, branches: metric },
};
const finalCoverage = {
  [path]: {
    statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 19 } } },
    s: { 0: 0 },
    fnMap: {},
    f: {},
    branchMap: {},
    b: {},
  },
};
const input = {
  summary,
  finalCoverage,
  thresholds: { global: { lines: 100 }, subsystems: { [path]: { lines: 100 } } },
  scope: { changedPaths: [path], changedLines: { [path]: [1] } },
  coveredPaths: new Set([path]),
  sourcesByPath: { [path]: "export const value = 1;\n" },
  stabilization: false,
  executedEvidence: { status: "pass", failures: [] },
  thresholdRatchet: { status: "fail", failures: ["threshold changed"] },
};

test("coverage diagnostic records misses without enforcing scores", () => {
  const strict = evaluateCoverage(input);
  const diagnostic = evaluateCoverage({ ...input, diagnostic: true });
  assert.equal(strict.status, "fail");
  assert.equal(diagnostic.status, "pass");
  assert.ok(
    diagnostic.changed.failures.some((failure) => failure.includes("uncovered changed lines")),
  );
  assert.equal(diagnostic.denominator.lines.pct, 0);
  assert.deepEqual(diagnostic.failures, []);
});

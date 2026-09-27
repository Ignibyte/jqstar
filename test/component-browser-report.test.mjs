import assert from "node:assert/strict";
import test from "node:test";
import {
  evaluateComponentRun,
  minimumComponentTests,
} from "../scripts/quality/component-browser-report.mjs";

const listed = { failureReason: null };
const executed = { failureReason: null };
const stats = { expected: minimumComponentTests, unexpected: 0, flaky: 0, skipped: 0 };
const evaluate = (
  selection = minimumComponentTests,
  list = listed,
  run = executed,
  result = { stats },
) => evaluateComponentRun(selection, list, run, result);

test("component evidence accepts a complete browser execution", () => {
  const report = evaluate();
  assert.equal(report.status, "pass");
  assert.equal(report.executedTests, minimumComponentTests);
});

test("component evidence rejects empty and incomplete selections", () => {
  for (const count of [0, minimumComponentTests - 1]) {
    assert.equal(evaluate(count).status, "fail");
  }
  assert.equal(evaluate(minimumComponentTests, { failureReason: "exited with 1" }).status, "fail");
});

test("component evidence rejects failed, flaky, skipped, and missing executions", () => {
  for (const name of ["unexpected", "flaky", "skipped"]) {
    const altered = { ...stats, expected: minimumComponentTests - 1, [name]: 1 };
    assert.equal(
      evaluate(minimumComponentTests, listed, executed, { stats: altered }).status,
      "fail",
    );
  }
  assert.equal(evaluate(minimumComponentTests, listed, executed, null).status, "fail");
  assert.equal(
    evaluate(minimumComponentTests, listed, { failureReason: "timed out" }).status,
    "fail",
  );
});

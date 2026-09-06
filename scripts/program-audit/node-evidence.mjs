import assert from "node:assert/strict";
import { safeRelativePath, sameKeys, timestamp } from "./contracts.mjs";

function countsAreComplete(counts, total) {
  assert(Number.isSafeInteger(total) && total > 0, "Node audit needs a nonempty test roster");
  assert(
    counts.tests === total &&
      counts.passed === total &&
      counts.topLevel === total &&
      counts.suites === 0,
    "Node audit counts disagree with the frozen roster",
  );
  for (const field of ["failed", "cancelled", "skipped", "todo"])
    assert(counts[field] === 0, "Node audit has incomplete tests");
}
export function selectNodeTest(report, citation, context) {
  assert(
    report.schema === "jqstar-node-test-audit/1" && report.success === true,
    "Node audit did not pass",
  );
  assert(
    report.node === context.node && report.runId === context.runId,
    "Node audit execution identity mismatch",
  );
  const start = timestamp(report.startedAt),
    end = timestamp(report.finishedAt);
  assert(
    start <= end && start >= context.start && end <= context.end,
    "Node audit is outside the frozen interval",
  );
  const key = ({ path, name }) => JSON.stringify([path, name]);
  assert(
    new Set(context.tests.map(key)).size === context.tests.length,
    "Frozen Node test roster has duplicates",
  );
  sameKeys(report.tests.map(key), context.tests.map(key), "Node test roster");
  countsAreComplete(report.counts, context.tests.length);
  const paths = [...new Set(context.tests.map((t) => t.path))];
  sameKeys(
    report.suites.map((s) => s.path),
    paths,
    "Node suite roster",
  );
  for (const suite of report.suites) {
    safeRelativePath(suite.path);
    assert(suite.success === true, "Node suite did not pass");
    countsAreComplete(suite.counts, context.tests.filter((t) => t.path === suite.path).length);
  }
  for (const test of report.tests) {
    safeRelativePath(test.path);
    assert(
      test.status === "pass" && test.skipped === false && test.todo === false,
      "Named Node test did not execute successfully",
    );
    assert(Number.isFinite(test.durationMs) && test.durationMs >= 0, "Invalid Node test duration");
  }
  const matches = report.tests.filter(
    (t) => t.path === citation.path && t.name === citation.selector,
  );
  assert(matches.length === 1, "Node citation is missing or ambiguous");
  return { path: citation.path, selector: citation.selector, status: "pass" };
}

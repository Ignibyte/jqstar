// @vitest-environment node
import assert from "node:assert/strict";
import { it } from "vitest";
import { selectNodeTest } from "../scripts/program-audit/node-evidence.mjs";

const start = Date.parse("2026-09-06T00:00:00.000Z");
const context = {
  start,
  end: start + 1000,
  node: "v24.20.0",
  runId: "node-audit-fixture",
  tests: [
    { path: "test/first.mjs", name: "owned cleanup" },
    { path: "test/second.mjs", name: "receipt refusal" },
  ],
};
const citation = { path: "test/first.mjs", selector: "owned cleanup" };
const counts = (total) => ({
  tests: total,
  failed: 0,
  passed: total,
  cancelled: 0,
  skipped: 0,
  todo: 0,
  topLevel: total,
  suites: 0,
});
function report() {
  return {
    schema: "jqstar-node-test-audit/1",
    startedAt: new Date(start).toISOString(),
    finishedAt: new Date(start + 500).toISOString(),
    node: context.node,
    runId: context.runId,
    success: true,
    counts: counts(2),
    tests: context.tests.map((test) => ({
      ...test,
      status: "pass",
      skipped: false,
      todo: false,
      durationMs: 1,
    })),
    suites: context.tests.map(({ path }) => ({ path, success: true, counts: counts(1) })),
  };
}
it("selects named Node tests against an independent complete source roster and parent interval", () => {
  assert.deepEqual(selectNodeTest(report(), citation, context), { ...citation, status: "pass" });
  assert.throws(() => selectNodeTest(report(), { ...citation, selector: "absent" }, context));
  assert.throws(() => selectNodeTest(report(), citation, { ...context, tests: [] }));
  assert.throws(() =>
    selectNodeTest(report(), citation, {
      ...context,
      tests: [context.tests[0], context.tests[0]],
    }),
  );
  assert.throws(() => selectNodeTest(report(), citation, { ...context, start: start + 1 }));
  assert.throws(() => selectNodeTest(report(), citation, { ...context, end: start + 499 }));
});
it("rejects incomplete Node execution, false totals, missing suites and mismatched identities", () => {
  const changes = [
    (r) => {
      r.success = false;
    },
    (r) => {
      r.node = "v0.0.0";
    },
    (r) => {
      r.runId = "another-run";
    },
    (r) => {
      r.tests.pop();
    },
    (r) => {
      r.tests.push(r.tests[0]);
    },
    (r) => {
      r.tests[0].name = "unknown";
    },
    (r) => {
      r.tests[0].status = "fail";
    },
    (r) => {
      r.tests[0].skipped = true;
    },
    (r) => {
      r.tests[0].todo = true;
    },
    (r) => {
      r.tests[0].durationMs = -1;
    },
    (r) => {
      r.counts.tests++;
    },
    (r) => {
      r.counts.passed--;
    },
    (r) => {
      r.counts.failed++;
    },
    (r) => {
      r.counts.cancelled++;
    },
    (r) => {
      r.counts.skipped++;
    },
    (r) => {
      r.counts.todo++;
    },
    (r) => {
      r.counts.suites++;
    },
    (r) => {
      r.counts.topLevel--;
    },
    (r) => {
      r.suites.pop();
    },
    (r) => {
      r.suites.push(r.suites[0]);
    },
    (r) => {
      r.suites[0].success = false;
    },
    (r) => {
      r.suites[0].counts.passed--;
    },
    (r) => {
      r.startedAt = "2000-01-01T00:00:00.000Z";
    },
    (r) => {
      r.finishedAt = "2099-01-01T00:00:00.000Z";
    },
    (r) => {
      r.finishedAt = new Date(start - 1).toISOString();
    },
  ];
  for (const change of changes) {
    const invalid = report();
    change(invalid);
    assert.throws(() => selectNodeTest(invalid, citation, context));
  }
});

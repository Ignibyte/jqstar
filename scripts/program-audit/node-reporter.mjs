import assert from "node:assert/strict";
import { isAbsolute, relative } from "node:path";

export default async function* reporter(events) {
  const startedAt = new Date().toISOString();
  const tests = [];
  const summaries = [];
  let complete;
  for await (const { type, data } of events) {
    if (["test:pass", "test:fail"].includes(type)) {
      assert(tests.length < 4096, "Node audit test count exceeded");
      assert(
        data.nesting === 0 && data.details.type === "test",
        "Unsupported nested Node audit test",
      );
      assert(isAbsolute(data.file), "Node audit test source is missing");
      const path = relative(process.cwd(), data.file).split("\\").join("/");
      assert(
        path && !path.startsWith("../") && !isAbsolute(path),
        "Node audit test is outside source",
      );
      tests.push({
        path,
        name: data.name,
        status: type === "test:pass" ? "pass" : "fail",
        skipped: !!data.skip,
        todo: !!data.todo,
        durationMs: data.details.duration_ms,
      });
    }
    if (type === "test:summary") {
      if (data.file) {
        summaries.push({
          path: relative(process.cwd(), data.file).split("\\").join("/"),
          success: data.success,
          counts: data.counts,
        });
      } else {
        assert(!complete, "Duplicate final Node audit summary");
        complete = data;
      }
    }
  }
  assert(complete, "Missing final Node audit summary");
  const report = {
    schema: "jqstar-node-test-audit/1",
    startedAt,
    finishedAt: new Date().toISOString(),
    node: process.version,
    runId: process.env.JQS_PROGRAM_AUDIT_RUN_ID,
    success: complete.success,
    counts: complete.counts,
    tests,
    suites: summaries,
  };
  assert(typeof report.runId === "string" && report.runId, "Missing Node audit run identity");
  yield JSON.stringify(report) + "\n";
}

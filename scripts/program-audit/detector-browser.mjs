import assert from "node:assert/strict";
import { resolve, relative } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { boundedText, sameKeys, safeRelativePath, timestamp } from "./contracts.mjs";

function specs(suites, output = [], depth = 0) {
  assert(depth <= 32, "Detector suite nesting exceeds its bound");
  for (const suite of suites) {
    output.push(...suite.specs);
    specs(suite.suites ?? [], output, depth + 1);
    assert(output.length <= 1, "Detector browser selection is not exactly one test");
  }
  return output;
}
function interval(start, duration, context) {
  assert(Number.isFinite(duration) && duration >= 0, "Invalid detector duration");
  const from = timestamp(start),
    until = from + duration;
  assert(
    from >= context.start && until <= context.end,
    "Detector execution is outside its parent interval",
  );
  return { start: from, end: until };
}
// Report/schema and attachment identities come from the independently validated index.
export function validateBrowserDetector(report, expected, context) {
  const retry = expected.retry === true;
  assert(
    report.config.rootDir === resolve(context.sourceRoot, "e2e") &&
      report.config.configFile === resolve(context.sourceRoot, "playwright.config.ts"),
    "Detector browser source differs from frozen source",
  );
  assert(
    report.config.version === context.playwrightVersion,
    "Detector browser tool differs from frozen tool",
  );
  assert(
    report.config.failOnFlakyTests === true &&
      report.config.shard === null &&
      report.config.workers === 1,
    "Detector browser supervision differs",
  );
  assert.deepEqual(
    report.config.argv,
    [
      context.nodePath,
      resolve(context.sourceRoot, "node_modules/.bin/playwright"),
      ...expected.args,
    ],
    "Detector browser invocation differs",
  );
  sameKeys(
    report.config.projects.map((p) => p.name),
    retry ? ["quality-selftest"] : context.projects,
    "Detector configured projects",
  );
  for (const project of report.config.projects) {
    assert(
      project.id === project.name &&
        project.outputDir === resolve(expected.directory, "test-results") &&
        project.testDir === report.config.rootDir,
      "Detector project identity or artifact location differs",
    );
    assert(
      project.repeatEach === 1 && project.retries === (retry ? 2 : 0) && project.timeout === 60000,
      "Detector project execution limits differ",
    );
  }
  assert(report.errors.length === 0, "Detector browser has runner errors");
  assert(
    report.stats.expected === 0 &&
      report.stats.skipped === 0 &&
      report.stats.unexpected === (retry ? 0 : 1) &&
      report.stats.flaky === (retry ? 1 : 0),
    "Detector browser totals differ",
  );
  const suiteInterval = interval(report.stats.startTime, report.stats.duration, context);
  const all = specs(report.suites);
  assert(all.length === 1, "Detector browser selection is not exactly one test");
  const spec = all[0];
  assert(
    spec.file === "quality-contracts.spec.ts" && spec.title === expected.title && spec.ok === retry,
    "Detector test identity or result differs",
  );
  assert(spec.tests.length === 1, "Detector has multiple test executions");
  const test = spec.tests[0];
  assert(
    test.projectName === expected.project &&
      test.projectId === expected.project &&
      test.expectedStatus === "passed" &&
      test.status === (retry ? "flaky" : "unexpected"),
    "Detector test project or status differs",
  );
  assert(
    Array.isArray(test.annotations) && test.annotations.length === 0,
    "Detector test has annotations",
  );
  assert(test.results.length === (retry ? 2 : 1), "Detector attempt count differs");
  let lastEnd = suiteInterval.start;
  const traces = [];
  for (const [index, result] of test.results.entries()) {
    assert(
      result.status === (index === 0 ? "failed" : "passed") && result.retry === index,
      "Detector attempt did not fail then recover as expected",
    );
    const executed = interval(result.startTime, result.duration, suiteInterval);
    assert(executed.start >= lastEnd, "Detector retry overlaps its prior attempt");
    lastEnd = executed.end;
    assert(result.errors.length === (index === 0 ? 1 : 0), "Detector attempt error count differs");
    if (index === 0) {
      const error = result.errors[0];
      boundedText(error.message, "Detector assertion error", 1048576);
      assert(
        expected.error.test(stripVTControlCharacters(error.message)),
        "Direct detector assertion is missing",
      );
      assert(
        error.location?.file === resolve(context.sourceRoot, "e2e/quality-contracts.spec.ts"),
        "Detector assertion came from another source",
      );
      assert(
        Number.isSafeInteger(error.location.line) &&
          error.location.line > 0 &&
          error.location.line <= context.sourceLines.length,
        "Detector assertion line is outside frozen source",
      );
      assert(
        Number.isSafeInteger(error.location.column) &&
          error.location.column > 0 &&
          error.location.column <= context.sourceLines[error.location.line - 1].length + 1,
        "Detector assertion column is outside frozen source",
      );
    }
    assert(Array.isArray(result.attachments), "Detector attachments are missing");
    const attemptTraces = result.attachments.filter((a) => a.name === "trace");
    assert(
      attemptTraces.length === (index === 0 ? 1 : 0),
      "Detector trace must belong to the failed attempt",
    );
    for (const attachment of attemptTraces) {
      assert(
        attachment.contentType === "application/zip",
        "Detector trace has another content type",
      );
      const path = relative(resolve(expected.directory, "test-results"), attachment.path);
      safeRelativePath(path);
      assert(
        resolve(expected.directory, "test-results", path) === attachment.path,
        "Detector trace path is not canonical",
      );
      traces.push(attachment.path);
    }
  }
  assert(traces.length === 1, "Detector failure has no unique retained trace");
  return {
    status: "pass",
    project: expected.project,
    title: expected.title,
    attempts: test.results.length,
    traces,
  };
}

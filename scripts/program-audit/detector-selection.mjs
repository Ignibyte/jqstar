import assert from "node:assert/strict";
import { resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { sameKeys, safeRelativePath, timestamp } from "./contracts.mjs";

export function listedIdentities(suites, project, output = [], parents = []) {
  assert(parents.length < 32, "Detector listing nesting exceeds its bound");
  for (const suite of suites) {
    const ancestry = [...parents, suite.title];
    for (const spec of suite.specs) {
      safeRelativePath(spec.file);
      assert(
        typeof spec.title === "string" && spec.title.length > 0 && spec.tests.length === 1,
        "Invalid detector listing identity",
      );
      const test = spec.tests[0];
      assert(
        test.projectName === project && test.projectId === project,
        "Detector listing contains another project",
      );
      output.push({ identity: JSON.stringify([spec.file, ...ancestry, spec.title]), spec, test });
      assert(output.length <= 10000, "Detector listing exceeds its bound");
    }
    listedIdentities(suite.suites ?? [], project, output, ancestry);
  }
  return output;
}
// Expected test names are frozen before invocation by the caller.
export function validateDetectorSelection(report, raws, context) {
  const empty = context.empty === true;
  assert(
    report.schema === "jqstar-browser-quality/1" &&
      report.runId === context.runId &&
      report.mode === "selection" &&
      report.status === (empty ? "fail" : "pass"),
    "Detector selection report identity or status differs",
  );
  assert(
    report.listOnly === true &&
      report.shard === null &&
      report.workers === 1 &&
      report.repeatEach === 1 &&
      report.trace === "retain-on-failure",
    "Detector selection execution policy differs",
  );
  sameKeys(
    report.projects.map((p) => p.project),
    context.projects,
    "Detector selected projects",
  );
  sameKeys(Object.keys(raws), context.projects, "Detector listing artifact roster");
  sameKeys(Object.keys(context.expectedTests), context.projects, "Frozen detector listing roster");
  let selected = 0;
  for (const row of report.projects) {
    const project = row.project,
      root = resolve(context.directory, "playwright/browser-report", project),
      raw = raws[project];
    assert.deepEqual(
      row.artifacts,
      {
        root,
        testResults: resolve(root, "test-results"),
        htmlReport: resolve(root, "html"),
        jsonReport: resolve(root, "results.json"),
      },
      "Detector selection artifact paths differ",
    );
    for (const key of [
      "runExitCode",
      "executedTests",
      "passedTests",
      "failedTests",
      "flakyTests",
      "skippedTests",
    ])
      assert(row[key] === null, "Detector listing was substituted for execution");
    assert(row.listExitCode === (empty ? 1 : 0), "Detector listing exit differs");
    assert(
      raw.config.version === context.playwrightVersion &&
        raw.config.rootDir === resolve(context.sourceRoot, "e2e") &&
        raw.config.configFile === resolve(context.sourceRoot, "playwright.config.ts"),
      "Detector listing tool or source differs",
    );
    assert(
      raw.config.failOnFlakyTests === true && raw.config.shard === null && raw.config.workers === 1,
      "Detector listing supervision differs",
    );
    assert.deepEqual(
      raw.config.argv,
      [
        context.nodePath,
        resolve(context.sourceRoot, "node_modules/.bin/playwright"),
        "test",
        "--list",
        `--project=${project}`,
        ...(empty ? ["--grep=__jqstar_missing_quality_test__"] : []),
      ],
      "Detector listing command differs",
    );
    sameKeys(
      raw.config.projects.map((p) => p.name),
      context.configuredProjects,
      "Detector listing configured projects",
    );
    for (const configured of raw.config.projects)
      assert(
        configured.id === configured.name &&
          configured.testDir === raw.config.rootDir &&
          configured.outputDir === resolve(root, "test-results") &&
          configured.repeatEach === 1 &&
          configured.retries === 2 &&
          configured.timeout === 60000,
        "Detector listing project policy differs",
      );
    const start = timestamp(raw.stats.startTime);
    assert(
      Number.isFinite(raw.stats.duration) &&
        raw.stats.duration >= 0 &&
        start >= context.start &&
        start + raw.stats.duration <= context.end,
      "Detector listing interval differs",
    );
    const cases = listedIdentities(raw.suites, project);
    assert(
      raw.stats.expected === 0 &&
        raw.stats.unexpected === 0 &&
        raw.stats.flaky === 0 &&
        raw.stats.skipped === cases.length,
      "Detector listing totals contradict its records",
    );
    assert(
      Number.isSafeInteger(row.selectedTests) &&
        row.selectedTests === cases.length &&
        (empty ? cases.length === 0 : cases.length > 0),
      "Detector selection count differs",
    );
    if (empty) {
      assert(
        raw.errors.length === 1 &&
          typeof raw.errors[0].message === "string" &&
          stripVTControlCharacters(raw.errors[0].message) === "Error: No tests found",
        "Detector empty selection failed for another reason",
      );
    } else {
      assert(raw.errors.length === 0, "Detector green listing has runner errors");
      sameKeys(
        cases.map((c) => c.identity),
        context.expectedTests[project],
        "Detector listing test roster",
      );
    }
    for (const { spec, test } of cases)
      assert(
        spec.ok === true &&
          test.expectedStatus === "passed" &&
          test.status === "skipped" &&
          test.results.length === 0 &&
          test.annotations.length === 0,
        "Detector listing unexpectedly executed or annotated a test",
      );
    selected += cases.length;
  }
  return {
    status: "pass",
    outcome: empty ? "refused-empty-selection" : "listed-nonempty-roster",
    projects: context.projects.length,
    selectedTests: selected,
  };
}

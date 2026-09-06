import assert from "node:assert/strict";
import { isAbsolute, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { sameKeys, sha256, timestamp } from "./contracts.mjs";
import {
  detectorExpectations,
  browserExpectations,
  configuredProjects,
  selectionProjects,
  failedGateExpectations,
} from "./detector-policy.mjs";
import { validateBrowserDetector } from "./detector-browser.mjs";
import { validateDetectorSelection } from "./detector-selection.mjs";
function validateDetectorSummary(report, context) {
  const gate = context.gate;
  assert(
    gate.id === "ticket-0044-detector-self-test" &&
      gate.status === "pass" &&
      gate.enforced === true &&
      gate.selection.selected === true &&
      gate.exitCode === 0 &&
      gate.signal === null,
    "Detector parent did not execute successfully",
  );
  assert.deepEqual(gate.command, context.command, "Detector parent command differs");
  assert(
    gate.timeoutMs === context.timeoutMs && gate.toolVersion === context.npmVersion,
    "Detector parent tool or timeout differs",
  );
  const start = timestamp(gate.startedAt),
    end = timestamp(gate.endedAt);
  assert(
    start <= end && start >= context.auditStart && end <= context.auditEnd,
    "Detector parent interval differs",
  );
  assert(
    report.schema === "jqstar-quality-0044-self-test/1" &&
      report.mode === "self-test" &&
      report.runId === context.runId &&
      report.status === "pass",
    "Detector report identity or status differs",
  );
  sameKeys(
    report.checks.map((c) => c.name),
    detectorExpectations.map((c) => c[0]),
    "Detector control roster",
  );
  for (const [name, expected, detector, directory] of detectorExpectations) {
    const check = report.checks.find((c) => c.name === name);
    assert(
      check.expected === expected &&
        check.status === "pass" &&
        check.detector === detector.source &&
        check.detectorMatched === true &&
        check.evidenceMatched === true &&
        check.evidenceFailure === null,
      "Detector control expectation or result differs",
    );
    assert(
      Number.isSafeInteger(check.exitCode) &&
        (expected === "red" ? check.exitCode > 0 : check.exitCode === 0),
      "Detector process outcome differs",
    );
    assert(
      check.artifactDirectory ===
        (directory === null ? null : resolve(context.fixtureDirectory, directory)),
      "Detector artifact directory differs",
    );
    assert(
      typeof check.output === "string" && check.output.length > 0 && check.output.length <= 2000,
      "Detector summary output is missing or exceeds its bound",
    );
    if (!directory?.startsWith("playwright/"))
      assert(
        detector.test(stripVTControlCharacters(check.output)),
        "Direct detector output is missing",
      );
  }
  return { start, end, checks: report.checks.length };
}
function validateFailedGate(report, expected, context) {
  assert(
    report.schema === expected.schema &&
      report.runId === context.runId &&
      report.mode === expected.mode &&
      report.status === "fail",
    "Detector child report identity or status differs",
  );
  sameKeys(
    report.checks.map((c) => c.name),
    expected.checks,
    "Detector child check roster",
  );
  assert.deepEqual(
    report.checks.filter((c) => c.status !== "pass").map((c) => [c.name, c.status]),
    [[expected.failure, "fail"]],
    "Detector child failed for another reason",
  );
  const failed = report.checks.find((c) => c.name === expected.failure);
  assert(
    typeof failed.detail === "string" &&
      failed.detail.length <= 65536 &&
      expected.error.test(failed.detail),
    "Detector child failure diagnostic differs",
  );
  return { status: "pass", checks: report.checks.length, failure: expected.failure };
}
function validateApiDetector(artifacts, context) {
  const directory = context.directory;
  assert(
    artifacts.baseline === "corrupted API report\n",
    "API detector comparison baseline differs",
  );
  assert(
    typeof artifacts.golden === "string" &&
      artifacts.golden.length > 0 &&
      typeof artifacts.generated === "string" &&
      artifacts.generated.length > 0,
    "API detector public or generated report is empty",
  );
  assert(
    artifacts.generated.replace(/\r\n/gu, "\n") === artifacts.golden.replace(/\r\n/gu, "\n"),
    "API detector generated declarations differ from the frozen public baseline",
  );
  assert.deepEqual(
    artifacts.config,
    {
      projectFolder: context.sourceRoot,
      mainEntryPointFilePath: resolve(context.sourceRoot, "dist/types/index.d.ts"),
      apiReport: {
        enabled: true,
        reportFileName: "jquery-star.api.md",
        reportFolder: resolve(directory, "baseline"),
        reportTempFolder: resolve(directory, "temporary"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      messages: { extractorMessageReporting: { "ae-missing-release-tag": { logLevel: "none" } } },
    },
    "API detector configuration differs from the frozen invocation",
  );
  return {
    status: "pass",
    comparison: "CRLF-to-LF text comparison; original byte identities retained",
  };
}

// The caller verifies the parent quality envelope and execution index, then loads all
// reports and binary artifacts against their independently frozen references.
export function selectDetector(report, selector, artifacts, context) {
  const interval = validateDetectorSummary(report, context);
  assert(
    isAbsolute(context.sourceRoot) && resolve(context.sourceRoot) === context.sourceRoot,
    "Invalid detector source root",
  );
  assert(
    isAbsolute(context.fixtureDirectory) &&
      resolve(context.fixtureDirectory) === context.fixtureDirectory,
    "Invalid detector artifact root",
  );
  assert(
    typeof context.fixtureSource === "string" &&
      sha256(context.fixtureSource) === context.fixtureSha256,
    "Detector fixture differs from the frozen source",
  );
  assert(
    typeof artifacts.api.golden === "string" &&
      sha256(artifacts.api.golden) === context.apiGoldenSha256,
    "Detector API baseline differs from the frozen source",
  );
  const common = {
    ...interval,
    sourceRoot: context.sourceRoot,
    nodePath: context.nodePath,
    playwrightVersion: context.playwrightVersion,
    sourceLines: context.fixtureSource.split("\n"),
    projects: configuredProjects,
  };
  sameKeys(
    Object.keys(artifacts.browser),
    browserExpectations.map((row) => row[0]),
    "Raw detector browser roster",
  );
  const browser = {},
    tracePaths = [];
  for (const [name, project, title, grep, error] of browserExpectations) {
    const retry = name === "retry-pass-is-red";
    assert(
      context.fixtureSource.includes(JSON.stringify(title)),
      "Detector title is absent from the frozen fixture",
    );
    const expected = {
      retry,
      project,
      title,
      error,
      directory: resolve(context.fixtureDirectory, retry ? "retry-pass" : `playwright/${name}`),
      args: retry
        ? ["test", "--config", "playwright.config.ts", "--project=quality-selftest"]
        : ["test", "e2e/quality-contracts.spec.ts", `--project=${project}`, "--grep", grep],
    };
    const result = validateBrowserDetector(artifacts.browser[name], expected, common);
    browser[name] = result;
    tracePaths.push(...result.traces);
  }
  sameKeys(Object.keys(context.traceReferences), tracePaths, "Indexed detector traces");
  sameKeys(Object.keys(artifacts.traces), tracePaths, "Loaded detector traces");
  for (const path of tracePaths) {
    const expected = context.traceReferences[path],
      actual = artifacts.traces[path];
    assert(
      actual.path === expected.path &&
        actual.sha256 === expected.sha256 &&
        actual.bytes === expected.bytes &&
        Number.isSafeInteger(actual.bytes) &&
        actual.bytes > 0 &&
        actual.signature === "504b0304",
      "Detector trace differs from its indexed nonempty ZIP artifact",
    );
  }
  sameKeys(Object.keys(artifacts.selections), ["empty", "green"], "Detector selection controls");
  const selections = {};
  for (const name of ["empty", "green"]) {
    const input = artifacts.selections[name],
      empty = name === "empty";
    selections[name] = validateDetectorSelection(input.report, input.projects, {
      ...common,
      empty,
      runId: context.runId,
      directory: resolve(context.fixtureDirectory, empty ? "empty-selection" : "browser-green"),
      projects: selectionProjects,
      configuredProjects,
      expectedTests: context.selectedTests,
    });
  }
  const green = report.checks.find((check) => check.name === "browser-selection-green-control");
  const selected = Number(
    /browser quality: 8 projects, (\d+) selected tests/u.exec(
      stripVTControlCharacters(green.output),
    )?.[1],
  );
  assert(
    selected === selections.green.selectedTests,
    "Detector summary selected count contradicts raw listings",
  );
  const failed = {};
  for (const kind of ["package", "release"]) {
    failed[kind] = validateFailedGate(artifacts[kind], failedGateExpectations[kind], context);
    const child = artifacts[kind].checks.find((check) => check.name === failed[kind].failure);
    const summary = report.checks.find(
      (check) => check.name === (kind === "package" ? "package-budget" : "artifact-manifest-drift"),
    );
    assert(
      stripVTControlCharacters(summary.output).includes(`${child.name}: ${child.detail}`),
      "Detector summary contradicts its raw child failure",
    );
  }
  const api = validateApiDetector(artifacts.api, {
    sourceRoot: context.sourceRoot,
    directory: resolve(context.fixtureDirectory, "api-report"),
  });
  const details = {
    ...browser,
    "browser-empty-selection": selections.empty,
    "browser-selection-green-control": selections.green,
    "package-budget": failed.package,
    "artifact-manifest-drift": failed.release,
    "api-report-drift": api,
  };
  const selectedCheck = report.checks.find((check) => check.name === selector);
  assert(selectedCheck, "Unknown exact detector selector");
  return {
    status: "pass",
    name: selectedCheck.name,
    expected: selectedCheck.expected,
    controls: interval.checks,
    detail: details[selector] ?? {
      exitCode: selectedCheck.exitCode,
      detector: selectedCheck.detector,
    },
  };
}

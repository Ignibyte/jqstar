import assert from "node:assert/strict";
import { resolve } from "node:path";
import { timestamp } from "./contracts.mjs";
import {
  evaluateCoverage,
  evaluateCoverageThresholdRatchet,
  verifyExecutedTestEvidence,
} from "../quality/coverage-report.mjs";
import { validateCoverageMaps } from "./coverage-maps.mjs";
import { validateCoverageExecution } from "./coverage-execution.mjs";

// The caller validates the parent quality envelope and execution index, and freezes the
// census, sources, scope, policy, baseline and collected-test roster independently.
export function selectCoverage(report, selector, artifacts, context) {
  assert(
    ["delivery", "stabilization"].includes(context.coverageMode),
    "Invalid frozen coverage mode",
  );
  assert(
    report.schema === "jqstar-coverage-report/1" &&
      report.status === "pass" &&
      report.runId === context.runId &&
      report.mode === context.coverageMode,
    "Coverage report belongs to another run or mode, or did not pass",
  );
  assert(
    report.censusExitCode === 0 && report.testExitCode === 0 && report.testSignal === null,
    "Coverage child processes did not complete successfully",
  );
  const gate = context.gate;
  assert(
    gate.id === "coverage" &&
      gate.status === "pass" &&
      gate.enforced === true &&
      gate.selection.selected === true &&
      gate.exitCode === 0 &&
      gate.signal === null,
    "Coverage parent gate did not execute successfully",
  );
  assert.deepEqual(
    gate.command,
    context.coverageCommand,
    "Coverage parent command differs from the frozen command",
  );
  assert(
    gate.timeoutMs === context.coverageTimeoutMs && gate.toolVersion === context.npmVersion,
    "Coverage parent tool or time limit differs from the frozen contract",
  );
  const start = timestamp(gate.startedAt);
  const end = timestamp(gate.endedAt);
  assert(
    start <= end && start >= context.auditStart && end <= context.auditEnd,
    "Coverage parent is outside the audit interval",
  );
  assert(context.scope.head === context.commit, "Frozen coverage scope has another commit");
  assert.deepEqual(
    context.scope.startFingerprint,
    context.fingerprint,
    "Frozen coverage scope has another fingerprint",
  );
  assert.deepEqual(
    report.scope,
    {
      schema: context.scope.schema,
      source: resolve(context.sourceRoot, context.scopePath),
      base: context.scope.base,
      head: context.commit,
      startFingerprint: context.fingerprint,
      changedPaths: context.scope.changedPaths,
    },
    "Coverage report scope differs from the frozen source",
  );
  assert(
    typeof context.baseCommit === "string" &&
      /^[a-f0-9]{40}$/.test(context.baseCommit) &&
      context.baseCommit === (context.scope.base ?? context.scope.head),
    "Coverage has no matching immutable threshold baseline",
  );
  assert(
    context.testManifest.requirements.length > 0,
    "Frozen executed-requirement manifest is empty",
  );
  const maps = validateCoverageMaps(artifacts.summary, artifacts.hits, artifacts.sources, context);
  const execution = validateCoverageExecution(artifacts.executed, { ...context, start, end });
  const measuredPaths = new Set(context.expectedPaths);
  const evaluated = evaluateCoverage({
    summary: maps.summary,
    finalCoverage: maps.hits,
    thresholds: context.thresholds,
    scope: context.scope,
    coveredPaths: new Set(context.scope.changedPaths.filter((path) => measuredPaths.has(path))),
    stabilization: context.coverageMode === "stabilization",
    sourcesByPath: artifacts.sources,
    executedEvidence: verifyExecutedTestEvidence(context.testManifest, execution.normalized),
    thresholdRatchet: evaluateCoverageThresholdRatchet(
      context.thresholds,
      context.baselineThresholds,
      context.baseCommit,
    ),
  });
  assert(evaluated.status === "pass", "Independent coverage evaluation did not pass");
  for (const [key, value] of Object.entries(JSON.parse(JSON.stringify(evaluated))))
    assert.deepEqual(report[key], value, "Coverage report contradicts independent evaluation");
  switch (selector) {
    case "denominator":
      return { status: "pass", files: maps.files, metrics: maps.totals };
    case "delivery-floors":
    case "stabilization-floors": {
      assert(
        selector === `${context.coverageMode}-floors`,
        "Coverage mode cannot satisfy the requested floors",
      );
      return { status: "pass", mode: context.coverageMode, thresholds: evaluated.thresholds };
    }
    case "threshold-ratchet":
      return evaluated.thresholdRatchet;
    case "changed-production":
      return JSON.parse(JSON.stringify(evaluated.changed));
    case "executed-requirements":
      return {
        status: "pass",
        tests: execution.tests,
        files: execution.files,
        repeatedDisplayNames: execution.repeatedDisplayNames,
        evidence: evaluated.executedEvidence,
      };
    default:
      throw new Error("Unknown exact coverage selector");
  }
}

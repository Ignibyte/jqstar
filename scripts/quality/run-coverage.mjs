import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import {
  classifyPath,
  existedAtRevision,
  loadQualityScope,
  qualityEvidencePath,
  qualityRunId,
  readJson,
  removePath,
  repoPath,
  run,
  writeJsonAtomic,
} from "./lib.mjs";
import {
  evaluateCoverage,
  evaluateCoverageThresholdRatchet,
  verifyExecutedTestEvidence,
} from "./coverage-report.mjs";

const reportDirectory = process.env.JQS_QUALITY_RUN_DIRECTORY
  ? qualityEvidencePath("coverage")
  : repoPath("coverage/quality");
const gateReport = qualityEvidencePath("coverage-gate.json");
const coverageMode = process.argv.includes("--stabilization") ? "stabilization" : "delivery";
const runId = qualityRunId();
const executedTestsReport = qualityEvidencePath("executed-tests.json");

function readBaseThresholds(base) {
  const path = "quality/coverage-thresholds.json";
  if (!base || !existedAtRevision(path, base)) return null;
  return JSON.parse(
    execFileSync("git", ["show", `${base}:${path}`], {
      cwd: repoPath("."),
      encoding: "utf8",
    }),
  );
}

async function main() {
  const stabilization = coverageMode === "stabilization";
  const scope = await loadQualityScope();
  const census = await readJson(repoPath("quality/production-census.json"));
  const thresholds = await readJson(repoPath("quality/coverage-thresholds.json"));
  await removePath(reportDirectory);
  await removePath(executedTestsReport);

  const censusRun = await run(process.execPath, [
    repoPath("scripts/quality/verify-production-census.mjs"),
  ]);
  const testRun =
    censusRun.code === 0
      ? await run(
          repoPath("node_modules/.bin/vitest"),
          [
            "run",
            "--config",
            "vitest.coverage.config.ts",
            "--coverage",
            "--reporter=json",
            "--outputFile",
            executedTestsReport,
          ],
          { env: { JQS_COVERAGE_DIRECTORY: reportDirectory } },
        )
      : { code: 1, signal: null };

  let evaluation;
  try {
    const summary = await readJson(resolve(reportDirectory, "coverage-summary.json"));
    const finalCoverage = await readJson(resolve(reportDirectory, "coverage-final.json"));
    const coveredPaths = new Set(
      scope.changedPaths.filter((path) =>
        classifyPath(path, census).some((rule) => rule.kind === "coverage"),
      ),
    );
    const sourcesByPath = Object.fromEntries(
      await Promise.all(
        [...coveredPaths].map(async (path) => [path, await readFile(repoPath(path), "utf8")]),
      ),
    );
    const executedEvidence = verifyExecutedTestEvidence(
      await readJson(repoPath("quality/test-evidence.json")),
      await readJson(executedTestsReport),
    );
    const thresholdRatchet = evaluateCoverageThresholdRatchet(
      thresholds,
      readBaseThresholds(scope.base),
      scope.base,
    );
    evaluation = evaluateCoverage({
      summary,
      finalCoverage,
      thresholds,
      scope,
      coveredPaths,
      stabilization,
      sourcesByPath,
      executedEvidence,
      thresholdRatchet,
    });
  } catch (error) {
    evaluation = {
      status: "error",
      failures: [`Coverage reports are unreadable: ${error.message}`],
    };
  }

  const status =
    censusRun.code === 0 && testRun.code === 0 && evaluation.status === "pass" ? "pass" : "fail";
  await writeJsonAtomic(gateReport, {
    schema: "jqstar-coverage-report/1",
    runId,
    mode: coverageMode,
    status,
    censusExitCode: censusRun.code,
    testExitCode: testRun.code,
    testSignal: testRun.signal,
    scope: {
      schema: scope.schema,
      source: scope.source,
      base: scope.base,
      head: scope.head,
      startFingerprint: scope.startFingerprint,
      changedPaths: scope.changedPaths,
    },
    ...evaluation,
  });
  console.log(`Coverage gate ${status}. Report: ${gateReport}`);
  for (const failure of evaluation.failures ?? []) console.error(`- ${failure}`);
  if (status !== "pass") process.exitCode = 1;
}

main().catch(async (error) => {
  console.error(error.message);
  try {
    await writeJsonAtomic(gateReport, {
      schema: "jqstar-coverage-report/1",
      runId,
      mode: coverageMode,
      status: "error",
      censusExitCode: -1,
      testExitCode: -1,
      testSignal: null,
      scope: {
        schema: "jqstar-quality-scope/error-1",
        base: null,
        changedPaths: [],
      },
      failures: [error.message],
    });
  } catch (writeError) {
    console.error(`Coverage result write failed: ${writeError.message}`);
  }
  process.exitCode = 1;
});

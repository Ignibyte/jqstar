import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFileSync, spawnSync } from "node:child_process";

import fc from "fast-check";
import { describe, expect, it } from "vitest";

import {
  evaluateCoverage,
  evaluateCoverageThresholdRatchet,
  verifyExecutedTestEvidence,
} from "../../scripts/quality/coverage-report.mjs";
import { existedAtRevision, repoPath } from "../../scripts/quality/lib.mjs";
import { validatePropertyUsage } from "../../scripts/quality/run-properties.mjs";
import {
  emittedRuntimeJavaScript,
  validateClassifications,
} from "../../scripts/quality/verify-production-census.mjs";

function metrics(covered = 1, total = 1) {
  return Object.fromEntries(
    ["lines", "functions", "branches", "statements"].map((metric) => [
      metric,
      { total, covered, skipped: 0, pct: total === 0 ? 0 : (covered / total) * 100 },
    ]),
  );
}

function coverageFixture(statementCount = 1) {
  const path = "src/example.ts";
  const absolute = repoPath(path);
  return {
    summary: { total: metrics(), [absolute]: metrics(statementCount, 1) },
    finalCoverage: {
      [absolute]: {
        statementMap: { 0: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } } },
        s: { 0: statementCount },
        fnMap: {
          0: {
            name: "example",
            decl: { start: { line: 1, column: 0 }, end: { line: 1, column: 7 } },
            loc: { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } },
          },
        },
        f: { 0: statementCount },
      },
    },
    thresholds: {
      global: { lines: 100, functions: 100, branches: 100, statements: 100 },
      subsystems: { [path]: { lines: 100, functions: 100, branches: 100 } },
      stabilizationTargets: {},
    },
    scope: { changedPaths: [path], changedLines: { [path]: [1] } },
    coveredPaths: new Set([path]),
    stabilization: false,
    sourcesByPath: { [path]: "export function example() { return true; }\n" },
    executedEvidence: { status: "pass", failures: [] },
    thresholdRatchet: { status: "not-applicable", failures: [] },
  };
}

describe("quality detector liveness", () => {
  it("rejects a coverage report after covered tests are deleted", () => {
    const green = evaluateCoverage(coverageFixture(1));
    const sabotaged = evaluateCoverage(coverageFixture(0));
    expect(green.status).toBe("pass");
    expect(sabotaged.status).toBe("fail");
    expect(sabotaged.failures.join(" ")).toContain("uncovered changed");
  });

  it("rejects runtime-emitting changed lines omitted from coverage maps", () => {
    const fixture = coverageFixture(1);
    fixture.scope.changedLines["src/example.ts"] = [1, 2];
    fixture.sourcesByPath["src/example.ts"] =
      "export const first = 1;\nexport const omitted = 2;\n";
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.changed.files[0].unexplainedLines).toEqual([2]);
    expect(result.failures.join(" ")).toContain("runtime-emitting changed lines absent");
  });

  it("records type-erased changed lines as explicit non-runtime evidence", () => {
    const fixture = coverageFixture(1);
    const path = "src/example.ts";
    fixture.finalCoverage[repoPath(path)].statementMap[0] = {
      start: { line: 2, column: 0 },
      end: { line: 2, column: 23 },
    };
    fixture.finalCoverage[repoPath(path)].fnMap[0].decl.start.line = 2;
    fixture.finalCoverage[repoPath(path)].fnMap[0].decl.end.line = 2;
    fixture.finalCoverage[repoPath(path)].fnMap[0].loc.start.line = 2;
    fixture.finalCoverage[repoPath(path)].fnMap[0].loc.end.line = 2;
    fixture.scope.changedLines[path] = [1, 2];
    fixture.sourcesByPath[path] =
      "export type Value = string;\nexport function example() { return true; }\n";
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("pass");
    expect(result.changed.files[0].typeOrFormatOnlyLines).toEqual([1]);
    expect(result.changed.files[0].unexplainedLines).toEqual([]);
  });

  it("requires explicit acknowledgement for random property audits", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jqstar-audit-acknowledgement-"));
    const options = {
      cwd: repoPath("."),
      encoding: "utf8",
      env: {
        ...process.env,
        JQS_QUALITY_RUN_DIRECTORY: directory,
        JQS_QUALITY_RUN_ID: "acknowledgement-sabotage",
      },
    };
    try {
      const property = spawnSync(
        process.execPath,
        [repoPath("scripts/quality/run-properties.mjs"), "--audit"],
        options,
      );
      expect(property.status).toBe(1);
      expect(property.stderr).toContain("--acknowledge-random-audit");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("classifies new files against the delivery base rather than HEAD", async () => {
    const directory = await mkdtemp(join(tmpdir(), "jqstar-delivery-base-"));
    const git = (args) =>
      execFileSync("git", args, { cwd: directory, encoding: "utf8", stdio: "pipe" }).trim();
    try {
      git(["init", "--quiet"]);
      git(["config", "user.email", "quality@example.com"]);
      git(["config", "user.name", "Quality Test"]);
      await writeFile(join(directory, "existing.ts"), "export const existing = true;\n", "utf8");
      git(["add", "existing.ts"]);
      git(["commit", "--quiet", "-m", "base"]);
      const base = git(["rev-parse", "HEAD"]);
      await writeFile(join(directory, "new.ts"), "export const added = true;\n", "utf8");
      git(["add", "new.ts"]);
      git(["commit", "--quiet", "-m", "head"]);

      expect(existedAtRevision("new.ts", "HEAD", directory)).toBe(true);
      expect(existedAtRevision("new.ts", base, directory)).toBe(false);
      expect(existedAtRevision("existing.ts", base, directory)).toBe(true);
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("replays the same generated counterexample from its seed and path", () => {
    const property = fc.property(fc.integer(), (value) => value < 0);
    const first = fc.check(property, { seed: 43, numRuns: 100 });
    expect(first.failed).toBe(true);
    if (!first.failed) throw new Error("The sabotage property unexpectedly passed.");
    const replay = fc.check(property, {
      seed: first.seed,
      path: first.counterexamplePath,
      numRuns: 100,
    });
    expect(replay.failed).toBe(true);
    if (!replay.failed) throw new Error("The saved property path did not replay.");
    expect(replay.counterexample).toEqual(first.counterexample);
  });

  it("rejects unknown and multiply consumed property replay paths", () => {
    const usage = (id, pathConsumed = false) => ({
      id,
      seed: 43,
      configuredRuns: id === "short" ? 30 : 100,
      effectiveRuns: id === "short" ? 30 : 100,
      skips: 0,
      shrinks: 0,
      status: "pass",
      replayPath: pathConsumed ? "2:1" : null,
      pathConsumed,
    });
    const unknown = validatePropertyUsage([usage("known")], {
      replayName: "missing",
      replayPath: "2:1",
    });
    const duplicate = validatePropertyUsage([usage("known", true), usage("short", true)], {
      replayName: "known",
      replayPath: "2:1",
    });
    const replay = validatePropertyUsage([usage("known", true), usage("short")], {
      replayName: "known",
      replayPath: "2:1",
    });
    expect(unknown.status).toBe("fail");
    expect(unknown.failures.join(" ")).toContain("unknown or duplicate property id missing");
    expect(duplicate.status).toBe("fail");
    expect(duplicate.failures.join(" ")).toContain("consumed exactly once");
    expect(replay.status).toBe("pass");
    expect(replay.consumedBy).toEqual(["known"]);
    expect(replay.effectiveRuns).toBe(130);
  });

  it("rejects coverage policy ratchet weakening", () => {
    const coverageBase = {
      global: { lines: 90, functions: 80, branches: 70, statements: 90 },
      subsystems: { "src/value.ts": { lines: 90 } },
      stabilizationTargets: { "src/value.ts": { lines: 100 } },
    };
    const coverageCurrent = {
      ...structuredClone(coverageBase),
      ratchet: {
        comparison: "immutable-delivery-base",
        firstBaseline: "establish-when-base-has-no-thresholds",
      },
    };
    coverageCurrent.global.lines = 89;
    const coverage = evaluateCoverageThresholdRatchet(coverageCurrent, coverageBase, "base");
    expect(coverage.status).toBe("fail");
    expect(coverage.failures.join(" ")).toContain("weakens immutable-base value 90");
  });

  it("records explicit first-baseline ratchet semantics", () => {
    const coverage = evaluateCoverageThresholdRatchet(
      {
        ratchet: {
          comparison: "immutable-delivery-base",
          firstBaseline: "establish-when-base-has-no-thresholds",
        },
      },
      null,
      "base",
    );
    expect(coverage.status).toBe("first-baseline");
  });

  it("rejects uncategorized production files and runtime-emitting type exclusions", () => {
    const census = {
      rules: [{ id: "source", kind: "coverage", prefixes: ["src/"], suffixes: [".ts"] }],
    };
    const result = validateClassifications(census, ["src/value.ts", "server/new.ts"], {});
    expect(result.failures).toEqual([
      "server/new.ts: expected exactly one classification, found 0.",
    ]);
    expect(emittedRuntimeJavaScript("export interface Value { id: string }", "types.ts")).toBe("");
    expect(emittedRuntimeJavaScript("export const value = 1", "types.ts")).toContain("value = 1");
  });

  it("maps every required behavior to exactly one machine-recorded passing test", async () => {
    const manifest = JSON.parse(await readFile(repoPath("quality/test-evidence.json"), "utf8"));
    const testResults = manifest.requirements.map((requirement) => ({
      name: repoPath(requirement.file),
      assertionResults: [{ title: requirement.test, status: "passed" }],
    }));
    const green = verifyExecutedTestEvidence(manifest, { success: true, testResults });
    expect(green.status).toBe("pass");
    expect(green.matchedRequirements).toBe(manifest.requirements.length);

    const missing = structuredClone(testResults);
    missing[0].assertionResults[0].title = "similar source substring only";
    expect(
      verifyExecutedTestEvidence(manifest, { success: true, testResults: missing }).status,
    ).toBe("fail");
    const duplicate = [...testResults, structuredClone(testResults[0])];
    expect(
      verifyExecutedTestEvidence(manifest, { success: true, testResults: duplicate }).failures.join(
        " ",
      ),
    ).toContain("expected exactly one executed test, found 2");
    const failed = structuredClone(testResults);
    failed[0].assertionResults[0].status = "failed";
    expect(
      verifyExecutedTestEvidence(manifest, { success: false, testResults: failed }).status,
    ).toBe("fail");
  });
});

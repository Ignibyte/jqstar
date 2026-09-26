import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, matchesGlob } from "node:path";
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
  collectCensusFiles,
  emittedRuntimeJavaScript,
  validateClassifications,
  validateRuntimeClassifications,
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

function functionHeaderFixture() {
  const fixture = coverageFixture();
  const path = "src/example.ts";
  fixture.sourcesByPath[path] =
    "export function example(\n  value = 1,\n): number {\n  return value;\n}\n";
  fixture.scope.changedLines[path] = [1, 2, 3, 4];
  const coverage = fixture.finalCoverage[repoPath(path)];
  coverage.statementMap[0] = {
    start: { line: 4, column: 2 },
    end: { line: 4, column: 15 },
  };
  coverage.fnMap[0].loc = {
    start: { line: 3, column: 10 },
    end: { line: 5, column: 1 },
  };
  coverage.branchMap = {
    0: {
      type: "default-arg",
      locations: [{ start: { line: 2, column: 10 }, end: { line: 2, column: 11 } }],
    },
  };
  coverage.b = { 0: [1] };
  return { fixture, coverage };
}

describe("quality detector liveness", () => {
  it("checks the complete production roster when no production file changed", () => {
    const fixture = coverageFixture();
    fixture.scope = { changedPaths: [], changedLines: {} };
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("pass");
    expect(result.changed.status).toBe("not-measured");
    expect(result.roster).toEqual({
      status: "pass",
      expectedPaths: ["src/example.ts"],
      summaryPaths: ["src/example.ts"],
      hitPaths: ["src/example.ts"],
      failures: [],
    });
  });

  it.each(["summary", "finalCoverage"])("rejects an unchanged file missing from %s", (key) => {
    const fixture = coverageFixture();
    fixture.scope = { changedPaths: [], changedLines: {} };
    fixture.coveredPaths.add("src/unchanged.ts");
    const absolute = repoPath("src/unchanged.ts");
    if (key === "summary") fixture.finalCoverage[absolute] = {};
    else fixture.summary[absolute] = metrics();
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.roster.status).toBe("fail");
    expect(result.failures.join(" ")).toContain("missing production files: src/unchanged.ts");
  });

  it.each(["summary", "finalCoverage"])("rejects an unexpected file in %s", (key) => {
    const fixture = coverageFixture();
    fixture.scope = { changedPaths: [], changedLines: {} };
    fixture[key][repoPath("src/types-only.ts")] = {};
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.roster.failures.join(" ")).toContain("unexpected files: src/types-only.ts");
  });

  it.each(["summary", "finalCoverage"])("rejects duplicate normalized paths in %s", (key) => {
    const fixture = coverageFixture();
    fixture[key]["./src/example.ts"] = fixture[key][repoPath("src/example.ts")];
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.roster.failures.join(" ")).toContain("repeats normalized paths: src/example.ts");
  });

  it("rejects duplicate normalized paths in the expected roster", () => {
    const fixture = coverageFixture();
    fixture.coveredPaths.add("./src/example.ts");
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.roster.failures.join(" ")).toContain("repeats normalized paths: src/example.ts");
  });

  it("rejects an empty expected roster independently of the changed scope", () => {
    const fixture = coverageFixture();
    fixture.scope = { changedPaths: [], changedLines: {} };
    fixture.coveredPaths.clear();
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.roster.failures).toContain("The expected production coverage roster is empty.");
  });

  it("uses function and default-argument hits for headers absent from V8 statement maps", () => {
    const { fixture } = functionHeaderFixture();
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("pass");
    expect(result.changed.files[0].unexplainedLines).toEqual([]);
  });

  it.each([0, undefined])("rejects function headers with invocation count %s", (count) => {
    const { fixture, coverage } = functionHeaderFixture();
    coverage.f[0] = count;
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.failures.join(" ")).toContain("uncovered changed lines 1, 2, 3");
  });

  it.each([0, undefined])("rejects a default initializer with count %s", (count) => {
    const { fixture, coverage } = functionHeaderFixture();
    coverage.b[0] = [count];
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.failures.join(" ")).toContain("uncovered changed lines 2");
  });

  it("does not credit an omitted body statement from function invocation", () => {
    const { fixture, coverage } = functionHeaderFixture();
    coverage.statementMap = {};
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.changed.files[0].unexplainedLines).toEqual([4]);
  });

  it("does not override zero statement hits with positive function hits", () => {
    const { fixture, coverage } = functionHeaderFixture();
    coverage.statementMap[1] = { start: { line: 1, column: 0 }, end: { line: 1, column: 10 } };
    coverage.s[1] = 0;
    coverage.s[0] = 0;
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.failures.join(" ")).toContain("uncovered changed lines 1, 4");
  });

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

  it("attributes a multiline declaration header to its executed initializer", () => {
    const fixture = coverageFixture(3);
    fixture.sourcesByPath["src/example.ts"] =
      "export function example() {\n  const value =\n    true;\n  return value;\n}\n";
    fixture.scope.changedLines["src/example.ts"] = [2];
    fixture.finalCoverage[repoPath("src/example.ts")].statementMap[0] = {
      start: { line: 3, column: 4 },
      end: { line: 3, column: 8 },
    };
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("pass");
    expect(result.changed.files[0].coverageMappedLines).toEqual([2]);
    expect(result.changed.files[0].initializerHeaderEvidence).toEqual([
      {
        line: 2,
        initializerStartLine: 3,
        mappedStatements: [{ id: "0", line: 3, hits: 3 }],
        hitCount: 3,
      },
    ]);
  });

  it("rejects a multiline declaration header when its initializer was not executed", () => {
    const fixture = coverageFixture(0);
    fixture.sourcesByPath["src/example.ts"] =
      "export function example() {\n  const value =\n    true;\n  return value;\n}\n";
    fixture.scope.changedLines["src/example.ts"] = [2];
    fixture.finalCoverage[repoPath("src/example.ts")].statementMap[0] = {
      start: { line: 3, column: 4 },
      end: { line: 3, column: 8 },
    };
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.failures.join(" ")).toContain("uncovered changed lines 2");
  });

  it("does not attribute an unrelated following statement to an unmapped initializer", () => {
    const fixture = coverageFixture(1);
    fixture.sourcesByPath["src/example.ts"] =
      "export function example() {\n  const value =\n    true;\n  return value;\n}\n";
    fixture.scope.changedLines["src/example.ts"] = [2];
    fixture.finalCoverage[repoPath("src/example.ts")].statementMap[0] = {
      start: { line: 4, column: 2 },
      end: { line: 4, column: 15 },
    };
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.changed.files[0].unexplainedLines).toEqual([2]);
  });

  it("rejects a multiline declaration with no initializer coverage mapping", () => {
    const fixture = coverageFixture(1);
    fixture.sourcesByPath["src/example.ts"] =
      "export function example() {\n  const value =\n    true;\n  return value;\n}\n";
    fixture.scope.changedLines["src/example.ts"] = [2];
    const coverage = fixture.finalCoverage[repoPath("src/example.ts")];
    coverage.statementMap = {};
    coverage.s = {};
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.changed.files[0].unexplainedLines).toEqual([2]);
  });

  it("does not borrow a hit after the initializer on the same line", () => {
    const fixture = coverageFixture(1);
    fixture.sourcesByPath["src/example.ts"] =
      "export function example() {\n  const value =\n    true; return value;\n}\n";
    fixture.scope.changedLines["src/example.ts"] = [2];
    fixture.finalCoverage[repoPath("src/example.ts")].statementMap[0] = {
      start: { line: 3, column: 10 },
      end: { line: 3, column: 23 },
    };
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.changed.files[0].unexplainedLines).toEqual([2]);
  });

  it("keeps an explicit zero hit on the header even when its initializer ran", () => {
    const fixture = coverageFixture(1);
    fixture.sourcesByPath["src/example.ts"] =
      "export function example() {\n  const value =\n    true;\n  return value;\n}\n";
    fixture.scope.changedLines["src/example.ts"] = [2];
    const coverage = fixture.finalCoverage[repoPath("src/example.ts")];
    coverage.statementMap[0] = {
      start: { line: 3, column: 4 },
      end: { line: 3, column: 8 },
    };
    coverage.statementMap[1] = {
      start: { line: 2, column: 2 },
      end: { line: 2, column: 15 },
    };
    coverage.s[1] = 0;
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.failures.join(" ")).toContain("uncovered changed lines 2");
    expect(result.changed.files[0].initializerHeaderEvidence).toEqual([]);
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

  it.each([
    ["let value: string;", "pass"],
    ["let value = readValue();", "fail"],
    ["let { value } = readValue();", "fail"],
    ["let value: string; readValue();", "fail"],
    ["readValue(); let value: string;", "fail"],
  ])("classifies only an isolated uninitialized binding: %s", (source, status) => {
    const fixture = coverageFixture();
    const path = "src/example.ts";
    fixture.sourcesByPath[path] = `${source}\nexport function example() { return true; }\n`;
    fixture.scope.changedLines[path] = [1];
    const coverage = fixture.finalCoverage[repoPath(path)];
    coverage.statementMap[0].start.line = 2;
    coverage.statementMap[0].end.line = 2;
    for (const location of [coverage.fnMap[0].decl, coverage.fnMap[0].loc]) {
      location.start.line = 2;
      location.end.line = 2;
    }
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe(status);
    expect(result.changed.files[0].unexplainedLines).toEqual(status === "pass" ? [] : [1]);
    if (status === "pass") {
      expect(result.changed.files[0].coverageMapExemptEvidence).toEqual([
        { line: 1, reason: "binding declaration without an initializer" },
      ]);
    }
  });

  it("rejects an unexecuted binding when the coverage map supplies its counter", () => {
    const fixture = coverageFixture(0);
    fixture.sourcesByPath["src/example.ts"] = "let value: string;\n";
    const result = evaluateCoverage(fixture);
    expect(result.status).toBe("fail");
    expect(result.failures.join(" ")).toContain("uncovered changed lines 1");
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

  it("excludes the actual type-only corpus from coverage and keeps the configured denominator exact", async () => {
    const census = JSON.parse(await readFile(repoPath("quality/production-census.json"), "utf8"));
    const packageJson = JSON.parse(await readFile(repoPath("package.json"), "utf8"));
    const files = await collectCensusFiles(census);
    const result = validateClassifications(census, files, packageJson.scripts);
    expect(result.failures).toEqual([]);
    for (const path of [
      "src/types.ts",
      "src/csp/ast.ts",
      "src/expression-types.ts",
      "src/inspect/types.ts",
      "src/metadata-types.ts",
      "src/persist/types.ts",
      "src/stores/types.ts",
      "src/testing/types.ts",
    ]) {
      expect(result.assignments.find((assignment) => assignment.path === path)).toEqual({
        path,
        kind: "semantic-exclusion",
        rule: "type-only-source",
      });
    }
    expect(census.rules.find((rule) => rule.id === "type-only-source").evidence).toEqual([
      "npm run typecheck",
    ]);
    const include = census.rules.flatMap((rule) =>
      rule.kind === "coverage" ? (rule.coverageGlobs ?? []) : [],
    );
    const configured = files.filter(
      (path) =>
        include.some((pattern) => matchesGlob(path, pattern)) &&
        !census.coverageExcludeGlobs.some((pattern) => matchesGlob(path, pattern)),
    );
    expect(configured).toEqual(
      result.assignments
        .filter((assignment) => assignment.kind === "coverage")
        .map(({ path }) => path),
    );
    const sources = Object.fromEntries(
      await Promise.all(
        files
          .filter((path) => path.endsWith(".ts") && !path.endsWith(".d.ts"))
          .map(async (path) => [path, await readFile(repoPath(path), "utf8")]),
      ),
    );
    expect(validateRuntimeClassifications(result.assignments, sources)).toEqual([]);
  });

  it("rejects runtime coverage for erased declarations, comments, and type imports", () => {
    const path = "src/new.ts";
    for (const source of [
      "export interface Value { id: string }",
      "// There are no executable statements.\n",
      'import type { Value } from "./value.js"; export type Alias = Value;',
      "declare const external: string;",
    ]) {
      expect(
        validateRuntimeClassifications([{ path, kind: "coverage" }], { [path]: source }),
      ).toEqual([`${path}: runtime coverage contains no runtime JavaScript.`]);
      expect(
        validateRuntimeClassifications([{ path, kind: "semantic-exclusion" }], {
          [path]: source,
        }),
      ).toEqual([]);
    }
  });

  it("rejects a type exclusion that gains an export or side-effect import", () => {
    const path = "src/types.ts";
    for (const source of ['import "./effects.js";', "export const value = 1;"]) {
      expect(
        validateRuntimeClassifications([{ path, kind: "semantic-exclusion" }], {
          [path]: source,
        }),
      ).toEqual([`${path}: semantic exclusion emits runtime JavaScript.`]);
      expect(
        validateRuntimeClassifications([{ path, kind: "coverage" }], { [path]: source }),
      ).toEqual([]);
    }
  });

  it("requires actual sources without compiling declaration inputs", () => {
    expect(
      validateRuntimeClassifications(
        [
          { path: "src/runtime.ts", kind: "coverage" },
          { path: "src/types.ts", kind: "semantic-exclusion" },
          { path: "src/vendor.d.ts", kind: "semantic-exclusion" },
          { path: "scripts/types.d.mts", kind: "semantic-exclusion" },
        ],
        {},
      ),
    ).toEqual([
      "src/runtime.ts: source is missing for runtime classification.",
      "src/types.ts: source is missing for runtime classification.",
    ]);
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

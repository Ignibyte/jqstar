// @vitest-environment node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { it } from "vitest";
import { sha256 } from "../scripts/program-audit/contracts.mjs";
import { validateCoverageMaps } from "../scripts/program-audit/coverage-maps.mjs";
import { validateCoverageExecution } from "../scripts/program-audit/coverage-execution.mjs";
import { selectCoverage } from "../scripts/program-audit/coverage.mjs";
import { validateMappings } from "../scripts/program-audit/requirements.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

const sourceRoot = resolve(tmpdir(), "jqstar-independent-coverage-source");
const path = "src/choose.ts";
const absolute = resolve(sourceRoot, path);
const start = Date.parse("2026-09-06T00:00:00.000Z");
const location = (line, column, endLine, endColumn) => ({
  start: { line, column },
  end: { line: endLine, column: endColumn },
});

// Handwritten source, counters and expected report; no production evaluator builds expectations.
function fixture({ changed = false, stabilization = false } = {}) {
  const source = "export function choose(flag: boolean) {\n  return flag ? 1 : 0;\n}\n";
  const measured = {
    lines: { total: 2, covered: 2, skipped: 0, pct: 100 },
    functions: { total: 1, covered: 1, skipped: 0, pct: 100 },
    statements: { total: 2, covered: 2, skipped: 0, pct: 100 },
    branches: { total: 2, covered: 2, skipped: 0, pct: 100 },
  };
  const thresholds = {
    global: { lines: 90, functions: 90, statements: 90, branches: 90 },
    subsystems: { [path]: { lines: 90, functions: 90, branches: 90 } },
    stabilizationTargets: { [path]: { lines: 100, functions: 100, branches: 100 } },
    ratchet: {
      comparison: "immutable-delivery-base",
      firstBaseline: "establish-when-base-has-no-thresholds",
    },
  };
  const requirement = { id: "choice", file: "test/choose.test.ts", test: "selects both values" };
  const commit = "a".repeat(40);
  const fingerprint = { algorithm: "sha256", digest: "b".repeat(64), fileCount: 2 };
  const command = { executable: "npm", args: ["run", "test:coverage"] };
  const context = {
    runId: "coverage-audit-fixture",
    sourceRoot,
    coverageMode: stabilization ? "stabilization" : "delivery",
    commit,
    fingerprint,
    gate: {
      id: "coverage",
      status: "pass",
      enforced: true,
      selection: { selected: true },
      exitCode: 0,
      signal: null,
      command: structuredClone(command),
      timeoutMs: 600000,
      toolVersion: "11.19.0",
      startedAt: new Date(start).toISOString(),
      endedAt: new Date(start + 1000).toISOString(),
    },
    coverageCommand: command,
    coverageTimeoutMs: 600000,
    npmVersion: "11.19.0",
    auditStart: start - 100,
    auditEnd: start + 1100,
    scope: {
      schema: "jqstar-quality-scope/1",
      base: commit,
      head: commit,
      startFingerprint: fingerprint,
      changedPaths: changed ? [path] : [],
      changedLines: changed ? { [path]: [2] } : {},
    },
    scopePath: "scope.json",
    expectedPaths: [path],
    sourceDigests: { [path]: sha256(source) },
    expectedTests: [{ path: requirement.file, name: "choice > selects both values" }],
    thresholds,
    baseCommit: commit,
    baselineThresholds: structuredClone(thresholds),
    testManifest: { $schema: "jqstar-test-evidence/1", requirements: [requirement] },
  };
  const artifacts = {
    sources: { [path]: source },
    summary: { total: structuredClone(measured), [absolute]: structuredClone(measured) },
    hits: {
      [absolute]: {
        path: absolute,
        all: false,
        statementMap: { 0: location(1, 0, 3, 1), 1: location(2, 2, 2, 22) },
        s: { 0: 2, 1: 2 },
        fnMap: {
          0: { name: "choose", decl: location(1, 16, 1, 22), loc: location(1, 0, 3, 1), line: 1 },
        },
        f: { 0: 2 },
        branchMap: {
          0: {
            type: "branch",
            line: 2,
            loc: location(2, 9, 2, 21),
            locations: [location(2, 16, 2, 17), location(2, 20, 2, 21)],
          },
        },
        b: { 0: [1, 1] },
      },
    },
    executed: {
      success: true,
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      numTotalTestSuites: 2,
      numPassedTestSuites: 2,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      startTime: start + 10,
      testResults: [
        {
          name: resolve(sourceRoot, requirement.file),
          status: "passed",
          startTime: start + 10,
          endTime: start + 900,
          assertionResults: [
            {
              title: requirement.test,
              ancestorTitles: ["choice"],
              fullName: "choice selects both values",
              status: "passed",
              failureMessages: [],
            },
          ],
        },
      ],
    },
  };
  const report = {
    schema: "jqstar-coverage-report/1",
    runId: context.runId,
    mode: context.coverageMode,
    status: "pass",
    censusExitCode: 0,
    testExitCode: 0,
    testSignal: null,
    scope: {
      schema: context.scope.schema,
      source: resolve(sourceRoot, context.scopePath),
      base: commit,
      head: commit,
      startFingerprint: structuredClone(fingerprint),
      changedPaths: changed ? [path] : [],
    },
    stabilization,
    denominator: structuredClone(measured),
    thresholds: {
      global: structuredClone(thresholds.global),
      subsystems: structuredClone(
        stabilization ? thresholds.stabilizationTargets : thresholds.subsystems,
      ),
    },
    thresholdRatchet: {
      status: "pass",
      baseRevision: commit,
      reason: "compared with coverage thresholds at immutable delivery base",
      failures: [],
    },
    executedEvidence: {
      status: "pass",
      runnerSuccess: true,
      totalRequirements: 1,
      matchedRequirements: 1,
      mappings: [{ ...requirement, matches: 1, passed: true }],
      failures: [],
    },
    changed: changed
      ? {
          status: "pass",
          failures: [],
          files: [
            {
              path,
              changedLines: [2],
              executableLines: [2],
              coverageMappedLines: [2],
              coverageMapExemptEvidence: [],
              typeOrFormatOnlyLines: [],
              typeOrFormatEvidence: [],
              unexplainedLines: [],
              uncoveredLines: [],
              changedFunctions: 1,
              uncoveredFunctions: [],
            },
          ],
        }
      : {
          status: "not-measured",
          reason: "no changed instrumented production file",
          files: [],
          failures: [],
        },
    failures: [],
  };
  return { artifacts, context, report };
}

const select = ({ report, artifacts, context }, selector = "denominator") =>
  selectCoverage(report, selector, artifacts, context);
const maps = ({ artifacts, context }) =>
  validateCoverageMaps(artifacts.summary, artifacts.hits, artifacts.sources, context);
const execution = ({ artifacts, context }) =>
  validateCoverageExecution(artifacts.executed, { ...context, start, end: start + 1000 });

it("checks handwritten coverage evidence from an independent source root in both policy modes", async () => {
  for (const stabilization of [false, true]) {
    const data = fixture({ stabilization });
    for (const [schemaPath, value] of [
      ["schema/coverage-report.schema.json", data.report],
      ["quality/program-audit/coverage-summary.schema.json", data.artifacts.summary],
      ["quality/program-audit/coverage-hits.schema.json", data.artifacts.hits],
      ["quality/program-audit/vitest-report.schema.json", data.artifacts.executed],
    ]) {
      const validate = createSchemaValidator(JSON.parse(await readFile(schemaPath, "utf8")));
      assert(validate(value), JSON.stringify(validate.errors));
    }
    assert.deepEqual(select(data), { status: "pass", files: 1, metrics: data.report.denominator });
    assert.equal(select(data, `${data.context.coverageMode}-floors`).status, "pass");
    assert.deepEqual(select(data, "threshold-ratchet"), data.report.thresholdRatchet);
    assert.deepEqual(select(data, "executed-requirements"), {
      status: "pass",
      tests: 1,
      files: 1,
      repeatedDisplayNames: [],
      evidence: data.report.executedEvidence,
    });
    assert.deepEqual(select(data, "changed-production"), data.report.changed);
  }
});

it("measures changed source lines and functions without turning an empty scope into coverage", () => {
  const data = fixture({ changed: true });
  assert.deepEqual(select(data, "changed-production"), data.report.changed);
  for (const kind of ["statements", "functions"]) {
    const altered = fixture({ changed: true });
    // Keep raw math consistent and floors permissive; changed-code enforcement must still fail.
    const metric = kind === "statements" ? "lines" : "functions";
    altered.artifacts.hits[absolute][kind === "statements" ? "s" : "f"][0] = 0;
    for (const summary of Object.values(altered.artifacts.summary)) {
      summary[metric] = {
        total: kind === "statements" ? 2 : 1,
        covered: kind === "statements" ? 1 : 0,
        skipped: 0,
        pct: kind === "statements" ? 50 : 0,
      };
      if (kind === "statements") summary.statements = { ...summary.lines };
    }
    for (const policy of [altered.context.thresholds, altered.context.baselineThresholds]) {
      policy.global = { lines: 0, functions: 0, statements: 0, branches: 0 };
      policy.subsystems = {};
    }
    assert.throws(() => select(altered), /Independent coverage evaluation did not pass/u);
  }
  const invented = fixture();
  invented.report.changed = { status: "pass", files: [], failures: [] };
  assert.throws(() => select(invented), /contradicts independent evaluation/u);
});

it.each([
  [
    "missing raw source",
    (d) => {
      Reflect.deleteProperty(d.artifacts.hits, absolute);
    },
  ],
  [
    "extra raw source",
    (d) => {
      d.artifacts.hits[resolve(sourceRoot, "src/extra.ts")] = d.artifacts.hits[absolute];
    },
  ],
  [
    "missing source text",
    (d) => {
      Reflect.deleteProperty(d.artifacts.sources, path);
    },
  ],
  [
    "changed source bytes",
    (d) => {
      d.artifacts.sources[path] += "// changed\n";
    },
  ],
  [
    "foreign source root",
    (d) => {
      d.context.sourceRoot = resolve(sourceRoot, "foreign");
    },
  ],
  [
    "duplicate expected source",
    (d) => {
      d.context.expectedPaths.push(path);
    },
  ],
  [
    "counter without map",
    (d) => {
      d.artifacts.hits[absolute].s[2] = 1;
    },
  ],
  [
    "map without counter",
    (d) => {
      delete d.artifacts.hits[absolute].f[0];
    },
  ],
  [
    "negative counter",
    (d) => {
      d.artifacts.hits[absolute].s[0] = -1;
    },
  ],
  [
    "fractional counter",
    (d) => {
      d.artifacts.hits[absolute].f[0] = 0.5;
    },
  ],
  [
    "unsafe counter",
    (d) => {
      d.artifacts.hits[absolute].b[0][0] = Number.MAX_SAFE_INTEGER + 1;
    },
  ],
  [
    "branch location mismatch",
    (d) => {
      d.artifacts.hits[absolute].b[0].pop();
    },
  ],
  [
    "foreign file identity",
    (d) => {
      d.artifacts.hits[absolute].path = resolve(sourceRoot, "foreign.ts");
    },
  ],
  [
    "line outside source",
    (d) => {
      d.artifacts.hits[absolute].statementMap[0].end.line = 100;
    },
  ],
  [
    "column outside source",
    (d) => {
      d.artifacts.hits[absolute].fnMap[0].decl.end.column = 100;
    },
  ],
  [
    "reversed location",
    (d) => {
      d.artifacts.hits[absolute].branchMap[0].loc.end.column = 0;
    },
  ],
  [
    "function line contradiction",
    (d) => {
      d.artifacts.hits[absolute].fnMap[0].line = 2;
    },
  ],
  [
    "branch line contradiction",
    (d) => {
      d.artifacts.hits[absolute].branchMap[0].line = 1;
    },
  ],
  [
    "false file summary",
    (d) => {
      d.artifacts.summary[absolute].lines.covered = 1;
    },
  ],
  [
    "false aggregate",
    (d) => {
      d.artifacts.summary.total.branches.pct = 99;
    },
  ],
])("rejects coverage maps with %s", (_name, alter) => {
  const data = fixture();
  alter(data);
  assert.throws(() => maps(data));
});

it("bounds statement expansion before changed-line evaluation", () => {
  const data = fixture();
  const source = "x\n".repeat(1001);
  data.artifacts.sources[path] = source;
  data.context.sourceDigests[path] = sha256(source);
  const hit = data.artifacts.hits[absolute];
  hit.statementMap = Object.fromEntries(
    Array.from({ length: 1000 }, (_, id) => [id, location(1, 0, 1001, 1)]),
  );
  hit.s = Object.fromEntries(Array.from({ length: 1000 }, (_, id) => [id, 1]));
  assert.throws(() => maps(data), /statement expansion exceeds its bound/u);
});

it("preserves collected parameterized name multiplicity and rejects omitted or added cases", () => {
  const data = fixture();
  const test = data.artifacts.executed.testResults[0].assertionResults[0];
  data.artifacts.executed.testResults[0].assertionResults.push(structuredClone(test));
  data.artifacts.executed.numTotalTests = data.artifacts.executed.numPassedTests = 2;
  data.context.expectedTests.push(structuredClone(data.context.expectedTests[0]));
  assert.deepEqual(execution(data).repeatedDisplayNames, [
    { identity: ["test/choose.test.ts", "choice > selects both values"], count: 2 },
  ]);
  data.artifacts.executed.testResults[0].assertionResults.pop();
  data.artifacts.executed.numTotalTests = data.artifacts.executed.numPassedTests = 1;
  assert.throws(() => execution(data), /frozen collected test roster/u);
  const extra = fixture();
  extra.artifacts.executed.testResults[0].assertionResults.push(structuredClone(test));
  extra.artifacts.executed.numTotalTests = extra.artifacts.executed.numPassedTests = 2;
  assert.throws(() => execution(extra), /frozen collected test roster/u);
});

it.each([
  [
    "hidden failure",
    (r) => {
      r.testResults[0].assertionResults[0].status = "failed";
    },
  ],
  [
    "hidden error",
    (r) => {
      r.testResults[0].assertionResults[0].failureMessages.push("failure");
    },
  ],
  [
    "skipped test",
    (r) => {
      r.numPendingTests = 1;
    },
  ],
  [
    "missing title",
    (r) => {
      delete r.testResults[0].assertionResults[0].title;
    },
  ],
  [
    "missing ancestry",
    (r) => {
      delete r.testResults[0].assertionResults[0].ancestorTitles;
    },
  ],
  [
    "false full name",
    (r) => {
      r.testResults[0].assertionResults[0].fullName = "different";
    },
  ],
  [
    "foreign file",
    (r) => {
      r.testResults[0].name = resolve(sourceRoot, "..", "foreign.ts");
    },
  ],
  [
    "duplicate file",
    (r) => {
      r.testResults.push(structuredClone(r.testResults[0]));
    },
  ],
  [
    "late execution",
    (r) => {
      r.testResults[0].endTime = start + 1001;
    },
  ],
  [
    "early execution",
    (r) => {
      r.startTime = start - 1;
    },
  ],
  [
    "unfinished suite",
    (r) => {
      r.numPassedTestSuites = 1;
    },
  ],
  [
    "invalid suite count",
    (r) => {
      r.numTotalTestSuites = r.numPassedTestSuites = "2";
    },
  ],
])("rejects coverage execution with %s", (_name, alter) => {
  const data = fixture();
  alter(data.artifacts.executed);
  assert.throws(() => execution(data));
});

it.each([
  [
    "another run",
    (d) => {
      d.report.runId = "different";
    },
  ],
  [
    "another mode",
    (d) => {
      d.report.mode = "stabilization";
    },
  ],
  [
    "signalled coverage process",
    (d) => {
      d.report.testSignal = "SIGTERM";
    },
  ],
  [
    "unselected parent",
    (d) => {
      d.context.gate.selection.selected = false;
    },
  ],
  [
    "signalled parent",
    (d) => {
      d.context.gate.signal = "SIGTERM";
    },
  ],
  [
    "changed command",
    (d) => {
      d.context.gate.command.args = ["run", "test:unit"];
    },
  ],
  [
    "changed tool",
    (d) => {
      d.context.gate.toolVersion = "0.0.0";
    },
  ],
  [
    "changed timeout",
    (d) => {
      d.context.gate.timeoutMs = 1;
    },
  ],
  [
    "late parent",
    (d) => {
      d.context.auditEnd = start + 999;
    },
  ],
  [
    "different source commit",
    (d) => {
      d.context.commit = "c".repeat(40);
    },
  ],
  [
    "different source fingerprint",
    (d) => {
      d.context.fingerprint = { ...d.context.fingerprint, digest: "c".repeat(64) };
    },
  ],
  [
    "different scope",
    (d) => {
      d.report.scope.changedPaths = [path];
    },
  ],
  [
    "different baseline",
    (d) => {
      d.context.baseCommit = "c".repeat(40);
    },
  ],
  [
    "weakened policy",
    (d) => {
      d.context.thresholds.global.lines = 80;
    },
  ],
  [
    "empty required manifest",
    (d) => {
      d.context.testManifest.requirements = [];
    },
  ],
  [
    "altered required result",
    (d) => {
      d.report.executedEvidence.matchedRequirements = 0;
    },
  ],
  [
    "invented denominator",
    (d) => {
      d.report.denominator.lines.total = 3;
    },
  ],
])("rejects composed coverage evidence with %s", (_name, alter) => {
  const data = fixture();
  alter(data);
  assert.throws(() => select(data));
});

it("requires literal coverage selectors and refuses weaker evidence kinds", async () => {
  for (const selector of ["*", "denom*", "stabilization-floors"]) {
    assert.throws(
      () => select(fixture(), selector),
      /Unknown exact coverage selector|cannot satisfy the requested floors/u,
    );
  }
  const requirements = [{ id: "coverage" }];
  const mapping = [
    {
      id: "coverage",
      review: "The denominator requires measured raw coverage evidence.",
      requiredKinds: ["coverage"],
      evidence: [
        {
          id: "coverage:denominator",
          kind: "coverage",
          path: "coverage.json",
          selector: "denominator",
        },
      ],
    },
  ];
  const schema = createSchemaValidator(
    JSON.parse(await readFile("quality/program-audit/mappings.schema.json", "utf8")),
  );
  assert(schema(mapping));
  assert.equal(validateMappings(requirements, mapping), true);
  for (const kind of ["source", "unit", "static"]) {
    const weaker = structuredClone(mapping);
    weaker[0].evidence[0].kind = kind;
    assert.throws(
      () => validateMappings(requirements, weaker),
      /cannot be replaced by a weaker type/u,
    );
  }
});

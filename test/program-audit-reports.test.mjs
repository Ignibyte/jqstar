// @vitest-environment node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { it } from "vitest";
import { runChild } from "../scripts/quality/lib/process.mjs";
import { selectNodeTest } from "../scripts/program-audit/node-evidence.mjs";
import { sha256 } from "../scripts/program-audit/contracts.mjs";
import { selectVitest } from "../scripts/program-audit/evidence.mjs";
import {
  createReportLoader,
  loadBinaryArtifact,
  reportSchemas,
} from "../scripts/program-audit/reports.mjs";
import { readNavigationMeasurement } from "../scripts/quality/navigation-evidence.mjs";
const start = Date.parse("2026-09-06T00:00:00.000Z");
function unit() {
  return {
    success: true,
    numTotalTests: 1,
    numPassedTests: 1,
    numFailedTests: 0,
    numPendingTests: 0,
    numTodoTests: 0,
    numFailedTestSuites: 0,
    numPendingTestSuites: 0,
    startTime: start,
    testResults: [
      {
        name: "/audit/test/cleanup.test.ts",
        status: "passed",
        startTime: start,
        endTime: start + 10,
        assertionResults: [
          { fullName: "cleanup completes", status: "passed", failureMessages: [] },
        ],
      },
    ],
  };
}
async function fixture(work) {
  const root = await mkdtemp(join(tmpdir(), "jqstar-audit-loader-"));
  try {
    const put = async (path, source) => {
      await mkdir(dirname(join(root, path)), { recursive: true });
      await writeFile(join(root, path), source);
      return { path, sha256: sha256(source), bytes: Buffer.byteLength(source) };
    };
    const schemas = {};
    for (const [kind, path] of Object.entries(reportSchemas)) {
      const actual = path;
      schemas[kind] = await put(path, await readFile(actual, "utf8"));
    }
    await work({ root, schemas, put, load: await createReportLoader(root, schemas) });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}
it("loads only hash-bound schema-valid report bytes and freezes every returned object", async () =>
  fixture(async ({ load, put }) => {
    const expected = await put("evidence/unit.json", JSON.stringify(unit()));
    const report = await load("vitest", expected);
    assert.equal(report.sha256, expected.sha256);
    assert.equal(report.bytes, expected.bytes);
    assert.equal(report.data.numPassedTests, 1);
    assert(Object.isFrozen(report));
    assert(Object.isFrozen(report.data.testResults[0].assertionResults));
    assert.throws(() => {
      report.data.testResults[0].assertionResults[0].status = "pending";
    }, TypeError);
  }));
it("loads raw navigation executions and refuses the decision document as execution evidence", async () =>
  fixture(async ({ load, put }) => {
    const decision = JSON.parse(await readFile("quality/navigation-decision.json", "utf8"));
    const schema = JSON.parse(await readFile("schema/navigation-decision.schema.json", "utf8"));
    // This immutable historical archive proves producer compatibility, not current acceptance.
    const reference = decision.measurements.find(
      ({ runId }) => runId === "2026-09-05T23-18-54.986Z-29717",
    );
    const raw = await readNavigationMeasurement(reference, schema);
    const loaded = await load(
      "navigation",
      await put("evidence/navigation.json", JSON.stringify(raw)),
    );
    assert.equal(loaded.data.schema, "jqstar-navigation-measurement/1");
    assert.equal(loaded.data.candidates.length, 30);
    assert(Object.isFrozen(loaded.data.candidates[0].flows[0].assertions));
    await assert.rejects(
      load("navigation", await put("evidence/decision.json", JSON.stringify(decision))),
      /fails its frozen schema/u,
    );
  }));
it("loads bounded raw coverage artifacts only with their frozen bytes and schemas", async () =>
  fixture(async ({ root, schemas, load, put }) => {
    const metric = { total: 1, covered: 1, skipped: 0, pct: 100 };
    const measured = { lines: metric, statements: metric, functions: metric, branches: metric };
    const path = "/audit/src/example.ts";
    const location = { start: { line: 1, column: 0 }, end: { line: 1, column: 1 } };
    const summary = { total: measured, [path]: measured };
    const hits = {
      [path]: {
        path,
        all: false,
        statementMap: { 0: location },
        s: { 0: 1 },
        fnMap: { 0: { name: "example", decl: location, loc: location, line: 1 } },
        f: { 0: 1 },
        branchMap: { 0: { type: "branch", line: 1, loc: location, locations: [location] } },
        b: { 0: [1] },
      },
    };
    for (const [kind, raw] of [
      ["coverageSummary", summary],
      ["coverageHits", hits],
    ]) {
      const expected = await put(`evidence/${kind}.json`, JSON.stringify(raw));
      const report = await load(kind, expected);
      assert.deepEqual(report.data, raw);
      assert(Object.isFrozen(report.data[path]));
      await assert.rejects(load(kind, { ...expected, sha256: "0".repeat(64) }));
      const missing = structuredClone(schemas);
      Reflect.deleteProperty(missing, kind);
      await assert.rejects(createReportLoader(root, missing));
      const altered = structuredClone(schemas);
      altered[kind].sha256 = "0".repeat(64);
      await assert.rejects(createReportLoader(root, altered));
    }
    for (const [kind, raw] of [
      ["coverageSummary", { total: measured }],
      ["coverageSummary", { ...summary, total: { ...measured, branchesTrue: metric } }],
      ["coverageHits", { [path]: { ...hits[path], s: { 0: -1 } } }],
      ["coverageHits", { [path]: { ...hits[path], b: { 0: [] } } }],
      ["coverageHits", { [path]: { ...hits[path], f: { 0: Number.MAX_SAFE_INTEGER + 1 } } }],
      ["coverageHits", { [path]: { ...hits[path], unexpected: true } }],
    ]) {
      await assert.rejects(
        load(kind, await put("evidence/invalid-coverage.json", JSON.stringify(raw))),
        /fails its frozen schema/u,
      );
    }
  }));
it("rejects missing, altered, miscounted, symbolic-link and unknown report references", async () =>
  fixture(async ({ root, load, put }) => {
    const expected = await put("evidence/unit.json", JSON.stringify(unit()));
    await assert.rejects(load("vitest", { ...expected, path: "missing.json" }));
    await assert.rejects(load("vitest", { ...expected, sha256: "0".repeat(64) }));
    await assert.rejects(load("vitest", { ...expected, bytes: expected.bytes + 1 }));
    await assert.rejects(load("vitest", { ...expected, bytes: 0 }));
    await assert.rejects(load("unknown", expected));
    await symlink(join(root, expected.path), join(root, "alias.json"));
    await assert.rejects(load("vitest", { ...expected, path: "alias.json" }));
    await writeFile(join(root, expected.path), JSON.stringify({ ...unit(), numPassedTests: 0 }));
    await assert.rejects(load("vitest", expected));
  }));
it("loads indexed binary artifacts without treating their bytes as UTF-8", async () =>
  fixture(async ({ root, put }) => {
    const bytes = Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xff, 0]);
    const reference = await put("evidence/trace.zip", bytes);
    const file = await loadBinaryArtifact(root, reference);
    assert.deepEqual(file, { ...reference, signature: "504b0304" });
    assert(Object.isFrozen(file));
    for (const invalid of [
      { ...reference, sha256: "0".repeat(64) },
      { ...reference, bytes: reference.bytes + 1 },
      { ...reference, bytes: reference.bytes - 1 },
      { ...reference, bytes: 0 },
      { ...reference, unexpected: true },
    ])
      await assert.rejects(loadBinaryArtifact(root, invalid));
    await put("evidence/trace.zip", Buffer.from([0x50, 0x4b, 0x03, 0x04, 0xfe, 0]));
    await assert.rejects(loadBinaryArtifact(root, reference));
  }));
it("loads deliberate empty selections through their separate schema and preserves execution refusal", async () =>
  fixture(async ({ root, schemas, load, put }) => {
    const listing = {
      config: {
        version: "1.62.1",
        rootDir: "/audit/e2e",
        projects: [{ name: "desktop-chromium" }],
      },
      stats: {
        startTime: new Date(start).toISOString(),
        duration: 10,
        expected: 0,
        unexpected: 0,
        skipped: 0,
        flaky: 0,
      },
      errors: [{ message: "Error: No tests found" }],
      suites: [],
    };
    const expected = await put("evidence/empty-list.json", JSON.stringify(listing));
    assert.deepEqual((await load("playwrightSelection", expected)).data, listing);
    await assert.rejects(load("playwright", expected), /fails its frozen schema/u);
    const changed = structuredClone(schemas);
    changed.playwrightSelection.sha256 = "0".repeat(64);
    await assert.rejects(createReportLoader(root, changed));
    delete changed.playwrightSelection;
    await assert.rejects(createReportLoader(root, changed));
  }));
it("binds schema paths and bytes to the frozen input inventory", async () =>
  fixture(async ({ root, schemas }) => {
    const alias = structuredClone(schemas);
    alias.vitest.path = "alternate.json";
    await assert.rejects(createReportLoader(root, alias));
    const omitted = structuredClone(schemas);
    delete omitted.vitest;
    await assert.rejects(createReportLoader(root, omitted));
    const changed = structuredClone(schemas);
    changed.vitest.sha256 = "0".repeat(64);
    await assert.rejects(createReportLoader(root, changed));
    await writeFile(join(root, schemas.vitest.path), "{}");
    await assert.rejects(createReportLoader(root, schemas));
  }));
it("rejects malformed or structurally excessive JSON without exposing its contents", async () =>
  fixture(async ({ load, put }) => {
    for (const value of [
      '{"private":"do not echo",',
      '{"private":"do not echo"}',
      "[".repeat(70) + "0" + "]".repeat(70),
    ]) {
      const expected = await put("evidence/invalid.json", value);
      await assert.rejects(
        load("vitest", expected),
        (error) => error.message === "Evidence report is malformed or fails its frozen schema",
      );
    }
  }));
it("keeps execution acceptance separate from successful schema validation", async () =>
  fixture(async ({ load, put }) => {
    const data = unit();
    data.success = false;
    data.numPassedTests = 0;
    data.numFailedTests = 1;
    data.testResults[0].assertionResults[0].status = "failed";
    const report = await load("vitest", await put("evidence/unit.json", JSON.stringify(data)));
    assert.throws(
      () =>
        selectVitest(
          report.data,
          { path: "test/cleanup.test.ts", selector: "cleanup completes" },
          "/audit",
          { start, end: start + 10 },
        ),
      /incomplete or unsuccessful/,
    );
  }));

it("loads actual Node execution records and rejects failed, skipped, todo and undeclared suites", async () =>
  fixture(async ({ root, load, put }) => {
    const reporter = resolve("scripts/program-audit/node-reporter.mjs");
    const preamble = "import test from 'node:test'; import assert from 'node:assert/strict';\n";
    const scenarios = [
      {
        name: "green",
        code: "test('first',()=>assert.equal(1,1)); test('second',()=>assert.equal(2,2));",
        exit: 0,
        accepted: true,
      },
      {
        name: "red",
        code: "test('first',()=>assert.equal(1,2)); test('second',()=>assert.equal(2,2));",
        exit: 1,
        accepted: false,
      },
      {
        name: "skipped",
        code: "test('first',{skip:true},()=>{}); test('second',()=>assert.equal(2,2));",
        exit: 0,
        accepted: false,
      },
      {
        name: "todo",
        code: "test('first',{todo:true},()=>{}); test('second',()=>assert.equal(2,2));",
        exit: 0,
        accepted: false,
      },
      { name: "undeclared", code: "", exit: 0, accepted: false },
    ];
    for (const scenario of scenarios) {
      await put("checks.mjs", preamble + scenario.code);
      const tests =
        scenario.name === "undeclared"
          ? []
          : [
              { path: "checks.mjs", name: "first" },
              { path: "checks.mjs", name: "second" },
            ];
      const runId = `node-audit-${scenario.name}`;
      const started = Date.now();
      const processResult = await runChild({
        command: process.execPath,
        args: ["--test", "--test-reporter", reporter, "checks.mjs"],
        cwd: root,
        env: { ...process.env, JQS_PROGRAM_AUDIT_RUN_ID: runId },
        timeoutMs: 10_000,
      });
      const ended = Date.now();
      assert.equal(processResult.exitCode, scenario.exit);
      assert.equal(processResult.timedOut, false);
      assert.equal(processResult.signal, null);
      assert(!processResult.spawnError);
      const report = await load(
        "node",
        await put(`evidence/${scenario.name}.json`, processResult.stdout),
      );
      const context = { tests, node: process.version, runId, start: started, end: ended };
      const citation = { path: "checks.mjs", selector: "first" };
      const select = () => selectNodeTest(report.data, citation, context);
      if (scenario.accepted) assert.equal(select().status, "pass");
      else assert.throws(select);
    }
  }));

it("rejects Node producer inputs outside its flat source and run-identity contract", async () =>
  fixture(async ({ root, put }) => {
    const reporter = resolve("scripts/program-audit/node-reporter.mjs");
    await mkdir(join(root, "source"));
    for (const scenario of [
      { name: "nested", code: "test('parent',async t=>{await t.test('nested',()=>{});});" },
      { name: "missing-run-identity", code: "test('flat',()=>{});" },
      { name: "outside-source", code: "test('outside',()=>{});" },
    ]) {
      const path = scenario.name === "outside-source" ? "outside.mjs" : "source/checks.mjs";
      await put(path, "import test from 'node:test';\n" + scenario.code);
      const env = { ...process.env, JQS_PROGRAM_AUDIT_RUN_ID: `node-refusal-${scenario.name}` };
      if (scenario.name === "missing-run-identity") delete env.JQS_PROGRAM_AUDIT_RUN_ID;
      const result = await runChild({
        command: process.execPath,
        args: ["--test", "--test-reporter", reporter, join(root, path)],
        cwd: join(root, "source"),
        env,
        timeoutMs: 10_000,
      });
      assert.notEqual(result.exitCode, 0);
      assert.equal(result.timedOut, false);
      assert.equal(result.signal, null);
      assert(!result.spawnError);
      assert.throws(() => JSON.parse(result.stdout));
    }
  }));

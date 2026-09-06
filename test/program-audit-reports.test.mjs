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
import { createReportLoader, reportSchemas } from "../scripts/program-audit/reports.mjs";
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

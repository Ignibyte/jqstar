// @vitest-environment node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { it } from "vitest";
import { sha256 } from "../scripts/program-audit/contracts.mjs";
import { selectVitest } from "../scripts/program-audit/evidence.mjs";
import { createReportLoader, reportSchemas } from "../scripts/program-audit/reports.mjs";
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

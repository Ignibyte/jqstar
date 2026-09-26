// @vitest-environment node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { it } from "vitest";
import { createDetectorCheck } from "../scripts/quality/detector-check.mjs";
import { runChild } from "../scripts/quality/lib/process.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

const diagnostic = "changed the API signature";
const normalResult = () => ({
  exitCode: 1,
  signal: null,
  timedOut: false,
  spawnError: null,
  stdout: diagnostic,
  stderr: "",
});
const check = (result, expected = "red") =>
  createDetectorCheck({
    name: "api-report-drift",
    expected,
    detector: /changed the API signature/u,
    result,
  });
const child = (source, timeoutMs = 5000) =>
  runChild({
    command: process.execPath,
    args: ["-e", source],
    cwd: process.cwd(),
    env: process.env,
    timeoutMs,
  });

it("accepts real completed red and green detector processes with the required diagnostic", async () => {
  for (const [expected, exit] of [
    ["red", 1],
    ["green", 0],
  ]) {
    const result = await child(`console.log("${diagnostic}"); process.exitCode = ${exit};`);
    assert.equal(result.exitCode, exit);
    assert.equal(check(result, expected).status, "pass");
  }
});

it("rejects a real signalled detector after it prints the expected diagnostic", async () => {
  const result = await child(
    `process.stdout.write("${diagnostic}\\n", () => process.kill(process.pid, "SIGTERM"));`,
  );
  assert.equal(result.exitCode, null);
  assert.equal(result.signal, "SIGTERM");
  const recorded = check(result);
  assert.equal(recorded.detectorMatched, true);
  assert.equal(recorded.status, "fail");
  assert.match(recorded.output, /signal=SIGTERM/u);
});

it("rejects a real timed-out detector even when shutdown returns the expected nonzero exit", async () => {
  const result = await child(
    `process.on("SIGTERM", () => process.exit(1)); console.log("${diagnostic}"); setInterval(() => {}, 100);`,
    1000,
  );
  assert.equal(result.timedOut, true);
  assert.equal(result.exitCode, 1);
  const recorded = check(result);
  assert.equal(recorded.detectorMatched, true);
  assert.equal(recorded.status, "fail");
  assert.match(recorded.output, /timeout=true/u);
});

it("rejects a missing executable instead of counting its nonzero result as a red control", async () => {
  const result = await runChild({
    command: `${process.execPath}.jqstar-missing-detector`,
    args: [],
    cwd: process.cwd(),
    env: process.env,
    timeoutMs: 1000,
  });
  assert(result.spawnError);
  assert.equal(check({ ...result, stdout: diagnostic }).status, "fail");
});

it("refuses invalid exits, missing process fields, wrong outcomes and missing detector text", () => {
  for (const exitCode of [null, undefined, -1, 0, 0.5, NaN, Infinity, "1"]) {
    assert.equal(check({ ...normalResult(), exitCode }).status, "fail");
  }
  for (const key of ["signal", "timedOut", "spawnError"]) {
    const incomplete = Object.fromEntries(
      Object.entries(normalResult()).filter(([name]) => name !== key),
    );
    assert.equal(check(incomplete).status, "fail");
  }
  assert.equal(check({ ...normalResult(), timedOut: true }).status, "fail");
  assert.equal(check({ ...normalResult(), signal: "SIGINT" }).status, "fail");
  assert.equal(check({ ...normalResult(), stdout: "unrelated error" }).status, "fail");
  assert.equal(check(normalResult(), "green").status, "fail");
  assert.equal(check(normalResult(), "unknown").status, "fail");
});

it("rejects schema-level passing checks whose exit contradicts their required red or green outcome", async () => {
  const schema = JSON.parse(
    await readFile("schema/quality-0044-self-test-report.schema.json", "utf8"),
  );
  for (const [expected, exitCode] of [
    ["red", 1],
    ["green", 0],
  ]) {
    const validate = createSchemaValidator({
      $schema: schema.$schema,
      $defs: schema.$defs,
      $ref: `#/$defs/${expected}Check`,
    });
    const passing = check({ ...normalResult(), exitCode }, expected);
    assert(validate(passing), JSON.stringify(validate.errors));
    for (const wrongExit of [null, -1, 0.5, expected === "red" ? 0 : 1]) {
      assert.equal(validate({ ...passing, exitCode: wrongExit }), false);
    }
    assert.equal(validate({ ...passing, status: "fail", exitCode: null }), true);
  }
});

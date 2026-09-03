import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { checkLocalLinks } from "./check-links.mjs";
import { validateLicenses } from "./check-licenses.mjs";
import { validateLockfile } from "./check-lockfile.mjs";
import { effectiveMaximum, validateMetrics } from "./check-metrics.mjs";
import { classifyPaths } from "./scope-census.mjs";
import { scanSourcePolicy, validateDeviations } from "./source-policy.mjs";
import { createSchemaValidator } from "./validate-json.mjs";
import { executeStaticGates } from "./run-static.mjs";
import { qualityPaths, readJSON, repositoryRoot } from "./static-lib.mjs";

const sourceSabotage = [
  ["suppression/eslint", "src/a.ts", "/* eslint-disable no-alert */"],
  ["suppression/typescript", "src/a.ts", "// @ts-ignore"],
  ["suppression/coverage", "src/a.ts", "/* c8 ignore next */"],
  ["suppression/semgrep", "src/a.ts", "// nosemgrep"],
  ["tests/focused-or-skipped", "test/a.test.ts", "test.only('focused', () => {})"],
  ["source/dynamic-evaluation", "src/a.ts", "eval('unsafe')"],
  ["source/private-package-entry", "src/a.ts", "import 'jquery-star/src/runtime'"],
  ["source/production-test-import", "src/a.ts", "import { expect } from 'vitest'"],
  ["source/unowned-global-write", "src/a.ts", "window.jqueryStar = {}"],
  ["source/unsafe-request-path", "server/a.ts", "resolve(root, req.params.file)"],
  ["source/handwritten-datastar-event", "server/a.ts", "const value = 'event: datastar-patch'"],
  ["source/csp-trusted-engine-edge", "src/csp/a.ts", "import '../expression'"],
  ["source/actionable-todo", "src/a.ts", "// TODO repair"],
  ["configuration/broad-ignore", "knip.json", '{ "ignore": ["src/**"] }'],
];

function selfTestSourcePolicy() {
  for (const [id, path, source] of sourceSabotage) {
    const red = scanSourcePolicy(new Map([[path, source]]));
    assert(
      red.some((message) => message.includes(`[${id}]`)),
      `${id} sabotage stayed green: ${red.join(" | ")}`,
    );
    assert.deepEqual(
      scanSourcePolicy(new Map([[path, "export {};\n"]])),
      [],
      `${id} green fixture failed`,
    );
  }
  assert.deepEqual(
    scanSourcePolicy(
      new Map([
        ["src/csp/a.ts", "import type { StarExpressionEngine } from '../expression-types'\n"],
      ]),
    ),
    [],
    "neutral expression type contract was mistaken for the trusted compiler",
  );
  const expired = {
    schemaVersion: "jqstar-quality-deviations/1",
    deviations: [
      {
        id: "JQS-9999",
        path: "src/a.ts",
        rule: "x",
        lineStart: 2,
        lineEnd: 1,
        expires: "2000-01-01",
      },
    ],
  };
  assert(
    validateDeviations(expired).length >= 2,
    "expired and inverted deviation sabotage stayed green",
  );
}

async function selfTestScopes() {
  const configuration = await readJSON("quality/scopes.json");
  const paths = await qualityPaths();
  const clean = classifyPaths(paths, configuration);
  assert.deepEqual(clean.errors, [], "real scope census must be green before sabotage");
  for (const scope of configuration.scopes) {
    const fixture = [...clean.assignments].find(([, id]) => id === scope.id)?.[0];
    assert(fixture, `scope ${scope.id} has no liveness fixture`);
    const sabotaged = structuredClone(configuration);
    sabotaged.scopes.find(({ id }) => id === scope.id).match = "(?!)";
    assert(
      classifyPaths([fixture], sabotaged).errors.length > 0,
      `${scope.id} selector sabotage stayed green`,
    );
  }
  assert(
    classifyPaths(["unknown.quality-extension"], configuration).errors.some((error) =>
      error.startsWith("Unexamined quality path"),
    ),
    "unknown path stayed green",
  );
  const ambiguous = structuredClone(configuration);
  ambiguous.scopes.push({
    id: "sabotage",
    match: ".*",
    required: false,
    validators: ["self-test"],
  });
  assert(
    classifyPaths([paths[0]], ambiguous).errors.some((error) =>
      error.startsWith("Ambiguous quality path"),
    ),
    "ambiguous path stayed green",
  );
}

async function selfTestLinks() {
  const root = await mkdtemp(join(tmpdir(), "jqstar-static-self-test-"));
  try {
    await mkdir(join(root, "docs"));
    await writeFile(join(root, "docs", "target.md"), "# Present anchor\n");
    await writeFile(join(root, "docs", "green.md"), "[ok](target.md#present-anchor)\n");
    assert.deepEqual(await checkLocalLinks(["docs/green.md"], root), []);
    await writeFile(
      join(root, "docs", "site.html"),
      '<a href="%BASE_URL%docs/">base-safe documentation</a>\n',
    );
    assert.deepEqual(await checkLocalLinks(["docs/site.html"], root), []);
    await writeFile(join(root, "docs", "red.md"), "[broken](missing.md)\n");
    assert.equal(
      (await checkLocalLinks(["docs/red.md"], root)).length,
      1,
      "broken link sabotage stayed green",
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

function selfTestPolicies() {
  const manifest = { dependencies: { a: "1" }, devDependencies: {}, peerDependencies: {} };
  const lock = {
    lockfileVersion: 3,
    packages: { "": { dependencies: { a: "1" }, devDependencies: {}, peerDependencies: {} } },
  };
  assert.deepEqual(validateLockfile(manifest, lock), []);
  lock.packages[""].dependencies.a = "2";
  assert.equal(
    validateLockfile(manifest, lock).length,
    1,
    "lockfile mismatch sabotage stayed green",
  );
  assert.deepEqual(validateLicenses({ a: { licenses: "MIT" } }, { allowed: ["MIT"] }), []);
  assert.equal(
    validateLicenses({ a: { licenses: "UNKNOWN" } }, { allowed: ["MIT"] }).length,
    1,
    "license sabotage stayed green",
  );
  const metrics = {
    schemaVersion: "jqstar-static-metrics/1",
    duplication: { maximumPercent: 10, minimumLines: 8, minimumTokens: 70 },
  };
  const jscpd = { threshold: 10, minLines: 8, minTokens: 70 };
  assert.deepEqual(validateMetrics(metrics, jscpd), []);
  jscpd.threshold = 11;
  assert.equal(validateMetrics(metrics, jscpd).length, 1, "metric mismatch sabotage stayed green");
  assert.equal(effectiveMaximum(10, "20"), 10, "environment lowered a committed maximum");
  assert.equal(effectiveMaximum(10, "5"), 5, "environment could not tighten a committed maximum");
}

async function selfTestSchemas() {
  const validate = createSchemaValidator(await readJSON("quality/scopes.schema.json"));
  assert(
    validate(await readJSON("quality/scopes.json")),
    "scope schema rejected committed configuration",
  );
  assert.equal(
    validate({ schemaVersion: "wrong", scopes: [] }),
    false,
    "invalid schema fixture stayed green",
  );
}

async function selfTestOrchestration() {
  const root = await mkdtemp(join(tmpdir(), "jqstar-static-orchestration-"));
  const invoked = [];
  try {
    const selected = [
      { id: "red", command: "red", args: [], timeoutMs: 10, enforced: true, kind: "analysis" },
      { id: "green", command: "green", args: [], timeoutMs: 10, enforced: true, kind: "analysis" },
    ];
    const outcome = await executeStaticGates({
      mode: "fast",
      selected,
      runId: "sabotage",
      runDirectory: root,
      scopePath: join(root, "scope.json"),
      root,
      emit: () => undefined,
      runGateImplementation: async ({ gate }) => {
        invoked.push(gate.id);
        return { id: gate.id, status: gate.id === "red" ? "fail" : "pass", enforced: true };
      },
    });
    assert.deepEqual(invoked, ["red", "green"], "a failed static gate hid later configured gates");
    assert.equal(outcome.report.status, "fail", "static report did not preserve the red result");
    assert.equal(outcome.report.gates.length, 2, "static report omitted a selected gate");
    const validateReport = createSchemaValidator(
      await readJSON("schema/static-report.schema.json"),
    );
    assert(
      validateReport(outcome.report),
      `static report schema failed: ${JSON.stringify(validateReport.errors)}`,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}

const delay = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

async function waitForProbePid(pidFile, child, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (child.exitCode !== null || child.signalCode !== null) {
      throw new Error(
        `static signal probe exited before publishing its nested PID (${String(child.exitCode)}/${String(child.signalCode)})`,
      );
    }
    try {
      const pid = Number.parseInt(await readFile(pidFile, "utf8"), 10);
      if (Number.isSafeInteger(pid) && pid > 0) return pid;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await delay(20);
  }
  throw new Error("static signal probe did not publish its nested PID before the deadline");
}

function waitForExit(child, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    if (child.exitCode !== null || child.signalCode !== null) {
      resolve({ exitCode: child.exitCode, signal: child.signalCode });
      return;
    }
    const timeout = setTimeout(
      () => reject(new Error("static signal probe did not exit after SIGTERM")),
      timeoutMs,
    );
    child.once("close", (exitCode, signal) => {
      clearTimeout(timeout);
      resolve({ exitCode, signal });
    });
  });
}

async function waitForProcessExit(pid, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      process.kill(pid, 0);
    } catch (error) {
      if (error?.code === "ESRCH") return;
      throw error;
    }
    await delay(20);
  }
  throw new Error(`nested static analyzer process ${pid} survived runner termination`);
}

async function selfTestSignalCleanup() {
  const root = await mkdtemp(join(tmpdir(), "jqstar-static-signal-"));
  const pidFile = join(root, "nested.pid");
  let nestedPid;
  const child = spawn(
    process.execPath,
    ["scripts/quality/run-static.mjs", "fast", "--signal-cleanup-probe"],
    {
      cwd: repositoryRoot,
      env: {
        ...process.env,
        JQS_QUALITY_RUN_DIRECTORY: root,
        JQS_QUALITY_RUN_ID: "signal-cleanup-sabotage",
        JQS_STATIC_SIGNAL_PID_FILE: pidFile,
      },
      stdio: "ignore",
    },
  );
  let testError;
  let cleanupError;
  try {
    nestedPid = await waitForProbePid(pidFile, child);
    assert(child.kill("SIGTERM"), "could not signal the static runner sabotage fixture");
    const result = await waitForExit(child);
    assert.notEqual(result.exitCode, 0, "terminated static runner exited green");
    await waitForProcessExit(nestedPid);
    const report = JSON.parse(await readFile(join(root, "static-report.json"), "utf8"));
    assert.equal(
      report.status,
      "error",
      "terminated static runner did not publish an error report",
    );
    assert.equal(report.interruptedBy, "SIGTERM", "static report lost the terminating signal");
    assert.equal(
      report.gates.length,
      report.selectedGateCount,
      "terminated static report omitted a selected gate",
    );
  } catch (error) {
    testError = error;
  } finally {
    if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    if (nestedPid) {
      try {
        process.kill(nestedPid, "SIGKILL");
      } catch (error) {
        if (error?.code !== "ESRCH") cleanupError = error;
      }
    }
    await rm(root, { recursive: true, force: true });
  }
  if (testError) throw testError;
  if (cleanupError) throw cleanupError;
}

selfTestSourcePolicy();
await selfTestScopes();
await selfTestLinks();
selfTestPolicies();
await selfTestSchemas();
await selfTestOrchestration();
await selfTestSignalCleanup();
process.stdout.write(
  `static self-test: ${sourceSabotage.length} detectors, every scope selector, orchestration continuation, and nested signal cleanup proved red/green\n`,
);

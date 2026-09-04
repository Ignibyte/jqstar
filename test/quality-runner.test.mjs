import assert from "node:assert/strict";
import { execFile, spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, chmod, mkdir, mkdtemp, readFile, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import { runQuality } from "../scripts/quality/run.mjs";
import { writeAtomicJson } from "../scripts/quality/lib/files.mjs";
import { fingerprint } from "../scripts/quality/lib/git-state.mjs";
import {
  activeChildCount,
  runChild,
  terminateActiveChildren,
} from "../scripts/quality/lib/process.mjs";
import { verifyReceipt } from "../scripts/quality/verify-receipt.mjs";
import { validatePhaseEvidence } from "../scripts/quality/validate-ticket.mjs";
import { qualityConfig } from "../quality/gates.mjs";

const execFileAsync = promisify(execFile);
const commitGuardScript = fileURLToPath(
  new URL("../scripts/quality/commit-guard.mjs", import.meta.url),
);
const qualityRunnerScript = fileURLToPath(new URL("../scripts/quality/run.mjs", import.meta.url));
const verifyReceiptScript = fileURLToPath(
  new URL("../scripts/quality/verify-receipt.mjs", import.meta.url),
);
const preCommitHook = fileURLToPath(new URL("../.githooks/pre-commit", import.meta.url));
const inheritedQualityBaseSha = process.env.JQS_QUALITY_BASE_SHA;
delete process.env.JQS_QUALITY_BASE_SHA;
test.after(() => {
  if (inheritedQualityBaseSha === undefined) delete process.env.JQS_QUALITY_BASE_SHA;
  else process.env.JQS_QUALITY_BASE_SHA = inheritedQualityBaseSha;
});

async function repository() {
  const root = await mkdtemp(path.join(os.tmpdir(), "jqstar-quality-"));
  await writeFile(path.join(root, "tracked.txt"), "original\n");
  await writeFile(
    path.join(root, "fixture.mjs"),
    [
      'import { appendFile, writeFile } from "node:fs/promises";',
      'const behavior = process.argv[2] ?? "pass";',
      'if (behavior === "fail") process.exitCode = 7;',
      'if (behavior === "hang") setInterval(() => undefined, 1_000);',
      'if (behavior === "drift") await appendFile("tracked.txt", "changed\\n");',
      'if (behavior === "empty") await writeFile("evidence.json", JSON.stringify({ count: 0 }));',
      'if (behavior === "invalid") await writeFile("evidence.json", "not json");',
      'if (behavior === "not-measured") await writeFile("evidence.json", JSON.stringify({ status: "not-measured", reason: "no mutable production path" }));',
      'if (behavior === "identity") await writeFile("evidence.json", JSON.stringify({ schema: "good", status: "pass", runId: "wrong-run", mode: "wrong-mode" }));',
      'if (behavior === "bad-schema") await writeFile("evidence.json", JSON.stringify({ schema: "bad", status: "pass" }));',
      'if (behavior === "tests-failed") await writeFile("evidence.json", JSON.stringify({ numTotalTests: 1, success: false }));',
      'if (behavior === "hang") await writeFile("hang-started", "yes\\n");',
      'if (behavior === "orphan") {',
      '  const { spawn } = await import("node:child_process");',
      '  const child = spawn(process.execPath, ["-e", "setInterval(() => undefined, 1000)"], { stdio: ["ignore", "inherit", "inherit"] });',
      "  child.unref();",
      '  await writeFile("orphan-pid", String(child.pid));',
      '  process.stdout.write("direct-child-exited\\n");',
      "}",
      'if (behavior === "detached-hang") {',
      '  const { spawn } = await import("node:child_process");',
      '  const child = spawn(process.execPath, ["-e", "setInterval(() => undefined, 1000)"], { detached: true, stdio: "ignore" });',
      "  child.unref();",
      '  await writeFile("detached-pid", String(child.pid));',
      "  setInterval(() => undefined, 1000);",
      "}",
      'if (behavior === "later") await writeFile("later-ran", "yes\\n");',
      'if (behavior === "one") process.stdout.write("first-only\\n");',
      'if (behavior === "two") process.stdout.write("second-only\\n");',
    ].join("\n"),
  );
  await writeFile(
    path.join(root, "evidence.schema.json"),
    JSON.stringify({
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      required: ["schema", "status"],
      properties: { schema: { const: "good" }, status: { const: "pass" } },
    }),
  );
  await mkdir(path.join(root, ".githooks"));
  await writeFile(path.join(root, ".githooks", "pre-commit"), "#!/bin/sh\nexit 0\n");
  await chmod(path.join(root, ".githooks", "pre-commit"), 0o755);
  await execFileAsync("git", ["init", "-q"], { cwd: root });
  await execFileAsync("git", ["config", "user.name", "Quality Test"], { cwd: root });
  await execFileAsync("git", ["config", "user.email", "quality@example.invalid"], { cwd: root });
  await execFileAsync("git", ["add", "."], { cwd: root });
  await execFileAsync("git", ["commit", "-qm", "fixture"], { cwd: root });
  return root;
}

async function waitForFile(file, timeoutMs = 5_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      await access(file);
      return;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  throw new Error(`timed out waiting for ${file}`);
}

function waitForExit(child, timeoutMs = 5_000) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(
      () => reject(new Error("quality runner did not exit after interruption")),
      timeoutMs,
    );
    child.once("close", (exitCode, signal) => {
      clearTimeout(timeout);
      resolve({ exitCode, signal });
    });
  });
}

function configured(gates, mode = "fast") {
  return { schema: "jqstar-quality-config/1", modes: { [mode]: gates } };
}

function fixtureGate(behavior, extra = {}) {
  return {
    id: extra.id ?? behavior,
    command: process.execPath,
    args: ["fixture.mjs", behavior],
    timeoutMs: extra.timeoutMs ?? 2_000,
    stage: extra.stage ?? 0,
    enforced: true,
    kind: extra.kind ?? "test",
    version: { command: process.execPath, args: ["--version"] },
    ...(extra.evidence ? { evidence: extra.evidence } : {}),
    ...(extra.when ? { when: extra.when } : {}),
  };
}

test("canonical quality modes keep fixed, collision-free semantics", () => {
  const expected = {
    fast: ["ticket-workflow", "quality-runner-self-test", "format", "unit", "static-fast"],
    delivery: [
      "ticket-workflow",
      "quality-runner-self-test",
      "format",
      "unit",
      "coverage",
      "property",
      "static-delivery",
      "self-hosted",
      "package-quality",
      "release-quality",
      "browser-quality",
      "ticket-0044-detector-self-test",
    ],
    "full-audit": [
      "ticket-workflow",
      "quality-runner-self-test",
      "format",
      "unit",
      "unit-repeated-audit",
      "coverage",
      "property",
      "property-random-audit",
      "static-full-audit",
      "browser-repeated-audit",
      "self-hosted",
      "package-quality",
      "release-quality",
      "ticket-0044-detector-self-test",
    ],
  };
  for (const [mode, ids] of Object.entries(expected)) {
    const gates = qualityConfig.modes[mode];
    assert.deepEqual(
      gates.map((gate) => gate.id),
      ids,
      `${mode} gate membership drifted`,
    );
    assert.equal(new Set(gates.map((gate) => gate.id)).size, gates.length);
  }

  for (const mode of ["delivery", "full-audit"]) {
    const laterStages = qualityConfig.modes[mode].filter((gate) => gate.stage >= 3);
    assert.equal(
      new Set(laterStages.map((gate) => gate.stage)).size,
      laterStages.length,
      `${mode} has colliding stateful stages`,
    );
  }
});

test("command failures are red and do not write receipts", { concurrency: false }, async () => {
  const root = await repository();
  const result = await runQuality({
    mode: "delivery",
    config: configured([fixtureGate("fail")], "delivery"),
    cwd: root,
  });
  assert.equal(result.report.status, "fail");
  assert.equal(result.report.gates[0].exitCode, 7);
  await assert.rejects(access(result.receiptPath));
});

test(
  "CI base scope combines committed, worktree, and untracked changes and rejects unsafe bases",
  { concurrency: false },
  async () => {
    const root = await repository();
    const base = (await execFileAsync("git", ["rev-parse", "HEAD"], { cwd: root })).stdout.trim();
    await execFileAsync("git", ["tag", "quality-base", base], { cwd: root });
    await writeFile(path.join(root, "tracked.txt"), "committed\n");
    await writeFile(path.join(root, "committed.txt"), "new in HEAD\n");
    await execFileAsync("git", ["add", "tracked.txt", "committed.txt"], { cwd: root });
    await execFileAsync("git", ["commit", "-qm", "committed change"], { cwd: root });
    const tree = (
      await execFileAsync("git", ["rev-parse", `${base}^{tree}`], { cwd: root })
    ).stdout.trim();
    const side = (
      await execFileAsync("git", ["commit-tree", tree, "-p", base, "-m", "side commit"], {
        cwd: root,
      })
    ).stdout.trim();
    await writeFile(path.join(root, "tracked.txt"), "committed\nlocal\n");
    await writeFile(path.join(root, "untracked.txt"), "untracked\n");

    process.env.JQS_QUALITY_BASE_SHA = "quality-base";
    let result;
    try {
      result = await runQuality({
        mode: "fast",
        config: configured([fixtureGate("pass")]),
        cwd: root,
        runId: "base-scope",
      });
    } finally {
      delete process.env.JQS_QUALITY_BASE_SHA;
    }
    const scope = JSON.parse(await readFile(result.scopePath, "utf8"));
    assert.equal(scope.base, base);
    assert.equal(result.report.base, base);
    assert.deepEqual(scope.changedPaths, ["committed.txt", "tracked.txt", "untracked.txt"]);
    assert.deepEqual(scope.changedLines["tracked.txt"], [1, 2]);
    assert(scope.changedLines["committed.txt"].includes(1));
    assert(scope.changedLines["untracked.txt"].includes(1));

    await assert.rejects(
      runQuality({
        mode: "fast",
        config: configured([fixtureGate("pass")]),
        cwd: root,
        runId: "invalid-base",
        baseRef: "not-a-quality-ref",
      }),
      /does not resolve to a commit/,
    );
    await assert.rejects(
      runQuality({
        mode: "fast",
        config: configured([fixtureGate("pass")]),
        cwd: root,
        runId: "non-ancestor-base",
        baseRef: side,
      }),
      /not an ancestor of HEAD/,
    );
  },
);

test(
  "SIGTERM records unstarted stages as errors without launching them",
  { concurrency: false },
  async () => {
    const root = await repository();
    const configuration = path.join(root, "quality-config.mjs");
    await writeFile(
      configuration,
      `const gate = (id, behavior, stage) => ({
  id,
  command: process.execPath,
  args: ["fixture.mjs", behavior],
  timeoutMs: 10000,
  stage,
  enforced: true,
  kind: "test",
  version: { command: process.execPath, args: ["--version"] },
});
export const qualityConfig = {
  schema: "jqstar-quality-config/1",
  modes: { fast: [gate("active", "hang", 0), gate("later", "later", 1)] },
};
`,
    );
    const child = spawn(
      process.execPath,
      [qualityRunnerScript, "fast", "--config", configuration],
      { cwd: root, stdio: "ignore" },
    );
    try {
      await waitForFile(path.join(root, "hang-started"));
      assert(child.kill("SIGTERM"), "could not signal the quality runner sabotage fixture");
      const exit = await waitForExit(child);
      assert.equal(exit.exitCode, 1);
      await assert.rejects(access(path.join(root, "later-ran")));
      const report = JSON.parse(
        await readFile(path.join(root, ".git", "jqstar", "latest-report.json"), "utf8"),
      );
      assert.equal(report.status, "error");
      assert.equal(report.interruption, "SIGTERM");
      assert.deepEqual(
        report.gates.map(({ id, status }) => ({ id, status })),
        [
          { id: "active", status: "error" },
          { id: "later", status: "error" },
        ],
      );
      assert.match(report.gates[1].reason, /interrupted by SIGTERM before invocation/);
    } finally {
      if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    }
  },
);

test(
  "interruption during gate setup prevents the child from spawning",
  { concurrency: false },
  async () => {
    const root = await repository();
    let interruptionChecks = 0;
    const result = await runQuality({
      mode: "fast",
      config: configured([fixtureGate("later")]),
      cwd: root,
      runId: "pre-spawn-interruption",
      interrupted: () => {
        interruptionChecks += 1;
        return interruptionChecks === 1 ? null : "SIGINT";
      },
    });
    assert.equal(result.report.status, "error");
    assert.equal(result.report.interruption, "SIGINT");
    assert.equal(result.report.gates[0].status, "error");
    assert.match(result.report.gates[0].reason, /was not started/);
    await assert.rejects(access(path.join(root, "later-ran")));
  },
);

test(
  "timeouts, killed processes, and missing tools are errors",
  { concurrency: false },
  async () => {
    const root = await repository();
    const timeout = await runQuality({
      mode: "fast",
      config: configured([fixtureGate("hang", { timeoutMs: 30 })]),
      cwd: root,
      runId: "timeout",
    });
    assert.equal(timeout.report.gates[0].status, "error");
    assert.match(timeout.report.gates[0].reason, /timed out/);

    const missing = await runQuality({
      mode: "fast",
      config: configured([
        {
          ...fixtureGate("pass"),
          id: "missing",
          command: "jqstar-tool-that-does-not-exist",
          version: { command: process.execPath, args: ["--version"] },
        },
      ]),
      cwd: root,
      runId: "missing",
    });
    assert.equal(missing.report.gates[0].status, "error");
    assert.match(missing.report.gates[0].reason, /could not start/);

    const killedPromise = runQuality({
      mode: "fast",
      config: configured([fixtureGate("hang", { timeoutMs: 5_000 })]),
      cwd: root,
      runId: "killed",
    });
    while (activeChildCount() === 0) await new Promise((resolve) => setTimeout(resolve, 10));
    terminateActiveChildren("SIGTERM");
    const killed = await killedPromise;
    assert.equal(killed.report.gates[0].status, "error");
    assert.match(killed.report.gates[0].reason, /killed/);
  },
);

test(
  "a completed command releases descendants that retain its output pipes",
  { concurrency: false },
  async () => {
    const root = await repository();
    const started = Date.now();
    const result = await runChild({
      command: process.execPath,
      args: ["fixture.mjs", "orphan"],
      cwd: root,
      timeoutMs: 5_000,
      env: process.env,
    });
    assert.equal(result.exitCode, 0);
    assert.equal(result.timedOut, false);
    assert.match(result.stdout, /direct-child-exited/);
    assert(Date.now() - started < 3_000, "descendant-held pipes delayed command completion");
    const orphanPid = Number(await readFile(path.join(root, "orphan-pid"), "utf8"));
    await new Promise((resolve) => setTimeout(resolve, 50));
    assert.throws(() => process.kill(orphanPid, 0), { code: "ESRCH" });
  },
);

test("a timed-out command releases detached descendants", { concurrency: false }, async () => {
  const root = await repository();
  const result = await runChild({
    command: process.execPath,
    args: ["fixture.mjs", "detached-hang"],
    cwd: root,
    timeoutMs: 100,
    env: process.env,
  });
  assert.equal(result.timedOut, true);
  const detachedPid = Number(await readFile(path.join(root, "detached-pid"), "utf8"));
  await new Promise((resolve) => setTimeout(resolve, 50));
  assert.throws(() => process.kill(detachedPid, 0), { code: "ESRCH" });
});

test("empty and unreadable required evidence cannot pass", { concurrency: false }, async () => {
  const root = await repository();
  for (const behavior of ["empty", "invalid"]) {
    const result = await runQuality({
      mode: "fast",
      config: configured([
        fixtureGate(behavior, {
          evidence: { path: "evidence.json", format: "json", countPath: "count", minimum: 1 },
        }),
      ]),
      cwd: root,
      runId: `evidence-${behavior}`,
    });
    assert.equal(result.report.gates[0].status, "error");
  }
});

test(
  "a non-empty native test report with failed suites cannot pass",
  { concurrency: false },
  async () => {
    const root = await repository();
    const result = await runQuality({
      mode: "fast",
      config: configured([
        fixtureGate("tests-failed", {
          evidence: {
            path: "evidence.json",
            format: "json",
            countPath: "numTotalTests",
            minimum: 1,
            statusPath: "success",
            passValues: [true],
          },
        }),
      ]),
      cwd: root,
      runId: "failed-native-tests",
    });
    assert.equal(result.report.gates[0].status, "error");
    assert.match(result.report.gates[0].reason, /success is false/);
  },
);

test(
  "schema and run identity mismatches cannot pass as evidence",
  { concurrency: false },
  async () => {
    const root = await repository();
    const invalidSchema = await runQuality({
      mode: "fast",
      config: configured([
        fixtureGate("bad-schema", {
          evidence: {
            path: "evidence.json",
            format: "json",
            schemaPath: "evidence.schema.json",
            statusPath: "status",
          },
        }),
      ]),
      cwd: root,
      runId: "schema-mismatch",
    });
    assert.equal(invalidSchema.report.gates[0].status, "error");
    assert.match(invalidSchema.report.gates[0].reason, /violates evidence\.schema\.json/);

    const invalidIdentity = await runQuality({
      mode: "fast",
      config: configured([
        fixtureGate("identity", {
          evidence: {
            path: "evidence.json",
            format: "json",
            runIdPath: "runId",
            modePath: "mode",
            expectedMode: "expected-mode",
            statusPath: "status",
          },
        }),
      ]),
      cwd: root,
      runId: "identity-mismatch",
    });
    assert.equal(invalidIdentity.report.gates[0].status, "error");
    assert.match(invalidIdentity.report.gates[0].reason, /run ID/);
  },
);

test(
  "named skips remain skips and do not masquerade as passes",
  { concurrency: false },
  async () => {
    const root = await repository();
    const gate = fixtureGate("pass", {
      when: { changed: ["src/**"], reason: "source did not change" },
    });
    const inheritedForceAll = process.env.JQS_QUALITY_FORCE_ALL;
    process.env.JQS_QUALITY_FORCE_ALL = "1";
    let result;
    try {
      result = await runQuality({
        mode: "fast",
        config: configured([gate]),
        cwd: root,
        runId: "skip",
      });
    } finally {
      if (inheritedForceAll === undefined) delete process.env.JQS_QUALITY_FORCE_ALL;
      else process.env.JQS_QUALITY_FORCE_ALL = inheritedForceAll;
    }
    assert.equal(result.report.status, "pass");
    assert.equal(result.report.gates[0].status, "skip");
    assert.equal(result.report.gates[0].reason, "source did not change");

    const forced = await runQuality({
      mode: "fast",
      config: configured([gate]),
      cwd: root,
      runId: "forced",
      forceAll: true,
    });
    assert.equal(forced.report.status, "pass");
    assert.equal(forced.report.gates[0].status, "pass");
    assert.equal(forced.report.gates[0].selection.selected, true);

    const evidenceSkip = await runQuality({
      mode: "fast",
      config: configured([
        fixtureGate("not-measured", {
          evidence: {
            path: "evidence.json",
            format: "json",
            statusPath: "status",
            skipValues: ["not-measured"],
            reasonPath: "reason",
          },
        }),
      ]),
      cwd: root,
      runId: "evidence-skip",
    });
    assert.equal(evidenceSkip.report.gates[0].status, "skip");
    assert.equal(evidenceSkip.report.gates[0].reason, "no mutable production path");
  },
);

test(
  "result-write failure rejects the run and leaves no receipt",
  { concurrency: false },
  async () => {
    const root = await repository();
    let writes = 0;
    const writeJson = async (target, value) => {
      writes += 1;
      if (writes > 1) throw new Error("planted recording failure");
      await writeAtomicJson(target, value);
    };
    await assert.rejects(
      runQuality({
        mode: "delivery",
        config: configured([fixtureGate("pass")], "delivery"),
        cwd: root,
        runId: "report-failure",
        writeJson,
      }),
      /could not be recorded/,
    );
  },
);

test("fingerprint drift prevents a receipt", { concurrency: false }, async () => {
  const root = await repository();
  const result = await runQuality({
    mode: "delivery",
    config: configured([fixtureGate("drift")], "delivery"),
    cwd: root,
    runId: "drift",
  });
  assert.equal(result.report.status, "fail");
  assert.notEqual(result.report.startFingerprint.digest, result.report.endFingerprint.digest);
  await assert.rejects(access(result.receiptPath));
});

test(
  "editing a gated file makes a previously valid receipt stale",
  { concurrency: false },
  async () => {
    const root = await repository();
    const result = await runQuality({
      mode: "delivery",
      config: configured([fixtureGate("pass")], "delivery"),
      cwd: root,
      runId: "receipt",
    });
    assert.equal(result.report.status, "pass");
    await verifyReceipt(root);
    await writeFile(path.join(root, "tracked.txt"), "edited later\n");
    await assert.rejects(verifyReceipt(root), /stale/);
  },
);

test(
  "changing HEAD makes a receipt stale even when file content is unchanged",
  { concurrency: false },
  async () => {
    const root = await repository();
    await runQuality({
      mode: "delivery",
      config: configured([fixtureGate("pass")], "delivery"),
      cwd: root,
      runId: "head-receipt",
    });
    await execFileAsync("git", ["commit", "--allow-empty", "-qm", "new head"], { cwd: root });
    await assert.rejects(verifyReceipt(root), /HEAD changed/);
  },
);

test("changing a passing report invalidates its receipt", { concurrency: false }, async () => {
  const root = await repository();
  const result = await runQuality({
    mode: "delivery",
    config: configured([fixtureGate("pass")], "delivery"),
    cwd: root,
    runId: "report-integrity",
  });
  await writeFile(result.reportPath, `${JSON.stringify({ ...result.report, status: "fail" })}\n`);
  await assert.rejects(verifyReceipt(root), /not a matching passing|changed after approval/);
});

test(
  "receipt verification binds report mode and fingerprints",
  { concurrency: false },
  async () => {
    const root = await repository();
    const result = await runQuality({
      mode: "delivery",
      config: configured([fixtureGate("pass")], "delivery"),
      cwd: root,
      runId: "receipt-invariants",
    });
    const report = JSON.parse(await readFile(result.reportPath, "utf8"));
    const receipt = JSON.parse(await readFile(result.receiptPath, "utf8"));
    const tampered = `${JSON.stringify({ ...report, mode: "full-audit" })}\n`;
    await writeFile(result.reportPath, tampered);
    await writeFile(
      result.receiptPath,
      `${JSON.stringify({
        ...receipt,
        reportSha256: createHash("sha256").update(tampered).digest("hex"),
      })}\n`,
    );
    await assert.rejects(verifyReceipt(root), /not a matching passing quality report/);
  },
);

test(
  "receipt verification rejects structurally invalid receipt and report documents",
  { concurrency: false },
  async () => {
    const receiptRoot = await repository();
    const receiptResult = await runQuality({
      mode: "delivery",
      config: configured([fixtureGate("pass")], "delivery"),
      cwd: receiptRoot,
      runId: "invalid-receipt-schema",
    });
    const receipt = JSON.parse(await readFile(receiptResult.receiptPath, "utf8"));
    await writeFile(
      receiptResult.receiptPath,
      `${JSON.stringify({ ...receipt, unexpected: true })}\n`,
    );
    await assert.rejects(verifyReceipt(receiptRoot), /quality-receipt\.schema\.json/);

    const reportRoot = await repository();
    const reportResult = await runQuality({
      mode: "delivery",
      config: configured([fixtureGate("pass")], "delivery"),
      cwd: reportRoot,
      runId: "invalid-report-schema",
    });
    const report = JSON.parse(await readFile(reportResult.reportPath, "utf8"));
    delete report.environment;
    await writeFile(reportResult.reportPath, `${JSON.stringify(report)}\n`);
    await assert.rejects(verifyReceipt(reportRoot), /quality-report\.schema\.json/);
  },
);

test(
  "phase evidence is schema-valid, current-tree-bound, and receipt-authorized",
  { concurrency: false },
  async () => {
    const root = await repository();
    const evidenceDirectory = path.join(root, ".git", "jqstar");
    await mkdir(evidenceDirectory, { recursive: true });
    const fabricated = path.join(evidenceDirectory, "fabricated-report.json");
    await writeFile(
      fabricated,
      `${JSON.stringify({
        schema: "jqstar-quality-report/1",
        status: "pass",
        mode: "delivery",
        gates: [{ enforced: true, kind: "test", status: "pass" }],
      })}\n`,
    );
    await assert.rejects(
      validatePhaseEvidence({ root, reportPath: fabricated, phase: "test" }),
      /quality-report\.schema\.json/,
    );

    const fast = await runQuality({
      mode: "fast",
      config: configured([fixtureGate("pass")]),
      cwd: root,
      runId: "phase-fast",
    });
    await validatePhaseEvidence({ root, reportPath: fast.reportPath, phase: "code" });
    await writeFile(path.join(root, "tracked.txt"), "stale phase evidence\n");
    await assert.rejects(
      validatePhaseEvidence({ root, reportPath: fast.reportPath, phase: "code" }),
      /gated files changed/,
    );
    await writeFile(path.join(root, "tracked.txt"), "original\n");

    const delivery = await runQuality({
      mode: "delivery",
      config: configured([fixtureGate("pass")], "delivery"),
      cwd: root,
      runId: "phase-delivery",
    });
    await validatePhaseEvidence({
      root,
      reportPath: delivery.reportPath,
      phase: "test",
    });
    const latest = path.join(evidenceDirectory, "latest-report.json");
    await validatePhaseEvidence({ root, reportPath: latest, phase: "test" });
    const latestSource = await readFile(latest);
    await writeFile(latest, Buffer.concat([latestSource, Buffer.from("\n")]));
    await assert.rejects(
      validatePhaseEvidence({ root, reportPath: latest, phase: "test" }),
      /not the report authorized by the current receipt/,
    );
    await writeFile(latest, latestSource);
    const copied = path.join(evidenceDirectory, "copied-report.json");
    await writeFile(copied, await readFile(delivery.reportPath));
    await assert.rejects(
      validatePhaseEvidence({ root, reportPath: copied, phase: "test" }),
      /not the report authorized by the current receipt/,
    );
  },
);

test(
  "commit guard invokes receipt refusal and remains explicit and reversible",
  { concurrency: false },
  async () => {
    const root = await repository();
    await writeFile(path.join(root, ".githooks", "pre-commit"), await readFile(preCommitHook));
    await chmod(path.join(root, ".githooks", "pre-commit"), 0o755);
    await mkdir(path.join(root, "scripts"), { recursive: true });
    await symlink(path.dirname(verifyReceiptScript), path.join(root, "scripts", "quality"), "dir");
    const runGuard = (operation) =>
      execFileAsync(process.execPath, [commitGuardScript, operation], { cwd: root });
    const runHook = () =>
      execFileAsync(path.join(root, ".githooks", "pre-commit"), [], { cwd: root });
    assert.match((await runGuard("status")).stdout, /not installed/);
    await runGuard("install");
    assert.equal(
      (
        await execFileAsync("git", ["config", "--local", "--get", "core.hooksPath"], { cwd: root })
      ).stdout.trim(),
      ".githooks",
    );
    await assert.rejects(runHook(), /delivery receipt is missing or unreadable/);
    await runQuality({
      mode: "delivery",
      config: configured([fixtureGate("pass")], "delivery"),
      cwd: root,
      runId: "commit-hook",
    });
    assert.match((await runHook()).stdout, /matches the current worktree/);
    await writeFile(path.join(root, "tracked.txt"), "changed after receipt\n");
    await assert.rejects(runHook(), /receipt is stale/);
    await writeFile(path.join(root, "tracked.txt"), "original\n");
    assert.match((await runHook()).stdout, /matches the current worktree/);
    await runGuard("uninstall");
    await assert.rejects(
      execFileAsync("git", ["config", "--local", "--get", "core.hooksPath"], { cwd: root }),
    );
    await execFileAsync("git", ["config", "--local", "core.hooksPath", "custom-hooks"], {
      cwd: root,
    });
    await assert.rejects(runGuard("install"), /refusing to replace/);
  },
);

test(
  "fingerprints cover dirty, untracked, renamed, deleted, and restored files",
  { concurrency: false },
  async () => {
    const root = await repository();
    const baseline = await fingerprint(root);
    await writeFile(path.join(root, "tracked.txt"), "dirty\n");
    assert.notEqual((await fingerprint(root)).digest, baseline.digest);
    await writeFile(path.join(root, "tracked.txt"), "original\n");
    assert.equal((await fingerprint(root)).digest, baseline.digest);
    await writeFile(path.join(root, "untracked.txt"), "new\n");
    assert.notEqual((await fingerprint(root)).digest, baseline.digest);
    await execFileAsync("git", ["clean", "-f", "untracked.txt"], { cwd: root });
    assert.equal((await fingerprint(root)).digest, baseline.digest);
    await execFileAsync("git", ["mv", "tracked.txt", "renamed.txt"], { cwd: root });
    assert.notEqual((await fingerprint(root)).digest, baseline.digest);
    await execFileAsync("git", ["mv", "renamed.txt", "tracked.txt"], { cwd: root });
    assert.equal((await fingerprint(root)).digest, baseline.digest);
    await execFileAsync("git", ["rm", "tracked.txt"], { cwd: root });
    assert.notEqual((await fingerprint(root)).digest, baseline.digest);
    await execFileAsync("git", ["restore", "--staged", "tracked.txt"], { cwd: root });
    await execFileAsync("git", ["restore", "tracked.txt"], { cwd: root });
    assert.equal((await fingerprint(root)).digest, baseline.digest);
  },
);

test(
  "parallel gates retain isolated logs in deterministic report order",
  { concurrency: false },
  async () => {
    const root = await repository();
    const result = await runQuality({
      mode: "fast",
      config: configured([
        fixtureGate("one", { id: "first" }),
        fixtureGate("two", { id: "second" }),
      ]),
      cwd: root,
      runId: "parallel",
    });
    assert.deepEqual(
      result.report.gates.map((gate) => gate.id),
      ["first", "second"],
    );
    const first = await readFile(path.resolve(root, result.report.gates[0].log), "utf8");
    const second = await readFile(path.resolve(root, result.report.gates[1].log), "utf8");
    assert.match(first, /first-only/);
    assert.doesNotMatch(first, /second-only/);
    assert.match(second, /second-only/);
    assert.doesNotMatch(second, /first-only/);
  },
);

test("invalid modes and delivery configurations fail closed", { concurrency: false }, async () => {
  const root = await repository();
  await assert.rejects(
    runQuality({ mode: undefined, config: configured([fixtureGate("pass")]), cwd: root }),
    /mode must be/,
  );
  await assert.rejects(
    runQuality({
      mode: "delivery",
      config: configured([{ ...fixtureGate("pass"), kind: "analysis" }], "delivery"),
      cwd: root,
    }),
    /enforced test gate/,
  );

  const interrupted = await runQuality({
    mode: "delivery",
    config: configured([fixtureGate("pass")], "delivery"),
    cwd: root,
    runId: "pre-interrupted",
    interrupted: () => "SIGINT",
  });
  assert.equal(interrupted.report.status, "error");
  assert.equal(interrupted.report.interruption, "SIGINT");
  await assert.rejects(access(interrupted.receiptPath));
});

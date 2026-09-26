import assert from "node:assert/strict";
import { lstat, mkdir, mkdtemp } from "node:fs/promises";
import { basename, dirname, join, relative } from "node:path";
import { pathToFileURL } from "node:url";
import { repositoryRoot } from "../quality/lib/git-state.mjs";
import { runChild, terminateActiveChildren } from "../quality/lib/process.mjs";
import { readAuditFile } from "./files.mjs";
import { loadNavigationInputs } from "./navigation-inputs.mjs";
import { validateNavigationReport } from "./navigation.mjs";
import { createReportLoader } from "./reports.mjs";
import {
  assertNavigationProcess,
  executeFrozenNavigation,
  navigationBrowserVersions,
  navigationTimeoutMs,
  writeNavigationRecord,
} from "./navigation-runner.mjs";

const outputParent = ".git/jqstar/program-audit/navigation-executions";

async function createOutput(root) {
  let parent = root;
  for (const segment of outputParent.split("/")) {
    parent = join(parent, segment);
    if (segment !== ".git")
      await mkdir(parent, { mode: 0o700 }).catch((error) => {
        if (error.code !== "EEXIST") throw error;
      });
    const metadata = await lstat(parent);
    assert(
      metadata.isDirectory() && !metadata.isSymbolicLink(),
      "Unsafe navigation output directory",
    );
  }
  return mkdtemp(join(parent, `${new Date().toISOString().replaceAll(":", "-")}-`));
}

export async function runNavigationAudit(root, artifactPath) {
  const inputs = await loadNavigationInputs(root, artifactPath);
  const browserVersions = await navigationBrowserVersions();
  assert.deepEqual(
    await loadNavigationInputs(root, artifactPath),
    inputs,
    "Navigation inputs changed during browser preflight",
  );
  const directory = await createOutput(root);
  const runId = basename(directory);
  const manifest = {
    schema: "jqstar-program-navigation-manifest/1",
    runId,
    frozenAt: new Date().toISOString(),
    timeoutMs: navigationTimeoutMs,
    inputs,
    browserVersions,
  };
  const frozen = await writeNavigationRecord(root, directory, "manifest.json", manifest);
  const command = {
    executable: process.execPath,
    args: ["scripts/program-audit/run-navigation.mjs", "--execute", frozen.path, frozen.sha256],
  };
  let interruption = null;
  const handlers = new Map(
    ["SIGHUP", "SIGINT", "SIGTERM"].map((signal) => [
      signal,
      () => {
        interruption ??= signal;
        terminateActiveChildren(signal);
      },
    ]),
  );
  for (const [signal, handler] of handlers) process.on(signal, handler);
  let stage = "execution";
  let execution;
  try {
    const startedAt = new Date().toISOString();
    const result = await runChild({
      command: command.executable,
      args: command.args,
      cwd: root,
      timeoutMs: navigationTimeoutMs,
      env: process.env,
    });
    const endedAt = new Date().toISOString();
    const stdout = await writeNavigationRecord(root, directory, "stdout.log", result.stdout, true);
    const stderr = await writeNavigationRecord(root, directory, "stderr.log", result.stderr, true);
    execution = {
      command,
      timeoutMs: navigationTimeoutMs,
      startedAt,
      endedAt,
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      spawnError: result.spawnError === null ? null : "spawn-error",
      interruption,
      stdout,
      stderr,
    };
    await writeNavigationRecord(root, directory, "process.json", execution);
    assertNavigationProcess(result);
    assert.equal(interruption, null, "Navigation supervisor was interrupted");
    stage = "input-readback";
    await readAuditFile(root, frozen.path, { digest: frozen.sha256, maximumBytes: frozen.bytes });
    assert.deepEqual(
      await loadNavigationInputs(root, artifactPath),
      inputs,
      "Navigation inputs changed during supervised execution",
    );
    stage = "raw-evidence";
    const raw = await readAuditFile(root, relative(root, join(directory, "raw.json")));
    const report = { path: raw.path, sha256: raw.sha256, bytes: raw.bytes };
    const load = await createReportLoader(root, inputs.schemas);
    const loaded = await load("navigation", report);
    const summary = validateNavigationReport(loaded.data, {
      ...inputs.context,
      browserVersions,
      runId,
      start: Date.parse(startedAt),
      end: Date.parse(endedAt),
    });
    assert.deepEqual(
      await loadNavigationInputs(root, artifactPath),
      inputs,
      "Navigation inputs changed during result validation",
    );
    const index = {
      schema: "jqstar-program-navigation-execution/1",
      status: "pass",
      scope: "navigation-component",
      source: inputs.source,
      manifest: frozen,
      execution,
      report,
      summary,
    };
    const reference = await writeNavigationRecord(root, directory, "execution.json", index);
    return { ...reference, summary };
  } catch (error) {
    await writeNavigationRecord(root, directory, "failure.json", {
      schema: "jqstar-program-navigation-failure/1",
      status: "fail",
      stage,
      manifest: frozen,
      execution: execution ?? null,
    });
    throw error;
  } finally {
    for (const [signal, handler] of handlers) process.off(signal, handler);
  }
}

export async function navigationAuditCommand(args = process.argv.slice(2)) {
  const root = await repositoryRoot();
  if (args.length === 3 && args[0] === "--execute") {
    assert(
      args[1].startsWith(`${outputParent}/`) &&
        args[1].endsWith("/manifest.json") &&
        /^[a-f0-9]{64}$/u.test(args[2]),
      "Unexpected navigation child manifest",
    );
    const file = await readAuditFile(root, args[1], { digest: args[2] });
    const manifest = JSON.parse(file.source);
    assert.equal(
      manifest.runId,
      basename(dirname(file.path)),
      "Navigation manifest run directory differs",
    );
    return executeFrozenNavigation(root, join(root, dirname(file.path)), manifest);
  }
  assert(
    args.length === 2 && args[0] === "--artifact",
    "Expected --artifact <ordinary prepared tarball>",
  );
  const result = await runNavigationAudit(root, args[1]);
  process.stdout.write(
    `Navigation component passed: ${result.summary.flowCount} flows; ${result.path}\n`,
  );
  return result;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  try {
    await navigationAuditCommand();
  } catch (error) {
    process.stderr.write(
      `Navigation audit failed: ${error instanceof assert.AssertionError ? error.message.split("\n")[0] : "incomplete or unreadable execution"}.\n`,
    );
    process.exitCode = 2;
  }
}

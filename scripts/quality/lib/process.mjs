import { spawn, spawnSync } from "node:child_process";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { createSchemaValidator } from "../validate-json.mjs";

const activeChildren = new Set();

export function terminateDescendants(parentPid, signal = "SIGTERM") {
  if (process.platform === "win32" || !Number.isSafeInteger(parentPid) || parentPid < 1) return;
  const listing = spawnSync("ps", ["-axo", "pid=,ppid="], { encoding: "utf8" });
  if (listing.status !== 0) return;
  const children = new Map();
  for (const line of listing.stdout.split("\n")) {
    const match = /^\s*(\d+)\s+(\d+)\s*$/u.exec(line);
    if (!match) continue;
    const pid = Number(match[1]);
    const parent = Number(match[2]);
    const entries = children.get(parent) ?? [];
    entries.push(pid);
    children.set(parent, entries);
  }
  const descendants = [];
  const visit = (pid) => {
    for (const childPid of children.get(pid) ?? []) {
      visit(childPid);
      descendants.push(childPid);
    }
  };
  visit(parentPid);
  for (const pid of descendants) {
    try {
      process.kill(pid, signal);
    } catch {
      // The descendant may exit while the process tree is being traversed.
    }
  }
}

function killChild(child, signal) {
  terminateDescendants(child.pid, signal);
  if (process.platform !== "win32" && child.pid) {
    try {
      process.kill(-child.pid, signal);
      return;
    } catch {
      // The process may have exited between the liveness check and the signal.
    }
  }
  child.kill(signal);
}

function terminateResidualGroup(child, signal) {
  if (process.platform === "win32" || !child.pid) return;
  try {
    process.kill(-child.pid, signal);
  } catch {
    // A clean command has no remaining process group after its direct child exits.
  }
}

export function terminateActiveChildren(signal = "SIGTERM") {
  for (const child of activeChildren) {
    killChild(child, signal);
  }
}

export function activeChildCount() {
  return activeChildren.size;
}

async function inspectEvidence(root, evidence, context) {
  if (!evidence) return { ok: true, status: "pass" };
  const evidencePath = path.resolve(root, evidence.path);
  let metadata;
  let contents;
  try {
    metadata = await stat(evidencePath);
    contents = await readFile(evidencePath, "utf8");
  } catch (error) {
    return {
      ok: false,
      reason: `required evidence is unreadable: ${evidence.path} (${error.message})`,
    };
  }
  if (!metadata.isFile() || metadata.size === 0) {
    return { ok: false, reason: `required evidence is empty: ${evidence.path}` };
  }
  if (evidence.format !== "json") return { ok: true, status: "pass" };

  let parsed;
  try {
    parsed = JSON.parse(contents);
  } catch (error) {
    return {
      ok: false,
      reason: `required evidence is invalid JSON: ${evidence.path} (${error.message})`,
    };
  }

  if (evidence.schemaPath) {
    let validate;
    try {
      validate = createSchemaValidator(
        JSON.parse(await readFile(path.resolve(root, evidence.schemaPath), "utf8")),
      );
    } catch (error) {
      return {
        ok: false,
        reason: `evidence schema is unreadable: ${evidence.schemaPath} (${error.message})`,
      };
    }
    if (!validate(parsed)) {
      return {
        ok: false,
        reason: `required evidence violates ${evidence.schemaPath}: ${JSON.stringify(validate.errors)}`,
      };
    }
  }

  if (evidence.runIdPath) {
    const value = evidence.runIdPath.split(".").reduce((result, key) => result?.[key], parsed);
    if (value !== context.runId) {
      return {
        ok: false,
        reason: `required evidence run ID at ${evidence.runIdPath} is ${String(value)}; expected ${context.runId}`,
      };
    }
  }
  if (evidence.modePath) {
    const value = evidence.modePath.split(".").reduce((result, key) => result?.[key], parsed);
    if (value !== evidence.expectedMode) {
      return {
        ok: false,
        reason: `required evidence mode at ${evidence.modePath} is ${String(value)}; expected ${String(evidence.expectedMode)}`,
      };
    }
  }

  if (evidence.countPath) {
    const count = evidence.countPath.split(".").reduce((value, key) => value?.[key], parsed);
    if (!Number.isFinite(count) || count < (evidence.minimum ?? 1)) {
      return {
        ok: false,
        reason: `required evidence has an empty or unreadable scope at ${evidence.countPath}`,
      };
    }
  }
  if (evidence.statusPath) {
    const value = evidence.statusPath.split(".").reduce((result, key) => result?.[key], parsed);
    if ((evidence.skipValues ?? []).includes(value)) {
      const reason = evidence.reasonPath
        ? evidence.reasonPath.split(".").reduce((result, key) => result?.[key], parsed)
        : undefined;
      return { ok: true, status: "skip", reason: reason ?? `evidence status is ${String(value)}` };
    }
    if (!(evidence.passValues ?? ["pass"]).includes(value)) {
      return {
        ok: false,
        reason: `required evidence status at ${evidence.statusPath} is ${String(value)}`,
      };
    }
  }
  return { ok: true, status: "pass" };
}

export function runChild({ command, args, cwd, timeoutMs, env }) {
  return new Promise((resolve) => {
    const started = Date.now();
    const stdout = [];
    const stderr = [];
    let timedOut = false;
    let spawnError = null;
    let escalation;
    const child = spawn(command, args, {
      cwd,
      env,
      shell: false,
      detached: process.platform !== "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    activeChildren.add(child);
    child.stdout.on("data", (chunk) => stdout.push(chunk));
    child.stderr.on("data", (chunk) => stderr.push(chunk));
    child.on("error", (error) => {
      spawnError = error;
    });
    const timeout = setTimeout(() => {
      timedOut = true;
      killChild(child, "SIGTERM");
      escalation = setTimeout(() => killChild(child, "SIGKILL"), 1_000);
      escalation.unref();
    }, timeoutMs);
    child.on("exit", () => {
      clearTimeout(timeout);
      terminateResidualGroup(child, "SIGTERM");
      if (!escalation) {
        escalation = setTimeout(() => terminateResidualGroup(child, "SIGKILL"), 1_000);
        escalation.unref();
      }
    });
    child.on("close", (exitCode, signal) => {
      clearTimeout(timeout);
      if (escalation) clearTimeout(escalation);
      activeChildren.delete(child);
      resolve({
        exitCode,
        signal,
        timedOut,
        spawnError,
        stdout: Buffer.concat(stdout).toString("utf8"),
        stderr: Buffer.concat(stderr).toString("utf8"),
        durationMs: Date.now() - started,
      });
    });
  });
}

export async function toolVersion(gate, cwd, cache) {
  const version = gate.version ?? { command: gate.command, args: ["--version"] };
  const key = JSON.stringify(version);
  if (cache.has(key)) return cache.get(key);
  const result = await runChild({
    command: version.command,
    args: version.args,
    cwd,
    timeoutMs: 10_000,
    env: process.env,
  });
  const value =
    result.exitCode === 0 ? result.stdout.trim() || result.stderr.trim() : "unavailable";
  cache.set(key, value);
  return value;
}

export async function runGate({
  gate,
  root,
  logDirectory,
  runId,
  runDirectory,
  scopePath,
  versionCache,
  interruption = () => undefined,
}) {
  const startedAt = new Date().toISOString();
  const log = path.join(logDirectory, `${gate.id}.log`);
  await mkdir(logDirectory, { recursive: true });
  const interruptedBeforeSpawn = interruption();
  if (interruptedBeforeSpawn) {
    const endedAt = new Date().toISOString();
    await writeFile(
      log,
      [
        `$ ${[gate.command, ...gate.args].join(" ")}`,
        `exit=null signal=${interruptedBeforeSpawn} timeout=false`,
        "",
        "[stdout]",
        "",
        "[stderr]",
        `quality runner was interrupted by ${interruptedBeforeSpawn} before process start`,
      ].join("\n"),
    );
    return {
      id: gate.id,
      kind: gate.kind ?? "analysis",
      command: { executable: gate.command, args: gate.args },
      timeoutMs: gate.timeoutMs,
      selection: { selected: true, reason: "configured for this mode and startup scope" },
      status: "error",
      enforced: gate.enforced !== false,
      reason: `process was not started because the runner was interrupted by ${interruptedBeforeSpawn}`,
      exitCode: null,
      signal: interruptedBeforeSpawn,
      startedAt,
      endedAt,
      durationMs: 0,
      log: path.relative(root, log).replaceAll("\\", "/"),
      toolVersion: "not invoked",
    };
  }
  const result = await runChild({
    command: gate.command,
    args: gate.args,
    cwd: root,
    timeoutMs: gate.timeoutMs,
    env: {
      ...process.env,
      ...gate.env,
      JQS_QUALITY_RUN_ID: runId,
      JQS_QUALITY_RUN_DIRECTORY: runDirectory,
      JQS_QUALITY_SCOPE_FILE: scopePath,
    },
  });
  const endedAt = new Date().toISOString();
  await writeFile(
    log,
    [
      `$ ${[gate.command, ...gate.args].join(" ")}`,
      `exit=${String(result.exitCode)} signal=${result.signal ?? "none"} timeout=${String(result.timedOut)}`,
      "",
      "[stdout]",
      result.stdout,
      "[stderr]",
      result.stderr,
    ].join("\n"),
  );

  let status = "pass";
  let reason;
  if (result.spawnError) {
    status = "error";
    reason = `could not start ${gate.command}: ${result.spawnError.message}. Run npm ci or install the external analyzer documented in docs/DEVELOPMENT.md`;
  } else if (result.timedOut) {
    status = "error";
    reason = `timed out after ${gate.timeoutMs} ms`;
  } else if (result.signal) {
    status = "error";
    reason = `process was killed by ${result.signal}`;
  } else if (result.exitCode !== 0) {
    status = "fail";
    reason = `command exited with ${String(result.exitCode)}`;
  } else {
    const evidence = await inspectEvidence(root, gate.evidence, { runId });
    if (!evidence.ok) {
      status = "error";
      reason = evidence.reason;
    } else if (evidence.status === "skip") {
      status = "skip";
      reason = evidence.reason;
    }
  }

  return {
    id: gate.id,
    kind: gate.kind ?? "analysis",
    command: { executable: gate.command, args: gate.args },
    timeoutMs: gate.timeoutMs,
    selection: { selected: true, reason: "configured for this mode and startup scope" },
    status,
    enforced: gate.enforced !== false,
    ...(reason ? { reason } : {}),
    exitCode: result.exitCode,
    signal: result.signal,
    startedAt,
    endedAt,
    durationMs: result.durationMs,
    log: path.relative(root, log).replaceAll("\\", "/"),
    toolVersion: interruption()
      ? "unavailable (runner interrupted)"
      : await toolVersion(gate, root, versionCache),
  };
}

#!/usr/bin/env node
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { promisify } from "node:util";
import { writeAtomicJson } from "./lib/files.mjs";
import { createSchemaValidator } from "./validate-json.mjs";
import {
  changedLines,
  changedPaths,
  fingerprint,
  gitDirectory,
  gitHead,
  repositoryRoot,
  resolveQualityBase,
} from "./lib/git-state.mjs";
import { runGate, terminateActiveChildren } from "./lib/process.mjs";

const execFileAsync = promisify(execFile);
const supportedModes = new Set(["fast", "delivery", "full-audit"]);
const runnerRepositoryRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

async function validateDocument(schemaPath, value, label) {
  const schema = JSON.parse(await readFile(path.join(runnerRepositoryRoot, schemaPath), "utf8"));
  const validate = createSchemaValidator(schema);
  if (!validate(value)) {
    throw new Error(`${label} violates ${schemaPath}: ${JSON.stringify(validate.errors)}`);
  }
}

function safeRunId(date = new Date()) {
  return `${date.toISOString().replaceAll(/[:.]/g, "-")}-${process.pid}`;
}

function globRegex(pattern) {
  let expression = "^";
  for (let index = 0; index < pattern.length; index += 1) {
    const character = pattern[index];
    const next = pattern[index + 1];
    if (character === "*" && next === "*") {
      expression += ".*";
      index += 1;
    } else if (character === "*") {
      expression += "[^/]*";
    } else if (character === "?") {
      expression += "[^/]";
    } else {
      expression += character.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    }
  }
  return new RegExp(`${expression}$`);
}

export function matchesChanged(patterns, paths) {
  const matchers = patterns.map(globRegex);
  return paths.some((changed) => matchers.some((matcher) => matcher.test(changed)));
}

function validateGates(mode, gates) {
  if (!Array.isArray(gates) || gates.length === 0) {
    throw new Error(`mode ${mode} has no configured gates`);
  }
  const ids = new Set();
  for (const gate of gates) {
    if (!gate.id || ids.has(gate.id))
      throw new Error(`mode ${mode} has a missing or duplicate gate id`);
    ids.add(gate.id);
    if (!gate.command || !Array.isArray(gate.args) || !Number.isFinite(gate.timeoutMs)) {
      throw new Error(`gate ${gate.id} has an invalid command or timeout`);
    }
  }
  if (mode !== "fast" && !gates.some((gate) => gate.enforced !== false && gate.kind === "test")) {
    throw new Error(`${mode} must contain at least one enforced test gate`);
  }
}

async function npmVersion(root) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  try {
    const { stdout } = await execFileAsync(npm, ["--version"], { cwd: root });
    return stdout.trim();
  } catch {
    return "unavailable";
  }
}

async function sha256File(file) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

function skippedGate(gate, reason) {
  const now = new Date().toISOString();
  return {
    id: gate.id,
    kind: gate.kind ?? "analysis",
    command: { executable: gate.command, args: gate.args },
    timeoutMs: gate.timeoutMs,
    selection: { selected: false, reason },
    status: "skip",
    enforced: gate.enforced !== false,
    reason,
    exitCode: null,
    signal: null,
    startedAt: now,
    endedAt: now,
    durationMs: 0,
    toolVersion: "not invoked",
  };
}

function interruptedGate(gate, signal) {
  const now = new Date().toISOString();
  return {
    id: gate.id,
    kind: gate.kind ?? "analysis",
    command: { executable: gate.command, args: gate.args },
    timeoutMs: gate.timeoutMs,
    selection: {
      selected: true,
      reason: `configured but not invoked because the quality runner received ${signal}`,
    },
    status: "error",
    enforced: gate.enforced !== false,
    reason: `quality runner was interrupted by ${signal} before invocation`,
    exitCode: null,
    signal,
    startedAt: now,
    endedAt: now,
    durationMs: 0,
    toolVersion: "not invoked",
  };
}

function materialize(value, replacements) {
  if (typeof value === "string") {
    return Object.entries(replacements).reduce(
      (result, [token, replacement]) => result.replaceAll(`{${token}}`, replacement),
      value,
    );
  }
  if (Array.isArray(value)) return value.map((entry) => materialize(entry, replacements));
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, materialize(entry, replacements)]),
    );
  }
  return value;
}

export async function runQuality({
  mode,
  config,
  cwd = process.cwd(),
  runId = safeRunId(),
  writeJson = writeAtomicJson,
  interrupted = () => null,
  baseRef = process.env.JQS_QUALITY_BASE_SHA,
  forceAll = process.env.JQS_QUALITY_FORCE_ALL === "1",
} = {}) {
  if (!supportedModes.has(mode)) {
    throw new Error(`mode must be one of: ${[...supportedModes].join(", ")}`);
  }
  if (!config || config.schema !== "jqstar-quality-config/1") {
    throw new Error("quality configuration is missing or has an unsupported schema");
  }
  const gates = config.modes?.[mode];
  validateGates(mode, gates);

  const root = await repositoryRoot(cwd);
  const base = await resolveQualityBase(root, baseRef);
  const gitDir = await gitDirectory(root);
  const runDirectory = path.join(gitDir, "jqstar", "runs", runId);
  const reportPath = path.join(runDirectory, "report.json");
  const latestReportPath = path.join(gitDir, "jqstar", "latest-report.json");
  const receiptPath = path.join(gitDir, "jqstar", "quality-receipt.json");
  const startedAt = new Date().toISOString();
  const startFingerprint = await fingerprint(root);
  const startupChangedPaths = await changedPaths(root, { base });
  const scopePath = path.join(runDirectory, "scope.json");
  const scope = {
    schema: "jqstar-quality-scope/1",
    runId,
    base,
    head: await gitHead(root),
    startFingerprint,
    changedPaths: startupChangedPaths,
    changedLines: await changedLines(root, startupChangedPaths, { base }),
  };
  await writeJson(scopePath, scope);

  const configuredGates = gates.map((gate) =>
    materialize(gate, {
      root,
      gitDirectory: gitDir,
      runDirectory,
      scopeFile: scopePath,
    }),
  );

  const oldScope = process.env.JQS_QUALITY_SCOPE_FILE;
  process.env.JQS_QUALITY_SCOPE_FILE = scopePath;
  const versionCache = new Map();
  const indexedResults = new Map();
  const stages = [...new Set(configuredGates.map((gate) => gate.stage ?? 0))].sort((a, b) => a - b);

  try {
    for (const stage of stages) {
      const stageInterruption = interrupted();
      if (stageInterruption) {
        for (const gate of configuredGates) {
          if (!indexedResults.has(gate.id)) {
            indexedResults.set(gate.id, interruptedGate(gate, stageInterruption));
          }
        }
        break;
      }
      const stageGates = configuredGates.filter((gate) => (gate.stage ?? 0) === stage);
      await Promise.all(
        stageGates.map(async (gate) => {
          if (
            !forceAll &&
            gate.when?.changed &&
            !matchesChanged(gate.when.changed, startupChangedPaths)
          ) {
            indexedResults.set(
              gate.id,
              skippedGate(gate, gate.when.reason ?? "changed paths did not select this gate"),
            );
            return;
          }
          try {
            const result = await runGate({
              gate,
              root,
              logDirectory: path.join(runDirectory, "logs"),
              runId,
              runDirectory,
              scopePath,
              versionCache,
              interruption: interrupted,
            });
            indexedResults.set(gate.id, result);
          } catch (error) {
            const now = new Date().toISOString();
            indexedResults.set(gate.id, {
              id: gate.id,
              kind: gate.kind ?? "analysis",
              command: { executable: gate.command, args: gate.args },
              timeoutMs: gate.timeoutMs,
              selection: { selected: true, reason: "configured for this mode and startup scope" },
              status: "error",
              enforced: gate.enforced !== false,
              reason: `gate evidence could not be recorded: ${error.message}`,
              exitCode: null,
              signal: null,
              startedAt: now,
              endedAt: now,
              durationMs: 0,
              toolVersion: "unavailable",
            });
          }
        }),
      );
    }
  } finally {
    if (oldScope === undefined) delete process.env.JQS_QUALITY_SCOPE_FILE;
    else process.env.JQS_QUALITY_SCOPE_FILE = oldScope;
  }

  const results = configuredGates.map((gate) => indexedResults.get(gate.id));
  const endFingerprint = await fingerprint(root);
  const drifted = startFingerprint.digest !== endFingerprint.digest;
  const interruption = interrupted();
  const enforcedResults = results.filter((result) => result.enforced);
  let status = enforcedResults.some((result) => result.status === "error") ? "error" : "pass";
  if (status === "pass" && enforcedResults.some((result) => result.status === "fail"))
    status = "fail";
  if (
    status === "pass" &&
    mode !== "fast" &&
    !enforcedResults.some((result) => result.kind === "test" && result.status === "pass")
  ) {
    status = "error";
  }
  if (interruption) status = "error";
  if (status === "pass" && drifted) status = "fail";
  const receiptEligible = mode !== "fast" && status === "pass" && !drifted;

  const report = {
    schema: "jqstar-quality-report/1",
    runId,
    mode,
    status,
    startedAt,
    endedAt: new Date().toISOString(),
    startFingerprint,
    endFingerprint,
    base,
    head: scope.head,
    scopePath: path.relative(root, scopePath).replaceAll("\\", "/"),
    changedPaths: startupChangedPaths,
    interruption,
    gates: results,
    environment: {
      node: process.version,
      npm: await npmVersion(root),
      platform: os.platform(),
      arch: os.arch(),
      release: os.release(),
    },
    receipt: receiptEligible
      ? { eligible: true, path: path.relative(root, receiptPath).replaceAll("\\", "/") }
      : {
          eligible: false,
          reason:
            mode === "fast"
              ? "fast mode never authorizes delivery"
              : interruption
                ? `run interrupted by ${interruption}`
                : drifted
                  ? "gated files changed during the run"
                  : "an enforced gate did not pass",
        },
  };

  try {
    await validateDocument("schema/quality-report.schema.json", report, "quality report");
    await writeJson(reportPath, report);
    await writeJson(latestReportPath, report);
  } catch (error) {
    await rm(receiptPath, { force: true }).catch(() => undefined);
    throw new Error(`quality result could not be recorded: ${error.message}`, { cause: error });
  }

  if (receiptEligible) {
    const receipt = {
      schema: "jqstar-quality-receipt/1",
      runId,
      mode,
      fingerprint: startFingerprint,
      head: scope.head,
      reportPath,
      reportSha256: await sha256File(reportPath),
      createdAt: new Date().toISOString(),
    };
    try {
      await validateDocument("schema/quality-receipt.schema.json", receipt, "delivery receipt");
      await writeJson(receiptPath, receipt);
    } catch (error) {
      await rm(receiptPath, { force: true }).catch(() => undefined);
      throw new Error(`delivery receipt could not be recorded: ${error.message}`, { cause: error });
    }
  } else {
    await rm(receiptPath, { force: true }).catch(() => undefined);
  }

  return { report, reportPath, receiptPath, scopePath };
}

async function loadConfig(configPath) {
  const absolute = path.resolve(configPath ?? "quality/gates.mjs");
  const imported = await import(`${pathToFileURL(absolute).href}?run=${Date.now()}`);
  return imported.qualityConfig ?? imported.default;
}

function parseArguments(argv) {
  const [mode, ...rest] = argv;
  let configPath;
  for (let index = 0; index < rest.length; index += 1) {
    if (rest[index] === "--config") {
      configPath = rest[index + 1];
      index += 1;
      continue;
    }
    throw new Error(`unknown argument: ${rest[index]}`);
  }
  return { mode, configPath };
}

async function main() {
  const { mode, configPath } = parseArguments(process.argv.slice(2));
  const config = await loadConfig(configPath);
  const { report, reportPath } = await runQuality({
    mode,
    config,
    interrupted: () => receivedSignal,
  });
  for (const gate of report.gates) {
    process.stdout.write(
      `${gate.status.toUpperCase().padEnd(5)} ${gate.id}${gate.reason ? `: ${gate.reason}` : ""}\n`,
    );
  }
  process.stdout.write(`${report.status.toUpperCase()} ${report.mode} report: ${reportPath}\n`);
  process.exitCode = report.status === "pass" ? 0 : 1;
}

const isEntry =
  process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
let receivedSignal = null;
if (isEntry) {
  const onSignal = (signal) => {
    receivedSignal = signal;
    terminateActiveChildren(signal);
    process.exitCode = 1;
  };
  process.once("SIGINT", () => onSignal("SIGINT"));
  process.once("SIGTERM", () => onSignal("SIGTERM"));
  main().catch((error) => {
    process.stderr.write(`quality gate error: ${error.message}\n`);
    process.exitCode = 1;
  });
}

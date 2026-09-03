import { randomInt } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

import { qualityEvidencePath, qualityRunId, repoPath, run, writeJsonAtomic } from "./lib.mjs";

const audit = process.argv.includes("--audit");
const mode = audit ? "random-audit" : "delivery-replay";
const report = qualityEvidencePath(audit ? "property-audit-gate.json" : "property-gate.json");
const runId = qualityRunId();
const startedAt = new Date().toISOString();

function integerArgument(name, fallback) {
  const index = process.argv.indexOf(name);
  const source = index === -1 ? fallback : process.argv[index + 1];
  const value = Number(source);
  if (!Number.isSafeInteger(value)) throw new Error(`${name} must be a safe integer.`);
  return value;
}

function stringArgument(name) {
  const index = process.argv.indexOf(name);
  if (index === -1) return undefined;
  const value = process.argv[index + 1];
  if (!value) throw new Error(`${name} requires a value.`);
  return value;
}

export function validatePropertyUsage(usages, { replayName, replayPath } = {}) {
  const failures = [];
  const seen = new Set();
  for (const usage of usages) {
    if (typeof usage.id !== "string" || usage.id.length === 0) {
      failures.push("Property usage record has no id.");
      continue;
    }
    if (seen.has(usage.id)) failures.push(`Property ${usage.id} executed more than once.`);
    seen.add(usage.id);
    if (!Number.isSafeInteger(usage.configuredRuns) || usage.configuredRuns < 1) {
      failures.push(`Property ${usage.id} has invalid configuredRuns.`);
    }
    if (!Number.isSafeInteger(usage.effectiveRuns) || usage.effectiveRuns < 0) {
      failures.push(`Property ${usage.id} has invalid effectiveRuns.`);
    }
    if (usage.status !== "pass") failures.push(`Property ${usage.id} did not pass.`);
  }
  if (usages.length === 0) failures.push("Property run produced no per-property usage records.");

  const consumers = usages.filter((usage) => usage.pathConsumed);
  if (replayName && replayPath) {
    const requested = usages.filter((usage) => usage.id === replayName);
    if (requested.length !== 1) {
      failures.push(`Replay requested unknown or duplicate property id ${replayName}.`);
    }
    if (consumers.length !== 1) {
      failures.push(`Replay path must be consumed exactly once; observed ${consumers.length}.`);
    } else if (consumers[0].id !== replayName || consumers[0].replayPath !== replayPath) {
      failures.push(`Replay path was consumed by ${consumers[0].id}, not ${replayName}.`);
    }
  } else if (consumers.length > 0) {
    failures.push("A property consumed a replay path when no replay was requested.");
  }
  return {
    status: failures.length === 0 ? "pass" : "fail",
    effectiveRuns: usages.reduce((total, usage) => total + (usage.effectiveRuns ?? 0), 0),
    consumedBy: consumers.map((usage) => usage.id),
    failures,
  };
}

async function readPropertyUsages(directory) {
  const files = (await readdir(directory)).filter((file) => file.endsWith(".json")).sort();
  return Promise.all(
    files.map(async (file) => JSON.parse(await readFile(join(directory, file), "utf8"))),
  );
}

async function main() {
  if (audit && !process.argv.includes("--acknowledge-random-audit")) {
    throw new Error("Random property audit requires --acknowledge-random-audit.");
  }
  const seed = audit
    ? randomAuditSeed()
    : integerArgument("--seed", process.env.JQS_PROPERTY_SEED ?? 430_043);
  const runs = integerArgument("--runs", process.env.JQS_PROPERTY_RUNS ?? 100);
  if (runs < 1) throw new Error("--runs must be positive.");
  const replayName = stringArgument("--property") ?? process.env.JQS_PROPERTY_NAME;
  const replayPath = stringArgument("--path") ?? process.env.JQS_PROPERTY_PATH;
  if (Boolean(replayName) !== Boolean(replayPath)) {
    throw new Error("Property replay requires both --property and --path.");
  }
  const usageDirectory = await mkdtemp(join(tmpdir(), "jqstar-property-usage-"));
  try {
    const result = await run(
      repoPath("node_modules/.bin/vitest"),
      ["run", "--config", "vitest.property.config.ts"],
      {
        capture: true,
        env: {
          JQS_PROPERTY_SEED: String(seed),
          JQS_PROPERTY_RUNS: String(runs),
          JQS_PROPERTY_USAGE_DIRECTORY: usageDirectory,
          ...(replayName ? { JQS_PROPERTY_NAME: replayName } : {}),
          ...(replayPath ? { JQS_PROPERTY_PATH: replayPath } : {}),
        },
      },
    );
    const usages = await readPropertyUsages(usageDirectory);
    const validation = validatePropertyUsage(usages, { replayName, replayPath });
    const output = `${result.stdout}\n${result.stderr}`;
    const counterexample = /Counterexample:\s*(.+)/u.exec(output)?.[1];
    const failurePath = /path:\s*"([^"]+)"/u.exec(output)?.[1];
    const failures = [
      ...(result.code === 0 ? [] : [`Property test process exited ${result.code}.`]),
      ...validation.failures,
    ];
    const status = failures.length === 0 ? "pass" : "fail";
    await writeJsonAtomic(report, {
      schema: "jqstar-property-report/1",
      runId,
      status,
      mode,
      startedAt,
      finishedAt: new Date().toISOString(),
      seed,
      runs,
      configuredRuns: runs,
      effectiveRuns: validation.effectiveRuns,
      properties: usages,
      replay: replayName
        ? { property: replayName, path: replayPath, consumedBy: validation.consumedBy }
        : null,
      discoveredFailure:
        counterexample || failurePath ? { counterexample, path: failurePath } : null,
      exitCode: result.code,
      signal: result.signal,
      failures,
    });
    console.log(`Property gate ${status}. Seed ${seed}. Report: ${report}`);
    if (status !== "pass") process.exitCode = 1;
  } finally {
    await rm(usageDirectory, { force: true, recursive: true });
  }
}

async function handleError(error) {
  console.error(error.message);
  try {
    await writeJsonAtomic(report, {
      schema: "jqstar-property-report/1",
      runId,
      mode,
      status: "error",
      startedAt,
      finishedAt: new Date().toISOString(),
      seed: 0,
      runs: 1,
      configuredRuns: 1,
      effectiveRuns: 0,
      properties: [],
      replay: null,
      discoveredFailure: null,
      exitCode: -1,
      signal: null,
      failures: [error.message],
    });
  } catch (writeError) {
    console.error(`Property result write failed: ${writeError.message}`);
  }
  process.exitCode = 1;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(handleError);
}

export function randomAuditSeed() {
  return randomInt(-2_147_483_648, 2_147_483_647);
}

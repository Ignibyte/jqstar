import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import fc from "fast-check";
import type { IAsyncProperty, IProperty, Parameters, RunDetails } from "fast-check";

const DEFAULT_SEED = 430_043;
const DEFAULT_RUNS = 100;

function propertyParameters<Ts>(name: string, overrides: Parameters<Ts>): Parameters<Ts> {
  const seed = Number(process.env.JQS_PROPERTY_SEED ?? DEFAULT_SEED);
  const numRuns = Number(process.env.JQS_PROPERTY_RUNS ?? DEFAULT_RUNS);
  if (!Number.isSafeInteger(seed)) throw new Error("JQS_PROPERTY_SEED must be a safe integer.");
  if (!Number.isSafeInteger(numRuns) || numRuns < 1) {
    throw new Error("JQS_PROPERTY_RUNS must be a positive safe integer.");
  }
  const replayName = process.env.JQS_PROPERTY_NAME;
  const replayPath = process.env.JQS_PROPERTY_PATH;
  if (Boolean(replayName) !== Boolean(replayPath)) {
    throw new Error("Property replay requires both JQS_PROPERTY_NAME and JQS_PROPERTY_PATH.");
  }
  return {
    seed,
    numRuns,
    verbose: 2,
    ...overrides,
    ...(replayPath && replayName === name ? { path: replayPath } : {}),
  };
}

function recordUsage<Ts>(name: string, details: RunDetails<Ts>) {
  const directory = process.env.JQS_PROPERTY_USAGE_DIRECTORY;
  if (!directory) return;
  const replayName = process.env.JQS_PROPERTY_NAME;
  const replayPath = process.env.JQS_PROPERTY_PATH;
  const configuredPath = details.runConfiguration.path;
  const pathConsumed = Boolean(replayPath && replayName === name && configuredPath === replayPath);
  mkdirSync(directory, { recursive: true });
  writeFileSync(
    join(directory, `${encodeURIComponent(name)}.json`),
    `${JSON.stringify({
      id: name,
      seed: details.seed,
      configuredRuns: details.runConfiguration.numRuns,
      effectiveRuns: details.numRuns,
      skips: details.numSkips,
      shrinks: details.numShrinks,
      status: details.failed ? "fail" : "pass",
      replayPath: configuredPath ?? null,
      pathConsumed,
    })}\n`,
    { encoding: "utf8", flag: "wx" },
  );
}

export function assertProperty<Ts>(
  name: string,
  property: IProperty<Ts>,
  overrides: Parameters<Ts> = {},
) {
  const details = fc.check(property, propertyParameters(name, overrides));
  recordUsage(name, details);
  if (details.failed) throw new Error(fc.defaultReportMessage(details));
}

export async function assertAsyncProperty<Ts>(
  name: string,
  property: IAsyncProperty<Ts>,
  overrides: Parameters<Ts> = {},
) {
  const details = await fc.check(property, propertyParameters(name, overrides));
  recordUsage(name, details);
  if (details.failed) throw new Error(await fc.asyncDefaultReportMessage(details));
}

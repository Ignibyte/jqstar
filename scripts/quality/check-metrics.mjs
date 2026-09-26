import { pathToFileURL } from "node:url";
import { execFileSync } from "node:child_process";
import { existedAtRevision, loadQualityScope, repoPath } from "./lib.mjs";
import { readJSON } from "./static-lib.mjs";

export function effectiveMaximum(committed, override) {
  if (override === undefined || override === "") return committed;
  const parsed = Number(override);
  if (!Number.isFinite(parsed) || parsed < 0)
    throw new Error(`Invalid quality maximum: ${override}`);
  return Math.min(committed, parsed);
}

export function validateMetrics(metrics, jscpd) {
  const errors = [];
  if (metrics.schemaVersion !== "jqstar-static-metrics/1")
    errors.push("Unsupported metrics schema.");
  for (const [name, value] of metricValues(metrics)) {
    if (!Number.isFinite(value) || value < 0)
      errors.push(`${name} must be a finite non-negative number.`);
  }
  if (jscpd.threshold !== metrics.duplication.maximumPercent) {
    errors.push("jscpd threshold does not match quality/metrics.json.");
  }
  if (jscpd.minLines !== metrics.duplication.minimumLines) {
    errors.push("jscpd minimum lines do not match quality/metrics.json.");
  }
  if (jscpd.minTokens !== metrics.duplication.minimumTokens) {
    errors.push("jscpd minimum tokens do not match quality/metrics.json.");
  }
  return errors;
}

function metricValues(metrics) {
  return new Map([
    ["sonarjs.cognitiveComplexityMaximum", metrics?.sonarjs?.cognitiveComplexityMaximum],
    ["duplication.maximumPercent", metrics?.duplication?.maximumPercent],
    ["duplication.minimumLines", metrics?.duplication?.minimumLines],
    ["duplication.minimumTokens", metrics?.duplication?.minimumTokens],
  ]);
}

function detectorSettings(config) {
  return JSON.stringify(
    Object.fromEntries(
      Object.entries(config)
        .filter(([key]) => !["threshold", "minLines", "minTokens"].includes(key))
        .sort(([a], [b]) => a.localeCompare(b)),
    ),
  );
}

export function evaluateMetricRatchet(current, baseline, detector, baselineDetector) {
  if (!baseline) return [];
  const failures = [];
  const values = metricValues(current);
  for (const [name, maximum] of metricValues(baseline)) {
    const value = values.get(name);
    if (!Number.isFinite(value) || value > maximum)
      failures.push(`${name} ${String(value)} weakens immutable-base maximum ${maximum}.`);
  }
  if (!baselineDetector || detectorSettings(detector) !== detectorSettings(baselineDetector))
    failures.push("Duplication detector scope/settings differ from the immutable delivery base.");
  return failures;
}

function atRevision(path, revision) {
  if (!revision || !existedAtRevision(path, revision)) return null;
  return JSON.parse(
    execFileSync("git", ["show", `${revision}:${path}`], { cwd: repoPath("."), encoding: "utf8" }),
  );
}

async function main() {
  const metrics = await readJSON("quality/metrics.json");
  const detector = await readJSON(".jscpd.json");
  const errors = validateMetrics(metrics, detector);
  const scope = await loadQualityScope();
  const revision = scope.base ?? scope.head ?? null;
  errors.push(
    ...evaluateMetricRatchet(
      metrics,
      atRevision("quality/metrics.json", revision),
      detector,
      atRevision(".jscpd.json", revision),
    ),
  );
  effectiveMaximum(
    metrics.sonarjs.cognitiveComplexityMaximum,
    process.env.JQS_MAX_COGNITIVE_COMPLEXITY,
  );
  effectiveMaximum(metrics.duplication.maximumPercent, process.env.JQS_MAX_DUPLICATION_PERCENT);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(
    `static metric ratchets: configuration agrees with maxima at ${revision ?? "first standalone baseline"}\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

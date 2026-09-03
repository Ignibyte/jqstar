import { pathToFileURL } from "node:url";
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

async function main() {
  const metrics = await readJSON("quality/metrics.json");
  const errors = validateMetrics(metrics, await readJSON(".jscpd.json"));
  effectiveMaximum(
    metrics.sonarjs.cognitiveComplexityMaximum,
    process.env.JQS_MAX_COGNITIVE_COMPLEXITY,
  );
  effectiveMaximum(metrics.duplication.maximumPercent, process.env.JQS_MAX_DUPLICATION_PERCENT);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write("static metric ratchets: configuration agrees with committed maxima\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

import { createHash } from "node:crypto";
import { readFile, writeFile } from "node:fs/promises";

const args = process.argv.slice(2);
const path = args[args.indexOf("--report") + 1];
if (!args.includes("--report") || !path) throw new Error("A --report JSON path is required.");
const bytes = await readFile(path);
const report = JSON.parse(bytes);
function specs(suites) {
  return suites.flatMap((suite) => [...(suite.specs ?? []), ...specs(suite.suites ?? [])]);
}
const observations = [];
for (const spec of specs(report.suites)) {
  for (const test of spec.tests) {
    if (test.status !== "expected" || test.results.length !== 1)
      throw new Error(`Failed, skipped or retried test: ${spec.title}`);
    const result = test.results[0];
    const attachment = (name) => {
      const item = result.attachments.find((entry) => entry.name === name);
      return item ? JSON.parse(Buffer.from(item.body, "base64").toString("utf8")) : null;
    };
    const observation = attachment("resource-strategy-observation");
    if (!observation || result.status !== "passed" || observation.status !== "passed")
      throw new Error(`Missing successful observation: ${spec.title}`);
    observations.push({ ...observation, disposal: attachment("resource-strategy-disposal") });
  }
}
if (
  observations.length !== 87 ||
  report.stats.unexpected ||
  report.stats.skipped ||
  report.stats.flaky
)
  throw new Error("The complete 87-execution resource matrix must pass without retries or skips.");
const proof = {
  reportPath: path,
  sha256: createHash("sha256").update(bytes).digest("hex"),
  startedAt: report.stats.startTime,
  durationMs: report.stats.duration,
  executions: observations.length,
  observations,
};
if (args.includes("--record")) {
  const evidencePath = "quality/resource-strategy.json";
  const evidence = JSON.parse(await readFile(evidencePath, "utf8"));
  evidence.browserProof = proof;
  await writeFile(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
}
console.log(
  JSON.stringify({ ...proof, observations: `${observations.length} redacted observations` }),
);

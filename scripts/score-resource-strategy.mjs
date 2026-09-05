import { readFile, writeFile } from "node:fs/promises";
import {
  resourceSensitivity,
  scoreResourceStrategies,
} from "./quality/resource-strategy-score.mjs";

const path = "quality/resource-strategy.json";
const evidence = JSON.parse(await readFile(path, "utf8"));
if (!evidence.inspection) throw new Error("Record the separate inspection inputs before scoring.");
const nativeApproved = Object.values(evidence.inspection.nativeApproval).every(
  (finding) => finding.pass,
);
const scores = scoreResourceStrategies(evidence.measurements[0], evidence.inspection);
const sensitivity = resourceSensitivity(scores, nativeApproved);
if (process.argv.includes("--record")) {
  evidence.scores = scores;
  evidence.sensitivity = sensitivity;
  await writeFile(path, `${JSON.stringify(evidence, null, 2)}\n`);
}
console.log(JSON.stringify({ scores, sensitivity }, null, 2));

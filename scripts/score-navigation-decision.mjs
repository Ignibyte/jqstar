import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import { readNavigationMeasurement } from "./quality/navigation-evidence.mjs";
import {
  assertCompleteNavigationMatrix,
  navigationWeightSensitivity,
  scoreNavigationRatings,
} from "./quality/navigation-decision-score.mjs";

export function summarizeNavigationDecision(evidence, measurements) {
  if (evidence.status !== "decided" || !evidence.decision)
    throw new Error("Navigation decision has not been recorded.");
  const measurement = measurements.findLast(
    (run) => run.status === "pass" && run.fixtureSha256 === evidence.fixtureIdentity.sha256,
  );
  assertCompleteNavigationMatrix(evidence, measurement);
  const { scores } = evidence.decision;
  if (new Set(scores.map((score) => score.candidate)).size !== scores.length)
    throw new Error("Duplicate navigation score.");
  for (const score of scores) {
    if (
      score.eligible ? score.total !== scoreNavigationRatings(score.ratings) : score.total !== null
    )
      throw new Error("Navigation score differs from the frozen calculation.");
  }
  const exclusions = {
    forms: ["get-form", "validation", "write", "preview", "server-validation", "write-loss"],
    regions: ["region", "region-mismatch"],
    prefetch: ["prefetch"],
  };
  const slices = Object.fromEntries(
    Object.entries(exclusions).map(([name, keys]) => {
      const ids = evidence.contract.scenarios
        .filter((scenario) => keys.includes(scenario.key))
        .map((scenario) => scenario.id);
      if (ids.length !== keys.length) throw new Error("Unknown navigation slice scenario.");
      const flows = measurement.candidates
        .filter((row) => row.configuration === "configured")
        .flatMap((row) => row.flows)
        .filter((flow) => !ids.includes(flow.id) && flow.status !== "not-applicable");
      return [
        name,
        {
          excluded: ids,
          retainedApplicableFlows: flows.length,
          failures: flows.filter((flow) => flow.status !== "pass").length,
        },
      ];
    }),
  );
  return {
    runId: measurement.runId,
    rows: measurement.candidates.length,
    flows: measurement.candidates.reduce((count, row) => count + row.flows.length, 0),
    configuredFailures: measurement.candidates
      .filter((row) => row.configuration === "configured")
      .flatMap((row) => row.flows)
      .filter((flow) => flow.status === "fail").length,
    defaultFailures: measurement.candidates
      .filter((row) => row.configuration === "default")
      .flatMap((row) => row.flows)
      .filter((flow) => flow.status === "fail").length,
    scores: Object.fromEntries(scores.map((score) => [score.candidate, score.total])),
    weightSweep: navigationWeightSensitivity(scores),
    zeroBenefit: Object.fromEntries(
      scores
        .filter((score) => score.eligible)
        .map((score) => [
          score.candidate,
          scoreNavigationRatings({ ...score.ratings, demonstratedBenefit: 0 }),
        ]),
    ),
    slices,
  };
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  const evidence = JSON.parse(await readFile("quality/navigation-decision.json", "utf8"));
  const schema = JSON.parse(await readFile("schema/navigation-decision.schema.json", "utf8"));
  const measurements = await Promise.all(
    evidence.measurements.map((reference) => readNavigationMeasurement(reference, schema)),
  );
  console.log(JSON.stringify(summarizeNavigationDecision(evidence, measurements), null, 2));
}

// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";
import { summarizeNavigationDecision } from "../scripts/score-navigation-decision.mjs";
import {
  readNavigationMeasurement,
  validateNavigationMeasurement,
} from "../scripts/quality/navigation-evidence.mjs";
import {
  assertCompleteNavigationMatrix,
  navigationWeights,
  navigationWeightSensitivity,
  scoreNavigationRatings,
} from "../scripts/quality/navigation-decision-score.mjs";

const readJSON = async (path) => JSON.parse(await readFile(path, "utf8"));
const evidence = await readJSON("quality/navigation-decision.json");
const schema = await readJSON("schema/navigation-decision.schema.json");
const measurements = await Promise.all(
  evidence.measurements.map((reference) => readNavigationMeasurement(reference, schema)),
);
const validate = createSchemaValidator(schema);
const digest = (value) => createHash("sha256").update(value).digest("hex");
const sorted = (value) =>
  Array.isArray(value)
    ? value.map(sorted)
    : value && typeof value === "object"
      ? Object.fromEntries(
          Object.keys(value)
            .sort()
            .map((key) => [key, sorted(value[key])]),
        )
      : value;

describe("navigation comparison contract", () => {
  it("closes the decision only with complete matching evidence and reproducible sensitivity", () => {
    const result = summarizeNavigationDecision(evidence, measurements);
    expect(result).toMatchObject({
      rows: 30,
      flows: 840,
      configuredFailures: 0,
      defaultFailures: 72,
    });
    expect(result.weightSweep).toEqual(
      JSON.parse(
        evidence.decision.sensitivity.find((item) => item.name === "weights-plus-minus-25-percent")
          .result,
      ),
    );
    for (const slice of Object.values(result.slices)) {
      expect(slice.retainedApplicableFlows).toBeGreaterThan(0);
      expect(slice.failures).toBe(0);
    }
    expect(evidence.decision.outcome).toBe("browser-and-bridges");
    expect(evidence.decision.utilityTickets).toEqual([]);
    expect(evidence.decision.children.map((child) => child.id).sort()).toEqual([
      "0024",
      "0025",
      "0026",
      "0027",
      "0028",
      "0029",
    ]);
    expect(
      evidence.decision.children.every(
        (child) => child.status === "declined" && child.contract.length > 80,
      ),
    ).toBe(true);
    const badScores = structuredClone(evidence);
    badScores.decision.scores[0].total += 1;
    expect(() => summarizeNavigationDecision(badScores, measurements)).toThrow(
      "frozen calculation",
    );
    const noComplete = measurements.filter((run) => run.runId !== result.runId);
    expect(() => summarizeNavigationDecision(evidence, noComplete)).toThrow("passing matching");
  });

  it("ties exact package costs and every gap trace to retained raw evidence", async () => {
    const costText = await readFile("quality/evidence/navigation-costs.json", "utf8");
    const costs = JSON.parse(costText);
    const validateCosts = createSchemaValidator({
      $schema: schema.$schema,
      $defs: schema.$defs,
      $ref: "#/$defs/costMeasurement",
    });
    expect(validateCosts(costs), JSON.stringify(validateCosts.errors)).toBe(true);
    const result = summarizeNavigationDecision(evidence, measurements);
    const measured = measurements.find((run) => run.runId === result.runId);
    expect(costs.fixtureSha256).toBe(measured.fixtureSha256);
    expect(costs.artifactSha256).toBe(measured.artifact.sha256);
    expect(evidence.costs).toHaveLength(10);
    for (const cost of evidence.costs) {
      expect(cost.maintenanceHours.high).toBeGreaterThanOrEqual(cost.maintenanceHours.low);
      if (cost.measurementKind === "unbuilt-estimate") {
        expect([
          cost.rawBytes,
          cost.gzipBytes,
          cost.packedBytes,
          cost.unpackedBytes,
          cost.browserExecutions,
        ]).toEqual([null, null, null, null, null]);
        continue;
      }
      expect(cost.source).toContain(digest(costText));
      if (cost.id === "browser-nojs")
        expect([cost.rawBytes, cost.gzipBytes, cost.packedBytes]).toEqual([0, 0, 0]);
      else {
        expect(cost.rawBytes).toBe(costs.bundles[cost.id].rawBytes);
        expect(cost.gzipBytes).toBe(costs.bundles[cost.id].gzipBytes);
        expect(cost.modules).toEqual(costs.bundles[cost.id].modules);
      }
    }
    const traces = new Set(
      measurements.flatMap((run) =>
        run.candidates.flatMap((row) =>
          row.flows.map(
            (flow) =>
              `${run.runId}/${row.browser}/${row.candidate}/${row.configuration}/${flow.id}`,
          ),
        ),
      ),
    );
    expect(new Set(evidence.gaps.map((gap) => gap.id)).size).toBe(evidence.gaps.length);
    for (const gap of evidence.gaps) {
      expect(gap.traces.length).toBeGreaterThan(0);
      expect(gap.traces.every((trace) => traces.has(trace))).toBe(true);
      expect(gap.attempts.map((attempt) => attempt.rung)).toEqual([
        "documented-host-configuration",
        "current-jqstar-bridge",
        "host-specific-correction",
        "bounded-host-neutral-utility",
        "native-concept",
      ]);
    }
  });

  it("preserves the UTF-8 frozen contract, exact candidates, weights and every scenario", () => {
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    expect(digest(JSON.stringify(sorted(evidence.contract)))).toBe(evidence.contractSha256);
    expect(evidence.contract.weights).toEqual(navigationWeights);
    expect(evidence.contract.scenarios.map((scenario) => scenario.id)).toEqual(
      Array.from({ length: 28 }, (_, index) => `NAV-${String(index + 1).padStart(2, "0")}`),
    );
    expect(evidence.contract.candidates.map((candidate) => candidate.id)).toEqual([
      "browser-nojs",
      "browser",
      "turbo-8.0.21",
      "turbo-8.0.23",
      "htmx-2.0.0",
      "htmx-2.0.10",
    ]);
    expect(evidence.contract.browsers).toEqual(["chromium", "firefox", "webkit"]);
  });

  it("refuses unreviewed fields and incomplete measurements as completion evidence", () => {
    expect(validate({ ...evidence, secret: "unreviewed" })).toBe(false);
    expect(() => assertCompleteNavigationMatrix(evidence, undefined)).toThrow("passing matching");
    for (const measurement of measurements.filter((run) => run.status !== "pass"))
      expect(() => assertCompleteNavigationMatrix(evidence, measurement)).toThrow(
        "passing matching",
      );
  });

  it("rejects secret fields, false passes and premature terminal decisions", () => {
    const premature = structuredClone(evidence);
    premature.status = "decided";
    premature.decision = null;
    expect(validate(premature)).toBe(false);
    const first = measurements[0]?.candidates[0]?.flows[0];
    expect(first).toBeDefined();
    const secret = structuredClone(measurements[0]);
    secret.candidates[0].flows[0].requests[0].headers = { authorization: "canary" };
    expect(validateNavigationMeasurement(secret, schema).valid).toBe(false);
    const falsePass = structuredClone(measurements[0]);
    falsePass.candidates[0].flows[0].status = "pass";
    falsePass.candidates[0].flows[0].assertions[0].passed = false;
    expect(validateNavigationMeasurement(falsePass, schema).valid).toBe(false);
  });

  it("verifies archive bytes, decoded contents and summaries before trusting a reference", async () => {
    const reference = evidence.measurements[0];
    expect(await readNavigationMeasurement(reference, schema)).toEqual(measurements[0]);
    await expect(
      readNavigationMeasurement(
        { ...reference, raw: { ...reference.raw, sha256: "0".repeat(64) } },
        schema,
      ),
    ).rejects.toThrow("digest");
    await expect(
      readNavigationMeasurement({ ...reference, flowCount: reference.flowCount + 1 }, schema),
    ).rejects.toThrow("summary");
    await expect(
      readNavigationMeasurement(
        { ...reference, raw: { ...reference.raw, path: "../outside.json.gz" } },
        schema,
      ),
    ).rejects.toThrow("outside");
  });

  it("pins host aliases and excludes navigation research from the published public surface", async () => {
    const manifest = await readJSON("package.json");
    const lock = await readJSON("package-lock.json");
    expect(manifest.files).toContain("!schema/navigation-decision.schema.json");
    expect(Object.keys(manifest.exports).some((key) => key.includes("navigation"))).toBe(false);
    expect(manifest.files.some((path) => path.startsWith("test/"))).toBe(false);
    for (const candidate of evidence.contract.candidates.filter(
      (item) => item.host !== "browser",
    )) {
      const alias = candidate.id.replaceAll(".", "-");
      expect(lock.packages[`node_modules/${alias}`].version).toBe(candidate.version);
      expect(lock.packages[`node_modules/${alias}`].integrity).toMatch(/^sha512-/);
      expect(manifest.dependencies?.[alias]).toBeUndefined();
    }
  });

  it("keeps ineligible candidates out of every renormalized sensitivity result", () => {
    const ratings = (value) =>
      Object.fromEntries(Object.keys(navigationWeights).map((key) => [key, value]));
    expect(scoreNavigationRatings(ratings(3))).toBe(60);
    expect(scoreNavigationRatings(ratings(5))).toBe(100);
    expect(() => scoreNavigationRatings({})).toThrow("every frozen rating");
    const sensitivity = navigationWeightSensitivity([
      { candidate: "measured", eligible: true, ratings: ratings(3) },
      { candidate: "unbuilt", eligible: false, ratings: ratings(5) },
    ]);
    expect(sensitivity).toEqual({
      trials: 2187,
      strictWins: { measured: 2187, unbuilt: 0 },
      ties: 0,
    });
  });
});

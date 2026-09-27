// @vitest-environment node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import Ajv from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";
import {
  resourceSensitivity,
  resourceWeights,
  scoreResourceStrategies,
} from "../scripts/quality/resource-strategy-score.mjs";

const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));
const evidence = await readJson("quality/resource-strategy.json");
const schema = await readJson("schema/resource-strategy.schema.json");
const ajv = new Ajv({ allErrors: true, strict: true });
addFormats(ajv);
const validate = ajv.compile(schema);
const digest = (source) => createHash("sha256").update(source).digest("hex");

describe("resource strategy evidence contract", () => {
  it("validates the closed evidence schema and frozen premeasurement contract", async () => {
    expect(validate(evidence), JSON.stringify(validate.errors)).toBe(true);
    const source = await readFile(evidence.contract.document, "utf8");
    const contract = source.slice(
      source.indexOf("## Frozen comparison contract"),
      source.indexOf("## Results and decision"),
    );
    expect(digest(contract)).toBe(evidence.contract.sha256);
    expect(evidence.contract.scenarios).toEqual(
      Array.from({ length: 15 }, (_, index) => `S${String(index + 1).padStart(2, "0")}`),
    );
  });

  it("rejects missing provenance, unknown fields and incomplete terminal decisions", () => {
    const unknown = structuredClone(evidence);
    unknown.unreviewed = true;
    expect(validate(unknown)).toBe(false);
    const missing = structuredClone(evidence);
    delete missing.external.integrity;
    expect(validate(missing)).toBe(false);
    const incomplete = structuredClone(evidence);
    incomplete.phase = "decided";
    incomplete.decision = "server-patches";
    incomplete.scores = null;
    expect(validate(incomplete)).toBe(false);
    const contradiction = structuredClone(evidence);
    contradiction.decision = "native-client";
    expect(validate(contradiction)).toBe(false);
    const activated = structuredClone(evidence);
    activated.downstream["0021"].status = "planned";
    expect(validate(activated)).toBe(false);
    const failedBrowser = structuredClone(evidence);
    failedBrowser.browserProof.observations[0].status = "failed";
    expect(validate(failedBrowser)).toBe(false);
  });

  it("retains the complete common browser matrix and enforces the terminal decision", async () => {
    const rows = evidence.browserProof.observations;
    for (const strategy of ["server", "external", "native"]) {
      for (const browser of ["desktop-chromium", "desktop-firefox", "desktop-webkit"]) {
        const cases = rows.filter((row) => row.strategy === strategy && row.browser === browser);
        expect(cases).toHaveLength(8);
        expect(new Set(cases.map((row) => row.scenario)).size).toBe(8);
        const terminal = cases.find((row) => row.scenario.startsWith("S13"));
        expect(terminal.disposal.failed).toEqual([]);
        expect(terminal.disposal.remaining).toEqual([]);
        expect(terminal.client).toMatchObject({
          records: 0,
          observers: 0,
          tasks: 0,
          pending: 0,
          browserTimers: 0,
        });
      }
      for (const browser of [
        "mobile-touch",
        "reduced-motion",
        "forced-colors",
        "zoom-reflow",
        "javascript-disabled",
      ]) {
        expect(
          rows.filter((row) => row.strategy === strategy && row.browser === browser),
        ).toHaveLength(1);
      }
    }
    expect(evidence.phase).toBe("decided");
    expect(evidence.decision).toBe("server-patches");
    expect(evidence.scores.server.hardGatesPass).toBe(true);
    const bestEligible = Math.max(evidence.scores.server.total, evidence.scores.external.total);
    expect(bestEligible - evidence.scores.server.total).toBeLessThan(2);
    expect(evidence.sensitivity.nativeApproved).toBe(false);
    for (const id of ["0021", "0022"]) {
      expect(await readFile(evidence.downstream[id].ticket, "utf8")).toMatch(/^status: declined$/m);
    }
  });

  it("pins the private dependency outside root manifests and published artifact paths", async () => {
    const fixture = await readJson("test/fixtures/resource-strategy/external/package.json");
    const lock = await readJson("test/fixtures/resource-strategy/external/package-lock.json");
    expect(fixture.private).toBe(true);
    expect(fixture.devDependencies).toEqual({ "@tanstack/query-core": evidence.external.version });
    expect(lock.packages["node_modules/@tanstack/query-core"].integrity).toBe(
      evidence.external.integrity,
    );
    const manifest = await readJson("package.json");
    for (const field of [
      "dependencies",
      "devDependencies",
      "peerDependencies",
      "optionalDependencies",
    ]) {
      expect(Object.keys(manifest[field] ?? {}).some((name) => name.includes("query-core"))).toBe(
        false,
      );
    }
    expect(Object.keys(manifest.exports).some((name) => /resource|mutation/.test(name))).toBe(
      false,
    );
    expect(manifest.files).toContain("!schema/resource-strategy.schema.json");
    expect(manifest.files.some((path) => path.startsWith("test/"))).toBe(false);
    const rootLock = await readFile("package-lock.json", "utf8");
    expect(rootLock).not.toContain("@tanstack/query-core");
  });

  it("keeps each measured strategy graph independent and rooted in public jQStar entries", () => {
    for (const measurement of evidence.measurements) {
      const graphs = measurement.graphs;
      expect(
        graphs.external.modules.some((path) => path.includes("node_modules/@tanstack/query-core")),
      ).toBe(true);
      for (const name of ["server", "native", "baseline"]) {
        expect(
          graphs[name].modules.some((path) => path.includes("node_modules/@tanstack/query-core")),
        ).toBe(false);
      }
      for (const name of ["server", "native", "external"]) {
        const others =
          name === "server"
            ? /resource-strategy\/(native|external\/)/
            : name === "native"
              ? /resource-strategy\/(server-(?:entry|strategy)|external\/)/
              : /resource-strategy\/(native|server-(?:entry|strategy))/;
        expect(graphs[name].modules.some((path) => others.test(path))).toBe(false);
        expect(graphs[name].modules).toContain("src/trusted-runtime.ts");
        expect(graphs[name].modules).toContain("src/stores.ts");
      }
    }
  });

  it("retains all five samples in every browser and strategy with actual cleanup evidence", () => {
    for (const measurement of evidence.measurements) {
      expect(measurement.contractDigest).toBe(evidence.contract.sha256);
      expect(measurement.samples).toHaveLength(45);
      for (const engine of ["chromium", "firefox", "webkit"]) {
        for (const strategy of ["server", "external", "native"]) {
          const samples = measurement.samples.filter(
            (sample) => sample.engine === engine && sample.strategy === strategy,
          );
          expect(samples.map((sample) => sample.iteration)).toEqual([0, 1, 2, 3, 4]);
          for (const sample of samples) {
            expect(sample.coldOriginReads).toBe(1);
            expect(sample.disposal.failed).toEqual([]);
            expect(sample.disposal.remaining).toEqual([]);
            expect(sample.terminal).toMatchObject({
              records: 0,
              observers: 0,
              tasks: 0,
              pending: 0,
              browserTimers: 0,
            });
          }
        }
      }
    }
  });

  it("ties measurement source digests to the current research fixture", async () => {
    for (const measurement of evidence.measurements) {
      for (const source of measurement.sourceInventory) {
        expect(digest(await readFile(source.path)), source.path).toBe(source.sha256);
      }
      expect(digest(JSON.stringify(measurement.sourceInventory))).toBe(measurement.sourceDigest);
    }
  });

  it("recomputes the frozen weighted scores and complete sensitivity enumeration", () => {
    expect(Object.values(resourceWeights).reduce((a, b) => a + b, 0)).toBe(100);
    const scores = scoreResourceStrategies(evidence.measurements[0], evidence.inspection);
    expect(scores).toEqual(evidence.scores);
    const nativeApproved = Object.values(evidence.inspection.nativeApproval).every(
      (finding) => finding.pass,
    );
    const sensitivity = resourceSensitivity(scores, nativeApproved);
    expect(sensitivity).toEqual(evidence.sensitivity);
    expect(sensitivity.trials).toBe(3 ** 11);
    expect(
      Object.values(sensitivity.strictScoreWins).reduce((a, b) => a + b, sensitivity.exactTies),
    ).toBe(sensitivity.trials);
    expect(Object.values(sensitivity.eligiblePolicyWins).reduce((a, b) => a + b, 0)).toBe(
      sensitivity.trials,
    );
    expect(Object.values(sensitivity.strictScoreWins).filter((count) => count > 0)).toHaveLength(3);
  });

  it("rejects incomplete measurement and keeps a failed hard gate visible despite a numerical score", () => {
    const missing = structuredClone(evidence.measurements[0]);
    missing.samples.pop();
    expect(() => scoreResourceStrategies(missing, evidence.inspection)).toThrow(
      "Incomplete measurement",
    );
    const inspection = structuredClone(evidence.inspection);
    inspection.strategies.native.sourceFiles.push("missing.ts");
    expect(() => scoreResourceStrategies(evidence.measurements[0], inspection)).toThrow(
      "Missing measured source",
    );
    const failed = structuredClone(evidence.inspection);
    failed.strategies.external.hardGates.ownershipCleanup = false;
    const scores = scoreResourceStrategies(evidence.measurements[0], failed);
    expect(scores.external.hardGatesPass).toBe(false);
    const sensitivity = resourceSensitivity(scores, false);
    expect(sensitivity.eligiblePolicyWins).toEqual({ server: sensitivity.trials });
  });
});

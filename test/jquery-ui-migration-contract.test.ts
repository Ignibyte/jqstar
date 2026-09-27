import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

type MigrationClass =
  "changed-contract" | "direct-semantic" | "external-coexistence" | "no-equivalent";

interface Counts {
  accessibilityDefects: number;
  authoredHtmlJsLines: number;
  cssBytes: number;
  dependencies: number;
  imperativeLifecycleCalls: number;
  javascriptBytes: number;
  serverChanges: number;
  testLines: number;
}

interface InventoryEntry {
  category: string;
  id: string;
  matrixId: string;
  url: string;
}

interface MatrixRow {
  counterparts: string[];
  example: string;
  id: string;
  inventoryIds: string[];
  migrationClass: MigrationClass;
  testId: string;
}

interface MigrationContract {
  adapterScorecard: {
    results: Array<{ dimension: string; evidence: string; pass: boolean }>;
    thresholds: {
      minimumLineReductionPercent: number;
      minimumLinesSavedPerSlice: number;
    };
  };
  applicationSlices: Array<{
    accessibilityBaseline: {
      adapterEvidence: string;
      directMigrationAddedRuleIds: string[];
      legacyNodeCount: number;
      legacyRuleIds: string[];
    };
    adapterHypothesis: Counts;
    directMigration: Counts;
    id: string;
    legacy: Counts;
    repeatedStateChangingOperations: string[];
  }>;
  decision: { adapterShipped: boolean; allThresholdsPass: boolean; result: string };
  migrationClasses: MigrationClass[];
  officialInventory: InventoryEntry[];
  matrix: MatrixRow[];
  packages: Record<
    "jquery" | "jqueryUi",
    {
      integrity: string;
      name: string;
      resolved: string;
      role: string;
      shasum: string;
      version: string;
    }
  >;
  sourceMatrix: { path: string; sha256: string };
  stepMeasurements: Array<{ counts: Counts; id: string; method: string; stage: string }>;
}

interface PackageLock {
  packages: Record<
    string,
    {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      integrity?: string;
      peerDependencies?: Record<string, string>;
      resolved?: string;
      version?: string;
    }
  >;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const contract = JSON.parse(read("quality/jquery-ui-migration.json")) as MigrationContract;
const schema = JSON.parse(read("schema/jquery-ui-migration.schema.json"));
const packageManifest = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  files?: string[];
  peerDependencies?: Record<string, string>;
};
const packageLock = JSON.parse(read("package-lock.json")) as PackageLock;

function filesBelow(directory: string): string[] {
  const result: string[] = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) result.push(...filesBelow(path));
    else if (entry.isFile()) result.push(path);
  }
  return result;
}

describe("jQuery UI migration authority", () => {
  it("validates the closed evidence contract", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate(contract), JSON.stringify(validate.errors)).toBe(true);
    expect(contract.migrationClasses).toEqual([
      "direct-semantic",
      "changed-contract",
      "external-coexistence",
      "no-equivalent",
    ]);
  });

  it("consumes the exact upstream ecosystem matrix", () => {
    expect(contract.sourceMatrix.path).toBe("quality/jquery-ecosystem.json");
    expect(createHash("sha256").update(read(contract.sourceMatrix.path)).digest("hex")).toBe(
      contract.sourceMatrix.sha256,
    );
  });

  it("pins exact fixture packages while keeping UI out of runtime dependencies", () => {
    const rootLock = packageLock.packages[""] ?? {};
    const jqueryLock = packageLock.packages["node_modules/jquery"];
    const uiLock = packageLock.packages["node_modules/jquery-ui"];
    expect(contract.packages.jquery).toMatchObject({
      name: "jquery",
      role: "peer-and-fixture",
      version: "4.0.0",
    });
    expect(contract.packages.jqueryUi).toMatchObject({
      name: "jquery-ui",
      role: "fixture-only",
      version: "1.14.2",
    });
    expect(packageManifest.devDependencies?.["jquery-ui"]).toBe("1.14.2");
    expect(rootLock.devDependencies?.["jquery-ui"]).toBe("1.14.2");
    expect(packageManifest.dependencies).not.toHaveProperty("jquery-ui");
    expect(packageManifest.peerDependencies).not.toHaveProperty("jquery-ui");
    expect(rootLock.dependencies).not.toHaveProperty("jquery-ui");
    expect(rootLock.peerDependencies).not.toHaveProperty("jquery-ui");
    for (const [record, evidence] of [
      [jqueryLock, contract.packages.jquery],
      [uiLock, contract.packages.jqueryUi],
    ] as const) {
      expect(record?.version).toBe(evidence.version);
      expect(record?.resolved).toBe(evidence.resolved);
      expect(record?.integrity).toBe(evidence.integrity);
    }
    expect(packageManifest.files).toContain("!schema/jquery-ui-migration.schema.json");
    expect(statSync(resolve(repositoryRoot, "node_modules/jquery-ui/dist/jquery-ui.js")).size).toBe(
      522_385,
    );
    expect(
      statSync(resolve(repositoryRoot, "node_modules/jquery-ui/dist/themes/base/jquery-ui.css"))
        .size,
    ).toBe(35_137);
  });

  it("maps every unique official API URL exactly once", () => {
    expect(contract.officialInventory).toHaveLength(72);
    expect(new Set(contract.officialInventory.map(({ id }) => id)).size).toBe(72);
    expect(new Set(contract.officialInventory.map(({ url }) => url)).size).toBe(72);
    const categoryCounts = contract.officialInventory.reduce<Record<string, number>>(
      (counts, { category }) => {
        counts[category] = (counts[category] ?? 0) + 1;
        return counts;
      },
      {},
    );
    expect(categoryCounts).toEqual({
      contract: 3,
      effect: 34,
      interaction: 6,
      method: 7,
      selector: 3,
      theme: 3,
      utility: 1,
      widget: 15,
    });

    const mapped = contract.matrix.flatMap(({ inventoryIds }) => inventoryIds);
    expect(mapped).toHaveLength(72);
    expect(new Set(mapped).size).toBe(72);
    expect(new Set(mapped)).toEqual(new Set(contract.officialInventory.map(({ id }) => id)));
    const rows = new Map(contract.matrix.map((row) => [row.id, row]));
    for (const entry of contract.officialInventory) {
      expect(rows.get(entry.matrixId)?.inventoryIds, entry.id).toContain(entry.id);
    }
    expect(contract.matrix.filter(({ inventoryIds }) => inventoryIds.length === 0)).toMatchObject([
      { id: "migration.extension.third-party-widget", migrationClass: "external-coexistence" },
    ]);
    expect(new Set(contract.matrix.map(({ testId }) => testId)).size).toBe(contract.matrix.length);
  });

  it("links real counterparts and does not turn catalog similarity into API compatibility", () => {
    for (const row of contract.matrix) {
      for (const path of row.counterparts.filter((value) => value.startsWith("registry/"))) {
        expect(existsSync(resolve(repositoryRoot, path)), `${row.id}: ${path}`).toBe(true);
      }
    }
    expect(new Set(contract.matrix.map(({ migrationClass }) => migrationClass))).toEqual(
      new Set(contract.migrationClasses),
    );
    expect(
      contract.matrix.find(({ id }) => id === "migration.contract.widget-factory"),
    ).toMatchObject({ migrationClass: "no-equivalent" });
    expect(
      contract.matrix.find(({ id }) => id === "migration.contract.plugin-bridge"),
    ).toMatchObject({ migrationClass: "changed-contract" });
  });

  it("applies the frozen adapter thresholds to both independent slices", () => {
    for (const slice of contract.applicationSlices) {
      expect(slice.repeatedStateChangingOperations.length).toBeGreaterThanOrEqual(2);
      const linesSaved =
        slice.directMigration.authoredHtmlJsLines - slice.adapterHypothesis.authoredHtmlJsLines;
      const percent = (linesSaved / slice.directMigration.authoredHtmlJsLines) * 100;
      expect(linesSaved).toBeLessThan(
        contract.adapterScorecard.thresholds.minimumLinesSavedPerSlice,
      );
      expect(percent).toBeLessThan(
        contract.adapterScorecard.thresholds.minimumLineReductionPercent,
      );
      expect(slice.directMigration.dependencies).toBe(0);
      expect(slice.directMigration.imperativeLifecycleCalls).toBe(0);
      expect(slice.directMigration.accessibilityDefects).toBe(0);
      expect(slice.accessibilityBaseline.legacyRuleIds).toHaveLength(
        slice.legacy.accessibilityDefects,
      );
      expect(slice.accessibilityBaseline.legacyNodeCount).toBeGreaterThanOrEqual(
        slice.accessibilityBaseline.legacyRuleIds.length,
      );
      expect(slice.accessibilityBaseline.directMigrationAddedRuleIds).toEqual([]);
      expect(slice.accessibilityBaseline.adapterEvidence).toBe("not-executed");
    }
    expect(contract.adapterScorecard.results).toHaveLength(9);
    expect(new Set(contract.adapterScorecard.results.map(({ dimension }) => dimension)).size).toBe(
      9,
    );
    expect(contract.adapterScorecard.results.some(({ pass }) => !pass)).toBe(true);
    expect(contract.decision).toEqual({
      adapterShipped: false,
      allThresholdsPass: false,
      recommendedPath: "coexist-then-direct-semantic-migration",
      rationale: expect.any(Array),
      result: "no-go",
    });
  });

  it("keeps measurement scope explicit and jQuery UI absent from production source", () => {
    for (const step of contract.stepMeasurements) {
      expect(step.method).toMatch(/line|count|byte|physical|package/iu);
      expect(step.counts.accessibilityDefects).toBeGreaterThanOrEqual(0);
    }
    const importPattern =
      /(?:from\s*|import\s*\(|require\s*\(|src\s*=)\s*["'](?:jquery-ui)(?:\/[^"']*)?["']/u;
    const sourceFiles = ["src", "server", "registry", "bin"].flatMap((directory) =>
      filesBelow(resolve(repositoryRoot, directory)).filter((path) =>
        new Set([".cjs", ".html", ".js", ".mjs", ".ts"]).has(extname(path)),
      ),
    );
    for (const path of sourceFiles)
      expect(readFileSync(path, "utf8"), path).not.toMatch(importPattern);
  });

  it("publishes every matrix example and the no-adapter boundary", () => {
    const guide = read("docs/JQUERY_UI_MIGRATION.md");
    const anchors = new Set(
      [...guide.matchAll(/^#{2,3}\s+(.+)$/gmu)].map(([, heading]) =>
        heading!
          .toLowerCase()
          .replace(/[^a-z0-9 -]/gu, "")
          .trim()
          .replace(/\s+/gu, "-"),
      ),
    );
    for (const row of contract.matrix) {
      const [path, anchor] = row.example.split("#");
      expect(path).toBe("docs/JQUERY_UI_MIGRATION.md");
      expect(anchors, `${row.id}: ${anchor}`).toContain(anchor);
    }
    const normalizedGuide = guide.replace(/\s+/gu, " ");
    for (const statement of [
      "ships no adapter.",
      "jQuery UI is a root development dependency only.",
      "Do not initialize both systems on one element",
      "Third-party Widget Factory extensions are a separate",
      "522,385",
      "35,137",
    ]) {
      expect(normalizedGuide).toContain(statement);
    }

    const site = read("example/docs/ecosystem/jquery-ui/index.html");
    expect(site).toContain("jQuery UI coexistence and migration");
    expect(site).toContain("No compatibility facade");
    expect(read("example/docs-shell.html")).toContain("docs/ecosystem/jquery-ui/");
    expect(read("vite.demo.config.ts")).toContain('"docs/ecosystem/jquery-ui/index.html"');
    const agentManifest = JSON.parse(read("config/agent-content.json")) as {
      guides: Array<{ id: string; source: string }>;
    };
    expect(agentManifest.guides).toContainEqual(
      expect.objectContaining({
        id: "jquery-ui-migration",
        source: "example/docs/ecosystem/jquery-ui/index.html",
      }),
    );
  });

  it("extends package quality with fixture-only tarball and graph checks", () => {
    const packageQuality = read("scripts/quality-package.mjs");
    for (const statement of [
      'manifest.dependencies?.["jquery-ui"] === undefined',
      'manifest.peerDependencies?.["jquery-ui"] === undefined',
      '!existsSync(join(consumer, "node_modules/jquery-ui"))',
      "Packed package contains a jQuery UI runtime, theme, icon, or source path.",
      '"node_modules/jquery-ui"',
    ]) {
      expect(packageQuality).toContain(statement);
    }
  });
});

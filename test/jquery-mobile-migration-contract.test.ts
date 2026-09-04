import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { extname, resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

interface Assignment {
  groupId: string;
  id: string;
}

interface ApiEntry extends Assignment {
  category: string;
  title: string;
  url: string;
}

interface DataAttribute {
  contexts: string[];
  groupId: string;
  name: string;
}

interface Group {
  accessibilityFallback: string;
  example: string;
  id: string;
  legacyNeed: string;
  markupApiChange: string;
  modernTarget: string;
  owner: string;
  securityOwnership: string;
  testId: string;
  unsupported: string;
}

interface MigrationContract {
  apiInventory: ApiEntry[];
  applicationInventories: Array<{
    applicationSpecificRisks: string[];
    id: string;
    migrationUnits: string[];
    routes: number;
  }>;
  bridgeDecisions: Array<{
    id: string;
    sourceTicket: null | string;
    status: string;
  }>;
  dataAttributes: DataAttribute[];
  decision: {
    compatibilityLayer: boolean;
    migrationUnit: string;
    outcome: string;
    runtime: boolean;
  };
  extraBehaviors: Assignment[];
  groups: Group[];
  owners: string[];
  policy: {
    ecosystemSha256: string;
    historicalPackage: {
      integrity: string;
      name: string;
      shasum: string;
      usage: string;
      version: string;
    };
    modernPackages: {
      jquery: { integrity: string; shasum: string; version: string };
      jqueryStar: { version: string };
    };
  };
  referenceApp: {
    capabilities: string[];
    measurements: {
      assetBytes: Record<string, number>;
      browserCases: number;
      historicalRuntimeDependencies: number;
      runtimeDependencies: number;
      serverRoutes: number;
      sourceLines: Record<string, number>;
    };
    routes: string[];
    unsupported: string[];
  };
  sources: Array<{ id: string; url: string }>;
  transitions: Array<{ groupId: string; name: string }>;
}

interface PackageManifest {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  files?: string[];
  optionalDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  version: string;
}

interface PackageLock {
  packages: Record<
    string,
    {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      optionalDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
    }
  >;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const contract = JSON.parse(read("quality/jquery-mobile-migration.json")) as MigrationContract;
const schema = JSON.parse(read("schema/jquery-mobile-migration.schema.json"));
const packageManifest = JSON.parse(read("package.json")) as PackageManifest;
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

describe("jQuery Mobile migration authority", () => {
  it("validates the closed evidence contract", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate(contract), JSON.stringify(validate.errors)).toBe(true);
    expect(contract.owners).toEqual([
      "native-html",
      "native-css",
      "jqstar-component",
      "application-code",
      "datastar-sdk",
      "turbo-bridge",
      "htmx-bridge",
      "full-document",
      "unsupported",
    ]);
  });

  it("consumes the exact ecosystem decision and historical package identity", () => {
    expect(createHash("sha256").update(read("quality/jquery-ecosystem.json")).digest("hex")).toBe(
      contract.policy.ecosystemSha256,
    );
    expect(contract.policy.historicalPackage).toEqual({
      integrity:
        "sha512-5CIKR+jQ34GMNz8vGpiNIxQ2zfmEXpbCI0hFfyHYi/MDhdkJLpk2lFl2txjPxkAbHSvJLntNJgS//OrA1nBIkg==",
      name: "jquery-mobile",
      shasum: "4c5eaf3d20f99973d1481ed4c9c8921d016fe198",
      usage: "identity-only",
      version: "1.4.1",
    });
    expect(contract.policy.modernPackages.jquery).toMatchObject({ version: "4.0.0" });
    expect(packageManifest.version).toBe(contract.policy.modernPackages.jqueryStar.version);
  });

  it("maps all 95 official API entries to one detailed owner group", () => {
    expect(contract.apiInventory).toHaveLength(95);
    expect(new Set(contract.apiInventory.map(({ id }) => id)).size).toBe(95);
    expect(new Set(contract.apiInventory.map(({ url }) => url)).size).toBe(95);
    const categories = contract.apiInventory.reduce<Record<string, number>>((counts, entry) => {
      counts[entry.category] = (counts[entry.category] ?? 0) + 1;
      return counts;
    }, {});
    expect(categories).toEqual({
      "css-framework": 4,
      events: 34,
      jqmicons: 1,
      methods: 16,
      path: 10,
      properties: 1,
      reference: 2,
      widgets: 27,
    });
    const groups = new Map(contract.groups.map((group) => [group.id, group]));
    for (const entry of contract.apiInventory) {
      expect(groups.has(entry.groupId), `${entry.id}: ${entry.groupId}`).toBe(true);
      expect(entry.url).toBe(`https://api.jquerymobile.com/1.4/${entry.id.slice(4)}/`);
      expect(entry.title.length).toBeGreaterThan(0);
    }
  });

  it("freezes all data attributes, reference contexts, and transitions", () => {
    expect(contract.dataAttributes).toHaveLength(60);
    expect(new Set(contract.dataAttributes.map(({ name }) => name)).size).toBe(60);
    expect(contract.dataAttributes.reduce((sum, entry) => sum + entry.contexts.length, 0)).toBe(
      122,
    );
    const groups = new Set(contract.groups.map(({ id }) => id));
    for (const entry of contract.dataAttributes) {
      expect(groups.has(entry.groupId), `${entry.name}: ${entry.groupId}`).toBe(true);
      expect(new Set(entry.contexts).size).toBe(entry.contexts.length);
    }
    expect(contract.transitions.map(({ name }) => name)).toEqual([
      "fade",
      "pop",
      "flip",
      "turn",
      "flow",
      "slidefade",
      "slide",
      "slideup",
      "slidedown",
      "none",
    ]);
    expect(new Set(contract.transitions.map(({ groupId }) => groupId))).toEqual(
      new Set(["transitions"]),
    );
  });

  it("gives every extra behavior and owner an executable disposition", () => {
    const groups = new Map(contract.groups.map((group) => [group.id, group]));
    expect(new Set(contract.groups.map(({ id }) => id)).size).toBe(contract.groups.length);
    for (const assignment of contract.extraBehaviors) {
      expect(groups.has(assignment.groupId), assignment.id).toBe(true);
    }
    expect(new Set(contract.groups.map(({ owner }) => owner))).toEqual(new Set(contract.owners));
    for (const group of contract.groups) {
      expect(group.legacyNeed.length).toBeGreaterThan(10);
      expect(group.modernTarget.length).toBeGreaterThan(10);
      expect(group.markupApiChange).toContain("do not translate");
      expect(group.accessibilityFallback).toContain("no-JavaScript");
      expect(group.securityOwnership).toContain("server retains");
      expect(group.unsupported.length).toBeGreaterThan(8);
      expect(group.example).toContain(group.testId);
    }
  });

  it("imports only completed bridge choices and leaves native navigation unapproved", () => {
    expect(contract.bridgeDecisions).toEqual([
      expect.objectContaining({ id: "full-document", sourceTicket: null, status: "default" }),
      expect.objectContaining({ id: "datastar", sourceTicket: "0012", status: "available" }),
      expect.objectContaining({ id: "turbo", sourceTicket: "0036", status: "optional" }),
      expect.objectContaining({ id: "htmx", sourceTicket: "0037", status: "optional" }),
      expect.objectContaining({
        id: "native-navigation",
        sourceTicket: "0023",
        status: "not-approved",
      }),
    ]);
    for (const ticket of ["0012", "0036", "0037"]) {
      const path = filesBelow(resolve(repositoryRoot, "docs/tickets")).find((candidate) =>
        candidate.includes(`/${ticket}-`),
      );
      expect(path).toBeDefined();
      expect(readFileSync(path!, "utf8")).toMatch(/^status: done$/mu);
    }
    const nativeTicket = filesBelow(resolve(repositoryRoot, "docs/tickets")).find((candidate) =>
      candidate.includes("/0023-"),
    );
    expect(readFileSync(nativeTicket!, "utf8")).toMatch(/^status: planned$/mu);
  });

  it("uses two application inventories and records the no-runtime outcome", () => {
    expect(contract.applicationInventories.map(({ id }) => id)).toEqual([
      "project-tracker",
      "field-service",
    ]);
    for (const inventory of contract.applicationInventories) {
      expect(inventory.routes).toBeGreaterThanOrEqual(6);
      expect(inventory.migrationUnits.length).toBeGreaterThanOrEqual(6);
      expect(inventory.applicationSpecificRisks.length).toBeGreaterThanOrEqual(3);
    }
    expect(contract.decision).toMatchObject({
      compatibilityLayer: false,
      migrationUnit: "route-or-semantic-region",
      outcome: "no-runtime-route-by-route-migration",
      runtime: false,
    });
  });

  it("keeps jquery-mobile out of dependencies, installs, and production imports", () => {
    const rootLock = packageLock.packages[""] ?? {};
    for (const dependencies of [
      packageManifest.dependencies,
      packageManifest.devDependencies,
      packageManifest.optionalDependencies,
      packageManifest.peerDependencies,
      rootLock.dependencies,
      rootLock.devDependencies,
      rootLock.optionalDependencies,
      rootLock.peerDependencies,
    ]) {
      expect(dependencies ?? {}).not.toHaveProperty("jquery-mobile");
    }
    expect(Object.keys(packageLock.packages)).not.toContain("node_modules/jquery-mobile");
    expect(existsSync(resolve(repositoryRoot, "node_modules/jquery-mobile"))).toBe(false);
    expect(packageManifest.files).toContain("!schema/jquery-mobile-migration.schema.json");

    const importPattern =
      /(?:from\s*|import\s*\(|require\s*\(|src\s*=)\s*["'](?:jquery-mobile)(?:\/[^"']*)?["']/u;
    const sourceFiles = ["src", "server", "registry", "bin"].flatMap((directory) =>
      filesBelow(resolve(repositoryRoot, directory)).filter((path) =>
        new Set([".cjs", ".html", ".js", ".mjs", ".ts"]).has(extname(path)),
      ),
    );
    for (const path of sourceFiles) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(importPattern);
    }
  });

  it("measures the executable reference app and excludes Mobile runtime behavior", () => {
    const sourcePaths = {
      application: "e2e/fixtures/jquery-mobile-migration/app.js",
      browserSpec: "e2e/jquery-mobile-migration.spec.ts",
      server: "e2e/fixtures/jquery-mobile-migration-server.mjs",
      styles: "e2e/fixtures/jquery-mobile-migration/style.css",
    };
    const assetPaths = {
      application: sourcePaths.application,
      jquery: "node_modules/jquery/dist/jquery.js",
      jqueryStar: "dist/jquery-star.umd.cjs",
      styles: sourcePaths.styles,
    };
    const lines = Object.fromEntries(
      Object.entries(sourcePaths).map(([name, path]) => [
        name,
        read(path).match(/\n/gu)?.length ?? 0,
      ]),
    );
    const bytes = Object.fromEntries(
      Object.entries(assetPaths).map(([name, path]) => [
        name,
        statSync(resolve(repositoryRoot, path)).size,
      ]),
    );
    expect(contract.referenceApp.measurements).toEqual({
      assetBytes: bytes,
      browserCases: 16,
      historicalRuntimeDependencies: 0,
      runtimeDependencies: 2,
      serverRoutes: 10,
      sourceLines: lines,
    });

    const executable = Object.values(sourcePaths)
      .map((path) => read(path))
      .join("\n");
    for (const pattern of [
      /\bdata-role\s*=/iu,
      /\bjquery\.mobile\b/iu,
      /\b(?:vclick|vmouse(?:cancel|down|move|out|over|up)?)\b/iu,
      /code\.jquery\.com\/mobile/iu,
      /event:\s*datastar-/iu,
    ]) {
      expect(executable).not.toMatch(pattern);
    }
    expect(read(sourcePaths.server)).toContain(
      'import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";',
    );
    expect(read(sourcePaths.server)).toContain("ServerSentEventGenerator.stream");
  });

  it("extends exact-package and graph checks to the archived runtime", () => {
    const packageQuality = read("scripts/quality-package.mjs");
    for (const statement of [
      'manifest.dependencies?.["jquery-mobile"] === undefined',
      'manifest.devDependencies?.["jquery-mobile"] === undefined',
      '!existsSync(join(consumer, "node_modules/jquery-mobile"))',
      "Packed package contains a jQuery Mobile runtime, theme, icon, or source path.",
      '"node_modules/jquery-mobile"',
    ]) {
      expect(packageQuality).toContain(statement);
    }
  });

  it("publishes the no-runtime guide, website route, and agent corpus source", () => {
    const guide = read("docs/JQUERY_MOBILE_MIGRATION.md");
    const normalizedGuide = guide.replace(/\s+/gu, " ");
    for (const statement of [
      "archived migration source, not a current runtime dependency",
      "Do not report a percentage from the official inventory alone.",
      "Treat the Core/Migrate upgrade and the UI/navigation rewrite as separate changes",
      "Never replay an indeterminate write automatically",
      "Normal document navigation is the default.",
      "Native jQStar navigation is not an approved option while ticket 0023 remains planned.",
      "jQStar ships no compatibility layer.",
      "483 lines",
      "255,967 bytes",
    ]) {
      expect(normalizedGuide).toContain(statement);
    }
    for (const source of contract.sources) expect(guide).toContain(source.url);
    for (const path of [
      "README.md",
      "docs/README.md",
      "docs/JQUERY_ECOSYSTEM.md",
      "docs/ARCHITECTURE.md",
      "docs/BACKEND.md",
      "docs/TESTING.md",
    ]) {
      expect(read(path), path).toContain("JQUERY_MOBILE_MIGRATION.md");
    }

    const sitePath = "example/docs/ecosystem/jquery-mobile/index.html";
    const site = read(sitePath);
    expect(site).toContain("jQuery Mobile migration");
    expect(site).toContain("No compatibility runtime");
    expect(site).toContain("95 official 1.4 API entries");
    expect(site).toContain("16 browser executions");
    expect(read("example/docs-shell.html")).toContain("docs/ecosystem/jquery-mobile/");
    expect(read("example/docs/ecosystem/index.html")).toContain(
      "route-by-route Mobile migration guide",
    );
    expect(read("vite.demo.config.ts")).toContain('"docs/ecosystem/jquery-mobile/index.html"');
    const agentManifest = JSON.parse(read("config/agent-content.json")) as {
      guides: Array<{ id: string; source: string }>;
    };
    expect(agentManifest.guides).toContainEqual({
      contentRoot: "article",
      id: "jquery-mobile-migration",
      keywords: expect.any(Array),
      path: "docs/ecosystem/jquery-mobile/",
      source: sitePath,
      summary: expect.any(String),
      title: "jQuery Mobile migration",
    });
  });
});

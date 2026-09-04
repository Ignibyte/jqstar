import { createHash } from "node:crypto";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { extname, resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

interface ProjectRecord {
  id: string;
  officialStatus: string;
  reviewedRelease: string;
  runtimePolicy: string;
  sources: Array<{ id: string; reviewedAt: string; url: string }>;
  supportedRange: string | null;
  testedVersions: string[];
}

interface UICapability {
  classification: string;
  id: string;
  jqstarCounterparts: string[];
}

interface DownstreamRecord {
  id: string;
  projectId: string;
  ticket: string;
}

interface EcosystemContract {
  downstream: DownstreamRecord[];
  expiresAt: string;
  product: {
    forbiddenClaims: string[];
    names: Record<string, string>;
    surfaceReview: Array<{ surface: string }>;
  };
  projects: ProjectRecord[];
  reviewPolicy: { maximumAgeDays: number };
  reviewedAt: string;
  schema: string;
  uiCapabilityMap: UICapability[];
}

interface PackageLock {
  packages: Record<
    string,
    {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
      peerDependencies?: Record<string, string>;
      version?: string;
    }
  >;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const read = (path: string) => readFileSync(resolve(repositoryRoot, path), "utf8");
const matrixSource = read("quality/jquery-ecosystem.json");
const matrix = JSON.parse(matrixSource) as EcosystemContract;
const schema = JSON.parse(read("schema/jquery-ecosystem.schema.json"));
const packageManifest = JSON.parse(read("package.json")) as {
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  name: string;
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

function project(id: string): ProjectRecord {
  const record = matrix.projects.find((candidate) => candidate.id === id);
  if (!record) throw new Error(`Missing ecosystem project ${id}.`);
  return record;
}

describe("jQuery ecosystem evidence", () => {
  it("validates the closed matrix and fails once its primary-source review expires", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);
    expect(validate(matrix), JSON.stringify(validate.errors)).toBe(true);
    expect(matrix.schema).toBe("jqstar-jquery-ecosystem/1");

    const reviewedAt = Date.parse(matrix.reviewedAt);
    const expiresAt = Date.parse(matrix.expiresAt);
    expect(expiresAt).toBeGreaterThan(reviewedAt);
    expect(expiresAt - reviewedAt).toBeLessThanOrEqual(
      matrix.reviewPolicy.maximumAgeDays * 24 * 60 * 60 * 1000,
    );
    expect(Date.now(), `Ecosystem evidence expired at ${matrix.expiresAt}`).toBeLessThan(expiresAt);

    expect(matrix.projects.map(({ id }) => id)).toEqual([
      "jquery-core",
      "jquery-migrate",
      "jquery-ui",
      "jquery-mobile",
      "sizzle",
      "qunit",
    ]);
    expect(
      Object.fromEntries(
        matrix.projects.map(({ id, officialStatus, reviewedRelease }) => [
          id,
          [officialStatus, reviewedRelease],
        ]),
      ),
    ).toEqual({
      "jquery-core": ["impact", "4.0.0"],
      "jquery-migrate": ["jquery-companion", "4.0.2"],
      "jquery-mobile": ["archived", "1.4.1"],
      "jquery-ui": ["archived", "1.14.2"],
      qunit: ["at-large", "2.26.0"],
      sizzle: ["archived", "2.3.10"],
    });
    const sources = matrix.projects.flatMap(({ sources }) => sources);
    expect(new Set(sources.map(({ id }) => id)).size).toBe(sources.length);
    expect(sources.every(({ reviewedAt }) => reviewedAt === matrix.reviewedAt)).toBe(true);
    expect(sources.every(({ url }) => url.startsWith("https://"))).toBe(true);
  });

  it("keeps real jQuery as the sole required peer and preserves the jQuery/signal boundary", () => {
    expect(packageManifest.peerDependencies).toEqual({
      "@hotwired/turbo": ">=8.0.21 <8.1.0",
      "htmx.org": ">=2.0.0 <2.1.0",
      jquery: ">=4.0.0 <5",
    });
    expect(
      (packageManifest as { peerDependenciesMeta?: Record<string, { optional?: boolean }> })
        .peerDependenciesMeta,
    ).toEqual({ "@hotwired/turbo": { optional: true }, "htmx.org": { optional: true } });
    expect((packageManifest as { files?: string[] }).files).toContain(
      "!schema/jquery-ecosystem.schema.json",
    );
    expect(project("jquery-core")).toMatchObject({
      runtimePolicy: "peer-foundation",
      supportedRange: ">=4.0.0 <5",
      testedVersions: ["4.0.0"],
    });
    const packageQuality = read("scripts/quality-package.mjs");
    expect(packageQuality).toContain('jqueryPeer === ">=4.0.0 <5"');
    expect(packageQuality).toContain('"jquery@4.0.0"');
    for (const path of ["README.md", "docs/PROJECT.md", "docs/JQUERY_ECOSYSTEM.md"]) {
      const source = read(path);
      expect(source, path).toContain("$ is real jQuery");
      expect(source, path).toContain("$name");
    }
  });

  it("uses exact QUnit only as an installed testing consumer", () => {
    expect(packageManifest.devDependencies?.qunit).toBe("^2.26.0");
    expect(packageLock.packages["node_modules/qunit"]?.version).toBe("2.26.0");
    expect(packageManifest.dependencies).not.toHaveProperty("qunit");
    expect(packageManifest.peerDependencies).not.toHaveProperty("qunit");
    expect(project("qunit")).toMatchObject({
      runtimePolicy: "development-test-only",
      supportedRange: "2.26.0",
      testedVersions: ["2.26.0"],
    });

    const packageQuality = read("scripts/quality-package.mjs");
    expect(packageQuality).toContain('"qunit@2.26.0"');
    expect(packageQuality.match(/QUnit\.test\(/gu)).toHaveLength(3);
    expect(packageQuality).toContain('"node_modules/qunit"');
    expect(packageQuality).toContain(
      'return "3 installed-package extension, testing, and CSP tests"',
    );
  });

  it("keeps Migrate, UI, Mobile, and standalone Sizzle out of runtime ownership", () => {
    const forbiddenPackages = ["jquery-migrate", "jquery-mobile", "sizzle"];
    const rootLock = packageLock.packages[""] ?? {};
    for (const dependencies of [
      packageManifest.dependencies,
      packageManifest.devDependencies,
      packageManifest.peerDependencies,
      rootLock.dependencies,
      rootLock.devDependencies,
      rootLock.peerDependencies,
    ]) {
      for (const name of forbiddenPackages) expect(dependencies).not.toHaveProperty(name);
    }

    expect(packageLock.packages["node_modules/@types/sizzle"]?.version).toBe("2.3.10");
    expect(project("sizzle").runtimePolicy).toBe("absent");
    expect(project("jquery-mobile").runtimePolicy).toBe("absent");
    expect(project("jquery-ui").runtimePolicy).toBe("external-only");
    expect(project("jquery-migrate").runtimePolicy).toBe("application-opt-in");
    expect(packageManifest.devDependencies?.["jquery-ui"]).toBe("1.14.2");
    expect(rootLock.devDependencies?.["jquery-ui"]).toBe("1.14.2");
    expect(packageManifest.dependencies).not.toHaveProperty("jquery-ui");
    expect(packageManifest.peerDependencies).not.toHaveProperty("jquery-ui");
    expect(rootLock.dependencies).not.toHaveProperty("jquery-ui");
    expect(rootLock.peerDependencies).not.toHaveProperty("jquery-ui");

    const importPattern =
      /(?:from\s*|import\s*\(|require\s*\(|src\s*=)\s*["'](?:jquery-migrate|jquery-mobile|jquery-ui|sizzle|qunit)(?:\/[^"']*)?["']/u;
    const productionRoots = ["src", "server", "registry", "bin", "example"];
    const sourceFiles = productionRoots.flatMap((directory) =>
      filesBelow(resolve(repositoryRoot, directory)).filter((path) =>
        new Set([".cjs", ".html", ".js", ".mjs", ".ts"]).has(extname(path)),
      ),
    );
    for (const path of sourceFiles) {
      expect(readFileSync(path, "utf8"), path).not.toMatch(importPattern);
    }
  });

  it("accounts for the official UI catalog without claiming drop-in compatibility", () => {
    const ids = matrix.uiCapabilityMap.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of [
      "jquery-ui.widget.accordion",
      "jquery-ui.widget.autocomplete",
      "jquery-ui.widget.button",
      "jquery-ui.widget.buttonset",
      "jquery-ui.widget.checkboxradio",
      "jquery-ui.widget.controlgroup",
      "jquery-ui.widget.datepicker",
      "jquery-ui.widget.dialog",
      "jquery-ui.widget.menu",
      "jquery-ui.widget.progressbar",
      "jquery-ui.widget.selectmenu",
      "jquery-ui.widget.slider",
      "jquery-ui.widget.spinner",
      "jquery-ui.widget.tabs",
      "jquery-ui.widget.tooltip",
      "jquery-ui.interaction.draggable",
      "jquery-ui.interaction.droppable",
      "jquery-ui.interaction.mouse",
      "jquery-ui.interaction.resizable",
      "jquery-ui.interaction.selectable",
      "jquery-ui.interaction.sortable",
      "jquery-ui.utility.position",
      "jquery-ui.effects.catalog",
      "jquery-ui.theme.themeroller",
      "jquery-ui.contract.widget-factory",
      "jquery-ui.contract.plugin-bridge",
      "jquery-ui.extension.third-party-widgets",
    ]) {
      expect(ids, id).toContain(id);
    }
    expect(new Set(matrix.uiCapabilityMap.map(({ classification }) => classification))).toEqual(
      new Set([
        "catalog-counterpart",
        "semantic-api-migration",
        "external-coexistence",
        "no-equivalent",
      ]),
    );
    for (const { jqstarCounterparts } of matrix.uiCapabilityMap) {
      for (const path of jqstarCounterparts.filter((candidate) =>
        candidate.startsWith("registry/"),
      )) {
        expect(existsSync(resolve(repositoryRoot, path)), path).toBe(true);
      }
    }
  });

  it("pins each downstream owner to this exact matrix", () => {
    const digest = createHash("sha256").update(matrixSource).digest("hex");
    expect(matrix.downstream.map(({ ticket }) => ticket)).toEqual(["0014", "0032", "0039", "0040"]);
    expect(new Set(matrix.downstream.map(({ id }) => id)).size).toBe(matrix.downstream.length);
    for (const { id, ticket } of matrix.downstream) {
      const ticketNames: Record<string, string> = {
        "0014": "0014-publish-testing-conformance.md",
        "0032": "0032-add-package-upgrade-diagnostics.md",
        "0039": "0039-publish-jquery-ui-migration.md",
        "0040": "0040-publish-jquery-mobile-migration.md",
      };
      const source = read(`docs/tickets/${ticketNames[ticket]}`);
      expect(source, ticket).toContain(id);
      expect(source, ticket).toContain(digest);
    }
  });

  it("keeps independent naming and records every trademark review surface", () => {
    expect(matrix.product.names).toEqual({
      cli: "jqstar",
      legacyCheckout: "jqdatastar",
      markup: "data-jqs",
      package: "jquery-star",
      product: "jQStar",
      site: "jqstar.com",
    });
    expect(new Set(matrix.product.surfaceReview.map(({ surface }) => surface))).toEqual(
      new Set([
        "package-metadata",
        "readme",
        "website-titles-copy",
        "social-image-assets",
        "repository-metadata-topics",
        "examples",
        "migration-guides",
        "release-notes",
      ]),
    );
    expect(packageManifest.name).toBe("jquery-star");
    for (const path of [
      "README.md",
      "docs/JQUERY_ECOSYSTEM.md",
      "example/docs/ecosystem/index.html",
    ]) {
      const source = read(path);
      const normalizedSource = source.replace(/\s+/gu, " ").toLowerCase();
      expect(normalizedSource, path).toContain("independent");
      expect(normalizedSource, path).toContain("not affiliated");
    }
    const assetNames = filesBelow(resolve(repositoryRoot, "example/public")).map((path) =>
      path.slice(resolve(repositoryRoot, "example/public").length + 1),
    );
    expect(assetNames).toContain("og-jqstar.png");
    expect(assetNames).toContain("favicon.svg");
    expect(assetNames.some((name) => /jquery|openjs|sizzle/iu.test(name))).toBe(false);
    expect(matrix.product.forbiddenClaims).toEqual([
      "jQuery UI 2",
      "the new jQuery UI",
      "official jQuery successor",
      "OpenJS sponsored",
      "jQuery endorsed",
    ]);
  });
});

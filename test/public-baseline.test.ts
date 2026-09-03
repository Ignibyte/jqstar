import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import $ from "jquery";
import ts from "typescript";
import { describe, expect, it } from "vitest";
import * as publicRuntime from "../src/index";
import { kernelForDocument } from "../src/kernel";

interface PublicBaseline {
  schema: string;
  version: string;
  stability: string;
  runtime: {
    rootExports: string[];
    typeExports: string[];
    jqueryInstanceMembers: string[];
    jqueryStaticMembers: string[];
    pluginCommands: string[];
    starStaticMembers: string[];
    uiMembers: string[];
    registeredActions: string[];
    autoInstall: boolean;
    umdGlobal: string;
  };
  declarative: {
    extensionDirectiveNamespace: string;
    extensionHelperNamespace: string;
    directiveForms: string[];
    eventModifiers: string[];
    expressionScope: string[];
  };
  backend: {
    methods: Record<string, string>;
    request: Record<string, string>;
    lifecycleEvents: Array<{
      name: string;
      target: string;
      cancelable: boolean;
      detail: string;
    }>;
    responseTypes: string[];
  };
  package: {
    exports: string[];
    formats: string[];
    observedArtifact: { files: number; packedBytes: number; unpackedBytes: number };
    bundleBytes: Record<string, number>;
    releaseSha256: string;
  };
  support: {
    jquery: string;
    node: string;
    browsers: string[];
    moduleFormats: string[];
    documents: string[];
    unsupportedDocuments: string[];
  };
  policy: {
    minimumDeprecationMinorReleases: number;
    errorCodes: string;
    pluginApi: string;
  };
  deprecated: unknown[];
  internal: string[];
  evidence: { apiReport: string; behaviorTests: string[] };
}

interface PackageManifest {
  version: string;
  exports: Record<string, unknown>;
  engines: { node: string };
  peerDependencies: { jquery: string };
}

interface QualityBudgets {
  package: { files: number; packedBytes: number; unpackedBytes: number };
  cspPackage: { packedBytes: number; unpackedBytes: number };
  turboPackage: { packedBytes: number; unpackedBytes: number };
  bundles: Record<string, number>;
}

function readText(path: string): string {
  return readFileSync(resolve(path), "utf8");
}

function readJSON<T>(path: string): T {
  return JSON.parse(readText(path)) as T;
}

const baseline = readJSON<PublicBaseline>("quality/public-baseline.json");
const manifest = readJSON<PackageManifest>("package.json");
const budgets = readJSON<QualityBudgets>("config/quality-budgets.json");

function exportedNames(typeOnly: boolean): string[] {
  const source = ts.createSourceFile(
    "src/index.ts",
    readText("src/index.ts"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const names: string[] = [];
  for (const statement of source.statements) {
    if (
      !ts.isExportDeclaration(statement) ||
      !statement.exportClause ||
      !ts.isNamedExports(statement.exportClause)
    ) {
      continue;
    }
    for (const element of statement.exportClause.elements) {
      if (Boolean(statement.isTypeOnly || element.isTypeOnly) === typeOnly) {
        names.push(element.name.text);
      }
    }
  }
  return names.sort();
}

describe("public 0.1 baseline", () => {
  it("freezes the root, declaration, jQuery, UI, and action names", () => {
    expect(baseline.schema).toBe("jqstar-public-baseline/1");
    expect(baseline.version).toBe($.star.version);
    expect(baseline.runtime.autoInstall).toBe(true);
    expect(typeof $.fn.star).toBe("function");
    expect(typeof $.star).toBe("object");
    expect(Object.keys(publicRuntime).sort()).toEqual(baseline.runtime.rootExports);
    expect(exportedNames(false)).toEqual(baseline.runtime.rootExports);
    expect(exportedNames(true)).toEqual(baseline.runtime.typeExports);
    expect(Object.keys($.star).sort()).toEqual(baseline.runtime.starStaticMembers);
    expect(Object.keys($.star.ui).sort()).toEqual(baseline.runtime.uiMembers);
    expect(kernelForDocument(document)?.actions.names()).toEqual(
      baseline.runtime.registeredActions,
    );
    expect(baseline.runtime.jqueryInstanceMembers).toEqual(["star"]);
    expect(baseline.runtime.jqueryStaticMembers).toEqual(["star"]);
    expect(baseline.runtime.pluginCommands).toEqual(["destroy", "instance", "refresh", "state"]);
    expect(publicRuntime.StarProtocolBodyOwnershipError).toBeInstanceOf(Function);
    expect(publicRuntime.StarProtocolSelectionError).toBeInstanceOf(Function);
    expect(publicRuntime.StarProtocolValidationError).toBeInstanceOf(Function);
  });

  it("binds every declared type to the reviewed API report", () => {
    const report = readText(baseline.evidence.apiReport);
    for (const name of baseline.runtime.typeExports) {
      expect(report, `API report is missing ${name}`).toMatch(
        new RegExp(`(?:interface|type) ${name.replaceAll("$", "\\$")}\\b`),
      );
    }
  });

  it("keeps directive, modifier, and expression names in source and public documentation", () => {
    const source = readText("src/declarative.ts");
    const expression = readText("src/expression.ts");
    const readme = readText("README.md");

    expect(baseline.declarative.extensionDirectiveNamespace).toBe("data-<plugin>:*");
    expect(baseline.declarative.extensionHelperNamespace).toBe("<plugin>.<helper>");

    for (const form of baseline.declarative.directiveForms) {
      const stem = form.replace("*", "");
      expect(`${source}\n${readme}`, `missing directive ${form}`).toContain(stem);
    }
    for (const modifier of baseline.declarative.eventModifiers) {
      expect(`${source}\n${readme}`, `missing event modifier ${modifier}`).toContain(modifier);
    }
    for (const name of baseline.declarative.expressionScope.filter(
      (name) => name !== "$<signal>",
    )) {
      expect(`${expression}\n${readme}`, `missing expression name ${name}`).toContain(name);
    }
  });

  it("matches the published package, support matrix, and measured budget envelope", () => {
    expect(manifest.version).toBe(baseline.version);
    expect(Object.keys(manifest.exports).sort()).toEqual(baseline.package.exports);
    expect(manifest.peerDependencies.jquery).toBe(baseline.support.jquery);
    expect(manifest.engines.node).toBe(baseline.support.node);
    expect(baseline.package.observedArtifact.files).toBeLessThanOrEqual(budgets.package.files);
    expect(baseline.package.observedArtifact.packedBytes).toBeLessThanOrEqual(
      budgets.package.packedBytes +
        budgets.cspPackage.packedBytes +
        budgets.turboPackage.packedBytes,
    );
    expect(baseline.package.observedArtifact.unpackedBytes).toBeLessThanOrEqual(
      budgets.package.unpackedBytes +
        budgets.cspPackage.unpackedBytes +
        budgets.turboPackage.unpackedBytes,
    );
    for (const [path, bytes] of Object.entries(baseline.package.bundleBytes)) {
      expect(bytes, path).toBeLessThanOrEqual(budgets.bundles[path]!);
    }
    expect(readText("vite.umd.config.ts")).toContain(`name: "${baseline.runtime.umdGlobal}"`);
    expect(baseline.support.browsers).toEqual(["chromium", "firefox", "webkit"]);
    expect(baseline.support.moduleFormats).toEqual(["browser-module", "commonjs", "esm", "umd"]);
  });

  it("classifies the complete baseline without silently publishing later subpaths", () => {
    expect(baseline.stability).toBe("stable-for-0.x");
    expect(baseline.deprecated).toEqual([]);
    expect(baseline.policy.minimumDeprecationMinorReleases).toBeGreaterThanOrEqual(1);
    expect(baseline.policy.errorCodes).toBe("not-published-in-0.1");
    expect(baseline.policy.pluginApi).toBe(publicRuntime.STAR_PLUGIN_API_VERSION);
    expect(baseline.backend.request).toMatchObject({
      defaultProfile: "core.datastar",
      genericProfile: "explicit-json-html-without-datastar",
      datastarProfile: "signal-json-html-sse-compatible",
      profileSelection: "pre-middleware-immutable",
      responseBodyOwnership: "one-profile-one-lease",
    });
    for (const subpath of baseline.internal.filter((name) => name.startsWith("jquery-star/"))) {
      expect(Object.keys(manifest.exports)).not.toContain(subpath.slice("jquery-star".length));
    }
    for (const testPath of baseline.evidence.behaviorTests) {
      expect(readText(testPath).length, testPath).toBeGreaterThan(0);
    }
  });
});

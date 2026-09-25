// @vitest-environment node
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it, vi } from "vitest";
import { checkEntrypoints, evaluate, migrateSummary } from "../bin/doctor/rules.mjs";

const rules = JSON.parse(await readFile("bin/doctor/compatibility.json", "utf8"));
const options = { nodeVersion: "26.8.1", today: "2026-09-24" };

function inspect(discovery) {
  const diagnostics = [];
  evaluate(
    {
      roots: [],
      packages: [],
      config: { output: "components", configVersion: 1 },
      ...discovery,
    },
    rules,
    options,
    (code, detail) => diagnostics.push({ code, ...detail }),
  );
  return diagnostics;
}

function ownership(configuration = { output: "components" }) {
  return {
    schema: "jqstar-registry-ownership/1",
    package: "jquery-star",
    version: "1.1.0",
    configuration,
  };
}

function summary(categories = []) {
  return {
    schema: "jqstar-migrate-summary/1",
    jqueryVersion: "3.7.1",
    migrateVersion: "3.5.2",
    categories,
  };
}

function installedPackage(overrides = {}) {
  return {
    kind: "installed",
    name: "jquery-star",
    requestedName: "jquery-star",
    version: "1.1.0",
    location: "node_modules/jquery-star",
    path: "node_modules/jquery-star/package.json",
    metadata: {
      name: "jquery-star",
      exports: { "./core": { import: { default: "./dist/core.js" } } },
    },
    ...overrides,
  };
}

async function inspectSummary(value) {
  const diagnostics = [];
  const calls = [];
  await migrateSummary(
    {
      async json(...args) {
        calls.push(args);
        return value;
      },
    },
    "migrate-summary.json",
    (code, detail) => diagnostics.push({ code, ...detail }),
  );
  expect(calls).toEqual([["migrate-summary.json", true]]);
  return diagnostics;
}

describe("doctor metadata rules", () => {
  it("distinguishes incompatible and malformed declared package ranges", () => {
    const diagnostics = inspect({
      packages: [
        { kind: "manifest", name: "jquery-star", declared: "^0.1.0", path: "package.json" },
        { kind: "manifest", name: "htmx.org", declared: "not-a-range", path: "package.json" },
      ],
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "JQS_DECLARED_RANGE", package: "jquery-star" }),
        expect.objectContaining({ code: "JQS_METADATA_UNKNOWN", package: "htmx.org" }),
      ]),
    );
  });

  it("reports duplicate installed peers and incompatible plugin metadata", () => {
    const jquery = {
      kind: "installed",
      name: "jquery",
      requestedName: "jquery",
      version: "4.0.0",
      location: "node_modules/jquery",
      path: "node_modules/jquery/package.json",
      metadata: { name: "jquery" },
    };
    const diagnostics = inspect({
      packages: [
        jquery,
        { ...jquery, location: "packages/app/node_modules/jquery" },
        {
          kind: "installed",
          name: "example-plugin",
          requestedName: "example-plugin",
          version: "1.0.0",
          location: "node_modules/example-plugin",
          path: "node_modules/example-plugin/package.json",
          metadata: {
            name: "example-plugin",
            peerDependencies: { jquery: "^1.0.0" },
            jqstar: { pluginApiVersion: "^9.0.0" },
          },
        },
      ],
    });
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: "JQS_PACKAGE_DUPLICATE", package: "jquery" }),
        expect.objectContaining({ code: "JQS_PEER_INCOMPATIBLE", package: "example-plugin" }),
        expect.objectContaining({ code: "JQS_PLUGIN_API", package: "example-plugin" }),
      ]),
    );
  });

  it("checks exported entrypoint files without importing installed application code", async () => {
    const installed = installedPackage();
    const discovery = {
      roots: [{ path: "", manifest: { dependencies: { "jquery-star": "^1.1.0" } } }],
      packages: [installed],
    };
    const reader = { path: vi.fn(async () => resolve("package.json")) };
    const diagnostics = [];
    await checkEntrypoints(
      reader,
      discovery,
      rules,
      { entrypoints: ["jquery-star/core"], format: "esm" },
      (code, detail) => diagnostics.push({ code, ...detail }),
    );
    expect(reader.path).toHaveBeenCalledWith("node_modules/jquery-star/dist/core.js");
    expect(diagnostics.map(({ code }) => code)).toEqual(["JQS_ENTRYPOINT_USE"]);

    const missing = [];
    await checkEntrypoints(
      { path: async () => undefined },
      discovery,
      rules,
      { entrypoints: ["jquery-star/core"], format: "esm" },
      (code, detail) => missing.push({ code, ...detail }),
    );
    expect(missing.map(({ code }) => code)).toEqual([
      "JQS_ENTRYPOINT_USE",
      "JQS_ARTIFACT_IDENTITY",
    ]);
  });

  it("rejects unavailable entrypoint formats and unsafe export targets", async () => {
    const installed = installedPackage({
      metadata: {
        name: "jquery-star",
        exports: { "./core": { import: { default: "/outside.js" } } },
      },
    });
    const discovery = {
      roots: [{ path: "", manifest: { dependencies: { "jquery-star": "^1.1.0" } } }],
      packages: [installed],
    };
    const diagnostics = [];
    await checkEntrypoints(
      {
        path: () => {
          throw new Error("unexpected read");
        },
      },
      discovery,
      rules,
      { entrypoints: ["jquery-star/core"], format: "umd" },
      (code) => diagnostics.push(code),
    );
    expect(diagnostics).toEqual(["JQS_ENTRYPOINT_UNAVAILABLE"]);

    diagnostics.length = 0;
    await checkEntrypoints(
      {
        path: () => {
          throw new Error("unexpected read");
        },
      },
      discovery,
      rules,
      { entrypoints: ["jquery-star/core"], format: "esm" },
      (code) => diagnostics.push(code),
    );
    expect(diagnostics).toEqual(["JQS_ENTRYPOINT_USE", "JQS_ENTRYPOINT_UNAVAILABLE"]);
  });

  it("reports legacy configuration and mismatched registry ownership without revealing values", () => {
    const diagnostics = inspect({
      config: { output: "components" },
      ownership: ownership({ output: "other-components" }),
    });
    expect(diagnostics.map(({ code }) => code)).toEqual([
      "JQS_CONFIG_VERSION",
      "JQS_OWNERSHIP_MISMATCH",
      "JQS_RUNTIME_UNKNOWN",
    ]);
    expect(JSON.stringify(diagnostics)).not.toContain("other-components");
  });

  it("accepts current configuration and matching ownership", () => {
    const diagnostics = inspect({ ownership: ownership() });
    expect(diagnostics.map(({ code }) => code)).toEqual(["JQS_RUNTIME_UNKNOWN"]);
  });

  it("reports unsupported configuration versions without treating them as current", () => {
    const diagnostics = inspect({ config: { output: "components", configVersion: 2 } });
    expect(diagnostics.map(({ code }) => code)).toEqual([
      "JQS_CONFIG_UNSUPPORTED",
      "JQS_RUNTIME_UNKNOWN",
    ]);
  });

  it.each([
    ["wrong schema", (value) => (value.schema = "other/1")],
    ["wrong package", (value) => (value.package = "other")],
    ["invalid version", (value) => (value.version = "not-semver")],
    ["missing configuration", (value) => delete value.configuration],
    ["extra ownership field", (value) => (value.secret = "private")],
    ["extra configuration field", (value) => (value.configuration.secret = "private")],
  ])("rejects ownership metadata with %s", (_label, change) => {
    const value = ownership();
    change(value);
    expect(() => inspect({ ownership: value })).toThrowError("JQS_INPUT_INVALID");
  });

  it("rejects an ownership configuration that escapes the project", () => {
    expect(() => inspect({ ownership: ownership({ output: "../outside" }) })).toThrowError(
      "JQS_PATH_UNSAFE",
    );
  });

  it("reads a migration summary as required input and reports only positive category counts", async () => {
    const diagnostics = await inspectSummary(
      summary([
        { category: "api", count: 0 },
        { category: "event", count: 2 },
        { category: "css", count: 1 },
      ]),
    );
    expect(diagnostics).toEqual([
      {
        code: "JQS_MIGRATE_SUMMARY",
        path: "migrate-summary.json",
        kind: "user-summary",
        observed: "event: 2",
      },
      {
        code: "JQS_MIGRATE_SUMMARY",
        path: "migrate-summary.json",
        kind: "user-summary",
        observed: "css: 1",
      },
    ]);
  });

  it("accepts every documented migration category and the maximum count", async () => {
    const categories = ["api", "event", "selector", "ajax", "css", "data", "other"].map(
      (category) => ({ category, count: 1_000_000 }),
    );
    const diagnostics = await inspectSummary(summary(categories));
    expect(diagnostics).toHaveLength(categories.length);
    expect(diagnostics.map(({ observed }) => observed)).toEqual(
      categories.map(({ category, count }) => `${category}: ${count}`),
    );
  });

  it("skips migration summary reading when no summary path was supplied", async () => {
    const reader = {
      json: () => {
        throw new Error("unexpected read");
      },
    };
    await expect(migrateSummary(reader, undefined, () => {})).resolves.toBeUndefined();
  });

  it.each([
    ["schema", (value) => (value.schema = "other/1")],
    ["jQuery version", (value) => (value.jqueryVersion = "unknown")],
    ["Migrate version", (value) => (value.migrateVersion = "unknown")],
    ["category list", (value) => (value.categories = {})],
    ["extra top-level field", (value) => (value.secret = "private")],
    ["unknown category", (value) => (value.categories = [{ category: "security", count: 1 }])],
    [
      "duplicate category",
      (value) =>
        (value.categories = [
          { category: "api", count: 1 },
          { category: "api", count: 2 },
        ]),
    ],
    ["negative count", (value) => (value.categories = [{ category: "api", count: -1 }])],
    ["fractional count", (value) => (value.categories = [{ category: "api", count: 0.5 }])],
    ["large count", (value) => (value.categories = [{ category: "api", count: 1_000_001 }])],
    [
      "extra category field",
      (value) => (value.categories = [{ category: "api", count: 1, secret: true }]),
    ],
  ])("rejects a migration summary with %s", async (_label, change) => {
    const value = summary();
    change(value);
    await expect(inspectSummary(value)).rejects.toMatchObject({
      code: "JQS_INPUT_INVALID",
      path: "migrate-summary.json",
    });
  });
});

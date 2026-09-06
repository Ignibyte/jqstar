// @vitest-environment node
import { mkdtemp, mkdir, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { packageReport, runDoctor } from "../bin/doctor/index.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

const rules = JSON.parse(await readFile("bin/doctor/compatibility.json", "utf8"));
const schema = JSON.parse(await readFile("schema/doctor.schema.json", "utf8"));
const validate = createSchemaValidator(schema);
const roots = [];

async function write(root, path, value) {
  await mkdir(dirname(join(root, path)), { recursive: true });
  await writeFile(join(root, path), typeof value === "string" ? value : JSON.stringify(value));
}

async function project(installed = true) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "jqstar-doctor-test-")));
  roots.push(root);
  await write(root, "package.json", {
    name: "application",
    dependencies: { jquery: "^4.0.0", "jquery-star": "^1.1.0" },
  });
  await write(root, "jquery-star.json", { output: "components/jquery-star", configVersion: 1 });
  if (installed) {
    await write(root, "node_modules/jquery/package.json", { name: "jquery", version: "4.0.0" });
    await write(root, "node_modules/jquery-star/package.json", {
      name: "jquery-star",
      version: "1.1.0",
      peerDependencies: { jquery: ">=4.0.0 <5" },
      main: "./index.cjs",
      exports: {
        ".": { import: "./index.js", require: "./index.cjs" },
        "./core": { import: "./core.js" },
      },
      scripts: { postinstall: "exit 99" },
    });
    for (const file of ["index.js", "index.cjs", "core.js"])
      await write(
        root,
        `node_modules/jquery-star/${file}`,
        'throw new Error("Project code must never execute");',
      );
  }
  return root;
}

async function report(root, overrides = {}, ruleOverrides = rules) {
  const result = await packageReport(
    { cwd: root, entrypoints: [], format: "esm", ...overrides },
    ruleOverrides,
    { today: "2026-09-06", nodeVersion: "24.3.0" },
  );
  expect(validate(result), JSON.stringify(validate.errors)).toBe(true);
  return result;
}

function codes(result) {
  return result.diagnostics.map((entry) => entry.code);
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("offline package doctor", () => {
  it("distinguishes unsupported Node from expired rules and release-tooling warnings", async () => {
    const root = await project();
    await write(root, "package.json", {
      name: "application",
      packageManager: "npm@10.0.0",
      dependencies: { jquery: "^4.0.0", "jquery-star": "^1.1.0" },
    });
    const options = { cwd: root, entrypoints: [], format: "esm" };
    const warning = await packageReport(options, rules, {
      today: "2028-01-01",
      nodeVersion: "24.3.0",
    });
    expect(validate(warning)).toBe(true);
    expect(warning.exitCode).toBe(0);
    expect(codes(warning)).toEqual(
      expect.arrayContaining(["JQS_RULES_EXPIRED", "JQS_TOOLING_RANGE"]),
    );
    const incompatible = await packageReport(options, rules, {
      today: "2026-09-06",
      nodeVersion: "23.0.0",
    });
    expect(incompatible.exitCode).toBe(1);
    expect(codes(incompatible)).toContain("JQS_NODE_INCOMPATIBLE");
  });

  it("keeps manifest, lock, installed, and unknown runtime ecosystem evidence distinct", async () => {
    const root = await project();
    const packages = {
      "node_modules/jquery": { version: "4.0.0" },
      "node_modules/jquery-star": { version: "1.1.0" },
    };
    const dependencies = { jquery: "^4.0.0", "jquery-star": "^1.1.0" };
    for (const [name, version] of [
      ["jquery-ui", "1.14.2"],
      ["jquery-mobile", "1.4.5"],
      ["jquery-migrate", "4.0.2"],
    ]) {
      dependencies[name] = version;
      packages[`node_modules/${name}`] = { version };
      await write(root, `node_modules/${name}/package.json`, { name, version });
    }
    await write(root, "package.json", { name: "application", dependencies });
    await write(root, "package-lock.json", { lockfileVersion: 3, packages });
    const result = await report(root);
    expect(result.exitCode).toBe(0);
    for (const code of ["JQS_JQUERY_UI", "JQS_JQUERY_MOBILE", "JQS_JQUERY_MIGRATE"])
      expect(
        result.diagnostics
          .filter((entry) => entry.code === code)
          .map((entry) => entry.evidence)
          .sort(),
      ).toEqual(["installed", "lock", "manifest"]);
    expect(codes(result)).toContain("JQS_RUNTIME_UNKNOWN");
  });
  it("reports compatible metadata deterministically without executing installed modules", async () => {
    const root = await project();
    const first = await report(root, { entrypoints: ["jquery-star", "./core"] });
    expect(first).toEqual(await report(root, { entrypoints: ["jquery-star", "./core"] }));
    expect(first.exitCode).toBe(0);
    expect(first.complete).toBe(true);
    expect(first.summary.errors).toBe(0);
    expect(codes(first)).toContain("JQS_RUNTIME_UNKNOWN");
    expect(codes(first).filter((code) => code === "JQS_ENTRYPOINT_USE")).toHaveLength(2);
  });

  it("distinguishes incompatible direct resolution from a separate old transitive jQuery", async () => {
    const root = await project();
    await write(root, "node_modules/legacy/package.json", {
      name: "legacy",
      version: "1.0.0",
      peerDependencies: { jquery: "^3.7.0" },
    });
    await write(root, "node_modules/legacy/node_modules/jquery/package.json", {
      name: "jquery",
      version: "3.7.1",
    });
    const compatible = await report(root);
    expect(compatible.exitCode).toBe(0);
    expect(codes(compatible)).toContain("JQS_PACKAGE_DUPLICATE");
    await write(root, "node_modules/jquery/package.json", { name: "jquery", version: "3.7.1" });
    const incompatible = await report(root);
    expect(incompatible.exitCode).toBe(1);
    expect(codes(incompatible)).toContain("JQS_PACKAGE_VERSION");
    expect(codes(incompatible)).toContain("JQS_PEER_INCOMPATIBLE");
  });

  it("resolves workspace-local packages before hoisted peers", async () => {
    const root = await project();
    await write(root, "package.json", { name: "workspace", workspaces: ["packages/*"] });
    for (const name of ["a", "b"])
      await write(root, `packages/${name}/package.json`, {
        name,
        dependencies: { jquery: "*", "jquery-star": "^1.1.0" },
      });
    await write(root, "packages/b/node_modules/jquery/package.json", {
      name: "jquery",
      version: "3.7.1",
    });
    const result = await report(root);
    expect(result.scan.workspaceManifests).toBe(3);
    expect(
      result.diagnostics
        .filter((entry) => entry.code === "JQS_PACKAGE_VERSION")
        .map((entry) => entry.path),
    ).toEqual(["packages/b/node_modules/jquery/package.json"]);
  });

  it.each([2, 3])(
    "uses npm lockfile v%s without node_modules and labels resolved evidence",
    async (lockfileVersion) => {
      const root = await project(false);
      await write(root, "package-lock.json", {
        lockfileVersion,
        packages: {
          "": { name: "application" },
          "node_modules/jquery": { version: "3.7.1" },
          "node_modules/jquery-star": { version: "1.1.0" },
        },
      });
      const result = await report(root);
      expect(result.exitCode).toBe(1);
      expect(
        result.diagnostics.find((entry) => entry.code === "JQS_PACKAGE_VERSION"),
      ).toMatchObject({ package: "jquery", evidence: "lock", observed: "3.7.1" });
    },
  );

  it("uses pnpm importer resolution and handles a shared symlinked store", async () => {
    const root = await project(false);
    await write(
      root,
      "pnpm-lock.yaml",
      `lockfileVersion: '9.0'
importers:
  .:
    dependencies:
      jquery: {specifier: ^4.0.0, version: 4.0.0}
      jquery-star: {specifier: ^1.1.0, version: 1.1.0(jquery@4.0.0)}
packages:
  jquery@4.0.0: {}
  jquery@3.7.1: {}
  jquery-star@1.1.0: {}
snapshots: {}
`,
    );
    const locked = await report(root);
    expect(locked.exitCode).toBe(0);
    expect(codes(locked)).not.toContain("JQS_PACKAGE_VERSION");
    await write(root, "node_modules/.pnpm/jquery@4.0.0/node_modules/jquery/package.json", {
      name: "jquery",
      version: "4.0.0",
    });
    await symlink(".pnpm/jquery@4.0.0/node_modules/jquery", join(root, "node_modules/jquery"));
    const installed = await report(root);
    expect(installed.exitCode).toBe(0);
    expect(installed.scan.packageRecords).toBe(locked.scan.packageRecords + 1);
  });

  it.each([
    [
      "Classic",
      '# yarn lockfile v1\n\njquery@^4.0.0:\n  version "4.0.0"\n\njquery-star@^1.1.0:\n  version "1.1.0"\n',
    ],
    [
      "modern",
      '__metadata:\n  version: 8\n"jquery@npm:^4.0.0":\n  version: 4.0.0\n"jquery-star@npm:^1.1.0":\n  version: 1.1.0\n',
    ],
  ])("reads Yarn %s metadata without evaluating PnP", async (_name, lock) => {
    const root = await project(false);
    await write(root, "yarn.lock", lock);
    await write(root, ".pnp.cjs", 'throw new Error("private-doctor-canary");');
    const result = await report(root);
    expect(result.exitCode).toBe(0);
    expect(result.scan.packageRecords).toBe(4);
    expect(codes(result)).not.toContain("JQS_METADATA_UNKNOWN");
  });

  it("checks explicit formats, missing artifacts, plugin metadata, and ecosystem evidence", async () => {
    const root = await project();
    await write(root, "node_modules/plugin/package.json", {
      name: "plugin",
      version: "1.0.0",
      jqstar: { pluginApiVersion: "^9.0.0" },
    });
    await write(root, "node_modules/jquery-mobile/package.json", {
      name: "jquery-mobile",
      version: "1.4.5",
    });
    await rm(join(root, "node_modules/jquery-star/core.js"));
    const result = await report(root, { entrypoints: ["./core", "./missing"] });
    expect(result.exitCode).toBe(1);
    expect(codes(result)).toEqual(
      expect.arrayContaining([
        "JQS_PLUGIN_API",
        "JQS_JQUERY_MOBILE",
        "JQS_ARTIFACT_IDENTITY",
        "JQS_ENTRYPOINT_UNAVAILABLE",
      ]),
    );
    const umd = await report(root, { entrypoints: ["./core"], format: "umd" });
    expect(codes(umd)).toContain("JQS_ENTRYPOINT_UNAVAILABLE");
  });

  it("reports only bounded validated Migrate categories and preserves configuration secrets", async () => {
    const root = await project();
    await write(root, "jquery-star.json", {
      output: "components/jquery-star",
      registry: "private-doctor-canary",
    });
    await write(root, "summary.json", {
      schema: "jqstar-migrate-summary/1",
      jqueryVersion: "4.0.0",
      migrateVersion: "4.0.2",
      categories: [{ category: "event", count: 3 }],
    });
    const result = await report(root, { migrateSummary: "summary.json" });
    expect(codes(result)).toContain("JQS_MIGRATE_SUMMARY");
    expect(JSON.stringify(result)).not.toContain("private-doctor-canary");
    await write(root, "summary.json", {
      schema: "jqstar-migrate-summary/1",
      jqueryVersion: "4.0.0",
      migrateVersion: "4.0.2",
      categories: [{ category: "private-doctor-canary", count: 3 }],
    });
    const invalid = await report(root, { migrateSummary: "summary.json" });
    expect(invalid.exitCode).toBe(2);
    expect(JSON.stringify(invalid)).not.toContain("private-doctor-canary");
  });

  it("refuses malformed data, YAML aliases, outside symlinks, and unsupported formats without guessing", async () => {
    const root = await project();
    await write(
      root,
      "pnpm-lock.yaml",
      "lockfileVersion: '9.0'\npackages: &secret {private-doctor-canary: {}}\nimporters: *secret\n",
    );
    const aliased = await report(root);
    expect(aliased.exitCode).toBe(2);
    expect(JSON.stringify(aliased)).not.toContain("private-doctor-canary");
    await write(root, "pnpm-lock.yaml", "lockfileVersion: '99.0'\npackages: {}\n");
    expect(codes(await report(root))).toContain("JQS_METADATA_UNKNOWN");
    const outside = await project();
    await rm(join(root, "package.json"));
    await symlink(join(outside, "package.json"), join(root, "package.json"));
    const escaped = await report(root);
    expect(escaped.exitCode).toBe(2);
    expect(codes(escaped)).toContain("JQS_PATH_UNSAFE");
  });

  it("stops at file and package budgets with an explicit incomplete result", async () => {
    const root = await project();
    for (const limits of [{ packages: 2 }, { fileBytes: 5 }]) {
      const limited = await report(root, {}, { ...rules, limits: { ...rules.limits, ...limits } });
      expect(limited.complete).toBe(false);
      expect(limited.exitCode).toBe(0);
      expect(codes(limited)).toContain("JQS_SCAN_TRUNCATED");
    }
  });

  it("keeps human, JSON, and quiet exit contracts including invalid usage", async () => {
    const root = await project();
    await write(root, "node_modules/jquery/package.json", { name: "jquery", version: "3.7.1" });
    for (const flags of [[], ["--json"], ["--quiet"]]) {
      let stdout = "";
      let stderr = "";
      const code = await runDoctor(["doctor", "--packages", "--cwd", root, ...flags], {
        stdout: {
          write: (value) => {
            stdout += value;
          },
        },
        stderr: {
          write: (value) => {
            stderr += value;
          },
        },
      });
      expect(code).toBe(1);
      expect(stderr).toBe("");
      if (flags.includes("--json")) expect(validate(JSON.parse(stdout))).toBe(true);
      if (flags.includes("--quiet")) expect(stdout).toBe("");
    }
    let stdout = "";
    expect(
      await runDoctor(["doctor", "--packages", "--json", "--invalid"], {
        stdout: {
          write: (value) => {
            stdout += value;
          },
        },
        stderr: { write() {} },
      }),
    ).toBe(2);
    expect(validate(JSON.parse(stdout))).toBe(true);
  });

  it("bounds importer counts, total bytes, diagnostics, elapsed time, and nested data", async () => {
    const root = await project();
    for (const limits of [{ totalBytes: 5 }, { diagnostics: 1 }, { elapsedMs: -1 }]) {
      const result = await report(root, {}, { ...rules, limits: { ...rules.limits, ...limits } });
      expect(result.complete).toBe(false);
      expect(codes(result)).toContain("JQS_SCAN_TRUNCATED");
      expect(result.diagnostics.length).toBeLessThanOrEqual(
        limits.diagnostics ?? rules.limits.diagnostics,
      );
    }
    await write(
      root,
      "pnpm-lock.yaml",
      "lockfileVersion: '9.0'\npackages: {}\nimporters: {a: {}, b: {}}\n",
    );
    const importers = await report(
      root,
      {},
      { ...rules, limits: { ...rules.limits, workspaces: 1 } },
    );
    expect(importers.complete).toBe(false);
    expect(codes(importers)).toContain("JQS_SCAN_TRUNCATED");
    await rm(join(root, "pnpm-lock.yaml"));
    let nested = {};
    for (let i = 0; i < 34; i++) nested = { child: nested };
    await write(root, "package.json", nested);
    expect(codes(await report(root))).toContain("JQS_SCAN_TRUNCATED");
  });

  it("rejects invalid UTF-8 and treats directory export targets as invalid artifacts", async () => {
    const root = await project();
    await rm(join(root, "node_modules/jquery-star/core.js"));
    await mkdir(join(root, "node_modules/jquery-star/core.js"));
    expect(codes(await report(root, { entrypoints: ["./core"] }))).toContain(
      "JQS_ARTIFACT_IDENTITY",
    );
    await writeFile(
      join(root, "package.json"),
      Buffer.from([123, 34, 120, 34, 58, 34, 255, 34, 125]),
    );
    const invalid = await report(root);
    expect(invalid.exitCode).toBe(2);
    expect(codes(invalid)).toContain("JQS_INPUT_INVALID");
  });

  it("checks supplied ownership assertions without claiming recipe content identity", async () => {
    const root = await project();
    const assertion = {
      schema: "jqstar-registry-ownership/1",
      package: "jquery-star",
      version: "1.0.0",
      configuration: { output: "components/jquery-star" },
    };
    await write(root, ".jqstar-ownership.json", assertion);
    expect(codes(await report(root))).not.toContain("JQS_OWNERSHIP_MISMATCH");
    await write(root, ".jqstar-ownership.json", {
      ...assertion,
      configuration: { output: "different" },
    });
    expect(codes(await report(root))).toContain("JQS_OWNERSHIP_MISMATCH");
    await write(root, ".jqstar-ownership.json", { ...assertion, secret: "private-doctor-canary" });
    const invalid = await report(root);
    expect(invalid.exitCode).toBe(2);
    expect(JSON.stringify(invalid)).not.toContain("private-doctor-canary");
  });

  it("deduplicates workspace cycles and repeated entrypoints without consuming diagnostic capacity", async () => {
    const root = await project();
    await write(root, "package.json", {
      name: "application",
      workspaces: ["cycle"],
      dependencies: { "jquery-star": "^1.1.0", jquery: "^4" },
    });
    await symlink(root, join(root, "cycle"));
    const result = await report(
      root,
      { entrypoints: ["./core", "./core"] },
      { ...rules, limits: { ...rules.limits, diagnostics: 4 } },
    );
    expect(result.complete).toBe(true);
    expect(result.scan.workspaceManifests).toBe(1);
    expect(codes(result).filter((code) => code === "JQS_ENTRYPOINT_USE")).toHaveLength(1);
  });
});

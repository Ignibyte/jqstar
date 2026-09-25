// @vitest-environment node
import { mkdir, mkdtemp, readFile, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { MetadataReader } from "../bin/doctor/data.mjs";
import { discover } from "../bin/doctor/discovery.mjs";

const limits = JSON.parse(await readFile("bin/doctor/compatibility.json", "utf8")).limits;
const roots = [];

async function fixture(manifest = { name: "root" }) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "jqstar-doctor-discovery-")));
  roots.push(root);
  await write(root, "package.json", manifest);
  return root;
}

async function write(root, path, value) {
  const target = join(root, path);
  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, JSON.stringify(value));
}

async function scan(root, overrides = {}) {
  const diagnostics = [];
  const reader = new MetadataReader(root, { ...limits, ...overrides });
  const result = await discover(reader, (code, detail) => diagnostics.push({ code, ...detail }));
  return { result, diagnostics, reader };
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("doctor package discovery", () => {
  it("expands workspace manifests and ignores hidden, dependency, and invalid package names", async () => {
    const root = await fixture({
      name: "root",
      workspaces: ["packages/*"],
      dependencies: { jquery: "^3.7.1", "BAD NAME": "*" },
      peerDependencies: { "jquery-star": "^1.1.0" },
    });
    await write(root, "packages/app/package.json", {
      name: "app",
      devDependencies: { plugin: "1" },
      optionalDependencies: { optional: "2" },
    });
    await write(root, "packages/.hidden/package.json", { dependencies: { hidden: "1" } });
    await write(root, "packages/node_modules/package.json", {
      dependencies: { accidental: "1" },
    });

    const { result, diagnostics, reader } = await scan(root);
    expect(result.roots.map(({ path }) => path)).toEqual(["", "packages/app"]);
    expect(
      result.packages.map(({ name, dependencyKind, path }) => ({
        name,
        dependencyKind,
        path,
      })),
    ).toEqual([
      { name: "jquery", dependencyKind: "dependencies", path: "package.json" },
      { name: "jquery-star", dependencyKind: "peerDependencies", path: "package.json" },
      { name: "plugin", dependencyKind: "devDependencies", path: "packages/app/package.json" },
      {
        name: "optional",
        dependencyKind: "optionalDependencies",
        path: "packages/app/package.json",
      },
    ]);
    expect(reader.workspaceManifests).toBe(2);
    expect(reader.packageRecords).toBe(4);
    expect(diagnostics).toEqual([]);
  });

  it("reads pnpm workspaces and reports unsupported and duplicate patterns", async () => {
    const root = await fixture({
      name: "root",
      workspaces: ["apps/*", "apps/{other}"],
    });
    await write(root, "apps/app/package.json", { name: "app" });
    await writeFile(join(root, "pnpm-workspace.yaml"), 'packages:\n  - "apps/*"\n');

    const { result, diagnostics } = await scan(root);
    expect(result.roots.map(({ path }) => path)).toEqual(["", "apps/app"]);
    expect(diagnostics).toEqual([
      { code: "JQS_METADATA_UNKNOWN", path: "package.json", kind: "unknown" },
      { code: "JQS_METADATA_UNKNOWN", path: "apps/app/package.json", kind: "unknown" },
    ]);
  });

  it.each([
    [{ workspaces: "apps/*" }, {}, "JQS_INPUT_INVALID"],
    [{ workspaces: null }, {}, "JQS_INPUT_INVALID"],
    [{ workspaces: [123] }, {}, "JQS_INPUT_INVALID"],
    [{ workspaces: ["apps/app"] }, { workspaceDepth: 1 }, "JQS_SCAN_TRUNCATED"],
    [{ workspaces: ["apps/app", "apps/other"] }, { workspaces: 1 }, "JQS_SCAN_TRUNCATED"],
  ])("rejects invalid workspace input and scan limits", async (manifest, overrides, code) => {
    const root = await fixture({ name: "root", ...manifest });
    await expect(scan(root, overrides)).rejects.toMatchObject({ code });
  });

  it("deduplicates installed aliases and includes scoped packages", async () => {
    const root = await fixture();
    await write(root, "node_modules/real/package.json", { name: "real", version: "1.0.0" });
    await symlink("real", join(root, "node_modules/alias"));
    await write(root, "node_modules/@scope/plugin/package.json", {
      name: "@scope/plugin",
      version: "2.0.0",
    });
    await write(root, "node_modules/.cache/package.json", { name: "hidden" });

    const { result } = await scan(root);
    const installed = result.packages.filter(({ kind }) => kind === "installed");
    expect(installed.map(({ name }) => name).sort()).toEqual(["@scope/plugin", "real"]);
    expect(installed.find(({ name }) => name === "real")).toMatchObject({
      requestedName: "alias",
      aliases: ["node_modules/alias", "node_modules/real"],
      location: "node_modules/real",
    });
  });
});

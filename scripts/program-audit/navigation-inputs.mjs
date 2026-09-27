import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { gzipSync } from "node:zlib";
import { navigationInputIdentity } from "../prepare-navigation-decision.mjs";
import { changedPaths, fingerprint, gitHead } from "../quality/lib/git-state.mjs";
import { createSchemaValidator } from "../quality/validate-json.mjs";
import { safeRelativePath, sameKeys, sha256 } from "./contracts.mjs";
import { deterministicJson, readAuditBinary, readAuditFile } from "./files.mjs";
import { reportSchemas } from "./reports.mjs";

export const navigationPreparation = ".git/jqstar/navigation-decision";
export const navigationEngines = Object.freeze(["chromium", "firefox", "webkit"]);
const candidates = [
  "browser-nojs",
  "browser",
  "turbo-8.0.21",
  "turbo-8.0.23",
  "htmx-2.0.0",
  "htmx-2.0.10",
];
const aliases = ["jquery", "turbo-8-0-21", "turbo-8-0-23", "htmx-2-0-0", "htmx-2-0-10"];
const reference = ({ path, sha256: digest, bytes }) => ({ path, sha256: digest, bytes });

export function navigationRows(contract) {
  sameKeys(
    contract.candidates.map(({ id }) => id),
    candidates,
    "Navigation candidates",
  );
  sameKeys(contract.browsers, navigationEngines, "Navigation browsers");
  sameKeys(
    contract.scenarios.map(({ id }) => id),
    Array.from({ length: 28 }, (_, index) => `NAV-${String(index + 1).padStart(2, "0")}`),
    "Navigation scenarios",
  );
  return contract.candidates.flatMap((candidate) =>
    (candidate.host === "browser" ? ["configured"] : ["default", "configured"]).flatMap(
      (configuration) =>
        navigationEngines.map((browser) => ({
          candidate: candidate.id,
          configuration,
          browser,
        })),
    ),
  );
}

// Expectations are the current source and root lock, never the build's own claims.
export function validateNavigationPreparation(prepared, currentInput, contract, lock, root) {
  assert(prepared.schema === "jqstar-navigation-build/1", "Unsupported navigation preparation");
  assert.deepEqual(
    prepared.input,
    currentInput,
    "Stale navigation preparation; prepare it separately",
  );
  assert.equal(navigationRows(contract).length, 30, "Navigation must execute thirty rows");
  assert.equal(
    prepared.assets,
    resolve(root, navigationPreparation, "assets"),
    "Unexpected navigation assets",
  );
  assert.equal(
    prepared.tarball.path,
    resolve(root, navigationPreparation, prepared.tarball.filename),
    "Unexpected navigation tarball path",
  );
  assert.match(prepared.tarball.filename, /^jquery-star-\d+\.\d+\.\d+-[a-f0-9]{64}\.tgz$/u);
  sameKeys(
    prepared.packages.map(({ alias }) => alias),
    aliases,
    "Navigation dependencies",
  );
  for (const item of prepared.packages) {
    const expected = lock.packages[`node_modules/${item.alias}`];
    const installed = prepared.installedPackages[`node_modules/${item.alias}`];
    assert(expected && installed, "Navigation dependency is missing from a lock");
    assert.equal(item.name, expected.name ?? item.alias, "Navigation dependency name differs");
    for (const field of ["version", "integrity"]) {
      assert.equal(item[field], expected[field], "Navigation dependency differs from root lock");
      assert.equal(installed[field], expected[field], "Navigation installed dependency differs");
    }
    assert.equal(item.license, expected.license, "Navigation license differs from root lock");
    assert.deepEqual(
      item.dependencies,
      expected.dependencies ?? {},
      "Navigation dependency graph differs",
    );
  }
  const installed = prepared.installedPackages["node_modules/jquery-star"];
  assert(
    installed && installed.link !== true && installed.integrity === prepared.tarball.integrity,
    "Navigation jQStar is not the installed tarball",
  );
  assert.equal(
    installed.resolved,
    `file:../${prepared.tarball.filename}`,
    "Navigation installed tarball path differs",
  );
  assert.equal(
    prepared.installedPackages[""].dependencies["jquery-star"],
    `file:${prepared.tarball.path}`,
    "Navigation requested tarball differs",
  );
  sameKeys(Object.keys(prepared.bundles), candidates, "Navigation bundles");
  for (const [id, bundle] of Object.entries(prepared.bundles)) {
    assert.equal(bundle.filename, `${id}.js`, "Unexpected navigation bundle filename");
    assert(Array.isArray(bundle.modules) && bundle.modules.length > 0, "Navigation graph is empty");
    sameKeys(bundle.modules, [...new Set(bundle.modules)], "Navigation graph modules");
    const consumer = `${navigationPreparation}/consumer`;
    assert(
      bundle.modules.some((path) => path.startsWith(`${consumer}/node_modules/jquery-star/dist/`)),
      "Navigation graph lacks installed jQStar",
    );
    for (const path of bundle.modules) {
      safeRelativePath(path);
      assert(
        path === `${consumer}/${id}.js` ||
          ["bootstrap.js", "host-corrections.js"].some(
            (file) => path === `test/fixtures/navigation-decision/${file}`,
          ) ||
          ["jquery-star/dist", ...aliases].some((name) =>
            path.startsWith(`${consumer}/node_modules/${name}/`),
          ),
        "Navigation graph resolves outside the installed consumer and reviewed fixtures",
      );
    }
  }
}

async function verifiedBytes(root, path) {
  const expected = await readAuditBinary(root, path);
  const bytes = await readFile(join(root, path));
  assert(
    bytes.length === expected.bytes && sha256(bytes) === expected.sha256,
    "Navigation binary changed while checking its secondary metrics",
  );
  return { reference: reference(expected), bytes };
}

export async function navigationSource(root) {
  return {
    commit: await gitHead(root),
    fingerprint: await fingerprint(root),
    mutableWorkspace: (await changedPaths(root)).length > 0,
  };
}

export async function loadNavigationInputs(root, artifactPath) {
  safeRelativePath(artifactPath);
  const source = await navigationSource(root);
  const inputs = [];
  async function json(path) {
    const file = await readAuditFile(root, path);
    inputs.push(reference(file));
    return JSON.parse(file.source);
  }
  const prepared = await json(`${navigationPreparation}/build.json`);
  const decision = await json("quality/navigation-decision.json");
  const schema = await json("schema/navigation-decision.schema.json");
  assert(createSchemaValidator(schema)(decision), "Invalid navigation decision");
  // The historical decision uses compact canonical JSON for its contract digest.
  const compact = JSON.stringify(JSON.parse(deterministicJson(decision.contract)));
  assert.equal(sha256(compact), decision.contractSha256, "Navigation contract digest differs");
  const pkg = await json("package.json");
  const lock = await json("package-lock.json");
  const fixture = await navigationInputIdentity();
  validateNavigationPreparation(prepared, fixture, decision.contract, lock, root);
  for (const expected of fixture.files) {
    const file = await readAuditFile(root, expected.path, { digest: expected.sha256 });
    if (!inputs.some(({ path }) => path === file.path)) inputs.push(reference(file));
  }
  assert.equal(
    basename(artifactPath),
    `${pkg.name}-${pkg.version}.tgz`,
    "Explicit ordinary candidate filename differs",
  );
  const ordinary = await verifiedBytes(root, artifactPath);
  const alias = await verifiedBytes(root, `${navigationPreparation}/${prepared.tarball.filename}`);
  assert.equal(
    ordinary.reference.sha256,
    alias.reference.sha256,
    "Prepared navigation and ordinary candidate tarballs differ",
  );
  assert.equal(
    alias.reference.sha256,
    prepared.tarball.sha256,
    "Navigation tarball digest differs",
  );
  assert.equal(
    alias.reference.bytes,
    prepared.tarball.packedBytes,
    "Navigation tarball byte count differs",
  );
  assert.equal(
    prepared.tarball.filename,
    `${pkg.name}-${pkg.version}-${alias.reference.sha256}.tgz`,
    "Navigation tarball alias differs",
  );
  assert.equal(
    `sha512-${createHash("sha512").update(alias.bytes).digest("base64")}`,
    prepared.tarball.integrity,
    "Navigation tarball integrity differs",
  );
  const assets = [];
  for (const bundle of Object.values(prepared.bundles)) {
    const asset = await verifiedBytes(root, `${navigationPreparation}/assets/${bundle.filename}`);
    assert.equal(asset.reference.sha256, bundle.sha256, "Navigation bundle digest differs");
    assert.equal(asset.reference.bytes, bundle.rawBytes, "Navigation bundle byte count differs");
    assert.equal(
      gzipSync(asset.bytes).length,
      bundle.gzipBytes,
      "Navigation compressed bundle size differs",
    );
    assets.push(asset.reference);
  }
  const schemas = {};
  for (const [kind, path] of Object.entries(reportSchemas))
    schemas[kind] = reference(await readAuditFile(root, path));
  const playwright = await json("node_modules/@playwright/test/package.json");
  assert.deepEqual(
    await navigationSource(root),
    source,
    "Source changed while freezing navigation",
  );
  return {
    source,
    inputs,
    schemas,
    assets,
    ordinaryArtifact: ordinary.reference,
    navigationArtifact: alias.reference,
    context: {
      contract: decision.contract,
      contractSha256: decision.contractSha256,
      fixtureSha256: fixture.sha256,
      environment: {
        node: process.version,
        platform: process.platform,
        arch: process.arch,
        playwright: playwright.version,
      },
      artifact: {
        filename: prepared.tarball.filename,
        sha256: prepared.tarball.sha256,
        integrity: prepared.tarball.integrity,
        packedBytes: prepared.tarball.packedBytes,
        unpackedBytes: prepared.tarball.unpackedBytes,
      },
      packages: prepared.packages,
      bundles: prepared.bundles,
    },
    rows: navigationRows(decision.contract),
  };
}

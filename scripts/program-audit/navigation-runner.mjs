import assert from "node:assert/strict";
import { copyFile, open } from "node:fs/promises";
import { basename, join, relative } from "node:path";
import { chromium, firefox, webkit } from "@playwright/test";
import { createNavigationDecisionServer } from "../../test/fixtures/navigation-decision/server.mjs";
import { runNavigationScenarios } from "../../test/fixtures/navigation-decision/driver.mjs";
import { withOwnedTemporaryDirectory } from "../quality/lib/owned-temporary-directory.mjs";
import { sameKeys, sha256 } from "./contracts.mjs";
import { deterministicJson, readAuditBinary } from "./files.mjs";
import { loadNavigationInputs, navigationEngines } from "./navigation-inputs.mjs";

const engines = { chromium, firefox, webkit };
export const navigationTimeoutMs = 3_600_000;

export async function writeNavigationRecord(root, directory, name, value, text = false) {
  assert(/^[a-z][a-z0-9-]*\.(?:json|log)$/u.test(name), "Invalid navigation output name");
  const source = text ? value : deterministicJson(value);
  assert(
    typeof source === "string" && Buffer.byteLength(source) <= 32 * 1024 * 1024,
    "Navigation output exceeds its bound",
  );
  const path = join(directory, name);
  const handle = await open(path, "wx", 0o600);
  try {
    await handle.writeFile(source, "utf8");
    await handle.sync();
    await handle.chmod(0o444);
  } finally {
    await handle.close();
  }
  return {
    path: relative(root, path).split("\\").join("/"),
    sha256: sha256(source),
    bytes: Buffer.byteLength(source),
  };
}

export async function navigationBrowserVersions() {
  const versions = {};
  for (const engine of navigationEngines) {
    const browser = await engines[engine].launch();
    try {
      versions[engine] = browser.version();
    } finally {
      await browser.close();
    }
  }
  return versions;
}

export function assertNavigationProcess(result) {
  assert(
    result.exitCode === 0 &&
      result.signal === null &&
      result.timedOut === false &&
      result.spawnError === null,
    "Navigation process failed, was interrupted, timed out, or could not start",
  );
}

export async function executeNavigationMatrix(
  manifest,
  origin,
  onRow,
  browserTypes = engines,
  driver = runNavigationScenarios,
) {
  const rows = [];
  for (const expected of manifest.inputs.rows) {
    const candidate = manifest.inputs.context.contract.candidates.find(
      ({ id }) => id === expected.candidate,
    );
    assert(candidate, "Missing frozen navigation candidate");
    const browser = await browserTypes[expected.browser].launch();
    try {
      assert.equal(
        browser.version(),
        manifest.browserVersions[expected.browser],
        "Navigation browser changed after freezing",
      );
      const row = { ...expected, browserVersion: browser.version(), flows: [] };
      rows.push(row);
      // No subset, retry or timeout override: the complete existing driver is the contract.
      const result = await driver(browser, origin, candidate, {
        configuration: expected.configuration,
      });
      row.flows = result.flows;
      await onRow(row);
    } finally {
      await browser.close();
    }
  }
  return rows;
}

export async function executeFrozenNavigation(root, directory, manifest) {
  assert(
    manifest.schema === "jqstar-program-navigation-manifest/1" &&
      manifest.timeoutMs === navigationTimeoutMs,
    "Invalid frozen navigation manifest",
  );
  sameKeys(
    Object.keys(manifest.browserVersions),
    navigationEngines,
    "Frozen navigation browser versions",
  );
  assert.deepEqual(
    await loadNavigationInputs(root, manifest.inputs.ordinaryArtifact.path),
    manifest.inputs,
    "Navigation inputs changed before child execution",
  );
  const { context } = manifest.inputs;
  const raw = {
    schema: "jqstar-navigation-measurement/1",
    runId: manifest.runId,
    createdAt: new Date().toISOString(),
    contractSha256: context.contractSha256,
    fixtureSha256: context.fixtureSha256,
    environment: context.environment,
    artifact: context.artifact,
    packages: context.packages,
    bundles: context.bundles,
    candidates: [],
    status: "partial",
  };
  try {
    await withOwnedTemporaryDirectory({ prefix: "jqstar-program-navigation-" }, async (assets) => {
      for (const expected of manifest.inputs.assets) {
        const filename = basename(expected.path);
        await copyFile(join(root, expected.path), join(assets, filename));
        const copy = await readAuditBinary(assets, filename, {
          digest: expected.sha256,
          maximumBytes: expected.bytes,
        });
        assert.equal(copy.bytes, expected.bytes, "Navigation asset snapshot size differs");
      }
      const server = createNavigationDecisionServer(assets);
      try {
        await new Promise((resolve, reject) => {
          server.once("error", reject);
          server.listen(0, "127.0.0.1", resolve);
        });
        const origin = `http://127.0.0.1:${server.address().port}`;
        await executeNavigationMatrix(manifest, origin, async (row) => {
          raw.candidates.push(row);
          await writeNavigationRecord(
            root,
            directory,
            `row-${String(raw.candidates.length).padStart(2, "0")}.json`,
            row,
          );
          process.stdout.write(
            `${row.browser} ${row.candidate} ${row.configuration}: ${row.flows.length} flows\n`,
          );
        });
      } finally {
        server.closeAllConnections();
        if (server.listening)
          await new Promise((resolve, reject) =>
            server.close((error) => (error ? reject(error) : resolve())),
          );
      }
    });
    assert.deepEqual(
      await loadNavigationInputs(root, manifest.inputs.ordinaryArtifact.path),
      manifest.inputs,
      "Navigation inputs changed during child execution",
    );
    raw.status = raw.candidates.some(
      (row) =>
        row.configuration === "configured" && row.flows.some((flow) => flow.status === "fail"),
    )
      ? "fail"
      : "pass";
    await writeNavigationRecord(root, directory, "raw.json", raw);
    assert.equal(raw.status, "pass", "A configured navigation flow failed");
  } catch (error) {
    // Complete rows also have individual immutable files if an infrastructure failure interrupts a later row.
    if (raw.status === "partial") {
      raw.status = "fail";
      await writeNavigationRecord(root, directory, "raw.json", raw);
    }
    throw error;
  }
}

// @vitest-environment node
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { runChild } from "../scripts/quality/lib/process.mjs";
import { sha256 } from "../scripts/program-audit/contracts.mjs";
import {
  navigationRows,
  validateNavigationPreparation,
} from "../scripts/program-audit/navigation-inputs.mjs";
import {
  assertNavigationProcess,
  executeNavigationMatrix,
  writeNavigationRecord,
} from "../scripts/program-audit/navigation-runner.mjs";

function fixture() {
  const root = "/workspace";
  const base = ".git/jqstar/navigation-decision";
  const input = {
    sha256: "1".repeat(64),
    files: [{ path: "src/runtime.ts", sha256: "2".repeat(64) }],
  };
  const candidateIds = [
    "browser-nojs",
    "browser",
    "turbo-8.0.21",
    "turbo-8.0.23",
    "htmx-2.0.0",
    "htmx-2.0.10",
  ];
  const contract = {
    browsers: ["chromium", "firefox", "webkit"],
    candidates: candidateIds.map((id) => ({
      id,
      host: id.startsWith("browser") ? "browser" : id.split("-")[0],
    })),
    scenarios: Array.from({ length: 28 }, (_, i) => ({
      id: `NAV-${String(i + 1).padStart(2, "0")}`,
    })),
  };
  const packages = [
    ["jquery", "jquery", "4.0.0"],
    ["turbo-8-0-21", "@hotwired/turbo", "8.0.21"],
    ["turbo-8-0-23", "@hotwired/turbo", "8.0.23"],
    ["htmx-2-0-0", "htmx.org", "2.0.0"],
    ["htmx-2-0-10", "htmx.org", "2.0.10"],
  ].map(([alias, name, version]) => ({
    alias,
    name,
    version,
    integrity: `sha512-${alias}`,
    license: "MIT",
    dependencies: {},
  }));
  const lock = {
    packages: Object.fromEntries(
      packages.map(({ alias, ...item }) => [`node_modules/${alias}`, item]),
    ),
  };
  const filename = `jquery-star-1.1.0-${"3".repeat(64)}.tgz`;
  const path = `${root}/${base}/${filename}`;
  const prepared = {
    schema: "jqstar-navigation-build/1",
    input: structuredClone(input),
    assets: `${root}/${base}/assets`,
    tarball: { path, filename, integrity: "sha512-candidate" },
    packages: structuredClone(packages),
    installedPackages: {
      ...structuredClone(lock.packages),
      "": { dependencies: { "jquery-star": `file:${path}` } },
      "node_modules/jquery-star": {
        resolved: `file:../${filename}`,
        integrity: "sha512-candidate",
      },
    },
    bundles: Object.fromEntries(
      candidateIds.map((id) => [
        id,
        {
          filename: `${id}.js`,
          modules: [
            `${base}/consumer/${id}.js`,
            `${base}/consumer/node_modules/jquery-star/dist/core.js`,
            `${base}/consumer/node_modules/jquery/dist-module/jquery.module.js`,
            "test/fixtures/navigation-decision/bootstrap.js",
          ],
        },
      ]),
    ),
  };
  return { root, prepared, input, contract, lock };
}

describe("read-only navigation audit preparation", () => {
  it("binds the complete candidate matrix, installed tarball, package locks and isolated graphs", () => {
    const f = fixture();
    validateNavigationPreparation(f.prepared, f.input, f.contract, f.lock, f.root);
    const rows = navigationRows(f.contract);
    assert.equal(rows.length, 30);
    for (const engine of ["chromium", "firefox", "webkit"]) {
      assert.equal(
        rows.filter((r) => r.browser === engine && r.configuration === "configured").length,
        6,
      );
      assert.equal(
        rows.filter((r) => r.browser === engine && r.configuration === "default").length,
        4,
      );
      assert.equal(
        rows.filter((r) => r.candidate === "browser-nojs" && r.browser === engine).length,
        1,
      );
    }
  });
  it.each([
    ["stale source preparation", (p) => p.input.files.pop()],
    ["another asset directory", (p) => (p.assets = "/elsewhere")],
    ["another tarball path", (p) => (p.tarball.path = "/elsewhere/candidate.tgz")],
    ["missing dependency", (p) => p.packages.pop()],
    ["substituted dependency version", (p) => (p.packages[1].version = "9.0.0")],
    ["substituted dependency name", (p) => (p.packages[1].name = "other")],
    ["changed dependency integrity", (p) => (p.packages[1].integrity = "other")],
    [
      "changed installed dependency",
      (p) => (p.installedPackages["node_modules/jquery"].version = "3.0.0"),
    ],
    ["changed dependency license", (p) => (p.packages[0].license = "unknown")],
    ["changed dependency graph", (p) => (p.packages[0].dependencies.extra = "1")],
    ["linked jQStar source", (p) => (p.installedPackages["node_modules/jquery-star"].link = true)],
    [
      "another installed tarball",
      (p) => (p.installedPackages["node_modules/jquery-star"].resolved = "file:../other.tgz"),
    ],
    [
      "another requested tarball",
      (p) => (p.installedPackages[""].dependencies["jquery-star"] = "file:/other.tgz"),
    ],
    [
      "mismatched jQStar integrity",
      (p) => (p.installedPackages["node_modules/jquery-star"].integrity = "other"),
    ],
    ["missing bundle", (p) => delete p.bundles.browser],
    ["bundle path escape", (p) => (p.bundles.browser.filename = "../../browser.js")],
    ["missing installed graph", (p) => p.bundles.browser.modules.splice(1, 1)],
    ["repository source fallback", (p) => p.bundles.browser.modules.push("src/core.ts")],
    [
      "repository dependency fallback",
      (p) => p.bundles.browser.modules.push("node_modules/jquery/dist/jquery.js"),
    ],
    [
      "undeclared consumer dependency",
      (p) =>
        p.bundles.browser.modules.push(
          ".git/jqstar/navigation-decision/consumer/node_modules/other/index.js",
        ),
    ],
    [
      "module path traversal",
      (p) =>
        p.bundles.browser.modules.push(".git/jqstar/navigation-decision/consumer/../src/core.ts"),
    ],
    ["duplicate graph entry", (p) => p.bundles.browser.modules.push(p.bundles.browser.modules[0])],
  ])("rejects %s before scenarios", (_name, change) => {
    const f = fixture();
    change(f.prepared);
    assert.throws(() =>
      validateNavigationPreparation(f.prepared, f.input, f.contract, f.lock, f.root),
    );
  });
  it.each([
    ["engine", (c) => c.browsers.pop()],
    ["candidate", (c) => c.candidates.pop()],
    ["scenario", (c) => c.scenarios.pop()],
    ["duplicate scenario", (c) => (c.scenarios[1] = c.scenarios[0])],
  ])("refuses a reduced or ambiguous %s roster", (_name, change) => {
    const { contract } = fixture();
    change(contract);
    assert.throws(() => navigationRows(contract));
  });
});

function matrixFixture() {
  const { contract } = fixture();
  const manifest = {
    inputs: { rows: navigationRows(contract), context: { contract } },
    browserVersions: { chromium: "c", firefox: "f", webkit: "w" },
  };
  const closed = [],
    opened = [];
  const engines = Object.fromEntries(
    Object.entries(manifest.browserVersions).map(([name, version]) => [
      name,
      {
        async launch() {
          const token = { name, count: opened.length };
          opened.push(token);
          return { version: () => version, close: async () => closed.push(token) };
        },
      },
    ]),
  );
  return { manifest, engines, closed, opened };
}

describe("navigation execution and recording", () => {
  it("runs all thirty rows without subsets or retries and retains host-default failures", async () => {
    const f = matrixFixture(),
      calls = [],
      retained = [];
    const rows = await executeNavigationMatrix(
      f.manifest,
      "http://127.0.0.1:1",
      async (row) => retained.push(row),
      f.engines,
      async (_browser, origin, candidate, options) => {
        calls.push({ candidate: candidate.id, origin, options });
        assert.deepEqual(Object.keys(options), ["configuration"]);
        return {
          flows: [{ id: "NAV-01", status: options.configuration === "default" ? "fail" : "pass" }],
        };
      },
    );
    assert.equal(calls.length, 30);
    assert.equal(retained.length, 30);
    assert.deepEqual(rows, retained);
    assert.equal(rows.filter((r) => r.flows[0].status === "fail").length, 12);
    assert.deepEqual(f.closed, f.opened);
  });
  it("closes the browser and retains completed rows when later driver infrastructure fails", async () => {
    const f = matrixFixture(),
      retained = [];
    await assert.rejects(
      executeNavigationMatrix(
        f.manifest,
        "http://127.0.0.1:1",
        async (row) => retained.push(row),
        f.engines,
        async () => {
          if (retained.length === 2) throw new Error("driver failed");
          return { flows: [] };
        },
      ),
      /driver failed/u,
    );
    assert.equal(retained.length, 2);
    assert.equal(f.opened.length, 3);
    assert.deepEqual(f.closed, f.opened);
  });
  it("refuses a changed browser before calling the driver and still closes it", async () => {
    const f = matrixFixture();
    f.manifest.browserVersions.chromium = "changed";
    let called = false;
    await assert.rejects(
      executeNavigationMatrix(
        f.manifest,
        "http://127.0.0.1:1",
        async () => {},
        f.engines,
        async () => {
          called = true;
        },
      ),
      /browser changed/u,
    );
    assert.equal(called, false);
    assert.equal(f.closed.length, 1);
  });
  it("writes deterministic read-only records and refuses overwriting retained evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "jqstar-navigation-record-test-"));
    try {
      const ref = await writeNavigationRecord(root, root, "manifest.json", { z: 2, a: 1 });
      const bytes = await readFile(join(root, ref.path));
      assert.equal(sha256(bytes), ref.sha256);
      assert.equal(bytes.length, ref.bytes);
      assert.equal(bytes.toString(), '{\n  "a": 1,\n  "z": 2\n}\n');
      if (process.platform !== "win32")
        assert.equal((await stat(join(root, ref.path))).mode & 0o777, 0o444);
      await assert.rejects(writeNavigationRecord(root, root, "manifest.json", { replaced: true }));
      assert.equal(sha256(await readFile(join(root, ref.path))), ref.sha256);
      await assert.rejects(writeNavigationRecord(root, root, "../escaped.json", {}));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it.each([
    ["failure", { exitCode: 1 }],
    ["missing exit", { exitCode: null }],
    ["signal", { signal: "SIGTERM" }],
    ["timeout", { timedOut: true }],
    ["spawn failure", { spawnError: new Error("spawn") }],
    ["missing signal", { signal: undefined }],
    ["missing timeout", { timedOut: undefined }],
    ["missing spawn result", { spawnError: undefined }],
  ])("does not accept %s as a completed navigation process", (_name, changed) => {
    assert.throws(() =>
      assertNavigationProcess({
        exitCode: 0,
        signal: null,
        timedOut: false,
        spawnError: null,
        ...changed,
      }),
    );
  });
  it("checks actual successful, unsuccessful and timed-out child processes independently", async () => {
    const command = (source, timeoutMs = 2000) =>
      runChild({
        command: process.execPath,
        args: ["--input-type=module", "-e", source],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs,
      });
    assertNavigationProcess(await command("process.exit(0)"));
    const failed = await command("process.exit(3)");
    assert.throws(() => assertNavigationProcess(failed));
    const timed = await command("setInterval(() => {}, 1000)", 100);
    assert.equal(timed.timedOut, true);
    assert.throws(() => assertNavigationProcess(timed));
  });
});

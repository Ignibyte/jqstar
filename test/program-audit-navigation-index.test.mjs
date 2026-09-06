// @vitest-environment node
import assert from "node:assert/strict";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { beforeEach, describe, it, vi } from "vitest";
import { readNavigationMeasurement } from "../scripts/quality/navigation-evidence.mjs";
import { sha256 } from "../scripts/program-audit/contracts.mjs";
import { loadNavigationInputs } from "../scripts/program-audit/navigation-inputs.mjs";
import {
  loadNavigationExecution,
  validateNavigationExecution,
} from "../scripts/program-audit/navigation-execution.mjs";
import { reportSchemas } from "../scripts/program-audit/reports.mjs";

// The separately tested preparation reader is the only replacement. Index, process,
// log, schema and full raw-report validation use actual files and maintained readers.
vi.mock("../scripts/program-audit/navigation-inputs.mjs", () => ({
  loadNavigationInputs: vi.fn(),
}));
beforeEach(() => vi.mocked(loadNavigationInputs).mockReset());

function fixture() {
  const runId = "2026-09-05T23-18-54.986Z-29717";
  const directory = `.git/jqstar/program-audit/navigation-executions/${runId}`;
  const source = {
    commit: "1".repeat(40),
    fingerprint: { algorithm: "sha256", digest: "2".repeat(64), fileCount: 853 },
    mutableWorkspace: false,
  };
  const artifact = { filename: "jquery-star-1.1.0.tgz", sha256: "3".repeat(64), bytes: 1234 };
  const browserVersions = { chromium: "151.0.7922.34", firefox: "153.0", webkit: "26.5" };
  const inputs = {
    source: structuredClone(source),
    ordinaryArtifact: {
      path: `.git/candidate/${artifact.filename}`,
      sha256: artifact.sha256,
      bytes: artifact.bytes,
    },
    navigationArtifact: {
      path: ".git/candidate/alias.tgz",
      sha256: artifact.sha256,
      bytes: artifact.bytes,
    },
    context: { contract: { independentlyFrozen: true } },
    schemas: {},
  };
  const expected = {
    final: true,
    source,
    inputs: structuredClone(inputs),
    artifact,
    browserVersions,
    nodePath: process.execPath,
    notBefore: "2026-09-05T23:00:00.000Z",
    notAfter: "2026-09-06T00:00:00.000Z",
  };
  const manifest = {
    schema: "jqstar-program-navigation-manifest/1",
    runId,
    frozenAt: "2026-09-05T23:01:00.000Z",
    timeoutMs: 3600000,
    inputs: structuredClone(inputs),
    browserVersions: structuredClone(browserVersions),
  };
  const ref = (name) => ({ path: `${directory}/${name}`, sha256: "4".repeat(64), bytes: 12 });
  const index = {
    schema: "jqstar-program-navigation-execution/1",
    status: "pass",
    scope: "navigation-component",
    source: structuredClone(source),
    manifest: ref("manifest.json"),
    execution: {
      command: {
        executable: process.execPath,
        args: [
          "scripts/program-audit/run-navigation.mjs",
          "--execute",
          `${directory}/manifest.json`,
          "4".repeat(64),
        ],
      },
      timeoutMs: 3600000,
      startedAt: "2026-09-05T23:02:00.000Z",
      endedAt: "2026-09-05T23:50:00.000Z",
      exitCode: 0,
      signal: null,
      timedOut: false,
      spawnError: null,
      interruption: null,
      stdout: ref("stdout.log"),
      stderr: ref("stderr.log"),
    },
    report: ref("raw.json"),
    summary: {
      candidateRows: 30,
      flowCount: 840,
      configuredPasses: 498,
      approvedExclusions: 6,
      defaultFailures: 72,
    },
  };
  return { directory, expected, manifest, index, reference: ref("execution.json") };
}

describe("navigation execution identity", () => {
  it("binds a complete clean execution to independent program expectations", () => {
    const f = fixture();
    assert.deepEqual(validateNavigationExecution(f.index, f.manifest, f.reference, f.expected), {
      directory: f.directory,
      start: Date.parse("2026-09-05T23:02:00.000Z"),
      end: Date.parse("2026-09-05T23:50:00.000Z"),
    });
  });
  it("permits explicitly developmental evidence but refuses to promote it to final proof", () => {
    const f = fixture();
    f.expected.final = false;
    for (const source of [
      f.expected.source,
      f.expected.inputs.source,
      f.manifest.inputs.source,
      f.index.source,
    ])
      source.mutableWorkspace = true;
    validateNavigationExecution(f.index, f.manifest, f.reference, f.expected);
    f.expected.final = true;
    assert.throws(
      () => validateNavigationExecution(f.index, f.manifest, f.reference, f.expected),
      /must be clean/u,
    );
  });
  it.each([
    ["omitted scope", (f) => delete f.expected.final],
    ["unknown scope", (f) => (f.expected.final = "final")],
    ["malformed source", (f) => (f.expected.source.commit = "unknown")],
    ["malformed fingerprint", (f) => (f.expected.source.fingerprint.digest = "unknown")],
    ["invalid source count", (f) => (f.expected.source.fingerprint.fileCount = 0)],
    ["missing browser", (f) => delete f.expected.browserVersions.firefox],
    ["empty browser version", (f) => (f.expected.browserVersions.firefox = "")],
    ["relative executable", (f) => (f.expected.nodePath = "node")],
    ["invalid program time", (f) => (f.expected.notBefore = "yesterday")],
    ["reversed program interval", (f) => (f.expected.notBefore = "2026-09-06T01:00:00.000Z")],
    ["failed index", (f) => (f.index.status = "fail")],
    ["different index schema", (f) => (f.index.schema = "other")],
    ["claimed full-program scope", (f) => (f.index.scope = "program")],
    ["unknown index field", (f) => (f.index.extra = true)],
    ["another commit", (f) => (f.index.source.commit = "0".repeat(40))],
    ["changed source fingerprint", (f) => f.index.source.fingerprint.fileCount++],
    ["another manifest schema", (f) => (f.manifest.schema = "other")],
    ["another run", (f) => (f.manifest.runId = "other")],
    [
      "changed prepared inputs",
      (f) => (f.manifest.inputs.context.contract.independentlyFrozen = false),
    ],
    ["changed frozen browser", (f) => (f.manifest.browserVersions.webkit = "other")],
    ["another program artifact", (f) => (f.expected.artifact.sha256 = "0".repeat(64))],
    ["another artifact size", (f) => f.expected.artifact.bytes++],
    ["another artifact name", (f) => (f.expected.artifact.filename = "jquery-star-2.0.0.tgz")],
    ["changed alias", (f) => (f.manifest.inputs.navigationArtifact.sha256 = "0".repeat(64))],
    ["another execution directory", (f) => (f.reference.path = "elsewhere/execution.json")],
    ["another index filename", (f) => (f.reference.path = `${f.directory}/other.json`)],
    ["cross-run manifest", (f) => (f.index.manifest.path = "other/manifest.json")],
    ["cross-run report", (f) => (f.index.report.path = "other/raw.json")],
    ["cross-run log", (f) => (f.index.execution.stdout.path = "other/stdout.log")],
    ["extra command argument", (f) => f.index.execution.command.args.push("--subset")],
    ["another Node executable", (f) => (f.index.execution.command.executable += "-other")],
    ["another child manifest digest", (f) => (f.index.execution.command.args[3] = "0".repeat(64))],
    ["expanded manifest timeout", (f) => f.manifest.timeoutMs++],
    ["expanded process timeout", (f) => f.index.execution.timeoutMs++],
    ["execution before freeze", (f) => (f.manifest.frozenAt = "2026-09-05T23:03:00.000Z")],
    ["freeze before program", (f) => (f.manifest.frozenAt = "2026-09-05T22:59:59.999Z")],
    ["execution after program", (f) => (f.expected.notAfter = "2026-09-05T23:49:59.999Z")],
    ["reversed process interval", (f) => (f.index.execution.endedAt = "2026-09-05T23:01:00.000Z")],
    [
      "duration beyond fixed limit",
      (f) => {
        f.expected.notAfter = "2026-09-06T02:00:00.000Z";
        f.index.execution.endedAt = "2026-09-06T01:00:00.000Z";
      },
    ],
    ["failed process", (f) => (f.index.execution.exitCode = 1)],
    ["missing process exit", (f) => (f.index.execution.exitCode = null)],
    ["fractional process exit", (f) => (f.index.execution.exitCode = 0.5)],
    ["signal", (f) => (f.index.execution.signal = "SIGTERM")],
    ["timeout", (f) => (f.index.execution.timedOut = true)],
    ["spawn error", (f) => (f.index.execution.spawnError = "spawn-error")],
    ["parent interruption", (f) => (f.index.execution.interruption = "SIGINT")],
    ["missing process field", (f) => delete f.index.execution.signal],
  ])("rejects %s", (_name, change) => {
    const f = fixture();
    change(f);
    assert.throws(() => validateNavigationExecution(f.index, f.manifest, f.reference, f.expected));
  });
});

const decision = JSON.parse(await readFile("quality/navigation-decision.json", "utf8"));
const schema = JSON.parse(await readFile("schema/navigation-decision.schema.json", "utf8"));
const retained = decision.measurements.find((m) => m.runId === "2026-09-05T23-18-54.986Z-29717");
const historicalRaw = await readNavigationMeasurement(retained, schema);

async function diskFixture(root) {
  const f = fixture();
  const write = async (path, source) => {
    await mkdir(join(root, dirname(path)), { recursive: true });
    await writeFile(join(root, path), source);
    return { path, sha256: sha256(source), bytes: Buffer.byteLength(source) };
  };
  const json = (path, value) => write(path, `${JSON.stringify(value)}\n`);
  const inputs = f.expected.inputs;
  for (const [kind, path] of Object.entries(reportSchemas))
    inputs.schemas[kind] = await write(path, await readFile(path));
  // Historical observations exercise the full maintained raw validator. This synthetic
  // process envelope is only a test fixture and never current release evidence.
  inputs.context = {
    contract: decision.contract,
    contractSha256: retained.contractSha256,
    fixtureSha256: retained.fixtureSha256,
    environment: historicalRaw.environment,
    artifact: historicalRaw.artifact,
    packages: historicalRaw.packages,
    bundles: historicalRaw.bundles,
  };
  f.expected.artifact.sha256 = historicalRaw.artifact.sha256;
  f.expected.artifact.bytes = historicalRaw.artifact.packedBytes;
  for (const artifact of [inputs.ordinaryArtifact, inputs.navigationArtifact]) {
    artifact.sha256 = f.expected.artifact.sha256;
    artifact.bytes = f.expected.artifact.bytes;
  }
  f.manifest.inputs = structuredClone(inputs);
  f.index.manifest = await json(`${f.directory}/manifest.json`, f.manifest);
  f.index.execution.command.args[3] = f.index.manifest.sha256;
  f.index.execution.stdout = await write(`${f.directory}/stdout.log`, "completed\n");
  f.index.execution.stderr = await write(`${f.directory}/stderr.log`, "");
  await json(`${f.directory}/process.json`, f.index.execution);
  f.index.report = await json(`${f.directory}/raw.json`, historicalRaw);
  f.reference = await json(`${f.directory}/execution.json`, f.index);
  vi.mocked(loadNavigationInputs).mockImplementation(async () => structuredClone(inputs));
  return { ...f, write, json };
}

describe("navigation indexed file loading", () => {
  it("loads complete raw observations, verifies empty logs and returns immutable selector context", async () => {
    const root = await mkdtemp(join(tmpdir(), "jqstar-navigation-index-"));
    try {
      const f = await diskFixture(root);
      const result = await loadNavigationExecution(root, f.reference, f.expected);
      assert.deepEqual(result.summary, {
        candidateRows: 30,
        flowCount: 840,
        configuredPasses: 498,
        approvedExclusions: 6,
        defaultFailures: 72,
      });
      assert.equal(result.finalEligible, true);
      assert.equal(result.report.data.candidates.length, 30);
      assert.equal(result.context.start, Date.parse(f.index.execution.startedAt));
      assert.equal(vi.mocked(loadNavigationInputs).mock.calls.length, 2);
      assert.throws(() => result.source.fingerprint.fileCount++);
      assert.throws(() => result.context.contract.scenarios.pop());
      assert.throws(() => result.report.data.candidates.pop());
      f.expected.source.fingerprint.fileCount++;
      assert.equal(result.source.fingerprint.fileCount, 853);
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
  it.each([
    ["missing process file", async (f, root) => rm(join(root, f.directory, "process.json"))],
    [
      "contradictory process file",
      async (f) => f.json(`${f.directory}/process.json`, { ...f.index.execution, exitCode: 3 }),
    ],
    ["changed same-size log", async (f) => f.write(`${f.directory}/stdout.log`, "tampered!\n")],
    ["missing empty log", async (f, root) => rm(join(root, f.directory, "stderr.log"))],
    [
      "changed index digest",
      async (f) => {
        f.reference.sha256 = "0".repeat(64);
      },
    ],
    [
      "changed index byte count",
      async (f) => {
        f.reference.bytes++;
      },
    ],
    [
      "unknown reference field",
      async (f) => {
        f.reference.extra = true;
      },
    ],
    [
      "unsafe reference path",
      async (f) => {
        f.reference.path = "../execution.json";
      },
    ],
    [
      "malformed raw report with valid digest",
      async (f) => {
        f.index.report = await f.json(`${f.directory}/raw.json`, {
          ...historicalRaw,
          status: "unknown",
        });
        f.reference = await f.json(`${f.directory}/execution.json`, f.index);
      },
    ],
    [
      "omitted flow with valid schema and digest",
      async (f) => {
        const raw = structuredClone(historicalRaw);
        raw.candidates[0].flows.pop();
        f.index.report = await f.json(`${f.directory}/raw.json`, raw);
        f.reference = await f.json(`${f.directory}/execution.json`, f.index);
      },
    ],
    [
      "forged summary with valid index digest",
      async (f) => {
        f.index.summary.defaultFailures = 0;
        f.reference = await f.json(`${f.directory}/execution.json`, f.index);
      },
    ],
    [
      "changed preparation before loading",
      async () => {
        vi.mocked(loadNavigationInputs).mockResolvedValue({ changed: true });
      },
    ],
    [
      "changed preparation during loading",
      async (f) => {
        vi.mocked(loadNavigationInputs)
          .mockResolvedValueOnce(structuredClone(f.expected.inputs))
          .mockResolvedValueOnce({ changed: true });
      },
    ],
  ])("refuses %s", async (_name, change) => {
    const root = await mkdtemp(join(tmpdir(), "jqstar-navigation-index-"));
    try {
      const f = await diskFixture(root);
      await change(f, root);
      await assert.rejects(loadNavigationExecution(root, f.reference, f.expected));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

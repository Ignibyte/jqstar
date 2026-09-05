import { readFileSync } from "node:fs";
import { mkdir, rename, writeFile } from "node:fs/promises";
import { createServer } from "node:http";
import { dirname, join, resolve } from "node:path";
import { stripVTControlCharacters } from "node:util";
import { runChild } from "./quality/lib/process.mjs";

const root = process.cwd();
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const runDirectory = resolve(
  process.env.JQS_QUALITY_RUN_DIRECTORY ?? ".git/jqstar/standalone/ticket-0044",
);
const fixtureDirectory = join(runDirectory, "self-test-fixtures");
const output = join(runDirectory, "self-test-report.json");
const runId = process.env.JQS_QUALITY_RUN_ID ?? "ticket-0044-standalone";
const report = {
  schema: "jqstar-quality-0044-self-test/1",
  runId,
  mode: "self-test",
  checks: [],
  status: "error",
};

async function run(executable, args, env = {}) {
  const result = await runChild({
    command: executable,
    args,
    cwd: root,
    env: { ...process.env, ...env },
    timeoutMs: 900_000,
  });
  return { ...result, status: result.exitCode, error: result.spawnError };
}

async function reserveAvailablePort() {
  return new Promise((resolvePort, reject) => {
    const server = createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close();
        reject(new Error("Could not reserve a TCP port for the network sabotage fixture."));
        return;
      }
      server.close((error) => {
        if (error) reject(error);
        else resolvePort(address.port);
      });
    });
  });
}

function record(name, result, expected, detector, evidence, artifactDirectory = null) {
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const expectedExit = expected === "red" ? result.status !== 0 : result.status === 0;
  const detectorMatched = detector.test(stripVTControlCharacters(combined));
  let evidenceMatched = true;
  let evidenceFailure = null;
  if (evidence) {
    try {
      const gateReport = JSON.parse(readFileSync(evidence.path, "utf8"));
      const failures = gateReport.checks
        .filter((check) => check.status !== "pass")
        .map((check) => check.name);
      evidenceMatched = failures.length === 1 && failures[0] === evidence.failure;
      if (!evidenceMatched) evidenceFailure = `unexpected failures: ${failures.join(", ")}`;
    } catch (error) {
      evidenceMatched = false;
      evidenceFailure = error instanceof Error ? error.message : String(error);
    }
  }
  const passed = expectedExit && detectorMatched && evidenceMatched;
  report.checks.push({
    name,
    expected,
    exitCode: result.status,
    status: passed ? "pass" : "fail",
    detector: detector.source,
    detectorMatched,
    evidenceMatched,
    evidenceFailure,
    artifactDirectory,
    output: combined.slice(-2_000),
  });
}

async function writeReport() {
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(temporary, output);
}

await mkdir(fixtureDirectory, { recursive: true });

record(
  "browser-shard-refusal",
  await run(process.execPath, ["scripts/quality-browser.mjs", "--list"], {
    JQS_BROWSER_LIST_ONLY: "1",
    JQS_E2E_SHARD: "1/2",
    JQS_QUALITY_RUN_DIRECTORY: join(fixtureDirectory, "shard-refusal"),
  }),
  "red",
  /cannot authorize browser quality until an all-shard result aggregator exists/u,
);

record(
  "browser-empty-selection",
  await run(process.execPath, ["scripts/quality-browser.mjs", "--list"], {
    JQS_BROWSER_LIST_ONLY: "1",
    JQS_QUALITY_RUN_DIRECTORY: join(fixtureDirectory, "empty-selection"),
    JQS_QUALITY_SABOTAGE: "empty-selection",
  }),
  "red",
  /No tests found[\s\S]*Browser quality failed/u,
  undefined,
  join(fixtureDirectory, "empty-selection", "playwright"),
);

const retryDirectory = join(fixtureDirectory, "retry-pass");
await mkdir(retryDirectory, { recursive: true });
record(
  "retry-pass-is-red",
  await run(
    npx,
    [
      "--no-install",
      "playwright",
      "test",
      "--config",
      "playwright.config.ts",
      "--project=quality-selftest",
    ],
    {
      CI: "1",
      JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY: retryDirectory,
      JQS_PLAYWRIGHT_SELF_TEST: "retry-pass",
      JQS_QUALITY_SABOTAGE: "retry-pass",
    },
  ),
  "red",
  /1 flaky[\s\S]*production Playwright config keeps retry-passes red/u,
  undefined,
  retryDirectory,
);

const networkProofPort = await reserveAvailablePort();
for (const fixture of [
  {
    name: "accessibility",
    grep: "keyboard, error",
    sabotage: "accessibility",
    detector: /button-name/u,
  },
  {
    name: "ownership-budget",
    grep: "repeated enhancement",
    sabotage: "ownership-budget",
    detector: /Expected:\s*<= 1/u,
  },
  {
    name: "network-fixture",
    grep: "proof network",
    sabotage: "network-fixture",
    detector: /retry-detector-sabotaged/u,
    env: { JQS_NETWORK_PROOF_PORT: String(networkProofPort) },
  },
  {
    name: "mobile-target",
    grep: "touch controls",
    project: "mobile-touch",
    sabotage: "mobile-target",
    detector: /Expected:\s*>= 10000/u,
  },
  {
    name: "reduced-motion",
    grep: "reduced-motion preference",
    project: "reduced-motion",
    sabotage: "reduced-motion",
    detector: /animationMs/u,
  },
  {
    name: "forced-colors",
    grep: "forced colors",
    project: "forced-colors",
    sabotage: "forced-colors",
    detector: /Expected:\s*> 100/u,
  },
  {
    name: "zoom-reflow",
    grep: "content reflows",
    project: "zoom-reflow",
    sabotage: "zoom-reflow",
    detector: /Expected:\s*<= 0/u,
  },
  {
    name: "no-javascript",
    grep: "native content",
    project: "javascript-disabled",
    sabotage: "no-javascript",
    detector: /Missing no-JavaScript heading/u,
  },
]) {
  const artifactDirectory = join(fixtureDirectory, "playwright", fixture.name);
  record(
    fixture.name,
    await run(
      npx,
      [
        "--no-install",
        "playwright",
        "test",
        "e2e/quality-contracts.spec.ts",
        `--project=${fixture.project ?? "desktop-chromium"}`,
        "--grep",
        fixture.grep,
      ],
      {
        CI: "",
        JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY: artifactDirectory,
        JQS_QUALITY_SABOTAGE: fixture.sabotage,
        ...fixture.env,
      },
    ),
    "red",
    fixture.detector,
    undefined,
    artifactDirectory,
  );
}

const packageEvidence = join(fixtureDirectory, "package-budget", "package-report.json");
record(
  "package-budget",
  await run(process.execPath, ["scripts/quality-package.mjs"], {
    JQS_QUALITY_RUN_DIRECTORY: join(fixtureDirectory, "package-budget"),
    JQS_QUALITY_SABOTAGE: "package-budget",
  }),
  "red",
  /package-budgets: Packed bytes \d+ exceed the base and optional-entry allowances/u,
  { path: packageEvidence, failure: "package-budgets" },
);

const apiDirectory = join(fixtureDirectory, "api-report");
await mkdir(join(apiDirectory, "baseline"), { recursive: true });
await mkdir(join(apiDirectory, "temporary"), { recursive: true });
await writeFile(join(apiDirectory, "baseline", "jquery-star.api.md"), "corrupted API report\n");
await writeFile(
  join(apiDirectory, "api-extractor.json"),
  `${JSON.stringify(
    {
      projectFolder: root,
      mainEntryPointFilePath: resolve("dist/types/index.d.ts"),
      apiReport: {
        enabled: true,
        reportFileName: "jquery-star.api.md",
        reportFolder: join(apiDirectory, "baseline"),
        reportTempFolder: join(apiDirectory, "temporary"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      messages: {
        extractorMessageReporting: { "ae-missing-release-tag": { logLevel: "none" } },
      },
    },
    null,
    2,
  )}\n`,
);
record(
  "api-report-drift",
  await run(npx, [
    "--no-install",
    "api-extractor",
    "run",
    "--config",
    join(apiDirectory, "api-extractor.json"),
  ]),
  "red",
  /changed the API signature/u,
);

const releaseEvidence = join(fixtureDirectory, "release-manifest", "release-report.json");
record(
  "artifact-manifest-drift",
  await run(process.execPath, ["scripts/quality-release.mjs"], {
    JQS_QUALITY_RUN_DIRECTORY: join(fixtureDirectory, "release-manifest"),
    JQS_QUALITY_SABOTAGE: "artifact-manifest",
  }),
  "red",
  /reproducible-build: Packed file manifests differ between clean builds/u,
  { path: releaseEvidence, failure: "reproducible-build" },
);

record(
  "package-release-contract-hardening",
  await run(npx, ["--no-install", "vitest", "run", "test/package-release-hardening.test.mjs"], {
    FORCE_COLOR: "1",
  }),
  "green",
  /Tests\s+14 passed/u,
);

record(
  "browser-selection-green-control",
  await run(process.execPath, ["scripts/quality-browser.mjs", "--list"], {
    JQS_BROWSER_LIST_ONLY: "1",
    JQS_QUALITY_RUN_DIRECTORY: join(fixtureDirectory, "browser-green"),
    JQS_QUALITY_SABOTAGE: "",
  }),
  "green",
  /browser quality: 8 projects, \d+ selected tests[\s\S]*selection=passed/u,
  undefined,
  join(fixtureDirectory, "browser-green", "playwright"),
);

report.status = report.checks.some((check) => check.status !== "pass") ? "fail" : "pass";
await writeReport();
if (report.status !== "pass") {
  const failed = report.checks
    .filter((check) => check.status !== "pass")
    .map((check) => check.name);
  throw new Error(`Ticket 0044 self-test failed: ${failed.join(", ")}. Evidence: ${output}`);
}
process.stdout.write(
  `ticket 0044 self-test: ${report.checks.length} detectors live; evidence ${output}\n`,
);

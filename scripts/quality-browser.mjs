import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { runChild, terminateActiveChildren } from "./quality/lib/process.mjs";

const requiredProjects = [
  "desktop-chromium",
  "desktop-firefox",
  "desktop-webkit",
  "mobile-touch",
  "reduced-motion",
  "forced-colors",
  "zoom-reflow",
  "javascript-disabled",
];
const listOnly = process.argv.includes("--list") || process.env.JQS_BROWSER_LIST_ONLY === "1";
const runDirectory = resolve(
  process.env.JQS_QUALITY_RUN_DIRECTORY ?? ".git/jqstar/standalone/ticket-0044",
);
const reportName = process.env.JQS_BROWSER_REPORT_NAME ?? "browser-report.json";
if (!/^[a-z0-9][a-z0-9._-]*\.json$/iu.test(reportName) || reportName.includes("..")) {
  throw new Error(`JQS_BROWSER_REPORT_NAME must be a safe JSON basename: ${reportName}`);
}
const reportLabel = reportName.slice(0, -".json".length);
const output = resolve(runDirectory, reportName);
const runId = process.env.JQS_QUALITY_RUN_ID ?? "ticket-0044-standalone";
const seed = process.env.JQS_BROWSER_SEED ?? String(Date.now());
const repeatEach = Number(process.env.JQS_BROWSER_REPEAT_EACH ?? 1);
const workers = Number(process.env.JQS_E2E_WORKERS ?? 1);
const shard = process.env.JQS_E2E_SHARD ?? null;
const sabotage = process.env.JQS_QUALITY_SABOTAGE ?? "";

if (shard) {
  throw new Error(
    "JQS_E2E_SHARD cannot authorize browser quality until an all-shard result aggregator exists.",
  );
}
if (process.env.JQS_PLAYWRIGHT_SELF_TEST) {
  throw new Error("JQS_PLAYWRIGHT_SELF_TEST is reserved for direct detector self-tests.");
}
if (!Number.isSafeInteger(repeatEach) || repeatEach < 1) {
  throw new Error("JQS_BROWSER_REPEAT_EACH must be a positive safe integer.");
}
if (!Number.isSafeInteger(workers) || workers < 1) {
  throw new Error("JQS_E2E_WORKERS must be a positive safe integer.");
}

function seedNumber(value) {
  let result = 2166136261;
  for (const character of value) {
    result ^= character.codePointAt(0) ?? 0;
    result = Math.imul(result, 16777619);
  }
  return result >>> 0;
}

function shuffled(values, value) {
  let state = seedNumber(value);
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    const target = state % (index + 1);
    [result[index], result[target]] = [result[target], result[index]];
  }
  return result;
}

const projects = shuffled(requiredProjects, seed);

const report = {
  schema: "jqstar-browser-quality/1",
  runId,
  mode: listOnly ? "selection" : repeatEach > 1 ? "repeated-audit" : "execution",
  seed,
  shard,
  workers,
  repeatEach,
  trace: "retain-on-failure",
  listOnly,
  projects: [],
  status: "error",
};

async function run(args, env = {}) {
  const result = await runChild({
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args,
    cwd: process.cwd(),
    env: { ...process.env, CI: process.env.CI ?? "1", JQS_BROWSER_SEED: seed, ...env },
    timeoutMs: 900_000,
  });
  return { ...result, status: result.exitCode, error: result.spawnError };
}

async function writeReport() {
  await mkdir(dirname(output), { recursive: true });
  const temporary = `${output}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(temporary, output);
}

async function executionCounts(path) {
  const result = JSON.parse(await readFile(path, "utf8"));
  const stats = result.stats;
  if (!stats || typeof stats !== "object") {
    throw new Error("Playwright JSON report has no stats object.");
  }
  const counts = Object.fromEntries(
    ["expected", "unexpected", "flaky", "skipped"].map((name) => {
      const value = stats[name];
      if (!Number.isSafeInteger(value) || value < 0) {
        throw new Error(`Playwright JSON report has invalid stats.${name}.`);
      }
      return [name, value];
    }),
  );
  return {
    executedTests: counts.expected + counts.unexpected + counts.flaky + counts.skipped,
    passedTests: counts.expected,
    failedTests: counts.unexpected,
    flakyTests: counts.flaky,
    skippedTests: counts.skipped,
  };
}

function projectItem(project, tests = 0, listExitCode = null) {
  const artifactDirectory = join(runDirectory, "playwright", reportLabel, project);
  return {
    project,
    selectedTests: tests,
    listExitCode,
    runExitCode: null,
    executedTests: null,
    passedTests: null,
    failedTests: null,
    flakyTests: null,
    skippedTests: null,
    artifacts: {
      root: artifactDirectory,
      testResults: join(artifactDirectory, "test-results"),
      htmlReport: join(artifactDirectory, "html"),
      jsonReport: join(artifactDirectory, "results.json"),
    },
  };
}

let failed = false;
let failureReason = null;
let receivedSignal = null;
const handleSignal = (signal) => {
  receivedSignal ??= signal;
  terminateActiveChildren(signal);
};
const handleInterrupt = () => handleSignal("SIGINT");
const handleTermination = () => handleSignal("SIGTERM");
process.once("SIGINT", handleInterrupt);
process.once("SIGTERM", handleTermination);

try {
  for (const project of projects) {
    if (receivedSignal) {
      failed = true;
      failureReason ??= `interrupted by ${receivedSignal}`;
      report.projects.push(projectItem(project));
      continue;
    }
    const artifactDirectory = join(runDirectory, "playwright", reportLabel, project);
    const listArguments = ["--no-install", "playwright", "test", "--list", `--project=${project}`];
    if (sabotage === "empty-selection") {
      listArguments.push("--grep=__jqstar_missing_quality_test__");
    }
    const listed = await run(listArguments, {
      JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY: artifactDirectory,
    });
    const combined = `${listed.stdout ?? ""}\n${listed.stderr ?? ""}`;
    const match = /Total:\s+(\d+)\s+tests?/.exec(combined);
    const tests = Number(match?.[1] ?? 0);
    const item = projectItem(project, tests, listed.status);
    report.projects.push(item);
    if (listed.status !== 0 || tests === 0) {
      failed = true;
      failureReason ??= `${project} selected no runnable tests`;
      process.stderr.write(combined);
    }
  }

  if (!listOnly && !failed) {
    for (const engine of ["chromium", "firefox", "webkit"]) {
      const preflight = await runChild({
        command: process.execPath,
        args: [resolve("scripts/quality/browser-preflight.mjs"), engine],
        cwd: process.cwd(),
        env: process.env,
        timeoutMs: 45_000,
      });
      process.stdout.write(preflight.stdout);
      process.stderr.write(preflight.stderr);
      if (preflight.exitCode !== 0 || preflight.timedOut || preflight.spawnError) {
        failed = true;
        failureReason = preflight.timedOut
          ? `${engine} browser preflight timed out after 45 seconds`
          : `${engine} browser preflight exited with ${String(preflight.exitCode)}`;
        break;
      }
    }
  }

  if (!listOnly && !failed) {
    for (const item of report.projects) {
      if (receivedSignal) {
        failed = true;
        failureReason ??= `interrupted by ${receivedSignal}`;
        break;
      }
      const artifactDirectory = item.artifacts.root;
      const resultsPath = item.artifacts.jsonReport;
      const playwrightEnvironment = { JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY: artifactDirectory };
      await rm(resultsPath, { force: true });
      const args = ["--no-install", "playwright", "test", `--project=${item.project}`];
      if (repeatEach > 1) args.push(`--repeat-each=${repeatEach}`);
      const executed = await run(args, playwrightEnvironment);
      item.runExitCode = executed.status;
      process.stdout.write(executed.stdout ?? "");
      process.stderr.write(executed.stderr ?? "");
      try {
        Object.assign(item, await executionCounts(resultsPath));
        if (
          item.executedTests !== item.selectedTests * repeatEach ||
          item.passedTests !== item.selectedTests * repeatEach ||
          item.failedTests !== 0 ||
          item.flakyTests !== 0 ||
          item.skippedTests !== 0
        ) {
          failed = true;
          process.stderr.write(
            `${item.project}: execution evidence does not match ${item.selectedTests} selected tests x ${repeatEach} repeat(s).\n`,
          );
        }
      } catch (error) {
        failed = true;
        process.stderr.write(
          `${item.project}: execution report is missing or invalid (${error instanceof Error ? error.message : String(error)}).\n`,
        );
      }
      if (executed.status !== 0) {
        failed = true;
        failureReason ??= `${item.project} execution failed`;
      }
      if (failed) break;
    }
  }

  report.status = failed ? "fail" : "pass";
  await writeReport();
  if (failed) {
    throw new Error(
      `Browser quality failed${failureReason ? `: ${failureReason}` : ""}. Evidence: ${output}`,
    );
  }
  process.stdout.write(
    `browser quality: ${projects.length} projects, ${report.projects.reduce((sum, item) => sum + item.selectedTests, 0)} selected tests, seed ${seed}, ${listOnly ? "selection" : "execution"}=passed\n`,
  );
} finally {
  process.off("SIGINT", handleInterrupt);
  process.off("SIGTERM", handleTermination);
}

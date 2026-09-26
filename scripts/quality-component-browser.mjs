import { mkdir, readFile, rename, rm, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { runChild, terminateActiveChildren } from "./quality/lib/process.mjs";
import { runPlaywright } from "./quality/browser-process.mjs";
import { evaluateComponentRun } from "./quality/component-browser-report.mjs";

const runDirectory = resolve(
  process.env.JQS_QUALITY_RUN_DIRECTORY ?? ".git/jqstar/standalone/components",
);
const runId = process.env.JQS_QUALITY_RUN_ID ?? "components-standalone";
const reportPath = join(runDirectory, "browser-components-report.json");
const artifacts = join(runDirectory, "playwright", "components");
const jsonReport = join(artifacts, "results.json");
const environment = {
  ...process.env,
  CI: process.env.CI ?? "1",
  JQS_COMPONENT_FAST: "1",
  JQS_PLAYWRIGHT_ARTIFACT_DIRECTORY: artifacts,
};
const args = [
  "--no-install",
  "playwright",
  "test",
  "e2e/components.spec.ts",
  "--project=desktop-chromium",
];

async function writeReport(report) {
  await mkdir(dirname(reportPath), { recursive: true });
  const temporary = `${reportPath}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  await rename(temporary, reportPath);
}

let interrupted = null;
for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    interrupted = signal;
    terminateActiveChildren(signal);
  });
}

const report = {
  schema: "jqstar-browser-components/1",
  runId,
  mode: "execution",
  project: "desktop-chromium",
  source: "e2e/components.spec.ts",
  status: "error",
  selectedTests: 0,
  executedTests: null,
  passedTests: null,
  failedTests: null,
  flakyTests: null,
  skippedTests: null,
  listExitCode: null,
  runExitCode: null,
  artifacts: {
    root: artifacts,
    jsonReport,
    testResults: join(artifacts, "test-results"),
    htmlReport: join(artifacts, "html"),
  },
  failures: [],
};

try {
  const selectionArgs = [...args, "--list"];
  if (process.env.JQS_QUALITY_SABOTAGE === "empty-selection") {
    selectionArgs.push("--grep=__jqstar_missing_component_test__");
  }
  const listed = await runPlaywright(selectionArgs, { env: environment });
  report.listExitCode = listed.exitCode;
  const selectionOutput = `${listed.stdout ?? ""}\n${listed.stderr ?? ""}`;
  const selectedTests = Number(/Total:\s+(\d+)\s+tests?/u.exec(selectionOutput)?.[1] ?? 0);
  report.selectedTests = selectedTests;
  let execution = { exitCode: null, failureReason: "selection did not pass" };
  let playwrightResult = null;
  if (!listed.failureReason && selectedTests >= 76 && !interrupted) {
    const preflight = await runChild({
      command: process.execPath,
      args: [resolve("scripts/quality/browser-preflight.mjs"), "chromium"],
      cwd: process.cwd(),
      env: environment,
      timeoutMs: 45_000,
    });
    if (preflight.exitCode !== 0 || preflight.timedOut || preflight.spawnError) {
      execution = { exitCode: null, failureReason: "Chromium preflight failed" };
    } else {
      await rm(jsonReport, { force: true });
      execution = await runPlaywright(args, { env: environment });
      report.runExitCode = execution.exitCode;
      process.stdout.write(execution.stdout ?? "");
      process.stderr.write(execution.stderr ?? "");
      try {
        playwrightResult = JSON.parse(await readFile(jsonReport, "utf8"));
      } catch {
        playwrightResult = null;
      }
    }
  }
  Object.assign(report, evaluateComponentRun(selectedTests, listed, execution, playwrightResult));
  if (interrupted) report.failures.push(`interrupted by ${interrupted}`);
  if (report.failures.length > 0) report.status = "fail";
} catch (error) {
  report.status = "error";
  report.failures.push(error instanceof Error ? error.message : String(error));
}
await writeReport(report);
console.log(`Component browser gate ${report.status}. Report: ${reportPath}`);
for (const failure of report.failures) console.error(`- ${failure}`);
if (report.status !== "pass") process.exitCode = 1;

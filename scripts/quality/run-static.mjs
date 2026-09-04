import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { writeAtomicJson } from "./lib/files.mjs";
import { gitDirectory } from "./lib/git-state.mjs";
import { runGate, terminateActiveChildren } from "./lib/process.mjs";
import { qualityPaths, repositoryRoot } from "./static-lib.mjs";

const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";
const node = process.execPath;

const gate = (
  id,
  command,
  args,
  modes = ["fast", "delivery", "full-audit"],
  timeoutMs = 120_000,
) => ({ id, command, args, modes, timeoutMs, enforced: true, kind: "analysis" });

const gates = [
  gate("scope-census", node, ["scripts/quality/scope-census.mjs"]),
  gate("static-self-test", node, ["scripts/quality/static-self-test.mjs"]),
  gate("source-policy", node, ["scripts/quality/source-policy.mjs"]),
  gate("schemas", node, ["scripts/quality/validate-json.mjs"]),
  gate("metrics", node, ["scripts/quality/check-metrics.mjs"]),
  gate("lockfile", node, ["scripts/quality/check-lockfile.mjs"]),
  gate("typescript-production", npx, [
    "--no-install",
    "tsc",
    "-p",
    "tsconfig.quality.production.json",
  ]),
  gate("typescript-server", npx, ["--no-install", "tsc", "-p", "tsconfig.quality.server.json"]),
  gate("typescript-registry", npx, ["--no-install", "tsc", "-p", "tsconfig.quality.registry.json"]),
  gate("typescript-test", npx, ["--no-install", "tsc", "-p", "tsconfig.quality.test.json"]),
  gate("eslint", npx, [
    "--no-install",
    "eslint",
    "src",
    "server",
    "registry/blocks",
    "test",
    "example",
    "e2e",
    "bin",
    "scripts",
    "quality",
    "*.config.ts",
    "--max-warnings=0",
  ]),
  gate("stylelint", npx, ["--no-install", "stylelint", "src/**/*.css"]),
  gate("html", npx, ["--no-install", "html-validate", "example/**/*.html", "registry/**/*.html"]),
  gate("dependency-architecture", npx, [
    "--no-install",
    "depcruise",
    "src",
    "server",
    "registry/blocks",
    "bin",
    "scripts",
    "--config",
    ".dependency-cruiser.cjs",
    "--output-type",
    "err",
  ]),
  gate("unused-code", npx, ["--no-install", "knip", "--config", "knip.json"]),
  gate("duplication", npx, ["--no-install", "jscpd"]),
  gate("markdown", npx, ["--no-install", "markdownlint-cli2"]),
  gate("spelling", npx, ["--no-install", "cspell", "README.md", "AGENTS.md", "docs/**/*.md"]),
  gate("links", node, ["scripts/quality/check-links.mjs"]),
  gate("licenses", node, ["scripts/quality/check-licenses.mjs"]),
  gate(
    "external-tool-self-test",
    node,
    ["scripts/quality/tool-self-test.mjs"],
    ["delivery", "full-audit"],
  ),
  gate(
    "semgrep",
    "semgrep",
    ["scan", "--config", ".semgrep.yml", "--error", "--strict", "--metrics", "off", "."],
    ["delivery", "full-audit"],
    300_000,
  ),
  gate(
    "gitleaks-history",
    "gitleaks",
    ["git", ".", "--log-opts=HEAD", "--no-banner", "--no-color", "--redact", "--verbose"],
    ["delivery", "full-audit"],
    300_000,
  ),
  gate(
    "gitleaks-worktree",
    "gitleaks",
    ["dir", ".", "--no-banner", "--redact"],
    ["delivery", "full-audit"],
    300_000,
  ),
  gate("npm-audit", npm, ["audit", "--audit-level=moderate"], ["delivery", "full-audit"], 300_000),
  gate(
    "osv",
    "osv-scanner",
    ["scan", "source", "--lockfile", "package-lock.json"],
    ["delivery", "full-audit"],
    300_000,
  ),
];

const signalProbeGate = gate(
  "signal-cleanup-probe",
  node,
  [
    "-e",
    "require('node:fs').writeFileSync(process.env.JQS_STATIC_SIGNAL_PID_FILE, String(process.pid)); setInterval(() => {}, 1000)",
  ],
  ["fast", "delivery", "full-audit"],
  30_000,
);

function escapeWorkflowCommandData(value) {
  return String(value).replaceAll("%", "%25").replaceAll("\r", "%0D").replaceAll("\n", "%0A");
}

function escapeWorkflowCommandProperty(value) {
  return escapeWorkflowCommandData(value).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

export function githubErrorAnnotation(result) {
  const title = escapeWorkflowCommandProperty(`Static gate ${result.id}`);
  const detail = escapeWorkflowCommandData(
    result.reason ?? `See ${result.log ?? "the retained static quality report"}`,
  );
  return `::error title=${title}::${detail}`;
}

async function supplementalGates(paths) {
  const selected = [];
  const shell = paths.filter(
    (path) => /\.(?:sh|bash|zsh)$/.test(path) || path.startsWith(".githooks/"),
  );
  if (shell.length > 0) selected.push(gate("shellcheck", "shellcheck", shell));
  const workflows = paths.filter((path) => /^\.github\/workflows\/.*\.ya?ml$/.test(path));
  if (workflows.length > 0) selected.push(gate("actionlint", "actionlint", workflows));
  return selected;
}

export async function executeStaticGates({
  mode,
  selected,
  runId,
  runDirectory,
  scopePath,
  root = repositoryRoot,
  runGateImplementation = runGate,
  writeJson = writeAtomicJson,
  emit = (message) => process.stdout.write(message),
  interruption = () => undefined,
}) {
  if (selected.length === 0) throw new Error(`Static ${mode} selected no gates.`);
  const startedAt = new Date().toISOString();
  const versionCache = new Map();
  const results = [];
  for (const [index, item] of selected.entries()) {
    const interruptedBeforeStart = interruption();
    if (interruptedBeforeStart) {
      const now = new Date().toISOString();
      for (const skipped of selected.slice(index)) {
        results.push({
          id: skipped.id,
          kind: "analysis",
          command: { executable: skipped.command, args: skipped.args },
          timeoutMs: skipped.timeoutMs,
          selection: { selected: true, reason: "configured for this static mode" },
          status: "error",
          enforced: true,
          reason: `static runner was interrupted by ${interruptedBeforeStart} before invocation`,
          exitCode: null,
          signal: interruptedBeforeStart,
          startedAt: now,
          endedAt: now,
          durationMs: 0,
          toolVersion: "unavailable (runner interrupted)",
        });
      }
      break;
    }
    emit(`[static:${item.id}] running\n`);
    try {
      results.push(
        await runGateImplementation({
          gate: item,
          root,
          logDirectory: join(runDirectory, "static-logs"),
          runId,
          runDirectory,
          scopePath,
          versionCache,
          interruption,
        }),
      );
    } catch (error) {
      const now = new Date().toISOString();
      results.push({
        id: item.id,
        kind: "analysis",
        command: { executable: item.command, args: item.args },
        timeoutMs: item.timeoutMs,
        selection: { selected: true, reason: "configured for this static mode" },
        status: "error",
        enforced: true,
        reason: `gate result could not be recorded: ${error instanceof Error ? error.message : String(error)}`,
        exitCode: null,
        signal: null,
        startedAt: now,
        endedAt: now,
        durationMs: 0,
        toolVersion: "unavailable",
      });
    }

    const interruptedAfterGate = interruption();
    if (interruptedAfterGate) {
      const now = new Date().toISOString();
      for (const skipped of selected.slice(index + 1)) {
        results.push({
          id: skipped.id,
          kind: "analysis",
          command: { executable: skipped.command, args: skipped.args },
          timeoutMs: skipped.timeoutMs,
          selection: { selected: true, reason: "configured for this static mode" },
          status: "error",
          enforced: true,
          reason: `static runner was interrupted by ${interruptedAfterGate} before invocation`,
          exitCode: null,
          signal: interruptedAfterGate,
          startedAt: now,
          endedAt: now,
          durationMs: 0,
          toolVersion: "unavailable (runner interrupted)",
        });
      }
      break;
    }
  }
  const interruptedBy = interruption();
  let status =
    interruptedBy || results.some((result) => result.status === "error") ? "error" : "pass";
  if (status === "pass" && results.some((result) => result.status !== "pass")) status = "fail";
  const report = {
    schema: "jqstar-static-report/1",
    runId,
    mode,
    status,
    startedAt,
    endedAt: new Date().toISOString(),
    selectedGateCount: selected.length,
    gates: results,
    ...(interruptedBy ? { interruptedBy } : {}),
  };
  const reportPath = join(runDirectory, "static-report.json");
  await writeJson(reportPath, report);
  return { report, reportPath };
}

export async function runStatic(mode, { interruption = () => undefined } = {}) {
  if (!new Set(["fast", "delivery", "full-audit"]).has(mode))
    throw new Error(`Unknown static gate mode: ${mode}`);
  if (mode === "full-audit" && !process.argv.includes("--acknowledge-full-audit")) {
    throw new Error("Full static audit requires --acknowledge-full-audit.");
  }
  const signalProbe = process.argv.includes("--signal-cleanup-probe");
  if (signalProbe && !process.env.JQS_STATIC_SIGNAL_PID_FILE) {
    throw new Error("The signal cleanup probe requires JQS_STATIC_SIGNAL_PID_FILE.");
  }
  const paths = signalProbe ? [] : await qualityPaths();
  const selected = signalProbe
    ? [signalProbeGate]
    : [...gates, ...(await supplementalGates(paths))].filter(({ modes }) => modes.includes(mode));
  const startedAt = new Date().toISOString();
  const runId =
    process.env.JQS_QUALITY_RUN_ID ?? `static-${startedAt.replaceAll(/[:.]/g, "-")}-${process.pid}`;
  const runDirectory = process.env.JQS_QUALITY_RUN_DIRECTORY
    ? resolve(process.env.JQS_QUALITY_RUN_DIRECTORY)
    : join(await gitDirectory(repositoryRoot), "jqstar", "static-runs", runId);
  const scopePath = process.env.JQS_QUALITY_SCOPE_FILE ?? join(runDirectory, "static-scope.json");
  const outcome = await executeStaticGates({
    mode,
    selected,
    runId,
    runDirectory,
    scopePath,
    interruption,
  });
  for (const result of outcome.report.gates) {
    process.stdout.write(
      `${result.status.toUpperCase().padEnd(5)} ${result.id}${result.reason ? `: ${result.reason}` : ""}\n`,
    );
    if (process.env.GITHUB_ACTIONS === "true" && ["fail", "error"].includes(result.status)) {
      process.stdout.write(`${githubErrorAnnotation(result)}\n`);
    }
  }
  process.stdout.write(
    `${outcome.report.status.toUpperCase()} static ${mode} report: ${outcome.reportPath}\n`,
  );
  return outcome;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  let interruptedSignal;
  const handleSignal = (signal) => {
    interruptedSignal ??= signal;
    terminateActiveChildren(signal);
  };
  const handleInterrupt = () => handleSignal("SIGINT");
  const handleTermination = () => handleSignal("SIGTERM");
  process.once("SIGINT", handleInterrupt);
  process.once("SIGTERM", handleTermination);
  try {
    const { report } = await runStatic(process.argv[2] ?? "fast", {
      interruption: () => interruptedSignal,
    });
    process.exitCode = report.status === "pass" && !interruptedSignal ? 0 : 1;
  } finally {
    process.off("SIGINT", handleInterrupt);
    process.off("SIGTERM", handleTermination);
  }
}

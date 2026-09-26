#!/usr/bin/env node
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import {
  changedPaths,
  fingerprint,
  gitDirectory,
  gitHead,
  repositoryRoot,
} from "./lib/git-state.mjs";
import { inspectPhaseReport, inspectTicket } from "./lib/ticket.mjs";
import { verifyReceipt } from "./verify-receipt.mjs";
import { createSchemaValidator } from "./validate-json.mjs";

const validatorRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

function sameFingerprint(left, right) {
  return (
    left?.algorithm === right?.algorithm &&
    left?.digest === right?.digest &&
    left?.fileCount === right?.fileCount
  );
}

export async function validatePhaseEvidence({ root, reportPath, phase }) {
  let report;
  let reportSource;
  try {
    reportSource = await readFile(reportPath);
    report = JSON.parse(reportSource.toString("utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`phase report is missing or unreadable (${detail})`, { cause: error });
  }

  const schema = JSON.parse(
    await readFile(path.join(validatorRoot, "schema", "quality-report.schema.json"), "utf8"),
  );
  const validate = createSchemaValidator(schema);
  if (!validate(report)) {
    throw new Error(
      `phase report violates schema/quality-report.schema.json: ${JSON.stringify(validate.errors)}`,
    );
  }

  const reportErrors = inspectPhaseReport(report, phase);
  if (reportErrors.length > 0) throw new Error(reportErrors.join("; "));

  const [currentFingerprint, currentHead] = await Promise.all([fingerprint(root), gitHead(root)]);
  if (report.head !== currentHead) {
    throw new Error("phase report is stale because HEAD changed");
  }
  if (!sameFingerprint(report.startFingerprint, report.endFingerprint)) {
    throw new Error("phase report does not bind one unchanged worktree state");
  }
  if (!sameFingerprint(report.endFingerprint, currentFingerprint)) {
    throw new Error("phase report is stale because gated files changed");
  }

  if (phase === "test") {
    const { receipt } = await verifyReceipt(root);
    const latestReportPath = path.join(await gitDirectory(root), "jqstar", "latest-report.json");
    const authorizedPath = [receipt.reportPath, latestReportPath].some(
      (candidate) => path.resolve(candidate) === path.resolve(reportPath),
    );
    const reportSha256 = createHash("sha256").update(reportSource).digest("hex");
    if (
      receipt.runId !== report.runId ||
      !authorizedPath ||
      receipt.reportSha256 !== reportSha256
    ) {
      throw new Error("test phase report is not the report authorized by the current receipt");
    }
  }
  return report;
}

function parseArguments(argv) {
  const files = [];
  let changed = false;
  let phase;
  let report;
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--changed") changed = true;
    else if (value === "--phase") phase = argv[++index];
    else if (value === "--report") report = argv[++index];
    else if (value === "--ticket") files.push(argv[++index]);
    else throw new Error(`unknown argument: ${value}`);
  }
  if (phase && !["plan", "code", "test", "document"].includes(phase)) {
    throw new Error("--phase must be plan, code, test, or document");
  }
  if (!changed && files.length === 0)
    throw new Error("provide --changed or at least one --ticket path");
  if (["code", "test"].includes(phase) && !report) {
    throw new Error(`--phase ${phase} requires --report with the matching quality report`);
  }
  return { changed, files, phase, report };
}

function isTicket(relative) {
  return /^docs\/tickets\/\d{4}-[^/]+\.md$/.test(relative.replaceAll("\\", "/"));
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  const root = await repositoryRoot();
  let phaseReport;
  if (options.report) {
    phaseReport = await validatePhaseEvidence({
      root,
      reportPath: path.resolve(root, options.report),
      phase: options.phase,
    });
  }
  const selected = new Set(
    options.files.map((file) =>
      path.relative(root, path.resolve(root, file)).replaceAll("\\", "/"),
    ),
  );
  if (options.changed) {
    let paths;
    const scopeFile = process.env.JQS_QUALITY_SCOPE_FILE;
    if (scopeFile) {
      const scope = JSON.parse(await readFile(scopeFile, "utf8"));
      if (scope.schema !== "jqstar-quality-scope/1")
        throw new Error("quality scope uses an unsupported schema");
      paths = scope.changedPaths;
    } else {
      paths = await changedPaths(root);
    }
    for (const file of paths.filter(isTicket)) selected.add(file);
  }

  if (selected.size === 0) {
    process.stdout.write("SKIP ticket-workflow: no changed numbered ticket\n");
    return;
  }

  let failed = false;
  for (const relative of [...selected].sort()) {
    if (!isTicket(relative)) throw new Error(`not a numbered ticket: ${relative}`);
    const markdown = await readFile(path.join(root, relative), "utf8");
    const result = inspectTicket(markdown, {
      requestedPhase: options.phase,
      phaseReport,
    });
    if (result.errors.length === 0) {
      process.stdout.write(`PASS ${relative} (${result.metadata.status})\n`);
      continue;
    }
    failed = true;
    process.stderr.write(`FAIL ${relative} (${result.metadata.status ?? "unknown"})\n`);
    for (const error of result.errors) process.stderr.write(`  - ${error}\n`);
  }
  if (failed) process.exitCode = 1;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  main().catch((error) => {
    process.stderr.write(`ticket workflow error: ${error.message}\n`);
    process.exitCode = 1;
  });
}

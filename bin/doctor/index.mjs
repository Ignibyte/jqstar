import { readFile } from "node:fs/promises";
import { DoctorFault, MetadataReader, parseJSON, projectRoot, record, text } from "./data.mjs";
import { discover } from "./discovery.mjs";
import { checkEntrypoints, evaluate, migrateSummary, safePackage } from "./rules.mjs";

const help = `jQStar package upgrade diagnostics

Usage:
  jqstar doctor --packages --cwd <project> [--json | --quiet]
                [--entrypoint <package-entry>] [--format <esm|commonjs|umd|css>]
                [--migrate-summary <project-relative-json>]
  jqstar doctor --upgrade-config --cwd <project> [--json] [--dry-run]
  jqstar doctor --apply <project-relative-plan> --cwd <project> [--json]
  jqstar doctor --rollback <project-relative-journal> --cwd <project> [--json]

Package checks read local metadata only. Configuration upgrades default to a dry run.
Apply and rollback require explicit reviewed recovery metadata. No package manager is run.
Exit codes: 0 no incompatibility errors; 1 incompatibility; 2 usage/input/operation failure.
`;

function argumentsFor(argv) {
  const options = { cwd: process.cwd(), json: false, quiet: false, entrypoints: [], format: "esm" };
  const positionals = [];
  const valueFlags = new Map([
    ["--cwd", "cwd"],
    ["--format", "format"],
    ["--migrate-summary", "migrateSummary"],
    ["--apply", "apply"],
    ["--rollback", "rollback"],
  ]);
  const booleanFlags = new Map([
    ["--packages", "packages"],
    ["--upgrade-config", "upgradeConfig"],
    ["--json", "json"],
    ["--quiet", "quiet"],
    ["--dry-run", "dryRun"],
    ["--help", "help"],
    ["-h", "help"],
  ]);
  const seen = new Set();
  for (let index = 0; index < argv.length; index++) {
    const flag = argv[index];
    if (flag === "--entrypoint") {
      const value = argv[++index];
      if (!text(value) || value.startsWith("-") || options.entrypoints.length >= 32)
        throw new DoctorFault("JQS_INPUT_INVALID");
      options.entrypoints.push(value);
    } else if (valueFlags.has(flag)) {
      const value = argv[++index];
      if (!text(value) || value.startsWith("-") || seen.has(flag))
        throw new DoctorFault("JQS_INPUT_INVALID");
      seen.add(flag);
      options[valueFlags.get(flag)] = value;
    } else if (booleanFlags.has(flag)) {
      if (seen.has(flag)) throw new DoctorFault("JQS_INPUT_INVALID");
      seen.add(flag);
      options[booleanFlags.get(flag)] = true;
    } else if (flag.startsWith("-")) throw new DoctorFault("JQS_INPUT_INVALID");
    else positionals.push(flag);
  }
  if (positionals.length !== 1 || positionals[0] !== "doctor")
    throw new DoctorFault("JQS_INPUT_INVALID");
  if (options.help) return options;
  const modes = [options.packages, options.upgradeConfig, options.apply, options.rollback].filter(
    Boolean,
  );
  if (
    modes.length !== 1 ||
    (options.json && options.quiet) ||
    !["esm", "commonjs", "umd", "css"].includes(options.format) ||
    (!options.packages &&
      (options.entrypoints.length > 0 || options.migrateSummary || seen.has("--format"))) ||
    (options.dryRun && !options.upgradeConfig)
  )
    throw new DoctorFault("JQS_INPUT_INVALID");
  return options;
}

function newReport(rules) {
  return {
    schema: "jqstar-doctor-report/1",
    version: rules?.compatibility.version ?? null,
    project: ".",
    rulesReviewedAt: rules?.reviewedAt ?? null,
    complete: true,
    exitCode: 0,
    summary: { errors: 0, warnings: 0, unknown: 0, info: 0 },
    scan: { files: 0, bytes: 0, packageRecords: 0, workspaceManifests: 0 },
    diagnostics: [],
  };
}

function emitter(report, rules) {
  const registry = new Map(rules.diagnostics.map((rule) => [rule.code, rule]));
  const seen = new Set();
  return (code, values = {}, final = false) => {
    const rule = registry.get(code);
    if (!rule) throw new DoctorFault("JQS_INTERNAL_ERROR");
    const diagnostic = {
      code,
      severity: rule.severity,
      evidence: values.kind ?? "input",
      summary: rule.summary,
      path: text(values.path) ?? ".",
      package: safePackage(values.package),
      observed: text(values.observed) ?? null,
      expected: text(values.expected) ?? null,
      documentation: rule.documentation,
      correction: rule.correction,
    };
    const key = JSON.stringify(diagnostic);
    if (!seen.has(key)) {
      if (report.diagnostics.length >= rules.limits.diagnostics - 1 && !final)
        throw new DoctorFault("JQS_SCAN_TRUNCATED", ".", 0);
      seen.add(key);
      report.diagnostics.push(diagnostic);
    }
  };
}

function finalize(report, executionExit) {
  report.diagnostics.sort((left, right) => {
    const a = JSON.stringify([left.code, left.path, left.package, left.evidence, left.observed]);
    const b = JSON.stringify([
      right.code,
      right.path,
      right.package,
      right.evidence,
      right.observed,
    ]);
    return a < b ? -1 : a > b ? 1 : 0;
  });
  const keys = { error: "errors", warning: "warnings", unknown: "unknown", info: "info" };
  for (const diagnostic of report.diagnostics) report.summary[keys[diagnostic.severity]]++;
  report.exitCode = executionExit === 2 ? 2 : report.summary.errors > 0 ? 1 : 0;
  return report;
}

function human(report) {
  const lines = [`jQStar package diagnostics (${report.complete ? "complete" : "incomplete"})`];
  for (const diagnostic of report.diagnostics) {
    lines.push(
      `${diagnostic.severity} ${diagnostic.code} ${diagnostic.path}: ${diagnostic.summary}`,
    );
    if (diagnostic.observed !== null) lines.push(`  Observed: ${diagnostic.observed}`);
    if (diagnostic.expected !== null) lines.push(`  Expected: ${diagnostic.expected}`);
    lines.push(`  ${diagnostic.documentation}`);
  }
  lines.push(
    `${report.summary.errors} errors, ${report.summary.warnings} warnings, ${report.summary.unknown} unknown.`,
  );
  return `${lines.join("\n")}\n`;
}

async function loadRules() {
  const rules = parseJSON(await readFile(new URL("./compatibility.json", import.meta.url), "utf8"));
  if (
    !record(rules) ||
    rules.schema !== "jqstar-doctor-rules/1" ||
    !Array.isArray(rules.diagnostics) ||
    !record(rules.compatibility) ||
    !record(rules.limits)
  )
    throw new DoctorFault("JQS_INTERNAL_ERROR");
  return rules;
}

function unavailableRulesReport() {
  const report = newReport();
  report.complete = false;
  report.diagnostics.push({
    code: "JQS_INTERNAL_ERROR",
    severity: "error",
    evidence: "input",
    summary: "The installed compatibility rules could not be loaded.",
    path: ".",
    package: null,
    observed: null,
    expected: null,
    documentation: "https://github.com/Ignibyte/jqstar/blob/main/docs/UPGRADES.md",
    correction: "Restore a complete installed package before running diagnostics.",
  });
  return finalize(report, 2);
}

export async function packageReport(options, rules, clock = {}) {
  const report = newReport(rules);
  const emit = emitter(report, rules);
  let reader;
  let executionExit = 0;
  try {
    reader = new MetadataReader(await projectRoot(options.cwd), rules.limits);
    const discovery = await discover(reader, emit);
    evaluate(
      discovery,
      rules,
      {
        ...options,
        nodeVersion: clock.nodeVersion ?? process.versions.node,
        today: clock.today ?? new Date().toISOString().slice(0, 10),
      },
      emit,
    );
    reader.check();
    await checkEntrypoints(reader, discovery, rules, options, emit);
    await migrateSummary(reader, options.migrateSummary, emit);
    reader.check();
  } catch (error) {
    const fault = error instanceof DoctorFault ? error : new DoctorFault("JQS_INTERNAL_ERROR");
    report.complete = false;
    executionExit = fault.exitCode;
    emit(
      fault.code,
      { path: fault.path, kind: fault.code === "JQS_SCAN_TRUNCATED" ? "limit" : "input" },
      true,
    );
  }
  if (reader)
    Object.assign(report.scan, {
      files: reader.files,
      bytes: reader.bytes,
      packageRecords: reader.packageRecords,
      workspaceManifests: reader.workspaceManifests,
    });
  return finalize(report, executionExit);
}

export async function runDoctor(argv, io = process) {
  let options;
  let rules;
  try {
    options = argumentsFor(argv);
    if (options.help) {
      io.stdout.write(help);
      return 0;
    }
    rules = await loadRules();
    if (!options.packages) {
      const { runMigration } = await import("./migrations.mjs");
      const result = await runMigration(options, rules);
      if (!options.quiet) io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }
    const report = await packageReport(options, rules);
    if (!options.quiet)
      io.stdout.write(options.json ? `${JSON.stringify(report, null, 2)}\n` : human(report));
    return report.exitCode;
  } catch (error) {
    const code = error instanceof DoctorFault ? error.code : "JQS_INTERNAL_ERROR";
    if (!rules && argv.includes("--json")) {
      try {
        rules = await loadRules();
      } catch {
        io.stdout.write(`${JSON.stringify(unavailableRulesReport(), null, 2)}\n`);
        return 2;
      }
    }
    if (rules && (options?.json || argv.includes("--json"))) {
      const report = newReport(rules);
      report.complete = false;
      if (error instanceof DoctorFault && error.recovery) report.recovery = error.recovery;
      emitter(report, rules)(
        code,
        { path: error instanceof DoctorFault ? error.path : ".", kind: "input" },
        true,
      );
      io.stdout.write(`${JSON.stringify(finalize(report, 2), null, 2)}\n`);
    } else if (!options?.quiet)
      io.stderr.write(`jqstar: ${code}. Use jqstar doctor --packages --help for usage.\n`);
    return 2;
  }
}

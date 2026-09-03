import { isAbsolute, relative } from "node:path";

import ts from "typescript";

import { repoRoot } from "./lib.mjs";

const METRICS = ["lines", "functions", "branches", "statements"];
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";
const RATCHET_COMPARISON = "immutable-delivery-base";
const FIRST_BASELINE = "establish-when-base-has-no-thresholds";

function normalizedPath(path) {
  const candidate = isAbsolute(path) ? relative(repoRoot, path) : path;
  return candidate.replace(/^\.\//u, "").split("\\").join("/");
}

function normalizedCoverage(coverage) {
  return Object.fromEntries(
    Object.entries(coverage).map(([path, value]) => [normalizedPath(path), value]),
  );
}

function metricFailures(label, actual, floors) {
  const failures = [];
  for (const metric of METRICS) {
    if (floors[metric] === undefined) continue;
    if (!actual?.[metric] || actual[metric].total === 0) {
      failures.push(`${label} ${metric} has an empty denominator.`);
    } else if (actual[metric].pct < floors[metric]) {
      failures.push(`${label} ${metric} ${actual[metric].pct}% is below ${floors[metric]}%.`);
    }
  }
  return failures;
}

function statementLines(fileCoverage) {
  const lines = new Map();
  for (const [id, location] of Object.entries(fileCoverage.statementMap ?? {})) {
    for (let line = location.start.line; line <= location.end.line; line += 1) {
      const counts = lines.get(line) ?? [];
      counts.push(fileCoverage.s[id] ?? 0);
      lines.set(line, counts);
    }
  }
  return lines;
}

function decodeVlq(segment, start) {
  let value = 0;
  let shift = 0;
  let index = start;
  while (index < segment.length) {
    const digit = BASE64.indexOf(segment[index]);
    if (digit === -1) throw new Error("TypeScript emitted an invalid source map.");
    index += 1;
    value += (digit & 31) << shift;
    if ((digit & 32) === 0) {
      const negative = (value & 1) === 1;
      const decoded = value >> 1;
      return { value: negative ? -decoded : decoded, index };
    }
    shift += 5;
  }
  throw new Error("TypeScript emitted a truncated source-map segment.");
}

function segmentValues(segment) {
  const values = [];
  let index = 0;
  while (index < segment.length) {
    const decoded = decodeVlq(segment, index);
    values.push(decoded.value);
    index = decoded.index;
  }
  return values;
}

export function emittedRuntimeLines(source, path) {
  const transpiled = ts.transpileModule(source, {
    fileName: path,
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      sourceMap: true,
      target: ts.ScriptTarget.ES2022,
    },
  });
  if (!transpiled.sourceMapText) throw new Error(`${path}: TypeScript emitted no source map.`);
  const sourceMap = JSON.parse(transpiled.sourceMapText);
  const runtimeLines = new Set();
  let sourceIndex = 0;
  let originalLine = 0;
  let originalColumn = 0;
  let nameIndex = 0;
  for (const generatedLine of sourceMap.mappings.split(";")) {
    for (const segment of generatedLine.split(",").filter(Boolean)) {
      const values = segmentValues(segment);
      if (values.length < 4) continue;
      sourceIndex += values[1];
      originalLine += values[2];
      originalColumn += values[3];
      if (values.length === 5) nameIndex += values[4];
      if (sourceIndex === 0) runtimeLines.add(originalLine + 1);
    }
  }
  void originalColumn;
  void nameIndex;
  return runtimeLines;
}

function sourceLineEvidence(source, path) {
  const sourceFile = ts.createSourceFile(path, source, ts.ScriptTarget.Latest, true);
  const moduleLinkageLines = new Set();
  for (const statement of sourceFile.statements) {
    if (!ts.isImportDeclaration(statement) && !ts.isExportDeclaration(statement)) continue;
    const start = sourceFile.getLineAndCharacterOfPosition(statement.getStart(sourceFile)).line + 1;
    const end = sourceFile.getLineAndCharacterOfPosition(statement.end).line + 1;
    for (let line = start; line <= end; line += 1) moduleLinkageLines.add(line);
  }
  const formatOnlyLines = new Set();
  for (const [index, text] of source.split("\n").entries()) {
    const trimmed = text.trim();
    const withoutDelimiters = trimmed.replace(/[()[\]{};,`]/gu, "").trim();
    if (
      trimmed === "" ||
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      withoutDelimiters === "" ||
      withoutDelimiters === "as const"
    ) {
      formatOnlyLines.add(index + 1);
    }
  }
  return { formatOnlyLines, moduleLinkageLines };
}

function changedCoverage(finalCoverage, scope, coveredPaths, sourcesByPath) {
  const files = normalizedCoverage(finalCoverage);
  const failures = [];
  const result = [];
  for (const path of scope.changedPaths.filter((candidate) => coveredPaths.has(candidate))) {
    const coverage = files[path];
    if (!coverage) {
      failures.push(`${path}: changed production file is absent from coverage-final.json.`);
      continue;
    }
    const changed = new Set(scope.changedLines[path] ?? []);
    const lines = statementLines(coverage);
    const source = sourcesByPath[path];
    let emittedLines = new Set();
    let sourceEvidence = { formatOnlyLines: new Set(), moduleLinkageLines: new Set() };
    if (typeof source === "string") {
      try {
        emittedLines = emittedRuntimeLines(source, path);
        sourceEvidence = sourceLineEvidence(source, path);
      } catch (error) {
        failures.push(`${path}: runtime-line classification failed: ${error.message}`);
      }
    }
    const coverageMappedLines = [...changed]
      .filter((line) => lines.has(line))
      .sort((a, b) => a - b);
    const absentFromCoverage = [...changed]
      .filter((line) => !lines.has(line))
      .sort((a, b) => a - b);
    const coverageMapExemptEvidence = absentFromCoverage
      .filter((line) => sourceEvidence.moduleLinkageLines.has(line))
      .map((line) => ({ line, reason: "module-linkage syntax" }));
    const exemptLines = new Set(coverageMapExemptEvidence.map(({ line }) => line));
    const typeOrFormatEvidence =
      typeof source === "string"
        ? absentFromCoverage
            .filter((line) => !exemptLines.has(line))
            .filter((line) => !emittedLines.has(line) || sourceEvidence.formatOnlyLines.has(line))
            .map((line) => ({
              line,
              reason: sourceEvidence.formatOnlyLines.has(line)
                ? "syntax, comment, or formatting only"
                : "erased by TypeScript with no emitted runtime mapping",
            }))
        : [];
    const typeOrFormatOnlyLines = typeOrFormatEvidence.map(({ line }) => line);
    const classifiedAbsentLines = new Set([
      ...typeOrFormatOnlyLines,
      ...coverageMapExemptEvidence.map(({ line }) => line),
    ]);
    const unexplainedLines =
      typeof source === "string"
        ? absentFromCoverage.filter((line) => !classifiedAbsentLines.has(line))
        : absentFromCoverage;
    const executableLines = [...coverageMappedLines, ...exemptLines].sort((a, b) => a - b);
    const uncoveredLines = coverageMappedLines.filter((line) =>
      lines.get(line).some((count) => count === 0),
    );
    const changedFunctions = Object.entries(coverage.fnMap ?? {}).filter(([, fn]) => {
      const location = fn.loc ?? fn.decl;
      return [...changed].some((line) => line >= location.start.line && line <= location.end.line);
    });
    const uncoveredFunctions = changedFunctions
      .filter(([id]) => (coverage.f[id] ?? 0) === 0)
      .map(([, fn]) => fn.name || `<anonymous@${fn.loc?.start.line ?? fn.decl.start.line}>`);
    if (typeof source !== "string") {
      failures.push(`${path}: source text is unavailable for changed-line classification.`);
    }
    if (unexplainedLines.length > 0) {
      failures.push(
        `${path}: runtime-emitting changed lines absent from coverage maps ${unexplainedLines.join(
          ", ",
        )}.`,
      );
    }
    if (uncoveredLines.length > 0)
      failures.push(`${path}: uncovered changed lines ${uncoveredLines.join(", ")}.`);
    if (uncoveredFunctions.length > 0)
      failures.push(`${path}: uncovered changed functions ${uncoveredFunctions.join(", ")}.`);
    result.push({
      path,
      changedLines: [...changed].sort((a, b) => a - b),
      executableLines,
      coverageMappedLines,
      coverageMapExemptEvidence,
      typeOrFormatOnlyLines,
      typeOrFormatEvidence,
      unexplainedLines,
      uncoveredLines,
      changedFunctions: changedFunctions.length,
      uncoveredFunctions,
    });
  }
  return {
    status: result.length === 0 ? "not-measured" : failures.length === 0 ? "pass" : "fail",
    reason: result.length === 0 ? "no changed instrumented production file" : undefined,
    files: result,
    failures,
  };
}

function compareThresholdGroup(current, baseline, label, failures) {
  for (const [path, baselineFloors] of Object.entries(baseline ?? {})) {
    const currentFloors = current?.[path];
    if (!currentFloors) {
      failures.push(`${label}.${path} was removed from the immutable-base thresholds.`);
      continue;
    }
    for (const [metric, baselineValue] of Object.entries(baselineFloors)) {
      const currentValue = currentFloors[metric];
      if (typeof currentValue !== "number" || currentValue < baselineValue) {
        failures.push(
          `${label}.${path}.${metric} ${String(
            currentValue,
          )} weakens immutable-base value ${baselineValue}.`,
        );
      }
    }
  }
}

export function evaluateCoverageThresholdRatchet(current, baseline, baseRevision) {
  const failures = [];
  if (current.ratchet?.comparison !== RATCHET_COMPARISON) {
    failures.push(`Coverage threshold ratchet comparison must be ${RATCHET_COMPARISON}.`);
  }
  if (current.ratchet?.firstBaseline !== FIRST_BASELINE) {
    failures.push(`Coverage threshold first-baseline rule must be ${FIRST_BASELINE}.`);
  }
  if (!baseRevision) {
    return {
      status: failures.length === 0 ? "not-applicable" : "fail",
      baseRevision: null,
      reason: "standalone scope has no immutable delivery base",
      failures,
    };
  }
  if (!baseline) {
    return {
      status: failures.length === 0 ? "first-baseline" : "fail",
      baseRevision,
      reason: "immutable delivery base has no coverage thresholds",
      failures,
    };
  }
  compareThresholdGroup(
    { global: current.global },
    { global: baseline.global },
    "global",
    failures,
  );
  compareThresholdGroup(current.subsystems, baseline.subsystems, "subsystems", failures);
  compareThresholdGroup(
    current.stabilizationTargets,
    baseline.stabilizationTargets,
    "stabilizationTargets",
    failures,
  );
  return {
    status: failures.length === 0 ? "pass" : "fail",
    baseRevision,
    reason: "compared with coverage thresholds at immutable delivery base",
    failures,
  };
}

export function verifyExecutedTestEvidence(manifest, runnerOutput) {
  const failures = [];
  if (manifest?.$schema !== "jqstar-test-evidence/1") {
    failures.push("Test-evidence manifest has an unsupported schema.");
  }
  if (!runnerOutput?.success) failures.push("Machine-readable test run did not pass.");
  const assertions = (runnerOutput?.testResults ?? []).flatMap((file) => {
    const path = normalizedPath(file.name ?? "");
    return (file.assertionResults ?? []).map((assertion) => ({
      path,
      title: assertion.title,
      status: assertion.status,
    }));
  });
  const seenIds = new Set();
  const seenTargets = new Set();
  const mappings = [];
  for (const requirement of manifest?.requirements ?? []) {
    if (seenIds.has(requirement.id)) failures.push(`Duplicate test-evidence id ${requirement.id}.`);
    seenIds.add(requirement.id);
    const target = `${requirement.file}\0${requirement.test}`;
    if (seenTargets.has(target)) {
      failures.push(`${requirement.id}: multiple requirements target the same executed test.`);
    }
    seenTargets.add(target);
    const matches = assertions.filter(
      (assertion) => assertion.path === requirement.file && assertion.title === requirement.test,
    );
    const passed = matches.length === 1 && matches[0].status === "passed";
    if (matches.length !== 1) {
      failures.push(
        `${requirement.id}: expected exactly one executed test, found ${matches.length}.`,
      );
    } else if (!passed) {
      failures.push(`${requirement.id}: executed test status was ${matches[0].status}.`);
    }
    mappings.push({
      id: requirement.id,
      file: requirement.file,
      test: requirement.test,
      matches: matches.length,
      passed,
    });
  }
  return {
    status: failures.length === 0 ? "pass" : "fail",
    runnerSuccess: runnerOutput?.success === true,
    totalRequirements: manifest?.requirements?.length ?? 0,
    matchedRequirements: mappings.filter((mapping) => mapping.passed).length,
    mappings,
    failures,
  };
}

export function evaluateCoverage({
  summary,
  finalCoverage,
  thresholds,
  scope,
  coveredPaths,
  stabilization,
  sourcesByPath = {},
  executedEvidence,
  thresholdRatchet,
}) {
  const normalizedSummary = normalizedCoverage(summary);
  const failures = metricFailures("global", summary.total, thresholds.global);
  const subsystemFloors = stabilization ? thresholds.stabilizationTargets : thresholds.subsystems;
  for (const [path, floors] of Object.entries(subsystemFloors)) {
    failures.push(...metricFailures(path, normalizedSummary[path], floors));
  }
  const changed = changedCoverage(finalCoverage, scope, coveredPaths, sourcesByPath);
  failures.push(...changed.failures);
  if (!executedEvidence) failures.push("Executed test evidence was not evaluated.");
  else failures.push(...executedEvidence.failures);
  if (!thresholdRatchet) failures.push("Coverage threshold ratchet was not evaluated.");
  else if (thresholdRatchet.status === "fail") failures.push(...thresholdRatchet.failures);
  return {
    status: failures.length === 0 ? "pass" : "fail",
    stabilization,
    denominator: summary.total,
    thresholds: {
      global: thresholds.global,
      subsystems: subsystemFloors,
    },
    thresholdRatchet,
    executedEvidence,
    changed,
    failures,
  };
}

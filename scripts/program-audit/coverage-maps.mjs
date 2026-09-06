import assert from "node:assert/strict";
import { isAbsolute, resolve } from "node:path";
import { sameKeys, safeRelativePath, sha256 } from "./contracts.mjs";

const metrics = ["lines", "functions", "statements", "branches"];
const percent = (covered, total) =>
  total === 0 ? 100 : Math.floor((100000 * covered) / total / 10) / 100;

function measurement(counts) {
  assert(
    counts.every((count) => Number.isSafeInteger(count) && count >= 0),
    "Invalid coverage hit count",
  );
  const covered = counts.filter((count) => count > 0).length;
  return { total: counts.length, covered, skipped: 0, pct: percent(covered, counts.length) };
}

function checkLocation(location, sourceLines) {
  for (const point of [location.start, location.end]) {
    assert(
      Number.isSafeInteger(point.line) && point.line > 0 && point.line <= sourceLines.length,
      "Coverage line is outside the frozen source",
    );
    assert(
      Number.isSafeInteger(point.column) &&
        point.column >= 0 &&
        point.column <= sourceLines[point.line - 1].length,
      "Coverage column is outside the frozen source",
    );
  }
  assert(
    location.end.line > location.start.line ||
      (location.end.line === location.start.line && location.end.column >= location.start.column),
    "Coverage location is reversed",
  );
}

function checkFile(file, sourceLines) {
  for (const [counter, map] of [
    ["s", "statementMap"],
    ["f", "fnMap"],
    ["b", "branchMap"],
  ])
    sameKeys(Object.keys(file[counter]), Object.keys(file[map]), "Coverage counter identities");
  let expandedLines = 0;
  for (const location of Object.values(file.statementMap)) {
    checkLocation(location, sourceLines);
    expandedLines += location.end.line - location.start.line + 1;
    assert(expandedLines <= 1000000, "Coverage statement expansion exceeds its bound");
  }
  for (const fn of Object.values(file.fnMap)) {
    checkLocation(fn.loc, sourceLines);
    checkLocation(fn.decl, sourceLines);
    assert(fn.line === fn.loc.start.line, "Coverage function line contradicts its location");
  }
  for (const [id, branch] of Object.entries(file.branchMap)) {
    checkLocation(branch.loc, sourceLines);
    assert(branch.line === branch.loc.start.line, "Coverage branch line contradicts its location");
    assert(
      file.b[id].length === branch.locations.length,
      "Coverage branch counter count differs from its locations",
    );
    for (const location of branch.locations) checkLocation(location, sourceLines);
  }
  assert(Object.keys(file.s).length > 0, "Runtime coverage file has no measured statements");
  const lines = new Map();
  for (const [id, count] of Object.entries(file.s)) {
    const line = file.statementMap[id].start.line;
    lines.set(line, Math.max(count, lines.get(line) ?? 0));
  }
  return {
    expandedLines,
    metrics: Object.fromEntries(
      Object.entries({
        lines: [...lines.values()],
        functions: Object.values(file.f),
        statements: Object.values(file.s),
        branches: Object.values(file.b).flat(),
      }).map(([name, counts]) => [name, measurement(counts)]),
    ),
  };
}

// Summary and hit maps must first pass their hash-bound schemas.
// Paths, source root and source digests are independent frozen inputs, not report fields.
export function validateCoverageMaps(summary, hits, sources, context) {
  assert(
    isAbsolute(context.sourceRoot) && resolve(context.sourceRoot) === context.sourceRoot,
    "Invalid frozen coverage source root",
  );
  assert(context.expectedPaths.length > 0, "Empty frozen coverage census");
  for (const path of context.expectedPaths) safeRelativePath(path);
  sameKeys(Object.keys(sources), context.expectedPaths, "Coverage source texts");
  sameKeys(Object.keys(context.sourceDigests), context.expectedPaths, "Coverage source identities");
  const absolutePaths = context.expectedPaths.map((path) => resolve(context.sourceRoot, path));
  sameKeys(Object.keys(hits), absolutePaths, "Raw coverage census");
  sameKeys(Object.keys(summary), ["total", ...absolutePaths], "Summary coverage census");
  const totals = Object.fromEntries(
    metrics.map((name) => [name, { total: 0, covered: 0, skipped: 0, pct: 0 }]),
  );
  const normalizedSummary = Object.create(null);
  const normalizedHits = Object.create(null);
  let expandedLines = 0;
  for (const path of context.expectedPaths) {
    const source = sources[path];
    assert(
      typeof source === "string" && sha256(source) === context.sourceDigests[path],
      "Coverage source differs from the frozen manifest",
    );
    const absolute = resolve(context.sourceRoot, path);
    const file = hits[absolute];
    assert(file.path === absolute, "Raw coverage file identity differs from its key");
    const checked = checkFile(file, source.split("\n"));
    expandedLines += checked.expandedLines;
    assert(expandedLines <= 1000000, "Coverage statement expansion exceeds its bound");
    for (const name of metrics) {
      assert.deepEqual(
        summary[absolute][name],
        checked.metrics[name],
        "Coverage file summary differs from its raw counts",
      );
      totals[name].total += checked.metrics[name].total;
      totals[name].covered += checked.metrics[name].covered;
    }
    normalizedSummary[path] = summary[absolute];
    normalizedHits[path] = { ...file, path };
  }
  for (const name of metrics) {
    totals[name].pct = percent(totals[name].covered, totals[name].total);
    assert.deepEqual(
      summary.total[name],
      totals[name],
      "Coverage aggregate differs from its raw counts",
    );
  }
  normalizedSummary.total = summary.total;
  return {
    files: context.expectedPaths.length,
    totals,
    expandedLines,
    summary: normalizedSummary,
    hits: normalizedHits,
  };
}

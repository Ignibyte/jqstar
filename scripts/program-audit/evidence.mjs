import assert from "node:assert/strict";
import { isAbsolute, relative } from "node:path";
import { closedObject, safeRelativePath, sameKeys, sha256, timestamp } from "./contracts.mjs";

function one(values, predicate) {
  const matches = values.filter(predicate);
  assert(matches.length === 1, "Evidence selector is missing or ambiguous");
  return matches[0];
}

function passedGate(gate) {
  assert(
    gate.status === "pass" &&
      gate.enforced === true &&
      gate.selection?.selected === true &&
      gate.exitCode === 0 &&
      gate.signal === null,
    "Required evidence gate did not execute successfully",
  );
}

function interval(start, end, earliest, latest) {
  assert(
    Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= end &&
      start >= earliest &&
      end <= latest,
    "Evidence execution is outside the frozen audit interval",
  );
}

// Expected values must come from the frozen manifest, not from the supplied report.
// Hash-bound I/O and schema validation belong to the report loader.
export function validateQualityEnvelope(report, expected) {
  assert(
    report.schema === "jqstar-quality-report/1" &&
      report.status === "pass" &&
      report.mode === expected.mode &&
      report.head === expected.commit &&
      report.interruption === null &&
      report.receipt?.eligible === true,
    "Quality report is unsuccessful or belongs to another audit identity",
  );
  for (const fingerprint of [report.startFingerprint, report.endFingerprint])
    assert(
      fingerprint?.algorithm === "sha256" &&
        fingerprint.digest === expected.fingerprint.digest &&
        fingerprint.fileCount === expected.fingerprint.fileCount,
      "Quality source fingerprint differs from the frozen manifest",
    );
  sameKeys(Object.keys(report.environment), Object.keys(expected.environment), "Toolchain fields");
  assert(
    Object.keys(expected.environment).every(
      (key) => report.environment[key] === expected.environment[key],
    ),
    "Quality toolchain differs from the frozen manifest",
  );
  const start = timestamp(report.startedAt);
  const end = timestamp(report.endedAt);
  interval(start, end, timestamp(expected.notBefore), timestamp(expected.notAfter));
  sameKeys(
    report.gates.map(({ id }) => id),
    expected.requiredGates,
    "Quality gates",
  );
  for (const gate of report.gates) {
    passedGate(gate);
    interval(timestamp(gate.startedAt), timestamp(gate.endedAt), start, end);
  }
  return { runId: report.runId, start, end };
}

export function validateSubordinate(report, schema, context, mode) {
  assert(
    report.schema === schema &&
      report.status === "pass" &&
      report.runId === context.runId &&
      report.mode === mode,
    "Subordinate evidence is unsuccessful or belongs to another run",
  );
}

export function selectVitest(report, citation, sourceRoot, context) {
  assert(
    report.success === true &&
      report.numTotalTests > 0 &&
      report.numTotalTests === report.numPassedTests &&
      report.numFailedTests === 0 &&
      report.numPendingTests === 0 &&
      report.numTodoTests === 0 &&
      report.numFailedTestSuites === 0 &&
      report.numPendingTestSuites === 0,
    "Unit evidence is incomplete or unsuccessful",
  );
  interval(report.startTime, report.startTime, context.start, context.end);
  safeRelativePath(citation.path);
  const suite = one(report.testResults, ({ name }) => {
    assert(typeof name === "string" && isAbsolute(name), "Invalid test source path");
    const path = relative(sourceRoot, name).split("\\").join("/");
    safeRelativePath(path);
    return path === citation.path;
  });
  interval(suite.startTime, suite.endTime, context.start, context.end);
  assert(suite.status === "passed", "Named unit suite did not pass");
  const test = one(suite.assertionResults, ({ fullName }) => fullName === citation.selector);
  assert(
    test.status === "passed" &&
      Array.isArray(test.failureMessages) &&
      test.failureMessages.length === 0,
    "Named unit assertion did not pass",
  );
  return { path: citation.path, selector: citation.selector, status: "pass" };
}

function browserSpecs(suites, output = [], ancestry = []) {
  assert(Array.isArray(suites) && ancestry.length <= 32, "Invalid browser suite tree");
  for (const suite of suites) {
    assert(
      Array.isArray(suite.specs) && typeof suite.title === "string",
      "Invalid browser suite identity",
    );
    const titles = [...ancestry, suite.title];
    output.push(...suite.specs.map((spec) => ({ spec, titles: [...titles, spec.title] })));
    assert(output.length <= 50000, "Browser specification inventory exceeds the audit bound");
    if (suite.suites) browserSpecs(suite.suites, output, titles);
  }
  return output;
}

export function selectPlaywright(report, citation, context) {
  assert(
    Array.isArray(report.errors) &&
      report.errors.length === 0 &&
      report.stats.expected > 0 &&
      report.stats.unexpected === 0 &&
      report.stats.flaky === 0 &&
      report.stats.skipped === 0,
    "Browser evidence is incomplete or unsuccessful",
  );
  interval(
    timestamp(report.stats.startTime),
    timestamp(report.stats.startTime) + report.stats.duration,
    context.start,
    context.end,
  );
  assert(
    Number.isSafeInteger(context.repeats) && context.repeats > 0,
    "Invalid frozen browser repetition count",
  );
  safeRelativePath(citation.path);
  const { spec } = one(browserSpecs(report.suites), ({ spec, titles }) => {
    safeRelativePath(spec.file);
    return (
      `e2e/${spec.file}` === citation.path &&
      (spec.title === citation.selector || JSON.stringify(titles) === citation.selector)
    );
  });
  assert(spec.ok === true, "Named browser specification did not pass");
  const tests = spec.tests.filter(({ projectName }) => projectName === context.project);
  assert(
    tests.length === context.repeats,
    "Named browser project or repetition is missing or duplicated",
  );
  for (const test of tests) {
    assert(
      test.expectedStatus === "passed" &&
        test.status === "expected" &&
        test.results.length === 1 &&
        test.results[0].status === "passed" &&
        test.results[0].retry === 0 &&
        test.results[0].errors.length === 0 &&
        !(test.annotations ?? []).some(({ type }) => ["skip", "fixme", "fail"].includes(type)),
      "Named browser test failed, skipped, retried, or expects failure",
    );
    const result = test.results[0];
    interval(
      timestamp(result.startTime),
      timestamp(result.startTime) + result.duration,
      context.start,
      context.end,
    );
  }
  return {
    path: citation.path,
    selector: citation.selector,
    project: context.project,
    status: "pass",
  };
}

export function selectProperty(report, selector, context) {
  assert(
    Number.isSafeInteger(context.minimumRuns) && context.minimumRuns > 0,
    "Invalid frozen property case minimum",
  );
  validateSubordinate(report, "jqstar-property-report/1", context, context.mode);
  interval(timestamp(report.startedAt), timestamp(report.finishedAt), context.start, context.end);
  assert(
    report.exitCode === 0 && report.signal === null && report.failures.length === 0,
    "Property process did not pass",
  );
  const property = one(report.properties, ({ id }) => id === selector);
  assert(
    property.status === "pass" &&
      property.skips === 0 &&
      property.effectiveRuns >= context.minimumRuns &&
      property.configuredRuns >= context.minimumRuns,
    "Named property is incomplete or has insufficient generated cases",
  );
  return { selector, status: "pass", cases: property.effectiveRuns };
}

export function selectStatic(report, selector, context) {
  validateSubordinate(report, "jqstar-static-report/1", context, context.mode);
  const gate = one(report.gates, ({ id }) => id === selector);
  passedGate(gate);
  interval(timestamp(gate.startedAt), timestamp(gate.endedAt), context.start, context.end);
  return { selector, status: "pass" };
}

export function selectPackage(report, selector, context) {
  validateSubordinate(report, "jqstar-package-quality/1", context, "package");
  assert(
    report.package.filename === context.artifact.filename &&
      report.package.packedBytes === context.artifact.bytes,
    "Package evidence artifact identity mismatch",
  );
  // Exact bytes are established by the hash-bound release and installed-browser reports.
  const installed = one(report.checks, ({ name }) => name === "browser-consumers");
  assert(
    installed.status === "pass" &&
      installed.detail.subject === "installed-tarball" &&
      installed.detail.csp.tarballDigest === context.artifact.sha256,
    "Package evidence does not prove the exact installed tarball",
  );
  const names = ["chromium", "firefox", "webkit"];
  closedObject(context.browserVersions, names, "Frozen installed browser versions");
  assert(
    names.every(
      (name) =>
        typeof context.browserVersions[name] === "string" &&
        context.browserVersions[name].length > 0,
    ),
    "Frozen installed browser version is missing",
  );
  for (const engines of [installed.detail.engines, installed.detail.csp.engines]) {
    assert(Array.isArray(engines), "Installed browser evidence is missing");
    sameKeys(
      engines.map(({ name }) => name),
      names,
      "Installed browser evidence",
    );
    assert(
      engines.every(
        ({ name, version, status }) =>
          status === "pass" && version === context.browserVersions[name],
      ),
      "Installed browser version differs from the frozen manifest",
    );
  }
  const check = one(report.checks, ({ name }) => name === selector);
  assert(check.status === "pass", "Named package check did not pass");
  return { selector, status: "pass" };
}

export function selectSource(source, expectedSha256, excerpt) {
  assert(sha256(source) === expectedSha256, "Source evidence differs from its frozen digest");
  assert(typeof excerpt === "string" && excerpt.length > 0, "Source evidence excerpt is empty");
  const index = source.indexOf(excerpt);
  assert(
    index >= 0 && source.indexOf(excerpt, index + 1) < 0,
    "Source excerpt is missing or ambiguous",
  );
  return { sha256: expectedSha256, excerptSha256: sha256(excerpt), status: "pass" };
}

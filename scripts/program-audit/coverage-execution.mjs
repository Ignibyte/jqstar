import assert from "node:assert/strict";
import { isAbsolute, relative, resolve } from "node:path";
import { boundedText, safeRelativePath } from "./contracts.mjs";

function sourcePath(path, root) {
  assert(typeof path === "string" && isAbsolute(path), "Invalid executed test source");
  const local = relative(root, path).split("\\").join("/");
  safeRelativePath(local);
  assert(resolve(root, local) === path, "Executed test source is not canonical");
  return local;
}

function interval(start, end, context) {
  assert(
    Number.isFinite(start) &&
      Number.isFinite(end) &&
      start <= end &&
      start >= context.start &&
      end <= context.end,
    "Coverage tests are outside the supervised interval",
  );
}

// The independently collected roster precedes execution in the final workflow.
// Preserve multiplicity: parameterized cases may intentionally share a display name.
export function validateCoverageExecution(report, context) {
  assert(
    report.success === true &&
      report.numTotalTests > 0 &&
      report.numTotalTests === report.numPassedTests,
    "Coverage test execution is incomplete",
  );
  for (const field of [
    "numFailedTests",
    "numPendingTests",
    "numTodoTests",
    "numFailedTestSuites",
    "numPendingTestSuites",
  ])
    assert(report[field] === 0, "Coverage test execution contains failed or unexecuted cases");
  assert(
    Number.isSafeInteger(report.numTotalTestSuites) &&
      report.numTotalTestSuites > 0 &&
      report.numTotalTestSuites === report.numPassedTestSuites,
    "Coverage suite execution is incomplete",
  );
  assert(context.expectedTests.length > 0, "Frozen coverage test roster is empty");
  const expected = context.expectedTests.map(({ path, name }) => {
    safeRelativePath(path);
    boundedText(name, "Collected coverage test name", 65536);
    return JSON.stringify([path, name]);
  });
  interval(report.startTime, report.startTime, context);
  const actual = [];
  const paths = new Set();
  const normalized = [];
  for (const suite of report.testResults) {
    const path = sourcePath(suite.name, context.sourceRoot);
    assert(!paths.has(path), "Coverage repeats a test source report");
    paths.add(path);
    interval(suite.startTime, suite.endTime, context);
    assert(
      suite.status === "passed" && suite.assertionResults.length > 0,
      "Coverage suite is empty or unsuccessful",
    );
    for (const test of suite.assertionResults) {
      boundedText(test.title, "Executed coverage test title", 65536);
      assert(Array.isArray(test.ancestorTitles), "Coverage test ancestry is missing");
      for (const title of test.ancestorTitles) boundedText(title, "Coverage test ancestor", 65536);
      assert(
        test.fullName === [...test.ancestorTitles, test.title].join(" "),
        "Coverage full test name contradicts its ancestry",
      );
      assert(
        test.status === "passed" &&
          Array.isArray(test.failureMessages) &&
          test.failureMessages.length === 0,
        "Coverage assertion is unsuccessful",
      );
      actual.push(JSON.stringify([path, [...test.ancestorTitles, test.title].join(" > ")]));
    }
    normalized.push({ ...suite, name: path });
  }
  assert(
    actual.length === report.numTotalTests,
    "Coverage assertion count contradicts its summary",
  );
  assert.deepEqual(
    actual.sort(),
    expected.sort(),
    "Coverage execution differs from the frozen collected test roster",
  );
  const counts = new Map();
  for (const identity of actual) counts.set(identity, (counts.get(identity) ?? 0) + 1);
  return {
    tests: actual.length,
    files: paths.size,
    repeatedDisplayNames: [...counts]
      .filter(([, count]) => count > 1)
      .map(([identity, count]) => ({ identity: JSON.parse(identity), count })),
    normalized: { ...report, testResults: normalized },
  };
}

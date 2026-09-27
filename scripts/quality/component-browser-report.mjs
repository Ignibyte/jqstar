export const minimumComponentTests = 76;

export function evaluateComponentRun(selectedTests, listResult, runResult, playwrightResult) {
  const failures = [];
  if (listResult.failureReason) failures.push(`selection ${listResult.failureReason}`);
  if (selectedTests < minimumComponentTests) {
    failures.push(
      `selected ${selectedTests} component tests; at least ${minimumComponentTests} required`,
    );
  }
  if (runResult.failureReason) failures.push(`execution ${runResult.failureReason}`);
  const stats = playwrightResult?.stats;
  const names = ["expected", "unexpected", "flaky", "skipped"];
  if (!stats || names.some((name) => !Number.isSafeInteger(stats[name]) || stats[name] < 0)) {
    failures.push("Playwright JSON report has missing or invalid test counts");
  }
  const passedTests = stats?.expected ?? null;
  const failedTests = stats?.unexpected ?? null;
  const flakyTests = stats?.flaky ?? null;
  const skippedTests = stats?.skipped ?? null;
  const executedTests = names.every((name) => Number.isSafeInteger(stats?.[name]))
    ? names.reduce((sum, name) => sum + stats[name], 0)
    : null;
  if (executedTests !== selectedTests)
    failures.push("executed test count does not match selection");
  if (
    passedTests !== selectedTests ||
    failedTests !== 0 ||
    flakyTests !== 0 ||
    skippedTests !== 0
  ) {
    failures.push("component suite has failed, flaky, skipped, or missing tests");
  }
  return {
    status: failures.length === 0 ? "pass" : "fail",
    selectedTests,
    executedTests,
    passedTests,
    failedTests,
    flakyTests,
    skippedTests,
    failures,
  };
}

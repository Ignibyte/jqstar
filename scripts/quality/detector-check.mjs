import { readFileSync } from "node:fs";
import { stripVTControlCharacters } from "node:util";

export function createDetectorCheck({
  name,
  result,
  expected,
  detector,
  evidence,
  artifactDirectory = null,
}) {
  const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  const processPassed =
    Number.isSafeInteger(result.exitCode) &&
    result.signal === null &&
    result.timedOut === false &&
    result.spawnError === null &&
    ((expected === "red" && result.exitCode > 0) ||
      (expected === "green" && result.exitCode === 0));
  const detectorMatched = detector.test(stripVTControlCharacters(combined));
  let evidenceMatched = true;
  let evidenceFailure = null;
  if (evidence) {
    try {
      const gateReport = JSON.parse(readFileSync(evidence.path, "utf8"));
      const failures = gateReport.checks
        .filter((check) => check.status !== "pass")
        .map((check) => check.name);
      evidenceMatched = failures.length === 1 && failures[0] === evidence.failure;
      if (!evidenceMatched) evidenceFailure = `unexpected failures: ${failures.join(", ")}`;
    } catch (error) {
      evidenceMatched = false;
      evidenceFailure = error instanceof Error ? error.message : String(error);
    }
  }
  const output = processPassed
    ? combined
    : `${combined}\nDetector process rejected: exit=${String(result.exitCode)} signal=${result.signal ?? "none"} timeout=${String(result.timedOut)} spawnError=${String(result.spawnError !== null)}`;
  return {
    name,
    expected,
    exitCode: result.exitCode,
    status: processPassed && detectorMatched && evidenceMatched ? "pass" : "fail",
    detector: detector.source,
    detectorMatched,
    evidenceMatched,
    evidenceFailure,
    artifactDirectory,
    output: output.slice(-2_000),
  };
}

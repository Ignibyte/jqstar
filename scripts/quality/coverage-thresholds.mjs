import { execFileSync } from "node:child_process";
import { evaluateCoverageThresholdRatchet } from "./coverage-report.mjs";

export function currentCoverageThresholdRatchet(current, scope, root = process.cwd()) {
  const reference = scope.base ?? scope.head;
  if (!reference) throw new Error("Coverage thresholds require an immutable Git base or HEAD.");
  const git = (args) =>
    execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  const revision = git(["rev-parse", "--verify", "--end-of-options", `${reference}^{commit}`]);
  const path = "quality/coverage-thresholds.json";
  const present = git(["ls-tree", "--name-only", revision, "--", path]);
  const baseline = present ? JSON.parse(git(["show", `${revision}:${path}`])) : null;
  return evaluateCoverageThresholdRatchet(current, baseline, revision);
}

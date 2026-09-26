import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { sameKeys } from "./contracts.mjs";
import { validateSubordinate } from "./evidence.mjs";

export const releaseChecks = Object.freeze([
  "clean-install",
  "reproducible-build",
  "sbom",
  "licenses",
  "provenance-eligibility",
  "supported-toolchain",
  "packed-self-hosted",
]);

// Consume only hash-bound schema-valid reports. The execution index must bind the
// parent quality gate and interval because this producer has no per-check times.
// Expected artifact, environment and comparison base come from the frozen manifest.
export function selectRelease(report, selector, context) {
  validateSubordinate(report, "jqstar-release-quality/1", context, "release");
  sameKeys(
    report.checks.map(({ name }) => name),
    releaseChecks,
    "Release checks",
  );
  assert(
    report.checks.every(({ status }) => status === "pass"),
    "Release checks did not all pass",
  );
  const byName = new Map(report.checks.map(({ name, detail }) => [name, detail]));
  assert(byName.has(selector), "Release selector is missing");
  assert(
    isDeepStrictEqual(report.environment, context.releaseEnvironment),
    "Release toolchain differs from the frozen manifest",
  );
  assert(
    isDeepStrictEqual(byName.get("supported-toolchain"), context.releaseEnvironment),
    "Named release toolchain differs from the frozen manifest",
  );
  const clean = byName.get("clean-install");
  assert(
    clean.installs === 2 && clean.sourceNodeModulesShared === false,
    "Release did not use two independent dependency installations",
  );
  sameKeys(clean.workspaces, ["workspace-one", "workspace-two"], "Release workspaces");
  const build = byName.get("reproducible-build");
  assert(
    build.sha256 === context.artifact.sha256 && build.files === context.artifact.files,
    "Release artifact differs from the frozen candidate",
  );
  assert(
    build.independentlyMaterializedWorkspaces === 2 &&
      build.generatedOutputBudget === 0 &&
      build.generatedOutputChanges === 0,
    "Release builds are not independently identical",
  );
  assert(
    build.budgetRatchet.status === "pass" &&
      build.budgetRatchet.baseRevision === context.baseCommit &&
      build.budgetRatchet.failures.length === 0,
    "Release budget comparison differs from the frozen base",
  );
  const sbom = byName.get("sbom");
  assert(
    Number.isSafeInteger(sbom.components) &&
      sbom.components > 0 &&
      sbom.specVersion === context.sbomVersion,
    "Release SBOM evidence is missing or has another format",
  );
  const licenses = byName.get("licenses");
  assert(
    Number.isSafeInteger(licenses.packages) && licenses.packages > 0 && licenses.forbidden === 0,
    "Release license evidence is missing or forbidden",
  );
  assert(
    isDeepStrictEqual(byName.get("provenance-eligibility"), report.provenance),
    "Release provenance records disagree",
  );
  const hosted = byName.get("packed-self-hosted");
  assert(
    hosted.agentCorpus === "served" &&
      hosted.health === "healthy" &&
      hosted.staticDemo === "served",
    "Packed self-hosted evidence is incomplete",
  );
  return { selector, status: "pass", sha256: context.artifact.sha256 };
}

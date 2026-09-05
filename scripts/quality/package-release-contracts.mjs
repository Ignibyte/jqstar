export const packageCheckNames = Object.freeze([
  "build",
  "api-report",
  "pack",
  "package-budgets",
  "exports-and-files",
  "publint",
  "are-the-types-wrong",
  "refresh-package-subject",
  "installed-consumer",
  "qunit-consumer",
  "browser-consumers",
  "bundle-sentinel",
  "copy-in-registry",
]);

export const releaseCheckNames = Object.freeze([
  "clean-install",
  "reproducible-build",
  "sbom",
  "licenses",
  "provenance-eligibility",
  "supported-toolchain",
  "packed-self-hosted",
]);

export const packageDocumentationPaths = Object.freeze([
  "docs/BACKEND.md",
  "docs/COMPATIBILITY.md",
  "docs/COMPONENT_ARCHITECTURE.md",
  "docs/CSP_EXPRESSIONS.md",
  "docs/INTEROPERABILITY.md",
  "docs/JQUERY_ECOSYSTEM.md",
  "docs/JQUERY_MOBILE_MIGRATION.md",
  "docs/JQUERY_UI_MIGRATION.md",
  "docs/SELF_HOSTING.md",
  "docs/STORES.md",
]);

const notRunDetail = "check did not run";

export function initializeChecks(names) {
  if (new Set(names).size !== names.length) {
    throw new Error("Quality check names must be unique.");
  }
  return names.map((name) => ({
    name,
    status: "error",
    detail: notRunDetail,
  }));
}

export async function recordCheck(report, name, work) {
  const check = report.checks.find((candidate) => candidate.name === name);
  if (!check) throw new Error(`Unknown quality check ${name}.`);
  if (check.status !== "error" || check.detail !== notRunDetail) {
    throw new Error(`Quality check ${name} ran more than once.`);
  }

  try {
    check.detail = (await work()) ?? null;
    check.status = "pass";
  } catch (error) {
    check.detail = error instanceof Error ? error.message : String(error);
    check.status = "fail";
  }
}

export function reportStatus(checks) {
  if (checks.some((check) => check.status === "error")) return "error";
  if (checks.some((check) => check.status === "fail")) return "fail";
  return "pass";
}

export function assertExactCheckSet(checks, expectedNames) {
  const actualNames = checks.map(({ name }) => name);
  if (JSON.stringify(actualNames) !== JSON.stringify(expectedNames)) {
    throw new Error(
      `Quality check set is ${JSON.stringify(actualNames)}; expected ${JSON.stringify(expectedNames)}.`,
    );
  }
}

export function assertExactPackageDocumentationPaths(paths) {
  const actual = paths.filter((path) => path.startsWith("docs/")).toSorted();
  if (JSON.stringify(actual) !== JSON.stringify(packageDocumentationPaths)) {
    throw new Error(
      `Packed documentation is ${JSON.stringify(actual)}; expected ${JSON.stringify(packageDocumentationPaths)}.`,
    );
  }
  return actual;
}

export async function prepareIndependentWorkspaces(workspaces, copyWorkspace, installWorkspace) {
  if (workspaces.length !== 2 || new Set(workspaces).size !== 2) {
    throw new Error("Release reproducibility requires exactly two distinct workspaces.");
  }
  for (const workspace of workspaces) {
    await copyWorkspace(workspace);
    await installWorkspace(workspace);
  }
}

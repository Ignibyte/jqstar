// @vitest-environment node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { describe, it } from "vitest";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";
import { releaseChecks, selectRelease } from "../scripts/program-audit/release.mjs";
import { validateMappings } from "../scripts/program-audit/requirements.mjs";

// Synthetic adapter controls only. These are never release or program-acceptance evidence.
const environment = {
  node: "v24.0.0",
  npm: "11.0.0",
  typescript: "Version 5.9.3",
  playwright: "Version 1.62.1",
  browsers: {
    chromium: { version: "synthetic-1" },
    firefox: { version: "synthetic-2" },
    webkit: { version: "synthetic-3" },
  },
};
const context = {
  runId: "synthetic-release",
  artifact: { sha256: "a".repeat(64), files: 257 },
  baseCommit: "b".repeat(40),
  releaseEnvironment: structuredClone(environment),
  sbomVersion: "1.5",
};

function report() {
  const provenance = {
    eligible: false,
    oidcEligible: false,
    publishEligible: false,
    repositoryEligible: true,
    note: "Synthetic eligibility record; no publication occurs.",
  };
  return {
    schema: "jqstar-release-quality/1",
    runId: "synthetic-release",
    mode: "release",
    status: "pass",
    environment: structuredClone(environment),
    provenance,
    checks: [
      {
        name: "clean-install",
        status: "pass",
        detail: {
          installs: 2,
          sourceNodeModulesShared: false,
          workspaces: ["workspace-one", "workspace-two"],
        },
      },
      {
        name: "reproducible-build",
        status: "pass",
        detail: {
          sha256: "a".repeat(64),
          files: 257,
          independentlyMaterializedWorkspaces: 2,
          generatedOutputBudget: 0,
          generatedOutputChanges: 0,
          budgetRatchet: {
            status: "pass",
            baseRevision: "b".repeat(40),
            failures: [],
            reason: "Synthetic historical comparison passed.",
          },
        },
      },
      { name: "sbom", status: "pass", detail: { components: 2, specVersion: "1.5" } },
      { name: "licenses", status: "pass", detail: { packages: 2, forbidden: 0 } },
      { name: "provenance-eligibility", status: "pass", detail: { ...provenance } },
      { name: "supported-toolchain", status: "pass", detail: structuredClone(environment) },
      {
        name: "packed-self-hosted",
        status: "pass",
        detail: { agentCorpus: "served", health: "healthy", staticDemo: "served" },
      },
    ],
  };
}

const detail = (value, name) => value.checks.find((check) => check.name === name).detail;
const verify = (value) => selectRelease(value, "reproducible-build", context);

describe("program audit release evidence", () => {
  it("accepts every exact named check with the producer schema and frozen identity", async () => {
    const schema = JSON.parse(
      await readFile(new URL("../schema/release-report.schema.json", import.meta.url), "utf8"),
    );
    const value = report();
    assert.equal(createSchemaValidator(schema)(value), true);
    assert.deepEqual(
      value.checks.map(({ name }) => name),
      releaseChecks,
    );
    for (const selector of releaseChecks)
      assert.deepEqual(selectRelease(value, selector, context), {
        selector,
        status: "pass",
        sha256: "a".repeat(64),
      });
    assert.throws(() => selectRelease(value, "*", context), /selector is missing/u);
  });

  it("refuses an unsuccessful, stale, missing or duplicated execution despite green details", () => {
    for (const change of [
      (r) => {
        r.status = "fail";
      },
      (r) => {
        r.schema = "jqstar-package-quality/1";
      },
      (r) => {
        r.runId = "stale";
      },
      (r) => {
        r.mode = "package";
      },
      (r) => {
        r.checks.pop();
      },
      (r) => {
        r.checks[0] = structuredClone(r.checks[1]);
      },
      (r) => {
        r.checks[0].name = "unknown";
      },
      (r) => {
        r.checks[0].status = "skip";
      },
      (r) => {
        r.checks[0].status = "fail";
      },
    ]) {
      const value = report();
      change(value);
      assert.throws(() => verify(value));
    }
  });

  it("refuses internally consistent reports from a different artifact, toolchain or baseline", () => {
    for (const field of ["node", "npm", "typescript", "playwright"]) {
      const value = report();
      value.environment[field] = "private-version-canary";
      detail(value, "supported-toolchain")[field] = "private-version-canary";
      assert.throws(() => verify(value), /^AssertionError.*frozen manifest$/u);
    }
    for (const browser of ["chromium", "firefox", "webkit"]) {
      const value = report();
      value.environment.browsers[browser].version = "private-browser-canary";
      detail(value, "supported-toolchain").browsers[browser].version = "private-browser-canary";
      assert.throws(() => verify(value), /^AssertionError.*frozen manifest$/u);
    }
    for (const [name, field, wrong] of [
      ["reproducible-build", "sha256", "c".repeat(64)],
      ["reproducible-build", "files", 256],
      ["supported-toolchain", "npm", "0.0.0"],
    ]) {
      const value = report();
      detail(value, name)[field] = wrong;
      assert.throws(() => verify(value));
    }
    const value = report();
    detail(value, "reproducible-build").budgetRatchet.baseRevision = "d".repeat(40);
    assert.throws(() => verify(value), /frozen base/u);
  });

  it("requires independent installs and unchanged outputs against the approved historical base", () => {
    for (const [name, field, wrong] of [
      ["clean-install", "installs", 1],
      ["clean-install", "sourceNodeModulesShared", true],
      ["clean-install", "workspaces", ["workspace-one", "workspace-one"]],
      ["clean-install", "workspaces", ["workspace-one"]],
      ["reproducible-build", "independentlyMaterializedWorkspaces", 1],
      ["reproducible-build", "generatedOutputBudget", 1],
      ["reproducible-build", "generatedOutputChanges", 1],
    ]) {
      const value = report();
      detail(value, name)[field] = wrong;
      assert.throws(() => verify(value));
    }
    for (const [field, wrong] of [
      ["status", "first-baseline"],
      ["status", "not-applicable"],
      ["failures", ["private-failure-canary"]],
    ]) {
      const value = report();
      detail(value, "reproducible-build").budgetRatchet[field] = wrong;
      assert.throws(() => verify(value), /frozen base/u);
    }
  });

  it("requires complete supporting evidence without mistaking publication eligibility for a gate", () => {
    for (const [name, field, wrong] of [
      ["sbom", "components", 0],
      ["sbom", "components", 1.5],
      ["sbom", "specVersion", "0.0"],
      ["licenses", "packages", 0],
      ["licenses", "packages", 1.5],
      ["licenses", "forbidden", 1],
      ["packed-self-hosted", "agentCorpus", "missing"],
      ["packed-self-hosted", "health", "missing"],
      ["packed-self-hosted", "staticDemo", "missing"],
      ["provenance-eligibility", "eligible", true],
    ]) {
      const value = report();
      detail(value, name)[field] = wrong;
      assert.throws(() => verify(value));
    }
    const value = report();
    assert.equal(value.provenance.publishEligible, false);
    assert.equal(verify(value).status, "pass");
  });

  it("requires release citations in both mapping validators instead of weaker evidence", async () => {
    const schema = JSON.parse(
      await readFile(
        new URL("../quality/program-audit/mappings.schema.json", import.meta.url),
        "utf8",
      ),
    );
    const validate = createSchemaValidator(schema);
    const requirements = [{ id: "0017:AC-01" }];
    const mapping = {
      id: "0017:AC-01",
      review: "The exact candidate must reproduce in two independent clean workspaces.",
      requiredKinds: ["release"],
      evidence: [
        {
          id: "release:reproducible-build",
          kind: "release",
          path: "evidence/release-report.json",
          selector: "reproducible-build",
        },
      ],
    };
    assert.equal(validate([mapping]), true);
    assert.equal(validateMappings(requirements, [mapping]), true);
    for (const kind of ["package", "documentation", "source"]) {
      const weaker = structuredClone(mapping);
      weaker.evidence[0].kind = kind;
      assert.equal(validate([weaker]), true);
      assert.throws(() => validateMappings(requirements, [weaker]), /weaker type/u);
    }
    const unknown = structuredClone(mapping);
    unknown.requiredKinds = ["unknown"];
    assert.equal(validate([unknown]), false);
    assert.throws(() => validateMappings(requirements, [unknown]), /unknown evidence kind/u);
  });
});

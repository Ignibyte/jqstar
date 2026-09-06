// @vitest-environment node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { readNavigationMeasurement } from "../scripts/quality/navigation-evidence.mjs";
import {
  validateNavigationReport,
  selectNavigation,
} from "../scripts/program-audit/navigation.mjs";
import { describe, it } from "vitest";
import { validateMappings } from "../scripts/program-audit/requirements.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";
const data = JSON.parse(await readFile("quality/navigation-decision.json", "utf8"));
const schema = JSON.parse(await readFile("schema/navigation-decision.schema.json", "utf8"));
const reference = data.measurements.find((m) => m.runId === "2026-09-05T23-18-54.986Z-29717");
const report = await readNavigationMeasurement(reference, schema);
// This context checks historical format compatibility only. Final expectations must
// be frozen independently before executing the current candidate.
const context = {
  runId: reference.runId,
  contract: data.contract,
  contractSha256: reference.contractSha256,
  fixtureSha256: reference.fixtureSha256,
  start: Date.parse("2026-09-05T23:00:00.000Z"),
  end: Date.parse("2026-09-06T00:00:00.000Z"),
  environment: { node: "v26.8.1", platform: "darwin", arch: "arm64", playwright: "1.62.1" },
  artifact: structuredClone(report.artifact),
  packages: structuredClone(report.packages),
  bundles: structuredClone(report.bundles),
  browserVersions: { chromium: "151.0.7922.34", firefox: "153.0", webkit: "26.5" },
};
const configured = (r) =>
  r.candidates.find(
    (c) =>
      c.candidate === "browser" && c.configuration === "configured" && c.browser === "chromium",
  );
const flow = (r) => configured(r).flows[0];
const changes = [
  ["failed summary", (r) => (r.status = "fail")],
  ["partial summary", (r) => (r.status = "partial")],
  ["stale run", (r) => (r.runId = "stale")],
  ["wrong contract", (r) => (r.contractSha256 = "0".repeat(64))],
  ["wrong fixture", (r) => (r.fixtureSha256 = "0".repeat(64))],
  ["stale interval", (r) => (r.createdAt = "2026-09-05T22:59:59.999Z")],
  ["wrong runtime", (r) => (r.environment.node = "v24.20.0")],
  ["supplement substituted", (r) => (r.environment.probe = "private-link-entry")],
  ["wrong artifact", (r) => (r.artifact.sha256 = "0".repeat(64))],
  ["changed package", (r) => (r.packages[0].integrity = "private-integrity-canary")],
  ["changed bundle graph", (r) => r.bundles.browser.modules.pop()],
  ["missing candidate", (r) => r.candidates.pop()],
  ["duplicated candidate", (r) => (r.candidates[0] = structuredClone(r.candidates[1]))],
  ["missing scenario", (r) => configured(r).flows.pop()],
  [
    "duplicated scenario",
    (r) => (configured(r).flows[0] = structuredClone(configured(r).flows[1])),
  ],
  ["wrong browser version", (r) => (configured(r).browserVersion = "private-browser-canary")],
  ["failed configured flow", (r) => (flow(r).status = "fail")],
  ["unexpected exclusion", (r) => (flow(r).status = "not-applicable")],
  ["missing assertion", (r) => flow(r).assertions.pop()],
  ["duplicate assertion", (r) => (flow(r).assertions[0] = structuredClone(flow(r).assertions[1]))],
  ["failed assertion", (r) => (flow(r).assertions[0].passed = false)],
  ["unhandled script error", (r) => (flow(r).unhandledScriptErrors = 1)],
  ["missing script error count", (r) => delete flow(r).unhandledScriptErrors],
  ["remaining disposal", (r) => (flow(r).disposal.remaining = 1)],
  ["duplicate applications", (r) => (flow(r).disposal.duplicates = 1)],
  ["unreleased resources", (r) => flow(r).disposal.resourcesReleased--],
  ["unreleased applications", (r) => flow(r).disposal.released--],
  [
    "failed document disposal",
    (r) => flow(r).events.push({ event: "document-disposed", failed: 1, remaining: 0, live: 0 }),
  ],
  [
    "nojs script request",
    (r) => (r.candidates.find((c) => c.candidate === "browser-nojs").flows[0].scriptRequests = 1),
  ],
  [
    "exclusion mislabeled pass",
    (r) =>
      (r.candidates
        .find((c) => c.candidate === "browser-nojs")
        .flows.find((f) => f.id === "NAV-20").status = "pass"),
  ],
  [
    "exclusion reason weakened",
    (r) =>
      (r.candidates
        .find((c) => c.candidate === "browser-nojs")
        .flows.find((f) => f.id === "NAV-24").reason = "skipped"),
  ],
];

describe("program audit navigation evidence", () => {
  it("requires the full historical matrix and exact assertions while retaining default failures", () => {
    assert.deepEqual(validateNavigationReport(report, context), {
      candidateRows: 30,
      flowCount: 840,
      configuredPasses: 498,
      approvedExclusions: 6,
      defaultFailures: 72,
    });
    for (const parts of [
      ["browser", "chromium", "NAV-01"],
      ["turbo-8.0.23", "firefox", "NAV-24"],
      ["htmx-2.0.10", "webkit", "NAV-28"],
    ]) {
      const selector = JSON.stringify(parts);
      assert.equal(selectNavigation(report, selector, context).status, "pass");
    }
  });
  it.each(changes)("rejects %s", (name, change) => {
    const changed = structuredClone(report);
    change(changed);
    assert.throws(() => validateNavigationReport(changed, context), undefined, name);
  });
  it("refuses a default failure without an actual failing observation", () => {
    const changed = structuredClone(report);
    const row = changed.candidates.find((r) => r.configuration === "default");
    const passed = row.flows.find((f) => f.status === "pass");
    passed.status = "fail";
    assert.throws(() => validateNavigationReport(changed, context), /no direct failed result/u);
  });
  it("selects only literal configured executions and never counts exclusions as passes", () => {
    for (const selector of [
      "*",
      "{}",
      JSON.stringify(["browser", "unknown", "NAV-01"]),
      JSON.stringify(["browser-nojs", "chromium", "NAV-20"]),
      JSON.stringify(["turbo-8.0.23", "default", "chromium", "NAV-01"]),
    ])
      assert.throws(() => selectNavigation(report, selector, context));
  });
  it("binds expected identities independently instead of accepting a self-described report", () => {
    for (const change of [
      (c) => c.contract.scenarios.pop(),
      (c) => (c.artifact.sha256 = "0".repeat(64)),
      (c) => (c.fixtureSha256 = "0".repeat(64)),
      (c) => (c.browserVersions.firefox = "private-version-canary"),
      (c) => (c.start = context.end + 1),
    ]) {
      const changed = structuredClone(context);
      change(changed);
      assert.throws(() => validateNavigationReport(report, changed));
    }
  });
  it("requires navigation evidence rather than a smaller ordinary browser suite", async () => {
    const schema = JSON.parse(await readFile("quality/program-audit/mappings.schema.json", "utf8"));
    const validate = createSchemaValidator(schema);
    const requirements = [{ id: "0023:AC-01" }];
    const mapping = {
      id: "0023:AC-01",
      review: "The complete navigation contract requires every configured scenario and assertion.",
      requiredKinds: ["navigation"],
      evidence: [
        {
          id: "navigation:direct",
          kind: "navigation",
          path: "evidence/navigation.json",
          selector: JSON.stringify(["browser", "chromium", "NAV-01"]),
        },
      ],
    };
    assert(validate([mapping]));
    assert(validateMappings(requirements, [mapping]));
    const weaker = structuredClone(mapping);
    weaker.evidence[0].kind = "browser";
    assert(validate([weaker]));
    assert.throws(() => validateMappings(requirements, [weaker]), /weaker type/u);
  });
});

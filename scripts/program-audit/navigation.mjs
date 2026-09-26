import assert from "node:assert/strict";
import { isDeepStrictEqual } from "node:util";
import { sameKeys, timestamp, sha256 } from "./contracts.mjs";

function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (value && typeof value === "object")
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

const key = (row) => JSON.stringify([row.candidate, row.configuration, row.browser]);

// The loader must verify bytes and the raw measurement definition from the frozen
// navigation schema. Context comes from a pre-execution manifest and its execution
// index, never from this report. The parent execution index binds start/end time.
export function validateNavigationReport(report, context) {
  assert(
    report.schema === "jqstar-navigation-measurement/1" &&
      report.status === "pass" &&
      report.runId === context.runId,
    "Navigation measurement is incomplete or belongs to another run",
  );
  assert(
    sha256(canonical(context.contract)) === context.contractSha256,
    "Frozen navigation contract identity mismatch",
  );
  assert(
    report.contractSha256 === context.contractSha256 &&
      report.fixtureSha256 === context.fixtureSha256,
    "Navigation source identity mismatch",
  );
  const created = timestamp(report.createdAt);
  assert(
    created >= context.start && created <= context.end,
    "Navigation measurement is outside the frozen audit interval",
  );
  assert(
    isDeepStrictEqual(report.environment, context.environment),
    "Navigation toolchain differs from the frozen manifest",
  );
  assert(
    isDeepStrictEqual(report.artifact, context.artifact),
    "Navigation artifact differs from the frozen candidate",
  );
  assert(
    isDeepStrictEqual(report.packages, context.packages),
    "Navigation dependencies differ from the frozen lock",
  );
  assert(
    isDeepStrictEqual(report.bundles, context.bundles),
    "Navigation bundle graphs differ from the frozen preparation",
  );
  const candidates = new Map(context.contract.candidates.map((c) => [c.id, c]));
  assert(
    candidates.size === context.contract.candidates.length && candidates.size === 6,
    "Invalid frozen navigation candidate roster",
  );
  sameKeys(
    context.contract.browsers,
    ["chromium", "firefox", "webkit"],
    "Frozen navigation engines",
  );
  const scenarios = new Map(context.contract.scenarios.map((s) => [s.id, s]));
  sameKeys(
    [...scenarios.keys()],
    Array.from({ length: 28 }, (_, i) => `NAV-${String(i + 1).padStart(2, "0")}`),
    "Frozen navigation scenarios",
  );
  assert(
    scenarios.size === context.contract.scenarios.length,
    "Duplicate frozen navigation scenario",
  );
  const expected = [];
  for (const candidate of candidates.values())
    for (const configuration of candidate.host === "browser"
      ? ["configured"]
      : ["default", "configured"])
      for (const browser of context.contract.browsers)
        expected.push(key({ candidate: candidate.id, configuration, browser }));
  sameKeys(report.candidates.map(key), expected, "Navigation candidate matrix");
  const summary = {
    candidateRows: report.candidates.length,
    flowCount: 0,
    configuredPasses: 0,
    approvedExclusions: 0,
    defaultFailures: 0,
  };
  for (const row of report.candidates) {
    assert(
      row.browserVersion === context.browserVersions[row.browser],
      "Navigation browser version differs from the frozen manifest",
    );
    sameKeys(
      row.flows.map((f) => f.id),
      [...scenarios.keys()],
      "Navigation scenario coverage",
    );
    const candidate = candidates.get(row.candidate);
    for (const flow of row.flows) {
      summary.flowCount++;
      const scenario = scenarios.get(flow.id);
      const excluded = scenario.applicability === "javascript" && candidate.javascript === false;
      if (excluded) {
        assert(
          flow.status === "not-applicable" &&
            flow.reason === "javascript-only instrumentation or intent" &&
            flow.assertions.length === 0 &&
            flow.events.length === 0 &&
            flow.requests.length === 0,
          "Navigation exclusion differs from the frozen contract",
        );
        summary.approvedExclusions++;
        continue;
      }
      sameKeys(
        flow.assertions.map((a) => a.key),
        scenario.assertions,
        "Navigation assertions",
      );
      if (row.configuration === "default" && flow.status === "fail") {
        assert(
          flow.failure !== null || flow.assertions.some((a) => a.passed === false),
          "Navigation default failure has no direct failed result",
        );
        summary.defaultFailures++;
        continue;
      }
      assert(
        flow.status === "pass" &&
          flow.failure === null &&
          flow.assertions.every((a) => a.passed === true) &&
          flow.unhandledScriptErrors === 0,
        "Required navigation flow did not pass",
      );
      if (candidate.javascript && flow.state.hasMain) {
        const d = flow.disposal;
        assert(
          d &&
            d.failed === 0 &&
            d.remaining === 0 &&
            d.live === 0 &&
            d.duplicates === 0 &&
            d.created === d.released &&
            d.attempted === d.resourcesReleased,
          "Navigation disposal evidence is incomplete",
        );
      }
      assert(
        !flow.events.some(
          (e) => e.event === "document-disposed" && (e.failed > 0 || e.remaining > 0 || e.live > 0),
        ),
        "Navigation document disposal failed",
      );
      if (candidate.javascript === false)
        assert(flow.scriptRequests === 0, "No-JavaScript navigation requested script");
      if (row.configuration === "configured") summary.configuredPasses++;
    }
  }
  assert(
    summary.candidateRows === 30 &&
      summary.flowCount === 840 &&
      summary.configuredPasses === 498 &&
      summary.approvedExclusions === 6,
    "Navigation matrix is incomplete",
  );
  return summary;
}

export function selectNavigation(report, selector, context) {
  const summary = validateNavigationReport(report, context);
  let parts;
  try {
    parts = JSON.parse(selector);
  } catch {
    throw new Error("Invalid exact navigation selector");
  }
  assert(
    Array.isArray(parts) && parts.length === 3 && parts.every((p) => typeof p === "string"),
    "Invalid exact navigation selector",
  );
  const [candidate, browser, scenario] = parts;
  const row = report.candidates.find(
    (r) => r.candidate === candidate && r.browser === browser && r.configuration === "configured",
  );
  const flow = row?.flows.find((f) => f.id === scenario);
  assert(flow?.status === "pass", "Navigation selector is missing or is not an executed pass");
  return { selector, status: "pass", summary };
}

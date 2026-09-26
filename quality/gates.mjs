const npm = process.platform === "win32" ? "npm.cmd" : "npm";

const gate = (id, script, options = {}) => ({
  id,
  command: npm,
  args: ["run", script, ...(options.args ?? [])],
  timeoutMs: options.timeoutMs ?? 120_000,
  stage: options.stage ?? 0,
  enforced: true,
  kind: options.kind ?? "analysis",
  version: { command: npm, args: ["--version"] },
  ...(options.env ? { env: options.env } : {}),
  ...(options.when ? { when: options.when } : {}),
  ...(options.evidence ? { evidence: options.evidence } : {}),
});

const ticket = {
  id: "ticket-workflow",
  command: process.execPath,
  args: ["scripts/quality/validate-ticket.mjs", "--changed"],
  timeoutMs: 30_000,
  stage: 0,
  enforced: true,
  version: { command: process.execPath, args: ["--version"] },
};

const runnerSelfTest = {
  id: "quality-runner-self-test",
  command: process.execPath,
  args: [
    "--test",
    "test/quality-runner.test.mjs",
    "test/ticket-workflow.test.mjs",
    "test/component-browser-report.test.mjs",
    "test/coverage-diagnostic.test.mjs",
    "test/source-map-packaging.test.mjs",
  ],
  timeoutMs: 120_000,
  stage: 0,
  enforced: true,
  version: { command: process.execPath, args: ["--version"] },
  when: {
    changed: [
      "quality/**",
      "scripts/quality/**",
      "schema/**",
      "test/quality-runner.test.mjs",
      "test/ticket-workflow.test.mjs",
      "test/component-browser-report.test.mjs",
      "test/coverage-diagnostic.test.mjs",
      "test/source-map-packaging.test.mjs",
      "scripts/quality-component-browser.mjs",
      "scripts/externalize-source-maps.mjs",
      ".githooks/**",
    ],
    reason: "quality runner and workflow files are unchanged",
  },
};

const format = gate("format", "format:check", { stage: 1 });
const browserComponents = gate("browser-components", "test:browser:components", {
  timeoutMs: 1_200_000,
  stage: 2,
  kind: "test",
  evidence: {
    path: "{runDirectory}/browser-components-report.json",
    format: "json",
    schemaPath: "schema/browser-components-report.schema.json",
    statusPath: "status",
    passValues: ["pass"],
    runIdPath: "runId",
    modePath: "mode",
    expectedMode: "execution",
  },
});

const staticEvidence = {
  path: "{runDirectory}/static-report.json",
  format: "json",
  schemaPath: "schema/static-report.schema.json",
  statusPath: "status",
  passValues: ["pass"],
  runIdPath: "runId",
};

const staticFast = gate("static-fast", "quality:static", {
  timeoutMs: 900_000,
  stage: 3,
  evidence: { ...staticEvidence, modePath: "mode", expectedMode: "fast" },
});

const staticDelivery = gate("static-delivery", "quality:static:delivery", {
  timeoutMs: 1_200_000,
  stage: 3,
  evidence: { ...staticEvidence, modePath: "mode", expectedMode: "delivery" },
});

const staticFullAudit = gate("static-full-audit", "quality:static:full-audit", {
  timeoutMs: 1_200_000,
  stage: 3,
  evidence: { ...staticEvidence, modePath: "mode", expectedMode: "full-audit" },
});

const statusEvidence = (path, options = {}) => ({
  path: `{runDirectory}/${path}`,
  format: "json",
  ...(options.schemaPath ? { schemaPath: options.schemaPath } : {}),
  statusPath: "status",
  passValues: ["pass"],
  runIdPath: "runId",
  ...(options.expectedMode ? { modePath: "mode", expectedMode: options.expectedMode } : {}),
  ...(options.skipValues ? { skipValues: options.skipValues } : {}),
  ...(options.reasonPath ? { reasonPath: options.reasonPath } : {}),
});

const property = gate("property", "test:property", {
  timeoutMs: 300_000,
  stage: 6,
  kind: "test",
  evidence: statusEvidence("evidence/property-gate.json", {
    schemaPath: "schema/property-report.schema.json",
    expectedMode: "delivery-replay",
  }),
});

const propertyAudit = gate("property-random-audit", "test:property:audit", {
  timeoutMs: 300_000,
  stage: 7,
  kind: "test",
  evidence: statusEvidence("evidence/property-audit-gate.json", {
    schemaPath: "schema/property-report.schema.json",
    expectedMode: "random-audit",
  }),
});

const selfHosted = gate("self-hosted", "test:self-hosted", {
  timeoutMs: 600_000,
  stage: 9,
  kind: "test",
});

const packageQuality = gate("package-quality", "test:package:quality", {
  timeoutMs: 1_200_000,
  stage: 10,
  kind: "test",
  evidence: statusEvidence("package-report.json", {
    schemaPath: "schema/package-report.schema.json",
    expectedMode: "package",
  }),
});

const releaseQuality = gate("release-quality", "test:release:quality", {
  timeoutMs: 2_400_000,
  stage: 11,
  kind: "test",
  evidence: statusEvidence("release-report.json", {
    schemaPath: "schema/release-report.schema.json",
    expectedMode: "release",
  }),
});

const browserQuality = gate("browser-quality", "test:browser:quality", {
  timeoutMs: 2_700_000,
  stage: 12,
  kind: "test",
  evidence: statusEvidence("browser-report.json", {
    schemaPath: "schema/browser-report.schema.json",
    expectedMode: "execution",
  }),
});

const browserRepeatedAudit = gate("browser-repeated-audit", "test:browser:quality", {
  timeoutMs: 5_400_000,
  stage: 8,
  kind: "test",
  env: {
    JQS_BROWSER_REPEAT_EACH: "2",
    JQS_BROWSER_REPORT_NAME: "browser-repeat-report.json",
    JQS_BROWSER_SEED: "430044",
  },
  evidence: statusEvidence("browser-repeat-report.json", {
    schemaPath: "schema/browser-report.schema.json",
    expectedMode: "repeated-audit",
  }),
});

const ticket0044SelfTest = gate("ticket-0044-detector-self-test", "test:quality:0044", {
  timeoutMs: 3_600_000,
  stage: 14,
  kind: "test",
  evidence: statusEvidence("self-test-report.json", {
    schemaPath: "schema/quality-0044-self-test-report.schema.json",
    expectedMode: "self-test",
  }),
  when: {
    changed: [
      "config/api-extractor.json",
      "config/quality-budgets.json",
      "e2e/fixtures/**",
      "e2e/quality-contracts.spec.ts",
      "etc/jquery-star.api.md",
      "package-lock.json",
      "package.json",
      "playwright.config.ts",
      "quality/gates.mjs",
      "schema/**",
      "scripts/build-types.mjs",
      "scripts/quality-0044-self-test.mjs",
      "scripts/quality-browser.mjs",
      "scripts/quality/browser-process.mjs",
      "test/browser-process.test.mjs",
      "scripts/prepare-browser-fixtures.mjs",
      "scripts/prepare-navigation-decision.mjs",
      "scripts/prepare-resource-strategy.mjs",
      "scripts/quality/mobile-reference.mjs",
      "test/browser-preparation.test.mjs",
      "scripts/quality-package.mjs",
      "scripts/quality-release.mjs",
      "scripts/quality/budget-ratchet.mjs",
      "scripts/quality/package-release-contracts.mjs",
      "test/package-release-hardening.test.mjs",
    ],
    reason: "ticket 0044 detector and selector implementations are unchanged",
  },
});

const resourceResearchDependency = gate(
  "resource-research-dependency",
  "research:resources:prepare",
  {
    args: ["--", "--install-only"],
    stage: 0,
  },
);

const common = [ticket, runnerSelfTest, resourceResearchDependency, format, browserComponents];
const withoutChangeSelection = (configuredGate) => {
  const copy = { ...configuredGate };
  delete copy.when;
  return copy;
};

const deliveryOnly = [
  property,
  staticDelivery,
  selfHosted,
  packageQuality,
  releaseQuality,
  browserQuality,
  ticket0044SelfTest,
];

const fullAuditOnly = [
  property,
  propertyAudit,
  staticFullAudit,
  browserRepeatedAudit,
  selfHosted,
  packageQuality,
  releaseQuality,
  withoutChangeSelection(ticket0044SelfTest),
];

const fullAuditCommon = [
  ticket,
  withoutChangeSelection(runnerSelfTest),
  resourceResearchDependency,
  format,
  browserComponents,
];

export const qualityConfig = {
  schema: "jqstar-quality-config/1",
  modes: {
    fast: [...common, staticFast],
    delivery: [...common, ...deliveryOnly],
    "full-audit": [...fullAuditCommon, ...fullAuditOnly],
  },
};

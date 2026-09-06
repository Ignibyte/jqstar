// @vitest-environment node
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import { it } from "vitest";
import { sha256 } from "../scripts/program-audit/contracts.mjs";
import { selectDetector } from "../scripts/program-audit/detector.mjs";
import { validateMappings } from "../scripts/program-audit/requirements.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

const start = Date.parse("2026-09-06T00:00:00.000Z");
const iso = (offset) => new Date(start + offset).toISOString();
const sourceRoot = resolve(tmpdir(), "jqstar-detector-source");
const fixtureDirectory = resolve(tmpdir(), "jqstar-independent-artifacts", "self-test-fixtures");
const projects = [
  "desktop-chromium",
  "desktop-firefox",
  "desktop-webkit",
  "webmcp-chromium",
  "mobile-touch",
  "reduced-motion",
  "forced-colors",
  "zoom-reflow",
  "javascript-disabled",
];
const selectionProjects = projects.filter((project) => project !== "webmcp-chromium");

// Handwritten protocol fixtures, independent of the adapter's expected policy and validators.
// Package/release rows are semantic views; their full schemas are covered by retained-report probes.
function fixture() {
  const cases = [
    [
      "accessibility",
      "desktop-chromium",
      "@shared keyboard, error, updated, open, and disabled states remain accessible",
      "keyboard, error",
      "button-name",
    ],
    [
      "ownership-budget",
      "desktop-chromium",
      "@shared repeated enhancement stays inside structural ownership budgets",
      "repeated enhancement",
      "Expected: <= 1",
    ],
    [
      "network-fixture",
      "desktop-chromium",
      "@shared proof network detects abort, delay, disconnect, malformed, retry, redirect, conflict, and partial streams",
      "proof network",
      "retry-detector-sabotaged",
    ],
    [
      "mobile-target",
      "mobile-touch",
      "@mobile touch controls meet the documented target and reflow contracts",
      "touch controls",
      "Expected: >= 10000",
    ],
    [
      "reduced-motion",
      "reduced-motion",
      "@motion reduced-motion preference reaches the document",
      "reduced-motion preference",
      "animationMs",
    ],
    [
      "forced-colors",
      "forced-colors",
      "@color forced colors preserve visible focus and native controls",
      "forced colors",
      "Expected: > 100",
    ],
    [
      "zoom-reflow",
      "zoom-reflow",
      "@zoom content reflows at 200 percent",
      "content reflows",
      "Expected: <= 0",
    ],
    [
      "no-javascript",
      "javascript-disabled",
      "@nojs native content and disclosure remain usable without JavaScript",
      "native content",
      "Missing no-JavaScript heading",
    ],
    [
      "retry-pass-is-red",
      "quality-selftest",
      "@selftest production Playwright config keeps retry-passes red",
      null,
      "Expected: > 0",
    ],
  ];
  const controls = [
    [
      "browser-shard-refusal",
      "red",
      /cannot authorize browser quality until an all-shard result aggregator exists/u,
      "cannot authorize browser quality until an all-shard result aggregator exists",
      null,
    ],
    [
      "browser-empty-selection",
      "red",
      /No tests found[\s\S]*Browser quality failed/u,
      "No tests found\nBrowser quality failed",
      "empty-selection/playwright",
    ],
    [
      "retry-pass-is-red",
      "red",
      /1 flaky[\s\S]*production Playwright config keeps retry-passes red/u,
      "1 flaky\nproduction Playwright config keeps retry-passes red",
      "retry-pass",
    ],
    ["accessibility", "red", /button-name/u, "truncated output tail", "playwright/accessibility"],
    [
      "ownership-budget",
      "red",
      /Expected:\s*<= 1/u,
      "truncated output tail",
      "playwright/ownership-budget",
    ],
    [
      "network-fixture",
      "red",
      /retry-detector-sabotaged/u,
      "truncated output tail",
      "playwright/network-fixture",
    ],
    [
      "mobile-target",
      "red",
      /Expected:\s*>= 10000/u,
      "truncated output tail",
      "playwright/mobile-target",
    ],
    ["reduced-motion", "red", /animationMs/u, "truncated output tail", "playwright/reduced-motion"],
    [
      "forced-colors",
      "red",
      /Expected:\s*> 100/u,
      "truncated output tail",
      "playwright/forced-colors",
    ],
    ["zoom-reflow", "red", /Expected:\s*<= 0/u, "truncated output tail", "playwright/zoom-reflow"],
    [
      "no-javascript",
      "red",
      /Missing no-JavaScript heading/u,
      "truncated output tail",
      "playwright/no-javascript",
    ],
    [
      "package-budget",
      "red",
      /package-budgets: Packed bytes \d+ exceed the base and optional-entry allowances/u,
      "package-budgets: Packed bytes 123 exceed the base and optional-entry allowances.",
      null,
    ],
    ["api-report-drift", "red", /changed the API signature/u, "changed the API signature", null],
    [
      "artifact-manifest-drift",
      "red",
      /reproducible-build: Packed file manifests differ between clean builds/u,
      "reproducible-build: Packed file manifests differ between clean builds (1 changed; budget 0).",
      null,
    ],
    ["package-release-contract-hardening", "green", /Tests\s+15 passed/u, "Tests 15 passed", null],
    [
      "browser-selection-green-control",
      "green",
      /browser quality: 8 projects, \d+ selected tests[\s\S]*selection=passed/u,
      "browser quality: 8 projects, 8 selected tests\nselection=passed",
      "browser-green/playwright",
    ],
  ];
  const runId = "detector-fixture";
  const report = {
    schema: "jqstar-quality-0044-self-test/1",
    runId,
    mode: "self-test",
    status: "pass",
    checks: controls.map(([name, expected, pattern, output, directory]) => ({
      name,
      expected,
      detector: pattern.source,
      output,
      artifactDirectory: directory === null ? null : resolve(fixtureDirectory, directory),
      exitCode: expected === "red" ? 1 : 0,
      status: "pass",
      detectorMatched: true,
      evidenceMatched: true,
      evidenceFailure: null,
    })),
  };
  const command = { executable: "npm", args: ["run", "test:quality:0044"] };
  const fixtureSource = cases.map((row) => JSON.stringify(row[2])).join("\n");
  const context = {
    runId,
    sourceRoot,
    fixtureDirectory,
    fixtureSource,
    fixtureSha256: sha256(fixtureSource),
    nodePath: resolve(tmpdir(), "official-node", "bin", "node"),
    playwrightVersion: "1.62.1",
    command,
    timeoutMs: 3600000,
    npmVersion: "11.19.0",
    auditStart: start - 100,
    auditEnd: start + 1100,
    gate: {
      id: "ticket-0044-detector-self-test",
      status: "pass",
      enforced: true,
      selection: { selected: true },
      exitCode: 0,
      signal: null,
      command: structuredClone(command),
      timeoutMs: 3600000,
      toolVersion: "11.19.0",
      startedAt: iso(0),
      endedAt: iso(1000),
    },
    traceReferences: {},
    selectedTests: {},
  };
  const artifacts = { browser: {}, traces: {}, selections: {} };
  const config = (directory, configuredProjects, retries, args) => ({
    rootDir: resolve(sourceRoot, "e2e"),
    configFile: resolve(sourceRoot, "playwright.config.ts"),
    version: "1.62.1",
    failOnFlakyTests: true,
    shard: null,
    workers: 1,
    argv: [context.nodePath, resolve(sourceRoot, "node_modules/.bin/playwright"), ...args],
    projects: configuredProjects.map((name) => ({
      name,
      id: name,
      outputDir: resolve(directory, "test-results"),
      testDir: resolve(sourceRoot, "e2e"),
      repeatEach: 1,
      retries,
      timeout: 60000,
    })),
  });
  for (const [name, project, title, grep, message] of cases) {
    const retry = name === "retry-pass-is-red";
    const directory = resolve(fixtureDirectory, retry ? "retry-pass" : `playwright/${name}`);
    const tracePath = resolve(directory, "test-results", name, "trace.zip");
    const trace = { path: `indexed-traces/${name}.zip`, sha256: "a".repeat(64), bytes: 100 };
    context.traceReferences[tracePath] = trace;
    artifacts.traces[tracePath] = { ...trace, signature: "504b0304" };
    const results = [
      {
        status: "failed",
        retry: 0,
        startTime: iso(25),
        duration: 10,
        errors: [
          {
            message,
            location: {
              file: resolve(sourceRoot, "e2e/quality-contracts.spec.ts"),
              line: 1,
              column: 1,
            },
          },
        ],
        attachments: [{ name: "trace", contentType: "application/zip", path: tracePath }],
      },
    ];
    if (retry)
      results.push({
        status: "passed",
        retry: 1,
        startTime: iso(50),
        duration: 10,
        errors: [],
        attachments: [],
      });
    artifacts.browser[name] = {
      config: config(
        directory,
        retry ? ["quality-selftest"] : projects,
        retry ? 2 : 0,
        retry
          ? ["test", "--config", "playwright.config.ts", "--project=quality-selftest"]
          : ["test", "e2e/quality-contracts.spec.ts", `--project=${project}`, "--grep", grep],
      ),
      stats: {
        startTime: iso(20),
        duration: 200,
        expected: 0,
        skipped: 0,
        unexpected: retry ? 0 : 1,
        flaky: retry ? 1 : 0,
      },
      errors: [],
      suites: [
        {
          title: "quality-contracts.spec.ts",
          specs: [
            {
              file: "quality-contracts.spec.ts",
              title,
              ok: retry,
              tests: [
                {
                  projectName: project,
                  projectId: project,
                  expectedStatus: "passed",
                  status: retry ? "flaky" : "unexpected",
                  annotations: [],
                  results,
                },
              ],
            },
          ],
        },
      ],
    };
  }
  for (const name of ["empty", "green"]) {
    const empty = name === "empty";
    const directory = resolve(fixtureDirectory, empty ? "empty-selection" : "browser-green");
    const rows = [],
      rawProjects = {};
    for (const project of selectionProjects) {
      const root = resolve(directory, "playwright/browser-report", project);
      rows.push({
        project,
        selectedTests: empty ? 0 : 1,
        listExitCode: empty ? 1 : 0,
        runExitCode: null,
        executedTests: null,
        passedTests: null,
        failedTests: null,
        flakyTests: null,
        skippedTests: null,
        artifacts: {
          root,
          testResults: resolve(root, "test-results"),
          htmlReport: resolve(root, "html"),
          jsonReport: resolve(root, "results.json"),
        },
      });
      const title = `listed ${project}`;
      context.selectedTests[project] = [
        JSON.stringify(["quality-contracts.spec.ts", "quality-contracts.spec.ts", title]),
      ];
      rawProjects[project] = {
        config: config(root, projects, 2, [
          "test",
          "--list",
          `--project=${project}`,
          ...(empty ? ["--grep=__jqstar_missing_quality_test__"] : []),
        ]),
        stats: {
          startTime: iso(300),
          duration: 20,
          expected: 0,
          unexpected: 0,
          flaky: 0,
          skipped: empty ? 0 : 1,
        },
        errors: empty ? [{ message: "Error: No tests found" }] : [],
        suites: empty
          ? []
          : [
              {
                title: "quality-contracts.spec.ts",
                specs: [
                  {
                    title,
                    file: "quality-contracts.spec.ts",
                    ok: true,
                    tests: [
                      {
                        projectName: project,
                        projectId: project,
                        status: "skipped",
                        expectedStatus: "passed",
                        results: [],
                        annotations: [],
                      },
                    ],
                  },
                ],
              },
            ],
      };
    }
    artifacts.selections[name] = {
      projects: rawProjects,
      report: {
        schema: "jqstar-browser-quality/1",
        runId,
        mode: "selection",
        status: empty ? "fail" : "pass",
        listOnly: true,
        shard: null,
        workers: 1,
        repeatEach: 1,
        trace: "retain-on-failure",
        projects: rows,
      },
    };
  }
  const packageChecks = [
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
  ];
  artifacts.package = {
    schema: "jqstar-package-quality/1",
    runId,
    mode: "package",
    status: "fail",
    checks: packageChecks.map((name) => ({
      name,
      status: name === "package-budgets" ? "fail" : "pass",
      detail:
        name === "package-budgets"
          ? "Packed bytes 123 exceed the base and optional-entry allowances."
          : {},
    })),
  };
  const releaseChecks = [
    "clean-install",
    "reproducible-build",
    "sbom",
    "licenses",
    "provenance-eligibility",
    "supported-toolchain",
    "packed-self-hosted",
  ];
  artifacts.release = {
    schema: "jqstar-release-quality/1",
    runId,
    mode: "release",
    status: "fail",
    checks: releaseChecks.map((name) => ({
      name,
      status: name === "reproducible-build" ? "fail" : "pass",
      detail:
        name === "reproducible-build"
          ? "Packed file manifests differ between clean builds (1 changed; budget 0)."
          : {},
    })),
  };
  const apiDirectory = resolve(fixtureDirectory, "api-report");
  artifacts.api = {
    baseline: "corrupted API report\n",
    golden: "export function example(): void;\n",
    generated: "export function example(): void;\r\n",
    config: {
      projectFolder: sourceRoot,
      mainEntryPointFilePath: resolve(sourceRoot, "dist/types/index.d.ts"),
      apiReport: {
        enabled: true,
        reportFileName: "jquery-star.api.md",
        reportFolder: resolve(apiDirectory, "baseline"),
        reportTempFolder: resolve(apiDirectory, "temporary"),
      },
      docModel: { enabled: false },
      dtsRollup: { enabled: false },
      tsdocMetadata: { enabled: false },
      messages: { extractorMessageReporting: { "ae-missing-release-tag": { logLevel: "none" } } },
    },
  };
  context.apiGoldenSha256 = sha256(artifacts.api.golden);
  return { report, artifacts, context };
}
const select = (data, selector = "browser-shard-refusal") =>
  selectDetector(data.report, selector, data.artifacts, data.context);
const attempt = (data) =>
  data.artifacts.browser.accessibility.suites[0].specs[0].tests[0].results[0];

it("validates all controls with independent source and artifact roots before selecting any one", async () => {
  const data = fixture();
  assert.notEqual(sourceRoot, fixtureDirectory);
  const detectorSchema = createSchemaValidator(
    JSON.parse(await readFile("schema/quality-0044-self-test-report.schema.json", "utf8")),
  );
  const browserSchema = createSchemaValidator(
    JSON.parse(await readFile("quality/program-audit/playwright-report.schema.json", "utf8")),
  );
  const selectionSchema = createSchemaValidator(
    JSON.parse(
      await readFile("quality/program-audit/playwright-selection-report.schema.json", "utf8"),
    ),
  );
  assert(detectorSchema(data.report));
  for (const raw of Object.values(data.artifacts.browser)) assert(browserSchema(raw));
  for (const control of Object.values(data.artifacts.selections))
    for (const raw of Object.values(control.projects)) assert(selectionSchema(raw));
  assert.equal(data.report.checks.length, 16);
  for (const { name, expected } of data.report.checks) {
    const result = select(data, name);
    assert.equal(result.status, "pass");
    assert.equal(result.name, name);
    assert.equal(result.expected, expected);
    assert.equal(result.controls, 16);
  }
  assert.equal(select(data, "browser-selection-green-control").detail.selectedTests, 8);
  assert.equal(select(data, "browser-empty-selection").detail.selectedTests, 0);
  assert.equal(select(data, "retry-pass-is-red").detail.attempts, 2);
});

it.each([
  [
    "an interrupted parent",
    (d) => {
      d.context.gate.signal = "SIGTERM";
    },
  ],
  [
    "an unselected parent",
    (d) => {
      d.context.gate.selection.selected = false;
    },
  ],
  [
    "another command",
    (d) => {
      d.context.gate.command.args = ["run", "test:unit"];
    },
  ],
  [
    "another tool",
    (d) => {
      d.context.gate.toolVersion = "wrong";
    },
  ],
  [
    "another timeout",
    (d) => {
      d.context.gate.timeoutMs = 1;
    },
  ],
  [
    "another fixture source",
    (d) => {
      d.context.fixtureSource += "\n";
    },
  ],
  [
    "another run",
    (d) => {
      d.report.runId = "wrong";
    },
  ],
  [
    "a missing control",
    (d) => {
      d.report.checks.pop();
    },
  ],
  [
    "a duplicate control",
    (d) => {
      d.report.checks[1] = d.report.checks[0];
    },
  ],
  [
    "a null red exit",
    (d) => {
      d.report.checks[0].exitCode = null;
    },
  ],
  [
    "a negative red exit",
    (d) => {
      d.report.checks[0].exitCode = -1;
    },
  ],
  [
    "a failed green control",
    (d) => {
      d.report.checks[14].exitCode = 1;
    },
  ],
  [
    "a substituted detector",
    (d) => {
      d.report.checks[0].detector = ".*";
    },
  ],
  [
    "missing direct output",
    (d) => {
      d.report.checks[0].output = "wrong";
    },
  ],
  [
    "a foreign artifact directory",
    (d) => {
      d.report.checks[1].artifactDirectory = sourceRoot;
    },
  ],
  [
    "a missing raw browser control",
    (d) => {
      delete d.artifacts.browser.accessibility;
    },
  ],
  [
    "a hidden failed assertion",
    (d) => {
      attempt(d).errors = [];
    },
  ],
  [
    "a timeout instead of the intended failure",
    (d) => {
      attempt(d).status = "timedOut";
    },
  ],
  [
    "an invalid assertion location",
    (d) => {
      attempt(d).errors[0].location.line = 1000;
    },
  ],
  [
    "an oversized assertion error",
    (d) => {
      attempt(d).errors[0].message = "x".repeat(1048577);
    },
  ],
  [
    "a foreign trace",
    (d) => {
      attempt(d).attachments[0].path = resolve(sourceRoot, "trace.zip");
    },
  ],
  [
    "a missing indexed trace",
    (d) => {
      Reflect.deleteProperty(d.context.traceReferences, Object.keys(d.context.traceReferences)[0]);
    },
  ],
  [
    "a replaced trace",
    (d) => {
      Object.values(d.artifacts.traces)[0].sha256 = "b".repeat(64);
    },
  ],
  [
    "an empty trace",
    (d) => {
      Object.values(d.artifacts.traces)[0].bytes = 0;
    },
  ],
  [
    "a non-ZIP trace",
    (d) => {
      Object.values(d.artifacts.traces)[0].signature = "00000000";
    },
  ],
  [
    "a missing selection control",
    (d) => {
      delete d.artifacts.selections.empty;
    },
  ],
  [
    "a listing substituted for execution",
    (d) => {
      d.artifacts.selections.green.report.projects[0].executedTests = 1;
    },
  ],
  [
    "an empty listing failing for another reason",
    (d) => {
      d.artifacts.selections.empty.projects["desktop-chromium"].errors[0].message =
        "Error: Syntax error";
    },
  ],
  [
    "a listing with another worker policy",
    (d) => {
      d.artifacts.selections.green.projects["desktop-chromium"].config.workers = 2;
    },
  ],
  [
    "a sharded listing",
    (d) => {
      d.artifacts.selections.green.projects["desktop-chromium"].config.shard = {
        current: 1,
        total: 2,
      };
    },
  ],
  [
    "a listing that permits retry-passes",
    (d) => {
      d.artifacts.selections.green.projects["desktop-chromium"].config.failOnFlakyTests = false;
    },
  ],
  [
    "a listing with another project identity",
    (d) => {
      d.artifacts.selections.green.projects["desktop-chromium"].config.projects[0].id = "wrong";
    },
  ],
  [
    "a listing with another test directory",
    (d) => {
      d.artifacts.selections.green.projects["desktop-chromium"].config.projects[0].testDir =
        fixtureDirectory;
    },
  ],
  [
    "a listing with another project timeout",
    (d) => {
      d.artifacts.selections.green.projects["desktop-chromium"].config.projects[0].timeout = 1;
    },
  ],
  [
    "a wrong frozen test roster",
    (d) => {
      d.context.selectedTests["desktop-chromium"] = [];
    },
  ],
  [
    "a false green summary count",
    (d) => {
      d.report.checks[15].output =
        "browser quality: 8 projects, 9 selected tests\nselection=passed";
    },
  ],
  [
    "an additional package failure",
    (d) => {
      d.artifacts.package.checks[0].status = "fail";
    },
  ],
  [
    "a missing release check",
    (d) => {
      d.artifacts.release.checks.pop();
    },
  ],
  [
    "a contradictory package summary",
    (d) => {
      d.report.checks[11].output =
        "package-budgets: Packed bytes 999 exceed the base and optional-entry allowances.";
    },
  ],
  [
    "a changed API comparison baseline",
    (d) => {
      d.artifacts.api.baseline = "wrong\n";
    },
  ],
  [
    "a changed API snapshot",
    (d) => {
      d.artifacts.api.golden += "\n";
    },
  ],
  [
    "a changed generated API",
    (d) => {
      d.artifacts.api.generated += "export function invented(): void;\n";
    },
  ],
  [
    "a substituted API entry",
    (d) => {
      d.artifacts.api.config.mainEntryPointFilePath = resolve(sourceRoot, "other.d.ts");
    },
  ],
])("rejects the whole detector evidence set with %s", (_name, alter) => {
  const data = fixture();
  alter(data);
  assert.throws(() => select(data));
});

it("requires the deliberate retry to fail first, recover once and remain flaky", () => {
  for (const alter of [
    (test) => {
      test.results[0].status = "passed";
    },
    (test) => {
      test.results[1].status = "failed";
    },
    (test) => {
      test.status = "expected";
    },
    (test) => {
      test.results[1].startTime = test.results[0].startTime;
    },
    (test) => {
      test.results.push(structuredClone(test.results[1]));
    },
    (test) => {
      test.results[1].attachments = test.results[0].attachments;
      test.results[0].attachments = [];
    },
  ]) {
    const data = fixture();
    alter(data.artifacts.browser["retry-pass-is-red"].suites[0].specs[0].tests[0]);
    assert.throws(() => select(data));
  }
});

it("refuses a changed listing even when the aggregate count is adjusted", () => {
  const data = fixture();
  const raw = data.artifacts.selections.green.projects["desktop-chromium"];
  raw.suites[0].specs.push(structuredClone(raw.suites[0].specs[0]));
  raw.stats.skipped = 2;
  data.artifacts.selections.green.report.projects.find(
    (row) => row.project === "desktop-chromium",
  ).selectedTests = 2;
  data.report.checks[15].output = "browser quality: 8 projects, 9 selected tests\nselection=passed";
  assert.throws(() => select(data), /listing test roster/u);
});

it("requires literal selectors and keeps detector evidence separate from weaker kinds", async () => {
  for (const selector of ["*", "access*", "unknown"])
    assert.throws(() => select(fixture(), selector), /Unknown exact detector selector/u);
  const mappings = [
    {
      id: "control",
      review: "The failed control needs direct detector evidence.",
      requiredKinds: ["detector"],
      evidence: [
        {
          id: "control:detector",
          kind: "detector",
          path: "detectors.json",
          selector: "accessibility",
        },
      ],
    },
  ];
  const schema = createSchemaValidator(
    JSON.parse(await readFile("quality/program-audit/mappings.schema.json", "utf8")),
  );
  assert(schema(mappings));
  assert(validateMappings([{ id: "control" }], mappings));
  for (const kind of ["source", "unit", "browser", "coverage"]) {
    const weaker = structuredClone(mappings);
    weaker[0].evidence[0].kind = kind;
    assert.throws(
      () => validateMappings([{ id: "control" }], weaker),
      /cannot be replaced by a weaker type/u,
    );
  }
});

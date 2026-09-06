// @vitest-environment node
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "vitest";
import { sha256 } from "../scripts/program-audit/contracts.mjs";
import {
  selectPackage,
  selectPlaywright,
  selectProperty,
  selectSource,
  selectStatic,
  selectVitest,
  validateQualityEnvelope,
  validateSubordinate,
} from "../scripts/program-audit/evidence.mjs";
import {
  deterministicJson,
  readAuditFile,
  writeAuditSnapshot,
} from "../scripts/program-audit/files.mjs";

// Small synthetic report controls. These are never program-acceptance evidence.
const start = "2026-09-06T00:00:00.000Z";
const end = "2026-09-06T00:01:00.000Z";
const context = {
  runId: "synthetic",
  start: Date.parse(start),
  end: Date.parse(end),
  mode: "delivery",
};
const artifact = { filename: "jquery-star-1.1.0.tgz", sha256: "a".repeat(64), bytes: 123 };
const gate = () => ({
  id: "unit",
  status: "pass",
  enforced: true,
  selection: { selected: true },
  exitCode: 0,
  signal: null,
  startedAt: start,
  endedAt: end,
});

function quality() {
  const fingerprint = { algorithm: "sha256", digest: "b".repeat(64), fileCount: 10 };
  return {
    schema: "jqstar-quality-report/1",
    runId: "synthetic",
    status: "pass",
    mode: "delivery",
    head: "c".repeat(40),
    interruption: null,
    receipt: { eligible: true },
    startFingerprint: { ...fingerprint },
    endFingerprint: { ...fingerprint },
    environment: { node: "v24.0.0", npm: "11.0.0" },
    startedAt: start,
    endedAt: end,
    gates: [gate()],
  };
}

const expected = {
  mode: "delivery",
  commit: "c".repeat(40),
  fingerprint: quality().startFingerprint,
  environment: quality().environment,
  notBefore: start,
  notAfter: end,
  requiredGates: ["unit"],
};

function rejectChanges(make, verify, changes) {
  for (const change of changes) {
    const bad = make();
    change(bad);
    assert.throws(() => verify(bad));
  }
}

describe("program audit report adapters", () => {
  it("binds successful executions to frozen source, toolchain, scope and time", () => {
    assert.deepEqual(validateQualityEnvelope(quality(), expected), contextWithoutMode());
    rejectChanges(quality, (r) => validateQualityEnvelope(r, expected), [
      (r) => {
        r.head = "d".repeat(40);
      },
      (r) => {
        r.endFingerprint.digest = "e".repeat(64);
      },
      (r) => {
        r.startFingerprint.fileCount = 0;
      },
      (r) => {
        r.environment.node = "v26.0.0";
      },
      (r) => {
        r.mode = "fast";
      },
      (r) => {
        r.receipt.eligible = false;
      },
      (r) => {
        r.startedAt = "2026-09-05T23:59:59.000Z";
      },
      (r) => {
        r.gates[0].endedAt = "2026-09-06T00:01:01.000Z";
      },
      (r) => {
        r.gates[0].status = "skip";
      },
      (r) => {
        r.gates[0].enforced = false;
      },
      (r) => {
        r.gates[0].selection.selected = false;
      },
      (r) => {
        r.gates.push(gate());
      },
      (r) => {
        r.gates = [];
      },
    ]);
  });

  it("requires the named unit assertion even when the aggregate claims success", () => {
    const citation = { path: "test/lifecycle.test.ts", selector: "lifecycle disposes once" };
    const make = () => ({
      success: true,
      numTotalTests: 1,
      numPassedTests: 1,
      numFailedTests: 0,
      numPendingTests: 0,
      numTodoTests: 0,
      numFailedTestSuites: 0,
      numPendingTestSuites: 0,
      startTime: context.start,
      testResults: [
        {
          name: "/audit/test/lifecycle.test.ts",
          startTime: context.start,
          endTime: context.end,
          status: "passed",
          assertionResults: [
            { fullName: citation.selector, status: "passed", failureMessages: [] },
          ],
        },
      ],
    });
    const verify = (r) => selectVitest(r, citation, "/audit", context);
    assert.equal(verify(make()).status, "pass");
    rejectChanges(make, verify, [
      (r) => {
        r.testResults[0].assertionResults[0].status = "pending";
      },
      (r) => {
        r.testResults[0].assertionResults[0].failureMessages = ["private-canary"];
      },
      (r) => {
        r.testResults[0].assertionResults[0].fullName = "different assertion";
      },
      (r) => {
        r.testResults[0].assertionResults.push(r.testResults[0].assertionResults[0]);
      },
      (r) => {
        r.testResults[0].name = "/private/test/lifecycle.test.ts";
      },
      (r) => {
        r.testResults[0].startTime = context.start - 1;
      },
      (r) => {
        r.numPendingTests = 1;
      },
    ]);
  });

  it("rejects browser retries, expected failures, missing projects and narrowed repeats", () => {
    const citation = { path: "e2e/lifecycle.spec.ts", selector: "restores focus" };
    const make = () => ({
      errors: [],
      stats: { expected: 1, unexpected: 0, skipped: 0, flaky: 0, startTime: start, duration: 100 },
      suites: [
        {
          specs: [
            {
              title: citation.selector,
              file: "lifecycle.spec.ts",
              ok: true,
              tests: [
                {
                  projectName: "desktop-webkit",
                  expectedStatus: "passed",
                  status: "expected",
                  annotations: [],
                  results: [
                    {
                      status: "passed",
                      retry: 0,
                      errors: [],
                      startTime: start,
                      duration: 50,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    });
    const verify = (r) =>
      selectPlaywright(r, citation, { ...context, project: "desktop-webkit", repeats: 1 });
    assert.equal(verify(make()).status, "pass");
    const test = (r) => r.suites[0].specs[0].tests[0];
    rejectChanges(make, verify, [
      (r) => {
        test(r).results[0].retry = 1;
      },
      (r) => {
        test(r).expectedStatus = "failed";
      },
      (r) => {
        test(r).annotations.push({ type: "fixme" });
      },
      (r) => {
        test(r).projectName = "desktop-chromium";
      },
      (r) => {
        test(r).results[0].status = "skipped";
      },
      (r) => {
        r.suites[0].specs.push(r.suites[0].specs[0]);
      },
      (r) => {
        r.errors = [{ message: "private-canary" }];
      },
    ]);
    assert.throws(() =>
      selectPlaywright(make(), citation, { ...context, project: "desktop-webkit", repeats: 2 }),
    );
  });

  it("requires property runs, selected static gates and the exact installed package", async () => {
    const property = {
      schema: "jqstar-property-report/1",
      ...contextWithoutTimes(),
      status: "pass",
      mode: "delivery-replay",
      exitCode: 0,
      signal: null,
      failures: [],
      startedAt: start,
      finishedAt: end,
      properties: [
        { id: "model", status: "pass", skips: 0, effectiveRuns: 100, configuredRuns: 100 },
      ],
    };
    const pc = { ...context, mode: "delivery-replay", minimumRuns: 100 };
    assert.equal(selectProperty(property, "model", pc).cases, 100);
    rejectChanges(
      () => structuredClone(property),
      (r) => selectProperty(r, "model", pc),
      [
        (r) => {
          r.properties[0].effectiveRuns = 99;
        },
        (r) => {
          r.properties[0].skips = 1;
        },
        (r) => {
          r.runId = "other-run";
        },
      ],
    );
    const staticReport = {
      schema: "jqstar-static-report/1",
      ...contextWithoutTimes(),
      mode: "delivery",
      status: "pass",
      gates: [gate()],
    };
    assert.equal(selectStatic(staticReport, "unit", context).status, "pass");
    staticReport.gates[0].exitCode = 1;
    assert.throws(() => selectStatic(staticReport, "unit", context));
    const packageReport = {
      schema: "jqstar-package-quality/1",
      ...contextWithoutTimes(),
      mode: "package",
      status: "pass",
      package: { filename: artifact.filename, packedBytes: artifact.bytes },
      checks: [
        {
          name: "browser-consumers",
          status: "pass",
          detail: { subject: "installed-tarball", csp: { tarballDigest: artifact.sha256 } },
        },
        { name: "copy-in-registry", status: "pass" },
      ],
    };
    const packageSchema = JSON.parse(await readFile("schema/package-report.schema.json", "utf8"));
    assert.equal(packageReport.schema, packageSchema.properties.schema.const);
    const verify = (r) => selectPackage(r, "copy-in-registry", { ...context, artifact });
    assert.equal(verify(packageReport).status, "pass");
    packageReport.checks[0].detail.csp.tarballDigest = "f".repeat(64);
    assert.throws(() => verify(packageReport));
    assert.throws(() =>
      validateSubordinate(
        { ...staticReport, mode: "fast" },
        staticReport.schema,
        context,
        "delivery",
      ),
    );
  });

  it("rejects stale or ambiguous source excerpts without reflecting source contents", () => {
    const source = "export function dispose() { release(); }";
    assert.equal(selectSource(source, sha256(source), "release();").status, "pass");
    for (const [text, digest, excerpt] of [
      [source, "a".repeat(64), "release();"],
      [source, sha256(source), "private-canary"],
      ["repeat repeat", sha256("repeat repeat"), "repeat"],
    ]) {
      assert.throws(
        () => selectSource(text, digest, excerpt),
        (error) => !String(error).includes("private-canary"),
      );
    }
  });
});

function contextWithoutMode() {
  return { runId: context.runId, start: context.start, end: context.end };
}
function contextWithoutTimes() {
  return { runId: context.runId };
}

describe("program audit file boundaries", () => {
  it("rejects symlink escape, oversized and invalid UTF-8 input and digest replacement", async () => {
    const root = await mkdtemp(join(tmpdir(), "jqstar-audit-files-"));
    try {
      await writeFile(join(root, "proof.json"), '{"status":"pass"}');
      const proof = await readAuditFile(root, "proof.json");
      assert.equal(proof.sha256, sha256(proof.source));
      await symlink(join(root, "proof.json"), join(root, "link.json"));
      await mkdir(join(root, "directory"));
      await symlink(join(root, "directory"), join(root, "linked-directory"));
      await writeFile(join(root, "invalid.json"), Buffer.from([0xff]));
      for (const path of [
        "link.json",
        "linked-directory/proof.json",
        "../private-canary",
        "invalid.json",
        "directory",
      ])
        await assert.rejects(
          readAuditFile(root, path),
          (error) => !String(error).includes(root) && !String(error).includes("private-canary"),
        );
      await assert.rejects(readAuditFile(root, "proof.json", { maximumBytes: 1 }));
      await writeFile(join(root, "proof.json"), '{"status":"fail"}');
      await assert.rejects(readAuditFile(root, "proof.json", { digest: proof.sha256 }));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });

  it("writes deterministic exclusive snapshots and refuses to overwrite previous evidence", async () => {
    const root = await mkdtemp(join(tmpdir(), "jqstar-audit-output-"));
    try {
      const data = { z: [{ second: 2, first: 1 }], a: "pending" };
      const reordered = { a: "pending", z: [{ first: 1, second: 2 }] };
      assert.equal(deterministicJson(data), deterministicJson(reordered));
      const name = sha256(deterministicJson(data));
      const files = await writeAuditSnapshot(root, name, data, "Synthetic pending inventory.\n");
      for (const file of files)
        assert.equal(sha256(await readFile(join(root, file.path))), file.sha256);
      await assert.rejects(writeAuditSnapshot(root, name, {}, "replacement"));
      assert.equal(
        await readFile(join(root, name, "inventory.json"), "utf8"),
        deterministicJson(data),
      );
      await assert.rejects(writeAuditSnapshot(root, "../private-canary", data, "invalid"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

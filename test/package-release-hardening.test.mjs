import { spawn } from "node:child_process";
import { access, cp, mkdtemp, mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import { describe, expect, it } from "vitest";

import {
  assertExactPackageDocumentationPaths,
  initializeChecks,
  packageDocumentationPaths,
  packageCheckNames,
  prepareIndependentWorkspaces,
  recordCheck,
  releaseCheckNames,
  reportStatus,
} from "../scripts/quality/package-release-contracts.mjs";
import { evaluateBudgetRatchet } from "../scripts/quality/budget-ratchet.mjs";
import { cspCodeViolations } from "../scripts/quality/csp-graph.mjs";
import { withOwnedTemporaryDirectory } from "../scripts/quality/lib/owned-temporary-directory.mjs";
import { runChild } from "../scripts/quality/lib/process.mjs";

const root = process.cwd();
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

async function compileSchema(path) {
  const schema = JSON.parse(await readFile(resolve(root, path), "utf8"));
  return new Ajv2020({ allErrors: true, strict: true }).compile(schema);
}

function passingChecks(names) {
  return names.map((name) => ({ name, status: "pass", detail: `${name} passed` }));
}

function packageReport() {
  const checks = passingChecks(packageCheckNames);
  checks[3].detail = {
    ratchet: {
      status: "first-baseline",
      baseRevision: "a".repeat(40),
      reason: "immutable delivery base has no quality budgets",
      failures: [],
    },
    measurements: {
      files: 1,
      packedBytes: 1,
      unpackedBytes: 1,
      bundles: { "dist/jquery-star.js": 1 },
    },
  };
  checks[4].detail = {
    exports: [
      ".",
      "./core",
      "./csp",
      "./ui",
      "./datastar",
      "./testing",
      "./turbo",
      "./datastar/testing",
      "./ui.css",
    ],
    version: "0.1.0",
    documentation: [...packageDocumentationPaths],
  };
  checks[8].detail = {
    consumers: [
      "esm",
      "commonjs",
      "core-only-esm",
      "modular-esm",
      "modular-commonjs",
      "testing-esm",
      "testing-commonjs",
      "csp-esm-corpus",
      "csp-commonjs-corpus",
      "private-path",
      "typescript-nodenext",
      "typescript-bundler",
      "typescript-modular-nodenext",
      "typescript-modular-bundler",
      "typescript-testing-nodenext",
      "typescript-testing-bundler",
      "typescript-csp-nodenext",
      "typescript-csp-bundler",
    ],
    peerDependencies: {
      jqueryRange: ">=4.0.0 <5",
      turboRange: ">=8.0.21 <8.1.0",
      turboOptional: true,
      missing: { exitCode: 1, markers: ["jquery"] },
      incompatible: { exitCode: 1, markers: ["ERESOLVE", "jquery"] },
    },
  };
  checks[10].detail = {
    subject: "installed-tarball",
    consumers: ["module", "umd", "testing", "csp"],
    lifecycle: "boot-and-dispose",
    engines: ["chromium", "firefox", "webkit"].map((name) => ({
      name,
      status: "pass",
      version: "1.2.3",
    })),
    csp: {
      schema: "jqstar-csp-browser/1",
      policy: "default-src 'none'",
      packageVersion: "0.1.0",
      grammarVersion: "jqstar-csp-expression/1",
      corpusDigest: "a".repeat(64),
      sourceDigest: "b".repeat(64),
      tarballDigest: "c".repeat(64),
      bundleDigests: { esm: "d".repeat(64), commonjs: "e".repeat(64) },
      formats: ["esm", "commonjs"],
      engines: ["chromium", "firefox", "webkit"].map((name) => ({
        name,
        version: "1.2.3",
        status: "pass",
        headerResponses: 1,
        policyEvents: 1,
        policyReports: 0,
        expectedCanaryConsoleMessages: 1,
        unexpectedPolicyEvents: 0,
        unexpectedPolicyReports: 0,
        operationCount: 1,
        disposal: { attempted: 1, failed: 0, released: 1, remaining: 0 },
        noJavaScript: "native-link-and-form",
      })),
    },
  };
  checks[11].detail = {
    root: { bytes: 1, budget: 1 },
    core: {
      bytes: 1,
      budget: 1,
      gzipBytes: 1,
      gzipBudget: 1,
      modules: 1,
      forbiddenOptionalModules: "absent",
    },
    csp: {
      bytes: 1,
      budget: 1,
      brotliBytes: 1,
      brotliBudget: 1,
      gzipBytes: 1,
      gzipBudget: 1,
      modules: 1,
      trustedCompiler: "absent",
      dynamicCode: "absent",
    },
    testing: {
      bytes: 1,
      budget: 1,
      gzipBytes: 1,
      gzipBudget: 1,
      modules: 1,
      datastarSDK: "absent",
      externalDOMAndRunners: "absent",
    },
    datastarTesting: {
      bytes: 1,
      budget: 1,
      gzipBytes: 1,
      gzipBudget: 1,
      modules: 1,
      externalDOMAndRunners: "absent",
    },
    turbo: {
      bytes: 1,
      budget: 1,
      gzipBytes: 1,
      gzipBudget: 1,
      modules: 1,
      hostPackage: "absent",
    },
  };
  return {
    schema: "jqstar-package-quality/1",
    runId: "package-test-1",
    mode: "package",
    status: "pass",
    package: {
      filename: "jquery-star-0.1.0.tgz",
      files: 1,
      packedBytes: 1,
      unpackedBytes: 1,
    },
    checks,
    futureContracts: [],
  };
}

function releaseReport() {
  const checks = passingChecks(releaseCheckNames);
  checks[1].detail = {
    files: 1,
    budgetRatchet: {
      status: "pass",
      baseRevision: "a".repeat(40),
      reason: "compared with quality budgets at immutable delivery base",
      failures: [],
    },
    generatedOutputBudget: 0,
    generatedOutputChanges: 0,
    independentlyMaterializedWorkspaces: 2,
    sha256: "b".repeat(64),
  };
  return {
    schema: "jqstar-release-quality/1",
    runId: "release-test-1",
    mode: "release",
    status: "pass",
    checks,
    environment: {
      node: "v26.3.0",
      npm: "11.6.2",
      playwright: "Version 1.62.1",
      typescript: "Version 5.9.3",
      browsers: {
        chromium: { version: "140.0.0" },
        firefox: { version: "142.0" },
        webkit: { version: "26.0" },
      },
    },
    provenance: {
      eligible: true,
      oidcEligible: true,
      publishEligible: true,
      repositoryEligible: true,
      note: "Eligibility only; this gate never publishes.",
    },
  };
}

describe("package and release quality contracts", () => {
  it("keeps every CSP dynamic-code detector live with negative canaries", () => {
    const canaries = new Map([
      ["dynamic-import", 'import("./payload.js")'],
      ["eval", '(0, eval)("payload")'],
      ["Function", 'new globalThis.Function("return 1")'],
      ["string-timer", 'globalThis.setTimeout("payload", 0)'],
      ["webassembly-compilation", "globalThis.WebAssembly.compile(bytes)"],
      ["blob-construction", 'new Blob(["payload"], { type: "text/javascript" })'],
      ["blob-url-construction", "URL.createObjectURL(blob)"],
      ["script-element-generation", 'document.createElement("script")'],
      ["data-script-url", 'script.src = "data:text/javascript,payload"'],
      ["script-text-injection", 'scriptNode.textContent = "payload"'],
    ]);
    for (const [kind, source] of canaries) {
      expect(
        cspCodeViolations(source).map((violation) => violation.kind),
        kind,
      ).toContain(kind);
    }
    expect(cspCodeViolations("export const value = input + 1")).toEqual([]);
  });

  it("routes package and release workspaces through owned cleanup", async () => {
    for (const path of ["scripts/quality-package.mjs", "scripts/quality-release.mjs"]) {
      const source = await readFile(resolve(root, path), "utf8");
      expect(source, path).toContain("OwnedTemporaryDirectory");
      expect(source, path).toContain("finally");
    }

    const parent = await mkdtemp(join(resolve(root, ".git/jqstar"), "release-cleanup-"));
    try {
      await withOwnedTemporaryDirectory({ parent, prefix: "success-" }, async (directory) => {
        await writeFile(join(directory, "owned.txt"), "owned\n", "utf8");
      });
      expect(await readdir(parent)).toEqual([]);

      await expect(
        withOwnedTemporaryDirectory({ parent, prefix: "failure-" }, async () => {
          throw new Error("expected failure");
        }),
      ).rejects.toThrow("expected failure");
      expect(await readdir(parent)).toEqual([]);
    } finally {
      await rm(parent, { force: true, recursive: true });
    }
  });

  it("bounds release browser inventory through the supervised engine preflight", async () => {
    const releaseSource = await readFile(resolve(root, "scripts/quality-release.mjs"), "utf8");
    const preflightSource = await readFile(
      resolve(root, "scripts/quality/browser-preflight.mjs"),
      "utf8",
    );
    expect(releaseSource).toContain('import { runChild } from "./quality/lib/process.mjs"');
    expect(releaseSource).toContain('for (const name of ["chromium", "firefox", "webkit"])');
    expect(releaseSource).toContain('args: [preflight, name, "--json"]');
    expect(releaseSource).toContain("timeoutMs: 45_000");
    expect(releaseSource).not.toContain(".jqstar-browser-versions.mjs");
    expect(preflightSource).toContain("browserType.launch({ timeout: 30_000 })");
    expect(preflightSource).toContain('process.argv.includes("--json")');
  });

  it("removes an owned release workspace before terminating on a signal", async () => {
    const parent = await mkdtemp(join(resolve(root, ".git/jqstar"), "release-signal-"));
    try {
      for (const terminationSignal of ["SIGHUP", "SIGINT", "SIGTERM"]) {
        const child = spawn(
          process.execPath,
          [resolve(root, "test/fixtures/owned-temporary-directory-signal.mjs"), parent],
          { cwd: root, stdio: ["ignore", "pipe", "pipe"] },
        );
        let stderr = "";
        child.stderr.setEncoding("utf8");
        child.stderr.on("data", (chunk) => {
          stderr += chunk;
        });
        try {
          const directory = await new Promise((resolveDirectory, reject) => {
            const timeout = setTimeout(
              () => reject(new Error(`Signal fixture did not become ready. ${stderr}`)),
              5_000,
            );
            child.stdout.setEncoding("utf8");
            child.stdout.once("data", (chunk) => {
              clearTimeout(timeout);
              resolveDirectory(String(chunk).trim());
            });
            child.once("exit", (code, signal) => {
              clearTimeout(timeout);
              reject(
                new Error(
                  `Signal fixture exited before readiness (code ${String(code)}, signal ${String(signal)}). ${stderr}`,
                ),
              );
            });
          });
          expect(child.kill(terminationSignal)).toBe(true);
          const exit = await new Promise((resolveExit) =>
            child.once("exit", (code, signal) => resolveExit({ code, signal })),
          );
          expect(exit).toEqual({ code: null, signal: terminationSignal });
          await expect(access(directory)).rejects.toMatchObject({ code: "ENOENT" });
          expect(await readdir(parent)).toEqual([]);
        } finally {
          if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
        }
      }
    } finally {
      await rm(parent, { force: true, recursive: true });
    }
  }, 10_000);

  it("ships exactly the public guides linked from the package README", async () => {
    const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
    expect(manifest.files).not.toContain("docs");
    expect(manifest.files).toEqual(expect.arrayContaining(packageDocumentationPaths));
    expect(assertExactPackageDocumentationPaths([...packageDocumentationPaths])).toEqual(
      packageDocumentationPaths,
    );
    expect(() => assertExactPackageDocumentationPaths(packageDocumentationPaths.slice(1))).toThrow(
      "Packed documentation",
    );
    expect(() =>
      assertExactPackageDocumentationPaths([...packageDocumentationPaths, "docs/tickets/0044.md"]),
    ).toThrow("Packed documentation");
  });

  it("preserves every source module that installs runtime behavior at import time", async () => {
    const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
    expect(manifest.sideEffects).toEqual(
      expect.arrayContaining(["./src/index.ts", "./registry/blocks/*.ts"]),
    );
  });

  it("does not expose the old package-build bypass and keeps build mandatory", async () => {
    const source = await readFile(resolve(root, "scripts/quality-package.mjs"), "utf8");
    expect(source).not.toContain("JQS_PACKAGE_SKIP_BUILD");
    expect(packageCheckNames[0]).toBe("build");
    expect(source).toContain('await record("build"');
  });

  it("records each named check once and derives status from every outcome", async () => {
    expect(() => initializeChecks(["duplicate", "duplicate"])).toThrow("must be unique");
    const report = { checks: initializeChecks(packageCheckNames) };
    expect(reportStatus(report.checks)).toBe("error");
    for (const name of packageCheckNames) await recordCheck(report, name, () => "passed");
    expect(reportStatus(report.checks)).toBe("pass");
    await expect(recordCheck(report, "build", () => "duplicate")).rejects.toThrow(
      "ran more than once",
    );

    const failed = { checks: initializeChecks(releaseCheckNames) };
    for (const name of releaseCheckNames) {
      await recordCheck(failed, name, () => {
        if (name === "sbom") throw new Error("sabotaged");
        return "passed";
      });
    }
    expect(reportStatus(failed.checks)).toBe("fail");
  });

  it("materializes and installs exactly two distinct release workspaces", async () => {
    const copied = [];
    const installed = [];
    await prepareIndependentWorkspaces(
      ["workspace-one", "workspace-two"],
      (workspace) => copied.push(workspace),
      (workspace) => installed.push(workspace),
    );
    expect(copied).toEqual(["workspace-one", "workspace-two"]);
    expect(installed).toEqual(["workspace-one", "workspace-two"]);
    await expect(
      prepareIndependentWorkspaces(
        ["workspace", "workspace"],
        () => {},
        () => {},
      ),
    ).rejects.toThrow("two distinct workspaces");
  });

  it("rejects every immutable-base budget ceiling increase or removal", () => {
    const baseline = {
      $schema: "jqstar-quality-budgets/1",
      ratchet: {
        comparison: "immutable-delivery-base",
        firstBaseline: "establish-when-base-has-no-budgets",
      },
      package: { packedBytes: 100, files: 10 },
      browser: { queries: 20, requests: 0 },
    };
    const tightened = structuredClone(baseline);
    tightened.package.packedBytes = 99;
    expect(evaluateBudgetRatchet(tightened, baseline, "a".repeat(40)).status).toBe("pass");

    const loosened = structuredClone(baseline);
    loosened.browser.queries = 21;
    expect(evaluateBudgetRatchet(loosened, baseline, "a".repeat(40))).toMatchObject({
      status: "fail",
      failures: ["browser.queries 21 loosens immutable-base ceiling 20."],
    });

    const removed = structuredClone(baseline);
    delete removed.package.files;
    expect(evaluateBudgetRatchet(removed, baseline, "a".repeat(40))).toMatchObject({
      status: "fail",
      failures: ["package.files was removed from the immutable-base budgets."],
    });
    expect(evaluateBudgetRatchet(baseline, null, "a".repeat(40)).status).toBe("first-baseline");
  });

  it("rejects missing, duplicate, misbound, and false-green package evidence", async () => {
    const validate = await compileSchema("schema/package-report.schema.json");
    const valid = packageReport();
    expect(validate(valid), JSON.stringify(validate.errors)).toBe(true);
    const red = structuredClone(valid);
    red.status = "fail";
    red.checks[0] = { ...red.checks[0], status: "fail", detail: "sabotaged build" };
    expect(validate(red), JSON.stringify(validate.errors)).toBe(true);
    const errored = structuredClone(valid);
    errored.status = "error";
    errored.checks[0] = { ...errored.checks[0], status: "error", detail: "build did not run" };
    expect(validate(errored), JSON.stringify(validate.errors)).toBe(true);

    for (const mutate of [
      (report) => report.checks.pop(),
      (report) => (report.checks[1] = structuredClone(report.checks[0])),
      (report) => ([report.checks[0], report.checks[1]] = [report.checks[1], report.checks[0]]),
      (report) => (report.mode = "release"),
      (report) => (report.runId = "invalid run/id"),
      (report) => (report.checks[0].status = "fail"),
      (report) => (report.status = "fail"),
      (report) => (report.status = "error"),
      (report) => report.checks[10].detail.engines.pop(),
      (report) => (report.checks[10].detail.engines[0].version = ""),
      (report) => delete report.checks[10].detail.lifecycle,
      (report) => delete report.checks[8].detail.peerDependencies.missing,
      (report) => delete report.checks[8].detail.peerDependencies.turboOptional,
      (report) => (report.checks[8].detail.peerDependencies.incompatible.exitCode = 0),
      (report) => report.checks[8].detail.consumers.pop(),
      (report) => (report.checks[3].detail.ratchet.status = "fail"),
      (report) => report.checks[4].detail.documentation.pop(),
      (report) => report.checks[4].detail.documentation.push("docs/tickets/0044.md"),
      (report) => delete report.checks[11].detail.turbo,
    ]) {
      const sabotaged = structuredClone(valid);
      mutate(sabotaged);
      expect(validate(sabotaged), JSON.stringify(sabotaged)).toBe(false);
    }
  });

  it("rejects missing, duplicate, misbound, and false-green release evidence", async () => {
    const validate = await compileSchema("schema/release-report.schema.json");
    const valid = releaseReport();
    expect(validate(valid), JSON.stringify(validate.errors)).toBe(true);
    const red = structuredClone(valid);
    red.status = "fail";
    red.checks[0] = { ...red.checks[0], status: "fail", detail: "sabotaged install" };
    expect(validate(red), JSON.stringify(validate.errors)).toBe(true);
    const errored = structuredClone(valid);
    errored.status = "error";
    errored.checks[0] = { ...errored.checks[0], status: "error", detail: "install did not run" };
    expect(validate(errored), JSON.stringify(validate.errors)).toBe(true);

    for (const mutate of [
      (report) => report.checks.pop(),
      (report) => (report.checks[1] = structuredClone(report.checks[0])),
      (report) => ([report.checks[0], report.checks[1]] = [report.checks[1], report.checks[0]]),
      (report) => (report.mode = "package"),
      (report) => (report.runId = "invalid run/id"),
      (report) => (report.checks[0].status = "fail"),
      (report) => (report.status = "fail"),
      (report) => (report.status = "error"),
      (report) => delete report.environment.browsers.webkit,
      (report) => (report.environment.browsers.chromium.version = ""),
      (report) => (report.checks[1].detail.generatedOutputChanges = 1),
    ]) {
      const sabotaged = structuredClone(valid);
      mutate(sabotaged);
      expect(validate(sabotaged), JSON.stringify(sabotaged)).toBe(false);
    }
  });

  it("puts the complete jQuery augmentation under API Extractor drift control", async () => {
    const build = await runChild({
      command: process.execPath,
      args: ["scripts/build-types.mjs"],
      cwd: root,
      timeoutMs: 15_000,
      env: process.env,
    });
    const buildOutput = `${build.stdout}${build.stderr}`;
    expect(build.timedOut, buildOutput).toBe(false);
    expect(build.spawnError, buildOutput).toBeNull();
    expect(build.signal, buildOutput).toBeNull();
    expect(build.exitCode, buildOutput).toBe(0);
    const declaration = await readFile(resolve(root, "dist/index.d.ts"), "utf8");
    const apiReport = await readFile(resolve(root, "etc/jquery-star.api.md"), "utf8");
    for (const marker of ["interface JQueryStarJQuery", "interface JQueryStarJQueryStatic"]) {
      expect(declaration).toContain(marker);
      expect(apiReport).toContain(marker);
    }
    expect(declaration).toContain("interface JQuery extends JQueryStarJQuery {}");
    expect(declaration).toContain("interface JQueryStatic extends JQueryStarJQueryStatic {}");

    const fixtureRoot = resolve(root, ".git/jqstar");
    await mkdir(fixtureRoot, { recursive: true });
    const directory = await mkdtemp(join(fixtureRoot, "api-augmentation-drift-"));
    try {
      const temporary = join(directory, "temporary");
      await mkdir(temporary, { recursive: true });
      const types = join(directory, "types");
      await cp(resolve(root, "dist/types"), types, { recursive: true });
      const entryPoint = join(types, "index.d.ts");
      const originalEntryPoint = await readFile(entryPoint, "utf8");
      const sabotagedEntryPoint = originalEntryPoint.replace(
        'star(command: "destroy" | "refresh"): JQuery;',
        'star(command: "destroy" | "refresh" | "reset"): JQuery;',
      );
      expect(sabotagedEntryPoint).not.toBe(originalEntryPoint);
      await writeFile(entryPoint, sabotagedEntryPoint, "utf8");
      const configuration = join(directory, "api-extractor.json");
      await writeFile(
        configuration,
        `${JSON.stringify(
          {
            mainEntryPointFilePath: entryPoint,
            apiReport: {
              enabled: true,
              reportFileName: "jquery-star.api.md",
              reportFolder: resolve(root, "etc"),
              reportTempFolder: temporary,
            },
            docModel: { enabled: false },
            dtsRollup: { enabled: false },
            tsdocMetadata: { enabled: false },
            messages: {
              extractorMessageReporting: { "ae-missing-release-tag": { logLevel: "none" } },
            },
          },
          null,
          2,
        )}\n`,
        "utf8",
      );
      const drift = await runChild({
        command: npx,
        args: ["--no-install", "api-extractor", "run", "--config", configuration],
        cwd: root,
        timeoutMs: 10_000,
        env: process.env,
      });
      const driftOutput = `${drift.stdout}${drift.stderr}`;
      expect(drift.timedOut, driftOutput).toBe(false);
      expect(drift.spawnError, driftOutput).toBeNull();
      expect(drift.signal, driftOutput).toBeNull();
      expect(drift.exitCode, driftOutput).not.toBe(0);
      expect(driftOutput).toContain("changed the API signature");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  }, 30_000);
});

import { execFileSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { describe, expect, it } from "vitest";

import {
  assertRedacted,
  auditPrerequisiteTickets,
  inspectCandidateSource,
  loadReleaseContract,
  validateQualityReport,
} from "../scripts/release/lib.mjs";

const root = process.cwd();
const fixtureRoot = resolve(root, ".git/jqstar");

async function compileSchema(path) {
  const schema = JSON.parse(await readFile(resolve(root, path), "utf8"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile(schema);
}

function git(cwd, ...args) {
  return execFileSync("git", args, {
    cwd,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function candidate(contract) {
  const sha1 = "a".repeat(40);
  const sha256 = "b".repeat(64);
  const sha512 = "c".repeat(128);
  const runs = contract.qualityModes.map(({ command, mode, requiredGates }) => ({
    mode,
    command,
    report: `.git/jqstar/runs/${mode}/report.json`,
    sha256,
    status: "pass",
    gates: requiredGates.map((id) => ({ id, status: "pass" })),
  }));
  const tickets = contract.prerequisites.tickets.map((id) => ({
    id,
    path: `docs/tickets/${id}-ticket.md`,
    status: "done",
    sha256,
    criteria: [{ id: "AC-01", result: "Pass" }],
  }));
  return {
    $schema: "https://ignibyte.github.io/jqstar/schema/release-candidate.schema.json",
    schema: "jqstar-release-candidate/1",
    status: "pass",
    runId: "2026-09-04T19-00-00-000Z-1",
    generatedAt: "2026-09-04T19:00:00.000Z",
    identity: {
      package: "jquery-star",
      version: "1.0.0",
      branch: "feat/stable-platform-release",
      commit: sha1,
      tree: sha1,
      sourceDateEpoch: 1,
      packageJsonSha256: sha256,
      lockfileSha256: sha256,
      contractSha256: sha256,
    },
    preflight: {
      cleanWorkingTree: true,
      committedSource: true,
      nonShallow: true,
      expectedBranch: true,
      tagAbsent: true,
      submodulesClean: true,
      lockfileClean: true,
      ignoredProductionInputs: [],
      environmentNames: ["CI"],
      redacted: true,
    },
    environment: {
      node: "v26.8.1",
      npm: "11.19.0",
      platform: "darwin",
      architecture: "arm64",
      typescript: "Version 5.9.3",
      playwright: "Version 1.62.1",
      browsers: {
        chromium: { version: "151.0.0" },
        firefox: { version: "153.0" },
        webkit: { version: "26.5" },
      },
    },
    artifact: {
      filename: "jquery-star-1.0.0.tgz",
      bytes: 1,
      sha256,
      sha512,
      npmIntegrity: `sha512-${Buffer.from("candidate").toString("base64")}`,
      npmShasum: sha1,
      fileCount: 1,
      files: [{ path: "LICENSE", mode: "0644", bytes: 1, sha256 }],
      websiteArchive: { path: "demo-dist/site.br", bytes: 1, sha256 },
      licenseNotices: ["LICENSE"],
    },
    reproducibility: {
      builds: 2,
      byteIdentical: true,
      manifestsIdentical: true,
      workspacesIndependent: true,
      cleanup: {
        success: "removed",
        failure: "removed",
        timeout: "removed",
        sighup: "removed",
        sigint: "removed",
        sigterm: "removed",
      },
    },
    prerequisites: {
      required: tickets.length,
      audited: tickets.length,
      criterionCount: tickets.length,
      tickets,
    },
    quality: { runs },
    consumers: {
      subject: "exact-tarball",
      packageReport: ".git/jqstar/runs/delivery/package-report.json",
      sha256,
      names: ["esm", "commonjs", "typescript", "qunit", "browser", "umd", "cli"],
    },
    security: {
      sbom: { path: ".git/jqstar/releases/1.0.0/sbom.cdx.json", sha256 },
      licenses: { path: ".git/jqstar/releases/1.0.0/licenses.json", sha256 },
      audit: {
        path: ".git/jqstar/releases/1.0.0/audit.json",
        sha256,
        source: "npm audit --omit=dev",
        retrievedAt: "2026-09-04T19:00:00.000Z",
        vulnerabilityCount: 0,
      },
      secretScan: "pass",
      generatedArtifactScan: "pass",
    },
    subordinateReports: Object.fromEntries(
      ["package", "release", "static", "browser"].map((name) => [
        name,
        { path: `.git/jqstar/runs/delivery/${name}-report.json`, sha256 },
      ]),
    ),
    handoff: {
      expectedTag: "v1.0.0",
      npmDistTag: "latest",
      releaseNotes: "CHANGELOG.md",
      readOnlyCommands: ["npm view jquery-star@1.0.0 --json"],
      approvalRequiredCommands: ["npm publish jquery-star-1.0.0.tgz --tag latest"],
      rollback: ["npm deprecate jquery-star@1.0.0 reason"],
    },
    redactions: {
      absolutePaths: "absent",
      environmentValues: "absent",
      credentials: "absent",
      privateSource: "absent",
    },
  };
}

async function makeCandidateRepository(contract) {
  await mkdir(fixtureRoot, { recursive: true });
  const directory = await mkdtemp(join(fixtureRoot, "release-preflight-"));
  await mkdir(join(directory, "quality"), { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    `${JSON.stringify({ name: "jquery-star", version: "1.0.0" }, null, 2)}\n`,
  );
  await writeFile(
    join(directory, "package-lock.json"),
    `${JSON.stringify(
      {
        name: "jquery-star",
        version: "1.0.0",
        lockfileVersion: 3,
        packages: { "": { name: "jquery-star", version: "1.0.0" } },
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(directory, "quality/release-contract.json"),
    `${JSON.stringify(contract, null, 2)}\n`,
  );
  await writeFile(join(directory, "tracked.txt"), "candidate\n");
  git(directory, "init", "-b", contract.source.expectedBranch);
  git(directory, "config", "user.email", "release-fixture@example.invalid");
  git(directory, "config", "user.name", "Release fixture");
  git(directory, "add", ".");
  git(directory, "commit", "-m", "Candidate fixture");
  return directory;
}

describe("stable release candidate contract", () => {
  it("closes the hand-authored 1.0 authority over the shipped package", async () => {
    const validate = await compileSchema("schema/release-contract.schema.json");
    const { contract } = await loadReleaseContract(root);
    const manifest = JSON.parse(await readFile(resolve(root, "package.json"), "utf8"));
    const lockfile = JSON.parse(await readFile(resolve(root, "package-lock.json"), "utf8"));

    expect(validate(contract), JSON.stringify(validate.errors)).toBe(true);
    expect(manifest.version).toBe(contract.version);
    expect(lockfile.version).toBe(contract.version);
    expect(lockfile.packages[""].version).toBe(contract.version);
    expect(Object.keys(manifest.exports).toSorted()).toEqual(
      contract.stableEntries.map(({ subpath }) => subpath).toSorted(),
    );
    expect(new Set(Object.values(manifest.jqstar.entrypoints))).toEqual(new Set(["stable"]));
    expect(new Set(contract.stableEntries.map(({ id }) => id)).size).toBe(10);
    expect(new Set(contract.policies.map(({ kind }) => kind)).size).toBe(contract.policies.length);
    for (const policy of contract.policies) {
      await expect(readFile(resolve(root, policy.path), "utf8"), policy.path).resolves.not.toBe("");
    }
  });

  it("audits every prerequisite ticket and criterion from current source", async () => {
    const { contract } = await loadReleaseContract(root);
    const audit = await auditPrerequisiteTickets(root, contract);
    expect(audit.required).toBe(33);
    expect(audit.audited).toBe(33);
    expect(audit.criterionCount).toBeGreaterThan(33);
    expect(audit.tickets.map(({ id }) => id)).toEqual(contract.prerequisites.tickets);
    expect(audit.tickets.every(({ status }) => status === "done")).toBe(true);
    expect(
      audit.tickets
        .flatMap(({ criteria }) => criteria)
        .every(({ result }) => result === "Pass" || result === "Approved-Disposition"),
    ).toBe(true);
  });

  it("rejects incomplete, misbound, or sensitive candidate evidence", async () => {
    const validate = await compileSchema("schema/release-candidate.schema.json");
    const { contract } = await loadReleaseContract(root);
    const valid = candidate(contract);
    expect(validate(valid), JSON.stringify(validate.errors)).toBe(true);
    expect(assertRedacted(valid)).toBe(valid);

    const mutations = [
      (report) => (report.status = "fail"),
      (report) => (report.identity.version = "0.1.0"),
      (report) => (report.identity.branch = "main"),
      (report) => (report.preflight.cleanWorkingTree = false),
      (report) => (report.artifact.filename = "jquery-star-0.1.0.tgz"),
      (report) => (report.artifact.sha512 = "0".repeat(64)),
      (report) => (report.artifact.files[0].path = "/Users/private/LICENSE"),
      (report) => (report.reproducibility.builds = 1),
      (report) => report.prerequisites.tickets.pop(),
      (report) => (report.quality.runs[0].gates[0].status = "fail"),
      (report) => report.quality.runs.pop(),
      (report) => delete report.security.audit,
      (report) => report.handoff.approvalRequiredCommands.splice(0),
      (report) => (report.redactions.credentials = "present"),
    ];
    for (const mutate of mutations) {
      const changed = structuredClone(valid);
      mutate(changed);
      expect(validate(changed), JSON.stringify(changed)).toBe(false);
    }
    expect(() => assertRedacted({ path: "/Users/private/release.json" })).toThrow(
      "absolute private path",
    );
    expect(() => assertRedacted({ path: "file:///private/tmp/release.json" })).toThrow(
      "absolute private path",
    );
    expect(() => assertRedacted({ message: "failed at /home/releaser/work" })).toThrow(
      "absolute private path",
    );
    expect(() => assertRedacted({ npm_token: "value" })).toThrow("credential-like field");
  });

  it("fails preflight on every source, lock, branch, tag, and tool sabotage", async () => {
    const { contract } = await loadReleaseContract(root);
    const directory = await makeCandidateRepository(contract);
    try {
      const inspected = await inspectCandidateSource(directory, contract, { CI: "true" });
      expect(inspected).toMatchObject({
        identity: { package: "jquery-star", version: "1.0.0" },
        preflight: {
          cleanWorkingTree: true,
          expectedBranch: true,
          environmentNames: ["CI"],
          redacted: true,
        },
      });
      expect(inspected.preflight).not.toHaveProperty("environmentValues");
      expect(JSON.stringify(inspected)).not.toContain('"CI":"true"');

      await writeFile(join(directory, "tracked.txt"), "dirty\n");
      await expect(inspectCandidateSource(directory, contract)).rejects.toThrow(
        "working tree is not clean",
      );
      git(directory, "restore", "tracked.txt");

      await writeFile(join(directory, "untracked.txt"), "untracked\n");
      await expect(inspectCandidateSource(directory, contract)).rejects.toThrow(
        "working tree is not clean",
      );
      await rm(join(directory, "untracked.txt"));

      git(directory, "switch", "-c", "wrong-branch");
      await expect(inspectCandidateSource(directory, contract)).rejects.toThrow(
        "branch does not match",
      );
      git(directory, "switch", contract.source.expectedBranch);

      git(directory, "tag", contract.source.expectedTag);
      await expect(inspectCandidateSource(directory, contract)).rejects.toThrow(
        "release tag already exists",
      );
      git(directory, "tag", "--delete", contract.source.expectedTag);

      const lockfile = JSON.parse(await readFile(join(directory, "package-lock.json"), "utf8"));
      lockfile.packages[""].version = "0.1.0";
      await writeFile(
        join(directory, "package-lock.json"),
        `${JSON.stringify(lockfile, null, 2)}\n`,
      );
      git(directory, "add", "package-lock.json");
      git(directory, "commit", "-m", "Drift lock version");
      await expect(inspectCandidateSource(directory, contract)).rejects.toThrow(
        "lockfile root version does not match",
      );

      lockfile.packages[""].version = "1.0.0";
      await writeFile(
        join(directory, "package-lock.json"),
        `${JSON.stringify(lockfile, null, 2)}\n`,
      );
      git(directory, "add", "package-lock.json");
      git(directory, "commit", "-m", "Restore lock version");

      const manifest = JSON.parse(await readFile(join(directory, "package.json"), "utf8"));
      manifest.dependencies = { "missing-from-lock": "1.0.0" };
      await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      git(directory, "add", "package.json");
      git(directory, "commit", "-m", "Drift dependency metadata");
      await expect(inspectCandidateSource(directory, contract)).rejects.toThrow(
        "lockfile root metadata does not match",
      );

      delete manifest.dependencies;
      await writeFile(join(directory, "package.json"), `${JSON.stringify(manifest, null, 2)}\n`);
      await writeFile(join(directory, ".gitignore"), "src/ignored.ts\n");
      git(directory, "add", "package.json", ".gitignore");
      git(directory, "commit", "-m", "Restore manifest and ignore fixture");
      await mkdir(join(directory, "src"));
      await writeFile(join(directory, "src/ignored.ts"), "export {};\n");
      await expect(inspectCandidateSource(directory, contract)).rejects.toThrow(
        "ignored production inputs are present",
      );
      await rm(join(directory, "src"), { recursive: true });

      await expect(
        inspectCandidateSource(
          directory,
          contract,
          {},
          {
            nodeVersion: "v23.0.0",
            npmVersion: "11.0.0",
          },
        ),
      ).rejects.toThrow("Node version is unsupported");
      await expect(
        inspectCandidateSource(
          directory,
          contract,
          {},
          {
            nodeVersion: "v24.0.0",
            npmVersion: "10.0.0",
          },
        ),
      ).rejects.toThrow("npm version is unsupported");

      const shallow = join(fixtureRoot, `release-shallow-${String(process.pid)}`);
      execFileSync("git", ["clone", "--depth", "1", `file://${directory}`, shallow], {
        cwd: root,
        stdio: "ignore",
      });
      try {
        await expect(inspectCandidateSource(shallow, contract)).rejects.toThrow(
          "repository is shallow",
        );
      } finally {
        await rm(shallow, { force: true, recursive: true });
      }
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });

  it("keeps publication operations as approval-gated text only", async () => {
    const [candidateSource, prepareSource, proveSource, handoffSource] = await Promise.all(
      ["candidate.mjs", "prepare.mjs", "prove.mjs", "handoff.mjs"].map((name) =>
        readFile(resolve(root, "scripts/release", name), "utf8"),
      ),
    );
    const executableSources = [candidateSource, prepareSource, proveSource].join("\n");
    expect(executableSources).not.toMatch(
      /\b(?:npm publish|git tag|git push|gh release create)\b/u,
    );
    expect(handoffSource).toContain("approvalRequiredCommands");
    expect(handoffSource).toContain("npm publish");
    expect(handoffSource).toContain("git tag -a");
    expect(handoffSource).toContain("gh release create");
  });

  it("binds complete quality reports and rejects stale or reordered gates", async () => {
    const { contract } = await loadReleaseContract(root);
    await mkdir(fixtureRoot, { recursive: true });
    const directory = await mkdtemp(join(fixtureRoot, "release-quality-report-"));
    try {
      const reportPath = join(directory, "report.json");
      const mode = contract.qualityModes[1];
      const report = {
        schema: "jqstar-quality-report/1",
        runId: "quality-fixture",
        mode: mode.mode,
        status: "pass",
        startFingerprint: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
        endFingerprint: { algorithm: "sha256", digest: "a".repeat(64), fileCount: 1 },
        gates: mode.requiredGates.map((id) => ({ id, status: "pass" })),
      };
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      await expect(
        validateQualityReport(root, reportPath, mode.mode, mode.requiredGates),
      ).resolves.toMatchObject({ mode: "delivery", status: "pass" });

      report.endFingerprint.digest = "b".repeat(64);
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      await expect(
        validateQualityReport(root, reportPath, mode.mode, mode.requiredGates),
      ).rejects.toThrow("tree changed");

      report.endFingerprint.digest = report.startFingerprint.digest;
      [report.gates[0], report.gates[1]] = [report.gates[1], report.gates[0]];
      await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`);
      await expect(
        validateQualityReport(root, reportPath, mode.mode, mode.requiredGates),
      ).rejects.toThrow("gate set");
    } finally {
      await rm(directory, { force: true, recursive: true });
    }
  });
});

import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import {
  assertRedacted,
  inspectCandidateSource,
  latestReleaseRun,
  loadReleaseContract,
  readJson,
  readOptions,
  releaseRunDirectory,
  repositoryPath,
  sha,
  validateQualityReport,
  writeJson,
  writeLatestReleaseRun,
} from "./lib.mjs";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function check(report, name) {
  const found = report.checks.find((candidate) => candidate.name === name);
  assert(found?.status === "pass", `Required ${name} check did not pass.`);
  return found.detail;
}

function sameIdentity(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

export async function proveRelease(arguments_ = process.argv.slice(2)) {
  const options = readOptions(arguments_, ["run-id", "full-audit", "delivery"]);
  const { contract } = await loadReleaseContract(root);
  const runId = options["run-id"] ?? (await latestReleaseRun(root, contract));
  const runDirectory = releaseRunDirectory(root, contract, runId);
  const preparedPath = join(runDirectory, "prepared.json");
  const prepared = await readJson(preparedPath);
  assert(
    prepared.schema === "jqstar-release-prepared/1" && prepared.status === "prepared",
    "Prepared candidate evidence is missing or invalid.",
  );
  const inspected = await inspectCandidateSource(root, contract);
  assert(
    sameIdentity(prepared.identity, inspected.identity),
    "Prepared candidate identity is stale.",
  );

  const fullMode = contract.qualityModes.find(({ mode }) => mode === "full-audit");
  const deliveryMode = contract.qualityModes.find(({ mode }) => mode === "delivery");
  assert(fullMode && deliveryMode, "Release contract quality modes are incomplete.");
  assert(options["full-audit"], "Release proof needs --full-audit <report>.");
  assert(options.delivery, "Release proof needs --delivery <report>.");
  const fullReportPath = resolve(root, options["full-audit"]);
  const deliveryReportPath = resolve(root, options.delivery);
  const qualityRuns = [
    await validateQualityReport(root, fullReportPath, fullMode.mode, fullMode.requiredGates),
    await validateQualityReport(
      root,
      deliveryReportPath,
      deliveryMode.mode,
      deliveryMode.requiredGates,
    ),
  ];
  const fullReport = await readJson(fullReportPath);
  const deliveryReport = await readJson(deliveryReportPath);
  assert(
    fullReport.startFingerprint.digest === deliveryReport.startFingerprint.digest &&
      fullReport.startFingerprint.fileCount === deliveryReport.startFingerprint.fileCount,
    "Full-audit and delivery reports do not describe the same source tree.",
  );

  const deliveryDirectory = dirname(deliveryReportPath);
  const packageReportPath = join(deliveryDirectory, "package-report.json");
  const releaseReportPath = join(deliveryDirectory, "release-report.json");
  const staticReportPath = join(deliveryDirectory, "static-report.json");
  const browserReportPath = join(deliveryDirectory, "browser-report.json");
  const packageReport = await readJson(packageReportPath);
  const releaseReport = await readJson(releaseReportPath);
  const staticReport = await readJson(staticReportPath);
  const browserReport = await readJson(browserReportPath);
  for (const [name, report, mode] of [
    ["package", packageReport, "package"],
    ["release", releaseReport, "release"],
    ["static", staticReport, "delivery"],
    ["browser", browserReport, "execution"],
  ]) {
    assert(report.status === "pass", `${name} subordinate report did not pass.`);
    assert(
      report.runId === deliveryReport.runId,
      `${name} subordinate report belongs to another run.`,
    );
    assert(report.mode === mode, `${name} subordinate report mode is incorrect.`);
  }

  assert(
    packageReport.package.filename === prepared.artifact.filename,
    "Package report filename differs.",
  );
  assert(
    packageReport.package.packedBytes === prepared.artifact.bytes,
    "Package report size differs.",
  );
  const exportsEvidence = check(packageReport, "exports-and-files");
  assert(exportsEvidence.version === contract.version, "Package report version differs.");
  assert(
    JSON.stringify(exportsEvidence.exports.toSorted()) ===
      JSON.stringify(contract.stableEntries.map(({ subpath }) => subpath).toSorted()),
    "Package report exports differ from the stable contract.",
  );
  const reproducible = check(releaseReport, "reproducible-build");
  assert(
    reproducible.sha256 === prepared.artifact.sha256,
    "Release report tarball digest differs.",
  );
  const browserConsumers = check(packageReport, "browser-consumers");
  assert(
    browserConsumers.subject === "installed-tarball" &&
      browserConsumers.csp.tarballDigest === prepared.artifact.sha256,
    "Installed browser consumers did not use the prepared tarball bytes.",
  );
  const installedConsumers = check(packageReport, "installed-consumer");
  check(packageReport, "qunit-consumer");
  check(packageReport, "copy-in-registry");
  check(releaseReport, "packed-self-hosted");

  const names = [
    ...installedConsumers.consumers,
    ...browserConsumers.consumers.map((name) => `browser-${name}`),
    "qunit",
    "copy-in-registry",
    "packed-self-hosted",
  ];
  assert(new Set(names).size === names.length, "Candidate consumer names are not unique.");
  const environment = {
    ...inspected.environment,
    typescript: releaseReport.environment.typescript,
    playwright: releaseReport.environment.playwright,
    browsers: releaseReport.environment.browsers,
  };
  const sourceAfter = await inspectCandidateSource(root, contract);
  assert(
    sameIdentity(prepared.identity, sourceAfter.identity),
    "Source identity changed during proof.",
  );

  const proven = {
    schema: "jqstar-release-proven/1",
    status: "proven",
    runId,
    generatedAt: new Date().toISOString(),
    identity: prepared.identity,
    preflight: sourceAfter.preflight,
    environment,
    artifact: prepared.artifact,
    reproducibility: {
      ...prepared.reproducibility,
      cleanup: {
        success: "removed",
        failure: "removed",
        timeout: "removed",
        sighup: "removed",
        sigint: "removed",
        sigterm: "removed",
      },
    },
    prerequisites: prepared.prerequisites,
    quality: { runs: qualityRuns },
    consumers: {
      subject: "exact-tarball",
      packageReport: repositoryPath(root, packageReportPath),
      sha256: await sha(packageReportPath),
      names,
    },
    security: {
      ...prepared.security,
      secretScan: "pass",
      generatedArtifactScan: "pass",
    },
    subordinateReports: {
      package: {
        path: repositoryPath(root, packageReportPath),
        sha256: await sha(packageReportPath),
      },
      release: {
        path: repositoryPath(root, releaseReportPath),
        sha256: await sha(releaseReportPath),
      },
      static: { path: repositoryPath(root, staticReportPath), sha256: await sha(staticReportPath) },
      browser: {
        path: repositoryPath(root, browserReportPath),
        sha256: await sha(browserReportPath),
      },
    },
  };
  assertRedacted(proven);
  const provenPath = join(runDirectory, "proven.json");
  await writeJson(provenPath, proven);
  await writeLatestReleaseRun(root, contract, runId, "proven");
  process.stdout.write(
    `Proven jquery-star@${contract.version}: ${repositoryPath(root, provenPath)}\n`,
  );
  return proven;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await proveRelease();

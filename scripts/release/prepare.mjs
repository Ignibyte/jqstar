import { spawnSync } from "node:child_process";
import { copyFile, mkdir, stat } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { withOwnedTemporaryDirectory } from "../quality/lib/owned-temporary-directory.mjs";
import {
  assertRedacted,
  auditPrerequisiteTickets,
  fileManifest,
  git,
  inspectCandidateSource,
  loadReleaseContract,
  makeRunId,
  readOptions,
  releaseRunDirectory,
  repositoryPath,
  run,
  sha,
  writeJson,
  writeLatestReleaseRun,
} from "./lib.mjs";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const npx = process.platform === "win32" ? "npx.cmd" : "npx";

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function pack(workspace, destination, environment) {
  const output = run(
    npm,
    ["pack", "--ignore-scripts", "--json", "--pack-destination", destination],
    { cwd: workspace, env: environment, label: "npm pack" },
  );
  const metadata = JSON.parse(output)[0];
  assert(metadata?.filename, "npm pack returned no artifact filename.");
  return { metadata, tarball: join(destination, metadata.filename) };
}

async function extract(tarball, destination) {
  await mkdir(destination, { recursive: true });
  run("tar", ["-xzf", tarball, "-C", destination], {
    cwd: root,
    label: "candidate tarball extraction",
  });
  return join(destination, "package");
}

function productionAudit(workspace, environment) {
  const result = spawnSync(npm, ["audit", "--omit=dev", "--json"], {
    cwd: workspace,
    encoding: "utf8",
    env: environment,
    maxBuffer: 64 * 1024 * 1024,
  });
  if (result.error) throw new Error("npm production audit could not start.");
  let report;
  try {
    report = JSON.parse(result.stdout);
  } catch {
    throw new Error("npm production audit did not return JSON.");
  }
  const vulnerabilities = report.metadata?.vulnerabilities;
  assert(
    vulnerabilities && typeof vulnerabilities === "object",
    "npm audit has no vulnerability summary.",
  );
  const total = Object.values(vulnerabilities).reduce(
    (sum, value) => sum + (typeof value === "number" ? value : 0),
    0,
  );
  assert(
    result.status === 0 && total === 0,
    `npm production audit found ${String(total)} vulnerabilities.`,
  );
  return { report, total };
}

function sanitizeLicenses(inventory) {
  return Object.fromEntries(
    Object.entries(inventory)
      .toSorted(([left], [right]) => left.localeCompare(right))
      .map(([name, detail]) => [
        name,
        {
          licenses: detail.licenses ?? "UNKNOWN",
          repository: detail.repository ?? null,
        },
      ]),
  );
}

async function buildCandidate(workspace, packDirectory, extractDirectory, identity) {
  const environment = {
    ...process.env,
    LC_ALL: "C",
    SOURCE_DATE_EPOCH: String(identity.sourceDateEpoch),
    TZ: "UTC",
  };
  run(npm, ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], {
    cwd: workspace,
    env: environment,
    label: "locked candidate install",
  });
  run(npm, ["run", "build:self-hosted"], {
    cwd: workspace,
    env: environment,
    label: "candidate self-hosted build",
  });
  await mkdir(packDirectory, { recursive: true });
  const packed = pack(workspace, packDirectory, environment);
  const extracted = await extract(packed.tarball, extractDirectory);
  return {
    environment,
    extracted,
    manifest: await fileManifest(extracted),
    metadata: packed.metadata,
    tarball: packed.tarball,
  };
}

export async function prepareRelease(arguments_ = process.argv.slice(2)) {
  const options = readOptions(arguments_, ["run-id"]);
  const { contract } = await loadReleaseContract(root);
  const runId = options["run-id"] ?? makeRunId();
  const runDirectory = releaseRunDirectory(root, contract, runId);
  const outputRoot = resolve(root, contract.candidate.outputRoot);
  await mkdir(outputRoot, { recursive: true });
  await mkdir(runDirectory);

  try {
    const inspected = await inspectCandidateSource(root, contract);
    const prerequisites = await auditPrerequisiteTickets(root, contract);
    let prepared;

    await withOwnedTemporaryDirectory(
      { prefix: "jqstar-release-candidate-" },
      async (temporary) => {
        const workspaces = [
          join(temporary, "source-one", "jquery-star"),
          join(temporary, "source-two", "jquery-star"),
        ];
        for (const workspace of workspaces) {
          await mkdir(resolve(workspace, ".."), { recursive: true });
          run(
            "git",
            [
              "clone",
              "--no-local",
              "--no-hardlinks",
              "--no-tags",
              "--no-checkout",
              root,
              workspace,
            ],
            { cwd: root, label: "fresh candidate clone" },
          );
          git(workspace, ["checkout", "--detach", inspected.identity.commit], {
            label: "candidate commit checkout",
          });
        }

        const first = await buildCandidate(
          workspaces[0],
          join(temporary, "pack-one"),
          join(temporary, "extract-one"),
          inspected.identity,
        );
        const second = await buildCandidate(
          workspaces[1],
          join(temporary, "pack-two"),
          join(temporary, "extract-two"),
          inspected.identity,
        );
        assert(
          first.metadata.filename === "jquery-star-1.0.0.tgz",
          "Candidate filename is incorrect.",
        );
        assert(first.metadata.filename === second.metadata.filename, "Candidate filenames differ.");

        const firstSha256 = await sha(first.tarball);
        const secondSha256 = await sha(second.tarball);
        const firstSha512 = await sha(first.tarball, "sha512");
        const secondSha512 = await sha(second.tarball, "sha512");
        const firstIntegrity = `sha512-${await sha(first.tarball, "sha512", "base64")}`;
        const firstShasum = await sha(first.tarball, "sha1");
        assert(firstSha256 === secondSha256, "Candidate tarball SHA-256 values differ.");
        assert(firstSha512 === secondSha512, "Candidate tarball SHA-512 values differ.");
        assert(
          firstIntegrity === first.metadata.integrity,
          "Computed npm integrity does not match npm pack.",
        );
        assert(
          firstIntegrity === second.metadata.integrity,
          "Candidate npm integrity values differ.",
        );
        assert(
          firstShasum === first.metadata.shasum,
          "Computed npm shasum does not match npm pack.",
        );
        assert(firstShasum === second.metadata.shasum, "Candidate npm shasum values differ.");
        assert(
          JSON.stringify(first.manifest) === JSON.stringify(second.manifest),
          "Candidate path, mode, size, or digest manifests differ.",
        );

        const artifactPath = join(runDirectory, first.metadata.filename);
        await copyFile(first.tarball, artifactPath);
        const artifactBytes = (await stat(artifactPath)).size;
        const websiteArchive = first.manifest.find(({ path }) => path === "demo-dist/site.br");
        assert(websiteArchive, "Candidate is missing demo-dist/site.br.");
        const licenseNotices = first.manifest
          .map(({ path }) => path)
          .filter((path) => /^(?:LICENSE|NOTICE(?:\.md)?)$/u.test(path));
        assert(licenseNotices.length > 0, "Candidate is missing its license notice.");

        const sbom = JSON.parse(
          run(npm, ["sbom", "--omit=dev", "--sbom-format", "cyclonedx"], {
            cwd: workspaces[1],
            env: second.environment,
            label: "candidate SBOM",
          }),
        );
        assert(
          sbom.bomFormat === "CycloneDX" &&
            sbom.metadata?.component?.name === contract.package.name &&
            sbom.metadata?.component?.version === contract.version &&
            sbom.metadata?.component?.purl ===
              `pkg:npm/${contract.package.name}@${contract.version}`,
          "Candidate SBOM identity is invalid.",
        );
        const licenseInventory = sanitizeLicenses(
          JSON.parse(
            run(npx, ["--no-install", "license-checker-rseidelsohn", "--production", "--json"], {
              cwd: workspaces[1],
              env: second.environment,
              label: "candidate license inventory",
            }),
          ),
        );
        const audit = productionAudit(workspaces[1], second.environment);
        const auditRetrievedAt = new Date().toISOString();
        const sbomPath = join(runDirectory, "sbom.cdx.json");
        const licensesPath = join(runDirectory, "licenses.json");
        const auditPath = join(runDirectory, "audit.json");
        assertRedacted(sbom);
        assertRedacted(licenseInventory);
        assertRedacted(audit.report);
        await writeJson(sbomPath, sbom);
        await writeJson(licensesPath, licenseInventory);
        await writeJson(auditPath, audit.report);

        prepared = {
          schema: "jqstar-release-prepared/1",
          status: "prepared",
          runId,
          generatedAt: new Date().toISOString(),
          identity: inspected.identity,
          preflight: inspected.preflight,
          environment: inspected.environment,
          artifact: {
            filename: first.metadata.filename,
            bytes: artifactBytes,
            sha256: firstSha256,
            sha512: firstSha512,
            npmIntegrity: firstIntegrity,
            npmShasum: firstShasum,
            fileCount: first.manifest.length,
            files: first.manifest,
            websiteArchive: {
              path: websiteArchive.path,
              bytes: websiteArchive.bytes,
              sha256: websiteArchive.sha256,
            },
            licenseNotices,
          },
          reproducibility: {
            builds: 2,
            byteIdentical: true,
            manifestsIdentical: true,
            workspacesIndependent: true,
            cleanup: { success: "pending-callback-return" },
          },
          prerequisites,
          security: {
            sbom: { path: repositoryPath(root, sbomPath), sha256: await sha(sbomPath) },
            licenses: { path: repositoryPath(root, licensesPath), sha256: await sha(licensesPath) },
            audit: {
              path: repositoryPath(root, auditPath),
              sha256: await sha(auditPath),
              source: "npm audit --omit=dev",
              retrievedAt: auditRetrievedAt,
              vulnerabilityCount: audit.total,
            },
          },
        };
        assertRedacted(prepared);
      },
    );

    prepared.reproducibility.cleanup.success = "removed";
    const preparedPath = join(runDirectory, "prepared.json");
    await writeJson(preparedPath, prepared);
    await writeLatestReleaseRun(root, contract, runId, "prepared");
    process.stdout.write(
      `Prepared jquery-star@${contract.version}: ${repositoryPath(root, preparedPath)}\n`,
    );
    return prepared;
  } catch (error) {
    await writeJson(join(runDirectory, "failure.json"), {
      schema: "jqstar-release-failure/1",
      runId,
      stage: "prepare",
      status: "fail",
      message: error instanceof Error ? error.message.replaceAll(root, ".") : String(error),
    });
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await prepareRelease();
}

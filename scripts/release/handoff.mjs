import { access, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

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
  writeJson,
  writeLatestReleaseRun,
} from "./lib.mjs";

const root = process.cwd();

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function assertAbsent(path) {
  try {
    await access(path);
  } catch (error) {
    if (error?.code === "ENOENT") return;
    throw error;
  }
  throw new Error("Immutable candidate receipt already exists for this run.");
}

export async function handoffRelease(arguments_ = process.argv.slice(2)) {
  const options = readOptions(arguments_, ["run-id"]);
  const { contract } = await loadReleaseContract(root);
  const runId = options["run-id"] ?? (await latestReleaseRun(root, contract));
  const runDirectory = releaseRunDirectory(root, contract, runId);
  const proven = await readJson(join(runDirectory, "proven.json"));
  assert(
    proven.schema === "jqstar-release-proven/1" && proven.status === "proven",
    "Proven candidate evidence is missing or invalid.",
  );
  const inspected = await inspectCandidateSource(root, contract);
  assert(
    JSON.stringify(inspected.identity) === JSON.stringify(proven.identity),
    "Proven candidate identity is stale.",
  );

  const artifactPath = repositoryPath(root, join(runDirectory, proven.artifact.filename));
  const expectedTag = contract.source.expectedTag;
  const commit = proven.identity.commit;
  const handoff = {
    expectedTag,
    npmDistTag: contract.publication.npmDistTag,
    releaseNotes: "CHANGELOG.md",
    readOnlyCommands: [
      `git show --no-patch --format=fuller ${commit}`,
      `git rev-parse ${commit}^{tree}`,
      `shasum -a 256 ${artifactPath}`,
      `shasum -a 512 ${artifactPath}`,
      `tar -xOf ${artifactPath} package/package.json`,
      `npm view jquery-star@${contract.version} --json`,
      `gh release view ${expectedTag} --json tagName,targetCommitish,isDraft,isPrerelease,url`,
    ],
    approvalRequiredCommands: [
      `git tag -a ${expectedTag} ${commit} -m "jQStar ${contract.version}"`,
      `git push origin ${expectedTag}`,
      `npm publish ./${artifactPath} --access public --tag ${contract.publication.npmDistTag} --provenance`,
      `gh release create ${expectedTag} ./${artifactPath} --verify-tag --title "jQStar ${contract.version}" --notes-file CHANGELOG.md`,
    ],
    rollback: [
      `npm deprecate jquery-star@${contract.version} "Withdrawn: install the fixed version named in the jQStar security advisory."`,
      `gh release edit ${expectedTag} --draft`,
      "npm view jquery-star dist-tags --json",
    ],
  };
  const candidate = {
    $schema: "https://ignibyte.github.io/jqstar/schema/release-candidate.schema.json",
    schema: "jqstar-release-candidate/1",
    status: "pass",
    runId,
    generatedAt: new Date().toISOString(),
    identity: proven.identity,
    preflight: proven.preflight,
    environment: proven.environment,
    artifact: proven.artifact,
    reproducibility: proven.reproducibility,
    prerequisites: proven.prerequisites,
    quality: proven.quality,
    consumers: proven.consumers,
    security: proven.security,
    subordinateReports: proven.subordinateReports,
    handoff,
    redactions: {
      absolutePaths: "absent",
      environmentValues: "absent",
      credentials: "absent",
      privateSource: "absent",
    },
  };
  assertRedacted(candidate);
  const schema = await readJson(resolve(root, "schema/release-candidate.schema.json"));
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  const validate = ajv.compile(schema);
  assert(
    validate(candidate),
    `Candidate schema validation failed: ${JSON.stringify(validate.errors)}`,
  );

  const candidatePath = join(runDirectory, "candidate.json");
  await assertAbsent(candidatePath);
  await writeJson(candidatePath, candidate);
  const receiptSha256 = await sha(candidatePath);
  await writeFile(join(runDirectory, "candidate.sha256"), `${receiptSha256}  candidate.json\n`, {
    encoding: "utf8",
    flag: "wx",
  });
  await writeLatestReleaseRun(root, contract, runId, "handoff");

  process.stdout.write(
    [
      `Candidate receipt: ${repositoryPath(root, candidatePath)}`,
      `Candidate receipt SHA-256: ${receiptSha256}`,
      "Read-only verification:",
      ...handoff.readOnlyCommands.map((command) => `  ${command}`),
      "Approval required before any command below:",
      ...handoff.approvalRequiredCommands.map((command) => `  ${command}`),
      "",
    ].join("\n"),
  );
  return candidate;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await handoffRelease();

import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";

import { handoffRelease } from "./handoff.mjs";
import {
  loadReleaseContract,
  makeRunId,
  readJson,
  releaseRunDirectory,
  run,
  writeJson,
} from "./lib.mjs";
import { prepareRelease } from "./prepare.mjs";
import { proveRelease } from "./prove.mjs";

const root = process.cwd();
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
const allGatesEnvironment = { ...process.env, JQS_QUALITY_FORCE_ALL: "1" };

async function latestQualityReport() {
  const latest = await readJson(resolve(root, ".git/jqstar/latest-report.json"));
  return resolve(root, ".git/jqstar/runs", latest.runId, "report.json");
}

export async function createReleaseCandidate() {
  const { contract } = await loadReleaseContract(root);
  const runId = makeRunId();
  const runDirectory = releaseRunDirectory(root, contract, runId);
  try {
    await prepareRelease(["--run-id", runId]);
    run(npm, ["run", "quality:full-audit"], {
      cwd: root,
      env: allGatesEnvironment,
      label: "full release audit",
      stdio: "inherit",
    });
    const fullAudit = await latestQualityReport();
    run(npm, ["run", "check"], {
      cwd: root,
      env: allGatesEnvironment,
      label: "release delivery check",
      stdio: "inherit",
    });
    const delivery = await latestQualityReport();
    await proveRelease(["--run-id", runId, "--full-audit", fullAudit, "--delivery", delivery]);
    return handoffRelease(["--run-id", runId]);
  } catch (error) {
    await writeJson(join(runDirectory, "candidate-failure.json"), {
      schema: "jqstar-release-failure/1",
      runId,
      stage: "candidate",
      status: "fail",
      message: error instanceof Error ? error.message.replaceAll(root, ".") : String(error),
    });
    throw error;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await createReleaseCandidate();
}

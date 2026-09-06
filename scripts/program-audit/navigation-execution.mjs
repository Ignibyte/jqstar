import assert from "node:assert/strict";
import { basename, dirname, isAbsolute } from "node:path";
import { boundedText, closedObject, sameKeys, timestamp } from "./contracts.mjs";
import { readAuditFile } from "./files.mjs";
import { loadNavigationInputs } from "./navigation-inputs.mjs";
import { assertNavigationProcess, navigationTimeoutMs } from "./navigation-runner.mjs";
import { validateNavigationReport } from "./navigation.mjs";
import { createReportLoader } from "./reports.mjs";

const outputParent = ".git/jqstar/program-audit/navigation-executions";

function validateExpectations(expected) {
  closedObject(
    expected,
    [
      "final",
      "source",
      "inputs",
      "artifact",
      "browserVersions",
      "nodePath",
      "notBefore",
      "notAfter",
    ],
    "Navigation expectations",
  );
  assert.equal(typeof expected.final, "boolean", "Explicit navigation acceptance scope required");
  closedObject(expected.source, ["commit", "fingerprint", "mutableWorkspace"], "Program source");
  assert.match(expected.source.commit, /^[a-f0-9]{40}$/u);
  assert.equal(typeof expected.source.mutableWorkspace, "boolean");
  const fingerprint = expected.source.fingerprint;
  closedObject(fingerprint, ["algorithm", "digest", "fileCount"], "Program fingerprint");
  assert.equal(fingerprint.algorithm, "sha256");
  assert.match(fingerprint.digest, /^[a-f0-9]{64}$/u);
  assert(Number.isSafeInteger(fingerprint.fileCount) && fingerprint.fileCount > 0);
  if (expected.final)
    assert.equal(expected.source.mutableWorkspace, false, "Final navigation source must be clean");
  assert.deepEqual(
    expected.inputs.source,
    expected.source,
    "Independent navigation source differs",
  );
  closedObject(expected.artifact, ["filename", "sha256", "bytes"], "Program artifact");
  assert.match(expected.artifact.filename, /^jquery-star-\d+\.\d+\.\d+\.tgz$/u);
  assert.match(expected.artifact.sha256, /^[a-f0-9]{64}$/u);
  assert(Number.isSafeInteger(expected.artifact.bytes) && expected.artifact.bytes > 0);
  sameKeys(Object.keys(expected.browserVersions), ["chromium", "firefox", "webkit"], "Browsers");
  for (const version of Object.values(expected.browserVersions))
    boundedText(version, "Browser version");
  boundedText(expected.nodePath, "Node executable");
  assert(isAbsolute(expected.nodePath), "Expected Node executable must be absolute");
  assert(timestamp(expected.notBefore) <= timestamp(expected.notAfter), "Invalid program interval");
}

// Expected inputs are frozen by the caller before execution, never copied from this index.
export function validateNavigationExecution(index, manifest, reference, expected) {
  validateExpectations(expected);
  const directory = dirname(reference.path);
  assert.equal(dirname(directory), outputParent, "Unexpected navigation execution directory");
  assert.equal(basename(reference.path), "execution.json", "Unexpected navigation index filename");
  closedObject(
    index,
    ["schema", "status", "scope", "source", "manifest", "execution", "report", "summary"],
    "Navigation execution index",
  );
  assert.equal(index.schema, "jqstar-program-navigation-execution/1");
  assert.equal(index.status, "pass");
  assert.equal(index.scope, "navigation-component");
  assert.deepEqual(index.source, expected.source, "Navigation index source differs");
  assert.equal(
    index.manifest.path,
    `${directory}/manifest.json`,
    "Unexpected navigation manifest path",
  );
  closedObject(
    manifest,
    ["schema", "runId", "frozenAt", "timeoutMs", "inputs", "browserVersions"],
    "Navigation manifest",
  );
  assert.equal(manifest.schema, "jqstar-program-navigation-manifest/1");
  assert.equal(manifest.runId, basename(directory), "Navigation manifest run differs");
  assert.equal(manifest.timeoutMs, navigationTimeoutMs);
  assert.deepEqual(manifest.inputs, expected.inputs, "Navigation manifest inputs differ");
  assert.deepEqual(
    manifest.browserVersions,
    expected.browserVersions,
    "Navigation browsers differ",
  );
  const artifact = manifest.inputs.ordinaryArtifact;
  assert.equal(artifact.sha256, expected.artifact.sha256, "Navigation ordinary artifact differs");
  assert.equal(
    artifact.bytes,
    expected.artifact.bytes,
    "Navigation ordinary artifact size differs",
  );
  assert.equal(
    basename(artifact.path),
    expected.artifact.filename,
    "Navigation artifact name differs",
  );
  assert.equal(
    manifest.inputs.navigationArtifact.sha256,
    expected.artifact.sha256,
    "Artifact alias differs",
  );
  assert.equal(
    manifest.inputs.navigationArtifact.bytes,
    expected.artifact.bytes,
    "Artifact alias size differs",
  );
  const execution = index.execution;
  closedObject(
    execution,
    [
      "command",
      "timeoutMs",
      "startedAt",
      "endedAt",
      "exitCode",
      "signal",
      "timedOut",
      "spawnError",
      "interruption",
      "stdout",
      "stderr",
    ],
    "Navigation process record",
  );
  assertNavigationProcess(execution);
  assert.equal(execution.interruption, null, "Navigation supervisor was interrupted");
  assert.equal(execution.timeoutMs, navigationTimeoutMs);
  assert.deepEqual(
    execution.command,
    {
      executable: expected.nodePath,
      args: [
        "scripts/program-audit/run-navigation.mjs",
        "--execute",
        index.manifest.path,
        index.manifest.sha256,
      ],
    },
    "Navigation command differs",
  );
  const start = timestamp(execution.startedAt);
  const end = timestamp(execution.endedAt);
  const frozen = timestamp(manifest.frozenAt);
  assert(
    frozen >= timestamp(expected.notBefore) &&
      start >= frozen &&
      end >= start &&
      end <= timestamp(expected.notAfter) &&
      end - start <= navigationTimeoutMs,
    "Navigation execution interval differs",
  );
  for (const name of ["stdout", "stderr"])
    assert.equal(
      execution[name].path,
      `${directory}/${name}.log`,
      "Unexpected navigation log path",
    );
  assert.equal(index.report.path, `${directory}/raw.json`, "Unexpected navigation report path");
  return { directory, start, end };
}

async function readReference(root, reference, json = true) {
  closedObject(reference, ["path", "sha256", "bytes"], "Navigation evidence reference");
  assert.match(reference.sha256, /^[a-f0-9]{64}$/u);
  assert(
    Number.isSafeInteger(reference.bytes) &&
      reference.bytes >= (json ? 1 : 0) &&
      reference.bytes <= 32 * 1024 * 1024,
    "Invalid navigation evidence size",
  );
  const file = await readAuditFile(root, reference.path, {
    digest: reference.sha256,
    maximumBytes: Math.max(reference.bytes, 1),
  });
  assert.equal(file.bytes, reference.bytes, "Navigation evidence byte count differs");
  return json ? JSON.parse(file.source) : file.source;
}

function freezeCopy(value) {
  const copy = structuredClone(value);
  const queue = [copy];
  while (queue.length) {
    const item = queue.pop();
    if (!item || typeof item !== "object") continue;
    Object.freeze(item);
    queue.push(...Object.values(item));
  }
  return copy;
}

export async function loadNavigationExecution(root, reference, expected) {
  validateExpectations(expected);
  const index = await readReference(root, reference);
  const manifest = await readReference(root, index.manifest);
  const { directory, start, end } = validateNavigationExecution(
    index,
    manifest,
    reference,
    expected,
  );
  const checkInputs = async () =>
    assert.deepEqual(
      await loadNavigationInputs(root, expected.inputs.ordinaryArtifact.path),
      expected.inputs,
      "Navigation source or prepared inputs changed",
    );
  await checkInputs();
  const processFile = await readAuditFile(root, `${directory}/process.json`);
  assert.deepEqual(
    JSON.parse(processFile.source),
    index.execution,
    "Navigation process record differs",
  );
  for (const name of ["stdout", "stderr"]) await readReference(root, index.execution[name], false);
  const load = await createReportLoader(root, expected.inputs.schemas);
  const raw = await load("navigation", index.report);
  const context = {
    ...expected.inputs.context,
    browserVersions: expected.browserVersions,
    runId: manifest.runId,
    start,
    end,
  };
  const summary = validateNavigationReport(raw.data, context);
  assert.deepEqual(index.summary, summary, "Navigation summary differs from raw observations");
  await checkInputs();
  return Object.freeze({
    status: "pass",
    scope: "navigation-component",
    finalEligible: expected.final,
    source: freezeCopy(expected.source),
    artifact: freezeCopy(expected.artifact),
    summary: Object.freeze(summary),
    manifest: Object.freeze(index.manifest),
    report: raw,
    context: freezeCopy(context),
    execution: Object.freeze({ start, end }),
  });
}

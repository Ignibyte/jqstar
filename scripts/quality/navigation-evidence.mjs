import { createHash } from "node:crypto";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { gzipSync, gunzipSync } from "node:zlib";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";

const maximumBytes = 64 * 1024 * 1024;
const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

function rawValidator(schema) {
  const ajv = new Ajv2020({ allErrors: true, strict: true });
  addFormats(ajv);
  return ajv.compile({
    $schema: schema.$schema,
    $defs: schema.$defs,
    $ref: "#/$defs/measurement",
  });
}

function summary(raw) {
  const flows = raw.candidates.flatMap((candidate) => candidate.flows);
  return {
    schema: "jqstar-navigation-measurement-reference/1",
    runId: raw.runId,
    createdAt: raw.createdAt,
    status: raw.status,
    contractSha256: raw.contractSha256,
    fixtureSha256: raw.fixtureSha256,
    artifactSha256: raw.artifact.sha256,
    candidateRows: raw.candidates.length,
    flowCount: flows.length,
    failedFlowCount: flows.filter((flow) => flow.status === "fail").length,
  };
}

export async function archiveNavigationMeasurement(raw, schema) {
  const validate = rawValidator(schema);
  if (!validate(raw))
    throw new Error(`Invalid raw navigation evidence: ${JSON.stringify(validate.errors)}`);
  if (!/^[a-zA-Z0-9.T_-]+$/.test(raw.runId)) throw new Error("Invalid navigation run identifier.");
  const decoded = Buffer.from(`${JSON.stringify(raw)}\n`);
  if (decoded.length > maximumBytes)
    throw new Error("Raw navigation evidence exceeds the archive bound.");
  const bytes = gzipSync(decoded, { level: 9 });
  const path = `quality/evidence/navigation/${raw.runId}.json.gz`;
  await mkdir(dirname(resolve(path)), { recursive: true });
  try {
    await writeFile(path, bytes, { flag: "wx" });
  } catch (error) {
    if (error.code !== "EEXIST" || digest(await readFile(path)) !== digest(bytes)) throw error;
  }
  return {
    ...summary(raw),
    raw: {
      path,
      sha256: digest(bytes),
      decodedSha256: digest(decoded),
      bytes: bytes.length,
      decodedBytes: decoded.length,
    },
  };
}

export async function readNavigationMeasurement(reference, schema) {
  if (!/^quality\/evidence\/navigation\/[a-zA-Z0-9.T_-]+\.json\.gz$/.test(reference.raw.path))
    throw new Error("Navigation archive path is outside its evidence directory.");
  const file = await stat(reference.raw.path);
  if (!file.isFile() || file.size > maximumBytes)
    throw new Error("Navigation archive exceeds its file bound.");
  const bytes = await readFile(reference.raw.path);
  if (bytes.length !== reference.raw.bytes || digest(bytes) !== reference.raw.sha256)
    throw new Error("Navigation archive bytes or digest differ from the manifest.");
  const decoded = gunzipSync(bytes, { maxOutputLength: maximumBytes });
  if (
    decoded.length !== reference.raw.decodedBytes ||
    digest(decoded) !== reference.raw.decodedSha256
  )
    throw new Error("Decoded navigation evidence differs from the manifest.");
  const raw = JSON.parse(decoded.toString("utf8"));
  const validate = rawValidator(schema);
  if (!validate(raw))
    throw new Error(`Invalid archived navigation evidence: ${JSON.stringify(validate.errors)}`);
  const expected = summary(raw);
  for (const [key, value] of Object.entries(expected))
    if (reference[key] !== value)
      throw new Error(`Navigation summary does not match its raw evidence: ${key}`);
  return raw;
}

export function validateNavigationMeasurement(raw, schema) {
  const validate = rawValidator(schema);
  return { valid: validate(raw), errors: validate.errors };
}

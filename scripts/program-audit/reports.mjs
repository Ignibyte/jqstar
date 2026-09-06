import assert from "node:assert/strict";
import { createSchemaValidator } from "../quality/validate-json.mjs";
import { closedObject, sameKeys } from "./contracts.mjs";
import { readAuditFile } from "./files.mjs";

export const reportSchemas = Object.freeze({
  quality: "schema/quality-report.schema.json",
  coverage: "schema/coverage-report.schema.json",
  property: "schema/property-report.schema.json",
  static: "schema/static-report.schema.json",
  package: "schema/package-report.schema.json",
  release: "schema/release-report.schema.json",
  browser: "schema/browser-report.schema.json",
  detector: "schema/quality-0044-self-test-report.schema.json",
  vitest: "quality/program-audit/vitest-report.schema.json",
  playwright: "quality/program-audit/playwright-report.schema.json",
});

function reference(value) {
  closedObject(value, ["path", "sha256", "bytes"], "Evidence reference");
  assert(
    typeof value.sha256 === "string" && /^[a-f0-9]{64}$/u.test(value.sha256),
    "Invalid evidence digest",
  );
  assert(
    Number.isSafeInteger(value.bytes) && value.bytes > 0 && value.bytes <= 32 * 1024 * 1024,
    "Invalid evidence byte count",
  );
}

async function readReferenced(root, expected) {
  reference(expected);
  const file = await readAuditFile(root, expected.path, {
    digest: expected.sha256,
    maximumBytes: expected.bytes,
  });
  assert(file.bytes === expected.bytes, "Evidence byte count differs from its frozen reference");
  return file;
}

function frozenJson(value) {
  const queue = [{ value, depth: 0 }];
  let count = 0;
  while (queue.length) {
    const entry = queue.pop();
    assert(++count <= 1_000_000 && entry.depth <= 64, "Evidence JSON exceeds its structural bound");
    if (entry.value && typeof entry.value === "object") {
      Object.freeze(entry.value);
      for (const child of Object.values(entry.value))
        queue.push({ value: child, depth: entry.depth + 1 });
    }
  }
  return value;
}

// Schema identities come from the frozen input manifest. Report references come from
// the separate immutable execution index; neither is inferred from the loaded report.
export async function createReportLoader(root, schemas) {
  sameKeys(Object.keys(schemas), Object.keys(reportSchemas), "Frozen report schemas");
  const validators = new Map();
  for (const [kind, path] of Object.entries(reportSchemas)) {
    assert(schemas[kind].path === path, "Unexpected report schema path");
    const file = await readReferenced(root, schemas[kind]);
    validators.set(kind, createSchemaValidator(JSON.parse(file.source)));
  }
  return async (kind, expected) => {
    assert(validators.has(kind), "Unknown evidence report kind");
    const file = await readReferenced(root, expected);
    let data;
    try {
      data = frozenJson(JSON.parse(file.source));
      assert(validators.get(kind)(data));
    } catch {
      // Parser and schema diagnostics can include private paths or report contents.
      throw new Error("Evidence report is malformed or fails its frozen schema");
    }
    return Object.freeze({ path: file.path, sha256: file.sha256, bytes: file.bytes, data });
  };
}

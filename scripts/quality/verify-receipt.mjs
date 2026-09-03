#!/usr/bin/env node
import { createHash } from "node:crypto";
import { realpathSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint, gitDirectory, gitHead, repositoryRoot } from "./lib/git-state.mjs";
import { createSchemaValidator } from "./validate-json.mjs";

const runnerRepositoryRoot = path.resolve(fileURLToPath(new URL("../..", import.meta.url)));

async function validateDocument(schemaPath, value, label) {
  const schema = JSON.parse(await readFile(path.join(runnerRepositoryRoot, schemaPath), "utf8"));
  const validate = createSchemaValidator(schema);
  if (!validate(value)) {
    throw new Error(`${label} violates ${schemaPath}: ${JSON.stringify(validate.errors)}`);
  }
}

async function sha256File(file) {
  return createHash("sha256")
    .update(await readFile(file))
    .digest("hex");
}

export async function verifyReceipt(cwd = process.cwd()) {
  const root = await repositoryRoot(cwd);
  const gitDir = await gitDirectory(root);
  const receiptPath = path.join(gitDir, "jqstar", "quality-receipt.json");
  let receipt;
  try {
    receipt = JSON.parse(await readFile(receiptPath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(
      `delivery receipt is missing or unreadable; run npm run quality:delivery (${detail})`,
      { cause: error },
    );
  }
  await validateDocument("schema/quality-receipt.schema.json", receipt, "delivery receipt");
  const current = await fingerprint(root);
  if (
    current.digest !== receipt.fingerprint?.digest ||
    current.fileCount !== receipt.fingerprint?.fileCount
  ) {
    throw new Error(
      "delivery receipt is stale because gated files changed; rerun npm run quality:delivery",
    );
  }
  if ((await gitHead(root)) !== receipt.head) {
    throw new Error(
      "delivery receipt is stale because HEAD changed; rerun npm run quality:delivery",
    );
  }
  let report;
  try {
    report = JSON.parse(await readFile(receipt.reportPath, "utf8"));
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error);
    throw new Error(`receipt report is missing or unreadable (${detail})`, { cause: error });
  }
  await validateDocument("schema/quality-report.schema.json", report, "quality report");
  if (
    report.schema !== "jqstar-quality-report/1" ||
    report.status !== "pass" ||
    report.runId !== receipt.runId ||
    report.mode !== receipt.mode ||
    report.head !== receipt.head ||
    report.receipt?.eligible !== true ||
    report.startFingerprint?.digest !== receipt.fingerprint.digest ||
    report.startFingerprint?.fileCount !== receipt.fingerprint.fileCount ||
    report.endFingerprint?.digest !== receipt.fingerprint.digest ||
    report.endFingerprint?.fileCount !== receipt.fingerprint.fileCount
  ) {
    throw new Error("receipt report is not a matching passing quality report");
  }
  if ((await sha256File(receipt.reportPath)) !== receipt.reportSha256) {
    throw new Error("receipt report changed after approval");
  }
  return { receipt, current };
}

async function main() {
  const { receipt } = await verifyReceipt();
  process.stdout.write(`PASS delivery receipt ${receipt.runId} matches the current worktree\n`);
}

if (
  process.argv[1] &&
  realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))
) {
  main().catch((error) => {
    process.stderr.write(`commit guard: ${error.message}\n`);
    process.exitCode = 1;
  });
}

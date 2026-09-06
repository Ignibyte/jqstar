import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { isIP } from "node:net";
import { copyFile, mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { runChild } from "./quality/lib/process.mjs";
import { createOwnedTemporaryDirectory } from "./quality/lib/owned-temporary-directory.mjs";
import { createCSPProofHandler } from "./quality/csp-proof-server.mjs";
import { createSchemaValidator } from "./quality/validate-json.mjs";
import { verifyReceipt } from "./quality/verify-receipt.mjs";
import { packageCheckNames } from "./quality/package-release-contracts.mjs";
import { gitDirectory, repositoryRoot } from "./quality/lib/git-state.mjs";
import { readOptions } from "./release/lib.mjs";

const digest = (bytes) => createHash("sha256").update(bytes).digest("hex");

export function manualPackageIdentity(report, receipt) {
  assert.equal(report.status, "pass", "Manual proof requires passing package evidence");
  assert.equal(report.runId, receipt.runId, "Manual package report belongs to another quality run");
  assert.deepEqual(
    report.checks.map(({ name }) => name),
    packageCheckNames,
    "Manual package checks are incomplete",
  );
  assert(
    report.checks.every(({ status }) => status === "pass"),
    "Manual package checks did not all pass",
  );
  const browser = report.checks.find(({ name }) => name === "browser-consumers").detail;
  assert.equal(browser.subject, "installed-tarball");
  assert.match(browser.csp.tarballDigest, /^[a-f0-9]{64}$/u);
  assert.match(report.package.filename, /^jquery-star-[0-9A-Za-z.+-]+\.tgz$/u);
  assert(Number.isSafeInteger(report.package.packedBytes) && report.package.packedBytes > 0);
  return {
    filename: report.package.filename,
    bytes: report.package.packedBytes,
    sha256: browser.csp.tarballDigest,
  };
}

export function assertManualTarball(bytes, expected) {
  assert.equal(bytes.length, expected.bytes, "Manual tarball size differs from tested artifact");
  assert.equal(
    digest(bytes),
    expected.sha256,
    "Manual tarball checksum differs from tested artifact",
  );
}

async function command(root, executable, args) {
  const result = await runChild({
    command: executable,
    args,
    cwd: root,
    env: process.env,
    timeoutMs: 120000,
  });
  assert.equal(
    result.exitCode,
    0,
    `${executable} failed: ${result.stderr ?? result.spawnError ?? "unknown error"}`,
  );
  assert(!result.timedOut && !result.spawnError, "Manual package preparation did not complete");
  return result.stdout;
}

export async function serveCSPProof(arguments_ = process.argv.slice(2)) {
  const options = readOptions(arguments_, ["host", "port"]);
  const host = options.host ?? "127.0.0.1";
  const port = Number(options.port ?? "4178");
  assert(isIP(host), "Manual host must be an explicit IP address");
  assert(Number.isSafeInteger(port) && port >= 0 && port <= 65535, "Invalid manual proof port");
  const root = await repositoryRoot();
  const { receipt } = await verifyReceipt(root);
  const report = JSON.parse(
    await readFile(join(dirname(receipt.reportPath), "package-report.json"), "utf8"),
  );
  const schema = JSON.parse(
    await readFile(join(root, "schema/package-report.schema.json"), "utf8"),
  );
  const validate = createSchemaValidator(schema);
  assert(
    validate(report),
    `Manual package evidence is invalid: ${JSON.stringify(validate.errors)}`,
  );
  const artifact = manualPackageIdentity(report, receipt);
  const owned = await createOwnedTemporaryDirectory({ prefix: "jqstar-csp-manual-" });
  let server;
  const stopHandlers = new Map();
  try {
    const npm = process.platform === "win32" ? "npm.cmd" : "npm";
    const packed = JSON.parse(
      await command(root, npm, [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        owned.directory,
      ]),
    );
    assert.equal(packed.length, 1, "Manual proof needs exactly one packed candidate");
    assert.equal(packed[0].filename, artifact.filename, "Manual package filename changed");
    const tarball = join(owned.directory, artifact.filename);
    assertManualTarball(await readFile(tarball), artifact);
    await command(root, "tar", ["-xzf", tarball, "-C", owned.directory]);
    const proof = await createCSPProofHandler({
      root,
      installedPackage: join(owned.directory, "package"),
      jqueryModule: join(root, "node_modules/jquery/dist-module/jquery.module.js"),
    });
    const current = await verifyReceipt(root);
    assert.equal(
      current.receipt.reportSha256,
      receipt.reportSha256,
      "Manual quality receipt changed during preparation",
    );
    server = createServer((request, response) => {
      proof
        .handle(request, response)
        .then((handled) => {
          if (!handled) response.writeHead(404, { "Content-Type": "text/plain" }).end("not found");
        })
        .catch(() => {
          if (!response.headersSent) response.writeHead(500, { "Content-Type": "text/plain" });
          response.end("CSP proof request failed");
        });
    });
    const stopped = new Promise((done) => {
      for (const signal of ["SIGINT", "SIGTERM", "SIGHUP"]) {
        const handler = () => done();
        stopHandlers.set(signal, handler);
        process.once(signal, handler);
      }
    });
    await new Promise((done, fail) => {
      server.once("error", fail);
      server.listen(port, host, done);
    });
    const address = server.address();
    assert(address && typeof address !== "string");
    const origin = `http://${host.includes(":") ? `[${host}]` : host}:${address.port}`;
    const gitDir = await gitDirectory(root);
    const evidenceDirectory = join(
      gitDir,
      "jqstar",
      "manual-csp",
      new Date().toISOString().replaceAll(/[:.]/gu, "-"),
    );
    await mkdir(evidenceDirectory, { recursive: true });
    await copyFile(tarball, join(evidenceDirectory, artifact.filename));
    const receiptBytes = await readFile(join(gitDir, "jqstar", "quality-receipt.json"));
    assert.deepEqual(
      JSON.parse(receiptBytes.toString("utf8")),
      receipt,
      "Manual receipt changed before session capture",
    );
    await writeFile(join(evidenceDirectory, "quality-receipt.json"), receiptBytes);
    await copyFile(
      join(dirname(receipt.reportPath), "package-report.json"),
      join(evidenceDirectory, "package-report.json"),
    );
    const session = {
      schema: "jqstar-csp-manual-session/1",
      startedAt: new Date().toISOString(),
      url: `${origin}/csp`,
      artifact,
      source: {
        commit: receipt.head,
        receiptSha256: digest(receiptBytes),
        fingerprint: receipt.fingerprint,
      },
      qualityRun: receipt.runId,
      assets: proof.manifest,
      charter: "docs/accessibility/RELEASE_CHARTERS.md",
      result: "awaiting-real-assistive-technology-observations",
    };
    await writeFile(
      join(evidenceDirectory, "session.json"),
      JSON.stringify(session, null, 2) + "\n",
    );
    process.stdout.write(
      `CSP manual proof: ${session.url}\nArtifact: ${artifact.filename} ${artifact.sha256}\nSession: ${join(evidenceDirectory, "session.json")}\nUse both assistive-technology charters; stop with Ctrl+C. No manual pass is recorded automatically.\n`,
    );
    await stopped;
  } finally {
    for (const [signal, handler] of stopHandlers) process.off(signal, handler);
    if (server) {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    }
    await owned.cleanup();
  }
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] ?? "")).href) {
  await serveCSPProof();
}

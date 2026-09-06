// @vitest-environment node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createServer } from "node:http";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, it } from "vitest";
import { createCSPProofHandler, cspPolicy } from "../scripts/quality/csp-proof-server.mjs";
import { assertManualTarball, manualPackageIdentity } from "../scripts/serve-csp-proof.mjs";
import { packageCheckNames } from "../scripts/quality/package-release-contracts.mjs";
import { runChild } from "../scripts/quality/lib/process.mjs";

async function fixture(work) {
  const root = await mkdtemp(join(tmpdir(), "jqstar-csp-server-test-"));
  let server;
  try {
    for (const path of ["e2e/fixtures/csp-proof", "node_modules/axe-core", "package/dist"])
      await mkdir(join(root, path), { recursive: true });
    for (const [path, body] of [
      ["e2e/fixtures/csp-proof/index.html", "<!doctype html><title>Fixture</title>"],
      ["e2e/fixtures/csp-proof/app.js", "export const app = 1;"],
      ["e2e/fixtures/csp-proof/bootstrap.js", "globalThis.proof = true;"],
      ["e2e/fixtures/csp-proof/style.css", "body { color: black; }"],
      ["node_modules/axe-core/axe.min.js", "globalThis.axe = {};"],
      ["jquery.js", "export default {};"],
      ["package/dist/csp.js", "export const count = 1;"],
    ])
      await writeFile(join(root, path), body);
    const proof = await createCSPProofHandler({
      root,
      installedPackage: join(root, "package"),
      jqueryModule: join(root, "jquery.js"),
    });
    server = createServer((request, response) => {
      proof
        .handle(request, response)
        .then((handled) => {
          if (!handled) response.writeHead(404).end();
        })
        .catch(() => response.writeHead(500).end());
    });
    await new Promise((done, fail) => {
      server.once("error", fail);
      server.listen(0, "127.0.0.1", done);
    });
    const address = server.address();
    assert(address && typeof address !== "string");
    await work({ root, proof, origin: `http://127.0.0.1:${address.port}` });
  } finally {
    if (server) {
      server.closeAllConnections();
      await new Promise((done) => server.close(done));
    }
    await rm(root, { recursive: true, force: true });
  }
}

describe("shared installed CSP proof server", () => {
  it("serves immutable external assets under the same strict response policy", async () => {
    await fixture(async ({ root, proof, origin }) => {
      await writeFile(join(root, "package/dist/csp.js"), "export const count = 99;");
      const response = await fetch(`${origin}/csp.js`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-security-policy"), cspPolicy);
      const body = await response.text();
      assert.equal(body, "export const count = 1;");
      assert.equal(
        proof.manifest.find(({ path }) => path === "/csp.js").sha256,
        createHash("sha256").update(body).digest("hex"),
      );
    });
  });

  it("provides real native GET destinations with escaped and bounded form receipts", async () => {
    await fixture(async ({ origin }) => {
      const name = "CSP <native> & proof";
      for (const [path, heading] of [
        ["/csp-destination", "Native destination"],
        ["/csp-form", "Native form received"],
      ]) {
        const response = await fetch(`${origin}${path}?${new URLSearchParams({ name })}`);
        assert.equal(response.status, 200);
        assert.equal(response.headers.get("content-security-policy"), cspPolicy);
        const body = await response.text();
        assert(body.includes(`<h1>${heading}</h1>`));
        assert(body.includes("CSP &lt;native&gt; &amp; proof"));
        assert(!body.includes("<native>"));
      }
      const bounded = await fetch(
        `${origin}/csp-form?${new URLSearchParams({ name: "a".repeat(201) })}`,
      );
      assert((await bounded.text()).includes(`<p id="received-name">${"a".repeat(200)}</p>`));
      const refused = await fetch(`${origin}/csp-form`, { method: "POST" });
      assert.equal(refused.status, 405);
      assert.equal(refused.headers.get("allow"), "GET");
      assert.equal(refused.headers.get("content-security-policy"), cspPolicy);
    });
  });

  it("preserves SDK, redirect, error and bounded policy-report routes", async () => {
    await fixture(async ({ origin, proof }) => {
      const stream = await fetch(`${origin}/csp-datastar`);
      assert.equal(stream.status, 200);
      assert.equal(stream.headers.get("content-security-policy"), cspPolicy);
      assert(stream.headers.get("content-type").includes("text/event-stream"));
      assert((await stream.text()).includes('"count":8'));
      const redirect = await fetch(`${origin}/csp-redirect`, { redirect: "manual" });
      assert.equal(redirect.status, 302);
      assert.equal(redirect.headers.get("location"), "/csp-json");
      const error = await fetch(`${origin}/csp-error`);
      assert.equal(error.status, 404);
      assert.equal(error.headers.get("content-security-policy"), cspPolicy);
      const report = await fetch(`${origin}/csp-report`, {
        method: "POST",
        body: JSON.stringify({
          "csp-report": {
            "blocked-uri": "eval",
            disposition: "enforce",
            "effective-directive": "script-src",
          },
        }),
      });
      assert.equal(report.status, 204);
      assert.deepEqual(proof.reports, [
        { blockedURI: "eval", disposition: "enforce", effectiveDirective: "script-src" },
      ]);
      const oversized = await fetch(`${origin}/csp-report`, {
        method: "POST",
        body: "x".repeat(4097),
      });
      assert.equal(oversized.status, 413);
    });
  });
});

describe("manual CSP artifact identity", () => {
  it("requires the exact passing run, complete checks and tested tarball bytes", () => {
    const bytes = Buffer.from("synthetic package identity fixture");
    const expected = {
      filename: "jquery-star-1.1.0.tgz",
      bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
    };
    const report = {
      status: "pass",
      runId: "fixture",
      package: { filename: expected.filename, packedBytes: expected.bytes },
      checks: packageCheckNames.map((name) => ({
        name,
        status: "pass",
        detail:
          name === "browser-consumers"
            ? { subject: "installed-tarball", csp: { tarballDigest: expected.sha256 } }
            : {},
      })),
    };
    assert.deepEqual(manualPackageIdentity(report, { runId: "fixture" }), expected);
    assertManualTarball(bytes, expected);
    assert.throws(() => assertManualTarball(Buffer.from("changed"), expected), /size differs/u);
    assert.throws(
      () => assertManualTarball(Buffer.alloc(bytes.length), expected),
      /checksum differs/u,
    );
    assert.throws(() => manualPackageIdentity(report, { runId: "other" }), /another quality run/u);
    for (const change of [
      (r) => r.checks.pop(),
      (r) => (r.checks[0].status = "skip"),
      (r) => (r.status = "fail"),
    ]) {
      const broken = structuredClone(report);
      change(broken);
      assert.throws(() => manualPackageIdentity(broken, { runId: "fixture" }));
    }
  });

  it("refuses to start the manual server without a current delivery receipt", async () => {
    const root = await mkdtemp(join(tmpdir(), "jqstar-csp-no-receipt-"));
    try {
      const init = await runChild({
        command: "git",
        args: ["init", "--quiet"],
        cwd: root,
        env: process.env,
        timeoutMs: 10000,
      });
      assert.equal(init.exitCode, 0);
      const result = await runChild({
        command: process.execPath,
        args: [resolve("scripts/serve-csp-proof.mjs"), "--port", "0"],
        cwd: root,
        env: process.env,
        timeoutMs: 10000,
      });
      assert.notEqual(result.exitCode, 0);
      assert(!result.timedOut);
      assert.match(result.stderr, /delivery receipt is missing or unreadable/u);
      assert(!result.stdout.includes("CSP manual proof:"));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  });
});

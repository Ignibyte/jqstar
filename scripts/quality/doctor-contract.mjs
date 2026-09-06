import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

const digest = (source) => createHash("sha256").update(source).digest("hex");

export async function validateDoctorAuthority(rules, root = process.cwd()) {
  const read = (path) => readFile(resolve(root, path), "utf8");
  for (const authority of rules.authority) {
    assert(
      ["quality/release-contract.json", "quality/jquery-ecosystem.json"].includes(authority.path),
    );
    const source = await read(authority.path);
    const selected = authority.pointer
      ? JSON.stringify(
          authority.pointer
            .slice(1)
            .split("/")
            .reduce((value, key) => value[key], JSON.parse(source)),
        )
      : source;
    assert.equal(
      digest(selected),
      authority.sha256,
      `Stale doctor authority: ${authority.path}${authority.pointer}`,
    );
  }
  const contract = JSON.parse(await read("quality/release-contract.json"));
  const manifest = JSON.parse(await read("package.json"));
  const compatibility = rules.compatibility;
  assert.equal(compatibility.version, manifest.version);
  assert.equal(compatibility.node, contract.support.node);
  assert.equal(compatibility.npmForReleaseConstruction, contract.support.npm);
  assert.equal(compatibility.jquery, contract.support.jquery);
  assert.equal(compatibility.pluginApi, contract.package.pluginApiVersion);
  assert.deepEqual(compatibility.bridges, contract.support.bridges);
  const entries = (values) => values.map(({ subpath, formats }) => ({ subpath, formats }));
  assert.deepEqual(entries(compatibility.entrypoints), entries(contract.stableEntries));
  assert.equal(new Set(rules.diagnostics.map(({ code }) => code)).size, rules.diagnostics.length);
  assert(rules.reviewedAt < rules.reviewAfter);
  for (const diagnostic of rules.diagnostics) {
    assert.equal(diagnostic.reviewAfter, rules.reviewAfter);
    assert.equal(
      diagnostic.documentation,
      `https://github.com/Ignibyte/jqstar/blob/main/${diagnostic.source}`,
    );
    assert((await read(diagnostic.source)).length > 0);
  }
}

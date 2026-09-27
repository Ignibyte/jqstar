import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import {
  externalizeSourceMaps,
  verifyExternalizedSourceMaps,
} from "../scripts/quality/source-map-packaging.mjs";

const sourcePath = "src/example.ts";
const source = "export const answer = 42;\n";

async function fixture({ second = true, embedded = source } = {}) {
  const root = await mkdtemp(join(tmpdir(), "jqstar-map-package-"));
  await mkdir(join(root, "dist"));
  await mkdir(dirname(join(root, sourcePath)), { recursive: true });
  await writeFile(join(root, sourcePath), source);
  for (const name of second ? ["one.js.map", "two.cjs.map"] : ["one.js.map"]) {
    await writeFile(
      join(root, "dist", name),
      JSON.stringify({
        version: 3,
        sources: ["../src/example.ts"],
        sourcesContent: [embedded],
        names: [],
        mappings: "",
      }),
    );
  }
  return root;
}

test("externalized maps resolve to byte-identical packaged sources", async () => {
  const root = await fixture();
  try {
    const manifest = await externalizeSourceMaps(root, [sourcePath]);
    assert.equal(manifest.sources[0].references, 2);
    assert.deepEqual(await verifyExternalizedSourceMaps(root, [sourcePath]), manifest);
    const map = JSON.parse(await readFile(join(root, "dist/one.js.map"), "utf8"));
    assert.equal(map.sourcesContent[0], null);
    assert.equal(resolve(root, "dist", map.sources[0]), join(root, "dist/sources", sourcePath));
    assert.equal(await readFile(join(root, "dist/sources", sourcePath), "utf8"), source);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("packaged map verifier rejects changed and missing source files", async () => {
  const root = await fixture();
  try {
    await externalizeSourceMaps(root, [sourcePath]);
    const output = join(root, "dist/sources", sourcePath);
    await writeFile(output, "changed\n");
    await assert.rejects(verifyExternalizedSourceMaps(root, [sourcePath]), /digest differs/u);
    await rm(output);
    await assert.rejects(verifyExternalizedSourceMaps(root, [sourcePath]), /ENOENT/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("packaged map verifier rejects a restored embedded source", async () => {
  const root = await fixture();
  try {
    await externalizeSourceMaps(root, [sourcePath]);
    const mapPath = join(root, "dist/one.js.map");
    const map = JSON.parse(await readFile(mapPath, "utf8"));
    map.sourcesContent[0] = source;
    await writeFile(mapPath, JSON.stringify(map));
    await assert.rejects(
      verifyExternalizedSourceMaps(root, [sourcePath]),
      /unverified external source/u,
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("externalization refuses stale embedded bytes or a single reference", async () => {
  for (const options of [{ embedded: "stale\n" }, { second: false }]) {
    const root = await fixture(options);
    try {
      await assert.rejects(externalizeSourceMaps(root, [sourcePath]));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  }
});

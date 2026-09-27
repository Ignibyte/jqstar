import { createHash } from "node:crypto";
import { mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

export const externalizedSourcePaths = [
  "src/csp/evaluator.ts",
  "src/declarative.ts",
  "src/fetch.ts",
  "src/htmx.ts",
  "src/kernel.ts",
  "src/observation.ts",
  "src/plugin.ts",
  "src/protocol.ts",
  "src/request-middleware.ts",
  "src/runtime.ts",
  "src/ui/calendar.ts",
  "src/ui/carousel.ts",
  "src/ui/chart.ts",
  "src/ui/combobox.ts",
  "src/ui/data-table.ts",
  "src/ui/feed.ts",
  "src/ui/file-upload.ts",
  "src/ui/form.ts",
  "src/ui/hover-card.ts",
  "src/ui/index.ts",
  "src/ui/menu.ts",
  "src/ui/multi-select.ts",
  "src/ui/questionnaire.ts",
  "src/ui/resizable.ts",
  "src/ui/select.ts",
  "src/ui/sortable.ts",
  "src/ui/stepper.ts",
  "src/ui/toast.ts",
  "src/ui/transfer-list.ts",
  "src/ui/tree.ts",
];

const digest = (value) => createHash("sha256").update(value).digest("hex");
const isWithin = (parent, path) => path === parent || path.startsWith(`${parent}${sep}`);
const canonical = (path) => path.split(sep).join("/");

async function maps(dist) {
  return (await readdir(dist))
    .filter((name) => name.endsWith(".map"))
    .sort()
    .map((name) => join(dist, name));
}

function assertSourcePaths(paths) {
  if (paths.length === 0 || new Set(paths).size !== paths.length) {
    throw new Error("Externalized source paths must be nonempty and unique.");
  }
  for (const path of paths) {
    if (!/^src\/[a-z0-9/-]+\.ts$/u.test(path) || path.includes("..")) {
      throw new Error(`Invalid externalized source path: ${path}`);
    }
  }
}

async function readMap(path) {
  const map = JSON.parse(await readFile(path, "utf8"));
  if (
    map.sourceRoot ||
    !Array.isArray(map.sources) ||
    !Array.isArray(map.sourcesContent) ||
    map.sources.length !== map.sourcesContent.length
  ) {
    throw new Error(`Source map has unsupported source fields: ${path}`);
  }
  return map;
}

export async function externalizeSourceMaps(root, paths = externalizedSourcePaths) {
  assertSourcePaths(paths);
  const base = resolve(root);
  const dist = join(base, "dist");
  const selected = new Set(paths);
  const texts = new Map();
  const counts = new Map(paths.map((path) => [path, 0]));
  const changes = [];
  for (const mapPath of await maps(dist)) {
    const map = await readMap(mapPath);
    for (let index = 0; index < map.sources.length; index += 1) {
      const original = resolve(dirname(mapPath), map.sources[index]);
      if (!isWithin(base, original)) continue;
      const sourcePath = canonical(relative(base, original));
      if (!selected.has(sourcePath)) continue;
      const embedded = map.sourcesContent[index];
      const source = await readFile(join(base, sourcePath), "utf8");
      if (embedded !== source) {
        throw new Error(`${mapPath} has changed or missing embedded source ${sourcePath}.`);
      }
      texts.set(sourcePath, source);
      counts.set(sourcePath, counts.get(sourcePath) + 1);
      map.sources[index] = canonical(relative(dirname(mapPath), join(dist, "sources", sourcePath)));
      map.sourcesContent[index] = null;
    }
    changes.push([mapPath, map]);
  }
  for (const path of paths) {
    if (counts.get(path) < 2) {
      throw new Error(`${path} must occur in at least two source maps to be externalized.`);
    }
  }
  const manifest = {
    schema: "jqstar-externalized-sources/1",
    sources: paths.map((path) => ({
      path,
      sha256: digest(texts.get(path)),
      references: counts.get(path),
    })),
  };
  for (const [path, map] of changes) await writeFile(path, JSON.stringify(map), "utf8");
  for (const path of paths) {
    const output = join(dist, "sources", path);
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, texts.get(path), "utf8");
  }
  await writeFile(join(dist, "sources", "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`);
  return manifest;
}

export async function verifyExternalizedSourceMaps(packageRoot, paths = externalizedSourcePaths) {
  assertSourcePaths(paths);
  const dist = resolve(packageRoot, "dist");
  const sourcesRoot = join(dist, "sources");
  const manifest = JSON.parse(await readFile(join(sourcesRoot, "manifest.json"), "utf8"));
  if (
    manifest.schema !== "jqstar-externalized-sources/1" ||
    JSON.stringify(manifest.sources?.map((entry) => entry.path)) !== JSON.stringify(paths)
  ) {
    throw new Error("Externalized source manifest has an unexpected path roster.");
  }
  const expected = new Map();
  for (const entry of manifest.sources) {
    if (
      !/^[a-f0-9]{64}$/u.test(entry.sha256) ||
      !Number.isSafeInteger(entry.references) ||
      entry.references < 2
    ) {
      throw new Error(`Externalized source manifest entry is invalid: ${entry.path}`);
    }
    const path = join(sourcesRoot, entry.path);
    if (!isWithin(sourcesRoot, path) || !(await stat(path)).isFile()) {
      throw new Error(`Externalized source is missing: ${entry.path}`);
    }
    if (digest(await readFile(path)) !== entry.sha256) {
      throw new Error(`Externalized source digest differs: ${entry.path}`);
    }
    expected.set(path, entry);
  }
  const observed = new Map(paths.map((path) => [join(sourcesRoot, path), 0]));
  for (const mapPath of await maps(dist)) {
    const map = await readMap(mapPath);
    for (let index = 0; index < map.sources.length; index += 1) {
      const path = resolve(dirname(mapPath), map.sources[index]);
      if (!isWithin(sourcesRoot, path)) continue;
      if (!expected.has(path) || map.sourcesContent[index] !== null) {
        throw new Error(`${mapPath} has an unverified external source.`);
      }
      observed.set(path, observed.get(path) + 1);
    }
  }
  for (const [path, entry] of expected) {
    if (observed.get(path) !== entry.references) {
      throw new Error(`Externalized source reference count differs: ${entry.path}`);
    }
  }
  return manifest;
}

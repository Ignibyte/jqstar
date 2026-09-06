import { relative } from "node:path";
import { entries, field, packageName, portablePath, record, DoctorFault } from "./data.mjs";
import { parseYAML, readLockfiles } from "./lockfiles.mjs";

const dependencyKinds = [
  "dependencies",
  "devDependencies",
  "peerDependencies",
  "optionalDependencies",
];

function manifestDependencies(manifest, path, add) {
  for (const group of dependencyKinds) {
    for (const [name, declared] of entries(field(manifest, group))) {
      if (packageName(name))
        add({ name, declared, path, location: path, kind: "manifest", dependencyKind: group });
    }
  }
}

async function expandWorkspace(reader, pattern, unknown) {
  if (typeof pattern !== "string") throw new DoctorFault("JQS_INPUT_INVALID", "package.json");
  const parts = portablePath(pattern)
    .split("/")
    .filter((part) => part !== "." && part !== "");
  if (parts.length > reader.limits.workspaceDepth)
    throw new DoctorFault("JQS_SCAN_TRUNCATED", "package.json", 0);
  if (parts.some((part) => part !== "*" && /[*?{}[\]!]/u.test(part))) {
    unknown("package.json");
    return [];
  }
  let paths = [""];
  for (const part of parts) {
    const next = [];
    for (const parent of paths) {
      const names = part === "*" ? await reader.directories(parent || ".") : [part];
      for (const name of names) {
        if (name === "node_modules" || name.startsWith(".")) continue;
        next.push(parent ? `${parent}/${name}` : name);
        if (next.length > reader.limits.workspaces)
          throw new DoctorFault("JQS_SCAN_TRUNCATED", "package.json", 0);
      }
    }
    paths = next;
  }
  return paths;
}

async function workspaces(reader, manifest, unknown) {
  const value = field(manifest, "workspaces");
  let patterns = Array.isArray(value) ? value : field(value, "packages");
  if (patterns !== undefined && !Array.isArray(patterns))
    throw new DoctorFault("JQS_INPUT_INVALID", "package.json");
  patterns = [...(patterns ?? [])];
  const pnpm = await reader.read("pnpm-workspace.yaml");
  if (pnpm !== undefined) {
    const data = parseYAML(pnpm, "pnpm-workspace.yaml");
    const included = field(data, "packages");
    if (included !== undefined && !Array.isArray(included))
      throw new DoctorFault("JQS_INPUT_INVALID", "pnpm-workspace.yaml");
    patterns.push(...(included ?? []));
  }
  if (patterns.length > reader.limits.workspaces)
    throw new DoctorFault("JQS_SCAN_TRUNCATED", "package.json", 0);
  const result = [{ path: "", manifest }];
  reader.workspaceManifests = 1;
  const seen = new Set([reader.root]);
  for (const pattern of patterns) {
    for (const path of await expandWorkspace(reader, pattern, unknown)) {
      const actual = await reader.path(path);
      if (!actual) continue;
      if (seen.has(actual)) {
        unknown(`${path}/package.json`);
        continue;
      }
      seen.add(actual);
      const value = await reader.json(`${path}/package.json`);
      if (value === undefined) continue;
      if (!record(value)) throw new DoctorFault("JQS_INPUT_INVALID", `${path}/package.json`);
      result.push({ path, manifest: value });
      reader.workspaceManifests = result.length;
      if (result.length > reader.limits.workspaces)
        throw new DoctorFault("JQS_SCAN_TRUNCATED", "package.json", 0);
    }
  }
  return result;
}

async function installedPackages(reader, roots, add) {
  const queue = roots.map(({ path }) => (path ? `${path}/node_modules` : "node_modules"));
  const enqueue = (path) => {
    if (queue.length >= reader.limits.packages * 2)
      throw new DoctorFault("JQS_SCAN_TRUNCATED", path, 0);
    queue.push(path);
  };
  const seenDirectories = new Set();
  const seenPackages = new Map();
  for (let cursor = 0; cursor < queue.length; cursor++) {
    reader.check();
    const directory = queue[cursor];
    const actualDirectory = await reader.path(directory);
    if (!actualDirectory || seenDirectories.has(actualDirectory)) continue;
    seenDirectories.add(actualDirectory);
    if (seenDirectories.size > reader.limits.packages)
      throw new DoctorFault("JQS_SCAN_TRUNCATED", directory, 0);
    const names = [];
    for (const name of await reader.directories(directory)) {
      if (name === ".pnpm") {
        for (const nested of await reader.directories(`${directory}/.pnpm`))
          enqueue(`${directory}/.pnpm/${nested}/node_modules`);
      } else if (name.startsWith("@")) {
        for (const child of await reader.directories(`${directory}/${name}`))
          names.push(`${name}/${child}`);
      } else if (!name.startsWith(".")) names.push(name);
    }
    for (const name of names) {
      const location = `${directory}/${name}`;
      const actual = await reader.path(location);
      if (!actual) continue;
      const previous = seenPackages.get(actual);
      if (previous) {
        if (!previous.aliases.includes(location)) previous.aliases.push(location);
        continue;
      }
      const path = `${location}/package.json`;
      const metadata = await reader.json(path);
      if (metadata === undefined) continue;
      if (!record(metadata)) throw new DoctorFault("JQS_INPUT_INVALID", path);
      const discovered = {
        name: packageName(field(metadata, "name")) ?? name,
        requestedName: name,
        version: field(metadata, "version"),
        path,
        location: relative(reader.root, actual).replaceAll("\\", "/"),
        kind: "installed",
        metadata,
        aliases: [location],
      };
      seenPackages.set(actual, discovered);
      add(discovered);
      enqueue(`${location}/node_modules`);
    }
  }
}

export async function discover(reader, emit) {
  const packages = [];
  const unknown = (path) => emit("JQS_METADATA_UNKNOWN", { path, kind: "unknown" });
  const add = (value) => {
    reader.check();
    if (packages.length >= reader.limits.packages)
      throw new DoctorFault("JQS_SCAN_TRUNCATED", value.path, 0);
    packages.push(value);
    reader.packageRecords = packages.length;
  };
  const manifest = await reader.json("package.json", true);
  if (!record(manifest)) throw new DoctorFault("JQS_INPUT_INVALID", "package.json");
  const roots = await workspaces(reader, manifest, unknown);
  for (const workspace of roots)
    manifestDependencies(
      workspace.manifest,
      workspace.path ? `${workspace.path}/package.json` : "package.json",
      add,
    );
  await readLockfiles(reader, add, unknown);
  await installedPackages(reader, roots, add);
  const config = await reader.json("jquery-star.json");
  const ownership = await reader.json(".jqstar-ownership.json");
  return { roots, packages, config, ownership };
}

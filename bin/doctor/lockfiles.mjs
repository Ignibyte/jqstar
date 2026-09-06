import { parseSyml } from "@yarnpkg/parsers";
import { isAlias, isCollection, isPair, parseDocument, visit } from "yaml";
import { valid } from "semver";
import { checkData, DoctorFault, entries, field, packageName, parseJSON, record } from "./data.mjs";

export function parseYAML(source, path) {
  try {
    const document = parseDocument(source, { schema: "core", uniqueKeys: true, version: "1.2" });
    if (document.errors.length > 0 || document.warnings.length > 0)
      throw new DoctorFault("JQS_INPUT_INVALID", path);
    let nodes = 0;
    visit(document, (_key, node, ancestors) => {
      if (++nodes > 200000 || ancestors.length > 32)
        throw new DoctorFault("JQS_SCAN_TRUNCATED", path, 0);
      if (isAlias(node) || ((isCollection(node) || isPair(node)) && node.tag))
        throw new DoctorFault("JQS_INPUT_INVALID", path);
    });
    return checkData(document.toJS({ maxAliasCount: 0 }));
  } catch (error) {
    if (error instanceof DoctorFault) throw error;
    throw new DoctorFault("JQS_INPUT_INVALID", path);
  }
}

function exactVersion(input) {
  if (typeof input !== "string" || input.length > 256) return undefined;
  const version = input.split("(")[0];
  return valid(version) ?? undefined;
}

function locator(input) {
  if (typeof input !== "string" || input.length > 512) return undefined;
  const match = /^((?:@[^/]+\/)?[^@]+)@(?:npm:)?(.+)$/u.exec(input);
  if (!match || !packageName(match[1])) return undefined;
  return { name: match[1], version: exactVersion(match[2]) };
}

function npmPackages(data, path, add, unknown) {
  if (![2, 3].includes(field(data, "lockfileVersion")) || !record(field(data, "packages"))) {
    unknown(path);
    return;
  }
  for (const [location, metadata] of entries(data.packages)) {
    if (!location || field(metadata, "link") === true) continue;
    const match = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)$/u.exec(location);
    const name = packageName(field(metadata, "name")) ?? packageName(match?.[1]);
    if (name)
      add({
        name,
        version: exactVersion(field(metadata, "version")),
        path,
        location,
        kind: "lock",
        metadata,
      });
  }
}

function pnpmConsumers(data, path, reader) {
  const consumers = new Map();
  const importers = entries(field(data, "importers"));
  if (importers.length > reader.limits.workspaces)
    throw new DoctorFault("JQS_SCAN_TRUNCATED", path, 0);
  let dependencies = 0;
  for (const [consumer, importer] of importers) {
    for (const group of ["dependencies", "devDependencies", "optionalDependencies"]) {
      for (const [name, dependency] of entries(field(importer, group))) {
        reader.check();
        if (++dependencies > reader.limits.packages)
          throw new DoctorFault("JQS_SCAN_TRUNCATED", path, 0);
        const version = exactVersion(field(dependency, "version"));
        if (!packageName(name) || !version) continue;
        const key = `${name}@${version}`;
        if (!consumers.has(key)) consumers.set(key, new Set());
        consumers.get(key).add(consumer);
      }
    }
  }
  return consumers;
}

function pnpmPackages(data, path, add, unknown, reader) {
  if (String(field(data, "lockfileVersion")) !== "9.0" || !record(field(data, "packages"))) {
    unknown(path);
    return;
  }
  const index = pnpmConsumers(data, path, reader);
  for (const [key, metadata] of entries(data.packages)) {
    reader.check();
    const id = locator(key);
    if (!id) continue;
    const consumers = [...(index.get(`${id.name}@${id.version}`) ?? [])];
    add({ ...id, path, location: key, kind: "lock", metadata, consumers });
  }
}

function yarnPackages(data, path, classic, add, unknown) {
  const version = field(field(data, "__metadata"), "version");
  if (!classic && ![4, 5, 6, 7, 8].includes(version)) {
    unknown(path);
    return;
  }
  for (const [key, metadata] of entries(data)) {
    if (key === "__metadata") continue;
    const id = locator(key.split(", ")[0]);
    if (id)
      add({
        name: id.name,
        version: exactVersion(field(metadata, "version")),
        path,
        location: key,
        kind: "lock",
        metadata,
        selectors: key.split(", "),
      });
  }
}

export async function readLockfiles(reader, add, unknown) {
  const npm = await reader.read("package-lock.json");
  if (npm !== undefined)
    npmPackages(parseJSON(npm, "package-lock.json"), "package-lock.json", add, unknown);
  const pnpm = await reader.read("pnpm-lock.yaml");
  if (pnpm !== undefined)
    pnpmPackages(parseYAML(pnpm, "pnpm-lock.yaml"), "pnpm-lock.yaml", add, unknown, reader);
  const yarn = await reader.read("yarn.lock");
  if (yarn !== undefined) {
    const classic = /^# yarn lockfile v1\s*$/mu.test(yarn);
    let data;
    try {
      data = classic ? checkData(parseSyml(yarn)) : parseYAML(yarn, "yarn.lock");
    } catch (error) {
      if (error instanceof DoctorFault) throw error;
      throw new DoctorFault("JQS_INPUT_INVALID", "yarn.lock");
    }
    yarnPackages(data, "yarn.lock", classic, add, unknown);
  }
}

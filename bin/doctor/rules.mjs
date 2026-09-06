import { stat } from "node:fs/promises";
import { intersects, satisfies, valid, validRange } from "semver";
import { DoctorFault, entries, field, packageName, record, text } from "./data.mjs";
import { validateConfig } from "./configuration.mjs";

const ecosystem = new Map([
  ["jquery-ui", "JQS_JQUERY_UI"],
  ["jquery-mobile", "JQS_JQUERY_MOBILE"],
  ["jquery-migrate", "JQS_JQUERY_MIGRATE"],
]);

function version(value) {
  return typeof value === "string" && value.length <= 256 ? valid(value) : null;
}

function range(value) {
  return typeof value === "string" && value.length <= 256 ? validRange(value) : null;
}

function dependency(manifest, name) {
  for (const group of [
    "dependencies",
    "devDependencies",
    "optionalDependencies",
    "peerDependencies",
  ]) {
    const value = field(field(manifest, group), name);
    if (value !== undefined) return value;
  }
  return undefined;
}

function nearest(records, directory, name, kind) {
  let path = directory;
  for (;;) {
    const candidate = path ? `${path}/node_modules/${name}` : `node_modules/${name}`;
    const found = records.find(
      (item) =>
        item.name === name &&
        item.kind === kind &&
        (item.location === candidate || item.aliases?.includes(candidate)),
    );
    if (found) return found;
    if (!path) return undefined;
    path = path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "";
  }
}

function resolveDependency(records, workspace, name, kind = "installed") {
  const found = nearest(records, workspace.path, name, kind);
  if (found || kind === "installed") return found;
  const declared = dependency(workspace.manifest, name);
  return records.find(
    (item) =>
      item.name === name &&
      item.kind === "lock" &&
      (item.consumers?.includes(workspace.path || ".") ||
        item.selectors?.some(
          (selector) =>
            selector === `${name}@${declared}` || selector === `${name}@npm:${declared}`,
        )),
  );
}

function evidence(item) {
  return { path: item.path, kind: item.kind, package: item.name, observed: version(item.version) };
}

function packageRanges(contract) {
  return new Map([
    ["jquery-star", contract.package],
    ["jquery", contract.jquery],
    ["@hotwired/turbo", contract.bridges.turbo],
    ["htmx.org", contract.bridges.htmx],
  ]);
}

function declaredRanges(packages, ranges, emit) {
  for (const item of packages) {
    if (item.kind !== "manifest" || !ranges.has(item.name)) continue;
    const declared = range(item.declared);
    if (!declared) emit("JQS_METADATA_UNKNOWN", { ...evidence(item), observed: null });
    else if (!intersects(declared, ranges.get(item.name)))
      emit("JQS_DECLARED_RANGE", {
        ...evidence(item),
        observed: declared,
        expected: ranges.get(item.name),
      });
  }
}

function consumerVersions(discovery, ranges, emit) {
  for (const workspace of discovery.roots) {
    if (
      dependency(workspace.manifest, "jquery-star") === undefined &&
      field(workspace.manifest, "name") !== "jquery-star"
    )
      continue;
    for (const [name, expected] of ranges) {
      const installed = resolveDependency(discovery.packages, workspace, name);
      const locked = resolveDependency(discovery.packages, workspace, name, "lock");
      const selected = installed ?? locked;
      if (!selected) {
        if (name === "jquery" || name === "jquery-star")
          emit("JQS_METADATA_UNKNOWN", {
            path: workspace.path ? `${workspace.path}/package.json` : "package.json",
            kind: "unknown",
            package: name,
          });
        continue;
      }
      const actual = version(selected.version);
      if (!actual) emit("JQS_METADATA_UNKNOWN", evidence(selected));
      else if (!satisfies(actual, expected))
        emit("JQS_PACKAGE_VERSION", { ...evidence(selected), expected });
      if (installed && locked && version(installed.version) !== version(locked.version))
        emit("JQS_RESOLUTION_DRIFT", {
          ...evidence(installed),
          expected: version(locked.version),
        });
    }
  }
}

function duplicates(packages, emit) {
  for (const name of ["jquery-star", "jquery"]) {
    const instances = packages.filter((item) => item.name === name && item.kind === "installed");
    const versions = new Set(
      packages
        .filter((item) => item.name === name && item.kind !== "manifest")
        .map((item) => version(item.version))
        .filter(Boolean),
    );
    if (instances.length > 1 || versions.size > 1)
      emit("JQS_PACKAGE_DUPLICATE", {
        path: "package.json",
        kind: instances.length > 0 ? "installed" : "lock",
        package: name,
        observed: `${instances.length} installed locations; ${versions.size} resolved versions`,
      });
  }
}

function peersAndPlugins(packages, contract, emit) {
  for (const item of packages.filter((entry) => entry.kind === "installed")) {
    for (const [name, declared] of entries(field(item.metadata, "peerDependencies"))) {
      if (!["jquery", "jquery-star", "@hotwired/turbo", "htmx.org"].includes(name)) continue;
      const peer = nearest(packages, item.location, name, "installed");
      const expected = range(declared);
      const actual = version(peer?.version);
      if (peer && expected && actual && !satisfies(actual, expected))
        emit("JQS_PEER_INCOMPATIBLE", {
          ...evidence(item),
          observed: actual,
          expected,
        });
    }
    const api = field(field(item.metadata, "jqstar"), "pluginApiVersion");
    if (api === undefined) continue;
    const expected = range(api);
    if (!expected) emit("JQS_METADATA_UNKNOWN", evidence(item));
    else if (!satisfies(contract.pluginApi, expected))
      emit("JQS_PLUGIN_API", {
        ...evidence(item),
        kind: "plugin-metadata",
        observed: expected,
        expected: contract.pluginApi,
      });
  }
}

function configVersion(config, emit) {
  if (config === undefined) {
    emit("JQS_METADATA_UNKNOWN", { path: "jquery-star.json", kind: "unknown" });
    return;
  }
  if (!record(config)) throw new DoctorFault("JQS_INPUT_INVALID", "jquery-star.json");
  const value = field(config, "configVersion");
  if (value === undefined || value === 0)
    emit("JQS_CONFIG_VERSION", {
      path: "jquery-star.json",
      kind: "config-metadata",
      observed: "0",
      expected: "1",
    });
  else if (value !== 1)
    emit("JQS_CONFIG_UNSUPPORTED", {
      path: "jquery-star.json",
      kind: "config-metadata",
      observed: null,
      expected: "0 or 1",
    });
  if (value === undefined || value === 0 || value === 1) validateConfig(config);
}

function ownership(discovery, emit) {
  const value = discovery.ownership;
  if (value === undefined) return;
  if (
    !record(value) ||
    field(value, "schema") !== "jqstar-registry-ownership/1" ||
    !version(field(value, "version")) ||
    value.version.length > 64 ||
    field(value, "package") !== "jquery-star" ||
    !record(field(value, "configuration")) ||
    Object.keys(value).some(
      (key) => !["schema", "package", "version", "configuration"].includes(key),
    ) ||
    Object.keys(value.configuration).some((key) => !["output", "blocksOutput"].includes(key))
  )
    throw new DoctorFault("JQS_INPUT_INVALID", ".jqstar-ownership.json");
  validateConfig(value.configuration);
  const mismatch = ["output", "blocksOutput"].some(
    (key) => field(value.configuration, key) !== field(discovery.config, key),
  );
  if (mismatch)
    emit("JQS_OWNERSHIP_MISMATCH", { path: ".jqstar-ownership.json", kind: "ownership-metadata" });
}

export function evaluate(discovery, rules, options, emit) {
  const contract = rules.compatibility;
  if (!satisfies(options.nodeVersion, contract.node))
    emit("JQS_NODE_INCOMPATIBLE", {
      path: ".",
      kind: "node-version",
      observed: version(options.nodeVersion),
      expected: contract.node,
    });
  if (options.today > rules.reviewAfter) emit("JQS_RULES_EXPIRED", { path: ".", kind: "rules" });
  for (const workspace of discovery.roots) {
    const manager = field(workspace.manifest, "packageManager");
    if (typeof manager !== "string" || !manager.startsWith("npm@")) continue;
    const npm = version(manager.slice(4));
    if (npm && !satisfies(npm, contract.npmForReleaseConstruction))
      emit("JQS_TOOLING_RANGE", {
        path: workspace.path ? `${workspace.path}/package.json` : "package.json",
        kind: "manifest",
        observed: npm,
        expected: contract.npmForReleaseConstruction,
      });
  }
  const ranges = packageRanges(contract);
  declaredRanges(discovery.packages, ranges, emit);
  consumerVersions(discovery, ranges, emit);
  duplicates(discovery.packages, emit);
  peersAndPlugins(discovery.packages, contract, emit);
  for (const item of discovery.packages) {
    const code = ecosystem.get(item.name);
    if (code)
      emit(code, { ...evidence(item), observed: version(item.version) ?? range(item.declared) });
  }
  configVersion(discovery.config, emit);
  ownership(discovery, emit);
  emit("JQS_RUNTIME_UNKNOWN", { path: ".", kind: "unknown" });
}

function normalizedEntry(input) {
  if (input === "jquery-star" || input === ".") return ".";
  if (typeof input !== "string") return undefined;
  return input.startsWith("jquery-star/") ? `.${input.slice("jquery-star".length)}` : input;
}

function exportTarget(metadata, subpath, format) {
  if (format === "umd") return subpath === "." ? field(metadata, "main") : undefined;
  const exported = field(field(metadata, "exports"), subpath);
  if (typeof exported === "string") return exported;
  const branch = field(exported, format === "commonjs" ? "require" : "import");
  return typeof branch === "string" ? branch : field(branch, "default");
}

export async function checkEntrypoints(reader, discovery, rules, options, emit) {
  for (const input of options.entrypoints) {
    const subpath = normalizedEntry(input);
    const definition = rules.compatibility.entrypoints.find((entry) => entry.subpath === subpath);
    if (!definition || !definition.formats.includes(options.format)) {
      emit("JQS_ENTRYPOINT_UNAVAILABLE", {
        path: "package.json",
        kind: "explicit-input",
        observed: definition?.subpath ?? null,
      });
      continue;
    }
    emit("JQS_ENTRYPOINT_USE", {
      path: "package.json",
      kind: "explicit-input",
      observed: definition.subpath,
      expected: options.format,
    });
    if (definition.deprecated)
      emit("JQS_ENTRYPOINT_DEPRECATED", {
        path: "package.json",
        kind: "explicit-input",
        observed: definition.subpath,
      });
    for (const workspace of discovery.roots) {
      const installed = resolveDependency(discovery.packages, workspace, "jquery-star");
      if (!installed) {
        emit("JQS_METADATA_UNKNOWN", {
          path: "package.json",
          kind: "unknown",
          package: "jquery-star",
        });
        continue;
      }
      const target = exportTarget(installed.metadata, subpath, options.format);
      if (!text(target) || !target.startsWith("./")) {
        emit("JQS_ENTRYPOINT_UNAVAILABLE", {
          ...evidence(installed),
          expected: definition.subpath,
        });
        continue;
      }
      const actual = await reader.path(`${installed.location}/${target.slice(2)}`);
      if (!actual || !(await stat(actual)).isFile())
        emit("JQS_ARTIFACT_IDENTITY", { ...evidence(installed), expected: definition.subpath });
    }
  }
  for (const installed of discovery.packages.filter((item) => item.kind === "installed")) {
    if (
      ["jquery", "jquery-star"].includes(installed.requestedName) &&
      field(installed.metadata, "name") !== installed.requestedName
    )
      emit("JQS_ARTIFACT_IDENTITY", evidence(installed));
    if (installed.name === "jquery-star" && !version(installed.version))
      emit("JQS_ARTIFACT_IDENTITY", evidence(installed));
  }
}

export async function migrateSummary(reader, path, emit) {
  if (!path) return;
  const value = await reader.json(path, true);
  const allowed = ["api", "event", "selector", "ajax", "css", "data", "other"];
  if (
    !record(value) ||
    field(value, "schema") !== "jqstar-migrate-summary/1" ||
    !version(value.jqueryVersion) ||
    !version(value.migrateVersion) ||
    !Array.isArray(value.categories) ||
    value.categories.length > allowed.length ||
    Object.keys(value).some(
      (key) => !["schema", "jqueryVersion", "migrateVersion", "categories"].includes(key),
    )
  )
    throw new DoctorFault("JQS_INPUT_INVALID", path);
  const seen = new Set();
  for (const item of value.categories) {
    if (
      !record(item) ||
      Object.keys(item).length !== 2 ||
      !allowed.includes(item.category) ||
      seen.has(item.category) ||
      !Number.isSafeInteger(item.count) ||
      item.count < 0 ||
      item.count > 1000000
    )
      throw new DoctorFault("JQS_INPUT_INVALID", path);
    seen.add(item.category);
    if (item.count > 0)
      emit("JQS_MIGRATE_SUMMARY", {
        path,
        kind: "user-summary",
        observed: `${item.category}: ${item.count}`,
      });
  }
}

export function safePackage(value) {
  return packageName(value) ?? null;
}

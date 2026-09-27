import { lstat, realpath } from "node:fs/promises";
import { resolve } from "node:path";
import {
  canonical,
  DoctorFault,
  field,
  MetadataReader,
  parseJSON,
  portablePath,
  record,
  sha256,
  text,
} from "./data.mjs";

export const configName = "jquery-star.json";

export function validateConfig(value) {
  const keys = ["$schema", "output", "blocksOutput", "registry", "configVersion"];
  if (!record(value) || Object.keys(value).some((key) => !keys.includes(key)))
    throw new DoctorFault("JQS_INPUT_INVALID", configName);
  for (const key of ["output", "blocksOutput"]) {
    const part = field(value, key);
    if (part === undefined && key === "blocksOutput") continue;
    if (!text(part) || !part.trim()) throw new DoctorFault("JQS_INPUT_INVALID", configName);
    portablePath(part, true);
  }
  for (const key of ["$schema", "registry"]) {
    const part = field(value, key);
    if (part !== undefined && (!text(part) || !part.trim()))
      throw new DoctorFault("JQS_INPUT_INVALID", configName);
  }
  const version = field(value, "configVersion");
  if (version !== undefined && version !== 0 && version !== 1)
    throw new DoctorFault("JQS_CONFIG_UNSUPPORTED", configName);
  return value;
}

export function identity(stats) {
  return { device: stats.dev, inode: stats.ino };
}

export async function rootIdentity(root) {
  const stats = await lstat(root);
  if (!stats.isDirectory() || stats.isSymbolicLink() || (await realpath(root)) !== root)
    throw new DoctorFault("JQS_PATH_UNSAFE");
  return { path: root, ...identity(stats) };
}

export async function verifyRoot(root) {
  if (canonical(await rootIdentity(root.path)) !== canonical(root))
    throw new DoctorFault("JQS_MIGRATION_CONFLICT", configName);
}

export async function readConfigFile(root, limits, name = configName) {
  const path = resolve(root, portablePath(name));
  const before = await lstat(path).catch(() => {
    throw new DoctorFault("JQS_INPUT_INVALID", name);
  });
  if (!before.isFile() || before.isSymbolicLink()) throw new DoctorFault("JQS_PATH_UNSAFE", name);
  const reader = new MetadataReader(root, limits);
  const source = await reader.read(name, true);
  const after = await lstat(path);
  if (
    canonical(identity(before)) !== canonical(identity(after)) ||
    before.size !== after.size ||
    before.mtimeMs !== after.mtimeMs
  )
    throw new DoctorFault("JQS_MIGRATION_CONFLICT", name);
  const data = validateConfig(parseJSON(source, name));
  return {
    source,
    data,
    mode: before.mode & 0o644,
    rawMode: before.mode & 0o7777,
    identity: identity(before),
    sha256: sha256(source),
    canonicalSha256: sha256(canonical(data)),
  };
}

export function configPlan(root, before) {
  const from = before.data.configVersion ?? 0;
  const noop = from === 1;
  const next = noop ? before.data : { ...before.data, configVersion: 1 };
  const source = noop ? before.source : `${JSON.stringify(next, null, 2)}\n`;
  const prefix = `${configName}.jqstar-${before.sha256}`;
  return {
    schema: "jqstar-config-plan/1",
    action: noop ? "no-op" : "upgrade-config",
    root,
    target: configName,
    from,
    to: 1,
    before: {
      sha256: before.sha256,
      canonicalSha256: before.canonicalSha256,
      mode: before.mode,
      rawMode: before.rawMode ?? before.mode,
      identity: before.identity,
    },
    after: { sha256: sha256(source), canonicalSha256: sha256(canonical(next)), mode: before.mode },
    operations: noop
      ? []
      : [
          {
            op: Object.hasOwn(before.data, "configVersion") ? "replace" : "add",
            path: "/configVersion",
            value: 1,
          },
        ],
    backup: noop ? null : `${prefix}.backup`,
    journal: noop ? null : `${prefix}.journal.json`,
    rollback: noop
      ? null
      : ["jqstar", "doctor", "--rollback", `${prefix}.journal.json`, "--cwd", root.path],
  };
}

function digest(value) {
  return typeof value === "string" && /^[a-f0-9]{64}$/u.test(value);
}

export function validatePlan(plan, root) {
  const keys = [
    "schema",
    "action",
    "root",
    "target",
    "from",
    "to",
    "before",
    "after",
    "operations",
    "backup",
    "journal",
    "rollback",
  ];
  if (
    !record(plan) ||
    Object.keys(plan).length !== keys.length ||
    Object.keys(plan).some((key) => !keys.includes(key)) ||
    plan.schema !== "jqstar-config-plan/1" ||
    plan.target !== configName ||
    plan.to !== 1 ||
    ![0, 1].includes(plan.from) ||
    canonical(plan.root) !== canonical(root)
  )
    throw new DoctorFault("JQS_MIGRATION_CONFLICT", configName);
  for (const key of ["before", "after"]) {
    const value = plan[key];
    const expectedKeys =
      key === "before"
        ? "canonicalSha256,identity,mode,rawMode,sha256"
        : "canonicalSha256,mode,sha256";
    if (
      !record(value) ||
      Object.keys(value).sort().join() !== expectedKeys ||
      !digest(value.sha256) ||
      !digest(value.canonicalSha256) ||
      !Number.isInteger(value.mode) ||
      value.mode < 0 ||
      (value.mode & ~0o644) !== 0
    )
      throw new DoctorFault("JQS_INPUT_INVALID", configName);
  }
  if (
    plan.before.mode !== plan.after.mode ||
    !Number.isInteger(plan.before.rawMode) ||
    plan.before.rawMode < 0 ||
    plan.before.rawMode > 0o7777 ||
    (plan.before.rawMode & 0o644) !== plan.before.mode ||
    !record(plan.before.identity) ||
    Object.keys(plan.before.identity).sort().join() !== "device,inode" ||
    !Number.isSafeInteger(plan.before.identity.device) ||
    !Number.isSafeInteger(plan.before.identity.inode) ||
    plan.before.identity.device < 0 ||
    plan.before.identity.inode < 0
  )
    throw new DoctorFault("JQS_INPUT_INVALID", configName);
  if (plan.from === 1) {
    if (
      plan.action !== "no-op" ||
      plan.backup !== null ||
      plan.journal !== null ||
      plan.rollback !== null ||
      canonical(plan.operations) !== "[]" ||
      plan.before.sha256 !== plan.after.sha256 ||
      plan.before.canonicalSha256 !== plan.after.canonicalSha256
    )
      throw new DoctorFault("JQS_INPUT_INVALID", configName);
    return plan;
  }
  const prefix = `${configName}.jqstar-${plan.before.sha256}`;
  if (
    plan.action !== "upgrade-config" ||
    plan.backup !== `${prefix}.backup` ||
    plan.journal !== `${prefix}.journal.json` ||
    !Array.isArray(plan.operations) ||
    plan.operations.length !== 1
  )
    throw new DoctorFault("JQS_INPUT_INVALID", configName);
  const operation = plan.operations[0];
  if (
    !record(operation) ||
    Object.keys(operation).sort().join() !== "op,path,value" ||
    !["add", "replace"].includes(operation.op) ||
    operation.path !== "/configVersion" ||
    operation.value !== 1 ||
    canonical(plan.rollback) !==
      canonical(["jqstar", "doctor", "--rollback", plan.journal, "--cwd", root.path])
  )
    throw new DoctorFault("JQS_INPUT_INVALID", configName);
  return plan;
}

export function upgradedSource(before) {
  return `${JSON.stringify({ ...before.data, configVersion: 1 }, null, 2)}\n`;
}

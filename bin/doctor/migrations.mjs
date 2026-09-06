import { constants } from "node:fs";
import { lstat, open, rename, unlink } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import {
  canonical,
  DoctorFault,
  MetadataReader,
  portablePath,
  projectRoot,
  record,
} from "./data.mjs";
import {
  configName,
  configPlan,
  identity,
  readConfigFile,
  rootIdentity,
  upgradedSource,
  validatePlan,
  verifyRoot,
} from "./configuration.mjs";

function conflict() {
  return new DoctorFault("JQS_MIGRATION_CONFLICT", configName);
}

async function exclusive(root, name, source, mode, options = {}) {
  await verifyRoot(root);
  let handle;
  let owned;
  let complete = false;
  try {
    handle = await open(
      resolve(root.path, name),
      constants.O_WRONLY | constants.O_CREAT | constants.O_EXCL | (constants.O_NOFOLLOW ?? 0),
      0o600,
    );
    owned = identity(await handle.stat());
    await options.at?.(`${options.role}-opened`);
    await handle.writeFile(source, "utf8");
    await handle.chmod(mode);
    await options.at?.(`${options.role}-written`);
    await handle.sync();
    complete = true;
    return owned;
  } catch (error) {
    if (error?.code === "EEXIST") throw conflict();
    throw new DoctorFault("JQS_MIGRATION_RECOVERY", configName);
  } finally {
    await handle?.close();
    if (!complete && options.removeOnFailure) await removeOwned(root, name, owned);
  }
}

async function removeOwned(root, name, ownedIdentity) {
  if (!ownedIdentity) return;
  await verifyRoot(root);
  const path = resolve(root.path, name);
  const current = await lstat(path).catch((error) => {
    if (error?.code === "ENOENT") return undefined;
    throw error;
  });
  if (
    current &&
    current.isFile() &&
    !current.isSymbolicLink() &&
    canonical(identity(current)) === canonical(ownedIdentity)
  )
    await unlink(path);
}

async function syncDirectory(root) {
  if (process.platform === "win32") return;
  const directory = await open(root.path, constants.O_RDONLY);
  try {
    await directory.sync();
  } finally {
    await directory.close();
  }
}

async function ensureCurrent(root, limits, expected) {
  await verifyRoot(root);
  const current = await readConfigFile(root.path, limits);
  if (
    current.sha256 !== expected.sha256 ||
    canonical(current.identity) !== canonical(expected.identity) ||
    current.rawMode !== expected.rawMode
  )
    throw conflict();
}

async function replaceConfig(root, limits, source, current, mode, at) {
  const temporary = `${configName}.jqstar-${randomUUID()}.tmp`;
  let temporaryIdentity;
  try {
    await at("before-temporary");
    temporaryIdentity = await exclusive(root, temporary, source, mode, {
      at,
      role: "temporary",
      removeOnFailure: true,
    });
    await at("before-rename");
    await ensureCurrent(root, limits, current);
    const temporaryState = await readConfigFile(root.path, limits, temporary);
    if (
      temporaryState.source !== source ||
      canonical(temporaryState.identity) !== canonical(temporaryIdentity)
    )
      throw conflict();
    await verifyRoot(root);
    await rename(resolve(root.path, temporary), resolve(root.path, configName));
    temporaryIdentity = undefined;
    await syncDirectory(root);
    await at("after-rename");
  } finally {
    await removeOwned(root, temporary, temporaryIdentity);
  }
}

async function locked(root, action) {
  const name = `${configName}.jqstar-lock`;
  const owned = await exclusive(
    root,
    name,
    `${JSON.stringify({ schema: "jqstar-config-lock/1", pid: process.pid })}\n`,
    0o600,
    { removeOnFailure: true },
  );
  try {
    return await action();
  } finally {
    await removeOwned(root, name, owned);
  }
}

function outcome(action, plan) {
  return {
    schema: "jqstar-config-result/1",
    action,
    target: plan.target,
    root: plan.root.path,
    beforeSha256: plan.before.sha256,
    afterSha256: plan.after.sha256,
    backup: plan.backup,
    journal: plan.journal,
    rollback: plan.rollback,
  };
}

async function readPlan(root, rules, path) {
  const reader = new MetadataReader(root.path, rules.limits);
  return validatePlan(await reader.json(portablePath(path), true), root);
}

async function applyPlan(root, rules, plan, at) {
  const initial = await readConfigFile(root.path, rules.limits);
  if (
    initial.sha256 === plan.after.sha256 &&
    initial.canonicalSha256 === plan.after.canonicalSha256 &&
    initial.data.configVersion === 1
  )
    return outcome("no-op", plan);
  if (canonical(configPlan(root, initial)) !== canonical(plan)) throw conflict();
  return locked(root, async () => {
    await ensureCurrent(root, rules.limits, initial);
    await at("before-backup");
    await ensureCurrent(root, rules.limits, initial);
    await exclusive(root, plan.backup, initial.source, 0o600, { at, role: "backup" });
    await at("before-journal");
    await verifyRoot(root);
    await exclusive(
      root,
      plan.journal,
      `${JSON.stringify({ schema: "jqstar-config-journal/1", plan }, null, 2)}\n`,
      0o600,
      { at, role: "journal" },
    );
    await at("before-apply");
    await replaceConfig(root, rules.limits, upgradedSource(initial), initial, plan.after.mode, at);
    return outcome("applied", plan);
  });
}

async function readJournal(root, rules, path) {
  const reader = new MetadataReader(root.path, rules.limits);
  const name = portablePath(path);
  const journal = await reader.json(name, true);
  if (
    !record(journal) ||
    journal.schema !== "jqstar-config-journal/1" ||
    Object.keys(journal).sort().join() !== "plan,schema"
  )
    throw new DoctorFault("JQS_INPUT_INVALID", name);
  const plan = validatePlan(journal.plan, root);
  if (name !== plan.journal || plan.action !== "upgrade-config") throw conflict();
  return plan;
}

async function rollback(root, rules, plan, at) {
  const backup = await readConfigFile(root.path, rules.limits, plan.backup);
  if (
    backup.sha256 !== plan.before.sha256 ||
    backup.canonicalSha256 !== plan.before.canonicalSha256
  )
    throw conflict();
  const restoredPlan = configPlan(root, {
    ...backup,
    mode: plan.before.mode,
    rawMode: plan.before.rawMode,
    identity: plan.before.identity,
  });
  if (canonical(restoredPlan) !== canonical(plan)) throw conflict();
  const initial = await readConfigFile(root.path, rules.limits);
  if (initial.sha256 === plan.before.sha256) return outcome("no-op", plan);
  if (
    initial.sha256 !== plan.after.sha256 ||
    initial.canonicalSha256 !== plan.after.canonicalSha256
  )
    throw conflict();
  return locked(root, async () => {
    await at("before-rollback");
    await ensureCurrent(root, rules.limits, initial);
    const reread = await readConfigFile(root.path, rules.limits, plan.backup);
    if (
      reread.sha256 !== backup.sha256 ||
      canonical(reread.identity) !== canonical(backup.identity)
    )
      throw conflict();
    await replaceConfig(root, rules.limits, backup.source, initial, plan.before.mode, at);
    return outcome("rolled-back", plan);
  });
}

export async function runMigration(options, rules, hooks = {}) {
  const root = await rootIdentity(await projectRoot(options.cwd));
  let plan;
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
  };
  const signals = ["SIGINT", "SIGTERM", "SIGHUP"];
  const at = async (stage) => {
    if (interrupted) throw new DoctorFault("JQS_MIGRATION_RECOVERY", configName);
    await hooks.at?.(stage);
    if (interrupted) throw new DoctorFault("JQS_MIGRATION_RECOVERY", configName);
  };
  for (const signal of signals) process.on(signal, interrupt);
  try {
    if (options.upgradeConfig)
      return configPlan(root, await readConfigFile(root.path, rules.limits));
    if (options.apply) {
      plan = await readPlan(root, rules, options.apply);
      return await applyPlan(root, rules, plan, at);
    }
    plan = await readJournal(root, rules, options.rollback);
    return await rollback(root, rules, plan, at);
  } catch (error) {
    const fault =
      error instanceof DoctorFault ? error : new DoctorFault("JQS_MIGRATION_RECOVERY", configName);
    fault.recovery = {
      target: configName,
      backup: plan?.backup ?? null,
      journal: plan?.journal ?? options.rollback ?? null,
      instruction:
        "Retain recovery files. Re-read the current configuration and hashes before applying or rolling back. Remove an abandoned lock only after confirming its process has stopped.",
    };
    throw fault;
  } finally {
    for (const signal of signals) process.off(signal, interrupt);
  }
}

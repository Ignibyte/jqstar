// @vitest-environment node
import {
  chmod,
  lstat,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  utimes,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  readConfigFile,
  rootIdentity,
  validatePlan,
  verifyRoot,
} from "../bin/doctor/configuration.mjs";
import { runMigration } from "../bin/doctor/migrations.mjs";
import { runDoctor } from "../bin/doctor/index.mjs";
import { MetadataReader } from "../bin/doctor/data.mjs";
import { createSchemaValidator } from "../scripts/quality/validate-json.mjs";

const rules = JSON.parse(await readFile("bin/doctor/compatibility.json", "utf8"));
const validate = createSchemaValidator(
  JSON.parse(await readFile("schema/doctor.schema.json", "utf8")),
);
const roots = [];
const original = '{ "output": "components/jquery-star", "registry": "private-config-canary" }\n';

async function fixture(source = original) {
  const root = await realpath(await mkdtemp(join(tmpdir(), "jqstar-migration-test-")));
  roots.push(root);
  await writeFile(join(root, "jquery-star.json"), source, { mode: 0o600 });
  return root;
}

async function plan(root) {
  const value = await runMigration({ cwd: root, upgradeConfig: true }, rules);
  expect(validate(value), JSON.stringify(validate.errors)).toBe(true);
  await writeFile(join(root, "plan.json"), JSON.stringify(value));
  return value;
}

async function noTransientFiles(root) {
  expect(
    (await readdir(root)).filter((name) => name.endsWith(".tmp") || name.endsWith(".jqstar-lock")),
  ).toEqual([]);
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("known configuration upgrades", () => {
  it("rejects a replaced root identity and unsafe configuration file types", async () => {
    const root = await fixture();
    const identity = await rootIdentity(root);
    await expect(verifyRoot(identity)).resolves.toBeUndefined();
    await expect(verifyRoot({ ...identity, inode: identity.inode + 1 })).rejects.toMatchObject({
      code: "JQS_MIGRATION_CONFLICT",
    });

    const outside = await fixture('{"output":"outside"}');
    await symlink(outside, join(root, "linked-root"));
    await expect(rootIdentity(join(root, "linked-root"))).rejects.toMatchObject({
      code: "JQS_PATH_UNSAFE",
    });
    await expect(rootIdentity(join(root, "jquery-star.json"))).rejects.toMatchObject({
      code: "JQS_PATH_UNSAFE",
    });
    await expect(rootIdentity(`${root}/.`)).rejects.toMatchObject({
      code: "JQS_PATH_UNSAFE",
    });

    const linkedConfig = join(root, "linked-config.json");
    await symlink(join(outside, "jquery-star.json"), linkedConfig);
    await expect(readConfigFile(root, rules.limits, "linked-config.json")).rejects.toMatchObject({
      code: "JQS_PATH_UNSAFE",
    });
    await expect(readConfigFile(root, rules.limits, "absent.json")).rejects.toMatchObject({
      code: "JQS_INPUT_INVALID",
    });
    await mkdir(join(root, "directory.json"));
    await expect(readConfigFile(root, rules.limits, "directory.json")).rejects.toMatchObject({
      code: "JQS_PATH_UNSAFE",
    });
  });

  it.each(["identity", "size", "mtime"])(
    "detects a %s change between reading and rechecking the config file",
    async (change) => {
      const root = await fixture();
      const path = join(root, "jquery-star.json");
      const read = MetadataReader.prototype.read;
      const spy = vi.spyOn(MetadataReader.prototype, "read").mockImplementation(async function (
        ...args
      ) {
        const source = await read.apply(this, args);
        const stats = await lstat(path);
        if (change === "identity") {
          const replacement = join(root, "replacement.json");
          await writeFile(replacement, source);
          await utimes(replacement, stats.atimeMs / 1000, stats.mtimeMs / 1000);
          await rename(replacement, path);
          expect((await lstat(path)).mtimeMs).toBe(stats.mtimeMs);
        }
        if (change === "size") {
          await writeFile(path, `${source} `);
          await utimes(path, stats.atimeMs / 1000, stats.mtimeMs / 1000);
          expect((await lstat(path)).mtimeMs).toBe(stats.mtimeMs);
        }
        if (change === "mtime") {
          const later = new Date(stats.mtimeMs + 10_000);
          await utimes(path, later, later);
        }
        return source;
      });
      try {
        await expect(readConfigFile(root, rules.limits)).rejects.toMatchObject({
          code: "JQS_MIGRATION_CONFLICT",
        });
      } finally {
        spy.mockRestore();
      }
    },
  );

  it("reports a disappeared configuration as invalid input during its required read", async () => {
    const root = await fixture();
    const path = join(root, "jquery-star.json");
    const read = MetadataReader.prototype.read;
    const spy = vi.spyOn(MetadataReader.prototype, "read").mockImplementation(async function (
      ...args
    ) {
      await rm(path);
      return read.apply(this, args);
    });
    try {
      await expect(readConfigFile(root, rules.limits)).rejects.toMatchObject({
        code: "JQS_INPUT_INVALID",
      });
    } finally {
      spy.mockRestore();
    }
  });

  it("rejects tampered migration plans at the validation boundary", async () => {
    const root = await fixture();
    const value = await plan(root);
    expect(validatePlan(value, value.root)).toBe(value);
    const cases = [
      ["schema", (next) => (next.schema = "foreign"), "JQS_MIGRATION_CONFLICT"],
      ["target", (next) => (next.target = "other.json"), "JQS_MIGRATION_CONFLICT"],
      ["root", (next) => (next.root.inode += 1), "JQS_MIGRATION_CONFLICT"],
      ["version", (next) => (next.to = 2), "JQS_MIGRATION_CONFLICT"],
      ["extra field", (next) => (next.secret = "unexpected"), "JQS_MIGRATION_CONFLICT"],
      ["missing field", (next) => delete next.action, "JQS_MIGRATION_CONFLICT"],
      [
        "substituted field",
        (next) => {
          delete next.action;
          next.secret = "unexpected";
        },
        "JQS_MIGRATION_CONFLICT",
      ],
      ["source digest", (next) => (next.before.sha256 = "not-a-digest"), "JQS_INPUT_INVALID"],
      [
        "uppercase digest",
        (next) => (next.before.sha256 = next.before.sha256.toUpperCase()),
        "JQS_INPUT_INVALID",
      ],
      [
        "long digest",
        (next) => (next.before.sha256 = `${next.before.sha256}a`),
        "JQS_INPUT_INVALID",
      ],
      [
        "prefixed digest",
        (next) => (next.after.sha256 = `a${next.after.sha256}`),
        "JQS_INPUT_INVALID",
      ],
      [
        "suffixed digest",
        (next) => (next.after.sha256 = `${next.after.sha256}a`),
        "JQS_INPUT_INVALID",
      ],
      [
        "coercible digest object",
        (next) => (next.after.sha256 = { toString: () => value.after.sha256 }),
        "JQS_INPUT_INVALID",
      ],
      [
        "result digest",
        (next) => (next.after.canonicalSha256 = "a".repeat(63)),
        "JQS_INPUT_INVALID",
      ],
      ["unsafe mode", (next) => (next.before.mode = 0o777), "JQS_INPUT_INVALID"],
      ["missing source digest", (next) => delete next.before.sha256, "JQS_INPUT_INVALID"],
      ["extra result field", (next) => (next.after.extra = true), "JQS_INPUT_INVALID"],
      ["invalid mode", (next) => (next.after.mode = "0600"), "JQS_INPUT_INVALID"],
      ["negative mode", (next) => (next.after.mode = -1), "JQS_INPUT_INVALID"],
      ["mode mismatch", (next) => (next.after.mode = 0o644), "JQS_INPUT_INVALID"],
      ["fractional raw mode", (next) => (next.before.rawMode = 1.5), "JQS_INPUT_INVALID"],
      ["negative raw mode", (next) => (next.before.rawMode = -1), "JQS_INPUT_INVALID"],
      [
        "negative raw mode with matching safe bits",
        (next) => {
          next.before.mode = 0o644;
          next.after.mode = 0o644;
          next.before.rawMode = -1;
        },
        "JQS_INPUT_INVALID",
      ],
      ["raw mode", (next) => (next.before.rawMode = 0o10000), "JQS_INPUT_INVALID"],
      [
        "out-of-range raw mode with matching safe bits",
        (next) => {
          next.before.mode = 0;
          next.after.mode = 0;
          next.before.rawMode = 0o10000;
        },
        "JQS_INPUT_INVALID",
      ],
      ["raw mode mismatch", (next) => (next.before.rawMode = 0o644), "JQS_INPUT_INVALID"],
      ["extra file identity", (next) => (next.before.identity.extra = 1), "JQS_INPUT_INVALID"],
      ["fractional device", (next) => (next.before.identity.device = 1.5), "JQS_INPUT_INVALID"],
      ["negative device", (next) => (next.before.identity.device = -1), "JQS_INPUT_INVALID"],
      ["file identity", (next) => (next.before.identity.inode = -1), "JQS_INPUT_INVALID"],
      ["action", (next) => (next.action = "no-op"), "JQS_INPUT_INVALID"],
      ["backup", (next) => (next.backup = "different.backup"), "JQS_INPUT_INVALID"],
      ["journal", (next) => (next.journal = "different.journal"), "JQS_INPUT_INVALID"],
      [
        "journal with matching recovery command",
        (next) => {
          next.journal = "different.journal";
          next.rollback[3] = next.journal;
        },
        "JQS_INPUT_INVALID",
      ],
      ["missing operation", (next) => (next.operations = []), "JQS_INPUT_INVALID"],
      [
        "extra operation",
        (next) => next.operations.push({ op: "add", path: "/configVersion", value: 1 }),
        "JQS_INPUT_INVALID",
      ],
      ["nonarray operation", (next) => (next.operations = {}), "JQS_INPUT_INVALID"],
      ["operation type", (next) => (next.operations[0].op = "remove"), "JQS_INPUT_INVALID"],
      ["extra operation field", (next) => (next.operations[0].extra = true), "JQS_INPUT_INVALID"],
      ["operation path", (next) => (next.operations[0].path = "/output"), "JQS_INPUT_INVALID"],
      ["operation value", (next) => (next.operations[0].value = 0), "JQS_INPUT_INVALID"],
      ["recovery command", (next) => next.rollback.push("--force"), "JQS_INPUT_INVALID"],
    ];
    for (const [label, change, code] of cases) {
      const next = structuredClone(value);
      change(next);
      expect(() => validatePlan(next, value.root), label).toThrowError(code);
    }
    expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
    await noTransientFiles(root);
  });

  it("accepts zero mode and identity values at the plan boundary", async () => {
    const root = await fixture();
    const value = await plan(root);
    value.before.mode = 0;
    value.after.mode = 0;
    value.before.rawMode = 0;
    value.before.identity = { device: 0, inode: 0 };
    expect(validatePlan(value, value.root)).toBe(value);
    value.before.rawMode = 0o7777;
    value.before.mode = 0o644;
    value.after.mode = 0o644;
    value.before.identity = { inode: 0, device: 0 };
    value.operations = [{ value: 1, path: "/configVersion", op: "add" }];
    expect(validatePlan(value, value.root)).toBe(value);
  });

  it("uses a replacement operation for an explicit legacy version", async () => {
    const root = await fixture('{"output":"components","configVersion":0}');
    const value = await runMigration({ cwd: root, upgradeConfig: true }, rules);
    expect(value.operations).toEqual([{ op: "replace", path: "/configVersion", value: 1 }]);
    expect(validatePlan(value, value.root)).toBe(value);
  });

  it("rejects a no-op plan that would create recovery files or change its identity", async () => {
    const root = await fixture('{"output":"components","configVersion":1}');
    const value = await runMigration({ cwd: root, upgradeConfig: true }, rules);
    expect(validatePlan(value, value.root)).toBe(value);
    const changes = [
      (next) => (next.action = "upgrade-config"),
      (next) => (next.backup = "unexpected.backup"),
      (next) => (next.journal = "unexpected.journal"),
      (next) => (next.rollback = ["unexpected"]),
      (next) => (next.operations = [{ op: "replace", path: "/configVersion", value: 1 }]),
      (next) => (next.after.sha256 = "a".repeat(64)),
      (next) => (next.after.canonicalSha256 = "b".repeat(64)),
    ];
    for (const change of changes) {
      const next = structuredClone(value);
      change(next);
      expect(() => validatePlan(next, value.root)).toThrowError("JQS_INPUT_INVALID");
    }
    expect(await readdir(root)).toEqual(["jquery-star.json"]);
  });

  it("plans without writes, applies once, and restores exact original bytes and safe permissions", async () => {
    const root = await fixture();
    const before = await readdir(root);
    const planned = await runMigration({ cwd: root, upgradeConfig: true }, rules);
    expect(await readdir(root)).toEqual(before);
    expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
    expect(JSON.stringify(planned)).not.toContain("private-config-canary");
    const value = await plan(root);
    expect(planned).toEqual(value);
    const applied = await runMigration({ cwd: root, apply: "plan.json" }, rules);
    expect(validate(applied)).toBe(true);
    expect(applied.action).toBe("applied");
    expect(JSON.parse(await readFile(join(root, "jquery-star.json"), "utf8"))).toEqual({
      output: "components/jquery-star",
      registry: "private-config-canary",
      configVersion: 1,
    });
    expect(await readFile(join(root, value.backup), "utf8")).toBe(original);
    expect(
      JSON.stringify(JSON.parse(await readFile(join(root, value.journal), "utf8"))),
    ).not.toContain("private-config-canary");
    for (const path of ["jquery-star.json", value.backup, value.journal])
      expect((await lstat(join(root, path))).mode & 0o777).toBe(0o600);
    const files = await readdir(root);
    const identity = await lstat(join(root, "jquery-star.json"));
    expect((await runMigration({ cwd: root, apply: "plan.json" }, rules)).action).toBe("no-op");
    expect((await lstat(join(root, "jquery-star.json"))).ino).toBe(identity.ino);
    expect(await readdir(root)).toEqual(files);
    expect((await runMigration({ cwd: root, rollback: value.journal }, rules)).action).toBe(
      "rolled-back",
    );
    expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
    expect((await runMigration({ cwd: root, rollback: value.journal }, rules)).action).toBe(
      "no-op",
    );
    await noTransientFiles(root);
  });

  it("leaves explicit schema 1 unchanged and strips unsafe permission bits on an upgrade", async () => {
    const root = await fixture('{"output":"components","configVersion":1}');
    const before = await readFile(join(root, "jquery-star.json"), "utf8");
    const value = await runMigration({ cwd: root, upgradeConfig: true }, rules);
    expect(value).toMatchObject({ action: "no-op", operations: [], backup: null, journal: null });
    expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(before);
    await writeFile(join(root, "jquery-star.json"), original);
    await chmod(join(root, "jquery-star.json"), 0o666);
    await plan(root);
    await runMigration({ cwd: root, apply: "plan.json" }, rules);
    expect((await lstat(join(root, "jquery-star.json"))).mode & 0o777).toBe(0o644);
  });

  it.each([
    "before-backup",
    "backup-opened",
    "backup-written",
    "before-journal",
    "journal-opened",
    "journal-written",
    "before-apply",
    "before-temporary",
    "temporary-opened",
    "temporary-written",
    "before-rename",
  ])("preserves the original on injected %s failure", async (boundary) => {
    const root = await fixture();
    const value = await plan(root);
    await expect(
      runMigration({ cwd: root, apply: "plan.json" }, rules, {
        at(stage) {
          if (stage === boundary) throw new Error("private-failure-canary");
        },
      }),
    ).rejects.toMatchObject({
      code: "JQS_MIGRATION_RECOVERY",
      recovery: { target: "jquery-star.json", backup: value.backup, journal: value.journal },
    });
    expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
    await noTransientFiles(root);
  });

  it("retains usable recovery metadata after an error following atomic replacement", async () => {
    const root = await fixture();
    const value = await plan(root);
    await expect(
      runMigration({ cwd: root, apply: "plan.json" }, rules, {
        at(stage) {
          if (stage === "after-rename") throw new Error("private-failure-canary");
        },
      }),
    ).rejects.toMatchObject({ code: "JQS_MIGRATION_RECOVERY" });
    expect(JSON.parse(await readFile(join(root, "jquery-star.json"), "utf8")).configVersion).toBe(
      1,
    );
    expect((await runMigration({ cwd: root, rollback: value.journal }, rules)).action).toBe(
      "rolled-back",
    );
    expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
    await noTransientFiles(root);
  });

  it.each(["SIGINT", "SIGTERM", "SIGHUP"])(
    "cleans up an interrupted %s migration",
    async (signal) => {
      const root = await fixture();
      const value = await plan(root);
      const listeners = process.listenerCount(signal);
      await expect(
        runMigration({ cwd: root, apply: "plan.json" }, rules, {
          at(stage) {
            if (stage === "temporary-written") process.emit(signal);
          },
        }),
      ).rejects.toMatchObject({ code: "JQS_MIGRATION_RECOVERY" });
      expect(process.listenerCount(signal)).toBe(listeners);
      expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
      expect(await readFile(join(root, value.backup), "utf8")).toBe(original);
      await noTransientFiles(root);
    },
  );

  it("refuses a concurrent writer and reports validated rollback recovery paths", async () => {
    const root = await fixture();
    const value = await plan(root);
    await runMigration({ cwd: root, apply: "plan.json" }, rules, {
      async at(stage) {
        if (stage !== "before-backup") return;
        await expect(runMigration({ cwd: root, apply: "plan.json" }, rules)).rejects.toMatchObject({
          code: "JQS_MIGRATION_CONFLICT",
        });
      },
    });
    await writeFile(join(root, "jquery-star.json"), '{"output":"changed","configVersion":1}');
    await expect(runMigration({ cwd: root, rollback: value.journal }, rules)).rejects.toMatchObject(
      {
        code: "JQS_MIGRATION_CONFLICT",
        recovery: { backup: value.backup, journal: value.journal },
      },
    );
    await noTransientFiles(root);
  });

  it.each(["content", "identity", "mode", "unsafe-mode"])(
    "refuses stale plans after %s drift",
    async (change) => {
      const root = await fixture();
      await plan(root);
      if (change === "content")
        await writeFile(join(root, "jquery-star.json"), '{"output":"changed"}');
      if (change === "identity") {
        await writeFile(join(root, "replacement.json"), original, { mode: 0o600 });
        await rename(join(root, "replacement.json"), join(root, "jquery-star.json"));
      }
      if (change === "mode") await chmod(join(root, "jquery-star.json"), 0o644);
      if (change === "unsafe-mode") await chmod(join(root, "jquery-star.json"), 0o620);
      const before = await readFile(join(root, "jquery-star.json"), "utf8");
      await expect(runMigration({ cwd: root, apply: "plan.json" }, rules)).rejects.toMatchObject({
        code: "JQS_MIGRATION_CONFLICT",
      });
      expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(before);
      await noTransientFiles(root);
    },
  );

  it.each(["backup", "journal"])("never overwrites a preexisting %s", async (name) => {
    const root = await fixture();
    const value = await plan(root);
    await writeFile(join(root, value[name]), "existing-user-file");
    await expect(runMigration({ cwd: root, apply: "plan.json" }, rules)).rejects.toMatchObject({
      code: "JQS_MIGRATION_CONFLICT",
    });
    expect(await readFile(join(root, value[name]), "utf8")).toBe("existing-user-file");
    expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
    await noTransientFiles(root);
  });

  it("refuses a changed target or backup during rollback", async () => {
    for (const changed of ["target", "backup"]) {
      const root = await fixture();
      const value = await plan(root);
      await runMigration({ cwd: root, apply: "plan.json" }, rules);
      const path = changed === "target" ? "jquery-star.json" : value.backup;
      await writeFile(join(root, path), '{"output":"later-change"}');
      const before = await readFile(join(root, "jquery-star.json"), "utf8");
      await expect(
        runMigration({ cwd: root, rollback: value.journal }, rules),
      ).rejects.toMatchObject({ code: "JQS_MIGRATION_CONFLICT" });
      expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(before);
    }
  });

  it("rejects symlinks initially and immediately before replacement", async () => {
    const outside = await fixture('{"output":"outside"}');
    for (const late of [false, true]) {
      const root = await fixture();
      if (late) await plan(root);
      const replace = async () => {
        await rm(join(root, "jquery-star.json"));
        await symlink(join(outside, "jquery-star.json"), join(root, "jquery-star.json"));
      };
      if (!late) await replace();
      await expect(
        runMigration(
          late ? { cwd: root, apply: "plan.json" } : { cwd: root, upgradeConfig: true },
          rules,
          {
            async at(stage) {
              if (stage === "before-rename") await replace();
            },
          },
        ),
      ).rejects.toMatchObject({ code: "JQS_PATH_UNSAFE" });
      expect(await readFile(join(outside, "jquery-star.json"), "utf8")).toBe(
        '{"output":"outside"}',
      );
      await noTransientFiles(root);
    }
  });

  it.each(["../../package.json", "C:\\package.json", "\\\\server\\package.json"])(
    "refuses foreign migration targets %s",
    async (target) => {
      const root = await fixture();
      const value = await plan(root);
      await writeFile(join(root, "plan.json"), JSON.stringify({ ...value, target }));
      await expect(runMigration({ cwd: root, apply: "plan.json" }, rules)).rejects.toMatchObject({
        code: "JQS_MIGRATION_CONFLICT",
      });
      expect(await readFile(join(root, "jquery-star.json"), "utf8")).toBe(original);
    },
  );

  it("rejects unknown schema fields and returns value-free JSON failures", async () => {
    const root = await fixture('{"output":"components","secret":"private-config-canary"}');
    let stdout = "";
    const exit = await runDoctor(["doctor", "--upgrade-config", "--cwd", root, "--json"], {
      stdout: {
        write(value) {
          stdout += value;
        },
      },
      stderr: { write() {} },
    });
    expect(exit).toBe(2);
    expect(validate(JSON.parse(stdout)), JSON.stringify(validate.errors)).toBe(true);
    expect(stdout).not.toContain("private-config-canary");
    expect(JSON.parse(stdout).recovery.target).toBe("jquery-star.json");
  });
});

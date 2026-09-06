// @vitest-environment node
import {
  chmod,
  lstat,
  mkdtemp,
  readFile,
  readdir,
  realpath,
  rename,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { runMigration } from "../bin/doctor/migrations.mjs";
import { runDoctor } from "../bin/doctor/index.mjs";
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

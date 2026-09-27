// @vitest-environment node
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, stat, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterEach, expect, it } from "vitest";

const directories = [];
const instructions = await readFile(resolve("docs/SELF_HOSTING.md"), "utf8");
const operations = instructions
  .split("## Database operations\n")[1]
  .split("## Public traffic\n")[0];
const blocks = [...operations.matchAll(/```sh\n([\s\S]*?)```/gu)].map((match) => match[1]);

// Only service/account/network operations are substituted. Shell control flow, filesystem moves,
// modes and SQLite backup/recovery run for real, against temporary files and the documented blocks.
const dispatcher = String.raw`
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { appendFileSync } from 'node:fs';
import { basename, resolve } from 'node:path';
import { DatabaseSync, backup } from 'node:sqlite';
const command = basename(process.argv[1]);
let args = process.argv.slice(2);
const root = process.env.JQS_RUNBOOK_TEST_ROOT;
assert(root && root.includes('jqstar-recovery-'));
appendFileSync(resolve(root, 'commands.jsonl'), JSON.stringify({command, args}) + String.fromCharCode(10));
function run(executable, options = {}) {
  const result = spawnSync(executable, args, {stdio: 'inherit', ...options});
  if (result.error) throw result.error;
  process.exit(result.status ?? 1);
}
function local(path) {
  assert(resolve(path).startsWith(root + '/'), 'Operation escaped temporary database');
}
if (command === 'sudo') {
  if (args[0] === '-u') {
    assert.equal(args[1], 'jqstar');
    args = args.slice(2);
  }
  const executable = args.shift();
  assert(['sh', 'install', 'sqlite3'].includes(executable));
  run(executable);
}
if (command === 'systemctl') {
  assert.equal(args[1], 'jqstar');
  assert(['stop', 'start'].includes(args[0]));
  process.exit(process.env.JQS_RUNBOOK_TEST_FAIL === args[0] ? 41 : 0);
}
if (command === 'curl') {
  assert.deepEqual(args, ['--fail', '--silent', 'http://127.0.0.1:4173/health']);
  process.exit(0);
}
if (command === 'install') {
  // Record real owner/group arguments; avoid creating system accounts or changing local ownership.
  args = args.filter((arg, index, all) =>
    !['-o', '-g'].includes(arg) && !['-o', '-g'].includes(all[index - 1]));
  local(args.at(-1));
  if (!args.includes('-d')) local(args.at(-2));
  if (process.env.JQS_RUNBOOK_TEST_FAIL === 'install') process.exit(42);
}
if (command === 'mv') {
  args.forEach(local);
  if (process.env.JQS_RUNBOOK_TEST_FAIL === 'mv' && args[0].endsWith('-wal')) process.exit(43);
}
if (command === 'sqlite3') {
  local(args[0]);
  const destination = /^\.backup '([^']+)'$/u.exec(args[1])?.[1];
  assert(destination);
  local(destination);
  const database = new DatabaseSync(args[0]);
  await backup(database, destination);
  database.close();
  process.exit(0);
}
assert(['install', 'mv'].includes(command));
run(command, {env: {...process.env, PATH: process.env.JQS_RUNBOOK_TEST_PATH}});
`;

async function fixture({ abrupt = false } = {}) {
  const root = await mkdtemp(join(tmpdir(), "jqstar-recovery-"));
  directories.push(root);
  const state = join(root, "state");
  const backups = join(root, "backups");
  const bin = join(root, "bin");
  await Promise.all([state, backups, bin].map((path) => mkdir(path)));
  const executable = join(bin, "dispatcher.mjs");
  await writeFile(executable, `#!${process.execPath}\n${dispatcher}`, { mode: 0o700 });
  for (const command of ["sudo", "systemctl", "curl", "install", "mv", "sqlite3"])
    await symlink(executable, join(bin, command));
  const database = join(state, "projects.sqlite");
  const backup = join(backups, "projects-YYYY-MM-DD.sqlite");
  const result = spawnSync(
    process.execPath,
    [
      "--input-type=module",
      "-e",
      `
    import { DatabaseSync, backup } from 'node:sqlite';
    const database = new DatabaseSync(process.argv[1]);
    database.exec("PRAGMA journal_mode=WAL; CREATE TABLE proof(value TEXT); INSERT INTO proof VALUES ('at-backup')");
    await backup(database, process.argv[2]);
    database.exec("INSERT INTO proof VALUES ('after-backup')");
    if (process.argv[3] === 'clean') database.close();
    process.exit(0);
  `,
      database,
      backup,
      abrupt ? "abrupt" : "clean",
    ],
    { encoding: "utf8" },
  );
  expect(result.status, result.stderr).toBe(0);
  await writeFile(join(root, "commands.jsonl"), "");
  return { root, state, backups, bin, database, backup };
}

function execute(data, index, failure = "") {
  const script = blocks[index]
    .replaceAll("/var/lib/jqstar", data.state)
    .replaceAll("/var/backups/jqstar", data.backups);
  expect(script).not.toMatch(/\/var\/(?:lib|backups)\/jqstar/u);
  return spawnSync("sh", ["-c", script], {
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${data.bin}:${process.env.PATH}`,
      JQS_RUNBOOK_TEST_PATH: process.env.PATH,
      JQS_RUNBOOK_TEST_ROOT: data.root,
      JQS_RUNBOOK_TEST_FAIL: failure,
    },
  });
}

async function commands(data) {
  return (await readFile(join(data.root, "commands.jsonl"), "utf8"))
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function values(path) {
  const database = new DatabaseSync(path, { readOnly: true });
  try {
    return database
      .prepare("SELECT value FROM proof ORDER BY rowid")
      .all()
      .map((row) => row.value);
  } finally {
    database.close();
  }
}

afterEach(async () => {
  await Promise.all(
    directories.splice(0).map((path) => rm(path, { recursive: true, force: true })),
  );
});

it("backs up SQLite contents into a directory explicitly owned by the service account", async () => {
  const data = await fixture();
  const result = execute(data, 0);
  expect(result.status, result.stderr).toBe(0);
  const calls = await commands(data);
  expect(calls.find((call) => call.command === "install").args).toEqual([
    "-d",
    "-o",
    "jqstar",
    "-g",
    "jqstar",
    "-m",
    "0750",
    data.backups,
  ]);
  expect(
    calls.find((call) => call.command === "sudo" && call.args[0] === "-u").args.slice(0, 3),
  ).toEqual(["-u", "jqstar", "sqlite3"]);
  const output = (await readdir(data.backups)).find((name) => !name.includes("YYYY"));
  expect(values(join(data.backups, output))).toEqual(["at-backup", "after-backup"]);
  expect((await stat(data.backups)).mode & 0o777).toBe(0o750);
});

it.each([false, true])(
  "restores only backup data and archives the failed state after abrupt=%s shutdown",
  async (abrupt) => {
    const data = await fixture({ abrupt });
    if (abrupt) expect(await readdir(data.state)).toContain("projects.sqlite-wal");
    else expect(await readdir(data.state)).toEqual(["projects.sqlite"]);
    const result = execute(data, 1);
    expect(result.status, result.stderr).toBe(0);
    const archive = (await readdir(data.state)).find((name) => name.startsWith("failed."));
    expect(archive).toBeTruthy();
    expect((await stat(join(data.state, archive))).mode & 0o777).toBe(0o700);
    expect(values(data.database)).toEqual(["at-backup"]);
    expect(values(join(data.state, archive, "projects.sqlite"))).toEqual([
      "at-backup",
      "after-backup",
    ]);
    expect((await stat(data.database)).mode & 0o777).toBe(0o640);
    const calls = await commands(data);
    expect(calls.filter((call) => call.command === "systemctl").map((call) => call.args)).toEqual([
      ["stop", "jqstar"],
      ["start", "jqstar"],
    ]);
    expect(calls.find((call) => call.command === "install").args).toEqual([
      "-o",
      "jqstar",
      "-g",
      "jqstar",
      "-m",
      "0640",
      data.backup,
      data.database,
    ]);
    expect(calls.at(-1).command).toBe("curl");
  },
);

it("preserves an optional journal and creates a separate archive on each restore", async () => {
  const data = await fixture();
  const original = await readFile(data.database);
  await writeFile(`${data.database}-journal`, "retained recovery evidence");
  expect(execute(data, 1).status).toBe(0);
  const first = (await readdir(data.state)).find((name) => name.startsWith("failed."));
  expect(await readFile(join(data.state, first, "projects.sqlite-journal"), "utf8")).toBe(
    "retained recovery evidence",
  );
  expect(execute(data, 1).status).toBe(0);
  expect((await readdir(data.state)).filter((name) => name.startsWith("failed."))).toHaveLength(2);
  expect(await readFile(join(data.state, first, "projects.sqlite"))).toEqual(original);
});

it("checks the selected backup before stopping the service", async () => {
  const data = await fixture();
  await rm(data.backup);
  expect(execute(data, 1).status).not.toBe(0);
  expect((await commands(data)).map((call) => call.command)).toEqual(["sudo"]);
  expect(values(data.database)).toEqual(["at-backup", "after-backup"]);
});

it.each(["stop", "mv", "install"])(
  "stops restore after %s fails, retaining all database files",
  async (failure) => {
    const data = await fixture({ abrupt: true });
    const originals = new Map(
      await Promise.all(
        (await readdir(data.state)).map(async (name) => [
          name,
          await readFile(join(data.state, name)),
        ]),
      ),
    );
    const result = execute(data, 1, failure);
    expect(result.status).not.toBe(0);
    const calls = await commands(data);
    expect(calls.some((call) => call.command === "systemctl" && call.args[0] === "start")).toBe(
      false,
    );
    expect(calls.some((call) => call.command === "curl")).toBe(false);
    const archive = (await readdir(data.state)).find((name) => name.startsWith("failed."));
    for (const [name, bytes] of originals) {
      const path = (await readdir(data.state)).includes(name)
        ? join(data.state, name)
        : join(data.state, archive, name);
      expect(await readFile(path)).toEqual(bytes);
    }
  },
);

it("does not attempt a backup when directory creation fails", async () => {
  const data = await fixture();
  expect(execute(data, 0, "install").status).not.toBe(0);
  expect((await commands(data)).some((call) => call.command === "sqlite3")).toBe(false);
});

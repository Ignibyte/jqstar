#!/usr/bin/env node
import { execFile } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { repositoryRoot } from "./lib/git-state.mjs";

const execFileAsync = promisify(execFile);

async function currentHooksPath(root) {
  try {
    const { stdout } = await execFileAsync(
      "git",
      ["config", "--local", "--get", "core.hooksPath"],
      { cwd: root },
    );
    return stdout.trim();
  } catch {
    return "";
  }
}

async function main() {
  const operation = process.argv[2];
  if (!["install", "uninstall", "status"].includes(operation)) {
    throw new Error("usage: commit-guard.mjs install|uninstall|status");
  }
  const root = await repositoryRoot();
  const current = await currentHooksPath(root);
  if (operation === "status") {
    process.stdout.write(
      current === ".githooks"
        ? "installed\n"
        : `not installed${current ? ` (core.hooksPath=${current})` : ""}\n`,
    );
    return;
  }
  if (operation === "install") {
    if (current && current !== ".githooks") {
      throw new Error(`core.hooksPath is already ${current}; refusing to replace it`);
    }
    try {
      await access(path.join(root, ".githooks", "pre-commit"), constants.X_OK);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      throw new Error(`.githooks/pre-commit is missing or not executable (${detail})`, {
        cause: error,
      });
    }
    await execFileAsync("git", ["config", "--local", "core.hooksPath", ".githooks"], { cwd: root });
    process.stdout.write("Installed the jQuery Star commit guard. CI remains authoritative.\n");
    return;
  }
  if (current === ".githooks") {
    await execFileAsync("git", ["config", "--local", "--unset", "core.hooksPath"], { cwd: root });
    process.stdout.write("Removed the jQuery Star commit guard.\n");
  } else {
    process.stdout.write("The jQuery Star commit guard was not installed.\n");
  }
}

main().catch((error) => {
  process.stderr.write(`commit guard setup: ${error.message}\n`);
  process.exitCode = 1;
});

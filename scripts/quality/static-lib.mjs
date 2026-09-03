import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export async function readJSON(path) {
  return JSON.parse(await readFile(resolve(repositoryRoot, path), "utf8"));
}

export function run(command, args, options = {}) {
  return new Promise((resolveRun, rejectRun) => {
    const child = spawn(command, args, {
      cwd: options.cwd ?? repositoryRoot,
      env: { ...process.env, ...options.env },
      shell: false,
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    child.stdout?.setEncoding("utf8");
    child.stderr?.setEncoding("utf8");
    child.stdout?.on("data", (chunk) => (stdout += chunk));
    child.stderr?.on("data", (chunk) => (stderr += chunk));
    child.once("error", rejectRun);
    child.once("close", (code, signal) => {
      resolveRun({ code: code ?? 1, signal, stderr, stdout });
    });
  });
}

export async function qualityPaths() {
  const result = await run(
    "git",
    ["ls-files", "--cached", "--others", "--exclude-standard", "-z"],
    { capture: true },
  );
  if (result.code !== 0) throw new Error(`git ls-files failed: ${result.stderr.trim()}`);
  const paths = result.stdout.split("\0").filter(Boolean).sort();
  if (paths.length === 0) throw new Error("The quality scope census found no repository files.");
  return paths;
}

export function fail(messages) {
  for (const message of messages) process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

import { execFileSync, spawn } from "node:child_process";
import { mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { fingerprint as qualityFingerprint } from "./lib/git-state.mjs";

export const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

export function repoPath(path) {
  return resolve(repoRoot, path);
}

export function qualityEvidencePath(path) {
  const runDirectory = process.env.JQS_QUALITY_RUN_DIRECTORY;
  return runDirectory
    ? resolve(runDirectory, "evidence", path)
    : repoPath(`test-results/quality/${path}`);
}

export function qualityRunId() {
  const configured = process.env.JQS_QUALITY_RUN_ID?.trim();
  return configured || "standalone";
}

export function existedAtRevision(path, revision, cwd = repoRoot) {
  try {
    execFileSync("git", ["cat-file", "-e", `${revision}:${path}`], { cwd, stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

export function relativePath(path) {
  return relative(repoRoot, path).split(sep).join("/");
}

export async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

export async function writeJsonAtomic(path, value) {
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.${process.pid}.tmp`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, "utf8");
  await rename(temporary, path);
}

export async function removePath(path) {
  await rm(path, { force: true, recursive: true });
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error && typeof error === "object" && error.code === "ENOENT") return false;
    throw error;
  }
}

export async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else if (entry.isFile()) files.push(relativePath(path));
  }
  return files;
}

export function run(command, args, options = {}) {
  return new Promise((resolveRun, reject) => {
    const child = spawn(command, args, {
      cwd: repoRoot,
      env: { ...process.env, ...options.env },
      stdio: options.capture ? ["ignore", "pipe", "pipe"] : "inherit",
    });
    let stdout = "";
    let stderr = "";
    if (options.capture) {
      child.stdout.setEncoding("utf8");
      child.stderr.setEncoding("utf8");
      child.stdout.on("data", (chunk) => {
        stdout += chunk;
        if (!options.quiet) process.stdout.write(chunk);
      });
      child.stderr.on("data", (chunk) => {
        stderr += chunk;
        if (!options.quiet) process.stderr.write(chunk);
      });
    }
    child.on("error", reject);
    child.on("exit", (code, signal) =>
      resolveRun({ code: code ?? 1, signal: signal ?? null, stdout, stderr }),
    );
  });
}

function currentHead() {
  return execFileSync("git", ["rev-parse", "HEAD"], { cwd: repoRoot, encoding: "utf8" }).trim();
}

function changedPathsFromGit() {
  const tracked = execFileSync("git", ["diff", "--name-only", "--diff-filter=ACMR", "HEAD"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  const untracked = execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  return [...new Set(`${tracked}\n${untracked}`.split("\n").filter(Boolean))].sort();
}

function changedLinesFromDiff(output) {
  const changed = {};
  let path;
  for (const line of output.split("\n")) {
    if (line.startsWith("+++ b/")) {
      path = line.slice(6);
      changed[path] ??= [];
      continue;
    }
    if (!path || !line.startsWith("@@")) continue;
    const match = /\+(\d+)(?:,(\d+))?/.exec(line);
    if (!match) continue;
    const start = Number(match[1]);
    const count = match[2] === undefined ? 1 : Number(match[2]);
    for (let index = 0; index < count; index += 1) changed[path].push(start + index);
  }
  return changed;
}

async function standaloneScope() {
  const paths = changedPathsFromGit();
  const diff = execFileSync(
    "git",
    ["diff", "--unified=0", "--no-ext-diff", "--diff-filter=ACMR", "HEAD"],
    { cwd: repoRoot, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
  );
  const changedLines = changedLinesFromDiff(diff);
  for (const path of paths) {
    if (changedLines[path] || !path) continue;
    const absolute = repoPath(path);
    if (!(await pathExists(absolute))) continue;
    const source = await readFile(absolute, "utf8");
    changedLines[path] = Array.from({ length: source.split("\n").length }, (_, index) => index + 1);
  }
  return {
    schema: "jqstar-quality-scope/standalone-1",
    base: null,
    head: currentHead(),
    changedPaths: paths,
    changedLines,
    source: "standalone-git-diff",
  };
}

async function validateScope(scope, source) {
  if (scope.schema !== "jqstar-quality-scope/1") {
    throw new Error(`${source} has unsupported schema ${String(scope.schema)}.`);
  }
  if (
    !scope.startFingerprint ||
    typeof scope.startFingerprint !== "object" ||
    scope.startFingerprint.algorithm !== "sha256" ||
    typeof scope.startFingerprint.digest !== "string" ||
    scope.startFingerprint.digest.length === 0 ||
    !Number.isSafeInteger(scope.startFingerprint.fileCount) ||
    scope.startFingerprint.fileCount < 0
  ) {
    throw new Error(`${source} has no start fingerprint.`);
  }
  if (typeof scope.head !== "string" || scope.head !== currentHead()) {
    throw new Error(`${source} is stale for the current HEAD.`);
  }
  if (
    !Object.hasOwn(scope, "base") ||
    (scope.base !== null &&
      (typeof scope.base !== "string" || !/^[a-f0-9]{40}(?:[a-f0-9]{24})?$/u.test(scope.base)))
  ) {
    throw new Error(`${source} has an invalid resolved quality base.`);
  }
  if (
    !Array.isArray(scope.changedPaths) ||
    !scope.changedLines ||
    typeof scope.changedLines !== "object"
  ) {
    throw new Error(`${source} has no changed path/line scope.`);
  }
  const sorted = [...new Set(scope.changedPaths)].sort();
  if (JSON.stringify(sorted) !== JSON.stringify(scope.changedPaths)) {
    throw new Error(`${source} changedPaths must be sorted and unique.`);
  }
  for (const [path, lines] of Object.entries(scope.changedLines)) {
    if (!scope.changedPaths.includes(path) || !Array.isArray(lines)) {
      throw new Error(`${source} has invalid changed lines for ${path}.`);
    }
    if (lines.some((line) => !Number.isInteger(line) || line < 1)) {
      throw new Error(`${source} has a non-positive changed line for ${path}.`);
    }
  }
  const current = await qualityFingerprint(repoRoot);
  if (
    current.algorithm !== scope.startFingerprint.algorithm ||
    current.digest !== scope.startFingerprint.digest ||
    current.fileCount !== scope.startFingerprint.fileCount
  ) {
    throw new Error(`${source} is stale for the current worktree fingerprint.`);
  }
  return { ...scope, source };
}

export async function loadQualityScope() {
  const configured = process.env.JQS_QUALITY_SCOPE_FILE;
  if (!configured) return standaloneScope();
  const source = resolve(repoRoot, configured);
  let scope;
  try {
    scope = await readJson(source);
  } catch (error) {
    throw new Error(`Cannot read JQS_QUALITY_SCOPE_FILE ${source}: ${error.message}`, {
      cause: error,
    });
  }
  return validateScope(scope, source);
}

export function matchesRule(path, rule) {
  if (rule.paths && !rule.paths.includes(path)) return false;
  if (rule.prefixes && !rule.prefixes.some((prefix) => path.startsWith(prefix))) return false;
  if (rule.suffixes && !rule.suffixes.some((suffix) => path.endsWith(suffix))) return false;
  if (rule.excludePaths?.includes(path)) return false;
  if (rule.excludeSuffixes?.some((suffix) => path.endsWith(suffix))) return false;
  return Boolean(rule.paths || rule.prefixes || rule.suffixes);
}

export function classifyPath(path, census) {
  return census.rules.filter((rule) => matchesRule(path, rule));
}

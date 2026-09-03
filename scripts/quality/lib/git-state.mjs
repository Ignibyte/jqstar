import { createHash } from "node:crypto";
import { lstat, readFile, readlink, realpath } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";
import { execFile } from "node:child_process";

const execFileAsync = promisify(execFile);
const comparePaths = (left, right) => (left === right ? 0 : left < right ? -1 : 1);

async function git(root, args) {
  const { stdout } = await execFileAsync("git", args, {
    cwd: root,
    encoding: "buffer",
    maxBuffer: 32 * 1024 * 1024,
  });
  return stdout;
}

function nulPaths(buffer) {
  return buffer
    .toString("utf8")
    .split("\0")
    .filter(Boolean)
    .map((entry) => entry.replaceAll("\\", "/"));
}

export async function repositoryRoot(cwd = process.cwd()) {
  const output = await git(cwd, ["rev-parse", "--show-toplevel"]);
  return realpath(output.toString("utf8").trim());
}

export async function gitDirectory(root) {
  const output = await git(root, ["rev-parse", "--git-dir"]);
  const value = output.toString("utf8").trim();
  return path.resolve(root, value);
}

export async function gitHead(root) {
  try {
    const output = await git(root, ["rev-parse", "HEAD"]);
    return output.toString("utf8").trim();
  } catch {
    return null;
  }
}

export async function resolveQualityBase(root, candidate) {
  if (candidate === undefined || candidate === null || candidate === "") return null;
  if (typeof candidate !== "string" || candidate.trim() !== candidate) {
    throw new Error(
      "JQS_QUALITY_BASE_SHA must be a non-empty Git commit or ref without surrounding whitespace.",
    );
  }

  let resolved;
  try {
    const output = await git(root, [
      "rev-parse",
      "--verify",
      "--end-of-options",
      `${candidate}^{commit}`,
    ]);
    resolved = output.toString("utf8").trim();
  } catch (error) {
    throw new Error(`JQS_QUALITY_BASE_SHA does not resolve to a commit: ${candidate}`, {
      cause: error,
    });
  }

  try {
    await git(root, ["merge-base", "--is-ancestor", resolved, "HEAD"]);
  } catch (error) {
    throw new Error(`JQS_QUALITY_BASE_SHA is not an ancestor of HEAD: ${candidate}`, {
      cause: error,
    });
  }
  return resolved;
}

export async function gatedPaths(root) {
  const output = await git(root, ["ls-files", "--cached", "--others", "--exclude-standard", "-z"]);
  return [...new Set(nulPaths(output))].sort(comparePaths);
}

export async function changedPaths(root, { base = null } = {}) {
  const paths = new Set();
  if (base) {
    const committed = await git(root, ["diff", "--name-only", "-z", `${base}...HEAD`, "--"]);
    for (const entry of nulPaths(committed)) paths.add(entry);
  }
  try {
    const tracked = await git(root, ["diff", "--name-only", "-z", "HEAD", "--"]);
    for (const entry of nulPaths(tracked)) paths.add(entry);
  } catch {
    const tracked = await git(root, ["ls-files", "--cached", "-z"]);
    for (const entry of nulPaths(tracked)) paths.add(entry);
  }
  const untracked = await git(root, ["ls-files", "--others", "--exclude-standard", "-z"]);
  for (const entry of nulPaths(untracked)) paths.add(entry);
  return [...paths].sort(comparePaths);
}

function collectDiffLines(diff, linesByPath) {
  let currentPath = null;
  for (const line of diff.split("\n")) {
    if (line === "+++ /dev/null") {
      currentPath = null;
      continue;
    }
    if (line.startsWith("+++ b/")) {
      currentPath = line.slice(6).replaceAll("\\", "/");
      if (!linesByPath[currentPath]) linesByPath[currentPath] = [];
      continue;
    }
    if (!currentPath || !line.startsWith("@@")) continue;
    const match = /\+(\d+)(?:,(\d+))?/.exec(line);
    if (!match) continue;
    const start = Number(match[1]);
    const count = Number(match[2] ?? 1);
    for (let offset = 0; offset < count; offset += 1) {
      linesByPath[currentPath].push(start + offset);
    }
  }
}

export async function changedLines(root, paths, { base = null } = {}) {
  const linesByPath = {};
  if (base) {
    const committed = await git(root, [
      "diff",
      "--unified=0",
      "--no-color",
      `${base}...HEAD`,
      "--",
    ]);
    collectDiffLines(committed.toString("utf8"), linesByPath);
  }
  try {
    const output = await git(root, ["diff", "--unified=0", "--no-color", "HEAD", "--"]);
    collectDiffLines(output.toString("utf8"), linesByPath);
  } catch {
    // An unborn repository has no base diff. Tracked files are handled like untracked files below.
  }

  const tracked = new Set(nulPaths(await git(root, ["ls-files", "--cached", "-z"])));
  for (const relative of paths) {
    if (tracked.has(relative) || linesByPath[relative]) continue;
    try {
      const contents = await readFile(path.join(root, relative), "utf8");
      const lineCount = contents.length === 0 ? 0 : contents.split("\n").length;
      linesByPath[relative] = Array.from({ length: lineCount }, (_, index) => index + 1);
    } catch {
      linesByPath[relative] = [];
    }
  }

  return Object.fromEntries(
    Object.entries(linesByPath)
      .map(([file, lines]) => [file, [...new Set(lines)].sort((left, right) => left - right)])
      .sort(([left], [right]) => comparePaths(left, right)),
  );
}

export async function fingerprint(root) {
  const paths = await gatedPaths(root);
  const hash = createHash("sha256");

  for (const relative of paths) {
    const absolute = path.join(root, relative);
    hash.update(`path\0${relative}\0`);
    try {
      const metadata = await lstat(absolute);
      hash.update(`mode\0${metadata.mode & 0o777}\0`);
      if (metadata.isSymbolicLink()) {
        hash.update("symlink\0");
        hash.update(await readlink(absolute));
      } else if (metadata.isFile()) {
        hash.update("file\0");
        hash.update(await readFile(absolute));
      } else {
        hash.update(`other\0${metadata.size}\0`);
      }
    } catch (error) {
      if (error && error.code === "ENOENT") {
        hash.update("missing\0");
        continue;
      }
      throw error;
    }
    hash.update("\0end\0");
  }

  return { algorithm: "sha256", digest: hash.digest("hex"), fileCount: paths.length };
}

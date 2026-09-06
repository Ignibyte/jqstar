import assert from "node:assert/strict";
import { constants } from "node:fs";
import { lstat, mkdir, open, realpath, rmdir, unlink } from "node:fs/promises";
import { join } from "node:path";
import { safeRelativePath, sha256 } from "./contracts.mjs";

async function containedPath(root, path, leafExists) {
  safeRelativePath(path);
  let current = await realpath(root);
  const segments = path.split("/");
  for (const [index, segment] of segments.entries()) {
    current = join(current, segment);
    if (!leafExists && index === segments.length - 1) break;
    const stat = await lstat(current);
    assert(!stat.isSymbolicLink(), "Audit input or output traverses a symbolic link");
    if (index < segments.length - 1) assert(stat.isDirectory(), "Audit parent is not a directory");
  }
  return current;
}

export async function readAuditFile(root, path, { digest, maximumBytes = 32 * 1024 * 1024 } = {}) {
  assert(
    Number.isSafeInteger(maximumBytes) && maximumBytes > 0 && maximumBytes <= 128 * 1024 * 1024,
    "Invalid audit file bound",
  );
  let handle;
  try {
    const absolute = await containedPath(root, path, true);
    handle = await open(absolute, constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK);
    const before = await handle.stat();
    assert(
      before.isFile() && before.size <= maximumBytes,
      "Audit input is not a bounded regular file",
    );
    const buffer = Buffer.alloc(before.size + 1);
    let offset = 0;
    while (offset < buffer.length) {
      const { bytesRead } = await handle.read(buffer, offset, buffer.length - offset, offset);
      if (bytesRead === 0) break;
      offset += bytesRead;
    }
    const after = await handle.stat();
    const pathStat = await lstat(absolute);
    assert(
      offset === before.size &&
        before.size === after.size &&
        before.mtimeMs === after.mtimeMs &&
        before.ctimeMs === after.ctimeMs &&
        !pathStat.isSymbolicLink() &&
        before.dev === pathStat.dev &&
        before.ino === pathStat.ino,
      "Audit input changed while being read",
    );
    const bytes = buffer.subarray(0, offset);
    const actual = sha256(bytes);
    assert(digest === undefined || actual === digest, "Audit input digest mismatch");
    return {
      path,
      sha256: actual,
      bytes: offset,
      source: new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes),
    };
  } catch {
    // OS and parser errors may include private absolute paths or input text.
    throw new Error(
      "Audit input is missing, unsafe, changed, oversized, unreadable, or has a mismatched digest",
    );
  } finally {
    await handle?.close();
  }
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  return value;
}

export function deterministicJson(value) {
  return `${JSON.stringify(canonical(value), null, 2)}\n`;
}

// The caller provides an owned out-of-tree parent. Refuse reuse, including symlinks.
// Read-only permissions prevent accidental writes; recorded digests detect later tampering.
export async function writeAuditSnapshot(parent, name, data, markdown) {
  assert(/^[a-f0-9]{64}$/u.test(name), "Audit snapshot name must be a digest");
  const directory = await containedPath(parent, name, false);
  const entries = [
    ["inventory.json", deterministicJson(data)],
    ["inventory.md", markdown],
  ];
  assert(name === sha256(entries[0][1]), "Audit snapshot name differs from its content digest");
  assert(
    entries.every(
      ([, source]) => typeof source === "string" && Buffer.byteLength(source) <= 32 * 1024 * 1024,
    ),
    "Audit snapshot exceeds its output bound",
  );
  await mkdir(directory, { mode: 0o700 });
  const created = [];
  try {
    for (const [file, source] of entries) {
      const path = join(directory, file);
      const handle = await open(path, "wx", 0o600);
      created.push(path);
      try {
        await handle.writeFile(source, "utf8");
        await handle.sync();
        await handle.chmod(0o444);
      } finally {
        await handle.close();
      }
    }
    const handle = await open(directory, "r");
    try {
      await handle.sync();
    } finally {
      await handle.close();
    }
    return entries.map(([path, source]) => ({ path: `${name}/${path}`, sha256: sha256(source) }));
  } catch {
    // Only files created by this call are removed. Never recurse over another writer's entries.
    await Promise.allSettled(created.map((path) => unlink(path)));
    await rmdir(directory).catch(() => {});
    throw new Error("Audit snapshot could not be written completely");
  }
}

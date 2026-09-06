import { constants } from "node:fs";
import { lstat, open, opendir, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, win32 } from "node:path";
import { createHash } from "node:crypto";

export class DoctorFault extends Error {
  constructor(code, path = ".", exitCode = 2) {
    super(code);
    this.code = code;
    this.path = path;
    this.exitCode = exitCode;
  }
}

export function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function field(value, key) {
  return record(value) && Object.hasOwn(value, key) ? value[key] : undefined;
}

export function entries(value) {
  return record(value) ? Object.entries(value) : [];
}

function hasControls(value) {
  for (let index = 0; index < value.length; index++) {
    const code = value.charCodeAt(index);
    if (code < 32 || code === 127) return true;
  }
  return false;
}

export function text(value) {
  return typeof value === "string" && value.length <= 256 && !hasControls(value)
    ? value
    : undefined;
}

export function packageName(value) {
  return typeof value === "string" &&
    /^(?:@[a-z0-9._-]+\/)?[a-z0-9._-]+$/u.test(value) &&
    value.length <= 214
    ? value
    : undefined;
}

export function portablePath(value, allowRoot = false) {
  if (
    typeof value !== "string" ||
    value.length > 1024 ||
    hasControls(value) ||
    isAbsolute(value) ||
    win32.isAbsolute(value)
  )
    throw new DoctorFault("JQS_PATH_UNSAFE");
  const normalized = value.replaceAll("\\", "/");
  if (
    normalized.split("/").some((part) => part === "..") ||
    (!allowRoot && ["", "."].includes(normalized))
  )
    throw new DoctorFault("JQS_PATH_UNSAFE");
  return normalized;
}

function within(root, target) {
  const suffix = relative(root, target);
  return (
    suffix === "" ||
    (suffix !== ".." &&
      !suffix.startsWith("../") &&
      !suffix.startsWith("..\\") &&
      !isAbsolute(suffix))
  );
}

export function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

export function canonical(value) {
  if (Array.isArray(value)) return `[${value.map(canonical).join(",")}]`;
  if (record(value))
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonical(value[key])}`)
      .join(",")}}`;
  return JSON.stringify(value);
}

export function checkData(value, maxDepth = 32) {
  const stack = [[value, 0]];
  const seen = new Set();
  let count = 0;
  while (stack.length > 0) {
    const [next, depth] = stack.pop();
    if (++count > 200000 || depth > maxDepth) throw new DoctorFault("JQS_SCAN_TRUNCATED", ".", 0);
    if (next === null || typeof next !== "object") continue;
    if (seen.has(next)) throw new DoctorFault("JQS_INPUT_INVALID");
    seen.add(next);
    for (const child of Object.values(next)) stack.push([child, depth + 1]);
  }
  return value;
}

export function parseJSON(source, path = ".") {
  try {
    return checkData(JSON.parse(source));
  } catch (error) {
    if (error instanceof DoctorFault) throw error;
    throw new DoctorFault("JQS_INPUT_INVALID", path);
  }
}

export class MetadataReader {
  constructor(root, limits) {
    this.root = root;
    this.limits = limits;
    this.started = performance.now();
    this.bytes = 0;
    this.files = 0;
    this.directoryEntries = 0;
    this.packageRecords = 0;
    this.workspaceManifests = 0;
  }

  check() {
    if (performance.now() - this.started > this.limits.elapsedMs)
      throw new DoctorFault("JQS_SCAN_TRUNCATED", ".", 0);
  }

  async path(input, required = false) {
    this.check();
    const candidate = resolve(this.root, portablePath(input, true));
    if (!within(this.root, candidate)) throw new DoctorFault("JQS_PATH_UNSAFE");
    try {
      const actual = await realpath(candidate);
      if (!within(this.root, actual)) throw new DoctorFault("JQS_PATH_UNSAFE", input);
      return actual;
    } catch (error) {
      if (error?.code === "ENOENT" && !required) return undefined;
      if (error instanceof DoctorFault) throw error;
      throw new DoctorFault("JQS_INPUT_INVALID", input);
    }
  }

  async read(input, required = false) {
    const actual = await this.path(input, required);
    if (!actual) return undefined;
    let handle;
    try {
      handle = await open(
        actual,
        constants.O_RDONLY | (constants.O_NOFOLLOW ?? 0) | (constants.O_NONBLOCK ?? 0),
      );
      const stats = await handle.stat();
      if (!stats.isFile()) throw new DoctorFault("JQS_INPUT_INVALID", input);
      if (
        stats.size > this.limits.fileBytes ||
        ++this.files > this.limits.packages + this.limits.workspaces * 4
      )
        throw new DoctorFault("JQS_SCAN_TRUNCATED", input, 0);
      const buffer = Buffer.alloc(Math.min(stats.size + 1, this.limits.fileBytes + 1));
      let used = 0;
      while (used < buffer.length) {
        this.check();
        const { bytesRead } = await handle.read(buffer, used, buffer.length - used, used);
        if (bytesRead === 0) break;
        used += bytesRead;
      }
      const after = await handle.stat();
      if (after.size !== stats.size || used !== stats.size)
        throw new DoctorFault("JQS_INPUT_INVALID", input);
      this.bytes += used;
      if (this.bytes > this.limits.totalBytes)
        throw new DoctorFault("JQS_SCAN_TRUNCATED", input, 0);
      return new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(
        buffer.subarray(0, used),
      );
    } catch (error) {
      if (error instanceof DoctorFault) throw error;
      throw new DoctorFault("JQS_INPUT_INVALID", input);
    } finally {
      await handle?.close();
    }
  }

  async json(input, required = false) {
    const source = await this.read(input, required);
    return source === undefined ? undefined : parseJSON(source, input);
  }

  async directories(input) {
    const actual = await this.path(input);
    if (!actual) return [];
    let directory;
    const result = [];
    try {
      directory = await opendir(actual);
      for await (const entry of directory) {
        this.check();
        if (++this.directoryEntries > this.limits.packages * 8)
          throw new DoctorFault("JQS_SCAN_TRUNCATED", input, 0);
        if (entry.isDirectory() || entry.isSymbolicLink()) result.push(entry.name);
      }
      return result.sort();
    } catch (error) {
      if (error instanceof DoctorFault) throw error;
      throw new DoctorFault("JQS_INPUT_INVALID", input);
    }
  }
}

export async function projectRoot(input) {
  try {
    const target = await realpath(resolve(input));
    if (!(await lstat(target)).isDirectory()) throw new DoctorFault("JQS_PATH_UNSAFE");
    return target;
  } catch {
    throw new DoctorFault("JQS_PATH_UNSAFE");
  }
}

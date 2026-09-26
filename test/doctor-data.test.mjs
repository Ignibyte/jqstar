// @vitest-environment node
import { constants } from "node:fs";
import { mkdir, mkdtemp, realpath, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  MetadataReader,
  canonical,
  checkData,
  entries,
  field,
  packageName,
  parseJSON,
  portablePath,
  record,
  text,
} from "../bin/doctor/data.mjs";

const roots = [];
const limits = {
  elapsedMs: 10_000,
  fileBytes: 128,
  totalBytes: 256,
  packages: 4,
  workspaces: 1,
};

async function fixture() {
  const root = await realpath(await mkdtemp(join(tmpdir(), "jqstar-doctor-data-")));
  roots.push(root);
  return root;
}

afterEach(async () => {
  for (const root of roots.splice(0)) await rm(root, { recursive: true, force: true });
});

describe("doctor input boundaries", () => {
  it("treats only non-array objects as records and reads own fields", () => {
    const inherited = Object.create({ inherited: "outside" });
    inherited.own = "inside";
    expect(record(inherited)).toBe(true);
    expect(record(null)).toBe(false);
    expect(record([])).toBe(false);
    expect(field(inherited, "own")).toBe("inside");
    expect(field(inherited, "inherited")).toBeUndefined();
    expect(entries({ a: 1 })).toEqual([["a", 1]]);
    expect(entries([])).toEqual([]);
  });

  it("accepts bounded printable text and valid package names", () => {
    expect(text("x".repeat(256))).toHaveLength(256);
    expect(text("a b")).toBe("a b");
    expect(text("x".repeat(257))).toBeUndefined();
    for (const value of ["\n", "\u0000", "\u007f"]) expect(text(`a${value}b`)).toBeUndefined();
    expect(packageName("@scope/widget")).toBe("@scope/widget");
    for (const value of ["@scope/", "UPPER", "name space", "x".repeat(215)])
      expect(packageName(value)).toBeUndefined();
    expect(packageName("x".repeat(214))).toHaveLength(214);
  });

  it("rejects absolute, traversing, and control-character paths", () => {
    expect(portablePath("folder\\config.json")).toBe("folder/config.json");
    expect(portablePath("x".repeat(1024))).toHaveLength(1024);
    expect(portablePath(".", true)).toBe(".");
    for (const value of [
      "",
      ".",
      "../outside",
      "a/../outside",
      "/etc/passwd",
      "C:\\outside",
      "a\n",
      "x".repeat(1025),
    ]) {
      expect(() => portablePath(value)).toThrowError(
        expect.objectContaining({ code: "JQS_PATH_UNSAFE" }),
      );
    }
  });

  it("bounds JSON depth, rejects cycles, and uses stable object key order", () => {
    expect(canonical({ z: 1, a: [2, 3] })).toBe('{"a":[2,3],"z":1}');
    expect(canonical([{ z: 1, a: 2 }])).toBe('[{"a":2,"z":1}]');
    expect(parseJSON('{"ok":true}')).toEqual({ ok: true });
    expect(() => parseJSON("{")).toThrowError(
      expect.objectContaining({ code: "JQS_INPUT_INVALID" }),
    );
    const cycle = {};
    cycle.self = cycle;
    expect(() => checkData(cycle)).toThrowError(
      expect.objectContaining({ code: "JQS_INPUT_INVALID" }),
    );
    expect(() => checkData({ a: { b: true } }, 1)).toThrowError(
      expect.objectContaining({ code: "JQS_SCAN_TRUNCATED", exitCode: 0 }),
    );
  });
});

describe("doctor metadata reader", () => {
  it("reads bounded files, handles missing paths, and rejects a symlink escape", async () => {
    const root = await fixture();
    await writeFile(join(root, "config.json"), '{"ok":true}');
    const reader = new MetadataReader(root, limits);
    await expect(reader.json("config.json", true)).resolves.toEqual({ ok: true });
    await expect(reader.read("missing.json")).resolves.toBeUndefined();
    await expect(reader.read("missing.json", true)).rejects.toMatchObject({
      code: "JQS_INPUT_INVALID",
    });
    const outside = await fixture();
    await writeFile(join(outside, "outside.json"), "{}");
    await symlink(join(outside, "outside.json"), join(root, "outside.json"));
    await expect(reader.read("outside.json", true)).rejects.toMatchObject({
      code: "JQS_PATH_UNSAFE",
    });
    await symlink(dirname(root), join(root, "parent"));
    await expect(reader.path("parent", true)).rejects.toMatchObject({
      code: "JQS_PATH_UNSAFE",
    });
  });

  it("keeps the input fault when a file disappears before opening", async () => {
    const root = await fixture();
    await writeFile(join(root, "vanishing.json"), "{}");
    const reader = new MetadataReader(root, limits);
    const resolvePath = reader.path.bind(reader);
    reader.path = async (...args) => {
      const actual = await resolvePath(...args);
      await rm(actual);
      return actual;
    };

    await expect(reader.read("vanishing.json", true)).rejects.toMatchObject({
      code: "JQS_INPUT_INVALID",
    });
  });

  it.skipIf(!constants.O_NOFOLLOW)(
    "rejects a symlink swapped in after path resolution",
    async () => {
      const root = await fixture();
      const outside = await fixture();
      const input = join(root, "swapped.json");
      const secret = join(outside, "secret.json");
      await writeFile(input, "{}");
      await writeFile(secret, "private");
      const reader = new MetadataReader(root, limits);
      const resolvePath = reader.path.bind(reader);
      reader.path = async (...args) => {
        const actual = await resolvePath(...args);
        await rm(actual);
        await symlink(secret, actual);
        return actual;
      };

      await expect(reader.read("swapped.json", true)).rejects.toMatchObject({
        code: "JQS_INPUT_INVALID",
      });
    },
  );

  it("enforces per-file, cumulative byte, file-count, and elapsed limits", async () => {
    const root = await fixture();
    await writeFile(join(root, "first.txt"), "12345");
    await writeFile(join(root, "second.txt"), "67890");
    await expect(
      new MetadataReader(root, { ...limits, fileBytes: 5 }).read("first.txt", true),
    ).resolves.toBe("12345");
    await expect(
      new MetadataReader(root, { ...limits, fileBytes: 4 }).read("first.txt", true),
    ).rejects.toMatchObject({ code: "JQS_SCAN_TRUNCATED", exitCode: 0 });
    const exactBytes = new MetadataReader(root, { ...limits, totalBytes: 10 });
    await exactBytes.read("first.txt", true);
    await expect(exactBytes.read("second.txt", true)).resolves.toBe("67890");
    const bytes = new MetadataReader(root, { ...limits, totalBytes: 9 });
    await bytes.read("first.txt", true);
    await expect(bytes.read("second.txt", true)).rejects.toMatchObject({
      code: "JQS_SCAN_TRUNCATED",
      exitCode: 0,
    });
    const files = new MetadataReader(root, { ...limits, packages: 0, workspaces: 0 });
    await expect(files.read("first.txt", true)).rejects.toMatchObject({
      code: "JQS_SCAN_TRUNCATED",
      exitCode: 0,
    });
    const exactFiles = new MetadataReader(root, { ...limits, packages: 1, workspaces: 0 });
    await expect(exactFiles.read("first.txt", true)).resolves.toBe("12345");
    await expect(exactFiles.read("second.txt", true)).rejects.toMatchObject({
      code: "JQS_SCAN_TRUNCATED",
      exitCode: 0,
    });
    const expired = new MetadataReader(root, { ...limits, elapsedMs: -1 });
    await expect(expired.read("first.txt", true)).rejects.toMatchObject({
      code: "JQS_SCAN_TRUNCATED",
      exitCode: 0,
    });
  });

  it("reads a small file under a generous file limit without a large allocation", async () => {
    const root = await fixture();
    await writeFile(join(root, "small.json"), "{}");
    const originalAlloc = Buffer.alloc;
    const allocation = vi.spyOn(Buffer, "alloc").mockImplementation((size, ...args) => {
      if (size > 8 * 1024 * 1024) throw new Error("Read allocated far beyond input size");
      return originalAlloc.call(Buffer, size, ...args);
    });
    try {
      const reader = new MetadataReader(root, {
        ...limits,
        fileBytes: 64 * 1024 * 1024,
        totalBytes: 64 * 1024 * 1024,
      });
      await expect(reader.read("small.json", true)).resolves.toBe("{}");
    } finally {
      allocation.mockRestore();
    }
  });

  it("allows four metadata files per workspace at the exact count limit", async () => {
    const root = await fixture();
    for (let index = 0; index < 5; index++) await writeFile(join(root, `file-${index}`), "x");
    const reader = new MetadataReader(root, { ...limits, packages: 0, workspaces: 1 });

    for (let index = 0; index < 4; index++) {
      await expect(reader.read(`file-${index}`, true)).resolves.toBe("x");
    }
    await expect(reader.read("file-4", true)).rejects.toMatchObject({
      code: "JQS_SCAN_TRUNCATED",
      exitCode: 0,
    });
  });

  it("rejects malformed UTF-8 and BOM-prefixed JSON", async () => {
    const root = await fixture();
    await writeFile(join(root, "invalid.txt"), Buffer.from([0xff]));
    await writeFile(join(root, "bom.json"), Buffer.from([0xef, 0xbb, 0xbf, 0x7b, 0x7d]));
    const reader = new MetadataReader(root, limits);
    await expect(reader.read("invalid.txt", true)).rejects.toMatchObject({
      code: "JQS_INPUT_INVALID",
    });
    await expect(reader.json("bom.json", true)).rejects.toMatchObject({
      code: "JQS_INPUT_INVALID",
    });
  });

  it("returns sorted directories and rejects a non-directory input", async () => {
    const root = await fixture();
    await mkdir(join(root, "entries"));
    await mkdir(join(root, "entries", "z"));
    await mkdir(join(root, "entries", "a"));
    await writeFile(join(root, "entries", "file"), "x");
    const reader = new MetadataReader(root, limits);
    await expect(reader.directories("entries")).resolves.toEqual(["a", "z"]);
    await expect(reader.directories("missing")).resolves.toEqual([]);
    await expect(reader.directories("entries/file")).rejects.toMatchObject({
      code: "JQS_INPUT_INVALID",
    });
  });

  it("accepts the directory-entry limit and rejects the next entry", async () => {
    const root = await fixture();
    await mkdir(join(root, "entries"));
    for (let index = 0; index < 8; index++) await mkdir(join(root, "entries", `item-${index}`));
    const bounded = { ...limits, packages: 1 };
    await expect(new MetadataReader(root, bounded).directories("entries")).resolves.toHaveLength(8);
    await mkdir(join(root, "entries", "item-8"));
    await expect(new MetadataReader(root, bounded).directories("entries")).rejects.toMatchObject({
      code: "JQS_SCAN_TRUNCATED",
      exitCode: 0,
    });
  });
});

// @vitest-environment node
import { mkdtemp, realpath, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, it } from "vitest";
import { doctorConsumer } from "./fixtures/doctor-consumer.mjs";

it("runs the real CLI with enforced no-network, no-process, and read-only effect canaries", async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), "jqstar-doctor-consumer-")));
  try {
    const result = await doctorConsumer(resolve("bin/jqstar.mjs"), root);
    expect(result.legacyChecks).toHaveLength(13);
    expect(new Set(result.legacyChecks).size).toBe(13);
    expect(result).toMatchObject({
      lockFormats: 4,
      effectCanaries: 3,
    });
  } finally {
    await rm(root, { recursive: true, force: true });
  }
}, 30000);

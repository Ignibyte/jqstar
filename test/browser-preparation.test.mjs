// @vitest-environment node
import { describe, expect, it } from "vitest";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { prepareBrowserFixtures } from "../scripts/prepare-browser-fixtures.mjs";
import { verifyMobileReferenceUMD } from "../scripts/quality/mobile-reference.mjs";

describe("browser fixture preparation", () => {
  it("finishes built assets and both research prerequisites in order", async () => {
    const calls = [];
    await prepareBrowserFixtures({
      run: async (options) => {
        calls.push(options);
        return { exitCode: 0, timedOut: false, spawnError: null };
      },
    });
    expect(calls.map(({ args }) => args)).toEqual([
      ["run", "build:self-hosted"],
      ["scripts/prepare-resource-strategy.mjs"],
      ["scripts/prepare-navigation-decision.mjs"],
    ]);
    expect(calls.every(({ timeoutMs }) => timeoutMs === 600_000)).toBe(true);
  });

  it.each([
    { exitCode: 1 },
    { exitCode: 0, timedOut: true },
    { exitCode: null, spawnError: "unavailable" },
  ])("stops immediately when preparation fails: %j", async (failure) => {
    let calls = 0;
    await expect(
      prepareBrowserFixtures({
        run: async () => {
          calls += 1;
          return failure;
        },
      }),
    ).rejects.toThrow("Browser fixture preparation failed: self-hosted assets.");
    expect(calls).toBe(1);
  });

  it("removes its signal listeners after failure", async () => {
    const before = [process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")];
    await expect(
      prepareBrowserFixtures({
        run: async () => {
          throw new Error("spawn failed");
        },
      }),
    ).rejects.toThrow("spawn failed");
    expect([process.listenerCount("SIGINT"), process.listenerCount("SIGTERM")]).toEqual(before);
  });
});

it("requires the extracted Mobile UMD to match its reviewed byte measurement", async () => {
  const directory = await mkdtemp(join(tmpdir(), "jqstar-mobile-reference-"));
  try {
    const artifact = join(directory, "jquery-star.umd.cjs");
    await writeFile(artifact, "fixture");
    expect(await verifyMobileReferenceUMD(artifact, 7)).toBe(7);
    await expect(verifyMobileReferenceUMD(artifact, 8)).rejects.toThrow(
      "reviewed measurement is 8",
    );
    await expect(verifyMobileReferenceUMD(artifact, 0)).rejects.toThrow("positive integer");
    await expect(verifyMobileReferenceUMD(directory, 7)).rejects.toThrow("Mobile reference UMD");
    await expect(verifyMobileReferenceUMD(join(directory, "absent"), 7)).rejects.toThrow();
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

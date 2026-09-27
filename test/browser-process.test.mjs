// @vitest-environment node
import { describe, expect, it } from "vitest";
import { runPlaywright } from "../scripts/quality/browser-process.mjs";

const passed = {
  exitCode: 0,
  signal: null,
  timedOut: false,
  spawnError: null,
  durationMs: 893_364,
  stdout: "executed results",
  stderr: "retained diagnostics",
};

describe("browser process execution", () => {
  it.each([1, 2])(
    "preserves the per-repetition allowance for %i repetition(s)",
    async (repeatEach) => {
      const args = ["--no-install", "playwright", "test", `--repeat-each=${repeatEach}`];
      const env = { JQS_BROWSER_SEED: "430044", CI: "1" };
      const calls = [];
      const result = await runPlaywright(args, {
        env,
        repeatEach,
        run: async (options) => {
          calls.push(options);
          return passed;
        },
      });
      expect(calls).toHaveLength(1);
      expect(calls[0]).toMatchObject({ args, env, timeoutMs: 900_000 * repeatEach });
      expect(result).toEqual({ ...passed, timeoutMs: 900_000 * repeatEach, failureReason: null });
    },
  );

  it.each([0, -1, 1.5, NaN, Infinity, Number.MAX_SAFE_INTEGER])(
    "rejects an invalid or overflowing timer before spawning: %s",
    async (repeatEach) => {
      let calls = 0;
      await expect(
        runPlaywright([], {
          repeatEach,
          run: async () => {
            calls++;
            return passed;
          },
        }),
      ).rejects.toThrow("process timer range");
      expect(calls).toBe(0);
    },
  );

  it.each([
    [{ timedOut: true }, "timed out after 1800000 ms"],
    [{ signal: "SIGTERM" }, "terminated by SIGTERM"],
    [
      { spawnError: new Error("missing executable") },
      "could not start Playwright: missing executable",
    ],
    [{ exitCode: 7 }, "exited with 7"],
    [{ exitCode: null }, "exited with null"],
  ])("retains process failures without retrying: %j", async (failure, reason) => {
    let calls = 0;
    const observed = { ...passed, ...failure };
    const result = await runPlaywright([], {
      repeatEach: 2,
      run: async () => {
        calls++;
        return observed;
      },
    });
    expect(result).toEqual({ ...observed, timeoutMs: 1_800_000, failureReason: reason });
    expect(calls).toBe(1);
  });
});

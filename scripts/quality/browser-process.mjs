import { runChild } from "./lib/process.mjs";

// Keep the same execution allowance for each requested repetition.
export async function runPlaywright(
  args,
  { env = process.env, repeatEach = 1, run = runChild } = {},
) {
  const timeoutMs = 900_000 * repeatEach;
  if (!Number.isSafeInteger(repeatEach) || repeatEach < 1 || timeoutMs > 2_147_483_647) {
    throw new Error("Browser repetitions exceed the supported process timer range.");
  }
  const result = await run({
    command: process.platform === "win32" ? "npx.cmd" : "npx",
    args,
    cwd: process.cwd(),
    env,
    timeoutMs,
  });
  let failureReason = null;
  if (result.spawnError)
    failureReason = `could not start Playwright: ${result.spawnError.message ?? String(result.spawnError)}`;
  else if (result.timedOut) failureReason = `timed out after ${timeoutMs} ms`;
  else if (result.signal) failureReason = `terminated by ${result.signal}`;
  else if (result.exitCode !== 0) failureReason = `exited with ${String(result.exitCode)}`;
  return { ...result, timeoutMs, failureReason };
}

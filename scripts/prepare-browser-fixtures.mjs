import { pathToFileURL } from "node:url";
import { runChild, terminateActiveChildren } from "./quality/lib/process.mjs";

export async function prepareBrowserFixtures({ run = runChild, cwd = process.cwd() } = {}) {
  const npm = process.platform === "win32" ? "npm.cmd" : "npm";
  const steps = [
    ["self-hosted assets", npm, ["run", "build:self-hosted"]],
    ["resource research", process.execPath, ["scripts/prepare-resource-strategy.mjs"]],
    ["installed navigation", process.execPath, ["scripts/prepare-navigation-decision.mjs"]],
  ];
  let interrupted = false;
  const interrupt = () => {
    interrupted = true;
    terminateActiveChildren();
  };
  process.once("SIGINT", interrupt);
  process.once("SIGTERM", interrupt);
  try {
    for (const [name, command, args] of steps) {
      if (interrupted) throw new Error("Browser fixture preparation interrupted.");
      process.stdout.write(`Preparing browser fixture: ${name}.\n`);
      const result = await run({ command, args, cwd, env: process.env, timeoutMs: 600_000 });
      process.stdout.write(result.stdout ?? "");
      process.stderr.write(result.stderr ?? "");
      if (interrupted || result.exitCode !== 0 || result.timedOut || result.spawnError) {
        throw new Error(`Browser fixture preparation failed: ${name}.`);
      }
    }
  } finally {
    process.off("SIGINT", interrupt);
    process.off("SIGTERM", interrupt);
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await prepareBrowserFixtures();
}

import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const terminationSignals = ["SIGHUP", "SIGINT", "SIGTERM"];

function describe(error) {
  return error instanceof Error ? error.message : String(error);
}

export async function createOwnedTemporaryDirectory({ parent = tmpdir(), prefix } = {}) {
  if (!prefix) throw new Error("An owned temporary directory requires a prefix.");
  const directory = await mkdtemp(join(parent, prefix));
  const handlers = new Map();
  let cleanupPromise;
  let terminatingSignal;

  const unregister = () => {
    for (const [signal, handler] of handlers) process.off(signal, handler);
    handlers.clear();
  };
  const cleanup = async () => {
    cleanupPromise ??= rm(directory, { force: true, recursive: true });
    try {
      await cleanupPromise;
    } finally {
      unregister();
    }
  };

  for (const signal of terminationSignals) {
    const handler = () => {
      if (terminatingSignal) return;
      terminatingSignal = signal;
      void cleanup()
        .catch((error) => {
          process.stderr.write(
            `Could not remove temporary directory ${directory}: ${describe(error)}\n`,
          );
        })
        .finally(() => process.kill(process.pid, signal));
    };
    handlers.set(signal, handler);
    process.once(signal, handler);
  }

  return { cleanup, directory };
}

export async function withOwnedTemporaryDirectory(options, work) {
  const owned = await createOwnedTemporaryDirectory(options);
  try {
    return await work(owned.directory);
  } finally {
    await owned.cleanup();
  }
}

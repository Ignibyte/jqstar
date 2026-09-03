import { writeFile } from "node:fs/promises";
import { join } from "node:path";

import { withOwnedTemporaryDirectory } from "../../scripts/quality/lib/owned-temporary-directory.mjs";

const parent = process.argv[2];
if (!parent) throw new Error("The signal fixture requires a temporary parent directory.");

await withOwnedTemporaryDirectory({ parent, prefix: "signal-" }, async (directory) => {
  await writeFile(join(directory, "owned.txt"), "owned\n", "utf8");
  process.stdout.write(`${directory}\n`);
  await new Promise(() => setInterval(() => {}, 1_000));
});

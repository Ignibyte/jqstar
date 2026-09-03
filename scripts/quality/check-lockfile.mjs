import { pathToFileURL } from "node:url";
import { readJSON, run } from "./static-lib.mjs";

export function validateLockfile(manifest, lockfile) {
  const errors = [];
  if (lockfile.lockfileVersion !== 3)
    errors.push(`Expected npm lockfileVersion 3, got ${String(lockfile.lockfileVersion)}.`);
  const root = lockfile.packages?.[""];
  if (!root) return [...errors, "package-lock.json has no root package record."];
  for (const group of ["dependencies", "devDependencies", "peerDependencies"]) {
    const expected = manifest[group] ?? {};
    const actual = root[group] ?? {};
    if (JSON.stringify(expected) !== JSON.stringify(actual))
      errors.push(`package-lock.json ${group} does not match package.json.`);
  }
  return errors;
}

async function main() {
  const errors = validateLockfile(
    await readJSON("package.json"),
    await readJSON("package-lock.json"),
  );
  const tree = await run("npm", ["ls", "--all", "--json"], { capture: true });
  if (tree.code !== 0)
    errors.push(`npm dependency tree is invalid:\n${tree.stderr || tree.stdout}`);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write("lockfile: manifest and installed dependency tree agree\n");
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

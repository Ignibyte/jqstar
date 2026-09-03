import { pathToFileURL } from "node:url";
import { readJSON, run } from "./static-lib.mjs";

function licenseNames(value) {
  if (Array.isArray(value)) return value.flatMap(licenseNames);
  return String(value ?? "UNKNOWN")
    .split(/\s+OR\s+|\s+AND\s+/)
    .map((name) => name.replace(/[()]/g, "").trim());
}

export function validateLicenses(packages, policy) {
  const allowed = new Set(policy.allowed);
  const errors = [];
  for (const [name, metadata] of Object.entries(packages)) {
    const licenses = licenseNames(metadata.licenses);
    if (!licenses.some((license) => allowed.has(license))) {
      errors.push(`${name}: disallowed or unknown license ${licenses.join(" OR ")}`);
    }
  }
  return errors;
}

async function main() {
  const result = await run(
    "npx",
    ["--no-install", "license-checker-rseidelsohn", "--json", "--production"],
    { capture: true },
  );
  if (result.code !== 0) throw new Error(`license checker failed:\n${result.stderr}`);
  let packages;
  try {
    packages = JSON.parse(result.stdout);
  } catch (error) {
    throw new Error("license checker returned unreadable JSON.", { cause: error });
  }
  const errors = validateLicenses(packages, await readJSON("quality/licenses.json"));
  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(`licenses: ${Object.keys(packages).length} production packages approved\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

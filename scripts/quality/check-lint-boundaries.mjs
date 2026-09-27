import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";
import { ESLint } from "eslint";
import { existedAtRevision, loadQualityScope, repoPath } from "./lib.mjs";
import { qualityPaths, readJSON, repositoryRoot } from "./static-lib.mjs";

export const countedRules = [
  "no-base-to-string",
  "no-dynamic-delete",
  "no-non-null-assertion",
  "no-this-alias",
  "no-unnecessary-condition",
  "no-unnecessary-type-conversion",
  "no-unnecessary-type-parameters",
].map((rule) => `@typescript-eslint/${rule}`);
const key = ({ path, rule }) => `${path}:${rule}`;

export function validateBoundaryInventory(
  inventory,
  paths,
  today = new Date().toISOString().slice(0, 10),
) {
  const errors = [];
  if (inventory.schema !== "jqstar-lint-boundaries/1")
    errors.push("Unsupported lint boundary inventory.");
  if (!/^\d{4}-\d{2}-\d{2}$/u.test(inventory.reviewAfter) || inventory.reviewAfter < today)
    errors.push("Lint boundaries require a current review date.");
  if (
    JSON.stringify(inventory.rules.map(({ rule }) => rule).sort()) !==
    JSON.stringify([...countedRules].sort())
  )
    errors.push("The counted typed-rule inventory changed.");
  const knownPaths = new Set(paths);
  const seen = new Set();
  for (const item of inventory.allowances) {
    if (
      !knownPaths.has(item.path) ||
      [..."*?{}[]!"].some((character) => item.path.includes(character)) ||
      !item.path.endsWith(".ts") ||
      !countedRules.includes(item.rule) ||
      !Number.isSafeInteger(item.count) ||
      item.count < 1
    )
      errors.push(`Invalid lint boundary ${key(item)}.`);
    if (seen.has(key(item))) errors.push(`Duplicate lint boundary ${key(item)}.`);
    seen.add(key(item));
  }
  return errors;
}

export function compareBoundaryCounts(inventory, actual, baseline) {
  const errors = [];
  const expected = new Map(inventory.allowances.map((item) => [key(item), item.count]));
  for (const name of new Set([...expected.keys(), ...actual.keys()])) {
    if ((expected.get(name) ?? 0) !== (actual.get(name) ?? 0))
      errors.push(
        `${name}: recorded ${expected.get(name) ?? 0}, observed ${actual.get(name) ?? 0}; review the use or reduce its allowance.`,
      );
  }
  if (baseline) {
    const prior = new Map(baseline.allowances.map((item) => [key(item), item.count]));
    for (const [name, count] of expected)
      if (count > (prior.get(name) ?? 0))
        errors.push(`${name}: allowance ${count} exceeds immutable-base ${prior.get(name) ?? 0}.`);
  }
  return errors;
}

async function main() {
  const inventory = await readJSON("quality/lint-boundaries.json");
  const paths = await qualityPaths();
  const errors = validateBoundaryInventory(inventory, paths);
  if (errors.length > 0) throw new Error(errors.join("\n"));
  const lint = new ESLint({
    cwd: repositoryRoot,
    overrideConfig: [
      {
        files: ["**/*.ts"],
        rules: Object.fromEntries(countedRules.map((rule) => [rule, "error"])),
      },
    ],
  });
  const selected = paths.filter((path) =>
    /^(src|server|registry\/blocks|test|e2e|example)\/.+\.ts$/u.test(path),
  );
  if (selected.length === 0) throw new Error("Lint boundary probe selected no TypeScript.");
  const results = await lint.lintFiles(selected);
  const actual = new Map();
  for (const file of results)
    for (const message of file.messages) {
      if (message.fatal) errors.push(`Lint boundary probe failed to parse ${file.filePath}.`);
      if (!countedRules.includes(message.ruleId)) continue;
      const name = key({
        path: file.filePath.slice(repositoryRoot.length + 1).replaceAll("\\", "/"),
        rule: message.ruleId,
      });
      actual.set(name, (actual.get(name) ?? 0) + 1);
    }
  const scope = await loadQualityScope();
  const revision = scope.base ?? scope.head;
  const path = "quality/lint-boundaries.json";
  const baseline =
    revision && existedAtRevision(path, revision)
      ? JSON.parse(
          execFileSync("git", ["show", `${revision}:${path}`], {
            cwd: repoPath("."),
            encoding: "utf8",
          }),
        )
      : null;
  errors.push(...compareBoundaryCounts(inventory, actual, baseline));
  if (errors.length > 0) throw new Error(errors.join("\n"));
  process.stdout.write(
    `lint boundaries: ${selected.length} TypeScript files, ${actual.size} exact file/rule counts, ${baseline ? "immutable-base ratchet" : "initial measured baseline"}\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

import ts from "typescript";
import { readFile, readdir } from "node:fs/promises";

import { classifyPath, listFiles, pathExists, readJson, repoPath } from "./lib.mjs";

export async function collectCensusFiles(census) {
  const files = [];
  for (const directory of census.scan.directories) {
    const absolute = repoPath(directory);
    if (!(await pathExists(absolute)))
      throw new Error(`Production census root is missing: ${directory}`);
    files.push(...(await listFiles(absolute)));
  }
  for (const path of census.scan.rootPaths) {
    if (!(await pathExists(repoPath(path))))
      throw new Error(`Production census path is missing: ${path}`);
    files.push(path);
  }
  const rootEntries = (await readdir(repoPath("."), { withFileTypes: true }))
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name);
  files.push(
    ...rootEntries.filter(
      (path) =>
        !path.includes("/") && census.scan.rootSuffixes.some((suffix) => path.endsWith(suffix)),
    ),
  );
  return [...new Set(files)].sort();
}

export function validateClassifications(census, files, packageScripts) {
  const failures = [];
  const assignments = [];
  for (const path of files) {
    const rules = classifyPath(path, census);
    if (rules.length !== 1) {
      failures.push(`${path}: expected exactly one classification, found ${rules.length}.`);
      continue;
    }
    const rule = rules[0];
    assignments.push({ path, rule: rule.id, kind: rule.kind });
    if (rule.kind !== "coverage") {
      if (!Array.isArray(rule.evidence) || rule.evidence.length === 0) {
        failures.push(`${rule.id}: non-coverage classification has no evidence command.`);
      }
      for (const command of rule.evidence ?? []) {
        const match = /^npm run ([\w:-]+)$/.exec(command);
        if (!match || !packageScripts[match[1]])
          failures.push(`${rule.id}: unknown evidence ${command}.`);
      }
    }
  }
  return { assignments, failures };
}

export function emittedRuntimeJavaScript(source, path) {
  return ts
    .transpileModule(source, {
      compilerOptions: {
        module: ts.ModuleKind.ESNext,
        target: ts.ScriptTarget.ES2022,
        verbatimModuleSyntax: true,
        removeComments: true,
      },
      fileName: path,
    })
    .outputText.replace(/\s*export\s*\{\s*\};?\s*/gu, "")
    .trim();
}

function needsRuntimeClassification({ path, kind }) {
  return (
    (kind === "coverage" || kind === "semantic-exclusion") &&
    path.endsWith(".ts") &&
    !path.endsWith(".d.ts")
  );
}

export function validateRuntimeClassifications(assignments, sourcesByPath) {
  const failures = [];
  for (const assignment of assignments.filter(needsRuntimeClassification)) {
    const { path, kind } = assignment;
    const source = sourcesByPath[path];
    if (typeof source !== "string") {
      failures.push(`${path}: source is missing for runtime classification.`);
      continue;
    }
    const emitted = emittedRuntimeJavaScript(source, path);
    if (kind === "coverage" && !emitted)
      failures.push(`${path}: runtime coverage contains no runtime JavaScript.`);
    if (kind === "semantic-exclusion" && emitted)
      failures.push(`${path}: semantic exclusion emits runtime JavaScript.`);
  }
  return failures;
}

async function main() {
  const census = await readJson(repoPath("quality/production-census.json"));
  if (census.$schema !== "jqstar-production-census/1") {
    throw new Error(`Unsupported production census schema ${String(census.$schema)}.`);
  }
  const packageJson = await readJson(repoPath("package.json"));
  const files = await collectCensusFiles(census);
  const result = validateClassifications(census, files, packageJson.scripts ?? {});
  const sourcesByPath = Object.fromEntries(
    await Promise.all(
      result.assignments
        .filter(needsRuntimeClassification)
        .map(async ({ path }) => [path, await readFile(repoPath(path), "utf8")]),
    ),
  );
  result.failures.push(...validateRuntimeClassifications(result.assignments, sourcesByPath));
  if (result.failures.length > 0) {
    throw new Error(
      `Production census failed:\n${result.failures.map((failure) => `- ${failure}`).join("\n")}`,
    );
  }
  const counts = Object.fromEntries(
    [...new Set(result.assignments.map((assignment) => assignment.kind))]
      .sort()
      .map((kind) => [
        kind,
        result.assignments.filter((assignment) => assignment.kind === kind).length,
      ]),
  );
  console.log(`Production census classified ${result.assignments.length} artifacts.`);
  console.log(JSON.stringify(counts, null, 2));
}

if (process.argv[1] && import.meta.url === new URL(`file://${process.argv[1]}`).href) {
  main().catch((error) => {
    console.error(error.message);
    process.exitCode = 1;
  });
}

import { pathToFileURL } from "node:url";
import { fail, qualityPaths, readJSON } from "./static-lib.mjs";

export function compileScopes(configuration) {
  if (configuration.schemaVersion !== "jqstar-quality-scopes/1") {
    throw new Error(`Unsupported quality scope schema: ${String(configuration.schemaVersion)}`);
  }
  const ids = new Set();
  return configuration.scopes.map((scope) => {
    if (ids.has(scope.id)) throw new Error(`Duplicate quality scope ID: ${scope.id}`);
    ids.add(scope.id);
    let matcher;
    try {
      matcher = new RegExp(scope.match);
    } catch (error) {
      throw new Error(`Invalid matcher for quality scope ${scope.id}.`, { cause: error });
    }
    return { ...scope, matcher };
  });
}

export function classifyPaths(paths, configuration) {
  const scopes = compileScopes(configuration);
  const counts = new Map(scopes.map((scope) => [scope.id, 0]));
  const errors = [];
  const assignments = new Map();

  for (const path of paths) {
    const matches = scopes.filter((scope) => scope.matcher.test(path));
    if (matches.length === 0) {
      errors.push(`Unexamined quality path: ${path}`);
      continue;
    }
    if (matches.length > 1) {
      errors.push(`Ambiguous quality path ${path}: ${matches.map((scope) => scope.id).join(", ")}`);
      continue;
    }
    const scope = matches[0];
    assignments.set(path, scope.id);
    counts.set(scope.id, (counts.get(scope.id) ?? 0) + 1);
  }

  for (const scope of scopes) {
    if (scope.required && counts.get(scope.id) === 0) {
      errors.push(`Required quality scope matched no files: ${scope.id}`);
    }
  }
  return { assignments, counts, errors };
}

async function main() {
  const configuration = await readJSON("quality/scopes.json");
  const result = classifyPaths(await qualityPaths(), configuration);
  if (result.errors.length > 0) {
    fail(result.errors);
    return;
  }
  for (const [id, count] of [...result.counts].sort(([left], [right]) =>
    left.localeCompare(right),
  )) {
    process.stdout.write(`${id}: ${count}\n`);
  }
  process.stdout.write(
    `quality scope census: ${result.assignments.size} files assigned exactly once\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

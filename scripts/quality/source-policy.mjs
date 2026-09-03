import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { fail, qualityPaths, readJSON, repositoryRoot } from "./static-lib.mjs";

const codePath = /^(src|server|registry\/blocks|bin|scripts|test|e2e|example)\/.*\.(?:[cm]?js|ts)$/;
const productionPath = /^(src|server|registry\/blocks|bin)\/.*\.(?:[cm]?js|ts)$/;
const executableOrConfig = /(?:\.(?:[cm]?js|ts|jsonc?|ya?ml|toml)$|^\.githooks\/)/;
const testPath = /^(test|e2e)\/.*\.(?:[cm]?js|ts)$/;
const generatedIgnoreRoots = new Set([
  "coverage",
  "demo-dist",
  "dist",
  "node_modules",
  "playwright-report",
  "server-dist",
  "test-results",
]);
const policyImplementationPath =
  /^scripts\/quality\/(?:source-policy|static-self-test|tool-self-test)\.mjs$/;
const packageContractTestPath = /^scripts\/quality-package\.mjs$/;

const rules = [
  {
    id: "suppression/eslint",
    applies: (path) => executableOrConfig.test(path) && !policyImplementationPath.test(path),
    expression: /eslint-(?:disable|disable-next-line|disable-line)/,
    message: "Inline ESLint suppression requires a live quality deviation.",
  },
  {
    id: "suppression/typescript",
    applies: (path) => executableOrConfig.test(path) && !policyImplementationPath.test(path),
    expression: /@ts-(?:ignore|expect-error|nocheck)/,
    message: "TypeScript suppression requires a live quality deviation.",
  },
  {
    id: "suppression/coverage",
    applies: (path) => executableOrConfig.test(path) && !policyImplementationPath.test(path),
    expression: /(?:istanbul|c8|v8)\s+ignore/i,
    message: "Coverage suppression requires a live quality deviation.",
  },
  {
    id: "suppression/semgrep",
    applies: (path) => executableOrConfig.test(path) && !policyImplementationPath.test(path),
    expression: /nosemgrep/i,
    message: "Semgrep suppression requires a live quality deviation.",
  },
  {
    id: "tests/focused-or-skipped",
    applies: (path) => testPath.test(path),
    expression:
      /\b(?:describe|it|test)\.(?:only|skip|todo)\s*\(|\b(?:f|x)(?:describe|it|test)\s*\(/,
    message: "Focused, skipped, or TODO tests are not delivery evidence.",
  },
  {
    id: "source/dynamic-evaluation",
    applies: (path) => codePath.test(path) && path !== "src/expression.ts",
    expression: /\beval\s*\(|\bnew\s+Function\s*\(/,
    message: "Dynamic evaluation is allowed only in src/expression.ts.",
  },
  {
    id: "source/private-package-entry",
    applies: (path) => codePath.test(path) && !packageContractTestPath.test(path),
    expression: /["']jquery-star\/(?:src|dist|internal)\//,
    message: "Import only declared jquery-star package entry points.",
  },
  {
    id: "source/production-test-import",
    applies: (path) => productionPath.test(path),
    expression:
      /(?:from\s+|import\s+(?:[^'"\n]+\s+from\s+)?|import\s*\(|require\s*\()\s*["'](?:vitest|@playwright\/test|jsdom|\.\.?\/(?:test|e2e)(?:\/|["']))/,
    message: "Production code cannot import test-only packages or paths.",
  },
  {
    id: "source/unowned-global-write",
    applies: (path) => productionPath.test(path),
    expression: /\b(?:globalThis|window)(?:\.[A-Za-z_$][\w$]*|\[['"][^'"\n]+['"]\])\s*=(?!=)/,
    message: "Global writes must go through an owned document or kernel capability.",
  },
  {
    id: "source/unsafe-request-path",
    applies: (path) => /^(server|bin)\//.test(path),
    expression: /\b(?:join|resolve)\s*\([^\n)]*\b(?:req|request|params|query|body)\b/i,
    message: "Request-controlled path input requires an explicit containment check.",
  },
  {
    id: "source/handwritten-datastar-event",
    applies: (path) => /^(server|registry\/blocks)\//.test(path),
    expression: /(?:event|data):\s*(?:datastar|jquery-star)-(?:patch|execute)/,
    message: "Generate Datastar SSE with @starfederation/datastar-sdk.",
  },
  {
    id: "source/csp-trusted-engine-edge",
    applies: (path) => /^src\/csp\//.test(path),
    expression:
      /(?:from\s+|import\s+(?:[^'"\n]+\s+from\s+)?|import\s*\()\s*["'](?:[^"']*\/)?(?:expression(?:\.[cm]?[jt]s)?|[^/"']*trusted[^/"']*)["']/,
    message: "The CSP graph cannot import the trusted expression compiler.",
  },
];

function lineNumber(source, offset) {
  return source.slice(0, offset).split("\n").length;
}

function activeDeviation(deviations, path, rule, line, marker) {
  const today = new Date().toISOString().slice(0, 10);
  return deviations.some(
    (deviation) =>
      marker.includes(deviation.id) &&
      deviation.path === path &&
      deviation.rule === rule &&
      deviation.lineStart <= line &&
      deviation.lineEnd >= line &&
      deviation.expires >= today,
  );
}

export function validateDeviations(deviationFile, sources = new Map()) {
  const errors = [];
  if (deviationFile.schemaVersion !== "jqstar-quality-deviations/1") {
    errors.push(`Unsupported deviation schema: ${String(deviationFile.schemaVersion)}`);
    return errors;
  }
  const ids = new Set();
  const today = new Date().toISOString().slice(0, 10);
  for (const deviation of deviationFile.deviations) {
    if (ids.has(deviation.id)) errors.push(`Duplicate quality deviation: ${deviation.id}`);
    ids.add(deviation.id);
    if (deviation.lineEnd < deviation.lineStart)
      errors.push(`${deviation.id} has an inverted range.`);
    if (deviation.expires < today) errors.push(`${deviation.id} expired on ${deviation.expires}.`);
    const source = sources.get(deviation.path);
    if (source !== undefined && !source.includes(`quality-deviation: ${deviation.id}`)) {
      errors.push(`${deviation.id} has no live marker in ${deviation.path}.`);
    }
  }
  return errors;
}

export function scanSourcePolicy(
  sources,
  deviationFile = { schemaVersion: "jqstar-quality-deviations/1", deviations: [] },
) {
  const violations = validateDeviations(deviationFile, sources);
  for (const [path, source] of sources) {
    const lines = source.split("\n");
    for (const rule of policyImplementationPath.test(path) ? [] : rules) {
      if (!rule.applies(path)) continue;
      const flags = rule.expression.flags.replace("g", "");
      const expression = new RegExp(rule.expression.source, flags);
      const match = expression.exec(source);
      if (!match) continue;
      const line = lineNumber(source, match.index);
      const marker = `${lines[line - 2] ?? ""}\n${lines[line - 1] ?? ""}`;
      if (!activeDeviation(deviationFile.deviations, path, rule.id, line, marker)) {
        violations.push(`${path}:${line} [${rule.id}] ${rule.message}`);
      }
    }

    if (
      !path.startsWith("docs/tickets/0042-") &&
      path !== "docs/QUALITY_PROGRAM.md" &&
      !policyImplementationPath.test(path) &&
      (codePath.test(path) || path.endsWith(".md"))
    ) {
      const todo =
        /\b(?:TODO|FIXME)\b(?!\(JQS-[0-9]{4}, expires=[0-9]{4}-[0-9]{2}-[0-9]{2}\))/g.exec(source);
      if (todo) {
        violations.push(
          `${path}:${lineNumber(source, todo.index)} [source/actionable-todo] TODO/FIXME needs a JQS ticket and expiry.`,
        );
      }
    }

    if (executableOrConfig.test(path) && !policyImplementationPath.test(path)) {
      const broad =
        /(?:ignore|exclude|allowlist)[^\n]{0,80}["'](?:\*\*\/\*|\*\*|src\/\*\*|server\/\*\*|test\/\*\*)["']/i.exec(
          source,
        );
      if (broad) {
        const value = broad[0];
        const generated = [...generatedIgnoreRoots].some((root) => value.includes(`${root}/**`));
        if (!generated) {
          violations.push(
            `${path}:${lineNumber(source, broad.index)} [configuration/broad-ignore] Broad quality ignores require a live deviation.`,
          );
        }
      }
    }
  }
  return violations;
}

async function main() {
  const paths = await qualityPaths();
  const sources = new Map();
  for (const path of paths) {
    if (!executableOrConfig.test(path) && !path.endsWith(".md")) continue;
    sources.set(path, await readFile(resolve(repositoryRoot, path), "utf8"));
  }
  const violations = scanSourcePolicy(sources, await readJSON("quality/deviations.json"));
  if (violations.length > 0) {
    fail(violations);
    return;
  }
  process.stdout.write(`source policy: ${sources.size} files checked, no unapproved deviations\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}

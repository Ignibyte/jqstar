import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

interface CensusRule {
  kind: string;
  coverageGlobs?: string[];
}

interface Census {
  coverageExcludeGlobs: string[];
  rules: CensusRule[];
}

const census = JSON.parse(
  readFileSync(new URL("./quality/production-census.json", import.meta.url), "utf8"),
) as Census;

const include = census.rules.flatMap((rule) =>
  rule.kind === "coverage" ? (rule.coverageGlobs ?? []) : [],
);

export default defineConfig({
  resolve: {
    alias: [
      { find: /^jquery-star$/, replacement: resolve("src/index.ts") },
      { find: /^jquery-star\/core$/, replacement: resolve("src/core.ts") },
      { find: /^jquery-star\/csp$/, replacement: resolve("src/csp.ts") },
      {
        find: /^jquery-star\/datastar\/testing$/,
        replacement: resolve("src/datastar/testing.ts"),
      },
      { find: /^jquery-star\/datastar$/, replacement: resolve("src/datastar.ts") },
      { find: /^jquery-star\/testing$/, replacement: resolve("src/testing/index.ts") },
      { find: /^jquery-star\/turbo$/, replacement: resolve("src/turbo.ts") },
      { find: /^jquery-star\/ui$/, replacement: resolve("src/ui.ts") },
    ],
  },
  test: {
    environment: "jsdom",
    exclude: [
      ".git/**",
      "coverage/**",
      "demo-dist/**",
      "e2e/**",
      "node_modules/**",
      "dist/**",
      "playwright-report/**",
      "server-dist/**",
      "test-results/**",
      "test/quality-runner.test.mjs",
      "test/ticket-workflow.test.mjs",
    ],
    maxWorkers: Number(process.env.JQS_TEST_WORKERS ?? 2),
    minWorkers: 1,
    coverage: {
      enabled: true,
      provider: "v8",
      reportsDirectory: process.env.JQS_COVERAGE_DIRECTORY ?? "coverage/quality",
      all: true,
      include,
      exclude: census.coverageExcludeGlobs,
      reporter: ["text", "json", "json-summary", "lcov"],
      reportOnFailure: true,
    },
  },
});

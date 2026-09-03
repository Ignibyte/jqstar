import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: [
      { find: /^jquery-star$/, replacement: resolve("src/index.ts") },
      { find: /^jquery-star\/core$/, replacement: resolve("src/core.ts") },
      { find: /^jquery-star\/testing$/, replacement: resolve("src/testing/index.ts") },
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
      include: ["src/**/*.ts"],
      exclude: ["src/types.ts"],
      reporter: ["text", "html"],
      thresholds: {
        statements: 85,
        branches: 70,
        functions: 80,
        lines: 85,
      },
    },
  },
});

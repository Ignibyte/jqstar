import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    exclude: ["e2e/**", "node_modules/**", "dist/**"],
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

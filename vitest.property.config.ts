import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "jsdom",
    include: ["test/property/**/*.test.ts"],
    exclude: [".git/**", "e2e/**", "node_modules/**", "dist/**"],
    maxWorkers: Number(process.env.JQS_TEST_WORKERS ?? 2),
    minWorkers: 1,
    coverage: { enabled: false },
    sequence: { shuffle: false },
  },
});

import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        "jquery-star": resolve(__dirname, "src/index.ts"),
        core: resolve(__dirname, "src/core.ts"),
        ui: resolve(__dirname, "src/ui.ts"),
        datastar: resolve(__dirname, "src/datastar.ts"),
        testing: resolve(__dirname, "src/testing/index.ts"),
        turbo: resolve(__dirname, "src/turbo.ts"),
        "datastar-testing": resolve(__dirname, "src/datastar/testing.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 2,
      },
    },
    rollupOptions: {
      external: ["jquery"],
      output: {
        compact: true,
        globals: {
          jquery: "jQuery",
        },
        manualChunks(id) {
          if (
            id.endsWith("/src/render-adapter.ts") ||
            id.endsWith("/src/trusted-runtime.ts") ||
            id.endsWith("/src/expression.ts")
          ) {
            return "render-adapter";
          }
        },
      },
    },
    sourcemap: true,
  },
});

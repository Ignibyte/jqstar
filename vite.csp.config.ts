import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/csp.ts"),
      formats: ["es", "cjs"],
      fileName: (format) => `csp.${format === "es" ? "js" : "cjs"}`,
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
      },
    },
    sourcemap: true,
  },
});

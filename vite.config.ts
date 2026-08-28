import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "jQueryStar",
      formats: ["es", "umd"],
      fileName: (format) => (format === "es" ? "jquery-star.js" : "jquery-star.umd.cjs"),
    },
    rollupOptions: {
      external: ["jquery"],
      output: {
        globals: {
          jquery: "jQuery",
        },
      },
    },
    sourcemap: true,
  },
});

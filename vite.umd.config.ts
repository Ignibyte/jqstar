import { resolve } from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
  build: {
    emptyOutDir: false,
    lib: {
      entry: resolve(__dirname, "src/index.ts"),
      name: "jQueryStar",
      formats: ["umd"],
      fileName: () => "jquery-star.umd.cjs",
    },
    minify: "terser",
    terserOptions: {
      compress: {
        passes: 5,
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

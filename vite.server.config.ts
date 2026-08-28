import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    ssr: resolve(__dirname, "server/index.ts"),
    outDir: resolve(__dirname, "server-dist"),
    emptyOutDir: true,
    rollupOptions: {
      output: {
        entryFileNames: "index.mjs",
      },
    },
  },
});

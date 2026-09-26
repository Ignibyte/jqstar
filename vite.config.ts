import { runtimePropertyMangle } from "./config/runtime-private-properties";
import { defineConfig } from "vite";
import { resolve } from "node:path";

export default defineConfig({
  build: {
    lib: {
      entry: {
        "jquery-star": resolve(__dirname, "src/index.ts"),
        core: resolve(__dirname, "src/core.ts"),
        csp: resolve(__dirname, "src/csp.ts"),
        ui: resolve(__dirname, "src/ui.ts"),
        datastar: resolve(__dirname, "src/datastar.ts"),
        htmx: resolve(__dirname, "src/htmx.ts"),
        stores: resolve(__dirname, "src/stores.ts"),
        persist: resolve(__dirname, "src/persist.ts"),
        inspect: resolve(__dirname, "src/inspect/index.ts"),
        testing: resolve(__dirname, "src/testing/index.ts"),
        turbo: resolve(__dirname, "src/turbo.ts"),
        "datastar-testing": resolve(__dirname, "src/datastar/testing.ts"),
      },
      formats: ["es", "cjs"],
      fileName: (format, entryName) => `${entryName}.${format === "es" ? "js" : "cjs"}`,
    },
    minify: "terser",
    terserOptions: {
      mangle: runtimePropertyMangle,
      compress: {
        hoist_funs: true,
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
        manualChunks(id, { getModuleInfo }) {
          const runtimeDependencies = new Set<string>();
          const pending = [resolve(__dirname, "src/runtime.ts")];
          while (pending.length > 0) {
            const moduleId = pending.pop();
            if (!moduleId || runtimeDependencies.has(moduleId)) continue;
            runtimeDependencies.add(moduleId);
            const module = getModuleInfo(moduleId);
            if (module) pending.push(...module.importedIds);
          }
          if (runtimeDependencies.has(id)) return "runtime";
          if (id.endsWith("/src/csp/contract.ts")) return "csp-contract-chunk";
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

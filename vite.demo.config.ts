import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { createProofApi } from "./server/api";

type Next = (error?: unknown) => void;

type MiddlewareStack = {
  use(
    handler: (
      request: IncomingMessage,
      response: ServerResponse,
      next: Next,
    ) => void | Promise<void>,
  ): unknown;
};

function installProofBackend(middlewares: MiddlewareStack): void {
  const api = createProofApi({ environment: "local" });
  middlewares.use(async (request, response, next) => {
    try {
      if (!(await api.handle(request, response))) next();
    } catch (error) {
      next(error);
    }
  });
}

function proofBackend(): Plugin {
  return {
    name: "jquery-star-proof-backend",
    configureServer(server) {
      installProofBackend(server.middlewares);
    },
    configurePreviewServer(server) {
      installProofBackend(server.middlewares);
    },
  };
}

export default defineConfig({
  root: resolve(__dirname, "example"),
  base: process.env.JQS_SITE_BASE ?? "/",
  resolve: {
    alias: {
      "jquery-star": resolve(__dirname, "src/index.ts"),
    },
  },
  define: {
    __JQS_STATIC_DEMO__: JSON.stringify(process.env.JQS_STATIC_DEMO === "true"),
  },
  plugins: [tailwindcss(), proofBackend()],
  build: {
    outDir: resolve(__dirname, "demo-dist"),
    emptyOutDir: true,
  },
});

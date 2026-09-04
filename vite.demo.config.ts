import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { readFileSync } from "node:fs";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";
import { createProofApi } from "./server/api";

const exampleRoot = resolve(__dirname, "example");
const siteEntries = [
  "index.html",
  "docs/index.html",
  "docs/agents/index.html",
  "docs/datastar/index.html",
  "docs/api/index.html",
  "docs/csp/index.html",
  "docs/interoperability/index.html",
  "docs/ecosystem/index.html",
  "docs/ecosystem/jquery-ui/index.html",
  "docs/plugins/index.html",
  "docs/testing/index.html",
  "docs/components/index.html",
  "docs/components/dialog/index.html",
  "docs/components/dropdown/index.html",
  "docs/components/tabs/index.html",
  "docs/components/toast/index.html",
  "components/lab/index.html",
].map((entry) => resolve(exampleRoot, entry));
const docsShellSource = readFileSync(resolve(exampleRoot, "docs-shell.html"), "utf8");
const docsShellMatch = /<template id="jqs-docs-shell">([\s\S]*)<\/template>/.exec(docsShellSource);
if (!docsShellMatch?.[1]) throw new Error("The documentation shell template is invalid.");
const docsShell = docsShellMatch[1];

function documentationShell(): Plugin {
  return {
    name: "jquery-star-documentation-shell",
    transformIndexHtml: {
      order: "pre",
      handler(html) {
        const article = /<article class="docs-article">[\s\S]*<\/article>/.exec(html)?.[0];
        return article ? html.replace(article, docsShell.replace("<slot></slot>", article)) : html;
      },
    },
  };
}

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
  root: exampleRoot,
  base: process.env.JQS_SITE_BASE ?? "/",
  resolve: {
    alias: {
      "jquery-star": resolve(__dirname, "src/index.ts"),
    },
  },
  define: {
    __JQS_STATIC_DEMO__: JSON.stringify(process.env.JQS_STATIC_DEMO === "true"),
  },
  plugins: [documentationShell(), tailwindcss(), proofBackend()],
  build: {
    outDir: resolve(__dirname, "demo-dist"),
    emptyOutDir: true,
    rollupOptions: {
      input: siteEntries,
    },
  },
});

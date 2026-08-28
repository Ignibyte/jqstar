import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import type { IncomingMessage, ServerResponse } from "node:http";
import { resolve } from "node:path";

type MiddlewareStack = {
  use(
    path: string,
    handler: (request: IncomingMessage, response: ServerResponse) => void | Promise<void>,
  ): unknown;
};

const componentSystems = [
  ["jquery-star", "jQuery Star"],
  ["datastar", "Datastar"],
  ["daisyui", "daisyUI"],
  ["radix", "Radix Primitives"],
  ["tailwind", "Tailwind CSS"],
  ["bootstrap", "Bootstrap"],
  ["shoelace", "Shoelace"],
] as const;

const feedItems = [
  {
    value: "jquery-star",
    title: "jQuery Star",
    description: "Reactive HTML components with real jQuery expressions and native forms.",
    meta: "Runtime · Source owned",
  },
  {
    value: "datastar",
    title: "Datastar",
    description: "Server-driven signals and HTML patch events through the official SDK.",
    meta: "Server channel · SDK",
  },
  {
    value: "tailwind",
    title: "Tailwind CSS",
    description: "Build-time utility CSS used to author the compiled jQuery Star theme.",
    meta: "Styling · Build time",
  },
  {
    value: "daisyui",
    title: "daisyUI",
    description: "A Tailwind component plugin built around reusable class combinations.",
    meta: "Styling · Plugin",
  },
  {
    value: "radix",
    title: "Radix Primitives",
    description: "Unstyled React primitives focused on interaction and accessibility behavior.",
    meta: "React · Primitives",
  },
  {
    value: "shadcn",
    title: "shadcn/ui",
    description: "A source-owned component distribution model that inspired this registry.",
    meta: "Source registry · React",
  },
  {
    value: "bootstrap",
    title: "Bootstrap",
    description: "A broad CSS and JavaScript component framework with established conventions.",
    meta: "Framework · CSS and JS",
  },
  {
    value: "shoelace",
    title: "Shoelace",
    description: "Framework-agnostic components distributed as standards-based custom elements.",
    meta: "Web components · Runtime",
  },
  {
    value: "alpine",
    title: "Alpine.js",
    description: "Attribute-driven client behavior for server-rendered HTML applications.",
    meta: "HTML-first · Runtime",
  },
  {
    value: "htmx",
    title: "htmx",
    description: "HTML attributes that extend links and forms with server-driven requests.",
    meta: "HTML-first · Server driven",
  },
  {
    value: "lit",
    title: "Lit",
    description: "A small library for creating standards-based web components.",
    meta: "Web components · Authoring",
  },
  {
    value: "native-html",
    title: "Native HTML",
    description: "Platform controls, forms, dialogs, popovers, and semantic document structure.",
    meta: "Platform · No dependency",
  },
] as const;

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

async function requestText(request: IncomingMessage): Promise<string> {
  let source = "";
  for await (const chunk of request) source += String(chunk);
  return source;
}

async function requestBody(request: IncomingMessage): Promise<Record<string, unknown>> {
  const source = await requestText(request);
  if (!source) return {};
  try {
    const value = JSON.parse(source) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

async function sendWebResponse(source: Response, destination: ServerResponse): Promise<void> {
  destination.writeHead(source.status, Object.fromEntries(source.headers));
  const reader = source.body?.getReader();
  if (!reader) {
    destination.end();
    return;
  }

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    destination.write(Buffer.from(value));
  }
  destination.end();
}

function installProofBackend(middlewares: MiddlewareStack): void {
  let metricsRevision = 0;

  middlewares.use("/api/demo/metrics", (request, response) => {
    if (request.method !== "GET") {
      response.writeHead(405).end();
      return;
    }
    metricsRevision += 1;
    const offset = metricsRevision * 7;
    const body = JSON.stringify({
      labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
      message: `The local backend patched four table rows (revision ${metricsRevision}).`,
      series: [
        [248 + offset, 326 + offset, 391 + offset, 438 + offset],
        [112 + offset, 218 + offset, 284 + offset, 347 + offset],
      ],
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/feed", (request, response) => {
    if (request.method !== "GET") {
      response.writeHead(405).end();
      return;
    }
    const url = new URL(request.url ?? "/", "http://localhost");
    const query = (url.searchParams.get("query") ?? "").trim().toLocaleLowerCase();
    const requestedCursor = Number(url.searchParams.get("cursor") ?? 0);
    const cursor = Number.isInteger(requestedCursor) && requestedCursor >= 0 ? requestedCursor : 0;
    const matches = feedItems.filter((item) =>
      `${item.title} ${item.description} ${item.meta}`.toLocaleLowerCase().includes(query),
    );
    const items = matches.slice(cursor, cursor + 3);
    const nextCursor = cursor + items.length;
    const body = JSON.stringify({
      cursor: String(nextCursor),
      done: nextCursor >= matches.length,
      items,
      message: `${nextCursor} of ${matches.length} matching results loaded.`,
      total: matches.length,
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/increment", async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const signals = await requestBody(request);
    const current = typeof signals.serverCount === "number" ? signals.serverCount : 0;
    const body = JSON.stringify({
      serverCount: current + 10,
      serverMessage: "The JSON response patched these signals.",
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/stream", async (request, response) => {
    const sdkRequest = new Request(new URL(request.url ?? "/", "http://localhost"));
    const read = await ServerSentEventGenerator.readSignals(sdkRequest);
    if (!read.success) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end(read.error);
      return;
    }

    const current = typeof read.signals.serverCount === "number" ? read.signals.serverCount : 0;
    const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
      stream.patchSignals(
        JSON.stringify({
          serverCount: current + 1,
          serverMessage: "The official Datastar SDK patched this signal.",
        }),
        { eventId: "demo-signals", retryDuration: 2_000 },
      );
      await new Promise<void>((resolve) => setTimeout(resolve, 300));
      stream.patchElements(
        `<li>SDK-streamed HTML <button data-on:click="$(el).closest('li').fadeOut()">Fade it out</button></li>`,
        {
          selector: "#server-feed",
          mode: "append",
          eventId: "demo-elements",
        },
      );
    });
    await sendWebResponse(sdkResponse, response);
  });

  middlewares.use("/api/demo/account", async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const source = await requestText(request);
    const taken = source.toLocaleLowerCase().includes("taken@example.com");
    const body = JSON.stringify(
      taken
        ? {
            errors: {
              _form: "The server rejected one field. Your file selection was left intact.",
              email: "That account already exists. Try another email.",
            },
          }
        : { message: "The local backend accepted the multipart form." },
    );
    response.writeHead(taken ? 422 : 200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/project", async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const source = await requestText(request);
    const body = JSON.stringify({
      message: `The local backend received a ${source.length.toLocaleString()} byte multipart project submission.`,
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/preferences", async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const source = await requestText(request);
    const body = JSON.stringify({
      message: `The local backend received a ${source.length.toLocaleString()} byte multipart preferences submission.`,
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/feedback", async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const source = await requestText(request);
    const body = JSON.stringify({
      message: `The local backend received a ${source.length.toLocaleString()} byte multipart feedback submission.`,
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/questionnaire", async (request, response) => {
    if (request.method !== "POST") {
      response.writeHead(405).end();
      return;
    }
    const source = await requestText(request);
    const body = JSON.stringify({
      message: `The local backend received a ${source.length.toLocaleString()} byte multipart build brief.`,
    });
    response.writeHead(200, {
      "Content-Type": "application/json",
      "Content-Length": Buffer.byteLength(body),
    });
    response.end(body);
  });

  middlewares.use("/api/demo/autocomplete", async (request, response) => {
    const sdkRequest = new Request(new URL(request.url ?? "/", "http://localhost"));
    const read = await ServerSentEventGenerator.readSignals(sdkRequest);
    if (!read.success) {
      response.writeHead(400, { "Content-Type": "text/plain" });
      response.end(read.error);
      return;
    }

    const query = String(read.signals.componentQuery ?? "")
      .trim()
      .toLocaleLowerCase();
    const matches = componentSystems.filter(([, label]) =>
      label.toLocaleLowerCase().includes(query),
    );
    const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
      await new Promise<void>((resolve) => setTimeout(resolve, 120));
      stream.patchSignals(JSON.stringify({ componentResultCount: matches.length }));
      stream.patchElements(
        matches.length
          ? matches
              .map(
                ([value, label]) =>
                  `<div data-part="option" data-value="${escapeHtml(value)}">${escapeHtml(label)}</div>`,
              )
              .join("") +
              '<div data-part="loading" hidden>Searching the server…</div><div data-part="empty" hidden>No matching systems</div>'
          : '<div data-part="loading" hidden>Searching the server…</div><div data-part="empty">No matching systems</div>',
        { selector: "#technology-combobox-content", mode: "inner" },
      );
    });
    await sendWebResponse(sdkResponse, response);
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
  define: {
    __JQS_STATIC_DEMO__: JSON.stringify(process.env.JQS_STATIC_DEMO === "true"),
  },
  plugins: [tailwindcss(), proofBackend()],
  build: {
    outDir: resolve(__dirname, "demo-dist"),
    emptyOutDir: true,
  },
});

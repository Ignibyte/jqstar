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

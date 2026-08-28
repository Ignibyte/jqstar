import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import type { IncomingMessage, ServerResponse } from "node:http";

export interface ProofApi {
  handle(request: IncomingMessage, response: ServerResponse): Promise<boolean>;
}

export interface ProofApiOptions {
  environment?: "local" | "self-hosted" | "test";
  maxBodyBytes?: number;
}

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

const runtimeLogs = [
  { level: "info", message: "HTTP listener accepted a health probe.", source: "http" },
  { level: "debug", message: "Registry manifest contains 100 components.", source: "registry" },
  {
    level: "warn",
    message: "Public deployment is waiting on its hosting target.",
    source: "deploy",
  },
] as const;

class BodyLimitError extends Error {}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]!,
  );
}

function logEntryHtml(entry: {
  id: string;
  level: "debug" | "info" | "warn" | "error";
  message: string;
  source: string;
  timestamp: string;
}): string {
  const time = new Date(entry.timestamp).toLocaleTimeString("en-US", {
    hour12: false,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "UTC",
  });
  return `<li data-part="entry" data-level="${entry.level}" data-value="${escapeHtml(entry.id)}"><time data-part="timestamp" datetime="${escapeHtml(entry.timestamp)}">${escapeHtml(time)}</time><span data-part="level">${entry.level.toLocaleUpperCase()}</span><span data-part="source">${escapeHtml(entry.source)}</span><span data-part="message">${escapeHtml(entry.message)}</span></li>`;
}

function json(response: ServerResponse, status: number, value: unknown): void {
  const body = JSON.stringify(value);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Content-Length": Buffer.byteLength(body),
    "Cache-Control": "no-store",
  });
  response.end(body);
}

function method(request: IncomingMessage, response: ServerResponse, expected: string): boolean {
  if (request.method === expected) return true;
  response.setHeader("Allow", expected);
  json(response, 405, { error: `Method must be ${expected}.` });
  return false;
}

async function requestText(request: IncomingMessage, maximum: number): Promise<string> {
  let source = "";
  let size = 0;
  for await (const chunk of request) {
    const value = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    size += value.byteLength;
    if (size > maximum) throw new BodyLimitError(`Request body exceeds ${maximum} bytes.`);
    source += value.toString("utf8");
  }
  return source;
}

async function requestBody(
  request: IncomingMessage,
  maximum: number,
): Promise<Record<string, unknown>> {
  const source = await requestText(request, maximum);
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

function webRequest(request: IncomingMessage): Request {
  return new Request(new URL(request.url ?? "/", "http://localhost"));
}

export function createProofApi(options: ProofApiOptions = {}): ProofApi {
  const environment = options.environment ?? "local";
  const maximum = options.maxBodyBytes ?? 10 * 1024 * 1024;
  let metricsRevision = 0;
  let operationsRevision = 0;
  let runtimeRevision = 0;
  let runtimeStreamRevision = 0;
  let profileRevision = 0;
  let inviteRevision = 0;

  async function route(request: IncomingMessage, response: ServerResponse): Promise<boolean> {
    const url = new URL(request.url ?? "/", "http://localhost");

    if (url.pathname === "/health") {
      if (!method(request, response, "GET")) return true;
      json(response, 200, { components: 100, environment, service: "jqstar", status: "healthy" });
      return true;
    }

    if (url.pathname === "/api/demo/operations") {
      if (!method(request, response, "GET")) return true;
      operationsRevision += 1;
      json(response, 200, {
        components: 100,
        latency: Math.max(48, 82 - operationsRevision * 3),
        release: `v0.6.0-${environment}`,
        requests: 12_840 + operationsRevision * 294,
        revision: operationsRevision,
        status: "healthy",
        timestamp: new Date().toISOString(),
      });
      return true;
    }

    if (url.pathname === "/api/demo/runtime") {
      if (!method(request, response, "GET")) return true;
      runtimeRevision += 1;
      const timestamp = new Date();
      const logs = runtimeLogs.map((entry, index) => ({
        ...entry,
        id: `snapshot-${runtimeRevision}-${index + 1}`,
        timestamp: new Date(
          timestamp.valueOf() - (runtimeLogs.length - index) * 1_000,
        ).toISOString(),
      }));
      json(response, 200, {
        capacity: Math.min(88, 64 + runtimeRevision * 3),
        components: 100,
        connection: "connected",
        environment,
        logs,
        nextCheck: new Date(timestamp.valueOf() + 30_000).toISOString(),
        region: "us-central",
        revision: runtimeRevision,
        runtime: {
          process: "node-http",
          registry: "source-owned",
          transport: "datastar-sse",
        },
        service: "jqstar",
        timestamp: timestamp.toISOString(),
      });
      return true;
    }

    if (url.pathname === "/api/demo/runtime/stream") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      runtimeStreamRevision += 1;
      const revision = runtimeStreamRevision;
      const timestamp = Date.now();
      const logs = [
        {
          id: `stream-${revision}-1`,
          level: "info" as const,
          message: `Datastar stream ${revision} opened.`,
          source: "sse",
          timestamp: new Date(timestamp).toISOString(),
        },
        {
          id: `stream-${revision}-2`,
          level: "debug" as const,
          message: "jQuery Star enhanced the server-appended entry.",
          source: "ui",
          timestamp: new Date(timestamp + 1_000).toISOString(),
        },
        {
          id: `stream-${revision}-3`,
          level: "warn" as const,
          message: "Hosting remains local until a public target is available.",
          source: "deploy",
          timestamp: new Date(timestamp + 2_000).toISOString(),
        },
      ];
      const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
        for (const entry of logs) {
          await new Promise<void>((resolve) => setTimeout(resolve, 90));
          stream.patchElements(logEntryHtml(entry), {
            selector: "#runtime-log-entries",
            mode: "append",
            eventId: entry.id,
          });
        }
        stream.patchSignals(
          JSON.stringify({
            controlPlaneMessage: `Datastar stream ${revision} appended ${logs.length} log entries.`,
          }),
          { eventId: `stream-${revision}-complete` },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }

    if (url.pathname === "/api/demo/metrics") {
      if (!method(request, response, "GET")) return true;
      metricsRevision += 1;
      const offset = metricsRevision * 7;
      json(response, 200, {
        labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
        message: `The ${environment} backend patched four table rows (revision ${metricsRevision}).`,
        series: [
          [248 + offset, 326 + offset, 391 + offset, 438 + offset],
          [112 + offset, 218 + offset, 284 + offset, 347 + offset],
        ],
      });
      return true;
    }

    if (url.pathname === "/api/demo/feed") {
      if (!method(request, response, "GET")) return true;
      const query = (url.searchParams.get("query") ?? "").trim().toLocaleLowerCase();
      const requestedCursor = Number(url.searchParams.get("cursor") ?? 0);
      const cursor =
        Number.isInteger(requestedCursor) && requestedCursor >= 0 ? requestedCursor : 0;
      const matches = feedItems.filter((item) =>
        `${item.title} ${item.description} ${item.meta}`.toLocaleLowerCase().includes(query),
      );
      const items = matches.slice(cursor, cursor + 3);
      const nextCursor = cursor + items.length;
      json(response, 200, {
        cursor: String(nextCursor),
        done: nextCursor >= matches.length,
        items,
        message: `${nextCursor} of ${matches.length} matching results loaded.`,
        total: matches.length,
      });
      return true;
    }

    if (url.pathname === "/api/demo/increment") {
      if (!method(request, response, "POST")) return true;
      const signals = await requestBody(request, maximum);
      const current = typeof signals.serverCount === "number" ? signals.serverCount : 0;
      json(response, 200, {
        serverCount: current + 10,
        serverMessage: "The JSON response patched these signals.",
      });
      return true;
    }

    if (url.pathname === "/api/demo/profile") {
      if (!method(request, response, "POST")) return true;
      const body = await requestBody(request, maximum);
      const displayName = typeof body.displayName === "string" ? body.displayName.trim() : "";
      const email = typeof body.email === "string" ? body.email.trim() : "";
      if (!displayName || !email || !email.includes("@")) {
        json(response, 422, {
          error: "Display name and a valid email address are required.",
        });
        return true;
      }
      profileRevision += 1;
      json(response, 200, {
        displayName,
        email,
        environment,
        revision: profileRevision,
        updatedAt: new Date().toISOString(),
      });
      return true;
    }

    if (url.pathname === "/api/demo/profile/invite") {
      if (!method(request, response, "POST")) return true;
      inviteRevision += 1;
      json(response, 200, {
        inviteUrl: `https://jqstar.dev/invite/${environment}-${inviteRevision}`,
        revision: inviteRevision,
      });
      return true;
    }

    if (url.pathname === "/api/demo/stream") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
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
          { selector: "#server-feed", mode: "append", eventId: "demo-elements" },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }

    if (url.pathname === "/api/demo/account") {
      if (!method(request, response, "POST")) return true;
      const source = await requestText(request, maximum);
      const taken = source.toLocaleLowerCase().includes("taken@example.com");
      json(
        response,
        taken ? 422 : 200,
        taken
          ? {
              errors: {
                _form: "The server rejected one field. Your file selection was left intact.",
                email: "That account already exists. Try another email.",
              },
            }
          : { message: `The ${environment} backend accepted the multipart form.` },
      );
      return true;
    }

    const multipartMessages: Record<string, string> = {
      "/api/demo/project": "project submission",
      "/api/demo/preferences": "preferences submission",
      "/api/demo/feedback": "feedback submission",
      "/api/demo/questionnaire": "build brief",
    };
    const label = multipartMessages[url.pathname];
    if (label) {
      if (!method(request, response, "POST")) return true;
      const source = await requestText(request, maximum);
      json(response, 200, {
        message: `The ${environment} backend received a ${Buffer.byteLength(source).toLocaleString()} byte multipart ${label}.`,
      });
      return true;
    }

    if (url.pathname === "/api/demo/autocomplete") {
      if (!method(request, response, "GET")) return true;
      const read = await ServerSentEventGenerator.readSignals(webRequest(request));
      if (!read.success) {
        response.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
        response.end(read.error);
        return true;
      }
      const query = String(read.signals.componentQuery ?? "")
        .trim()
        .toLocaleLowerCase();
      const matches = componentSystems.filter(([, name]) =>
        name.toLocaleLowerCase().includes(query),
      );
      const sdkResponse = ServerSentEventGenerator.stream(async (stream) => {
        await new Promise<void>((resolve) => setTimeout(resolve, 120));
        stream.patchSignals(JSON.stringify({ componentResultCount: matches.length }));
        stream.patchElements(
          matches.length
            ? matches
                .map(
                  ([value, name]) =>
                    `<div data-part="option" data-value="${escapeHtml(value)}">${escapeHtml(name)}</div>`,
                )
                .join("") +
                '<div data-part="loading" hidden>Searching the server…</div><div data-part="empty" hidden>No matching systems</div>'
            : '<div data-part="loading" hidden>Searching the server…</div><div data-part="empty">No matching systems</div>',
          { selector: "#technology-combobox-content", mode: "inner" },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return true;
    }
    return false;
  }

  return {
    async handle(request, response) {
      try {
        return await route(request, response);
      } catch (error) {
        if (response.headersSent) throw error;
        if (error instanceof BodyLimitError) {
          json(response, 413, { error: error.message });
          return true;
        }
        json(response, 500, { error: "Unexpected backend error." });
        return true;
      }
    },
  };
}

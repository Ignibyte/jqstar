import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { createProofApi } from "./api";

const host = process.env.JQS_HOST ?? "127.0.0.1";
const requestedPort = Number(process.env.JQS_PORT ?? 4173);
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
  throw new Error(`JQS_PORT must be an integer from 0 to 65535: ${String(process.env.JQS_PORT)}`);
}

const staticRoot = resolve(
  process.env.JQS_STATIC_DIR ?? resolve(import.meta.dirname, "../demo-dist"),
);
const api = createProofApi({ environment: "self-hosted" });
const contentTypes: Record<string, string> = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".ico": "image/x-icon",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".webp": "image/webp",
};

function securityHeaders(response: ServerResponse): void {
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  response.setHeader("X-Content-Type-Options", "nosniff");
  response.setHeader("X-Frame-Options", "DENY");
}

function safeFile(pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  const path = resolve(staticRoot, relative);
  return path === staticRoot || path.startsWith(`${staticRoot}${sep}`) ? path : undefined;
}

async function serveFile(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<void> {
  const path = safeFile(pathname);
  if (!path) {
    response.writeHead(400).end("Bad request");
    return;
  }
  let file = path;
  try {
    const details = await stat(file);
    if (details.isDirectory()) file = resolve(file, "index.html");
    else if (!details.isFile()) throw new Error("Not a file");
  } catch {
    if (request.headers.accept?.includes("text/html")) file = resolve(staticRoot, "index.html");
    else {
      response.writeHead(404).end("Not found");
      return;
    }
  }
  try {
    const details = await stat(file);
    const type = contentTypes[extname(file).toLocaleLowerCase()] ?? "application/octet-stream";
    response.writeHead(200, {
      "Content-Type": type,
      "Content-Length": details.size,
      "Cache-Control": file.includes(`${sep}assets${sep}`)
        ? "public, max-age=31536000, immutable"
        : "no-cache",
    });
    if (request.method === "HEAD") response.end();
    else createReadStream(file).pipe(response);
  } catch {
    response.writeHead(404).end("Not found");
  }
}

async function handleRequest(request: IncomingMessage, response: ServerResponse): Promise<void> {
  securityHeaders(response);
  if (await api.handle(request, response)) return;
  if (request.method !== "GET" && request.method !== "HEAD") {
    response.setHeader("Allow", "GET, HEAD");
    response.writeHead(405).end("Method not allowed");
    return;
  }
  const url = new URL(request.url ?? "/", "http://localhost");
  await serveFile(request, response, url.pathname);
}

const server = createServer((request, response) => {
  void handleRequest(request, response).catch((error: unknown) => {
    if (!response.headersSent) response.writeHead(500).end("Internal server error");
    else response.destroy(error instanceof Error ? error : new Error(String(error)));
  });
});

server.listen(requestedPort, host, () => {
  const address = server.address();
  const port = typeof address === "object" && address ? address.port : requestedPort;
  process.stdout.write(`jQuery Star self-hosted server listening on http://${host}:${port}\n`);
});

function shutdown(): void {
  server.close((error) => {
    process.exitCode = error ? 1 : 0;
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

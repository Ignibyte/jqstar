import { createReadStream } from "node:fs";
import { readFile, stat } from "node:fs/promises";
import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { extname, resolve, sep } from "node:path";
import { brotliDecompressSync } from "node:zlib";
import { createProofApi } from "./api";

const host = process.env.JQS_HOST ?? "127.0.0.1";
const requestedPort = Number(process.env.JQS_PORT ?? 4173);
if (!Number.isInteger(requestedPort) || requestedPort < 0 || requestedPort > 65_535) {
  throw new Error(`JQS_PORT must be an integer from 0 to 65535: ${String(process.env.JQS_PORT)}`);
}

const staticRoot = resolve(
  process.env.JQS_STATIC_DIR ?? resolve(import.meta.dirname, "../demo-dist"),
);
const databasePath =
  process.env.JQS_DATABASE_PATH ?? resolve(process.cwd(), "data/projects.sqlite");
const api = createProofApi({ databasePath, environment: "self-hosted" });
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
  ".txt": "text/plain; charset=utf-8",
  ".webp": "image/webp",
};
const bundledSitePath = resolve(staticRoot, "site.br");
let bundledSite: Promise<Map<string, Buffer>> | undefined;

function loadBundledSite(): Promise<Map<string, Buffer>> {
  bundledSite ??= readFile(bundledSitePath)
    .then((archive) => brotliDecompressSync(archive))
    .then((source) => JSON.parse(source.toString("utf8")) as unknown)
    .then((document) => {
      if (
        !document ||
        typeof document !== "object" ||
        !("schema" in document) ||
        document.schema !== "jqstar-site-bundle/2" ||
        !("files" in document) ||
        !Array.isArray(document.files)
      ) {
        throw new Error("The packaged site bundle is invalid.");
      }
      const files = new Map<string, Buffer>();
      for (const entry of document.files) {
        if (
          !Array.isArray(entry) ||
          entry.length !== 2 ||
          typeof entry[0] !== "string" ||
          typeof entry[1] !== "string" ||
          !/^[bu]/u.test(entry[1]) ||
          entry[0].startsWith("/") ||
          entry[0].split("/").includes("..")
        ) {
          throw new Error("The packaged site bundle contains an invalid entry.");
        }
        if (files.has(entry[0])) {
          throw new Error(`The packaged site bundle repeats ${entry[0]}.`);
        }
        const encoding = entry[1].startsWith("u") ? "utf8" : "base64";
        files.set(entry[0], Buffer.from(entry[1].slice(1), encoding));
      }
      return files;
    });
  return bundledSite;
}

function bundledKey(pathname: string): string | undefined {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return undefined;
  }
  const relative = decoded === "/" ? "index.html" : decoded.replace(/^\/+/, "");
  if (relative.split("/").includes("..")) return undefined;
  return relative.endsWith("/") ? `${relative}index.html` : relative;
}

async function serveBundledFile(
  request: IncomingMessage,
  response: ServerResponse,
  pathname: string,
): Promise<boolean> {
  const key = bundledKey(pathname);
  if (!key) return false;
  let files: Map<string, Buffer>;
  try {
    files = await loadBundledSite();
  } catch {
    return false;
  }
  const selectedKey = files.has(key)
    ? key
    : request.headers.accept?.includes("text/html")
      ? "index.html"
      : undefined;
  const selected = selectedKey ? files.get(selectedKey) : undefined;
  if (!selected || !selectedKey) return false;
  const type = contentTypes[extname(selectedKey).toLocaleLowerCase()] ?? "application/octet-stream";
  response.writeHead(200, {
    "Content-Type": type,
    "Content-Length": selected.length,
    "Cache-Control": key.startsWith("assets/") ? "public, max-age=31536000, immutable" : "no-cache",
  });
  if (request.method === "HEAD") response.end();
  else response.end(selected);
  return true;
}

function securityHeaders(response: ServerResponse): void {
  response.setHeader(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-eval'; img-src 'self' data:; style-src 'self' 'unsafe-inline'; connect-src 'self'; font-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'",
  );
  response.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  response.setHeader("Origin-Agent-Cluster", "?1");
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
    if (await serveBundledFile(request, response, pathname)) return;
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
    api.close();
    process.exitCode = error ? 1 : 0;
  });
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

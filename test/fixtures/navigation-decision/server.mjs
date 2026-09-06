import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { documentHTML } from "./html.mjs";

const candidates = new Set([
  "browser-nojs",
  "browser",
  "turbo-8.0.21",
  "turbo-8.0.23",
  "htmx-2.0.0",
  "htmx-2.0.10",
]);
const routes = new Set([
  "start",
  "guide",
  "long",
  "redirect",
  "search",
  "edit",
  "saved",
  "preview",
  "region",
  "region-mismatch",
  "not-found",
  "server-error",
  "download",
  "text",
  "head",
  "private",
  "slow",
  "fast",
  "canceled",
  "no-content",
  "network-error",
]);
const eventNames = new Set([
  "application-created",
  "application-released",
  "document-ready",
  "document-disposed",
  "render-prepared",
  "render-removing",
  "render-externally-mutated",
  "render-enhancing",
  "render-committed",
  "render-canceled",
  "render-failed",
  "barrier-settled",
  "focus-observed",
  "scroll-observed",
  "progress-observed",
  "history-observed",
]);
const roles = new Set([
  "main",
  "nested",
  "permanent",
  "disclosure",
  "region",
  "region-child",
  "other",
]);

function cookies(request) {
  return Object.fromEntries(
    (request.headers.cookie ?? "").split(";").map((pair) => {
      const position = pair.indexOf("=");
      return [pair.slice(0, position).trim(), pair.slice(position + 1)];
    }),
  );
}
function send(response, status, body, type = "text/html; charset=utf-8", headers = {}) {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store", ...headers });
  response.end(body);
}
async function bodyBytes(request) {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 131072) throw new Error("Fixture body exceeded its bound.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}
function safeClientEvent(value) {
  if (!value || typeof value !== "object" || !eventNames.has(value.event)) return null;
  const record = { event: value.event };
  if (typeof value.documentId === "string" && /^[a-f0-9-]{36}$/.test(value.documentId))
    record.documentId = value.documentId;
  if (roles.has(value.role)) record.role = value.role;
  for (const key of [
    "sequence",
    "generation",
    "operation",
    "created",
    "released",
    "live",
    "failed",
    "remaining",
    "removals",
    "unhandledErrors",
    "handledHostErrors",
  ]) {
    if (Number.isSafeInteger(value[key]) && value[key] >= 0) record[key] = value[key];
  }
  return record;
}

export function createNavigationDecisionServer(assets) {
  const sessions = new Map();
  function sessionFor(request) {
    const selected = cookies(request);
    const id = /^[a-zA-Z0-9-]{1,80}$/.test(selected["jqs-nav-session"] ?? "")
      ? selected["jqs-nav-session"]
      : "default";
    if (!sessions.has(id))
      sessions.set(id, { revision: 1, reads: 0, writes: 0, requests: [], events: [], sequence: 0 });
    return { session: sessions.get(id), selected, id };
  }
  const server = createServer(async (request, response) => {
    try {
      const url = new URL(request.url ?? "/", "http://fixture.invalid");
      const { session, selected } = sessionFor(request);
      const candidate = candidates.has(selected["jqs-nav-candidate"])
        ? selected["jqs-nav-candidate"]
        : "browser";
      const configured = selected["jqs-nav-configuration"] !== "default";
      if (url.pathname === "/health") return send(response, 200, "ok", "text/plain");
      if (url.pathname === "/navigation/metrics")
        return send(response, 200, JSON.stringify(session), "application/json");
      if (url.pathname === "/navigation/configuration.js") {
        return send(
          response,
          200,
          `export const candidate=${JSON.stringify(candidate)}; export const configured=${configured};`,
          "application/javascript",
        );
      }
      if (url.pathname === "/navigation/events" && request.method === "POST") {
        const input = JSON.parse((await bodyBytes(request)).toString("utf8"));
        const values = Array.isArray(input) ? input : [input];
        for (const value of values.slice(0, 256)) {
          const event = safeClientEvent(value);
          if (event && session.events.length < 10000)
            session.events.push({ ...event, serverSequence: ++session.sequence });
        }
        return send(response, 204, "", "text/plain");
      }
      if (url.pathname.startsWith("/navigation/assets/")) {
        const name = url.pathname.slice("/navigation/assets/".length);
        if (name === "head.css")
          return send(
            response,
            200,
            "#main { border-top: 7px solid rgb(0, 96, 160); }",
            "text/css",
          );
        if (name === "head-proof.js")
          return send(
            response,
            200,
            "globalThis.__navigationHeadProof = (globalThis.__navigationHeadProof ?? 0) + 1;",
            "application/javascript",
          );
        const file =
          name === "entry.js"
            ? resolve(assets, `${candidate}.js`)
            : name === "style.css"
              ? resolve("test/fixtures/navigation-decision/style.css")
              : null;
        if (!file) return send(response, 404, "Unknown fixture asset", "text/plain");
        return send(
          response,
          200,
          await readFile(file),
          name.endsWith(".css") ? "text/css" : "application/javascript",
        );
      }
      const route = url.pathname.replace(/^\/navigation\/?/, "") || "start";
      if (!routes.has(route)) return send(response, 404, "Unknown fixture route", "text/plain");
      const requestRecord = {
        sequence: ++session.sequence,
        route,
        method: request.method === "POST" ? "POST" : "GET",
        status: null,
        aborted: false,
        bodyPresent: false,
        multipart: false,
        fileMatched: false,
        submitterMatched: false,
        disabledExcluded: true,
        revisionMatched: true,
      };
      session.requests.push(requestRecord);
      session.events.push({
        event: "request-started",
        request: requestRecord.sequence,
        route,
        method: requestRecord.method,
        serverSequence: requestRecord.sequence,
      });
      if (request.method === "GET") session.reads += 1;
      response.once("finish", () =>
        session.events.push({
          event: "request-completed",
          request: requestRecord.sequence,
          route,
          method: requestRecord.method,
          status: requestRecord.status,
          serverSequence: ++session.sequence,
        }),
      );
      response.once("close", () => {
        if (!response.writableFinished) {
          requestRecord.aborted = true;
          session.events.push({
            event: "request-aborted",
            request: requestRecord.sequence,
            route,
            method: requestRecord.method,
            serverSequence: ++session.sequence,
          });
        }
      });
      const html = (status, target = route, error = false) => {
        requestRecord.status = status;
        send(
          response,
          status,
          documentHTML(target, { revision: session.revision, error }),
          undefined,
          target === "private" ? { "cache-control": "private, no-store" } : {},
        );
      };
      if (route === "network-error") {
        request.socket.destroy();
        return;
      }
      if (route === "slow" || route === "fast") {
        await new Promise((resolveDelay) => setTimeout(resolveDelay, route === "slow" ? 900 : 30));
        if (!response.destroyed) html(200);
        return;
      }
      if (route === "no-content") {
        requestRecord.status = 204;
        send(response, 204, "");
        return;
      }
      if (route === "redirect") {
        requestRecord.status = 302;
        send(response, 302, "", undefined, { location: "/navigation/guide" });
        return;
      }
      if (route === "download") {
        requestRecord.status = 200;
        send(response, 200, "navigation download", "text/plain", {
          "content-disposition": 'attachment; filename="example.txt"',
        });
        return;
      }
      if (route === "text") {
        requestRecord.status = 200;
        send(response, 200, "Canonical plain text", "text/plain");
        return;
      }
      if (route === "search") {
        requestRecord.submitterMatched = url.searchParams.get("submitter") === "search";
        requestRecord.disabledExcluded = !url.searchParams.has("ignored");
      }
      if (route === "edit" && request.method === "POST") {
        const bytes = await bodyBytes(request);
        const form = await new Request("http://fixture.invalid/navigation/edit", {
          method: "POST",
          headers: { "content-type": String(request.headers["content-type"]) },
          body: bytes,
        }).formData();
        const intent = form.get("intent");
        requestRecord.bodyPresent = bytes.length > 0;
        requestRecord.multipart = String(request.headers["content-type"]).startsWith(
          "multipart/form-data;",
        );
        const attachment = form.get("attachment");
        requestRecord.fileMatched =
          typeof attachment === "object" &&
          attachment !== null &&
          attachment.name === "navigation-proof.txt" &&
          (await attachment.text()) === "navigation-file-proof";
        requestRecord.submitterMatched = ["save", "preview", "lose"].includes(intent);
        requestRecord.disabledExcluded = !form.has("ignored");
        requestRecord.revisionMatched = Number(form.get("revision")) === session.revision;
        if (!requestRecord.revisionMatched) {
          html(409, "edit", true);
          return;
        }
        if (form.get("title") === "invalid") {
          html(422, "edit", true);
          return;
        }
        if (intent !== "preview") {
          session.writes += 1;
          session.revision += 1;
          session.events.push({ event: "write-accepted", serverSequence: ++session.sequence });
        }
        if (intent === "lose") {
          // Acknowledge receipt before losing the body. A pre-header socket reset can
          // trigger the browser's own stale-connection POST retry, outside any host.
          requestRecord.status = 200;
          response.writeHead(200, {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-store",
            "content-length": "4096",
          });
          response.flushHeaders();
          setTimeout(() => response.destroy(), 30);
          return;
        }
        requestRecord.status = 303;
        send(response, 303, "", undefined, {
          location: intent === "preview" ? "/navigation/preview" : "/navigation/saved",
        });
        return;
      }
      html(
        route === "not-found" ? 404 : route === "server-error" ? 500 : 200,
        route,
        ["not-found", "server-error"].includes(route),
      );
    } catch {
      if (!response.headersSent) send(response, 500, "Fixture request failed", "text/plain");
      else response.destroy();
    }
  });
  return server;
}

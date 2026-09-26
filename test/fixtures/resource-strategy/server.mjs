import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { inspectorDocument, panelContent } from "./html.mjs";

const strategies = new Set(["server", "external", "native"]);
const identifiers = new Set(["A", "B", "C"]);

function newSession() {
  return {
    projects: new Map(
      ["A", "B", "C"].map((id) => [
        id,
        {
          id,
          name: `Project ${id}`,
          version: 1,
          activity: id === "C" ? [] : [`Project ${id} created.`],
        },
      ]),
    ),
    delays: {},
    failures: {},
    forbidden: false,
    counters: {
      reads: 0,
      aborted: 0,
      completed: 0,
      conditional: 0,
      active: 0,
      writes: 0,
      conflicts: 0,
      invalid: 0,
      forbidden: 0,
    },
  };
}

function send(response, status, type, body, headers = {}) {
  response.writeHead(status, { "content-type": type, "cache-control": "no-store", ...headers });
  response.end(body);
}

function json(response, status, data, headers) {
  send(response, status, "application/json", JSON.stringify(data), headers);
}

async function requestText(request) {
  let source = "";
  for await (const chunk of request) {
    source += chunk;
    if (source.length > 10_000) throw new Error("Fixture input exceeds limit.");
  }
  return source;
}

async function webResponse(source, destination) {
  destination.writeHead(source.status, Object.fromEntries(source.headers));
  if (source.body) {
    for await (const chunk of source.body) {
      if (destination.destroyed) break;
      destination.write(chunk);
    }
  }
  destination.end();
}

function delayed(request, response, session, id, work) {
  session.counters.reads += 1;
  session.counters.active += 1;
  let pending = true;
  const complete = () => {
    if (!pending) return false;
    pending = false;
    session.counters.active -= 1;
    response.off("close", abort);
    return true;
  };
  const abort = () => {
    if (complete()) session.counters.aborted += 1;
    clearTimeout(timer);
  };
  const timer = setTimeout(() => {
    if (!complete()) return;
    session.counters.completed += 1;
    Promise.resolve(work()).catch(() => {
      if (!response.destroyed) json(response, 500, { error: "Fixture response failed." });
    });
  }, session.delays[id] ?? 80);
  response.once("close", abort);
}

function readProject(request, response, session, id) {
  delayed(request, response, session, id, async () => {
    if (session.forbidden) {
      session.counters.forbidden += 1;
      return json(response, 403, { error: "Project access denied." });
    }
    if (session.failures[id] > 0) {
      session.failures[id] -= 1;
      return json(response, 503, { error: "Project could not be loaded. Retry." });
    }
    const project = session.projects.get(id);
    const patch = String(request.headers.accept).includes("text/event-stream");
    const etag = `"${id}-${project.version}-${patch ? "patch" : "json"}"`;
    const headers = { "cache-control": "private, max-age=60", vary: "Accept", etag };
    if (request.headers["if-none-match"] === etag) {
      session.counters.conditional += 1;
      return send(response, 304, "text/plain", "", headers);
    }
    if (!patch) return json(response, 200, project, headers);
    const result = ServerSentEventGenerator.stream((stream) => {
      stream.patchElements(panelContent("summary", project) + panelContent("activity", project));
      stream.patchSignals(
        JSON.stringify({ resolvedId: project.id, resolvedVersion: project.version }),
      );
    });
    for (const [name, value] of Object.entries(headers)) result.headers.set(name, value);
    await webResponse(result, response);
  });
}

async function writeProject(request, response, session, sessionId, id) {
  const form = new URLSearchParams(await requestText(request));
  const project = session.projects.get(id);
  const strategy = form.get("returnTo");
  let status = 200;
  let message = "Project saved.";
  if (session.forbidden || form.get("csrf") !== "inspector-fixture-csrf") {
    status = 403;
    message = "Project access denied.";
    session.counters.forbidden += 1;
  } else if (!form.get("name")?.trim() || form.get("name").length > 80) {
    status = 422;
    message = "Enter a project name of 1 to 80 characters.";
    session.counters.invalid += 1;
  } else if (Number(form.get("version")) !== project.version) {
    status = 409;
    message = "Project changed on the server. Reload before saving.";
    session.counters.conflicts += 1;
  } else {
    project.name = form.get("name").trim();
    project.version += 1;
    project.activity.push(`Updated to version ${project.version}.`);
    session.counters.writes += 1;
  }
  if (request.headers.accept === "application/json") {
    return json(response, status, { message, version: project.version });
  }
  if (!strategies.has(strategy)) return json(response, 400, { error: "Unknown return route." });
  if (status !== 200) {
    return send(
      response,
      status,
      "text/html",
      inspectorDocument(sessionId, strategy, project, message),
    );
  }
  send(response, 303, "text/plain", "See other", {
    location: `/resource-strategy/${sessionId}/${strategy}?selected=${id}`,
  });
}

export function createResourceStrategyServer(assetDirectory) {
  const sessions = new Map();
  const route = async (request, response) => {
    const url = new URL(request.url, "http://localhost");
    if (url.pathname === "/health") return send(response, 200, "text/plain", "ready");
    if (url.pathname === "/resource-strategy/style.css") {
      return send(
        response,
        200,
        "text/css",
        await readFile(new URL("./style.css", import.meta.url)),
      );
    }
    const asset = /^\/resource-strategy\/assets\/(server|external|native)\.js$/.exec(url.pathname);
    if (asset)
      return send(
        response,
        200,
        "text/javascript",
        await readFile(resolve(assetDirectory, `${asset[1]}.js`)),
      );
    const match =
      /^\/resource-strategy\/([a-zA-Z0-9_-]{1,100})\/(server|external|native|metrics|control|project\/[ABC])$/.exec(
        url.pathname,
      );
    if (!match) return json(response, 404, { error: "Unknown fixture route." });
    const [, sessionId, operation] = match;
    if (!sessions.has(sessionId)) {
      if (sessions.size >= 1_000) return json(response, 503, { error: "Fixture session limit." });
      sessions.set(sessionId, newSession());
    }
    const session = sessions.get(sessionId);
    if (operation === "metrics") return json(response, 200, session.counters);
    if (operation === "control" && request.method === "POST") {
      const control = JSON.parse(await requestText(request));
      for (const id of identifiers) {
        if (
          Number.isInteger(control.delays?.[id]) &&
          control.delays[id] >= 0 &&
          control.delays[id] <= 2_000
        )
          session.delays[id] = control.delays[id];
        if (
          Number.isInteger(control.failures?.[id]) &&
          control.failures[id] >= 0 &&
          control.failures[id] <= 10
        )
          session.failures[id] = control.failures[id];
      }
      if (typeof control.forbidden === "boolean") session.forbidden = control.forbidden;
      if (identifiers.has(control.advance)) session.projects.get(control.advance).version += 1;
      return json(response, 200, { configured: true });
    }
    if (operation.startsWith("project/")) {
      const id = operation.slice(-1);
      if (request.method === "GET") return readProject(request, response, session, id);
      if (request.method === "POST") return writeProject(request, response, session, sessionId, id);
      return json(response, 405, { error: "Method not allowed." });
    }
    if (strategies.has(operation) && request.method === "GET") {
      const id = url.searchParams.get("selected") ?? "A";
      if (!identifiers.has(id)) return json(response, 404, { error: "Unknown project." });
      return send(
        response,
        200,
        "text/html",
        inspectorDocument(sessionId, operation, session.projects.get(id)),
      );
    }
    return json(response, 405, { error: "Method not allowed." });
  };
  const server = createServer((request, response) => {
    route(request, response).catch(() => {
      if (!response.destroyed) json(response, 500, { error: "Fixture request failed." });
    });
  });
  server.on("close", () => sessions.clear());
  return server;
}

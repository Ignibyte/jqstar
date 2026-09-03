import { randomUUID } from "node:crypto";
import { createReadStream, existsSync, readdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const port = Number(process.env.JQS_INTEROP_PORT ?? 4175);
const pendingFormProofs = new Map();
const hostAssets = new Map([
  [
    "/interop/assets/jquery-module.js",
    resolve(root, "node_modules/jquery/dist-module/jquery.module.js"),
  ],
  [
    "/interop/assets/turbo-8.0.21.js",
    resolve(root, "node_modules/turbo-8-0-21/dist/turbo.es2017-esm.js"),
  ],
  [
    "/interop/assets/turbo-8.0.23.js",
    resolve(root, "node_modules/turbo-8-0-23/dist/turbo.es2017-esm.js"),
  ],
  ["/interop/assets/htmx-2.0.0.js", resolve(root, "node_modules/htmx-2-0-0/dist/htmx.min.js")],
  ["/interop/assets/htmx-2.0.10.js", resolve(root, "node_modules/htmx-2-0-10/dist/htmx.min.js")],
  ["/interop/recorder.js", resolve(root, "e2e/fixtures/interoperability-recorder.js")],
  ["/interop/turbo-bridge.js", resolve(root, "e2e/fixtures/turbo-bridge-bootstrap.js")],
]);
const distribution = resolve(root, "dist");
if (existsSync(distribution)) {
  for (const filename of readdirSync(distribution)) {
    if (filename.endsWith(".js")) {
      hostAssets.set(`/interop/assets/jqstar/${filename}`, resolve(distribution, filename));
    }
  }
}

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function shell(host, version, route, content) {
  const hostScript =
    host === "turbo"
      ? `<script type="importmap">{"imports":{"jquery":"/interop/assets/jquery-module.js"}}</script>
    <script type="module" src="/interop/turbo-bridge.js?version=${escapeHtml(version)}"></script>`
      : `<script src="/interop/assets/htmx-${version}.js" defer></script>`;
  const bodyAttributes = host === "htmx" ? ' hx-boost="true" hx-target="#main"' : "";
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <title>${escapeHtml(host)} ${escapeHtml(version)} ${escapeHtml(route)}</title>
    <script src="/interop/recorder.js" data-host="${escapeHtml(host)}" data-version="${escapeHtml(version)}" defer></script>
    ${hostScript}
  </head>
  <body data-route="${escapeHtml(route)}"${bodyAttributes}>
    ${content}
  </body>
</html>`;
}

function permanent(host, label, id = "permanent") {
  const marker = host === "turbo" ? "data-turbo-permanent" : "hx-preserve";
  return `<section id="${escapeHtml(id)}" ${marker} data-jqs data-jqs-preserve>
    <label>Preserved <input id="preserved-input" data-focus-key="preserved-input" value="${escapeHtml(label)}"></label>
  </section>`;
}

function turboPage(version, route) {
  if (route === "frame") {
    return `<turbo-frame id="messages"><p id="frame-result" data-jqs>Frame replaced</p></turbo-frame>`;
  }
  const label = route === "next" ? "new-placeholder" : "original";
  return shell(
    "turbo",
    version,
    route,
    `<header>${permanent("turbo", label)}</header>
    <main id="main" data-jqs>
      <h1>Turbo ${escapeHtml(route)}</h1>
      <a id="document-link" href="/interop/turbo/${version}/next">Next document</a>
      <a id="cancel-link" href="/interop/turbo/${version}/cancel">Canceled document</a>
      <a id="no-content-link" href="/interop/turbo/${version}/no-content">No content</a>
      <a id="network-error-link" href="/interop/turbo/${version}/network-error">Network error</a>
      <turbo-frame id="messages">
        <nav id="frame-owner" data-jqs>
          <a id="frame-link" href="/interop/turbo/${version}/frame">Replace frame</a>
          <a id="frame-missing-link" href="/interop/turbo/${version}/frame-missing">Missing frame</a>
        </nav>
      </turbo-frame>
      <form id="get-form" method="get" action="/interop/turbo/${version}/form">
        <label>Query <input name="query" data-focus-key="get-query" value="native" required></label>
        <input name="ignored" value="disabled-get" disabled>
        <button name="submitter" value="get">GET form</button>
      </form>
      <form id="post-form" method="post" enctype="multipart/form-data" action="/interop/turbo/${version}/form">
        <label>Value <input name="value" data-focus-key="post-value" value="posted" required></label>
        <label>File <input name="attachment" type="file"></label>
        <input name="ignored" value="disabled-post" disabled>
        <button name="submitter" value="post">POST form</button>
      </form>
    </main>`,
  );
}

function htmxPage(version, route) {
  const label = route === "boosted" ? "new-placeholder" : "original";
  return shell(
    "htmx",
    version,
    route,
    `<header>${permanent("htmx", label)}</header>
    <main id="main">
      <h1>htmx ${escapeHtml(route)}</h1>
      <section id="region">
        ${permanent("htmx", "region-original", "region-preserved")}
        <section id="nested-owner" data-interop-key="nested-owner" data-jqs><p id="nested-cleanup" data-interop-key="nested-cleanup" data-jqs><span id="nested-child" data-interop-key="nested-child" data-jqs>Old region</span></p></section>
      </section>
      <button id="inner-swap" hx-get="/interop/htmx/${version}/fragment/inner" hx-target="#region" hx-swap="innerHTML">Inner</button>
      <button id="outer-swap" hx-get="/interop/htmx/${version}/fragment/outer" hx-target="#region" hx-swap="outerHTML">Outer</button>
      <ul id="list"><li>First</li></ul>
      <button id="append-swap" hx-get="/interop/htmx/${version}/fragment/item" hx-target="#list" hx-swap="beforeend">Append</button>
      <button id="prepend-swap" hx-get="/interop/htmx/${version}/fragment/item" hx-target="#list" hx-swap="afterbegin">Prepend</button>
      <aside id="adjacent">Anchor</aside>
      <button id="before-swap" hx-get="/interop/htmx/${version}/fragment/adjacent" hx-target="#adjacent" hx-swap="beforebegin">Before</button>
      <button id="after-swap" hx-get="/interop/htmx/${version}/fragment/adjacent" hx-target="#adjacent" hx-swap="afterend">After</button>
      <div id="delete-target">Delete me</div>
      <button id="delete-swap" hx-delete="/interop/htmx/${version}/fragment/empty" hx-target="#delete-target" hx-swap="delete">Delete</button>
      <button id="none-swap" hx-get="/interop/htmx/${version}/fragment/item" hx-target="#region" hx-swap="none">None</button>
      <aside id="oob-target">Old out-of-band content</aside>
      <button id="oob-swap" hx-get="/interop/htmx/${version}/fragment/oob" hx-target="#region" hx-swap="innerHTML">Out of band</button>
      <button id="cancel-swap" hx-get="/interop/htmx/${version}/fragment/inner" hx-target="#region">Cancel</button>
      <button id="no-content" hx-get="/interop/htmx/${version}/no-content" hx-target="#region">No content</button>
      <button id="response-error" hx-get="/interop/htmx/${version}/error" hx-target="#region">Error</button>
      <button id="network-error" hx-get="/interop/htmx/${version}/network-error" hx-target="#region">Network error</button>
      <button id="swap-error" hx-get="/interop/htmx/${version}/fragment/inner" hx-target="#region">Swap error</button>
      <button id="target-error" hx-get="/interop/htmx/${version}/fragment/inner" hx-target="#missing-target">Missing target</button>
      <a id="boost-link" href="/interop/htmx/${version}/boosted">Boosted document</a>
      <form id="get-form" method="get" action="/interop/htmx/${version}/form" hx-get="/interop/htmx/${version}/fragment/form" hx-target="#form-result">
        <label>Query <input name="query" data-focus-key="get-query" value="native" required></label>
        <input name="ignored" value="disabled-get" disabled>
        <button name="submitter" value="get">GET form</button>
      </form>
      <form id="post-form" method="post" enctype="multipart/form-data" action="/interop/htmx/${version}/form" hx-post="/interop/htmx/${version}/fragment/form" hx-encoding="multipart/form-data" hx-target="#form-result">
        <label>Value <input name="value" data-focus-key="post-value" value="posted" required></label>
        <label>File <input name="attachment" type="file"></label>
        <input name="ignored" value="disabled-post" disabled>
        <button name="submitter" value="post">POST form</button>
      </form>
      <output id="form-result"></output>
    </main>`,
  );
}

function respond(response, status, type, body, headers = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": type,
    ...headers,
  });
  response.end(body);
}

async function formProofHeaders(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const body = Buffer.concat(chunks).toString("utf8");
  const value = /name="value"\r\n\r\n([^\r\n]*)/u.exec(body)?.[1] ?? "missing";
  const submitter = /name="submitter"\r\n\r\n([^\r\n]*)/u.exec(body)?.[1] ?? "missing";
  const filename = /name="attachment"; filename="([^"]*)"/u.exec(body)?.[1] ?? "missing";
  return {
    "x-interop-value": value,
    "x-interop-submitter": submitter,
    "x-interop-file":
      filename === "interop-proof.txt" && body.includes("interop-file") ? filename : "missing",
    "x-interop-disabled": body.includes('name="ignored"') ? "included" : "excluded",
  };
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (url.pathname === "/health") {
    respond(response, 200, "text/plain; charset=utf-8", "ok");
    return;
  }
  const asset = hostAssets.get(url.pathname);
  if (asset) {
    response.writeHead(200, {
      "cache-control": "no-store",
      "content-type": "application/javascript; charset=utf-8",
    });
    createReadStream(asset).pipe(response);
    return;
  }

  const parts = url.pathname.split("/").filter(Boolean);
  if (parts[0] !== "interop" || !["turbo", "htmx"].includes(parts[1])) {
    respond(response, 404, "text/plain; charset=utf-8", "not found");
    return;
  }
  const [, host, version, ...rest] = parts;
  const route = rest.join("/") || "start";
  let redirectedFormProof = {};
  const proofId = route === "next" ? url.searchParams.get("proof") : null;
  if (proofId) {
    const proof = pendingFormProofs.get(proofId);
    pendingFormProofs.delete(proofId);
    if (proof?.host === host && proof.version === version) redirectedFormProof = proof.headers;
  }
  if (route === "network-error") {
    request.socket.destroy();
    return;
  }
  if (route === "no-content") {
    response.writeHead(204, { "cache-control": "no-store" });
    response.end();
    return;
  }
  if (route === "error") {
    respond(response, 500, "text/html; charset=utf-8", "<p>synthetic response error</p>");
    return;
  }
  if (host === "turbo") {
    if (route === "frame-missing") {
      respond(response, 200, "text/html; charset=utf-8", "<p>No matching Turbo Frame</p>");
      return;
    }
    if (route === "form" && request.method === "POST") {
      const formProofId = randomUUID();
      pendingFormProofs.set(formProofId, {
        headers: await formProofHeaders(request),
        host,
        version,
      });
      setTimeout(() => pendingFormProofs.delete(formProofId), 10_000).unref();
      response.statusCode = 303;
      response.setHeader("location", `/interop/turbo/${version}/next?proof=${formProofId}`);
      response.end();
      return;
    }
    respond(
      response,
      200,
      "text/html; charset=utf-8",
      turboPage(version, route),
      redirectedFormProof,
    );
    return;
  }

  if (route === "boosted" && request.headers["hx-request"] === "true") {
    respond(
      response,
      200,
      "text/html; charset=utf-8",
      '<h1 id="boosted-result">Boosted document</h1>',
    );
    return;
  }

  const fragments = {
    "fragment/inner":
      '<section id="region-preserved" hx-preserve data-jqs data-jqs-preserve><label>Preserved <input id="preserved-input" data-focus-key="preserved-input" value="region-new-placeholder"></label></section><p id="inner-result" data-jqs>Inner replaced</p>',
    "fragment/outer": '<section id="region"><p id="outer-result">Outer replaced</p></section>',
    "fragment/item": '<li class="added-item">Added</li>',
    "fragment/adjacent": '<aside class="adjacent-result">Adjacent</aside>',
    "fragment/empty": "",
    "fragment/form": '<span id="form-response">Submitted</span>',
    "fragment/oob":
      '<p id="oob-main">Main replacement</p><aside id="oob-target" hx-swap-oob="outerHTML">New out-of-band content</aside>',
  };
  if (Object.hasOwn(fragments, route)) {
    const proofHeaders =
      route === "fragment/form" && request.method === "POST" ? await formProofHeaders(request) : {};
    respond(response, 200, "text/html; charset=utf-8", fragments[route], proofHeaders);
    return;
  }
  const proofHeaders =
    route === "form" && request.method === "POST" ? await formProofHeaders(request) : {};
  respond(response, 200, "text/html; charset=utf-8", htmxPage(version, route), proofHeaders);
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`interoperability fixture listening on http://127.0.0.1:${port}\n`);
});

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);

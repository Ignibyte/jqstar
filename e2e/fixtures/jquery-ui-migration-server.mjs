import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = resolve(root, "e2e/fixtures/jquery-ui-migration");
const port = Number(process.env.JQS_JQUERY_UI_MIGRATION_PORT ?? 4176);

const assets = new Map([
  ["/jquery-ui-migration/app.js", resolve(fixture, "app.js")],
  ["/jquery-ui-migration/style.css", resolve(fixture, "style.css")],
  ["/jquery-ui-migration/jquery.js", resolve(root, "node_modules/jquery/dist/jquery.js")],
  ["/jquery-ui-migration/jquery-ui.js", resolve(root, "node_modules/jquery-ui/dist/jquery-ui.js")],
  [
    "/jquery-ui-migration/jquery-ui/base/jquery-ui.css",
    resolve(root, "node_modules/jquery-ui/dist/themes/base/jquery-ui.css"),
  ],
  ["/jquery-ui-migration/jquery-star.js", resolve(root, "dist/jquery-star.umd.cjs")],
  ["/jquery-ui-migration/jquery-star-ui.css", resolve(root, "dist/jquery-star-ui.css")],
]);

function escapeHtml(value) {
  return value.replaceAll("&", "&amp;").replaceAll('"', "&quot;").replaceAll("<", "&lt;");
}

function respond(response, status, type, body, headers = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": type,
    ...headers,
  });
  response.end(body);
}

function legacyIsland(revision = 1) {
  return `<section id="legacy-island" class="ownership-island legacy-island" data-owner="jquery-ui" data-revision="${revision}">
    <h2>Legacy project editor</h2>
    <p>Application-owned jQuery UI 1.14.2 region.</p>
    <button id="legacy-open" type="button">Edit project</button>
    <div id="legacy-dialog" title="Edit legacy project">
      <label for="legacy-project-name">Project name</label>
      <input id="legacy-project-name" name="project" value="Atlas ${revision}" required>
      <button id="legacy-dialog-save" type="button">Save dialog</button>
    </div>
    <div id="legacy-tabs">
      <ul>
        <li><a href="#legacy-details">Details</a></li>
        <li><a href="#legacy-access">Access</a></li>
      </ul>
      <section id="legacy-details">Legacy project details</section>
      <section id="legacy-access">Legacy access settings</section>
    </div>
    <div class="field-row">
      <label for="legacy-owner">Owner</label>
      <input id="legacy-owner" name="owner" autocomplete="off">
      <label for="legacy-due">Due date</label>
      <input id="legacy-due" name="due" value="09/30/2026">
    </div>
    <ol id="legacy-sortable" aria-label="Legacy project priority">
      <li data-value="design">Design</li>
      <li data-value="api">API</li>
      <li data-value="docs">Docs</li>
    </ol>
    <form id="legacy-form" method="post" action="/jquery-ui-migration/submit">
      <label for="legacy-submit-name">Project to submit</label>
      <input id="legacy-submit-name" name="project" value="Atlas ${revision}" required>
      <input id="legacy-order" name="order" value="design,api,docs" type="hidden">
      <button name="submitter" value="legacy" type="submit">Save legacy project</button>
    </form>
    <div class="command-slice" aria-labelledby="legacy-commands-heading">
      <h3 id="legacy-commands-heading">Legacy command toolbar</h3>
      <button class="legacy-command" title="Create a document" type="button">New</button>
      <button class="legacy-command" title="Save this document" type="button">Save</button>
      <ul id="legacy-menu" aria-label="Legacy more commands">
        <li><div>Duplicate</div></li>
        <li><div>Archive</div></li>
      </ul>
    </div>
    <button id="replace-legacy" type="button">Replace legacy region</button>
  </section>`;
}

function page() {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>jQuery UI coexistence and migration fixture</title>
    <link rel="stylesheet" href="/jquery-ui-migration/style.css">
    <script src="/jquery-ui-migration/jquery.js"></script>
    <script src="/jquery-ui-migration/jquery-ui.js"></script>
    <script src="/jquery-ui-migration/jquery-star.js"></script>
    <script src="/jquery-ui-migration/app.js" defer></script>
  </head>
  <body>
    <header class="page-header">
      <a href="/jquery-ui-migration/">jQuery UI migration fixture</a>
      <details id="responsive-nav">
        <summary>Migration sections</summary>
        <nav aria-label="Migration sections"><a href="#legacy-island">Legacy</a> <a href="#native-island">Native</a> <a href="#composite-island">Composite</a></nav>
      </details>
    </header>
    <main id="fixture-main">
      <h1>Incremental project-editor migration</h1>
      <p id="fixture-status" role="status">Preparing exact installed packages</p>
      <div class="island-grid">
        ${legacyIsland()}
        <section id="native-island" class="ownership-island native-island" data-owner="jqstar" data-jqs data-revision="1">
          <h2>Native jQStar project editor</h2>
          <p>Source-owned semantic HTML with jQStar enhancement.</p>
          <button id="native-open" data-jqs="button" type="button" aria-haspopup="dialog" data-on:click="@ui.dialog.open('#native-dialog', '#native-dialog-close')">Edit project</button>
          <dialog id="native-dialog" data-jqs="dialog" data-close-on-backdrop>
            <div data-part="content">
              <h3 data-part="title">Edit native project</h3>
              <p data-part="description">The native dialog owns focus and return.</p>
              <label for="native-project-name">Project name</label>
              <input id="native-project-name" name="project" value="Atlas" required>
              <div data-part="footer"><button id="native-dialog-close" type="button" data-on:click="@ui.dialog.close('save')">Save dialog</button></div>
            </div>
          </dialog>
          <div id="native-tabs" data-jqs="tabs" data-value="details">
            <div data-part="list" aria-label="Native project sections">
              <button data-part="trigger" data-value="details" type="button">Details</button>
              <button data-part="trigger" data-value="access" type="button">Access</button>
            </div>
            <section data-part="panel" data-value="details">Native project details</section>
            <section data-part="panel" data-value="access">Native access settings</section>
          </div>
          <div id="native-owner-field" data-jqs="combobox" data-filter="contains">
            <label data-part="label" for="native-owner">Owner</label>
            <input id="native-owner" data-part="control" type="search" autocomplete="off">
            <input data-part="value" type="hidden" name="owner">
            <div data-part="content"><div data-part="option" data-value="ada">Ada</div><div data-part="option" data-value="grace">Grace</div><div data-part="option" data-value="linus">Linus</div></div>
            <span data-part="status"></span>
          </div>
          <label for="native-due">Due date</label>
          <input id="native-due" name="due" type="date" value="2026-09-30">
          <div id="native-sortable" data-jqs="sortable" data-name="order">
            <ol data-part="list">
              <li data-part="item" data-value="design" data-label="Design"><button data-part="handle" type="button" aria-label="Drag Design">⋮⋮</button><span data-part="label">Design</span><button data-part="up" type="button" aria-label="Move Design up">↑</button><button data-part="down" type="button" aria-label="Move Design down">↓</button></li>
              <li data-part="item" data-value="api" data-label="API"><button data-part="handle" type="button" aria-label="Drag API">⋮⋮</button><span data-part="label">API</span><button data-part="up" type="button" aria-label="Move API up">↑</button><button data-part="down" type="button" aria-label="Move API down">↓</button></li>
              <li data-part="item" data-value="docs" data-label="Docs"><button data-part="handle" type="button" aria-label="Drag Docs">⋮⋮</button><span data-part="label">Docs</span><button data-part="up" type="button" aria-label="Move Docs up">↑</button><button data-part="down" type="button" aria-label="Move Docs down">↓</button></li>
            </ol>
            <p data-part="status"></p>
          </div>
          <form id="native-form" data-jqs="form" method="post" action="/jquery-ui-migration/submit">
            <label for="native-submit-name">Project to submit</label>
            <input id="native-submit-name" name="project" value="Atlas" required>
            <button name="submitter" value="native" type="submit">Save native project</button>
          </form>
          <div class="command-slice" aria-labelledby="native-commands-heading">
            <h3 id="native-commands-heading">Native command toolbar</h3>
            <div data-jqs="toolbar" aria-label="Native commands"><button data-part="item" type="button" title="Create a document">New</button><button data-part="item" type="button" title="Save this document">Save</button></div>
            <div data-jqs="menu"><button data-part="trigger" type="button">More commands</button><div data-part="content" aria-label="Native more commands"><button data-part="item" data-value="duplicate" type="button">Duplicate</button><button data-part="item" data-value="archive" type="button">Archive</button></div></div>
          </div>
          <button id="replace-native" type="button">Replace native region</button>
        </section>
      </div>
      <section id="composite-island" class="ownership-island composite-island">
        <h2>Partially migrated composite</h2>
        <div id="composite-legacy" data-owner="jquery-ui"><button id="composite-legacy-button" type="button">Legacy command</button></div>
        <div id="composite-native" data-owner="jqstar" data-jqs><details data-jqs="accordion"><summary>Native disclosure</summary><p>Composite content remains server-rendered.</p></details></div>
      </section>
      <noscript><section id="nojs-fallback"><h2>JavaScript-free migration path</h2><p>Project details and forms remain available. Dialog-only actions are also available on a dedicated edit page.</p><a href="/jquery-ui-migration/edit">Edit project without JavaScript</a></section></noscript>
    </main>
  </body>
</html>`;
}

const server = createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${request.headers.host ?? "127.0.0.1"}`);
  if (url.pathname === "/health") {
    respond(response, 200, "text/plain; charset=utf-8", "ok");
    return;
  }
  if (url.pathname.startsWith("/jquery-ui-migration/jquery-ui/base/images/")) {
    const name = url.pathname.split("/").at(-1) ?? "";
    if (!/^[a-z0-9_.-]+\.png$/u.test(name)) {
      respond(response, 404, "text/plain; charset=utf-8", "not found");
      return;
    }
    response.writeHead(200, { "cache-control": "no-store", "content-type": "image/png" });
    createReadStream(resolve(root, "node_modules/jquery-ui/dist/themes/base/images", name)).pipe(
      response,
    );
    return;
  }
  const asset = assets.get(url.pathname);
  if (asset) {
    const type =
      extname(asset) === ".css"
        ? "text/css; charset=utf-8"
        : extname(asset) === ".png"
          ? "image/png"
          : "text/javascript; charset=utf-8";
    response.writeHead(200, { "cache-control": "no-store", "content-type": type });
    createReadStream(asset).pipe(response);
    return;
  }
  if (url.pathname === "/jquery-ui-migration/fragment/legacy") {
    respond(response, 200, "text/html; charset=utf-8", legacyIsland(2));
    return;
  }
  if (url.pathname === "/jquery-ui-migration/fragment/native") {
    respond(
      response,
      200,
      "text/html; charset=utf-8",
      '<section id="native-island" class="ownership-island native-island" data-owner="jqstar" data-jqs data-revision="2"><h2>Native project editor revision 2</h2><p id="native-patch-content">Server-rendered native replacement</p><button id="replace-native" type="button">Replace native region</button></section>',
    );
    return;
  }
  if (url.pathname === "/jquery-ui-migration/submit" && request.method === "POST") {
    const chunks = [];
    for await (const chunk of request) chunks.push(chunk);
    const fields = new URLSearchParams(Buffer.concat(chunks).toString("utf8"));
    const project = escapeHtml(fields.get("project") ?? "missing");
    const submitter = escapeHtml(fields.get("submitter") ?? "missing");
    respond(
      response,
      200,
      "text/html; charset=utf-8",
      `<!doctype html><html lang="en"><title>Project saved</title><main><h1>Project saved</h1><p id="submitted-project">${project}</p><p id="submitted-by">${submitter}</p><a href="/jquery-ui-migration/">Return to editor</a></main></html>`,
    );
    return;
  }
  if (url.pathname === "/jquery-ui-migration/edit") {
    respond(
      response,
      200,
      "text/html; charset=utf-8",
      '<!doctype html><html lang="en"><title>Edit project</title><main><h1>Edit project without JavaScript</h1><form method="post" action="/jquery-ui-migration/submit"><label for="fallback-name">Project name</label><input id="fallback-name" name="project" value="Atlas" required><button name="submitter" value="fallback">Save project</button></form></main></html>',
    );
    return;
  }
  if (url.pathname === "/jquery-ui-migration" || url.pathname === "/jquery-ui-migration/") {
    respond(response, 200, "text/html; charset=utf-8", page());
    return;
  }
  respond(response, 404, "text/plain; charset=utf-8", "not found");
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write(`jQuery UI migration fixture listening on http://127.0.0.1:${port}\n`);
});

function close() {
  server.close(() => process.exit(0));
}

process.on("SIGINT", close);
process.on("SIGTERM", close);

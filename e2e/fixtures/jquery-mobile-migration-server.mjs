import { ServerSentEventGenerator } from "@starfederation/datastar-sdk/web";
import { createReadStream } from "node:fs";
import { createServer } from "node:http";
import { dirname, extname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const fixture = resolve(root, "e2e/fixtures/jquery-mobile-migration");
const port = Number(process.env.JQS_JQUERY_MOBILE_MIGRATION_PORT ?? 4177);
const csrfToken = "mobile-migration-fixture-token";

const assets = new Map([
  ["/jquery-mobile-migration/app.js", resolve(fixture, "app.js")],
  ["/jquery-mobile-migration/style.css", resolve(fixture, "style.css")],
  ["/jquery-mobile-migration/jquery.js", resolve(root, "node_modules/jquery/dist/jquery.js")],
  ["/jquery-mobile-migration/jquery-star.js", resolve(root, "dist/jquery-star.umd.cjs")],
  ["/jquery-mobile-migration/jquery-star-ui.css", resolve(root, "dist/jquery-star-ui.css")],
]);

const projects = [
  {
    id: "alpha",
    name: "Project Alpha",
    owner: "Ada",
    status: "Active",
    due: "2026-09-30",
    summary: "Replace a page framework with direct server documents.",
  },
  {
    id: "bravo",
    name: "Project Bravo",
    owner: "Grace",
    status: "Review",
    due: "2026-10-14",
    summary: "Verify native forms and responsive navigation.",
  },
  {
    id: "charlie",
    name: "Project Charlie",
    owner: "Linus",
    status: "Planned",
    due: "2026-11-01",
    summary: "Inventory application-owned plugins and gestures.",
  },
];

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function respond(response, status, type, body, headers = {}) {
  response.writeHead(status, {
    "cache-control": "no-store",
    "content-type": type,
    ...headers,
  });
  response.end(body);
}

function redirect(response, location) {
  respond(response, 303, "text/plain; charset=utf-8", "See other", { location });
}

async function requestText(request, maximum = 1_000_000) {
  const chunks = [];
  let total = 0;
  for await (const chunk of request) {
    const value = Buffer.from(chunk);
    total += value.byteLength;
    if (total > maximum) throw new Error("Request body is too large.");
    chunks.push(value);
  }
  return Buffer.concat(chunks);
}

async function formData(request) {
  const body = await requestText(request);
  const source = new Request("http://localhost/jquery-mobile-migration/upload", {
    body,
    headers: { "content-type": request.headers["content-type"] ?? "" },
    method: "POST",
  });
  return source.formData();
}

async function sendWebResponse(source, destination) {
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

function navigation() {
  return `<details id="responsive-navigation" class="site-navigation" open>
    <summary>Project navigation</summary>
    <nav aria-label="Project navigation">
      <a href="/jquery-mobile-migration/">Migration home</a>
      <a href="/jquery-mobile-migration/projects">Projects</a>
      <a href="/jquery-mobile-migration/projects/new">New project</a>
      <a href="/jquery-mobile-migration/help">Help</a>
    </nav>
  </details>`;
}

function documentPage(title, content, options = {}) {
  const status = options.status ?? 200;
  return {
    body: `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>${escapeHtml(title)} · Mobile migration fixture</title>
    <link rel="stylesheet" href="/jquery-mobile-migration/style.css">
    <script src="/jquery-mobile-migration/jquery.js"></script>
    <script src="/jquery-mobile-migration/jquery-star.js"></script>
    <script src="/jquery-mobile-migration/app.js" defer></script>
  </head>
  <body>
    <header class="page-header">
      <a class="site-name" href="/jquery-mobile-migration/">Modern project tracker</a>
      ${navigation()}
    </header>
    <p id="offline-message" class="network-message" role="status" hidden>
      You are offline. Open pages remain readable; writes are not queued or replayed.
    </p>
    <main id="migration-app" data-jqs data-signals="{ statusPending: false, statusError: null }">
      ${content}
    </main>
    <footer><a href="/jquery-mobile-migration/help#offline">Offline and error help</a></footer>
    <noscript><p id="no-script-message">JavaScript is off. Links, searches, forms, and direct routes still use the server.</p></noscript>
  </body>
</html>`,
    status,
  };
}

function projectRows(query = "") {
  const normalized = query.trim().toLocaleLowerCase();
  const matches = projects.filter((project) =>
    `${project.name} ${project.owner} ${project.status} ${project.summary}`
      .toLocaleLowerCase()
      .includes(normalized),
  );
  if (matches.length === 0) {
    return `<tr><td colspan="4">No projects match “${escapeHtml(query)}”.</td></tr>`;
  }
  return matches
    .map(
      (project) => `<tr data-project-row data-filter-text="${escapeHtml(
        `${project.name} ${project.owner} ${project.status} ${project.summary}`,
      )}">
        <th scope="row"><a href="/jquery-mobile-migration/projects/${project.id}">${project.name}</a></th>
        <td>${project.owner}</td>
        <td>${project.status}</td>
        <td><time datetime="${project.due}">${project.due}</time></td>
      </tr>`,
    )
    .join("");
}

function projectList(url) {
  const query = url.searchParams.get("query") ?? "";
  return documentPage(
    "Projects",
    `<header class="content-header">
      <p class="eyebrow">Direct server route</p>
      <h1>Projects</h1>
      <p>Search submits a normal GET request. JavaScript only filters the current rows while you type.</p>
    </header>
    <form id="project-search" class="search-form" action="/jquery-mobile-migration/projects" method="get" role="search">
      <label for="project-query">Search projects</label>
      <div class="control-row">
        <input id="project-query" name="query" type="search" value="${escapeHtml(query)}" autocomplete="off">
        <button type="submit">Search server</button>
        <button type="reset">Clear local filter</button>
      </div>
    </form>
    <p id="filter-status" role="status">${query ? `Server results for “${escapeHtml(query)}”.` : "Showing all projects."}</p>
    <div class="table-scroll" tabindex="0" aria-label="Scrollable project table">
      <table>
        <caption>Current projects</caption>
        <thead><tr><th scope="col">Project</th><th scope="col">Owner</th><th scope="col">Status</th><th scope="col">Due</th></tr></thead>
        <tbody id="project-rows">${projectRows(query)}</tbody>
      </table>
    </div>`,
  );
}

function projectDetail(url) {
  const name = url.searchParams.get("name") || "Project Alpha";
  const saved = url.searchParams.get("saved");
  const created = url.searchParams.get("created");
  const attachment = url.searchParams.get("attachment");
  const notice = saved
    ? `<p id="save-notice" class="notice" role="status">${escapeHtml(name)} was saved by the server.</p>`
    : created
      ? `<p id="create-notice" class="notice" role="status">${escapeHtml(created)} was created${attachment ? ` with ${escapeHtml(attachment)}` : ""}.</p>`
      : "";
  return documentPage(
    name,
    `<nav aria-label="Breadcrumb"><a href="/jquery-mobile-migration/projects">Projects</a> / ${escapeHtml(name)}</nav>
    <header class="content-header">
      <p class="eyebrow">Project detail document</p>
      <h1>${escapeHtml(name)}</h1>
      <p>Each project has a bookmarkable URL and a server-owned edit route.</p>
    </header>
    ${notice}
    <div class="action-row">
      <a class="button-link" href="/jquery-mobile-migration/projects/alpha/edit">Edit project</a>
      <button id="open-project-dialog" data-jqs="button" type="button" aria-haspopup="dialog" data-on:click="@ui.dialog.open('#project-dialog', '#close-project-dialog')">Review task</button>
    </div>
    <dialog id="project-dialog" data-jqs="dialog" data-close-on-backdrop>
      <div data-part="content">
        <h2 data-part="title">Review Alpha migration</h2>
        <p data-part="description">Confirm the route has a native server fallback before release.</p>
        <div data-part="footer"><button id="close-project-dialog" type="button" data-on:click="@ui.dialog.close('done')">Done</button></div>
      </div>
    </dialog>
    <section id="project-tabs" data-jqs="tabs" data-value="overview">
      <div data-part="list" aria-label="Project sections">
        <button data-part="trigger" data-value="overview" type="button">Overview</button>
        <button data-part="trigger" data-value="activity" type="button">Activity</button>
      </div>
      <section data-part="panel" data-value="overview">
        <h2>Overview</h2>
        <dl class="facts"><div><dt>Owner</dt><dd>Ada</dd></div><div><dt>Due</dt><dd>2026-09-30</dd></div></dl>
      </section>
      <section data-part="panel" data-value="activity">
        <h2>Activity</h2>
        <ol><li>Direct route inventoried.</li><li>Native edit form verified.</li></ol>
      </section>
    </section>
    <section class="status-card" aria-labelledby="status-heading">
      <h2 id="status-heading">Server status update</h2>
      <p id="project-status"><strong>Planning</strong> · Waiting for the server review.</p>
      <button id="refresh-project-status" type="button" data-on:click="@post('/jquery-mobile-migration/projects/alpha/status', { pending: 'statusPending', error: 'statusError', retry: 'never' })" data-prop:disabled="$statusPending">
        Ask server to review
      </button>
      <p data-show="$statusError" data-text="$statusError" role="alert" hidden></p>
    </section>
    <section aria-labelledby="milestone-heading">
      <h2 id="milestone-heading">Pointer replacement</h2>
      <div id="milestone-gesture" class="gesture-surface" data-milestone="1">Swipe right to advance this optional shortcut. Vertical scrolling cancels it.</div>
      <p>Milestone <output id="milestone-value">1</output> of 3.</p>
      <button id="advance-milestone" type="button">Advance milestone</button>
    </section>`,
  );
}

function editForm(values = {}, error = "", status = 200) {
  const name = values.name ?? "Project Alpha";
  const owner = values.owner ?? "Ada";
  return documentPage(
    "Edit Project Alpha",
    `<nav aria-label="Breadcrumb"><a href="/jquery-mobile-migration/projects/alpha">Project Alpha</a> / Edit</nav>
    <h1>Edit Project Alpha</h1>
    ${error ? `<div id="form-error" class="error" role="alert" tabindex="-1"><h2>Fix this project</h2><p>${escapeHtml(error)}</p></div>` : ""}
    <form id="edit-project" class="stack-form" action="/jquery-mobile-migration/projects/alpha/edit" method="post">
      <input name="csrf" type="hidden" value="${csrfToken}">
      <input name="version" type="hidden" value="7">
      <label for="project-name">Project name</label>
      <input id="project-name" name="name" value="${escapeHtml(name)}" minlength="3" maxlength="80" required>
      <label for="project-owner">Owner</label>
      <select id="project-owner" name="owner" required>
        ${["Ada", "Grace", "Linus"].map((candidate) => `<option${candidate === owner ? " selected" : ""}>${candidate}</option>`).join("")}
      </select>
      <label for="project-notes">Migration notes</label>
      <textarea id="project-notes" name="notes" rows="5">Keep the direct route working.</textarea>
      <div class="action-row">
        <button name="intent" value="save" type="submit">Save project</button>
        <button name="intent" value="preview" type="submit" formaction="/jquery-mobile-migration/projects/alpha/edit?preview=1">Preview changes</button>
        <a href="/jquery-mobile-migration/projects/alpha">Cancel</a>
      </div>
    </form>`,
    { status },
  );
}

function newProjectForm(error = "", status = 200) {
  return documentPage(
    "New project",
    `<nav aria-label="Breadcrumb"><a href="/jquery-mobile-migration/projects">Projects</a> / New</nav>
    <h1>New project</h1>
    ${error ? `<p class="error" role="alert">${escapeHtml(error)}</p>` : ""}
    <form id="new-project" class="stack-form" action="/jquery-mobile-migration/projects/new" method="post" enctype="multipart/form-data">
      <input name="csrf" type="hidden" value="${csrfToken}">
      <label for="new-project-name">Project name</label>
      <input id="new-project-name" name="name" minlength="3" maxlength="80" required>
      <label for="project-brief">Project brief</label>
      <input id="project-brief" name="brief" type="file" accept=".txt,text/plain" required>
      <button name="intent" value="create" type="submit">Create project</button>
    </form>`,
    { status },
  );
}

function helpPage(topic = "") {
  return documentPage(
    "Help",
    `<h1>Migration help</h1>
    <p id="help-topic">${topic === "offline" ? "Offline writes are never queued or replayed automatically." : "Use direct routes and native forms as the migration baseline."}</p>
    <section id="offline"><h2>Offline and errors</h2><p>Keep the current document readable, retry only safe reads, and ask before resubmitting an uncertain write.</p></section>
    <ul><li><a href="/jquery-mobile-migration/slow">Open a deliberately slow document</a></li><li><a href="/jquery-mobile-migration/error">Open a server error document</a></li></ul>`,
  );
}

function serveAsset(path, response) {
  const file = assets.get(path);
  if (!file) return false;
  const type =
    extname(file) === ".css" ? "text/css; charset=utf-8" : "text/javascript; charset=utf-8";
  response.writeHead(200, { "cache-control": "no-store", "content-type": type });
  createReadStream(file).pipe(response);
  return true;
}

const server = createServer(async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", "http://localhost");
    if (url.pathname === "/health") {
      respond(response, 200, "text/plain; charset=utf-8", "ok");
      return;
    }
    if (serveAsset(url.pathname, response)) return;

    if (request.method === "GET" && url.pathname === "/jquery-mobile-migration/") {
      const page = documentPage(
        "Migration home",
        `<p class="eyebrow">Server-rendered reference application</p><h1>Modern mobile project tracker</h1><p>This fixture preserves direct routes, native links and forms, responsive layout, and optional local enhancement without a client router.</p><ul><li><a href="/jquery-mobile-migration/projects">Browse projects</a></li><li><a href="/jquery-mobile-migration/projects/alpha">Open Project Alpha</a></li><li><a href="/jquery-mobile-migration/projects/new">Create a project with an attachment</a></li></ul>`,
      );
      respond(response, page.status, "text/html; charset=utf-8", page.body);
      return;
    }
    if (request.method === "GET" && url.pathname === "/jquery-mobile-migration/projects") {
      const page = projectList(url);
      respond(response, page.status, "text/html; charset=utf-8", page.body);
      return;
    }
    if (request.method === "GET" && url.pathname === "/jquery-mobile-migration/projects/alpha") {
      const page = projectDetail(url);
      respond(response, page.status, "text/html; charset=utf-8", page.body);
      return;
    }
    if (url.pathname === "/jquery-mobile-migration/projects/alpha/edit") {
      if (request.method === "GET") {
        const page = editForm();
        respond(response, page.status, "text/html; charset=utf-8", page.body);
        return;
      }
      if (request.method === "POST") {
        const values = new URLSearchParams((await requestText(request)).toString("utf8"));
        const submitted = { name: values.get("name") ?? "", owner: values.get("owner") ?? "" };
        if (values.get("csrf") !== csrfToken) {
          const page = editForm(submitted, "The security token is invalid. Reload the form.", 403);
          respond(response, page.status, "text/html; charset=utf-8", page.body);
          return;
        }
        if (values.get("version") !== "7") {
          const page = editForm(
            submitted,
            "This project changed on the server. Review it before saving.",
            409,
          );
          respond(response, page.status, "text/html; charset=utf-8", page.body);
          return;
        }
        if (submitted.name.trim().length < 3) {
          const page = editForm(
            submitted,
            "Project name must contain at least three characters.",
            422,
          );
          respond(response, page.status, "text/html; charset=utf-8", page.body);
          return;
        }
        if (url.searchParams.get("preview") === "1" || values.get("intent") === "preview") {
          const page = documentPage(
            "Preview project",
            `<h1>Preview changes</h1><p id="preview-name">${escapeHtml(submitted.name)}</p><p>No write occurred.</p><a href="/jquery-mobile-migration/projects/alpha/edit">Return to edit</a>`,
          );
          respond(response, page.status, "text/html; charset=utf-8", page.body);
          return;
        }
        redirect(
          response,
          `/jquery-mobile-migration/projects/alpha?saved=1&name=${encodeURIComponent(submitted.name)}`,
        );
        return;
      }
    }
    if (url.pathname === "/jquery-mobile-migration/projects/new") {
      if (request.method === "GET") {
        const page = newProjectForm();
        respond(response, page.status, "text/html; charset=utf-8", page.body);
        return;
      }
      if (request.method === "POST") {
        const values = await formData(request);
        const name = String(values.get("name") ?? "").trim();
        const brief = values.get("brief");
        if (
          values.get("csrf") !== csrfToken ||
          name.length < 3 ||
          !(brief instanceof File) ||
          !brief.name
        ) {
          const page = newProjectForm("Supply a valid project name, token, and text brief.", 422);
          respond(response, page.status, "text/html; charset=utf-8", page.body);
          return;
        }
        redirect(
          response,
          `/jquery-mobile-migration/projects/alpha?created=${encodeURIComponent(name)}&attachment=${encodeURIComponent(brief.name)}`,
        );
        return;
      }
    }
    if (
      request.method === "POST" &&
      url.pathname === "/jquery-mobile-migration/projects/alpha/status"
    ) {
      await requestText(request);
      const sdkResponse = ServerSentEventGenerator.stream((stream) => {
        stream.patchElements(
          '<strong data-status="reviewed">Reviewed</strong> · Official Datastar SDK response applied.',
          { mode: "inner", selector: "#project-status" },
        );
      });
      await sendWebResponse(sdkResponse, response);
      return;
    }
    if (request.method === "GET" && url.pathname === "/jquery-mobile-migration/help") {
      const page = helpPage(url.searchParams.get("topic") ?? "");
      respond(response, page.status, "text/html; charset=utf-8", page.body);
      return;
    }
    if (request.method === "GET" && url.pathname === "/jquery-mobile-migration/slow") {
      await new Promise((resolveDelay) => setTimeout(resolveDelay, 250));
      const page = documentPage(
        "Slow response",
        '<h1>Slow response completed</h1><p id="slow-result">The browser kept normal document ownership while the server responded.</p>',
      );
      respond(response, page.status, "text/html; charset=utf-8", page.body);
      return;
    }
    if (request.method === "GET" && url.pathname === "/jquery-mobile-migration/error") {
      const page = documentPage(
        "Server error",
        '<h1>Project service unavailable</h1><p id="error-guidance">Nothing was queued. Return to projects or retry this safe read.</p><a href="/jquery-mobile-migration/projects">Return to projects</a>',
        { status: 503 },
      );
      respond(response, page.status, "text/html; charset=utf-8", page.body, { "retry-after": "1" });
      return;
    }
    respond(response, 404, "text/plain; charset=utf-8", "Not found");
  } catch (error) {
    respond(
      response,
      500,
      "text/plain; charset=utf-8",
      error instanceof Error ? error.message : "Fixture error",
    );
  }
});

server.listen(port, "127.0.0.1");

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => server.close(() => process.exit(0)));
}

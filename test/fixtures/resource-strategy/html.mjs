export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function panelContent(consumer, project) {
  const content =
    consumer === "summary"
      ? `<p><strong>${escapeHtml(project.name)}</strong></p><p>Version ${project.version}</p>`
      : project.activity.length
        ? `<ul>${project.activity.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`
        : "<p>No activity yet.</p>";
  return `<div id="${consumer}-content" data-part="content" data-project="${project.id}" data-version="${project.version}" data-name="${escapeHtml(project.name)}">${content}</div>`;
}

export function inspectorDocument(session, strategy, project, message = "") {
  const base = `/resource-strategy/${session}`;
  const location = `${base}/${strategy}`;
  const panel = (
    consumer,
    title,
  ) => `<section id="${consumer}" data-jqs data-consumer="${consumer}" data-state="ready" aria-busy="false" aria-labelledby="${consumer}-title">
    <h2 id="${consumer}-title">${title}</h2>${panelContent(consumer, project)}
  </section>`;
  return `<!doctype html><html lang="en"><head>
    <meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>Project Inspector</title><link rel="stylesheet" href="/resource-strategy/style.css">
    <script type="module" src="/resource-strategy/assets/${strategy}.js"></script>
    </head><body><main id="inspector" data-jqs data-session="${session}" data-strategy="${strategy}" data-selected="${project.id}">
    <h1>Project Inspector</h1><p>Inspect a selected project from the Project Browser table.</p>
    <div class="table-scroll"><table><caption>Projects</caption><thead><tr><th scope="col">Project</th><th scope="col">Inspect</th></tr></thead>
    <tbody>${["A", "B", "C"].map((id) => `<tr><th scope="row">Project ${id}</th><td><a id="select-${id}" href="${location}?selected=${id}" data-select="${id}"${id === project.id ? ' aria-current="true"' : ""}>Inspect ${id}</a></td></tr>`).join("")}</tbody></table></div>
    <p id="announcement" role="status" aria-live="polite" aria-atomic="true">${escapeHtml(message)}</p>
    <button id="retry" type="button" hidden>Retry</button>
    <div id="panels">${panel("summary", "Pinned summary")}${panel("activity", "Activity")}</div>
    <form id="edit" method="post" action="${base}/project/${project.id}">
    <h2>Edit project</h2><input type="hidden" name="csrf" value="inspector-fixture-csrf">
    <input type="hidden" name="version" value="${project.version}">
    <input type="hidden" name="returnTo" value="${strategy}">
    <label for="project-name">Project name</label><input id="project-name" name="name" value="${escapeHtml(project.name)}" required maxlength="80">
    <button id="save" type="submit">Save</button></form>
    <p><a id="native-route" href="${location}?selected=${project.id}">Open full project page</a></p>
    <noscript><p>JavaScript is off. Project links and the edit form still use the server.</p></noscript>
    <script type="application/json" id="initial-project">${JSON.stringify(project).replaceAll("<", "\\u003c")}</script>
    </main></body></html>`;
}

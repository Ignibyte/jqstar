const base = "/navigation";
const native = 'data-turbo="false" hx-boost="false"';

export function documentHTML(route, options = {}) {
  const revision = options.revision ?? 1;
  const error = options.error ?? false;
  const privatePage = route === "private";
  const link = (id, target, label, attributes = "") =>
    `<a id="${id}" href="${base}/${target}" ${attributes}>${label}</a>`;
  const region = route === "region" ? "Updated activity" : "Recent activity";
  const privateMarker = privatePage ? "private-fixture-marker" : "public-fixture-marker";
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>jQStar navigation ${route}</title>
  <meta name="navigation-page" content="${route}">
  ${privatePage ? '<meta name="turbo-cache-control" content="no-cache">' : ""}
  <link rel="stylesheet" href="${base}/assets/style.css">
  ${route === "head" ? `<link rel="stylesheet" href="${base}/assets/head.css"><script src="${base}/assets/head-proof.js" defer></script>` : ""}
  <script type="module" src="${base}/assets/entry.js"></script>
</head>
<body hx-boost="true" hx-sync="body:replace" ${privatePage ? 'hx-history="false"' : ""}>
  <a href="#main">Skip to content</a>
  <header><p>jQStar project documentation</p>
    <nav aria-label="Documents">
      ${link("home", "start", "Overview")}
      ${link("guide", "guide", "Guide")}
      ${link("query", "guide?view=details", "Detailed guide")}
      ${link("remote-anchor", "long#destination", "Long guide anchor")}
      ${link("redirect", "redirect", "Redirected guide")}
      ${link("new-tab", "guide", "Guide in a new tab", 'target="_blank" rel="noopener"')}
    </nav>
  </header>
  <section id="permanent" data-role="permanent" data-jqs data-jqs-preserve data-turbo-permanent hx-preserve="true" aria-label="Local preferences">
    <label for="preference">Local preference</label><input id="preference" value="server-default">
  </section>
  <main id="main" data-route="${route}" data-role="main" data-jqs tabindex="-1" ${privatePage ? 'hx-history="false"' : ""}>
    <h1>${error ? "Please review the server response" : "Project " + route}</h1>
    ${error ? '<p id="error-summary" role="alert">The server could not accept this operation. Review the marked field or return to the overview.</p>' : ""}
    <p id="revision" data-revision="${revision}">Current revision ${revision}</p>
    <p id="privacy-marker">${privateMarker}</p>
    <section id="nested" data-role="nested" data-jqs aria-label="Guide content">
      <details id="disclosure" data-role="disclosure" data-jqs="collapsible">
        <summary data-part="trigger">Advanced settings</summary>
        <div data-part="content">The server owns routes, validation and saved revisions.</div>
      </details>
      <a id="local-anchor" href="#destination">On-page destination</a>
      <form id="search" method="get" action="${base}/search" hx-push-url="true">
        <label for="query-value">Search documentation</label>
        <input id="query-value" name="query" value="navigation" required>
        <input name="ignored" value="disabled-sentinel" aria-label="Unavailable search option" disabled>
        <button id="search-submit" name="submitter" value="search">Search</button>
      </form>
      <form id="editor" method="post" action="${base}/edit" enctype="multipart/form-data" hx-encoding="multipart/form-data" hx-push-url="true">
        <input name="revision" type="hidden" value="${revision}">
        <label for="title">Project title</label>
        <input id="title" name="title" value="Project" required ${error ? 'autofocus aria-invalid="true" aria-describedby="error-summary"' : ""}>
        <label for="attachment">Attachment</label><input id="attachment" name="attachment" type="file">
        <input name="ignored" value="disabled-sentinel" aria-label="Unavailable editor option" disabled>
        <button id="save" name="intent" value="save">Save</button>
        <button id="preview" name="intent" value="preview">Preview</button>
        <button id="lose-response" name="intent" value="lose">Save with lost response</button>
      </form>
      <output id="outcome" aria-live="polite">${route}</output>
    </section>
    ${route === "region-mismatch" ? '<section id="region-fallback"><h2>Activity document recovery</h2><p>The server intentionally returned a complete document without a matching enhanced region.</p></section>' : `<turbo-frame id="activity" data-role="region" data-jqs><h2 id="activity-title">${region}</h2><p data-role="region-child" data-jqs>Server-authored activity</p>${link("region-link", "region", "Refresh activity", `data-turbo-frame="activity" hx-get="${base}/region" hx-target="#activity" hx-select="#activity > *" hx-push-url="false"`)}${link("region-mismatch", "region-mismatch", "Open activity recovery", `data-turbo-frame="activity" hx-get="${base}/region-mismatch" hx-target="#activity" hx-select="#activity > *" hx-push-url="false"`)}</turbo-frame>`}
    <nav aria-label="Response examples">
      ${link("not-found", "not-found", "Missing document")}
      ${link("server-error", "server-error", "Server error")}
      ${link("download", "download", "Download example", `${native} download="example.txt"`)}
      ${link("non-html", "text", "Plain text document", native)}
      ${link("head-change", "head", "Changed document assets", native)}
      ${link("private", "private", "Private document")}
      ${link("slow", "slow", "Slow document")}
      ${link("fast", "fast", "Fast document")}
      ${link("canceled", "canceled", "Cancel this intent")}
      ${link("no-content", "no-content", "No content")}
      ${link("network-error", "network-error", "Unavailable connection")}
    </nav>
    <p id="progress" role="status" hidden>Loading the server document.</p>
    <p id="recovery" role="alert" hidden>Navigation could not finish. Return to the overview or inspect the server's current document.</p>
    <div class="long-content" aria-hidden="true"></div>
    <h2 id="destination" tabindex="-1">Document destination</h2>
    <p>The destination is part of the server document.</p>
  </main>
  <footer>Native HTML remains usable without JavaScript.</footer>
</body>
</html>`;
}

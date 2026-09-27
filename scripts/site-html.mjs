import { JSDOM } from "jsdom";
import ts from "typescript";

function appendToken(document, fragment, value, kind) {
  if (!kind) {
    fragment.append(document.createTextNode(value));
    return;
  }
  const span = document.createElement("span");
  span.className = `syntax-${kind}`;
  span.textContent = value;
  fragment.append(span);
}

function scriptToken(kind, value) {
  if (kind >= ts.SyntaxKind.FirstKeyword && kind <= ts.SyntaxKind.LastKeyword) return "keyword";
  if (kind === ts.SyntaxKind.NumericLiteral) return "number";
  if (
    [
      ts.SyntaxKind.StringLiteral,
      ts.SyntaxKind.NoSubstitutionTemplateLiteral,
      ts.SyntaxKind.TemplateHead,
      ts.SyntaxKind.TemplateMiddle,
      ts.SyntaxKind.TemplateTail,
    ].includes(kind)
  )
    return "string";
  if ([ts.SyntaxKind.SingleLineCommentTrivia, ts.SyntaxKind.MultiLineCommentTrivia].includes(kind))
    return "comment";
  if (kind === ts.SyntaxKind.Identifier && value.startsWith("$")) return "signal";
  if (kind >= ts.SyntaxKind.FirstPunctuation && kind <= ts.SyntaxKind.LastPunctuation)
    return "punctuation";
  return undefined;
}

function highlightScript(document, fragment, source) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source,
  );
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    const value = scanner.getTokenText();
    appendToken(document, fragment, value, scriptToken(kind, value));
  }
}

function highlightPattern(document, fragment, source, expression, classify) {
  let offset = 0;
  for (const match of source.matchAll(expression)) {
    appendToken(document, fragment, source.slice(offset, match.index));
    appendToken(document, fragment, match[0], classify(match));
    offset = match.index + match[0].length;
  }
  appendToken(document, fragment, source.slice(offset));
}

function highlightTag(document, fragment, tag) {
  highlightPattern(
    document,
    fragment,
    tag,
    /(^<\/?[\w:-]+)|("[^"]*"|'[^']*')|([\w:-]+(?=\s*=))|([<>/=])/g,
    (match) => {
      if (match[1]) return "tag";
      if (match[2]) return "string";
      if (match[3]) return "attribute";
      return "punctuation";
    },
  );
}

function highlightHtml(document, fragment, source) {
  let offset = 0;
  const tags =
    /<!--[\s\S]*?-->|<\/?[a-zA-Z][\w:-]*(?:\s+[^\s=<>/'"]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*\s*\/?>/g;
  for (const match of source.matchAll(tags)) {
    appendToken(document, fragment, source.slice(offset, match.index));
    if (match[0].startsWith("<!--")) appendToken(document, fragment, match[0], "comment");
    else highlightTag(document, fragment, match[0]);
    offset = match.index + match[0].length;
  }
  appendToken(document, fragment, source.slice(offset));
}

function languageFor(code, label) {
  if (/^\s*</.test(code)) return "html";
  if (/terminal|shell/i.test(label) || /^\s*(npm|npx|node|shasum|curl)\b/.test(code))
    return "shell";
  if (
    /typescript|javascript|json/i.test(label) ||
    /^\s*(import|export|const|let|\$\.|shared\.|[{[])/.test(code)
  )
    return "typescript";
  return "text";
}

const languageLabels = {
  html: "HTML",
  shell: "Terminal",
  typescript: "JavaScript / TypeScript",
  text: "Text",
};

function codeFrame(document, pre, language) {
  const existing = pre.closest('.code-block, [data-jqs="code-block"]');
  if (existing) {
    existing.classList.add("code-block");
    return existing;
  }
  const block = document.createElement("div");
  block.className = "code-block";
  const heading = document.createElement("div");
  heading.className = "code-heading";
  const label = document.createElement("span");
  label.textContent = languageLabels[language];
  const copy = document.createElement("button");
  copy.type = "button";
  copy.textContent = "Copy";
  copy.setAttribute("data-on:click", "@site.copyCode");
  heading.append(label);
  if (!pre.closest('[aria-hidden="true"], [inert]')) heading.append(copy);
  pre.replaceWith(block);
  block.append(heading, pre);
  return block;
}

function formatCode(document) {
  for (const code of document.querySelectorAll("code")) {
    if (code.parentElement?.tagName === "PRE" || !code.textContent.includes("\n")) continue;
    const pre = document.createElement("pre");
    code.replaceWith(pre);
    pre.append(code);
  }
  for (const pre of document.querySelectorAll("pre")) {
    let code = pre.querySelector("code");
    if (!code) {
      code = document.createElement("code");
      code.textContent = pre.textContent;
      pre.replaceChildren(code);
    }
    const source = code.textContent;
    const label =
      pre.closest(".code-block")?.querySelector(".code-heading span")?.textContent ?? "";
    const language = languageFor(source, label);
    codeFrame(document, pre, language);
    code.dataset.language = language;
    const fragment = document.createDocumentFragment();
    if (language === "html") highlightHtml(document, fragment, source);
    else if (language === "typescript") highlightScript(document, fragment, source);
    else if (language === "shell") {
      highlightPattern(
        document,
        fragment,
        source,
        /(^|(?<=\n))(?:npm|npx|node|shasum|curl)\b|--?[\w-]+|"[^"]*"|'[^']*'|#[^\n]*/g,
        (match) => (match[0].startsWith("#") ? "comment" : "keyword"),
      );
    } else appendToken(document, fragment, source);
    code.replaceChildren(fragment);
  }
}

function insertLab(document, source, blocks) {
  const slots = document.querySelectorAll("[data-component-lab]");
  if (slots.length === 0) return;
  if (slots.length !== 1)
    throw new Error("A site document must have exactly one Component Lab slot.");
  const slot = slots[0];
  slot.innerHTML = source;
  for (const mount of slot.querySelectorAll("[data-registry-block]")) {
    const name = mount.getAttribute("data-registry-block");
    if (!blocks[name]) throw new Error(`Missing Component Lab block: ${name}.`);
    mount.innerHTML = blocks[name];
    if (name === "project-browser")
      mount
        .querySelector('form[data-project-browser-part="search"]')
        .setAttribute("aria-label", "Search Project Browser");
    if (name === "operations-dashboard") {
      mount.querySelector("#runtime-log-entries").id = "dashboard-runtime-log-entries";
      mount.querySelector('[data-dashboard-part="terminal"] h3').textContent =
        "Operations dashboard server log";
      mount
        .querySelector('[data-dashboard-part="payload"]')
        .setAttribute("aria-label", "Operations dashboard payload");
      for (const button of mount.querySelectorAll("button")) {
        const action = button.getAttribute("data-on:click");
        if (action === "@operationsDashboard.refresh")
          button.textContent = "Refresh dashboard snapshot";
        if (action === "@operationsDashboard.stream") button.textContent = "Stream dashboard logs";
      }
      mount
        .querySelector("[data-stream-url]")
        .setAttribute("data-stream-url", "/api/demo/runtime/stream?target=dashboard");
    }
  }
  const nav = slot.querySelector(".lab-navigation");
  if (!nav) throw new Error("The Component Lab navigation is missing.");
  for (const section of slot.querySelectorAll(".component-lab > section[aria-labelledby]")) {
    const label = document.getElementById(section.getAttribute("aria-labelledby"));
    if (!label) throw new Error("A Component Lab section is missing its label.");
    const link = document.createElement("a");
    link.href = `#${label.id}`;
    link.textContent = label.textContent.trim();
    nav.append(link);
  }
  const stylesheet = document.createElement("link");
  stylesheet.rel = "stylesheet";
  stylesheet.href = "/style.css";
  document.head.append(stylesheet);
}

/** Compose authored site HTML. Display code is escaped through DOM text nodes. */
export function composeSiteHtml(html, labSource, blocks = {}) {
  const dom = new JSDOM(html);
  try {
    insertLab(dom.window.document, labSource, blocks);
    formatCode(dom.window.document);
    return dom.serialize();
  } finally {
    dom.window.close();
  }
}

import $ from "jquery";
import { installStar } from "../src/index";
import "../src/ui/theme.css";
import { type AgentSearchResult, loadAgentContent } from "./agent-content";
import { disposeJqStarWebMcp, installJqStarWebMcp } from "./webmcp";

type SiteState = {
  siteSearch: string;
};

const THEME_KEY = "jqstar-site-theme";
const BASE_URL = import.meta.env.BASE_URL;

function preferredTheme(): "dark" | "light" {
  try {
    const stored = window.localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") return stored;
  } catch {
    // A blocked storage API should not prevent the site from loading.
  }
  return "dark";
}

function applyTheme(theme: "dark" | "light"): void {
  document.documentElement.dataset.theme = theme;
  document.documentElement.style.colorScheme = theme;
  for (const label of document.querySelectorAll<HTMLElement>("[data-theme-label]")) {
    label.textContent = theme === "dark" ? "Use light theme" : "Use dark theme";
  }
}

applyTheme(preferredTheme());
installStar($);

$.star.action<SiteState>("site.toggleTheme", () => {
  const next = document.documentElement.dataset.theme === "dark" ? "light" : "dark";
  applyTheme(next);
  try {
    window.localStorage.setItem(THEME_KEY, next);
  } catch {
    // Theme selection remains active for this page when storage is unavailable.
  }
});

$.star.action<SiteState>("site.copy", async (context) => {
  const value = context.args?.[0];
  if (typeof value !== "string") throw new TypeError("site.copy needs an authored string.");
  const button = context.element instanceof HTMLButtonElement ? context.element : undefined;
  const statusId = button?.getAttribute("aria-describedby");
  const status = statusId ? document.getElementById(statusId) : null;
  if (status) status.textContent = "Copied to clipboard.";
  if (button) {
    const original = button.textContent;
    button.textContent = "Copied";
    window.setTimeout(() => {
      button.textContent = original;
    }, 1400);
  }
  await window.navigator.clipboard.writeText(value);
});

$.star.action<SiteState>("site.copyCode", async (context) => {
  const button = context.element instanceof HTMLButtonElement ? context.element : undefined;
  const code = button?.closest(".code-block")?.querySelector("code")?.textContent;
  if (!button || !code) throw new Error("site.copyCode needs a code block button.");
  const original = button.textContent;
  button.textContent = "Copied";
  window.setTimeout(() => {
    button.textContent = original;
  }, 1400);
  await window.navigator.clipboard.writeText(code);
});

$.star.action<SiteState>("site.clearSearch", (context) => {
  context.state.siteSearch = "";
  const input = context.root.querySelector<HTMLInputElement>("[data-site-search-input]");
  input?.focus();
});

function dialogShell(
  id: string,
  title: string,
): {
  close: HTMLButtonElement;
  content: HTMLDivElement;
  dialog: HTMLDialogElement;
} {
  const dialog = document.createElement("dialog");
  dialog.id = id;
  dialog.className = "site-dialog";
  dialog.dataset.jqs = "dialog";
  dialog.dataset.closeOnBackdrop = "";

  const content = document.createElement("div");
  content.dataset.part = "content";
  const heading = document.createElement("div");
  heading.className = "dialog-heading";
  const titleElement = document.createElement("h2");
  titleElement.dataset.part = "title";
  titleElement.textContent = title;
  const close = document.createElement("button");
  close.className = "dialog-close";
  close.type = "button";
  close.textContent = "Close";
  close.addEventListener("click", () => $.star.ui.dialog.close(dialog, "close"));
  heading.append(titleElement, close);
  content.append(heading);
  dialog.append(content);
  document.body.append(dialog);
  $.star.ui.enhance(dialog);
  return { close, content, dialog };
}

$.star.action<SiteState>("site.openSearch", (context) => {
  let dialog = document.querySelector<HTMLDialogElement>("#site-search-dialog");
  if (!dialog) {
    const shell = dialogShell("site-search-dialog", "Search documentation");
    dialog = shell.dialog;
    const description = document.createElement("p");
    description.dataset.part = "description";
    description.textContent = "Filter the current documentation routes by title.";
    const input = document.createElement("input");
    input.className = "site-search-input";
    input.type = "search";
    input.placeholder = "Search components and guides…";
    input.setAttribute("aria-label", "Search documentation");
    const results = document.createElement("ul");
    results.className = "search-results";
    let renderSequence = 0;
    const renderResults = async () => {
      const sequence = ++renderSequence;
      const query = input.value.trim();
      let matches: AgentSearchResult[];
      try {
        const content = await loadAgentContent();
        if (sequence !== renderSequence) return;
        matches = query
          ? content.search(query, { types: ["guide"] })
          : content.corpus.guides.map(({ id, title, summary, canonicalUrl, path }) => ({
              id,
              type: "guide" as const,
              title,
              summary,
              canonicalUrl,
              path,
              score: 0,
            }));
      } catch {
        if (sequence !== renderSequence) return;
        const item = document.createElement("li");
        item.textContent = "The local documentation index is unavailable.";
        results.replaceChildren(item);
        return;
      }
      results.replaceChildren(
        ...matches.map((match) => {
          const item = document.createElement("li");
          const link = document.createElement("a");
          link.href = `${BASE_URL}${match.path}`;
          link.textContent = match.title;
          item.append(link);
          return item;
        }),
      );
    };
    void renderResults();
    input.addEventListener("input", () => void renderResults());
    input.addEventListener("keydown", (event) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      event.stopPropagation();
      $.star.ui.dialog.close(shell.dialog, "escape");
    });
    shell.content.append(description, input, results);
  }
  const input = dialog.querySelector<HTMLInputElement>('input[type="search"]');
  $.star.ui.dialog.open(dialog, {
    ...(input ? { initialFocus: input } : {}),
    ...(context.element ? { trigger: context.element } : {}),
  });
});

$.star.action<SiteState>("site.openMobileNav", (context) => {
  let dialog = document.querySelector<HTMLDialogElement>("#site-mobile-nav");
  if (!dialog) {
    const source = document.querySelector<HTMLElement>("[data-docs-nav]");
    if (!source) throw new Error("The documentation navigation source is missing.");
    const shell = dialogShell("site-mobile-nav", "Documentation");
    dialog = shell.dialog;
    const nav = source.cloneNode(true);
    if (!(nav instanceof HTMLElement))
      throw new TypeError("The documentation navigation is invalid.");
    nav.className = "mobile-nav-content";
    nav.removeAttribute("data-docs-nav");
    nav.setAttribute("aria-label", "Mobile documentation");
    shell.content.append(nav);
  }
  $.star.ui.dialog.open(dialog, {
    ...(context.element ? { trigger: context.element } : {}),
  });
});

for (const link of document.querySelectorAll<HTMLAnchorElement>("[data-doc-link]")) {
  const current = new URL(window.location.href);
  const target = new URL(link.href, current);
  const normalize = (pathname: string): string =>
    pathname.replace(/index\.html$/, "").replace(/\/$/, "");
  if (normalize(current.pathname) === normalize(target.pathname))
    link.setAttribute("aria-current", "page");
}

$("body").star();

void installJqStarWebMcp().catch(() => undefined);
window.addEventListener("pagehide", () => disposeJqStarWebMcp(), { once: true });

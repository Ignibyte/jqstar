import { readFile, readdir } from "node:fs/promises";
import { JSDOM } from "jsdom";
import { expect, it } from "vitest";
import { composeSiteHtml } from "../scripts/site-html.mjs";

const fragment = await readFile("example/lab-content.html", "utf8");
const blockNames = [
  "project-browser",
  "access-manager",
  "audit-log",
  "operations-dashboard",
  "profile-settings",
];
const blocks = Object.fromEntries(
  await Promise.all(
    blockNames.map(async (name) => [name, await readFile(`registry/blocks/${name}.html`, "utf8")]),
  ),
);

it("embeds every Lab example and all seven registry blocks with unique IDs on all integrated routes", async () => {
  const registry = JSON.parse(await readFile("registry.json", "utf8"));
  const authored = new JSDOM(fragment);
  const ids = [...authored.window.document.querySelectorAll("[id]")].map((element) => element.id);
  const expectedBlocks = registry.items
    .filter((item) => item.type === "registry:block")
    .map((item) => item.name)
    .sort();
  for (const path of [
    "example/index.html",
    "example/docs/components/index.html",
    "example/components/lab/index.html",
  ]) {
    const dom = new JSDOM(composeSiteHtml(await readFile(path, "utf8"), fragment, blocks));
    try {
      const document = dom.window.document;
      expect(document.querySelectorAll(".component-lab")).toHaveLength(1);
      expect(document.querySelectorAll("iframe")).toHaveLength(0);
      expect(document.querySelector(".component-lab").hasAttribute("data-jqs")).toBe(true);
      for (const id of ids) expect(document.getElementById(id), `${path}: ${id}`).not.toBeNull();
      const renderedIds = [...document.querySelectorAll("[id]")].map((element) => element.id);
      expect(new Set(renderedIds).size).toBe(renderedIds.length);
      expect(
        [...document.querySelectorAll("[data-block]")]
          .map((element) => element.dataset.block)
          .sort(),
      ).toEqual(expectedBlocks);
      expect(document.querySelectorAll(".lab-navigation a")).toHaveLength(
        authored.window.document.querySelectorAll(".component-lab > section[aria-labelledby]")
          .length,
      );
    } finally {
      dom.window.close();
    }
  }
  authored.window.close();
});

it("frames every authored display example and preserves exact source through coloring", async () => {
  const pages = (await readdir("example", { recursive: true })).filter(
    (path) => path === "index.html" || path.endsWith("/index.html"),
  );
  for (const path of pages) {
    const source = await readFile(`example/${path}`, "utf8");
    const before = new JSDOM(source);
    const after = new JSDOM(composeSiteHtml(source, fragment, blocks));
    try {
      const expected = [...before.window.document.querySelectorAll("pre")].map(
        (pre) => pre.textContent,
      );
      const actual = [...after.window.document.querySelectorAll("pre")];
      for (const text of expected)
        expect(
          actual.some((pre) => pre.textContent === text),
          path,
        ).toBe(true);
      for (const pre of actual) {
        expect(pre.closest(".code-block"), path).not.toBeNull();
        expect(pre.querySelector("code"), path).not.toBeNull();
        expect(pre.querySelectorAll("script, button, input, dialog"), path).toHaveLength(0);
        const code = pre.querySelector("code");
        if (code.dataset.language !== "text")
          expect(code.querySelectorAll('[class^="syntax-"]').length, path).toBeGreaterThan(0);
      }
    } finally {
      before.window.close();
      after.window.close();
    }
  }
});

it("keeps hostile-looking example strings inert and preserves whitespace and quoted comparisons", () => {
  const text = `<script>window.exampleExecuted = true;</script>\n<button data-on:click="$count > 1 && $(el).fadeOut()">Go & wait</button>`;
  const source = new JSDOM("<!doctype html><html><body><pre><code></code></pre></body></html>");
  source.window.document.querySelector("code").textContent = text;
  const dom = new JSDOM(composeSiteHtml(source.serialize(), ""));
  try {
    expect(dom.window.document.querySelector("code").textContent).toBe(text);
    expect(dom.window.document.querySelectorAll("script")).toHaveLength(0);
    expect(dom.window.document.querySelectorAll(".syntax-attribute").length).toBeGreaterThan(0);
    expect(dom.window.document.querySelectorAll(".code-heading button")).toHaveLength(1);
  } finally {
    source.window.close();
    dom.window.close();
  }
});

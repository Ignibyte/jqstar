import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

import ts from "typescript";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const publicRoutes = [
  "example/index.html",
  "example/docs/index.html",
  "example/docs/agents/index.html",
  "example/docs/compatibility/index.html",
  "example/docs/migration/index.html",
  "example/docs/security/index.html",
  "example/docs/download/index.html",
  "example/docs/datastar/index.html",
  "example/docs/api/index.html",
  "example/docs/csp/index.html",
  "example/docs/stores/index.html",
  "example/docs/persistence/index.html",
  "example/docs/interoperability/index.html",
  "example/docs/ecosystem/index.html",
  "example/docs/ecosystem/jquery-ui/index.html",
  "example/docs/ecosystem/jquery-mobile/index.html",
  "example/docs/plugins/index.html",
  "example/docs/testing/index.html",
  "example/docs/components/index.html",
  "example/docs/components/dialog/index.html",
  "example/docs/components/dropdown/index.html",
  "example/docs/components/tabs/index.html",
  "example/docs/components/toast/index.html",
];

async function routeArray(path, name) {
  const source = ts.createSourceFile(
    path,
    await readFile(resolve(root, path), "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
  );
  const declaration = source.statements
    .filter(ts.isVariableStatement)
    .flatMap((statement) => [...statement.declarationList.declarations])
    .find((entry) => ts.isIdentifier(entry.name) && entry.name.text === name);
  let array = declaration?.initializer;
  if (array && ts.isCallExpression(array)) {
    expect(ts.isPropertyAccessExpression(array.expression)).toBe(true);
    expect(array.expression.name.text).toBe("map");
    array = array.expression.expression;
  }
  if (array && ts.isAsExpression(array)) array = array.expression;
  expect(array && ts.isArrayLiteralExpression(array), `${path}:${name}`).toBe(true);
  return [...array.elements];
}

describe("jQStar website structure", () => {
  it("identifies the current release candidate consistently on home and download pages", async () => {
    const [home, download, packageSource, releaseSource] = await Promise.all([
      readFile(resolve(root, "example/index.html"), "utf8"),
      readFile(resolve(root, "example/docs/download/index.html"), "utf8"),
      readFile(resolve(root, "package.json"), "utf8"),
      readFile(resolve(root, "quality/release-contract.json"), "utf8"),
    ]);
    const version = JSON.parse(packageSource).version;
    expect(version).toBe(JSON.parse(releaseSource).version);
    const document = new globalThis.DOMParser().parseFromString(home, "text/html");
    expect(document.querySelectorAll(".release-pill")).toHaveLength(1);
    expect(document.querySelector(".release-pill").textContent.trim()).toBe(
      `jQStar ${version} release candidate`,
    );
    expect(download).toContain(`jQStar ${version} release candidate`);
  });

  it("covers the HTML file census in both build and verification route lists", async () => {
    const pages = (await readdir(resolve(root, "example"), { recursive: true }))
      .filter((file) => file === "index.html" || file.endsWith("/index.html"))
      .sort();
    expect(pages.length).toBeGreaterThan(0);
    const entries = await routeArray("vite.demo.config.ts", "siteEntries");
    expect(entries.every(ts.isStringLiteral)).toBe(true);
    expect(entries.map((entry) => entry.text).sort()).toEqual(pages);
    expect([...publicRoutes].sort()).toEqual(
      pages.filter((file) => file !== "components/lab/index.html").map((file) => `example/${file}`),
    );
    const browserRows = await routeArray("e2e/site.spec.ts", "documentationRoutes");
    expect(browserRows.every(ts.isArrayLiteralExpression)).toBe(true);
    expect(browserRows.every((row) => row.elements.length === 2)).toBe(true);
    expect(browserRows.every((row) => row.elements.every(ts.isStringLiteral))).toBe(true);
    expect(browserRows.map((row) => row.elements[0].text).sort()).toEqual(
      pages
        .filter((file) => file.startsWith("docs/"))
        .map((file) => `/${file.slice(0, -10)}`)
        .sort(),
    );
  });

  it("publishes every planned route as native HTML with the shared jQStar consumer", async () => {
    for (const route of publicRoutes) {
      const source = await readFile(resolve(root, route), "utf8");
      expect(source, route).toContain(
        route === "example/index.html" ? "<main" : '<article class="docs-article">',
      );
      expect(source, route).toContain("data-signals=");
      expect(source, route).toContain('src="/site.ts"');
      expect(source, route).not.toMatch(/id=["']root["']|main\.tsx|react-dom|wouter|@radix-ui/i);
    }
  });

  it("keeps the exhaustive proof at the isolated Component Lab route", async () => {
    const lab = await readFile(resolve(root, "example/components/lab/index.html"), "utf8");
    expect(lab).toContain('src="/main.ts"');
    expect(lab).toContain("Open verified dialog");
    expect(lab).toContain("Backend account proof");
    expect(lab).not.toContain('src="/site.ts"');
  });

  it("does not import the downloaded React repository or its metadata", async () => {
    const files = await readdir(resolve(root, "example"), { recursive: true });
    const forbiddenMetadata = new RegExp(
      ["pnpm-lock", ["rep", "lit"].join(""), "components\\.json"].join("|"),
    );
    expect(files.some((file) => file.endsWith(".tsx"))).toBe(false);
    expect(files.some((file) => file.includes("/.git/"))).toBe(false);
    expect(files.some((file) => forbiddenMetadata.test(file))).toBe(false);
    await expect(access(resolve(root, "example/site.ts"))).resolves.toBeUndefined();
  });

  it("ships the current 1200 by 630 social preview", async () => {
    const home = await readFile(resolve(root, "example/index.html"), "utf8");
    const image = await readFile(resolve(root, "example/public/og-jqstar.png"));
    expect(home).toContain("%BASE_URL%og-jqstar.png");
    expect(image.subarray(1, 4).toString("ascii")).toBe("PNG");
    expect(image.readUInt32BE(16)).toBe(1200);
    expect(image.readUInt32BE(20)).toBe(630);
    expect(image.byteLength).toBeLessThanOrEqual(400_000);
  });

  it("self-hosts the reference display fonts with their licenses", async () => {
    const stylesheet = await readFile(resolve(root, "example/site.css"), "utf8");
    for (const [family, file] of [
      ["Audiowide", "audiowide-latin.woff2"],
      ["Inter", "inter-latin.woff2"],
      ["Silkscreen", "silkscreen-regular-latin.woff2"],
      ["Silkscreen", "silkscreen-bold-latin.woff2"],
    ]) {
      expect(stylesheet).toContain(`font-family: ${family}`);
      expect(stylesheet).toContain(`/fonts/${file}`);
      const font = await readFile(resolve(root, "example/public/fonts", file));
      expect(font.subarray(0, 4).toString("ascii")).toBe("wOF2");
    }
    for (const family of ["Audiowide", "Inter", "Silkscreen"]) {
      const license = await readFile(
        resolve(root, "example/public/fonts", `OFL-${family}.txt`),
        "utf8",
      );
      expect(license).toContain("SIL OPEN FONT LICENSE Version 1.1");
    }
  });

  it("ships generated agent discovery files and the visible agent route", async () => {
    const [guide, llms, full, index] = await Promise.all([
      readFile(resolve(root, "example/docs/agents/index.html"), "utf8"),
      readFile(resolve(root, "example/public/llms.txt"), "utf8"),
      readFile(resolve(root, "example/public/llms-full.txt"), "utf8"),
      readFile(resolve(root, "example/public/jqstar-agent-index.json"), "utf8"),
    ]);
    expect(guide).toContain("Agent-first parity:");
    expect(guide).toContain("get_jqstar_component");
    expect(llms).toContain("https://ignibyte.github.io/jqstar/docs/agents/");
    expect(full).toContain("$ is real jQuery.");
    expect(full).toContain("@starfederation/datastar-sdk");
    expect(JSON.parse(index)).toMatchObject({
      schema: "jqstar-agent-index/1",
      corpusVersion: 6,
      package: { name: "jquery-star", version: "1.1.0" },
    });
  });
});

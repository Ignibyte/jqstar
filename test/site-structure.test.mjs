import { access, readFile, readdir } from "node:fs/promises";
import { resolve } from "node:path";

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
  "example/docs/interoperability/index.html",
  "example/docs/ecosystem/index.html",
  "example/docs/ecosystem/jquery-mobile/index.html",
  "example/docs/plugins/index.html",
  "example/docs/testing/index.html",
  "example/docs/components/index.html",
  "example/docs/components/dialog/index.html",
  "example/docs/components/dropdown/index.html",
  "example/docs/components/tabs/index.html",
  "example/docs/components/toast/index.html",
];

describe("jQStar website structure", () => {
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
      corpusVersion: 5,
      package: { name: "jquery-star", version: "1.1.0" },
    });
  });
});

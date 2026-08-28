import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";

import { afterEach, describe, expect, it } from "vitest";

const cli = resolve("bin/jqstar.mjs");
const temporaryDirectories: string[] = [];

function run(...args: string[]) {
  return spawnSync(process.execPath, [cli, ...args], {
    encoding: "utf8",
  });
}

async function project(): Promise<string> {
  const path = await mkdtemp(join(tmpdir(), "jquery-star-cli-"));
  temporaryDirectories.push(path);
  return path;
}

afterEach(async () => {
  await Promise.all(temporaryDirectories.splice(0).map((path) => rm(path, { recursive: true })));
});

describe("jqstar CLI", () => {
  it("lists the complete registry as structured data", () => {
    const result = run("list", "--json");

    expect(result.status).toBe(0);
    const items = JSON.parse(result.stdout) as Array<{ name: string }>;
    expect(items).toHaveLength(101);
    expect(items.map((item) => item.name)).toEqual(
      expect.arrayContaining([
        "button",
        "dialog",
        "combobox",
        "data-table",
        "progress",
        "breadcrumb",
        "pagination",
        "navigation-menu",
        "command-palette",
        "number-field",
        "password-field",
        "tags-input",
        "input-otp",
        "resizable",
        "scroll-area",
        "context-menu",
        "menubar",
        "tree",
        "sidebar",
        "carousel",
        "toolbar",
        "stepper",
        "sortable",
        "file-upload",
        "multi-select",
        "time-picker",
        "color-picker",
        "rating",
        "message",
        "message-scroller",
        "search-field",
        "item",
        "feed",
        "questionnaire",
        "attachment",
        "bubble",
        "aspect-ratio",
        "chart",
        "direction",
        "marker",
        "table",
        "typography",
        "stat",
        "timeline",
        "status",
        "code-block",
        "browser-mockup",
        "diff",
        "log-viewer",
        "json-viewer",
        "countdown",
        "connection-status",
        "terminal",
        "radial-progress",
        "indicator",
        "dock",
        "swap",
        "key-value",
        "operations-dashboard",
      ]),
    );
  });

  it("filters components and blocks without changing the registry vocabulary", () => {
    const blocks = run("list", "--type", "block", "--json");
    const components = run("list", "--type", "component", "--json");

    expect(blocks.status).toBe(0);
    expect(components.status).toBe(0);
    expect(JSON.parse(blocks.stdout).map((item: { name: string }) => item.name)).toEqual([
      "command-palette",
      "async-form",
      "operations-dashboard",
    ]);
    expect(JSON.parse(components.stdout)).toHaveLength(98);
  });

  it("initializes a project and copies requested source recipes", async () => {
    const cwd = await project();
    const initialized = run("init", "--cwd", cwd);
    const added = run("add", "button", "dialog", "--cwd", cwd);

    expect(initialized.status).toBe(0);
    expect(added.status).toBe(0);
    expect(JSON.parse(await readFile(join(cwd, "jquery-star.json"), "utf8"))).toMatchObject({
      blocksOutput: "blocks/jquery-star",
      output: "components/jquery-star",
    });
    expect(await readFile(join(cwd, "components/jquery-star/button.html"), "utf8")).toBe(
      await readFile(resolve("registry/components/button.html"), "utf8"),
    );
    expect(await readFile(join(cwd, "components/jquery-star/dialog.html"), "utf8")).toContain(
      "@ui.dialog.open('#example-dialog', '#example-dialog-cancel')",
    );
  });

  it("installs block files together in their explicit source-owned targets", async () => {
    const cwd = await project();
    run("init", "--cwd", cwd);

    const added = run("add", "operations-dashboard", "--json", "--cwd", cwd);

    expect(added.status).toBe(0);
    expect(JSON.parse(added.stdout)).toEqual([
      expect.objectContaining({
        component: "operations-dashboard",
        path: join(cwd, "blocks/jquery-star/operations-dashboard.html"),
      }),
      expect.objectContaining({
        component: "operations-dashboard",
        path: join(cwd, "blocks/jquery-star/operations-dashboard.ts"),
      }),
    ]);
    expect(
      await readFile(join(cwd, "blocks/jquery-star/operations-dashboard.html"), "utf8"),
    ).toContain('data-block="operations-dashboard"');
    expect(
      await readFile(join(cwd, "blocks/jquery-star/operations-dashboard.ts"), "utf8"),
    ).toContain("installOperationsDashboard");
  });

  it("keeps old configs working when an external block has no explicit target", async () => {
    const cwd = await project();
    await writeFile(join(cwd, "legacy-block.html"), "<section>Legacy block</section>\n", "utf8");
    await writeFile(
      join(cwd, "registry.json"),
      JSON.stringify({
        items: [
          {
            files: [{ path: "legacy-block.html", type: "registry:file" }],
            name: "legacy-block",
            type: "registry:block",
          },
        ],
      }),
      "utf8",
    );
    await writeFile(
      join(cwd, "jquery-star.json"),
      JSON.stringify({ output: "legacy-components", registry: "./registry.json" }),
      "utf8",
    );

    const result = run("add", "legacy-block", "--cwd", cwd);

    expect(result.status).toBe(0);
    expect(await readFile(join(cwd, "legacy-components/legacy-block.html"), "utf8")).toContain(
      "Legacy block",
    );
  });

  it("supports dry runs without creating project files", async () => {
    const cwd = await project();
    const initialized = run("init", "--cwd", cwd);
    const result = run("add", "tabs", "--dry-run", "--cwd", cwd);

    expect(initialized.status).toBe(0);
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("would-copy");
    await expect(readFile(join(cwd, "components/jquery-star/tabs.html"))).rejects.toMatchObject({
      code: "ENOENT",
    });
  });

  it("refuses overwrites unless force is explicit", async () => {
    const cwd = await project();
    run("init", "--cwd", cwd);
    expect(run("add", "button", "--cwd", cwd).status).toBe(0);

    const refused = run("add", "button", "--cwd", cwd);
    expect(refused.status).toBe(1);
    expect(refused.stderr).toContain("Refusing to overwrite existing files");

    const replaced = run("add", "button", "--force", "--cwd", cwd);
    expect(replaced.status).toBe(0);
  });

  it("rejects output paths outside the project", async () => {
    const cwd = await project();
    await writeFile(join(cwd, "jquery-star.json"), '{"output":"../outside"}\n', "utf8");

    const result = run("add", "button", "--cwd", cwd);
    expect(result.status).toBe(1);
    expect(result.stderr).toContain("Path must stay inside the project");
  });

  it("reports a healthy configured consumer project", async () => {
    const cwd = await project();
    await writeFile(
      join(cwd, "package.json"),
      JSON.stringify({ dependencies: { jquery: "^4.0.0", "jquery-star": "^0.1.0" } }),
      "utf8",
    );
    expect(run("init", "--cwd", cwd).status).toBe(0);
    expect(run("add", "button", "--cwd", cwd).status).toBe(0);
    await mkdir(join(cwd, "components/jquery-star"), { recursive: true });

    const result = run("doctor", "--json", "--cwd", cwd);
    expect(result.status).toBe(0);
    const checks = JSON.parse(result.stdout) as Array<{ ok: boolean }>;
    expect(checks.every((check) => check.ok)).toBe(true);
  });
});

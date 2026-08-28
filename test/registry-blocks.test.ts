import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

interface RegistryFile {
  path: string;
  target: string;
  type: string;
}

interface RegistryItem {
  files: RegistryFile[];
  name: string;
  registryDependencies?: string[];
  type: string;
}

interface Registry {
  items: RegistryItem[];
}

async function registry(): Promise<Registry> {
  return JSON.parse(await readFile(resolve("registry.json"), "utf8")) as Registry;
}

describe("source registry blocks", () => {
  it("ships a multi-file operations dashboard whose dependencies resolve", async () => {
    const manifest = await registry();
    const item = manifest.items.find(({ name }) => name === "operations-dashboard");
    const names = new Set(manifest.items.map(({ name }) => name));

    expect(item).toMatchObject({ type: "registry:block" });
    expect(item?.files).toEqual([
      expect.objectContaining({
        path: "registry/blocks/operations-dashboard.html",
        target: "~/blocks/jquery-star/operations-dashboard.html",
      }),
      expect.objectContaining({
        path: "registry/blocks/operations-dashboard.ts",
        target: "~/blocks/jquery-star/operations-dashboard.ts",
      }),
    ]);
    expect(item?.registryDependencies?.every((name) => names.has(name))).toBe(true);
  });

  it("connects the block markup to its typed actions and backend contracts", async () => {
    const html = await readFile(resolve("registry/blocks/operations-dashboard.html"), "utf8");
    const actions = await readFile(resolve("registry/blocks/operations-dashboard.ts"), "utf8");

    expect(html).toContain('data-block="operations-dashboard"');
    expect(html).toContain('data-on:click="@operationsDashboard.refresh"');
    expect(html).toContain('data-on:click="@operationsDashboard.stream"');
    expect(html).toContain('id="runtime-log-entries"');
    expect(html).toContain('data-jqs="json-viewer"');
    expect(actions).toContain(
      '$.star.action<OperationsDashboardState>("operationsDashboard.refresh"',
    );
    expect(actions).toContain('$.star.get<OperationsDashboardState>(endpoint(root, "streamUrl")');
    expect(actions).toContain("installOperationsDashboard();");
  });

  it("ships Profile Settings as native form markup plus typed backend actions", async () => {
    const manifest = await registry();
    const item = manifest.items.find(({ name }) => name === "profile-settings");
    const html = await readFile(resolve("registry/blocks/profile-settings.html"), "utf8");
    const actions = await readFile(resolve("registry/blocks/profile-settings.ts"), "utf8");

    expect(item).toMatchObject({ type: "registry:block" });
    expect(item?.files).toHaveLength(2);
    expect(item?.registryDependencies).toEqual(
      expect.arrayContaining(["editable", "clipboard", "input", "button"]),
    );
    expect(html).toContain('data-on:submit__prevent="@profileSettings.save"');
    expect(html.match(/data-jqs="editable"/g)).toHaveLength(2);
    expect(html).toContain('data-jqs="clipboard"');
    expect(actions).toContain('$.star.action<ProfileSettingsState>("profileSettings.save"');
    expect(actions).toContain('$.star.action<ProfileSettingsState>("profileSettings.rotateInvite"');
  });
});

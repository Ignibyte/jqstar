import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStar } from "../src/compatibility";
import { installStarCore } from "../src/core";
import { datastarPlugin } from "../src/datastar";
import { kernelForDocument } from "../src/kernel";
import { uiPlugin } from "../src/ui";
import { parseStarVersion } from "../src/version";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

const frames: HTMLIFrameElement[] = [];
const kernels: Kernel[] = [];

function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  return frame.contentWindow!;
}

afterEach(() => {
  for (const kernel of kernels.splice(0).reverse()) {
    if (!kernel.disposed) kernel.dispose();
  }
  for (const frame of frames.splice(0).reverse()) frame.remove();
  vi.restoreAllMocks();
});

describe("modular entry points", () => {
  it("imports core and official plugins without installing or touching a document", () => {
    expect(($ as unknown as { star?: unknown }).star).toBeUndefined();
    expect(($.fn as unknown as { star?: unknown }).star).toBeUndefined();
    expect(Object.isFrozen(datastarPlugin)).toBe(true);
    expect(Object.isFrozen(uiPlugin)).toBe(true);
  });

  it("installs generic core explicitly and composes the compatibility root on the same jQuery", () => {
    const owner = realm();
    const installed = installStarCore($, { document: owner.document });
    const kernel = kernelForDocument(owner.document)!;
    kernels.push(kernel);

    expect(installed).toBe($);
    expect(installed.star.version).toBe("1.0.0");
    expect("ui" in installed.star).toBe(false);
    expect(kernel.actions.names()).toEqual(["delete", "get", "patch", "post", "put"]);
    expect(kernel.protocols.snapshot().map(({ id }) => id)).toEqual(["core.generic"]);
    expect(kernel.resourceSummary()).toEqual([]);
    expect(($ as unknown as { ui?: unknown }).ui).toBeUndefined();
    expect(($ as unknown as { widget?: unknown }).widget).toBeUndefined();

    expect(installed.star.use(datastarPlugin).id).toBe("core.datastar");
    expect(kernel.protocols.snapshot().map(({ id }) => id)).toEqual([
      "core.generic",
      "core.datastar",
    ]);
    const ui = installed.star.use(uiPlugin);
    expect((installed.star as unknown as { ui: unknown }).ui).toBe(ui);
    expect(kernel.actions.names().filter((name) => name.startsWith("ui."))).toHaveLength(165);
    expect(kernel.resourceSummary().some(({ kind }) => kind === "listener")).toBe(true);
    expect(kernel.resourceSummary().some(({ kind }) => kind === "observer")).toBe(true);
    expect(kernel.resourceSummary().some(({ kind }) => kind === "service")).toBe(true);

    const root = installStar($, { document: owner.document });
    expect(root).toBe(installed.star);
    expect(root.ui).toBe(ui);

    const report = root.dispose();
    expect(report.failed).toEqual([]);
    expect(report.remaining).toEqual([]);
    expect(report.attempted.map(({ category }) => category)).toEqual(
      expect.arrayContaining(["listener", "observer", "plugin", "service", "subscription"]),
    );
    expect(Object.isFrozen(report)).toBe(true);
    expect(Object.isFrozen(report.attempted)).toBe(true);
    expect(() => JSON.parse(JSON.stringify(report))).not.toThrow();
    expect(root.dispose()).toBe(report);
    expect(($ as unknown as { star?: unknown }).star).toBeUndefined();
    expect(($.fn as unknown as { star?: unknown }).star).toBeUndefined();
    expect(kernelForDocument(owner.document)).toBeUndefined();

    const replacement = installStarCore($, { document: owner.document });
    const replacementKernel = kernelForDocument(owner.document)!;
    kernels.push(replacementKernel);
    expect(replacement.star).not.toBe(root);
    replacement.star.dispose();
  });

  it("rolls a failed UI installation back without listeners, observers, or services", () => {
    const owner = realm();
    const kernel = new Kernel($, owner.document);
    kernels.push(kernel);
    const documentListener = vi.spyOn(owner.document, "addEventListener");
    const windowListener = vi.spyOn(owner, "addEventListener");
    kernel.registerAction("ui.conflict", vi.fn());

    expect(() => kernel.plugins.use(uiPlugin)).toThrow(
      "Plugin namespace ui contains existing action ui.conflict",
    );
    expect(kernel.actions.names()).toEqual(["ui.conflict"]);
    expect(kernel.resourceSummary()).toEqual([]);
    expect(documentListener).not.toHaveBeenCalled();
    expect(windowListener).not.toHaveBeenCalled();
  });

  it("installs the same UI plugin into two isolated document kernels", () => {
    const first = new Kernel($, realm().document);
    const second = new Kernel($, realm().document);
    kernels.push(first, second);

    const firstUI = first.plugins.use(uiPlugin);
    const secondUI = second.plugins.use(uiPlugin);

    expect(firstUI).not.toBe(secondUI);
    expect(first.actions.names()).toEqual(second.actions.names());
    expect(first.actions.names().filter((name) => name.startsWith("ui."))).toHaveLength(165);
    first.dispose();
    expect(second.actions.names().filter((name) => name.startsWith("ui."))).toHaveLength(165);
    expect(second.resourceSummary().length).toBeGreaterThan(0);
  });

  it("validates package versions and rejects incompatible repeat installation", () => {
    const owner = realm();
    const second = realm();
    const installed = installStarCore($, { document: owner.document });
    const kernel = kernelForDocument(owner.document)!;
    kernels.push(kernel);

    expect(parseStarVersion("12.34.56")).toBe("12.34.56");
    expect(() => parseStarVersion("v12.34.56")).toThrow("must be a stable major.minor.patch value");
    expect(() => installStarCore($, { document: second.document })).toThrow(
      "already installed for a different Document",
    );

    const conflicting = (() => undefined) as unknown as JQueryStatic;
    Object.defineProperty(conflicting, "fn", { value: { star: vi.fn() } });
    expect(() => installStarCore(conflicting, { document: second.document })).toThrow(
      "installation from another runtime",
    );
    installed.star.dispose();
  });

  it("attaches the UI facade when plugins are installed as a batch", () => {
    const owner = realm();
    const installed = installStarCore($, { document: owner.document });
    const kernel = kernelForDocument(owner.document)!;
    kernels.push(kernel);

    const [ui] = installed.star.use([uiPlugin] as const);

    expect((installed.star as unknown as { ui: unknown }).ui).toBe(ui);
    installed.star.dispose();
  });
});

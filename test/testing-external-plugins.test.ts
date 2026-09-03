import $ from "jquery";
import { afterEach, describe, expect, it } from "vitest";
import {
  createCleanupFailingExternalPlugin,
  createExternalPlugin,
  createFailingExternalPlugin,
} from "./fixtures/external-plugin/index.js";
import {
  createMockNavigationPlugin,
  type MockNavigationObservation,
} from "./fixtures/mock-navigation-plugin/index.js";
import {
  createResponseController,
  createStarHarness,
  runPluginConformance,
  type StarDOMWindow,
  type StarHarness,
} from "../src/testing";

const frames: HTMLIFrameElement[] = [];
const harnesses: StarHarness[] = [];

function createHarness(): StarHarness {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const active = createStarHarness({
    window: frame.contentWindow as StarDOMWindow,
    jQuery: $,
    responses: createResponseController(),
  });
  harnesses.push(active);
  return active;
}

afterEach(() => {
  for (const active of harnesses.splice(0).reverse()) {
    try {
      active.dispose();
    } catch {
      // Individual tests assert cleanup failures when needed.
    }
  }
  for (const frame of frames.splice(0).reverse()) frame.remove();
});

describe("independent external plugin fixture", () => {
  it("registers every public extension seam and passes runner-neutral conformance", async () => {
    const ledger: string[] = [];
    const plugin = createExternalPlugin(ledger);
    const failedLedger: string[] = [];
    const cleanupLedger: string[] = [];
    const report = await runPluginConformance({
      createHarness,
      plugin,
      failingPlugin: createFailingExternalPlugin(failedLedger),
      cleanupFailingPlugin: createCleanupFailingExternalPlugin(cleanupLedger),
      async exercise(active, facade) {
        expect(facade).toMatchObject({ label: "external-ready" });
        active.responses!.json({ url: "https://example.test/external" }, { loaded: true });
        const root = active.document.createElement("section");
        root.setAttribute("data-signals", "{ externalMarked: false, loaded: false }");
        root.innerHTML = "<output data-acme.external:label></output>";
        active.document.body.append(root);
        const application = active.mountDeclarative<{
          externalMarked: boolean;
          loaded: boolean;
        }>(root);
        await application.instance.run("acme.external.mark");
        await application.instance.run(active.installed.star.get("https://example.test/external"));
        expect(application.state).toMatchObject({ externalMarked: true, loaded: true });
        expect(root.querySelector("output")?.textContent).toBe("external-ready");
      },
    });

    expect(report.passed).toBe(3);
    expect(ledger).toEqual(
      expect.arrayContaining([
        "install",
        "directive",
        "application:attributes",
        "action",
        "middleware:before",
        "middleware:completed",
        "application-cleanup:attributes",
        "directive-cleanup",
        "plugin-cleanup",
      ]),
    );
    expect(ledger.filter((entry) => entry === "plugin-cleanup")).toHaveLength(2);
    expect(failedLedger).toEqual(["failed-install-cleanup"]);
    expect(cleanupLedger).toEqual(["cleanup-failure", "cleanup-after-failure"]);
  });
});

describe("public render-adapter navigation fixture", () => {
  it("retains marked identity, state, value, and focus while replacing other roots", async () => {
    const active = createHarness();
    const ledger: MockNavigationObservation[] = [];
    const navigation = active.install(createMockNavigationPlugin($, ledger));
    const shell = active.document.createElement("main");
    shell.innerHTML = `
      <div id="region">
        <article id="outgoing"><p>Old</p></article>
        <input id="preserved" data-jqs-preserve value="server">
      </div>
    `;
    active.document.body.append(shell);
    const application = active.mountBehavior(shell, { state: { visits: 0 } });
    const outgoing = active.mountBehavior(shell.querySelector("#outgoing")!, { state: {} });
    const preserved = shell.querySelector<HTMLInputElement>("#preserved")!;
    preserved.value = "owned";
    preserved.focus();

    await navigation.visit(
      application.instance,
      shell.querySelector("#region")!,
      '<input id="preserved" data-jqs-preserve value="incoming"><article id="incoming" data-jqs data-signals="{ ready: true }"><output data-text="$ready"></output></article>',
    );
    await active.flush();

    expect(outgoing.destroyed).toBe(true);
    expect(shell.querySelector("#preserved")).toBe(preserved);
    expect(preserved.value).toBe("owned");
    expect(active.document.activeElement).toBe(preserved);
    expect(shell.querySelector("#incoming output")?.textContent).toBe("true");
    expect(ledger.slice(0, 2)).toEqual([
      { id: expect.any(String), phase: "started" },
      { id: expect.any(String), phase: "completed" },
    ]);
    expect(ledger[0]?.id).toBe(ledger[1]?.id);
  });

  it("correlates one failed navigation operation without committing markup", async () => {
    const active = createHarness();
    const ledger: MockNavigationObservation[] = [];
    const navigation = active.install(createMockNavigationPlugin($, ledger));
    const shell = active.document.createElement("main");
    shell.innerHTML = '<div id="region"><p>Stable</p></div>';
    active.document.body.append(shell);
    const application = active.mountBehavior(shell, { state: {} });

    await expect(
      navigation.visit(
        application.instance,
        shell.querySelector("#region")!,
        null as unknown as string,
      ),
    ).rejects.toThrow("Mock navigation HTML must be a string");
    expect(shell.querySelector("#region")?.textContent).toContain("Stable");
    expect(ledger).toEqual([
      { id: expect.any(String), phase: "started" },
      { id: expect.any(String), phase: "failed" },
    ]);
    expect(ledger[0]?.id).toBe(ledger[1]?.id);
  });
});

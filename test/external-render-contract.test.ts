import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";

import { createRenderAdapter, installStarCore } from "jquery-star/core";
import type { StarRenderAdapter } from "jquery-star/core";
import { datastarPlugin } from "jquery-star/datastar";
import { datastarSuccessFixture } from "jquery-star/datastar/testing";
import { createResponseController, createStarHarness } from "jquery-star/testing";
import type { StarDOMWindow } from "jquery-star/testing";
import { uiPlugin } from "jquery-star/ui";

import {
  createExternalRenderCoordinator,
  matchingPreservedRoots,
} from "./fixtures/interoperability/bridge-contract.mjs";

interface BoundaryRecord {
  alias: string;
  integrity: string;
  tarball: string;
  version: string;
}

interface MappingRecord {
  id: string;
}

interface LibraryRecord {
  approvedRange: string;
  boundaries: BoundaryRecord[];
  browserProjects: string[];
  fixtureTest: string;
  mappings: MappingRecord[];
  officialSources: Array<{ id: string; url: string }>;
  package: string;
  traceCases: Array<{ id: string; mappingId: string; versions: string[] }>;
}

interface ContractManifest {
  observation: { allowedFields: string[]; terminalOutcomes: string[] };
  publicBoundary: { allowedImports: string[]; forbiddenImports: string[] };
  libraries: Record<"htmx" | "turbo", LibraryRecord>;
  downstreamTickets: Record<string, { host: "htmx" | "turbo"; mappingIds: string[] }>;
}

const repositoryRoot = resolve(import.meta.dirname, "..");
const schema = JSON.parse(
  readFileSync(resolve(repositoryRoot, "schema/external-bridge-contract.schema.json"), "utf8"),
);
const manifestSource = readFileSync(
  resolve(repositoryRoot, "quality/external-bridge-contract.json"),
  "utf8",
);
const manifest = JSON.parse(manifestSource) as ContractManifest;
const manifestDigest = createHash("sha256").update(manifestSource).digest("hex");
const packageLock = JSON.parse(
  readFileSync(resolve(repositoryRoot, "package-lock.json"), "utf8"),
) as {
  packages: Record<
    string,
    { integrity?: string; name?: string; resolved?: string; version?: string }
  >;
};

const frames: HTMLIFrameElement[] = [];

function realm(markup = ""): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  frame.contentWindow!.document.body.innerHTML = markup;
  return frame.contentWindow!;
}

function mockAdapter(
  options: { beginError?: Error; commitError?: Error; commitPromise?: Promise<void> } = {},
) {
  const calls: string[] = [];
  let nextOperationId = 0;
  const begin = vi.fn(
    (boundary: Element, beginOptions: { preserveRoots?: Iterable<Element> } = {}) => {
      calls.push(`begin:${boundary.id}`);
      if (options.beginError) throw options.beginError;
      const operationId = ++nextOperationId;
      return {
        operationId,
        preservedWithin: () => Object.freeze([]),
        beforeRemove(node: Element) {
          calls.push(`remove:${operationId}:${node.id}`);
        },
        async commit(incomingRoots: Iterable<Element> = []) {
          calls.push(
            `commit:${operationId}:${Array.from(incomingRoots, ({ id }) => id).join(",")}`,
          );
          if (options.commitError) throw options.commitError;
          await options.commitPromise;
        },
        async fail(error: unknown) {
          calls.push(`fail:${operationId}:${error instanceof Error ? error.message : "unknown"}`);
          throw error;
        },
        beginOptions,
      };
    },
  );
  return { adapter: { begin }, begin, calls };
}

function coordinator(adapter: StarRenderAdapter, host: "htmx" | "turbo" = "turbo") {
  return createExternalRenderCoordinator({
    adapter,
    host,
    version: host === "turbo" ? "8.0.23" : "2.0.10",
    minimumVersion: host === "turbo" ? "8.0.21" : "2.0.0",
    maximumVersionExclusive: host === "turbo" ? "8.1.0" : "2.1.0",
  });
}

afterEach(() => {
  const star = ($ as unknown as { star?: { dispose(): unknown } }).star;
  star?.dispose();
  document.querySelector("#coexistence-boundary")?.remove();
  for (const frame of frames.splice(0).reverse()) frame.remove();
  vi.restoreAllMocks();
});

describe("external bridge compatibility manifest", () => {
  it("validates against the closed schema and pins only the two public jQStar entry points", () => {
    const ajv = new Ajv2020({ allErrors: true, strict: true });
    addFormats(ajv);
    const validate = ajv.compile(schema);

    expect(validate(manifest), JSON.stringify(validate.errors)).toBe(true);
    expect(manifest.publicBoundary.allowedImports).toEqual([
      "jquery-star/core",
      "jquery-star/testing",
    ]);
    expect(manifest.publicBoundary.forbiddenImports).toEqual(
      expect.arrayContaining(["src/*", "kernelForDocument", "application collections"]),
    );
    expect(typeof createRenderAdapter).toBe("function");
    expect(typeof createStarHarness).toBe("function");

    const contractSource = [
      "test/fixtures/interoperability/bridge-contract.mjs",
      "test/fixtures/interoperability/bridge-contract.d.mts",
    ]
      .map((path) => readFileSync(resolve(repositoryRoot, path), "utf8"))
      .join("\n");
    const packageImports = [
      ...contractSource.matchAll(/from\s+["'](jquery-star\/[^"']+)["']/gu),
    ].map((match) => match[1]!);
    expect(
      packageImports.every((path) => manifest.publicBoundary.allowedImports.includes(path)),
    ).toBe(true);
    for (const forbidden of [
      "../src/",
      "kernelForDocument",
      "applicationCount",
      "MutationObserver",
      "patchCoordinator",
    ]) {
      expect(contractSource).not.toContain(forbidden);
    }
  });

  it("uses unique, total mapping and trace IDs and assigns every mapping downstream", () => {
    for (const [host, library] of Object.entries(manifest.libraries)) {
      const mappingIds = library.mappings.map(({ id }) => id);
      const traceIds = library.traceCases.map(({ id }) => id);
      expect(new Set(mappingIds).size).toBe(mappingIds.length);
      expect(new Set(traceIds).size).toBe(traceIds.length);
      expect(library.traceCases.every(({ mappingId }) => mappingIds.includes(mappingId))).toBe(
        true,
      );
      expect(new Set(library.traceCases.map(({ mappingId }) => mappingId))).toEqual(
        new Set(mappingIds),
      );
      expect(library.traceCases.every(({ versions }) => versions.length === 2)).toBe(true);
      expect(library.browserProjects).toEqual([
        "desktop-chromium",
        "desktop-firefox",
        "desktop-webkit",
      ]);
      expect(library.fixtureTest).toBe("e2e/interoperability-baseline.spec.ts");
      const downstream = Object.values(manifest.downstreamTickets).find(
        ({ host: downstreamHost }) => downstreamHost === host,
      );
      expect(downstream?.mappingIds).toEqual(mappingIds);
    }
  });

  it("matches exact installed aliases, lockfile integrities, tarballs, and approved intervals", () => {
    for (const [host, library] of Object.entries(manifest.libraries)) {
      expect(library.approvedRange).toMatch(/^>=\d+\.\d+\.\d+ <\d+\.\d+\.\d+$/u);
      for (const boundary of library.boundaries) {
        const installed = JSON.parse(
          readFileSync(
            resolve(repositoryRoot, `node_modules/${boundary.alias}/package.json`),
            "utf8",
          ),
        ) as { name: string; version: string };
        const locked = packageLock.packages[`node_modules/${boundary.alias}`];
        expect(installed).toMatchObject({ name: library.package, version: boundary.version });
        expect(locked).toMatchObject({
          name: library.package,
          version: boundary.version,
          resolved: boundary.tarball,
          integrity: boundary.integrity,
        });
      }
      expect(library.officialSources.every(({ url }) => url.startsWith("https://"))).toBe(true);
      expect(library.officialSources.every(({ id }) => id.startsWith(`${host}.`))).toBe(true);
    }
  });

  it("pins every mapping and exact manifest identity in the separate downstream tickets", () => {
    for (const [ticketId, downstream] of Object.entries(manifest.downstreamTickets)) {
      const path =
        ticketId === "0036"
          ? "docs/tickets/0036-publish-turbo-bridge.md"
          : "docs/tickets/0037-publish-htmx-bridge.md";
      const source = readFileSync(resolve(repositoryRoot, path), "utf8");
      expect(source).toContain(manifestDigest);
      expect(source).toContain(manifest.libraries[downstream.host].approvedRange);
      expect(source).toContain("Chromium, Firefox, and WebKit");
      expect(source).toContain("side-effect-free");
      for (const mappingId of downstream.mappingIds) expect(source).toContain(mappingId);
    }
  });
});

describe("host-neutral external render coordinator", () => {
  it("rejects missing, prerelease, malformed, and out-of-range versions before adapter use", () => {
    const { adapter, begin } = mockAdapter();
    for (const version of [undefined, "8.0.23-beta.1", "latest", "7.3.0", "8.1.0"]) {
      expect(() =>
        createExternalRenderCoordinator({
          adapter,
          host: "turbo",
          version: version as string,
          minimumVersion: "8.0.21",
          maximumVersionExclusive: "8.1.0",
        }),
      ).toThrow("Unsupported host version");
    }
    expect(begin).not.toHaveBeenCalled();
  });

  it("cancels intent without opening a render transaction", () => {
    const owner = realm('<main id="boundary"></main>');
    const { adapter, begin } = mockAdapter();
    const bridge = coordinator(adapter);
    const operation = bridge.prepare({
      flowId: "turbo.document.canceled",
      boundary: owner.document.querySelector("main")!,
      boundaryCategory: "document",
    });

    operation.cancel();

    expect(begin).not.toHaveBeenCalled();
    expect(operation.snapshot()).toMatchObject({ state: "canceled", renderOperationId: null });
    expect(bridge.observations().map(({ phase }: { phase: string }) => phase)).toEqual([
      "prepared",
      "canceled",
    ]);
  });

  it("records one redacted operation in lifecycle order and deduplicates cleanup boundaries", async () => {
    const owner = realm(
      '<main id="boundary"><section id="outgoing"><span id="child"></span></section></main>',
    );
    const { adapter, calls } = mockAdapter();
    const bridge = coordinator(adapter, "htmx");
    const boundary = owner.document.querySelector("main")!;
    const outgoing = owner.document.querySelector("#outgoing")!;
    const incoming = owner.document.createElement("article");
    incoming.id = "incoming";
    const operation = bridge.prepare({
      flowId: "htmx.swap.inner",
      boundary,
      boundaryCategory: "region",
    });

    operation.beginMutation();
    expect(() => operation.beforeRemove(owner.document.createElement("div"))).toThrow(
      "inside the active external boundary",
    );
    operation.beforeRemove(outgoing);
    operation.beforeRemove(outgoing);
    boundary.append(incoming);
    operation.mutated([incoming]);
    await operation.commit();

    expect(calls).toEqual(["begin:boundary", "remove:1:outgoing", "commit:1:incoming"]);
    expect(operation.snapshot()).toMatchObject({ state: "committed", removalCount: 1 });
    const observations = bridge.observations();
    expect(observations.map(({ phase }: { phase: string }) => phase)).toEqual([
      "prepared",
      "removing",
      "removing",
      "externally-mutated",
      "enhancing",
      "committed",
    ]);
    expect(observations.every(Object.isFrozen)).toBe(true);
    expect(Object.keys(observations.at(-1)!).sort()).toEqual(
      [...manifest.observation.allowedFields].sort(),
    );
    expect(manifest.observation.terminalOutcomes).toContain(observations.at(-1)?.outcome);
    expect(JSON.stringify(observations)).not.toMatch(
      /url|query|formValues|requestBody|responseBody|html|error|dom|signals|historyValue/u,
    );
  });

  it("allows disjoint operations and rejects active overlapping boundaries", async () => {
    const owner = realm(
      '<main id="parent"><section id="nested"></section></main><aside id="disjoint"></aside>',
    );
    const { adapter } = mockAdapter();
    const bridge = coordinator(adapter);
    const parent = owner.document.querySelector("#parent")!;
    const nested = owner.document.querySelector("#nested")!;
    const disjoint = owner.document.querySelector("#disjoint")!;
    const first = bridge.prepare({ flowId: "turbo.document.visit", boundary: parent });
    const second = bridge.prepare({ flowId: "turbo.frame.replace", boundary: nested });
    const third = bridge.prepare({ flowId: "turbo.frame.replace", boundary: disjoint });

    first.beginMutation();
    expect(() => second.beginMutation()).toThrow("Overlapping external render boundaries");
    third.beginMutation();
    await first.fail(new Error("stop first"));
    await second.fail(new Error("stop second"));
    await third.fail(new Error("stop third"));

    expect(first.snapshot().state).toBe("failed");
    expect(second.snapshot().state).toBe("failed");
    expect(third.snapshot().state).toBe("failed");
  });

  it("settles failures before mutation, after removal, and after host mutation", async () => {
    const owner = realm('<main id="boundary"><section id="outgoing"></section></main>');
    const boundary = owner.document.querySelector("main")!;
    const outgoing = owner.document.querySelector("section")!;
    const before = coordinator(mockAdapter().adapter).prepare({
      flowId: "turbo.document.error",
      boundary,
    });
    await before.fail(new Error("request failed"));
    expect(before.snapshot().state).toBe("failed");

    const removedBridge = coordinator(mockAdapter().adapter);
    const removed = removedBridge.prepare({ flowId: "turbo.document.visit", boundary });
    removed.beginMutation();
    removed.beforeRemove(outgoing);
    await removed.fail(new Error("render failed"));
    expect(removedBridge.observations().at(-1)).toMatchObject({
      phase: "failed",
      outcome: "failed-after-removal",
    });

    const mutatedBridge = coordinator(mockAdapter().adapter);
    const mutated = mutatedBridge.prepare({ flowId: "turbo.document.visit", boundary });
    mutated.beginMutation();
    mutated.mutated();
    await mutated.fail(new Error("post-mutation failure"));
    expect(mutatedBridge.observations().at(-1)).toMatchObject({
      phase: "failed",
      outcome: "failed-after-mutation",
    });
  });

  it("makes disposal concurrent-safe and terminal", async () => {
    const owner = realm('<main id="boundary"></main><aside id="other"></aside>');
    const { adapter } = mockAdapter();
    const bridge = coordinator(adapter);
    bridge.prepare({
      flowId: "turbo.document.canceled",
      boundary: owner.document.querySelector("main")!,
    });
    bridge
      .prepare({ flowId: "turbo.frame.replace", boundary: owner.document.querySelector("aside")! })
      .beginMutation();

    const first = bridge.dispose();
    const second = bridge.dispose();
    expect(first).toBe(second);
    await expect(first).resolves.toEqual({
      schema: "jqstar-external-render-disposal/1",
      attempted: 2,
      remaining: 0,
    });
    expect(() =>
      bridge.prepare({
        flowId: "turbo.document.visit",
        boundary: owner.document.querySelector("main")!,
      }),
    ).toThrow("disposed");
  });

  it("lets an enhancing transaction finish during disposal without a second terminal", async () => {
    const owner = realm('<main id="boundary"></main>');
    let releaseCommit = (): void => undefined;
    const commitPromise = new Promise<void>((resolve) => {
      releaseCommit = resolve;
    });
    const { adapter, calls } = mockAdapter({ commitPromise });
    const bridge = coordinator(adapter);
    const operation = bridge.prepare({
      flowId: "turbo.document.visit",
      boundary: owner.document.querySelector("main")!,
    });
    operation.beginMutation();
    operation.mutated();
    const committing = operation.commit();
    const disposing = bridge.dispose();

    expect(operation.snapshot().state).toBe("enhancing");
    releaseCommit();
    await expect(Promise.all([committing, disposing])).resolves.toBeDefined();
    expect(operation.snapshot().state).toBe("committed");
    expect(calls.filter((entry) => entry.startsWith("commit:"))).toHaveLength(1);
    expect(calls.filter((entry) => entry.startsWith("fail:"))).toHaveLength(0);
    expect(
      bridge
        .observations()
        .filter(({ phase }: { phase: string }) => phase === "committed" || phase === "failed"),
    ).toHaveLength(1);
  });
});

describe("external host preservation", () => {
  it("matches only one connected marked old root to one marked incoming ID", () => {
    const owner = realm(`
      <main id="outgoing">
        <section id="keep" data-turbo-permanent></section>
        <section id="missing" data-turbo-permanent></section>
        <section id="duplicate" data-turbo-permanent></section>
        <section id="duplicate" data-turbo-permanent></section>
      </main>
    `);
    const incoming = owner.document.createElement("main");
    incoming.innerHTML = `
      <section id="keep" data-turbo-permanent></section>
      <section id="duplicate" data-turbo-permanent></section>
    `;
    const outgoing = owner.document.querySelector("main")!;

    const duplicateOutsideBoundary = owner.document.createElement("div");
    duplicateOutsideBoundary.id = "keep";
    owner.document.body.append(duplicateOutsideBoundary);
    expect(matchingPreservedRoots({ outgoing, incoming, marker: "data-turbo-permanent" })).toEqual(
      [],
    );
    duplicateOutsideBoundary.remove();

    expect(matchingPreservedRoots({ outgoing, incoming, marker: "data-turbo-permanent" })).toEqual([
      owner.document.querySelector("#keep"),
    ]);

    owner.document.querySelector("#keep")!.remove();
    expect(matchingPreservedRoots({ outgoing, incoming, marker: "data-turbo-permanent" })).toEqual(
      [],
    );
  });

  it("rejects cross-document matching and requires the marker on both sides", () => {
    const first = realm('<main><section id="keep" hx-preserve></section></main>');
    const second = realm('<main><section id="keep" hx-preserve></section></main>');
    expect(() =>
      matchingPreservedRoots({
        outgoing: first.document.querySelector("main")!,
        incoming: second.document.querySelector("main")!,
        marker: "hx-preserve",
      }),
    ).toThrow("one Document");

    const incoming = first.document.createElement("main");
    incoming.innerHTML = '<section id="keep"></section>';
    expect(
      matchingPreservedRoots({
        outgoing: first.document.querySelector("main")!,
        incoming,
        marker: "hx-preserve",
      }),
    ).toEqual([]);
  });

  it("coordinates a real public render adapter without private kernel access", async () => {
    const owner = realm(`
      <main id="boundary">
        <section id="outgoing"><div id="old-app"></div></section>
      </main>
    `);
    const installed = installStarCore($, { document: owner.document });
    const oldRoot = owner.document.querySelector("#old-app")!;
    $(oldRoot).star({ state: { live: true } });
    const oldInstance = $(oldRoot).star("instance")!;
    const bridge = coordinator(createRenderAdapter($));
    const boundary = owner.document.querySelector("#boundary")!;
    const outgoing = owner.document.querySelector("#outgoing")!;
    const operation = bridge.prepare({ flowId: "turbo.document.visit", boundary });
    operation.beginMutation();
    operation.beforeRemove(outgoing);
    outgoing.remove();
    const incoming = owner.document.createElement("section");
    incoming.id = "incoming-app";
    incoming.setAttribute("data-signals", "{ ready: true }");
    boundary.append(incoming);
    operation.mutated([incoming]);
    await operation.commit();

    expect(oldInstance.destroyed).toBe(true);
    expect($(incoming).star("instance")?.state.ready).toBe(true);
    expect(operation.snapshot()).toMatchObject({ state: "committed", renderOperationId: 1 });
    expect(installed.star.dispose().remaining).toEqual([]);
  });

  it("releases nested applications deepest first once across overlapping host cleanup callbacks", async () => {
    const owner = realm(`
      <main id="boundary">
        <section id="outer-app">
          <span class="outer-marker"></span>
          <section id="inner-app"><span class="inner-marker"></span></section>
        </section>
      </main>
    `);
    const installed = installStarCore($, { document: owner.document });
    const boundary = owner.document.querySelector("#boundary")!;
    const outer = owner.document.querySelector("#outer-app")!;
    const inner = owner.document.querySelector("#inner-app")!;
    const cleanup: string[] = [];
    $(outer).star({
      state: {},
      ui: { ".outer-marker": { mount: () => () => cleanup.push("outer") } },
    });
    $(inner).star({
      state: {},
      ui: { ".inner-marker": { mount: () => () => cleanup.push("inner") } },
    });
    const outerInstance = $(outer).star("instance")!;
    const innerInstance = $(inner).star("instance")!;
    const bridge = coordinator(createRenderAdapter($), "htmx");
    const operation = bridge.prepare({ flowId: "htmx.swap.inner", boundary });

    operation.beginMutation();
    operation.beforeRemove(outer);
    operation.beforeRemove(inner);
    outer.remove();
    operation.mutated();
    await operation.commit();

    expect(cleanup).toEqual(["inner", "outer"]);
    expect(innerInstance.destroyed).toBe(true);
    expect(outerInstance.destroyed).toBe(true);
    expect(operation.snapshot().removalCount).toBe(2);
    expect(await bridge.dispose()).toMatchObject({ attempted: 0, remaining: 0 });
    expect(installed.star.dispose().remaining).toEqual([]);
  });
});

describe("external render coexistence", () => {
  it("keeps public application, protocol, UI, form, and observation contracts exact across repeated renders", async () => {
    const responses = createResponseController()
      .json({ url: "https://example.test/generic-before" }, { genericCount: 1 })
      .enqueue({
        url: /^https:\/\/example\.test\/datastar-before\?datastar=/u,
        response: datastarSuccessFixture({ streamCount: 1 }),
      })
      .html(
        { url: "https://example.test/generic-after" },
        '<strong id="generic-result">generic-html</strong>',
      )
      .enqueue({
        url: /^https:\/\/example\.test\/datastar-after\?datastar=/u,
        response: datastarSuccessFixture({ streamCount: 2 }),
      });
    const active = createStarHarness({
      window: window as StarDOMWindow,
      jQuery: $,
      plugins: [datastarPlugin],
      responses,
    });
    const ui = active.install(uiPlugin);
    const boundary = active.document.createElement("main");
    boundary.id = "coexistence-boundary";
    boundary.innerHTML = `
      <section id="outgoing">
        <section id="behavior-root"><button type="button">Run</button></section>
        <section id="declarative-root" data-signals="{ count: 0 }">
          <button type="button" data-on:click="$count += 1">Count</button>
        </section>
        <section
          id="preserved-root"
          data-jqs-preserve
          data-signals="{ genericCount: 0, streamCount: 0 }"
        >
          <button id="preserved-toggle" data-jqs="toggle" type="button">Preserved</button>
          <form id="preserved-form"><input name="title" value="kept value" /></form>
          <output id="protocol-state" data-text="$genericCount + ':' + $streamCount"></output>
          <div id="generic-fragment">initial</div>
        </section>
      </section>
    `;
    active.document.body.append(boundary);
    const behaviorRoot = boundary.querySelector("#behavior-root")!;
    const declarativeRoot = boundary.querySelector("#declarative-root")!;
    const preservedRoot = boundary.querySelector("#preserved-root")!;
    const toggle = boundary.querySelector<HTMLButtonElement>("#preserved-toggle")!;
    const behaviorCleanup = vi.fn();
    const behavior = active.mountBehavior(behaviorRoot, {
      state: { calls: 0 },
      actions: {
        run({ state }) {
          state.calls += 1;
        },
      },
      ui: { button: { mount: () => behaviorCleanup, on: { click: "run" } } },
    });
    const declarative = active.mountDeclarative<{ count: number }>(declarativeRoot);
    const preserved = active.mountDeclarative<{
      genericCount: number;
      streamCount: number;
    }>(preservedRoot);
    const preservedInstance = preserved.instance;
    const preservedState = preserved.state;
    const jQueryHandler = vi.fn();
    const toggleChanges = vi.fn();
    $(preservedRoot).on("coexistence-proof", jQueryHandler);
    toggle.addEventListener("jquery-star:toggle:change", toggleChanges);
    ui.enhance(boundary);
    await active.flush();

    active.triggerNative(behaviorRoot.querySelector("button")!, "click");
    active.triggerJQuery(declarativeRoot.querySelector("button")!, "click");
    toggle.click();
    toggle.focus();
    await active.flush();
    expect(behavior.state.calls).toBe(1);
    expect(declarative.state.count).toBe(1);
    expect(ui.toggle.pressed(toggle)).toBe(true);
    expect(toggleChanges).toHaveBeenCalledOnce();

    await preservedInstance.run(
      active.installed.star.get("https://example.test/generic-before", {
        profile: "core.generic",
      }),
    );
    await preservedInstance.run(
      active.installed.star.get("https://example.test/datastar-before", {
        profile: "core.datastar",
      }),
    );
    await active.flush();
    expect(preserved.state).toMatchObject({ genericCount: 1, streamCount: 1 });
    expect(boundary.querySelector("#protocol-state")?.textContent).toBe("1:1");

    const bridge = coordinator(createRenderAdapter($), "htmx");
    const render = async (sequence: number) => {
      const outgoing = boundary.querySelector(":scope > #outgoing")!;
      const next = active.document.createElement("section");
      next.id = "outgoing";
      next.innerHTML = `
        <section id="incoming-${sequence}" data-signals="{ count: 0 }">
          <button type="button" data-on:click="$count += 1">Incoming ${sequence}</button>
        </section>
      `;
      const incoming = next.querySelector(`#incoming-${sequence}`)!;
      const operation = bridge.prepare({
        flowId: "htmx.swap.inner",
        boundary,
        boundaryCategory: "region",
      });
      operation.beginMutation();
      operation.beforeRemove(outgoing);
      outgoing.before(next);
      next.prepend(preservedRoot);
      outgoing.remove();
      operation.mutated([incoming]);
      await operation.commit();
      return $(incoming).star("instance")!;
    };

    const firstIncoming = await render(1);
    const secondIncoming = await render(2);
    expect(behavior.destroyed).toBe(true);
    expect(declarative.destroyed).toBe(true);
    expect(behaviorCleanup).toHaveBeenCalledOnce();
    expect(firstIncoming.destroyed).toBe(true);
    expect(secondIncoming.destroyed).toBe(false);
    expect($(preservedRoot).star("instance")).toBe(preservedInstance);
    expect(preserved.state).toBe(preservedState);
    expect(active.document.activeElement).toBe(toggle);
    expect(new FormData(preservedRoot.querySelector("form")!).get("title")).toBe("kept value");

    active.triggerJQuery(preservedRoot, "coexistence-proof");
    toggle.click();
    expect(jQueryHandler).toHaveBeenCalledOnce();
    expect(toggleChanges).toHaveBeenCalledTimes(2);
    expect(ui.toggle.pressed(toggle)).toBe(false);
    const incomingButton = boundary.querySelector("#incoming-2 button")!;
    active.triggerJQuery(incomingButton, "click");
    await active.flush();
    expect(secondIncoming.state.count).toBe(1);

    await preservedInstance.run(
      active.installed.star.get("https://example.test/generic-after", {
        mode: "inner",
        profile: "core.generic",
        target: "#generic-fragment",
      }),
    );
    await preservedInstance.run(
      active.installed.star.get("https://example.test/datastar-after", {
        profile: "core.datastar",
      }),
    );
    await active.flush();
    expect(boundary.querySelector("#generic-result")?.textContent).toBe("generic-html");
    expect(preserved.state.streamCount).toBe(2);
    responses.assertSatisfied();

    const requestObservations = active.observations().filter(({ kind }) => kind === "request");
    expect(requestObservations.filter(({ phase }) => phase === "started")).toHaveLength(4);
    expect(requestObservations.filter(({ phase }) => phase === "completed")).toHaveLength(4);
    expect(
      bridge.observations().filter(({ phase }: { phase: string }) => phase === "committed"),
    ).toHaveLength(2);
    expect(await bridge.dispose()).toEqual({
      schema: "jqstar-external-render-disposal/1",
      attempted: 0,
      remaining: 0,
    });

    const disposal = active.dispose();
    expect(disposal.failed).toEqual([]);
    expect(disposal.remaining).toEqual([]);
    expect(disposal.attempted.map(({ category }) => category)).toEqual(
      expect.arrayContaining(["listener", "observer", "plugin", "service", "subscription"]),
    );
  });
});

import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createRenderAdapter,
  installStarCore,
  StarRenderTransactionError,
  type StarCoreStatic,
} from "../src/core";
import { kernelForDocument } from "../src/kernel";

const frames: HTMLIFrameElement[] = [];
const installations: StarCoreStatic[] = [];

function realm(markup = "<main></main>"): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const owner = frame.contentWindow!;
  owner.document.body.innerHTML = markup;
  return owner;
}

function install(owner: Window): StarCoreStatic {
  const star = installStarCore($, { document: owner.document }).star;
  installations.push(star);
  return star;
}

afterEach(() => {
  for (const star of installations.splice(0).reverse()) star.dispose();
  for (const frame of frames.splice(0).reverse()) frame.remove();
  vi.restoreAllMocks();
});

describe("public render adapter", () => {
  it("requires an installation and validates render and preservation ownership before opening", async () => {
    const isolated = (() => undefined) as unknown as JQueryStatic;
    expect(() => createRenderAdapter(isolated)).toThrow(
      "Install jQuery Star core before creating a render adapter.",
    );

    const owner = realm('<main><section id="inside"></section></main>');
    const foreign = realm('<main><section id="foreign"></section></main>');
    install(owner);
    const adapter = createRenderAdapter($);
    const root = owner.document.querySelector("main")!;
    const inside = owner.document.querySelector("#inside")!;
    const outside = owner.document.createElement("aside");
    owner.document.body.append(outside);
    const disconnected = owner.document.createElement("i");

    expect(() => adapter.begin(foreign.document.querySelector("main")!)).toThrow(
      "A render root must belong to this jQuery Star kernel's Document.",
    );
    expect(() => adapter.begin(owner.document.createElement("main"))).toThrow(
      "A render root must be connected when rendering begins.",
    );
    expect(() =>
      adapter.begin(root, { preserveRoots: [foreign.document.querySelector("#foreign")!] }),
    ).toThrow("A preserved root must belong to this jQuery Star kernel's Document.");
    expect(() => adapter.begin(root, { preserveRoots: [outside] })).toThrow(
      "A preserved root must be contained by the render root.",
    );
    expect(() => adapter.begin(root, { preserveRoots: [disconnected] })).toThrow(
      "A preserved root must be connected when rendering begins.",
    );

    const transaction = adapter.begin(root, { preserveRoots: [inside] });
    expect(() => transaction.preservedWithin(foreign.document.querySelector("#foreign")!)).toThrow(
      "A preservation boundary must belong to this jQuery Star kernel's Document.",
    );
    expect(() => transaction.beforeRemove(outside)).toThrow(
      "A removal boundary must be contained by the render root.",
    );
    const canceled = new Error("render canceled");
    await expect(transaction.fail(canceled)).rejects.toBe(canceled);
  });

  it("reports invalid incoming roots, failed iterables, and enhancement barriers", async () => {
    const owner = realm("<main></main>");
    const foreign = realm('<main><section id="foreign"></section></main>');
    install(owner);
    const adapter = createRenderAdapter($);
    const kernel = kernelForDocument(owner.document)!;
    const root = owner.document.querySelector("main")!;
    const disconnected = owner.document.createElement("section");

    const invalidRoots = adapter.begin(root);
    await expect(
      invalidRoots.commit([foreign.document.querySelector("#foreign")!, disconnected]),
    ).rejects.toEqual(
      expect.objectContaining({
        errors: [
          expect.objectContaining({ message: expect.stringContaining("must belong") }),
          expect.objectContaining({ message: expect.stringContaining("must be connected") }),
        ],
      }),
    );

    const iterationFailure = new Error("incoming roots iteration failed");
    const failedIterable = {
      [Symbol.iterator](): Iterator<Element> {
        throw iterationFailure;
      },
    };
    await expect(adapter.begin(root).commit(failedIterable)).rejects.toBe(iterationFailure);

    const enhancementFailure = new Error("render enhancement failed");
    vi.spyOn(kernel, "whenEnhanced").mockRejectedValueOnce(enhancementFailure);
    await expect(adapter.begin(root).commit()).rejects.toBe(enhancementFailure);
  });

  it("preserves exact live roots while deduplicating cleanup and booting explicit incoming roots", async () => {
    const owner = realm(`
      <main id="owner">
        <section id="outgoing">
          <button id="marked" data-jqs-preserve><input value="kept"></button>
          <button id="supplied">Supplied</button>
          <button id="gone">Gone</button>
        </section>
      </main>
    `);
    const star = install(owner);
    const adapter = createRenderAdapter($);
    const kernel = kernelForDocument(owner.document)!;
    const root = owner.document.querySelector("#owner")!;
    const outgoing = owner.document.querySelector("#outgoing")!;
    const marked = owner.document.querySelector("#marked")!;
    const supplied = owner.document.querySelector("#supplied")!;
    const gone = owner.document.querySelector("#gone")!;
    const input = marked.querySelector("input")!;
    const mounted: string[] = [];
    const cleaned: string[] = [];
    const customHandler = vi.fn();

    $(root).star({
      ui: {
        button: {
          mount: ({ $element }) => {
            const id = $element!.attr("id")!;
            mounted.push(id);
            return () => cleaned.push(id);
          },
        },
      },
    });
    $(marked).star({ state: { count: 1 } });
    $(supplied).star({ state: { count: 2 } });
    $(gone).star({ state: { count: 3 } });
    const markedInstance = $(marked).star("instance")!;
    const suppliedInstance = $(supplied).star("instance")!;
    const goneInstance = $(gone).star("instance")!;
    $(input).on("preserved-event", customHandler);
    input.focus();

    const transaction = adapter.begin(root, { preserveRoots: [supplied, supplied] });
    expect(transaction.operationId).toBe(1);
    expect(new Set(transaction.preservedWithin(outgoing))).toEqual(new Set([marked, supplied]));

    transaction.beforeRemove(gone);
    transaction.beforeRemove(gone);
    transaction.beforeRemove(outgoing);
    expect(goneInstance.destroyed).toBe(true);
    expect(cleaned).toEqual(["gone"]);

    const incomingContainer = owner.document.createElement("section");
    incomingContainer.id = "incoming-container";
    incomingContainer.innerHTML =
      '<button id="incoming" data-signals="{ ready: true }">New</button>';
    outgoing.before(incomingContainer);
    const incoming = incomingContainer.querySelector("#incoming")!;
    incomingContainer.prepend(marked, supplied);
    outgoing.remove();

    await transaction.commit([incoming, incoming]);

    expect(markedInstance.destroyed).toBe(false);
    expect(suppliedInstance.destroyed).toBe(false);
    expect($(marked).star("instance")).toBe(markedInstance);
    expect($(supplied).star("instance")).toBe(suppliedInstance);
    expect(markedInstance.state.count).toBe(1);
    expect(suppliedInstance.state.count).toBe(2);
    expect(input.value).toBe("kept");
    expect(owner.document.activeElement).toBe(input);
    $(input).trigger("preserved-event");
    expect(customHandler).toHaveBeenCalledOnce();
    expect($(incoming).star("instance")?.state.ready).toBe(true);
    expect(mounted.filter((id) => id === "marked")).toHaveLength(1);
    expect(mounted.filter((id) => id === "supplied")).toHaveLength(1);
    expect(mounted.filter((id) => id === "incoming")).toHaveLength(1);
    expect(cleaned).toEqual(["gone"]);
    expect(kernel.applicationCount()).toBe(4);
    expect(kernel.resourceSummary().some(({ owner }) => owner === "render:1")).toBe(false);

    expect(() => transaction.beforeRemove(incoming)).toThrow(StarRenderTransactionError);
    await expect(transaction.commit()).rejects.toBeInstanceOf(StarRenderTransactionError);
    const second = adapter.begin(root);
    expect(second.operationId).toBe(2);
    const canceled = new Error("second render canceled");
    await expect(second.fail(canceled)).rejects.toBe(canceled);
    expect(star.version).toBe("1.0.0");
  });

  it("releases promised roots that the renderer failed to retain", async () => {
    const owner = realm(`
      <main id="owner">
        <section id="outgoing">
          <button id="promised" data-jqs-preserve>Promised</button>
        </section>
      </main>
    `);
    install(owner);
    const adapter = createRenderAdapter($);
    const kernel = kernelForDocument(owner.document)!;
    const root = owner.document.querySelector("#owner")!;
    const outgoing = owner.document.querySelector("#outgoing")!;
    const promised = owner.document.querySelector("#promised")!;
    const parentCleanup = vi.fn();

    $(root).star({ ui: { "#promised": { mount: () => parentCleanup } } });
    $(promised).star({ state: { retained: true } });
    const promisedInstance = $(promised).star("instance")!;
    const transaction = adapter.begin(root);
    transaction.beforeRemove(outgoing);
    outgoing.remove();

    await expect(transaction.commit()).rejects.toThrow(
      "jQuery Star render operation 1 did not retain 1 promised preserved root.",
    );
    expect(promisedInstance.destroyed).toBe(true);
    expect(parentCleanup).toHaveBeenCalledOnce();
    expect(kernel.applicationCount()).toBe(1);
    expect(kernel.resourceSummary().some(({ owner }) => owner === "render:1")).toBe(false);
  });

  it("preserves the mutation error alongside every outgoing cleanup failure", async () => {
    const owner = realm('<main><section id="broken"><i></i></section></main>');
    install(owner);
    const adapter = createRenderAdapter($);
    const root = owner.document.querySelector("main")!;
    const broken = owner.document.querySelector("#broken")!;
    const cleanupFailure = new Error("cleanup failed");
    const mutationFailure = new Error("host mutation failed");
    const cleanup = vi.fn(() => {
      throw cleanupFailure;
    });

    $(broken).star({ ui: { i: { mount: () => cleanup } } });
    const transaction = adapter.begin(root);
    transaction.beforeRemove(broken);
    broken.remove();

    let failure: unknown;
    try {
      await transaction.fail(mutationFailure);
    } catch (error) {
      failure = error;
    }
    expect(failure).toBeInstanceOf(AggregateError);
    expect((failure as AggregateError).errors).toEqual([cleanupFailure, mutationFailure]);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(kernelForDocument(owner.document)!.applicationCount()).toBe(0);
  });

  it("disposal synchronously abandons an unsettled render operation", async () => {
    const owner = realm("<main><section data-jqs-preserve></section></main>");
    const star = install(owner);
    const adapter = createRenderAdapter($);
    const kernel = kernelForDocument(owner.document)!;
    const root = owner.document.querySelector("main")!;
    const transaction = adapter.begin(root);

    expect(kernel.resourceSummary()).toContainEqual({ kind: "task", owner: "render:1" });
    const report = star.dispose();

    expect(report.attempted).toContainEqual({ category: "task", owner: "render:1" });
    expect(kernel.resourceSummary()).toEqual([]);
    await expect(kernel.whenEnhanced()).resolves.toBeUndefined();
    await expect(transaction.commit()).rejects.toThrow(
      "This jQuery Star kernel has been disposed and cannot settle again.",
    );
  });
});

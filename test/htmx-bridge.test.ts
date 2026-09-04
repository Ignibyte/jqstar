import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";

import { installStarCore, type StarCoreStatic } from "../src/core";
import {
  createHtmxBridge,
  HTMX_BRIDGE_SUPPORTED_RANGE,
  type StarHtmxBridge,
  type StarHtmxCapability,
} from "../src/htmx";

const frames: HTMLIFrameElement[] = [];
const installations: StarCoreStatic[] = [];

function realm(markup: string): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const owner = frame.contentWindow!;
  owner.document.documentElement.innerHTML = `<head></head><body>${markup}</body>`;
  return owner;
}

function capability(version = "2.0.10"): StarHtmxCapability {
  return {
    version,
    config: { defaultSwapStyle: "innerHTML" },
    ajax: vi.fn(),
    off: vi.fn(),
    on: vi.fn(),
    process: vi.fn(),
    swap: vi.fn(),
    trigger: vi.fn(),
  };
}

function install(
  owner: Window,
  options: {
    htmx?: StarHtmxCapability;
    onError?: (error: unknown) => void;
    version?: string;
  } = {},
): { bridge: StarHtmxBridge; htmx: StarHtmxCapability; star: StarCoreStatic } {
  const star = installStarCore($, { document: owner.document }).star;
  installations.push(star);
  const htmx = options.htmx ?? capability(options.version);
  const bridge = star.use(
    createHtmxBridge({
      $,
      htmx,
      version: options.version ?? "2.0.10",
      ...(options.onError ? { onError: options.onError } : {}),
    }),
  );
  return { bridge, htmx, star };
}

function dispatch<Detail>(
  owner: Window,
  target: EventTarget,
  type: string,
  detail: Detail,
  cancelable = true,
): CustomEvent<Detail> {
  const EventHost = owner as Window & typeof globalThis;
  const event = new EventHost.CustomEvent(type, { bubbles: true, cancelable, detail });
  target.dispatchEvent(event);
  return event;
}

function requestDetail(
  source: Element,
  target: Element,
  xhr: object,
  overrides: Record<string, unknown> = {},
) {
  return {
    xhr,
    target,
    requestConfig: { elt: source },
    boosted: false,
    ...overrides,
  };
}

function expectHostMethodsUntouched(htmx: StarHtmxCapability): void {
  for (const method of ["ajax", "off", "on", "process", "swap", "trigger"] as const) {
    expect(htmx[method]).not.toHaveBeenCalled();
  }
}

afterEach(() => {
  for (const star of installations.splice(0).reverse()) star.dispose();
  for (const frame of frames.splice(0).reverse()) frame.remove();
  vi.restoreAllMocks();
});

describe("htmx lifecycle bridge", () => {
  it("validates the injected capability and matching stable version before installation", () => {
    expect(HTMX_BRIDGE_SUPPORTED_RANGE).toBe(">=2.0.0 <2.1.0");
    expect(() =>
      createHtmxBridge({
        $,
        htmx: undefined as unknown as StarHtmxCapability,
        version: "2.0.10",
      }),
    ).toThrow("capability object");
    expect(() => createHtmxBridge({ $, htmx: capability("2.0.0"), version: "1.9.12" })).toThrow(
      HTMX_BRIDGE_SUPPORTED_RANGE,
    );
    expect(() => createHtmxBridge({ $, htmx: capability("2.0.10"), version: "2.1.0" })).toThrow(
      HTMX_BRIDGE_SUPPORTED_RANGE,
    );
    expect(() =>
      createHtmxBridge({ $, htmx: capability("2.0.10-beta.1"), version: "2.0.10-beta.1" }),
    ).toThrow("stable major.minor.patch");
    expect(() => createHtmxBridge({ $, htmx: capability("2.0.0"), version: "2.0.10" })).toThrow(
      "does not match htmx.version",
    );
    expect(() =>
      createHtmxBridge({
        $,
        htmx: { ...capability(), process: undefined } as unknown as StarHtmxCapability,
        version: "2.0.10",
      }),
    ).toThrow("ajax(), on(), off(), process(), swap(), and trigger()");
    expect(() => createHtmxBridge(undefined as never)).toThrow("options are required");
    expect(() =>
      createHtmxBridge({ $, htmx: capability(), version: "2.0.10", onError: false as never }),
    ).toThrow("onError must be a function");
    expect(() =>
      createHtmxBridge({ $: undefined as never, htmx: capability(), version: "2.0.10" }),
    ).toThrow("installed jQuery function is required");

    const htmx = capability();
    createHtmxBridge({ $, htmx, version: "2.0.10" });
    expectHostMethodsUntouched(htmx);
  });

  it("releases one inner swap at cleanup and commits explicit incoming roots after host mutation", async () => {
    const owner = realm(
      '<button id="source"></button><main id="target"><section id="old" data-jqs data-signals="{ old: true }"></section></main>',
    );
    const { bridge, htmx } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const old = owner.document.querySelector("#old")!;
    $(old).star();
    const oldApplication = $(old).star("instance")!;
    const xhr = {};
    const detail = requestDetail(source, target, xhr, {
      shouldSwap: true,
      serverResponse: '<section id="new" data-jqs data-signals="{ fresh: true }"></section>',
    });

    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);
    expect(oldApplication.destroyed).toBe(false);

    const incoming = owner.document.createElement("section");
    incoming.id = "new";
    incoming.setAttribute("data-jqs", "");
    incoming.setAttribute("data-signals", "{ fresh: true }");
    target.insertBefore(incoming, old);
    dispatch(owner, old, "htmx:beforeCleanupElement", {});
    old.remove();
    dispatch(owner, target, "htmx:afterSwap", detail);
    dispatch(owner, source, "htmx:afterRequest", detail);
    dispatch(owner, target, "htmx:afterSettle", detail);
    await bridge.whenIdle();

    expect(oldApplication.destroyed).toBe(true);
    expect($(incoming).star("state")).toEqual({ fresh: true });
    expect(bridge.observations().map(({ phase }) => phase)).toEqual([
      "prepared",
      "removing",
      "externally-mutated",
      "enhancing",
      "committed",
    ]);
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:afterSettle",
      flowId: "htmx.swap.inner",
      outcome: "completed",
      removalCount: 1,
      swapStyle: "innerHTML",
      targetCategory: "region",
    });
    expectHostMethodsUntouched(htmx);
  });

  it("commits delete at afterRequest without inventing swap or settle events", async () => {
    const owner = realm(
      '<button id="source" hx-swap="delete"></button><main><section id="target" data-jqs></section></main>',
    );
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    $(target).star();
    const application = $(target).star("instance")!;
    const detail = requestDetail(source, target, {}, { shouldSwap: true, serverResponse: "" });

    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);
    dispatch(owner, target, "htmx:beforeCleanupElement", {});
    target.remove();
    dispatch(owner, source, "htmx:afterRequest", detail);
    await bridge.whenIdle();

    expect(application.destroyed).toBe(true);
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:afterRequest",
      flowId: "htmx.swap.delete",
      outcome: "completed",
      phase: "committed",
    });
    expect(bridge.observations().some(({ eventId }) => eventId === "htmx:afterSwap")).toBe(false);
  });

  it("keeps canceled and no-swap ownership live without a stranded transaction", async () => {
    const owner = realm(
      '<button id="source"></button><main id="target"><section id="owned" data-jqs></section></main>',
    );
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const owned = owner.document.querySelector("#owned")!;
    $(owned).star();
    const application = $(owned).star("instance")!;

    const canceled = requestDetail(
      source,
      target,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>ignored</p>",
      },
    );
    target.addEventListener("htmx:beforeSwap", (event) => event.preventDefault(), { once: true });
    dispatch(owner, source, "htmx:beforeRequest", canceled);
    dispatch(owner, target, "htmx:beforeSwap", canceled);
    dispatch(owner, source, "htmx:afterRequest", canceled);
    await bridge.whenIdle();

    const noSwap = requestDetail(source, target, {}, { shouldSwap: false, serverResponse: "" });
    dispatch(owner, source, "htmx:beforeRequest", noSwap);
    dispatch(owner, target, "htmx:beforeSwap", noSwap);
    dispatch(owner, source, "htmx:afterRequest", noSwap);
    await Promise.resolve();

    expect(application.destroyed).toBe(false);
    expect(bridge.observations().filter(({ phase }) => phase === "canceled")).toEqual([
      expect.objectContaining({
        flowId: "htmx.swap.inner",
        outcome: "canceled-before-mutation",
      }),
    ]);
    expect(bridge.observations().at(-1)).toMatchObject({
      flowId: "htmx.swap.none",
      outcome: "observed-no-mutation",
      renderOperationId: null,
    });
  });

  it("retains exact data-jqs-preserve and hx-preserve identities", async () => {
    const owner = realm(
      [
        '<button id="source"></button><main id="target">',
        '<section id="jqs-kept" data-jqs data-jqs-preserve data-signals="{ count: 2 }"><input value="jqs"></section>',
        '<section id="htmx-kept" data-jqs hx-preserve data-signals="{ count: 3 }"><input value="htmx"></section>',
        '<section id="gone" data-jqs></section>',
        "</main>",
      ].join(""),
    );
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const jqsKept = owner.document.querySelector("#jqs-kept")!;
    const htmxKept = owner.document.querySelector("#htmx-kept")!;
    const gone = owner.document.querySelector("#gone")!;
    for (const root of [jqsKept, htmxKept, gone]) $(root).star();
    const jqsApplication = $(jqsKept).star("instance")!;
    const htmxApplication = $(htmxKept).star("instance")!;
    const goneApplication = $(gone).star("instance")!;
    const jqsInput = jqsKept.querySelector("input")!;
    const htmxInput = htmxKept.querySelector("input")!;
    const response = [
      '<section id="jqs-kept" data-jqs data-jqs-preserve></section>',
      '<section id="htmx-kept" data-jqs hx-preserve></section>',
      '<section id="fresh" data-jqs></section>',
    ].join("");
    const detail = requestDetail(
      source,
      target,
      {},
      { shouldSwap: true, serverResponse: response },
    );

    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);

    const holder = owner.document.createElement("div");
    holder.innerHTML = response;
    const htmxPlaceholder = holder.querySelector("#htmx-kept")!;
    htmxPlaceholder.replaceWith(htmxKept);
    target.prepend(...holder.children);
    dispatch(owner, jqsKept, "htmx:beforeCleanupElement", {});
    jqsKept.remove();
    dispatch(owner, gone, "htmx:beforeCleanupElement", {});
    gone.remove();
    dispatch(owner, target, "htmx:afterSwap", detail);
    dispatch(owner, source, "htmx:afterRequest", detail);
    dispatch(owner, target, "htmx:afterSettle", detail);
    await bridge.whenIdle();

    expect(owner.document.querySelector("#jqs-kept")).toBe(jqsKept);
    expect(owner.document.querySelector("#htmx-kept")).toBe(htmxKept);
    expect(jqsKept.querySelector("input")).toBe(jqsInput);
    expect(htmxKept.querySelector("input")).toBe(htmxInput);
    expect($(jqsKept).star("instance")).toBe(jqsApplication);
    expect($(htmxKept).star("instance")).toBe(htmxApplication);
    expect(jqsApplication.destroyed).toBe(false);
    expect(htmxApplication.destroyed).toBe(false);
    expect(goneApplication.destroyed).toBe(true);
  });

  it("releases unmatched data-jqs-preserve roots instead of promising their retention", async () => {
    const owner = realm(
      '<button id="source"></button><main id="target"><section id="stale" data-jqs data-jqs-preserve></section></main>',
    );
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const stale = owner.document.querySelector("#stale")!;
    $(stale).star();
    const staleApplication = $(stale).star("instance")!;
    const response = '<section id="fresh" data-jqs></section>';
    const detail = requestDetail(
      source,
      target,
      {},
      { shouldSwap: true, serverResponse: response },
    );

    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);
    dispatch(owner, stale, "htmx:beforeCleanupElement", {});
    stale.remove();
    target.innerHTML = response;
    dispatch(owner, target, "htmx:afterSwap", detail);
    dispatch(owner, source, "htmx:afterRequest", detail);
    dispatch(owner, target, "htmx:afterSettle", detail);
    await bridge.whenIdle();

    const fresh = owner.document.querySelector("#fresh")!;
    expect(staleApplication.destroyed).toBe(true);
    expect($(fresh).star("instance")).toBeDefined();
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:afterSettle",
      outcome: "completed",
      phase: "committed",
    });
  });

  it("runs disjoint main and out-of-band boundaries as separate operations", async () => {
    const owner = realm(
      [
        '<button id="source"></button>',
        '<main id="target"><section id="main-old" data-jqs></section></main>',
        '<aside id="notice"><section id="oob-old" data-jqs></section></aside>',
      ].join(""),
    );
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const mainOld = owner.document.querySelector("#main-old")!;
    const notice = owner.document.querySelector("#notice")!;
    const oobOld = owner.document.querySelector("#oob-old")!;
    $(mainOld).star();
    $(oobOld).star();
    const response = [
      '<aside id="notice" hx-swap-oob="outerHTML:#notice"><section id="oob-new" data-jqs></section></aside>',
      '<section id="main-new" data-jqs></section>',
    ].join("");
    const xhr = {};
    const detail = requestDetail(source, target, xhr, {
      shouldSwap: true,
      serverResponse: response,
    });
    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);

    const fragment = owner.document.createDocumentFragment();
    const newNotice = owner.document.createElement("aside");
    newNotice.id = "notice";
    newNotice.innerHTML = '<section id="oob-new" data-jqs></section>';
    fragment.append(newNotice);
    const oobDetail = { shouldSwap: true, target: notice, fragment };
    dispatch(owner, notice, "htmx:oobBeforeSwap", oobDetail);
    notice.before(newNotice);
    dispatch(owner, notice, "htmx:beforeCleanupElement", {});
    notice.remove();
    dispatch(owner, newNotice, "htmx:oobAfterSwap", oobDetail);

    const mainNew = owner.document.createElement("section");
    mainNew.id = "main-new";
    mainNew.setAttribute("data-jqs", "");
    target.insertBefore(mainNew, mainOld);
    dispatch(owner, mainOld, "htmx:beforeCleanupElement", {});
    mainOld.remove();
    dispatch(owner, target, "htmx:afterSwap", detail);
    dispatch(owner, source, "htmx:afterRequest", detail);
    dispatch(owner, target, "htmx:afterSettle", detail);
    await bridge.whenIdle();

    expect($(mainNew).star("instance")).toBeDefined();
    expect($(newNotice.querySelector("#oob-new")!).star("instance")).toBeDefined();
    const terminal = bridge.observations().filter(({ phase }) => phase === "committed");
    expect(terminal.map(({ flowId }) => flowId).sort()).toEqual([
      "htmx.swap.inner",
      "htmx.swap.oob",
    ]);
    expect(new Set(terminal.map(({ bridgeOperationId }) => bridgeOperationId)).size).toBe(2);
  });

  it("supports insertion-only adjacent swaps without releasing existing ownership", async () => {
    const owner = realm(
      '<button id="source" hx-swap="beforeend"></button><main id="target"><section id="existing" data-jqs></section></main>',
    );
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const existing = owner.document.querySelector("#existing")!;
    $(existing).star();
    const existingApplication = $(existing).star("instance")!;
    const detail = requestDetail(
      source,
      target,
      {},
      {
        shouldSwap: true,
        serverResponse: '<section id="inserted" data-jqs></section>',
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);
    dispatch(owner, existing, "htmx:beforeCleanupElement", {});
    const inserted = owner.document.createElement("section");
    inserted.id = "inserted";
    inserted.setAttribute("data-jqs", "");
    target.append(inserted);
    dispatch(owner, target, "htmx:afterSwap", detail);
    dispatch(owner, source, "htmx:afterRequest", detail);
    dispatch(owner, target, "htmx:afterSettle", detail);
    await bridge.whenIdle();

    expect(existingApplication.destroyed).toBe(false);
    expect($(inserted).star("instance")).toBeDefined();
    expect(bridge.observations().at(-1)).toMatchObject({
      flowId: "htmx.swap.adjacent",
      removalCount: 0,
      swapStyle: "beforeend",
    });
  });

  it("correlates history restoration without request events", async () => {
    const owner = realm('<main id="history"><section id="old" data-jqs></section></main>');
    const { bridge } = install(owner);
    const history = owner.document.querySelector("#history")!;
    const old = owner.document.querySelector("#old")!;
    $(old).star();
    const historyDetail = {
      historyElt: history,
      item: { content: '<section id="restored" data-jqs></section>' },
      swapSpec: { swapStyle: "innerHTML" },
    };
    dispatch(owner, owner.document.body, "htmx:historyCacheHit", historyDetail);
    const restored = owner.document.createElement("section");
    restored.id = "restored";
    restored.setAttribute("data-jqs", "");
    history.insertBefore(restored, old);
    dispatch(owner, old, "htmx:beforeCleanupElement", {});
    old.remove();
    dispatch(owner, history, "htmx:afterSwap", {});
    dispatch(owner, history, "htmx:afterSettle", {});
    await Promise.resolve();
    expect(bridge.observations().some(({ phase }) => phase === "committed")).toBe(false);
    dispatch(owner, owner.document.body, "htmx:historyRestore", historyDetail);
    await bridge.whenIdle();

    expect($(restored).star("instance")).toBeDefined();
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:historyRestore",
      flowId: "htmx.history.restore",
      targetCategory: "history",
      outcome: "completed",
    });
  });

  it("uses the armed cleanup seam for the htmx 2.0.0 history trace", async () => {
    const owner = realm('<main id="old" data-jqs></main>');
    const { bridge } = install(owner, { version: "2.0.0" });
    const old = owner.document.querySelector("#old")!;
    $(old).star();
    const oldApplication = $(old).star("instance")!;

    dispatch(owner, owner.document.body, "htmx:beforeHistorySave", {
      historyElt: owner.document.body,
    });
    const restored = owner.document.createElement("main");
    restored.id = "restored";
    restored.setAttribute("data-jqs", "");
    owner.document.body.prepend(restored);
    dispatch(owner, old, "htmx:beforeCleanupElement", {});
    old.remove();
    dispatch(owner, owner.document.body, "htmx:historyRestore", {});
    await bridge.whenIdle();

    expect(oldApplication.destroyed).toBe(true);
    expect($(restored).star("instance")).toBeDefined();
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:historyRestore",
      flowId: "htmx.history.restore",
      outcome: "completed",
      phase: "committed",
      targetCategory: "history",
    });
  });

  it("rejects unsupported and overlapping swaps before host mutation", async () => {
    const owner = realm(
      '<button id="source"></button><main id="outer"><section id="inner" data-jqs></section></main>',
    );
    const onError = vi.fn();
    install(owner, { onError });
    const source = owner.document.querySelector("#source")!;
    const outer = owner.document.querySelector("#outer")!;
    const inner = owner.document.querySelector("#inner")!;

    source.setAttribute("hx-swap", "morph");
    const unsupported = requestDetail(
      source,
      outer,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>unsupported</p>",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", unsupported);
    const unsupportedEvent = dispatch(owner, outer, "htmx:beforeSwap", unsupported);
    expect(unsupportedEvent.defaultPrevented).toBe(true);

    source.setAttribute("hx-swap", "innerHTML");
    const first = requestDetail(
      source,
      outer,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>first</p>",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", first);
    dispatch(owner, outer, "htmx:beforeSwap", first);
    const second = requestDetail(
      source,
      inner,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>second</p>",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", second);
    const overlap = dispatch(owner, inner, "htmx:beforeSwap", second);
    expect(overlap.defaultPrevented).toBe(true);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "Overlapping htmx swap boundaries are rejected before begin.",
      }),
    );

    dispatch(owner, source, "htmx:timeout", first);
    await Promise.resolve();
  });

  it("rejects invalid main, history, and out-of-band boundaries", () => {
    const owner = realm('<button id="source"></button><main id="target"></main>');
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const disconnected = owner.document.createElement("main");

    const mainDetail = requestDetail(
      source,
      disconnected,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>ignored</p>",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", mainDetail);
    expect(dispatch(owner, source, "htmx:beforeSwap", mainDetail).defaultPrevented).toBe(true);

    expect(
      dispatch(owner, owner.document.body, "htmx:historyCacheHit", {
        historyElt: disconnected,
        swapSpec: { swapStyle: "innerHTML" },
      }).defaultPrevented,
    ).toBe(true);
    expect(
      dispatch(owner, owner.document.body, "htmx:historyCacheHit", {
        historyElt: target,
        swapSpec: { swapStyle: "none" },
      }).defaultPrevented,
    ).toBe(true);
    expect(
      dispatch(owner, owner.document.body, "htmx:historyCacheMissLoad", {
        historyElt: target,
        swapSpec: { swapStyle: "morph" },
      }).defaultPrevented,
    ).toBe(true);

    expect(
      dispatch(owner, owner.document.body, "htmx:oobBeforeSwap", {
        fragment: owner.document.createDocumentFragment(),
        shouldSwap: true,
        target: disconnected,
      }).defaultPrevented,
    ).toBe(true);
    dispatch(owner, owner.document.body, "htmx:historyRestore", {});

    expect(bridge.observations().map(({ outcome }) => outcome)).toEqual([
      "failed-before-mutation",
      "failed-before-mutation",
      "observed-no-mutation",
      "failed-before-mutation",
      "failed-before-mutation",
      "observed-no-mutation",
    ]);
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:historyRestore",
      flowId: "htmx.history.restore",
      targetCategory: "history",
    });
  });

  it("rejects duplicate and rootless operations and cancels delete and history before mutation", async () => {
    const owner = realm('<button id="source"></button><main id="target"></main>');
    const onError = vi.fn();
    const { bridge } = install(owner, { onError });
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;

    source.addEventListener("htmx:beforeRequest", (event) => event.preventDefault(), {
      once: true,
    });
    dispatch(
      owner,
      source,
      "htmx:beforeRequest",
      requestDetail(source, target, {}, { shouldSwap: true }),
    );
    await Promise.resolve();

    const rootless = requestDetail(
      source,
      owner.document.documentElement,
      {},
      {
        shouldSwap: true,
        swapOverride: "beforebegin",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", rootless);
    expect(dispatch(owner, source, "htmx:beforeSwap", rootless).defaultPrevented).toBe(true);
    dispatch(owner, source, "htmx:targetError", rootless);

    expect(
      dispatch(owner, owner.document.body, "htmx:historyCacheHit", {
        historyElt: owner.document.documentElement,
        swapSpec: { swapStyle: "beforebegin" },
      }).defaultPrevented,
    ).toBe(true);

    const duplicate = requestDetail(
      source,
      target,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>duplicate</p>",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", duplicate);
    dispatch(owner, target, "htmx:beforeSwap", duplicate);
    expect(dispatch(owner, target, "htmx:beforeSwap", duplicate).defaultPrevented).toBe(true);
    dispatch(owner, source, "htmx:timeout", duplicate);
    await bridge.whenIdle();

    const deleted = requestDetail(
      source,
      target,
      {},
      {
        shouldSwap: true,
        swapOverride: "delete",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", deleted);
    dispatch(owner, target, "htmx:beforeSwap", deleted);
    dispatch(owner, source, "htmx:afterRequest", deleted);
    await bridge.whenIdle();

    target.addEventListener("htmx:historyCacheHit", (event) => event.preventDefault(), {
      once: true,
    });
    dispatch(owner, target, "htmx:historyCacheHit", {
      historyElt: target,
      item: { content: "<p>canceled</p>" },
      swapSpec: { swapStyle: "innerHTML" },
    });
    await bridge.whenIdle();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "The htmx swap boundary was disconnected before begin." }),
    );
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: "A duplicate htmx main swap was rejected before begin." }),
    );
    expect(bridge.observations().filter(({ phase }) => phase === "canceled")).toEqual([
      expect.objectContaining({ eventId: "htmx:beforeRequest", flowId: "htmx.swap.none" }),
      expect.objectContaining({ eventId: "htmx:afterRequest", flowId: "htmx.swap.delete" }),
      expect.objectContaining({
        eventId: "htmx:historyCacheHit",
        flowId: "htmx.history.restore",
      }),
    ]);
  });

  it("validates out-of-band selectors, cancellation, rootless insertion, and host failure", async () => {
    const owner = realm(
      '<button id="source"></button><main id="target"></main><aside id="notice"></aside>',
    );
    const { bridge } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const notice = owner.document.querySelector("#notice")!;

    const invalidSelector = requestDetail(
      source,
      target,
      {},
      {
        serverResponse: '<aside hx-swap-oob="outerHTML:["></aside>',
        shouldSwap: false,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", invalidSelector);
    dispatch(owner, target, "htmx:beforeSwap", invalidSelector);
    dispatch(owner, source, "htmx:afterRequest", invalidSelector);
    await Promise.resolve();

    const rootless = requestDetail(
      source,
      target,
      {},
      {
        serverResponse: '<div hx-swap-oob="beforebegin:html"></div>',
        shouldSwap: false,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", rootless);
    dispatch(owner, target, "htmx:beforeSwap", rootless);
    const rootlessDetail = {
      fragment: owner.document.createDocumentFragment(),
      shouldSwap: true,
      target: owner.document.documentElement,
    };
    expect(
      dispatch(owner, owner.document.documentElement, "htmx:oobBeforeSwap", rootlessDetail)
        .defaultPrevented,
    ).toBe(true);
    dispatch(owner, source, "htmx:afterRequest", rootless);
    await Promise.resolve();

    const canceled = requestDetail(
      source,
      target,
      {},
      {
        serverResponse: '<aside id="notice" hx-swap-oob="outerHTML:#notice"></aside>',
        shouldSwap: false,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", canceled);
    dispatch(owner, target, "htmx:beforeSwap", canceled);
    notice.addEventListener("htmx:oobBeforeSwap", (event) => event.preventDefault(), {
      once: true,
    });
    dispatch(owner, notice, "htmx:oobBeforeSwap", {
      fragment: owner.document.createDocumentFragment(),
      shouldSwap: true,
      target: notice,
    });
    await bridge.whenIdle();
    dispatch(owner, source, "htmx:afterRequest", canceled);
    await Promise.resolve();

    const failed = requestDetail(
      source,
      target,
      {},
      {
        serverResponse: '<aside id="notice" hx-swap-oob="true"></aside>',
        shouldSwap: false,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", failed);
    dispatch(owner, target, "htmx:beforeSwap", failed);
    dispatch(owner, notice, "htmx:oobBeforeSwap", {
      fragment: owner.document.createDocumentFragment(),
      shouldSwap: true,
      target: notice,
    });
    dispatch(owner, source, "htmx:timeout", failed);
    await bridge.whenIdle();
    dispatch(owner, source, "htmx:afterRequest", failed);
    await Promise.resolve();

    expect(bridge.observations()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          eventId: "htmx:oobBeforeSwap",
          outcome: "canceled-before-mutation",
        }),
        expect.objectContaining({ eventId: "htmx:timeout", outcome: "failed-before-mutation" }),
      ]),
    );
  });

  it("contains listener and default error-reporter failures", () => {
    const owner = realm('<button id="source"></button><main id="target"></main>');
    const reporterFailure = new Error("reporter failed");
    const reportError = vi.fn(() => {
      throw reporterFailure;
    });
    Object.defineProperty(owner, "reportError", { configurable: true, value: reportError });
    install(owner);
    const source = owner.document.querySelector("#source")!;
    const listenerFailure = new Error("event detail failed");
    const xhr = {};
    const detail = Object.defineProperty({ xhr, requestConfig: { elt: source } }, "target", {
      get() {
        throw listenerFailure;
      },
    });

    const event = dispatch(owner, source, "htmx:beforeSwap", detail);
    expect(event.defaultPrevented).toBe(true);
    expect(reportError).toHaveBeenCalledWith(listenerFailure);
    dispatch(owner, source, "htmx:targetError", { xhr, requestConfig: { elt: source } });
  });

  it("contains render begin and outgoing cleanup failures", async () => {
    const owner = realm(
      [
        '<button id="source"></button>',
        '<main id="begin"><section id="flaky" data-jqs-preserve></section></main>',
        '<main id="cleanup"><section id="removed"></section></main>',
      ].join(""),
    );
    const onError = vi.fn();
    const { bridge } = install(owner, { onError });
    const source = owner.document.querySelector("#source")!;
    const begin = owner.document.querySelector("#begin")!;
    const flaky = owner.document.querySelector("#flaky")!;
    let connectedChecks = 0;
    Object.defineProperty(flaky, "isConnected", {
      configurable: true,
      get: () => ++connectedChecks === 1,
    });
    const beginFailure = requestDetail(
      source,
      begin,
      {},
      {
        serverResponse: '<section id="flaky" data-jqs-preserve></section>',
        shouldSwap: true,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", beginFailure);
    expect(dispatch(owner, begin, "htmx:beforeSwap", beginFailure).defaultPrevented).toBe(true);
    dispatch(owner, source, "htmx:targetError", beginFailure);

    const cleanup = owner.document.querySelector("#cleanup")!;
    const removed = owner.document.querySelector("#removed")!;
    const cleanupFailure = requestDetail(
      source,
      cleanup,
      {},
      {
        serverResponse: "<p>replacement</p>",
        shouldSwap: true,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", cleanupFailure);
    dispatch(owner, cleanup, "htmx:beforeSwap", cleanupFailure);
    Object.defineProperty(removed, "parentElement", {
      configurable: true,
      get() {
        removed.remove();
        return cleanup;
      },
    });
    dispatch(owner, removed, "htmx:beforeCleanupElement", {});
    await bridge.whenIdle();

    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({
        message: "A preserved root must be connected when rendering begins.",
      }),
    );
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:beforeCleanupElement",
      outcome: "failed-after-removal",
      phase: "failed",
    });
  });

  it("moves a nested preserved root and reports a promised root lost during commit", async () => {
    const owner = realm(
      [
        '<button id="source"></button>',
        '<main id="moving"><div id="moving-old"><section id="moving-kept" data-jqs data-jqs-preserve></section></div></main>',
        '<main id="missing"><div id="missing-old"><section id="missing-kept" data-jqs data-jqs-preserve></section></div></main>',
      ].join(""),
    );
    const onError = vi.fn();
    const { bridge } = install(owner, { onError });
    const source = owner.document.querySelector("#source")!;

    const moving = owner.document.querySelector("#moving")!;
    const movingOld = owner.document.querySelector("#moving-old")!;
    const movingKept = owner.document.querySelector("#moving-kept")!;
    $(movingKept).star();
    const movingApplication = $(movingKept).star("instance")!;
    const movingDetail = requestDetail(
      source,
      moving,
      {},
      {
        serverResponse: '<section id="moving-kept" data-jqs data-jqs-preserve></section>',
        shouldSwap: true,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", movingDetail);
    dispatch(owner, moving, "htmx:beforeSwap", movingDetail);
    const placeholder = owner.document.createElement("section");
    placeholder.id = "moving-kept";
    placeholder.setAttribute("data-jqs", "");
    placeholder.setAttribute("data-jqs-preserve", "");
    moving.prepend(placeholder);
    dispatch(owner, movingOld, "htmx:beforeCleanupElement", {});
    movingOld.remove();
    dispatch(owner, moving, "htmx:afterSwap", movingDetail);
    dispatch(owner, source, "htmx:afterRequest", movingDetail);
    dispatch(owner, moving, "htmx:afterSettle", movingDetail);
    await bridge.whenIdle();
    expect(owner.document.querySelector("#moving-kept")).toBe(movingKept);
    expect($(movingKept).star("instance")).toBe(movingApplication);

    const missing = owner.document.querySelector("#missing")!;
    const missingOld = owner.document.querySelector("#missing-old")!;
    const missingKept = owner.document.querySelector("#missing-kept")!;
    $(missingKept).star();
    const missingApplication = $(missingKept).star("instance")!;
    const missingDetail = requestDetail(
      source,
      missing,
      {},
      {
        serverResponse: '<section id="missing-kept" data-jqs data-jqs-preserve></section>',
        shouldSwap: true,
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", missingDetail);
    dispatch(owner, missing, "htmx:beforeSwap", missingDetail);
    dispatch(owner, missingOld, "htmx:beforeCleanupElement", {});
    missingOld.remove();
    dispatch(owner, missing, "htmx:afterSwap", missingDetail);
    dispatch(owner, source, "htmx:afterRequest", missingDetail);
    dispatch(owner, missing, "htmx:afterSettle", missingDetail);
    await bridge.whenIdle();

    expect(missingApplication.destroyed).toBe(true);
    expect(onError).toHaveBeenCalledWith(
      expect.objectContaining({ message: expect.stringContaining("did not retain 1 promised") }),
    );
    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:afterSwap",
      outcome: "failed-after-mutation",
      phase: "failed",
    });
  });

  it("reports failures by mutation phase without exposing error data", async () => {
    const owner = realm(
      '<button id="source"></button><main id="target"><section id="owned" data-jqs></section></main>',
    );
    const onError = vi.fn();
    const { bridge } = install(owner, { onError });
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const owned = owner.document.querySelector("#owned")!;
    $(owned).star();
    const detail = requestDetail(
      source,
      target,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>replacement</p>",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);
    dispatch(owner, owned, "htmx:beforeCleanupElement", {});
    dispatch(owner, source, "htmx:swapError", detail);
    await bridge.whenIdle();

    expect(bridge.observations().at(-1)).toMatchObject({
      eventId: "htmx:swapError",
      outcome: "failed-after-removal",
      phase: "failed",
    });
    expect(JSON.stringify(bridge.observations())).not.toContain("replacement");
    expect(onError).not.toHaveBeenCalledWith(expect.objectContaining({ message: "replacement" }));
  });

  it("bounds redacted observations and isolates observer errors", () => {
    const owner = realm("<main></main>");
    const onError = vi.fn();
    const { bridge } = install(owner, { onError });
    bridge.observe(() => {
      throw new Error("observer failure");
    });
    for (let index = 0; index < 300; index += 1) {
      dispatch(owner, owner.document.body, "htmx:targetError", { target: `#secret-${index}` });
    }

    const observations = bridge.observations();
    expect(observations).toHaveLength(256);
    expect(observations[0]?.sequence).toBe(45);
    expect(observations.at(-1)?.sequence).toBe(300);
    expect(Object.keys(observations[0]!).sort()).toEqual(
      [
        "bridgeOperationId",
        "elapsedMs",
        "eventId",
        "flowId",
        "host",
        "outcome",
        "phase",
        "removalCount",
        "renderOperationId",
        "schema",
        "sequence",
        "swapStyle",
        "targetCategory",
        "version",
      ].sort(),
    );
    expect(JSON.stringify(observations)).not.toContain("secret");
    expect(onError).toHaveBeenCalledTimes(300);

    expect(() => bridge.observe(undefined as never)).toThrow("observer is required");
    const removedObserver = vi.fn();
    const unsubscribe = bridge.observe(removedObserver);
    unsubscribe();
    unsubscribe();
    dispatch(owner, owner.document.body, "htmx:targetError", {});
    expect(removedObserver).not.toHaveBeenCalled();
  });

  it("disposes prepared and active work once without calling or disposing htmx", async () => {
    const owner = realm(
      '<button id="source"></button><main id="target"><section data-jqs></section></main>',
    );
    const { bridge, htmx } = install(owner);
    const source = owner.document.querySelector("#source")!;
    const target = owner.document.querySelector("#target")!;
    const detail = requestDetail(
      source,
      target,
      {},
      {
        shouldSwap: true,
        serverResponse: "<p>pending</p>",
      },
    );
    dispatch(owner, source, "htmx:beforeRequest", detail);
    dispatch(owner, target, "htmx:beforeSwap", detail);

    const first = bridge.dispose();
    const second = bridge.dispose();
    expect(second).toBe(first);
    await expect(first).resolves.toEqual({
      schema: "jqstar-htmx-bridge-disposal/1",
      attempted: 1,
      preparedReleased: 1,
      remaining: 0,
    });
    expectHostMethodsUntouched(htmx);
    expect(() => bridge.observe(() => undefined)).toThrow("disposed");

    const observations = bridge.observations();
    dispatch(owner, owner.document.body, "htmx:targetError", { target: "#ignored" });
    expect(bridge.observations()).toEqual(observations);
  });
});

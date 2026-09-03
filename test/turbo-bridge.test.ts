import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore, type StarCoreStatic } from "../src/core";
import { kernelForDocument } from "../src/kernel";
import {
  createTurboBridge,
  TURBO_BRIDGE_SUPPORTED_RANGE,
  type StarTurboBridge,
  type StarTurboCapability,
} from "../src/turbo";

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

function turbo(): StarTurboCapability {
  return {
    cache: {},
    session: {},
    start: vi.fn(),
    visit: vi.fn(),
  };
}

function install(
  owner: Window,
  options: { onError?: (error: unknown) => void; version?: string } = {},
): { bridge: StarTurboBridge; star: StarCoreStatic } {
  const star = installStarCore($, { document: owner.document }).star;
  installations.push(star);
  const bridge = star.use(
    createTurboBridge({
      $,
      Turbo: turbo(),
      version: options.version ?? "8.0.23",
      ...(options.onError ? { onError: options.onError } : {}),
    }),
  );
  return { bridge, star };
}

function dispatch<Detail>(
  owner: Window,
  target: EventTarget,
  type: string,
  detail: Detail,
  cancelable = false,
): CustomEvent<Detail> {
  const EventHost = owner as Window & typeof globalThis;
  const event = new EventHost.CustomEvent(type, { bubbles: true, cancelable, detail });
  target.dispatchEvent(event);
  return event;
}

afterEach(() => {
  for (const star of installations.splice(0).reverse()) star.dispose();
  for (const frame of frames.splice(0).reverse()) frame.remove();
  vi.restoreAllMocks();
});

describe("Turbo lifecycle bridge", () => {
  it("rejects missing capabilities and unsupported versions before installation", () => {
    expect(TURBO_BRIDGE_SUPPORTED_RANGE).toBe(">=8.0.21 <8.1.0");
    expect(() =>
      createTurboBridge({
        $,
        Turbo: undefined as unknown as StarTurboCapability,
        version: "8.0.23",
      }),
    ).toThrow("capability object");
    expect(() => createTurboBridge({ $, Turbo: turbo(), version: "8.0.20" })).toThrow(
      TURBO_BRIDGE_SUPPORTED_RANGE,
    );
    expect(() => createTurboBridge({ $, Turbo: turbo(), version: "8.1.0" })).toThrow(
      TURBO_BRIDGE_SUPPORTED_RANGE,
    );
    expect(() => createTurboBridge({ $, Turbo: turbo(), version: "8.0.23-beta.1" })).toThrow(
      "stable major.minor.patch",
    );
    expect(() =>
      createTurboBridge({
        $,
        Turbo: { ...turbo(), visit: undefined } as unknown as StarTurboCapability,
        version: "8.0.23",
      }),
    ).toThrow("start(), visit(), session, and cache");
    expect(() => createTurboBridge(undefined as never)).toThrow("options are required");
    expect(() =>
      createTurboBridge({ $, Turbo: turbo(), version: "8.0.23", onError: false as never }),
    ).toThrow("onError must be a function");
    expect(() =>
      createTurboBridge({ $: undefined as never, Turbo: turbo(), version: "8.0.23" }),
    ).toThrow("installed jQuery function is required");
  });

  it("wraps one document render and commits explicit incoming roots", async () => {
    const owner = realm('<main id="outgoing" data-jqs data-signals="{ count: 1 }"></main>');
    const { bridge } = install(owner);
    const outgoing = owner.document.querySelector("#outgoing")!;
    $(outgoing).star();
    const outgoingApplication = $(outgoing).star("instance")!;
    const oldBody = owner.document.body;
    const newBody = owner.document.createElement("body");
    newBody.innerHTML = '<main id="incoming" data-jqs data-signals="{ ready: true }"></main>';
    const hostRender = vi.fn((current: Element, incoming: Element) =>
      current.replaceWith(incoming),
    );
    const detail = { newBody, render: hostRender };

    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    await Promise.resolve(detail.render(oldBody, newBody));

    const incoming = owner.document.querySelector("#incoming")!;
    expect(hostRender).toHaveBeenCalledOnce();
    expect(outgoingApplication.destroyed).toBe(true);
    expect($(incoming).star("state")).toEqual({ ready: true });
    expect(bridge.observations().map(({ phase }) => phase)).toEqual([
      "prepared",
      "removing",
      "removing",
      "externally-mutated",
      "enhancing",
      "committed",
    ]);
    expect(bridge.observations().at(-1)).toMatchObject({
      flowId: "turbo.document.visit",
      outcome: "completed",
      targetCategory: "document",
      removalCount: 1,
    });
  });

  it("keeps matching data-jqs-preserve identity through a document render", async () => {
    const owner = realm(
      '<main id="kept" data-jqs data-jqs-preserve data-signals="{ count: 2 }"><input value="kept"></main>',
    );
    install(owner);
    const kept = owner.document.querySelector("#kept")!;
    $(kept).star();
    const application = $(kept).star("instance")!;
    const input = kept.querySelector("input")!;
    const oldBody = owner.document.body;
    const newBody = owner.document.createElement("body");
    newBody.innerHTML = '<main id="kept" data-jqs data-jqs-preserve></main>';
    const detail = {
      newBody,
      render: (current: Element, incoming: Element) => current.replaceWith(incoming),
    };

    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    await Promise.resolve(detail.render(oldBody, newBody));

    expect(owner.document.querySelector("#kept")).toBe(kept);
    expect($(kept).star("instance")).toBe(application);
    expect(application.destroyed).toBe(false);
    expect((owner.document.querySelector("#kept input") as HTMLInputElement).value).toBe("kept");
    expect(owner.document.querySelector("#kept input")).toBe(input);
  });

  it("waits for Turbo's permanent-element handoff before committing", async () => {
    const owner = realm(
      '<main id="permanent" data-jqs data-turbo-permanent data-signals="{ count: 3 }"></main>',
    );
    const { bridge } = install(owner);
    const permanent = owner.document.querySelector("#permanent")!;
    $(permanent).star();
    const application = $(permanent).star("instance")!;
    const oldBody = owner.document.body;
    const newBody = owner.document.createElement("body");
    newBody.innerHTML = '<main id="permanent" data-jqs data-turbo-permanent></main>';
    const detail = {
      newBody,
      render: (current: Element, incoming: Element) => current.replaceWith(incoming),
    };

    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    await Promise.resolve(detail.render(oldBody, newBody));
    expect(bridge.observations().at(-1)?.phase).toBe("externally-mutated");

    owner.document.querySelector("#permanent")!.replaceWith(permanent);
    dispatch(owner, owner.document.documentElement, "turbo:render", {});
    await bridge.whenIdle();

    expect(owner.document.querySelector("#permanent")).toBe(permanent);
    expect($(permanent).star("instance")).toBe(application);
    expect(bridge.observations().at(-1)?.phase).toBe("committed");
  });

  it("wraps Frame child replacement without handling navigation", async () => {
    const owner = realm(
      '<turbo-frame id="account"><section id="old" data-jqs data-signals="{ old: true }"></section></turbo-frame>',
    );
    const { bridge } = install(owner);
    const current = owner.document.querySelector("turbo-frame")!;
    const outgoing = owner.document.querySelector("#old")!;
    $(outgoing).star();
    const outgoingApplication = $(outgoing).star("instance")!;
    const incoming = owner.document.createElement("turbo-frame");
    incoming.innerHTML = '<section id="new" data-jqs data-signals="{ fresh: true }"></section>';
    const hostRender = vi.fn((target: Element, source: Element) => {
      target.replaceChildren(...source.children);
    });
    const detail = { newFrame: incoming, render: hostRender };

    dispatch(owner, current, "turbo:before-frame-render", detail, true);
    await Promise.resolve(detail.render(current, incoming));

    expect(hostRender).toHaveBeenCalledOnce();
    expect(outgoingApplication.destroyed).toBe(true);
    expect($(owner.document.querySelector("#new")!).star("state")).toEqual({ fresh: true });
    expect(bridge.observations().at(-1)).toMatchObject({
      flowId: "turbo.frame.replace",
      phase: "committed",
      targetCategory: "frame",
    });
  });

  it("records canceled and no-render paths without opening a render transaction", async () => {
    const owner = realm("<main></main>");
    const { bridge } = install(owner);
    owner.document.addEventListener("turbo:before-visit", (event) => event.preventDefault());

    dispatch(owner, owner.document.documentElement, "turbo:before-visit", {}, true);
    dispatch(owner, owner.document.documentElement, "turbo:before-fetch-response", {
      fetchResponse: { statusCode: 204 },
    });
    await Promise.resolve();

    expect(bridge.observations()).toEqual([
      expect.objectContaining({
        flowId: "turbo.document.no-render",
        renderOperationId: null,
        outcome: "observed-no-mutation",
      }),
      expect.objectContaining({
        flowId: "turbo.document.canceled",
        renderOperationId: null,
        outcome: "canceled-before-mutation",
      }),
    ]);
  });

  it("records request and Frame errors and clears stale visit classification", async () => {
    const owner = realm("<main></main>");
    const { bridge } = install(owner);

    dispatch(owner, owner.document, "turbo:submit-start", {});
    dispatch(owner, owner.document, "turbo:fetch-request-error", {});
    dispatch(owner, owner.document, "turbo:visit", { action: "restore" });
    dispatch(owner, owner.document, "turbo:frame-missing", {});

    const newBody = owner.document.createElement("body");
    const detail = {
      newBody,
      render: (current: Element, incoming: Element) => current.replaceWith(incoming),
    };
    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    await Promise.resolve(detail.render(owner.document.body, newBody));

    expect(bridge.observations().filter(({ phase }) => phase === "failed")).toEqual([
      expect.objectContaining({
        flowId: "turbo.document.error",
        outcome: "failed-before-mutation",
        targetCategory: "document",
      }),
      expect.objectContaining({
        flowId: "turbo.document.error",
        outcome: "failed-before-mutation",
        targetCategory: "frame",
      }),
    ]);
    expect(bridge.observations().at(-1)).toMatchObject({
      flowId: "turbo.document.visit",
      phase: "committed",
    });
  });

  it("ignores malformed Frame renders and accepts both Frame completion target shapes", () => {
    const owner = realm('<turbo-frame id="account"></turbo-frame>');
    install(owner);
    const frame = owner.document.querySelector("turbo-frame")!;
    const untouched = vi.fn();
    const missingIncoming = { render: untouched };
    const foreign = realm('<turbo-frame id="foreign"></turbo-frame>');
    const foreignIncoming = {
      newFrame: foreign.document.querySelector("turbo-frame")!,
      render: untouched,
    };

    dispatch(owner, frame, "turbo:before-frame-render", missingIncoming, true);
    dispatch(owner, frame, "turbo:before-frame-render", foreignIncoming, true);
    dispatch(owner, frame, "turbo:frame-render", {});
    dispatch(owner, owner.document, "turbo:frame-render", {});

    expect(missingIncoming.render).toBe(untouched);
    expect(foreignIncoming.render).toBe(untouched);
  });

  it("ignores cross-document and non-body document render inputs", () => {
    const owner = realm("<main></main>");
    install(owner);
    const foreign = realm("<main></main>");
    const untouched = vi.fn();
    const foreignDetail = { newBody: foreign.document.body, render: untouched };
    const nonBodyDetail = { newBody: owner.document.createElement("main"), render: untouched };

    dispatch(owner, owner.document.documentElement, "turbo:before-render", foreignDetail, true);
    dispatch(owner, owner.document.documentElement, "turbo:before-render", nonBodyDetail, true);

    expect(foreignDetail.render).toBe(untouched);
    expect(nonBodyDetail.render).toBe(untouched);
  });

  it("rejects a wrapped renderer invoked with substituted boundaries", () => {
    const owner = realm("<main></main>");
    install(owner);
    const expectedBody = owner.document.body;
    const newBody = owner.document.createElement("body");
    const detail = { newBody, render: vi.fn() };
    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);

    expect(() => detail.render(owner.document.createElement("body"), newBody)).toThrow(
      "unexpected boundary",
    );
    expect(() => detail.render(expectedBody, owner.document.createElement("body"))).toThrow(
      "unexpected boundary",
    );
  });

  it("classifies form and restoration renders without depending on intent order", async () => {
    const owner = realm("<main></main>");
    const { bridge } = install(owner);

    dispatch(owner, owner.document, "turbo:submit-start", {});
    const formBody = owner.document.createElement("body");
    formBody.innerHTML = '<main data-jqs id="form-result"></main>';
    const formDetail = {
      newBody: formBody,
      render: (current: Element, incoming: Element) => current.replaceWith(incoming),
    };
    dispatch(owner, owner.document.documentElement, "turbo:before-render", formDetail, true);
    await Promise.resolve(formDetail.render(owner.document.body, formBody));
    dispatch(owner, owner.document, "turbo:load", {});

    dispatch(owner, owner.document, "turbo:visit", { action: "restore" });
    const restoreBody = owner.document.createElement("body");
    restoreBody.innerHTML = '<main data-jqs id="restore-result"></main>';
    const restoreDetail = {
      newBody: restoreBody,
      render: (current: Element, incoming: Element) => current.replaceWith(incoming),
    };
    dispatch(owner, owner.document.documentElement, "turbo:before-render", restoreDetail, true);
    await Promise.resolve(restoreDetail.render(owner.document.body, restoreBody));

    const terminalFlows = bridge
      .observations()
      .filter(({ phase }) => phase === "committed")
      .map(({ flowId }) => flowId);
    expect(terminalFlows).toEqual(["turbo.form.visit", "turbo.document.restore"]);
  });

  it("rejects overlapping actual mutations before a second transaction begins", async () => {
    const owner = realm(
      '<main><turbo-frame id="nested"><section data-jqs id="nested-owner"></section></turbo-frame></main>',
    );
    const { bridge } = install(owner);
    const oldBody = owner.document.body;
    const newBody = owner.document.createElement("body");
    let finishDocument!: () => void;
    const documentDetail = {
      newBody,
      render: (_current: Element, _incoming: Element) =>
        new Promise<void>((resolve) => (finishDocument = resolve)),
    };
    dispatch(owner, owner.document.documentElement, "turbo:before-render", documentDetail, true);
    const rendering = documentDetail.render(oldBody, newBody);

    const frame = owner.document.querySelector("turbo-frame")!;
    const newFrame = owner.document.createElement("turbo-frame");
    const frameDetail = {
      newFrame,
      render: (current: Element, incoming: Element) =>
        current.replaceChildren(...incoming.children),
    };
    dispatch(owner, frame, "turbo:before-frame-render", frameDetail, true);
    expect(() => frameDetail.render(frame, newFrame)).toThrow(
      "Overlapping Turbo render boundaries are rejected before begin.",
    );

    finishDocument();
    await rendering;
    await bridge.whenIdle();
    expect(
      new Set(
        bridge
          .observations()
          .map(({ renderOperationId }) => renderOperationId)
          .filter((id) => id !== null),
      ).size,
    ).toBe(1);
  });

  it("bounds observation history and isolates observer failures from host events", () => {
    const owner = realm("<main></main>");
    const onError = vi.fn();
    const { bridge } = install(owner, { onError });
    const observerFailure = new Error("observer failed");
    const release = bridge.observe(() => {
      throw observerFailure;
    });

    dispatch(owner, owner.document, "turbo:before-cache", {});
    expect(onError).toHaveBeenCalledWith(observerFailure);
    release();
    release();
    for (let index = 0; index < 300; index += 1) {
      dispatch(owner, owner.document, "turbo:before-cache", {});
    }

    const observations = bridge.observations();
    expect(observations).toHaveLength(256);
    expect(observations[0]?.sequence).toBe(46);
    expect(observations.at(-1)?.sequence).toBe(301);
    expect(() => bridge.observe(undefined as unknown as () => void)).toThrow("observer");
  });

  it("settles a throwing host renderer once and reports only through the error callback", async () => {
    const owner = realm('<main><section id="owned" data-jqs></section></main>');
    const onError = vi.fn();
    const { bridge } = install(owner, { onError });
    const owned = owner.document.querySelector("#owned")!;
    $(owned).star();
    const application = $(owned).star("instance")!;
    const failure = new Error("host render failed");
    const newBody = owner.document.createElement("body");
    const detail = {
      newBody,
      render: (_current: Element, _incoming: Element) => {
        throw failure;
      },
    };

    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    expect(() => detail.render(owner.document.body, newBody)).toThrow(failure);
    await bridge.whenIdle();
    await vi.waitFor(() => expect(onError).toHaveBeenCalledOnce());

    expect(application.destroyed).toBe(true);
    expect(bridge.observations().at(-1)).toMatchObject({
      flowId: "turbo.document.visit",
      outcome: "failed-after-removal",
      phase: "failed",
    });
    expect(JSON.stringify(bridge.observations())).not.toContain(failure.message);
  });

  it("settles an asynchronously rejected host renderer through the failed-removal path", async () => {
    const owner = realm('<main><section data-jqs id="owned"></section></main>');
    const { bridge } = install(owner);
    $(owner.document.querySelector("#owned")!).star();
    const failure = new Error("async host render failed");
    const newBody = owner.document.createElement("body");
    const detail = {
      newBody,
      render: (_current: Element, _incoming: Element) => Promise.reject(failure),
    };

    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    await expect(detail.render(owner.document.body, newBody)).rejects.toBe(failure);
    await bridge.whenIdle();

    expect(bridge.observations().at(-1)).toMatchObject({
      outcome: "failed-after-removal",
      phase: "failed",
    });
  });

  it("records a post-mutation enhancement failure without rolling back Turbo", async () => {
    const owner = realm('<main><section data-jqs id="outgoing"></section></main>');
    const { bridge } = install(owner);
    $(owner.document.querySelector("#outgoing")!).star();
    const failure = new Error("enhancement barrier failed");
    vi.spyOn(kernelForDocument(owner.document)!, "whenEnhanced").mockRejectedValueOnce(failure);
    const newBody = owner.document.createElement("body");
    newBody.innerHTML = '<main data-jqs id="incoming"></main>';
    const detail = {
      newBody,
      render: (current: Element, incoming: Element) => current.replaceWith(incoming),
    };

    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    await expect(detail.render(owner.document.body, newBody)).rejects.toBe(failure);
    await bridge.whenIdle();

    expect(owner.document.querySelector("#incoming")).not.toBeNull();
    expect(bridge.observations().at(-1)).toMatchObject({
      outcome: "failed-after-mutation",
      phase: "failed",
    });
  });

  it("contains failures thrown by the configured observation error reporter", () => {
    const owner = realm("<main></main>");
    const { bridge } = install(owner, {
      onError: () => {
        throw new Error("reporter failed");
      },
    });
    bridge.observe(() => {
      throw new Error("observer failed");
    });

    expect(() => dispatch(owner, owner.document, "turbo:before-cache", {})).not.toThrow();
  });

  it("removes listeners and settles active ownership exactly once on disposal", async () => {
    const owner = realm('<main id="outgoing" data-jqs></main>');
    const { bridge } = install(owner);
    const oldBody = owner.document.body;
    const newBody = owner.document.createElement("body");
    let finishHostRender!: () => void;
    const detail = {
      newBody,
      render: (_current: Element, _incoming: Element) =>
        new Promise<void>((resolve) => (finishHostRender = resolve)),
    };
    dispatch(owner, owner.document.documentElement, "turbo:before-render", detail, true);
    const rendering = detail.render(oldBody, newBody);

    const first = bridge.dispose();
    const second = bridge.dispose();
    expect(second).toBe(first);
    finishHostRender();
    await rendering;
    await expect(first).resolves.toEqual({
      schema: "jqstar-turbo-bridge-disposal/1",
      attempted: 1,
      remaining: 0,
    });

    const after = {
      newBody: owner.document.createElement("body"),
      render: vi.fn(),
    };
    dispatch(owner, owner.document.documentElement, "turbo:before-render", after, true);
    expect(after.render).not.toHaveBeenCalled();
  });
});

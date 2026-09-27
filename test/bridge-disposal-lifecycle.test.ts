import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import { installStarCore, type StarCoreStatic } from "../src/core";
import { createHtmxBridge } from "../src/htmx";
import { createTurboBridge } from "../src/turbo";

const frames: HTMLIFrameElement[] = [];
const installations: StarCoreStatic[] = [];

function fixture() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const owner = frame.contentWindow;
  if (!owner) throw new Error("Missing bridge realm.");
  owner.document.body.innerHTML =
    '<button id="source"></button><main id="target"><p>Old</p></main>';
  const star = installStarCore($, { document: owner.document }).star;
  installations.push(star);
  const errors: unknown[] = [];
  const host = owner as Window & typeof globalThis;
  const dispatch = (target: EventTarget, type: string, detail: object) => {
    target.dispatchEvent(new host.CustomEvent(type, { bubbles: true, cancelable: true, detail }));
  };
  const flush = async () => {
    await star.whenEnhanced();
    await new Promise<void>((resolve) => owner.setTimeout(resolve, 0));
  };
  return { owner, star, errors, dispatch, flush };
}

function trackDisposal<Report>(dispose: () => Promise<Report>) {
  const result: { promise?: Promise<Report>; report?: Report; error?: unknown; settled: boolean } =
    {
      settled: false,
    };
  const start = () => {
    try {
      result.promise = dispose();
      expect(dispose()).toBe(result.promise);
      void result.promise.then(
        (report) => {
          result.report = report;
          result.settled = true;
        },
        (error: unknown) => {
          result.error = error;
          result.settled = true;
        },
      );
    } catch (error) {
      result.error = error;
    }
  };
  return { result, start };
}

afterEach(() => {
  for (const star of installations.splice(0).reverse()) star.dispose();
  for (const frame of frames.splice(0).reverse()) frame.remove();
});

describe("Bridge disposal during core settlement", () => {
  it.each(["direct", "observer", "after-commit", "prepared", "removing", "swap-error"])(
    "settles htmx %s disposal without another host event",
    async (mode) => {
      const { owner, star, errors, dispatch, flush } = fixture();
      const htmx = {
        version: "2.0.10",
        config: { defaultSwapStyle: "innerHTML" },
        ajax: vi.fn(),
        off: vi.fn(),
        on: vi.fn(),
        process: vi.fn(),
        swap: vi.fn(),
        trigger: vi.fn(),
      };
      const bridge = star.use(
        createHtmxBridge({ $, htmx, version: htmx.version, onError: (e) => errors.push(e) }),
      );
      const disposal = trackDisposal(() => bridge.dispose());
      if (mode === "observer")
        bridge.observe((record) => {
          if (record.phase === "enhancing") disposal.start();
        });
      const source = owner.document.querySelector("#source");
      const target = owner.document.querySelector("#target");
      if (mode === "swap-error")
        bridge.observe((record) => {
          if (record.phase === "externally-mutated" && source)
            dispatch(source, "htmx:swapError", detail);
        });
      const outgoing = target?.firstElementChild;
      if (!source || !target || !outgoing) throw new Error("Missing htmx parts.");
      const detail = {
        xhr: {},
        target,
        requestConfig: { elt: source },
        shouldSwap: true,
        serverResponse: "<p>New</p>",
      };
      dispatch(source, "htmx:beforeRequest", detail);
      dispatch(target, "htmx:beforeSwap", detail);
      if (mode !== "prepared") dispatch(outgoing, "htmx:beforeCleanupElement", {});
      if (mode !== "prepared" && mode !== "removing") {
        target.innerHTML = "<p>New</p>";
        dispatch(target, "htmx:afterSwap", detail);
      }
      if (mode === "after-commit") await flush();
      if (mode !== "observer") disposal.start();
      await flush();
      expect(disposal.result.error).toBeUndefined();
      expect(disposal.result.settled).toBe(true);
      expect(disposal.result.report).toEqual({
        schema: "jqstar-htmx-bridge-disposal/1",
        attempted: 1,
        preparedReleased: 1,
        remaining: 0,
      });
      await bridge.whenIdle();
      const terminal = bridge.observations().filter((record) => record.phase === "failed");
      expect(terminal).toHaveLength(1);
      expect(terminal[0]?.outcome).toBe(
        mode === "prepared"
          ? "failed-before-mutation"
          : mode === "removing"
            ? "failed-after-removal"
            : "failed-after-mutation",
      );
      const records = bridge.observations();
      dispatch(target, "htmx:afterSettle", detail);
      dispatch(source, "htmx:afterRequest", detail);
      expect(bridge.observations()).toEqual(records);
      for (const method of [htmx.ajax, htmx.off, htmx.on, htmx.process, htmx.swap, htmx.trigger])
        expect(method).not.toHaveBeenCalled();
      expect(errors).toEqual([]);
      await star.whenEnhanced();
    },
  );

  it.each(["direct", "observer"])("awaits Turbo %s disposal during enhancement", async (mode) => {
    const { owner, star, errors, dispatch, flush } = fixture();
    const Turbo = { cache: {}, session: {}, start: vi.fn(), visit: vi.fn() };
    const bridge = star.use(
      createTurboBridge({ $, Turbo, version: "8.0.21", onError: (e) => errors.push(e) }),
    );
    const disposal = trackDisposal(() => bridge.dispose());
    if (mode === "observer")
      bridge.observe((record) => {
        if (record.phase === "enhancing") disposal.start();
      });
    const incoming = owner.document.createElement("body");
    incoming.innerHTML = "<p>New</p>";
    const hostRender = vi.fn((current: Element, next: Element) => current.replaceWith(next));
    const detail: {
      newBody: Element;
      render: (current: Element, next: Element) => void | Promise<void>;
    } = { newBody: incoming, render: hostRender };
    dispatch(owner.document.body, "turbo:before-render", detail);
    const completion = detail.render(owner.document.body, incoming);
    if (mode === "direct") {
      await Promise.resolve();
      disposal.start();
    }
    await completion;
    await flush();
    expect(disposal.result.error).toBeUndefined();
    expect(disposal.result.settled).toBe(true);
    expect(disposal.result.report).toEqual({
      schema: "jqstar-turbo-bridge-disposal/1",
      attempted: 1,
      remaining: 0,
    });
    await bridge.whenIdle();
    expect(bridge.observations().filter((record) => record.phase === "committed")).toHaveLength(1);
    expect(hostRender).toHaveBeenCalledOnce();
    expect(Turbo.start).not.toHaveBeenCalled();
    expect(Turbo.visit).not.toHaveBeenCalled();
    expect(errors).toEqual([]);
    await star.whenEnhanced();
  });

  it.each(["resolve", "reject"])(
    "releases Turbo before a delayed host renderer can %s",
    async (outcome) => {
      const { owner, star, errors, dispatch, flush } = fixture();
      const bridge = star.use(
        createTurboBridge({
          $,
          Turbo: { cache: {}, session: {}, start() {}, visit() {} },
          version: "8.0.21",
          onError: (e) => errors.push(e),
        }),
      );
      let resolveHost: (() => void) | undefined;
      let rejectHost: ((error: Error) => void) | undefined;
      const pendingHost = new Promise<void>((resolve, reject) => {
        resolveHost = resolve;
        rejectHost = reject;
      });
      const incoming = owner.document.createElement("body");
      const detail: {
        newBody: Element;
        render: (current: Element, next: Element) => void | Promise<void>;
      } = { newBody: incoming, render: () => pendingHost };
      dispatch(owner.document.body, "turbo:before-render", detail);
      const completion = Promise.resolve(detail.render(owner.document.body, incoming));
      const disposal = trackDisposal(() => bridge.dispose());
      disposal.start();
      await flush();
      expect(disposal.result.error).toBeUndefined();
      expect(disposal.result.settled).toBe(true);
      expect(disposal.result.report).toEqual({
        schema: "jqstar-turbo-bridge-disposal/1",
        attempted: 1,
        remaining: 0,
      });
      await bridge.whenIdle();
      if (!resolveHost || !rejectHost) throw new Error("Missing host completion controls.");
      if (outcome === "resolve") {
        resolveHost();
        await completion;
      } else {
        const error = new Error("Host renderer failed.");
        rejectHost(error);
        await expect(completion).rejects.toBe(error);
      }
      expect(bridge.observations().filter((record) => record.phase === "failed")).toHaveLength(1);
      expect(errors).toEqual([]);
    },
  );
});

import $ from "jquery";
import { afterEach, describe, expect, it } from "vitest";
import {
  abortFixture,
  assertStarDOMRealm,
  createResponseController,
  delayFixture,
  responseFixture,
  STAR_DOM_GLOBALS,
  StarResponseError,
  withStarDOMRealm,
  type StarDOMWindow,
} from "../src/testing";

const frames: HTMLIFrameElement[] = [];

function thrownValue(value: unknown): never {
  const iterator = (function* () {
    yield undefined;
  })();
  iterator.next();
  return iterator.throw(value) as never;
}

function realm(): StarDOMWindow {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  return frame.contentWindow as StarDOMWindow;
}

afterEach(() => {
  for (const frame of frames.splice(0).reverse()) frame.remove();
});

describe("testing DOM realms", () => {
  it("validates one explicit realm and rejects cross-realm documents", () => {
    const first = realm();
    const second = realm();

    expect(assertStarDOMRealm({ window: first, jQuery: $ })).toBe(first.document);
    expect(() =>
      assertStarDOMRealm({ window: first, document: second.document, jQuery: $ }),
    ).toThrow("same realm");
    expect(STAR_DOM_GLOBALS).toContain("MutationObserver");
    expect(Object.isFrozen(STAR_DOM_GLOBALS)).toBe(true);
  });

  it("leases, restores, and excludes a concurrent ambient realm", async () => {
    const owner = realm();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    await withStarDOMRealm({ window: owner, jQuery: $ }, async () => {
      expect(globalThis.document).toBe(owner.document);
      await expect(
        withStarDOMRealm({ window: realm(), jQuery: $ }, () => undefined),
      ).rejects.toThrow("already active");
    });
    expect(Object.getOwnPropertyDescriptor(globalThis, "document")).toEqual(descriptor);
  });

  it("restores descriptors when the realm callback rejects", async () => {
    const owner = realm();
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, "Event");
    await expect(
      withStarDOMRealm({ window: owner }, () => {
        throw new Error("realm body failed");
      }),
    ).rejects.toThrow("realm body failed");
    expect(Object.getOwnPropertyDescriptor(globalThis, "Event")).toEqual(descriptor);
  });

  it("rejects invalid realm options and incompatible jQuery instances", () => {
    expect(() => assertStarDOMRealm(null as never)).toThrow("options");
    const owner = realm();
    const throwingJQuery = (() => {
      throw new Error("selection failed");
    }) as unknown as JQueryStatic;
    expect(() => assertStarDOMRealm({ window: owner, jQuery: throwingJQuery })).toThrow(
      "cannot select",
    );
    const foreignJQuery = (() => ({ get: () => owner.document.body })) as unknown as JQueryStatic;
    expect(() => assertStarDOMRealm({ window: owner, jQuery: foreignJQuery })).toThrow(
      "does not operate",
    );
  });

  it("restores absent globals and aggregates callback and restoration failures", async () => {
    const owner = realm();
    const selfDescriptor = Object.getOwnPropertyDescriptor(globalThis, "self");
    Reflect.deleteProperty(globalThis, "self");
    await withStarDOMRealm({ window: owner }, () => {
      expect(globalThis.getComputedStyle(owner.document.body).display).toBe("block");
    });
    expect(Object.prototype.hasOwnProperty.call(globalThis, "self")).toBe(false);

    const originalDelete = Reflect.deleteProperty;
    try {
      await expect(
        withStarDOMRealm({ window: owner }, () => {
          Reflect.deleteProperty = (target, key) => {
            if (target === globalThis && key === "self") {
              throw new Error("self restoration failed");
            }
            return originalDelete(target, key);
          };
          return thrownValue("realm body thrown value");
        }),
      ).rejects.toMatchObject({
        name: "AggregateError",
        errors: [
          expect.objectContaining({ message: expect.stringContaining("non-Error value") }),
          expect.objectContaining({ message: "self restoration failed" }),
        ],
      });
    } finally {
      Reflect.deleteProperty = originalDelete;
      if (selfDescriptor) Object.defineProperty(globalThis, "self", selfDescriptor);
      else originalDelete(globalThis, "self");
    }
  });
});

describe("queued response controller", () => {
  it("captures exact requests and supplies JSON, HTML, empty, HTTP, network, delay, and retry cases", async () => {
    const owner = realm();
    const controller = createResponseController({ window: owner });
    const original = Object.getOwnPropertyDescriptor(globalThis, "fetch");
    const restore = controller.install();
    controller
      .json(
        {
          url: "https://example.test/json",
          method: "POST",
          headers: { "x-test": "one" },
          body: '{"ready":true}',
        },
        { ok: true },
      )
      .html({ url: "https://example.test/html" }, "<p>ready</p>")
      .empty({ url: "https://example.test/empty" })
      .httpError({ url: "https://example.test/http" }, 503, "later")
      .networkError({ url: "https://example.test/network" }, "offline")
      .delay({ url: "https://example.test/delay" }, 1, responseFixture({ body: "settled" }))
      .retry({ url: "https://example.test/retry" }, [
        responseFixture({ status: 503 }),
        responseFixture({ body: "retried" }),
      ]);

    expect(
      await (
        await fetch("https://example.test/json", {
          method: "POST",
          headers: { "x-test": "one" },
          body: JSON.stringify({ ready: true }),
        })
      ).json(),
    ).toEqual({ ok: true });
    expect(await (await fetch("https://example.test/html")).text()).toBe("<p>ready</p>");
    expect((await fetch("https://example.test/empty")).status).toBe(204);
    expect((await fetch("https://example.test/http")).status).toBe(503);
    await expect(fetch("https://example.test/network")).rejects.toThrow("offline");
    expect(await (await fetch("https://example.test/delay")).text()).toBe("settled");
    expect((await fetch("https://example.test/retry")).status).toBe(503);
    expect(await (await fetch("https://example.test/retry")).text()).toBe("retried");
    controller.assertSatisfied();
    expect(controller.requests()[0]).toMatchObject({
      body: '{"ready":true}',
      method: "POST",
      url: "https://example.test/json",
    });
    expect(controller.requests()[0]?.headers).toContainEqual(["x-test", "one"]);
    restore();
    expect(Object.getOwnPropertyDescriptor(globalThis, "fetch")).toEqual(original);
    controller.dispose();
  });

  it("rejects unexpected, mismatched, leftover, and aborted requests", async () => {
    const controller = createResponseController();
    controller.install();
    await expect(fetch("https://example.test/unexpected")).rejects.toBeInstanceOf(
      StarResponseError,
    );
    controller.enqueue({
      url: "https://example.test/expected",
      response: responseFixture({}),
    });
    await expect(fetch("https://example.test/wrong")).rejects.toThrow("Queued request mismatch");
    controller.enqueue({
      url: "https://example.test/abort",
      response: abortFixture(),
    });
    const abort = new AbortController();
    const pending = fetch("https://example.test/abort", { signal: abort.signal });
    abort.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.enqueue({
      url: "https://example.test/leftover",
      response: delayFixture(1, responseFixture({})),
    });
    expect(() => controller.assertSatisfied()).toThrow("1 queued response expectation remains");
    expect(() => controller.dispose()).toThrow("response cleanup failed");
    expect(() => controller.enqueue(null as never)).toThrow("disposed");
  });

  it("captures Request, URLSearchParams, Blob, and other body inputs", async () => {
    const controller = createResponseController();
    const target = {} as { fetch?: typeof fetch };
    controller.install(target);
    controller
      .enqueue({
        url: /request$/,
        method: "POST",
        body: /from-request/,
        headers: { "x-init": "override" },
        response: responseFixture({ body: "request" }),
      })
      .enqueue({
        url: /params$/,
        method: "POST",
        body: /ready=true/,
        response: responseFixture({ body: "params" }),
      })
      .enqueue({
        url: /blob$/,
        method: "POST",
        body: "blob-body",
        response: responseFixture({ body: "blob" }),
      })
      .enqueue({
        url: /buffer$/,
        method: "POST",
        body: "[object ArrayBuffer]",
        response: responseFixture({ body: "buffer" }),
      });

    const request = new Request("https://example.test/request", {
      method: "POST",
      headers: { "x-init": "source" },
      body: "from-request",
    });
    expect(await (await target.fetch!(request, { headers: { "x-init": "override" } })).text()).toBe(
      "request",
    );
    expect(
      await (
        await target.fetch!("https://example.test/params", {
          method: "POST",
          body: new URLSearchParams({ ready: "true" }),
        })
      ).text(),
    ).toBe("params");
    const blob = new Blob(["blob-body"]);
    Object.defineProperty(blob, "text", { value: async () => "blob-body" });
    expect(
      await (
        await target.fetch!("https://example.test/blob", {
          method: "POST",
          body: blob,
        })
      ).text(),
    ).toBe("blob");
    expect(
      await (
        await target.fetch!("https://example.test/buffer", {
          method: "POST",
          body: new ArrayBuffer(1),
        })
      ).text(),
    ).toBe("buffer");
    expect(controller.remaining()).toBe(0);
    controller.dispose();
  });

  it("validates queue helpers, matching, installation, and pre-aborted requests", async () => {
    expect(() => delayFixture(-1, responseFixture({}))).toThrow("between");
    const controller = createResponseController();
    expect(() => controller.enqueue(null as never)).toThrow("expectation");
    expect(() => controller.httpError({ url: "https://example.test" }, 399)).toThrow("status");
    expect(() => controller.retry({ url: "https://example.test" }, [responseFixture({})])).toThrow(
      "at least two",
    );
    const restore = controller.install();
    expect(() => controller.install()).toThrow("already owns");

    controller.enqueue({
      url: "https://example.test/header",
      headers: { "x-required": "yes" },
      response: responseFixture({}),
    });
    await expect(fetch("https://example.test/header")).rejects.toThrow("header");

    controller.abort({ url: "https://example.test/pre-aborted" });
    const abort = new AbortController();
    abort.abort();
    await expect(
      fetch("https://example.test/pre-aborted", { signal: abort.signal }),
    ).rejects.toMatchObject({ name: "AbortError" });
    restore();
    restore();
    controller.dispose();
  });

  it("cancels delayed responses and aggregates isolated cleanup failures", async () => {
    const controller = createResponseController();
    const target = {} as { fetch?: typeof fetch };
    controller.install(target);
    controller.delay({ url: "https://example.test/delayed-abort" }, 1_000, responseFixture({}));
    const abort = new AbortController();
    const pending = target.fetch!("https://example.test/delayed-abort", {
      signal: abort.signal,
    });
    abort.abort();
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    controller.dispose();

    const timerWindow = {
      setTimeout: globalThis.setTimeout.bind(globalThis),
      clearTimeout() {
        throw new Error("timer cancellation failed");
      },
    } as unknown as StarDOMWindow;
    const cancellationFailure = createResponseController({ window: timerWindow });
    const timerTarget = {} as { fetch?: typeof fetch };
    cancellationFailure.install(timerTarget);
    cancellationFailure.delay(
      { url: "https://example.test/cancel-failure" },
      1,
      responseFixture({ body: "late" }),
    );
    const late = timerTarget.fetch!("https://example.test/cancel-failure");
    await Promise.resolve();
    expect(() => cancellationFailure.dispose()).toThrow("response cleanup failed");
    expect(await (await late).text()).toBe("late");

    const restorationFailure = createResponseController();
    const originalFetch = () => Promise.resolve(new Response());
    const ownedTarget = {} as { fetch: typeof fetch };
    Object.defineProperty(ownedTarget, "fetch", {
      configurable: true,
      value: originalFetch,
      writable: true,
    });
    restorationFailure.install(ownedTarget);
    Object.defineProperty(ownedTarget, "fetch", {
      configurable: false,
      value: ownedTarget.fetch,
      writable: true,
    });
    expect(() => restorationFailure.dispose()).toThrow("response cleanup failed");
  });

  it("detaches a pending response factory during disposal", async () => {
    const controller = createResponseController();
    const target = {} as { fetch?: typeof fetch };
    controller.install(target);
    let release!: (response: Response) => void;
    controller.enqueue({
      url: "https://example.test/factory",
      response: responseFixture(
        () =>
          new Promise<Response>((resolve) => {
            release = resolve;
          }),
      ),
    });
    const pending = target.fetch!("https://example.test/factory");
    await Promise.resolve();
    expect(controller.outstanding()).toHaveLength(1);
    controller.dispose();
    release(new Response("complete"));
    expect(await (await pending).text()).toBe("complete");
  });
});

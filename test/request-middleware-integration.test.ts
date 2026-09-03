import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeclarativeApplication } from "../src/declarative";
import { createBackendAction } from "../src/fetch";
import { STAR_PLUGIN_API_VERSION, type StarPlugin } from "../src/plugin";
import {
  StarRequestMiddlewareNextError,
  type StarRequestMiddlewareNext,
} from "../src/request-middleware";
import type { StarOperationObservation } from "../src/observation";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

const frames: HTMLIFrameElement[] = [];

function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow!;
  owner.document.body.innerHTML = "<main></main>";
  frames.push(frame);
  return owner;
}

function response(status: number): Response {
  return new Response(null, { status });
}

afterEach(() => {
  for (const frame of frames.splice(0)) frame.remove();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("request middleware integration", () => {
  it("runs once across retries, preserves operation identity, and aborts on application cleanup", async () => {
    const owner = realm();
    const kernel = new Kernel($, owner.document);
    const calls: string[] = [];
    const middlewareError = new Error("middleware rejected the request");
    let slowSignal: AbortSignal | undefined;
    let lateNext: StarRequestMiddlewareNext | undefined;
    const plugin: StarPlugin = {
      name: "acme.requests",
      version: "1.0.0",
      apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
      install(registrar) {
        registrar.requestMiddleware({
          id: "policy",
          async handle(request, next, context) {
            calls.push(request.url);
            const path = new URL(request.url).pathname;
            if (path === "/short") return context.complete();
            if (path === "/cancel") return context.cancel();
            if (path === "/reject") throw middlewareError;
            if (path === "/slow") {
              slowSignal = context.signal;
              lateNext = next;
              return new Promise(() => undefined);
            }
            return next({
              ...request,
              url: "https://example.test/changed?from=middleware",
              headers: [...request.headers, ["X-Correlation-ID", request.operationId]],
            });
          },
        });
        return {};
      },
    };
    kernel.plugins.use(plugin);
    const observations: StarOperationObservation[] = [];
    kernel.observeOperations((observation) => {
      observations.push(observation);
    });
    const root = owner.document.querySelector("main")!;
    const application = new DeclarativeApplication($, root, kernel.applicationCapabilities);
    kernel.trackApplication(application, application);
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(response(500))
      .mockResolvedValueOnce(response(204));
    vi.stubGlobal("fetch", fetchMock);

    await application.run(
      createBackendAction("POST", "https://example.test/original", {
        payload: { saved: true },
        retry: "error",
        retryMaxCount: 1,
        retryInterval: 0,
      }),
    );

    expect(calls).toEqual(["https://example.test/original"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    for (const [requestURL, init] of fetchMock.mock.calls as Array<[URL, RequestInit]>) {
      expect(requestURL.href).toBe("https://example.test/changed?from=middleware");
      expect(new Headers(init.headers).get("X-Correlation-ID")).toMatch(/^operation-/);
      expect(init.body).toBe('{"saved":true}');
    }
    const firstRequest = observations.filter(({ kind }) => kind === "request");
    expect(firstRequest.map(({ phase }) => phase)).toEqual(["started", "retrying", "completed"]);
    expect(new Set(firstRequest.map(({ id }) => id)).size).toBe(1);
    expect(
      firstRequest.every((record) => record.kind !== "request" || Boolean(record.parentId)),
    ).toBe(true);

    application.destroy();
    const slowRoot = owner.document.createElement("section");
    owner.document.body.append(slowRoot);
    const slowApplication = new DeclarativeApplication(
      $,
      slowRoot,
      kernel.applicationCapabilities,
      { pending: false, requestError: null },
    );
    kernel.trackApplication(slowApplication, slowApplication);

    await expect(
      slowApplication.run(createBackendAction("GET", "https://example.test/short")),
    ).resolves.toBeUndefined();
    await expect(
      slowApplication.run(createBackendAction("GET", "https://example.test/cancel")),
    ).resolves.toBeUndefined();
    await expect(
      slowApplication.run(
        createBackendAction("GET", "https://example.test/reject", {
          pending: "pending",
          error: "requestError",
        }),
      ),
    ).rejects.toBe(middlewareError);
    expect(slowApplication.state).toMatchObject({
      pending: false,
      requestError: middlewareError.message,
    });
    expect(
      observations
        .filter((record) => record.kind === "request" && record.request.path === "/short")
        .map(({ phase }) => phase),
    ).toEqual(["started", "completed"]);
    expect(
      observations
        .filter((record) => record.kind === "request" && record.request.path === "/cancel")
        .map(({ phase }) => phase),
    ).toEqual(["started", "cancelled"]);
    expect(
      observations
        .filter((record) => record.kind === "request" && record.request.path === "/reject")
        .map(({ phase }) => phase),
    ).toEqual(["started", "failed"]);
    expect(fetchMock).toHaveBeenCalledTimes(2);

    const pending = slowApplication.run(
      createBackendAction("GET", "https://example.test/slow", { openWhenHidden: true }),
    );
    await vi.waitFor(() => expect(slowSignal).toBeDefined());

    slowApplication.destroy();

    await expect(pending).resolves.toBeUndefined();
    expect(slowSignal?.aborted).toBe(true);
    expect(slowSignal?.reason).toBe("cleanup");
    expect(() => lateNext!()).toThrow(StarRequestMiddlewareNextError);
    expect(fetchMock).toHaveBeenCalledTimes(2);
    const slowRecords = observations.filter(
      (record) => record.kind === "request" && record.request.path === "/slow",
    );
    expect(slowRecords.map(({ phase }) => phase)).toEqual(["started", "cancelled"]);
    expect(slowRecords[1]).toMatchObject({ phase: "cancelled", reason: "cleanup" });
    expect(kernel.applicationCount()).toBe(0);

    kernel.dispose();
    expect(() => kernel.requestMiddleware.snapshot()).toThrow("registry has been disposed");
  });
});

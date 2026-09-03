import $ from "jquery";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DeclarativeApplication } from "../src/declarative";
import { datastarPlugin } from "../src/datastar";
import { createBackendAction } from "../src/fetch";
import type { StarOperationObservation } from "../src/observation";
import { STAR_PLUGIN_API_VERSION, type StarPlugin } from "../src/plugin";
import { StarProtocolSelectionError, type StarProtocolProfileDefinition } from "../src/protocol";
import type { StarRequestDescriptor } from "../src/request-middleware";
import type { FetchLifecycleDetail, SSEMessage } from "../src/types";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

interface Harness {
  readonly application: DeclarativeApplication<Record<string, unknown>>;
  readonly frame: HTMLIFrameElement;
  readonly kernel: Kernel;
  readonly root: HTMLElement;
}

const harnesses: Harness[] = [];

function boot(
  state: Record<string, unknown>,
  markup = "",
  configure: (kernel: Kernel) => void = () => undefined,
): Harness {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow!;
  const root = owner.document.createElement("main");
  root.innerHTML = markup;
  owner.document.body.replaceChildren(root);
  const kernel = new Kernel($, owner.document);
  kernel.plugins.use(datastarPlugin);
  kernel.setDefaultProtocolProfile("core.datastar");
  configure(kernel);
  const application = new DeclarativeApplication<Record<string, unknown>>(
    $,
    root,
    kernel.applicationCapabilities,
    state,
  );
  kernel.trackApplication(application, application);
  const harness = { application, frame, kernel, root };
  harnesses.push(harness);
  return harness;
}

function lifecycle(root: Element, name: "datastar-fetch" | "jquery-star:fetch") {
  const records: FetchLifecycleDetail[] = [];
  $(root).on(name, (event) => {
    records.push((event as unknown as { detail: FetchLifecycleDetail }).detail);
  });
  return records;
}

function streamFromBytes(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

afterEach(() => {
  for (const { kernel, frame } of harnesses.splice(0).reverse()) {
    kernel.dispose();
    frame.remove();
  }
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("protocol profile integration", () => {
  it("keeps generic requests and responses free of Datastar behavior", async () => {
    const { application, root } = boot(
      { count: 1, privateValue: "do-not-send" },
      '<section id="generic-target">Old</section><section id="server-target">Server</section>',
    );
    const datastarEvents = lifecycle(root, "datastar-fetch");
    const jqueryEvents = lifecycle(root, "jquery-star:fetch");
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('{"count":7}', {
          headers: {
            "Content-Type": "application/problem+json",
            "Datastar-Only-If-Missing": "true",
          },
        }),
      )
      .mockResolvedValueOnce(
        new Response('<strong class="generic-result">Saved</strong>', {
          headers: {
            "Content-Type": "text/html",
            "Datastar-Selector": "#server-target",
            "Datastar-Mode": "outer",
          },
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    await application.run(
      createBackendAction("GET", "https://example.test/items", {
        profile: "core.generic",
        params: { q: "jquery" },
        headers: {
          Accept: "text/event-stream, application/json",
          "Datastar-Request": "true",
        },
      }),
    );
    await application.run(
      createBackendAction("POST", "https://example.test/items", {
        profile: "core.generic",
        payload: { saved: true },
        target: "#generic-target",
        mode: "inner",
      }),
    );

    const [[getURL, getInit], [postURL, postInit]] = fetchMock.mock.calls as unknown as [
      [URL, RequestInit],
      [URL, RequestInit],
    ];
    const getHeaders = new Headers(getInit.headers);
    expect(getURL.searchParams.get("q")).toBe("jquery");
    expect(getURL.searchParams.has("datastar")).toBe(false);
    expect(getURL.searchParams.has("payload")).toBe(false);
    expect(getHeaders.get("Datastar-Request")).toBeNull();
    expect(getHeaders.get("Accept")).toBe("application/json");
    expect(getInit.body).toBeUndefined();
    expect(application.state.count).toBe(7);

    expect(postURL.searchParams.has("datastar")).toBe(false);
    expect(postInit.body).toBe('{"saved":true}');
    expect(new Headers(postInit.headers).get("Datastar-Request")).toBeNull();
    expect(root.querySelector("#generic-target .generic-result")?.textContent).toBe("Saved");
    expect(root.querySelector("#server-target")?.textContent).toBe("Server");
    expect(datastarEvents).toEqual([]);
    expect(jqueryEvents.filter(({ type }) => type === "finished")).toHaveLength(2);
  });

  it("rejects SSE and unknown profiles before they can leak generic or network behavior", async () => {
    const { application, root } = boot({ count: 0 });
    const datastarEvents = lifecycle(root, "datastar-fetch");
    const jqueryEvents = lifecycle(root, "jquery-star:fetch");
    const fetchMock = vi.fn(async () =>
      Promise.resolve(
        new Response("event: datastar-patch-signals\ndata: signals {count: 9}\n\n", {
          headers: { "Content-Type": "text/event-stream" },
        }),
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      application.run(
        createBackendAction("GET", "https://example.test/events", {
          profile: "core.generic",
          retry: "never",
        }),
      ),
    ).rejects.toBeInstanceOf(StarProtocolSelectionError);
    expect(application.state.count).toBe(0);
    expect(datastarEvents).toEqual([]);
    expect(jqueryEvents.map(({ type }) => type)).toEqual(["started", "retries-failed", "error"]);

    await expect(
      application.run(
        createBackendAction("GET", "https://example.test/missing", {
          profile: "acme.missing.profile",
        }),
      ),
    ).rejects.toThrow("Unknown protocol profile");
    expect(fetchMock).toHaveBeenCalledOnce();
  });

  it("records request-preparation failure before fetch and writes the configured error signal", async () => {
    const observations: StarOperationObservation[] = [];
    const { application } = boot({ requestError: null }, "", (current) => {
      current.observeOperations((observation) => {
        observations.push(observation);
      });
    });
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(
      application.run(
        createBackendAction("POST", "https://example.test/prepare", {
          profile: "core.generic",
          payload: () => undefined,
          error: "requestError",
        }),
      ),
    ).rejects.toThrow("JSON bodies must already be serialized");

    expect(fetchMock).not.toHaveBeenCalled();
    expect(application.state.requestError).toContain("JSON bodies must already be serialized");
    const requestRecords = observations.filter(({ kind }) => kind === "request");
    expect(requestRecords.map(({ phase }) => phase)).toEqual(["started", "failed"]);
    expect(requestRecords[1]).toMatchObject({
      request: { attempt: 0 },
      error: { name: "StarProtocolValidationError" },
    });
  });

  it("keeps Datastar streaming incremental across UTF-8, CRLF, field, and chunk boundaries", async () => {
    const { application, root } = boot({ count: 0, label: "old" }, '<section id="feed"></section>');
    const datastarEvents = lifecycle(root, "datastar-fetch");
    const jqueryEvents = lifecycle(root, "jquery-star:fetch");
    const messages: SSEMessage[] = [];
    $(root).on("jquery-star:sse", (event) => {
      messages.push((event as unknown as { detail: SSEMessage }).detail);
    });
    const source = [
      ": heartbeat\r\n",
      "event: datastar-patch-signals\r\n",
      "id: patch-1\r\n",
      "retry: 1500\r\n",
      'data: signals {count: 5, label: "café 🚀"}\r\n\r\n',
      "event: application-notice\n",
      "id: event-2\n",
      "data: first\n",
      "data: second\n\n",
      "event: datastar-patch-elements\n",
      "data: selector #feed\n",
      "data: mode append\n",
      'data: elements <button class="streamed">Again</button>\n\n',
    ].join("");
    const encoded = new TextEncoder().encode(source);
    const rocket = new TextEncoder().encode("🚀");
    const rocketStart = encoded.findIndex((value, index) =>
      rocket.every((candidate, offset) => encoded[index + offset] === candidate),
    );
    expect(rocketStart).toBeGreaterThan(0);
    const cuts = [7, 39, rocketStart + 1, rocketStart + 3, 118, encoded.length - 5]
      .filter(
        (cut, index, values) => cut > 0 && cut < encoded.length && values.indexOf(cut) === index,
      )
      .sort((left, right) => left - right);
    const chunks = [0, ...cuts].map((start, index, starts) =>
      encoded.slice(start, starts[index + 1] ?? encoded.length),
    );
    const fetchMock = vi.fn(
      async () =>
        new Response(streamFromBytes(chunks), {
          headers: { "Content-Type": "text/event-stream" },
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await application.run(
      createBackendAction("GET", "https://example.test/stream", {
        profile: "core.datastar",
        retry: "never",
      }),
    );

    expect(application.state).toMatchObject({ count: 5, label: "café 🚀" });
    expect(root.querySelector("#feed .streamed")?.textContent).toBe("Again");
    expect(messages).toEqual([
      { event: "application-notice", data: "first\nsecond", id: "event-2" },
    ]);
    expect(datastarEvents.some(({ type }) => type === "progress")).toBe(true);
    expect(jqueryEvents.map(({ type }) => type)).toEqual(datastarEvents.map(({ type }) => type));
    const [requestURL, requestInit] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(requestURL.searchParams.get("datastar")).toContain('"count":0');
    expect(new Headers(requestInit.headers).get("Datastar-Request")).toBe("true");
  });

  it("keeps an earlier stream patch when a later Datastar event is malformed", async () => {
    const observations: StarOperationObservation[] = [];
    const { application, kernel } = boot({ count: 0 }, "", (current) => {
      current.observeOperations((observation) => {
        observations.push(observation);
      });
    });
    const encoder = new TextEncoder();
    const stream = streamFromBytes([
      encoder.encode("event: datastar-patch-signals\ndata: signals {count: 4}\n\n"),
      encoder.encode("event: datastar-patch-signals\ndata: onlyIfMissing true\n\n"),
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream, { headers: { "Content-Type": "text/event-stream" } })),
    );

    await expect(
      application.run(
        createBackendAction("GET", "https://example.test/malformed", {
          retry: "never",
        }),
      ),
    ).rejects.toThrow("did not include signals");

    expect(application.state.count).toBe(4);
    const requestRecords = observations.filter(({ kind }) => kind === "request");
    expect(requestRecords.filter(({ phase }) => phase === "failed")).toHaveLength(1);
    expect(requestRecords.filter(({ phase }) => phase === "completed")).toHaveLength(0);
    expect(kernel.protocols.activeBodyCount()).toBe(0);
  });

  it("cancels one live body on application cleanup and applies no late patch", async () => {
    const observations: StarOperationObservation[] = [];
    const { application, kernel } = boot({ count: 0 }, "", (current) => {
      current.observeOperations((observation) => {
        observations.push(observation);
      });
    });
    let cancellations = 0;
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(
          new TextEncoder().encode("event: datastar-patch-signals\ndata: signals {count: 1}\n\n"),
        );
      },
      cancel() {
        cancellations += 1;
      },
    });
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(stream, { headers: { "Content-Type": "text/event-stream" } })),
    );

    const pending = application.run(
      createBackendAction("GET", "https://example.test/live", { retry: "never" }),
    );
    await vi.waitFor(() => {
      expect(application.state.count).toBe(1);
      expect(kernel.protocols.activeBodyCount()).toBe(1);
    });

    application.destroy();

    await expect(pending).resolves.toBeUndefined();
    await Promise.resolve();
    expect(application.state.count).toBe(1);
    expect(cancellations).toBe(1);
    expect(kernel.protocols.activeBodyCount()).toBe(0);
    const terminals = observations.filter(
      (record) =>
        record.kind === "request" && ["cancelled", "completed", "failed"].includes(record.phase),
    );
    expect(terminals).toHaveLength(1);
    expect(terminals[0]).toMatchObject({ phase: "cancelled", reason: "cleanup" });
  });

  it("dispatches an installed plugin profile through the same descriptor and operation", async () => {
    const descriptors: StarRequestDescriptor[] = [];
    const observations: StarOperationObservation[] = [];
    const externalProfile: StarProtocolProfileDefinition = {
      id: "acme.transport.text",
      compatibilityEvents: ["jquery-star:fetch"],
      prepareRequest(input, writer) {
        writer.query("transport", "text");
        writer.setHeader("X-Protocol-Operation", input.operationId);
        writer.none();
      },
      adapters: [
        {
          id: "text",
          match: { kind: "exact", mediaType: "text/plain" },
          async handle(_response, body, capabilities) {
            capabilities.patchSignals({ message: await body.text() });
          },
        },
      ],
      empty: () => undefined,
    };
    const plugin: StarPlugin = {
      name: "acme.transport",
      version: "1.0.0",
      apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
      install(registrar) {
        registrar.protocolProfile(externalProfile);
        registrar.requestMiddleware({
          id: "observe-profile",
          async handle(request, next) {
            descriptors.push(request);
            return next();
          },
        });
        return {};
      },
    };
    const { application, kernel } = boot({ message: "old" }, "", (current) => {
      current.plugins.use(plugin);
      current.observeOperations((observation) => {
        observations.push(observation);
      });
    });
    const fetchMock = vi.fn(
      async () => new Response("plugin result", { headers: { "Content-Type": "text/plain" } }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await application.run(
      createBackendAction("GET", "https://example.test/plugin", {
        profile: "acme.transport.text",
      }),
    );

    expect(application.state.message).toBe("plugin result");
    expect(descriptors).toHaveLength(1);
    expect(descriptors[0]!.profile).toBe("acme.transport.text");
    const requestStart = observations.find(
      (record) => record.kind === "request" && record.phase === "started",
    );
    expect(descriptors[0]!.operationId).toBe(requestStart?.id);
    const [requestURL, requestInit] = fetchMock.mock.calls[0] as unknown as [URL, RequestInit];
    expect(requestURL.searchParams.get("transport")).toBe("text");
    expect(new Headers(requestInit.headers).get("X-Protocol-Operation")).toBe(
      descriptors[0]!.operationId,
    );
    expect(kernel.protocols.activeBodyCount()).toBe(0);
  });
});

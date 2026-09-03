import { describe, expect, it, vi } from "vitest";
import { datastarProtocolProfile } from "../src/protocol-datastar";
import { genericProtocolProfile } from "../src/protocol-generic";
import {
  executeProtocolResponse,
  prepareProtocolRequest,
  ProtocolProfileRegistry,
  selectProtocolProfile,
  StarProtocolBodyOwnershipError,
  StarProtocolSelectionError,
  type ProtocolRequestSource,
  type StarProtocolProfileDefinition,
  type StarProtocolRequestWriter,
  type StarProtocolResponseCapabilities,
  type StarProtocolResponseMetadata,
} from "../src/protocol";
import type { StarRequestDescriptor } from "../src/request-middleware";
import type { StarInstance } from "../src/types";

function application(root: Element = document.createElement("main")): StarInstance {
  return {
    mode: "behavior",
    root,
    $root: {} as JQuery<Element>,
    state: {},
    computed: {},
    destroyed: false,
    observeOperations: () => () => undefined,
    run: async () => undefined,
    refresh: () => undefined,
    destroy: () => undefined,
  };
}

function adapter(
  id = "text",
  mediaType = "text/plain",
  handle: StarProtocolProfileDefinition["adapters"][number]["handle"] = async (_response, body) => {
    await body.text();
  },
) {
  return {
    id,
    match: { kind: "exact" as const, mediaType },
    handle,
  };
}

function profile(
  id = "acme.protocol.custom",
  changes: Partial<StarProtocolProfileDefinition> = {},
): StarProtocolProfileDefinition {
  return {
    id,
    compatibilityEvents: ["jquery-star:fetch"],
    prepareRequest(_input, writer) {
      writer.none();
    },
    adapters: [adapter()],
    empty: () => undefined,
    ...changes,
  };
}

function source(changes: Partial<ProtocolRequestSource> = {}): ProtocolRequestSource {
  return {
    operationId: "operation-1",
    method: "POST",
    url: "https://example.test/items",
    headers: { "X-Authored": "yes" },
    credentials: "same-origin",
    params: [],
    payload: { explicit: false, json: "null" },
    signalsJSON: '{"count":1}',
    ...changes,
  };
}

function descriptor(profileId = "acme.protocol.custom"): StarRequestDescriptor {
  return Object.freeze({
    schema: "jquery-star-request/1",
    operationId: "operation-1",
    method: "GET",
    url: "https://example.test/items",
    headers: Object.freeze([Object.freeze(["accept", "text/plain"] as const)]),
    credentials: "same-origin",
    body: Object.freeze({ kind: "none" }),
    target: "#target",
    mode: "inner",
    profile: profileId,
  });
}

function bareDescriptor(profileId: string): StarRequestDescriptor {
  return Object.freeze({
    schema: "jquery-star-request/1",
    operationId: "operation-1",
    method: "GET",
    url: "https://example.test/items",
    headers: Object.freeze([]),
    credentials: "same-origin",
    body: Object.freeze({ kind: "none" }),
    profile: profileId,
  });
}

function capabilities(
  request: StarRequestDescriptor = descriptor(),
): StarProtocolResponseCapabilities & {
  readonly elements: Array<readonly [string, unknown]>;
  readonly signals: Array<readonly [Readonly<Record<string, unknown>>, unknown]>;
  readonly messages: unknown[];
} {
  const elements: Array<readonly [string, unknown]> = [];
  const signals: Array<readonly [Readonly<Record<string, unknown>>, unknown]> = [];
  const messages: unknown[] = [];
  return {
    request,
    signal: new AbortController().signal,
    patchElements: (html, options) => elements.push([html, options]),
    patchSignals: (patch, options) => signals.push([patch, options]),
    emitSSE: (message) => messages.push(message),
    elements,
    signals,
    messages,
  };
}

describe("protocol profile registry", () => {
  it("owns the two official profiles and commits external profiles atomically", () => {
    const registry = new ProtocolProfileRegistry([genericProtocolProfile, datastarProtocolProfile]);
    expect(registry.snapshot().map(({ id }) => id)).toEqual(["core.generic", "core.datastar"]);
    expect(registry.select("core.generic").id).toBe("core.generic");

    const prepared = registry.preparePluginInstall([
      { namespace: "acme.protocol", profiles: [profile()] },
    ]);
    expect(() => registry.select("acme.protocol.custom")).toThrow("Unknown protocol profile");
    prepared.commit();
    expect(registry.select("acme.protocol.custom").id).toBe("acme.protocol.custom");
    prepared.cleanups.get("acme.protocol")!();
    prepared.cleanups.get("acme.protocol")!();
    expect(() => registry.select("acme.protocol.custom")).toThrow("Unknown protocol profile");

    const rolledBack = registry.preparePluginInstall([
      { namespace: "acme.other", profiles: [profile("acme.other.custom")] },
    ]);
    rolledBack.rollback();
    rolledBack.commit();
    expect(() => registry.select("acme.other.custom")).toThrow("Unknown protocol profile");
  });

  it.each([
    ["bad namespace", "bad", profile(), "namespace"],
    ["invalid profile ID", "acme.protocol", profile("invalid"), "dot-qualified"],
    ["outside namespace", "acme.protocol", profile("other.protocol.custom"), "must be below"],
    ["reserved ID", "acme.protocol", profile("core.generic"), "must be below"],
    ["missing request", "acme.protocol", { ...profile(), prepareRequest: 1 }, "request preparer"],
    ["missing empty", "acme.protocol", { ...profile(), empty: 1 }, "empty-response"],
    [
      "missing compatibility events",
      "acme.protocol",
      { ...profile(), compatibilityEvents: [] },
      "compatibility events",
    ],
    [
      "duplicate compatibility event",
      "acme.protocol",
      { ...profile(), compatibilityEvents: ["jquery-star:fetch", "jquery-star:fetch"] },
      "duplicate compatibility",
    ],
    [
      "unsupported compatibility event",
      "acme.protocol",
      { ...profile(), compatibilityEvents: ["jquery-star:fetch", "other"] },
      "unsupported compatibility",
    ],
    [
      "missing jquery event",
      "acme.protocol",
      { ...profile(), compatibilityEvents: ["datastar-fetch"] },
      "must retain jquery-star:fetch",
    ],
    ["missing adapters", "acme.protocol", { ...profile(), adapters: [] }, "at least one"],
    [
      "non-object adapter",
      "acme.protocol",
      { ...profile(), adapters: [null] },
      "adapters must be objects",
    ],
    [
      "invalid adapter ID",
      "acme.protocol",
      { ...profile(), adapters: [{ ...adapter(), id: "Bad" }] },
      "lowercase segments",
    ],
    [
      "duplicate adapter ID",
      "acme.protocol",
      { ...profile(), adapters: [adapter(), adapter()] },
      "duplicate adapter ID",
    ],
    [
      "missing adapter handler",
      "acme.protocol",
      { ...profile(), adapters: [{ ...adapter(), handle: 1 }] },
      "needs a handler",
    ],
    [
      "invalid exact matcher",
      "acme.protocol",
      { ...profile(), adapters: [{ ...adapter(), match: { kind: "exact", mediaType: "bad" } }] },
      "type/subtype",
    ],
    [
      "invalid suffix matcher",
      "acme.protocol",
      { ...profile(), adapters: [{ ...adapter(), match: { kind: "suffix", suffix: "json" } }] },
      "suffix must start",
    ],
    [
      "suffix matcher with media type",
      "acme.protocol",
      {
        ...profile(),
        adapters: [
          {
            ...adapter(),
            match: { kind: "suffix", suffix: "+json", mediaType: "application/json" },
          },
        ],
      },
      "cannot have a media type",
    ],
    [
      "unknown matcher kind",
      "acme.protocol",
      { ...profile(), adapters: [{ ...adapter(), match: { kind: "wildcard" } }] },
      "exact or suffix matcher",
    ],
    [
      "overlapping matcher",
      "acme.protocol",
      {
        ...profile(),
        adapters: [
          adapter("problem", "application/problem+json"),
          { ...adapter("suffix"), match: { kind: "suffix", suffix: "+json" } },
        ],
      },
      "overlap",
    ],
    [
      "reversed overlapping matcher",
      "acme.protocol",
      {
        ...profile(),
        adapters: [
          { ...adapter("suffix"), match: { kind: "suffix", suffix: "+json" } },
          adapter("problem", "application/problem+json"),
        ],
      },
      "overlap",
    ],
  ])("rejects %s before commit", (_label, namespace, value, message) => {
    const registry = new ProtocolProfileRegistry([genericProtocolProfile, datastarProtocolProfile]);
    expect(() =>
      registry.preparePluginInstall([
        { namespace, profiles: [value as StarProtocolProfileDefinition] },
      ]),
    ).toThrow(message);
    expect(registry.snapshot()).toHaveLength(2);
  });

  it("rejects duplicate profiles, invalid selection, missing officials, and use after disposal", () => {
    expect(new ProtocolProfileRegistry([genericProtocolProfile]).snapshot()).toEqual([
      expect.objectContaining({ id: "core.generic" }),
    ]);
    expect(() => new ProtocolProfileRegistry([datastarProtocolProfile])).toThrow(
      "Missing official protocol profile core.generic",
    );
    expect(
      () =>
        new ProtocolProfileRegistry([
          genericProtocolProfile,
          datastarProtocolProfile,
          genericProtocolProfile,
        ]),
    ).toThrow("Official protocol profile IDs must be unique");
    expect(
      () => new ProtocolProfileRegistry([profile("core.unknown"), datastarProtocolProfile]),
    ).toThrow("Unknown official protocol profile ID");
    const registry = new ProtocolProfileRegistry([genericProtocolProfile, datastarProtocolProfile]);
    expect(() =>
      registry.preparePluginInstall([
        {
          namespace: "acme.protocol",
          profiles: null as unknown as readonly StarProtocolProfileDefinition[],
        },
      ]),
    ).toThrow("must be an array");
    expect(() =>
      registry.preparePluginInstall([
        {
          namespace: "core.private",
          profiles: [profile("core.private.custom")],
        },
      ]),
    ).toThrow("Invalid protocol profile plugin namespace");
    expect(() =>
      registry.preparePluginInstall([
        {
          namespace: "core.generic",
          official: true,
          profiles: [datastarProtocolProfile],
        },
      ]),
    ).toThrow("must match namespace core.generic");
    expect(() =>
      registry.preparePluginInstall([
        {
          namespace: "acme.duplicates",
          profiles: [profile("acme.duplicates.text"), profile("acme.duplicates.text")],
        },
      ]),
    ).toThrow("Duplicate protocol profile ID");
    const first = registry.preparePluginInstall([
      { namespace: "acme.protocol", profiles: [profile()] },
    ]);
    first.commit();
    expect(() =>
      registry.preparePluginInstall([{ namespace: "acme.protocol", profiles: [profile()] }]),
    ).toThrow("Duplicate protocol profile ID");
    expect(() => registry.select("bad")).toThrow(StarProtocolSelectionError);
    expect(() => registry.select("acme.protocol.missing")).toThrow("Unknown protocol profile");
    registry.dispose();
    registry.dispose();
    expect(() => registry.snapshot()).toThrow("registry has been disposed");
  });

  it("removes tracked applications and active body owners during registry disposal", async () => {
    const registry = new ProtocolProfileRegistry([genericProtocolProfile, datastarProtocolProfile]);
    const current = application();
    registry.trackApplication(current);
    let cancellations = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        cancellations += 1;
      },
    });
    const streaming = profile("acme.protocol.streaming", {
      adapters: [
        adapter("text", "text/plain", async (_metadata, body) => {
          await body.stream(() => undefined);
        }),
      ],
    });
    const pending = executeProtocolResponse(
      current,
      streaming,
      new Response(stream, { headers: { "Content-Type": "text/plain" } }),
      descriptor("acme.protocol.streaming"),
      new AbortController().signal,
      capabilities(descriptor("acme.protocol.streaming")),
      () => undefined,
    );
    await vi.waitFor(() => expect(registry.activeBodyCount()).toBe(1));

    registry.dispose();

    await expect(pending).resolves.toBeUndefined();
    expect(cancellations).toBe(1);
    expect(selectProtocolProfile(current, "core.generic", [genericProtocolProfile])).toBe(
      genericProtocolProfile,
    );
    expect(() => selectProtocolProfile(current, "invalid", [genericProtocolProfile])).toThrow(
      "Invalid protocol profile ID",
    );
  });
});

describe("protocol request preparation", () => {
  it("prepares generic requests without implicit Datastar bytes", () => {
    const implicit = prepareProtocolRequest(
      genericProtocolProfile,
      source({
        method: "GET",
        params: [["q", "jquery"]],
        headers: { Accept: "text/event-stream, application/json", "Datastar-Request": "true" },
      }),
    );
    const url = new URL(implicit.descriptor.url);
    const headers = new Headers(implicit.descriptor.headers as [string, string][]);
    expect(url.searchParams.get("q")).toBe("jquery");
    expect(url.searchParams.has("datastar")).toBe(false);
    expect(url.searchParams.has("payload")).toBe(false);
    expect(headers.get("Datastar-Request")).toBeNull();
    expect(headers.get("Accept")).toBe("application/json");
    expect(implicit.body).toBeUndefined();
    expect(implicit.descriptor.profile).toBe("core.generic");

    const explicit = prepareProtocolRequest(
      genericProtocolProfile,
      source({
        method: "POST",
        payload: { explicit: true, json: '{"saved":true}' },
      }),
    );
    expect(explicit.body).toBe('{"saved":true}');
    expect(new Headers(explicit.descriptor.headers as [string, string][]).get("Content-Type")).toBe(
      "application/json",
    );
  });

  it("preserves Datastar request encoding for every method", () => {
    for (const method of ["GET", "POST", "PUT", "PATCH", "DELETE"] as const) {
      const prepared = prepareProtocolRequest(
        datastarProtocolProfile,
        source({ method, payload: { explicit: true, json: '{"count":2}' } }),
      );
      const url = new URL(prepared.descriptor.url);
      const headers = new Headers(prepared.descriptor.headers as [string, string][]);
      expect(headers.get("Datastar-Request")).toBe("true");
      expect(headers.get("Accept")).toBe("text/event-stream, text/html, application/json");
      expect(url.searchParams.has("datastar")).toBe(method === "GET" || method === "DELETE");
      expect(prepared.body).toBe(method === "GET" ? undefined : '{"count":2}');
    }
  });

  it("keeps request input frozen and closes its writer after one synchronous body choice", () => {
    let retained: StarProtocolRequestWriter | undefined;
    const frozen = profile("acme.protocol.frozen", {
      prepareRequest(input, writer) {
        expect(Object.isFrozen(input)).toBe(true);
        expect(Object.isFrozen(input.headers)).toBe(true);
        expect(Object.isFrozen(input.headers[0])).toBe(true);
        expect(Object.isFrozen(input.payload)).toBe(true);
        retained = writer;
        writer.setHeader("X-Profile", input.operationId);
        writer.none();
      },
    });
    const prepared = prepareProtocolRequest(frozen, source());
    expect(new Headers(prepared.descriptor.headers as [string, string][]).get("X-Profile")).toBe(
      "operation-1",
    );
    expect(() => retained!.query("late", "yes")).toThrow("used its request writer late");

    const duplicate = profile("acme.protocol.duplicate", {
      prepareRequest(_input, writer) {
        writer.none();
        writer.json("{}");
      },
    });
    expect(() => prepareProtocolRequest(duplicate, source())).toThrow("more than one request body");

    const missing = profile("acme.protocol.missing-body", {
      prepareRequest() {},
    });
    expect(() => prepareProtocolRequest(missing, source())).toThrow(
      "did not select a request body",
    );
  });

  it("rejects asynchronous preparation, unsafe headers, unavailable forms, and invalid URLs", () => {
    const asynchronous = profile("acme.protocol.async", {
      prepareRequest: (() =>
        Promise.resolve()) as unknown as StarProtocolProfileDefinition["prepareRequest"],
    });
    expect(() => prepareProtocolRequest(asynchronous, source())).toThrow("must be synchronous");

    const unsafe = profile("acme.protocol.unsafe", {
      prepareRequest(_input, writer) {
        writer.setHeader("Cookie", "private");
        writer.none();
      },
    });
    expect(() => prepareProtocolRequest(unsafe, source())).toThrow("browser-owned header cookie");

    const missingForm = profile("acme.protocol.form", {
      prepareRequest(_input, writer) {
        writer.form();
      },
    });
    expect(() => prepareProtocolRequest(missingForm, source())).toThrow("unavailable form");
    expect(() =>
      prepareProtocolRequest(genericProtocolProfile, source({ url: "https://a:b@example.test" })),
    ).toThrow("cannot contain credentials");
  });

  it.each([
    [
      "query",
      profile("acme.protocol.query", {
        prepareRequest(_input, writer) {
          writer.query(1 as unknown as string, "value");
          writer.none();
        },
      }),
      "query values must be strings",
    ],
    [
      "header value",
      profile("acme.protocol.header-value", {
        prepareRequest(_input, writer) {
          writer.setHeader("X-Test", 1 as unknown as string);
          writer.none();
        },
      }),
      "header values must be strings",
    ],
    [
      "invalid header",
      profile("acme.protocol.invalid-header", {
        prepareRequest(_input, writer) {
          writer.setHeader("bad header", "value");
          writer.none();
        },
      }),
      "set an invalid header",
    ],
    [
      "header name",
      profile("acme.protocol.header-name", {
        prepareRequest(_input, writer) {
          writer.deleteHeader(1 as unknown as string);
          writer.none();
        },
      }),
      "header names must be strings",
    ],
    [
      "JSON body",
      profile("acme.protocol.json-body", {
        prepareRequest(_input, writer) {
          writer.json(1 as unknown as string);
        },
      }),
      "JSON bodies must already be serialized",
    ],
  ])("rejects an invalid %s writer call", (_label, invalid, message) => {
    expect(() => prepareProtocolRequest(invalid, source())).toThrow(message);
  });

  it("encodes URL-encoded and multipart forms without exposing their values to the profile", () => {
    const data = new FormData();
    data.set("title", "jQStar");
    for (const encoding of ["urlencoded", "multipart"] as const) {
      const prepared = prepareProtocolRequest(
        genericProtocolProfile,
        source({ method: "POST", form: { data, encoding } }),
      );
      expect(prepared.descriptor.body.kind).toBe(encoding);
      expect(
        encoding === "multipart"
          ? prepared.body instanceof FormData
          : prepared.body instanceof URLSearchParams,
      ).toBe(true);
    }
  });
});

describe("protocol response selection and body ownership", () => {
  it("selects exact and suffix adapters with frozen metadata and one text claim", async () => {
    const seen: StarProtocolResponseMetadata[] = [];
    const custom = profile("acme.protocol.custom", {
      adapters: [
        {
          id: "json-suffix",
          match: { kind: "suffix", suffix: "+json" },
          async handle(metadata, body) {
            seen.push(metadata);
            expect(await body.text()).toBe('{"ok":true}');
            expect(body.claimed).toBe(true);
            await expect(body.text()).rejects.toBeInstanceOf(StarProtocolBodyOwnershipError);
          },
        },
      ],
    });
    await executeProtocolResponse(
      application(),
      custom,
      new Response('{"ok":true}', {
        headers: { "Content-Type": "application/problem+json; charset=utf-8" },
      }),
      descriptor(),
      new AbortController().signal,
      capabilities(),
      () => undefined,
    );
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({
      schema: "jquery-star-protocol-response/1",
      profile: "acme.protocol.custom",
      mediaType: "application/problem+json",
      status: 200,
    });
    expect(Object.isFrozen(seen[0])).toBe(true);
    expect(Object.isFrozen(seen[0]!.headers)).toBe(true);
  });

  it("streams chunks once, reports progress, and releases registry ownership", async () => {
    const registry = new ProtocolProfileRegistry([genericProtocolProfile, datastarProtocolProfile]);
    const current = application();
    registry.trackApplication(current);
    const chunks = [new Uint8Array([1, 2]), new Uint8Array([3])];
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        for (const chunk of chunks) controller.enqueue(chunk);
        controller.close();
      },
    });
    const received: number[][] = [];
    const progress: number[] = [];
    const custom = profile("acme.protocol.custom", {
      adapters: [
        {
          id: "binary",
          match: { kind: "exact", mediaType: "application/octet-stream" },
          async handle(_metadata, body) {
            await body.stream((chunk) => {
              received.push([...chunk]);
            });
          },
        },
      ],
    });
    await executeProtocolResponse(
      current,
      custom,
      new Response(stream, {
        headers: { "Content-Type": "application/octet-stream", "Content-Length": "3" },
      }),
      descriptor(),
      new AbortController().signal,
      capabilities(),
      (loaded) => progress.push(loaded),
    );
    expect(received).toEqual([[1, 2], [3]]);
    expect(progress).toEqual([2, 3]);
    expect(registry.activeBodyCount()).toBe(0);
    registry.releaseApplication(current);
    registry.dispose();
  });

  it("uses the explicit empty handler without creating a body owner", async () => {
    const empty = vi.fn();
    const custom = profile("acme.protocol.custom", { empty });
    await executeProtocolResponse(
      application(),
      custom,
      new Response(null, { status: 204 }),
      descriptor(),
      new AbortController().signal,
      capabilities(),
      () => undefined,
    );
    expect(empty).toHaveBeenCalledOnce();
    expect(empty.mock.calls[0]![0]).toMatchObject({ status: 204, mediaType: "" });
  });

  it("cancels unsupported and ambiguous response bodies before a handler runs", async () => {
    let unsupportedCancellations = 0;
    const unsupportedStream = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        unsupportedCancellations += 1;
      },
    });
    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        new Response(unsupportedStream, { headers: { "Content-Type": "application/xml" } }),
        descriptor(),
        new AbortController().signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toBeInstanceOf(StarProtocolSelectionError);
    expect(unsupportedCancellations).toBe(1);

    let ambiguousCancellations = 0;
    const ambiguous = profile("acme.protocol.custom", {
      adapters: [
        adapter("problem", "application/problem+json"),
        { ...adapter("suffix"), match: { kind: "suffix", suffix: "+json" } },
      ],
    });
    const ambiguousStream = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        ambiguousCancellations += 1;
      },
    });
    await expect(
      executeProtocolResponse(
        application(),
        ambiguous,
        new Response(ambiguousStream, {
          headers: { "Content-Type": "application/problem+json" },
        }),
        descriptor(),
        new AbortController().signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toThrow("selected multiple");
    expect(ambiguousCancellations).toBe(1);

    const failedCancellation = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        throw new Error("cancel failed");
      },
    });
    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        new Response(failedCancellation, { headers: { "Content-Type": "application/xml" } }),
        descriptor(),
        new AbortController().signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toThrow("has no adapter");
  });

  it("bounds response metadata before selection", async () => {
    const oversized = new Response("value", {
      headers: { "Content-Type": "text/plain", "X-Large": "x".repeat(8_193) },
    });
    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        oversized,
        descriptor(),
        new AbortController().signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toThrow("oversized response metadata");

    const manyHeaders = new Headers({ "Content-Type": "text/plain" });
    for (let index = 0; index < 201; index += 1) manyHeaders.set(`X-Meta-${index}`, "value");
    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        new Response("value", { headers: manyHeaders }),
        descriptor(),
        new AbortController().signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toThrow("too many response headers");

    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        new Response("value", { headers: { "Content-Type": "not a media type" } }),
        descriptor(),
        new AbortController().signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toThrow("invalid response media type");
  });

  it("rejects invalid stream consumers and contains unclaimed-body cancellation failures", async () => {
    const invalidConsumer = profile("acme.protocol.invalid-consumer", {
      adapters: [
        adapter("text", "text/plain", async (_metadata, body) => {
          await body.stream(null as unknown as (chunk: Uint8Array) => void);
        }),
      ],
    });
    await expect(
      executeProtocolResponse(
        application(),
        invalidConsumer,
        new Response("value", { headers: { "Content-Type": "text/plain" } }),
        descriptor("acme.protocol.invalid-consumer"),
        new AbortController().signal,
        capabilities(descriptor("acme.protocol.invalid-consumer")),
        () => undefined,
      ),
    ).rejects.toThrow("needs a chunk consumer");

    const unclaimed = profile("acme.protocol.unclaimed", {
      adapters: [adapter("text", "text/plain", () => undefined)],
    });
    const failedCancellation = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        throw new Error("cancel failed");
      },
    });
    await expect(
      executeProtocolResponse(
        application(),
        unclaimed,
        new Response(failedCancellation, { headers: { "Content-Type": "text/plain" } }),
        descriptor("acme.protocol.unclaimed"),
        new AbortController().signal,
        capabilities(descriptor("acme.protocol.unclaimed")),
        () => undefined,
      ),
    ).resolves.toBeUndefined();
  });

  it("detaches a handler that ignores abort and closes retained capabilities", async () => {
    const registry = new ProtocolProfileRegistry([genericProtocolProfile, datastarProtocolProfile]);
    const current = application();
    registry.trackApplication(current);
    const controller = new AbortController();
    let retained: StarProtocolResponseCapabilities | undefined;
    let started!: () => void;
    const ready = new Promise<void>((resolve) => {
      started = resolve;
    });
    let cancellations = 0;
    const stream = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        cancellations += 1;
      },
    });
    const custom = profile("acme.protocol.custom", {
      adapters: [
        adapter("text", "text/plain", (_metadata, _body, responseCapabilities) => {
          retained = responseCapabilities;
          started();
          return new Promise(() => undefined);
        }),
      ],
    });
    const pending = executeProtocolResponse(
      current,
      custom,
      new Response(stream, { headers: { "Content-Type": "text/plain" } }),
      descriptor(),
      controller.signal,
      capabilities(),
      () => undefined,
    );
    await ready;
    expect(registry.activeBodyCount()).toBe(1);
    controller.abort("cleanup");
    await expect(pending).rejects.toMatchObject({ name: "AbortError" });
    expect(cancellations).toBe(1);
    expect(registry.activeBodyCount()).toBe(0);
    expect(() => retained!.patchSignals({ late: true })).toThrow(
      "used response capabilities after cleanup",
    );
    registry.releaseApplication(current);
    registry.dispose();
  });

  it("rejects profile mismatch and invalid response metadata before consumption", async () => {
    let mismatchCancellations = 0;
    const mismatchedStream = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        mismatchCancellations += 1;
      },
    });
    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        new Response(mismatchedStream, { headers: { "Content-Type": "text/plain" } }),
        descriptor("core.generic"),
        new AbortController().signal,
        capabilities(descriptor("core.generic")),
        () => undefined,
      ),
    ).rejects.toThrow("does not match selected profile");
    expect(mismatchCancellations).toBe(1);

    let abortedCancellations = 0;
    const abortedStream = new ReadableStream<Uint8Array>({
      pull() {},
      cancel() {
        abortedCancellations += 1;
      },
    });
    const aborted = new AbortController();
    aborted.abort("cleanup");
    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        new Response(abortedStream, { headers: { "Content-Type": "text/plain" } }),
        descriptor(),
        aborted.signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toMatchObject({ name: "AbortError" });
    expect(abortedCancellations).toBe(1);

    const invalid = {
      status: 199,
      statusText: "Invalid",
      url: "",
      redirected: false,
      headers: new Headers({ "Content-Type": "text/plain" }),
      body: null,
    } as unknown as Response;
    await expect(
      executeProtocolResponse(
        application(),
        profile(),
        invalid,
        descriptor(),
        new AbortController().signal,
        capabilities(),
        () => undefined,
      ),
    ).rejects.toThrow("invalid status");
  });
});

describe("official protocol response adapters", () => {
  it("rejects non-object JSON in both official profiles and executes generic empty responses", async () => {
    for (const official of [genericProtocolProfile, datastarProtocolProfile]) {
      const request = descriptor(official.id);
      await expect(
        executeProtocolResponse(
          application(),
          official,
          new Response("[]", { headers: { "Content-Type": "application/json" } }),
          request,
          new AbortController().signal,
          capabilities(request),
          () => undefined,
        ),
      ).rejects.toThrow("must contain a signal object");
    }

    const request = descriptor(genericProtocolProfile.id);
    await expect(
      executeProtocolResponse(
        application(),
        genericProtocolProfile,
        new Response(null, { status: 204 }),
        request,
        new AbortController().signal,
        capabilities(request),
        () => undefined,
      ),
    ).resolves.toBeUndefined();
  });

  it("uses Datastar HTML defaults and validates signal event objects", async () => {
    const request = bareDescriptor(datastarProtocolProfile.id);
    const htmlCapabilities = capabilities(request);
    await executeProtocolResponse(
      application(),
      datastarProtocolProfile,
      new Response('<section id="result">Ready</section>', {
        headers: { "Content-Type": "text/html" },
      }),
      request,
      new AbortController().signal,
      htmlCapabilities,
      () => undefined,
    );
    expect(htmlCapabilities.elements).toEqual([
      ['<section id="result">Ready</section>', { useViewTransition: false }],
    ]);

    await expect(
      executeProtocolResponse(
        application(),
        datastarProtocolProfile,
        new Response("event: datastar-patch-signals\ndata: signals 1\n\n", {
          headers: { "Content-Type": "text/event-stream" },
        }),
        request,
        new AbortController().signal,
        capabilities(request),
        () => undefined,
      ),
    ).rejects.toThrow("signal patch must contain an object");
  });

  it("flushes a final unterminated Datastar event", async () => {
    const request = descriptor(datastarProtocolProfile.id);
    const responseCapabilities = capabilities(request);
    await executeProtocolResponse(
      application(),
      datastarProtocolProfile,
      new Response("event: datastar-patch-signals\ndata: signals {finished: true}", {
        headers: { "Content-Type": "text/event-stream" },
      }),
      request,
      new AbortController().signal,
      responseCapabilities,
      () => undefined,
    );
    expect(responseCapabilities.signals).toEqual([[{ finished: true }, { onlyIfMissing: false }]]);
  });
});

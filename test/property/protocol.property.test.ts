import fc from "fast-check";
import { describe, expect, it } from "vitest";

import { datastarProtocolProfile } from "../../src/protocol-datastar";
import { genericProtocolProfile } from "../../src/protocol-generic";
import {
  executeProtocolResponse,
  prepareProtocolRequest,
  ProtocolProfileRegistry,
  StarProtocolBodyOwnershipError,
  StarProtocolValidationError,
  type ProtocolRequestSource,
  type StarProtocolProfileDefinition,
  type StarProtocolResponseCapabilities,
} from "../../src/protocol";
import type { StarRequestDescriptor } from "../../src/request-middleware";
import type { BackendMethod, StarInstance } from "../../src/types";
import { assertAsyncProperty, assertProperty } from "./helpers";

const methods = fc.constantFrom<BackendMethod>("GET", "POST", "PUT", "PATCH", "DELETE");
const parameterName = fc.stringMatching(/^p[a-z]{0,6}$/);
const parameterValue = fc.string({ maxLength: 20 });

function application(): StarInstance {
  const root = document.createElement("main");
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

function source(
  method: BackendMethod,
  params: Readonly<Record<string, string>>,
  explicit: boolean,
  payloadJSON: string,
  signalsJSON: string,
): ProtocolRequestSource {
  return {
    operationId: "operation-generated",
    method,
    url: "https://example.test/items",
    headers: {},
    credentials: "same-origin",
    params: Object.entries(params),
    payload: { explicit, json: payloadJSON },
    signalsJSON,
  };
}

function descriptor(profile: string): StarRequestDescriptor {
  return Object.freeze({
    schema: "jquery-star-request/1",
    operationId: "operation-generated",
    method: "GET",
    url: "https://example.test/items",
    headers: Object.freeze([]),
    credentials: "same-origin",
    body: Object.freeze({ kind: "none" }),
    profile,
  });
}

function capabilities(request: StarRequestDescriptor, patches: Record<string, unknown>[]) {
  return Object.freeze<StarProtocolResponseCapabilities>({
    request,
    signal: new AbortController().signal,
    patchSignals: (patch) => {
      patches.push({ ...patch });
    },
    patchElements: () => undefined,
    emitSSE: () => undefined,
  });
}

function profile(
  adapters: StarProtocolProfileDefinition["adapters"],
): StarProtocolProfileDefinition {
  return {
    id: "acme.protocol.generated",
    compatibilityEvents: ["jquery-star:fetch"],
    prepareRequest(_input, writer) {
      writer.none();
    },
    adapters,
    empty: () => undefined,
  };
}

function chunksBySizes(sourceBytes: Uint8Array, sizes: readonly number[]): Uint8Array[] {
  const chunks: Uint8Array[] = [];
  let offset = 0;
  let index = 0;
  while (offset < sourceBytes.length) {
    const size = sizes[index % sizes.length] ?? 1;
    chunks.push(sourceBytes.slice(offset, offset + size));
    offset += size;
    index += 1;
  }
  return chunks;
}

function byteStream(chunks: readonly Uint8Array[]): ReadableStream<Uint8Array> {
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) controller.enqueue(chunk);
      controller.close();
    },
  });
}

describe("protocol properties", () => {
  it("keeps generated generic and Datastar request encodings profile-specific", () => {
    assertProperty(
      "protocol-profile-request-encoding",
      fc.property(
        methods,
        fc.dictionary(parameterName, parameterValue, { maxKeys: 8 }),
        fc.boolean(),
        fc.dictionary(parameterName, fc.integer(), { maxKeys: 8 }),
        fc.dictionary(parameterName, fc.integer(), { maxKeys: 8 }),
        (method, params, explicit, payload, signals) => {
          const payloadJSON = JSON.stringify(payload);
          const signalsJSON = JSON.stringify(signals);
          const request = source(method, params, explicit, payloadJSON, signalsJSON);
          const generic = prepareProtocolRequest(genericProtocolProfile, request);
          const datastar = prepareProtocolRequest(datastarProtocolProfile, request);
          const genericURL = new URL(generic.descriptor.url);
          const datastarURL = new URL(datastar.descriptor.url);
          const genericHeaders = new Headers(
            generic.descriptor.headers.map(([name, value]) => [name, value]),
          );
          const datastarHeaders = new Headers(
            datastar.descriptor.headers.map(([name, value]) => [name, value]),
          );

          for (const [name, value] of Object.entries(params)) {
            expect(genericURL.searchParams.get(name)).toBe(value);
            expect(datastarURL.searchParams.get(name)).toBe(value);
          }
          expect(genericURL.searchParams.has("datastar")).toBe(false);
          expect(genericHeaders.get("Datastar-Request")).toBeNull();
          expect(genericHeaders.get("Accept")).not.toContain("text/event-stream");
          expect(genericURL.searchParams.get("payload")).toBe(
            explicit && method === "GET" ? payloadJSON : null,
          );
          expect(generic.body).toBe(explicit && method !== "GET" ? payloadJSON : undefined);

          const datastarJSON = explicit ? payloadJSON : signalsJSON;
          expect(datastarHeaders.get("Datastar-Request")).toBe("true");
          expect(datastarHeaders.get("Accept")).toContain("text/event-stream");
          expect(datastarURL.searchParams.get("datastar")).toBe(
            method === "GET" || method === "DELETE" ? datastarJSON : null,
          );
          expect(datastar.body).toBe(method === "GET" ? undefined : datastarJSON);
        },
      ),
    );
  });

  it("rejects every generated exact/suffix overlap before registry commit", () => {
    assertProperty(
      "protocol-adapter-overlap-determinism",
      fc.property(fc.stringMatching(/^[a-z]{1,12}$/), fc.boolean(), (name, overlaps) => {
        const registry = new ProtocolProfileRegistry([
          genericProtocolProfile,
          datastarProtocolProfile,
        ]);
        const generated = profile([
          {
            id: "exact",
            match: { kind: "exact", mediaType: `application/${name}+json` },
            handle: async (_response, body) => {
              await body.text();
            },
          },
          {
            id: "suffix",
            match: { kind: "suffix", suffix: overlaps ? "+json" : "+xml" },
            handle: async (_response, body) => {
              await body.text();
            },
          },
        ]);
        const prepare = () =>
          registry.preparePluginInstall([{ namespace: "acme.protocol", profiles: [generated] }]);

        if (overlaps) {
          expect(prepare).toThrow(StarProtocolValidationError);
          expect(registry.snapshot()).toHaveLength(2);
        } else {
          const prepared = prepare();
          prepared.commit();
          expect(registry.select(generated.id).id).toBe(generated.id);
        }
        registry.dispose();
      }),
    );
  });

  it("permits exactly one body claim for every generated claim sequence", async () => {
    await assertAsyncProperty(
      "protocol-body-lease-one-claim",
      fc.asyncProperty(
        fc.array(fc.constantFrom("text" as const, "stream" as const), {
          minLength: 1,
          maxLength: 10,
        }),
        async (claims) => {
          const current = application();
          const registry = new ProtocolProfileRegistry([
            genericProtocolProfile,
            datastarProtocolProfile,
          ]);
          registry.trackApplication(current);
          const ownershipErrors: unknown[] = [];
          const generated = profile([
            {
              id: "text",
              match: { kind: "exact", mediaType: "text/plain" },
              async handle(_metadata, body) {
                for (const [index, claim] of claims.entries()) {
                  try {
                    if (claim === "text") await body.text();
                    else await body.stream(() => undefined);
                  } catch (error) {
                    expect(index).toBeGreaterThan(0);
                    ownershipErrors.push(error);
                  }
                }
              },
            },
          ]);
          const request = descriptor(generated.id);

          await executeProtocolResponse(
            current,
            generated,
            new Response("generated", { headers: { "Content-Type": "text/plain" } }),
            request,
            new AbortController().signal,
            capabilities(request, []),
            () => undefined,
          );

          expect(ownershipErrors).toHaveLength(claims.length - 1);
          expect(
            ownershipErrors.every((error) => error instanceof StarProtocolBodyOwnershipError),
          ).toBe(true);
          expect(registry.activeBodyCount()).toBe(0);
          registry.releaseApplication(current);
          registry.dispose();
        },
      ),
    );
  });

  it("decodes generated Datastar patches across arbitrary byte boundaries", async () => {
    await assertAsyncProperty(
      "protocol-datastar-byte-boundaries",
      fc.asyncProperty(
        fc.string({ maxLength: 40 }),
        fc.array(fc.integer({ min: 1, max: 17 }), { minLength: 1, maxLength: 12 }),
        async (label, sizes) => {
          const patch = { label };
          const source = `event: datastar-patch-signals\r\ndata: signals ${JSON.stringify(patch)}\r\n\r\n`;
          const chunks = chunksBySizes(new TextEncoder().encode(source), sizes);
          const request = descriptor(datastarProtocolProfile.id);
          const patches: Record<string, unknown>[] = [];

          await executeProtocolResponse(
            application(),
            datastarProtocolProfile,
            new Response(byteStream(chunks), {
              headers: { "Content-Type": "text/event-stream" },
            }),
            request,
            new AbortController().signal,
            capabilities(request, patches),
            () => undefined,
          );

          expect(patches).toEqual([patch]);
        },
      ),
    );
  });
});

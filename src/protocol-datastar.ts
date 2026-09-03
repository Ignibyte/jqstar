import JSON5 from "json5";
import type {
  StarProtocolBodyLease,
  StarProtocolProfileDefinition,
  StarProtocolRequestInput,
  StarProtocolRequestWriter,
  StarProtocolResponseCapabilities,
  StarProtocolResponseMetadata,
} from "./protocol";
import { SSEParser, sseDataFields } from "./sse";
import type { PatchMode, PatchNamespace, SSEMessage } from "./types";

function hasHeader(input: StarProtocolRequestInput, name: string): boolean {
  const normalized = name.toLowerCase();
  return input.headers.some(([candidate]) => candidate.toLowerCase() === normalized);
}

function addParams(input: StarProtocolRequestInput, writer: StarProtocolRequestWriter): void {
  for (const [name, value] of input.params) writer.query(name, value);
}

function prepareDatastarRequest(
  input: StarProtocolRequestInput,
  writer: StarProtocolRequestWriter,
): void {
  addParams(input, writer);
  writer.setHeader("Datastar-Request", "true");
  if (!hasHeader(input, "Accept")) {
    writer.setHeader("Accept", "text/event-stream, text/html, application/json");
  }
  if (input.form) {
    writer.form();
    return;
  }
  const serialized = input.payload.explicit ? input.payload.json : input.signalsJSON;
  if (input.method === "GET") {
    writer.query("datastar", serialized);
    writer.none();
    return;
  }
  if (input.method === "DELETE") writer.query("datastar", serialized);
  writer.json(serialized);
}

function responseHeaders(response: StarProtocolResponseMetadata): ReadonlyMap<string, string> {
  return new Map(response.headers.map(([name, value]) => [name.toLowerCase(), value]));
}

async function handleJSON(
  response: StarProtocolResponseMetadata,
  body: StarProtocolBodyLease,
  capabilities: StarProtocolResponseCapabilities,
): Promise<void> {
  const value = JSON.parse(await body.text()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A JSON response must contain a signal object.");
  }
  const headers = responseHeaders(response);
  capabilities.patchSignals(value as Record<string, unknown>, {
    onlyIfMissing: headers.get("datastar-only-if-missing") === "true",
  });
}

async function handleHTML(
  response: StarProtocolResponseMetadata,
  body: StarProtocolBodyLease,
  capabilities: StarProtocolResponseCapabilities,
): Promise<void> {
  const source = await body.text();
  const headers = responseHeaders(response);
  const selector = capabilities.request.target ?? headers.get("datastar-selector") ?? undefined;
  const mode =
    capabilities.request.mode ??
    (headers.get("datastar-mode") as PatchMode | undefined) ??
    undefined;
  capabilities.patchElements(source, {
    ...(selector ? { selector } : {}),
    ...(mode ? { mode } : {}),
    useViewTransition: headers.get("datastar-use-view-transition") === "true",
  });
}

function first(fields: ReadonlyMap<string, readonly string[]>, key: string): string | undefined {
  return fields.get(key)?.[0];
}

function booleanField(fields: ReadonlyMap<string, readonly string[]>, key: string): boolean {
  return first(fields, key) === "true";
}

function handleMessage(message: SSEMessage, capabilities: StarProtocolResponseCapabilities): void {
  if (
    message.event === "datastar-patch-elements" ||
    message.event === "jquery-star-patch-elements"
  ) {
    const fields = sseDataFields(message.data);
    const elements = fields.get("elements")?.join("\n") ?? "";
    const selector = first(fields, "selector");
    const mode = first(fields, "mode");
    const namespace = first(fields, "namespace");
    const viewTransitionSelector = first(fields, "viewTransitionSelector");
    capabilities.patchElements(elements, {
      ...(selector ? { selector } : {}),
      ...(mode ? { mode: mode as PatchMode } : {}),
      ...(namespace ? { namespace: namespace as PatchNamespace } : {}),
      useViewTransition: booleanField(fields, "useViewTransition"),
      ...(viewTransitionSelector ? { viewTransitionSelector } : {}),
    });
    return;
  }

  if (message.event === "datastar-patch-signals" || message.event === "jquery-star-patch-signals") {
    const fields = sseDataFields(message.data);
    const source = fields.get("signals")?.join("\n");
    if (!source) throw new Error("A signal patch event did not include signals.");
    const signals = JSON5.parse(source) as unknown;
    if (!signals || typeof signals !== "object" || Array.isArray(signals)) {
      throw new Error("A signal patch must contain an object.");
    }
    capabilities.patchSignals(signals as Record<string, unknown>, {
      onlyIfMissing: booleanField(fields, "onlyIfMissing"),
    });
    return;
  }

  capabilities.emitSSE(message);
}

async function handleSSE(
  _response: StarProtocolResponseMetadata,
  body: StarProtocolBodyLease,
  capabilities: StarProtocolResponseCapabilities,
): Promise<void> {
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  await body.stream((chunk) => {
    for (const message of parser.feed(decoder.decode(chunk, { stream: true }))) {
      handleMessage(message, capabilities);
    }
  });
  for (const message of [...parser.feed(decoder.decode()), ...parser.finish()]) {
    handleMessage(message, capabilities);
  }
}

export const datastarProtocolProfile: StarProtocolProfileDefinition = Object.freeze({
  id: "core.datastar",
  compatibilityEvents: Object.freeze(["datastar-fetch", "jquery-star:fetch"] as const),
  prepareRequest: prepareDatastarRequest,
  adapters: Object.freeze([
    Object.freeze({
      id: "json",
      match: Object.freeze({ kind: "exact" as const, mediaType: "application/json" }),
      handle: handleJSON,
    }),
    Object.freeze({
      id: "json-suffix",
      match: Object.freeze({ kind: "suffix" as const, suffix: "+json" }),
      handle: handleJSON,
    }),
    Object.freeze({
      id: "html",
      match: Object.freeze({ kind: "exact" as const, mediaType: "text/html" }),
      handle: handleHTML,
    }),
    Object.freeze({
      id: "xhtml",
      match: Object.freeze({ kind: "exact" as const, mediaType: "application/xhtml+xml" }),
      handle: handleHTML,
    }),
    Object.freeze({
      id: "sse",
      match: Object.freeze({ kind: "exact" as const, mediaType: "text/event-stream" }),
      handle: handleSSE,
    }),
  ]),
  empty: () => undefined,
});

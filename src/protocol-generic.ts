import type {
  StarProtocolBodyLease,
  StarProtocolProfileDefinition,
  StarProtocolRequestInput,
  StarProtocolRequestWriter,
  StarProtocolResponseCapabilities,
} from "./protocol";

function hasHeader(input: StarProtocolRequestInput, name: string): boolean {
  const normalized = name.toLowerCase();
  return input.headers.some(([candidate]) => candidate.toLowerCase() === normalized);
}

function header(input: StarProtocolRequestInput, name: string): string | undefined {
  const normalized = name.toLowerCase();
  return input.headers.find(([candidate]) => candidate.toLowerCase() === normalized)?.[1];
}

function addParams(input: StarProtocolRequestInput, writer: StarProtocolRequestWriter): void {
  for (const [name, value] of input.params) writer.query(name, value);
}

function prepareGenericRequest(
  input: StarProtocolRequestInput,
  writer: StarProtocolRequestWriter,
): void {
  addParams(input, writer);
  writer.deleteHeader("Datastar-Request");
  const authoredAccept = header(input, "Accept");
  if (authoredAccept) {
    const accepted = authoredAccept
      .split(",")
      .map((value) => value.trim())
      .filter((value) => value.toLowerCase().split(";", 1)[0] !== "text/event-stream")
      .join(", ");
    writer.setHeader("Accept", accepted || "text/html, application/json");
  } else if (!hasHeader(input, "Accept")) {
    writer.setHeader("Accept", "text/html, application/json");
  }
  if (input.form) {
    writer.form();
    return;
  }
  if (!input.payload.explicit) {
    writer.none();
    return;
  }
  if (input.method === "GET") {
    writer.query("payload", input.payload.json);
    writer.none();
    return;
  }
  writer.json(input.payload.json);
}

async function handleJSON(
  _response: unknown,
  body: StarProtocolBodyLease,
  capabilities: StarProtocolResponseCapabilities,
): Promise<void> {
  const value = JSON.parse(await body.text()) as unknown;
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("A JSON response must contain a signal object.");
  }
  capabilities.patchSignals(value as Record<string, unknown>);
}

async function handleHTML(
  _response: unknown,
  body: StarProtocolBodyLease,
  capabilities: StarProtocolResponseCapabilities,
): Promise<void> {
  const source = await body.text();
  const { target, mode } = capabilities.request;
  capabilities.patchElements(source, {
    ...(target ? { selector: target } : {}),
    ...(mode ? { mode } : {}),
  });
}

export const genericProtocolProfile: StarProtocolProfileDefinition = Object.freeze({
  id: "core.generic",
  compatibilityEvents: Object.freeze(["jquery-star:fetch"] as const),
  prepareRequest: prepareGenericRequest,
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
  ]),
  empty: () => undefined,
});

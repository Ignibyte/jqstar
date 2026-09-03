import type { StarRequestBodyMetadata, StarRequestDescriptor } from "./request-middleware";
import type {
  BackendMethod,
  PatchElementsOptions,
  PatchMode,
  PatchSignalsOptions,
  SSEMessage,
  StarInstance,
} from "./types";

export type StarProtocolCompatibilityEvent = "datastar-fetch" | "jquery-star:fetch";

export interface StarProtocolSerializedPayload {
  readonly explicit: boolean;
  readonly json: string;
}

export interface StarProtocolFormMetadata {
  readonly encoding: "multipart" | "urlencoded";
}

export interface StarProtocolRequestInput {
  readonly schema: "jquery-star-protocol-request/1";
  readonly profile: string;
  readonly operationId: string;
  readonly method: BackendMethod;
  readonly url: string;
  readonly headers: readonly (readonly [string, string])[];
  readonly credentials: RequestCredentials;
  readonly params: readonly (readonly [string, string])[];
  readonly payload: StarProtocolSerializedPayload;
  readonly signalsJSON: string;
  readonly form?: StarProtocolFormMetadata;
  readonly target?: string;
  readonly selector?: string | null;
  readonly mode?: PatchMode;
}

export interface StarProtocolRequestWriter {
  query(this: void, name: string, value: string): void;
  setHeader(this: void, name: string, value: string): void;
  deleteHeader(this: void, name: string): void;
  none(this: void): void;
  json(this: void, serialized: string): void;
  form(this: void): void;
}

export type StarProtocolRequestPreparer = (
  this: void,
  input: StarProtocolRequestInput,
  writer: StarProtocolRequestWriter,
) => void;

export interface StarProtocolExactMediaMatcher {
  readonly kind: "exact";
  readonly mediaType: string;
}

export interface StarProtocolSuffixMediaMatcher {
  readonly kind: "suffix";
  readonly suffix: string;
}

export type StarProtocolMediaMatcher =
  StarProtocolExactMediaMatcher | StarProtocolSuffixMediaMatcher;

export interface StarProtocolResponseMetadata {
  readonly schema: "jquery-star-protocol-response/1";
  readonly profile: string;
  readonly status: number;
  readonly statusText: string;
  readonly url: string;
  readonly redirected: boolean;
  readonly headers: readonly (readonly [string, string])[];
  readonly mediaType: string;
}

export type StarProtocolStreamConsumer = (
  this: void,
  chunk: Uint8Array,
) => void | PromiseLike<void>;

export interface StarProtocolBodyLease {
  readonly claimed: boolean;
  readonly signal: AbortSignal;
  text(this: void): Promise<string>;
  stream(this: void, consume: StarProtocolStreamConsumer): Promise<void>;
}

export interface StarProtocolResponseCapabilities {
  readonly request: StarRequestDescriptor;
  readonly signal: AbortSignal;
  patchSignals(
    this: void,
    patch: Readonly<Record<string, unknown>>,
    options?: PatchSignalsOptions,
  ): void;
  patchElements(this: void, source: string, options?: PatchElementsOptions): void;
  emitSSE(this: void, message: SSEMessage): void;
}

export type StarProtocolResponseHandler = (
  this: void,
  response: StarProtocolResponseMetadata,
  body: StarProtocolBodyLease,
  capabilities: StarProtocolResponseCapabilities,
) => void | PromiseLike<void>;

export type StarProtocolEmptyResponseHandler = (
  this: void,
  response: StarProtocolResponseMetadata,
  capabilities: StarProtocolResponseCapabilities,
) => void | PromiseLike<void>;

export interface StarProtocolResponseAdapter {
  readonly id: string;
  readonly match: StarProtocolMediaMatcher;
  readonly handle: StarProtocolResponseHandler;
}

export interface StarProtocolProfileDefinition {
  readonly id: string;
  readonly compatibilityEvents: readonly StarProtocolCompatibilityEvent[];
  readonly prepareRequest: StarProtocolRequestPreparer;
  readonly adapters: readonly StarProtocolResponseAdapter[];
  readonly empty: StarProtocolEmptyResponseHandler;
}

export interface StarPluginProtocolProfileSet {
  readonly official?: boolean;
  readonly namespace: string;
  readonly profiles: readonly StarProtocolProfileDefinition[];
}

export interface PreparedProtocolProfileInstall {
  readonly cleanups: ReadonlyMap<string, () => void>;
  commit(): void;
  rollback(): void;
}

export class StarProtocolValidationError extends TypeError {
  override readonly name = "StarProtocolValidationError";
}

export class StarProtocolSelectionError extends Error {
  override readonly name = "StarProtocolSelectionError";
}

export class StarProtocolBodyOwnershipError extends Error {
  override readonly name = "StarProtocolBodyOwnershipError";
}

export interface ProtocolRequestFormSource {
  readonly data: FormData;
  readonly encoding: "multipart" | "urlencoded";
}

export interface ProtocolRequestSource {
  readonly operationId: string;
  readonly method: BackendMethod;
  readonly url: string;
  readonly headers: HeadersInit;
  readonly credentials: RequestCredentials;
  readonly params: readonly (readonly [string, string])[];
  readonly payload: StarProtocolSerializedPayload;
  readonly signalsJSON: string;
  readonly form?: ProtocolRequestFormSource;
  readonly target?: string;
  readonly selector?: string | null;
  readonly mode?: PatchMode;
}

type ProtocolRequestBody = string | URLSearchParams | FormData | undefined;

export interface ProtocolPreparedRequest {
  readonly descriptor: StarRequestDescriptor;
  readonly body: ProtocolRequestBody;
}

interface NormalizedProtocolProfile extends StarProtocolProfileDefinition {
  readonly namespace: string;
}

interface BodyController {
  cancel(): void;
}

interface BodyLeaseController extends BodyController {
  readonly lease: StarProtocolBodyLease;
  release(): Promise<void>;
}

const profileIdPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const adapterIdPattern = /^[a-z][a-z0-9-]*$/;
const mediaTypePattern = /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/;
const suffixPattern = /^\+[a-z0-9!#$&^_.-]+$/;
const officialProfileIds = new Set(["core.generic", "core.datastar"]);
const compatibilityEvents = new Set<StarProtocolCompatibilityEvent>([
  "datastar-fetch",
  "jquery-star:fetch",
]);
const forbiddenHeaderNames = new Set([
  "accept-charset",
  "accept-encoding",
  "access-control-request-headers",
  "access-control-request-method",
  "connection",
  "content-length",
  "cookie",
  "cookie2",
  "date",
  "dnt",
  "expect",
  "host",
  "keep-alive",
  "origin",
  "permissions-policy",
  "referer",
  "te",
  "trailer",
  "transfer-encoding",
  "upgrade",
  "user-agent",
  "via",
]);
const applicationRegistries = new WeakMap<StarInstance, ProtocolProfileRegistry>();
const ABORTED = Symbol("protocol-response-aborted");

function validation(message: string): StarProtocolValidationError {
  return new StarProtocolValidationError(message);
}

function plainRecord(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function exactKeys(
  value: Record<string, unknown>,
  allowed: ReadonlySet<string>,
  label: string,
): void {
  const extra = Object.keys(value).find((key) => !allowed.has(key));
  if (extra) throw validation(`${label} contains unsupported property ${extra}.`);
}

function recursivelyFreeze<Value>(value: Value, seen = new WeakSet<object>()): Value {
  if (!value || typeof value !== "object") return value;
  const object = value as object;
  if (seen.has(object)) return value;
  seen.add(object);
  for (const child of Object.values(object)) recursivelyFreeze(child, seen);
  return Object.freeze(value);
}

function normalizedMediaType(value: unknown, label: string): string {
  if (typeof value !== "string") throw validation(`${label} must be a media-type string.`);
  const normalized = value.trim().toLowerCase();
  if (!mediaTypePattern.test(normalized)) {
    throw validation(`${label} must be a normalized type/subtype without parameters.`);
  }
  return normalized;
}

function normalizedMatcher(value: unknown, label: string): StarProtocolMediaMatcher {
  if (!plainRecord(value)) throw validation(`${label} needs an exact or suffix matcher.`);
  exactKeys(value, new Set(["kind", "mediaType", "suffix"]), label);
  if (value.kind === "exact") {
    if (value.suffix !== undefined)
      throw validation(`${label} exact matcher cannot have a suffix.`);
    return Object.freeze({
      kind: "exact" as const,
      mediaType: normalizedMediaType(value.mediaType, `${label} media type`),
    });
  }
  if (value.kind === "suffix") {
    if (value.mediaType !== undefined) {
      throw validation(`${label} suffix matcher cannot have a media type.`);
    }
    if (typeof value.suffix !== "string" || !suffixPattern.test(value.suffix.toLowerCase())) {
      throw validation(`${label} suffix must start with + and contain one structured suffix.`);
    }
    return Object.freeze({ kind: "suffix" as const, suffix: value.suffix.toLowerCase() });
  }
  throw validation(`${label} needs an exact or suffix matcher.`);
}

function matchersOverlap(left: StarProtocolMediaMatcher, right: StarProtocolMediaMatcher): boolean {
  if (left.kind === "exact" && right.kind === "exact") {
    return left.mediaType === right.mediaType;
  }
  if (left.kind === "suffix" && right.kind === "suffix") return left.suffix === right.suffix;
  if (left.kind === "exact" && right.kind === "suffix") {
    return left.mediaType.endsWith(right.suffix);
  }
  return left.kind === "suffix" && right.kind === "exact" && right.mediaType.endsWith(left.suffix);
}

function normalizeProfile(
  value: unknown,
  namespace: string,
  official: boolean,
): NormalizedProtocolProfile {
  if (!plainRecord(value)) throw validation(`Protocol profiles for ${namespace} must be objects.`);
  exactKeys(
    value,
    new Set(["id", "compatibilityEvents", "prepareRequest", "adapters", "empty"]),
    `Protocol profile for ${namespace}`,
  );
  if (typeof value.id !== "string" || !profileIdPattern.test(value.id)) {
    throw validation(`Protocol profiles for ${namespace} need a dot-qualified lowercase ID.`);
  }
  if (official) {
    if (!officialProfileIds.has(value.id)) {
      throw validation(`Unknown official protocol profile ID: ${value.id}.`);
    }
  } else {
    if (
      officialProfileIds.has(value.id) ||
      value.id === namespace ||
      !value.id.startsWith(`${namespace}.`)
    ) {
      throw validation(`Protocol profile ${value.id} must be below plugin namespace ${namespace}.`);
    }
  }
  if (typeof value.prepareRequest !== "function") {
    throw validation(`Protocol profile ${value.id} needs a request preparer.`);
  }
  if (typeof value.empty !== "function") {
    throw validation(`Protocol profile ${value.id} needs an empty-response handler.`);
  }
  if (!Array.isArray(value.compatibilityEvents) || value.compatibilityEvents.length === 0) {
    throw validation(`Protocol profile ${value.id} needs compatibility events.`);
  }
  const events: StarProtocolCompatibilityEvent[] = [];
  for (const event of value.compatibilityEvents as readonly unknown[]) {
    if (!compatibilityEvents.has(event as StarProtocolCompatibilityEvent)) {
      throw validation(`Protocol profile ${value.id} has an unsupported compatibility event.`);
    }
    if (events.includes(event as StarProtocolCompatibilityEvent)) {
      throw validation(`Protocol profile ${value.id} has a duplicate compatibility event.`);
    }
    events.push(event as StarProtocolCompatibilityEvent);
  }
  if (!events.includes("jquery-star:fetch")) {
    throw validation(`Protocol profile ${value.id} must retain jquery-star:fetch.`);
  }
  if (!Array.isArray(value.adapters) || value.adapters.length === 0) {
    throw validation(`Protocol profile ${value.id} needs at least one response adapter.`);
  }
  const adapters: StarProtocolResponseAdapter[] = [];
  const adapterIds = new Set<string>();
  for (const raw of value.adapters as readonly unknown[]) {
    if (!plainRecord(raw))
      throw validation(`Protocol profile ${value.id} adapters must be objects.`);
    exactKeys(raw, new Set(["id", "match", "handle"]), `Protocol profile ${value.id} adapter`);
    if (typeof raw.id !== "string" || !adapterIdPattern.test(raw.id)) {
      throw validation(`Protocol profile ${value.id} adapter IDs must be lowercase segments.`);
    }
    if (adapterIds.has(raw.id)) {
      throw validation(`Protocol profile ${value.id} has duplicate adapter ID ${raw.id}.`);
    }
    if (typeof raw.handle !== "function") {
      throw validation(`Protocol profile ${value.id} adapter ${raw.id} needs a handler.`);
    }
    const adapter = Object.freeze({
      id: raw.id,
      match: normalizedMatcher(raw.match, `Protocol profile ${value.id} adapter ${raw.id}`),
      handle: raw.handle as StarProtocolResponseHandler,
    });
    const conflict = adapters.find((candidate) => matchersOverlap(candidate.match, adapter.match));
    if (conflict) {
      throw validation(
        `Protocol profile ${value.id} adapters ${conflict.id} and ${adapter.id} overlap.`,
      );
    }
    adapterIds.add(raw.id);
    adapters.push(adapter);
  }
  return Object.freeze({
    id: value.id,
    namespace,
    compatibilityEvents: Object.freeze(events),
    prepareRequest: value.prepareRequest as StarProtocolRequestPreparer,
    adapters: Object.freeze(adapters),
    empty: value.empty as StarProtocolEmptyResponseHandler,
  });
}

function requestBodyMetadata(body: ProtocolRequestBody): StarRequestBodyMetadata {
  if (body === undefined) return Object.freeze({ kind: "none" });
  if (typeof body === "string") {
    return Object.freeze({ kind: "json", size: new TextEncoder().encode(body).byteLength });
  }
  if (body instanceof URLSearchParams) {
    return Object.freeze({
      kind: "urlencoded",
      size: new TextEncoder().encode(body.toString()).byteLength,
    });
  }
  return Object.freeze({ kind: "multipart" });
}

function assertHeaderSafety(headers: Headers): void {
  for (const [name] of headers) {
    const normalized = name.toLowerCase();
    if (
      forbiddenHeaderNames.has(normalized) ||
      normalized.startsWith("proxy-") ||
      normalized.startsWith("sec-")
    ) {
      throw validation(`Protocol profiles cannot send browser-owned header ${normalized}.`);
    }
  }
}

function appendFormToURL(url: URL, data: FormData): void {
  for (const [key, value] of data.entries()) {
    url.searchParams.append(key, typeof value === "string" ? value : value.name);
  }
}

function thenable(value: unknown): boolean {
  return Boolean(
    value !== null &&
    (typeof value === "object" || typeof value === "function") &&
    typeof (value as { then?: unknown }).then === "function",
  );
}

export function prepareProtocolRequest(
  profile: StarProtocolProfileDefinition,
  source: ProtocolRequestSource,
): ProtocolPreparedRequest {
  const url = new URL(source.url);
  if (url.username || url.password)
    throw validation("Protocol request URLs cannot contain credentials.");
  const headers = new Headers(source.headers);
  const input = recursivelyFreeze<StarProtocolRequestInput>({
    schema: "jquery-star-protocol-request/1",
    profile: profile.id,
    operationId: source.operationId,
    method: source.method,
    url: url.href,
    headers: Array.from(headers, ([name, value]) => Object.freeze([name, value] as const)),
    credentials: source.credentials,
    params: source.params.map(([name, value]) => Object.freeze([name, value] as const)),
    payload: Object.freeze({ ...source.payload }),
    signalsJSON: source.signalsJSON,
    ...(source.form ? { form: Object.freeze({ encoding: source.form.encoding }) } : {}),
    ...(source.target === undefined ? {} : { target: source.target }),
    ...(source.selector === undefined ? {} : { selector: source.selector }),
    ...(source.mode === undefined ? {} : { mode: source.mode }),
  });
  let selected = false;
  let closed = false;
  let body: ProtocolRequestBody;
  const assertOpen = (): void => {
    if (closed) throw validation(`Protocol profile ${profile.id} used its request writer late.`);
  };
  const selectBody = (next: ProtocolRequestBody): void => {
    assertOpen();
    if (selected)
      throw validation(`Protocol profile ${profile.id} selected more than one request body.`);
    selected = true;
    body = next;
  };
  const writer = Object.freeze<StarProtocolRequestWriter>({
    query: (name, value) => {
      assertOpen();
      if (typeof name !== "string" || typeof value !== "string") {
        throw validation(`Protocol profile ${profile.id} query values must be strings.`);
      }
      url.searchParams.set(name, value);
    },
    setHeader: (name, value) => {
      assertOpen();
      if (typeof name !== "string" || typeof value !== "string") {
        throw validation(`Protocol profile ${profile.id} header values must be strings.`);
      }
      try {
        headers.set(name, value);
      } catch (error) {
        throw new StarProtocolValidationError(
          `Protocol profile ${profile.id} set an invalid header.`,
          {
            cause: error,
          },
        );
      }
    },
    deleteHeader: (name) => {
      assertOpen();
      if (typeof name !== "string") {
        throw validation(`Protocol profile ${profile.id} header names must be strings.`);
      }
      headers.delete(name);
    },
    none: () => selectBody(undefined),
    json: (serialized) => {
      if (typeof serialized !== "string") {
        throw validation(`Protocol profile ${profile.id} JSON bodies must already be serialized.`);
      }
      headers.set("Content-Type", "application/json");
      selectBody(serialized);
    },
    form: () => {
      if (!source.form)
        throw validation(`Protocol profile ${profile.id} requested an unavailable form.`);
      if (source.method === "GET") {
        appendFormToURL(url, source.form.data);
        selectBody(undefined);
        return;
      }
      if (source.form.encoding === "multipart") {
        selectBody(source.form.data);
        return;
      }
      const encoded = new URLSearchParams();
      for (const [name, value] of source.form.data.entries()) {
        encoded.append(name, typeof value === "string" ? value : value.name);
      }
      headers.set("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
      selectBody(encoded);
    },
  });
  try {
    const prepare = profile.prepareRequest;
    const result = prepare(input, writer);
    if (thenable(result)) {
      throw validation(`Protocol profile ${profile.id} request preparation must be synchronous.`);
    }
  } finally {
    closed = true;
  }
  if (!selected) throw validation(`Protocol profile ${profile.id} did not select a request body.`);
  assertHeaderSafety(headers);
  const descriptor = recursivelyFreeze<StarRequestDescriptor>({
    schema: "jquery-star-request/1",
    operationId: source.operationId,
    method: source.method,
    url: url.href,
    headers: Array.from(headers, ([name, value]) => Object.freeze([name, value] as const)),
    credentials: source.credentials,
    body: requestBodyMetadata(body),
    ...(source.target === undefined ? {} : { target: source.target }),
    ...(source.selector === undefined ? {} : { selector: source.selector }),
    ...(source.mode === undefined ? {} : { mode: source.mode }),
    profile: profile.id,
  });
  return Object.freeze({ descriptor, body });
}

function responseMetadata(
  profile: StarProtocolProfileDefinition,
  response: Response,
  request: StarRequestDescriptor,
): StarProtocolResponseMetadata {
  if (!Number.isInteger(response.status) || response.status < 200 || response.status > 599) {
    throw new StarProtocolSelectionError(
      `Protocol profile ${profile.id} received an invalid status.`,
    );
  }
  const headers = Array.from(response.headers, ([name, value]) => {
    if (name.length > 256 || value.length > 8_192) {
      throw new StarProtocolSelectionError(
        `Protocol profile ${profile.id} received oversized response metadata.`,
      );
    }
    return Object.freeze([name, value] as const);
  });
  if (headers.length > 200) {
    throw new StarProtocolSelectionError(
      `Protocol profile ${profile.id} received too many response headers.`,
    );
  }
  const contentType =
    response.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";
  if (contentType && !mediaTypePattern.test(contentType)) {
    throw new StarProtocolSelectionError(
      `Protocol profile ${profile.id} received an invalid response media type.`,
    );
  }
  return recursivelyFreeze({
    schema: "jquery-star-protocol-response/1" as const,
    profile: profile.id,
    status: response.status,
    statusText: response.statusText,
    url: response.url || request.url,
    redirected: response.redirected,
    headers,
    mediaType: contentType,
  });
}

function adapterMatches(matcher: StarProtocolMediaMatcher, mediaType: string): boolean {
  return matcher.kind === "exact"
    ? matcher.mediaType === mediaType
    : mediaType.endsWith(matcher.suffix);
}

function abortError(): DOMException {
  return new DOMException("The protocol response body was aborted.", "AbortError");
}

async function cancelResponseBody(response: Response): Promise<void> {
  try {
    await response.body?.cancel();
  } catch {
    // Selection and metadata failures remain the primary outcome.
  }
}

async function runProfileTask(task: Promise<void>, signal: AbortSignal): Promise<void> {
  let aborted!: () => void;
  const cancellation = new Promise<typeof ABORTED>((resolve) => {
    aborted = () => resolve(ABORTED);
    signal.addEventListener("abort", aborted, { once: true });
  });
  try {
    const result = await Promise.race([task, cancellation]);
    if (result === ABORTED) {
      void task.catch(() => undefined);
      throw abortError();
    }
  } finally {
    signal.removeEventListener("abort", aborted);
  }
}

function createBodyLease(
  response: Response,
  signal: AbortSignal,
  progress: (loaded: number, total: number | undefined) => void,
): BodyLeaseController {
  let claimed = false;
  let released = false;
  let complete = false;
  let reader: ReadableStreamDefaultReader<Uint8Array> | undefined;
  let cancellation: Promise<void> | undefined;
  const totalHeader = response.headers.get("Content-Length");
  const parsedTotal = totalHeader ? Number(totalHeader) : undefined;
  const total = parsedTotal !== undefined && Number.isFinite(parsedTotal) ? parsedTotal : undefined;
  const cancel = (): void => {
    if (cancellation) return;
    released = true;
    cancellation = (async () => {
      try {
        if (reader) await reader.cancel();
        else await response.body?.cancel();
      } catch {
        // Cleanup must not replace the request's primary outcome.
      }
    })();
  };
  const aborted = (): void => cancel();
  signal.addEventListener("abort", aborted, { once: true });
  if (signal.aborted) cancel();
  const claim = (): void => {
    if (released || signal.aborted) throw abortError();
    if (claimed)
      throw new StarProtocolBodyOwnershipError(
        "A protocol response body can be claimed only once.",
      );
    claimed = true;
  };
  const readChunks = async (consume: StarProtocolStreamConsumer): Promise<void> => {
    reader = response.body!.getReader();
    let loaded = 0;
    try {
      while (true) {
        const result = await reader.read();
        if (result.done) break;
        loaded += result.value.byteLength;
        const handle = consume;
        await handle(result.value);
        progress(loaded, total);
      }
      if (signal.aborted) throw abortError();
      complete = true;
    } finally {
      reader.releaseLock();
      reader = undefined;
    }
  };
  const lease = Object.freeze<StarProtocolBodyLease>({
    get claimed() {
      return claimed;
    },
    signal,
    text: async () => {
      claim();
      const decoder = new TextDecoder();
      let text = "";
      await readChunks((chunk) => {
        text += decoder.decode(chunk, { stream: true });
      });
      return text + decoder.decode();
    },
    stream: async (consume) => {
      if (typeof consume !== "function") {
        throw new StarProtocolBodyOwnershipError("A protocol stream needs a chunk consumer.");
      }
      claim();
      await readChunks(consume);
    },
  });
  return {
    lease,
    cancel,
    release: async () => {
      signal.removeEventListener("abort", aborted);
      if (!complete) cancel();
      await cancellation;
      released = true;
    },
  };
}

export async function executeProtocolResponse(
  application: StarInstance,
  profile: StarProtocolProfileDefinition,
  response: Response,
  request: StarRequestDescriptor,
  signal: AbortSignal,
  capabilities: StarProtocolResponseCapabilities,
  progress: (loaded: number, total: number | undefined) => void,
): Promise<void> {
  if (request.profile !== profile.id) {
    await cancelResponseBody(response);
    throw new StarProtocolSelectionError(
      `Request profile ${request.profile} does not match selected profile ${profile.id}.`,
    );
  }
  let active = true;
  const assertActive = (): void => {
    if (!active || signal.aborted) {
      throw new StarProtocolBodyOwnershipError(
        `Protocol profile ${profile.id} used response capabilities after cleanup.`,
      );
    }
  };
  const scopedCapabilities = Object.freeze<StarProtocolResponseCapabilities>({
    request: capabilities.request,
    signal,
    patchSignals: (patch, options) => {
      assertActive();
      capabilities.patchSignals(patch, options);
    },
    patchElements: (source, options) => {
      assertActive();
      capabilities.patchElements(source, options);
    },
    emitSSE: (message) => {
      assertActive();
      capabilities.emitSSE(message);
    },
  });
  let metadata: StarProtocolResponseMetadata;
  try {
    if (signal.aborted) {
      await cancelResponseBody(response);
      throw abortError();
    }
    try {
      metadata = responseMetadata(profile, response, request);
    } catch (error) {
      await cancelResponseBody(response);
      throw error;
    }
    if (response.status === 204 || response.status === 205 || response.body === null) {
      const empty = profile.empty;
      await runProfileTask(
        Promise.resolve().then(() => empty(metadata, scopedCapabilities)),
        signal,
      );
      return;
    }
    const adapters = profile.adapters.filter((adapter) =>
      adapterMatches(adapter.match, metadata.mediaType),
    );
    if (adapters.length === 0) {
      await cancelResponseBody(response);
      throw new StarProtocolSelectionError(
        `Protocol profile ${profile.id} has no adapter for ${metadata.mediaType || "a missing media type"}.`,
      );
    }
    if (adapters.length > 1) {
      await cancelResponseBody(response);
      throw new StarProtocolSelectionError(
        `Protocol profile ${profile.id} selected multiple response adapters for ${metadata.mediaType}.`,
      );
    }
    const controller = createBodyLease(response, signal, progress);
    const releaseOwnership = ownProtocolBody(application, controller);
    try {
      const handle = adapters[0]!.handle;
      await runProfileTask(
        Promise.resolve().then(() => handle(metadata, controller.lease, scopedCapabilities)),
        signal,
      );
    } finally {
      await controller.release();
      releaseOwnership();
    }
  } finally {
    active = false;
  }
}

export class ProtocolProfileRegistry {
  private profiles: readonly NormalizedProtocolProfile[];
  private defaultProfileId = "core.generic";
  private readonly applications = new Set<StarInstance>();
  private readonly bodies = new Map<StarInstance, Set<BodyController>>();
  private disposed = false;

  constructor(officialProfiles: readonly StarProtocolProfileDefinition[]) {
    this.profiles = Object.freeze(
      officialProfiles.map((profile) => normalizeProfile(profile, "core", true)),
    );
    if (new Set(this.profiles.map(({ id }) => id)).size !== this.profiles.length) {
      throw validation("Official protocol profile IDs must be unique.");
    }
    if (!this.profiles.some((profile) => profile.id === "core.generic")) {
      throw validation("Missing official protocol profile core.generic.");
    }
  }

  trackApplication(application: StarInstance): void {
    this.assertActive();
    this.applications.add(application);
    applicationRegistries.set(application, this);
  }

  releaseApplication(application: StarInstance): void {
    for (const body of this.bodies.get(application) ?? []) body.cancel();
    this.bodies.delete(application);
    this.applications.delete(application);
    if (applicationRegistries.get(application) === this) applicationRegistries.delete(application);
  }

  preparePluginInstall(
    registrations: readonly StarPluginProtocolProfileSet[],
  ): PreparedProtocolProfileInstall {
    this.assertActive();
    const staged: NormalizedProtocolProfile[] = [];
    const stagedIds = new Set<string>();
    for (const registration of registrations) {
      if (!profileIdPattern.test(registration.namespace)) {
        throw validation(`Invalid protocol profile plugin namespace: ${registration.namespace}.`);
      }
      if (registration.namespace.startsWith("core.") && registration.official !== true) {
        throw validation(`Invalid protocol profile plugin namespace: ${registration.namespace}.`);
      }
      if (!Array.isArray(registration.profiles)) {
        throw validation(`Plugin ${registration.namespace} protocol profiles must be an array.`);
      }
      for (const profile of registration.profiles as readonly unknown[]) {
        const normalized = normalizeProfile(
          profile,
          registration.namespace,
          registration.official === true,
        );
        if (registration.official === true && normalized.id !== registration.namespace) {
          throw validation(
            `Official protocol profile ${normalized.id} must match namespace ${registration.namespace}.`,
          );
        }
        if (stagedIds.has(normalized.id)) {
          throw validation(`Duplicate protocol profile ID: ${normalized.id}.`);
        }
        stagedIds.add(normalized.id);
        staged.push(normalized);
      }
    }
    const currentIds = new Set(this.profiles.map(({ id }) => id));
    const duplicate = staged.find(({ id }) => currentIds.has(id));
    if (duplicate) throw validation(`Duplicate protocol profile ID: ${duplicate.id}.`);
    const proposed = Object.freeze([...this.profiles, ...staged]);
    let settled = false;
    const cleanups = new Map<string, () => void>();
    for (const { namespace } of registrations) {
      let active = true;
      cleanups.set(namespace, () => {
        if (!active) return;
        active = false;
        this.profiles = Object.freeze(
          this.profiles.filter((profile) => profile.namespace !== namespace),
        );
        if (!this.profiles.some((profile) => profile.id === this.defaultProfileId)) {
          this.defaultProfileId = "core.generic";
        }
      });
    }
    return {
      cleanups,
      commit: () => {
        if (settled) return;
        settled = true;
        this.profiles = proposed;
      },
      rollback: () => {
        if (settled) return;
        settled = true;
        for (const cleanup of cleanups.values()) cleanup();
      },
    };
  }

  setDefault(id: string): void {
    this.select(id);
    this.defaultProfileId = id;
  }

  select(id: string = this.defaultProfileId): StarProtocolProfileDefinition {
    this.assertActive();
    if (typeof id !== "string" || !profileIdPattern.test(id)) {
      throw new StarProtocolSelectionError(`Invalid protocol profile ID: ${String(id)}.`);
    }
    const profile = this.profiles.find((candidate) => candidate.id === id);
    if (!profile) throw new StarProtocolSelectionError(`Unknown protocol profile: ${id}.`);
    return profile;
  }

  snapshot(): readonly StarProtocolProfileDefinition[] {
    this.assertActive();
    return this.profiles;
  }

  ownBody(application: StarInstance, body: BodyController): () => void {
    this.assertActive();
    let records = this.bodies.get(application);
    if (!records) {
      records = new Set();
      this.bodies.set(application, records);
    }
    records.add(body);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      records!.delete(body);
      if (records!.size === 0) this.bodies.delete(application);
    };
  }

  activeBodyCount(): number {
    let count = 0;
    for (const records of this.bodies.values()) count += records.size;
    return count;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const records of this.bodies.values()) {
      for (const body of records) body.cancel();
    }
    this.bodies.clear();
    for (const application of this.applications) {
      if (applicationRegistries.get(application) === this)
        applicationRegistries.delete(application);
    }
    this.applications.clear();
    this.profiles = Object.freeze([]);
    this.defaultProfileId = "core.generic";
  }

  private assertActive(): void {
    if (this.disposed) throw new Error("This jQStar protocol profile registry has been disposed.");
  }
}

export function selectProtocolProfile(
  application: StarInstance,
  id: string | undefined,
  officialProfiles: readonly StarProtocolProfileDefinition[],
): StarProtocolProfileDefinition {
  const registry = applicationRegistries.get(application);
  if (registry) return registry.select(id);
  id ??= "core.generic";
  if (typeof id !== "string" || !profileIdPattern.test(id)) {
    throw new StarProtocolSelectionError(`Invalid protocol profile ID: ${String(id)}.`);
  }
  const profile = officialProfiles.find((candidate) => candidate.id === id);
  if (!profile) throw new StarProtocolSelectionError(`Unknown protocol profile: ${id}.`);
  return profile;
}

function ownProtocolBody(application: StarInstance, body: BodyController): () => void {
  return applicationRegistries.get(application)?.ownBody(application, body) ?? (() => undefined);
}

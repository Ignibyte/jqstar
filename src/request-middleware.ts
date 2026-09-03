import type { StarOperationCancellationReason, StarOperationError } from "./observation";
import type { BackendMethod, PatchMode, StarContext, StarInstance } from "./types";

export type StarRequestBodyKind = "none" | "json" | "urlencoded" | "multipart";

export interface StarRequestBodyMetadata {
  readonly kind: StarRequestBodyKind;
  readonly size?: number;
}

export interface StarRequestDescriptor {
  readonly schema: "jquery-star-request/1";
  readonly operationId: string;
  readonly method: BackendMethod;
  readonly url: string;
  readonly headers: readonly (readonly [string, string])[];
  readonly credentials: RequestCredentials;
  readonly body: StarRequestBodyMetadata;
  readonly target?: string;
  readonly selector?: string | null;
  readonly mode?: PatchMode;
  readonly profile: string;
}

export interface StarRequestMiddlewareCompletedOutcome {
  readonly phase: "completed";
  readonly source: "dispatch" | "middleware";
  readonly status?: number;
}

export interface StarRequestMiddlewareCancelledOutcome {
  readonly phase: "cancelled";
  readonly source: "request" | "middleware";
  readonly reason: StarOperationCancellationReason;
}

export interface StarRequestMiddlewareFailedOutcome {
  readonly phase: "failed";
  readonly source: "dispatch" | "middleware";
  readonly error: StarOperationError;
}

export type StarRequestMiddlewareOutcome =
  | StarRequestMiddlewareCompletedOutcome
  | StarRequestMiddlewareCancelledOutcome
  | StarRequestMiddlewareFailedOutcome;

export type StarRequestMiddlewareNext = (
  this: void,
  descriptor?: StarRequestDescriptor,
) => Promise<StarRequestMiddlewareOutcome>;

export interface StarRequestMiddlewareContext {
  readonly id: string;
  readonly signal: AbortSignal;
  complete(this: void): StarRequestMiddlewareCompletedOutcome;
  cancel(this: void): StarRequestMiddlewareCancelledOutcome;
}

export type StarRequestMiddleware = (
  this: void,
  descriptor: StarRequestDescriptor,
  next: StarRequestMiddlewareNext,
  context: StarRequestMiddlewareContext,
) => StarRequestMiddlewareOutcome | PromiseLike<StarRequestMiddlewareOutcome>;

export interface StarRequestMiddlewareDefinition {
  readonly id: string;
  readonly before?: readonly string[];
  readonly after?: readonly string[];
  readonly handle: StarRequestMiddleware;
}

export interface StarPluginRequestMiddlewareSet {
  readonly namespace: string;
  readonly middleware: readonly StarRequestMiddlewareDefinition[];
}

export interface PreparedRequestMiddlewareInstall {
  readonly cleanups: ReadonlyMap<string, () => void>;
  commit(): void;
  rollback(): void;
}

export class StarRequestMiddlewareValidationError extends TypeError {
  override readonly name = "StarRequestMiddlewareValidationError";
}

export class StarRequestMiddlewareNextError extends Error {
  override readonly name = "StarRequestMiddlewareNextError";
}

interface RequestMiddlewareDispatchResult<Value> {
  readonly phase: "completed";
  readonly value: Value;
  readonly status: number;
}

interface RequestMiddlewareDispatchCancellation {
  readonly phase: "cancelled";
  readonly reason: StarOperationCancellationReason;
}

export type RequestMiddlewareDispatchSettlement<Value> =
  RequestMiddlewareDispatchResult<Value> | RequestMiddlewareDispatchCancellation;

type RequestMiddlewareDispatch<Value> = (
  descriptor: StarRequestDescriptor,
) => Promise<RequestMiddlewareDispatchSettlement<Value>>;

export type RequestMiddlewareExecution<Value> =
  | {
      readonly phase: "completed";
      readonly source: "dispatch";
      readonly descriptor: StarRequestDescriptor;
      readonly value: Value;
      readonly status: number;
    }
  | {
      readonly phase: "completed";
      readonly source: "middleware";
      readonly descriptor: StarRequestDescriptor;
    }
  | {
      readonly phase: "cancelled";
      readonly source: "request" | "middleware";
      readonly descriptor: StarRequestDescriptor;
      readonly reason: StarOperationCancellationReason;
    };

interface MiddlewareRecord {
  readonly id: string;
  readonly namespace: string;
  readonly before: readonly string[];
  readonly after: readonly string[];
  readonly handle: StarRequestMiddleware;
  readonly order: number;
}

interface PrivateOutcome<Value> {
  readonly descriptor: StarRequestDescriptor;
  readonly error?: unknown;
  readonly value?: Value;
}

const applicationRegistries = new WeakMap<StarInstance, RequestMiddlewareRegistry>();
const middlewareIdPattern = /^[a-z][a-z0-9-]*$/;
const qualifiedIdPattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const methods = new Set<BackendMethod>(["GET", "POST", "PUT", "PATCH", "DELETE"]);
const credentials = new Set<RequestCredentials>(["omit", "same-origin", "include"]);
const bodyKinds = new Set<StarRequestBodyKind>(["none", "json", "urlencoded", "multipart"]);
const patchModes = new Set<PatchMode>([
  "outer",
  "inner",
  "replace",
  "prepend",
  "append",
  "before",
  "after",
  "remove",
]);
const descriptorKeys = new Set([
  "schema",
  "operationId",
  "method",
  "url",
  "headers",
  "credentials",
  "body",
  "target",
  "selector",
  "mode",
  "profile",
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
const protectedHeaderNames = new Set(["accept", "content-type", "datastar-request"]);
const ABORTED = Symbol("request-middleware-aborted");

function validation(message: string): StarRequestMiddlewareValidationError {
  return new StarRequestMiddlewareValidationError(message);
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

function boundedText(value: string, maximum: number): string {
  const normalized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || (code >= 11 && code <= 12) || (code >= 14 && code <= 31) || code === 127
      ? "�"
      : character;
  }).join("");
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`;
}

function normalizedError(error: unknown): StarOperationError {
  if (error instanceof Error) {
    let name = "Error";
    let message = "Request middleware failed.";
    try {
      if (typeof error.name === "string" && error.name) name = error.name;
    } catch {
      // A hostile accessor cannot replace the original thrown value.
    }
    try {
      if (typeof error.message === "string") message = error.message;
    } catch {
      // A hostile accessor cannot replace the original thrown value.
    }
    return Object.freeze({ name: boundedText(name, 120), message: boundedText(message, 1_024) });
  }
  const kind = error === null ? "null" : typeof error;
  const message = ["string", "number", "boolean", "bigint", "undefined"].includes(kind)
    ? String(error)
    : `Request middleware failed with a ${kind} value.`;
  return Object.freeze({ name: "ThrownValue", message: boundedText(message, 1_024) });
}

function assertIdList(value: readonly string[] | undefined, label: string): readonly string[] {
  if (value === undefined) return Object.freeze([]);
  if (!Array.isArray(value)) throw validation(`${label} must be an array.`);
  const result: string[] = [];
  const seen = new Set<string>();
  for (const entry of value as readonly unknown[]) {
    if (typeof entry !== "string" || !qualifiedIdPattern.test(entry)) {
      throw validation(`${label} entries must be fully qualified middleware IDs.`);
    }
    if (seen.has(entry)) throw validation(`${label} contains duplicate target ${entry}.`);
    seen.add(entry);
    result.push(entry);
  }
  return Object.freeze(result);
}

function stagedRecords(
  registrations: readonly StarPluginRequestMiddlewareSet[],
  startOrder: number,
): readonly MiddlewareRecord[] {
  const records: MiddlewareRecord[] = [];
  const ids = new Set<string>();
  for (const registration of registrations) {
    if (!qualifiedIdPattern.test(registration.namespace)) {
      throw validation(`Invalid request middleware plugin namespace: ${registration.namespace}.`);
    }
    if (!Array.isArray(registration.middleware)) {
      throw validation(`Plugin ${registration.namespace} request middleware must be an array.`);
    }
    for (const definition of registration.middleware as readonly unknown[]) {
      if (!plainRecord(definition)) {
        throw validation(`Plugin ${registration.namespace} request middleware must be objects.`);
      }
      exactKeys(
        definition,
        new Set(["id", "before", "after", "handle"]),
        `Plugin ${registration.namespace} request middleware`,
      );
      if (typeof definition.id !== "string" || !middlewareIdPattern.test(definition.id)) {
        throw validation(
          `Plugin ${registration.namespace} request middleware IDs must be lowercase segments.`,
        );
      }
      if (typeof definition.handle !== "function") {
        throw validation(
          `Request middleware ${registration.namespace}.${definition.id} needs a handle.`,
        );
      }
      const id = `${registration.namespace}.${definition.id}`;
      if (ids.has(id)) throw validation(`Duplicate request middleware ID: ${id}.`);
      ids.add(id);
      const before = assertIdList(
        definition.before as readonly string[] | undefined,
        `Request middleware ${id} before`,
      );
      const after = assertIdList(
        definition.after as readonly string[] | undefined,
        `Request middleware ${id} after`,
      );
      if (before.includes(id) || after.includes(id)) {
        throw validation(`Request middleware ${id} cannot order itself.`);
      }
      const conflict = before.find((target) => after.includes(target));
      if (conflict) {
        throw validation(`Request middleware ${id} cannot be both before and after ${conflict}.`);
      }
      records.push({
        id,
        namespace: registration.namespace,
        before,
        after,
        handle: definition.handle as StarRequestMiddleware,
        order: startOrder + records.length,
      });
    }
  }
  return records;
}

function orderedRecords(records: readonly MiddlewareRecord[]): readonly MiddlewareRecord[] {
  const byId = new Map(records.map((record) => [record.id, record]));
  if (byId.size !== records.length) throw validation("Request middleware IDs must be unique.");
  const edges = new Map(records.map((record) => [record.id, new Set<string>()]));
  for (const record of records) {
    for (const target of record.before) {
      if (!byId.has(target)) {
        throw validation(`Request middleware ${record.id} has unknown before target ${target}.`);
      }
      edges.get(record.id)!.add(target);
    }
    for (const target of record.after) {
      if (!byId.has(target)) {
        throw validation(`Request middleware ${record.id} has unknown after target ${target}.`);
      }
      edges.get(target)!.add(record.id);
    }
  }

  const indegree = new Map(records.map((record) => [record.id, 0]));
  for (const targets of edges.values()) {
    for (const target of targets) indegree.set(target, indegree.get(target)! + 1);
  }
  const remaining = new Set(records.map((record) => record.id));
  const result: MiddlewareRecord[] = [];
  while (remaining.size > 0) {
    const next = records.find(
      (record) => remaining.has(record.id) && indegree.get(record.id) === 0,
    );
    if (!next) {
      const cycle = records
        .filter((record) => remaining.has(record.id))
        .sort((left, right) => left.order - right.order)
        .map((record) => record.id);
      throw validation(`Request middleware order contains a cycle: ${cycle.join(", ")}.`);
    }
    remaining.delete(next.id);
    result.push(next);
    for (const target of edges.get(next.id)!) indegree.set(target, indegree.get(target)! - 1);
  }
  return Object.freeze(result);
}

function normalizeHeaders(value: unknown): readonly (readonly [string, string])[] {
  if (!Array.isArray(value)) throw validation("A request descriptor needs a header tuple array.");
  if (value.length > 200) throw validation("A request descriptor has too many headers.");
  const input: Array<[string, string]> = [];
  for (const entry of value as readonly unknown[]) {
    if (!Array.isArray(entry) || entry.length !== 2) {
      throw validation("Request descriptor headers must be name/value tuples.");
    }
    const [name, headerValue] = entry as readonly unknown[];
    if (typeof name !== "string" || typeof headerValue !== "string") {
      throw validation("Request descriptor header names and values must be strings.");
    }
    if (name.length > 256 || headerValue.length > 8_192) {
      throw validation("A request descriptor header exceeds its bounded metadata limit.");
    }
    input.push([name, headerValue]);
  }
  let headers: Headers;
  try {
    headers = new Headers(input);
  } catch (error) {
    throw new StarRequestMiddlewareValidationError(
      "A request descriptor contains an invalid header.",
      {
        cause: error,
      },
    );
  }
  return Object.freeze(
    Array.from(headers, ([name, headerValue]) => Object.freeze([name, headerValue] as const)),
  );
}

function normalizeBody(value: unknown): StarRequestBodyMetadata {
  if (!plainRecord(value)) throw validation("A request descriptor needs body metadata.");
  exactKeys(value, new Set(["kind", "size"]), "Request descriptor body metadata");
  if (!bodyKinds.has(value.kind as StarRequestBodyKind)) {
    throw validation(`Unknown request body kind: ${String(value.kind)}.`);
  }
  if (
    value.size !== undefined &&
    (typeof value.size !== "number" ||
      !Number.isSafeInteger(value.size) ||
      value.size < 0 ||
      value.size > 1_000_000_000)
  ) {
    throw validation("Request body size metadata must be a bounded non-negative integer.");
  }
  return Object.freeze({
    kind: value.kind as StarRequestBodyKind,
    ...(value.size === undefined ? {} : { size: value.size as number }),
  });
}

export function normalizeRequestDescriptor(value: unknown): StarRequestDescriptor {
  if (!plainRecord(value)) throw validation("Request middleware must pass a descriptor object.");
  exactKeys(value, descriptorKeys, "Request descriptor");
  if (value.schema !== "jquery-star-request/1") {
    throw validation("Request descriptor schema must be jquery-star-request/1.");
  }
  if (typeof value.operationId !== "string" || value.operationId === "") {
    throw validation("A request descriptor needs an operation ID.");
  }
  if (!methods.has(value.method as BackendMethod)) {
    throw validation(`Unknown request method: ${String(value.method)}.`);
  }
  if (typeof value.url !== "string") throw validation("A request descriptor needs a URL string.");
  let url: URL;
  try {
    url = new URL(value.url);
  } catch (error) {
    throw new StarRequestMiddlewareValidationError("A request descriptor URL must be absolute.", {
      cause: error,
    });
  }
  if (url.username || url.password) {
    throw validation("Request middleware URLs cannot contain credentials.");
  }
  if (!credentials.has(value.credentials as RequestCredentials)) {
    throw validation(`Unknown request credential mode: ${String(value.credentials)}.`);
  }
  if (typeof value.profile !== "string" || !qualifiedIdPattern.test(value.profile)) {
    throw validation("A request descriptor needs a dot-qualified profile ID.");
  }
  if (value.target !== undefined && typeof value.target !== "string") {
    throw validation("A request descriptor target must be a string.");
  }
  if (
    value.selector !== undefined &&
    value.selector !== null &&
    typeof value.selector !== "string"
  ) {
    throw validation("A request descriptor selector must be a string or null.");
  }
  if (value.mode !== undefined && !patchModes.has(value.mode as PatchMode)) {
    throw validation(`Unknown request patch mode: ${String(value.mode)}.`);
  }
  const descriptor: StarRequestDescriptor = {
    schema: "jquery-star-request/1",
    operationId: value.operationId,
    method: value.method as BackendMethod,
    url: url.href,
    headers: normalizeHeaders(value.headers),
    credentials: value.credentials as RequestCredentials,
    body: normalizeBody(value.body),
    ...(value.target === undefined ? {} : { target: value.target as string }),
    ...(value.selector === undefined ? {} : { selector: value.selector as string | null }),
    ...(value.mode === undefined ? {} : { mode: value.mode as PatchMode }),
    profile: value.profile,
  };
  return Object.freeze(descriptor);
}

function headerMap(headers: readonly (readonly [string, string])[]): ReadonlyMap<string, string> {
  return new Map(headers.map(([name, value]) => [name.toLowerCase(), value]));
}

function sameOptional(left: unknown, right: unknown): boolean {
  return left === right;
}

function assertSelector(root: Element, selector: string | null | undefined, label: string): void {
  if (!selector) return;
  try {
    root.matches(selector);
    root.querySelector(selector);
  } catch (error) {
    throw new StarRequestMiddlewareValidationError(`${label} is not a valid scoped selector.`, {
      cause: error,
    });
  }
}

export function validateRequestDescriptorPolicy(
  authored: StarRequestDescriptor,
  candidate: StarRequestDescriptor,
  root: Element,
): void {
  const originalURL = new URL(authored.url);
  const nextURL = new URL(candidate.url);
  if (nextURL.origin !== originalURL.origin) {
    throw validation("Request middleware cannot change the authored origin.");
  }
  if (nextURL.hash !== originalURL.hash) {
    throw validation("Request middleware cannot change the authored URL fragment.");
  }
  if (candidate.operationId !== authored.operationId) {
    throw validation("Request middleware cannot change the operation ID.");
  }
  if (candidate.method !== authored.method) {
    throw validation("Request middleware cannot change the authored method.");
  }
  if (candidate.credentials !== authored.credentials) {
    throw validation("Request middleware cannot change the authored credential mode.");
  }
  if (candidate.body.kind !== authored.body.kind || candidate.body.size !== authored.body.size) {
    throw validation("Request middleware cannot change the authored body metadata.");
  }
  if (candidate.profile !== authored.profile) {
    throw validation("Request middleware cannot change the authored request profile.");
  }
  if (!sameOptional(candidate.target, authored.target)) {
    throw validation("Request middleware cannot change the authored response target.");
  }
  if (!sameOptional(candidate.selector, authored.selector)) {
    throw validation("Request middleware cannot change the authored form selector.");
  }
  if (!sameOptional(candidate.mode, authored.mode)) {
    throw validation("Request middleware cannot change the authored patch mode.");
  }
  assertSelector(root, candidate.target, "The request response target");
  assertSelector(root, candidate.selector, "The request form selector");

  const originalHeaders = headerMap(authored.headers);
  const nextHeaders = headerMap(candidate.headers);
  for (const [name, value] of originalHeaders) {
    if (nextHeaders.get(name) !== value) {
      throw validation(`Request middleware cannot remove or replace authored header ${name}.`);
    }
  }
  for (const [name, value] of nextHeaders) {
    const original = originalHeaders.get(name);
    if (
      original === undefined &&
      (forbiddenHeaderNames.has(name) || name.startsWith("proxy-") || name.startsWith("sec-"))
    ) {
      throw validation(`Request middleware cannot add browser-owned header ${name}.`);
    }
    if (protectedHeaderNames.has(name) && original !== value) {
      throw validation(`Request middleware cannot change protected header ${name}.`);
    }
  }
}

function freezeOutcome<Outcome extends StarRequestMiddlewareOutcome>(outcome: Outcome): Outcome {
  if (outcome.phase === "failed") Object.freeze(outcome.error);
  return Object.freeze(outcome);
}

function abortPromise(signal: AbortSignal): {
  readonly promise: Promise<typeof ABORTED>;
  readonly release: () => void;
} {
  let aborted!: () => void;
  const promise = new Promise<typeof ABORTED>((resolve) => {
    aborted = () => resolve(ABORTED);
    signal.addEventListener("abort", aborted, { once: true });
  });
  return { promise, release: () => signal.removeEventListener("abort", aborted) };
}

export class RequestMiddlewareRegistry {
  private records: readonly MiddlewareRecord[] = Object.freeze([]);
  private readonly applications = new Set<StarInstance>();
  private nextOrder = 0;
  private disposed = false;

  trackApplication(application: StarInstance): void {
    this.assertActive();
    this.applications.add(application);
    applicationRegistries.set(application, this);
  }

  releaseApplication(application: StarInstance): void {
    this.applications.delete(application);
    if (applicationRegistries.get(application) === this) applicationRegistries.delete(application);
  }

  preparePluginInstall(
    registrations: readonly StarPluginRequestMiddlewareSet[],
  ): PreparedRequestMiddlewareInstall {
    this.assertActive();
    const staged = stagedRecords(registrations, this.nextOrder);
    const existingIds = new Set(this.records.map((record) => record.id));
    const duplicate = staged.find((record) => existingIds.has(record.id));
    if (duplicate) throw validation(`Duplicate request middleware ID: ${duplicate.id}.`);
    const proposed = orderedRecords([...this.records, ...staged]);
    let settled = false;
    const cleanups = new Map<string, () => void>();
    for (const { namespace } of registrations) {
      let active = true;
      cleanups.set(namespace, () => {
        if (!active) return;
        active = false;
        this.records = Object.freeze(
          this.records.filter((record) => record.namespace !== namespace),
        );
      });
    }
    return {
      cleanups,
      commit: () => {
        if (settled) return;
        settled = true;
        this.records = proposed;
        this.nextOrder += staged.length;
      },
      rollback: () => {
        if (settled) return;
        settled = true;
        for (const cleanup of cleanups.values()) cleanup();
      },
    };
  }

  snapshot(): readonly MiddlewareRecord[] {
    this.assertActive();
    return this.records;
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.records = Object.freeze([]);
    for (const application of this.applications) {
      if (applicationRegistries.get(application) === this)
        applicationRegistries.delete(application);
    }
    this.applications.clear();
  }

  private assertActive(): void {
    if (this.disposed)
      throw new Error("This jQStar request middleware registry has been disposed.");
  }
}

export async function executeRequestMiddleware<Value>(
  context: StarContext,
  input: StarRequestDescriptor,
  signal: AbortSignal,
  cancellationReason: () => StarOperationCancellationReason,
  dispatch: RequestMiddlewareDispatch<Value>,
): Promise<RequestMiddlewareExecution<Value>> {
  const authored = normalizeRequestDescriptor(input);
  const records = applicationRegistries.get(context.instance)?.snapshot() ?? [];
  const privateOutcomes = new WeakMap<StarRequestMiddlewareOutcome, PrivateOutcome<Value>>();

  const requestCancellation = (descriptor: StarRequestDescriptor): StarRequestMiddlewareOutcome => {
    const outcome = freezeOutcome<StarRequestMiddlewareCancelledOutcome>({
      phase: "cancelled",
      source: "request",
      reason: cancellationReason(),
    });
    privateOutcomes.set(outcome, { descriptor });
    return outcome;
  };

  const settleDispatch = async (
    descriptor: StarRequestDescriptor,
  ): Promise<StarRequestMiddlewareOutcome> => {
    if (signal.aborted) return requestCancellation(descriptor);
    validateRequestDescriptorPolicy(authored, descriptor, context.root);
    if (signal.aborted) return requestCancellation(descriptor);
    try {
      const settlement = await dispatch(descriptor);
      if (settlement.phase === "cancelled") {
        const outcome = freezeOutcome<StarRequestMiddlewareCancelledOutcome>({
          phase: "cancelled",
          source: "request",
          reason: settlement.reason,
        });
        privateOutcomes.set(outcome, { descriptor });
        return outcome;
      }
      const outcome = freezeOutcome<StarRequestMiddlewareCompletedOutcome>({
        phase: "completed",
        source: "dispatch",
        status: settlement.status,
      });
      privateOutcomes.set(outcome, { descriptor, value: settlement.value });
      return outcome;
    } catch (error) {
      const outcome = freezeOutcome<StarRequestMiddlewareFailedOutcome>({
        phase: "failed",
        source: "dispatch",
        error: normalizedError(error),
      });
      privateOutcomes.set(outcome, { descriptor, error });
      return outcome;
    }
  };

  const settleMiddlewareFailure = (
    descriptor: StarRequestDescriptor,
    error: unknown,
  ): StarRequestMiddlewareFailedOutcome => {
    const outcome = freezeOutcome<StarRequestMiddlewareFailedOutcome>({
      phase: "failed",
      source: "middleware",
      error: normalizedError(error),
    });
    privateOutcomes.set(outcome, { descriptor, error });
    return outcome;
  };

  const invoke = async (
    index: number,
    descriptor: StarRequestDescriptor,
  ): Promise<StarRequestMiddlewareOutcome> => {
    if (signal.aborted) return requestCancellation(descriptor);
    const record = records[index];
    if (!record) return settleDispatch(descriptor);

    let nextCalled = false;
    let closed = false;
    let nextPromise: Promise<StarRequestMiddlewareOutcome> | undefined;
    let downstream: StarRequestMiddlewareOutcome | undefined;
    const ownedOutcomes = new WeakSet<StarRequestMiddlewareOutcome>();
    const middlewareContext = Object.freeze<StarRequestMiddlewareContext>({
      id: record.id,
      signal,
      complete: () => {
        const outcome = freezeOutcome<StarRequestMiddlewareCompletedOutcome>({
          phase: "completed",
          source: "middleware",
        });
        ownedOutcomes.add(outcome);
        privateOutcomes.set(outcome, { descriptor });
        return outcome;
      },
      cancel: () => {
        const outcome = freezeOutcome<StarRequestMiddlewareCancelledOutcome>({
          phase: "cancelled",
          source: "middleware",
          reason: "aborted",
        });
        ownedOutcomes.add(outcome);
        privateOutcomes.set(outcome, { descriptor });
        return outcome;
      },
    });
    const next: StarRequestMiddlewareNext = (nextDescriptor = descriptor) => {
      if (closed) {
        throw new StarRequestMiddlewareNextError(
          `Request middleware ${record.id} called next() after its invocation settled.`,
        );
      }
      if (nextCalled) {
        throw new StarRequestMiddlewareNextError(
          `Request middleware ${record.id} called next() more than once.`,
        );
      }
      nextCalled = true;
      let pending: Promise<StarRequestMiddlewareOutcome>;
      if (signal.aborted) pending = Promise.resolve(requestCancellation(descriptor));
      else {
        let normalized: StarRequestDescriptor;
        try {
          normalized = normalizeRequestDescriptor(nextDescriptor);
        } catch (error) {
          pending = Promise.resolve(settleMiddlewareFailure(descriptor, error));
          nextPromise = pending.then((outcome) => {
            downstream = outcome;
            return outcome;
          });
          return nextPromise;
        }
        pending = invoke(index + 1, normalized);
      }
      nextPromise = pending.then((outcome) => {
        downstream = outcome;
        return outcome;
      });
      return nextPromise;
    };

    const handle = record.handle;
    const middlewareResult = Promise.resolve().then(() =>
      handle(descriptor, next, middlewareContext),
    );
    const aborted = abortPromise(signal);
    try {
      const raced = await Promise.race([middlewareResult, aborted.promise]);
      if (raced === ABORTED) {
        void middlewareResult.catch(() => undefined);
        return requestCancellation(descriptor);
      }
      if (nextPromise) await nextPromise;
      if (nextCalled) {
        if (raced !== downstream) {
          throw validation(
            `Request middleware ${record.id} must return the exact outcome received from next().`,
          );
        }
        return raced;
      }
      if (!ownedOutcomes.has(raced)) {
        throw validation(
          `Request middleware ${record.id} returned a forged or stale terminal outcome.`,
        );
      }
      return raced;
    } catch (error) {
      return settleMiddlewareFailure(descriptor, error);
    } finally {
      closed = true;
      aborted.release();
    }
  };

  const outcome = await invoke(0, authored);
  const privateOutcome = privateOutcomes.get(outcome);
  if (!privateOutcome) throw validation("Request middleware produced an unowned outcome.");
  if (outcome.phase === "failed") throw privateOutcome.error;
  if (outcome.phase === "cancelled") {
    return {
      phase: "cancelled",
      source: outcome.source,
      descriptor: privateOutcome.descriptor,
      reason: outcome.reason,
    };
  }
  if (outcome.source === "middleware") {
    return {
      phase: "completed",
      source: "middleware",
      descriptor: privateOutcome.descriptor,
    };
  }
  return {
    phase: "completed",
    source: "dispatch",
    descriptor: privateOutcome.descriptor,
    value: privateOutcome.value as Value,
    status: outcome.status!,
  };
}

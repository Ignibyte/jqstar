import { StarResponseError } from "./errors";
import type { StarDOMWindow, StarFlushWork } from "./types";

export interface StarCapturedRequest {
  readonly body: string | null;
  readonly headers: readonly (readonly [string, string])[];
  readonly method: string;
  readonly signal: AbortSignal;
  readonly url: string;
}

export interface StarResponseRequest {
  readonly body?: string | RegExp;
  readonly headers?: Readonly<Record<string, string>>;
  readonly method?: string;
  readonly url: string | RegExp;
}

export interface StarStaticResponse {
  readonly body?: BodyInit | null;
  readonly headers?: HeadersInit;
  readonly status?: number;
  readonly statusText?: string;
}

export type StarResponseFixture =
  | {
      readonly kind: "response";
      readonly response: StarStaticResponse | Response | (() => Response | PromiseLike<Response>);
    }
  | { readonly kind: "network-error"; readonly message?: string }
  | { readonly kind: "delay"; readonly delayMs: number; readonly response: StarResponseFixture }
  | { readonly kind: "abort" };

export interface StarResponseExpectation extends StarResponseRequest {
  readonly response: StarResponseFixture;
}

interface PendingResponse {
  readonly id: string;
  readonly owner: string;
  cancel: () => void;
  promise: Promise<unknown>;
}

interface InstalledFetch {
  readonly descriptor: PropertyDescriptor | undefined;
  readonly target: object;
}

export interface StarResponseController {
  enqueue(expectation: StarResponseExpectation): StarResponseController;
  json(
    request: StarResponseRequest,
    value: unknown,
    init?: Omit<StarStaticResponse, "body">,
  ): StarResponseController;
  html(
    request: StarResponseRequest,
    value: string,
    init?: Omit<StarStaticResponse, "body">,
  ): StarResponseController;
  empty(
    request: StarResponseRequest,
    init?: Omit<StarStaticResponse, "body">,
  ): StarResponseController;
  httpError(
    request: StarResponseRequest,
    status: number,
    body?: BodyInit | null,
    init?: Omit<StarStaticResponse, "body" | "status">,
  ): StarResponseController;
  networkError(request: StarResponseRequest, message?: string): StarResponseController;
  delay(
    request: StarResponseRequest,
    delayMs: number,
    response: StarResponseFixture,
  ): StarResponseController;
  retry(
    request: StarResponseRequest,
    responses: readonly StarResponseFixture[],
  ): StarResponseController;
  abort(request: StarResponseRequest): StarResponseController;
  install(target?: object): () => void;
  requests(): readonly StarCapturedRequest[];
  remaining(): number;
  outstanding(): readonly StarFlushWork[];
  settle(): Promise<void>;
  assertSatisfied(): void;
  dispose(): void;
}

function frozenRequest(request: StarCapturedRequest): StarCapturedRequest {
  return Object.freeze({
    ...request,
    headers: Object.freeze(request.headers.map((entry) => Object.freeze(entry))),
  });
}

function fixtureResponse(response: StarStaticResponse): Response {
  return new Response(response.body ?? null, {
    ...(response.headers ? { headers: response.headers } : {}),
    status: response.status ?? 200,
    ...(response.statusText ? { statusText: response.statusText } : {}),
  });
}

function validateDelay(delayMs: number): void {
  if (!Number.isFinite(delayMs) || delayMs < 0 || delayMs > 60_000) {
    throw new TypeError("A response delay must be between 0 and 60000 milliseconds.");
  }
}

function expectedHeaders(headers: Readonly<Record<string, string>> | undefined): Headers {
  return new Headers(headers);
}

function matchesExpectation(
  expectation: StarResponseExpectation,
  request: StarCapturedRequest,
): string | undefined {
  const method = (expectation.method ?? "GET").toUpperCase();
  if (request.method !== method) return `expected ${method}, received ${request.method}`;
  const urlMatches =
    typeof expectation.url === "string"
      ? request.url === expectation.url
      : ((expectation.url.lastIndex = 0), expectation.url.test(request.url));
  if (!urlMatches) return `expected URL ${String(expectation.url)}, received ${request.url}`;
  if (expectation.body !== undefined) {
    const body = request.body ?? "";
    const bodyMatches =
      typeof expectation.body === "string"
        ? body === expectation.body
        : ((expectation.body.lastIndex = 0), expectation.body.test(body));
    if (!bodyMatches) return "request body did not match the queued expectation";
  }
  const actualHeaders = new Headers(request.headers as [string, string][]);
  for (const [name, value] of expectedHeaders(expectation.headers)) {
    if (actualHeaders.get(name) !== value) return `request header ${name} did not match`;
  }
  return undefined;
}

function abortError(): DOMException {
  return new DOMException("The queued response was aborted.", "AbortError");
}

async function capturedBody(body: BodyInit | null | undefined): Promise<string | null> {
  if (body === undefined || body === null) return null;
  if (typeof body === "string") return body;
  if (body instanceof URLSearchParams) return body.toString();
  if (body instanceof Blob) return body.text();
  return String(body);
}

export function responseFixture(
  response: StarStaticResponse | Response | (() => Response | PromiseLike<Response>),
): StarResponseFixture {
  return Object.freeze({ kind: "response", response });
}

export function networkErrorFixture(message = "The queued request failed."): StarResponseFixture {
  return Object.freeze({ kind: "network-error", message });
}

export function delayFixture(delayMs: number, response: StarResponseFixture): StarResponseFixture {
  validateDelay(delayMs);
  return Object.freeze({ kind: "delay", delayMs, response });
}

export function abortFixture(): StarResponseFixture {
  return Object.freeze({ kind: "abort" });
}

export function createResponseController(
  options: { readonly window?: StarDOMWindow } = {},
): StarResponseController {
  const queue: StarResponseExpectation[] = [];
  const captured: StarCapturedRequest[] = [];
  const pending = new Map<string, PendingResponse>();
  const installations: InstalledFetch[] = [];
  let requestId = 0;
  let disposed = false;

  const assertActive = (): void => {
    if (disposed) throw new StarResponseError("This response controller has been disposed.");
  };

  const settleFixture = async (
    fixture: StarResponseFixture,
    request: StarCapturedRequest,
    id: string,
  ): Promise<Response> => {
    if (request.signal.aborted) throw abortError();
    if (fixture.kind === "response") {
      const value =
        typeof fixture.response === "function" ? await fixture.response() : fixture.response;
      return value instanceof Response ? value : fixtureResponse(value);
    }
    if (fixture.kind === "network-error") {
      throw new TypeError(fixture.message ?? "The queued request failed.");
    }
    if (fixture.kind === "abort") {
      return await new Promise<Response>((_resolve, reject) => {
        const fail = (): void => reject(abortError());
        request.signal.addEventListener("abort", fail, { once: true });
        pending.get(id)!.cancel = fail;
      });
    }

    validateDelay(fixture.delayMs);
    return await new Promise<Response>((resolve, reject) => {
      const timer = (options.window ?? globalThis).setTimeout(() => {
        request.signal.removeEventListener("abort", cancel);
        void settleFixture(fixture.response, request, id).then(resolve, reject);
      }, fixture.delayMs);
      const cancel = (): void => {
        (options.window ?? globalThis).clearTimeout(timer);
        reject(abortError());
      };
      request.signal.addEventListener("abort", cancel, { once: true });
      pending.get(id)!.cancel = cancel;
    });
  };

  const fetchStub = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    assertActive();
    const source =
      typeof input === "object" && input !== null && "url" in input
        ? (input as Request)
        : undefined;
    const method = (init?.method ?? source?.method ?? "GET").toUpperCase();
    const headers = new Headers(source?.headers);
    if (init?.headers) {
      for (const [name, value] of new Headers(init.headers)) headers.set(name, value);
    }
    const signal = init?.signal ?? source?.signal ?? new AbortController().signal;
    const body = ["GET", "HEAD"].includes(method)
      ? null
      : await capturedBody(init?.body ?? (source ? await source.clone().text() : null));
    const request = frozenRequest({
      body,
      headers: [...headers.entries()].sort(([left], [right]) => left.localeCompare(right)),
      method,
      signal,
      url: source?.url ?? String(input),
    });
    captured.push(request);
    const expectation = queue.shift();
    if (!expectation)
      throw new StarResponseError(`Unexpected request: ${request.method} ${request.url}.`);
    const mismatch = matchesExpectation(expectation, request);
    if (mismatch) throw new StarResponseError(`Queued request mismatch: ${mismatch}.`);

    const id = `response-${++requestId}`;
    const record: PendingResponse = {
      id,
      owner: `response:${request.method}:${new URL(request.url).pathname}`,
      cancel: () => undefined,
      promise: Promise.resolve(),
    };
    pending.set(id, record);
    const promise = settleFixture(expectation.response, request, id);
    record.promise = promise;
    try {
      return await promise;
    } finally {
      pending.delete(id);
    }
  };

  const controller: StarResponseController = {
    enqueue(expectation) {
      assertActive();
      if (!expectation || typeof expectation !== "object") {
        throw new TypeError("A queued response expectation must be an object.");
      }
      queue.push(Object.freeze({ ...expectation }));
      return controller;
    },
    json(request, value, init = {}) {
      return controller.enqueue({
        ...request,
        response: responseFixture({
          ...init,
          body: JSON.stringify(value),
          headers: new Headers({
            "content-type": "application/json",
            ...Object.fromEntries(new Headers(init.headers)),
          }),
        }),
      });
    },
    html(request, value, init = {}) {
      return controller.enqueue({
        ...request,
        response: responseFixture({
          ...init,
          body: value,
          headers: new Headers({
            "content-type": "text/html",
            ...Object.fromEntries(new Headers(init.headers)),
          }),
        }),
      });
    },
    empty(request, init = {}) {
      return controller.enqueue({
        ...request,
        response: responseFixture({ ...init, body: null, status: init.status ?? 204 }),
      });
    },
    httpError(request, status, body = null, init = {}) {
      if (!Number.isInteger(status) || status < 400 || status > 599) {
        throw new TypeError("An HTTP error fixture needs a status from 400 through 599.");
      }
      return controller.enqueue({
        ...request,
        response: responseFixture({ ...init, body, status }),
      });
    },
    networkError(request, message) {
      return controller.enqueue({ ...request, response: networkErrorFixture(message) });
    },
    delay(request, delayMs, response) {
      return controller.enqueue({ ...request, response: delayFixture(delayMs, response) });
    },
    retry(request, responses) {
      if (responses.length < 2)
        throw new TypeError("A retry fixture needs at least two responses.");
      for (const response of responses) controller.enqueue({ ...request, response });
      return controller;
    },
    abort(request) {
      return controller.enqueue({ ...request, response: abortFixture() });
    },
    install(target = globalThis) {
      assertActive();
      if (installations.some((record) => record.target === target)) {
        throw new StarResponseError("This response controller already owns fetch on the target.");
      }
      const descriptor = Object.getOwnPropertyDescriptor(target, "fetch");
      Object.defineProperty(target, "fetch", {
        configurable: true,
        enumerable: descriptor?.enumerable ?? true,
        value: fetchStub,
        writable: true,
      });
      const record = { descriptor, target };
      installations.push(record);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        const index = installations.indexOf(record);
        if (index >= 0) installations.splice(index, 1);
        if (descriptor) Object.defineProperty(target, "fetch", descriptor);
        else Reflect.deleteProperty(target, "fetch");
      };
    },
    requests: () => Object.freeze([...captured]),
    remaining: () => queue.length,
    outstanding: () =>
      Object.freeze(
        [...pending.values()].map(({ id, owner }) =>
          Object.freeze({ category: "request" as const, id, owner }),
        ),
      ),
    settle: async () => {
      const snapshot = [...pending.values()].map(({ promise }) => promise);
      await Promise.all(snapshot);
    },
    assertSatisfied() {
      if (queue.length > 0) {
        throw new StarResponseError(
          `${queue.length} queued response expectation${queue.length === 1 ? " remains" : "s remain"}.`,
        );
      }
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const errors: unknown[] = [];
      for (const record of [...pending.values()]) {
        try {
          record.cancel();
        } catch (error) {
          errors.push(error);
        }
      }
      for (const installation of [...installations].reverse()) {
        try {
          if (installation.descriptor) {
            Object.defineProperty(installation.target, "fetch", installation.descriptor);
          } else Reflect.deleteProperty(installation.target, "fetch");
        } catch (error) {
          errors.push(error);
        }
      }
      installations.length = 0;
      if (queue.length > 0) {
        errors.push(
          new StarResponseError(
            `${queue.length} queued response expectation${queue.length === 1 ? " was" : "s were"} not used.`,
          ),
        );
      }
      queue.length = 0;
      if (errors.length > 0) throw new AggregateError(errors, "jQStar response cleanup failed.");
    },
  };
  return Object.freeze(controller);
}

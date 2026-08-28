import JSON5 from "json5";
import { patchElements, patchSignals } from "./patch";
import { SSEParser, sseDataFields } from "./sse";
import type {
  BackendActionOptions,
  BackendMethod,
  ComputedRecord,
  FetchLifecycleDetail,
  PatchMode,
  PatchNamespace,
  SSEMessage,
  SignalFilter,
  StarAction,
  StarContext,
  StateRecord,
} from "./types";

interface ActiveRequest {
  controller: AbortController;
  cancelOnCleanup: boolean;
}

const activeByElement = new WeakMap<Element, Map<string, ActiveRequest>>();
const activeByRoot = new WeakMap<Element, Set<AbortController>>();

function isPlainObject(value: unknown): value is Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value) as object | null;
  return prototype === Object.prototype || prototype === null;
}

function matches(pattern: RegExp | undefined, value: string, fallback: boolean): boolean {
  if (!pattern) return fallback;
  pattern.lastIndex = 0;
  return pattern.test(value);
}

function filteredSignals(
  state: StateRecord,
  filter: SignalFilter = {},
  parentPath = "",
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(state)) {
    const path = parentPath ? `${parentPath}.${key}` : key;
    if (matches(filter.exclude, path, /(^_|\._)/.test(path))) continue;

    if (isPlainObject(value)) {
      const nested = filteredSignals(value, filter, path);
      if (Object.keys(nested).length > 0) result[key] = nested;
      continue;
    }

    if (matches(filter.include, path, true)) result[key] = value;
  }

  return result;
}

function writePath(target: object, path: string, value: unknown): void {
  const keys = path.split(".").filter(Boolean);
  const finalKey = keys.pop();
  if (!finalKey) throw new Error("A request state path cannot be empty.");

  let parent = target as Record<string, unknown>;
  for (const key of keys) {
    if (!isPlainObject(parent[key])) parent[key] = {};
    parent = parent[key] as Record<string, unknown>;
  }
  parent[finalKey] = value;
}

function lifecycleEvent(
  context: StarContext,
  name: "datastar-fetch" | "jquery-star:fetch",
  detail: FetchLifecycleDetail,
): void {
  const event = context.$.Event(name);
  Object.defineProperty(event, "detail", { value: detail, configurable: true });
  (context.$element ?? context.$root).trigger(event, [detail]);
}

function emitLifecycle(context: StarContext, detail: FetchLifecycleDetail): void {
  lifecycleEvent(context, "datastar-fetch", detail);
  lifecycleEvent(context, "jquery-star:fetch", detail);
}

function emitSSE(context: StarContext, message: SSEMessage): void {
  const event = context.$.Event("jquery-star:sse");
  Object.defineProperty(event, "detail", { value: message, configurable: true });
  (context.$element ?? context.$root).trigger(event, [message]);
}

function formFor(context: StarContext, selector: string | null | undefined): HTMLFormElement {
  const candidate = selector
    ? context.root.matches(selector)
      ? context.root
      : context.root.querySelector(selector)
    : context.element?.closest("form");
  if (!(candidate instanceof HTMLFormElement))
    throw new Error("The backend action could not find its form.");
  if (!candidate.reportValidity()) throw new Error("The form is invalid.");
  return candidate;
}

function appendFormToURL(url: URL, formData: FormData): void {
  for (const [key, value] of formData.entries()) {
    url.searchParams.append(key, typeof value === "string" ? value : value.name);
  }
}

function requestBody(
  method: BackendMethod,
  url: URL,
  headers: Headers,
  context: StarContext,
  options: BackendActionOptions,
): BodyInit | undefined {
  for (const [key, value] of Object.entries(options.params ?? {})) {
    if (value !== null && value !== undefined) url.searchParams.set(key, String(value));
  }

  if (options.contentType === "form") {
    const form = formFor(context, options.selector);
    const formData = new FormData(form);
    if (method === "GET") {
      appendFormToURL(url, formData);
      return undefined;
    }
    if (form.enctype === "multipart/form-data") return formData;

    const encoded = new URLSearchParams();
    for (const [key, value] of formData.entries()) {
      encoded.append(key, typeof value === "string" ? value : value.name);
    }
    headers.set("Content-Type", "application/x-www-form-urlencoded;charset=UTF-8");
    return encoded;
  }

  const payload =
    typeof options.payload === "function"
      ? options.payload(context)
      : (options.payload ?? filteredSignals(context.state, options.filterSignals));
  const serialized = JSON.stringify(payload);
  if (method === "GET") {
    url.searchParams.set("datastar", serialized);
    return undefined;
  }

  // The TypeScript SDK reads DELETE signals from the query string while other
  // Datastar SDKs follow the JSON-body convention. Sending both keeps the
  // request readable by either implementation.
  if (method === "DELETE") url.searchParams.set("datastar", serialized);

  headers.set("Content-Type", "application/json");
  return serialized;
}

function controllerFor(
  context: StarContext,
  key: string,
  cancellation: BackendActionOptions["requestCancellation"],
): AbortController {
  const custom = cancellation instanceof AbortController ? cancellation : undefined;
  const controller = custom ?? new AbortController();

  if (cancellation !== "disabled" && !custom) {
    const element = context.element ?? context.root;
    let requests = activeByElement.get(element);
    if (!requests) {
      requests = new Map();
      activeByElement.set(element, requests);
    }
    requests.get(key)?.controller.abort("superseded");
    requests.set(key, {
      controller,
      cancelOnCleanup: cancellation === "cleanup",
    });
  }

  let rootRequests = activeByRoot.get(context.root);
  if (!rootRequests) {
    rootRequests = new Set();
    activeByRoot.set(context.root, rootRequests);
  }
  rootRequests.add(controller);
  return controller;
}

function releaseController(context: StarContext, key: string, controller: AbortController): void {
  const element = context.element ?? context.root;
  const requests = activeByElement.get(element);
  if (requests?.get(key)?.controller === controller) requests.delete(key);
  activeByRoot.get(context.root)?.delete(controller);
}

export function cancelElementRequests(element: Element): void {
  const requests = activeByElement.get(element);
  if (!requests) return;
  for (const [key, request] of requests) {
    if (!request.cancelOnCleanup) continue;
    request.controller.abort("cleanup");
    requests.delete(key);
  }
  if (requests.size === 0) activeByElement.delete(element);
}

export function cancelRequests(root: Element): void {
  const requests = activeByRoot.get(root);
  if (!requests) return;
  for (const controller of requests) controller.abort("cleanup");
  requests.clear();
  activeByRoot.delete(root);
}

function wait(delay: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException("The request was aborted.", "AbortError"));
      return;
    }
    const aborted = (): void => {
      clearTimeout(timer);
      reject(new DOMException("The request was aborted.", "AbortError"));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener("abort", aborted);
      resolve();
    }, delay);
    signal.addEventListener("abort", aborted, { once: true });
  });
}

function isAbort(error: unknown, signal: AbortSignal): boolean {
  return signal.aborted || (error instanceof DOMException && error.name === "AbortError");
}

function retryable(
  retry: BackendActionOptions["retry"],
  response: Response | undefined,
  error: unknown,
): boolean {
  const mode = retry ?? "auto";
  if (mode === "never") return false;
  if (response) {
    if (mode === "error") return response.status >= 400;
    if (mode === "always") return response.status !== 204 && !response.redirected;
    return false;
  }
  return error !== undefined;
}

async function cancelBody(response: Response | undefined): Promise<void> {
  try {
    await response?.body?.cancel();
  } catch {
    // The original request outcome is more useful than a body cleanup failure.
  }
}

async function waitUntilVisible(signal: AbortSignal): Promise<void> {
  if (document.visibilityState !== "hidden") return;
  await new Promise<void>((resolve, reject) => {
    const visible = (): void => {
      if (document.visibilityState !== "hidden") {
        document.removeEventListener("visibilitychange", visible);
        signal.removeEventListener("abort", aborted);
        resolve();
      }
    };
    const aborted = (): void => {
      document.removeEventListener("visibilitychange", visible);
      reject(new DOMException("The request was aborted.", "AbortError"));
    };
    document.addEventListener("visibilitychange", visible);
    signal.addEventListener("abort", aborted, { once: true });
  });
}

async function readText(
  response: Response,
  context: StarContext,
  detail: Omit<FetchLifecycleDetail, "type">,
): Promise<string> {
  if (!response.body) return response.text();

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const totalHeader = response.headers.get("Content-Length");
  const total = totalHeader ? Number(totalHeader) : undefined;
  let loaded = 0;
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.byteLength;
    text += decoder.decode(value, { stream: true });
    emitLifecycle(context, {
      ...detail,
      type: "progress",
      loaded,
      ...(total !== undefined && Number.isFinite(total) ? { total } : {}),
      response,
    });
  }
  return text + decoder.decode();
}

function first(fields: Map<string, string[]>, key: string): string | undefined {
  return fields.get(key)?.[0];
}

function booleanField(fields: Map<string, string[]>, key: string): boolean {
  return first(fields, key) === "true";
}

function handleSSEMessage(context: StarContext, message: SSEMessage): void {
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
    patchElements(context.root, elements, {
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
    if (!isPlainObject(signals)) throw new Error("A signal patch must contain an object.");
    patchSignals(context.state, signals, {
      onlyIfMissing: booleanField(fields, "onlyIfMissing"),
    });
    return;
  }

  emitSSE(context, message);
}

async function readSSE(
  response: Response,
  context: StarContext,
  detail: Omit<FetchLifecycleDetail, "type">,
): Promise<void> {
  if (!response.body) {
    const parser = new SSEParser();
    for (const message of [...parser.feed(await response.text()), ...parser.finish()]) {
      handleSSEMessage(context, message);
    }
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = new SSEParser();
  const totalHeader = response.headers.get("Content-Length");
  const total = totalHeader ? Number(totalHeader) : undefined;
  let loaded = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    loaded += value.byteLength;
    for (const message of parser.feed(decoder.decode(value, { stream: true }))) {
      handleSSEMessage(context, message);
    }
    emitLifecycle(context, {
      ...detail,
      type: "progress",
      loaded,
      ...(total !== undefined && Number.isFinite(total) ? { total } : {}),
      response,
    });
  }

  for (const message of [...parser.feed(decoder.decode()), ...parser.finish()]) {
    handleSSEMessage(context, message);
  }
}

async function handleResponse(
  response: Response,
  context: StarContext,
  options: BackendActionOptions,
  detail: Omit<FetchLifecycleDetail, "type">,
): Promise<void> {
  if (response.status === 204) return;
  const contentType =
    response.headers.get("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() ?? "";

  if (contentType === "text/event-stream") {
    await readSSE(response, context, detail);
    return;
  }

  const source = await readText(response, context, detail);
  if (contentType === "application/json" || contentType.endsWith("+json")) {
    const patch = JSON.parse(source) as unknown;
    if (!isPlainObject(patch)) throw new Error("A JSON response must contain a signal object.");
    patchSignals(context.state, patch, {
      onlyIfMissing: response.headers.get("datastar-only-if-missing") === "true",
    });
    return;
  }

  if (contentType === "text/html" || contentType === "application/xhtml+xml") {
    const selector = options.target ?? response.headers.get("datastar-selector") ?? undefined;
    const headerMode = response.headers.get("datastar-mode") as PatchMode | null;
    const mode = options.mode ?? headerMode ?? undefined;
    patchElements(context.root, source, {
      ...(selector ? { selector } : {}),
      ...(mode ? { mode } : {}),
      useViewTransition: response.headers.get("datastar-use-view-transition") === "true",
    });
    return;
  }

  if (source.trim() !== "") {
    throw new Error(`Unsupported backend response content type: ${contentType || "missing"}.`);
  }
}

export async function executeBackendRequest(
  method: BackendMethod,
  inputURL: string,
  options: BackendActionOptions,
  context: StarContext,
): Promise<Response | undefined> {
  const url = new URL(inputURL, document.baseURI);
  const headers = new Headers(options.headers);
  headers.set("Datastar-Request", "true");
  if (!headers.has("Accept")) {
    headers.set("Accept", "text/event-stream, text/html, application/json");
  }
  const body = requestBody(method, url, headers, context, options);
  const key = `${method} ${url.href}`;
  const controller = controllerFor(context, key, options.requestCancellation ?? "auto");
  const maxRetries = Math.max(0, options.retryMaxCount ?? 10);
  const baseInterval = Math.max(0, options.retryInterval ?? 1_000);
  const scaler = Math.max(1, options.retryScaler ?? 2);
  const maxWait = Math.max(0, options.retryMaxWait ?? 30_000);

  if (options.pending) writePath(context.state, options.pending, true);
  if (options.error) writePath(context.state, options.error, null);

  let attempt = 0;
  let finalError: unknown;

  try {
    if (method === "GET" && options.openWhenHidden !== true) {
      try {
        await waitUntilVisible(controller.signal);
      } catch (error) {
        if (!isAbort(error, controller.signal)) throw error;
        emitLifecycle(context, {
          method,
          url: url.href,
          attempt: 0,
          type: "finished",
          aborted: true,
        });
        return undefined;
      }
    }

    while (attempt <= maxRetries) {
      attempt += 1;
      const baseDetail = { method, url: url.href, attempt } as const;
      emitLifecycle(context, { ...baseDetail, type: "started" });
      let response: Response | undefined;
      let requestError: unknown;

      try {
        response = await fetch(url, {
          method,
          headers,
          ...(body !== undefined ? { body } : {}),
          signal: controller.signal,
          credentials: options.credentials ?? "same-origin",
        });

        if (response.ok) {
          await handleResponse(response, context, options, baseDetail);
          if (!retryable(options.retry, response, undefined)) {
            emitLifecycle(context, { ...baseDetail, type: "finished", response });
            return response;
          }
          requestError = new Error(
            "The backend action is configured to retry completed responses.",
          );
        } else {
          requestError = new Error(
            `Backend request failed with ${response.status} ${response.statusText}.`,
          );
        }
      } catch (error) {
        requestError = error;
      }

      if (isAbort(requestError, controller.signal)) {
        emitLifecycle(context, {
          ...baseDetail,
          type: "finished",
          ...(response ? { response } : {}),
          aborted: true,
        });
        return undefined;
      }

      finalError = requestError;
      const willRetry = attempt <= maxRetries && retryable(options.retry, response, requestError);
      await cancelBody(response);
      if (!willRetry) break;

      emitLifecycle(context, {
        ...baseDetail,
        type: "retrying",
        ...(response ? { response } : {}),
        error: requestError,
      });
      try {
        await wait(Math.min(maxWait, baseInterval * scaler ** (attempt - 1)), controller.signal);
      } catch (error) {
        if (!isAbort(error, controller.signal)) throw error;
        emitLifecycle(context, {
          ...baseDetail,
          type: "finished",
          ...(response ? { response } : {}),
          aborted: true,
        });
        return undefined;
      }
    }

    const failedDetail = { method, url: url.href, attempt, error: finalError } as const;
    emitLifecycle(context, { ...failedDetail, type: "retries-failed" });
    emitLifecycle(context, { ...failedDetail, type: "error" });
    if (options.error) {
      writePath(
        context.state,
        options.error,
        finalError instanceof Error ? finalError.message : String(finalError),
      );
    }
    throw finalError;
  } finally {
    if (options.pending) writePath(context.state, options.pending, false);
    releaseController(context, key, controller);
  }
}

export function createBackendAction<
  State extends StateRecord = StateRecord,
  Computed extends ComputedRecord = ComputedRecord,
>(
  method: BackendMethod,
  url: string,
  options: BackendActionOptions<State, Computed> = {},
): StarAction<State, Computed> {
  return (context) =>
    executeBackendRequest(
      method,
      url,
      options as BackendActionOptions,
      context as unknown as StarContext,
    );
}

export function dynamicBackendAction(method: BackendMethod): StarAction {
  return (context) => {
    const [url, options = {}] = context.args ?? [];
    if (typeof url !== "string" || url.trim() === "") {
      throw new Error(`@${method.toLowerCase()} requires a URL.`);
    }
    if (!isPlainObject(options)) throw new Error("Backend action options must be an object.");
    return executeBackendRequest(method, url, options as BackendActionOptions, context);
  };
}

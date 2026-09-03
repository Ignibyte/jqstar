import { patchElements, patchSignals } from "./patch";
import {
  beginRequestOperation,
  operationCancellationReason,
  type StarOperationCancellationReason,
} from "./observation";
import { executeRequestMiddleware } from "./request-middleware";
import { genericProtocolProfile } from "./protocol-generic";
import {
  executeProtocolResponse,
  prepareProtocolRequest,
  selectProtocolProfile,
  type ProtocolRequestFormSource,
  type StarProtocolProfileDefinition,
  type StarProtocolResponseCapabilities,
  type StarProtocolSerializedPayload,
} from "./protocol";
import type {
  BackendActionOptions,
  BackendMethod,
  ComputedRecord,
  FetchLifecycleDetail,
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

const officialProtocolProfiles = Object.freeze([genericProtocolProfile]);

type RequestTerminal =
  | { readonly phase: "completed"; readonly attempt: number; readonly status?: number }
  | {
      readonly phase: "cancelled";
      readonly attempt: number;
      readonly reason: StarOperationCancellationReason;
    }
  | {
      readonly phase: "failed";
      readonly attempt: number;
      readonly error: unknown;
      readonly status?: number;
    };

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
    if (matches(filter.exclude, path, key.startsWith("_"))) continue;

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

function emitLifecycle(
  profile: StarProtocolProfileDefinition,
  context: StarContext,
  detail: FetchLifecycleDetail,
): void {
  for (const name of profile.compatibilityEvents) lifecycleEvent(context, name, detail);
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

function requestForm(
  context: StarContext,
  options: BackendActionOptions,
): ProtocolRequestFormSource | undefined {
  if (options.contentType !== "form") return undefined;
  const form = formFor(context, options.selector);
  return {
    data: new FormData(form),
    encoding: form.enctype === "multipart/form-data" ? "multipart" : "urlencoded",
  };
}

function requestPayload(
  context: StarContext,
  options: BackendActionOptions,
  form: ProtocolRequestFormSource | undefined,
): { readonly payload: StarProtocolSerializedPayload; readonly signalsJSON: string } {
  if (form) {
    return {
      payload: Object.freeze({ explicit: false, json: "null" }),
      signalsJSON: "{}",
    };
  }
  const signals = filteredSignals(context.state, options.filterSignals);
  const explicit = options.payload !== undefined;
  const value = explicit
    ? typeof options.payload === "function"
      ? options.payload(context)
      : options.payload
    : signals;
  return {
    payload: Object.freeze({ explicit, json: JSON.stringify(value) }),
    signalsJSON: JSON.stringify(signals),
  };
}

function requestParams(options: BackendActionOptions): readonly (readonly [string, string])[] {
  return Object.freeze(
    Object.entries(options.params ?? {}).flatMap(([name, value]) =>
      value === null || value === undefined ? [] : [Object.freeze([name, String(value)] as const)],
    ),
  );
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

export async function executeBackendRequest(
  method: BackendMethod,
  inputURL: string,
  options: BackendActionOptions,
  context: StarContext,
): Promise<Response | undefined> {
  const authoredURL = new URL(inputURL, document.baseURI);
  const profile = selectProtocolProfile(
    context.instance,
    options.profile,
    officialProtocolProfiles,
  );
  const form = requestForm(context, options);
  const { payload, signalsJSON } = requestPayload(context, options, form);
  const operation = beginRequestOperation(context, method, authoredURL);
  let prepared: ReturnType<typeof prepareProtocolRequest>;
  try {
    prepared = prepareProtocolRequest(profile, {
      operationId: operation.id,
      method,
      url: authoredURL.href,
      headers: options.headers ?? {},
      credentials: options.credentials ?? "same-origin",
      params: requestParams(options),
      payload,
      signalsJSON,
      ...(form ? { form } : {}),
      ...(options.target === undefined ? {} : { target: options.target }),
      ...(options.selector === undefined ? {} : { selector: options.selector }),
      ...(options.mode === undefined ? {} : { mode: options.mode }),
    });
  } catch (error) {
    if (options.error) {
      writePath(
        context.state,
        options.error,
        error instanceof Error ? error.message : String(error),
      );
    }
    operation.failed(0, error);
    throw error;
  }
  const { body, descriptor } = prepared;
  const key = `${method} ${descriptor.url}`;
  const controller = controllerFor(context, key, options.requestCancellation ?? "auto");
  const maxRetries = Math.max(0, options.retryMaxCount ?? 10);
  const baseInterval = Math.max(0, options.retryInterval ?? 1_000);
  const scaler = Math.max(1, options.retryScaler ?? 2);
  const maxWait = Math.max(0, options.retryMaxWait ?? 30_000);
  const externalController = options.requestCancellation instanceof AbortController;

  let attempt = 0;
  let finalError: unknown;
  let finalResponse: Response | undefined;
  let terminal: RequestTerminal | undefined;

  try {
    if (options.pending) writePath(context.state, options.pending, true);
    if (options.error) writePath(context.state, options.error, null);
    const execution = await executeRequestMiddleware(
      context,
      descriptor,
      controller.signal,
      () => operationCancellationReason(controller.signal, externalController),
      async (finalDescriptor) => {
        const dispatchURL = new URL(finalDescriptor.url);
        const dispatchHeaders = new Headers(
          finalDescriptor.headers.map(([name, value]) => [name, value]),
        );

        if (method === "GET" && options.openWhenHidden !== true) {
          try {
            await waitUntilVisible(controller.signal);
          } catch (error) {
            if (!isAbort(error, controller.signal)) throw error;
            emitLifecycle(profile, context, {
              method,
              url: dispatchURL.href,
              attempt: 0,
              type: "finished",
              aborted: true,
            });
            return {
              phase: "cancelled",
              reason: operationCancellationReason(controller.signal, externalController),
            };
          }
        }

        while (attempt <= maxRetries) {
          attempt += 1;
          const baseDetail = { method, url: dispatchURL.href, attempt } as const;
          emitLifecycle(profile, context, { ...baseDetail, type: "started" });
          let response: Response | undefined;
          let requestError: unknown;
          let profileOwnedBody = false;

          try {
            response = await fetch(dispatchURL, {
              method,
              headers: dispatchHeaders,
              ...(body !== undefined ? { body } : {}),
              signal: controller.signal,
              credentials: finalDescriptor.credentials,
            });
            finalResponse = response;

            if (response.ok) {
              const ownedResponse = response;
              profileOwnedBody = true;
              const capabilities = Object.freeze<StarProtocolResponseCapabilities>({
                request: finalDescriptor,
                signal: controller.signal,
                patchSignals: (source, patchOptions) =>
                  patchSignals(context.state, source as Record<string, unknown>, patchOptions),
                patchElements: (source, patchOptions) =>
                  patchElements(context.root, source, patchOptions),
                emitSSE: (message) => emitSSE(context, message),
              });
              await executeProtocolResponse(
                context.instance,
                profile,
                ownedResponse,
                finalDescriptor,
                controller.signal,
                capabilities,
                (loaded, total) => {
                  emitLifecycle(profile, context, {
                    ...baseDetail,
                    type: "progress",
                    loaded,
                    ...(total === undefined ? {} : { total }),
                    response: ownedResponse,
                  });
                  operation.progress(baseDetail.attempt, loaded, total);
                },
              );
              if (!retryable(options.retry, response, undefined)) {
                emitLifecycle(profile, context, { ...baseDetail, type: "finished", response });
                return { phase: "completed", value: response, status: response.status };
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
            emitLifecycle(profile, context, {
              ...baseDetail,
              type: "finished",
              ...(response ? { response } : {}),
              aborted: true,
            });
            return {
              phase: "cancelled",
              reason: operationCancellationReason(controller.signal, externalController),
            };
          }

          finalError = requestError;
          const willRetry =
            attempt <= maxRetries && retryable(options.retry, response, requestError);
          if (!profileOwnedBody) await cancelBody(response);
          if (!willRetry) break;

          emitLifecycle(profile, context, {
            ...baseDetail,
            type: "retrying",
            ...(response ? { response } : {}),
            error: requestError,
          });
          operation.retrying(attempt, response?.status);
          try {
            await wait(
              Math.min(maxWait, baseInterval * scaler ** (attempt - 1)),
              controller.signal,
            );
          } catch (error) {
            if (!isAbort(error, controller.signal)) throw error;
            emitLifecycle(profile, context, {
              ...baseDetail,
              type: "finished",
              ...(response ? { response } : {}),
              aborted: true,
            });
            return {
              phase: "cancelled",
              reason: operationCancellationReason(controller.signal, externalController),
            };
          }
        }

        const failedDetail = {
          method,
          url: dispatchURL.href,
          attempt,
          error: finalError,
        } as const;
        emitLifecycle(profile, context, { ...failedDetail, type: "retries-failed" });
        emitLifecycle(profile, context, { ...failedDetail, type: "error" });
        if (options.error) {
          writePath(
            context.state,
            options.error,
            finalError instanceof Error ? finalError.message : String(finalError),
          );
        }
        throw finalError;
      },
    );

    if (execution.phase === "cancelled") {
      terminal = { phase: "cancelled", attempt, reason: execution.reason };
      return undefined;
    }
    if (execution.source === "middleware") {
      terminal = { phase: "completed", attempt: 0 };
      return undefined;
    }
    terminal = {
      phase: "completed",
      attempt,
      status: execution.status,
    };
    return execution.value;
  } catch (error) {
    terminal ??= isAbort(error, controller.signal)
      ? {
          phase: "cancelled",
          attempt,
          reason: operationCancellationReason(controller.signal, externalController),
        }
      : {
          phase: "failed",
          attempt,
          error,
          ...(finalResponse ? { status: finalResponse.status } : {}),
        };
    if (terminal.phase === "failed" && options.error && attempt === 0) {
      writePath(
        context.state,
        options.error,
        error instanceof Error ? error.message : String(error),
      );
    }
    throw error;
  } finally {
    try {
      if (options.pending) writePath(context.state, options.pending, false);
    } finally {
      releaseController(context, key, controller);
      if (terminal?.phase === "completed") {
        operation.completed(terminal.attempt, terminal.status);
      } else if (terminal?.phase === "cancelled") {
        operation.cancelled(terminal.attempt, terminal.reason);
      } else if (terminal?.phase === "failed") {
        operation.failed(terminal.attempt, terminal.error, terminal.status);
      }
    }
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

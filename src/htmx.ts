import { createRenderAdapter, type StarRenderTransaction } from "./render-adapter";
import {
  defineOfficialPlugin,
  STAR_PLUGIN_API_VERSION,
  type StarPlugin,
  type StarPluginDocumentHost,
} from "./plugin";
import { STAR_VERSION } from "./version";

export const HTMX_BRIDGE_SUPPORTED_RANGE = ">=2.0.0 <2.1.0";

export type StarHtmxBridgeFlowId =
  | "htmx.swap.inner"
  | "htmx.swap.outer"
  | "htmx.swap.delete"
  | "htmx.swap.adjacent"
  | "htmx.swap.oob"
  | "htmx.document.boost"
  | "htmx.history.restore"
  | "htmx.swap.none"
  | "htmx.request.error";

export type StarHtmxBridgeSwapStyle =
  | "innerHTML"
  | "outerHTML"
  | "delete"
  | "beforebegin"
  | "afterbegin"
  | "beforeend"
  | "afterend"
  | "none";

export type StarHtmxBridgeTargetCategory = "document" | "region" | "out-of-band" | "history";

export type StarHtmxBridgePhase =
  | "prepared"
  | "removing"
  | "externally-mutated"
  | "enhancing"
  | "committed"
  | "canceled"
  | "failed";

export type StarHtmxBridgeOutcome =
  | "none"
  | "completed"
  | "canceled-before-mutation"
  | "failed-before-mutation"
  | "failed-after-removal"
  | "failed-after-mutation"
  | "observed-no-mutation";

export type StarHtmxBridgeEventId =
  | "htmx:beforeRequest"
  | "htmx:beforeSwap"
  | "htmx:beforeCleanupElement"
  | "htmx:afterSwap"
  | "htmx:afterSettle"
  | "htmx:afterRequest"
  | "htmx:oobBeforeSwap"
  | "htmx:oobAfterSwap"
  | "htmx:historyCacheHit"
  | "htmx:historyCacheMissLoad"
  | "htmx:historyRestore"
  | "htmx:targetError"
  | "htmx:responseError"
  | "htmx:sendError"
  | "htmx:sendAbort"
  | "htmx:timeout"
  | "htmx:swapError"
  | "htmx:historyCacheError"
  | "htmx:historyCacheMissLoadError";

export interface StarHtmxBridgeObservation {
  readonly schema: "jqstar-htmx-bridge-observation/1";
  readonly sequence: number;
  readonly bridgeOperationId: number;
  readonly renderOperationId: number | null;
  readonly host: "htmx";
  readonly version: string;
  readonly flowId: StarHtmxBridgeFlowId;
  readonly swapStyle: StarHtmxBridgeSwapStyle;
  readonly targetCategory: StarHtmxBridgeTargetCategory;
  readonly eventId: StarHtmxBridgeEventId;
  readonly phase: StarHtmxBridgePhase;
  readonly outcome: StarHtmxBridgeOutcome;
  readonly removalCount: number;
  readonly elapsedMs: number;
}

export type StarHtmxBridgeObserver = (observation: StarHtmxBridgeObservation) => void;

export interface StarHtmxCapability {
  readonly version: string;
  readonly config: {
    readonly defaultSwapStyle: string;
  };
  ajax(...args: readonly unknown[]): unknown;
  off(...args: readonly unknown[]): unknown;
  on(...args: readonly unknown[]): unknown;
  process(root: Element): void;
  swap(...args: readonly unknown[]): unknown;
  trigger(...args: readonly unknown[]): unknown;
}

export interface StarHtmxBridgeOptions {
  readonly $: JQueryStatic;
  readonly htmx: StarHtmxCapability;
  readonly version: string;
  readonly onError?: (error: unknown) => void;
}

export interface StarHtmxBridgeDisposalReport {
  readonly schema: "jqstar-htmx-bridge-disposal/1";
  readonly attempted: number;
  readonly preparedReleased: number;
  readonly remaining: number;
}

export interface StarHtmxBridge {
  readonly host: "htmx";
  readonly version: string;
  dispose(): Promise<StarHtmxBridgeDisposalReport>;
  observations(): readonly StarHtmxBridgeObservation[];
  observe(observer: StarHtmxBridgeObserver): () => void;
  whenIdle(): Promise<void>;
}

interface HtmxRequestDetail {
  readonly boosted?: unknown;
  readonly requestConfig?: {
    readonly elt?: unknown;
  };
  readonly serverResponse?: unknown;
  readonly shouldSwap?: unknown;
  readonly swapOverride?: unknown;
  readonly target?: unknown;
  readonly xhr?: unknown;
}

interface HtmxHistoryDetail {
  readonly historyElt?: unknown;
  readonly item?: {
    readonly content?: unknown;
  };
  readonly response?: unknown;
  readonly swapSpec?: {
    readonly swapStyle?: unknown;
  };
  readonly xhr?: unknown;
}

interface HtmxOobDetail {
  readonly fragment?: unknown;
  readonly shouldSwap?: unknown;
  readonly target?: unknown;
}

interface PreparedRequest {
  readonly key: object;
  readonly startedAt: number;
  readonly oobStyles: Map<Element, StarHtmxBridgeSwapStyle[]>;
  readonly oobOperations: Set<ActiveRender>;
  source: Element | undefined;
  target: Element | undefined;
  main: ActiveRender | undefined;
  afterRequest: boolean;
  boosted: boolean;
  errorEvent: StarHtmxBridgeEventId | undefined;
  noMutation: boolean;
  noMutationObserved: boolean;
  terminal: boolean;
}

interface ActiveRender {
  readonly boundary: Element;
  readonly bridgeOperationId: number;
  readonly category: StarHtmxBridgeTargetCategory;
  readonly deferredJqsRoots: Set<Element>;
  readonly done: Promise<void>;
  readonly existingApplicationRoots: ReadonlySet<Element>;
  readonly flowId: StarHtmxBridgeFlowId;
  readonly jqsPreservedRoots: readonly Element[];
  readonly removalBoundaries: Set<Element>;
  readonly request: PreparedRequest | undefined;
  readonly startedAt: number;
  readonly style: StarHtmxBridgeSwapStyle;
  readonly transaction: StarRenderTransaction;
  cleanupStarted: boolean;
  commitDone: boolean;
  commitStarted: boolean;
  hostSettled: boolean;
  mutated: boolean;
  removalCount: number;
  resolveDone: () => void;
  settling: boolean;
  terminal: boolean;
  terminalEventId: StarHtmxBridgeEventId | undefined;
}

type ObservationOperation = Pick<
  ActiveRender,
  | "bridgeOperationId"
  | "category"
  | "flowId"
  | "removalCount"
  | "startedAt"
  | "style"
  | "transaction"
>;

interface OobPlan {
  readonly style: StarHtmxBridgeSwapStyle;
  readonly targets: readonly Element[];
}

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const observationLimit = 256;
const supportedSwapStyles = new Set<StarHtmxBridgeSwapStyle>([
  "innerHTML",
  "outerHTML",
  "delete",
  "beforebegin",
  "afterbegin",
  "beforeend",
  "afterend",
  "none",
]);
function parseVersion(value: string): readonly [number, number, number] {
  const match = stableVersionPattern.exec(value);
  if (!match) {
    throw new Error(
      `Unsupported htmx version ${String(value)}. A stable major.minor.patch value is required.`,
    );
  }
  return [Number(match[1]), Number(match[2]), Number(match[3])];
}

function compareVersion(
  left: readonly [number, number, number],
  right: readonly [number, number, number],
): number {
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2];
}

function validateVersion(version: string, capabilityVersion: string): void {
  const parsed = parseVersion(version);
  if (compareVersion(parsed, [2, 0, 0]) < 0 || compareVersion(parsed, [2, 1, 0]) >= 0) {
    throw new Error(
      `Unsupported htmx version ${version}. Expected ${HTMX_BRIDGE_SUPPORTED_RANGE}.`,
    );
  }
  parseVersion(capabilityVersion);
  if (version !== capabilityVersion) {
    throw new Error(
      `The explicit htmx version ${version} does not match htmx.version ${capabilityVersion}.`,
    );
  }
}

function validateCapability(value: StarHtmxCapability): void {
  if (!value || typeof value !== "object") {
    throw new TypeError("An htmx capability object is required.");
  }
  if (
    typeof value.version !== "string" ||
    !value.config ||
    typeof value.config !== "object" ||
    typeof value.config.defaultSwapStyle !== "string" ||
    typeof value.ajax !== "function" ||
    typeof value.off !== "function" ||
    typeof value.on !== "function" ||
    typeof value.process !== "function" ||
    typeof value.swap !== "function" ||
    typeof value.trigger !== "function"
  ) {
    throw new TypeError(
      "The htmx capability must expose version, config.defaultSwapStyle, ajax(), on(), off(), process(), swap(), and trigger().",
    );
  }
}

function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function isElement(value: unknown, owner: Window): value is Element {
  return value instanceof (owner as Window & typeof globalThis).Element;
}

function isParentNode(value: unknown): value is ParentNode {
  return Boolean(value && typeof value === "object" && "querySelectorAll" in value);
}

function rootsWithin(root: ParentNode, selector: string): Element[] {
  const roots = root instanceof Element && root.matches(selector) ? [root] : [];
  roots.push(...root.querySelectorAll(selector));
  return roots;
}

function applicationRoots(owner: Document): readonly Element[] {
  return Object.freeze([...owner.querySelectorAll("[data-jqs]")]);
}

function documentIdCount(owner: Document, id: string): number {
  return [...owner.querySelectorAll("[id]")].filter((element) => element.id === id).length;
}

function markerCandidates(root: ParentNode, marker: string): readonly Element[] {
  return rootsWithin(root, `[${marker}][id]`).filter(({ id }) => id.length > 0);
}

function countCandidateIds(candidates: readonly Element[]): ReadonlyMap<string, number> {
  const counts = new Map<string, number>();
  for (const candidate of candidates) {
    counts.set(candidate.id, (counts.get(candidate.id) ?? 0) + 1);
  }
  return counts;
}

function parseIncoming(owner: Document, value: unknown): ParentNode | undefined {
  if (isParentNode(value)) return value;
  if (typeof value !== "string") return undefined;
  const template = owner.createElement("template");
  template.innerHTML = value;
  return template.content;
}

function matchingPreservedRoots(
  boundary: Element,
  incoming: ParentNode | undefined,
  marker: "hx-preserve" | "data-jqs-preserve",
): readonly Element[] {
  if (!incoming) return Object.freeze([]);
  const oldCandidates = markerCandidates(boundary, marker);
  const incomingCounts = countCandidateIds(markerCandidates(incoming, marker));
  const oldCounts = countCandidateIds(oldCandidates);
  return Object.freeze(
    oldCandidates.filter(
      (candidate) =>
        candidate.isConnected &&
        boundary.contains(candidate) &&
        oldCounts.get(candidate.id) === 1 &&
        documentIdCount(boundary.ownerDocument, candidate.id) === 1 &&
        incomingCounts.get(candidate.id) === 1,
    ),
  );
}

function normalizedSwapStyle(value: unknown): StarHtmxBridgeSwapStyle | undefined {
  if (typeof value !== "string") return undefined;
  const style = value.trim().split(/\s+/, 1)[0];
  return supportedSwapStyles.has(style as StarHtmxBridgeSwapStyle)
    ? (style as StarHtmxBridgeSwapStyle)
    : undefined;
}

function inheritedSwapValue(source: Element | undefined): string | undefined {
  let current = source;
  while (current) {
    const value = current.getAttribute("hx-swap") ?? current.getAttribute("data-hx-swap");
    if (value !== null) return value;
    current = current.parentElement ?? undefined;
  }
  return undefined;
}

function requestedSwapStyle(
  source: Element | undefined,
  override: unknown,
  defaultStyle: string,
): StarHtmxBridgeSwapStyle | undefined {
  if (typeof override === "string" && override.trim()) return normalizedSwapStyle(override);
  return normalizedSwapStyle(inheritedSwapValue(source) ?? defaultStyle);
}

function targetForTransaction(
  target: Element,
  style: StarHtmxBridgeSwapStyle,
): Element | undefined {
  if (style === "beforebegin" || style === "afterend") return target.parentElement ?? undefined;
  return target;
}

function removalKind(
  style: StarHtmxBridgeSwapStyle,
  target: Element,
): "children" | "target" | "none" {
  if (style === "innerHTML" || (style === "outerHTML" && target.localName === "body")) {
    return "children";
  }
  if (style === "outerHTML" || style === "delete") return "target";
  return "none";
}

function operationFlow(style: StarHtmxBridgeSwapStyle, boosted: boolean): StarHtmxBridgeFlowId {
  if (boosted) return "htmx.document.boost";
  if (style === "innerHTML") return "htmx.swap.inner";
  if (style === "outerHTML") return "htmx.swap.outer";
  if (style === "delete") return "htmx.swap.delete";
  return "htmx.swap.adjacent";
}

function overlaps(left: Element, right: Element): boolean {
  return left === right || left.contains(right) || right.contains(left);
}

function asCustomEvent<Detail>(event: Event): CustomEvent<Detail> | undefined {
  return "detail" in event ? (event as CustomEvent<Detail>) : undefined;
}

function oobPlans(owner: Document, response: unknown): readonly OobPlan[] {
  const incoming = parseIncoming(owner, response);
  if (!incoming) return Object.freeze([]);
  const plans: OobPlan[] = [];
  for (const candidate of rootsWithin(incoming, "[hx-swap-oob], [data-hx-swap-oob]")) {
    const raw = candidate.getAttribute("hx-swap-oob") ?? candidate.getAttribute("data-hx-swap-oob");
    if (raw === null) continue;
    const separator = raw.indexOf(":");
    const style = normalizedSwapStyle(separator > 0 ? raw.slice(0, separator) : "outerHTML");
    if (!style) continue;
    let targets: Element[] = [];
    if (separator > 0) {
      const selector = raw.slice(separator + 1);
      try {
        targets = [...owner.querySelectorAll(selector)];
      } catch {
        continue;
      }
    } else if (candidate.id && documentIdCount(owner, candidate.id) === 1) {
      const target = owner.getElementById(candidate.id);
      if (target) targets = [target];
    }
    if (targets.length > 0) plans.push({ style, targets: Object.freeze(targets) });
  }
  return Object.freeze(plans);
}

class HtmxBridgeController implements StarHtmxBridge {
  readonly host = "htmx" as const;
  readonly version: string;
  readonly #active = new Set<ActiveRender>();
  readonly #adapter;
  readonly #capability: StarHtmxCapability;
  readonly #documentHost: StarPluginDocumentHost;
  readonly #history = new Set<ActiveRender>();
  readonly #idleWaiters = new Set<() => void>();
  readonly #listeners: Array<() => void> = [];
  readonly #observers = new Set<StarHtmxBridgeObserver>();
  readonly #oobByDetail = new WeakMap<object, ActiveRender>();
  readonly #onError: (error: unknown) => void;
  readonly #records: StarHtmxBridgeObservation[] = [];
  readonly #requestByKey = new WeakMap<object, PreparedRequest>();
  readonly #requests = new Set<PreparedRequest>();
  #bridgeSequence = 0;
  #disposed = false;
  #disposal: Promise<StarHtmxBridgeDisposalReport> | undefined;
  #historyCleanupArmed = false;
  #observationSequence = 0;

  constructor(
    $: JQueryStatic,
    capability: StarHtmxCapability,
    version: string,
    documentHost: StarPluginDocumentHost,
    onError?: (error: unknown) => void,
  ) {
    this.#adapter = createRenderAdapter($);
    this.#capability = capability;
    this.version = version;
    this.#documentHost = documentHost;
    this.#onError = onError ?? ((error) => documentHost.window.reportError?.(error));
    this.#installListeners();
  }

  #installListeners(): void {
    const { document } = this.#documentHost;
    const listen = <Detail>(
      type: StarHtmxBridgeEventId,
      listener: (event: CustomEvent<Detail>) => void,
    ): void => {
      this.#listeners.push(
        this.#documentHost.listen(document, type, (event) => {
          const custom = asCustomEvent<Detail>(event);
          if (!custom || this.#disposed) return;
          try {
            listener(custom);
          } catch (error) {
            if (custom.cancelable) custom.preventDefault();
            this.#reportError(error);
          }
        }),
      );
    };

    listen<HtmxRequestDetail>("htmx:beforeRequest", (event) => this.#beforeRequest(event));
    listen<HtmxRequestDetail>("htmx:beforeSwap", (event) => this.#beforeSwap(event));
    listen("htmx:beforeCleanupElement", (event) => this.#beforeCleanup(event));
    listen<HtmxRequestDetail>("htmx:afterSwap", (event) => this.#afterSwap(event));
    listen<HtmxRequestDetail>("htmx:afterSettle", (event) => this.#afterSettle(event));
    listen<HtmxRequestDetail>("htmx:afterRequest", (event) => this.#afterRequest(event));
    listen<HtmxOobDetail>("htmx:oobBeforeSwap", (event) => this.#oobBeforeSwap(event));
    listen<HtmxOobDetail>("htmx:oobAfterSwap", (event) => this.#oobAfterSwap(event));
    this.#listeners.push(
      this.#documentHost.listen(document, "htmx:beforeHistorySave", () => {
        if (!this.#disposed) {
          this.#historyCleanupArmed = !this.#active.size && !this.#requests.size;
        }
      }),
    );
    listen<HtmxHistoryDetail>("htmx:historyCacheHit", (event) => this.#beforeHistory(event));
    listen<HtmxHistoryDetail>("htmx:historyCacheMissLoad", (event) => this.#beforeHistory(event));
    listen<HtmxHistoryDetail>("htmx:historyRestore", (event) => this.#historyRestore(event));

    for (const type of [
      "htmx:targetError",
      "htmx:responseError",
      "htmx:sendError",
      "htmx:sendAbort",
      "htmx:timeout",
      "htmx:swapError",
      "htmx:historyCacheError",
      "htmx:historyCacheMissLoadError",
    ] as const) {
      listen<HtmxRequestDetail>(type, (event) => this.#hostError(type, event));
    }
  }

  #sourceFrom(event: CustomEvent<HtmxRequestDetail>): Element | undefined {
    const detailSource = event.detail?.requestConfig?.elt;
    if (isElement(detailSource, this.#documentHost.window)) return detailSource;
    return isElement(event.target, this.#documentHost.window) ? event.target : undefined;
  }

  #requestFor(
    detail: HtmxRequestDetail | undefined,
    source: Element | undefined,
    create: boolean,
  ): PreparedRequest | undefined {
    const key = detail?.xhr;
    if (!isObject(key)) return undefined;
    const existing = this.#requestByKey.get(key);
    if (existing || !create) {
      if (existing && source) existing.source = source;
      return existing;
    }
    const request: PreparedRequest = {
      key,
      startedAt: performance.now(),
      oobStyles: new Map(),
      oobOperations: new Set(),
      source,
      target: undefined,
      main: undefined,
      afterRequest: false,
      boosted: detail?.boosted === true,
      errorEvent: undefined,
      noMutation: false,
      noMutationObserved: false,
      terminal: false,
    };
    this.#requestByKey.set(key, request);
    this.#requests.add(request);
    return request;
  }

  #beforeRequest(event: CustomEvent<HtmxRequestDetail>): void {
    const request = this.#requestFor(event.detail, this.#sourceFrom(event), true);
    if (!request) return;
    request.boosted = event.detail?.boosted === true;
    queueMicrotask(() => {
      if (event.defaultPrevented && !request.terminal && !request.main) {
        this.#observeRequestTerminal(
          request,
          "htmx.swap.none",
          "none",
          "region",
          "htmx:beforeRequest",
          "canceled",
          "canceled-before-mutation",
        );
      }
    });
  }

  #beforeSwap(event: CustomEvent<HtmxRequestDetail>): void {
    const source = this.#sourceFrom(event);
    const request = this.#requestFor(event.detail, source, true);
    if (!request || request.terminal) return;
    request.source = source ?? request.source;
    request.boosted = event.detail?.boosted === true || request.boosted;

    const target = event.detail?.target;
    if (
      !isElement(target, this.#documentHost.window) ||
      target.ownerDocument !== this.#documentHost.document ||
      !target.isConnected
    ) {
      event.preventDefault();
      this.#observeRequestTerminal(
        request,
        "htmx.request.error",
        "none",
        "region",
        "htmx:beforeSwap",
        "failed",
        "failed-before-mutation",
      );
      return;
    }
    request.target = target;

    for (const plan of oobPlans(this.#documentHost.document, event.detail?.serverResponse)) {
      for (const plannedTarget of plan.targets) {
        const styles = request.oobStyles.get(plannedTarget) ?? [];
        styles.push(plan.style);
        request.oobStyles.set(plannedTarget, styles);
      }
    }

    const style = requestedSwapStyle(
      request.source,
      event.detail?.swapOverride,
      this.#capability.config.defaultSwapStyle,
    );
    if (!style) {
      event.preventDefault();
      this.#observeRequestTerminal(
        request,
        "htmx.request.error",
        "none",
        request.boosted ? "document" : "region",
        "htmx:beforeSwap",
        "failed",
        "failed-before-mutation",
      );
      return;
    }
    if (event.detail?.shouldSwap !== true || style === "none") {
      request.noMutation = true;
      queueMicrotask(() => {
        if (event.defaultPrevented && !request.terminal) request.noMutation = true;
      });
      return;
    }
    if (request.main && !request.main.terminal) {
      event.preventDefault();
      this.#reportError(new Error("A duplicate htmx main swap was rejected before begin."));
      return;
    }

    const incoming = parseIncoming(this.#documentHost.document, event.detail?.serverResponse);
    const operation = this.#beginOperation({
      boundary: target,
      category: request.boosted ? "document" : "region",
      eventId: "htmx:beforeSwap",
      flowId: operationFlow(style, request.boosted),
      incoming,
      request,
      style,
    });
    if (!operation) {
      event.preventDefault();
      return;
    }
    request.main = operation;
    queueMicrotask(() => {
      if (event.defaultPrevented && !operation.cleanupStarted && !operation.mutated) {
        this.#cancel(operation, "htmx:beforeSwap");
      }
    });
  }

  #beforeHistory(event: CustomEvent<HtmxHistoryDetail>): void {
    const detail = event.detail;
    const boundary = detail?.historyElt;
    if (!isElement(boundary, this.#documentHost.window)) return;
    if (boundary.ownerDocument !== this.#documentHost.document || !boundary.isConnected) {
      event.preventDefault();
      this.#observeStandalone(
        "htmx.request.error",
        "innerHTML",
        "history",
        event.type as StarHtmxBridgeEventId,
        "failed",
        "failed-before-mutation",
      );
      return;
    }
    this.#historyCleanupArmed = false;
    const style = normalizedSwapStyle(detail?.swapSpec?.swapStyle ?? "innerHTML");
    if (!style || style === "none") {
      event.preventDefault();
      this.#observeStandalone(
        style === "none" ? "htmx.swap.none" : "htmx.request.error",
        style ?? "none",
        "history",
        event.type as StarHtmxBridgeEventId,
        style === "none" ? "committed" : "failed",
        style === "none" ? "observed-no-mutation" : "failed-before-mutation",
      );
      return;
    }
    const incoming = parseIncoming(
      this.#documentHost.document,
      detail?.item?.content ?? detail?.response,
    );
    const operation = this.#beginOperation({
      boundary,
      category: "history",
      eventId: event.type as StarHtmxBridgeEventId,
      flowId: "htmx.history.restore",
      incoming,
      request: undefined,
      style,
    });
    if (!operation) {
      event.preventDefault();
      return;
    }
    this.#history.add(operation);
    queueMicrotask(() => {
      if (event.defaultPrevented && !operation.cleanupStarted && !operation.mutated) {
        this.#cancel(operation, event.type as StarHtmxBridgeEventId);
      }
    });
  }

  #oobBeforeSwap(event: CustomEvent<HtmxOobDetail>): void {
    if (!isObject(event.detail)) return;
    const target = event.detail?.target;
    if (
      !isElement(target, this.#documentHost.window) ||
      target.ownerDocument !== this.#documentHost.document ||
      !target.isConnected
    ) {
      event.preventDefault();
      this.#observeStandalone(
        "htmx.request.error",
        "none",
        "out-of-band",
        "htmx:oobBeforeSwap",
        "failed",
        "failed-before-mutation",
      );
      return;
    }
    const request = [...this.#requests].find(
      (candidate) => !candidate.terminal && candidate.oobStyles.has(target),
    );
    const planned = request?.oobStyles.get(target)?.shift();
    const style = planned ?? "outerHTML";
    if (event.detail.shouldSwap !== true || style === "none") return;
    const operation = this.#beginOperation({
      boundary: target,
      category: "out-of-band",
      eventId: "htmx:oobBeforeSwap",
      flowId: "htmx.swap.oob",
      incoming: parseIncoming(this.#documentHost.document, event.detail.fragment),
      request,
      style,
    });
    if (!operation) {
      event.preventDefault();
      return;
    }
    request?.oobOperations.add(operation);
    this.#oobByDetail.set(event.detail, operation);
    queueMicrotask(() => {
      if (event.defaultPrevented && !operation.cleanupStarted && !operation.mutated) {
        this.#cancel(operation, "htmx:oobBeforeSwap");
      }
    });
  }

  #beginOperation(input: {
    boundary: Element;
    category: StarHtmxBridgeTargetCategory;
    eventId: StarHtmxBridgeEventId;
    flowId: StarHtmxBridgeFlowId;
    incoming: ParentNode | undefined;
    incomingAlreadyInserted?: boolean;
    request: PreparedRequest | undefined;
    style: StarHtmxBridgeSwapStyle;
  }): ActiveRender | undefined {
    const transactionRoot = targetForTransaction(input.boundary, input.style);
    if (!transactionRoot || !transactionRoot.isConnected) {
      this.#reportError(new Error("The htmx swap boundary was disconnected before begin."));
      return undefined;
    }
    for (const active of this.#active) {
      if (
        !active.terminal &&
        overlaps(transactionRoot, targetForTransaction(active.boundary, active.style)!)
      ) {
        this.#reportError(new Error("Overlapping htmx swap boundaries are rejected before begin."));
        return undefined;
      }
    }

    const removes = removalKind(input.style, input.boundary) !== "none";
    const htmxPreserved = removes
      ? matchingPreservedRoots(input.boundary, input.incoming, "hx-preserve")
      : [];
    const jqsPreserved = removes
      ? matchingPreservedRoots(input.boundary, input.incoming, "data-jqs-preserve")
      : [];
    const preservedRoots = [...new Set([...htmxPreserved, ...jqsPreserved])];
    const preservedRootSet = new Set(preservedRoots);
    const unmatchedJqsMarkers = removes
      ? rootsWithin(transactionRoot, "[data-jqs-preserve]").filter(
          (root) => !preservedRootSet.has(root),
        )
      : [];
    let transaction: StarRenderTransaction;
    for (const root of unmatchedJqsMarkers) root.removeAttribute("data-jqs-preserve");
    try {
      transaction = this.#adapter.begin(transactionRoot, {
        preserveRoots: preservedRoots,
      });
    } catch (error) {
      this.#reportError(error);
      return undefined;
    } finally {
      for (const root of unmatchedJqsMarkers) root.setAttribute("data-jqs-preserve", "");
    }
    let resolveDone!: () => void;
    const done = new Promise<void>((resolve) => {
      resolveDone = resolve;
    });
    const operation: ActiveRender = {
      boundary: input.boundary,
      bridgeOperationId: ++this.#bridgeSequence,
      category: input.category,
      deferredJqsRoots: new Set(),
      done,
      existingApplicationRoots: new Set(
        applicationRoots(this.#documentHost.document).filter(
          (root) => !input.incomingAlreadyInserted || !transactionRoot.contains(root),
        ),
      ),
      flowId: input.flowId,
      jqsPreservedRoots: Object.freeze(jqsPreserved),
      removalBoundaries: new Set(),
      request: input.request,
      startedAt: performance.now(),
      style: input.style,
      transaction,
      cleanupStarted: false,
      commitDone: false,
      commitStarted: false,
      hostSettled: input.style === "delete",
      mutated: false,
      removalCount: 0,
      resolveDone,
      settling: false,
      terminal: false,
      terminalEventId: undefined,
    };
    this.#active.add(operation);
    this.#publish(operation, "prepared", input.eventId);
    return operation;
  }

  #matchesCleanup(operation: ActiveRender, cleanup: Element): boolean {
    const kind = removalKind(operation.style, operation.boundary);
    if (kind === "target") return cleanup === operation.boundary;
    if (kind === "children") return cleanup.parentElement === operation.boundary;
    return false;
  }

  #beforeCleanup(event: CustomEvent<unknown>): void {
    const cleanup = event.target;
    if (!isElement(cleanup, this.#documentHost.window)) return;
    if (
      this.#historyCleanupArmed &&
      ![...this.#active].some((operation) => this.#matchesCleanup(operation, cleanup))
    ) {
      this.#historyCleanupArmed = false;
      const boundary = cleanup.parentElement;
      if (boundary?.isConnected) {
        const history = this.#beginOperation({
          boundary,
          category: "history",
          eventId: "htmx:beforeCleanupElement",
          flowId: "htmx.history.restore",
          incoming: undefined,
          incomingAlreadyInserted: true,
          request: undefined,
          style: "innerHTML",
        });
        if (history) {
          this.#history.add(history);
        }
      }
    }
    for (const operation of this.#active) {
      if (operation.terminal || !this.#matchesCleanup(operation, cleanup)) continue;
      if (operation.removalBoundaries.has(cleanup)) continue;
      operation.removalBoundaries.add(cleanup);
      operation.cleanupStarted = true;
      this.#moveNestedJqsPreserved(operation, cleanup);
      try {
        operation.transaction.beforeRemove(cleanup);
      } catch (error) {
        void this.#fail(operation, error, "htmx:beforeCleanupElement");
        continue;
      }
      operation.removalCount += 1;
      this.#publish(operation, "removing", "htmx:beforeCleanupElement");
    }
  }

  #moveNestedJqsPreserved(operation: ActiveRender, cleanup: Element): void {
    for (const root of operation.jqsPreservedRoots) {
      if (!cleanup.contains(root)) continue;
      if (root === cleanup) {
        operation.deferredJqsRoots.add(root);
        continue;
      }
      const matches = [
        ...this.#documentHost.document.querySelectorAll("[data-jqs-preserve][id]"),
      ].filter(
        (candidate) =>
          candidate.id === root.id && candidate !== root && !cleanup.contains(candidate),
      );
      if (matches.length === 1) matches[0]!.replaceWith(root);
      else operation.deferredJqsRoots.add(root);
    }
  }

  #restoreDeferredJqsPreserved(operation: ActiveRender): void {
    for (const root of operation.deferredJqsRoots) {
      const matches = [
        ...this.#documentHost.document.querySelectorAll("[data-jqs-preserve][id]"),
      ].filter((candidate) => candidate.id === root.id && candidate !== root);
      if (matches.length === 1) matches[0]!.replaceWith(root);
    }
    operation.deferredJqsRoots.clear();
  }

  #operationForRequest(detail: HtmxRequestDetail | undefined): ActiveRender | undefined {
    if (!isObject(detail?.xhr)) return undefined;
    return this.#requestByKey.get(detail.xhr)?.main;
  }

  #afterSwap(event: CustomEvent<HtmxRequestDetail>, direct?: ActiveRender): void {
    const operation =
      direct ?? this.#operationForRequest(event.detail) ?? this.#historyOperation(event.target);
    if (!operation || operation.terminal || operation.mutated) return;
    operation.mutated = true;
    this.#restoreDeferredJqsPreserved(operation);
    this.#publish(operation, "externally-mutated", "htmx:afterSwap");
    this.#commit(operation, "htmx:afterSwap");
  }

  #oobAfterSwap(event: CustomEvent<HtmxOobDetail>): void {
    if (!isObject(event.detail)) return;
    const operation = this.#oobByDetail.get(event.detail);
    if (!operation || operation.terminal || operation.mutated) return;
    operation.mutated = true;
    this.#restoreDeferredJqsPreserved(operation);
    this.#publish(operation, "externally-mutated", "htmx:oobAfterSwap");
    this.#commit(operation, "htmx:oobAfterSwap");
  }

  #commit(operation: ActiveRender, eventId: StarHtmxBridgeEventId): void {
    if (operation.commitStarted || operation.terminal) return;
    operation.commitStarted = true;
    operation.settling = true;
    this.#publish(operation, "enhancing", eventId);
    const incoming = applicationRoots(this.#documentHost.document).filter(
      (root) => !operation.existingApplicationRoots.has(root),
    );
    void operation.transaction.commit(incoming).then(
      () => {
        operation.commitDone = true;
        operation.settling = false;
        this.#completeIfReady(operation, eventId);
      },
      (error: unknown) => {
        operation.settling = false;
        this.#settle(operation, "failed", "failed-after-mutation", eventId);
        this.#reportError(error);
      },
    );
  }

  #afterSettle(event: CustomEvent<HtmxRequestDetail>, direct?: ActiveRender): void {
    const request = isObject(event.detail?.xhr)
      ? this.#requestByKey.get(event.detail.xhr)
      : undefined;
    const operations = new Set<ActiveRender>();
    const main = direct ?? request?.main ?? this.#historyOperation(event.target);
    if (main) operations.add(main);
    for (const operation of request?.oobOperations ?? []) operations.add(operation);
    if (!request) {
      for (const operation of this.#active) {
        if (operation.category === "out-of-band" && !operation.request) operations.add(operation);
      }
    }
    for (const operation of operations) {
      if (operation.terminal) continue;
      if (operation.category === "history") continue;
      operation.hostSettled = true;
      operation.terminalEventId = "htmx:afterSettle";
      this.#completeIfReady(operation, "htmx:afterSettle");
    }
  }

  #historyRestore(event: CustomEvent<HtmxHistoryDetail>): void {
    this.#historyCleanupArmed = false;
    const operations = [...this.#history].filter((operation) => !operation.terminal);
    if (operations.length === 0) {
      this.#observeStandalone(
        "htmx.history.restore",
        "innerHTML",
        "history",
        "htmx:historyRestore",
        "committed",
        "observed-no-mutation",
      );
      return;
    }
    for (const operation of operations) {
      operation.hostSettled = true;
      operation.terminalEventId = "htmx:historyRestore";
      if (!operation.mutated) {
        operation.mutated = true;
        this.#restoreDeferredJqsPreserved(operation);
        this.#publish(operation, "externally-mutated", "htmx:historyRestore");
        this.#commit(operation, "htmx:historyRestore");
      }
      this.#completeIfReady(operation, "htmx:historyRestore");
    }
    void event;
  }

  #historyOperation(target: EventTarget | null): ActiveRender | undefined {
    if (!isElement(target, this.#documentHost.window)) return undefined;
    return [...this.#history].find(
      (operation) =>
        !operation.terminal &&
        (operation.boundary === target || operation.boundary.contains(target)),
    );
  }

  #afterRequest(event: CustomEvent<HtmxRequestDetail>): void {
    const request = this.#requestFor(event.detail, this.#sourceFrom(event), false);
    if (!request || request.terminal) return;
    request.afterRequest = true;
    const main = request.main;
    if (main && !main.terminal && main.style === "delete") {
      main.mutated = main.cleanupStarted || !main.boundary.isConnected;
      if (!main.mutated) {
        this.#cancel(main, "htmx:afterRequest");
        return;
      }
      main.terminalEventId = "htmx:afterRequest";
      this.#publish(main, "externally-mutated", "htmx:afterRequest");
      this.#commit(main, "htmx:afterRequest");
      return;
    }
    queueMicrotask(() => {
      if (
        !request.terminal &&
        !request.main &&
        request.oobOperations.size === 0 &&
        (request.noMutation || request.errorEvent)
      ) {
        const error = request.errorEvent;
        this.#observeRequestTerminal(
          request,
          error ? "htmx.request.error" : "htmx.swap.none",
          "none",
          request.boosted ? "document" : "region",
          error ?? "htmx:afterRequest",
          error ? "failed" : "committed",
          error ? "failed-before-mutation" : "observed-no-mutation",
        );
      }
    });
  }

  #hostError(type: StarHtmxBridgeEventId, event: CustomEvent<HtmxRequestDetail>): void {
    if (type.startsWith("htmx:history")) this.#historyCleanupArmed = false;
    const request = this.#requestFor(event.detail, this.#sourceFrom(event), false);
    const operations = new Set<ActiveRender>();
    if (request?.main && !request.main.terminal) operations.add(request.main);
    for (const operation of request?.oobOperations ?? []) {
      if (!operation.terminal) operations.add(operation);
    }
    if (operations.size > 0 && (type === "htmx:swapError" || type === "htmx:timeout")) {
      for (const operation of operations) void this.#fail(operation, new Error(type), type);
      return;
    }
    if (request) {
      request.errorEvent = type;
      if (!request.main && request.oobOperations.size === 0) {
        this.#observeRequestTerminal(
          request,
          "htmx.request.error",
          "none",
          request.boosted ? "document" : "region",
          type,
          "failed",
          "failed-before-mutation",
        );
      }
      return;
    }
    this.#observeStandalone(
      "htmx.request.error",
      "none",
      type.startsWith("htmx:history") ? "history" : "region",
      type,
      "failed",
      "failed-before-mutation",
    );
  }

  #completeIfReady(operation: ActiveRender, eventId: StarHtmxBridgeEventId): void {
    if (operation.commitDone && operation.hostSettled && !operation.terminal) {
      this.#settle(operation, "committed", "completed", operation.terminalEventId ?? eventId);
    }
  }

  #cancel(operation: ActiveRender, eventId: StarHtmxBridgeEventId): void {
    if (operation.terminal || operation.settling) return;
    operation.settling = true;
    void operation.transaction
      .fail(new Error("The htmx swap was canceled before mutation."))
      .then(undefined, () => {
        operation.settling = false;
        this.#settle(operation, "canceled", "canceled-before-mutation", eventId);
      });
  }

  #fail(operation: ActiveRender, error: unknown, eventId: StarHtmxBridgeEventId): Promise<void> {
    if (operation.terminal) return operation.done;
    if (operation.settling) return operation.done;
    operation.settling = true;
    const outcome = operation.cleanupStarted ? "failed-after-removal" : "failed-before-mutation";
    return operation.transaction.fail(error).then(undefined, () => {
      operation.settling = false;
      this.#settle(operation, "failed", outcome, eventId);
    });
  }

  #settle(
    operation: ActiveRender,
    phase: "committed" | "canceled" | "failed",
    outcome: StarHtmxBridgeOutcome,
    eventId: StarHtmxBridgeEventId,
  ): void {
    if (operation.terminal) return;
    operation.terminal = true;
    this.#active.delete(operation);
    this.#history.delete(operation);
    const request = operation.request;
    if (request) {
      if (request.main === operation) request.main = undefined;
      request.oobOperations.delete(operation);
    }
    this.#publish(operation, phase, eventId, outcome);
    operation.resolveDone();
    this.#maybeReleaseRequest(request);
    if (this.#active.size === 0) {
      for (const resolve of this.#idleWaiters) resolve();
      this.#idleWaiters.clear();
    }
  }

  #maybeReleaseRequest(request: PreparedRequest | undefined): void {
    if (
      !request ||
      request.terminal ||
      request.main ||
      request.oobOperations.size > 0 ||
      (!request.afterRequest && !request.errorEvent)
    ) {
      return;
    }
    request.terminal = true;
    this.#requests.delete(request);
  }

  #observeRequestTerminal(
    request: PreparedRequest,
    flowId: StarHtmxBridgeFlowId,
    style: StarHtmxBridgeSwapStyle,
    category: StarHtmxBridgeTargetCategory,
    eventId: StarHtmxBridgeEventId,
    phase: "committed" | "canceled" | "failed",
    outcome: StarHtmxBridgeOutcome,
  ): void {
    if (request.noMutationObserved || request.terminal) return;
    request.noMutationObserved = true;
    this.#observeStandalone(flowId, style, category, eventId, phase, outcome, request.startedAt);
    request.terminal = true;
    this.#requests.delete(request);
  }

  #observeStandalone(
    flowId: StarHtmxBridgeFlowId,
    style: StarHtmxBridgeSwapStyle,
    category: StarHtmxBridgeTargetCategory,
    eventId: StarHtmxBridgeEventId,
    phase: "committed" | "canceled" | "failed",
    outcome: StarHtmxBridgeOutcome,
    startedAt = performance.now(),
  ): void {
    const operation: ObservationOperation = {
      bridgeOperationId: ++this.#bridgeSequence,
      category,
      flowId,
      removalCount: 0,
      startedAt,
      style,
      transaction: undefined as unknown as StarRenderTransaction,
    };
    this.#publish(operation, phase, eventId, outcome);
  }

  #publish(
    operation: ObservationOperation,
    phase: StarHtmxBridgePhase,
    eventId: StarHtmxBridgeEventId,
    outcome: StarHtmxBridgeOutcome = "none",
  ): void {
    const observation = Object.freeze<StarHtmxBridgeObservation>({
      schema: "jqstar-htmx-bridge-observation/1",
      sequence: ++this.#observationSequence,
      bridgeOperationId: operation.bridgeOperationId,
      renderOperationId: operation.transaction?.operationId ?? null,
      host: "htmx",
      version: this.version,
      flowId: operation.flowId,
      swapStyle: operation.style,
      targetCategory: operation.category,
      eventId,
      phase,
      outcome,
      removalCount: operation.removalCount,
      elapsedMs: Math.max(0, Math.round(performance.now() - operation.startedAt)),
    });
    this.#records.push(observation);
    if (this.#records.length > observationLimit) this.#records.shift();
    for (const observer of this.#observers) {
      try {
        observer(observation);
      } catch (error) {
        this.#reportError(error);
      }
    }
  }

  #reportError = (error: unknown): void => {
    try {
      this.#onError(error);
    } catch {
      // Error reporting cannot change htmx's request or swap path.
    }
  };

  observations(): readonly StarHtmxBridgeObservation[] {
    return Object.freeze(this.#records.map((record) => record));
  }

  observe(observer: StarHtmxBridgeObserver): () => void {
    if (typeof observer !== "function") throw new TypeError("An htmx bridge observer is required.");
    if (this.#disposed) throw new Error("The htmx bridge has been disposed.");
    this.#observers.add(observer);
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      this.#observers.delete(observer);
    };
  }

  async whenIdle(): Promise<void> {
    while (this.#active.size > 0) {
      await new Promise<void>((resolve) => this.#idleWaiters.add(resolve));
    }
  }

  dispose(): Promise<StarHtmxBridgeDisposalReport> {
    if (this.#disposal) return this.#disposal;
    this.#disposed = true;
    this.#historyCleanupArmed = false;
    for (const release of this.#listeners.splice(0).reverse()) release();
    this.#observers.clear();
    const preparedReleased = this.#requests.size;
    for (const request of this.#requests) request.terminal = true;
    this.#requests.clear();
    const active = [...this.#active];
    const disposedError = new Error("The htmx bridge was disposed.");
    this.#disposal = Promise.all(
      active.map((operation) =>
        operation.settling
          ? operation.done
          : this.#fail(operation, disposedError, "htmx:swapError").catch(() => undefined),
      ),
    ).then(() =>
      Object.freeze({
        schema: "jqstar-htmx-bridge-disposal/1" as const,
        attempted: active.length,
        preparedReleased,
        remaining: this.#active.size,
      }),
    );
    return this.#disposal;
  }
}

export type StarHtmxPlugin = StarPlugin<StarHtmxBridge>;

export function createHtmxBridge(options: StarHtmxBridgeOptions): Readonly<StarHtmxPlugin> {
  if (!options || typeof options !== "object") {
    throw new TypeError("htmx bridge options are required.");
  }
  validateCapability(options.htmx);
  validateVersion(options.version, options.htmx.version);
  if (options.onError !== undefined && typeof options.onError !== "function") {
    throw new TypeError("htmx bridge onError must be a function.");
  }
  if (typeof options.$ !== "function") {
    throw new TypeError("The installed jQuery function is required.");
  }
  const { $, htmx, onError, version } = options;

  return defineOfficialPlugin({
    name: "core.htmx",
    version: STAR_VERSION,
    apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
    install(registrar) {
      const bridge = new HtmxBridgeController($, htmx, version, registrar.documentHost, onError);
      registrar.cleanup(() => {
        void bridge.dispose();
      });
      return bridge;
    },
  });
}

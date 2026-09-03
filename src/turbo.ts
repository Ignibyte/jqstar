import { createRenderAdapter, type StarRenderTransaction } from "./render-adapter";
import {
  defineOfficialPlugin,
  STAR_PLUGIN_API_VERSION,
  type StarPlugin,
  type StarPluginDocumentHost,
} from "./plugin";
import { STAR_VERSION } from "./version";

export const TURBO_BRIDGE_SUPPORTED_RANGE = ">=8.0.21 <8.1.0";

export type StarTurboBridgeFlowId =
  | "turbo.document.visit"
  | "turbo.form.visit"
  | "turbo.document.restore"
  | "turbo.frame.replace"
  | "turbo.cache.snapshot"
  | "turbo.document.no-render"
  | "turbo.document.canceled"
  | "turbo.document.error";

export type StarTurboBridgePhase =
  | "prepared"
  | "removing"
  | "externally-mutated"
  | "enhancing"
  | "committed"
  | "canceled"
  | "failed";

export type StarTurboBridgeOutcome =
  | "none"
  | "completed"
  | "canceled-before-mutation"
  | "failed-before-mutation"
  | "failed-after-removal"
  | "failed-after-mutation"
  | "observed-no-mutation";

export interface StarTurboBridgeObservation {
  readonly schema: "jqstar-turbo-bridge-observation/1";
  readonly sequence: number;
  readonly bridgeOperationId: number;
  readonly renderOperationId: number | null;
  readonly host: "turbo";
  readonly version: string;
  readonly flowId: StarTurboBridgeFlowId;
  readonly targetCategory: "document" | "frame";
  readonly phase: StarTurboBridgePhase;
  readonly outcome: StarTurboBridgeOutcome;
  readonly removalCount: number;
  readonly elapsedMs: number;
}

export type StarTurboBridgeObserver = (observation: StarTurboBridgeObservation) => void;

export interface StarTurboCapability {
  readonly cache: object;
  readonly session: object;
  start(): void;
  visit(location: string | URL, options?: object): void;
}

export interface StarTurboBridgeOptions {
  readonly $: JQueryStatic;
  readonly Turbo: StarTurboCapability;
  readonly version: string;
  readonly onError?: (error: unknown) => void;
}

export interface StarTurboBridgeDisposalReport {
  readonly schema: "jqstar-turbo-bridge-disposal/1";
  readonly attempted: number;
  readonly remaining: number;
}

export interface StarTurboBridge {
  readonly host: "turbo";
  readonly version: string;
  dispose(): Promise<StarTurboBridgeDisposalReport>;
  observations(): readonly StarTurboBridgeObservation[];
  observe(observer: StarTurboBridgeObserver): () => void;
  whenIdle(): Promise<void>;
}

interface TurboRenderDetail {
  readonly newBody?: Element;
  readonly newFrame?: Element;
  render: (current: Element, incoming: Element) => void | Promise<void>;
}

interface TurboVisitDetail {
  readonly action?: unknown;
}

interface TurboFetchResponse {
  readonly statusCode?: unknown;
}

interface TurboFetchResponseDetail {
  readonly fetchResponse?: TurboFetchResponse;
}

interface ActiveRender {
  readonly boundary: Element;
  readonly bridgeOperationId: number;
  readonly flowId: StarTurboBridgeFlowId;
  readonly startedAt: number;
  readonly targetCategory: "document" | "frame";
  readonly transaction: StarRenderTransaction;
  commitOnHostEvent: boolean;
  mutated: boolean;
  removalCount: number;
  settling: boolean;
  terminal: boolean;
}

const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const observationLimit = 256;

function parseVersion(value: string): readonly [number, number, number] {
  const match = stableVersionPattern.exec(value);
  if (!match) {
    throw new Error(
      `Unsupported Turbo version ${String(value)}. A stable major.minor.patch value is required.`,
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

function validateVersion(version: string): void {
  const parsed = parseVersion(version);
  if (compareVersion(parsed, [8, 0, 21]) < 0 || compareVersion(parsed, [8, 1, 0]) >= 0) {
    throw new Error(
      `Unsupported Turbo version ${version}. Expected ${TURBO_BRIDGE_SUPPORTED_RANGE}.`,
    );
  }
}

function validateCapability(value: StarTurboCapability): void {
  if (!value || typeof value !== "object") {
    throw new TypeError("A Turbo capability object is required.");
  }
  if (
    typeof value.start !== "function" ||
    typeof value.visit !== "function" ||
    !value.session ||
    typeof value.session !== "object" ||
    !value.cache ||
    typeof value.cache !== "object"
  ) {
    throw new TypeError(
      "The Turbo capability must expose start(), visit(), session, and cache without using a global.",
    );
  }
}

function isElement(value: unknown, owner: Window): value is Element {
  return value instanceof (owner as Window & typeof globalThis).Element;
}

function rootsWithin(root: Element, selector: string): Element[] {
  const roots = root.matches(selector) ? [root] : [];
  roots.push(...root.querySelectorAll(selector));
  return roots;
}

function documentIdCount(owner: Document, id: string): number {
  return [...owner.querySelectorAll("[id]")].filter((element) => element.id === id).length;
}

function matchingRoots(
  outgoing: Element,
  incoming: Element,
  marker: "data-jqs-preserve" | "data-turbo-permanent",
): readonly Element[] {
  const oldCandidates = rootsWithin(outgoing, `[${marker}][id]`);
  const incomingCandidates = rootsWithin(incoming, `[${marker}][id]`);
  const incomingCounts = new Map<string, number>();
  for (const candidate of incomingCandidates) {
    incomingCounts.set(candidate.id, (incomingCounts.get(candidate.id) ?? 0) + 1);
  }
  const oldCounts = new Map<string, number>();
  for (const candidate of oldCandidates) {
    oldCounts.set(candidate.id, (oldCounts.get(candidate.id) ?? 0) + 1);
  }
  return Object.freeze(
    oldCandidates.filter(
      (candidate) =>
        candidate.isConnected &&
        outgoing.contains(candidate) &&
        oldCounts.get(candidate.id) === 1 &&
        documentIdCount(outgoing.ownerDocument, candidate.id) === 1 &&
        incomingCounts.get(candidate.id) === 1,
    ),
  );
}

function moveJqsPreservedRoots(roots: readonly Element[], incoming: Element): void {
  const incomingCandidates = rootsWithin(incoming, "[data-jqs-preserve][id]");
  for (const root of roots) {
    const matches = incomingCandidates.filter((candidate) => candidate.id === root.id);
    if (matches.length === 1) matches[0]!.replaceWith(root);
  }
}

function incomingApplicationRoots(root: Element): readonly Element[] {
  return Object.freeze(rootsWithin(root, "[data-jqs]"));
}

function overlaps(left: Element, right: Element): boolean {
  return left === right || left.contains(right) || right.contains(left);
}

function asCustomEvent<Detail>(event: Event): CustomEvent<Detail> | undefined {
  return "detail" in event ? (event as CustomEvent<Detail>) : undefined;
}

class TurboBridgeController implements StarTurboBridge {
  readonly host = "turbo" as const;
  readonly version: string;
  readonly #active = new Set<ActiveRender>();
  readonly #adapter;
  readonly #documentHost: StarPluginDocumentHost;
  readonly #listeners: Array<() => void> = [];
  readonly #observers = new Set<StarTurboBridgeObserver>();
  readonly #records: StarTurboBridgeObservation[] = [];
  readonly #idleWaiters = new Set<() => void>();
  readonly #onError: (error: unknown) => void;
  #bridgeSequence = 0;
  #observationSequence = 0;
  #disposed = false;
  #disposal: Promise<StarTurboBridgeDisposalReport> | undefined;
  #formVisit = false;
  #restorationVisit = false;

  constructor(
    $: JQueryStatic,
    version: string,
    documentHost: StarPluginDocumentHost,
    onError?: (error: unknown) => void,
  ) {
    this.version = version;
    this.#adapter = createRenderAdapter($);
    this.#documentHost = documentHost;
    this.#onError = onError ?? ((error) => documentHost.window.reportError?.(error));
    this.#installListeners();
  }

  #installListeners(): void {
    const { document } = this.#documentHost;
    const listen = <Detail>(type: string, listener: (event: CustomEvent<Detail>) => void): void => {
      this.#listeners.push(
        this.#documentHost.listen(document, type, (event) => {
          const custom = asCustomEvent<Detail>(event);
          if (custom) listener(custom);
        }),
      );
    };

    listen<TurboVisitDetail>("turbo:visit", (event) => {
      this.#restorationVisit = event.detail?.action === "restore";
    });
    listen("turbo:submit-start", () => {
      this.#formVisit = true;
    });
    listen("turbo:load", () => {
      this.#formVisit = false;
      this.#restorationVisit = false;
    });
    listen<TurboRenderDetail>("turbo:before-render", (event) => this.#wrapDocumentRender(event));
    listen<TurboRenderDetail>("turbo:before-frame-render", (event) => this.#wrapFrameRender(event));
    listen("turbo:render", () => this.#commitWaiting("document"));
    listen("turbo:frame-render", (event) => {
      const boundary = isElement(event.target, this.#documentHost.window)
        ? event.target
        : undefined;
      this.#commitWaiting("frame", boundary);
    });
    listen("turbo:before-cache", () =>
      this.#observeNoMutation("turbo.cache.snapshot", "document", "completed"),
    );
    listen<TurboFetchResponseDetail>("turbo:before-fetch-response", (event) => {
      if (event.detail?.fetchResponse?.statusCode === 204) {
        this.#observeNoMutation("turbo.document.no-render", "document", "observed-no-mutation");
        this.#clearVisitContext();
      }
    });
    listen("turbo:fetch-request-error", () => {
      this.#observeNoMutation("turbo.document.error", "document", "failed-before-mutation");
      this.#clearVisitContext();
    });
    listen("turbo:frame-missing", () => {
      this.#observeNoMutation("turbo.document.error", "frame", "failed-before-mutation");
      this.#clearVisitContext();
    });
    listen("turbo:before-visit", (event) => {
      queueMicrotask(() => {
        if (event.defaultPrevented && !this.#disposed) {
          this.#observeNoMutation(
            "turbo.document.canceled",
            "document",
            "canceled-before-mutation",
          );
        }
      });
    });
  }

  #flowId(): StarTurboBridgeFlowId {
    if (this.#restorationVisit) return "turbo.document.restore";
    if (this.#formVisit) return "turbo.form.visit";
    return "turbo.document.visit";
  }

  #clearVisitContext(): void {
    this.#formVisit = false;
    this.#restorationVisit = false;
  }

  #wrapDocumentRender(event: CustomEvent<TurboRenderDetail>): void {
    const detail = event.detail;
    const incoming = detail?.newBody;
    const current = this.#documentHost.document.body;
    if (
      !detail ||
      typeof detail.render !== "function" ||
      !current ||
      !isElement(incoming, this.#documentHost.window) ||
      incoming.localName !== "body"
    ) {
      return;
    }
    const turboPreserved = matchingRoots(current, incoming, "data-turbo-permanent");
    const jqsPreserved = matchingRoots(current, incoming, "data-jqs-preserve");
    detail.render = this.#wrappedRenderer(
      this.#flowId(),
      "document",
      current,
      incoming,
      detail.render,
      turboPreserved,
      jqsPreserved,
    );
  }

  #wrapFrameRender(event: CustomEvent<TurboRenderDetail>): void {
    const detail = event.detail;
    const incoming = detail?.newFrame;
    const current = event.target;
    if (
      !detail ||
      typeof detail.render !== "function" ||
      !isElement(current, this.#documentHost.window) ||
      current.ownerDocument !== this.#documentHost.document ||
      !current.isConnected ||
      current.localName !== "turbo-frame" ||
      !isElement(incoming, this.#documentHost.window) ||
      incoming.localName !== "turbo-frame"
    ) {
      return;
    }
    const turboPreserved = matchingRoots(current, incoming, "data-turbo-permanent");
    const jqsPreserved = matchingRoots(current, incoming, "data-jqs-preserve");
    detail.render = this.#wrappedRenderer(
      "turbo.frame.replace",
      "frame",
      current,
      incoming,
      detail.render,
      turboPreserved,
      jqsPreserved,
    );
  }

  #wrappedRenderer(
    flowId: StarTurboBridgeFlowId,
    targetCategory: "document" | "frame",
    expectedBoundary: Element,
    expectedIncoming: Element,
    hostRender: TurboRenderDetail["render"],
    turboPreserved: readonly Element[],
    jqsPreserved: readonly Element[],
  ): TurboRenderDetail["render"] {
    return (current, incoming) => {
      if (this.#disposed) return hostRender(current, incoming);
      if (current !== expectedBoundary || incoming !== expectedIncoming) {
        throw new Error("Turbo invoked the bridge render callback with an unexpected boundary.");
      }
      const operation = this.#beginRender(flowId, targetCategory, current, [
        ...turboPreserved,
        ...jqsPreserved,
      ]);
      operation.commitOnHostEvent = turboPreserved.length > 0;
      try {
        for (const child of [...current.children]) {
          operation.transaction.beforeRemove(child);
          operation.removalCount += 1;
          this.#publish(operation, "removing");
        }
        moveJqsPreservedRoots(jqsPreserved, incoming);
        const result = hostRender(current, incoming);
        return Promise.resolve(result).then(
          () => this.#hostMutated(operation),
          (error: unknown) => this.#fail(operation, error),
        );
      } catch (error) {
        void this.#fail(operation, error).catch(this.#reportError);
        throw error;
      }
    };
  }

  #beginRender(
    flowId: StarTurboBridgeFlowId,
    targetCategory: "document" | "frame",
    boundary: Element,
    preserveRoots: Iterable<Element>,
  ): ActiveRender {
    for (const active of this.#active) {
      if (!active.terminal && overlaps(boundary, active.boundary)) {
        throw new Error("Overlapping Turbo render boundaries are rejected before begin.");
      }
    }
    const transaction = this.#adapter.begin(boundary, { preserveRoots });
    const operation: ActiveRender = {
      boundary,
      bridgeOperationId: ++this.#bridgeSequence,
      flowId,
      startedAt: performance.now(),
      targetCategory,
      transaction,
      commitOnHostEvent: false,
      mutated: false,
      removalCount: 0,
      settling: false,
      terminal: false,
    };
    this.#active.add(operation);
    this.#publish(operation, "prepared");
    this.#publish(operation, "removing");
    return operation;
  }

  async #hostMutated(operation: ActiveRender): Promise<void> {
    if (operation.settling || operation.terminal) return;
    operation.mutated = true;
    this.#publish(operation, "externally-mutated");
    if (!operation.commitOnHostEvent) await this.#commit(operation);
  }

  #commitWaiting(targetCategory: "document" | "frame", boundary?: Element): void {
    for (const operation of this.#active) {
      if (
        operation.targetCategory === targetCategory &&
        (!boundary || operation.boundary === boundary) &&
        operation.commitOnHostEvent &&
        operation.mutated &&
        !operation.terminal
      ) {
        void this.#commit(operation).catch(this.#reportError);
      }
    }
  }

  async #commit(operation: ActiveRender): Promise<void> {
    if (operation.settling || operation.terminal) return;
    operation.settling = true;
    operation.commitOnHostEvent = false;
    this.#publish(operation, "enhancing");
    const root =
      operation.targetCategory === "document"
        ? this.#documentHost.document.body
        : operation.boundary;
    try {
      await operation.transaction.commit(root ? incomingApplicationRoots(root) : []);
      this.#settle(operation, "committed", "completed");
    } catch (error) {
      this.#settle(operation, "failed", "failed-after-mutation");
      throw error;
    }
  }

  #fail(operation: ActiveRender, error: unknown): Promise<never> {
    if (operation.settling || operation.terminal) throw error;
    operation.settling = true;
    const outcome = operation.mutated ? "failed-after-mutation" : "failed-after-removal";
    return operation.transaction.fail(error).finally(() => {
      this.#settle(operation, "failed", outcome);
    });
  }

  #settle(
    operation: ActiveRender,
    phase: "committed" | "failed",
    outcome: StarTurboBridgeOutcome,
  ): void {
    if (operation.terminal) return;
    operation.terminal = true;
    this.#active.delete(operation);
    this.#publish(operation, phase, outcome);
    for (const resolve of this.#idleWaiters) resolve();
    this.#idleWaiters.clear();
  }

  #observeNoMutation(
    flowId: StarTurboBridgeFlowId,
    targetCategory: "document" | "frame",
    outcome: StarTurboBridgeOutcome,
  ): void {
    const operation: ActiveRender = {
      boundary: this.#documentHost.document.documentElement,
      bridgeOperationId: ++this.#bridgeSequence,
      flowId,
      startedAt: performance.now(),
      targetCategory,
      transaction: undefined as unknown as StarRenderTransaction,
      commitOnHostEvent: false,
      mutated: false,
      removalCount: 0,
      settling: false,
      terminal: true,
    };
    this.#publish(
      operation,
      outcome === "canceled-before-mutation"
        ? "canceled"
        : outcome.startsWith("failed")
          ? "failed"
          : "committed",
      outcome,
    );
  }

  #publish(
    operation: ActiveRender,
    phase: StarTurboBridgePhase,
    outcome: StarTurboBridgeOutcome = "none",
  ): void {
    const observation = Object.freeze<StarTurboBridgeObservation>({
      schema: "jqstar-turbo-bridge-observation/1",
      sequence: ++this.#observationSequence,
      bridgeOperationId: operation.bridgeOperationId,
      renderOperationId: operation.transaction?.operationId ?? null,
      host: "turbo",
      version: this.version,
      flowId: operation.flowId,
      targetCategory: operation.targetCategory,
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
      // Error reporting cannot change Turbo's render path.
    }
  };

  observations(): readonly StarTurboBridgeObservation[] {
    return Object.freeze(this.#records.map((record) => record));
  }

  observe(observer: StarTurboBridgeObserver): () => void {
    if (typeof observer !== "function") throw new TypeError("A Turbo bridge observer is required.");
    if (this.#disposed) throw new Error("The Turbo bridge has been disposed.");
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

  dispose(): Promise<StarTurboBridgeDisposalReport> {
    if (this.#disposal) return this.#disposal;
    this.#disposed = true;
    for (const release of this.#listeners.splice(0).reverse()) release();
    this.#observers.clear();
    const active = [...this.#active];
    this.#disposal = Promise.all(
      active.map((operation) =>
        this.#fail(operation, new Error("The Turbo bridge was disposed.")).catch(() => undefined),
      ),
    ).then(() =>
      Object.freeze({
        schema: "jqstar-turbo-bridge-disposal/1" as const,
        attempted: active.length,
        remaining: this.#active.size,
      }),
    );
    return this.#disposal;
  }
}

export type StarTurboPlugin = StarPlugin<StarTurboBridge>;

export function createTurboBridge(options: StarTurboBridgeOptions): Readonly<StarTurboPlugin> {
  if (!options || typeof options !== "object") {
    throw new TypeError("Turbo bridge options are required.");
  }
  validateCapability(options.Turbo);
  validateVersion(options.version);
  if (options.onError !== undefined && typeof options.onError !== "function") {
    throw new TypeError("Turbo bridge onError must be a function.");
  }
  if (typeof options.$ !== "function") {
    throw new TypeError("The installed jQuery function is required.");
  }
  const { $, onError, version } = options;

  return defineOfficialPlugin({
    name: "core.turbo",
    version: STAR_VERSION,
    apiVersion: `^${STAR_PLUGIN_API_VERSION}`,
    install(registrar) {
      const bridge = new TurboBridgeController($, version, registrar.documentHost, onError);
      registrar.cleanup(() => {
        void bridge.dispose();
      });
      return bridge;
    },
  });
}

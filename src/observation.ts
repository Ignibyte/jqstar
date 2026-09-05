import type { BackendMethod, StarAction, StarContext, StarInstance } from "./types";

export type StarOperationKind = "action" | "request" | "store";
export type StarOperationTerminalPhase = "completed" | "cancelled" | "failed";
export type StarOperationCancellationReason = "superseded" | "cleanup" | "external" | "aborted";

export interface StarOperationOwner {
  readonly id: string;
  readonly mode: "attributes" | "behavior" | "kernel";
}

export interface StarOperationError {
  readonly name: string;
  readonly message: string;
}

export interface StarRequestOperationMetadata {
  readonly method: BackendMethod;
  readonly origin: string;
  readonly path: string;
  readonly attempt: number;
  readonly status?: number;
}

interface StarOperationBase {
  readonly schema: "jquery-star-operation/1";
  readonly id: string;
  readonly kind: StarOperationKind;
  readonly owner: StarOperationOwner;
}

interface StarActionOperationBase extends StarOperationBase {
  readonly kind: "action";
  readonly label: string;
}

export interface StarActionStartedObservation extends StarActionOperationBase {
  readonly phase: "started";
}

export interface StarActionCompletedObservation extends StarActionOperationBase {
  readonly phase: "completed";
}

export interface StarActionCancelledObservation extends StarActionOperationBase {
  readonly phase: "cancelled";
  readonly reason: StarOperationCancellationReason;
}

export interface StarActionFailedObservation extends StarActionOperationBase {
  readonly phase: "failed";
  readonly error: StarOperationError;
}

export type StarActionOperationObservation =
  | StarActionStartedObservation
  | StarActionCompletedObservation
  | StarActionCancelledObservation
  | StarActionFailedObservation;

interface StarRequestOperationBase extends StarOperationBase {
  readonly kind: "request";
  readonly parentId?: string;
  readonly request: StarRequestOperationMetadata;
}

export interface StarRequestStartedObservation extends StarRequestOperationBase {
  readonly phase: "started";
}

export interface StarRequestProgressObservation extends StarRequestOperationBase {
  readonly phase: "progress";
  readonly loaded: number;
  readonly total?: number;
}

export interface StarRequestRetryingObservation extends StarRequestOperationBase {
  readonly phase: "retrying";
}

export interface StarRequestCompletedObservation extends StarRequestOperationBase {
  readonly phase: "completed";
}

export interface StarRequestCancelledObservation extends StarRequestOperationBase {
  readonly phase: "cancelled";
  readonly reason: StarOperationCancellationReason;
}

export interface StarRequestFailedObservation extends StarRequestOperationBase {
  readonly phase: "failed";
  readonly error: StarOperationError;
}

export type StarRequestOperationObservation =
  | StarRequestStartedObservation
  | StarRequestProgressObservation
  | StarRequestRetryingObservation
  | StarRequestCompletedObservation
  | StarRequestCancelledObservation
  | StarRequestFailedObservation;

export type StarStoreOperationCategory =
  "cleanup" | "definition" | "effect" | "setup" | "subscription" | "task" | "change";

export interface StarStoreOperationMetadata {
  readonly category: StarStoreOperationCategory;
  readonly name: string;
  readonly resource: string;
}

interface StarStoreOperationBase extends StarOperationBase {
  readonly kind: "store";
  readonly phase: StarOperationTerminalPhase;
  readonly store: StarStoreOperationMetadata;
}

export interface StarStoreCompletedObservation extends StarStoreOperationBase {
  readonly phase: "completed";
}

export interface StarStoreCancelledObservation extends StarStoreOperationBase {
  readonly phase: "cancelled";
  readonly reason: "cleanup";
}

export interface StarStoreFailedObservation extends StarStoreOperationBase {
  readonly phase: "failed";
  readonly error: StarOperationError;
}

export type StarStoreOperationObservation =
  StarStoreCompletedObservation | StarStoreCancelledObservation | StarStoreFailedObservation;

export type StarOperationObservation =
  StarActionOperationObservation | StarRequestOperationObservation | StarStoreOperationObservation;

export type StarOperationObserver = (
  observation: StarOperationObservation,
) => void | PromiseLike<void>;
export type StarOperationObserverErrorHandler = (error: unknown) => void | PromiseLike<void>;
export type StarOperationUnsubscribe = () => void;

export interface StarOperationSubscriptionOptions {
  readonly kinds?: readonly StarOperationKind[];
  readonly onError?: StarOperationObserverErrorHandler;
}

export interface StarPluginOperationRegistration {
  readonly observer: StarOperationObserver;
  readonly options?: StarOperationSubscriptionOptions;
}

export interface StarPluginOperationSet {
  readonly namespace: string;
  readonly observers: readonly StarPluginOperationRegistration[];
}

export interface PreparedPluginOperationInstall {
  readonly cleanups: ReadonlyMap<string, StarOperationUnsubscribe>;
  commit(): void;
  rollback(): void;
}

interface NormalizedSubscriptionOptions {
  readonly kinds: ReadonlySet<StarOperationKind> | undefined;
  readonly onError: StarOperationObserverErrorHandler | undefined;
}

interface SubscriptionRecord {
  readonly application: StarInstance | undefined;
  readonly observer: StarOperationObserver;
  readonly options: NormalizedSubscriptionOptions;
  committed: boolean;
  release: StarOperationUnsubscribe;
}

interface ApplicationRecord {
  readonly application: StarInstance;
  readonly owner: StarOperationOwner;
}

interface ActionScope {
  readonly hub: OperationHub;
  readonly id: string;
  cancellation: StarOperationCancellationReason | undefined;
}

interface InternalObservation {
  readonly application?: StarInstance;
  readonly value: StarOperationObservation;
}

type OwnOperationSubscription = (
  owner: string,
  cleanup: StarOperationUnsubscribe,
) => StarOperationUnsubscribe;

export interface RequestOperation {
  readonly id: string;
  progress(attempt: number, loaded: number, total?: number): void;
  retrying(attempt: number, status?: number): void;
  completed(attempt: number, status?: number): void;
  cancelled(attempt: number, reason: StarOperationCancellationReason): void;
  failed(attempt: number, error: unknown, status?: number): void;
}

export interface ActionOperation {
  readonly id: string;
  readonly result: unknown;
  active(): boolean;
  completed(): void;
  failed(error: unknown): void;
  settle(): Promise<unknown>;
}

const applicationHubs = new WeakMap<StarInstance, OperationHub>();
const actionScopes = new WeakMap<object, ActionScope>();
const operationSubscriptionOwners = new WeakMap<OperationHub, OwnOperationSubscription>();
const operationKinds = new Set<StarOperationKind>(["action", "request", "store"]);
const noopRequestOperation: RequestOperation = Object.freeze({
  id: "operation-unobserved",
  progress: () => undefined,
  retrying: () => undefined,
  completed: () => undefined,
  cancelled: () => undefined,
  failed: () => undefined,
});

function boundedText(value: string, maximum: number): string {
  const normalized = Array.from(value, (character) => {
    const code = character.charCodeAt(0);
    return code <= 8 || (code >= 11 && code <= 12) || (code >= 14 && code <= 31) || code === 127
      ? "�"
      : character;
  }).join("");
  return normalized.length <= maximum ? normalized : `${normalized.slice(0, maximum - 1)}…`;
}

function errorText(error: unknown): StarOperationError {
  if (error instanceof Error) {
    let name = "Error";
    let message = "An operation failed.";
    try {
      if (typeof error.name === "string" && error.name) name = error.name;
    } catch {
      // Hostile error accessors must not affect the operation being observed.
    }
    try {
      if (typeof error.message === "string") message = error.message;
    } catch {
      // Hostile error accessors must not affect the operation being observed.
    }
    return Object.freeze({
      name: boundedText(name, 120),
      message: boundedText(message, 1_024),
    });
  }

  const kind = error === null ? "null" : typeof error;
  const article = /^[aeiou]/.test(kind) ? "an" : "a";
  let message = `An operation failed with ${article} ${kind} value.`;
  if (["string", "number", "boolean", "bigint", "undefined"].includes(kind)) {
    message = String(error);
  }
  return Object.freeze({
    name: "ThrownValue",
    message: boundedText(message, 1_024),
  });
}

function finiteCount(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(Number.MAX_SAFE_INTEGER, Math.max(0, Math.trunc(value)));
}

function freezeRecord<RecordType extends StarOperationObservation>(record: RecordType): RecordType {
  Object.freeze(record.owner);
  if (record.kind === "request") Object.freeze(record.request);
  if (record.phase === "failed") Object.freeze(record.error);
  return Object.freeze(record);
}

function normalizedOptions(
  observer: StarOperationObserver,
  options: StarOperationSubscriptionOptions | undefined,
): NormalizedSubscriptionOptions {
  if (typeof observer !== "function") {
    throw new TypeError("An operation observer must be a function.");
  }
  if (options !== undefined && (options === null || typeof options !== "object")) {
    throw new TypeError("Operation subscription options must be an object.");
  }
  if (options?.onError !== undefined && typeof options.onError !== "function") {
    throw new TypeError("An operation observer onError handler must be a function.");
  }

  let kinds: ReadonlySet<StarOperationKind> | undefined;
  if (options?.kinds !== undefined) {
    if (!Array.isArray(options.kinds) || options.kinds.length === 0) {
      throw new TypeError("Operation subscription kinds must be a non-empty array.");
    }
    const next = new Set<StarOperationKind>();
    for (const kind of options.kinds as readonly unknown[]) {
      if (!operationKinds.has(kind as StarOperationKind)) {
        throw new TypeError(`Unknown operation kind: ${String(kind)}.`);
      }
      next.add(kind as StarOperationKind);
    }
    kinds = next;
  }

  return { kinds, onError: options?.onError };
}

export function validateOperationSubscription(
  observer: StarOperationObserver,
  options?: StarOperationSubscriptionOptions,
): void {
  normalizedOptions(observer, options);
}

function reportObserverError(
  handler: StarOperationObserverErrorHandler | undefined,
  error: unknown,
): void {
  if (!handler) return;
  try {
    Promise.resolve(handler(error)).catch(() => undefined);
  } catch {
    // Observer error reporting is deliberately outside the operation channel.
  }
}

export class OperationHub {
  private readonly applications = new Map<StarInstance, ApplicationRecord>();
  private readonly subscriptions: SubscriptionRecord[] = [];
  private operationId = 0;
  private applicationId = 0;
  private disposed = false;

  constructor(ownSubscription: OwnOperationSubscription) {
    operationSubscriptionOwners.set(this, ownSubscription);
  }

  trackApplication(application: StarInstance): void {
    this.assertActive();
    if (this.applications.has(application)) return;
    const owner = Object.freeze<StarOperationOwner>({
      id: `application-${++this.applicationId}`,
      mode: application.mode,
    });
    this.applications.set(application, { application, owner });
    applicationHubs.set(application, this);
  }

  releaseApplication(application: StarInstance): void {
    if (!this.applications.delete(application)) return;
    applicationHubs.delete(application);
    for (const record of [...this.subscriptions]) {
      if (record.application === application) record.release();
    }
  }

  observeKernel(
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): StarOperationUnsubscribe {
    this.assertActive();
    return this.createSubscription("operations:kernel", undefined, observer, options, true).release;
  }

  observeApplication(
    application: StarInstance,
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): StarOperationUnsubscribe {
    this.assertActive();
    const applicationRecord = this.applications.get(application);
    if (!applicationRecord) {
      throw new Error("This jQStar application is not owned by the active kernel.");
    }
    return this.createSubscription(
      `${applicationRecord.owner.id}:operations`,
      application,
      observer,
      options,
      true,
    ).release;
  }

  preparePluginInstall(
    registrations: readonly StarPluginOperationSet[],
  ): PreparedPluginOperationInstall {
    this.assertActive();
    const records: SubscriptionRecord[] = [];
    const byNamespace = new Map<string, SubscriptionRecord[]>();
    try {
      for (const registration of registrations) {
        const namespaceRecords: SubscriptionRecord[] = [];
        byNamespace.set(registration.namespace, namespaceRecords);
        for (const { observer, options } of registration.observers) {
          const record = this.createSubscription(
            `plugin:${registration.namespace}:operations`,
            undefined,
            observer,
            options,
            false,
          );
          records.push(record);
          namespaceRecords.push(record);
        }
      }
    } catch (error) {
      for (const record of [...records].reverse()) record.release();
      throw error;
    }

    let settled = false;
    const cleanups = new Map<string, StarOperationUnsubscribe>();
    for (const [namespace, namespaceRecords] of byNamespace) {
      let active = true;
      cleanups.set(namespace, () => {
        if (!active) return;
        active = false;
        for (const record of [...namespaceRecords].reverse()) record.release();
      });
    }

    return {
      cleanups,
      commit: () => {
        if (settled) return;
        settled = true;
        for (const record of records) record.committed = true;
      },
      rollback: () => {
        if (settled) return;
        settled = true;
        for (const record of [...records].reverse()) record.release();
      },
    };
  }

  async runAction(
    application: StarInstance,
    label: string,
    action: StarAction,
    context: StarContext,
  ): Promise<unknown> {
    return this.startAction(application, label, action, context).settle();
  }

  startAction(
    application: StarInstance,
    label: string,
    action: StarAction,
    context: StarContext,
  ): ActionOperation {
    this.assertActive();
    const owner = this.ownerFor(application);
    const id = this.nextOperationId();
    const safeLabel = boundedText(label.trim() || "anonymous", 200);
    const base = {
      schema: "jquery-star-operation/1" as const,
      id,
      kind: "action" as const,
      owner,
      label: safeLabel,
    };
    const scope: ActionScope = { hub: this, id, cancellation: undefined };
    actionScopes.set(context, scope);
    this.publish({ application, value: freezeRecord({ ...base, phase: "started" }) });

    let result: unknown;
    try {
      result = action(context);
    } catch (error) {
      this.publish({
        application,
        value: freezeRecord(
          scope.cancellation
            ? { ...base, phase: "cancelled", reason: scope.cancellation }
            : { ...base, phase: "failed", error: errorText(error) },
        ),
      });
      if (actionScopes.get(context) === scope) actionScopes.delete(context);
      throw error;
    }

    let terminal = false;
    let settlement: Promise<unknown> | undefined;
    const finish = (phase: "completed" | "failed", error?: unknown): void => {
      if (terminal) return;
      terminal = true;
      this.publish({
        application,
        value: freezeRecord(
          scope.cancellation
            ? { ...base, phase: "cancelled", reason: scope.cancellation }
            : phase === "completed"
              ? { ...base, phase: "completed" }
              : { ...base, phase: "failed", error: errorText(error) },
        ),
      });
      if (actionScopes.get(context) === scope) actionScopes.delete(context);
    };

    return Object.freeze<ActionOperation>({
      id,
      result,
      active: () => !terminal && scope.cancellation === undefined && !this.disposed,
      completed: () => finish("completed"),
      failed: (error) => finish("failed", error),
      settle: () => {
        if (settlement) return settlement;
        if (terminal) {
          return Promise.reject(new Error(`Action operation ${id} is already complete.`));
        }
        settlement = Promise.resolve(result).then(
          (value) => {
            finish("completed");
            return value;
          },
          (error: unknown) => {
            finish("failed", error);
            throw error;
          },
        );
        return settlement;
      },
    });
  }

  beginRequest(
    application: StarInstance,
    context: StarContext,
    method: BackendMethod,
    url: URL,
  ): RequestOperation {
    if (this.disposed) return noopRequestOperation;
    const owner = this.applications.get(application)?.owner;
    if (!owner) return noopRequestOperation;
    const id = this.nextOperationId();
    const parentId = actionScopes.get(context)?.id;
    const base = {
      schema: "jquery-star-operation/1" as const,
      id,
      kind: "request" as const,
      owner,
      ...(parentId ? { parentId } : {}),
    };
    let terminal = false;
    const request = (attempt: number, status?: number): StarRequestOperationMetadata =>
      Object.freeze({
        method,
        origin: boundedText(url.origin, 2_048),
        path: boundedText(url.pathname, 2_048),
        attempt: finiteCount(attempt),
        ...(status === undefined ? {} : { status: finiteCount(status) }),
      });
    const emit = (value: StarRequestOperationObservation): void => {
      this.publish({ application, value: freezeRecord(value) });
    };

    emit({ ...base, phase: "started", request: request(0) });
    return Object.freeze<RequestOperation>({
      id,
      progress: (attempt, loaded, total) => {
        if (terminal) return;
        emit({
          ...base,
          phase: "progress",
          request: request(attempt),
          loaded: finiteCount(loaded),
          ...(total === undefined ? {} : { total: finiteCount(total) }),
        });
      },
      retrying: (attempt, status) => {
        if (terminal) return;
        emit({ ...base, phase: "retrying", request: request(attempt, status) });
      },
      completed: (attempt, status) => {
        if (terminal) return;
        terminal = true;
        emit({ ...base, phase: "completed", request: request(attempt, status) });
      },
      cancelled: (attempt, reason) => {
        if (terminal) return;
        terminal = true;
        const scope = actionScopes.get(context);
        if (scope?.hub === this) scope.cancellation ??= reason;
        emit({ ...base, phase: "cancelled", request: request(attempt), reason });
      },
      failed: (attempt, error, status) => {
        if (terminal) return;
        terminal = true;
        emit({
          ...base,
          phase: "failed",
          request: request(attempt, status),
          error: errorText(error),
        });
      },
    });
  }

  emit(value: StarOperationObservation): void {
    this.publish({ value });
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const record of [...this.subscriptions].reverse()) record.release();
    for (const application of this.applications.keys()) applicationHubs.delete(application);
    this.applications.clear();
    operationSubscriptionOwners.delete(this);
  }

  private createSubscription(
    owner: string,
    application: StarInstance | undefined,
    observer: StarOperationObserver,
    options: StarOperationSubscriptionOptions | undefined,
    committed: boolean,
  ): SubscriptionRecord {
    const normalized = normalizedOptions(observer, options);
    let active = true;
    const holder: { record?: SubscriptionRecord } = {};
    const release = operationSubscriptionOwners.get(this)!(owner, () => {
      if (!active) return;
      active = false;
      const record = holder.record;
      if (!record) return;
      const index = this.subscriptions.indexOf(record);
      if (index >= 0) this.subscriptions.splice(index, 1);
    });
    const record = { application, observer, options: normalized, committed, release };
    holder.record = record;
    if (active) this.subscriptions.push(record);
    return record;
  }

  private publish(observation: InternalObservation): void {
    if (this.disposed) return;
    const snapshot = this.subscriptions.filter(
      (record) =>
        record.committed &&
        (record.application === undefined || record.application === observation.application) &&
        (record.options.kinds === undefined || record.options.kinds.has(observation.value.kind)),
    );
    for (const record of snapshot) {
      try {
        Promise.resolve(record.observer(observation.value)).catch((error: unknown) => {
          reportObserverError(record.options.onError, error);
        });
      } catch (error) {
        reportObserverError(record.options.onError, error);
      }
    }
  }

  private nextOperationId(): string {
    return `operation-${++this.operationId}`;
  }

  private ownerFor(application: StarInstance): StarOperationOwner {
    const owner = this.applications.get(application)?.owner;
    if (!owner) throw new Error("This jQStar application is not owned by the active kernel.");
    return owner;
  }

  private assertActive(): void {
    if (this.disposed) throw new Error("This jQStar operation hub has been disposed.");
  }
}

export function beginRequestOperation(
  context: StarContext,
  method: BackendMethod,
  url: URL,
): RequestOperation {
  const hub = applicationHubs.get(context.instance);
  return hub?.beginRequest(context.instance, context, method, url) ?? noopRequestOperation;
}

export function operationCancellationReason(
  signal: AbortSignal,
  external: boolean,
): StarOperationCancellationReason {
  if (signal.reason === "superseded") return "superseded";
  if (signal.reason === "cleanup") return "cleanup";
  return external ? "external" : "aborted";
}

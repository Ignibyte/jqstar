import { isElementNode } from "./dom";
import type { StarKernelMetadataAccess } from "./metadata-types";
import type { StarExpressionEngine } from "./expression-types";
import { attempt, throwCollectedErrors } from "./errors";
import {
  createStarDisposalReport,
  StarDisposalError,
  type StarDisposalReport,
  type StarDisposalReportController,
  type StarDisposalResource,
} from "./disposal";
import {
  createDirectiveRegistry,
  type DirectiveRegistry,
  type StarExpressionHelperRecord,
  type StarExpressionHelperScope,
} from "./directive";
import { createPluginHost, type PluginHost, type StarPluginDocumentHost } from "./plugin";
import {
  OperationHub,
  type ActionOperation,
  type StarOperationObserver,
  type StarOperationSubscriptionOptions,
  type StarOperationUnsubscribe,
} from "./observation";
import { nextUpdate } from "./reactivity";
import { createActionRegistry, type ActionRegistrar, type ActionRegistry } from "./registry";
import { genericProtocolProfile } from "./protocol-generic";
import { ProtocolProfileRegistry } from "./protocol";
import { RequestMiddlewareRegistry } from "./request-middleware";
import type { StarAction, StarContext, StarInstance } from "./types";

export type KernelResourceKind =
  "effect" | "listener" | "observer" | "service" | "subscription" | "task";

export interface KernelResourceSummary {
  readonly kind: KernelResourceKind;
  readonly owner: string;
}

export type DocumentHost = StarPluginDocumentHost;

export interface ApplicationCapabilities {
  readonly directives: DirectiveRegistry;
  readonly expressions: StarExpressionEngine;
  readonly helpers: StarExpressionHelperScope;
  readonly stores: StarContext["stores"];
  applicationCreated(application: StarInstance): void;
  applicationDestroyed(application: StarInstance): void;
  nextApplicationId(): number;
  preservedRootsWithin(tree: Element): readonly Element[];
  observeOperations(
    application: StarInstance,
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): StarOperationUnsubscribe;
  observe(
    owner: string,
    target: Node,
    callback: MutationCallback,
    options: MutationObserverInit,
  ): OwnedObserver;
  resolveAction(name: string): StarAction | undefined;
  resolveHelper(name: string): StarExpressionHelperRecord | undefined;
  runAction(
    application: StarInstance,
    label: string,
    action: StarAction,
    context: StarContext,
  ): Promise<unknown>;
  startAction(
    application: StarInstance,
    label: string,
    action: StarAction,
    context: StarContext,
  ): ActionOperation;
  task(owner: string, task: PromiseLike<unknown>, onError: (error: unknown) => void): () => void;
}

export interface OwnedObserver {
  readonly observer: MutationObserver;
  readonly release: () => void;
}

export interface ApplicationLifecycle {
  releaseTree(tree: Element, preservedRoots?: readonly Element[]): void;
}

export interface RenderTransaction {
  readonly operationId: number;
  preservedWithin(node: Node): readonly Element[];
  beforeRemove(node: Node): void;
  commit(incomingRoots?: Iterable<Element>): void;
  fail(error: unknown): never;
}

export interface RenderTransactionOptions {
  readonly boot?: (root: Element) => void;
  readonly preserveRoots?: Iterable<Element>;
}

interface ResourceRecord extends KernelResourceSummary {
  readonly root: Element | undefined;
  readonly release: () => void;
}

interface DocumentListenerRecord {
  readonly type: string;
  readonly listener: EventListener;
  readonly capture: boolean;
  readonly callback: EventListener;
  active: boolean;
  pending: boolean;
  completedOrder: number;
  owners: number;
  current(): boolean;
  retire(): void;
  remove(): void;
}

interface ApplicationRecord {
  readonly application: StarInstance;
  readonly lifecycle: ApplicationLifecycle | undefined;
  readonly owner: string;
  readonly pluginCleanup: () => void;
}

const cancelledListener = new Error("Listener acquisition was cancelled.");

const claimedDocuments = new WeakMap<Document, Kernel>();
const claimedExpressionEngines = new WeakMap<StarExpressionEngine, Kernel>();

export function compareElementDepth(left: Element, right: Element): number {
  if (right.contains(left)) return -1;
  if (left.contains(right)) return 1;
  return 0;
}

function deepestFirst(left: ApplicationRecord, right: ApplicationRecord): number {
  return compareElementDepth(left.application.root, right.application.root);
}

function containsAny(roots: Iterable<Node>, node: Node): boolean {
  for (const root of roots) if (root.contains(node)) return true;
  return false;
}

export class Kernel {
  readonly $: JQueryStatic;
  readonly actions: ActionRegistry;
  readonly documentHost: DocumentHost;
  readonly expressions: StarExpressionEngine;
  readonly extensions: DirectiveRegistry;
  readonly observations: OperationHub;
  readonly plugins: PluginHost;
  readonly protocols: ProtocolProfileRegistry;
  readonly requestMiddleware: RequestMiddlewareRegistry;

  private readonly applications = new Map<StarInstance, ApplicationRecord>();
  private readonly pendingEnhancements = new Set<Promise<void>>();
  private readonly pendingTasks = new Set<Promise<void>>();
  private readonly activePreservedRoots = new Map<Element, number>();
  private readonly enhancementErrors: unknown[] = [];
  private readonly resources = new Set<ResourceRecord>();
  private readonly documentListeners = new WeakMap<EventTarget, Set<DocumentListenerRecord>>();
  private readonly removalScopes = new Map<ReadonlySet<Element>, readonly Element[]>();
  private readonly removedNodes = new Set<Node>();
  private resourceRemovalObserver: MutationObserver | undefined;
  private metadataFinalizers: Set<(report: StarDisposalReport) => void> | undefined;
  private applicationId = 0;
  private documentListenerId = 0;
  private trackedApplicationId = 0;
  private renderOperationId = 0;
  private isDisposed = false;
  private disposalController: StarDisposalReportController | undefined;
  private disposalError: StarDisposalError | undefined;
  private disposalInProgress = false;

  constructor($: JQueryStatic, documentHost: Document, expressions: StarExpressionEngine) {
    const windowHost = documentHost.defaultView;
    if (!windowHost) throw new Error("jQuery Star needs a Document attached to a Window.");
    if (claimedDocuments.has(documentHost)) {
      throw new Error("This Document is already claimed by a jQuery Star kernel.");
    }
    if (claimedExpressionEngines.has(expressions)) {
      throw new Error("This expression engine is already claimed by a jQStar kernel.");
    }

    this.$ = $;
    this.actions = createActionRegistry();
    this.extensions = createDirectiveRegistry();
    this.observations = new OperationHub((owner, cleanup) => this.subscribe(owner, cleanup));
    this.requestMiddleware = new RequestMiddlewareRegistry();
    this.protocols = new ProtocolProfileRegistry([genericProtocolProfile]);
    this.expressions = expressions;
    this.documentHost = this.createDocumentHost(documentHost, windowHost);
    this.plugins = createPluginHost(
      this.actions,
      this.extensions,
      this.observations,
      this.requestMiddleware,
      this.protocols,
      this.documentHost,
      (target, type, listener, options, current) =>
        this.createOwnedListener(target, type, listener, options, current),
    );
    claimedExpressionEngines.set(expressions, this);
    claimedDocuments.set(documentHost, this);
  }

  get disposed(): boolean {
    return this.isDisposed;
  }

  get disposalSettled(): boolean {
    return this.disposalController !== undefined && !this.disposalInProgress;
  }

  get registerAction(): ActionRegistrar {
    return (name, action) => {
      this.assertActive("register actions");
      this.actions.register(name, action);
    };
  }

  get applicationCapabilities(): ApplicationCapabilities {
    return {
      directives: this.extensions,
      expressions: this.expressions,
      helpers: this.extensions.helpers(),
      stores: (this.plugins.facade("core.stores") as { stores?: StarContext["stores"] } | undefined)
        ?.stores,
      applicationCreated: (application) => {
        this.observations.trackApplication(application);
        this.requestMiddleware.trackApplication(application);
        this.protocols.trackApplication(application);
      },
      resolveAction: (name) => this.actions.resolve(name),
      resolveHelper: (name) => this.extensions.resolveHelper(name),
      runAction: (application, label, action, context) =>
        this.observations.runAction(application, label, action, context),
      startAction: (application, label, action, context) =>
        this.observations.startAction(application, label, action, context),
      applicationDestroyed: (application) => this.releaseApplication(application),
      nextApplicationId: () => {
        this.assertActive("allocate application identities");
        this.plugins.lock();
        return ++this.applicationId;
      },
      preservedRootsWithin: (tree) =>
        [...this.activePreservedRoots.keys()].filter((preserved) => tree.contains(preserved)),
      observeOperations: (application, observer, options) =>
        this.observations.observeApplication(application, observer, options),
      observe: (owner, target, callback, options) =>
        this.createOwnedObserver(owner, target, callback, options),
      task: (owner, task, onError) => this.createOwnedTask(owner, task, onError),
    };
  }

  assertActive(operation: string): void {
    if (this.isDisposed) {
      throw new Error(`This jQuery Star kernel has been disposed and cannot ${operation}.`);
    }
  }

  trackApplication<Application extends StarInstance>(
    application: Application,
    lifecycle?: ApplicationLifecycle,
  ): Application {
    this.assertActive("boot applications");
    this.plugins.lock();
    if (this.applications.has(application)) {
      throw new Error("This jQuery Star application is already tracked by its kernel.");
    }
    this.observations.trackApplication(application);
    this.requestMiddleware.trackApplication(application);
    this.protocols.trackApplication(application);
    let pluginCleanup: () => void;
    try {
      pluginCleanup = this.plugins.applicationSetup(application);
    } catch (error) {
      this.observations.releaseApplication(application);
      this.requestMiddleware.releaseApplication(application);
      this.protocols.releaseApplication(application);
      throw error;
    }
    this.applications.set(application, {
      application,
      lifecycle,
      owner: `application:${++this.trackedApplicationId}`,
      pluginCleanup,
    });
    return application;
  }

  applicationCount(): number {
    return this.applications.size;
  }

  observeOperations(
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): StarOperationUnsubscribe {
    this.assertActive("observe operations");
    return this.observations.observeKernel(observer, options);
  }

  setDefaultProtocolProfile(id: string): void {
    this.assertActive("select a default protocol profile");
    this.protocols.setDefault(id);
  }

  beginRender(root: Element, options: RenderTransactionOptions = {}): RenderTransaction {
    this.assertActive("render patches");
    if (!isElementNode(root) || root.ownerDocument !== this.documentHost.document) {
      throw new Error("A render root must belong to this jQuery Star kernel's Document.");
    }
    if (!root.isConnected)
      throw new Error("A render root must be connected when rendering begins.");

    const suppliedPreservedRoots = Array.from(options.preserveRoots ?? []);
    for (const preserved of suppliedPreservedRoots) {
      if (!isElementNode(preserved) || preserved.ownerDocument !== this.documentHost.document) {
        throw new Error("A preserved root must belong to this jQuery Star kernel's Document.");
      }
      if (!preserved.isConnected) {
        throw new Error("A preserved root must be connected when rendering begins.");
      }
      if (!root.contains(preserved)) {
        throw new Error("A preserved root must be contained by the render root.");
      }
    }

    const markedPreservedRoots = [
      ...(root.hasAttribute("data-jqs-preserve") ? [root] : []),
      ...Array.from(root.querySelectorAll("[data-jqs-preserve]")),
    ];
    const preservedRoots = [...new Set([...markedPreservedRoots, ...suppliedPreservedRoots])];
    const activeElement = this.documentHost.document.activeElement;
    const preservedFocus =
      activeElement && containsAny(preservedRoots, activeElement) ? activeElement : undefined;
    const preservedOwners = new Map(
      preservedRoots.map((preserved) => [
        preserved,
        [...this.applications.values()].filter(
          ({ application }) =>
            application.root !== preserved && application.root.contains(preserved),
        ),
      ]),
    );
    for (const preserved of preservedRoots) {
      this.activePreservedRoots.set(preserved, (this.activePreservedRoots.get(preserved) ?? 0) + 1);
    }

    const operationId = ++this.renderOperationId;
    const errors: unknown[] = [];
    const releasedApplications = new Set<StarInstance>();
    const removalBoundaries = new Set<Element>();
    this.removalScopes.set(removalBoundaries, preservedRoots);
    let finished = false;
    let resolveBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      resolveBarrier = resolve;
    });
    this.pendingEnhancements.add(barrier);
    let focusRetryAnchor: Element | null | undefined;

    const releasePreservation = (): void => {
      for (const preserved of preservedRoots) {
        const count = this.activePreservedRoots.get(preserved) ?? 0;
        if (count <= 1) this.activePreservedRoots.delete(preserved);
        else this.activePreservedRoots.set(preserved, count - 1);
      }
      this.releaseRemovedResources();
    };

    const settle = (): void => {
      void (async () => {
        try {
          await new Promise<void>((resolve) => queueMicrotask(resolve));
          await nextUpdate();
          await new Promise<void>((resolve) => queueMicrotask(resolve));
          await nextUpdate();
          if (
            focusRetryAnchor !== undefined &&
            !this.isDisposed &&
            this.renderOperationId === operationId &&
            preservedFocus?.isConnected &&
            preservedFocus.ownerDocument === this.documentHost.document &&
            this.documentHost.document.activeElement === focusRetryAnchor
          ) {
            focusRetryAnchor = undefined;
            const focus = (preservedFocus as Element & { focus?: (options?: FocusOptions) => void })
              .focus;
            focus?.call(preservedFocus, { preventScroll: true });
          }
        } catch (error) {
          this.enhancementErrors.push(error);
        } finally {
          releasePreservation();
          this.pendingEnhancements.delete(barrier);
          resolveBarrier();
        }
      })();
    };

    const abandon = (): void => {
      if (finished) return;
      finished = true;
      this.removalScopes.delete(removalBoundaries);
      releasePreservation();
      this.pendingEnhancements.delete(barrier);
      resolveBarrier();
    };
    const releaseOperation = this.own("task", `render:${operationId}`, abandon);
    const finish = (): void => {
      if (finished) return;
      finished = true;
      this.removalScopes.delete(removalBoundaries);
      releaseOperation();
      settle();
    };

    const validateBoundary = (node: Node, label: string): Element => {
      if (!isElementNode(node) || node.ownerDocument !== this.documentHost.document) {
        throw new Error(`${label} must belong to this jQuery Star kernel's Document.`);
      }
      const element = node;
      if (!root.contains(element)) {
        throw new Error(`${label} must be contained by the render root.`);
      }
      return element;
    };

    const preservedWithin = (node: Node): readonly Element[] => {
      const element = validateBoundary(node, "A preservation boundary");
      return Object.freeze(preservedRoots.filter((preserved) => element.contains(preserved)));
    };

    const releaseRecords = (records: readonly ApplicationRecord[]): void => {
      for (const { application } of records) {
        if (releasedApplications.has(application)) continue;
        releasedApplications.add(application);
        attempt(errors, () => application.destroy());
        attempt(errors, () => this.releaseApplication(application));
      }
    };

    const releaseAncestors = (
      tree: Element,
      records: Iterable<ApplicationRecord>,
      protectedRoots: readonly Element[] = [],
    ): void => {
      for (const { application, lifecycle } of records) {
        if (
          !lifecycle ||
          application.destroyed ||
          releasedApplications.has(application) ||
          containsAny(protectedRoots, application.root)
        )
          continue;
        attempt(errors, () => lifecycle.releaseTree(tree, protectedRoots));
      }
    };

    const releaseMissingPreservedRoots = (): void => {
      const missing = preservedRoots.filter(
        (preserved) =>
          !preserved.isConnected || preserved.ownerDocument !== this.documentHost.document,
      );
      if (missing.length === 0) return;
      this.removalScopes.set(
        removalBoundaries,
        preservedRoots.filter((root) => !missing.includes(root)),
      );
      for (const preserved of missing) removalBoundaries.add(preserved);
      const records = [...this.applications.values()]
        .filter(({ application }) => containsAny(missing, application.root))
        .sort(deepestFirst);
      releaseRecords(records);
      for (const preserved of missing) {
        this.releaseScopedResources((scope) => preserved.contains(scope), errors);
        releaseAncestors(preserved, preservedOwners.get(preserved) ?? []);
      }
      errors.push(
        new Error(
          `jQuery Star render operation ${operationId} did not retain ${missing.length} promised preserved root${missing.length === 1 ? "" : "s"}.`,
        ),
      );
    };

    const bootIncomingRoots = (incomingRoots: Iterable<Element> | undefined): void => {
      let incoming: Element[];
      try {
        incoming = [...new Set(Array.from(incomingRoots ?? []))];
      } catch (error) {
        errors.push(error);
        return;
      }
      const valid: Element[] = [];
      for (const candidate of incoming) {
        if (!isElementNode(candidate) || candidate.ownerDocument !== this.documentHost.document) {
          errors.push(
            new Error(
              "An incoming application root must belong to this jQuery Star kernel's Document.",
            ),
          );
        } else if (!candidate.isConnected) {
          errors.push(new Error("An incoming application root must be connected before commit."));
        } else {
          valid.push(candidate);
        }
      }
      for (const candidate of valid) {
        const alreadyOwned = [...this.applications.values()].some(
          ({ application }) => application.root === candidate,
        );
        if (!alreadyOwned && options.boot) attempt(errors, () => options.boot!(candidate));
      }
    };

    const restorePreservedFocus = (): void => {
      if (
        this.isDisposed ||
        this.renderOperationId !== operationId ||
        !preservedFocus ||
        !preservedFocus.isConnected ||
        preservedFocus.ownerDocument !== this.documentHost.document
      ) {
        return;
      }
      const focus = (preservedFocus as Element & { focus?: (options?: FocusOptions) => void })
        .focus;
      if (focus)
        attempt(errors, () => {
          const before = this.documentHost.document.activeElement;
          const observation = { receivedFocus: false };
          const received = (): void => {
            observation.receivedFocus = true;
          };
          try {
            preservedFocus.addEventListener("focus", received, true);
            if (this.isDisposed || this.renderOperationId !== operationId) return;
            focus.call(preservedFocus, { preventScroll: true });
            if (
              !observation.receivedFocus &&
              before !== preservedFocus &&
              this.documentHost.document.activeElement === before
            )
              focusRetryAnchor = before;
          } finally {
            attempt(errors, () => preservedFocus.removeEventListener("focus", received, true));
          }
        });
    };

    return {
      operationId,
      preservedWithin,
      beforeRemove: (node) => {
        if (!isElementNode(node)) return;
        const element = validateBoundary(node, "A removal boundary");
        if (containsAny(preservedRoots, element) || containsAny(removalBoundaries, element)) return;
        removalBoundaries.add(element);
        const records = [...this.applications.values()].sort(deepestFirst);
        const protectedRoots = preservedWithin(element);
        this.releaseScopedResources(
          (scope) => element.contains(scope) && !containsAny(protectedRoots, scope),
          errors,
          protectedRoots,
        );
        const outgoing = records.filter(
          ({ application }) =>
            element.contains(application.root) && !containsAny(protectedRoots, application.root),
        );
        releaseRecords(outgoing);
        releaseAncestors(
          element,
          records.filter(({ application }) => application.root.contains(element)),
          protectedRoots,
        );
      },
      commit: (incomingRoots) => {
        releaseMissingPreservedRoots();
        bootIncomingRoots(incomingRoots);
        restorePreservedFocus();
        finish();
        throwCollectedErrors(errors, `jQuery Star render operation ${operationId} failed.`);
      },
      fail: (error) => {
        if (finished) throw error;
        errors.push(error);
        releaseMissingPreservedRoots();
        restorePreservedFocus();
        finish();
        throwCollectedErrors(errors, `jQuery Star render operation ${operationId} failed.`);
        throw error;
      },
    };
  }

  async whenEnhanced(): Promise<void> {
    const errors: unknown[] = [];
    for (;;) {
      try {
        await nextUpdate();
      } catch (error) {
        errors.push(error);
      }
      const pending = [...this.pendingEnhancements, ...this.pendingTasks];
      if (pending.length === 0) break;
      await Promise.all(pending);
    }
    errors.push(...this.enhancementErrors.splice(0));
    throwCollectedErrors(errors, "jQuery Star enhancement failed.");
  }

  metadata(): StarKernelMetadataAccess {
    return Object.freeze<StarKernelMetadataAccess>({
      inventory: (application, resource) => {
        this.assertActive("read metadata");
        for (const record of this.applications.values())
          application(this.observations.ownerFor(record.application));
        for (const record of this.resources) resource(record.kind);
        return Object.freeze([
          this.applications.size,
          this.pendingEnhancements.size,
          this.pendingTasks.size,
          this.protocols.snapshot().length,
          this.protocols.activeBodyCount(),
          this.requestMiddleware.snapshot().length,
        ]);
      },
      plugins: (visit) => this.plugins.metadata(visit),
      observe: (observer) => this.observeOperations(observer),
      own: (kind, cleanup) => this.own(kind, "metadata", cleanup),
      onDisposed: (observer) => {
        this.assertActive("observe disposal");
        (this.metadataFinalizers ??= new Set()).add(observer);
        return () => {
          this.metadataFinalizers?.delete(observer);
        };
      },
    });
  }

  resourceSummary(): readonly KernelResourceSummary[] {
    return [...this.resources].map(({ kind, owner }) => ({ kind, owner }));
  }

  private canOwn(root: Element, connected = false): boolean {
    return (
      !this.isDisposed &&
      (!connected || root.isConnected) &&
      root.ownerDocument === this.documentHost.document &&
      [...this.removalScopes].every(
        ([boundaries, preserved]) => !containsAny(boundaries, root) || containsAny(preserved, root),
      )
    );
  }

  private releaseScopedResources(
    matches: (root: Element) => boolean,
    errors: unknown[],
    preserved: readonly Element[] = [],
  ): void {
    const records = [...this.resources].filter(
      (record): record is ResourceRecord & { root: Element } =>
        record.root !== undefined && matches(record.root),
    );
    const boundaries = new Set(records.map(({ root }) => root));
    this.removalScopes.set(boundaries, preserved);
    try {
      for (const record of records.reverse()) attempt(errors, record.release);
    } finally {
      this.removalScopes.delete(boundaries);
    }
  }

  private releaseRemovedResources(
    records = this.resourceRemovalObserver?.takeRecords() ?? [],
  ): void {
    for (const record of records)
      for (const node of record.removedNodes) this.removedNodes.add(node);
    if (this.removedNodes.size === 0) return;
    const preserved = [...this.activePreservedRoots.keys()];
    this.releaseScopedResources(
      (root) =>
        (!root.isConnected || root.ownerDocument !== this.documentHost.document) &&
        containsAny(this.removedNodes, root) &&
        !containsAny(preserved, root),
      this.enhancementErrors,
      preserved,
    );
    const deferred = preserved.filter(
      (root) =>
        (!root.isConnected || root.ownerDocument !== this.documentHost.document) &&
        containsAny(this.removedNodes, root),
    );
    this.removedNodes.clear();
    for (const root of deferred) this.removedNodes.add(root);
  }

  own(kind: KernelResourceKind, owner: string, cleanup: () => void, root?: Element): () => void {
    this.assertActive("own resources");
    if (root) {
      const connected = root.isConnected;
      if (!this.canOwn(root))
        throw new Error("This root cannot acquire resources in this Document.");
      if (this.resourceRemovalObserver) {
        this.releaseRemovedResources();
      } else {
        const candidate = this.createOwnedObserver(
          "document:resource-removal",
          this.documentHost.document,
          (records) => this.releaseRemovedResources(records),
          { childList: true, subtree: true },
        );
        this.resourceRemovalObserver ??= candidate.observer;
        if (this.resourceRemovalObserver !== candidate.observer) candidate.release();
      }
      if (!this.canOwn(root, connected))
        throw new Error("This root cannot acquire resources in this Document.");
    }
    const record: ResourceRecord = {
      kind,
      owner,
      root,
      release: () => {
        if (!this.resources.delete(record)) return;
        cleanup();
      },
    };
    this.resources.add(record);
    return record.release;
  }

  subscribe(owner: string, cleanup: () => void): () => void {
    return this.own("subscription", owner, cleanup);
  }

  dispose(): StarDisposalReport {
    if (this.disposalController) {
      if (this.disposalInProgress) return this.disposalController.report;
      if (this.disposalError) throw this.disposalError;
      return this.disposalController.report;
    }
    this.isDisposed = true;
    this.disposalInProgress = true;
    const controller = createStarDisposalReport();
    this.disposalController = controller;
    const errors: unknown[] = [];
    const resource = (
      category: StarDisposalResource["category"],
      owner: string,
    ): StarDisposalResource => ({ category, owner });
    const run = (resources: readonly StarDisposalResource[], cleanup: () => void): void => {
      for (const entry of resources) controller.attempt(entry);
      try {
        cleanup();
        for (const entry of resources) controller.release(entry);
      } catch (error) {
        errors.push(error);
        for (const entry of resources) controller.fail(entry, error);
      }
    };

    for (const { application, owner } of [...this.applications.values()]) {
      run(
        [
          resource("application", owner),
          resource("request", `${owner}:requests`),
          resource("listener", `${owner}:events`),
          resource("observer", `${owner}:mutation`),
          resource("effect", `${owner}:reactivity`),
          resource("service", `${owner}:mounted-tree`),
        ],
        () => application.destroy(),
      );
      run([resource("hook", `${owner}:plugins`)], () => this.releaseApplication(application));
    }
    this.applications.clear();

    for (const record of [...this.resources].reverse()) {
      run([resource(record.kind, record.owner)], () => record.release());
    }
    this.removedNodes.clear();
    this.removalScopes.clear();

    run([resource("subscription", "kernel:operations")], () => this.observations.dispose());

    const pluginResources = this.plugins.names().map((name) => resource("plugin", name));
    run(pluginResources, () => this.plugins.dispose());
    run([resource("service", "kernel:request-middleware")], () => this.requestMiddleware.dispose());
    run([resource("request", "kernel:protocols")], () => this.protocols.dispose());
    run([resource("service", "kernel:actions")], () => this.actions.clear());
    run([resource("effect", "kernel:expressions")], () => this.expressions.dispose());
    run([resource("service", "kernel:installation")], () => {
      if (claimedDocuments.get(this.documentHost.document) === this) {
        claimedDocuments.delete(this.documentHost.document);
      }
    });
    this.disposalInProgress = false;
    const finalizers = this.metadataFinalizers;
    this.metadataFinalizers = undefined;
    finalizers?.forEach((notify) => {
      try {
        notify(controller.report);
      } catch {
        /* Observations cannot alter settled cleanup. */
      }
    });
    if (errors.length > 0) {
      this.disposalError = new StarDisposalError(errors, controller.report);
      throw this.disposalError;
    }
    return controller.report;
  }

  private createOwnedObserver(
    owner: string,
    target: Node,
    callback: MutationCallback,
    options: MutationObserverInit,
  ): OwnedObserver {
    this.assertActive("install application observers");
    const lifetime = { active: true };
    let observer: MutationObserver | undefined;
    const release = this.own("observer", owner, () => {
      lifetime.active = false;
      observer?.disconnect();
    });
    try {
      const Observer = (this.documentHost.window as Window & typeof globalThis).MutationObserver;
      this.assertActive("install application observers");
      observer = new Observer((records, observed) => {
        if (lifetime.active && !this.isDisposed) callback.call(observed, records, observed);
      });
      this.assertActive("install application observers");
      observer.observe(target, options);
      this.assertActive("install application observers");
    } catch (error) {
      try {
        if (lifetime.active) release();
        else observer?.disconnect();
      } catch (cleanupError) {
        throw new AggregateError([error, cleanupError], "Observer setup and cleanup failed.", {
          cause: cleanupError,
        });
      }
      throw error;
    }
    return { observer, release };
  }

  private createOwnedTask(
    owner: string,
    task: PromiseLike<unknown>,
    onError: (error: unknown) => void,
  ): () => void {
    this.assertActive("register application tasks");
    let active = true;
    const barrier = Promise.resolve(task).then(
      () => undefined,
      (error: unknown) => {
        if (!active) return;
        try {
          onError(error);
        } catch (reportingError) {
          this.enhancementErrors.push(error, reportingError);
          return;
        }
        this.enhancementErrors.push(error);
      },
    );
    this.pendingTasks.add(barrier);
    const release = this.own("task", owner, () => {
      active = false;
      this.pendingTasks.delete(barrier);
    });
    void barrier.then(release);
    return release;
  }

  private releaseApplication(application: StarInstance): void {
    this.observations.releaseApplication(application);
    this.requestMiddleware.releaseApplication(application);
    this.protocols.releaseApplication(application);
    const record = this.applications.get(application);
    if (!record) return;
    this.applications.delete(application);
    record.pluginCleanup();
  }

  private listenerOptions(
    check: () => void,
    options?: boolean | AddEventListenerOptions,
  ): AddEventListenerOptions {
    const captured = Object.create(null) as AddEventListenerOptions;
    if (typeof options === "boolean") {
      captured.capture = options;
      return captured;
    }
    const capture = Boolean(options?.capture);
    check();
    const once = Boolean(options?.once);
    check();
    const passive = options?.passive;
    check();
    const signal = options?.signal;
    check();
    captured.capture = capture;
    captured.once = once;
    if (passive !== undefined) captured.passive = passive;
    if (signal !== undefined) captured.signal = signal;
    return captured;
  }

  private documentListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options: AddEventListenerOptions,
    order: number,
    current: () => boolean,
  ): DocumentListenerRecord | undefined {
    let records = this.documentListeners.get(target);
    if (!records) {
      records = new Set();
      this.documentListeners.set(target, records);
    }
    const capture = Boolean(options.capture);
    for (const record of records) {
      if (record.type === type && record.listener === listener && record.capture === capture) {
        if (!record.pending && record.current()) {
          return record.completedOrder > order ? undefined : record;
        }
        record.retire();
      }
    }
    const currentRecords = records;
    const active = () => !this.isDisposed;
    const record: DocumentListenerRecord = {
      type,
      listener,
      capture,
      active: true,
      pending: true,
      completedOrder: 0,
      owners: 0,
      current: () => record.active && current() && !options.signal?.aborted,
      callback(event) {
        if (!record.current() || !active()) return;
        if (options.once) record.retire();
        listener.call(this, event);
      },
      retire() {
        record.active = false;
        currentRecords.delete(record);
      },
      remove() {
        record.retire();
        target.removeEventListener(type, record.callback, capture);
      },
    };
    records.add(record);
    return record;
  }

  private createOwnedListener(
    target: EventTarget,
    type: string,
    listener: EventListener,
    options?: boolean | AddEventListenerOptions,
    current: () => boolean = () => true,
  ): () => void {
    this.assertActive("install document listeners");
    const order = ++this.documentListenerId;
    const lifetime = { active: true, acquired: false, pending: true };
    let record: DocumentListenerRecord | undefined;
    const cleanup = () => {
      lifetime.active = false;
      if (!record) return;
      if (lifetime.acquired) {
        lifetime.acquired = false;
        record.owners--;
      }
      if (!record.active || !lifetime.pending || record.owners === 0 || this.isDisposed)
        record.remove();
    };
    const release = this.own("listener", `document:${type}`, cleanup);
    const check = () => {
      this.assertActive("install document listeners");
      if (!current()) throw cancelledListener;
    };
    try {
      check();
      const add = Reflect.get(target, "addEventListener");
      check();
      const captured = this.listenerOptions(check, options);
      record = this.documentListener(target, type, listener, captured, order, current);
      if (!record) {
        release();
        return release;
      }
      record.owners++;
      lifetime.acquired = true;
      check();
      Reflect.apply(add, target, [type, record.callback, captured]);
      check();
      if (record.completedOrder > order) {
        release();
        return release;
      }
      record.completedOrder = order;
      record.pending = false;
      if (!record.active) record.remove();
      lifetime.pending = false;
    } catch (error) {
      try {
        if (lifetime.active) release();
        else cleanup();
      } catch (cleanupError) {
        if (error === cancelledListener) throw cleanupError;
        throw new AggregateError([error, cleanupError], "Listener setup and cleanup failed.", {
          cause: cleanupError,
        });
      }
      if (error === cancelledListener) return release;
      throw error;
    }
    return release;
  }

  private createDocumentHost(documentHost: Document, windowHost: Window): DocumentHost {
    return {
      document: documentHost,
      window: windowHost,
      listen: (target, type, listener, options) =>
        this.createOwnedListener(target, type, listener as EventListener, options),
      observe: (target, callback, options) => {
        this.assertActive("install document observers");
        return this.createOwnedObserver("document:mutation", target, callback, options).observer;
      },
      own: (kind, owner, cleanup, root) => this.own(kind, owner, cleanup, root),
      canOwn: (root) => this.canOwn(root),
      operation: (observation) => this.observations.emit(observation),
      task: (owner, task, onError) => this.createOwnedTask(owner, task, onError),
    };
  }
}

export function kernelForDocument(documentHost: Document): Kernel | undefined {
  return claimedDocuments.get(documentHost);
}

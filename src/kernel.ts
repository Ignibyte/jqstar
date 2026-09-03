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

export type KernelResourceKind = "listener" | "observer" | "service" | "subscription" | "task";

export interface KernelResourceSummary {
  readonly kind: KernelResourceKind;
  readonly owner: string;
}

export type DocumentHost = StarPluginDocumentHost;

export interface ApplicationCapabilities {
  readonly directives: DirectiveRegistry;
  readonly expressions: StarExpressionEngine;
  readonly helpers: StarExpressionHelperScope;
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
  readonly release: () => void;
}

interface ApplicationRecord {
  readonly application: StarInstance;
  readonly lifecycle: ApplicationLifecycle | undefined;
  readonly owner: string;
  readonly pluginCleanup: () => void;
}

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
  private applicationId = 0;
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
        [...this.activePreservedRoots.keys()].filter(
          (preserved) => tree === preserved || tree.contains(preserved),
        ),
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
    if (application.destroyed) {
      const errors: unknown[] = [
        new Error("A jQStar plugin destroyed the application during setup."),
      ];
      attempt(errors, pluginCleanup);
      attempt(errors, () => this.observations.releaseApplication(application));
      attempt(errors, () => this.requestMiddleware.releaseApplication(application));
      attempt(errors, () => this.protocols.releaseApplication(application));
      throwCollectedErrors(errors, "jQStar plugin application setup rollback failed.");
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
    const ElementHost = (this.documentHost.window as Window & typeof globalThis).Element;
    if (!(root instanceof ElementHost) || root.ownerDocument !== this.documentHost.document) {
      throw new Error("A render root must belong to this jQuery Star kernel's Document.");
    }
    if (!root.isConnected)
      throw new Error("A render root must be connected when rendering begins.");

    const suppliedPreservedRoots = Array.from(options.preserveRoots ?? []);
    for (const preserved of suppliedPreservedRoots) {
      if (
        !(preserved instanceof ElementHost) ||
        preserved.ownerDocument !== this.documentHost.document
      ) {
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
      activeElement &&
      preservedRoots.some(
        (preserved) => preserved === activeElement || preserved.contains(activeElement),
      )
        ? activeElement
        : undefined;
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
    let finished = false;
    let resolveBarrier!: () => void;
    const barrier = new Promise<void>((resolve) => {
      resolveBarrier = resolve;
    });
    this.pendingEnhancements.add(barrier);

    const releasePreservation = (): void => {
      for (const preserved of preservedRoots) {
        const count = this.activePreservedRoots.get(preserved) ?? 0;
        if (count <= 1) this.activePreservedRoots.delete(preserved);
        else this.activePreservedRoots.set(preserved, count - 1);
      }
    };

    const settle = (): void => {
      void (async () => {
        try {
          await new Promise<void>((resolve) => queueMicrotask(resolve));
          await nextUpdate();
          await new Promise<void>((resolve) => queueMicrotask(resolve));
          await nextUpdate();
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
      releasePreservation();
      this.pendingEnhancements.delete(barrier);
      resolveBarrier();
    };
    const releaseOperation = this.own("task", `render:${operationId}`, abandon);
    const finish = (): void => {
      if (finished) return;
      finished = true;
      releaseOperation();
      settle();
    };

    const validateBoundary = (node: Node, label: string): Element => {
      if (!(node instanceof ElementHost) || node.ownerDocument !== this.documentHost.document) {
        throw new Error(`${label} must belong to this jQuery Star kernel's Document.`);
      }
      const element = node as Element;
      if (!root.contains(element)) {
        throw new Error(`${label} must be contained by the render root.`);
      }
      return element;
    };

    const preservedWithin = (node: Node): readonly Element[] => {
      const element = validateBoundary(node, "A preservation boundary");
      return Object.freeze(
        preservedRoots.filter((preserved) => element === preserved || element.contains(preserved)),
      );
    };

    const releaseRecords = (records: readonly ApplicationRecord[]): void => {
      for (const { application } of records) {
        if (releasedApplications.has(application)) continue;
        releasedApplications.add(application);
        attempt(errors, () => application.destroy());
        attempt(errors, () => this.releaseApplication(application));
      }
    };

    const releaseMissingPreservedRoots = (): void => {
      const missing = preservedRoots.filter(
        (preserved) =>
          !preserved.isConnected || preserved.ownerDocument !== this.documentHost.document,
      );
      if (missing.length === 0) return;
      const records = [...this.applications.values()]
        .filter(({ application }) =>
          missing.some(
            (preserved) => preserved === application.root || preserved.contains(application.root),
          ),
        )
        .sort(deepestFirst);
      releaseRecords(records);
      for (const preserved of missing) {
        for (const { application, lifecycle } of preservedOwners.get(preserved) ?? []) {
          if (!lifecycle || application.destroyed || releasedApplications.has(application))
            continue;
          attempt(errors, () => lifecycle.releaseTree(preserved));
        }
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
        if (
          !(candidate instanceof ElementHost) ||
          candidate.ownerDocument !== this.documentHost.document
        ) {
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
        !preservedFocus ||
        !preservedFocus.isConnected ||
        preservedFocus.ownerDocument !== this.documentHost.document
      ) {
        return;
      }
      const focus = (preservedFocus as Element & { focus?: (options?: FocusOptions) => void })
        .focus;
      if (focus) attempt(errors, () => focus.call(preservedFocus, { preventScroll: true }));
    };

    return {
      operationId,
      preservedWithin,
      beforeRemove: (node) => {
        if (!(node instanceof ElementHost)) return;
        const element = validateBoundary(node, "A removal boundary");
        if (
          preservedRoots.some((preserved) => preserved === element || preserved.contains(element))
        ) {
          return;
        }
        if ([...removalBoundaries].some((boundary) => boundary.contains(element))) return;
        removalBoundaries.add(element);
        const records = [...this.applications.values()].sort(deepestFirst);
        const protectedRoots = preservedWithin(element);
        const outgoing = records.filter(
          ({ application }) =>
            element.contains(application.root) &&
            !protectedRoots.some(
              (preserved) => preserved === application.root || preserved.contains(application.root),
            ),
        );
        const outgoingApplications = new Set(outgoing.map(({ application }) => application));

        releaseRecords(outgoing);

        for (const { application, lifecycle } of records) {
          if (
            !lifecycle ||
            outgoingApplications.has(application) ||
            releasedApplications.has(application) ||
            application.destroyed ||
            protectedRoots.some(
              (preserved) => preserved === application.root || preserved.contains(application.root),
            ) ||
            !application.root.contains(element)
          ) {
            continue;
          }
          attempt(errors, () => lifecycle.releaseTree(element, protectedRoots));
        }
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

  resourceSummary(): readonly KernelResourceSummary[] {
    return [...this.resources].map(({ kind, owner }) => ({ kind, owner }));
  }

  own(kind: KernelResourceKind, owner: string, cleanup: () => void): () => void {
    this.assertActive("own resources");
    let active = true;
    const record: ResourceRecord = {
      kind,
      owner,
      release: () => {
        if (!active) return;
        active = false;
        this.resources.delete(record);
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

    run([resource("subscription", "kernel:operations")], () => this.observations.dispose());

    for (const record of [...this.resources].reverse()) {
      run([resource(record.kind, record.owner)], () => record.release());
    }

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
    const Observer = (this.documentHost.window as Window & typeof globalThis).MutationObserver;
    const observer = new Observer(callback);
    const release = this.own("observer", owner, () => observer.disconnect());
    try {
      observer.observe(target, options);
    } catch (error) {
      release();
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

  private createDocumentHost(documentHost: Document, windowHost: Window): DocumentHost {
    return {
      document: documentHost,
      window: windowHost,
      listen: (target, type, listener, options) => {
        this.assertActive("install document listeners");
        const eventListener = listener as EventListener;
        target.addEventListener(type, eventListener, options);
        return this.own("listener", `document:${type}`, () =>
          target.removeEventListener(type, eventListener, options),
        );
      },
      observe: (target, callback, options) => {
        this.assertActive("install document observers");
        const Observer = (windowHost as Window & typeof globalThis).MutationObserver;
        const observer = new Observer(callback);
        observer.observe(target, options);
        this.own("observer", "document:mutation", () => observer.disconnect());
        return observer;
      },
      own: (kind, owner, cleanup) => this.own(kind, owner, cleanup),
    };
  }
}

export function kernelForDocument(documentHost: Document): Kernel | undefined {
  return claimedDocuments.get(documentHost);
}

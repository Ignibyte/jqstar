import { attempt, throwCollectedErrors } from "./errors";
import {
  createDirectiveRegistry,
  type DirectiveRegistry,
  type NamespacedExtensionSet,
  type StarDirective,
} from "./directive";
import {
  type OperationHub,
  type PreparedPluginOperationInstall,
  type StarOperationObserver,
  type StarOperationSubscriptionOptions,
  type StarOperationUnsubscribe,
  type StarPluginOperationRegistration,
  type StarStoreOperationObservation,
  validateOperationSubscription,
} from "./observation";
import type { ActionRegistry, NamespacedActionSet } from "./registry";
import type {
  PreparedProtocolProfileInstall,
  ProtocolProfileRegistry,
  StarProtocolProfileDefinition,
} from "./protocol";
import type {
  PreparedRequestMiddlewareInstall,
  RequestMiddlewareRegistry,
  StarRequestMiddlewareDefinition,
} from "./request-middleware";
import { jqstarRealmState } from "./realm-state";
import type { ComputedRecord, StarAction, StarInstance, StateRecord } from "./types";

export const STAR_PLUGIN_API_VERSION = "0.1.0";

export type StarPluginCleanup = () => void;
export type StarPluginResourceKind =
  "effect" | "listener" | "observer" | "service" | "subscription" | "task";

export interface StarPluginDocumentHost {
  readonly document: Document;
  readonly window: Window;
  listen<EventType extends Event = Event>(
    target: EventTarget,
    type: string,
    listener: (event: EventType) => void,
    options?: boolean | AddEventListenerOptions,
  ): () => void;
  observe(
    target: Node,
    callback: MutationCallback,
    options: MutationObserverInit,
  ): MutationObserver;
  own(kind: StarPluginResourceKind, owner: string, cleanup: () => void): () => void;
  operation?(observation: StarStoreOperationObservation): void;
  readonly services?: Pick<StarPluginDocumentHost, "operation" | "own" | "task">;
  task?(owner: string, task: PromiseLike<unknown>, onError: (error: unknown) => void): () => void;
}

export type StarPluginActivation = () => void | StarPluginCleanup;

export type StarPluginApplicationHook = (application: StarInstance) => void | StarPluginCleanup;

export interface StarPluginRegistrar {
  readonly documentHost: StarPluginDocumentHost;
  action<State extends StateRecord = StateRecord, Computed extends ComputedRecord = ComputedRecord>(
    name: string,
    action: StarAction<State, Computed>,
  ): void;
  application(hook: StarPluginApplicationHook): void;
  activate(setup: StarPluginActivation): void;
  cleanup(cleanup: StarPluginCleanup): void;
  directive<Parsed = string>(directive: StarDirective<Parsed>): void;
  helper<Value>(name: string, value: Value): void;
  observeOperations(
    observer: StarOperationObserver,
    options?: StarOperationSubscriptionOptions,
  ): void;
  protocolProfile(profile: StarProtocolProfileDefinition): void;
  requestMiddleware(definition: StarRequestMiddlewareDefinition): void;
}

export interface StarPlugin<Facade = unknown> {
  readonly after?: readonly string[];
  readonly apiVersion: string;
  readonly before?: readonly string[];
  readonly dependencies?: Readonly<Record<string, string>>;
  install(registrar: StarPluginRegistrar): Facade;
  readonly name: string;
  readonly version: string;
}

export type StarPluginFacade<Plugin extends StarPlugin> =
  Plugin extends StarPlugin<infer Facade> ? Facade : never;

interface StableVersion {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

interface InstalledPlugin {
  readonly applicationHooks: readonly StarPluginApplicationHook[];
  readonly cleanups: readonly StarPluginCleanup[];
  readonly facade: unknown;
  readonly name: string;
  readonly plugin: StarPlugin;
  readonly version: string;
}

interface StagedPlugin extends InstalledPlugin {
  readonly activations: readonly StarPluginActivation[];
  readonly actions: readonly (readonly [string, StarAction])[];
  readonly directives: readonly StarDirective[];
  readonly helpers: readonly (readonly [string, unknown])[];
  readonly official: boolean;
  readonly observers: readonly StarPluginOperationRegistration[];
  readonly protocolProfiles: readonly StarProtocolProfileDefinition[];
  readonly requestMiddleware: readonly StarRequestMiddlewareDefinition[];
}

export interface PluginHost {
  applicationSetup(application: StarInstance): () => void;
  dispose(): void;
  facade(name: string): unknown;
  lock(): void;
  names(): readonly string[];
  use<Facade>(plugin: StarPlugin<Facade>): Facade;
  useMany<const Plugins extends readonly StarPlugin[]>(
    plugins: Plugins,
  ): { readonly [Key in keyof Plugins]: StarPluginFacade<Plugins[Key]> };
}

const pluginNamePattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)+$/;
const officialPluginNamePattern = /^[a-z][a-z0-9-]*(?:\.[a-z][a-z0-9-]*)*$/;
const stableVersionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
const officialPlugins = jqstarRealmState[2] as WeakSet<StarPlugin>;

function pluginError(name: string, detail: string): Error {
  return new Error(`Plugin ${name} ${detail}.`);
}

export function defineOfficialPlugin<Facade, Plugin extends StarPlugin<Facade>>(
  plugin: Plugin,
): Readonly<Plugin> {
  officialPlugins.add(plugin);
  return Object.freeze(plugin);
}

function parseStableVersion(value: string, label: string): StableVersion {
  const match = stableVersionPattern.exec(value);
  if (!match) {
    throw new Error(`${label} must be a stable major.minor.patch version: ${value}.`);
  }
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

function compareVersion(left: StableVersion, right: StableVersion): number {
  return left.major - right.major || left.minor - right.minor || left.patch - right.patch;
}

function upperCaret(version: StableVersion): StableVersion {
  if (version.major > 0) return { major: version.major + 1, minor: 0, patch: 0 };
  if (version.minor > 0) return { major: 0, minor: version.minor + 1, patch: 0 };
  return { major: 0, minor: 0, patch: version.patch + 1 };
}

function upperTilde(version: StableVersion): StableVersion {
  return { major: version.major, minor: version.minor + 1, patch: 0 };
}

function satisfiesComparator(version: StableVersion, operator: string, expected: StableVersion) {
  const compared = compareVersion(version, expected);
  switch (operator) {
    case ">":
      return compared > 0;
    case ">=":
      return compared >= 0;
    case "<":
      return compared < 0;
    case "<=":
      return compared <= 0;
    default:
      return compared === 0;
  }
}

export function satisfiesPluginVersionRange(versionValue: string, rangeValue: string): boolean {
  const version = parseStableVersion(versionValue, "Plugin version");
  const range = rangeValue.trim();
  if (range === "*") return true;
  if (!range || range.includes("||")) {
    throw new Error(`Unsupported plugin version range: ${rangeValue}.`);
  }

  if (range.startsWith("^") || range.startsWith("~")) {
    if (/\s/.test(range)) throw new Error(`Unsupported plugin version range: ${rangeValue}.`);
    const lower = parseStableVersion(range.slice(1), "Plugin range boundary");
    const upper = range[0] === "^" ? upperCaret(lower) : upperTilde(lower);
    return compareVersion(version, lower) >= 0 && compareVersion(version, upper) < 0;
  }

  const tokens = range.split(/\s+/);
  return tokens.every((token) => {
    const match = /^(>=|<=|>|<|=)?(.+)$/.exec(token);
    if (!match) throw new Error(`Unsupported plugin version range: ${rangeValue}.`);
    const expected = parseStableVersion(match[2]!, "Plugin range boundary");
    return satisfiesComparator(version, match[1] ?? "", expected);
  });
}

function assertPluginName(name: string, label = "Plugin name", official = false): void {
  if (typeof name !== "string") throw new Error(`${label} must be a string.`);
  const root = name.split(".", 1)[0];
  if (!official && (root === "core" || root === "ui")) {
    throw new Error(`Plugin namespace ${name} is reserved by jQStar.`);
  }
  if (!(official ? officialPluginNamePattern : pluginNamePattern).test(name)) {
    throw new Error(`${label} must be a dot-qualified lowercase namespace: ${name}.`);
  }
}

function assertStringList(value: readonly string[] | undefined, label: string): readonly string[] {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${label} must be an array of plugin names.`);
  const entries = value as readonly unknown[];
  const names: string[] = [];
  const unique = new Set<string>();
  for (const entry of entries) {
    if (typeof entry !== "string") throw new Error(`${label} must contain only plugin names.`);
    const name = entry;
    assertPluginName(name, `${label} entry`);
    if (unique.has(name)) throw new Error(`${label} contains duplicate plugin ${name}.`);
    unique.add(name);
    names.push(name);
  }
  return names;
}

function dependencyEntries(plugin: StarPlugin): readonly (readonly [string, string])[] {
  const dependencies = plugin.dependencies;
  if (dependencies === undefined) return [];
  if (
    dependencies === null ||
    typeof dependencies !== "object" ||
    Array.isArray(dependencies) ||
    ![Object.prototype, null].includes(Object.getPrototypeOf(dependencies) as object | null)
  ) {
    throw pluginError(plugin.name, "dependencies must be a name-to-range record");
  }
  return Object.entries(dependencies).map(([name, range]) => {
    assertPluginName(name, `Plugin ${plugin.name} dependency`);
    if (typeof range !== "string") {
      throw pluginError(plugin.name, `dependency ${name} needs a version range`);
    }
    satisfiesPluginVersionRange("0.0.0", range);
    return [name, range] as const;
  });
}

function validatePlugin(plugin: StarPlugin): void {
  if (!plugin || typeof plugin !== "object") throw new Error("A jQStar plugin must be an object.");
  assertPluginName(plugin.name, "Plugin name", officialPlugins.has(plugin));
  if (typeof plugin.version !== "string") {
    throw pluginError(plugin.name, "version must be a string");
  }
  parseStableVersion(plugin.version, `Plugin ${plugin.name} version`);
  if (typeof plugin.apiVersion !== "string") {
    throw pluginError(plugin.name, "needs an API version range");
  }
  if (!satisfiesPluginVersionRange(STAR_PLUGIN_API_VERSION, plugin.apiVersion)) {
    throw pluginError(
      plugin.name,
      `requires jQStar plugin API ${plugin.apiVersion}; this kernel provides ${STAR_PLUGIN_API_VERSION}`,
    );
  }
  if (typeof plugin.install !== "function") {
    throw pluginError(plugin.name, "needs an install function");
  }
  dependencyEntries(plugin);
  const before = assertStringList(plugin.before, `Plugin ${plugin.name} before`);
  const after = assertStringList(plugin.after, `Plugin ${plugin.name} after`);
  if (before.includes(plugin.name) || after.includes(plugin.name)) {
    throw pluginError(plugin.name, "cannot order itself");
  }
  const conflict = before.find((name) => after.includes(name));
  if (conflict) throw pluginError(plugin.name, `cannot be both before and after ${conflict}`);
}

function addEdge(edges: Map<string, Set<string>>, from: string, to: string): void {
  edges.get(from)!.add(to);
}

function planPlugins(
  candidates: readonly StarPlugin[],
  installed: ReadonlyMap<string, InstalledPlugin>,
): readonly StarPlugin[] {
  const candidateByName = new Map(candidates.map((plugin) => [plugin.name, plugin]));
  const edges = new Map(candidates.map((plugin) => [plugin.name, new Set<string>()]));

  for (const plugin of candidates) {
    for (const [name, range] of dependencyEntries(plugin)) {
      const candidateDependency = candidateByName.get(name);
      const installedDependency = installed.get(name);
      const dependencyVersion = candidateDependency?.version ?? installedDependency?.version;
      if (!dependencyVersion) throw pluginError(plugin.name, `is missing dependency ${name}`);
      if (!satisfiesPluginVersionRange(dependencyVersion, range)) {
        throw pluginError(
          plugin.name,
          `requires ${name} ${range}; version ${dependencyVersion} is available`,
        );
      }
      if (candidateByName.has(name)) addEdge(edges, name, plugin.name);
    }

    for (const name of assertStringList(plugin.after, `Plugin ${plugin.name} after`)) {
      if (candidateByName.has(name)) addEdge(edges, name, plugin.name);
      else if (!installed.has(name)) {
        throw pluginError(plugin.name, `has unknown after target ${name}`);
      }
    }
    for (const name of assertStringList(plugin.before, `Plugin ${plugin.name} before`)) {
      if (candidateByName.has(name)) addEdge(edges, plugin.name, name);
      else if (installed.has(name)) {
        throw pluginError(plugin.name, `cannot be ordered before installed plugin ${name}`);
      } else throw pluginError(plugin.name, `has unknown before target ${name}`);
    }
  }

  const indegree = new Map(candidates.map((plugin) => [plugin.name, 0]));
  for (const targets of edges.values()) {
    for (const target of targets) indegree.set(target, indegree.get(target)! + 1);
  }

  const remaining = new Set(candidates.map((plugin) => plugin.name));
  const ordered: StarPlugin[] = [];
  while (remaining.size > 0) {
    const next = candidates.find(
      (plugin) => remaining.has(plugin.name) && indegree.get(plugin.name) === 0,
    );
    if (!next) {
      throw new Error(
        `Plugin dependency/order graph contains a cycle: ${[...remaining].join(", ")}.`,
      );
    }
    remaining.delete(next.name);
    ordered.push(next);
    for (const target of edges.get(next.name)!) indegree.set(target, indegree.get(target)! - 1);
  }
  return ordered;
}

function assertRegistrarActive(active: boolean, plugin: StarPlugin): void {
  if (!active) throw pluginError(plugin.name, "used its registrar after installation ended");
}

function unavailableDocumentHost(): StarPluginDocumentHost {
  const unavailable = (): never => {
    throw new Error("This plugin host does not provide a Document.");
  };
  return Object.freeze({
    get document(): Document {
      return unavailable();
    },
    get window(): Window {
      return unavailable();
    },
    listen: unavailable,
    observe: unavailable,
    own: unavailable,
  });
}

function stagePlugin(
  plugin: StarPlugin,
  documentHost: StarPluginDocumentHost | undefined,
): StagedPlugin {
  const name = plugin.name;
  const version = plugin.version;
  const official = officialPlugins.has(plugin);
  const activations: StarPluginActivation[] = [];
  const actions: Array<readonly [string, StarAction]> = [];
  const applicationHooks: StarPluginApplicationHook[] = [];
  const cleanups: StarPluginCleanup[] = [];
  const directives: StarDirective[] = [];
  const helpers: Array<readonly [string, unknown]> = [];
  const observers: StarPluginOperationRegistration[] = [];
  const protocolProfiles: StarProtocolProfileDefinition[] = [];
  const requestMiddleware: StarRequestMiddlewareDefinition[] = [];
  const sourceHost = documentHost ?? unavailableDocumentHost();
  const stagedHost = Object.freeze<StarPluginDocumentHost>({
    get document() {
      return sourceHost.document;
    },
    get window() {
      return sourceHost.window;
    },
    listen(target, type, listener, options) {
      let release: (() => void) | undefined;
      let cancelled = false;
      activations.push(() => {
        if (cancelled) return;
        release = sourceHost.listen(target, type, listener, options);
        return () => release?.();
      });
      return () => {
        if (cancelled) return;
        cancelled = true;
        release?.();
      };
    },
    observe(target, callback, options) {
      const Observer = (sourceHost.window as Window & typeof globalThis).MutationObserver;
      const observer = new Observer(callback);
      activations.push(() => {
        observer.observe(target, options);
        return sourceHost.own("observer", `plugin:${plugin.name}:mutation`, () =>
          observer.disconnect(),
        );
      });
      return observer;
    },
    own(kind, owner, cleanup) {
      let release: (() => void) | undefined;
      let cancelled = false;
      activations.push(() => {
        if (cancelled) return;
        release = sourceHost.own(kind, owner, cleanup);
        return () => release?.();
      });
      return () => {
        if (cancelled) return;
        cancelled = true;
        if (release) release();
        else cleanup();
      };
    },
    ...(official ? { services: sourceHost } : {}),
  });
  let active = true;
  const registrar = Object.freeze<StarPluginRegistrar>({
    documentHost: stagedHost,
    action<
      State extends StateRecord = StateRecord,
      Computed extends ComputedRecord = ComputedRecord,
    >(name: string, action: StarAction<State, Computed>) {
      assertRegistrarActive(active, plugin);
      if (typeof name !== "string" || typeof action !== "function") {
        throw pluginError(plugin.name, "action registrations need a name and function");
      }
      actions.push([name, action as StarAction]);
    },
    application(hook: StarPluginApplicationHook) {
      assertRegistrarActive(active, plugin);
      if (typeof hook !== "function") {
        throw pluginError(plugin.name, "application hook must be a function");
      }
      applicationHooks.push(hook);
    },
    activate(setup) {
      assertRegistrarActive(active, plugin);
      if (typeof setup !== "function") {
        throw pluginError(plugin.name, "activation must be a function");
      }
      activations.push(setup);
    },
    cleanup(cleanup: StarPluginCleanup) {
      assertRegistrarActive(active, plugin);
      if (typeof cleanup !== "function") {
        throw pluginError(plugin.name, "cleanup must be a function");
      }
      cleanups.push(cleanup);
    },
    directive<Parsed = string>(directive: StarDirective<Parsed>) {
      assertRegistrarActive(active, plugin);
      if (!directive || typeof directive !== "object") {
        throw pluginError(plugin.name, "directive registrations must be objects");
      }
      directives.push(directive as StarDirective);
    },
    helper<Value>(name: string, value: Value) {
      assertRegistrarActive(active, plugin);
      if (typeof name !== "string") {
        throw pluginError(plugin.name, "helper registrations need a string name");
      }
      helpers.push([name, value]);
    },
    observeOperations(observer, options) {
      assertRegistrarActive(active, plugin);
      validateOperationSubscription(observer, options);
      observers.push(options === undefined ? { observer } : { observer, options });
    },
    protocolProfile(profile) {
      assertRegistrarActive(active, plugin);
      if (!profile || typeof profile !== "object") {
        throw pluginError(plugin.name, "protocol profile registrations must be objects");
      }
      protocolProfiles.push(profile);
    },
    requestMiddleware(definition) {
      assertRegistrarActive(active, plugin);
      if (!definition || typeof definition !== "object") {
        throw pluginError(plugin.name, "request middleware registrations must be objects");
      }
      requestMiddleware.push(definition);
    },
  });

  try {
    const facade = plugin.install(registrar);
    if (
      facade !== null &&
      (typeof facade === "object" || typeof facade === "function") &&
      typeof (facade as { then?: unknown }).then === "function"
    ) {
      throw pluginError(plugin.name, "returned an asynchronous facade");
    }
    return {
      activations,
      actions,
      applicationHooks,
      cleanups,
      directives,
      facade,
      helpers,
      name,
      observers,
      official,
      plugin,
      protocolProfiles,
      requestMiddleware,
      version,
    };
  } catch (error) {
    const errors = [error];
    for (const cleanup of [...cleanups].reverse()) attempt(errors, cleanup);
    throwCollectedErrors(errors, `Plugin ${plugin.name} setup rollback failed.`);
    throw error;
  } finally {
    active = false;
  }
}

function rollbackInstallation(error: unknown, staged: readonly StagedPlugin[]): never {
  const errors = [error];
  for (const record of [...staged].reverse()) {
    for (const cleanup of [...record.cleanups].reverse()) attempt(errors, cleanup);
  }
  throwCollectedErrors(errors, "jQStar plugin installation rollback failed.");
  throw error;
}

function releaseCallbacks(callbacks: readonly StarPluginCleanup[], message: string): void {
  const errors: unknown[] = [];
  for (const cleanup of [...callbacks].reverse()) attempt(errors, cleanup);
  throwCollectedErrors(errors, message);
}

export function createPluginHost(
  actions: ActionRegistry,
  extensions: DirectiveRegistry = createDirectiveRegistry(),
  observations?: Pick<OperationHub, "preparePluginInstall">,
  middleware?: Pick<RequestMiddlewareRegistry, "preparePluginInstall">,
  protocols?: Pick<ProtocolProfileRegistry, "preparePluginInstall">,
  documentHost?: StarPluginDocumentHost,
): PluginHost {
  let installed = new Map<string, InstalledPlugin>();
  let installationOrder: InstalledPlugin[] = [];
  let applicationHooks: StarPluginApplicationHook[] = [];
  let operationCleanups = new Map<string, StarOperationUnsubscribe>();
  let middlewareCleanups = new Map<string, () => void>();
  let protocolCleanups = new Map<string, () => void>();
  let locked = false;
  let disposed = false;
  let installing = false;
  const identities = new WeakMap<StarPlugin, InstalledPlugin>();

  const useMany = <const Plugins extends readonly StarPlugin[]>(
    requested: Plugins,
  ): { readonly [Key in keyof Plugins]: StarPluginFacade<Plugins[Key]> } => {
    if (disposed) throw new Error("This jQStar plugin host has been disposed.");
    if (requested.length === 0) {
      throw new Error("jQStar use() needs at least one plugin.");
    }

    const candidates: StarPlugin[] = [];
    const candidateObjects = new Set<StarPlugin>();
    const candidateNames = new Map<string, StarPlugin>();
    for (const plugin of requested) {
      const byIdentity = plugin && typeof plugin === "object" ? identities.get(plugin) : undefined;
      if (byIdentity) continue;
      validatePlugin(plugin);
      const installedName = installed.get(plugin.name);
      const candidateName = candidateNames.get(plugin.name);
      if (
        (installedName && installedName.plugin !== plugin) ||
        (candidateName && candidateName !== plugin)
      ) {
        throw new Error(`Plugin name ${plugin.name} is already owned by another plugin object.`);
      }
      if (candidateObjects.has(plugin)) continue;
      candidateObjects.add(plugin);
      candidateNames.set(plugin.name, plugin);
      candidates.push(plugin);
    }

    if (candidates.length === 0) {
      return requested.map((plugin) => identities.get(plugin)!.facade) as {
        readonly [Key in keyof Plugins]: StarPluginFacade<Plugins[Key]>;
      };
    }
    if (locked)
      throw new Error("jQStar plugin installation closes when the first application starts.");
    if (installing) throw new Error("jQStar plugin installation cannot be reentrant.");

    const ordered = planPlugins(candidates, installed);
    installing = true;
    try {
      const staged: StagedPlugin[] = [];
      let commitActions: (() => void) | undefined;
      let commitExtensions: (() => void) | undefined;
      let preparedOperations: PreparedPluginOperationInstall | undefined;
      let preparedMiddleware: PreparedRequestMiddlewareInstall | undefined;
      let preparedProtocols: PreparedProtocolProfileInstall | undefined;
      try {
        for (const plugin of ordered) staged.push(stagePlugin(plugin, documentHost));
        const registrations: NamespacedActionSet[] = staged.map((record) => ({
          namespace: record.name,
          actions: record.actions,
        }));
        commitActions = actions.preparePluginInstall(registrations);
        const extensionRegistrations: NamespacedExtensionSet[] = staged.map((record) => ({
          directives: record.directives,
          helpers: record.helpers,
          namespace: record.name,
        }));
        commitExtensions = extensions.preparePluginInstall(extensionRegistrations);
        preparedOperations = observations?.preparePluginInstall(
          staged
            .filter((record) => record.observers.length > 0)
            .map((record) => ({
              namespace: record.name,
              observers: record.observers,
            })),
        );
        preparedMiddleware = middleware?.preparePluginInstall(
          staged
            .filter((record) => record.requestMiddleware.length > 0)
            .map((record) => ({
              namespace: record.name,
              middleware: record.requestMiddleware,
            })),
        );
        preparedProtocols = protocols?.preparePluginInstall(
          staged
            .filter((record) => record.protocolProfiles.length > 0)
            .map((record) => ({
              namespace: record.name,
              official: record.official,
              profiles: record.protocolProfiles,
            })),
        );
        for (const record of staged) {
          for (const activation of record.activations) {
            const cleanup = activation();
            if (cleanup !== undefined && typeof cleanup !== "function") {
              throw pluginError(record.name, "activation returned an invalid cleanup");
            }
            if (cleanup) (record.cleanups as StarPluginCleanup[]).push(cleanup);
          }
        }
      } catch (error) {
        preparedProtocols?.rollback();
        preparedMiddleware?.rollback();
        preparedOperations?.rollback();
        rollbackInstallation(error, staged);
      }

      const nextInstalled = new Map(installed);
      const nextOrder = [...installationOrder, ...staged];
      const nextHooks = [...applicationHooks];
      for (const record of staged) {
        nextInstalled.set(record.name, record);
        nextHooks.push(...record.applicationHooks);
      }
      commitActions?.();
      commitExtensions?.();
      preparedOperations?.commit();
      preparedMiddleware?.commit();
      preparedProtocols?.commit();
      installed = nextInstalled;
      installationOrder = nextOrder;
      applicationHooks = nextHooks;
      for (const record of staged) identities.set(record.plugin, record);
      for (const record of staged) {
        const cleanup = preparedOperations?.cleanups.get(record.name);
        if (cleanup) operationCleanups.set(record.name, cleanup);
        const middlewareCleanup = preparedMiddleware?.cleanups.get(record.name);
        if (middlewareCleanup) middlewareCleanups.set(record.name, middlewareCleanup);
        const protocolCleanup = preparedProtocols?.cleanups.get(record.name);
        if (protocolCleanup) protocolCleanups.set(record.name, protocolCleanup);
      }

      return requested.map((plugin) => identities.get(plugin)!.facade) as {
        readonly [Key in keyof Plugins]: StarPluginFacade<Plugins[Key]>;
      };
    } finally {
      installing = false;
    }
  };

  return {
    use: <Facade>(plugin: StarPlugin<Facade>) => useMany([plugin] as const)[0],
    useMany,
    facade: (name) => installed.get(name)?.facade,
    names: () => installationOrder.map((record) => record.name),
    lock: () => {
      locked = true;
    },
    applicationSetup(application) {
      if (disposed) throw new Error("This jQStar plugin host has been disposed.");
      const cleanups: StarPluginCleanup[] = [];
      try {
        for (const hook of applicationHooks) {
          const cleanup = hook(application);
          if (cleanup !== undefined && typeof cleanup !== "function") {
            throw new Error("A jQStar plugin application hook returned an invalid cleanup.");
          }
          if (cleanup) cleanups.push(cleanup);
        }
      } catch (error) {
        const errors = [error];
        for (const cleanup of [...cleanups].reverse()) attempt(errors, cleanup);
        throwCollectedErrors(errors, "jQStar plugin application setup rollback failed.");
      }

      let active = true;
      return () => {
        if (!active) return;
        active = false;
        releaseCallbacks(cleanups, "jQStar plugin application cleanup failed.");
      };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      locked = true;
      const records = [...installationOrder].reverse();
      installed = new Map();
      installationOrder = [];
      applicationHooks = [];
      const observerCleanups = operationCleanups;
      operationCleanups = new Map();
      const requestMiddlewareCleanups = middlewareCleanups;
      middlewareCleanups = new Map();
      const profileCleanups = protocolCleanups;
      protocolCleanups = new Map();
      const errors: unknown[] = [];
      for (const record of records) {
        const observerCleanup = observerCleanups.get(record.name);
        if (observerCleanup) attempt(errors, observerCleanup);
        const middlewareCleanup = requestMiddlewareCleanups.get(record.name);
        if (middlewareCleanup) attempt(errors, middlewareCleanup);
        const profileCleanup = profileCleanups.get(record.name);
        if (profileCleanup) attempt(errors, profileCleanup);
        for (const cleanup of [...record.cleanups].reverse()) attempt(errors, cleanup);
      }
      attempt(errors, () => extensions.clear());
      throwCollectedErrors(errors, "jQStar plugin disposal failed.");
    },
  };
}

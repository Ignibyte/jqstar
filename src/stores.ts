import {
  defineOfficialPlugin,
  STAR_PLUGIN_API_VERSION,
  type StarPlugin,
  type StarPluginRegistrar,
} from "./plugin";
import { effect, reactive, stop, type ReactiveEffect } from "./reactivity";
import type {
  StarOperationTerminalPhase,
  StarStoreOperationCategory,
  StarStoreOperationObservation,
} from "./observation";
import type {
  StarStoreChange,
  StarStoreCleanup,
  StarStoreDefinition,
  StarStoreListener,
  StarStoreObject,
  StarStoreSelector,
  StarStoreSetupContext,
  StarStoreSubscriptionOptions,
  StarStoreTask,
  StarStoresFacade,
  StarStoresScope,
} from "./stores/types";

export type {
  StarStoreChange,
  StarStoreCleanup,
  StarStoreData,
  StarStoreDefinition,
  StarStoreListener,
  StarStoreMethod,
  StarStoreObject,
  StarStorePrimitive,
  StarStoreSelector,
  StarStoreSetupContext,
  StarStoreSubscriptionOptions,
  StarStoreTask,
  StarStoresFacade,
  StarStoresScope,
} from "./stores/types";

const STORE_NAME = /^[a-z][A-Za-z0-9]*$/;
const MAXIMUM_DEPTH = 64;
const MAXIMUM_NODES = 10_000;
const reservedNames = new Set([
  "action",
  "args",
  "computed",
  "constructor",
  "el",
  "evt",
  "prototype",
  "root",
  "signals",
  "state",
  "stores",
  "__proto__",
]);
const definitions = new WeakSet<object>();

type StoreRecord = {
  active: boolean;
  readonly controller: AbortController;
  readonly definition: StarStoreDefinition<object>;
  readonly id: string;
  readonly name: string;
  readonly releases: StarStoreCleanup[];
  readonly store: object;
  readonly target: object;
};

type GraphState = {
  nodes: number;
  readonly active: WeakSet<object>;
  readonly seen: WeakMap<object, object>;
};

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

function isThenable(value: unknown): value is PromiseLike<unknown> {
  if ((!isObject(value) && typeof value !== "function") || value === null) return false;
  let current: object | null = value as object;
  try {
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, "then");
      if (descriptor) return !("value" in descriptor) || typeof descriptor.value === "function";
      current = Object.getPrototypeOf(current) as object | null;
    }
  } catch {
    return true;
  }
  return false;
}

function assertStoreName(name: unknown): asserts name is string {
  if (
    typeof name !== "string" ||
    name.length > 64 ||
    !STORE_NAME.test(name) ||
    reservedNames.has(name)
  ) {
    throw new TypeError(
      `Store names must be lower-camel ASCII keys and cannot be reserved: ${String(name)}.`,
    );
  }
}

function assertPrimitive(value: unknown, path: string): void {
  if (
    value === null ||
    value === undefined ||
    typeof value === "string" ||
    typeof value === "boolean"
  ) {
    return;
  }
  if (typeof value === "number" && Number.isFinite(value)) return;
  throw new TypeError(
    `Store value ${path} is not an accepted primitive, method, array, or record.`,
  );
}

function cloneValue(value: unknown, path: string, depth: number, state: GraphState): unknown {
  if (typeof value === "function") return value;
  if (!isObject(value)) {
    assertPrimitive(value, path);
    return value;
  }
  if (depth > MAXIMUM_DEPTH) {
    throw new TypeError(`Store value ${path} exceeds the maximum depth of ${MAXIMUM_DEPTH}.`);
  }
  if (state.active.has(value)) throw new TypeError(`Store value ${path} contains a cycle.`);
  const existing = state.seen.get(value);
  if (existing) return existing;
  state.nodes += 1;
  if (state.nodes > MAXIMUM_NODES) {
    throw new TypeError(`Store data exceeds the maximum of ${MAXIMUM_NODES} containers.`);
  }

  let prototype: object | null;
  try {
    prototype = Object.getPrototypeOf(value) as object | null;
  } catch {
    throw new TypeError(`Store value ${path} has an unreadable prototype.`);
  }
  const array = Array.isArray(value);
  if (!array && prototype !== Object.prototype && prototype !== null) {
    throw new TypeError(`Store value ${path} must be an array or plain record.`);
  }
  if (isThenable(value)) throw new TypeError(`Store value ${path} cannot be a promise.`);

  const clone: unknown[] | Record<string, unknown> = array
    ? new Array((value as unknown[]).length)
    : (Object.create(prototype) as Record<string, unknown>);
  state.seen.set(value, clone);
  state.active.add(value);
  try {
    for (const key of Reflect.ownKeys(value)) {
      if (typeof key === "symbol") {
        throw new TypeError(`Store value ${path} cannot contain symbol keys.`);
      }
      if (array && key === "length") continue;
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor)) {
        throw new TypeError(`Store value ${path}.${key} cannot contain accessors.`);
      }
      if (!descriptor.enumerable) continue;
      if (reservedNames.has(key)) {
        throw new TypeError(`Store value ${path} cannot contain the magic key ${key}.`);
      }
      if (array && !/^(0|[1-9]\d*)$/.test(key)) {
        throw new TypeError(`Store array ${path} cannot contain named properties.`);
      }
      clone[key as keyof typeof clone] = cloneValue(
        descriptor.value,
        `${path}.${key}`,
        depth + 1,
        state,
      ) as never;
    }
  } finally {
    state.active.delete(value);
  }
  return clone;
}

function cloneStore<Store extends object>(value: Store, label: string): Store {
  if (!isObject(value) || Array.isArray(value)) {
    throw new TypeError(`${label} must be a plain record.`);
  }
  return cloneValue(value, label, 0, {
    active: new WeakSet(),
    seen: new WeakMap(),
    nodes: 0,
  }) as Store;
}

function assertMethodsUnchanged(
  previous: unknown,
  current: unknown,
  seen = new WeakMap<object, WeakSet<object>>(),
): void {
  if (typeof previous === "function" || typeof current === "function") {
    if (!Object.is(previous, current)) {
      throw new TypeError("Store transactions cannot add, remove, or replace methods.");
    }
    return;
  }
  if (!isObject(previous) || !isObject(current)) {
    const candidate = isObject(previous) ? previous : isObject(current) ? current : undefined;
    if (candidate) assertNoMethods(candidate);
    return;
  }
  let compared = seen.get(previous);
  if (compared?.has(current)) return;
  if (!compared) {
    compared = new WeakSet();
    seen.set(previous, compared);
  }
  compared.add(current);
  const keys = new Set([...Object.keys(previous), ...Object.keys(current)]);
  for (const key of keys) {
    assertMethodsUnchanged(
      (previous as Record<string, unknown>)[key],
      (current as Record<string, unknown>)[key],
      seen,
    );
  }
}

function assertNoMethods(value: object, seen = new WeakSet<object>()): void {
  if (seen.has(value)) return;
  seen.add(value);
  for (const child of Object.values(value)) {
    if (typeof child === "function") {
      throw new TypeError("Store methods cannot be added, removed, or replaced.");
    }
    if (isObject(child)) assertNoMethods(child, seen);
  }
}

function replaceStore(target: object, source: object): void {
  const current = target as Record<string, unknown>;
  const next = source as Record<string, unknown>;
  for (const key of Object.keys(current)) {
    if (!Object.hasOwn(next, key)) delete current[key];
  }
  for (const key of Object.keys(next)) current[key] = next[key];
}

function once(cleanup: StarStoreCleanup): StarStoreCleanup {
  let active = true;
  return () => {
    if (!active) return;
    active = false;
    cleanup();
  };
}

function runReleases(releases: readonly StarStoreCleanup[], message: string): void {
  const errors: unknown[] = [];
  for (const release of [...releases].reverse()) {
    try {
      release();
    } catch (error) {
      errors.push(error);
    }
  }
  if (errors.length === 1) throw errors[0];
  if (errors.length > 1) throw new AggregateError(errors, message);
}

function liveStore<Store extends object>(
  source: Store,
  record: Pick<StoreRecord, "active" | "name">,
  changed: (phase: StarOperationTerminalPhase) => void,
): Store {
  const proxies = new WeakMap<object, object>();
  const wrap = <Value extends object>(value: Value): Value => {
    const existing = proxies.get(value);
    if (existing) return existing as Value;
    const proxy = new Proxy(value, {
      get(target, key, receiver) {
        if (!record.active) throw new Error(`Store ${record.name} has been disposed.`);
        const result = Reflect.get(target, key, receiver) as unknown;
        return isObject(result) ? wrap(result) : result;
      },
      set(target, key, value) {
        if (!record.active) throw new Error(`Store ${record.name} has been disposed.`);
        if (typeof key !== "string" || reservedNames.has(key)) {
          throw new TypeError(`Store ${record.name} cannot write the key ${String(key)}.`);
        }
        try {
          if (typeof Reflect.get(target, key) === "function" || typeof value === "function") {
            throw new TypeError("Store methods cannot be added, removed, or replaced.");
          }
          const candidate = cloneValue(value, `${record.name}.${key}`, 0, {
            active: new WeakSet(),
            seen: new WeakMap(),
            nodes: 0,
          });
          assertMethodsUnchanged(Reflect.get(target, key), candidate);
          const updated = Reflect.set(target, key, candidate);
          if (updated) changed("completed");
          return updated;
        } catch (error) {
          changed("failed");
          throw error;
        }
      },
      deleteProperty(target, key) {
        if (!record.active) throw new Error(`Store ${record.name} has been disposed.`);
        if (typeof key !== "string" || reservedNames.has(key)) {
          throw new TypeError(`Store ${record.name} cannot delete the key ${String(key)}.`);
        }
        try {
          if (typeof Reflect.get(target, key) === "function") {
            throw new TypeError("Store methods cannot be added, removed, or replaced.");
          }
          const deleted = Reflect.deleteProperty(target, key);
          if (deleted) changed("completed");
          return deleted;
        } catch (error) {
          changed("failed");
          throw error;
        }
      },
      defineProperty() {
        throw new TypeError(`Store ${record.name} cannot define property descriptors.`);
      },
      getOwnPropertyDescriptor(target, key) {
        if (!record.active) throw new Error(`Store ${record.name} has been disposed.`);
        return Reflect.getOwnPropertyDescriptor(target, key);
      },
      ownKeys(target) {
        if (!record.active) throw new Error(`Store ${record.name} has been disposed.`);
        return Reflect.ownKeys(target);
      },
    });
    proxies.set(value, proxy);
    return proxy;
  };
  return wrap(source);
}

export function defineStore<Store extends object>(
  definition: StarStoreDefinition<Store>,
): Readonly<StarStoreDefinition<Store>> {
  if (!isObject(definition) || Array.isArray(definition)) {
    throw new TypeError("defineStore() needs a definition object.");
  }
  let prototype: object | null;
  let keys: (string | symbol)[];
  try {
    prototype = Object.getPrototypeOf(definition) as object | null;
    keys = Reflect.ownKeys(definition);
  } catch {
    throw new TypeError("Store definitions must be readable plain records.");
  }
  if (prototype !== Object.prototype && prototype !== null) {
    throw new TypeError("Store definitions must be plain records.");
  }
  if (keys.some((key) => typeof key === "symbol")) {
    throw new TypeError("Store definitions cannot contain symbol keys.");
  }
  const descriptors = new Map<string, PropertyDescriptor>();
  for (const key of keys) {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(definition, key);
    } catch {
      throw new TypeError("Store definition fields must be readable.");
    }
    if (!descriptor) throw new TypeError("Store definition fields must be stable.");
    if (!("value" in descriptor))
      throw new TypeError("Store definitions cannot contain accessors.");
    if (key !== "initial" && key !== "setup") {
      throw new TypeError(`Unknown store definition field: ${String(key)}.`);
    }
    descriptors.set(key, descriptor);
  }
  const initial = descriptors.get("initial");
  if (!initial) {
    throw new TypeError("Store definitions need an initial value or factory.");
  }
  const setup = descriptors.get("setup")?.value as unknown;
  if (setup !== undefined && typeof setup !== "function") {
    throw new TypeError("Store definition setup must be a function.");
  }
  const normalized = Object.freeze({
    initial: initial.value as Store | (() => Store),
    ...(setup ? { setup } : {}),
  }) as Readonly<StarStoreDefinition<Store>>;
  definitions.add(normalized);
  return normalized;
}

function createStores(registrar: StarPluginRegistrar): StarStoresFacade {
  const host = registrar.documentHost.services!;
  const records = new Map<string, StoreRecord>();
  const definitionNames = new WeakMap<object, string>();
  const namespaceTarget = reactive(Object.create(null) as Record<string, StarStoreObject>);
  let active = true;
  let recordId = 0;
  let operationId = 0;
  let subscriptionId = 0;

  const namespace = new Proxy(namespaceTarget, {
    get(target, key) {
      assertNamespaceActive();
      if (typeof key === "symbol") return undefined;
      return target[key];
    },
    has(target, key) {
      assertNamespaceActive();
      if (typeof key !== "string") return false;
      void target[key];
      return Object.hasOwn(target, key);
    },
    ownKeys(target) {
      assertNamespaceActive();
      return Object.keys(target).sort();
    },
    getOwnPropertyDescriptor(target, key) {
      assertNamespaceActive();
      if (typeof key !== "string") return undefined;
      const value = target[key];
      return Object.hasOwn(target, key)
        ? { configurable: true, enumerable: true, value, writable: false }
        : undefined;
    },
    set() {
      throw new TypeError("The stores namespace is read-only.");
    },
    deleteProperty() {
      throw new TypeError("The stores namespace is read-only.");
    },
    defineProperty() {
      throw new TypeError("The stores namespace is read-only.");
    },
    setPrototypeOf() {
      throw new TypeError("The stores namespace prototype is fixed.");
    },
    getPrototypeOf() {
      throw new TypeError("The stores namespace prototype is fixed.");
    },
  }) as StarStoresScope;

  function assertNamespaceActive(): void {
    if (!active) throw new Error("The stores namespace has been disposed.");
  }

  const assertActive = (operation: string): void => {
    if (!active) throw new Error(`The stores facade has been disposed and cannot ${operation}.`);
  };

  const observe = (
    name: string,
    category: StarStoreOperationCategory,
    resource: string,
    phase: StarOperationTerminalPhase,
  ): void => {
    const base = {
      schema: "jquery-star-operation/1" as const,
      id: `store-operation-${++operationId}`,
      kind: "store" as const,
      owner: Object.freeze({ id: "core.stores", mode: "kernel" as const }),
      store: Object.freeze({ category, name, resource }),
    };
    host.operation?.(
      Object.freeze(
        phase === "failed"
          ? {
              ...base,
              phase,
              error: Object.freeze({
                name: "StoreOperationError",
                message: "A store operation failed.",
              }),
            }
          : phase === "cancelled"
            ? { ...base, phase, reason: "cleanup" as const }
            : { ...base, phase },
      ) as StarStoreOperationObservation,
    );
  };

  const subscription = <Store extends object, Selected>(
    record: StoreRecord,
    selector: StarStoreSelector<Store, Selected>,
    listener: StarStoreListener<Store, Selected>,
    options: StarStoreSubscriptionOptions<Selected> | undefined,
    owner: string,
  ): StarStoreCleanup => {
    if (typeof selector !== "function" || typeof listener !== "function") {
      throw new TypeError("Store subscriptions need selector and listener functions.");
    }
    if (options !== undefined && (!isObject(options) || Array.isArray(options))) {
      throw new TypeError("Store subscription options must be an object.");
    }
    if (options?.equality !== undefined && typeof options.equality !== "function") {
      throw new TypeError("Store subscription equality must be a function.");
    }
    const equality = options?.equality ?? Object.is;
    let initialized = false;
    let previous: Selected;
    const deliver = (current: Selected): void => {
      const change = Object.freeze<StarStoreChange<Store, Selected>>({
        current,
        name: record.name,
        previous,
        signal: record.controller.signal,
        store: record.store as Store,
      });
      try {
        const result = listener(change);
        if (isThenable(result)) observe(record.name, "subscription", owner, "failed");
      } catch {
        observe(record.name, "subscription", owner, "failed");
      }
    };
    const runner: ReactiveEffect = effect(
      () => {
        if (!record.active) return;
        const current = selector(record.store as Store);
        if (!initialized) {
          previous = current;
          initialized = true;
          if (options?.immediate) deliver(current);
          return;
        }
        let equal: boolean;
        try {
          equal = equality(previous, current);
        } catch {
          observe(record.name, "subscription", owner, "failed");
          return;
        }
        if (equal) return;
        const prior = previous;
        previous = current;
        const change = Object.freeze<StarStoreChange<Store, Selected>>({
          current,
          name: record.name,
          previous: prior,
          signal: record.controller.signal,
          store: record.store as Store,
        });
        try {
          const result = listener(change);
          if (isThenable(result)) observe(record.name, "subscription", owner, "failed");
        } catch {
          observe(record.name, "subscription", owner, "failed");
        }
      },
      { owner, onError: () => observe(record.name, "subscription", owner, "failed") },
    );
    const owned = host.own("subscription", owner, () => stop(runner));
    observe(record.name, "subscription", owner, "completed");
    const release = once(() => {
      owned();
      observe(record.name, "subscription", owner, "cancelled");
    });
    return release;
  };

  const addRelease = (record: StoreRecord, release: StarStoreCleanup): StarStoreCleanup => {
    const owned = once(release);
    record.releases.push(owned);
    return owned;
  };

  const setupContext = <Store extends object>(record: StoreRecord): StarStoreSetupContext<Store> =>
    Object.freeze({
      name: record.name,
      signal: record.controller.signal,
      store: record.store as Store,
      cleanup(cleanup: StarStoreCleanup) {
        if (typeof cleanup !== "function") throw new TypeError("Store cleanup must be a function.");
        const owner = `${record.id}:cleanup`;
        return addRelease(
          record,
          host.own("service", owner, () => {
            try {
              cleanup();
              observe(record.name, "cleanup", owner, "completed");
            } catch (error) {
              observe(record.name, "cleanup", owner, "failed");
              throw error;
            }
          }),
        );
      },
      effect(run: () => void) {
        if (typeof run !== "function") throw new TypeError("Store effect must be a function.");
        const owner = `${record.id}:effect`;
        const runner = effect(run, {
          owner,
          onError: () => observe(record.name, "effect", owner, "failed"),
        });
        const owned = host.own("effect", owner, () => stop(runner));
        observe(record.name, "effect", owner, "completed");
        return addRelease(
          record,
          once(() => {
            owned();
            observe(record.name, "effect", owner, "cancelled");
          }),
        );
      },
      subscribe<Selected>(
        selector: StarStoreSelector<Store, Selected>,
        listener: StarStoreListener<Store, Selected>,
        options?: StarStoreSubscriptionOptions<Selected>,
      ) {
        return addRelease(
          record,
          subscription(record, selector, listener, options, `${record.id}:setup-subscription`),
        );
      },
      task(task: StarStoreTask) {
        if (typeof task !== "function") throw new TypeError("Store task must be a function.");
        const result = task(record.controller.signal);
        if (!isThenable(result)) throw new TypeError("Store tasks must return a promise.");
        const owner = `${record.id}:task`;
        let settled = false;
        const monitored = Promise.resolve(result).then(
          (value) => {
            settled = true;
            observe(record.name, "task", owner, "completed");
            return value;
          },
          (error: unknown) => {
            settled = true;
            observe(record.name, "task", owner, "failed");
            throw error;
          },
        );
        const owned = host.task!(owner, monitored, () => undefined);
        return addRelease(
          record,
          once(() => {
            owned();
            if (!settled) observe(record.name, "task", owner, "cancelled");
          }),
        );
      },
    });

  const define = <Store extends object>(
    name: string,
    definition: StarStoreDefinition<Store>,
  ): Store => {
    assertActive("define stores");
    assertStoreName(name);
    if (!definitions.has(definition as object)) {
      throw new TypeError("Store definitions must be created with defineStore().");
    }
    const existing = records.get(name);
    if (existing) {
      if (existing.definition !== (definition as unknown as StarStoreDefinition<object>)) {
        throw new Error(`Store ${name} is already defined by another definition object.`);
      }
      return existing.store as Store;
    }
    const priorName = definitionNames.get(definition as object);
    if (priorName !== undefined && priorName !== name) {
      throw new Error(`This store definition already owns the name ${priorName}.`);
    }

    const id = `store-${++recordId}`;
    let cloned: Store;
    try {
      const initial =
        typeof definition.initial === "function"
          ? (definition.initial as () => Store)()
          : definition.initial;
      if (isThenable(initial))
        throw new TypeError(`Store ${name} initial value cannot be a promise.`);
      cloned = cloneStore(initial, `Store ${name}`);
    } catch (error) {
      observe(name, "definition", id, "failed");
      throw error;
    }
    const reactiveTarget = reactive(cloned);
    const record: StoreRecord = {
      active: true,
      controller: new AbortController(),
      definition: definition as unknown as StarStoreDefinition<object>,
      id,
      name,
      releases: [],
      store: undefined as unknown as object,
      target: reactiveTarget,
    };
    const live = liveStore(reactiveTarget, record, (phase) =>
      observe(name, "change", `${id}:change`, phase),
    );
    const published = reactive(live);
    (record as { store: object }).store = published;

    try {
      const setupCleanup = definition.setup?.(setupContext<Store>(record));
      if (setupCleanup !== undefined) {
        if (typeof setupCleanup !== "function") {
          throw new TypeError(`Store ${name} setup returned an invalid cleanup.`);
        }
        const owner = `${record.id}:setup`;
        addRelease(
          record,
          host.own("service", owner, () => {
            try {
              setupCleanup();
              observe(name, "cleanup", owner, "completed");
            } catch (error) {
              observe(name, "cleanup", owner, "failed");
              throw error;
            }
          }),
        );
      }
      const lifetime = host.own("service", `${record.id}:lifetime`, () => {
        if (!record.active) return;
        record.active = false;
        record.controller.abort("cleanup");
        try {
          runReleases(record.releases, `Store ${name} cleanup failed.`);
          observe(name, "cleanup", `${id}:lifetime`, "completed");
        } catch (error) {
          observe(name, "cleanup", `${id}:lifetime`, "failed");
          throw error;
        }
      });
      record.releases.push(once(lifetime));
      records.set(name, record);
      definitionNames.set(definition as object, name);
      namespaceTarget[name] = published as StarStoreObject;
      if (definition.setup) observe(name, "setup", `${id}:setup`, "completed");
      observe(name, "definition", id, "completed");
      return published as Store;
    } catch (error) {
      if (definition.setup) observe(name, "setup", `${id}:setup`, "failed");
      observe(name, "definition", id, "failed");
      record.active = false;
      record.controller.abort("rollback");
      try {
        runReleases(record.releases, `Store ${name} setup rollback failed.`);
      } catch (rollbackError) {
        throw new AggregateError([error, rollbackError], `Store ${name} setup rollback failed.`, {
          cause: rollbackError,
        });
      }
      throw error;
    }
  };

  const facade = Object.freeze<StarStoresFacade>({
    stores: namespace,
    define,
    get<Store extends object = StarStoreObject>(name: string): Store | undefined {
      assertActive("read stores");
      assertStoreName(name);
      return records.get(name)?.store as Store | undefined;
    },
    has(name: string): boolean {
      assertActive("inspect stores");
      assertStoreName(name);
      return records.has(name);
    },
    names(): readonly string[] {
      assertActive("list stores");
      return Object.freeze([...records.keys()].sort());
    },
    subscribe<Store extends object, Selected>(
      name: string,
      selector: StarStoreSelector<Store, Selected>,
      listener: StarStoreListener<Store, Selected>,
      options?: StarStoreSubscriptionOptions<Selected>,
    ): StarStoreCleanup {
      assertActive("subscribe to stores");
      assertStoreName(name);
      const record = records.get(name);
      if (!record) throw new Error(`Store ${name} is not defined.`);
      return subscription(
        record,
        selector,
        listener,
        options,
        `${record.id}:subscription-${++subscriptionId}`,
      );
    },
    transaction<Store extends object>(name: string, update: (draft: Store) => void): Store {
      assertActive("transact stores");
      assertStoreName(name);
      if (typeof update !== "function") throw new TypeError("Store transactions need an updater.");
      const record = records.get(name);
      if (!record) throw new Error(`Store ${name} is not defined.`);
      const resource = `${record.id}:transaction`;
      try {
        const before = cloneStore(record.store, `Store ${name}`) as Store;
        const draft = cloneStore(record.store, `Store ${name} draft`) as Store;
        const result = update(draft);
        if (isThenable(result)) throw new TypeError("Store transactions must be synchronous.");
        const accepted = cloneStore(draft, `Store ${name} draft`);
        assertMethodsUnchanged(before, accepted);
        replaceStore(record.target, accepted);
        observe(name, "change", resource, "completed");
        return record.store as Store;
      } catch (error) {
        observe(name, "change", resource, "failed");
        throw error;
      }
    },
  });

  registrar.cleanup(() => {
    if (!active) return;
    active = false;
    const releases = [...records.values()].map((record) => record.releases.at(-1)!).filter(Boolean);
    records.clear();
    runReleases(releases, "Shared store disposal failed.");
  });
  return facade;
}

export const storesPlugin: Readonly<StarPlugin<StarStoresFacade>> = defineOfficialPlugin({
  apiVersion: STAR_PLUGIN_API_VERSION,
  install: createStores,
  name: "core.stores",
  version: "1.1.0",
});

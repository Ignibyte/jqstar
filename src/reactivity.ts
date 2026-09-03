type Key = string | symbol;

export interface EffectOptions {
  owner?: string;
  onError?: (error: unknown, effect: ReactiveEffect) => void;
}

export interface ReactiveEffect {
  (): void;
  active: boolean;
  dependencies: Set<ReactiveEffect>[];
  owner: string | undefined;
  onError: EffectOptions["onError"];
}

const dependencies = new WeakMap<object, Map<Key, Set<ReactiveEffect>>>();
const proxies = new WeakMap<object, object>();
const rawValues = new WeakMap<object, object>();

let currentEffect: ReactiveEffect | undefined;

const pendingEffects = new Set<ReactiveEffect>();
const pendingErrors: unknown[] = [];
let flushPending = false;

function schedule(effect: ReactiveEffect): void {
  if (!effect.active) return;

  pendingEffects.add(effect);

  if (!flushPending) {
    flushPending = true;
    queueMicrotask(flushEffects);
  }
}

function flushEffects(): void {
  flushPending = false;
  const effects = Array.from(pendingEffects);
  pendingEffects.clear();

  for (const effect of effects) {
    try {
      effect();
    } catch (error) {
      if (effect.onError) {
        try {
          effect.onError(error, effect);
        } catch (reportingError) {
          pendingErrors.push(error, reportingError);
        }
      } else {
        pendingErrors.push(error);
      }
    }
  }

  if (pendingEffects.size > 0 && !flushPending) {
    flushPending = true;
    queueMicrotask(flushEffects);
  }
}

function cleanup(effect: ReactiveEffect): void {
  for (const dependency of effect.dependencies) {
    dependency.delete(effect);
  }
  effect.dependencies.length = 0;
}

function track(target: object, key: Key): void {
  if (!currentEffect?.active) return;

  let byKey = dependencies.get(target);
  if (!byKey) {
    byKey = new Map();
    dependencies.set(target, byKey);
  }

  let effects = byKey.get(key);
  if (!effects) {
    effects = new Set();
    byKey.set(key, effects);
  }

  if (!effects.has(currentEffect)) {
    effects.add(currentEffect);
    currentEffect.dependencies.push(effects);
  }
}

function trigger(target: object, key: Key): void {
  const effects = dependencies.get(target)?.get(key);
  if (!effects) return;

  for (const effect of Array.from(effects)) {
    schedule(effect);
  }
}

function isObject(value: unknown): value is object {
  return typeof value === "object" && value !== null;
}

export function reactive<T extends object>(target: T): T {
  if (rawValues.has(target)) return target;

  const existing = proxies.get(target);
  if (existing) return existing as T;

  const proxy = new Proxy(target, {
    get(source, key, receiver) {
      track(source, key);
      const value = Reflect.get(source, key, receiver) as unknown;
      return isObject(value) ? reactive(value) : value;
    },

    set(source, key, value, receiver) {
      const oldValue = Reflect.get(source, key, receiver) as unknown;
      const candidate = value as unknown;
      const rawValue = isObject(candidate) ? (rawValues.get(candidate) ?? candidate) : candidate;
      const changed = !Object.is(oldValue, rawValue);
      const updated = Reflect.set(source, key, rawValue, receiver);

      if (updated && changed) trigger(source, key);
      return updated;
    },

    deleteProperty(source, key) {
      const existed = Reflect.has(source, key);
      const deleted = Reflect.deleteProperty(source, key);
      if (deleted && existed) trigger(source, key);
      return deleted;
    },
  });

  proxies.set(target, proxy);
  rawValues.set(proxy, target);
  return proxy;
}

export function effect(fn: () => void, options: EffectOptions = {}): ReactiveEffect {
  const runner = (() => {
    if (!runner.active) return;

    cleanup(runner);
    const previous = currentEffect;
    currentEffect = runner;

    try {
      fn();
    } finally {
      currentEffect = previous;
    }
  }) as ReactiveEffect;

  runner.active = true;
  runner.dependencies = [];
  runner.owner = options.owner;
  runner.onError = options.onError;
  try {
    runner();
  } catch (error) {
    stop(runner);
    throw error;
  }
  return runner;
}

export function stop(effect: ReactiveEffect): void {
  if (!effect.active) return;
  effect.active = false;
  pendingEffects.delete(effect);
  cleanup(effect);
}

export async function nextUpdate(): Promise<void> {
  await new Promise<void>((resolve) => queueMicrotask(resolve));
  if (flushPending || pendingEffects.size > 0) {
    await new Promise<void>((resolve) => queueMicrotask(resolve));
  }
  if (pendingErrors.length > 0) {
    const errors = pendingErrors.splice(0);
    throw errors.length === 1
      ? errors[0]
      : new AggregateError(errors, "Reactive effect updates failed.");
  }
}

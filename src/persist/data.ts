import type { StarPersistData, StarPersistErrorCode } from "./types";

export class StarPersistError extends Error {
  readonly code: StarPersistErrorCode;
  constructor(code: StarPersistErrorCode) {
    super(`Persistence operation failed (${code}).`);
    this.name = "StarPersistError";
    this.code = code;
  }
}

export function fail(code: StarPersistErrorCode): never {
  throw new StarPersistError(code);
}

export function sync<Value>(value: Value): Value {
  if (value && (typeof value === "object" || typeof value === "function")) {
    let current: object | null = value;
    while (current) {
      const descriptor = Object.getOwnPropertyDescriptor(current, "then");
      if (descriptor && (!("value" in descriptor) || typeof descriptor.value === "function"))
        fail("contract");
      current = Object.getPrototypeOf(current) as object | null;
    }
  }
  return value;
}

export function attempt<Value>(code: StarPersistErrorCode, run: () => Value): Value {
  try {
    return sync(run());
  } catch (error) {
    throw error instanceof StarPersistError ? error : new StarPersistError(code);
  }
}

export function errorCode(error: unknown): StarPersistErrorCode {
  return error instanceof StarPersistError ? error.code : "contract";
}

export function pipeline<Value>(code: "corrupt" | "migration" | "decode", run: () => Value): Value {
  try {
    return sync(run());
  } catch (error) {
    const original = errorCode(error);
    if (error instanceof StarPersistError && (original === "contract" || original === "limit"))
      throw error;
    throw new StarPersistError(code);
  }
}

export function safeKey(key: string): boolean {
  return !["__proto__", "prototype", "constructor"].includes(key);
}

export function identifier(value: unknown): asserts value is string {
  if (
    typeof value !== "string" ||
    !/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(value) ||
    !value.split(".").every(safeKey)
  )
    fail("contract");
}

export function integer(
  value: unknown,
  minimum = 1,
  maximum = Number.MAX_SAFE_INTEGER,
): asserts value is number {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  )
    fail("contract");
}

export function byteLength(value: string): number {
  return new TextEncoder().encode(value).length;
}

export function storageKey(namespace: string, store: string, explicit?: string): string {
  identifier(namespace);
  identifier(store);
  if (explicit !== undefined) identifier(explicit);
  const key = explicit ?? `jqstar:${encodeURIComponent(namespace)}:${encodeURIComponent(store)}`;
  if (byteLength(key) > 256) fail("limit");
  return key;
}

// Clone only own data descriptors. Persistence never invokes accessors or toJSON methods.
export function cloneData(input: unknown, methods = false, maxBytes = 1_048_576): unknown {
  let nodes = 0;
  let stringBytes = 0;
  const active = new WeakSet();
  const visit = (value: unknown, depth: number): unknown => {
    if (typeof value === "string") {
      stringBytes += value.length;
      if (!methods && stringBytes > maxBytes) fail("limit");
      return value;
    }
    if (value === null || typeof value === "boolean") return value;
    if (typeof value === "number" && Number.isFinite(value)) return value;
    if (methods && (value === undefined || typeof value === "function")) return value;
    if (!value || typeof value !== "object") fail("encode");
    sync(value);
    if (depth > 64 || ++nodes > 10_000) fail("limit");
    if (active.has(value)) fail("encode");
    const array = Array.isArray(value);
    const prototype = Object.getPrototypeOf(value) as object | null;
    if (!array && prototype !== null && prototype !== Object.prototype) fail("encode");
    const result = array ? [] : (Object.create(null) as Record<string, unknown>);
    active.add(value);
    for (const key of Reflect.ownKeys(value)) {
      if (array && key === "length") continue;
      if (typeof key !== "string" || !safeKey(key)) fail("encode");
      const descriptor = Object.getOwnPropertyDescriptor(value, key)!;
      if (!("value" in descriptor) || !descriptor.enumerable) fail("encode");
      if (array && !/^(0|[1-9]\d*)$/.test(key)) fail("encode");
      (result as Record<string, unknown>)[key] = visit(
        (value as Record<string, unknown>)[key],
        depth + 1,
      );
    }
    if (array && Object.keys(result).length !== (value as unknown[]).length) fail("encode");
    active.delete(value);
    return result;
  };
  return visit(input, 0);
}

export function readonlySnapshot<Store extends object>(store: Store): Readonly<Store> {
  const snapshot = cloneData(store, true) as Store;
  const freeze = (value: unknown): void => {
    if (!value || typeof value !== "object" || Object.isFrozen(value)) return;
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  };
  freeze(snapshot);
  return snapshot;
}

export function serialize(value: unknown, maxBytes = 65_536): string {
  const data = cloneData(value, false, maxBytes) as StarPersistData;
  const stable = (item: StarPersistData): string => {
    if (item === null || typeof item !== "object") return JSON.stringify(item);
    if (Array.isArray(item)) return `[${item.map(stable).join(",")}]`;
    return `{${Object.keys(item)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${stable(item[key]!)}`)
      .join(",")}}`;
  };
  const result = stable(data);
  if (byteLength(result) > maxBytes) fail("limit");
  return result;
}

export function parse(text: string, maxBytes: number): StarPersistData {
  if (text.length > maxBytes || byteLength(text) > maxBytes) fail("limit");
  return pipeline("corrupt", () => cloneData(JSON.parse(text)) as StarPersistData);
}

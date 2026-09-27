import type {
  StarInspectionField,
  StarInspectionKind,
  StarInspectionOutcome,
  StarInspectionRecord,
} from "./types";

export const kinds: readonly StarInspectionKind[] = Object.freeze([
  "action",
  "request",
  "store",
  "turbo",
  "htmx",
  "policy",
]);
export const outcomes: readonly StarInspectionOutcome[] = Object.freeze([
  "pending",
  "completed",
  "cancelled",
  "failed",
]);
export const fields: readonly StarInspectionField[] = Object.freeze([
  "actionCapability",
  "storeName",
]);
export const STAR_INSPECTION_LIMITS = Object.freeze({
  maxEntries: 4096,
  maxBytes: 1_048_576,
  maxSnapshotBytes: 262_144,
  maxServiceBytes: 4096,
  maxApplications: 256,
  maxPlugins: 256,
  maxServices: 32,
});

export function invalid(): never {
  throw new Error("Invalid inspection data.");
}

export function plain(value: unknown): object {
  if (!value || typeof value !== "object") return invalid();
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== null && prototype !== Object.prototype) return invalid();
  return value;
}

export function data(value: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(value, key);
  if (!descriptor) return undefined;
  if (!("value" in descriptor)) return invalid();
  return descriptor.value as unknown;
}

export function exact(value: unknown, allowed: readonly string[]): object {
  const object = plain(value);
  const keys = Reflect.ownKeys(object);
  if (keys.length > allowed.length) return invalid();
  for (const key of keys) {
    if (typeof key !== "string" || !allowed.includes(key)) return invalid();
    data(object, key);
  }
  return object;
}

export function integer(value: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min || value > max)
    return invalid();
  return value;
}

export function choice<Value extends string>(value: unknown, allowed: readonly Value[]): Value {
  if (typeof value !== "string" || !allowed.includes(value as Value)) return invalid();
  return value as Value;
}

export function copy<Value>(value: Value): Value {
  const freeze = (item: unknown): void => {
    if (item && typeof item === "object") {
      for (const child of Object.values(item)) freeze(child);
      Object.freeze(item);
    }
  };
  const result = JSON.parse(JSON.stringify(value)) as Value;
  freeze(result);
  return result;
}

export function bytes(value: unknown): number {
  return new TextEncoder().encode(JSON.stringify(value)).byteLength;
}
export function increment(value: number): number {
  return Math.min(Number.MAX_SAFE_INTEGER, value + 1);
}

function identity(value: unknown, pattern: RegExp): string {
  if (typeof value !== "string" || value.length > 64 || !pattern.test(value)) return invalid();
  return value;
}

export function project(
  input: unknown,
  kind: StarInspectionKind,
  sequence: number,
  elapsedMs: number,
  sensitive: (field: StarInspectionField, value: unknown) => string | undefined,
): StarInspectionRecord {
  const object = plain(input);
  if (kind === "turbo" || kind === "htmx") {
    if (data(object, "schema") !== `jqstar-${kind}-bridge-observation/1`) return invalid();
    const phase = choice(data(object, "phase"), [
      "prepared",
      "removing",
      "externally-mutated",
      "enhancing",
      "committed",
      "canceled",
      "failed",
    ]);
    const category = choice(data(object, "targetCategory"), [
      "document",
      "frame",
      "region",
      "out-of-band",
      "history",
    ]);
    const id = `${kind}-${integer(data(object, "bridgeOperationId"), 1)}`;
    const outcome =
      phase === "committed"
        ? "completed"
        : phase === "failed"
          ? "failed"
          : phase === "canceled"
            ? "cancelled"
            : "pending";
    const render = data(object, "renderOperationId");
    return Object.freeze({
      sequence,
      kind,
      phase,
      outcome,
      elapsedMs,
      id,
      category,
      removals: integer(data(object, "removalCount")),
      ...(render === null ? {} : { renderId: integer(render, 1) }),
    });
  }
  if (data(object, "schema") !== "jquery-star-operation/1" || data(object, "kind") !== kind)
    return invalid();
  const id = identity(data(object, "id"), /^(?:store-)?operation-[1-9][0-9]*$/);
  const phase = choice(data(object, "phase"), [
    "started",
    "progress",
    "retrying",
    "completed",
    "cancelled",
    "failed",
  ]);
  const outcome: StarInspectionOutcome =
    phase === "completed" || phase === "cancelled" || phase === "failed" ? phase : "pending";
  const owner = plain(data(object, "owner"));
  const ownerId = identity(data(owner, "id"), /^(?:application-[1-9][0-9]*|core\.stores)$/);
  const base = { sequence, kind, phase, outcome, elapsedMs, id, ownerId };
  if (kind === "action") {
    const actionCapability = sensitive("actionCapability", data(object, "label"));
    return Object.freeze({
      ...base,
      ...(actionCapability === undefined ? {} : { actionCapability }),
    });
  }
  if (kind === "store") {
    const store = plain(data(object, "store"));
    const category = choice(data(store, "category"), [
      "cleanup",
      "definition",
      "effect",
      "setup",
      "subscription",
      "task",
      "change",
    ]);
    const storeName = sensitive("storeName", data(store, "name"));
    return Object.freeze({ ...base, category, ...(storeName === undefined ? {} : { storeName }) });
  }
  const request = plain(data(object, "request"));
  const method = choice(data(request, "method"), [
    "GET",
    "POST",
    "PUT",
    "PATCH",
    "DELETE",
  ] as const);
  const attempt = integer(data(request, "attempt"));
  const status = data(request, "status");
  const parent = data(object, "parentId");
  const loaded = data(object, "loaded");
  const total = data(object, "total");
  return Object.freeze({
    ...base,
    method,
    attempt,
    ...(status === undefined ? {} : { status: integer(status, 0, 599) }),
    ...(parent === undefined ? {} : { parentId: identity(parent, /^operation-[1-9][0-9]*$/) }),
    ...(loaded === undefined ? {} : { loaded: integer(loaded) }),
    ...(total === undefined ? {} : { total: integer(total) }),
  });
}

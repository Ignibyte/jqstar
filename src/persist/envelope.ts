import { attempt, cloneData, fail, identifier, integer, parse, pipeline, serialize } from "./data";
import type {
  StarPersistCodec,
  StarPersistData,
  StarPersistEnvelope,
  StarPersistMigration,
  StarPersistOptions,
  StarPersistRevision,
} from "./types";

export interface NormalizedOptions<Store extends object> {
  readonly namespace: string;
  readonly version: number;
  readonly codec: StarPersistCodec<Store>;
  readonly migrations: Readonly<Record<number, StarPersistMigration>>;
  readonly clock: () => number;
  readonly ttlMs: number | null;
  readonly throttleMs: number;
  readonly maxDelayMs: number;
  readonly maxBytes: number;
  readonly strict: boolean;
  readonly flushOnDispose: boolean;
}

type Migrations = Record<number, StarPersistMigration>;

export function normalize<Store extends object>(
  options: StarPersistOptions<Store>,
): NormalizedOptions<Store> {
  identifier(options.namespace);
  integer(options.version);
  if (!options.codec) fail("contract");
  identifier(options.codec.id);
  integer(options.codec.version);
  if (typeof options.codec.encode !== "function" || typeof options.codec.decode !== "function")
    fail("contract");
  const migrations = Object.create(null) as Migrations;
  for (const [from, migration] of Object.entries(options.migrations ?? {})) {
    const version = Number(from);
    integer(version, 1, options.version - 1);
    if (String(version) !== from || typeof migration !== "function") fail("contract");
    migrations[version] = migration;
  }
  const throttleMs = options.throttleMs ?? 100;
  const maxDelayMs = options.maxDelayMs ?? 1000;
  const maxBytes = options.maxBytes ?? 65_536;
  integer(throttleMs, 0, 2_147_483_647);
  integer(maxDelayMs, Math.max(throttleMs, 1), 2_147_483_647);
  integer(maxBytes, 256, 1_048_576);
  if (options.ttlMs !== undefined) integer(options.ttlMs);
  if (options.clock !== undefined && typeof options.clock !== "function") fail("contract");
  for (const value of [options.strict, options.ownAdapter, options.flushOnDispose]) {
    if (value !== undefined && typeof value !== "boolean") fail("contract");
  }
  return Object.freeze({
    namespace: options.namespace,
    version: options.version,
    codec: Object.freeze({
      id: options.codec.id,
      version: options.codec.version,
      encode: options.codec.encode.bind(options.codec),
      decode: options.codec.decode.bind(options.codec),
    }),
    migrations: Object.freeze(migrations),
    clock: options.clock ?? Date.now,
    ttlMs: options.ttlMs ?? null,
    throttleMs,
    maxDelayMs,
    maxBytes,
    strict: options.strict ?? false,
    flushOnDispose: options.flushOnDispose ?? true,
  });
}

export function time(clock: () => number): number {
  const value = attempt("clock", clock);
  if (!Number.isSafeInteger(value) || value < 0) fail("clock");
  return value;
}

function exact(
  value: unknown,
  fields: readonly string[],
): asserts value is Record<string, unknown> {
  if (
    !value ||
    typeof value !== "object" ||
    Array.isArray(value) ||
    Object.keys(value).sort().join(",") !== [...fields].sort().join(",")
  )
    fail("corrupt");
}

export function readEnvelope<Store extends object>(
  raw: string,
  name: string,
  options: NormalizedOptions<Store>,
): StarPersistEnvelope {
  const value = parse(raw, options.maxBytes);
  exact(value, [
    "format",
    "namespace",
    "store",
    "version",
    "savedAt",
    "expiresAt",
    "revision",
    "codec",
    "data",
  ]);
  if (
    value.format !== "jquery-star-persist/1" ||
    value.namespace !== options.namespace ||
    value.store !== name
  )
    fail("corrupt");
  if (
    !Number.isSafeInteger(value.version) ||
    (value.version as number) < 1 ||
    !Number.isSafeInteger(value.savedAt) ||
    (value.savedAt as number) < 0 ||
    (value.expiresAt !== null &&
      (!Number.isSafeInteger(value.expiresAt) ||
        (value.expiresAt as number) < (value.savedAt as number)))
  )
    fail("corrupt");
  exact(value.revision, ["counter", "origin"]);
  if (
    !Number.isSafeInteger(value.revision.counter) ||
    (value.revision.counter as number) < 1 ||
    typeof value.revision.origin !== "string" ||
    !/^[a-zA-Z0-9-]{1,64}$/.test(value.revision.origin)
  )
    fail("corrupt");
  exact(value.codec, ["id", "version"]);
  if (value.codec.id !== options.codec.id || value.codec.version !== options.codec.version)
    fail("decode");
  if ((value.version as number) > options.version) fail("future-version");
  return value as unknown as StarPersistEnvelope;
}

export function migrate<Store extends object>(
  envelope: StarPersistEnvelope,
  options: NormalizedOptions<Store>,
): StarPersistData {
  let data = cloneData(envelope.data) as StarPersistData;
  for (let version = envelope.version; version < options.version; version++) {
    const migration = options.migrations[version];
    if (!migration) fail("migration");
    data = pipeline("migration", () => cloneData(migration(data)) as StarPersistData);
    serialize(data, options.maxBytes);
  }
  return data;
}

export function compareRevision(left: StarPersistRevision, right: StarPersistRevision): number {
  return left.counter === right.counter
    ? left.origin === right.origin
      ? 0
      : left.origin > right.origin
        ? 1
        : -1
    : left.counter > right.counter
      ? 1
      : -1;
}

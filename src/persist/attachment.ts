import type { StarStoresFacade } from "../stores/types";
import {
  attempt,
  byteLength,
  cloneData,
  errorCode,
  fail,
  pipeline,
  readonlySnapshot,
  serialize,
  StarPersistError,
} from "./data";
import { compareRevision, migrate, readEnvelope, time, type NormalizedOptions } from "./envelope";
import type {
  StarPersistAdapter,
  StarPersistAdapterChange,
  StarPersistAttachment,
  StarPersistData,
  StarPersistDisposalReport,
  StarPersistEnvelope,
  StarPersistErrorCode,
  StarPersistResult,
  StarPersistRevision,
  StarPersistStatus,
} from "./types";

export interface AttachmentContext<Store extends object> {
  readonly id: string;
  readonly name: string;
  readonly key: string;
  readonly origin: string;
  readonly window: Window;
  readonly stores: StarStoresFacade;
  readonly store: Store;
  readonly adapter: StarPersistAdapter;
  readonly owned: boolean;
  readonly options: NormalizedOptions<Store>;
}

export function createAttachment<Store extends object>(
  context: AttachmentContext<Store>,
): {
  readonly attachment: StarPersistAttachment;
  start(): void;
  rollback(): void;
} {
  const { id, name, key, origin, window, stores, store, adapter, owned, options } = context;
  const listeners = new Set<(status: StarPersistStatus) => void>();
  let active = true;
  let disposing = false;
  let started = false;
  let writing = false;
  let disabled = false;
  let dirty = false;
  let counter = 0;
  let revision: StarPersistRevision | null = null;
  let acceptedRaw: string | null = null;
  let selected = "";
  let timer: number | undefined;
  let firstChange: number | undefined;
  let releaseStore: (() => void) | undefined;
  let releaseAdapter: (() => void) | undefined;
  let disposal: StarPersistDisposalReport | undefined;
  let status = Object.freeze<StarPersistStatus>({
    attachment: id,
    adapter: adapter.kind,
    store: name,
    version: options.version,
    codecVersion: options.codec.version,
    revision: null,
    outcome: "ready",
    error: null,
    bytes: 0,
    time: 0,
  });

  function report(
    outcome: StarPersistStatus["outcome"],
    error: StarPersistErrorCode | null = null,
    bytes = status.bytes,
  ): StarPersistResult {
    status = Object.freeze({
      ...status,
      revision: revision ? Object.freeze({ ...revision }) : null,
      outcome,
      error,
      bytes,
      time: status.time,
    });
    if (started)
      for (const listener of [...listeners]) {
        try {
          attempt("contract", () => listener(status));
        } catch {
          continue;
        }
      }
    return Object.freeze({ ok: error === null, status });
  }

  function cancelTimer(): void {
    if (timer !== undefined) window.clearTimeout(timer);
    timer = undefined;
    firstChange = undefined;
  }

  function disable(error: unknown): StarPersistResult {
    disabled = true;
    dirty = false;
    cancelTimer();
    return report("disabled", errorCode(error));
  }

  function now(): number {
    const value = time(options.clock);
    status = Object.freeze({ ...status, time: value });
    return value;
  }

  function encode(value: Readonly<Store>): string {
    const data = attempt("encode", () => options.codec.encode(value));
    return serialize(data, options.maxBytes);
  }

  function snapshot(): string {
    return encode(readonlySnapshot(store));
  }

  function available(): void {
    if (!adapter.available()) fail("unavailable");
  }

  function decode(envelope: StarPersistEnvelope): string {
    const data = migrate(envelope, options);
    let encoded = "";
    pipeline("decode", () =>
      stores.transaction<Store>(name, (draft) => {
        attempt("decode", () => options.codec.decode(cloneData(data) as StarPersistData, draft));
        encoded = encode(readonlySnapshot(draft));
      }),
    );
    return encoded;
  }

  function schedule(): void {
    if (!active || disabled) return;
    dirty = true;
    const monotonic = window.performance.now();
    firstChange ??= monotonic;
    if (timer !== undefined) window.clearTimeout(timer);
    const remaining = Math.max(0, options.maxDelayMs - (monotonic - firstChange));
    timer = window.setTimeout(
      () => {
        timer = undefined;
        flush();
      },
      Math.min(options.throttleMs, remaining),
    );
    report("pending");
  }

  function apply(envelope: StarPersistEnvelope, raw: string, external: boolean): void {
    const canonicalRaw = serialize(envelope, options.maxBytes);
    const encoded = decode(envelope);
    selected = encoded;
    revision = Object.freeze({ ...envelope.revision });
    counter = Math.max(counter, revision.counter);
    acceptedRaw = canonicalRaw;
    dirty = false;
    disabled = false;
    cancelTimer();
    report(external ? "external" : "hydrated", null, byteLength(raw));
    if (envelope.version < options.version) schedule();
  }

  function repair(): void {
    if (!acceptedRaw || !revision) return;
    const current = adapter.read(key);
    if (current === acceptedRaw || current === null) return;
    const stored = readEnvelope(current, name, options);
    if (compareRevision(stored.revision, revision) >= 0) return;
    writing = true;
    try {
      adapter.replace(key, acceptedRaw);
    } finally {
      writing = false;
    }
  }

  function external(change: StarPersistAdapterChange): void {
    if (!started || !active || writing || disabled || (change.key !== key && change.key !== null))
      return;
    try {
      if (change.value === null) fail("deleted");
      const envelope = readEnvelope(change.value, name, options);
      const currentTime = now();
      if (envelope.expiresAt !== null && envelope.expiresAt <= currentTime) fail("deleted");
      const order = revision ? compareRevision(envelope.revision, revision) : 1;
      if (order <= 0) {
        if (order === 0 && acceptedRaw !== serialize(envelope, options.maxBytes)) fail("corrupt");
        if (order < 0) repair();
        return;
      }
      if (envelope.revision.origin === origin) return;
      apply(envelope, change.value, true);
    } catch (error) {
      disable(error);
    }
  }

  function subscribeAdapter(): void {
    if (!releaseAdapter && adapter.subscribe) releaseAdapter = adapter.subscribe(external);
  }

  function hydrate(): void {
    available();
    const raw = adapter.read(key);
    const currentTime = now();
    // Acquire fallible listener resources before the live transaction or storage removal.
    subscribeAdapter();
    if (raw === null) {
      selected = snapshot();
      disabled = false;
      dirty = false;
      cancelTimer();
      report("missing", null, 0);
      return;
    }
    const envelope = readEnvelope(raw, name, options);
    if (envelope.expiresAt !== null && envelope.expiresAt <= currentTime) {
      const encoded = snapshot();
      writing = true;
      try {
        adapter.remove(key);
      } finally {
        writing = false;
      }
      selected = encoded;
      acceptedRaw = null;
      revision = null;
      disabled = false;
      dirty = false;
      cancelTimer();
      report("expired", null, 0);
      return;
    }
    apply(envelope, raw, false);
  }

  function writeSnapshot(): StarPersistResult {
    if (disabled) return Object.freeze({ ok: false, status });
    cancelTimer();
    try {
      const encoded = snapshot();
      if (!dirty && encoded === selected) return Object.freeze({ ok: true, status });
      available();
      const raw = adapter.read(key);
      if (raw !== null) {
        const stored = readEnvelope(raw, name, options);
        counter = Math.max(counter, stored.revision.counter);
      }
      const savedAt = now();
      const expiresAt = options.ttlMs === null ? null : savedAt + options.ttlMs;
      if (expiresAt !== null && !Number.isSafeInteger(expiresAt)) fail("clock");
      if (!Number.isSafeInteger(counter + 1)) fail("limit");
      const nextRevision = Object.freeze({ counter: counter + 1, origin });
      const envelope: StarPersistEnvelope = {
        format: "jquery-star-persist/1",
        namespace: options.namespace,
        store: name,
        version: options.version,
        savedAt,
        expiresAt,
        revision: nextRevision,
        codec: { id: options.codec.id, version: options.codec.version },
        data: JSON.parse(encoded) as StarPersistData,
      };
      const nextRaw = serialize(envelope, options.maxBytes);
      writing = true;
      try {
        adapter.replace(key, nextRaw);
      } finally {
        writing = false;
      }
      revision = nextRevision;
      counter = nextRevision.counter;
      selected = encoded;
      acceptedRaw = nextRaw;
      dirty = false;
      return report("written", null, byteLength(nextRaw));
    } catch (error) {
      return disable(error);
    }
  }

  function flush(): StarPersistResult {
    return active ? writeSnapshot() : Object.freeze({ ok: false, status });
  }

  function cleanups(flushPending: boolean): StarPersistDisposalReport {
    active = false;
    started = false;
    disposing = true;
    const errors: StarPersistErrorCode[] = [];
    if (flushPending) {
      const result = writeSnapshot();
      if (!result.ok && result.status.error) errors.push(result.status.error);
    }
    for (const cleanup of [
      cancelTimer,
      releaseStore,
      releaseAdapter,
      ...(owned ? [() => adapter.dispose()] : []),
    ]) {
      if (!cleanup) continue;
      try {
        attempt("cleanup", cleanup);
      } catch (error) {
        errors.push(errorCode(error));
      }
    }
    const result = report("disposed", errors[0] ?? null);
    listeners.clear();
    return Object.freeze({ ...result, errors: Object.freeze(errors) });
  }

  const attachment: StarPersistAttachment = Object.freeze({
    id,
    status: () => status,
    flush,
    retry() {
      if (!active) return Object.freeze({ ok: false, status });
      try {
        hydrate();
        return Object.freeze({ ok: true, status });
      } catch (error) {
        return disable(error);
      }
    },
    reset() {
      if (!active) return Object.freeze({ ok: false, status });
      try {
        available();
        const encoded = snapshot();
        subscribeAdapter();
        writing = true;
        try {
          adapter.remove(key);
        } finally {
          writing = false;
        }
        selected = encoded;
        acceptedRaw = null;
        revision = null;
        disabled = false;
        cancelTimer();
        dirty = true;
        report("reset", null, 0);
        return flush();
      } catch (error) {
        return disable(error);
      }
    },
    subscribe(listener: (value: StarPersistStatus) => void) {
      if (!active) fail("disposed");
      if (typeof listener !== "function") fail("contract");
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      if (disposing && !disposal) fail("disposed");
      disposal ??= cleanups(options.flushOnDispose);
      return disposal;
    },
  });

  return {
    attachment,
    start() {
      // Validate the codec and select dependencies before any hydration can commit.
      selected = snapshot();
      releaseStore = stores.subscribe<Store, string>(
        name,
        () => {
          try {
            return snapshot();
          } catch (error) {
            if (started) disable(error);
            else throw error;
            return selected;
          }
        },
        ({ current }) => {
          if (current !== selected) schedule();
        },
      );
      try {
        hydrate();
      } catch (error) {
        if (options.strict || errorCode(error) === "contract")
          throw new StarPersistError(errorCode(error));
        disable(error);
      }
      started = true;
    },
    rollback() {
      disposal ??= cleanups(false);
    },
  };
}

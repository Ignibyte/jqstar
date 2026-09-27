import $ from "jquery";
import { afterEach, expect, it, vi } from "vitest";
import { installStarCore } from "../src/core";
import {
  createFieldCodec,
  persistPlugin,
  StarPersistError,
  type StarPersistAdapter,
  type StarPersistAdapterChange,
  type StarPersistData,
  type StarPersistEnvelope,
  type StarPersistOptions,
} from "../src/persist";
import { defineStore, storesPlugin } from "../src/stores";
import * as adapters from "../src/persist/adapters";

type Preferences = { count: number };
const installations: { frame: HTMLIFrameElement; dispose: () => void }[] = [];

function setup() {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentDocument;
  if (!owner) throw new Error("Missing test document.");
  const star = installStarCore($, { document: owner }).star;
  installations.push({ frame, dispose: () => star.dispose() });
  const stores = star.use(storesPlugin);
  const persist = star.use(persistPlugin);
  const store = stores.define("preferences", defineStore({ initial: { count: 1 } }));
  const listeners = new Set<(change: StarPersistAdapterChange) => void>();
  const calls: string[] = [];
  let interrupt = (_step: string): void => undefined;
  let raw: string | null = null;
  let encodes = 0;
  const step = (name: string): void => {
    calls.push(name);
    interrupt(name);
  };
  const unsubscribe = vi.fn();
  const dispose = vi.fn(() => {
    calls.push("adapter-dispose");
    listeners.clear();
  });
  const adapter: StarPersistAdapter = {
    kind: "custom",
    shared: false,
    subscribable: true,
    available() {
      step("available");
      return true;
    },
    read() {
      step("read");
      return raw;
    },
    replace(_key, value) {
      step("replace");
      raw = value;
    },
    remove() {
      step("remove");
      raw = null;
    },
    subscribe(listener) {
      step("subscribe");
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        unsubscribe();
      };
    },
    dispose,
  };
  const options: StarPersistOptions<Preferences> = {
    namespace: "test",
    version: 3,
    adapter,
    clock() {
      step("clock");
      return 100;
    },
    codec: Object.freeze({
      id: "fixture",
      version: 1,
      encode(value: Readonly<Preferences>) {
        step(`encode-${++encodes}`);
        return { count: value.count };
      },
      decode(_data: StarPersistData, draft: Preferences) {
        step("decode");
        draft.count = 5;
      },
    }),
    migrations: Object.freeze({
      1(data) {
        step("migration-1");
        return data;
      },
      2(data) {
        step("migration-2");
        return data;
      },
    }),
    flushOnDispose: false,
  };
  return {
    owner,
    star,
    store,
    persist,
    listeners,
    calls,
    unsubscribe,
    dispose,
    adapter,
    interrupt(callback: (step: string) => void) {
      interrupt = callback;
    },
    seed() {
      raw = JSON.stringify({
        format: "jquery-star-persist/1",
        namespace: "test",
        store: "preferences",
        version: 1,
        savedAt: 10,
        expiresAt: null,
        revision: { counter: 1, origin: "other" },
        codec: { id: "fixture", version: 1 },
        data: { count: 5 },
      });
    },
    attach(overrides: Partial<StarPersistOptions<Preferences>> = {}) {
      return persist.attach("preferences", Object.freeze({ ...options, ...overrides }));
    },
  };
}

it.each(["control", "newer", "expired", "missing", "disposed"])(
  "repairs against current accepted state after %s reentry from an adapter read",
  (mode) => {
    const current = setup();
    const key = "jqstar:test:preferences";
    const envelope = (counter: number, expiresAt: number | null = null): string =>
      JSON.stringify({
        format: "jquery-star-persist/1",
        namespace: "test",
        store: "preferences",
        version: 3,
        savedAt: 1,
        expiresAt,
        revision: { counter, origin: "remote" },
        codec: { id: "fields", version: 1 },
        data: { count: counter },
      });
    let raw: string | null = envelope(2);
    let onRead = (): void => undefined;
    let notify = (_change: StarPersistAdapterChange): void => undefined;
    const replace = vi.fn((_key: string, value: string) => {
      raw = value;
    });
    const adapter: StarPersistAdapter = {
      kind: "custom",
      shared: false,
      subscribable: true,
      available: () => true,
      read() {
        const snapshot = raw;
        onRead();
        return snapshot;
      },
      replace,
      remove() {
        raw = null;
      },
      subscribe(listener) {
        notify = listener;
        return () => {
          notify = () => undefined;
        };
      },
      dispose() {},
    };
    const attachment = current.attach({
      adapter,
      codec: createFieldCodec<Preferences>([
        { path: "count", validate: (value) => typeof value === "number" },
      ]),
    });
    expect(current.store.count).toBe(2);
    raw = envelope(1);
    onRead = () => {
      onRead = () => undefined;
      if (mode === "newer") {
        raw = envelope(3);
        notify({ key, value: raw });
      } else if (mode === "expired" || mode === "missing") {
        raw = mode === "missing" ? null : envelope(3, 50);
        expect(attachment.retry().ok).toBe(true);
      } else if (mode === "disposed") attachment.dispose();
    };
    notify({ key, value: raw });
    const status = attachment.status();
    expect(status.error).toBeNull();
    expect(current.store.count).toBe(mode === "newer" ? 3 : 2);
    if (mode === "control" || mode === "newer") {
      expect(replace).toHaveBeenCalledOnce();
      const stored = JSON.parse(raw) as StarPersistEnvelope;
      expect(stored.revision).toEqual({ counter: mode === "newer" ? 3 : 2, origin: "remote" });
      expect(stored.revision).toEqual(status.revision);
      expect(stored.data).toEqual({ count: current.store.count });
    } else {
      expect(replace).not.toHaveBeenCalled();
      expect(status.outcome).toBe(mode === "disposed" ? "disposed" : mode);
      if (mode === "disposed") expect(attachment.dispose().status).toBe(status);
      else {
        expect(raw).toBeNull();
        expect(status.revision).toBeNull();
      }
    }
  },
);

it("keeps disposal terminal when a thrown typed error disposes during code normalization", () => {
  const current = setup();
  const attachment = current.attach();
  const error = new StarPersistError("unavailable");
  Object.defineProperty(error, "code", {
    get() {
      attachment.dispose();
      return "unavailable";
    },
  });
  current.interrupt((step) => {
    if (step === "available") throw error;
  });
  current.store.count = 2;
  const result = attachment.flush();
  expect(result.ok).toBe(false);
  expect(result.status.outcome).toBe("disposed");
  expect(result.status).toBe(attachment.dispose().status);
  expect(attachment.status()).toBe(result.status);
  expect(current.listeners.size).toBe(0);
});

it.each([false, true])(
  "finishes facade cleanup after reentrant disposal, memory failure: %s",
  (memoryFails) => {
    const memory = adapters.createMemoryStorageAdapter();
    const dispose = vi.fn(() => {
      memory.dispose();
      if (memoryFails) throw new Error("memory cleanup failed");
    });
    const factory = vi.spyOn(adapters, "createMemoryStorageAdapter").mockReturnValue({
      ...memory,
      dispose,
    });
    try {
      const current = setup();
      const installation = installations.at(-1);
      if (!installation) throw new Error("Missing installation.");
      installation.dispose = () => {
        expect(() => current.star.dispose()).toThrow("kernel disposal failed");
      };
      const attachment = current.attach({ flushOnDispose: true });
      current.store.count = 7;
      let kernelFailure: unknown;
      current.interrupt((step) => {
        if (step !== "replace") return;
        try {
          current.star.dispose();
        } catch (error) {
          kernelFailure = error;
          throw error;
        }
      });
      expect(attachment.dispose().ok).toBe(false);
      expect(current.listeners.size).toBe(0);
      expect(dispose).toHaveBeenCalledOnce();
      const pending = [kernelFailure];
      const messages: string[] = [];
      while (pending.length) {
        const error = pending.pop();
        if (error instanceof AggregateError) pending.push(...(error.errors as unknown[]));
        else if (error instanceof Error) messages.push(error.message);
      }
      expect(messages).toContain("Persistence operation failed (disposed).");
      if (memoryFails) expect(messages).toContain("Persistence operation failed (contract).");
      expect(() => current.star.dispose()).toThrow("kernel disposal failed");
      expect(dispose).toHaveBeenCalledOnce();
    } finally {
      factory.mockRestore();
      memory.dispose();
    }
  },
);

afterEach(() => {
  for (const { frame, dispose } of installations.splice(0).reverse()) {
    try {
      dispose();
    } finally {
      frame.remove();
    }
  }
});

it.each([
  "encode-1",
  "encode-2",
  "available",
  "read",
  "clock",
  "subscribe",
  "migration-1",
  "migration-2",
  "decode",
  "encode-3",
])("stops attachment setup immediately after disposal in %s", (phase) => {
  const current = setup();
  current.seed();
  current.interrupt((step) => {
    if (step === phase) {
      current.star.dispose();
      current.calls.push("disposed");
    }
  });
  expect(() => current.attach()).toThrow();
  expect(current.calls.at(-1)).toBe("disposed");
  expect(current.listeners.size).toBe(0);
  expect(current.dispose).not.toHaveBeenCalled();
  current.star.dispose();
  expect(current.unsubscribe.mock.calls.length).toBe(
    (phase.startsWith("encode-") && phase !== "encode-3") ||
      ["available", "read", "clock"].includes(phase)
      ? 0
      : 1,
  );
});

it.each([false, true])("releases a late subscription once with owned adapter %s", (ownAdapter) => {
  const current = setup();
  current.interrupt((step) => {
    if (step === "subscribe") current.star.dispose();
  });
  expect(() => current.attach({ ownAdapter, strict: true })).toThrow();
  expect(current.listeners.size).toBe(0);
  expect(current.unsubscribe).toHaveBeenCalledOnce();
  expect(current.dispose.mock.calls.length).toBe(Number(ownAdapter));
  current.star.dispose();
  expect(current.unsubscribe).toHaveBeenCalledOnce();
});

it.each(["retry", "reset"] as const)(
  "keeps %s terminal after disposal during availability",
  (operation) => {
    const current = setup();
    const attachment = current.attach();
    current.calls.length = 0;
    current.interrupt((step) => {
      if (step === "available") {
        attachment.dispose();
        current.calls.push("disposed");
      }
    });
    expect(attachment[operation]().ok).toBe(false);
    expect(current.calls).toEqual(["available", "disposed"]);
    expect(attachment.status().outcome).toBe("disposed");
    expect(attachment.dispose().status).toBe(attachment.status());
    expect(current.listeners.size).toBe(0);
    expect(current.store.count).toBe(1);
  },
);

it("hydrates and releases a live attachment normally", () => {
  const current = setup();
  current.seed();
  const attachment = current.attach();
  expect(current.store.count).toBe(5);
  expect(current.listeners.size).toBe(1);
  expect(attachment.status().outcome).toBe("pending");
  expect(attachment.dispose().ok).toBe(true);
  expect(current.listeners.size).toBe(0);
  expect(current.unsubscribe).toHaveBeenCalledOnce();
});

it("preserves the requested final disposal flush", () => {
  const current = setup();
  const attachment = current.attach({ flushOnDispose: true });
  current.store.count = 7;
  expect(attachment.dispose().ok).toBe(true);
  expect(current.calls).toContain("replace");
  const raw = current.adapter.read("unused");
  if (raw === null) throw new Error("Missing persisted data.");
  expect(JSON.parse(raw).data.count).toBe(7);
  expect(current.listeners.size).toBe(0);
});

it("releases late cleanup even when that cleanup throws", () => {
  const current = setup();
  current.unsubscribe.mockImplementation(() => {
    throw new Error("unsubscribe failed");
  });
  current.interrupt((step) => {
    if (step === "subscribe") current.star.dispose();
  });
  expect(() => current.attach()).toThrow("cleanup");
  expect(current.listeners.size).toBe(0);
  expect(current.unsubscribe).toHaveBeenCalledOnce();
  current.star.dispose();
  expect(current.unsubscribe).toHaveBeenCalledOnce();
});

it.each(["retry", "reset"] as const)(
  "releases a subscription acquired during terminal %s",
  (operation) => {
    const current = setup();
    let ready = false;
    const attachment = current.attach({ adapter: { ...current.adapter, available: () => ready } });
    expect(attachment.status().outcome).toBe("disabled");
    ready = true;
    current.interrupt((step) => {
      if (step === "subscribe") attachment.dispose();
    });
    expect(attachment[operation]().ok).toBe(false);
    expect(attachment.status().outcome).toBe("disposed");
    expect(current.listeners.size).toBe(0);
    expect(current.unsubscribe).toHaveBeenCalledOnce();
  },
);

it.each(["encode-4", "available", "read", "clock", "replace"])(
  "keeps an interrupted flush terminal after %s",
  (phase) => {
    const current = setup();
    const attachment = current.attach();
    current.store.count = 7;
    current.calls.length = 0;
    current.interrupt((step) => {
      if (step === phase) {
        attachment.dispose();
        current.calls.push("disposed");
      }
    });
    expect(attachment.flush().ok).toBe(false);
    expect(current.calls.at(-1)).toBe("disposed");
    expect(attachment.status().outcome).toBe("disposed");
    expect(attachment.status()).toBe(attachment.dispose().status);
    expect(current.listeners.size).toBe(0);
  },
);

it("stops status delivery when an earlier listener disposes the attachment", () => {
  const current = setup();
  const attachment = current.attach();
  const later = vi.fn();
  attachment.subscribe(() => attachment.dispose());
  attachment.subscribe(later);
  current.store.count = 7;
  expect(attachment.flush().ok).toBe(false);
  expect(later).not.toHaveBeenCalled();
  expect(attachment.status()).toBe(attachment.dispose().status);
});

it("does not flush provisional setup when disposal requests a final flush", () => {
  const current = setup();
  current.interrupt((step) => {
    if (step === "available") current.star.dispose();
  });
  expect(() => current.attach({ flushOnDispose: true })).toThrow();
  expect(current.calls).toEqual(["encode-1", "encode-2", "available"]);
  expect(current.listeners.size).toBe(0);
});

it.each(["available", "migration-1", "decode"])(
  "refuses hydration commit after %s starts an application",
  (phase) => {
    const current = setup();
    current.seed();
    current.interrupt((step) => {
      if (step === phase) $(current.owner.body).star({ state: {} });
    });
    expect(() => current.attach()).toThrow("contract");
    expect(current.calls.at(-1)).toBe(phase);
    expect(current.store.count).toBe(1);
    expect(current.persist.attachments()).toEqual([]);
    expect(current.listeners.size).toBe(0);
  },
);

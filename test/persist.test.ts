import { afterEach, describe, expect, it, vi } from "vitest";
import { defineStore, storesPlugin } from "../src/stores";
import {
  createCustomStorageAdapter,
  createFieldCodec,
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  persistPlugin,
  type StarPersistEnvelope,
  type StarPersistOptions,
} from "../src/persist";
import { nextUpdate } from "../src/reactivity";
import { TrustedKernel as Kernel } from "./helpers/trusted-kernel";

type Preferences = { count: number; theme: string; privateValue: string; increment: () => void };
const codec = createFieldCodec<Preferences>([
  { path: "count", validate: (value) => typeof value === "number" && value >= 0 },
  { path: "theme", validate: (value) => value === "light" || value === "dark" },
]);
const key = "jqstar:test:preferences";
const frames: HTMLIFrameElement[] = [];
const kernels: Kernel[] = [];

function setup(adapter = createMemoryStorageAdapter()) {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, frame.contentDocument!);
  kernels.push(kernel);
  const [stores, persist] = kernel.plugins.useMany([storesPlugin, persistPlugin] as const);
  const store = stores.define(
    "preferences",
    defineStore<Preferences>({
      initial: {
        count: 1,
        theme: "light",
        privateValue: "not-persisted",
        increment(this: Preferences) {
          this.count++;
        },
      },
    }),
  );
  const attach = (overrides: Partial<StarPersistOptions<Preferences>> = {}) =>
    persist.attach(
      "preferences",
      Object.freeze({
        namespace: "test",
        version: 1,
        codec,
        adapter,
        flushOnDispose: false,
        ...overrides,
      }),
    );
  return { kernel, stores, persist, store, adapter, attach, window: frame.contentWindow! };
}

function envelope(changes: Partial<StarPersistEnvelope> = {}): string {
  return JSON.stringify({
    format: "jquery-star-persist/1",
    namespace: "test",
    store: "preferences",
    version: 1,
    savedAt: 100,
    expiresAt: null,
    revision: { counter: 1, origin: "other" },
    codec: { id: "fields", version: 1 },
    data: { count: 5, theme: "dark" },
    ...changes,
  });
}

afterEach(() => {
  vi.useRealTimers();
  for (const kernel of kernels.splice(0).reverse()) if (!kernel.disposed) kernel.dispose();
  for (const frame of frames.splice(0)) frame.remove();
});

describe("persistence attachment", () => {
  it("creates bounded random origins without requiring the secure-context UUID API", () => {
    const frame = document.createElement("iframe");
    document.body.append(frame);
    frames.push(frame);
    const owner = frame.contentWindow!;
    const uuid = vi.fn(() => {
      throw new Error("UUID is unavailable outside secure contexts");
    });
    Object.defineProperty(owner.crypto, "randomUUID", { get: uuid });
    const random = vi.spyOn(owner.crypto, "getRandomValues");
    const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, frame.contentDocument!);
    kernels.push(kernel);
    const [stores, persist] = kernel.plugins.useMany([storesPlugin, persistPlugin] as const);
    const store = stores.define("preferences", defineStore({ initial: { count: 1 } }));
    const adapter = createMemoryStorageAdapter();
    const attachment = persist.attach(
      "preferences",
      Object.freeze({
        namespace: "test",
        version: 1,
        adapter,
        codec: createFieldCodec<typeof store>([
          { path: "count", validate: (value) => typeof value === "number" },
        ]),
      }),
    );
    store.count = 2;
    expect(attachment.flush().ok).toBe(true);
    expect(attachment.status().revision?.origin).toMatch(/^[0-9a-f]{32}$/);
    expect(random).toHaveBeenCalledOnce();
    expect(random.mock.calls[0]![0]?.byteLength).toBe(16);
    expect(uuid).not.toHaveBeenCalled();
  });

  it("installs transactionally with declared stores dependency and hydrates synchronously", () => {
    const current = setup();
    current.adapter.replace(key, envelope());
    const attachment = current.attach();
    expect(Object.isFrozen(persistPlugin)).toBe(true);
    expect(current.kernel.plugins.use(persistPlugin)).toBe(current.persist);
    expect(current.store.count).toBe(5);
    expect(current.store.theme).toBe("dark");
    expect(current.store.privateValue).toBe("not-persisted");
    expect(attachment.status().outcome).toBe("hydrated");
    expect(current.persist.attachments()).toEqual([attachment]);
    current.store.increment();
    expect(attachment.flush().ok).toBe(true);
    const saved = JSON.parse(current.adapter.read(key)!) as StarPersistEnvelope;
    expect(saved.data).toEqual({ count: 6, theme: "dark" });
    expect(saved.revision.counter).toBe(2);
    expect(current.adapter.read(key)).not.toContain("not-persisted");
  });

  it("keeps defaults missing, supports frozen option identity, and rejects conflicting or late attachment", () => {
    const current = setup();
    const options = Object.freeze({ namespace: "test", version: 1, codec, flushOnDispose: false });
    const attachment = current.persist.attach("preferences", options);
    expect(current.persist.attach("preferences", options)).toBe(attachment);
    expect(attachment.status().outcome).toBe("missing");
    expect(() => current.attach()).toThrow();
    expect(() => current.persist.attach("missing", options)).toThrow();
    expect(() => current.persist.attach("preferences", { ...options })).toThrow();
    current.kernel.plugins.lock();
    expect(() => current.persist.attach("preferences", options)).toThrow("first application");
    attachment.dispose();
    expect(attachment.flush().ok).toBe(false);
    expect(attachment.retry().ok).toBe(false);
    expect(attachment.reset().ok).toBe(false);
    expect(() => attachment.subscribe(() => undefined)).toThrow();
  });

  it.each([
    ["corrupt", "{"],
    ["future-version", envelope({ version: 2 })],
    ["decode", envelope({ data: { count: -1, theme: "dark" } })],
    ["decode", envelope({ data: { count: 4, theme: 42 } })],
    ["decode", envelope({ codec: { id: "different", version: 1 } })],
  ])("preserves %s source bytes until explicit reset", (code, raw) => {
    const current = setup();
    current.adapter.replace(key, raw);
    const attachment = current.attach();
    expect(attachment.status().error).toBe(code);
    expect(current.store.count).toBe(1);
    current.store.count = 7;
    expect(attachment.flush().ok).toBe(false);
    expect(attachment.retry().ok).toBe(false);
    expect(current.adapter.read(key)).toBe(raw);
    expect(attachment.reset().ok).toBe(true);
    expect(JSON.parse(current.adapter.read(key)!).data.count).toBe(7);
  });

  it("strict failures leave no attachment and allow corrected retry", () => {
    const current = setup();
    current.adapter.replace(key, envelope({ version: 2 }));
    expect(() => current.attach({ strict: true })).toThrow("future-version");
    expect(current.persist.attachments()).toEqual([]);
    expect(current.store.count).toBe(1);
    current.adapter.remove(key);
    expect(current.attach().status().outcome).toBe("missing");
  });

  it("preserves bytes and live state when reset removal fails, then recovers explicitly", () => {
    const base = createMemoryStorageAdapter();
    let blocked = true;
    const current = setup(
      createCustomStorageAdapter({
        ...base,
        remove(name) {
          if (blocked) throw new Error("storage removal denied");
          base.remove(name);
        },
      }),
    );
    const raw = envelope({ version: 2 });
    base.replace(key, raw);
    const attachment = current.attach();
    current.store.count = 7;
    const failure = attachment.reset();
    expect(failure.ok).toBe(false);
    expect(failure.status.error).toBe("remove");
    expect(failure.status.outcome).toBe("disabled");
    expect(base.read(key)).toBe(raw);
    expect(current.store.count).toBe(7);
    expect(attachment.flush().ok).toBe(false);
    blocked = false;
    expect(attachment.reset().ok).toBe(true);
    expect(JSON.parse(base.read(key)!).data.count).toBe(7);
    expect(current.store.count).toBe(7);
  });

  it("rolls back a codec that fails while the store subscription is being acquired", async () => {
    const current = setup();
    current.adapter.replace(key, envelope());
    let encodes = 0;
    expect(() =>
      current.attach({
        codec: {
          ...codec,
          encode(value) {
            if (++encodes === 2) throw new Error("subscription selection failed");
            return codec.encode(value);
          },
        },
      }),
    ).toThrow("encode");
    expect(current.store.count).toBe(1);
    expect(current.persist.attachments()).toEqual([]);
    expect(current.adapter.read(key)).toBe(envelope());
    current.store.count = 2;
    await nextUpdate();
    expect(encodes).toBe(2);
    expect(current.attach().status().outcome).toBe("hydrated");
  });

  it("contains reentrant disposal from adapter cleanup and finishes the cleanup sweep", () => {
    const current = setup();
    const cleanup = vi.fn(() => attachment.dispose());
    const attachment = current.attach({
      adapter: { ...current.adapter, dispose: cleanup },
      ownAdapter: true,
    });
    const report = attachment.dispose();
    expect(report.ok).toBe(false);
    expect(report.errors).toEqual(["disposed"]);
    expect(cleanup).toHaveBeenCalledOnce();
    expect(attachment.dispose()).toBe(report);
    expect(attachment.status().outcome).toBe("disposed");
    expect(() => current.kernel.dispose()).toThrow();
  });

  it("migrates detached data in ascending steps and persists only after the full transaction", () => {
    const current = setup();
    current.adapter.replace(key, envelope());
    const steps: number[] = [];
    const attachment = current.attach({
      version: 3,
      migrations: {
        1(data) {
          steps.push(1);
          return { ...(data as object), count: 6 };
        },
        2(data) {
          steps.push(2);
          return { ...(data as object), theme: "light" };
        },
      },
    });
    expect(steps).toEqual([1, 2]);
    expect(current.store.count).toBe(6);
    expect(current.adapter.read(key)).toBe(envelope());
    expect(attachment.flush().ok).toBe(true);
    expect(JSON.parse(current.adapter.read(key)!).version).toBe(3);
    expect(attachment.retry().ok).toBe(true);
    expect(steps).toEqual([1, 2]);
  });

  it("rejects missing/throwing migrations and thenable callbacks without exposing partial data", () => {
    for (const migrations of [
      {},
      {
        1: () => {
          throw new Error("private data");
        },
      },
    ]) {
      const current = setup();
      current.adapter.replace(key, envelope());
      const attachment = current.attach({ version: 2, migrations });
      expect(attachment.status().error).toBe("migration");
      expect(current.store.count).toBe(1);
      expect(current.adapter.read(key)).toBe(envelope());
    }
    const current = setup();
    current.adapter.replace(key, envelope());
    const invalidAsync: unknown = () => Promise.resolve();
    expect(() => current.attach({ codec: { ...codec, decode: invalidAsync as never } })).toThrow(
      "contract",
    );
    expect(current.persist.attachments()).toEqual([]);
    expect(current.store.count).toBe(1);
  });

  it("removes expired data, checks the clock and retains future data even when expired", () => {
    const current = setup();
    current.adapter.replace(key, envelope({ expiresAt: 200 }));
    const attachment = current.attach({ clock: () => 200, ttlMs: 10 });
    expect(attachment.status().outcome).toBe("expired");
    expect(current.adapter.read(key)).toBeNull();
    current.store.count = 2;
    attachment.flush();
    expect(JSON.parse(current.adapter.read(key)!).expiresAt).toBe(210);
    const invalid = setup();
    expect(invalid.attach({ clock: () => -1 }).status().error).toBe("clock");
    const future = setup();
    const raw = envelope({ version: 2, expiresAt: 200 });
    future.adapter.replace(key, raw);
    expect(future.attach({ clock: () => 300 }).status().error).toBe("future-version");
    expect(future.adapter.read(key)).toBe(raw);
  });

  it("uses one trailing timer with maximum delay and flushes immediate changes on disposal", async () => {
    vi.useFakeTimers();
    const current = setup();
    const attachment = current.attach({ throttleMs: 100, maxDelayMs: 250, flushOnDispose: true });
    for (let count = 2; count < 6; count++) {
      current.store.count = count;
      await nextUpdate();
      expect(vi.getTimerCount()).toBe(1);
      await vi.advanceTimersByTimeAsync(70);
    }
    expect(JSON.parse(current.adapter.read(key)!).data.count).toBe(5);
    current.store.count = 8;
    const report = attachment.dispose();
    expect(report.ok).toBe(true);
    expect(attachment.dispose()).toBe(report);
    expect(JSON.parse(current.adapter.read(key)!).data.count).toBe(8);
    expect(vi.getTimerCount()).toBe(0);
    current.store.count = 9;
    await nextUpdate();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("converges shared memory without echo and rejects malformed/future external data", async () => {
    const adapter = createMemoryStorageAdapter();
    const first = setup(adapter);
    const second = setup(adapter);
    const a = first.attach();
    const b = second.attach();
    first.store.count = 3;
    a.flush();
    await nextUpdate();
    expect(second.store.count).toBe(3);
    expect(b.status().outcome).toBe("external");
    const raw = adapter.read(key);
    expect(b.flush().ok).toBe(true);
    expect(adapter.read(key)).toBe(raw);
    second.store.count = 4;
    b.flush();
    expect(first.store.count).toBe(4);
    const winner = adapter.read(key)!;
    adapter.replace(key, envelope());
    expect(adapter.read(key)).toBe(winner);
    adapter.replace(key, envelope({ version: 2 }));
    expect(a.status().error).toBe("future-version");
    expect(b.status().error).toBe("future-version");
    expect(first.store.count).toBe(4);
  });

  it("converges and repairs stored revisions in every delivery order despite clock skew", async () => {
    const updates = [
      envelope({ revision: { counter: 2, origin: "a" }, savedAt: 9999 }),
      envelope({ revision: { counter: 2, origin: "z" }, data: { count: 6, theme: "light" } }),
      envelope({
        revision: { counter: 3, origin: "a" },
        savedAt: 0,
        data: { count: 7, theme: "dark" },
      }),
    ];
    for (const order of [
      [0, 1, 2],
      [0, 2, 1],
      [1, 0, 2],
      [1, 2, 0],
      [2, 0, 1],
      [2, 1, 0],
    ]) {
      const current = setup();
      const attachment = current.attach();
      for (const index of order) current.adapter.replace(key, updates[index]!);
      await nextUpdate();
      expect(current.store.count).toBe(7);
      expect(current.store.theme).toBe("dark");
      expect(attachment.status().revision).toEqual({ counter: 3, origin: "a" });
      const accepted = current.adapter.read(key)!;
      expect(JSON.parse(accepted)).toEqual(JSON.parse(updates[2]!));
      expect(attachment.flush().ok).toBe(true);
      expect(current.adapter.read(key)).toBe(accepted);
    }
  });

  it("ignores self-origin and unrelated events and rejects conflicting duplicate revisions", () => {
    const current = setup();
    const attachment = current.attach();
    current.store.count = 2;
    attachment.flush();
    const accepted = JSON.parse(current.adapter.read(key)!) as StarPersistEnvelope;
    current.adapter.replace("unrelated", "{");
    current.adapter.replace(
      key,
      envelope({
        revision: { counter: accepted.revision.counter + 1, origin: accepted.revision.origin },
      }),
    );
    expect(current.store.count).toBe(2);
    expect(attachment.status().revision).toEqual(accepted.revision);
    const corrupt = envelope({ revision: accepted.revision });
    current.adapter.replace(key, corrupt);
    expect(attachment.status().error).toBe("corrupt");
    expect(current.store.count).toBe(2);
    expect(attachment.flush().ok).toBe(false);
    expect(current.adapter.read(key)).toBe(corrupt);
  });

  it("contains observers, redacts statuses, and recovers external deletion explicitly", () => {
    const current = setup();
    const attachment = current.attach();
    const observations: unknown[] = [];
    const release = attachment.subscribe((status) => observations.push(status));
    attachment.subscribe(() => {
      throw new Error("observer secret");
    });
    current.store.count = 2;
    attachment.flush();
    current.adapter.remove(key);
    expect(attachment.status().error).toBe("deleted");
    expect(current.store.count).toBe(2);
    expect(attachment.retry().ok).toBe(true);
    expect(attachment.status().outcome).toBe("missing");
    release();
    const json = JSON.stringify(observations);
    expect(json).not.toContain("not-persisted");
    expect(json).not.toContain("namespace");
    expect(json).not.toContain(key);
  });

  it("normalizes unavailable/read/quota/write failures and retries without fallback", () => {
    for (const [operation, expected] of [
      ["available", "unavailable"],
      ["read", "read"],
      ["replace", "quota"],
    ] as const) {
      const base = createMemoryStorageAdapter();
      let broken = true;
      const adapter = createCustomStorageAdapter({
        ...base,
        kind: "custom",
        [operation]: (...args: never[]) => {
          if (broken)
            throw new DOMException(
              "private payload",
              operation === "replace" ? "QuotaExceededError" : "SecurityError",
            );
          const invoke: (...input: never[]) => unknown = base[operation];
          return invoke.apply(base, args);
        },
      });
      const current = setup(adapter);
      const attachment = current.attach();
      if (operation === "replace") {
        current.store.count = 2;
        attachment.flush();
      }
      expect(attachment.status().error).toBe(expected);
      broken = false;
      expect(attachment.retry().ok).toBe(true);
    }
  });

  it("enforces the kernel realm and cleans failed subscriptions and owned adapters", () => {
    const current = setup();
    expect(() => current.attach({ adapter: createLocalStorageAdapter(window) })).toThrow();
    const dispose = vi.fn();
    const adapter = createCustomStorageAdapter({
      ...createMemoryStorageAdapter(),
      dispose,
      subscribe() {
        throw new Error("setup failure");
      },
    });
    expect(() => current.attach({ adapter, ownAdapter: true })).toThrow();
    expect(dispose).toHaveBeenCalledOnce();
    expect(current.persist.attachments()).toEqual([]);
    expect(current.store.count).toBe(1);
  });

  it("contains invalid selected writes and reports every failing disposal cleanup", async () => {
    const current = setup();
    const attachment = current.attach();
    current.store.count = -1;
    await nextUpdate();
    expect(attachment.status().error).toBe("decode");
    current.store.count = 3;
    expect(attachment.reset().ok).toBe(true);
    const base = createMemoryStorageAdapter();
    const unsubscribe = vi.fn(() => {
      throw new Error("listener secret");
    });
    const dispose = vi.fn(() => {
      throw new Error("adapter secret");
    });
    const broken = setup(
      createCustomStorageAdapter({ ...base, subscribe: () => unsubscribe, dispose }),
    );
    const failing = broken.attach({ ownAdapter: true, flushOnDispose: true });
    broken.store.count = 4;
    const report = failing.dispose();
    expect(report.errors).toEqual(["cleanup", "cleanup"]);
    expect(unsubscribe).toHaveBeenCalledOnce();
    expect(dispose).toHaveBeenCalledOnce();
    expect(failing.dispose()).toBe(report);
    expect(() => broken.kernel.dispose()).toThrow();
    expect(() => broken.persist.attachments()).toThrow("disposed");
    expect(() => broken.attach()).toThrow("disposed");
  });

  it("rolls back invalid migration outputs, oversized values, and asynchronous adapters", () => {
    for (const output of [
      undefined,
      { count: Infinity },
      new Date(),
      (() => {
        const value: unknown[] = [];
        value.push(value);
        return value;
      })(),
    ]) {
      const current = setup();
      current.adapter.replace(key, envelope());
      const attachment = current.attach({ version: 2, migrations: { 1: (() => output) as never } });
      expect(attachment.status().error).toBe("migration");
      expect(current.store.count).toBe(1);
      expect(current.adapter.read(key)).toBe(envelope());
    }
    const current = setup();
    current.adapter.replace(key, envelope());
    expect(() =>
      current.attach({ version: 2, migrations: { 1: (() => Promise.resolve({})) as never } }),
    ).toThrow("contract");
    expect(current.persist.attachments()).toEqual([]);
    expect(() =>
      current.attach({
        adapter: { ...current.adapter, available: (() => Promise.resolve(true)) as never },
      }),
    ).toThrow("contract");
    current.adapter.replace(key, envelope() + " ".repeat(300));
    expect(current.attach({ maxBytes: 256 }).status().error).toBe("limit");
  });

  it("rejects undeclared dependency access and keeps default memory isolated between facades", () => {
    const first = setup();
    const second = setup();
    let assertBefore: (() => void) | undefined;
    first.kernel.plugins.use({
      name: "proof.dependencies",
      version: "1.0.0",
      apiVersion: "0.1.0",
      install(registrar) {
        expect(() => registrar.dependency("core.stores")).toThrow("declared dependency");
        assertBefore = () => registrar.assertBeforeApplications();
        registrar.assertBeforeApplications();
        return {};
      },
    });
    const options = Object.freeze({ namespace: "isolated", version: 1, codec });
    const a = first.persist.attach("preferences", options);
    const b = second.persist.attach("preferences", options);
    first.store.count = 8;
    a.flush();
    expect(second.store.count).toBe(1);
    expect(b.status().outcome).toBe("missing");
    first.kernel.dispose();
    expect(assertBefore).toThrow("first application");
  });

  it("rejects a codec that mutates its readonly encode input or the store's methods", () => {
    const current = setup();
    expect(() =>
      current.attach({
        codec: {
          ...codec,
          encode(value) {
            (value as Preferences).count = 99;
            return {};
          },
        },
      }),
    ).toThrow("encode");
    expect(current.store.count).toBe(1);
    current.adapter.replace(key, envelope());
    const attachment = current.attach({
      codec: {
        ...codec,
        decode(_data, draft) {
          draft.count = 99;
          draft.increment = () => undefined;
        },
      },
    });
    expect(attachment.status().error).toBe("decode");
    expect(current.store.count).toBe(1);
    expect(current.adapter.read(key)).toBe(envelope());
  });

  it("checks canonical envelope size before hydration commits and accepts reordered duplicates", () => {
    const current = setup();
    const raw = envelope({ savedAt: 1_000_000_000, data: { count: 1e20, theme: "dark" } }).replace(
      "100000000000000000000",
      "1e20",
    );
    expect(raw.length).toBeLessThanOrEqual(256);
    current.adapter.replace(key, raw);
    expect(current.attach({ maxBytes: 256 }).status().error).toBe("limit");
    expect(current.store.count).toBe(1);
    const other = setup();
    other.adapter.replace(key, envelope());
    const attachment = other.attach();
    other.adapter.replace(
      key,
      JSON.stringify(
        Object.fromEntries(Object.entries(JSON.parse(envelope()) as object).reverse()),
      ),
    );
    expect(attachment.status().error).toBeNull();
    expect(other.store.count).toBe(5);
  });
});

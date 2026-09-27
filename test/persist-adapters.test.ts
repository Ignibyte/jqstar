import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createCustomStorageAdapter,
  createLocalStorageAdapter,
  createMemoryStorageAdapter,
  createSessionStorageAdapter,
  type StarPersistAdapter,
} from "../src/persist";

const frames: HTMLIFrameElement[] = [];
function realm(): Window {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  frames.push(frame);
  return frame.contentWindow!;
}
afterEach(() => {
  for (const frame of frames.splice(0)) frame.remove();
});

const factories = [
  ["memory", () => createMemoryStorageAdapter()],
  ["local", () => createLocalStorageAdapter(realm())],
  ["session", () => createSessionStorageAdapter(realm())],
  ["custom", () => createCustomStorageAdapter({ ...createMemoryStorageAdapter(), kind: "custom" })],
] as const;

describe.each(factories)("%s adapter conformance", (_name, factory) => {
  it("supports availability, atomic replacement, read/remove and terminal idempotent disposal", () => {
    const adapter = factory();
    const key = "conformance-key";
    adapter.remove(key);
    expect(adapter.available()).toBe(true);
    expect(adapter.read(key)).toBeNull();
    adapter.replace(key, "first");
    expect(adapter.read(key)).toBe("first");
    adapter.replace(key, "second");
    expect(adapter.read(key)).toBe("second");
    adapter.replace(key, "second");
    adapter.remove(key);
    adapter.remove(key);
    expect(adapter.read(key)).toBeNull();
    adapter.dispose();
    adapter.dispose();
    for (const operation of [
      () => adapter.available(),
      () => adapter.read(key),
      () => adapter.replace(key, "x"),
      () => adapter.remove(key),
      () => adapter.subscribe!(() => undefined),
    ]) {
      expect(operation).toThrow("disposed");
    }
  });

  it("delivers supported changes and detaches subscriptions exactly once", () => {
    const adapter = factory();
    const listener = vi.fn();
    const release = adapter.subscribe!(listener);
    if (adapter.kind === "local" || adapter.kind === "session") {
      const owner = adapter.window! as Window & typeof globalThis;
      const storage = adapter.kind === "local" ? owner.localStorage : owner.sessionStorage;
      owner.dispatchEvent(
        new owner.StorageEvent("storage", { key: "key", newValue: "one", storageArea: storage }),
      );
      owner.dispatchEvent(
        new owner.StorageEvent("storage", { key: "key", newValue: "ignored", storageArea: null }),
      );
    } else adapter.replace("key", "one");
    expect(listener).toHaveBeenCalledExactlyOnceWith({ key: "key", value: "one" });
    release();
    release();
    adapter.replace("key", "two");
    expect(listener).toHaveBeenCalledOnce();
    adapter.subscribe!(() => {
      throw new Error("subscriber");
    });
    adapter.replace("key", "three");
    adapter.dispose();
  });
});

it("defers Web Storage getters until an operation and reports blocked storage", () => {
  const get = vi.fn(() => {
    throw new DOMException("blocked", "SecurityError");
  });
  const owner = Object.defineProperty({}, "localStorage", { get }) as Window;
  const adapter = createLocalStorageAdapter(owner);
  expect(get).not.toHaveBeenCalled();
  expect(() => adapter.available()).toThrow("unavailable");
  expect(() => adapter.read("key")).toThrow("unavailable");
  adapter.dispose();
});

it("accepts adapters that explicitly provide no sharing or subscription", () => {
  const { subscribe: _subscribe, ...base } = createMemoryStorageAdapter();
  const adapter = createCustomStorageAdapter({
    ...base,
    kind: "custom",
    shared: false,
    subscribable: false,
  });
  expect(adapter.subscribe).toBeUndefined();
  adapter.replace("key", "value");
  expect(adapter.read("key")).toBe("value");
  adapter.dispose();
});

it("checks custom shape, synchronous returns, metadata, error normalization, and cleanup", () => {
  const base = createMemoryStorageAdapter();
  for (const override of [
    { kind: "secret" },
    { shared: null },
    { read: null },
    { subscribable: false },
    { available: null },
  ]) {
    expect(() =>
      createCustomStorageAdapter({ ...base, ...override } as StarPersistAdapter),
    ).toThrow("contract");
  }
  const methodCases = [
    ["available", () => "yes"],
    ["read", () => 1],
    ["read", () => Promise.resolve(null)],
    ["replace", () => Promise.resolve()],
    ["subscribe", () => undefined],
  ] as const;
  for (const [method, replacement] of methodCases) {
    const adapter = createCustomStorageAdapter({
      ...base,
      [method]: replacement,
    });
    expect(() => (adapter[method] as (...args: unknown[]) => unknown)("key", "value")).toThrow(
      "contract",
    );
  }
  for (const [method, code] of [
    ["read", "read"],
    ["replace", "write"],
    ["remove", "remove"],
    ["dispose", "cleanup"],
  ] as const) {
    const adapter = createCustomStorageAdapter({
      ...base,
      [method]: () => {
        throw new Error("private source");
      },
    });
    expect(() => adapter[method]("key", "value")).toThrow(code);
  }
  const cleanup = vi.fn(() => {
    throw new Error("cleanup source");
  });
  const adapter = createCustomStorageAdapter({ ...base, subscribe: () => cleanup });
  const release = adapter.subscribe!(() => undefined);
  expect(release).toThrow("cleanup");
  release();
  expect(cleanup).toHaveBeenCalledOnce();
  base.dispose();
});

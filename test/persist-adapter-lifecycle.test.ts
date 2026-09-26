import { expect, it, vi } from "vitest";
import {
  createCustomStorageAdapter,
  type StarPersistAdapter,
  type StarPersistAdapterChange,
} from "../src/persist";

it.each(["available", "read", "replace", "remove"] as const)(
  "rejects %s completion when the source disposes its adapter",
  (operation) => {
    const dispose = vi.fn();
    const source = {
      kind: "custom" as const,
      shared: false,
      subscribable: false,
      available: vi.fn(() => {
        adapter.dispose();
        return true;
      }),
      read: vi.fn(() => {
        adapter.dispose();
        return "value";
      }),
      replace: vi.fn(() => adapter.dispose()),
      remove: vi.fn(() => adapter.dispose()),
      dispose,
    };
    const adapter: StarPersistAdapter = createCustomStorageAdapter(source);
    const run = (): unknown => {
      if (operation === "available") return adapter.available();
      if (operation === "read") return adapter.read("key");
      if (operation === "replace") adapter.replace("key", "value");
      else adapter.remove("key");
      return undefined;
    };
    expect(run).toThrow("disposed");
    expect(run).toThrow("disposed");
    adapter.dispose();
    expect(dispose).toHaveBeenCalledOnce();
    expect(source[operation]).toHaveBeenCalledOnce();
  },
);

it.each([false, true])("releases late adapter subscription cleanup, throwing: %s", (throws) => {
  const listeners = new Set<(change: StarPersistAdapterChange) => void>();
  const cleanup = vi.fn();
  const dispose = vi.fn(() => listeners.clear());
  const adapter: StarPersistAdapter = createCustomStorageAdapter({
    kind: "custom",
    shared: false,
    subscribable: true,
    available: () => true,
    read: () => null,
    replace: () => undefined,
    remove: () => undefined,
    subscribe(listener) {
      adapter.dispose();
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
        cleanup();
        if (throws) throw new Error("late cleanup failed");
      };
    },
    dispose,
  });
  const subscribe = adapter.subscribe;
  if (!subscribe) throw new Error("Missing adapter subscription.");
  expect(() => subscribe(vi.fn())).toThrow(throws ? "cleanup" : "disposed");
  expect(listeners.size).toBe(0);
  expect(cleanup).toHaveBeenCalledOnce();
  adapter.dispose();
  expect(dispose).toHaveBeenCalledOnce();
  expect(cleanup).toHaveBeenCalledOnce();
});

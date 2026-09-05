import { attempt, fail, sync } from "./data";
import type { StarPersistAdapter, StarPersistAdapterChange } from "./types";

export function createCustomStorageAdapter(
  source: StarPersistAdapter,
): Readonly<StarPersistAdapter> {
  if (
    !source ||
    !["memory", "local", "session", "custom"].includes(source.kind) ||
    typeof source.shared !== "boolean" ||
    typeof source.subscribable !== "boolean" ||
    (["available", "read", "replace", "remove", "dispose"] as const).some(
      (method) => typeof source[method] !== "function",
    ) ||
    source.subscribable !== (typeof source.subscribe === "function")
  )
    fail("contract");
  let active = true;
  const check = (): void => {
    if (!active) fail("disposed");
  };
  const invoke = <Value>(
    code: "read" | "write" | "remove" | "cleanup" | "unavailable",
    run: () => Value,
  ): Value => {
    check();
    return attempt(code, run);
  };
  return Object.freeze({
    kind: source.kind,
    shared: source.shared,
    subscribable: source.subscribable,
    ...(source.window ? { window: source.window } : {}),
    available() {
      const value = invoke("unavailable", () => source.available());
      if (typeof value !== "boolean") fail("contract");
      return value;
    },
    read(key: string) {
      const value = invoke("read", () => source.read(key));
      if (value !== null && typeof value !== "string") fail("contract");
      return value;
    },
    replace(key: string, value: string) {
      invoke("write", () => {
        try {
          return source.replace(key, value);
        } catch (error) {
          if (
            error &&
            typeof error === "object" &&
            "name" in error &&
            error.name === "QuotaExceededError"
          )
            fail("quota");
          throw error;
        }
      });
    },
    remove(key: string) {
      invoke("remove", () => source.remove(key));
    },
    ...(source.subscribe
      ? {
          subscribe(listener: (change: StarPersistAdapterChange) => void) {
            check();
            const release = attempt("contract", () =>
              source.subscribe!((change) => {
                if (active) listener(change);
              }),
            );
            if (typeof release !== "function") fail("contract");
            let subscribed = true;
            return () => {
              if (!subscribed) return;
              subscribed = false;
              attempt("cleanup", release);
            };
          },
        }
      : {}),
    dispose() {
      if (!active) return;
      active = false;
      attempt("cleanup", () => source.dispose());
    },
  });
}

export function createMemoryStorageAdapter(): Readonly<StarPersistAdapter> {
  const values = new Map<string, string>();
  const listeners = new Set<(change: StarPersistAdapterChange) => void>();
  const publish = (key: string, value: string | null): void => {
    for (const listener of [...listeners]) {
      // A failed subscriber cannot turn an already committed replacement into a write error.
      try {
        sync(listener(Object.freeze({ key, value })));
      } catch {
        continue;
      }
    }
  };
  return createCustomStorageAdapter({
    kind: "memory",
    shared: true,
    subscribable: true,
    available: () => true,
    read: (key) => values.get(key) ?? null,
    replace(key, value) {
      if (values.get(key) === value) return;
      values.set(key, value);
      publish(key, value);
    },
    remove(key) {
      if (values.delete(key)) publish(key, null);
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    dispose() {
      listeners.clear();
      values.clear();
    },
  });
}

function webStorage(owner: Window, kind: "local" | "session"): Readonly<StarPersistAdapter> {
  const releases = new Set<() => void>();
  const storage = (): Storage =>
    attempt("unavailable", () => (kind === "local" ? owner.localStorage : owner.sessionStorage));
  return createCustomStorageAdapter({
    kind,
    window: owner,
    shared: kind === "local",
    subscribable: true,
    available() {
      return Boolean(storage());
    },
    read(key) {
      return storage().getItem(key);
    },
    replace(key, value) {
      storage().setItem(key, value);
    },
    remove(key) {
      storage().removeItem(key);
    },
    subscribe(listener) {
      const area = storage();
      const onChange = (event: StorageEvent): void => {
        if (event.storageArea === area)
          listener(Object.freeze({ key: event.key, value: event.newValue }));
      };
      owner.addEventListener("storage", onChange);
      const release = (): void => {
        owner.removeEventListener("storage", onChange);
        releases.delete(release);
      };
      releases.add(release);
      return release;
    },
    dispose() {
      for (const release of [...releases]) release();
    },
  });
}

export function createLocalStorageAdapter(window: Window): Readonly<StarPersistAdapter> {
  return webStorage(window, "local");
}
export function createSessionStorageAdapter(window: Window): Readonly<StarPersistAdapter> {
  return webStorage(window, "session");
}

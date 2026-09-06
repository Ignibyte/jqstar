import fc from "fast-check";
import { expect, it } from "vitest";

import { defineStore, storesPlugin, type StarStoresFacade } from "../../src/stores";
import { TrustedKernel as Kernel } from "../helpers/trusted-kernel";
import { assertProperty } from "./helpers";
import regressions from "./regressions.json";

const reservedKeys = [
  "action",
  "args",
  "computed",
  "constructor",
  "el",
  "evt",
  "prototype",
  "root",
  "signals",
  "state",
  "stores",
  "__proto__",
] as const;

function containsReservedKey(value: unknown): boolean {
  if (value === null || typeof value !== "object") return false;
  return Object.entries(value).some(
    ([key, nested]) =>
      reservedKeys.some((reserved) => key === reserved) || containsReservedKey(nested),
  );
}

function withStores(check: (stores: StarStoresFacade) => void): void {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, frame.contentDocument!);
  try {
    check(kernel.plugins.use(storesPlugin));
  } finally {
    kernel.dispose();
    frame.remove();
  }
}

const leaf = fc.oneof(
  fc.constant(null),
  fc.boolean(),
  fc.integer({ min: -1_000_000, max: 1_000_000 }),
  fc.string({ maxLength: 32 }),
);

const safeGraph = fc.letrec((tie) => ({
  value: fc.oneof(
    { depthSize: "small", maxDepth: 4 },
    leaf,
    fc.array(tie("value"), { maxLength: 5 }),
    fc.dictionary(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/), tie("value"), { maxKeys: 5 }),
  ),
})).value;

it("clones accepted generated graphs and rejects reserved fields without partial registration", () => {
  withStores((stores) => {
    let sequence = 0;
    assertProperty(
      "stores-clone-safe-graphs",
      fc.property(safeGraph, (generated) => {
        const source = { generated };
        const snapshot = JSON.stringify(source);
        const name = `generated${sequence++}`;
        const definition = defineStore({ initial: source });
        if (containsReservedKey(source)) {
          expect(() => stores.define(name, definition)).toThrow("magic key");
          expect(stores.has(name)).toBe(false);
          expect(JSON.stringify(source)).toBe(snapshot);
          expect(Object.isFrozen(source)).toBe(false);
          return;
        }
        const store = stores.define(name, definition);

        expect(JSON.stringify(store)).toBe(snapshot);
        expect(JSON.stringify(source)).toBe(snapshot);
        expect(store).not.toBe(source);
        expect(Object.isFrozen(source)).toBe(false);
      }),
    );
  });
});

it("rejects the reserved field found by the store generator domain review", () => {
  const source: unknown = JSON.parse(
    regressions["stores-reserved-field-domain"].counterexampleJson,
  );
  const snapshot = JSON.stringify(source);
  withStores((stores) => {
    expect(() =>
      stores.define("recorded", defineStore({ initial: { generated: source } })),
    ).toThrow("magic key el");
    expect(stores.names()).toEqual([]);
    expect(JSON.stringify(source)).toBe(snapshot);
  });
});

it("rejects every reserved field through generated object and array nesting", () => {
  withStores((stores) => {
    let sequence = 0;
    assertProperty(
      "stores-nested-reserved-rejection",
      fc.property(safeGraph, fc.array(fc.boolean(), { maxLength: 8 }), (payload, wrappers) => {
        for (const key of reservedKeys) {
          const generated = wrappers.reduce<unknown>(
            (nested, array) => (array ? [nested] : { nested }),
            Object.fromEntries([[key, payload]]),
          );
          const source = { generated };
          const snapshot = JSON.stringify(source);
          const name = `rejected${sequence++}`;
          expect(() => stores.define(name, defineStore({ initial: source }))).toThrow("magic key");
          expect(stores.has(name)).toBe(false);
          expect(JSON.stringify(source)).toBe(snapshot);
          expect(Object.isFrozen(source)).toBe(false);
        }
      }),
    );
  });
});

it("leaves every generated live store unchanged when a transaction throws", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, frame.contentDocument!);
  const stores = kernel.plugins.use(storesPlugin);
  const store = stores.define(
    "transactional",
    defineStore({ initial: { count: 0, label: "base" } }),
  );

  try {
    assertProperty(
      "stores-transaction-throw-rollback",
      fc.property(fc.integer(), fc.string(), (count, label) => {
        const before = JSON.stringify(store);
        expect(() =>
          stores.transaction<typeof store>("transactional", (draft) => {
            draft.count = count;
            draft.label = label;
            throw new Error("rollback");
          }),
        ).toThrow("rollback");
        expect(JSON.stringify(store)).toBe(before);
      }),
    );
  } finally {
    kernel.dispose();
    frame.remove();
  }
});

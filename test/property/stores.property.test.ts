import fc from "fast-check";
import { expect, it } from "vitest";

import { defineStore, storesPlugin } from "../../src/stores";
import { TrustedKernel as Kernel } from "../helpers/trusted-kernel";
import { assertProperty } from "./helpers";

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

it("clones every generated accepted store graph without mutating its source", () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const kernel = new Kernel((() => undefined) as unknown as JQueryStatic, frame.contentDocument!);
  const stores = kernel.plugins.use(storesPlugin);
  let sequence = 0;

  try {
    assertProperty(
      "stores-clone-safe-graphs",
      fc.property(safeGraph, (generated) => {
        const source = { generated };
        const snapshot = JSON.stringify(source);
        const store = stores.define(`generated${sequence++}`, defineStore({ initial: source }));

        expect(JSON.stringify(store)).toBe(snapshot);
        expect(JSON.stringify(source)).toBe(snapshot);
        expect(store).not.toBe(source);
      }),
    );
  } finally {
    kernel.dispose();
    frame.remove();
  }
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

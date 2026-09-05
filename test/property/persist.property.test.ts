import fc from "fast-check";
import { expect, it } from "vitest";
import { createFieldCodec, createMemoryStorageAdapter, persistPlugin } from "../../src/persist";
import { parse, serialize } from "../../src/persist/data";
import { compareRevision } from "../../src/persist/envelope";
import { defineStore, storesPlugin } from "../../src/stores";
import { TrustedKernel as Kernel } from "../helpers/trusted-kernel";
import { assertProperty } from "./helpers";

it("round-trips generated JSON preferences without depending on record insertion order", () => {
  assertProperty(
    "persist-canonical-json",
    fc.property(fc.dictionary(fc.stringMatching(/^[a-z]{1,8}$/), fc.jsonValue()), (value) => {
      const reversed = Object.fromEntries(Object.entries(value).reverse());
      expect(serialize(value)).toBe(serialize(reversed));
      expect(parse(serialize(value), 65536)).toEqual(value);
    }),
  );
});

it("selects the same revision winner for every delivery permutation", () => {
  const revision = fc.record({
    counter: fc.integer({ min: 1, max: 10000 }),
    origin: fc.stringMatching(/^[a-z]{1,12}$/),
  });
  assertProperty(
    "persist-lamport-order",
    fc.property(fc.array(revision, { minLength: 1, maxLength: 30 }), (revisions) => {
      const winner = [...revisions].sort(compareRevision).at(-1)!;
      for (const sequence of [
        revisions,
        [...revisions].reverse(),
        [...revisions].sort(compareRevision),
      ]) {
        const accepted = sequence.reduce((current, next) =>
          compareRevision(current, next) >= 0 ? current : next,
        );
        expect(accepted).toEqual(winner);
      }
    }),
  );
});

it("preserves corrupt bytes through generated edits and retry until an explicit reset", () => {
  const command = fc.record({
    action: fc.constantFrom("write", "flush", "corrupt", "retry", "reset"),
    value: fc.integer({ min: 0, max: 10000 }),
  });
  assertProperty(
    "persist-recovery-state-machine",
    fc.property(fc.array(command, { maxLength: 30 }), (commands) => {
      const frame = document.createElement("iframe");
      document.body.append(frame);
      const kernel = new Kernel(
        (() => undefined) as unknown as JQueryStatic,
        frame.contentDocument!,
      );
      const stores = kernel.plugins.use(storesPlugin);
      const persist = kernel.plugins.use(persistPlugin);
      const store = stores.define("preferences", defineStore({ initial: { count: 0 } }));
      const adapter = createMemoryStorageAdapter();
      const attachment = persist.attach(
        "preferences",
        Object.freeze({
          namespace: "property",
          version: 1,
          adapter,
          codec: createFieldCodec<typeof store>([
            { path: "count", validate: (value) => typeof value === "number" },
          ]),
          flushOnDispose: false,
        }),
      );
      const key = "jqstar:property:preferences";
      let disabled = false;
      let current = 0;
      try {
        for (const command of commands) {
          if (command.action === "write") {
            store.count = command.value;
            current = command.value;
          }
          if (command.action === "corrupt") {
            adapter.replace(key, "{");
            disabled = true;
          }
          if (command.action === "flush") expect(attachment.flush().ok).toBe(!disabled);
          if (command.action === "retry") {
            attachment.retry();
            current = store.count;
          }
          if (command.action === "reset") {
            expect(attachment.reset().ok).toBe(true);
            disabled = false;
          }
          expect(store.count).toBe(current);
          if (disabled) {
            expect(adapter.read(key)).toBe("{");
            expect(attachment.status().error).toBe("corrupt");
          }
        }
      } finally {
        kernel.dispose();
        adapter.dispose();
        frame.remove();
      }
    }),
  );
});

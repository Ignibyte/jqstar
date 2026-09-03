import fc from "fast-check";
import { expect, it } from "vitest";

import {
  createExternalRenderCoordinator,
  matchingPreservedRoots,
} from "../fixtures/interoperability/bridge-contract.mjs";
import { assertAsyncProperty, assertProperty } from "./helpers";

it("matches only unique generated preservation IDs", () => {
  assertProperty(
    "external-bridge-unique-preservation",
    fc.property(
      fc.uniqueArray(fc.stringMatching(/^[a-z][a-z0-9]{0,8}$/u), {
        minLength: 1,
        maxLength: 12,
      }),
      fc.array(fc.boolean(), { minLength: 1, maxLength: 12 }),
      (ids, duplicateFlags) => {
        const outgoing = document.createElement("main");
        document.body.append(outgoing);
        const incoming = document.createElement("main");
        const expected: Element[] = [];
        for (const [index, id] of ids.entries()) {
          const oldElement = document.createElement("section");
          oldElement.id = id;
          oldElement.setAttribute("hx-preserve", "");
          outgoing.append(oldElement);
          const newElement = document.createElement("section");
          newElement.id = id;
          newElement.setAttribute("hx-preserve", "");
          incoming.append(newElement);
          if (duplicateFlags[index % duplicateFlags.length]) {
            const duplicate = newElement.cloneNode() as Element;
            incoming.append(duplicate);
          } else {
            expected.push(oldElement);
          }
        }

        expect(matchingPreservedRoots({ outgoing, incoming, marker: "hx-preserve" })).toEqual(
          expected,
        );
        outgoing.remove();
      },
    ),
  );
});

it("settles generated disjoint operations once with stable IDs", async () => {
  await assertAsyncProperty(
    "external-bridge-disjoint-operation-sequences",
    fc.asyncProperty(
      fc.array(fc.constantFrom("commit" as const, "fail" as const, "cancel" as const), {
        minLength: 1,
        maxLength: 16,
      }),
      async (terminals) => {
        const root = document.createElement("main");
        document.body.append(root);
        let nextId = 0;
        const adapter = {
          begin() {
            return {
              operationId: ++nextId,
              beforeRemove() {},
              preservedWithin() {
                return [];
              },
              async commit() {},
              async fail(error: unknown) {
                throw error;
              },
            };
          },
        };
        const bridge = createExternalRenderCoordinator({
          adapter,
          host: "htmx",
          version: "2.0.10",
          minimumVersion: "2.0.0",
          maximumVersionExclusive: "2.1.0",
        });
        const operations = terminals.map((terminal, index) => {
          const boundary = document.createElement("section");
          boundary.id = `boundary-${index}`;
          root.append(boundary);
          return {
            terminal,
            operation: bridge.prepare({ flowId: "htmx.swap.inner", boundary }),
          };
        });

        for (const { terminal, operation } of operations) {
          if (terminal === "cancel") {
            operation.cancel();
          } else {
            operation.beginMutation();
            if (terminal === "commit") {
              operation.mutated();
              await operation.commit();
            } else {
              await operation.fail(new Error("generated failure"));
            }
          }
        }

        const snapshots = operations.map(({ operation }) => operation.snapshot());
        expect(
          snapshots.map(
            ({ bridgeOperationId }: { bridgeOperationId: number }) => bridgeOperationId,
          ),
        ).toEqual(terminals.map((_, index) => index + 1));
        expect(
          snapshots.every(({ state }: { state: string }) =>
            ["canceled", "committed", "failed"].includes(state),
          ),
        ).toBe(true);
        expect((await bridge.dispose()).remaining).toBe(0);
        root.remove();
      },
    ),
  );
});

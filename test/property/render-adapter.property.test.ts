import $ from "jquery";
import fc from "fast-check";
import { expect, it } from "vitest";

import { createRenderAdapter, installStarCore, StarRenderTransactionError } from "../../src/core";
import type { StarInstance } from "../../src/types";
import { assertAsyncProperty } from "./helpers";

it("keeps generated preservation, overlap, and terminal render sequences single-use", async () => {
  await assertAsyncProperty(
    "render-adapter-boundary-state-machine",
    fc.asyncProperty(
      fc.array(fc.record({ preserve: fc.boolean() }), { minLength: 1, maxLength: 8 }),
      fc.array(fc.nat({ max: 20 }), { minLength: 1, maxLength: 20 }),
      fc.constantFrom("commit" as const, "fail" as const),
      async (definitions, generatedBoundaries, terminal) => {
        const frame = document.createElement("iframe");
        document.body.append(frame);
        const owner = frame.contentWindow!;
        const root = owner.document.createElement("main");
        owner.document.body.append(root);
        const nodes: Element[] = [];
        let parent = root;
        for (const [index, definition] of definitions.entries()) {
          const node = owner.document.createElement("section");
          node.id = `generated-${index}`;
          if (definition.preserve) node.setAttribute("data-jqs-preserve", "");
          parent.append(node);
          nodes.push(node);
          parent = node;
        }

        const star = installStarCore($, { document: owner.document }).star;
        try {
          const instances: StarInstance[] = [];
          const destroyCalls = Array.from({ length: nodes.length }, () => 0);
          for (const [index, node] of nodes.entries()) {
            $(node).star({});
            const instance = $(node).star("instance")!;
            const destroy = instance.destroy.bind(instance);
            instance.destroy = () => {
              destroyCalls[index] = (destroyCalls[index] ?? 0) + 1;
              destroy();
            };
            instances.push(instance);
          }

          const boundaries = generatedBoundaries.map((index) => nodes[index % nodes.length]!);
          const transaction = createRenderAdapter($).begin(root);
          for (const boundary of boundaries) transaction.beforeRemove(boundary);

          for (const [index, node] of nodes.entries()) {
            const insideRemoval = boundaries.some((boundary) => boundary.contains(node));
            const protectedByPreservation = nodes.some(
              (candidate, candidateIndex) =>
                definitions[candidateIndex]!.preserve && candidate.contains(node),
            );
            const shouldDestroy = insideRemoval && !protectedByPreservation;
            expect(instances[index]!.destroyed).toBe(shouldDestroy);
            expect(destroyCalls[index]).toBe(shouldDestroy ? 1 : 0);
          }

          if (terminal === "commit") {
            await expect(transaction.commit()).resolves.toBeUndefined();
          } else {
            const failure = new Error("generated render failure");
            await expect(transaction.fail(failure)).rejects.toBe(failure);
          }

          expect(() => transaction.preservedWithin(root)).toThrow(StarRenderTransactionError);
          expect(() => transaction.beforeRemove(root)).toThrow(StarRenderTransactionError);
          await expect(transaction.commit()).rejects.toBeInstanceOf(StarRenderTransactionError);
          await expect(transaction.fail(new Error("late"))).rejects.toBeInstanceOf(
            StarRenderTransactionError,
          );
        } finally {
          star.dispose();
          frame.remove();
        }
      },
    ),
  );
});

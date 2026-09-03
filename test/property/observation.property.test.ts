import fc from "fast-check";
import { expect, it } from "vitest";

import {
  OperationHub,
  type StarOperationCancellationReason,
  type StarOperationObservation,
} from "../../src/observation";
import type { StarContext, StarInstance } from "../../src/types";
import { assertAsyncProperty, assertProperty } from "./helpers";

function operationHub(): OperationHub {
  return new OperationHub((_owner, cleanup) => {
    let active = true;
    return () => {
      if (!active) return;
      active = false;
      cleanup();
    };
  });
}

function application(): StarInstance {
  const root = document.createElement("main");
  return {
    mode: "behavior",
    root,
    $root: {} as JQuery<Element>,
    state: {},
    computed: {},
    destroyed: false,
    observeOperations: () => () => undefined,
    run: async () => undefined,
    refresh: () => undefined,
    destroy: () => undefined,
  };
}

function context(instance: StarInstance): StarContext {
  return {
    $: {} as JQueryStatic,
    state: instance.state,
    computed: instance.computed,
    root: instance.root,
    $root: instance.$root,
    instance,
  };
}

function rejectUnknown(value: unknown): PromiseLike<never> {
  return {
    then(_resolve: unknown, reject?: (reason: unknown) => unknown) {
      reject?.(value);
    },
  } as unknown as PromiseLike<never>;
}

it("keeps generated action sequences paired under one frozen identity", async () => {
  await assertAsyncProperty(
    "observation-action-terminal-identity",
    fc.asyncProperty(fc.array(fc.boolean(), { minLength: 1, maxLength: 30 }), async (failures) => {
      const hub = operationHub();
      const instance = application();
      const records: StarOperationObservation[] = [];
      hub.trackApplication(instance);
      const release = hub.observeKernel((observation) => {
        records.push(observation);
      });

      for (const [index, fails] of failures.entries()) {
        const failure = { index };
        try {
          await hub.runAction(
            instance,
            `generated-${index}`,
            () => (fails ? rejectUnknown(failure) : index),
            context(instance),
          );
          expect(fails).toBe(false);
        } catch (error) {
          expect(fails).toBe(true);
          expect(error).toBe(failure);
        }
      }

      expect(records).toHaveLength(failures.length * 2);
      for (let index = 0; index < failures.length; index += 1) {
        const pair = records.slice(index * 2, index * 2 + 2);
        expect(pair.map(({ phase }) => phase)).toEqual([
          "started",
          failures[index] ? "failed" : "completed",
        ]);
        expect(new Set(pair.map(({ id }) => id)).size).toBe(1);
        expect(pair.every(Object.isFrozen)).toBe(true);
        expect(JSON.parse(JSON.stringify(pair))).toEqual(pair);
      }
      expect(new Set(records.map(({ id }) => id)).size).toBe(failures.length);
      release();
      hub.dispose();
    }),
  );
});

it("keeps generated request progress and one terminal record JSON-safe", () => {
  assertProperty(
    "observation-request-terminal-identity",
    fc.property(
      fc.integer({ min: 0, max: 20 }),
      fc.constantFrom("completed", "cancelled", "failed" as const),
      fc.constantFrom<StarOperationCancellationReason>(
        "superseded",
        "cleanup",
        "external",
        "aborted",
      ),
      fc.stringMatching(/^[a-z0-9]{1,24}$/),
      (progressCount, terminal, cancellation, secret) => {
        const hub = operationHub();
        const instance = application();
        const currentContext = context(instance);
        const records: StarOperationObservation[] = [];
        hub.trackApplication(instance);
        const release = hub.observeKernel((observation) => {
          records.push(observation);
        });
        const request = hub.beginRequest(
          instance,
          currentContext,
          "GET",
          new URL(`https://example.test/generated?private-${secret}#private-fragment`),
        );

        for (let index = 1; index <= progressCount; index += 1) {
          request.progress(1, index, progressCount);
        }
        if (terminal === "completed") request.completed(1, 204);
        else if (terminal === "cancelled") request.cancelled(1, cancellation);
        else request.failed(1, new Error("generated request failed"), 503);
        request.failed(2, new Error("late terminal must be ignored"));

        expect(records.map(({ phase }) => phase)).toEqual([
          "started",
          ...Array.from({ length: progressCount }, () => "progress"),
          terminal,
        ]);
        expect(new Set(records.map(({ id }) => id)).size).toBe(1);
        expect(
          records.filter(({ phase }) => ["completed", "cancelled", "failed"].includes(phase)),
        ).toHaveLength(1);
        expect(records.every(Object.isFrozen)).toBe(true);
        const serialized = JSON.stringify(records);
        expect(serialized).not.toContain("private-");
        expect(JSON.parse(serialized)).toEqual(records);
        release();
        hub.dispose();
      },
    ),
  );
});

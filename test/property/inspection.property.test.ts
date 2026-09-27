import fc from "fast-check";
import { describe, expect, it } from "vitest";
import { Trace, traceOptions, type MutableCounters } from "../../src/inspect/trace";
import { assertProperty } from "./helpers";

describe("inspection trace model", () => {
  it("preserves ordering, exact budgets and reversible policy under interleaved operations", () => {
    assertProperty(
      "inspection-retention-policy",
      fc.property(
        fc.integer({ min: 1, max: 30 }),
        fc.integer({ min: 2, max: 6000 }),
        fc.array(fc.constantFrom("capture", "clear", "allow", "deny", "expire", "export"), {
          minLength: 1,
          maxLength: 200,
        }),
        (maxEntries, maxBytes, commands) => {
          let sequence = 0;
          let now = 0;
          const counters: MutableCounters = {
            observed: 0,
            filtered: 0,
            sampled: 0,
            retained: 0,
            evicted: 0,
            oversized: 0,
            purged: 0,
            failures: {
              configuration: 0,
              capture: 0,
              serializer: 0,
              reentrant: 0,
              clock: 0,
              export: 0,
              cleanup: 0,
            },
          };
          const trace = new Trace(
            traceOptions({ maxEntries, maxBytes }),
            counters,
            { next: () => ++sequence },
            now,
            { sequence: 0, policyId: 0 },
          );
          let last = 0;
          for (const command of commands) {
            now++;
            if (command === "capture")
              trace.capture(
                {
                  schema: "jquery-star-operation/1",
                  kind: "action",
                  phase: "completed",
                  id: `operation-${now}`,
                  owner: { id: "application-1", mode: "behavior" },
                  label: "saveRecord",
                },
                "action",
                now,
              );
            if (command === "clear") trace.clear();
            if (command === "allow")
              trace.allow(
                {
                  field: "actionCapability",
                  purpose: "debugging",
                  maxLength: 32,
                  retain: true,
                  export: false,
                  expiresInMs: 10,
                },
                now,
              );
            if (command === "deny") {
              trace.deny("actionCapability", now);
              expect(
                trace.records(now, false).every((record) => record.actionCapability === undefined),
              ).toBe(true);
            }
            if (command === "expire") {
              now += 20;
              trace.expire(now);
            }
            const before = trace.state(now);
            const records = trace.records(now, false);
            const exported = trace.records(now, true);
            expect(trace.state(now)).toEqual(before);
            expect(exported.every((record) => record.actionCapability === undefined)).toBe(true);
            expect(before.entries).toBeLessThanOrEqual(maxEntries);
            expect(before.bytes).toBeLessThanOrEqual(maxBytes);
            expect(before.sequence).toBeGreaterThanOrEqual(last);
            last = before.sequence;
            expect(
              records.every(
                (record, index) => index === 0 || record.sequence > records[index - 1]!.sequence,
              ),
            ).toBe(true);
            // Reads may withhold expired records before cleanup, but may never exceed retained bytes.
            expect(
              new TextEncoder().encode(JSON.stringify(records)).byteLength,
            ).toBeLessThanOrEqual(before.bytes);
          }
          trace.dispose();
          expect(trace.state(now).entries).toBe(0);
        },
      ),
    );
  });
});

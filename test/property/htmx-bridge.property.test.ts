import fc from "fast-check";
import $ from "jquery";
import { expect, it } from "vitest";

import { installStarCore } from "../../src/core";
import { createHtmxBridge, type StarHtmxCapability } from "../../src/htmx";
import { assertAsyncProperty } from "./helpers";

const observationFields = [
  "bridgeOperationId",
  "elapsedMs",
  "eventId",
  "flowId",
  "host",
  "outcome",
  "phase",
  "removalCount",
  "renderOperationId",
  "schema",
  "sequence",
  "swapStyle",
  "targetCategory",
  "version",
].sort();

function htmx(version: "2.0.0" | "2.0.10" = "2.0.10"): StarHtmxCapability {
  return {
    version,
    config: { defaultSwapStyle: "innerHTML" },
    ajax() {},
    off() {},
    on() {},
    process() {},
    swap() {},
    trigger() {},
  };
}

function realm(markup: string): { frame: HTMLIFrameElement; owner: Window } {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow!;
  owner.document.documentElement.innerHTML = `<head></head><body>${markup}</body>`;
  return { frame, owner };
}

function install(owner: Window, version: "2.0.0" | "2.0.10" = "2.0.10") {
  const star = installStarCore($, { document: owner.document }).star;
  const bridge = star.use(createHtmxBridge({ $, htmx: htmx(version), version }));
  return { bridge, star };
}

function dispatch(
  owner: Window,
  target: EventTarget,
  type: string,
  detail: unknown = {},
): CustomEvent {
  const EventHost = owner as Window & typeof globalThis;
  const event = new EventHost.CustomEvent(type, { bubbles: true, cancelable: true, detail });
  target.dispatchEvent(event);
  return event;
}

it("settles generated disjoint swaps once in any completion order", async () => {
  await assertAsyncProperty(
    "htmx-bridge-disjoint-swap-completion-order",
    fc.asyncProperty(
      fc.integer({ min: 1, max: 6 }),
      fc.array(fc.integer(), { minLength: 6, maxLength: 6 }),
      fc.constantFrom("2.0.0" as const, "2.0.10" as const),
      async (count, priorities, version) => {
        const markup = Array.from(
          { length: count },
          (_, index) =>
            `<button id="source-${index}"></button><main id="target-${index}"><section id="old-${index}" data-jqs><span id="nested-${index}"></span></section></main>`,
        ).join("");
        const { frame, owner } = realm(markup);
        const { bridge, star } = install(owner, version);
        const details: object[] = [];
        try {
          for (let index = 0; index < count; index += 1) {
            const source = owner.document.querySelector(`#source-${index}`)!;
            const target = owner.document.querySelector(`#target-${index}`)!;
            const old = owner.document.querySelector(`#old-${index}`)!;
            $(old).star();
            const detail = {
              xhr: {},
              target,
              requestConfig: { elt: source },
              shouldSwap: true,
              serverResponse: `<section id="new-${index}" data-jqs></section>`,
            };
            details[index] = detail;
            dispatch(owner, source, "htmx:beforeRequest", detail);
            dispatch(owner, target, "htmx:beforeSwap", detail);
          }

          const order = Array.from({ length: count }, (_, index) => index).sort(
            (left, right) => priorities[left]! - priorities[right]! || left - right,
          );
          for (const index of order) {
            const source = owner.document.querySelector(`#source-${index}`)!;
            const target = owner.document.querySelector(`#target-${index}`)!;
            const old = owner.document.querySelector(`#old-${index}`)!;
            const nested = owner.document.querySelector(`#nested-${index}`)!;
            const incoming = owner.document.createElement("section");
            incoming.id = `new-${index}`;
            incoming.setAttribute("data-jqs", "");
            target.insertBefore(incoming, old);
            dispatch(owner, old, "htmx:beforeCleanupElement");
            dispatch(owner, nested, "htmx:beforeCleanupElement");
            dispatch(owner, old, "htmx:beforeCleanupElement");
            old.remove();
            dispatch(owner, target, "htmx:afterSwap", details[index]);
            dispatch(owner, source, "htmx:afterRequest", details[index]);
            dispatch(owner, target, "htmx:afterSettle", details[index]);
          }
          await bridge.whenIdle();

          const terminal = bridge.observations().filter(({ phase }) => phase === "committed");
          expect(terminal).toHaveLength(count);
          expect(new Set(terminal.map(({ bridgeOperationId }) => bridgeOperationId)).size).toBe(
            count,
          );
          expect(terminal.every(({ removalCount }) => removalCount === 1)).toBe(true);
          for (let index = 0; index < count; index += 1) {
            expect(
              $(owner.document.querySelector(`#new-${index}`)!).star("instance"),
            ).toBeDefined();
          }
        } finally {
          await bridge.dispose();
          star.dispose();
          frame.remove();
        }
      },
    ),
  );
});

it("keeps generated request-only traces bounded, terminal, and redacted", async () => {
  await assertAsyncProperty(
    "htmx-bridge-bounded-request-only-traces",
    fc.asyncProperty(
      fc.array(fc.constantFrom("no-swap", "canceled", "send-error", "target-error"), {
        minLength: 1,
        maxLength: 300,
      }),
      async (events) => {
        const { frame, owner } = realm('<button id="source"></button><main id="target"></main>');
        const { bridge, star } = install(owner);
        const source = owner.document.querySelector("#source")!;
        const target = owner.document.querySelector("#target")!;
        try {
          for (const event of events) {
            if (event === "target-error") {
              dispatch(owner, source, "htmx:targetError", { target: "#private-selector" });
              continue;
            }
            const detail = {
              xhr: {},
              target,
              requestConfig: { elt: source },
              shouldSwap: false,
              serverResponse: "private response body",
            };
            if (event === "canceled") {
              source.addEventListener("htmx:beforeRequest", (value) => value.preventDefault(), {
                once: true,
              });
              dispatch(owner, source, "htmx:beforeRequest", detail);
            } else if (event === "send-error") {
              dispatch(owner, source, "htmx:beforeRequest", detail);
              dispatch(owner, source, "htmx:afterRequest", detail);
              dispatch(owner, source, "htmx:sendError", detail);
            } else {
              dispatch(owner, source, "htmx:beforeRequest", detail);
              dispatch(owner, target, "htmx:beforeSwap", detail);
              dispatch(owner, source, "htmx:afterRequest", detail);
            }
            await Promise.resolve();
          }

          const observations = bridge.observations();
          expect(observations).toHaveLength(Math.min(events.length, 256));
          expect(observations.map(({ sequence }) => sequence)).toEqual(
            Array.from(
              { length: observations.length },
              (_, index) => events.length - observations.length + index + 1,
            ),
          );
          for (const observation of observations) {
            expect(Object.keys(observation).sort()).toEqual(observationFields);
            expect(observation.renderOperationId).toBeNull();
            expect(observation.removalCount).toBe(0);
          }
          expect(JSON.stringify(observations)).not.toContain("private");
        } finally {
          await bridge.dispose();
          star.dispose();
          frame.remove();
        }
      },
    ),
  );
});

import fc from "fast-check";
import $ from "jquery";
import { expect, it } from "vitest";

import { installStarCore } from "../../src/core";
import { createTurboBridge, type StarTurboCapability } from "../../src/turbo";
import { assertAsyncProperty } from "./helpers";

const observationFields = [
  "bridgeOperationId",
  "elapsedMs",
  "flowId",
  "host",
  "outcome",
  "phase",
  "removalCount",
  "renderOperationId",
  "schema",
  "sequence",
  "targetCategory",
  "version",
].sort();

function turbo(): StarTurboCapability {
  return {
    cache: {},
    session: {},
    start() {},
    visit() {},
  };
}

function realm(markup: string): { frame: HTMLIFrameElement; owner: Window } {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow!;
  owner.document.documentElement.innerHTML = `<head></head><body>${markup}</body>`;
  return { frame, owner };
}

function install(owner: Window) {
  const star = installStarCore($, { document: owner.document }).star;
  const bridge = star.use(
    createTurboBridge({
      $,
      Turbo: turbo(),
      version: "8.0.23",
    }),
  );
  return { bridge, star };
}

function dispatch(
  owner: Window,
  target: EventTarget,
  type: string,
  detail: unknown = {},
  cancelable = false,
): CustomEvent {
  const EventHost = owner as Window & typeof globalThis;
  const event = new EventHost.CustomEvent(type, { bubbles: true, cancelable, detail });
  target.dispatchEvent(event);
  return event;
}

it("keeps generated no-mutation traces bounded, ordered, and redacted", async () => {
  await assertAsyncProperty(
    "turbo-bridge-bounded-no-mutation-traces",
    fc.asyncProperty(
      fc.array(fc.constantFrom("cache", "cancel", "document-error", "frame-error", "no-render"), {
        minLength: 1,
        maxLength: 300,
      }),
      async (events) => {
        const { frame, owner } = realm("<main></main>");
        const { bridge, star } = install(owner);
        owner.document.addEventListener("turbo:before-visit", (event) => event.preventDefault());
        try {
          for (const event of events) {
            if (event === "cache") dispatch(owner, owner.document, "turbo:before-cache");
            if (event === "cancel") {
              dispatch(owner, owner.document, "turbo:before-visit", {}, true);
              await Promise.resolve();
            }
            if (event === "document-error") {
              dispatch(owner, owner.document, "turbo:fetch-request-error");
            }
            if (event === "frame-error") dispatch(owner, owner.document, "turbo:frame-missing");
            if (event === "no-render") {
              dispatch(owner, owner.document, "turbo:before-fetch-response", {
                fetchResponse: { statusCode: 204 },
              });
            }
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
        } finally {
          star.dispose();
          frame.remove();
        }
      },
    ),
  );
});

it("settles generated disjoint Frame renders independently in any completion order", async () => {
  await assertAsyncProperty(
    "turbo-bridge-disjoint-frame-completion-order",
    fc.asyncProperty(
      fc.integer({ min: 1, max: 8 }),
      fc.array(fc.integer(), { minLength: 8, maxLength: 8 }),
      async (count, priorities) => {
        const markup = Array.from(
          { length: count },
          (_, index) => `<turbo-frame id="frame-${index}"><i id="old-${index}"></i></turbo-frame>`,
        ).join("");
        const { frame, owner } = realm(markup);
        const { bridge, star } = install(owner);
        const finishes: Array<() => void> = [];
        const renders: Array<Promise<void>> = [];
        try {
          for (let index = 0; index < count; index += 1) {
            const current = owner.document.querySelector(`#frame-${index}`)!;
            const incoming = owner.document.createElement("turbo-frame");
            incoming.innerHTML = `<b data-jqs id="new-${index}"></b>`;
            const detail = {
              newFrame: incoming,
              render: (target: Element, source: Element) =>
                new Promise<void>((resolve) => {
                  finishes[index] = () => {
                    target.replaceChildren(...source.children);
                    resolve();
                  };
                }),
            };
            dispatch(owner, current, "turbo:before-frame-render", detail, true);
            renders.push(Promise.resolve(detail.render(current, incoming)));
          }

          const completionOrder = Array.from({ length: count }, (_, index) => index).sort(
            (left, right) => priorities[left]! - priorities[right]! || left - right,
          );
          for (const index of completionOrder) finishes[index]!();
          await Promise.all(renders);
          await bridge.whenIdle();

          const committed = bridge
            .observations()
            .filter(({ phase }) => phase === "committed")
            .map(({ bridgeOperationId, flowId, targetCategory }) => ({
              bridgeOperationId,
              flowId,
              targetCategory,
            }));
          expect(committed).toHaveLength(count);
          expect(new Set(committed.map(({ bridgeOperationId }) => bridgeOperationId)).size).toBe(
            count,
          );
          expect(
            committed.every(
              ({ flowId, targetCategory }) =>
                flowId === "turbo.frame.replace" && targetCategory === "frame",
            ),
          ).toBe(true);
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

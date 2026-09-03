import fc from "fast-check";
import { expect, it } from "vitest";

import {
  createResponseController,
  responseFixture,
  withStarDOMRealm,
  type StarDOMWindow,
} from "../../src/testing";
import { assertAsyncProperty } from "./helpers";

it("preserves queued response order for generated status and body sequences", async () => {
  await assertAsyncProperty(
    "testing-response-fifo",
    fc.asyncProperty(
      fc.array(
        fc.record({
          body: fc.string({ maxLength: 80 }),
          status: fc
            .integer({ min: 200, max: 599 })
            .filter((status) => status !== 204 && status !== 205 && status !== 304),
        }),
        { minLength: 1, maxLength: 12 },
      ),
      async (responses) => {
        const controller = createResponseController();
        const restore = controller.install();
        try {
          for (const [index, response] of responses.entries()) {
            controller.enqueue({
              url: `https://example.test/generated/${index}`,
              response: responseFixture(response),
            });
          }
          for (const [index, response] of responses.entries()) {
            const actual = await fetch(`https://example.test/generated/${index}`);
            expect(actual.status).toBe(response.status);
            expect(await actual.text()).toBe(response.body);
          }
          expect(controller.requests().map(({ url }) => url)).toEqual(
            responses.map((_response, index) => `https://example.test/generated/${index}`),
          );
          controller.assertSatisfied();
        } finally {
          restore();
          controller.dispose();
        }
      },
    ),
  );
});

it("restores ambient descriptors after every generated callback settlement", async () => {
  const frame = document.createElement("iframe");
  document.body.append(frame);
  const owner = frame.contentWindow as StarDOMWindow;
  try {
    await assertAsyncProperty(
      "testing-realm-restoration",
      fc.asyncProperty(fc.boolean(), async (reject) => {
        const descriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
        const run = withStarDOMRealm({ window: owner }, () => {
          expect(globalThis.document).toBe(owner.document);
          if (reject) throw new Error("generated rejection");
          return "settled";
        });
        if (reject) await expect(run).rejects.toThrow("generated rejection");
        else await expect(run).resolves.toBe("settled");
        expect(Object.getOwnPropertyDescriptor(globalThis, "document")).toEqual(descriptor);
      }),
    );
  } finally {
    frame.remove();
  }
});

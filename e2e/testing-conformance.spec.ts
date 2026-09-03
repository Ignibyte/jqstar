import { expect, test } from "@playwright/test";
import { resolve } from "node:path";

const runtimeURL = `/@fs${resolve("e2e/fixtures/runtime.ts")}`;

test("@shared runner-neutral conformance executes unchanged in a real browser", async ({
  page,
}) => {
  await page.goto("/components/lab/");
  const report = await page.evaluate(async (runtimePath) => {
    const runtime = await import(runtimePath);
    runtime.jquery.star.dispose();
    const createHarness = () =>
      runtime.createStarHarness({
        window,
        jQuery: runtime.jquery,
        responses: runtime.createResponseController({ window }),
      });
    return runtime.runCoreConformance(createHarness);
  }, runtimeURL);

  expect(report).toEqual({
    schema: "jquery-star-conformance/1",
    cases: [
      { name: "behavior-application-and-events", status: "pass" },
      { name: "declarative-application-and-jquery-event", status: "pass" },
      { name: "finite-task-and-idempotent-disposal", status: "pass" },
    ],
    passed: 3,
  });
});

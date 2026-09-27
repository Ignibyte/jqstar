import { expect, test } from "@playwright/test";
import type { Page, TestInfo } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import { instrumentInspectorTimers } from "../test/fixtures/resource-strategy/instrumentation.mjs";
import type { ProjectId } from "../test/fixtures/resource-strategy/types";
import type { InspectorFixture } from "../test/fixtures/resource-strategy/common";

type InspectorWindow = typeof window & {
  inspectorFixture: InspectorFixture;
  inspectorTimers: Set<number>;
};

const origin = `http://127.0.0.1:${process.env.JQS_RESOURCE_STRATEGY_PORT ?? 4178}`;
const strategies = ["server", "external", "native"] as const;

test.afterEach(async ({ page }, info) => {
  const match = /\/resource-strategy\/([^/]+)\/(server|external|native)/.exec(page.url());
  if (!match) return;
  const metrics = await (
    await page.request.get(`${origin}/resource-strategy/${match[1]}/metrics`)
  ).json();
  const client = await page.evaluate(() =>
    (window as InspectorWindow).inspectorFixture
      ? {
          ...(window as InspectorWindow).inspectorFixture.inspect(),
          browserTimers: (window as InspectorWindow).inspectorTimers?.size ?? null,
        }
      : null,
  );
  await info.attach("resource-strategy-observation", {
    contentType: "application/json",
    body: JSON.stringify({
      schema: "resource-strategy-observation/1",
      strategy: match[2],
      browser: info.project.name,
      scenario: info.title,
      status: info.status,
      metrics,
      client,
    }),
  });
});

async function openInspector(page: Page, strategy: string, info: TestInfo) {
  const session = `${info.project.name}-${info.testId.replaceAll(/[^a-zA-Z0-9]/g, "")}-${info.retry}`;
  const base = `${origin}/resource-strategy/${session}`;
  await page.addInitScript(instrumentInspectorTimers);
  await page.goto(`${base}/${strategy}`);
  await page.waitForFunction(() => Boolean((window as InspectorWindow).inspectorFixture));
  return {
    base,
    async control(value: object) {
      expect((await page.request.post(`${base}/control`, { data: value })).ok()).toBe(true);
    },
    async metrics() {
      return (await (await page.request.get(`${base}/metrics`)).json()) as {
        reads: number;
        aborted: number;
        active: number;
        writes: number;
      };
    },
  };
}

async function selected(
  page: Page,
  id: ProjectId,
  version = 1,
  consumers = ["summary", "activity"],
) {
  for (const consumer of consumers) {
    await expect(page.locator(`#${consumer}-content`)).toHaveAttribute("data-project", id);
    await expect(page.locator(`#${consumer}-content`)).toHaveAttribute(
      "data-version",
      String(version),
    );
    await expect(page.locator(`#${consumer}`)).toHaveAttribute("aria-busy", "false");
  }
}

async function activate(page: Page, selector: string) {
  await page.locator(selector).focus();
  await page.keyboard.press("Enter");
}

for (const strategy of strategies) {
  test.describe(`Project Inspector ${strategy}`, () => {
    test("S01-S03 initial HTML, concurrent read and warm revisit", async ({ page }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await selected(page, "A");
      expect(
        await page.evaluate(() => (window as InspectorWindow).inspectorFixture.identity().length),
      ).toBe(3);
      expect((await fixture.metrics()).reads).toBe(0);
      await page.locator("#select-B").focus();
      await page.keyboard.press("Enter");
      await selected(page, "B");
      await expect(page.locator("#select-B")).toBeFocused();
      await expect(page.locator("#announcement")).toHaveText("Project B, version 1.");
      expect((await fixture.metrics()).reads).toBe(1);
      await page.locator("#select-A").click();
      await selected(page, "A");
      const before = (await fixture.metrics()).reads;
      await page.locator("#select-B").click();
      await selected(page, "B");
      expect((await fixture.metrics()).reads - before).toBeLessThanOrEqual(1);
    });

    test("S04 rapid selection aborts obsolete work", async ({ page }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await activate(page, "#select-B");
      await selected(page, "B");
      // Cross the same 250 ms inactive-retention boundary in every strategy.
      await page.waitForTimeout(300);
      await fixture.control({ delays: { A: 240 } });
      await activate(page, "#select-A");
      await expect.poll(async () => (await fixture.metrics()).active).toBe(1);
      await activate(page, "#select-B");
      await selected(page, "B");
      await expect.poll(async () => (await fixture.metrics()).active).toBe(0);
      expect((await fixture.metrics()).aborted).toBe(1);
      // Observe the settled DOM beyond obsolete A's original completion deadline.
      await page.waitForTimeout(250);
      await selected(page, "B");
    });

    test("S05-S06 consumer removal and inactive retention", async ({ page }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await fixture.control({ delays: { B: 240, C: 240 } });
      await page.locator("#select-B").click();
      await expect.poll(async () => (await fixture.metrics()).active).toBe(1);
      await page.evaluate(() => (window as InspectorWindow).inspectorFixture.remove("summary"));
      await selected(page, "B", 1, ["activity"]);
      expect((await fixture.metrics()).aborted).toBe(0);
      await activate(page, "#select-C");
      await expect.poll(async () => (await fixture.metrics()).active).toBe(1);
      await page.evaluate(() => (window as InspectorWindow).inspectorFixture.remove("activity"));
      await expect.poll(async () => (await fixture.metrics()).active).toBe(0);
      expect((await fixture.metrics()).aborted).toBe(1);
      await expect
        .poll(() =>
          page.evaluate(() => (window as InspectorWindow).inspectorFixture.inspect().records),
        )
        .toBe(0);
      await expect
        .poll(() => page.evaluate(() => (window as InspectorWindow).inspectorTimers.size))
        .toBe(0);
    });

    test("S07-S08 canonical edits, conflicts, validation and permission", async ({
      page,
    }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await page.locator("#project-name").fill("Revised project");
      await activate(page, "#save");
      await selected(page, "A", 2);
      await expect(page.locator("#summary-content")).toContainText("Revised project");
      await expect(page.locator("#save")).toBeFocused();
      expect((await fixture.metrics()).writes).toBe(1);
      await fixture.control({ advance: "A" });
      await page.locator("#project-name").fill("Keep this draft");
      await activate(page, "#save");
      await expect(page.locator("#announcement")).toHaveText(
        "Project changed on the server. Reload before saving.",
      );
      await expect(page.locator("#project-name")).toHaveValue("Keep this draft");
      await expect(page.locator("#save")).toBeFocused();
      await page.locator("#project-name").fill(" ");
      await activate(page, "#save");
      await expect(page.locator("#announcement")).toHaveText(
        "Enter a project name of 1 to 80 characters.",
      );
      await fixture.control({ forbidden: true });
      await page.locator("#project-name").fill("Denied");
      await activate(page, "#save");
      await expect(page.locator("#announcement")).toHaveText("Project access denied.");
      expect((await fixture.metrics()).writes).toBe(1);
    });

    test("S09-S11 read recovery, empty output, preservation and accessibility", async ({
      page,
    }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await fixture.control({ failures: { B: 1 } });
      await page.locator("#select-B").click();
      await expect(page.locator("#summary")).toHaveAttribute("data-state", "error");
      await expect(page.locator("#announcement")).toHaveText("Project could not be loaded. Retry.");
      await activate(page, "#retry");
      await selected(page, "B");
      await expect(page.locator("#retry")).toBeFocused();
      await expect(page.locator("#announcement")).toHaveText("Project B, version 1.");
      await activate(page, "#select-C");
      await selected(page, "C");
      await expect(page.locator("#activity-content")).toHaveText("No activity yet.");
      const preserved = await page.evaluate(async () => {
        const before = (window as InspectorWindow).inspectorFixture.identity();
        const summary = document.getElementById("summary")!;
        summary.setAttribute("tabindex", "-1");
        summary.focus();
        await (window as InspectorWindow).inspectorFixture.preserve();
        return {
          sameNode: summary === document.getElementById("summary"),
          sameApp: before[1] === (window as InspectorWindow).inspectorFixture.identity()[1],
        };
      });
      expect(preserved).toEqual({ sameNode: true, sameApp: true });
      await expect(page.locator("#activity")).toHaveCount(0);
      await expect(page.locator("#summary")).toBeFocused();
      expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
    });

    test("S13 terminal disposal aborts work and releases timers", async ({ page }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await fixture.control({ delays: { B: 240 } });
      await page.locator("#select-B").click();
      await expect.poll(async () => (await fixture.metrics()).active).toBe(1);
      const report = await page.evaluate(() => {
        const first = (window as InspectorWindow).inspectorFixture.dispose();
        return { first, same: first === (window as InspectorWindow).inspectorFixture.dispose() };
      });
      expect(report.same).toBe(true);
      await info.attach("resource-strategy-disposal", {
        contentType: "application/json",
        body: JSON.stringify(report.first),
      });
      expect(report.first.failed).toEqual([]);
      expect(report.first.remaining).toEqual([]);
      expect(report.first.released).toContainEqual({
        category: "service",
        owner: "research.inspector.strategy",
      });
      await expect.poll(async () => (await fixture.metrics()).active).toBe(0);
      expect((await fixture.metrics()).aborted).toBe(1);
      await expect
        .poll(() => page.evaluate(() => (window as InspectorWindow).inspectorTimers.size))
        .toBe(0);
      await expect
        .poll(() =>
          page.evaluate(() => (window as InspectorWindow).inspectorFixture.inspect().pending),
        )
        .toBe(0);
      const residue = await page.evaluate(() =>
        (window as InspectorWindow).inspectorFixture.inspect(),
      );
      expect(residue.records).toBe(0);
      expect(residue.observers).toBe(0);
      expect(residue.tasks).toBe(0);
    });

    test("S12 native navigation, reload and Back", async ({ page }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await page.locator("#select-B").click();
      await selected(page, "B");
      await page.locator("#native-route").click();
      await expect(page).toHaveURL(`${fixture.base}/${strategy}?selected=B`);
      await selected(page, "B");
      await page.reload();
      await selected(page, "B");
      await page.goBack();
      await expect(page).toHaveURL(`${fixture.base}/${strategy}`);
      await selected(page, "A");
    });

    test("S14 dispose before identity change and install a fresh kernel", async ({
      page,
    }, info) => {
      const fixture = await openInspector(page, strategy, info);
      await page.locator("#project-name").fill("Previous identity");
      await activate(page, "#save");
      await selected(page, "A", 2);
      const previous = await page.evaluate(() =>
        (window as InspectorWindow).inspectorFixture.dispose(),
      );
      expect(previous.remaining).toEqual([]);
      expect(previous.failed).toEqual([]);
      await page.goto(`${fixture.base}-new/${strategy}`);
      await page.waitForFunction(() => Boolean((window as InspectorWindow).inspectorFixture));
      await selected(page, "A", 1);
      await expect(page.locator("#project-name")).toHaveValue("Project A");
      expect(
        await page.evaluate(() => (window as InspectorWindow).inspectorFixture.identity().length),
      ).toBe(3);
    });

    for (const mode of ["mobile", "motion", "color", "zoom"]) {
      test(`S15 responsive accessibility @${mode}`, async ({ page }, info) => {
        await openInspector(page, strategy, info);
        if (mode === "zoom") {
          await page.setViewportSize({ width: 640, height: 900 });
          await page.evaluate(() => {
            document.documentElement.style.fontSize = "200%";
            document.body.style.zoom = "2";
          });
        }
        await page.locator("#select-B").click();
        await selected(page, "B");
        expect(
          await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
        ).toBe(true);
        expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        if (mode === "zoom") {
          // Wider fallback fonts must reflow as well as the host's system font.
          await page.evaluate(() => {
            document.body.style.fontFamily = "monospace";
          });
          expect(
            await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
          ).toBe(true);
          expect((await new AxeBuilder({ page }).analyze()).violations).toEqual([]);
        }
      });
    }

    test("S12-S15 useful HTML and native forms @nojs", async ({ page }, info) => {
      const session = `${info.testId.replaceAll(/[^a-zA-Z0-9]/g, "")}-nojs`;
      const base = `${origin}/resource-strategy/${session}`;
      await page.goto(`${base}/${strategy}`);
      await selected(page, "A");
      await expect(page.locator("noscript > p")).toBeVisible();
      expect(
        await page.locator("noscript > p").evaluate((element) => element.textContent),
      ).toContain("Project links and the edit form still use the server.");
      await page.locator("#select-B").click();
      await expect(page).toHaveURL(`${base}/${strategy}?selected=B`);
      await selected(page, "B");
      await page.locator("#project-name").fill("Native form edit");
      await activate(page, "#save");
      await selected(page, "B", 2);
      await expect(page.locator("#summary-content")).toContainText("Native form edit");
    });
  });
}

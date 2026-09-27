import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { BrowserContext, Page } from "@playwright/test";

const origin = `http://127.0.0.1:${Number(process.env.JQS_JQUERY_MOBILE_MIGRATION_PORT ?? 4177)}`;

interface MigrationSnapshot {
  evidence: {
    activations: number;
    localFilters: number;
    pointerCancels: number;
  };
  jqueryVersion: string;
  mobileRuntimePresent: boolean;
  starMounted: boolean;
}

async function snapshot(page: Page): Promise<MigrationSnapshot> {
  return page.evaluate(() =>
    (
      window as unknown as {
        __jqueryMobileMigration: { snapshot(): MigrationSnapshot };
      }
    ).__jqueryMobileMigration.snapshot(),
  );
}

async function openProject(page: Page) {
  await page.goto(`${origin}/jquery-mobile-migration/projects/alpha`);
  await expect.poll(async () => (await snapshot(page)).starMounted).toBe(true);
}

test("@shared direct documents and removable local search preserve the server route", async ({
  context,
  page,
}) => {
  await page.goto(`${origin}/jquery-mobile-migration/projects`);
  await expect.poll(async () => (await snapshot(page)).starMounted).toBe(true);
  expect(await snapshot(page)).toMatchObject({
    jqueryVersion: "4.0.0",
    mobileRuntimePresent: false,
    starMounted: true,
  });

  await page.getByRole("searchbox", { name: "Search projects" }).fill("Grace");
  await expect(page.locator("[data-project-row]:visible")).toHaveCount(1);
  await expect(page.locator("#filter-status")).toContainText("1 project match locally");

  await Promise.all([
    page.waitForURL(/query=Grace/u),
    page.getByRole("button", { name: "Search server" }).click(),
  ]);
  await expect(page.getByRole("link", { name: "Project Bravo" })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();

  const direct = await context.newPage();
  await direct.goto(`${origin}/jquery-mobile-migration/projects/alpha`);
  await expect(direct.getByRole("heading", { name: "Project Alpha", exact: true })).toBeVisible();
  await expect(direct).toHaveTitle(/Project Alpha/u);
  await direct.close();
});

test("@shared jQStar regions and the official-SDK server patch stay bounded", async ({ page }) => {
  await openProject(page);
  await page.getByRole("button", { name: "Review task" }).click();
  await expect(page.getByRole("dialog", { name: "Review Alpha migration" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: "Review task" })).toBeFocused();

  await page.getByRole("tab", { name: "Activity" }).click();
  await expect(page.getByRole("heading", { name: "Activity" })).toBeVisible();
  await page.getByRole("button", { name: "Ask server to review" }).click();
  await expect(page.locator("#project-status")).toContainText(
    "Official Datastar SDK response applied",
  );
  await expect(page.locator('#project-status [data-status="reviewed"]')).toHaveText("Reviewed");

  const axe = await new AxeBuilder({ page }).include("#migration-app").analyze();
  expect(
    axe.violations.filter(({ impact }) => impact === "serious" || impact === "critical"),
  ).toEqual([]);
});

test("@shared native edit, conflict, submitter, redirect, and multipart semantics survive", async ({
  page,
}) => {
  await page.goto(`${origin}/jquery-mobile-migration/projects/alpha/edit`);
  const name = page.getByRole("textbox", { name: "Project name" });
  await name.fill("");
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(name).toBeFocused();

  await name.fill("Project Delta");
  await Promise.all([
    page.waitForURL(/preview=1/u),
    page.getByRole("button", { name: "Preview changes" }).click(),
  ]);
  await expect(page.locator("#preview-name")).toHaveText("Project Delta");

  const conflict = await page.request.post(
    `${origin}/jquery-mobile-migration/projects/alpha/edit`,
    {
      form: {
        csrf: "mobile-migration-fixture-token",
        intent: "save",
        name: "Conflicted project",
        owner: "Ada",
        version: "6",
      },
    },
  );
  expect(conflict.status()).toBe(409);
  expect(await conflict.text()).toContain("This project changed on the server");

  await page.goto(`${origin}/jquery-mobile-migration/projects/alpha/edit`);
  await page.getByRole("textbox", { name: "Project name" }).fill("Project Echo");
  await Promise.all([
    page.waitForURL(/saved=1/u),
    page.getByRole("button", { name: "Save project" }).click(),
  ]);
  await expect(page.locator("#save-notice")).toContainText("Project Echo was saved by the server");

  await page.goto(`${origin}/jquery-mobile-migration/projects/new`);
  await page.getByRole("textbox", { name: "Project name" }).fill("Project Foxtrot");
  await page.getByLabel("Project brief").setInputFiles({
    buffer: Buffer.from("Direct routes and native forms."),
    mimeType: "text/plain",
    name: "brief.txt",
  });
  await Promise.all([
    page.waitForURL(/created=Project%20Foxtrot/u),
    page.getByRole("button", { name: "Create project" }).click(),
  ]);
  await expect(page.locator("#create-notice")).toContainText("with brief.txt");
});

test("@shared history, pointer cancellation, slow/error, and offline ownership remain native", async ({
  context,
  page,
}) => {
  await page.setViewportSize({ width: 900, height: 500 });
  await page.goto(`${origin}/jquery-mobile-migration/projects`);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  const before = await page.evaluate(() => window.scrollY);
  await page.getByRole("link", { name: "Project Alpha" }).click();
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBeGreaterThanOrEqual(Math.max(0, before - 2));

  await openProject(page);
  await page.getByRole("button", { name: "Advance milestone" }).click();
  expect((await snapshot(page)).evidence.activations).toBe(1);
  await page.locator("#milestone-gesture").dispatchEvent("pointerdown", {
    clientX: 10,
    clientY: 10,
    pointerId: 7,
  });
  await page.locator("#milestone-gesture").dispatchEvent("pointermove", {
    clientX: 12,
    clientY: 80,
    pointerId: 7,
  });
  await page.locator("#milestone-gesture").dispatchEvent("pointerup", {
    clientX: 100,
    clientY: 80,
    pointerId: 7,
  });
  expect((await snapshot(page)).evidence).toMatchObject({ activations: 1, pointerCancels: 1 });

  const started = Date.now();
  await page.goto(`${origin}/jquery-mobile-migration/slow`);
  expect(Date.now() - started).toBeGreaterThanOrEqual(200);
  await expect(page.locator("#slow-result")).toBeVisible();
  const response = await page.goto(`${origin}/jquery-mobile-migration/error`);
  expect(response?.status()).toBe(503);
  await expect(page.locator("#error-guidance")).toContainText("Nothing was queued");

  await page.goto(`${origin}/jquery-mobile-migration/projects/alpha`);
  await setOffline(context, true);
  await expect(page.locator("#offline-message")).toBeVisible();
  await expect(page.locator("#offline-message")).toContainText("writes are not queued or replayed");
  await setOffline(context, false);
});

async function setOffline(context: BrowserContext, offline: boolean) {
  await context.setOffline(offline);
}

test("@mobile responsive navigation, touch targets, orientation, text scaling, and zoom reflow", async ({
  page,
}) => {
  await page.goto(`${origin}/jquery-mobile-migration/projects`);
  const summary = page.locator("#responsive-navigation summary");
  await expect(summary).toBeVisible();
  const target = await page.getByRole("button", { name: "Search server" }).boundingBox();
  expect(target?.height).toBeGreaterThanOrEqual(44);

  await page.locator("html").evaluate((element) => {
    element.style.fontSize = "200%";
    element.style.zoom = "2";
  });
  const portrait = await page.locator("body").evaluate((element) => ({
    client: element.clientWidth,
    scroll: element.scrollWidth,
  }));
  expect(portrait.scroll).toBeLessThanOrEqual(portrait.client + 1);

  await page.setViewportSize({ width: 915, height: 412 });
  await expect(page.getByRole("heading", { name: "Projects", exact: true })).toBeVisible();
});

test("@motion reduced motion removes meaningful fixture animation", async ({ page }) => {
  await openProject(page);
  const durations = await page.locator("#migration-app").evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.animationDuration, style.transitionDuration];
  });
  const seconds = durations.map((value) =>
    value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value),
  );
  expect(seconds.every((value) => value <= 0.001)).toBe(true);
});

test("@color forced colors retain visible boundaries and keyboard focus", async ({ page }) => {
  await openProject(page);
  const button = page.getByRole("button", { name: "Review task" });
  await button.focus();
  const proof = await page.locator(".status-card").evaluate((element) => ({
    border: getComputedStyle(element).borderTopStyle,
    outline: getComputedStyle(document.activeElement!).outlineStyle,
  }));
  expect(proof.border).not.toBe("none");
  expect(proof.outline).not.toBe("none");
});

test("@nojs direct search, disclosure, validation, submitter, and file forms need no script", async ({
  page,
}) => {
  await page.goto(`${origin}/jquery-mobile-migration/projects`);
  await expect(page.locator("#no-script-message")).toBeVisible();
  await expect(page.getByRole("link", { exact: true, name: "Help" })).toBeVisible();

  const search = page.getByRole("searchbox", { name: "Search projects" });
  await search.fill("Grace");
  await expect(page.locator("[data-project-row]:visible")).toHaveCount(3);
  await Promise.all([
    page.waitForURL(/query=Grace/u),
    page.getByRole("button", { name: "Search server" }).click(),
  ]);
  await expect(page.getByRole("link", { name: "Project Bravo" })).toBeVisible();

  await page.goto(`${origin}/jquery-mobile-migration/projects/alpha/edit`);
  const name = page.getByRole("textbox", { name: "Project name" });
  await name.fill("");
  await page.getByRole("button", { name: "Preview changes" }).click();
  await expect(name).toBeFocused();
  await name.fill("No script project");
  await Promise.all([
    page.waitForURL(/preview=1/u),
    page.getByRole("button", { name: "Preview changes" }).click(),
  ]);
  await expect(page.locator("#preview-name")).toHaveText("No script project");

  await page.goto(`${origin}/jquery-mobile-migration/projects/new`);
  await page.getByRole("textbox", { name: "Project name" }).fill("No script upload");
  await page.getByLabel("Project brief").setInputFiles({
    buffer: Buffer.from("Native multipart proof."),
    mimeType: "text/plain",
    name: "no-script.txt",
  });
  await page.getByRole("button", { name: "Create project" }).click();
  await expect(page.locator("#create-notice")).toContainText("no-script.txt");
});

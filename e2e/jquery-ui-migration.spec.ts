import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";

const origin = `http://127.0.0.1:${Number(process.env.JQS_JQUERY_UI_MIGRATION_PORT ?? 4176)}`;

interface MigrationSnapshot {
  counters: {
    legacyDestroy: number;
    legacyInit: number;
    nativeDestroy: number;
    nativeInit: number;
    patches: number;
  };
  evidence: {
    legacyDataAbsentBeforeRemoval: boolean;
    nativeDestroyedBeforeRemoval: boolean;
  };
  jqueryUiVersion: string;
  jqueryVersion: string;
  legacyDataKeys: string[];
  legacyRevision: string;
  nativeHasInstance: boolean;
  nativeRevision: string;
  nativeUiDataKeys: string[];
}

async function openFixture(page: Page) {
  await page.goto(`${origin}/jquery-ui-migration/`);
  await expect(page.locator("#fixture-status")).toHaveText(
    "jQuery 4.0.0, jQuery UI 1.14.2, and jQStar ready",
  );
}

async function snapshot(page: Page): Promise<MigrationSnapshot> {
  return page.evaluate(() =>
    (
      window as unknown as {
        __jqueryUiMigration: { snapshot(): MigrationSnapshot };
      }
    ).__jqueryUiMigration.snapshot(),
  );
}

test("@shared exact jQuery UI and jQStar packages own disjoint same-page regions", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  await openFixture(page);

  const proof = await snapshot(page);
  expect(proof).toMatchObject({
    jqueryUiVersion: "1.14.2",
    jqueryVersion: "4.0.0",
    legacyRevision: "1",
    nativeHasInstance: true,
    nativeRevision: "1",
    nativeUiDataKeys: [],
  });
  expect(proof.legacyDataKeys).toContain("uiTabs");
  expect(proof.counters).toMatchObject({ legacyDestroy: 0, legacyInit: 1, nativeInit: 2 });

  await page.locator("#legacy-open").click();
  await expect(page.getByRole("dialog", { name: "Edit legacy project" })).toBeVisible();
  await page.locator("#legacy-dialog-save").click();
  await expect(page.getByRole("dialog", { name: "Edit legacy project" })).toBeHidden();

  await page.getByRole("tab", { name: "Access", exact: true }).first().click();
  await expect(page.locator("#legacy-access")).toBeVisible();
  await page.locator("#legacy-owner").fill("Gr");
  await page.locator(".ui-autocomplete .ui-menu-item-wrapper", { hasText: "Grace" }).click();
  await expect(page.locator("#legacy-owner")).toHaveValue("Grace");

  await page.locator("#native-open").click();
  await expect(page.getByRole("dialog", { name: "Edit native project" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#native-open")).toBeFocused();
  await page.getByRole("tab", { name: "Access", exact: true }).last().click();
  await expect(page.locator('#native-tabs [data-part="panel"][data-value="access"]')).toBeVisible();
  await page.getByRole("button", { name: "Move Design down" }).click();
  await expect(page.locator('#native-sortable [data-part="item"]').first()).toHaveAttribute(
    "data-value",
    "api",
  );
  expect(errors).toEqual([]);
});

test("@shared explicit destroy precedes server replacement without cross-owner mutation", async ({
  page,
}) => {
  await openFixture(page);
  await page.evaluate(() => {
    const host = window as unknown as {
      __legacyBefore?: unknown;
      __nativeBefore?: object | undefined;
      jQuery: JQueryStatic;
    };
    host.__nativeBefore = host.jQuery("#native-island").star("instance");
    host.__legacyBefore = host.jQuery("#legacy-tabs").data("ui-tabs");
  });

  await page.locator("#replace-legacy").click();
  await expect(page.locator('#legacy-island[data-revision="2"]')).toBeVisible();
  let proof = await snapshot(page);
  expect(proof.evidence.legacyDataAbsentBeforeRemoval).toBe(true);
  expect(proof.counters).toMatchObject({ legacyDestroy: 6, legacyInit: 2, patches: 1 });
  expect(
    await page.evaluate(() => {
      const host = window as unknown as {
        __nativeBefore?: object;
        jQuery: JQueryStatic;
      };
      return host.__nativeBefore === host.jQuery("#native-island").star("instance");
    }),
  ).toBe(true);
  await page.evaluate(() => {
    const host = window as unknown as {
      __legacyBefore?: unknown;
      jQuery: JQueryStatic;
    };
    host.__legacyBefore = host.jQuery("#legacy-tabs").data("ui-tabs");
  });

  await page.locator("#replace-native").click();
  await expect(page.locator('#native-island[data-revision="2"]')).toBeVisible();
  proof = await snapshot(page);
  expect(proof.evidence.nativeDestroyedBeforeRemoval).toBe(true);
  expect(proof.counters).toMatchObject({ nativeDestroy: 1, nativeInit: 3, patches: 2 });
  expect(
    await page.evaluate(() => {
      const host = window as unknown as {
        __legacyBefore?: unknown;
        jQuery: JQueryStatic;
      };
      return host.__legacyBefore === host.jQuery("#legacy-tabs").data("ui-tabs");
    }),
  ).toBe(true);
  expect(proof.legacyDataKeys).toContain("uiTabs");
  expect(proof.nativeUiDataKeys).toEqual([]);
});

test("@shared form semantics, direct server response, and independent documents survive", async ({
  page,
}) => {
  await openFixture(page);
  await page.locator("#native-submit-name").fill("Kepler");
  await Promise.all([
    page.waitForURL(`${origin}/jquery-ui-migration/submit`),
    page.getByRole("button", { name: "Save native project" }).click(),
  ]);
  await expect(page.locator("#submitted-project")).toHaveText("Kepler");
  await expect(page.locator("#submitted-by")).toHaveText("native");

  await openFixture(page);
  const frame = page.locator("body").evaluate((body, source) => {
    const element = document.createElement("iframe");
    element.title = "Independent migration document";
    element.src = source;
    body.append(element);
    return true;
  }, `${origin}/jquery-ui-migration/`);
  await frame;
  const child = page.frameLocator('iframe[title="Independent migration document"]');
  await expect(child.locator("#fixture-status")).toHaveText(
    "jQuery 4.0.0, jQuery UI 1.14.2, and jQStar ready",
  );
  await child.locator("#legacy-open").click();
  await expect(child.getByRole("dialog", { name: "Edit legacy project" })).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Edit legacy project" })).toBeHidden();
});

test("@shared records legacy accessibility debt and adds none in migrated islands", async ({
  page,
}) => {
  await openFixture(page);
  const seriousOrCritical = async (selector: string) => {
    const result = await new AxeBuilder({ page }).include(selector).analyze();
    return result.violations.filter(({ impact }) => impact === "serious" || impact === "critical");
  };
  const legacyBaseline = await seriousOrCritical("#legacy-island");
  expect(legacyBaseline.map(({ id }) => id)).toEqual([
    "aria-required-children",
    "aria-required-parent",
    "listitem",
    "nested-interactive",
  ]);
  expect(legacyBaseline.reduce((count, violation) => count + violation.nodes.length, 0)).toBe(7);
  expect(await seriousOrCritical("#native-island")).toEqual([]);
  expect(await seriousOrCritical("#composite-island")).toEqual([]);
});

test("@mobile ownership islands reflow and native touch targets remain operable", async ({
  page,
}) => {
  await openFixture(page);
  const legacy = await page.locator("#legacy-island").boundingBox();
  const native = await page.locator("#native-island").boundingBox();
  expect(legacy).not.toBeNull();
  expect(native).not.toBeNull();
  expect(native!.y).toBeGreaterThan(legacy!.y + legacy!.height - 2);
  const move = page.getByRole("button", { name: "Move Design down" });
  const target = await move.boundingBox();
  expect(target!.height).toBeGreaterThanOrEqual(44);
  await move.tap();
  await expect(page.locator('#native-sortable [data-part="item"]').first()).toHaveAttribute(
    "data-value",
    "api",
  );
});

test("@motion reduced-motion preference removes meaningful transition duration", async ({
  page,
}) => {
  await openFixture(page);
  const durations = await page.locator("#native-island").evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.animationDuration, style.transitionDuration];
  });
  const seconds = durations.map((value) =>
    value.endsWith("ms") ? Number.parseFloat(value) / 1000 : Number.parseFloat(value),
  );
  expect(seconds.every((value) => value <= 0.001)).toBe(true);
});

test("@color forced colors retain visible ownership and focus boundaries", async ({ page }) => {
  await openFixture(page);
  await page.locator("#native-open").focus();
  const proof = await page.locator("#native-island").evaluate((element) => {
    const border = getComputedStyle(element).borderTopStyle;
    const outline = getComputedStyle(document.activeElement!).outlineStyle;
    return { border, outline };
  });
  expect(proof.border).not.toBe("none");
  expect(proof.outline).not.toBe("none");
});

test("@nojs source content, direct edit route, validation, and submitter work without JavaScript", async ({
  page,
}) => {
  await page.goto(`${origin}/jquery-ui-migration/`);
  await expect(page.locator("#nojs-fallback")).toBeVisible();
  await expect(page.locator("#legacy-form")).toBeVisible();
  await expect(page.locator("#native-form")).toBeVisible();
  await page.getByRole("link", { name: "Edit project without JavaScript" }).click();
  const name = page.getByRole("textbox", { name: "Project name" });
  await name.fill("");
  await page.getByRole("button", { name: "Save project" }).click();
  await expect(name).toBeFocused();
  await name.fill("No script Atlas");
  await Promise.all([
    page.waitForURL(`${origin}/jquery-ui-migration/submit`),
    page.getByRole("button", { name: "Save project" }).click(),
  ]);
  await expect(page.locator("#submitted-project")).toHaveText("No script Atlas");
  await expect(page.locator("#submitted-by")).toHaveText("fallback");
});

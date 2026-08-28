import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("jQuery Star components", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test("button variants render with usable states", async ({ page }) => {
    const showcase = page.getByLabel("Button variants");
    const primary = showcase.getByRole("button", { name: "Primary" });
    const outline = showcase.getByRole("button", { name: "Outline" });
    const disabled = showcase.getByRole("button", { name: "Disabled" });

    await expect(primary).toBeVisible();
    await expect(primary).toHaveCSS("cursor", "pointer");
    await expect(outline).toHaveCSS("background-color", "rgba(0, 0, 0, 0)");
    await expect(disabled).toBeDisabled();

    await primary.focus();
    await expect(primary).toBeFocused();
  });

  test("dialog follows modal keyboard and focus behavior", async ({ page }) => {
    const trigger = page.getByRole("button", { name: "Open verified dialog" });
    const dialog = page.getByRole("dialog", { name: "Keep building this system?" });
    const cancel = dialog.getByRole("button", { name: "Cancel" });

    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(dialog).toHaveAttribute("data-state", "open");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(cancel).toBeFocused();

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");
  });

  test("form components keep native input and reactive binding behavior", async ({ page }) => {
    const email = page.getByRole("textbox", { name: "Email address" });
    const notes = page.getByRole("textbox", { name: "Notes" });
    const terms = page.getByRole("checkbox", { name: "Accept the component contract" });
    const notifications = page.getByRole("switch", { name: "Component notifications" });
    const preview = page.locator(".component-form-preview");

    await expect(email).toHaveAttribute("aria-describedby", "component-email-description");
    await email.fill("proof@example.com");
    await notes.fill("Verified in Chromium");
    await page.getByText("Accept the component contract").click();
    await page.getByText("Component notifications").click();

    await expect(terms).toBeChecked();
    await expect(notifications).not.toBeChecked();
    await expect(preview).toHaveText("proof@example.com · accepted · notifications off");
  });

  test("choice controls, toggles, and sheet keep native and composite behavior", async ({
    page,
  }) => {
    const card = page.getByRole("region", { name: "Choice and toggle controls" });
    const compact = card.getByRole("radio", { name: "Compact" });
    const slider = card.getByRole("slider", { name: /Preview volume/ });
    const volume = card.locator('label[for="component-volume"] output');
    const toggle = card.getByRole("button", { name: "Live preview" });
    const group = card.getByRole("toolbar", { name: "Text formatting" });
    const bold = group.getByRole("button", { name: "B", exact: true });
    const italic = group.getByRole("button", { name: "I", exact: true });
    const underline = group.getByRole("button", { name: "U", exact: true });

    await compact.check();
    await expect(compact).toBeChecked();
    await slider.fill("75");
    await expect(volume).toHaveText("75");

    await toggle.click();
    await expect(toggle).toHaveAttribute("aria-pressed", "true");
    await expect(bold).toHaveAttribute("aria-pressed", "true");
    await italic.click();
    await expect(group).toHaveAttribute("data-value", "bold italic");

    await bold.focus();
    await page.keyboard.press("ArrowRight");
    await expect(italic).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(underline).toBeFocused();

    const sheetTrigger = card.getByRole("button", { name: "Open side sheet" });
    const sheet = page.getByRole("dialog", { name: "Component settings" });
    const close = sheet.getByRole("button", { name: "Close" });
    await sheetTrigger.click();
    await expect(sheet).toBeVisible();
    await expect(close).toBeFocused();
    await close.click();
    await expect(sheet).toBeHidden();
    await expect(sheetTrigger).toBeFocused();
  });

  test("collapsible preserves native pointer and keyboard behavior", async ({ page }) => {
    const item = page.locator("#server-collapsible");
    const trigger = item.locator("summary");
    const content = item.getByRole("region", { name: "How does Datastar fit?" });

    await expect(content).toBeHidden();
    await trigger.click();
    await expect(item).toHaveAttribute("data-state", "open");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(content).toBeVisible();

    await trigger.focus();
    await page.keyboard.press("Enter");
    await expect(item).toHaveAttribute("data-state", "closed");
    await expect(content).toBeHidden();
  });

  test("accordion enforces one open item and supports header navigation", async ({ page }) => {
    const accordion = page.locator("#component-accordion");
    const items = accordion.locator(":scope > details");
    const first = items.nth(0);
    const second = items.nth(1);
    const firstTrigger = first.locator("summary");
    const secondTrigger = second.locator("summary");

    await expect(first).toHaveAttribute("open", "");
    await expect(firstTrigger).toHaveAttribute("aria-disabled", "true");
    await firstTrigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(secondTrigger).toBeFocused();
    await page.keyboard.press("Enter");

    await expect(first).not.toHaveAttribute("open", "");
    await expect(second).toHaveAttribute("open", "");
    await expect(secondTrigger).toHaveAttribute("aria-disabled", "true");

    await page.keyboard.press("Enter");
    await expect(second).toHaveAttribute("open", "");
  });

  test("tabs manage roving focus and automatic activation", async ({ page }) => {
    const tabs = page.locator("#architecture-tabs");
    const runtime = tabs.getByRole("tab", { name: "Runtime" });
    const server = tabs.getByRole("tab", { name: "Server" });
    const serverPanel = tabs.getByRole("tabpanel", { name: "Server" });

    await expect(runtime).toHaveAttribute("aria-selected", "true");
    await expect(serverPanel).toBeHidden();
    await runtime.focus();
    await page.keyboard.press("ArrowRight");

    await expect(server).toBeFocused();
    await expect(server).toHaveAttribute("aria-selected", "true");
    await expect(serverPanel).toBeVisible();
    await expect(runtime).toHaveAttribute("tabindex", "-1");

    await page.keyboard.press("Home");
    await expect(runtime).toBeFocused();
    await expect(runtime).toHaveAttribute("aria-selected", "true");
  });

  test("popover uses the top layer and restores focus after dismissal", async ({ page }) => {
    const popover = page.locator("#deployment-popover");
    const trigger = popover.getByRole("button", { name: "Deployment" });
    const content = popover.getByRole("dialog", { name: "Ready to deploy" });
    const close = content.getByRole("button", { name: "Got it" });

    await trigger.click();
    await expect(content).toBeVisible();
    await expect(popover).toHaveAttribute("data-state", "open");
    await expect(trigger).toHaveAttribute("aria-expanded", "true");
    await expect(close).toBeFocused();

    const triggerBox = await trigger.boundingBox();
    const contentBox = await content.boundingBox();
    expect(triggerBox).not.toBeNull();
    expect(contentBox).not.toBeNull();
    expect(contentBox!.y).toBeGreaterThan(triggerBox!.y);
    expect(contentBox!.x).toBeGreaterThanOrEqual(8);
    expect(contentBox!.x + contentBox!.width).toBeLessThanOrEqual(
      (await page.evaluate(() => window.innerWidth)) - 8,
    );

    await page.keyboard.press("Escape");
    await expect(content).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "false");

    await trigger.click();
    await page.locator("h1").click();
    await expect(content).toBeHidden();
  });

  test("tooltip follows hover, focus, and Escape behavior without moving focus", async ({
    page,
  }) => {
    const tooltip = page.locator("#verification-tooltip");
    const trigger = tooltip.getByRole("button", { name: "Hover or focus me" });
    const content = tooltip.getByRole("tooltip");

    await trigger.hover();
    await expect(content).toBeVisible();
    await content.hover();
    await page.waitForTimeout(150);
    await expect(content).toBeVisible();
    await page.locator("h1").hover();
    await expect(content).toBeHidden();

    await trigger.focus();
    await expect(content).toBeVisible();
    await expect(trigger).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(content).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("dropdown menu supports menu-button keyboard and selection behavior", async ({ page }) => {
    const root = page.locator("#proof-menu");
    const trigger = root.getByRole("button", { name: "Actions" });
    const menu = root.getByRole("menu");
    const inspect = root.getByRole("menuitem", { name: /Inspect component/ });
    const persistent = root.getByRole("menuitemcheckbox", { name: "Keep menu open" });
    const disabled = root.getByRole("menuitem", { name: "Publish later" });

    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(menu).toBeVisible();
    await expect(inspect).toBeFocused();
    await expect(trigger).toHaveAttribute("aria-expanded", "true");

    await page.keyboard.press("ArrowDown");
    await expect(persistent).toBeFocused();
    await page.keyboard.press("Space");
    await expect(persistent).toHaveAttribute("aria-checked", "false");
    await expect(menu).toBeVisible();

    await page.keyboard.press("ArrowDown");
    await expect(disabled).toBeFocused();
    await expect(disabled).toHaveAttribute("aria-disabled", "true");
    await page.keyboard.press("Enter");
    await expect(menu).toBeVisible();

    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    await expect(menu).toBeHidden();
    await expect(trigger).toBeFocused();

    await trigger.click();
    await page.locator("h1").click();
    await expect(menu).toBeHidden();
  });

  test("select keeps keyboard exploration separate from the native form value", async ({
    page,
  }) => {
    const root = page.locator("#framework-select");
    const trigger = root.getByRole("combobox", { name: "UI foundation" });
    const listbox = root.getByRole("listbox", { name: "UI foundation" });
    const control = root.locator('select[data-part="control"]');
    const preview = page.locator(".select-preview");

    await expect(trigger).toContainText("jQuery Star");
    await expect(control).toBeHidden();
    await expect(root.getByRole("combobox")).toHaveCount(1);
    await trigger.focus();
    await page.keyboard.press("ArrowDown");
    await expect(listbox).toBeVisible();
    await expect(trigger).toBeFocused();

    await page.keyboard.press("ArrowDown");
    await expect(control).toHaveValue("jquery-star");
    await expect(root.getByRole("option", { name: "Datastar" })).toHaveAttribute(
      "data-highlighted",
      "",
    );

    await page.keyboard.press("Enter");
    await expect(listbox).toBeHidden();
    await expect(control).toHaveValue("datastar");
    await expect(trigger).toContainText("Datastar");
    await expect(preview).toHaveText("Selected value: datastar");
    await expect
      .poll(() =>
        page
          .locator("#select-proof-form")
          .evaluate((form) => new FormData(form as HTMLFormElement).get("framework")),
      )
      .toBe("datastar");

    await page.getByRole("button", { name: "Reset choice" }).click();
    await expect(control).toHaveValue("jquery-star");
    await expect(preview).toHaveText("Selected value: jquery-star");
  });

  test("combobox keeps query and committed value separate across SDK result patches", async ({
    page,
  }) => {
    const root = page.locator("#technology-combobox");
    const control = root.getByRole("combobox", { name: "Find a UI system" });
    const listbox = root.getByRole("listbox", { name: "Find a UI system" });
    const value = root.locator('input[data-part="value"]');
    const status = page.locator(".combobox-status");
    const preview = page.locator(".combobox-preview");

    await control.fill("tail");
    await expect(listbox).toBeVisible();
    await expect(status).toHaveText("1 results");
    await expect(root.getByRole("option", { name: "Tailwind CSS" })).toBeVisible();
    await expect(control).toBeFocused();
    await expect(value).toHaveValue("");

    await page.keyboard.press("Enter");
    await expect(listbox).toBeHidden();
    await expect(control).toHaveValue("Tailwind CSS");
    await expect(value).toHaveValue("tailwind");
    await expect(preview).toHaveText("Committed value: tailwind");
    await expect
      .poll(() =>
        page
          .locator("#combobox-proof-form")
          .evaluate((form) => Object.fromEntries(new FormData(form as HTMLFormElement))),
      )
      .toEqual({ technology: "tailwind", technologyQuery: "Tailwind CSS" });

    await page.getByRole("button", { name: "Clear search" }).click();
    await expect(control).toHaveValue("");
    await expect(value).toHaveValue("");
    await expect(preview).toHaveText("No committed value");

    await control.fill("zzzz");
    await expect(status).toHaveText("0 results");
    await expect(root.getByRole("option", { name: "No matching systems" })).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(listbox).toBeHidden();
    await expect(control).toHaveValue("zzzz");
    await expect(value).toHaveValue("");
  });

  test("data table sorts, filters, paginates, and selects native rows", async ({ page }) => {
    const root = page.locator("#systems-data-table");
    const table = root.getByRole("table", { name: "Component system comparison" });
    const visibleRows = table.locator("tbody tr:not([hidden])");

    await expect(visibleRows).toHaveCount(3);
    await root.getByRole("button", { name: "Coverage" }).click();
    await expect(table.locator('th[data-key="coverage"]')).toHaveAttribute(
      "aria-sort",
      "ascending",
    );
    await expect(visibleRows.nth(0)).toContainText("Datastar");
    await expect(visibleRows.nth(1)).toContainText("Bootstrap");

    await root.getByRole("button", { name: "Coverage" }).click();
    await expect(visibleRows.nth(0)).toContainText("daisyUI");
    await expect(visibleRows.nth(1)).toContainText("Shoelace");

    const filter = root.getByRole("searchbox", { name: "Filter systems" });
    await filter.fill("Framework-neutral");
    await expect(visibleRows).toHaveCount(2);
    await expect(root.locator('[data-part="page-status"]')).toHaveText("1–2 of 2");

    await filter.fill("");
    const selectAll = root.getByRole("checkbox", { name: "Select visible systems" });
    await selectAll.check();
    await expect(root.locator('[data-part="selection-status"]')).toHaveText("3 selected");
    await root.getByRole("button", { name: "Next" }).click();
    await expect(root.locator('[data-part="page-status"]')).toHaveText("4–6 of 6");
    await root.getByRole("checkbox", { name: "Select Bootstrap" }).check();
    await expect(root.locator('[data-part="selection-status"]')).toHaveText("4 selected");
  });

  test("toast supports F8 access, pause, Escape, and swipe dismissal", async ({ page }) => {
    const show = page.getByRole("button", { name: "Show verified toast" });
    const viewport = page.getByRole("region", { name: "Proof notifications (F8)" });

    await show.click();
    let toast = page.getByRole("group", { name: "Build verified" });
    await expect(toast).toBeVisible();
    await page.keyboard.press("F8");
    await expect(viewport).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(toast.getByRole("button", { name: "Dismiss notification" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(toast).toBeHidden();
    await expect(viewport).toBeFocused();

    await show.click();
    toast = page.getByRole("group", { name: "Build verified" });
    await toast.hover();
    await page.waitForTimeout(1800);
    await expect(toast).toBeVisible();
    await page.locator("h1").hover();
    await expect(toast).toBeHidden();

    await show.click();
    toast = page.getByRole("group", { name: "Build verified" });
    const box = await toast.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width / 2 + 80, box!.y + box!.height / 2);
    await page.mouse.up();
    await expect(toast).toBeHidden();
  });

  test("navigation components keep native landmarks and disclosure behavior", async ({ page }) => {
    const breadcrumb = page.getByRole("navigation", { name: "Breadcrumb" });
    const primary = page.getByRole("navigation", { name: "Primary" });
    const pagination = page.getByRole("navigation", { name: "Component pages" });
    const products = primary.getByRole("button", { name: "Products" });
    const panel = page.getByRole("dialog", { name: "Products" });

    await expect(breadcrumb.getByRole("link", { name: "Navigation" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(primary.getByRole("link", { name: "Overview" })).toHaveAttribute(
      "aria-current",
      "page",
    );
    await expect(pagination.getByText("Previous", { exact: true })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    await expect(pagination.getByRole("link", { name: "1" })).toHaveAttribute(
      "aria-current",
      "page",
    );

    await products.click();
    await expect(panel).toBeVisible();
    await expect(panel.getByRole("link")).toHaveCount(4);
    await page.keyboard.press("Escape");
    await expect(panel).toBeHidden();
    await expect(products).toBeFocused();
  });

  test("command palette composes dialog and inline combobox behavior", async ({ page }) => {
    const trigger = page.getByRole("button", { name: /Open command palette/ });
    const dialogRoot = page.locator("#command-palette-dialog");
    const dialog = page.getByRole("dialog", { name: "Jump to a component" });
    const query = dialog.getByRole("combobox", { name: "Search commands" });
    const value = dialogRoot.locator('[data-part="value"]');

    await trigger.click();
    await expect(dialog).toBeVisible();
    await expect(query).toBeFocused();
    await query.fill("server");
    await expect(dialog.getByRole("option", { name: /Open server proof/ })).toBeVisible();
    await expect(dialog.getByRole("option", { name: /Browse components/ })).toBeHidden();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");

    await expect(value).toHaveValue("server");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
  });

  test("composition primitives render with native semantics and no runtime state", async ({
    page,
  }) => {
    const card = page.getByRole("article", { name: "Release candidate" });
    const showcase = page.locator(".primitives-component-card");

    await expect(card).toBeVisible();
    await expect(card).toHaveCSS("border-radius", "14px");
    await expect(showcase.locator('[data-jqs="badge"]')).toHaveCount(5);
    await expect(showcase.getByRole("status")).toContainText("All checks passed");
    await expect(page.getByRole("img", { name: "Chad Peppers" })).toContainText("CP");
    await expect(showcase.getByRole("separator")).toBeVisible();
    await expect(showcase.locator('[data-jqs="skeleton"]')).toHaveCount(2);
    await expect(page.getByRole("progressbar", { name: "Component coverage" })).toHaveAttribute(
      "value",
      "36",
    );
  });

  test("button and open dialog pass automated accessibility checks", async ({ page }) => {
    await page.locator(".component-card").evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    let results = await new AxeBuilder({ page }).include(".component-card").analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("button", { name: "Open verified dialog" }).click();
    await page.locator("#proof-dialog").evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include("#proof-dialog").analyze();
    expect(results.violations).toEqual([]);
  });

  test("form components pass automated accessibility checks", async ({ page }) => {
    await page.locator(".form-component-card").evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    const results = await new AxeBuilder({ page }).include(".form-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("choice controls and the open sheet pass automated accessibility checks", async ({
    page,
  }) => {
    let results = await new AxeBuilder({ page }).include(".controls-component-card").analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("button", { name: "Open side sheet" }).click();
    results = await new AxeBuilder({ page }).include("#proof-sheet").analyze();
    expect(results.violations).toEqual([]);
  });

  test("disclosure components pass accessibility checks when closed and open", async ({ page }) => {
    const card = page.locator(".disclosure-component-card");
    let results = await new AxeBuilder({ page }).include(".disclosure-component-card").analyze();
    expect(results.violations).toEqual([]);

    await card.locator("#server-collapsible > summary").click();
    await card.locator("#component-accordion > details").nth(1).locator("summary").click();
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include(".disclosure-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("tabs pass accessibility checks in each selected state", async ({ page }) => {
    const tabs = page.locator("#architecture-tabs");
    const waitForAnimations = async (): Promise<void> => {
      await tabs.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };
    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include("#architecture-tabs").analyze();
    expect(results.violations).toEqual([]);

    await tabs.getByRole("tab", { name: "Theme" }).focus();
    await waitForAnimations();
    results = await new AxeBuilder({ page }).include("#architecture-tabs").analyze();
    expect(results.violations).toEqual([]);
  });

  test("popover passes accessibility checks when closed and open", async ({ page }) => {
    const card = page.locator(".overlay-component-card");
    let results = await new AxeBuilder({ page }).include(".overlay-component-card").analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("button", { name: "Deployment" }).click();
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include(".overlay-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("tooltip passes accessibility checks when closed and open", async ({ page }) => {
    const tooltip = page.locator("#verification-tooltip");
    const waitForAnimations = async (): Promise<void> => {
      await tooltip.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };
    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include("#verification-tooltip").analyze();
    expect(results.violations).toEqual([]);

    await tooltip.getByRole("button", { name: "Hover or focus me" }).focus();
    await expect(tooltip.getByRole("tooltip")).toBeVisible();
    await waitForAnimations();
    results = await new AxeBuilder({ page }).include("#verification-tooltip").analyze();
    expect(results.violations).toEqual([]);
  });

  test("dropdown menu passes accessibility checks when closed and open", async ({ page }) => {
    const root = page.locator("#proof-menu");
    const waitForAnimations = async (): Promise<void> => {
      await root.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };
    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include("#proof-menu").analyze();
    expect(results.violations).toEqual([]);

    await root.getByRole("button", { name: "Actions" }).click();
    await root.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include("#proof-menu").analyze();
    expect(results.violations).toEqual([]);
  });

  test("select passes accessibility checks when closed and open", async ({ page }) => {
    const root = page.locator("#framework-select");
    const card = page.locator(".select-component-card");
    const waitForAnimations = async (): Promise<void> => {
      await card.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };

    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include(".select-component-card").analyze();
    expect(results.violations).toEqual([]);

    await root.getByRole("combobox", { name: "UI foundation" }).click();
    await expect(root.getByRole("listbox", { name: "UI foundation" })).toBeVisible();
    await waitForAnimations();
    results = await new AxeBuilder({ page }).include(".select-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("combobox passes accessibility checks with server-patched results open", async ({
    page,
  }) => {
    const root = page.locator("#technology-combobox");
    const card = page.locator(".combobox-component-card");
    const control = root.getByRole("combobox", { name: "Find a UI system" });
    const waitForAnimations = async (): Promise<void> => {
      await card.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };

    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include(".combobox-component-card").analyze();
    expect(results.violations).toEqual([]);

    await control.fill("rad");
    await expect(page.locator(".combobox-status")).toHaveText("1 results");
    await expect(root.getByRole("option", { name: "Radix Primitives" })).toBeVisible();
    await waitForAnimations();
    results = await new AxeBuilder({ page }).include(".combobox-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("data table passes accessibility checks after sorting and selection", async ({ page }) => {
    const root = page.locator("#systems-data-table");
    const card = page.locator(".data-table-component-card");
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    let results = await new AxeBuilder({ page }).include(".data-table-component-card").analyze();
    expect(results.violations).toEqual([]);

    await root.getByRole("button", { name: "System" }).click();
    await root.getByRole("checkbox", { name: "Select visible systems" }).check();
    results = await new AxeBuilder({ page }).include(".data-table-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("composition primitives pass accessibility checks", async ({ page }) => {
    const results = await new AxeBuilder({ page }).include(".primitives-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("navigation components pass accessibility checks when closed and open", async ({ page }) => {
    const card = page.locator(".navigation-component-card");
    let results = await new AxeBuilder({ page }).include(".navigation-component-card").analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("button", { name: "Products" }).click();
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include(".navigation-component-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("command palette passes accessibility checks while open and filtered", async ({ page }) => {
    await page.getByRole("button", { name: /Open command palette/ }).click();
    const dialog = page.getByRole("dialog", { name: "Jump to a component" });
    await dialog.getByRole("combobox", { name: "Search commands" }).fill("server");
    await dialog.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    const results = await new AxeBuilder({ page }).include("#command-palette-dialog").analyze();
    expect(results.violations).toEqual([]);
  });

  test("toast viewport and open toast pass accessibility checks", async ({ page }) => {
    const card = page.locator(".toast-component-card");
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    let results = await new AxeBuilder({ page }).include(".toast-component-card").analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("button", { name: "Show verified toast" }).click();
    const toast = page.getByRole("group", { name: "Build verified" });
    await toast.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include('[data-jqs="toast-viewport"]').analyze();
    expect(results.violations).toEqual([]);
  });
});

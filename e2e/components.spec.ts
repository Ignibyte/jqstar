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

  test("number, password, and tags fields keep native form contracts", async ({ page }) => {
    const card = page.getByRole("region", { name: "Capable form fields" });
    const form = card.getByRole("form", { name: "Capable form controls" });
    const guests = card.getByRole("spinbutton", { name: "Guests" });
    const password = card.getByRole("textbox", { name: "Password", exact: true });
    const tags = card.getByRole("textbox", { name: "Project tags" });

    await expect(guests).toHaveValue("2");
    await card.getByRole("button", { name: "Add one guest" }).click();
    await expect(guests).toHaveValue("3");

    await expect(password).toHaveAttribute("type", "password");
    await card.getByRole("button", { name: "Show password" }).click();
    await expect(password).toHaveAttribute("type", "text");
    await expect(password).toHaveValue("jquery-star");
    await expect(card.getByRole("button", { name: "Hide password" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );

    await tags.fill("Tailwind CSS");
    await tags.press("Enter");
    await expect(card.getByRole("button", { name: "Remove Tailwind CSS" })).toBeVisible();
    await expect(
      form.evaluate((element) => new FormData(element as HTMLFormElement).getAll("tags")),
    ).resolves.toEqual(["jQuery", "Datastar", "Tailwind CSS"]);
    await expect(
      form.evaluate((element) => new FormData(element as HTMLFormElement).get("guests")),
    ).resolves.toBe("3");
  });

  test("OTP, resizable panels, and scroll area retain platform behavior", async ({ page }) => {
    const card = page.getByRole("region", { name: "Verification and layout primitives" });
    const otpForm = card.getByRole("form", { name: "Verification code proof" });
    const otp = card.getByRole("textbox", { name: "Verification code", exact: true });
    await otp.fill("12a345");
    await expect(otp).toHaveValue("12345");
    await otp.fill("1234567");
    await expect(otp).toHaveValue("123456");
    await expect(card.locator('#component-input-otp [data-part="slot"]')).toHaveCount(6);
    await expect(card.locator('#component-input-otp [data-part="status"]')).toHaveText(
      "Code complete.",
    );
    await expect(
      otpForm.evaluate((element) => new FormData(element as HTMLFormElement).get("code")),
    ).resolves.toBe("123456");

    const splitter = card.getByRole("separator", { name: "Resize project navigation" });
    await splitter.focus();
    await page.keyboard.press("ArrowRight");
    await expect(splitter).toHaveAttribute("aria-valuenow", "40");
    await page.keyboard.press("End");
    await expect(splitter).toHaveAttribute("aria-valuenow", "60");
    await page.keyboard.press("Enter");
    await expect(splitter).toHaveAttribute("aria-valuenow", "25");
    await page.keyboard.press("Enter");
    await expect(splitter).toHaveAttribute("aria-valuenow", "60");

    await card.getByRole("button", { name: "Reset panels" }).click();
    await expect(splitter).toHaveAttribute("aria-valuenow", "50");
    const splitterBox = await splitter.boundingBox();
    expect(splitterBox).not.toBeNull();
    await page.mouse.move(splitterBox!.x + splitterBox!.width / 2, splitterBox!.y + 20);
    await page.mouse.down();
    await page.mouse.move(splitterBox!.x + 50, splitterBox!.y + 20, { steps: 4 });
    await page.mouse.up();
    await expect
      .poll(async () => Number(await splitter.getAttribute("aria-valuenow")))
      .toBeGreaterThan(50);

    const viewport = card.locator('[data-jqs="scroll-area"] > [data-part="viewport"]');
    await viewport.focus();
    await page.keyboard.press("End");
    await expect.poll(() => viewport.evaluate((element) => element.scrollTop)).toBeGreaterThan(0);
  });

  test("context menu, menubar, and tree retain application keyboard behavior", async ({ page }) => {
    const card = page.getByRole("region", { name: "Application interaction" });
    const status = card.locator(".application-status");

    const file = card.getByRole("menuitem", { name: "File", exact: true });
    const edit = card.getByRole("menuitem", { name: "Edit", exact: true });
    await file.focus();
    await page.keyboard.press("ArrowRight");
    await expect(edit).toBeFocused();
    await page.keyboard.press("ArrowDown");
    const undo = card.getByRole("menuitem", { name: /Undo/ });
    await expect(undo).toBeFocused();
    await page.keyboard.press("ArrowRight");
    const sidebar = card.getByRole("menuitemcheckbox", { name: "Sidebar" });
    await expect(sidebar).toBeFocused();
    await sidebar.click();
    await expect(status).toHaveText("Toggled the sidebar");
    await expect(sidebar).toHaveAttribute("aria-checked", "false");
    await page.keyboard.press("Escape");

    const surface = card.locator('[data-jqs="context-menu"] > [data-part="trigger"]');
    await surface.click({ button: "right", position: { x: 80, y: 60 } });
    await expect(card.getByRole("menuitem", { name: "Open", exact: true })).toBeFocused();
    const duplicate = card.getByRole("menuitem", { name: /Duplicate/ });
    await duplicate.click();
    await expect(status).toHaveText("Duplicated jqstar");
    await surface.focus();
    await page.keyboard.press("Shift+F10");
    await expect(card.getByRole("menuitem", { name: "Open", exact: true })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(surface).toBeFocused();

    const source = card.getByRole("treeitem", { name: "src" });
    const index = card.getByRole("treeitem", { name: "index.ts" });
    await source.focus();
    await page.keyboard.press("ArrowRight");
    await expect(index).toBeFocused();
    await page.keyboard.press("Space");
    await expect(index).toHaveAttribute("aria-selected", "true");
    await expect(status).toHaveText("Tree selection: src, index");
  });

  test("sidebar, carousel, and toolbar compose into a responsive application shell", async ({
    page,
  }) => {
    const card = page.getByRole("region", { name: "Navigation and content controls" });
    const sidebar = card.locator("#component-sidebar");
    const trigger = card.locator('#component-sidebar [data-part="trigger"]');
    const status = card.locator(".workspace-heading output");

    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await trigger.click();
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await page.keyboard.press("Control+b");
    await expect(sidebar).toHaveAttribute("data-state", "expanded");

    const toolbar = card.getByRole("toolbar", { name: "Preview tools" });
    const grid = toolbar.getByRole("button", { name: "Grid view" });
    const focus = toolbar.getByRole("button", { name: "Focus mode" });
    await grid.focus();
    await page.keyboard.press("ArrowRight");
    await expect(focus).toBeFocused();
    await focus.click();
    await expect(focus).toHaveAttribute("aria-pressed", "true");
    await expect(status).toHaveText("Focus mode toggled");

    await card.getByRole("button", { name: "Next slide" }).click();
    await expect(card.getByRole("group", { name: "2 of 3" })).toBeVisible();
    await expect(status).toHaveText("Slide: datastar");

    const carouselContent = card.locator('#component-carousel > [data-part="content"]');
    const box = await carouselContent.boundingBox();
    expect(box).not.toBeNull();
    await page.mouse.move(box!.x + box!.width * 0.75, box!.y + box!.height / 2);
    await page.mouse.down();
    await page.mouse.move(box!.x + box!.width * 0.25, box!.y + box!.height / 2, { steps: 4 });
    await page.mouse.up();
    await expect(card.getByRole("group", { name: "3 of 3" })).toBeVisible();

    await page.setViewportSize({ width: 390, height: 844 });
    await expect(sidebar).toHaveAttribute("data-mobile", "true");
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await trigger.click();
    await expect(sidebar).toHaveAttribute("data-state", "expanded");
    await page.keyboard.press("Escape");
    await expect(sidebar).toHaveAttribute("data-state", "collapsed");
    await expect(trigger).toBeFocused();
  });

  test("stepper, file upload, and sortable list submit one native multipart workflow", async ({
    page,
  }) => {
    const card = page.getByRole("region", { name: "Backend-ready project workflow" });
    const form = card.locator("#project-workflow-form");
    const stepper = card.locator("#project-stepper");
    const next = stepper.getByRole("button", { name: "Continue" });

    await next.click();
    await expect(stepper).toHaveAttribute("data-value", "details");
    await card.getByRole("textbox", { name: "Project name" }).fill("Proof workspace");
    await next.click();
    await expect(stepper).toHaveAttribute("data-value", "assets");

    const input = card.locator('input[type="file"][name="assets"]');
    await input.setInputFiles({
      name: "proof.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("jQuery Star proof"),
    });
    await expect(card.getByText("proof.pdf")).toBeVisible();

    const handle = card.getByRole("button", { name: "Reorder Documentation" });
    await handle.focus();
    await page.keyboard.press("Space");
    await page.keyboard.press("ArrowUp");
    await page.keyboard.press("Space");
    await card.getByRole("button", { name: "Move Documentation up" }).click();
    await expect(
      form.evaluate((element) => new FormData(element as HTMLFormElement).getAll("priority")),
    ).resolves.toEqual(["docs", "design", "api"]);
    await expect(
      form.evaluate((element) => {
        const file = new FormData(element as HTMLFormElement).get("assets");
        return file instanceof File ? file.name : "";
      }),
    ).resolves.toBe("proof.pdf");

    await next.click();
    await expect(stepper).toHaveAttribute("data-value", "review");
    await card.getByRole("button", { name: "Send project" }).click();
    await expect(card.locator(".workflow-result")).toContainText("local backend received");
  });

  test("multi select, time picker, and color picker submit native preference values", async ({
    page,
  }) => {
    const card = page.getByRole("region", { name: "Native project preferences" });
    const form = card.locator("#preferences-form");
    const trigger = card.getByRole("button", { name: "Review teams" });
    await trigger.click();
    const listbox = card.getByRole("listbox", { name: "Review teams" });
    await expect(listbox).toBeFocused();
    const [triggerLeft, listboxLeft] = await Promise.all([
      trigger.evaluate((element) => element.getBoundingClientRect().left),
      listbox.evaluate((element) => element.getBoundingClientRect().left),
    ]);
    expect(Math.abs(triggerLeft - listboxLeft)).toBeLessThan(2);
    await listbox.getByRole("option", { name: "Quality assurance" }).click();
    await page.keyboard.press("Escape");
    await expect(trigger).toBeFocused();
    await expect(
      form.evaluate((element) => new FormData(element as HTMLFormElement).getAll("teams")),
    ).resolves.toEqual(["design", "backend", "qa"]);

    await card.getByRole("button", { name: "Afternoon" }).click();
    await expect(card.getByLabel("Daily review")).toHaveValue("13:30");
    await card.getByRole("button", { name: "Use color #9333ea" }).click();
    await expect(card.getByLabel("Accent color value")).toHaveValue("#9333ea");
    await expect(
      form.evaluate((element) => {
        const body = new FormData(element as HTMLFormElement);
        return { accent: body.get("accent"), time: body.get("review_time") };
      }),
    ).resolves.toEqual({ accent: "#9333ea", time: "13:30" });

    await card.getByRole("button", { name: "Save preferences" }).click();
    await expect(card.locator(".preferences-submit output")).toContainText(
      "local backend received",
    );
  });

  test("rating, messages, and message scroller preserve native feedback and reading position", async ({
    page,
  }) => {
    const card = page.getByRole("region", { name: "Backend-ready conversation" });
    const scroller = card.locator("#support-thread");
    const viewport = scroller.getByRole("log", { name: "Support" });
    const messages = viewport.locator('[data-jqs="message"]');
    await viewport.evaluate((element) => {
      element.style.maxHeight = "10rem";
      element.scrollTop = 0;
      element.dispatchEvent(new Event("scroll"));
    });
    await expect(scroller).toHaveAttribute("data-state", "paused");
    await viewport.locator(':scope > [data-part="content"]').evaluate((element) => {
      element.insertAdjacentHTML(
        "beforeend",
        '<article data-jqs="message" aria-label="Message from Server"><div data-part="content"><p>Server appended update.</p></div></article>',
      );
    });
    const latest = scroller.getByRole("button", { name: /Scroll to latest message, 1 unread/ });
    await expect(latest).toBeVisible();
    await expect(latest).toContainText("Latest (1)");
    await expect(viewport.evaluate((element) => element.scrollTop)).resolves.toBe(0);
    await latest.click();
    await expect(scroller).toHaveAttribute("data-state", "following");

    const form = card.locator("#feedback-form");
    const fourStars = card.getByRole("radio", { name: "4 stars" });
    await card.locator('#support-rating [data-part="item"]').nth(3).click();
    await expect(fourStars).toBeChecked();
    await expect(
      form.evaluate((element) => {
        const body = new FormData(element as HTMLFormElement);
        return { rating: body.get("rating"), reply: body.get("reply") };
      }),
    ).resolves.toEqual({
      rating: "4",
      reply: "Everything stayed native from browser to backend.",
    });
    const before = await messages.count();
    await card.getByRole("button", { name: "Send feedback" }).click();
    await expect(card.locator(".feedback-submit output")).toContainText("local backend received");
    await expect(messages).toHaveCount(before + 1);
    await expect(messages.last()).toContainText("4 stars · Delivered");
  });

  test("search field, items, and feed share one cursor-backed results workflow", async ({
    page,
  }) => {
    const card = page.getByRole("region", { name: "Backend results feed" });
    const form = card.getByRole("search");
    const search = card.getByRole("searchbox", { name: "Search the component landscape" });
    const feed = card.getByRole("feed", { name: "Component landscape" });
    const articles = feed.getByRole("article");

    await expect(articles).toHaveCount(3);
    await expect(articles.first()).toHaveAttribute("aria-posinset", "1");
    await expect(articles.first()).toHaveAttribute("aria-setsize", "12");
    await articles.first().focus();
    await page.keyboard.press("PageDown");
    await expect(articles.nth(1)).toBeFocused();
    await articles.nth(2).focus();
    await page.keyboard.press("PageDown");
    await expect(articles).toHaveCount(6);
    await expect(articles.nth(3)).toBeFocused();
    await expect(card.locator(".feed-backend-status")).toHaveText(
      "6 of 12 matching results loaded.",
    );

    await search.fill("web components");
    await expect(
      form.evaluate((element) => new FormData(element as HTMLFormElement).get("query")),
    ).resolves.toBe("web components");
    await form.getByRole("button", { name: "Search" }).click();
    await expect(articles).toHaveCount(2);
    await expect(feed.getByRole("article", { name: "Shoelace" })).toBeVisible();
    await expect(feed.getByRole("article", { name: "Lit" })).toBeVisible();
    await expect(card.getByRole("button", { name: "Load more results" })).toBeHidden();

    const clear = form.getByRole("button", { name: "Clear" });
    await clear.click();
    await expect(search).toHaveValue("");
    await expect(search).toBeFocused();
  });

  test("questionnaire, attachment, and bubble create one backend-ready brief", async ({ page }) => {
    const card = page.getByRole("region", { name: "Agent clarification workflow" });
    const form = card.locator("#component-questionnaire-form");
    const questionnaire = card.locator("#component-questionnaire");
    const next = card.getByRole("button", { name: "Next" });

    await expect(card.locator('[data-jqs="attachment"]')).toContainText("component-contract.pdf");
    await next.click();
    await expect(card.getByText("Choose an answer to continue.")).toBeVisible();
    await expect(questionnaire).toHaveAttribute("data-value", "direction");

    const workflow = card.getByRole("radio", { name: /Workflow/ });
    await workflow.focus();
    await page.keyboard.press("2");
    await expect(workflow).toBeChecked();
    await next.click();
    await expect(questionnaire).toHaveAttribute("data-value", "constraints");

    await card
      .locator('[data-value="constraints"] [data-part="choice"]')
      .filter({ hasText: "Accessible" })
      .click();
    await card
      .locator('[data-value="constraints"] [data-part="choice"]')
      .filter({ hasText: "Server-ready" })
      .click();
    await expect(
      form.evaluate((element) => new FormData(element as HTMLFormElement).getAll("constraints")),
    ).resolves.toEqual(["accessible", "server-ready"]);
    await next.click();
    await card
      .locator('[data-value="delivery"] [data-part="choice"]')
      .filter({ hasText: "Source-owned recipe" })
      .click();

    await expect(
      form.evaluate((element) => Object.fromEntries(new FormData(element as HTMLFormElement))),
    ).resolves.toEqual({
      constraints: "server-ready",
      delivery: "source",
      direction: "workflow",
    });
    await card.getByRole("button", { name: "Create brief" }).click();
    await expect(card.locator(".questionnaire-result-stack > output")).toContainText(
      "local backend received",
    );
    const result = card.getByRole("article", { name: "Message from Build agent" });
    await expect(result).toBeVisible();
    await expect(result.locator('[data-jqs="bubble"]')).toContainText(
      "Build workflow with accessible and server-ready constraints, delivered as source.",
    );
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

  test("calendar and date forms compose keyboard behavior with native values", async ({ page }) => {
    const card = page.getByRole("region", { name: "Calendar and date forms" });
    const calendar = page.locator("#release-calendar");
    const selected = calendar.getByRole("button", { name: "Friday, August 28, 2026" });

    await expect(calendar.getByRole("grid", { name: "August 2026" })).toBeVisible();
    await expect(selected).toHaveAttribute("data-state", "selected");
    await selected.focus();
    await page.keyboard.press("ArrowRight");
    await expect(calendar.getByRole("button", { name: "Saturday, August 29, 2026" })).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(calendar.getByRole("button", { name: "Monday, August 31, 2026" })).toBeFocused();

    const picker = page.locator("#component-date-picker");
    const control = picker.getByRole("textbox", { name: "Delivery date" });
    const trigger = picker.locator(':scope > [data-part="popover"] > [data-part="trigger"]');
    await expect(trigger).toHaveAttribute("aria-label", /Friday, August 28, 2026/);
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Delivery date calendar" });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Friday, August 28, 2026" })).toBeFocused();
    await dialog.getByRole("button", { name: "Monday, August 31, 2026" }).click();
    await expect(control).toHaveValue("2026-08-31");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();
    await expect(page.locator(".date-form-preview")).toContainText("Delivery 2026-08-31");

    const meter = card.getByRole("meter", { name: /Storage used/ });
    await expect(meter).toHaveAttribute("value", "68");
    await card.getByRole("button", { name: "Add" }).click();
    await expect(meter).toHaveAttribute("value", "78");
    await card.getByRole("combobox", { name: "Timezone" }).selectOption("europe-london");
    await expect(page.locator(".date-form-preview")).toContainText("europe-london");
  });

  test("date ranges and backend validation retain native form contracts", async ({ page }) => {
    const card = page.getByRole("region", { name: "Date ranges and backend-ready forms" });
    const calendar = page.locator("#component-range-calendar");
    await expect(calendar.locator('[data-value="2026-08-28"]')).toHaveAttribute(
      "data-state",
      "range-start",
    );
    await expect(calendar.locator('[data-value="2026-08-29"]')).toHaveAttribute(
      "data-state",
      "in-range",
    );
    await calendar.locator('[data-value="2026-09-01"]').click();
    await expect(calendar).toHaveAttribute("data-start", "2026-09-01");
    await expect(calendar).not.toHaveAttribute("data-end");
    await calendar.locator('[data-value="2026-09-02"]').click();
    await expect(calendar).toHaveAttribute("data-end", "2026-09-02");
    await expect(calendar.locator('[data-part="status"]')).toContainText("Range selected");

    const picker = page.locator("#component-range-picker");
    const start = picker.getByRole("textbox", { name: "Travel dates" });
    const end = picker.getByRole("textbox", { name: "Travel end date" });
    const trigger = picker.locator(':scope > [data-part="popover"] > [data-part="trigger"]');
    await trigger.click();
    const dialog = page.getByRole("dialog", { name: "Travel date range calendar" });
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-value="2026-08-29"]').click();
    await expect(start).toHaveValue("2026-08-29");
    await expect(end).toHaveValue("");
    await expect(dialog).toBeVisible();
    await dialog.locator('[data-value="2026-08-31"]').click();
    await expect(end).toHaveValue("2026-08-31");
    await expect(dialog).toBeHidden();
    await expect(trigger).toBeFocused();

    const form = card.getByRole("form", { name: "Backend account proof" });
    const email = form.getByRole("textbox", { name: "Account email" });
    await form.getByRole("button", { name: "Send multipart form" }).click();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(form.locator('[data-part="message"]')).toContainText("already exists");
    await expect(page.locator(".backend-form-status")).toContainText("422 response");

    await email.fill("available@example.com");
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await form.getByRole("button", { name: "Send multipart form" }).click();
    await expect(page.locator(".backend-form-status")).toContainText(
      "local backend accepted the multipart form",
    );
  });

  test("validated forms and composed surfaces retain native behavior", async ({ page }) => {
    const card = page.getByRole("region", { name: "Validated forms and composed surfaces" });
    const form = card.getByRole("form", { name: "Profile proof" });
    const email = form.getByRole("textbox", { name: "Work email" });
    const site = form.getByRole("textbox", { name: "Project site" });

    await form.getByRole("button", { name: "Validate profile" }).click();
    await expect(email).toBeFocused();
    await expect(email).toHaveAttribute("aria-invalid", "true");
    await expect(site).toHaveAttribute("aria-invalid", "true");
    await expect(form.locator('[data-part="message"]:not([hidden])')).toHaveCount(2);

    await email.fill("proof@example.com");
    await site.fill("jqstar");
    await expect(email).not.toHaveAttribute("aria-invalid", "true");
    await expect(site).not.toHaveAttribute("aria-invalid", "true");
    await form.getByRole("button", { name: "Validate profile" }).click();
    await expect(form.getByRole("status")).toHaveText("Profile is valid and ready to submit.");
    await expect(form.getByLabel("Reference files")).toHaveAttribute("multiple", "");

    const hoverCard = page.locator("#maintainer-hover-card");
    const hoverTrigger = hoverCard.getByRole("link", { name: "Preview maintainer" });
    const hoverContent = hoverCard.locator(':scope > [data-part="content"]');
    await hoverTrigger.focus();
    await expect(hoverContent).toBeVisible();
    await page.keyboard.press("Tab");
    await expect(hoverContent.getByRole("link", { name: "View component system" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(hoverContent).toBeHidden();
    await expect(hoverTrigger).toBeFocused();

    const alertTrigger = card.getByRole("button", { name: "Open alert dialog" });
    const alertDialog = page.getByRole("alertdialog", { name: "Delete the draft?" });
    await alertTrigger.click();
    await expect(alertDialog).toBeVisible();
    await expect(alertDialog.getByRole("button", { name: "Keep draft" })).toBeFocused();
    await page.keyboard.press("Escape");
    await expect(alertDialog).toBeHidden();
    await expect(alertTrigger).toBeFocused();

    const drawerTrigger = card.getByRole("button", { name: "Open bottom drawer" });
    const drawer = page.getByRole("dialog", { name: "Backend connection" });
    await drawerTrigger.click();
    await expect(drawer).toBeVisible();
    await expect(drawer).toHaveCSS("position", "fixed");
    await expect(drawer.getByRole("button", { name: "Close drawer" })).toBeFocused();
    await drawer.getByRole("button", { name: "Close drawer" }).click();
    await expect(drawer).toBeHidden();
    await expect(drawerTrigger).toBeFocused();
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
    await expect(visibleRows.nth(0)).toContainText("jQuery Star");
    await expect(visibleRows.nth(1)).toContainText("daisyUI");

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
      "90",
    );
  });

  test("reporting primitives share native data with the backend chart", async ({ page }) => {
    const card = page.getByRole("region", { name: "Backend reporting primitives" });
    const chart = card.locator("#release-metrics-chart");
    const data = chart.locator('table[data-part="data"]');

    await expect(chart.locator('[data-part="bar"]')).toHaveCount(8);
    await expect(data.locator("caption")).toHaveText("Weekly component adoption by runtime");
    await expect(data.locator("tbody tr").first().locator("td").first()).toHaveText("186");

    await card.getByRole("button", { name: "Line", exact: true }).click();
    await expect(chart).toHaveAttribute("data-type", "line");
    await expect(chart.locator('[data-part="line"]')).toHaveCount(2);
    await expect(chart.locator('[data-part="point"]')).toHaveCount(8);

    await card.getByRole("button", { name: "Refresh from backend" }).click();
    await expect(data.locator("tbody tr").first().locator("td").first()).not.toHaveText("186");
    await expect(card.locator(".metrics-message")).toContainText("local backend patched four");
    await expect(card.locator("#metrics-status-marker")).toContainText("Backend data applied");

    await expect(card.locator('[data-jqs="direction"]')).toHaveAttribute("dir", "rtl");
    await expect(card.locator('[data-jqs="direction"]')).toHaveCSS("direction", "rtl");
    await expect(card.getByRole("table", { name: "Release proof" })).toBeVisible();
    await expect(card.locator('[data-jqs="aspect-ratio"]')).toHaveCSS("aspect-ratio", "16 / 9");
  });

  test("operations components update from the shared backend and copy exact JSON", async ({
    page,
    context,
  }) => {
    await context.grantPermissions(["clipboard-read", "clipboard-write"]);
    const card = page.getByRole("region", { name: "Self-hosting operations console" });
    const payload = card.locator("#operations-payload");
    const diff = card.locator("#operations-diff");
    const control = diff.getByRole("slider", { name: "Compare configuration before and after" });

    await expect(card.locator('[data-jqs="stat"]')).toHaveCount(3);
    await expect(card.locator('#operations-timeline [data-part="item"]')).toHaveCount(3);
    await expect(card.getByText("200 Healthy")).toBeVisible();

    await card.getByRole("button", { name: "Refresh operations" }).click();
    await expect(card.locator(".operations-message")).toContainText(
      "Local backend operations revision",
    );
    await expect(payload.locator('[data-part="code"]')).toContainText('"revision": 1');
    await expect(card.locator("#operations-timeline [data-state='current'] strong")).toHaveText(
      "Operations revision 1",
    );

    await payload.getByRole("button", { name: "Copy JSON" }).click();
    await expect(payload.locator('[data-part="status"]')).toHaveText("Copied to clipboard.");
    await expect
      .poll(() => page.evaluate(() => navigator.clipboard.readText()))
      .toContain('"components": 90');

    await control.focus();
    await page.keyboard.press("ArrowRight");
    await expect(control).toHaveValue("51");
    await expect
      .poll(() => diff.evaluate((element) => element.style.getPropertyValue("--jqs-diff-position")))
      .toBe("51%");
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

  test("capable form fields pass accessibility checks after interaction", async ({ page }) => {
    const card = page.locator(".advanced-fields-card");
    await card.getByRole("button", { name: "Show password" }).click();
    const tags = card.getByRole("textbox", { name: "Project tags" });
    await tags.fill("accessibility");
    await tags.press("Enter");
    const results = await new AxeBuilder({ page }).include(".advanced-fields-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("OTP and resizable layout pass accessibility checks after interaction", async ({ page }) => {
    const card = page.locator(".layout-primitives-card");
    await card.getByRole("textbox", { name: "Verification code", exact: true }).fill("123456");
    const splitter = card.getByRole("separator", { name: "Resize project navigation" });
    await splitter.focus();
    await page.keyboard.press("ArrowRight");
    const results = await new AxeBuilder({ page }).include(".layout-primitives-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("application interaction components pass accessibility checks in open states", async ({
    page,
  }) => {
    const card = page.locator(".application-components-card");
    let results = await new AxeBuilder({ page }).include(".application-components-card").analyze();
    expect(results.violations).toEqual([]);

    await card.locator('[data-jqs="context-menu"] > [data-part="trigger"]').click({
      button: "right",
      position: { x: 60, y: 40 },
    });
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include(".application-components-card").analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");

    await card.getByRole("menuitem", { name: "File", exact: true }).press("ArrowDown");
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    results = await new AxeBuilder({ page }).include(".application-components-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("responsive workspace components pass accessibility checks after interaction", async ({
    page,
  }) => {
    const card = page.locator(".workspace-components-card");
    await card.getByRole("button", { name: "Focus mode" }).click();
    await card.getByRole("button", { name: "Next slide" }).click();
    await card.evaluate(async (element) => {
      await Promise.allSettled(
        element.getAnimations({ subtree: true }).map((animation) => animation.finished),
      );
    });
    let results = await new AxeBuilder({ page }).include(".workspace-components-card").analyze();
    expect(results.violations).toEqual([]);

    await page.setViewportSize({ width: 390, height: 844 });
    await card.locator('#component-sidebar [data-part="trigger"]').click();
    results = await new AxeBuilder({ page }).include(".workspace-components-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("backend-ready workflow passes accessibility checks in active states", async ({ page }) => {
    const card = page.locator(".workflow-components-card");
    let results = await new AxeBuilder({ page }).include(".workflow-components-card").analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("textbox", { name: "Project name" }).fill("Accessible project");
    await card.getByRole("button", { name: "Continue" }).click();
    await card.locator('input[type="file"]').setInputFiles({
      name: "accessible.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("accessible proof"),
    });
    results = await new AxeBuilder({ page }).include(".workflow-components-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("native project preferences pass accessibility checks with the listbox open", async ({
    page,
  }) => {
    const card = page.locator(".preferences-components-card");
    let results = await new AxeBuilder({ page }).include(".preferences-components-card").analyze();
    expect(results.violations).toEqual([]);
    await card.getByRole("button", { name: "Review teams" }).click();
    results = await new AxeBuilder({ page }).include(".preferences-components-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("conversation and native rating pass accessibility checks with unread messages", async ({
    page,
  }) => {
    const card = page.locator(".conversation-components-card");
    const viewport = card.getByRole("log", { name: "Support" });
    await viewport.evaluate((element) => {
      element.style.maxHeight = "10rem";
      element.scrollTop = 0;
      element.dispatchEvent(new Event("scroll"));
    });
    await viewport.locator(':scope > [data-part="content"]').evaluate((element) => {
      element.insertAdjacentHTML(
        "beforeend",
        '<article data-jqs="message" aria-label="Message from Server"><div data-part="content"><p>Server appended update.</p></div></article>',
      );
    });
    await expect(card.getByRole("button", { name: /1 unread/ })).toBeVisible();
    const results = await new AxeBuilder({ page })
      .include(".conversation-components-card")
      .analyze();
    expect(results.violations).toEqual([]);
  });

  test("search and dynamic feed pass accessibility checks before and after a backend page", async ({
    page,
  }) => {
    const card = page.locator(".feed-components-card");
    let results = await new AxeBuilder({ page }).include(".feed-components-card").analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("button", { name: "Load more results" }).click();
    await expect(card.getByRole("article")).toHaveCount(6);
    results = await new AxeBuilder({ page }).include(".feed-components-card").analyze();
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

  test("questionnaire workflow passes accessibility checks before and after submission", async ({
    page,
  }) => {
    const card = page.locator(".questionnaire-components-card");
    let results = await new AxeBuilder({ page })
      .include(".questionnaire-components-card")
      .analyze();
    expect(results.violations).toEqual([]);

    await card
      .locator('[data-value="direction"] [data-part="choice"]')
      .filter({ hasText: "Workflow" })
      .click();
    await card.getByRole("button", { name: "Next" }).click();
    await card
      .locator('[data-value="constraints"] [data-part="choice"]')
      .filter({ hasText: "Accessible" })
      .click();
    await card.getByRole("button", { name: "Next" }).click();
    await card
      .locator('[data-value="delivery"] [data-part="choice"]')
      .filter({ hasText: "Source-owned recipe" })
      .click();
    await card.getByRole("button", { name: "Create brief" }).click();
    await expect(card.getByRole("article", { name: "Message from Build agent" })).toBeVisible();

    results = await new AxeBuilder({ page }).include(".questionnaire-components-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("calendar and date forms pass accessibility checks when closed and open", async ({
    page,
  }) => {
    const card = page.locator(".calendar-component-card");
    const waitForAnimations = async (): Promise<void> => {
      await card.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };
    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include(".calendar-component-card").analyze();
    expect(results.violations).toEqual([]);

    await page.locator('#component-date-picker [data-part="trigger"]').click();
    await expect(page.getByRole("dialog", { name: "Delivery date calendar" })).toBeVisible();
    await waitForAnimations();
    results = await new AxeBuilder({ page }).include(".calendar-component-card").analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");
    await expect(card.getByRole("textbox", { name: "Delivery date" })).toBeVisible();
  });

  test("range and backend form states pass accessibility checks", async ({ page }) => {
    const card = page.locator(".range-backend-card");
    const waitForAnimations = async (): Promise<void> => {
      await card.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };
    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include(".range-backend-card").analyze();
    expect(results.violations).toEqual([]);

    await page.locator('#component-range-picker [data-part="trigger"]').click();
    await expect(page.getByRole("dialog", { name: "Travel date range calendar" })).toBeVisible();
    await waitForAnimations();
    results = await new AxeBuilder({ page }).include(".range-backend-card").analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");

    await card.getByRole("button", { name: "Send multipart form" }).click();
    await expect(card.getByRole("textbox", { name: "Account email" })).toHaveAttribute(
      "aria-invalid",
      "true",
    );
    results = await new AxeBuilder({ page }).include(".range-backend-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("validated forms and composed surfaces pass accessibility checks in visible states", async ({
    page,
  }) => {
    const card = page.locator(".form-surfaces-card");
    const waitForAnimations = async (target = card): Promise<void> => {
      await target.evaluate(async (element) => {
        await Promise.allSettled(
          element.getAnimations({ subtree: true }).map((animation) => animation.finished),
        );
      });
    };
    await waitForAnimations();
    let results = await new AxeBuilder({ page }).include(".form-surfaces-card").analyze();
    expect(results.violations).toEqual([]);

    await page.getByRole("link", { name: "Preview maintainer" }).focus();
    const hoverContent = page.locator('#maintainer-hover-card > [data-part="content"]');
    await expect(hoverContent).toBeVisible();
    await waitForAnimations(hoverContent);
    results = await new AxeBuilder({ page }).include(".form-surfaces-card").analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");

    await card.getByRole("button", { name: "Open alert dialog" }).click();
    const alertDialog = page.getByRole("alertdialog", { name: "Delete the draft?" });
    await waitForAnimations(alertDialog);
    results = await new AxeBuilder({ page }).include("#delete-alert-dialog").analyze();
    expect(results.violations).toEqual([]);
    await page.keyboard.press("Escape");

    await card.getByRole("button", { name: "Open bottom drawer" }).click();
    const drawer = page.getByRole("dialog", { name: "Backend connection" });
    await waitForAnimations(drawer);
    results = await new AxeBuilder({ page }).include("#proof-drawer").analyze();
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

  test("reporting primitives pass accessibility checks before and after refresh", async ({
    page,
  }) => {
    const card = page.locator(".reporting-components-card");
    let results = await new AxeBuilder({ page }).include(".reporting-components-card").analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("button", { name: "Line", exact: true }).click();
    await card.getByRole("button", { name: "Refresh from backend" }).click();
    results = await new AxeBuilder({ page }).include(".reporting-components-card").analyze();
    expect(results.violations).toEqual([]);
  });

  test("operations components pass accessibility checks before and after backend updates", async ({
    page,
  }) => {
    const card = page.locator(".operations-components-card");
    let results = await new AxeBuilder({ page }).include(".operations-components-card").analyze();
    expect(results.violations).toEqual([]);

    await card.getByRole("button", { name: "Refresh operations" }).click();
    await card.getByRole("slider", { name: "Compare configuration before and after" }).focus();
    await page.keyboard.press("ArrowRight");
    results = await new AxeBuilder({ page }).include(".operations-components-card").analyze();
    expect(results.violations).toEqual([]);
  });
});

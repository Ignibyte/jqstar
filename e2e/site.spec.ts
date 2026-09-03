import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { installWebMcpHarness } from "./fixtures/webmcp-harness";

const documentationRoutes = [
  ["/docs/", "Introduction"],
  ["/docs/agents/", "Agent support"],
  ["/docs/datastar/", "Datastar Integration"],
  ["/docs/api/", "Core API"],
  ["/docs/csp/", "CSP expressions"],
  ["/docs/interoperability/", "Turbo and htmx interoperability"],
  ["/docs/ecosystem/", "jQuery ecosystem"],
  ["/docs/plugins/", "Plugins"],
  ["/docs/testing/", "Testing"],
  ["/docs/components/", "Components"],
  ["/docs/components/dialog/", "Dialog"],
  ["/docs/components/dropdown/", "Dropdown"],
  ["/docs/components/tabs/", "Tabs"],
  ["/docs/components/toast/", "Toast"],
] as const;

test("website reproduces the supplied jQStar home and remains self-hosted", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");
  await expect(page).toHaveTitle(/jQStar · modern server-rendered applications/);
  await expect(
    page.getByRole("heading", { name: "Polished UI behavior for Datastar applications." }),
  ).toBeVisible();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.evaluate(() => document.fonts.ready);
  const referenceGeometry = await page.evaluate(() => {
    const box = (selector: string) => {
      const bounds = document.querySelector(selector)?.getBoundingClientRect();
      if (!bounds) throw new Error(`Missing reference selector: ${selector}`);
      return { height: bounds.height, left: bounds.left, top: bounds.top, width: bounds.width };
    };
    return {
      band: box(".home-feature-band"),
      brand: box(".brand"),
      cards: [...document.querySelectorAll(".feature-card")].map((card) => {
        const bounds = card.getBoundingClientRect();
        return { left: bounds.left, width: bounds.width };
      }),
      headingFont: getComputedStyle(document.querySelector(".hero h1")!).fontFamily,
      hero: box(".hero"),
    };
  });
  expect(referenceGeometry.brand.left).toBe(104);
  expect(referenceGeometry.hero.top).toBe(64);
  expect(Math.abs(referenceGeometry.hero.height - 606.4)).toBeLessThanOrEqual(0.02);
  expect(Math.abs(referenceGeometry.band.top - 670.390625)).toBeLessThanOrEqual(1);
  expect(referenceGeometry.headingFont).toContain("Audiowide");
  expect(referenceGeometry.cards).toHaveLength(3);
  expect(referenceGeometry.cards[0]?.left).toBe(104);
  expect(referenceGeometry.cards[0]?.width).toBeGreaterThan(380);
  await expect(page.getByRole("heading", { name: "No Build Step Required" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Built for Datastar" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "HTML is the API" })).toBeVisible();
  await expect(page.locator(".promise-card").first().getByRole("listitem")).toHaveCount(7);
  await expect(page.locator(".promise-card").last().getByRole("listitem")).toHaveCount(7);
  await expect(page.getByText("$ is real jQuery.", { exact: false })).toBeVisible();
  await expect(page.locator("#root")).toHaveCount(0);

  const axe = await new AxeBuilder({ page }).include("main").analyze();
  expect(axe.violations).toEqual([]);

  await page.goto("/docs/");
  const initialTheme = await page.locator("html").getAttribute("data-theme");
  await page.getByRole("button", { name: "Toggle color theme" }).click();
  await expect(page.locator("html")).not.toHaveAttribute("data-theme", initialTheme ?? "dark");
  const changedTheme = await page.locator("html").getAttribute("data-theme");
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", changedTheme ?? "light");
});

test("every documentation route loads directly with shared navigation", async ({ page }) => {
  for (const [path, heading] of documentationRoutes) {
    await page.goto(path);
    await expect(page.getByRole("heading", { name: heading, level: 1 })).toBeVisible();
    await expect(
      page.getByRole("navigation", { name: "Documentation", exact: true }),
    ).toBeVisible();
    await expect(page.locator('[data-doc-link][aria-current="page"]')).toHaveCount(1);
  }
});

test("the CSP guide keeps its shipped status and narrow security claim explicit", async ({
  page,
}) => {
  await page.goto("/docs/csp/");

  await expect(page.locator(".docs-lede")).toContainText("jqstar-csp-expression/1");
  await expect(page.locator(".docs-lede")).toContainText("explicit installer");
  await expect(page.locator(".docs-lede")).toContainText("strict-policy browser proof");
  const boundary = page.locator(".docs-callout");
  await expect(boundary).toContainText("no dynamic code construction");
  await expect(boundary).toContainText("trusted markup and trusted installed extensions");
  await expect(boundary).toContainText("not a sandbox");
  await expect(
    page.getByText("The page policy—not jQStar—governs", { exact: false }),
  ).toBeVisible();
  await expect(page.getByRole("cell", { name: "console.log($count)" })).toBeVisible();
  await expect(page.getByRole("cell", { name: "$(el).datepicker()" })).toBeVisible();

  const axe = await new AxeBuilder({ page }).include("main").analyze();
  expect(axe.violations).toEqual([]);
});

test("documentation search and mobile navigation use jQStar dialogs", async ({ page }) => {
  await page.goto("/docs/components/dialog/");
  const searchTrigger = page.getByRole("button", { name: /Search documentation/ });
  await searchTrigger.click();
  const search = page.getByRole("dialog", { name: "Search documentation" });
  await expect(search).toBeVisible();
  const input = search.getByRole("searchbox", { name: "Search documentation" });
  await expect(input).toBeFocused();
  await input.fill("toast");
  await expect(search.getByRole("link", { name: "Toast" })).toBeVisible();
  await expect(search.getByRole("link", { name: "Dialog" })).toBeHidden();
  await page.keyboard.press("Escape");
  await expect(searchTrigger).toBeFocused();

  await page.setViewportSize({ width: 390, height: 844 });
  const menuTrigger = page.getByRole("button", { name: "Menu" });
  await menuTrigger.click();
  const mobile = page.getByRole("dialog", { name: "Documentation" });
  await expect(mobile).toBeVisible();
  await expect(mobile.getByRole("link", { name: "Core API" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(menuTrigger).toBeFocused();

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);
  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

test("component guides run the documented jQStar behavior", async ({ page }) => {
  await page.goto("/docs/components/dialog/");
  const dialogTrigger = page.getByRole("button", { name: "Edit Profile" });
  await dialogTrigger.click();
  const dialog = page.getByRole("dialog", { name: "Edit profile" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "Cancel" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialogTrigger).toBeFocused();

  await page.goto("/docs/components/dropdown/");
  await page.getByRole("button", { name: "Project actions" }).click();
  await expect(page.getByRole("menuitem", { name: "Edit project" })).toBeFocused();
  await page.keyboard.press("End");
  await expect(page.getByRole("menuitem", { name: "Delete permanently" })).toBeFocused();
  await page.keyboard.press("Escape");

  await page.goto("/docs/components/tabs/");
  const settings = page.locator("#docs-settings-tabs");
  await settings.getByRole("tab", { name: "Security" }).click();
  await expect(settings.getByRole("tabpanel", { name: "Security" })).toBeVisible();

  await page.goto("/docs/components/toast/");
  await page.getByRole("button", { name: "Show notification" }).click();
  await expect(page.getByText("Build verified", { exact: true })).toBeVisible();
  await expect(page.getByText("All component checks passed.", { exact: true })).toBeVisible();
});

test("mobile dialog documentation matches the supplied reference frame", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/docs/components/dialog/");
  await page.evaluate(() => document.fonts.ready);
  const geometry = await page.evaluate(() => {
    const article = document.querySelector(".docs-article")!.getBoundingClientRect();
    const header = document.querySelector(".site-header")!.getBoundingClientRect();
    const preview = document.querySelector(".component-preview")!.getBoundingClientRect();
    return {
      article: { left: article.left, width: article.width },
      header: { height: header.height, top: header.top },
      preview: { height: preview.height, left: preview.left, width: preview.width },
    };
  });
  expect(geometry.header).toEqual({ height: 64, top: 0 });
  expect(geometry.article).toEqual({ left: 24, width: 342 });
  expect(geometry.preview.left).toBe(24);
  expect(geometry.preview.width).toBe(342);
  expect(geometry.preview.height).toBeGreaterThanOrEqual(340);
  await expect(
    page.getByText(
      "A modal window that interrupts the user with important content and expects a response.",
    ),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "API Reference" })).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth - innerWidth),
  ).toBeLessThanOrEqual(1);
});

test("site copy controls expose authored source", async ({ page }) => {
  await page.addInitScript(() => {
    let value = "";
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        readText: () => Promise.resolve(value),
        writeText: (next: string) => {
          value = next;
          return Promise.resolve();
        },
      },
    });
  });
  await page.goto("/docs/");
  const firstCopy = page.locator(".code-block button").first();
  await firstCopy.click();
  await expect(firstCopy).toHaveText("Copied");
  const clipboard = await page.evaluate(() => navigator.clipboard.readText());
  expect(clipboard).toBe("npm install jquery-star jquery");
});

test("every public route registers the read-only WebMCP catalog through the draft boundary", async ({
  page,
}) => {
  await installWebMcpHarness(page);
  const routes = ["/", ...documentationRoutes.map(([path]) => path), "/components/lab/"];
  for (const route of routes) {
    await page.goto(route);
    await expect
      .poll(() => page.evaluate(() => window.__jqstarWebMcpHarness.tools().map(({ name }) => name)))
      .toEqual([
        "get_jqstar_page",
        "search_jqstar_docs",
        "read_jqstar_guide",
        "get_jqstar_component",
        "get_jqstar_example",
      ]);
  }
  const catalog = await page.evaluate(() => window.__jqstarWebMcpHarness.tools());
  for (const tool of catalog) {
    expect(tool.annotations).toEqual({ readOnlyHint: true, untrustedContentHint: false });
    expect(tool.inputSchema).toMatchObject({ type: "object", additionalProperties: false });
  }
});

test("the WebMCP harness invokes source-backed tools with citations and cancellation", async ({
  page,
}) => {
  await installWebMcpHarness(page);
  await page.goto("/docs/agents/");
  await expect.poll(() => page.evaluate(() => window.__jqstarWebMcpHarness.tools().length)).toBe(5);

  const current = await page.evaluate(() =>
    window.__jqstarWebMcpHarness.execute("get_jqstar_page", {}),
  );
  expect(current).toMatchObject({
    schema: "jqstar-webmcp-result/1",
    citations: ["https://ignibyte.github.io/jqstar/docs/agents/"],
    result: { id: "agent-support" },
  });

  const search = await page.evaluate(() =>
    window.__jqstarWebMcpHarness.execute("search_jqstar_docs", {
      query: "official Datastar SDK",
      limit: 3,
    }),
  );
  expect(search).toMatchObject({
    result: expect.arrayContaining([
      expect.objectContaining({ canonicalUrl: "https://ignibyte.github.io/jqstar/docs/datastar/" }),
    ]),
  });

  const component = await page.evaluate(() =>
    window.__jqstarWebMcpHarness.execute("get_jqstar_component", { name: "dialog" }),
  );
  expect(component).toMatchObject({
    citations: ["https://ignibyte.github.io/jqstar/docs/components/dialog/"],
    result: { name: "dialog", parts: expect.arrayContaining(["content", "title"]) },
  });
  await expect(
    page.evaluate(() =>
      window.__jqstarWebMcpHarness.execute("get_jqstar_example", { id: "install-package" }, true),
    ),
  ).rejects.toThrow(/Cancelled by harness/);

  const axe = await new AxeBuilder({ page }).analyze();
  expect(axe.violations).toEqual([]);
});

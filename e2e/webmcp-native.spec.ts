import { expect, test } from "@playwright/test";

type NativeTool = {
  name: string;
  origin: string;
};

type NativeModelContext = {
  executeTool(tool: NativeTool, input: string): Promise<string>;
  getTools(): Promise<NativeTool[]>;
};

test("@webmcp-native Chromium registers and executes the real WebMCP contract", async ({
  browser,
  page,
}) => {
  await page.goto("/docs/agents/");
  await expect(page.getByRole("heading", { name: "Agent support" })).toBeVisible();

  const capability = await page.evaluate(() => ({
    modelContext: typeof document.modelContext,
    originAgentCluster: window.originAgentCluster,
    secureContext: window.isSecureContext,
  }));
  expect(capability).toEqual({
    modelContext: "object",
    originAgentCluster: true,
    secureContext: true,
  });

  await expect
    .poll(() =>
      page.evaluate(async () => {
        const context = document.modelContext as unknown as NativeModelContext;
        return (await context.getTools()).map(({ name }) => name);
      }),
    )
    .toEqual([
      "get_jqstar_component",
      "get_jqstar_example",
      "get_jqstar_page",
      "read_jqstar_guide",
      "search_jqstar_docs",
    ]);

  const result = await page.evaluate(async () => {
    const context = document.modelContext as unknown as NativeModelContext;
    const selected = (await context.getTools()).find(({ name }) => name === "get_jqstar_component");
    if (!selected) throw new Error("The native component tool is not registered.");
    return JSON.parse(await context.executeTool(selected, JSON.stringify({ name: "dialog" })));
  });
  expect(result).toMatchObject({
    schema: "jqstar-webmcp-result/1",
    citations: ["https://ignibyte.github.io/jqstar/docs/components/dialog/"],
    result: { name: "dialog", parts: expect.arrayContaining(["content", "title"]) },
  });
  expect(Number.parseInt(browser.version(), 10)).toBeGreaterThanOrEqual(146);
});

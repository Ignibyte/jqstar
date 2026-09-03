import type { Page } from "@playwright/test";

type WebMcpHarnessTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: boolean;
    untrustedContentHint: boolean;
  };
};

export async function installWebMcpHarness(page: Page): Promise<void> {
  await page.addInitScript(() => {
    type Tool = WebMcpHarnessTool & {
      execute(input: Record<string, unknown>, options: { signal: AbortSignal }): Promise<unknown>;
    };
    const tools = new Map<string, Tool>();
    const context = {
      async registerTool(tool: Tool, options?: { signal?: AbortSignal }) {
        if (tools.has(tool.name)) throw new DOMException("The tool name is already registered.");
        tools.set(tool.name, tool);
        options?.signal?.addEventListener("abort", () => tools.delete(tool.name), { once: true });
      },
    };
    Object.defineProperty(Document.prototype, "modelContext", {
      configurable: true,
      get: () => context,
    });
    Object.defineProperty(window, "__jqstarWebMcpHarness", {
      configurable: true,
      value: {
        tools() {
          return [...tools.values()].map(
            ({ name, title, description, inputSchema, annotations }) => ({
              name,
              title,
              description,
              inputSchema,
              annotations,
            }),
          );
        },
        execute(name: string, input: Record<string, unknown>, cancelled = false) {
          const selected = tools.get(name);
          if (!selected) throw new DOMException("The tool is not registered.", "NotFoundError");
          const controller = new AbortController();
          if (cancelled) controller.abort(new DOMException("Cancelled by harness.", "AbortError"));
          return selected.execute(input, { signal: controller.signal });
        },
      },
    });
  });
}

declare global {
  interface Window {
    __jqstarWebMcpHarness: {
      tools(): WebMcpHarnessTool[];
      execute(name: string, input: Record<string, unknown>, cancelled?: boolean): Promise<unknown>;
    };
  }
}

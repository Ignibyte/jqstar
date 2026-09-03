import { type AgentContent, loadAgentContent } from "./agent-content";

type ToolInput = Record<string, unknown>;

type ToolExecuteOptions = {
  signal: AbortSignal;
};

type WebMcpTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: {
    readOnlyHint: true;
    untrustedContentHint: false;
  };
  execute(input: ToolInput, options?: ToolExecuteOptions): Promise<unknown>;
};

type WebMcpContext = {
  registerTool(tool: WebMcpTool, options?: { signal?: AbortSignal }): void | Promise<void>;
};

declare global {
  interface Document {
    readonly modelContext?: WebMcpContext;
  }
}

const registrations = new WeakMap<Document, AbortController>();
const uncancelledSignal = new AbortController().signal;
const resultSchema = "jqstar-webmcp-result/1";
const annotations = Object.freeze({
  readOnlyHint: true as const,
  untrustedContentHint: false as const,
});

function abortReason(signal: AbortSignal): unknown {
  return signal.reason ?? new DOMException("The WebMCP tool call was cancelled.", "AbortError");
}

async function cancellationPoint(signal: AbortSignal): Promise<void> {
  if (signal.aborted) throw abortReason(signal);
  await Promise.resolve();
  if (signal.aborted) throw abortReason(signal);
}

function executionSignal(options?: ToolExecuteOptions): AbortSignal {
  return options?.signal ?? uncancelledSignal;
}

function inputObject(input: unknown, allowedKeys: readonly string[]): ToolInput {
  if (typeof input !== "object" || input === null || Array.isArray(input)) {
    throw new TypeError("Tool input must be an object.");
  }
  const keys = Reflect.ownKeys(input);
  if (keys.some((key) => typeof key !== "string" || !allowedKeys.includes(key))) {
    throw new TypeError("Tool input contains an unknown property.");
  }
  return input as ToolInput;
}

function requiredString(input: ToolInput, key: string, allowed: readonly string[]): string {
  const value = input[key];
  if (typeof value !== "string" || !allowed.includes(value)) {
    throw new TypeError(`${key} must be one of the documented stable identifiers.`);
  }
  return value;
}

function searchInput(
  input: unknown,
  limits: AgentContent["limits"],
): { query: string; limit: number } {
  const object = inputObject(input, ["query", "limit"]);
  const query = object.query;
  if (
    typeof query !== "string" ||
    query.trim().length === 0 ||
    query.length > limits.queryCharacters
  ) {
    throw new TypeError(`query must contain 1 to ${String(limits.queryCharacters)} characters.`);
  }
  const limit = object.limit ?? limits.searchResults;
  if (
    !Number.isSafeInteger(limit) ||
    (limit as number) < 1 ||
    (limit as number) > limits.searchResults
  ) {
    throw new TypeError(`limit must be an integer from 1 to ${String(limits.searchResults)}.`);
  }
  return { query, limit: limit as number };
}

function stableClone<T>(value: T): T {
  return structuredClone(value);
}

function result(content: AgentContent, tool: string, value: unknown, citations: string[]): unknown {
  return {
    schema: resultSchema,
    tool,
    corpusVersion: content.corpus.corpusVersion,
    packageVersion: content.corpus.package.version,
    citations: [...new Set(citations)].sort(),
    result: stableClone(value),
  };
}

function objectSchema(
  properties: Record<string, unknown> = {},
  required: string[] = [],
): Record<string, unknown> {
  return {
    type: "object",
    properties,
    required,
    additionalProperties: false,
  };
}

async function executeRead<T>(
  signal: AbortSignal,
  operation: () => { value: T; citations: string[] },
): Promise<{ value: T; citations: string[] }> {
  await cancellationPoint(signal);
  const output = operation();
  await cancellationPoint(signal);
  return output;
}

export function createJqStarWebMcpTools(target: Document, content: AgentContent): WebMcpTool[] {
  const basePath = import.meta.env.BASE_URL;
  const { componentNames, exampleIds, guideIds, limits } = content;
  return [
    {
      name: "get_jqstar_page",
      title: "Inspect the current jQStar page",
      description:
        "Read the approved identity, summary, headings, and canonical citation for the current jQStar website route. This tool does not modify the page or read user-specific state.",
      inputSchema: objectSchema(),
      annotations,
      async execute(input, options) {
        inputObject(input, []);
        const output = await executeRead(executionSignal(options), () => {
          const page = content.readPage(target.location.pathname, basePath);
          if (!page)
            throw new RangeError("The current route is not in the approved jQStar corpus.");
          return { value: page, citations: [page.canonicalUrl] };
        });
        return result(content, "get_jqstar_page", output.value, output.citations);
      },
    },
    {
      name: "search_jqstar_docs",
      title: "Search jQStar documentation",
      description:
        "Search only the reviewed local jQStar corpus and return bounded ranked records with canonical citations. The query is treated as search text, never as instructions, code, a URL, or a file path.",
      inputSchema: objectSchema(
        {
          query: {
            type: "string",
            minLength: 1,
            maxLength: limits.queryCharacters,
            description: "Plain text to match against reviewed jQStar records.",
          },
          limit: {
            type: "integer",
            minimum: 1,
            maximum: limits.searchResults,
            default: limits.searchResults,
            description: "Maximum number of ranked records to return.",
          },
        },
        ["query"],
      ),
      annotations,
      async execute(input, options) {
        const parameters = searchInput(input, limits);
        const output = await executeRead(executionSignal(options), () => {
          const matches = content.search(parameters.query, { limit: parameters.limit });
          return { value: matches, citations: matches.map(({ canonicalUrl }) => canonicalUrl) };
        });
        return result(content, "search_jqstar_docs", output.value, output.citations);
      },
    },
    {
      name: "read_jqstar_guide",
      title: "Read a jQStar guide",
      description:
        "Read one reviewed jQStar guide by its stable identifier and return its source-backed text and canonical citation. This tool cannot read arbitrary paths or URLs.",
      inputSchema: objectSchema(
        {
          id: {
            type: "string",
            enum: [...guideIds],
            description: "Stable guide identifier from the jQStar agent index.",
          },
        },
        ["id"],
      ),
      annotations,
      async execute(input, options) {
        const id = requiredString(inputObject(input, ["id"]), "id", guideIds);
        const output = await executeRead(executionSignal(options), () => {
          const guide = content.readGuide(id);
          if (!guide) throw new RangeError("The guide identifier is not available.");
          return { value: guide, citations: [guide.canonicalUrl] };
        });
        return result(content, "read_jqstar_guide", output.value, output.citations);
      },
    },
    {
      name: "get_jqstar_component",
      title: "Get a jQStar component contract",
      description:
        "Retrieve one reviewed registry component or block contract by name, including dependencies, data-jqs roots, data-part slots, state attributes, source files, and a canonical citation. This tool does not copy or modify files.",
      inputSchema: objectSchema(
        {
          name: {
            type: "string",
            enum: [...componentNames],
            description: "Exact registry name from the jQStar agent index.",
          },
        },
        ["name"],
      ),
      annotations,
      async execute(input, options) {
        const name = requiredString(inputObject(input, ["name"]), "name", componentNames);
        const output = await executeRead(executionSignal(options), () => {
          const component = content.readComponent(name);
          if (!component) throw new RangeError("The component name is not available.");
          return { value: component, citations: [component.canonicalUrl] };
        });
        return result(content, "get_jqstar_component", output.value, output.citations);
      },
    },
    {
      name: "get_jqstar_example",
      title: "Get a verified jQStar example",
      description:
        "Retrieve one verified jQStar source example by stable identifier with its language, source provenance, and canonical citation. This tool returns code as data and never executes it.",
      inputSchema: objectSchema(
        {
          id: {
            type: "string",
            enum: [...exampleIds],
            description: "Stable example identifier from the jQStar agent index.",
          },
        },
        ["id"],
      ),
      annotations,
      async execute(input, options) {
        const id = requiredString(inputObject(input, ["id"]), "id", exampleIds);
        const output = await executeRead(executionSignal(options), () => {
          const example = content.readExample(id);
          if (!example) throw new RangeError("The example identifier is not available.");
          return { value: example, citations: [example.canonicalUrl] };
        });
        return result(content, "get_jqstar_example", output.value, output.citations);
      },
    },
  ];
}

export function disposeJqStarWebMcp(target: Document = document): void {
  registrations.get(target)?.abort();
  registrations.delete(target);
}

export async function installJqStarWebMcp(
  target: Document = document,
  content?: AgentContent,
): Promise<boolean> {
  disposeJqStarWebMcp(target);
  const context = target.modelContext;
  if (!context || typeof context.registerTool !== "function") return false;
  const approvedContent = content ?? (await loadAgentContent());
  const controller = new AbortController();
  registrations.set(target, controller);
  try {
    for (const tool of createJqStarWebMcpTools(target, approvedContent)) {
      if (controller.signal.aborted) throw abortReason(controller.signal);
      await context.registerTool(tool, { signal: controller.signal });
    }
    return true;
  } catch (error) {
    controller.abort();
    if (registrations.get(target) === controller) registrations.delete(target);
    throw error;
  }
}

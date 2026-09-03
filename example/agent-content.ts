import type corpusDefinition from "./agent-content.generated.json";

type AgentRecordType = "component" | "example" | "guide" | "invariant";

export type AgentSearchResult = {
  id: string;
  type: AgentRecordType;
  title: string;
  summary: string;
  canonicalUrl: string;
  path: string;
  score: number;
};

export type AgentPage = {
  id: string;
  title: string;
  summary: string;
  headings: string[];
  canonicalUrl: string;
  path: string;
};

type AgentCorpus = typeof corpusDefinition;

type SearchOptions = {
  limit?: number;
  types?: readonly AgentRecordType[];
};

type SearchableRecord = Omit<AgentSearchResult, "score"> & {
  keywords: string[];
  content: string;
};

function normalize(value: string): string {
  return value.normalize("NFKC").toLocaleLowerCase().replace(/\s+/g, " ").trim();
}

function tokens(value: string): string[] {
  return [...new Set(normalize(value).match(/[\p{L}\p{N}@$.-]+/gu) ?? [])];
}

function scoreRecord(record: SearchableRecord, query: string, queryTokens: string[]): number {
  const title = normalize(record.title);
  const summary = normalize(record.summary);
  const keywords = normalize(record.keywords.join(" "));
  const content = normalize(record.content);
  let score = title === query ? 1000 : title.startsWith(query) ? 500 : 0;
  let matched = 0;
  for (const token of queryTokens) {
    if (title.includes(token)) {
      score += 120;
      matched += 1;
    } else if (keywords.includes(token)) {
      score += 70;
      matched += 1;
    } else if (summary.includes(token)) {
      score += 35;
      matched += 1;
    } else if (content.includes(token)) {
      score += 8;
      matched += 1;
    }
  }
  if (matched === queryTokens.length) score += 50;
  return score;
}

function toSearchResult(record: SearchableRecord, score: number): AgentSearchResult {
  return {
    id: record.id,
    type: record.type,
    title: record.title,
    summary: record.summary,
    canonicalUrl: record.canonicalUrl,
    path: record.path,
    score,
  };
}

function normalizeRoute(pathname: string, basePath: string): string {
  const decoded = decodeURIComponent(pathname).replace(/index\.html$/, "");
  const base = basePath === "/" ? "/" : `/${basePath.replace(/^\/+|\/+$/g, "")}/`;
  const withoutBase =
    base !== "/" && decoded.startsWith(base) ? decoded.slice(base.length) : decoded;
  return withoutBase.replace(/^\/+/, "").replace(/\/+$/, "");
}

export function createAgentContent(corpus: AgentCorpus) {
  if (corpus.schema !== "jqstar-agent-index/1") {
    throw new TypeError("The jQStar agent index has an unsupported schema.");
  }
  const guides = corpus.guides;
  const examples = corpus.examples;
  const components = corpus.components;
  const invariants = corpus.invariants;
  const limits = Object.freeze({ ...corpus.limits });
  const records: SearchableRecord[] = [
    ...guides.map((guide) => ({
      id: guide.id,
      type: "guide" as const,
      title: guide.title,
      summary: guide.summary,
      canonicalUrl: guide.canonicalUrl,
      path: guide.path,
      keywords: guide.keywords,
      content: guide.content,
    })),
    ...invariants.map((invariant) => ({
      id: invariant.id,
      type: "invariant" as const,
      title: invariant.title,
      summary: invariant.summary,
      canonicalUrl: invariant.canonicalUrl,
      path: invariant.path,
      keywords: [invariant.id],
      content: invariant.content,
    })),
    ...examples.map((example) => ({
      id: example.id,
      type: "example" as const,
      title: example.title,
      summary: example.summary,
      canonicalUrl: example.canonicalUrl,
      path: example.path,
      keywords: example.keywords,
      content: example.code,
    })),
    ...components.map((component) => ({
      id: component.id,
      type: "component" as const,
      title: component.title,
      summary: component.summary,
      canonicalUrl: component.canonicalUrl,
      path: component.path,
      keywords: [
        component.name,
        component.registryType,
        ...component.dependencies,
        ...component.roots,
        ...component.parts,
      ],
      content: [
        component.roots.join(" "),
        component.parts.join(" "),
        component.stateAttributes.join(" "),
      ].join(" "),
    })),
  ];

  function search(queryValue: string, options: SearchOptions = {}): AgentSearchResult[] {
    const query = normalize(queryValue);
    if (query.length === 0 || query.length > limits.queryCharacters) return [];
    const queryTokens = tokens(query);
    if (queryTokens.length === 0) return [];
    const selectedTypes = new Set(options.types ?? ["guide", "invariant", "example", "component"]);
    const limit = Math.max(
      1,
      Math.min(options.limit ?? limits.searchResults, limits.searchResults),
    );
    return records
      .filter((record) => selectedTypes.has(record.type))
      .map((record) => ({ record, score: scoreRecord(record, query, queryTokens) }))
      .filter(({ score }) => score > 0)
      .sort(
        (left, right) =>
          right.score - left.score ||
          left.record.title.localeCompare(right.record.title) ||
          left.record.id.localeCompare(right.record.id),
      )
      .slice(0, limit)
      .map(({ record, score }) => toSearchResult(record, score));
  }

  function readGuide(id: string): (typeof guides)[number] | undefined {
    return guides.find((guide) => guide.id === id);
  }

  function readExample(id: string): (typeof examples)[number] | undefined {
    return examples.find((example) => example.id === id);
  }

  function readComponent(name: string): (typeof components)[number] | undefined {
    return components.find((component) => component.name === name);
  }

  function readPage(pathname: string, basePath = "/"): AgentPage | undefined {
    const route = normalizeRoute(pathname, basePath);
    const guide = guides.find(({ path }) => path.replace(/\/+$/, "") === route);
    if (guide) {
      return {
        id: guide.id,
        title: guide.title,
        summary: guide.summary,
        headings: [...guide.headings],
        canonicalUrl: guide.canonicalUrl,
        path: guide.path,
      };
    }
    const surface = corpus.surfaces.find(
      ({ id, path }) => id === "agent-guide" && path.replace(/\/+$/, "") === route,
    );
    if (!surface) return undefined;
    return {
      id: surface.id,
      title: surface.title,
      summary: surface.summary,
      headings: [
        "Agent support",
        "Supported surfaces",
        "Read-only WebMCP tools",
        "Version and provenance",
        "Limits",
        "Report a contract problem",
      ],
      canonicalUrl: surface.canonicalUrl,
      path: surface.path,
    };
  }

  return {
    componentNames: Object.freeze(components.map(({ name }) => name)),
    corpus,
    exampleIds: Object.freeze(examples.map(({ id }) => id)),
    guideIds: Object.freeze(guides.map(({ id }) => id)),
    limits,
    readComponent,
    readExample,
    readGuide,
    readPage,
    search,
  };
}

export type AgentContent = ReturnType<typeof createAgentContent>;

let loadedContent: Promise<AgentContent> | undefined;

export function loadAgentContent(): Promise<AgentContent> {
  loadedContent ??= fetch(`${import.meta.env.BASE_URL}jqstar-agent-index.json`, {
    credentials: "same-origin",
    headers: { Accept: "application/json" },
  })
    .then(async (response) => {
      if (!response.ok)
        throw new Error(`Agent index request failed with ${String(response.status)}.`);
      return (await response.json()) as AgentCorpus;
    })
    .then(createAgentContent)
    .catch((error: unknown) => {
      loadedContent = undefined;
      throw error;
    });
  return loadedContent;
}

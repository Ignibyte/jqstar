#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { format, resolveConfig } from "prettier";

const MANIFEST_PATH = "config/agent-content.json";
const PACKAGE_PATH = "package.json";
const REGISTRY_PATH = "registry.json";
const ARTIFACT_PATHS = {
  guide: "example/docs/agents/index.html",
  index: "example/public/jqstar-agent-index.json",
  runtimeIndex: "example/agent-content.generated.json",
  llms: "example/public/llms.txt",
  llmsFull: "example/public/llms-full.txt",
};
const REQUIRED_SURFACES = new Set(["agent-guide", "agent-index", "llms-full", "llms-index"]);
const COMPONENT_GUIDES = new Map([
  ["dialog", "docs/components/dialog/"],
  ["dropdown-menu", "docs/components/dropdown/"],
  ["tabs", "docs/components/tabs/"],
  ["toast", "docs/components/toast/"],
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function assertString(value, label) {
  assert(
    typeof value === "string" && value.trim() === value && value.length > 0,
    `${label} must be a non-empty trimmed string.`,
  );
}

function assertPath(value, label, { allowEmpty = false } = {}) {
  if (allowEmpty && value === "") return;
  assertString(value, label);
  assert(
    !value.startsWith("/") && !value.includes("..") && !value.includes("\\"),
    `${label} must be a safe relative public path.`,
  );
  assert(value.endsWith("/"), `${label} must end with a slash.`);
}

function assertUnique(records, label) {
  const seen = new Set();
  for (const record of records) {
    assertString(record.id, `${label} id`);
    assert(!seen.has(record.id), `${label} id ${record.id} is duplicated.`);
    seen.add(record.id);
  }
}

function sortStrings(values) {
  return [...new Set(values)].sort((left, right) => left.localeCompare(right));
}

function canonicalUrl(base, path) {
  return new URL(path, base).href;
}

function decodeHtml(value) {
  return value
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#39;", "'")
    .replaceAll("&apos;", "'")
    .replaceAll("&amp;", "&")
    .replaceAll("&nbsp;", " ");
}

function plainText(value) {
  return decodeHtml(
    value
      .replace(/<script\b[\s\S]*?<\/script>/gi, "")
      .replace(/<style\b[\s\S]*?<\/style>/gi, "")
      .replace(/<pre><code>([\s\S]*?)<\/code><\/pre>/gi, "\n```\n$1\n```\n")
      .replace(/<li\b[^>]*>/gi, "\n- ")
      .replace(/<\/(?:h[1-6]|p|li|tr|section|article|div|table|pre)>/gi, "\n")
      .replace(/<br\s*\/?\s*>/gi, "\n")
      .replace(/<[^>]+>/g, " "),
  )
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .join("\n");
}

function selectContent(source, root, label) {
  if (root === "summary") return "";
  const expression =
    root === "article"
      ? /<article\b[^>]*class=["'][^"']*docs-article[^"']*["'][^>]*>([\s\S]*?)<\/article>/i
      : /<main\b[^>]*>([\s\S]*?)<\/main>/i;
  const match = expression.exec(source);
  assert(match?.[1], `${label} does not contain its declared ${root} content root.`);
  return match[1];
}

function extractHeadings(source) {
  return [...source.matchAll(/<h[1-3]\b[^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
    .map((match) => plainText(match[1]))
    .filter(Boolean);
}

function extractAttributeValues(source, attribute) {
  const expression = new RegExp(`${attribute}=["']([^"']+)["']`, "gi");
  return sortStrings([...source.matchAll(expression)].map((match) => match[1]));
}

function extractStateAttributes(source) {
  return sortStrings(
    [...source.matchAll(/\b(data-[a-z][a-z0-9-]*)(?:=|\s|>)/gi)]
      .map((match) => match[1].toLowerCase())
      .filter(
        (name) =>
          !name.startsWith("data-on") &&
          !name.startsWith("data-bind") &&
          !name.startsWith("data-prop") &&
          !["data-jqs", "data-part", "data-signals", "data-text"].includes(name),
      ),
  );
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

async function readJson(root, relativePath) {
  return JSON.parse(await readFile(resolve(root, relativePath), "utf8"));
}

async function validateManifest(root, manifest, packageJson, registry) {
  assert(
    manifest.$schema === "jqstar-agent-content/1",
    "Agent manifest schema must be jqstar-agent-content/1.",
  );
  assert(
    Number.isSafeInteger(manifest.corpusVersion) && manifest.corpusVersion > 0,
    "corpusVersion must be a positive integer.",
  );
  assert(
    new URL(manifest.canonicalBaseUrl).protocol === "https:",
    "canonicalBaseUrl must use HTTPS.",
  );
  assert(manifest.canonicalBaseUrl.endsWith("/"), "canonicalBaseUrl must end with a slash.");
  assert(
    packageJson.name === "jquery-star",
    "The agent corpus requires the jquery-star package name.",
  );
  assert(
    packageJson.version === "0.1.0",
    "The reviewed agent corpus must be updated when the package version changes.",
  );
  assert(
    packageJson.homepage === manifest.canonicalBaseUrl,
    "Package homepage and agent canonicalBaseUrl conflict.",
  );
  assert(registry.name === packageJson.name, "Registry and package names conflict.");
  assert(
    registry.homepage === manifest.canonicalBaseUrl,
    "Registry and agent canonical URLs conflict.",
  );

  for (const [name, value] of Object.entries(manifest.limits)) {
    assert(
      Number.isSafeInteger(value) && value > 0,
      `Agent limit ${name} must be a positive integer.`,
    );
  }
  assertUnique(manifest.surfaces, "Surface");
  assertUnique(manifest.guides, "Guide");
  assertUnique(manifest.invariants, "Invariant");
  assertUnique(manifest.examples, "Example");
  assertUnique(manifest.evaluations, "Evaluation");
  assert(
    manifest.surfaces.every((surface) => REQUIRED_SURFACES.has(surface.id)) &&
      manifest.surfaces.length === REQUIRED_SURFACES.size,
    "Agent surfaces must define the four reviewed public artifacts exactly once.",
  );

  const publicIds = new Set([
    ...manifest.guides.map(({ id }) => id),
    ...manifest.invariants.map(({ id }) => id),
    ...manifest.examples.map(({ id }) => id),
  ]);
  const approvedPrefixes = [
    "README.md",
    "docs/",
    "example/",
    "package.json",
    "registry.json",
    "registry/",
  ];
  const sources = new Set([MANIFEST_PATH, PACKAGE_PATH, REGISTRY_PATH]);
  for (const guide of manifest.guides) {
    assertPath(guide.path, `Guide ${guide.id} path`, { allowEmpty: true });
    assert(
      ["article", "main", "summary"].includes(guide.contentRoot),
      `Guide ${guide.id} has an invalid contentRoot.`,
    );
    sources.add(guide.source);
  }
  for (const invariant of manifest.invariants) {
    assertPath(invariant.path, `Invariant ${invariant.id} path`, { allowEmpty: true });
    invariant.sources.forEach((source) => sources.add(source));
  }
  for (const example of manifest.examples) {
    assertPath(example.path, `Example ${example.id} path`, { allowEmpty: true });
    assert(
      example.code.length <= manifest.limits.exampleCharacters,
      `Example ${example.id} exceeds the code limit.`,
    );
    sources.add(example.source);
  }
  for (const evaluation of manifest.evaluations) {
    assertPath(evaluation.path, `Evaluation ${evaluation.id} path`, { allowEmpty: true });
    assert(
      evaluation.expectedIds.every((id) => publicIds.has(id)),
      `Evaluation ${evaluation.id} names an unknown expected record.`,
    );
    assert(
      evaluation.requiredTerms.length > 0,
      `Evaluation ${evaluation.id} needs required terms.`,
    );
  }
  for (const source of sources) {
    assert(
      source === MANIFEST_PATH ||
        approvedPrefixes.some((prefix) => source === prefix || source.startsWith(prefix)),
      `Source ${source} is outside the reviewed public allowlist.`,
    );
    assert(
      !source.startsWith("docs/tickets/") && !source.startsWith("deploy/"),
      `Source ${source} is not public corpus material.`,
    );
    await readFile(resolve(root, source));
  }
  return sortStrings(sources);
}

async function buildGuides(root, manifest) {
  return Promise.all(
    manifest.guides.map(async (guide) => {
      const source = await readFile(resolve(root, guide.source), "utf8");
      const selected = selectContent(source, guide.contentRoot, guide.source);
      const content = guide.contentRoot === "summary" ? guide.summary : plainText(selected);
      const headings = guide.contentRoot === "summary" ? [guide.title] : extractHeadings(selected);
      assert(
        content.length <= manifest.limits.guideCharacters,
        `Guide ${guide.id} exceeds the content limit.`,
      );
      assert(
        headings[0]?.toLocaleLowerCase() === guide.title.toLocaleLowerCase() ||
          guide.id === "framework-home",
        `Guide ${guide.id} title conflicts with its first heading.`,
      );
      return {
        id: guide.id,
        type: "guide",
        title: guide.title,
        summary: guide.summary,
        canonicalUrl: canonicalUrl(manifest.canonicalBaseUrl, guide.path),
        path: guide.path,
        keywords: sortStrings(guide.keywords),
        headings,
        content,
        provenance: { source: guide.source, kind: "public-html" },
      };
    }),
  );
}

async function buildExamples(root, manifest) {
  return Promise.all(
    manifest.examples.map(async (example) => {
      const decodedSource = decodeHtml(await readFile(resolve(root, example.source), "utf8"));
      assert(
        decodedSource.includes(example.code),
        `Example ${example.id} has drifted from ${example.source}.`,
      );
      return {
        id: example.id,
        type: "example",
        title: example.title,
        summary: example.summary,
        language: example.language,
        canonicalUrl: canonicalUrl(manifest.canonicalBaseUrl, example.path),
        path: example.path,
        keywords: sortStrings(example.keywords),
        code: example.code,
        provenance: { source: example.source, kind: "verified-example" },
      };
    }),
  );
}

async function buildComponents(root, manifest, registry) {
  return Promise.all(
    [...registry.items]
      .sort((left, right) => left.name.localeCompare(right.name))
      .map(async (item) => {
        const sources = await Promise.all(
          item.files.map(async (file) => ({
            path: file.path,
            target: file.target,
            content: await readFile(resolve(root, file.path), "utf8"),
          })),
        );
        const markup = sources.map(({ content }) => content).join("\n");
        const path = COMPONENT_GUIDES.get(item.name) ?? "components/lab/";
        return {
          id: `component-${item.name}`,
          type: "component",
          name: item.name,
          registryType: item.type,
          title: item.title,
          summary: item.description,
          canonicalUrl: canonicalUrl(manifest.canonicalBaseUrl, path),
          path,
          dependencies: sortStrings(item.registryDependencies ?? []),
          jqueryDependencies: sortStrings(item.dependencies ?? []),
          roots: extractAttributeValues(markup, "data-jqs"),
          parts: extractAttributeValues(markup, "data-part"),
          stateAttributes: extractStateAttributes(markup),
          files: sources.map(({ path: sourcePath, target }) => ({ source: sourcePath, target })),
        };
      }),
  );
}

function buildInvariants(manifest) {
  return manifest.invariants.map((invariant) => ({
    id: invariant.id,
    type: "invariant",
    title: invariant.id.replaceAll("-", " "),
    summary: invariant.statement,
    content: invariant.statement,
    canonicalUrl: canonicalUrl(manifest.canonicalBaseUrl, invariant.path),
    path: invariant.path,
    provenance: { sources: sortStrings(invariant.sources), kind: "reviewed-contract" },
  }));
}

function buildSurfaces(manifest) {
  return manifest.surfaces.map((surface) => ({
    ...surface,
    canonicalUrl: canonicalUrl(manifest.canonicalBaseUrl, surface.path),
  }));
}

async function buildAgentGuide(manifest, packageJson, surfaces, prettierConfig) {
  const surfaceItems = surfaces
    .map(
      (surface) =>
        `<li><a href="%BASE_URL%${escapeHtml(surface.path)}">${escapeHtml(surface.title)}</a>: ${escapeHtml(surface.summary)}</li>`,
    )
    .join("\n          ");
  const limitations = manifest.agentGuide.limitations
    .map((limitation) => `<li>${escapeHtml(limitation)}</li>`)
    .join("\n          ");
  return format(
    `<!doctype html>
<html lang="en" data-theme="dark">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(manifest.agentGuide.title)} · jQStar</title>
    <meta name="description" content="${escapeHtml(manifest.agentGuide.summary)}" />
    <meta name="robots" content="index, follow" />
    <meta property="og:title" content="${escapeHtml(manifest.agentGuide.title)} · jQStar" />
    <meta property="og:description" content="${escapeHtml(manifest.agentGuide.summary)}" />
    <meta property="og:type" content="article" />
    <link rel="icon" type="image/svg+xml" href="%BASE_URL%favicon.svg" />
    <link rel="stylesheet" href="/site.css" />
  </head>
  <body class="docs-page" data-signals="{ siteSearch: '' }">
    <article class="docs-article">
      <h1>${escapeHtml(manifest.agentGuide.title)}</h1>
      <p class="docs-lede">${escapeHtml(manifest.agentGuide.summary)}</p>

      <div class="docs-callout">
        <p><strong>Agent-first parity:</strong> agents can retrieve the same reviewed framework facts, component contracts, and examples that the public site gives people. Every structured result includes a canonical public citation.</p>
      </div>

      <h2>Supported surfaces</h2>
      <ul>
          ${surfaceItems}
      </ul>

      <h2>Read-only WebMCP tools</h2>
      <p>When an origin-keyed secure browser exposes the ${escapeHtml(manifest.webMcpDraft)} Community Group draft through <code>document.modelContext</code>, every public route registers these optional tools:</p>
      <div class="api-table-wrap" role="region" aria-label="WebMCP tools" tabindex="0">
        <table class="api-table">
          <thead><tr><th>Tool</th><th>Purpose</th></tr></thead>
          <tbody>
            <tr><td><code>get_jqstar_page</code></td><td>Inspect the current approved public route.</td></tr>
            <tr><td><code>search_jqstar_docs</code></td><td>Search the bounded local corpus.</td></tr>
            <tr><td><code>read_jqstar_guide</code></td><td>Read one guide by stable ID.</td></tr>
            <tr><td><code>get_jqstar_component</code></td><td>Retrieve one registry contract by name.</td></tr>
            <tr><td><code>get_jqstar_example</code></td><td>Retrieve one verified source example by stable ID.</td></tr>
          </tbody>
        </table>
      </div>
      <p>Each tool has a bounded JSON Schema, returns reviewed local content, honors cancellation, and is annotated read-only. Tool output is data, not instructions. No tool accepts a URL, file path, DOM selector, or code string.</p>

      <h2>Version and provenance</h2>
      <p>This page and every agent artifact are generated from corpus version ${String(manifest.corpusVersion)} for <code>${escapeHtml(packageJson.name)}@${escapeHtml(packageJson.version)}</code>. The reviewed manifest joins package metadata, registry metadata, and the public HTML sources. Deterministic drift checks reject conflicting names, versions, attributes, component anatomy, routes, and examples.</p>

      <h2>Limits</h2>
      <ul>
          ${limitations}
      </ul>

      <h2>Report a contract problem</h2>
      <p>Report stale, missing, unsafe, or ambiguous agent content in the <a href="${escapeHtml(manifest.agentGuide.reportUrl)}">jQStar issue tracker</a>. Include the stable record or tool ID, the public URL, the expected contract, and the observed result. Do not include credentials or private application data.</p>
    </article>
    <script type="module" src="/site.ts"></script>
  </body>
</html>
`,
    { ...prettierConfig, parser: "html" },
  );
}

function buildLlms(manifest, packageJson, surfaces, guides, invariants) {
  const lines = [
    "# jQStar",
    "",
    `> ${packageJson.description}.`,
    "",
    `Package: ${packageJson.name}@${packageJson.version}`,
    `Corpus: jqstar-agent-content/${String(manifest.corpusVersion)}`,
    `Canonical site: ${manifest.canonicalBaseUrl}`,
    "",
    "## Agent surfaces",
    "",
    ...surfaces.map(
      (surface) => `- [${surface.title}](${surface.canonicalUrl}): ${surface.summary}`,
    ),
    "",
    "## Documentation",
    "",
    ...guides.map((guide) => `- [${guide.title}](${guide.canonicalUrl}): ${guide.summary}`),
    "",
    "## Required invariants",
    "",
    ...invariants.map((invariant) => `- ${invariant.content} Citation: ${invariant.canonicalUrl}`),
    "",
    "Use the machine-readable index for stable IDs and component contracts. Use the bounded full-text companion when a short index is not enough.",
    "",
  ];
  return lines.join("\n");
}

function buildFullText(manifest, packageJson, guides, invariants, examples, components) {
  const lines = [
    "# jQStar reviewed agent corpus",
    "",
    `Package: ${packageJson.name}@${packageJson.version}`,
    `Corpus version: ${String(manifest.corpusVersion)}`,
    `Canonical site: ${manifest.canonicalBaseUrl}`,
    "",
    "## Framework invariants",
    "",
    ...invariants.flatMap((record) => [record.content, `Citation: ${record.canonicalUrl}`, ""]),
    "## Guides",
    "",
    ...guides.flatMap((guide) => [
      `### ${guide.title} [${guide.id}]`,
      guide.summary,
      `Citation: ${guide.canonicalUrl}`,
      `Source: ${guide.provenance.source}`,
      "",
      guide.content,
      "",
    ]),
    "## Verified examples",
    "",
    ...examples.flatMap((example) => [
      `### ${example.title} [${example.id}]`,
      example.summary,
      `Citation: ${example.canonicalUrl}`,
      `Source: ${example.provenance.source}`,
      "",
      `\`\`\`${example.language}`,
      example.code,
      "```",
      "",
    ]),
    "## Registry contracts",
    "",
    ...components.flatMap((component) => [
      `### ${component.title} [${component.name}]`,
      component.summary,
      `Registry type: ${component.registryType}`,
      `Dependencies: ${component.dependencies.join(", ") || "none"}`,
      `data-jqs roots: ${component.roots.join(", ") || "none"}`,
      `data-part slots: ${component.parts.join(", ") || "none"}`,
      `State attributes: ${component.stateAttributes.join(", ") || "none"}`,
      `Citation: ${component.canonicalUrl}`,
      "",
    ]),
  ];
  return lines.join("\n");
}

function byteLength(value) {
  return Buffer.byteLength(value, "utf8");
}

export async function buildAgentArtifacts(root = process.cwd()) {
  const [manifest, packageJson, registry, prettierConfig] = await Promise.all([
    readJson(root, MANIFEST_PATH),
    readJson(root, PACKAGE_PATH),
    readJson(root, REGISTRY_PATH),
    resolveConfig(resolve(root, ARTIFACT_PATHS.guide)),
  ]);
  const sources = await validateManifest(root, manifest, packageJson, registry);
  const [guides, examples, components] = await Promise.all([
    buildGuides(root, manifest),
    buildExamples(root, manifest),
    buildComponents(root, manifest, registry),
  ]);
  const invariants = buildInvariants(manifest);
  const surfaces = buildSurfaces(manifest);
  const corpus = {
    schema: "jqstar-agent-index/1",
    corpusVersion: manifest.corpusVersion,
    package: {
      name: packageJson.name,
      version: packageJson.version,
      description: packageJson.description,
    },
    siteVersion: packageJson.version,
    canonicalBaseUrl: manifest.canonicalBaseUrl,
    webMcp: {
      draft: manifest.webMcpDraft,
      status: "optional-community-group-draft",
      interface: "document.modelContext",
    },
    limits: manifest.limits,
    provenance: {
      manifest: MANIFEST_PATH,
      package: PACKAGE_PATH,
      registry: REGISTRY_PATH,
      sources,
    },
    surfaces,
    invariants,
    guides,
    examples,
    components,
  };
  const index = await format(JSON.stringify(corpus), {
    ...(prettierConfig ?? {}),
    parser: "json",
  });
  const llms = buildLlms(manifest, packageJson, surfaces, guides, invariants);
  const llmsFull = buildFullText(manifest, packageJson, guides, invariants, examples, components);
  assert(
    byteLength(index) <= manifest.limits.indexBytes,
    "Machine-readable agent index exceeds its byte limit.",
  );
  assert(
    byteLength(llmsFull) <= manifest.limits.fullTextBytes,
    "Full-text agent corpus exceeds its byte limit.",
  );
  const agentGuide = await buildAgentGuide(manifest, packageJson, surfaces, prettierConfig ?? {});
  return {
    corpus,
    evaluations: manifest.evaluations,
    artifacts: new Map([
      [ARTIFACT_PATHS.guide, agentGuide],
      [ARTIFACT_PATHS.index, index],
      [ARTIFACT_PATHS.runtimeIndex, index],
      [ARTIFACT_PATHS.llms, llms],
      [ARTIFACT_PATHS.llmsFull, llmsFull],
    ]),
  };
}

export async function writeAgentArtifacts(root = process.cwd(), { check = false } = {}) {
  const built = await buildAgentArtifacts(root);
  const drift = [];
  for (const [relativePath, content] of built.artifacts) {
    const output = resolve(root, relativePath);
    if (check) {
      const current = await readFile(output, "utf8").catch(() => undefined);
      if (current !== content) drift.push(relativePath);
      continue;
    }
    await mkdir(dirname(output), { recursive: true });
    await writeFile(output, content);
  }
  assert(drift.length === 0, `Generated agent content is stale: ${drift.join(", ")}`);
  return built;
}

const invokedPath = process.argv[1] ? pathToFileURL(resolve(process.argv[1])).href : "";
if (invokedPath === import.meta.url) {
  const check = process.argv.slice(2).includes("--check");
  const built = await writeAgentArtifacts(process.cwd(), { check });
  const sizes = [...built.artifacts]
    .map(([path, content]) => `${path}=${String(byteLength(content))}`)
    .join(", ");
  process.stdout.write(`agent content ${check ? "checked" : "built"}: ${sizes}\n`);
}

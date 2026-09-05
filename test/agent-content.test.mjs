import { readFile } from "node:fs/promises";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { createAgentContent } from "../example/agent-content";
import { buildAgentArtifacts } from "../scripts/build-agent-content.mjs";

const root = process.cwd();

function allRecords(corpus) {
  return [...corpus.guides, ...corpus.invariants, ...corpus.examples, ...corpus.components];
}

function recordText(record) {
  return JSON.stringify(record).toLocaleLowerCase();
}

describe("agent content", () => {
  it("builds deterministic checked-in artifacts from one bounded corpus", async () => {
    const first = await buildAgentArtifacts(root);
    const second = await buildAgentArtifacts(root);
    expect([...second.artifacts]).toEqual([...first.artifacts]);
    for (const [path, expected] of first.artifacts) {
      await expect(readFile(resolve(root, path), "utf8"), path).resolves.toBe(expected);
    }
    expect(
      Buffer.byteLength(first.artifacts.get("example/public/llms-full.txt"), "utf8"),
    ).toBeLessThanOrEqual(first.corpus.limits.fullTextBytes);
    expect(
      Buffer.byteLength(first.artifacts.get("example/public/jqstar-agent-index.json"), "utf8"),
    ).toBeLessThanOrEqual(first.corpus.limits.indexBytes);
    expect(first.artifacts.get("example/agent-content.generated.json")).toBe(
      first.artifacts.get("example/public/jqstar-agent-index.json"),
    );
  });

  it("joins current package, registry, routes, examples, and reviewed provenance", async () => {
    const { corpus } = await buildAgentArtifacts(root);
    const registry = JSON.parse(await readFile(resolve(root, "registry.json"), "utf8"));
    expect(corpus.schema).toBe("jqstar-agent-index/1");
    expect(corpus.package).toMatchObject({ name: "jquery-star", version: "1.1.0" });
    expect(corpus.siteVersion).toBe(corpus.package.version);
    expect(corpus.components).toHaveLength(registry.items.length);
    expect(corpus.components.find(({ name }) => name === "dialog")).toMatchObject({
      roots: expect.arrayContaining(["dialog"]),
      parts: expect.arrayContaining(["content", "title"]),
      canonicalUrl: "https://ignibyte.github.io/jqstar/docs/components/dialog/",
    });
    expect(corpus.examples.find(({ id }) => id === "install-package")?.code).toBe(
      "npm install jquery-star jquery",
    );
    expect(corpus.provenance.sources).not.toContainEqual(expect.stringMatching(/^docs\/tickets\//));
    expect(corpus.provenance.sources).not.toContainEqual(expect.stringMatching(/^deploy\//));
    expect(JSON.stringify(corpus)).not.toMatch(/\/Users\/|private deployment/i);
    expect(JSON.stringify(corpus)).not.toMatch(
      /(?:api|secret|access)[_-]?key["'=:\s]+[A-Za-z0-9_-]{16,}/i,
    );
    for (const record of allRecords(corpus)) {
      expect(record.canonicalUrl).toMatch(/^https:\/\/ignibyte\.github\.io\/jqstar\//);
    }
  });

  it("passes the checked-in deterministic retrieval evaluations with source terms and citations", async () => {
    const { corpus, evaluations } = await buildAgentArtifacts(root);
    const content = createAgentContent(corpus);
    const records = new Map(allRecords(corpus).map((record) => [record.id, record]));
    for (const evaluation of evaluations) {
      const matches = content.search(evaluation.question, {
        limit: corpus.limits.searchResults,
      });
      const resultIds = matches.map(({ id }) => id);
      expect(
        evaluation.expectedIds.some((id) => resultIds.includes(id)),
        `${evaluation.id}: ${resultIds.join(", ")}`,
      ).toBe(true);
      const expectedText = evaluation.expectedIds
        .map((id) => recordText(records.get(id)))
        .join("\n");
      for (const term of evaluation.requiredTerms) {
        expect(expectedText, `${evaluation.id}: ${term}`).toContain(term.toLocaleLowerCase());
      }
      expect(
        matches.every(({ canonicalUrl }) => canonicalUrl.startsWith(corpus.canonicalBaseUrl)),
      ).toBe(true);
    }
  });
});

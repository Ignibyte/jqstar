import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import {
  buildCspContractArtifacts,
  CSP_GRAMMAR_VERSION,
  CSP_METHODS,
} from "./generate-csp-contract.mjs";
import { createSchemaValidator } from "./quality/validate-json.mjs";

const artifactPaths = [
  "test/fixtures/csp/contract.json",
  "test/fixtures/csp/accepted.json",
  "test/fixtures/csp/denied.json",
  "test/fixtures/csp/adversarial.json",
  "test/fixtures/csp/contexts.json",
  "test/fixtures/csp/conformance-map.json",
];

function unique(values, label) {
  const duplicates = values.filter((value, index) => values.indexOf(value) !== index);
  assert.deepEqual([...new Set(duplicates)], [], `${label} contains duplicate IDs`);
}

function sameSet(actual, expected, label) {
  assert.deepEqual([...new Set(actual)].sort(), [...new Set(expected)].sort(), label);
}

function lineColumn(source, offset) {
  let line = 1;
  let column = 1;
  for (let index = 0; index < offset; index += 1) {
    if (source[index] === "\r" && source[index + 1] === "\n") {
      index += 1;
      line += 1;
      column = 1;
    } else if (source[index] === "\r" || source[index] === "\n") {
      line += 1;
      column = 1;
    } else {
      column += 1;
    }
  }
  return { line, column };
}

function validateSpan(source, span, label) {
  if (typeof source !== "string") {
    assert.deepEqual(
      span,
      {
        startOffset: 0,
        endOffset: 0,
        startLine: 1,
        startColumn: 1,
        endLine: 1,
        endColumn: 1,
      },
      `${label} non-string span`,
    );
    return;
  }
  assert(span.startOffset <= span.endOffset, `${label} span is reversed`);
  assert(span.endOffset <= source.length, `${label} span exceeds source`);
  const start = lineColumn(source, span.startOffset);
  const end = lineColumn(source, span.endOffset);
  assert.deepEqual(
    {
      startLine: span.startLine,
      startColumn: span.startColumn,
      endLine: span.endLine,
      endColumn: span.endColumn,
    },
    {
      startLine: start.line,
      startColumn: start.column,
      endLine: end.line,
      endColumn: end.column,
    },
    `${label} line/column does not match offsets`,
  );
}

function assertKnown(values, known, label) {
  for (const value of values) assert(known.has(value), `${label} references unknown ${value}`);
}

function sharedCaseIds(source) {
  const match = /expressionEngineConformanceCaseIds\s*=\s*\[([\s\S]*?)\]\s*as const/.exec(source);
  assert(match, "Could not read shared expression conformance case IDs");
  return [...match[1].matchAll(/["']([^"']+)["']/g)].map((item) => item[1]);
}

async function readJson(repositoryRoot, path) {
  return JSON.parse(await readFile(resolve(repositoryRoot, path), "utf8"));
}

export async function validateCspContract(repositoryRoot) {
  const generated = await buildCspContractArtifacts(repositoryRoot);
  for (const [path, expected] of generated) {
    const actual = await readFile(resolve(repositoryRoot, path), "utf8");
    assert.equal(actual, expected, `${path} is stale; run npm run csp:inventory`);
  }

  const schema = await readJson(repositoryRoot, "schema/csp-expression-contract.schema.json");
  const validateSchema = createSchemaValidator(schema);
  const [contract, accepted, denied, adversarial, contexts, conformance] = await Promise.all(
    artifactPaths.map((path) => readJson(repositoryRoot, path)),
  );
  for (const [index, manifest] of [
    contract,
    accepted,
    denied,
    adversarial,
    contexts,
    conformance,
  ].entries()) {
    assert(
      validateSchema(manifest),
      `${artifactPaths[index]}: ${JSON.stringify(validateSchema.errors)}`,
    );
    assert.equal(manifest.grammarVersion, CSP_GRAMMAR_VERSION, `${artifactPaths[index]} version`);
  }

  unique(contract.productions, "grammar productions");
  unique(contract.nodeKinds, "AST node kinds");
  unique(
    contract.capabilities.map(({ id }) => id),
    "capabilities",
  );
  unique(
    contract.diagnostics.map(({ id }) => id),
    "diagnostic IDs",
  );
  unique(
    contract.diagnostics.map(({ code }) => code),
    "diagnostic codes",
  );
  unique(
    contract.operators.map(({ id }) => id),
    "operator groups",
  );
  unique(contract.threatCategories, "threat categories");
  assert.deepEqual(contract.methods, CSP_METHODS, "case-sensitive method contract");
  assert.deepEqual(
    [
      contract.ownerTicket,
      accepted.ownerTicket,
      denied.ownerTicket,
      adversarial.ownerTicket,
      contexts.ownerTicket,
      conformance.ownerTicket,
    ],
    ["0015", "0034", "0034", "0034", "0034", "0035"],
    "manifest ticket ownership",
  );

  const productions = new Set(contract.productions);
  const nodes = new Set(contract.nodeKinds);
  const capabilities = new Set(contract.capabilities.map(({ id }) => id));
  const operators = new Set(contract.operators.map(({ id }) => id));
  const diagnosticByCode = new Map(contract.diagnostics.map(({ code, phase }) => [code, phase]));
  for (const binding of contract.bindings) {
    assert(capabilities.has(binding.capability), `binding ${binding.name} capability`);
  }

  const acceptedIds = accepted.cases.map(({ id }) => id);
  const deniedIds = denied.cases.map(({ id }) => id);
  const adversarialIds = adversarial.cases.map(({ id }) => id);
  unique([...acceptedIds, ...deniedIds, ...adversarialIds], "corpus cases");

  const contextIds = contexts.fixtures.map(({ id }) => id);
  unique(contextIds, "context fixtures");
  sameSet(
    [...accepted.cases, ...denied.cases, ...adversarial.cases]
      .map(({ fixture }) => fixture)
      .filter(Boolean),
    contextIds,
    "corpus context fixture coverage",
  );

  const coveredProductions = [];
  const coveredNodes = [];
  const coveredCapabilities = [];
  const coveredOperators = [];
  for (const item of accepted.cases) {
    assert(item.source.length <= contract.limits.sourceLength, `${item.id} exceeds source limit`);
    assertKnown(item.covers.productions, productions, `${item.id} production coverage`);
    assertKnown(item.covers.nodes, nodes, `${item.id} node coverage`);
    assertKnown(item.covers.capabilities, capabilities, `${item.id} capability coverage`);
    assertKnown(item.covers.operators, operators, `${item.id} operator coverage`);
    coveredProductions.push(...item.covers.productions);
    coveredNodes.push(...item.covers.nodes);
    coveredCapabilities.push(...item.covers.capabilities);
    coveredOperators.push(...item.covers.operators);
    if (item.ast) {
      assert(item.ast.root < item.ast.nodes.length, `${item.id} AST root`);
      for (const [index, node] of item.ast.nodes.entries()) {
        assert(nodes.has(node.kind), `${item.id} AST node ${node.kind}`);
        validateSpan(item.source, node.span, `${item.id} AST node ${index}`);
        for (const child of node.children ?? []) {
          assert(child < item.ast.nodes.length, `${item.id} AST child ${child}`);
        }
      }
    }
  }
  sameSet(coveredProductions, contract.productions, "accepted production coverage");
  sameSet(coveredNodes, contract.nodeKinds, "accepted node coverage");
  sameSet(coveredCapabilities, [...capabilities], "accepted capability coverage");
  sameSet(coveredOperators, [...operators], "accepted operator coverage");

  const rejected = [...denied.cases, ...adversarial.cases];
  for (const item of rejected) {
    const expectedPhase = diagnosticByCode.get(item.diagnostic.code);
    assert(expectedPhase, `${item.id} references unknown diagnostic ${item.diagnostic.code}`);
    assert.equal(item.diagnostic.phase, expectedPhase, `${item.id} diagnostic phase`);
    validateSpan(item.source, item.diagnostic.span, `${item.id} diagnostic`);
  }
  sameSet(
    rejected.map(({ diagnostic }) => diagnostic.code),
    [...diagnosticByCode.keys()],
    "rejected diagnostic coverage",
  );
  sameSet(
    adversarial.cases.map(({ category }) => category).filter(Boolean),
    contract.threatCategories,
    "adversarial threat-category coverage",
  );

  for (const [name, value] of Object.entries(contract.limits)) {
    const at = accepted.cases.filter(
      (item) => item.limit?.name === name && item.limit.relation === "at",
    );
    const above = denied.cases.filter(
      (item) => item.limit?.name === name && item.limit.relation === "above",
    );
    assert.equal(at.length, 1, `${name} needs one accepted boundary`);
    assert.equal(above.length, 1, `${name} needs one denied boundary`);
    assert.equal(at[0].limit.value, value, `${name} accepted boundary value`);
    assert.equal(above[0].limit.value, value + 1, `${name} denied boundary value`);
  }

  unique(
    conformance.featureCases.map(({ id }) => id),
    "feature mappings",
  );
  unique(
    conformance.sharedCases.map(({ id }) => id),
    "shared mappings",
  );
  unique(
    conformance.publicExamples.map(({ id }) => id),
    "public example IDs",
  );
  unique(
    conformance.publicExamples.map(({ source }) => source),
    "public example sources",
  );
  const expressionConformance = await readFile(
    resolve(repositoryRoot, "test/expression-engine-conformance.ts"),
    "utf8",
  );
  sameSet(
    conformance.sharedCases.map(({ id }) => id),
    sharedCaseIds(expressionConformance),
    "shared conformance mapping",
  );

  const requiredFeatures = [
    "signals",
    "events",
    "actions",
    "helpers",
    "generic-requests",
    "datastar-requests",
    "patches",
    "async-results",
    "short-circuit",
    "jquery",
  ];
  assertKnown(requiredFeatures, new Set(conformance.featureCases.map(({ id }) => id)), "features");
  const downstreamCases = new Set([
    ...conformance.featureCases.map(({ downstreamCaseId }) => downstreamCaseId),
    ...conformance.sharedCases.map(({ downstreamCaseId }) => downstreamCaseId),
  ]);
  for (const example of conformance.publicExamples) {
    assert(
      downstreamCases.has(example.caseId),
      `${example.id} references unknown case ${example.caseId}`,
    );
    if (example.disposition === "exact-parity") {
      assert(
        example.source.length <= contract.limits.sourceLength,
        `${example.id} exact source exceeds source limit`,
      );
    }
  }
  sameSet(
    [...conformance.featureCases, ...conformance.sharedCases, ...conformance.publicExamples].map(
      ({ disposition }) => disposition,
    ),
    ["exact-parity", "csp-equivalent", "migration-required", "intentionally-unsupported"],
    "compatibility dispositions",
  );

  const digest = createHash("sha256");
  for (const path of artifactPaths) {
    digest.update(`${path}\0`);
    digest.update(await readFile(resolve(repositoryRoot, path)));
  }
  const occurrences = conformance.publicExamples.reduce(
    (count, example) => count + example.locations.length,
    0,
  );
  return {
    grammarVersion: CSP_GRAMMAR_VERSION,
    digest: digest.digest("hex"),
    accepted: accepted.cases.length,
    denied: denied.cases.length,
    adversarial: adversarial.cases.length,
    contexts: contexts.fixtures.length,
    publicSources: conformance.publicExamples.length,
    publicOccurrences: occurrences,
  };
}

async function main() {
  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const result = await validateCspContract(repositoryRoot);
  process.stdout.write(
    `${result.grammarVersion} ${result.digest}: ${result.accepted} accepted, ${result.denied} denied, ${result.adversarial} adversarial, ${result.contexts} contexts, ${result.publicSources} public sources/${result.publicOccurrences} occurrences\n`,
  );
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

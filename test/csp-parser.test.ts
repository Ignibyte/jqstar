import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import type { CSPExpressionNode, CSPNode, CSPProgramNode } from "../src/csp/ast";
import type { CSPEntryKind } from "../src/csp/contract";
import {
  isStarCSPExpressionError,
  type CSPSourceSpan,
  type StarCSPExpressionError,
} from "../src/csp/diagnostics";
import { parseCSP } from "../src/csp/parser";

interface CorpusCase {
  readonly id: string;
  readonly entryKind: CSPEntryKind;
  readonly source: unknown;
  readonly diagnostic?: {
    readonly code: string;
    readonly phase: "compile" | "evaluate";
    readonly span: CSPSourceSpan;
  };
  readonly ast?: {
    readonly root: number;
    readonly nodes: readonly {
      readonly kind: string;
      readonly span: CSPSourceSpan;
      readonly children?: readonly number[];
    }[];
  };
}

async function corpus(name: string): Promise<readonly CorpusCase[]> {
  const input = await readFile(resolve(`test/fixtures/csp/${name}.json`), "utf8");
  return (JSON.parse(input) as { readonly cases: readonly CorpusCase[] }).cases;
}

function capture(run: () => unknown): StarCSPExpressionError {
  try {
    run();
  } catch (error) {
    expect(isStarCSPExpressionError(error)).toBe(true);
    return error as StarCSPExpressionError;
  }
  throw new Error("Expected a CSP expression diagnostic.");
}

function children(node: CSPNode): readonly CSPNode[] {
  switch (node.kind) {
    case "program":
      return node.body;
    case "expression-statement":
      return [node.expression];
    case "return-statement":
      return node.argument ? [node.argument] : [];
    case "array-literal":
      return node.elements;
    case "object-literal":
      return node.properties;
    case "object-property":
      return [node.value];
    case "member":
      return typeof node.property === "string" ? [node.object] : [node.object, node.property];
    case "unary":
    case "await":
      return [node.argument];
    case "update":
      return [node.target];
    case "binary":
    case "logical":
      return [node.left, node.right];
    case "conditional":
      return [node.test, node.consequent, node.alternate];
    case "assignment":
      return [node.target, node.value];
    case "action-call":
    case "helper-call":
    case "jquery-call":
      return node.arguments;
    case "method-call":
      return [node.object, ...node.arguments];
    case "binding":
    case "literal":
    case "signal":
      return [];
  }
}

function flatten(root: CSPExpressionNode | CSPProgramNode): readonly CSPNode[] {
  const nodes: CSPNode[] = [];
  const visit = (node: CSPNode): void => {
    nodes.push(node);
    for (const child of children(node)) visit(child);
  };
  visit(root);
  return nodes;
}

describe("CSP parser", () => {
  it("parses every accepted source and reproduces frozen AST spans", async () => {
    for (const item of await corpus("accepted")) {
      const result = parseCSP(item.source, item.entryKind);
      expect(result, item.id).toBeDefined();
      const nodes = flatten(result);
      expect(
        nodes.every((node) => Object.isFrozen(node)),
        item.id,
      ).toBe(true);
      expect(
        nodes.every((node) => Object.getPrototypeOf(node) === null),
        item.id,
      ).toBe(true);
      if (!item.ast) continue;
      const index = new Map(nodes.map((node, position) => [node, position]));
      expect(item.ast.root, item.id).toBe(0);
      expect(
        nodes.map((node) => ({
          kind: node.kind,
          span: node.span,
          ...(children(node).length
            ? { children: children(node).map((child) => index.get(child)!) }
            : {}),
        })),
        item.id,
      ).toEqual(item.ast.nodes);
    }
  });

  it("matches every frozen compile diagnostic and accepts evaluation-phase vectors", async () => {
    const rejected = [...(await corpus("denied")), ...(await corpus("adversarial"))];
    for (const item of rejected) {
      if (item.diagnostic!.phase === "evaluate") {
        expect(() => parseCSP(item.source, item.entryKind), item.id).not.toThrow();
        continue;
      }
      const error = capture(() => parseCSP(item.source, item.entryKind));
      expect(error.code, item.id).toBe(item.diagnostic!.code);
      expect(error.span, item.id).toEqual(item.diagnostic!.span);
    }
  });

  it("requires duplicate source contracts to agree on compile diagnostics", async () => {
    const rejected = [...(await corpus("denied")), ...(await corpus("adversarial"))];
    const expectations = new Map<string, string>();
    for (const item of rejected) {
      if (item.diagnostic!.phase !== "compile") continue;
      const key = JSON.stringify([item.entryKind, item.source]);
      const expectation = JSON.stringify([item.diagnostic!.code, item.diagnostic!.span]);
      expect(expectations.get(key) ?? expectation, item.id).toBe(expectation);
      expectations.set(key, expectation);
    }
  });

  it("keeps statement-only forms out of value entry points", () => {
    expect(capture(() => parseCSP("await action('save')", "value")).code).toBe(
      "CSP_PARSE_UNSUPPORTED_SYNTAX",
    );
    expect(capture(() => parseCSP("return 1", "value")).code).toBe("CSP_PARSE_UNEXPECTED_TOKEN");
  });

  it("fails closed at malformed call, member, lvalue, key, path, and entry boundaries", () => {
    const cases: readonly [string, CSPEntryKind, string][] = [
      ["@", "statement", "CSP_PARSE_EXPECTED_TOKEN"],
      ["computed.double++", "statement", "CSP_CAPABILITY_LVALUE"],
      ["state.", "value", "CSP_PARSE_EXPECTED_TOKEN"],
      ["{0: 1}", "value", "CSP_PARSE_EXPECTED_TOKEN"],
      ["action($count)", "value", "CSP_PARSE_UNSUPPORTED_SYNTAX"],
      ["action('a.b.c.d.e.f.g.h.i.j')", "value", "CSP_LIMIT_PATH_SEGMENTS"],
    ];
    for (const [source, entryKind, code] of cases) {
      expect(capture(() => parseCSP(source, entryKind)).code, source).toBe(code);
    }

    expect(() => parseCSP("1", "other" as CSPEntryKind)).toThrow(
      "Unknown jQStar CSP expression entry kind",
    );
  });
});

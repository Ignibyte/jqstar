import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CSP_LIMITS } from "../src/csp/contract";
import { isStarCSPExpressionError, type StarCSPExpressionError } from "../src/csp/diagnostics";
import { tokenizeCSP } from "../src/csp/tokenizer";

interface RejectedCase {
  readonly id: string;
  readonly source: unknown;
  readonly diagnostic: {
    readonly code: string;
    readonly span: {
      readonly startOffset: number;
      readonly endOffset: number;
    };
  };
}

async function deniedCases(): Promise<readonly RejectedCase[]> {
  const source = await readFile(resolve("test/fixtures/csp/denied.json"), "utf8");
  return (JSON.parse(source) as { readonly cases: readonly RejectedCase[] }).cases;
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

describe("CSP tokenizer", () => {
  it("emits the frozen token vocabulary with decoded values and exact spans", () => {
    const source = "$count + action('save', 1.5e+2)\n@acme.save-item";
    const tokens = tokenizeCSP(source);

    expect(tokens.map(({ kind, value }) => [kind, value])).toEqual([
      ["signal", "count"],
      ["operator", "+"],
      ["identifier", "action"],
      ["punctuator", "("],
      ["string", "save"],
      ["punctuator", ","],
      ["number", 150],
      ["punctuator", ")"],
      ["punctuator", "@"],
      ["identifier", "acme.save-item"],
      ["eof", ""],
    ]);
    expect(tokens[8]?.span).toEqual({
      startOffset: 32,
      endOffset: 33,
      startLine: 2,
      startColumn: 1,
      endLine: 2,
      endColumn: 2,
    });
    expect(Object.isFrozen(tokens)).toBe(true);
    expect(tokens.every(Object.isFrozen)).toBe(true);
  });

  it("decodes only the approved string escapes and paired surrogate escapes", () => {
    const [token] = tokenizeCSP(String.raw`'\b\f\n\r\t\\\'\"\uD83D\uDE00'`);
    expect(token).toMatchObject({ kind: "string", value: "\b\f\n\r\t\\'\"😀" });

    const high = capture(() => tokenizeCSP(String.raw`'\uD83D'`));
    expect(high.code).toBe("CSP_TOKEN_INVALID_ESCAPE");
    const low = capture(() => tokenizeCSP(String.raw`'\uDE00'`));
    expect(low.code).toBe("CSP_TOKEN_INVALID_ESCAPE");
  });

  it("matches every frozen source, lexical, and token-limit diagnostic", async () => {
    const lexicalCodes = new Set([
      "CSP_SOURCE_TYPE",
      "CSP_LIMIT_SOURCE_LENGTH",
      "CSP_TOKEN_INVALID_CHARACTER",
      "CSP_TOKEN_INVALID_ESCAPE",
      "CSP_TOKEN_NUMBER",
      "CSP_TOKEN_UNTERMINATED_STRING",
      "CSP_LIMIT_TOKENS",
    ]);
    const cases = (await deniedCases()).filter(({ diagnostic }) =>
      lexicalCodes.has(diagnostic.code),
    );

    for (const item of cases) {
      const error = capture(() => tokenizeCSP(item.source));
      expect(error.code, item.id).toBe(item.diagnostic.code);
      expect(error.span.startOffset, item.id).toBe(item.diagnostic.span.startOffset);
      expect(error.span.endOffset, item.id).toBe(item.diagnostic.span.endOffset);
    }
  });

  it("accepts exact source and token bounds and applies authored line origins", async () => {
    const accepted = JSON.parse(
      await readFile(resolve("test/fixtures/csp/accepted.json"), "utf8"),
    ) as { readonly cases: readonly { readonly id: string; readonly source: string }[] };
    const sourceBoundary = accepted.cases.find(({ id }) => id === "limit-source-length")!.source;
    const tokenBoundary = accepted.cases.find(({ id }) => id === "limit-tokens")!.source;

    expect(sourceBoundary).toHaveLength(CSP_LIMITS.sourceLength);
    expect(tokenizeCSP(sourceBoundary).at(-1)?.kind).toBe("eof");
    expect(tokenizeCSP(tokenBoundary)).toHaveLength(CSP_LIMITS.tokens);
    expect(tokenizeCSP("\n$x", { line: 7, column: 4 })[0]?.span).toMatchObject({
      startLine: 8,
      startColumn: 1,
      endLine: 8,
      endColumn: 3,
    });
  });

  it("rejects raw surrogate/control input and non-finite numeric literals", () => {
    const control = capture(() =>
      tokenizeCSP("\r\n'bad\u0001'", { attribute: "data-text", line: 4, column: 3 }),
    );
    expect(control).toMatchObject({
      code: "CSP_TOKEN_INVALID_CHARACTER",
      location: { attribute: "data-text", line: 4, column: 3 },
      span: { startLine: 5, startColumn: 5, endLine: 5, endColumn: 6 },
    });
    expect(control.message).toContain("bad�");
    expect(Object.isFrozen(control.location)).toBe(true);

    expect(capture(() => tokenizeCSP(`'${String.fromCharCode(0xd800)}'`)).code).toBe(
      "CSP_TOKEN_INVALID_CHARACTER",
    );
    expect(tokenizeCSP(`'${String.fromCharCode(0xd83d, 0xde00)}'`)[0]).toMatchObject({
      kind: "string",
      value: "😀",
    });
    expect(capture(() => tokenizeCSP("1e309")).code).toBe("CSP_TOKEN_NUMBER");
  });
});

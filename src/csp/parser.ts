import type { StarExpressionLocation } from "../expression-types";
import type {
  CSPActionCallNode,
  CSPArrayLiteralNode,
  CSPAssignmentNode,
  CSPAwaitNode,
  CSPBinaryNode,
  CSPBindingNode,
  CSPConditionalNode,
  CSPExpressionNode,
  CSPExpressionStatementNode,
  CSPHelperCallNode,
  CSPJQueryCallNode,
  CSPLiteralNode,
  CSPLogicalNode,
  CSPMemberNode,
  CSPMethodCallNode,
  CSPNode,
  CSPObjectLiteralNode,
  CSPObjectPropertyNode,
  CSPProgramNode,
  CSPReturnStatementNode,
  CSPSignalNode,
  CSPStatementNode,
  CSPUnaryNode,
  CSPUpdateNode,
} from "./ast";
import { CSP_DIAGNOSTICS, CSP_ENTRY_KINDS, CSP_LIMITS, type CSPEntryKind } from "./contract";
import { cspError, cspSpan, type CSPSourceSpan } from "./diagnostics";
import { tokenizeCSP, type CSPToken } from "./tokenizer";

const bindings = new Set([
  "$",
  "$el",
  "$root",
  "args",
  "computed",
  "el",
  "evt",
  "root",
  "signals",
  "state",
  "stores",
]);
const unsupportedWords = new Set([
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "export",
  "extends",
  "finally",
  "for",
  "function",
  "if",
  "import",
  "in",
  "instanceof",
  "let",
  "new",
  "of",
  "super",
  "switch",
  "this",
  "throw",
  "try",
  "typeof",
  "var",
  "void",
  "while",
  "with",
  "yield",
]);
const assignmentOperators = new Set(["=", "+=", "-=", "*=", "/=", "%="]);
const actionNamePattern = /^[A-Za-z_$][A-Za-z0-9_$-]*(?:\.[A-Za-z_$][A-Za-z0-9_$-]*)*$/;

function frozenRecord<RecordType extends object>(fields: RecordType): Readonly<RecordType> {
  return Object.freeze(
    Object.assign(Object.create(null) as object, fields),
  ) as Readonly<RecordType>;
}

function frozenArray<Value>(values: readonly Value[]): readonly Value[] {
  return Object.freeze([...values]);
}

class Parser {
  private readonly pathSegments = new WeakMap<object, number>();
  private index = 0;
  private nesting = 0;
  private nodeCount = 0;

  constructor(
    private readonly source: string,
    private readonly entryKind: CSPEntryKind,
    private readonly tokens: readonly CSPToken[],
    private readonly location: StarExpressionLocation | undefined,
  ) {}

  parse(): CSPExpressionNode | CSPProgramNode {
    this.rejectUnsupportedSyntax();
    if (this.entryKind === "value") {
      const expression = this.parseAssignment();
      if (!this.is("eof"))
        this.fail("trailingInput", this.current().span.startOffset, this.source.length);
      return expression;
    }

    const body: CSPStatementNode[] = [];
    let returned = false;
    while (!this.is("eof")) {
      if (returned) this.failFull("unsupportedSyntax");
      const statement = this.parseStatement();
      body.push(statement);
      returned = statement.kind === "return-statement";
      if (this.take(";")) continue;
      if (!this.is("eof"))
        this.fail("expectedToken", this.current().span.startOffset, this.current().span.endOffset);
    }
    if (body.length === 0) this.fail("unexpectedToken", 0, 0);
    const first = body[0]!;
    const last = body.at(-1)!;
    return this.node<CSPProgramNode>({
      kind: "program",
      body: frozenArray(body),
      span: this.span(first.span.startOffset, last.span.endOffset),
    });
  }

  private rejectUnsupportedSyntax(): void {
    for (const token of this.tokens) {
      if (
        (token.kind === "identifier" && unsupportedWords.has(String(token.value))) ||
        token.value === "=>" ||
        token.value === "??="
      ) {
        this.failFull("unsupportedSyntax");
      }
    }
    for (let index = 0; index < this.tokens.length - 2; index += 1) {
      if (
        this.tokens[index]?.value === "." &&
        this.tokens[index + 1]?.value === "." &&
        this.tokens[index + 2]?.value === "."
      ) {
        this.failFull("unsupportedSyntax");
      }
      if (this.tokens[index]?.value === "?" && this.tokens[index + 1]?.value === ".") {
        this.failFull("unsupportedSyntax");
      }
    }
  }

  private parseStatement(): CSPStatementNode {
    if (this.take("return")) {
      const start = this.previous();
      const argument = this.is(";") || this.is("eof") ? undefined : this.parseAssignment();
      return this.node<CSPReturnStatementNode>({
        kind: "return-statement",
        ...(argument ? { argument } : {}),
        span: this.span(start.span.startOffset, argument?.span.endOffset ?? start.span.endOffset),
      });
    }
    if (this.is("@")) return this.parseActionShorthand();
    const expression = this.parseAssignment();
    return this.node<CSPExpressionStatementNode>({
      kind: "expression-statement",
      expression,
      span: expression.span,
    });
  }

  private parseActionShorthand(): CSPActionCallNode {
    const start = this.consume("@");
    const name = this.current();
    if (name.kind !== "identifier" || !actionNamePattern.test(String(name.value))) {
      this.fail("expectedToken", name.span.startOffset, name.span.endOffset);
    }
    this.index += 1;
    this.assertPathLimit(String(name.value), name.span);
    const args = this.is("(") ? this.parseArguments() : frozenArray<CSPExpressionNode>([]);
    const end = this.previous();
    return this.node<CSPActionCallNode>({
      kind: "action-call",
      name: String(name.value),
      arguments: args,
      shorthand: true,
      span: this.span(start.span.startOffset, end.span.endOffset),
    });
  }

  private parseAssignment(): CSPExpressionNode {
    const target = this.parseConditional();
    if (
      this.current().kind !== "operator" ||
      !assignmentOperators.has(String(this.current().value))
    ) {
      return target;
    }
    const operator = String(this.current().value) as CSPAssignmentNode["operator"];
    this.index += 1;
    if (target.kind === "array-literal" || target.kind === "object-literal") {
      this.failFull("unsupportedSyntax");
    }
    if (!this.isAssignable(target)) {
      this.fail("invalidLvalue", target.span.startOffset, target.span.endOffset);
    }
    const value = this.parseAssignment();
    return this.node<CSPAssignmentNode>({
      kind: "assignment",
      operator,
      target,
      value,
      span: this.span(target.span.startOffset, value.span.endOffset),
    });
  }

  private parseConditional(): CSPExpressionNode {
    const test = this.parseLogical("??", () => this.parseLogicalOr());
    if (!this.take("?")) return test;
    const consequent = this.parseAssignment();
    this.consume(":");
    const alternate = this.parseAssignment();
    return this.node<CSPConditionalNode>({
      kind: "conditional",
      test,
      consequent,
      alternate,
      span: this.span(test.span.startOffset, alternate.span.endOffset),
    });
  }

  private parseLogicalOr(): CSPExpressionNode {
    return this.parseLogical("||", () => this.parseLogicalAnd());
  }

  private parseLogicalAnd(): CSPExpressionNode {
    return this.parseLogical("&&", () => this.parseEquality());
  }

  private parseEquality(): CSPExpressionNode {
    return this.parseBinary(["===", "!=="], () => this.parseRelational());
  }

  private parseRelational(): CSPExpressionNode {
    return this.parseBinary(["<", "<=", ">", ">="], () => this.parseAdditive());
  }

  private parseAdditive(): CSPExpressionNode {
    return this.parseBinary(["+", "-"], () => this.parseMultiplicative());
  }

  private parseMultiplicative(): CSPExpressionNode {
    return this.parseBinary(["*", "/", "%"], () => this.parseUnary());
  }

  private parseLogical(
    operator: CSPLogicalNode["operator"],
    lower: () => CSPExpressionNode,
  ): CSPExpressionNode {
    let left = lower();
    while (this.take(operator)) {
      const right = lower();
      left = this.node<CSPLogicalNode>({
        kind: "logical",
        operator,
        left,
        right,
        span: this.span(left.span.startOffset, right.span.endOffset),
      });
    }
    return left;
  }

  private parseBinary(
    operators: readonly CSPBinaryNode["operator"][],
    lower: () => CSPExpressionNode,
  ): CSPExpressionNode {
    let left = lower();
    while (operators.includes(String(this.current().value) as CSPBinaryNode["operator"])) {
      const operator = String(this.current().value) as CSPBinaryNode["operator"];
      this.index += 1;
      const right = lower();
      left = this.node<CSPBinaryNode>({
        kind: "binary",
        operator,
        left,
        right,
        span: this.span(left.span.startOffset, right.span.endOffset),
      });
    }
    return left;
  }

  private parseUnary(): CSPExpressionNode {
    if (this.is("++") || this.is("--")) this.failFull("unsupportedSyntax");
    if (this.is("!") || this.is("+") || this.is("-")) {
      const operator = this.current();
      this.index += 1;
      const argument = this.parseUnary();
      return this.node<CSPUnaryNode>({
        kind: "unary",
        operator: String(operator.value) as CSPUnaryNode["operator"],
        argument,
        span: this.span(operator.span.startOffset, argument.span.endOffset),
      });
    }
    if (this.take("await")) {
      const operator = this.previous();
      if (this.entryKind !== "statement") this.failFull("unsupportedSyntax");
      const argument = this.parseUnary();
      return this.node<CSPAwaitNode>({
        kind: "await",
        argument,
        span: this.span(operator.span.startOffset, argument.span.endOffset),
      });
    }
    return this.parseUpdate();
  }

  private parseUpdate(): CSPExpressionNode {
    const target = this.parseMember();
    if (!this.is("++") && !this.is("--")) return target;
    const operator = this.current();
    this.index += 1;
    if (!this.isAssignable(target)) {
      this.fail("invalidLvalue", target.span.startOffset, target.span.endOffset);
    }
    return this.node<CSPUpdateNode>({
      kind: "update",
      operator: String(operator.value) as CSPUpdateNode["operator"],
      target,
      span: this.span(target.span.startOffset, operator.span.endOffset),
    });
  }

  private parseMember(): CSPExpressionNode {
    let value = this.parsePrimary();
    for (;;) {
      if (this.take(".")) {
        const dot = this.previous();
        const name = this.current();
        if (name.kind !== "identifier") {
          this.fail("expectedToken", name.span.startOffset, name.span.endOffset);
        }
        this.index += 1;
        const segmentSpan = this.span(dot.span.startOffset, name.span.endOffset);
        const pathLength = this.incrementPath(value, segmentSpan);
        if (this.is("(")) {
          const args = this.parseArguments();
          value = this.withPath(
            this.node<CSPMethodCallNode>({
              kind: "method-call",
              object: value,
              name: String(name.value),
              nameSpan: name.span,
              arguments: args,
              span: this.span(value.span.startOffset, this.previous().span.endOffset),
            }),
            pathLength,
          );
        } else {
          value = this.withPath(
            this.node<CSPMemberNode>({
              kind: "member",
              object: value,
              property: String(name.value),
              propertySpan: name.span,
              computed: false,
              span: this.span(value.span.startOffset, name.span.endOffset),
            }),
            pathLength,
          );
        }
        continue;
      }
      if (this.is("[")) {
        const open = this.open("[");
        const property = this.parseAssignment();
        const close = this.close("]");
        const pathLength = this.incrementPath(
          value,
          this.span(open.span.startOffset, close.span.endOffset),
        );
        value = this.withPath(
          this.node<CSPMemberNode>({
            kind: "member",
            object: value,
            property,
            propertySpan: property.span,
            computed: true,
            span: this.span(value.span.startOffset, close.span.endOffset),
          }),
          pathLength,
        );
        continue;
      }
      if (this.is("(")) {
        const open = this.current();
        const args = this.parseArguments();
        value = this.node<CSPMethodCallNode>({
          kind: "method-call",
          object: value,
          nameSpan: open.span,
          arguments: args,
          span: this.span(value.span.startOffset, this.previous().span.endOffset),
        });
        continue;
      }
      return value;
    }
  }

  private parsePrimary(): CSPExpressionNode {
    const token = this.current();
    if (token.kind === "eof" && this.nesting > 0) {
      this.fail("expectedToken", token.span.startOffset, token.span.endOffset);
    }
    if (
      token.kind === "number" ||
      token.kind === "string" ||
      typeof token.value === "boolean" ||
      token.value === null
    ) {
      this.index += 1;
      return this.node<CSPLiteralNode>({ kind: "literal", value: token.value, span: token.span });
    }
    if (token.kind === "signal") {
      this.index += 1;
      return this.withPath(
        this.node<CSPSignalNode>({ kind: "signal", name: String(token.value), span: token.span }),
        0,
      );
    }
    if (this.is("(")) {
      this.open("(");
      const expression = this.parseAssignment();
      this.close(")");
      return expression;
    }
    if (this.is("[")) return this.parseArray();
    if (this.is("{")) return this.parseObject();
    if (token.kind === "identifier") {
      if (token.value === "action" && this.tokens[this.index + 1]?.value === "(") {
        return this.parseActionCall();
      }
      if (token.value === "$" && this.tokens[this.index + 1]?.value === "(") {
        this.index += 1;
        const args = this.parseArguments();
        return this.withPath(
          this.node<CSPJQueryCallNode>({
            kind: "jquery-call",
            arguments: args,
            span: this.span(token.span.startOffset, this.previous().span.endOffset),
          }),
          0,
        );
      }
      if (bindings.has(String(token.value))) {
        this.index += 1;
        return this.withPath(
          this.node<CSPBindingNode>({
            kind: "binding",
            name: String(token.value) as CSPBindingNode["name"],
            span: token.span,
          }),
          0,
        );
      }
      const helper = this.helperPath();
      if (helper) return this.parseHelperCall(helper);
      this.failFull("deniedIdentifier");
    }
    this.fail("unexpectedToken", token.span.startOffset, token.span.endOffset);
  }

  private parseArray(): CSPArrayLiteralNode {
    const open = this.open("[");
    const elements: CSPExpressionNode[] = [];
    if (!this.is("]")) {
      for (;;) {
        elements.push(this.parseAssignment());
        this.assertLiteralLimit(elements.length);
        if (!this.take(",")) break;
      }
    }
    const close = this.close("]");
    return this.node<CSPArrayLiteralNode>({
      kind: "array-literal",
      elements: frozenArray(elements),
      span: this.span(open.span.startOffset, close.span.endOffset),
    });
  }

  private parseObject(): CSPObjectLiteralNode {
    const open = this.open("{");
    const properties: CSPObjectPropertyNode[] = [];
    const keys = new Set<string>();
    if (!this.is("}")) {
      for (;;) {
        const keyToken = this.current();
        if (keyToken.kind !== "identifier" && keyToken.kind !== "string") {
          this.fail("expectedToken", keyToken.span.startOffset, keyToken.span.endOffset);
        }
        this.index += 1;
        const key = String(keyToken.value);
        if (keys.has(key))
          this.fail("duplicateKey", keyToken.span.startOffset, keyToken.span.endOffset);
        keys.add(key);
        this.consume(":");
        const value = this.parseAssignment();
        properties.push(
          this.node<CSPObjectPropertyNode>({
            kind: "object-property",
            key,
            value,
            span: this.span(keyToken.span.startOffset, value.span.endOffset),
          }),
        );
        this.assertLiteralLimit(properties.length);
        if (!this.take(",")) break;
      }
    }
    const close = this.close("}");
    return this.node<CSPObjectLiteralNode>({
      kind: "object-literal",
      properties: frozenArray(properties),
      span: this.span(open.span.startOffset, close.span.endOffset),
    });
  }

  private parseActionCall(): CSPActionCallNode {
    const start = this.current();
    this.index += 1;
    const args = this.parseArguments();
    const name = args[0];
    if (!name || name.kind !== "literal" || typeof name.value !== "string") {
      this.failFull("unsupportedSyntax");
    }
    if (!actionNamePattern.test(name.value)) this.failFull("unsupportedSyntax");
    this.assertPathLimit(name.value, name.span);
    return this.node<CSPActionCallNode>({
      kind: "action-call",
      name: name.value,
      arguments: frozenArray(args.slice(1)),
      shorthand: false,
      span: this.span(start.span.startOffset, this.previous().span.endOffset),
    });
  }

  private parseHelperCall(path: {
    readonly end: number;
    readonly name: string;
  }): CSPHelperCallNode {
    const start = this.current();
    while (this.index < path.end) this.index += 1;
    this.assertPathLimit(path.name, this.previous().span);
    const args = this.parseArguments();
    return this.node<CSPHelperCallNode>({
      kind: "helper-call",
      name: path.name,
      arguments: args,
      span: this.span(start.span.startOffset, this.previous().span.endOffset),
    });
  }

  private helperPath(): { readonly end: number; readonly name: string } | undefined {
    const parts = [String(this.current().value)];
    let cursor = this.index + 1;
    while (this.tokens[cursor]?.value === "." && this.tokens[cursor + 1]?.kind === "identifier") {
      parts.push(String(this.tokens[cursor + 1]!.value));
      cursor += 2;
    }
    return parts.length >= 2 && this.tokens[cursor]?.value === "("
      ? { end: cursor, name: parts.join(".") }
      : undefined;
  }

  private parseArguments(): readonly CSPExpressionNode[] {
    this.open("(");
    const args: CSPExpressionNode[] = [];
    if (!this.is(")")) {
      for (;;) {
        const separatorStart =
          args.length === 0 ? this.current().span.startOffset : this.previous().span.startOffset;
        const argument = this.parseAssignment();
        args.push(argument);
        if (args.length > CSP_LIMITS.callArguments) {
          this.fail("argumentLimit", separatorStart, argument.span.endOffset);
        }
        if (!this.take(",")) break;
      }
    }
    this.close(")");
    return frozenArray(args);
  }

  private isAssignable(value: CSPExpressionNode): value is CSPSignalNode | CSPMemberNode {
    if (value.kind === "signal") return true;
    if (value.kind !== "member") return false;
    let root: CSPExpressionNode = value;
    while (root.kind === "member") root = root.object;
    return (
      root.kind === "binding" &&
      (root.name === "state" || root.name === "signals" || root.name === "stores")
    );
  }

  private incrementPath(value: CSPExpressionNode, span: CSPSourceSpan): number {
    const next = (this.pathSegments.get(value) ?? 0) + 1;
    if (next > CSP_LIMITS.pathSegments) {
      this.fail("pathLimit", span.startOffset, span.endOffset);
    }
    return next;
  }

  private withPath<NodeType extends CSPExpressionNode>(value: NodeType, count: number): NodeType {
    this.pathSegments.set(value, count);
    return value;
  }

  private assertPathLimit(name: string, fallback: CSPSourceSpan): void {
    const segments = name.split(".");
    if (segments.length - 1 <= CSP_LIMITS.pathSegments) return;
    this.fail("pathLimit", fallback.startOffset, fallback.endOffset);
  }

  private assertLiteralLimit(count: number): void {
    if (count > CSP_LIMITS.literalEntries) this.failFull("literalLimit");
  }

  private open(value: string): CSPToken {
    const token = this.consume(value);
    this.nesting += 1;
    if (this.nesting > CSP_LIMITS.nesting) {
      this.fail("nestingLimit", token.span.startOffset, token.span.endOffset);
    }
    return token;
  }

  private close(value: string): CSPToken {
    const token = this.consume(value);
    this.nesting -= 1;
    return token;
  }

  private consume(value: string): CSPToken {
    if (!this.is(value)) {
      const current = this.current();
      this.fail("expectedToken", current.span.startOffset, current.span.endOffset);
    }
    const token = this.current();
    this.index += 1;
    return token;
  }

  private take(value: string): boolean {
    if (!this.is(value)) return false;
    this.index += 1;
    return true;
  }

  private is(value: string): boolean {
    const current = this.current();
    if (value === "eof") return current.kind === "eof";
    if (current.kind === "string" || current.kind === "number" || current.kind === "signal") {
      return false;
    }
    return current.value === value;
  }

  private current(): CSPToken {
    return this.tokens[this.index] ?? this.tokens.at(-1)!;
  }

  private previous(): CSPToken {
    return this.tokens[Math.max(0, this.index - 1)]!;
  }

  private node<NodeType extends CSPNode>(fields: NodeType): NodeType {
    this.nodeCount += 1;
    if (this.nodeCount > CSP_LIMITS.astNodes) this.failFull("nodeLimit");
    return frozenRecord(fields) as NodeType;
  }

  private span(startOffset: number, endOffset: number): CSPSourceSpan {
    return cspSpan(this.source, startOffset, endOffset, this.location);
  }

  private fail(
    diagnostic: keyof typeof CSP_DIAGNOSTICS,
    startOffset: number,
    endOffset: number,
  ): never {
    const { code, phase } = CSP_DIAGNOSTICS[diagnostic];
    throw cspError(code, phase, this.source, startOffset, endOffset, this.location);
  }

  private failFull(diagnostic: keyof typeof CSP_DIAGNOSTICS): never {
    return this.fail(diagnostic, 0, this.source.length);
  }
}

export function parseCSP(
  source: unknown,
  entryKind: CSPEntryKind,
  location?: StarExpressionLocation,
): CSPExpressionNode | CSPProgramNode {
  if (!CSP_ENTRY_KINDS.includes(entryKind)) {
    throw new TypeError(`Unknown jQStar CSP expression entry kind: ${String(entryKind)}.`);
  }
  const tokens = tokenizeCSP(source, location);
  return new Parser(source as string, entryKind, tokens, location).parse();
}

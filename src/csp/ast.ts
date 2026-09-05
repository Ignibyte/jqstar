import type { CSPNodeKind } from "./contract";
import type { CSPSourceSpan } from "./diagnostics";

interface CSPNodeBase {
  readonly kind: CSPNodeKind;
  readonly span: CSPSourceSpan;
}

export interface CSPProgramNode extends CSPNodeBase {
  readonly kind: "program";
  readonly body: readonly CSPStatementNode[];
}

export interface CSPExpressionStatementNode extends CSPNodeBase {
  readonly kind: "expression-statement";
  readonly expression: CSPExpressionNode;
}

export interface CSPReturnStatementNode extends CSPNodeBase {
  readonly kind: "return-statement";
  readonly argument?: CSPExpressionNode;
}

export interface CSPLiteralNode extends CSPNodeBase {
  readonly kind: "literal";
  readonly value: string | number | boolean | null;
}

export interface CSPArrayLiteralNode extends CSPNodeBase {
  readonly kind: "array-literal";
  readonly elements: readonly CSPExpressionNode[];
}

export interface CSPObjectLiteralNode extends CSPNodeBase {
  readonly kind: "object-literal";
  readonly properties: readonly CSPObjectPropertyNode[];
}

export interface CSPObjectPropertyNode extends CSPNodeBase {
  readonly kind: "object-property";
  readonly key: string;
  readonly value: CSPExpressionNode;
}

export interface CSPBindingNode extends CSPNodeBase {
  readonly kind: "binding";
  readonly name:
    | "$"
    | "$el"
    | "$root"
    | "args"
    | "computed"
    | "el"
    | "evt"
    | "root"
    | "signals"
    | "state"
    | "stores";
}

export interface CSPSignalNode extends CSPNodeBase {
  readonly kind: "signal";
  readonly name: string;
}

export interface CSPMemberNode extends CSPNodeBase {
  readonly kind: "member";
  readonly object: CSPExpressionNode;
  readonly property: string | CSPExpressionNode;
  readonly propertySpan: CSPSourceSpan;
  readonly computed: boolean;
}

export interface CSPUnaryNode extends CSPNodeBase {
  readonly kind: "unary";
  readonly operator: "!" | "+" | "-";
  readonly argument: CSPExpressionNode;
}

export interface CSPBinaryNode extends CSPNodeBase {
  readonly kind: "binary";
  readonly operator: "+" | "-" | "*" | "/" | "%" | "<" | "<=" | ">" | ">=" | "===" | "!==";
  readonly left: CSPExpressionNode;
  readonly right: CSPExpressionNode;
}

export interface CSPLogicalNode extends CSPNodeBase {
  readonly kind: "logical";
  readonly operator: "&&" | "||" | "??";
  readonly left: CSPExpressionNode;
  readonly right: CSPExpressionNode;
}

export interface CSPConditionalNode extends CSPNodeBase {
  readonly kind: "conditional";
  readonly test: CSPExpressionNode;
  readonly consequent: CSPExpressionNode;
  readonly alternate: CSPExpressionNode;
}

export interface CSPAssignmentNode extends CSPNodeBase {
  readonly kind: "assignment";
  readonly operator: "=" | "+=" | "-=" | "*=" | "/=" | "%=";
  readonly target: CSPSignalNode | CSPMemberNode;
  readonly value: CSPExpressionNode;
}

export interface CSPUpdateNode extends CSPNodeBase {
  readonly kind: "update";
  readonly operator: "++" | "--";
  readonly target: CSPSignalNode | CSPMemberNode;
}

export interface CSPAwaitNode extends CSPNodeBase {
  readonly kind: "await";
  readonly argument: CSPExpressionNode;
}

interface CSPNamedCallNode extends CSPNodeBase {
  readonly name: string;
  readonly arguments: readonly CSPExpressionNode[];
}

export interface CSPActionCallNode extends CSPNamedCallNode {
  readonly kind: "action-call";
  readonly shorthand: boolean;
}

export interface CSPHelperCallNode extends CSPNamedCallNode {
  readonly kind: "helper-call";
}

export interface CSPJQueryCallNode extends CSPNodeBase {
  readonly kind: "jquery-call";
  readonly arguments: readonly CSPExpressionNode[];
}

export interface CSPMethodCallNode extends CSPNodeBase {
  readonly kind: "method-call";
  readonly object: CSPExpressionNode;
  readonly name?: string;
  readonly nameSpan: CSPSourceSpan;
  readonly arguments: readonly CSPExpressionNode[];
}

export type CSPStatementNode =
  CSPExpressionStatementNode | CSPReturnStatementNode | CSPActionCallNode;

export type CSPExpressionNode =
  | CSPLiteralNode
  | CSPArrayLiteralNode
  | CSPObjectLiteralNode
  | CSPBindingNode
  | CSPSignalNode
  | CSPMemberNode
  | CSPUnaryNode
  | CSPBinaryNode
  | CSPLogicalNode
  | CSPConditionalNode
  | CSPAssignmentNode
  | CSPUpdateNode
  | CSPAwaitNode
  | CSPActionCallNode
  | CSPHelperCallNode
  | CSPJQueryCallNode
  | CSPMethodCallNode;

export type CSPNode = CSPProgramNode | CSPStatementNode | CSPExpressionNode | CSPObjectPropertyNode;

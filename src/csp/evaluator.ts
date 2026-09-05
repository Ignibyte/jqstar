import type { StarExpressionLocation } from "../expression-types";
import {
  isStarExpressionCallResult,
  starExpressionRuntimeFor,
  type StarExpressionCallResult,
} from "../expression-runtime";
import type { StarContext } from "../types";
import type {
  CSPExpressionNode,
  CSPMemberNode,
  CSPMethodCallNode,
  CSPNode,
  CSPProgramNode,
  CSPSignalNode,
  CSPStatementNode,
} from "./ast";
import { CSP_DIAGNOSTICS, CSP_LIMITS, CSP_METHODS, type CSPDiagnosticCode } from "./contract";
import { cspError, type CSPSourceSpan } from "./diagnostics";

type CapabilityKind =
  | "arguments"
  | "array"
  | "async"
  | "call-result"
  | "computed"
  | "data"
  | "dom"
  | "event"
  | "identity"
  | "jquery"
  | "primitive"
  | "state";

interface TrackedValue {
  readonly kind: CapabilityKind;
  readonly value: unknown;
  readonly ancestors?: ReadonlySet<object>;
  readonly cyclic?: boolean;
  readonly writableState?: boolean;
  readonly promise?: Promise<TrackedValue>;
  readonly sourceCall?: StarExpressionCallResult;
  readonly store?: boolean;
}

interface PendingValue {
  readonly promise: Promise<TrackedValue>;
}

interface StateReference {
  read(): TrackedValue;
  write(value: unknown): void;
}

interface NativePromiseThen {
  (onFulfilled: (value: unknown) => void, onRejected: (reason?: unknown) => void): unknown;
}

type ArrayMethod = (typeof CSP_METHODS.array)[number];
type EventMethod = (typeof CSP_METHODS.event)[number];
type JQueryMethod = (typeof CSP_METHODS.jquery)[number];
type StringMethod = (typeof CSP_METHODS.string)[number];

const pendingValues = new WeakSet<object>();
// The captured intrinsic verifies native Promise internal slots without reading a public `then`.
const nativePromiseThen = Object.getOwnPropertyDescriptor(Promise.prototype, "then")!
  .value as NativePromiseThen;
const magicKeys = new Set([
  "__proto__",
  "apply",
  "arguments",
  "bind",
  "call",
  "callee",
  "caller",
  "constructor",
  "eval",
  "prototype",
]);
const stringMethods = new Set<string>(CSP_METHODS.string);
const arrayMethods = new Set<string>(CSP_METHODS.array);
const eventMethods = new Set<string>(CSP_METHODS.event);
const jqueryMethods = new Set<string>(CSP_METHODS.jquery);
const jqueryMethodArity: Readonly<Record<JQueryMethod, readonly [number, number]>> = Object.freeze({
  addClass: [1, 1],
  attr: [1, 2],
  children: [0, 1],
  closest: [1, 1],
  css: [1, 2],
  eq: [1, 1],
  fadeIn: [0, 1],
  fadeOut: [0, 1],
  filter: [1, 1],
  find: [1, 1],
  first: [0, 0],
  hasClass: [1, 1],
  hide: [0, 1],
  html: [0, 1],
  is: [1, 1],
  last: [0, 0],
  not: [1, 1],
  parent: [0, 1],
  prop: [1, 2],
  removeClass: [0, 1],
  show: [0, 1],
  siblings: [0, 1],
  text: [0, 1],
  toggle: [0, 1],
  toggleClass: [1, 2],
  val: [0, 1],
});

function tracked(
  kind: CapabilityKind,
  value: unknown,
  fields: Partial<TrackedValue> = {},
): TrackedValue {
  return Object.freeze({ kind, value, ...fields });
}

function pending(promise: Promise<TrackedValue>): PendingValue {
  const value = Object.freeze({ promise });
  pendingValues.add(value);
  return value;
}

function isPending(value: TrackedValue | PendingValue): value is PendingValue {
  return pendingValues.has(value);
}

function continueWith(
  value: TrackedValue | PendingValue,
  next: (resolved: TrackedValue) => TrackedValue | PendingValue,
): TrackedValue | PendingValue {
  if (!isPending(value)) return next(value);
  return pending(
    value.promise.then((resolved) => {
      const continued = next(resolved);
      return isPending(continued) ? continued.promise : continued;
    }),
  );
}

function isObject(value: unknown): value is object {
  return (typeof value === "object" && value !== null) || typeof value === "function";
}

function finiteNumber(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

function literalString(node: CSPExpressionNode | undefined): string | undefined {
  return node?.kind === "literal" && typeof node.value === "string" ? node.value : undefined;
}

class EvaluationFrame {
  private steps = 0;
  private asyncTransitions = 0;

  constructor(
    private readonly source: string,
    private readonly location: StarExpressionLocation | undefined,
    private readonly context: StarContext,
    private readonly active: () => boolean,
  ) {}

  evaluate(root: CSPExpressionNode | CSPProgramNode): unknown {
    const result = root.kind === "program" ? this.evaluateProgram(root) : this.evaluateNode(root);
    if (isPending(result)) return result.promise.then((value) => this.boundary(value));
    return this.boundary(result);
  }

  private boundary(value: TrackedValue): unknown {
    if (value.kind === "async") return value.promise!.then((resolved) => this.boundary(resolved));
    if (typeof value.value === "function") {
      this.failTracked("CSP_CAPABILITY_VALUE", this.fullSpan(), value);
    }
    return value.value;
  }

  private evaluateProgram(node: CSPProgramNode): TrackedValue | PendingValue {
    this.step(node);
    let result: TrackedValue | PendingValue = tracked("primitive", undefined);
    for (const statement of node.body) {
      result = continueWith(result, () => this.evaluateStatement(statement));
    }
    return result;
  }

  private evaluateStatement(node: CSPStatementNode): TrackedValue | PendingValue {
    if (node.kind === "action-call") return this.evaluateNode(node);
    this.step(node);
    if (node.kind === "return-statement") {
      return node.argument ? this.evaluateNode(node.argument) : tracked("primitive", undefined);
    }
    return this.evaluateNode(node.expression);
  }

  private evaluateNode(node: CSPExpressionNode): TrackedValue | PendingValue {
    this.step(node);
    switch (node.kind) {
      case "literal":
        return tracked("primitive", node.value);
      case "binding":
        return this.binding(node.name);
      case "signal":
        return this.readState(this.context.state, node.name, undefined, node, true);
      case "array-literal":
        return continueWith(this.evaluateList(node.elements), (items) => {
          const values = items.value as readonly TrackedValue[];
          return tracked("array", Object.freeze(values.map(({ value }) => value)));
        });
      case "object-literal": {
        let result: TrackedValue | PendingValue = tracked("data", [] as TrackedValue[]);
        for (const property of node.properties) {
          this.step(property);
          result = continueWith(result, (current) =>
            continueWith(this.evaluateNode(property.value), (value) => {
              (current.value as TrackedValue[]).push(
                tracked("data", Object.freeze({ key: property.key, value: value.value })),
              );
              return current;
            }),
          );
        }
        return continueWith(result, (entries) => {
          const value = Object.create(null) as Record<string, unknown>;
          for (const entry of entries.value as readonly TrackedValue[]) {
            const pair = entry.value as { readonly key: string; readonly value: unknown };
            value[pair.key] = pair.value;
          }
          return tracked("data", Object.freeze(value));
        });
      }
      case "member":
        return continueWith(this.evaluateNode(node.object), (object) =>
          node.computed
            ? continueWith(this.evaluateNode(node.property as CSPExpressionNode), (property) =>
                this.readMember(object, property.value, node),
              )
            : this.readMember(object, node.property, node),
        );
      case "unary":
        return continueWith(this.evaluateNode(node.argument), (argument) =>
          this.unary(node.operator, argument, node.span),
        );
      case "binary":
        return continueWith(this.evaluateNode(node.left), (left) =>
          continueWith(this.evaluateNode(node.right), (right) =>
            this.binary(node.operator, left, right, node.span),
          ),
        );
      case "logical":
        return continueWith(this.evaluateNode(node.left), (left) => {
          if (left.kind === "async") this.fail("CSP_ASYNC_VALUE", node.left.span);
          const selected =
            node.operator === "&&"
              ? this.truthy(left)
              : node.operator === "||"
                ? !this.truthy(left)
                : left.value === null || left.value === undefined;
          return selected ? this.evaluateNode(node.right) : left;
        });
      case "conditional":
        return continueWith(this.evaluateNode(node.test), (test) => {
          if (test.kind === "async") this.fail("CSP_ASYNC_VALUE", node.test.span);
          return this.evaluateNode(this.truthy(test) ? node.consequent : node.alternate);
        });
      case "assignment":
        return continueWith(this.reference(node.target), (holder) => {
          const reference = holder.value as StateReference;
          const previous = node.operator === "=" ? undefined : reference.read();
          return continueWith(this.evaluateNode(node.value), (right) => {
            const value =
              node.operator === "="
                ? right
                : this.binary(
                    node.operator.slice(0, -1) as "+" | "-" | "*" | "/" | "%",
                    previous!,
                    right,
                    node.span,
                  );
            reference.write(value.value);
            return value;
          });
        });
      case "update":
        return continueWith(this.reference(node.target), (holder) => {
          const reference = holder.value as StateReference;
          const previous = reference.read();
          if (!finiteNumber(previous.value)) this.fail("CSP_EVALUATE_NUMBER", node.span);
          const next = previous.value + (node.operator === "++" ? 1 : -1);
          if (!Number.isFinite(next)) this.fail("CSP_EVALUATE_NUMBER", node.span);
          reference.write(next);
          return tracked("primitive", previous.value);
        });
      case "await":
        return continueWith(this.evaluateNode(node.argument), (argument) => {
          if (argument.kind !== "async") this.fail("CSP_ASYNC_VALUE", node.span);
          return pending(argument.promise!);
        });
      case "action-call":
      case "helper-call":
        return continueWith(this.evaluateList(node.arguments), (argumentsValue) => {
          const args = (argumentsValue.value as readonly TrackedValue[]).map(({ value }) => value);
          const runtime = starExpressionRuntimeFor(this.context);
          if (!runtime) this.fail("CSP_CAPABILITY_CALL", node.span);
          let result: StarExpressionCallResult;
          try {
            result =
              node.kind === "action-call"
                ? runtime.invokeAction(node.name, args, this.context)
                : runtime.invokeHelper(node.name, args);
          } catch {
            this.fail("CSP_CAPABILITY_CALL", node.span);
          }
          if (!isStarExpressionCallResult(result)) this.fail("CSP_CAPABILITY_CALL", node.span);
          return this.callResult(result, node.span);
        });
      case "jquery-call":
        return this.jqueryCall(node);
      case "method-call":
        return continueWith(this.evaluateNode(node.object), (object) =>
          this.methodCall(node, object),
        );
    }
  }

  private evaluateList(nodes: readonly CSPExpressionNode[]): TrackedValue | PendingValue {
    let result: TrackedValue | PendingValue = tracked("data", [] as TrackedValue[]);
    for (const node of nodes) {
      result = continueWith(result, (current) =>
        continueWith(this.evaluateNode(node), (value) => {
          (current.value as TrackedValue[]).push(value);
          return current;
        }),
      );
    }
    return continueWith(result, (values) =>
      tracked("data", Object.freeze([...(values.value as TrackedValue[])])),
    );
  }

  private binding(name: string): TrackedValue {
    switch (name) {
      case "state":
      case "signals":
        return tracked("state", this.context.state, {
          ancestors: new Set([this.context.state]),
          writableState: true,
        });
      case "computed":
        return tracked("computed", this.context.computed);
      case "stores":
        return tracked("data", this.context.stores, { store: true });
      case "args": {
        const args = this.context.args ?? [];
        if (!Array.isArray(args)) this.fail("CSP_CAPABILITY_VALUE", this.fullSpan());
        this.arrayLength(args, this.fullSpan());
        return tracked("arguments", args);
      }
      case "evt":
        return tracked("event", this.context.event);
      case "el":
        return tracked("dom", this.context.element);
      case "root":
        return tracked("dom", this.context.root);
      case "$el":
        return this.jqueryValue(this.context.$element, this.fullSpan());
      case "$root":
        return this.jqueryValue(this.context.$root, this.fullSpan());
      case "$":
        return tracked("jquery", this.context.$);
      default:
        return this.fail("CSP_CAPABILITY_VALUE", this.fullSpan());
    }
  }

  private readMember(object: TrackedValue, inputKey: unknown, node: CSPMemberNode): TrackedValue {
    if (object.kind === "async") this.fail("CSP_ASYNC_VALUE", node.span);
    if (object.cyclic) this.fail("CSP_EVALUATE_CYCLE", node.span);
    if (typeof object.value === "function") {
      this.failTracked("CSP_CAPABILITY_PROPERTY", node.span, object);
    }
    const key = this.propertyKey(inputKey, node.propertySpan);
    if (magicKeys.has(key)) {
      const span =
        object.kind === "state" && object.value === this.context.state
          ? node.propertySpan
          : this.fullSpan();
      this.fail("CSP_CAPABILITY_PROPERTY", span);
    }
    if (object.value === null || object.value === undefined) {
      this.fail("CSP_PROPERTY_ABSENT", node.propertySpan);
    }

    switch (object.kind) {
      case "state":
        return this.readState(
          object.value as Record<string, unknown>,
          key,
          object,
          node,
          object.writableState === true,
        );
      case "computed": {
        if (!Object.hasOwn(this.context.computed, key)) return tracked("primitive", undefined);
        let value: unknown;
        try {
          value = (this.context.computed as Record<string, unknown>)[key];
        } catch {
          this.fail("CSP_CAPABILITY_ACCESSOR", node.span);
        }
        return this.dataValue(value, undefined, false);
      }
      case "arguments":
      case "array":
        return this.readArray(object, key, node);
      case "data":
      case "call-result":
        return this.readOwnData(object, key, node);
      case "event":
        return this.readEvent(object.value, key, node);
      case "dom":
        return this.readDOM(object.value, key, node);
      case "jquery":
        return this.readJQuery(object.value, key, node);
      case "primitive":
        if (typeof object.value === "string" && key === "length") {
          return tracked("primitive", object.value.length);
        }
        return this.fail("CSP_CAPABILITY_PROPERTY", node.span);
      case "identity":
        return this.fail("CSP_CAPABILITY_PROPERTY", node.span);
    }
  }

  private readState(
    value: Record<string, unknown>,
    key: string,
    parent: TrackedValue | undefined,
    node: CSPNode,
    writableState: boolean,
  ): TrackedValue {
    const member = this.readDescriptor(value, key, node.span);
    if (!member.found) return tracked("primitive", undefined);
    let resolved: unknown;
    try {
      resolved = value[key];
    } catch {
      this.fail("CSP_CAPABILITY_ACCESSOR", this.fullSpan());
    }
    return this.dataValue(resolved, parent, writableState);
  }

  private readOwnData(object: TrackedValue, key: string, node: CSPNode): TrackedValue {
    if (!isObject(object.value)) this.fail("CSP_CAPABILITY_PROPERTY", node.span);
    const member = this.readDescriptor(object.value, key, node.span);
    if (!member.found) return tracked("primitive", undefined);
    return this.dataValue(member.value, object, object.store === true);
  }

  private readDescriptor(
    value: object,
    key: string,
    _span: CSPSourceSpan,
  ): { readonly found: boolean; readonly value?: unknown } {
    let descriptor: PropertyDescriptor | undefined;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch {
      this.fail("CSP_CAPABILITY_ACCESSOR", this.fullSpan());
    }
    if (!descriptor) return { found: false };
    if (!("value" in descriptor)) this.fail("CSP_CAPABILITY_ACCESSOR", this.fullSpan());
    return { found: true, value: descriptor.value };
  }

  private dataValue(
    value: unknown,
    parent: TrackedValue | undefined,
    writableState: boolean,
  ): TrackedValue {
    if (!isObject(value)) {
      this.validatePrimitive(value, this.fullSpan());
      return tracked("primitive", value);
    }
    const ancestors = new Set(parent?.ancestors ?? []);
    const cyclic = ancestors.has(value);
    if (!cyclic) ancestors.add(value);
    let array = false;
    try {
      array = Array.isArray(value);
    } catch {
      this.fail("CSP_CAPABILITY_ACCESSOR", this.fullSpan());
    }
    if (array) {
      this.arrayLength(value as readonly unknown[], this.fullSpan());
      return tracked("array", value, { ancestors, cyclic, writableState });
    }
    if (typeof value !== "function") this.validatePlainData(value, this.fullSpan());
    return tracked(
      parent?.kind === "call-result" ? "call-result" : writableState ? "state" : "data",
      value,
      {
        ancestors,
        cyclic,
        writableState,
      },
    );
  }

  private readArray(object: TrackedValue, key: string, node: CSPMemberNode): TrackedValue {
    const values = object.value as readonly unknown[];
    const length = this.arrayLength(values, node.span);
    if (key === "length") return tracked("primitive", length);
    if (!/^\d+$/.test(key) || Number(key) >= length) return tracked("primitive", undefined);
    const member = this.readDescriptor(values, key, node.span);
    if (!member.found) return tracked("primitive", undefined);
    return this.dataValue(member.value, object, object.writableState === true);
  }

  private readEvent(value: unknown, key: string, node: CSPMemberNode): TrackedValue {
    const allowed = new Set([
      "type",
      "key",
      "code",
      "button",
      "buttons",
      "detail",
      "target",
      "currentTarget",
      "defaultPrevented",
      "timeStamp",
    ]);
    if (!allowed.has(key) || !isObject(value)) this.fail("CSP_CAPABILITY_PROPERTY", node.span);
    let result: unknown;
    try {
      result = (value as Record<string, unknown>)[key];
    } catch {
      this.fail("CSP_CAPABILITY_ACCESSOR", node.span);
    }
    if (key === "target" || key === "currentTarget") {
      return this.isSameRealmElement(result)
        ? tracked("dom", result)
        : tracked("primitive", result == null ? result : undefined);
    }
    return this.dataValue(result, undefined, false);
  }

  private readDOM(value: unknown, key: string, node: CSPMemberNode): TrackedValue {
    if (!this.isSameRealmElement(value)) this.fail("CSP_CAPABILITY_VALUE", node.span);
    const allowed = new Set([
      "id",
      "name",
      "type",
      "tagName",
      "value",
      "checked",
      "disabled",
      "textContent",
      "dataset",
      "ownerDocument",
    ]);
    if (!allowed.has(key)) this.fail("CSP_CAPABILITY_PROPERTY", node.span);
    if (key === "ownerDocument") return tracked("identity", value.ownerDocument);
    if (key === "dataset") {
      const dataset = Object.create(null) as Record<string, string>;
      const source = (value as Element & { readonly dataset?: DOMStringMap }).dataset;
      for (const [name, item] of Object.entries(source ?? {})) {
        if (item !== undefined) dataset[name] = item;
      }
      return tracked("data", Object.freeze(dataset));
    }
    return tracked("primitive", (value as unknown as Record<string, unknown>)[key]);
  }

  private readJQuery(value: unknown, key: string, node: CSPMemberNode): TrackedValue {
    if (!this.isCanonicalJQuery(value)) this.fail("CSP_CAPABILITY_VALUE", node.span);
    const collection = value as JQuery;
    this.collection(collection.length, node.span);
    if (key === "length") return tracked("primitive", collection.length);
    if (!/^\d+$/.test(key)) this.fail("CSP_CAPABILITY_PROPERTY", node.span);
    const index = Number(key);
    if (index >= collection.length) return tracked("primitive", undefined);
    const element = collection.get(index);
    if (!this.isSameRealmElement(element)) this.fail("CSP_CAPABILITY_VALUE", node.span);
    return tracked("dom", element);
  }

  private reference(target: CSPSignalNode | CSPMemberNode): TrackedValue | PendingValue {
    if (target.kind === "signal") {
      return tracked("data", {
        read: () => this.readState(this.context.state, target.name, undefined, target, true),
        write: (value: unknown) =>
          this.writeState(this.context.state, target.name, value, target.span),
      } satisfies StateReference);
    }
    return continueWith(this.evaluateNode(target.object), (object) => {
      if (!object.writableState || !isObject(object.value)) {
        this.fail("CSP_CAPABILITY_LVALUE", target.span);
      }
      const create = (input: unknown): TrackedValue => {
        const key = this.propertyKey(input, target.propertySpan);
        if (magicKeys.has(key)) this.fail("CSP_CAPABILITY_PROPERTY", target.propertySpan);
        const reference: StateReference = {
          read: () => {
            const member = this.readDescriptor(object.value as object, key, target.span);
            return member.found
              ? this.dataValue(member.value, object, true)
              : tracked("primitive", undefined);
          },
          write: (value) => {
            this.writeState(object.value as Record<string, unknown>, key, value, target.span);
          },
        };
        return tracked("data", reference);
      };
      return target.computed
        ? continueWith(this.evaluateNode(target.property as CSPExpressionNode), (property) =>
            create(property.value),
          )
        : create(target.property);
    });
  }

  private unary(
    operator: "!" | "+" | "-",
    argument: TrackedValue,
    span: CSPSourceSpan,
  ): TrackedValue {
    if (argument.kind === "async") this.fail("CSP_ASYNC_VALUE", span);
    if (operator === "!") return tracked("primitive", !this.truthy(argument));
    if (!finiteNumber(argument.value)) this.fail("CSP_EVALUATE_NUMBER", span);
    const value = operator === "+" ? argument.value : -argument.value;
    if (!Number.isFinite(value)) this.fail("CSP_EVALUATE_NUMBER", span);
    return tracked("primitive", value);
  }

  private binary(
    operator: "+" | "-" | "*" | "/" | "%" | "<" | "<=" | ">" | ">=" | "===" | "!==",
    left: TrackedValue,
    right: TrackedValue,
    span: CSPSourceSpan,
  ): TrackedValue {
    if (left.kind === "async" || right.kind === "async") this.fail("CSP_ASYNC_VALUE", span);
    if (operator === "===" || operator === "!==") {
      const equal = typeof left.value === typeof right.value && left.value === right.value;
      return tracked("primitive", operator === "===" ? equal : !equal);
    }
    if (["<", "<=", ">", ">="].includes(operator)) {
      if (!(
        (finiteNumber(left.value) && finiteNumber(right.value)) ||
        (typeof left.value === "string" && typeof right.value === "string")
      )) {
        this.fail("CSP_EVALUATE_TYPE", span);
      }
      const leftValue = left.value as number | string;
      const rightValue = right.value as number | string;
      const result =
        operator === "<"
          ? leftValue < rightValue
          : operator === "<="
            ? leftValue <= rightValue
            : operator === ">"
              ? leftValue > rightValue
              : leftValue >= rightValue;
      return tracked("primitive", result);
    }
    if (operator === "+" && (typeof left.value === "string" || typeof right.value === "string")) {
      return tracked("primitive", this.primitiveText(left, span) + this.primitiveText(right, span));
    }
    if (!finiteNumber(left.value) || !finiteNumber(right.value)) {
      this.fail("CSP_EVALUATE_NUMBER", span);
    }
    const value =
      operator === "+"
        ? left.value + right.value
        : operator === "-"
          ? left.value - right.value
          : operator === "*"
            ? left.value * right.value
            : operator === "/"
              ? left.value / right.value
              : left.value % right.value;
    if (!Number.isFinite(value)) this.fail("CSP_EVALUATE_NUMBER", span);
    return tracked("primitive", value);
  }

  private primitiveText(value: TrackedValue, span: CSPSourceSpan): string {
    if (
      value.value === null ||
      value.value === undefined ||
      typeof value.value === "string" ||
      typeof value.value === "boolean" ||
      finiteNumber(value.value)
    ) {
      return String(value.value);
    }
    this.fail("CSP_EVALUATE_TYPE", span);
  }

  private truthy(value: TrackedValue): boolean {
    return !(
      value.value === null ||
      value.value === undefined ||
      value.value === false ||
      value.value === 0 ||
      value.value === ""
    );
  }

  private callResult(result: StarExpressionCallResult, span: CSPSourceSpan): TrackedValue {
    const fail = (code: CSPDiagnosticCode): never => {
      const error = this.error(code, span);
      result.failed(error);
      throw error;
    };
    if (!result.active()) return fail("CSP_ASYNC_REJECTION");
    if (typeof result.value === "function") {
      return tracked("call-result", result.value, { sourceCall: result });
    }
    if (!isObject(result.value)) {
      if (typeof result.value === "number" && !Number.isFinite(result.value)) {
        return fail("CSP_EVALUATE_NUMBER");
      }
      result.completed();
      return tracked("call-result", result.value);
    }
    if (this.isSameRealmElement(result.value) || this.isCanonicalJQuery(result.value)) {
      return fail("CSP_CAPABILITY_VALUE");
    }

    const adopted = this.adoptNativePromise(result.value);
    if (adopted) {
      this.asyncTransitions += 1;
      if (this.asyncTransitions > CSP_LIMITS.asyncChain) {
        const error = this.error("CSP_LIMIT_ASYNC_CHAIN", this.fullSpan());
        result.failed(error);
        throw error;
      }
      const promise = adopted.then(
        (value) => {
          if (!this.active()) {
            const error = this.error("CSP_ENGINE_DISPOSED", this.fullSpan());
            result.failed(error);
            throw error;
          }
          if (!result.active()) return fail("CSP_ASYNC_REJECTION");
          try {
            const normalized = this.callDataValue(value, span);
            result.completed();
            return normalized;
          } catch (error) {
            result.failed(error);
            throw error;
          }
        },
        () => {
          const error = this.error(
            this.active() ? "CSP_ASYNC_REJECTION" : "CSP_ENGINE_DISPOSED",
            this.fullSpan(),
          );
          result.failed(error);
          throw error;
        },
      );
      return tracked("async", undefined, { promise });
    }

    const then = this.descriptorInChain(result.value, "then", span);
    if (then && (!("value" in then) || typeof then.value === "function")) {
      return fail("CSP_ASYNC_VALUE");
    }
    const value = this.callDataValue(result.value, span);
    result.completed();
    return value;
  }

  private callDataValue(value: unknown, span: CSPSourceSpan): TrackedValue {
    if (typeof value === "function") this.fail("CSP_CAPABILITY_VALUE", span);
    if (!isObject(value)) {
      this.validatePrimitive(value, span);
      return tracked("call-result", value);
    }
    if (this.isSameRealmElement(value) || this.isCanonicalJQuery(value)) {
      this.fail("CSP_CAPABILITY_VALUE", span);
    }
    const array = Array.isArray(value);
    if (array) this.arrayLength(value as readonly unknown[], span);
    else this.validatePlainData(value, span);
    return tracked("call-result", value, { ancestors: new Set([value]) });
  }

  private adoptNativePromise(value: object): Promise<unknown> | undefined {
    let resolvePromise!: (value: unknown) => void;
    let rejectPromise!: (reason?: unknown) => void;
    const promise = new Promise<unknown>((resolve, reject) => {
      resolvePromise = resolve;
      rejectPromise = reject;
    });
    try {
      void Reflect.apply(nativePromiseThen, value, [resolvePromise, rejectPromise]);
    } catch {
      return undefined;
    }
    return promise;
  }

  private descriptorInChain(
    value: object,
    key: string,
    span: CSPSourceSpan,
  ): PropertyDescriptor | undefined {
    let current: object | null = value;
    for (let depth = 0; current && depth <= CSP_LIMITS.pathSegments; depth += 1) {
      let descriptor: PropertyDescriptor | undefined;
      try {
        descriptor = Object.getOwnPropertyDescriptor(current, key);
        current = Object.getPrototypeOf(current) as object | null;
      } catch {
        this.fail("CSP_CAPABILITY_ACCESSOR", span);
      }
      if (descriptor) return descriptor;
    }
    return undefined;
  }

  private jqueryCall(
    node: Extract<CSPExpressionNode, { kind: "jquery-call" }>,
  ): TrackedValue | PendingValue {
    if (node.arguments.length !== 1) this.fail("CSP_CAPABILITY_CALL", node.span);
    const literal = literalString(node.arguments[0]);
    const binding = node.arguments[0]?.kind === "binding" ? node.arguments[0].name : undefined;
    if (literal === undefined && binding !== "el" && binding !== "root") {
      this.fail("CSP_CAPABILITY_VALUE", node.span);
    }
    return continueWith(this.evaluateNode(node.arguments[0]!), (argument) => {
      let value: JQuery<Element>;
      if (literal !== undefined) value = this.context.$(literal, this.context.root);
      else {
        if (argument.kind !== "dom" || !this.isSameRealmElement(argument.value)) {
          this.fail("CSP_CAPABILITY_VALUE", node.span);
        }
        value = this.context.$(argument.value);
      }
      return this.jqueryValue(value, node.span);
    });
  }

  private methodCall(node: CSPMethodCallNode, object: TrackedValue): TrackedValue | PendingValue {
    const name = node.name;
    if (!name || magicKeys.has(name)) this.failTracked("CSP_CAPABILITY_CALL", node.span, object);
    const allowed =
      (object.kind === "primitive" &&
        typeof object.value === "string" &&
        stringMethods.has(name)) ||
      ((object.kind === "array" || object.kind === "arguments") && arrayMethods.has(name)) ||
      (object.kind === "event" && eventMethods.has(name)) ||
      (object.kind === "jquery" && jqueryMethods.has(name));
    if (!allowed) {
      const span =
        object.kind === "state" && object.value === this.context.state ? node.nameSpan : node.span;
      this.failTracked("CSP_CAPABILITY_CALL", span, object);
    }
    if (object.kind === "jquery") this.validateJQueryArguments(node);
    return continueWith(this.evaluateList(node.arguments), (argumentsValue) => {
      const trackedArgs = argumentsValue.value as readonly TrackedValue[];
      const args =
        object.kind === "jquery"
          ? this.jqueryArguments(trackedArgs, node.span)
          : trackedArgs.map(({ value }) => value);
      if (object.kind === "primitive")
        return this.stringMethod(String(object.value), name as StringMethod, args, node.span);
      if (object.kind === "array" || object.kind === "arguments") {
        return this.arrayMethod(object, name as ArrayMethod, args, node.span);
      }
      if (object.kind === "event")
        return this.eventMethod(object.value, name as EventMethod, args, node.span);
      return this.jqueryMethod(object.value, name, args, node);
    });
  }

  private stringMethod(
    value: string,
    name: StringMethod,
    args: readonly unknown[],
    span: CSPSourceSpan,
  ): TrackedValue {
    const index = (input: unknown, fallback = 0): number =>
      input === undefined
        ? fallback
        : finiteNumber(input)
          ? Math.trunc(input)
          : this.fail("CSP_EVALUATE_TYPE", span);
    switch (name) {
      case "trim":
      case "toLowerCase":
      case "toUpperCase":
        if (args.length !== 0) this.fail("CSP_CAPABILITY_CALL", span);
        return tracked(
          "primitive",
          name === "trim"
            ? value.trim()
            : name === "toLowerCase"
              ? value.toLowerCase()
              : value.toUpperCase(),
        );
      case "includes":
      case "startsWith":
      case "endsWith": {
        if (typeof args[0] !== "string" || args.length > 2) this.fail("CSP_EVALUATE_TYPE", span);
        const position = index(args[1]);
        const result =
          name === "includes"
            ? value.includes(args[0], position)
            : name === "startsWith"
              ? value.startsWith(args[0], position)
              : value.endsWith(args[0], args[1] === undefined ? undefined : position);
        return tracked("primitive", result);
      }
      case "slice":
      case "substring": {
        if (args.length > 2) this.fail("CSP_CAPABILITY_CALL", span);
        const start = index(args[0]);
        const end = args[1] === undefined ? undefined : index(args[1]);
        return tracked(
          "primitive",
          name === "slice" ? value.slice(start, end) : value.substring(start, end),
        );
      }
      case "charAt":
        if (args.length > 1) this.fail("CSP_CAPABILITY_CALL", span);
        return tracked("primitive", value.charAt(index(args[0])));
    }
    return this.fail("CSP_CAPABILITY_CALL", span);
  }

  private arrayMethod(
    object: TrackedValue,
    name: ArrayMethod,
    args: readonly unknown[],
    span: CSPSourceSpan,
  ): TrackedValue {
    const values = object.value as readonly unknown[];
    const length = this.arrayLength(values, span);
    const index = (input: unknown, fallback = 0): number =>
      input === undefined
        ? fallback
        : finiteNumber(input)
          ? Math.trunc(input)
          : this.fail("CSP_EVALUATE_TYPE", span);
    switch (name) {
      case "at": {
        if (args.length !== 1) this.fail("CSP_CAPABILITY_CALL", span);
        const offset = index(args[0]);
        const position = offset < 0 ? length + offset : offset;
        if (position < 0 || position >= length) return tracked("primitive", undefined);
        const member = this.readDescriptor(values, String(position), span);
        return member.found
          ? this.dataValue(member.value, object, false)
          : tracked("primitive", undefined);
      }
      case "includes":
      case "indexOf": {
        if (args.length < 1 || args.length > 2) this.fail("CSP_CAPABILITY_CALL", span);
        const start = Math.max(0, index(args[1]));
        let found = -1;
        for (let position = start; position < length; position += 1) {
          const member = this.readDescriptor(values, String(position), span);
          if (member.found && member.value === args[0]) {
            found = position;
            break;
          }
        }
        return tracked("primitive", name === "includes" ? found >= 0 : found);
      }
      case "join": {
        if (args.length > 1 || (args[0] !== undefined && typeof args[0] !== "string")) {
          this.fail("CSP_EVALUATE_TYPE", span);
        }
        const output: string[] = [];
        for (let position = 0; position < length; position += 1) {
          const member = this.readDescriptor(values, String(position), span);
          const value = member.value;
          if (value === null || value === undefined) output.push("");
          else if (["string", "number", "boolean"].includes(typeof value))
            output.push(String(value));
          else this.fail("CSP_EVALUATE_TYPE", span);
        }
        return tracked("primitive", output.join((args[0] as string | undefined) ?? ","));
      }
      case "slice": {
        if (args.length > 2) this.fail("CSP_CAPABILITY_CALL", span);
        const start = index(args[0]);
        const end = args[1] === undefined ? length : index(args[1]);
        const result: unknown[] = [];
        for (let position = Math.max(0, start); position < Math.min(length, end); position += 1) {
          const member = this.readDescriptor(values, String(position), span);
          result.push(member.value);
        }
        this.collection(result.length, span);
        return tracked("array", Object.freeze(result));
      }
    }
    return this.fail("CSP_CAPABILITY_CALL", span);
  }

  private eventMethod(
    value: unknown,
    name: EventMethod,
    args: readonly unknown[],
    span: CSPSourceSpan,
  ): TrackedValue {
    if (!isObject(value) || args.length !== 0) this.fail("CSP_CAPABILITY_CALL", span);
    const event = value as Event;
    if (name === "preventDefault") event.preventDefault();
    else if (name === "stopPropagation") event.stopPropagation();
    else this.fail("CSP_CAPABILITY_CALL", span);
    return tracked("primitive", undefined);
  }

  private validateJQueryArguments(node: CSPMethodCallNode): void {
    const name = node.name!;
    const bounds = jqueryMethodArity[name as JQueryMethod];
    if (!bounds) this.fail("CSP_CAPABILITY_CALL", node.span);
    const [minimum, maximum] = bounds;
    if (node.arguments.length < minimum || node.arguments.length > maximum) {
      this.fail("CSP_CAPABILITY_CALL", node.span);
    }
    const literalFirst = literalString(node.arguments[0]);
    const requiresLiteral = new Set([
      "addClass",
      "attr",
      "children",
      "closest",
      "css",
      "filter",
      "find",
      "hasClass",
      "is",
      "not",
      "prop",
      "removeClass",
      "siblings",
      "toggleClass",
    ]);
    if (requiresLiteral.has(name) && node.arguments.length > 0 && literalFirst === undefined) {
      this.fail("CSP_CAPABILITY_VALUE", node.span);
    }
    if (name === "html" && node.arguments.length > 0 && literalFirst === undefined) {
      this.fail("CSP_CAPABILITY_VALUE", node.span);
    }
  }

  private jqueryArguments(
    values: readonly TrackedValue[],
    span: CSPSourceSpan,
  ): readonly unknown[] {
    return values.map((current) => {
      const { value } = current;
      if (
        value === null ||
        value === undefined ||
        typeof value === "string" ||
        typeof value === "boolean" ||
        finiteNumber(value)
      ) {
        return value;
      }
      return this.failTracked("CSP_CAPABILITY_VALUE", span, current);
    });
  }

  private validatePrimitive(value: unknown, span: CSPSourceSpan): void {
    if (typeof value === "number" && !Number.isFinite(value)) {
      this.fail("CSP_EVALUATE_NUMBER", span);
    }
    if (typeof value === "bigint" || typeof value === "symbol") {
      this.fail("CSP_CAPABILITY_VALUE", span);
    }
  }

  private validatePlainData(value: object, span: CSPSourceSpan): void {
    let prototype: object | null;
    let parentPrototype: object | null = null;
    try {
      prototype = Object.getPrototypeOf(value) as object | null;
      if (prototype !== null) {
        parentPrototype = Object.getPrototypeOf(prototype) as object | null;
      }
    } catch {
      this.fail("CSP_CAPABILITY_ACCESSOR", span);
    }
    if (prototype !== null && prototype !== Object.prototype && parentPrototype !== null) {
      this.fail("CSP_CAPABILITY_VALUE", span);
    }
  }

  private arrayLength(value: readonly unknown[], span: CSPSourceSpan): number {
    const descriptor = this.readDescriptor(value, "length", span);
    if (!descriptor.found || !Number.isInteger(descriptor.value) || Number(descriptor.value) < 0) {
      this.fail("CSP_CAPABILITY_VALUE", span);
    }
    const length = Number(descriptor.value);
    this.collection(length, span);
    return length;
  }

  private writeState(
    target: Record<string, unknown>,
    key: string,
    value: unknown,
    span: CSPSourceSpan,
  ): void {
    this.readDescriptor(target, key, span);
    try {
      target[key] = value;
    } catch {
      this.fail("CSP_CAPABILITY_ACCESSOR", span);
    }
  }

  private jqueryMethod(
    value: unknown,
    name: string,
    args: readonly unknown[],
    node: CSPMethodCallNode,
  ): TrackedValue {
    if (!this.isCanonicalJQuery(value)) this.fail("CSP_CAPABILITY_VALUE", node.span);
    const collection = value as JQuery;
    const method = (collection as unknown as Record<string, unknown>)[name];
    if (typeof method !== "function") this.fail("CSP_CAPABILITY_CALL", node.span);
    let result: unknown;
    try {
      result = method.apply(collection, args);
    } catch {
      this.fail("CSP_CAPABILITY_VALUE", node.span);
    }
    if (this.isCanonicalJQuery(result)) return this.jqueryValue(result, node.span);
    if (isObject(result)) this.fail("CSP_CAPABILITY_VALUE", node.span);
    return tracked("primitive", result);
  }

  private jqueryValue(value: unknown, span: CSPSourceSpan): TrackedValue {
    if (!this.isCanonicalJQuery(value)) this.fail("CSP_CAPABILITY_VALUE", span);
    this.collection((value as JQuery).length, this.fullSpan());
    return tracked("jquery", value);
  }

  private isCanonicalJQuery(value: unknown): boolean {
    if (!isObject(value)) return false;
    try {
      return Object.prototype.isPrototypeOf.call(this.context.$.fn, value);
    } catch {
      return false;
    }
  }

  private isSameRealmElement(value: unknown): value is Element {
    if (!isObject(value)) return false;
    const ElementHost = this.context.root.ownerDocument.defaultView?.Element;
    if (!ElementHost) return false;
    try {
      return Object.prototype.isPrototypeOf.call(ElementHost.prototype, value);
    } catch {
      return false;
    }
  }

  private propertyKey(value: unknown, span: CSPSourceSpan): string {
    if (typeof value === "string") return value;
    if (finiteNumber(value) && Number.isInteger(value) && value >= 0) return String(value);
    this.fail("CSP_CAPABILITY_PROPERTY", span);
  }

  private collection(size: number, span: CSPSourceSpan): void {
    if (size > CSP_LIMITS.collectionSize) this.fail("CSP_LIMIT_COLLECTION_SIZE", span);
  }

  private step(_node: CSPNode): void {
    if (!this.active()) this.fail("CSP_ENGINE_DISPOSED", this.fullSpan());
    this.steps += 1;
    if (this.steps > CSP_LIMITS.evaluationSteps) {
      this.fail("CSP_LIMIT_EVALUATION_STEPS", this.fullSpan());
    }
  }

  private fullSpan(): CSPSourceSpan {
    return {
      startOffset: 0,
      endOffset: this.source.length,
      startLine: this.location?.line ?? 1,
      startColumn: this.location?.column ?? 1,
      endLine: 1,
      endColumn: 1,
    };
  }

  private error(code: CSPDiagnosticCode, span: CSPSourceSpan): Error {
    const phase = Object.values(CSP_DIAGNOSTICS).find((item) => item.code === code)!.phase;
    return cspError(code, phase, this.source, span.startOffset, span.endOffset, this.location);
  }

  private fail(code: CSPDiagnosticCode, span: CSPSourceSpan): never {
    throw this.error(code, span);
  }

  private failTracked(code: CSPDiagnosticCode, span: CSPSourceSpan, value: TrackedValue): never {
    const error = this.error(code, span);
    value.sourceCall?.failed(error);
    throw error;
  }
}

export function evaluateCSP(
  root: CSPExpressionNode | CSPProgramNode,
  source: string,
  context: StarContext,
  location?: StarExpressionLocation,
  active: () => boolean = () => true,
): unknown {
  return new EvaluationFrame(source, location, context, active).evaluate(root);
}

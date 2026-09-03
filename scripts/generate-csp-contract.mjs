import { createHash } from "node:crypto";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { extname, join, relative, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { format } from "prettier";

export const CSP_GRAMMAR_VERSION = "jqstar-csp-expression/1";
export const CSP_SCHEMA_PATH = "../../../schema/csp-expression-contract.schema.json";

const roots = ["README.md", "registry", "example", "e2e"];
const extensions = [".html", ".md", ".ts"];
const expressionAttribute =
  /\b(data-(?:bind(?::[\w-]+)?|class(?::[\w-]+)?|computed(?::[\w-]+)?|effect|html|init|model|on(?::[\w.-]+)?|prop(?::[\w-]+)?|show|signals|style(?::[\w-]+)?|text))\s*=\s*(["'])([\s\S]*?)\2/g;

export const CSP_METHODS = Object.freeze({
  jquery: Object.freeze([
    "addClass",
    "attr",
    "children",
    "closest",
    "css",
    "eq",
    "fadeIn",
    "fadeOut",
    "filter",
    "find",
    "first",
    "hasClass",
    "hide",
    "html",
    "is",
    "last",
    "not",
    "parent",
    "prop",
    "removeClass",
    "show",
    "siblings",
    "text",
    "toggle",
    "toggleClass",
    "val",
  ]),
  string: Object.freeze([
    "charAt",
    "endsWith",
    "includes",
    "slice",
    "startsWith",
    "substring",
    "toLowerCase",
    "toUpperCase",
    "trim",
  ]),
  array: Object.freeze(["at", "includes", "indexOf", "join", "slice"]),
  event: Object.freeze(["preventDefault", "stopPropagation"]),
});

const jqueryMethods = new Set(CSP_METHODS.jquery);
const stringMethods = new Set(CSP_METHODS.string);

const limits = {
  sourceLength: 2048,
  tokens: 512,
  nesting: 16,
  astNodes: 256,
  literalEntries: 64,
  pathSegments: 8,
  callArguments: 8,
  evaluationSteps: 128,
  collectionSize: 128,
  asyncChain: 8,
};

function contextFixtures() {
  const data = (target, value) => ({ operation: "data-binding", target, value });
  const event = (cancelable = false, detail = null) => ({
    operation: "event",
    type: "click",
    cancelable,
    detail,
  });
  const dom = (markup, rootSelector, elementSelector) => ({
    operation: "dom-tree",
    markup,
    rootSelector,
    elementSelector,
  });
  const action = (name, behavior) => ({
    operation: "registered-action",
    name,
    recordCalls: true,
    behavior,
  });
  const helper = (path, behavior) => ({
    operation: "registered-helper",
    path,
    recordCalls: true,
    behavior,
  });
  const special = (target, kind, options = {}) => ({
    operation: "special-value",
    target,
    kind,
    ...options,
  });
  const fixture = (id, description, steps) => ({ id, description, steps });

  return {
    $schema: CSP_SCHEMA_PATH,
    schema: "jqstar-csp-contexts/1",
    grammarVersion: CSP_GRAMMAR_VERSION,
    ownerTicket: "0034",
    fixtures: [
      fixture("action-data-result", "An action returns inert plain data.", [
        action("value", { kind: "return-data", value: { safe: true } }),
      ]),
      fixture("action-function-result", "An action returns a callable value.", [
        action("functionValue", { kind: "return-function", returnValue: null }),
      ]),
      fixture("actions", "State, arguments, and tracked actions for ordering and async cases.", [
        data("state", { count: 2 }),
        data("args", ["input"]),
        action("save", { kind: "return-approved-async", fulfillment: "saved" }),
        action("load", { kind: "return-approved-async", fulfillment: null }),
        action("never", { kind: "return-data", value: null }),
      ]),
      fixture("all-bindings", "Every fixed evaluator binding has one deterministic value.", [
        data("state", { count: 2 }),
        data("computed", { double: 4 }),
        data("args", ["input"]),
        event(false),
        dom(
          '<main id="app" data-jqs><input data-role="save" value="save"></main>',
          "[data-jqs]",
          '[data-role="save"]',
        ),
      ]),
      fixture("array-arguments", "Two string arguments back the bounded arguments view.", [
        data("args", ["a", "b"]),
      ]),
      fixture("async-ticks", "A tracked action returns one approved async value per call.", [
        action("tick", { kind: "return-approved-async", fulfillment: null }),
      ]),
      fixture("cancelable-event", "A cancelable click event exposes default-prevention state.", [
        event(true),
      ]),
      fixture("collection-128", "A scoped DOM tree contains exactly 128 matching elements.", [
        { operation: "dom-collection", selector: ".item", count: 128 },
      ]),
      fixture("collection-129", "A scoped DOM tree contains exactly 129 matching elements.", [
        { operation: "dom-collection", selector: ".item", count: 129 },
      ]),
      fixture("deep-state", "State has an eight-segment path ending in inert data.", [
        data("state", {
          a: { b: { c: { d: { e: { f: { g: { h: "end" } } } } } } },
        }),
      ]),
      fixture("disposed-engine", "A compiled evaluator is retained and its engine is disposed.", [
        data("state", { count: 2 }),
        { operation: "engine-lifecycle", transition: "dispose-before-evaluation" },
      ]),
      fixture("event-function-shape", "Event detail contains a function-shaped data member.", [
        event(true, {}),
        special("evt.detail.callback", "function", { returnValue: "event-callback" }),
      ]),
      fixture("foreign-element", "State contains an element created by an isolated DOM realm.", [
        special("state.foreignElement", "foreign-dom-element", {
          markup: '<main><button data-foreign="element">Foreign</button></main>',
          selector: '[data-foreign="element"]',
        }),
      ]),
      fixture("foreign-jquery", "State contains a jQuery value created by an isolated DOM realm.", [
        special("state.foreignJQuery", "foreign-jquery", {
          markup: '<main><span data-foreign="jquery">Foreign</span></main>',
          selector: '[data-foreign="jquery"]',
        }),
      ]),
      fixture("helper-data-result", "A committed helper returns inert plain data.", [
        helper("acme.tools.value", { kind: "return-data", value: { safe: true } }),
      ]),
      fixture("helper-function-result", "A committed helper returns a callable value.", [
        helper("acme.tools.functionValue", { kind: "return-function", returnValue: null }),
      ]),
      fixture("helper-jquery-result", "A committed helper returns canonical-realm jQuery.", [
        dom(
          '<main data-jqs><span data-part="label">Ready</span></main>',
          "[data-jqs]",
          '[data-part="label"]',
        ),
        helper("acme.tools.jquery", {
          kind: "return-canonical-jquery",
          selector: '[data-part="label"]',
        }),
      ]),
      fixture("helper-thenable-result", "A committed helper returns an unapproved thenable.", [
        helper("acme.tools.thenable", { kind: "return-thenable", fulfillment: "unsafe" }),
      ]),
      fixture("helpers", "State and a committed numeric sum helper have tracked calls.", [
        data("state", { count: 2 }),
        helper("acme.math.sum", { kind: "sum-numbers" }),
      ]),
      fixture(
        "jquery-tree",
        "A scoped tree supplies the canonical root, element, and jQuery peer.",
        [
          dom(
            '<main id="app" data-jqs><span data-part="label">Ready</span><button data-role="save">Save</button></main>',
            "[data-jqs]",
            '[data-role="save"]',
          ),
        ],
      ),
      fixture("name", "State contains a padded name string.", [data("state", { name: " Ada " })]),
      fixture("profile", "State contains a nested profile name.", [
        data("state", { profile: { name: "Ada" } }),
      ]),
      fixture("rejecting-action", "A tracked action returns an approved rejected async value.", [
        action("reject", {
          kind: "return-approved-async-rejection",
          rejectionLabel: "fixture-rejection",
        }),
      ]),
      fixture("response-function-shape", "Response-shaped state data contains a callable member.", [
        data("state", { response: {} }),
        special("state.response.callback", "function", { returnValue: "response-callback" }),
      ]),
      fixture("state-accessor", "State has an own getter that must not be invoked.", [
        special("state.secret", "accessor", {
          getterValue: { deep: "fixture-secret" },
          expectedReads: 0,
        }),
      ]),
      fixture("state-count", "State begins with a finite count of two.", [
        data("state", { count: 2 }),
      ]),
      fixture("state-cycle", "The state self property points back to the state object.", [
        special("state.self", "self-cycle", { referenceTarget: "state" }),
      ]),
      fixture("state-function", "State contains a callable member that returns inert data.", [
        special("state.fn", "function", { returnValue: null }),
        dom("<main data-jqs><button>Save</button></main>", "[data-jqs]", "button"),
      ]),
      fixture("state-html", "State contains markup-shaped text that remains data.", [
        data("state", { html: "<strong>unsafe</strong>" }),
        dom('<main data-jqs><div data-part="target"></div></main>', "[data-jqs]", "[data-part]"),
      ]),
      fixture("state-proxy", "State contains a proxy whose descriptor trap throws.", [
        special("state.proxy", "throwing-descriptor-proxy", {
          trap: "getOwnPropertyDescriptor",
          thrownLabel: "fixture-proxy-trap",
          expectedTrapCalls: 1,
        }),
      ]),
      fixture("state-secret-accessor", "A secret-shaped state getter must not reach diagnostics.", [
        special("state.secret", "accessor", {
          getterValue: { deep: "do-not-disclose" },
          expectedReads: 0,
        }),
      ]),
      fixture("state-selector", "State contains selector-shaped text that remains data.", [
        data("state", { selector: ".item" }),
      ]),
      fixture("state-value", "State contains an ordinary plain-data value.", [
        data("state", { value: { safe: true } }),
      ]),
    ],
  };
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

function span(source, startOffset = 0, endOffset = source.length) {
  const start = lineColumn(source, startOffset);
  const end = lineColumn(source, endOffset);
  return {
    startOffset,
    endOffset,
    startLine: start.line,
    startColumn: start.column,
    endLine: end.line,
    endColumn: end.column,
  };
}

function spanAt(source, needle, length = needle.length) {
  const offset = source.indexOf(needle);
  if (offset < 0) throw new Error(`Could not locate ${JSON.stringify(needle)} in fixture source.`);
  return span(source, offset, offset + length);
}

function coverage(productions = [], nodes = [], capabilities = [], operators = []) {
  return { productions, nodes, capabilities, operators };
}

function accepted(id, entryKind, source, expected, covers = coverage(), options = {}) {
  return { id, entryKind, source, covers, ...options, expected };
}

function diagnostic(code, phase, source, sourceSpan) {
  const safeSource = typeof source === "string" ? source : "";
  return {
    code,
    phase,
    span: sourceSpan ?? span(safeSource, 0, safeSource.length),
    partialEffects: false,
  };
}

function rejected(id, entryKind, source, code, phase, options = {}) {
  const { sourceSpan, ...rest } = options;
  return {
    id,
    entryKind,
    source,
    ...rest,
    diagnostic: diagnostic(code, phase, source, sourceSpan),
  };
}

function limit(name, relation) {
  const value = limits[name] + (relation === "above" ? 1 : 0);
  return { name, relation, value };
}

function tokenBoundary(extraUnary = 0) {
  const items = Array.from({ length: 64 }, () => "(([]))").join(",");
  return `${"!".repeat(62 + extraUnary)}[${items}]`;
}

function astBoundary(extraUnary = 0) {
  const items = Array.from({ length: 64 }, (_, index) =>
    index < 63 + extraUnary ? "[-0,0]" : "[0,0]",
  );
  return `[${items.join(",")}]`;
}

function stepBoundary(extraUnary = 0) {
  const items = [...Array.from({ length: 63 }, () => "[0]"), `${"-".repeat(extraUnary)}0`];
  return `[${items.join(",")}]`;
}

function sourceLengthBoundary(extra = 0) {
  return `0${" ".repeat(limits.sourceLength - 1 + extra)}`;
}

function literalBoundary(extra = 0) {
  return `[${Array.from({ length: limits.literalEntries + extra }, () => "0").join(",")}]`;
}

function nestingBoundary(extra = 0) {
  const count = limits.nesting + extra;
  return `${"(".repeat(count)}0${")".repeat(count)}`;
}

function pathBoundary(extra = 0) {
  return `state.${Array.from({ length: limits.pathSegments + extra }, (_, index) =>
    String.fromCharCode(97 + index),
  ).join(".")}`;
}

function argumentBoundary(extra = 0) {
  const args = ["'save'", ...Array.from({ length: 7 + extra }, (_, index) => String(index))];
  return `action(${args.join(",")})`;
}

function asyncBoundary(extra = 0) {
  return `${Array.from({ length: limits.asyncChain + extra }, () => "await action('tick')").join(";")};return ${limits.asyncChain + extra}`;
}

function acceptedCorpus() {
  const cases = [
    accepted(
      "literal-array",
      "value",
      `[null, true, false, 0, 1.5, "ok"]`,
      { outcome: "value", value: [null, true, false, 0, 1.5, "ok"] },
      coverage(
        [
          "value-input",
          "assignment-expression",
          "conditional-expression",
          "nullish-expression",
          "logical-or-expression",
          "logical-and-expression",
          "equality-expression",
          "relational-expression",
          "additive-expression",
          "multiplicative-expression",
          "unary-expression",
          "update-expression",
          "member-expression",
          "primary-expression",
          "literal",
          "array-literal",
        ],
        ["array-literal", "literal"],
        ["primitive", "array"],
      ),
    ),
    accepted(
      "object-literal",
      "value",
      `{ name: 'Ada', "count": 2 }`,
      { outcome: "value", value: { name: "Ada", count: 2 } },
      coverage(
        ["object-literal", "object-property"],
        ["object-literal", "object-property"],
        ["plain-data"],
      ),
    ),
    accepted(
      "all-bindings",
      "value",
      "[$count,state.count,signals.count,computed.double,args[0],evt.type,el.value,root.id,$el.length,$root.length]",
      { outcome: "value", value: [2, 2, 2, 4, "input", "click", "save", "app", 1, 1] },
      coverage(
        ["binding-reference", "signal-reference", "member-expression", "computed-member"],
        ["binding", "signal", "member"],
        ["state", "computed", "arguments", "event", "dom-element", "jquery"],
      ),
      { fixture: "all-bindings" },
    ),
    accepted(
      "unary-operators",
      "value",
      "[-2,+2,!false]",
      { outcome: "value", value: [-2, 2, true] },
      coverage(["unary-expression"], ["unary"], ["primitive"], ["unary"]),
    ),
    accepted(
      "arithmetic-precedence",
      "value",
      "1 + 2 * 3 - 4 / 2 % 2",
      { outcome: "value", value: 7 },
      coverage(
        ["additive-expression", "multiplicative-expression"],
        ["binary"],
        ["primitive"],
        ["additive", "multiplicative"],
      ),
    ),
    accepted(
      "relational-equality",
      "value",
      "1 + 2 === 3 && 'b' > 'a' && 2 !== 3",
      { outcome: "value", value: true },
      coverage(
        ["equality-expression", "relational-expression", "logical-and-expression"],
        ["binary", "logical"],
        ["primitive"],
        ["equality", "relational", "logical-and"],
      ),
    ),
    accepted(
      "short-circuit",
      "value",
      "false && action('never') || true",
      { outcome: "value", value: true, calls: [] },
      coverage(
        ["logical-and-expression", "logical-or-expression"],
        ["logical"],
        ["action"],
        ["logical-and", "logical-or"],
      ),
      { fixture: "actions" },
    ),
    accepted(
      "nullish-conditional",
      "value",
      "state.missing ?? ($count > 0 ? 'yes' : 'no')",
      { outcome: "value", value: "yes" },
      coverage(
        ["nullish-expression", "conditional-expression"],
        ["logical", "conditional"],
        ["state", "primitive"],
        ["nullish", "conditional"],
      ),
      { fixture: "state-count" },
    ),
    accepted(
      "computed-member",
      "value",
      "state['pro' + 'file'].name",
      { outcome: "value", value: "Ada" },
      coverage(
        ["computed-member", "member-expression"],
        ["member", "binary"],
        ["state", "plain-data"],
      ),
      { fixture: "profile" },
    ),
    accepted(
      "signal-state-assignment",
      "statement",
      "$count = 2; state.total = $count * 2; return state.total",
      { outcome: "state", value: 4, state: { count: 2, total: 4 } },
      coverage(
        [
          "statement-input",
          "statement-list",
          "expression-statement",
          "return-statement",
          "assignment-expression",
        ],
        ["program", "expression-statement", "return-statement", "assignment"],
        ["state"],
        ["assignment"],
      ),
      { fixture: "state-count" },
    ),
    accepted(
      "compound-assignment",
      "statement",
      "$count += 5; $count -= 1; $count *= 2; $count /= 3; $count %= 4; return $count",
      { outcome: "state", value: 0, state: { count: 0 } },
      coverage(["assignment-expression"], ["assignment"], ["state"], ["assignment"]),
      { fixture: "state-count" },
    ),
    accepted(
      "postfix-update",
      "statement",
      "$count++; $count--; return $count",
      { outcome: "state", value: 2, state: { count: 2 } },
      coverage(["update-expression"], ["update"], ["state"], ["postfix"]),
      { fixture: "state-count" },
    ),
    accepted(
      "empty-return",
      "statement",
      "return",
      { outcome: "undefined" },
      coverage(["return-statement"], ["program", "return-statement"], ["primitive"]),
    ),
    accepted(
      "action-shorthand",
      "statement",
      "@save($count,args[0])",
      {
        outcome: "async-value",
        value: "saved",
        calls: [{ target: "save", arguments: [2, "input"] }],
      },
      coverage(
        ["action-shorthand", "argument-list"],
        ["program", "action-call"],
        ["action", "approved-async", "call-result"],
      ),
      { fixture: "actions" },
    ),
    accepted(
      "action-call",
      "value",
      "action('save',$count)",
      { outcome: "async-value", value: "saved", calls: [{ target: "save", arguments: [2] }] },
      coverage(
        ["action-call", "argument-list"],
        ["action-call"],
        ["action", "approved-async", "call-result"],
      ),
      { fixture: "actions" },
    ),
    accepted(
      "helper-call",
      "value",
      "acme.math.sum($count,2)",
      { outcome: "value", value: 4, calls: [{ target: "acme.math.sum", arguments: [2, 2] }] },
      coverage(["helper-call", "argument-list"], ["helper-call"], ["helper", "call-result"]),
      { fixture: "helpers" },
    ),
    accepted(
      "jquery-chain",
      "statement",
      "$(el).closest('[data-jqs]').find('[data-part=label]').text('Saved')",
      { outcome: "effect" },
      coverage(
        ["jquery-call", "method-call", "argument-list"],
        ["jquery-call", "method-call"],
        ["jquery", "dom-element"],
        ["member-call"],
      ),
      { fixture: "jquery-tree" },
    ),
    accepted(
      "jquery-read",
      "value",
      "$(el).attr('data-role')",
      { outcome: "value", value: "save" },
      coverage(
        ["jquery-call", "method-call"],
        ["jquery-call", "method-call"],
        ["jquery", "dom-element"],
      ),
      { fixture: "jquery-tree" },
    ),
    accepted(
      "string-method",
      "value",
      "$name.trim().toUpperCase()",
      { outcome: "value", value: "ADA" },
      coverage(["method-call"], ["method-call"], ["state", "string"]),
      { fixture: "name" },
    ),
    accepted(
      "array-method",
      "value",
      "args.slice(0,2).join('-')",
      { outcome: "value", value: "a-b" },
      coverage(["method-call"], ["method-call"], ["arguments", "array", "string"]),
      { fixture: "array-arguments" },
    ),
    accepted(
      "event-method",
      "statement",
      "evt.preventDefault(); return evt.defaultPrevented",
      { outcome: "value", value: true },
      coverage(["method-call"], ["program", "method-call", "return-statement"], ["event"]),
      { fixture: "cancelable-event" },
    ),
    accepted(
      "approved-async",
      "statement",
      "await action('load'); $count += 1; return $count",
      { outcome: "async-value", value: 3, state: { count: 3 } },
      coverage(
        ["await-expression"],
        ["program", "await", "action-call", "assignment"],
        ["action", "approved-async", "state"],
      ),
      { fixture: "actions" },
    ),
    accepted(
      "property-absence",
      "value",
      "state.missing",
      { outcome: "undefined" },
      coverage(["member-expression"], ["member"], ["state", "plain-data"]),
      { fixture: "state-count" },
    ),
    accepted(
      "multiline-span",
      "value",
      "(\n  $count +\n  2\n)",
      { outcome: "value", value: 4 },
      coverage(
        ["value-input", "additive-expression"],
        ["binary", "signal", "literal"],
        ["state", "primitive"],
      ),
      {
        fixture: "state-count",
        ast: {
          root: 0,
          nodes: [
            { kind: "binary", span: span("(\n  $count +\n  2\n)", 4, 16), children: [1, 2] },
            { kind: "signal", span: span("(\n  $count +\n  2\n)", 4, 10) },
            { kind: "literal", span: span("(\n  $count +\n  2\n)", 15, 16) },
          ],
        },
      },
    ),
  ];

  const boundaryCases = [
    accepted(
      "limit-source-length",
      "value",
      sourceLengthBoundary(),
      { outcome: "compiled" },
      coverage(),
      {
        limit: limit("sourceLength", "at"),
      },
    ),
    accepted("limit-tokens", "value", tokenBoundary(), { outcome: "compiled" }, coverage(), {
      limit: limit("tokens", "at"),
    }),
    accepted("limit-nesting", "value", nestingBoundary(), { outcome: "compiled" }, coverage(), {
      limit: limit("nesting", "at"),
    }),
    accepted("limit-ast-nodes", "value", astBoundary(), { outcome: "compiled" }, coverage(), {
      limit: limit("astNodes", "at"),
    }),
    accepted(
      "limit-literal-entries",
      "value",
      literalBoundary(),
      { outcome: "compiled" },
      coverage(),
      {
        limit: limit("literalEntries", "at"),
      },
    ),
    accepted("limit-path-segments", "value", pathBoundary(), { outcome: "compiled" }, coverage(), {
      fixture: "deep-state",
      limit: limit("pathSegments", "at"),
    }),
    accepted(
      "limit-call-arguments",
      "value",
      argumentBoundary(),
      { outcome: "compiled" },
      coverage(),
      {
        limit: limit("callArguments", "at"),
      },
    ),
    accepted("limit-evaluation-steps", "value", stepBoundary(), { outcome: "value" }, coverage(), {
      limit: limit("evaluationSteps", "at"),
    }),
    accepted(
      "limit-collection-size",
      "value",
      "$('.item').length",
      { outcome: "value", value: 128 },
      coverage(),
      {
        fixture: "collection-128",
        limit: limit("collectionSize", "at"),
      },
    ),
    accepted(
      "limit-async-chain",
      "statement",
      asyncBoundary(),
      { outcome: "async-value", value: 8 },
      coverage(),
      {
        fixture: "async-ticks",
        limit: limit("asyncChain", "at"),
      },
    ),
  ];

  return {
    $schema: CSP_SCHEMA_PATH,
    schema: "jqstar-csp-accepted/1",
    grammarVersion: CSP_GRAMMAR_VERSION,
    ownerTicket: "0034",
    cases: [...cases, ...boundaryCases],
  };
}

function deniedCorpus() {
  const sourceAbove = sourceLengthBoundary(1);
  const tokenAbove = tokenBoundary(1);
  const nestingAbove = nestingBoundary(1);
  const astAbove = astBoundary(1);
  const literalAbove = literalBoundary(1);
  const pathAbove = pathBoundary(1);
  const argumentsAbove = argumentBoundary(1);
  const stepsAbove = stepBoundary(1);
  const asyncAbove = asyncBoundary(1);
  const invalidEscape = "'\\x41'";
  const cases = [
    rejected("non-string-source", "value", null, "CSP_SOURCE_TYPE", "compile"),
    rejected("source-length-above", "value", sourceAbove, "CSP_LIMIT_SOURCE_LENGTH", "compile", {
      limit: limit("sourceLength", "above"),
      sourceSpan: span(sourceAbove, limits.sourceLength, limits.sourceLength + 1),
    }),
    rejected("invalid-character", "value", "#", "CSP_TOKEN_INVALID_CHARACTER", "compile"),
    rejected("invalid-escape", "value", invalidEscape, "CSP_TOKEN_INVALID_ESCAPE", "compile", {
      sourceSpan: spanAt(invalidEscape, "\\x"),
    }),
    rejected("invalid-number", "value", "01", "CSP_TOKEN_NUMBER", "compile"),
    rejected("unterminated-string", "value", "'abc", "CSP_TOKEN_UNTERMINATED_STRING", "compile"),
    rejected("unexpected-token", "value", "]", "CSP_PARSE_UNEXPECTED_TOKEN", "compile"),
    rejected("expected-token", "value", "state[", "CSP_PARSE_EXPECTED_TOKEN", "compile", {
      sourceSpan: span("state[", 6, 6),
    }),
    rejected("trailing-input", "value", "true false", "CSP_PARSE_TRAILING_INPUT", "compile", {
      sourceSpan: spanAt("true false", "false"),
    }),
    rejected("duplicate-object-key", "value", "{a:1,'a':2}", "CSP_PARSE_DUPLICATE_KEY", "compile", {
      sourceSpan: spanAt("{a:1,'a':2}", "'a'"),
    }),
    rejected("ambient-identifier", "value", "globalThis", "CSP_CAPABILITY_IDENTIFIER", "compile"),
    rejected(
      "eval-identifier",
      "value",
      ["eval", "('1')"].join(""),
      "CSP_CAPABILITY_IDENTIFIER",
      "compile",
    ),
    rejected(
      "function-identifier",
      "value",
      "Function('return 1')",
      "CSP_CAPABILITY_IDENTIFIER",
      "compile",
    ),
    rejected(
      "string-timer-identifier",
      "value",
      "setTimeout('run()', 0)",
      "CSP_CAPABILITY_IDENTIFIER",
      "compile",
    ),
    rejected(
      "invalid-lvalue",
      "statement",
      "computed.total = 1",
      "CSP_CAPABILITY_LVALUE",
      "compile",
      {
        sourceSpan: spanAt("computed.total = 1", "computed.total"),
      },
    ),
    rejected(
      "denied-property",
      "value",
      "state['constructor']",
      "CSP_CAPABILITY_PROPERTY",
      "evaluate",
      {
        fixture: "state-count",
        sourceSpan: spanAt("state['constructor']", "'constructor'"),
      },
    ),
    rejected("denied-call", "value", "state.fn()", "CSP_CAPABILITY_CALL", "evaluate", {
      fixture: "state-function",
      sourceSpan: spanAt("state.fn()", "fn"),
    }),
    rejected("denied-accessor", "value", "state.secret", "CSP_CAPABILITY_ACCESSOR", "evaluate", {
      fixture: "state-accessor",
    }),
    rejected(
      "denied-function-value",
      "value",
      "acme.tools.functionValue()",
      "CSP_CAPABILITY_VALUE",
      "evaluate",
      {
        fixture: "helper-function-result",
      },
    ),
    rejected("missing-path", "value", "state.missing.name", "CSP_PROPERTY_ABSENT", "evaluate", {
      fixture: "state-count",
      sourceSpan: spanAt("state.missing.name", "name"),
    }),
    rejected("non-finite-number", "value", "1 / 0", "CSP_EVALUATE_NUMBER", "evaluate"),
    rejected("mixed-relational-types", "value", "1 < '2'", "CSP_EVALUATE_TYPE", "evaluate"),
    rejected("cyclic-path", "value", "state.self.self", "CSP_EVALUATE_CYCLE", "evaluate", {
      fixture: "state-cycle",
    }),
    rejected(
      "arbitrary-thenable",
      "value",
      "acme.tools.thenable()",
      "CSP_ASYNC_VALUE",
      "evaluate",
      {
        fixture: "helper-thenable-result",
      },
    ),
    rejected(
      "async-rejection",
      "statement",
      "await action('reject')",
      "CSP_ASYNC_REJECTION",
      "evaluate",
      {
        fixture: "rejecting-action",
      },
    ),
    rejected("disposed-evaluator", "value", "$count", "CSP_ENGINE_DISPOSED", "evaluate", {
      fixture: "disposed-engine",
    }),
    rejected("token-limit-above", "value", tokenAbove, "CSP_LIMIT_TOKENS", "compile", {
      limit: limit("tokens", "above"),
      sourceSpan: span(tokenAbove, 0, 1),
    }),
    rejected("nesting-limit-above", "value", nestingAbove, "CSP_LIMIT_NESTING", "compile", {
      limit: limit("nesting", "above"),
      sourceSpan: span(nestingAbove, limits.nesting, limits.nesting + 1),
    }),
    rejected("ast-node-limit-above", "value", astAbove, "CSP_LIMIT_AST_NODES", "compile", {
      limit: limit("astNodes", "above"),
    }),
    rejected(
      "literal-entry-limit-above",
      "value",
      literalAbove,
      "CSP_LIMIT_LITERAL_ENTRIES",
      "compile",
      {
        limit: limit("literalEntries", "above"),
      },
    ),
    rejected("path-limit-above", "value", pathAbove, "CSP_LIMIT_PATH_SEGMENTS", "compile", {
      limit: limit("pathSegments", "above"),
      sourceSpan: spanAt(pathAbove, ".i", 2),
    }),
    rejected(
      "argument-limit-above",
      "value",
      argumentsAbove,
      "CSP_LIMIT_CALL_ARGUMENTS",
      "compile",
      {
        limit: limit("callArguments", "above"),
        sourceSpan: spanAt(argumentsAbove, ",7", 2),
      },
    ),
    rejected("step-limit-above", "value", stepsAbove, "CSP_LIMIT_EVALUATION_STEPS", "evaluate", {
      limit: limit("evaluationSteps", "above"),
    }),
    rejected(
      "collection-limit-above",
      "value",
      "$('.item').length",
      "CSP_LIMIT_COLLECTION_SIZE",
      "evaluate",
      {
        fixture: "collection-129",
        limit: limit("collectionSize", "above"),
      },
    ),
    rejected("async-limit-above", "statement", asyncAbove, "CSP_LIMIT_ASYNC_CHAIN", "evaluate", {
      fixture: "async-ticks",
      limit: limit("asyncChain", "above"),
    }),
  ];

  const unsupported = [
    ["comment-line", "true // comment"],
    ["comment-block", "true /* comment */"],
    ["template-literal", "`value`"],
    ["regular-expression", "/value/"],
    ["variable-declaration", "let value = 1"],
    ["arrow-function", "() => 1"],
    ["function-expression", "function () {}"],
    ["class-expression", "class Value {}"],
    ["new-expression", "new Date()"],
    ["this-expression", "this"],
    ["if-statement", "if (true) $count = 1"],
    ["loop-statement", "while (true) {}"],
    ["switch-statement", "switch ($count) {}"],
    ["try-statement", "try {} catch (error) {}"],
    ["throw-statement", "throw 'no'"],
    ["dynamic-import", "import('module')"],
    ["static-import", "import value from 'module'"],
    ["optional-chain", "state?.value"],
    ["nullish-assignment", "$count ??= 1"],
    ["prefix-update", "++$count"],
    ["spread", "[...args]"],
    ["destructure", "[$count] = args"],
  ].map(([id, source]) =>
    rejected(id, "statement", source, "CSP_PARSE_UNSUPPORTED_SYNTAX", "compile"),
  );

  return {
    $schema: CSP_SCHEMA_PATH,
    schema: "jqstar-csp-denied/1",
    grammarVersion: CSP_GRAMMAR_VERSION,
    ownerTicket: "0034",
    cases: [...cases, ...unsupported],
  };
}

function adversarialCorpus() {
  const compile = (id, source, category, code = "CSP_CAPABILITY_IDENTIFIER") =>
    rejected(id, "value", source, code, "compile", { category });
  const evaluate = (id, source, category, code, fixture) =>
    rejected(id, "value", source, code, "evaluate", {
      category,
      ...(fixture ? { fixture } : {}),
    });

  const cases = [
    compile("eval-call", ["eval", "('1')"].join(""), "dynamic-code"),
    compile("function-constructor", "Function('return 1')", "dynamic-code"),
    compile("string-timeout", "setTimeout('run()', 0)", "dynamic-code"),
    compile(
      "dynamic-import-payload",
      "import('data:text/javascript,1')",
      "dynamic-code",
      "CSP_PARSE_UNSUPPORTED_SYNTAX",
    ),
    compile("global-this", "globalThis", "ambient-global"),
    compile("window-global", "window", "ambient-global"),
    compile("document-global", "document", "ambient-global"),
    compile("self-global", "self", "ambient-global"),
    compile("top-global", "top", "ambient-global"),
    compile("parent-global", "parent", "ambient-global"),
    compile("object-global", "Object", "reflective-access"),
    compile("reflect-global", "Reflect", "reflective-access"),
    compile("proxy-global", "Proxy", "reflective-access"),
    compile("webassembly-global", "WebAssembly", "dynamic-code"),
    evaluate(
      "constructor-dot",
      "state.value.constructor",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "state-value",
    ),
    evaluate(
      "constructor-bracket",
      "state.value['constructor']",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "state-value",
    ),
    evaluate(
      "constructor-escaped",
      String.raw`state.value['\u0063onstructor']`,
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "state-value",
    ),
    evaluate(
      "constructor-concatenated",
      "state.value['con' + 'structor']",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "state-value",
    ),
    compile(
      "constructor-optional",
      "state.value?.constructor",
      "prototype-constructor",
      "CSP_PARSE_UNSUPPORTED_SYNTAX",
    ),
    evaluate(
      "prototype-bracket",
      "state.value['prototype']",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "state-value",
    ),
    evaluate(
      "proto-bracket",
      "state.value['__proto__']",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "state-value",
    ),
    evaluate(
      "array-constructor-chain",
      "[].constructor.constructor",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
    ),
    evaluate(
      "string-constructor-chain",
      "''.constructor.constructor",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
    ),
    evaluate(
      "jquery-constructor-chain",
      "$(el).constructor.constructor",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "jquery-tree",
    ),
    evaluate(
      "helper-result-constructor",
      "acme.tools.value().constructor",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "helper-data-result",
    ),
    evaluate(
      "action-result-prototype",
      "action('value').prototype",
      "prototype-constructor",
      "CSP_CAPABILITY_PROPERTY",
      "action-data-result",
    ),
    evaluate(
      "call-property",
      "state.fn.call(null)",
      "callable-escalation",
      "CSP_CAPABILITY_CALL",
      "state-function",
    ),
    evaluate(
      "apply-property",
      "state.fn.apply(null, [])",
      "callable-escalation",
      "CSP_CAPABILITY_CALL",
      "state-function",
    ),
    evaluate(
      "bind-property",
      "state.fn.bind(null)",
      "callable-escalation",
      "CSP_CAPABILITY_CALL",
      "state-function",
    ),
    evaluate(
      "result-call",
      "acme.tools.functionValue()()",
      "callable-escalation",
      "CSP_CAPABILITY_CALL",
      "helper-function-result",
    ),
    evaluate(
      "getter-member",
      "state.secret",
      "accessor-proxy",
      "CSP_CAPABILITY_ACCESSOR",
      "state-accessor",
    ),
    evaluate(
      "proxy-member",
      "state.proxy.secret",
      "accessor-proxy",
      "CSP_CAPABILITY_ACCESSOR",
      "state-proxy",
    ),
    evaluate("cyclic-data", "state.self.self", "cycle", "CSP_EVALUATE_CYCLE", "state-cycle"),
    evaluate(
      "dynamic-selector",
      "$(state.selector)",
      "selector-html",
      "CSP_CAPABILITY_VALUE",
      "state-selector",
    ),
    evaluate(
      "dynamic-html",
      "$(el).html(state.html)",
      "selector-html",
      "CSP_CAPABILITY_VALUE",
      "state-html",
    ),
    evaluate(
      "action-returned-function",
      "action('functionValue')",
      "action-helper",
      "CSP_CAPABILITY_VALUE",
      "action-function-result",
    ),
    evaluate(
      "helper-returned-function",
      "acme.tools.functionValue()",
      "action-helper",
      "CSP_CAPABILITY_VALUE",
      "helper-function-result",
    ),
    evaluate(
      "plugin-returned-jquery",
      "acme.tools.jquery()",
      "plugin-authority",
      "CSP_CAPABILITY_VALUE",
      "helper-jquery-result",
    ),
    evaluate(
      "request-data-call",
      "state.response.callback()",
      "request-patch",
      "CSP_CAPABILITY_CALL",
      "response-function-shape",
    ),
    evaluate(
      "event-data-call",
      "evt.detail.callback()",
      "data-to-code",
      "CSP_CAPABILITY_CALL",
      "event-function-shape",
    ),
    evaluate(
      "foreign-element",
      "$(state.foreignElement)",
      "cross-realm",
      "CSP_CAPABILITY_VALUE",
      "foreign-element",
    ),
    evaluate(
      "foreign-jquery",
      "state.foreignJQuery.text()",
      "cross-realm",
      "CSP_CAPABILITY_CALL",
      "foreign-jquery",
    ),
    evaluate(
      "jquery-event-registration",
      "$(el).on('click',state.fn)",
      "jquery-dom",
      "CSP_CAPABILITY_CALL",
      "state-function",
    ),
    evaluate(
      "diagnostic-secret",
      "state.secret.deep",
      "diagnostic-disclosure",
      "CSP_CAPABILITY_ACCESSOR",
      "state-secret-accessor",
    ),
    rejected("deep-input", "value", nestingBoundary(1), "CSP_LIMIT_NESTING", "compile", {
      category: "resource-exhaustion",
      limit: limit("nesting", "above"),
      sourceSpan: span(nestingBoundary(1), limits.nesting, limits.nesting + 1),
    }),
    rejected("wide-input", "value", literalBoundary(1), "CSP_LIMIT_LITERAL_ENTRIES", "compile", {
      category: "resource-exhaustion",
      limit: limit("literalEntries", "above"),
    }),
  ];

  return {
    $schema: CSP_SCHEMA_PATH,
    schema: "jqstar-csp-adversarial/1",
    grammarVersion: CSP_GRAMMAR_VERSION,
    ownerTicket: "0034",
    cases,
  };
}

async function walk(root, path, files) {
  const details = await stat(path);
  if (details.isDirectory()) {
    const names = await readdir(path);
    for (const name of names.sort()) await walk(root, join(path, name), files);
    return;
  }
  if (extensions.includes(extname(path))) files.push(relative(root, path).replaceAll("\\", "/"));
}

export async function collectPublicExpressionInventory(repositoryRoot) {
  const files = [];
  for (const root of roots) await walk(repositoryRoot, resolve(repositoryRoot, root), files);
  const sources = new Map();
  for (const path of files.sort()) {
    const text = await readFile(resolve(repositoryRoot, path), "utf8");
    expressionAttribute.lastIndex = 0;
    for (
      let match = expressionAttribute.exec(text);
      match;
      match = expressionAttribute.exec(text)
    ) {
      const source = match[3];
      const location = {
        path,
        line: text.slice(0, match.index).split("\n").length,
        attribute: match[1],
      };
      const locations = sources.get(source) ?? [];
      locations.push(location);
      sources.set(source, locations);
    }
  }
  return [...sources]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([source, locations]) => ({ source, locations }));
}

function exampleId(source) {
  return `public-${createHash("sha256").update(source).digest("hex").slice(0, 12)}`;
}

function publicDisposition(source) {
  if (/\bconsole\s*\./.test(source)) {
    return {
      disposition: "migration-required",
      caseId: "migration-registered-diagnostic",
      reason: "Ambient console access is outside the finite scope.",
      equivalent: "Move logging into a registered application action or helper.",
    };
  }
  if (/\bPromise\s*\./.test(source)) {
    return {
      disposition: "csp-equivalent",
      caseId: "csp-async-action",
      reason: "The ambient Promise constructor is denied.",
      equivalent: "Await the approved result of a registered action or helper.",
    };
  }
  if (/\bthis\b/.test(source)) {
    return {
      disposition: "csp-equivalent",
      caseId: "csp-context-bindings",
      reason: "The finite profile uses the explicit el binding.",
      equivalent: source.replaceAll(/\bthis\b/g, "el"),
    };
  }
  if (/^\s*@(?:get|post|put|patch|delete)\b/.test(source)) {
    return {
      disposition: "exact-parity",
      caseId: "csp-request-action",
      reason: "The source calls a registered backend action with finite arguments.",
    };
  }
  if (/^\s*@/.test(source)) {
    return {
      disposition: "exact-parity",
      caseId: "csp-named-action",
      reason: "The source uses the named-action statement form.",
    };
  }
  const methods = [...source.matchAll(/\.([A-Za-z_$][\w$]*)\s*\(/g)].map((match) => match[1]);
  const unknownMethods = methods.filter(
    (method) => !jqueryMethods.has(method) && !stringMethods.has(method),
  );
  if (unknownMethods.length > 0) {
    return {
      disposition: "migration-required",
      caseId: "migration-registered-integration",
      reason: `Method ${unknownMethods[0]} is not an approved jQuery or string method.`,
      equivalent: "Move the integration call into a registered application action.",
    };
  }
  if (/\$\([^)]*\)/.test(source)) {
    return {
      disposition: "exact-parity",
      caseId: "csp-jquery-supported",
      reason: "Every jQuery call uses the reviewed constructor and method table.",
    };
  }
  if (/\$[A-Za-z_][\w]*\s*(?:\+\+|--|[+\-*/%]?=)/.test(source)) {
    return {
      disposition: "exact-parity",
      caseId: "csp-signal-write",
      reason: "The source writes only approved signal l-values.",
    };
  }
  if (/^\s*\{/.test(source)) {
    return {
      disposition: "exact-parity",
      caseId: "csp-state-literal",
      reason: "The source is a bounded state object literal.",
    };
  }
  return {
    disposition: "exact-parity",
    caseId: "csp-value-expression",
    reason: "The source uses finite literals, signals, paths, and reviewed operators.",
  };
}

async function conformanceMap(repositoryRoot) {
  const inventory = await collectPublicExpressionInventory(repositoryRoot);
  const publicExamples = inventory.map(({ source, locations }) => ({
    id: exampleId(source),
    source,
    locations,
    ...publicDisposition(source),
  }));
  return {
    $schema: CSP_SCHEMA_PATH,
    schema: "jqstar-csp-conformance-map/1",
    grammarVersion: CSP_GRAMMAR_VERSION,
    ownerTicket: "0035",
    inventoryScope: {
      roots,
      extensions,
      extractorVersion: "jqstar-public-expression-inventory/1",
    },
    featureCases: [
      {
        id: "signals",
        disposition: "exact-parity",
        downstreamCaseId: "csp-signal-state",
        reason: "Signal reads and writes use finite state capabilities.",
      },
      {
        id: "events",
        disposition: "exact-parity",
        downstreamCaseId: "csp-event-context",
        reason: "Reviewed event members and two event methods are explicit capabilities.",
      },
      {
        id: "actions",
        disposition: "exact-parity",
        downstreamCaseId: "csp-action-order",
        reason: "Literal named actions preserve argument and completion order.",
      },
      {
        id: "helpers",
        disposition: "exact-parity",
        downstreamCaseId: "csp-helper-origin",
        reason: "Committed helper leaves are explicit call origins.",
      },
      {
        id: "generic-requests",
        disposition: "exact-parity",
        downstreamCaseId: "csp-browser-generic-request",
        reason: "Registered backend actions retain generic protocol behavior.",
      },
      {
        id: "datastar-requests",
        disposition: "exact-parity",
        downstreamCaseId: "csp-browser-datastar-request",
        reason: "Registered backend actions retain Datastar profile behavior.",
      },
      {
        id: "patches",
        disposition: "csp-equivalent",
        downstreamCaseId: "csp-browser-datastar-patch",
        reason: "Patches are action/profile results, not grammar productions.",
        equivalent: "Invoke the registered request action and observe its owned patch result.",
      },
      {
        id: "async-results",
        disposition: "csp-equivalent",
        downstreamCaseId: "csp-async-action",
        reason: "Only approved action/helper results cross the async boundary.",
        equivalent: "await action('load')",
      },
      {
        id: "short-circuit",
        disposition: "exact-parity",
        downstreamCaseId: "csp-short-circuit-order",
        reason: "Logical and conditional branches have fixed left-to-right selection.",
      },
      {
        id: "jquery",
        disposition: "exact-parity",
        downstreamCaseId: "csp-jquery-table",
        reason: "The reviewed method subset preserves its documented public examples.",
      },
      {
        id: "public-value",
        disposition: "exact-parity",
        downstreamCaseId: "csp-value-expression",
        reason: "Public literal, signal, path, and operator examples use the finite value grammar.",
      },
      {
        id: "public-signal-write",
        disposition: "exact-parity",
        downstreamCaseId: "csp-signal-write",
        reason: "Public assignments and updates use approved signal l-values.",
      },
      {
        id: "public-state-literal",
        disposition: "exact-parity",
        downstreamCaseId: "csp-state-literal",
        reason: "Public state initializers are bounded object literals.",
      },
      {
        id: "public-action",
        disposition: "exact-parity",
        downstreamCaseId: "csp-named-action",
        reason: "Public action shorthands use literal registered names.",
      },
      {
        id: "public-request",
        disposition: "exact-parity",
        downstreamCaseId: "csp-request-action",
        reason: "Public backend shorthands use registered request actions.",
      },
      {
        id: "public-jquery",
        disposition: "exact-parity",
        downstreamCaseId: "csp-jquery-supported",
        reason: "Public jQuery examples stay inside the reviewed method table.",
      },
      {
        id: "ambient-javascript",
        disposition: "intentionally-unsupported",
        downstreamCaseId: "csp-denied-ambient-javascript",
        reason: "Ambient JavaScript authority is outside the finite profile.",
      },
      {
        id: "diagnostic-migration",
        disposition: "migration-required",
        downstreamCaseId: "migration-registered-diagnostic",
        reason: "Ambient diagnostics move behind a registered action/helper.",
        equivalent: "Register an application-owned diagnostic action or helper.",
      },
      {
        id: "integration-migration",
        disposition: "migration-required",
        downstreamCaseId: "migration-registered-integration",
        reason: "Arbitrary jQuery plugins move behind a registered integration action.",
        equivalent: "Register an application-owned integration action.",
      },
    ],
    sharedCases: [
      {
        id: "values-and-statements",
        disposition: "exact-parity",
        downstreamCaseId: "csp-shared-values-statements",
        reason: "Finite values, signals, state aliases, and assignment are supported.",
      },
      {
        id: "jquery-and-context",
        disposition: "csp-equivalent",
        downstreamCaseId: "csp-shared-jquery-context",
        reason: "All bindings except implicit this are explicit.",
        equivalent: "Use el where the trusted case uses this.",
      },
      {
        id: "helpers-and-fixed-bindings",
        disposition: "exact-parity",
        downstreamCaseId: "csp-shared-helpers",
        reason:
          "Committed helpers and fixed-binding protection are part of the capability contract.",
      },
      {
        id: "named-actions",
        disposition: "exact-parity",
        downstreamCaseId: "csp-shared-actions",
        reason: "Both action statement forms use literal names and bounded arguments.",
      },
      {
        id: "asynchronous-results",
        disposition: "csp-equivalent",
        downstreamCaseId: "csp-shared-async",
        reason: "Ambient Promise is excluded.",
        equivalent: "Use an approved asynchronous registered action/helper result.",
      },
      {
        id: "location-aware-errors",
        disposition: "csp-equivalent",
        downstreamCaseId: "csp-shared-errors",
        reason:
          "CSP diagnostics add stable codes and exact spans while retaining the public error shape.",
        equivalent: "Assert the frozen CSP diagnostic code, phase, source, attribute, and span.",
      },
    ],
    publicExamples,
  };
}

export async function buildCspContractArtifacts(repositoryRoot) {
  const serialize = (value) => format(JSON.stringify(value), { parser: "json", printWidth: 100 });
  return new Map([
    ["test/fixtures/csp/accepted.json", await serialize(acceptedCorpus())],
    ["test/fixtures/csp/denied.json", await serialize(deniedCorpus())],
    ["test/fixtures/csp/adversarial.json", await serialize(adversarialCorpus())],
    ["test/fixtures/csp/contexts.json", await serialize(contextFixtures())],
    [
      "test/fixtures/csp/conformance-map.json",
      await serialize(await conformanceMap(repositoryRoot)),
    ],
  ]);
}

export async function writeCspContractArtifacts(repositoryRoot) {
  const artifacts = await buildCspContractArtifacts(repositoryRoot);
  for (const [path, contents] of artifacts)
    await writeFile(resolve(repositoryRoot, path), contents);
  return artifacts;
}

async function main() {
  const repositoryRoot = resolve(fileURLToPath(new URL("..", import.meta.url)));
  const artifacts = await writeCspContractArtifacts(repositoryRoot);
  process.stdout.write(`Wrote ${artifacts.size} CSP contract artifacts.\n`);
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) await main();

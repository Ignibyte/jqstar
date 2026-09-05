# CSP expression contract

## Status and security meaning

`jqstar-csp-expression/1` is the shipped finite language contract for `jquery-star/csp`. The package
entry provides the tokenizer, parser, evaluator, engine factory, and explicit installer. Its ESM and
CommonJS formats have matched declarations and no import-time installation or DOM-scanning side
effect.

The CSP engine means **no dynamic code construction** inside its entry graph. It does not use
`eval`, `Function`, string timers, dynamic import, WebAssembly compilation, or another
source-to-code path. It still requires trusted markup and trusted installed extensions. It is not a
sandbox and does not make attacker-authored expressions safe. The page's Content Security Policy
governs inline scripts, styles, network endpoints, third-party jQuery plugins, and application code.

An approved expression can mutate reactive state, select and mutate DOM through the finite jQuery
table, invoke registered actions and helpers, insert application-trusted literal HTML, and start a
request through a registered action. Applications still own authorization, CSRF protection, output
encoding, sanitization, Trusted Types, and server validation.

## Installation and engine selection

Import the CSP entry directly and install it before plugins or applications claim the jQuery
instance:

```ts
import $ from "jquery";
import { installStarCSP } from "jquery-star/csp";
import { datastarPlugin } from "jquery-star/datastar";
import { uiPlugin } from "jquery-star/ui";

const installed = installStarCSP($);
installed.star.use([datastarPlugin, uiPlugin]);
installed.star.boot(document);
```

Do not import the `jquery-star` compatibility root on that jQuery instance. The root keeps the
trusted JavaScript engine and auto-installs it for 0.1 compatibility. `installStarCSP()` returns the
existing installation when it already uses the CSP engine and rejects an incompatible live engine.
It never replaces an engine silently. Separate jQuery/kernel owners may select trusted and CSP
engines independently.

Advanced hosts can import `createCSPExpressionEngine()` and pass that unique engine to
`installStarCore($, { expressionEngine })`. The kernel owns the engine after installation. An engine
object cannot be reused by another kernel, and disposal invalidates retained evaluators. Use
`isStarCSPExpressionError()` to narrow structured diagnostics. The exported `CSP_GRAMMAR_VERSION`
and `CSP_CONTRACT_DIGEST` bind code and evidence to the frozen grammar.

The CommonJS entry exposes the same API through `require("jquery-star/csp")`.

## Server policy

Importing or installing the entry does not configure Content Security Policy headers. A strict
starting point used by the installed-package browser proof is:

```text
default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; font-src 'self'; base-uri 'none'; object-src 'none'; frame-ancestors 'none'; form-action 'self'
```

Adapt allowed origins and directives to the application. Inline scripts still need an
application-owned hash or nonce when used. If the browser reports `unsafe-eval`, verify that the
page imports `jquery-star/csp` rather than the package root and that no third-party script or jQuery
plugin constructs code. If installation reports an incompatible engine, dispose the old kernel or
use a separate jQuery/kernel owner instead of attempting replacement.

## Versioned files

The contract is the combination of these immutable inputs:

- `test/fixtures/csp/contract.json` defines vocabulary, limits, capabilities, methods, diagnostics,
  and threat categories.
- `test/fixtures/csp/accepted.json` defines accepted source, structural AST projections, results,
  operator-group coverage, and every at-limit vector.
- `test/fixtures/csp/denied.json` defines malformed and unsupported source plus one-above-limit
  diagnostics.
- `test/fixtures/csp/adversarial.json` defines capability-escalation and resource-abuse payloads.
- `test/fixtures/csp/contexts.json` defines the state, action, helper, DOM, event, lifecycle,
  hostile-value, and foreign-realm setup for every referenced fixture.
- `test/fixtures/csp/conformance-map.json` maps shared cases and every current public expression
  occurrence to a disposition.
- `schema/csp-expression-contract.schema.json` defines their shapes.

Each manifest names its downstream owner: ticket 0015 owns the vocabulary, ticket 0034 owns the
executable corpora and context recipes, and ticket 0035 owns browser conformance assignments.

The internal implementation pins the combined contract digest in `src/csp/contract.ts`. Successful
immutable programs use a per-engine LRU bounded to 128 entries and 262,144 source/key bytes. Failed
compilations and live contexts are not cached. Raw action and helper results cross an internal
origin-branded application runtime before settlement, so the evaluator can reject arbitrary
thenables without reading `then`. That runtime and its exact helper lookup are private; they do not
add fields to `StarContext` or `StarInstance`.

`npm run test:csp-contract` validates the combined contract and prints its SHA-256 digest. A change
to accepted or rejected source behavior requires a new grammar version and ticket. A patch may fix
wording or a diagnostic description only when the corpora, limits, AST, results, and error selection
remain identical.

### Context recipes

Each corpus case runs in a fresh context. The context builder processes the selected fixture's steps
in order and records every registered action/helper call. `data-binding` initializes fresh state,
computed, or argument data. `event` creates the named event with the exact cancelable flag and
detail. `dom-tree` mounts the markup in the kernel's canonical window and resolves exactly one root
and element with the supplied selectors; that window's jQuery instance is the canonical peer.
`dom-collection` creates a fresh `data-jqs` root containing exactly `count` sibling elements that
match `selector`.

Action/helper behavior is closed: it returns data, sums finite numeric arguments, returns a
function, exposes an ordinary thenable, returns a branded approved async fulfillment/rejection, or
returns canonical jQuery. `special-value` installs the named function, own accessor, throwing
descriptor proxy, self-cycle, isolated-realm element, or isolated-realm jQuery value at its exact
target. Getter/trap counters are assertions, not hints. Foreign recipes use a new isolated window
and, for jQuery, a jQuery peer installed against that window. `engine-lifecycle` compiles the case,
retains its evaluator, disposes the engine, and only then invokes the retained evaluator.

## Source and lexical rules

Source is a JavaScript string measured in UTF-16 code units. Offsets are zero-based and end offsets
are exclusive. Only horizontal tab (`U+0009`), line feed (`U+000A`), carriage return (`U+000D`), and
space (`U+0020`) are whitespace. A carriage-return/line-feed pair is one line break. Comments,
Unicode whitespace, byte-order marks, and line separators `U+2028` and `U+2029` are not whitespace.

Identifiers use ASCII characters:

```ebnf
identifier-start = "A"…"Z" | "a"…"z" | "_" ;
identifier-part  = identifier-start | "0"…"9" ;
identifier       = identifier-start, { identifier-part } ;
signal           = "$", identifier ;
helper-path      = identifier, ".", identifier, { ".", identifier } ;
action-segment   = ( "A"…"Z" | "a"…"z" | "_" | "$" ),
                   { "A"…"Z" | "a"…"z" | "0"…"9" | "_" | "$" | "-" } ;
action-name      = action-segment, { ".", action-segment } ;
```

The reserved words are `null`, `true`, `false`, `return`, and `await`. All other JavaScript keywords
are unsupported syntax. Ambient names are denied identifiers even when their spelling is otherwise
an identifier.

Finite decimal numbers use this grammar. A leading sign is a unary operator. Hexadecimal, binary,
octal, numeric separators, bigint suffixes, `Infinity`, and `NaN` are unsupported.

```ebnf
digits       = digit, { digit } ;
integer      = "0" | ( "1"…"9", { digit } ) ;
fraction     = ".", digits ;
exponent     = ( "e" | "E" ), [ "+" | "-" ], digits ;
number       = integer, [ fraction ], [ exponent ] ;
```

Strings use matching single or double quotes. Raw control characters and lone UTF-16 surrogates are
invalid. The only escapes are `\\`, `\'`, `\"`, `\b`, `\f`, `\n`, `\r`, `\t`, and exactly four
hexadecimal digits after `\u`. A decoded surrogate must be paired with the adjacent decoded
surrogate escape. Identifiers do not accept escapes. Computed string keys are decoded before the
safe-key check, so `"\u0063onstructor"` is still denied.

The tokenizer emits `identifier`, `signal`, `number`, `string`, `keyword`, `punctuator`, `operator`,
and one `eof` token. The EOF token counts toward the token limit. It has an empty span at
`source.length`.

## Closed grammar

The following EBNF is the complete syntactic grammar. `{ x }` means zero or more, `[ x ]` means
optional, and `|` separates alternatives. No automatic semicolon insertion or parser recovery is
allowed.

```ebnf
value-input            = expression, eof ;
statement-input        = statement-list, eof ;
statement-list         = statement, { ";", statement }, [ ";" ] ;
statement              = return-statement | expression-statement | action-shorthand ;
expression-statement   = expression ;
return-statement       = "return", [ expression ] ;

expression             = assignment-expression ;
assignment-expression  = conditional-expression,
                         [ assignment-operator, assignment-expression ] ;
assignment-operator    = "=" | "+=" | "-=" | "*=" | "/=" | "%=" ;
conditional-expression = nullish-expression,
                         [ "?", assignment-expression, ":", assignment-expression ] ;
nullish-expression     = logical-or-expression, { "??", logical-or-expression } ;
logical-or-expression  = logical-and-expression, { "||", logical-and-expression } ;
logical-and-expression = equality-expression, { "&&", equality-expression } ;
equality-expression    = relational-expression, { ( "===" | "!==" ), relational-expression } ;
relational-expression  = additive-expression,
                         { ( "<" | "<=" | ">" | ">=" ), additive-expression } ;
additive-expression    = multiplicative-expression,
                         { ( "+" | "-" ), multiplicative-expression } ;
multiplicative-expression = unary-expression,
                            { ( "*" | "/" | "%" ), unary-expression } ;
unary-expression       = ( "!" | "+" | "-" | "await" ), unary-expression
                       | update-expression ;
update-expression      = member-expression, [ "++" | "--" ] ;

member-expression      = primary-expression, { member-suffix | method-suffix } ;
member-suffix          = ".", identifier | "[", expression, "]" ;
method-suffix          = ".", identifier, arguments ;
primary-expression     = literal | signal | binding | array-literal | object-literal
                       | action-call | helper-call | jquery-call | "(", expression, ")" ;
binding                = "$" | "el" | "$el" | "evt" | "root" | "$root"
                       | "state" | "signals" | "computed" | "args" ;
action-call            = "action", "(", string, { ",", assignment-expression }, ")" ;
action-shorthand       = "@", action-name, [ arguments ] ;
helper-call            = helper-path, arguments ;
jquery-call            = "$", arguments ;
arguments              = "(", [ assignment-expression,
                         { ",", assignment-expression } ], ")" ;
array-literal          = "[", [ assignment-expression,
                         { ",", assignment-expression } ], "]" ;
object-literal         = "{", [ object-property, { ",", object-property } ], "}" ;
object-property        = ( identifier | string ), ":", assignment-expression ;
literal                = "null" | "true" | "false" | number | string ;
```

The parser creates only the node kinds in `contract.json`. Parentheses do not create a node. A
`program` owns statement nodes. Dot and bracket access both create `member`. Calls create one of
`action-call`, `helper-call`, `jquery-call`, or `method-call` after static origin classification.
Calling a fixed non-callable binding, a signal, state/computed/event/argument data, an arbitrary
member, or another call's result fails capability validation. An unknown non-reserved dotted root
can compile as a helper call, but evaluation requires that exact committed helper path.

`return` and `await` are valid only for the statement entry. `return` may appear only as the final
top-level statement. `@name` is a statement form. A value expression invokes an action through
`action("literal.name", ...)`. Empty input is invalid for either entry.

## Precedence, order, and values

Higher numbers bind more tightly:

| Precedence | Forms                              | Association                    |
| ---------- | ---------------------------------- | ------------------------------ |
| 12         | member, computed member, calls     | left                           |
| 11         | postfix `++`, `--`                 | postfix                        |
| 10         | `!`, unary `+`, unary `-`, `await` | prefix                         |
| 9          | `*`, `/`, `%`                      | left                           |
| 8          | `+`, `-`                           | left                           |
| 7          | `<`, `<=`, `>`, `>=`               | left                           |
| 6          | `===`, `!==`                       | left                           |
| 5          | `&&`                               | left with short circuit        |
| 4          | `\|\|`                             | left with short circuit        |
| 3          | `??`                               | left with short circuit        |
| 2          | `?:`                               | right with one selected branch |
| 1          | assignment                         | right                          |

Every node evaluates child nodes left to right unless short circuiting selects fewer children.
Arguments and literal entries evaluate in source order. An assignment evaluates and validates its
target before its right side, then writes once. A compound assignment reads once, evaluates the
right side once, computes once, and writes once. Postfix update returns the old finite number and
writes the new finite number.

Runtime values are `null`, boolean, finite number, string, `undefined`, bounded arrays, inert plain
data, tracked state/computed/event/DOM/jQuery capabilities, a registered action/helper call, or an
approved asynchronous result. The grammar has no `undefined` literal, but an absent safe property
returns `undefined`. Values entering through state, computed data, event detail, arguments, or call
results receive the same finite-scalar and inert-plain-data classification. Bigint, symbol,
non-finite, promise, DOM/jQuery, date, and other custom live-object values fail closed. A path
through `undefined` fails with `CSP_PROPERTY_ABSENT`.

Operators do not use JavaScript coercion:

- `!` uses CSP truthiness. `null`, `undefined`, `false`, `0`, and `""` are false. Other allowed
  values are true.
- Unary `+`, unary `-`, `-`, `*`, `/`, and `%` require finite numbers. Division by zero and every
  non-finite result fail with `CSP_EVALUATE_NUMBER`.
- `+` adds two numbers. If either operand is a string, both operands must be primitive and are
  converted with the fixed spellings `null`, `undefined`, `true`, `false`, a finite base-10 number,
  or the string itself. Objects never stringify implicitly.
- Relational operators compare two finite numbers or two strings. Mixed or other types fail with
  `CSP_EVALUATE_TYPE`.
- `===` and `!==` compare type and primitive value. Tracked values compare their underlying
  identity. There is no loose equality.
- `&&`, `||`, `??`, and `?:` return the selected operand value and do not evaluate skipped source.

Arrays and objects preserve source order. Duplicate decoded object keys fail at compile time. Object
prototypes are always null. Literal arrays and objects are mutable only while being built. After
construction they are inert data unless assigned into state through an approved l-value.

## L-values and mutation

The l-values are `$name`, safe paths rooted at `state` or `signals`, and safe paths below a named
store in an installed `stores` namespace. The store namespace and each store-name slot remain
read-only. The last data path segment may be created. Earlier segments must exist as state, store
data, or inert plain data. Computed bracket keys must evaluate to a safe string or an in-range
nonnegative array index. Other fixed bindings, computed values, events, arguments, DOM, jQuery
values, literals, helpers, actions, and call results are read-only.

Assignment supports `=`, `+=`, `-=`, `*=`, `/=`, and `%=`. Postfix `++` and `--` require a finite
number. Prefix update is not in the grammar. Deletion and object spread are unsupported.

Every write rechecks that an existing target is an own data descriptor. A plain `=` cannot invoke an
accessor setter, and a throwing state write trap becomes `CSP_CAPABILITY_ACCESSOR` without exposing
its error.

Every property key is decoded and checked immediately before access and again before a write or
method call. `constructor`, `prototype`, `__proto__`, `call`, `apply`, `bind`, `caller`, `callee`,
`arguments`, and `eval` are magic keys and are always denied. The rule applies to dot, bracket,
escaped, concatenated, helper-returned, action-returned, and result-derived values.

## Capability table

| Root or origin        | Read                                                    | Write                                | Call or transition                      |
| --------------------- | ------------------------------------------------------- | ------------------------------------ | --------------------------------------- |
| `$name`               | Named state value                                       | Same signal                          | Never callable                          |
| `state`, `signals`    | Safe framework state path                               | Safe state path                      | Never callable                          |
| `computed`            | Safe committed computed path                            | None                                 | Never callable                          |
| `stores`              | Safe installed store names and accepted data paths      | Below a store name only              | Store methods are not CSP capabilities  |
| `args`                | `length`, indexes `0` through `127`                     | None                                 | Reviewed array methods                  |
| `evt`                 | Reviewed event members                                  | None                                 | `preventDefault()`, `stopPropagation()` |
| `el`, `root`          | Reviewed same-realm DOM members                         | None                                 | Wrap with `$()` for mutation            |
| `$el`, `$root`        | `length`, bounded indexes                               | Through reviewed methods             | Reviewed jQuery methods                 |
| `$()`                 | Same-realm element or literal selector scoped to `root` | Through reviewed methods             | Produces tracked jQuery                 |
| `@name(...)`          | None                                                    | Action owns its registered authority | Literal action name only                |
| `action("name", ...)` | None                                                    | Action owns its registered authority | Literal action name only                |
| committed helper path | Exact dotted path only                                  | Helper owns installed authority      | Committed leaf only                     |
| action/helper result  | Own safe inert data                                     | None                                 | Never callable                          |

Plain data reads use own data descriptors. Inherited properties and accessors are rejected. The
evaluator reads the descriptor value rather than invoking a getter. A Proxy can run its own
`getOwnPropertyDescriptor` trap when inspected. Supplying such a Proxy requires trusted application
or extension code. The evaluator never invokes a function obtained from the descriptor, caps the
operation, and treats a thrown trap as `CSP_CAPABILITY_ACCESSOR`.

Cross-realm values do not gain authority through `instanceof`. DOM and jQuery capability adapters
bind to the kernel's supplied window, document, and canonical jQuery peer. Foreign DOM/jQuery values
fail with `CSP_CAPABILITY_VALUE`.

`stores` is a fixed optional binding. Without `jquery-star/stores`, it is `undefined` and cannot
fall through to a browser global. Installed store values use the same read and safe-key checks as
state. Expressions can assign data below `stores.name`, but cannot assign, delete, or replace the
namespace or its name slots. `$store` remains the local signal named `store`. Function-valued store
methods are intentionally not callable from the finite CSP grammar; use a registered action for that
authority. See [STORES.md](STORES.md).

### DOM and event members

DOM reads are `id`, `name`, `type`, `tagName`, `value`, `checked`, `disabled`, `textContent`,
`dataset`, and `ownerDocument` identity. `dataset` becomes an inert safe-key data view. Event reads
are `type`, `key`, `code`, `button`, `buttons`, `detail`, `target`, `currentTarget`,
`defaultPrevented`, and `timeStamp`. `detail` becomes inert data. `target` and `currentTarget`
become same-realm DOM capabilities when valid.

### String and array methods

String values expose `length` and `trim`, `toLowerCase`, `toUpperCase`, `includes`, `startsWith`,
`endsWith`, `slice`, `substring`, and `charAt`. Arrays expose `length`, bounded integer indexes, and
`at`, `includes`, `indexOf`, `join`, and `slice`. Callback-taking and mutating methods are excluded.
Arguments and results must stay within their normal primitive or bounded-array types.

### jQuery methods

Method names are case-sensitive. Selector arguments must be source string literals, not signal,
event, request, action, or helper data. HTML accepted by `html(value)` must be a source string
literal. Class names, attribute/property names, and CSS property names must also be source literals.
Text, value, property values, CSS values, indexes, durations, and booleans may come from data. Each
method has a fixed non-callback arity, and evaluated arguments must be null, undefined, string,
boolean, or a finite number. Objects and functions are rejected before jQuery can select a callback
or coercion overload.

| Group       | Methods                                                                                     | Result                                                             |
| ----------- | ------------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Traversal   | `children`, `closest`, `eq`, `filter`, `find`, `first`, `last`, `not`, `parent`, `siblings` | Bounded tracked jQuery                                             |
| Read/write  | `attr`, `css`, `html`, `prop`, `text`, `val`                                                | Primitive on read, same jQuery value on write                      |
| Class/state | `addClass`, `hasClass`, `hide`, `is`, `removeClass`, `show`, `toggle`, `toggleClass`        | Boolean for predicates, otherwise same jQuery value                |
| Effects     | `fadeIn`, `fadeOut`                                                                         | Same jQuery value. Animation settlement is outside evaluator work. |

The jQuery constructor accepts a same-realm `el`/`root` capability or a source string selector. A
selector is evaluated as `$(selector, root)` and may return at most 128 elements. No HTML
constructor, global document query, arbitrary plugin method, event registration, queue control,
network helper, script evaluation, or function callback is allowed.

## Calls and asynchronous results

Arguments evaluate left to right before the registered action or helper is called. An action name is
fixed by authored source. A helper path must match the committed helper snapshot and fixed roots
cannot be shadowed. Actions and helpers keep their application/plugin authority, including requests
and DOM patches. The evaluator does not authorize or sanitize their work.

Only the direct result of an approved action/helper call may become `approved-async`. The adapter
adopts that promise once without exposing or looking up a public `then` property. Arbitrary
thenables are denied. `await` is explicit in statement source. A returned approved async value at
the engine boundary is also settled once so the existing `StarExpressionEngine` contract remains
asynchronous.

At most eight approved asynchronous results may be adopted during one evaluation. Statements resume
in order. A rejection becomes `CSP_ASYNC_REJECTION` with the authored expression location and no
serialized rejection cause. Cancellation continues to belong to the invoked action/request and
kernel lifecycle. The raw-result adapter observes that existing operation scope; if its action has
been cancelled, a late resolution fails before any later CSP statement runs.

Disposing the engine clears its bounded program cache and invalidates retained evaluators. Later
compilation and retained evaluator calls produce `CSP_ENGINE_DISPOSED`. Disposal does not cancel an
action independently of the application/kernel cleanup that owns it.

## Deterministic limits

| Limit            | Maximum | Count rule                                                                               |
| ---------------- | ------: | ---------------------------------------------------------------------------------------- |
| Source length    |   2,048 | UTF-16 code units, including whitespace                                                  |
| Tokens           |     512 | Includes the single EOF token                                                            |
| Nesting          |      16 | Simultaneously open parentheses, brackets, and braces                                    |
| AST nodes        |     256 | Every enumerated node, including `program` and object properties                         |
| Literal entries  |      64 | Per array or object literal                                                              |
| Path segments    |       8 | Per member/helper/action path after its root                                             |
| Call arguments   |       8 | Per action, helper, jQuery, or method call                                               |
| Evaluation steps |     128 | One per AST dispatch, property operation, argument transfer, call, and result transition |
| Collection size  |     128 | Per source array, arguments view, returned array, or jQuery value                        |
| Async chain      |       8 | Approved asynchronous adoptions per evaluation                                           |

Compilation checks source type and length, tokenization, token count, parsing/nesting, AST count,
literal entries, path length, arguments, and static capabilities in that order. Evaluation checks
the step budget before each operation, then capability/value, collection, cycle, numeric, and async
limits at the point the value crosses the boundary. The first failure wins. No partial assignment,
call, or DOM method occurs after a failing precondition.

Plain-data path traversal tracks object identity for that path. Re-entering an identity before the
path finishes fails with `CSP_EVALUATE_CYCLE`. The evaluator never recursively clones or sanitizes a
graph. This keeps cycle handling bounded by the eight-segment path limit.

## Diagnostics and locations

Every error has `name: "StarCSPExpressionError"`, one code below, `phase`,
`grammarVersion: "jqstar-csp-expression/1"`, exact authored `source`, optional `attribute`, and a
span. It also conforms to the public `StarExpressionError` shape. The message may include at most
160 UTF-16 units of source around the failure. It never serializes state, event detail, DOM,
arguments, response data, headers, credentials, rejection causes, getters, or object graphs.

Spans contain zero-based, end-exclusive source offsets and 1-based line/column pairs. Without a
supplied location, offset zero is line 1, column 1. With `{ line, column }`, that pair locates
source offset zero. LF and CRLF advance one line and reset the column to 1. A tab advances one
column. An astral character occupies two UTF-16 columns. The EOF span is empty at the final offset.

| Code family      | Codes                                                                                                                                                                                                                                  |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Source/token     | `CSP_SOURCE_TYPE`, `CSP_LIMIT_SOURCE_LENGTH`, `CSP_TOKEN_INVALID_CHARACTER`, `CSP_TOKEN_INVALID_ESCAPE`, `CSP_TOKEN_NUMBER`, `CSP_TOKEN_UNTERMINATED_STRING`                                                                           |
| Parse            | `CSP_PARSE_UNEXPECTED_TOKEN`, `CSP_PARSE_EXPECTED_TOKEN`, `CSP_PARSE_TRAILING_INPUT`, `CSP_PARSE_UNSUPPORTED_SYNTAX`, `CSP_PARSE_DUPLICATE_KEY`                                                                                        |
| Capability/value | `CSP_CAPABILITY_IDENTIFIER`, `CSP_CAPABILITY_PROPERTY`, `CSP_CAPABILITY_CALL`, `CSP_CAPABILITY_LVALUE`, `CSP_CAPABILITY_ACCESSOR`, `CSP_CAPABILITY_VALUE`, `CSP_PROPERTY_ABSENT`                                                       |
| Evaluation       | `CSP_EVALUATE_NUMBER`, `CSP_EVALUATE_TYPE`, `CSP_EVALUATE_CYCLE`, `CSP_ASYNC_VALUE`, `CSP_ASYNC_REJECTION`, `CSP_ENGINE_DISPOSED`                                                                                                      |
| Limits           | `CSP_LIMIT_TOKENS`, `CSP_LIMIT_NESTING`, `CSP_LIMIT_AST_NODES`, `CSP_LIMIT_LITERAL_ENTRIES`, `CSP_LIMIT_PATH_SEGMENTS`, `CSP_LIMIT_CALL_ARGUMENTS`, `CSP_LIMIT_EVALUATION_STEPS`, `CSP_LIMIT_COLLECTION_SIZE`, `CSP_LIMIT_ASYNC_CHAIN` |

The fixture corpora select an exact code and span for every rejected case. A wording-only patch may
not change error selection, phase, or location for the frozen sources.

## Compatibility and migration

The public inventory has four dispositions:

- `exact-parity` uses the same authored source and expected result under trusted and CSP engines.
- `csp-equivalent` keeps the application outcome with the replacement source named in the map.
- `migration-required` moves unrestricted JavaScript or an arbitrary plugin call into a registered
  action/helper.
- `intentionally-unsupported` has no CSP form because it conflicts with the finite capability model.

Current signal expressions, literals, operators, named backend/UI/site actions, reviewed jQuery
chains, and `String#trim` examples have exact parity. `this` becomes `el`. Ambient
`Promise.resolve(...)` becomes an approved asynchronous action/helper result. `console.log(...)`
becomes a registered diagnostic action/helper. Arbitrary `$(el).datepicker()` becomes an explicit
registered integration action. The trusted JavaScript engine keeps all existing JavaScript behavior.

Run `npm run csp:inventory` after editing README, registry, website, example, or browser-fixture
expression markup. Review the generated dispositions, then run `npm run test:csp-contract`. A new or
changed occurrence without a deterministic mapping fails the repository gate.

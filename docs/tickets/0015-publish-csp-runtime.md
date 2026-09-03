---
id: 0015
title: Approve the CSP grammar and threat contract
status: done
created: 2026-08-30
updated: 2026-09-02
---

# 0015: Approve the CSP grammar and threat contract

## Plan

### Problem

The trusted JavaScript expression compiler requires `unsafe-eval`. A second runtime cannot be built
or reviewed safely until its finite grammar, object/call capabilities, compatibility target,
resource limits, and threat boundary are explicit. “CSP-compatible” must mean one precise thing:
jQStar performs no dynamic code construction. It must not imply that attacker-authored expressions
are safe.

### Current evidence

- `src/expression.ts` implements the trusted engine with `Function`, a proxy-backed JavaScript
  scope, and a separate cache per kernel. It accepts the full JavaScript expressions/statements the
  host engine accepts.
- Ticket 0007 publishes `StarExpressionEngine`, structured compile/evaluate locations, unique kernel
  ownership, disposal, and six shared conformance groups. The current asynchronous group uses the
  ambient `Promise` global and therefore cannot be copied blindly into a finite grammar.
- The documented scope includes real jQuery, `$name` signals, `el`/`$el`, `evt`, `root`/`$root`,
  `state`/`signals`, `computed`, `args`, `action()`, and registered helper namespaces. Current
  public examples use assignments/updates, literals, arrays/objects, conditional/logical/arithmetic
  operators, event-detail paths, named action calls, string/array methods, and jQuery chains.
- Current documentation also demonstrates unrestricted JavaScript such as `console.log`, arbitrary
  jQuery plugin methods, and `Promise.resolve`. The CSP profile needs an explicit compatibility and
  migration table rather than a false full-JavaScript promise.
- Ticket 0009 publishes namespaced helpers and actions through validated registries. These
  registries provide the only extensible call boundary the finite evaluator should accept.
- Architecture already states that both engines retain real DOM/jQuery/action authority and require
  trusted markup, but there is no reviewed grammar, threat model, denied corpus, or machine-readable
  case mapping for tickets 0034 and 0035.

### Scope

- Approve and version `jqstar-csp-expression/1`, a closed grammar with exact lexical rules, source
  limits, AST node kinds, precedence/associativity, l-values, call targets, and statement forms.
- Define supported primitive/array/object literals; fixed bindings; `$name`, state, computed, event,
  argument, and helper paths; unary/binary/logical/conditional operators; signal assignments and
  updates; statement sequences; named actions; helper calls; explicit asynchronous evaluation; and
  the finite jQuery constructor/method forms.
- Define capability-specific property access. Plain data uses own safe keys; event, DOM, string,
  array, and jQuery values use reviewed member/method allowlists. Deny magic prototype keys and
  arbitrary function-valued property invocation at every path segment and result boundary.
- Inventory every public expression example and shared engine-conformance case. Assign each to exact
  parity, CSP-specific equivalent, migration required, or intentionally unsupported with a
  rationale; do not weaken trusted-engine behavior.
- Define deterministic tokenizer/parser/evaluator diagnostics, 1-based line/column plus source
  offset semantics, asynchronous completion/rejection, short-circuit order, mutation order, numeric
  and equality behavior, property absence, thenable handling, and disposed-engine behavior.
- Approve exact source/nesting/node/collection/path/call-argument/evaluation-step limits and a
  bounded cycle policy so malformed input or cyclic host data cannot cause unbounded recursion,
  retained work, or nondeterministic failure.
- Threat-model dynamic construction, imports, global discovery, constructors/prototypes, reflective
  access, callable escalation, getters/proxies, jQuery/DOM reach, selectors/HTML, actions/helpers,
  requests, cyclic values, denial of service, diagnostics, and plugin-supplied authority.
- Approve a threat statement that distinguishes dynamic-code-free CSP compatibility from an
  untrusted-expression sandbox and identifies caller/plugin responsibilities.
- Publish schema-validated positive grammar fixtures, denied-syntax fixtures, adversarial payloads,
  and a machine-readable shared-conformance mapping as immutable implementation inputs for tickets
  0034 and 0035.

### Out of scope

- Parser, evaluator, package entry point, or browser implementation.
- Evaluating untrusted server-provided expressions safely.
- Full JavaScript syntax or build-time precompilation.
- Changing the trusted JavaScript engine, root compatibility behavior, directive syntax, action or
  helper registries, jQuery peer range, CSP headers, or existing application APIs.
- Promising that third-party actions, helpers, plugins, jQuery extensions, HTML, selectors, or
  application code comply with the host page's policy.

### Dependencies

- Tickets 0007 and 0009.

### Acceptance criteria

- [x] [AC-01] `jqstar-csp-expression/1` is a closed, versioned EBNF contract with exact tokens,
      whitespace/escape rules, operator precedence/associativity, AST node kinds, value versus
      statement entry points, and stable source spans. Anything not produced by the grammar is
      unsupported and fails closed.
- [x] [AC-02] Every allowed node defines evaluation order, result type, l-value rules, mutation and
      short-circuit behavior, property semantics, asynchronous completion, thrown/rejected error
      normalization, and disposed-engine behavior without appealing to implicit JavaScript `eval`
      semantics.
- [x] [AC-03] The grammar covers literals, arrays/objects, fixed context bindings, `$name` signals,
      safe state/computed/event/argument paths, reviewed operators, signal assignment/update,
      statement sequences, named actions, registered helpers, and explicitly allowed jQuery forms.
      It excludes functions/classes, loops, declarations, exceptions, modules, and arbitrary calls.
- [x] [AC-04] A versioned capability table names every readable/writable root, safe property rule,
      callable origin, argument/result authority, asynchronous boundary, and approved jQuery/string/
      array method. `constructor`, `prototype`, `__proto__`, `call`, `apply`, `bind`, reflective
      lookup, and invocation of a function obtained as data are denied regardless of spelling.
- [x] [AC-05] A complete inventory maps every public example and shared conformance case to exact
      parity, CSP-specific equivalent, required migration, or intentional exclusion. Signals,
      events, actions, helpers, generic/Datastar requests, patches, async results, short circuiting,
      and supported jQuery behavior have named executable case IDs; unrestricted JavaScript remains
      available only through the trusted engine.
- [x] [AC-06] Parser/evaluator errors have stable machine codes, compile/evaluate phase, grammar
      version, authored attribute, exact source, zero-based source offsets, and 1-based line/column
      spans. Invalid escapes, incomplete input, trailing input, unsupported syntax, denied
      capability access, limit exhaustion, cycles, and async rejection have distinct fixtures.
- [x] [AC-07] Exact source length, token, nesting, AST node, literal-entry, path-segment,
      call-argument, evaluation-step, and asynchronous-chain limits are part of the versioned
      contract. Boundary fixtures prove acceptance at each limit and deterministic rejection one
      unit beyond it without recursive stack exhaustion.
- [x] [AC-08] The positive corpus includes every grammar production and precedence edge. The denied
      corpus covers comments/templates/regular expressions as applicable, declarations, arrows,
      functions, classes, `new`, `this` misuse, control flow outside the finite statement grammar,
      dynamic/static import, `eval`, `Function`, string timers, and ambient global names.
- [x] [AC-09] The adversarial corpus covers direct, bracketed, escaped, concatenated, optional, and
      result-derived constructor/prototype access; array/string/jQuery constructor chains;
      `globalThis`/`window`/`document`/`self`/`top`/`parent`; `Object`/`Reflect`/`Proxy`/
      `WebAssembly`; callable `call`/`apply`/`bind`; getters/proxies; cycles; deep/wide inputs; and
      helper/action/plugin return-value escalation.
- [x] [AC-10] The threat model identifies assets, actors, trusted and untrusted inputs, boundaries,
      abuse cases, mitigations, verification, and residual authority. It states that an expression
      can intentionally mutate reactive state and the DOM, select elements, insert trusted HTML,
      invoke registered actions/helpers, and initiate requests permitted by those capabilities.
- [x] [AC-11] Every public CSP description says “no dynamic code construction,” requires trusted
      markup and trusted installed extensions, makes no sandbox/non-interference/XSS claim, and
      explains that the page policy—not jQStar—governs inline scripts, styles, network endpoints,
      third-party jQuery plugins, and application code.
- [x] [AC-12] Tickets 0034 and 0035 link the exact frozen grammar version, fixture manifests,
      conformance mapping, threat decisions, limits, and expected diagnostics. Documentation/link/
      schema/static checks, `npm run check`, and `git diff --check` pass without mutation testing.

### Design

Treat the grammar, capability table, limits, diagnostics, compatibility mapping, and threat
statement as one versioned public contract. The initial grammar is intentionally an expression
language, not JavaScript with a denylist. A tokenizer/parser may create only enumerated AST node
tags; evaluation dispatches only those tags and explicit capabilities. Unsupported syntax fails at
the first stable diagnostic with no recovery or partial evaluation.

The value grammar contains `null`, booleans, finite numbers, quoted strings with a specified escape
set, arrays, plain object literals, safe member/index reads, approved calls, unary arithmetic/not,
arithmetic/comparison/equality, logical/nullish operators, and conditionals. The statement grammar
adds semicolon-separated expression statements, signal assignment/compound assignment/update,
explicit `await`, and optional top-level `return`; it does not add declarations, blocks, branches,
loops, labels, functions, classes, exceptions, generators, or modules. The final contract may remove
a proposed form during review, but cannot add an unreviewed AST node during ticket 0034.

The evaluator receives a closed scope from `StarContext`. `$`, `el`, `$el`, `evt`, `root`, `$root`,
`state`, `signals`, `computed`, `args`, `action`, and committed helper roots are recognized tokens,
not names looked up on an ambient object. `$name` resolves a signal. Writes are restricted to
`$name` and approved `state`/`signals` paths; fixed bindings, computed values, events, DOM objects,
helpers, and call results are not l-values.

Calls are origin-based. `@registered.name(...)` and `action(name, ...)` invoke the action
capability; `plugin.helper(...)` invokes a committed helper; `$()` creates a jQuery value; an
approved method can be called only on a value whose tracked capability kind permits it. A function
stored in state, event detail, an object/array member, helper result, action result, jQuery
property, or DOM property cannot become a callee. Method chaining preserves or changes capability
kind according to the versioned table. Magic keys are rejected before access and after computed-key
evaluation.

Plain application data is read through own-property safe-key access. DOM/event/string/array/jQuery
members use separate allowlists because browser properties may be inherited accessors and jQuery is
intentionally powerful. The first profile supports only methods justified by shipped examples and
conformance cases. Arbitrary jQuery plugins and globals such as `console` migrate to registered
actions/helpers under the CSP profile; the trusted engine keeps full JavaScript compatibility.

Asynchronous values are promises returned by approved actions/helpers/request helpers or explicit
`await` of such calls. The evaluator adopts the result once, preserves sequential statement and
short-circuit order, and normalizes rejection through `StarExpressionError`. It does not expose the
ambient `Promise` constructor, timers, dynamic import, or microtask APIs. Cancellation remains owned
by the action/request/runtime contract rather than invented by the expression evaluator.

The machine-readable contract has six linked manifests: shared vocabulary, accepted source/result
vectors, denied syntax, adversarial capability payloads, executable-context recipes, and
shared-conformance assignments. Each case has a stable ID, grammar version, entry kind, source,
expected AST/result or diagnostic code/span, required context/capability fixture, and ticket owner.
Ticket ownership is inherited from the manifest header. Schemas and cross-manifest validation reject
duplicate IDs, unknown node/capability/fixture names, missing limits, unused context recipes, and
unmapped public examples.

### Decisions

- CSP compatibility means the jQStar CSP parser/evaluator and entry graph use no `eval`, `Function`,
  string-to-code timer, dynamic import, WebAssembly code generation, or equivalent source-to-code
  path. Ticket 0035 proves this under a real browser policy.
- This is a positive grammar and capability allowlist. Keyword/property deny lists are defense in
  depth, never the primary parser or evaluator boundary.
- Trusted and CSP engines share the engine lifecycle and application semantics, not full language
  parity. Compatibility is explicit per public example and conformance case.
- Registered actions and helpers are the extension path. CSP expressions do not call arbitrary
  functions stored in state, returned by another call, or discovered from DOM/jQuery properties.
- Real jQuery/DOM authority remains deliberate and documented. The method table is finite, but it
  does not turn trusted markup into an untrusted sandbox.
- Member access rules are capability-specific; there is no universal JavaScript property lookup.
- Grammar version changes require a new ticket, compatibility diff, threat review, corpus update,
  and browser proof. Patch releases can clarify prose or diagnostics only when accepted/rejected
  source behavior does not change.
- Ticket 0015 approves contracts and fixtures only. Tickets 0034 and 0035 own implementation and
  installed browser claims respectively.

### Security and accessibility

- The threat model treats directive markup and installed action/helper/plugin code as trusted.
  Signal values, event payloads, request responses, selectors, and user input are data that must not
  be reparsed as expression source or converted into a call target/property path.
- Denied capability access is checked structurally and at runtime for computed values. Escaped or
  concatenated spellings, proxy traps, getters, cyclic graphs, and cross-realm objects cannot bypass
  the same rule.
- Diagnostics quote bounded source excerpts and structural locations but do not serialize state,
  event detail, DOM, action/helper arguments, response data, credentials, or error object graphs.
- A CSP expression can still invoke an authorized action that sends data, insert application-trusted
  HTML through allowed behavior, or mutate DOM/state. Authorization, CSRF, output sanitization,
  Trusted Types, and server validation remain application responsibilities.
- The grammar does not alter directive keyboard, focus, ARIA, motion, color, zoom, or native-control
  behavior. Ticket 0035 must run equivalent supported interactions under the real CSP entry.

### Risks

- The grammar can expand without limit. Require a concrete compatibility case for every node.
- Raw DOM and jQuery remain powerful. The threat statement must prevent a false security promise.
- A JavaScript-shaped grammar can accidentally inherit ambient semantics. Specify each node directly
  and reject any behavior that is not defined without referring to the JavaScript evaluator.
- Allowing general member calls reopens constructor/callable escalation. Track value capability
  provenance and permit only named call origins plus method-table entries.
- Denying only literal dangerous names misses escapes, computed keys, getters, and returned values.
  Normalize keys and enforce the boundary immediately before every property read/write/call.
- Exact limits can reject unusually large valid expressions. Inventory all shipped examples, publish
  the limits, and require an explicit versioned review before raising them.
- Cross-realm DOM and jQuery objects can fail constructor tests or expose different prototypes. Use
  branded capability wrappers/guards tied to the supplied kernel realm, not ambient `instanceof`.
- A fixture corpus can drift from prose. Generate cross-reference validation and require every
  grammar node, capability, diagnostic, public example, and conformance assignment to be covered.

### Verification plan

- Validate this Plan before creating contract artifacts.
- Inventory expressions from README, public website pages, example applications, browser fixtures,
  and shared conformance. Record source, entry kind, required bindings/calls, and final disposition.
- Review every lexical rule, precedence edge, AST node, l-value, property capability, call origin,
  async transition, error span, and limit against positive/boundary/one-past-boundary fixtures.
- Validate the accepted/denied/adversarial/conformance manifests against schemas and check complete,
  unique bidirectional links to grammar productions, capabilities, diagnostics, public examples, and
  downstream ticket criteria.
- Run the corpus through the trusted engine only where exact parity is claimed. CSP-specific and
  migration cases remain data contracts until ticket 0034; no placeholder evaluator is added here.
- Perform an independent threat review of source-to-code paths, parser ambiguity, property and call
  escalation, real jQuery/DOM power, data-to-code transitions, cycles/depth, diagnostics, and
  extension boundaries. Record rejected alternatives and residual risk.
- Update tickets 0034 and 0035 to consume immutable manifest/version references and refuse grammar
  expansion during implementation or packaging.
- Run documentation/link/schema/spelling/static checks, ticket phase validation, `npm run check`,
  and `git diff --check` without mutation testing.

### Planned files

- `docs/CSP_EXPRESSIONS.md`: Versioned EBNF, tokens, precedence, AST node semantics, bindings,
  l-values, calls, jQuery/string/array tables, async behavior, limits, diagnostics, compatibility,
  migration guidance, and version policy.
- `docs/security/CSP_THREAT_MODEL.md`: Assets, actors, boundaries, abuse cases, mitigations,
  verification, residual DOM/jQuery/action/helper authority, and explicit non-sandbox statement.
- `schema/csp-expression-contract.schema.json`: Shared manifest records, grammar/capability/
  diagnostic enums, limits, source spans, expected outcomes, and unique cross-reference rules.
- `test/fixtures/csp/accepted.json`: Every production, precedence/evaluation edge, public-equivalent
  example, boundary limit, async outcome, and stable result/error vector.
- `test/fixtures/csp/denied.json`: Unsupported JavaScript and malformed-token/parser cases with
  exact diagnostic IDs/spans and no partial execution.
- `test/fixtures/csp/adversarial.json`:
  Constructor/prototype/global/reflection/callable/getter/proxy/ cycle/depth/wide-input and
  extension-return escalation payloads.
- `test/fixtures/csp/contexts.json`: Schema-validated setup recipes for every state, action, helper,
  DOM, event, lifecycle, hostile-value, and cross-realm fixture referenced by a corpus case.
- `test/fixtures/csp/conformance-map.json`: Shared engine case and public-example disposition with
  exact replacement/migration and downstream executable case IDs.
- `scripts/validate-csp-contract.mjs`, `test/csp-contract.test.ts`: Schema, duplicate, coverage,
  bidirectional reference, source-location, boundary, and trusted-parity validation.
- `test/expression-engine-conformance.ts`: Stable CSP-addressable case IDs and metadata only; no CSP
  implementation or trusted-engine behavior change.
- `SECURITY.md`, `README.md`, `docs/{ARCHITECTURE,PROJECT,TESTING}.md`, website CSP/API pages:
  Threat boundary, compatibility profile, migration, version, and trusted-markup wording.
- `docs/tickets/0034-implement-csp-parser-evaluator.md`,
  `docs/tickets/0035-publish-csp-browser-conformance.md`: Frozen inputs, expected diagnostics,
  implementation prohibition on grammar expansion, and installed proof requirements.
- `docs/tickets/0015-publish-csp-runtime.md`: Phase state, ledger, commands, review findings,
  decisions, and criterion evidence.

## Code

### Changed-file ledger

| File                                                                                                                                                               | Purpose                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `docs/CSP_EXPRESSIONS.md`                                                                                                                                          | Freeze grammar version 1, semantics, capabilities, limits, diagnostics, compatibility, and migrations.                                                               |
| `docs/security/CSP_THREAT_MODEL.md`, `SECURITY.md`                                                                                                                 | Define actors, boundaries, abuse cases, mitigations, residual authority, reporting criteria, accepted risk, and the non-sandbox policy.                              |
| `schema/csp-expression-contract.schema.json`                                                                                                                       | Validate every contract manifest shape, enum, span, limit, and cross-reference field.                                                                                |
| `test/fixtures/csp/{contract,accepted,denied,adversarial,contexts,conformance-map}.json`                                                                           | Freeze the shared vocabulary, positive/boundary vectors, rejected syntax, hostile capability cases, executable-context recipes, and compatibility inventory.         |
| `scripts/generate-csp-contract.mjs`, `scripts/validate-csp-contract.{mjs,d.mts}`, `test/csp-contract.test.ts`                                                      | Generate the deterministic corpus/inventory and enforce schema validity, unique IDs, complete coverage, exact locations, public inventory, and trusted-parity cases. |
| `test/expression-engine-conformance.ts`                                                                                                                            | Give shared engine cases stable CSP mapping IDs and explicit compatibility metadata.                                                                                 |
| `package.json`, `scripts/quality/validate-json.mjs`, `quality/{scopes,production-census}.json`, `tsconfig{,.quality.test}.json`, `eslint.config.js`, `cspell.json` | Add focused commands, schema instances, declaration coverage/classification, and narrow lint/spelling support for the frozen corpus.                                 |
| `README.md`, `docs/{README,ARCHITECTURE,PROJECT,TESTING}.md`, `example/docs/csp/index.html`                                                                        | Publish the contract, threat boundary, preview status, migration guidance, and website route.                                                                        |
| `example/docs/{index,api}/index.html`, `example/docs-shell.html`, `vite.demo.config.ts`                                                                            | Link and build the CSP guide from the public documentation shell.                                                                                                    |
| `config/agent-content.json`, `example/agent-content.generated.json`, `example/public/{jqstar-agent-index.json,llms.txt,llms-full.txt}`                             | Add reviewed CSP guidance to the shared agent corpus and regenerate bounded outputs.                                                                                 |
| `test/{agent-content,site-structure}.test.mjs`, `e2e/site.spec.ts`, `scripts/smoke-deployment.mjs`                                                                 | Prove the new documentation and agent routes in static, browser, and deployment checks.                                                                              |
| `docs/tickets/{0015-publish-csp-runtime,0034-implement-csp-parser-evaluator,0035-publish-csp-browser-conformance}.md`                                              | Record evidence and bind downstream implementation/browser work to the frozen contract.                                                                              |

### Design changes

- No grammar, capability, diagnostic, or limit was added beyond the approved Plan.
- Shared vocabulary moved into a fifth `contract.json` manifest so the four generated corpus/map
  manifests can reference one schema-validated source of truth.
- Completion review added a sixth `contexts.json` manifest so every referenced fixture has a
  structured setup recipe instead of relying on an undeclared test-harness convention.
- Manifest headers now assign ticket 0015 to vocabulary, ticket 0034 to executable corpora and
  contexts, and ticket 0035 to browser conformance instead of leaving the promised owner implicit.
- Accepted-case coverage now names every precedence group and the validator requires complete
  operator-group coverage alongside productions, AST nodes, and capabilities.
- The denied manifest now includes direct `eval`, `Function`, and string-timer call vectors in
  addition to their threat-classified adversarial copies, matching AC-08 literally.
- Public expression inventory is generated from README, registry, example, and E2E authored
  attributes. The validator fails when generated mapping or source locations drift.
- Independent threat review made four ticket-0034 prerequisites explicit: pre-assimilation action/
  helper result branding, exact committed-helper leaf provenance, expression-bearing response HTML
  as trusted markup, and resolution of the engine ownership-claim lifecycle.
- The approved root security policy applies those boundaries to repository scans without claiming
  that the planned CSP interpreter already ships or suppressing data-to-source boundary failures.
- The repository spelling command now includes root `SECURITY.md` so later policy edits remain in
  the same documentation gate as README, agent guidance, and brain documentation.

## Test

| Command                                                                                                                                                          | Result         | Evidence                                                                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                                                                                                                                           | Fail (initial) | Contract/unit lanes passed. Formatting found three JSON artifacts; static policy found a literal adversarial `eval` string, a missing typed-lint project for the validator declaration, two corpus spelling tokens, and no local `actionlint` binary. Generator/configuration corrections are retained; the pinned analyzer will be supplied ephemerally for the rerun.                                   |
| `npm run quality:fast`                                                                                                                                           | Pass           | Ticket workflow, runner self-test, formatting, 308 unit tests, and all 21 enforced static lanes passed with checksum-verified `actionlint` 1.7.12 on the ephemeral `PATH`.                                                                                                                                                                                                                                |
| `npm run test:csp-contract`                                                                                                                                      | Pass           | Validated 34 accepted, 57 denied, 46 adversarial cases, all 33 referenced context recipes, and 228 unique public sources across 379 occurrences; replayed 23 exact-parity positive vectors through the trusted engine.                                                                                                                                                                                    |
| `npx vitest run test/agent-content.test.mjs test/site-structure.test.mjs`                                                                                        | Pass           | Nine tests prove deterministic corpus generation and native public route structure.                                                                                                                                                                                                                                                                                                                       |
| `node scripts/quality/validate-json.mjs`                                                                                                                         | Pass           | Parsed 58 JSON files and schema-validated all six CSP manifests among ten instances.                                                                                                                                                                                                                                                                                                                      |
| `npm run typecheck`                                                                                                                                              | Pass           | Production, test, declaration, and registry TypeScript contracts compile.                                                                                                                                                                                                                                                                                                                                 |
| `npm run lint:html`, `npm run lint:markdown`, `npm run lint:spelling`                                                                                            | Pass           | Public CSP HTML and all changed public/brain prose pass structural and vocabulary checks.                                                                                                                                                                                                                                                                                                                 |
| `git diff --check`                                                                                                                                               | Pass           | No whitespace errors.                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run quality:delivery`                                                                                                                                       | Fail (initial) | Unit, property, self-hosted, package, release, browser, and ticket-0044 lanes passed. Coverage found the new `.d.mts` declaration missing from the production census; static delivery could not find the locally absent pinned Semgrep, gitleaks, and OSV-Scanner binaries. The declaration is now classified as type-only evidence, and the pinned analyzers will be supplied ephemerally for the rerun. |
| `npm run quality:census`, `npm run test:coverage`                                                                                                                | Pass           | Classified 311 production artifacts exactly once; 87 executable artifacts met the coverage contract at 92.43% statements/lines, 81.72% branches, and 91.87% functions.                                                                                                                                                                                                                                    |
| `npm run quality:static:delivery`                                                                                                                                | Pass           | All 25 static lanes passed with checksum-verified Semgrep 1.166.0, gitleaks 8.30.1, OSV-Scanner 2.5.1, and actionlint 1.7.12 on an ephemeral `PATH`; Semgrep scanned 157 code files with zero findings.                                                                                                                                                                                                   |
| `npm run check` (`npm run quality:delivery`)                                                                                                                     | Pass           | All 12 enforced delivery gates passed in run `2026-09-02T19-46-53-975Z-56234` after the approved root policy was installed.                                                                                                                                                                                                                                                                               |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0015-publish-csp-runtime.md --report .git/jqstar/runs/2026-09-02T19-46-53-975Z-56234/report.json` | Pass           | The testing-phase ledger, inspection evidence, and exact post-policy delivery receipt validate.                                                                                                                                                                                                                                                                                                           |
| `resolve_security_md.py --scope src --out -`                                                                                                                     | Pass           | The approved root `SECURITY.md` resolves for source paths. The complete inventory found no other repository-owned policy; dependency-local policies remain inside `node_modules`.                                                                                                                                                                                                                         |
| `npm run ticket:validate -- --phase document --ticket docs/tickets/0015-publish-csp-runtime.md`                                                                  | Pass           | All 12 checked criteria have one passing evidence row, affected documentation is listed, and the current-state completion audit is present.                                                                                                                                                                                                                                                               |

### Inspection ledger

| Finding                                                                                                                                                                                                 | Resolution                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Generic and Datastar element patches can introduce expression-bearing attributes, so server response HTML is a source boundary rather than ordinary result data.                                        | The contract and threat model classify expression-bearing response HTML as trusted markup while JSON/signal/form/event values remain data; tickets 0034 and 0035 link that boundary.                                                  |
| `OperationHub.runAction()` currently awaits an action before the expression engine receives its result, allowing JavaScript thenable assimilation before a future CSP adapter could inspect provenance. | Ticket 0034 now requires an origin-branded raw-result dispatch seam before any public `then` lookup or assimilation, with trusted-engine operation behavior preserved.                                                                |
| Helper namespace containers are frozen and null-prototype, but plugin-owned leaf values have no immutable callable-origin metadata.                                                                     | Ticket 0034 now requires exact committed-helper leaf provenance independent of the leaf value and rejects functions obtained from returned data.                                                                                      |
| Kernel disposal releases an expression-engine ownership claim while invalidating the disposed built-in engine, which leaves the intended reinstall identity ambiguous.                                  | The threat model records the ambiguity and makes explicit lifecycle resolution against ticket 0007 an activation gate for tickets 0034 and 0035.                                                                                      |
| The first delivery run found the new validator declaration outside the production census and locally absent external analyzers.                                                                         | Classify `.d.mts` automation declarations as type-only evidence; provision the repository-pinned analyzers in a checksum-verified temporary directory. Coverage, all 25 static lanes, and the subsequent 12-gate delivery run passed. |
| Semgrep 1.166 parsed a tagged raw-string invalid-escape fixture only partially under strict mode.                                                                                                       | Construct the same `\x` payload with an ordinary escaped JavaScript string. The generated fixture and combined digest are unchanged, while strict Semgrep parsing reaches 100%.                                                       |
| The method manifest lowercased camel-case jQuery and event methods even though the prose contract makes method lookup case-sensitive.                                                                   | Export one exact-case method table from the generator, correct `addClass`/`preventDefault` and related names, give method lists their own schema pattern, and assert exact equality in the validator.                                 |
| Corpus cases named 33 context fixtures but did not define how ticket 0034 should construct state, actions, helpers, hostile values, lifecycle state, DOM, or foreign-realm values.                      | Add a schema-validated `contexts.json` recipe manifest and require bidirectional fixture coverage, leaving no referenced or unused setup recipe.                                                                                      |
| The design promised a ticket owner for machine-readable inputs, but no manifest encoded one.                                                                                                            | Add a required `ownerTicket` header with schema-enforced assignments: vocabulary to 0015, runtime corpora/contexts to 0034, and conformance mapping to 0035.                                                                          |
| Accepted coverage was complete for productions, AST nodes, and capabilities, but precedence groups were only implicit in source strings.                                                                | Give every operator/precedence group a stable ID, map it from accepted cases, and require exact coverage in the cross-manifest validator.                                                                                             |
| `eval`, `Function`, and string timers were classified in the adversarial manifest but AC-08 also assigned them to the denied corpus.                                                                    | Add explicit denied capability vectors for all three while retaining the adversarial copies and their dynamic-code threat category.                                                                                                   |
| The repository had no root scanner policy to distinguish intended trusted-engine authority from reportable CSP, ownership, provenance, and data-to-source failures.                                     | Add the owner-approved `SECURITY.md` with system scope, trust boundaries, invariants, severity context, narrow accepted risks, and known pre-implementation limitations.                                                              |

## Document

### Documentation changed

- `README.md`, `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, and `docs/TESTING.md`
  identify the frozen contract, current trusted-engine behavior, verification command, and later
  implementation tickets.
- `docs/CSP_EXPRESSIONS.md` defines the language, capability and method tables, context recipes,
  limits, diagnostics, compatibility dispositions, migrations, ownership, and version policy.
- `docs/security/CSP_THREAT_MODEL.md` and `SECURITY.md` define trust boundaries, required security
  properties, reportable impact, accepted risk, and the four activation gates for ticket 0034.
- `example/docs/csp/index.html` publishes the same preview status and security boundary. The docs
  index, API page, shared shell, and Vite routes link and build it.
- `config/agent-content.json` and the generated agent index and text corpora publish the reviewed
  CSP guidance through the repository's agent-content surfaces.
- Tickets 0034 and 0035 link all six manifests, the threat decisions, and the frozen combined digest
  `e80f30714d6de69db22fdc4478c042bfae3d988d87d96e42dd2fefb590ea34e6`.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                             |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `docs/CSP_EXPRESSIONS.md`, `contract.json`, and the shared schema freeze lexical rules, EBNF, entry kinds, AST nodes, precedence groups, and UTF-16 spans. `npm run test:csp-contract` validates them.                                               |
| AC-02     | Pass   | The value/order, l-value, call/async, limits, and diagnostic sections define every transition. Accepted result/state/call vectors and denied first-failure vectors make those rules executable inputs.                                               |
| AC-03     | Pass   | The EBNF and capability contract include every named finite-language form. The denied manifest rejects functions, declarations, classes, control flow, modules, and arbitrary call origins.                                                          |
| AC-04     | Pass   | `contract.json` freezes all roots, capability transitions, exact-case jQuery/string/array/event method names, and magic keys. The validator checks exact method identity and capability coverage.                                                    |
| AC-05     | Pass   | `conformance-map.json` maps all six shared groups, 19 feature assignments, and 228 public sources across 379 locations to one of four dispositions with stable downstream case IDs.                                                                  |
| AC-06     | Pass   | The contract defines 33 diagnostic codes and their phase. All codes have rejected vectors with exact source spans and `partialEffects: false`; prose fixes the public error shape and redaction rules.                                               |
| AC-07     | Pass   | Ten limit values are frozen in `contract.json`. The validator requires exactly one accepted at-limit vector and one denied one-above vector for each limit.                                                                                          |
| AC-08     | Pass   | The validator proves complete accepted production, AST-node, capability, and precedence-group coverage. The 57 denied vectors include the named malformed, unsupported, ambient, and dynamic-code forms.                                             |
| AC-09     | Pass   | The 46 adversarial vectors cover all 16 frozen threat categories, including computed constructor spellings, call escalation, accessors/proxies, cross-realm objects, extension returns, and resource abuse.                                          |
| AC-10     | Pass   | `docs/security/CSP_THREAT_MODEL.md` records assets, actors, boundaries, abuse cases, controls, severity, downstream gates, and residual authority. The independent review findings are resolved in this ticket.                                      |
| AC-11     | Pass   | The README, architecture/project guidance, public CSP page, root policy, and agent corpus use the exact preview, trusted-markup/extensions, page-policy, and non-sandbox boundary. The CSP-guide browser test checks these claims and accessibility. |
| AC-12     | Pass   | Tickets 0034 and 0035 pin grammar version 1, all manifests, threat prerequisites, and digest `69758ecd…6ff7d`. Post-policy run `2026-09-02T19-46-53-975Z-56234` passed all 12 delivery gates and the Test-phase validator.                           |

### Completion audit

The current tree contains the prose contract, threat model, owner-approved root policy, schema, six
versioned manifests, deterministic generator/validator, focused tests, public guide, agent corpus,
and downstream activation pins required by AC-01 through AC-12. The validator reports 34 accepted,
57 denied, 46 adversarial, and 33 bidirectionally referenced context recipes. It inventories 228
public sources at 379 locations and prints the pinned combined digest.

The ticket does not ship a parser, evaluator, package entrypoint, or CSP browser claim. Those remain
owned by tickets 0034 and 0035, which must resolve the four threat-review prerequisites before Code.
That boundary matches this ticket's stated scope rather than leaving required work here.

The approved policy resolves as the repository-wide policy for source paths. Focused contract,
schema, parity, documentation, route, browser, accessibility, type, spelling, static, package,
release, property, coverage, and self-hosted checks are represented by the recorded commands and the
post-policy delivery receipt.

Status: Complete

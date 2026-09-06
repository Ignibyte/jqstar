---
id: 0034
title: Implement the CSP parser and evaluator
status: testing
created: 2026-08-30
updated: 2026-09-06
---

# 0034: Implement the CSP parser and evaluator

## Plan

### Problem

Ticket 0015 approves a finite CSP expression language, but a grammar document is not an evaluator.
The implementation must match that exact language and shared engine lifecycle without falling back
to JavaScript evaluation, ambient global lookup, permissive property traversal, or unbounded
parsing.

Combining parser/evaluator implementation with package publication and browser policy proof would
make failures hard to localize. This ticket proves the engine implementation against frozen inputs;
ticket 0035 alone publishes and makes the installed browser claim.

### Current evidence

- Ticket 0007 defines StarExpressionEngine, per-kernel installation/cache ownership, structured
  compile/evaluate locations, lifecycle, disposal, and shared trusted-engine conformance groups.
- Ticket 0009 defines the validated action/helper registries that form the finite extension call
  boundary.
- Ticket 0015 freezes jqstar-csp-expression/1: EBNF, AST nodes, capability/member/call tables,
  diagnostics/spans, limits, threat statement, public-example mapping, and accepted/denied/
  adversarial/conformance manifests.
- Ticket 0014 provides runner-neutral public-runtime conformance, explicit realms, bounded flushing,
  deterministic requests, and public disposal reports.
- The current trusted engine uses Function and broad JavaScript semantics. None of its compiler,
  Proxy scope, cache entries, or ambient behavior can be reused as a shortcut.

### Activation gate

Do not begin Code until ticket 0015 is done. Record the exact grammar version and cryptographic
digests of its accepted, denied, adversarial, conformance, capability, limits, and diagnostic
inputs. Schema-validate them and prove every grammar node/capability/diagnostic has a unique
implementation mapping. Any requested syntax/capability expansion returns to ticket 0015 and a new
grammar version; it is not added during implementation.

Frozen ticket-0015 inputs:

- Grammar version: `jqstar-csp-expression/1`.
- Prose contract and threat decisions: [`docs/CSP_EXPRESSIONS.md`](../CSP_EXPRESSIONS.md) and
  [`docs/security/CSP_THREAT_MODEL.md`](../security/CSP_THREAT_MODEL.md).
- Schema and vocabulary:
  [`schema/csp-expression-contract.schema.json`](../../schema/csp-expression-contract.schema.json)
  and [`test/fixtures/csp/contract.json`](../../test/fixtures/csp/contract.json).
- Corpus: [`accepted.json`](../../test/fixtures/csp/accepted.json),
  [`denied.json`](../../test/fixtures/csp/denied.json), and
  [`adversarial.json`](../../test/fixtures/csp/adversarial.json).
- Executable context recipes: [`contexts.json`](../../test/fixtures/csp/contexts.json).
- Compatibility assignments: [`conformance-map.json`](../../test/fixtures/csp/conformance-map.json).
- Validator: `npm run test:csp-contract`. Frozen combined SHA-256 digest:
  `e80f30714d6de69db22fdc4478c042bfae3d988d87d96e42dd2fefb590ea34e6`. Activation must revalidate the
  digest before Code.

Implementation prerequisites identified by the independent threat review are part of this gate:
capture and brand raw action/helper results before JavaScript thenable assimilation, preserve exact
committed-helper leaf provenance independently from its mutable value, treat expression-bearing
response HTML as trusted markup, and resolve the engine ownership-claim lifecycle against
ticket 0007. None of these may be deferred to post-evaluation value inspection.

Activation evidence recorded on 2026-09-02:

- Ticket 0015 is `done`. `npm run test:csp-contract` schema-validates the six manifests and reports
  the pinned digest above with 34 accepted, 57 denied, 46 adversarial, and 33 context recipes.
- Action results will cross a new internal synchronous invocation handle before settlement. The
  handle stores the raw value without inspecting `then`, carries an unforgeable internal origin, and
  owns one terminal completion/failure path. Existing `StarInstance.run()` immediately settles the
  handle and retains its Promise and operation-observation behavior. The CSP evaluator validates the
  branded raw result first, settles native promises through a captured intrinsic, and rejects an
  ordinary thenable without invoking it.
- Helper lookup will use the registry's exact committed path map, not traversal of the public helper
  object. A frozen internal record binds the authored path to its committed leaf identity. Calling
  that record creates the same unforgeable raw-result origin used by action results.
- `SECURITY.md`, `docs/CSP_EXPRESSIONS.md`, and `docs/security/CSP_THREAT_MODEL.md` classify
  expression-bearing response HTML as trusted markup while JSON, signal, form, event, and returned
  values remain data. No runtime sanitizer claim is added here.
- Ticket 0007 explicitly says an engine object cannot be reclaimed after disposal and that its
  process claim is permanent. `Kernel.dispose()` currently contradicts that decision by deleting
  `claimedExpressionEngines`. This ticket will retain the weak engine claim, continue releasing the
  document claim for reinstall with a fresh engine, and add a disposed-engine reuse test.
- The activation audit found one impossible duplicate-source expectation: `nesting-limit-above` and
  adversarial `deep-input` contain the same value source but required different spans. Because the
  adversarial manifest is owned by ticket 0034, its duplicate is aligned to the one-past-limit span
  without changing syntax, limits, diagnostics, or the grammar version. The regenerated digest is
  repinned in tickets 0015, 0034, and 0035 before parser evidence is accepted.

### Scope

- Implement a deterministic tokenizer for the exact jqstar-csp-expression/1 lexical grammar. It
  reports frozen token/error codes and source spans, rejects unsupported Unicode/escape/comment/
  template/regular-expression forms, applies source/token limits before allocation growth, and
  performs no recovery or partial evaluation.
- Implement a parser that can create only the frozen discriminated AST node set. Enforce nesting,
  node, literal-entry, path, and call-argument limits while parsing; use bounded iterative
  structures or guarded recursion so one-past-limit input cannot overflow the JavaScript stack.
- Produce immutable/null-prototype AST/data records containing only node tags, allowed scalar data,
  child references, and frozen source spans. They contain no evaluator functions, constructors,
  prototypes, context values, DOM/jQuery objects, callbacks, or source closures.
- Compile value and statement entry kinds separately through the ticket-0007 engine interface. Cache
  only successful immutable programs under the exact source, entry kind, grammar/engine version, and
  authored-location category. Enforce deterministic entry/byte bounds and LRU eviction; failed
  source/context values are never retained and disposal clears all source/AST/cache data.
- Evaluate with an explicit closed context adapter for fixed bindings, signals,
  state/computed/event/ args, registered actions/helpers, requests/patches, DOM, and jQuery
  capabilities. No identifier or property is resolved through globalThis, window, document, self,
  Function, eval, dynamic import, module loading, ambient Promise/timers, or string-based lookup
  outside the frozen root table.
- Track value provenance as internal capability tags. Plain application data permits safe own data
  descriptors only; accessors/proxies that cannot be proven data-only are rejected without invoking
  them. Event, DOM, string, array, jQuery, action/helper result, and async values use their own
  exact read/write/method/result transitions from the capability manifest.
- Normalize every computed property key before access. Reject magic/reflective/callable keys before
  lookup and after calculation. A function found in state/data/event/DOM/jQuery/member/call result
  never becomes a callee; only registered action/helper origins and finite branded methods can call.
- Use kernel-realm guards and explicit wrappers rather than ambient instanceof. jQuery construction
  and methods operate only through the supplied real jQuery instance and frozen selector/method
  contract; method chaining updates provenance according to the manifest and cannot discover
  arbitrary plugins.
- Implement exact l-values and evaluation order for signal/state assignments and updates, statement
  sequences, short-circuit/nullish/conditional operators, arrays/objects, named calls, and supported
  methods. Validate an entire program before the first side effect; runtime effects before a later
  thrown error follow the frozen language semantics and are never silently rolled back.
- Adopt asynchronous results only from approved capability calls and explicit await semantics.
  Arbitrary thenables/getters are not assimilated. Preserve sequential/short-circuit order, connect
  to the owning action/request cancellation signal, ignore late completion after disposal, and
  normalize resolve/reject/cancel exactly once without retaining contexts.
- Add an action/helper dispatch seam that returns an origin-branded result before the current
  operation layer's `await action(context)` can perform JavaScript thenable assimilation. The
  ordinary trusted engine and public operation ordering must retain their current behavior.
- Count evaluation steps, path segments, collection construction, calls, and async-chain transitions
  against the ticket-0015 hard limits. Detect data/result cycles where traversal is permitted and
  fail with the exact code rather than recurse or stringify live values.
- Emit StarExpressionError-compatible diagnostics with grammar version, phase, authored location,
  exact stable code/span, and bounded source excerpt. Never serialize state/event/args, DOM/jQuery,
  action/helper results, requests/responses, credentials, error causes/stacks, or arbitrary thrown
  messages.
- Generate exhaustive dispatch/coverage checks from the frozen manifests: every allowed node and
  capability transition is implemented once; unknown tags/capabilities fail closed; every denied and
  adversarial vector reaches its expected no-side-effect diagnostic.

### Out of scope

- Publishing jquery-star/csp, changing package exports, or claiming real-browser CSP conformance.
- Expanding/reinterpreting the approved grammar, restoring full JavaScript compatibility, build-time
  expression compilation, or changing the trusted engine.
- Treating trusted directive markup, installed actions/helpers/plugins, jQuery, or DOM authority as
  untrusted/sandboxed.

### Dependencies

- Tickets 0014 and 0015.

### Acceptance criteria

- [x] [AC-01] Activation pins jqstar-csp-expression/1 and digests/schema-validates every frozen
      grammar/capability/limits/diagnostic/corpus/conformance input. Bidirectional mapping proves no
      missing/duplicate implementation node; grammar drift stops Code.
- [x] [AC-02] Every accepted lexical/grammar production and precedence edge tokenizes/parses to the
      exact immutable allowlisted AST and stable zero-based offsets plus 1-based line/column spans
      in value and statement entry modes.
- [x] [AC-03] Malformed, trailing, unsupported, invalid-escape, one-past-limit, and denied syntax
      fails at the frozen first diagnostic without recovery, partial AST reuse, evaluation, state/
      DOM/action side effect, stack overflow, or retained failed source.
- [ ] [AC-04] The engine matches every exact-parity and CSP-specific shared conformance assignment
      for signals, events, args, state/computed, actions/helpers, generic/Datastar requests,
      patches, async, short circuiting, errors, jQuery, and lifecycle; migration/unsupported cases
      remain rejected with their documented result.
- [x] [AC-05] Fixed roots and capability provenance enforce exact own-data/property/l-value/call/
      result rules. Accessors/proxies, functions stored or returned as data, arbitrary jQuery
      plugins, ambient globals, and magic/reflective/callable keys cannot be read/invoked through
      literal, bracketed, escaped, concatenated, optional, or result-derived forms.
- [x] [AC-06]
      Constructor/prototype/global/reflection/import/code-generation/WebAssembly/string-timer and
      callable-escalation corpus cases fail without invoking getters/traps where the contract
      requires refusal, exposing ambient authority, or changing application state.
- [x] [AC-07] Evaluation order, assignment/update results, statement effects, short circuiting,
      approved method chaining, finite-number/equality/property-absence semantics, and error
      normalization are deterministic at every documented boundary.
- [x] [AC-08] Approved async values resolve/reject/cancel once in order; arbitrary thenables are not
      assimilated, late completions after cancellation/disposal have no effect, and contexts/
      operations/promises are released without inventing a second cancellation owner. Tests prove
      the result is origin-branded before any public `then` lookup or JavaScript assimilation.
- [x] [AC-09] Exact source/token/nesting/node/literal/path/argument/step/async/cache entry-and-byte
      bounds accept at the boundary and reject one beyond without recursion overflow,
      nondeterministic timing, unbounded allocation, stale cache entry, or context retention.
- [x] [AC-10] Compiled programs/cache records are immutable and context-free, keyed by every
      semantics-affecting input, deterministically evicted, never shared across incompatible
      kernels/ realms/grammar versions, and completely cleared by idempotent engine/kernel disposal.
- [x] [AC-11] Diagnostics match every frozen code/phase/span, quote only bounded authored source,
      redact live values/errors/DOM/network data, and remain deterministic for cycles, proxies,
      cross-realm data, cancellation, and disposal.
- [x] [AC-12] Static AST/module/source scans and runtime canaries prove the parser/evaluator calls
      no eval, Function, dynamic import, string timer, WebAssembly code generator, trusted compiler,
      ambient global resolver, or equivalent source-to-code path.
- [x] [AC-13] Deterministic unit/property/model corpus runs across explicit Node/jsdom and real
      browser realms, including foreign-realm objects/jQuery, and public testing
      conformance/disposal reports prove no private-runtime assertion.
- [ ] [AC-14] Focused, coverage/property/static/security, browser as needed, npm run check, ticket
      phase validation, and git diff --check pass without mutation testing; no package/public CSP
      claim ships until ticket 0035.

### Design

Tokenizer, parser, immutable syntax data, context capability adapter, evaluator, async settlement,
diagnostics, and bounded cache are separate modules. Dispatch tables are total over generated enums
from the frozen contract; a default branch is always an error, never JavaScript fallback.

The evaluator works with tagged internal values. Tags describe where a value came from and which
operations the contract permits; they do not grant capabilities based on object shape. Plain values
are read through own property descriptors and reject accessors. DOM/event/jQuery operations go
through explicit adapters tied to the supplied kernel realm. Named actions/helpers are registry
capabilities, not functions returned to expression data.

Compilation is pure and context-free. Evaluation creates one short-lived frame with explicit budget,
cancellation, and location state. Await suspends that frame only for an approved async capability
and settles it once. No frame or compiled program retains a live StarContext after completion.

Framework-created `StarInstance` objects are associated with an internal expression-runtime record
in a `WeakMap`; no symbol, method, or capability is added to the public instance or context type.
Evaluation resolves that record through `context.instance`, so context spreads and overrides cannot
drop it. The record binds the exact helper resolver and synchronous named-action starter for one
application and is released when application setup rolls back or destruction begins.

The operation hub exposes an internal start/settle handle. Starting publishes the existing action
start observation, installs cancellation scope, calls the action once, and returns before inspecting
the raw result. Settlement is idempotent and publishes exactly one completed, cancelled, or failed
observation. A CSP rejection can close the handle without adopting an unapproved thenable. Public
`run()` uses the same handle and settles it immediately, preserving trusted behavior.

Generated contract constants carry the ticket-0015 digest, token/node/capability/diagnostic enums,
limits, operators, methods, and case IDs. Build-time validation compares them bidirectionally with
the manifests before evaluator code can compile or tests can run.

### Decisions

- Frozen positive grammar and capability tables are executable inputs, not prose suggestions.
- There is no fallback to the trusted compiler or ambient JavaScript semantics.
- Provenance controls access and calls; object shape and property denylists are insufficient.
- Accessors and arbitrary thenables are not data and are rejected at their boundary.
- Compilation caching is bounded, per compatible engine/kernel realm, and context-free.
- Ticket 0034 proves implementation only; ticket 0035 owns export and CSP browser claims.
- Raw action/helper results cross an internal branded record before settlement. No new public
  action, helper, context, or instance API is introduced.
- Helper call authority comes from an exact committed registry record. Nested helper object shape is
  retained only for the trusted engine's compatibility scope.
- Expression-engine claims survive kernel disposal because the engine is terminally disposed.
  Document claims still release so a fresh engine can support explicit reinstall.

### Security and accessibility

- This is no-dynamic-code construction, not an untrusted-markup sandbox. Approved jQuery, DOM,
  action, helper, request, and patch capabilities remain powerful and application-authorized.
- User/event/server data is never reparsed as source, property paths, identifiers, selectors, or
  call targets. Diagnostics do not serialize that data.
- Expression-engine selection does not alter component semantic HTML, keyboard, focus, ARIA, motion,
  color, zoom, or native fallback. Ticket 0035 proves equivalent interactions in browsers.

### Risks

- A parser can accidentally accept a JavaScript-shaped edge. Fail on the first unknown token/
  production and exhaustively generate corpus coverage.
- Getter/proxy inspection can itself execute code. Restrict plain data to own data descriptors and
  avoid generic recursive sanitization.
- Provenance can be lost after a method/call. Make every operation return an explicit tagged value
  according to the frozen transition table and property-test chains.
- Async thenable assimilation invokes attacker-controlled getters. Adopt only internally branded
  approved async results.
- Caches can retain authored source indefinitely. Enforce both byte and entry LRU limits and verify
  disposal/eviction with weak-retention fixtures where practical.

### Verification plan

- Validate/digest all immutable ticket-0015 inputs and generate total implementation mappings.
- Run accepted, denied, adversarial, public-example, shared-conformance, boundary, source-span, and
  static no-code-generation suites with deterministic seeds and fake time.
- Model/property-test tokenizer/parser/evaluator/budget/cache/async/disposal behavior, including
  malformed Unicode, deep/wide source, cycles, accessors/proxies, cross-realm values, jQuery chains,
  action/helper result escalation, cancel/dispose races, and error redaction.
- Exercise the engine through ticket-0014 public harnesses in Node/QUnit and browser realms, compare
  only cases mapped to parity, and inspect public disposal reports.
- Run focused/fast/coverage/property/static/security/check/ticket/diff gates without mutation
  testing.

### Reopened by program audit: declarative computed signals, 2026-09-06

Return to Plan because the installed CSP fixture's `data-computed:double="$count * 2"` produces an
empty `$double` output and a `CSP_CAPABILITY_ACCESSOR` event in Chromium 151.0.7922.34, Firefox
153.0, and WebKit 26.5. The same outcome occurs in baseline, reduced-motion, forced-color and reflow
profiles. The diagnostic verified all 91 installed dist files against historical tarball
`cb9a2c52039fdb5c6e0f564b0fe6299f69c3c2739f53b5c2e0eb4c8548ca2a6c`; current source shows the same
cause: `initializeComputed()` defines a getter on state, while `readState()` accepts only own data
descriptors. The existing conformance fixture supplies computed data directly and misses this real
declarative path. Evidence: `.git/jqstar/program-audit/csp-ac08-review/computed-before.json`.

Correct the internal integration so a live application's own declarative computed signal is readable
and reactive through the documented syntax. Preserve refusal of arbitrary user accessors,
foreign/copied getters, writes to computed state, and stale/disposed ownership. Do not broadly allow
accessor reads or change the frozen grammar. Before Code, verify a bounded ownership design using
the existing application expression-runtime binding, including replacement/restoration cleanup and
separate applications; measure its effect on unchanged core/CSP size budgets. The completed design
review is recorded below. If the frozen contract requires a semantic change, return that decision
to 0015.

Planned files are `src/csp/evaluator.ts`, the necessary internal expression-runtime/declarative
ownership seam, focused CSP and declarative integration tests, affected internal/public contract
wording, and this ticket. Owner 0035 adds direct installed computed assertions and runtime-error
capture. Require failing-before/passing-after regression proof, hostile getter side-effect controls,
reactive updates and complete cleanup, then focused conformance/corpus checks, coverage, package
budgets, all three strict-policy browsers, `quality:fast`, `npm run check`, and phase validation.
Mutation testing remains excluded.

### Getter ownership and evaluation bounds, 2026-09-06

The source-level regression confirms the installed finding: the trusted engine renders the initial
computed value and its update, while CSP returns an empty output with `CSP_CAPABILITY_ACCESSOR`. The
corrective design is now exercised in an isolated source prototype. A per-application map binds each
declarative getter to its original key. The existing expression-runtime binding exposes an internal
`ownsGetter` predicate for the original key and getter. Before using it, the CSP evaluator requires
the exact state object of that bound application. Arbitrary, copied, foreign, removed and destroyed
getters remain refused; nested computed results are read-only. Registration and revocation use the
existing declaration cleanup callback, including restoration of an older still-owned declaration.
The map retains only getters already owned by live declarations.

Dependent computed expressions share the existing 128-step budget within one application. A
synchronous borrowed record carries the application identity and budget across getter calls and is
restored in `finally`. Its active-getter set detects cycles. Nested failures use the recorded
internal failure code, without reading a thrown value's properties. Cycles report
`CSP_EVALUATE_CYCLE`; one step beyond the limit reports `CSP_LIMIT_EVALUATION_STEPS`. A helper
cannot conceal either failure, and reentrant work in a different application receives its own
budget. No new grammar or larger bound is introduced.

Prototype controls cover initial rendering and updates, all state-root spellings, zero arbitrary
getter calls, copied/foreign ownership, rejected writes, replacement/removal/restoration,
application destruction, cycles, repeated dependencies, exact 128/129-step boundaries, failure
containment and separate application budgets. The first ownership prototype failed the three
bounded-work controls; those retained failures led to shared accounting before integration.

Keep the unchanged 63,000-byte installed core gzip ceiling. Share the duplicated native form-model
read/write logic at module scope in `src/declarative.ts` and call it directly from both application
classes. Preserve checkbox arrays, boolean checkboxes, unchecked-radio handling, multi-select
values, and the existing declarative `jquery-star:model-write` event only when a normal value
changes. Reuse the same jQuery selection for that read/write pair. The unchecked-radio sentinel is
module-private.

Name the two private application fields `ownedEffects` and `runtimeCapabilities` before adding them,
with `computedGetters`, to the existing private property minification list. Remove the deleted
`readModel` and `writeModel` methods from that list. The AST control must still reject any public,
serialized, or foreign receiver with one of these names. Keep all public names and the existing
destroyed-application guard unchanged. The isolated prototype passes 101 tests and strict types; its
core consumer measures 192,409 raw bytes and 62,990 gzip bytes with the official Node 24 build. The
identical source/build setup reproduced the unmodified 193,511/62,994-byte baseline. These are
diagnostic measurements; installed-package size and graph checks still decide acceptance.

Implementation files are `src/csp/evaluator.ts`, `src/expression-runtime.ts`, `src/declarative.ts`,
`src/runtime.ts`, `config/runtime-private-properties.ts`, `quality/lint-boundaries.json`, new
`test/csp-computed.test.ts` and `test/model-bindings.test.ts`, the two existing application tests
whose private effect-field fixtures change, `docs/CSP_EXPRESSIONS.md`, `docs/RUNTIME_OWNERSHIP.md`,
`e2e/csp-engine.spec.ts`, and the 0033/0034 ledgers. Preserve all existing corpus, type, package and
browser checks. Owner 0035 remains responsible for the expanded strict-policy installed fixture and
manual accessibility evidence after this owner closes.

The new internal browser markup also enters the generated public-expression inventory. Regenerate
`test/fixtures/csp/conformance-map.json`, review its added locations and source assignments, and pin
the resulting aggregate digest in `src/csp/contract.ts`, `test/csp-entrypoint.test.ts`, and the
installed-package proof identity in `scripts/quality-package.mjs`. Preserve the accepted, denied,
adversarial, context, grammar and capability inputs byte-for-byte. This inventory refresh adds no
language feature. The initial focused run passed 104 cases and types; contract freshness then
correctly failed until the new browser occurrences were inventoried.

Digest review also found a pre-existing identity gap: the six manifests at `05d9110` hash to
`772ec58569443e7e186468bf3b46aee62d8449982f226f412aa1d1a2c5a53cd7`, while the exported constant and
package expectation still advertise `2726c037…349f`. The contract test currently checks only the
shape of the computed digest. Make `test/csp-contract.test.ts` require equality with the exported
constant, retain its failing-before result, and update the reviewed CSP API report's digest literal
alongside the source and installed-package expectation. The new browser fixture adds one existing
language form (`{ count: 2 }`) and four occurrences; no previous example assignment changes.

Preserve the first recorded computed failure if an application helper catches it and then attempts
more work. Add a control that catches a cycle, exceeds the same step budget, and still receives the
original cycle diagnostic. Budget failures must use first-error assignment rather than overwrite an
earlier failure. The new browser test uses optional final cleanup after disposal, since disposal
removes `$.star` from the jQuery object.

The first fast gate passes all 1,334 unit cases but refuses new typed-lint findings. Keep the
existing immutable per-file lint ratchet. The shared model helpers will stay at module scope in
`src/declarative.ts`, which already owns the two intentional generic value conversions; the behavior
runtime already depends on that module. This avoids a new dependency cycle and preserves the
existing conversion boundary without adding an allowance. Remove the temporary `src/model.ts` module
and reduce the two retired runtime conversion allowances. New tests and browser fixtures must assert
that required objects exist instead of adding non-null assertions. Represent the borrowed
computation as an application-identity/budget record, and type getter metadata as inert object
identity, so the evaluator needs neither a `this` alias nor an extracted callable method.

### Installed size correction, 2026-09-06

Delivery `2026-09-06T15-31-50-138Z-96120` confirms the computed correction passes the browser,
coverage, property, static and release gates. Package acceptance refuses two measured differences:
the Mobile reference records the old 463,278-byte UMD artifact instead of the rebuilt 463,011-byte
artifact, and the installed CSP consumer uses 39,106 Brotli bytes against the unchanged 39,000-byte
ceiling. Return to Code to correct both. The package detector also refuses the extra unexpected
failures; preserve that failure without changing its expected-failure controls.

Extend the existing explicit private-property minification list to 33 private evaluator methods in
`src/csp/evaluator.ts`. Extend `test/runtime-private-properties.test.ts` to inspect that owner while
retaining its complete-source checks for private declarations, self receivers, and absence from
public interfaces and data objects. The `ownsGetter` integration property stays outside the list.
Keep the existing two compression passes and all size limits. The isolated consumer reproduces the
39,106-byte failure before this change and measures 149,733 raw / 44,350 gzip / 38,940 Brotli bytes
after it; its AST guard passes. Installed package behavior and graphs must still pass independently.

Refresh only `referenceApp.measurements.assetBytes.jqueryStar` in
`quality/jquery-mobile-migration.json` from the rebuilt UMD file. This records an actual
measurement, not a budget increase. Compare the 31 non-CSP JavaScript files before and after
rebuilding to verify the private CSP method names do not change other entries. These two
configuration files and the existing private-property test join the planned-file manifest. Preserve
the previous prototype and delivery failures under `.git/jqstar/program-audit/csp-size-refinement/`
and the immutable run folder.

### Planned files

- `src/csp/`: generated contract constants plus tokenizer, parser, immutable AST, diagnostics,
  capabilities, evaluator, async settlement, bounded cache, and engine adapter modules. No package
  export is added in this ticket.
- `src/expression-runtime.ts`, `src/observation.ts`, `src/directive.ts`, `src/kernel.ts`,
  `src/runtime.ts`, and `src/declarative.ts`: internal raw invocation, helper provenance, context
  binding, and permanent engine-claim support while preserving public trusted behavior.
- CSP contract generation/validation scripts and generated declarations for exact enum, digest, and
  bidirectional dispatch coverage.
- Unit/property/model/conformance/adversarial tests plus cross-realm, lifecycle, raw-result,
  no-assimilation, cache, and retention fixtures.
- Architecture/security/testing documentation limited to implemented internals and this ticket;
  public installation/migration claims remain pending ticket 0035.

## Code

### Changed-file ledger

The 2026-09-06 correction adds owned declarative getters and shared bounded evaluation in
`src/declarative.ts`, `src/expression-runtime.ts`, and `src/csp/evaluator.ts`. Shared model helpers
in `src/declarative.ts` replace duplicated handling in both application classes.
`config/runtime-private-properties.ts` tracks the renamed private capability/effect fields, removes
the deleted model methods, and includes 33 private CSP evaluator methods. The existing
private-property AST test now checks the CSP owner too. `quality/jquery-mobile-migration.json`
records the rebuilt 463,011-byte UMD artifact. `quality/lint-boundaries.json` retires the two
eliminated runtime conversion allowances. The existing application tests retain their assertions
with the new private effect-field name. `test/csp-computed.test.ts` and
`test/model-bindings.test.ts` add ownership, lifecycle, budget, native-model and notification
controls. `e2e/csp-engine.spec.ts` adds the three-browser source proof. The contract inventory,
exported digest, entry test, `test/csp-contract.test.ts`, reviewed CSP API report and
installed-package expectation now bind the actual corpus identity. `docs/CSP_EXPRESSIONS.md` and
`docs/RUNTIME_OWNERSHIP.md` describe the corrected behavior. Current verification is recorded below;
the historical ledger remains as the original implementation record.

| File                                                                                               | Purpose                                                                                                          |
| -------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `docs/tickets/0034-implement-csp-parser-evaluator.md`                                              | Close the activation gate and record the raw-result, helper-provenance, markup-trust, and lifecycle plan.        |
| `src/kernel.ts`, `test/kernel.test.ts`                                                             | Keep terminally disposed expression engines permanently claimed and prove reuse fails after disposal.            |
| `docs/RUNTIME_OWNERSHIP.md`                                                                        | Distinguish the released document claim from the permanent expression-engine identity claim.                     |
| `docs/ARCHITECTURE.md`, `docs/CSP_EXPRESSIONS.md`, `docs/TESTING.md`                               | Document the implemented internal engine, retained-state boundaries, and executable proof without publishing it. |
| `src/observation.ts`, `test/observation.test.ts`                                                   | Split synchronous raw action invocation from settlement without changing public action observation order.        |
| `src/directive.ts`, `test/directive.test.ts`                                                       | Preserve exact committed helper-path provenance separately from the public nested helper scope.                  |
| `src/expression-runtime.ts`, `test/expression-runtime.test.ts`                                     | Brand raw action/helper results and bind the closed invocation runtime to each application instance.             |
| `src/runtime.ts`, `src/declarative.ts`, `test/runtime.test.ts`                                     | Install and release the internal expression runtime across behavior and attribute application lifecycles.        |
| `src/csp/contract.ts`, `src/csp/diagnostics.ts`                                                    | Pin the grammar digest, finite vocabulary, limits, and redacted source-span diagnostic format.                   |
| `src/expression-types.ts`, `src/expression.ts`                                                     | Separate the neutral engine contract from the trusted compiler so the CSP graph cannot import it.                |
| `scripts/quality/source-policy.mjs`, `scripts/quality/static-self-test.mjs`                        | Match the trusted compiler module exactly while permitting the neutral type-only CSP contract.                   |
| `src/csp/tokenizer.ts`, `test/csp-tokenizer.test.ts`                                               | Tokenize the exact bounded ASCII/string/number language with deterministic first-error spans.                    |
| `src/csp/ast.ts`, `src/csp/parser.ts`, `test/csp-parser.test.ts`                                   | Build only frozen null-prototype allowlisted nodes and enforce grammar/static limits before evaluation.          |
| `src/csp/evaluator.ts`, `src/csp/engine.ts`, `test/csp-engine.test.ts`                             | Evaluate closed tagged capabilities, explicit async results, deterministic budgets, and bounded programs.        |
| `test/property/csp.property.test.ts`                                                               | Replay seeded parser totality, arithmetic-model, and signal-write properties through the CSP engine.             |
| `e2e/csp-engine.spec.ts`                                                                           | Exercise the internal engine and foreign-realm element/jQuery rejection in Chromium, Firefox, and WebKit.        |
| `scripts/generate-csp-contract.mjs`, `test/fixtures/csp/adversarial.json`                          | Remove the contradictory full-source span from the duplicate adversarial nesting vector.                         |
| `docs/tickets/0015-publish-csp-runtime.md`, `docs/tickets/0035-publish-csp-browser-conformance.md` | Repin the frozen-input digest after the non-semantic fixture correction.                                         |
| `config/quality-budgets.json`, `docs/QUALITY_PROGRAM.md`                                           | Account for the private provenance runtime with documented next-1-KiB first-baseline bundle ceilings.            |

### Design changes

- The internal expression-runtime association is keyed by `StarInstance`, not individual
  `StarContext` objects. This preserves provenance across context spreads without changing the
  public context shape.
- Identical source and entry-kind pairs must select identical compile diagnostics and spans across
  all manifests. The parser test loads the corpus as one set and rejects future conflicts.
- The pre-assimilation action/helper provenance runtime and its cancellation liveness check add
  2,174 bytes to the UMD artifact and installed root-import consumer, plus 2,172 bytes to the
  tree-shaken core consumer. The immutable base has no quality-budget file, so the first baseline
  records that required cost with the existing next-1-KiB rule: 464,896 UMD bytes, 542,720
  root-import bytes, and 197,632 core-import bytes. No other ceiling moves.
- Reviewed jQuery calls validate a fixed arity and primitive-only argument shape before invoking the
  peer method. This keeps callback/coercion overloads unreachable even when state contains a
  function or object with conversion hooks.
- State writes revalidate an existing own data descriptor immediately before assignment and
  normalize a throwing write trap. An `=` assignment cannot invoke an accessor setter merely because
  it did not need the old value.
- A direct callable action/helper result is rejected through the branded result's failure path
  before the operation can be reported complete.
- Values read from state, computed data, event detail, and arguments receive the same finite-scalar
  and inert-plain-data classification as call results. Cross-realm plain objects remain data;
  non-finite numbers, bigint/symbol values, native promises, DOM/jQuery values, dates, and other
  custom live objects fail before reaching an operator or engine result boundary.
- The raw action operation exposes a read-only liveness check backed by its existing request/ action
  cancellation scope. The CSP adapter checks it before synchronous settlement and again when an
  approved promise settles, so cancellation cannot resume later statements and does not create a
  second cancellation controller.

## Test

Fast run `2026-09-06T15-53-09-159Z-56655` passes all six gates after the size correction, and the
Code phase validator accepts that report. The ticket returns to `testing`. `npm run test:package`
then passes the rebuilt ESM/UMD, backend, component, CSS and 257-file package contents proofs
(`csp-size-refinement/integrated-package-smoke.log`). Complete delivery remains required against
this corrected tree before closing any criterion.

The installed-size correction passes 61 focused tests across nine files, including the private
member guard, CSP corpus/engine/computed controls, native model profiles and Mobile contract. Strict
types, focused ESLint and every JavaScript/API build pass. The maintained-source consumer measures
149,733 raw / 44,350 gzip / 38,940 Brotli bytes. All 31 non-CSP JavaScript files retain their exact
pre-correction hashes, and the rebuilt UMD measures 463,011 bytes. Evidence is retained under
`.git/jqstar/program-audit/csp-size-refinement/integrated-*`. These focused results require a fresh
fast report and installed-package delivery before acceptance.

Fast report `2026-09-06T15-29-58-195Z-83390` passes all six gates, including the runner self-test,
and the Code phase validator accepts that exact report. The subsequent delivery
`2026-09-06T15-31-50-138Z-96120` ends with eleven passing gates and two failures: package quality
and its detector control, both explained by the two package findings in the correction plan above.
All 1,334 unit cases and 487 browser cases pass, with no browser skips, failures or flaky results.
Start and end fingerprints match. The ticket returns to `coding` for the size correction; a fresh
fast report and complete delivery remain required before closure or commit.

Final focused verification passes: `npm run test:coverage` meets every enforced global/subsystem
threshold and covers all changed executable lines and functions, with no missing coverage maps. Its
report and executed-test evidence are archived in `csp-computed-integration/coverage-after/`. The
final `e2e/csp-engine.spec.ts` run executes six cases across Chromium, Firefox and WebKit with zero
skips, retries, flaky or unexpected results (`browser-final/results.json`). These prove actual
computed rendering and native-click updates, zero arbitrary getter calls, copied/destroyed getter
refusal and complete disposal. Fast phase validation and the full installed delivery gate remain
required before closure.

The first coverage run executed all cases and covered every changed function and mapped executable
line. It refused one continuation line in the inline type of the borrowed budget record: the
emission map attributed syntax to that line while V8 coverage mapped the declaration's first line.
Name the record's interface separately so its erased type and executable declaration have distinct
locations. Preserve the failed reports and exact source in
`csp-computed-integration/coverage-before/` and rerun the unchanged coverage gate. No coverage
exception or threshold change is used.

The final lint correction passes strict types, focused ESLint, the unchanged immutable lint ratchet,
and 109 focused cases. No new lint allowance was added. The maintained-source core consumer now
measures 192,409 raw bytes and 62,969 gzip bytes under the unchanged 63,000-byte ceiling; exact
installed-package acceptance is still pending. The final browser fixture locations produce corpus
digest `b8838c9ca712890c296a97679f49fd7d33c39e53a362ac59952d38e556ed1ce6`, with the same 240
sources/421 occurrences and unchanged grammar/capability corpora. API extraction passes for every
entry. The earlier six-case browser rerun passed without retries, skips, or unexpected results;
repeat it after the final narrowing changes before delivery.

Integration first-pass failures are retained. `build:js` reached the CSP API report and refused the
changed digest literal until the generated report was reviewed. The internal browser run passed the
three pre-existing realm cases; all three new cases failed in final cleanup because the preceding
successful disposal had removed `$.star`. Cleanup now checks whether installation remains. A 15-case
computed run also exposed one diagnostic-order defect: a caught cycle could be overwritten by a
later step-limit failure. Both budget guards now retain the first recorded code. Rerun these focused
checks before recording broader evidence.

Current correction evidence (2026-09-06): strict types and 104 focused cases pass, including the
three native-model profiles. The initial contract run failed on the newly added browser inventory
locations. After regeneration, the stronger digest-equality control executed four cases and failed
only on the stale exported digest, as expected. The corrected six-manifest identity is
`0446a69eb9f8350cfdf6a0d9b4802515589bb569afe67c1fcaebe79925d73c63` with 34 accepted, 57 denied, 46
adversarial, 33 contexts, 240 public sources and 421 occurrences. The four new occurrences and one
literal initializer are reviewed; prior assignments and the five other manifests are unchanged. Logs
and machine-readable results are retained under
`.git/jqstar/program-audit/csp-computed-integration/`. Current browser and delivery proof remain
pending; historical results below do not close the reopened criteria.

| Command                                                                                                                                                                                                                                                                 | Result         | Evidence                                                                                                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                                                                                                                                                                                                                                                  | Fail (initial) | Run `2026-09-02T20-41-42-474Z-38362` exposed a CSP-to-trusted-compiler source-policy false positive caused by the neutral type module's prefix, two forbidden inline lint suppressions, unused contract exports, and the absent local `actionlint`. The code and policy defects were corrected; the existing checksum-verified analyzer is used on later runs. |
| `npx vitest run --config vitest.config.ts test/csp-tokenizer.test.ts test/csp-parser.test.ts test/csp-engine.test.ts test/expression-runtime.test.ts test/kernel.test.ts test/runtime.test.ts test/declarative.test.ts test/directive.test.ts test/observation.test.ts` | Pass           | 163 focused parser, evaluator, raw-result, registry-provenance, lifecycle, and trusted-compatibility tests passed before the coverage expansion.                                                                                                                                                                                                               |
| `npm run test:property`                                                                                                                                                                                                                                                 | Pass           | 30 property tests passed with seed `430043`; the three CSP properties contributed 300 effective runs for bounded UTF-16 parser totality, finite arithmetic, and isolated signal writes.                                                                                                                                                                        |
| `npm run test:coverage`                                                                                                                                                                                                                                                 | Fail (initial) | The changed-line gate identified unexercised CSP capability transitions and action/helper runtime callbacks. Direct boundary, hostile-value, fail-closed dispatch, cancellation, helper, and lifecycle tests were added without lowering thresholds.                                                                                                           |
| `npm run test:coverage`                                                                                                                                                                                                                                                 | Pass           | The final standalone gate covered every changed executable line and function. The 96-artifact denominator reached 93.08% statements/lines, 92.38% functions, and 82.86% branches; `src/csp/` reached 100% statements, functions, and lines.                                                                                                                    |
| `npm run quality:fast`                                                                                                                                                                                                                                                  | Fail (format)  | Run `2026-09-02T20-57-51-758Z-52845` passed ticket workflow, runner self-test, 815 unit tests, and all 21 static lanes; Prettier alone reported the three newly edited documentation files.                                                                                                                                                                    |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:fast`                                                                                                                                                                                                | Pass           | Run `2026-09-02T20-58-57-559Z-61464` passed ticket workflow, runner self-test, formatting, 815 unit tests across 208 suites, and all 21 static lanes with `actionlint` 1.7.12.                                                                                                                                                                                 |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0034-implement-csp-parser-evaluator.md --report .git/jqstar/runs/2026-09-02T20-58-57-559Z-61464/report.json`                                                                                             | Pass           | The coding-phase plan, changed-file ledger, and current fast report validated before the ticket moved to testing.                                                                                                                                                                                                                                              |
| `npm run test:csp-contract`                                                                                                                                                                                                                                             | Pass           | The validator pinned digest `e80f30714d6de69db22fdc4478c042bfae3d988d87d96e42dd2fefb590ea34e6` and validated 34 accepted, 57 denied, 46 adversarial, 33 context, and 228 public-source/379-occurrence assignments; four trusted-parity tests passed.                                                                                                           |
| `git diff --check`                                                                                                                                                                                                                                                      | Pass           | The current worktree has no whitespace errors.                                                                                                                                                                                                                                                                                                                 |
| `npx playwright test e2e/csp-engine.spec.ts`                                                                                                                                                                                                                            | Pass           | The internal engine passed in Chromium, Firefox, and WebKit, including genuine foreign-realm plain data plus foreign DOM and jQuery rejection.                                                                                                                                                                                                                 |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:delivery`                                                                                                                                                                                            | Fail (budget)  | Run `2026-09-02T21-02-46-027Z-70769` passed 10 of 12 lanes. All package/API/consumer/browser checks passed, but the required private provenance runtime measured 463,852 UMD bytes and 542,367 root-import bytes; the ticket-0044 control inherited that package-budget failure.                                                                               |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:package:quality`                                                                                                                                                                                        | Fail (budget)  | After the UMD/root ceilings exposed the next fail-closed sentinel, the installed core consumer measured 197,003 bytes versus its prior 194,919-byte measurement. Its 2,084-byte increase is the tree-shaken form of the same private provenance runtime.                                                                                                       |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:package:quality`                                                                                                                                                                                        | Pass           | All 13 package checks passed with measured UMD/root/core sizes below the documented first-baseline ceilings; the immutable-base ratchet remained fail-closed.                                                                                                                                                                                                  |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:quality:0044`                                                                                                                                                                                           | Pass           | All 16 ticket-0044 detectors proved live through isolated controls, including package budgets, installed-consumer sentinels, generated-output drift, browser budgets, receipt integrity, and repeated-audit invariants.                                                                                                                                        |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0034-implement-csp-parser-evaluator.md --report .git/jqstar/runs/2026-09-02T21-20-21-037Z-12725/report.json`                                                                                             | Fail           | The exact-tree delivery report passed all 12 lanes, but phase validation correctly rejected the still-empty independent inspection ledger. The source audit below records the resulting findings before corrective code.                                                                                                                                       |
| `npx vitest run --config vitest.config.ts test/csp-engine.test.ts test/expression-runtime.test.ts test/observation.test.ts`                                                                                                                                             | Pass           | 36 tests prove the inspection corrections: jQuery callback/coercion overloads stay unreachable, guarded setters and write traps fail closed, callable raw results fail rather than complete, finite/plain data classification is uniform, and cancellation cannot resume later statements.                                                                     |
| `npm run test:coverage`                                                                                                                                                                                                                                                 | Fail (initial) | The changed-line gate identified six unexercised hostile-value branches introduced by the inspection corrections. Function-member, revoked-proxy, malformed-array-descriptor, and write-trap cases were added; one provably preempted duplicate catch was removed.                                                                                             |
| `npm run test:coverage`                                                                                                                                                                                                                                                 | Pass           | All changed executable lines and functions are covered; `src/csp/` is 100% statements, functions, and lines, with 93.10% global statements/lines, 92.40% functions, and 82.92% branches.                                                                                                                                                                       |
| `npm run test:property`                                                                                                                                                                                                                                                 | Pass           | All 30 property tests passed with deterministic seed `430043`; the three CSP properties contribute 300 parser-totality, arithmetic-model, and isolated-state runs.                                                                                                                                                                                             |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:package:quality`                                                                                                                                                                                        | Pass           | All 13 checks passed after the liveness seam. Final measurements are 463,940 UMD bytes, 542,455 root-import bytes, and 197,091 core-import bytes, all below their documented first-baseline ceilings.                                                                                                                                                          |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:fast`                                                                                                                                                                                                | Fail (lint)    | Run `2026-09-02T21-47-16-870Z-51343` passed workflow, runner self-test, formatting, the complete unit suite, and 21 of 22 static lanes. ESLint alone rejected a single-assignment `let` in the revoked-proxy regression; the fixture now closes over its `const` revocation pair.                                                                              |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:fast`                                                                                                                                                                                                | Pass           | Run `2026-09-02T21-49-03-011Z-60147` passed ticket workflow, runner self-test, formatting, the complete unit suite, and all 22 fast static lanes after the inspection corrections.                                                                                                                                                                             |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0034-implement-csp-parser-evaluator.md --report .git/jqstar/runs/2026-09-02T21-49-03-011Z-60147/report.json`                                                                                             | Pass           | The corrected design, changed-file ledger, inspection resolutions, current fast report, and Code-phase status validated before the ticket returned to testing.                                                                                                                                                                                                 |
| `npx playwright test e2e/csp-engine.spec.ts`                                                                                                                                                                                                                            | Pass           | The corrected engine passed its private implementation and foreign-realm boundary proof in Chromium, Firefox, and WebKit.                                                                                                                                                                                                                                      |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:delivery`                                                                                                                                                                                            | Pass           | Run `2026-09-02T21-50-34-674Z-68841` passed all 12 enforced lanes on the inspected testing tree.                                                                                                                                                                                                                                                               |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0034-implement-csp-parser-evaluator.md --report .git/jqstar/runs/2026-09-02T21-50-34-674Z-68841/report.json`                                                                                             | Pass           | The validator accepted the exact delivery report, receipt, testing ledger, and five resolved independent inspection findings.                                                                                                                                                                                                                                  |

### Inspection ledger

| Finding                                                                                                                                                                | Resolution                                                                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Reviewed jQuery methods received raw evaluated arguments, so standard callback/coercion overloads could invoke a function or conversion hook obtained from data.       | Enforce per-method arity plus finite primitive arguments before peer invocation; retain literal-only selectors, names, classes, and authored HTML.             |
| Plain `=` state assignment skipped the old-value read, allowing an existing accessor setter or a throwing write trap to run outside the descriptor guard.              | Revalidate the target as absent or an own data descriptor immediately before every write, catch write failures, and prove an accessor setter is never invoked. |
| A synchronous callable action result was marked completed and rejected only when it later crossed the evaluator boundary.                                              | Route callable raw results through the branded failure callback immediately and test that no completed operation is published.                                 |
| State, computed, event, and argument reads classified any non-function scalar as primitive and any non-array object as data, unlike the stricter call-result boundary. | Apply the finite primitive and inert plain-object classifier to every data capability while retaining the reviewed cross-realm plain-object rule.              |
| Child-request cancellation marked its parent action scope but the raw-result record exposed no way for the evaluator to observe that terminal state.                   | Add a read-only operation liveness callback and reject late settlement before any later CSP statement runs; request/action ownership remains unchanged.        |

## Document

### Documentation changed

- `SECURITY.md` is the owner-approved repository scanner contract. It distinguishes the trusted
  compiler and trusted markup/extensions from reportable CSP, provenance, ownership, and
  data-to-source failures.
- `docs/CSP_EXPRESSIONS.md` records the implemented private engine, exact grammar/capabilities,
  finite data classification, guarded writes, fixed jQuery signatures, raw-result settlement,
  cancellation liveness, limits, diagnostics, and ticket-0035 publication boundary.
- `docs/ARCHITECTURE.md` and `docs/RUNTIME_OWNERSHIP.md` place the neutral engine contract, private
  application runtime, permanent engine claim, cache/evaluation state, and existing cancellation
  ownership at their implementation boundaries.
- `docs/TESTING.md` identifies the corpus, property, inspection-regression, source-policy,
  lifecycle, and three-browser implementation proof. `docs/QUALITY_PROGRAM.md` records the measured
  private runtime cost and first-baseline package ceilings.
- Tickets 0015, 0034, and 0035 carry the corrected frozen digest and preserve the split between
  contract, implementation, and public browser publication.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                        | Result  |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| AC-01 | `src/csp/contract.ts`, the six schema-validated fixtures, and `npm run test:csp-contract` pin `jqstar-csp-expression/1` at digest `e80f3071…34e6`; the vocabulary test compares every token, production, node, diagnostic, limit, and method bidirectionally.                                   | Pass    |
| AC-02 | `src/csp/tokenizer.ts`, `src/csp/parser.ts`, `test/csp-tokenizer.test.ts`, and `test/csp-parser.test.ts` exercise every accepted production/precedence assignment, both entry modes, frozen null-prototype nodes, and exact UTF-16 spans.                                                       | Pass    |
| AC-03 | All 57 denied and 46 adversarial vectors reach their frozen first diagnostic. Parser/engine tests assert no accessor, thenable, action, state, or DOM side effect and prove failed sources are not cached.                                                                                      | Pass    |
| AC-04 | Pending correction and current proof described in the 2026-09-06 reopening decision. Historical results below do not close this finding.                                                                                                                                                        | Pending |
| AC-05 | Tagged evaluator transitions use own descriptors and normalized safe keys. Inspection regressions prove functions/conversion hooks cannot enter jQuery overloads, accessors cannot become l-values, and foreign/live values cannot acquire DOM or jQuery authority.                             | Pass    |
| AC-06 | The complete adversarial dynamic-code, reflection, prototype, accessor/proxy, cross-realm, and callable-escalation corpus passes without exposing ambient authority or private thrown values. Source-policy and runtime canaries independently enforce the boundary.                            | Pass    |
| AC-07 | Accepted operator/state cases plus `test/property/csp.property.test.ts` prove deterministic order, short circuiting, assignment/update results, finite arithmetic, equality, absence, method results, and normalized failures with seed `430043`.                                               | Pass    |
| AC-08 | `src/expression-runtime.ts` and `src/observation.ts` brand raw results before assimilation and expose only existing operation liveness. Focused tests prove no public `then` read, exactly-once completion/failure, cancellation propagation, disposal rejection, and no late statement effect. | Pass    |
| AC-09 | At-limit and one-above corpus pairs cover all ten limits. Parser/property tests bound malformed input and recursion; engine tests prove step/async/collection limits plus deterministic 128-entry/262,144-byte LRU eviction and uncached failures.                                              | Pass    |
| AC-10 | `src/csp/engine.ts` caches only immutable context-free programs by grammar/digest/entry/source/location, clears them on disposal, and rejects retained evaluators. Weak application bindings release on destroy, and kernel tests prove a disposed engine identity cannot be reclaimed.         | Pass    |
| AC-11 | Corpus and focused diagnostic tests verify every frozen code/phase/span, location offsets, bounded excerpts, cycles/proxies/cross-realm/cancellation/disposal behavior, and omission of live values, causes, stacks, network data, and hostile messages.                                        | Pass    |
| AC-12 | The source-policy graph forbids the trusted compiler from `src/csp/`; static self-tests and evaluator canaries reject `eval`, `Function`, dynamic import, WebAssembly code generation, and string timers. All delivery static/security lanes pass.                                              | Pass    |
| AC-13 | Node/jsdom corpus, property, kernel, public testing-conformance/disposal suites, and `e2e/csp-engine.spec.ts` cover explicit realms. The private engine passes Chromium, Firefox, and WebKit with foreign plain data accepted and foreign DOM/jQuery rejected.                                  | Pass    |
| AC-14 | Pending correction and current proof described in the 2026-09-06 reopening decision. Historical results below do not close this finding.                                                                                                                                                        | Pending |

### Completion audit

The historical closure below is superseded by the 2026-09-06 reopening decision. Current completion
is pending the corrective implementation, direct evidence, and phase validation.

### Historical completion audit (2026-09-02)

The current tree contains the exact parser, immutable AST, closed evaluator, diagnostics, bounded
cache, raw action/helper provenance seam, helper leaf records, application binding, cancellation
liveness, and permanent engine identity claim required by AC-01 through AC-14. The contract remains
at digest `e80f30714d6de69db22fdc4478c042bfae3d988d87d96e42dd2fefb590ea34e6`: 34 accepted, 57
denied, 46 adversarial, 33 context recipes, and 228 public sources across 379 occurrences.

Independent inspection found and resolved five gaps beyond the generated corpus: jQuery callback/
coercion overloads, accessor-backed writes, premature callable-result completion, inconsistent
live-data classification, and cancellation-blind late settlement. Every changed executable line and
function is covered; `src/csp/` reaches 100% statements, functions, and lines. Focused browser proof
passes in Chromium, Firefox, and WebKit, while the public export and browser-policy claim remain
exclusively owned by ticket 0035.

The final audit includes the owner-approved `SECURITY.md`, affected brain documentation, measured
first-baseline package costs, exact ticket ledgers, whitespace inspection, phase validation, and a
current-tree `npm run check` covering all 12 enforced delivery lanes without mutation testing.

Historical status: Complete

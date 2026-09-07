---
id: 0035
title: Publish and prove the CSP runtime
status: testing
created: 2026-08-30
updated: 2026-09-06
---

# 0035: Publish and prove the CSP runtime

## Plan

### Problem

An internal finite evaluator is not a CSP-compatible product. The exact installed entrypoint, its
complete transitive browser graph, the application boot path, and representative jQStar behavior
must execute under a real policy without unsafe-eval or a policy violation. A source search alone
can miss a bundled trusted compiler; a dev server can silently weaken headers; one browser can
conceal a different engine's enforcement or packaging failure.

The public claim must also stay narrow: jQStar's CSP entry performs no dynamic code construction. It
does not make server-authored markup, registered extensions, jQuery/DOM authority, inline styles,
network policy, or the rest of the host application safe.

### Current evidence

- Ticket 0013 conditionally publishes modular entrypoints, formats, exports, types, render adapters,
  root compatibility, exact-package consumers, and graph/size baselines.
- Ticket 0014 provides runner-neutral installed conformance in Node, QUnit, and real browsers.
- Ticket 0015 freezes jqstar-csp-expression/1, threat statement, public-example migration map,
  limits, diagnostics, and accepted/denied/adversarial/conformance corpora.
- Ticket 0034 implements that frozen parser/evaluator behind the public engine contract but makes no
  package or real-policy claim.
- Ticket 0004/0044 provide isolated tarball, Chromium/Firefox/WebKit, accessibility,
  reproducibility, API/type, and graph evidence.
- No jquery-star/csp export, installed proof application, CSP response-header assertion,
  policy-event report, or public migration guide currently ships.

### Activation gate

Do not start Code until tickets 0013, 0014, 0015, and 0034 are done. Pin their exact public package
contract, grammar/corpus digests, engine implementation identity, compatibility mappings, threat
wording, and size/graph budgets in this ticket. Plan-validate that the proposed entrypoint imports
only public/shared no-dynamic-code modules. Any grammar/engine behavior change returns to its owner.

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

The installed proof must exercise the threat-review prerequisites implemented by ticket 0034:
pre-assimilation action/helper result branding, exact committed-helper provenance,
expression-bearing HTML as trusted markup, and the resolved engine ownership/disposal lifecycle.

### Activation evidence

- Dependencies 0013, 0014, 0015, and 0034 are `done`. Activation re-ran `npm run test:csp-contract`
  on 2026-09-02: all four validator tests passed and the inventory remained 34 accepted, 57 denied,
  46 adversarial, 33 contexts, and 228 public sources across 379 occurrences.
- The package baseline is `jquery-star@0.1.0`. Ticket 0013's modular contract is side-effect-free
  ESM and CommonJS with matched `.d.ts`/`.d.cts` declarations; only the compatibility root has a UMD
  build. The pre-CSP manifest SHA-256 is
  `3b28ee4fd94b48dece260833271981ddd55a0aa5f288a84b94bf0ae596be5a0`.
- The reviewed root/core/UI/Datastar/testing/Datastar-testing API reports have aggregate SHA-256
  `be877873890f23207f99fff25cec3ee7d09f796e9334df74cb71a3bc91e12165`, computed by hashing each
  sorted path, a NUL byte, its bytes, and a trailing NUL byte. Ticket 0035 may add only the separate
  CSP report and the neutral installer split required to keep the CSP graph compiler-free; it may
  not absorb an unrelated upstream API change.
- The frozen grammar/corpus digest is
  `e80f30714d6de69db22fdc4478c042bfae3d988d87d96e42dd2fefb590ea34e6`.
  `test/expression-engine-conformance.ts` is pinned at
  `58a1407e3b3170c059edd226e3cae8f693cd2939b2606b93901ceec2513820c8`, and
  `test/fixtures/csp/conformance-map.json` is pinned at
  `78d0740b5a94398951ce71ce268d81a97ee91b4d2f8c8a4dc07f8f9fec40460c`.
- The ticket-0034 engine and reviewed runtime boundary have aggregate SHA-256
  `65232dfdf054ff323e1487c58dabbb07deeae78b40cfd42ab12f456c5aa01260`, using the same sorted-path
  algorithm over `src/csp/*.ts`, `src/expression-runtime.ts`, `src/directive.ts`,
  `src/observation.ts`, and `src/kernel.ts`. Packaging changes must not change parser/evaluator
  behavior; a changed identity requires a recorded finding and return to the owning contract.
- The pinned threat prose hashes are
  `ef1d4883a42775824742f5ad3d30b235ced0f4a5621997b5b5177899b84ccce9` for `docs/CSP_EXPRESSIONS.md`,
  `71ee67b6445d8913e24644f84c8be35cf87d53857ee9436ee665ed49d99e0848` for the threat model, and
  `e58e20be1f6a737017c5d724cb81e5194a41fb39eeb96a3df420e18e02324f2e` for the owner-approved
  `SECURITY.md`. The required public wording remains: no dynamic code construction, trusted markup
  and trusted extensions required, and not a sandbox.
- The pre-CSP graph/size budget file is pinned at
  `34647cfe137b09632e259c7b80acc755b0a8c6d74ffe504306c00637a13fdd6f`. Existing ceilings include
  464,896 bytes for root UMD, 542,720 bytes for the installed root import, and 197,632 bytes for the
  installed core import. Ticket 0035 will establish first reviewed CSP entry and CSP consumer
  budgets without relaxing any existing ceiling. Omission graphs must continue to exclude
  `src/csp/`, while the new CSP graph must exclude `src/expression.ts`.

### Scope

- Publish side-effect-free jquery-star/csp with declarations and the module formats approved by
  ticket 0013. Expose an explicit CSP engine factory/installer; importing it does not find a global
  kernel, alter the root engine, scan DOM, register applications, or install a policy.
- Use ticket 0007's public expression-engine installation contract. Per-kernel installation is
  transactional, cannot replace a live incompatible engine silently, and returns idempotent
  ownership/disposal. Root jquery-star retains its trusted JavaScript compatibility and does not
  import or auto-select CSP.
- Build the browser entry from ticket-0034 modules plus explicitly reviewed shared runtime modules.
  Its transitive source and emitted chunks must exclude the trusted compiler/Proxy scope, Function,
  direct/indirect eval, dynamic import, string timers, WebAssembly compilation, blob/data script
  generation, script text injection, and any equivalent source-to-code construction.
- Run every accepted and assigned shared-conformance case through the exact packed entrypoint.
  Denied/adversarial/migration/unsupported cases must match frozen diagnostics and produce no
  partial application side effects. Test direct ESM and every other supported browser format
  separately.
- Serve an exact-tarball proof application from a deterministic same-origin server. It uses external
  scripts/styles and a real response policy at least as strict as: default-src none; script-src
  self; style-src self; connect-src self; img-src self; font-src self; base-uri none; object-src
  none; frame-ancestors none; form-action self. It omits unsafe-eval and does not weaken script-src
  with unsafe-inline, blob, data, wildcard, or an unneeded nonce.
- Assert the main document and relevant worker/frame/asset responses receive the intended policy, no
  duplicate/weaker meta policy substitutes for it, and redirects/errors cannot bypass the header.
  Capture securitypolicyviolation events from before jQStar boot and a bounded same-origin report
  endpoint where supported; fail on any unexpected violation, console/page error, or missing report
  instrumentation.
- Exercise behavior/declarative roots, signals/computed, actions/helpers, generic JSON/HTML,
  official-SDK Datastar patches, UI components, async/cancel/error, DOM replacement, disposal, and
  the public-example equivalents approved for the CSP grammar. Include native/no-JavaScript
  baseline, keyboard/focus/ARIA, reduced motion, forced colors, and zoom/reflow where behavior is
  affected.
- Run Chromium, Firefox, and WebKit against the exact same proof application and tarball. Record
  browser version, header, entry format, grammar/library version, corpus digest, policy events,
  operation/disposal summary, and source/tarball/bundle digest in a versioned bounded report.
- Inspect both source and emitted module graphs with parsed syntax plus forbidden
  import/chunk/census checks. String search is defense in depth only. Attempt canary expressions and
  runtime patches that would reveal Function/eval/string-timer/dynamic-import use while preserving
  the real policy as the authoritative proof.
- Prove optionality: root, core, UI, Datastar, testing, Turbo/htmx, and applications that omit the
  entry contain no CSP tokenizer/parser/evaluator/corpus. CSP consumers contain no trusted compiler.
  Record exact packed, parsed, minified, gzip/brotli sizes and fail frozen budgets.
- Publish grammar/version support, compatible/migrated/unsupported expression examples, explicit
  selection instructions, coexistence with the trusted root profile, diagnostics/limits, extension
  author responsibilities, policy template, troubleshooting, versioning, and non-sandbox threat
  wording. Do not claim that importing the entry configures the server's CSP.

### Out of scope

- Evaluating untrusted markup safely, full JavaScript syntax, arbitrary jQuery plugins, build-time
  precompilation, Trusted Types certification, sanitizer/CSRF/auth policy, or generating server
  headers automatically.
- Changing trusted-engine/root behavior or allowing CSP code into unrelated entrypoints.
- Claiming the entire host application or third-party dependencies comply merely because this
  entrypoint passes.

### Dependencies

- Tickets 0013, 0014, 0015, and 0034.

### Build correction decision (2026-09-06)

The separate CSP build duplicates the neutral runtime in the tarball. The current installed package
exceeds its packed allowance by 2,621 bytes and CSP Brotli allowance by 46 bytes. Replace the
historical self-contained CSP build choice with one coordinated ESM/CommonJS build: place the full
static dependency closure of `src/runtime.ts` in a shared runtime chunk, retain the trusted compiler
and render adapter in their existing separate chunk, and isolate the frozen CSP grammar metadata.
The CSP entry and every transitive dependency must still exclude dynamic code construction. This
changes internal distribution layout, not exported APIs, grammar, engine behavior or policy.

Two naive chunk layouts produced circular dependencies and included `Function` in CSP; the existing
graph scanner rejected both. Preserve those failures. The selected isolated layout scans clean in
both formats and measures core gzip 62,967 bytes and CSP Brotli 38,979 bytes, within unchanged
limits. Every fixed entry-file limit also passes with owner 0014's equivalent harness error helper.
These source-build measurements do not replace exact installed-package proof.

Planned files: `vite.config.ts`, removal of `vite.csp.config.ts`, `package.json`,
`quality/production-census.json`, `docs/CSP_EXPRESSIONS.md`, `docs/ARCHITECTURE.md`,
`docs/DEVELOPMENT.md`, this ticket, ticket 0033 and the roadmap. Keep declarations, exports,
sourcemaps, package documentation, compression algorithms, private-property allowlist and all
budgets. Update public serving guidance to keep the published `dist` files together. Preserve
existing example line positions. Regenerate the agent corpus if its source binding changes through
the maintained generator; do not increase its budgets.

Reopen AC-02 through AC-11 for the changed artifact; AC-07/08 and AC-12 remain pending, including
real accessibility records. Validate the plan before implementation, run focused engine/harness and
modular tests and fast checks, then build/scan the actual artifact and execute installed package,
browser, corpus, detector, coverage, reproducibility and complete delivery checks. Verify
independent trusted/CSP owners, incompatible replacement and import/disposal behavior. No mutation
execution or publication is authorized by this correction.

### Acceptance criteria

- [x] [AC-01] Activation pins and validates exact upstream API/type/format, grammar/corpus/threat,
      engine identity, graph, and size inputs before Code. No grammar/evaluator drift is absorbed by
      packaging.
- [ ] [AC-02] The exact tarball resolves jquery-star/csp declarations and every approved module
      format, verifies package/grammar version identity, and installs explicitly/transactionally per
      kernel with idempotent cleanup and no import-time global/DOM/application/policy side effect.
- [ ] [AC-03] Parsed source/emitted-graph/chunk/census scans prove the CSP entry excludes the
      trusted compiler and all
      Function/eval/dynamic-import/string-timer/WebAssembly/blob/data/script-text or equivalent
      code-construction paths; runtime canaries agree.
- [ ] [AC-04] The installed entry passes every frozen accepted and CSP-assigned conformance case.
      Denied/adversarial/migration/unsupported cases produce exact diagnostics, no partial effects,
      and no fallback to trusted JavaScript in Node/QUnit and each supported browser format.
- [ ] [AC-05] The proof server sends the asserted no-unsafe-eval/no-unsafe-inline-script policy on
      every relevant document/asset/error/redirect path; no meta policy or development-server
      default substitutes for or weakens the response contract.
- [ ] [AC-06] Chromium, Firefox, and WebKit boot and exercise the exact tarball with zero unexpected
      securitypolicyviolation events/reports, page/console errors, dynamic-code canary successes, or
      missing instrumentation. The report binds browser/header/source/tarball/bundle/corpus
      identity.
- [ ] [AC-07] Real-policy browser cases cover behavior/declarative roots, state/computed, actions/
      helpers, generic and official-SDK Datastar requests/patches, supported UI/jQuery,
      async/cancel/ error, replacement, repeated enhancement, and exact-once disposal with public
      observations.
- [ ] [AC-08] Native/no-JavaScript behavior and keyboard, focus, ARIA, screen-reader,
      reduced-motion, forced-color, zoom/reflow, and axe checks remain equivalent for the CSP proof
      interactions in all supported engines.
- [ ] [AC-09] Root/core/UI/Datastar/testing/bridge graphs that omit CSP contain no tokenizer/parser/
      evaluator/corpus. CSP graphs contain no trusted compiler; tree-shaking and packed/minified/
      compressed size budgets pass from reproducible builds.
- [ ] [AC-10] CSP and trusted engines can be used by separate explicit kernels/documents as allowed
      by the host contract without cache/context leakage; incompatible replacement is rejected and
      both disposal reports release programs, contexts, observers, requests, and applications once.
- [ ] [AC-11] Public docs state exact jqstar-csp-expression/1 support, selection/installation,
      limits, diagnostics, parity/migration/unsupported cases, server policy responsibility,
      extension requirements, and versioning. Every CSP description says no dynamic code
      construction, trusted markup/extensions required, and not a sandbox.
- [ ] [AC-12] Tarball/package/API/type/format/version, graph/size/reproducibility, shared
      conformance, adversarial/static/security, three-browser/accessibility, npm run check, ticket
      phase validation, and git diff --check pass without mutation testing.

### Design

The entrypoint is a thin explicit installer over the ticket-0034 engine. It shares only public
engine/runtime types that themselves contain no compiler import. Conditional export maps and build
entries make package topology enforce the same separation documented to users.

The current neutral runtime defaults its kernel to the trusted compiler, so importing that runtime
would place the compiler in a CSP application graph even when callers supply another engine. Split
the internal engine-required installation path from the public trusted `installStarCore` wrapper.
The CSP entry can then install the same runtime with a fresh CSP engine without importing the
trusted compiler. Preserve the existing core/root behavior and public names.

The proof server is part of the test contract, not a permissive Vite default. It sends one canonical
header and serves only same-origin external assets. A bootstrap installed before the application
records policy events into a bounded in-memory report; the server report endpoint is supplemental
because browser reporting support differs.

Graph proof starts from the packed export and follows actual conditional exports/chunks for each
format. Syntax parsing finds code-generation constructs; dependency/census checks find forbidden
modules; real-browser policy execution remains the final source-to-code authority.

### Decisions

- jquery-star/csp is explicit and optional; root compatibility remains trusted JavaScript.
- The claim covers jQStar's CSP graph, not arbitrary host or extension code.
- Real response headers in three browsers are required; a source scan or meta tag is insufficient.
- The public policy template is illustrative and strict, but server ownership remains with the host.
- Grammar compatibility is versioned and partial by design; migration replaces unsupported
  JavaScript with registered actions/helpers.

### Security and accessibility

- The proof records policy details but redacts URLs/query, source samples, DOM, form values, network
  payloads, credentials, and arbitrary console/error contents. Synthetic canaries contain no
  secrets.
- Approved expressions still have real jQuery/DOM/action/helper/request authority. CSP does not
  replace output encoding, Trusted Types where used, sanitization, authorization, CSRF, or server
  validation.
- Accessibility parity is behavioral, not only axe output. No-JavaScript controls and links remain
  meaningful because engine selection is enhancement rather than document ownership.

### Risks

- A bundler can split the trusted compiler into a surprising shared chunk. Traverse emitted imports
  from the exact CSP entry and reject any shared forbidden chunk.
- A development server can inject eval-based client code. Serve built exact-tarball assets from the
  dedicated proof server with no HMR/runtime transform.
- Policy events can be missed if listeners install late. Install the static external bootstrap
  before application scripts and also assert headers/report endpoint.
- Browser CSP reporting varies. Require zero event violations plus functional/canary proof in every
  engine; treat server reports as additional evidence, not the sole oracle.
- Users can read CSP-compatible as safe expressions. Repeat the trusted-markup/non-sandbox statement
  beside installation and grammar examples.

### Verification plan

- Validate upstream identities, build/install the exact tarball, and inspect every conditional
  export and emitted graph before starting browser proof.
- Run accepted/denied/adversarial/shared-conformance suites through installed Node/QUnit and each
  browser format.
- Start the dedicated built-asset server and run Chromium/Firefox/WebKit policy, behavior,
  accessibility, fallback, violation-reporting, and disposal matrices with fixed headers.
- Build twice and compare package/entry graphs/digests/sizes; prove optional exclusion and no
  trusted compiler in CSP consumers.
- Run focused/fast/coverage/property/static/security/browser/package/release/check/ticket/diff gates
  without mutation testing.

### Reopened by program audit: installed proof coverage, 2026-09-06

Return to Plan after direct inspection and strict-policy browser diagnostics contradicted AC-07 and
AC-08. The installed fixture contains a computed output that remains empty with
`CSP_CAPABILITY_ACCESSOR`; owner 0034 must correct that integration first. This proof must assert
initial and updated computed values and record unexpected `jquery-star:error` events in addition to
page/console errors, so handled runtime failures cannot silently pass.

The native input overflows a 640-pixel viewport with 200% root text and 200% zoom: document widths
are 744, 962, and 951 pixels in Chromium, Firefox, and WebKit. An isolated stylesheet correction
using border-box sizing, a container-relative maximum input width, and text wrapping reduces all
three to 640 pixels. The existing no-JavaScript check only inspects the href and whether the input
is editable; actual native link navigation returns 404, and the form destination also has no route.
General browser-profile results cited by the old acceptance row do not execute this strict-CSP
fixture.

Retain the before/after diagnostics in `.git/jqstar/program-audit/csp-ac08-review/`. They use the
verified historical installed `cb9a2c52039fdb5c6e0f564b0fe6299f69c3c2739f53b5c2e0eb4c8548ca2a6c`
tarball, not a final candidate. The proposed full conditional helper currently refuses the blank
computed output; do not suppress that assertion to obtain a passing acceptance result.

After 0034 closes, add direct reduced-motion, forced-color, and zoom/reflow profiles to every
installed CSP browser proof. Each must verify profile activation, keyboard/tab/focus/ARIA behavior,
computed state, native form naming, axe, unchanged response policy, unexpected runtime errors and
complete disposal. Add real native link and GET form endpoints and exercise navigation/submission
with JavaScript disabled, asserting successful destinations, submitted values, policy headers and
zero script requests. Bound and schema-validate the complete profile roster and observations;
missing profiles or weakened checks must fail. Preserve the current strict policy, grammar, canary,
outer process bound and all existing cases.

Planned files: `scripts/quality-package.mjs`, a focused CSP accessibility helper, the proof
fixture's app/stylesheet, `schema/package-report.schema.json`, package-report and meaningful
detector controls, `docs/TESTING.md`, `docs/CSP_EXPRESSIONS.md`, affected accessibility charter
guidance, and this ticket. Real screen-reader records covering the CSP interactions remain required;
automated keyboard/axe results cannot satisfy them. Record the focused before/after checks, package
proof, fast/full quality reports and all phase validators. No publication or mutation execution is
included.

### Installed proof design refinement, 2026-09-06

Ticket 0034 is done at commit `5ee0ada`. A new isolated diagnostic pins the current installed
package `c309e20b418b89417d9bfbea598ada1709bdc083e063a3408d50dea761e9f5a3` before copying its
JavaScript assets. The proposed fixture observes computed output `2 → 4 → 16`, creates an explicit
behavior root with trusted module callbacks, enhances twice, and proves one keyboard activation,
independent state during SDK patches, survival after the declarative root is destroyed, and final
kernel cleanup. A bounded jQuery error counter attaches before installation. Each browser also runs
a controlled pre-install event and proves the listener and refusal check detect it.

The three accessibility profiles run the same application sequence in Chromium, Firefox, and WebKit.
Native GET destinations return 200 with the original policy and an escaped, bounded form receipt.
The fixture supplies named outputs and a native Run server update and cleanup button so manual
testers can exercise the same behavior without console commands. Four CSP steps are added to each
assistive-technology charter; validator and omission controls require every step. No manual result
is claimed by the automated diagnostic.

Planned concrete paths additionally include `scripts/quality/csp-accessibility.mjs`,
`e2e/fixtures/csp-proof/index.html`, `test/package-release-hardening.test.mjs`,
`scripts/program-audit/manual-evidence.mjs`, `test/program-audit.test.mjs`, and
`docs/accessibility/RELEASE_CHARTERS.md`. Shared package-report validation requires the exact three
profiles, computed/behavior observations, native response statuses and receipt, and the pre-install
error detector. Semantic checks reject contradictory layout or disposal observations. Preserve the
existing 90-second per-browser bound and all package ceilings. Refresh CSP expression locations and
the four digest pins only if the maintained inventory generator reports a location change.

The retained diagnostic includes all nine profile passes, all three native link/form pairs, five
real-browser failure controls, and thirty schema/semantic report refusal controls. They guide Code;
the maintained implementation must pass its own focused, fast and complete delivery checks.

Current activation revalidates `jquery-star@1.1.0` at commit `5ee0ada`, the corpus digest
`64ad4716f84e6180d7873c3f658f8d42eed32c6fbc6b8524823e2e850f573345`, and the unchanged installed CSP
graph and 156,000/45,000/39,000 raw/gzip/Brotli ceilings. Delivery `2026-09-06T16-35-46-844Z-42041`
proves the same `c309e20b…` artifact as the diagnostic snapshot, with all selected gates passing.
Exact browser versions are Chromium 151.0.7922.34, Firefox 153.0 and WebKit 26.5. The implementation
owner is terminal; the proposed changes strengthen installed proof and native fixture behavior
without changing the finite engine.

If expression locations move, regenerate `test/fixtures/csp/conformance-map.json` and update
`src/csp/contract.ts`, `test/csp-entrypoint.test.ts`, `scripts/quality-package.mjs`, and
`etc/jquery-star-csp.api.md` together after reviewing the inventory difference. Preserve the API
report's existing line endings. Record the actual final digest before fast verification.

### Manual proof hosting design, 2026-09-06

The maintained installed proof passes all thirteen package checks and fast run
`2026-09-06T16-58-29-500Z-94819` passes all six gates. Before complete delivery, provide a runnable
manual fixture instead of requiring testers to recreate the package gate's temporary server.

Extract the existing strict-policy routes and snapshot asset loading into
`scripts/quality/csp-proof-server.mjs`, shared by package quality and a new
`scripts/serve-csp-proof.mjs` command. Preserve the official SDK, native receipts, report bounds,
redirect/error semantics and response policy. Snapshot every served asset before listening so a
manual session retains one artifact and fixture identity.

`npm run proof:csp` must first validate the current exact-tree delivery receipt and its complete
passing package report. Repack the already built candidate without build/install scripts, compare
its byte length and SHA-256 to that installed browser proof, and extract only that verified tarball
inside an owned temporary directory. Revalidate the receipt after preparation. Bind to loopback by
default; an explicit IP/port option supports a tester's chosen local setup. Retain the tarball,
receipt, package report and asset-hash session manifest under the ignored Git evidence directory.
Keep the server open until the tester stops it, then close connections and clean its temporary
workspace. The session records no manual pass automatically.

Add focused HTTP tests for immutable assets, real native endpoints and receipts, SDK/error/redirect
and bounded report handling, plus artifact-mismatch and missing-receipt startup controls in
`test/csp-proof-server.test.mjs`. Update `package.json`, `docs/DEVELOPMENT.md`, `docs/TESTING.md`,
and `docs/accessibility/RELEASE_CHARTERS.md` with the command and actual manual boundary. Re-run
installed package proof after the shared-handler extraction, followed by fast and complete delivery.
This design adds no publication, mutation tooling, external service or quality bypass.

### Planned files

- CSP public entrypoint, explicit installer/factory, types, export maps, build entries, API
  baseline, source census, and size budgets.
- Dedicated CSP proof server/application with external assets, fixed headers, event/report recorder,
  native fallback, and representative jQStar/Datastar/UI cases.
- Exact-package Node/QUnit and Chromium/Firefox/WebKit conformance/adversarial/accessibility tests.
- Source/emitted graph/chunk/code-generation scanners and versioned CSP browser report schema.
- Public CSP expressions/install/migration/security/troubleshooting docs, website pages, project
  architecture/testing/security docs, and this ticket.

### Canonical validation correction, 2026-09-06

Delivery `2026-09-06T17-09-48-357Z-25355` passed twelve gates, including all 1,341 unit tests, 487
browser cases, thirteen package checks and seven release checks. Its final detector gate correctly
refused the stale fourteen-test expectation after the CSP profile hardening added a fifteenth
passing test. Preserve the failing report and update only that exact expected count.

The HTML census also classifies the CSP proof fixture for HTML validation, but the canonical
validator and `lint:html` command select only website and registry files. The fixture itself passes
direct validation. Add `e2e/**/*.html` to both invocations and prove the actual configured validator
rejects malformed void-element markup and accepts its correction at the CSP fixture path. Verify
that every current census HTML path is selected so this omission cannot silently recur.

Additional planned files: `scripts/quality-0044-self-test.mjs`, `scripts/quality/run-static.mjs`,
`package.json`, `test/quality-standards.test.mjs`, `docs/QUALITY_PROGRAM.md`, and this ticket. Run
focused quality controls and HTML validation, then fast and complete delivery before testing the
receipt-dependent manual command. No assertion, timeout, browser roster or budget is reduced.

### CSP policy allocation correction plan (2026-09-06)

The behavior lifecycle fix increases the CSP consumer preview to 39,055 Brotli bytes against the
unchanged 39,000-byte ceiling. The selected isolated correction moves the evaluator's fixed
literal-argument method set out of per-call validation, types it as a private read-only set, and
adds `html` to that same set in place of its identical separate predicate. Both original checks
require a literal first argument only when an argument is present and report the same diagnostic and
span. Keep every method's existing arity table and unknown-method rejection unchanged.

This set contains only fixed method names and retains no application, context, argument or result.
It is never exposed or mutated after construction. No grammar, capability, trust, diagnostic,
import-time DOM behavior or public API changes. The isolated `hoist-and-merge` build measures core
gzip 62,998 and CSP Brotli 38,992 with all individual file limits and both CSP graph scans passing.
Other chunk, compiler, allocation and method-table experiments remain unapplied; their size results
do not establish semantic equivalence or acceptance.

Planned files: `src/csp/evaluator.ts`, `docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, this
ticket, owner 0033 and the roadmap. Existing public CSP guidance already states the unchanged
literal-argument and `html` requirements. Re-run the frozen contract and CSP capability/adversarial
cases, type/static checks, the actual build and installed package, current changed-code coverage and
complete delivery. Preserve unknown-method refusal, rejection of dynamic `html`, no-argument getter
and literal setter behavior. Keep all size ceilings, arity coverage, source maps, exports and
mutation deferral intact.

## Code

The literal-policy correction adds one private `ReadonlySet<string>` in `src/csp/evaluator.ts` for
fixed method names, including `html`, and uses the existing shared diagnostic predicate. The full
arity table, unknown-method check and all capability outcomes remain unchanged.
`docs/ARCHITECTURE.md` and `docs/RUNTIME_OWNERSHIP.md` describe the static metadata boundary; owner
0033 and the roadmap record current verification requirements.

The coordinated build adds the CSP entry to `vite.config.ts`, assigns all static runtime
dependencies to one neutral chunk, and keeps grammar metadata and the trusted compiler separate.
`package.json` removes the second CSP build; `vite.csp.config.ts` is removed, with its two obsolete
census references removed from `quality/production-census.json`. Public CSP serving guidance now
requires related `dist` files, and architecture/development guides describe the boundary. Exports,
types, grammar, policy, budgets and source-map contents remain unchanged. Current artifact
verification is pending.

### Changed-file ledger

The canonical validation correction passes Plan validation before Code:

| File                                                | Purpose                                                                                                               |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `scripts/quality-0044-self-test.mjs`                | Require the exact fifteen-test hardening roster after adding CSP profile controls.                                    |
| `scripts/quality/run-static.mjs` and `package.json` | Include browser-fixture HTML in canonical and standalone HTML validation.                                             |
| `test/quality-standards.test.mjs`                   | Check every current HTML path is selected and prove malformed/corrected CSP markup with the filesystem configuration. |
| `docs/QUALITY_PROGRAM.md`                           | State the expanded authored HTML scope.                                                                               |

The manual-hosting refinement passes Plan validation before these additional Code changes:

| File                                     | Purpose                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `scripts/quality/csp-proof-server.mjs`   | Share strict-policy routes and immutable served assets between automated and manual consumers. |
| `scripts/serve-csp-proof.mjs`            | Require a current receipt and exact package bytes before starting a retained manual session.   |
| `test/csp-proof-server.test.mjs`         | Verify HTTP semantics, snapshot behavior, artifact mismatch and missing-receipt refusal.       |
| `package.json`                           | Expose the explicit manual proof command.                                                      |
| `docs/DEVELOPMENT.md`                    | Document the command and verified-checkout prerequisite.                                       |
| `docs/TESTING.md`                        | Explain the exact-artifact session and required real tester records.                           |
| `docs/accessibility/RELEASE_CHARTERS.md` | Give both testers a concrete startup and evidence path.                                        |

The 2026-09-06 activation Plan passes before Code. The installed proof correction changes the
following files; the original implementation ledger below remains historical context.

| File                                        | Purpose                                                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `e2e/fixtures/csp-proof/app.js`             | Capture early runtime errors and directly observe computed values, independent behavior ownership and cleanup.                   |
| `e2e/fixtures/csp-proof/index.html`         | Provide a separate behavior root, named outputs and a native manual proof control.                                               |
| `e2e/fixtures/csp-proof/style.css`          | Keep native controls and text within their container at enlarged text and zoom.                                                  |
| `scripts/quality/csp-accessibility.mjs`     | Execute every accessibility profile and native navigation, validate observations, and prove the early listener detects an error. |
| `scripts/quality-package.mjs`               | Integrate the profile proof, actual native endpoints and complete observations into installed package evidence.                  |
| `schema/package-report.schema.json`         | Require a bounded, closed profile/native/ownership report with the pre-install error detector.                                   |
| `test/package-release-hardening.test.mjs`   | Exercise current positive report shapes and thirty negative controls.                                                            |
| `scripts/program-audit/manual-evidence.mjs` | Require four CSP steps in each real assistive-technology record.                                                                 |
| `test/program-audit.test.mjs`               | Reject omission of any CSP manual step for either supported pair.                                                                |
| `docs/accessibility/RELEASE_CHARTERS.md`    | Describe the exact native-control screen-reader sequence.                                                                        |
| `docs/TESTING.md`                           | Record automated coverage and the separate manual evidence requirement.                                                          |
| `docs/CSP_EXPRESSIONS.md`                   | Explain installed strict-policy and accessibility verification.                                                                  |

| File                                                                                          | Purpose                                                                                                  |
| --------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `src/csp.ts`, `src/csp/engine.ts`                                                             | Publish the explicit CSP installer/factory, structured contract surface, and engine identity guard.      |
| `src/runtime.ts`, `src/trusted-runtime.ts`, `src/kernel.ts`                                   | Split neutral engine-required installation from the trusted default without changing root compatibility. |
| `src/compatibility.ts`, `src/core.ts`, `src/index.ts`, `src/testing/harness.ts`               | Route existing trusted entrypoints and test harnesses through the trusted wrapper.                       |
| `src/expression-runtime.ts`, `src/realm-state.ts`, `src/plugin.ts`                            | Share private call-result and official-plugin brands across independently bundled public entries.        |
| `package.json`, `vite.config.ts`, `vite.csp.config.ts`, `scripts/build-types.mjs`             | Add side-effect-free CSP ESM/CommonJS builds, declarations, export metadata, and isolated graph output.  |
| `config/api-extractor.csp.json`, `etc/jquery-star-csp.api.md`                                 | Freeze the CSP-specific public declaration surface.                                                      |
| `scripts/quality/csp-graph.mjs`, `scripts/quality-package.mjs`                                | Inspect parsed source/emitted graphs and run exact-package format, corpus, browser, and bundle proofs.   |
| `e2e/fixtures/csp-proof/`                                                                     | Provide the external-asset strict-policy application, early violation recorder, and runtime canaries.    |
| `config/quality-budgets.json`, `schema/quality-budgets.schema.json`                           | Add immutable-base-preserving CSP package, raw bundle, and minified gzip/Brotli consumer budgets.        |
| `schema/package-report.schema.json`, `quality/public-baseline.json`                           | Bind the new export, formats, artifact sizes, graph identity, policy, browsers, and disposal evidence.   |
| `scripts/smoke-package-files.mjs`, `scripts/quality/package-release-contracts.mjs`            | Require the CSP artifacts and public CSP/security guides in the tarball.                                 |
| `test/csp-entrypoint.test.ts`, `test/csp-engine.test.ts`                                      | Prove explicit transactional installation and replay the exact packed ESM/CommonJS corpus.               |
| `test/helpers/trusted-kernel.ts`, `test/kernel.test.ts`, `test/directive-application.test.ts` | Preserve concise trusted-engine construction in existing direct-kernel tests.                            |
| `test/modular-entrypoints.test.ts`, `test/protocol-datastar.test.ts`                          | Cover modular engine selection and official Datastar composition.                                        |
| `test/request-middleware-integration.test.ts`, `test/ui-host.test.ts`                         | Retain trusted direct-kernel coverage across request and UI integration.                                 |
| `test/runtime-install.test.ts`, `e2e/site.spec.ts`                                            | Cover owned-engine construction rollback and update the shipped CSP guide contract.                      |
| `test/package-release-hardening.test.mjs`, `test/public-baseline.test.ts`                     | Keep CSP graph detectors live and validate exact evidence/additive package budgets.                      |
| `scripts/quality-0044-self-test.mjs`                                                          | Keep the package-release green control bound to the complete hardening suite.                            |
| `README.md`, `docs/CSP_EXPRESSIONS.md`, `docs/security/CSP_THREAT_MODEL.md`                   | Publish selection, policy, grammar, diagnostics, migration, threat, and troubleshooting guidance.        |
| `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/PROJECT.md`                | Update the project brain for the shipped entry, ownership seam, and exact-package proof.                 |
| `example/docs/csp/index.html`, `config/agent-content.json`, generated agent-content outputs   | Replace preview wording with the public install/policy guide and keep machine-readable parity.           |
| `docs/tickets/0035-publish-csp-browser-conformance.md`                                        | Pin activation inputs and track implementation, commands, findings, and acceptance evidence.             |

### Design changes

- The core installer now requires an expression-engine factory. `trusted-runtime.ts` owns the
  trusted default, while `csp.ts` supplies the finite engine. This keeps the CSP graph free of the
  trusted compiler without changing compatibility-root behavior.
- Historical packaging, superseded by the coordinated-build decision: dedicated CSP Vite output was
  self-contained and built after the existing multi-entry output. Its source and emitted graphs are
  independently traversed and cannot inherit a shared trusted chunk.
- Independently bundled public entries share a versioned realm-local tuple containing only the
  application-runtime map, raw-result brand, and official-plugin brand. This preserves the
  pre-assimilation provenance and reserved official namespaces when a CSP kernel composes with the
  separate UI and Datastar entries.
- Package growth uses a new CSP-only additive allowance. Every pre-CSP package and entry ceiling
  remains unchanged. CSP adds reviewed raw, installed-minified, gzip, and Brotli ceilings.
- The proof server uses external assets and one exact response policy. Redirect and error headers
  are also read directly because WebKit omits redirect headers from page response events.
- Publishing the proof and install guide added six mapped public sources and eleven occurrences but
  changed no grammar, accepted, denied, adversarial, context, or evaluator behavior. The required
  inventory regeneration advanced the combined contract/inventory digest from the activation value
  `e80f3071…34e6` to `2726c037…349f`, with 234 sources and 390 occurrences. The public
  `CSP_CONTRACT_DIGEST` and exact-package browser identity use the new aggregate.

## Test

| Command                                                              | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JQS_QUALITY_FORCE_ALL=1 npm run check` (invokes `quality:delivery`) | Pass   | `2026-09-07T01-53-29-076Z-39380/report.json`: all 13 enforced gates pass with matching 858-file fingerprint `c053e7f45e868a3f5e29824b29610eeaaec1da8b27f97ada8b4a51b834691121`. All 1,642 unit tests, 487 browser tests, 13 installed-package checks, seven release checks and 16 detector controls pass. Coverage reports no uncovered changed executable lines or functions in the nine changed runtime files. |
| Installed package sizes from that delivery run                       | Pass   | `package-report.json`: testing CommonJS/ESM are 12,975/12,988 bytes, core consumer is 62,991 gzip bytes and CSP consumer is 38,983 Brotli bytes. Existing 13,000/63,000/39,000 limits are unchanged.                                                                                                                                                                                                             |
| Actual Test phase validation for owners 0006, 0009 and 0014          | Pass   | `ownership-census/current-batch-test-validation.log`: all three validators pass against that exact delivery report before moving to Document. The final documentation and status changes require a new matching delivery receipt before commit.                                                                                                                                                                  |

Corrected fast run `2026-09-07T01-20-28-576Z-50719` passes all six gates and 1,628 unit tests with
zero failed or pending tests. Its start and end fingerprint is
`31230554ce0ee549c6073a5168197f8b6ada1499178e69df38db0b644260845a` across 856 files. Actual Code
validation passes against that exact report before returning this ticket to testing. Current
changed-code coverage and complete delivery remain required, as do the real screen-reader records.

Fast run `2026-09-07T01-18-31-719Z-37831` passes all 1,628 unit tests and every static analyzer
except spelling, which identifies one word in the allocation plan. The wording is corrected without
changing the dictionary or policy. The failed report is retained; repeat the complete fast gate
before Code closure.

Installed run `csp-literal-policy-installed-4b167b4` passes all thirteen package checks with the
behavior and literal-policy corrections together. Core gzip is 62,998 bytes and CSP Brotli is 38,992
bytes, within unchanged limits. The 265-file tarball is 2,869,763 packed bytes with digest
`13143443ea894021b3a51acf15fe3ea750959329c5966313595c52011d7c697d`. Both CSP module graphs,
API/types, ESM/CommonJS/QUnit, optional bundles and registry consumers pass. Chromium 151.0.7922.34,
Firefox 153.0 and WebKit 26.5 pass with zero unexpected CSP violations or runtime errors; each CSP
disposal releases all 57 resources. All 38 snapshotted changed inputs remain unchanged during
execution. Evidence is `ownership-census/csp-literal-policy-installed/` and its adjacent input
snapshot. Current fast, coverage, complete delivery and real screen-reader records remain required.
This execution also confirms the actual package build passes.

The literal-policy correction passes all 40 focused cases across the six CSP engine, computed,
contract, entrypoint, property and private-property test files. The frozen contract command also
passes its four tests and retains the same digest, 34 accepted, 57 denied, 46 adversarial and 33
context cases. The preceding focused ESLint command succeeds. Records are retained under
`ownership-census/csp-literal-policy-{focused,contract,eslint}.*`. The build log reaches successful
declaration extraction and CSS completion; the recovered output does not retain its process exit.
The resulting UMD remains 463,255 bytes with the same hash as the behavior correction. Fresh
installed-package execution, current fast and changed-code coverage, and full delivery remain
required before phase closure. The private size preview is not installed-package acceptance.

Installed-package run `shared-runtime-installed-4b167b4` passes all thirteen checks. Its exact
tarball digest is `c3d04c763f484dc04de195bfd37ff5d62c62ad50b013a01c4576afe6638d844d`. Both CSP
formats, parsed graphs and corpus consumers pass; Chromium 151.0.7922.34, Firefox 153.0 and WebKit
26.5 record zero unexpected policy events/reports and runtime errors. Each browser releases all 57
recorded resources. The CSP consumer measures 149,564 raw, 44,615 gzip and 38,979 Brotli bytes,
within unchanged budgets. The archive is 2,869,140 packed bytes with 265 files. All 36 recorded
input identities remain unchanged. Full delivery/reproducibility and real manual accessibility
evidence remain required; this standalone pass does not close the ticket.

Corrected fast run `2026-09-07T00-39-45-843Z-56060` passes all six gates and 1,621 unit tests with
matching 855-file fingerprints. Code validation against that exact report passes before advancing to
testing. Current installed-package and complete delivery verification remain required.

Fast run `2026-09-07T00-35-53-404Z-42795` passes all 1,621 unit tests but fails source policy
because Git's index still lists the removed CSP build config. Staging the planned deletion makes the
unchanged source-policy scan pass all 679 files. The failed report remains retained, and a fresh
complete fast run was required before advancing to testing; its passing result is above.

Coordinated-build follow-up: `npm run build` passes all JavaScript, declaration/API and CSS stages.
Actual source/ESM/CommonJS CSP graph inspection reports no forbidden module or dynamic-code
violation. The ESM graph contains only `csp.js`, the grammar chunk and the neutral runtime chunk.
All fixed individual bundle-file limits pass. Seven focused suites pass 55 tests. UMD remains
463,097 bytes with its previously recorded digest. These are build/source checks; exact
installed-package/browser/compressed-size proof remain pending.

Delivery `2026-09-06T17-32-22-094Z-2586` passes all thirteen gates with matching 831-file
fingerprints, 1,343 unit tests, 487 browser cases, thirteen package checks and seven release checks.
Test validation and current receipt verification pass before the actual
`npm run proof:csp -- --port 0` startup. The command serves the exact 257-file package
`e6d87887c1dfe85b56ea63cb334ae7985789e81350a1c3cc532fc400d59c439a` (3,169,639 packed bytes). The
retained session is `.git/jqstar/manual-csp/2026-09-06T17-51-24-188Z/session.json`.

The command smoke verifies all 22 served asset hashes, native finish-button keyboard activation,
computed/isolation observations, successful native link/form navigation and exact disposal in
Chromium, Firefox and WebKit. Its first ignored harness attempt invoked `waitForFunction` while the
boot canary was armed and was rejected as dynamic evaluation. Using DOM locators for readiness and
completion preserves the canary and passes the complete smoke. The original failure and corrected
script remain under `0035-manual-server-plan/`; maintained product files were unchanged during the
smoke. After Ctrl+C, the server's owned temporary directory is absent. Receipt verification passes
again before commit `ac9f9bd` is pushed. This is automated command evidence, not either required
screen-reader record. The ticket remains testing.

The canonical validation correction passes 32 focused quality-standard and package-hardening tests.
Fast run `2026-09-06T17-30-31-504Z-89086` passes all six gates and all 1,343 unit tests. The Code
validator passes against that exact report before this transition to testing. The actual HTML
command now includes the CSP fixture and passes; focused ESLint and whitespace checks pass. The new
controls require every current HTML file to match both command rosters and exercise
malformed/corrected markup through the same filesystem configuration as the CLI. The first isolated
API probe used the library's default loader rather than the filesystem loader and rejected the
existing fixture; the corrected probe and maintained tests use the actual project configuration.

Delivery `2026-09-06T17-09-48-357Z-25355` fails only `package-release-contract-hardening` in the
detector self-test: all fifteen cases pass, while its expected output still requires fourteen. The
other twelve gates pass on the same 831-file fingerprint. No delivery receipt is issued, and the
actual manual command startup remains unverified until the corrected complete gate passes. The
failing report and detector output remain under that immutable run directory.

The shared manual/automated server refinement passes 28 focused cases covering HTTP snapshot and
native semantics, artifact identity and missing-receipt startup refusal, package report hardening
and manual charter validation. Focused ESLint and whitespace checks pass. The CSP inventory digest
remains unchanged by the server extraction. The shared implementation passes all thirteen canonical
installed-package checks in `0035-manual-server-plan/package/package-report.json` (run
`0035-shared-csp-server`). All six fast gates pass in `2026-09-06T17-07-18-583Z-12368`; the Code
validator passed against that exact report before this transition to testing. Full delivery
verification and real screen-reader records remain required.

The maintained 2026-09-06 correction passes 31 focused cases across package-report hardening,
manual-audit validation, the CSP contract and the CSP entrypoint. The report rejects thirty missing
or contradictory CSP observations, and both manual rosters reject omission of any of the four new
CSP steps. No real assistive-technology result is claimed.

The inventory retains 34 accepted, 57 denied, 46 adversarial and 33 context cases, with 240 public
sources across 421 occurrences. Relative to commit `5ee0ada`, only fifty location line values
change: forty-six restored README locations and four fixture locations. All other fields and the
five other manifests are unchanged. The aggregate digest is
`40d98004552885f9008f8a8c25435271a5779f30f006f5f8f5e598051d81c855`; all four pins are updated.
Strict types, focused ESLint, CSS validation and HTML validation pass. The first HTML command used
an obsolete executable path and failed before analysis. The corrected binary found that the native
input lacked an explicit type; it now states `type="text"`, preserving the existing browser default.
All logs are retained. The maintained installed-package proof passes all thirteen checks under
`0035-installed-proof-plan/maintained-package/`. Its exact tarball passes ESM/CommonJS corpus and
type consumers, all three browser engines, all nine accessibility profiles, three native navigation
and submitted-receipt pairs, and three pre-install error-listener controls. Each application reports
computed `2 → 4 → 16`, zero runtime errors and 57 resources released with none remaining. Package,
module graph and compression budgets pass without changes. The later shared-server package and fast
reports above supersede this implementation proof. Complete delivery verification and real manual
evidence remain required before this ticket can close.

| Command                                                                                                                                                                                   | Result | Evidence                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:csp-contract`                                                                                                                                                               | Pass   | Activation preserved 34 accepted, 57 denied, 46 adversarial, and 33 context cases. After the required public-inventory refresh, 234 mapped sources and 390 occurrences pass at aggregate digest `2726c037…349f`.                                                       |
| `npm run test:unit`                                                                                                                                                                       | Pass   | All 824 unit, integration, contract, property-support, and hardening tests passed with the final generated inventory.                                                                                                                                                  |
| `npx vitest run test/csp-entrypoint.test.ts test/csp-engine.test.ts test/modular-entrypoints.test.ts test/kernel.test.ts`                                                                 | Pass   | 57 focused installation, exact grammar, engine, lifecycle, and modular compatibility tests passed.                                                                                                                                                                     |
| `npx vitest run test/csp-entrypoint.test.ts test/csp-engine.test.ts test/modular-entrypoints.test.ts test/plugin.test.ts test/package-release-hardening.test.mjs`                         | Pass   | 89 entry, evaluator, cross-entry plugin-brand, parsed-detector, schema, and package-hardening tests passed.                                                                                                                                                            |
| `npx tsc --noEmit --pretty false`                                                                                                                                                         | Pass   | Production and test types accepted the neutral installer split, CSP declarations, shared realm state, and proof harness.                                                                                                                                               |
| `npx vite build && npx vite build --config vite.csp.config.ts && npx vite build --config vite.umd.config.ts && node scripts/build-types.mjs --local`                                      | Pass   | Dedicated CSP ESM/CommonJS output and the reviewed CSP API report generated without a forgotten export.                                                                                                                                                                |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:package:quality` (initial attempts)                                                                                       | Fail   | Exposed additive package sizing, duplicate private brands, Playwright instrumentation interference, invalid proof namespaces/HTML/cancellation expectations, jQuery scan scope, and WebKit redirect reporting.                                                         |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:package:quality`                                                                                                          | Pass   | After correction, all 13 exact-package checks passed.                                                                                                                                                                                                                  |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:fast` (initial attempt)                                                                                                | Fail   | Found generated-output drift and missing proof-script browser globals.                                                                                                                                                                                                 |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:fast`                                                                                                                  | Pass   | Run `2026-09-02T23-01-05-163Z-94677` passed ticket workflow, runner self-test, formatting, 823 unit tests, and all 22 static gates without mutation.                                                                                                                   |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0035-publish-csp-browser-conformance.md --report .git/jqstar/runs/2026-09-02T23-01-05-163Z-94677/report.json`              | Pass   | The Code checkpoint accepted the activation evidence, changed-file ledger, design decisions, and green fast report.                                                                                                                                                    |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:delivery` (first attempt)                                                                                              | Fail   | Run `2026-09-02T23-03-01-098Z-3731` passed unit, property, static-delivery, self-hosted, package, and release lanes. It found ticket formatting/evidence wording, one rollback coverage branch, stale shipped-guide expectations, and a stale 11-test self-test count. |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:coverage`                                                                                                                 | Pass   | Changed-line coverage passed after exercising owned-engine disposal when kernel construction fails.                                                                                                                                                                    |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npx playwright test e2e/site.spec.ts --grep "CSP guide" --project=desktop-chromium --project=desktop-firefox --project=desktop-webkit` | Pass   | The shipped-guide wording and axe checks passed in all three desktop engines after making the overflowing policy block keyboard focusable.                                                                                                                             |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" node scripts/quality-0044-self-test.mjs`                                                                                               | Pass   | All 16 quality detectors failed closed under their intended sabotage, including the complete 12-test package-release hardening green control.                                                                                                                          |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:delivery` (second attempt)                                                                                             | Fail   | Run `2026-09-02T23-21-48-285Z-44434` passed 10 of 12 lanes, including browser, package, release, and detector proof. Unit and coverage both correctly rejected the inventory made stale by the policy-block accessibility edit.                                        |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:package:quality`                                                                                                          | Pass   | All 13 package checks passed with the final digest. The 200-file artifact is 2,864,412 packed bytes and 9,992,518 unpacked bytes; its strict-policy browser proof passed in all three engines.                                                                         |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run test:release:quality`                                                                                                          | Pass   | All seven clean-install, reproducibility, SBOM, license, provenance, toolchain, and packed self-hosting checks passed at artifact SHA-256 `a04f1533…2cf3`.                                                                                                             |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:delivery`                                                                                                              | Pass   | Run `2026-09-02T23-38-07-650Z-85855` passed all 12 enforced lanes and wrote the delivery receipt for one unchanged worktree fingerprint.                                                                                                                               |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0035-publish-csp-browser-conformance.md --report .git/jqstar/runs/2026-09-02T23-38-07-650Z-85855/report.json`              | Pass   | The Test checkpoint accepted the green delivery report, enforced test evidence, and inspection ledger.                                                                                                                                                                 |

### Inspection ledger

| Finding                                                                                                                                                   | Resolution                                                                                                                                                                     |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The changed-line coverage gate found that an expression engine created by the neutral installer was not explicitly tested when kernel construction fails. | Added an owned-engine rollback test that forces a detached-document constructor failure and checks exact-once disposal.                                                        |
| All three desktop browsers rejected the CSP guide's obsolete `not shipped yet` assertion after the page was updated to the shipped entry.                 | Bound the browser contract to the explicit installer and strict-policy proof wording.                                                                                          |
| Ticket 0044's green control expected 11 package-hardening tests after the CSP detector canary raised the suite to 12.                                     | Updated the fixed count so removal of any hardening test still fails the self-test.                                                                                            |
| The ticket parser requires a standalone passing result cell and did not interpret `Fail, then pass` as green evidence.                                    | Preserved failed attempts as separate rows and recorded the successful package and fast runs independently.                                                                    |
| Axe found that the single-line policy example overflowed horizontally without a keyboard-focusable scrolling region.                                      | Made the policy block keyboard focusable while preserving the exact copyable header value.                                                                                     |
| Unit and coverage both rejected the generated public-expression inventory after the CSP guide accessibility edit changed its source location metadata.    | Regenerated the five inventory artifacts and advanced the public aggregate digest to `2726c037…349f` without changing grammar, corpus counts, contexts, or evaluator behavior. |
| The regenerated digest changed the exported literal type, so API Extractor rejected the stale CSP API report before the package could build.              | Regenerated the CSP API report locally, then passed exact-package and reproducible-release quality at the new identity.                                                        |

## Document

### Documentation changed

- `README.md` documents the optional CSP entry, explicit installation, policy ownership, and
  non-sandbox boundary.
- `docs/CSP_EXPRESSIONS.md` and `docs/security/CSP_THREAT_MODEL.md` document the shipped grammar,
  diagnostics, migrations, trusted inputs, extension obligations, and verification contract.
- `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/TESTING.md`, `docs/PROJECT.md`, and
  `docs/SELF_HOSTING.md` describe the runtime split, package graph, strict-policy proof, and release
  evidence.
- `example/docs/csp/index.html` publishes the install and policy guide with a keyboard-accessible
  policy example. `config/agent-content.json` and both generated agent indexes carry the same
  boundary for machine consumers.
- `SECURITY.md` remains the exact owner-approved disclosure and security-boundary text and is
  included in the package.

### Acceptance evidence

| Criterion | Result  | Evidence                                                                                                                                                                                                                                                                                                                                                                               |
| --------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass    | Activation evidence pins the upstream package, API, grammar, corpus, threat, engine, graph, and budget identities. `npm run test:csp-contract` preserves every corpus count and records the reviewed inventory-only digest advance.                                                                                                                                                    |
| AC-02     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: `src/csp.ts`, the package export map, matched declarations, CSP API report, `test/csp-entrypoint.test.ts`, and the installed ESM/CommonJS consumers prove explicit transactional installation without import-time effects.                                               |
| AC-03     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: `scripts/quality/csp-graph.mjs`, detector canaries, and the package report prove parsed source and emitted CSP graphs contain no trusted compiler or dynamic code construction.                                                                                          |
| AC-04     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: CSP engine, contract, QUnit, installed ESM/CommonJS corpus, and package-browser tests pass accepted, denied, adversarial, migration, and assigned shared-conformance cases without trusted fallback.                                                                     |
| AC-05     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: `e2e/fixtures/csp-proof/server.mjs` and the package CSP report bind the exact response policy across 18 document, asset, redirect, and error responses per browser with early event and report capture.                                                                  |
| AC-06     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: The green package report records Chromium 151.0.7922.34, Firefox 153.0, and WebKit 26.5 with zero unexpected policy events or reports, 23 operations, and exact source, tarball, bundle, and corpus digests.                                                             |
| AC-07     | Pending | Reopened on 2026-09-06; direct computed, native, conditional accessibility and required manual proof remain outstanding.                                                                                                                                                                                                                                                               |
| AC-08     | Pending | Reopened on 2026-09-06; direct computed, native, conditional accessibility and required manual proof remain outstanding.                                                                                                                                                                                                                                                               |
| AC-09     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: The package graph census and additive budgets prove every non-CSP entry omits the finite engine, the CSP entry omits the trusted compiler, and raw/minified/gzip/Brotli/package ceilings pass without relaxing a prior limit.                                            |
| AC-10     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: `test/csp-entrypoint.test.ts`, `test/modular-entrypoints.test.ts`, `test/runtime-install.test.ts`, and the proof disposal report cover isolated engine selection, incompatible replacement, construction rollback, and exact-once cleanup with zero remaining resources. |
| AC-11     | Pending | Reopened for the coordinated build; current installed-artifact verification is required. Historical evidence: The public, project-brain, website, agent, threat, and approved security documents publish the exact grammar, selection, limits, diagnostics, migration, policy ownership, trusted-input requirement, and non-sandbox boundary.                                          |
| AC-12     | Pending | Reopened on 2026-09-06; direct computed, native, conditional accessibility and required manual proof remain outstanding.                                                                                                                                                                                                                                                               |

### Completion audit

The historical closure below is superseded by the 2026-09-06 reopening decision. Current completion
is pending the corrective implementation, direct evidence, and phase validation.

### Historical completion audit (2026-09-02)

The public surface, package topology, generated inventory, API baseline, strict-policy proof,
budgets, documentation, and ticket evidence agree on the final CSP contract and artifact identity.
No unresolved findings or required follow-up remain in this ticket.

Historical status: Complete

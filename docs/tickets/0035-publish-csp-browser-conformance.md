---
id: 0035
title: Publish and prove the CSP runtime
status: done
created: 2026-08-30
updated: 2026-09-02
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

### Acceptance criteria

- [x] [AC-01] Activation pins and validates exact upstream API/type/format, grammar/corpus/threat,
      engine identity, graph, and size inputs before Code. No grammar/evaluator drift is absorbed by
      packaging.
- [x] [AC-02] The exact tarball resolves jquery-star/csp declarations and every approved module
      format, verifies package/grammar version identity, and installs explicitly/transactionally per
      kernel with idempotent cleanup and no import-time global/DOM/application/policy side effect.
- [x] [AC-03] Parsed source/emitted-graph/chunk/census scans prove the CSP entry excludes the
      trusted compiler and all
      Function/eval/dynamic-import/string-timer/WebAssembly/blob/data/script-text or equivalent
      code-construction paths; runtime canaries agree.
- [x] [AC-04] The installed entry passes every frozen accepted and CSP-assigned conformance case.
      Denied/adversarial/migration/unsupported cases produce exact diagnostics, no partial effects,
      and no fallback to trusted JavaScript in Node/QUnit and each supported browser format.
- [x] [AC-05] The proof server sends the asserted no-unsafe-eval/no-unsafe-inline-script policy on
      every relevant document/asset/error/redirect path; no meta policy or development-server
      default substitutes for or weakens the response contract.
- [x] [AC-06] Chromium, Firefox, and WebKit boot and exercise the exact tarball with zero unexpected
      securitypolicyviolation events/reports, page/console errors, dynamic-code canary successes, or
      missing instrumentation. The report binds browser/header/source/tarball/bundle/corpus
      identity.
- [x] [AC-07] Real-policy browser cases cover behavior/declarative roots, state/computed, actions/
      helpers, generic and official-SDK Datastar requests/patches, supported UI/jQuery,
      async/cancel/ error, replacement, repeated enhancement, and exact-once disposal with public
      observations.
- [x] [AC-08] Native/no-JavaScript behavior and keyboard, focus, ARIA, screen-reader,
      reduced-motion, forced-color, zoom/reflow, and axe checks remain equivalent for the CSP proof
      interactions in all supported engines.
- [x] [AC-09] Root/core/UI/Datastar/testing/bridge graphs that omit CSP contain no tokenizer/parser/
      evaluator/corpus. CSP graphs contain no trusted compiler; tree-shaking and packed/minified/
      compressed size budgets pass from reproducible builds.
- [x] [AC-10] CSP and trusted engines can be used by separate explicit kernels/documents as allowed
      by the host contract without cache/context leakage; incompatible replacement is rejected and
      both disposal reports release programs, contexts, observers, requests, and applications once.
- [x] [AC-11] Public docs state exact jqstar-csp-expression/1 support, selection/installation,
      limits, diagnostics, parity/migration/unsupported cases, server policy responsibility,
      extension requirements, and versioning. Every CSP description says no dynamic code
      construction, trusted markup/extensions required, and not a sandbox.
- [x] [AC-12] Tarball/package/API/type/format/version, graph/size/reproducibility, shared
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

### Planned files

- CSP public entrypoint, explicit installer/factory, types, export maps, build entries, API
  baseline, source census, and size budgets.
- Dedicated CSP proof server/application with external assets, fixed headers, event/report recorder,
  native fallback, and representative jQStar/Datastar/UI cases.
- Exact-package Node/QUnit and Chromium/Firefox/WebKit conformance/adversarial/accessibility tests.
- Source/emitted graph/chunk/code-generation scanners and versioned CSP browser report schema.
- Public CSP expressions/install/migration/security/troubleshooting docs, website pages, project
  architecture/testing/security docs, and this ticket.

## Code

### Changed-file ledger

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
- Dedicated CSP Vite output is self-contained and built after the existing multi-entry output. Its
  source and emitted graphs are independently traversed and cannot inherit a shared trusted chunk.
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

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                 |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01     | Pass   | Activation evidence pins the upstream package, API, grammar, corpus, threat, engine, graph, and budget identities. `npm run test:csp-contract` preserves every corpus count and records the reviewed inventory-only digest advance.                                      |
| AC-02     | Pass   | `src/csp.ts`, the package export map, matched declarations, CSP API report, `test/csp-entrypoint.test.ts`, and the installed ESM/CommonJS consumers prove explicit transactional installation without import-time effects.                                               |
| AC-03     | Pass   | `scripts/quality/csp-graph.mjs`, detector canaries, and the package report prove parsed source and emitted CSP graphs contain no trusted compiler or dynamic code construction.                                                                                          |
| AC-04     | Pass   | CSP engine, contract, QUnit, installed ESM/CommonJS corpus, and package-browser tests pass accepted, denied, adversarial, migration, and assigned shared-conformance cases without trusted fallback.                                                                     |
| AC-05     | Pass   | `e2e/fixtures/csp-proof/server.mjs` and the package CSP report bind the exact response policy across 18 document, asset, redirect, and error responses per browser with early event and report capture.                                                                  |
| AC-06     | Pass   | The green package report records Chromium 151.0.7922.34, Firefox 153.0, and WebKit 26.5 with zero unexpected policy events or reports, 23 operations, and exact source, tarball, bundle, and corpus digests.                                                             |
| AC-07     | Pass   | `e2e/fixtures/csp-proof/app.js` exercises declarative and behavior roots, signals, computed values, actions, helpers, generic and Datastar traffic, UI, cancellation, errors, replacement, enhancement, and disposal.                                                    |
| AC-08     | Pass   | Package and browser-quality reports cover native no-JavaScript behavior, keyboard and focus behavior, ARIA, axe, reduced motion, forced colors, touch targets, zoom, and reflow across the supported projects.                                                           |
| AC-09     | Pass   | The package graph census and additive budgets prove every non-CSP entry omits the finite engine, the CSP entry omits the trusted compiler, and raw/minified/gzip/Brotli/package ceilings pass without relaxing a prior limit.                                            |
| AC-10     | Pass   | `test/csp-entrypoint.test.ts`, `test/modular-entrypoints.test.ts`, `test/runtime-install.test.ts`, and the proof disposal report cover isolated engine selection, incompatible replacement, construction rollback, and exact-once cleanup with zero remaining resources. |
| AC-11     | Pass   | The public, project-brain, website, agent, threat, and approved security documents publish the exact grammar, selection, limits, diagnostics, migration, policy ownership, trusted-input requirement, and non-sandbox boundary.                                          |
| AC-12     | Pass   | Delivery run `2026-09-02T23-38-07-650Z-85855` passed all 12 lanes. The Test checkpoint accepted its receipt, and the final `npm run check`, Document checkpoint, and `git diff --check` close the current-state audit.                                                   |

### Completion audit

The public surface, package topology, generated inventory, API baseline, strict-policy proof,
budgets, documentation, and ticket evidence agree on the final CSP contract and artifact identity.
No unresolved findings or required follow-up remain in this ticket.

Status: Complete

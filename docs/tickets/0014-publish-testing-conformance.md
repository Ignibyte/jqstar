---
id: 0014
title: Publish testing and plugin conformance tools
status: testing
created: 2026-08-30
updated: 2026-09-06
---

# 0014: Publish testing and plugin conformance tools

## Plan

### Problem

Consumers must currently assemble jQuery, DOM globals, fetch mocks, mutation flushing, and teardown
by copying repository test setup. That setup depends on private kernel access and runner-specific
stubs, so it cannot prove how a real package consumer mounts, settles, and disposes jQStar. The
plugin contract likewise lacks a reusable conformance suite or an installed external-package proof.

### Current evidence

- `test/setup.ts` installs jsdom constructors, observer shims, media queries, animation frames, and
  other browser APIs on `globalThis`; individual suites also stub `fetch` through Vitest.
- `nextUpdate()` flushes only the reactivity queue. `whenEnhanced()` additionally waits for render,
  observer, directive, UI, and reactive enhancement, but neither API defines an unbounded
  browser-idle primitive.
- Repository teardown assertions call private `kernelForDocument()` and `resourceSummary()`.
- Official SDK coverage constructs Datastar streams with `@starfederation/datastar-sdk/web`; generic
  request fixtures are handwritten per test.
- Current package smoke tests exercise built entries, but no separately packed plugin consumes only
  documented exports under both the repository runner and QUnit.
- Ticket 0013 plans side-effect-free modular entries, a public render adapter, and a bounded public
  disposal report. Those are the only runtime hooks this testing package may consume.

### Reopening decision: failed property removal (2026-09-06)

Ticket 0033 reproduced a cleanup-reporting defect in `withStarDOMRealm()` and both
response-controller restoration paths. When a property was originally absent and the caller makes
the installed property non-configurable, `Reflect.deleteProperty()` returns false. The
implementation ignored that result, leaving the property installed while reporting successful
restoration. A fresh Node process using the actual realm source and JSDOM reproduced this with
`Node`; independently bundled response source reproduced it for both the returned release function
and controller disposal. Exact inputs and results are retained in
`.git/jqstar/program-audit/ownership-census/restoration-finding.json`.

Reopen AC-02, AC-05, AC-07 and AC-12 before changing behavior. Treat failed deletion as a cleanup
failure using a fixed diagnostic, attempt all remaining restorations, release the realm lease, and
preserve any callback failure. JavaScript cannot remove a property the caller made non-configurable;
the required behavior is truthful failure reporting and completion of the other cleanup attempts.
Successful restoration and public signatures stay compatible. Mutation testing remains deferred.

Planned files: `src/testing/realm.ts`, `src/testing/responses.ts`,
`test/testing-realm-responses.test.ts`, `README.md`, `example/docs/testing/index.html`,
`docs/TESTING.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/ARCHITECTURE.md`, this ticket,
`docs/tickets/0033-audit-full-library-program.md`, and `docs/tickets/ROADMAP.md`.

The first fast run exposed generated-artifact dependencies of the guide edit. Extend the Plan to
refresh `example/agent-content.generated.json`, `example/public/jqstar-agent-index.json`,
`example/public/llms-full.txt`, and the generator's unchanged companion guide/index outputs, plus
`test/fixtures/csp/conformance-map.json`. The agent corpus must retain its existing 190,000-byte
index and 120,000-byte full-text limits. Shorten the added guide explanation without removing the
restoration contract; do not raise a budget or change the corpus/source roster. Regenerate only
through the maintained commands and retain the failed fast run.

Validate this Plan before implementation. Add a regression for real non-configurable globals in an
isolated child process, covering a successful and throwing callback, remaining descriptor
restoration, and released lease. Test real non-configurable fetch targets for explicit release and
controller disposal, including continued restoration of other targets and idempotence. Record the
failing controls before fixing all three sites. Run focused testing suites, changed-code coverage,
fast checks, installed-package/browser/release proof through complete delivery, exact phase checks
and diff checks. Update public and brain guidance to state the failure behavior. Preserve the old
closure below as historical evidence and refresh source-review identities after the correction.

### Scope

- Publish side-effect-free ESM and CommonJS `jquery-star/testing` with matched declarations. It is a
  runner-neutral harness over the explicit `jquery-star/core` installer and does not bundle a DOM
  implementation, jQuery, a test runner, or optional runtime plugins.
- Accept one caller-created `Window`/`Document` realm and its jQuery peer instance. Provide an
  opt-in scoped ambient-global manager that snapshots, installs, and exactly restores the finite set
  of browser globals jQStar requires; reject nested or concurrent realm replacement.
- Create and dispose isolated installations, mount declarative and behavior applications, install
  selected plugins, expose public application state and operation observations, and trigger a small
  documented set of native and jQuery events without proxying jQuery.
- Provide a bounded `flush()` barrier over jQStar-owned reactive, render/enhancement,
  request-fixture, and finite registered task work. Never wait for arbitrary timers, animations,
  third-party work, or real network idleness; return structured diagnostics on
  timeout/non-settlement.
- Provide deterministic generic JSON, HTML, empty, HTTP-error, network-error, delay, retry, and
  abort response fixtures through a queued fetch controller with exact request capture and
  restoration.
- Publish a side-effect-free `jquery-star/datastar/testing` extension whose success, multi-event,
  streaming, retry, malformed, failure, and abort fixtures are emitted by the official Datastar SDK
  or the public Datastar profile—not handwritten SSE strings.
- Consume ticket 0013's public disposal operation and assert exact terminal cleanup by stable owner
  and resource category. Do not expose or depend on live application, task, listener, observer,
  request, subscription, effect, hook, service, or plugin collections.
- Publish runner-neutral core and plugin conformance functions that return structured results or
  throw typed failures without importing Vitest, Jest, QUnit, or Playwright APIs.
- Build a separate example plugin package from the packed jQStar tarball using only public imports.
  Its fixture registers an action, directive, helper, observation adapter, request middleware, and
  application cleanup, then runs install, rollback, use, teardown, and disposal conformance.
- Add a second external mock-navigation plugin that replaces DOM only through the public render
  adapter, preserving marked roots and recording the operation observation.
- Run the same exported fixture/conformance functions in repository tests, an installed Node DOM
  consumer, QUnit, and a real browser smoke without a runner branch in production testing code.

### Out of scope

- Detecting arbitrary third-party timers, listeners, DOM data, or memory leaks.
- Concurrent replacement of ambient globals for multiple DOM realms in one process.
- Creating a DOM, importing jsdom, choosing a jQuery build, or binding the public API to Vitest,
  Jest, QUnit, jsdom, happy-dom, or Playwright.
- Replacing the repository's Vitest and Playwright suites with QUnit or forking QUnit.
- Publishing private kernel/resource inspection, arbitrary jQuery forwarding, assertion matchers,
  fake clocks, snapshot tooling, HTTP servers, or a general-purpose fetch mocking library.
- Adding testing code to root, core, UI, or Datastar runtime bundles.

### Dependencies

- Tickets 0006, 0009, 0010, 0011, 0012, and 0013.

### Acceptance criteria

- [x] [AC-01] `jquery-star/testing` publishes side-effect-free ESM/CommonJS and matched types.
      Import performs no jQuery installation, document/global access, listener/observer
      registration, DOM creation, test-runner registration, fetch replacement, or plugin
      installation; the entry has no runtime dependency on a DOM implementation or test runner.
- [ ] [AC-02] A caller can create a harness with one explicit same-realm `Window`, `Document`, and
      jQuery instance. Managed-global mode snapshots only its documented allowlist, restores every
      prior value or absence after success/failure, and rejects mismatched, nested, or concurrent
      realm ownership before mutation.
- [x] [AC-03] A plain installed Node/DOM consumer uses only public package exports to install core,
      mount declarative and behavior applications, install selected official/external plugins, read
      public state/observations, trigger native and jQuery events, flush work, destroy roots, and
      dispose the installation.
- [x] [AC-04] `flush()` settles work that was registered with jQStar when the call began plus work
      it transitively registers, including reactive updates, render/enhancement barriers, queued
      fixture responses, and finite tasks. Repeating timers, animation loops, third-party tasks, and
      real network are excluded; a bound breach throws a typed JSON-safe diagnostic naming only
      outstanding owned work while leaving the harness disposable.
- [ ] [AC-05] The generic response controller queues deterministic JSON, HTML, empty, HTTP failure,
      network failure, delay, retry, and abort cases; records exact method/URL/headers/body/signal
      observations; rejects unexpected or leftover requests; and restores the caller's original
      fetch property exactly after success, setup failure, or disposal.
- [x] [AC-06] `jquery-star/datastar/testing` is an optional side-effect-free extension. Its success,
      ordered multi-event, chunked streaming, retry, malformed, failure, and abort fixtures use the
      official Datastar SDK/public profile path, preserve chunk/event ordering, and are absent from
      generic testing and core dependency graphs.
- [ ] [AC-07] Disposal is idempotent and attempts all cleanup after individual failures. Harness
      assertions consume only the public frozen disposal report and verify exact stable owners plus
      application, plugin, request, task, observer, listener, subscription, effect, hook, and
      service categories; they make no claim about arbitrary third-party resources or heap leaks.
- [x] [AC-08] An independently packed plugin, installed beside the packed jQStar tarball, imports no
      private or source path and registers an action, directive, helper, observation adapter,
      request middleware, and application cleanup. Exported runner-neutral conformance proves API
      compatibility, deterministic ordering, failed-install rollback, use, root teardown,
      exactly-once plugin disposal, and failed-cleanup reporting.
- [x] [AC-09] An independently packed mock-navigation plugin uses only the public render adapter to
      destroy outgoing roots deepest-first, retain `data-jqs-preserve` identity/state/focus/value,
      commit incoming roots, await enhancement, and correlate exactly one operation ID/observation
      across success and failure without importing patch or kernel internals.
- [x] [AC-10] One shared external fixture and the same exported conformance functions run under the
      repository runner, an installed Node DOM consumer, an installed QUnit consumer, and a real
      browser. Production testing entries contain no runner-name imports or conditional branches.
- [x] [AC-11] Package/export/type checks cover import, require, NodeNext, Bundler, deep-import
      refusal, `publint`, Are the Types Wrong, and package contents. Executed bundle/module-graph
      checks prove testing, DOM implementations, runners, fixtures, and conformance examples are
      absent from root/core/UI/Datastar consumer bundles and Datastar testing is absent from generic
      testing bundles.
- [ ] [AC-12] Public and project-brain documentation defines realm ownership, supported work,
      exclusions, timeout diagnostics, response queues, teardown-report limits, runner integration,
      external plugin conformance, and preview status. Focused, coverage/property/static/browser,
      installed-package/release, `npm run check`, and `git diff --check` gates pass without mutation
      testing.

### Design

`createStarHarness({ window, jQuery, plugins? })` validates that the document belongs to the
supplied realm and calls the explicit core installer from ticket 0013. It returns an owned harness
with focused methods such as `mountDeclarative()`, `mountBehavior()`, `install()`, `state()`,
`observations()`, `triggerNative()`, `triggerJQuery()`, `flush()`, `destroy()`, and `dispose()`.
Application handles expose identity, root, state, and destruction—not a jQuery proxy or private
kernel. Inputs from another realm and use after disposal fail before touching either installation.

`withStarDOMRealm(options, work)` is the opt-in compatibility wrapper for runtimes that require
ambient DOM constructors. It acquires one process-local realm lease, snapshots own-property
descriptors for a fixed documented global allowlist, installs values derived from the supplied
window, invokes the callback, and restores descriptors in `finally`. It rejects a second lease and
does not import or instantiate jsdom. Callers whose environment already owns correct globals can
create the harness directly.

`flush({ maxRounds?, timeoutMs? })` is a bounded jQStar quiescence algorithm, not `flushAll`. Each
round drains the reactive queue, render/enhancement barrier, harness-owned response deliveries, and
finite tasks known to the public runtime contract. Work transitively registered during a round is
included until one stable round occurs. A limit breach produces `StarFlushError` with operation IDs,
stable owners, work categories, rounds, and elapsed time; it includes no callbacks, signal values,
DOM content, request bodies, or live object references.

`createResponseController()` owns a FIFO queue of exact request expectations and `Response`
factories. Installing it replaces `fetch` only inside the realm lease, records normalized request
metadata, links cancellation to each request signal, and restores the previous descriptor on every
exit path. Unmatched calls fail immediately; teardown fails when required expectations remain. The
generic entry creates JSON/HTML/status/network/delay/retry/abort responses. The separate Datastar
testing entry layers official-SDK-generated streams and profile-specific malformed-input cases over
the same controller so generic testing does not import Datastar.

`runCoreConformance()` and `runPluginConformance()` execute named asynchronous cases against a
caller-provided harness factory and return immutable structured reports, throwing
`StarConformanceError` with per-case diagnostics on failure. They contain no assertion-library or
runner registration. Repository, Node, QUnit, and browser adapters merely translate those results
into their own assertion lifecycle.

Harness disposal first destroys owned roots, then calls the public installation disposal from
ticket 0013. Assertions examine the returned terminal `StarDisposalReport`; no private
`kernelForDocument()`, `resourceSummary()`, WeakMap, or application collection is imported. Cleanup
errors preserve their report, global/fetch restoration still runs, and repeated disposal returns the
same result.

The external plugin and mock-navigation fixtures are actual separately packed packages installed
from tarballs into isolated consumers. Their source imports only declared jQStar export-map paths.
The repository can share fixture definitions and conformance functions, but cannot rewrite imports
to `src/` or inject private test helpers.

### Decisions

- Callers own DOM creation and jQuery selection. jQStar owns only the installation, applications,
  plugins, finite work, fixtures, and ambient replacements created through the harness.
- Generic testing and Datastar testing are separate export paths. Optional protocol code cannot
  enter a generic test or core consumer transitively.
- One ambient realm lease per process is an explicit safety boundary. Parallel test files must use
  isolated worker processes or environments rather than racing global replacement.
- `flush()` waits only on registered finite work and is bounded even when callers omit options. Fake
  clocks and arbitrary browser idleness remain runner responsibilities.
- Teardown conformance relies on terminal public disposal facts. Live inspection remains reserved
  for ticket 0030 and is not required to test cleanup.
- Conformance functions own cases and reports; test runners own suite registration, assertions,
  output formatting, parallelism, and process exit behavior.
- The entries are 0.4 previews until ticket 0017 completes the stable-platform audit.

### Security and accessibility

- Realm validation prevents cross-document constructor confusion. Global and fetch replacements are
  finite, descriptor-preserving, mutually exclusive, and restored through all failure paths.
- Diagnostics and disposal reports exclude signal values, HTML, request bodies, headers marked
  sensitive, callbacks, DOM nodes, error causes not explicitly serialized, and live references.
- Datastar fixtures use the official encoder for valid streams. Malformed cases are fixed inert byte
  fixtures that test rejection and never become a second production protocol implementation.
- Response fixtures default to local deterministic URLs and cannot silently fall through to the
  network. Explicit passthrough is outside this ticket.
- Real-browser conformance includes keyboard interaction, focus preservation, native control state,
  reduced motion, forced colors, and the enhancement barrier where the exercised plugin affects UI.

### Risks

- A generic `flushAll` can hide unbounded timers. Flush only registered finite work and fail with a
  diagnostic when the queue does not settle.
- Test helpers can become a second public runtime. Keep them focused on setup, observation,
  fixtures, and cleanup.
- Ambient global replacement can corrupt concurrent tests or lose accessor descriptors. Lease the
  realm before mutation, restore exact descriptors in reverse order, and test setup/body/cleanup
  failures.
- Importing the Datastar SDK from generic testing would defeat modularity. Put SDK-backed fixtures
  behind a distinct export and prove its absence from the generic module graph.
- A conformance suite can accidentally bless implementation details. Assert documented registrar,
  observation, middleware, render, and disposal outcomes only from packed public entries.
- A request delay or retry fixture can strand work after a test failure. Give every fixture an
  abortable owner and make harness disposal cancel and settle it before returning.

### Verification plan

- Validate this Plan before changing behavior.
- Add unit/property matrices for realm leasing/restoration, cross-realm rejection, both application
  modes, plugin installation/rollback, event helpers, flush transitive work/limits/diagnostics,
  response queue exactness, abort/retry, disposal success/failure/idempotence, and JSON-safe output.
- Pack jQStar plus the external conformance and mock-navigation packages. Install them into fresh
  isolated consumers and prove every import resolves from the public export map with no workspace,
  source alias, hoisted undeclared dependency, or private path available.
- Run the same fixture/conformance functions under Vitest, a plain Node/jsdom consumer, QUnit, and
  Chromium/Firefox/WebKit browser smoke. Test global/fetch restoration after setup, case, flush,
  cleanup, and runner assertion failures.
- Generate valid Datastar fixture streams through the official SDK and cover success, event/chunk
  ordering, retry, malformed input, server/network failure, abort, and generic-entry exclusion.
- Build root, core, UI, Datastar, generic testing, and Datastar-testing consumers. Inspect executed
  behavior, output sentinels, dependency graphs, raw/gzip budgets, source maps, types, side-effect
  metadata, and forbidden imports rather than relying on size alone.
- Run `publint`, Are the Types Wrong, Node import/require, TypeScript NodeNext/Bundler, browser
  modules, package contents, private deep-import refusal, API reports, public baseline, production
  census, release reproducibility, and the existing installed-package matrix.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage, properties,
  three-engine browser quality, package quality, `npm run check`, ticket Test/Document validation,
  and `git diff --check` without mutation testing.

### Planned files

- `src/testing/index.ts`, `src/testing/harness.ts`: Side-effect-free harness creation, application
  handles, focused state/observation/event helpers, bounded flush, destruction, and disposal.
- `src/testing/realm.ts`: Explicit realm validation plus leased, descriptor-preserving
  ambient-global installation/restoration.
- `src/testing/responses.ts`: Exact FIFO request controller, generic deterministic response
  factories, request observations, cancellation, leftover checks, and fetch restoration.
- `src/testing/conformance.ts`, `src/testing/errors.ts`, `src/testing/types.ts`: Runner-neutral core
  and plugin cases, immutable reports, typed diagnostics, and public contracts.
- `src/datastar/testing.ts`: Optional official-SDK-backed Datastar stream fixtures and fixed
  malformed protocol cases over the generic response controller.
- `src/core.ts`, `src/runtime.ts`, `src/types.ts`, `src/kernel.ts`: Only the minimal public
  finite-work and terminal-disposal hooks approved in ticket 0013; no live testing-only inspection
  API.
- `vite.config.ts`, `tsconfig.build.json`, `config/api-extractor*.json`, `scripts/build-types.mjs`:
  Generic and Datastar-testing ESM/CommonJS builds, declarations, source maps, and API reports.
- `package.json`, `package-lock.json`, `quality/public-baseline.json`,
  `quality/production-files.json`: Export conditions, side effects, package contents, public review,
  production census, and commands.
- `test/testing-*.test.ts`, `test/property/testing-*.property.test.ts`: Realm, harness, flush,
  responses, conformance, disposal, failure, and generated state-machine coverage.
- `test/fixtures/external-plugin/`, `test/fixtures/mock-navigation-plugin/`: Independently versioned
  plugin packages with only public imports and their own manifests/types/builds.
- `scripts/quality-package.mjs`, `scripts/smoke-package-files.mjs`,
  `test/package-release-hardening.test.mjs`: Packed multi-consumer installation, hoisting refusal,
  export/type/graph/sentinel/size checks, QUnit execution, and reproducibility proof.
- `e2e/testing-conformance.spec.ts`, `e2e/fixtures/`: Shared browser conformance, navigation,
  streaming, focus/state preservation, and accessibility-sensitive behavior.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`, website testing/plugin
  pages: Realm setup, harness API, response fixtures, conformance integration, limits, and examples.
- `docs/tickets/0014-publish-testing-conformance.md`: Phase state, ledger, commands, findings, and
  criterion evidence.

## Code

### Changed-file ledger

| File                                                                                         | Purpose                                                                                       |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `docs/tickets/0014-publish-testing-conformance.md`                                           | Track phase, implementation, commands, and criterion evidence.                                |
| `src/testing/{index,harness,realm,responses,conformance,errors,types}.ts`                    | Publish the runner-neutral harness, fixtures, realm lease, diagnostics, and conformance API.  |
| `src/datastar/testing.ts`                                                                    | Publish official-SDK-backed Datastar response fixtures separately from generic testing.       |
| `package.json`, `tsconfig.json`, `vite.config.ts`, `knip.json`, `.prettierignore`            | Define resolvable, side-effect-free testing entries and their build/static-analysis contract. |
| `config/api-extractor.{testing,datastar-testing}.json`, `config/tsconfig.api-extractor.json` | Roll up and review the two new declaration surfaces.                                          |
| `scripts/build-types.mjs`, `etc/jquery-star-{testing,datastar-testing}.api.md`               | Emit matched ESM/CommonJS types and checked API reports.                                      |
| `scripts/quality-package.mjs`, `scripts/smoke-package-files.mjs`                             | Pack and exercise testing entries, external plugins, types, graphs, sizes, and runners.       |
| `config/quality-budgets.json`, `schema/{quality-budgets,package-report}.schema.json`         | Ratchet the new entry and consumer artifacts without relaxing existing budgets.               |
| `quality/public-baseline.json`, `test/{public-baseline,package-release-hardening}.test.*`    | Freeze public exports, package evidence, type surfaces, and dependency boundaries.            |
| `test/testing-*.test.ts`, `test/datastar-testing.test.ts`                                    | Cover harness, realm, response, Datastar, plugin, render, failure, and cleanup behavior.      |
| `test/property/testing.property.test.ts`                                                     | Generate bounded response and harness state sequences.                                        |
| `test/fixtures/{external-plugin,mock-navigation-plugin}/`                                    | Supply separately packable public-only plugin and render-adapter consumers.                   |
| `e2e/testing-conformance.spec.ts`, `e2e/fixtures/runtime.ts`                                 | Run shared conformance and navigation behavior in all supported browser engines.              |
| `README.md`, `docs/{README,ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`               | Define preview use, ownership, supported work, exclusions, disposal, and evidence.            |
| `example/docs/{testing,plugins}/index.html`, `example/docs/{index,api}/index.html`           | Publish testing and plugin guides and connect them to the existing documentation.             |
| `example/docs-shell.html`, `vite.demo.config.ts`, `test/site-structure.test.mjs`             | Add both guides to navigation, the site build, and route structure checks.                    |
| `config/agent-content.json`, `example/{agent-content.generated.json,public/}`                | Add reviewed testing/plugin records and regenerate bounded agent artifacts.                   |
| `e2e/site.spec.ts`, `scripts/smoke-deployment.mjs`                                           | Exercise and package both new public documentation routes.                                    |

### Current correction ledger (2026-09-06)

| File                                                                                                                                       | Purpose                                                                                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/testing/realm.ts`                                                                                                                     | Report a refused deletion, continue other global restorations and preserve callback failures.                                                                  |
| `src/testing/responses.ts`                                                                                                                 | Share exact fetch restoration between explicit release and disposal, including failed deletion.                                                                |
| `test/testing-realm-responses.test.ts`                                                                                                     | Cover real non-configurable globals in isolated children, controlled deletion refusal, callback aggregation, fetch targets, continued cleanup and idempotence. |
| `README.md`, `example/docs/testing/index.html`                                                                                             | Explain the public restoration failure behavior and its non-configurable-property limit.                                                                       |
| `docs/TESTING.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/ARCHITECTURE.md`                                                                     | Record failed-removal reporting and the remaining cleanup/lease contract.                                                                                      |
| `example/agent-content.generated.json`, `example/public/{jqstar-agent-index.json,llms-full.txt}`, `test/fixtures/csp/conformance-map.json` | Regenerate the affected guide corpus and source inventory through maintained producers within unchanged limits.                                                |
| This ticket, `docs/tickets/0033-audit-full-library-program.md`, `docs/tickets/ROADMAP.md`                                                  | Retain the confirmed finding, reopening, commands, evidence and prerequisite status.                                                                           |

### Design changes

No changes from the approved Plan. Declaration rollups use small CommonJS re-export shims, and the
existing render adapter is a shared build chunk, so the two testing formats remain matched without
duplicating the core runtime or relaxing immutable package budgets.

## Test

| Command                                                   | Result | Evidence                                                                                                                                                                                                                                                                                                                                                     |
| --------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run quality:fast`                                    | Pass   | `.git/jqstar/runs/2026-09-06T22-38-12-350Z-72785/report.json`: all five selected gates and 1,572 unit tests pass; unchanged runner self-test explicitly skips.                                                                                                                                                                                               |
| Owner 0014 Code validation against that exact fast report | Pass   | `ownership-census/restoration-code-validation.log`; phase validation passed before moving to testing.                                                                                                                                                                                                                                                        |
| `JQS_QUALITY_FORCE_ALL=1 npm run check`                   | Fail   | `2026-09-06T22-42-15-929Z-79902` rejects the fast-result row beneath a subsection. After confirming that failure, the owned runner received SIGTERM and ended without a receipt. Move the passing fast result into this main Test ledger, validate the changed tickets, and retry full delivery. Interrupted or unexecuted gates supply no passing evidence. |

### Restoration correction verification (2026-09-06)

Plan validation passed before code changes. The standalone realm probe used the actual source in a
fresh Node process with JSDOM and reproduced false success; independently bundled response source
reproduced it for explicit release and disposal. Five corrected regression cases fail against the
original committed source. Both fixed source files were restored byte-for-byte in `finally` after
that negative control. The complete focused testing group then records 38 passing tests across four
files, including every new regression.

The first child-test draft resolved `import.meta.url` through the browser test transform and
produced an unsupported HTTP module URL. It now uses Node path-to-file-URL conversion. A later draft
used an opaque JSDOM origin, causing storage setup to fail before the callback; the child now has an
explicit HTTPS test origin. Those fixture failures remain in their logs and are separate from the
reproduced product defect. The final negative control uses the corrected tests and rejects all five
intended original-source failures without either setup error.

| Command                                                      | Result                 | Evidence                                                                                                                   |
| ------------------------------------------------------------ | ---------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Owner 0014 Plan validation                                   | Pass                   | Required fields, reopening and all eleven planned paths were recorded before implementation.                               |
| Actual isolated realm and response deletion probes           | Confirmed defect       | `ownership-census/restoration-finding.json` binds original source and the three false-success results.                     |
| Corrected regression suite against original committed source | Five expected failures | `ownership-census/restoration-regression-original-source.log` and its JSON record; the fixed files were restored exactly.  |
| Focused realm, harness, external-plugin and Datastar suites  | Pass, 38 tests         | `ownership-census/restoration-focused-corrected.log`; real-property, continued-cleanup and callback-error assertions pass. |

Fast run `2026-09-06T22-33-00-786Z-59080` passes format, workflow and all static checks, but its
unit gate has four failures: three agent-corpus size checks and one stale CSP source inventory. It
passes 1,568 of 1,572 tests. The initial explanation exceeded the unchanged 190,000-byte agent index
limit. Shorten that paragraph, regenerate the derived corpus and CSP inventory under the extended
Plan, then repeat fast verification. Coverage and complete delivery remain required.

| Command                                                                                    | Result | Evidence                                                                                                                                 |
| ------------------------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npx vitest run test/testing-*.test.ts test/datastar-testing.test.ts`                      | Pass   | 4 files and 33 tests cover harness, realm, responses, plugins, rendering, and Datastar.                                                  |
| `npx vitest run test/property/testing.property.test.ts --config vitest.property.config.ts` | Pass   | 2 properties cover generated response queues and harness lifecycle sequences.                                                            |
| `npx playwright test e2e/testing-conformance.spec.ts`                                      | Pass   | Shared harness/navigation cases passed in Chromium, Firefox, and WebKit.                                                                 |
| `npx vitest run test/agent-content.test.mjs test/site-structure.test.mjs`                  | Pass   | 9 tests verify the new routes and deterministic reviewed corpus.                                                                         |
| `npm run build`, `npm run build:demo`                                                      | Pass   | All runtime/type/API/CSS entries and both documentation routes build.                                                                    |
| `npm run test:coverage`                                                                    | Pass   | The full coverage lane passes; new testing modules have 100% statements, lines, and functions.                                           |
| `npm run test:property`                                                                    | Pass   | 27 properties pass with seed 430043, including the two testing-package properties.                                                       |
| `npm run test:package:quality`                                                             | Pass   | 13 installed-package checks cover exports, types, QUnit, browsers, and external plugins.                                                 |
| `npm run quality:fast`                                                                     | Pass   | Current fast report: `.git/jqstar/runs/2026-09-02T17-25-12-942Z-65779/report.json`.                                                      |
| `npm run quality:delivery`                                                                 | Pass   | 12 enforced gates passed in `.git/jqstar/runs/2026-09-02T17-39-14-342Z-90476/report.json`.                                               |
| `npm run quality:delivery`                                                                 | Fail   | Finalized-tree attempt `2026-09-02T17-53-32-786Z-28412` found required external analyzers absent from `PATH`; the other 11 gates passed. |
| `PATH=<pinned-analyzer-bin>:$PATH npm run quality:static:delivery`                         | Pass   | All 28 static gates passed after checksum-verifying the repository-pinned analyzer versions.                                             |

### Inspection ledger

| Finding                                                                                                           | Resolution                                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A plugin setup failure could leave the just-created core installation claimed.                                    | Dispose the new core installation during setup rollback, restore fetch, and aggregate rollback failures.                                                    |
| Coverage resolved the packed external fixture's public core import outside the instrumented source graph.         | Add exact `jquery-star/core` and testing-entry aliases in the coverage configuration.                                                                       |
| Generated API reports conflicted with the repository formatter.                                                   | Keep API Extractor reports authoritative and list those generated files in `.prettierignore`.                                                               |
| Intermediate declaration artifacts made the packed archive exceed its immutable size budget.                      | Exclude `dist/types` from the archive and emit minimal CommonJS declaration re-export shims.                                                                |
| Repeating the render adapter in the core entry exceeded the immutable core-entry budget.                          | Emit the adapter as an existing shared internal build chunk used by core and testing.                                                                       |
| Initial changed-line coverage missed hostile thrown values and several cleanup branches.                          | Add setup, disposal, conformance, task, response, and recursive error-normalization failure tests.                                                          |
| A finalized-tree delivery attempt ran without the external analyzer toolchain used by the earlier successful run. | Recreate the four repository-pinned analyzers in a checksum-verified temporary directory and prove the static lane independently before rerunning delivery. |

## Document

### Documentation changed

Post-completion ecosystem provenance: this ticket supplies mapping
`jquery-ecosystem.qunit.testing-consumer` in `quality/jquery-ecosystem.json` at SHA-256
`2b6550a824aa495c58f21948260a6ab504e9da355072aca8cd8999a06f8cb718`. This records the already
completed QUnit consumer boundary and does not reopen runtime behavior.

- `README.md` documents preview imports, harness lifecycle, response queues, Datastar fixtures,
  runner-neutral conformance, flush limits, and disposal scope.
- `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/RUNTIME_OWNERSHIP.md`, and
  `docs/TESTING.md` define the testing boundary, ownership model, release status, and gate matrix.
- `example/docs/testing/index.html` and `example/docs/plugins/index.html` publish task-oriented
  testing and external-plugin guides; the documentation index, API page, shell, routes, and smoke
  checks link and package them.
- `config/agent-content.json` adds reviewed testing/plugin records, and the generated agent corpus
  exposes those records through the public index and bounded `llms` artifacts.

### Acceptance evidence

| Criterion | Evidence                                                                                                                                                                 | Result  |
| --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------- |
| AC-01     | Export-map, type-rollup, side-effect, module-graph, and installed import/require checks cover `jquery-star/testing`.                                                     | Pass    |
| AC-02     | Pending correction of the reproduced false-success property-restoration path, direct regression evidence and full delivery.                                              | Pending |
| AC-03     | The installed Node DOM consumer mounts both application forms, exercises public state/events/observations, flushes, destroys, and disposes.                              | Pass    |
| AC-04     | Unit and property suites cover transitive finite work, stable settlement, default/custom bounds, typed diagnostics, exclusions, and post-timeout disposal.               | Pass    |
| AC-05     | Pending correction of the reproduced false-success property-restoration path, direct regression evidence and full delivery.                                              | Pending |
| AC-06     | Datastar testing suites and package graphs verify SDK-backed ordered/chunked fixtures, failure paths, and separation from generic testing/core.                          | Pass    |
| AC-07     | Pending correction of the reproduced false-success property-restoration path, direct regression evidence and full delivery.                                              | Pending |
| AC-08     | The separately packed external plugin exercises all six seams plus ordering, rollback, use, root teardown, disposal, and cleanup failure.                                | Pass    |
| AC-09     | The separately packed navigation fixture and three-engine browser case verify public-adapter rendering, preservation, focus/value continuity, and operation correlation. | Pass    |
| AC-10     | The same public conformance functions run in Vitest, installed Node, installed QUnit, and Chromium/Firefox/WebKit consumers.                                             | Pass    |
| AC-11     | Package quality verifies import/require, NodeNext/Bundler, refusal of private paths, package contents, publint/ATTW, bundle graphs, and immutable sizes.                 | Pass    |
| AC-12     | Pending correction of the reproduced false-success property-restoration path, direct regression evidence and full delivery.                                              | Pending |

### Completion audit

The 2026-09-06 reopening supersedes the previous closure. The restoration correction passes focused
regressions, fast checks and Code validation. AC-02, AC-05, AC-07 and AC-12 remain pending until
complete delivery and the final criterion audit pass.

### Historical completion audit

The public entries, declarations, documentation, generated corpus, independently packed consumers,
and delivery evidence match all twelve criteria. The final audit found no private testing imports,
runner coupling, unbounded-idle promise, handwritten valid Datastar stream, undisclosed bundle
growth, or unresolved inspection finding.

Status: Complete

### Generated evidence refresh (2026-09-06)

The extended Plan passed before regeneration. The concise guide retains refused-removal reporting,
continued cleanup and callback-error preservation. `npm run build:agent-content` succeeds with
189,879-byte indexes and 115,348-byte full text, below the unchanged 190,000/120,000 limits.
`npm run csp:inventory` refreshes the source inventory without changing the expression corpus,
grammar or capability scope. Three generated agent artifacts and one CSP map change; companion
outputs remain identical. Repeat fast and complete delivery after this finalized ledger.

### Inventory identity follow-up (2026-09-06)

The second fast run `2026-09-06T22-35-25-848Z-65931` passes 1,571 of 1,572 unit tests but rejects
the changed aggregate CSP digest after 43 README location shifts. The map comparison proves that
only those line positions changed. Tighten the README paragraph while retaining the full restoration
contract, then regenerate and validate the inventory. Do not change the frozen CSP digest, grammar,
API or budgets for unrelated prose if the maintained generator reproduces the original inventory.

The concise README revision preserves the original expression locations. The maintained generator
now reproduces `test/fixtures/csp/conformance-map.json` byte-for-byte, so it has no final diff.
`npm run test:csp-contract` passes all four tests at the original digest `40d98004…1c855`, with 34
accepted, 57 denied, 46 adversarial, 33 context cases and 240 public sources/421 occurrences. The
CSP implementation, public literal type, grammar and budgets remain unchanged.

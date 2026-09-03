---
id: 0016
title: Define the external navigation bridge contract
status: done
created: 2026-08-30
updated: 2026-09-03
---

# 0016: Define the external navigation bridge contract

## Plan

### Problem

Turbo and htmx expose different event orders and mutation boundaries. Building both bridges in one
ticket would mix a public jQStar lifecycle contract, two independently versioned third-party event
models, and two browser implementations. The bridge boundary must be precise enough that neither
package destroys an application before a canceled mutation, misses a real removal, or enhances a
subtree twice.

### Current evidence

- Ticket 0006 gives internal patches deepest-first application destruction, `data-jqs-preserve`, and
  `whenEnhanced()`. Surviving applications and UI still discover incoming descendants through owned
  MutationObservers.
- Ticket 0010 plans immutable operation observations; ticket 0013 plans the public single-operation
  render adapter and explicit same-document preservation roots without exposing application maps.
- Ticket 0014 plans an independently packed mock-navigation plugin and runner-neutral public
  teardown assertions. It provides the bridge shape but not third-party event truth.
- No Turbo or htmx package is installed or version-pinned today. Ticket 0003 establishes jQStar's
  own support policy but contains no evidence for either navigation library; current version ranges
  must come from official contracts plus traces from exact packed dependencies.
- Turbo has distinct document and frame render phases plus its own permanent-element convention.
  htmx has request, swap, per-element cleanup, settle, boosted-navigation, and history-cache phases
  plus its own preservation convention. Event names that sound similar do not necessarily enclose
  the same mutation.
- MutationObserver alone runs after removal and cannot destroy an application whose own root was
  detached. A bridge must enter the public render transaction at a pre-mutation hook that is known
  to represent an actual commit.

### Scope

- Freeze one host-neutral bridge state machine over ticket 0013's public render adapter: identify an
  outgoing boundary, validate exact preserved live roots, destroy one or more actual removal
  boundaries, observe the host mutation, commit explicit incoming roots, await jQStar enhancement,
  and close one operation observation.
- Research official release/support policies and event documentation, install exact package
  tarballs, record real traces, and approve separate Turbo and htmx SemVer ranges. Record oldest and
  newest tested versions, prerelease/unknown-version policy, detection source, peer/optional
  dependency treatment, and the update cadence.
- Define an event-to-state-transition table per library and flow: document/boosted visit,
  frame/region replacement, append/prepend/adjacent swap where supported, no-content response,
  history save/restore, cache snapshot, canceled request/render, response/network/render error, and
  disconnected target.
- Distinguish cancellable intent events from the last reliable pre-mutation hook. No application is
  destroyed until the external library will actually mutate; once destruction starts, every
  success/error path must settle the transaction and release missing promised roots.
- Define permanent-root matching. Native `data-jqs-preserve` always applies; Turbo and htmx markers
  become exact caller-supplied preserved elements only after documented ID, incoming-match,
  containment, connection, and same-document checks. Unmatched/ambiguous elements are destroyed.
- Define nested/overlapping operation policy, exact-once cleanup/enhancement, operation IDs,
  observation parentage, cancel/failure outcomes, partial-mutation handling, and barrier ordering
  without publishing a live application map.
- Freeze host ownership: Turbo/htmx own requests, redirects, cache, history, scroll, focus, forms,
  progress, head handling, and DOM mutation. A bridge only pauses/wraps a documented render seam as
  required for jQStar ownership and never performs a second request or swap.
- Build a reusable same-origin multi-route server fixture and semantic event-order recorder using
  actual supported packages. It must run document, frame/region, history, preservation, nested root,
  cancel, error, form, focus, cache, repeated navigation, and JavaScript-disabled flows.
- Define a common coexistence matrix for behavior/declarative roots, core generic JSON/HTML,
  Datastar streams/patches, UI document services, native controls/forms, focus, and operation
  observations before, during, and after external navigation.
- Rewrite tickets 0036 and 0037 with separate executable event tables, public plugin factories,
  installed-package matrices, version policies, and three-browser acceptance criteria.
- Keep the selected delivery gates bounded after the new interoperability fixture enrolls the
  browser and package detectors. Nested Playwright commands must release their process groups and
  captured output when the direct command exits. A browser suite stops after its first final test
  failure so a broken host launch cannot restart once per selected test; green runs still execute
  the complete selection. Before execution, a supervised engine preflight must open one inert page
  in Chromium, Firefox, and WebKit and fail without starting the matrix when an engine cannot boot.

### Out of scope

- Implementing or publishing either bridge package.
- Reimplementing Turbo Drive, Turbo Frames, htmx history, or their request protocols.
- Selecting a native jQStar navigation design or interpreting an interop difference as a product
  gap. Ticket 0023 makes that later evidence-backed decision.
- Adding Turbo/htmx to the root, core, UI, or Datastar bundles; silently loading either library;
  owning their errors; or normalizing their public event payloads into one fake common API.
- Promising coexistence with arbitrary third-party extensions, custom renderers, swap plugins, or
  versions outside the exact approved ranges.

### Dependencies

- Tickets 0006, 0010, 0013, and 0014.

### Activation evidence

- Tickets 0006, 0010, 0013, and 0014 are `done`.
  `npm run ticket:validate -- --phase plan --ticket docs/tickets/0016-bridge-turbo-and-htmx.md`
  passed on 2026-09-02 before fixture or dependency changes.
- The public render boundary is pinned at SHA-256
  `780f853e2728ec9a2e08a9aa0e08be44396f6fceb919c3639784498b916e0b53` for `src/render-adapter.ts`.
  The reviewed core and testing API reports are pinned at
  `7a58dc4864c9893da4564429b9c1d940670a9ac675cb6742318046e832433524` and
  `61b86654431f7553359c170312e20df470234849cc94e04aa0a53baf5d41da5c`.
- Registry and official project evidence identify Turbo 8.0.23 and htmx 2.0.10 as the current stable
  releases. Candidate boundary tarballs are Turbo 8.0.21/8.0.23 and htmx 2.0.0/2.0.10. Turbo 8.0.0
  was rejected after OSV reported CVE-2025-66803, fixed in 8.0.21. htmx 4.0.0 is excluded because
  the package registry publishes it under `next`, not `latest`.
- The manifest records full SHA-512 integrity values and SHA-1 package digests for the four tested
  boundary tarballs. It may approve only the tested, vulnerability-free `8.0.x` and tested `2.0.x`
  intervals.
- Official event contracts establish the candidate seams. Turbo documents pausable
  `turbo:before-render` and `turbo:before-frame-render` callbacks plus post-render events. htmx
  documents cancellable `htmx:beforeSwap`, pre-removal `htmx:beforeCleanupElement`, and post-swap
  `htmx:afterSwap`/`htmx:afterSettle` events. Actual boundary traces decide the final mapping.

### Acceptance criteria

- [x] [AC-01] The host-neutral contract imports only declared `jquery-star/core` and
      `jquery-star/testing` surfaces, uses the public render transaction/disposal/observation APIs,
      and exposes no private source path, kernel, application collection, patch coordinator,
      MutationObserver shortcut, or host-library mutation implementation.
- [x] [AC-02] A schema-validated compatibility manifest records each library's package identity,
      exact approved SemVer range, oldest/newest tested tarball, version-detection source,
      prerelease/unknown/out-of-range behavior, optional-peer policy, official source links, and
      trace evidence. No untested major/minor is implied by a caret or “latest” label.
- [x] [AC-03] Each supported Turbo flow has a semantic trace and explicit mapping from public host
      events/render callback to transaction begin, preserved-root capture, every `beforeRemove`,
      external mutation, `commit`/`fail`, jQStar barrier, Turbo render/load/cache/history
      completion, cancellation, and errors for documents and frames.
- [x] [AC-04] Each supported htmx flow and swap style has a semantic trace and explicit mapping from
      public request/swap/cleanup/settle/history events to the same transaction phases, including
      boosted documents, region swaps, no-swap responses, cancellation, network/response/swap
      errors, and multiple cleanup callbacks.
- [x] [AC-05] Cancellable intent never triggers jQStar destruction. The selected pre-mutation hook
      fires only for an actual external commit or is wrapped so cancellation is already impossible;
      errors before mutation leave applications live, while errors after cleanup attempt terminal
      settlement and report any partial-mutation/preservation mismatch.
- [x] [AC-06] Nested outgoing application roots are released deepest-first exactly once even when
      host cleanup events overlap. Disjoint host operations may coexist with distinct IDs;
      ancestor/descendant or same-boundary operations follow an explicit reject, join, or queue rule
      proven for each library rather than racing ownership.
- [x] [AC-07] `data-jqs-preserve`, matching `data-turbo-permanent`, and matching `hx-preserve` roots
      retain exact DOM/application/state/effect/listener/request/UI/value identity only when
      connected, same-document, uniquely identified, inside the outgoing boundary, and actually
      retained after commit. Focus follows the host baseline without a bridge write. Nested,
      duplicate, unmatched, moved, disconnected, and promised-but-removed roots have deterministic
      cleanup and diagnostics.
- [x] [AC-08] Every actual external mutation has one jQStar operation ID and one terminal outcome,
      and its immutable observation records host/library/flow/boundary metadata plus begin/remove/
      commit/barrier/fail ordering without URLs, form values, HTML, response bodies, or DOM objects.
      No-op/canceled flows either have no render operation or one explicitly canceled intent record.
- [x] [AC-09] The bridge does not send requests, replay forms, mutate history/head, restore scroll,
      choose focus, synthesize host load/settle events, or implement a second swap. Native GET/POST
      submitter semantics, redirects, disabled controls, validation, file inputs, cache, focus, and
      JavaScript-disabled fallback remain identical to the supported host library/browser baseline
      unless the contract approves one narrow, tested correction.
- [x] [AC-10] The shared actual-package fixture covers full documents, frames/regions, every
      approved swap category, nested roots, all preservation markers, history/cache restore,
      canceled intent, no-content, HTTP/network/render errors, GET and non-GET forms, focus,
      repeated visits, and JavaScript-disabled fallback. Its recorder asserts relative semantic
      order and DOM/ownership fingerprints, not unstable wall-clock timings or undocumented internal
      events.
- [x] [AC-11] The common coexistence matrix proves behavior and declarative applications, core
      JSON/HTML, Datastar streaming/patches, installed UI services/controllers, native forms, jQuery
      handlers, focus, preserved state, and disposal before and after repeated external renders with
      no duplicate effects, actions, directives, listeners, observers, requests, subscriptions,
      tasks, hooks, or UI records.
- [x] [AC-12] Tickets 0036 and 0037 contain separate stable IDs for every mapped event/flow/version,
      side-effect-free plugin installation/disposal, unsupported-version behavior, exact
      preservation policy, installed import/type/graph/size proof, and Chromium/Firefox/WebKit
      execution. Contract documentation, schemas, fixture baselines, `npm run check`, and
      `git diff --check` pass without mutation testing.

### Design

The shared model is a state machine, not a shared event vocabulary:

`idle → prepared → removing → externally-mutated → enhancing → committed`, with terminal `canceled`
and `failed` outcomes. A prepared operation contains a host name/version, flow kind, outgoing
boundary, exact preserved element identities, and the public render transaction/operation ID.
`beforeRemove()` may be called for multiple host cleanup boundaries; the adapter deduplicates
overlap and still destroys owned roots deepest-first. `commit()` supplies only explicit incoming
application roots and resolves after `whenEnhanced()`. No state transition performs the host DOM
mutation.

Library mapping tables must name the exact public event or render callback, whether it is
cancellable, its target/boundary source, whether mutation has happened, which transition it causes,
and the fallback when expected later events never arrive. Event correlation uses host request/render
identity where public and a bridge-owned weak record otherwise. Correlation records are bridge
resources released at terminal state; they never contain jQStar application state.

Turbo and htmx remain separate plugin factories. Import is side-effect-free; installation receives
the host capability/version explicitly when possible, validates the compatibility manifest before
listeners are committed, and registers all listeners/cleanup through the public plugin registrar.
Unsupported, missing, or prerelease versions follow the manifest's fail/warn policy before any
document listener is installed. The jQStar root does not auto-detect either library.

Preservation has two layers. The core adapter always recognizes `data-jqs-preserve`. A bridge may
also pass old live roots that its host will retain: Turbo permanence requires the documented marker
and unique incoming ID match; htmx preservation requires its documented marker and unique match. The
core validates identity/containment/document; the bridge validates host semantics. After commit, the
transaction verifies each promised identity remains connected. A missing promised root is released
and reported, never left as a hidden application record.

The event recorder emits schema-validated semantic records with monotonic sequence numbers,
library/version/flow, public event, jQStar operation ID, phase, target key, DOM fingerprint, focus
key, history index, application mount/destroy counters, and owned-resource terminal summary. It
redacts URLs to route IDs and omits form data/content. Expected traces assert partial orders and
invariants because browsers and libraries may emit benign extra public events.

The multi-route fixture is server-rendered and progressively enhanced. Ordinary links and forms work
with JavaScript disabled. With one host library enabled, it exercises the actual package without a
simulated event emitter and can switch jQStar root composition, modular composition, generic/
Datastar responses, UI, and failure routes while keeping the route markup common.

### Decisions

- Share only the jQStar render state machine, fixture vocabulary, recorder schema, and coexistence
  assertions. Turbo and htmx retain distinct event maps and packages.
- Support ranges are evidence, not aspiration. Approve only versions whose oldest and newest
  boundary tarballs pass official-event traces and browser smoke; exclude prereleases by default.
- Callers install bridges explicitly. The root entry never imports, detects, or starts them.
- A bridge observes or wraps a documented host mutation seam. It never performs a second request,
  render, swap, history write, or host-event dispatch.
- Destroy only at the last reliable pre-mutation boundary. An early cancellable event may prepare
  correlation but cannot release jQStar ownership.
- Overlapping transaction behavior is explicit per host trace. Disjoint region/frame operations can
  proceed independently; overlapping boundaries cannot mutate ownership concurrently.
- Host-specific permanent markers are supported only through exact validated live-root identities;
  core does not learn Turbo/htmx selectors or dependencies.
- Focus, form, history, cache, scroll, progress, and head behavior stay host-owned unless trace
  evidence proves a narrow bridge-induced regression and the contract names its correction.

### Security and accessibility

- The fixture uses same-origin routes and inert test content. Recorder output excludes request/
  response bodies, credentials, form values, full URLs, HTML, signal values, and DOM references.
- Bridge version checks occur before listener commit. Host event targets, new documents/fragments,
  preserved roots, and incoming roots are validated against the kernel document and transaction
  boundary before jQStar touches ownership.
- The bridge cannot turn response HTML into trusted content or bypass the host's CSP, Trusted Types,
  sanitization, CSRF, redirect, credential, or origin policy.
- Cancel/error cleanup must not strand focus traps, document listeners, observers, requests, tasks,
  UI overlays, busy state, or live-region ownership. The bridge itself does not announce navigation
  or move focus unless a later approved correction requires it.
- Browser proof includes keyboard navigation, focused controls, form validation/submitter behavior,
  native fallback, reduced motion, forced colors, and zoom/reflow where the host flow can affect the
  result.

### Risks

- External event ordering can change across major versions. Pin the support matrix and record actual
  package event traces.
- A shared abstraction can erase a necessary library-specific distinction. Keep mappings explicit
  and share only the jQStar lifecycle transaction.
- Destroying at an early cancellable event can leave a still-connected dead application. Select or
  wrap the last actual pre-mutation hook and prove cancellation separately.
- htmx may emit multiple nested cleanup events for one swap. Correlate one transaction and dedupe
  overlap rather than opening one operation per removed element.
- Turbo/htmx permanent matching may move live nodes outside the observed boundary temporarily. Base
  preservation on documented old/new identity semantics and verify final connectivity after commit.
- Event traces can fit an implementation detail too closely. Record public events but assert only
  the relative phases and invariants required by the contract.
- Optional peer dependencies can burden all `jquery-star` consumers. Prefer explicit host injection
  or optional metadata and prove that installing core/root alone does not resolve either package.
- A host upgrade within a broad range can silently change event order. Keep approved ranges narrow,
  test both boundaries, and require a compatibility-manifest update before widening them.

### Verification plan

- Validate this Plan before adding fixture dependencies or traces.
- Research official Turbo and htmx lifecycle/version contracts; install exact candidate tarballs;
  record package metadata/checksums and browser traces; then choose each narrow supported range from
  evidence rather than package popularity.
- Establish JavaScript-disabled native link/GET/non-GET form/focus/history baselines before enabling
  either library, then establish each unbridged host baseline before measuring the bridge contract.
- Run every document/frame/region/swap/history/cache/cancel/error/no-content/disconnected/repeated
  flow with semantic recorder assertions in Chromium, Firefox, and WebKit at the approved range
  boundaries.
- Add generated state-machine tests for valid/invalid transition orders, multiple `beforeRemove`
  calls, overlapping/disjoint boundaries, nested roots, all preservation mismatch cases, missing
  terminal events, errors before/after mutation, and exactly-once release/barrier settlement.
- Run the coexistence matrix with root and modular installation, behavior/declarative roots,
  generic/Datastar requests and patches, UI, jQuery handlers, focus/forms, disposal, and operation
  observations. Compare public disposal reports and counters, never private kernel maps.
- Schema-validate compatibility and trace manifests; ensure downstream ticket mappings are complete
  and unique; test redaction and deterministic trace normalization.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage/property/static/
  browser/package gates as applicable, `npm run check`, ticket Test/Document validation, and
  `git diff --check` without mutation testing.
- Reproduce the nested Playwright pipe-retention failure with a child that exits while a descendant
  retains stdout. Prove the shared runner terminates the descendant and returns bounded output.

### Planned files

- `docs/INTEROPERABILITY.md`: Shared state machine, ownership, preservation, host responsibilities,
  version policy, event maps, coexistence matrix, accessibility, and support/update process.
- `quality/external-bridge-contract.json`: Approved packages/ranges/checksums, event transitions,
  preservation rules, trace IDs, flows, outcomes, and downstream mappings.
- `schema/external-bridge-contract.schema.json`: Closed host/phase/outcome enums, SemVer evidence,
  unique event/flow IDs, required boundary traces, and redaction constraints.
- `test/fixtures/interoperability/`: Shared server-rendered routes, nested applications, permanent/
  preserved roots, frames/regions, forms, failure/no-content responses, focus targets, and native
  fallback markup.
- `e2e/fixtures/interoperability-server.ts`, `e2e/fixtures/interoperability-recorder.ts`:
  Same-origin route server and semantic public-event/DOM/focus/history/operation recorder.
- `e2e/interoperability-baseline.spec.ts`: Native, unbridged Turbo, and unbridged htmx traces across
  exact version boundaries and three browsers.
- `test/external-render-contract.test.ts`,
  `test/property/external-render-contract.property.test.ts`: Host-neutral transition, overlap,
  preservation, error, settlement, redaction, and disposal rules over public APIs.
- `scripts/record-interoperability-traces.mjs`, `scripts/quality/validate-json.mjs`: Reproducible
  exact-package trace orchestration and schema enrollment; never update approved traces implicitly.
- `scripts/quality/lib/process.mjs`, `scripts/quality-browser.mjs`,
  `scripts/quality/browser-preflight.mjs`, `scripts/quality-0044-self-test.mjs`,
  `test/quality-runner.test.mjs`: Bound nested command capture, verify browser engines before the
  matrix, and release descendant process groups after the direct command exits.
- `package.json`, `package-lock.json`, TypeScript and Playwright configuration: Exact
  research/fixture package aliases, source mappings for exercised public subpaths, isolated version
  projects, and focused commands without production bridge dependencies.
- `docs/tickets/0036-publish-turbo-bridge.md`, `docs/tickets/0037-publish-htmx-bridge.md`: Separate
  mapped acceptance IDs, plugin APIs, version failures, package graphs, and browser matrices.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,TESTING}.md`, website interoperability pages: Preview
  boundaries, explicit installation, progressive enhancement, preservation, and host ownership.
- `docs/tickets/0016-bridge-turbo-and-htmx.md`: Phase, ledger, commands, version/event decisions,
  findings, and criterion evidence.

## Code

### Changed-file ledger

| File                                                                                                                                                                                                        | Purpose                                                                                                                                        |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `quality/external-bridge-contract.json`                                                                                                                                                                     | Freeze package boundaries, public event mappings, trace cases, preservation, overlap, redaction, and downstream requirements.                  |
| `schema/external-bridge-contract.schema.json`                                                                                                                                                               | Validate a closed versioned compatibility contract and exact three-browser evidence shape.                                                     |
| `package.json`, `package-lock.json`                                                                                                                                                                         | Install exact development-only host aliases, publish the guide, and keep the internal research schema out of the runtime package.              |
| `tsconfig.json`                                                                                                                                                                                             | Resolve the Datastar and UI public subpaths to source when the coexistence contract type-checks the unpublished workspace.                     |
| `playwright.config.ts`                                                                                                                                                                                      | Start the same-origin fixture and stop CI after the first test that still fails after retries.                                                 |
| `e2e/fixtures/interoperability-server.mjs`                                                                                                                                                                  | Serve exact host packages and progressive document, Frame, region, form, history, preservation, no-content, and failure routes.                |
| `e2e/fixtures/interoperability-recorder.js`                                                                                                                                                                 | Record bounded semantic public host events without request, response, content, URL, or DOM data.                                               |
| `e2e/interoperability-baseline.spec.ts`                                                                                                                                                                     | Run both version boundaries and native fallback through Chromium, Firefox, and WebKit.                                                         |
| `test/fixtures/interoperability/bridge-contract.{mjs,d.mts}`                                                                                                                                                | Implement and type the test-only host-neutral state coordinator and permanent-root matcher over the public render adapter.                     |
| `test/external-render-contract.test.ts`                                                                                                                                                                     | Prove schema, packages, versions, transitions, overlap, preservation, redaction, disposal, public adapter use, and downstream ticket totality. |
| `test/property/external-render-contract.property.test.ts`                                                                                                                                                   | Generate preservation-ID and disjoint terminal-operation sequences.                                                                            |
| `docs/INTEROPERABILITY.md`                                                                                                                                                                                  | Document the approved lifecycle, mappings, ownership, focus, preservation, version policy, limits, and update process.                         |
| `README.md`, `docs/{README,ARCHITECTURE,PROJECT,TESTING}.md`                                                                                                                                                | Publish and link the preview contract in user and project documentation.                                                                       |
| `docs/DEVELOPMENT.md`, `docs/TESTING.md`                                                                                                                                                                    | Document nested process cleanup and the installed-package browser deadlines exposed by delivery verification.                                  |
| `example/docs/interoperability/index.html`, `example/docs-shell.html`                                                                                                                                       | Add the public interoperability guide and navigation entry.                                                                                    |
| `vite.demo.config.ts`                                                                                                                                                                                       | Include the interoperability route in the production demo build entry set.                                                                     |
| `config/agent-content.json`, `example/agent-content.generated.json`, `example/public/{jqstar-agent-index.json,llms.txt,llms-full.txt}`                                                                      | Add the reviewed guide and ownership invariant to corpus version 3.                                                                            |
| `test/site-structure.test.mjs`, `e2e/site.spec.ts`, `scripts/smoke-{deployment,pages,package-files}.mjs`                                                                                                    | Enroll the new public route and packaged guide in site, deployment, Pages, and package proof.                                                  |
| `scripts/quality/package-release-contracts.mjs`, `scripts/quality-package.mjs`, `scripts/quality-release.mjs`                                                                                               | Add the public guide to the exact package documentation boundary and bound each installed-package browser engine.                              |
| `scripts/quality/lib/process.mjs`, `scripts/quality-browser.mjs`, `scripts/quality/browser-preflight.mjs`, `scripts/quality-0044-self-test.mjs`, `test/{quality-runner,package-release-hardening}.test.mjs` | Preflight engines, prevent retained output pipes or browser descendants, and prove bounded cleanup.                                            |
| `schema/package-report.schema.json`                                                                                                                                                                         | Raise the closed package-documentation tuple from six guides to seven.                                                                         |
| `quality/public-baseline.json`                                                                                                                                                                              | Refresh the measured package artifact after adding the published guide without loosening any size ceiling.                                     |
| `quality/scopes.json`, `eslint.config.js`, `knip.json`, `cspell.json`                                                                                                                                       | Classify the fixture declaration, apply browser globals, declare dynamic fixture aliases, and add the official Hotwired name.                  |
| `test/fixtures/csp/conformance-map.json`                                                                                                                                                                    | Refresh the public expression inventory after adding the website route.                                                                        |
| `docs/tickets/0036-publish-turbo-bridge.md`, `docs/tickets/0037-publish-htmx-bridge.md`                                                                                                                     | Import exact manifest digest, ranges, packages, mapping IDs, trace findings, and focus policy into separate implementation tickets.            |
| `docs/tickets/0016-bridge-turbo-and-htmx.md`                                                                                                                                                                | Keep phase, decisions, commands, findings, and acceptance evidence current.                                                                    |

### Design changes

- Actual package traces split Turbo form navigation into `turbo.form.visit` because form completion
  precedes the render seam. They also split htmx delete from outer replacement because delete emits
  cleanup and `afterRequest` without `afterSwap` or `afterSettle`.
- The traces permit browser-specific ordering between Turbo `submit-end` and `before-visit`. Both
  must precede `before-render`, which remains the ownership seam.
- htmx `afterRequest` precedes `afterSettle`, and `hx-swap="none"` can emit `afterSwap` without a
  DOM mutation. The contract records these as host facts rather than treating event names as
  mutation proof.
- Valid Turbo and htmx permanent elements retained DOM and value identity, but both hosts moved
  focus to the activated control. Focus remains host-owned and is no longer part of bridge-retained
  identity.
- The directly served server and recorder remain `.mjs` and `.js` so the fixture has no build step.
  The Playwright spec is the reproducible trace orchestrator, and the Vitest contract suite performs
  schema validation. Separate record and JSON-validation scripts were unnecessary.
- Adding the public guide changed only the generated CSP public-source inventory. The grammar,
  accepted, denied, adversarial, and context contracts did not change.
- OSV identified Turbo 8.0.0 through 8.0.20 as affected by CVE-2025-66803. The contract now starts
  at patched Turbo 8.0.21 instead of suppressing a vulnerable research dependency.
- The compatibility manifest is repository-only, so its validator schema is also excluded from the
  runtime package. The user guide remains packaged under the existing non-increasing size ceiling.
- The first delivery run showed completed Playwright output followed by 45- and 60-minute outer
  timeouts. Nested commands now use the shared process-group runner, which closes descendants after
  the direct command exits instead of waiting indefinitely for inherited stdout and stderr handles.
- A focused package run later stalled in WebKit. The installed-package proof now closes and names
  any engine launch that exceeds 30 seconds or proof that exceeds 90 seconds, then kills a browser
  descendant if graceful close also stalls. Normal browser cleanup has its own five-second bound.
  The package gate no longer waits for its 20-minute outer limit.
- Playwright execution now stops after the first final failed test. Configured retries still run and
  `failOnFlakyTests` remains enabled, while a passing project must still execute its complete
  selected count.
- Test-level fail-fast cannot interrupt a browser deadlocked before fixture setup. Browser quality
  therefore lists all projects, runs Chromium, Firefox, and WebKit preflight checks in supervised
  subprocesses, and starts the matrix only if all three open an inert page. Standalone SIGINT and
  SIGTERM terminate the active process group and still write a valid eight-project red report.
- The integrated coexistence proof imports Datastar and UI through their package subpaths. Matching
  TypeScript source paths keep that public-boundary proof resolvable before the package is built.
- The completion audit found that the actual-package recorder emitted event order but not the
  promised DOM/ownership fingerprints. Extend each record with a hashed projection of stable fixture
  structure, a focus key, history length, target key, and bounded owned/preserved-root counts. The
  same fixture must prove nested cleanup, repeated renders, document network and swap errors, and
  native/Turbo/htmx file, disabled-control, validation, and submitter behavior.
- The downstream-manifest identity test compared tickets 0036 and 0037 with a hardcoded digest but
  did not hash the current manifest. Derive SHA-256 from the manifest bytes so any mapping or trace
  edit requires both downstream activation gates to move with it.
- The public-boundary test checked only the manifest declaration. Inspect the coordinator source and
  declaration imports and forbidden identifiers as well, so AC-01 fails on an actual private import
  instead of trusting metadata about the file.
- Exact-boundary deduplication did not by itself prove AC-06's nested cleanup order. Exercise the
  coordinator with the public render adapter and nested live applications, passing outer then inner
  host cleanup callbacks and requiring one inner-before-outer release sequence.
- The standalone release-quality probe still launched all installed browsers in one unbounded
  synchronous child. Run that probe through the shared descendant-aware process helper with an
  explicit per-engine launch deadline, so an unavailable WebKit produces a prompt diagnostic and
  cannot retain the release runner or its temporary workspaces.
- WebKit sends the complete native multipart body but omits custom headers from the Playwright view
  of Turbo's `303` response. Preserve the redirect and store only the server-derived categorical
  proof under a one-time opaque ID. The redirected GET consumes that proof and returns the headers
  without placing a form value, filename, or body content in the URL.

## Test

| Command                                                                                                                                                                 | Result            | Evidence                                                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npx vitest run test/external-render-contract.test.ts test/property/external-render-contract.property.test.ts`                                                          | Failed, then pass | The first run exposed cross-realm element checks, schema tuple strictness, and an incorrect test lookup. After correction, 15 tests pass.                                                                                                                                                                                                                    |
| `npm run typecheck`                                                                                                                                                     | Failed, then pass | The first implementation required an explicit fixture declaration and public adapter type. The coexistence proof later exposed missing Datastar/UI workspace subpath mappings; both TypeScript projects pass after adding them.                                                                                                                              |
| `npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-chromium`                                                                                  | Failed, then pass | Initial traces corrected focus, Turbo form, htmx request/settle, delete, no-swap, and error assumptions. The focused rerun passed.                                                                                                                                                                                                                           |
| `npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-chromium --project=desktop-firefox --project=desktop-webkit`                               | Failed, then pass | The first matrix passed 20/21 and exposed WebKit form-event variance. The partial-order rerun passed all 21 tests.                                                                                                                                                                                                                                           |
| `npm run test:csp-contract`                                                                                                                                             | Pass              | Digest `e025d1df0713d60616c15022dfdfc7499c5d07b6952cf18a7199c550e4a4b49c`, 234 public sources and 391 occurrences.                                                                                                                                                                                                                                           |
| `npx vitest run test/external-render-contract.test.ts test/property/external-render-contract.property.test.ts test/site-structure.test.mjs test/agent-content.test.mjs` | Pass              | 23 focused contract, property, site, and corpus tests passed before the final coordinator hardening.                                                                                                                                                                                                                                                         |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:fast`                                                                                                | Failed, then pass | The first run found package-schema, quality-scope, browser-global, dynamic-alias, spelling, and formatting enrollment gaps. Current-tree report `2026-09-03T00-36-09-088Z-82710` passed every fast gate and closed Code.                                                                                                                                     |
| `npm run quality:fast`                                                                                                                                                  | Pass              | Report `.git/jqstar/runs/2026-09-03T00-36-09-088Z-82710/report.json` passed the current-tree fast gate before Test began.                                                                                                                                                                                                                                    |
| `PATH="/private/tmp/jqstar-tools.GKceSp/bin:$PATH" npm run quality:delivery`                                                                                            | Failed            | Report `.git/jqstar/runs/2026-09-03T00-37-29-114Z-91371/report.json` found the missing Vite route entry, a 2,088-byte package-budget overrun, vulnerable Turbo 8.0.0, and host-load browser/detector timeouts.                                                                                                                                               |
| `npm run test:self-hosted`                                                                                                                                              | Pass              | The corrected demo input builds `demo-dist/docs/interoperability/index.html`; deployment and server smoke pass in 17 seconds.                                                                                                                                                                                                                                |
| `npm run test:package:quality`                                                                                                                                          | Stopped           | The current run reached an idle WebKit child and made no progress for more than 90 seconds. It was interrupted after 2 minutes 11 seconds without leaving a browser or Node child behind.                                                                                                                                                                    |
| `node --test test/quality-runner.test.mjs test/ticket-workflow.test.mjs`                                                                                                | Pass              | All 34 runner and ticket tests pass, including completed-command pipe cleanup and detached-descendant timeout cleanup.                                                                                                                                                                                                                                       |
| `JQS_BROWSER_LIST_ONLY=1 npm run test:browser:quality`                                                                                                                  | Pass              | All eight required browser projects select 299 tests and return without retained server processes.                                                                                                                                                                                                                                                           |
| Minimal `webkit.launch({ timeout: 30000 })` probe                                                                                                                       | Error             | WebKit 26.5 starts PID 15023 but does not complete the inspector handshake. Playwright reports `browserType.launch: Timeout 30000ms exceeded` and removes the process.                                                                                                                                                                                       |
| Minimal launch through installed WebKit revision 2311                                                                                                                   | Error             | The older locally cached browser reaches the same 30-second inspector-handshake timeout under Playwright 1.62.1, then exits without a remaining WebKit process.                                                                                                                                                                                              |
| `npm run quality:fast`                                                                                                                                                  | Error, then pass  | The first post-restart run found only the missing temporary `actionlint` binary. With actionlint 1.7.12 under `.git/jqstar/tools/bin`, report `2026-09-03T04-01-30-272Z-25931` passes every fast gate.                                                                                                                                                       |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0016-bridge-turbo-and-htmx.md --report .git/jqstar/latest-report.json`                                   | Pass              | The current fast report closed Code before this ticket moved back to `testing`.                                                                                                                                                                                                                                                                              |
| `npm run test:package:quality`                                                                                                                                          | Failed            | Every non-browser and package-budget check passed. The report measured 2,869,527 packed bytes, then WebKit launch hit its 30-second deadline; launched PID 39062 was absent after exit.                                                                                                                                                                      |
| `npm run build:demo && node scripts/bundle-site.mjs`; `npm pack --dry-run --ignore-scripts --json`; `git diff --check`                                                  | Pass              | Regenerated the reviewed corpus and 682,246-byte site archive after documentation edits. The final dry pack is 473 bytes below the fixed 2,870,000-byte limit, and the diff has no whitespace errors.                                                                                                                                                        |
| `npm run csp:inventory`; `npx vitest run test/csp-contract.test.ts`                                                                                                     | Pass              | README line movement made the generated CSP source location stale. Regeneration restored parity, and all four focused contract tests pass.                                                                                                                                                                                                                   |
| `npm run quality:fast`                                                                                                                                                  | Failed, then pass | The first run found only that stale generated CSP location. After regeneration, report `2026-09-03T04-14-17-426Z-47977` passes ticket workflow, runner self-test, format, 840 unit tests, and static-fast.                                                                                                                                                   |
| `osv-scanner scan source --lockfile package-lock.json`                                                                                                                  | Pass              | Pinned OSV-Scanner 2.5.1 scanned 916 locked packages and found no issues, confirming the patched Turbo boundary removed the prior advisory.                                                                                                                                                                                                                  |
| `CI=1 JQS_QUALITY_SABOTAGE=accessibility npx playwright test … --grep 'keyboard, error\|repeated enhancement'`                                                          | Expected failure  | The sabotaged test failed through two retries, Playwright reached its one-failure limit, and the second selected test did not run. Total duration was 4.9 seconds.                                                                                                                                                                                           |
| `CI=1 npx playwright test … --grep 'keyboard, error\|repeated enhancement'`                                                                                             | Pass              | The green control executed and passed both selected Chromium tests in 3 seconds, proving fail-fast does not truncate a passing selection.                                                                                                                                                                                                                    |
| `JQS_BROWSER_SEED=webkit-first-8 node scripts/quality-browser.mjs`                                                                                                      | Failed as bounded | Chromium and Firefox preflight checks passed; WebKit hit its 30-second launch deadline. The schema-valid report retains all eight projects and 299 selected tests, records zero started tests, and PID 65965 was absent.                                                                                                                                     |
| Standalone browser-quality SIGINT during WebKit preflight                                                                                                               | Pass              | The handler returned immediately with exit 1, wrote a schema-valid eight-project report with zero started tests, and left no browser, Playwright, or wrapper process.                                                                                                                                                                                        |
| `npx vitest run test/external-render-contract.test.ts`                                                                                                                  | Pass              | All 15 host-neutral contract tests pass. The integrated coexistence proof covers behavior and declarative roots, generic and Datastar responses, UI, forms, focus, jQuery handlers, observations, disposal, and two repeated renders.                                                                                                                        |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:fast`                                                                                                          | Failed, then pass | The first run found only ticket formatting and an omitted local actionlint path; final report `2026-09-03T04-57-42-967Z-10980` passes ticket workflow, runner self-tests, formatting, all 842 unit tests, and every fast static detector.                                                                                                                    |
| `npm run typecheck`; focused ESLint; `npx vitest run test/external-render-contract.test.ts test/property/external-render-contract.property.test.ts`                     | Pass              | Both TypeScript projects, the edited fixture/contract lint scope, and all 18 host-neutral contract and property tests pass.                                                                                                                                                                                                                                  |
| `CI=1 npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-chromium --workers=1 --retries=0`                                                     | Failed, then pass | Fail-fast exposed ambiguous form selectors, missing native htmx proof headers, cached Turbo preview multiplicity, unsafe raw recorder keys, native fallback navigation overlap, and an ineffective swap fault. After correction, all seven expanded cases pass in 6.9 seconds.                                                                               |
| `CI=1 npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-firefox --workers=1 --retries=0`                                                      | Pass              | All seven expanded cases pass in 8.9 seconds, including both Turbo and htmx version boundaries, repeated renders, bounded fingerprints, nested cleanup, failures, and native/host multipart form behavior.                                                                                                                                                   |
| `npm run build:demo`; `node scripts/bundle-site.mjs`; `npm pack --dry-run --ignore-scripts --json`                                                                      | Pass              | The rebuilt documentation site archive remains 682,246 bytes. The final 201-file package is 2,869,560 bytes, 440 bytes below the unchanged 2,870,000-byte ceiling.                                                                                                                                                                                           |
| `node scripts/quality/browser-preflight.mjs webkit`                                                                                                                     | Failed as bounded | Current WebKit revision 2336 still misses the 30-second inspector handshake after stale fixture cleanup. Launched PID 10866 and all configured server ports were absent afterward.                                                                                                                                                                           |
| Isolated `playwright@1.63.0-alpha-2026-09-03` minimal WebKit probe                                                                                                      | Failed as bounded | WebKit 26.6 revision 2359 launched PID 34391 but did not complete the inspector-pipe handshake within 30 seconds. The process was absent afterward. Stable 1.62.1 remains current, and the upstream issue is closed as unable to reproduce with no published workaround.                                                                                     |
| Direct Chrome 151 headless-shell render of `/docs/interoperability/`                                                                                                    | Pass              | The browser executable was invoked without the Playwright runner or API. Eight rendered-DOM assertions cover the title, initialized color scheme, current navigation state, public adapter name, both supported version ranges, preservation marker, and three-browser evidence statement.                                                                   |
| `sudo /usr/bin/safaridriver --enable`; direct Safari and Chrome 152 launch probes                                                                                       | Partial           | Safari remote automation is enabled in `~/Library/WebDriver/com.apple.Safari.plist`. This server has no active macOS GUI login or `gui/501` launch domain, so Safari fails with `RBSRequestErrorDomain Code=5` and its WebDriver service exits. The installed desktop Chrome exits 138 for the same host-session limitation.                                 |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:static:delivery`                                                                                               | Pass              | Current-tree report `.git/jqstar/static-runs/static-2026-09-03T05-15-21-523Z-58844/static-report.json` passed all 28 delivery-static detectors, including Semgrep, gitleaks, npm audit, OSV-Scanner, ShellCheck, and actionlint.                                                                                                                             |
| `npm run test:self-hosted`                                                                                                                                              | Pass              | The current production, CSP, UMD, type, CSS, demo, and server builds pass with deployment, route, SSE, installed-runtime, browser-runtime, and security-header smoke proof. The site archive remains 682,246 bytes.                                                                                                                                          |
| `npx vitest run test/package-release-hardening.test.mjs`; `node --test test/quality-runner.test.mjs`; focused ESLint                                                    | Pass              | All 13 package/release hardening tests and all 24 process-runner tests pass. The release source contract requires the supervised per-engine preflight, 30-second Playwright launch bound, 45-second process bound, and JSON evidence path; edited files pass ESLint.                                                                                         |
| `node scripts/quality/browser-preflight.mjs {chromium,firefox} --json`                                                                                                  | Pass              | The release inventory path returns validated JSON for Chromium 151.0.7922.34 and Firefox 153.0.                                                                                                                                                                                                                                                              |
| `npm run test:release:quality`                                                                                                                                          | Failed as bounded | Six of seven release checks pass, including clean independent installs, reproducible builds, SBOM, licenses, provenance eligibility, and packed self-hosting. WebKit alone times out at 30 seconds; PID 32354 and the owned temporary workspace are absent after the 68-second run.                                                                          |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:fast`                                                                                                          | Failed, then pass | The first run found only two spelling variants in this ledger. The corrected current-tree run passes ticket workflow, runner self-tests, format, all 216 unit suites and 843 tests, and every fast static detector.                                                                                                                                          |
| `npm run test:coverage`                                                                                                                                                 | Pass              | The delivery coverage gate classifies 329 production artifacts, matches all 27 required test-evidence mappings, and reports 93.12% statements/lines, 92.41% functions, and 82.98% branches.                                                                                                                                                                  |
| `npm run test:property`                                                                                                                                                 | Pass              | All 10 property files and 32 tests pass with replay seed `430043`, including two external render-contract properties.                                                                                                                                                                                                                                        |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:fast`                                                                                                          | Pass              | Current-tree report `2026-09-03T14-23-34-739Z-43627` passes ticket workflow, runner self-test, formatting, all unit tests, and every fast static detector after the direct-browser evidence was recorded.                                                                                                                                                    |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run check`                                                                                                                 | Failed as bounded | Delivery report `2026-09-03T14-24-47-812Z-52156` passes eight enforced lanes. Package, release, and browser quality fail only when WebKit 2336 misses its 30-second inspector handshake. The detector self-test's two red cases detect their intended sabotage but reject the same WebKit timeout as an extra failure. Its 13-test hardening control passes. |
| Native Safari 26.6.2 Apple WebDriver route and theme-control probe                                                                                                      | Pass              | The installed Safari loads both public guides, initializes the documentation shell, exposes the expected ecosystem and interoperability contracts, and changes the theme plus accessible label through a real WebDriver click.                                                                                                                               |
| `node scripts/quality/browser-preflight.mjs webkit --json`; `CI=1 npx playwright test e2e/site.spec.ts --project=desktop-webkit --workers=1 --retries=0`                | Pass              | The active Aqua session clears the launch problem. WebKit 26.5 passes preflight, and all nine website tests pass.                                                                                                                                                                                                                                            |
| `CI=1 npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-webkit --workers=1 --retries=0`                                                       | Fail              | The first case submits the complete native multipart body, but WebKit omits the fixture's categorical headers from the Playwright view of Turbo's `303` response. Fail-fast stops the remaining six tests. A diagnostic server confirms the submitted body includes the value, filename, file bytes, and submitter.                                          |
| `CI=1 npx playwright test e2e/interoperability-baseline.spec.ts --project={desktop-chromium,desktop-firefox,desktop-webkit} --workers=1 --retries=0`                    | Pass              | After forwarding server proof through Turbo's redirected GET, all seven expanded interoperability cases pass independently in Chromium, Firefox, and WebKit. Each engine covers native fallback, both host boundaries, repeated renders, multipart forms, failures, and lifecycle ownership.                                                                 |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run check` (`quality:delivery`)                                                                                            | Pass              | Delivery report `2026-09-03T14-48-11-618Z-8205` passes all 12 enforced lanes, including 299-test browser selection, package consumers, release proof, and all 13 detector self-tests.                                                                                                                                                                        |

### Inspection ledger

| Finding                                                                                                                                                                                    | Resolution                                                                                                                                                                                                                                                                                                                           |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Delivery report `2026-09-03T00-37-29-114Z-91371` found a missing demo route, a 2,088-byte package overrun, Turbo 8.0.0, and two browser timeouts.                                          | Added the demo entry, reduced the package to 2,869,527 packed bytes under the unchanged 2,870,000 limit, replaced Turbo 8.0.0 with 8.0.21, and supervised nested Playwright commands.                                                                                                                                                |
| Completed Playwright commands could leave descendants holding captured stdout and stderr, so their parent waited until the 45- or 60-minute outer timeout.                                 | Nested commands use the shared detached process runner. A regression proves normal exit releases an inherited-output descendant in under three seconds, and another proves timeout cleanup reaches a descendant in its own process group.                                                                                            |
| After the restart, Playwright WebKit 26.5 on macOS 26.6.2 starts but never completes launch. Chromium and Firefox remain available, and all 21 interoperability tests passed earlier.      | Added explicit package launch, proof, and cleanup bounds. This host still cannot produce a current delivery receipt. The behavior matches [Playwright issue 41870](https://github.com/microsoft/playwright/issues/41870), which reports the macOS sandbox deadlock and says reinstalling or clearing quarantine does not resolve it. |
| A failed browser fixture could restart once per selected test before the 15-minute outer deadline, and WebKit can deadlock before a test failure exists.                                   | CI stops after one final test failure. A supervised three-engine preflight now prevents the matrix from starting when an engine cannot open a page; a two-test red/green proof and a real WebKit failure prove both paths.                                                                                                           |
| The written coexistence matrix was backed by separate tests but lacked one proof that all promised subsystems survive the same repeated external-render sequence.                          | Added one public-API contract test that performs two htmx-style render transactions and verifies exact application cleanup, preserved identity/state/form/focus, non-duplicated UI and jQuery behavior, four protocol requests, operation observations, and complete disposal.                                                       |
| AC-10 promised bounded DOM/ownership fingerprints and explicit nested, repeated, failure, file, disabled-control, and submitter evidence that the actual-package recorder did not contain. | Added hashed structural fingerprints, categorical focus/target keys, history and ownership counts, nested cleanup keys, paired repeated-render assertions, host failure cases, and server-observed multipart proof. Chromium and Firefox pass the expanded seven-case suite.                                                         |
| The downstream-ticket test compared two copies of a hardcoded manifest digest, so a manifest edit could leave both activation gates stale while the test stayed green.                     | The test now computes SHA-256 from the current manifest bytes. Tickets 0036 and 0037 pin the resulting digest, and the 18-test host-neutral suite passes.                                                                                                                                                                            |
| Three fixture servers from the manually interrupted pre-hardening browser diagnostic still held ports 4173, 4174, and 4175 even though browser-specific process checks were clean.         | Removed only the confirmed jqdatastar orphan PIDs. Current browser runs use the descendant-aware runner and all three ports are free after the passing Chromium and Firefox runs.                                                                                                                                                    |
| AC-01 trusted declared import boundaries, and AC-06 proved repeated identical cleanup without a nested public-adapter sequence.                                                            | The contract test now scans implementation and declaration imports plus forbidden private identifiers. A separate public-adapter test passes outer then inner cleanup callbacks and observes one `inner`, `outer` release order.                                                                                                     |
| Standalone `test:release:quality` reached its supported-toolchain probe and waited indefinitely for WebKit's inspector handshake.                                                          | Replaced the inline synchronous probe with the shared process runner and per-engine preflight checks. The current run returns a red report in 68 seconds, completes packed self-hosting, and removes the WebKit process and owned temporary workspace.                                                                               |
| Native Safari testing was requested after `safaridriver` initially reported remote automation as disabled.                                                                                 | `sudo safaridriver --enable` created the user WebDriver preference with `AllowRemoteAutomation = true`. Native Safari still cannot launch because the server has no logged-in macOS desktop session. Direct Chrome headless-shell proof remains available without Playwright.                                                        |
| After the Aqua session became active, WebKit exposed a cross-browser test seam: it submits the complete multipart body but hides custom headers on Turbo's `303` response.                 | Keep the native redirect, store server-derived proof for 10 seconds under an opaque one-use ID, and return it on the redirected GET. The ID carries no form data. All seven interoperability cases now pass in WebKit, Chromium, and Firefox.                                                                                        |

## Document

### Documentation changed

- `docs/INTEROPERABILITY.md` publishes the host-neutral transaction, exact Turbo and htmx event
  maps, preservation and overlap rules, supported versions, evidence policy, and update process.
- `README.md`, `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, and `docs/TESTING.md`
  describe the public render adapter, host ownership boundary, three-browser fixture, and package
  limits.
- `docs/DEVELOPMENT.md` and `docs/TESTING.md` document bounded browser preflight and descendant
  cleanup for local and delivery runs.
- `example/docs/interoperability/index.html`, the shared documentation shell, and the generated
  agent corpus publish the same supported ranges, lifecycle, preservation, and ownership limits.
- Tickets 0036 and 0037 import the exact manifest digest, package boundaries, mapping IDs, and
  implementation gates for separate Turbo and htmx bridges.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                 |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01     | Pass   | The host-neutral coordinator source and declarations use only public `jquery-star/core` and `jquery-star/testing` imports. Source scans plus 18 focused contract/property tests reject private runtime paths, kernel state, application maps, and host mutation code.    |
| AC-02     | Pass   | `quality/external-bridge-contract.json` and its closed schema validate exact package identities, ranges, boundary aliases, integrity values, detection policy, official sources, and dated trace evidence.                                                               |
| AC-03     | Pass   | The manifest maps every supported Turbo document, form, restoration, Frame, cache, cancellation, no-render, and error flow. Both exact Turbo packages pass the seven-case suite in Chromium, Firefox, and WebKit.                                                        |
| AC-04     | Pass   | The manifest maps boosted navigation, region and insertion swaps, OOB, delete, no-swap, cancellation, history, and failure paths. Both exact htmx packages pass the same three-browser suite.                                                                            |
| AC-05     | Pass   | Contract/model tests and browser traces prove cancellation before mutation leaves ownership live, actual cleanup starts at the last mutation seam, and post-cleanup failures settle once with partial state reported.                                                    |
| AC-06     | Pass   | The public-adapter nested test releases inner then outer roots once. Property tests cover disjoint operations and overlap rejection without racing ownership.                                                                                                            |
| AC-07     | Pass   | Contract and actual-package tests cover `data-jqs-preserve`, `data-turbo-permanent`, and `hx-preserve` identity, containment, uniqueness, value retention, host-owned focus, and deterministic rejection/cleanup cases.                                                  |
| AC-08     | Pass   | Schema-validated recorder records use monotonic sequence, stable host/flow/target categories, bounded fingerprints and counts, and one terminal outcome without URLs, bodies, HTML, DOM, state, or raw errors.                                                           |
| AC-09     | Pass   | Native and host form tests cover validation, GET, multipart POST, submitters, disabled fields, files, redirects, history, and focus. Server-derived multipart proof passes in all three browsers without bridge-owned requests or writes.                                |
| AC-10     | Pass   | `e2e/interoperability-baseline.spec.ts` covers documents, Frames, regions, swap categories, nested roots, preservation, history/cache, cancellation, no-content, errors, forms, focus, repeats, and JavaScript-disabled fallback with semantic partial-order assertions. |
| AC-11     | Pass   | The integrated public-API test performs repeated external renders with behavior/declarative roots, generic and Datastar traffic, UI, jQuery, forms, focus, preservation, observations, and complete disposal without duplicated resources.                               |
| AC-12     | Pass   | Tickets 0036 and 0037 pin the current manifest SHA-256 and complete downstream requirements. Delivery run `2026-09-03T14-48-11-618Z-8205`, ticket Test validation, package/release/browser reports, and `git diff --check` pass without mutation testing.                |

### Completion audit

All 12 criteria have direct current-tree evidence. The contract, schema, exact host packages,
three-browser traces, public-adapter tests, downstream activation gates, public documentation,
package boundaries, and delivery receipt agree. No unresolved finding remains in this ticket.

Status: Complete

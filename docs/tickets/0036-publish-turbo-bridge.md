---
id: 0036
title: Publish the Turbo lifecycle bridge
status: done
created: 2026-08-30
updated: 2026-09-03
---

# 0036: Publish the Turbo lifecycle bridge

## Plan

### Problem

Turbo document visits and Frames mutate DOM through Turbo-specific public events and render
callbacks. Without a bridge, outgoing jQStar applications can lose their root before disposal or
incoming roots can be enhanced twice. A careless bridge is worse: destroying on cancellable intent
can leave a live page dead; faking one generic event model can miss Frame/cache/history differences;
and broad version claims can silently break when Turbo changes ordering.

The bridge must translate the exact approved Turbo seams into jQStar's public render transaction. It
must never become a second Drive/Frame implementation or take ownership of Turbo requests, forms,
history, cache, head, scroll, focus, progress, or mutation.

### Current evidence

- Ticket 0013 publishes the public render transaction with multiple deduplicated beforeRemove
  boundaries, exact caller-supplied preserved roots, commit/fail/barrier ordering, public disposal,
  and no live application map.
- Ticket 0014 provides installed external-plugin, DOM-replacement, runner-neutral, QUnit, and
  three-browser conformance.
- Ticket 0016 freezes a host-neutral state machine plus a Turbo-specific compatibility manifest,
  actual-package semantic traces, supported SemVer boundaries, version detection/failure policy,
  event-to-transition map, preservation rules, overlap policy, and shared progressive fixture.
- Ticket 0010 supplies immutable operation observations and terminal outcomes.
- No jquery-star/turbo entrypoint or runtime dependency currently ships.

### Activation gate

Do not start Code until tickets 0013, 0014, and 0016 are done. Import the exact Turbo package
identity, supported range, oldest/newest tested tarballs/checksums, public version-detection source,
event/flow IDs and traces, preservation/overlap/failure rules, and public render API identity.
Plan-validate every mapped Turbo transition. Unknown, prerelease, or out-of-range behavior must be
decided before any listener is implemented; no latest/caret inference widens support.

### Imported ticket 0016 contract

Activation must pin SHA-256 `93099930bc6fb735c72d0bb2ab6f770c852a7a79dee23239f0245178bbc60c7f` for
`quality/external-bridge-contract.json`. The package is `@hotwired/turbo`, the exact approved range
is `>=8.0.21 <8.1.0`, and version evidence is a required explicit caller value. Missing, malformed,
prerelease, unknown, and out-of-range values reject before listener registration. Turbo 8.0.21 is
the lower bound because CVE-2025-66803 affects releases through 8.0.20.

| Boundary | Alias          | Registry integrity                                                                                |
| -------- | -------------- | ------------------------------------------------------------------------------------------------- |
| 8.0.21   | `turbo-8-0-21` | `sha512-fJTv3JnzFHeDxBb23esZSOhT4r142xf5o3lKMFMvzPC6AllkqbBKk5Yb31UZhtIsKQCwmO/pUQrtTUlYl5CHAQ==` |
| 8.0.23   | `turbo-8-0-23` | `sha512-GZ7cijxEZ6Ig71u7rD6LHaRv/wcE/hNsc+nEfiWOkLNqUgLOwo5MNGWOy5ZV9ZUDSiQx1no7YxjTNnT4O6//cQ==` |

The required stable mapping IDs are `turbo.document.visit`, `turbo.form.visit`,
`turbo.document.restore`, `turbo.frame.replace`, `turbo.cache.snapshot`, `turbo.document.no-render`,
`turbo.document.canceled`, and `turbo.document.error`. The imported overlap policy permits disjoint
boundaries under distinct operation IDs and rejects active same, ancestor, or descendant boundaries
before begin. Permanent roots require connected, contained, same-document, unique old and incoming
IDs and post-mutation identity verification.

The boundary traces show one browser variance that the implementation cannot depend on.
`turbo:submit-end` and the follow-up `turbo:before-visit` can reverse order. Both precede the
pausable `turbo:before-render` callback. Valid permanent inputs keep DOM and value identity, but the
host can move focus to the activated control. Focus remains Turbo-owned.

### Activation evidence

- Tickets 0013, 0014, and 0016 are `done`.
- `quality/external-bridge-contract.json` has SHA-256
  `93099930bc6fb735c72d0bb2ab6f770c852a7a79dee23239f0245178bbc60c7f`, and its eight Turbo mapping
  IDs are unique and match the required set.
- The manifest requires explicit caller-supplied version evidence, rejects missing, unknown,
  prerelease, and out-of-range versions before listener registration, and freezes the exact range
  `>=8.0.21 <8.1.0`.
- `package-lock.json` resolves `turbo-8-0-21` and `turbo-8-0-23` to the imported package versions
  and registry integrities.
- `src/render-adapter.ts` has SHA-256
  `780f853e2728ec9a2e08a9aa0e08be44396f6fceb919c3639784498b916e0b53`, matching the manifest's
  approved public render API. `jquery-star/turbo` does not yet exist in package exports.
- `npm run ticket:validate -- --phase plan --ticket docs/tickets/0036-publish-turbo-bridge.md`
  passed before the status moved to `coding`.

### Scope

- Publish side-effect-free jquery-star/turbo with declarations and formats approved by ticket 0013.
  Importing it does not import/install Turbo, inspect a global, attach document listeners, start a
  kernel, or enable Drive. An explicit plugin factory receives the supported Turbo capability and
  public version evidence, then installs transactionally into one kernel/document.
- Validate host identity/version/capabilities before registering listeners. Missing, unsupported,
  prerelease, ambiguous, or duplicate bridge installations follow the frozen fail/warn/no-op policy
  and leave no partial listener, hook, plugin record, or operation.
- Implement each ticket-0016 Turbo event/flow mapping by stable ID: document render, Frame render,
  cache snapshot/save, history restoration, no-render/no-content, canceled visit/render, response/
  network/render error, disconnected target, and every approved redirect/form path. Do not infer one
  flow from a similarly named event in another flow.
- At the last reliable actual pre-mutation seam, open one public render transaction, validate exact
  outgoing boundary and preserved live roots, call beforeRemove for all actual removal boundaries,
  let Turbo's documented callback perform the mutation once, commit explicit incoming jQStar roots,
  await enhancement/barrier, and then allow Turbo completion according to the frozen trace.
- Never destroy on link/form/request/visit intent while cancellation remains possible. Errors before
  cleanup leave applications live. Errors after cleanup/mutation settle fail exactly once, clean
  promised-but-removed roots and bridge records, report partial mutation, and follow Turbo's native
  reload/error behavior without attempting a DOM rollback.
- Convert matching data-turbo-permanent elements into exact old live element identities only after
  unique ID, marker, incoming match, same-document, connection, containment, and flow checks. Always
  include valid data-jqs-preserve roots through the core policy. Duplicate, nested, moved,
  unmatched, disconnected, cross-frame, or promised-but-removed roots are deterministically
  rejected/cleaned.
- Correlate multiple public events for one Turbo render into one bridge operation without retaining
  request bodies, responses, URLs, DOM after settlement, or application state. Nested outgoing roots
  are released deepest-first once. Disjoint Frames may proceed independently; same/ancestor/
  descendant boundaries follow the imported join/queue/reject rule.
- Enhance only explicit incoming roots and await whenEnhanced once. Repeated Turbo events, cache
  preview/final render, Frame reconnect, restoration, and nested boundaries cannot duplicate
  applications, directives, actions, helpers, effects, event handlers, observers, requests,
  subscriptions, timers, UI services, or plugin hooks.
- Leave Turbo authoritative for fetch, form serialization/submitter/validation, redirect,
  visit/cache/history/head/scroll/focus/progress, DOM rendering, scripts, morphing, and public
  events. The bridge never sends/replays a request/form, writes history, changes head/focus/scroll,
  calls Turbo navigation APIs, dispatches synthetic Turbo events, or substitutes a second renderer.
- Emit only ticket-0010 bounded Turbo bridge observations: bridge operation ID, host/version, stable
  flow/event IDs, target category, phase/outcome, counts/timing, and public disposal summary. Omit
  URL/query, form values, headers/body/HTML, response/error details, DOM, signal/state, and history
  values.
- Prove coexistence with root and modular jQStar, behavior/declarative applications, generic JSON/
  HTML, official-SDK Datastar streams/patches, UI document services/overlays, jQuery handlers,
  native controls/forms, focus, and preservation before/during/after repeated actual Turbo renders.
- Dispose installation exactly once: stop accepting events, settle/cancel owned prepared records
  according to the imported policy, remove listeners/render wrappers/version hooks, release host/
  boundary weak correlations, and preserve Turbo plus other plugins/kernels. Active Turbo render
  handoff has an explicit finish-or-fail rule and cannot hang its resume/barrier.

### Out of scope

- Reimplementing or wrapping all of Turbo Drive/Frames/Streams; owning Turbo navigation, forms,
  requests, redirects, cache, history, head, scroll, focus, progress, or DOM policy.
- Supporting untested Turbo versions, prereleases, custom renderers/adapters, third-party lifecycle
  extensions, shadow/cross-document targets, or ambiguous permanent elements.
- Installing Turbo or this bridge from root/core/UI/Datastar, auto-detecting globals, or creating a
  fake host-neutral public event API.

### Dependencies

- Tickets 0013, 0014, and 0016.

### Acceptance criteria

- [x] [AC-01] Activation pins the exact ticket-0016 Turbo manifest, package/version boundaries,
      checksums, detection/failure policy, event/flow traces, preservation/overlap rules, and public
      render API; all stable mapping IDs are unique and Plan validation passes before Code.
- [x] [AC-02] The exact tarball resolves jquery-star/turbo declarations and approved formats. Import
      is inert; explicit installation receives Turbo/version/kernel, validates before commit, is
      transactional/idempotent, and uses only declared public jQStar subpaths plus the approved
      host.
- [x] [AC-03] Every approved document, Frame, cache, restoration, no-render/no-content, cancel,
      redirect/form, error, and disconnected flow matches its semantic trace from actual oldest and
      newest supported Turbo packages in Chromium, Firefox, and WebKit.
- [x] [AC-04] No cancellable intent destroys ownership. Each actual mutation begins at the approved
      last pre-mutation seam, calls all deduplicated beforeRemove boundaries before Turbo mutates,
      commits explicit incoming roots afterward, awaits enhancement, and settles one
      operation/resume in the documented relative order.
- [x] [AC-05] Errors before removal leave applications live. Cancellation/no-render creates no
      stranded transaction. Errors after cleanup/mutation fail once, release promised/missing roots
      and bridge correlations, report partial state, and preserve Turbo's documented native error/
      reload behavior without rollback or request/render replay.
- [x] [AC-06] data-jqs-preserve and uniquely matching data-turbo-permanent roots retain exact DOM,
      application/state/effect/listener/request/UI/value identity only under all frozen checks.
      Focus matches the host baseline without bridge writes. Nested, duplicate, unmatched, moved,
      disconnected, cross-frame, and promised-but-removed cases clean deterministically and never
      remain hidden ownership records.
- [x] [AC-07] Nested outgoing roots dispose deepest-first once. Repeated/cache preview-final/Frame
      reconnect events dedupe. Disjoint Frames obey independent IDs, and overlapping same/ancestor/
      descendant boundaries obey the imported join/queue/reject rule without racing ownership.
- [x] [AC-08] Repeated routes contain exactly one incoming enhancement and no duplicate application,
      action/directive/helper/effect/listener/observer/request/subscription/task/UI/plugin behavior;
      public terminal disposal counts reconcile without private application-map inspection.
- [x] [AC-09] Turbo remains authoritative for request/form/redirect/cache/history/head/scroll/focus/
      progress/mutation/events. Network/history/focus/form/event spies prove the bridge performs no
      second request, replay, history/head/scroll/focus write, renderer, or synthetic Turbo event.
- [x] [AC-10] Root/modular, behavior/declarative, generic JSON/HTML, official-SDK Datastar, UI,
      jQuery, native GET/non-GET forms, validation/submitter/file, focus, JavaScript-disabled, and
      disposal coexistence pass before and after repeated document/Frame/restoration flows.
- [x] [AC-11] Observations have one ID/terminal outcome per actual render, exact phase order and
      bounded host/flow/category/count/timing fields, with no URL, form/header/body/HTML/error, DOM,
      state, response, or history-value disclosure.
- [x] [AC-12] Missing/unknown/prerelease/out-of-range/ambiguous host versions and duplicate installs
      follow the frozen policy before listener commit. Installed consumer tests cover both supported
      boundaries and prove no broad untested SemVer implication.
- [x] [AC-13] Bridge disposal during idle/prepared/rendering/settled states is idempotent, cannot
      hang Turbo resume, and releases listeners/wrappers/correlations/operations once without
      disposing Turbo, kernel, applications, or another bridge/client it does not own.
- [x] [AC-14] Root/core/UI/Datastar/CSP/testing packages exclude bridge/Turbo code; exact package
      API/type/version/format/graph/size plus focused/coverage/property/static/three-browser/
      accessibility/package/release/check/ticket/diff gates pass without mutation testing.

### Design

One installed plugin owns a document-scoped adapter and bridge operation table. The table is keyed
by public Turbo request/render identity where available and by a short-lived bridge token otherwise.
Records contain only flow IDs, public transaction handle, weak boundary/preserved identities, phase,
and terminal cleanup; they are removed as soon as the trace reaches a terminal state.

The bridge does not normalize Turbo into another public API. Each frozen mapping selects the exact
public event or render callback, whether it is cancellable, when mutation becomes inevitable, the
boundary/incoming roots, and how later completion/errors correlate. A small internal dispatcher
feeds those mappings into the shared jQStar render state machine.

Permanent elements remain a Turbo concept at the host boundary. The bridge verifies the old/new
contract and passes exact old live identities to core. Core performs its same-document/containment/
connectivity checks and verifies promised roots after commit.

### Decisions

- Turbo is explicitly injected and remains optional; no global detection or auto-install.
- Support means actual boundary tarballs and mapped public events passed, not a broad guessed range.
- Destroy only when Turbo will actually mutate and settle every opened operation exactly once.
- Preserve exact live elements, never marker selectors or IDs alone.
- Turbo owns navigation and mutation; the bridge owns only jQStar lifecycle around that mutation.
- Public observations use stable flow IDs and redacted categories, not raw event detail.

### Security and accessibility

- Host events/boundaries/new roots are validated against the installed kernel document before
  ownership changes. The bridge never treats Turbo response HTML as safer or bypasses CSP, Trusted
  Types, sanitization, CSRF, origin, credential, or redirect policy.
- Recorder/observations omit sensitive request, response, form, URL, HTML, DOM, state, and error
  data.
- Keyboard/focus/native-form/no-JavaScript baselines come from Turbo itself; the bridge must
  preserve them and clean jQStar traps/overlays/live regions before removal without adding
  announcements.

### Risks

- Turbo event/render contracts can change inside an optimistic range. Pin narrow boundaries and
  require a manifest ticket before widening.
- Destroying too early kills a canceled page; too late loses the root. The actual package traces and
  wrapped final render seam are the implementation authority.
- Permanent elements can be temporarily moved. Match by documented old/new semantics, pass the exact
  old identity, and verify connectivity after commit.
- Preview/final/cache events can double-enhance. Correlate stable flow identity and assert lifecycle
  counters, not only final DOM.
- Disposal during a paused render can hang Turbo. Freeze and fault-test a terminal resume/fail rule.

### Verification plan

- Validate imported manifest and generate total Turbo event/flow mapping coverage before source
  edits.
- Model/property-test transition order, repeated events, multiple beforeRemove calls, preservation,
  overlap, cancellation/error timing, correlation cleanup, observations, and disposal.
- Install exact oldest/newest approved Turbo tarballs in isolated progressive multi-route consumers;
  establish native and unbridged Turbo baselines, then run bridge traces in all three browsers.
- Run coexistence, no-JavaScript, accessibility, form/focus/history/cache, network/event spy,
  package graph/size, and exact disposal evidence through public APIs.
- Run focused/fast/coverage/property/static/browser/package/release/check/ticket/diff gates without
  mutation testing.

### Planned files

- Turbo public plugin factory, manifest validator, event dispatcher/correlation/preservation
  adapter, observation mapping, and disposal modules.
- Package exports/types/build/API/census/size/optional-peer configuration for jquery-star/turbo with
  exclusion from all other entrypoints.
- Exact Turbo compatibility manifest/traces and shared progressive server fixture integration.
- Unit/property/model and installed oldest/newest Chromium/Firefox/WebKit/accessibility tests.
- Public Turbo installation/version/preservation/ownership/troubleshooting docs, interoperability
  website page, project architecture/testing docs, and this ticket.

## Code

### Changed-file ledger

| File                                          | Purpose                                             |
| --------------------------------------------- | --------------------------------------------------- |
| `docs/tickets/0036-publish-turbo-bridge.md`   | Track activation, design, files, and evidence.      |
| `src/turbo.ts`                                | Publish the explicit Turbo lifecycle plugin.        |
| `test/turbo-bridge.test.ts`                   | Cover validation and render lifecycle behavior.     |
| `test/property/turbo-bridge.property.test.ts` | Generate bounded bridge event and Frame traces.     |
| `package.json`                                | Export the bridge with an optional Turbo peer.      |
| `package-lock.json`                           | Record optional peer package metadata.              |
| `vite.config.ts`                              | Build isolated ESM and CommonJS bridge formats.     |
| `scripts/build-types.mjs`                     | Roll up Turbo bridge declarations.                  |
| `scripts/smoke-package-files.mjs`             | Require all published Turbo bridge artifacts.       |
| `config/api-extractor.turbo.json`             | Define the Turbo declaration and API report.        |
| `config/tsconfig.api-extractor.json`          | Resolve the Turbo subpath during API extraction.    |
| `etc/jquery-star-turbo.api.md`                | Pin the reviewed public Turbo API surface.          |
| `.prettierignore`                             | Preserve generated API report formatting.           |
| `config/quality-budgets.json`                 | Set bridge artifact and consumer size ceilings.     |
| `quality/public-baseline.json`                | Add the isolated preview export and artifacts.      |
| `scripts/quality-package.mjs`                 | Verify packed bridge exports, graphs, and use.      |
| `schema/quality-budgets.schema.json`          | Validate Turbo consumer bundle ceilings.            |
| `schema/package-report.schema.json`           | Validate Turbo export, peer, and graph evidence.    |
| `test/jquery-ecosystem-contract.test.ts`      | Distinguish required and optional package peers.    |
| `test/package-release-hardening.test.mjs`     | Keep package evidence-schema canaries current.      |
| `e2e/fixtures/interoperability-server.mjs`    | Serve built bridge modules to actual Turbo hosts.   |
| `e2e/fixtures/turbo-bridge-bootstrap.js`      | Install the bridge before booting fixture roots.    |
| `e2e/interoperability-baseline.spec.ts`       | Assert bridge ownership on frozen host traces.      |
| `README.md`                                   | Document Turbo bridge installation and ownership.   |
| `docs/INTEROPERABILITY.md`                    | Mark the Turbo bridge shipped and define its API.   |
| `docs/ARCHITECTURE.md`                        | Place the bridge at the public render boundary.     |
| `docs/PROJECT.md`                             | Record the optional bridge package architecture.    |
| `docs/TESTING.md`                             | Document Turbo unit/property/package/browser proof. |
| `example/docs/interoperability/index.html`    | Publish the Turbo bridge guide on the website.      |
| `config/agent-content.json`                   | Update agent-facing Turbo bridge facts.             |
| `example/docs/agents/index.html`              | Regenerate the public agent usage guide.            |
| `example/agent-content.generated.json`        | Regenerate the reviewed website content corpus.     |
| `example/public/jqstar-agent-index.json`      | Regenerate the machine-readable website index.      |
| `example/public/llms.txt`                     | Regenerate the concise agent navigation file.       |
| `example/public/llms-full.txt`                | Regenerate the complete agent content file.         |
| `test/fixtures/csp/conformance-map.json`      | Refresh README expression source line evidence.     |

### Design changes

- The public factory is `createTurboBridge({ $, Turbo, version })`. It captures the installed jQuery
  identity required by `createRenderAdapter()` and validates the injected Turbo capability and
  explicit version synchronously. It does not start Turbo or read `window.Turbo`.
- The returned official `core.turbo` plugin stages document listeners through the public plugin
  registrar. Its facade exposes bounded observation snapshots/subscriptions and idempotent bridge
  disposal. Kernel disposal calls the same cleanup path.
- Each `before-render` or `before-frame-render` event replaces only that event's public render
  callback. The wrapper begins at actual mutation, releases the outgoing child boundaries, calls the
  captured Turbo renderer once, commits explicit connected `[data-jqs]` roots, and reports any
  asynchronous failure without replaying or rolling back the host mutation.
- Ticket 0038's “sole peer” assertion is refined to “sole required peer.” jQuery remains the only
  required peer. Turbo is an optional peer used only by `jquery-star/turbo`, as ticket 0016's
  dependency policy requires.

## Test

| Command                                                                                                                              | Result | Evidence                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------ | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0036-publish-turbo-bridge.md`                                         | Pass   | Activation, imported manifest, design, and mapping plan validated before source edits.                                                                                      |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:fast`                                                                       | Fail   | Run `2026-09-03T15-22-12-786Z-89824` found generated API formatting, the new baseline export, and optional-peer assertions. All three were corrected.                       |
| `npx vitest run test/turbo-bridge.test.ts`                                                                                           | Pass   | 18 focused cases cover input validation, document/Frame lifecycle, preservation, errors, observations, overlap, idle, and disposal.                                         |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run test:property`                                                                      | Pass   | Seed `430043`; 34 properties include 200 generated Turbo trace/Frame cases. Report: `test-results/quality/property-gate.json`.                                              |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run test:coverage`                                                                      | Fail   | Turbo reached 100% changed-line coverage, but README insertions made the checked-in CSP source-line inventory stale. `npm run csp:inventory` corrected the map.             |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run test:coverage`                                                                      | Pass   | Global 93.23% lines, 92.52% functions, and 83.11% branches; `src/turbo.ts` has 100% lines/functions and 93.19% branches. Report: `test-results/quality/coverage-gate.json`. |
| Three-engine `e2e/interoperability-baseline.spec.ts`                                                                                 | Fail   | The first rebuilt run showed detached Turbo response bodies are same-realm but not owned by the live document. Validation was narrowed to reject foreign realms.            |
| Three-engine `e2e/interoperability-baseline.spec.ts --grep Turbo`                                                                    | Pass   | 9 actual Turbo 8.0.21/8.0.23 document, Frame, form, restore, cache, cancellation, no-content, error, identity, and ownership cases passed in Chromium/Firefox/WebKit.       |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run test:package:quality`                                                               | Pass   | 13 package checks passed for the packed tarball, including optional peer, ESM/CommonJS/types, graph exclusion, three-browser consumers, and budgets.                        |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:fast`                                                                       | Pass   | Run `2026-09-03T15-53-46-767Z-21185` passed ticket workflow, runner self-test, format, unit, and static-fast lanes.                                                         |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0036-publish-turbo-bridge.md --report .git/jqstar/latest-report.json` | Pass   | The complete code ledger and passing fast report authorized the `testing` transition.                                                                                       |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:delivery`                                                                   | Fail   | Run `2026-09-03T15-55-20-574Z-30079` passed ten lanes. Formatting found this ticket, and package evidence validation found the old eight-export, single-peer schema.        |
| `npx vitest run test/package-release-hardening.test.mjs`                                                                             | Pass   | 13 tests pass after the package report fixture and false-green canaries gained the Turbo export, optional peer, and graph record.                                           |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:delivery`                                                                   | Pass   | Run `2026-09-03T16-11-15-217Z-84042` passed all 12 enforced lanes, including 299 selected browser tests, package/release proof, and detector self-tests.                    |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:delivery`                                                                   | Fail   | Run `2026-09-03T16-23-51-733Z-18279` passed 11 lanes; spelling rejected one internal Turbo class nickname in the new inspection ledger. The note now uses plain wording.    |
| `PATH="$PWD/.git/jqstar/tools/bin:$PATH" npm run quality:delivery`                                                                   | Pass   | Run `2026-09-03T16-36-16-671Z-53785` passed all 12 lanes on the complete Test, inspection, documentation, and acceptance-evidence state.                                    |

### Inspection ledger

| Finding                                                                                                            | Resolution                                                                                                                                                |
| ------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Matching permanent roots inside the wrapped renderer was too late because Turbo's internal handoff had begun.      | Capture uniquely matched old roots at `turbo:before-render`, then commit after the matching Turbo render completion event verifies the retained identity. |
| A same-realm Turbo response body belongs to a detached parser document before Turbo adopts it.                     | Validate the incoming element's DOM realm and required body/Frame kind. Reject only foreign realms and invalid targets before beginning ownership.        |
| A form or restoration flag could survive a 204, request failure, or missing Frame and misclassify the next render. | Clear visit classification on every terminal no-mutation response/error path and cover the following ordinary visit.                                      |
| The first package report passed behavior checks but failed aggregate validation against the old evidence schema.   | Extend the schema and its negative canaries for nine exports, required jQuery plus optional Turbo peers, and the isolated Turbo consumer graph.           |
| README usage additions shifted source locations in the generated CSP expression inventory.                         | Regenerate the five deterministic CSP artifacts and verify the frozen contract test before rerunning coverage.                                            |

## Document

### Documentation changed

- `README.md` documents the inert Turbo entry, explicit capability/version input, install sequence,
  ownership boundary, preservation, idle barrier, and disposal.
- `docs/INTEROPERABILITY.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, and `docs/TESTING.md`
  record the shipped preview, exact host seams, optional-peer graph, package shape, and evidence.
- `example/docs/interoperability/index.html` publishes the same usage and limitations for people.
  `config/agent-content.json` and its generated website outputs publish the same facts for agents.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                              |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | The activation evidence pins the manifest and render-adapter digests, aliases, integrity values, eight mapping IDs, prerequisites, and passing Plan validation.                       |
| AC-02     | Pass   | `package.json`, the generated Turbo declarations/API report, package smoke, and the installed-package quality report prove inert ESM/CommonJS resolution and explicit installation.   |
| AC-03     | Pass   | The actual Turbo 8.0.21/8.0.23 fixture passes document, Frame, form, restoration, cache, cancel, 204, and error paths in Chromium, Firefox, and WebKit.                               |
| AC-04     | Pass   | Focused render-order tests and actual host traces prove no transaction at intent, one wrapped host mutation, outgoing cleanup, explicit incoming commit, and enhancement settlement.  |
| AC-05     | Pass   | Focused cancellation, 204, request/Frame error, synchronous/async renderer failure, and enhancement-failure tests prove the before/after mutation outcomes and no rollback/replay.    |
| AC-06     | Pass   | Unit and three-browser identity assertions retain `data-jqs-preserve` and `data-turbo-permanent` DOM, application, handler, state, value, and focus behavior only for valid matches.  |
| AC-07     | Pass   | Core render tests, bridge overlap rejection, actual repeated flows, and generated disjoint Frame completion orders prove deduplication and independent IDs.                           |
| AC-08     | Pass   | Repeated actual document/Frame routes assert outgoing destruction, one incoming application, retained permanent identity, and no duplicate owned behavior.                            |
| AC-09     | Pass   | The actual host suite asserts request method/body/submitter, redirects, history, focus, mutation, and event order while the bridge source calls no navigation API.                    |
| AC-10     | Pass   | Full unit, browser, package, and release lanes cover root/modular, declarative, generic, Datastar, UI, jQuery, forms, no-JavaScript, accessibility, and disposal coexistence.         |
| AC-11     | Pass   | Focused/generated/browser assertions require monotonic IDs, exact phases and terminal outcomes, a 256-record cap, and an exact redacted field allowlist.                              |
| AC-12     | Pass   | Synchronous factory tests reject missing/malformed/prerelease/out-of-range inputs; package and three-browser tests cover both approved Turbo boundaries without a runtime dependency. |
| AC-13     | Pass   | Active and settled disposal tests prove memoized reports, listener removal, one failure settlement, zero remaining operations, and a live independent kernel/Turbo capability.        |
| AC-14     | Pass   | Delivery run `2026-09-03T16-36-16-671Z-53785` passes all 12 lanes; package evidence proves types/formats/API, size limits, optional peer, and host-code exclusion.                    |

### Completion audit

Status: Complete

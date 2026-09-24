---
id: 0037
title: Publish the htmx lifecycle bridge
status: testing
created: 2026-08-30
updated: 2026-09-17
---

# 0037: Publish the htmx lifecycle bridge

## Plan

Owner 0016 will add a separate `nested=1` actual-host backend mode after owner 0006's plain
application-island correction. Verify child-only JSON/HTML/SDK SSE actions and isolated outer state
before and after real htmx inner swap on both pinned versions and three engines. Retain the
single-app control and before-native-removal check; this remains a common-matrix slice.

Owner 0016 plans an opt-in actual-host backend slice for generic JSON/HTML and official-SDK Datastar
SSE before and after htmx replacement. This ticket will record the six pinned htmx cases and
no-bridge timing negative while retaining AC-10 for the rest of the common matrix.

Owner 0016 plans an active Resizable pointer-session host slice for both pinned htmx versions in all
three desktop engines. This owner will record its six cases and no-bridge timing negative; AC-10
stays open for the remaining common matrix.

### Actual-host UI Countdown continuation (2026-09-23)

Owner 0016 now plans a separate Message Scroller observer/listener slice over both pinned htmx
versions and all three desktop engines. This ticket will record its six host cases and retain AC-10
open for the rest of the common matrix.

The six htmx Message Scroller cases pass. The no-bridge 2.0.0 Chromium diagnostic fails the
before-native-removal observer/listener assertion after the host removes the root. The 54-case
combined baseline and UI selection passes across all three engines; AC-10 remains open.

The exact 929-file `npm run check` report `2026-09-23T06-22-37-775Z-4099/report.json` passes all
1,666 browser cases, including these six, but remains red on inherited coverage, three fixed package
sizes and package-budget detector isolation. There is no delivery receipt.

The tightened connected-to-detached assertion also passes the combined 54-case host selection. The
tightened snapshot's `npm run check` report `2026-09-23T07-05-16-938Z-98065/report.json` passes all
1,666 browser cases, including htmx, but repeats the inherited coverage, three fixed-size and
detector failures. AC-10 remains open without a receipt.

Owner 0016 opens an opt-in actual-host UI fixture and twelve-case browser selection. Its read-only
current-dist htmx probe passes 2.0.0/2.0.10 in all three desktop engines: Countdown timer cleanup
occurs before native inner-swap removal, incoming enhancement starts a new timer and the preserved
neighbor retains node/value identity. Omitting the bridge lets the host swap but fails the
before-removal timer assertion. Owner 0016 owns the shared fixture/spec; this ticket records
htmx-version evidence without closing AC-10 or replacing the remaining UI/resource/JSON/SSE host
matrix. Keep the approved versions, bridge behavior and budgets fixed.

### Disposal aggregation refinement (2026-09-17)

Vitest 4 maps the per-operation catch callback in disposal as an uncalled changed function. The
failure helper already contains adapter rejection and resolves normal terminal work. Keep the
disposal boundary's containment of unexpected rejected promises, but express it with
`Promise.allSettled` over the captured operations. Preserve asynchronous memoization, attempts for
all operations, the final frozen report and repeated promise identity. This replaces the equivalent
`Promise.all` plus individual rejection handlers without inventing an unreachable error test or
removing failure containment. Existing public bridge disposal and observer-error cases must pass,
followed by coverage, package budgets and the full delivery. Shared UI ownership remains open.

### Additional coexistence finding (2026-09-08)

The current disposal correction passes its complete delivery. Keep this owner open for AC-10:
`ui-removal-contract-before.json` confirms that Countdown keeps its interval after public render
removal until a detached tick, and after kernel disposal while the node remains connected. The
shared interoperability matrix promises controller cleanup before removal. Existing Toggle-based
coexistence evidence cannot establish that timer/resource guarantee. Owner 0006 must correct generic
UI ownership and owner 0016 must extend the common contract evidence, followed by both actual host
matrices. No host-version or bridge-mutation expansion is authorized by this finding.

### Reopening decision: disposal before host settlement (2026-09-08)

Ticket 0033's current-source public bridge probe disposes immediately after the after-swap event,
then awaits core enhancement. Disposal and idle remain pending because the bridge has removed the
host-settle listener required to finish the operation. Sending the later host-settle event cannot
recover it. Evidence: `bridge-disposal-before.json` in the current program-audit resume directory.
Reopen AC-13 and AC-14; earlier completion is historical. Owner 0037 implements this correction.

Disposal will memoize its report before settling captured operations. Already-settling core work
keeps its existing promise and must finish without a second adapter settlement. Successful core
commit after disposal terminates the bridge operation as failed-after-mutation without requiring
another host event. A core commit already complete but awaiting host settlement also terminates
without asking its settled adapter to fail again. Retain original failure behavior for prepared and
removing transactions, and classify failures after actual mutation accordingly. Clear listeners and
prepared correlations once; preserve independent host/kernel ownership, bounded observations, exact
public event fields and memoized repeated reports. No synthetic host event or network work is added.

A host swap failure reported from the externally-mutated observation can start adapter failure
before the normal commit call resumes. Treat an already-settling operation as ineligible for commit,
so that path has one failure settlement and no second-adapter error. Add an observer-triggered
native host failure case to exercise the after-mutation failure branch and retain its negative
result.

The first isolated ESM build is 18,080 bytes against the unchanged 18,000-byte limit. Remove the
disposal mapper's duplicate settling branch because the failure helper already returns that same
completion promise, combine its terminal/settling guard, and copy observation snapshots directly
without a redundant identity callback. These preserve all results and ownership; measure again
without increasing any budget. The full temporary type build emitted declarations but API Extractor
could not use the linked checkout's file-shaped .git path; verify the two affected API reports with
an isolated temporary report directory, then run the normal complete build after root integration.

The first reduction leaves ESM at 18,041 bytes. The no-swap branch already sets its request flag
true, then queues work whose only possible write sets the same flag true again. There is no reset of
that field on the same record. Remove this redundant queued callback and its temporary capture of
the host event/request; preserve the existing no-swap and cancellation tests and exact host trace.

Planned files: `src/htmx.ts`, shared new `test/bridge-disposal-lifecycle.test.ts`,
`docs/INTEROPERABILITY.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md` and this ticket. Cover
direct and observer-triggered disposal while commit is pending and after commit before host
settlement, settling failure/cancellation, repeated promise identity, idle barriers, independent
operations and ignored later host events. Keep the prepared-disposal controls and original negative
results. Run focused bridge/render tests, types/lint/changed-code coverage, fixed package/API checks
and current fast/Code/full/Test/Document gates. Work in the isolated checkout during root
verification and revalidate root Plan before selective integration. No mutation tooling or
publication is authorized.

### Problem

htmx swaps, boosted visits, out-of-band updates, and history restoration mutate different DOM
boundaries through multiple htmx-specific lifecycle events. Cleanup events may repeat for nested
elements, some request/swap events are cancellable before any mutation, and swap/settle are separate
phases. Without a bridge, jQStar ownership can be detached before disposal or enhanced repeatedly.

The bridge must map actual supported htmx event traces into the public jQStar render transaction
without taking over requests, swap decisions, forms, history, focus/scroll, indicators, or DOM
mutation. It cannot pretend htmx and Turbo have one interchangeable event vocabulary.

### Current evidence

- Ticket 0013 publishes the public render transaction with deduplicated multiple beforeRemove
  boundaries, exact caller-supplied preservation, explicit incoming roots, enhancement barrier,
  terminal failure, and public disposal reports.
- Ticket 0014 provides installed external-plugin, DOM-replacement, runner-neutral, QUnit, and
  three-browser conformance.
- Ticket 0016 freezes a host-neutral state machine plus an htmx-specific compatibility manifest,
  actual-package traces, exact supported versions, public version-detection/failure policy, per-swap
  event mapping, hx-preserve rules, overlap policy, and progressive server fixture.
- Ticket 0010 supplies immutable bounded operation observations.
- No jquery-star/htmx entrypoint or htmx runtime dependency currently ships.

### Activation gate

Do not start Code until tickets 0013, 0014, and 0016 are done. Import the exact htmx package
identity, supported range, boundary tarballs/checksums, public version source, event/flow/swap IDs
and traces, preservation/overlap/error/settle rules, and public render API. Plan-validate a total
mapping for ordinary inner/outer swaps, approved adjacent/append/prepend/delete/none modes, approved
out-of-band updates, boosted documents, history restore, and failure cases. Any unsupported
swap/extension is explicit; no broad latest/caret range is inferred.

### Imported ticket 0016 contract

Activation must pin SHA-256 `93099930bc6fb735c72d0bb2ab6f770c852a7a79dee23239f0245178bbc60c7f` for
`quality/external-bridge-contract.json`. The package is `htmx.org`, the exact approved range is
`>=2.0.0 <2.1.0`, and version evidence combines the injected host capability with read-only
`htmx.version`. Missing, malformed, prerelease, unknown, and out-of-range values reject before
listener registration.

| Boundary | Alias         | Registry integrity                                                                                |
| -------- | ------------- | ------------------------------------------------------------------------------------------------- |
| 2.0.0    | `htmx-2-0-0`  | `sha512-N0r1VjrqeCpig0mTi2/sooDZBeQlp1RBohnWQ/ufqc7ICaI0yjs04fNGhawm6+/HWhJFlcXn8MqOjWI9QGG2lQ==` |
| 2.0.10   | `htmx-2-0-10` | `sha512-kdeJe7ZVwaS6QMz/ebBIVtZdpwen6L0OQ5GOhPV9MKBb196TCZeZu4yA7ZIQsaLKv7EpXz+So7KSXNuHXhj7Cw==` |

The required stable mapping IDs are `htmx.swap.inner`, `htmx.swap.outer`, `htmx.swap.delete`,
`htmx.swap.adjacent`, `htmx.swap.oob`, `htmx.document.boost`, `htmx.history.restore`,
`htmx.swap.none`, and `htmx.request.error`. The imported overlap policy permits disjoint main and
out-of-band boundaries under distinct operation IDs and rejects active same, ancestor, or descendant
boundaries before begin. Preserved roots require connected, contained, same-document, unique old and
incoming IDs and post-mutation identity verification.

The boundary traces keep host distinctions explicit. `htmx:afterRequest` precedes
`htmx:afterSettle`. A delete swap emits cleanup and `afterRequest` without `afterSwap` or
`afterSettle`. `hx-swap="none"` can emit `afterSwap` without mutating the target. Valid preserved
inputs keep DOM and value identity, but the host can move focus to the activated control. Focus
remains htmx-owned.

### Activation evidence

- Tickets 0013, 0014, and 0016 are `done`.
- `quality/external-bridge-contract.json` has SHA-256
  `93099930bc6fb735c72d0bb2ab6f770c852a7a79dee23239f0245178bbc60c7f`, and its nine htmx mapping IDs
  are unique and match the required set.
- The manifest combines the explicitly injected capability with read-only `htmx.version`, rejects
  missing, unknown, prerelease, and out-of-range versions before listener registration, and freezes
  the exact range `>=2.0.0 <2.1.0`.
- `package-lock.json` resolves `htmx-2-0-0` and `htmx-2-0-10` to the imported package versions and
  registry integrities.
- `src/render-adapter.ts` has SHA-256
  `780f853e2728ec9a2e08a9aa0e08be44396f6fceb919c3639784498b916e0b53`, matching the manifest's
  approved public render API. `jquery-star/htmx` does not yet exist in package exports.
- `npm run ticket:validate -- --phase plan --ticket docs/tickets/0037-publish-htmx-bridge.md` passed
  before the status moved to `coding`.

### Scope

- Publish side-effect-free jquery-star/htmx with ticket-0013 declarations/formats. Importing it does
  not import/install htmx, inspect window.htmx, add document listeners, process existing content, or
  start a kernel. An explicit plugin factory receives the htmx capability and version evidence and
  installs transactionally into one kernel/document.
- Validate host/version/event capabilities before listener registration. Missing, unsupported,
  prerelease, ambiguous, or duplicate installation follows the frozen fail/warn/no-op policy and
  leaves no partial plugin/listener/correlation/operation.
- Implement every approved ticket-0016 mapping by stable ID: element/region swaps, boosted document
  navigation, all approved swap styles, multiple out-of-band boundaries, history save/restore,
  no-swap/no-content, canceled request/swap, response/network/swap/settle error, timeout/abort, and
  disconnected target. Never infer a DOM mutation solely from request intent.
- Correlate beforeSwap, cleanup, afterSwap, afterSettle, history, and error events as frozen by the
  actual trace. At the last reliable actual pre-mutation seam, open one render transaction; call
  beforeRemove for every true outgoing boundary while deduplicating nested cleanup events; let htmx
  perform one native swap; commit explicit incoming roots; await enhancement; and settle without
  synthesizing htmx events.
- A canceled/declined/no-swap response before cleanup leaves applications live and opens no stranded
  render operation. A failure after cleanup/mutation fails once, releases missing promised roots and
  correlations, reports partial mutation, and follows htmx's native error/fallback state without
  rolling back DOM or issuing/replaying a request.
- Convert valid hx-preserve candidates into exact old live root identities only after unique key,
  incoming match, same-document, connection, containment, target/swap, and actual-retention checks.
  Include core data-jqs-preserve under its own rules. Nested, duplicate, unmatched, moved,
  disconnected, out-of-bound, or promised-but-removed candidates clean deterministically.
- Model multi-boundary operations explicitly. One htmx request may produce a main swap plus approved
  out-of-band swaps, each with a separate public render transaction when boundaries are disjoint and
  independently mutated, or the exact grouped rule frozen by ticket 0016. Ancestor/descendant/same
  boundaries follow its join/queue/reject policy and cannot race ownership.
- Treat htmx cleanup callbacks as removal-boundary evidence, not one new jQStar operation per
  element. Nested application roots destroy deepest-first once; repeated cleanup/swap/settle/history
  events cannot duplicate application/directive/action/helper/effect/listener/observer/request/
  subscription/task/UI/plugin behavior.
- Leave htmx authoritative for request construction/headers, form serialization and submitter/
  validation, redirects, response handling, swap style/delay/settle, boosted navigation, history,
  focus/scroll, indicators, extensions, scripts, and DOM mutation. The bridge never calls ajax/
  trigger/process as a replacement renderer, changes swap targets/content, writes history/focus/
  scroll, retries, or dispatches synthetic lifecycle events.
- Explicitly decide htmx.process interaction after commit from ticket 0016's trace. If htmx already
  processes incoming content, the bridge does not call it. jQStar enhancement observes only explicit
  incoming data-jqs roots and cannot cause a second htmx initialization.
- Emit ticket-0010 redacted bridge observations with one operation ID/terminal result per approved
  mutation boundary, host/version, stable request/flow/swap/event IDs, phase/outcome, counts/timing,
  and disposal summary. Omit URL/query, hx headers, form values, request/response/HTML/error data,
  DOM, state, selectors, and history values.
- Prove coexistence with root/modular jQStar, behavior/declarative applications, generic JSON/HTML,
  official-SDK Datastar patches, UI document services/overlays, jQuery handlers, hx extensions only
  when explicitly in scope, native forms, focus, and preservation over repeated swaps/restorations.
- Dispose exactly once: stop new correlations, remove every public listener/hook, settle prepared/
  active records by the imported policy, release weak request/boundary records, and preserve htmx,
  kernel, other plugins, and applications not owned by the bridge. Disposal during swap/settle
  cannot strand htmx indicators or leave an unresolved jQStar barrier.

### Out of scope

- Reimplementing htmx requests, response processing, swap/settle, history, boosting, extensions,
  indicators, focus/scroll, form, script, or DOM behavior.
- Supporting untested versions, prereleases, arbitrary extensions/custom swaps, cross-document/
  shadow targets, or ambiguous hx-preserve behavior.
- Installing htmx/bridge from root/core/UI/Datastar, global auto-detection, or a fake common
  external navigation event API.

### Dependencies

- Tickets 0013, 0014, and 0016.

### Acceptance criteria

- [x] [AC-01] Activation pins and validates the exact ticket-0016 htmx package/range/checksum,
      detection/failure, event/flow/swap trace, preservation/overlap/multi-boundary, and public
      render contracts; stable mappings are total/unique and Plan validation passes before Code.
- [x] [AC-02] The exact tarball resolves jquery-star/htmx declarations and approved formats. Import
      is inert; explicit htmx/version/kernel installation validates before listener commit, is
      transactional/idempotent, and imports only declared public jQStar subpaths plus approved htmx.
- [x] [AC-03] Ordinary region, boosted document, every approved swap style, out-of-band, history,
      no-swap/no-content, cancel/abort/timeout, response/network/swap/settle error, and disconnected
      flow matches actual oldest/newest supported htmx traces in Chromium, Firefox, and WebKit.
- [x] [AC-04] Request/cancellable intent never destroys ownership. At the approved actual
      pre-mutation seam, all true outgoing boundaries call deduplicated beforeRemove before htmx's
      one native swap; explicit incoming roots commit afterward, enhancement settles in the frozen
      swap/settle order, and one operation terminal result closes.
- [x] [AC-05] Canceled/declined/no-swap pre-cleanup flows preserve live applications and strand no
      transaction. Post-cleanup/mutation failures fail once, release promised/missing roots and
      correlations, report partial state, and retain htmx native failure behavior without rollback,
      request replay, or replacement swap.
- [x] [AC-06] data-jqs-preserve and valid hx-preserve roots retain exact DOM/application/state/
      effect/listener/request/UI/value identity only under all frozen checks. Focus matches the host
      baseline without bridge writes. Duplicate, nested, unmatched, moved, disconnected,
      out-of-bound, and promised-but-removed cases clean deterministically.
- [x] [AC-07] Multiple nested cleanup events dedupe into actual removal boundaries and destroy
      applications deepest-first once. Main plus approved out-of-band and disjoint swaps use the
      exact grouped/separate operation policy; overlapping boundaries join/queue/reject without
      race.
- [x] [AC-08] Repeated swap/settle/process/restoration events create exactly one incoming jQStar
      enhancement and no duplicate application/action/directive/helper/effect/listener/observer/
      request/subscription/task/UI/plugin behavior; public disposal counts reconcile.
- [x] [AC-09] htmx remains authoritative for requests/headers/forms/redirects/responses/swap/delay/
      settle/boost/history/focus/scroll/indicator/extensions/scripts/mutation/events. Spies prove no
      second request, replay, ajax/process/trigger renderer, target/content rewrite, history/focus/
      scroll write, or synthetic host event.
- [ ] [AC-10] Root/modular, behavior/declarative, generic JSON/HTML, official-SDK Datastar, UI,
      jQuery, native GET/non-GET forms including validation/submitter/file, focus,
      JavaScript-disabled, and disposal coexistence pass across repeated region/boost/OOB/history
      flows.
- [x] [AC-11] Observations have exact boundary operation IDs/terminal outcomes and bounded
      host/flow/ swap/event/category/count/timing fields; URL/query, hx headers,
      form/request/response/HTML/error, DOM/state/selectors/history values never appear.
- [x] [AC-12] Missing/unknown/prerelease/out-of-range/ambiguous versions, duplicate installs, and
      unsupported swap/extension modes follow the frozen policy before partial commitment. Tests
      cover both supported range boundaries and never imply untested versions.
- [x] [AC-13] Disposal during idle/request/pre-swap/swap/settle/terminal states is idempotent, does
      not strand htmx indicators or jQStar barriers, and releases listeners/hooks/correlations/
      operations once without disposing htmx/kernel/other clients.
- [x] [AC-14] Root/core/UI/Datastar/CSP/testing packages exclude bridge/htmx code; exact package
      API/type/version/format/graph/size plus focused/coverage/property/static/three-browser/
      accessibility/package/release/check/ticket/diff gates pass without mutation testing.

### Design

One document-scoped plugin translates the frozen htmx mappings into public render transactions.
Short-lived correlation records use public request detail identity where stable and a bridge token
otherwise. They retain only stable IDs, phases, weak boundaries, preservation candidates, and public
transaction handles and are deleted at terminal state.

The adapter treats a request and its DOM mutations separately. A single request can produce zero,
one, or several approved mutation boundaries. Cleanup events feed deduplicated beforeRemove calls;
the host's own swap remains between remove and commit; afterSwap/afterSettle/history events supply
the mapped completion phases without becoming another mutation.

hx-preserve is translated at the boundary into exact old element identities. Core validates its own
invariants and final connectivity. The bridge never teaches core htmx selectors or event types.

### Decisions

- htmx is explicitly injected and optional; no global detection or automatic processing.
- Support is tied to actual version-boundary traces and exact swap categories.
- Requests are not mutations; destroy only at the final approved actual-swap boundary.
- Nested cleanup callbacks are deduplicated, while real disjoint OOB boundaries remain explicit.
- htmx owns request and DOM behavior; the bridge owns only jQStar lifecycle around actual mutation.
- Observations expose stable redacted categories, not raw htmx event detail.

### Security and accessibility

- Validate event targets, boundaries, incoming/preserved roots, and documents before changing jQStar
  ownership. The bridge does not make response HTML trusted or bypass htmx/host CSP, Trusted Types,
  sanitization, CSRF, origin, credentials, or redirect policy.
- Recorder and observations exclude sensitive URL/header/form/body/HTML/DOM/state/error details.
- Preserve htmx's keyboard/focus/native form/no-JavaScript behavior and ensure outgoing jQStar focus
  traps, overlays, listeners, and live-region ownership clean before actual removal.

### Risks

- htmx can emit cleanup per descendant. Correlate the actual swap and deduplicate boundaries rather
  than opening operations per event.
- Swap modes/OOB extensions have materially different boundaries. Freeze supported categories and
  reject or ignore unsupported extensions explicitly.
- afterSwap and afterSettle are not interchangeable. Use the actual trace for enhancement/barrier
  ordering and test delayed settle.
- History restoration can skip ordinary request events. Give it its own trace/mapping/correlation.
- Disposing mid-swap can strand UI/indicator state. Fault-test every phase and preserve host
  ownership.

### Verification plan

- Validate the imported manifest and generate total htmx flow/swap/event mapping coverage.
- Model/property-test request-versus-mutation, cleanup dedupe, multiple boundaries, overlap,
  preservation, cancel/error timing, delayed settle, observations, and disposal.
- Install exact oldest/newest approved htmx tarballs in isolated progressive multi-route consumers;
  establish native and unbridged baselines, then run bridge traces in all three browsers.
- Run every approved swap/OOB/boost/history/form/focus/accessibility/no-JavaScript/coexistence case,
  network/event/process spies, public disposal evidence, and package graph/size proof.
- Run focused/fast/coverage/property/static/browser/package/release/check/ticket/diff gates without
  mutation testing.

### Planned files

- htmx public plugin factory, manifest validator, event/request/mutation correlation, cleanup/
  preservation adapter, observation mapping, and disposal modules.
- Package exports/types/build/API/census/size/optional-peer configuration for jquery-star/htmx with
  exclusion from every other entrypoint.
- Exact htmx compatibility manifest/traces and shared progressive server fixture integration.
- Unit/property/model plus installed oldest/newest Chromium/Firefox/WebKit/accessibility tests.
- Public htmx installation/version/swap/preservation/ownership/troubleshooting docs,
  interoperability website page, project architecture/testing docs, and this ticket.

## Code

Owner 0016 extends the opt-in backend fixture and spec with `nested=1`; owner 0006 scopes plain
declarative application islands. The htmx inner request carries the mode while the outer region
application remains installed. The single-app route, public bridge API and supported version range
stay unchanged.

The September 17 refinement uses `Promise.allSettled` for captured disposal work, retaining
containment and the memoized frozen report. The shared bridge lifecycle and htmx suites pass within
the 238-case focused correction run. Current coverage, package and full delivery remain required;
the independent generic UI ownership finding is still open.

Root reopening Plan passed before selective integration on 2026-09-08. The six shared source, test
and guide files match the verified isolated correction. Normal root build and current quality
verification follow; the previous green delivery does not cover this correction.

The isolated correction memoizes disposal before settling captured work. Turbo reuses its existing
idle barrier for settling operations; htmx ends disposed commits without another host event and
closes already-completed adapters directly. Shared lifecycle tests cover direct/observer disposal,
terminal phase, repeated promise identity and delayed-renderer controls. The interoperability,
ownership and testing guides are updated. Public signatures and host-version boundaries are
unchanged.

### Changed-file ledger

| File                                         | Purpose                                                               |
| -------------------------------------------- | --------------------------------------------------------------------- |
| `docs/tickets/0037-publish-htmx-bridge.md`   | Track activation, design, files, commands, and evidence.              |
| `src/htmx.ts`                                | Publish the explicit document-scoped htmx lifecycle plugin.           |
| `test/htmx-bridge.test.ts`                   | Cover validation, lifecycle, preservation, OOB, errors, and disposal. |
| `test/property/htmx-bridge.property.test.ts` | Generate disjoint mutation and bounded request-only traces.           |
| `package.json`                               | Export the bridge and declare the optional htmx peer.                 |
| `package-lock.json`                          | Record optional htmx peer metadata.                                   |
| `vite.config.ts`                             | Build isolated ESM and CommonJS htmx bridge formats.                  |
| `scripts/build-types.mjs`                    | Roll up htmx declarations.                                            |
| `config/api-extractor.htmx.json`             | Define the htmx declaration and API report.                           |
| `config/tsconfig.api-extractor.json`         | Resolve the htmx subpath during API extraction.                       |
| `etc/jquery-star-htmx.api.md`                | Pin the reviewed public htmx API surface.                             |
| `config/quality-budgets.json`                | Set htmx artifact and installed-consumer size ceilings.               |
| `schema/quality-budgets.schema.json`         | Validate the htmx size ceilings.                                      |
| `quality/public-baseline.json`               | Add the isolated preview export, artifacts, and behavior tests.       |
| `test/public-baseline.test.ts`               | Account for the htmx package allowance.                               |
| `scripts/quality-package.mjs`                | Verify packed htmx exports, types, peers, graphs, and use.            |
| `scripts/smoke-package-files.mjs`            | Require every published htmx artifact.                                |
| `schema/package-report.schema.json`          | Validate htmx export, peer, and graph evidence.                       |
| `test/package-release-hardening.test.mjs`    | Keep package evidence-schema canaries current.                        |
| `test/jquery-ecosystem-contract.test.ts`     | Keep jQuery as the sole required peer with optional host peers.       |
| `.prettierignore`                            | Exclude the generated htmx API report from source formatting.         |
| `e2e/fixtures/htmx-bridge-bootstrap.js`      | Install the real-package bridge explicitly in the browser fixture.    |
| `e2e/fixtures/interoperability-server.mjs`   | Serve bridge assets and lifecycle-owned htmx response roots.          |
| `e2e/interoperability-baseline.spec.ts`      | Prove both htmx boundaries across Chromium, Firefox, and WebKit.      |
| `README.md`                                  | Document public htmx installation, ownership, preservation, and API.  |
| `docs/PROJECT.md`                            | Record the shipped entry, optional peer, and release shape.           |
| `docs/ARCHITECTURE.md`                       | Record the htmx event adapter and package isolation boundary.         |
| `docs/INTEROPERABILITY.md`                   | Publish exact mappings, limits, disposal, and troubleshooting.        |
| `docs/TESTING.md`                            | Record focused, property, browser, and package evidence.              |
| `example/docs/interoperability/index.html`   | Publish human-facing bridge installation and troubleshooting.         |
| `config/agent-content.json`                  | Update the reviewed interoperability guide and ownership invariant.   |
| `example/agent-content.generated.json`       | Regenerate the runtime agent corpus.                                  |
| `example/public/jqstar-agent-index.json`     | Regenerate the public machine-readable corpus.                        |
| `example/public/llms.txt`                    | Regenerate the short agent index.                                     |
| `example/public/llms-full.txt`               | Regenerate the bounded full-text corpus.                              |
| `test/fixtures/csp/conformance-map.json`     | Refresh README expression source locations after documentation edits. |

### Design changes

- The public factory is `createHtmxBridge({ $, htmx, version })`. It validates the injected public
  capability, exact explicit version, and read-only `htmx.version` synchronously without reading a
  global or calling any host method.
- The official `core.htmx` plugin stages only document event listeners. Request records retain the
  public XHR identity, weak DOM boundaries, frozen categories, and active transaction handles until
  one terminal event releases them. All runtime correlation stays on those already-active bubbling
  listeners; no listener is staged through the installation-only plugin host after activation.
- Confirmed built-in swaps begin a public render transaction at `htmx:beforeSwap`, but ownership is
  not released until the matching actual `htmx:beforeCleanupElement`. This preserves cancellation
  safety while capturing exact preservation roots before htmx relocates `hx-preserve` elements.
- Main and disjoint out-of-band swaps receive separate operation IDs. Same, ancestor, or descendant
  active boundaries cancel the later public swap event before a second transaction begins.
- `data-jqs-preserve` roots are moved only into their unique connected incoming placeholder during
  the host cleanup/swap seam. htmx remains responsible for all request, response, insertion,
  deletion, settle, history, focus, indicator, and processing behavior.
- Commit starts on `afterSwap` or delete `afterRequest` and closes only after both jQStar
  enhancement and the mapped htmx terminal event. Promise timing cannot relabel the terminal event.
- Unmatched `data-jqs-preserve` markers are excluded from the core transaction's automatic
  preservation snapshot, so only roots with unique connected incoming matches are promised.
- htmx 2.0.10 prepares cached history from `historyCacheHit`; htmx 2.0.0 omits that event, inserts
  cached content before cleanup, and therefore uses an armed `beforeHistorySave` plus first-cleanup
  fallback. Both paths close only at `historyRestore`.

## Test

Six nested htmx backend cases pass across 2.0.0/2.0.10 and Chromium, Firefox and WebKit. They check
isolated outer state, child-only request/action handling, preservation and outgoing child
destruction before native removal. The 24-case backend and 90-case combined host selections pass.
Named-component explicit boot and full common-matrix/delivery acceptance remain open.

The nested 2.0.0 no-bridge Chromium diagnostic renders but leaves its outgoing child live after
native removal. Full `npm run check` report `2026-09-23T13-35-36-553Z-47216/report.json` binds a
matching 932-file fingerprint and passes 1,702 browser cases across eight projects, 558 per desktop
engine. Coverage, three fixed package-size checks and package-budget detector isolation remain red;
no delivery receipt follows.

The opt-in generic JSON/HTML and official-SDK Datastar SSE selection passes both pinned htmx
versions in Chromium, Firefox and WebKit, six cases. The combined host selection passes 78 cases.
The 2.0.0 no-bridge Chromium diagnostic renders but fails outgoing application destruction before
native removal. AC-10 remains open for named-component explicit boot, async/error paths and the full
common matrix. The 931-file `npm run check` report `2026-09-23T12-24-53-903Z-32528/report.json`
passes all 1,690 browser cases, including these six htmx cases, but fails 96 changed-code coverage
checks, three fixed package sizes and package-budget detector isolation. There is no delivery
receipt.

The active Resizable pointer selection passes htmx 2.0.0 and 2.0.10 in Chromium, Firefox and WebKit,
six cases. The 66-case combined host selection passes. The 2.0.0 Chromium no-bridge diagnostic
renders but fails the before-native-disconnect listener/capture assertion. An incoming trusted drag
works and the preserved neighbor remains identical. Full delivery on this snapshot and the remaining
common coexistence matrix are still required for AC-10.

The 930-file `npm run check` report `2026-09-23T08-11-31-064Z-12902/report.json` passes all 1,678
browser cases, including these six htmx cases, but fails inherited changed-code coverage, three
fixed package-size limits and package-budget detector isolation. No delivery receipt follows.

The opt-in actual-host UI Countdown selection owned by 0016 passes 2.0.0 and 2.0.10 in Chromium,
Firefox and WebKit, six cases total. The matching no-bridge negative catches timer cleanup occurring
after native inner-swap removal despite a successful host swap. Incoming UI and the preserved
neighbor behave correctly in the positive selection. The ordinary host baseline passes 30 combined
Turbo/htmx cases. The exact 928-file delivery run `2026-09-23T05-27-52-448Z-6211/report.json` passes
all 1,654 browser cases, including this selection, but fails inherited changed-code coverage, three
fixed package sizes and package-budget detector isolation. AC-10 remains open for the full common UI
and generic/Datastar matrix.

| Command                | Result | Evidence                                                                                                                                 |
| ---------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast` | Pass   | `2026-09-17T15-11-06-759Z-44572`: all six gates and all 2,035 cases pass. Actual Code validation passes before these phase/ledger edits. |

| Command                                                                    | Result | Evidence                                                                                                                                                                                           |
| -------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run check` / `quality:delivery`                                       | Pass   | `2026-09-08T17-27-26-764Z-47398/report.json`: all 13 gates, 1,950 unit tests, 487 browser cases, 13 package checks and seven release checks; matching 877-file fingerprint and authorized receipt. |
| `npm run ticket:validate -- --phase test` with this ticket and that report | Pass   | Executed before tracked edits; `bridge-test-0037.log`.                                                                                                                                             |

Current correction delivery passes coverage, properties, static checks, browser execution and
detector self-tests. Its fingerprint is
`f6e6ec7b3a6db152491b0806b13c356f3daf94ef18e67d07fe3030692a613725`. Earlier failures remain
recorded. The separate final source-pass UI batch is excluded from this run.

| Command                                                                    | Result | Evidence                                                                                                                                                                              |
| -------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                                                     | Pass   | `2026-09-08T17-24-34-188Z-34093/report.json`: all six gates and 1,950 unit tests on matching 877-file fingerprint `e0dbec97889fffe1524f635645c70f8be5ee970440b1b17700998d9e423924a5`. |
| `npm run ticket:validate -- --phase code` with this ticket and that report | Pass   | Actual command passed before tracked edits; `bridge-code-0037.log`.                                                                                                                   |

Current complete delivery follows. Both earlier fast failures are retained: the circular Mobile
phase requirement, then the removed assertion's obsolete allowance and one ticket spelling word. The
obsolete one-use allowance is deleted; no limit increases. Current full Test closure remains
required for this correction.

Fast `2026-09-08T17-16-43-355Z-7070` fails one of 1,950 unit cases: the Mobile migration test
requires these reopened bridge owners to be done before their verification can finish. All 1,949
other units and the five other gates pass. Owner 0040 reopens the contract test to verify its
completed navigation decision and current exports without conflating a correction phase with a
revoked approval. This failed report grants no Code or Test closure.

The final isolated bridge set passes 54 cases across four suites. The tenth case reproduces an extra
adapter-settlement error when a native host failure arrives from the htmx post-mutation observer;
the commit guard fixes it. Raw JSON coverage and the unchanged repository evaluator cover every
changed line and function in both bridge modules (`bridge-disposal-changed-coverage.json`). Current
test types and focused lint pass. ESM sizes are htmx 17,969 and Turbo 8,156 bytes against fixed
18,000/8,192 limits; CJS sizes also pass. Both affected API reports match after declaration build
and isolated API extraction. Earlier size, configuration, missing raw-report and API-directory
failures remain retained. Full normal root build and complete delivery remain required after
selective integration; these isolated checks grant no receipt.

Owner Plans pass before source edits, including the Turbo refinement to reuse its existing idle
barrier. `bridge-disposal-negative.log` records five failures and four controls across nine new
cases. `bridge-disposal-barrier-focused.log` passes all 53 cases across both bridges, render adapter
and new lifecycle tests. Test types pass with the repository's actual configuration; an initial
command named a nonexistent configuration and is retained in `bridge-disposal-types.log`. Focused
lint passed before the final Turbo barrier simplification; current lint/coverage/build and root
integration/fast/full verification remain required. All logs are under the current program-audit
resume directory. This isolated result grants no current root Test closure.

| Command                                                                                                                                                                                          | Result        | Evidence                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0037-publish-htmx-bridge.md`                                                                                                      | Pass          | Activation, imported manifest, mapping IDs, version boundaries, and design validated before Code.                                                                      |
| `npx vitest run test/htmx-bridge.test.ts`                                                                                                                                                        | Failed, 11/12 | Terminal observation used the commit promise's `afterSwap` label after `afterSettle`; correlation now stores host terminal.                                            |
| `npx vitest run test/htmx-bridge.test.ts && npm run typecheck`                                                                                                                                   | Pass          | Fourteen focused lifecycle tests, including unmatched preservation and both history traces, plus both TypeScript projects.                                             |
| `npx vitest run test/htmx-bridge.test.ts test/property/htmx-bridge.property.test.ts test/public-baseline.test.ts test/jquery-ecosystem-contract.test.ts test/package-release-hardening.test.mjs` | Pass, 39/39   | Focused, generated, baseline, optional-peer, API, and report-schema cases pass.                                                                                        |
| `npm run build`                                                                                                                                                                                  | Pass          | ESM, CommonJS, UMD, CSP, declarations, API reports, and CSS build; htmx is 17,996-byte ESM and 17,802-byte CommonJS.                                                   |
| `npm run quality:fast`                                                                                                                                                                           | Failed        | First run isolated source-format drift in the ticket and generated API report; no code, type, lint, or contract gate failed.                                           |
| `npm run quality:fast`                                                                                                                                                                           | Pass          | All fast gates passed in `.git/jqstar/runs/2026-09-04T12-25-58-621Z-48463/report.json`.                                                                                |
| `CI=1 npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-chromium --workers=1 --retries=0 --grep 'htmx bridge'`                                                         | Failed        | Actual 2.0.0 outer/history traces exposed unmatched-preservation and pre-inserted-history-root defects; both were fixed.                                               |
| Same Chromium command after fixes                                                                                                                                                                | Pass, 3/3     | Both supported htmx versions pass replacement/insertion/delete, OOB/errors/disposal, and form/boost/history scenarios.                                                 |
| `CI=1 npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-firefox --project=desktop-webkit --workers=1 --retries=0 --grep 'htmx bridge'`                                 | Pass, 6/6     | Both supported htmx versions pass the same bridge scenarios in Firefox and WebKit/Safari.                                                                              |
| `npm run test:package:quality`                                                                                                                                                                   | Pass          | Thirteen packed-package checks passed, including both formats, types, optional peer metadata, graph isolation, browsers, and size budgets.                             |
| `npm run quality:fast`                                                                                                                                                                           | Failed        | Run `2026-09-04T12-44-05-657Z-69675` passed every available lane; the local machine lacked the required external `actionlint` binary.                                  |
| `brew install actionlint && actionlint -version`                                                                                                                                                 | Pass          | Installed the workflow-pinned Homebrew `actionlint` 1.7.12 binary for the delivery environment.                                                                        |
| `npm run quality:fast`                                                                                                                                                                           | Pass          | Run `2026-09-04T12-45-57-235Z-78962` passed ticket workflow, runner self-test, formatting, unit, and static-fast lanes.                                                |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0037-publish-htmx-bridge.md --report .git/jqstar/latest-report.json`                                                              | Pass          | The complete code ledger and exact passing fast report authorized the `testing` transition.                                                                            |
| `npm run test:property`                                                                                                                                                                          | Pass, 36/36   | Seed `430043`; generated bridge, render, request, protocol, runtime, plugin, observation, CSP, and SSE properties passed.                                              |
| `npm run test:coverage`                                                                                                                                                                          | Failed        | The first changed-line run measured `src/htmx.ts` at 89.52% lines and identified unproved validation, cancellation, failure, and disposal paths.                       |
| `npx vitest run test/htmx-bridge.test.ts`                                                                                                                                                        | Pass, 20/20   | Added focused proof for malformed boundaries/selectors, duplicate/rootless swaps, OOB/history cancellation, preservation failures, error containment, and unsubscribe. |
| `npm run test:coverage`                                                                                                                                                                          | Pass          | Global coverage is 93.47% lines/83.31% branches/92.71% functions; `src/htmx.ts` is 100% lines/functions and 88.43% branches.                                           |
| `CI=1 npx playwright test e2e/interoperability-baseline.spec.ts --project=desktop-chromium --project=desktop-firefox --project=desktop-webkit --workers=1 --retries=0`                           | Pass, 30/30   | Full native, Turbo, unbridged htmx, and bridged htmx interoperability passed across Chromium, Firefox, and WebKit.                                                     |
| `npm run build`                                                                                                                                                                                  | Pass          | All JS/CSS/declaration/API builds pass; the reduced htmx artifacts are 17,523-byte ESM and 17,344-byte CommonJS.                                                       |
| `npm run quality:delivery`                                                                                                                                                                       | Failed        | Run `2026-09-04T13-57-06-054Z-37385` passed every lane except static delivery; Semgrep, gitleaks, and OSV-Scanner were absent from the local `PATH`.                   |
| `uv tool install 'semgrep==1.166.0' && brew install gitleaks osv-scanner`                                                                                                                        | Pass          | Installed the workflow-pinned Semgrep 1.166.0, gitleaks 8.30.1, and OSV-Scanner 2.5.1 analyzers.                                                                       |
| `npm run quality:static:delivery`                                                                                                                                                                | Pass          | All 29 static delivery analyzers and sabotage checks passed in `static-2026-09-04T14-09-18-787Z-69469`.                                                                |
| `npm run quality:delivery`                                                                                                                                                                       | Failed        | Run `2026-09-04T14-10-00-104Z-71927` passed every lane except formatting; the newly added ticket evidence rows needed Prettier normalization.                          |
| `npm run quality:delivery`                                                                                                                                                                       | Pass          | Run `2026-09-04T14-21-53-303Z-6305` passed all 12 delivery lanes with matching start/end fingerprints and wrote the delivery receipt.                                  |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0037-publish-htmx-bridge.md --report .git/jqstar/latest-report.json`                                                              | Pass          | The green exact-tree delivery receipt and enforced test lanes authorized the `documenting` transition.                                                                 |
| `npx vitest run test/agent-content.test.mjs test/site-structure.test.mjs test/public-baseline.test.ts test/csp-contract.test.ts`                                                                 | Failed, 17/18 | Agent corpus, site, and public baseline passed; CSP inventory detected stale README source line numbers after the new public example.                                  |
| `npm run csp:inventory`                                                                                                                                                                          | Pass          | Regenerated the five CSP contract artifacts; only the README locations in `conformance-map.json` changed.                                                              |
| `npx vitest run test/agent-content.test.mjs test/site-structure.test.mjs test/public-baseline.test.ts test/csp-contract.test.ts`                                                                 | Pass, 18/18   | Regenerated corpus, public route structure, package baseline, and refreshed CSP source inventory all pass.                                                             |
| `npm run lint:markdown && npm run lint:html`                                                                                                                                                     | Pass          | All 82 Markdown files and all example/registry HTML files pass their documentation validators.                                                                         |
| `npm run quality:fast`                                                                                                                                                                           | Pass          | Run `2026-09-04T14-37-34-231Z-40966` passed ticket workflow, runner self-test, formatting, unit, and static-fast lanes after documentation.                            |

### Inspection ledger

| Finding                                                                                                                   | Resolution                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Core automatically promised unmatched `data-jqs-preserve` roots, so an outer replacement could not commit.                | Mask unmatched markers only while opening the public render transaction, restore them synchronously, and promise only uniquely matched connected incoming roots.         |
| htmx 2.0.0 restores cached history without the newer `historyCacheHit` event and inserts new roots before cleanup.        | Arm the fallback at `beforeHistorySave`, begin at the first matching cleanup, exclude roots inside the transaction boundary from the old-root set, and close at restore. |
| A history operation could close at `afterSettle` before the required `historyRestore` terminal event.                     | Keep history operations open through settle and use `historyRestore` as their sole successful terminal event.                                                            |
| The package proof initially had no htmx-specific export, optional-peer, graph-isolation, and size evidence.               | Extend the package schema, negative canaries, artifact smoke test, installed consumers, and budgets while retaining jQuery as the only required peer.                    |
| The fast gate could not inspect workflows because the pinned external `actionlint` program was absent from the local Mac. | Install Homebrew `actionlint` 1.7.12, verify its version, and rerun the exact worktree to a green fast report.                                                           |
| Changed-line coverage found lifecycle branches that the happy-path and actual-browser matrices did not execute.           | Add adversarial public-event tests until every executable htmx bridge statement and function is covered without suppressions.                                            |
| Per-target listeners were requested from the staged plugin document host after activation, so they could never attach.    | Remove the dead listener path; correlate the same bubbling `afterSwap`/`afterSettle` events through the document listeners activated during installation.                |

## Document

INTEROPERABILITY, BACKEND, TESTING, PROGRAM_AUDIT and owner/umbrella tickets record this additional
nested htmx slice and its limits.

### Documentation changed

- `README.md` documents inert htmx bridge import, explicit installation, the exact supported range,
  host ownership, preservation, observations, the enhancement barrier, and disposal.
- `docs/INTEROPERABILITY.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, and `docs/TESTING.md`
  record the shipped preview, host-specific lifecycle seams, optional peer and package isolation,
  limits, troubleshooting, and verification evidence.
- `example/docs/interoperability/index.html` publishes the same installation, ownership,
  preservation, and troubleshooting guidance for people. `config/agent-content.json` and its four
  generated website outputs publish the same facts for agents.
- `test/fixtures/csp/conformance-map.json` refreshes README source locations without changing the
  finite-expression contract.

### Acceptance evidence

| Criterion | Result  | Evidence                                                                                                                                                                                                                           |
| --------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass    | Activation evidence pins manifest/render digests, aliases, integrity values, nine mapping IDs, prerequisites, version policy, and passing Plan validation.                                                                         |
| AC-02     | Pass    | `package.json`, generated declarations/API report, package smoke, and installed consumers prove inert ESM/CommonJS resolution, types, and explicit plugin installation.                                                            |
| AC-03     | Pass    | Actual htmx 2.0.0/2.0.10 fixtures pass every approved swap, OOB, boost, history, form, cancellation, no-content, and failure path in Chromium, Firefox, and WebKit.                                                                |
| AC-04     | Pass    | Focused lifecycle tests and actual host traces prove no cleanup at intent, cleanup at the true host seam, explicit incoming commit, enhancement, and one terminal result.                                                          |
| AC-05     | Pass    | Focused cancellation, no-swap, malformed boundary, host error, cleanup failure, commit failure, and lost-preservation tests prove phase-correct settlement without rollback or replay.                                             |
| AC-06     | Pass    | Unit and three-browser identity assertions cover valid, unmatched, duplicate, nested, moved, disconnected, and lost `data-jqs-preserve`/`hx-preserve` roots plus host-owned focus.                                                 |
| AC-07     | Pass    | Cleanup-dedupe tests, OOB browser cases, overlap rejection, and generated disjoint completion orders prove exact-once removal and distinct non-overlapping operations.                                                             |
| AC-08     | Pass    | Repeated actual swaps/restores assert one incoming application, exact outgoing destruction, preserved identity, and no duplicate owned behavior.                                                                                   |
| AC-09     | Pass    | Browser network/event assertions and public-method spies prove htmx retains request, form, redirect, history, focus, processing, event, and DOM authority.                                                                         |
| AC-10     | Pending | Current suites pass their covered flows, but the public Countdown timer probe contradicts the shared UI cleanup promise. Generic owner 0006/common contract 0016 correction and actual host matrix verification remain required.   |
| AC-11     | Pass    | Focused, generated, and browser assertions require exact phase/outcome IDs, separate boundary operations, a 256-record cap, frozen records, and sensitive-field omission.                                                          |
| AC-12     | Pass    | Factory/plugin tests reject missing or malformed capabilities, mismatched/malformed/prerelease/out-of-range versions, duplicates, unsupported swaps, and invalid targets before mutation.                                          |
| AC-13     | Pass    | Current shared disposal lifecycle cases and `2026-09-08T17-27-26-764Z-47398/report.json` prove memoized disposal, settled enhancement barriers, one terminal outcome, listener release and independent live host/kernel ownership. |
| AC-14     | Pass    | Current delivery `2026-09-08T17-27-26-764Z-47398` passes all 13 gates, including package/API/type/graph/size checks and both host boundary suites in three engines. No budget increases or mutation tooling.                       |

### Historical completion audit

Historical status: Complete

### Completion audit

The disposal correction has current full evidence. AC-10 remains open for the confirmed common UI
resource cleanup gap; this owner is not ready for Document closure.

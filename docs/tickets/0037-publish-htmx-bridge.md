---
id: 0037
title: Publish the htmx lifecycle bridge
status: planned
created: 2026-08-30
updated: 2026-09-02
---

# 0037: Publish the htmx lifecycle bridge

## Plan

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

- [ ] [AC-01] Activation pins and validates the exact ticket-0016 htmx package/range/checksum,
      detection/failure, event/flow/swap trace, preservation/overlap/multi-boundary, and public
      render contracts; stable mappings are total/unique and Plan validation passes before Code.
- [ ] [AC-02] The exact tarball resolves jquery-star/htmx declarations and approved formats. Import
      is inert; explicit htmx/version/kernel installation validates before listener commit, is
      transactional/idempotent, and imports only declared public jQStar subpaths plus approved htmx.
- [ ] [AC-03] Ordinary region, boosted document, every approved swap style, out-of-band, history,
      no-swap/no-content, cancel/abort/timeout, response/network/swap/settle error, and disconnected
      flow matches actual oldest/newest supported htmx traces in Chromium, Firefox, and WebKit.
- [ ] [AC-04] Request/cancellable intent never destroys ownership. At the approved actual
      pre-mutation seam, all true outgoing boundaries call deduplicated beforeRemove before htmx's
      one native swap; explicit incoming roots commit afterward, enhancement settles in the frozen
      swap/settle order, and one operation terminal result closes.
- [ ] [AC-05] Canceled/declined/no-swap pre-cleanup flows preserve live applications and strand no
      transaction. Post-cleanup/mutation failures fail once, release promised/missing roots and
      correlations, report partial state, and retain htmx native failure behavior without rollback,
      request replay, or replacement swap.
- [ ] [AC-06] data-jqs-preserve and valid hx-preserve roots retain exact DOM/application/state/
      effect/listener/request/UI/value identity only under all frozen checks. Focus matches the host
      baseline without bridge writes. Duplicate, nested, unmatched, moved, disconnected,
      out-of-bound, and promised-but-removed cases clean deterministically.
- [ ] [AC-07] Multiple nested cleanup events dedupe into actual removal boundaries and destroy
      applications deepest-first once. Main plus approved out-of-band and disjoint swaps use the
      exact grouped/separate operation policy; overlapping boundaries join/queue/reject without
      race.
- [ ] [AC-08] Repeated swap/settle/process/restoration events create exactly one incoming jQStar
      enhancement and no duplicate application/action/directive/helper/effect/listener/observer/
      request/subscription/task/UI/plugin behavior; public disposal counts reconcile.
- [ ] [AC-09] htmx remains authoritative for requests/headers/forms/redirects/responses/swap/delay/
      settle/boost/history/focus/scroll/indicator/extensions/scripts/mutation/events. Spies prove no
      second request, replay, ajax/process/trigger renderer, target/content rewrite, history/focus/
      scroll write, or synthetic host event.
- [ ] [AC-10] Root/modular, behavior/declarative, generic JSON/HTML, official-SDK Datastar, UI,
      jQuery, native GET/non-GET forms including validation/submitter/file, focus,
      JavaScript-disabled, and disposal coexistence pass across repeated region/boost/OOB/history
      flows.
- [ ] [AC-11] Observations have exact boundary operation IDs/terminal outcomes and bounded
      host/flow/ swap/event/category/count/timing fields; URL/query, hx headers,
      form/request/response/HTML/error, DOM/state/selectors/history values never appear.
- [ ] [AC-12] Missing/unknown/prerelease/out-of-range/ambiguous versions, duplicate installs, and
      unsupported swap/extension modes follow the frozen policy before partial commitment. Tests
      cover both supported range boundaries and never imply untested versions.
- [ ] [AC-13] Disposal during idle/request/pre-swap/swap/settle/terminal states is idempotent, does
      not strand htmx indicators or jQStar barriers, and releases listeners/hooks/correlations/
      operations once without disposing htmx/kernel/other clients.
- [ ] [AC-14] Root/core/UI/Datastar/CSP/testing packages exclude bridge/htmx code; exact package
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

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result  | Evidence                                 |
| --------- | ------- | ---------------------------------------- |
| _Not run_ | Planned | Verification commands are defined above. |

## Document

### Documentation changed

Pending.

### Acceptance evidence

Pending implementation.

### Completion audit

Pending.

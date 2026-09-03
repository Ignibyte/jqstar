---
id: 0028
title: Add matching navigation regions
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0028: Add matching navigation regions

## Plan

### Problem

Independent page regions need explicit response matching, targeting, lifecycle ownership, lazy
loading, fallback, focus, and history rules. Treating any CSS selector as a frame can replace the
wrong content and orphan nested applications. A response mismatch discovered after a write also
cannot be repaired by replaying the form.

### Current evidence

- Existing HTML patches can target selectors but do not define navigation ownership or response
  region matching.
- Ticket 0006 supplies nested application cleanup and render transactions.
- Ticket 0026 conditionally supplies document history, focus, and scroll semantics.
- Ticket 0027 supplies the only approved enhanced-write/no-replay contract. Region forms must reuse
  it rather than create a second serializer/request path.
- Server-rendered full documents can contain a matching region and still provide a complete no-JS
  fallback; arbitrary fragment-only protocols would weaken progressive enhancement.

### Activation gate

Do not start unless ticket 0026 establishes document navigation and ticket 0023 approved regions.
Ticket 0027 is additionally required before intercepting region forms. Import exact 0023 region/
history/lazy/fallback decisions and Plan-validate before Code; otherwise mark this ticket
`declined`.

### Scope

- Define `data-jqs-region="name"` with one safe ID grammar, uniqueness/containment rules, stable
  root semantics, and explicit target/whole-document/opt-out attributes. Never accept a CSS
  selector, untrusted computed path, or implicit document-wide matching.
- Eligible links/forms default to their nearest enclosing region, may name one existing compatible
  target region, or explicitly escape to document navigation. Resolve/validate target synchronously
  before claim and again before commit; competing nested/overlapping operations follow one queue/
  supersession rule.
- Reuse document GET/form eligibility, descriptors, middleware/final policy, redirects, no-write-
  replay, staged full-document parser, history, busy, observations, and disposal. A region adds
  metadata; it does not own a parallel request protocol.
- Require exactly one compatible response `data-jqs-region` with the requested name in the staged
  same-origin full document. Validate unique target/response, tag/component signature, nesting,
  limits, permanent roots, head-policy implications, and final URL before destroying current
  content.
- Keep the current region root/identity and morph its approved attributes/contents through one
  public render transaction. Destroy outgoing nested applications before mutation, preserve explicit
  roots, mount incoming roots once, and await enhancement; do not expose a patch coordinator/app
  map.
- Define mismatch escalation without another request: for an already fetched compatible full
  document, missing/duplicate/incompatible region may promote the same stage to the approved whole-
  document commit. Otherwise return a typed error. A dispatched write is never replayed.
- Extend the history envelope with bounded region name/action where approved, so advance/replace/pop
  can fetch fresh content and reproduce region versus document intent without DOM snapshots.
- Define focus/scroll: focus outside the changed region is retained; removed internal focus uses
  server autofocus/error then region heading/root fallback after enhancement; scrolling occurs only
  under approved target/history/explicit policy and yields to user interaction.
- Publish per-region `aria-busy`/state/error with exact cleanup and no global focus/disable
  behavior.
- Add optional one-shot eager/visibility loading from a same-origin GET source with explicit markup,
  fallback link/content, IntersectionObserver policy, retry/error, removal cancellation, and no
  prefetch/cache semantics. Missing observer follows the frozen eager/manual fallback.
- Emit bounded redacted region/lazy observations and release target records, observers, requests,
  render transactions, history/busy state, and stages exactly once.

### Out of scope

- Client route definitions, arbitrary cross-document selectors, persistent caches, or transitions.
- Fragment-only server protocol, nested browsing contexts/shadow roots, streaming region commits,
  polling, automatic refresh, cross-origin targets, multiple-region atomic commit, or hiding missing
  response regions with client templates.

### Dependencies

- Tickets 0026 and 0027 and the ticket-0023 approval.

### Acceptance criteria

- [ ] [AC-01] Activation links 0023's approved region/lazy contract and 0026/0027 behavior into a
      revalidated Plan; otherwise the ticket is `declined` with no attributes/runtime/docs claim.
- [ ] [AC-02] Region/target names follow one bounded safe grammar and are unique in the live/staged
      document. Empty/magic/duplicate/nested-recursive/wrong-document/incompatible roots fail before
      mutation; matching uses exact marker value, never CSS selector interpretation.
- [ ] [AC-03] Pure targeting resolves nearest region, explicit named region, document escape, and
      nearest opt-out for links/forms before claim. Missing/disconnected/foreign/competing targets
      retain native behavior; document eligibility/form successful-control semantics stay unchanged.
- [ ] [AC-04] Region requests use the existing immutable GET/POST descriptor, middleware/final
      policy, manual redirects, cancellation, staging, and no-write-replay exactly once with bounded
      region metadata. No second fetch/parser/form serializer/profile is introduced.
- [ ] [AC-05] A response commits only one exact compatible matching region from a same-origin staged
      full document after unique/tag/component/nesting/size/head/final-URL validation. Redirected,
      missing, duplicate, incompatible, and wrong-name responses follow the frozen escalation/error
      table before region mutation.
- [ ] [AC-06] Eligible mismatch escalation reuses the same already fetched staged document for one
      whole-document commit and never repeats GET unnecessarily or replays a write. If escalation is
      unsafe/unavailable, current region remains usable and a typed error/recovery path is shown.
- [ ] [AC-07] The stable live region root retains identity; one render transaction reconciles
      allowed root attributes/content, destroys outgoing nested apps deepest-first, preserves only
      validated roots, mounts incoming apps/directives/UI once, and resolves after enhancement with
      no duplicate resources.
- [ ] [AC-08] Disjoint region operations may coexist with distinct IDs; same/ancestor/descendant
      targets use the frozen reject/queue/supersede policy. Late responses cannot mutate removed,
      retargeted, or newer regions/history/busy state.
- [ ] [AC-09] Region history records only bounded name/action metadata and fresh-fetches on
      popstate; URL/title/head policy remains consistent. Missing restoration target
      escalates/reloads under the document policy rather than recreating a region from cached DOM.
- [ ] [AC-10] Focus outside remains unchanged; removed internal focus follows server
      error/autofocus/ heading/root fallback after enhancement; scroll follows explicit/history
      policy and user interruption. Busy/error state is region-scoped, announced once, and cleaned
      on every outcome.
- [ ] [AC-11] Lazy eager/visible sources are explicit, same-origin eligible GETs with useful
      fallback content/link. They load once per approved lifecycle, dedupe visibility callbacks,
      cancel on removal/disposal, expose retry/error, and create no prefetch cache/background
      polling/layout- shift guarantee. Observer absence follows exact fallback.
- [ ] [AC-12] JavaScript-disabled links/forms/lazy fallback perform ordinary full server navigation
      with useful content and identical validation/write authority. Enhanced writes retain the 0027
      post-dispatch indeterminate/no-replay boundary.
- [ ] [AC-13] Observations/disposal contain operation/visit/render IDs, bounded region/flow/phase/
      count/timing/outcome only; omit URLs/query, form data/files, HTML, response data, region
      content, focus key, DOM/apps/observers/controllers. Every owned
      record/listener/observer/task/stage/ transaction releases once.
- [ ] [AC-14] Chromium/Firefox/WebKit/no-JS cover targeting/escape/nesting/overlap, response
      mismatch/ redirect/escalation, GET/forms/no replay, preservation,
      history/focus/scroll/busy/errors, lazy/ removal/retry/accessibility.
      Installed/API/package/graph/size plus focused/coverage/property/
      static/browser/package/release/check/ticket/diff gates pass without mutation testing.

### Design

Region roots are stable containers. Exact marker names identify them; optional DOM `id` remains an
accessibility/link target but is not the navigation key unless the contract requires equality. A
target record owns the current generation, visit/stage, history intent, busy state, and render
transaction while leaving request/document machinery shared.

Response extraction queries only the exact marker through bounded traversal and validates one match.
The commit morphs root attributes from an allowlist and children while retaining the live root. If a
full document cannot safely satisfy the region contract, promotion consumes that same single-use
stage through 0025/0026.

Nested operation correlation is per live boundary. Disjoint regions can proceed; overlap follows one
deterministic policy so an outer commit cannot orphan an inner request. Lazy loading creates the
same GET region operation only when its explicit trigger fires and owns one IntersectionObserver
record.

### Decisions

- Exact safe names, never arbitrary selectors, identify regions.
- Server returns complete useful documents containing regions; no-JS remains first-class.
- Keep current region root identity and replace its contents/approved attributes.
- Reuse document/form request, staging, commit, history, and no-replay contracts.
- Mismatch may promote the same stage to document commit; never issue/replay a request just to
  recover.
- Lazy loading is one-shot enhancement, not prefetching/caching/polling.

### Security and accessibility

- Names/targets/response roots are bounded same-document data and never evaluated as selectors/code.
  HTML retains the existing trust/CSP/Trusted Types/server policy.
- Region observations redact content/URLs/forms/focus. Cross-origin redirects and writes remain
  under prior final policies.
- Semantic landmarks/headings, focus/error/live-region behavior, native forms, keyboard, reduced
  motion, forced colors, zoom/reflow, and fallback links/content are browser-tested.

### Risks

- Variable nested regions can create ambiguous ownership. Reject duplicate/recursive targets and
  document outer-to-inner commit rules.
- Lazy loading can create layout shifts. Require placeholder dimensions only in UI guidance, not
  core.
- A missing region after a write can tempt replay; reuse the staged full document or show recovery.
- Outer/inner races can detach a pending target; generation/connection checks must settle without
  mutation.
- Target root replacement loses stable handlers/focus; retain root and reconcile bounded attributes.

### Verification plan

- Revalidate activation and exact region/mismatch/history/lazy tables before implementation.
- Add table/property/model tests for names/targets/extraction, overlap/generations, escalation,
  render ownership, history/focus/busy, lazy observer/removal, errors/disposal/redaction.
- Run real Chromium/Firefox/WebKit/no-JS route/form/region/nesting/mismatch/lazy/accessibility flows
  and existing document/bridge/patch regressions.
- Pack/install/inspect formats/types/API/package/graphs/size/exclusion.
- Run focused/fast/coverage/property/static/browser/package/release/check/ticket/diff gates without
  mutation testing.

### Planned files

- `src/navigation/{regions,region-target,region-commit,lazy-region}.ts` and types: Identity,
  targeting, extraction/escalation, render/history/focus/busy, lazy lifecycle, observations/cleanup.
- Navigation link/form/stage/commit/history integration using existing contracts only.
- Region schema/fixtures, unit/property/model suites, deterministic routes, and three-browser/no-JS
  specs.
- Package/API/consumer/census/size evidence for optional navigation.
- README, architecture/interoperability/ownership/testing/accessibility website docs and this
  ticket.

## Code

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result      | Evidence                                         |
| --------- | ----------- | ------------------------------------------------ |
| _Not run_ | Conditional | Waiting for navigation approval and ticket 0026. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

---
id: 0025
title: Commit documents and reconcile the head
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0025: Commit documents and reconcile the head

## Plan

### Problem

Rendering a fetched document requires application-aware teardown and an explicit policy for title,
metadata, styles, scripts, base URLs, CSP nonces, CSRF metadata, and permanent roots. Body morphing
alone is not a safe document commit. Any incompatibility discoverable before mutation must trigger
full native navigation before jQStar destroys the current applications.

### Current evidence

- Ticket 0006 supplies application-aware render transactions and an enhancement barrier.
- Ticket 0024 supplies staged parsed documents without DOM or history mutation.
- Current `patchElements()` morphs scoped HTML but does not reconcile a document head.
- Ticket 0013's public render adapter supports multiple removal boundaries and exact external
  preservation identities; native navigation must use it rather than private application maps.
- A fetch response's CSP headers/nonces do not become the active document policy. Copying a response
  nonce or executing newly fetched script under the old document can create false security.

### Activation gate

Do not start unless ticket 0024 delivers staged eligible GET visits. Import ticket 0023's approved
head/script/permanence/fallback policy and Plan-validate exact tables before Code. If document
navigation was declined, mark this and dependents `declined` with no residue.

### Scope

- Build an immutable head/body commit plan from a claimed 0024 stage and revalidate stage ownership,
  final URL/origin, document shape/limits, current document identity, and visit generation.
- Validate the complete head policy before application teardown: html language/direction, title,
  charset/viewport, allowlisted metadata/links, CSRF metadata, base URL, meta refresh, CSP/referrer
  policy, styles/style blocks, executable/non-executable scripts, tracked assets, integrity/
  crossorigin/referrerpolicy/media, duplicates, and unsupported nodes.
- Define asset identity and `data-jqs-track="reload"`. Any changed tracked asset, `<base>`, CSP/
  refresh policy, incompatible executable script, failed required stylesheet, or unsupported head
  transition performs approved full GET fallback before body commit.
- Retain compatible existing script/style/link nodes by identity. Do not execute new body scripts,
  execute moved scripts again, copy response nonces, or synthesize inline/module/classic execution.
  Pages requiring different executable assets use full native navigation.
- Stage/load any approved new stylesheet before body mutation, await success with timeout/integrity
  behavior, and roll it back if planning fails. Apply/removal order prevents a flash or premature
  loss of current styles.
- Match `data-jqs-preserve` permanent roots only when old/incoming elements have the same unique ID,
  marker, same-document ownership, compatible element/component signature, and unambiguous nesting.
  Pass exact old live identities to the public render transaction; unmatched/duplicate/incompatible
  roots are destroyed.
- Morph/replace the body through one render transaction, destroy outgoing nested roots deepest-first
  before mutation, preserve only approved identities, apply incoming server control state outside
  preserved roots, mount explicit incoming roots once, then await enhancement.
- Apply safe title/html/meta/link/CSRF changes in a specified order and remove obsolete approved
  head nodes only after required replacements are ready. Never expose a mixed plan as successful.
- Define failures before teardown, during stylesheet staging, during body mutation, during head
  application, and during enhancement. Pre-mutation failure leaves the current document untouched;
  post-mutation failure records partial state then transfers to approved full GET rather than
  pretending rollback.
- Publish redacted plan/commit/fallback observations and ensure all staged nodes, asset listeners,
  render transactions, preserved-root claims, and temporary head nodes release exactly once.

### Out of scope

- Browser history, scroll restoration, forms, regions, prefetching, or transitions.
- Client routes, arbitrary head selectors, script loader/runtime, nonce generation, CSP replacement,
  asset bundling, sanitization, or preserving authorization-sensitive content by default.

### Dependencies

- Ticket 0024.

### Acceptance criteria

- [ ] [AC-01] Activation imports the exact approved 0023/0024 head/body/permanence/fallback tables,
      limits, and metrics into a revalidated Plan; otherwise this ticket is `declined` with no code.
- [ ] [AC-02] Planning claims one live stage and produces an immutable, single-use plan only after
      validating kernel/realm/visit generation, final URL/origin, one html/head/body, node/byte
      limits, and unchanged current-document fingerprint. Failure mutates nothing and releases
      stage.
- [ ] [AC-03] A schema-validated table gives retain/add/update/remove/reload/reject behavior and
      identity fields for title, html `lang`/`dir`, charset/viewport and allowlisted meta/link/CSRF,
      stylesheet/style, classic/module/non-executable scripts, tracked assets, `<base>`,
      CSP/referrer/ refresh, nonce/integrity/crossorigin/referrerpolicy/media, duplicates, and
      unknown head nodes.
- [ ] [AC-04] Changed `data-jqs-track="reload"`, base/CSP/refresh, incompatible executable assets,
      unsupported head state, or required stylesheet failure transfers to approved native GET before
      destroying applications/body. No partial metadata or temporary asset remains.
- [ ] [AC-05] Compatible existing scripts/assets retain exact DOM/execution identity. New/moved body
      or head scripts never execute, existing scripts never execute again, response nonces are never
      copied, and no inline/module/classic code is synthesized; required executable changes reload.
- [ ] [AC-06] Approved new stylesheets are inserted/staged in deterministic order and awaited with
      load/error/timeout/integrity behavior before body mutation; obsolete styles remain until
      replacements are ready, then are removed exactly once. Failure restores the original head.
- [ ] [AC-07] Permanent roots require matching `data-jqs-preserve`, unique stable ID, incoming
      match, compatible tag/component/owner/document, containment, and actual retained identity.
      Duplicate/ nested/ambiguous/missing/incompatible/moved roots have deterministic
      destroy/fallback behavior and cannot preserve stale authorization-sensitive content
      implicitly.
- [ ] [AC-08] One public render transaction destroys every non-preserved outgoing nested application
      deepest-first before body mutation, deduplicates overlapping boundaries, preserves approved
      DOM/state/effects/listeners/requests/UI/focus/value identity, commits server state for
      ordinary controls, mounts incoming roots once, and awaits directive/UI/task/reactive
      enhancement.
- [ ] [AC-09] Safe title/html/head/CSRF changes apply in exact phases around body commit with no
      observer seeing a terminal mixed document. Final document URL remains history-owned by 0026;
      resolved URL attributes use the staged final/base plan without changing `<base>` in place.
- [ ] [AC-10] Pre-teardown failure leaves current document/apps/head usable. Post-teardown/mutation/
      enhancement failure settles cleanup and observations, never claims rollback, and transfers to
      the approved full GET while history remains uncommitted.
- [ ] [AC-11] Commit observations correlate visit/render IDs and bounded node/asset counts, phases,
      policy decisions, timing, and outcome only; they omit URL/query, metadata values, HTML/source,
      CSRF/nonces/integrity values, DOM/apps, focus/value, errors containing content, and callbacks.
- [ ] [AC-12] Releasing/canceling/disposing plan/commit removes staged/temp head nodes/listeners/
      timeouts, stages, preservation claims, transactions, and pending enhancement exactly once and
      produces complete public disposal evidence after failures.
- [ ] [AC-13] Existing JSON/HTML/Datastar patches and Turbo/htmx bridges retain their baselines;
      native document policy does not alter their render transactions, preservation markers, head,
      scripts, or package graphs.
- [ ] [AC-14] Chromium/Firefox/WebKit cover head table, assets/scripts/nonces/CSP/Trusted Types,
      nested/permanent roots, controls/focus identity, failures/fallbacks, and enhancement.
      Installed/ graph/size plus focused/coverage/property/static/browser/package/release,
      `npm run check`, and `git diff --check` pass without mutation testing.

### Design

`planDocumentCommit(stage)` is pure with respect to the live document except for reading a bounded
fingerprint and optionally staging approved styles through a later explicit prepare phase. It
classifies every incoming/current head node through the frozen table, matches assets by canonical
identity, computes safe metadata changes, permanent pairs, outgoing/incoming roots, and a reload
reason before ownership teardown.

`prepare()` loads approved new styles while old styles remain. `commit()` rechecks the fingerprint,
opens one public render transaction with exact preserved roots, releases outgoing body ownership,
morphs using navigation-specific server-authoritative control options, applies safe head metadata,
removes obsolete allowed assets, commits incoming roots, and awaits the barrier. Plans/stages are
single-use and terminal.

Executable asset policy is conservative: retain identity-compatible current scripts; otherwise full
reload. Fetched response nonces do not authorize execution under the active document policy. Inline
handlers/body scripts are not executed by jQStar, while server HTML remains subject to the current
page's CSP and trust boundary after insertion.

### Decisions

- Validate all reload/reject reasons before destroying applications whenever observable in advance.
- Use `data-jqs-preserve` plus unique ID and compatibility; do not add an implicit persistence rule.
- Retain compatible scripts; never dynamically execute changed scripts or copy fetched nonces.
- Treat base/CSP/meta-refresh/tracked executable changes as full-load boundaries.
- Server values win for non-preserved controls; permanent roots retain exact live state.
- There is no reliable rollback after body mutation; fail closed to a full GET and keep history
  uncommitted.

### Security and accessibility

- Head parsing/identity rejects duplicate/magic URLs and validates same-document schemes, integrity,
  crossorigin, referrer policy, and size. No response nonce/CSRF value enters diagnostics.
- Preservation is explicit and inappropriate for auth-sensitive content unless the host owns safe
  invalidation. Server auth/CSRF/CSP/Trusted Types/sanitization remain authoritative.
- Required styles load before visible body commit; failed commits cannot strand focus traps, busy
  UI, applications, or partially enhanced controls.
- Browser proof covers focus/value identity only for permanent roots, server control values
  elsewhere, keyboard/native controls, live regions, reduced motion, forced colors, and zoom/reflow.

### Risks

- Script policies can create security and duplication bugs. Default to retaining compatible existing
  assets and not executing new arbitrary body scripts unless the approved contract requires it.
- Permanent roots can hide changed server permissions. Preservation is explicit and cannot apply to
  authorization-sensitive content by default.
- Stylesheet loading can hang or flash; use bounded prepare with old styles retained and clean
  rollback.
- Current document can change between plan and commit; fingerprint and revalidate immediately before
  teardown.
- Morph failure cannot restore destroyed application closures; transfer to full GET rather than
  claim transactional DOM rollback.

### Verification plan

- Revalidate the activated Plan and machine-readable head table before implementation.
- Add table/property/state tests for every head-node/action combination, identities/duplicates,
  stage/fingerprint ownership, permanent matching, prepare rollback, commit ordering, failures, and
  disposal.
- Instrument Chromium/Firefox/WebKit for asset requests/execution counts, CSP/Trusted Types/nonces,
  stylesheet load/failure, base/refresh/reload, nested roots, controls/focus, enhancement, and full-
  GET fallback timing.
- Re-run existing patch/bridge matrices and installed formats/types/API/package/graph/size
  exclusion.
- Run focused, fast, coverage/property/static/three-browser/package/release/check/ticket/diff gates
  without mutation testing.

### Planned files

- `src/navigation/{commit,head-policy,permanence}.ts` and types: Immutable plan/prepare/commit
  state, head table/identity, assets/scripts/styles, permanent matching, failures, observations,
  cleanup.
- Public render adapter/patch integration only where navigation-specific multi-boundary/control
  semantics require it; no private application maps.
- Head policy schema/manifest and validation scripts; navigation unit/property/model/browser
  fixtures.
- Build/package/API/consumer/census/size reports for the existing optional navigation entry.
- README, architecture/interoperability/ownership/testing/security website guidance and this ticket.

## Code

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result      | Evidence                 |
| --------- | ----------- | ------------------------ |
| _Not run_ | Conditional | Waiting for ticket 0024. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

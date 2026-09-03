---
id: 0027
title: Enhance native forms without replaying writes
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0027: Enhance native forms without replaying writes

## Plan

### Problem

Form interception must preserve native validation, submitter values, encodings, methods, redirects,
credentials, and JavaScript-disabled behavior. Replaying a dispatched POST as fallback can perform a
write twice. Aborting fetch after dispatch also cannot prove that the server did not commit.

### Current evidence

- Existing backend form actions call native validity checks and serialize form values.
- Ticket 0026 conditionally supplies committed document visits and history behavior.
- Current navigation has no form/submitter eligibility or post-dispatch fallback contract.
- Browser form algorithms define successful controls, disabled fieldsets, submitter overrides, image
  coordinates, `formdata`, files, encodings, and native validation; hand-serializing controls would
  drift from the platform.
- Fetch does not provide portable upload progress and automatic redirect handling can replay a POST
  through 307/308. The supported write protocol must be narrower and explicit.

### Activation gate

Do not start unless ticket 0026 establishes stable document visits and restoration. Ticket 0023 must
separately approve forms. Import its exact method/encoding/redirect/failure/no- replay contract and
Plan-validate before Code; otherwise mark this ticket `declined` with ordinary native forms as the
supported path.

### Scope

- Define a pure submit/form/submitter eligibility matrix using explicit navigation scope, nearest
  opt-out, submit event that was not prevented, connected form/submitter ownership, native
  method/action/target/ enctype overrides, same origin, `_self`, dialog, supported
  controls/files/limits, competing navigation owner, and browser capability.
- Leave ineligible forms/events completely native. Use the real `SubmitEvent.submitter` and browser
  `FormData(form, submitter)`/`formdata` algorithm after native validation; do not scan controls or
  synthesize click events.
- Route eligible GET forms through 0024's normal GET descriptor/visit path with browser-equivalent
  successful-control query serialization, action query replacement/merge policy, fragment, and
  history intent.
- Support only ticket-0023-approved same-origin native write methods (initial contract: POST) and
  `application/x-www-form-urlencoded`/`multipart/form-data`; reject `text/plain`, method tunnels,
  cross-origin/alternate-target/dialog, and unsupported file/body cases to native behavior before
  claim.
- Preserve submitter `formaction`/`formmethod`/`formenctype`/`formtarget`/`formnovalidate`,
  name/value, image coordinates where exposed by the browser, successful controls, repeated names,
  empty values, Unicode, files, and CSRF fields. Never set a multipart Content-Type boundary
  manually.
- Build one immutable write descriptor and run middleware/final policy once. Core action/method/
  origin/encoding/body identity cannot be changed after event claim; pre-dispatch middleware failure
  sends no write and surfaces a retryable form error rather than attempting an unsafe native replay.
- Dispatch writes with same-origin credentials and manual redirect policy. Follow only an approved
  same-origin safe GET redirect (normally 303) as a new linked GET visit without resending the body;
  never automatically follow/replay 307/308 or an unsafe/cross-origin redirect.
- Accept approved validation HTML (for example 422) for a document commit without creating a new
  write/history entry, then focus/announce the server error summary. Successful writes require the
  approved canonical HTML or safe GET redirect contract; server validation/version/auth remain
  authoritative.
- Define pre-dispatch cancel, dispatched pending, success, validation, conflict, failure, and
  post-dispatch indeterminate cancel/network/parse/commit outcomes. After dispatch, never native-
  submit, retry, or replay; provide an explicit safe GET recovery/reload link/command where known.
- Prevent duplicate submission for the same form while a write is dispatched without globally
  disabling controls or aborting another write as if rollback. Integrate busy/progress/focus/history
  and application lifecycle with exact ownership/disposal.
- Emit redacted observations that never serialize field names/values, files, bodies, CSRF/auth,
  action query, validation content, or DOM.

### Out of scope

- Owning CSRF/auth policy, background upload resume, offline write queues, or arbitrary method
  tunnels.
- Upload progress/streaming, automatic write retry, 307/308 body replay, cross-origin writes,
  `text/plain`, programmatic `form.submit()` interception, client validation rules, autosave, or
  serializing forms outside the browser algorithm.

### Dependencies

- Ticket 0026.

### Acceptance criteria

- [ ] [AC-01] Activation links 0023's approved forms/no-replay contract and exact limits/metrics
      into a revalidated Plan; otherwise ordinary forms remain supported and no form runtime ships.
- [ ] [AC-02] Pure eligibility returns stable reasons for scope/event/form/submitter/method/action/
      origin/target/enctype/dialog/validation/files/limits/competing-owner/capability without event
      or form mutation. Ineligible forms retain exact native behavior and dispatch no jQStar
      operation.
- [ ] [AC-03] Native invalid forms use browser constraint UI and dispatch no submit/write.
      `novalidate` and submitter `formnovalidate` match browser behavior; jQStar adds no client
      validation rules or duplicate announcements.
- [ ] [AC-04] Eligible GET forms use the browser's successful controls and exact submitter
      overrides, repeated/empty/Unicode names, check/radio/select/textarea/file/image behavior,
      action query/ fragment rules, then enter one normal GET visit/history flow. No-JS produces
      equivalent server request semantics.
- [ ] [AC-05] Eligible POST descriptors preserve action, URL-encoded or multipart encoding,
      submitter name/value/overrides, successful controls, files/metadata, credentials/referrer, and
      body identity. Multipart boundaries come only from fetch/browser; bodies are never
      read/logged/ cloned after dispatch.
- [ ] [AC-06] Middleware runs once before dispatch and final policy forbids method/action origin/
      encoding/body changes or write-to-GET conversion. A failure/invalid change dispatches nothing,
      publishes a form error/retry state, and never tries a native resubmit that could rerun
      handlers or lose submitter semantics.
- [ ] [AC-07] Redirect handling is manual and typed. Only approved same-origin safe GET redirects
      create a linked GET visit; 307/308, cross-origin, missing/invalid location, loops, and write-
      preserving redirects never cause client body replay and follow the frozen error/recovery path.
- [ ] [AC-08] Validation/conflict HTML is committed under the approved status/URL/history policy,
      preserves server field/error content, focuses one valid error summary/field after enhancement,
      and announces once. Invalid/auth/conflict writes never become client-canonical state.
- [ ] [AC-09] After the dispatch boundary,
      abort/timeout/network/non-HTML/parse/head/commit/enhancement failure is `indeterminate` where
      server commit cannot be disproved. The operation never retries, native-submits, replays, or
      claims rollback; only an explicit safe GET recovery may follow.
- [ ] [AC-10] Same-form double submission while dispatched creates no second request; other form/
      navigation interactions follow the approved concurrency policy. Busy/progress/`aria-busy`
      cleans up on every result without globally disabling controls, losing submitter, trapping
      focus, or hiding native validation.
- [ ] [AC-11] Application/root/navigation/kernel disposal distinguishes before/after dispatch,
      aborts owned reads, removes listeners/tasks/busy state, handles late resolution, and never
      replays a write. Terminal reports attempt all cleanup and omit variables/body/DOM.
- [ ] [AC-12] Observations include operation/visit IDs, method category, encoding, byte/file counts,
      phase/status/redirect category/timing/outcome only; omit full URL/query, field names/values,
      filenames/content, bodies, CSRF/auth, response HTML/errors, form/submitter/DOM references.
- [ ] [AC-13] Chromium/Firefox/WebKit and no-JS cover native validation, every control/submitter/
      override, URL encoding/multipart/files, `formdata`, redirects, validation/conflict, double
      submit, abort/races/failures/no replay, focus/live regions, reduced motion/forced colors/zoom.
- [ ] [AC-14] Installed format/type/API/package/graph/size and focused/coverage/property/static/
      browser/package/release, `npm run check`, ticket validation, and `git diff --check` pass
      without mutation testing.

### Design

The delegated submit listener receives only events that the browser emits after native validation.
It computes final submitter overrides synchronously and claims only fully eligible forms. Form data
uses the realm's platform constructor with the actual submitter so successful controls and
`formdata` hooks remain authoritative.

GET conversion produces a visit URL and discards no native action fragment/query behavior under the
frozen table. POST encoding uses `URLSearchParams` conversion rules or the original `FormData`; file
limits inspect metadata only. One descriptor/controller/task owns dispatch and its exact line.

Redirect mode is manual. A 303-like approved response can yield one same-origin GET descriptor and
link the write operation to normal visit/commit/history. A validation response can commit returned
HTML in place. Anything that might require sending the body again becomes a terminal error or
indeterminate state.

### Decisions

- Eligibility is synchronous and complete before `preventDefault`; ineligible forms stay native.
- Browser validation/FormData/submitter algorithms are authoritative; do not hand-scan controls.
- Initial writes support only same-origin POST with URL-encoded or multipart bodies.
- Middleware cannot mutate core write identity after claim.
- No automatic write retry or 307/308 replay. Post-dispatch uncertainty is explicit.
- Server validation/auth/version/conflict/canonical HTML and PRG redirects remain authoritative.

### Security and accessibility

- Same origin and opt-in do not replace CSRF/auth/server validation. Middleware examples integrate
  framework tokens without jQStar owning them.
- Reports/errors omit fields/files/body/token/content. URL/redirect parsing is bounded and final
  policy rejects cross-origin/method-preserving replay.
- Native constraint validation, submitter semantics, focus/error summaries, keyboard, autofill,
  password managers, files, and no-JS are proven in actual browsers.

### Risks

- Browser FormData behavior includes submitter-specific edge cases. Use real browser assertions, not
  only jsdom.
- File uploads need progress and abort behavior. Ship only what the supported fetch/browser contract
  can prove.
- Async middleware failure after claim cannot safely resume native submit; surface a no-dispatch
  error instead.
- Aborted dispatched writes may commit remotely; mark indeterminate and reconcile with safe GET.
- Automatic redirects can replay POST; use manual response policy and never follow 307/308.

### Verification plan

- Revalidate activated forms policy before implementation.
- Add eligibility/descriptor/state property/model tests for controls, overrides, encodings,
  middleware, redirects, dispatch line, cancellation/races, validation/conflict, no replay, and
  disposal.
- Run real Chromium/Firefox/WebKit/no-JS server-capture matrices for browser FormData/validation/
  files/redirects/failures/focus/accessibility.
- Pack/install/inspect formats/types/API/package/graphs/size/exclusion and existing
  GET/history/bridge regressions.
- Run focused/fast/coverage/property/static/browser/package/release/check/ticket/diff gates without
  mutation testing.

### Planned files

- `src/navigation/{forms,form-eligibility,form-request,form-result}.ts` and types: Predicate,
  platform serialization, write state/dispatch/redirect/no-replay, busy/focus, observations/cleanup.
- Request middleware/final policy and navigation commit/history integration for approved write/GET
  result categories only.
- Form contract schema/fixtures, unit/property/model suites, and three-browser/no-JS server
  captures.
- Package/API/consumer/census/size reports for the optional navigation entry.
- README, backend/security/interoperability/accessibility/testing docs, website guide, and this
  ticket.

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
| _Not run_ | Conditional | Waiting for ticket 0026. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

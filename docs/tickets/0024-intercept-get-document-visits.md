---
id: 0024
title: Intercept eligible GET document visits
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0024: Intercept eligible GET document visits

## Plan

### Problem

If ticket 0023 approves native navigation, the first implementation must centralize browser
eligibility and request ownership before it changes the document or history. Preventing a click too
early breaks native behavior; dispatching before final middleware validation can fetch an unsafe or
unsupported target.

### Current evidence

- Ticket 0023 owns the native-navigation decision and browser fixture.
- Ticket 0011 provides one middleware stage plus final descriptor validation; tickets 0010, 0013,
  and 0014 provide operation observations, optional plugin/package ownership, disposal, and
  installed testing.
- No current API owns document visits, supersession, or navigation eligibility.
- Existing backend actions consume application JSON/HTML/Datastar responses, not complete documents;
  they do not define redirect, content, parser, staging, or browser-fallback semantics.

### Activation gate

Do not start unless ticket 0023 approves native navigation and freezes the eligibility/fallback
contract for documents. Otherwise mark this and dependent native-document tickets `declined` and
prove no navigation export/prototype residue. Import all decision-dependent limits/defaults/metrics
and Plan-validate again before Code.

### Scope

- Publish side-effect-free ESM/CommonJS `jquery-star/navigation` with matched types/maps, one
  immutable official plugin, typed facade/descriptors/staged results/errors, explicit scope/config,
  and no root auto-installation.
- Define a pure click/programmatic eligibility predicate with stable reason codes for explicit scope
  opt-in/nearest opt-out, event/button/modifiers/default prevention, connected anchor/editable
  context, href/scheme/origin, target/rel/download/ping, same-page fragments, competing navigation
  markers, browser capability, and unsupported topology.
- Never prevent or alter an ineligible event. Claim an eligible bubbling click exactly once, run
  middleware/final policy, and transfer to the approved native fallback before dispatch if the final
  descriptor becomes ineligible.
- Define programmatic `visit()` without synthetic events, with caller signal, bounded metadata, and
  advance/replace intent reserved for later history work.
- Build immutable same-origin GET descriptors with credentials, HTML accept/referrer policy, no
  body, operation/visit IDs, and final validation after middleware. Middleware cannot turn a visit
  into a write, cross-origin commit, or unsupported credential/body/header request.
- Own one active document visit per facade. Latest eligible visit supersedes the older controller/
  reader and produces distinct staged, caller-canceled, superseded, fallback, incompatible,
  network-failed, and disposed terminal outcomes.
- Enforce redirect/status/final-origin/content-type/content-disposition/header/body/timeout limits.
  Never consume JSON, Datastar SSE, downloads, opaque/cross-origin responses, or no-content as a
  document.
- Parse compatible HTML into an inert same-realm single-owner staged result with final URL/status,
  bounded safe metadata, source size/hash, and one html/head/body. Parsing must make no subresource
  request, execute/upgrade code, enhance applications, or mutate live DOM/history/focus/scroll;
  accept a host Trusted Types capability where required.
- Leave title/head/assets/scripts/body/permanent-root policy to 0025. Define exact pre-dispatch
  native fallback and post-dispatch safe-GET fallback/error behavior from 0023; fallback is an
  explicit terminal browser transfer and may repeat only a GET under that approved policy.
- Emit redacted visit/request/stage observations and release listeners, controllers, readers,
  timeouts/tasks, staged documents, and operations exactly once.

### Out of scope

- Body/head commit, history, forms, regions, prefetching, or View Transitions.
- Default interception of all same-origin links.
- Routes, link prefetch/cache, asset/script/style loading, DOM morphing, progress/focus/scroll,
  writes/method tunnels, iframe/shadow-root ownership, or cross-origin commits.

### Dependencies

- Ticket 0023 approving native navigation.

### Acceptance criteria

- [ ] [AC-01] Activation links 0023's native-document decision, exact policy/limits/metrics, and a
      revalidated Plan; otherwise this track is `declined` with no export/type/dependency/sentinel.
- [ ] [AC-02] `jquery-star/navigation` publishes side-effect-free ESM/CommonJS, matched types/maps,
      one frozen plugin/facade and public eligibility/descriptor/stage/error types. Import performs
      no install, document/global/history access, listener, request, or route work.
- [ ] [AC-03] Pure click eligibility returns stable reasons for every combination of scope on/off,
      primary unmodified event that was not prevented, connected anchor/editable context,
      URL/scheme/origin, target/download/rel/ping, fragment, competing owner, topology, and feature
      support without event mutation or unrelated DOM traversal.
- [ ] [AC-04] Ineligible real/synthetic events retain exact native behavior and create no operation/
      request/error. Eligible events are claimed once across nested scopes/repeated installation;
      programmatic `visit()` validates directly and never fabricates an element/event.
- [ ] [AC-05] Click/programmatic paths produce the same final immutable GET descriptor. Middleware
      runs once and final policy revalidates method/origin/credentials/body/headers/URL/size;
      invalid changes dispatch no fetch and follow the correct original/final pre-dispatch fallback.
- [ ] [AC-06] Latest-wins supersession marks the old visit terminal before abort, releases its
      reader/task, prevents late publication, and is not a user error. Caller cancel, supersession,
      timeout, disposal, and network abort have distinct outcomes and no unhandled rejection.
- [ ] [AC-07] Fetch enforces exact credentials/redirect/accept/referrer plus response status,
      final-origin/URL, disposition/type/charset, header/body/decoded-size limits, and timeout
      before parse. Every incompatible/redirect/download/non-HTML/no-content/abort case follows its
      frozen fallback/failure policy.
- [ ] [AC-08] Compatible HTML yields one inert same-realm stage with bounded metadata/source hash
      and exactly one html/head/body. Browser instrumentation proves no script/module/handler
      execution, subresource fetch, custom-element upgrade, live DOM/history/location/focus/scroll
      mutation, enhancement, or CSP/Trusted Types bypass.
- [ ] [AC-09] A stage can be claimed or released once; release/cancel/dispose drops document/source
      references. Wrong kernel/realm/final URL/operation, reuse, and terminal access fail before any
      mutation.
- [ ] [AC-10] Staged success changes no body/title/head/history/location/focus/scroll. Approved
      fallback is a terminal browser transfer, not partial commit; any post-dispatch repeated GET
      and its user/server consequence are documented and counted.
- [ ] [AC-11] Observations correlate visit/request IDs and bounded flow/reason/status/redirect/
      content/byte/timing/outcome only, omitting full URLs/query, headers/credentials, HTML/source,
      bodies, DOM/events/stages/controllers.
- [ ] [AC-12] Plugin/kernel disposal removes click listeners and aborts/releases visits, readers,
      tasks/timeouts, stages, and observation resources exactly once while aggregating failures in
      the public terminal report.
- [ ] [AC-13] Chromium/Firefox/WebKit enabled and JavaScript-disabled matrices pass eligibility,
      native fallback, races, content/redirect/parser, and CSP/Trusted Types. Installed format/type/
      API/package/graph/size plus focused/coverage/property/static/browser/package/release,
      `npm run check`, and `git diff --check` pass without mutation testing.

### Design

`createNavigationPlugin(options)` freezes scope, fallback, limits, timeout, and Trusted Types
parsing capability. Installation adds one owned delegated click listener after commit and conflicts
deterministically with Turbo/htmx document ownership. Nearest explicit `data-jqs-nav="off"|"on"`
inside configured scope wins; absent opt-in is ineligible.

Eligibility normalizes only observable event/anchor data and does not rely on `isTrusted`.
Programmatic navigation uses `visit()`. An eligible click is prevented once and converted to an
initial descriptor; final policy after middleware forbids writes, cross-origin, body, and weakened
credential/content constraints.

Each visit owns generation/operation IDs, descriptors, controller, reader, timeout task, state, and
optional stage. Supersession sets terminal state before abort. Response processing validates before
bounded read; the reviewed realm parser is instrumented in real browsers for inertness. The detached
stage is never enhanced and is revalidated by 0025.

### Decisions

- Navigation is explicit, optional, route-free, and mutually exclusive with another document owner.
- Only unmodified primary `_self` same-origin HTTP(S) GET links in explicit scope are candidates.
- Eligibility runs before claim and final request eligibility runs after middleware.
- One active document visit uses latest-wins supersession; cancellation is not an error.
- Staging is inert, single-use, and performs no commit/history/focus/scroll work.
- Native fallback is a visible terminal browser transfer; this ticket can never replay a write.

### Security and accessibility

- Scheme/origin/credentials/body/redirect/content/size checks fail closed. Middleware cannot change
  a visit into a write or cross-origin commit.
- HTML parsing uses a compatible host Trusted Types capability where enforced and must prove no
  script/handler/custom-element/subresource action before commit.
- Same-origin HTML is not inherently trusted; CSP, sanitization, auth/authorization/CSRF, redirects,
  and response policy remain host/server responsibilities.
- Ineligible and no-JavaScript links keep native keyboard/context-menu/download/target/anchor
  behavior; this ticket adds no focus, scroll, busy, or announcement behavior.

### Risks

- Programmatic clicks and synthetic events differ from trusted user clicks. Define interception from
  observable event properties, not assumptions about event trust.
- GET endpoints can still have bad side effects. Fallback performs normal GET navigation but never
  retries silently beyond policy.
- Async middleware after event claim may require fallback; preserve approved URL/intent and never
  dispatch before final validation.
- Inert parser APIs can still fetch/upgrade in some engines; instrument real browsers and reject any
  path that does.
- Stages retain large graphs; enforce limits, generations, single ownership, and disposal.

### Verification plan

- After activation, import frozen 0023 inputs and validate this Plan before export/listener work.
- Add table/property/model tests for reason combinations, scope, URL/middleware normalization,
  descriptors, supersession/cancel/disposal, redirects/content/limits, parser/stage ownership, and
  fallback transitions.
- Instrument deterministic Chromium/Firefox/WebKit routes for native/enabled/no-JS clicks, keyboard/
  context behavior, streaming/abort, inertness, CSP/Trusted Types, and zero staged DOM/history work.
- Integrate middleware/final policy/observations/disposal/redaction and Turbo/htmx ownership
  conflict.
- Pack/install all formats/types/QUnit/browser consumers; inspect API/package/private paths/graphs/
  sentinels/raw+gzip and earlier-entry exclusion.
- Run focused, fast, coverage/property/static/three-browser/package/release, check, ticket
  validation, and diff checks without mutation testing.

### Planned files

- `src/navigation/{index,types,eligibility,visit,stage}.ts`: Official plugin/facade, pure reasons,
  descriptors, visit state, execution/content limits, inert stages, observations, and cleanup.
- Kernel/plugin/request/observation integration: Scope ownership, host conflicts, controllers/tasks,
  final policy, disposal, and operation correlation.
- Build/type/API config and package manifest/lock: `jquery-star/navigation` ESM/CommonJS,
  declarations/maps, exports/files, commands, and optional graph metadata.
- Navigation unit/property/model tests plus ticket-0023 routes and three-browser visit/CSP/Trusted-
  Types specs.
- Installed consumers/scripts, API reports, public baseline, production census, size budgets, and
  report schemas.
- README, architecture/project/interoperability/ownership/testing docs, website guide, and this
  ticket's phase/evidence ledger.

## Code

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result      | Evidence                          |
| --------- | ----------- | --------------------------------- |
| _Not run_ | Conditional | Waiting for ticket 0023 approval. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

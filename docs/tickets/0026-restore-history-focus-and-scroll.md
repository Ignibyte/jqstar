---
id: 0026
title: Restore history, focus, scroll, and busy state
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0026: Restore history, focus, scroll, and busy state

## Plan

### Problem

Fast document replacement is not browser-equivalent navigation without correct history ordering,
back/forward restoration, focus, scroll, anchors, titles, busy indication, progress, and failure
recovery. DOM, URL, title, and history state must never claim different visits after a race/failure.

### Current evidence

- Ticket 0025 conditionally supplies safe document commits.
- Current jQuery Star requests and patches do not own `history`, `popstate`, or scroll restoration.
- Ticket 0023 establishes the cross-browser navigation fixture.
- History state may already belong to application/host libraries; native navigation needs a
  collision-safe bounded namespace and a deterministic refusal/coexistence policy.
- Browser engines differ on `popstate`, native scroll restoration, hash scrolling, autofocus,
  bfcache/pageshow, and focus after DOM replacement, so jsdom is not authoritative.

### Activation gate

Do not start unless ticket 0025 safely commits staged documents. Import and revalidate ticket 0023's
approved history/focus/scroll/busy policy before Code; otherwise mark this and unapproved dependents
`declined` with no partial history owner.

### Scope

- Add coordinated advance/push, replace, reload-fallback, and popstate restoration flows with one
  generation/operation identity spanning visit, document commit, history, enhancement, focus, and
  scroll.
- Claim a versioned bounded history-state namespace without overwriting unrelated state. Detect
  primitive/oversized/colliding/foreign versions before interception and follow the approved native
  fallback/coexistence policy.
- Capture current entry URL/title, bounded scroll coordinates, and a stable focus key immediately
  before leaving. Use only unique element ID or explicit `data-jqs-focus-key`, never arbitrary
  stored selectors/HTML.
- Coordinate commit ordering: prepare fully; record current restoration state; mutate body/head;
  write push/replace URL and namespaced state before incoming enhancement observes `location`; await
  enhancement; then restore/select focus and scroll. Any failure uses the exact safe full-GET
  policy.
- Handle popstate's already-changed URL with a fresh staged GET (no snapshots), no additional push,
  target-entry validation, latest-pop wins, stored restoration, and native reload of the current
  target when recovery data/fetch/commit fails.
- Set `history.scrollRestoration="manual"` only while this plugin owns navigation; save/restore the
  prior value and handle pageshow/bfcache/reload without double commits/listeners.
- Define forward/replace/pop focus precedence and scroll behavior for explicit server focus,
  restored focus key, URL fragment, main-content fallback, top/current/stored coordinates, missing/
  hidden/inert/disabled targets, layout bounds, and user scrolling during a pending visit.
- Publish readonly reactive busy/progress state with delayed indeterminate progress, a configured
  main-region `aria-busy`, document state attributes, and exact cleanup after every terminal path.
  Never trap focus, announce percentages, or disable native controls globally.
- Define rapid visit/back/forward, cancel, supersession, history API exception, enhancement error,
  manual URL changes, same-page anchors, and disposal outcomes with bounded redacted observations.

### Out of scope

- Native form submission, named regions, persistent page snapshots, prefetching, or transitions.
- Client route tables, serialized DOM/app state, arbitrary focus selectors, scroll animation, view
  transitions, title announcement hacks, intercepting same-page anchors, or owning browser bfcache.

### Dependencies

- Ticket 0025.

### Acceptance criteria

- [ ] [AC-01] Activation imports the exact 0023/0025 history/focus/scroll/busy/failure contract and
      revalidates this Plan; otherwise the ticket is `declined` with no listener/state mutation.
- [ ] [AC-02] The navigation history envelope has fixed format/version/entry ID/URL/title/scroll/
      focus fields and byte/range limits, preserves unrelated object state exactly, and detects
      reserved-key collisions, foreign versions, primitive/hostile/accessor/oversized state without
      invoking getters or partially replacing history.
- [ ] [AC-03] Before leaving, the current entry records clamped finite scroll and only a unique safe
      `id`/`data-jqs-focus-key`; sensitive values/selectors/DOM are absent. Duplicate/disconnected/
      hidden/inert focus keys fall back deterministically.
- [ ] [AC-04] Advance/replace ordering is exactly prepare → capture current entry → body/head mutate
      → push/replace final URL+title state → incoming enhancement → focus → scroll → terminal.
      Incoming apps/actions observe the final `location`; no earlier phase publishes success.
- [ ] [AC-05] A history-write failure after DOM mutation cannot leave URL/title/body inconsistent:
      cleanup settles and approved `location.replace`/full GET takes ownership. Failure before body
      keeps the current entry/document usable and history unchanged except captured restoration.
- [ ] [AC-06] Popstate validates the already-current target state/URL, opens one replacement visit,
      never pushes, ignores superseded late results, commits the target document, and restores its
      metadata. Missing/foreign/corrupt state or fetch/commit failure reloads the browser's current
      target rather than guessing a history rollback.
- [ ] [AC-07] Rapid clicks, back/forward bursts, caller cancel, supersession, reload,
      pageshow/bfcache, manual history entries, and disposal cannot let stale generations overwrite
      body/head/title/ URL/state/focus/scroll or leave duplicate listeners/operations.
- [ ] [AC-08] `scrollRestoration` is set to manual only after successful ownership, prior value is
      retained/restored exactly, stored coordinates are clamped after layout, and user scroll after
      the defined interruption point cancels automatic restoration.
- [ ] [AC-09] Focus precedence for advance/replace/pop is schema-defined across approved server
      focus, stored key, fragment target, main heading/content fallback, and body. Focus occurs
      after enhancement, never targets hidden/inert/disabled/disconnected nodes, avoids unnecessary
      `tabindex`, and does not steal focus after user interaction.
- [ ] [AC-10] Fragment flows use decoded safe IDs/names, native-equivalent scroll and focus policy,
      fixed/sticky offset behavior from the approved contract, and missing-target fallback. Same-
      document fragments remain browser-owned and never create a fetched visit.
- [ ] [AC-11] Readonly busy state and delayed indeterminate progress have one visit owner;
      configured main `aria-busy`/document state attributes start/end in fixed order, short visits
      avoid flash, supersession transfers ownership, every terminal path removes them, and no focus
      trap/control blanket-disable/false percentage is introduced.
- [ ] [AC-12] Observations contain entry/visit/render IDs, action, phase, bounded route/focus-kind/
      scroll-category, timing, and outcome only; no full URL/query/history foreign state,
      coordinates precise enough to fingerprint, focus IDs, titles, DOM, or form/user data.
- [ ] [AC-13] Disposal removes popstate/pageshow/user-interruption listeners, timers/tasks, busy/
      progress attributes, restoration ownership, and active visits exactly once, restores prior
      scrollRestoration, and reports aggregate cleanup publicly.
- [ ] [AC-14] Chromium/Firefox/WebKit plus no-JS cover push/replace/pop/reload/bfcache, anchors,
      long-page scroll, focus precedence/user interruption, races/errors/history exceptions, busy/
      progress, reduced motion/forced colors/zoom. Existing bridge/patch behavior remains green.
- [ ] [AC-15] Installed/type/API/package/graph/size and focused/coverage/property/static/browser/
      package/release, `npm run check`, ticket validations, and `git diff --check` pass without
      mutation testing.

### Design

History state uses one reserved versioned property only when existing state is a safe ordinary data
record without collision; otherwise native fallback owns the visit. The envelope stores opaque entry
ID and bounded restoration metadata, never a document snapshot. Current entry capture uses
`replaceState`; advance uses `pushState`, replacement/pop completion uses `replaceState` as
specified.

Document commit gains an internal navigation coordinator phase between body/head mutation and
incoming enhancement so `location` is final before application code runs. This does not become a
general public render callback. If history mutation fails after DOM mutation, the coordinator marks
the operation failed and transfers through a full native GET.

Popstate is latest-wins and network-backed. Because the browser changes URL/history before the
event, failure recovery reloads that URL rather than pushing/going back. `scrollRestoration` remains
manual only during plugin ownership. Focus/scroll restoration waits for enhancement and bounded
layout turns, then stops if the user interacted.

Busy state is one reactive data-only facade plus state attributes on configured document/main roots.
Progress is indeterminate and delayed; it is styling/announcement input, not a request percentage.

### Decisions

- Store bounded restoration metadata, never page/app snapshots.
- Preserve unrelated safe history state; collide/fail to native rather than overwrite another owner.
- URL/history becomes final after DOM mutation but before incoming enhancement.
- Popstate fetches fresh content and reloads current target on failure; it never invents rollback.
- Focus and scroll run after enhancement and yield to user interaction.
- Same-page anchors remain native; View Transitions stay out.

### Security and accessibility

- History/focus/observation data excludes user values, DOM, arbitrary selectors, full URLs/query,
  and foreign state. All decoded keys/anchors are bounded and lookup-only.
- Cross-origin/current-URL mismatch fails through 0024 policy. History state is not trusted input
  for fetch authorization or commit.
- Focus, busy, and progress follow WAI/browser behavior, do not trap/blanket-disable, honor reduced
  motion, and are proven with keyboard, screen-reader semantics, forced colors, and zoom.

### Risks

- Browser scroll restoration differs by engine. Set manual restoration only for the duration and
  paths jQuery Star owns.
- Focus restoration can target removed or hidden nodes. Store stable selectors/IDs with safe
  fallback.
- History mutation can fail after body commit; use immediate native replacement recovery.
- Late layout/assets can shift restored scroll; bound the restoration phase and avoid claiming pixel
  permanence after unrelated late content.
- A user's click/scroll/focus during pending work can be overwritten; register explicit interaction
  cancellation and generation checks.

### Verification plan

- Revalidate activated policy before implementation.
- Add table/property/model tests for envelope/state collisions/limits, ordering, generations,
  push/replace/pop failures, focus/scroll precedence, user interruption, busy/progress, and cleanup.
- Run actual multi-route Chromium/Firefox/WebKit/no-JS/bfcache/history/focus/scroll/accessibility
  matrices with deterministic failures/races and existing patch/bridge regression.
- Pack/install formats/types/QUnit/browser and inspect API/package/graphs/size/exclusion.
- Run focused, fast, coverage/property/static/browser/package/release/check/ticket/diff gates
  without mutation testing.

### Planned files

- `src/navigation/{history,restoration,focus-scroll,busy,coordinator}.ts` and public types:
  Envelope, visit ordering, popstate, user interaction, focus/scroll, progress, observations,
  disposal.
- Document commit integration for the narrow post-mutation/pre-enhancement history phase.
- History contract schema/fixtures plus unit/property/model and three-browser multi-route tests.
- Package/API/consumer/census/size artifacts for the existing optional navigation entry.
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

| Command   | Result      | Evidence                 |
| --------- | ----------- | ------------------------ |
| _Not run_ | Conditional | Waiting for ticket 0025. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

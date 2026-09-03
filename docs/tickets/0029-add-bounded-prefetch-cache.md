---
id: 0029
title: Add a bounded navigation prefetch cache
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0029: Add a bounded navigation prefetch cache

## Plan

### Problem

Prefetching can reduce latency but can also execute unintended GETs, retain private HTML, ignore
HTTP cache directives, consume unbounded memory, reveal user intent, or display stale authenticated
content after identity changes.

### Current evidence

- Tickets 0024 and 0028 conditionally define eligible document and region GETs.
- No current jQuery Star cache owns fetched HTML or browser navigation responses.
- Ticket 0023 must approve prefetching as part of the native-navigation product decision.
- Ticket 0027 writes may invalidate prefetched reads, and ticket 0025 must revalidate head/body
  compatibility at use time; cached stage/DOM identity cannot bypass either boundary.
- Browser HTTP caches already own protocol semantics. A jQStar memory cache must remain a small
  navigation optimization and refuse ambiguous `Vary`, identity, or cache-control cases.

### Activation gate

Do not start unless tickets 0026 and 0028 ship stable document and region navigation and ticket 0023
approved prefetching. Import exact intent/budget/private-data/HTTP/revalidation metrics from 0023
and Plan-validate before Code. Otherwise mark this ticket `declined`; navigation remains correct
without prefetch.

### Scope

- Define explicit `data-jqs-prefetch` eager/intent/off policy within navigation scope plus
  programmatic prefetch. Reuse 0024/0028 final GET eligibility and reject writes, cross-origin,
  downloads, fragments, opt-outs, unsupported content/topology, competing owner, disabled
  data-saving policy, and candidates without useful native fallback.
- Implement delayed hover/focus intent with cancel-before-dispatch, eager enhancement with a bounded
  queue, per-page request/concurrency budget, target connection/generation checks, and no transient
  hover/focus storm. Do not prefetch on mere viewport presence or pointer movement by default.
- Deduplicate identical queued/in-flight/resident keys and let an actual visit promote/adopt an
  in-flight prefetch rather than issue a second request. Actual visits have priority and are never
  blocked behind speculative queue work.
- Cache bounded source bytes plus immutable validated response/request metadata—not parsed DOM,
  applications, stages, focus, or history. Reparse into a new single-use stage and rerun all current
  document/region/head/permanence validation at use time.
- Define canonical key inputs: final validated URL without fragment, document/region kind and region
  name, credentials mode, approved representation headers, and an opaque caller identity epoch where
  private/credentialed caching is allowed. Never log raw key/header/identity values.
- Respect request/response `Cache-Control` (`no-store` always refuses), status/content/disposition/
  redirects, `Vary` (`*` or unkeyed fields refuse), validators, freshness/age, configured maximum
  age, and approved private/auth policy. Do not claim to replace the browser HTTP cache.
- Support conditional stale revalidation with ETag/Last-Modified where approved; 304 refreshes
  metadata/source, 200 replaces after full validation, and errors follow stale-use/refetch policy
  frozen by 0023.
- Enforce per-entry bytes, total bytes, entry count, age, queue, concurrency, and request budget
  with deterministic LRU/expiry. Oversized responses are usable for the current visit but never
  cached.
- Define exact/prefix URL/region invalidation, clear on successful or indeterminate write under the
  approved policy, identity-epoch change, tracked asset/version change, logout signal, manual clear,
  and kernel disposal. Never retain across reload/process or persist to storage.
- Emit redacted hit/miss/join/stale/revalidate/store/refuse/evict/cancel/invalidate observations and
  public cache summary counts/bytes only; release intent listeners/timers, queue entries, readers,
  controllers, sources, and records exactly once.

### Out of scope

- Persistent offline pages, service workers, background writes, or normalized resource caching.
- Speculation Rules, DNS/preconnect, viewport prefetch, cross-tab sharing, Cache Storage, stale page
  snapshots/DOM, POST/form bodies, arbitrary request headers, or guaranteed offline behavior.

### Dependencies

- Tickets 0026 and 0028 plus the ticket-0023 approval.

### Acceptance criteria

- [ ] [AC-01] Activation links 0023's prefetch approval and exact intent/HTTP/private/budget/metrics
      contract into a revalidated Plan; otherwise no prefetch API/attribute/runtime ships.
- [ ] [AC-02] Pure eligibility reuses final navigation GET policy and returns stable reasons for
      eager/intent/off/programmatic, scope/target/document-region, URL/origin/fragment/download,
      credentials/private identity, data-saving, competing owner, browser capability, and budgets.
      Ineligible candidates create no timer/queue/request/observation side effect.
- [ ] [AC-03] Intent starts only after the approved hover/focus delay, cancels when all intent
      leaves before dispatch, dedupes repeated/nested events, and respects connection/generation.
      Eager work enters a bounded priority queue; actual visits cancel delay/promote queue/adopt
      in-flight work and never wait behind lower-priority speculation.
- [ ] [AC-04] Canonical keys include every approved response-varying input—fragment-free final URL,
      document/region/name, credentials, selected representation headers, opaque identity epoch—and
      reject ambiguous/unbounded/unkeyed `Vary`. Equality is deterministic; diagnostics use only a
      bounded hash/category.
- [ ] [AC-05] Request/final policy executes once and cache admission requires approved successful
      HTML/status/final same-origin URL/disposition/redirect plus `Cache-Control`. `no-store`,
      `Vary:*`, unapproved private/auth/identity, errors, non-HTML, downloads, cross-origin, writes,
      oversized/incomplete/aborted responses are never resident.
- [ ] [AC-06] Records retain bounded source bytes and immutable metadata only. No parsed document/
      stage/DOM/app/controller/history/focus/form data is cached. A hit creates a fresh single-use
      stage and reruns current parser, document/region/head/asset/permanence/generation validation;
      incompatibility falls through to current network/full-load policy.
- [ ] [AC-07] Entry/total-byte/count/age/queue/concurrency/request budgets have exact boundaries and
      deterministic LRU tie-breaking. Replacement updates byte accounting atomically; eviction/
      expiry never removes adopted active visit data or leaves source/controller/timer references.
- [ ] [AC-08] Freshness is the minimum of approved response directives and configured maximum.
      Conditional ETag/Last-Modified revalidation follows final policy; valid 304 updates metadata,
      valid 200 replaces, and failure uses the frozen stale/error rule without displaying an
      unvalidated or wrong-identity document.
- [ ] [AC-09] Private/credentialed entries require the approved explicit policy and opaque identity
      epoch; epoch change/logout/disposal clears them before another visit. Raw cookies/auth/header/
      identity/query/source never enter keys exposed publicly, reports, errors, or observations.
- [ ] [AC-10] Successful/indeterminate writes, explicit exact/prefix URL-region invalidation,
      tracked asset/version change, manual clear, and disposal evict the documented records in
      deterministic order. A write can never be served from/speculatively satisfied by this GET
      cache.
- [ ] [AC-11] Observations expose operation IDs, key hash, kind, cache phase/outcome, status
      category, bytes/age/counts/timing only; omit URL/query, request/response headers, validators,
      credentials/ identity, HTML/source, DOM/stage, and user intent target. Summary is bounded
      data-only counts.
- [ ] [AC-12] Disposal removes hover/focus listeners, delays, queues, readers/controllers/tasks,
      sources/records, identity hooks, and observations exactly once; active adopted visits retain
      only visit ownership and cleanup failures aggregate in the public report.
- [ ] [AC-13] Chromium/Firefox/WebKit prove explicit eager/intent timing/cancel/dedupe/promotion,
      budgets/LRU, cache controls/Vary/private identity, revalidation, writes/invalidation, region/
      document hits, current validation/fallback, request/latency improvement, accessibility/no-JS,
      and no stale cross-identity content.
- [ ] [AC-14] Installed/type/API/package/graph/size proves optional exclusion; focused/coverage/
      property/static/browser/package/release, `npm run check`, ticket validations, and
      `git diff --check` pass without mutation testing.

### Design

One navigation-owned `PrefetchCache` has a pending priority queue, in-flight records, and resident
LRU records. It reuses the immutable final GET descriptor and response processor, tagging work as
speculative so actual navigation can adopt it. Record state/generation prevents a late prefetch from
replacing newer invalidation/identity/visit work.

Source strings/bytes are retained because parsed Documents can keep DOM/custom-element/global
graphs. On hit, the current parser creates a new stage and the complete current commit plan
validates again. Cache admission/lookup cannot bypass middleware final policy, content checks, head
asset version, region matching, or identity epoch.

HTTP policy is conservative: the cache honors explicit directives within its stricter configured
bounds, refuses unknown Vary dimensions, and uses validators only for conditional GET. It does not
merge browser cache state or infer cookie identity. Private caching requires an explicit host epoch
provider and is flushed when that value changes.

### Decisions

- Prefetch is opt-in, in-memory, GET-only, and independent of resource/persistence caches.
- Store source + metadata, never DOM/stages/apps.
- Actual visits outrank/adopt speculative work.
- `no-store` and ambiguous Vary/private identity always refuse admission.
- Every hit reruns current validation; cache freshness is not commit authority.
- No persistence, offline, cross-tab, viewport, or write behavior.

### Security and accessibility

- Prefetch can reveal intent/server endpoints, so only explicit policy triggers it and reports
  redact targets. Data-saving/host policy can disable all speculation.
- Same-origin/credentials/private identity/cache-control/Vary/size checks apply before retention;
  server auth/CSRF and current commit CSP/Trusted Types remain authoritative.
- Prefetch produces no focus, scroll, busy/live announcement, or control changes until an actual
  visit adopts it. Keyboard focus intent follows the same delay/cancel policy and no-JS remains
  native.

### Risks

- HTTP `Vary` and authentication contexts are hard to reproduce. Prefer refusing to cache ambiguous
  responses rather than inventing a browser HTTP cache.
- Hover prefetch can increase server load. Make it opt-in with an observable request budget.
- Parsed DOM can retain live graphs; cache source only and reparse.
- An in-flight prefetch can race a visit/invalidation/identity change; use adoption plus
  generations.
- Byte/accounting/eviction bugs can defeat bounds; property-test every replace/evict/order boundary.

### Verification plan

- Revalidate activated HTTP/identity/budget contract before implementation.
- Add fake-clock/property/model tests for eligibility/intent queue, keys/Vary, response admission,
  source lifecycle, LRU/bytes/age, adoption/generations, revalidation,
  invalidation/identity/disposal.
- Run deterministic Chromium/Firefox/WebKit/no-JS server counters for HTTP/private/redirect/content,
  request/latency gains, document/region validation, writes, accessibility, and races.
- Pack/install/inspect formats/types/API/package/graphs/size and resource/persist separation.
- Run focused/fast/coverage/property/static/browser/package/release/check/ticket/diff gates without
  mutation testing.

### Planned files

- `src/navigation/{prefetch,prefetch-cache,http-cache-policy}.ts` and types: Eligibility, intent
  queue/adoption, keys, source records, HTTP admission/revalidation,
  LRU/bounds/invalidation/cleanup.
- Navigation request/stage/commit/form/region/identity integration using existing policies only.
- Prefetch contract schema/fixtures, unit/property/model suites, deterministic HTTP routes, and
  three-browser/no-JS specs.
- Package/API/consumer/census/size evidence for optional navigation and cache separation.
- README, architecture/interoperability/security/ownership/testing website docs and this ticket.

## Code

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result      | Evidence                                                  |
| --------- | ----------- | --------------------------------------------------------- |
| _Not run_ | Conditional | Waiting for navigation approval and prerequisite tickets. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

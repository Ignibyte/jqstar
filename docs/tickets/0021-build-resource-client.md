---
id: 0021
title: Build the approved resource client
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0021: Build the approved resource client

## Plan

### Problem

If ticket 0020 selects a native client, the implementation needs explicit identity and ownership
before loaders run. A shared request must not be aborted because one application lease is destroyed.
Likewise, a late or superseded response must not overwrite newer canonical data, and cached browser
data must not become server authority merely because it is convenient to read.

### Current evidence

- No resource entry, key grammar, cache record, lease, loader, invalidation, stale/GC, or resource
  observation exists today.
- By dependency, stable core supplies per-document kernels, transactional plugins, operation
  observations, finite tasks, render/disposal contracts, and testing conformance. Stores are client
  coordination state and are not a hidden resource cache.
- Ticket 0020 must supply the approved Project Inspector use case, frozen native prototype metrics,
  predeclared decision rubric, rejected alternatives, and exact architecture inputs. This ticket
  cannot broaden them during implementation to justify itself.
- Existing request actions/profiles own HTTP semantics and server patches. A loader may use them or
  `fetch`, but resources cannot bypass middleware/final policy, synthesize Datastar strings, or
  claim ownership of arbitrary requests it did not create.

### Activation gate

Do not start unless ticket 0020 explicitly approves a native jQuery Star resource client. If it
selects no package or an external adapter, record that outcome in the roadmap and leave this ticket
`declined`; prove no `jquery-star/resources` export, dependency, sentinel, docs claim, or prototype
source ships. Before moving this ticket to `coding`, replace every decision-dependent value in its
Plan with ticket 0020's frozen key limits, default stale/GC/last-lease policy, size baseline, and
reference metrics, then Plan-validate again.

### Scope

- Publish side-effect-free ESM and CommonJS `jquery-star/resources` with matched declarations/maps,
  one frozen official plugin, typed definition/key/state/lease/facade/error contracts, and a
  per-kernel cache returned by explicit installation.
- Implement the exact ticket-0020 positive key grammar and limits, type-tagged canonical encoding,
  stable hash/string representation, path-aware validation, semantic exact/prefix matching, and no
  prototype/getter/string-coercion execution.
- Define immutable resource definitions. One key has one definition/loader identity while its cache
  record exists; same-definition acquisition is compatible and any other loader/options identity
  fails before invoking either loader.
- Separate cache records from application/kernel leases. Provide `resources.for(application)` for
  auto-owned application acquisition and an explicit kernel lease for embedders/prefetch; no
  expression-language call surface or ambient global facade is added.
- Define one deterministic cache/attempt/lease state machine covering empty pending, ready, stale,
  background refetch, failure with/without prior data, cancellation, invalidation during flight,
  superseded resolution, reset, eviction, and terminal disposal.
- Deduplicate concurrent loads by canonical key/definition; create one record-owned AbortController
  and task. Each lease can stop waiting/release independently without canceling shared work while
  another lease or explicit prefetch owner remains.
- Implement the ticket-0020 last-release policy, stale clock, garbage-collection clock, observed-
  record refetch policy, exact/prefix invalidation, explicit refetch/reset/remove/clear, and one
  timer per eligible record using injectable monotonic test time where applicable.
- Support caller-supplied initial data plus update time as server-rendered/bootstrap authority. The
  first compatible record seed wins; later acquisition never overwrites loaded/newer data. No DOM
  scraping, automatic JSON script parsing, persistence, or hydration format is added.
- Publish read-only reactive lease state with stable phase/fetch/stale/error metadata and optional
  selector/equality projection. Do not mutate/freeze loader data, expose write-through cache state,
  or serialize values/errors into observations.
- Integrate loaders with public request middleware/profile/final-policy when they use jQStar
  requests, but keep resource retries disabled by default and focus/reconnect/polling absent.
  Explicit callers own non-idempotent semantics; a read loader receives key, attempt, operation ID,
  and AbortSignal.
- Emit bounded observations for acquisition/load/dedupe/cancel/invalidate/refetch/reset/GC/disposal,
  correlate child request operations, and include hashed/canonical diagnostic keys only under the
  approved redaction policy.
- Deliver ticket 0020's Project Inspector through only the stable public resource API and remeasure
  every frozen behavior/cost/maintenance result. Regressing a hard gate or approved advantage blocks
  publication.
- After the stable reference app is complete, run a separate predeclared mutation-needs rubric.
  Decide server writes + invalidation versus native mutations; a no-go marks ticket 0022 `declined`
  and proves no mutation surface shipped, while a go updates/Plan-validates 0022 without
  implementing it here.
- Prove optional package graph exclusion, installed formats/types/QUnit/browser behavior, public
  disposal, and exact cleanup across root removal, navigation, application destruction, and kernel
  disposal.

### Out of scope

- Mutations, optimistic updates, offline queues, normalized entities, or GraphQL behavior.
- Focus/reconnect refetch, polling, infinite queries, pagination policy, persistence/hydration
  transport, broadcast tabs, Suspense, route loaders, devtools, cache middleware, or server
  rendering framework adapters.
- Caching raw `Response`, DOM/jQuery objects, authorization decisions, credentials, or non-read
  operations; parsing HTML into data; or replacing HTTP/server cache controls.

### Dependencies

- Ticket 0020 approving the native design.

### Acceptance criteria

- [ ] [AC-01] Activation evidence links ticket 0020's native decision, frozen workflow/metrics/key
      and lifecycle defaults, hard gates, size/maintenance target, and Plan revalidation. Without
      it, this ticket is `declined` and package/export/graph scans prove no native residue.
- [ ] [AC-02] `jquery-star/resources` publishes side-effect-free ESM/CommonJS, matched types/maps,
      one immutable official plugin, definition factory, key/state/lease/facade/errors, and no
      import-time core/jQuery/document/global/listener/timer/cache work. Root/global declarations
      are unchanged.
- [ ] [AC-03] Approved resource keys canonicalize deterministically with type tags and sorted safe
      object keys; distinguish otherwise ambiguous primitive/array/object forms; enforce exact
      component/depth/node/string/byte limits; and reject empty/unsupported/sparse/non-finite/
      bigint/symbol/function/accessor/prototype/DOM/class/promise/cycle values with stable paths
      without invoking user code.
- [ ] [AC-04] Exact and prefix matching operate on validated semantic key components, not serialized
      string prefixes. Canonical key/hash equality is stable across insertion order/realms and has
      collision proof; observations expose only the approved bounded diagnostic representation.
- [ ] [AC-05] A resource definition is frozen and identity-bearing. Same key plus same definition
      object/options reuses one record; a different loader/definition or incompatible initial/stale/
      GC policy fails before load and leaves the existing record unchanged. Loader functions are
      never compared by source text/name/serialization.
- [ ] [AC-06] The cache state machine has deterministic immutable public transitions for initial/
      pending/ready/stale/refetch/failed/canceled/invalidated/reset/evicted/disposed states. A
      failed initial load differs from refetch failure with retained data; cancellation is not a
      server error; attempt and operation IDs make late/superseded results unable to overwrite newer
      state.
- [ ] [AC-07] Concurrent compatible acquisitions invoke one loader/task/AbortController. Every
      application owns a distinct lease/projection/subscription; releasing or canceling one stops
      its wait/notifications only. Shared work continues while any lease/prefetch owner needs it and
      the final release follows the frozen abort/retain policy exactly.
- [ ] [AC-08] `resources.for(application)` rejects foreign/destroyed applications and auto-releases
      all their leases deepest-first at destruction. Explicit kernel leases require idempotent
      release and remain kernel-owned. Repeated acquisition/release, render preservation, external
      navigation, failed mount, and disposal create no duplicate observer/task/timer/request.
- [ ] [AC-09] Stale and GC boundaries use documented inclusive/exclusive comparisons and injected
      deterministic clocks. One unobserved record owns at most one GC timer; observed/loading
      records cannot be evicted; reacquisition cancels GC; reset/remove/clear have exact
      in-flight/data/error/ lease behavior and cannot strand unresolved waiters.
- [ ] [AC-10] Exact/prefix invalidation marks every matching record stale in deterministic key
      order. The configured active-refetch policy starts at most one new attempt; invalidation
      during a load cannot let the old result become fresh and schedules at most one follow-up.
      Unmatched records and later-created keys remain unchanged.
- [ ] [AC-11] Initial data/update time seeds only a newly created compatible record and never
      overwrites a current one. Reactive readonly state/projections batch notifications, apply
      selector/equality deterministically, contain observer errors, preserve loader data identity
      without mutation, and expose explicit commands rather than writable cache fields.
- [ ] [AC-12] Loader context contains frozen key, attempt/operation ID, and record-owned
      AbortSignal; jQStar request usage traverses middleware/final policy/profile once and links
      child observations. Default retry is none, non-read loaders are rejected/documented out of
      scope, abort races settle once, and raw arbitrary fetches remain the loader author's
      responsibility.
- [ ] [AC-13] Application/kernel disposal marks resource surfaces terminal, stops every lease/
      projection/observer/timer/task, aborts owned shared loads, awaits/handles late rejections,
      clears records/definition identities, attempts all cleanup after failures, and returns exact
      bounded public disposal categories with no data/error/callback/live references.
- [ ] [AC-14] The stable Project Inspector meets or improves ticket 0020's exact native-approved
      request/cancellation/settled/accessibility/lifecycle/bundle/complexity/maintenance metrics and
      every hard gate using only installed public imports. Server-rendered HTML and server write/
      validation/version authority remain canonical.
- [ ] [AC-15] The post-reference mutation decision uses a frozen rubric and observable need. A no-go
      marks 0022 `declined`, documents server actions + exact/prefix invalidation, and proves no
      mutation export/type/sentinel; a go updates and Plan-validates 0022 with exact evidence but
      adds no mutation code here.
- [ ] [AC-16] Installed import/require/NodeNext/Bundler/QUnit/browser consumers verify version,
      declarations/maps, package contents, private-import refusal, API report, reference behavior,
      and raw/gzip size. Executed graphs prove resource/prototype/mutation code is absent from all
      earlier entries and present only when explicitly imported.
- [ ] [AC-17] Public/project-brain docs define read-only server-state scope, keys/loaders/leases,
      state/races, stale/GC/invalidation, initial HTML, ownership/security, and explicit
      non-features; focused, coverage/property/static/three-browser/package/release,
      `npm run check`, and `git diff --check` pass without mutation testing.

### Design

`defineResource({ key, load, staleTime, gcTime, ...approvedOptions })` validates key/options and
returns one frozen identity object. The key may be static or produced from validated arguments by a
separate typed factory only if ticket 0020 approved it. Loader context is frozen; the loader result
is retained by identity and treated as immutable application data, but jQStar does not recursively
freeze or clone it.

The official plugin owns one cache per kernel. `resources.for(application)` returns an application-
bound acquisition facade. `acquire(definition, options?)` creates a `StarResourceLease` with
readonly reactive `state`, optional `select`/`equals`, `load/refetch/reset`, and idempotent
`release`. An explicit kernel/prefetch acquisition is separately named so application ownership
cannot be omitted accidentally. No `$.star.resource`, expression root, directive, or
auto-fetch-on-markup is added.

A cache record contains canonical key/hash, definition identity, public reactive snapshot,
attempt/generation counters, current promise/controller/task release, leases, invalidation/stale
metadata, and at most one GC timer. Public snapshots are frozen replacements with phase,
`fetchStatus`, `data`, `error`, `updatedAt`, `stale`, `invalidated`, and operation metadata;
internal collections/controllers never escape.

Starting a load increments generation, creates one controller and child operation, and stores the
promise before invoking/awaiting the loader so reentrant acquisition deduplicates. Every resolution,
rejection, and abort compares generation and terminal state before transition. Invalidation during
flight records a newer freshness generation; the old result may become visible under the frozen
decision but cannot clear staleness or suppress the one required follow-up.

Lease cancellation is local: it releases that lease's waiter/projection and rejects/resolves its
consumer promise with the documented cancellation type while the record attempt continues for other
owners. Record cancellation occurs only under last-owner, explicit remove/clear, or kernel-disposal
policy. A loader that ignores its signal may settle later, but generation checks prevent publication
and rejection handlers prevent unhandled failures.

Staleness is computed from monotonic elapsed time plus explicit invalidation; `updatedAt` remains a
wall-clock diagnostic where approved. GC starts only after the last lease/prefetch owner leaves and
the record is not loading. Reacquisition cancels its one timer. Prefix invalidation compares decoded
key parts and visits records in canonical order for deterministic observations/tests.

Initial data is explicit application/server bootstrap input with an update timestamp. It seeds only
record creation and does not infer state from DOM, global JSON, stores, or persistence. Resource
consumers render through normal jQStar state/actions/components; server HTML remains useful without
JavaScript and writes continue through server actions with explicit invalidation after success.

### Decisions

- This plan is conditional. Ticket 0020's approved contract replaces decision-dependent defaults
  before Code; implementation cannot tune the use case/rubric afterward.
- Resources are optional per-kernel read caches with application/kernel leases, not shared stores,
  entities, routes, server authority, or global `StarStatic` methods.
- One live key has one definition object identity. Do not compare loader source or silently let the
  latest acquirer replace policy.
- Public state is readonly/reactive and commands are explicit. Loader data is retained by identity
  and treated as immutable but not deep-frozen by jQStar.
- No automatic focus/reconnect/poll/retry behavior ships in the first client. Explicit refetch and
  invalidation keep lifecycle measurable.
- Application cancellation and record-fetch cancellation are distinct. One consumer cannot abort
  shared work needed by another.
- Initial data is explicit and non-persistent; no DOM hydration protocol is inferred.
- Mutations require the separate post-reference decision and ticket 0022.

### Security and accessibility

- Key validation rejects magic keys/accessors/prototypes and never executes coercion methods.
  Diagnostic hashes/encodings are bounded and cannot expose credential/user data; applications must
  include identity/tenant scope where server visibility requires cache separation.
- Loader and cached data are not authorization decisions. Servers validate every request/write and
  resource caches must be cleared/disposed on identity-scope transitions named by the host.
- Observations/disposal omit keys beyond approved diagnostics, data, errors/cause graphs, request/
  response bodies, headers, selectors, callbacks, DOM, and live promises/controllers.
- Cancellation/disposal handles all promise rejections and prevents late data publication. Request
  middleware/final policy remains authoritative when the jQStar request path is used.
- The reference UI retains initial HTML, native controls, keyboard/focus, loading/error/live-region
  semantics, reduced motion, forced colors, zoom/reflow, and JavaScript-disabled behavior.

### Risks

- Fake clocks can mask real focus/network browser behavior. Keep automatic focus/reconnect refetch
  out until separately specified.
- Cache data can diverge from server HTML. Document initial data and invalidation ownership.
- Loader identity conflicts can appear only after one loader has run. Validate definition identity
  before invoking any candidate and retain the first record policy.
- Releasing one lease can abort a shared promise or leak its waiter. Separate lease waiters from the
  record controller and generate overlap permutations.
- Invalidation during flight can publish stale data as fresh or spawn refetch storms. Use freshness
  generations and one queued follow-up per record.
- GC timers can multiply under acquire/release churn. Store at most one timer record and test exact
  boundaries with generated state sequences.
- A selector can throw or return mutable derived data. Contain/report per-lease errors, preserve
  sibling notifications, and scope immutability claims to cache ownership.
- A conditional ticket can drift beyond the decision evidence. Revalidate the updated Plan against
  ticket 0020 and block any feature without a measured reference requirement.

### Verification plan

- After activation, update decision-dependent inputs and validate this Plan before publishing an
  entry or invoking a production loader.
- Add unit/property/model matrices for key grammar/canonicalization/collisions/limits, definition
  identity, state transitions/generations, reentrant/concurrent load, lease cancellation/release,
  invalidation during every phase, stale/GC boundaries, initial data, selector/error containment,
  remove/clear/reset, and disposal failures/late settlement.
- Run request middleware/profile/observation integration with controlled loaders, abort races,
  server errors, explicit no-retry, app teardown/render preservation/navigation, two applications,
  two kernels/documents, and public terminal reports.
- Deliver the fixed Project Inspector with stable public imports; repeat ticket 0020's raw
  measurements/hard gates and the post-reference mutation-needs rubric before any go/no-go.
- Pack/install under Node import/require, TypeScript NodeNext/Bundler, QUnit, external plugin, and
  Chromium/Firefox/WebKit consumers; verify exact formats/version/maps/types/API/package contents,
  private import refusal, accessibility, no JavaScript, and cross-document isolation.
- Bundle/execute all earlier entries plus resources and reference consumers; inspect graphs/
  sentinels/dependencies/raw+gzip budgets/production census and prove prototype/mutation/optional
  exclusion.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage/property/static/
  three-browser/package/release gates, `npm run check`, ticket Test/Document validation, and
  `git diff --check` without mutation testing.

### Planned files

- `src/resources.ts`, `src/resources/types.ts`, `src/resources/key.ts`: Official plugin/facade,
  definition/key API, canonical validation/encoding/hash/matching, public state/lease/errors, and
  approved limits.
- `src/resources/cache.ts`, `src/resources/record.ts`: Per-kernel records, generations, loaders,
  leases/projections, cancellation, staleness/GC, invalidation/refetch/reset/remove/clear, and
  disposal.
- `src/plugin.ts`, `src/kernel.ts`, `src/core.ts`: Application-bound facade/service ownership,
  finite tasks/timers/observations/disposal categories, and public exports without live inspection.
- Build/type/API config and `package.json`/lockfile: Side-effect-free ESM/CommonJS
  `jquery-star/resources`, declarations/maps, export conditions, package files, size/dependency
  metadata, and focused commands.
- `test/resources*.test.ts`, `test/property/resources*.property.test.ts`: Key, model/state-machine,
  race, clock, projection, lifecycle, request integration, and disposal proof.
- Project Inspector selected registry/example block, deterministic endpoints, and
  `e2e/resources.spec.ts`: Stable API reference, server authority, request metrics,
  errors/conflicts, root removal/navigation, accessibility, and three-browser/no-JavaScript
  behavior.
- Installed consumers/scripts, API reports, public baseline, production census, size budgets, and
  release schemas: Format/type/QUnit/browser/package/graph/provenance evidence.
- `docs/decisions/RESOURCE_MUTATIONS.md`, ticket 0022, roadmap: Post-reference frozen mutation
  rubric/data/go-no-go and exact terminal/activation state.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`, website resource guide:
  Optional read-cache contract, examples, authority/security, ownership, states, and exclusions.
- `docs/tickets/0021-build-resource-client.md`: Activation, phase, ledger, commands, findings,
  metrics, decision, criterion evidence, and completion audit.

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
| _Not run_ | Conditional | Waiting for ticket 0020 decision. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

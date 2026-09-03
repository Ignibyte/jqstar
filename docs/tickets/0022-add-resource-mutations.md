---
id: 0022
title: Add ordered resource mutations
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0022: Add ordered resource mutations

## Plan

### Problem

Whole-value optimistic snapshots are incorrect when mutations overlap. If an earlier mutation fails
after a later one succeeds, restoring the earlier snapshot can erase confirmed data. Aborting a
dispatched write is also not proof that the server did nothing, so cancellation cannot be treated as
a safe local rollback followed by automatic retry.

### Current evidence

- Ticket 0021 conditionally supplies canonical keys, immutable definitions, per-kernel confirmed
  cache records, application leases, attempt generations, tasks, invalidation, observations, and a
  completed Project Inspector reference app.
- Ticket 0021 must also produce a separate post-reference decision showing an observable need for a
  native mutation layer. A native read cache alone is not activation evidence.
- Existing Project Browser editing already demonstrates server validation, expected versions,
  conflicts, canonical responses, and safe reload/retry while remaining server/Datastar-owned. A
  mutation API must preserve—not replace—that authority.
- No public mutation definition, invocation state machine, ordered optimistic journal, confirmed-
  base overlay seam, idempotency/retry policy, callback order, or optional package graph exists.

### Activation gate

Do not start unless ticket 0021 ships a native resource client and its named decision explicitly
approves a native mutation layer. A no-go decision marks this ticket `declined`, identifies the
supported server-write + resource invalidation path, and proves that no mutation export, type,
sentinel, dependency, overlay hook, or partial implementation shipped. Before Code, replace every
decision-dependent default/metric in this Plan with the frozen 0021 decision and validate it again.

### Scope

- Publish optional side-effect-free ESM/CommonJS `jquery-star/resources/mutations` with matched
  declarations/maps, one official plugin depending on the exact resources API, and typed definition/
  invocation/state/result/error/conflict/journal contracts. Reader-only resource consumers must not
  include the mutation runtime.
- Add the smallest documented public resource overlay-provider capability needed by an external/
  official mutation plugin. Resource records retain confirmed loader/server data separately from
  visible data; without a provider behavior and bundle cost remain unchanged.
- Define frozen mutation identities and application-bound invocation. Each run owns immutable
  variables by caller-provided identity, monotonic sequence/operation/attempt IDs, AbortController,
  task, callbacks/subscriptions, optional optimistic layers, invalidation plan, and terminal
  cleanup.
- Define deterministic states for staged, optimistic, dispatching, success, validation failure,
  version conflict, transport/server failure, pre-dispatch cancellation, post-dispatch indeterminate
  cancellation, retry waiting/attempt, settled, released, and disposed outcomes.
- Represent optimism as ordered replayable layers over each resource's latest confirmed base. A
  layer is a pure synchronous immutable reducer declared by the mutation definition; it may be
  recomputed repeatedly and cannot mutate base, variables, sibling layers, or resources outside its
  validated target set.
- Keep settled later layers in sequence order until every earlier overlapping layer is terminal.
  Retire the contiguous head: successful layers apply their canonical server result/commit reducer
  to confirmed base, failed/conflicted/canceled layers do not, then recompute visible data from the
  new base plus remaining optimistic layers. Never restore whole-cache snapshots.
- Rebase active layers whenever a loader/refetch publishes a newer confirmed base. Use resource
  attempt/version guards so an older mutation success cannot overwrite a later retired canonical
  commit; require explicit server revision/conflict mapping where overlapping writes target one
  record.
- Define target-key resolution, optimistic/commit reducer failure, executor invocation, canonical
  success payload, server validation details, version conflict/current record, transport failure,
  exact/prefix invalidation, and error reset without embedding any HTTP framework or bypassing
  request middleware/final policy.
- Default automatic retry to none. Permit bounded retry only for definitions that provide a stable
  idempotency key/policy and classify the failure as retryable. A post-dispatch abort/timeout is
  indeterminate, removes local optimism, invalidates/refetches authoritative data, and is never
  automatically replayed as a write.
- Freeze callback/observation order after journal/resource state settles. Callback failures are
  observed/aggregated without changing server outcome, resurrecting layers, skipping later
  callbacks/cleanup, or leaking variables/data.
- Integrate application/root/navigation/kernel disposal. Releasing one observer does not cancel an
  invocation still owned elsewhere; application-owned mutation runs terminate according to
  pre/post-dispatch policy and all layers/tasks/timers/listeners are removed exactly once.
- Deliver the exact ticket-0021 approved mutation workflow with controlled overlapping permutations:
  earlier/later success/failure/conflict/cancel/refetch order, unrelated cache changes, validation,
  canonical server results, and accessible UI recovery.
- Prove optional installed formats/types/package graphs/size and document server writes without
  optimism as the default simpler path.

### Out of scope

- Persistent offline queues, normalized entity writes, automatic conflict resolution, or replacing
  server validation and authorization.
- Global mutation state, transaction guarantees across server requests, replay after reload,
  write-behind storage, background sync, undo history, entity normalization, automatic merge, or
  retry of an indeterminate/non-idempotent write.
- Treating an AbortSignal as server rollback, storing variables/results in observations, or letting
  optimistic reducers initiate requests, actions, timers, DOM work, or other side effects.

### Dependencies

- Ticket 0021 approving the mutation layer.

### Acceptance criteria

- [ ] [AC-01] Activation evidence links the shipped 0021 resource client, completed reference app,
      frozen mutation-needs rubric/data/go decision, exact workflow/metrics/defaults, and a
      revalidated Plan. Without it this ticket is `declined` and export/graph scans prove no
      mutation or overlay residue.
- [ ] [AC-02] `jquery-star/resources/mutations` publishes side-effect-free ESM/CommonJS, matched
      types/maps, one frozen official plugin with an exact resources dependency, public definition/
      run/state/result/error types, and no import-time
      install/global/document/listener/timer/journal work. Resource-only and all earlier bundles
      exclude the optional runtime.
- [ ] [AC-03] The base resources facade exposes only the reviewed provider registration/invalidation
      capabilities needed by public plugins. Installation is transactional and exclusive under the
      approved policy; failure/duplicate/incompatible providers leave confirmed/visible records,
      leases, observations, and resources unchanged, and uninstall/disposal removes the provider
      without a private cache import.
- [ ] [AC-04] Frozen mutation definitions have validated names/API versions, executor, target-key
      resolver, optional optimistic and canonical commit reducers, invalidation policy, retry/
      idempotency policy, and callbacks. Repeated same identity is compatible; collisions or
      thenable/invalid structural callbacks fail before dispatch or optimism.
- [ ] [AC-05] Each invocation has monotonic sequence/operation/attempt IDs, an application/kernel
      owner, readonly reactive state, exact dispatch boundary, controller/task, immutable variable
      reference, terminal result, and idempotent release. Distinct staged/optimistic/dispatching/
      success/validation/conflict/failure/canceled/indeterminate/retry/disposed transitions are
      deterministic and settle once.
- [ ] [AC-06] Optimistic state is an ordered per-resource layer journal over a separate confirmed
      base, never a whole-value rollback snapshot. Reducers receive readonly base/variables, run
      synchronously and repeatedly in sequence, return new values, target only validated keys, and
      fail closed without mutating base/live data or invoking side effects.
- [ ] [AC-07] Every permutation of two or more overlapping layers proves an earlier failure,
      validation error, conflict, or cancellation cannot erase a later success. Later settled layers
      wait behind earlier overlapping layers; contiguous retirement updates confirmed base in order,
      removes terminal layers, and recomputes visible data exactly once per batch.
- [ ] [AC-08] Refetch/server updates replace confirmed base and rebase remaining layers without
      losing unrelated changes. Canonical mutation success/commit carries the approved server
      revision/order evidence; stale/superseded success cannot overwrite a later retired commit.
      Invalid/missing revision evidence yields conflict/invalidation rather than guessed ordering.
- [ ] [AC-09] Success, server validation failure, version conflict with canonical current data,
      transport/HTTP failure, pre-dispatch cancel, post-dispatch abort/timeout indeterminate
      outcome, and reducer/callback failure remain typed and distinct. Invalid writes never enter
      confirmed base; conflicts are not auto-merged; server responses/refetch remain authoritative.
- [ ] [AC-10] Automatic retry defaults to zero. Bounded retry requires a definition-owned stable
      idempotency key plus explicit retryable classification, preserves one logical operation and
      layer across attempts, uses owned abortable delays, and never retries validation/conflict/
      indeterminate/non-idempotent outcomes. Manual retry semantics are equally explicit.
- [ ] [AC-11] Success invalidates only validated configured exact/prefix keys in canonical order
      after confirmed commit/layer retirement; failures use their documented invalidation policy.
      Invalidation/refetch races dedupe through resource generations and cannot create a request or
      optimistic replay storm.
- [ ] [AC-12] Resource/journal state settles before public callbacks in fixed success/error/settled
      order. One throwing/rejecting callback is normalized/observed without changing the mutation
      result, skipping later callbacks/cleanup, retaining a layer, or causing unhandled rejection;
      callback-created arbitrary work remains caller-owned.
- [ ] [AC-13] Application/root/navigation/kernel disposal distinguishes un-dispatched from
      dispatched work, aborts owned controllers, marks indeterminate outcomes, removes/rebases every
      layer, clears retry timers/tasks/subscriptions/providers, handles late settlement, attempts
      all cleanup after failures, and reports exact public terminal categories without
      variables/data/ errors/callback/live references.
- [ ] [AC-14] The approved reference workflow passes controlled multi-mutation permutations,
      canonical version conflicts, unrelated resource refetches, cancellation/retry/disposal, server
      validation/authorization, keyboard/focus/live regions, three browsers, and no JavaScript.
      Server actions without optimism remain documented and tested as the default path.
- [ ] [AC-15] Installed import/require/NodeNext/Bundler/QUnit/browser consumers verify version,
      declarations/maps, API/package contents, private-import refusal, external plugin capability,
      reference behavior, raw/gzip size, and reader-only graph exclusion. Focused,
      coverage/property/ static/three-browser/package/release, `npm run check`, and
      `git diff --check` pass without mutation testing.

### Design

`defineResourceMutation({ id, execute, targets, optimistic?, commit?, invalidate?, retry?, callbacks? })`
returns a frozen identity. `mutations.for(application).run(definition, variables)` validates all
target keys/options, creates one owned invocation, stages its optimistic layers, then crosses a
recorded dispatch boundary immediately before calling the executor with a frozen context containing
variables, operation/attempt IDs, idempotency key where approved, and AbortSignal.

The resource cache always retains `confirmedData` separately from its published `visibleData` after
the mutation provider is installed. The provider owns journals keyed by canonical resource key and
publishes a pure `project(key, confirmedData)` capability plus change notifications. Removing the
provider recomputes records to confirmed data after all invocation/layer cleanup; resource-only code
does not import the journal/executor implementation.

Each layer contains invocation sequence, target key, optimistic reducer, variables reference, and
settlement status. Projection folds active successful/pending optimistic layers over the latest
confirmed base in sequence. Terminal failures are excluded. A later success may settle early but
cannot retire past an earlier overlapping pending layer. When the head becomes terminal, failed
layers drop and successful layers apply their canonical commit reducer/result to confirmed base; the
journal then folds remaining layers once in a resource scheduler batch.

An executor result is a closed union: canonical success, validation failure, version conflict, or
application-defined typed failure; thrown/rejected request errors are normalized separately.
Canonical success identifies affected confirmed values or supplies a deterministic commit reducer
plus server revision/order evidence. A conflict can carry validated current server data for base
replacement, but automatic field merging is forbidden. Unknown/invalid result shapes fail and
invalidate rather than entering confirmed state.

Cancellation has a dispatch line. Before dispatch, cancel removes optimism and returns canceled.
After dispatch, abort requests cancellation but the server may already have committed; the local
outcome is indeterminate, optimism is removed, and configured authoritative keys invalidate/refetch.
No automatic retry follows. Retry exists only with a stable idempotency key and explicit safe error
classification; delay timers/tasks are owned and bounded.

Callbacks run only after journal retirement/rebase, resource notifications, invalidation scheduling,
and mutation state publication. Their fixed order is outcome callback then settled callback.
Failures are observations attached to the completed operation, not a reason to roll back a server
success or retain optimistic state.

### Decisions

- This ticket is doubly conditional: native resources and the post-reference native-mutation
  decision must both be complete before Code.
- Mutations publish from `jquery-star/resources/mutations`; readers do not pay for executor/journal/
  retry/callback code.
- Confirmed server/loader data and visible optimistic projection are separate. Never restore a whole
  cache snapshot.
- Layer retirement is ordered for overlapping targets even when server results arrive out of order.
- Optimistic/commit reducers are synchronous, immutable, deterministic, replayable, and target-
  bounded. The non-optimistic path is always supported.
- Server validation, authorization, revisions, canonical responses, and conflict decisions are
  authoritative. Browser optimism is presentation only.
- Automatic mutation retry is off; idempotent bounded retry is explicit. Post-dispatch cancellation
  is indeterminate and reconciles from the server.
- Offline/persistent queues and automatic conflict merging remain out of scope.

### Security and accessibility

- Variables, optimistic values, canonical results, validation details, cache data, server errors,
  idempotency keys, and response bodies never enter observations/disposal reports. IDs, redacted key
  diagnostics, phase/outcome, attempts, timings, and invalidation counts may.
- Target keys and server result shapes pass the same resource key/data/revision validation before
  touching journals/base. Reducers receive no action/request/DOM/timer/global capabilities from
  jQStar and cannot expand their target set after dispatch.
- Idempotency keys are application/server protocol values and must be unpredictable/scoped where
  required; jQStar neither treats them as authorization nor logs them.
- UI keeps native form validation and server error/conflict announcements. Optimistic changes are
  conveyed without removing focus or hiding pending/failed state; reconciliation avoids duplicate
  live-region announcements and honors reduced motion/forced colors/zoom.

### Risks

- Arbitrary optimistic functions may not be replayable. Restrict or document them and retain a
  non-optimistic mutation path.
- Retrying writes can duplicate server effects. Default to no automatic mutation retry.
- A later success can retire before an earlier failure and be lost during rollback. Keep settled
  layers ordered until the overlapping prefix can retire.
- A server refetch can overwrite visible optimism or optimism can hide newer canonical data. Replace
  confirmed base, then replay active layers through one provider batch.
- Cancellation after dispatch may still have committed remotely. Mark it indeterminate and refetch;
  never claim abort is rollback.
- Reducer/callback failures can strand layers after a successful write. Separate server result from
  local projection/callback errors, invalidate authoritative data, and always complete cleanup.
- Adding overlay support can bloat or destabilize reader-only resources. Keep the provider hook
  minimal, measure its base cost separately, and prove unchanged behavior when absent.

### Verification plan

- After activation, import the exact 0021 decision inputs and validate this Plan before adding an
  export/provider hook.
- Add model/property tests over two/three overlapping operations and all result permutations, target
  overlap/disjointness, refetch between settlements, ordered retirement, base replacement,
  reducer/result failures, invalidation, cancellation before/after dispatch, retry/idempotency, and
  application/kernel disposal with controlled promises/clocks.
- Prove resource-only parity before/after provider support, transactional provider installation/
  rollback/disposal, public-import external provider conformance, confirmed/visible separation, and
  no private cache/journal access.
- Run executor integration through request middleware/final policy/profiles with
  validation/conflict/ canonical success, HTTP/network/timeout/abort outcomes, operation
  correlation, redaction, callback failure, unhandled-rejection detection, and server authority.
- Deliver the fixed reference workflow in Chromium/Firefox/WebKit plus no-JavaScript, keyboard,
  focus/live-region, repeated root/navigation, and version-conflict permutations.
- Pack/install reader resources and mutations under import/require/NodeNext/Bundler/QUnit/browser
  consumers; inspect exports/types/maps/API/package contents/private paths/graphs/sentinels/raw+gzip
  size and optional dependency exclusion.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage/property/static/
  three-browser/package/release gates, `npm run check`, ticket Test/Document validation, and
  `git diff --check` without mutation testing.

### Planned files

- `src/resource-mutations.ts`, `src/resource-mutations/types.ts`: Optional official plugin/facade,
  definitions/invocations, state/results/errors, executor/callback/retry/cancellation lifecycle, and
  observations/disposal.
- `src/resource-mutations/journal.ts`: Ordered per-key layers, overlap/retirement, pure replay,
  canonical commits/conflicts, confirmed-base rebasing, and provider notifications.
- `src/resources.ts`, `src/resources/cache.ts`, `src/resources/types.ts`: Minimal public overlay-
  provider seam, separate confirmed/visible data, version guards, invalidation, and unchanged
  absent- provider behavior.
- `src/plugin.ts`, `src/kernel.ts`: Dependency/facade/provider ownership, application/kernel tasks/
  timers/controllers/callback errors, and terminal disposal categories.
- Build/type/API config and package manifest/lock: `jquery-star/resources/mutations` ESM/CommonJS,
  declarations/maps, export conditions, files, dependency metadata, and reader-only exclusion.
- `test/resource-mutations*.test.ts`, property/model suites: State machine, ordered overlap, rebase,
  failures/conflicts/cancel/retry/callbacks, provider lifecycle, and disposal permutations.
- Reference Project Inspector block/endpoints and `e2e/resource-mutations.spec.ts`: Canonical server
  writes, validation/version conflict, overlapping UI, focus/live regions, browsers/no JavaScript.
- Installed consumers/scripts, API reports, public baseline, production census, size budgets, and
  report schemas: Formats/types/QUnit/browser/package/graph/redaction/provenance proof.
- `README.md`, `docs/{ARCHITECTURE,BACKEND,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`, website mutation
  guide: Server authority, non-optimistic default, journal/retry/cancel/conflict semantics, limits.
- `docs/tickets/0022-add-resource-mutations.md`: Activation, phase, ledger, commands, findings,
  criterion evidence, and completion audit.

## Code

### Changed-file ledger

| File       | Purpose                         |
| ---------- | ------------------------------- |
| _None yet_ | Implementation has not started. |

### Design changes

None recorded.

## Test

| Command   | Result      | Evidence                                |
| --------- | ----------- | --------------------------------------- |
| _Not run_ | Conditional | Waiting for resource-client activation. |

## Document

### Documentation changed

Pending activation.

### Acceptance evidence

Pending activation.

### Completion audit

Pending activation.

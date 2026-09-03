---
id: 0019
title: Add versioned synchronous store persistence
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0019: Add versioned synchronous store persistence

## Plan

### Problem

Individual UI controllers persist preferences directly to local storage, but shared stores have no
common version, migration, corruption, field-selection, multi-page, failure, or cleanup contract.
Persistence must hydrate before applications observe a store, avoid overwriting data from a newer
application version, and remain an optional browser concern rather than changing core boot.

### Current evidence

- Sidebar and Resizable controllers currently access browser storage behind component-specific
  try/catch behavior; the advanced Data Table has its own preference contract. Their keys and
  compatibility cannot be silently absorbed into a new generic plugin.
- Ticket 0018 plans per-kernel store definitions, synchronous staged transactions, selector
  subscriptions, setup/disposal, and public store/context types. Persist must use that public facade
  and cannot inspect reactive dependency maps.
- Application boot is synchronous. There is no asynchronous hydration barrier, so IndexedDB and
  remote storage cannot be made correct by hiding a promise behind store access.
- `localStorage`/`sessionStorage` may be absent, inaccessible, quota-limited, or throw on any
  operation. A browser `storage` event fires only in other relevant documents and does not make
  session storage a general cross-tab bus.
- No envelope, codec, migration, revision, recovery, size, throttle, clock, custom adapter,
  observation, or installed-package contract exists.

### Scope

- Publish side-effect-free ESM and CommonJS `jquery-star/persist` with matched declarations, one
  official plugin that declares a stores-plugin dependency, a typed facade, adapter/codec/migration
  types, and memory/Web Storage adapter factories.
- Attach persistence to an already defined store before the kernel's first application starts.
  Hydrate synchronously and transactionally before returning; reject late attachment, duplicate
  keys, incompatible repeated attachment, missing stores, and async adapters/codecs/migrations.
- Support per-facade memory, same-realm `localStorage`, same-realm `sessionStorage`, and caller-
  supplied synchronous adapters through one exact interface: read, atomic replace, remove, optional
  change subscription, availability, and idempotent disposal.
- Define safe required namespaces, derived/explicit keys, positive integer schema versions, a
  canonical JSON envelope, selected-field codecs, byte limits, deterministic serialization, clocks,
  expiration, sequential migrations, recovery states, reset/retry/flush, and observations.
- Require explicit selection through a codec. Provide a built-in path-field codec for JSON-safe
  preference data and a custom synchronous codec seam for richer validated shapes; never serialize
  function leaves or unspecified store fields.
- Stage parse, envelope validation, migrations, codec decode/normalization, and current-definition
  validation on detached data. Apply through ticket 0018's public synchronous store transaction only
  after every step succeeds; never expose partial hydration.
- Reconcile subscribed external changes with a deterministic whole-envelope Lamport revision
  `{counter, origin}` ordered by counter then origin, independent of wall-clock skew. Track applied
  revisions/content hashes to prevent echo; document intentional lost-update behavior for concurrent
  edits.
- Define recovery for missing, expired, corrupt, future-version, migration-failed, decode-failed,
  unavailable, quota, and write errors. Preserve incompatible/failing source bytes and disable
  writes by default until explicit reset/retry so an older client cannot destroy newer data.
- Own trailing write throttles, maximum delay, adapter subscriptions, storage listeners, pending
  synchronous flush, origin ID, and cleanup. Explicit flush/disposal either commits validated
  pending data or returns a typed failure; no timer/listener remains.
- Publish bounded redacted persistence status/observations without keys containing user namespace
  data, selected values, raw envelopes, storage objects, migration payloads, or DOM references.
- Prove reload and two-page convergence for the adapters that genuinely share state, document
  session-storage partition behavior, and keep persistence absent from all bundles unless imported.
- Publish guidance that browser persistence is readable/mutable client state, not secrets,
  authorization, server truth, entity caching, encryption, or durable offline data.

### Out of scope

- IndexedDB, cookies, encryption claims, persistent offline mutations, or asynchronous boot
  blocking.
- Migrating component-specific storage without a separate compatibility plan.
- Service workers, Cache Storage, remote synchronization, CRDTs, per-field merge, distributed locks,
  durable transactions across keys, automatic conflict UI, compression, or fallthrough from one
  adapter to another after failure.
- Persisting actions/methods, arbitrary class/DOM/collection values, entire stores by default,
  credentials/tokens, or authorization/feature-entitlement decisions.

### Dependencies

- Ticket 0018.

### Acceptance criteria

- [ ] [AC-01] `jquery-star/persist` publishes side-effect-free ESM/CommonJS, matched types/maps, one
      frozen official plugin with an exact stores-plugin API dependency, facade, envelope/status/
      error types, codec/migration contracts, and memory/local/session/custom adapter factories.
      Import performs no core/store installation, global/storage access, listener/timer creation, or
      hydration.
- [ ] [AC-02] Installation/attachment is transactional. An existing store is attached before the
      first application; read/parse/migrate/decode/validate/apply completes synchronously before
      return. Missing store, late attach, duplicate full key, incompatible repeated options,
      thenable adapter/codec/migration, or setup failure leaves store, storage, namespace,
      listeners, timers, observations, and facade registration unchanged.
- [ ] [AC-03] Every adapter passes one conformance suite for availability, read, atomic replace,
      remove, optional external-change subscription, error normalization, and idempotent disposal.
      The adapter is tied to the supplied kernel realm; no ambient `window.localStorage` is read at
      import or from a different document.
- [ ] [AC-04] Canonical envelopes contain exact format, safe namespace, store name, schema version,
      saved/expiry time, Lamport counter/origin, codec ID/version, and selected JSON-safe data.
      Stable serialization, key derivation, maximum key/value bytes, finite numbers, Unicode, null/
      undefined handling, and prototype-safe parsing have boundary tests.
- [ ] [AC-05] The built-in field codec persists only explicitly declared safe paths, rejects
      duplicate/overlapping/magic/function/unknown paths and unsupported values, and validates each
      decoded value against its declared synchronous rule/current store graph. A custom codec has
      the same sync/JSON-safe/size/error contract and cannot cause partial live mutation.
- [ ] [AC-06] Integer migrations run exactly once in ascending one-version steps over detached
      JSON-safe data and update the envelope only after decode plus store transaction succeeds.
      Missing steps, future versions, throws, invalid output, cycles, limit breaches, and thenables
      preserve original storage bytes, leave defaults live, disable writes, and expose a typed
      recovery status until explicit caller action.
- [ ] [AC-07] Missing data keeps defaults; expired data is removed and defaults remain; corrupt/
      changed-type/unavailable/read/quota/write failures follow the documented preserve/disable
      policy without throwing application boot by default. Strict mode may fail attachment before
      applications start. `reset()`/`retry()` are explicit, typed, and never silently overwrite a
      newer envelope.
- [ ] [AC-08] Store changes schedule one trailing write with bounded maximum delay. `flush()` writes
      the latest selected snapshot synchronously and reports success/failure; repeated changes do
      not create unbounded timers. Disposal marks the attachment terminal, flushes or returns the
      chosen policy outcome, removes timers/listeners/subscriptions, disposes adapters owned by the
      plugin, and attempts every cleanup after individual failures.
- [ ] [AC-09] Shared-adapter updates converge by total Lamport ordering `(counter, origin)`;
      applying an external envelope advances the local counter, mutates the store once
      transactionally, and does not echo the same revision/content.
      Older/equal/duplicate/out-of-order/self-origin/ malformed/future events are handled
      deterministically. Concurrent whole-envelope edits use documented last-write-wins and make no
      merge/CRDT guarantee.
- [ ] [AC-10] Memory and local-storage adapters pass same-origin two-facade/page convergence where
      applicable. Session storage persists reloads within its top-level context but makes no
      cross-tab convergence claim; custom adapters advertise whether subscription/sharing exists.
- [ ] [AC-11] Observations/status/disposal reports contain attachment ID, adapter kind, store,
      schema/codec versions, revision, outcome/error code, byte count, and timing only after safe
      bounded normalization. They omit selected values, raw bytes, storage objects, callbacks,
      migration data, full user-derived keys/namespaces, credentials, and DOM/live references.
- [ ] [AC-12] Chromium, Firefox, and WebKit prove initial hydration before effects/UI, reload,
      two-page local convergence, session partitioning, expiry with controlled clock, unavailable/
      quota/corrupt/future/migration/decode failures, throttle/flush, disposal, and no duplicate
      application/live-region updates.
- [ ] [AC-13] Installed import/require/NodeNext/Bundler/QUnit/browser consumers resolve
      `jquery-star/persist`, use only public stores APIs, verify version/maps/types/package
      contents, and record raw/gzip size. Executed graphs/sentinels prove persistence and Web
      Storage code are absent from root/core/UI/Datastar/CSP/testing/bridge/stores-only consumers
      unless imported.
- [ ] [AC-14] Public docs distinguish ephemeral stores, persisted preferences, browser visibility/
      quotas/privacy, server authority, and server-state resources; explicitly prohibit secrets and
      authorization decisions; and pass focused, coverage/property/static/browser/package/release,
      `npm run check`, and `git diff --check` gates without mutation testing.

### Design

`$.star.use(persistPlugin)` resolves the already installed stores facade through the public plugin
dependency and returns a per-kernel persistence facade. `attach(storeName, options)` is allowed only
before the first application starts. The options freeze namespace/key, schema version, codec,
migrations, adapter ownership, clock, expiration, throttle/max-delay, recovery mode, and strictness.
Repeating attach is idempotent only for the same frozen options object and store definition; any
other claim on the full storage key fails.

The synchronous adapter contract returns direct values, never promises. Web Storage adapters receive
the exact realm/window/storage object explicitly and register `storage` listeners through owned
capabilities. A memory adapter owns one map and subscriber set per adapter instance, making sharing
explicit in tests/embedders. Custom adapters declare stable `kind`, `shared`, and `subscribable`
metadata; returning a thenable from any method is a contract failure.

The canonical key is derived from fixed `jqstar`, encoded caller namespace, and encoded store name
unless an equally validated explicit key is supplied. The canonical envelope is a null-prototype
JSON object with format/version metadata, wall-clock save/expiry diagnostics, Lamport revision,
codec identity, and data. A deterministic serializer sorts object keys, rejects non-finite/cyclic/
unsupported values, and enforces pre/post-encoding byte ceilings before adapter writes.

A `StarPersistCodec<State, Data>` has synchronous `encode(store)` and `decode(data, currentDraft)`
functions plus stable ID/version. Encoding runs against a read-only store view and must produce
selected JSON-safe data. Decoding mutates/returns only a detached draft; ticket 0018's public
`transaction()` validates and commits it after the entire pipeline succeeds. The official field
codec builds this contract from explicit safe paths and synchronous validators, so an application
can persist preferences without writing the rest of the store.

Hydration reads once, parses and validates the envelope, checks expiry/version/codec, runs every
integer migration on detached data, decodes against a detached current-store draft, and commits
once. No step writes storage until the complete value is accepted. Successful migration schedules a
new current-version envelope. Future versions and recoverable failures keep the original bytes and
put the attachment into read-disabled/write-disabled recovery state; explicit `reset()` or `retry()`
is required. Strict mode throws before attachment/application commit instead.

Each writer owns a random per-page origin ID and a Lamport counter seeded from hydrated/observed
revisions. Revisions compare by counter then origin string. A local committed write increments above
the greatest seen counter. An accepted external update advances the counter and is applied with a
suppression token/content hash so its resulting reactive notifications do not write the same value
back. The selected payload is one last-write-wins unit; time is metadata, not conflict authority.

Write scheduling uses one trailing owned timer and a bounded maximum delay. Store subscription only
marks the latest selected snapshot dirty. `flush()` encodes/validates/serializes the current store
at call time and performs one synchronous atomic adapter replace. Disposal chooses the documented
default flush policy, but always removes the timer, store subscription, external listener, and owned
adapter even if the write/cleanup fails; the public disposal report aggregates the result.

### Decisions

- Persistence is an explicit optional plugin over stores and never enters root/core/stores bundles.
- Attachments hydrate synchronously before the first application. Asynchronous storage waits for a
  future explicit async boot contract; it is not hidden behind promises or suspense-like state.
- Explicit codecs select data. Entire-store persistence and method serialization are not defaults.
- Schema versions are positive integers with exact `n → n + 1` migrations. Package SemVer and store
  schema versions are independent.
- Whole selected envelopes use deterministic Lamport last-write-wins. There is no merge/CRDT claim;
  callers should split unrelated preferences into stores/attachments when conflict granularity
  matters.
- Future/migration/decode failures preserve source data and disable writes by default. An older
  client never silently overwrites newer data.
- `savedAt` and expiry use an injectable clock but do not decide conflicts. Invalid/backward clocks
  cannot reverse a Lamport winner.
- Existing component storage remains untouched until its own compatibility/migration ticket.

### Security and accessibility

- Browser storage is same-origin client data, accessible to page script and user tools. Never store
  passwords, tokens, private keys, regulated secrets, or authorization/entitlement decisions.
- Namespace/key/path parsing rejects magic prototype segments and excessive length. Envelope parsing
  produces null-prototype data, invokes no accessors/revivers, and never treats stored strings as
  expressions, selectors, HTML, URLs, or code.
- Storage events and custom adapter updates are untrusted input. They traverse the same size,
  envelope, version, migration, codec, and store-transaction validation as initial hydration.
- Observations/errors redact user-derived keys and all values. Migration/codec exceptions are
  normalized without serializing causes that may include stored data.
- Hydration occurs before accessible UI observes the store; reconciliation batches one update so
  controls/live regions do not announce intermediate fields. Persistence never overrides browser
  form autofill, native validation, focus, or user input unless the application explicitly stores
  and applies that field.

### Risks

- Browser storage quotas and privacy modes throw synchronously. Treat storage failure as observable
  recoverable state, not an application crash.
- Last-write policies can lose concurrent preference changes. Document granularity and provide a
  store-splitting strategy without claiming distributed consistency.
- Attaching after an application mounts can flash defaults and rerun effects with persisted values.
  Enforce the pre-application boundary instead of inventing async hydration.
- A failed migration can overwrite the only recoverable newer/corrupt data. Preserve original bytes
  and disable writes until explicit reset/retry.
- `Date.now()` ordering diverges across tabs. Use wall time only for expiry/diagnostics and Lamport
  counter+origin for convergence.
- Storage feedback can loop indefinitely. Track revision, origin, canonical content hash, and
  externally-applied suppression through one reactive batch.
- A custom codec/adapter may perform hidden side effects or lie about synchrony. Freeze interfaces,
  reject thenables, run conformance, scope jQStar claims to returned behavior, and dispose owned
  registrations after failures.
- Flushing during disposal can throw and strand listeners. Mark terminal first, attempt flush under
  policy, and continue every cleanup while aggregating the terminal report.

### Verification plan

- Validate this Plan before adding the export or storage access.
- Add unit/property matrices for keys/namespaces, canonical JSON and byte limits, codec field
  selection, unsupported/cyclic data, envelopes, versions/migration chains, detached atomic decode,
  every recovery state, strict/default behavior, clocks/expiry, revisions/ties/order, echo
  suppression, throttle/max-delay/flush, adapter errors, and cleanup aggregation.
- Run one shared adapter conformance against memory, local, session, unavailable/throwing/quota, and
  custom implementations; assert synchronous return types, exact change semantics, ownership, and
  terminal behavior with fake clocks and no real delay.
- Use Chromium/Firefox/WebKit multiple pages/contexts plus reloads to prove local sharing, session
  partitioning, origin/revision convergence, no echo, hydration before application/UI effects,
  recovery/reset/retry, pending-disposal flush, and accessibility-stable updates.
- Pack/install stores + persist under Node import/require, TypeScript NodeNext/Bundler, QUnit, and
  browser consumers using only declared exports. Check plugin dependency/version, maps,
  declarations, API reports, package contents, private imports, and no ambient storage import work.
- Bundle/execute root/core/UI/Datastar/CSP/testing/bridges/stores/persist consumers; inspect graphs,
  forbidden sentinels, Web Storage references, raw/gzip budgets, and production census for optional
  exclusion.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage/property/static/
  three-browser/package/release gates, `npm run check`, ticket Test/Document validation, and
  `git diff --check` without mutation testing.

### Planned files

- `src/persist.ts`, `src/persist/types.ts`: Official plugin/facade, attachment state, canonical
  envelope, codec/migration pipeline, recovery, revisions, scheduling, observations, and disposal.
- `src/persist/adapters.ts`, `src/persist/codec.ts`: Memory/Web Storage/custom adapter contract,
  exact-realm listeners, deterministic serializer, field codec, validators, size/key safety, and
  conformance metadata.
- `src/stores.ts`, `src/plugin.ts`, `src/kernel.ts`: Public stores dependency/transaction use,
  pre-application attachment boundary, owned timers/listeners/services, and disposal categories; no
  private store/effect access.
- Build/type/API config and `package.json`/lockfile: Side-effect-free ESM/CommonJS
  `jquery-star/persist`, matched declarations/maps, export conditions, files, exact optional
  dependencies, and scripts.
- `test/persist*.test.ts`, `test/property/persist*.property.test.ts`: Adapter, codec, envelope,
  migration, recovery, revision, throttle, echo, lifecycle, and generated state-machine proof.
- `e2e/persist.spec.ts`, fixtures/server routes: Three-browser hydration/reload/two-page/session/
  quota/failure/disposal/accessibility proof with controlled clocks and actual storage events.
- Installed package consumers/scripts, API reports, public baseline, production census, and size
  budgets: Format/type/QUnit/browser conformance and optional graph exclusion.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`, website persistence
  guide: Setup order, envelopes, codecs, migrations, recovery, conflicts, privacy/security, limits,
  and store/server-state distinctions.
- `docs/tickets/0019-add-versioned-persistence.md`: Phase, ledger, commands, findings, criterion
  evidence, and completion audit.

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

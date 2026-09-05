---
id: 0019
title: Add versioned synchronous store persistence
status: done
created: 2026-08-30
updated: 2026-09-05
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
- Ticket 0018 ships per-kernel store definitions, synchronous staged transactions, selector
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

- [x] [AC-01] `jquery-star/persist` publishes side-effect-free ESM/CommonJS, matched types/maps, one
      frozen official plugin with an exact stores-plugin API dependency, facade, envelope/status/
      error types, codec/migration contracts, and memory/local/session/custom adapter factories.
      Import performs no core/store installation, global/storage access, listener/timer creation, or
      hydration.
- [x] [AC-02] Installation/attachment is transactional. An existing store is attached before the
      first application; read/parse/migrate/decode/validate/apply completes synchronously before
      return. Missing store, late attach, duplicate full key, incompatible repeated options,
      thenable adapter/codec/migration, or setup failure leaves store, storage, namespace,
      listeners, timers, observations, and facade registration unchanged.
- [x] [AC-03] Every adapter passes one conformance suite for availability, read, atomic replace,
      remove, optional external-change subscription, error normalization, and idempotent disposal.
      The adapter is tied to the supplied kernel realm; no ambient `window.localStorage` is read at
      import or from a different document.
- [x] [AC-04] Canonical envelopes contain exact format, safe namespace, store name, schema version,
      saved/expiry time, Lamport counter/origin, codec ID/version, and selected JSON-safe data.
      Stable serialization, key derivation, maximum key/value bytes, finite numbers, Unicode, null/
      undefined handling, and prototype-safe parsing have boundary tests.
- [x] [AC-05] The built-in field codec persists only explicitly declared safe paths, rejects
      duplicate/overlapping/magic/function/unknown paths and unsupported values, and validates each
      decoded value against its declared synchronous rule/current store graph. A custom codec has
      the same sync/JSON-safe/size/error contract and cannot cause partial live mutation.
- [x] [AC-06] Integer migrations run exactly once in ascending one-version steps over detached
      JSON-safe data and update the envelope only after decode plus store transaction succeeds.
      Missing steps, future versions, throws, invalid output, cycles, limit breaches, and thenables
      preserve original storage bytes, leave defaults live, disable writes, and expose a typed
      recovery status until explicit caller action.
- [x] [AC-07] Missing data keeps defaults; expired data is removed and defaults remain; corrupt/
      changed-type/unavailable/read/quota/write failures follow the documented preserve/disable
      policy without throwing application boot by default. Strict mode may fail attachment before
      applications start. `reset()`/`retry()` are explicit, typed, and never silently overwrite a
      newer envelope.
- [x] [AC-08] Store changes schedule one trailing write with bounded maximum delay. `flush()` writes
      the latest selected snapshot synchronously and reports success/failure; repeated changes do
      not create unbounded timers. Disposal marks the attachment terminal, flushes or returns the
      chosen policy outcome, removes timers/listeners/subscriptions, disposes adapters owned by the
      plugin, and attempts every cleanup after individual failures.
- [x] [AC-09] Shared-adapter updates converge by total Lamport ordering `(counter, origin)`;
      applying an external envelope advances the local counter, mutates the store once
      transactionally, and does not echo the same revision/content.
      Older/equal/duplicate/out-of-order/self-origin/ malformed/future events are handled
      deterministically. Concurrent whole-envelope edits use documented last-write-wins and make no
      merge/CRDT guarantee.
- [x] [AC-10] Memory and local-storage adapters pass same-origin two-facade/page convergence where
      applicable. Session storage persists reloads within its top-level context but makes no
      cross-tab convergence claim; custom adapters advertise whether subscription/sharing exists.
- [x] [AC-11] Observations/status/disposal reports contain attachment ID, adapter kind, store,
      schema/codec versions, revision, outcome/error code, byte count, and timing only after safe
      bounded normalization. They omit selected values, raw bytes, storage objects, callbacks,
      migration data, full user-derived keys/namespaces, credentials, and DOM/live references.
- [x] [AC-12] Chromium, Firefox, and WebKit prove initial hydration before effects/UI, reload,
      two-page local convergence, session partitioning, expiry with controlled clock, unavailable/
      quota/corrupt/future/migration/decode failures, throttle/flush, disposal, and no duplicate
      application/live-region updates.
- [x] [AC-13] Installed import/require/NodeNext/Bundler/QUnit/browser consumers resolve
      `jquery-star/persist`, use only public stores APIs, verify version/maps/types/package
      contents, and record raw/gzip size. Executed graphs/sentinels prove persistence and Web
      Storage code are absent from root/core/UI/Datastar/CSP/testing/bridge/stores-only consumers
      unless imported.
- [x] [AC-14] Public docs distinguish ephemeral stores, persisted preferences, browser visibility/
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

- Current-state inspection (2026-09-05): ticket 0018 is done at `017959a`. The plugin registrar
  lacks dependency-facade lookup and a durable pre-application assertion. Add these public
  capabilities to the registrar, resolve only declared dependencies (including staged installation),
  and use the existing plugin lock as the application-start authority.
- Adapter factories are lazy: Web Storage is accessed only by adapter operations, using the
  explicitly supplied Window. Attachment defaults to one facade-owned memory adapter; sharing caller
  adapters is explicit and borrowed by default.
- Persistence exposes its own frozen redacted status subscription and disposal reports. An owned
  attachment service flushes before the stores service becomes terminal during kernel disposal.
- The field codec represents selected values as a path-to-value record. Undefined is rejected; null
  is explicit. Decoding requires exactly the selected paths and matching current value kinds.
- External deletion/clear preserves the live value and disables writes until retry/reset. A lower
  revision may trigger repair of the accepted envelope so physical storage converges too; identical
  accepted revisions never trigger a store transaction or rewrite.
- Web Storage behavior follows the
  [HTML standard](https://html.spec.whatwg.org/multipage/webstorage.html) inspected on 2026-09-05,
  including no locking and session top-level partitioning.

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

| File                                                                                             | Purpose                                                                                            |
| ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `src/plugin.ts`                                                                                  | Declared dependency lookup and pre-application assertion.                                          |
| `src/persist.ts`, `src/persist/`                                                                 | Optional persistence facade, adapters, codec, and envelope pipeline.                               |
| `test/persist*.test.ts`                                                                          | Attachment and shared adapter conformance; canonical data, option, codec, and envelope boundaries. |
| `package.json`, `vite.config.ts`, `scripts/build-types.mjs`, `config/api-extractor.persist.json` | Optional export, formats, declarations, and API rollup.                                            |
| `etc/jquery-star{,-core,-persist}.api.md`                                                        | Reviewed registrar additions and persistence public API.                                           |
| `quality/{public-baseline,release-contract}.json`                                                | Add the persistence entry to package and release contracts.                                        |

### Design changes

- Continuation audit (2026-09-05): implementation and draft documentation are present, but the
  ticket remains in Code until current fast, coverage, browser, package, and delivery evidence
  passes. Add regression evidence for a codec failing during subscription setup and reentrant
  disposal. Keep the existing consumer-size budgets enforced.
- Independent contract inspection found that `randomUUID()` would add an undocumented secure-
  context requirement. Generate the bounded 128-bit origin with the supplied realm's
  `getRandomValues()` instead. The
  [Web Crypto interface](https://www.w3.org/TR/WebCryptoAPI/#crypto-interface) restricts
  `randomUUID()` to secure contexts, while `getRandomValues()` has no such restriction. Verify
  installation without UUID access and rerun browser persistence after the change.

The changed-file ledger also includes:

- `test/property/persist.property.test.ts`, `e2e/persist.spec.ts`, `e2e/fixtures/persist.ts`:
  Canonical data, revision order, recovery sequences, and browser persistence behavior.
- `scripts/{quality-package,smoke-package-files}.mjs`,
  `scripts/quality/package-release-contracts.mjs`, `config/quality-budgets.json`,
  `schema/{package-report,quality-budgets,release-contract}.schema.json`: Installed consumers,
  package manifests, graph exclusion, and optional-entry budgets.
- `test/{jquery-ecosystem-contract,public-baseline}.test.ts`,
  `test/{package-release-hardening,release-candidate-contract}.test.mjs`,
  `test/fixtures/csp/conformance-map.json`, `quality/jquery-mobile-migration.json`: Extend existing
  contract evidence to the optional persistence entry.
- `README.md`, `CHANGELOG.md`,
  `docs/{README,ARCHITECTURE,COMPATIBILITY,PROJECT,PERSISTENCE, RUNTIME_OWNERSHIP,STORES,TESTING}.md`,
  `example/docs/{stores,persistence}/index.html`, `example/docs-shell.html`: Public usage,
  ownership, recovery, compatibility, and verification.
- `config/agent-content.json`, generated agent corpus files, `vite.demo.config.ts`,
  `.prettierignore`: Publish the persistence guide, regenerate its corpus, and treat its generated
  API report consistently with the other reports.

## Test

| Command                                                                                              | Result | Evidence                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation                                                                         | Pass   | Plan validated before implementation on 2026-09-05.                                                                                                                                                                           |
| Focused attachment suite (first run)                                                                 | Fail   | The test used `use()` instead of `useMany()`; correcting it exposed the existing rejection of official-plugin dependency names. Dependency references now accept official namespaces without granting registration ownership. |
| Focused adapter suite (first run)                                                                    | Fail   | Vitest global storage resolved Node storage, not the DOM realm. Conformance now uses explicit iframe Windows and their StorageEvent constructors.                                                                             |
| Focused persistence unit suites                                                                      | Pass   | 60 tests cover attachment, adapters, canonical data, codecs, envelopes, migration, recovery, scheduling, and shared memory.                                                                                                   |
| `node scripts/build-types.mjs --local`                                                               | Pass   | Generated the new persist declaration/API report and updated the two registrar API reports.                                                                                                                                   |
| Previous `quality:fast`                                                                              | Fail   | Generated persist API report needed the same formatting exclusion as existing API reports; `.prettierignore` now includes it.                                                                                                 |
| Previous coverage gate                                                                               | Fail   | Missing changed-line evidence for setup/disposal failures and a multiline type assertion; current verification pending.                                                                                                       |
| Previous package gate                                                                                | Fail   | Root consumer measured 542,993 bytes against 542,720; verify the current registrar refactor before further changes.                                                                                                           |
| `npm run quality:fast`                                                                               | Pass   | `.git/jqstar/runs/2026-09-05T16-54-43-201Z-35433/report.json`; every fast gate passed before Code closure.                                                                                                                    |
| `npm run quality:fast`                                                                               | Pass   | Run `2026-09-05T17-08-33-308Z-18445` passed after the final registrar refactor.                                                                                                                                               |
| `npm run quality:delivery` through `npm run check`                                                   | Pass   | Run `2026-09-05T17-09-51-074Z-29895` passed all 12 gates and issued an exact-tree receipt.                                                                                                                                    |
| `npm run ticket:validate -- --phase test ... --report .git/jqstar/latest-report.json`, first attempt | Fail   | Findings needed the dedicated Inspection ledger heading; the ledger below supplies the recorded review and resolutions.                                                                                                       |
| `git diff --check`                                                                                   | Pass   | No whitespace errors in the implementation and documentation changes.                                                                                                                                                         |

### Continuation verification

- `npx vitest run test/persist.test.ts test/persist-adapters.test.ts test/persist-data.test.ts`
  passed 68 focused tests before the additional ordering and HTTP-origin cases. The current full
  unit run also passes those added cases.
- `npx playwright test e2e/persist.spec.ts --project=desktop-chromium --project=desktop-firefox --project=desktop-webkit`
  passed all 15 selected tests. The full delivery matrix will rerun them after the origin change.
- Overlapping fast/coverage/package runs failed because generated build and coverage files were
  removed during another check. These errors authorize no phase closure. Subsequent verification
  runs sequentially.
- The first current package run measured 542,827 root-consumer bytes against 542,720. Shared object
  validation now joins shared callback validation in the registrar; no existing budget increased.
- `npm run quality:fast` passed every gate in
  `.git/jqstar/runs/2026-09-05T16-54-43-201Z-35433/report.json`.
- `npm run ticket:validate -- --phase code --ticket docs/tickets/0019-add-versioned-persistence.md --report .git/jqstar/latest-report.json`
  passed against that exact tree before moving to Test.
- The first `npm run check` passed 1,013 unit tests, static delivery, all 36 properties, and
  self-hosted proof, then exposed missing reset-removal failure coverage. It also required the fast
  result in the Test table rather than prose. Both are corrected. The run was stopped during package
  verification after the failures were confirmed; its interrupted gates authorize nothing.
- The reset regression preserves future-version source bytes and live state when removal is denied,
  then proves explicit recovery after storage becomes writable.
- The follow-up coverage run covers every changed executable line and function. Its full-suite
  result remained red because the interrupted package build had removed the generated UMD file.
  Rebuild all package outputs before the next sequential complete gate.
- The next delivery run passed coverage, all 1,014 unit tests, static analysis, properties, and
  deployment. Installed formats/types/browsers passed and root bytes met their ceiling, but core
  gzip measured 63,026 bytes against 63,000. Return to Code to share staged-resource cleanup,
  cleanup-map bookkeeping, and reverse rollback aggregation in the registrar without changing the
  immutable size budgets. The release/browser remainder was interrupted after this confirmed package
  failure.
- The registrar shares callback/object checks, staged resource cancellation, cleanup-map iteration,
  and reverse cleanup aggregation. It retains captured plugin names for stable ownership and
  diagnostics. Existing plugin tests cover cancelled staging, active release, rollback ordering,
  failing cleanup, and registrar invalidation.
- The local compiled-consumer probe now measures root 542,329 bytes and core 197,040 raw / 62,993
  gzip bytes. Final installed-tarball confirmation remains required.
- The final registrar refactor passed `npm run quality:fast` in
  `.git/jqstar/runs/2026-09-05T17-08-33-308Z-18445/report.json`, then passed Code-phase validation
  against the same tree. Return to Test for the complete delivery proof.
- `npm run check` passed every enforced gate in
  `.git/jqstar/runs/2026-09-05T17-09-51-074Z-29895/report.json` on one unchanged fingerprint. That
  run includes 1,014 unit tests, full changed-code coverage, 36 properties, static analysis,
  deployment, all 13 package checks, release reproducibility, 361 browser cases, and detector
  self-tests.
- Test-phase validation then identified that inspection findings were recorded under Code rather
  than the required Inspection ledger heading. The dedicated ledger below records those findings and
  their resolutions. Final phase validation checks this completed record against its receipt.

### Inspection ledger

| Finding                                                                                     | Resolution                                                                                                                                                                                                |
| ------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UUID-based origins imposed an undocumented secure-context requirement.                      | Use the supplied realm's `getRandomValues()`; the regression rejects UUID access, and all three browsers pass.                                                                                            |
| Subscription setup and reset removal failures lacked direct regression evidence.            | Tests prove unchanged live state and preserved source bytes, no registered failed attachment, and explicit recovery; changed-code coverage passes.                                                        |
| Reentrant or failing disposal could obscure later cleanup.                                  | Tests require a terminal memoized report and attempted listener/adapter cleanup after each failure. Existing plugin tests verify reverse rollback and resource cancellation after the registrar refactor. |
| Revision comparison alone did not prove actual storage repair for reordered deliveries.     | Exercise all six orders of three revisions, clock skew, self-origin events, and conflicting duplicates against attachments and stored bytes.                                                              |
| Core/root consumers exceeded immutable size limits after registrar capabilities were added. | Share validation, staged-resource cancellation, cleanup-map iteration, and reverse cleanup aggregation. Installed root is 542,329 bytes; core is 197,040 raw and 62,993 gzip, within existing limits.     |
| Parallel verification and an interrupted build left generated inputs incomplete.            | Rebuild, run gates sequentially, retain failed/interrupted history, and require a complete green delivery report.                                                                                         |
| Ticket findings were outside the machine-recognized inspection section.                     | Record the actual inspection here and verify the completed ticket with the final delivery receipt.                                                                                                        |

## Document

### Documentation changed

- `README.md`, `CHANGELOG.md`, and `docs/PERSISTENCE.md` explain installation order, selected
  fields, envelopes, migrations, recovery, conflicts, timing, ownership, disposal, and browser-data
  authority limits.
- `docs/{README,ARCHITECTURE,COMPATIBILITY,PROJECT,RUNTIME_OWNERSHIP,STORES,TESTING}.md` record the
  optional entry, dependency lookup, pre-application boundary, lifecycle, and evidence contracts.
- `example/docs/persistence/index.html`, the stores guide and docs navigation, and the generated
  agent corpus publish the same supported preference-persistence boundary.
- Export/build configuration, reviewed API reports, package/release schemas, optional-entry budgets,
  and installed consumer tests document the shipped public surface and isolated graphs.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                   |
| --------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `src/persist.ts`, package exports, API/declaration reports, and installed ESM/CommonJS/type/import-sentinel checks prove the inert entry and frozen plugin with exact stores dependency.                                                                   |
| AC-02     | Pass   | `test/persist.test.ts` proves synchronous hydration, identity/conflict and pre-application guards, undeclared dependency rejection, async-contract rollback, and failed subscription setup without live publication.                                       |
| AC-03     | Pass   | `test/persist-adapters.test.ts` runs one conformance suite for all four factories; explicit iframe realms and browser storage events prove ownership, normalization, subscription release, and terminal disposal.                                          |
| AC-04     | Pass   | `test/persist-data.test.ts` and canonical-data properties exercise exact envelopes, deterministic UTF-8 serialization, safe identifiers/keys, bounds, prototypes, finite values, and rejected undefined/unsupported data.                                  |
| AC-05     | Pass   | Field/custom codec tests reject overlapping, missing, magic, method, and invalid-value selections; frozen encode snapshots and detached store transactions prevent partial live mutation.                                                                  |
| AC-06     | Pass   | Migration tests prove ascending integer steps, accepted current-version writes, and preserved original bytes/defaults for missing, throwing, cyclic, oversized, invalid, future, and asynchronous inputs.                                                  |
| AC-07     | Pass   | Unit and three-browser recovery cases cover missing/expired data, corrupt/future/decode/migration failures, unavailable/read/quota/write errors, strict rollback, retry/reset, and denied reset removal.                                                   |
| AC-08     | Pass   | Fake-clock tests prove one trailing timer and maximum delay; immediate flush/disposal capture latest state. Cleanup tests cover failures, reentrancy, memoized reports, ownership, and released subscriptions/timers.                                      |
| AC-09     | Pass   | Attachment tests exercise all delivery permutations, actual stale-storage repair, skewed clocks, duplicate/conflicting/self-origin/unrelated events, and no echo; revision properties prove total ordering.                                                |
| AC-10     | Pass   | Shared-memory facades converge in unit tests; `e2e/persist.spec.ts` proves local-storage page convergence and session reload/top-level partitioning in Chromium, Firefox, and WebKit.                                                                      |
| AC-11     | Pass   | Frozen status/observation/disposal tests and source inspection of `report()` prove bounded metadata with no selected values, raw envelopes, namespaces/full keys, causes, or live objects.                                                                 |
| AC-12     | Pass   | All 15 persistence browser cases pass within the full 361-case matrix: initial UI, reload, local convergence, session isolation, controlled expiry, failures, scheduling/flush/disposal, and single live-region updates.                                   |
| AC-13     | Pass   | All 13 installed-package checks pass across import/require, NodeNext/Bundler, QUnit, and three browsers. Maps/types/version and module/sentinel checks pass; persistence consumer is 222,161 raw and 70,664 gzip bytes.                                    |
| AC-14     | Pass   | Public/brain/website/agent docs distinguish local state, shared stores, browser preferences, and server authority. Full coverage/property/static/browser/package/release checks and `npm run check` pass without mutation tooling; whitespace checks pass. |

### Completion audit

All fourteen criteria have one passing evidence row backed by current source, public documentation,
and the green delivery run `2026-09-05T17-09-51-074Z-29895`. The accepted tarball contains 233
files. All 1,014 unit tests, 36 properties, and 361 browser cases pass; every changed executable
line and function is covered. All 13 installed-package checks pass, both clean release builds are
reproducible, and the detector self-tests remain live. Root/core sizes stay within their immutable
budgets, and persistence remains absent from unrelated consumers. The inspection findings are
resolved. Final delivery and phase validation also verify this completed ticket record.

Status: Complete

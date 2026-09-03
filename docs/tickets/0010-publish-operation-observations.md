---
id: 0010
title: Publish action and request observations
status: done
created: 2026-08-30
updated: 2026-09-01
---

# 0010: Publish action and request observations

## Plan

### Problem

Action execution has no public lifecycle record. Request execution exposes only legacy jQuery events
whose details include live `Response` objects and arbitrary thrown values. Behavior and attribute
applications also report action failures through different legacy payloads. Plugins, tests, metrics,
and later inspection need one typed, serializable observation channel without changing the
established event shapes, action results, cancellation behavior, or error identity.

### Current evidence

- `Application.run()` and `DeclarativeApplication.run()` resolve actions independently and invoke
  them without a shared execution boundary or operation identity.
- `executeBackendRequest()` emits `datastar-fetch` and `jquery-star:fetch` once per attempt. Their
  `FetchLifecycleDetail` can contain a live `Response`, an arbitrary raw error, and a full URL.
- Supersession, application cleanup, and an external `AbortController` all abort requests, but the
  public events expose only `aborted: true`; they do not classify the cancellation reason.
- Behavior applications report rejected event actions as the original error. Attribute applications
  report expression failures as `{ error, element, attribute, expression, instance }`. Those 0.x
  payloads are covered by baseline tests and cannot be normalized in place.
- The kernel already owns applications and `subscription` resources, assigns application and render
  identities, and disposes resources exactly once. Ticket 0009 adds transactional plugin
  registrations and application-owned finite tasks, so observations can use the same ownership
  boundary without another global singleton.

### Scope

- Publish a discriminated `StarOperationObservation` union for action and request lifecycle records.
- Add kernel-scoped and application-scoped operation subscriptions plus transactionally staged
  plugin observers.
- Assign one opaque string ID to each action and request from one kernel-owned monotonic sequence.
  Associate request records with the action that invoked them when one exists.
- Emit one `started` record and exactly one `completed`, `cancelled`, or `failed` terminal record
  per operation. Requests may additionally emit bounded `progress` and `retrying` records.
- Normalize cancellation into documented `superseded`, `cleanup`, `external`, and `aborted`
  categories. A cancellation record never carries error metadata.
- Publish frozen, JSON-serializable metadata only. Request records omit headers, bodies, response
  bodies, query strings, URL fragments, credentials, DOM nodes, events, application state, and live
  `Response`, `Error`, or `AbortSignal` objects.
- Preserve original return values and thrown values. Preserve the exact legacy `datastar-fetch`,
  `jquery-star:fetch`, `jquery-star:sse`, and `jquery-star:error` targets, ordering, and payload
  shapes.
- Contain observer and observer-error-handler failures without interrupting an operation or
  recursively publishing another observation.
- Release application subscriptions on application destruction, plugin subscriptions on plugin
  rollback/disposal, and every subscription on kernel disposal. Trace retention remains ticket 0030.

### Out of scope

- Navigation, resource, or mutation operation contracts.
- Changing legacy jQuery event shapes before a documented major boundary.
- Middleware control. Ticket 0011 owns it.
- Retaining observations, response bodies, streamed chunks, stack traces, DOM references, or state
  snapshots.
- Promising IDs that survive a page reload or compare meaningfully across kernels.
- Adding a transport, analytics vendor, logger, in-page console, or server telemetry endpoint.

### Dependencies

- Tickets 0006 and 0008.

### Acceptance criteria

- [x] [AC-01] Public root-package types define a frozen discriminated observation union, observer,
      unsubscribe callback, subscription options, owner metadata, cancellation reasons, request
      metadata, and normalized error metadata without leaking internal kernel types.
- [x] [AC-02] `$.star.observeOperations()` observes one kernel, and `instance.observeOperations()`
      observes one application. Both return idempotent unsubscribe callbacks, validate their inputs,
      preserve registration order, and use a stable snapshot when observers subscribe or unsubscribe
      during delivery.
- [x] [AC-03] Behavior and attribute applications publish one action `started` record and exactly
      one `completed`, `cancelled`, or `failed` terminal record for named, direct-function,
      synchronous, and asynchronous actions. Every record for one action retains its ID and owner.
- [x] [AC-04] Each backend call publishes one request `started` record, zero or more `progress` and
      `retrying` records, and exactly one terminal record across all attempts. A request invoked by
      an observed action carries that action's ID as `parentId`; a direct public request remains a
      valid root operation.
- [x] [AC-05] Supersession, application/subtree cleanup, kernel cleanup, preflight visibility abort,
      retry-delay abort, and an external controller publish `cancelled`, never `failed`, with a
      normalized reason. Existing resolved values, rejected values, and thrown error identity do not
      change.
- [x] [AC-06] Every observation passes a JSON round trip and contains no response/body/chunk,
      request headers/payload/query/fragment/credentials, DOM/event/state, stack/cause, or live
      error/signal references. URL origin/path, action labels, and normalized error messages are
      documented as the remaining application-level redaction points before external export.
- [x] [AC-07] Existing `datastar-fetch`, `jquery-star:fetch`, `jquery-star:sse`, and
      `jquery-star:error` targets, attempt ordering, payload shapes, live-object identity, and
      caught or thrown values remain unchanged in both application modes.
- [x] [AC-08] Observer failures do not alter operation results or prevent later observers from
      running. An optional subscription `onError` receives the original observer failure once;
      failures in that handler are contained and never create a recursive observation.
- [x] [AC-09] Plugin observers stage and commit atomically with their plugin batch. Failed plugin
      installation leaves no observer, application destruction releases its observers, plugin and
      kernel disposal release their observers exactly once, and resource summaries contain no
      orphaned subscription.
- [x] [AC-10] Installed ESM, CommonJS, QUnit, TypeScript NodeNext/Bundler, module-browser, and
      UMD-browser consumers can subscribe using only the shipped root package. Public API review,
      coverage/property/static/browser/package/release gates, `npm run check`, and
      `git diff --check` pass without mutation testing.

### Design

Add a kernel-owned observation hub. It owns the operation sequence and three subscription scopes:
kernel, plugin, and application. The hub takes a stable subscriber snapshot for each delivery,
catches each observer independently, and invokes that subscription's optional `onError` outside the
observation channel. Records are constructed centrally, recursively frozen, and checked by tests
against a JSON round trip before the same immutable value is delivered in registration order.

Both application implementations route `run()` through one kernel action boundary. The boundary
allocates the action ID, publishes `started` after the operation is owned, awaits synchronous or
asynchronous results, and publishes one terminal record before resolving or rethrowing the original
value. An internal action scope—not a public live object—is added to `StarContext` plumbing so a
backend request can record `parentId` and report a terminal cancellation to its direct parent action
without changing the public expression context.

`executeBackendRequest()` allocates one request ID before the first attempt and retains it through
retries and streaming progress. New operation records publish beside, not through, the legacy jQuery
lifecycle helpers. Terminal request publication occurs after pending/error state and request
ownership have reached their documented terminal state. Legacy events keep their current per-attempt
behavior and live values.

The public surface is `$.star.observeOperations(observer, options?)` for kernel scope and
`instance.observeOperations(observer, options?)` for application scope. `StarPluginRegistrar` adds
`observeOperations(observer, options?)`; those registrations are staged with actions, directives,
helpers, hooks, and cleanup callbacks and become visible only when the whole plugin batch commits.
Every API returns or owns the same idempotent unsubscribe primitive.

### Decisions

- IDs are opaque strings unique only within one kernel lifetime. They are not timestamps, database
  keys, or cross-page correlation IDs.
- Action and request records are separate operations. A request may name its parent action, but
  nested operations never reuse an ID.
- New records use categorical cancellation and normalized metadata. Raw values remain available only
  through unchanged legacy events and ordinary caught/rejected values.
- Query strings and fragments are omitted even when they appear harmless. Headers, payloads,
  response bodies, stream chunks, state, elements, events, stacks, and causes are never copied into
  observations.
- The hub is synchronous and non-blocking with respect to observer return values. Returned promises
  are not awaited; a rejected returned promise is handled through the same contained `onError` path.
- No observation history is retained. Ticket 0030 must consume this public stream if it later
  approves bounded tracing.

### Security and accessibility

- Observation records are data-only and omit common credential, personal-data, and response-body
  sources by construction. Documentation warns that path segments, action labels, and error messages
  can still contain application data and need application-level redaction before export.
- Observer code receives no new authority over DOM, state, requests, or cancellation.
- Observation delivery adds no visual interface, focus behavior, announcements, or keyboard
  handling. Existing error/status presentation remains unchanged and retains its current
  accessibility tests.

### Risks

- Duplicating legacy and new events can double-report metrics. Documentation must distinguish them.
- Progress events can be high volume. Observation delivery must not retain response bodies or
  chunks.
- Wrapping both application modes at different call sites can double-count nested action helpers.
  One kernel action boundary and explicit nested-operation tests must prove exactly-once records.
- A custom thenable or observer-returned promise can fail after the synchronous caller returns.
  Settlement and observer-error handling must attach once without creating unhandled rejections.
- Plugin observers participate in transactional installation. Committing them before all other
  registries would expose a partial plugin on failure.
- Error normalization can accidentally alter or replace the value an application catches. Tests must
  compare strict identity on every failure path.

### Verification plan

- Validate this Plan before changing behavior.
- Add focused hub tests for identity allocation, frozen snapshots, JSON serialization, ordering,
  reentrancy, idempotent unsubscribe, synchronous throws, rejected observer promises, `onError`
  failure, and disposal.
- Test behavior and attribute actions across named/direct, synchronous/asynchronous,
  success/failure/cancellation, nested action, and expression-helper invocation paths.
- Test request success, streamed progress, retries, terminal HTTP/network failure, every abort
  source, action parentage, direct request use, and unchanged pending/error state transitions.
- Run the existing legacy runtime, declarative, fetch, expression-engine, plugin, kernel, Datastar
  SDK, public-baseline, and API-extractor suites to prove compatibility.
- Expand installed tarball consumers to compile and execute both subscription scopes from the root
  package in ESM, CommonJS, QUnit, NodeNext, Bundler, module browsers, and the UMD browser global.
- Run focused tests, `npm run quality:fast`, ticket Code validation, coverage, properties,
  three-engine browser quality, package quality, release reproducibility, `npm run check`, ticket
  Test/Document validation, and `git diff --check`.

### Planned files

- `src/observation.ts`: Public record types, normalization, operation hub, subscription snapshots,
  and contained observer-error handling.
- `src/kernel.ts`: Own the hub, operation sequence, application subscription scope, resource ledger
  entries, and final disposal.
- `src/runtime.ts`, `src/declarative.ts`: Route both public `run()` implementations through one
  action boundary and expose application-scoped subscriptions.
- `src/fetch.ts`: Publish one request lifecycle across attempts while retaining all legacy events
  and return/error behavior.
- `src/plugin.ts`: Stage plugin operation observers transactionally and release them with the plugin
  host.
- `src/types.ts`, `src/index.ts`: Publish observation APIs and types without exposing internal
  execution scopes.
- `test/observation.test.ts`: Hub ordering, serialization, immutability, error containment,
  reentrancy, ownership, and disposal proof.
- `test/{runtime,declarative,fetch,plugin,kernel,expression-engine,datastar-sdk}.test.ts`: Action,
  request, parentage, cancellation, compatibility, and lifecycle integration.
- `test/property/observation.property.test.ts`: Generated operation sequences, subscription churn,
  terminal uniqueness, and JSON-safe record invariants.
- `test/public-baseline.test.ts`, `etc/jquery-star.api.md`, `quality/`, `schema/`: Reviewed public
  API, installed behavior baseline, evidence census, and measured budgets.
- `scripts/quality-package.mjs`, `test/package-release-hardening.test.mjs`: Root-package consumer
  and declaration proof across every supported module/test/browser shape.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`: Usage, ownership, legacy
  compatibility, redaction boundaries, and test guidance.
- `docs/tickets/0010-publish-operation-observations.md`: Phase state, changed-file ledger, commands,
  findings, and criterion evidence.

## Code

### Changed-file ledger

| File                                                                            | Purpose                                                            |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `docs/tickets/0010-publish-operation-observations.md`                           | Open Code phase and keep implementation/evidence ledger current.   |
| `src/observation.ts`                                                            | Define the public operation records and kernel-owned delivery hub. |
| `src/{kernel,runtime,declarative,fetch,plugin,types,index}.ts`                  | Connect action, request, application, plugin, and root APIs.       |
| `test/observation.test.ts`                                                      | Prove observation identity, delivery, serialization, and cleanup.  |
| `test/{runtime,declarative,fetch,plugin,kernel}.test.ts`                        | Prove integration and preserve existing lifecycle behavior.        |
| `test/property/observation.property.test.ts`                                    | Generate action/request terminal and serialization invariants.     |
| `quality/test-evidence.json`                                                    | Map observation requirements to exact unit and property tests.     |
| `config/quality-budgets.json`, `quality/public-baseline.json`                   | Review measured bundle growth and freeze the expanded public API.  |
| `etc/jquery-star.api.md`                                                        | Review the generated root-package declaration surface.             |
| `scripts/quality-package.mjs`                                                   | Exercise observation consumers in every shipped module shape.      |
| `README.md`, `docs/{ARCHITECTURE,BACKEND,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md` | Document public usage, ownership, compatibility, and redaction.    |

### Design changes

Implementation follows the validated Plan. The hub uses one kernel sequence for action and request
IDs, and a separate application-owner sequence. Records are constructed and recursively frozen in
one module. Application and plugin subscriptions enter the existing kernel resource ledger instead
of adding a second cleanup system.

Both application constructors register their operation owner before setup runs. This preserves
initialization actions and lets an already installed plugin observe them, while the existing outer
application transaction releases the provisional owner if construction fails. Review also found that
behavior-mode destruction cancelled only requests explicitly marked `cleanup`; attribute mode
already cancelled the complete application root. Behavior mode now calls the same root cancellation
path, which is required for the documented application-ownership contract.

The public package proof now receives operation records in ESM and QUnit, executes both subscription
scopes in CommonJS and module/UMD browsers, and compiles the complete observer surface under
NodeNext and Bundler. The new contract adds 7–8 KiB to UMD and installed root bundles. Because the
repository still has no committed immutable budget base, the reviewed first-baseline ceilings are
412 KiB for UMD and 489 KiB for the installed root bundle; no unrelated ceiling moved.

## Test

| Command                                                                     | Result | Evidence                                                                                                   |
| --------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation                                                | Pass   | The expanded Plan passed before source behavior changed.                                                   |
| Focused observation, kernel, plugin, runtime, declarative, and fetch suites | Pass   | 160 focused tests passed before the full suite.                                                            |
| `npm run test:unit`                                                         | Pass   | 625/625 tests passed across 80 files.                                                                      |
| `npm run lint` and `npm run typecheck`                                      | Pass   | ESLint, application TypeScript, and registry TypeScript passed without a live deviation.                   |
| `npm run test:coverage`                                                     | Pass   | Changed-line/function gate passed; `src/observation.ts` has 100% statements, lines, and functions.         |
| `npm run test:property`                                                     | Pass   | 18/18 properties passed with recorded seed `430043`, including both new operation properties.              |
| First `npm run test:package:quality`                                        | Review | All consumers passed; UMD and installed-root measurements exceeded their pre-feature provisional ceilings. |
| Final `npm run test:package:quality`                                        | Pass   | 13/13 checks passed, including ESM, CommonJS, QUnit, NodeNext, Bundler, and three browser engines.         |
| First `npm run quality:fast`                                                | Review | Every gate but source policy passed; two test-only inline lint suppressions lacked approved deviations.    |
| Current `npm run quality:fast`                                              | Pass   | All five gates passed in run `2026-09-01T14-12-05-686Z-70386`.                                             |
| Code-phase ticket validation                                                | Pass   | Ticket 0010 passed against fast run `2026-09-01T14-13-22-060Z-78044` before moving to Testing.             |
| First `JQS_E2E_WORKERS=3 npm run quality:delivery`                          | Review | Run `2026-09-01T14-14-56-149Z-85803` passed 11/12 gates; only this ticket's Prettier check failed.         |
| Package, release, and browser gates in the first delivery run               | Pass   | Package passed 13/13 consumers, release passed 7/7 checks, and all eight browser projects passed.          |
| Quality temporary-directory audit                                           | Pass   | No `jqstar-package-*` or `jqstar-release-*` directories remained after the isolated gates completed.       |
| Corrected-tree `JQS_E2E_WORKERS=3 npm run quality:delivery`                 | Pass   | All 12 gates passed in run `2026-09-01T14-22-54-708Z-7602`; its receipt binds one unchanged 467-file tree. |
| Testing-state `JQS_E2E_WORKERS=3 npm run quality:delivery`                  | Pass   | All 12 gates passed in run `2026-09-01T14-30-21-629Z-29168` with identical start/end tree fingerprints.    |
| Delivery receipt and Test-phase ticket validation                           | Pass   | The receipt matched the current tree and ticket 0010 passed the fail-closed Test validator.                |
| First done-state `npm run check`                                            | Review | Eleven gates passed; static delivery rejected one new documentation word during spelling analysis.         |
| Corrected `npm run quality:static:delivery`                                 | Pass   | All 28 static gates passed in report `static-2026-09-01T14-46-56-069Z-78582`.                              |

### Inspection ledger

| Finding                                                                                          | Resolution                                                                                                                |
| ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| Behavior-mode destruction did not cancel every request owned by the destroyed application root.  | Reused the declarative root-cancellation path and added behavior cleanup/cancellation observation coverage.               |
| Two rejected-thenable tests initially required inline ESLint suppressions.                       | Replaced the fixtures with typed custom thenables; source policy now passes without a deviation or suppression.           |
| Installed UMD and root-consumer bundles exceeded their provisional pre-feature ceilings.         | Measured the shipped artifacts and raised only the two affected first-baseline ceilings to tight next-KiB limits.         |
| The first delivery run found this ticket was not formatted after its final evidence row changed. | Formatted the ticket, retained the failed attempt in this ledger, and passed the complete corrected-tree delivery matrix. |
| Historical package/release runners had leaked large temporary workspaces.                        | Both runners now use owned cleanup; repeated audits after package and release gates find zero matching directories.       |

## Document

### Documentation changed

- `README.md` documents kernel- and application-scoped subscription examples, record narrowing,
  cancellation categories, observer isolation, legacy-event compatibility, and export redaction.
- `docs/ARCHITECTURE.md` records the kernel-owned observation hub, shared operation sequence,
  ownership scopes, immutable delivery snapshots, and action/request relationship.
- `docs/BACKEND.md` defines request phases, retry identity, cancellation classification, preserved
  Datastar/jQuery events, and the metadata that is intentionally omitted.
- `docs/PROJECT.md` lists operation observation as a current platform capability while leaving
  middleware, retained traces, and developer tools in their later roadmap tickets.
- `docs/RUNTIME_OWNERSHIP.md` assigns application and plugin subscriptions to their resource owners
  and documents disposal behavior for observers and requests.
- `docs/TESTING.md` defines observation invariants, generated-property coverage, unchanged legacy
  event proof, installed-package consumers, and the no-mutation default.
- `etc/jquery-star.api.md` and `quality/public-baseline.json` record the reviewed declaration and
  package surfaces, measured artifacts, supported consumers, and passing package/release evidence.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                | Result |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `src/observation.ts`, root exports, the reviewed API report, and public-baseline tests define and freeze the discriminated action/request observation contract without exposing kernel internals.                                       | Pass   |
| AC-02 | Observation and kernel tests prove kernel/application scope, validation, ordered stable snapshots, reentrant subscription changes, and idempotent unsubscribe behavior.                                                                 | Pass   |
| AC-03 | Observation, runtime, and declarative tests prove exactly one start and terminal action record for named/direct and synchronous/asynchronous action paths with stable IDs and owners.                                                   | Pass   |
| AC-04 | Fetch/observation tests prove one request ID across progress and retry attempts, exactly one terminal record, action parentage, and valid direct root requests.                                                                         | Pass   |
| AC-05 | Fetch, runtime, declarative, and observation tests cover supersession, subtree/application/kernel cleanup, visibility, retry delay, external abort, generic abort, and preserved result/error identity.                                 | Pass   |
| AC-06 | Unit and generated property tests prove frozen records survive a JSON round trip and reject query, fragment, header, payload, credential, response, chunk, DOM, event, state, stack, cause, error, and signal leakage.                  | Pass   |
| AC-07 | Existing Datastar SDK, fetch, runtime, declarative, and expression tests retain the legacy event targets, ordering, payload and live-object identity, and caught/thrown values in both application modes.                               | Pass   |
| AC-08 | Observer tests cover synchronous throws, rejected returns, later-observer delivery, original `onError` values, failing error handlers, non-recursion, and unchanged operation settlement.                                               | Pass   |
| AC-09 | Plugin and kernel tests prove transactional observer staging, failed-install rollback, application/plugin/kernel release, idempotent disposal, and an empty final subscription resource ledger.                                         | Pass   |
| AC-10 | Installed ESM, CommonJS, QUnit, NodeNext, Bundler, module-browser, and UMD-browser consumers passed with coverage, property, static, browser, package, and reproducible-release gates in delivery run `2026-09-01T14-30-21-629Z-29168`. | Pass   |

### Completion audit

The public observation surface, action/request integration, cancellation taxonomy, redaction, legacy
compatibility, observer containment, transactional ownership, installed consumer matrix, package
measurements, focused and generated tests, and affected documentation all have direct current
evidence. Every acceptance criterion is checked and mapped once. Code and Test validators passed
against exact-tree reports, and no implementation, test, or documentation work remains.

Status: Complete

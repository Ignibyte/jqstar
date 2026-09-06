---
id: 0030
title: Add bounded inspection and tracing
status: done
created: 2026-08-30
updated: 2026-09-06
---

# 0030: Add bounded inspection and tracing

## Plan

### Problem

Typed observations can feed logs but do not provide a supported snapshot of installed plugins,
applications, owned resources, or optional services. Ad hoc inspection usually reaches into private
maps and keeps live objects alive. Unbounded traces can retain state values, URLs, headers, bodies,
HTML, DOM nodes, errors, credentials, and user activity long after an operation ends.

The supported facility therefore has two jobs that must not be conflated: produce a current,
read-only, data-only inventory, and optionally retain a small sequence of already-redacted operation
summaries. Neither job may become a mutable runtime console or a telemetry system.

### Current evidence

- Ticket 0010 defines versioned action/request observations, operation IDs, error categories,
  observer isolation, and kernel ownership. Inspection must consume that public seam rather than
  patch actions, fetch, or private application maps.
- Tickets 0005, 0006, 0008, and 0013 define kernels, applications, plugins, ownership, modular
  entrypoints, and public terminal disposal reports.
- Tickets 0018 and 0019 ship stores and persistence. Decision 0020 retains server patches and
  declines 0021–0022. Decision 0023 retains browser navigation and existing bridges, declining
  0024–0029. Neither decision approves a new utility or service.
- The package currently has no supported inspection entrypoint, trace retention owner, serialized
  snapshot schema, or service-summary registration contract.
- Ticket 0014's installed, runner-neutral harness and ticket 0004's package consumers can prove that
  the facility uses public artifacts and does not enter applications that never import it.

### Activation gate

Before Code, import the final public operation, disposal, and optional-service contracts from their
owning tickets. List every shipped official service and its disposition: redacted serializer,
counts-only serializer, or no inspectable state with a reason. Plan-validate that list. A declined
resource/navigation track creates no placeholder serializer, public type, or misleading summary.

### Activated contracts (2026-09-05)

The operation source is the final public `StarOperationObservation` contract from
[0010](0010-publish-operation-observations.md); it has no timestamp. Inspection measures elapsed
capture time only. Terminal cleanup uses `StarDisposalReport` from the completed kernel/disposal
work, with category counts copied after cleanup finishes. Raw owner and error strings never cross
this seam. The final [navigation decision](../decisions/NATIVE_NAVIGATION.md) and
[resource decision](../decisions/RESOURCE_STRATEGY.md) close both conditional tracks.

| Service                      | Snapshot                                                                                                                                                   | Trace                                                                                              |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| UI `ui`                      | No separate serializer: the public plugin inventory already records installation/version; private WeakMap controllers/timers have no safe enumerable view. | No new UI observer; action observations already cover actions.                                     |
| Datastar `core.datastar`     | No separate serializer: the plugin inventory and generic protocol/request counts already describe this stateless adapter.                                  | Generic request observations only.                                                                 |
| Stores `core.stores`         | Service-authored aggregate record/subscription/task/effect counts, no names or values.                                                                     | Existing store operation categories; no name/resource text by default.                             |
| Persistence `core.persist`   | Aggregate attachment/status counts, no keys, namespace values, origin IDs, payloads or codecs.                                                             | Counts-only initially; no invented persistence event bus.                                          |
| Turbo `core.turbo`           | Controller-authored active-render/observer/waiter/history counts appropriate to that host.                                                                 | Existing public lifecycle observation projected to fixed categories; subscribe only while enabled. |
| htmx `core.htmx`             | Controller-authored request/render/history/observer/waiter counts.                                                                                         | Existing public lifecycle observation projected to fixed categories; subscribe only while enabled. |
| Generic protocols/middleware | Kernel-authorized aggregate profile/body/middleware counts and capability categories.                                                                      | Existing request observations.                                                                     |
| Expression engine/CSP        | Installed capability category; no source/cache internals or placeholder service.                                                                           | Existing action observations; no parser/evaluator tracing.                                         |
| Scheduler/render ownership   | Existing owned-kind and pending-task/enhancement counts, no callbacks/roots.                                                                               | Existing operations and explicitly selected bridge events.                                         |
| Testing helpers              | Not installed services; no serializer.                                                                                                                     | No implicit harness observer used to claim default-off.                                            |

The current 1.1.0 package is an unpublished candidate: no local tags exist and the public registry
lookup returned E404 on 2026-09-05. Keep that candidate version and update its API/release
contracts; the roadmap's version headings describe planned stages. This ticket authorizes no
publication.

### Frozen API and ownership design

- `attachInspector($)` from `jquery-star/inspect` returns a `StarInspector` lease with `snapshot`,
  `enableTrace`, `disableTrace`, `readTrace`, `exportTrace`, `clearTrace`, `allowField`,
  `denyField`, and `dispose`. Import does not install anything. Attaching after application startup
  is supported.
- Add the generic public `$.star.metadata()` access capability and an internal optional adapter
  builder. The installed static capability finds its own kernel, including from another module copy;
  it avoids importing a trusted expression runtime into the inspection/CSP graph. Existing realm
  state stores expression runtimes, not installations, and will not be repurposed.
- The adapter reads bounded inventories/counts, visits explicit service metadata registrations,
  observes public operations, owns cleanup, and acquires named versioned attachment slots. It
  exposes no kernel, jQuery, document, application, store, or mutable registry. A separate scalar
  sequence handle survives collector replacement, so identities do not reset while the kernel lives.
  It allocates only when requested. Final disposal drops its kernel reference and fills a data-only
  terminal handle.
- The `core.inspect` versioned attachment slot creates one collector per kernel across independent
  imports and leases. Slot acquisition/release is transactional and each lease clears its release
  reference. Last release closes the collector; kernel cleanup closes all leases and drops their
  adapter/release references without disposing another slot or kernel.
- The first `enableTrace` call claims control for that lease. Other leases may read but cannot
  replace configuration, clear, change policy, or disable its trace. Disposing the controller clears
  trace/policies and releases control; surviving clients may claim it. Final disposal is idempotent.
- Add optional `registrar.metadata` during plugin staging. A definition's namespace must exactly
  match its plugin and its schema must be `jqstar-service-counts/1`. Duplicate registration, schema
  mismatch, or invalid callbacks fail before activations. Registration disappears with its plugin;
  collectors retain no registration or view between reads. Older compatible registrars may omit this
  additive capability; current inspection requires the current core metadata capability.
- A service creates a frozen counts view with a fixed boundary category; its serializer receives
  only a validated frozen copy. Counts use a finite versioned key set (installation, capabilities,
  records, subscriptions, effects, tasks, attachments, pending/disabled/disposed status, active
  renders, observers, waiters, history, requests, listeners). Output contains only schema, boundary,
  and nonnegative safe-integer counts. Inspection rejects accessors, symbols, unexpected keys,
  prototypes, cycles, recursive reads, oversized output and exceptions with bounded counters.
- Turbo and htmx may offer their existing public observation subscription through this registration.
  Only explicitly selected trace kinds subscribe; no historical bridge records are copied. Other
  services use existing action/request/store observations or counts only, as listed above.

### Frozen data, bounds and policy

- Snapshots use `jqstar-inspection-snapshot/1`; exports use `jqstar-inspection-trace/1`. Include
  candidate version, opaque kernel ID, monotonically increasing snapshot/record sequence, lifecycle,
  inventory omission counts, ownership and pending-work counts, service summaries, trace settings,
  counters, policy ID and final disposal category totals. Application IDs are the existing public
  operation-owner IDs; do not infer them from disposal owner text.
- Maximum snapshot inventories: 256 applications, 256 plugins, 32 services; 4,096 bytes per service
  and 262,144 bytes for the complete JSON snapshot. Plugin namespace/version strings have fixed
  positive grammars and 96/32-character caps. Omitted or failed summaries have explicit counts.
- Trace starts disabled with no observer, timer, array/string buffer or record. Enable requires
  `maxEntries` from 1 through 4,096 and `maxBytes` from 2 through 1,048,576. Bytes mean exact UTF-8
  JSON for the retained records array, including brackets and commas. A single record that cannot
  fit is refused; otherwise evict oldest until both limits hold.
- Fixed kinds are action, request, store, turbo, htmx and policy. Fixed outcomes are pending,
  completed, cancelled and failed. Optional kind/outcome filters and `everyNth` (1–1,000,000) run
  before retention. Sampling positions are per kind; counters saturate at the maximum safe integer.
  Clear does not reset sequence, sampling or counters. Export/read do not clear, sample or write.
- Capture only generated operation/parent/owner IDs, fixed phases/outcomes/categories, request
  method/status/attempt, bounded numeric sizes/removal counts and elapsed capture milliseconds.
  Never retain an original observation or copy error names/messages, URLs, state, arbitrary fields,
  requests, callbacks, DOM or any hard-denied value. Read own data descriptors without coercion.
- Permitted sensitive fields are only `actionCapability` and `storeName`, with lower-camel ASCII
  identifier grammar validated before length handling. Qualified action labels and filename-like
  strings are not eligible for opt-in. `allowField` requires active trace control, a fixed purpose
  (`debugging` or `support`), explicit maximum length (1–96), retention/export booleans and relative
  expiry (1–3,600,000 milliseconds). Retention must be explicitly granted to capture; export
  permission is separate. No policy can authorize a hard-denied field.
- Policies apply only to future records, use monotonic policy identifiers, and generate fixed
  policy-change summaries under normal trace bounds/filters. Revocation/replacement synchronously
  removes records carrying the affected field. At most one owned timer schedules earliest expiry
  against the monotonic performance clock. Expired fields cannot be read/exported even if the event
  loop delayed cleanup; delayed timer cleanup is not represented as exact real-time erasure.
  Disable/disposal clears all policies.
- Invalid configuration reports a fixed error and increments a fixed failure category. Capture,
  service, clock, export and cleanup failures cannot escape into application work, retain thrown
  values, log automatically or recursively trace inspection diagnostics. A reentrant read is refused
  with a fixed category. Cleanup continues after an individual failure; its bounded report reaches
  kernel disposal when kernel cleanup owns the call.

### Scope

- Publish a side-effect-free `jquery-star/inspect` entrypoint with versioned, JSON-safe data types
  for one kernel snapshot, application/plugin summaries, operation counters, ownership counts,
  installed official-service summaries, and terminal disposal data. Snapshot construction never
  exposes or retains the kernel, jQuery, DOM, functions, promises, errors, requests/responses,
  controllers, stores, caches, stages, or service records.
- Make inspection an explicit per-kernel attachment. Attaching, reading, clearing, exporting, and
  disposing are idempotent where applicable; multiple inspector clients receive independent leases
  over one kernel-owned collector and cannot dispose the kernel or one another.
- Define a stable `jqstar-inspection-snapshot/1` schema. Include library/schema versions, an opaque
  kernel instance ID, monotonically increasing snapshot/operation sequence, lifecycle state, bounded
  counts, plugin/application capability names, and service summaries. Do not include source markup,
  selectors, application state, arbitrary option values, or private object keys.
- Let shipped official services register a namespaced serializer during service installation. A
  serializer receives a frozen counts/metadata view supplied by its service—not the kernel, trace
  buffer, or redaction policy internals—and returns a schema-versioned plain summary within fixed
  depth, key-count, string, and byte limits. Duplicate namespaces and schema mismatch fail service
  installation transactionally.
- Add an explicitly enabled, per-kernel bounded trace over ticket-0010 observations and approved
  service events. Disabled tracing installs no observation subscription, timer, buffer, or retained
  record. Enabling requires positive entry and byte limits; the library provides conservative hard
  ceilings that configuration cannot exceed.
- Serialize and redact at capture time. Retained records use a versioned allowlist of operation ID,
  sequence, kind, phase/outcome, public capability/category, status/error category, bounded timing,
  and size/count metadata. They never keep or lazily close over an original observation.
- Define deterministic filters and sampling (`kinds`, `outcomes`, and every-Nth record per kind)
  that execute before retention. Record skipped counts by category without creating one record per
  skip. Evict oldest records until both exact UTF-8 JSON byte and entry bounds hold; an individually
  oversized record is counted and refused.
- Redact by default and in every export: remove URL path/query/fragment, headers, validators,
  cookies/auth, request/response bodies, HTML, DOM identity, selectors, signal/store/resource
  values, form values, stack/cause/message text, filenames, and arbitrary service fields. Expose
  only bounded categories, opaque locally scoped IDs, and counts.
- Permit sensitive fields only through an explicit per-kernel capability policy that names each
  schema field, purpose, maximum length, retention/export permission, and expiry. It cannot enable
  bodies, credentials, cookies/auth headers, HTML/DOM, arbitrary state, stacks, or values excluded
  by the hard denylist. Changes are observable as policy-change summaries, apply only to future
  records, and disabling clears records containing the field before returning.
- Export a deep-copied schema document with current bounds, dropped/evicted counts, redaction-policy
  identifier, and records in sequence order. Export must not change sampling, clear state, expose
  mutable references, or perform a network/file write.
- Isolate observation, serializer, filter, and export failures. Contain the failure, increment one
  bounded category counter, and prevent inspection's own diagnostics from recursively generating
  trace records. Application actions and service cleanup continue unchanged.
- Dispose leases and collector ownership exactly once. Final collector disposal unsubscribes
  observations, unregisters service views, cancels timers/tasks, clears policies and buffers, drops
  serializer references, and contributes bounded cleanup failures to the public disposal report.

### Out of scope

- A visual DevTools UI, browser extension, remote telemetry/backend, automatic log shipping, file
  writer, source maps, replay, time travel, performance profiler, or mutable runtime console.
- Capturing arbitrary application values, HTML, network payloads, credentials, DOM screenshots, full
  URLs, error messages/stacks, or user input even when a client asks for “debug everything.”
- Inventing inspection adapters for declined/unshipped optional services or exposing third-party
  plugin internals without their own explicit serializer.

### Dependencies

- Tickets 0010, 0017, 0019, 0020, and 0023. Approved resource or navigation implementations must
  also finish before their inspection adapter is frozen.

### Acceptance criteria

- [x] [AC-01] Activation records every shipped official service and exact serializer/no-serializer
      disposition, links the final operation/disposal contracts, and Plan-validates before Code;
      declined services leave no placeholder API or graph edge.
- [x] [AC-02] `jquery-star/inspect` is side-effect-free until attached to an explicit kernel. Root,
      core, UI, Datastar, CSP, testing, and applications that do not import it contain no inspection
      module, subscription, buffer, timer, or retained record.
- [x] [AC-03] A `jqstar-inspection-snapshot/1` snapshot is deterministic, JSON-safe and deep-copied;
      schema validation and adversarial serializers prove it contains no mutable/live kernel,
      jQuery, DOM, function, promise, Error, request/response, state, cache, stage, or service
      object.
- [x] [AC-04] Application, plugin, ownership, operation, disposal, and official-service summaries
      expose only documented opaque IDs, public names/categories, lifecycle states, counts, bounded
      timing/size metadata, and schema versions; totals reconcile with public ownership reports.
- [x] [AC-05] Service serializers are installed/uninstalled transactionally under unique namespaces,
      receive only frozen approved metadata, meet depth/key/string/byte limits, and cannot interrupt
      application/service behavior through throw, recursion, cycles, accessors, or oversized output.
- [x] [AC-06] Tracing is off by default in every environment. Disabled tracing has zero retained
      records and no observation subscription. Explicit enablement enforces positive configured
      bounds beneath documented hard ceilings.
- [x] [AC-07] Filtering and deterministic every-N sampling occur before retention. Sustained and
      concurrent high-volume observations never exceed exact entry or serialized UTF-8 byte bounds;
      oldest-first eviction and refused/filtered/evicted counters are deterministic.
- [x] [AC-08] Capture-time allowlisting and hard-deny tests prove default records/exports omit URL
      components, headers/validators/credentials, bodies/HTML/DOM/selectors, input/state/service
      values, arbitrary errors/stacks/paths, and original observations, including through thrown
      accessors, `toJSON`, symbols, cycles, and nested objects.
- [x] [AC-09] Sensitive opt-in names a permitted field, purpose, bounds, retention/export behavior,
      and expiry; policy changes are observable, affect future records only, are reversible, cannot
      override hard-denied fields, and remove affected retained data synchronously when disabled.
- [x] [AC-10] Snapshot/export returns an immutable copy in sequence order with schema, bounds,
      policy ID, and aggregate counters, performs no network/file write, and cannot mutate collector
      state. Clear is explicit, deterministic, and does not reset monotonic sequence identity.
- [x] [AC-11] Observer/serializer/filter/export failures are contained and counted without recursive
      observations, unbounded error detail, application interruption, or cleanup loss.
- [x] [AC-12] Multiple client leases coexist. Lease/final disposal is idempotent and releases
      subscriptions, registrations, tasks/timers, policies, buffers, and serializer references once;
      bounded cleanup failures appear in the public terminal disposal report.
- [x] [AC-13] Installed Node, QUnit, and Chromium/Firefox/WebKit consumers prove public-only
      attachment, snapshots/traces, high-volume bounds, redaction, optional service inclusion,
      exclusion/tree-shaking, and cleanup from the exact packed artifact.
- [x] [AC-14] Focused, coverage, property/static, browser, package, release, `npm run check`, ticket
      phase validation, and `git diff --check` pass without mutation testing.

### Design

One kernel-owned collector is created only by explicit attachment. Public clients hold small leases
that can request snapshots and, when authorized, configure/read the collector. The collector
consumes ticket-0010's already structured observation seam and public ownership/disposal summaries;
it never discovers state by walking private objects.

Snapshot and trace builders copy allowed scalar fields into null-prototype records, validate bounds,
serialize canonically, measure UTF-8 bytes, and then retain only the serialized-safe result. The
collector keeps a deque plus exact byte count and aggregate counters. This makes eviction
independent of JavaScript object overhead while preventing a retained record from closing over
runtime state.

Official services own the creation of their frozen summary view. The inspection adapter supplies
namespace/schema validation and output bounds. This direction keeps inspection from gaining broad
authority over stores, persistence, resource caches, or navigation internals.

### Decisions

- Inspection is optional, read-only, per-kernel, data-only, and versioned.
- Tracing is disabled by default and has hard entry/byte ceilings even when enabled.
- Redaction is an allowlist at capture time; exports do not attempt late best-effort scrubbing.
- Credentials, payloads, HTML/DOM, arbitrary state, and stacks remain unavailable under opt-in.
- Optional services register bounded summaries; inspection does not reach into them.
- Export produces data for the caller and performs no transport.

### Security and accessibility

- Inspection data is sensitive even after redaction. Opaque IDs are kernel-local, regenerated on
  reload, and not advertised as secure correlators. Documentation warns against publicly exposing an
  export endpoint.
- Policy configuration is runtime authority and must be held by application tooling, not markup or
  expression helpers. The entrypoint adds no declarative action that enables tracing or disclosure.
- This ticket adds no UI. Its future DevTools consumer must preserve redaction in text, attributes,
  clipboard, and export and meet ticket 0031's accessibility contract.

### Risks

- URLs and errors leak secrets through surprising fields. Use a positive scalar-field allowlist and
  adversarial object corpus rather than recursive sanitization.
- JavaScript object size is not deterministic. Enforce the byte limit on canonical UTF-8 JSON plus
  an independent entry limit and publish exactly what the bound measures.
- Inspector diagnostics can inspect themselves. Suppress collector-origin observations and keep
  aggregate failure counters rather than tracing failures.
- A service serializer can accidentally become a private API. Pass only a frozen public summary view
  and test adapters from the packed package boundary.

### Verification plan

- Model/property-test lease, sequence, filter, sampling, eviction, byte accounting, clear, policy,
  serializer, failure, and disposal state machines with fake time and high event volume.
- Run an adversarial redaction corpus containing secrets in every excluded field, accessors,
  prototypes, symbols, cycles, `toJSON`, Errors, DOM, requests/responses, and oversized strings.
- Run installed Node/QUnit/three-browser consumers with two kernels, multiple leases, every shipped
  official service, disabled production-like configuration, and bundle/source graph inspection.
- Run focused/fast/coverage/property/static/browser/package/release/check/ticket/diff gates without
  mutation testing.

### Planned files

- `src/kernel.ts`, `src/runtime.ts`, `src/types.ts`, `src/core.ts`, `src/index.ts`,
  `src/kernel-metadata.ts`, `src/metadata-types.ts`, `src/plugin.ts`, `src/observation.ts`: generic
  lazy metadata/lifetime capability, public opaque identities and transactional registration.
- `src/service-metadata.ts`, `src/ui/index.ts`, `src/datastar.ts`, `src/stores.ts`,
  `src/persist.ts`, `src/turbo.ts`, `src/htmx.ts`: service-owned frozen aggregate views and existing
  bridge events.

- `src/inspect/{index,collector,snapshot,trace,redaction,service-adapter,types}.ts`: public API,
  versioned data schemas, lease ownership, trace bounds, policy, adapters, and disposal.
- Package export/build/type/API/census/size configuration for `jquery-star/inspect` and proof that
  other entrypoints exclude it.
- Snapshot/trace JSON schemas plus fixtures and unit/property/adversarial/conformance tests.
- Installed Node/QUnit/browser consumers and optional-service adapter fixtures.
- Public inspection/privacy/API documentation, project architecture/ownership/testing/security docs,
  and this ticket.

## Code

### Changed-file ledger

| File                                                                                                                                                                                              | Purpose                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `src/metadata-types.ts`, `src/metadata-adapter.ts`, `src/kernel-metadata.ts`                                                                                                                      | Generic metadata, independent scalar sequence/terminal handles and shared attachment ownership.                                               |
| `src/kernel.ts`, `src/runtime.ts`, `src/types.ts`, `src/core.ts`, `src/index.ts`, `src/observation.ts`                                                                                            | Lazy public metadata capability and existing application-owner correlation.                                                                   |
| `src/plugin.ts`, `src/service-metadata.ts`                                                                                                                                                        | Transactional service metadata staging and service-owned view helper.                                                                         |
| `src/stores.ts`, `src/persist.ts`, `src/turbo.ts`, `src/htmx.ts`                                                                                                                                  | Aggregate service views, counted store resources and existing bridge event subscriptions; UI/Datastar use the plugin inventory.               |
| `src/inspect/`                                                                                                                                                                                    | Optional collector/leases, immutable snapshots, allowlisted traces, byte/entry limits, policies and contained failures.                       |
| `test/inspection.test.ts`                                                                                                                                                                         | Direct public attachment, lifecycle, privacy, high-volume retention, service and adversarial serializer checks.                               |
| `test/inspection-redaction.test.ts`, `test/property/inspection.property.test.ts`                                                                                                                  | Adversarial scalar projection, sustained high-volume bounds and generated retention/policy sequences.                                         |
| `test/inspection-conformance.test.mjs`, `test/fixtures/inspection-conformance.mjs`                                                                                                                | Shared public-only lifecycle/service/bounds proof for source and installed consumers.                                                         |
| `schema/inspection.schema.json`                                                                                                                                                                   | Closed versioned snapshot, trace, record, count and policy grammar.                                                                           |
| `package.json`, `vite.config.ts`, `tsconfig.json`, `vitest.config.ts`, `scripts/build-types.mjs`, `config/api-extractor.inspect.json`                                                             | Optional ESM/CommonJS/type entry and build resolution.                                                                                        |
| `etc/jquery-star.api.md`, `etc/jquery-star-core.api.md`, `etc/jquery-star-inspect.api.md`                                                                                                         | Reviewed public metadata addition and complete optional inspection API.                                                                       |
| `scripts/quality-package.mjs`, `scripts/smoke-package-files.mjs`, `scripts/quality/package-release-contracts.mjs`                                                                                 | Exact packed files, inert/cross-copy/Node/QUnit/browser consumers and graph isolation.                                                        |
| `config/quality-budgets.json`, `quality/release-contract.json`, `quality/test-evidence.json`, `test/release-candidate-contract.test.mjs`                                                          | New optional-entry ceilings, unchanged existing ceilings, candidate surface and seeded property evidence.                                     |
| `docs/INSPECTION.md`, `README.md`, `CHANGELOG.md`, `SECURITY.md`                                                                                                                                  | Public API, privacy, release changes and failure behavior.                                                                                    |
| `docs/README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/COMPATIBILITY.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`, `docs/LIBRARY_EXPANSION_PLAN.md`, `docs/tickets/ROADMAP.md` | Shipped surface, lifetime, verification and remaining conditional work.                                                                       |
| `.prettierignore`                                                                                                                                                                                 | Preserve API Extractor formatting for the new report, consistent with existing entries.                                                       |
| `schema/quality-budgets.schema.json`                                                                                                                                                              | Require the new inspector package and consumer budgets without changing existing limits.                                                      |
| `test/fixtures/csp/conformance-map.json`                                                                                                                                                          | Regenerated source-line inventory after public README additions.                                                                              |
| `schema/release-contract.schema.json`, `schema/package-report.schema.json`                                                                                                                        | Exact added export/document/consumer/graph evidence requirements; preserve closed schemas.                                                    |
| `test/public-baseline.test.ts`, `test/jquery-ecosystem-contract.test.ts`, `test/package-release-hardening.test.mjs`                                                                               | Account for approved additions without rewriting the historical baseline; update exact executable evidence fixtures.                          |
| `config/runtime-private-properties.ts`, `vite.csp.config.ts`                                                                                                                                      | Share the explicit private lifecycle property optimization between modular and CSP builds; preserve compression passes and consumer settings. |
| `test/runtime-private-properties.test.ts`                                                                                                                                                         | Reject minified names that escape the four runtime sources, lack a private declaration, or appear in public interfaces/data objects.          |
| `quality/scopes.json`, `scripts/quality/run-static.mjs`                                                                                                                                           | Classify TypeScript build helpers and enforce their lint checks.                                                                              |
| `quality/jquery-mobile-migration.json`, `docs/JQUERY_MOBILE_MIGRATION.md`                                                                                                                         | Refresh served UMD bytes from the rebuilt artifact; preserve historical baselines and limits.                                                 |
| `test/inspection-failures.test.ts`                                                                                                                                                                | Verify failed attachment, metadata, clocks, capture/export, final notifications, store resource ownership and bridge categories.              |
| `example/docs/api/index.html`, `example/docs/compatibility/index.html`, `example/docs/security/index.html`, `example/docs/index.html`                                                             | Publish optional inspection usage, privacy and entrypoint discovery in the native website.                                                    |
| `example/agent-content.generated.json`, `example/public/jqstar-agent-index.json`, `example/public/llms-full.txt`                                                                                  | Regenerate the reviewed website corpus after API, privacy and compatibility additions.                                                        |
| `schema/release-candidate.schema.json`                                                                                                                                                            | Require all 37 current release prerequisites in generated candidate proof.                                                                    |
| This ticket                                                                                                                                                                                       | Activated Plan and current implementation/evidence ledger.                                                                                    |

### Design changes

The first implementation passed focused behavior checks but grew the root UMD from 463,654 to
468,820 bytes (464,896 ceiling), CSP ESM from 158,244 to 162,887 bytes (160,000 ceiling), and CSP
CommonJS from 156,312 to 160,895 bytes (158,000 ceiling). The core imported the complete generic
adapter implementation. Keep the existing ceilings unchanged and revise this boundary before
continuing package work.

The revised `$.star.metadata()` returns only a small `StarKernelMetadataAccess` capability: current
safe inventory/count visitation, explicit service visitation, existing operation/resource ownership,
and a final disposal notification. The internal optional adapter builder consumes that public access
capability. It adds no named core/root export, and its implementation is excluded from core/CSP
consumers that do not import it. It owns identity, scalar sequencing, shared attachment slots and
terminal count projection. A lazy versioned weak registry keyed by the actual installed `$.star`
object shares adapters across module copies; it is created only when the helper is called. It does
not reuse expression realm state. The access capability passes only already-public disposal data to
the generic helper at final notification; the helper immediately projects category counts and clears
the access reference. Inspection receives only the data-only terminal handle. Final notifications
are observational: callback failures are contained and do not alter a settled cleanup report.
Collector cleanup still reports failures through its owned resource before the report settles.

The first installed consumer measurement is 543,548 bytes against the unchanged 542,720 root
ceiling. Extra compression passes and ECMAScript output settings did not improve it; variable
hoisting increased it and was discarded. The next footprint revision shortens only a fixed set of
private kernel, operation and application property names in the modular library build. These names
occur entirely inside the shared runtime chunk and are absent from public API/data schemas. Public
property names, consumer build settings and existing ceilings remain unchanged. The same
private-name list is used by modular and CSP builds; public UMD behavior remains unchanged. Full
installed consumers and graph/API checks must pass before accepting that optimization.

Navigation is committed as `ad54f06`. Inspection work has returned from the isolated checkout to the
main checkout. The separate scalar sequence handle preserves identity across collector replacement.

## Test

| Command                                                                                                                                                   | Result | Evidence                                                                                                                                                                                                            |
| --------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0030-add-inspection-and-tracing.md`                                                        | Pass   | Activated contracts, service inventory, API, limits, authority, privacy and exact verification plan validated before Code.                                                                                          |
| `npx vitest run test/inspection.test.ts test/inspection-redaction.test.ts test/property/inspection.property.test.ts test/inspection-conformance.test.mjs` | Pass   | 22 focused tests, including both rescheduling regressions that failed before the correction.                                                                                                                        |
| `npm run build:self-hosted`                                                                                                                               | Pass   | All JS formats, API reports, CSS, self-hosted site and server rebuilt from corrected code.                                                                                                                          |
| `npm run quality:fast`                                                                                                                                    | Pass   | Report `2026-09-06T01-10-54-925Z-63022`: 1,071 unit tests and every enforced fast/static check pass on one unchanged tree.                                                                                          |
| `npm run ticket:validate -- --phase code --ticket docs/tickets/0030-add-inspection-and-tracing.md --report .git/jqstar/latest-report.json`                | Pass   | Code closure verified the exact passing fast report before entering Test.                                                                                                                                           |
| `npx vitest run` on the five inspection test files                                                                                                        | Pass   | 35 focused tests, including 13 defensive boundary cases.                                                                                                                                                            |
| `npx eslint test/inspection-failures.test.ts --max-warnings=0` and `npx tsc -p tsconfig.quality.test.json`                                                | Pass   | Final failure fixtures meet enforced lint and type contracts.                                                                                                                                                       |
| `npm run test:coverage`                                                                                                                                   | Pass   | All changed executable lines/functions are exercised; global lines 94.06%, functions 93.39%, branches 84.56%. Existing thresholds preserved.                                                                        |
| `npm run quality:delivery` via `npm run check`                                                                                                            | Pass   | Report `2026-09-06T01-31-14-090Z-35657`: all 13 gates, 1,084 unit tests, complete changed-line/function coverage, 48 property tests, 481 browser tests, all package/release checks and 16 negative detector checks. |
| `npm run quality:delivery` via `npm run check`                                                                                                            | Pass   | Exact-tree receipt `2026-09-06T01-49-18-406Z-90801` repeats all 13 passing gates with the required inspection table.                                                                                                |
| `npm run ticket:validate -- --phase test --ticket docs/tickets/0030-add-inspection-and-tracing.md --report .git/jqstar/latest-report.json`                | Pass   | Test closure verified the current delivery receipt before entering Document.                                                                                                                                        |
| `npm run build:agent-content`                                                                                                                             | Pass   | Regenerated agent/runtime indexes and full text from reviewed native website pages; all corpus bounds pass.                                                                                                         |
| `npm run ticket:validate -- --phase document --ticket docs/tickets/0030-add-inspection-and-tracing.md`                                                    | Pass   | Public/brain documentation, all 14 acceptance IDs and the current-state completion audit validate.                                                                                                                  |
| `npx vitest run test/release-candidate-contract.test.mjs test/package-release-hardening.test.mjs`                                                         | Pass   | All 20 release and package-hardening tests pass with 37 prerequisite tickets.                                                                                                                                       |
| `node scripts/quality/validate-json.mjs`                                                                                                                  | Pass   | All 83 JSON files, 17 instances and 24 schemas validate after the final candidate count update.                                                                                                                     |
| `node scripts/build-types.mjs` and `git diff --check`                                                                                                     | Pass   | API Extractor accepts report line endings; unchanged baseline lines retain their original endings and added lines use LF. Existing API reports now contain only 62 added lines each, with no whitespace errors.     |

### Inspection ledger

| Finding                                                                                    | Resolution                                                                                                                                          |
| ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| Default graphs initially imported the complete adapter and exceeded existing budgets.      | Moved aggregation into the optional entry; private runtime minification has an AST boundary test. All unchanged package and consumer ceilings pass. |
| Request projection rejected the legitimate initial attempt zero.                           | Accept nonnegative attempts in projection and schema; a real request proves progress/completion and omission of private data.                       |
| Final collector cleanup could count the same failure twice.                                | A private cleanup marker preserves one count; failed unsubscribe is reflected once in collector counters and the public terminal report.            |
| Policy timer rescheduling could fail after revocation or expiry.                           | Centralized failure cleanup disables tracing and purges all policies/data; both regressions failed before the fix and pass afterward.               |
| The new TypeScript build helper was missing from the quality census and lint command.      | Added it to the existing configuration classification and enforced lint glob; fast and full static checks pass.                                     |
| Defensive attachment, clock, export and ownership paths lacked changed-line coverage.      | Added 13 failure cases; all changed executable lines/functions and existing global thresholds pass.                                                 |
| Public website API, security and compatibility pages need the optional entry.              | Four reviewed pages pass HTML validation and are applied in Document; generated corpus refresh is included in the final ledger.                     |
| Test closure required a named inspection table in addition to the existing prose findings. | Added this table; exact-tree receipt `2026-09-06T01-49-18-406Z-90801` and Test closure both pass.                                                   |

### Focused verification history

- The final local core probe is 195,103 raw / 62,995 gzip bytes (197,632 / 63,000 ceilings). The
  preceding CSP probe is 152,787 raw / 44,300 gzip / 38,956 Brotli bytes (156,000 / 45,000 / 39,000
  ceilings); the exact package run must verify the final list in both formats.
- The minification boundary test also checks receiver provenance. It initially rejected the existing
  `const instance = this` event-handler alias; the TypeScript symbol check now accepts only `this`
  or its exact const alias, while rejecting other receivers. All selected properties have private
  declarations and remain inside the four shared runtime sources.

- A source AST audit rejected `resourceSummary` because it is an internal public method rather than
  a private declaration; removed it from the minification list. The permanent boundary test
  validates every selected name and rejects public-interface/data-object or external-source uses.

- Local core/CSP consumer probes then measured core gzip 63,093 and CSP Brotli 39,339 against
  unchanged 63,000/39,000 limits. A shared explicit list now covers private kernel/application
  lifecycle names in both builds. UMD and public API/data keys are not changed by this list.

- Fast report `2026-09-06T00-51-55-997Z-4237` failed on six stale/missing artifact expectations and
  two static contracts. Updated the explicit package/release schema inventories and fifth QUnit
  assertion; the historical baseline remains unchanged with exactly seven named type additions, one
  metadata member and one optional export checked separately. Negative type consumers now run as
  expected compiler failures without suppression. Rebuilt all formats before the next fast run.
- The corrected package run passes every check except the core gzip graph: 63,233 bytes exceeds its
  unchanged 63,000 ceiling (prior baseline 62,993). The private-property optimization therefore
  includes private application lifecycle methods wholly contained in the shared runtime chunk.
- Source policy, all 83 JSON files/17 instances/24 schemas, and 32
  package/release/baseline/ecosystem contract tests pass after those corrections.

- The first package run passed installed inspection ESM/CommonJS, QUnit and all three browser
  engines. API formatting drift stopped declaration completion, causing downstream missing-type/CSS
  failures; added the new API report to the existing formatter exclusions and regenerated it. Root
  consumer size also exceeded its unchanged ceiling, as recorded in Design changes.
- Source lint required receiver-free service callback types, an explicit test realm reference and a
  constant recursive-test lease. Corrected these without disabling rules.
- Public-request verification exposed the legitimate initial attempt zero being refused. Projection
  and schema now accept nonnegative attempts; the real request export validates without private URL,
  header, body or response values. The first inventory fixture installed plugins after boot;
  corrected its order to the public lifecycle and verified activation rollback before mounting.
- The expanded seven-file suite passes 113 tests, including 15 direct inspection cases. Focused
  source/test lint and regenerated API reports also pass.

- Extracting the shared store count wrapper initially duplicated a source prefix and failed the
  type/build checks. Corrected the extraction; the fresh source typecheck, 28 focused tests and JS
  build pass. Intermediate failed artifacts were not accepted as fresh measurements.
- The fresh optional build has inspect ESM/CommonJS 17,123/17,083 bytes and stores 13,171/13,001
  bytes, before the final cleanup edge-case fix. Inspector has no runtime imports; kernel version
  comes from the installed public capability. Core wrappers remain 882/962 bytes.
- Cleanup fault injection found duplicate counting when the final collector reported an already
  counted failure; a private typed cleanup marker now preserves one count. The first fixture
  incorrectly expected failed kernel disposal to return; corrected it to the existing
  `StarDisposalError` contract. All 13 inspection tests now pass, including contained cleanup and
  failed timer ownership.
- Timer ownership failure while granting disclosure now disables tracing and clears all data and
  policies. Expiry uses the monotonic performance clock; read/control recursion is guarded.
- `node scripts/build-types.mjs --local` succeeds with no forgotten-export warnings. The reports
  expose the generic metadata capability and optional inspector types only.
- New budgets apply only to inspector entry files/package contribution and explicit inspector
  consumer compositions. Every existing raw/gzip/package/file-count ceiling remains unchanged.

- The footprint revision moved generic adapter aggregation/attachment machinery out of default
  installations, retained public namespace/version inventory, and reused the existing operation
  owner lookup. Root UMD and both CSP formats now fit unchanged ceilings; exact final measurements
  and installed graphs will be recorded by package verification. Intermediate builds retained in
  `.git/jqstar/inspection-size-revision*.log` include the remaining default-only overruns.
- The seven-file inspection/privacy/property/plugin/stores/persistence/observations regression run
  passes all 127 tests. TypeScript also passes after the generic metadata boundary revision.

- Initial 10-test inspection run: nine passed; the service fixture called `createFieldCodec` with an
  options object instead of its documented field-array argument. Corrected the fixture.
- Initial isolated typecheck lacked the research-only TanStack dependency at its fixture-local path;
  linked the existing isolated installation. The corrected pre-test source typecheck passed.
- The first focused source lint run and corrected typecheck passed. All 103 inspection/stores/
  persistence/plugin checks and all 14 new inspection/privacy/property checks pass. The first JS
  build exceeded the existing UMD/CSP budgets; the architectural correction is recorded above.
  Package/build/schema and full verification remain ahead.

- All 13 standalone package checks pass, including installed ESM/CommonJS, QUnit, all three browser
  engines, positive/negative types and every unchanged size ceiling. Final core gzip is 62,995 bytes
  against 63,000; CSP Brotli is 38,965 against 39,000; root UMD is 464,868 against 464,896.
  Inspector-only is 17,007 bytes raw / 6,034 gzip.
- Fast report `2026-09-06T01-03-42-114Z-26792` passed 1,068 of 1,069 unit tests; the remaining
  assertion used stale current Mobile migration UMD bytes. Refreshed that measurement directly from
  the artifact and its public table. Static census also found the new private build configuration
  unclassified; extended the existing configuration scope, preserving its TypeScript/lint checks.

- Fast report `2026-09-06T01-07-21-402Z-38726` passes all 1,069 unit tests and static checks.
  Read-only review found that classifying `config/` did not itself add it to the lint invocation;
  its direct lint check passes, and the enforced command now includes `config/**/*.ts`. A fresh fast
  report will bind that final quality wiring before Code closure.

- Fast report `2026-09-06T01-08-35-455Z-50234` passes all 1,069 tests and static checks, including
  the enforced build-helper lint. Final lifecycle review then found that rescheduling after
  revocation/expiry could lose the remaining policy timer on ownership failure. Both new public
  regressions failed against the prior implementation (15 passed / 2 failed). Centralized failure
  cleanup now disables and clears tracing for grant, revoke and expiry rescheduling.

- Delivery report `2026-09-06T01-12-12-172Z-74554` passes 12 of 13 gates, including all 481 browser
  tests, all package/release checks, and 16 negative detector checks. Coverage alone failed: global
  lines 93.86%, functions 93.35%, branches 84.38%, with newly added defensive paths still unexecuted
  under the stricter changed-line requirement. No threshold was changed.
- Added 13 focused failure cases for those paths. An isolated preview passes all 13 and TypeScript;
  its initial clock assertion incorrectly expected policy records to disappear. The corrected case
  captures a disclosed action, makes the clock unavailable, and verifies the data is withheld. Final
  repository coverage and delivery verification now pass, as recorded above.

- Document fast report `2026-09-06T02-06-54-642Z-46620` passes static checks and 1,082 of 1,084 unit
  tests. The two release-audit failures retained the old count of 36 after inspection became the
  37th prerequisite. Updated both exact test assertions and the candidate-proof schema; no existing
  budget or quality threshold was reduced.

- Final diff checking found CRLF endings on regenerated API additions. Preserved unchanged baseline
  lines and wrote additions/new inspection report with LF; API Extractor's ordinary non-local build
  accepts the same API, and `git diff --check` passes. No API contract or whitespace rule was
  weakened.

## Document

### Documentation changed

Public inspection, privacy, API and service contracts are documented in `docs/INSPECTION.md`,
README, changelog, security, compatibility, architecture, ownership, project/testing guides and
roadmap. Website API/security/compatibility/discovery pages and the generated agent corpus include
the optional entry. The candidate release contract includes inspection and its completed ticket.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                             |
| --------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01     | Pass   | Activated service table and Plan validation above; final 0010 operation/disposal contracts, 0020 and 0023 decisions; no resource/navigation placeholder entry.                                                                       |
| AC-02     | Pass   | `src/inspect/index.ts`, `src/metadata-adapter.ts`; installed ESM/CommonJS inert imports and package graph checks for omitted inspector code/registry; post-boot default-off test.                                                    |
| AC-03     | Pass   | `schema/inspection.schema.json`, `src/inspect/snapshot.ts`, `src/inspect/redaction.ts`; real snapshot/export schema validation and adversarial serializer tests.                                                                     |
| AC-04     | Pass   | `src/kernel-metadata.ts`, `src/service-metadata.ts`, official service registrations; public owner/resource, bounded inventory/omission and terminal disposal tests.                                                                  |
| AC-05     | Pass   | `src/plugin.ts`, `src/inspect/service-adapter.ts`; duplicate/schema rejection, failed activation rollback, frozen count views, recursion/getter/cycle/oversize refusal.                                                              |
| AC-06     | Pass   | `src/inspect/collector.ts`, `src/inspect/trace.ts`; no default trace subscription/timer/records, invalid options preserve existing trace, explicit hard ceilings.                                                                    |
| AC-07     | Pass   | Concurrent action tests, 50,000-observation redaction test and seeded property suite; exact UTF-8 array bytes, entry bounds, filter/sample order and eviction counters.                                                              |
| AC-08     | Pass   | `test/inspection-redaction.test.ts`, real request privacy test and installed conformance canaries; only scalar allowlisted fields copied, denied accessors and original objects never retained.                                      |
| AC-09     | Pass   | Policy allow/revoke/replacement tests, delayed-expiry withholding and timer-ownership failure test; only approved identifiers, future-only retention, synchronous purge and export permissions.                                      |
| AC-10     | Pass   | Frozen schema-valid export, interleaved property test and installed conformance; ordered immutable copies, explicit clear and monotonic identity across collector replacement; no transport.                                         |
| AC-11     | Pass   | `test/inspection-failures.test.ts`, hostile/recursive serializer, invalid configuration, request projection, clock and cleanup tests; fixed failure counts without original errors or recursive capture.                             |
| AC-12     | Pass   | Shared lease/controller, final release, kernel terminal snapshot, failed unsubscribe and timer ownership tests; one cleanup failure appears in the public settled report.                                                            |
| AC-13     | Pass   | `scripts/quality-package.mjs` and `test/fixtures/inspection-conformance.mjs`; installed ESM/CommonJS cross-copy, QUnit and Chromium/Firefox/WebKit, positive/negative types, optional/unimported graphs and unchanged budgets.       |
| AC-14     | Pass   | Passing fast Code report and full delivery Test report listed above; focused, coverage, property/static, browser, package/release and 16 negative detector checks; phase validators and final delivery receipt. No mutation testing. |

### Completion audit

- Public API: the optional `jquery-star/inspect` entry, generic metadata capability and service
  count registration are represented in API reports, installed types, package schema and candidate
  release prerequisites. No native navigation, resource cache or DevTools entry was introduced.
- Privacy and lifetime: capture copies only allowlisted scalar values; hard-denied data cannot be
  enabled. Policies expire and purge; final cleanup releases live kernel/service references and
  leaves only opaque identity, sequence and terminal category counts in held leases.
- Independent source inspection: reviewed ownership, staging, serializer boundaries, timer failure,
  real request attempt zero, graph separation and private-property minification. Corrections and
  passing regressions are recorded in the verification history; no unresolved finding remains.
- Package proof: exact installed artifacts pass Node, QUnit and all three browser engines. Bridge
  event projection uses public host doubles in the shared inspection fixture; the existing real-host
  bridge suite remains the transport proof. Every previous numerical budget remains unchanged.
- Documentation: public guide, website API/security/compatibility, generated agent corpus, project
  brain, ownership and roadmap agree with the implemented candidate surface.
- Remaining program work belongs to 0031 (two application investigations and conditional DevTools
  decision), 0032 (upgrade diagnostics) and 0033 (final program audit). Those tickets remain open.
- Release boundary: package version remains the unpublished 1.1.0 candidate. This ticket creates no
  tag, push, registry publication or deployment.

Status: Complete

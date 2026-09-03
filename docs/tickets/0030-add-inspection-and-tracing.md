---
id: 0030
title: Add bounded inspection and tracing
status: planned
created: 2026-08-30
updated: 2026-09-01
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

- Ticket 0010 defines versioned action/request observations, operation IDs, timing, error
  categories, observer isolation, and kernel ownership. Inspection must consume that public seam
  rather than patch actions, fetch, or private application maps.
- Tickets 0005, 0006, 0008, and 0013 define kernels, applications, plugins, ownership, modular
  entrypoints, and public terminal disposal reports.
- Tickets 0018 and 0019 conditionally add stores and persistence. Tickets 0020–0022 and 0023–0029
  may select no package, an external package, or native services; inspection cannot assume that an
  optional track shipped.
- The package currently has no supported inspection entrypoint, trace retention owner, serialized
  snapshot schema, or service-summary registration contract.
- Ticket 0014's installed, runner-neutral harness and ticket 0004's package consumers can prove that
  the facility uses public artifacts and does not enter applications that never import it.

### Activation gate

Before Code, import the final public operation, disposal, and optional-service contracts from their
owning tickets. List every shipped official service and its disposition: redacted serializer,
counts-only serializer, or no inspectable state with a reason. Plan-validate that list. A declined
resource/navigation track creates no placeholder serializer, public type, or misleading summary.

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

- [ ] [AC-01] Activation records every shipped official service and exact serializer/no-serializer
      disposition, links the final operation/disposal contracts, and Plan-validates before Code;
      declined services leave no placeholder API or graph edge.
- [ ] [AC-02] `jquery-star/inspect` is side-effect-free until attached to an explicit kernel. Root,
      core, UI, Datastar, CSP, testing, and applications that do not import it contain no inspection
      module, subscription, buffer, timer, or retained record.
- [ ] [AC-03] A `jqstar-inspection-snapshot/1` snapshot is deterministic, JSON-safe and deep-copied;
      schema validation and adversarial serializers prove it contains no mutable/live kernel,
      jQuery, DOM, function, promise, Error, request/response, state, cache, stage, or service
      object.
- [ ] [AC-04] Application, plugin, ownership, operation, disposal, and official-service summaries
      expose only documented opaque IDs, public names/categories, lifecycle states, counts, bounded
      timing/size metadata, and schema versions; totals reconcile with public ownership reports.
- [ ] [AC-05] Service serializers are installed/uninstalled transactionally under unique namespaces,
      receive only frozen approved metadata, meet depth/key/string/byte limits, and cannot interrupt
      application/service behavior through throw, recursion, cycles, accessors, or oversized output.
- [ ] [AC-06] Tracing is off by default in every environment. Disabled tracing has zero retained
      records and no observation subscription. Explicit enablement enforces positive configured
      bounds beneath documented hard ceilings.
- [ ] [AC-07] Filtering and deterministic every-N sampling occur before retention. Sustained and
      concurrent high-volume observations never exceed exact entry or serialized UTF-8 byte bounds;
      oldest-first eviction and refused/filtered/evicted counters are deterministic.
- [ ] [AC-08] Capture-time allowlisting and hard-deny tests prove default records/exports omit URL
      components, headers/validators/credentials, bodies/HTML/DOM/selectors, input/state/service
      values, arbitrary errors/stacks/paths, and original observations, including through thrown
      accessors, `toJSON`, symbols, cycles, and nested objects.
- [ ] [AC-09] Sensitive opt-in names a permitted field, purpose, bounds, retention/export behavior,
      and expiry; policy changes are observable, affect future records only, are reversible, cannot
      override hard-denied fields, and remove affected retained data synchronously when disabled.
- [ ] [AC-10] Snapshot/export returns an immutable copy in sequence order with schema, bounds,
      policy ID, and aggregate counters, performs no network/file write, and cannot mutate collector
      state. Clear is explicit, deterministic, and does not reset monotonic sequence identity.
- [ ] [AC-11] Observer/serializer/filter/export failures are contained and counted without recursive
      observations, unbounded error detail, application interruption, or cleanup loss.
- [ ] [AC-12] Multiple client leases coexist. Lease/final disposal is idempotent and releases
      subscriptions, registrations, tasks/timers, policies, buffers, and serializer references once;
      bounded cleanup failures appear in the public terminal disposal report.
- [ ] [AC-13] Installed Node, QUnit, and Chromium/Firefox/WebKit consumers prove public-only
      attachment, snapshots/traces, high-volume bounds, redaction, optional service inclusion,
      exclusion/tree-shaking, and cleanup from the exact packed artifact.
- [ ] [AC-14] Focused, coverage, property/static, browser, package, release, `npm run check`, ticket
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

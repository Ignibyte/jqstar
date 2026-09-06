# Inspection and tracing

`jquery-star/inspect` adds explicit, read-only inspection of one installed jQStar kernel. It has ESM
and CommonJS exports and matched types. Importing it installs nothing. Root, core, CSP, UI, Datastar
and testing entries do not import the inspector. The current package remains an unpublished 1.1.0
candidate.

Attach after installing core, including after applications have booted:

```ts
import $ from "jquery";
import { installStarCore } from "jquery-star/core";
import { attachInspector } from "jquery-star/inspect";

const installed = installStarCore($, { document });
const inspector = attachInspector(installed);
const snapshot = inspector.snapshot();
```

The snapshot contains an opaque kernel ID, a sequence number, lifecycle, public plugin namespaces
and versions, opaque application IDs and modes, resource and pending-work counts, and registered
service summaries. It contains no application state or live objects. Returned documents are copied
and deeply frozen. Their schemas are published in
[`inspection.schema.json`](../schema/inspection.schema.json), with `snapshot`, `trace` and `service`
definitions.

The kernel's generic `$.star.metadata()` capability supplies public owner records, plugin metadata,
resource kinds, counts, operation observation, ownership and final disposal notification. The
optional inspector builds bounded documents from that capability. It does not inspect private maps
or wrap application actions, fetch, or disposal.

## Trace controls

Tracing starts off. An attached inspector with tracing disabled has no trace subscription, buffer,
record or timer. Snapshot counts do not require an operation observer.

```ts
inspector.enableTrace({
  maxEntries: 100,
  maxBytes: 32_768,
  kinds: ["action", "request"],
  outcomes: ["completed", "failed", "cancelled"],
  everyNth: 1,
});

const records = inspector.readTrace();
const exported = inspector.exportTrace();
inspector.clearTrace();
inspector.disableTrace();
inspector.dispose();
```

Kinds are `action`, `request`, `store`, `turbo`, `htmx` and `policy`. Outcomes are `pending`,
`completed`, `cancelled` and `failed`. Omitted filters accept every supported value. Filters run
before deterministic every-N sampling within each kind; `everyNth` must be 1–1,000,000.

`maxEntries` must be 1–4,096 and `maxBytes` must be 2–1,048,576. The byte bound measures UTF-8 JSON
for the retained records array, including its brackets and commas. A record that cannot fit alone is
refused. Otherwise, the collector evicts oldest records until both bounds hold. Counters report
observed, filtered, sampled, retained, evicted, oversized and purged records, plus fixed failure
categories. Counters saturate at the maximum safe integer.

Read and export do not clear records or advance sampling. Clear preserves sequence identity,
sampling positions and counters. Re-enabling tracing replaces its settings and buffer and starts a
new sampling schedule. Sequence identities continue across settings changes and collector
replacement. Trace elapsed time comes from the monotonic performance clock at capture; it is not an
operation-duration measurement or a profiler.

## Leases and cleanup

Repeated attachment to the same installed kernel shares one collector, including across module
copies. Each caller receives its own lease. The first caller to enable tracing controls its
configuration, clearing and disclosure policy. Other leases can read but cannot change that
configuration. Releasing the controlling lease clears the trace and policies; a surviving lease can
then enable its own trace. Releasing the final lease removes the collector.

Kernel cleanup closes all leases, subscriptions and timers and clears retained records and policy. A
still-held lease can read a terminal snapshot containing disposal category totals, with no live
kernel or service inventory. Releasing that lease also drops its terminal handle. Disposal is
idempotent and never disposes the kernel or another client's lease. Standalone lease disposal
returns a bounded failure count; failures during kernel-owned collector cleanup contribute to the
public kernel disposal report.

## Disclosure policy

Default records retain only generated IDs, fixed categories and phases, outcomes, request method,
status and attempt, numeric progress/removal counts and elapsed capture time. They omit URLs,
headers, credentials, cookies, bodies, HTML, DOM identity, selectors, application/store values,
input, filenames, error names/messages/stacks/causes and arbitrary fields. Service serializers
cannot extend this allowlist.

Only `actionCapability` and `storeName` can be permitted explicitly. Their values must be
lower-camel ASCII identifiers: a lowercase letter followed by letters or digits. Qualified action
labels, paths, filename-like strings and oversized names are withheld. They are never truncated into
an accepted identifier.

```ts
inspector.allowField({
  field: "actionCapability",
  purpose: "debugging",
  maxLength: 32,
  retain: true,
  export: false,
  expiresInMs: 30_000,
});

inspector.denyField("actionCapability");
```

A policy requires active trace control, a `debugging` or `support` purpose, a maximum length of
1–96, explicit retention/export permissions, and expiry of 1–3,600,000 milliseconds. It affects
future records only. Replacement or revocation synchronously removes retained records carrying the
field. Policy changes have sequence IDs and produce fixed policy records under the normal trace
filters and limits.

One owned timer schedules the earliest expiry. If timer ownership or rescheduling fails, the
collector clears all trace data and policies and disables tracing before reporting the failure.
Read/export withholds expired records even if the event loop has delayed timer cleanup. Until
cleanup runs, retained byte/entry counts can include those withheld records. Export also removes
fields without export permission, so exported bytes can be smaller than retained bytes. These
controls govern library retention and export; a caller permitted to read a field can copy it
independently.

Export returns data to application tooling. It performs no network or file write and creates no
public endpoint, console logger, UI, action or declarative control.

## Service summaries and limits

| Service         | Counting boundary                                                                                                                                          |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI              | Public plugin inventory only. Private component controllers are not an enumerable census.                                                                  |
| Datastar        | Public plugin inventory plus generic protocol/request counts. No additional state serializer.                                                              |
| Stores          | Store records and owned subscriptions, effects and pending tasks; no names or values.                                                                      |
| Persistence     | Attachment and pending/disabled/disposed status counts; no storage keys, origins or payloads.                                                              |
| Turbo and htmx  | Controller-owned render, observer, waiter, listener and applicable request/history counts. Their public events are observed only for selected trace kinds. |
| Generic runtime | Application owners, resource kinds, pending enhancements/tasks, protocol profiles/body owners, middleware and an installed expression capability.          |

There are no resource-cache or native-navigation placeholders. Testing helpers are caller-owned
tools, not installed services.

Plugin authors can use the optional `registrar.metadata` registration during installation. Its
namespace must match the plugin and its schema must be `jqstar-service-counts/1`. Duplicate,
mismatched or invalid registrations fail before activation. The producer supplies a frozen
`StarServiceMetadataView`; its serializer receives a validated frozen copy containing only a fixed
boundary category and approved nonnegative integer counts. Output has the same counts contract plus
its schema. The core retains only the registration's approved fields. A plugin installed on an older
compatible registrar may omit metadata support.

Snapshots include at most 256 applications, 256 plugins and 32 service summaries, with explicit
omission counts. Public namespace/version strings are capped at 96/32 characters. Each service
summary is capped at 4,096 UTF-8 JSON bytes; a complete snapshot is capped at 262,144 bytes. The
closed count grammar permits no nested extension data. Accessors, symbols, prototypes, cycles,
unexpected keys, invalid numbers and oversized output are refused. Serializer failures and recursive
inspection are contained and counted; they do not interrupt application work or create recursive
diagnostic records.

# Persisted preferences

`jquery-star/persist` adds synchronous persistence to an already defined shared store. Install the
stores plugin, define the store, and attach persistence before starting any application. Hydration
finishes before `attach()` returns, so the first UI effect sees the accepted preferences. The entry
exports ESM, CommonJS, and TypeScript declarations without installing anything or accessing storage
at import time.

Use signals for local UI state, stores for coordination between roots, and persistence for selected
browser preferences. Browser data is readable and mutable by page scripts and users. Never persist
passwords, tokens, private keys, secrets, or authorization and entitlement decisions. Keep records,
permissions, validation, and server-state resources under server authority. Browser persistence does
not provide encryption, durable offline storage, remote synchronization, or an entity cache.

## Attach before applications start

```ts
import $ from "jquery";
import { installStarCore } from "jquery-star/core";
import { defineStore, storesPlugin } from "jquery-star/stores";
import { createFieldCodec, createLocalStorageAdapter, persistPlugin } from "jquery-star/persist";

const installed = installStarCore($);
const shared = installed.star.use(storesPlugin);
const preferences = shared.define("preferences", defineStore({ initial: { theme: "light" } }));
const persisted = installed.star.use(persistPlugin);
const attachment = persisted.attach(
  "preferences",
  Object.freeze({
    namespace: "example.preferences",
    version: 1,
    adapter: createLocalStorageAdapter(window),
    ownAdapter: true,
    codec: createFieldCodec<typeof preferences>([
      { path: "theme", validate: (value) => value === "light" || value === "dark" },
    ]),
  }),
);

installed.star.boot(document);
```

The official plugin requires `core.stores` version `1.1.0` and returns one frozen facade per kernel.
It uses the public dependency lookup and store transactions. Attachment options must be frozen.
Repeating attachment with the same options object returns the same handle. Another attachment for
the store or full storage key fails. A missing store, foreign Window, invalid configuration,
thenable callback result, or attachment after the first application starts is rejected.

Options are normalized at attachment. Later mutation of nested configuration does not change the
selected adapter metadata, codec method identities, migration map, timing, or limits. Callback
closures and custom adapter implementations remain the caller's responsibility.

## Adapters and ownership

| Adapter                               | Persistence and sharing                                                                                                     |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `createMemoryStorageAdapter()`        | One private map per adapter. Sharing the same instance connects facades synchronously. Disposing it clears the map.         |
| `createLocalStorageAdapter(window)`   | Same-origin browser storage, reload persistence, and storage-event reconciliation across pages.                             |
| `createSessionStorageAdapter(window)` | Reload persistence within a top-level page. Separate tabs have separate storage areas. Same-page frames can receive events. |
| `createCustomStorageAdapter(adapter)` | Validates synchronous operations and normalizes failures. The caller declares sharing and subscription support.             |

Omitting `adapter` uses one memory adapter owned by the persistence facade. Explicit adapters are
borrowed by default. Set `ownAdapter: true` only for an adapter dedicated to the attachment. Dispose
borrowed adapters after their attachments. Web adapters require the kernel's exact Window. Their
factories are lazy, and listeners are installed only when attachment acquires a subscription.

An adapter provides `kind`, `shared`, `subscribable`, `available()`, `read(key)`, atomic
`replace(key, text)`, `remove(key)`, optional `subscribe(listener)`, and idempotent `dispose()`. The
optional `window` identifies realm ownership. Reads return a string or `null`. Subscribers receive
`{ key, value }`, with a null key for clear and a null value for deletion. Operations and cleanup
must return synchronously. Custom implementations must not publish a failed replacement, and must
release partial resources themselves if subscription setup throws before returning cleanup.

Browser quotas, privacy settings, and denied access can fail any storage operation. There is no
automatic fallback to another adapter. Local and session semantics follow the
[HTML Web Storage contract](https://html.spec.whatwg.org/multipage/webstorage.html).

## Selected data and envelopes

`createFieldCodec()` accepts 1–128 explicit paths and a synchronous validator for each value. Paths
use dot-separated ASCII property names, are at most 256 characters, and cannot overlap, repeat,
select array indexes, traverse magic keys, or select unknown properties or methods. The encoded
payload maps each complete path to its value. Decode requires exactly those paths, checks the
current value kind, and applies validated values to a detached transaction draft.

Accepted data is finite numbers, strings, booleans, null, dense arrays, and plain records.
Undefined, methods, symbols, accessors, class instances, collections, promises, sparse arrays,
cycles, and magic prototype keys are rejected. Null is an explicit value. Object keys are sorted for
deterministic serialization, and Unicode is measured as UTF-8 bytes. Graphs are bounded to 64 levels
and 10,000 containers.

A custom `StarPersistCodec<Store>` declares `id`, positive integer `version`,
`encode(readonlyStore)` and `decode(data, draft)`. Encode receives a detached frozen view. Decode
changes only its detached draft and returns no value. jQStar validates the entire draft through the
public store transaction before any change reaches live state. Methods cannot be added, removed, or
replaced. Codec and migration code can still perform external side effects, which jQStar cannot roll
back.

The derived key is `jqstar:<namespace>:<store>`. An explicit `key` overrides it. Namespaces, codec
IDs, and explicit keys use 1–128 ASCII letters, digits, dots, underscores, or hyphens, start with a
letter or digit, and reject magic dot segments. Full keys are bounded to 256 UTF-8 bytes. Store
names retain the stricter shared-store naming contract.

Every envelope contains exactly `format: "jquery-star-persist/1"`, namespace, store, positive schema
version, `savedAt`, nullable `expiresAt`, `{ counter, origin }` revision, `{ id, version }` codec,
and selected data. Parsed records have null prototypes. Envelope strings are never evaluated as
JavaScript, HTML, selectors, or expressions.

`maxBytes` defaults to 65,536 and can be 256–1,048,576. It bounds both selected data and the
complete envelope, so metadata needs room too. `clock` defaults to `Date.now`; it must return a
nonnegative safe integer. `ttlMs` is an optional positive safe integer. Expiry is checked on
hydration and external changes. Wall time never decides which revision wins.

## Migrations and recovery

Schema versions are independent of package versions and codec versions. Supply every step from the
stored version to the current version in `migrations`. Each key is the source version and advances
exactly one integer step:

```ts
import type { StarPersistData, StarPersistMigration } from "jquery-star/persist";

const migrations: Record<number, StarPersistMigration> = {
  1(data: StarPersistData) {
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error("Invalid preferences");
    return { ...data, theme: "light" }; // schema 1 → 2
  },
  2(data: StarPersistData) {
    if (!data || typeof data !== "object" || Array.isArray(data))
      throw new Error("Invalid preferences");
    return { ...data, theme: data.theme === "night" ? "dark" : (data.theme ?? "light") };
  },
};
```

Migration input and output must be JSON-safe selected data. A successful migration decodes and
commits once, then schedules a current-version write. Missing steps, exceptions, invalid output,
thenables, or failed final decode preserve the original bytes and leave initial defaults live.

| Situation                                                           | Default behavior                                                           |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Missing key                                                         | Keep defaults without writing.                                             |
| Expired supported envelope                                          | Remove it and keep defaults.                                               |
| Corrupt, future schema, codec mismatch, migration or decode failure | Preserve bytes and disable reads/writes until caller recovery.             |
| Unavailable, read, quota, write, or removal failure                 | Report the error and disable persistence without stopping the application. |
| External deletion or clear                                          | Keep live state and disable writes until retry/reset.                      |
| Invalid callback synchrony or setup contract                        | Reject attachment and release acquired resources.                          |

`strict: true` also rejects recoverable hydration failures before applications start. `retry()`
rereads storage and hydrates only accepted data. It never overwrites an incompatible envelope.
`reset()` is the explicit destructive recovery operation: remove the stored bytes and write the
current selected live values. It does not reset the store to its original defaults. Call reset only
after the application decides that discarding stored preferences is appropriate. External recovery
failures preserve the last accepted live state rather than restoring defaults.

## Writes, conflicts, and disposal

Store notifications schedule one trailing timer. `throttleMs` defaults to 100 ms, and `maxDelayMs`
defaults to 1,000 ms. Both are bounded to browser timer limits. Maximum delay must be positive and
at least the throttle. Scheduling uses the realm's monotonic clock, so a backward wall clock cannot
postpone a pending write indefinitely. `flush()` captures the latest selected values synchronously,
including changes whose store notifications have not run yet.

Revisions compare the Lamport counter first and origin string second. A writer increments beyond
every revision it has observed. An external winner applies one store transaction and its resulting
notification does not echo the same value. Duplicate revisions do not rerender. If an older write
lands last in storage, an active participant can repair it with the accepted newer envelope.
Revision comparisons are independent of wall-clock skew. Origins contain 128 random bits from the
kernel window's `crypto.getRandomValues()`. Persistence does not require the secure-context-only
UUID API.

The selected payload is one last-write-wins unit. Concurrent edits can lose fields changed by
another page. Split unrelated preferences into separate stores when they need separate conflict
boundaries. This is not a merge algorithm, CRDT, lock, or cross-key transaction. Convergence
requires delivery to active participating pages. Browser termination can lose pending throttled
writes.

`attachment.dispose()` returns a frozen report with `ok`, terminal status, and normalized error
codes. The default `flushOnDispose: true` attempts the latest write before releasing the store
subscription, timer, storage listener, and owned adapter. Set it to false to discard pending writes.
Every cleanup is attempted even after a failure. Repeated disposal returns the same report. Kernel
disposal runs attachment services before shared stores become terminal and includes persistence
cleanup failures in the kernel's disposal error report.

## Status and observations

`status()`, operation results, and `subscribe(listener)` expose frozen snapshots containing only
attachment ID, adapter kind, store name, schema/codec versions, revision, outcome, error code, byte
count, and validated clock time. They omit namespaces, full keys, selected values, envelopes,
storage objects, callbacks, exception causes, and live references. Subscriptions report subsequent
operations, contain listener failures, and stop at disposal. Read the final status from the disposal
report. `persisted.attachments()` returns a frozen list of handles for the kernel.

The plugin uses existing store effects and transactions. It does not change `$` as real jQuery,
`$name` as a local signal, native forms, focus, validation, component storage keys, or server truth.

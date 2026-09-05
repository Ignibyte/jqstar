# Runtime ownership

This document inventories retained mutable state in the installed runtime. It distinguishes logical
ownership from storage location: a module-level `WeakMap` can index application-owned records, but
that does not make the module their lifecycle owner.

## Supported topology

One ambient `Window` and `Document` support one jQStar kernel and one canonical jQuery instance. A
kernel can own many application roots. A second package copy or jQuery instance cannot claim the
same live document kernel. Terminal disposal releases the document claim, so the same
jQuery/document pair can be installed again with a fresh expression engine. A disposed expression
engine stays claimed because its lifecycle is terminal. A separate same-origin document realm gets a
separate kernel.

The root package keeps its 0.1 auto-install behavior. `jquery-star/core` explicitly installs the
same kernel without UI or Datastar; `jquery-star/ui`, `jquery-star/datastar`, and
`jquery-star/stores` are immutable official plugins. `jquery-star/testing` and
`jquery-star/datastar/testing` are caller-operated test adapters. These modular entries have no
import-time document work.

The testing harness does not change the runtime topology. A harness owns the core installation it
creates, its application handles, public operation snapshots, finite harness tasks, and an optional
queued response controller. Disposal closes the core installation, cancels response work, checks
unused expectations, restores exact fetch descriptors, and memoizes the same report or aggregate
error. The caller still owns the DOM realm, jQuery instance, runner, arbitrary timers, and work not
registered through a jQStar or harness capability.

## Owner matrix

| Owner              | Retained state                                                                                                                                                                                                                                                                                | Storage and cleanup                                                                                                                                                                                                                                                                                                                           | Current boundary                                                                                                                                                                                |
| ------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Document host      | Kernel claim, canonical jQuery instance, UI auto-enhancement observer, toast removal observer, sidebar shortcut, and persistent UI pointer, focus, keyboard, visibility, resize, scroll, blur, and focus listeners                                                                            | `src/kernel.ts` indexes the claim by `Document`. `DocumentHost` registers exact listener, observer, service, and subscription cleanup in the kernel resource ledger.                                                                                                                                                                          | Owned now. Terminal disposal releases the claim for an explicit reinstall.                                                                                                                      |
| Kernel             | Action, directive, helper, plugin, request-middleware, protocol-profile, and operation-observer registries; operation and application identities; application lifecycle registry; render/task barriers; expression-engine selection/cache; resource ledger; subscriptions; and disposed state | One `Kernel` instance. Disposal closes structural work, destroys tracked applications, releases middleware/profile/application links, observations, bodies, resources, and tasks, runs plugin cleanup in reverse order, clears registries, disposes expressions, and reports failures after attempting every record.                          | Plugin actions, directives, helpers, request middleware, protocol profiles, lifecycle hooks, finite directive tasks, and operation observations are owned now. Service registrars arrive later. |
| Application        | Signal state, computed accessors, owned effects, mounted behavior rules, mounted directive records, finite directive tasks, application observer, event namespaces, timers, once/throttle records, and root request cancellation                                                              | `Application` and `DeclarativeApplication` instances stage setup before commit. Their observers, directive effects, and directive tasks use kernel/application owners. Rollback, subtree release, destruction, and patch removal remove records before cleanup, attempt every callback, and aggregate failures.                               | Transactional setup, teardown, directive update/cleanup, detached-root removal, and nested-root ordering are owned now.                                                                         |
| Request            | Active request by element/action key, abort controllers by application root, selected profile, middleware invocation/abort listener, validated descriptor, private body, retry attempt, delay and visibility listener, response lease/reader, progress counters, and one operation handle     | `src/fetch.ts` uses element/root keyed module maps plus per-request closures. Kernel middleware and protocol registries supply frozen snapshots; the observation hub owns request identity. Application destruction and directive removal cancel the relevant work, body owner, and unsettled middleware/profile task.                        | Observation, middleware, profile, adapter, and response-body ownership are kernel-owned. Request bytes and retry state remain request-local.                                                    |
| Expression engine  | Compiled value and statement functions, structural source locations, and source caches                                                                                                                                                                                                        | Each kernel permanently claims one unique `StarExpressionEngine`; cache clearing and idempotent disposal route only to that engine. A disposed engine cannot be reclaimed by another kernel. Retained evaluators refuse work after disposal. Root-level compiler exports retain a separate compatibility engine for the frozen 0.1 functions. | Explicit initial selection is public through `installStarCore`; the trusted engine remains the compatibility default.                                                                           |
| Reactive scheduler | Proxy/raw-value indexes, dependency sets, current effect, pending effect set, pending unowned failures, and microtask flush flag                                                                                                                                                              | `src/reactivity.ts` batches through compatibility module storage. Each application effect carries an owner/error sink and is stopped by rollback or destruction. One failure cannot skip later scheduled effects.                                                                                                                             | Owned effect lifetime and failure containment are present; modular scheduler publication remains later work.                                                                                    |
| Shared stores      | Definition identities and names; reactive namespace and values; subscriptions, effects, finite tasks, abort controllers, and cleanup callbacks                                                                                                                                                | `src/stores.ts` creates one record per name inside the official plugin facade. Setup stages before publication. Application teardown stops application effects; kernel disposal makes facades and values terminal, aborts work, and attempts every store release in reverse order.                                                            | Stable optional client coordination in 1.1. Persistence, server resources, authorization, and individual store removal remain outside this boundary.                                            |
| UI controller      | Per-element controller record, generated ID sequence, component listeners, component observer, component timers, active/open status, and transient interaction state                                                                                                                          | Module-private records in `src/ui/`, keyed by controller roots where possible. Persistent document/window behavior is injected through `DocumentHost`. Active-record services filter by owner document and release that document's entries on kernel disposal.                                                                                | The official UI plugin stages all actions and document work transactionally; import and failed install retain nothing.                                                                          |
| SSE parser         | Partial line buffer, event name, data fields, last event ID, and retry value                                                                                                                                                                                                                  | One `SSEParser` instance per consumed stream. The selected Datastar adapter owns the parser through the request's exclusive body lease.                                                                                                                                                                                                       | The parser remains a public utility; live request parsing belongs to `core.datastar`.                                                                                                           |
| Process            | Public constants, selectors, attribute lists, regular expressions, immutable empty computed data, and type metadata                                                                                                                                                                           | Module constants only.                                                                                                                                                                                                                                                                                                                        | Final target. Temporary module indexes and compatibility schedulers listed above have named migration tickets.                                                                                  |

## Complete retained-state inventory

### Testing adapters

- `src/testing/harness.ts`: application-handle, observation, outstanding-operation, finite-task,
  fetch-restoration, and terminal report/error records for one explicit realm. Setup rollback
  disposes a partially created core installation before restoring replacements.
- `src/testing/responses.ts`: one FIFO expectation queue, immutable request captures, active
  response records, cancellation callbacks, and exact target property descriptors. No request can
  pass through to the real network.
- `src/testing/realm.ts`: one process-local ambient lease plus the current callback's finite global
  descriptor stack. It rejects a second lease before mutation and clears the lease after attempting
  every restoration.
- `src/testing/conformance.ts`: case definitions only. Reports retain frozen JSON diagnostics, not
  DOM nodes, callbacks, live applications, response bodies, or private registry collections.

### Kernel and registries

- `src/kernel.ts`: process-level `claimedDocuments` and permanent `claimedExpressionEngines` weak
  indexes; each kernel's application lifecycle map, resource set, application and render IDs, active
  preserved-root counts, pending enhancement barriers/errors, terminal disposal controller/error,
  action registry, operation hub, plugin host, expression engine, document host, and subscription
  cleanup.
- `src/observation.ts`: each kernel's operation sequence, frozen application-owner records, ordered
  kernel/plugin/application subscriptions, and active action/request handles. Module `WeakMap`
  indexes connect a live application, action context, or subscription-owner callback to its hub
  without retaining history.
- `src/plugin.ts`: per-kernel installed-name and object-identity records, stable installation order,
  application hooks, plugin cleanup, structural/disposed/installing flags, and transient staged
  action/directive/helper/context/request-middleware/protocol-profile/observer transactions. Failed
  stages are released and never enter installed maps.
- `src/request-middleware.ts`: each kernel's immutable ordered middleware snapshot, registration
  ordinal, tracked-application set, and transient prepared install/cleanup records. A module
  `WeakMap` connects live applications to their owning registry without retaining disposed
  applications.
- `src/protocol.ts`: each kernel's immutable official/plugin profile snapshot, tracked-application
  set, active response-body sets, and transient prepared install/cleanup records. A module `WeakMap`
  connects a live application to its registry. Releasing the application cancels every remaining
  lease and removes both indexes.
- `src/registry.ts`: the per-kernel action map and claimed plugin namespaces created by
  `createActionRegistry()`. Prepared snapshots remain private until synchronous commit. No live
  action or plugin namespace map exists at process scope.
- `src/directive.ts`: the per-kernel immutable directive list, helper leaf map, and frozen helper
  namespace snapshot. It starts with `core.text` and `core.destroy`; prepared plugin extensions stay
  private until the shared plugin transaction commits.
- `src/stores.ts`: one plugin-owned definition map, stable reactive namespace, per-store reactive
  graph, release stack, abort controller, and operation sequence. No store record exists at process
  scope, and failed setup is removed before the name can be observed.
- `src/expression.ts`: trusted location-keyed value and statement maps plus disposed state inside
  each created engine; one root-export compatibility engine.
- `src/csp/`: immutable contract tables and AST records; each CSP engine retains a successful-only
  128-entry/262,144-byte LRU, disposed state, and no live contexts. Evaluation frames own bounded
  step/async counters and capability tags only for one invocation.
- `src/expression-runtime.ts`: a `WeakMap` associates live application identities with exact action/
  helper resolvers and raw action startup. A branded weak set recognizes internal call results. An
  action result exposes only a read-only view of its existing operation liveness; request/action
  cancellation ownership remains in `src/observation.ts`.

### Applications and scheduling

- `src/runtime.ts`: behavior-application state, computed proxy, effects, mounted rules, once sets,
  debounce timers, throttle timestamps, mutation observer, namespace, expression-runtime release,
  and destroyed flag.
- `src/declarative.ts`: attribute-application state, computed proxy, effects, registered
  element/attribute directive records and reverse cleanup stacks, per-attribute legacy cleanup maps,
  mutation observer, event debounce/throttle closures, expression-runtime release, and destroyed
  flag.
- `src/reactivity.ts`: dependency/proxy/raw indexes, current effect, owned pending effects, pending
  unowned failures, and flush flag.
- `src/fetch.ts`: active requests by element and root; selected profile, request abort controller,
  private replayable body, validated middleware descriptor, retry delay, visibility listener,
  lifecycle counters, and response state live in each request.
- `src/protocol.ts`: one active response owns frozen metadata, a single-claim body lease, optional
  stream reader, cancellation promise, adapter task, scoped patch/event capabilities, progress
  callback, and registry cleanup.
- `src/sse.ts` and `src/protocol-datastar.ts`: parser buffer, event fields, last event ID, retry
  value, and streaming `TextDecoder` live only for one Datastar response adapter invocation.

### UI controllers

The following modules keep one or more element-keyed controller records and monotonic generated-ID
counters: `calendar`, `carousel`, `chart`, `clipboard`, `code-block`, `color-picker`, `combobox`,
`countdown`, `data-table`, `disclosure`, `editable`, `feed`, `file-upload`, `form`, `hover-card`,
`input-otp`, `json-viewer`, `log-viewer`, `menu`, `menubar`, `message-scroller`, `multi-select`,
`number-field`, `pagination`, `password-field`, `popover`, `questionnaire`, `rating`, `resizable`,
`search-field`, `select`, `sidebar`, `sortable`, `stepper`, `tabs`, `tags-input`, `time-picker`,
`toast`, `toggle`, `toolbar`, `tooltip`, `transfer-list`, and `tree`. `src/ui/index.ts` keeps the
dialog record, enhancement mark, and ID sequence.

Additional retained UI state is explicit:

- `combobox`, `hover-card`, `menu`, `multi-select`, `popover`, `select`, `toast`, and `tooltip` keep
  active-record sets. Their persistent document/window listeners and per-document set cleanup are
  owned by the injected document host.
- `sidebar` installs its document shortcut through the document host.
- `toast` installs its disconnected-node observer through the document host. Toast timers,
  announcers, swipe state, and focus/hover state remain controller records.
- `countdown` keeps the scheduled-record set and shared clock. `carousel`, `clipboard`,
  `hover-card`, `menu`, `menubar`, `message-scroller`, `multi-select`, `select`, `toast`, `tooltip`,
  and `tree` retain controller timers.
- `message-scroller` retains a controller observer. `resizable` retains pointer-session window
  listeners until that session ends. These are controller resources, not persistent document-host
  installations.

## Capability boundaries

Applications receive only expression compilation, the committed helper and fixed-capability
snapshots, directive definitions, action resolution, identity allocation, an owned DOM-observer
factory, action boundary, operation subscription, finite task registration, active
render-preservation roots, and creation/destruction notifications. UI controller factories receive
the plugin's explicit action registrar. Persistent UI work uses the staged document host and
activates only after the complete plugin transaction validates. Neither applications nor UI
factories receive the kernel object.

Plugin installers receive only a synchronous staging registrar. It can stage actions, directives,
expression helpers below the plugin's namespace, request middleware, operation observers, protocol
profiles, per-application hooks, activation, document-host work, and kernel cleanup. It cannot
access the kernel, live registries, another facade, or a commit function. The registrar refuses
later use. The kernel derives the fixed `stores` capability from the atomically committed official
facade. Optional task and kernel-observation hooks on the staged document host are present only for
framework-marked official plugins; external plugins cannot access them. Request middleware receives
only frozen request metadata, one guarded `next()`, branded terminal factories, and the request's
read-only abort signal; it never receives the kernel or application context.

A profile request preparer receives frozen metadata, serialized filtered signals, form encoding but
not entries, and a bounded writer. A response adapter receives frozen response metadata, one body
lease, the request abort signal, and patch/event functions scoped to that response. Profiles are
trusted plugins because those functions can mutate the owning application's signals or DOM.

`DocumentHost.listen()`, `observe()`, and `own()` are the only supported paths for persistent
document-wide resources. The ledger reports named owner/kind pairs and guarantees at-most-once
cleanup. It does not claim to discover browser work created outside these capabilities.

## Disposal contract

Public core/root disposal is idempotent. It marks the kernel disposed before cleanup starts,
abandons unsettled render operations, destroys every tracked application and its plugin-hook
cleanup, releases every ledger record in reverse registration order, runs plugin cleanup in reverse
install/registration order, clears actions, request middleware, protocol profiles and active bodies,
and namespace claims, disposes the selected expression engine, releases the document installation
claim while retaining the terminal engine identity claim, and removes only the jQuery properties
installed by that runtime. Success returns one frozen JSON-safe `StarDisposalReport`. Failure throws
a `StarDisposalError` containing every original error and that same report after the complete sweep.
Repeated calls return the same report or throw the same error object. Application destruction first
aborts its requests and releases its middleware/profile links and scoped operation subscriptions.
Plugin middleware, profile, and observer cleanup are idempotent when their registries have already
been disposed. Later plugin/action registration, application boot, identity allocation, expression
compilation or cache clearing, document listener installation, document observer installation,
resource ownership, or subscription registration fails.

Internal patches and the public render adapter remove outgoing application records before
destruction, destroy nested roots inside-out while their DOM remains connected, and release
surviving owner subtrees. The public adapter never performs the external mutation. It tracks exact
`data-jqs-preserve` and caller-supplied identities, suppresses teardown/remount during retained-node
moves, validates promised roots after mutation, restores focus, and boots only explicit incoming
roots. Missing promised roots are cleaned and reported. `whenEnhanced()` waits for all pending
render transactions, observer delivery, directive/UI enhancement, finite registered directive tasks,
and reactive work; `nextUpdate()` remains limited to reactive scheduling.

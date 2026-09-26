# Runtime ownership

Form document continuation: Form records use the shared UI resource scope and captured
document/window. Listener acquisition is provisional and releases partial setup. Current operations
retain control, Field and message identities plus native validation source only for their guarded
continuation. Reset/invalid microtasks check record identity, revision, parts and cancellation
before acting. Adoption retires the source record and reacquires destination listeners; later source
disposal cannot retire the replacement. Per-form request intent and per-control
server-message/description ownership use weak maps. They preserve native state through reacquisition
without retaining a document from a global collection. These bindings do not establish heap or
complete cross-cutting audit acceptance.

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

Within one kernel, an application rooted on a plain `data-jqs` marker stops its declarative scans,
mutation updates and request cancellation at descendant plain application islands. A page-wide
`$.star.boot()` application keeps its document-wide scope. A named UI component marker stays in the
surrounding application's directive scope. The current boundary does not settle explicit separate
application startup on a named component root.

The root package keeps its 0.1 auto-install behavior. `jquery-star/core` explicitly installs the
same kernel without UI or Datastar; `jquery-star/ui`, `jquery-star/datastar`, and
`jquery-star/stores` and `jquery-star/persist` are immutable official plugins. `jquery-star/testing`
and `jquery-star/datastar/testing` are caller-operated test adapters. These modular entries have no
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
  response records, cancellation callbacks, and exact target property descriptors. Failed property
  removal is reported; controller disposal still attempts every target. No request can pass through
  to the real network. Each abort/delay fixture owns its signal listener. Cancellation removes that
  listener, leaves the caller's signal unchanged and closes the delayed callback before attempting
  timer cancellation. A timer-host failure is reported but cannot resume canceled work or prevent
  its rejection.
- `src/testing/realm.ts`: one process-local ambient lease plus the current callback's finite global
  descriptor stack. It rejects a second lease before mutation and clears the lease after attempting
  every restoration. Refused deletion of a temporary global is a cleanup failure, combined with any
  callback failure; a caller-made non-configurable property cannot be removed.
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
  stages are released and never enter installed maps. Staged document resources register cleanup
  before activation. Installer/activation callbacks cannot commit after disposal or application
  startup. Application hooks stop at owner destruction and release returned cleanup before rollback.
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
  graph, release stack, abort controller, and operation sequence. Provisional lifetime ownership
  precedes setup. A private name/definition reservation set exists only across synchronous
  definition calls and releases its entries in `finally`. Rollback and disposal consume the release
  stack, and failed effect/subscription acquisition stops the initially evaluated runner. Ended
  contexts refuse new callback work and immediately release supplied cleanup. No store record exists
  at process scope, and failed setup is removed before the name can be observed.
- `src/expression.ts`: trusted location-keyed value and statement maps plus disposed state inside
  each created engine; one root-export compatibility engine.
- `src/csp/`: immutable contract tables and AST records; each CSP engine retains a successful-only
  128-entry/262,144-byte LRU, disposed state, and no live contexts. Evaluation frames own bounded
  step/async counters and capability tags only for one invocation. Synchronous declarative computed
  reads in the same application share those counters and an active-getter set. A temporary module
  record carries only the application identity and budget during a getter call and restores the
  previous record in `finally`; it does not retain a context between evaluations. The evaluator's
  private read-only literal-argument method set is fixed policy metadata, shared across frames
  without storing application, argument or result data.
- `src/expression-runtime.ts`: a `WeakMap` associates live application identities with exact action/
  helper resolvers, raw action startup, and the declarative getter-ownership predicate. The CSP
  evaluator checks the exact application state before consulting the predicate for its key/getter
  pair. A branded weak set recognizes internal call results. An action result exposes only a
  read-only view of its existing operation liveness; request/action cancellation ownership remains
  in `src/observation.ts`.

A render operation keeps its captured preserved-focus target and a transient retry anchor. Commit
still attempts focus synchronously. If that call receives no focus event and leaves the active
element unchanged, settlement retries once after UI enhancement. The kernel must remain alive, the
render must remain latest, and the target must remain connected in the captured document with no
newer active element. A successful focus followed by deliberate blur does not retry. The temporary
focus listener is released even if registration throws after taking effect; deferred focus errors
use the existing enhancement-error barrier. This adds no retained module-level resource or API.

### Applications and scheduling

- `src/runtime.ts`: behavior-application state, computed proxy, effects, mounted rules, once sets,
  debounce timers, throttle timestamps, mutation observer, namespace, expression-runtime release,
  and destroyed flag.
- `src/declarative.ts`: attribute-application state, computed proxy, effects, registered
  element/attribute directive records and reverse cleanup stacks, per-attribute legacy cleanup maps,
  mutation observer, event debounce/throttle closures, expression-runtime release, and destroyed
  flag. A private map binds live declarative computed getters to their authored keys. Declaration
  cleanup deletes the ownership record before restoring the previous descriptor. Removing a nested
  declaration can restore an earlier, still-owned getter; removed getters cannot regain access by
  being copied back into state. Its shared native form-value helpers retain no application, element,
  callback, or jQuery selection between calls; the unchecked-radio sentinel is an immutable module
  constant.
- Provisional registered directives enter the teardown map before their mount callback. Their task
  controller and optional kernel release function belong to the directive from factory invocation
  onward; failed registration aborts and detaches them. A returned effect is stopped if its initial
  callback released the owner. Destroyed applications stop scanning, and mount/update cleanup
  returned after release runs immediately. Late task rejection stays observed after detachment.
  Built-in effect and model initialization also rechecks application lifetime after the first
  callback. A released application stops the returned runner before recording it or installing model
  listeners.
- `src/reactivity.ts`: dependency/proxy/raw indexes, current effect, owned pending effects, pending
  unowned failures, and flush flag.
- `src/fetch.ts`: active requests by element and root; selected profile, request abort controller,
  private replayable body, validated middleware descriptor, retry delay, visibility listener,
  lifecycle counters, and response state live in each request. Each root counts its active requests
  per controller. Settlement releases one reference, so a shared-controller sibling remains owned
  until its own settlement or root cleanup. Application debounce records are removed when replaced
  or fired, before action invocation; teardown clears the remaining timers.
- `src/protocol.ts`: one active response owns frozen metadata, a single-claim body lease, optional
  stream reader, cancellation promise, adapter task, scoped patch/event capabilities, progress
  callback, and registry cleanup.
- `src/sse.ts` and `src/protocol-datastar.ts`: parser buffer, event fields, last event ID, retry
  value, and streaming `TextDecoder` live only for one Datastar response adapter invocation.

### UI controllers

The following modules keep one or more element-keyed controller records and monotonic generated-ID
counters: `calendar`, `carousel`, `chart`, `copy`, `color-picker`, `combobox`, `countdown`,
`data-table`, `disclosure`, `editable`, `feed`, `file-upload`, `form`, `hover-card`, `input-otp`,
`json-viewer`, `log-viewer`, `menu`, `menubar`, `message-scroller`, `multi-select`, `number-field`,
`pagination`, `password-field`, `popover`, `questionnaire`, `rating`, `resizable`, `search-field`,
`select`, `sidebar`, `sortable`, `stepper`, `tabs`, `tags-input`, `time-picker`, `toast`, `toggle`,
`toolbar`, `tooltip`, `transfer-list`, and `tree`. `src/ui/index.ts` keeps the dialog record,
enhancement mark, and ID sequence.

Password Field replaces its weak record and releases the old input/button listeners when valid child
parts change. Chart records the current rendered-part identities and invalidates its data signature
when those parts are replaced, preserving retry after canceled rendering.

`copy` owns the shared Clipboard and Code Block records; their original modules compose only the
public APIs and named actions. Records capture document/window, current output parts, generated
description ownership, accepted task, temporary button state and reset deadline. Root request
intents and accepted task identities separate callback supersession from accepted browser work.
Adoption transfers pending results and remaining reset time; ordinary disposal retires publication
without changing each caller's promise result. Cleanup removes only generated descriptions and
runtime-owned button state. Timer and button resources are registered before acquisition, including
late acquisition after reentrant disposal. An acquisition error still observes any native promise
already started. The owning-document fallback removes its temporary textarea after every selection
or copy attempt, including refused and thrown attempts.

JSON Viewer and Log Viewer capture document/window and current parts in scoped records. Weak
retained viewer snapshots contain data and part references, without a live window or cleanup owner.
JSON retains its rendered signature, value and disclosure state by path; reads resolve current parts
and writes have root intents/revisions guarding serializer and DOM callbacks. Parse handling is
separate from interrupted DOM work. Log Viewer retains pause/follow preferences, owns native
filter/viewport listeners before acquisition, and releases each binding independently. A queued
follow token belongs to one record/window and is checked before and after layout reads. Replacement
viewport enhancement can acquire new follow work while old callbacks remain inert. Newer operations
stop older append/clear continuations and callbacks from input getters.

Form-bound Search Field, Rating, Color Picker and Time Picker controllers retain the form identity
used for listener registration. When enhancement sees a different form with the same parts, it
releases the old binding and rewires the existing controller, preserving its current native value.
File Upload and Multi Select capture the exact form in their binding cleanup. Replacing a native
control, moving its component or changing its `form` attribute cannot leave the old form listener
registered after re-enhancement.

File Upload associates its rendered-file signature with the current list element. Multi Select
invalidates tag rendering when the tags element changes and includes option metadata and disabled
state in its signature. Before a changed native control or content causes controller replacement,
Multi Select hides the former floating content, removes its active-set entry and cancels its search
timer, then releases listeners. Structural replacement releases that former owner even when an
ordinary before-close handler would veto a user-requested close.

Rating, Color Picker and Time Picker queued reset callbacks check that their controller is still the
root's current record before writing. A callback belonging to replaced native controls cannot
restore stale values through current reflected state. Current controllers retain normal native reset
behavior. The browser task can still run; this guard prevents stale effects and does not claim task
cancellation or immediate collection.

Number Field validates current native parts before reusing its weak controller record. Changed input
or increment/decrement buttons release the old exact listeners, including the named native change
callback, before a new record is installed. Unchanged parts retain the existing controller and
reflected/native value behavior. The generated ID counter remains scalar module state.

JSON Viewer retains one weak record and updates its current source, tree and status on enhancement.
Its normalized source text cache includes empty input as `null`, and changed part identities
invalidate that cache. Parsed values and generated disclosure nodes belong to this controller; the
module adds no listener, timer or observer.

Log Viewer retains one weak record across part replacement. Each enhancement releases the exact
previous native filter/scroll bindings before binding current elements. Its queued scroll captures
the record, reads the current viewport, and checks connected/following/paused state before writing.
Pause and follow state survive part replacement. A queued microtask may still run; this check guards
its effect and does not promise cancellation or immediate collection.

Disclosure's weak record updates current summary/content references, while its cleanup captures the
exact summary used for registration. Its one native details toggle callback remains attached to the
same details root. Replacing parts removes the old summary click/keydown listeners before rebinding.

Editable retains one weak record across part replacement and removes the old native control's exact
keydown callback before binding the current control. Current part references, committed value and
native draft have separate roles: enhancement preserves the draft during editing and synchronizes
current native or explicit root values outside editing. No timer, observer or global root collection
is added by these corrections.

Countdown retains one weak controller and updates current output/status references on enhancement.
Live ownership is a separate token holding its document clock and release callback. Retirement
invalidates that token, removes it from the clock and leaves scalar deadline/pause state available
for later enhancement. The clock installs its interval lease before calling native `setInterval`;
late handles are canceled after reentrant retirement, and failed acquisition releases every
participant in that provisional lease. Cancellation detaches the lease before native cleanup, so
reentrant replacement scheduling cannot be overwritten. Ticks require the current lease, ownership,
document and operation revision; callbacks cannot advance new work using an earlier tick timestamp.
Old-document work retires on adoption, and completion notifications use the owning window. Its
strong scheduled-owner set contains running countdowns until completion, pause or scope retirement.
A tick also retires disconnected or adopted roots. Reinsertion and enhancement restore a
still-running record's schedule, while paused/completed records remain unscheduled. Each document's
shared interval stops when its set becomes empty. Kernel disposal and render removal release
scheduled work synchronously; native removal releases it at observer delivery or the next scoped
acquisition.

Tabs' weak controller holds its selected value and a map of exact native trigger cleanups. Each
enhancement releases and clears that map before binding current trigger/value/panel records, so
renamed values and replacement panels do not leave stale callback data retained. Dialog's weak
record retains its focus-return trigger. Generated title/description strings live in the shared weak
attribute map described below; current parts update only owned references. Its native root listeners
remain one-time bindings.

Input OTP and Tags Input retain current document/part records only while resources are live.
Unchanged enhancement keeps exact listeners and generated children. Replacement or adoption releases
the old record before acquiring destination resources, preserving a newer record created during
cleanup. Input OTP weakly remembers its last reflected value to distinguish authored changes from
silent native edits. Tags Input retains values in its documented root state and preserves draft
selection/composition in the native control. Its replacement list invalidates an inherited cache.

Both controllers use the shared provisional listener and cleanup helpers. Input OTP also owns its
current form's reset listener and a provisional timeout. Retired callbacks cannot acquire a new
record, and revisions stop old native/component/status notifications after newer work. Unchanged
focus/enhancement does not consume a pending completion notification. Toggle and Toggle Group
capture their document and resources similarly; group records track item identity and effective
constraints, retain current roving focus and release setup resources if native form-field generation
fails.

Tabs, Toolbar, Pagination and Sidebar use captured document/window resource records. Parts and
record identity gate native callbacks; operation revisions stop superseded transitions. Ownership
and exact removal callbacks are registered before native setup, cleanup sweeps later resources after
failures, and cleanup reentry cannot overwrite a newer destination record. Unchanged enhancement
preserves exact bindings. Sidebar additionally retains a weak snapshot of expanded/mobile state,
desktop preference and last reflected value; this snapshot contains no native resources. It survives
source disposal so destination media changes can restore the desktop preference. Its media listener
and storage access belong to the captured window, and its shortcut selects an available root in the
host document. Focus return requires a current accepted close.

Disclosure owns a captured document/part record for each details element and uses a weak Accordion
revision counter to invalidate pending work across sibling callbacks. Unchanged enhancement reflects
native state without consuming a queued toggle notification. Summary default actions and native
named-details exclusion remain in the platform. Editable and Stepper also capture document/window,
current parts and operation revisions. Editable retains its committed value in root state while the
native control keeps its draft/selection. Stepper retains completion through its reflected state and
step attributes. Source disposal before destination acquisition preserves those values. Listener
setup is provisional, cleanup sweeps failures and replacement records survive cleanup reentry.

Additional retained UI state is explicit:

- `combobox`, `hover-card`, `menu`, `multi-select`, `popover`, `select`, `toast`, and `tooltip` keep
  active-record sets. Their persistent document/window listeners are owned by the injected document
  host; scoped controller cleanup removes active records.
- `sidebar` installs its document shortcut through the document host.
- `toast` uses kernel scope removal instead of a separate disconnected-node observer. Scoped
  controller records own timers, swipe capture and focus/hover state. Announcements additionally
  belong to viewport scopes. Weak retained state stores only open/closed status and remaining
  duration for later enhancement.
- `countdown` keeps the scheduled-record set and shared clock. `carousel`, `copy` (Clipboard),
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

`own(kind, owner, cleanup, root)` optionally ties a resource to an Element in the host document.
Render `beforeRemove()` releases its subtree resources before DOM removal, excluding promised
preserved subtrees. Commit or failure releases promised roots that went missing. Native removal
releases disconnected or adopted roots at observer delivery or before later scoped acquisition,
while connected moves in the same document retain ownership. New scoped work drains earlier removal
records first and rechecks availability after cleanup; an earlier removal cannot retire a newly
acquired detached resource. Only still-preserved removed roots remain deferred. Cleanup is
idempotent and removes its ledger entry before calling user code; failures do not skip other
cleanup. `canOwn(root)` rejects foreign roots, disposed hosts and active removal boundaries.
Detached roots outside an active boundary remain valid acquisition targets. Custom document hosts
may omit this optional capability.

The UI resource audit is in progress under ticket 0006. `src/ui/lifecycle.ts` activates ownership
transactionally, uses the official live host for later acquisitions, and rejects retained facade
calls after disposal or replacement installation. The enrolled families are listed in the
[component contract](COMPONENT_ARCHITECTURE.md#public-contract). Live ownership is invalidated
before native cleanup so later enhancement can acquire one current resource set. Weakly retained
state, including Countdown deadlines, is separate from live ownership. Interrupted acquisition also
releases provisional side effects. Countdown preserves its deadline and schedules separately in each
document. Dialog releases its runtime modal state, Sidebar detaches its media listener, Clipboard
restores temporarily disabled buttons, and late copies, resets, queued scrolling and serializer
callbacks cannot update retired records. All 50 families have scoped enrollment; cross-cutting
provisional acquisition, callback, adoption and complete host-matrix review remain in progress.

Form owns native listeners and invalidates pending reset/invalid notifications on retirement.
Resizable captures the window used for each pointer session and releases its listeners and capture
on teardown, including interrupted or failed setup. File Upload rebinds current control/form
listeners while retaining a current pending reset. Sortable cancels a live preview without rendering
old state into replacement parts. Input OTP and Tags Input own their native listeners and stop event
continuations after disposal.

Both Menu variants share scoped floating-record cleanup: it removes the weak/active record and
captured listeners, cancels component timers and hides a runtime-open panel without events or focus
restoration. Native show/hide and focus callbacks are retirement boundaries, including during part
replacement. Tooltip retains authored description tokens. Menu retains its current listener set and
long press across unchanged enhancement. Menubar owns its separate listeners/typeahead and preserves
them when menu and trigger identities are unchanged. Timers capture the scheduling window; floating
geometry resolves the owning window. Sibling close, selection and keyboard continuations stop after
callback disposal. Automatic observer enhancement ignores nodes no longer contained by its document,
while explicit detached acquisition remains supported.

Popover now owns a captured `UIResources` record before native listener acquisition. Exact document,
direct parts and declarative click ownership identify the current record. A weak root snapshot
retains open state and owned focus across adoption; ordinary same-document reacquisition stays
closed. Root intent spans setup and cleanup, while per-record revisions guard event, native
show/hide, geometry and focus continuations, including newer no-op requests. Interrupted native
calls reconcile only with the current owner of that exact content. Toggle delivery reads actual
native state; stable enhancement restores a preserved panel before the kernel retries focus.
Listeners and document dismissal use native brands and captured owners. Cleanup releases all
resources, closes silently and cannot overwrite a replacement Popover owner. The remaining floating
families' public document/resource failures stay under review.

Tooltip also uses a captured `UIResources` record published before listener acquisition. Its weak
snapshot retains document, exact parts, open/pointer/focus state and a pending absolute deadline.
Adoption creates new physical resources and schedules the remaining delay in the new window. Each
pending timer has its own cancel identity, provisional cleanup and original scheduling window; late
callbacks cannot act after replacement. Stable enhancement leaves the timer and listener set intact.
Root intent and record revisions protect setup/cleanup, native transitions and geometry. Cleanup
snapshots state, removes its generated description association, then hides the old native panel, so
reentrant destination acquisition owns its own token. Independent cleanup callbacks still run after
a failure. Description ID refresh preserves authored tokens. Ordinary same-document reacquisition
starts closed without a pending timer. Menu, Context Menu and Menubar ownership is described below.

Menu and Context Menu capture direct parts, scoped items, action binding, document and window in UI
resources. Their snapshots preserve accepted open state, focused item, context point and absolute
search/long-press deadlines within the same kind. A kind handoff gets its own acceptance and event.
Native calls use shared content ownership and deferred current-revision completions. Selection
rechecks current item/group identity and live constraints before checked-state changes or default
activation. Geometry, focus and sibling-close callbacks cannot resume superseded requests.

Menubar publishes its own resource record before listeners and refreshes children through the
current document's Menu collection. Parent request revisions guard every child call and focus
continuation. Closing all children also invalidates pending openings whose reflected state is still
closed, and stops if a child callback chooses a newer parent request. Child events are accepted only
from direct owned menus. Stable enhancement preserves bindings, roving focus and the search timer;
adoption transfers only its remaining deadline. Provisional acquisition and exhaustive cleanup cover
listeners and timers even when acquisition reenters disposal or throws.

Hover Card uses the same captured resource and absolute-deadline boundaries, retaining interactive
content focus across document adoption. Exact parts scope title association and native activation. A
revision-bound dismissal marker suppresses reopening during native focus return without consuming
later deliberate focus. Delayed interaction remembers whether its root began connected, so a native
departure timer cannot erase preserved open state while that root is detached. Explicitly detached
interaction remains available. Cleanup snapshots state before closing and releases every listener
and timer even when one removal fails.

`src/ui/floating.ts` holds a weak native content-owner index for Popover, Tooltip, Hover Card, Menu
and Context Menu. Claiming content retires its previous record after publishing the replacement
owner. The shared native-call marker prevents nested platform operations on that content. New
desired state and revision-bound completion callbacks wait for reconciliation against the current
owner and actual native state. Stable native rejection is reflected without repeated attempts.
Completion callbacks recheck ownership/revision before focus, placement or lifecycle events; cleanup
drops them and only removes its own claim. These callbacks are transient and do not enter retained
root snapshots.

Color Picker, Time Picker, Multi Select, Select and Combobox use the shared captured form-reset
binding in `src/ui/lifecycle.ts`. It tracks every pending timeout in the original window, detaches
the captured form listener and invalidates queued callbacks on cleanup. Canceled resets and
removed/reassociated controls do not update retired UI. Select and Combobox own reset bindings
separately from option listeners, so ordinary rewiring retains a pending current reset. Their native
value/query and component event continuations stop after disposal. Multi Select scopes its native,
label, panel and typeahead resources and keeps sibling closing within its document. Its cleanup
reflects selected/empty state; Combobox cleanup handles inline and native popover panels.

File Upload captures a `UIResources` record for exact native control/form, list, status, dropzone
and document/window identity before acquiring listeners. Native File identity governs transitions;
metadata and exact row identity govern rendering reuse. Weak retained state preserves rows and drag
depth across adoption, with rejection state retained only for the same native files. Cleanup retires
drag state before listener removal can acquire newer ownership. Reset microtasks check captured
record, revision and late cancellation, retaining the existing reset timing. Facades reacquire stale
parts and stop if cleanup disposes their scope. Validation, event dispatch and DataTransfer
construction/item/write boundaries recheck the current native selection, constraints and operation.
The runtime does not introduce a fake native files property to conceal a failed platform write.
Explicit array overrides in controller fixtures are separate from native browser evidence.

Color Picker also captures a `UIResources` record before listener acquisition, with exact native
control, text, preview, status, form and document identity. Weak native-text state retains draft
selection/composition and invalid status across record replacement and source disposal. Weak last
reflection distinguishes a root patch from a silent native value. Exact synthetic-event identity
allows nested native edits, while operation revisions, constraints and root values stop stale
commit/cancellation continuations. Shared provisional listener/reset resources sweep cleanup
failures and cancel handles returned after disposal. Retiring cleanup cannot resume acquisition in a
disposed scope. Native color probes and CSS parsing belong to the control's document.

Time Picker additionally captures a `UIResources` record before native listener setup. Exact
control/button/form identity and document ownership guard callbacks and facade reuse. Acquisition
failure or reentrant disposal removes partially registered listeners; cleanup attempts every
remaining removal even when one throws. A weak last-reflected value distinguishes a server patch
from native edits retained through disposal/adoption. The owned reset helper preserves pending work
through unchanged enhancement and invalidates timers after newer requests, including no-ops. Native
and component events use the captured window. Operation revisions prevent a callback's newer value
from being overwritten or followed by stale notifications. Step probes leave the live native control
untouched until commit.

Select captures its document, form, native label/control, trigger/content, generated option
identities and native option signature. Facades reacquire stale records before operating. A weak
last-reflected value preserves silent native selection, while an adopted open record retains its
active option across source disposal. Stable enhancement keeps native bindings, pending resets and
typeahead work. Provisional resource acquisition removes late listeners/timers; teardown sweeps
later cleanup after a failure and preserves ownership created by cleanup callbacks. Native popover
completion is reconciled with newer open/close intent. Revisions guard native notifications, sibling
closing, focus and scrolling. Select passes a continuation guard to `positionFloating` so retirement
during measurement cannot write stale geometry; other floating callers require their own review.
Preserved runtime-open native popovers are restored without re-emitting open.

Combobox captures query/hidden controls and their forms, content/options, inline mode and the
document/window in a `UIResources` record. Stable enhancement keeps exact native bindings and
pending resets. Weak input defaults preserve the original query/value reset baseline despite hidden
input value writes, and a retained snapshot preserves drafts, composition and exploration across
adoption. Native/component events use the captured window. Exact synthetic-event identity allows a
callback's distinct native event to supersede older work. Revisions and live part/value/constraint
checks stop stale selection, query, clear and popup continuations. Provisional listeners and reset
timers are released even when setup returns after disposal; teardown sweeps later removals after a
failure and preserves destination ownership created during cleanup. Inline/native mode belongs to
the outgoing record during teardown. Combobox also uses the floating geometry continuation guard,
reconciles native popup completion and restores a preserved runtime-open popup without resetting
exploration. Global focus, outside-click and viewport handlers check the captured document.

Multi Select uses a captured `UIResources` record for native control/form/label, generated option
identity, trigger/content/tags/status and document/window ownership. Native option signatures
include empty option groups. Weak reflected JSON and generated-node caches retain native selection
and current options/tags during reacquisition; an adopted record also retains exploration and the
remaining typeahead interval. Replacing the control or content closes the former popup. Listener,
reset and typeahead acquisition is provisional, and cleanup sweeps later resources after failures
while preserving reentrant destination ownership. Native events use the captured window and exact
event identity so distinct native edits supersede synthetic notification work. Operation/document
revisions guard selection, sibling closing, typeahead, focus and geometry continuations. Current
constraints are checked after before-change and between native notifications. Disabled native
selections remain locked during UI changes. Delegated options/remove buttons and keyboard input stay
inside the current controller. Generated labels use the shared attribute ownership helpers. Native
popup cancellation, late show/hide completion and preservation follow current ownership.

Tree captures exact item, row, group, label, parent and document identities in `UIResources` before
acquiring listeners. Stable enhancement retains bindings and active exploration. A weak snapshot
retains the active item/value and typeahead text/expiry across replacement and either source
disposal order; destination work uses its own timer and event constructors. Provisional timer and
listener acquisition releases late resources, and teardown sweeps every cleanup after failures. Root
intent and record revisions stop stale work after reentrant setup, cleanup, callbacks and native
focus. Selection, expansion, sibling/ancestor loops and select-all recheck current parts and live
values, disabling and expansion state. Generated ARIA uses shared attribute ownership. Tree retains
no generated form fields.

Transfer List owns a `UIResources` record before native acquisition. It captures selects, their
actual form owners, buttons/operations, status and document; operation snapshots additionally bind
exact options and generated fields with values, highlights/defaults and live constraints. Stable
parts retain listeners and native state. A weak reflected-value cache distinguishes explicit root
patches from silent native membership changes across disposal/adoption. Root intent spans facade
acquisition and cleanup reentry; revisions guard no-op requests, component/native callbacks and
queued reset work. Listener/reset acquisition is provisional and cleanup sweeps all resources.

Generated root ARIA and button disabling remain distinct from authored state. Native selects and
option flags govern disabling, highlights and reset defaults. Reset updates button state after
native highlight restoration without changing assigned membership or emitting membership events.
Both select form owners are rebound on reassociation, and pending work survives stable enhancement
while rejecting canceled, superseded and retired callbacks. Generated fields retain ordered
submission, reuse stable nodes and reflect disabled membership. Events use the captured window and
copied arrays. Native `button[data-jqs="button"]` styling markers do not introduce a controller
boundary; nested controllers still exclude their parts and events from the parent Transfer List.

Feed owns More/content listeners, pending focus and its observer. Cleanup clears the observer
reference before disconnection; a revision check rejects stale delivery and interrupted observer
replacement, including reentrant construction/disconnection. A provisional observer is disconnected
if superseded before acquisition finishes. The constructor and boundary focus resolve through the
component's owning window/document. Load, completion, reset, focus and scrolling cannot continue a
retired controller.

Chart owns a captured document, current native parts, render revision and in-progress render token.
Its retained snapshot preserves unchanged output identity and accepted type across adoption. Cleared
or replaced output and interrupted writes cannot satisfy the completed-render cache. Callback and
DOM-write continuations recheck owner, parts, revision and source configuration. Read-only facade
calls during before-render do not recursively render. SVG/legend nodes and events use the captured
document/window. Private actions retain the installation document even if their application moves.

Data Table captures exact current controls and owns native removals before registration. Unchanged
enhancement retains its bindings; retirement deletes the old record before cleanup can reenter.
Request revisions and source snapshots stop superseded sorting, filtering, paging and output writes.
Before-sort exposes proposed metadata while read-only facade access leaves row order uncommitted. A
weakly keyed snapshot retains selected IDs, initial-seeding status, filter, weak row order and weak
authored-disabled metadata, without a live listener or strong row roster. Initial checked rows seed
only after complete validation and only once across page replacement and detach/reinsert. Adoption
keeps that history regardless of source disposal order. Interrupted acquisition releases late
listeners, and cleanup attempts every removal while preserving setup/cleanup failures.

Questionnaire scopes its exact root, button and containing-form bindings. It registers removals
before native setup, aggregates cleanup failures and keeps a newer record acquired during removal.
Reset timers use the captured window and are canceled even when disposal interrupts scheduling.
Unchanged item/form/button identities retain those bindings and pending resets. A separate WeakMap
holds only default navigation and submitted state for reacquisition; answers remain in native
controls. Transition revisions reject old cancellation rollback, answer-event loops, validation,
focus/scrolling and submit continuation after disposal or newer work. The committing flag is
restored in finally, including nested answer writes and thrown dispatch. Fieldset checks and
generated skip inputs use the owning document without extending the public DOM realm lease.

Toast captures the installation document, scheduling window and clock. Its scope owns listeners,
timer revisions, swipe capture and active-set membership. A separate weak snapshot retains the
remaining display budget without retaining live resources. Changed close/action parts replace exact
bindings while retaining the current timer and announcement; unchanged enhancement does not rebind.
Provisional timers, capture and appended announcement nodes are released if disposal interrupts
native setup. Cleanup sweeps failures and creation rollback preserves the original error.

Toast announcements register viewport ownership before append/scheduling. Live-toast cleanup calls
their release; successful dismissal leaves that viewport-owned ten-second announcement active.
Viewport or kernel cleanup always releases it. Dismissal retires the visual record before removal
and uses the original installation lifetime to guard subsequent focus and notification. This keeps
normal dismissal events without allowing a replacement installation to revive an old continuation.
Pointer, focus, document visibility and window blur each prevent timer resumption while active.

## Disposal contract

Public core/root disposal is idempotent. It marks the kernel disposed before cleanup starts,
abandons unsettled render operations, destroys every tracked application and its plugin-hook
cleanup, releases every ledger record in reverse registration order, runs plugin cleanup in reverse
install/registration order, clears actions, request middleware, protocol profiles and active bodies,
and namespace claims, disposes the selected expression engine, releases the document installation
claim while retaining the terminal engine identity claim, and removes only the jQuery properties
installed by that runtime. Success returns one frozen JSON-safe `StarDisposalReport`. Failure throws
a `StarDisposalError` containing every original error and that same report after the complete sweep.
Report formatting contains prototype traps, changing error accessors, and failed string conversion.
Unreadable thrown values use `ThrownValue` / `Cleanup failed.` without interrupting later cleanup;
the aggregate still retains the original values. Error fields are read once and bounded as strings.
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

## Persistence ownership

`src/persist.ts` owns a per-kernel attachment map, default memory adapter, and random origin. Each
attachment owns its store subscription, one trailing timer, external adapter subscription, accepted
revision/content, and redacted observers. The kernel registers one attachment service after its
store service. Reverse disposal makes persistence terminal and flushes before the store is released.
All cleanup paths run even when writes or adapter cleanup fail. Borrowed adapters remain caller
owned. No persistence map, timer, storage listener, or browser-storage access is created by import.

Persistence checks its lifetime after synchronous codec, migration, clock and adapter callbacks.
Startup also rechecks the pre-application boundary before hydration can commit. Subscription cleanup
returned after disposal is released immediately; cleanup slots are consumed before callbacks run.
Interrupted setup is never published or flushed, and resumed operations preserve the terminal
report.

The persistence facade consumes its attachment map before invoking disposal callbacks, contains
thrown attachment-disposal failures and still releases its default memory adapter. Reentrant kernel
disposal retains the normal terminal error while allowing the remaining cleanup sweep to finish.

## Resource strategy research boundary

The [resource comparison](decisions/RESOURCE_STRATEGY.md) adds no production cache owner. Its three
prototypes live under `test/fixtures/resource-strategy/` and are rejected by production import and
package checks. The private external package has its own exact lock and never enters root manifests.

For the supported registry composition, application hooks own consumer subscriptions and the
coordinator owns its backend read. One consumer leaving cannot abort another consumer's work. The
last release cancels outstanding work, and kernel disposal releases all subscriptions. Immediate
registrar cleanup must cover allocations made before plugin activation, even when a document service
will also own them after activation. Identity or tenant changes must dispose old application work
and load canonical server output; the fixture proves this with full navigation.

Browser evidence measures actual timeout/interval residue alongside public disposal reports. The
native research cache also rejects timer allocation from a retained lease after disposal.

## Inspection ownership

`src/kernel-metadata.ts` owns bounded inventory projection, opaque kernel identity and shared
attachment slots. The registry in `src/metadata-adapter.ts` is created on explicit attachment and
uses weak keys for installed kernels. The generic kernel capability is cleared at final disposal.
Terminal handles retain only numeric category totals and a scalar sequence, with no kernel,
application, serializer, DOM or original disposal report.

`src/inspect/collector.ts` owns client leases, selected subscriptions, trace data and one earliest
policy-expiry timer. Default-off attachment owns no observer, trace array or timer. Releasing the
controller clears data and policies; final lease release removes the collector. Kernel disposal
closes every client and releases all resources even when a callback throws. Cleanup failures are
counted once; the terminal public report records failed owned collector cleanup.

## Behavior setup and detached mounts

Behavior application ownership begins during setup. Initial binding callbacks that destroy their
application cannot leave their runner subscribed or install later handlers, mounts or an observer. A
mount's provisional record owns its cleanup slot; cleanup returned after that record is released
runs immediately. Full root destruction releases the entire owned mount map, including nodes that
left the root before observer delivery. Subtree cleanup retains its containment and preservation
boundaries. Error propagation and repeated-destruction guarantees apply to these paths as well.

Declarative attribute cleanup follows the same full-root ownership boundary: DOM detachment does not
remove an element from its application's cleanup map. Destruction releases those records and their
directive cleanup, model handlers and event listeners even before observer delivery. Scoped subtree
cleanup keeps containment and preserved-root exclusions.

All six conformance cases share one explicit owner for their factory-returned harness. Before an
explicit disposal attempt, completion or failure releases that harness. A distinct cleanup error is
retained alongside the original work error. The case keeps its own expected-disposal-failure and
idempotence assertions. The module's fixed native freeze-function reference holds no application
data. Caller-created DOM realms remain caller-owned.

### External Form events and floating title IDs

Form queries `form.elements` for each operation and retains no external-control list. Its existing
weak form record owns local form callbacks and invalid-event coalescing. Three DocumentHost
listeners delegate external invalid/input/change events by resolving the current native association
and weak record at event time. Contained controls are handled locally once. Host disposal removes
external delegation; detached local forms retain their existing native event behavior. No observer
or strong form collection is added.

Popover and Hover Card use the shared weak generated-attribute map for their title associations.
Current content replacement copies only generated strings to its new weak key, so copied owned
references can update while different authored ARIA remains intact. Their active-record sets, native
callbacks, timers and document-service lifetimes remain as previously described.

### Deferred Message Scroller work and Feed article IDs

DOM identity and document ownership are separate checks. The internal `src/dom.ts` helpers use a
native Node getter to recognize nodes across frame windows and adoption, then distinguish HTML
namespaces and tag names. Getter lookup is lazy, so modular imports do no DOM work. A lookalike
object is not a DOM node. Kernel render/preservation/incoming boundaries and the common UI guard
still require the installation's current `ownerDocument` and available scope.

The first controller document review covers Countdown, Carousel, Message Scroller and Dialog. Their
explicit and automatic enhancement, facade targets and private actions accept their owning frame's
nodes. Adoption retires old ownership and reacquires destination listeners, clocks and observers;
former facades reject the moved target. Carousel recalculates native focus pause in the destination
while retaining explicit user pause. Dialog restores native modality after a preserved
remove/reinsert, ignores old queued close events after reopening and confines focus to its owning
document. The remaining controller families still require the same review and evidence.

Number Field, Password Field, Search Field and Rating also capture their document/window and current
native parts. Adoption retires their source record before destination acquisition. Shared resource
helpers own listeners before registration, sweep cleanup failures and invalidate retired callbacks.
Each transition captures a revision before user callbacks. Reflected Number/Search/Rating attributes
are remembered weakly, so reacquisition distinguishes authored attribute changes from silent native
edits. Native form-reset listeners and provisional timers for Number Field, Search Field and Rating
belong to the current record; cancellation, later work or ownership/part changes prevent stale
synchronization. Unchanged enhancement retains a pending reset.

Carousel and Message Scroller use shared internal resource helpers to register cleanup before each
native listener or observer acquisition. Their Element-scoped records invalidate before cleanup,
attempt every release and preserve both setup and cleanup errors. A replacement acquired during
cleanup remains the current record. Native callbacks check current ownership and parts.

Each timeout has a provisional identity installed before scheduling and detached before native
cancellation. A late returned handle is canceled if its owner or operation changed. Saved canceled
callbacks cannot run newer work. Carousel's unchanged enhancement preserves the autoplay deadline
and pending swipe; its explicit user pause survives retirement in a weak root map. Message Scroller
retains follow choice, unread count and known message identities separately from live resources. It
retains its observer and queued follow during unchanged enhancement, and cancels timers, disconnects
the observer and removes listeners during scoped cleanup. Automatic scrolling still requires current
connection and following state. Operation revisions stop stale continuations after cancelable slide
events, focus, scrolling or native resource callbacks.

Feed uses the shared generated-attribute WeakMap with only title/description strings under weak
native article keys. Each item synchronization resolves current parts and adjusts only owned
references. There is no added strong article roster, timer or listener. Feed's existing sentinel
observer and pending keyboard focus retain their prior controller lifetimes.

Form's native root bindings are registered once. Its former local cleanup closure was never called
and is removed; the weak form record no longer stores it. The documented detached local-form
behavior and document-host cleanup of external event delegation remain unchanged.

### Resizable pointer-session ownership and Transfer List comparisons

Resizable's weak controller retains current panels/handles, sizes, collapse restoration and an
optional active drag cleanup. Initial native bindings belong to the current handles. Only pointer
start registers window movement/completion/cancel callbacks; a consumed session cleanup removes
those exact callbacks, clears drag state and releases capture on the original handle. Current-part
replacement invokes it before releasing old handle bindings. Unchanged enhancement keeps the active
session, while movement after disconnection cancels without further sizing writes. No idle window
listener or removal observer is added. An active session still needs completion, replacement or a
later disconnected movement; immediate host-wide cancellation is not claimed.

The record now uses UIResources with its native document/window. A child resource record owns each
pointer session. Its listeners and capture cleanup are registered before native acquisition, so late
acquisition after disposal is released on return. Retiring a session clears its parent link before
sweeping all cleanup callbacks, including when a removal throws. Delivery for replaced parts can
retire the session without applying sizes. Weak retained state contains copied sizes and collapse
values, with no part/window references. Request snapshots are temporary and expected writes update
them; newer intents, replacement or source changes invalidate the old operation.

Transfer List's comparison uses JSON serialization of the ordered string arrays. Temporary strings
replace separator-joined signatures without adding retained state or restricting accepted values.
Its native option ownership, exact current callback cleanup and hidden-input serialization remain
unchanged.

### Canceled component state changes

Stepper resets its finished flag only after a step transition is accepted, alongside its existing
index/completed-value rollback on cancellation. Menubar derives its open index, root state/value and
active trigger from child Menu states after close requests, including canceled closes. These
corrections alter scalar state transitions and add no retained collection, timer or listener.

### Sortable preview replacement

Generated hidden inputs are reconciled only when their closest Sortable root is the current record's
root. Parent rendering leaves nested controller inputs intact. This adds an operation-local filter
without retaining an input roster or introducing an observer.

Sortable's weak controller retains the current list/items, grabbed item and original order during a
preview. Enhancement preserves that controller only while list and item identities match. Changed
parts release exact old list callbacks and create current idle state; no old renderer writes
replacement DOM. JSON order comparisons add only operation-local strings and preserve exact item
values. No timer, observer or external listener is added.

The controller now owns its native installation document/window, current scoped parts and six list
listeners through UIResources. Unchanged enhancement retains those listeners. Setup cleanup is
provisional, and listener removal sweeps failures. Temporary request snapshots include current
parts, source attributes and generated input identities. They stop older native writes, focus and
notification chains after replacement, a source patch or a newer request. Cleanup restores a preview
only while its document, parts and authored value remain owned; it cannot overwrite a newer record.
Generated inputs remain scoped by the closest Sortable root, including matching nested field names.

### Navigation bridge disposal barriers

Turbo disposal uses its existing idle-waiter set for already-settling core operations and fails
transactions that have not begun settlement. The disposed flag prevents new bridge work. The
memoized report waits for captured operations, while delayed host renderer completion remains
host-owned. No per-operation completion field or additional retained collection is introduced.

htmx disposal uses each active operation's existing completion promise. A pending commit completes
core enhancement and then terminates the disposed bridge operation without another host event. A
completed core commit awaiting host settlement closes directly. Both bridges memoize disposal before
settling captured work and remove listeners and observers once; htmx also releases its strong
prepared-request set. No additional timer or host call is introduced.

The htmx no-swap path marks its request synchronously. Its former queued callback only repeated that
same write and is removed, avoiding a redundant temporary capture of the host event/request. Public
observation snapshots remain shallow frozen copies without retaining an identity-map callback.

### Current labels, resets, identities and picker parts

The shared floating helper keeps generated attribute strings in one WeakMap keyed by the labelled
element. It compares each current value with the last generated value before updating or removing
it. Label/reference transitions remove the obsolete generated alternative; different authored ARIA
wins. Popup part replacement copies scalar ownership metadata to the current element, without
retaining its predecessor. Dialog, Feed, Popover, Hover Card, Menu, Select, Combobox, Toast and
Questionnaire share this comparison. No listener, timer or strong element roster is added.

Menu, Select and Combobox sibling closure enumerates only records belonging to their root's
document. Select/Combobox queued resets capture current native controls and the form, then check
cancellation, part identity, containment and current association before applying state or events.
Questionnaire queued resets additionally require the same active weak record and containing form.
Its button cleanup captures exact nodes; submitted state changes only after accepted navigation. The
original default value remains a scalar preference, with current rendering choosing an enabled
question if that item has been removed.

Combobox/Tree ID assignment uses a temporary Set of current owned IDs and skips occupied suffixes;
authored IDs and existing nodes remain unchanged. Data Table drops its historical initialized-ID
Set. The existing first-seeding flag and selected-ID Set preserve chosen values across manual pages,
without retaining every unselected row identifier. Disabled native checkboxes stay outside bulk
selection and its counts; disabled Tree items cannot activate.

Calendar and picker records use the shared UI resource helpers and realm-independent native element
checks. Request intent precedes listener acquisition, including next/previous and picker operations.
Records compare current required/optional parts and source state before continuing after callbacks.
A render token separates read-only facade access from newer requests and commits its cache only
after guarded live writes. Retained output identity preserves unchanged days during adoption. Native
Date brand checks accept foreign Date values without calling user replacements for Date getters, and
UTC construction preserves years below 100.

Picker records separately acquire their Calendar and Popover through the destination installation.
Facade access reacquires an open child Popover before source cleanup. Current controls, trigger,
label, content and form associations guard native writes and notifications. Internal event ownership
prevents an older Calendar change from notifying the picker again after an earlier listener starts a
newer selection. Event detail objects do not supply mutable internal state. Direct native field
patches stop the remaining input/change/component chain.

Calendar, Range Calendar, Date Picker and Date Range Picker register their logical records and exact
listeners with the owning root scope. Retirement invalidates the record before removing listeners;
cleanup sweeps all captured removals and preserves setup/cleanup failures. Delegated callbacks
cannot reacquire retired records. Weakly keyed Calendar focus and picker initial-seeding flags
retain state without retaining live resources. Selected values and viewed month remain in native
controls and documented attributes. Unchanged enhancement keeps live grid nodes and picker bindings.

Picker records capture their controls, Calendar, Popover, associated forms and scheduling window.
Distinct forms own one reset listener each. Retirement clears reset timers; queued callbacks also
check the record, association, cancellation and transition revision. Pending focus has a separate
revision so unchanged enhancement retains it while close, selection, replacement and retirement
invalidate it. Every native input/change and component callback is followed by a current-record
check before continuing. Child Calendar and Popover scopes remain independent; unavailable children
cannot acquire resources through an available picker. Generated Calendar nodes, native constructor
checks and active-focus lookup use the owning document. Calendar transitions compare the last
rendered signature when enhancement changes constraints or selected state.

Calendar retains the current grid identity with its render signature, recorded after focus state is
established. Its native root handlers remain registered once, without an unused cleanup closure.
Picker enhancement consumes exact previous callbacks before binding current validated native parts.
Deferred focus requires the captured controls and Popover/calendar ownership still to match and the
Popover to remain open, then uses the current roving day. The queued closure is transient; no new
persistent timer, observer or collection is introduced.

### Questionnaire document continuation

Questionnaire uses shared UI resources for captured documents/windows, native listeners and reset
timers. Records retain current form, fieldsets, controls and output/navigation parts. Request intent
is established before enhancement or argument iteration. Each operation owns a source snapshot and
checks scope, record identity, revision, parts and source after live writes. Native radio changes
are reflected in the expected snapshot. Read-only facades do not render during a pending operation.
Weak maps retain only default/submitted history and request intent by root; a weak set records
runtime-disabled previous buttons. Cleanup retires a record before releasing listeners and timers,
so adoption or cleanup reentry can acquire a replacement without later source cleanup removing it.
These bindings do not establish complete heap, performance or cross-cutting acceptance.

### Toast document and continuation guards

Toast registers its record before initial live writes. A failed or interrupted acquisition releases
provisional listeners, timers and announcement ownership. Each operation captures current native
parts, viewport and relevant source attributes. Native writes update their expected attribute value
before checking the continuation. A newer dismissal, replaced part, source change, adoption,
outgoing root or disposed installation stops older work. Cleanup retires the record before removing
listeners, and unchanged enhancement retains the current binding. Parent identity is checked after
cleanup and removal, while focus recovery checks the installation document.

The scope revision begins before show option getters and clear traversal. A getter that disposes the
installation or starts a newer show/clear cannot attach the pending Toast. Native/jQuery
named-action cancellation and target constraints apply independently of direct programmatic APIs.
Adoption keeps remaining display time and native controls in both cleanup orders. Focus transfers
between controls do not reacquire a dismissal timer. Invalid action alternatives are rejected before
attachment.

### Feed document and observer ownership

Feed records retain their installation document and window through the existing UI resource owner.
Native DOM brands allow independent windows and both adoption cleanup orders. Replacement parts
retire captured listeners; old owners and outgoing/disposed roots cannot acquire more work. Current
source snapshots and operation revisions protect label, attribute, status and focus writes. A newer
completion/reset/failure or getter callback supersedes the older continuation. Unchanged inspection
does not cancel a current before-load callback.

Observer construction and observe calls have provisional cleanup registered first. Delivery is
ignored until the handle is published and must still match the record and observer revision. If
observe reacquires observation after disposal, the late handle is disconnected again on return or
throw. Cleanup continues across independent resources after an error. Unchanged enhancement keeps
observation; configuration changes and explicit completion/reset retire the previous observer before
acquiring another. The shared first-scope/kernel ownership contract is described below; its complete
cross-cutting audit remains tracked by owner 0006.

Feed's local identifier allocator checks the owning document and detached subtree before assigning a
generated root, article, title or description ID. The assignment uses the same operation guard as
other live attributes, so interruption cannot continue into later parts. Existing authored IDs and
retained article IDs are preserved; new items do not reuse identifiers after index changes.

## First scoped acquisition

Kernel observer ownership begins before reading the native constructor. Cleanup retires the callback
before disconnecting. Checks after constructor lookup, construction and observe reject an
interrupted acquisition; the failure path disconnects any handle returned or observed after earlier
retirement. Ordinary setup failure disconnects once. Observation registered after disposal's first
disconnect requires another disconnect. Setup and cleanup failures are preserved in an
AggregateError, in that order. A constructor that throws without returning its private handle
remains responsible for it.

Reentrant first scoped setup may temporarily create two native observer candidates. The kernel
retains the newer removal observer and releases the superseded candidate. Scoped acquisition checks
its original connection state after native setup or removal cleanup: a connected root that becomes
detached cannot register new work. Initially detached roots and connected same-document moves remain
valid. Failed host ownership does not invoke the caller’s cleanup; UI's acquisition wrapper owns
rollback of its provisional resources.

Every UI record exposes usable, idempotent cleanup before entering the shared scope acquisition.
Retiring it immediately removes only its own map entry and releases local resources. The eventual
native ownership handle is released if the provisional lifetime has already ended. A newer record
survives old success, failure and cleanup errors. Toast follows this same private cleanup contract.
Pagination and Stepper initialize their first values before acquisition and preserve any newer
request accepted during it. Eight controllers stop retired setup before metadata or rendering.

Floating controls track whether initial DOM metadata setup started. Cleanup of an unopened,
uninitialized record releases resources without writing new closed-state attributes. A control
opened by reentrant work is still closed, including when that happens before initial setup returns.
These boundaries are exercised with native constructors and methods under deliberate synchronous
instrumentation; ordinary browser constructors are not claimed to call application callbacks.

### Document listener acquisition and identity

DocumentHost owns a provisional listener resource before reading the native add method or caller
option getters. It reads capture/once/passive/signal once, preserving the original getter receiver
and omitted passive/signal members. The captured dictionary has no prototype. Native registration
validates signals; removal uses the captured callback and capture boolean. Cleanup retires delivery
before native removal and removes accounting even if removal throws. Setup and cleanup failures are
retained together. Registration completed after disposal is removed again on return or throw.

A kernel-local weak index keys native listener identities by target, type, caller callback and
capture. Completed duplicates share one guarded native callback; either successful ownership handle
removes that registration. Failed duplicate setup preserves an earlier successful owner. Pending
registrations are distinct: newer nested setup retires the older identity, whose eventual cleanup
can remove only its own callback. Once delivery retires identity before application code runs;
aborted registrations are not reused. Old handles cannot revoke a newer once/abort/release lifetime.
Use the returned handle, rather than native removal with the caller callback, to release ownership.
The index adds no signal listener or strong target roster. This contract is verified for native
cross-window targets; general retained-document heap analysis remains part of the full audit.

Listener acquisition order is allocated before method and option lookup. A completed matching
identity records its most recent successful acquisition. Older calls that resume after newer getter
or native-call work retire their provisional resource without claiming that newer cleanup. This also
protects a previously completed native owner when the nested call is a duplicate. Ordinary
sequential duplicates retain their shared native identity and either-handle cleanup contract.

Plugin installation stages listeners before activation. The staging record supplies a private active
predicate to Kernel acquisition, so cancellation during native method/options reads stops setup, and
cancellation during native add suppresses the pending callback before it can dispatch. Late native
registration is removed when add returns or throws. A canceled provisional duplicate cannot retire
an earlier completed owner, and an older canceled listener cannot remove a newer replacement. The
private capability leaves the public DocumentHost signature and custom-host staging path unchanged.
Resource accounting retires before removal; native setup and cleanup failures remain observable.

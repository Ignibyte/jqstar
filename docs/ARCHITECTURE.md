# Architecture

## Runtime flow

```text
HTML attributes or behavior definition
              |
              v
       document kernel
              |
              v
       Application instance
       /        |         \
 reactive   expressions   named actions
  state         |             |
       \        |        backend actions
        v       v             |
        effects and UI rules  HTTP
              |               |
              v               v
             DOM <--- JSON signals / Datastar SSE / HTML patches
```

`installStarCore($, options)` explicitly claims one supplied or ambient document for one kernel and
canonical jQuery instance, then adds `$.fn.star` and a core-only `$.star`. `installStar($, options)`
is the compatibility composition: core, the official Datastar profile, then the official UI plugin.
The root package imports jQuery and runs that composition; modular imports perform no installation.
The optional `expressionEngine` is selected before the claim. The kernel owns actions, registered
directive/helper, request-middleware, and protocol-profile snapshots, application records, that
unique engine, and a typed ledger for document resources and subscriptions. Each application owns
one reactive state object, computed getters, registered effects, mounted UI rules and directives,
finite directive tasks, request cancellation state, and a kernel-owned `MutationObserver`.
Application construction stages this work and commits the kernel record and jQuery data only after
setup succeeds. Failed setup rolls back staged work. Destruction removes cleanup records before
invoking them, attempts every event, effect, request, mount, directive, observer, and data cleanup,
removes the kernel record, and then reports one error or an aggregate.

Persistent UI document/window listeners and observers are installed through the document host and
released during idempotent public disposal. `$.star.dispose()` returns a frozen terminal report,
memoizes the same report or typed aggregate failure for repeated calls, removes only its own jQuery
properties, and releases the document claim for a clean reinstall with a fresh engine. A disposed
expression engine remains permanently claimed and cannot be installed into another kernel. See
[RUNTIME_OWNERSHIP.md](RUNTIME_OWNERSHIP.md) for the complete retained-state matrix and the work
assigned to later extension tickets.

The package has six JavaScript boundaries. The root is auto-installing ESM/CommonJS and the only UMD
global. `core`, `ui`, `datastar`, `testing`, and `datastar/testing` are side-effect-free
ESM/CommonJS preview entries with isolated declarations. Core declarations return a typed installed
jQuery value and do not augment global jQuery; only root declarations retain ambient augmentation.
Generic testing imports core but no DOM implementation, runner, UI, or Datastar code. Datastar test
fixtures stay in the separate SDK-backed entry. UI CSS remains a separate explicit import.

## jQuery ecosystem boundary

The application owns one real `jquery` peer. `$ is real jQuery` and `$name` is a reactive signal, so
the kernel neither substitutes a selector facade nor owns the peer's plugin registry. jQuery Migrate
is temporary application upgrade tooling. jQuery UI is an external coexistence and migration source.
jQuery Mobile and standalone Sizzle remain absent. QUnit is an installed-package test consumer only.
The dated, schema-validated decisions and downstream ownership IDs live in
[`quality/jquery-ecosystem.json`](../quality/jquery-ecosystem.json) and are explained in
[JQUERY_ECOSYSTEM.md](JQUERY_ECOSYSTEM.md).

## Public testing boundary

`src/testing/` owns a consumer-facing harness around `installStarCore()`. Creation validates one
caller-supplied Window/Document/jQuery realm, optionally installs a strict response controller, and
returns focused application, state, observation, event, finite-task, flush, destruction, and
disposal methods. It does not expose a jQuery proxy or kernel collections. A setup failure rolls
back the claimed core installation and restores every replaced fetch descriptor.

`withStarDOMRealm()` is an opt-in process-local compatibility lease, not the normal ownership model.
It snapshots a finite browser-global allowlist, rejects overlapping leases before mutation, and
restores exact descriptors in reverse order after callback and cleanup failures. DOM creation and
jQuery loading remain the caller's responsibility.

Harness `flush()` combines the public enhancement barrier with pending queued responses and
harness-registered finite promises. It repeats until owned work is stably empty or a round/time
bound is reached. Its failure diagnostic contains stable work IDs and owners only; it does not
inspect arbitrary timers, third-party promises, the network, live DOM, or signal values.

The response controller consumes exact FIFO expectations and has no passthrough. Generic fixtures
cover JSON, HTML, empty, HTTP error, network error, delay, retry, and abort outcomes.
`src/datastar/testing.ts` layers official-SDK-generated stream fixtures and fixed malformed bytes
over that controller without introducing another SSE encoder.

Runner-neutral core/plugin conformance functions own named cases and immutable reports. Test-runner
adapters own suite registration and assertion output. Plugin conformance includes public use,
failed-install rollback, idempotent teardown, and failed-cleanup report inspection. The package gate
packs external plugin and mock-navigation fixtures independently, installs them beside the jQStar
tarball, and rejects private/source-path resolution.

## External render interoperability

`createRenderAdapter()` is the only public ownership seam for a host that mutates DOM outside
jQStar. A transaction identifies one outgoing boundary, accepts exact live preservation roots,
deduplicates `beforeRemove()` boundaries, lets the caller perform its mutation, boots explicit
incoming roots, waits for the enhancement barrier, and settles through `commit()` or `fail()`. The
adapter does not send a request or mutate DOM.

The frozen [Turbo and htmx interoperability contract](INTEROPERABILITY.md) maps host-specific public
events to that adapter. It shares a lifecycle state machine, overlap policy, redacted observation
shape, and preservation checks without inventing a common host event API. Turbo and htmx retain
ownership of requests, forms, redirects, cache, history, focus, and DOM mutation.

`jquery-star/turbo` is the side-effect-free Turbo implementation of this boundary. Its explicit
factory validates the injected capability and version before its document-scoped plugin registers
listeners. It wraps only Turbo's public document and Frame render callbacks, owns only short-lived
jQStar render transactions and bounded redacted observations, and leaves Turbo in control of every
request and mutation. Ticket 0037 owns the separate future htmx plugin. Both follow the exact
manifest in `quality/external-bridge-contract.json`. Core, root, UI, Datastar, CSP, and testing
entries remain free of Turbo and htmx code.

## Plugin transactions

`src/plugin.ts` owns the public plugin API version, stable version-range checks, manifest graph,
object-identity facade cache, structural lock, application hooks, and kernel cleanup callbacks. The
kernel creates one plugin host beside its action registry. The host receives no global mutable
singleton and is not exposed to plugin installers.

`$.star.use(plugin)` is the typed single-plugin path. The array overload validates a complete batch.
Dependencies add dependency-to-consumer edges; `before` and `after` add explicit ordering edges.
Installed plugins are fixed before new candidates, ties retain request order, missing references and
cycles fail, and installers do not run until the graph is valid. Reentrant installation is rejected.

Each installer receives only a staging registrar for namespaced actions, exact or prefix directives,
expression helpers, request middleware, protocol profiles, application hooks, operation observers,
and cleanup callbacks. `src/registry.ts`, `src/directive.ts`, `src/request-middleware.ts`,
`src/protocol.ts`, and `src/observation.ts` prepare replacement action, directive, helper,
namespace, middleware, profile, and inactive observer records without publishing them. After all
synchronous installers return, the plugin host commits those snapshots with its installed-plugin,
hook, cleanup, and facade snapshots. A failure runs represented cleanup in reverse order and exposes
none of the staged state.

The first application identity allocation closes structural installation. Application construction
still happens first; `Kernel.trackApplication()` then runs plugin hooks before committing the kernel
record and jQuery data. Hook failure reverses earlier hook cleanup and lets the existing outer
application transaction destroy the uncommitted application. A committed kernel record owns its hook
cleanup, so explicit destruction, patch removal, and kernel disposal use one exact-once path. Kernel
disposal destroys applications before plugin-level cleanup, then clears actions and disposes the
expression engine while aggregating failures.

External plugin names are dot-qualified stable namespaces. `core` and `ui` plus their descendants
are reserved, and namespace claims cannot overlap. Framework-marked immutable `core.datastar` and
`ui` plugins alone may use those namespaces. UI controller factories receive the staged registrar
explicitly; import and failed installation create no actions, listeners, observers, or services.

External directive IDs and attributes remain below the installing plugin namespace. Exact and prefix
matchers cannot overlap. The registry also owns the built-in `core.text` and `core.destroy`
definitions, so those public attributes use the same mounted-record and cleanup lifecycle as an
external directive. Helpers use dotted JavaScript paths below the plugin name. Registry commits
rebuild frozen, null-prototype namespace containers without freezing plugin-owned leaf values.

## Expression scope

`StarExpressionEngine` exposes `compileValue`, `compileStatement`, `clearCache`, and `dispose`.
`src/expression-types.ts` holds that neutral contract. `src/expression.ts` creates one trusted
compiler/cache owner per kernel and compiles expressions with `Function` and a proxy-backed scope.
One engine object cannot be shared between kernels. The scope keeps these meanings stable:

- `$` is jQuery.
- `$name` reads or writes `state.name`.
- `el`, `$el`, `evt`, `root`, and `$root` describe the current element and application.
- `state`, `signals`, and `computed` expose explicit state objects.
- `@name(arguments)` resolves through the named action registry.
- `<plugin>.<helper>` resolves through the committed per-kernel helper snapshot.

Helper roots enter the scope before fixed bindings, so `$`, state, context, language, and browser
authorities cannot be shadowed even if registry validation regresses. The helper scope travels in
`StarContext`, which keeps custom expression engines on the same conformance contract.

Compilation accepts an optional authored attribute plus parser-provided line and column. Trusted
engine failures preserve the expression source and distinguish compilation, synchronous evaluation,
and asynchronous rejection. Declarative error events continue to carry the concrete element
separately, so engine caches never retain DOM nodes.

The root-level `compileValue`, `compileStatement`, and `clearExpressionCache` exports retain one
separate compatibility engine. They do not share the installed kernel's cache. Kernel disposal
invokes only the selected engine's idempotent disposal and invalidates evaluators retained from that
engine.

The trusted implementation requires `unsafe-eval` in the browser Content Security Policy.
`jquery-star/csp` publishes the frozen [`jqstar-csp-expression/1` contract](CSP_EXPRESSIONS.md) as a
tokenizer, immutable AST, parser, tagged-capability evaluator, diagnostics layer, and bounded engine
cache with no trusted-compiler import. Its explicit installer uses the same kernel/runtime boundary
without importing or selecting the trusted engine. Each application has a private `WeakMap`
association for exact helper lookup and pre-assimilation action/helper results. A versioned
realm-local registry lets independently bundled public entries share only these private provenance
brands and official-plugin identities. Destruction releases the application association. The raw
result record reads liveness from the existing action/request operation scope, so cancellation
cannot resume later CSP statements and does not create a second cancellation owner. State writes
reject accessors, and reviewed jQuery calls enforce fixed primitive-only non-callback signatures.

`installStarCSP()` is side-effect-free until called, creates the finite engine transactionally, and
rejects a live non-CSP installation. `createCSPExpressionEngine()` supports the existing explicit
`installStarCore($, { expressionEngine })` seam. The root entry retains trusted JavaScript
compatibility and does not import or auto-select CSP.

The CSP language is finite, not an untrusted-expression sandbox. It requires trusted markup and
trusted installed extensions and remains able to mutate state/DOM, call registered actions/helpers,
and use reviewed real-jQuery operations. The page policy governs inline scripts, styles, network
endpoints, third-party jQuery plugins, and application code. See the
[threat model](security/CSP_THREAT_MODEL.md) for the response-markup, helper-origin, async-result,
and lifecycle boundaries.

## Reactivity

`src/reactivity.ts` wraps objects with cached proxies. Effects track property reads, unsubscribe
before each rerun, and schedule changed dependencies in one microtask queue. Nested plain objects
and arrays become reactive on access. Computed values are read-only getters evaluated against the
current application context. Application effects carry an owner and error sink. One scheduled
failure is reported without skipping later effects; an unowned failure rejects the next reactive
barrier after the full batch runs.

## Declarative enhancement

`src/declarative.ts` discovers signal roots and supported attributes, builds application rules, and
boots them. Registered directives mount one record per element/attribute, use `update()` when
provided, and otherwise clean and remount. Their owned effects use the application owner. Their
finite tasks use abort signals and the kernel resource/enhancement ledgers. `MutationObserver`
support lets newly patched nodes mount without a page reload. UI controllers must also tolerate
repeated `$.star.ui.enhance()` calls because server patches can replace their internal elements.

## Backend responses

`src/fetch.ts` creates GET, POST, PUT, PATCH, and DELETE actions. One profile is selected before
request middleware. The root default is `core.datastar`; `core.generic` is explicit. A response can
be:

- JSON or `+json`, merged as a signal patch
- HTML or XHTML, patched inside the application root
- Datastar `text/event-stream`, parsed and applied event by event by `core.datastar`
- 204/205 or a missing body, passed to the profile's empty handler
- an error response mapped to a configured error signal

Requests can cancel automatically by element/action scope. Pending and error signals are managed
around the request. Retry policy is explicit.

## Protocol profiles

`src/protocol.ts` owns one profile registry per kernel and links tracked applications through a
`WeakMap`. `core.generic` and `core.datastar` are reserved built-ins. External profile IDs must be
descendants of their plugin namespace. Exact and structured-suffix media matchers, duplicate or
overlapping adapters, handlers, compatibility events, namespace ownership, and synchronous request
preparation validate before the shared plugin transaction commits.

Request preparation receives frozen, bounded input and a writer that can add query values, set or
remove ordinary headers, and select exactly one private body form: none, serialized JSON, or the
application-owned form. Profiles never receive form entries or files. `core.generic` sends only
explicit params, payload, or form data and removes Datastar headers and SSE preference.
`core.datastar` preserves the root 0.1 signal filtering, query/body encoding, media preference,
response hints, SSE interpretation, and lifecycle events.

Response selection first freezes bounded status, URL, redirect, header, and media metadata. Exactly
one adapter then gets an exclusive body lease for text or streaming plus scoped patch/event
capabilities. The lease, reader, adapter task, and active-body registry record close together on
success, failure, abort, application destruction, plugin cleanup, or kernel disposal. Late retained
capabilities fail. Stream patches commit as complete events arrive; a later parse failure does not
roll back earlier DOM or signal work.

## Request middleware

`src/request-middleware.ts` owns one registry per kernel and links each tracked application through
a `WeakMap`. Plugin definitions receive a plugin-qualified ID. A stable topological sort combines
the plugin transaction order with fully qualified `before` and `after` edges. Unknown targets,
duplicates, self-edges, conflicts, and cycles fail before the shared plugin transaction commits.
Plugin disposal removes that plugin's records; application and kernel disposal remove the weak links
and abort request-owned work.

`src/fetch.ts` creates one request operation and its private body before composition. The public
descriptor is a recursively frozen data snapshot: operation ID, method, serialized URL, normalized
header tuples, credentials, bounded body metadata, response target, selector, patch mode, and the
selected profile. It contains no body, DOM, state, controller, response, reader, stream, or mutable
browser request object.

Composition is one onion-shaped pre-dispatch stage per logical request. A callback gets one guarded
`next()` and branded `complete()` and `cancel()` factories. It must either return the exact inert
outcome received from `next()` or a terminal created for its current invocation. Duplicate or late
`next()` calls and forged, substituted, or stale outcomes fail without a second dispatch. Downstream
failures appear to upstream middleware only as normalized frozen data, while the final action still
throws the original value.

Immediately before the private dispatch, policy validation compares the final descriptor with the
authored one. Middleware may change the same-origin path/query and add ordinary headers. It cannot
change origin, URL credentials or fragment, method, credential mode, authored/protected headers,
body metadata, target, selector, patch mode, or profile. The chain runs before the retry loop, so
all attempts reuse the same validated descriptor, body, operation identity, and middleware side
effects. An abort races an unforgeable private sentinel, removes the listener on settlement,
detaches code that ignores cancellation, and prevents any late call from reaching dispatch.

## Operation observations

`src/observation.ts` owns one hub per kernel. Both application implementations send `run()` through
that hub, so named and direct actions use the same boundary. The hub assigns opaque monotonic IDs,
publishes one start and one terminal record, and connects a child request to its direct action with
`parentId`. A request keeps one ID through every progress event and retry.

`$.star.observeOperations()` subscribes to the current document kernel.
`instance.observeOperations()` filters the same stream to one application. Plugins can stage an
observer with `registrar.observeOperations()`. Every subscription is a kernel ledger resource.
Application destruction, plugin disposal or rollback, and kernel disposal release the corresponding
records through idempotent cleanup functions.

Delivery is synchronous and uses a stable subscriber snapshot. Observer return values are not
awaited. A throw or rejected promise goes only to that subscription's optional `onError` handler and
cannot change the action or request. Records are recursively frozen data. They contain no live
response, error, signal, state, DOM, or event object, and the hub retains no history.

The operation stream is separate from compatibility events. `core.datastar` preserves
`datastar-fetch`, `jquery-star:fetch`, and unknown-message `jquery-star:sse` behavior. The generic
profile emits only `jquery-star:fetch`; `jquery-star:error` remains the application failure event.

`src/patch.ts` applies signal patches or DOM patches. DOM patch modes cover outer replacement, inner
replacement, prepend, append, before, after, and removal. Every HTML and Datastar element patch
opens a kernel render transaction. Idiomorph callbacks and direct patch modes destroy outgoing
application roots deepest-first before removal and release surviving owners' subtree records.
`data-jqs-preserve` excludes an explicit application subtree from morph/removal. The patch remains
synchronous; `$.star.whenEnhanced()` waits for pending transactions, observer delivery, directive
and UI enhancement, finite registered directive tasks, and resulting reactive effects.
`nextUpdate()` remains the reactive-only barrier.

`createRenderAdapter(installedJQuery)` exposes the same ownership seam to an external renderer
without exposing kernel/application maps or performing a DOM mutation. `begin()` captures exact
same-document preservation identities and focus. Repeated `beforeRemove()` calls validate the
outgoing boundary, deduplicate overlap, keep protected subtrees live, and release all other roots
deepest first. `commit()` verifies retained identities, releases promised-but-missing roots, boots
only explicit incoming roots, restores preserved focus, and awaits `whenEnhanced()`. `fail()` adds
the host mutation error to the same complete cleanup path. Disposal owns and abandons an unsettled
render transaction as a named task.

## UI architecture

`src/ui/index.ts` receives kernel action-registration and document-host capabilities, constructs
controller collections, and publishes them through `$.star.ui`. A controller normally has:

- an `enhance(root)` pass
- a `WeakMap` record per component root
- delegated or explicitly cleaned event listeners
- a typed programmatic API
- registered `@ui.*` actions
- cancelable `before-*` events and final state events where state changes

See [COMPONENT_ARCHITECTURE.md](COMPONENT_ARCHITECTURE.md) for the public markup contract.

## Source blocks

A block composes registry components into an application workflow. Its HTML declares signals and
actions. Its TypeScript registers block-scoped actions and calls the backend. The Project Browser is
the reference server-driven block: Data Table owns table semantics and selection, Pagination owns
navigation semantics, the block owns request and presentation state, and the server owns validated
queries, grouping, page/virtual slicing, aggregates, and versioned writes. `server/project-store.ts`
isolates the migration-managed SQLite implementation so a host can inject another database adapter.

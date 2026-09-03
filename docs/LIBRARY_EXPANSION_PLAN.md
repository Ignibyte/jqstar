# Library expansion plan

Status: revised after adversarial review  
Created: 2026-08-30  
Updated: 2026-08-30

## Outcome

jQStar will become a complete HTML-first library for server-rendered applications. The stable
platform will provide an evidence-gated delivery workflow, an extension kernel, deterministic
application ownership, modular UI and Datastar integration, a CSP-compatible expression option,
supported testing tools, diagnostics, and release contracts. Optional release tracks will add shared
state, persistence, asynchronous data, and native HTML navigation after each track proves that it
fills a jQStar-specific need.

The program keeps the current product identity:

- `$` is real jQuery.
- `$name` is the local `name` signal.
- HTML and native browser behavior remain the primary representation.
- The server owns routes, permissions, validation, and application data.
- Registry blocks own application orchestration.
- jQStar owns generic browser behavior and cleanup.

The program does not add a virtual DOM, JSX, client component templates, a client route table,
database ownership, authentication, authorization, or tenancy.

## Release train

The work is split into stable platform releases and optional application-service releases. This
keeps 1.0 small enough to verify without abandoning the larger goal.

| Release | Outcome                                                                                        |
| ------- | ---------------------------------------------------------------------------------------------- |
| 0.2     | Install quality gates, then freeze behavior, package proof, topology, and lifecycle ownership. |
| 0.3     | Preview transactional plugins, public directives, observations, and request middleware.        |
| 0.4     | Preview modular core, UI, Datastar, CSP, testing, Turbo, and htmx entry points.                |
| 1.0     | Stabilize the platform plus tested jQuery UI and jQuery Mobile migration paths.                |
| 1.1     | Add stable optional stores and synchronous persistence.                                        |
| 1.2     | Add a resource package only if its proof chooses a design and reference use case.              |
| 1.3     | Add native navigation only if interoperability proofs leave a documented product gap.          |
| 1.4     | Add inspection, service adapters, and upgrade tooling. Add UI only after a usage go decision.  |

The root `jquery-star` import remains the compatibility product. Optional stores, persistence,
resources, navigation, CSP, testing, and inspection code do not enter that bundle unless explicitly
listed in the compatibility matrix.

## Current evidence

- `StarDefinition` accepts `state`, `computed`, `actions`, and `ui`.
- `StarStatic` exposes UI controllers, actions, booting, expression cache control, backend methods,
  and `nextUpdate`.
- Global actions live in one module-level map and are resolved directly by both application types.
- UI factories register actions into that map. UI controller records, global listener flags, and a
  document enhancement observer also live outside an application instance.
- Expression caches and the reactive scheduler are module-scoped.
- Declarative directives are a closed conditional chain and import the global expression compiler.
- Request construction, Datastar request encoding, response classification, streaming, retries,
  patching, and lifecycle events are coupled in `src/fetch.ts`.
- Requests always use Datastar request headers and signal encoding. Extracting only SSE response
  handling would not create a protocol-neutral core.
- An application observes its descendants. It cannot observe removal of its own root from a parent.
- Cleanup loops stop when a cleanup throws. Construction can fail after creating owned work but
  before the instance is stored for later destruction.
- `nextUpdate()` flushes reactive work. It is not a DOM enhancement or plugin-task commit barrier.
- The package has one JavaScript entry, one auto-install side effect, and one set of global jQuery
  declarations. It exports UI CSS but has no separate UI JavaScript entry.
- Package smoke tests read built files inside this repository. They do not install the actual
  tarball into isolated ESM, CommonJS, TypeScript, or browser consumers.
- Playwright currently runs Chromium only.
- `npm run check` does not enable Vitest coverage, so its configured thresholds are not enforced.
- The configured coverage census omits executable production surfaces outside `src/` and counts a
  declaration file at zero.
- No mutation, property-based, architecture, dead-code, duplicate-code, SAST, secret, documentation,
  public-API-report, package-type, or bundle-budget gate is installed.
- A green gate is not fingerprinted to the tested worktree, and no public CI workflow proves a clean
  checkout.

These facts make lifecycle ownership, packaging, expression-engine injection, and installed-package
proof prerequisites. The quality workflow is the prerequisite that makes evidence from those tickets
trustworthy. These are not cleanup tasks to postpone until the end.

## Quality and delivery foundation

[The quality and delivery program](QUALITY_PROGRAM.md) is part of the platform architecture, not a
release checklist added after implementation. It derives its controls from Rustal, Rustal Workflow,
AIC, and UCSOS v2 while keeping the public gate runnable without private Ignibyte services.

The public workflow remains Plan → Code → Test → Document. The gate runner supplies fast, delivery,
and full-audit modes. It fails closed on missing tools, empty required scopes, unreadable reports,
timeouts, result-recording failures, and stale worktree state. Delivery writes an atomic receipt
only when every enforced gate passes and the start/end content fingerprints match.

The JavaScript stack includes strict TypeScript and typed ESLint, architecture and dead-code checks,
security and secret scanning, production coverage, property tests, Chromium/Firefox/WebKit behavior,
accessibility, installed-package consumers, API and type reports, bundle budgets, generated-output
drift, documentation validation, and detector sabotage fixtures.

Coverage thresholds are ratchets. Changed production lines and functions require 100% coverage. No
generated baseline or blanket suppression can make a red gate green. Mutation testing is excluded
unless a future ticket is explicitly requested for it.

## Supported topology

Version 1.0 supports one jQStar kernel for one ambient `Window` and `Document`, using one canonical
jQuery instance. A kernel owns many application roots in that document.

Separate browser realms may load separate kernels. Multiple jQStar kernels or package copies
controlling the same document are not a 1.0 promise. The installer detects a claimed document host
where possible and reports a typed conflict. This avoids pretending that module-level UI behavior is
isolated when it is not.

The topology can expand later through a host adapter if iframe, multi-realm, or embedded-widget
evidence requires it. The testing contract assumes one ambient DOM realm per fixture and does not
promise safe concurrent replacement of global DOM constructors or `fetch`.

## Ownership model

The first architecture ticket records every mutable runtime object in an ownership matrix. The
target ownership is:

| Owner         | State and responsibilities                                                                                                                                       |
| ------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Kernel        | Actions, plugins, expression engine, operation IDs, observations, protocol profiles, services, application registry, owned-resource ledger, trace configuration. |
| Document host | UI enhancement observer, global delegated UI listeners, document eligibility listeners. The kernel creates and disposes this host.                               |
| Application   | Local state, computed values, effects, directive instances, application observers, requests, and application plugin hooks.                                       |
| Plugin        | Opaque service state and timers registered through kernel ownership capabilities.                                                                                |
| Process       | Immutable metadata only. Mutable caches and registries do not use process scope.                                                                                 |

Effect queues may batch work across applications inside one kernel, but each effect retains an
owner, error sink, and disposal record. One failing effect cannot prevent later effects in the same
batch from running.

## Target architecture

```text
                     jquery-star compatibility entry
                                  |
                   +--------------+--------------+
                   |                             |
        side-effect-free core installer       official UI plugin
                   |                             |
                   +---------- Datastar profile +
                                  |
                         installation kernel
          +-----------------------+-----------------------+
          |                       |                       |
   application manager     extension registries   operations and records
          |                       |                       |
   local applications      official/third-party       diagnostics
                                  plugins
          |                       |                       |
          +---------- real jQuery and native DOM -------+
                                  |
                server HTML / JSON / Datastar / other profiles
```

Optional packages install through the public plugin contract and retain their state behind typed
facades. The kernel does not gain fields for every optional package.

## Foundation contracts

### Kernel and disposal

The side-effect-free installer creates the kernel and binds it to the supported document host. The
root entry preserves the current auto-install behavior by importing jQuery and calling that
installer.

The public installation exposes `dispose()` for tests, embedders, and controlled teardown. Disposal:

1. stops new application or plugin installation
2. cancels kernel-owned operations
3. destroys applications from inner roots to outer roots
4. runs plugin and service cleanup
5. removes document listeners and observers
6. clears expression caches, subscriptions, and trace buffers
7. reports aggregated cleanup errors after attempting every cleanup

Disposal is idempotent. A disposed kernel cannot boot applications or install plugins.

### Transactional applications and render commits

Application creation becomes a two-phase operation:

1. Stage state, effects, directives, listeners, requests, UI rules, and plugin hooks in an owned
   ledger.
2. Commit the application to the kernel registry and root only after initialization succeeds.

If staging fails, the runtime rolls back every staged resource. Cleanup records are removed before
their functions run, cleanup continues after individual failures, and failures are aggregated.

Patches and later navigation use an explicit render transaction:

1. discover application roots and owned UI inside outgoing nodes
2. preserve roots explicitly marked for preservation
3. destroy outgoing owned roots before DOM removal
4. apply the DOM change
5. initialize incoming roots and UI
6. wait for directive setup, UI enhancement, and reactive effects
7. publish a render-committed record

`nextUpdate()` keeps its existing meaning. A separate `whenEnhanced()` or render result promise
represents this complete browser commit.

### Expression-engine interface

Both application modes receive an expression engine from the kernel. They do not import a global
compiler.

```ts
interface StarExpressionEngine {
  compileValue(source: string): StarValueEvaluator;
  compileStatement(source: string): StarStatementEvaluator;
  clearCache(): void;
  dispose(): void;
}
```

The current `Function` compiler becomes the trusted JavaScript engine and keeps existing expression
behavior. Its cache belongs to the kernel.

The CSP engine is an alternative implementation that does not call `eval`, `Function`, or equivalent
dynamic code construction. This is a CSP compatibility guarantee, not an untrusted-markup sandbox.
Both engines continue to require trusted expressions because they can call named actions, helpers,
real jQuery, and DOM operations.

The CSP grammar is versioned and documents its supported jQuery call forms. A conformance suite runs
the same supported bindings, events, actions, requests, and patches against both engines. The CSP
entry's module graph must not import the trusted JavaScript compiler.

### Transactional plugins

```ts
interface StarPluginManifest {
  name: string;
  version: string;
  apiVersion: string;
  dependencies?: Record<string, string>;
  before?: string[];
  after?: string[];
}

interface StarPlugin<Options, API> {
  manifest: StarPluginManifest;
  install(context: StarPluginContext, options: Options): API;
}

const api = $.star.use(plugin, options);
```

Plugin installation stages registrations, validates the complete manifest and dependency graph, and
commits all changes atomically. If installation fails, no action, directive, helper, adapter,
observer, application hook, service, or cleanup remains registered.

Rules:

- Reusing the same plugin object returns its existing API.
- A different object with the same plugin name is a typed conflict.
- The runtime does not compare arbitrary option objects.
- Plugin names own their extension namespace. `core.*` and `ui.*` are reserved.
- Missing dependencies, incompatible API ranges, cycles, duplicate registrations, invalid ordering,
  and late structural installation fail before commit.
- Structural plugin installation closes when the first application starts.
- Plugin setup can register kernel disposal and application setup callbacks. Application callbacks
  return exactly-once cleanup.
- Version 1.0 does not support uninstalling one plugin from a live kernel.

Optional packages return typed facades from `use()`. They do not add undeclared methods such as
`$.star.store` or `$.star.navigate` that may exist in TypeScript while missing at runtime.

### Directives and helpers

A public directive receives parsed attribute information, its element, the public application
context, the selected expression engine, owned effect creation, and cleanup registration. The
runtime guarantees one active directive instance per element and attribute.

Directive cleanup runs exactly once for:

- attribute removal
- `data-ignore` activation
- node removal
- Idiomorph replacement
- application destruction
- kernel disposal

At least one built-in directive moves through the public registry before the contract is considered
complete. External directives cannot shadow built-ins or another plugin's namespace.

Expression helpers add explicit non-dollar names. They cannot redefine `$`, change `$name`, or
shadow built-in context names. Shared stores use `stores.session`, not `$store`, because `$store`
must continue to mean the local `store` signal.

### Operations, observations, errors, and middleware

The kernel first implements concrete action and request operations. It does not freeze speculative
navigation, resource, or mutation stages before those packages exist.

Each operation receives a stable ID, owner, phase, timing, and cancellation reason. Observation
records are serializable metadata. They do not claim that DOM elements, `Response`, errors, or
application objects become immutable by freezing a wrapper.

Legacy jQuery events and thrown values retain their 0.x shapes. New typed observations carry a
normalized error record without changing error identity for existing listeners. Observer failures
are contained and cannot recurse indefinitely through the error channel.

Middleware uses one composition algorithm and one concrete stage before expanding:

```ts
$.star.intercept("request", async (descriptor, next) => {
  return next(descriptor);
});
```

- A middleware ID is unique inside its plugin namespace.
- `next` may be called once.
- Middleware receives inert typed descriptors, not a mutable `Request` or consumable `Response`.
- The executor validates the final URL, method, target, selector, headers, and credentials after
  middleware returns.
- Retry boundaries state whether middleware runs once per logical operation or once per attempt.
- Cancellation is distinct from error.
- Stream-event and patch behavior remain inside the owning protocol profile until a repeated public
  middleware need exists.

Navigation, resources, and mutations begin with package-local operations. They can adopt the kernel
pipeline only after two implementations prove the same cross-package contract.

### Protocol profiles

Transport extraction covers requests and responses together.

```ts
interface StarProtocolProfile {
  id: string;
  encodeRequest(operation: StarRequestOperation): StarRequestDescriptor;
  accepts: string[];
  selectResponse(response: StarResponseDescriptor): StarResponseAdapter;
  interpretHeaders(headers: Headers): StarResponseHints;
}
```

The generic core profile supports explicit params or payloads with JSON and HTML responses. It does
not send `Datastar-Request`, serialize signals into a `datastar` query parameter, advertise Datastar
SSE, or interpret Datastar headers.

The Datastar profile owns:

- `Datastar-Request`
- signal filtering and request serialization
- Datastar content negotiation
- Datastar SSE event meanings
- Datastar response headers and patch options
- the compatibility `datastar-fetch` event

The root entry installs the Datastar profile and remains byte-compatible with recorded 0.1 requests.
The existing generic SSE exports stay available from the root for compatibility, but no new public
SSE subpath is promised until a second maintained protocol needs it.

### UI as an official plugin

UI JavaScript receives a real package boundary. The UI plugin owns controller creation, `@ui.*`
action registration, document enhancement, global listeners, and disposal. The root compatibility
entry installs it and preserves `$.star.ui`.

UI controller instance records remain module-private where safe, but document listeners and
observers are created through the document host and released during kernel disposal. A modular core
consumer imports no UI controller JavaScript or CSS.

### jQuery ecosystem stewardship

The project modernizes applications that already depend on jQuery. It does not recreate every
historical jQuery project inside one package.

| Project        | Program decision                                                                                  |
| -------------- | ------------------------------------------------------------------------------------------------- |
| jQuery Core    | Use as the active foundation. Track supported releases and contribute compatibility fixes.        |
| jQuery UI      | Keep out of the runtime. Test coexistence and publish incremental component migration guidance.   |
| Sizzle         | Add no package or selector layer. Use the selector behavior supplied by jQuery Core.              |
| jQuery Mobile  | Keep out of the runtime. Preserve progressive-enhancement lessons in a no-runtime migration path. |
| QUnit          | Test one installed consumer without replacing internal Vitest and Playwright coverage.            |
| jQuery Migrate | Use as an opt-in upgrade aid and diagnostic input. Never bundle or auto-load it.                  |

The dated releases, OpenJS statuses, primary sources, and expiry policy live in
[`JQUERY_ECOSYSTEM.md`](JQUERY_ECOSYSTEM.md) and `quality/jquery-ecosystem.json`. As reviewed on
2026-09-03, the matrix records jQuery 4.0.0 as Impact, QUnit 2.26.0 as At-Large, UI 1.14.2, Mobile
1.4.1, and Sizzle 2.3.10 as Archived, and Migrate 4.0.2 as the current companion release.

The component catalog may exceed jQuery UI's widget breadth without being a drop-in replacement.
jQuery UI also defines interactions, effects, Position, the Widget Factory, ThemeRoller classes,
method dispatch, option, event, instance, and destruction contracts that jQStar does not claim.
Migration favors semantic HTML and the `$.star.ui` lifecycle. Any compatibility adapter requires a
separate evidence-backed go decision and a bounded implementation ticket.

jQuery Mobile contributes design lessons, not code. Direct URLs, native links and forms, responsive
layouts, keyboard and touch use, screen readers, reduced motion, and useful HTML before enhancement
remain requirements. Its page router, virtual mouse layer, transitions, themes, and auto-initialized
widget runtime are explicit non-goals.

Project naming and ecosystem claims remain independent unless OpenJS and the jQuery project grant
explicit permission. The working description is "an HTML-first UI and application library for
jQuery," not "jQuery UI 2" or "the new jQuery UI."

### Installed-package proof

Package tests build an actual tarball, install it outside the repository, and verify the advertised
interfaces from consumer projects.

Required fixtures cover:

- Node ESM
- required Node CommonJS entry points
- TypeScript `NodeNext`
- TypeScript `Bundler`
- browser module import
- root UMD script-tag behavior
- a bundled core-only consumer with tree-shaking inspection
- declaration and global jQuery augmentation behavior
- published-file contents and version consistency
- installed-package smoke projects in Chromium, Firefox, and WebKit

The baseline ticket decides which optional entry points need CommonJS or UMD. The plan does not
promise every format for every plugin.

Bundle reports record uncompressed and compressed bytes. A core-only bundle contains no UI,
Datastar, persistence, resource, navigation, CSP parser, testing, or inspection sentinels.

### Supported testing

`jquery-star/testing` is runner-neutral and assumes one caller-provided ambient DOM realm. It can:

- create and dispose a kernel
- mount declarative or behavior applications
- install selected plugins
- read public state and typed observation records
- flush reactive work and kernel-registered tasks
- trigger native or jQuery events
- supply generic JSON and HTML responses
- use protocol-owned fixtures for Datastar responses
- assert release of kernel-owned effects, tasks, listeners, observers, requests, subscriptions, and
  plugin hooks

It does not claim to find listeners, timers, or leaks created outside kernel ownership capabilities.
An example external plugin is built and tested using only published imports. This is the conformance
proof for third-party extensibility. One installed QUnit consumer runs the same public fixture to
prove that the testing package is runner-neutral. Vitest and Playwright remain the repository's
internal unit, integration, and browser tools.

## Stable 1.0 package shape

```text
jquery-star             auto-installing compatibility entry: core + UI + Datastar
jquery-star/core        side-effect-free installer, applications, reactivity, actions, JSON/HTML
jquery-star/ui          UI plugin and typed controller API
jquery-star/datastar    complete Datastar request and response profile
jquery-star/csp         CSP-compatible installer and expression engine
jquery-star/testing     DOM harness and kernel/plugin conformance helpers
jquery-star/turbo       lifecycle bridge for supported Turbo versions
jquery-star/htmx        lifecycle bridge for supported htmx versions
jquery-star/ui.css      compiled UI theme
```

All subpaths use the same package version and are stable when 1.0 ships. Experimental application
services are not published as stable subpaths until their own acceptance tickets pass.

## Interoperability before native navigation

jQStar will first publish one external render-lifecycle adapter. It discovers and destroys owned
roots in outgoing nodes, preserves explicitly marked roots, enhances incoming nodes after the
external commit, associates the work with an operation ID, and exposes the render barrier without
exposing application maps or patch internals.

Turbo and htmx then receive separate bridge packages and browser matrices. Each bridge imports only
declared public subpaths, maps library-specific lifecycle events to the shared adapter, and proves
no duplicate effects or UI handlers.

The proof application exercises:

- Turbo document visits and frames
- htmx swaps and history restoration
- current JSON, HTML, and Datastar patches
- nested application roots
- UI global listeners and repeated enhancement
- focus and native form behavior

After that proof, a decision ticket records gaps that an external navigation library cannot cover.
Native `jquery-star/navigation` proceeds only if the gaps are specific, user-visible, and cannot be
handled by a small bridge.

## Optional application-service tracks

### Stores and persistence

`jquery-star/stores` is the first post-1.0 service because multiple application roots have a direct
coordination need and the API fits existing reactivity.

```ts
const stores = $.star.use(storesPlugin);
const session = stores.define("session", {
  user: null,
  permissions: [],
});
```

Stores are per-kernel reactive singletons. They clone initial plain data, reject incompatible
duplicates, provide initialization and disposal, and appear as `context.stores` and `stores` in
expressions. They are not a normalized entity database, reducer framework, or authorization store.

`jquery-star/persist` is a separate plugin over stores. The first contract supports memory,
`localStorage`, `sessionStorage`, and custom synchronous adapters. It adds key namespaces, schema
versions, migrations, selected fields, corruption recovery, storage-event reconciliation, and
disposal. IndexedDB waits for an asynchronous boot contract. Tokens, passwords, and authorization
decisions remain out of browser persistence.

### Resource decision and implementation

Resources start with a proof ticket, not a public API implementation. The proof uses a registry
block that would otherwise duplicate asynchronous state across roots. It compares:

1. existing local signals and server patches
2. an adapter to a maintained framework-neutral query client
3. a small jQStar-owned resource client

The decision records bundle cost, lifecycle integration, server/HTML authority, cancellation,
testing, and maintenance. “No official resource package” is an acceptable result if the first option
or an adapter solves the actual use case.

If a native client is selected, `jquery-star/resources` separates a persistent per-kernel cache from
application-scoped leases. The contract defines key canonicalization, loader identity, exact and
prefix invalidation, subscriber ownership, per-consumer cancellation, shared-fetch cancellation,
stale time, garbage collection, and disposal before it runs loaders.

After the native client reference application is complete, its ticket records a separate mutation
go/no-go decision. A no decision marks the mutation ticket `declined` and keeps the supported server
write path. If approved, overlapping optimistic writes use ordered optimistic layers or a patch
journal. A failed earlier mutation cannot restore a snapshot over a later successful mutation.
Persistent offline queues remain deferred.

### Native navigation decision and implementation

Conditional `jquery-star/navigation` work begins only after lifecycle transactions, the
render-commit barrier, the browser matrix, installed-package proof, and Turbo/htmx bridges exist.

If approved, implementation is split into separate releases:

1. eligibility and same-origin GET document visits
2. application-aware body commits and allowlisted head reconciliation
3. history, focus, scroll, busy, progress, and failure recovery
4. native forms and submitter semantics
5. matching regions and lazy loading
6. bounded prefetch caching
7. optional View Transitions after cross-browser fallback proof

Native navigation never defines routes. It remains opt-in and is not installed by the root entry.

Decision-gated tickets remain `planned` until approval. A rejected decision marks every named child
ticket `declined`, links the evidence-backed alternative, and proves that no partial public subpath
or hidden implementation shipped. The final program audit requires every conditional ticket to be
`done` or `declined`.

Eligibility preserves normal browser behavior for modifier clicks, alternate targets, downloads,
cross-origin URLs, unsupported methods, and opted-out elements. Final eligibility is validated after
middleware.

A dispatched non-GET form is never replayed as a fallback. Pre-dispatch incompatibility can use
native submission. Post-response failure presents an error or follows a safe GET redirect supplied
by the response. Script execution, `<base>`, CSP nonces, asset reload markers, CSRF metadata, and
stylesheet behavior receive an explicit head policy before document commits ship.

Regions require a matching response region or use a documented pre-dispatch fallback. Prefetching is
in memory, bounded by entries and bytes, respects `Cache-Control: no-store`, and does not persist
credentialed responses by default.

## Diagnostics and later tooling

After store/persistence and resource/navigation decisions are terminal, `jquery-star/inspect` adds a
bounded, redacted trace buffer and serializers for every published official service. Trace metadata
is off by default in production. Request headers, bodies, state values, errors, and HTML are
redacted unless a user explicitly enables them.

The stable inspection API returns serializable summaries. It never returns mutable kernel,
application, store, resource, or navigation internals.

`jquery-star/devtools` remains a conditional in-page UI. It starts only after the inspection API has
usage evidence and a go/no-go record identifies a user-visible need the raw API does not meet. A no
decision marks the ticket declined. A browser extension is outside this program. The registry CLI
remains focused on copy-in components and blocks. Plugin scaffolding is deferred because npm plugin
authoring is a different workflow. Later CLI work may add package diagnostics and dry-run
configuration upgrades without changing the source-registry purpose.

## Compatibility and browser decisions

The first ticket records actual 0.1 behavior rather than treating documentation as proof. The
baseline covers runtime and type exports, root auto-install side effects, actions, attributes,
expression names, event payloads, request bytes, response behavior, UMD globals, package files,
bundle sizes, and documented claims.

It also decides:

- jQuery 4-only versus tested jQuery 3.7 compatibility
- the browser matrix for core, UI, CSP, persistence, and navigation
- Node requirements for browser consumers versus the Node 24 proof server
- ESM, CommonJS, UMD, CDN, and no-build support by entry point
- one ambient DOM realm and document-host constraints
- compatibility behavior across 0.x and the 1.0 boundary
- deprecation periods, error codes, and versioned plugin API ranges

Chromium, Firefox, and WebKit smoke projects are established before persistence, CSP, or navigation
contracts depend on browser-specific behavior. The full component matrix may remain Chromium if the
documented smoke matrix covers each cross-browser primitive.

## Program milestones

### Milestone A: evidence and ownership

- Install the public evidence-gated workflow, CI, quality report, worktree fingerprint, and receipt.
- Install strict static, architecture, security, dependency, style, and documentation gates.
- Correct the production census and enforce coverage and property tests.
- Freeze public behavior and environment support.
- Record the jQuery Core, UI, Mobile, Sizzle, QUnit, and Migrate stewardship and naming policy.
- Install and test real package tarballs.
- Prove the three-browser, accessibility, API/type, reproducibility, and package-quality matrix.
- Define the document-host topology and ownership matrix.
- Add kernel disposal and transactional application lifecycle.
- Add application-aware patch commits and a render-settled barrier.
- Inject expression engines and preserve the trusted JavaScript profile.

Exit condition: every mutable runtime resource has an owner and disposal path. Existing root
behavior has executable compatibility evidence. Every enforced quality result is non-vacuous and
bound to the exact tested worktree.

### Milestone B: extension kernel

- Add atomic plugin manifests, dependencies, namespaces, and application hooks.
- Add expression helpers and public directives.
- Add typed action/request observations and legacy-compatible errors.
- Add one request middleware pipeline with final validation.
- Extract generic and Datastar protocol profiles.
- Publish core, UI, Datastar, and installed-package conformance fixtures.

Exit condition: an external plugin adds an action, directive, helper, request observer, and
application cleanup using only installed public imports. Failed installation leaves no partial
state.

### Milestone C: 1.0 hardening

- Approve the CSP grammar and threat boundary, implement the parser/evaluator, then publish a real
  no-`unsafe-eval` browser proof.
- Publish the runner-neutral testing package.
- Publish the external render adapter, freeze the shared bridge contract, then publish separate
  Turbo and htmx lifecycle bridges.
- Finalize the bounded redacted observation records needed by later inspection tools.
- Publish a jQuery UI coexistence matrix, component migration map, and adapter go/no-go decision.
- Publish a no-runtime jQuery Mobile migration map and representative application proof.
- Publish compatibility, security, deprecation, migration, and release policies.
- Verify a clean tarball in every supported consumer and browser configuration.

Exit condition: the stable platform can be extended, tested, disposed, used under its documented CSP
profile, and integrated with established HTML navigation tools without private imports.

### Milestone D: application services

- Add stores and synchronous persistence.
- Run the resource proof and implement only the selected result.
- Add mutations only after resource ownership is stable.
- Run the native-navigation decision and implement approved slices.
- Add inspection and service adapters after service decisions are terminal.
- Add package upgrade tooling. Add inspection UI only after usage evidence approves it.

Exit condition: each service is optional, has a reference application, owns and releases its work,
passes its browser matrix, and does not expand the root compatibility bundle.

## Program-level acceptance criteria

- [ ] Plan → Code → Test → Document phase closure requires machine-checked evidence, and a delivery
      receipt matches the exact gated worktree.
- [ ] Static, architecture, security, dependency, documentation, source-policy, and gate-liveness
      checks fail closed without hidden baselines or blanket suppressions.
- [ ] The complete production artifact census has coverage or named non-unit evidence. Changed
      production lines/functions have 100% coverage.
- [ ] Property, three-browser, accessibility, package API/type, reproducibility, and size audits run
      at their documented delivery or release cadence.
- [ ] The 0.1 root behavior, request bytes, event payloads, exports, package contents, and side
      effects have executable baselines.
- [ ] The supported Window, Document, jQuery, browser, Node, and module-format topology is explicit.
- [ ] Every mutable runtime object has a kernel, document, application, or plugin owner.
- [ ] Failed application or plugin initialization rolls back all staged owned work.
- [ ] Cleanup continues after individual failures and runs exactly once for every owned resource.
- [ ] Outgoing application roots are destroyed before an existing patch or external navigation
      removes them.
- [ ] The full JavaScript and CSP expression engines use one injected contract and retain trusted
      markup documentation.
- [ ] Plugin dependencies, namespaces, ordering, conflicts, late installation, and rollback have
      typed deterministic behavior.
- [ ] Legacy 0.x events and thrown errors remain compatible while new observations are serializable
      and bounded.
- [ ] Generic core requests contain no Datastar request behavior. Root requests match the recorded
      Datastar compatibility baseline.
- [ ] Core-only consumers contain no UI, Datastar, persistence, resource, navigation, CSP parser,
      testing, or inspection code.
- [ ] The UI plugin owns and disposes document enhancement and global listeners.
- [ ] jQuery UI 1.14 and jQStar coexist without namespace, event, focus, CSS, or lifecycle
      collisions, and the migration map does not promise Widget Factory compatibility.
- [ ] The jQuery Mobile migration proof uses no jQuery Mobile runtime and preserves direct URLs,
      native forms, history, focus, accessibility, and JavaScript-disabled behavior.
- [ ] A QUnit consumer passes the public test fixture and upgrade diagnostics report detectable
      jQuery UI, jQuery Mobile, and jQuery Migrate dependencies without loading them.
- [ ] An installed external plugin passes the public conformance suite without internal imports.
- [ ] An installed external DOM-replacement plugin and both official navigation bridges use only the
      public render-lifecycle adapter and declared package subpaths.
- [ ] The CSP entry runs under a real policy without `unsafe-eval` and does not import the trusted
      compiler.
- [ ] Turbo and htmx replacements destroy and remount owned applications without duplicate effects,
      listeners, requests, or UI behavior.
- [ ] Optional stores, resources, and navigation remain outside the root bundle and pass their proof
      gates before publication.
- [ ] Every ticket records focused tests, `npm run check`, relevant browser proof,
      `npm run test:package`, package-consumer evidence when applicable, and a completion audit.

## Main risks and controls

### The foundation refactor becomes an invisible rewrite

Compatibility fixtures come first. Kernel and lifecycle tickets preserve root behavior before adding
new APIs. Each ticket has a narrow changed-file ledger and installed-package proof.

### Plugin capability becomes permanent too early

The plugin context starts with concrete registrars required by official UI, Datastar, testing, CSP,
and interoperability packages. New capabilities require a working official or external plugin and an
additive contract review.

### Cleanup claims exceed observable ownership

The kernel asserts only resources created through its ledgers and capabilities. It does not claim to
discover arbitrary third-party timers or event listeners.

### Middleware weakens validated security boundaries

Middleware receives inert descriptors. URL, method, credentials, target, selector, and protocol
rules are validated again after middleware. Stream bodies remain owned by protocol adapters.

### CSP is mistaken for an expression sandbox

Every CSP document states that expressions remain trusted. Security tests prove absence of dynamic
code construction and denied syntax. They do not claim that jQuery or named actions are harmless.

### Services replace server authority

Stores hold browser coordination state. Resource proofs compare server patches and an external query
client before adding a client cache. Navigation keeps routes and validation on the server.

### Navigation replays writes or mishandles head assets

GET visits ship before forms. Dispatched writes are never replayed. Head and script policies are
explicit, tested, and separate from body commit.

### Package formats look correct only inside the repository

Tests install the actual tarball into external fixtures. TypeScript resolution, Node import modes,
browser globals, tree shaking, contents, sizes, and version fields are checked from those fixtures.

## Explicitly deferred work

- virtual DOM, JSX, client component templates, and hydration
- a client route definition language
- authentication, authorization, tenancy, ORM, or database packages
- multiple kernels controlling one document
- persistent offline mutation queues
- IndexedDB persistence before an asynchronous boot contract exists
- normalized entity caching or GraphQL client behavior
- default interception of every same-origin link and form
- native mobile adapters
- browser-extension distribution
- public generic SSE subpath without a second maintained protocol
- plugin scaffolding in the source-registry CLI
- server-framework packages without a maintained reference integration

## Adversarial review record

Three independent reviewers attacked product scope, runtime architecture/security, and delivery/test
sequencing. The following material findings changed the plan.

| Finding                                                                                      | Resolution                                                                                                                                                               |
| -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 1.0 combined a runtime, cache, navigation framework, evaluator, test platform, and DevTools. | 1.0 now stabilizes the platform. Stores, resources, native navigation, and inspection UI use later optional release tracks.                                              |
| The package matrix omitted UI JavaScript.                                                    | `jquery-star/ui` is a stable official plugin. The root entry composes core, UI, and Datastar.                                                                            |
| Per-jQuery isolation ignored module and document state.                                      | 1.0 supports one kernel and canonical jQuery instance per document. An ownership matrix and kernel disposal precede plugins.                                             |
| Application roots can be detached without destruction.                                       | Transactional application ownership and patch commit hooks precede directives, testing, bridges, and navigation.                                                         |
| Plugin installation was not atomic and arbitrary options could not be compared.              | Installation stages and validates all registrations. Same plugin object is idempotent. Same name from another object conflicts. Options are not compared.                |
| The protocol split covered responses but retained Datastar requests.                         | Protocol profiles now own request encoding, content negotiation, headers, response selection, and patch meanings together.                                               |
| Seven middleware stages froze APIs that did not exist.                                       | The kernel begins with concrete action/request observations and one request pipeline. Optional packages keep local operations until repetition proves a common contract. |
| CSP was described as an untrusted-expression boundary.                                       | CSP now means no dynamic code construction. All expressions still require trusted markup. The expression-engine interface ships before directives.                       |
| Testing promised arbitrary leak detection and multi-realm isolation.                         | Testing covers kernel-owned resources in one ambient DOM realm and installed public imports.                                                                             |
| Resource ownership, cancellation, and optimistic overlap were undefined.                     | A proof ticket chooses no package, an external adapter, or a native client. A native design requires leases and ordered optimistic layers.                               |
| Navigation duplicated mature tools and could replay writes.                                  | Turbo and htmx bridges ship first. Native navigation needs a gap decision, starts with GET, and never replays a dispatched write.                                        |
| Browser and package compatibility arrived too late.                                          | Environment decisions, cross-browser smoke, real tarball consumers, bundle reports, and format support move to the foundation.                                           |
| Plugin CLI scaffolding did not fit the source registry.                                      | Plugin scaffolding is deferred. Later CLI work stays limited to package diagnostics and configuration upgrades.                                                          |
| External bridges could depend on private application and patch state.                        | `core` publishes a minimal render-lifecycle adapter. A packed mock-navigation plugin, Turbo, and htmx must use declared public subpaths only.                            |
| CSP and both navigation bridges were oversized release tickets.                              | Grammar/threat review, parser/evaluator, CSP packaging, shared bridge contract, Turbo, and htmx now have separate tickets and evidence gates.                            |
| Conditional work had no truthful rejected state.                                             | `declined` is terminal only with a linked decision, supported alternative, and proof that no partial public surface shipped.                                             |
| Later optional subpaths could pass bundle exclusion without resolving for consumers.         | Every publishing ticket names its subpath and must pass declarations, formats, version, size, and installed-tarball proof.                                               |
| Service inspection could run before services or omit their adapters.                         | Inspection follows terminal service decisions and requires a serializer or documented non-inspectable rationale for every published official service.                    |
| DevTools UI was promised without the stated usage evidence.                                  | The UI ticket is conditional on a recorded usage-evidence go decision and must be `done` or `declined` before the final audit.                                           |

## Research basis

The plan uses bounded patterns from current primary documentation:

- [Alpine extension APIs](https://www.alpinejs.dev/advanced/extending) for plugin-installed
  directives, helpers, and element cleanup.
- [Alpine stores](https://alpinejs.dev/globals/alpine-store) and
  [Persist](https://alpinejs.dev/plugins/persist) for separate shared state and persistence.
- [Alpine CSP](https://www.alpinejs.dev/advanced/csp) for a runtime profile that avoids
  `unsafe-eval` without claiming untrusted markup is safe.
- [htmx documentation](https://htmx.org/docs/) for lifecycle events, logging, history, and extension
  hooks.
- [Turbo Drive](https://turbo.hotwired.dev/handbook/drive) and
  [Turbo Frames](https://turbo.hotwired.dev/handbook/frames) for server-owned document and region
  navigation.
- [Unpoly navigation](https://unpoly.com/navigation) for focus, scroll, history, cancellation, and
  cache semantics.
- [TanStack Query's QueryClient](https://tanstack.com/query/latest/docs/reference/QueryClient) and
  [invalidation contract](https://tanstack.com/query/latest/docs/framework/solid/guides/query-invalidation)
  for comparison during the resource proof.
- [Vue Test Utils](https://test-utils.vuejs.org/guide/) for an official isolated mounting and
  interaction surface.
- [Node package entry points](https://nodejs.org/api/packages.html#package-entry-points) for
  explicit public subpaths and encapsulation.

The ordered implementation record is [tickets/ROADMAP.md](tickets/ROADMAP.md). Each ticket carries
its own scope, dependencies, acceptance criteria, verification, and completion evidence.

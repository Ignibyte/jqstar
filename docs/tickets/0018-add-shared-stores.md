---
id: 0018
title: Add optional shared reactive stores
status: planned
created: 2026-08-30
updated: 2026-09-01
---

# 0018: Add optional shared reactive stores

## Plan

### Problem

Each application owns isolated local state. Multiple roots that share session data, preferences,
feature flags, or page-level coordination state must use an undocumented global object, pass
imperative references between roots, or duplicate signals. A shared-state plugin must preserve
jQStar's per-document ownership and disposal model without turning every signal into a global.

### Current evidence

- `StarContext` exposes local `state`/`signals`, `computed`, jQuery/DOM bindings, and the committed
  helper scope. `$name` always resolves through the current application's state.
- Behavior and declarative roots clone and reactify their state independently. Effects already track
  any reactive proxy they read and applications stop their owned effects at destruction.
- Ticket 0008 provides transactional plugins, typed facades, services, hooks, and kernel disposal.
  Ticket 0013 publishes side-effect-free core/plugin entry points and terminal disposal reporting;
  ticket 0014 publishes external plugin/testing conformance.
- Ticket 0009 freezes structural expression helpers at plugin commit. A dynamic `stores` namespace
  therefore belongs in `StarContext` as an optional fixed binding, not as a late-mutating helper
  registry entry.
- `src/reactivity.ts` currently proxies any object. Store input needs a narrower plain-data contract
  so `Date`, `Map`, DOM, class instances, accessors, symbols, and cycles do not gain misleading
  deep-reactivity behavior.
- No package export, public store definition/handle type, subscription contract, duplicate policy,
  or two-root installed proof exists.

### Scope

- Publish side-effect-free ESM and CommonJS `jquery-star/stores` with matched declarations, one
  immutable official `storesPlugin`, a typed definition factory, and a per-kernel facade returned by
  `$.star.use(storesPlugin)`.
- Define validated store names, definition identity, plain initial data and method leaves, clone/
  normalization rules, transactional setup, compatible repeated definition, incompatible
  redefinition, lookup/listing, and use after disposal.
- Create one reactive store value per name per kernel. Definitions may occur while the kernel is
  active, including after an application mounts; the stable reactive namespace must notify existing
  expressions that previously observed a missing store.
- Define ordinary method semantics. Function leaves retain identity, receive the reactive store
  proxy as normal JavaScript `this` when called as a member, are not action registrations, and are
  excluded from snapshots/persistence data views.
- Provide selector-based subscriptions with immediate/deferred behavior, equality, previous/current
  values, deterministic batching/error observation, explicit idempotent release, and store/kernel
  ownership. Do not expose the private reactive effect primitive.
- Provide a synchronous staged `transaction(name, update)` that clones the accepted store graph,
  runs one updater against the detached draft, revalidates it, and commits all changed data before
  reactive effects flush. A throw, thenable, or invalid draft leaves the live store unchanged. This
  is the public atomic restore seam consumed by ticket 0019.
- Provide transactional store setup with a frozen context, `AbortSignal`, cleanup, owned finite
  task/effect/subscription helpers, and exact rollback if setup fails. Setup/cleanup run once for
  the store's kernel lifetime.
- Add optional typed `context.stores` to behavior/action/directive/application contexts and the
  fixed `stores` expression binding in both trusted and CSP engines. When the plugin is absent the
  fixed name is `undefined` and cannot fall through to an ambient global.
- Preserve `$store` as the current application's local signal named `store`; it never aliases the
  shared store facade. Reject helper registrations that attempt to claim the new fixed `stores`
  root.
- Support two or more behavior/declarative application roots reading, reacting to, mutating, and
  subscribing to one store while retaining independent local state and teardown.
- Publish public observation/disposal metadata for store definition/setup/change/subscription/
  cleanup through existing bounded operation categories without values or live store references.
- Prove the optional entry is absent from root/core/UI/Datastar/CSP/testing/bridge bundles unless
  imported and installed.

### Out of scope

- Persistence, normalized entities, reducers, server-state caching, authentication, or
  authorization.
- Adding `$.star.store` through global declaration augmentation.
- Cross-document/global stores, server synchronization, optimistic mutations, selectors with cache
  libraries, time travel, middleware, devtools, per-application store copies, or individual live
  store removal/redefinition.
- Treating functions as serializable state, auto-registering store methods as named actions, or
  exposing private dependency/effect maps.

### Dependencies

- Tickets 0014 and 0017.

### Acceptance criteria

- [ ] [AC-01] `jquery-star/stores` publishes side-effect-free ESM/CommonJS, matched types/maps, one
      frozen official plugin, `defineStore()`, and public definition/facade/store/subscription/setup
      types. Import alone performs no jQuery/core installation, global/document access, listener/
      effect creation, store definition, or root-bundle augmentation.
- [ ] [AC-02] Installing the plugin transactionally returns one typed facade for that kernel;
      repeated compatible `use()` returns the same identity. Failed install leaves no `stores`
      context binding, helper reservation change, service, observation, resource, or partial facade,
      and another document/kernel remains independent.
- [ ] [AC-03] Store names follow one documented safe-key grammar and reject empty/magic/reserved/
      normalized-collision names. `define(name, definition)` clones accepted primitive/array/plain-
      object data, retains declared function leaves, rejects cycles/accessors/symbol keys/DOM/class/
      collection/promise values before mutation, and never mutates or freezes caller input.
- [ ] [AC-04] One definition object may be defined repeatedly under the same name and returns the
      exact existing reactive value; a different definition object, changed name, or disposed
      definition fails without comparison by serialization or partial replacement. `get`, `has`, and
      sorted immutable name listing have exact missing/disposed behavior.
- [ ] [AC-05] Definition setup is transactional and runs exactly once with a frozen, kernel-owned
      context. Cleanup/effects/subscriptions/finite tasks register before use, roll back in reverse
      order after setup failure, continue after cleanup failures, observe errors without leaking
      state values, and are attempted exactly once at kernel disposal.
- [ ] [AC-06] Store reads/writes/deletes use the existing reactive scheduler and batch semantics.
      `transaction()` mutates a detached validated draft, rejects throws/thenables/invalid graphs
      without changing live state, and commits all changed data before one reactive flush. Function
      leaves retain identity and standard member-call `this` as the reactive store; they are not
      bound, serialized, registered as actions, or invoked during inspection.
- [ ] [AC-07] Selector subscriptions record dependencies, compare with documented default
      `Object.is` or caller equality, deliver exact previous/current references after one batch,
      support an explicit immediate option, contain/report one listener failure without skipping
      others, and stop on idempotent release or kernel disposal.
- [ ] [AC-08] Two behavior/declarative roots read and mutate one store through JavaScript and
      expressions while their local signals remain independent. A store defined after mount wakes an
      expression that observed that missing name; destroying one root stops its store-dependent
      effects/listeners without changing the store or the other root.
- [ ] [AC-09] `StarContext.stores` and the fixed `stores` expression root expose the same read-only
      namespace in trusted and CSP conformance. Store values remain mutable/reactive, namespace
      assignment/deletion fails, absence resolves only to `undefined`, and committed helpers cannot
      shadow `stores`.
- [ ] [AC-10] A local signal named `store` continues to read/write as `$store` in both engines even
      when a shared store also exists. `$`, other `$name` signals, `state`, `signals`, `computed`,
      actions, and helper precedence remain unchanged from the public baseline.
- [ ] [AC-11] Public observations/disposal reports identify store/setup/subscription/task/effect
      owners and outcomes with stable IDs/categories but contain no store values, selectors,
      callbacks, DOM, or live references. Kernel disposal invalidates facade/store-owned operations,
      aborts finite work, removes the context namespace, and reports exact terminal cleanup.
- [ ] [AC-12] Installed Node/browser consumers resolve import/require/types for
      `jquery-star/stores`, run two-root and external-plugin conformance, verify one package
      version, and record raw/gzip sizes. Graph/sentinel execution proves store code is absent from
      every pre-1.1 root/modular/CSP/testing/bridge consumer unless explicitly imported.
- [ ] [AC-13] Public docs distinguish local signals, shared client coordination, persisted
      preferences, server authority, and server-state resources; warn against secrets/authorization/
      entity-cache use; document method/duplicate/lifecycle semantics; and pass focused, coverage/
      property/static/browser/package/release, `npm run check`, and `git diff --check` gates without
      mutation testing.

### Design

`defineStore({ initial, setup? })` validates and freezes a structural definition while retaining the
caller-provided `initial` factory/object and optional setup callback by identity. The accepted data
graph is primitives, arrays, and plain/null-prototype records; explicitly declared function leaves
are allowed as methods. Cloning preserves shared acyclic data references within one initial graph,
rejects cycles and accessors, copies enumerable string keys into null-prototype/plain containers,
and never invokes getters or functions.

The facade API is intentionally small: `define(name, definition)`, `get(name)`, `has(name)`,
`names()`, `transaction(name, update)`, and `subscribe(name, selector, listener, options?)`.
Definition names are stable kernel keys. Repeating `define` is idempotent only for the same
definition object; structural equality is not a compatibility contract. Stores cannot be removed or
redefined while the kernel lives because mounted applications may retain their reactive proxies.
`transaction()` clones the current accepted graph without invoking method leaves, runs one
synchronous updater on the detached draft, validates it, and applies its data changes in one
scheduler batch; method identities remain the definition-owned values.

Each record owns the cloned reactive value, definition identity, setup state, subscriptions,
effects, finite tasks, abort controller, and cleanups. It enters the facade namespace only after
initial reactive creation and setup succeed. A failure aborts tasks, stops subscriptions/effects,
runs cleanups in reverse order, and leaves the name absent. Kernel disposal marks all records and
the facade terminal before attempting every cleanup.

The stable `StarStoresScope` is a read-only reactive proxy: property reads track both the name's
presence and the selected store value; defining a missing name triggers dependent effects. It
supports only safe own string keys, sorted enumeration, and read/has operations. Assignment,
definition, deletion, prototype access, and reflective mutation fail. `context.stores` references
this scope. The trusted engine always installs a fixed `stores` binding with the scope or
`undefined`; the CSP grammar treats it as the same fixed capability.

Store functions are ordinary function-valued leaves. `stores.session.reset()` uses JavaScript's
normal receiver and therefore sees the reactive proxy as `this`; destructuring the function does not
preserve `this`. jQStar does not bind methods automatically, wrap them as actions, infer parameters,
await them, or own arbitrary work it creates. Setup and subscription capabilities are the owned
alternative for work that must participate in disposal.

`subscribe()` runs a selector inside an owned reactive effect, captures the first value, and invokes
the listener immediately only when requested. Later batches call it once when equality reports a
change, with `{ current, previous, store, name, signal }`. Listener exceptions are observed and do
not stop sibling subscriptions; async listeners are unsupported because finite async work must use
the setup task capability.

### Decisions

- Stores are per-kernel singletons, not process globals, application copies, or server state.
- Install the plugin explicitly; do not add root global augmentation or root auto-installation.
- Use the same definition-object identity for idempotency. Do not deep-compare state/functions or
  make redefinition depend on serialization.
- Definitions may be added after applications mount, but not removed/replaced. The namespace itself
  is reactive so a missing-name dependency can settle when defined.
- `stores` is a fixed optional context/expression binding, not a mutable helper registration.
- `$store` always means local `state.store`; shared state requires `stores.<name>`.
- Function leaves follow ordinary JavaScript receiver semantics and remain outside persistence
  snapshots. jQStar owns only work registered through explicit store setup/subscription
  capabilities.
- Staged store transactions are synchronous and data-only. They are an atomic reactive commit seam,
  not database transactions, locks, rollback across external side effects, or async middleware.
- Ticket 0018 publishes stable optional shared state for 1.1; persistence remains ticket 0019 and
  server-state/resource policy remains ticket 0020.

### Security and accessibility

- Safe store keys reject `__proto__`, `prototype`, `constructor`, reserved fixed bindings, and names
  outside the documented grammar. Cloning reads property descriptors and never invokes accessors.
- Context/observation/disposal output contains identifiers and categories only; state, methods,
  selector values, callbacks, and errors containing application data are not serialized by default.
- Stores are not an authorization or secret boundary. Client state can be inspected/changed by page
  code and browser tools; server permissions and validation remain authoritative.
- Setup tasks/listeners use the kernel document/capabilities and are aborted/released at disposal.
  Cross-document values and DOM/class instances are rejected as store data.
- Shared state does not alter native-control, focus, keyboard, ARIA, motion, color, or layout
  behavior. Browser proof includes two roots and live-region output without duplicate announcements.

### Risks

- Shared writable state can become an application dumping ground. Documentation should distinguish
  local state, shared browser state, and server authority with examples.
- Store method `this` behavior must be explicit and typed.
- A mutable dynamic namespace can bypass helper immutability or fall through to browser globals.
  Make it a separate fixed read-only scope whose absent value is explicitly `undefined`.
- Deep cloning arbitrary objects can invoke getters, lose prototypes, or recurse forever. Accept
  only descriptor-checked plain acyclic graphs plus declared function leaves and test limits/cycles.
- Subscribers can create feedback loops. Use existing batched effects, bound flush diagnostics,
  listener error containment, and document that callers must not write an endless cycle.
- A failed setup can expose a half-defined store. Stage all owned work and namespace publication,
  then commit atomically or reverse every registration.
- A staged updater can mutate external objects or return a promise. Give it only an owned detached
  draft, reject thenables, and document that side effects outside the draft cannot be rolled back.
- Per-kernel store typing can become ambient/global fiction. Type the facade/definition return and
  optional context generics; do not globally claim arbitrary store names exist.

### Verification plan

- Validate this Plan before adding the export or fixed binding.
- Add unit/property matrices for name/data validation, descriptor-safe graph cloning, shared
  references/cycles/depth, definition identity, dynamic name reactivity, method receivers,
  transaction commit/throw/thenable/invalid drafts, setup/rollback/cleanup failures, subscription
  batching/equality/errors/release, and terminal use.
- Run behavior/declarative two-root fixtures against trusted and CSP engines, root and modular core,
  early/late definitions, local `$store`, selected official plugins, application destruction,
  rendering/preservation, and kernel disposal using only public observations/reports.
- Pack/install the entry under Node import/require, TypeScript NodeNext/Bundler, QUnit, external
  plugin, and Chromium/Firefox/WebKit browser consumers; verify version, maps, declarations, private
  import refusal, package contents, API report, and cross-document isolation.
- Bundle/execute root, core, UI, Datastar, CSP, testing, bridges, stores-only, and core+stores
  consumers. Inspect module graphs/sentinels and ratcheted raw/gzip sizes so optional exclusion is
  proved rather than inferred.
- Run focused suites, `npm run quality:fast`, ticket Code validation, coverage/property/static/
  browser/package/release gates, `npm run check`, ticket Test/Document validation, and
  `git diff --check` without mutation testing.

### Planned files

- `src/stores.ts`, `src/stores/types.ts`: Definition factory, safe graph cloning, facade, reactive
  namespace, records, setup/subscription ownership, errors, observations, and disposal.
- `src/types.ts`, `src/expression.ts`, CSP engine/conformance sources: Optional typed
  `StarContext.stores`, reserved fixed root, trusted/CSP binding parity, and `$store` precedence.
- `src/kernel.ts`, `src/plugin.ts`, `src/core.ts`: Minimal public service/finite-work/disposal
  hooks, official plugin installation, and terminal report categories without live inspection.
- Build/type/API configuration and `package.json`/lockfile: Side-effect-free ESM/CommonJS
  `jquery-star/stores`, matched declarations/maps, export conditions, package files, and commands.
- `test/stores.test.ts`, `test/property/stores.property.test.ts`, expression/plugin/runtime suites:
  Validation, reactivity, two-root behavior, methods, setup, subscriptions, isolation, and teardown.
- `e2e/stores.spec.ts`, fixtures: Real-browser cross-root updates, late definition, live-region,
  render/preservation, and disposal under trusted/CSP engines.
- Package consumers/scripts, API reports, public baseline, production census, and size budgets:
  Installed format/type/browser/QUnit proof and optional graph exclusion.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`, website store guide:
  Local/shared/server-state distinctions, API, typing, methods, lifecycle, limits, and examples.
- `docs/tickets/0018-add-shared-stores.md`: Phase, ledger, commands, findings, criterion evidence,
  and completion audit.

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

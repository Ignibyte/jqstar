---
id: 0009
title: Register public directives and expression helpers
status: done
created: 2026-08-30
updated: 2026-09-01
---

# 0009: Register public directives and expression helpers

## Plan

### Problem

Declarative attributes are a private conditional chain and expression scope is fixed inside the
trusted engine. An external plugin can install actions and application hooks, but it cannot add an
attribute behavior or a named expression helper through the public package. Adding either feature
with private imports would bypass ticket 0008's atomic installation and ticket 0006's application
cleanup contract.

### Current evidence

- `DeclarativeApplication.initializeDirective()` branches over every supported binding, event, and
  lifecycle attribute. `data-signals` and `data-computed:*` run in separate state-setup passes.
- The application owns a `Map<Element, Map<string, () => void>>` for attribute cleanup, a set of
  reactive effects, one mutation observer, request cancellation, and one aggregate teardown path.
- Attribute changes currently clean the old record and mount the new value. Inserted nodes are
  scanned after signal and computed setup. `data-ignore`, subtree removal, render replacement,
  application destruction, and kernel disposal already converge on `releaseTree()` or `destroy()`.
- `StarExpressionEngine` evaluators receive a `StarContext`. The trusted engine creates a
  proxy-backed scope with `$`, `$name`, `state`, `signals`, `computed`, element/event values, roots,
  action lookup, and real jQuery.
- Ticket 0008 stages actions, application hooks, facades, and cleanup before a no-throw commit. The
  registrar is frozen, synchronous, and unavailable after installation.
- `Kernel.whenEnhanced()` waits render barriers and reactive work, but the kernel has no registered
  directive-task category or helper/directive snapshot.
- The executable 0.1 baseline freezes every current directive form and expression-scope name. Any
  registry migration must preserve that behavior and error-event shape.

### Scope

- Add public directive, matcher, parsed-attribute, context, cleanup, task, helper-scope, and
  registrar types through the root package.
- Add `directive()` and `helper()` to the transactional plugin registrar. Validate their complete
  staged set before actions, extensions, plugin records, hooks, cleanup, and facades commit.
- Match directives by one exact attribute name or one explicit prefix. Enforce plugin ownership,
  reject overlapping matchers, and order different attributes on an element by bounded integer
  priority with DOM attribute order as the stable tie breaker.
- Parse each matched attribute before mount or update. Keep one active record per element and
  attribute. Use `update()` when provided; otherwise replace the old record through cleanup and
  mount.
- Give a directive its raw and parsed attribute, element, jQuery element, public application
  context, selected expression engine, committed helper scope, owned effect creation, finite task
  creation with cancellation, cleanup registration, and normal declarative error reporting.
- Track active directive tasks in the kernel resource and enhancement ledgers. Abort and detach them
  when their directive or application is released. Make `whenEnhanced()` wait tasks that were
  registered while its barrier settles.
- Add dotted, non-dollar expression helpers below the installing plugin's identifier-safe namespace.
  Build frozen namespace containers and expose their roots to every selected expression engine
  through the evaluation context.
- Migrate `data-text` and `data-destroy` to built-in `core.*` directive definitions installed
  through the same registry and application-owned record path used by external directives.
- Preserve every other built-in directive and both behavior and declarative application contracts.

### Out of scope

- Installing structural directives or helpers after the first application starts.
- Live uninstall of one directive, helper, or plugin.
- Wildcard selectors, arbitrary mutation-stream access, element-tree selectors, or more than one
  directive claiming the same attribute.
- Moving `data-signals` or `data-computed:*` out of their ordered state-setup passes.
- Migrating every built-in directive in this ticket.
- An untrusted expression sandbox or the CSP parser/evaluator owned by tickets 0015, 0034, and 0035.
- Request-operation tasks, middleware, or protocol work owned by tickets 0010–0012.

### Dependencies

- Tickets 0007 and 0008.

### Acceptance criteria

- [x] [AC-01] Public types describe exact/prefix matching, parsed attributes, bounded priority,
      synchronous mount/update, selected expressions, helper scope, owned effects, finite cancelable
      tasks, cleanup, and typed helper registration.
- [x] [AC-02] An installed external plugin registers a directive and helper using root-package
      imports only; both become visible to declarative applications created after the atomic plugin
      commit.
- [x] [AC-03] Invalid IDs, matcher forms, matcher overlap, out-of-namespace attributes, reserved or
      invalid helper paths, helper path overlap, action collisions, and directive/helper collisions
      in their respective registries publish no registration, hook, facade, namespace claim, or
      pending cleanup. Actions, directives, and helpers remain separate namespaces and may share a
      fully qualified string when each registration is otherwise valid.
- [x] [AC-04] A directive has one active record per element and attribute. Inserted attributes mount
      once, changed values call `update()` once when present, and definitions without `update()`
      clean and remount once.
- [x] [AC-05] Directive cleanup runs exactly once for attribute removal, `data-ignore`, node
      removal, direct and Idiomorph patch replacement, application destruction, failed mount/update,
      and kernel disposal while attempting every registered cleanup in reverse order.
- [x] [AC-06] Directive effects use the application owner and stop on directive cleanup. Finite
      tasks carry an abort signal, appear as application-owned kernel resources, settle through
      `whenEnhanced()`, report active failures, and detach or abort during cleanup.
- [x] [AC-07] Helpers are non-dollar, dotted JavaScript paths below the plugin namespace. They
      cannot shadow `$`, `$name`, current context names, fixed language/browser roots, a namespace
      container, or another helper; namespace containers are frozen without freezing plugin values.
- [x] [AC-08] `data-text` and `data-destroy` use committed `core.*` directive definitions and retain
      ticket-0003 expression, reactivity, asynchronous error, request-cancellation, and lifecycle
      behavior.
- [x] [AC-09] The shared expression-engine conformance, installed ESM/CommonJS/QUnit/TypeScript and
      browser consumers, public baseline/API review, coverage, property, package, release, and
      three-browser gates exercise the shipped extension contract without mutation testing.

### Design

Add `src/directive.ts` as the public type and per-kernel extension-registry module. A directive has
a dot-qualified ID, one `{ name }` or `{ prefix }` matcher, an optional priority from -1000 through
1000, an optional synchronous parser, a synchronous `mount()`, and an optional synchronous
`update()`. Exact and prefix matchers are compared as sets. Two definitions that can select the same
attribute conflict before commit. Higher priority runs first when one element has different matched
attributes; equal priority keeps the element's authored attribute order. Priority does not change
the signal/computed setup passes.

External directive IDs must be descendants of the plugin name. Exact names must begin
`data-<plugin-name>:` and prefixes must equal or extend that colon-delimited attribute namespace.
Examples are ID `acme.audit.highlight` with exact attribute `data-acme.audit:highlight`, or one
prefix directive for `data-acme.audit:`. Built-ins use reserved `core.*` IDs and can claim the
frozen 0.1 forms.

The extension registry starts with built-in `core.text` and `core.destroy` definitions. Plugin
installation stages directive definitions and helper leaves beside actions. It prepares immutable
directive and helper snapshots only after every installer returns. The plugin host commits the
action and extension snapshots through no-throw closures, then publishes plugin identities, facades,
hooks, and cleanup. Preparation failure reverses represented plugin cleanup and leaves both
registries unchanged.

`DeclarativeApplication` keeps a mounted-directive record beside its legacy cleanup map. The record
owns an active flag, the parsed attribute, and a reverse-ordered cleanup list. Mount is provisional:
any parser, capability, mount-result, or initial-effect failure deactivates the record, runs all
work already registered, and reports through the existing `jquery-star:error` detail. On a value
change, parse failure releases the old record. A successful `update()` retains the record; an update
failure releases it. Without `update()`, the old record is released before mounting the replacement.

The frozen directive context exposes `cleanup()`, `effect()`, and `task()`. `effect()` creates the
existing owned reactive effect and registers an idempotent stop callback before returning its
release function. `task()` synchronously invokes a callback with an `AbortSignal`, requires a
thenable result, and registers the pending result under the directive's application owner. Its
release function aborts and detaches once. Active rejection reports the normal directive error and
is retained for `whenEnhanced()`; rejection after release is handled but not reported. Tasks must be
finite and honor cancellation. The kernel does not guess at arbitrary promises created outside this
capability.

Helpers use dotted JavaScript identifiers such as `acme.audit.formatDate`. The full path must be
below the plugin name, so a plugin name containing a hyphen can still provide actions and directives
but cannot publish an implicit expression helper. Fixed reserved roots include the documented
expression context and stable language/browser authority names. Helper leaves and namespace
containers cannot be prefixes of each other. Each commit rebuilds null-prototype, frozen namespace
containers; registered leaf values remain plugin-owned and are not recursively frozen.

Every runtime-created `StarContext` receives the committed helper scope. The field is optional in
the public context type so existing 0.1 callers that manually invoke an evaluator remain source
compatible. The trusted engine inserts helper roots first and fixed jQStar bindings last, so fixed
bindings remain authoritative even if validation regresses. Future CSP engines consume the same
context field and shared conformance cases.

### Decisions

- Keep directive matching finite. Plugins receive parsed information for one matched attribute, not
  a `MutationObserver`, selector, or tree scan.
- Reject overlapping exact/prefix matchers instead of resolving them by priority. Priority orders
  different attributes on the same element and cannot decide ownership.
- Keep `data-signals` and `data-computed:*` special until a later ticket can preserve their state
  definition order through a public phase contract.
- Migrate `data-text` because it proves selected-engine evaluation and owned effects. Migrate
  `data-destroy` because it proves the same cleanup path used by external lifecycle directives.
- Keep helper registration synchronous and structural. Helpers do not change after application boot
  and evaluators read the helper scope from their application context rather than a process global.
- Require helper paths to follow JavaScript identifier syntax. Do not silently rewrite hyphenated
  plugin names or introduce a second alias namespace.
- Track only tasks created through the directive capability. A raw promise, timer, listener, or
  request created by plugin code remains that plugin's responsibility.
- Preserve the existing declarative error event and thrown-value identity. New public error codes
  remain out of scope for 0.1 compatibility.

### Risks

- Prefix matching could claim unrelated attributes. Require a colon-delimited plugin-owned prefix
  and reject every overlap before commit.
- A helper path could change ordinary JavaScript name resolution. Restrict paths to the installing
  namespace, reserve fixed roots, and merge fixed jQStar bindings after helper roots.
- A directive can retain its context and try to register work after removal. Every ownership method
  checks the record's active flag and fails without creating work.
- An update can register work before throwing. Treat the full directive record as failed and reverse
  all current work so the DOM never keeps a half-updated owner.
- A task can ignore its abort signal or never settle. Document the finite-task rule, detach it from
  the application on cleanup, and do not claim the runtime can stop arbitrary third-party work.
- Directive ordering could become middleware. Bound priority to integers from -1000 through 1000,
  use it only across different attributes, and retain authored order for ties.
- The root auto-install artifact will grow before ticket 0013 can split core and UI. Measure package
  artifacts and follow the existing first-baseline/immutable-ratchet policy without changing
  unrelated ceilings.

### Verification plan

- Validate the expanded Plan before source edits.
- Add focused registry, plugin, expression, declarative, kernel, runtime-install, and public API
  tests for valid registration and every validation, transaction, update, task, error, and cleanup
  branch.
- Add generated matcher-overlap and helper-path property cases with recorded seed/replay evidence.
- Run the shared expression-engine matrix with helper resolution and collision cases.
- Exercise an external directive/helper plugin from installed ESM, CommonJS, QUnit, NodeNext,
  Bundler, module-browser, and UMD-browser consumers without private imports.
- Prove `data-text` and `data-destroy` compatibility, dynamic enhancement, direct/Idiomorph patch
  cleanup, `data-ignore`, failure rollback, exact-once destruction, and WebKit/Chromium/Firefox
  behavior.
- Run focused tests, `npm run quality:fast`, coverage, property, package, browser, release, final
  `npm run quality:delivery`, ticket validators, and `git diff --check`. Do not run mutation
  testing.

### Planned files

- `src/directive.ts`: Public directive/helper types, built-in definitions, matcher/helper
  validation, immutable snapshots, lookup, and registry disposal.
- `src/plugin.ts`: Staged directive/helper registrar methods and atomic extension commit.
- `src/kernel.ts`: Per-kernel extension registry, application capabilities, task resources, task
  errors, and complete enhancement waiting.
- `src/declarative.ts`: Registry-driven mount/update records, owned directive capabilities, dynamic
  reconciliation, and migrated `data-text`/`data-destroy` paths.
- `src/expression.ts`, `src/types.ts`, `src/index.ts`: Helper scope in evaluation context and public
  directive/helper exports.
- `test/directive.test.ts`, `test/plugin.test.ts`, `test/declarative.test.ts`,
  `test/kernel.test.ts`, `test/runtime-install.test.ts`: Registry, transaction, lifecycle, task, and
  integration proof.
- `test/expression-engine-conformance.ts`, `test/expression-engine.test.ts`: Shared
  helper-resolution and reserved-binding proof.
- `test/property/plugin.property.test.ts`: Generated matcher and helper namespace invariants.
- `test/public-baseline.test.ts`, `quality/public-baseline.json`,
  `schema/public-baseline.schema.json`, `etc/jquery-star.api.md`: Reviewed public contract.
- `scripts/quality-package.mjs`, `test/package-release-hardening.test.mjs`, and package schemas when
  required: Installed external directive/helper consumers and exact report contracts.
- `config/quality-budgets.json`, `docs/QUALITY_PROGRAM.md`: Measured artifact ceilings only if the
  current first-baseline policy requires an adjustment.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/RUNTIME_OWNERSHIP.md`,
  `docs/TESTING.md`: Usage, matching, helper scope, ownership, lifecycle, and conformance.
- `docs/tickets/0009-register-directives-and-helpers.md`: Phase, file, command, inspection, and
  acceptance evidence.

## Code

### Changed-file ledger

| File/group                                                                      | Purpose                                                                     |
| ------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| `src/directive.ts`                                                              | Public directive/helper types, built-ins, validation, and registry.         |
| `src/plugin.ts`, `src/kernel.ts`                                                | Atomic extension staging, application capabilities, and task ownership.     |
| `src/declarative.ts`, `src/expression.ts`, `src/types.ts`, `src/index.ts`       | Directive records, helper evaluation scope, and public exports.             |
| `test/{directive,plugin,declarative,kernel,runtime-install}.test.ts`            | Registry, transaction, lifecycle, task, and runtime integration proof.      |
| `test/expression-engine{,-conformance}.test.ts`, `test/property/plugin.*`       | Helper-engine and generated namespace/matcher proof.                        |
| `test/public-baseline.test.ts`, `quality/`, `schema/`, `etc/jquery-star.api.md` | Reviewed API, installed-package contract, and measured quality constraints. |
| `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md`         | Public usage and project-brain contracts.                                   |
| `docs/tickets/0009-register-directives-and-helpers.md`                          | Current phase, files, commands, findings, and acceptance evidence.          |

### Design changes

Implementation follows the validated Plan. The only API hardening added during review is explicit
`this: void` on directive callbacks and context capabilities, which makes their detached-call
semantics clear and lets lint reject accidental receiver dependence. Actions, directives, and
helpers remain separate registries; an otherwise valid fully qualified string may exist in more than
one of them.

The directive registry publishes frozen definition arrays as well as frozen directive/matcher and
helper-namespace snapshots. Kernel task settlement uses the same owned release callback for both the
resource ledger and pending-task set, without a placeholder callback that coverage could never
execute.

Installed-package proof was expanded vertically. ESM, CommonJS, QUnit, NodeNext, Bundler, module
browser, and UMD browser consumers now register a helper and directive, render through the shipped
engine, and prove exact cleanup. The package runner itself now uses the owned temporary-directory
contract from ticket 0048; 107 older package workspaces totaling 8.59 GiB were removed before this
ticket's package runs.

The new public registry adds one packaged file and increases the complete UMD and installed
root-import bundle before the first immutable quality baseline. The existing next-five-files and
next-1-KiB rules set 270 files, 413,696 UMD bytes, and 492,544 consumer bytes. Other ceilings did
not move.

## Test

| Command                                                           | Result | Evidence                                                                                                                                                                                                                                   |
| ----------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Plan-phase ticket validation                                      | Pass   | The expanded Plan passed before source edits.                                                                                                                                                                                              |
| Initial full unit suite                                           | Review | 598/600 tests passed; only the expected API Extractor and new-type baseline reviews failed.                                                                                                                                                |
| API Extractor local review and public-baseline/hardening tests    | Pass   | Reviewed report updated; 42/42 focused tests passed.                                                                                                                                                                                       |
| Directive, expression, plugin, kernel, and runtime focused suites | Pass   | 120/120 tests passed after negative-path coverage was added.                                                                                                                                                                               |
| ESLint and TypeScript                                             | Pass   | Full lint and both application/registry type checks passed.                                                                                                                                                                                |
| `npm run test:coverage`                                           | Pass   | Changed-line/function gate passes; `src/` is 97.28% statements/lines, 90.82% branches, and 98% functions.                                                                                                                                  |
| First `npm run test:package:quality`                              | Review | All consumers passed; file, UMD, and root-consumer first-baseline ceilings required measured updates.                                                                                                                                      |
| Final `npm run test:package:quality`                              | Pass   | 13/13 checks passed; all installed consumers and three browser engines exercised the extension contract.                                                                                                                                   |
| Temp-root inspection                                              | Pass   | Package and release runs leave zero `jqstar-{package,release}-quality-*` directories.                                                                                                                                                      |
| Initial `npm run quality:fast` attempts                           | Review | Gates caught one spelling term, one lint preference, and final formatting; each finding was fixed directly.                                                                                                                                |
| Final `npm run quality:fast`                                      | Pass   | Five gates passed in run `2026-09-01T07-46-22-983Z-75088`.                                                                                                                                                                                 |
| Code-phase ticket validation                                      | Pass   | Ticket 0009 passed against current fast run `2026-09-01T07-47-44-715Z-82840`.                                                                                                                                                              |
| `npm run test:property`                                           | Pass   | 16/16 generated cases passed with recorded seed `430043`.                                                                                                                                                                                  |
| `JQS_E2E_WORKERS=3 npm run test:browser:quality`                  | Pass   | Eight projects and 260 selected tests passed across Chromium, Firefox, WebKit, mobile, motion, color, zoom, and no-JavaScript modes.                                                                                                       |
| Final standalone `npm run test:package:quality`                   | Pass   | 13/13 checks passed with 266 files and all extension consumers; cleanup left zero temp directories.                                                                                                                                        |
| `npm run test:release:quality`                                    | Pass   | 7/7 checks passed across two clean installs with identical `fe8a1f…c82f` artifacts; cleanup left zero temp directories.                                                                                                                    |
| First `JQS_E2E_WORKERS=3 npm run quality:delivery`                | Review | Every non-browser gate passed. WebKit degraded to 79 pass, two fail, and four flaky; the run was stopped when the following Chromium process remained stuck. All owned temp directories were removed.                                      |
| Second `JQS_E2E_WORKERS=2 npm run quality:delivery`               | Review | Package and release checks progressed and cleaned their owned workspaces. Host I/O made the zoom project take 1.5 minutes and forced-colors hit three 60-second navigation/evaluation timeouts, so the already-ineligible run was stopped. |
| Healthy-host `JQS_E2E_WORKERS=3 npm run quality:delivery`         | Review | Run `2026-09-01T13-11-59-423Z-55733` passed unit, coverage, property, self-hosted, package, release, browser, workflow, and runner self-tests. Only one unformatted planned ticket and the new roadmap vocabulary failed.                  |
| Focused format, spelling, and static delivery rerun               | Pass   | Prettier passes; cspell reports zero findings across 67 files; all 28 delivery static gates pass in report `static-2026-09-01T13-20-17-090Z-77355`.                                                                                        |
| Corrected-tree `JQS_E2E_WORKERS=3 npm run quality:delivery`       | Pass   | All 12 enforced delivery gates passed in run `2026-09-01T13-21-19-615Z-79794`, including browser, exact package consumers, and two reproducible clean installs.                                                                            |
| Code validator with the delivery report                           | Review | The fail-closed validator correctly refused delivery-mode evidence because Code closure requires a fast-mode report.                                                                                                                       |
| Current-tree `npm run quality:fast`                               | Pass   | Workflow, runner self-test, formatting, unit, and static-fast gates passed in run `2026-09-01T13-27-39-373Z-1150`.                                                                                                                         |
| Current Code-phase ticket validation                              | Pass   | Ticket 0009 passed Code validation against the exact current-tree fast report before status moved to `testing`.                                                                                                                            |
| Testing-state `JQS_E2E_WORKERS=3 npm run quality:delivery`        | Pass   | All 12 enforced gates passed in run `2026-09-01T13-29-36-735Z-9094`; its receipt binds the unchanged Testing-state tree and includes enforced unit, coverage, property, package, release, and browser tests.                               |
| Test-phase ticket validation                                      | Pass   | Ticket 0009 passed against the exact report authorized by the delivery receipt before status moved to `documenting`.                                                                                                                       |
| Post-delivery temp-root inspection                                | Pass   | Zero `jqstar-package-quality-*` or `jqstar-release-quality-*` directories remain.                                                                                                                                                          |
| Document-phase ticket validation                                  | Pass   | The validator accepted the documentation list, nine checked criteria, one-to-one Pass evidence, and standalone completion audit before status moved to `done`.                                                                             |

### Inspection ledger

| Finding                                                                                                                    | Resolution                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Public readonly directive definitions were backed by a mutable array.                                                      | Registry definitions now retain and publish a frozen snapshot; focused proof checks runtime immutability.                                                                                                                |
| Changed-line coverage found untested invalid capabilities, parser/cleanup aggregation, and nested task-reporting failures. | Added direct negative-path tests; the unchanged coverage thresholds now pass.                                                                                                                                            |
| The first installed package exceeded pre-commit file, UMD, and consumer ceilings.                                          | Measured the actual artifacts and applied the documented next-five-files/next-1-KiB first-baseline rules without moving unrelated limits.                                                                                |
| Package quality retained 107 installed-consumer workspaces totaling 8.59 GiB.                                              | Routed the package runner through the owned cleanup helper, removed the abandoned directories, and proved zero package/release temp directories after passing runs.                                                      |
| API review exposed receiver ambiguity in detached directive callbacks.                                                     | Added explicit `this: void` contracts and re-approved the generated API report.                                                                                                                                          |
| Delivery browser runs degraded under severe macOS host I/O after the package and release stages.                           | The healthy-host retry passed every browser, package, and release gate with the original workers, timeouts, assertions, and project matrix; the remaining failures were isolated to new roadmap formatting and spelling. |
| Expanded future-ticket plans introduced one formatting miss and 66 unrecognized technical words.                           | Formatted ticket 0029, rewrote awkward compounds, added only canonical domain terms to the project dictionary, and proved Prettier, zero spelling findings, and all delivery static checks pass.                         |

## Document

### Documentation changed

- `README.md` documents plugin directive/helper registration, exact and prefix matching, parsed
  attributes, helper expression access, finite directive tasks, and cleanup ownership.
- `docs/ARCHITECTURE.md` records the shared directive registry, helper scope, committed
  `core.text`/`core.destroy` definitions, task barrier, and application lifecycle.
- `docs/PROJECT.md` records directives and helpers as current public extension capabilities and
  keeps later observation, middleware, protocol, and modular-package work in their own tickets.
- `docs/RUNTIME_OWNERSHIP.md` assigns directive effects, cleanups, tasks, parser state, and helper
  snapshots to their kernel/application owners and disposal paths.
- `docs/TESTING.md` defines directive/helper conformance and installed-consumer proof across the
  supported module, type, test-runner, and browser shapes.
- `docs/QUALITY_PROGRAM.md`, `quality/`, `schema/`, and `etc/jquery-star.api.md` record the reviewed
  API surface and measured package/bundle budgets without weakening unrelated ceilings.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                              | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `src/directive.ts`, root-package exports, reviewed API report, and focused type/runtime tests cover matcher, attribute, priority, callback, cleanup, task, and helper contracts.                                                      | Pass   |
| AC-02 | All 13 installed-package checks exercise an external plugin directive/helper from ESM, CommonJS, QUnit, NodeNext, Bundler, module-browser, and UMD-browser consumers.                                                                 | Pass   |
| AC-03 | Directive/plugin focused tests and generated property cases reject invalid IDs, matchers, overlaps, namespaces, priorities, capabilities, helper paths, reserved roots, collisions, and late use.                                     | Pass   |
| AC-04 | `test/directive-application.test.ts` proves one active element/attribute record, insert/update/remount behavior, stable priority order, independent matching, ignored subtrees, and reinsertion.                                      | Pass   |
| AC-05 | Directive application, patch, and kernel tests prove exactly-once cleanup for removal, `data-ignore`, replacement, destroy, failure, and disposal while retaining the established patch order.                                        | Pass   |
| AC-06 | Directive, application, and kernel tests prove owner-bound effects, finite task settlement/abort/detach/report behavior, resource-ledger cleanup, and `whenEnhanced()` barrier participation.                                         | Pass   |
| AC-07 | Expression, directive, plugin, and property tests prove dotted non-dollar helper paths, safe-object validation, frozen null-prototype namespace snapshots, fixed binding precedence, and engine scope.                                | Pass   |
| AC-08 | Public-baseline and declarative tests prove committed `core.text` and `core.destroy` registry definitions retain the 0.1 behavior and error boundary.                                                                                 | Pass   |
| AC-09 | Shared expression conformance, focused suites, coverage, properties, three-engine browser quality, installed consumers, package quality, and release reproducibility pass in exact-tree delivery run `2026-09-01T13-29-36-735Z-9094`. | Pass   |

### Completion audit

The public directive/helper extension contract, transactional installation, lifecycle ownership,
installed consumer matrix, compatibility migration, focused and generated tests, coverage, package
and release reproducibility, three-browser behavior, cleanup, and affected documentation have direct
current evidence. Every acceptance criterion is checked and mapped once. Code and Test phase
validators passed against exact fast and delivery reports, and no required implementation, test, or
documentation work remains.

Status: Complete

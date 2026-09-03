---
id: 0006
title: Make application and patch lifecycle transactional
status: done
created: 2026-08-30
updated: 2026-08-31
---

# 0006: Make application and patch lifecycle transactional

## Plan

### Problem

Application setup can create effects or listeners before a later mount throws, while the instance is
not yet stored for destruction. Cleanup stops on the first thrown callback. Removing an application
root from its parent is invisible to that root's observer. Navigation and public directives cannot
build reliable cleanup on this behavior.

### Current evidence

- Application constructors install rules and mount the tree before caller registration completes.
- Cleanup loops invoke callbacks directly and can stop on a thrown error.
- `patchElements()` removes or replaces nodes without consulting application ownership.
- `nextUpdate()` does not wait for MutationObserver delivery or UI enhancement.

### Scope

- Stage application-owned effects, listeners, directives, requests, UI rules, and hooks before
  committing the instance.
- Roll back all staged work when setup fails.
- Remove cleanup records before invocation, continue after failures, and aggregate cleanup errors.
- Give effects an owner and contain one failing scheduled effect.
- Add an application-aware DOM patch transaction that destroys outgoing roots before mutation and
  initializes incoming roots after mutation.
- Define nested-root ordering and explicit preservation.
- Add a render-committed result or `whenEnhanced()` barrier without changing `nextUpdate()`.

### Out of scope

- Full page navigation or external Turbo/htmx bridges.
- Public plugin directives. Ticket 0009 consumes this lifecycle.

### Dependencies

- Ticket 0005.

### Acceptance criteria

- [x] [AC-01] Failed application initialization leaves no effect, listener, request, observer,
      jQuery data, UI mount, or application record.
- [x] [AC-02] Cleanup records are removed before invocation, run exactly once, continue after
      individual failures, and report one error or an aggregate after all cleanup is attempted.
- [x] [AC-03] One failing scheduled application effect does not skip later effects owned by the same
      or another application.
- [x] [AC-04] Inner outgoing application roots are destroyed before outer roots and before DOM
      removal.
- [x] [AC-05] Roots marked `data-jqs-preserve` remain mounted and are not enhanced twice.
- [x] [AC-06] Existing HTML responses and Datastar element patches use the same render transaction.
- [x] [AC-07] `$.star.whenEnhanced()` resolves after MutationObserver delivery, directive setup, UI
      enhancement, and reactive flushing without changing `nextUpdate()` semantics.
- [x] [AC-08] Application destruction and kernel disposal release every kernel-owned resource in the
      ledger, including application observers.

### Design

Keep patch parsing and Idiomorph behavior separate from ownership orchestration. The transaction
owns before/commit/after phases and reports aggregated failures with operation IDs.

Application constructors stage effects, delegated listeners, UI-rule mounts, directive cleanups,
requests, and their owned observer. The jQuery plugin commits the application record and jQuery data
only after construction succeeds. A failed constructor rolls its staged resources back in reverse
ownership order and preserves the original setup error alongside any rollback failures.

The kernel maintains application lifecycle records and creates a render transaction for each
`patchElements()` call in its document. Idiomorph callbacks identify the exact outgoing and incoming
nodes. Direct patch modes call the same transaction hooks. Outgoing application roots are sorted by
DOM containment, deepest first, and destroyed before removal. Surviving owner applications clean the
outgoing subtree before mutation; their existing observers initialize inserted content afterward.
The document UI observer uses the same post-mutation delivery window.

`nextUpdate()` remains the reactive-queue primitive. The installed static gains
`$.star.whenEnhanced()`, which waits for every render transaction that was pending when called,
MutationObserver delivery, UI/directive work triggered by those records, and the resulting reactive
flush. The patch function remains synchronous and keeps its existing return type.

### Decisions

- Application observer records are kernel-owned and explicitly released by rollback or destruction;
  application-local jQuery handlers, effects, mounts, requests, and directives remain application
  records with deterministic cleanup.
- `data-jqs-preserve` is the explicit application-preservation marker. A marked subtree is excluded
  from morphing/removal and therefore retains its application and controller state. Existing
  `data-ignore-morph` behavior remains compatible but does not become an application contract.
- Direct replacement/removal of a target containing a preserved root is skipped because moving a
  preserved root to a different parent would silently change ownership.
- Render cleanup failures do not stop sibling cleanup or the requested DOM mutation. The synchronous
  patch call reports one original error or an `AggregateError` after commit, including the render
  operation ID in aggregate messages.
- Application observers remain the canonical directive and behavior enhancement mechanism. The
  render barrier waits for their delivery instead of running a competing second scanner that could
  execute `data-init` or mount hooks twice.
- Scheduled application effects report through the application's existing `jquery-star:error`
  channel. Unowned effect failures are retained and rejected by the next reactive barrier after all
  other scheduled effects have run.

### Security and accessibility

- Preservation is opt-in and scoped to an explicit DOM subtree; server markup cannot implicitly
  retain stale client state.
- Lifecycle work does not evaluate additional expressions or broaden HTML parsing. Existing patch
  target scoping and expression trust boundaries remain unchanged.
- UI enhancement completes before the render barrier, so ARIA state, keyboard behavior, focus
  restoration, and native-control wiring are observable when callers continue after the barrier.
- Cleanup failure aggregation must not strand document listeners, observers, focus handlers, request
  controllers, or later cleanup callbacks.

### Risks

- MutationObserver callbacks may race explicit mount work. Suspend or deduplicate enhancement during
  a transaction and prove ordering in browser tests.
- Preserving a root can retain stale server state. Preservation must be explicit and narrow.

### Verification plan

- Add failure-injection tests for every setup and cleanup phase.
- Add patch tests for nested roots, preservation, request cancellation, repeated enhancement, and
  render-barrier ordering.
- Run focused browser patch tests, `npm run check`, `npm run test:package`, and `git diff --check`.

### Planned files

- `src/errors.ts`: Shared deterministic cleanup/error aggregation helpers.
- `src/reactivity.ts`: Effect ownership, initial-run rollback, scheduled failure containment, and
  barrier-visible unowned failures.
- `src/kernel.ts`: Owned application observers, lifecycle records, render transactions, nested-root
  ordering, enhancement barriers, and operation IDs.
- `src/runtime.ts`, `src/declarative.ts`: Transactional construction, idempotent aggregated cleanup,
  owned effect errors, and subtree lifecycle hooks.
- `src/patch.ts`: Kernel-aware Idiomorph/direct-mode transaction hooks and explicit preservation.
- `src/types.ts`, `src/index.ts`: The public `whenEnhanced()` contract and any exported supporting
  type required by the final API shape.
- `test/{reactivity,kernel,runtime,declarative,patch}.test.ts`: Failure injection, exact-once
  cleanup, scheduler containment, nested roots, preservation, and barrier ordering.
- `test/fetch.test.ts`, `test/datastar-sdk.test.ts`: HTML and SDK event transaction integration.
- `e2e/quality-contracts.spec.ts`: Real-browser observer/UI/render-barrier proof where jsdom is not
  authoritative.
- `quality/public-baseline.json`, `etc/jquery-star.api.md`: Intentional public surface update.
- `vite.config.ts`, `package.json`, `package-lock.json`: Keep the expanded lifecycle runtime within
  the fixed production bundle budgets through the supported Vite minifier path.
- `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP}.md`, `docs/README.md`: Public usage
  and durable lifecycle/ownership contracts.
- `docs/tickets/0006-make-lifecycle-transactional.md`: Live plan, changed-file ledger, commands, and
  acceptance evidence.

## Code

### Changed-file ledger

| File                                                                                                  | Purpose                                                                                                                                  |
| ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `src/errors.ts`                                                                                       | Shared one-error-or-aggregate reporting and continue-after-failure helper.                                                               |
| `src/reactivity.ts`                                                                                   | Effect owners/error sinks, failed-initial-run rollback, complete-batch scheduling, and barrier-visible unowned failures.                 |
| `src/kernel.ts`                                                                                       | Application lifecycle records, owned observers, render transactions, deepest-first destruction, operation IDs, and enhancement barriers. |
| `src/runtime.ts`                                                                                      | Transactional behavior-app construction, owned effects/observer/timers, exact-once subtree cleanup, and atomic commit rollback.          |
| `src/declarative.ts`                                                                                  | Transactional declarative construction, directive listener/effect rollback, owned observer, and aggregated teardown.                     |
| `src/patch.ts`                                                                                        | Owner-document parsing, kernel transaction hooks for every patch mode, nested-root cleanup, and `data-jqs-preserve`.                     |
| `src/types.ts`                                                                                        | Public `StarStatic.whenEnhanced()` declaration.                                                                                          |
| `test/reactivity.test.ts`                                                                             | Initial failure rollback plus owned and unowned scheduled-effect containment.                                                            |
| `test/runtime.test.ts`                                                                                | Setup rollback, exact-once failing cleanup, owned effect continuation, and debounce-timer teardown.                                      |
| `test/declarative.test.ts`                                                                            | Request rollback and continue-after-failure directive teardown.                                                                          |
| `test/kernel.test.ts`                                                                                 | Deepest-first render ownership and application-observer ledger release.                                                                  |
| `test/patch.test.ts`                                                                                  | Nested app removal, explicit preservation, and directive/UI barrier integration.                                                         |
| `test/fetch.test.ts`, `test/datastar-sdk.test.ts`                                                     | HTML, raw SSE, and official-SDK patch paths use the enhancement barrier.                                                                 |
| `e2e/fixtures/runtime.ts`, `e2e/quality-contracts.spec.ts`                                            | Real-browser render transaction, connected cleanup order, MutationObserver, directive, and ARIA proof.                                   |
| `quality/public-baseline.json`, `etc/jquery-star.api.md`                                              | Reviewed `whenEnhanced` public-surface addition.                                                                                         |
| `vite.config.ts`, `package.json`, `package-lock.json`                                                 | Production minifier configuration and its build-only dependency keep lifecycle code inside fixed bundle budgets.                         |
| `README.md`, `docs/PROJECT.md`, `docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/README.md` | Public API, topology, retained-state, and project-brain lifecycle contracts.                                                             |
| `example/docs/api/index.html`, `example/docs/datastar/index.html`                                     | Website API and Datastar lifecycle guidance.                                                                                             |
| `docs/tickets/0006-make-lifecycle-transactional.md`                                                   | Live Plan → Code → Test → Document evidence.                                                                                             |

### Design changes

Application observers now enter the kernel resource ledger during construction and expose an
idempotent release handle to their application. Setup uses that handle during rollback; committed
applications use it during destruction. Application-local jQuery namespaces, effects, mounts,
directives, requests, and timers remain directly enumerable or root-cancelable records rather than
pretending the kernel can discover them.

The kernel stores an optional subtree-lifecycle capability beside each application. A render
transaction removes outgoing application records before invoking destruction, sorts them by DOM
containment deepest-first, then asks surviving owner applications to release the exact outgoing
subtree. Cleanup errors are retained while the DOM mutation continues and are reported after commit
with the operation ID.

MutationObservers remain the single incoming-content scanner. The transaction registers its barrier
before a possible View Transition callback, then waits through observer delivery and two reactive
turns. This avoids a competing synchronous scan that would execute `data-init`, directives, or mount
behavior twice. `whenEnhanced()` waits all registered transactions and consumes any reactive
failures; `nextUpdate()` remains the reactive-only primitive.

`data-jqs-preserve` prevents Idiomorph from morphing/removing its subtree. Direct replacement or
removal skips a target containing the marker because moving it to another parent would change
application ownership. Existing `data-ignore-morph` behavior remains separate.

Behavior debounce timers gained an enumerable application ledger so teardown can cancel them.
Declarative event/model/effect setup rolls its newly created resource back if replacing an older
cleanup fails. Failed initial effects remove their dependencies before throwing the setup error.

## Test

| Command                                 | Result | Evidence                                                                                                                                                                            |
| --------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation            | Pass   | Required decisions and planned files passed before source edits.                                                                                                                    |
| `npm run typecheck`                     | Pass   | Runtime, tests, registry declarations, and `whenEnhanced` types compile.                                                                                                            |
| Focused lifecycle suite                 | Pass   | 130 tests cover reactivity, kernel, behavior/declarative apps, patches, HTML fetches, and Datastar SDK paths.                                                                       |
| First `npm run test:unit`               | Fail   | All 448 behavior tests passed. API Extractor rejected the intentional unreviewed `whenEnhanced` signature. The reviewed one-member diff was accepted into `etc/jquery-star.api.md`. |
| Focused Chromium render proof           | Pass   | One real-browser test proves MutationObserver delivery, nested connected cleanup order, directives, and dialog ARIA enhancement.                                                    |
| `npm run quality:fast`                  | Pass   | Report `2026-09-01T00-34-21-221Z-15576` passed 5 gate groups: ticket workflow, runner self-test, formatting, 450 unit tests, and all 22 fast static analyzers.                      |
| Code-phase ticket validation            | Pass   | Ticket 0006 passed against the exact fast-report worktree fingerprint.                                                                                                              |
| First `npm run quality:delivery`        | Fail   | Report `2026-09-01T00-35-32-380Z-23294` exposed incomplete coverage, mutation escapes, fixed bundle-budget overruns, and the dependent package self-test failure.                   |
| `npm run test:coverage`                 | Pass   | The changed lifecycle kernel reached 100% statements, branches, functions, and lines. The repository coverage gate passed.                                                          |
| `npm run test:mutation`                 | Pass   | The changed-scope gate passed at 99.58% with 1,173 killed mutants, 5 survivors, 0 uncovered, and 0 timeouts.                                                                        |
| Lifecycle-only mutation rerun           | Pass   | `src/runtime.ts` and `src/declarative.ts` both reached 100% after removing duplicate cancellation and adding the exact aggregate-message assertion.                                 |
| `npm run test:package:quality`          | Pass   | All 13 installed-package checks passed. ESM is 393,464 bytes and UMD is 391,828 bytes, both within their fixed budgets.                                                             |
| Second `npm run quality:fast`           | Fail   | Report `2026-09-01T02-01-31-658Z-86448` found one stale import and one deprecated test type reference. Every other gate passed.                                                     |
| Third `npm run quality:fast`            | Pass   | Report `2026-09-01T02-02-54-701Z-94178` passed ticket workflow, runner self-test, formatting, the complete unit suite, and all 22 static analyzers.                                 |
| Second `npm run quality:delivery`       | Fail   | Report `2026-09-01T02-04-05-790Z-2128` passed 12 of 13 gates. Firefox exposed outer-before-inner application destruction in the render browser contract.                            |
| Focused Firefox and WebKit render proof | Pass   | Both engines destroy the inner root before the outer root and complete incoming enhancement after the three-way comparator fix.                                                     |
| Kernel-only mutation rerun              | Pass   | All 118 viable kernel mutants were killed, including both containment directions in `compareElementDepth()`.                                                                        |
| Third `npm run quality:delivery`        | Pass   | Report `2026-09-01T02-28-07-397Z-32444` passed all 13 enforced delivery gates against one unchanged worktree.                                                                       |
| Test-phase ticket validation            | Pass   | Ticket 0006 accepted that delivery report and its matching receipt as current Test-phase evidence.                                                                                  |

### Inspection ledger

| Finding                                                                                                 | Resolution                                                                                                   |
| ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Cross-realm render nodes failed ambient `instanceof Element` checks.                                    | Resolve the element constructor from the kernel document and use node-type guards in the patch parser.       |
| Declarative `@action` failures are asynchronous and cannot prove synchronous cleanup aggregation.       | Inject synchronous native-listener removal failures; retain async action reporting as the existing contract. |
| Behavior debounce timers were held only in nested weak maps and could not be enumerated at destruction. | Add an application timer set, remove fired/replaced timers, and clear the remainder during teardown.         |
| A scheduled effect error reporter could throw and hide the original effect failure.                     | Retain both the original and reporting failures for the next reactive barrier.                               |
| Transactional lifecycle code exceeded the fixed ESM and UMD bundle budgets.                             | Use Vite's supported Terser path with two compression passes; do not raise either budget.                    |
| Root request cancellation ran twice during behavior-app destruction.                                    | Keep cancellation in recursive root teardown and remove the duplicate direct call.                           |
| Static analysis found the stale cancellation import and a deprecated jQuery test type.                  | Remove the import and obtain the original jQuery method through a typed reflective lookup.                   |
| Firefox called the depth comparator with the ancestor as its left argument.                             | Implement both containment directions and test the comparator directly plus Firefox and WebKit end to end.   |

## Document

### Documentation changed

- `README.md` documents transactional HTML/Datastar patches, `data-jqs-preserve`, and the
  distinction between `whenEnhanced()` and `nextUpdate()`.
- `docs/ARCHITECTURE.md` records application commit/rollback, render transactions, cleanup
  aggregation, and enhancement-barrier ownership.
- `docs/RUNTIME_OWNERSHIP.md` assigns every application, observer, request, effect, listener,
  directive, timer, mount, and render barrier to its cleanup owner.
- `docs/PROJECT.md` and `docs/README.md` add the lifecycle guarantees to the project capability and
  brain maps.
- `example/docs/api/index.html` and `example/docs/datastar/index.html` publish the barrier and
  preservation contracts on the framework website.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                             | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | Behavior and declarative setup-failure tests inject mount, listener, request, observer, and data-release failures and verify no committed application or staged resource remains.    | Pass   |
| AC-02 | Runtime, declarative, kernel, and error-helper tests verify remove-before-call, exact-once cleanup, continued teardown, and one-error-or-aggregate reporting.                        | Pass   |
| AC-03 | `test/reactivity.test.ts`, `test/runtime.test.ts`, and `test/declarative.test.ts` prove later owned and unowned effects still run after one scheduled effect fails.                  | Pass   |
| AC-04 | `test/kernel.test.ts` verifies both comparator directions; the Firefox and WebKit render proof observes `inner:true` before `outer:true`.                                            | Pass   |
| AC-05 | `test/patch.test.ts` proves direct and morph preservation retain the same root and application without a second mount.                                                               | Pass   |
| AC-06 | `test/fetch.test.ts` and `test/datastar-sdk.test.ts` await the same enhancement barrier after HTML responses, raw SSE, and official SDK element events.                              | Pass   |
| AC-07 | Kernel, patch, focused Chromium, Firefox, and WebKit tests prove the barrier waits for observer delivery, directives, UI ARIA setup, and reactive output.                            | Pass   |
| AC-08 | Kernel resource-ledger and application destruction tests verify observer release, request abort, timer clearing, effect stop, listener removal, UI cleanup, and idempotent disposal. | Pass   |

### Completion audit

The changed-file ledger matches the implemented lifecycle scope. Focused tests, cross-engine browser
proofs, coverage, mutation, package, self-hosting, static, property, and release gates pass. Public
and project-brain documentation describe the shipped ownership and barrier contracts.

Status: Complete

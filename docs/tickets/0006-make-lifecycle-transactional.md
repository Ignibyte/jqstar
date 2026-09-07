---
id: 0006
title: Make application and patch lifecycle transactional
status: done
created: 2026-08-30
updated: 2026-09-06
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

### Reopening decision: request and timer ownership (2026-09-06)

Ticket 0033's source audit and actual public-application probes reproduce two lifecycle defects.
Root requests are stored in a set of controllers. When two active requests share a caller-supplied
controller, completing one removes the only root entry, so destruction cannot abort the remaining
request. Both attribute and behavior applications reproduce this; distinct-controller and
both-pending controls cancel correctly. Evidence is retained in
`.git/jqstar/program-audit/ownership-census/shared-controller-finding.json`.

The debounce implementation also retains replaced and fired handles in its application timer set
until destruction. The public event/action probe records counts of one after scheduling, two after
replacement, two after delivery and zero only after destruction. This contradicts the original
inspection ledger's claimed removal of fired/replaced timers. Exact evidence is retained in
`ownership-census/timer-ledger-finding.json`. Preserve both findings' original bundles and results.

Return to planned and reopen AC-02/AC-08 before changing code. Count each active request's root
ownership separately, even when controllers are shared. Settlement releases only that request's
reference; root cleanup aborts each remaining controller and clears root ownership. Preserve the
caller controller and signal, automatic cancellation, retry behavior and independent roots. Sharing
one signal intentionally shares its cancellation; do not promise independence for requests using the
same controller across roots.

For debounce, remove a replaced handle before registering its replacement. Remove a fired handle and
its matching element entry before calling the action, so repeated and reentrant events retain only
live timers. Destruction still clears the remaining timers. Do not change debounce timing or
unrelated event behavior.

Planned files: `src/fetch.ts`, `src/runtime.ts`, new `test/request-lifecycle.test.ts`,
`test/runtime.test.ts`, `README.md`, `docs/BACKEND.md`, `docs/RUNTIME_OWNERSHIP.md`,
`docs/TESTING.md`, this ticket, `docs/tickets/0033-audit-full-library-program.md`, and
`docs/tickets/ROADMAP.md`. Keep README expression locations stable. Any required derived public
corpus refresh must use the maintained generator under unchanged budgets and an extended manifest.

Validate Plan before implementation. Test public core applications in both modes with application
and kernel teardown after a shared-controller sibling succeeds or fails, plus distinct-controller,
caller-abort and independent-root controls. Bind requests to actual fetch start/settlement rather
than elapsed sleeps. Test repeated debounce replacement/delivery, callback-time ledger release,
reentrant scheduling and destruction. Retain original-source negative controls, then focused
lifecycle/request suites, fast, changed-code coverage and complete delivery with exact phase checks.
Update affected public and brain contracts and inspect every reopened criterion before closure.
Mutation testing remains deferred.

### Plan extension: built-in effect registration (2026-09-06)

The current source still leaks a built-in `data-effect` or `data-show` runner when its first
evaluation destroys the application. After destruction, a state update runs each expression again;
the registered `data-text` control remains stopped. A native `jquery-star:model-write` handler also
reproduces the problem in `data-bind`: its initial write destroys the application, but later state
updates still write the input and a native input event still changes destroyed application state.
Exact public-plugin/application probes are retained in
`ownership-census/builtin-effect-reentrant-finding.json` and
`ownership-census/model-reentrant-finding.json`. Invalid early probe fixtures remain separate.

Reopen AC-01 as well as the already pending AC-02/AC-08. Extend the correction to
`src/declarative.ts` and `test/directive-application.test.ts`. After synchronous initial effect
execution, check the application lifetime before recording the runner or installing model listeners.
Stop a runner immediately when initialization released its owner. Preserve ordinary initial
rendering, subsequent reactivity, native input behavior, error reporting and existing transactional
plugin registration. Test built-in effect/value/model paths, direct application destruction and
kernel disposal where they are permitted, active controls and the already fixed registered directive
path. Public state/DOM observations must show that neither effect nor input work resumes after
teardown.

Retain the original-source failure matrix and use the existing focused/fast/coverage/delivery
sequence. Update README and the ownership/testing guides for the affected public guarantee; keep
README expression positions stable. The current full delivery failed package size and its dependent
package-budget control. Fix size within the existing limits before owner closure. Do not count small
isolated build experiments as installed-package evidence or execute mutation testing.

### Plan extension: preserve behavior within package limits (2026-09-06)

The corrected lifecycle exceeds the fixed core consumer budget by 228 gzip bytes. Isolated builds
identify duplicate recursive cloning in behavior applications, declarative applications and signal
patches, plus duplicate plain-record checks in requests and patches. Move that cloning into
`src/value-checks.ts` and reuse its existing plain-record predicate. Preserve sparse arrays,
recursive plain/null-prototype data copies, atomic object/function identity, own enumerable string
keys and failure propagation. Do not broaden accepted state or add cycle handling.

Make absent boolean event modifiers optional in the private parsed-event record. Existing truthy
checks retain their behavior; native listener registration and removal still receive explicit
boolean capture/passive options. Preserve every modifier name, key alias, delay default and
diagnostic. The combined source refactor and ticket 0033's function-hoisting build option measure
62,984 gzip bytes in an isolated core consumer, below the unchanged 63,000-byte limit. This is
planning evidence, not installed-package acceptance.

Planned files: `src/value-checks.ts`, `src/runtime.ts`, `src/declarative.ts`, `src/fetch.ts`,
`src/patch.ts`, `test/value-checks.test.ts`, `docs/ARCHITECTURE.md` and this ticket. Add direct
copy-isolation/atomic-identity coverage, run the existing application, request, patch and modifier
tests, then fast, coverage, actual package and complete delivery checks. All previous ownership
failures and pending acceptance remain recorded. No size allowance, public API or cleanup guarantee
changes.

### Scope

Coverage follow-up to the size refactor: `test/fetch.test.ts` must exercise nested pending/error
paths through a public backend action. Verify replacement of a non-record intermediate, creation of
a missing intermediate, preservation of existing sibling state, pending/error values during dispatch
and settlement afterward. The first coverage rerun reports uncovered changed line 91 in
`src/fetch.ts`; preserve that failure and add behavior coverage without changing runtime code or
thresholds.

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

### Plan extension: behavior setup and detached mounts (2026-09-06)

Current source probes reproduce three failures through public behavior applications. Destroying an
application during its first binding leaves a subscribed effect and acquires an observer. Destroying
it inside a mount loses returned cleanup and allows a later mount and observer. Removing a mounted
node immediately before destruction skips its cleanup because the root no longer contains it. The
preserved before records are `ownership-census/behavior-registration-before.json` and
`ownership-census/behavior-detached-mount-before.json`; the source digest is
`8bf6f60b1f7101fcd701369ebc74b709d47092a4743d5026867809e1eeaca5ac`.

Stop an initial runner if its callback destroys the owner, stop subsequent rule/mount installation,
and skip observer acquisition after destruction. If a mount's provisional record is released while
the callback runs, invoke its returned cleanup immediately instead of retaining it in that removed
record. Root teardown releases every owned mount, including detached nodes; subtree cleanup retains
its containment and preservation rules. Preserve public callbacks, return types, destruction
idempotence and cleanup error propagation. A private prototype passes the three reproduced cases; it
is not maintained-code or package acceptance.

Planned files: `src/runtime.ts`, new `test/behavior-lifecycle.test.ts`, `README.md`,
`docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, this ticket, owner 0033 and the roadmap.
Regenerate affected agent content with its maintained generator. Update only the Mobile reference
UMD measurement from the rebuilt artifact if needed. Add public regression cases for initial
binding/model/event setup, initial and dynamic mounts, returned cleanup errors, released subtrees
and immediate node-removal followed by application or kernel destruction. Preserve failing tests
before applying the fix, then run focused, fast, exact changed-code coverage, installed-package,
browser, size/graph/API/type/reproducibility and full delivery checks. All budgets and mutation
deferral remain unchanged.

### Plan extension: detached declarative ownership (2026-09-06)

The full ownership review reproduces a separate declarative cleanup gap through public core APIs.
Removing a child before MutationObserver delivery and immediately destroying its application leaves
the child's registered cleanup uncalled. Its window listener can still change destroyed application
state. Kernel disposal also misses the cleanup and the remaining listener calls the disposed
expression engine. The exact current-source bundle, source identities, two-mode observations and
failing assertion are retained under `ownership-census/declarative-detached-*`.

Keep AC-02 and AC-08 pending and return to planned. Full root cleanup must visit every application
cleanup record, including elements detached before observer delivery. Cleanup of an ordinary subtree
must retain containment and preserved-root exclusions. Preserve record removal before invocation,
error aggregation, native listener removal, computed cleanup, effect disposal and repeated-destroy
behavior. This corrects application ownership and does not change the public directive API.

Planned files: `src/declarative.ts`, new `test/declarative-detached.test.ts`, `README.md`,
`docs/ARCHITECTURE.md`, `docs/RUNTIME_OWNERSHIP.md`, `docs/TESTING.md`, this ticket, owner 0033 and
the roadmap. Add public regressions for application/kernel destruction with detached nodes, normal
and throwing cleanup, removed listeners/model bindings and unaffected live sibling subtrees. Retain
the unchanged-source failures before the implementation. Then run focused lifecycle/patch tests,
fast, current coverage, actual package budgets and complete delivery. Keep every existing size and
coverage requirement and mutation deferral. The preceding full run was stopped for this reproduced
defect and cannot provide a delivery receipt.

The actual corrected build changes the compatibility UMD from 463,255 to 463,263 bytes. Extend the
planned-file manifest to `quality/jquery-mobile-migration.json` and update only its existing jQuery
Star asset measurement from the built file. Preserve all migration decisions and size ceilings; this
is measured artifact metadata, not a budget change.

## Code

`src/declarative.ts` now includes every owned cleanup record during full root cleanup, including
detached nodes. Other subtree cleanup still uses containment and preserved-root exclusions. New
`test/declarative-detached.test.ts` exercises both teardown modes, throwing cleanup, native and
jQuery listeners, model input and an unaffected live sibling after a scoped patch.

### Changed-file ledger

The behavior follow-up changes `src/runtime.ts` to close setup registration after destruction and
release detached mounts, and adds `test/behavior-lifecycle.test.ts` for the public regression paths.
Its public and brain contract updates belong in `README.md`, `docs/ARCHITECTURE.md` and
`docs/RUNTIME_OWNERSHIP.md`; owner 0033 and the roadmap retain the incomplete final-audit boundary.

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

### Ownership correction changed files (2026-09-06)

The coverage follow-up adds `test/fetch.test.ts` assertions for nested pending/error state during a
real public action dispatch and after its 204 response. All fourteen backend-action tests pass, with
replacement, missing intermediates and preserved siblings observed through application state.

Package-size follow-up: `src/value-checks.ts` now owns recursive state copying. Behavior and
declarative applications and signal patches import it; requests and patches share its plain-record
predicate. `src/declarative.ts` omits absent boolean event flags and normalizes native listener
options to explicit booleans. `test/value-checks.test.ts` checks isolation, sparse holes, atomic
identity, null-prototype input, enumerable keys and accessor errors. `docs/ARCHITECTURE.md`
describes the shared implementation. Focused, installed-package and complete delivery results are
pending.

| File                                                                                      | Purpose                                                                                                                                                                  |
| ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `test/request-lifecycle.test.ts`                                                          | Public core/application request ownership matrix with actual controlled fetch settlement, shared and independent controllers, both application modes and cleanup owners. |
| `test/runtime.test.ts`                                                                    | Assert replaced/fired debounce records are released before action invocation and reentrant scheduling.                                                                   |
| This ticket, `docs/tickets/0033-audit-full-library-program.md`, `docs/tickets/ROADMAP.md` | Record the reopened scope and authoritative progress.                                                                                                                    |

The built-in correction additionally changes `src/declarative.ts` to stop effects whose first
callback released the application, before retaining the runner or installing model handlers.
`test/directive-application.test.ts` adds public helper/native-event failure cases, active controls
and the already fixed registered-directive control. README and ownership/testing guidance describe
that lifetime boundary.

The ownership correction also changes `src/fetch.ts` to count active requests per root/controller
and `src/runtime.ts` to release replaced/fired debounce records before invoking actions.
`README.md`, `docs/BACKEND.md`, `docs/RUNTIME_OWNERSHIP.md` and `docs/TESTING.md` document the
shared-controller boundary, timer lifetime and exact regression scope.

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

| Command                                                              | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JQS_QUALITY_FORCE_ALL=1 npm run check` (invokes `quality:delivery`) | Pass   | `2026-09-07T01-53-29-076Z-39380/report.json`: all 13 enforced gates pass with matching 858-file fingerprint `c053e7f45e868a3f5e29824b29610eeaaec1da8b27f97ada8b4a51b834691121`. All 1,642 unit tests, 487 browser tests, 13 installed-package checks, seven release checks and 16 detector controls pass. Coverage reports no uncovered changed executable lines or functions in the nine changed runtime files. |
| Installed package sizes from that delivery run                       | Pass   | `package-report.json`: testing CommonJS/ESM are 12,975/12,988 bytes, core consumer is 62,991 gzip bytes and CSP consumer is 38,983 Brotli bytes. Existing 13,000/63,000/39,000 limits are unchanged.                                                                                                                                                                                                             |
| Actual Test phase validation for owners 0006, 0009 and 0014          | Pass   | `ownership-census/current-batch-test-validation.log`: all three validators pass against that exact delivery report before moving to Document. The final documentation and status changes require a new matching delivery receipt before commit.                                                                                                                                                                  |

Fast run `2026-09-07T01-35-41-017Z-92774` passes all six gates and 1,638 unit tests with matching
858-file fingerprints. Actual Code validation passes against that exact report before this ticket
returns to testing. The current built consumer preview measures core gzip 62,991 and CSP Brotli
38,983 bytes within unchanged limits. Current installed-package execution, changed-code coverage and
complete delivery remain required; the preview and fast result are not a receipt.

The actual combined package build passes. Its UMD is 463,263 bytes with digest
`eed0b10aebd1e38a5578449dbe5dbf8ee609c3348c0fefc4eb436002d1946f4b`; only the corresponding existing
Mobile reference measurement is updated. The build does not establish installed consumer budgets or
delivery acceptance, which remain required.

The detached declarative correction passes 88 focused tests across five lifecycle/patch suites.
Against the unchanged source, four teardown regressions fail while the scoped live-sibling control
passes. The first negative run also contained an invalid patch call in that control; its corrected
unchanged-source run isolates the four actual failures. Both reports remain retained. Focused ESLint
and agent generation pass. Current fast, coverage, actual package budgets and full delivery remain
required.

Delivery `2026-09-07T01-23-08-047Z-63863` was deliberately stopped after the current-source detached
declarative defect was reproduced. Workflow, runner checks, dependency preparation, formatting,
1,628 unit tests and delivery static analysis pass. Coverage is interrupted and later gates are
unexecuted errors. The report records SIGTERM with matching fingerprints and no receipt. The
original public probe records zero cleanup calls in both teardown modes; application-only
destruction still permits a window event to change state, while kernel disposal leaves an event that
calls a disposed expression engine. Preserve that failure before the planned correction.

Fast run `2026-09-07T00-57-56-093Z-17895` passes all six gates and all 1,628 unit tests with
matching 856-file fingerprint `9cd1068e1a3d9f000298a21f3d1253d7b8bd71cbebc7e5dc643895c5d5091ecd`.
Actual Code validation against that report passes before moving to testing. The build and focused
ESLint checks pass. The new test's initial twelve forbidden non-null assertions were replaced with
an explicit required-value guard without changing lint rules. The rebuilt UMD measures 463,255 bytes
and the Mobile reference records that measurement. A consumer preview measures core gzip 62,998
within 63,000, but CSP Brotli 39,055 exceeds 39,000. Preserve that preview and resolve the remaining
package limit before current installed-package, coverage and complete delivery acceptance.

The new `test/behavior-lifecycle.test.ts` fails all seven cases against the unchanged runtime. After
the correction, five focused suites pass all 116 tests, including all seven regressions. They
observe initial binding/model/event teardown, initial/dynamic mount destruction, a throwing returned
cleanup, node removal before application/kernel destruction, and a mount that removes its own
subtree while the application remains alive. Raw negative and passing JSON/logs are retained as
`ownership-census/behavior-lifecycle-{negative,focused}.*`. Fast, coverage, package and full
delivery remain required for this source correction.

Corrected size-refactor coverage passes: all 125 changed executable lines and 25 changed functions
are covered, with zero uncovered or unexplained changes and all 28 executed requirement mappings
satisfied. Global/subsystem floors and the immutable threshold comparison pass. Raw reports and all
30 unchanged input hashes are preserved in `ownership-census/package-size-coverage-passed/`. This is
standalone coverage evidence; package-size failures and complete delivery remain open.

The first size-refactor coverage run fails only because `src/fetch.ts:91` lacks a hit for nested
request-state path initialization. Tests, global/subsystem floors, immutable threshold comparison
and all 28 executed requirement mappings pass. Raw evidence is preserved in
`ownership-census/package-size-coverage-failed/`. A public nested pending/error case is planned
before the corrected rerun; no allowance or denominator change is approved.

The standalone installed-package follow-up fails two of thirteen checks. Core raw/gzip assertions
now pass before the CSP assertion fails at 39,046 Brotli bytes against 39,000. Packed size is
3,176,621 bytes against the combined 3,174,000-byte allowance. API/types, installed consumers,
QUnit, three-browser consumers, Mobile UMD measurement and registry checks pass. The report is
retained at `ownership-census/package-size-installed/package-report.json`, with all 29 changed input
hashes unchanged during execution. Further build-size correction and complete delivery remain
required.

Package-size follow-up: the seven focused suites pass 153 tests with no failures or pending tests.
`npm run build` passes JavaScript, declaration/API and CSS generation. Fast run
`2026-09-07T00-13-54-546Z-15329` passes all six selected gates and 1,620 unit tests on unchanged
fingerprint `629cc01ec800fbb83a349344f00162fe527fa62685ca4c7cfa4949833164c4ca` (856 files). Actual
Code validation passes before returning to testing. These checks cover the shared copy boundary and
existing application, directive, request and patch behavior. This phase/evidence edit follows that
fast run; changed-code coverage, installed-package and full delivery remain required.

| Command                                         | Result | Evidence                                                                                                                                                                                                                                                                                                                    |
| ----------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast` (built-in correction)    | Pass   | `2026-09-06T23-54-22-242Z-93737/report.json`: all six gates and 1,618 unit tests pass with zero failed/pending cases and unchanged 856-file fingerprint `ce08adb4…e49f0`.                                                                                                                                                   |
| `npm run test:coverage` (built-in correction)   | Pass   | `ownership-census/builtin-registration-coverage/verification.json`: 104 changed executable lines and eighteen changed functions covered, zero uncovered/unexplained changes, and all 28 executed requirement mappings pass. Raw reports and input hashes are preserved. This standalone check supplies no delivery receipt. |
| Actual Code phase validation                    | Pass   | `ownership-census/builtin-registration-code.log`; validated the exact passing fast report before returning to testing.                                                                                                                                                                                                      |
| Focused built-in and directive/lifecycle suites | Pass   | `ownership-census/builtin-registration-focused.json`: 108 passing tests across four suites, including the three previously failing built-in paths and active/registered controls.                                                                                                                                           |
| Fresh source-bundled public probes              | Pass   | `builtin-effect-reentrant-after.json` and `model-reentrant-after.json`: zero retained effects, no post-destruction evaluation or model state/DOM writes. This is source proof, not installed-package acceptance.                                                                                                            |

Combined delivery failure (2026-09-06).

Forced delivery `2026-09-06T23-28-19-460Z-20892` finishes with eleven passing gates and two
failures. All 1,610 unit tests, 487 browser cases, coverage, properties, static checks and seven
release checks pass. Coverage measures all 96 changed executable lines and sixteen changed
functions, with no uncovered or unexplained changes. Package quality rejects 3,175,232 packed bytes
against 3,174,000, 63,203 core gzip bytes against 63,000, and the stale Mobile UMD reference
(463,011 versus actual 463,830 bytes). The package-budget detector also fails because these
unrelated package errors remain alongside its deliberate failure. The other fifteen detector
controls pass. Source fingerprints match throughout; no delivery receipt is eligible. Preserve the
failed report and correct the implementation/measurement within unchanged budgets before repeating
full delivery.

| Command                                                      | Result | Evidence                                                                                                                                                                                                                                                                                                                                        |
| ------------------------------------------------------------ | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run test:coverage` (response and lifecycle corrections) | Pass   | `ownership-census/lifecycle-and-response-coverage/coverage-gate.json` and retained raw reports: all 35 changed executable lines and eight changed functions are covered across fetch, runtime and response fixtures; global/subsystem thresholds and all 28 required evidence mappings pass. This standalone gate supplies no delivery receipt. |

| Command                                                     | Result | Evidence                                                                                                                                                                                               |
| ----------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm run quality:fast` (response and lifecycle corrections) | Pass   | `2026-09-06T23-15-18-323Z-88354/report.json`: all six selected gates pass, 1,600 unit tests pass with zero failures/pending cases, and start/end fingerprint `6c42ce5b…e795` matches across 856 files. |
| Code phase validation against the exact passing fast report | Pass   | Actual phase validation passes before moving to testing. Full delivery and final acceptance remain required.                                                                                           |

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

### Ownership correction fast failure (2026-09-06)

Fast run `2026-09-06T23-13-08-307Z-75433` passes 1,600 unit tests and the workflow/format checks,
but typed lint and its boundary inventory reject `String(input)` in the new transport fixture
because a `Request` may stringify as an object. Read `Request.url` explicitly and pass string/URL
inputs directly to `URL`. Do not add an allowance or weaken the rule. The response-test non-null
allowance removal passes its current boundary check.

### Ownership correction verification (2026-09-06)

The reopening Plan passed before implementation. The first test draft used `installed.star` after
kernel disposal had correctly removed that property, creating teardown fixture failures alongside
real regressions. The corrected fixture retains the public facade for idempotent disposal. The
corrected original-source run records twelve expected failures and thirty-eight passes, with both
production files still byte-identical to commit `4b167b4`. Ten failures concern shared-controller
cleanup and two concern retained debounce records. Distinct-controller and explicit caller-abort
controls pass. Both original runs remain in `ownership-census/lifecycle-correction-negative*.json`.

The corrected source passes all 83 tests across request lifecycle, runtime, backend actions and
operation observation in `ownership-census/lifecycle-correction-focused.json`. The new public-core
matrix uses fetch start and settlement signals without arbitrary sleeps. Fast, changed-code coverage
and complete delivery remain required before closing the reopened criteria.

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

| ID    | Evidence                                                                                                                                                                                                                                                                                                                                           | Result |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `test/behavior-lifecycle.test.ts` and `test/directive-application.test.ts` prove setup-time destruction stops effects and later listeners, mounts and observers, and releases returned cleanup. Runtime, declarative and kernel suites retain constructor rollback and data-record checks. Current full delivery passes.                           | Pass   |
| AC-02 | Behavior and detached-declarative regressions prove cleanup before observer delivery, continued cleanup after a callback throws and repeated destruction without duplicate callbacks. Directive/runtime suites verify removal before invocation and reverse cleanup. Current full delivery passes.                                                 | Pass   |
| AC-03 | `test/reactivity.test.ts`, `test/runtime.test.ts`, and `test/declarative.test.ts` prove later owned and unowned effects still run after one scheduled effect fails.                                                                                                                                                                                | Pass   |
| AC-04 | `test/kernel.test.ts` verifies both comparator directions; the Firefox and WebKit render proof observes `inner:true` before `outer:true`.                                                                                                                                                                                                          | Pass   |
| AC-05 | `test/patch.test.ts` proves direct and morph preservation retain the same root and application without a second mount.                                                                                                                                                                                                                             | Pass   |
| AC-06 | `test/fetch.test.ts` and `test/datastar-sdk.test.ts` await the same enhancement barrier after HTML responses, raw SSE, and official SDK element events.                                                                                                                                                                                            | Pass   |
| AC-07 | Kernel, patch, focused Chromium, Firefox, and WebKit tests prove the barrier waits for observer delivery, directives, UI ARIA setup, and reactive output.                                                                                                                                                                                          | Pass   |
| AC-08 | `test/request-lifecycle.test.ts` proves shared-controller ownership through sibling settlement and application/kernel teardown in both modes. `test/runtime.test.ts` proves fired/replaced debounce records are released before callbacks. Kernel and behavior suites verify terminal resource and observer cleanup. Current full delivery passes. | Pass   |

### Completion audit

The reopened criteria match the current source, public documentation and regression evidence.
Initial binding, mount and directive callbacks release provisional work after owner destruction.
Detached nodes remain owned until cleanup, shared request controllers retain each active request,
and fired or replaced debounce records leave their ledgers before action execution. Failure paths
continue cleanup and preserve errors. All eight criteria have direct evidence in the current
1,642-unit/487-browser delivery run, including unchanged package limits and all 16 detector
controls. Actual Test validation passed before this Document phase.

Status: Complete

### Historical completion audit

The changed-file ledger matches the implemented lifecycle scope. Focused tests, cross-engine browser
proofs, coverage, mutation, package, self-hosting, static, property, and release gates pass. Public
and project-brain documentation describe the shipped ownership and barrier contracts.

Status: Complete

### Built-in initial-registration correction (2026-09-06)

The extended Plan passed before runtime edits. Against the preceding source, the new matrix has
three expected failures and twenty-two passes: `data-effect` and `data-show` execute twice after
initial destruction, and model state updates still write a destroyed input. The same public fixture
also checks native input after teardown. The `data-text` and active controls pass. Evidence is
`ownership-census/builtin-registration-negative.json`; no fixture setup failure is counted.

Both built-in effect creation paths now check terminal state immediately after synchronous initial
execution and stop the runner before ownership or listener registration when it was destroyed.
Focused/fast/coverage and full delivery remain required. The package-size correction remains open.

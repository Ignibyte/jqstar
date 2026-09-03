---
id: 0005
title: Define the kernel host and runtime ownership
status: done
created: 2026-08-30
updated: 2026-08-31
---

# 0005: Define the kernel host and runtime ownership

## Plan

### Problem

Actions, expression caches, scheduling, requests, UI records, global listeners, and document
enhancement use different module or application scopes. Moving one action map into a “kernel” would
not create a truthful isolation or cleanup boundary.

### Current evidence

- `src/registry.ts` owns one module-level action map.
- Both application classes import `resolveAction` directly.
- UI factories register into the same map and install document/window behavior.
- Expression and reactivity modules retain mutable module-level state.
- `src/ui/index.ts` retains one auto-enhancement observer per document without a disposal path.
- Combobox, hover-card, menu, multi-select, popover, select, sidebar, toast, and tooltip install
  document/window listeners directly; toast also installs a document observer directly.
- Application instances are stored only in jQuery data. No document-level owner can enumerate or
  destroy all applications during controlled teardown.

### Scope

- Record every mutable runtime object in an ownership matrix.
- Implement one kernel for one ambient Window/Document and canonical jQuery instance.
- Move action registration/resolution, expression-engine selection, application records, owned
  resources, and kernel subscriptions behind narrow capabilities.
- Give the UI factory an injected action/document-host capability rather than the module registry.
- Detect unsupported attempts to claim the same document host where practical.
- Add idempotent kernel disposal and a disposed-state contract.
- Preserve root auto-install and all baseline behavior from ticket 0003.

### Out of scope

- Multiple kernels controlling one document.
- Public plugin registration, public directives, or transactional application construction.
- Moving immutable metadata into the kernel.

### Dependencies

- Tickets 0003 and 0041 through 0043.

### Acceptance criteria

- [x] [AC-01] The ownership matrix classifies all mutable module, document, kernel, application, UI,
      request, expression, and scheduler state.
- [x] [AC-02] Actions and application records are no longer process-global.
- [x] [AC-03] UI action registration uses injected kernel capabilities.
- [x] [AC-04] One document host has one supported active kernel and canonical jQuery instance.
- [x] [AC-05] Disposing the kernel is idempotent and prevents later boot or structural registration.
- [x] [AC-06] A fresh supported host does not inherit actions, subscriptions, applications, or other
      state moved under kernel ownership by this ticket from a disposed kernel.
- [x] [AC-07] The root import passes every ticket-0003 compatibility fixture.

### Design

Expose capabilities rather than the kernel object. Keep optional service state inside plugins. The
document host owns only behavior that must be shared across applications in one document.

The kernel will own an action registry, application registry, typed resource ledger, subscription
set, expression-engine selection slot, and one document-host capability. Applications receive only
action resolution and destruction notification. UI construction receives only action registration
and the document host. Built-in UI modules may continue to keep element-keyed controller records
private, but document/window listeners and observers must be installed through the host ledger.

The compatibility installer remains the only public root surface in this ticket. Kernel inspection
and disposal stay package-internal until ticket 0013 publishes the side-effect-free `core` entry.
The root `$.star` member set therefore remains byte-for-byte compatible with ticket 0003.

Ticket 0005 tracks an application only after its constructor returns and destroys tracked
applications during kernel disposal. Constructor staging, rollback after partial setup, cleanup
error aggregation, nested-root ordering, and patch transactions remain ticket 0006 work.

### Decisions

- A `Document` can be claimed once for the lifetime of that document. Disposing its kernel releases
  resources but does not support installing another package copy into the same document.
- A separate document/realm gets a separate kernel, action registry, application registry,
  subscription set, and resource ledger.
- UI action factories use a synchronous scoped registrar supplied by `createUI()`. The registrar
  stack is transient installation context; it stores no actions and is empty after factory setup.
- Existing element-keyed UI controller records remain module-private. Their logical owner is the UI
  controller rooted in that element. Module-level active-record sets must be filtered by the
  injected document, and host disposal removes that document's entries.
- The current expression compiler and reactive scheduler remain compatibility implementations. This
  ticket gives the kernel an engine-selection slot and classifies their current state; ticket 0007
  moves compiler caches into the selected engine, while ticket 0006 assigns effects to owners.

### Security and accessibility

- Host conflicts fail before a second kernel can install listeners or register actions.
- Disposal removes document/window observers and listeners through exact callback references.
- No expression trust, CSP, HTML parsing, focus, keyboard, or ARIA behavior changes in this ticket.
- UI global-listener migration must preserve escape keys, outside clicks, repositioning, sidebar
  shortcuts, toast focus behavior, and existing accessibility tests.

### Risks

- UI modules contain many module-level records and listener flags. The ownership matrix must decide
  which require migration and which are safe under the one-kernel-per-document topology.
- Disposal cannot promise cleanup for arbitrary third-party browser work.

### Planned files

- `src/kernel.ts`: Kernel ownership, document claiming, application records, subscriptions, and
  typed resource ledger.
- `src/registry.ts`: Kernel-owned action registries and the scoped UI registrar.
- `src/runtime.ts`, `src/declarative.ts`: Inject action/application capabilities and enforce the
  disposed-state contract without expanding the root API.
- `src/ui/index.ts`: Inject the document host, own auto-enhancement, and remove its module observer.
- `src/ui/{combobox,hover-card,menu,multi-select,popover,select,sidebar,toast,tooltip}.ts`: Move
  document/window behavior through the host ledger and isolate active records by document.
- `test/kernel.test.ts`: Host conflicts, registry isolation, application tracking, subscriptions,
  resource disposal, idempotence, and disposed-state refusal.
- `test/runtime.test.ts`, `test/public-baseline.test.ts`: Installed-kernel behavior and frozen-root
  compatibility.
- `scripts/smoke-package-files.mjs`: Keep the post-build package-file smoke JSON-only under current
  npm without weakening installed/release packing.
- `docs/RUNTIME_OWNERSHIP.md`, `docs/ARCHITECTURE.md`, `docs/README.md`: Durable topology, ownership
  matrix, disposal boundary, and project-brain routing.
- `docs/tickets/0005-define-kernel-host-and-ownership.md`: Live workflow and acceptance evidence.

### Verification plan

- Add kernel/host/disposal unit tests and root compatibility tests.
- Run focused UI enhancement tests after action injection.
- Run `npm run check`, `npm run test:package`, and `git diff --check`.

## Code

### Changed-file ledger

| File                                                                                     | Purpose                                                                                                                                    |
| ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `src/kernel.ts`                                                                          | Document claim, kernel state, application records, expression owner, resource ledger, subscriptions, disposal, and narrow capabilities.    |
| `src/registry.ts`                                                                        | Per-kernel action registry plus a transient, synchronous UI-construction registrar with no process action map.                             |
| `src/expression.ts`                                                                      | Created expression-engine instances while preserving root compiler function signatures.                                                    |
| `src/runtime.ts`                                                                         | Installed one kernel, injected application/UI capabilities, tracked application lifetime, and enforced disposed-state boot/action refusal. |
| `src/declarative.ts`                                                                     | Consumed injected action and expression capabilities and notified the kernel on destruction.                                               |
| `src/ui/index.ts`                                                                        | Scoped UI action registration, injected document-host capabilities, ledger-owned auto-enhancement, and exact observer contracts.           |
| `src/ui/floating.ts`                                                                     | Shared floating behavior plus per-document record filtering, cleanup, and viewport-listener installation.                                  |
| `src/ui/*.ts` controller factories                                                       | Registered built-in actions only inside the synchronous construction scope.                                                                |
| `src/ui/{combobox,hover-card,menu,multi-select,popover,select,sidebar,toast,tooltip}.ts` | Registered persistent document/window behavior and active-record cleanup through the document host.                                        |
| `test/kernel.test.ts`                                                                    | Kernel isolation, host claims, resources, applications, expression caches, errors, disposal, and fresh-host tests.                         |
| `test/runtime.test.ts`                                                                   | Installed application tracking and UI resource-ledger coverage.                                                                            |
| `test/runtime-install.test.ts`                                                           | Fresh-document installation, built-ins, cache clearing, tracking, teardown, namespaces, and disposed boot refusal.                         |
| `test/expression-engine.test.ts`, `test/registry.test.ts`                                | Per-engine cache isolation and exact nested construction-scope behavior.                                                                   |
| `test/ui-host.test.ts`                                                                   | Host listener counts, observer behavior, construction-scope closure, ready-state paths, and disposal.                                      |
| `test/ui-dialog.test.ts`, `test/ui-menu.test.ts`, `test/ui-toast.test.ts`                | Negative lifecycle cases for action targeting, focus preservation, visibility, disconnected records, and timers.                           |
| `test/public-baseline.test.ts`                                                           | Read the frozen built-in action census from the installed kernel.                                                                          |
| `test/property/runtime.property.test.ts`                                                 | Preserved the explicit foreign non-Error throw normalization contract under lint.                                                          |
| `scripts/smoke-package-files.mjs`                                                        | Skipped redundant post-build `prepack` logs so npm's dry-run JSON remains parseable.                                                       |
| `README.md`, `docs/PROJECT.md`                                                           | Public one-document/one-kernel topology.                                                                                                   |
| `docs/README.md`, `docs/ARCHITECTURE.md`                                                 | Project-brain route and kernel runtime flow.                                                                                               |
| `docs/RUNTIME_OWNERSHIP.md`                                                              | Complete retained-state inventory, logical owners, cleanup boundary, and successor tickets.                                                |
| `docs/tickets/0005-define-kernel-host-and-ownership.md`                                  | Live Plan → Code → Test → Document record.                                                                                                 |

### Design changes

The implementation moved per-kernel expression cache creation forward from ticket 0007 because an
application could not truthfully receive an engine-selection capability while continuing to import
the process compiler. Ticket 0007 still owns the public engine contract, location-aware errors,
conformance matrix, CSP statement, and final root-compatibility cache policy.

Resource records own an idempotent release function. Manual release and kernel disposal therefore
cannot invoke the same cleanup twice. Disposal marks the kernel closed before application/resource
cleanup, attempts every record in reverse registration order, clears registries, and then rethrows
one original failure or an aggregate. Ticket 0006 still owns transactional application setup,
application-cleanup hardening, and nested-root order.

Generated component ID counters, element-keyed controller maps, controller timers, request maps, and
the reactive scheduler remain module storage with the logical owners and successor tickets listed in
`docs/RUNTIME_OWNERSHIP.md`. The kernel does not claim those resources are already in its ledger.

UI factories continue to import one internal `registerAction()` function, but it is no longer a
registry. `createUI()` opens a synchronous registrar scope backed by the current kernel, constructs
every factory, registers dialog actions, and closes the scope before installing enhancement. Calls
outside construction fail, nested scopes close in reverse order, and the transient stack stores no
actions.

## Test

| Command                                                  | Result               | Evidence                                                                                                                                                                                                                    |
| -------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation                             | Pass                 | Required plan fields and stable acceptance IDs passed before product code changed.                                                                                                                                          |
| `npm run typecheck`                                      | Pass                 | Runtime, tests, registry blocks, injected capabilities, and UI factory signatures compile.                                                                                                                                  |
| Focused kernel/runtime/declarative/public-baseline suite | Pass, 37 tests       | Kernel ownership plus both application modes and the frozen root surface passed.                                                                                                                                            |
| Affected UI controller suite                             | Pass, 82 tests       | Persistent-listener migration preserved combobox, hover-card, menu, context-menu, multi-select, popover, select, sidebar, toast, and tooltip behavior.                                                                      |
| First `npm run test:unit`                                | Expected repair fail | All 413 behavior tests passed; API Extractor alone rejected accidental function-to-constant declaration drift in the three root expression exports.                                                                         |
| Repaired package/release hardening suite                 | Pass, 9 tests        | Restoring function declarations kept the API report byte-compatible and passed drift-control sabotage.                                                                                                                      |
| `npm run quality:fast`                                   | Pass                 | Report `2026-08-31T19-02-40-455Z-7351` passed ticket workflow, runner self-test, format, 414 unit tests, and the fast static suite.                                                                                         |
| First `npm run test:package`                             | Expected repair fail | Built ESM/UMD behavior passed; current npm mixed the redundant `prepack` Vite log into the package-file smoke's JSON stdout.                                                                                                |
| First `npm run test:package:quality`                     | Expected repair fail | All consumers, three browsers, peer failures, exports, types, and registry copy passed; only the measured tarball and root-consumer bundle exceeded old ceilings.                                                           |
| Repaired `npm run test:package:quality`                  | Pass, 13 checks      | The 264-file tarball passed installed ESM, CommonJS, NodeNext, Bundler, QUnit, UMD, three-browser boot/dispose, peer, type, export, bundle, and registry proof.                                                             |
| `npm run test:release:quality`                           | Pass, 7 checks       | Two clean workspaces reproduced SHA-256 `a5312cdc2199b827614d9906a9bbb16c328e61046f82cf959443ca4504fa6e0e`; SBOM, licenses, toolchain, and packed self-hosting passed.                                                      |
| Focused lifecycle repair suite                           | Pass, 27 tests       | Expression caching, host readiness/cleanup, dialog targeting, menu focus/repositioning, and toast pause/removal behavior passed.                                                                                            |
| `npm run typecheck` and `npm run lint`                   | Pass                 | Runtime and registry TypeScript surfaces compile; production, server, test, example, E2E, and script lint is clean.                                                                                                         |
| Repaired `npm run test:coverage`                         | Pass                 | The immutable-base coverage gate passed after document-host and lifecycle-negative tests were added.                                                                                                                        |
| Targeted mutation repair runs                            | Pass, 100% `src/`    | Every targeted kernel, registry, runtime, expression, UI-host, menu, and toast mutant was killed; the sole merged-report survivor is the accepted pre-existing server score at 99.65%.                                      |
| First complete `npm run quality:delivery`                | Expected repair fail | Unit, coverage, property, mutation, self-hosting, release, browser, and detector self-test passed; source policy, Knip, and the package ceiling rejected three structural issues.                                           |
| Repaired static delivery and package-quality gates       | Pass                 | All 28 static checks and all 13 installed-package checks passed after removing the suppression, declaring the Vite fixture entry, and retaining the immutable package ceiling.                                              |
| Relocated helper targeted mutation run                   | Pass, 100%           | All 12 viable mutants in the shared per-document record/listener helper were killed after it moved into the existing internal utility module.                                                                               |
| Final `npm run quality:delivery`                         | Pass                 | Report `2026-08-31T21-13-51-611Z-58573` passed all 13 gates: 432 unit tests, coverage, property, 28 static checks, 99.88% mutation, self-hosting, 264-file package, reproducible release, browsers, and detector self-test. |

### Inspection ledger

| Finding                                                                                                                        | Resolution                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The first delivery inspection found an ESLint suppression, an undeclared E2E fixture entry, and a package-file ceiling breach. | Removed the suppression, declared the fixture entry, and relocated the shared record/listener helper into an existing internal module; static and package gates passed. |
| Targeted mutation inspection found one surviving branch after the shared helper moved.                                         | Added focused lifecycle coverage and killed all 12 viable mutants in the relocated helper.                                                                              |
| The completion receipt audit found that the Test ledger used a qualified result label and omitted this inspection ledger.      | Normalized the delivery result to `Pass` and recorded the independent inspection findings and resolutions here.                                                         |

## Document

### Documentation changed

- `README.md` and `docs/PROJECT.md` publish the supported one-document/one-kernel topology without
  adding a root API member.
- `docs/ARCHITECTURE.md` routes installed applications and UI construction through kernel
  capabilities.
- `docs/RUNTIME_OWNERSHIP.md` inventories every retained mutable owner, storage location, cleanup
  boundary, and named successor ticket.
- `docs/README.md` adds the ownership contract to the project-brain reading order and orientation
  table.
- This ticket records the topology decisions, design changes, exact changed-file ledger, repair
  history, and acceptance evidence.

### Acceptance evidence

| ID    | Outcome | Evidence                                                                                                                                                                              |
| ----- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01 | Pass    | `docs/RUNTIME_OWNERSHIP.md` classifies document, kernel, application, request, expression, scheduler, UI, SSE, and process state and inventories every retained module.               |
| AC-02 | Pass    | `Kernel` creates its own action registry and application set; kernel/runtime tests prove isolation, tracking, clearing, and fresh-document separation.                                |
| AC-03 | Pass    | `createUI()` opens a kernel-backed synchronous registrar scope; registry and UI-host tests prove nested LIFO routing, post-construction refusal, and no action storage in the scope.  |
| AC-04 | Pass    | Kernel host tests reject a second kernel and a different jQuery instance for one document while allowing an independent document realm.                                               |
| AC-05 | Pass    | Kernel tests prove reverse-order at-most-once cleanup, aggregate failure reporting, idempotent disposal, and refusal of later boot, registration, listeners, observers, and services. |
| AC-06 | Pass    | Fresh-host tests prove no action, application, subscription, expression-cache, listener, observer, service, or disposed state crosses document realms.                                |
| AC-07 | Pass    | Public-baseline, API Extractor, installed ESM/CommonJS/UMD/QUnit consumers, jQuery peer checks, and Chromium/Firefox/WebKit boot-dispose fixtures pass with the root 0.1 surface.     |

### Completion audit

Status: Complete

Every criterion has direct ownership, lifecycle, compatibility, package, and cross-browser evidence.
Test-phase evidence uses delivery report `2026-08-31T21-13-51-611Z-58573`; the completed ticket is
bound by the current-worktree delivery receipt and document-phase validation. The root 0.1 surface
remains unchanged, so ticket 0006 can build transactional application lifecycle on the kernel
boundary without reopening host ownership.

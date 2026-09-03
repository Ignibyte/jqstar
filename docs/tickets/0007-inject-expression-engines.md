---
id: 0007
title: Inject expression engines through the kernel
status: done
created: 2026-08-30
updated: 2026-09-01
---

# 0007: Inject expression engines through the kernel

## Plan

### Problem

Both application modes import the global `Function` compiler directly. Adding public helpers or
directives before an evaluator seam would hard-code that engine and force another rewrite for CSP.

### Current evidence

- Tickets 0005 and 0006 moved application compilation behind `ApplicationCapabilities.expressions`
  and gave every kernel a distinct `ExpressionEngine` instance.
- `src/expression.ts` still exposes only an internal three-method interface. It has no public
  installer option, structured source location, or disposal contract.
- Kernel disposal clears the engine cache but does not dispose the engine or prevent later
  compilation through a retained engine reference.
- Root-level `compileValue`, `compileStatement`, and `clearExpressionCache` use a separate
  compatibility engine to preserve the frozen 0.1 function signatures.
- The architecture and README state that the trusted compiler uses `Function`, requires
  `unsafe-eval`, and accepts only trusted attribute expressions.

### Scope

- Define the internal and public expression-engine capability.
- Move compile, cache clear, error location, and disposal through the kernel-selected engine.
- Adapt the current compiler as the trusted JavaScript engine without changing expression behavior.
- Move expression caches to the engine/kernel owner.
- Let the public installer select one engine before the kernel is created. Reject reuse of one
  stateful engine object across kernels.
- Publish a CSP threat statement that distinguishes CSP compatibility from an untrusted sandbox.
- Create a shared conformance matrix that a later CSP engine must satisfy for supported syntax.

### Out of scope

- Implementing the CSP grammar, parser, evaluator, or package. Tickets 0015, 0034, and 0035 own that
  work.
- Making server-supplied or untrusted attribute expressions safe.

### Dependencies

- Tickets 0005 and 0006.

### Acceptance criteria

- [x] [AC-01] Neither application implementation imports a concrete expression compiler; both use
      only the kernel-provided engine capability.
- [x] [AC-02] The public installer accepts one expression engine, each kernel claims one unique
      engine object, and its compiled-source caches are not shared with another kernel or the 0.1
      compatibility exports.
- [x] [AC-03] The trusted JavaScript engine preserves every ticket-0003 expression, action, jQuery,
      asynchronous-result, and error behavior.
- [x] [AC-04] Public cache clearing affects only the selected live engine. Kernel disposal invokes
      that engine's idempotent disposal once, clears its caches, and makes retained evaluators and
      later compilation fail without affecting another engine owner.
- [x] [AC-05] Expression failures expose compile/evaluate phase, source, and optional attribute,
      line, and column location without removing the existing human-readable error intent.
- [x] [AC-06] A shared conformance matrix covers values, statements, `$`, `$name`, context names,
      named actions, jQuery calls, asynchronous results, and location-aware synchronous and
      asynchronous errors.
- [x] [AC-07] Public and architecture documentation states that the trusted engine needs
      `unsafe-eval`, a future CSP engine removes dynamic code construction only, and both engines
      require trusted markup because expressions retain jQuery, DOM, and action capabilities.

### Design

Publish `StarExpressionEngine` with `compileValue`, `compileStatement`, `clearCache`, and `dispose`.
`installStar($, { expressionEngine })` selects the engine before the kernel claims the document. The
trusted factory is named `createTrustedExpressionEngine` so consumers cannot mistake it for the
future CSP implementation.

Compilation accepts an optional `StarExpressionLocation`. The trusted engine caches the resulting
callable by source and location, wraps compilation, synchronous evaluation, and asynchronous
rejection in a structured `StarExpressionError`, and invalidates retained evaluators on disposal.
The root compatibility compiler keeps a separate engine and its existing one-argument functions.

Keep the evaluator output callable contract small. Helper and directive registries should depend on
the engine capability rather than compiler internals.

### Decisions

- Preserve the side-effecting 0.1 root entry. Ticket 0013 will expose the same installer through a
  side-effect-free `core` entry, which is where a future CSP package can select its engine before
  installation.
- Treat an engine as a stateful kernel resource. One engine object cannot be shared or reclaimed for
  a second kernel after disposal.
- Keep expression locations structural and optional: authored attribute plus parser-provided line
  and column. The declarative error event continues to carry the concrete element separately.
- Keep the conformance runner in repository test support until ticket 0014 publishes the testing
  package.

### Risks

- A public engine interface can expose compiler internals permanently. Publish only the methods
  required by applications and official CSP work.
- Error text is consumer-visible. Preserve existing messages where the baseline marks them stable.
- A thenable can reject after the engine's synchronous call returns. Wrap asynchronous rejection so
  it receives the same source and location as synchronous failures.
- Capturing elements in compiled-expression caches would retain detached DOM. Cache only source and
  structural location; keep the concrete element in the existing declarative error event.

### Verification plan

- Run the full expression conformance matrix against the trusted engine.
- Add public installer injection, engine uniqueness, cache isolation, asynchronous error, and
  disposal tests.
- Update and verify the public baseline and API Extractor report for the new value and type exports.
- Run `npm run check`, `npm run test:package`, and `git diff --check`.

### Planned files

- `src/expression.ts`: Public engine, evaluator, location, error, cache, and disposal contracts.
- `src/kernel.ts`, `src/runtime.ts`: Unique engine ownership, public installer selection, and
  disposal.
- `src/declarative.ts`: Supply authored attribute locations through the engine capability.
- `src/index.ts`: Export the trusted factory and public expression-engine types.
- `test/expression-engine.test.ts`, `test/expression-engine-conformance.ts`: Shared conformance and
  focused cache/error/disposal proof.
- `test/kernel.test.ts`, `test/runtime-install.test.ts`, `test/declarative.test.ts`,
  `test/public-baseline.test.ts`: Kernel isolation, installer injection, authored errors, and public
  exports.
- `scripts/quality-package.mjs`: Installed ESM, CommonJS, QUnit, and TypeScript export proof.
- `quality/public-baseline.json`, `etc/jquery-star.api.md`: Reviewed public surface.
- `README.md`, `docs/ARCHITECTURE.md`, `docs/PROJECT.md`, `docs/RUNTIME_OWNERSHIP.md`,
  `docs/TESTING.md`: Usage, threat, product, ownership, and conformance documentation.
- `docs/tickets/0007-inject-expression-engines.md`: Plan, ledger, commands, findings, and evidence.

## Code

### Changed-file ledger

| File/group                                                              | Purpose                                                                      |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| `src/expression.ts`                                                     | Public trusted-engine, location, error, cache, and disposal contract.        |
| `src/kernel.ts`, `src/runtime.ts`, `src/declarative.ts`                 | Unique kernel ownership, installer selection, disposal, and authored origin. |
| `src/index.ts`                                                          | Publish the trusted factory and expression-engine types.                     |
| `test/expression-engine{,-conformance}.ts`                              | Shared matrix plus focused cache, action, error, and disposal proof.         |
| `test/{kernel,runtime-install,declarative,public-baseline}.test.ts`     | Prove isolation, injection, authored locations, and reviewed exports.        |
| `e2e/{components,quality-contracts}.spec.ts`                            | Keep browser quality assertions aligned with the decided jQStar brand.       |
| `scripts/quality-package.mjs`                                           | Resolve the new values and types from an installed ESM/CommonJS tarball.     |
| `quality/public-baseline.json`, `etc/jquery-star.api.md`                | Review the added 0.x public API surface.                                     |
| `README.md`, `docs/{ARCHITECTURE,PROJECT,RUNTIME_OWNERSHIP,TESTING}.md` | Document usage, lifecycle, conformance, and the trusted-markup boundary.     |
| `docs/tickets/0007-inject-expression-engines.md`                        | Keep phase, file, command, finding, and acceptance evidence current.         |

### Design changes

The implementation follows the planned small four-method engine interface. The trusted factory and
types are public; the kernel itself remains internal until ticket 0013 publishes the
side-effect-free core entry.

The trusted engine caches evaluators by source plus structural attribute/line/column location. It
does not retain an element. Synchronous throws and rejected asynchronous results become the same
structured error shape. Every compiled evaluator checks the engine's live state, so disposal
invalidates both future compilation and previously returned functions.

Kernel construction claims the stateful engine object in a process `WeakSet`. The claim is not
released after disposal because the engine has been permanently closed. Kernel disposal attempts
engine disposal with the rest of its cleanup and preserves aggregate failure behavior.

## Test

| Command                                                                                                                                                | Result                   | Evidence                                                                                                                                                                                                                                     |
| ------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --ticket docs/tickets/0007-inject-expression-engines.md --phase plan`                                                      | Pass                     | The updated problem, evidence, scope, decisions, seven stable criteria, risks, manifest, and verification plan closed Plan before source edits.                                                                                              |
| First focused type and expression/kernel/declarative test run                                                                                          | Fail, corrected          | TypeScript passed; 71 of 72 tests passed. The old async-effect assertion expected only the inner message and did not account for the new structured engine error.                                                                            |
| First `npm run build:js` after the public export change                                                                                                | Expected API review stop | Vite built both formats. API Extractor produced the candidate report and correctly refused to replace the reviewed API file automatically.                                                                                                   |
| Second API candidate review                                                                                                                            | Corrected                | Removed one forgotten-export warning by expressing evaluator parameters through the already public `StarContext` rather than a private alias.                                                                                                |
| Final `npm run build:js`                                                                                                                               | Pass                     | ESM and UMD/CommonJS bundles built and API Extractor accepted the reviewed factory, installer signature, and six public types.                                                                                                               |
| `npx vitest run test/expression-engine.test.ts test/kernel.test.ts test/runtime-install.test.ts test/declarative.test.ts test/public-baseline.test.ts` | Pass, 77 tests           | The trusted matrix, caches, actions, async results, locations, unique ownership, installer selection, declarative errors, and exact public surface passed.                                                                                   |
| First `npm run quality:fast`                                                                                                                           | Fail, corrected          | Workflow, runner, format, and unit gates passed; spelling rejected an unrecognized term for promise-like values. The wording was replaced without a dictionary exception.                                                                    |
| Final Code-phase `npm run quality:fast`                                                                                                                | Pass                     | Run `2026-09-01T04-43-58-742Z-71883` passed ticket workflow, runner self-tests, formatting, unit tests, and the full fast static stack on one unchanged tree.                                                                                |
| Code-phase ticket validation                                                                                                                           | Pass                     | The exact fast report closed Code before the ticket moved to `testing`.                                                                                                                                                                      |
| First `npm run test:coverage`                                                                                                                          | Fail, corrected          | The changed-line gate found six unexecuted branches in nested errors, named-action failures, statement compilation, and repeat installation. No floor was changed.                                                                           |
| Focused gap tests plus final `npm run test:coverage`                                                                                                   | Pass                     | All changed executable lines/functions are covered. The 274-artifact census passed; `src/expression.ts` measures 99.07% lines and 94.62% branches overall.                                                                                   |
| First `npm run test:package:quality`                                                                                                                   | Fail, corrected          | The UMD artifact measured 393,344 bytes, 128 above its existing 393,216-byte ceiling. The budget was not raised.                                                                                                                             |
| Trusted-engine size repair                                                                                                                             | Pass                     | Simplified structural-location copying and used the public jQStar name in new engine errors. UMD measures 393,209 bytes, seven bytes below the unchanged ceiling.                                                                            |
| Final `npm run test:package:quality`                                                                                                                   | Pass, 13 checks          | The installed tarball passed ESM, CommonJS, QUnit, NodeNext, Bundler, public API, registry, Vite, and three-browser consumers with the new expression exports.                                                                               |
| First `npm run quality:delivery`                                                                                                                       | Fail, retained           | Run `2026-09-01T04-48-47-190Z-83346` passed nine gates. Ticket workflow needed an exact `Pass` fast-result cell, spelling found the same unrecognized term in the ledger, and two Firefox assertions still expected the former public brand. |
| Ticket validation and focused Firefox rerun                                                                                                            | Pass                     | Every changed ticket validates; the Select and Data Table cases pass 2/2 in desktop Firefox with exact jQStar expectations.                                                                                                                  |
| `npm run quality:static:delivery`                                                                                                                      | Pass, 28 checks          | Scope, types, lint, architecture, unused code, duplication, prose, security, dependency, shell, and workflow checks all pass.                                                                                                                |
| First-delivery release workspace inspection                                                                                                            | Pass                     | The release gate completed and the macOS temp root contained zero `jqstar-release-quality-*` directories afterward.                                                                                                                          |
| Second `npm run quality:delivery`                                                                                                                      | Fail, retained           | Run `2026-09-01T05-01-22-779Z-8414` passed 11 of 12 gates. Browser quality found one remaining no-JavaScript heading assertion that still expected the former public brand; all other browser projects and delivery gates passed.            |
| First focused no-JavaScript rerun                                                                                                                      | Fail, corrected          | The corrected name matched both the exact jQStar heading and the longer jqstar live-log heading. The assertion now requests the exact accessible name while retaining its negative control.                                                  |
| Final focused no-JavaScript rerun                                                                                                                      | Pass, 1 test             | The JavaScript-disabled project found the exact jQStar heading, opened the native disclosure, and retained the backend-form proof.                                                                                                           |
| Third `npm run quality:delivery`                                                                                                                       | Fail, retained           | Run `2026-09-01T05-11-57-005Z-30440` passed 11 of 12 gates, including browser and release quality. Only Prettier rejected the newly expanded ticket table; the release cleanup left zero owned temporary directories.                        |
| Final Test-phase `npm run quality:delivery`                                                                                                            | Pass                     | Run `2026-09-01T05-21-09-202Z-52312` passed all 12 enforced gates on one unchanged tree: workflow, runner, formatting, unit, coverage, property, static, self-hosted, package, release, browser, and detector self-test.                     |
| Test-phase ticket validation                                                                                                                           | Pass                     | The validator accepted the immutable delivery report authorized by the current receipt; the macOS temp root contained zero `jqstar-release-quality-*` directories afterward.                                                                 |

### Inspection ledger

| Finding                                                                                                      | Resolution                                                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Tickets 0005 and 0006 had already moved compiler calls behind the kernel capability.                         | Preserved that implementation and limited ticket 0007 to the missing public contract, selection, errors, lifecycle, conformance, and documentation.                           |
| Wrapping asynchronous failures changed an old test from the inner error message to the engine error message. | Kept the stronger behavior and asserted phase, attribute, expression, error name, and retained message intent through the existing `jquery-star:error` event.                 |
| The first public evaluator aliases leaked a private `Context` name into API Extractor.                       | Declared evaluator parameters directly with exported `StarContext`, `StateRecord`, and `ComputedRecord` types; the accepted API report has no forgotten-export warning.       |
| The 0.1 root auto-installs before a consumer can select another engine for the ambient document.             | Documented the limitation explicitly. Ticket 0013 owns the side-effect-free `core` entry; this ticket publishes and tests the installer seam without adding an early subpath. |
| Six new error and repeat-install branches were absent from the first changed-line coverage report.           | Added direct compile, nested action-argument, and repeat-install controls. The rerun covers every changed executable line without lowering a threshold.                       |
| The first complete bundle crossed the immutable UMD ceiling by 128 bytes.                                    | Removed verbose location normalization and shortened only new engine errors to the public jQStar name. The exact artifact is now seven bytes below the original ceiling.      |
| Two Firefox component assertions still expected “jQuery Star” after the lab fixtures moved to jQStar.        | Updated the test title and exact Select/Data Table expectations to the decided public brand. Product markup was already correct.                                              |
| The no-JavaScript browser contract retained one additional “jQuery Star” heading assertion.                  | Updated it to the exact jQStar accessible name because substring matching also selected the jqstar live-log heading. Native disclosure behavior remains unchanged.            |

## Document

### Documentation changed

- `README.md` documents the trusted factory, installer injection, root-entry limitation, cache
  clearing, `unsafe-eval` requirement, and trusted-markup boundary.
- `docs/ARCHITECTURE.md` records kernel-selected expression ownership, the four-method engine
  contract, structural source locations, structured failures, and the CSP threat boundary.
- `docs/RUNTIME_OWNERSHIP.md` assigns each engine to one kernel and documents disposal of caches and
  retained evaluators.
- `docs/TESTING.md` defines the shared expression-engine conformance matrix and its ownership,
  package, and browser-quality proof.
- `docs/PROJECT.md` adds the public factory, installer seam, structured failures, and future
  side-effect-free core dependency to the project capability map.
- `quality/public-baseline.json` and `etc/jquery-star.api.md` record the reviewed public value and
  type exports.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                  | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `src/runtime.ts` and `src/declarative.ts` receive `ApplicationCapabilities.expressions` from `src/kernel.ts`; neither application imports the trusted factory or concrete compiler.                                       | Pass   |
| AC-02 | `installStar` accepts `expressionEngine`; the kernel `WeakSet` rejects reuse, while kernel, runtime-install, and compatibility tests prove cache and owner isolation.                                                     | Pass   |
| AC-03 | The trusted engine runs the shared matrix plus focused action, nested-error, async, declarative, public-baseline, and installed-package tests without changing the ticket-0003 contract.                                  | Pass   |
| AC-04 | Expression, kernel, and runtime-install tests prove owner-local cache clearing, idempotent disposal, retained-evaluator invalidation, later-compilation failure, and survival of an independent engine.                   | Pass   |
| AC-05 | `StarExpressionError` and declarative tests cover compile and evaluate phases, source, authored attribute, line, column, synchronous throws, rejected asynchronous results, and retained readable intent.                 | Pass   |
| AC-06 | `test/expression-engine-conformance.ts` defines five reusable cases covering values, statements, signals, contexts, named actions, jQuery, asynchronous results, and location-aware failures.                             | Pass   |
| AC-07 | README and architecture documentation explicitly distinguish the trusted engine's `unsafe-eval` need from future dynamic-code-free CSP support and require trusted markup for both because application authority remains. | Pass   |

### Completion audit

The changed-file ledger matches the implemented expression-engine seam. Focused tests, changed-line
coverage, installed-package consumers, API review, static analysis, self-hosting, all browser
projects, release reproducibility, and the ticket workflow pass. The final release-quality run left
zero owned temporary workspaces. Public and project-brain documentation describe the shipped
factory, ownership, lifecycle, failure, conformance, and security contracts, including the known 0.1
root-entry limitation owned by ticket 0013.

Status: Complete

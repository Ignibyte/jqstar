---
id: 0054
title: Adopt browser-first component verification
status: done
created: 2026-09-23
updated: 2026-09-23
---

# 0054: Adopt browser-first component verification

## Plan

### Problem

The quality program runs every Vitest test in the fast and delivery gates and requires 100% coverage
of changed executable lines and functions. This has driven tests toward implementation branches
instead of observable component behavior. The user now wants browser component checks to be the
primary UI proof and wants mutation testing left out of the active workflow.

### Current evidence

The latest complete delivery report `2026-09-24T02-21-51-421Z-81002/report.json` passed 5,059 unit
tests and all 1,717 browser cases across eight projects, including 563 per desktop engine. Coverage
alone failed 54 changed-code checks in 34 files despite that browser result. The existing
`e2e/components.spec.ts` selects 76 Chromium tests spanning the component families, native forms,
keyboard behavior, server updates and accessibility. The full browser runner supplies cross-engine,
responsive, reduced-motion, forced-color and JavaScript-disabled evidence. Ticket 0048 already
removed mutation tooling and automatic gates; ticket 0053 defers any future audit until explicit
authorization.

### Scope

- Make the 76-case component browser suite an enforced fast gate with a machine-readable count,
  failure, skip and retry result. Keep the complete eight-project browser quality gate enforced in
  delivery and its repeated variant in full audit.
- Remove the mandatory all-Vitest, repeated-unit and V8 coverage gates from fast, delivery and full
  audit. Keep focused direct tests available for parsers, protocol, package, release, security and
  other contracts that browser component checks cannot observe reliably. Keep property, static,
  installed-package, self-hosted, release and detector gates.
- Retain coverage collection as an optional diagnostic, with no 100% changed-line/function or
  aggregate percentage requirement for delivery. Historical coverage reports and ticket 0043 stay
  intact as records of the former policy.
- Keep mutation testing absent from automatic commands, dependencies and gates. Ticket 0053 remains
  planned and requires future explicit authorization.

### Out of scope

This change does not delete existing direct tests, reduce the full browser project roster, change
public runtime behavior, raise package budgets, or claim the unfinished program audit is complete.
The package source-map experiment from the preceding turn is set aside, not part of this ticket.

### Acceptance criteria

- [x] [AC-01] Fast mode enforces a nonempty Chromium component browser suite that passes without
      retries and records its exact selected/executed counts and artifacts.
- [x] [AC-02] Delivery keeps the full eight-project browser gate, while full audit keeps repeated
      cross-engine browser evidence; neither requires all-unit or coverage scores.
- [x] [AC-03] Optional direct and coverage commands remain available, and coverage diagnostics do
      not impose a 100% changed-code or percentage delivery target.
- [x] [AC-04] Package, property, static, self-hosted, release, ticket and detector contracts remain
      enforced; failure, empty selection, skip, retry and stale evidence controls stay red.
- [x] [AC-05] No mutation tool or automatic mutation gate is introduced; future mutation testing
      remains deferred behind ticket 0053's explicit authorization.
- [x] [AC-06] Public and brain testing guidance, the release gate roster and program-audit ledger
      describe the new policy, with current fast and passing delivery evidence.

### Design

Add a bounded browser-component runner around the existing `components.spec.ts` Playwright suite. It
must list before execution, reject fewer than the current 76 cases, record exact JSON execution
counts, reject failure, retry and skip, and publish a report bound to the quality run. Fast runs it
in desktop Chromium; delivery also runs the existing complete browser-quality matrix. Remove the
unit and coverage gates from the canonical mode rosters, while retaining their standalone commands
for targeted investigation. Turn the standalone coverage command into diagnostics rather than a
delivery pass/fail score. Update gate contracts and their independent negative controls together.

### Decisions

- Browser checks own UI acceptance because they exercise native HTML, focus, form submission,
  keyboard interactions, server patches and accessibility in actual engines.
- Direct tests are retained where the browser cannot efficiently prove a contract, but they are
  selected by the change's risk rather than by a percentage target.
- Mutation testing remains deferred under the already completed 0048 decision and planned 0053.

### Risks

A Chromium fast check cannot prove cross-engine behavior; the full delivery browser matrix remains
mandatory. Removing broad unit enforcement can miss hidden state bugs; targeted direct tests stay
available and package/property/security checks remain required for their own boundaries. A browser
runner must fail closed on an empty or incomplete selection and must clean up child processes.

### Verification plan

Validate this Plan before gate edits. Exercise the component runner with a real selected suite and
negative empty/failure evidence, then run quality-runner and release-contract tests, focused
TypeScript/ESLint/format and the fast gate. Run complete `npm run check` and record remaining
non-testing blockers without restoring a coverage score or mutation gate. Validate Code and Test
phases against matching reports, and inspect the final gate roster and documentation.

### Planned files

- `quality/gates.mjs`, `quality/release-contract.json`, `package.json`: Canonical browser-first gate
  roster and commands.
- `scripts/quality-component-browser.mjs`, its report schema and focused process tests: Fail-closed
  browser component evidence.
- `scripts/quality/run-coverage.mjs`, `scripts/quality/coverage-report.mjs`, related schema and
  direct evaluator tests: Optional diagnostics without percentage enforcement.
- `test/quality-runner.test.mjs` and release/program audit contract tests: Update exact gate
  expectations and negative controls.
- `docs/LIBRARY_EXPANSION_PLAN.md`, `docs/QUALITY_PROGRAM.md`, `docs/TESTING.md`,
  `docs/DEVELOPMENT.md`, `docs/PROGRAM_AUDIT.md`, `docs/tickets/ROADMAP.md`, ticket 0033, and this
  ticket: Public and brain policy and evidence.

## Code

### Changed-file ledger

| File                                                                                                                                                            | Purpose                                                                                                 |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`; `scripts/quality-component-browser.mjs`; `scripts/quality/component-browser-report.mjs`; `schema/browser-components-report.schema.json` | Isolated Chromium component selection and fail-closed execution evidence.                               |
| `quality/gates.mjs`; `quality/release-contract.json`; `schema/release-contract.schema.json`; `package.json`                                                     | Browser-first canonical gates and matching release roster.                                              |
| `scripts/quality/coverage-report.mjs`; `scripts/quality/run-coverage.mjs`; `schema/coverage-report.schema.json`                                                 | Optional coverage diagnostic mode without score enforcement.                                            |
| `vitest.config.ts`; `vitest.coverage.config.ts`                                                                                                                 | Keep Node-runner detector tests out of broad Vitest discovery.                                          |
| `test/quality-runner.test.mjs`; `test/component-browser-report.test.mjs`; `test/coverage-diagnostic.test.mjs`                                                   | Exact roster and browser/coverage negative controls.                                                    |
| `docs/QUALITY_PROGRAM.md`; `docs/TESTING.md`; `docs/DEVELOPMENT.md`; `docs/PROGRAM_AUDIT.md`; `docs/tickets/ROADMAP.md`; this ticket                            | Current policy, commands and dated evidence.                                                            |
| `docs/LIBRARY_EXPANSION_PLAN.md`; `docs/tickets/0033-audit-full-library-program.md`                                                                             | Replace the program's mandatory coverage target and mark the older umbrella audit policy as historical. |

### Design changes

`JQS_COMPONENT_FAST=1` limits the Playwright config to the Component Lab spec, desktop Chromium and
the Vite demo/proof-backend server. The runner lists the suite, checks the 76-case floor, checks
Chromium availability, executes the selected suite, compares exact Playwright JSON counts, and
publishes a run-bound schema-validated report. The canonical modes retain property, static, package,
release, self-hosted and detector gates while omitting all-unit and coverage score gates. The
optional coverage command records threshold and changed-code misses without treating those scores as
a failure. Its strict evaluator remains available to historical detector tests.

The full audit uses its repeated cross-engine browser matrix without an extra duplicate one-pass
matrix. The new browser and coverage detector controls run with the quality-runner self-test.

## Test

| Command                                                                                                                                           | Result                                                     | Evidence                                                                                                                                    |
| ------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test test/quality-runner.test.mjs test/ticket-workflow.test.mjs test/component-browser-report.test.mjs test/coverage-diagnostic.test.mjs` | Pass, 38 cases.                                            | Runner, ticket, browser count and diagnostic negative controls.                                                                             |
| `vitest run test/release-candidate-contract.test.mjs test/program-audit-coverage.test.mjs --config vitest.config.ts`                              | Pass, 65 cases.                                            | Exact release roster and independent strict coverage contract.                                                                              |
| `npm run typecheck`                                                                                                                               | Pass.                                                      | Runtime and registry TypeScript projects.                                                                                                   |
| `npm run test:browser:components`                                                                                                                 | Pass, 76 cases.                                            | `.git/jqstar/standalone/components/browser-components-report.json` before the deliberate empty-selection probe.                             |
| `JQS_QUALITY_SABOTAGE=empty-selection npm run test:browser:components`                                                                            | Expected fail, zero selected.                              | Runner rejects the empty suite before execution.                                                                                            |
| `npm run test:coverage`                                                                                                                           | Pass, 5,059 direct cases; 54 changed-code misses reported. | `test-results/quality/coverage-gate.json` has mode `diagnostic`, status `pass`, and `changed.status: fail`.                                 |
| `npm run quality:fast`                                                                                                                            | Pass                                                       | Six gates and 76 browser cases; the final documented-tree report is in `.git/jqstar/latest-report.json`.                                    |
| `npm run check`                                                                                                                                   | Fail, 10 of 12 gates pass.                                 | `2026-09-24T03-29-18-780Z-17137/report.json`: all 1,717 browser cases pass; package size and package-budget isolation fail.                 |
| `npm run check` (`quality:delivery`, package correction)                                                                                          | Pass                                                       | `2026-09-24T05-25-23-228Z-18075/report.json`: all 12 gates, 76 component cases and 1,717 eight-project browser cases pass; receipt written. |

### Inspection ledger

| Finding                                                                                | Resolution                                                                                       |
| -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Vitest collected the new Node-runner detector files and failed them as empty suites.   | Exclude them from both broad Vitest configurations and run them in the quality-runner self-test. |
| A new strict evaluator field contradicted independent historical audit fixtures.       | Emit `diagnostic: true` only for the optional mode; preserve strict report shape.                |
| Full audit had a duplicate one-pass browser matrix alongside the repeated matrix.      | Retain only the repeated full browser matrix in full audit.                                      |
| Current quality guidance still described coverage floors and broad Vitest as enforced. | Clarify that coverage is optional diagnostic evidence and browser execution owns UI acceptance.  |

## Document

### Documentation changed

`docs/LIBRARY_EXPANSION_PLAN.md`, `docs/QUALITY_PROGRAM.md`, `docs/TESTING.md`,
`docs/DEVELOPMENT.md`, `docs/PROGRAM_AUDIT.md`, `docs/tickets/ROADMAP.md` and umbrella ticket 0033
describe browser-first acceptance, optional direct/coverage diagnostics and deferred mutation
testing. The release contract names the exact new gate roster.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                               | Result |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | Fast browser-components report: 76 selected/executed/passed, zero failed/flaky/skipped; empty-selection control fails.                                                                 | Pass   |
| AC-02 | Delivery browser report: 1,717 of 1,717 pass across eight projects; full-audit roster retains browser-repeated-audit.                                                                  | Pass   |
| AC-03 | Standalone diagnostic: 5,059 direct tests pass and 54 changed-code misses remain visible without failing the score.                                                                    | Pass   |
| AC-04 | Green delivery report retains package, property, static, self-hosted, release, ticket and detector gates; the 16-control suite proves package-budget sabotage remains red.             | Pass   |
| AC-05 | Package scripts, dependency tree and gate roster contain no mutation tool or command; tickets 0048 and 0053 retain the deferred decision.                                              | Pass   |
| AC-06 | Public and brain documents, release roster and program-audit ledger describe browser-first policy; delivery `2026-09-24T05-25-23-228Z-18075` passes all 12 gates and writes a receipt. | Pass   |

### Completion audit

The active quality modes enforce browser component behavior without broad unit or coverage scores.
The final gate roster excludes mutation testing, retains property, package, release and detector
contracts, and passes a full delivery run with an exact-tree receipt. Ticket 0055 owns the separate
package-size correction. The ticket is complete after final documented-tree delivery verification.

Status: Complete

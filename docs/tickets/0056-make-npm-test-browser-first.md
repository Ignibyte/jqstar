---
id: 0056
title: Make npm test use browser component checks
status: done
created: 2026-09-24
updated: 2026-09-24
---

# 0056: Make npm test use browser component checks

## Plan

### Problem

Ticket 0054 made browser component checks the required fast UI proof and removed the broad Vitest
and coverage score gates. The contributor-facing `npm test` script still aliases `test:unit`, and
the README lists it as the default verification command. Running that command therefore launches the
old broad suite instead of the browser-first check.

### Current evidence

Final documented-tree delivery `2026-09-24T05-59-10-276Z-69115/report.json` passes all 12 gates,
including 76 fast Component Lab cases and 1,717 cases across eight browser projects, with an exact
receipt. `package.json` still defines `"test": "npm run test:unit"`; `test:unit` itself remains a
useful optional direct command. README's Verification block recommends `npm test` without
distinguishing these behaviors.

### Scope

- Point `npm test` at the enforced browser-component command.
- Keep `test:unit` and `test:coverage` available as optional direct diagnostics, and keep mutation
  testing deferred.
- Update contributor instructions so the default and optional commands are clear.

### Out of scope

This ticket does not remove existing direct tests, change browser selection or counts, alter any
quality gate, or add mutation tooling.

### Acceptance criteria

- [x] [AC-01] `npm test` selects and passes the same 76 Chromium Component Lab cases as
      `test:browser:components`, with no retries or skips.
- [x] [AC-02] `test:unit` and coverage remain optional; fast, delivery and full-audit rosters stay
      browser-first, and no mutation gate is added.
- [x] [AC-03] README and development/testing guidance describe the actual default and optional
      commands without claiming that a browser suite proves unrelated parser or package contracts.
- [x] [AC-04] The final documented tree passes `npm run check` with a current receipt.

### Design

Change only the package script alias for `test`. Keep the canonical browser runner and its
fail-closed report unchanged. Replace README's generic test-suite claim with the browser component
proof and point specialized contracts to focused commands and the full delivery gate. Add the
default command to the development command table and testing strategy.

### Decisions

- `npm test` is the everyday browser component check; `test:unit` remains an explicit choice for a
  focused direct investigation.
- The full delivery gate continues to own cross-engine, package, release and detector proof.

### Risks

Consumers or contributors who used `npm test` to invoke all Vitest tests will see a different
command. The explicit `test:unit` script remains available, and the documentation names it. The
alias changes verification commands only; it does not change shipped code, access control, browser
selection, or accessibility behavior.

### Verification plan

Validate this Plan before edits. Run `npm test` and inspect its selected/executed counts. Confirm
the optional command names and exact quality rosters, run `npm run quality:fast`, then
`npm run check` on the implementation and final documented trees. Validate Code, Test and Document
phases with their matching evidence.

### Planned files

- `package.json`: Default test alias.
- `README.md`, `docs/DEVELOPMENT.md`, `docs/TESTING.md`, `docs/tickets/ROADMAP.md`, this ticket:
  Contributor-facing policy and evidence.

## Code

### Changed-file ledger

| File                                               | Purpose                                                                      |
| -------------------------------------------------- | ---------------------------------------------------------------------------- |
| `package.json`                                     | Make the default test command run the required browser component suite.      |
| `README.md`                                        | Explain default, optional diagnostics, full delivery, and mutation deferral. |
| `docs/DEVELOPMENT.md`                              | Put `npm test` in the command table and mark direct Vitest optional.         |
| `docs/TESTING.md`                                  | Name `npm test` as the fast browser command.                                 |
| `docs/tickets/ROADMAP.md`                          | Track this follow-up to browser-first verification.                          |
| `docs/tickets/0056-make-npm-test-browser-first.md` | Record the decision and phase evidence.                                      |

### Design changes

The `test` alias now invokes `test:browser:components`. The canonical runner and all quality rosters
remain unchanged. Direct Vitest and coverage commands remain available.

## Test

| Command                        | Result               | Evidence                                                                                                                                                                                                                                           |
| ------------------------------ | -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm test`                     | Pass                 | Standalone report `.git/jqstar/standalone/components/browser-components-report.json`: 76 selected/executed/passed, zero failed/flaky/skipped.                                                                                                      |
| `npm run quality:fast`         | Pass                 | `2026-09-24T06-34-35-778Z-21260/report.json`: all six required gates pass.                                                                                                                                                                         |
| `ticket:validate --phase code` | Pass                 | Same fast report validates the changed-file ledger and Code phase.                                                                                                                                                                                 |
| `npm run check`                | Pass                 | `2026-09-24T06-37-20-956Z-30143/report.json`: all 12 gates pass with matching 944-file fingerprints and a receipt; browser matrix 1,717/1,717 across eight projects with zero failed/flaky/skipped; package 13/13, release 7/7, detector 16/16.    |
| `npm run quality:delivery`     | Pass                 | Via `npm run check`, `2026-09-24T07-10-52-807Z-82457/report.json`: all 12 gates and the matching receipt pass after the Test ledger update.                                                                                                        |
| `ticket:validate --phase test` | Fail, then corrected | Initial report became stale when its results were added to this ticket. A second exact-tree `npm run check` passed all 12 gates at `2026-09-24T07-10-52-807Z-82457/report.json`; Test validation passed against its receipt before Document edits. |

### Inspection ledger

| Finding                                                   | Resolution                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Default command still pointed at broad Vitest.            | The alias now runs `test:browser:components`; direct Vitest remains at `test:unit`.                          |
| `resource-mutations` appears in a release exclusion list. | It names an optional product resource stage, not mutation testing; quality rosters contain no mutation gate. |

## Document

### Documentation changed

`README.md` now distinguishes the 76-case browser default from optional direct Vitest and coverage
diagnostics, and names the full delivery command and mutation deferral. `docs/DEVELOPMENT.md` lists
`npm test` as the everyday check and marks `test:unit` optional. `docs/TESTING.md` records the
default command and counted browser evidence. `docs/tickets/ROADMAP.md` includes this follow-up.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                               | Result |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `package.json` aliases `test` to `test:browser:components`; standalone component report has 76 selected, executed and passed, with zero failed/flaky/skipped.                          | Pass   |
| AC-02 | `package.json` keeps `test:unit` and `test:coverage`; `quality/gates.mjs` and `quality/release-contract.json` keep browser-first rosters without a mutation-testing gate.              | Pass   |
| AC-03 | `README.md`, `docs/DEVELOPMENT.md`, and `docs/TESTING.md` distinguish the browser default from specialized direct and delivery checks.                                                 | Pass   |
| AC-04 | Final documented-tree `npm run check` must pass all 12 gates and leave `.git/jqstar/quality-receipt.json` bound to `.git/jqstar/latest-report.json`; verify immediately after the run. | Pass   |

### Completion audit

The default script, optional commands, exact gate rosters, public guidance and standalone browser
report were inspected. Test phase validation passed against the second delivery receipt. The final
documented-tree delivery run and receipt verification complete the closure check.

Status: Complete

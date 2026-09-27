---
id: 0067
title: Make timed component proof deterministic
status: done
created: 2026-09-27
updated: 2026-09-27
---

# 0067: Make timed component proof deterministic

## Plan

### Problem

Hosted WebKit automation can take longer than the toast's 1,600-millisecond lifetime to establish
hover. One table case combines grouping and durable editing with independent column-layout
persistence and exceeds its unchanged 60-second test bound even while individual actions succeed.

### Current evidence

Hosted run `36295358245`, report `2026-09-27T04-52-05-121Z-17582`, records four CPUs and
16,766,414,848 memory bytes with three workers. All 11 non-matrix gates pass, including all 76
component cases. Chromium passes all 566 cases. WebKit records 52 passes, one failure, one flaky
case, and 512 skipped cases; later projects do not execute. The toast fails in all three attempts:
hover resolves the correct open toast, but it expires before pointer entry. The table case times out
after its successful actions accumulate; its retry passes in 55,467 milliseconds. Neither partial
execution nor a passing retry authorizes delivery. Ticket 0066's capacity hypothesis did not resolve
these fixture failures.

The table trace records successful click and drag operations taking 1.6–5.6 seconds, two reloads,
and no failing behavior assertion before the overall timeout. Its independent column-layout portion
can have its own complete scenario without removing grouped editing or conflict proof.

The invalid-storage reload starts from default HTML, so checking its order before entry evaluation
could pass without proving initialized recovery. Both reloads must await the same declared entry
used by initial setup before inspecting the column state.

The [Playwright clock guide](https://playwright.dev/docs/clock) requires installing the clock before
page timers are created, then allows pausing and explicitly advancing timers. Use a test option to
install it before navigation only for the toast scenario. Retain real native pointer and keyboard
actions and the actual application timer implementation.

### Scope

Split column-layout persistence into a separate case while retaining every existing assertion and
the grouped-editing chain. Control the toast's browser clock before navigation, pause after module
evaluation, and explicitly advance 1,800 milliseconds while hovered and after pointer exit. Retain
F8, native focus, Escape, pointer swipe, and natural expiry proof. Keep three workers and all
bounds.

### Out of scope

Runtime or product changes, security remediation, timer-duration or test-bound increases, sleeps,
forced pointer actions, reduced coverage, retry changes, runner changes, sharding, pins, budgets,
publication, deployment, and branch-protection changes.

### Acceptance criteria

- [x] [AC-01] Column-layout persistence and invalid-storage recovery have an independent scenario;
      grouping, sorting, conflict recovery, focus, and durable editing keep their existing chain.
      Every original assertion remains, and coverage increases to 77 component and 1,729 matrix
      cases.
- [x] [AC-02] Only the toast scenario installs its clock before navigation and pauses after entry
      evaluation. Real keyboard/pointer actions prove pause, resume, expiry, and swipe without
      changing its 1,600-millisecond duration or the configured test bounds.
- [x] [AC-03] Focused repetitions across three desktop engines pass with three workers and retries
      disabled. Fast and complete delivery pass with all selected cases and no flakes or skips.
- [x] [AC-04] Quality guidance, brain, roadmap, and ticket retain the hosted failure and explain
      deterministic timing and independent scenarios. Final documented-tree receipts precede commit;
      complete hosted checks and the pending security scope decision remain merge conditions.

### Design

Define a boolean test option defaulting to false. In the existing beforeEach, install the clock
before navigation when that option is enabled, await the existing declared entry, then pause at a
fixed later time. Enable it only in the toast describe block. Replace the wall-clock pause wait with
clock advancement, assert paused state after hover, assert resumed state after leaving, and advance
past the same duration to prove expiry. Keep all F8/focus/Escape/swipe assertions.

End the grouped-editing case after the successful durable save. Move the following column reorder,
pin, reload persistence, and invalid-storage recovery assertions into a fresh case with its own
root. Preserve the actual drag operation and exact order/pin checks. No deadline, retry, project,
worker, fixture application, or assertion is removed. Extract the existing declared-entry wait into
a test helper and use it after both column reloads.

### Decisions

- Control application time instead of requiring automation to beat a short notification lifetime.
- Install the clock before application timers exist, following the primary API contract.
- Separate independent table contracts while preserving the dependent grouped-editing chain.
- Retain failed hosted evidence and reject passing retries.

### Risks

Clock control could hide natural expiry unless explicitly advanced after pointer exit; include that
assertion. Restrict the option to the toast case so other integration tests retain real time. Table
separation adds navigation and therefore requires complete proof within existing project bounds.

### Verification plan

Validate Plan before implementation. Repeat both table scenarios, the facet scenario, and the toast
three times across Chromium, Firefox, and WebKit with three workers and retries disabled. Run
official Node 24 fast proof, validate Code against its exact report, then run complete delivery and
close Test with matching receipt before documentation edits. Map acceptance evidence, validate
Document, run final `npm run check`, verify receipt before/after staging, commit, push, and inspect
the complete hosted report.

### Planned files

- `e2e/components.spec.ts`: independent column-layout case and isolated controlled toast clock.
- `docs/QUALITY_PROGRAM.md`: explain retained failure, scenario separation, and timer proof.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link this fixture correction.
- This ticket: maintain phases, changed-file ledger, and acceptance evidence.

## Code

### Changed-file ledger

| File                      | Purpose                                                                                           |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| This ticket               | Record phases, failed evidence, and acceptance proof.                                             |
| `e2e/components.spec.ts`  | Separate column persistence, await initialized reloads, and control toast time before navigation. |
| `docs/QUALITY_PROGRAM.md` | Explain the retained hosted failure, exact timer proof, and increased case counts.                |
| `docs/README.md`          | Link the fixture correction from the brain.                                                       |
| `docs/tickets/ROADMAP.md` | Record the correction and its delivery conditions.                                                |

### Design changes

Plan validation passed before implementation. The controlled-clock option defaults to false and is
enabled only in the toast describe block. Installation precedes navigation, and pausing follows
declared entry evaluation. The test advances 1,800 milliseconds while paused by hover and after
pointer exit, with explicit paused/resumed state and unchanged duration checks. Column-layout
persistence has its own scenario; all original actions and assertions remain, including the grouped
editing/conflict chain. No runtime, configured deadline, worker, retry, pin, or budget changes. The
declared-entry wait is shared by initial setup and both column reloads, so initialized recovery is
checked rather than default markup alone.

## Test

| Command                                                                                                                   | Result | Evidence                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted delivery `36295358245`                                                                                             | Fail   | Report `2026-09-27T04-52-05-121Z-17582` retains all 11 passing non-matrix gates and rejected WebKit execution. Trace archives remain under `.git/jqstar/pr2-delivery-73c9eb1-evidence/`.                                                                                                                               |
| Three-worker facet, grouped-editing, column-layout, and toast tests; three desktop engines; `--repeat-each=3 --retries=0` | Pass   | All 36 final repetitions pass in 34.9 seconds without failures, flakes, or skips. Exact evidence: `.git/jqstar/ticket0067-focused-final/results.json`.                                                                                                                                                                 |
| Official Node 24 `JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast`   | Pass   | All six gates pass in `2026-09-27T05-46-06-044Z-8750`; matching Code validation passes before entering testing.                                                                                                                                                                                                        |
| Official Node 24 three-worker `npm run quality:delivery`                                                                  | Fail   | Report `2026-09-27T05-48-13-195Z-17986` passes all 11 behavior/proof gates, all 77 component cases, and all 1,729 matrix cases without failures, flakes, or skips. The ticket gate rejects the fast result recorded in prose instead of the required table; this ledger correction requires fresh exact-tree delivery. |
| Official Node 24 three-worker `npm run quality:delivery`                                                                  | Pass   | Report `2026-09-27T06-09-00-335Z-62804` passes all 12 gates, all 77 component cases, and all 1,729 matrix cases without failures, flakes, or skips. Matching Test-phase validation and receipt verification pass before documentation changes.                                                                         |

After adding both reload entry waits, the same focused command passes all 36 cases in 34.9 seconds
with zero unexpected, flaky, or skipped results. Its exact evidence is
`.git/jqstar/ticket0067-focused-final/results.json`.

Official Node 24
`JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast`
passes all six gates in `2026-09-27T05-46-06-044Z-8750`. Matching Code-phase validation passes
before advancing this ticket to testing.

The first fast run `2026-09-27T05-43-53-183Z-155` was interrupted before completion to strengthen
reload initialization proof. It could not close Code; the replacement exact-tree fast report above
closed that phase.

### Inspection ledger

| Finding                                                                      | Resolution                                                                            |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Automation does not establish hover before the short toast lifetime expires. | Control time while establishing real pointer state, then advance the unchanged timer. |
| Independent table contracts accumulate into one long scenario.               | Preserve every assertion and give column persistence its own bounded case.            |

## Document

### Documentation changed

`docs/QUALITY_PROGRAM.md` explains the failed three-worker hosted report, isolated controlled clock,
unchanged timer duration, preserved native actions, and independent column-layout scenario. The
brain and roadmap link the correction. Public runtime usage and backend contracts are unchanged.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                             | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | `e2e/components.spec.ts` retains every table assertion and the sorting/grouping/conflict/editing chain. A separate case retains drag, pin, exact order, reload persistence, and invalid-storage recovery, awaiting entry evaluation after both reloads. Full evidence selects 77 component and 1,729 matrix cases.                   | Pass   |
| AC-02 | The clock option defaults to false and is enabled only for toast timing. Installation precedes navigation, pausing follows entry evaluation, and real keyboard/pointer actions remain. Explicit paused/resumed state and 1,800-millisecond advances prove preservation and expiry at the unchanged 1,600-millisecond duration.       | Pass   |
| AC-03 | All 36 final focused repetitions pass in 34.9 seconds with three workers and retries disabled. Fast report `2026-09-27T05-46-06-044Z-8750` and complete delivery `2026-09-27T06-09-00-335Z-62804` pass, with matching Code/Test validation before advancing. No component or matrix case fails, flakes, or skips.                    | Pass   |
| AC-04 | Quality guidance, brain, and roadmap explain deterministic timing and separate scenarios, retaining failed hosted and ledger evidence. Final documented-tree `npm run check` and receipt verification before/after staging remain mandatory; complete hosted checks and the pending security scope decision remain merge conditions. | Pass   |

### Completion audit

Current-state inspection confirms only the toast scenario installs a clock, before navigation and
application timers. Native F8, focus, Escape, hover, pointer exit, and swipe remain. Explicit clock
advancement checks both paused survival and resumed expiry with the actual application timer and
unchanged duration. The table split preserves every original action and assertion, including its
dependent grouped-editing chain; both column reloads prove initialized persistence/recovery.
Coverage increases by one component case and three matrix cases. Runtime/page sources, workers,
configured deadlines, projects, repetitions, retries, failure policy, pins, and budgets are
unchanged. All criteria have direct evidence, and rejected hosted, interrupted, and ledger runs
remain recorded.

Run final `npm run check` for this documented tree and verify its receipt before and after staging
before commit. Keep the final report identifier in the PR body or `.git` evidence to preserve the
tested source fingerprint. Complete hosted checks and the separately requested security scope
decision remain merge conditions; this ticket claims neither hosted success nor security
remediation.

Status: Complete

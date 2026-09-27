---
id: 0071
title: Await native disclosure notifications
status: done
created: 2026-09-27
updated: 2026-09-27
---

# 0071: Await native disclosure notifications

## Plan

### Problem

The native disclosure fixture snapshots notification state after a fixed ten-millisecond timer.
Browser task scheduling does not make that timer a barrier for a native details toggle event.

### Current evidence

Hosted delivery `36317737425`, report `2026-09-27T12-06-55-696Z-17530`, passes all 11 non-matrix
gates and all 77 component cases. Firefox completes 592 cases with 591 first-attempt passes and one
rejected flake: accordion native defaults without adoption reports `pendingNotification: false`; its
three other assertions pass. Retry passes. Remaining projects do not execute because the runner
correctly rejects the flake. Final JSON, log, and trace remain under
`.git/jqstar/pr2-delivery-9abcab9-evidence/`.

`exerciseDisclosureDefaults` registers the notification counter before native `summary.click()`,
enhances the same root, and waits ten milliseconds before reading it. The accordion's second native
click uses the same timer assumption. The runtime synchronizes and emits notifications from its
actual native `toggle` listener. The trace does not record the individual counter or browser task
ordering; the event barrier removes this documented scheduling assumption without claiming a runtime
defect.

### Scope

Wait for the actual native toggle event at both existing disclosure completion points. Preserve
native clicks, enhancement before pending notification delivery, adoption, all four result fields,
cancellation, native link behavior, exclusion, and exact assertions. Retain rejected hosted proof.

### Out of scope

Runtime behavior, security remediation, other helpers, fixture hosts, structural workload, site
integration, case selection, workers, deadlines, retries, failure policy, pins, budgets,
publication, deployment, and protection changes.

### Acceptance criteria

- [x] [AC-01] Both native disclosure operations register a one-time native toggle listener before
      their click and await that event instead of a fixed timer. Existing native operations,
      immediate enhancement, result fields, and assertions remain.
- [x] [AC-02] All four disclosure defaults cases pass repeated proof across all three desktop
      engines with three workers and no retries. Fast and complete delivery preserve 77 component
      and 1,804 matrix cases without failures, flakes, or skips.
- [x] [AC-03] Quality guidance, brain, roadmap, and ticket retain the rejected hosted result and
      explain the native event barrier. Exact phase validations, final documented-tree check, and
      receipts precede commit. Hosted proof and the pending security decision remain merge
      conditions.

### Design

Create a promise attached to the first details element's one-time `toggle` event before its summary
click. Keep the immediate enhancement call, then await the promise before observing notification
state. For accordion exclusion, register the same event barrier on the second details element before
its final summary click. Keep real browser events and the existing outer test deadline. Missing
native delivery must fail instead of becoming a successful timed snapshot. Disposal and iframe
removal remain in the existing finally block.

### Decisions

- Await observable native completion, not elapsed time.
- Preserve all notification counts and state assertions so the barrier cannot hide a runtime
  failure.
- Limit changes to the helper identified by finalized hosted failure evidence.

### Risks

A listener registered after the click could miss delivery. Register before each native operation.
Native events may be coalesced; each awaited opening starts from the existing closed state. The
first listener runs after the runtime's already registered toggle handler. Complete proof still
requires the unchanged full matrix and rejects retry-pass flakes.

### Verification plan

Validate Plan before behavior edits. Run four native disclosure cases twenty times across the three
desktop engines with three workers and retries disabled. Inspect the exact helper diff and unchanged
spec, runtime, settings, and structural fixture. Run fast proof and exact Code validation before
recording the passing fast row and entering testing. Run complete delivery against main and exact
Test validation plus receipt before documentation edits. Complete the acceptance evidence and audit,
validate Document, run final `npm run check`, verify receipts before and after staging, commit,
push, and inspect hosted checks.

### Planned files

- `e2e/fixtures/ui-document-ownership.ts`: await both actual native disclosure toggle events.
- `docs/QUALITY_PROGRAM.md`: record the rejected flake and event completion contract.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the correction.
- This ticket: maintain scope, phase, changed-file, command, and acceptance evidence.

## Code

### Changed-file ledger

| File                                    | Purpose                                                                    |
| --------------------------------------- | -------------------------------------------------------------------------- |
| `e2e/fixtures/ui-document-ownership.ts` | Await actual native toggle delivery at both disclosure observation points. |
| `docs/QUALITY_PROGRAM.md`               | Record rejected hosted proof and native event completion.                  |
| `docs/README.md`                        | Link the native disclosure correction from the brain.                      |
| `docs/tickets/ROADMAP.md`               | Record the correction, preserved coverage, and merge conditions.           |
| This ticket                             | Record the plan and retained hosted failure before behavior changes.       |

### Design changes

Plan validation passes before behavior edits. Both listeners are registered before their native
clicks. Immediate enhancement, all result fields and assertions, native defaults, adoption, and
cleanup remain unchanged. No design changes.

## Test

| Command                                                                                                                 | Result | Evidence                                                                                                                                                                                                         |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted delivery `36317737425`                                                                                           | Fail   | Firefox completes 592 cases with one rejected native accordion notification flake. All 11 non-matrix gates and 77 component cases pass. Remaining projects do not execute.                                       |
| Native disclosure defaults, twenty repetitions across three desktop engines, `--workers=3 --retries=0`                  | Pass   | All 240 cases pass without failures, flakes, or skips. Evidence: `.git/jqstar/ticket0071-native/results.json`.                                                                                                   |
| Exact helper diff and source inspection                                                                                 | Pass   | Only two fixed timers become pre-click one-time native event barriers. Native operations, enhancement, result fields, all spec assertions, runtime, structural fixture, and proof settings are unchanged.        |
| Official Node 24 `JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast` | Pass   | All six gates pass in `2026-09-27T12-49-40-409Z-63992`. Exact Code validation passes before entering testing.                                                                                                    |
| Official Node 24 three-worker `npm run quality:delivery`                                                                | Pass   | All 12 gates, all 77 component cases, and all 1,804 matrix cases pass in `2026-09-27T12-51-36-950Z-72465` without failures, flakes, or skips. Exact Test validation and receipt pass before documentation edits. |

### Inspection ledger

| Finding                                                  | Resolution                                                            |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| Fixed timer does not establish native toggle completion. | Await actual native events before observing the unchanged assertions. |

## Document

### Documentation changed

Quality guidance records the rejected hosted Firefox flake and the native completion barrier. The
brain and roadmap link this correction. Runtime usage, backend contracts, package surfaces, and
production website behavior are unchanged.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                                   | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | `exerciseDisclosureDefaults` in `e2e/fixtures/ui-document-ownership.ts` registers both one-time native toggle listeners before clicking. The exact diff retains native operations, immediate enhancement, adoption, notification counts, result fields, and all spec assertions.                                                           | Pass   |
| AC-02 | All 240 focused cases pass across Chromium, Firefox, and WebKit with three workers and no retries. Fast report `2026-09-27T12-49-40-409Z-63992` passes all six gates. Delivery `2026-09-27T12-51-36-950Z-72465` passes all 12 gates, 77 component cases, and 1,804 matrix cases without failures, flakes, or skips.                        | Pass   |
| AC-03 | Quality guidance, brain, roadmap, and ticket retain the rejected hosted flake and describe actual native event completion. Exact Code and Test validation and Test receipt precede documentation. Final documented-tree check and staging receipts precede commit. Hosted proof and the pending security decision remain merge conditions. | Pass   |

### Completion audit

Both disclosure completion points await actual native events instead of a fixed elapsed delay.
Listeners are registered before clicking. The runtime's existing listener executes before the
fixture listener. Real browser default actions, immediate enhancement during a pending notification,
adoption, counts, cancellation, links, exclusion, and exact assertions remain. Missing native
delivery still fails under the existing outer test deadline.

All 240 repeated native cases and complete local delivery pass without failures, flakes, or skips.
Runtime sources, other helpers, structural workload, projects, workers, configured deadlines,
retries, failure policy, pins, and budgets are unchanged. Rejected hosted proof remains in the
ledger. The earlier separate hosted six-versus-four structural mutation difference remains
unresolved and is not attributed to this disclosure flake.

Run final `npm run check` for this documented tree and verify its receipt before and after staging
before commit. Keep the final report identifier in the PR body or `.git` evidence to preserve the
tested source fingerprint. Complete hosted checks and the separately requested security scope
decision remain merge conditions. This ticket claims neither hosted success nor security
remediation.

Status: Complete

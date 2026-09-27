---
id: 0063
title: Await project browser window completion
status: done
created: 2026-09-26
updated: 2026-09-26
---

# 0063: Await project browser window completion

## Plan

### Problem

Hosted Linux WebKit completes virtual project-window rendering after the two browser tests start
their five-second result assertions. The assertions race the pending SDK response rather than
observing a completed operation.

### Current evidence

Hosted delivery `36278064779`, report `2026-09-26T23-04-09-945Z-17498`, passes 11 of 12 gates.
WebKit fails the bounded-window and superseded-window cases in `e2e/components.spec.ts`. The
retained trace requests window 990 and later resolves its first row to `project-0866`; that locator
operation finishes after the assertion deadline. The cancellation trace requests the expected
replacement window 190 with HTTP 200. Network responses take 16–44 milliseconds, while rendering and
browser automation continue afterward. Local macOS delivery passes all 1,726 cases on the identical
committed source. No runtime failure has been demonstrated.

### Scope

Await the exact requested virtual-window response and disappearance of the existing loading
indicator before checking completed results in the two affected tests. Preserve the held older
response in the cancellation test until the newer response and cancellation assertions pass.

### Out of scope

Runtime changes, security remediation, timeout increases, retries, test selection changes, weaker
assertions, package budgets, branch protection, publication, and deployment.

### Acceptance criteria

- [x] [AC-01] The bounded-window test awaits HTTP completion for window 990 and its finished loading
      state, then retains changed-row, bounded-DOM, selection, and total-count assertions.
- [x] [AC-02] The superseded-window test awaits replacement window 190 and its finished loading
      state while keeping the older response held; exact range, cancellation, loading,
      late-response, and two-request assertions remain.
- [x] [AC-03] Focused three-engine repetitions, fast checks, and full delivery pass with unchanged
      timeouts, retries disabled for focused proof, and two workers.
- [x] [AC-04] Quality guidance and the project brain explain the operation-completion boundary; the
      final documented tree has a verified delivery receipt before commit.

### Design

Select the expected response by the existing project endpoint and decoded Datastar payload's virtual
mode and window start. Register that wait before scrolling. Assert the response is successful, then
use the loading indicator's existing `waitFor({ state: "hidden" })` before the unchanged result
assertions. This uses Playwright's existing operation and test bounds without adding sleeps or
adjusting any configured deadline. Await only the newer window in the cancellation test, so the
older response remains deliberately pending.

### Decisions

- Observe the actual request and loading completion instead of guessing a longer assertion delay.
- Keep full-page Lab tests; do not replace the live route with the ownership fixture.
- Preserve the hosted failure evidence and require hosted verification again after pushing.

### Risks

A response predicate could match the wrong operation; match endpoint, virtual mode, and exact window
start. Waiting for hidden loading before a request starts could return too soon; register the
response wait before scrolling and await that response first. Awaiting the held older response would
deadlock the cancellation proof; await only window 190 there.

### Verification plan

Validate Plan before test edits. Repeat both cases three times in Chromium, Firefox, and WebKit,
with two workers and retries zero. Run official Node 24 fast checks and validate Code, then run full
delivery against actual main before validating Test. Update documentation and acceptance evidence,
run final `npm run check`, verify the receipt, commit, push, and inspect hosted checks.

### Planned files

- `e2e/components.spec.ts`: observe matching response and completed loading before assertions.
- `docs/QUALITY_PROGRAM.md`: describe completed-operation assertions for virtual windows.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the corrective evidence.
- This ticket: retain failure, commands, acceptance proof, and completion audit.

## Code

### Changed-file ledger

| File                                        | Purpose                                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| This ticket                                 | Record the hosted failure, bounded design, commands, and acceptance evidence.                                            |
| `e2e/components.spec.ts`                    | Await exact successful window responses, completed bodies, and finished loading while preserving every result assertion. |
| `docs/QUALITY_PROGRAM.md`                   | Explain the completed-operation boundary and unchanged runtime, deadlines, retries, and selection.                       |
| `docs/README.md`, `docs/tickets/ROADMAP.md` | Link the correction and retain the hosted merge condition.                                                               |

### Design changes

The response predicate matches endpoint, virtual mode, and exact start. Both corrected tests verify
HTTP success and body completion before waiting for hidden loading. No deadlines or assertions
change; the cancellation test waits only for its newer window while the older response is held.

## Test

| Command                                                                                                        | Result | Evidence                                                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted delivery `36278064779`                                                                                  | Fail   | Two WebKit virtual-window assertions race completion; 11 other gates pass.                                                                                                                                           |
| Plan phase validation                                                                                          | Pass   | Complete bounded design validates before editing the tests.                                                                                                                                                          |
| Official Node 24 focused virtual-window proof, three repetitions per desktop engine, two workers, retries zero | Pass   | All 18 cases pass in 42 seconds. Matching responses, complete bodies, completed loading, bounded rows, selection, and cancellation assertions remain. Evidence: `.git/jqstar/ticket0063-focused/results.json`.       |
| Official Node 24 `quality:fast`, two workers and actual main baseline                                          | Pass   | Run `2026-09-26T23-38-13-971Z-71971` passes all six gates; matching Code validation passes before entering Test.                                                                                                     |
| Official Node 24 `quality:delivery`, two workers and actual main baseline                                      | Pass   | Run `2026-09-26T23-40-37-853Z-81254` passes all 12 gates and all 1,726 cases in eight browser projects, with no failures, flakes, or skips. The matching receipt and Test phase validate before documentation edits. |

### Inspection ledger

| Finding                                   | Resolution                                      |
| ----------------------------------------- | ----------------------------------------------- |
| Result assertions run during SDK loading. | Await the exact response and completed loading. |

## Document

### Documentation changed

`docs/QUALITY_PROGRAM.md` explains exact response matching, body completion, and finished loading
before result assertions. The brain and roadmap link this correction and retain hosted checks as a
separate merge condition. A final documented-tree receipt is required before commit and recorded in
PR 2, outside the source fingerprint.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                     | Result |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `e2e/components.spec.ts` matches virtual window 990, verifies its successful completed body, and awaits hidden loading before unchanged row, DOM bound, selection, and total assertions. All focused repetitions and complete browser delivery pass.                                                                         | Pass   |
| AC-02 | The cancellation case matches window 190 while the older response remains held, awaits completed loading, and retains exact range, aborted older request, hidden loading, late-response rejection, and two-request checks. Focused and complete delivery pass.                                                               | Pass   |
| AC-03 | All 18 focused repetitions pass with retries zero; all six fast gates and all 12 delivery gates pass under official Node 24.21.0 with two workers. All 1,726 cases pass without failures, flakes, or skips. Configured deadlines and retry policy remain unchanged.                                                          | Pass   |
| AC-04 | Quality guidance, the brain, and roadmap explain the completed-operation boundary. Test closure verifies the exact delivery receipt before documentation edits. Final documented-tree delivery and receipt verification remain mandatory before commit; its evidence is recorded in PR 2 without changing the tested source. | Pass   |

### Completion audit

The two virtual-window cases now await exact successful response bodies and finished loading before
checking completed results. The older response remains held during the newer-window and cancellation
proof. Every original result assertion remains, and no runtime, configured deadline, retry policy,
selection, or package budget changes. Three-engine focused repetitions and all delivery gates pass;
the full matrix has no failures, flakes, or skips. Documentation explains the boundary and links
this correction. Hosted failure history is retained. A fresh final documented-tree receipt must
validate before commit and is recorded outside this ticket in PR 2. Security remediation remains
pending the separate scope decision.

Status: Complete

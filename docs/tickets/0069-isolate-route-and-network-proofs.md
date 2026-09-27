---
id: 0069
title: Isolate route and network proofs
status: done
created: 2026-09-27
updated: 2026-09-27
---

# 0069: Isolate route and network proofs

## Plan

### Problem

Two site cases combine independent routes inside one 60-second deadline. Successful interactions
accumulate past that bound on hosted WebKit. An htmx baseline also follows an intentional connection
failure immediately with an independent swap-error request, conflating separate failure categories.

### Current evidence

Hosted run `36306394043`, report `2026-09-27T08-33-47-196Z-17531`, passes all 11 non-matrix gates,
all 77 component cases, and all 567 Chromium cases. WebKit records 173 passes, two failures, one
flake, and 391 skips. Its process exits with 1 after 785,904 milliseconds, within the unchanged
900,000-millisecond project bound; later projects do not execute. The documentation case times out
in all three attempts while visiting 22 routes. Its first trace reaches the Dialog route after
successful controls on earlier routes. The embedded Lab case completes both home and Components
actions, then times out navigating to the third route.

The htmx flake waits for `htmx:swapError` after the network-error proof successfully emits
`htmx:sendError`. The trace retains the intentional connection termination and an incomplete next
fragment request. A retry passes. This supports separating independent failures; it does not prove
an exact browser connection-reuse cause. Failed delivery and all partial results remain evidence
under `.git/jqstar/pr2-delivery-9b6be59-evidence/`.

### Scope

Parameterize the two failed site cases so each existing route has its own complete case. Preserve
all routes, actions, assertions, corpus, unique IDs, backend updates, widths, keyboard focus, and
page-error proof. Give each htmx version its own native network-failure case, preserving event order
and redaction and additionally requiring the browser's actual failed request. Keep the baseline's
OOB, no-swap, cancellation, response-error, swap-error, and target-error assertions.

### Out of scope

Product or runtime changes, security remediation, mocks, fixture or runtime alterations, other site
cases, sleeps, increased deadlines, retries, reduced coverage, runner or worker changes, sharding,
analyzer/Node pins, budgets, publication, deployment, and branch protection.

### Acceptance criteria

- [x] [AC-01] All 22 documentation routes retain their complete shared-control proof in individual
      cases, including theme, search, menu, Escape, focus restoration, and active navigation.
- [x] [AC-02] All three embedded Lab routes retain the full corpus, block count, unique IDs, native
      dialog, JSON/SDK/account/dashboard/profile actions, three widths, and page-error assertions in
      individual cases.
- [x] [AC-03] Both pinned htmx versions retain real network failure, ordered native host events, and
      redacted output in separate fresh test contexts. The original baseline retains every remaining
      assertion without following a deliberately terminated connection.
- [x] [AC-04] Three-worker focused repetitions pass across all desktop engines with retries
      disabled. Fast and full delivery pass without failures, flakes, or skips. Coverage increases
      from 567 to 592 desktop cases and from 1,729 to 1,804 matrix cases; component cases remain 77.
- [x] [AC-05] Quality guidance, brain, roadmap, and ticket retain rejected hosted evidence and
      explain case isolation. Final documented-tree receipts precede commit; complete hosted checks
      and the pending security scope decision remain merge conditions.

### Design

Move each route loop outside its existing test callback, retaining the body once and including the
route in the test title. Keep an explicit desktop viewport for each Lab case and all three width
checks. The page-error listener and corpus lookup remain local to each case. For htmx, move only its
network-error block into two version-specific tests. Register the browser `requestfailed` waiter
before the real click, require a failure description, then require the same ordered `beforeRequest`,
`afterRequest`, and `sendError` trace and its original redaction assertions.

### Decisions

- Bound each independent route rather than accumulating 22 or three routes in one deadline.
- Isolate deliberate network termination from unrelated swap-error observability.
- Preserve the real fixture response and every original assertion.
- Treat partial, flaky, skipped, and missing execution as failed delivery.

### Risks

Fresh contexts must preserve the meaning of route-local contracts. Theme toggling remains checked
against its actual initial value, and each Lab route begins from its own initial state. Extra cases
add context overhead, so complete hosted proof remains required within unchanged bounds. Network
failure must remain native and cannot be replaced by a mocked event or response.

### Verification plan

Validate Plan before edits. Repeat all changed site cases and the htmx baseline/network cases three
times across Chromium, Firefox, and WebKit with three workers and retries disabled. Run fast proof
and exact Code validation, record fast Pass in the Test table, then run complete delivery against
main. Validate Test and receipt before documentation edits. Map evidence, validate Document and
changed tickets, run final `npm run check`, verify receipt before/after staging, commit, push, and
inspect all hosted evidence. Preserve failures and keep security remediation outside this ticket.

### Planned files

- `e2e/site.spec.ts`: give existing documentation and Lab routes individual complete cases.
- `e2e/interoperability-baseline.spec.ts`: isolate native network failure for each pinned version.
- `docs/QUALITY_PROGRAM.md`: retain hosted failure and explain unchanged proof contracts.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the correction.
- This ticket: maintain phases, changed-file ledger, and acceptance evidence.

## Code

### Changed-file ledger

| File                                    | Purpose                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| This ticket                             | Retain rejected delivery, phases, proof, and acceptance evidence.                        |
| `e2e/site.spec.ts`                      | Give every existing documentation and embedded Lab route its own complete case.          |
| `e2e/interoperability-baseline.spec.ts` | Separate native connection failure by pinned version and require actual browser failure. |
| `docs/QUALITY_PROGRAM.md`               | Explain rejected hosted evidence and preserved route/error contracts.                    |
| `docs/README.md`                        | Link route and network proof from the brain.                                             |
| `docs/tickets/ROADMAP.md`               | Record complete route cases and isolated native failure proof.                           |

### Design changes

Plan validation passed before editing. Both site loops now declare individual cases while retaining
their complete assertion bodies. Each Lab case has an explicit desktop viewport. The native htmx
network-error block runs in two fresh version-specific cases; a waiter registered before clicking
also verifies the real failed request. All remaining baseline checks stay in place. No fixture,
product, runtime, proof setting, or budget changes.

## Test

| Command                                                                                                                 | Result | Evidence                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted delivery `36306394043`                                                                                           | Fail   | Report `2026-09-27T08-33-47-196Z-17531` retains site case timeouts, the htmx swap-error flake after native network failure, incomplete WebKit execution, and missing later projects.                                                  |
| Three-worker route and htmx proof across three desktop engines; `--repeat-each=3 --retries=0`                           | Pass   | All 252 repetitions pass in 80.6 seconds with no failures, flakes, or skips. Evidence: `.git/jqstar/ticket0069-focused/results.json`.                                                                                                 |
| Official Node 24 three-worker `npm run quality:fast`                                                                    | Fail   | Report `2026-09-27T09-30-59-464Z-95999` passes five gates, including all component cases. Spelling rejects one ticket word; ordinary wording corrects it before a fresh fast run.                                                     |
| Replacement fast run interrupted before completion                                                                      | Error  | Run `2026-09-27T09-33-31-172Z-5947` was stopped after the targeted spelling check showed the wrapped ticket word remained. It cannot close Code. The corrected ticket passes the targeted spelling check before the next fast run.    |
| Official Node 24 `JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast` | Pass   | All six gates pass in `2026-09-27T09-34-00-940Z-13033`. Exact Code validation passes before entering testing.                                                                                                                         |
| Official Node 24 three-worker `npm run quality:delivery`                                                                | Pass   | Report `2026-09-27T09-36-24-693Z-22385` passes all 12 gates, all 77 component cases, and all 1,804 matrix cases without failures, flakes, or skips. Exact Test validation and receipt verification pass before documentation changes. |

### Inspection ledger

| Finding                                                               | Resolution                                                             |
| --------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Independent routes accumulate within one scenario deadline.           | Give each existing route its own full case.                            |
| Intentional network failure precedes an unrelated swap-error request. | Isolate native network-failure proof in fresh cases for both versions. |

## Document

### Documentation changed

Quality guidance retains the rejected hosted run and explains individual complete route cases and
native network failure isolated from other error categories. The brain and roadmap link this
correction. Public runtime usage, fixture markup, host versions, and backend contracts are
unchanged.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                                                                                                         | Result |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `e2e/site.spec.ts` declares all 22 existing documentation routes as individual cases with the complete original theme, search, menu, Escape, focus, heading, and active-navigation assertions. All 198 focused route repetitions pass.                                                                                                                                                                           | Pass   |
| AC-02 | The same file declares three full Lab route cases, retaining all seven blocks, 109 corpus records, root coverage, unique IDs, native dialog focus, JSON/SDK/account/dashboard/profile actions, three widths, and page-error proof. All 27 focused Lab repetitions pass.                                                                                                                                          | Pass   |
| AC-03 | `e2e/interoperability-baseline.spec.ts` preserves real fixture connection termination for both pinned versions in fresh cases. A waiter registered before the real click requires actual native failure; the original event order and redaction remain. All 18 network and nine remaining-baseline repetitions pass without mocks or fixture changes.                                                            | Pass   |
| AC-04 | All 252 focused repetitions pass in 80.6 seconds with three workers and retries disabled. Fast report `2026-09-27T09-34-00-940Z-13033` and full delivery `2026-09-27T09-36-24-693Z-22385` pass with matching Code/Test validation. The matrix executes all 1,804 cases without failures, flakes, or skips; component cases remain 77. Workers, deadlines, retries, projects, pins, and budgets remain unchanged. | Pass   |
| AC-05 | Quality guidance, brain, roadmap, and this ticket retain rejected hosted, spelling, and interrupted evidence and explain case isolation. Final documented-tree `npm run check` and receipt verification before/after staging remain mandatory. Complete hosted checks and the pending security scope decision remain merge conditions.                                                                           | Pass   |

### Completion audit

Current-state inspection confirms every existing route and assertion remains in the two site proof
families. All 22 documentation routes have complete shared-control cases, and all three Lab routes
have complete corpus, native interaction, backend, responsive, and error checks. Each htmx version
proves actual native network failure in a fresh test context; the remaining baseline retains every
other error, mutation, cancellation, and redaction assertion. Coverage increases by 25 cases per
desktop engine, totaling 1,804 matrix cases; the component lane remains 77 cases.

All 252 focused repetitions and all 12 local delivery gates pass without failures, flakes, or skips.
Runtime and fixture sources, proof settings, analyzer/Node pins, and package ceilings are unchanged.
Every criterion has direct evidence. Failed hosted and fast runs and the interrupted replacement
remain recorded; successful partial results do not authorize delivery.

Run final `npm run check` for this documented tree and verify its receipt before and after staging
before commit. Keep its report identifier in the PR body or `.git` evidence to preserve the tested
source fingerprint. Complete hosted checks and the separately requested security scope decision
remain merge conditions; this ticket claims neither hosted success nor security remediation.

Status: Complete

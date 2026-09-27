---
id: 0068
title: Await ownership fixture entry
status: done
created: 2026-09-27
updated: 2026-09-27
---

# 0068: Await ownership fixture entry

## Plan

### Problem

The ownership benchmark waits for global network inactivity before measuring a dev-served fixture.
That condition can remain unsatisfied even after the page loads. The benchmark needs initialized
application ownership, which has a direct entry-module and runtime update contract.

### Current evidence

Hosted run `36301323651`, report `2026-09-27T06-54-30-539Z-17609`, passes all 11 non-matrix gates,
including all 77 component cases, and all 567 Chromium cases. Firefox passes 247 cases, then fails
the ownership benchmark in all three attempts at `page.waitForLoadState("networkidle")`. Each
attempt exceeds the unchanged 60-second bound. Its 319 remaining cases skip, and later projects do
not execute. This is failed delivery; the successful partial results cannot authorize merge.

The trace contains a long-lived Vite dev connection and no application API request. That supports
removing dependence on unrelated transport inactivity; it does not prove a particular browser
network-accounting cause. The frozen fixture declares `script[type="module"][src="/main.ts"]`. The
[Playwright readiness contract](https://playwright.dev/docs/api/class-page#page-wait-for-load-state)
discourages network inactivity and recommends checking actual readiness.

### Scope

Await the fixture's own declared entry evaluation and the existing `jquery.star.nextUpdate()`
barrier before taking the baseline snapshot. Preserve the frozen HTML, metrics instrumentation,
mount/enhance/destroy/remount flow, native dialog proof, case counts, and every budget/assertion.

### Out of scope

Runtime or product changes, security remediation, fixture HTML changes, disabled dev transport, new
readiness hooks, sleeps, increased deadlines, retries, reduced coverage, runner or worker changes,
sharding, analyzer pins, budgets, publication, deployment, and branch protection.

### Acceptance criteria

- [x] [AC-01] Ownership setup awaits its declared entry and runtime update barrier before baseline
      measurement, failing clearly if the expected script is absent, without global network
      idleness.
- [x] [AC-02] The frozen fixture, instrumentation, scenarios, assertions, exact budgets, workers,
      deadlines, retries, projects, and case counts remain unchanged.
- [x] [AC-03] Focused ownership repetitions pass in all three desktop engines with three workers and
      retries disabled. Fast and complete delivery pass without failures, flakes, or skips.
- [x] [AC-04] Quality guidance, brain, roadmap, and ticket retain the hosted failure and explain
      actual readiness. Final documented-tree receipts precede commit; complete hosted checks and
      the pending security scope decision remain merge conditions.

### Design

Remove the `networkidle` wait. At the start of the existing measurement evaluation, find the
fixture's exact declared module script, fail if absent, and await importing its resolved URL. The
module loader reuses the existing evaluation. Keep the existing runtime import/install, then await
`jquery.star.nextUpdate()` before the baseline. No source, DOM, or budget is altered to make the
measurement pass; counters still reset at the same measurement boundary.

### Decisions

- Wait for initialized ownership rather than transport inactivity.
- Reuse the fixture's entry and public update barrier instead of a new product hook.
- Keep every existing structural and disposal assertion and reject passing retries.

### Risks

An incomplete startup wait could contaminate the measured deltas; await both module evaluation and
the runtime update barrier. Extra startup queries precede baseline/reset and must not change the
measured ceilings. Full delivery remains required on the exact tree.

### Verification plan

Validate Plan before editing. Repeat ownership proof three times in Chromium, Firefox, and WebKit
with three workers and retries disabled. Run official Node 24 fast proof and close Code against its
exact report. Record its passing result in the Test table before entering testing. Run complete
delivery against main, inspect the early ticket gate, validate Test and receipt before documentation
edits, map evidence, validate Document, run final `npm run check`, verify receipt before/after
staging, commit, push, and inspect complete hosted evidence.

### Planned files

- `e2e/quality-contracts.spec.ts`: replace the ownership startup wait with actual readiness.
- `docs/QUALITY_PROGRAM.md`: explain retained failure and unchanged measurement contracts.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the correction.
- This ticket: maintain phases, changed-file ledger, and acceptance evidence.

## Code

### Changed-file ledger

| File                            | Purpose                                                                               |
| ------------------------------- | ------------------------------------------------------------------------------------- |
| This ticket                     | Retain failure history, phases, proof, and acceptance evidence.                       |
| `e2e/quality-contracts.spec.ts` | Await the frozen fixture entry and public update barrier before baseline measurement. |
| `docs/QUALITY_PROGRAM.md`       | Explain the rejected hosted run and unchanged measurement contracts.                  |
| `docs/README.md`                | Link ownership readiness evidence from the brain.                                     |
| `docs/tickets/ROADMAP.md`       | Record the bounded readiness correction and delivery conditions.                      |

### Design changes

Plan validation passed before editing. The benchmark awaits its exact declared `/main.ts` entry in
the existing evaluation, retains runtime import/install, and awaits the public update barrier before
baseline/reset. The frozen HTML, instrumentation, every scenario/assertion, all ceilings, and proof
settings are unchanged.

## Test

| Command                                                                                                                 | Result | Evidence                                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hosted delivery `36301323651`                                                                                           | Fail   | Report `2026-09-27T06-54-30-539Z-17609` rejects three ownership network-wait timeouts and missing execution. Retained evidence: `.git/jqstar/pr2-delivery-580e18e-evidence/`.                                                                                                  |
| Read-only hosted table/toast result inspection                                                                          | Pass   | Both table scenarios and toast pass on their first attempts in Chromium and Firefox. Complete hosted delivery still fails at the ownership wait.                                                                                                                               |
| Three-worker ownership proof in three desktop engines; `--repeat-each=3 --retries=0`                                    | Pass   | All nine cases pass in 7.3 seconds without failures, flakes, or skips. Evidence: `.git/jqstar/ticket0068-focused/results.json`. All nine retain 2,292 baseline / 2,294 mounted nodes, one owned observer/listener, 1,092 queries, four mutations, and zero disposed resources. |
| Official Node 24 `JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast` | Pass   | All six gates pass in `2026-09-27T07-43-59-332Z-73426`; exact Code-phase validation passes before entering testing.                                                                                                                                                            |
| Official Node 24 three-worker `npm run quality:delivery`                                                                | Pass   | Report `2026-09-27T07-46-39-682Z-82845` passes all 12 gates, all 77 component cases, and all 1,729 matrix cases without failures, flakes, or skips. Matching Test validation and receipt verification pass before documentation changes.                                       |

### Inspection ledger

| Finding                                                                      | Resolution                                                                    |
| ---------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Transport inactivity does not establish the benchmark's ownership readiness. | Await the exact entry and runtime update barrier before baseline measurement. |

## Document

### Documentation changed

Quality guidance retains the hosted Firefox failure and explains declared entry evaluation plus
public update completion before baseline measurement. The brain and roadmap link this correction.
Public runtime usage, fixture markup, and backend contracts are unchanged.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                                      | Result |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `e2e/quality-contracts.spec.ts` requires the declared `/main.ts` entry, awaits its evaluation and `jquery.star.nextUpdate()`, then measures ownership without a network-inactivity wait.                                                                                                                                                      | Pass   |
| AC-02 | Source inspection confirms only startup readiness changes. Frozen HTML, instrumentation, scenarios, native dialog, assertions, exact budgets, workers, deadlines, retries, projects, and case counts remain. All nine focused runs retain the same measured ownership deltas.                                                                 | Pass   |
| AC-03 | All nine focused repetitions pass in 7.3 seconds with three workers and retries disabled. Fast report `2026-09-27T07-43-59-332Z-73426` and complete delivery `2026-09-27T07-46-39-682Z-82845` pass with exact Code/Test validation before phase advancement. All 77 component and 1,729 matrix cases pass without failures, flakes, or skips. | Pass   |
| AC-04 | Quality guidance, brain, roadmap, and this ticket retain the failed hosted evidence and actual readiness contract. Final documented-tree `npm run check` and receipt verification before/after staging remain mandatory. Complete hosted checks and the pending security scope decision remain merge conditions.                              | Pass   |

### Completion audit

Current-state inspection confirms the benchmark awaits its own declared entry and public update
barrier before baseline/reset. Missing entry markup fails clearly. Every original ownership and
native dialog assertion remains, with unchanged frozen HTML and instrumentation. All nine focused
runs retain 2,292 baseline / 2,294 mounted nodes, one owned observer/listener, 1,092 queries, four
mutations, and zero disposed resources. Complete local delivery passes all 12 gates and every
component/matrix case. Runtime sources, proof settings, pins, and budgets remain unchanged. All
criteria have direct evidence; failed hosted delivery and its partial results remain recorded.

Run final `npm run check` for this documented tree and verify its receipt before and after staging
before commit. Keep its final report identifier in the PR body or `.git` evidence to preserve the
tested source fingerprint. Complete hosted checks and the separately requested security scope
decision remain merge conditions; this ticket claims neither hosted success nor security
remediation.

Status: Complete

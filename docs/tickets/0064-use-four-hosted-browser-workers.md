---
id: 0064
title: Use four hosted browser workers
status: done
created: 2026-09-26
updated: 2026-09-26
---

# 0064: Use four hosted browser workers

## Plan

### Problem

Hosted WebKit exceeds the existing project deadline with two browser workers. The complete
integrated Lab remains the required live fixture; reducing its coverage or raising the deadline
would change the proof instead of completing it with the available runner capacity.

### Current evidence

Hosted run `36282675274`, report `2026-09-27T00-33-44-580Z-17272`, passes 11 of 12 gates. Firefox
completes all 566 cases in 625,731 milliseconds. WebKit reports 437 successful cases before the
900,000-millisecond project timeout prevents a final execution report. Both virtual-window cases
corrected in 0063 pass, in 12.0 and 13.6 seconds. A missing final report remains a delivery failure.

The repository API reports `private: false`, and both browser workflow jobs use `ubuntu-latest`. The
[GitHub runner reference](https://docs.github.com/en/actions/reference/runners/github-hosted-runners)
documents four CPUs for this public runner type. The workflows configured two workers at the start
of this correction. Record actual capacity in the next run rather than relying only on the
documented allocation.

### Scope

Use four browser workers in hosted delivery and full audit. Record the runner's available CPU count
and total memory before each quality command. Verify the existing complete matrix with four workers
and retain all time bounds, selection, retries, flaky-result rejection, and package limits. Settle
the popover test trigger in the viewport center before opening so its existing below-trigger
assertion has guaranteed space; preserve the runtime collision behavior.

### Out of scope

Runtime changes, security remediation, timeout increases, sharding, reduced coverage, package budget
changes, analyzer pin changes, branch protection changes, publication, and deployment.

### Acceptance criteria

- [x] [AC-01] Both hosted browser jobs use four workers on the existing public Ubuntu runner and
      record actual CPU and memory capacity before the quality command.
- [x] [AC-02] Project and enclosing gate deadlines, repetitions, retries, selected projects and
      cases, flaky-result rejection, analyzer pins, and package budgets remain unchanged.
- [x] [AC-03] Focused virtual-window and active-theme repetitions pass with four workers and retries
      disabled; the popover placement repetition uses settled central geometry while retaining all
      placement, focus, and dismissal assertions; fast checks and complete local delivery pass with
      four workers.
- [x] [AC-04] Quality guidance, the brain, and roadmap describe the capacity choice and retained
      failure. Final documented-tree receipt verification remains mandatory before commit, and
      complete hosted evidence remains a separate merge condition.

### Design

Change only the two hosted `JQS_E2E_WORKERS` values from two to four. Add a small Node diagnostic
using `availableParallelism()` and `totalmem()` immediately before each quality command. Keep the
900-second project bound, 45-minute delivery browser gate, full-audit repetition allowances,
180/360-minute job bounds, current project selection, and flaky-result policy unchanged.

The first local four-worker delivery exposed an invalid popover setup assumption. Its trigger was at
viewport y=679.53125; the runtime correctly flipped content to y=522.185546875 because less space
remained below the trigger. The test nevertheless asserted below-trigger placement. Wait for fonts,
scroll the trigger instantly to the center, and poll central geometry before opening. Keep the
existing below-trigger and edge assertions, and explicitly assert `data-side="bottom"`. Do not
change runtime positioning or disable collision avoidance.

### Decisions

- Match bounded browser concurrency to the documented four-CPU public runner.
- Record actual allocation in CI and preserve the complete execution evidence requirement.
- Keep the full live Lab and all 1,726 selected delivery cases.
- Preserve the timeout failure rather than treating successful partial execution as a pass.
- Correct the popover fixture placement instead of accepting a flaky retry or weakening assertions.

### Risks

More workers can expose shared-fixture races or consume additional memory. Focused repetitions and
the complete matrix must pass without flaky results. If repository visibility or runner type
changes, review the worker count against the newly recorded capacity. Local proof does not replace
hosted verification on the exact pushed commit.

### Verification plan

Validate Plan before changing the workflows. Run the existing virtual-window and active-theme cases
three times in all three desktop engines with four workers and retries disabled. Repeat the popover
placement test under the same settings after its setup correction. Run official Node 24 fast checks
and validate Code, then full delivery against actual main before validating Test. Document
acceptance evidence, run final `npm run check`, verify the receipt before and after staging, commit,
push, and inspect complete hosted reports before merge.

### Planned files

- `.github/workflows/quality.yml`: four workers and explicit runner-capacity evidence in both jobs.
- `e2e/components.spec.ts`: settle the popover fixture before its placement assertion.
- `docs/QUALITY_PROGRAM.md`: explain the actual timeout and public-runner capacity choice.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the bounded concurrency correction.
- This ticket: retain commands, failure evidence, acceptance mapping, and completion audit.

## Code

### Changed-file ledger

| File                            | Purpose                                                                                                          |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| This ticket                     | Record the hosted timeout and bounded design.                                                                    |
| `.github/workflows/quality.yml` | Set four workers for both browser jobs and record actual CPU and memory capacity.                                |
| `e2e/components.spec.ts`        | Guarantee central trigger geometry for below-trigger popover assertions without changing runtime positioning.    |
| `docs/QUALITY_PROGRAM.md`       | Explain the actual hosted failure, recorded allocation, four-worker choice, popover fixture, and retained gates. |
| `docs/README.md`                | Link the bounded hosted-capacity correction from the brain.                                                      |
| `docs/tickets/ROADMAP.md`       | Map the concurrency correction and unchanged delivery conditions.                                                |

### Design changes

Both browser jobs now configure four workers and emit capacity from the pinned Node runtime.
Configured deadlines, selection, repetitions, retries, pins, and budgets are unchanged. The revised
Plan was validated before editing the popover test. That test now waits for fonts, centers its
trigger with instant scrolling, and polls central geometry before opening. It retains the exact
placement, viewport-edge, focus, and dismissal assertions and adds an explicit bottom-side
assertion.

## Test

| Command                                                                                                                                                                                                                                                                                                             | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted delivery `36282675274`                                                                                                                                                                                                                                                                                       | Fail   | WebKit's project timeout prevents a complete execution report; 11 other gates pass.                                                                                                                                                                                                                                                                                                           |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0064-use-four-hosted-browser-workers.md`                                                                                                                                                                                                             | Pass   | Plan validated before changing the workflow.                                                                                                                                                                                                                                                                                                                                                  |
| Official Node 24 capacity diagnostic                                                                                                                                                                                                                                                                                | Pass   | Local Mac reports 10 available CPUs and 17,179,869,184 memory bytes; hosted allocation still awaits the next CI run.                                                                                                                                                                                                                                                                          |
| `JQS_E2E_WORKERS=4 npx playwright test e2e/components.spec.ts e2e/site.spec.ts --project=desktop-chromium --project=desktop-firefox --project=desktop-webkit --grep 'project browser (virtual mode\|cancels an older virtual window)\|the integrated Lab is accessible in both themes' --repeat-each=3 --retries=0` | Pass   | All 27 cases pass in 48.2 seconds, with zero skipped, unexpected, or flaky results. JSON evidence: `.git/jqstar/ticket0064-focused/results.json`.                                                                                                                                                                                                                                             |
| `JQS_E2E_WORKERS=4 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast`                                                                                                                                                                                                              | Pass   | All six enforced gates pass in report `2026-09-27T01-26-21-029Z-94174`; Code phase validated against its exact unchanged tree before entering testing.                                                                                                                                                                                                                                        |
| `JQS_E2E_WORKERS=4 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:delivery`                                                                                                                                                                                                          | Fail   | Report `2026-09-27T01-28-31-596Z-4084` rejects one flaky WebKit popover case: 565 expected and one flaky result. Zoom-reflow also passes; remaining browser projects did not execute after WebKit rejection. The pending detector gate was interrupted with SIGINT; report status is error and no receipt is eligible. Ten other gates pass. Revise Plan before correcting the fixture setup. |
| Four-worker focused tests including popover, virtual windows, and active themes; all three desktop engines; `--repeat-each=3 --retries=0`                                                                                                                                                                           | Pass   | All 36 cases pass in 52.5 seconds with no unexpected, skipped, or flaky results. Evidence: `.git/jqstar/ticket0064-settled-focused/results.json`.                                                                                                                                                                                                                                             |
| Four-worker official Node 24 `npm run quality:fast`, actual-main base, after popover setup correction                                                                                                                                                                                                               | Pass   | All six gates pass in `2026-09-27T01-41-08-157Z-39442`; Code phase validated against the exact report before advancing to testing.                                                                                                                                                                                                                                                            |
| Four-worker official Node 24 `npm run quality:delivery`, actual-main base, after popover setup correction                                                                                                                                                                                                           | Pass   | Report `2026-09-27T01-43-09-985Z-48660` passes all 12 gates and all 1,726 browser cases across eight projects, without failures, flakes, or skips. Test phase validation and `npm run quality:receipt` pass against the unchanged tree before documentation edits.                                                                                                                            |

### Inspection ledger

| Finding                                                            | Resolution                                                                                         |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| Two workers leave documented capacity unused.                      | Use four workers and record actual capacity in CI.                                                 |
| Partial successful execution lacks a receipt.                      | Keep completeness and timeout enforcement unchanged.                                               |
| Popover expected bottom placement without guaranteeing room below. | Wait for fonts and settled central trigger geometry; retain placement, focus, and dismissal proof. |

## Document

### Documentation changed

`docs/QUALITY_PROGRAM.md` explains the hosted timeout, documented public-runner capacity, actual
allocation diagnostic, four-worker settings, deterministic popover fixture, and retained delivery
conditions. The brain and roadmap link this correction. These operational changes do not affect
public runtime usage or backend contracts.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                      | Result |
| ----- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `.github/workflows/quality.yml` configures four workers and a preceding CPU/memory diagnostic in both browser jobs. Actionlint passes; local diagnostic executes under the pinned Node reference. Actual hosted allocation remains recorded by the next CI run.                               | Pass   |
| AC-02 | Workflow and test diffs retain all deadlines, selected projects and cases, repetitions, retries, flaky-result rejection, Node/analyzer pins, and package ceilings. The complete browser report selects and passes all 1,726 cases.                                                            | Pass   |
| AC-03 | All 36 focused repetitions pass in three desktop engines with four workers and retries disabled. Fast report `2026-09-27T01-41-08-157Z-39442` and delivery report `2026-09-27T01-43-09-985Z-48660` pass; matching Code and Test phase validation closes each phase before advancing.          | Pass   |
| AC-04 | Quality guidance, the brain, and roadmap describe the correction and retain earlier failures. This ticket requires final documented-tree `npm run check` and receipt verification before and after staging; complete hosted evidence on the pushed commit remains a separate merge condition. | Pass   |

### Completion audit

Current-state inspection confirms both browser jobs use four workers and record runner capacity
before their quality commands. The popover test guarantees central geometry while preserving
placement, viewport-edge, focus, and dismissal assertions. Runtime sources, configured timeouts,
project selection, retry policy, pins, and package budgets have no changes in this ticket. All
acceptance criteria have direct evidence, and the failed hosted and local runs remain recorded.

Final `npm run check` must pass for this documented tree before commit. Verify that receipt before
and after staging. Keep its final report identifier in the PR body or `.git` evidence so recording
it does not invalidate the tested tree. Hosted checks and the separately requested runtime security
scope decision remain merge conditions; this ticket makes no hosted-pass or security-remediation
claim.

Status: Complete

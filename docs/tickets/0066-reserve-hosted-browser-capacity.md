---
id: 0066
title: Reserve hosted browser capacity
status: done
created: 2026-09-26
updated: 2026-09-26
---

# 0066: Reserve hosted browser capacity

## Plan

### Problem

Four browser workers consume the full documented CPU allocation while the dev server, test driver,
and browser support processes also need capacity. The latest hosted run completes Chromium but
rejects WebKit interaction timeouts. Use a bounded three-worker configuration and require complete
proof; neither successful partial execution nor passing retries authorize delivery.

### Current evidence

Hosted run `36290452204`, report `2026-09-27T03-09-43-585Z-17557`, records four available CPUs and
16,766,410,752 memory bytes. All 11 non-matrix gates pass, including all 76 component cases.
Chromium passes all 566 cases. WebKit records 35 passes, two failures, one flaky case, and 528
skipped cases, then stops the remaining projects under the unchanged failure policy. Table actions
exceed the 60-second test bound; a toast expires before the automated hover establishes pause. The
table trace records individual clicks taking 4.5–18 seconds. Local final delivery on the same source
passes all 12 gates and all 1,726 cases with four workers. These observations justify testing
reserved hosted capacity but do not establish a confirmed runtime bug or guarantee three workers
will pass.

A read-only local composition measurement produces identical output across three renders. Home
composition takes 44–88 milliseconds and legacy Lab composition 39–49 milliseconds. This does not
establish the cause of hosted frame waits; no speculative rendering cache or runtime change is
included.

### Scope

Set delivery and full-audit browser workers to three on the existing public Ubuntu runners. Retain
the actual CPU/memory diagnostic and all existing fixture corrections. Validate the heavy table,
toast, popover, virtual-window, and active-theme cases with three workers, then the complete matrix.

### Out of scope

Runtime or product changes, fixture assertion changes, security remediation, time-bound increases,
sharding, reduced coverage, retry changes, runner changes, analyzer pins, package budgets,
publication, deployment, and branch protection changes.

### Acceptance criteria

- [x] [AC-01] Both hosted browser jobs use three workers on the existing runner and retain actual
      capacity recording; one CPU is left outside the configured browser-worker count.
- [x] [AC-02] Fixtures, selected projects and cases, deadlines, retries, repetitions, flaky-result
      rejection, Node/analyzer pins, and package ceilings remain unchanged.
- [x] [AC-03] Heavy interaction repetitions pass across three desktop engines with three workers and
      retries disabled; fast and complete local delivery pass with the same worker count.
- [x] [AC-04] Quality guidance, brain, roadmap, and ticket retain the hosted failure and explain the
      capacity hypothesis. Final documented-tree delivery receipts remain required before commit,
      and complete hosted evidence on the pushed commit remains a separate merge condition.

### Design

Change only the two hosted `JQS_E2E_WORKERS` values from four to three. A browser worker owns more
than one process; matching workers to all CPUs does not reserve capacity for the dev server and
other browser processes. Keep the diagnostics introduced in 0064. Retain all project, gate, and job
deadlines and every existing test. Keep failed hosted evidence and describe the concurrency choice
as a hypothesis until the next complete hosted report verifies it.

### Decisions

- Reserve capacity before introducing speculative runtime changes or changing the runner.
- Preserve the exact matrix and all fixture and result assertions.
- Keep the failed hosted report and passing local report as separate evidence.
- Revalidate the complete matrix; no partial result or passing retry can authorize merge.

### Risks

Three workers can reduce throughput even while improving individual action latency. Complete hosted
execution is required under the unchanged project bounds. A further failure requires its own bounded
evidence-based correction; no hosted-pass or runtime-performance claim follows from local proof
alone.

### Verification plan

Validate Plan before editing the workflow. Repeat both table flows, toast lifecycle, popover, both
virtual-window cases, and active themes three times in all three desktop engines, with three workers
and retries disabled. Run official Node 24 fast checks and validate Code against its exact report.
Run complete delivery against actual main and close Test with matching receipt verification before
documentation changes. Map acceptance evidence, run final `npm run check`, verify the receipt before
and after staging, commit, push, and inspect complete hosted evidence.

### Planned files

- `.github/workflows/quality.yml`: reserve one CPU with three browser workers in both jobs.
- `docs/QUALITY_PROGRAM.md`: explain actual capacity, retained failure, and the concurrency choice.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the hosted-capacity correction.
- This ticket: retain phase, failure, changed-file, and acceptance evidence.

## Code

### Changed-file ledger

| File                            | Purpose                                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| This ticket                     | Record four-worker failure and the bounded capacity hypothesis.                                   |
| `.github/workflows/quality.yml` | Use three workers in both browser jobs while retaining runner diagnostics and all proof settings. |
| `docs/QUALITY_PROGRAM.md`       | Explain actual allocation, the retained failure, and the current capacity hypothesis.             |
| `docs/README.md`                | Link the reserved-capacity correction from the brain.                                             |
| `docs/tickets/ROADMAP.md`       | Record the correction and its complete-proof requirement.                                         |

### Design changes

Plan validation passed before editing the workflow. Both browser jobs now use three workers. Runner
allocation recording, time bounds, projects, cases, repetitions, retries, flaky-result rejection,
pins, package budgets, and all fixture assertions are unchanged.

## Test

| Command                                                                                                                                      | Result | Evidence                                                                                                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hosted delivery `36290452204`                                                                                                                | Fail   | Report `2026-09-27T03-09-43-585Z-17557` passes 11 gates and all Chromium cases but rejects failed, flaky, and missing WebKit execution. Actual capacity is four CPUs and 16,766,410,752 memory bytes.                                                  |
| Read-only official Node 24 authored HTML composition timing                                                                                  | Pass   | Three identical-byte renders per page: home 44–88 ms and Lab 39–49 ms. No cache or runtime performance claim follows.                                                                                                                                  |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0066-reserve-hosted-browser-capacity.md`                                      | Pass   | Plan validated before changing either worker setting.                                                                                                                                                                                                  |
| Three-worker focused table, toast, popover, virtual-window, and active-theme tests; all three desktop engines; `--repeat-each=3 --retries=0` | Pass   | All 63 cases pass in 92.8 seconds with zero unexpected, skipped, or flaky results. Evidence: `.git/jqstar/ticket0066-focused/results.json`.                                                                                                            |
| Official Node 24 `JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast`                      | Pass   | All six gates pass in `2026-09-27T04-01-04-210Z-68158`; Code validated against the exact unchanged report before entering testing.                                                                                                                     |
| Official Node 24 `JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:delivery`                  | Pass   | Report `2026-09-27T04-03-14-471Z-77428` passes all 12 gates, all 76 component cases, and all 1,726 matrix cases, with zero failed, flaky, or skipped results. Matching Test-phase validation and receipt verification pass before documentation edits. |

### Inspection ledger

The initial documented-tree run `2026-09-27T04-27-16-270Z-23803` was interrupted to correct a
documentation sentence before freezing the final tree. Its partial result is an error and cannot
authorize delivery. A fresh complete `npm run check` is required for the corrected tree.

| Finding                                                                            | Resolution                                                             |
| ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------- |
| Full configured worker allocation leaves no reserved CPU for supporting processes. | Use three workers and verify complete execution under retained bounds. |
| Partial matrix and passing retries do not provide a delivery receipt.              | Preserve failed evidence and require complete clean results.           |

## Document

### Documentation changed

`docs/QUALITY_PROGRAM.md` preserves the hosted failure, actual allocation, and local proof while
explaining the capacity hypothesis and current three-worker configuration. The brain and roadmap
link this correction. Public runtime usage and backend contracts are unchanged.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                         | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | Both workflow jobs use three workers and retain CPU/memory recording. The preceding hosted report records four CPUs; worker count does not assign CPU affinity.                                                                                  | Pass   |
| AC-02 | The workflow diff changes only two worker values. Runtime, fixtures, deadlines, projects, cases, repetitions, retries, result policy, pins, and package ceilings are unchanged.                                                                  | Pass   |
| AC-03 | All 63 focused repetitions pass with three workers and retries disabled. Fast report `2026-09-27T04-01-04-210Z-68158` and complete delivery `2026-09-27T04-03-14-471Z-77428` pass, with matching phase validation before advancing.              | Pass   |
| AC-04 | Quality guidance, brain, and roadmap describe the correction and retained failure. Final documented-tree `npm run check` and receipt verification before/after staging remain mandatory; complete hosted evidence is a separate merge condition. | Pass   |

### Completion audit

Current-state inspection confirms both browser jobs use three workers and retain actual allocation
recording. This leaves capacity outside the configured worker count without promising a dedicated
CPU. Only the two workflow values change behavior; fixtures, runtime, runner type, deadlines,
projects, cases, repetitions, retries, result policy, pins, and budgets are unchanged. Every
criterion has direct evidence. The failed hosted run remains recorded, and the concurrency choice
remains a hypothesis requiring complete hosted verification.

Run final `npm run check` for this documented tree and verify its receipt before and after staging
before commit. Keep its final identifier in the PR body or `.git` evidence so the source fingerprint
remains valid. Complete hosted checks and the separately requested runtime security scope decision
remain merge conditions; this ticket claims neither hosted success nor security remediation.

Status: Complete

---
id: 0053
title: Run the final mutation audit when explicitly authorized
status: planned
created: 2026-09-06
updated: 2026-09-06
---

# 0053: Run the final mutation audit when explicitly authorized

## Plan

### Problem

The user requested one final mutation-testing ticket after 0031–0033 and the quality-standards
review, and explicitly instructed us not to run it now. This ticket records that deferred work. It
does not reopen mutation testing in normal development, delivery, or release commands.

### Current evidence

- Ticket 0048 removed mutation testing from the required workflow and toolchain.
- Vitest, V8 coverage, property tests, installed consumers, and cross-browser checks remain active.
- StrykerJS provides a Vitest runner, but compatibility, exact versions, scope, cost, and score
  thresholds must be verified against the eventual frozen source before execution.
- No mutation result is claimed by this ticket or by the preceding final program audit.

### Activation gate

Do not install, configure for automatic execution, or run mutation tooling until the user explicitly
authorizes this ticket's execution. Tickets 0031, 0032, 0033, and 0052 must first be terminal with
current evidence. A future authorization must be recorded here before Code.

### Scope

- Freeze source, toolchain, production census, test scope, exact Stryker/Vitest versions, mutation
  operators, timeout/concurrency limits, denominator, and score policy before the run.
- Run in an isolated owned checkout. Preserve machine and human reports with exact source hashes,
  selected/executed mutant counts, killed/survived/uncovered/timeout/error classifications, and
  elapsed/resource cost. Refuse empty, aborted, or narrowed evidence as a pass.
- Investigate surviving and uncovered mutants. Add behavioral tests or fix defects in owning
  tickets; document equivalent/unreachable mutants individually with evidence and review limits.
- Re-run affected mutants and required non-mutation gates after corrections. Retain the original
  reports so improvements and exclusions are reviewable.

### Out of scope

- Any mutation run during the current 0031–0033 completion task.
- Automatic inclusion in `npm run check`, fast, delivery, full-audit, CI, or release workflows.
- Blanket mutation exclusions, score manipulation, arbitrary test assertions, publication, and
  replacing coverage, properties, browser tests, or the final program audit.

### Acceptance criteria

- [ ] [AC-01] Explicit later execution authorization and terminal prerequisite evidence are
      recorded.
- [ ] [AC-02] The complete immutable scope, tool versions, budgets, score policy, and clean baseline
      are frozen and Plan-validated before execution.
- [ ] [AC-03] The nonempty complete mutation run produces validated source-bound reports and a
      disposition for every survivor, uncovered mutant, timeout, and error.
- [ ] [AC-04] Required corrections and reruns pass, and individual exclusions have direct evidence
      without weakening the scope or denominator after observing results.
- [ ] [AC-05] The final mutation report and updated test guidance accurately state results and
      limits; canonical workflows remain non-mutation and `npm run check` passes after corrections.

### Design

Use a compatible pinned StrykerJS core and Vitest runner in an isolated audit environment. Follow
the
[official Vitest runner documentation](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)
and [configuration contract](https://stryker-mutator.io/docs/stryker-js/configuration/). Runtime,
server, registry, and CLI coverage need explicit accounting; process-based tests may require a
separate adapter. Unsupported mutation scopes must remain visible instead of being counted as
tested. Keep machine reports outside published artifacts.

### Decisions

- The user's current instruction authorizes this plan only, not execution.
- This is the final deferred assurance ticket after the program audit, not a prerequisite that
  forces 0033 to run mutation testing or falsely claim mutation evidence.
- Existing detector sabotage is part of normal quality verification and is not a mutation audit.

### Risks

Mutation runs may take hours and test runners may not cover installed/process consumers without
specific adapters. Equivalent mutants and timeouts can distort scores. Freeze policy first and
retain category counts and original evidence.

### Verification plan

Now: validate this Plan and verify the canonical scripts remain non-mutation. Later, after explicit
authorization: prove baseline, runner liveness, exact scope, full results, survivor dispositions,
targeted reruns, and non-mutation delivery checks.

### Planned files

- Isolated audit configuration and result schemas after activation.
- Behavioral tests or owning-ticket defect fixes justified by actual findings.
- Final mutation report, testing guidance, roadmap, and this ticket.

## Code

### Changed-file ledger

| File        | Purpose                                                              |
| ----------- | -------------------------------------------------------------------- |
| This ticket | Record the deferred final audit without activating mutation tooling. |

### Design changes

None recorded.

## Test

| Command            | Result  | Evidence                                                    |
| ------------------ | ------- | ----------------------------------------------------------- |
| Mutation execution | Not run | Explicit user instruction; waiting for later authorization. |

### Inspection ledger

| Finding                                    | Resolution                                                |
| ------------------------------------------ | --------------------------------------------------------- |
| Current request forbids mutation execution | Keep this ticket planned and outside all canonical gates. |

## Document

### Documentation changed

This deferred plan.

### Acceptance evidence

Pending later execution authorization. No completion is claimed.

### Completion audit

Pending.

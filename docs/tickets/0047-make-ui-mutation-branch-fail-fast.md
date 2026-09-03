---
id: 0047
title: Make the UI mutation branch fail fast
status: done
created: 2026-08-31
updated: 2026-08-31
---

# 0047: Make the UI mutation branch fail fast

## Plan

### Problem

The final website delivery run exposed a nondeterministic mutation-testing outcome in the existing
UI auto-enhancement observer. When Stryker reverses the `mutation.type === "attributes"` comparison,
real MutationObserver traffic can keep scheduling enhancement work until the mutation test times
out. The focused host test logically rejects the mutant, but the runaway queue prevents Vitest from
returning that failure promptly. Delivery policy correctly treats every timeout as a failure.

### Current evidence

- Delivery run `2026-08-31T23-09-42-784Z-3568` passed 12 gates and failed only `mutation-changed`.
- Its `changed-raw.json` identifies one timeout at `src/ui/index.ts:406`, where the equality
  operator was changed from `===` to `!==`.
- The same run scored 99.88% and separately reported one allowed survivor for the proof server's
  equivalent in-memory SQLite default; that survivor did not fail committed policy.
- `test/ui-host.test.ts` already drives attribute and child-list records through the captured host
  observer and asserts their observable enhancement results.

### Scope

- Express the two MutationObserver record branches with an explicit, exhaustive `switch`.
- Preserve attribute re-enhancement, nearest-owner re-enhancement, added-element enhancement, and
  the current observer options.
- Strengthen the focused host test so unsupported record kinds perform no enhancement work.
- Record the failed and repaired mutation evidence without weakening timeout policy.

### Out of scope

- Changing component behavior, observer filters, scheduling, or ownership boundaries.
- Allowing timeouts, ignoring the mutant, adding an inline suppression, or loosening mutation score
  and count limits.
- Changing the proof server database default or the policy-permitted survivor in this ticket.

### Acceptance criteria

- [x] [AC-01] Attribute and child-list records retain their current enhancement behavior and an
      unsupported record kind is ignored.
- [x] [AC-02] The problematic mutation can no longer produce a runaway observer timeout.
- [x] [AC-03] Focused host tests, mutation testing, and all delivery gates pass with timeout policy
      unchanged.
- [x] [AC-04] Ticket 0046's completed website remains unchanged and its final delivery receipt is
      regenerated from the exact repaired tree.

### Design

Replace the binary equality branch with a `switch` over `mutation.type`. Keep each existing branch
body intact, use scoped cases, and include a no-op default for forward-compatible record kinds. This
removes the pathological inverted-condition mutation while making the supported record contract
explicit. Extend the captured-observer unit test with a synthetic unsupported record and assert that
the existing enhanced element is not reprocessed.

### Decisions

- Treat the timeout as a testability defect rather than a flaky rerun because its exact mutant and
  runaway mechanism are reproducible from the report.
- Keep the timeout maximum at zero; the repair must satisfy the quality contract.
- Use a separate repair ticket because ticket 0046 reached its terminal `done` state before this
  exact-tree failure appeared.

### Risks

- A refactor could accidentally fall through from attribute processing into child-list processing.
- An overly broad default could enhance unsupported mutation targets and recreate the loop.
- The full changed scope is large, so a standalone mutation rerun remains expensive.

### Verification plan

- Validate this Plan before editing behavior.
- Run the focused `test/ui-host.test.ts` contract.
- Run TypeScript, formatting, unit, and fast quality gates.
- Run the changed mutation gate and then the complete delivery gate.
- Validate Code, Test, and Document phases and preserve the first failed delivery evidence.

### Planned files

- `src/ui/index.ts`: Express MutationObserver handling as explicit record cases.
- `test/ui-host.test.ts`: Prove unsupported records do not trigger enhancement.
- `docs/tickets/0047-make-ui-mutation-branch-fail-fast.md`: Record the repair workflow and evidence.

## Code

### Changed-file ledger

| File                                                     | Purpose                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------- |
| `src/ui/index.ts`                                        | Handle observed record types with explicit non-falling-through cases. |
| `test/ui-host.test.ts`                                   | Prove supported records work and unsupported records are ignored.     |
| `docs/tickets/0047-make-ui-mutation-branch-fail-fast.md` | Preserve plan, failure, repair, and quality evidence.                 |

### Design changes

No changes from the planned explicit `switch` design.

## Test

| Command                                      | Result          | Evidence                                                                                                                     |
| -------------------------------------------- | --------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Final ticket 0046 `npm run quality:delivery` | Expected repair | Twelve gates passed; mutation timed out only for the inverted observer record comparison in `2026-08-31T23-09-42-784Z-3568`. |
| First focused lint and format checks         | Expected repair | ESLint rejected a nested owner `switch`; Prettier identified the new source and ticket layout.                               |
| `npx vitest run test/ui-host.test.ts`        | Pass            | Five host ownership and observer contracts passed.                                                                           |
| `npm run lint && npm run typecheck`          | Pass            | The repaired branch passes static TypeScript and ESLint rules.                                                               |
| `npm run quality:fast`                       | Pass            | All five fast gates passed in `2026-08-31T23-29-15-453Z-32269`.                                                              |
| `npm run test:mutation`                      | Pass            | All 1,217 mutants completed in 9m24s with zero timeouts and a 99.64% score.                                                  |
| `npm run quality:delivery`                   | Pass            | All 13 delivery gates passed in `2026-08-31T23-40-07-130Z-46479`.                                                            |

### Inspection ledger

| Finding                                                                                                                               | Resolution                                                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| An inverted attribute comparison sent child-list records through attribute enhancement and could sustain observer work until timeout. | Replace the binary condition with explicit attribute, child-list, and no-op default cases; retain the zero-timeout policy. |
| The repaired branch produced equivalent survivors for removing a no-op default and redundantly enhancing a self-owned root.           | Inspected both; they preserve observable behavior, remain within the score policy, and are not suppressed or ignored.      |

## Document

### Documentation changed

- This ticket records the isolated mutation timeout, exact repair, equivalent-survivor inspection,
  direct 1,217-mutant proof, and complete delivery evidence.
- No public API or usage documentation changed because the refactor preserves the documented UI
  auto-enhancement contract.

### Acceptance evidence

| ID    | Evidence                                                                                                                                         | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | `src/ui/index.ts` uses explicit attribute, child-list, and no-op default cases; five focused host tests prove supported and unsupported records. | Pass   |
| AC-02 | The direct changed-mutation report completed all 1,217 mutants with zero timeouts; the former inverted equality mutant no longer exists.         | Pass   |
| AC-03 | Focused lint, type, host, fast, mutation, and 13-gate delivery commands pass while `quality/mutation-policy.json` remains unchanged.             | Pass   |
| AC-04 | Website files were untouched by this repair; package, release, self-hosted, and browser gates all passed in the repaired-tree delivery report.   | Pass   |

### Completion audit

The observer behavior is preserved for every record type enabled by its observer options, and
unsupported records now have an explicit no-op contract. The pathological timeout is absent, no
mutation policy was weakened, and ticket 0046 remains terminal and unchanged.

Status: Complete

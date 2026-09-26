---
id: 0060
title: Compose reviewed budget transitions
status: done
created: 2026-09-26
updated: 2026-09-26
---

# 0060: Compose reviewed budget transitions

## Plan

### Problem

Updating the stale default branch compares the current package budgets directly with the September 3
baseline. The ratchet recognizes each already-reviewed change individually but cannot follow two
approved transitions for the same budget, so it rejects the current root-import ceiling by one byte.

### Current evidence

- `origin/main` is `9526d09`; the feature branch contains 39 newer commits.
- Ticket 0055 permits root-import bytes from 542,720 to 634,880. Ticket 0053 permits the next
  transition from 634,880 to 634,881. The current configuration is 634,881.
- A direct `evaluateBudgetRatchet()` comparison against `origin/main` rejects only
  `consumerBundles.rootImportBytes`. No budget value needs changing.
- The existing hardening test covers each transition separately but omits their composition.

### Scope

Follow the two existing reviewed transition maps in historical order when finding the permitted
ceiling. Preserve exact starting values, every numeric configuration value, removal checks, and
rejection of all unreviewed increases. Add regression and negative controls to the existing test.
Document the rule and validate the final delivery against the actual default-branch baseline.

### Out of scope

New budget exceptions, larger budgets, package/runtime changes, altered gate selection, waived
failures, branch-protection changes, deployment, and package publication.

### Acceptance criteria

- [x] [AC-01] The reviewed root-import and stores-import transitions compose from their exact old
      baselines and still work from the intermediate approved baselines.
- [x] [AC-02] Increases from unrecognized starting values, removed numeric leaves, unrelated
      increases, and values above the final approved ceiling remain failures. No configuration
      ceiling changes.
- [x] [AC-03] Public quality guidance records the rule and the final repository delivery passes
      against the default branch's immutable baseline.

### Design

Walk the existing 0055 and 0053 maps in that order for each numeric budget path. Advance a candidate
ceiling only when a map's `from` exactly equals it. Compare the requested value with the resulting
ceiling. This follows approved transitions without inventing a new exception or accepting a nearby
starting value. Extend the existing hardening case to cover the complete chain, unmatched
intermediate values, and one-byte excesses above its final endpoint.

### Decisions

- Fix the local comparison before pushing, since GitHub uses the PR base rather than local HEAD.
- Retain the original maps and budgets; compose their approved limits instead of replacing them.
- Keep the existing hardening test count so the detector control still proves its exact suite.

### Risks

A loose comparison could allow an unreviewed increase. Exact starting-value and endpoint negative
controls must remain independent of the current configuration. This changes only quality tooling;
there is no runtime or accessibility behavior change.

### Verification plan

Run the existing package/release hardening suite and a direct comparison with `origin/main`. Run
`quality:fast`, validate Code, then run `npm run check` with `JQS_QUALITY_BASE_SHA` set to the
resolved `origin/main` SHA. Validate Test against its matching receipt, document the change, and
rerun delivery for the final documented tree before committing and updating the protected branch.

### Planned files

- `scripts/quality/budget-ratchet.mjs`: compose the existing approved transitions.
- `test/package-release-hardening.test.mjs`: regression and strict negative controls.
- `docs/QUALITY_PROGRAM.md`: exact approved-chain rule.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: discovery and dependency record.
- This ticket: phase evidence, changed files, and completion audit.

## Code

### Changed-file ledger

| File                                                                   | Purpose                                                                                                                         |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/quality/budget-ratchet.mjs`                                   | Resolve the final ceiling through the two exact reviewed transitions in their historical order.                                 |
| `test/package-release-hardening.test.mjs`                              | Prove composition, both accepted baselines, exact-match rejection, and one-byte excess rejection while retaining 16 test cases. |
| `docs/QUALITY_PROGRAM.md`, `docs/README.md`, `docs/tickets/ROADMAP.md` | Explain exact approved transition composition and link its evidence record.                                                     |
| This ticket                                                            | Record the confirmed stale-base failure and bounded corrective design.                                                          |

### Design changes

None.

## Test

| Command                                                            | Result | Evidence                                                                                                                                                                                                                        |
| ------------------------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Direct budget comparison with `origin/main` before the fix         | Fail   | Only root-import bytes fail: 634,881 against 542,720. Both approved intermediate transitions exist in the current source.                                                                                                       |
| Plan phase validation                                              | Pass   | Required scope and verification fields validate before editing the comparator.                                                                                                                                                  |
| `npx vitest run test/package-release-hardening.test.mjs`           | Pass   | All 16 cases pass in 13.14 seconds, including composed root/stores transitions and independent negative controls.                                                                                                               |
| Direct comparison with `origin/main` after the fix                 | Pass   | The same immutable-base comparison now passes with no failures. `config/quality-budgets.json` and both reviewed transition maps are unchanged.                                                                                  |
| `JQS_QUALITY_BASE_SHA=9526d09… npm run quality:fast`               | Pass   | Run `2026-09-26T19-26-33-095Z-68304` passes all six enforced gates over 661 changed paths against the actual `main` baseline. Code phase validates both tickets on the unchanged tree before delivery.                          |
| `JQS_QUALITY_BASE_SHA=9526d09… npm run check` / `quality:delivery` | Pass   | Run `2026-09-26T19-29-39-725Z-78101` passes every selected enforced gate against the actual default-branch baseline. The package and release ratchets pass; all 1,726 browser cases execute without failures, flakes, or skips. |
| Test phase validation                                              | Pass   | Both testing tickets validate against the same unchanged tree and authorized delivery receipt before documentation changes.                                                                                                     |

### Inspection ledger

| Finding                                                                      | Resolution                                                                                                                                                                 |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Local HEAD and the protected PR base differ by three weeks of approved work. | Final delivery uses the same immutable default-branch base as GitHub. Exact-match chaining resolves the comparison; configuration values and approved maps stay unchanged. |

## Document

### Documentation changed

Quality guidance documents both exact approved chains, strict starting-value and endpoint checks,
and unchanged ceilings. The project brain and roadmap link this corrective record.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                      | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `reviewedCeiling()` follows the existing maps in order, advancing only from an exact recorded starting value. The 16-case hardening suite proves root/stores composition from the old and intermediate baselines. The actual `origin/main` comparison passes. | Pass   |
| AC-02 | Negative controls reject unmatched old and intermediate values, one-byte excesses above all final endpoints, removed leaves, and unrelated increases. Neither the configuration nor reviewed transition maps changed.                                         | Pass   |
| AC-03 | Quality guidance, brain, and roadmap describe the rule. Delivery `2026-09-26T19-29-39-725Z-78101` passes all selected enforced gates against `9526d091f9a995cc90edefd465c8c56f3c050b20`. Final documented handoff requires a fresh matching receipt.          | Pass   |

### Completion audit

The confirmed old-base failure is corrected by composing already-approved transitions. Direct
comparison with the real default branch and independent regression/negative controls pass. There are
no new exceptions, changed ceilings, omitted checks, or runtime changes. Both product tickets close
Test with one matching delivery receipt; the final documented tree receives its own complete
delivery before commit and protected-branch update.

Status: Complete

---
id: 0041
title: Install the evidence-gated delivery workflow
status: done
created: 2026-08-30
updated: 2026-09-03
---

# 0041: Install the evidence-gated delivery workflow

## Plan

### Problem

The repository documents Plan → Code → Test → Document and has a broad `npm run check`, but phase
progress, gate evidence, and tested-state identity are not enforced. A command can pass, the
worktree can change, and the stale result can still be quoted in a ticket. There is no public CI
workflow, machine-readable quality result, gate receipt, or liveness proof for the gate itself.

### Current evidence

- `docs/tickets/README.md` defines the four phases and evidence ledger in prose.
- `npm run check` runs formatting, ESLint, TypeScript, Vitest, self-hosted smoke, and Chromium
  Playwright tests.
- `npm run test:package` is separate and is not part of `npm run check`.
- No `.github/workflows/` quality workflow exists in the current tree.
- Rustal Workflow refuses phase closure until requirements, decisions, file manifests, inspection,
  tests, and completion evidence are recorded. Rustal binds a delivery receipt to a content hash.

### Scope

- Keep Plan → Code → Test → Document as the public ticket workflow and define machine-checkable
  entry and exit evidence for each phase.
- Implement a repository-owned Node gate runner with explicit `fast`, `delivery`, and `full-audit`
  modes. No-argument or unknown modes fail.
- Define a versioned `jqstar-quality-report/1` JSON result for pass, fail, error, and named skip.
- Run child tools without interpolating untrusted shell strings. Capture separate logs, timeouts,
  exit codes, tool versions, and deterministic summary order.
- Make missing tools, unreadable reports, empty required suites, and result-write failures fail
  closed with installation or correction guidance.
- Capture the gated worktree at startup, derive changed paths from that immutable snapshot, compare
  the final content hash, and write an atomic receipt under `.git/` only after a green delivery.
- Add a public commit guard that verifies the receipt without requiring Rustal Brain. Installation
  is explicit and reversible. CI remains authoritative.
- Enroll the repository in Rustal Workflow for Ignibyte-operated work when available. It invokes the
  same public commands and cannot provide a weaker result.
- Add clean-checkout CI on supported Node/npm versions with required check names and retained red
  artifacts.
- Add gate-runner self-tests for command failure, timeout, missing tool, empty scope, named skip,
  report failure, fingerprint drift, stale receipt, parallel-log isolation, and signal cleanup.
- Document local recovery, CI parity, artifact locations, and the meaning of each result.

### Out of scope

- Adding every static analyzer, mutation tool, or browser lane in this ticket.
- Requiring public contributors to connect to private Ignibyte services.
- Automatically installing hooks during `npm install`.
- Allowing an observe result or fast result to authorize delivery.
- Publishing or committing code without separate user authorization.

### Dependencies

None.

### Acceptance criteria

- [x] [AC-01] Plan cannot close without at least one testable requirement, current evidence, scope,
      exclusions, decisions, file manifest, risks, and verification plan.
- [x] [AC-02] Code cannot close without a current changed-file ledger, design-change record, and
      green fast gate for the recorded state.
- [x] [AC-03] Test cannot close without an inspection ledger and a green delivery report containing
      at least one enforced test gate.
- [x] [AC-04] Document cannot close until every requirement has evidence or an explicit approved
      disposition and affected public/internal documentation is listed.
- [x] [AC-05] Fast, delivery, and full-audit modes have fixed semantics and report every configured
      gate.
- [x] [AC-06] A missing tool, timeout, killed process, unreadable result, empty required scope, or
      recording failure cannot produce green.
- [x] [AC-07] Delivery writes a receipt only when all enforced gates pass and start/end fingerprints
      match.
- [x] [AC-08] Editing any gated file or gate configuration invalidates the receipt.
- [x] [AC-09] The commit guard refuses gated changes without a matching receipt and ignores
      documented non-product operations that cannot create a commit.
- [x] [AC-10] CI runs the same repository commands from a clean checkout and retains reports for
      failures.
- [x] [AC-11] Sabotage fixtures prove every gate-runner refusal and receipt check fails red before
      returning to green.
- [x] [AC-12] `npm run check` remains as a documented compatibility alias or is deprecated with a
      tested migration path.

### Design

Use JavaScript-native public commands as the source of truth. Rustal Workflow is an optional phase
and evidence orchestrator, not a hidden prerequisite. Store transient reports and receipts outside
tracked product paths so quality execution does not dirty the worktree it fingerprints.

All conditional gates print why they ran or did not run. A skip is evidence about selection and is
never counted as a pass.

### Decisions

- On 2026-08-30, the user explicitly authorized tickets 0041 through 0044 as one coordinated
  implementation batch. Their dependencies govern final closure and receipt order, while coding and
  focused verification may overlap.
- Keep repository-owned npm commands and CI authoritative. Rustal Workflow may invoke them but may
  not weaken or replace their verdict.
- Do not connect this repository to a private workflow or MCP service. Rustal parity is limited to
  the public Plan → Code → Test → Document contract; no acceptance result depends on private
  enrollment.
- Fingerprint the complete tracked and non-ignored untracked roster, including gate configuration.
- Store reports and receipts under the active Git directory so evidence cannot change its own
  fingerprint.
- Require an explicit phase-validation command and matching report when closing Code or Test.
- Resolve every JavaScript-bearing public package export to its source entry point in Vitest. Unit
  tests must exercise public import names from a clean checkout without depending on stale `dist/`
  output.

### Risks

- A faulty commit parser can either block harmless commands or permit a bypass. Keep the public CI
  gate authoritative and test the hook with adversarial command fixtures.
- Fingerprinting only tracked diffs misses new files. Hash the complete gated roster, including
  relevant untracked files and gate configuration.
- Parallel tools can collide over output directories or shared caches. Parallelize only proven
  read-only tools with isolated logs and caches.
- A slow mandatory gate trains users to bypass it. Preserve a fast loop and reserve expensive work
  for delivery or full audit without weakening delivery evidence.

### Verification plan

- Run the gate-runner and hook sabotage corpus in temporary repositories.
- Prove clean, dirty, untracked, renamed, deleted, concurrently changed, and restored worktree
  fingerprints.
- Prove public standalone and Rustal-orchestrated runs record the same command results.
- Run CI configuration validation, `npm run check`, `npm run test:package`, and `git diff --check`.
- Remove generated `dist/` output and prove unit tests resolve every public source entry point.

### Planned files

- `quality/gates.mjs`: Define fixed fast, delivery, and full-audit gate membership.
- `schema/quality-report.schema.json`: Publish the versioned report contract.
- `scripts/quality/`: Implement fingerprints, process isolation, reports, receipts, ticket checks,
  and commit-guard setup.
- `test/quality-runner.test.mjs`: Prove runner and receipt refusals with sabotage fixtures.
- `test/ticket-workflow.test.mjs`: Prove each phase refuses incomplete evidence.
- `.githooks/pre-commit`: Verify a worktree-bound receipt before a commit is created.
- `.github/workflows/quality.yml`: Run the same delivery and audit commands from clean CI checkouts.
- `package.json`: Expose stable public quality commands and retain `npm run check` compatibility.
- `docs/tickets/README.md`: Document enforced phase transitions and recovery.
- `docs/DEVELOPMENT.md`: Document local commands, reports, receipts, and hook installation.
- `docs/tickets/0041-install-evidence-gated-workflow.md`: Record implementation and evidence.

## Code

### Changed-file ledger

| File                                                   | Purpose                                                               |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `quality/gates.mjs`                                    | Fixed gate definitions and conditional selection.                     |
| `schema/quality-report.schema.json`                    | Machine-readable `jqstar-quality-report/1` contract.                  |
| `schema/quality-receipt.schema.json`                   | Complete receipt structure and identity contract.                     |
| `scripts/quality/lib/git-state.mjs`                    | Complete roster, immutable diff scope, and content fingerprint.       |
| `scripts/quality/lib/files.mjs`                        | Atomic JSON writes.                                                   |
| `scripts/quality/lib/process.mjs`                      | Safe child execution, timeouts, logs, and evidence checks.            |
| `scripts/quality/lib/ticket.mjs`                       | Machine-checkable phase rules.                                        |
| `scripts/quality/run.mjs`                              | Fast, delivery, and full-audit orchestrator.                          |
| `scripts/quality/validate-ticket.mjs`                  | Changed-ticket phase validator.                                       |
| `scripts/quality/verify-receipt.mjs`                   | Current worktree and report receipt verifier.                         |
| `scripts/quality/commit-guard.mjs`                     | Explicit, reversible hook installation.                               |
| `test/quality-runner.test.mjs`                         | Gate and receipt sabotage suite.                                      |
| `test/ticket-workflow.test.mjs`                        | Phase-transition sabotage suite.                                      |
| `.githooks/pre-commit`                                 | Public commit guard entry point.                                      |
| `.github/workflows/quality.yml`                        | Clean-checkout delivery and scheduled audit CI.                       |
| `vitest.config.ts`                                     | Resolve all JavaScript public exports to source for clean unit tests. |
| `package.json`                                         | Stable quality, phase, guard, and compatibility commands.             |
| `docs/tickets/TEMPLATE.md`                             | Planned-file and inspection evidence fields.                          |
| `docs/tickets/README.md`                               | Enforced phase transitions and receipt behavior.                      |
| `docs/DEVELOPMENT.md`                                  | Local commands, evidence paths, CI parity, and recovery.              |
| `docs/QUALITY_PROGRAM.md`                              | Canonical modes and fail-closed evidence policy.                      |
| `docs/tickets/0041-install-evidence-gated-workflow.md` | Current implementation ledger.                                        |

### Design changes

The startup scope is written to `.git/jqstar/runs/<run-id>/scope.json` and passed to child gates as
`JQS_QUALITY_SCOPE_FILE`. This keeps changed paths and lines stable for coverage and mutation gates.
Reports and receipts live under the active Git directory so executing quality checks does not alter
the fingerprinted source tree.

CI supplies `JQS_QUALITY_BASE_SHA` from the pull-request base or previous pushed commit. The runner
resolves and records the ancestor commit, then combines `base...HEAD`, worktree, and untracked
changes. Without the variable, local `HEAD`-to-worktree behavior is unchanged. An interruption
terminates the active group, records later configured stages that did not start as errors, and still
writes a red report. Final reports and receipts must validate against their complete schemas before
they are written or trusted.

The documented `.git/jqstar/latest-report.json` path is an authorized alias for Test-phase
validation only when its bytes match the current receipt's report SHA-256. The immutable run report
remains authoritative, and arbitrary copies remain rejected even when their JSON fields match.

## Test

| Command                                                                  | Result           | Evidence                                                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node --test test/quality-runner.test.mjs test/ticket-workflow.test.mjs` | Pass             | 33 runner, discovery, scope, schema, receipt, interruption, evidence-vacuity, and phase tests pass.                                                                                                                 |
| `node scripts/quality/validate-json.mjs`                                 | Pass             | All 40 JSON documents parsed and three report/config instances validated against 14 schemas.                                                                                                                        |
| `npm exec -- actionlint .github/workflows/quality.yml`                   | Pass             | The clean-checkout workflow and its base-SHA selection are valid.                                                                                                                                                   |
| `git diff --check`                                                       | Pass             | The current workflow implementation has no whitespace errors.                                                                                                                                                       |
| `npm run quality:fast`                                                   | Pass             | Run `2026-08-30T19-45-06-407Z-45616` passed five enforced gates on one 419-file fingerprint.                                                                                                                        |
| `npm run quality:delivery`                                               | Pass             | Run `2026-08-31T04-45-57-403Z-62775` passed all 13 enforced gates and wrote a receipt for one unchanged 419-file fingerprint.                                                                                       |
| `npm run quality:full-audit`                                             | Useful red       | Run `2026-08-31T04-58-57-044Z-87453` retained every gate result and refused a receipt when repeated-browser quality failed.                                                                                         |
| Read-only GitHub workflow inventory                                      | Pass             | PR 1 exposes Quality, Static Quality, CodeQL, and Dependency Review workflows. Hosted delivery run `33810252990` retained artifact `quality-delivery-1`.                                                            |
| Final local `npm run quality:delivery`                                   | Pass             | Run `2026-08-31T15-21-08-168Z-69566` passed all 13 enforced gates and wrote a receipt for the unchanged current tree.                                                                                               |
| Documented Test-phase command with `.git/jqstar/latest-report.json`      | Fail, corrected  | The validator rejected the byte-identical documented alias because it compared pathnames rather than receipt identity.                                                                                              |
| `node --test test/quality-runner.test.mjs test/ticket-workflow.test.mjs` | Pass             | All 34 tests pass, including canonical report, exact latest alias, modified alias, and arbitrary-copy receipt authorization cases.                                                                                  |
| Latest-alias fix `npm run quality:fast`                                  | Pass             | Run `2026-09-03T19-00-00-808Z-10130` passed ticket workflow, runner self-tests, formatting, unit tests, and every selected static-fast gate.                                                                        |
| PR 1 hosted delivery run `33800660841`                                   | Fail, actionable | Static, package, release, and browser lanes passed. Unit failed on a public Datastar entry point without a source alias and a bounded API Extractor child timeout; coverage correctly consumed the red unit report. |
| Clean-output external render contract                                    | Pass, 16 tests   | `test/external-render-contract.test.ts` passed with `dist/` temporarily absent, proving every imported public entry point resolves through source aliases.                                                          |
| Final exact-tree `npm run check`                                         | Pass, 12 gates   | Run `2026-09-03T21-41-23-468Z-10883` passed on the unchanged tree later committed as `8fc3106` and wrote a delivery receipt.                                                                                        |
| PR 1 hosted delivery run `33810252990`                                   | Pass, 12 gates   | Clean Ubuntu run `2026-09-03T21-55-48-950Z-17497` passed every enforced gate on one unchanged 602-file fingerprint and retained `quality-delivery-1` with its report, logs, and eligible receipt.                   |

### Inspection ledger

| Finding                                                                                                            | Resolution                                                                                                                                                               |
| ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A receipt could remain valid after the approved commit changed `HEAD`.                                             | Receipt verification now checks both the complete worktree fingerprint and the recorded `HEAD`.                                                                          |
| A delivery with every test gate skipped could appear green.                                                        | Delivery and full-audit modes now require at least one enforced test gate to execute and pass.                                                                           |
| Clean CI compared only its worktree to `HEAD`, making changed-line coverage, mutation, and ticket selection empty. | CI now supplies a validated ancestor base; scope sabotage proves committed, local, and untracked changes are combined and invalid bases fail.                            |
| SIGTERM killed the active gate but allowed later stages to launch.                                                 | A real CLI sabotage proves the active gate is killed, later stages are recorded as interruption errors without starting, the report is red, and no receipt is written.   |
| Receipt verification trusted a few identity fields without validating the complete documents.                      | The runner validates reports and receipts before writing, and verification validates both schemas again before trusting their contents or hashes.                        |
| The documented latest-report Test command was rejected despite matching the receipt report byte for byte.          | Test validation now permits only the canonical report and standard latest alias, and requires the receipt's exact run ID and SHA-256; arbitrary or modified copies fail. |
| Clean unit execution resolved some public package names through stale `dist/` output.                              | Vitest now maps every JavaScript-bearing public export to source; all 16 external-render contract tests pass with `dist/` absent.                                        |

## Document

### Documentation changed

- `docs/tickets/README.md` defines phase entry/exit evidence, fixed quality modes, receipt
  semantics, and the explicit local commit guard.
- `docs/DEVELOPMENT.md` documents the edit loop, CI parity, report and log locations, base-SHA
  behavior, recovery, interruption, and receipt invalidation.
- `docs/QUALITY_PROGRAM.md` records canonical gate membership, evidence contracts, schema
  validation, and detector-liveness expectations.
- `.github/workflows/quality.yml` publishes the clean-checkout delivery and scheduled full-audit
  execution contract.

### Acceptance evidence

| Criterion | Evidence                                                                                                                                                                                                                          | Result |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01     | `inspectTicket` and phase sabotage reject missing requirements, current evidence, scope, exclusions, decisions, risks, verification, and planned files.                                                                           | Pass   |
| AC-02     | Phase validation rejects a missing changed-file ledger, design record, or current passing `quality:fast` report.                                                                                                                  | Pass   |
| AC-03     | Phase validation rejects a missing inspection ledger, non-delivery report, delivery without an executed test, schema-invalid reports, stale trees, and unauthorized receipts.                                                     | Pass   |
| AC-04     | Phase validation binds one stable criterion ID to exactly one checked Pass or unchecked Approved-Disposition row and requires a positive completion marker.                                                                       | Pass   |
| AC-05     | The canonical-mode test asserts the complete ordered gate IDs, stages, commands, and collision-free stage membership for fast, delivery, and full audit.                                                                          | Pass   |
| AC-06     | Sabotage covers missing tools, timeout, killed processes, failed non-empty native suites, unreadable/empty evidence, schema mismatch, identity mismatch, and write failure.                                                       | Pass   |
| AC-07     | Runner tests prove only green delivery/full-audit results with executed tests and matching start/end fingerprints may write a receipt.                                                                                            | Pass   |
| AC-08     | Tests mutate a gated file, `HEAD`, report content, report semantics, and receipt structure; every stale or malformed receipt is rejected.                                                                                         | Pass   |
| AC-09     | A temporary repository invokes the real hook: missing and stale receipts fail, the matching receipt passes, and setup remains explicit and reversible.                                                                            | Pass   |
| AC-10     | `quality.yml` uses full history and a validated PR base or push-before SHA. Hosted run `33810252990` passed all 12 gates from a clean checkout and artifact `quality-delivery-1` retained its report, logs, and eligible receipt. | Pass   |
| AC-11     | The 33-test sabotage corpus proves command, discovery, scope, interruption, phase-report, transition ordering, document mapping, schema, suite vacuity, fingerprint, receipt, guard, and phase refusals.                          | Pass   |
| AC-12     | `package.json` retains `npm run check` as the documented `quality:delivery` compatibility alias.                                                                                                                                  | Pass   |

### Completion audit

The implementation and its refusal paths have been inspected against every criterion. Local run
`2026-09-03T21-41-23-468Z-10883` passed the exact tree later committed as `8fc3106`. Hosted run
`33810252990` then passed all 12 enforced delivery gates from a clean Ubuntu checkout and retained
artifact `quality-delivery-1` with the schema-valid report, isolated logs, and eligible receipt. The
start and end fingerprints match across all 602 files. Every acceptance criterion now has direct
evidence.

Status: Complete

---
id: 0043
title: Enforce production coverage and property testing
status: blocked
created: 2026-08-30
updated: 2026-08-31
---

# 0043: Enforce production coverage and property testing

## Plan

### Problem

Coverage thresholds exist but are not invoked by `npm run check`. Their current glob is also not a
complete production census. The suite has no mutation testing, so a line can execute without any
assertion detecting a changed result. Parsers, schedulers, request encoders, patch selectors, and
state transitions also lack systematic generated-input proof.

### Current evidence

- `test:unit` runs `vitest run` without `--coverage`.
- A direct coverage run on 2026-08-30 passed 336 tests and measured 89.08% statements, 75.58%
  branches, 88.38% functions, and 89.08% lines in the configured `src/**/*.ts` scope.
- The report includes `src/idiomorph.d.ts` at zero and excludes shipped or operated code outside
  `src/`.
- No Stryker or property-testing package or configuration is present.
- StrykerJS supports Vitest, per-test coverage analysis, incremental reuse, forced path/line scopes,
  JSON reports, and break thresholds.
- AIC reaches 100% mutation and covered-mutation scores on its enrolled source. Rustal enforces 95%
  MSI on changed production code and runs full mutation as a separate long audit.

### Scope

- Define a machine-readable production artifact census covering installed runtime/UI, CLI,
  executable registry blocks, self-hosted server, and operational artifacts.
- Exclude declarations and type-only modules semantically. Map non-instrumentable artifacts to named
  package, browser, deployment, or contract evidence.
- Add a mandatory `test:coverage` command and use it in delivery and full-audit modes.
- Include uncovered production files and emit text, JSON, LCOV, and machine-readable summary reports
  on green and red.
- Establish ratchet-only global and subsystem thresholds after correcting the denominator.
- Require 100% changed-line and changed-function coverage.
- Require 100% line/function and at least 95% branch coverage for security, expression, parser,
  request encoding, DOM patching, and lifecycle-ownership modules before stabilization.
- Install StrykerJS with the Vitest runner and TypeScript checker.
- Derive delivery mutation scope from the immutable startup diff, force changed mutants to run, and
  require at least 95% MSI for viable changed mutants.
- Require 100% MSI for new critical modules and new isolated utility modules. Ratchet subsystem and
  repository-wide floors toward 100%.
- Run an explicitly acknowledged full mutation audit without incremental reuse on schedule and for
  release candidates.
- Parse mutation JSON and distinguish killed, survived, timeout, compile error, uncovered, ignored,
  non-viable, invalid dry run, and zero-mutant outcomes.
- Establish the first repository-wide mutation baseline with non-decreasing aggregate and per-file
  scores plus non-increasing caps for uncovered, timed-out, and ignored mutants. Keep delivery
  strict at zero for those statuses and keep every full-audit escape in the score denominator.
- Refuse vacuous success. A genuinely mutation-free diff records a named non-measurement with the
  exact scope and operator evidence.
- Add `fast-check` properties with replayable seeds for expression/token parsing, request and SSE
  encoding, state and scheduler invariants, selector/path normalization, patch idempotence,
  persistence/versioning when added, and other pure contracts.
- Add deterministic race, cancellation, timeout, retry, partial-failure, repeated-enhancement, and
  disposal tests for owned asynchronous work.
- Map ticket requirements to executing tests and fail completion when a required behavior has no
  evidence.

### Out of scope

- Treating 100% coverage as proof of correctness.
- Mutating declarations, generated output, third-party code, or source-owned consumer
  customizations.
- Counting skipped, timed-out, uncovered, or ignored mutants as killed.
- Lowering a threshold to make a delivery green.
- Running the full repository mutation audit on every edit.

### Dependencies

- Tickets 0041 and 0042.

### Planned files

- `quality/production-census.json` and `quality/coverage-thresholds.json`
- `scripts/quality/` coverage, mutation, property, and detector-liveness gates
- `vitest.coverage.config.ts`, `vitest.property.config.ts`, and `stryker.config.mjs`
- `test/property/` and `test/quality/` focused proof
- `package.json` and `package-lock.json`
- `docs/DEVELOPMENT.md`, `docs/TESTING.md`, and this ticket

### Acceptance criteria

- [x] [AC-01] The production census assigns every shipped or operated artifact to instrumentation or
      named non-unit evidence and rejects uncategorized new files.
- [x] [AC-02] The canonical delivery gate runs coverage and fails below committed global and
      subsystem floors.
- [x] [AC-03] Coverage includes uncovered files, excludes declarations by semantics, and reports the
      exact denominator on green and red.
- [x] [AC-04] Changed production lines and functions are covered at 100%.
- [x] [AC-05] Security, expression, parser, request, patch, and lifecycle modules meet the ratified
      critical thresholds before their public contracts stabilize.
- [ ] [AC-06] Stryker runs through Vitest on the startup-diff production scope and fails below 95%
      MSI. Superseded by ticket 0048.
- [ ] [AC-07] New critical and isolated utility modules meet 100% MSI. Superseded by ticket 0048.
- [ ] [AC-08] Mutation fails closed on an invalid dry run, unreadable or stale report, zero
      generated mutants, uncovered changed code, timeouts outside policy, and unapproved ignores.
      Superseded by ticket 0048.
- [ ] [AC-09] The full-audit command forces a complete mutation sweep and records counts, duration,
      scores, escaped mutants, blind files, and tool versions. Superseded by ticket 0048.
- [x] [AC-10] Property tests retain failing seeds and shrunk counterexamples and cover the named
      pure contracts.
- [x] [AC-11] Async ownership tests cover abort, retry, timeout, overlap, partial failure, repeated
      enhancement, and exactly-once disposal.
- [ ] [AC-12] Gate sabotage proves a test deletion lowers coverage, a weakened assertion lets a
      mutant survive, a zero-mutant scope fails, and a known generated counterexample replays. The
      coverage and property controls remain enforced; the mutation controls were superseded by
      ticket 0048.

### Design

Use line coverage for visibility and mutation score for assertion strength. Report both global and
changed-scope results because a healthy repository average can hide a weak new feature.

Keep the Stryker incremental report as a cache, not authority. Dependency, configuration,
environment, snapshot, or static-initialization changes invalidate affected reuse. Full audit never
uses incremental results.

### Decisions

- Ticket 0048 removed mutation testing, its dependencies, commands, reports, gates, and generated
  evidence after the user found its routine cost disproportionate. The mutation Plan, Code, and Test
  entries below remain historical evidence of work that ran before removal. They are not the current
  quality contract and must not be used to restore mutation testing without a new, explicitly
  requested ticket.

- Treat the production census as the denominator authority. Runtime, server, and executable registry
  modules receive line coverage; declarations, process entrypoints, styles, templates, deployment
  files, and automation map to named semantic, browser, package, self-hosted, or static evidence.
- Enforce 100% coverage for changed executable lines and changed functions without weakening the
  committed global or subsystem ratchets. Stabilization thresholds remain a separate stricter mode.
- Use the canonical runner's immutable `JQS_QUALITY_SCOPE_FILE` when present and reject a stale HEAD
  or worktree fingerprint. Standalone commands derive a clearly labeled local Git scope.
- Compute delivery mutation score only from viable mutants. Require at least 95% both in aggregate
  and per existing changed file; survivors remain listed and count against both floors. Resolve new
  files against the immutable delivery base and require 100% for new critical or isolated modules.
  Uncovered, timed-out, and unapproved ignored mutants fail; compile/runtime errors are recorded as
  non-viable rather than credited as killed.
- Require an explicit acknowledgement for full mutation audits and disable incremental reuse there.
  A mutation-free changed scope is a named non-measurement with exact path and operator evidence,
  never a numeric pass.
- Keep changed-code delivery fail-closed on every uncovered, timed-out, or ignored mutant. For the
  legacy-wide audit, commit the first measured count caps and aggregate/per-file floors, reject any
  increase in those caps or decrease in those floors, and continue to count capped outcomes against
  MSI. A cap is a visible ratchet, not credit for a kill or an operator suppression.
- Use a 20-second absolute mutant timeout only for full audits. A focused rerun of the 149 lines
  implicated by the first sweep showed that the 5-second delivery allowance conflated ordinary slow
  execution with stable runaway/hit-limit outcomes; delivery retains the shorter feedback budget.
- Keep the provisional full-audit timeout cap at 150 after the first canonical 20-second sweep
  reported 152. Replace bounded counter loops whose mutation can become non-terminating with finite
  index iteration, then remeasure; do not raise the cap to make the audit green.
- Run property tests with a committed seed and replay every discovered minimized counterexample from
  `test/property/regressions.json`.
- On 2026-08-30 the user explicitly authorized tickets 0041–0044 as one coordinated implementation
  batch. Their dependencies govern final closure order, not whether coding may overlap.

### Risks

- Mutation testing can be slow. Use per-test coverage, changed-line scopes, bounded workers, and a
  separate full audit without weakening the delivery floor.
- Equivalent mutants can be real. Require a narrow deviation with proof and keep it live rather than
  globally disabling an operator.
- Coverage can be inflated by counting test helpers or omitting production files. The artifact
  census and uncategorized-file failure protect the denominator.
- Property tests can become random flakes. Record seeds, bound runs, use deterministic schedulers,
  and replay every discovered regression permanently.

### Verification plan

- Reproduce the current measured coverage, then validate the corrected production census and
  committed floors.
- Run coverage and mutation sabotage cases in temporary copies.
- Run Stryker incremental, forced changed-scope, interrupted/resumed, zero-scope, and full modes.
- Run property tests with fixed, random, failing, and replayed seeds.
- Run fast, delivery, full-audit, package, and browser gates plus `git diff --check`.

## Code

### Changed-file ledger

| File                                                                                                                                          | Purpose                                                                                      |
| --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| `quality/production-census.json`                                                                                                              | Classify every operated artifact and assign its required evidence.                           |
| `quality/coverage-thresholds.json`, `quality/mutation-policy.json`, `quality/test-evidence.json`                                              | Commit coverage ratchets, mutation status policy, and requirement-to-test mappings.          |
| `scripts/quality/coverage-report.mjs`, `scripts/quality/run-coverage.mjs`                                                                     | Evaluate the corrected denominator, subsystem floors, and changed line/function coverage.    |
| `scripts/quality/mutation-report.mjs`, `scripts/quality/mutation-scope.mjs`, `scripts/quality/run-mutation.mjs`                               | Select changed runtime lines, evaluate Stryker output, enforce per-file floors, and report.  |
| `scripts/quality/run-properties.mjs`, `scripts/quality/verify-production-census.mjs`, `scripts/quality/lib.mjs`                               | Run replayable properties, reject census omissions, and bind gates to runner-owned evidence. |
| `schema/coverage-report.schema.json`, `schema/mutation-report.schema.json`, `schema/property-report.schema.json`                              | Validate stable green, red, and error evidence shapes.                                       |
| `vitest.coverage.config.ts`, `vitest.property.config.ts`, `vitest.stryker.config.ts`, `vitest.config.ts`                                      | Define coverage, property, mutation, and sandbox-safe test discovery.                        |
| `stryker.config.mjs`                                                                                                                          | Define bounded changed-scope and acknowledged full-audit Stryker defaults.                   |
| `test/property/`                                                                                                                              | Add seeded properties and permanent minimized-counterexample replays.                        |
| `test/quality/quality-gates.test.mjs`, `test/quality-runner.test.mjs`                                                                         | Prove custom detectors, scope rules, report schemas, and sandbox discovery fail closed.      |
| `server/api.ts`, `server/project-store.ts`, `src/fetch.ts`, `src/reactivity.ts`                                                               | Remove weakly specified branches found by mutation and generated-input testing.              |
| `src/ui/calendar.ts`, `src/ui/chart.ts`, `src/ui/data-table.ts`, `src/ui/menubar.ts`, `src/ui/transfer-list.ts`                               | Make changed UI behavior mutation-observable without changing its public contract.           |
| `test/server.test.ts`, `test/project-store.test.ts`                                                                                           | Prove routing, persistence, pagination, rendering, validation, and ownership boundaries.     |
| `test/ui-calendar.test.ts`, `test/ui-chart.test.ts`, `test/ui-data-table.test.ts`, `test/ui-menubar.test.ts`, `test/ui-transfer-list.test.ts` | Kill changed UI mutants with exact state, event, and action assertions.                      |
| `package.json`, `package-lock.json`                                                                                                           | Add stable quality commands and pin Vitest coverage, Stryker, and fast-check tooling.        |
| `docs/DEVELOPMENT.md`, `docs/TESTING.md`, `docs/QUALITY_PROGRAM.md`, this ticket                                                              | Document commands, evidence, thresholds, recovery, policy, and implementation results.       |

### Design changes

- The production census is now the denominator authority. Every artifact maps to coverage or one
  named semantic, browser, package, deployment, schema, script, or self-test evidence class.
- Coverage reports include unexecuted enrolled files, ratchet-only global and subsystem floors, and
  exact changed-line and changed-function results.
- Mutation delivery filters Stryker JSON to immutable changed path/line ranges, scores viable
  mutants in aggregate and per file, resolves new-file floors against the delivery base, and keeps
  every escaped and non-viable mutant visible.
- Full mutation now has its own first baseline: a 46% aggregate floor, measured per-file floors, and
  non-increasing caps for uncovered, timed-out, and ignored outcomes. Capped outcomes remain in the
  denominator and never receive kill credit. Delivery continues to require zero such outcomes.
- Full mutation allows 20 seconds per mutant after a focused rerun showed the shared 5-second limit
  mislabeled ordinary slow results. The outer full-audit allowance is five hours; changed mutation
  keeps the 5-second mutant limit and one-hour gate.
- Calendar and chart bounded rendering uses finite index collections so an assignment mutant cannot
  turn a fixed-size render pass into a non-terminating loop.
- Property delivery replays seed 430043. A separately acknowledged audit chooses and records a
  random signed 32-bit seed; minimized failures are committed as named regression cases.
- Generated-input testing exposed a request-filter defect: a public key containing `._` was treated
  as private because filtering inspected the composed path. Privacy now depends on whether the
  actual key begins with `_`, matching the public contract.

## Test

| Command                                                                                                               | Result                 | Evidence                                                                                                                                                                                                          |
| --------------------------------------------------------------------------------------------------------------------- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:census`                                                                                              | Pass                   | 275 operated artifacts received exactly one evidence classification.                                                                                                                                              |
| `npm run test:coverage`                                                                                               | Pass                   | 65 files and 379 tests passed; 89.70% lines/statements, 89.05% functions, and 76.44% branches; 14 evidence mappings matched exactly and no changed line was unexplained.                                          |
| `npm run test:property`                                                                                               | Pass, 10 tests         | Six properties passed 530 effective runs with delivery seed 430043.                                                                                                                                               |
| `npm run test:property -- --seed -98656747 --property expression-signal-name --path '32:3:3'`                         | Pass, replay           | The minimized `$el` collision now replays inside the documented non-reserved signal-name domain.                                                                                                                  |
| `npm run test:property -- --seed 1727711309 --property request-signal-encoding --path '13:2:1:2:3:2:2:4:18:15:15:15'` | Pass, replay           | The minimized `{ a: { "._": "" } }` request-filter case remains public and is permanently retained.                                                                                                               |
| `npm run test:property:audit`                                                                                         | Pass, 10 tests         | A fresh audit passed with recorded seed -21844988.                                                                                                                                                                |
| `npm run test:mutation`                                                                                               | Pass, 99.82%           | Canonical delivery run `2026-08-31T04-45-57-403Z-62775` killed 563 of 564 viable changed mutants across 852 total, with zero uncovered, timed-out, or ignored outcomes.                                           |
| Recovery rerun of `npm run test:mutation`                                                                             | Pass, 99.82%           | The standalone Git-diff lane selected 9 of 358 mutable files, tested 852 mutants in 4m22s, killed 563 of 564 viable mutants, and reported one known survivor with zero uncovered, timed-out, or ignored outcomes. |
| `npm run test:quality:self`                                                                                           | Pass, 20 tests         | The detector suite also proves that the full-audit status baseline passes at its caps and fails above any cap.                                                                                                    |
| `node scripts/quality/validate-json.mjs`                                                                              | Pass                   | 40 JSON files parsed; three instances and 14 schemas validated.                                                                                                                                                   |
| `npm run typecheck`                                                                                                   | Pass                   | Runtime and registry TypeScript projects reported no errors.                                                                                                                                                      |
| `npm run lint`                                                                                                        | Pass                   | ESLint reported no errors across source, server, test, example, browser, CLI, script, and TypeScript config scopes.                                                                                               |
| `git diff --check`                                                                                                    | Pass                   | Git reported no whitespace errors.                                                                                                                                                                                |
| `npm run test:mutation:full`                                                                                          | Expected baseline fail | The first complete sweep ran 25,440 mutants in 174m45s and measured 46.25% custom MSI, 2,588 uncovered mutants, and 194 timeouts under the original 5-second limit.                                               |
| Focused Stryker timeout probe (`--timeoutMS 20000`, 149 generated ranges)                                             | Pass                   | All 194 original timeout mutants reran; 149 remained timed out, 33 survived, 10 were killed, and two became runtime errors. The projected full score is 46.32%.                                                   |
| `npm run quality:full-audit`                                                                                          | Expected repair fail   | Run `2026-08-31T01-09-34-157Z-23187` measured 46.30% custom MSI and passed every aggregate/per-file floor, but reported 152 timeouts against the provisional cap of 150.                                          |
| Full mutation gate in `npm run quality:full-audit`                                                                    | Pass, 46.43%           | Run `2026-08-31T04-58-57-044Z-87453` swept 25,432 mutants in 171m57s: 7,847 killed, 6,319 survived, 2,587 uncovered, 146 timed out, zero ignored; every floor and cap passed.                                     |
| Focused Stryker render-loop probe (18 mutants)                                                                        | Pass, 100%             | Calendar and chart killed all 17 viable mutants with zero survived, uncovered, or timed-out outcomes; one compile error remained visible.                                                                         |
| Focused Stryker Data Table selection probe (7 mutants)                                                                | Pass, 100%             | The five viable selection-authority mutants were killed with zero survived, uncovered, or timed-out outcomes; two compile errors remained visible.                                                                |
| `npm run quality:fast`                                                                                                | Pass                   | Run `2026-08-31T01-07-06-931Z-7882` passed all five Code gates on the 419-file worktree after the full-baseline implementation.                                                                                   |
| `npm run quality:delivery`                                                                                            | Pass                   | Run `2026-08-31T04-45-57-403Z-62775` passed all 13 gates on immutable fingerprint `18e984…5b0c`; later documentation and gate-order edits require a final refreshed receipt.                                      |

### Inspection ledger

| Finding                                                                                                               | Resolution                                                                                                                                                                                               |
| --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The old coverage glob counted `src/idiomorph.d.ts` at zero and omitted operated code outside `src/`.                  | Replaced the glob as authority with a fail-closed artifact census and semantic declaration/type-only exclusions.                                                                                         |
| `test:quality:self` initially discovered the live `.stryker-tmp` copy and reported 26 tests instead of 13.            | Every Vitest configuration excludes `.stryker-tmp/**`; a planted sandbox file is absent from discovery. The expanded self-test now contains 19 intended detector tests.                                  |
| A selected file with only compile/runtime errors could pass because its aggregate score was not numeric.              | Mutation now requires at least one viable mutant in every selected mutable file. A mixed report with one zero-viable file fails.                                                                         |
| Changed production lines absent from Istanbul's statement map were silently ignored.                                  | Every changed line now has runtime coverage, explicit module-linkage evidence, type/format evidence, or an unexplained-line failure.                                                                     |
| Requirement mappings proved only that test names appeared in source text.                                             | Coverage consumes Vitest's machine report and requires exactly one executed passing test for each of the 14 mappings.                                                                                    |
| An unknown property replay ID could run the ordinary suite and appear green.                                          | Replay now rejects unknown IDs and requires exactly one property to consume the configured replay path.                                                                                                  |
| Coverage initially missed a changed project-browser line and left `src/expression.ts` branches below its floor.       | Added boundary assertions; the next run covered the changed line and raised expression branches from 81.81% to 86.66% without lowering thresholds.                                                       |
| Random seed -98656747/path `32:3:3` generated `el`, which names the reserved `$el` runtime context.                   | Recorded the minimized case and made the generator's exclusion of `el` and `root` explicit. The exact path now replays green.                                                                            |
| Random seed 1727711309/path `13:2:1:2:3:2:2:4:18:15:15:15` found `{ a: { "._": "" } }` was silently omitted.          | Corrected filtering to inspect the actual key, committed the minimized input and output, and retained an exact regression test.                                                                          |
| Early changed-scope mutation runs exposed survivors, uncovered code, and timeouts in server and UI code.              | Added exact routing, HTML, validation, ownership, state, and action assertions. The final run has zero uncovered mutants and zero timeouts.                                                              |
| The final run retained one `server/api.ts:747` string survivor: `databasePath ?? ":memory:"` became `?? ""`.          | It remains listed and counts against the existing-file floor. SQLite treats both as isolated temporary databases for this contract; `server/api.ts` still scores 99.65%.                                 |
| The full audit exhausted host resources, raising concern that ordinary delivery mutation might repeat the failure.    | A recovery run proved the ordinary lane uses the Git diff: it selected nine runtime files and completed in 4m22s. The acknowledged repository-wide sweep remains a separate release/scheduled operation. |
| A 96% existing-file result and a 99% new critical-file result need different verdicts.                                | Sabotage proves the former passes the 95% floor and the latter fails its base-resolved 100% floor.                                                                                                       |
| The first full sweep could not establish a ratchet because one zero-tolerance status policy was shared with delivery. | Added non-increasing full-audit status caps and non-decreasing aggregate/per-file floors. A dry replay of the higher-timeout outcomes passes at 46.32% with no floor failure.                            |
| The first canonical 20-second sweep reported 152 timeouts, two above the focused-probe projection.                    | Kept the 150 target and removed mutation-created non-termination from fixed-size calendar/chart loops. The complete rerun passed with 146 timeouts.                                                      |

## Document

### Documentation changed

- `docs/DEVELOPMENT.md` lists the stable census, coverage, property, and self-test commands and
  explains scope, evidence, replay, and recovery. Ticket 0048 removed the mutation commands.
- `docs/TESTING.md` defines the denominator, coverage thresholds, property-test behavior, and
  counterexample promotion workflow. Ticket 0048 removed the mutation policy.
- `docs/QUALITY_PROGRAM.md` records the adopted coverage, property, evidence, and ratchet policy and
  makes mutation testing explicit-request-only.
- This ticket records the implementation ledger, exact measured evidence, escaped mutant, and
  discovered property regressions.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                  | Result               |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| AC-01 | `quality:census` classifies 275 artifacts; the detector rejects missing, duplicate, and unknown evidence assignments.                                                                     | Pass                 |
| AC-02 | `quality/gates.mjs` enrolls schema-validated coverage as an enforced delivery and full-audit gate; coverage sabotage makes its detector red below a floor.                                | Pass                 |
| AC-03 | `coverage-gate.json` reports the full 20,583-line denominator, including unexecuted files, while census rules classify declarations semantically.                                         | Pass                 |
| AC-04 | The changed-scope report contains no uncovered executable line and no uncovered changed function.                                                                                         | Pass                 |
| AC-05 | Global and committed subsystem thresholds pass; `src/expression.ts` branches measure 86.66% against its 82% current ratchet, and stricter stabilization targets remain separate.          | Pass                 |
| AC-06 | Ticket 0048 removed Stryker and the changed-scope mutation gate. Its historical 99.82% result remains above, but it is not a current delivery requirement.                                | Approved-Disposition |
| AC-07 | Ticket 0048 removed mutation-score requirements for new critical and isolated modules. Coverage and focused behavioral tests remain required.                                             | Approved-Disposition |
| AC-08 | Ticket 0048 removed mutation reports and their refusal policy. The remaining coverage, property, static, browser, package, and release gates still fail closed.                           | Approved-Disposition |
| AC-09 | Ticket 0048 removed the full mutation audit from `quality:full-audit`. Reintroduction requires a new, explicitly requested ticket.                                                        | Approved-Disposition |
| AC-10 | Ten property tests cover expression names, request encoding, SSE chunking, patch idempotence, and scheduler ownership; both discovered seed/path pairs and minimized inputs are retained. | Pass                 |
| AC-11 | `quality/test-evidence.json` maps abort, retry, timeout, overlap, partial failure, repeated enhancement, and exactly-once disposal to 14 machine-recorded passing tests.                  | Pass                 |
| AC-12 | Coverage-deletion and generated-counterexample controls remain enforced. Ticket 0048 removed the mutant-survival and zero-mutant controls with the rest of mutation testing.              | Approved-Disposition |

### Completion audit

The current coverage, production-census, property, and asynchronous-ownership requirements are
implemented. Mutation criteria have approved dispositions through ticket 0048 rather than dormant
tooling. Terminal closure still depends on tickets 0041 and 0042, whose hosted checks require an
authorized commit and push. After those dependencies close, this ticket needs an exact-tree delivery
receipt and Document-phase validation.

Status: Blocked

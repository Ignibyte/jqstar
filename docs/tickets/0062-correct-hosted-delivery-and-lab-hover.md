---
id: 0062
title: Correct hosted delivery and Lab hover
status: done
created: 2026-09-26
updated: 2026-09-26
---

# 0062: Correct hosted delivery and Lab hover

## Plan

### Problem

The default-branch update has two hosted delivery failures and a newly exposed light-theme hover
contrast defect. Local compression differs from official Node 24, and one-worker Chromium exceeds
the existing per-project timeout. Bounded parallel verification exposed an actual inaccessible
button hover color rather than a runtime concurrency defect.

### Current evidence

Hosted delivery `36270904168` measures the stores consumer at 67,774 gzip bytes against the
67,623-byte Homebrew-derived ceiling. The identical 208,669-byte JavaScript artifact has SHA-256
`b90f9aa010b131c2a5fc7d0b2a4394d27bf2cee887a49e2f1243133cf7ae3576` under both toolchains. Homebrew
Node 26.8.1 / zlib 1.2.12 produces 67,623 gzip bytes; official Node 24.21.0 / zlib
1.3.2.1-motley-8002e91 produces 67,774. Several isolated sharing experiments increased gzip size and
were not applied. This is reference-toolchain calibration, not a performance improvement.

The hosted Chromium project reaches 466 of 566 cases before the unchanged 900-second limit. Local
two-worker run `2026-09-26T21-52-04-367Z-90469` completes all 566 WebKit cases in 325 seconds, but
its full-page theme scan is correctly rejected for one flaky result. The light Lab overrides the
inherited accessible hover color with white mixing: foreground `#fffdf8` on `#9b6d23` is 4.48:1. The
retry passes when pointer/layout placement does not preserve that hover state.

### Scope

Correct the light Lab hover palette and explicitly exercise hover after backend request completion.
Use two browser workers in hosted delivery while preserving all projects, cases, timeouts, and
flaky-result rejection. Pin the quality workflows to official Node 24.21.0 and calibrate only the
stores gzip ceiling to the exact identical-byte measurement, with an exact reviewed transition.

### Out of scope

Signal security remediation, runtime refactoring, source compression changes, larger raw bundles,
other budget increases, reduced test coverage, branch protection changes, publication, and
deployment. Security findings remain pending the separately requested scope decision.

### Acceptance criteria

- [x] [AC-01] Both Lab themes pass full-page active-validation accessibility checks while the submit
      button is explicitly hovered and enabled.
- [x] [AC-02] Hosted quality uses pinned official Node 24.21.0 and two browser workers without
      changing project selection, timeouts, or flaky-result rejection.
- [x] [AC-03] The stores gzip ceiling changes exactly from 67,623 to 67,774 for the measured
      identical artifact; unknown baselines, one byte above the final ceiling, removed limits, and
      unrelated increases still fail the ratchet.
- [x] [AC-04] Focused checks, fast validation, and full delivery pass under official Node 24 with
      two workers. Hosted checks remain a separate merge condition in PR 2.

### Design

Override `--color-jqs-primary-hover` only inside the light Lab with the established light docs
color. In the existing theme test, wait for the submit button to become enabled and explicitly hover
it before scanning the full main region. Add `JQS_E2E_WORKERS=2` to hosted delivery and full audit.
Pin Node in both quality workflows. Add the exact 0062 transition to the existing reviewed
transition chain and extend its adversarial tests through the third baseline.

### Decisions

- Adopt the exact official gzip measurement with no extra headroom and retain every other limit.
- Do not ship speculative runtime changes solely to compensate for a compressor difference.
- Keep the existing 900-second project and 45-minute browser-gate bounds.
- Verify actual hover contrast rather than disabling the rule or hiding the affected control.

### Risks

Parallel tests can expose shared fixture state; the complete matrix must pass without flaky results.
A permissive transition could weaken the ratchet; retain exact starting values and negative cases.
The color correction affects hover only and must remain accessible in both themes.

### Verification plan

Run the package hardening tests and repeat the active-theme case across all three desktop engines
with retries disabled. Run official Node 24 fast checks and validate Code, then full delivery with
two workers and the actual main baseline before validating Test. Document the exact calibration and
failure history, run final delivery, verify the receipt, commit, push, and inspect hosted checks.

### Planned files

- `example/site.css`: accessible light Lab hover palette.
- `e2e/site.spec.ts`: explicit enabled hover coverage in both active themes.
- `.github/workflows/quality.yml`, `.github/workflows/static-quality.yml`: pinned quality Node;
  bounded delivery/audit browser workers.
- `config/quality-budgets.json`: only the measured stores gzip reference ceiling.
- `scripts/quality/budget-ratchet.mjs`: exact third reviewed transition.
- `test/package-release-hardening.test.mjs`: chained-baseline and rejection evidence.
- `docs/QUALITY_PROGRAM.md`, `docs/README.md`, `docs/tickets/ROADMAP.md`: explain and link the fix.
- This ticket and 0061: failure history and acceptance evidence.

## Code

### Changed-file ledger

| File                                                                   | Purpose                                                                                     |
| ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------- |
| `docs/QUALITY_PROGRAM.md`, `docs/README.md`, `docs/tickets/ROADMAP.md` | Document and link the pinned reference, exact calibration, browser bounds, and hover proof. |
| This ticket                                                            | Record the concrete delivery failures, identical-byte proof, and corrective scope.          |
| `example/site.css`                                                     | Retain accessible light-theme contrast on Lab button hover.                                 |
| `e2e/site.spec.ts`                                                     | Scan full-page validation states with the enabled submit button explicitly hovered.         |
| Both quality workflows                                                 | Pin official Node 24.21.0; use two browser workers in delivery/audit.                       |
| `config/quality-budgets.json`, `scripts/quality/budget-ratchet.mjs`    | Record only the exact measured stores gzip calibration and its approved baseline.           |
| `test/package-release-hardening.test.mjs`                              | Extend third-transition positive proof and reject unknown starts or one byte over.          |
| `docs/tickets/0061-repair-clean-checkout-static-delivery.md`           | Retain the separately diagnosed hover failure during final handoff.                         |

### Design changes

The light hover uses the established accessible docs color. The theme proof explicitly waits for
backend completion and hovers the submit control. Quality workflows pin official Node 24.21.0 and
use two workers. The only numeric change is the measured 151-byte stores gzip reference correction.

## Test

| Command                                                                                              | Result | Evidence                                                                                                                                                                                         |
| ---------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Hosted delivery `36270904168`                                                                        | Fail   | Stores gzip reference mismatch and Chromium project timeout; retained hosted logs.                                                                                                               |
| Two-worker delivery `2026-09-26T21-52-04-367Z-90469`                                                 | Fail   | WebKit catches actual light hover contrast. The failing result is retained; detector execution was interrupted after diagnosis.                                                                  |
| Plan phase validation                                                                                | Pass   | Scope and exact gzip reference correction validate before implementation.                                                                                                                        |
| Official Node 24 package hardening tests                                                             | Pass   | All 16 cases pass, including third-baseline composition, unknown-baseline rejection, removed-limit rejection, unrelated increases, and one byte beyond the final ceiling.                        |
| Official Node 24 active-theme proof, three repetitions per desktop engine, two workers, retries zero | Pass   | All nine cases pass; every case checks both themes, actual validation messages, and an explicitly hovered enabled submit button.                                                                 |
| Official Node 24 `quality:fast`, two workers and actual main baseline                                | Pass   | Run `2026-09-26T22-08-22-635Z-43156` passes all six enforced gates; matching Code phase validates before entering Test.                                                                          |
| Official Node 24 `quality:delivery`, two workers and actual main baseline                            | Pass   | Run `2026-09-26T22-11-07-520Z-53543` passes every enforced delivery gate and all 1,726 cases in eight browser projects. The matching receipt and Test phase validate before documentation edits. |

### Inspection ledger

| Finding                                                                     | Resolution                                                                 |
| --------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| White mixing lightens an otherwise accessible light-theme hover background. | Apply the established light docs hover color and explicitly test hover.    |
| Identical JavaScript differs only in compressed measurement.                | Calibrate the exact pinned official reference; do not change runtime code. |

## Document

### Documentation changed

`docs/QUALITY_PROGRAM.md` records the identical-byte gzip calibration, pinned reference, unchanged
remaining limits, bounded worker change, and explicit hover proof. The project brain and roadmap
link this correction. Final documented-tree delivery is required before commit; its receipt is
recorded in PR 2.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                      | Result |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `example/site.css` uses the established accessible light docs hover color. Nine three-engine repetitions and complete delivery scan actual validation messages in both themes with the enabled submit control explicitly hovered.                                             | Pass   |
| AC-02 | Both quality workflows pin Node 24.21.0; delivery and full audit set two workers. Project selection, process timeouts, and flaky-result rejection are unchanged. Complete local delivery uses the same Node and worker configuration; hosted checks remain a merge condition. | Pass   |
| AC-03 | Only stores gzip changes from 67,623 to the exact official 67,774-byte measurement of identical JavaScript. `budget-ratchet.mjs` adds one exact transition; 16 hardening cases retain unknown-start, one-byte-over, removed-limit, and unrelated-increase rejection.          | Pass   |
| AC-04 | Focused checks, six fast gates, and all 12 delivery gates pass under official Node 24 with two workers and the immutable actual main baseline. All 1,726 cases pass without failures, flaky results, or skips.                                                                | Pass   |

### Completion audit

The light-theme hover defect is fixed and explicitly exercised in real backend validation states. CI
uses a pinned official Node reference and bounded parallelism without changing test selection,
timeouts, or flaky-result rejection. The only budget change calibrates the exact same JavaScript
against that reference compressor, with no extra headroom or changes to raw/other limits. Runtime
sharing experiments were rejected rather than shipped. Failure history remains above. Security
remediation remains outside this ticket and pending the separate scope decision. A fresh final
receipt must match the documented tree before commit and is recorded in PR 2.

Status: Complete

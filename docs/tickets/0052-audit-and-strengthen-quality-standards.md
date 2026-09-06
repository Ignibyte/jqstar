---
id: 0052
title: Audit and strengthen JavaScript quality standards
status: done
created: 2026-09-06
updated: 2026-09-06
---

# 0052: Audit and strengthen JavaScript quality standards

## Plan

### Problem

The final program needs a current review of its quality controls against the user's PHPStan, PHPMD,
and PHPCS expectations. Installed tools and historical green reports do not establish that their
current scopes, rules, thresholds, and failure detectors are sufficient.

### Current evidence

- The existing stack includes strict TypeScript, typed ESLint, SonarJS, formatting, CSS/HTML
  validation, dependency-cruiser, Knip, duplication, security, coverage, properties, browsers,
  installed-package consumers, reproducibility, and source-bound receipts.
- `eslint.config.js` disables several typed rules broadly, disables unsafe-operation rules in
  TypeScript tests, and applies SonarJS only to TypeScript. JavaScript automation and the shipped
  CLI need explicit review.
- `quality/metrics.json` permits cognitive complexity 149. The metric check verifies configuration
  agreement but needs review against the documented historical-ratchet promise.
- Ticket 0048 removed mutation testing from canonical quality modes. The user now requests a
  separately deferred final mutation run, tracked in 0053, and explicitly forbids running it now.

### Scope

- Inventory actual analyzer scopes, effective rules, ceilings, detector checks, local commands, and
  hosted checks. Map the PHP controls to their JavaScript equivalents using primary sources.
- Measure disabled-rule and complexity findings before choosing corrections. Remove unjustified
  gaps, preserve documented runtime boundaries, and make remaining tool limitations explicit.
- Enforce metrics against historical ceilings, protect the effective quality contract with
  executable positive/negative checks, and correct false or outdated documentation claims.
- Run the complete non-mutation delivery gate. Supply current evidence to ticket 0033.

### Out of scope

- Mutation execution, automatic dependency upgrades, new hosted services, publication, and replacing
  established analyzers solely to increase the tool count.

### Acceptance criteria

- [x] [AC-01] A current evidence matrix maps every quality category to actual scope, rules, command,
      detector, result, and limitations, including PHPStan/PHPMD/PHPCS equivalents.
- [x] [AC-02] Effective lint and type rules cover shipped runtime, CLI, registry, server, tests, and
      automation as appropriate; measured gaps have corrections or specific justified tool-boundary
      records without unreported blanket debt.
- [x] [AC-03] Complexity, duplication, coverage, and package ceilings cannot be weakened through
      environment or configuration drift. Executable negative controls prove enforcement.
- [x] [AC-04] Existing and strengthened controls pass `npm run check`; public/brain quality guidance
      and the final-audit evidence reference the actual configuration.
- [x] [AC-05] Mutation remains absent from automatic commands, dependencies, and this execution.
      Ticket 0053 records the later authorized planning scope and the pending execution boundary.

### Design

Inspect the current effective configuration and run bounded diagnostic probes before edits. Keep the
existing fail-closed runner and exact-tree receipt contract. Add controls where evidence finds an
uncovered promise, refactor code when a justified stronger rule detects a problem, and retain
behavioral tests for changed logic. Record hosted evidence separately from local evidence.

### Activation design recorded 2026-09-06

The read-only probe found 100 functions above cognitive complexity 15. The largest are the HTTP
route dispatcher (145) and CSP tokenizer (107); JavaScript fixture/automation functions reach 62.
Refactor the dispatcher into named route handlers and extract finite numeric-token reading while
preserving public behavior. Lower the enforced all-language ceiling from 149 to at most 65; record
15 as a review target rather than claiming the existing code meets it. Enforce historical maxima,
including duplication detector granularity, against the immutable delivery base.

Apply the existing five SonarJS rules to JavaScript, include Node root configuration files in the
actual ESLint invocation, and include all authored CSS in Stylelint. Frozen navigation and jQuery UI
measurement styles may retain their recorded whitespace/media notation through exact-file cosmetic
rule exceptions; all semantic CSS checks still run. Do not rewrite frozen measurement bytes solely
for formatting. Record these exceptions in the quality matrix.

Re-enable unnecessary type assertion/type argument checks after compiler-verified fixes. Probe
void-expression/invalid-void/async rules with their documented options; narrow justified callback,
public overload, runtime-coercion, and fixture boundaries instead of removing defensive runtime
checks to satisfy static narrowing. Inventory every remaining disabled rule and effective scope.
Check actual CLI/automation type coverage separately from strict TypeScript; do not describe syntax
lint and process conformance as type analysis. Preserve coverage/package ratchets and add negative
controls for metric and effective-scope/rule changes.

GitHub main branch protection was read through its API: strict required checks are delivery (Node
24), static-delivery, CodeQL JavaScript and TypeScript, and dependency-review. Administrator bypass
is disabled and force pushes are disabled. Required approving reviews are not configured; document
that limitation rather than changing repository administration under this ticket.

The remaining seven broadly disabled typed rules will become default errors. Preserve existing
runtime/coercion/indexing allowances only in a counted exact-file inventory. A separate enabled-rule
probe must match each allowance count, and historical comparison forbids adding a file/rule
allowance or increasing its count after this initial baseline. Decreases require lowering the
recorded count. This makes legacy debt explicit and prevents new files from inheriting broad
exclusions. Test-only unsafe/mock rules and named public callback/overload exceptions retain
separate documented scopes.

Preserve the frozen resource-comparison fixture's redundant `textContent` non-null assertion as an
exact-file type-assertion exception. Its bytes are bound into historical measurement evidence; a
purely erased syntax cleanup does not justify replacing that evidence. The general non-null count
still includes this occurrence. Generated API reports change only evaluator spelling from explicit
`StarContext<StateRecord, ComputedRecord>` to its equivalent defaulted `StarContext`.

The first delivery report exposed a local coverage-ratchet gap: its explicit review base was null,
so coverage skipped historical threshold comparison despite a valid immutable HEAD. Use the review
base when supplied and HEAD otherwise. Resolve that commit before reading its threshold file; an
unreadable commit or malformed historical file must fail, while a valid commit without thresholds
retains the documented first-baseline rule. Prove local floor reductions, removed subsystem targets,
explicit-base precedence, missing identity, and invalid history in isolated Git fixtures.

The extracted server handlers also need direct coverage of method refusals, malformed Datastar
input, metrics, multipart account responses, autocomplete, permission reordering, and empty audit
results. Add focused HTTP tests with fresh API state per case. Add native-popover dismissal and
named form/questionnaire action tests for the three UI lines exposed by erased-assertion cleanup.

### Decisions

- Quality review precedes the final 0033 evidence run. Mutation 0053 follows it and remains planned.
- TypeScript and typed ESLint supply complementary type/correctness checks. SonarJS and complexity
  rules supply maintainability checks. Formatting remains the responsibility of Prettier.
- Primary references include the typescript-eslint shared-config documentation, SonarSource's
  cognitive-complexity documentation, and Stryker's Vitest runner documentation.

### Risks

Mechanical lint fixes can change cleanup or error semantics. Scope them by rule and verify affected
behavior. Green local checks cannot establish hosted branch protection or manual accessibility.
Large functions may require structural changes rather than cosmetic splits to reduce complexity.

### Verification plan

Inspect effective configurations, run rule/complexity measurements, exercise detector failures, run
affected behavior tests, then fast/delivery and phase validators. Record every limitation and
correction. Do not invoke Stryker or any mutation runner.

### Planned files

- Quality configuration, `scripts/quality/`, and detector tests where the inventory proves gaps.
- Runtime/CLI/automation/test files requiring corrections under the reviewed rules.
- `docs/QUALITY_PROGRAM.md`, `docs/TESTING.md`, quality-review evidence, roadmap, and this ticket.

## Code

### Changed-file ledger

| File                                                                                                               | Purpose                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This ticket                                                                                                        | Record the requested quality review before implementation.                                                                                               |
| `eslint.config.js`, `stylelint.config.js`, `scripts/quality/run-static.mjs`                                        | Enforce JavaScript SonarJS, actual root-config/CSS coverage, stronger typed defaults, and named callback/fixture boundaries.                             |
| `quality/metrics.json`, `scripts/quality/check-metrics.mjs`, `scripts/quality/static-self-test.mjs`                | Lower complexity to 65; compare metric and detector settings against immutable history; prove weakening/removal refusal.                                 |
| `quality/lint-boundaries.json`, `scripts/quality/check-lint-boundaries.mjs`                                        | Record 306 exact-file counted allowances for seven typed rules and enforce observed/historical counts.                                                   |
| `test/quality-standards.test.mjs`                                                                                  | Effective configs, JavaScript/CSS red-green examples, actual selectors, counted-rule defaults, expiry, and allowance ratchets.                           |
| `server/api.ts`, `src/csp/tokenizer.ts`                                                                            | Extract named HTTP route handlers and finite number reading while retaining behavior and error spans.                                                    |
| Compiler/lint-selected files under `src/` and `test/`, `e2e/quality-contracts.spec.ts`                             | Remove redundant type arguments/assertions; preserve unknown-input and intentionally invalid async fixture boundaries with explicit unknown annotations. |
| `docs/QUALITY_PROGRAM.md`, this ticket                                                                             | Current quality matrix, exact remaining overrides, measured debt, hosted settings, and evidence limitations.                                             |
| `package.json`                                                                                                     | Align standalone lint commands with enforced scopes and zero-warning behavior.                                                                           |
| Root/core/CSP reports under `etc/`                                                                                 | Record equivalent defaulted evaluator context types after compiler/lint cleanup.                                                                         |
| `scripts/quality/coverage-thresholds.mjs`, `scripts/quality/run-coverage.mjs`, `test/coverage-thresholds.test.mjs` | Enforce local HEAD/review-base coverage floors and fail closed on invalid historical evidence.                                                           |
| `test/server-routes.test.ts`, `test/ui-floating.test.ts`, `test/ui-form.test.ts`, `test/ui-questionnaire.test.ts`  | Add direct error, response, popover, and named-action coverage without shared server state.                                                              |

### Design changes

Plan activation passed before changes. The dispatcher dropped from cognitive complexity 145 to 30;
the tokenizer dropped from 107 to 63. All authored JavaScript now has the same ceiling (65) and five
SonarJS rules. Redundant type fixes are runtime-erased; JSON5 output is explicitly `unknown`, and
negative async contract fixtures use unknown input before a deliberate boundary cast. No runtime
guard was removed merely because TypeScript considered it redundant.

## Test

| Command                                      | Result   | Evidence                                                                                                                                                                                                               |
| -------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Current configuration inspection             | Findings | Broad rule overrides and complexity ceiling recorded above.                                                                                                                                                            |
| `npm run quality:fast`                       | Pass     | `2026-09-06T03-45-47-253Z-5864`: all six gates, 1,166 unit tests, and 23 static checks passed. Code-phase validator accepted this exact report before entering testing.                                                |
| Focused HTTP/UI/history suite                | Pass     | 47 tests passed in the repository; strict test TypeScript, focused ESLint, and the counted inventory also pass.                                                                                                        |
| `npm run test:coverage`                      | Pass     | `.git/jqstar/0052-focused-coverage/report.json`: every changed production line/function covered; aggregate lines 94.49%, functions 93.46%, branches 84.89%; historical floor comparison passes against HEAD `0d51340`. |
| `npm run quality:delivery` (`npm run check`) | Pass     | Exact report `2026-09-06T04-09-28-284Z-93807`; all 13 gates.                                                                                                                                                           |

Focused behavior validation passed 44 server/tokenizer/parser/engine tests after extraction. The
next focused run passed all 110 behavior tests but its three CSS controls expected an older
Stylelint diagnostic name. The installed analyzer correctly reported
`declaration-property-value-no-unknown`; corrected that exact assertion. All 15 quality-standard
cases then passed. Full ESLint passed, including the newly selected root JavaScript configs. The
counted-rule probe passed over 281 TypeScript files and all 307 allowances. Static metric and runner
self-tests passed against immutable base `0d51340`.

Fast run `2026-09-06T03-33-33-970Z-79662` passed all 1,164 unit tests and formatting, but exposed
three test-fixture compiler assumptions after erased-type cleanup and malformed/pending 0032 ledger
rows. Explicit tuple iteration, a typed adapter call, and an unknown-valued store field restore the
intended fixture types. A request-body type check avoids introducing another string-coercion
allowance. Removing the last fetch-test non-null assertion reduces the inventory to 306 allowances
and 1,068 non-null occurrences. The subsequent focused behavior/CLI run passed 100 tests.

The declaration build initially refused changed evaluator spelling. Review found only equivalent
defaulted `StarContext` aliases in root/core/CSP reports; regenerated those reports and preserved
existing line endings. The completed CSS/site/server/archive build and five CSP/doctor properties
passed. Code-phase validation passed. Changed API report lines use LF so the whitespace check passes
while other historical line endings remain untouched. Full delivery was still pending at that point.

Fast run `2026-09-06T03-44-05-300Z-93336` passed 1,166 unit cases and all static analyzers except
Markdownlint: two newly appended ledger rows had been wrapped as prose before joining the table.
Restored valid table rows and verified Markdownlint before repeating the required phase gate.

Delivery `2026-09-06T03-47-28-304Z-17710` passed 12 of 13 gates: 1,166 unit cases, 50 properties, 29
static checks, all package/release checks, and 481 browser cases across eight projects with zero
failed, skipped, or flaky cases. Coverage correctly rejected uncovered changed server/UI lines and
three extracted handlers despite 94.05% aggregate line coverage. Its report also exposed the null
local threshold baseline described above. Both findings are corrected under this ticket, without
lowering floors or reducing browser scope.

The drafted HTTP/UI tests passed 44 cases in an ignored scratch workspace while the original tree
remained frozen. The first scratch configuration selected a root-relative path twice, and Vite
refused jsdom files under `.git`; a separate ignored scratch root resolved those fixture issues. The
audit-search test now uses the actual indexed summary (permission priority), rather than the
presentation label. Three isolated-Git threshold tests passed, including negative controls.

Fast `2026-09-06T04-07-58-193Z-81029` passes all six gates with 1,199 unit cases after the coverage
corrections. Code-phase validation accepted the exact report. The current counted probe covers 283
TypeScript files with the same 306 allowances. A fresh full delivery run was required for phase
closure at that point.

Delivery `2026-09-06T04-09-28-284Z-93807` passed all 13 enforced gates with 1,199 unit tests, 50
property tests, 29 static checks, 481 browser cases, 13 package checks, seven release checks, and
the detector self-tests. No browser case failed, skipped, or passed only on retry. The exact report
was Test-phase validated before closure edits.

### Inspection ledger

| Finding                                                          | Resolution                                                    |
| ---------------------------------------------------------------- | ------------------------------------------------------------- |
| Historical tool inventory is insufficient for current completion | Inspect effective scopes and executable gates before closure. |

## Document

### Documentation changed

`docs/QUALITY_PROGRAM.md` documents actual scopes, lowered complexity, exact counted debt, coverage
history, detector checks, and hosted/manual limitations. This ticket records measurements, failed
runs, corrections, and current proof. The roadmap and 0033 include this review, while 0053 retains
the explicit deferred mutation boundary.

### Acceptance evidence

| Criterion | Result | Evidence                                                                                                                                                                                                                                                                                                                                     |
| --------- | ------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-01     | Pass   | `docs/QUALITY_PROGRAM.md` records each category, effective scope/rules/commands, detector and limitation, including PHPStan (TypeScript/typed ESLint), PHPMD (SonarJS/jscpd), and PHPCS (Prettier/style rules). Hosted protection was read separately and its review limitations are explicit.                                               |
| AC-02     | Pass   | Effective-config tests prove five SonarJS rules in JavaScript and TypeScript, actual root configuration/CSS selectors, and stronger typed defaults. The probe covers 283 TypeScript files and exactly 306 counted allowances; new files cannot inherit blanket exclusions. JavaScript process code remains explicitly outside type analysis. |
| AC-03     | Pass   | Historical metric, coverage, and package ratchets reject weaker ceilings/floors, removed targets, and environment bypasses. Three isolated-Git coverage tests prove explicit-base/local-HEAD behavior and invalid-history refusal. Static/package detector controls pass without mutation tooling.                                           |
| AC-04     | Pass   | Delivery `2026-09-06T04-09-28-284Z-93807` passes all 13 gates after HTTP/UI coverage corrections. All changed production lines/functions are covered, with 94.49% lines, 93.46% functions, and 84.89% branches. Public/brain guidance and the 0033 prerequisite inventory refer to current controls.                                         |
| AC-05     | Pass   | Ticket 0053 remains planned and requires later explicit execution authorization. No mutation dependency, automatic command, installation, configuration, or execution was introduced; 0048 exclusions remain enforced.                                                                                                                       |

### Completion audit

The measured JavaScript/CSS scope gaps and historical coverage gap are corrected. The HTTP
dispatcher complexity fell from 145 to 30 and the tokenizer from 107 to 63; the shared ceiling
is 65. Stronger typed defaults retain only named or counted boundaries. All delivery checks pass
without weakened floors, removed browser cases, or mutation execution. The matrix states remaining
type, manual-accessibility, and hosted-review limitations rather than claiming the tools prove them.

Status: Complete

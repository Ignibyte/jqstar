---
id: 0042
title: Install static, architecture, security, and documentation gates
status: testing
created: 2026-08-30
updated: 2026-09-03
---

# 0042: Install static, architecture, security, and documentation gates

## Plan

### Problem

The current compiler and ESLint setup catch important type and promise errors, but they do not
enforce the strongest typed rules, architecture boundaries, dead code, duplication, security,
documentation, package metadata, styles, or HTML. There is also no rule-liveness or no-suppressions
gate, so future configuration can silently narrow its own scope.

### Current evidence

- TypeScript already enables strict mode, unchecked-index checks, and exact optional properties.
- ESLint uses `typescript-eslint` recommended rules plus four selected typed rules.
- No dependency graph, unused-code, duplicate-code, Semgrep, CodeQL, gitleaks, Stylelint, HTML,
  Markdown, spelling, or link gate is configured.
- No inline ESLint or TypeScript suppressions were found in the searched project paths on
  2026-08-30.
- AIC and UCSOS v2 use separate production/test static analysis, architecture rules, unused and
  duplicate detection, security scans, source bans, documentation gates, and detector self-tests.

### Scope

- Split production, tests, registry source, server, CLI, scripts, and configuration into explicit
  TypeScript and lint scopes. Unknown or unexamined files fail the scope census.
- Adopt `typescript-eslint` `strictTypeChecked` correctness rules and a reviewed stylistic subset.
  Enforce zero warnings.
- Add SonarJS or equivalent maintained ESLint rules for cognitive complexity and bug patterns with
  measured, ratcheted limits rather than arbitrary defaults.
- Add Stylelint for shipped CSS and HTML validation for registry and example markup.
- Add dependency-cruiser rules for cycles, unresolved imports, source-to-test edges, core/UI/
  Datastar ownership, registry/runtime boundaries, and production imports of development packages.
- Add Knip for unused files, exports, dependencies, binaries, unresolved imports, and duplicate
  dependency declarations.
- Add `jscpd` for language-aware duplication with an explicit generated/vendor census and a
  ratcheted threshold.
- Add Semgrep JavaScript/TypeScript and project rules, GitHub CodeQL, gitleaks, `npm audit`,
  OSV-Scanner, lockfile integrity, license policy, and dependency-review checks.
- Add project source bans for unowned globals, handwritten Datastar event strings, unsafe path
  joins, accidental dynamic evaluation outside the trusted expression engine, private entry-point
  imports, test-only imports in production, and CSP graph violations.
- Add Markdownlint, spelling, link checking, actionable TODO/FIXME checks, JSON/schema validation,
  ShellCheck, and actionlint where applicable.
- Ban inline suppressions, ignored errors, generated baselines, skipped tests, and broad ignore
  globs unless they use the versioned deviation process.
- Add positive and negative sabotage fixtures for every custom rule and selector.
- Add observe → enforce transitions only when initial debt cannot be fixed atomically. Observe mode
  requires a measured count, owner, expiry, and a rule that rejects new violations. No observe gate
  remains at 1.0.

### Out of scope

- Treating stylistic preference as a correctness rule without a measured maintenance benefit.
- Adding a second type system solely to duplicate the TypeScript compiler.
- Auto-fixing source during a validation gate.
- Uploading private source to third-party services outside approved GitHub security processing.
- Freezing existing findings in baselines or permanent allowlists.

### Dependencies

- Ticket 0041.

### Planned files

- `eslint.config.js` and `tsconfig.quality.*.json` for explicit typed production, server, registry,
  test, automation, and configuration scopes.
- Tool-native static-analysis configuration for Stylelint, HTML validation, dependency-cruiser,
  Knip, jscpd, Semgrep, Markdownlint, cspell, schemas, licenses, and secret scanning.
- `quality/` for the machine-readable scope census, ratchets, deviations, and license policy.
- `scripts/quality/` for scope, source-policy, schema, link, lockfile, security, orchestration, and
  sabotage checks.
- `.github/workflows/` for hosted CodeQL and dependency-review checks.
- `package.json` and `package-lock.json` for pinned tool dependencies and public gate commands.
- `docs/DEVELOPMENT.md`, `docs/QUALITY_PROGRAM.md`, and this ticket for usage and evidence.

### Decisions

- On 2026-08-30, the user explicitly authorized tickets 0041 through 0044 as one coordinated
  implementation batch. Their dependencies govern final closure and receipt order, while coding and
  focused verification may overlap.
- Use one repository-owned static runner with `fast`, `delivery`, and explicitly acknowledged
  `full-audit` modes. Tool-native configurations remain directly runnable for diagnosis.
- Treat every tracked or unignored file as census input. A path must match exactly one scope, and
  every scope selector must fail under a planted mismatch.
- Use the `typescript-eslint` strict typed preset for TypeScript. Test code keeps typed parsing and
  correctness rules, with fixture-oriented unsafe-access and assertion-style rules reviewed
  separately from production.
- Keep trusted dynamic expression compilation and the legacy clipboard fallback as narrow
  file-scoped architecture decisions. Inline suppressions remain forbidden.
- Measure cognitive complexity and duplication from the complete current source set, commit their
  maxima, and allow environment values to tighten but never relax them.
- Run Semgrep, gitleaks, npm audit, OSV-Scanner, license, and lockfile checks locally in delivery
  mode. Keep CodeQL and dependency review as hosted required checks because they depend on GitHub
  services.
- A clean static checkout does not contain generated `dist/` bundles. Keep `no-unresolved`
  fail-closed while allowing only the two bundle edges owned by `scripts/smoke-built.mjs`; a
  sabotage case must prove that another unresolved import from that file still fails.
- Run the history secret scan with verbose, fully redacted output so a hosted failure identifies its
  rule, path, and commit without printing secret material.

### Acceptance criteria

- [x] [AC-01] Every tracked JavaScript, TypeScript, CSS, HTML, JSON, Markdown, shell, and workflow
      file is assigned to a quality scope or a documented non-code category.
- [x] [AC-02] Production and test TypeScript compile under their explicit configs with strict typed
      linting and zero warnings.
- [x] [AC-03] Dependency rules reject cycles, unresolved edges, production-to-test edges,
      runtime/registry ownership violations, and production use of development dependencies.
- [x] [AC-04] Knip rejects unused files, exports, dependencies, binaries, and unresolved imports
      without a generated baseline.
- [x] [AC-05] Duplication and complexity floors are measured, committed, and cannot decrease through
      an environment override.
- [x] [AC-06] CSS, HTML, Markdown, spelling, links, schemas, shell, and workflow files pass their
      named validators.
- [ ] [AC-07] Local Semgrep, gitleaks, package audit, OSV, lockfile, license, and source-ban gates
      are enforced. CodeQL is a required hosted check.
- [x] [AC-08] Suppression, baseline, skip, only, TODO-test, coverage-ignore, mutation-ignore,
      `nosemgrep`, and broad-ignore syntax is rejected unless tied to a live approved deviation.
- [x] [AC-09] Every custom detector and path selector has a sabotage fixture that proves red and
      green.
- [x] [AC-10] Missing binaries, stale caches, empty input sets, unreadable reports, and unmatched
      exclusions fail closed.
- [x] [AC-11] Every observe-mode rule has a recorded debt count and expiry, and the 1.0 gate
      contains no observe-mode quality checks.

### Design

Prefer tools that emit structured results and stable exit codes. Keep project-specific architecture
and security checks small, named, and self-tested. A generic tool configuration is not evidence
until a planted violation proves the rule and its file selector execute.

Use separate fix commands for developer convenience. Gate commands are read-only.

### Risks

- Enabling every opinionated lint rule at once can cause churn without finding bugs. Classify rules
  by correctness, architecture, security, maintainability, and style before enforcement.
- Dead-code tools can miss dynamic registry and CLI loading. Declare real entry points and add
  fixtures for every dynamic discovery mechanism.
- Duplicate detection can punish deliberate test tables or HTML examples. Exclusions must be
  semantic and liveness-tested, not directory-wide guesses.
- Network security services can be unavailable. Local mandatory checks remain fail closed, and
  hosted-only checks report their infrastructure status separately from a code verdict.

### Verification plan

- Run each analyzer against its sabotage fixture and the complete repository.
- Run architecture tests with forbidden and allowed import graphs.
- Run security tools against synthetic secrets, vulnerable fixtures outside production, and source
  ban examples.
- Prove the clean checkout and installed dependencies match the documented tool versions.
- Prove the clean checkout architecture graph passes without generated bundles while an unrelated
  missing import from the built-package smoke harness remains red.
- Prove Gitleaks diagnostic output remains fully redacted before relying on it in hosted logs.
- Run the fast, delivery, and full-audit gate modes plus `git diff --check`.

## Code

### Changed-file ledger

| File                                                            | Purpose                                                                |
| --------------------------------------------------------------- | ---------------------------------------------------------------------- |
| `docs/tickets/0042-*.md`                                        | Track the current phase, design, file ledger, commands, and evidence.  |
| `quality/scopes*.json`                                          | Define and validate the fail-closed tracked-file census.               |
| `quality/deviations*.json`                                      | Define the empty, versioned exception process.                         |
| `quality/metrics.json`                                          | Hold complexity and duplication ratchets.                              |
| `quality/licenses.json`                                         | Define allowed dependency licenses.                                    |
| `tsconfig.quality.*.json`                                       | Compile production, server, registry, and test scopes separately.      |
| `eslint.config.js`                                              | Enforce strict typed and measured SonarJS rules with zero warnings.    |
| `.dependency-cruiser.cjs`, `knip.json`                          | Enforce import ownership, resolution, and unused-code policy.          |
| `.jscpd.json`, `stylelint.config.js`                            | Enforce committed duplication, CSS, and generated-output boundaries.   |
| `.htmlvalidate.json`, `.markdownlint-cli2.jsonc`, `cspell.json` | Validate markup and prose.                                             |
| `.semgrep.yml`, `.gitleaks.toml`                                | Enforce repository SAST and secret rules.                              |
| `scripts/quality/run-static.mjs`                                | Run every selected analyzer, retain logs, and write one static report. |
| `scripts/quality/static-lib.mjs`                                | Provide tracked-path, process, and JSON helpers.                       |
| `scripts/quality/scope-census.mjs`                              | Require exact-one ownership for every tracked or unignored file.       |
| `scripts/quality/source-policy.mjs`                             | Enforce source bans and the live deviation process.                    |
| `scripts/quality/static-self-test.mjs`                          | Prove source, selector, orchestration, and signal-cleanup refusals.    |
| `scripts/quality/tool-self-test.mjs`                            | Prove dependency, Semgrep, and secret rules with temporary fixtures.   |
| `scripts/quality/check-*.mjs`                                   | Validate links, metrics, locks, licenses, and schemas.                 |
| `scripts/quality/lib/process.mjs`                               | Isolate analyzer groups, logs, timeouts, and termination cleanup.      |
| `schema/static-report.schema.json`                              | Publish and validate `jqstar-static-report/1`.                         |
| `.github/workflows/static-quality.yml`                          | Install pinned analyzers and run the static delivery command in CI.    |
| `.github/workflows/codeql.yml`                                  | Run hosted JavaScript and TypeScript CodeQL.                           |
| `.github/workflows/dependency-review.yml`                       | Reject vulnerable or disallowed pull-request dependencies.             |
| `package.json`, `package-lock.json`                             | Expose commands and lock JavaScript analyzers.                         |
| `src/`, `server/`, `registry/`, `test/`                         | Resolve strict typed, ownership, markup, and unused-export findings.   |
| `docs/DEVELOPMENT.md`, `docs/QUALITY_PROGRAM.md`                | Document commands, reports, policy, and recovery.                      |

### Design changes

- The static program uses repository-owned orchestration under `scripts/quality/`. Each third-party
  analyzer keeps its native configuration and exit code, while the orchestrator supplies
  deterministic selection, missing-tool refusal, and a single self-test entry point.
- Project-specific source policy and scope census checks are small Node modules with in-memory
  fixture APIs. Their sabotage suite plants one violation per rule and verifies both the rejected
  and accepted case without changing product files.
- Hosted CodeQL and dependency review remain separate required workflows. Local security gates use
  Semgrep, gitleaks, npm audit, OSV-Scanner, license checks, and lockfile verification.
- Static analyzers run to completion after ordinary failures and write isolated logs plus one
  `jqstar-static-report/1`. SIGINT and SIGTERM terminate the detached analyzer group, make the run
  red, and still produce a report containing every selected gate.
- Hosted static runs emit one escaped check annotation per failed gate and retain the complete
  `.git/jqstar` evidence directory for fourteen days, including when the command fails.

## Test

| Command                                                                  | Result           | Evidence                                                                                                                                                                               |
| ------------------------------------------------------------------------ | ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `node scripts/quality/static-self-test.mjs`                              | Pass             | Fourteen source detectors, every scope selector, continued execution after a red gate, schema output, and detached-child SIGTERM cleanup proved red and green.                         |
| `node scripts/quality/tool-self-test.mjs`                                | Pass             | Nine dependency-cruiser rules, six Semgrep rules, and fully redacted gitleaks diagnostics proved red and green in temporary fixtures.                                                  |
| `node --test test/quality-runner.test.mjs test/ticket-workflow.test.mjs` | Pass             | Runner, evidence, receipt, phase-report, document-mapping, and phase-refusal tests passed.                                                                                             |
| `node scripts/quality/scope-census.mjs`                                  | Pass             | All 419 current files were assigned to exactly one of 21 scopes.                                                                                                                       |
| `node scripts/quality/validate-json.mjs`                                 | Pass             | Forty JSON files parsed; three instances and fourteen schemas validated.                                                                                                               |
| `node scripts/quality/source-policy.mjs`                                 | Pass             | All 301 selected source files passed with no approved deviations.                                                                                                                      |
| `npm run quality:static`                                                 | Pass             | All 22 fast static gates passed after workflow hardening; report `static-2026-08-30T18-13-21-985Z-69740`.                                                                              |
| `npm run quality:static:delivery`                                        | Pass             | All 28 delivery static gates passed; report `static-2026-08-30T18-13-44-471Z-70596`.                                                                                                   |
| `npm run quality:static:full-audit`                                      | Pass             | All 28 acknowledged audit static gates passed; report `static-2026-08-30T18-14-19-303Z-73123`.                                                                                         |
| `npm run quality:fast`                                                   | Pass             | Run `2026-08-30T19-45-06-407Z-45616` passed ticket, runner, format, unit, and current static-fast gates.                                                                               |
| Static gate in `npm run quality:delivery`                                | Pass, 28 gates   | Canonical run `2026-08-31T04-45-57-403Z-62775` passed the complete local static and security stack on the immutable delivery tree.                                                     |
| Static gate in `npm run quality:full-audit`                              | Pass, 28 gates   | Canonical run `2026-08-31T04-58-57-044Z-87453` passed the acknowledged full static stack before the later browser failure.                                                             |
| Initial `npm run quality:static:delivery`                                | Fail, corrected  | Semgrep found the private-import literal in its own sabotage harness. The rule now excludes only that harness, and the external self-test still proves the rule red and green.         |
| Second `npm run quality:static:delivery`                                 | Fail, corrected  | Markdownlint found ignored Playwright diagnostics. The configuration now excludes named generated-output roots, and source policy rejects broad source ignores.                        |
| PR 1 GitHub workflow inventory                                           | Mixed            | CodeQL passes. Static quality and delivery run on the PR. Dependency Review starts but cannot evaluate until the repository Dependency Graph is enabled.                               |
| Static gate in final `npm run quality:delivery`                          | Pass, 28 gates   | Run `2026-08-31T15-21-08-168Z-69566` passed the complete static and security stack as part of the 13-gate delivery receipt for the unchanged current tree.                             |
| First hosted Static quality run                                          | Fail, diagnosing | Run `33790910133` reached `npm run quality:static:delivery` and exited 1. CodeQL run `33790910130` passed. The public check exposes no failed gate ID or retained static report.       |
| Clean-checkout static reproduction on macOS                              | Pass, 28 gates   | Detached commit `9526d09` passed every static delivery gate, narrowing the hosted failure to the Linux runner or its installed tool behavior.                                          |
| `npx actionlint .github/workflows/static-quality.yml`                    | Fail, corrected  | Actionlint is a pinned external Go binary rather than an npm executable. Verification uses the installed `actionlint` binary directly.                                                 |
| First hosted-evidence `npm run quality:fast`                             | Fail, corrected  | Run `2026-09-03T18-46-56-938Z-59141` found only ticket formatting from the final ledger edit; unit, workflow, runner, and static-fast checks passed.                                   |
| Final hosted-evidence `npm run quality:fast`                             | Pass             | Run `2026-09-03T18-48-01-037Z-67904` passed ticket workflow, runner self-tests, formatting, unit tests, and all selected static-fast gates.                                            |
| PR 1 hosted Static quality run                                           | Fail, actionable | Run `33796882050` retained artifact `static-quality-1` and identified only `dependency-architecture` and `gitleaks-history` as red; the other 26 static gates passed.                  |
| Pinned Gitleaks 8.30.1 merge-ref reproduction                            | Pass             | The official checksum-verified Darwin arm64 binary scanned the 25-commit PR merge graph with fully redacted output and found no leak, isolating the remaining finding to hosted Linux. |
| Corrected `npm run quality:static:delivery`                              | Pass, 28 gates   | Report `static-2026-09-03T19-41-42-097Z-55789` passed the strict architecture graph, nine-rule sabotage suite, and both secret scans.                                                  |

### Inspection ledger

| Finding                                                                                                        | Resolution                                                                                                                              |
| -------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| A static analyzer failure stopped visibility into later analyzers.                                             | The runner now executes every selected gate, keeps isolated logs, and writes a deterministic combined report before failing.            |
| An outer timeout could kill the static runner while leaving its analyzer's detached process group alive.       | SIGINT/SIGTERM handlers call `terminateActiveChildren`; a real subprocess sabotage proves the nested PID is gone and the report is red. |
| A post-interrupt tool-version probe could start a new detached child after termination began.                  | `runGate` skips the version subprocess once the static runner records an interruption.                                                  |
| Semgrep scanned a planted private import inside its own harness.                                               | Only `scripts/quality/tool-self-test.mjs` is excluded from that rule's repository pass; its temporary fixture remains mandatory.        |
| Generated browser diagnostics entered the Markdownlint input.                                                  | The Markdownlint ignore list names only generated roots already excluded from the source census.                                        |
| `jscpd@5.1.0` references a nonexistent optional Windows package and breaks clean `npm ci`.                     | The manifest pins `jscpd` to `5.0.16`, whose optional dependency graph installs reproducibly.                                           |
| The first hosted static failure exposed only a step exit code, and the standalone workflow retained no report. | Reopened Code to publish failed gate IDs as GitHub annotations and retain `.git/jqstar` evidence on every hosted static run.            |
| Clean CI lacks the `dist/` files referenced by the built-package smoke test.                                   | Only those two generated edges are allowed; a ninth architecture sabotage proves another missing import from the same script stays red. |
| Gitleaks 8.30.1 reports one finding on Linux but none for the same 25-commit merge graph on macOS.             | The history gate now emits verbose, fully redacted metadata; its sabotage proves the output contains `REDACTED` and not the secret.     |

## Document

### Documentation changed

- `docs/DEVELOPMENT.md` lists standalone and canonical commands, required external analyzers, report
  locations, failure recovery, deviation policy, and termination behavior.
- `docs/QUALITY_PROGRAM.md` records the enforced static stack, measured maxima, mode membership,
  sabotage coverage, fail-closed orchestration, and nested-process cleanup.
- `.github/workflows/static-quality.yml`, `.github/workflows/codeql.yml`, and
  `.github/workflows/dependency-review.yml` make the hosted security responsibilities explicit.

### Acceptance evidence

| Criterion | Evidence                                                                                                                                                          | Result  |
| --------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- |
| AC-01     | Scope census assigned all 419 files; every selector and unmatched/ambiguous path case has sabotage proof.                                                         | Pass    |
| AC-02     | Four explicit TypeScript configs and strict typed ESLint passed with zero warnings in all three static modes.                                                     | Pass    |
| AC-03     | Nine forbidden dependency graphs failed under their named dependency-cruiser rules; the clean repository graph passed without generated bundles.                  | Pass    |
| AC-04     | Knip passed without a generated baseline; dynamic entry points are declared in committed configuration.                                                           | Pass    |
| AC-05     | Cognitive complexity is capped at 149 and duplicated lines at 2.99%; self-tests prove environment values cannot relax either maximum.                             | Pass    |
| AC-06     | Stylelint, HTML Validate, Markdownlint, cspell, local links, JSON schemas, ShellCheck, and actionlint passed.                                                     | Pass    |
| AC-07     | Local security gates and hosted CodeQL pass. Hosted Linux Gitleaks diagnosis, Dependency Graph enablement, and required-check verification remain.                | Pending |
| AC-08     | Fifteen source-policy sabotage cases passed; the committed deviation list is empty and the schema rejects invalid or expired records.                             | Pass    |
| AC-09     | Every source detector and scope selector plus nine dependency, six Semgrep, and one secret rule proved red and green.                                             | Pass    |
| AC-10     | Missing/error results, empty selections, unreadable evidence, timeouts, continued execution, structured reports, and nested signal cleanup have executable proof. | Pass    |
| AC-11     | Every configured static gate is enforced; the deviation list and observe-mode debt count are empty.                                                               | Pass    |

### Completion audit

The standalone and canonical static implementations have been audited against all acceptance
criteria. Fast passed 22 of 22 gates; delivery and full audit each passed 28 of 28. The current
corrected delivery-static report passes all 28 gates, including the ninth architecture sabotage and
fully redacted Gitleaks diagnostics.

PR 1 proves that CodeQL passes and that hosted static reports survive a red run. Its first static
report isolated two failures: generated bundle edges in a clean checkout and a Linux-only Gitleaks
finding. The bundle-edge fix passes locally, and the next hosted run will provide safe metadata for
the remaining finding. Dependency Review also requires the repository Dependency Graph to be enabled
before AC-07 and required-check verification can close.

Status: Testing

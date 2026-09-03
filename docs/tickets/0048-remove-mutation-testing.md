---
id: 0048
title: Remove mutation testing from the quality workflow
status: done
created: 2026-08-31
updated: 2026-09-01
---

# 0048: Remove mutation testing from the quality workflow

## Plan

### Problem

Mutation testing adds several minutes to an ordinary changed-code delivery and several hours to a
full audit. It also retains Stryker sandboxes, large raw reports, dependencies, schemas, policy
ratchets, and self-test fixtures. This cost now outweighs the signal it provides for jQStar's normal
ticket workflow.

### Current evidence

- The completed lifecycle ticket required repeated 11-minute mutation phases inside 18-minute
  delivery runs.
- Mutation-only files under `.git/jqstar`, `.stryker-tmp`, and installed mutation packages currently
  account for more than 100 MB before their transitive dependencies are counted.
- `quality:delivery` and `quality:full-audit` schedule mutation automatically, so users cannot opt
  out without bypassing the canonical workflow.

### Scope

- Remove Stryker dependencies, npm commands, configs, wrappers, report parsers, schemas, policies,
  ratchets, gates, fixtures, and mutation-specific runner tests.
- Remove mutation enrollment from the production census and static source policy.
- Keep coverage, property tests, unit tests, browser/accessibility tests, package tests, static
  analysis, self-hosting, and reproducible-release checks.
- Update active quality, development, testing, roadmap, and project-brain documentation.
- Delete local mutation sandboxes and mutation-only generated evidence.
- Remove abandoned release-quality sandboxes and make the release checker clean its per-run
  temporary workspace after success, failure, or an interrupt signal.
- Record that mutation testing may return only through a future explicitly requested ticket.

### Out of scope

- DOM `MutationObserver` behavior, DOM mutation budgets, resource write mutations, HTTP mutation
  routes, and other product features that use the ordinary word “mutation.”
- Weakening coverage, static analysis, browser, accessibility, package, release, or ticket gates.
- Rewriting historical ticket evidence that accurately records past mutation runs.

### Acceptance criteria

- [x] [AC-01] The package has no Stryker dependency, config, npm command, report schema, policy, or
      executable mutation-testing implementation.
- [x] [AC-02] Fast, delivery, and full-audit modes do not schedule or require mutation testing.
- [x] [AC-03] The production census, quality runner contracts, static self-tests, schemas, and
      detector self-tests pass without mutation-specific cases.
- [x] [AC-04] Active documentation says mutation testing is excluded unless a future ticket is
      explicitly requested for it.
- [x] [AC-05] Local mutation sandboxes and generated mutation evidence are removed, with reclaimed
      space measured.
- [x] [AC-06] `npm run check` passes with all remaining quality gates enforced.
- [x] [AC-07] All 62 abandoned `jqstar-release-quality-*` directories are removed, and the release
      checker cannot retain its temporary workspace after success, failure, or
      SIGINT/SIGTERM/SIGHUP.
- [x] [AC-08] All 107 abandoned `jqstar-package-quality-*` directories are removed, and the package
      checker uses the same owned cleanup lifecycle instead of retaining installed consumers.

### Design

Remove the feature vertically instead of merely skipping one gate. The dependency graph, commands,
configuration, quality-mode definitions, evidence schemas, parsers, policy ratchets, test fixtures,
census fields, and documentation must agree that mutation testing is absent. Preserve the general
quality runner and every non-mutation gate.

### Decisions

- Mutation testing is not optional dormant configuration. It is removed from the repository.
- Historical tickets keep their past evidence. Ticket 0048 and active documentation define the
  current policy.
- Reintroduction requires an explicit user request and a new Plan → Code → Test → Document ticket.

### Security and accessibility

- Security and accessibility gates remain unchanged.
- Removing mutation testing must not remove source-policy checks unrelated to Stryker suppression.

### Risks

- Mutation-specific assumptions are spread through runner contracts and schemas; a partial removal
  could make delivery fail or leave misleading documentation.
- Deleting generated files must be limited to mutation-only paths so other quality receipts and
  browser/package evidence remain intact.
- Release cleanup must target only the unique directory created by the current process. A process
  must never sweep other concurrent release runs.

### Verification plan

- Search tracked files and package metadata for Stryker and mutation-testing implementation terms.
- Run focused runner, schema, source-policy, and quality self-tests.
- Run `npm run check` and inspect the gate list to prove mutation is absent.
- Measure mutation-only artifact and dependency disk use before and after cleanup.
- Exercise release-workspace cleanup independently for successful, failed, and signaled processes.

### Planned files

- `package.json`, `package-lock.json`: Remove Stryker commands and dependencies.
- `quality/gates.mjs`, `quality/production-census.json`, `quality/scopes.json`,
  `quality/test-evidence.json`: Remove mutation gates and enrollment.
- `scripts/quality-0044-self-test.mjs`, `scripts/quality-release.mjs`,
  `scripts/quality/static-self-test.mjs`, `scripts/quality/source-policy.mjs`: Remove mutation-only
  fixtures, exclusions, and suppression checks.
- `test/quality-runner.test.mjs`, `test/quality/quality-gates.test.mjs`, quality self-tests: Remove
  mutation-only expectations while preserving the remaining detector contracts.
- `vitest.config.ts`, `vitest.coverage.config.ts`, `vitest.property.config.ts`: Remove Stryker
  sandbox exclusions that no longer have a producer.
- `docs/{DEVELOPMENT,TESTING,QUALITY_PROGRAM,LIBRARY_EXPANSION_PLAN,README}.md`,
  `docs/tickets/ROADMAP.md`: Record the smaller quality program and explicit opt-in policy.
- Mutation-only config, policy, schema, scripts, and tests: Delete them.
- `.gitignore`: Remove the obsolete Stryker sandbox entry.
- `docs/tickets/0048-remove-mutation-testing.md`: Plan, ledger, commands, cleanup measurement, and
  acceptance evidence.

## Code

### Changed-file ledger

| File/group                                                                                                                                                                                  | Purpose                                                                                 |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `package.json`, `package-lock.json`, `.gitignore`                                                                                                                                           | Remove Stryker packages, commands, and sandbox exclusion.                               |
| `quality/{gates,production-census,scopes,test-evidence}.*`                                                                                                                                  | Remove mutation gates, source enrollment, and detector requirements.                    |
| `scripts/quality/{mutation-report,mutation-scope,run-mutation}.mjs`, `quality/mutation-policy.json`, `schema/mutation-report.schema.json`, `stryker.config.mjs`, `vitest.stryker.config.ts` | Delete the executable mutation-testing stack.                                           |
| `scripts/quality/{source-policy,static-self-test}.mjs`, `scripts/quality-0044-self-test.mjs`                                                                                                | Remove obsolete mutation suppression fixtures and keep the remaining self-tests exact.  |
| `scripts/quality-{package,release}.mjs`, `scripts/quality/lib/owned-temporary-directory.mjs`                                                                                                | Remove package and release sandboxes in a `finally` path and before signal termination. |
| `test/fixtures/owned-temporary-directory-signal.mjs`, `test/package-release-hardening.test.mjs`                                                                                             | Prove success, failure, SIGHUP, SIGINT, and SIGTERM cleanup behavior.                   |
| `test/quality-runner.test.mjs`, `test/quality/quality-gates.test.mjs`                                                                                                                       | Remove mutation gate and report expectations without weakening the runner.              |
| `vitest.config.ts`, `vitest.coverage.config.ts`, `vitest.property.config.ts`                                                                                                                | Remove obsolete Stryker discovery exclusions.                                           |
| `docs/{DEVELOPMENT,TESTING,QUALITY_PROGRAM,LIBRARY_EXPANSION_PLAN,README}.md`, `docs/tickets/ROADMAP.md`                                                                                    | Define the smaller quality stack and explicit-request-only mutation policy.             |
| Generated `.stryker-tmp`, mutation evidence, and `/var/folders/.../T/jqstar-{package,release}-quality-*` directories                                                                        | Reclaim mutation artifacts and 169 abandoned quality workspaces.                        |

### Design changes

Mutation testing is removed vertically rather than left as dormant configuration. Package- and
release-quality workspaces remain isolated, but ownership and cleanup now belong to the process that
creates each unique directory. The cleanup helper registers SIGHUP, SIGINT, and SIGTERM handlers,
removes only its owned directory, unregisters those handlers, and then restores normal signal
termination.

## Test

| Command                                                                  | Result | Evidence                                                                                                                                                               |
| ------------------------------------------------------------------------ | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan-phase ticket validation                                             | Pass   | `npm run ticket:validate -- --ticket 0048 --phase plan` passed before implementation.                                                                                  |
| Initial `npm run quality:fast`                                           | Fail   | Four gates passed; ESLint found two declarations left unused after removing the mutation runner tests.                                                                 |
| `node --test test/quality-runner.test.mjs test/ticket-workflow.test.mjs` | Pass   | All 32 runner and workflow contract tests passed.                                                                                                                      |
| `npx vitest run test/quality/quality-gates.test.mjs`                     | Pass   | All 11 remaining quality-gate contract tests passed.                                                                                                                   |
| `npx vitest run test/package-release-hardening.test.mjs`                 | Pass   | All 11 tests passed, including cleanup after success, failure, SIGHUP, SIGINT, and SIGTERM.                                                                            |
| `npm run quality:fast`                                                   | Pass   | Five gates passed in run `2026-09-01T03-22-18-087Z-3684`; no mutation gate was scheduled.                                                                              |
| Code-phase ticket validation                                             | Pass   | The current fast report closed the Code phase before the ticket entered `testing`.                                                                                     |
| Generated-artifact inspection                                            | Pass   | All 62 abandoned release directories, `.stryker-tmp`, mutation evidence directories, and mutation logs are absent. Filesystem free space reached 80 GiB after cleanup. |
| `npm run check` (`quality:delivery`)                                     | Pass   | Run `2026-09-01T03-23-59-700Z-11521` passed all 12 remaining gates in about nine minutes; no mutation gate was present.                                                |
| Test-phase validation with `.git/jqstar/latest-report.json`              | Fail   | The receipt authorizes the immutable run report path rather than the convenience copy; no code change was needed.                                                      |
| Test-phase validation with the receipt-authorized report                 | Pass   | Ticket 0048 passed against `.git/jqstar/runs/2026-09-01T03-23-59-700Z-11521/report.json`.                                                                              |
| Package-temp inspection and cleanup                                      | Pass   | Removed 107 abandoned package-quality directories totaling 8.59 GiB; the resolved temp root then contained zero jQStar package/release workspaces.                     |
| Package/release hardening regression                                     | Pass   | All 11 focused tests passed after routing both runners through the owned cleanup contract.                                                                             |

### Inspection ledger

| Finding                                                               | Resolution                                                                                                              |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Release quality created a unique sandbox but never disposed of it.    | Added owned-directory cleanup for success, errors, and termination signals, with regression coverage.                   |
| Package quality retained every installed-consumer workspace.          | Routed its unique temp directory through the same success, failure, and signal cleanup helper; removed 107 old copies.  |
| Removing mutation-specific runner tests left two unused declarations. | Removed the declarations; the rerun passed ESLint and the complete fast gate.                                           |
| Active source still contains ordinary uses of “mutation.”             | Confirmed they are DOM `MutationObserver` product behavior or historical ticket evidence, both explicitly out of scope. |

## Document

### Documentation changed

- `docs/README.md`, `docs/DEVELOPMENT.md`, and `docs/TESTING.md` describe the active commands,
  explicit-request-only mutation policy, and owned release-sandbox lifecycle.
- `docs/QUALITY_PROGRAM.md` removes mutation from the quality matrix and retains coverage, generated
  properties, static analysis, browser/accessibility, package, and release controls.
- `docs/LIBRARY_EXPANSION_PLAN.md` and `docs/tickets/ROADMAP.md` remove mutation requirements from
  the forward plan and record ticket 0048 as the superseding decision.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                     | Result |
| ----- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | Package inspection reports no direct Stryker packages; mutation configs, commands, policies, schemas, and executable scripts are absent.                                     | Pass   |
| AC-02 | The passing delivery report contains exactly 12 gates and no mutation gate; the fast and full-audit mode contracts also pass.                                                | Pass   |
| AC-03 | Runner/workflow tests passed 32/32, quality-gate contracts passed 11/11, and delivery static/self-test gates passed.                                                         | Pass   |
| AC-04 | The active development, testing, quality-program, expansion-plan, project-brain, and roadmap documents state the explicit-request-only policy.                               | Pass   |
| AC-05 | `.stryker-tmp`, mutation evidence directories, and mutation log counts are all zero; `.git/jqstar` is 2.1 GiB after removing about 85 MiB of mutation evidence.              | Pass   |
| AC-06 | `npm run check` passed all 12 non-mutation delivery gates in run `2026-09-01T03-23-59-700Z-11521`.                                                                           | Pass   |
| AC-07 | All 62 abandoned release directories were deleted; regression tests pass for success, failure, SIGHUP, SIGINT, and SIGTERM, and two real release runs left zero directories. | Pass   |
| AC-08 | All 107 package directories (8.59 GiB) were deleted; both quality runners now use owned cleanup, and the resolved temp root contains zero matching directories.              | Pass   |

### Completion audit

The mutation-testing stack, automatic scheduling, generated evidence, dependencies, and active
documentation requirements are removed. Coverage and every other quality family remain enforced. The
package and release checkers own and dispose of only their current sandboxes, and no abandoned
quality sandbox remains in the resolved macOS temp root.

Status: Complete

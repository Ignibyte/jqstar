---
id: 0070
title: Isolate the UI ownership host
status: done
created: 2026-09-27
updated: 2026-09-27
---

# 0070: Isolate the UI ownership host

## Plan

### Problem

The UI document-ownership suite loads the full integrated Lab before each independent iframe
scenario. Its helpers install the actual core and UI plugin in their own documents, so the host adds
unrelated website work to hundreds of browser cases.

### Current evidence

Hosted delivery `36312169650`, report `2026-09-27T10-22-57-258Z-17424`, passes all 11 non-matrix
gates, all 77 component cases, and all 592 cases in both Chromium and Firefox. WebKit reaches its
unchanged 900,000-millisecond project bound before completing. Its result JSON is missing; partial
output cannot authorize delivery. The output also records a structural ownership retry. No finalized
failure report or retained trace explains its source. The logged first attempt counts six patch
mutations against the four-record limit; the retry counts four. All other logged metrics match. The
source of those two additional mutation records remains unresolved.

`e2e/ui-document-ownership.spec.ts` contains 56 host navigations to the complete Lab. Its fixture
imports the real source modules and jQuery factory and creates blank same-origin iframe documents.
No helper imports website CSS or markup. The trusted pointer and drag scenarios use their own inline
layout styles inside a fixed iframe. Full site integration remains covered separately.

### Scope

Serve a minimal standards-mode HTML host through development-only Vite middleware. Navigate only the
isolated UI document-ownership suite to it. Preserve every case, helper, assertion, import, iframe,
native interaction, and cleanup contract. Retain rejected hosted evidence and document why these
independent scenarios do not need the website application.

### Out of scope

Runtime or product behavior, fixture helpers, the frozen structural ownership workload, security
remediation, site integration cases, browser projects, workers, deadlines, retries, failure policy,
pins, budgets, sharding, mocks, publication, deployment, or branch protection.

### Acceptance criteria

- [x] [AC-01] A private development-only host provides a standards-mode same-origin document without
      loading Lab markup, styles, application modules, or automatic runtime installation. It is not
      a production build entry or package file.
- [x] [AC-02] All 56 UI ownership navigations use that host. All scenario bodies, assertions, actual
      source imports, native pointer/drag interactions, and helper code remain identical. Full site
      and frozen structural ownership cases retain their existing hosts.
- [x] [AC-03] The complete UI ownership suite passes in all three desktop engines with three workers
      and retries disabled. Native dragging and structural ownership also pass repeated focused
      proof. Fast and complete delivery retain 77 component and 1,804 matrix cases.
- [x] [AC-04] Quality guidance, brain, roadmap, and ticket retain the rejected hosted run and the
      unresolved retry. Exact phase validation, final documented-tree check, and receipts precede
      commit. Complete hosted proof and the pending security scope decision remain merge conditions.

### Design

Extend the existing development middleware in `vite.demo.config.ts` with an exact
`/__quality__/ui-document/` route. Return a small doctype, English HTML document, charset, title,
and empty body with the HTML content type. Do not add it to website build inputs or transform the
response through site composition. Replace only the Lab navigation literals in the isolated suite.

### Decisions

- Keep real browser documents and actual runtime installation in the scenario helpers.
- Preserve the website integration workload in the dedicated site cases.
- Keep all proof settings and budgets unchanged.
- Investigate the separate ownership retry only when actual failure evidence is available.

### Risks

A host dependency could have been implicit. Inspect every helper and retain all native interaction
proof across engines, including trusted dragging. A faster local run does not establish hosted
completion or explain the unrelated ownership retry. Partial execution remains failed delivery.

### Verification plan

Validate Plan before edits. Run the entire isolated suite across all three desktop engines with
three workers and retries disabled. Repeat trusted dragging and structural ownership three times
across those engines. Inspect the exact diff to require navigation-only scenario changes. Run fast
proof and Code validation, then record fast Pass in the Test table before entering testing. Run
complete delivery against main, exact Test validation, and receipt verification before documentation
edits. Complete acceptance evidence and audit, validate Document and changed tickets, run final
`npm run check`, verify receipt before and after staging, commit, push, and inspect hosted checks.

### Planned files

- `vite.demo.config.ts`: serve the private minimal development host.
- `e2e/ui-document-ownership.spec.ts`: change only isolated scenario host navigation.
- `docs/QUALITY_PROGRAM.md`: retain rejected hosted evidence and explain the host boundary.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the correction.
- This ticket: maintain phase, changed-file, command, and acceptance evidence.

## Code

### Changed-file ledger

| File                                | Purpose                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `vite.demo.config.ts`               | Serve an exact private empty host only in development middleware.                         |
| `e2e/ui-document-ownership.spec.ts` | Change only 56 isolated scenario host navigations.                                        |
| `docs/QUALITY_PROGRAM.md`           | Record rejected hosted execution, the unresolved mutation source, and private host scope. |
| `docs/README.md`                    | Link the private UI ownership host from the brain.                                        |
| `docs/tickets/ROADMAP.md`           | Record the preserved real-document proof and merge conditions.                            |
| This ticket                         | Record the plan, rejected hosted proof, and exact phase evidence.                         |

### Design changes

Plan validation passes before edits. The exact private route serves an empty standards-mode document
in development middleware. Only the 56 host navigation literals change in the isolated suite. The
scenario helpers, assertions, native interactions, and dedicated site cases remain unchanged.

## Test

| Command                                                                                                                 | Result | Evidence                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Hosted delivery `36312169650`                                                                                           | Fail   | WebKit reaches its 900,000-millisecond project bound without final results. Partial output records an unexplained ownership retry. All other executed gates pass.                                                                     |
| Private host native browser inspection and exact source comparison                                                      | Pass   | Standards mode, English HTML, empty body, zero scripts/styles/resources, and no global jQuery. All 56 navigation replacements are exact; helpers, structural proof, and site sources have no diff.                                    |
| Complete UI ownership suite across three desktop engines, `--workers=3 --retries=0`                                     | Pass   | All 1,170 cases pass in 2.4 minutes, without failures, flakes, or skips. Evidence: `.git/jqstar/ticket0070-ui-host/results.json`.                                                                                                     |
| Trusted dragging and structural ownership, three repetitions across three engines, `--workers=3 --retries=0`            | Pass   | All 27 cases pass in 13.9 seconds without failures, flakes, or skips. Every structural result retains four mutation records and all original bounds. Evidence: `.git/jqstar/ticket0070-native/results.json`.                          |
| Separate mutation-record diagnostic, nine WebKit repetitions                                                            | Pass   | Each observes exactly four body insertion/removal records. The hosted two-record difference does not reproduce locally and remains unresolved. Evidence: `.git/jqstar/ticket0070-ownership-diagnostic.json`.                          |
| Official Node 24 three-worker `npm run quality:fast`                                                                    | Fail   | Report `2026-09-27T11-23-19-190Z-37295` passes five gates, including all 77 component cases and static analysis. Formatting rejects this new ticket; targeted formatting corrects it before a fresh fast run.                         |
| Official Node 24 `JQS_E2E_WORKERS=3 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast` | Pass   | All six gates pass in `2026-09-27T11-25-50-964Z-45869`. Exact Code validation passes before entering testing.                                                                                                                         |
| Official Node 24 three-worker `npm run quality:delivery`                                                                | Pass   | All 12 gates, all 77 component cases, and all 1,804 matrix cases pass in `2026-09-27T11-28-06-096Z-54411` without failures, flakes, or skips. Exact Test validation and receipt pass before documentation.                            |
| Preliminary production inspection during package rebuilding                                                             | Error  | The output directory was unavailable while the package gate replaced build output. This attempt cannot establish exclusion; inspect the completed build instead. Evidence: `.git/jqstar/ticket0070-production-inspection-error.json`. |
| Completed production and compressed-site inspection                                                                     | Pass   | All 44 production files and all 43 bundled files omit the private host. The development configuration is outside the package manifest. Evidence: `.git/jqstar/ticket0070-production-exclusion.json`.                                  |
| Initial final check stopped for an acceptance-reference correction                                                      | Error  | Run `2026-09-27T11-45-25-315Z-93789` was interrupted before completing. The acceptance table now identifies the separate passing fast and delivery reports explicitly; a fresh final check binds the corrected tree.                  |

### Inspection ledger

| Finding                                                                     | Resolution                                                                          |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Isolated iframe scenarios start the entire unrelated Lab application.       | Serve a private empty document while retaining all real scenario code.              |
| The structural ownership case retries before the project process is killed. | Keep the failure unresolved until a finalized report or trace identifies its cause. |

## Document

### Documentation changed

Quality guidance retains rejected hosted evidence and the unresolved mutation source, and explains
the private host boundary. The brain and roadmap link this correction. Public runtime usage,
production website behavior, backend contracts, and package surfaces are unchanged.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                                                                   | Result |
| ----- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `vite.demo.config.ts` serves the exact private route only through development middleware. Native browser inspection confirms standards mode, an empty body, zero scripts/styles/resources, and no automatic runtime. The production build and package omit the private host.                                                                                               | Pass   |
| AC-02 | Exact source comparison confirms only 56 navigation literals change in `e2e/ui-document-ownership.spec.ts`. All helpers, assertions, source imports, trusted pointer/drag behavior, cleanup, frozen workload, and dedicated site cases remain unchanged.                                                                                                                   | Pass   |
| AC-03 | All 1,170 UI ownership cases pass across the three desktop engines with three workers and retries disabled. All 27 repeated native/structural cases pass. Fast report `2026-09-27T11-25-50-964Z-45869` passes six gates; delivery report `2026-09-27T11-28-06-096Z-54411` passes all 12, retaining 77 component and 1,804 matrix cases without failures, flakes, or skips. | Pass   |
| AC-04 | Quality guidance, brain, roadmap, and ticket retain rejected hosted proof and its unexplained mutation difference. Exact Code and Test validations and Test receipt pass before documentation. Final documented-tree check and receipts precede commit; complete hosted checks and the separately requested security scope decision remain merge conditions.               | Pass   |

### Completion audit

The private development host supplies an empty standards-mode document for all 390 independent UI
ownership scenarios. Their actual runtime and jQuery imports, iframe documents, assertions, cleanup,
and trusted pointer/drag interactions remain unchanged. Site integration and the frozen structural
ownership workload continue using their existing hosts. Production build entries and package
surfaces contain no private host.

All 1,170 isolated cases and 27 repeated native/structural cases pass with three workers and retries
disabled. Fast and complete delivery pass without failures, flakes, or skips. All proof settings,
pins, and budgets remain unchanged. Failed hosted execution and its first-attempt six-record
mutation result remain evidence. Nine separate local diagnostic runs see only the expected four body
insertion/removal records; the two additional hosted records remain unexplained.

Run final `npm run check` for this documented tree and verify its receipt before and after staging
before commit. Keep the final report identifier in the PR body or `.git` evidence so the tested
source fingerprint stays fixed. Complete hosted checks and the separately requested security scope
decision remain merge conditions. This ticket claims neither hosted success nor security
remediation.

Status: Complete

---
id: 0065
title: Await component fixture initialization
status: done
created: 2026-09-26
updated: 2026-09-26
---

# 0065: Await component fixture initialization

## Plan

### Problem

Native Lab controls are available before the page entry module finishes its asynchronous Lab
initialization. The component fixture currently waits only for page load, so an immediate native
select change can happen before its action listener exists. Virtual-window setup also starts result
assertions before explicitly awaiting the initial SDK operation.

### Current evidence

Final check `2026-09-27T02-02-45-707Z-93385` passes 11 gates, including all 1,726 complete browser
matrix cases, but rejects one flaky component cancellation case: 75 pass and one is flaky. The trace
records the View selection followed by five unchanged initial rows; it contains no project API
request. `example/site.ts` uses top-level await to import the Lab, while the fixture waits only for
navigation load. The browser can fire load before that asynchronous evaluation completes. The
matching successful retry does not authorize delivery. Ticket 0064's complete Test-phase report
remains valid evidence for its implementation, but this final check has no eligible receipt.

The
[HTML script processing model](https://html.spec.whatwg.org/multipage/scripting.html#execute-the-script-block)
runs a module and continues without awaiting its returned evaluation promise; the
[module execution contract](https://html.spec.whatwg.org/multipage/webappapis.html#run-a-module-script)
returns that promise. Together with the trace and top-level Lab import, this supports the fixture
initialization diagnosis. Importing the same module URL reuses its evaluation.

### Scope

Await the exact entry module already declared by the Lab page before component tests interact. For
both virtual-mode cases, register an exact initial-window response wait before changing View, then
check successful body completion and loading completion before the existing row assertions.

### Out of scope

Runtime or page initialization changes, security remediation, new public hooks, timeout increases,
retry changes, reduced coverage, worker changes, package budgets, publication, deployment, and
branch protection changes.

### Acceptance criteria

- [x] [AC-01] Component fixture setup awaits evaluation of the page's own declared entry module
      before test interactions, without adding runtime hooks or sleeps.
- [x] [AC-02] Both virtual-mode cases await the initial SDK response for start zero and completed
      loading before existing row assertions. Later exact windows, bounded rows, selection,
      cancellation, late-response, and request-count proof remain unchanged.
- [x] [AC-03] Focused repetitions with four workers and retries disabled, fast checks, and complete
      delivery pass with all required cases and zero failed, skipped, or flaky results.
- [x] [AC-04] Quality guidance, the brain, roadmap, and ticket explain the fixture race and retained
      failure; final documented-tree delivery and receipt verification remain required before
      commit, with complete hosted evidence a separate merge condition.

### Design

After `page.goto`, find the Lab's declared `/site.ts` module script and await a dynamic import of
its resolved URL. The module loader shares the existing evaluation promise, including the Lab
import; this does not add an alternate initialization path. Fail clearly if the expected entry is
missing. Before each View change, register `isProjectWindowResponse(response, 0)`, then await its
successful body and hidden loading indicator before the unchanged result assertions. Keep the
existing 76 component and 1,726 matrix cases, worker count, deadlines, retry policy, and assertions.

### Decisions

- Wait for actual module evaluation rather than an arbitrary delay or a new readiness attribute.
- Treat native markup availability and completed application initialization as distinct fixture
  conditions.
- Retain the failed final check and reject the passing retry.
- Preserve both initial and later SDK completion proof.

### Risks

The entry wait is specific to the dev-served Lab used by this suite. A changed entry URL must update
its explicit fixture contract. Extra response waits could match the wrong window; the existing
predicate checks the endpoint, mode, and exact start. Public and JavaScript-disabled site tests
retain their own fixture setup and are unchanged.

### Verification plan

Validate Plan before editing the fixture. Repeat the popover, two virtual-window, and active-theme
cases three times in all three desktop engines with four workers and retries disabled. Run official
Node 24 fast checks and close Code against its exact report. Run complete delivery against actual
main, validate Test and receipt before documentation edits, map acceptance evidence, then run final
`npm run check`. Verify its receipt before and after staging, commit, push, and inspect hosted
checks.

### Planned files

- `e2e/components.spec.ts`: await the declared entry module and initial exact SDK window.
- `docs/QUALITY_PROGRAM.md`: explain complete component-fixture initialization.
- `docs/README.md`, `docs/tickets/ROADMAP.md`: link the fixture correction.
- This ticket: preserve failures, phase evidence, changed files, and acceptance mapping.

## Code

### Changed-file ledger

| File                      | Purpose                                                                                                               |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| This ticket               | Record the native-control initialization race and bounded fixture correction.                                         |
| `e2e/components.spec.ts`  | Await the declared page entry evaluation and exact initial SDK window before assertions.                              |
| `docs/QUALITY_PROGRAM.md` | Explain the fixture race, module evaluation, exact initial SDK completion, retained failure, and delivery conditions. |
| `docs/README.md`          | Link the initialization correction from the brain.                                                                    |
| `docs/tickets/ROADMAP.md` | Map the fixture correction and unchanged contracts.                                                                   |

### Design changes

Plan validated before edits. Fixture setup now awaits the page entry already declared by the Lab.
Both virtual cases register their exact start-zero wait before changing View, then check response
success, body completion, and hidden loading. All original result and cancellation assertions
remain. No runtime, page, timeout, worker, retry, selector, or budget changes.

## Test

| Command                                                                                                                         | Result | Evidence                                                                                                                                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final four-worker official Node 24 `npm run check`                                                                              | Fail   | Report `2026-09-27T02-02-45-707Z-93385`: component gate has 75 expected and one flaky result; all 11 other gates pass, including all 1,726 matrix cases. No eligible receipt.                                                                         |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0065-await-component-fixture-initialization.md`                  | Pass   | Plan validated before changing fixture behavior.                                                                                                                                                                                                      |
| Four-worker focused popover, virtual-window, and active-theme tests in all three desktop engines; `--repeat-each=3 --retries=0` | Pass   | All 36 cases pass in 52.2 seconds with zero unexpected, skipped, or flaky results. Evidence: `.git/jqstar/ticket0065-focused/results.json`.                                                                                                           |
| Official Node 24 `JQS_E2E_WORKERS=4 JQS_QUALITY_BASE_SHA=9526d091f9a995cc90edefd465c8c56f3c050b20 npm run quality:fast`         | Pass   | All six gates pass in `2026-09-27T02-25-03-622Z-48313`; Code phase validated against its exact unchanged tree before entering testing.                                                                                                                |
| Official Node 24 four-worker `npm run quality:delivery`, actual-main base                                                       | Pass   | Report `2026-09-27T02-27-08-663Z-57536` passes all 12 gates, all 76 component cases, and all 1,726 matrix cases with zero failures, flakes, or skips. Matching Test phase validation and `npm run quality:receipt` pass before documentation changes. |

### Inspection ledger

| Finding                                                                                     | Resolution                                                                         |
| ------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Native select change preceded completed Lab module evaluation; no project request was sent. | Await the declared entry module before interactions.                               |
| Initial window had no explicit SDK completion wait.                                         | Match start zero before changing View; await response body and loading completion. |

## Document

### Documentation changed

`docs/QUALITY_PROGRAM.md` explains the retained flaky run, completed entry-module evaluation,
initial SDK completion, and delivery proof. The brain and roadmap link this correction. Public
runtime usage, page initialization, and backend contracts are unchanged.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                                                                                                      | Result |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | `e2e/components.spec.ts` awaits the resolved URL of the Lab's declared `/site.ts` entry after navigation; it adds no runtime hook or sleep. The missing-entry contract fails clearly.                                                                                                                                         | Pass   |
| AC-02 | Both virtual tests register the existing endpoint/mode/start-zero predicate before View changes, assert success and body completion, and await hidden loading before unchanged row assertions. All later windows and cancellation proof remain.                                                                               | Pass   |
| AC-03 | All 36 focused repetitions pass with four workers and retries disabled. Fast report `2026-09-27T02-25-03-622Z-48313` and complete delivery `2026-09-27T02-27-08-663Z-57536` pass; exact Code/Test phase validation closes each phase before advancing. Component and matrix evidence contain zero failures, flakes, or skips. | Pass   |
| AC-04 | Quality guidance, brain, and roadmap describe the correction; the failure stays in this ledger. Final documented-tree `npm run check` and receipt verification before/after staging remain mandatory, with complete hosted evidence a separate merge condition.                                                               | Pass   |

### Completion audit

Current-state inspection confirms component setup awaits its already declared entry module before
interactions. Both initial SDK operations complete before existing result assertions; later exact
windows, bounded rows, selection, cancellation, late-response, and request-count checks remain.
Runtime and page sources, hooks, deadlines, retries, workers, selected cases, analyzer pins, and
package budgets have no changes in this ticket. Every acceptance criterion has direct evidence, and
the rejected final check remains recorded.

Run final `npm run check` for this documented tree and verify its receipt before and after staging
before commit. Record its final report identifier in the PR body or `.git` evidence to preserve the
tested source fingerprint. Complete hosted checks and the separately requested runtime security
scope decision remain merge conditions; this ticket does not claim hosted success or security
remediation.

Status: Complete

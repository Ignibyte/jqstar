---
id: 0053
title: Run the final mutation audit when explicitly authorized
status: done
created: 2026-09-06
updated: 2026-09-25
---

# 0053: Run the final mutation audit when explicitly authorized

## Plan

### Problem

The user requested one final mutation-testing ticket after 0031–0033 and the quality-standards
review, and explicitly instructed us not to run it now. This ticket records that deferred work. It
does not reopen mutation testing in normal development, delivery, or release commands.

On 2026-09-24 the user explicitly authorized running the full mutation audit now, fixing issues,
constraining CPU and memory use, and then testing jQuery 3.7.1. This later instruction supersedes
the earlier timing and execution deferral. Ticket 0033 is still coding; its prior terminal-state
prerequisite is waived for this independently requested audit. The audit remains outside canonical
quality modes.

### Current evidence

- Ticket 0048 removed mutation testing from the required workflow and toolchain.
- Vitest, V8 coverage, property tests, installed consumers, and cross-browser checks remain active.
- StrykerJS provides a Vitest runner, but compatibility, exact versions, scope, cost, and score
  thresholds must be verified against the eventual frozen source before execution.
- No mutation result is claimed by this ticket or by the preceding final program audit.
- The first Stryker 10.0.0 dry run found 136 mutable files and 56,731 generated mutants, then
  stopped on a Select native-popover test before executing mutants. Installing Stryker with npm's
  lockfile disabled had upgraded 124 existing packages in the isolated checkout. Restoring their
  exact lockfile versions made the full 512-case Select/Popover pair pass. Provisional fixture edits
  were removed; the audit uses unchanged source and tests with only Stryker added.
- The patched event recorder now emits nonempty per-mutant results. Its first 2,914 results include
  2,860 uncovered mutants and 13 survivors, all in `bin/doctor/configuration.mjs` validation. These
  are provisional findings while the complete run continues; they identify a missing configuration
  rejection contract that can be tested without changing product behavior.

### Activation gate

The 2026-09-24 user instruction authorizes execution. Tickets 0031, 0032, and 0052 are terminal;
0033 is coding. Its unfinished status does not prevent this independently authorized run. Freeze the
exact source and toolchain, validate this Plan, then execute only in an isolated owned checkout.

### Scope

- Freeze source, toolchain, production census, test scope, exact Stryker/Vitest versions, mutation
  operators, timeout/concurrency limits, denominator, and score policy before the run.
- Run in an isolated owned checkout. Preserve machine and human reports with exact source hashes,
  selected/executed mutant counts, killed/survived/uncovered/timeout/error classifications, and
  elapsed/resource cost. Refuse empty, aborted, or narrowed evidence as a pass.
- Investigate surviving and uncovered mutants. Add behavioral tests or fix defects in owning
  tickets; document equivalent/unreachable mutants individually with evidence and review limits.
- Re-run affected mutants and required non-mutation gates after corrections. Retain the original
  reports so improvements and exclusions are reviewable.

### Frozen execution design (2026-09-24)

- Source revision: `c8ba4a68f914193646ab27d912f4ca44e6802154`. Product source is unchanged in the
  isolated worktree; the two focused baseline test corrections below are copied to it. The 136-file
  SHA-256 manifest at `test-results/mutation/source-sha256.txt` has digest
  `2619dbf79662cdff7eeef8b0d8df8f4a9d5566cba5de34f689947003ebf82d41`.
- Toolchain: Node `26.8.1`, npm `11.19.0`, locked project Vitest `4.1.11` and TypeScript `5.9.3`,
  Stryker core and Vitest runner `10.0.0` in a separate pinned tool directory. The project lockfile
  SHA-256 is `223081bef4286472fe9b3b8224fda277abeabc517ebb29994cbc9a201946c0dd` and installed locked
  package drift must be zero. The Stryker tool directory has its own lockfile. Its event-recorder
  module is patched only to omit oversized plan and final-report events (original SHA-256
  `863f7074a8b7bcdbb0062475d92e8a88626e41ffec7353ac4007821085dee39b`, patched SHA-256
  `c6c02a743a3811a051d30e11085e2cb9b89632d1adf665dadfbcdc34aad68c97`). The mutator, runner,
  progress, JSON, and HTML reporters remain pinned and unchanged.
- Scope: `src/**/*.ts`, `server/**/*.ts`, `registry/blocks/**/*.ts`, and `bin/**/*.mjs` with
  Stryker's default mutation operators. Instrumentation selected 136 files and generated 56,731
  mutants. The final JSON report, including every uncovered, timed-out, and error result, is the
  denominator authority. No changed-line filter or incremental reuse is permitted.
- Resource limits: eight Stryker workers on a 10-logical-CPU, 16-GiB host, 2-GiB Node heap cap,
  restart each test runner after 100 runs, 20-second absolute mutant timeout plus factor 1.5,
  30-minute dry-run limit. Check memory pressure and process RSS during execution; stop and reduce
  concurrency if pressure becomes material. One full run is allowed to take hours. An initial
  four-worker run was stopped after approximately two minutes of mutant execution because Stryker
  estimated 41–43 hours remaining while memory remained 81% free and worker CPU use was modest. Its
  partial log is retained, but none of its results count toward acceptance. The six-worker attempt
  was also stopped early, after 3,447 of 56,731 were classified, because its sustained runner RSS
  was only 3.63 GiB, memory stayed 81% free through worker recycling, and the remaining estimate was
  still approximately 39 hours. Its log is retained and excluded from acceptance too. The first
  eight-worker attempt reached 3,806 classified mutants and was stopped because the JSON reporter
  writes only at completion. The reporter-enabled restart below provides per-mutant events for early
  triage; the partial log remains excluded from acceptance. A 30-second resource watchdog stops the
  owned Stryker process after three consecutive samples at 20% or less free memory or two
  consecutive samples above 13 GiB runner RSS.
- Reporters: progress, final JSON and HTML, plus Stryker's
  [event recorder](https://stryker-mutator.io/docs/stryker-js/configuration/) writing
  `reports/mutation/events/` as each mutant is tested. Event files allow early investigation but do
  not replace the final source-bound JSON report or change the denominator. The first unpatched
  event-recorder run passed its 4,521-test baseline but crashed at the plan event with
  `RangeError: Invalid string length`; the 56,731-mutant plan exceeded V8's single-string limit. In
  the isolated pinned tool directory, the recorder now omits only the plan and final-report events,
  retaining per-mutant events. Its patch and original are hashed above. Validate this revised Plan
  before restarting; confirm nonempty per-mutant event files before relying on them.
- Runner: Vitest per-test coverage and related-test selection, using the audit-only configuration.
  Four package/release/quality contract suites that require a primary `.git` directory or classify
  every root config are excluded from the mutation runner. The CSP source-inventory contract is also
  excluded because Stryker instrumentation intentionally changes source bytes it checks. One CSP
  engine source-scan case is excluded by exact test name because Stryker's injected `new Function`
  text would fail its source policy; the remaining CSP engine behavior cases stay in scope. These
  tests retain their ordinary quality gates; the audit must report these limits and cannot claim
  mutation coverage for process-only behavior.
- Score policy: report Stryker's raw counts and per-file results without a retroactive passing
  threshold. Investigate survivors, uncovered mutants, timeouts, and errors; do not relabel any as
  killed or hide files to improve the score. Keep the original report before any corrective rerun.

### Out of scope

- Automatic mutation execution in normal development, delivery, release, or CI commands.
- Automatic inclusion in `npm run check`, fast, delivery, full-audit, CI, or release workflows.
- Blanket mutation exclusions, score manipulation, arbitrary test assertions, publication, and
  replacing coverage, properties, browser tests, or the final program audit.

### Acceptance criteria

- [x] [AC-01] Explicit later execution authorization and terminal prerequisite evidence are
      recorded.
- [x] [AC-02] The complete immutable scope, tool versions, budgets, score policy, and clean baseline
      are frozen and Plan-validated before execution.
- [x] [AC-03] The nonempty complete mutation run produces validated source-bound reports and a
      disposition for every survivor, uncovered mutant, timeout, and error.
- [x] [AC-04] Required corrections and reruns pass, and individual exclusions have direct evidence
      without weakening the scope or denominator after observing results.
- [x] [AC-05] The final mutation report and updated test guidance accurately state results and
      limits; canonical workflows remain non-mutation and `npm run check` passes after corrections.

### Design

Use a compatible pinned StrykerJS core and Vitest runner in an isolated audit environment. Follow
the
[official Vitest runner documentation](https://stryker-mutator.io/docs/stryker-js/vitest-runner/)
and [configuration contract](https://stryker-mutator.io/docs/stryker-js/configuration/). Runtime,
server, registry, and CLI coverage need explicit accounting; process-based tests may require a
separate adapter. Unsupported mutation scopes must remain visible instead of being counted as
tested. Keep machine reports outside published artifacts.

If the full Vitest report shows uncovered `bin/` or other process-only mutants, investigate a
separate targeted [command-runner pass](https://stryker-mutator.io/docs/stryker-js/configuration/)
with the owning process tests. The command runner has no coverage analysis and executes its command
for each mutant, so keep that follow-up restricted to the affected source paths with its own
resource budget and report. Preserve the original full-scope report and report both results; do not
silently replace or shrink its denominator.

The live events classify all 595 `bin/jqstar.mjs` mutants as uncovered in the Vitest runner because
`test/cli.test.ts` starts a separate Node process. Run a command-runner follow-up on that one file
only, using `npx vitest run test/cli.test.ts`, one worker, a 2-GiB Node heap cap, the same 20-second
mutant timeout, and a distinct JSON report. Its direct baseline passes all 14 tests in 2.37 seconds
on the isolated locked checkout. This pass may take tens of minutes; it must remain separate from
the full-scope denominator and the doctor follow-up.

The expanded CLI command-runner pass completes 595 mutants with 409 killed, 183 survived, and three
timed out. Its surviving `readJson()` missing-file guard at line 32 has no direct process case for a
configured registry path that does not exist. Add that negative case with a value-free usage error
and no project writes, then rerun only frozen read/parse lines after the queued observation pass.
Preserve both completed full-file CLI reports.

The live events also classify all 269 `server/index.ts` mutants as uncovered because the published
server is built and exercised as a separate process. Investigate a second one-worker command-runner
pass restricted to that source file. Copy the already built site archive into the isolated locked
checkout, rebuild the server for each mutant, and run the existing self-hosted server smoke. Measure
its clean baseline before launching, set a timeout from that measurement, and queue it after the
doctor-rules pass to retain CPU headroom. Keep its report separate from the full-scope denominator.
The locked isolated baseline now builds `server-dist/index.mjs` in 0.68 seconds and passes the
browser-backed server smoke in 2.45 seconds. Use a 30-second absolute mutant timeout plus factor
1.5, one worker, and a 2-GiB Node heap cap. Stryker excludes gitignored `demo-dist`, so copy its
708-KiB `site.br` to the audit-only `test/fixtures/mutation-site/site.br` and set `JQS_STATIC_DIR`
for the smoke command. The archive SHA-256 is
`b2b65a949e23d255428885f7633e115cda589e7c80baa472df9c828a1e67e3ea`; the smoke also passes with that
path. The fixture stays outside the published source tree and is immutable in each command-runner
sandbox.

The completed built-server follow-up kills 116 of 269 mutants and exposes missing negative process
coverage. Extend the existing smoke with invalid port startup and malformed bundled-site inputs,
using temporary archives and separate child processes so the production server code remains frozen.
Verify its clean baseline, then rerun only the affected server entrypoint ranges after the already
queued focused workers. Retain the initial 269-mutant report and do not treat unrelated survivors as
fixed.

The initial baseline failures came from audit dependency drift. Compare the isolated installed
packages with the repository lockfile and require zero drift before the full run. Retain the failed
dry runs and rerun the clean baseline before starting mutants.

With locked dependencies restored, the complete Stryker dry run exposed a Resizable test that
expects `localStorage` in Vitest's primary jsdom realm. On Node 26 that getter yields `undefined`
without a Node local-storage file, while a same-origin frame's storage works. Use the root
document's window and a deterministic storage test double in this case. Run the complete affected
test file and repeat the dry run. This leaves product behavior unchanged.

The broad direct Vitest baseline also found an observer-constructor getter case where jsdom's
`Window` proxy ignores an attempted getter replacement. Put a throwing getter behind a proxy on the
test's document host, then restore the host window after the assertion. Package/release/census tests
that assume a primary `.git` directory or reject the audit-only config are excluded from the
mutation runner, with their standard quality gates retained separately.

The first per-mutant events show that `validateConfig()` paths for required output, optional blocks
output, allowed keys, path safety, and optional metadata survive changes despite being covered by
existing tests. Add a focused behavioral matrix to `test/doctor.test.mjs` for accepted and rejected
configurations, then rerun those mutants on the corrected tree after preserving the complete
original report. The live isolated run remains source frozen.

Further per-mutant events show reachable survivors in doctor migration root identity, source-file
checks, and plan validation. Extend the migration tests with explicit tampered-plan rejection and
unsafe or changed filesystem fixtures. Rerun the affected configuration module with those owning
tests in a separate isolated checkout. Keep both the original full-scope run and the earlier focused
doctor report unchanged as evidence.

The live doctor-rules events also show reachable survivors in ownership metadata and the jQuery
Migrate summary validator. Add direct behavioral tests for accepted and rejected metadata, emitted
diagnostics, and the read-only reader boundary. Run a focused mutation pass for that module after
the one-worker CLI follow-up has finished, so the host is not oversubscribed. Retain the primary
source-frozen report and treat any newly found gaps as separate evidence. The first focused rules
report has 432 killed, 174 survived, 46 uncovered, and six timeouts across 658 mutants. The
remaining survivors include declared package ranges, duplicate installations, peer/plugin
compatibility, and explicit entrypoint artifacts. Extend the same test file with those diagnostic
contracts; rerun the module after the queued worker chain finishes, retaining the first rules report
for comparison.

The first focused CSP pass selected the intended 48 `src/csp/evaluator.ts` mutants but its dry run
failed the source-scan test that sees Stryker-injected `new Function` text. The full audit already
excludes that exact test name while keeping the remaining CSP behavior tests. Apply only the same
`testNamePattern` exclusion to the focused Vitest config, prove its baseline, and requeue one worker
after the current focused chain; retain the failed dry-run log.

The live Project Browser results show 242 survivors, including grouped-to-virtual transitions,
pinned-column offsets, keyboard move limits, and drag/drop guards. Strengthen the existing block
tests at these user-visible boundaries, then run a one-worker focused mutation pass on
`registry/blocks/project-browser.ts` after the queued server follow-up. Preserve the original
full-scope classifications and report any remaining survivors honestly. The updated owning file
passes 23 tests in the main tree. Its isolated Vitest baseline passes in 21.62 seconds with an
audit-only alias from `jquery-star` to `src/index.ts`; the first isolated attempt failed at import
because that alias was missing. Use a 30-second absolute mutant timeout plus factor 1.5, one worker,
and a 2-GiB Node heap cap for the focused rerun.

The full-run `server/api.ts` events also expose surviving feed-cursor validation and profile-input
validation branches. Add server-level behavior cases for positive and invalid cursors, independent
invalid profile fields, and normalized valid fields. Verify the owning suite, then rerun only the
affected source ranges in an isolated follow-up after the queued workers; do not claim the original
full-scope report changed.

The CSP evaluator's array-capability mutants expose untested boundary indices and named array
properties. Extend its existing capability matrix with negative and exact-end `.at()` results and
proof that non-index properties on arrays cannot be read through CSP expressions. Rerun only the
affected evaluator ranges after the other queued follow-ups; keep its frozen full-run result.

The full-run `src/declarative.ts` events expose missing coverage for keyboard modifier names and
duration parsing. Add a table-driven event test that checks every documented key against a matching
and different event, plus valid and invalid debounce durations. The `milliseconds()` grammar accepts
fractional seconds, while `parseEvent()` appears to truncate a modifier at the second dot; first
prove this with a failing behavior test, then fix only that parser split if confirmed. Use a
separate corrected-source follow-up checkout after the queued runner-error probe so earlier
source-frozen reports remain valid. Preserve the full-run classification and test `$` as jQuery with
`$count` as reactive state.

The corrected-source parser pass completes 116 mutants with 107 killed, six survived, and three
uncovered. Two surviving regex mutations remove the start anchor or require a unit. Extend its
fake-time regression to reject a prefixed duration and to preserve documented optional-unit
millisecond behavior, clarify the public duration syntax, then rerun the corrected parser range with
one worker after the other queued follow-ups. Keep the corrected product source unchanged.

The parser correction makes the key name a definite string. Remove its stale null check and
assertion. The strict lint-boundary census then requires lowering the exact assertion allowance for
`src/declarative.ts` from three to two; retain the other allowances unchanged and rerun the gate.

Later frozen-source declarative events leave the `data-style:` nullish clearing branch surviving or
uncovered. Check a styled element through concrete, null, and undefined values against its native
style property, then rerun only that directive range with one worker. Keep the original full-run
classification and source frozen.

Computed directive setup also has surviving source-null, blank-key, diagnostic-context, and
state-key enumeration mutations. Check an initially present computed attribute as it updates, is
removed, and is re-added, including restoration of an earlier signal with the same name. Verify that
removal produces no lifecycle error, then run a narrow frozen-source mutation follow-up on the
computed setup range. The first behavior run confirms that restoring the old descriptor leaves
`data-text` stale. Notify dependents of that exact state key after a computed descriptor is
installed or restored, without refreshing unrelated effects. Split the state-restoration case from
the rendered-value regression so the frozen-source pass can include the former and exclude only the
latter, which requires the corrected source. Keep this corrected production source separate from the
frozen full audit. Add public-state and error-detail assertions for the blank name, malformed
computed expression, and computed-key enumeration, then rerun only that frozen-source setup range.

The core reactivity event stream leaves dependency cleanup, stopped-effect isolation, no-op writes,
and property deletion alive despite broad incidental coverage. Add observable lifecycle cases to
`test/reactivity.test.ts` for reading reactive state outside an effect, switching tracked branches,
stopping after an already queued update, direct invocation after stop, repeating a value write, and
deleting present versus absent keys. Keep production source unchanged unless a case fails, then
rerun only the affected frozen-source ranges with one worker.

The full-run `bin/doctor/index.mjs` events expose surviving command-line option guards. Extend the
owning doctor suite with rejected mode, flag, value, and entrypoint combinations through `runDoctor`
and verify the value-free usage error. Rerun only the argument parser range after the other queued
focused passes, retaining the frozen original result. This tests the exported command boundary
without introducing a test-only export for its private parser.

The same event stream shows reachable survivors in `bin/doctor/data.mjs` for input text, portable
paths, traversal and control characters, scan depth, and metadata reader limits. Add direct contract
tests for these exported boundaries, including filesystem-backed reader cases, in a new owning test
file. Keep the production module frozen in the main full run. Run a one-worker focused follow-up
after the existing queue, and preserve the original per-mutant classifications.

Provisional `bin/doctor/discovery.mjs` survivors concentrate in workspace pattern expansion, ignored
directories, package aliases, and scan limits. Add filesystem-backed tests of the exported discovery
result and diagnostics in a separate owning file. Queue a one-worker focused rerun after the doctor
data pass in a separate checkout; retain the original full-run statuses. The first owning test found
that a scalar `workspaces` value is silently ignored. Reject a present value unless it is an array
or a record, preserve the accepted forms, and run its focused mutation pass on corrected source
separately from the full frozen report.

The full-run `src/htmx.ts` event stream also has reachable survivors in the injected capability
guard: the owning test rejects only one missing method. Extend that test with malformed versions,
configuration, and each required host method, then rerun only the guard's source range in a
one-worker focused pass after the queued runner-error follow-ups. Keep the htmx product source
frozen unless a behavioral case actually fails.

The emitted htmx swap results also leave the special `outerHTML` body cleanup branch at frozen
`src/htmx.ts:390` weakly detected. Add an owning bridge case that treats a body-targeted outer swap
as child removal, checks the old application is released, and checks the recorded removal count.
Probe only that frozen line with one worker and keep the full audit's statuses intact. The first
focused pass left mutations that treat ordinary `outerHTML` targets like child swaps; add a
target-replacement case that checks removal and enhancement before rerunning the same line. The
second pass leaves only the `delete`-on-body distinction at that line. Add a body deletion case that
checks target cleanup and recorded removal before deciding whether it is a real gap.

The frozen `src/ui/carousel.ts` events expose missing nested-root isolation, control state without
looping, indicator selection, and change-event details. Add integration cases to the owning Carousel
suite, then rerun only those source ranges with one worker. Include the document-ownership suite in
the final focused pass because it killed distinct boundary mutants in the full audit. Preserve any
narrower preliminary reports and compare by embedded source and exact mutant signature. The first
follow-up leaves reachable whitespace and fallback slide values, event bubbling, unchanged disabled
state writes, and nested-control rebinding gaps. Add cases for those user-visible contracts and the
rotation button before closing the Carousel follow-up.

The provisional `src/fetch.ts` results include surviving request-parameter omission mutations for
`null` and `undefined` values, plus retry-decision mutations around the HTTP 400 threshold and
explicit `auto`, `error`, and `always` modes. Add owning backend-action cases that omit nullish
query values while retaining false and zero and distinguish the retry statuses and modes. Then run a
one-worker focused pass on frozen parameter and retry decision lines after the htmx guard pass. Keep
the product source unchanged unless a real behavior case fails.

Provisional `src/observation.ts` survivors include non-finite request-counter normalization and a
null subscription-options shape check. Add owning integration assertions for the emitted JSON-safe
request records and rejection of null options, then run a one-worker focused pass on frozen
normalization and validation lines after the Project Browser guard pass. Keep the operation source
frozen unless a behavioral case fails.

The completed CLI command-runner report shows 238 survivors out of 595 mutants, with clusters in
option parsing, configuration validation, registry metadata, and path containment. Add process-level
negative cases for those user-facing failure contracts to `test/cli.test.ts`; verify that rejected
commands do not write project files. Preserve the initial command-runner report and rerun the
affected CLI mutants after the already queued focused passes finish, with the same one-worker
resource cap. An isolated Vitest CLI config must include only the root `test/cli.test.ts`; a direct
file-name filter picked up a duplicate copy inside the active rules sandbox during preparation.

The full-run event stream has also reported runner `RuntimeError` results. All 57 observed by
2026-09-24 13:50 UTC have the same Stryker error-serialization failure,
`TypeError: Cannot convert object to primitive value` in `errorToString`; they are unresolved
results, not product failures or kills. Preserve the complete report, then rerun matching mutant
locations and replacements with a narrowly repaired audit-only runner and a separate report before
disposition. The isolated repair must tolerate null-prototype error objects and reveal the
underlying Vitest error. Do not alter the running toolchain or reclassify the original results.
Fifty-four of those results are boolean mutants in `server/api.ts`, spread across request and
profile handling. After the narrow runner probe, rerun their exact source lines with the repaired
tool, the frozen API source, and the owning server tests in another one-worker pass. Keep this
report distinct from the earlier API behavior follow-up and link outcomes only by signature. The
remaining two observed serializer errors are in doctor migration and Project Browser source. Rerun
those exact lines with the repaired runner and their owning suites after the API error pass; both
source hashes must still match the full report. The completed block report also leaves the invalid
column-move direction guard at line 506 weakly detected. Add one direct action case using malformed
`data-column-move` markup and assert column order stays unchanged. The narrow guard rerun left two
`next`-branch mutants alive; add a direct forward move assertion alongside the invalid direction
case. Rerun only the frozen guard line with one worker after the fetch retry pass, retaining the
650-mutant focused report as its initial classification.

The completed Project Browser focused report adds one serializer error at frozen line 423 under its
expanded owning suite; the full run had already killed that signature. Include line 423 in the
repaired-tool probe to resolve the focused result without changing the original classification. That
probe left removal of initial root setup alive at line 423 and the added-root observer guard alive
at line 629. Add a behavioral case that inserts a new Project Browser root with a saved column
layout and checks that the observer applies order, visibility, and pin state. Preserve the frozen
source and rerun those narrow lines after the queued probes finish.

The advancing full-run event stream now has additional serializer RuntimeErrors at five
`src/reactivity.ts:58` mutants and one mutant each in Calendar, Carousel, Chart, and Color Picker.
These errors have the same original error-stringification failure and remain unresolved, not killed.
Probe the four UI source lines with the repaired audit-only tool and their owning suites in one
worker, preserving their frozen source hashes. Probe reactivity separately because its guard is
covered by many unrelated suites; retain the full-run error statuses and compare exact signatures.

The narrow fetch follow-up still allowed an extra nullish query tuple and a retry of a network
failure under `retry: "never"`. Strengthen the existing parameter case to assert the complete query
tuple set, and add the explicit network failure case. Rerun only the affected frozen fetch lines
after the queued passes, retaining the earlier focused report.

The narrow observation follow-up still allowed finite positive request counters to normalize to
zero. Add a public observation case for finite fractional and negative counts, then rerun only the
frozen normalization lines. Nested observation freeze survivors may be redundant because the
metadata constructors freeze owner, request, and error objects before record publication; review
those signatures individually before labeling them equivalent.

The full-run event stream also shows surviving action-scope cleanup guards at
`src/observation.ts:472`. Add an overlapping-action test that keeps the inner context mapped when
the outer action settles, then proves no parent request ID remains after the inner action settles.
Rerun those source-matched mutants with the owning suite.

The full-run persistence codec events show survivors in the 128-field and 256-character accepted
limits, path type and anchoring checks, and overlap detection after sorting. Extend the owning
field-codec tests with accepted edge values, non-string and malformed paths, distinct multi-field
records, and reverse-ordered parent/child declarations. Rerun only the affected frozen codec lines.

The persistence option-normalizer events show surviving codec-ID validation and default disposal
flush mutations. Assert the accepted default and explicit false value, and reject an invalid codec
identifier in the existing normalization suite before a source-matched narrow rerun.

The remaining envelope events expose zero-time and equal-expiry acceptance, primitive revision
origin rejection, codec identity mismatch, and migration execution/size boundaries. Add direct
reader, clock, and migration tests, then rerun those frozen lines. Review the equal-value revision
comparison mutations separately, since the preceding equality branches may make them equivalent.

The plugin version-range events show an uncovered major-version regex mutation and survivors in
version error context and whitespace normalization, plus static timeouts in invalid-range guards.
Extend the owning grammar cases with multi-digit and malformed majors, padded ranges, and the
version-specific diagnostic; rerun only those frozen plugin lines with one worker.

The same plugin source has four surviving regex-anchor mutations in ordinary and official plugin
names. Add leading/trailing punctuation rejection through both host installation paths, then rerun
those frozen name-pattern lines separately. The first focused pass also allows an official name
pattern that requires a dot; add a positive single-segment official plugin installation case before
the final rerun.

The plugin manifest validator also has an original survivor on the shared `before`/`after` conflict
guard. Add a transactional test that rejects a plugin ordering the same target both ways before
invoking its installer, then rerun the frozen guard.

The emitted full-run calendar results show several surviving range-boundary mutations at frozen
`src/ui/calendar.ts:406`. Strengthen the owning range-calendar behavior test to assert dates just
outside a complete range stay unselected and an incomplete range highlights only its start. The
first focused report also left exclusive-end selection alive; assert that the end date remains
selected. Rerun only that frozen source line with the owning test and one worker; keep this
provisional follow-up separate from the final full-scope report.

The live event register through 29,685 mutants shows 309 surviving and 59 uncovered mutations in
frozen `src/ui/combobox.ts`, including the document-level outside pointer and focus guards. Add an
owning behavior case that distinguishes inside interaction from outside pointer and focus events,
then rerun only those frozen listener lines with one worker. Keep this as provisional follow-up
evidence until the complete full report can link exact signatures. The same register shows 210
survivors and 63 uncovered mutants in `src/ui/data-table.ts`. Its owning suite checks numeric and
multi-column sorts, but not the `data-type="date"` branch. Add an owning date-sort case with one
invalid value and both directions, then rerun the frozen value-comparison lines with one worker. The
first focused date pass left numeric-versus-string comparison mutants alive because all valid dates
were after 1970 and their timestamp strings happened to sort in the same order. Use two pre-1970
dates to distinguish negative numeric timestamps from string collation, then repeat the same frozen
line selection without replacing the first report.

Match focused-report mutants to the frozen full report by source path, mutation location, operator,
and replacement, rather than by report-local IDs. Keep every original classification and annotate
each matching follow-up result separately; investigate unmatched or duplicate signatures before
claiming a correction.

Build a per-mutant disposition register from the validated full report and signature-linked
follow-ups. Each original non-killed mutant must retain its frozen status and receive an explicit
current disposition with a reason. A later kill can be marked as focused evidence only when source
hashes match. Equivalent cases require an individual reviewed rationale; untested survivors and
runner failures remain explicitly open rather than being silently counted as kills. Validate the
register against the original non-killed count and reject duplicate or missing entries.

After the full JSON, HTML, and disposition register pass validation, copy the final reports, derived
summaries, run log, and watchdog log from the temporary checkout into the gitignored audit archive.
Record and verify SHA-256 digests there so the evidence survives cleanup of `/tmp`.

The live full-run events at `src/protocol.ts:861` leave the default-profile reset on plugin cleanup
untested. Add a registry lifecycle case with two plugin namespaces: removing an unrelated namespace
must preserve the selected default, and removing its owning namespace must restore `core.generic`.
The focused pass also leaves the idempotence guard at lines 856-857 alive. Add a reinstall case so a
stale cleanup cannot remove a later installation under the same namespace. Rerun only the frozen
cleanup guard with one worker, retaining the full-run statuses.

The full-run `src/protocol.ts:262-265` overlap checks have many timeouts despite owning tests for
exact-versus-suffix order. First reclassify only those frozen lines with one worker and the protocol
suite. Add direct equal-exact and equal-suffix rejection cases if their branches remain undetected;
also check distinct matcher pairs in both cross-kind orders so false overlaps cannot pass. Keep
original timeout labels in the full audit.

The emitted `src/runtime.ts:212` and `:485` survivors concern preserved-root cleanup and remount
guards. First rerun only those frozen ranges with the owning runtime and patch suites; if public
preservation behavior still escapes detection, add a focused application lifecycle assertion. Retain
the original full-run labels and source hashes.

The expanded runtime pass detects preserved request and mount boundaries but leaves an unmount-only
UI rule and destruction during a mount callback alive. Add owning lifecycle cases for both before
archiving the focused report; review any remaining no-op mutations individually.

### Decisions

- The 2026-09-24 user instruction authorizes executing the audit now. The earlier plan-only
  instruction and 0033 timing prerequisite are superseded for this run.
- This audit is independent of 0033; that ticket must not retroactively claim mutation evidence.
- Existing detector sabotage is part of normal quality verification and is not a mutation audit.

### Risks

Mutation runs may take hours and test runners may not cover installed/process consumers without
specific adapters. Equivalent mutants and timeouts can distort scores. Freeze policy first and
retain category counts and original evidence.

### Verification plan

For this authorized run: validate the frozen Plan and canonical non-mutation scripts, prove
baseline, runner liveness, and exact scope, then validate the complete report, disposition every
unresolved mutant, finish targeted reruns, and run the required non-mutation delivery checks.

### Planned files

- Isolated audit configuration and result schemas after activation.
- Behavioral tests or owning-ticket defect fixes justified by actual findings.
- A doctor reader resource test for the surviving `Math.min` allocation mutant. An isolated Vitest
  fixture passes on the frozen source and fails when only that allocation changes to `Math.max`.
- A document-listener acquisition test for static survivor ID 14909. When a `signal` getter disposes
  the kernel before native registration, setup must not remove a listener that was never added. A
  one-worker frozen-source probe kills that original call-removal mutation.
- Delivery-gate repair for the audit changes: retain all Semgrep rules while giving its large
  browser specification a sufficient per-file timeout; align the exact measured installed root
  bundle and Mobile reference UMD bytes. The package gate also measured a 39-byte stores gzip
  increase. Review both exact budget increases against the current immutable delivery base while
  preserving ticket 0055's earlier base transitions.
- Questionnaire revalidation behavior when an existing root receives an invalid server-authored
  fieldset value, a whitespace-padded authored active value, or removal of that optional value;
  focused frozen-source reruns of the affected validation and value parsing calls.
- Sidebar `data-value` reflection through a user toggle, distinguishing it from the separate
  `data-state` reflection; a focused frozen-source rerun of the line exposed by a runner error.
- Final mutation report, testing guidance, affected public contracts such as `docs/UPGRADES.md`,
  roadmap, and this ticket.

## Code

### Changed-file ledger

| File                                                         | Purpose                                                                                                                                                                                         |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| This ticket                                                  | Record authorization, frozen audit scope, test corrections, results, and dispositions.                                                                                                          |
| `test/ui-resizable-document.test.ts`                         | Give the storage reentry case a deterministic storage double in either document realm.                                                                                                          |
| `test/scoped-observer-acquisition.test.ts`                   | Model the throwing constructor getter on the document host so the failure path is actually exercised.                                                                                           |
| `test/doctor.test.mjs`                                       | Check configuration validation and doctor CLI option guards exposed by surviving doctor mutants.                                                                                                |
| `test/doctor-data.test.mjs`                                  | Check doctor input limits, canonical nested arrays, malformed UTF-8/BOM, path races, and bounded allocation under a generous file limit.                                                        |
| `test/document-listener-acquisition.test.ts`                 | Refuse native removal when a signal getter retires the kernel before listener registration.                                                                                                     |
| `scripts/quality/run-static.mjs`                             | Allow enough per-file time for the full Semgrep scan under the eight-worker audit load.                                                                                                         |
| `config/quality-budgets.json`                                | Set the measured installed root and stores gzip budgets to 634,881 and 67,623 bytes.                                                                                                            |
| `scripts/quality/budget-ratchet.mjs`                         | Review exact current-base one-byte root and 39-byte stores gzip allowances while preserving earlier baseline limits.                                                                            |
| `test/package-release-hardening.test.mjs`                    | Assert both immutable-base transitions and reject larger increases.                                                                                                                             |
| `quality/jquery-mobile-migration.json`                       | Align the current reference package's UMD byte measurement with the 559,006-byte installed bundle.                                                                                              |
| `test/doctor-discovery.test.mjs`                             | Check workspace and installed-package discovery boundaries exposed by surviving discovery mutants.                                                                                              |
| `test/htmx-bridge.test.ts`                                   | Check injected capability fields and methods plus body, ordinary element, and delete target cleanup for htmx swaps.                                                                             |
| `test/fetch.test.ts`                                         | Distinguish omitted nullish parameters, retry boundaries, and malformed dynamic request arguments in the backend-action suite.                                                                  |
| `test/observation.test.ts`                                   | Check normalized request counters, observer inputs, and overlapping action-scope cleanup.                                                                                                       |
| `test/persist-data.test.ts`                                  | Exercise field/path limits, envelope validation, clock and migration boundaries, codec identity, and disposal defaults.                                                                         |
| `test/plugin.test.ts`                                        | Exercise stable version ranges, plugin name boundaries, and contradictory ordering rejection.                                                                                                   |
| `bin/doctor/discovery.mjs`                                   | Reject malformed scalar workspace declarations rather than silently skipping the scan.                                                                                                          |
| `docs/UPGRADES.md`                                           | Document the malformed workspace declaration error for package scans.                                                                                                                           |
| `test/doctor-migrations.test.mjs`                            | Check that malformed plans and unsafe or changed migration inputs are refused before writes.                                                                                                    |
| `test/doctor-rules.test.mjs`                                 | Check ownership, migration summary, package/peer, and entrypoint diagnostic boundaries exposed by surviving rules mutants.                                                                      |
| `test/project-browser-block.test.ts`                         | Check virtual-mode reset, pinned-column position and keyboard limits, and invalid drag/drop behavior exposed by survivors.                                                                      |
| `test/ui-range-calendar.test.ts`                             | Check complete and incomplete range boundaries, including inclusive end-date selection, against surviving calendar mutations.                                                                   |
| `test/ui-carousel.test.ts`                                   | Check nested-root ownership, normalized slide values, idempotent value writes, controls and indicators, event bubbling, and control rebinding; use guarded fixture lookups.                     |
| `test/ui-combobox.test.ts`                                   | Distinguish inside interaction from outside pointer and focus events when the popup is open.                                                                                                    |
| `test/ui-data-table.test.ts`                                 | Check both date-sort directions with invalid and pre-1970 dates, plus `data-value` precedence.                                                                                                  |
| `test/ui-input-otp.test.ts`                                  | Check direct-control and type validation, action values, status refresh after silent native edits, and authored slot identity with unrelated HTML/SVG children exposed by focused survivors.    |
| `test/ui-menubar.test.ts`                                    | Preserve the focused top-level tab stop when an earlier menu closes, and synchronize tab stops when a child menu opens through its own API.                                                     |
| `test/ui-multi-select.test.ts`                               | Check direct native multiple-select validation, generated parts, disabled states, keyboard focus, and safe pointer clicks.                                                                      |
| `test/server.test.ts`                                        | Check feed cursor normalization and independent profile input validation exposed by server API survivors.                                                                                       |
| `test/csp-engine.test.ts`                                    | Check array bounds, multi-digit indices, forbidden named or negative properties, and read-only array-method results in the CSP capability matrix.                                               |
| `test/protocol.test.ts`                                      | Check default-profile restoration, stale cleanup after reinstall, and exact/suffix matcher overlap boundaries.                                                                                  |
| `test/declarative.test.ts`                                   | Check documented event modifiers, directive state transitions, and computed descriptor restoration and binding updates exposed by declarative survivors.                                        |
| `test/reactivity.test.ts`                                    | Check active dependency cleanup, reads outside effects, later writes and direct calls after stop, no-op writes, and present versus absent property deletion.                                    |
| `test/runtime.test.ts`                                       | Check direct root `&` events, delegated selectors, preserved-root request and mount lifecycles, unmount-only rules, and destruction during mounting.                                            |
| `test/patch.test.ts`                                         | Check signal, selector-free mode, mixed-ID and root/scope, malformed SVG, and unowned-document patch boundaries exposed by surviving mutants.                                                   |
| `test/ui-questionnaire.test.ts`                              | Reject duplicate authored question values, accept a trimmed active value, and preserve selection after removing an optional authored value on later enhancement.                                |
| `test/ui-sidebar.test.ts`                                    | Check the documented `data-value` reflection after a user toggles the Sidebar.                                                                                                                  |
| `test/ui-select.test.ts`                                     | Check active-option behavior, form-reset notifications and reentry, named selection action overloads, and canceled/committed option clicks.                                                     |
| `src/declarative.ts`                                         | Preserve the full fractional duration argument and notify the exact state key when a computed descriptor is installed or restored.                                                              |
| `src/reactivity.ts`                                          | Expose targeted internal dependency invalidation for direct descriptor changes to reactive state.                                                                                               |
| `quality/lint-boundaries.json`                               | Lower the exact non-null assertion allowance after removing a stale parser assertion and remove the now-unused Carousel test allowance.                                                         |
| `README.md`                                                  | Clarify fractional debounce syntax if the confirmed behavior correction changes the documented contract.                                                                                        |
| `docs/TESTING.md`                                            | Record mutation-driven behavior checks, including doctor allocation, with owning tests and frozen focused evidence.                                                                             |
| `docs/tickets/ROADMAP.md`                                    | Record the later authorization, completed one-time mutation audit, and dependency into ticket 0057.                                                                                             |
| `scripts/smoke-server.mjs`                                   | Check invalid port and malformed site-bundle process behavior exposed by built-server survivors.                                                                                                |
| `test/cli.test.ts`                                           | Check rejected options, configuration, registry entries, and paths without project writes.                                                                                                      |
| Isolated `stryker.config.mjs` and `vitest.stryker.config.ts` | Bound workers and timeouts, select the full production scope, and exclude source/checkout contract tests that cannot execute on instrumented source.                                            |
| Isolated `test-results/mutation/analyze-report.mjs`          | Validate all 136 frozen source hashes, including 13 exact zero-mutant files omitted by Stryker's JSON; reject pending/ignored mutants and produce per-file and per-operator inputs.             |
| Isolated `test-results/mutation/link-followups.mjs`          | Link each focused result to the immutable full-report mutant signature while retaining both statuses and rejecting source or signature mismatches.                                              |
| Isolated `test-results/mutation/build-dispositions.mjs`      | Build a complete per-mutant register from linked reports and reviewed equivalence notes; require a source-matched surviving rerun before reviewing an original timeout.                         |
| Archived `tools/queue-final-analysis.zsh`                    | Wait for the exact live runner process to exit, then validate and link only a nonempty complete report.                                                                                         |
| Archived `tools/run-final-analysis.zsh` and README           | Validate and link the completed report, then preserve full JSON/HTML, summaries, dispositions, and logs with checked SHA-256 digests outside `/tmp`.                                            |
| Isolated API runner-error configuration                      | Rerun frozen `server/api.ts` error locations with the repaired audit-only tool and owning server tests.                                                                                         |
| Isolated remaining-error configuration                       | Rerun one frozen doctor migration line and Project Browser lines 423 and 629 with the repaired tool and owning suites.                                                                          |
| Isolated htmx capability configuration                       | Rerun the frozen `src/htmx.ts` capability guard against its expanded owning suite with one worker.                                                                                              |
| Isolated fetch boundary configuration                        | Rerun frozen `src/fetch.ts` request-parameter and retry decisions against the expanded integration suite with one worker.                                                                       |
| Isolated fetch dynamic-input Stryker and Vitest configs      | Rerun frozen URL and options validation at `src/fetch.ts:587-590` against malformed dynamic request arguments with one worker.                                                                  |
| Isolated observation boundary configuration                  | Rerun frozen request-counter normalization and subscription-options validation against the owning suite with one worker.                                                                        |
| Isolated persistence codec configuration                     | Rerun frozen field-codec validation and overlap lines 26–40 against the expanded owning suite with one worker.                                                                                  |
| Isolated persistence option configuration                    | Rerun frozen codec-ID and disposal-default lines 33 and 71 against the owning suite with one worker.                                                                                            |
| Isolated persistence envelope configuration                  | Rerun frozen namespace, clock, envelope, migration, and revision comparison lines against the owning suite with one worker.                                                                     |
| Isolated plugin range configuration                          | Rerun frozen stable-version parsing and unsupported-range guards against the expanded owning suite with one worker.                                                                             |
| Isolated plugin name configuration                           | Rerun frozen ordinary and official name-pattern lines against the expanded owning suite with one worker.                                                                                        |
| Isolated plugin order configuration                          | Rerun frozen contradictory `before`/`after` guard lines against the expanded owning suite with one worker.                                                                                      |
| Isolated `stryker.cli.config.mjs`                            | Exercise the otherwise uncovered CLI process through the existing CLI suite with one worker and a separate report.                                                                              |
| Isolated missing-registry CLI configuration                  | Rerun frozen CLI read/parse lines 27–42 against the expanded 33-case process suite with one worker.                                                                                             |
| Isolated `vitest.cli.stryker.config.ts`                      | Keep the CLI follow-up's baseline to the owning root test file even while another Stryker sandbox exists.                                                                                       |
| Isolated `stryker.rules.config.mjs` and Vitest config        | Rerun doctor rules mutants against their owning tests with one worker after the CLI pass.                                                                                                       |
| Isolated `queue-rules.zsh`                                   | Start the one-worker doctor-rules pass only after the CLI worker exits and free memory is at least 40%.                                                                                         |
| Isolated server command-runner configuration                 | Exercise the uncovered built server entry after the earlier focused mutation passes.                                                                                                            |
| Isolated Project Browser Stryker and Vitest configs          | Rerun the block's source mutants against its owning tests with an alias for the root package import.                                                                                            |
| Isolated Project Browser guard configs                       | Rerun frozen invalid column-move direction guard line 506 against its expanded owning suite with one worker.                                                                                    |
| Isolated `queue-project-browser.zsh`                         | Start the one-worker block pass after the built-server pass ends and free memory is at least 40%.                                                                                               |
| Isolated `queue-cli-rerun.zsh`                               | Rerun all 595 CLI mutants against the expanded root-only suite after the earlier focused passes.                                                                                                |
| Isolated `queue-rules-rerun.zsh`                             | Rerun doctor-rules mutants after the expanded CLI rerun, retaining the initial rules report.                                                                                                    |
| Isolated `queue-server.zsh`                                  | Start the one-worker built-server pass after the queued rules pass ends and free memory is at least 40%.                                                                                        |
| Isolated Combobox Stryker and Vitest configs                 | Rerun frozen document-level outside-interaction listener lines against the expanded owning suite with one low-priority worker.                                                                  |
| Isolated Data Table Stryker and Vitest configs               | Rerun frozen date-value comparison lines against the expanded owning suite with one low-priority worker.                                                                                        |
| Isolated Menubar Stryker and Vitest configs                  | Rerun frozen menu-event synchronization line 315 against the expanded owning suite with one low-priority worker.                                                                                |
| Isolated Multi Select Stryker and Vitest configs             | Rerun frozen control validation lines 88-97, generated-part tags at 124, enabled-option filtering at 185, disabled rendering at 203-206, and click guard line 730 with one low-priority worker. |
| Isolated Select pointer Stryker and Vitest configs           | Rerun the frozen active-option guards near lines 303 and 319 with focused disabled-option behavior tests and one low-priority worker.                                                           |
| Isolated Select reset Stryker config                         | Rerun frozen form-reset notification guards near lines 620-621 against changed, unchanged, and reentrant reset behavior with one low-priority worker.                                           |
| Isolated Select action Stryker config                        | Rerun frozen named-action target/value disambiguation near line 873 against implicit and explicit action cases with one low-priority worker.                                                    |
| Isolated Select option-click Stryker and Vitest configs      | Rerun frozen option-click close guard line 602 against canceled and committed clicks with one low-priority worker.                                                                              |
| Isolated Toggle runner-error Stryker and Vitest configs      | Reclassify frozen Toggle Group form-input and metadata mutations near lines 220-244 and 356-358 with the repaired tool and owning document tests.                                               |
| Isolated Tags Input runner-error configs                     | Reclassify frozen generated-input, rendered-value, and remove-button mutations near lines 187-206 and 371 with the repaired tool and owning lifecycle tests.                                    |
| Isolated Sortable runner-error configs                       | Reclassify frozen event-target and native drag-transfer guards near lines 517 and 587 with the repaired tool and owning document tests.                                                         |
| Isolated Multi Select remaining-error configs                | Reclassify frozen option-identity and delegated remove-button guards near lines 286-288 and 751 with the repaired tool and owning tests.                                                        |
| Isolated Tree runner-error configs                           | Reclassify six frozen expansion-guard mutations at line 296 with the repaired tool and owning primary/document tests.                                                                           |
| Isolated grouped UI runner-error configs                     | Reclassify frozen Stepper, Tabs, Rating, and Hover Card mutations with the repaired tool and owning tests.                                                                                      |
| Isolated remaining UI runner-error configs                   | Reclassify frozen Feed, Form, Input OTP, Number Field, Time Picker, Toolbar, and Tree mutations with the repaired tool and owning tests.                                                        |
| Isolated runtime root-event configs                          | Rerun the frozen direct-root event branch near line 410 against the expanded owning runtime suite with one low-priority worker.                                                                 |
| Isolated signal-patch boundary configs                       | Rerun frozen `onlyIfMissing` null and nested-object branches near lines 27-35 against the owning patch suite with one low-priority worker.                                                      |
| Isolated patch target-ID configs                             | Rerun frozen selector-free root and out-of-scope ID lookup guards near lines 73-77 against the owning patch suite with one low-priority worker.                                                 |
| Isolated malformed-patch configs                             | Rerun frozen SVG/XML parser-error handling near line 60 against the owning patch suite with one low-priority worker.                                                                            |
| Isolated mixed-ID patch configs                              | Rerun the frozen skip for an unmatched selector-free ID near line 221 against the owning patch suite with one low-priority worker.                                                              |
| Isolated unowned-document patch configs                      | Rerun frozen transaction optionality near lines 100, 160, and 192 against successful foreign-document patch modes with one low-priority worker.                                                 |
| Isolated selector-free mode patch configs                    | Rerun the frozen selector-required mode guard near lines 142-146 against public invalid-mode cases with one low-priority worker.                                                                |
| Isolated doctor data open-failure configs                    | Rerun the frozen optional cleanup call at line 185 against a deterministic file-removal race with one low-priority worker.                                                                      |
| Isolated doctor data limit configs                           | Rerun frozen character validation and exact file, byte, workspace, directory, and BOM boundaries with one low-priority worker.                                                                  |
| Isolated doctor data safety configs                          | Rerun frozen root-containment, canonical-array, and symlink-open flags against owning doctor-data tests with one low-priority worker.                                                           |
| Isolated doctor data allocation config                       | Rerun the frozen buffer-sizing line with the new resource regression test and one low-priority worker.                                                                                          |
| Isolated document listener signal config                     | Rerun frozen `src/kernel.ts:911` with the new signal-getter retirement case and one low-priority worker.                                                                                        |
| Isolated Stryker event-recorder module                       | Omit the oversized plan and duplicate final-report events while retaining per-mutant event files; original and patched hashes are frozen above.                                                 |

### Design changes

No changes to the frozen production scope, default mutation operators, or acceptance criteria.
Focused one-worker configurations and owning tests expanded as the original results exposed gaps.

## Test

| Command                                                                                          | Result                                        | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| ------------------------------------------------------------------------------------------------ | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0053-run-final-mutation-audit.md` | Pass                                          | Frozen plan was validated before the first mutation attempt.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Locked-dependency audit Vitest baseline                                                          | Pass after fixture correction                 | The isolated checkout ran the affected Resizable and observer files; audit-only package and source-inventory contracts are excluded as recorded above.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| Stryker 10.0.0 dry run                                                                           | Pass                                          | 136 source files, 56,731 generated mutants, 4,521 tests passed in 2m 49s; no mutant was executed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| `npm run quality:fast`                                                                           | Pass                                          | `.git/jqstar/runs/2026-09-24T11-56-44-584Z-29770/report.json`; browser components, static checks, formatting, and ticket workflow passed. An earlier attempt failed only Prettier on the Resizable test and was corrected.                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Initial four-worker mutation attempt                                                             | Stopped for resource tuning                   | `test-results/mutation/four-worker-stopped.log`; it passed baseline, then reached 2,945/56,731 tested with an estimated 43h remaining. No partial results are accepted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Revised Plan validation                                                                          | Pass                                          | `npm run ticket:validate -- --phase plan --ticket docs/tickets/0053-run-final-mutation-audit.md` passed after changing the worker budget.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Six-worker mutation attempt                                                                      | Stopped for resource tuning                   | `test-results/mutation/six-worker-stopped.log`; baseline passed 4,521 tests in 2m 48s, then reached 3,447/56,731 classified with 3.63 GiB RSS and 81% free memory. No partial results are accepted.                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Eight-worker Plan validation                                                                     | Pass                                          | `npm run ticket:validate -- --phase plan --ticket docs/tickets/0053-run-final-mutation-audit.md` passed before launch; audit config SHA-256 `60711dc9da64cdc0bde0630387025f57a6aaa8fcf74c14df71e438bb606761c2`.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| `node --check test-results/mutation/analyze-report.mjs`                                          | Pass                                          | Isolated analyzer parses; its source binding and status checks await the finished JSON report.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| First eight-worker mutation attempt                                                              | Stopped to add event evidence                 | `test-results/mutation/eight-worker-no-events-stopped.log`; it reached 3,806/56,731 classified but produced no interim JSON. No partial results are accepted.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Reporter-enabled Plan validation                                                                 | Pass                                          | `npm run ticket:validate -- --phase plan --ticket docs/tickets/0053-run-final-mutation-audit.md` passed before launch; audit config SHA-256 `603472d062eafe49ecb47e2356ca57895bf31cebe11b3df451e303df0eb2c8fb`.                                                                                                                                                                                                                                                                                                                                                                                                                               |
| Unpatched event-recorder run                                                                     | Fail                                          | `test-results/mutation/event-recorder-unpatched-failed.log`; the 4,521-test baseline passed, then the recorder raised `RangeError: Invalid string length` on the complete plan event. No mutation result is accepted.                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Patched-reporter Plan validation                                                                 | Pass                                          | The exact recorder-only patch and unchanged 136-file mutation scope were validated before restart.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Full Stryker mutation run                                                                        | Running                                       | Isolated checkout `/tmp/jqstar-mutation-5DqMc1`, `test-results/mutation/full-run.log`; the 4,521-test baseline passed and 4,219/56,731 mutants were provisionally classified by 2026-09-24 12:55 UTC. Final results remain pending.                                                                                                                                                                                                                                                                                                                                                                                                           |
| Initial CLI command-runner follow-up                                                             | Complete; gaps identified                     | `/tmp/jqstar-doctor-mut-2qxEFx/reports/mutation-cli-initial.json`: source SHA-256 `d634123abe5503f51f84f971326844f0c43457557e1dfbed056bbf05210ed2b9`, 595 mutants, 354 killed, 238 survived, 3 timed out, none uncovered; elapsed 20m 36s.                                                                                                                                                                                                                                                                                                                                                                                                    |
| Expanded CLI behavior tests                                                                      | Pass                                          | `npx vitest run test/cli.test.ts`: 32/32 passed in the main tree, adding rejected-option, configuration, registry, and no-write cases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| First isolated expanded CLI baseline                                                             | Pass with duplicate copy                      | A direct Vitest file-name filter picked up 14 stale tests inside the active rules sandbox (46 total). This result is not used as the rerun baseline.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Corrected isolated expanded CLI baseline                                                         | Pass                                          | `nice -n 10 npx vitest run --config vitest.cli.stryker.config.ts`: exactly one file and 32/32 tests passed while the rules sandbox existed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Expanded CLI mutation rerun                                                                      | Complete; gaps identified                     | The one-worker frozen-source 595-mutant pass finished in 31m51s: 409 killed, 183 survived, three timed out. `reports/mutation-cli.json` in the isolated doctor checkout has the same `bin/jqstar.mjs` SHA-256 `d634123abe5503f51f84f971326844f0c43457557e1dfbed056bbf05210ed2b9` as the main tree. Signature linkage against the retained initial CLI report matches all 595 mutants and shows 55 original non-killed mutants newly killed.                                                                                                                                                                                                   |
| Missing configured registry CLI case                                                             | Pass                                          | `nice -n 10 npx vitest run test/cli.test.ts --maxWorkers=1` passes 33/33 with a new process case that reports a missing configured registry path before any project write. ESLint and Prettier pass. The isolated 33-case baseline also passes; source and test hashes match the main tree.                                                                                                                                                                                                                                                                                                                                                   |
| Queued missing-registry CLI mutation pass                                                        | Complete; gaps remain                         | Frozen `bin/jqstar.mjs:27-42` command-runner pass classified 22 mutants: 11 Killed and 11 Survived. Source SHA-256 `d634123abe5503f51f84f971326844f0c43457557e1dfbed056bbf05210ed2b9`; archived `preliminary/mutation-cli-missing-registry.json`. This narrow follow-up retains the earlier 595-mutant report.                                                                                                                                                                                                                                                                                                                                |
| Focused doctor Vitest                                                                            | Pass                                          | `npx vitest run test/doctor.test.mjs`: 38/38 tests passed with accepted and rejected configuration cases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| First focused doctor mutation rerun                                                              | Fail: five survivors                          | Isolated `/tmp/jqstar-doctor-mut-2qxEFx/reports/mutation-doctor-initial.json`: 368 selected, 59 killed, 5 survived, 304 without coverage from the single selected test file.                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| Corrected focused doctor mutation rerun                                                          | Pass for covered mutants                      | Isolated `/tmp/jqstar-doctor-mut-2qxEFx/reports/mutation-doctor-validation-only.json`: 368 selected, 64 killed, 0 survived, 304 without coverage. The remaining 304 require owning suites or separate disposition.                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Expanded doctor migration Vitest                                                                 | Pass                                          | `npx vitest run test/doctor-migrations.test.mjs test/doctor.test.mjs`: 77/77 tests passed, including tampered plans, filesystem races, and valid boundary plans.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| First doctor-rules Vitest                                                                        | Fail: diagnostic mismatch                     | The unsafe ownership output correctly raised `JQS_PATH_UNSAFE`; the new test had expected the generic input code. Corrected the expectation without changing product code.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Combined doctor-rules Vitest                                                                     | Pass                                          | `npx vitest run test/doctor-rules.test.mjs test/doctor-migrations.test.mjs test/doctor.test.mjs`: 101/101 passed after the diagnostic correction and boundary cases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Expanded combined doctor Vitest                                                                  | Pass                                          | The same three-file command passed 105/105 after four further doctor-rules boundary tests.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Isolated doctor-rules Vitest baseline                                                            | Pass                                          | `npx vitest run --config vitest.rules.stryker.config.ts`: 62/62 tests passed in the locked follow-up checkout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| Initial doctor-rules mutation rerun                                                              | Complete; gaps identified                     | `/tmp/jqstar-doctor-mut-2qxEFx/reports/mutation-doctor-rules-initial.json`: source SHA-256 `eebc5ce232ccad6d940e438452ecfd75265c095543ef2b8662970acd2ddf035a`, 658 mutants, 432 killed, 174 survived, 46 uncovered, 6 timed out; elapsed 3m 7s.                                                                                                                                                                                                                                                                                                                                                                                               |
| Expanded doctor-rules behavior tests                                                             | Pass                                          | `npx vitest run test/doctor-rules.test.mjs`: 28/28 passed, adding declared range, duplicate installation, plugin peer, and explicit entrypoint cases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Isolated expanded doctor-rules baseline                                                          | Pass                                          | `nice -n 10 npx vitest run --config vitest.rules.stryker.config.ts`: 66/66 tests passed in the locked follow-up checkout.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Expanded doctor-rules mutation rerun                                                             | Complete; gaps remain                         | The one-worker frozen-source 658-mutant rerun finished in 3m6s: 470 killed, 147 survived, 35 NoCoverage, and six Timeout. `reports/mutation-doctor-rules.json` in the isolated doctor checkout has source SHA-256 `eebc5ce232ccad6d940e438452ecfd75265c095543ef2b8662970acd2ddf035a`, matching the main tree. Signature linkage to the initial report matches all 658 mutants and finds 38 original non-killed mutants newly killed.                                                                                                                                                                                                          |
| Built-server smoke baseline                                                                      | Pass                                          | In the locked isolated checkout, `npm run build:server` built `server-dist/index.mjs` in 0.68 seconds; `node scripts/smoke-server.mjs` passed all self-hosted HTTP, SSE, browser, and security-header checks in 2.45 seconds.                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Audit-only archive-path smoke baseline                                                           | Pass                                          | `JQS_STATIC_DIR=test/fixtures/mutation-site node scripts/smoke-server.mjs` passed the same self-hosted checks using the source-bound archive copied outside gitignored `demo-dist`.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Built-server mutation pass                                                                       | Complete; gaps identified                     | `/tmp/jqstar-doctor-mut-2qxEFx/reports/mutation-server.json`: frozen `server/index.ts` SHA-256 `835e2b9eb421991947b50560ad14c62d43e66a79020e21609937254a147767c8`, 269 mutants, 116 killed, 145 survived, 8 timed out, none uncovered; elapsed 13m 30s. The command runner exercises the built archive and browser smoke, but invalid port/bundle inputs remain untested.                                                                                                                                                                                                                                                                     |
| Expanded built-server input smoke                                                                | Pass                                          | `node --check scripts/smoke-server.mjs`, `nice -n 10 npm run build:server`, and `nice -n 10 node scripts/smoke-server.mjs` passed. Four invalid ports, a valid temporary bundle, and seven malformed bundles now run before the original HTTP/SSE/browser proof.                                                                                                                                                                                                                                                                                                                                                                              |
| Isolated expanded server smoke baseline                                                          | Pass                                          | Copied smoke script and frozen `server/index.ts` hashes match the main tree; `nice -n 10 npm run build:server` and `JQS_STATIC_DIR=test/fixtures/mutation-site node scripts/smoke-server.mjs` passed in the locked follow-up checkout.                                                                                                                                                                                                                                                                                                                                                                                                        |
| Server input mutation rerun                                                                      | Complete; gaps remain                         | `stryker.server-inputs.config.mjs` completed 97 frozen `server/index.ts` mutants in 2m59s: 74 killed and 23 survived, with no uncovered or timed-out mutants. Source SHA-256 `835e2b9eb421991947b50560ad14c62d43e66a79020e21609937254a147767c8` matches the main tree. Signature linkage to the initial 269-mutant server report matches all 97 focused mutants and shows 35 original non-killed mutants newly killed.                                                                                                                                                                                                                        |
| Updated Project Browser Vitest                                                                   | Pass                                          | `npx vitest run test/project-browser-block.test.ts`: 23/23 passed, including grouped-to-virtual reset, pinned offsets, keyboard limits, and invalid drop guards.                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| First isolated Project Browser baseline                                                          | Fail: missing alias                           | `vitest.project-browser.stryker.config.ts` initially lacked the root `jquery-star` alias; zero tests loaded. Added the same source alias used by the full mutation runner.                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| Corrected isolated Project Browser baseline                                                      | Pass                                          | `nice -n 10 npx vitest run --config vitest.project-browser.stryker.config.ts`: 23/23 passed in 21.62 seconds.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Project Browser mutation pass                                                                    | Complete; follow-up open                      | `stryker.project-browser.config.mjs` completed 650 frozen-source mutants in 81m16s: 386 killed, 239 survived, 22 NoCoverage, one Timeout, and two RuntimeError. The report is `reports/mutation-project-browser.json` in the isolated doctor checkout; source SHA-256 `93bae49e40a7ed3353b1e5d34b6123e679ada722f6a3a602c9667b9d22439693` matches the main tree. One error matches the full-run line 629 error; the other is a focused-only line 423 error queued for repaired-tool review.                                                                                                                                                    |
| Provisional Project Browser source-linked comparison                                             | Partial; final link pending                   | Of 587 emitted full-run events for this source, matching location/operator/replacement signatures link to the completed focused report: 34 original survivors are killed, 208 still survive, 22 remain NoCoverage, one remains Timeout, and one remains RuntimeError. Sixty-three original events have not yet been emitted, so final linkage must wait for the full source-bound JSON report.                                                                                                                                                                                                                                                |
| Invalid column-move direction regression                                                         | Pass                                          | Added a direct malformed `data-column-move` action case; the main Project Browser suite passes 24/24, ESLint and Prettier pass, and the isolated owning baseline passes 24/24. The frozen block source hash `93bae49e40a7ed3353b1e5d34b6123e679ada722f6a3a602c9667b9d22439693` matches the main tree.                                                                                                                                                                                                                                                                                                                                         |
| Queued Project Browser guard mutation pass                                                       | Complete; two next-branch survivors           | Frozen line 506 classified 12 mutants: 10 Killed and two Survived, both in the `next` direction branch. Added a direct forward-move behavior case after this pass. Source SHA-256 `93bae49e40a7ed3353b1e5d34b6123e679ada722f6a3a602c9667b9d22439693`; archived `preliminary/mutation-project-browser-guard.json`. A narrow rerun with the expanded test is pending.                                                                                                                                                                                                                                                                           |
| Expanded server API behavior tests                                                               | Pass                                          | `nice -n 10 npx vitest run test/server.test.ts --maxWorkers=1`: 21/21 passed with positive/invalid feed cursors, independent rejected profile fields, and normalized accepted fields.                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| Isolated focused server API baseline                                                             | Pass                                          | The copied `test/server.test.ts` and frozen `server/api.ts` hashes match the main tree; `nice -n 10 npx vitest run --config vitest.api.stryker.config.ts` passed 21/21.                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Focused server API mutation pass                                                                 | Complete; error probe queued                  | `stryker.api.config.mjs` completed 65 frozen `server/api.ts` mutants in the request/profile input ranges: 50 killed, eight survived, four NoCoverage, and three RuntimeError. The report source SHA-256 `57884797f8dc8517427e8b32602bcd7dd2903fad54cdde0c1f1398dc20ec8846` matches the main tree. All three errors are at lines 932, 1255, and 1265, already included in the queued repaired-tool 54-line API pass.                                                                                                                                                                                                                           |
| Expanded CSP array capability tests                                                              | Pass                                          | `nice -n 10 npx vitest run test/csp-engine.test.ts --maxWorkers=1`: 13/13 passed, including exact and negative `.at()` bounds and forbidden named array properties.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Isolated focused CSP baseline                                                                    | Pass                                          | Frozen `src/csp/evaluator.ts` and copied `test/csp-engine.test.ts` hashes match the main tree; `nice -n 10 npx vitest run --config vitest.csp.stryker.config.ts` passed 13/13.                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| First focused CSP mutation attempt                                                               | Dry run failed; corrected and requeued        | Stryker selected 48 frozen evaluator mutants but its initial Vitest run failed the exact CSP source-scan case because instrumentation contains `new Function`. The full audit already excludes that one test by name. The focused config now uses the same `testNamePattern`; its baseline passes 12/12 behavior tests with one source-scan skip, and Prettier passes. Queue PID 95567 waits for PID 93675 and at least 40% free memory. The failed log is retained.                                                                                                                                                                          |
| Expanded doctor module mutation reruns                                                           | Progress                                      | Preserved isolated reports show 271 killed/63 survived/34 uncovered, then 338/28/2, 352/16/0, 364/4/0, and finally 366/2/0 across the same 368 source mutants. These targeted reports do not replace the frozen full run.                                                                                                                                                                                                                                                                                                                                                                                                                     |
| `npm run quality:fast` after doctor corrections                                                  | Pass before evidence edit                     | `.git/jqstar/runs/2026-09-24T13-15-17-769Z-48764/report.json`; ticket workflow, format, browser components, static fast checks, and dependency research gate passed. Updating this ledger afterward made its fingerprint stale.                                                                                                                                                                                                                                                                                                                                                                                                               |
| `npm run ticket:validate -- --phase code` with that report                                       | Fail: stale report                            | The report predates this evidence edit. Re-run the fast gate on the final Code-phase tree before phase closure; no test or product behavior failed.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Full-run interim event analysis                                                                  | Unresolved runner errors                      | `node test-results/mutation/analyze-events.mjs` parsed 10,232 unique events with no incomplete files: 5,290 killed, 2,860 uncovered, 1,967 survived, 58 timeout, and 57 `RuntimeError`. Every observed runtime error has the same Stryker `errorToString` failure; none is accepted as a kill.                                                                                                                                                                                                                                                                                                                                                |
| Isolated Stryker error-serializer probe preparation                                              | Pass                                          | Cloned the pinned 113-MiB tool directory to `/tmp/jqstar-mutation-tools-errors-20260924`, leaving the running tool untouched. Only `util/dist/src/errors.js` changed (SHA-256 `a43f465dc221d46b8947099b6744fce1c3ca021878b584e62e4df83b68e953b4` → `1532c2ea55d90646ab77cb70f74a3cbc89f977e0cbad521095ccf338beb38755`); `node --check` and a null-prototype thrown-value probe pass.                                                                                                                                                                                                                                                          |
| Doctor data runner-error probe                                                                   | Complete; cleanup behavior identified         | The repaired-tool pass on frozen `bin/doctor/data.mjs:184-185` emitted two mutants: removing the `finally` cleanup remains RuntimeError, now with the underlying Node 26 error that a `FileHandle` was closed during garbage collection; removing optional chaining from `handle?.close()` survived. Product source already closes the handle. Source SHA-256 `832c560b58314c390ad8835b86e0f9725ad7f98e6bba98d4500adbe053874759` matches main; preserve the original RuntimeError status and test the open-failure path for the optional-chain survivor.                                                                                      |
| Provisional doctor result linkage                                                                | Pass; final link pending                      | An exact path/location/operator/replacement comparison matches 367 of 368 corrected doctor mutants to emitted full-run events; 183 are provisionally `Survived`/`NoCoverage` in the frozen run and `Killed` in the focused rerun. The full JSON, including the one unmatched mutant, remains the authority.                                                                                                                                                                                                                                                                                                                                   |
| Follow-up linker self-test                                                                       | Pass                                          | `node --check test-results/mutation/link-followups.mjs` and a complete initial-versus-final doctor report link passed: all 368 signatures matched; 307 of the initial 309 unresolved mutants are killed in the final doctor report. The linker retains original statuses and source hashes and rejects mismatches.                                                                                                                                                                                                                                                                                                                            |
| Declarative key and fractional-duration regression                                               | Fail before fix                               | `nice -n 10 npx vitest run test/declarative.test.ts --maxWorkers=1` ran 46 cases with one failure: `debounce.0.05s` incremented before 49ms because `modifier.split(".", 2)` passed only `0` to the duration parser. The eight key-modifier cases passed.                                                                                                                                                                                                                                                                                                                                                                                     |
| Declarative parser correction                                                                    | Pass                                          | Preserved the full argument after the first dot in `src/declarative.ts`. The owning suite passed 47/47 after a matching fractional-throttle case was added; source and test formatting passed, and README now documents fractional durations. Product source in the full audit checkout is unchanged.                                                                                                                                                                                                                                                                                                                                         |
| Adjacent declarative lifecycle suites                                                            | Pass                                          | `nice -n 10 npx vitest run test/declarative-nested-application.test.ts test/declarative-detached.test.ts --maxWorkers=1`: 11/11 passed after the parser correction.                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Corrected-source declarative mutation preparation                                                | Pass                                          | Detached `/tmp/jqstar-declarative-mutation-20260924` at frozen HEAD, copied only the corrected source/test and locked dependencies, then ran `nice -n 10 npx vitest run --config vitest.declarative.stryker.config.ts`: 47/47. Source/test hashes match the main tree.                                                                                                                                                                                                                                                                                                                                                                        |
| Corrected-source declarative mutation pass                                                       | Complete; parser gaps narrowed                | `stryker.declarative.config.mjs` completed 116 mutants on corrected parser lines 135–180: 107 killed, six survived, three NoCoverage. The report source SHA-256 `1264630ebdd367f1fd92024ae80f2bfed7c0de7e2017c32c6fee7a82ea87349d` matches the main corrected source and differs from the frozen full run, so its statuses stay separate. Two surviving regex mutations motivated cases without a unit and with an invalid prefix.                                                                                                                                                                                                            |
| Expanded corrected parser regression                                                             | Pass                                          | Fake-time cases now distinguish `debounce.50`, `debounce.0.05s`, invalid `debounce.x25ms`, and invalid `debounce.25msx`. Main declarative and adjacent suites pass 58/58; isolated corrected-source baseline passes 47/47; test ESLint/Prettier and README/brain-doc Prettier pass. README clarifies that a missing unit means milliseconds.                                                                                                                                                                                                                                                                                                  |
| Corrected parser mutation rerun                                                                  | Complete; four survivors                      | The expanded corrected-source parser pass classified 116 mutants: 109 Killed, four Survived, and three NoCoverage. It added two kills over the initial corrected-source pass. Source SHA-256 `1264630ebdd367f1fd92024ae80f2bfed7c0de7e2017c32c6fee7a82ea87349d`; archived `preliminary/mutation-declarative-corrected-expanded.json`. It remains separate from the frozen full run.                                                                                                                                                                                                                                                           |
| Doctor option matrix                                                                             | Pass                                          | Direct `runDoctor` cases now reject invalid modes, flags, values, and entrypoint combinations, and verify help plus conflicting JSON/quiet output. The main doctor suites pass 124/124; the isolated option suite passes 57/57. `node --check` and Prettier pass for the owning file.                                                                                                                                                                                                                                                                                                                                                         |
| Queued doctor option mutation pass                                                               | Pass; 152 classified                          | Frozen `bin/doctor/index.mjs` option pass: 152 mutants, 106 killed and 46 survived, with no unclassified results. Source SHA-256 `ac862195f12b0833cb34b47d6e629d80c42dc336818c91b3ce16277add72f56d`; archived `preliminary/mutation-doctor-index-options.json`. This repaired-tool follow-up is distinct from the original full audit.                                                                                                                                                                                                                                                                                                        |
| Doctor data boundary tests                                                                       | Pass                                          | `nice -n 10 npx vitest run test/doctor-data.test.mjs --maxWorkers=1`: 7/7. Tests cover own-field access, bounded text and names, path rejection, JSON depth and cycles, resolved path containment, reader budgets, and directory enumeration. The isolated owning baseline also passes 7/7; source and test hashes match the main tree.                                                                                                                                                                                                                                                                                                       |
| Queued doctor data mutation pass                                                                 | Pass; 317 classified                          | Frozen `bin/doctor/data.mjs` pass: 317 mutants, 238 killed, 58 survived, 17 NoCoverage, and 4 TimedOut. Source SHA-256 `832c560b58314c390ad8835b86e0f9725ad7f98e6bba98d4500adbe053874759`; archived `preliminary/mutation-doctor-data-expanded.json`. The full audit retains its original results.                                                                                                                                                                                                                                                                                                                                            |
| Combined doctor suites after data tests                                                          | Pass                                          | `nice -n 10 npx vitest run test/doctor-data.test.mjs test/doctor-rules.test.mjs test/doctor-migrations.test.mjs test/doctor.test.mjs --maxWorkers=1`: 131/131.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| `nice -n 10 npm run quality:fast` after doctor data tests                                        | Fail: static gate                             | Browser component proof passed 76/76, but static-fast found the parser's now unnecessary null check and two ticket spelling terms. Report: `.git/jqstar/runs/2026-09-24T14-19-04-982Z-99704/report.json`. Corrected all three; a fresh fast gate is required.                                                                                                                                                                                                                                                                                                                                                                                 |
| Focused parser and style recheck                                                                 | Pass                                          | Main declarative and adjacent suites pass 58/58; isolated corrected-source baseline passes 47/47. ESLint and Prettier pass on `src/declarative.ts`; CSpell passes on this ticket. The corrected source hash is `1264630ebdd367f1fd92024ae80f2bfed7c0de7e2017c32c6fee7a82ea87349d` in both trees.                                                                                                                                                                                                                                                                                                                                              |
| Second `nice -n 10 npm run quality:fast`                                                         | Fail: lint census                             | All other selected gates passed, including 76/76 browser components. `lint-boundaries` required reducing the exact `src/declarative.ts` non-null assertion count from three to two. Report: `.git/jqstar/runs/2026-09-24T14-23-34-616Z-3372/report.json`.                                                                                                                                                                                                                                                                                                                                                                                     |
| Updated exact lint allowance                                                                     | Pass                                          | `nice -n 10 node scripts/quality/check-lint-boundaries.mjs` passed for 365 TypeScript files and 284 exact file/rule counts. Prettier and CSpell also pass on the changed ticket and quality file.                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| Corrected `nice -n 10 npm run quality:fast`                                                      | Pass before evidence edit                     | Ticket workflow, 42 quality-runner self-tests, dependency research, format, 76 browser component cases, and all static-fast checks passed. Report: `.git/jqstar/runs/2026-09-24T14-28-14-614Z-6384/report.json`. This evidence edit makes its fingerprint stale for Code phase closure; rerun on the final Code tree.                                                                                                                                                                                                                                                                                                                         |
| Doctor discovery regression before correction                                                    | Fail as expected                              | The new owning suite ran 7 cases with one failure: `workspaces: "apps/*"` was silently ignored instead of rejected. Existing accepted workspace and installed-package cases passed.                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| Doctor discovery correction and owning suites                                                    | Pass                                          | Added a present-value shape guard in `bin/doctor/discovery.mjs`, plus a null case. Five doctor suites pass 140/140, including the CLI report for malformed workspaces; source and test ESLint/Prettier pass. The isolated corrected-source discovery and CLI baseline passes 66/66.                                                                                                                                                                                                                                                                                                                                                           |
| Queued corrected-source doctor discovery mutation pass                                           | Pass; 266 classified                          | Corrected `bin/doctor/discovery.mjs` pass: 266 mutants, 196 killed, 53 survived, and 17 NoCoverage. Source SHA-256 `b7fac8c13a2b386018b1dda1a12f268971d684d51b82e87cff4cf46692c7314e`; archived `preliminary/mutation-doctor-discovery-corrected.json`. Its source differs from the frozen full run, so the reports stay separate.                                                                                                                                                                                                                                                                                                            |
| Updated isolated doctor option baseline                                                          | Pass                                          | After copying the new CLI malformed-workspace case, `nice -n 10 npx vitest run --config vitest.doctor-index.stryker.config.ts` passes 58/58. The queued option pass will use this current owning suite.                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| Per-mutant disposition builder self-check                                                        | Pass; full audit pending                      | `node --check test-results/mutation/build-dispositions.mjs` and a completed focused-doctor initial/final link produced 309 non-killed rows from 368 original mutants: 307 killed in the matching follow-up and two left open. Applying two individually reasoned equivalence reviews closed those two without altering either original status. Negative probes also rejected a missing row and a duplicate original id. The full-run register must wait for the validated complete JSON report.                                                                                                                                               |
| Disposition full-scope guard                                                                     | Pass                                          | A `--require-full` probe rejects the 368-mutant doctor self-check with an expected-count error; the reviewed doctor self-check still closes 307 focused kills and two equivalents. Final invocation will require exactly 56,731 original mutants after source-bound report validation.                                                                                                                                                                                                                                                                                                                                                        |
| `nice -n 10 npm run quality:fast` after discovery correction                                     | Pass before evidence edit                     | Ticket workflow, quality-runner self-tests, dependency research, format, 76 browser component cases, and all static-fast checks passed. Report: `.git/jqstar/runs/2026-09-24T14-41-04-639Z-18297/report.json`. This ledger edit changes the fingerprint; rerun the fast gate on the final Code tree before phase closure.                                                                                                                                                                                                                                                                                                                     |
| Repaired API runner-error rerun                                                                  | Complete; errors characterized                | The repaired-tool pass selected 114 frozen `server/api.ts` mutants across the 54 original error lines: 38 Killed, 10 Survived, 36 NoCoverage, and 30 RuntimeError. The 30 errors now reveal HTTP response double-write exceptions after mutations change handled-route `return true` to `false`, plus one JSON content-type exception; they are distinct from the original serializer errors and remain explicitly classified as RuntimeError. Frozen source SHA-256 `57884797f8dc8517427e8b32602bcd7dd2903fad54cdde0c1f1398dc20ec8846`; archived `preliminary/mutation-api-runtime-errors.json`.                                             |
| Queued remaining runner-error rerun                                                              | Complete; migration selection corrected       | The repaired-tool pass selected seven Project Browser mutants at lines 423 and 629: five Survived and two RuntimeError from invalid DOM calls under mutations. The original doctor migration `BlockStatement` spans lines 78–80, so selecting only 78 yielded no migration mutant; queue a corrected span. Archived `preliminary/mutation-remaining-runtime-errors.json`; frozen Project Browser SHA-256 `93bae49e40a7ed3353b1e5d34b6123e679ada722f6a3a602c9667b9d22439693`. Added a dynamic-root layout case for the surviving setup mutations.                                                                                              |
| Htmx capability guard cases                                                                      | Pass                                          | The owning bridge suite passes 34/34 in both the main and isolated checkout. New cases reject malformed `version`, `config`, each of the six host methods, and non-object capabilities before invoking the host. The frozen `src/htmx.ts` hash `246c68883f8483217947a417066a906d60a720e090c99d3f04400f0935a93080` matches the main tree.                                                                                                                                                                                                                                                                                                      |
| Queued htmx capability mutation pass                                                             | Complete; one survivor                        | Frozen `src/htmx.ts:260-280` pass classified 57 mutants: 56 Killed and one Survived at the redundant `typeof config` guard. Source SHA-256 `246c68883f8483217947a417066a906d60a720e090c99d3f04400f0935a93080`; archived `preliminary/mutation-htmx-capability.json`.                                                                                                                                                                                                                                                                                                                                                                          |
| Fetch request-parameter and retry behavior                                                       | Pass                                          | `nice -n 10 npx vitest run test/fetch.test.ts --maxWorkers=1` passes 16/16, including nullish query-value omission with false/zero retention and cases for 400 versus 399 under `error`, 400 under `auto`, and 204 under `always`. ESLint and Prettier pass. The isolated baseline also passes 16/16; frozen `src/fetch.ts` hash `61e7b1417b84f35006b8715417484105a84b2887a4e467a9df0dcad5d675113f` matches the main tree.                                                                                                                                                                                                                    |
| Queued fetch boundary mutation pass                                                              | Complete; five survivors                      | Frozen `src/fetch.ts:169-175,262-275` pass classified 45 mutants: 40 Killed and five Survived. Added exact query-key and no-network-retry assertions for two behavioral gaps. Source SHA-256 `61e7b1417b84f35006b8715417484105a84b2887a4e467a9df0dcad5d675113f`; archived `preliminary/mutation-fetch-retry.json`. A narrow expanded rerun is pending.                                                                                                                                                                                                                                                                                        |
| Operation observation boundary cases                                                             | Pass                                          | The main `test/observation.test.ts` suite passes 21/21, including emitted JSON-safe request records for NaN/infinite counters and rejection of null subscription options; ESLint and Prettier pass. The isolated owning baseline also passes 21/21, with `src/observation.ts` hash `4b22e83558434c6698aaf5c6d3375a6340ee64706a1b831faa5eedfcf78e3052` matching the main tree.                                                                                                                                                                                                                                                                 |
| Queued observation boundary mutation pass                                                        | Complete; finite-count gap                    | Frozen `src/observation.ts:238-259` pass classified 38 mutants: 25 Killed and 13 Survived. Added finite counter assertions; nested freeze survivors need equivalence review because constructors freeze the underlying metadata. Source SHA-256 `4b22e83558434c6698aaf5c6d3375a6340ee64706a1b831faa5eedfcf78e3052`; archived `preliminary/mutation-observation-boundaries.json`.                                                                                                                                                                                                                                                              |
| Fast quality gate after htmx cases                                                               | Pass before evidence edit                     | `nice -n 10 npm run quality:fast` passed ticket workflow, 42 quality-runner self-tests, dependency research, formatting, 76/76 browser component cases, and static-fast checks. Report: `.git/jqstar/runs/2026-09-24T15-00-43-153Z-32822/report.json`. This evidence row changes its fingerprint; rerun at final Code-phase closure.                                                                                                                                                                                                                                                                                                          |
| Fast gate after recent focused cases                                                             | Pass after targeted corrections               | The first `nice -n 10 npm run quality:fast` run passed 76/76 browser cases but found two observation callbacks returning `Array.push` counts and three ticket spelling entries. A second run exposed two new Project Browser non-null assertions beyond the lint allowance. Replaced them with explicit missing-element guards; targeted TypeScript, spelling, and lint-boundary checks passed. The final `nice -n 10 npm run quality:fast` passed ticket workflow, runner self-test, dependency research, formatting, 76/76 browser components, and static-fast. Final report `.git/jqstar/runs/2026-09-24T16-41-22-656Z-28521/report.json`. |
| Durable preliminary evidence archive                                                             | Pass; final report pending                    | Copied 49 focused JSON reports to `.git/jqstar/mutation-audit/preliminary/`, checked all copies against the SHA-256 manifest, and retained the frozen source manifest/config, pinned toolchain, patches, and report tools. The frozen manifest digest remains `2619dbf79662cdff7eeef8b0d8df8f4a9d5566cba5de34f689947003ebf82d41`.                                                                                                                                                                                                                                                                                                             |
| Preliminary report source provenance                                                             | Pass for all 49 reports                       | Embedded source hashes match both frozen and current trees in 46 reports, only the corrected current source in three reports, and neither in zero reports. The corrected discovery and declarative reports remain separate.                                                                                                                                                                                                                                                                                                                                                                                                                   |
| Final-analysis input selection                                                                   | Prepared; waiting on full report              | `frozen-followups.txt` selects 41 frozen-source reports; three corrected-source reports and five earlier or narrower Carousel passes remain archived separately. `run-final-analysis.zsh` verifies hashes, validates the 136-file/56,731-mutant JSON, signature-links all 41 reports, and builds dispositions using five reviewed equivalents. Syntax passes; the full report is pending.                                                                                                                                                                                                                                                     |
| Queued full-report analysis                                                                      | Live watcher; report pending                  | `tools/queue-final-analysis.zsh` passed `zsh -n` and is live as PID 50467 in a persistent exec session. It checks the runner's original PID and start time every 30 seconds, refuses a missing or empty full JSON after exit, and then runs the source-bound final analysis under a 4-GiB Node heap cap. Its status and log stay in the archive. A first `nohup` launch did not persist in this shell environment; the session-backed launch is process-verified.                                                                                                                                                                             |
| Final report archive preparation                                                                 | Syntax and tool digests pass                  | The queued analysis now requires both nonempty JSON and HTML reports, copies those plus derived reports and logs into `.git/jqstar/mutation-audit/final/`, and verifies its archive SHA-256 manifest before reporting success. `zsh -n` passes for both watcher scripts and `shasum -a 256 -c .git/jqstar/mutation-audit/tools/sha256.txt` verifies all five archived tools. The full report is still pending, so the archive action itself remains unverified.                                                                                                                                                                               |
| Full-run slow-section liveness check                                                             | Pass; continue                                | At about two hours, the count briefly held near 14,087 while all eight child workers consumed CPU. Within the next interval, 28 new per-mutant event files appeared, worker PIDs recycled, and the count reached 14,116. Free memory rose to 74%; no restart or concurrency change was warranted.                                                                                                                                                                                                                                                                                                                                             |
| Full-run resource and time checkpoint                                                            | In progress                                   | At about 4h13m, 23,100 of 56,731 mutants had final per-mutant events and Stryker estimated roughly 24h33m more. Eight child workers and the watchdog remained live; 122 event files were written in the preceding two minutes, memory pressure was 74% free, and no watchdog threshold had tripped. The estimate is provisional; the source-bound full JSON report is still required.                                                                                                                                                                                                                                                         |
| Corrected focused CSP mutation retry                                                             | Complete; gaps remain                         | After excluding only the source-scan case incompatible with Stryker instrumentation, the one-worker frozen `src/csp/evaluator.ts` pass classified 48 mutants: 27 Killed, 20 Survived, and one NoCoverage. Source SHA-256 `6e44fa552cdf58ee138658eb0d13d5be6f2c4f5debbd626350c264c1b7776668`; archived `preliminary/mutation-csp-focused-retry.json`.                                                                                                                                                                                                                                                                                          |
| New dynamic-root and forward-move Project Browser cases                                          | Pass                                          | The main owning suite passed 26/26 after adding saved-layout initialization for inserted roots and a direct `next` column move. The first localStorage version failed under Node 26 because that global is unavailable in this test environment; the corrected case supplies a deterministic storage stub.                                                                                                                                                                                                                                                                                                                                    |
| Expanded fetch query and network retry cases                                                     | Pass                                          | The main `test/fetch.test.ts` suite passed 17/17 after asserting the complete query key set and disabling retries for a network failure. An initial exact tuple assertion failed because Datastar adds its signal query field; the final assertion includes that documented field.                                                                                                                                                                                                                                                                                                                                                            |
| Finite observation counter case                                                                  | Pass                                          | The main `test/observation.test.ts` suite passed 22/22 after checking positive fractional truncation, negative clamping, and finite HTTP status preservation.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| Corrected doctor migration block probe                                                           | RuntimeError characterized                    | Selecting the full frozen `bin/doctor/migrations.mjs:78-80` span reached the one original `BlockStatement` mutant. It remains RuntimeError under the repaired runner because removal of the `finally` cleanup makes Node 26 report a garbage-collected open `FileHandle`. The production source closes the handle. The isolated migration and property baseline passed 41/41; source SHA-256 `9e0338c910a3cd72c673232375cad27c6b0db4ebee09a8e18710ed5f6bfe5ed6`; archived `preliminary/mutation-migration-block-error.json`.                                                                                                                  |
| Expanded Project Browser mutation follow-up                                                      | Complete; six additional kills                | The isolated 26/26 owning baseline and one-worker frozen-source pass over lines 423, 506, and 629 classified 19 mutants: 16 Killed, one Survived, and two RuntimeError. Signature matching to the earlier focused reports shows both `next`-branch survivors and four setup survivors newly Killed. Source SHA-256 `93bae49e40a7ed3353b1e5d34b6123e679ada722f6a3a602c9667b9d22439693`; archived `preliminary/mutation-project-browser-expanded.json`.                                                                                                                                                                                         |
| Expanded fetch mutation follow-up                                                                | Complete; three additional kills              | The isolated 17/17 owning baseline and one-worker frozen-source pass classified the same 45 mutants: 43 Killed and two Survived, three more kills than the earlier focused pass. Source SHA-256 `61e7b1417b84f35006b8715417484105a84b2887a4e467a9df0dcad5d675113f`; archived `preliminary/mutation-fetch-retry-expanded.json`.                                                                                                                                                                                                                                                                                                                |
| Expanded observation mutation follow-up                                                          | Complete; two additional kills                | The isolated 22/22 owning baseline and one-worker frozen-source pass classified the same 38 mutants: 27 Killed and 11 Survived, two more kills than the earlier focused pass. The remaining 11 lie in nested freeze guards whose metadata constructors already freeze those objects. Source SHA-256 `4b22e83558434c6698aaf5c6d3375a6340ee64706a1b831faa5eedfcf78e3052`; archived `preliminary/mutation-observation-expanded.json`.                                                                                                                                                                                                            |
| Range calendar boundary regression                                                               | Pass                                          | The main and isolated `test/ui-range-calendar.test.ts` suites each passed 4/4 after assertions for outside dates, incomplete ranges, and inclusive end-date selection. Frozen `src/ui/calendar.ts` SHA-256 `e541feee28100da1e68a60cf22caf9a9213fa219f4b9f38dd017a3a07e133b0e` matches the main tree.                                                                                                                                                                                                                                                                                                                                          |
| Range calendar focused mutation passes                                                           | Complete; seven original survivors killed     | Both one-worker passes selected 17 frozen line-406 mutants. The initial pass classified 11 Killed and six Survived; the expanded pass classified 12 Killed and five Survived. Signature matching against all 17 emitted full-run events for that line shows seven original survivors now Killed, five still Survived, and five originally Killed still Killed. Archived `preliminary/mutation-calendar-range-boundary-initial.json` and `preliminary/mutation-calendar-range-boundary-expanded.json`.                                                                                                                                         |
| Range calendar equivalence review                                                                | Five individual reviews prepared              | The five remaining original survivors are IDs 24215, 24216, 24217, 24219, and 24222. Each source signature and Survived status was checked against its frozen event, and each has a specific control-flow rationale in `.git/jqstar/mutation-audit/reviewed-equivalents.json`. Final application to the complete disposition register awaits the full JSON report.                                                                                                                                                                                                                                                                            |
| htmx body and element swap cleanup cases                                                         | Pass                                          | The main and isolated `test/htmx-bridge.test.ts` suites passed 37/37 after body `outerHTML`, ordinary element `outerHTML`, and body `delete` cases asserted application cleanup and the recorded removal count. Frozen `src/htmx.ts` SHA-256 `246c68883f8483217947a417066a906d60a720e090c99d3f04400f0935a93080` matches the current tree.                                                                                                                                                                                                                                                                                                     |
| htmx swap cleanup mutation follow-ups                                                            | Complete; eight original survivors killed     | Three one-worker passes over frozen `src/htmx.ts:390` classified the same 14 mutants: 11 Killed/three Survived, then 13/one, then 14/zero. Signature matching to the emitted full-run events shows eight original survivors newly Killed, six original kills retained, and one original Killed mutant outside the narrow line-span selection. Archived all three distinct reports under `preliminary/mutation-htmx-body-swap-*.json`.                                                                                                                                                                                                         |
| Carousel ownership and controls cases                                                            | Pass                                          | Main `test/ui-carousel.test.ts` passed 14/14. Its cases check nested roots, normalized and fallback slide values, controls and indicators, event bubbling, replacement control rebinding, and no unchanged `data-value` rewrite. The isolated 48/48 Carousel/document-ownership baseline passed before the last idempotence case. Frozen `src/ui/carousel.ts` SHA-256 `dbf15d60c2c68368600f298a384371d9166125e2eb9049ed2a2ce6966de6164c` matches the main tree.                                                                                                                                                                               |
| Carousel focused mutation passes                                                                 | Complete; 43 original gaps killed             | Five one-worker passes selected the same 67 frozen Carousel mutants. The final pass classified 64 Killed and three Timeout. Exact signatures matched all 67 original full-run events: 42 original survivors and one original NoCoverage became Killed; 21 original kills remained Killed; two original kills and one original survivor reached Stryker's hit limit and remain Timeout in this follow-up. A separate six-mutant, one-test line-160 probe still hit that limit for the surviving guard. All six reports are archived; only `preliminary/mutation-carousel-ownership-final.json` is selected for final linking.                  |
| Repaired UI runner-error probe                                                                   | Complete; underlying errors identified        | One worker with the repaired tool passed an 867/867 baseline for frozen Calendar 1442, Carousel 138, Chart 326, and Color Picker 288, then classified eight mutants: four Killed, three RuntimeError, and one Timeout. Exact signatures linked all four original serializer errors. The repaired reasons expose an invalid selector, missing chart event data, a non-element click target, and a Carousel redundant-write hit limit. Archived `preliminary/mutation-ui-runtime-errors.json`.                                                                                                                                                  |
| Carousel unchanged-value probe                                                                   | Complete; hit limit remains                   | Main Carousel suite passed 14/14 with a MutationObserver assertion that unchanged enhancement does not rewrite `data-value`. A one-test isolated baseline passed. The repaired-tool pass on frozen line 138 classified three mutants: two Timeout at Stryker’s hit limit and one Survived. The original serializer-error mutant remains a timeout, not a kill. Archived `preliminary/mutation-carousel-value-write.json`.                                                                                                                                                                                                                     |
| Repaired reactivity runner-error probe                                                           | Complete; feedback loop identified            | One worker with the repaired tool passed the 8/8 `test/reactivity.test.ts` baseline. Its frozen line-58 pass classified seven mutants: five RuntimeError and two Survived. All five original serializer errors now expose Stryker’s hit-count limit from runaway microtask scheduling when the reschedule guard is mutated. Embedded source and exact signatures match the full-run events. Archived `preliminary/mutation-reactivity-runtime-errors.json`.                                                                                                                                                                                   |
| Main tree versus frozen source manifest                                                          | Pass with two corrections                     | SHA-256 comparison across all 136 production files found exactly two differences: the confirmed `bin/doctor/discovery.mjs` malformed-workspace fix and `src/declarative.ts` fractional-duration fix. All other 134 sources, including htmx and fetch, remain byte-identical to the running full audit. Each corrected source has a separate queued focused pass.                                                                                                                                                                                                                                                                              |
| Low-priority fast gate after Carousel cases                                                      | Failed lint census, then corrected            | `nice -n 15 npm run quality:fast` passed ticket workflow, runner self-tests, formatting, and browser components, but static-fast found 16 Carousel test non-null assertions against an allowance of five. Report: `.git/jqstar/runs/2026-09-24T17-58-14-607Z-55164/report.json`. Replaced fixture assertions with guarded lookups and removed the obsolete allowance. The 14 Carousel cases, TypeScript, ESLint, and exact lint-boundary check now pass; rerun the full fast gate on this tree.                                                                                                                                               |
| Corrected low-priority fast gate                                                                 | Pass before evidence edit                     | `nice -n 15 npm run quality:fast` passed ticket workflow, runner self-tests, dependency research, formatting, browser components, and static-fast. Report: `.git/jqstar/runs/2026-09-24T18-04-45-545Z-64604/report.json`. This evidence row changes the working-tree fingerprint; rerun the required gate on the final Code tree.                                                                                                                                                                                                                                                                                                             |
| `nice -n 15 npx vitest run test/ui-menubar.test.ts --maxWorkers=1`                               | Pass                                          | The expanded owning suite passed 8/8 before its frozen line-315 rerun.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| `nice -n 15 npx vitest run test/ui-multi-select.test.ts --maxWorkers=1`                          | Pass                                          | The owning suite passed 6/6 before the line-124 pass, 7/7 after the disabled-option cases, 11/11 after direct-control validation, and 13/13 after pointer-click cases.                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| One-worker frozen Menubar and Multi Select Stryker configs                                       | Complete                                      | `mutation-menubar-focus.json` classified six Killed and three Survived among nine original survivors; `mutation-multiselect-status.json` classified nine Killed and two Survived among 11 original mutants; `mutation-multiselect-disabled.json` killed all seven selected mutants; the refined `mutation-multiselect-disabled-render.json` killed five of six, with one Timeout; `mutation-multiselect-control.json` killed all 16 selected mutants; the refined `mutation-multiselect-click.json` killed seven of ten, leaving three Survived. All selected source signatures match.                                                        |
| Questionnaire owning and isolated mutation checks                                                | Complete; two runner errors open              | `npx vitest run test/ui-questionnaire.test.ts` passed 10/10 after restoring the temporarily invalid attribute before observer delivery; the first attempt failed from the lingering invalid markup and was corrected. The isolated `vitest.questionnaire-error.config.ts` baseline passed 108/108 before and 109/109 after the case. One-worker `stryker.questionnaire-error.config.mjs` classified five frozen mutants twice: 2 Killed/1 Survived/2 RuntimeError, then 3 Killed/2 RuntimeError. The exact original validation-call survivor is killed; both out-of-test-run errors persist.                                                  |
| Questionnaire authored-value rerun                                                               | Complete; one survivor open                   | `npx vitest run test/ui-questionnaire.test.ts` passed 12/12, and the isolated `vitest.questionnaire-error.config.ts` baseline passed 111/111. One-worker `stryker.questionnaire-value.config.mjs` classified nine frozen mutants: 4 Killed/5 Survived before the optional-value case, then 8 Killed/1 Survived. Exact original signatures matched all nine, with five original survivors killed.                                                                                                                                                                                                                                              |
| Sidebar owning and repaired-tool line-134 probe                                                  | Complete; original error open                 | The main and isolated `test/ui-sidebar.test.ts` suites passed 8/8. The first one-worker Stryker attempt selected no mutants because its line glob omitted an end line; `src/ui/sidebar.ts:134-135` corrected the selection. The first three-mutant pass found one RuntimeError, one Survived, and one Timeout; after asserting public `data-value` reflection, the rerun found one RuntimeError, one Killed, and one Timeout. The repaired reason exposes a mutation-induced observer loop; no original status is relabeled.                                                                                                                  |
| Main TypeScript, targeted ESLint, Prettier, ticket Plan validation, and archive checks           | Pass before final gate                        | `npx tsc --noEmit`, ESLint for the two owning files, Prettier for changed docs/tests, ticket Plan validation, both archive SHA-256 manifests, and a 52-report/55-source hash preflight passed on the updated tree. Final Code and `npm run check` remain pending.                                                                                                                                                                                                                                                                                                                                                                             |
| Grouped UI repaired-tool baseline and mutation pass                                              | Pass; 64 classified                           | Nine source-matched owning suites passed 420/420. One low-priority worker classified 64 frozen mutants and matched all 12 selected original `RuntimeError` signatures in Stepper, Tabs, Rating, and Hover Card. The 12 follow-up statuses are ten `RuntimeError` and two `Timeout`; no original error is relabeled. Archived `preliminary/mutation-grouped-ui-errors.json`.                                                                                                                                                                                                                                                                   |
| Remaining UI repaired-tool baseline and mutation pass                                            | Pass; 53 classified                           | Nineteen source-matched owning suites passed 1,286/1,286. One low-priority worker classified 53 frozen mutants and matched all 12 selected original `RuntimeError` signatures in Feed, Form, Input OTP, Number Field, Time Picker, Toolbar, and Tree. The 12 follow-up statuses are ten `RuntimeError` and two `Timeout`; no original error is relabeled. Archived `preliminary/mutation-remaining-ui-errors.json`.                                                                                                                                                                                                                           |
| Runtime root-event owning and isolated mutation checks                                           | Pass; six killed                              | Main and isolated runtime suites passed 31/31. The first six-mutant pass killed five and left one survivor; after checking unrelated delegated events, all six frozen mutants were killed. Exact original signatures include four Survived and two NoCoverage statuses. The initial and final reports are archived, with only `preliminary/mutation-runtime-root-event.json` selected for final linkage.                                                                                                                                                                                                                                      |
| `nice -n 15 npm run quality:fast` after runtime event tests                                      | Pass                                          | All six selected gates passed, including 76/76 Chromium component cases. Report `.git/jqstar/runs/2026-09-24T23-27-56-722Z-59819/report.json` has matching start/end SHA-256 fingerprint `02cf2e9729f73e7ca439537bc9a9c348154168e14ec13449815ced9b14a42dd4` across 948 files.                                                                                                                                                                                                                                                                                                                                                                 |
| Ticket Code validation with that report                                                          | Pass before evidence ledger update; stale now | The matching Code validation passed before this ticket recorded the new fast result. A repeat against the updated ticket correctly reports a stale fingerprint. The final `npm run check` report must supply the Code validation before completion.                                                                                                                                                                                                                                                                                                                                                                                           |
| Signal-patch owning and isolated mutation checks                                                 | Pass; four original survivors killed          | Main and isolated patch suites passed 22/22. A one-worker frozen-source rerun matched all 18 selected mutants: 13 original kills remained Killed, four original Survived became Killed, and one original Killed became Timeout in this narrower pass. Archived `preliminary/mutation-patch-boundaries.json` is selected for final linkage; the original full-run statuses remain unchanged.                                                                                                                                                                                                                                                   |
| Selector-free target-ID owning and isolated mutation checks                                      | Pass; three original survivors killed         | Main and isolated patch suites passed 24/24. The final one-worker frozen-source rerun killed all seven selected mutants: three original Survived became Killed and four original Killed stayed Killed. The two narrower reports are archived separately; only `preliminary/mutation-patch-target-id.json` is selected for final linkage.                                                                                                                                                                                                                                                                                                      |
| Malformed SVG owning and isolated mutation checks                                                | Pass; one survivor and one uncovered killed   | Main and isolated patch suites passed 25/25. A one-worker frozen-source rerun matched and killed all four selected parser-error mutants: original ID 15577 was Survived, 15580 was NoCoverage, and two were already Killed. Archived `preliminary/mutation-patch-malformed.json` is selected for final linkage.                                                                                                                                                                                                                                                                                                                               |

| Command                                        | Result | Evidence                                                                                                     |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------ |
| `npm run quality:fast`                         | Pass   | Run `2026-09-25T07-38-58-658Z-52608`: six gates, including 76/76 component cases.                            |
| `npm run quality:delivery` via `npm run check` | Pass   | Run `2026-09-25T08-00-31-214Z-99515`: 12 gates, including 1,717/1,717 browser cases and an eligible receipt. |

### Recent focused evidence

- Combobox outside interaction: main and isolated `test/ui-combobox.test.ts` passed 11/11;
  TypeScript, ESLint, and formatting passed. One low-priority worker selected 54 frozen
  `src/ui/combobox.ts:891-925` mutants and classified 24 Killed, 17 Survived, and 13 NoCoverage.
  Embedded source SHA-256 `122edf07dfaa87d1abfa35616e3847ac65dee406dcc25a0cbe6cffb21178bc63` matches
  both frozen and main trees. Exact event signatures matched 49 already emitted original mutants;
  three original Survived and eight original NoCoverage became Killed. Five selected signatures had
  not yet emitted a full-run event and remain pending final linkage. Archived
  `preliminary/mutation-combobox-outside.json`.
- Data Table date sort: main and isolated `test/ui-data-table.test.ts` passed 17/17; TypeScript,
  ESLint, and formatting passed. One low-priority worker selected 34 frozen
  `src/ui/data-table.ts:206-225` mutants and classified 19 Killed, 14 Survived, and one NoCoverage.
  Embedded source SHA-256 `94ac80c561b2b9cb7fda3db610b786922f9a0b20faeca4564d329c02bd2cace8` matches
  both frozen and main trees. Exact signatures matched all 34 original events: two original Survived
  and one NoCoverage became Killed, with 16 original kills retained. Archived
  `preliminary/mutation-data-table-date.json`.
- Updated archive: SHA-256 verification passes for 51 preliminary JSON reports and five analysis
  tools. `frozen-followups.txt` selects 43 frozen-source reports. The revised final-analysis shell
  syntax passes, and the watcher remains live. Source-bound final linkage awaits the complete JSON
  report.
- Refined Data Table date sort: two pre-1970 dates distinguish negative numeric timestamps from
  string collation. Main and isolated suites passed 17/17. The repeated one-worker pass selected the
  same 34 frozen mutants and classified 24 Killed, nine Survived, and one NoCoverage. Exact
  signatures matched all 34 original events: seven original Survived and one NoCoverage became
  Killed, five more original gaps than in the first pass. Both reports are archived; only
  `preliminary/mutation-data-table-date-negative.json` is selected for final linkage. SHA-256
  verification passes for all 52 preliminary reports, and all 43 selected reports match the frozen
  source manifest.
- Input OTP direct control and type contract: main and isolated suites passed 10/10 after adding
  nested-control rejection, unsupported-type rejection, and accepted password/tel cases. The first
  one-worker pass over 13 frozen `src/ui/input-otp.ts:53-57` mutants killed 11 and left the two
  accepted-type string mutations alive. The final pass killed all 13. Exact signatures matched all
  13 emitted original events: four original Survived and three NoCoverage became Killed, with six
  original kills retained. Embedded source SHA-256
  `51d887bb1dcbd053ee97e93487d77b21f22adc90cc0850ac1967c75f2dee67b3` matches the frozen and main
  trees. Both reports are archived, with only `preliminary/mutation-input-otp-control.json` selected
  for final linkage. The 54 preliminary report checksums and five tool checksums pass; the selected
  frozen-source list now has 44 reports.
- Input OTP action value contract: main and isolated suites passed 11/11 after checking missing and
  invalid `ui.input-otp.set` values and a numeric code. One low-priority worker selected ten frozen
  line-369/370 mutants and killed all ten. Exact signatures matched all ten original full-run
  events: one original Survived and four NoCoverage became Killed, with five original kills
  retained. The source hash remains
  `51d887bb1dcbd053ee97e93487d77b21f22adc90cc0850ac1967c75f2dee67b3`. Archived
  `preliminary/mutation-input-otp-action.json` and selected it for final linkage alongside the
  control pass. The archive now has 55 preliminary reports and 45 selected frozen-source reports.
- Input OTP status refresh: main and isolated suites passed 14/14 after checking that a silent
  incomplete edit clears the owned completion message, an unchanged completed code keeps it, an
  authored status message is preserved, and an omitted status part remains valid. The first
  one-worker frozen line-326 pass killed seven of nine mutants; the refined pass killed all nine.
  Exact signatures matched all nine original full-run events, each originally Survived. The embedded
  source hash matches the unchanged frozen and main `src/ui/input-otp.ts`. Both passes are archived;
  only `preliminary/mutation-input-otp-refresh.json` is selected for final linkage. The archive now
  has 57 preliminary reports and 46 selected frozen-source reports. An independent manifest check
  matches all 49 embedded production sources in those selected reports to the frozen source hashes.
- Menubar menu-event synchronization: main and isolated owning suites passed 8/8 after adding an
  outside-press close with focus on another top-level trigger and a child Menu API open. The first
  one-worker pass on frozen `src/ui/menubar.ts:315` killed one of nine selected mutants; the
  expanded pass killed six and left three Survived. Exact signatures matched all nine original
  full-run events, all originally Survived: original IDs 41165, 41166, 41169, 41170, 41172, and
  41173 are now Killed, while 41167, 41168, and 41171 remain open. Embedded source SHA-256
  `8bb02094d82b5c146ebe20851eb051631bcaed8ed735d67c4183b95777903384` matches the frozen and main
  trees. Both passes are archived; only `preliminary/mutation-menubar-focus.json` is selected for
  final linkage. The archive now has 59 preliminary reports and 47 selected frozen-source reports.
  Main TypeScript, targeted ESLint, and formatting passed.
- Multi Select generated native parts: main and isolated owning suites passed 6/6 after checking
  that removing an authored status and re-enhancing creates a generated `p` with live-region
  metadata, while content and tags use `div`. A one-worker pass on frozen
  `src/ui/multi-select.ts:124` classified nine Killed and two Survived among 11 mutants. Exact
  signatures matched all 11 original full-run events: six original Survived are now Killed, three
  original kills remain Killed, and original IDs 41990 and 41992 remain Survived. Those two are
  reviewed as equivalent individually because the first ternary returns `div` for tags and falls
  through to `div` for content; either mutation preserves the `p` branch for status. Embedded source
  SHA-256 `f938a6f6580dd0f1b448920b44245805bec9efc41f7f32b3076654f32ed62d9a` matches frozen and main
  trees. `preliminary/mutation-multiselect-status.json` is selected for final linkage. The archive
  now has 60 preliminary reports and 48 selected frozen-source reports.
- Multi Select disabled-option keyboard wrap: main and isolated owning suites passed 7/7 after
  asserting that ArrowUp from the first enabled option skips a disabled final option and lands on
  the preceding enabled option, with ArrowDown returning to the first. One low-priority worker
  selected seven frozen `src/ui/multi-select.ts:185` mutants and killed all seven. Exact signatures
  matched the seven original full-run events: original IDs 42050, 42052, 42055, and 42056 changed
  from Survived to Killed; three original kills remained Killed. The embedded source hash is the
  same frozen/main SHA-256 as the status pass. `preliminary/mutation-multiselect-disabled.json` is
  selected for final linkage. The archive now has 61 preliminary reports and 49 selected
  frozen-source reports.
- Multi Select disabled state rendering: the main and isolated owning suites passed 7/7 after
  checking both `aria-disabled="true"` and the exact empty `data-disabled` value on the generated
  disabled option. A narrow one-worker line-203 pass killed its two selected mutants. The first
  expanded line-203-206 pass killed four, left one Survived, and timed out once; the refined pass
  killed five and timed out once. Exact signatures matched all six original full-run events:
  original IDs 42076, 42077, 42078, and 42081 changed from Survived to Killed; 42075 remained
  Killed; original Killed mutant 42080 timed out only in the focused rerun and is not relabeled. All
  reports embed the unchanged frozen/main `src/ui/multi-select.ts` source. The three passes are
  archived; only `preliminary/mutation-multiselect-disabled-render.json` is selected for final
  linkage. The archive now has 64 preliminary reports and 50 selected frozen-source reports.
- Multi Select direct native control: main and isolated owning suites passed 11/11 after rejecting
  nested controls, a wrong direct element, a wrong direct part, and a single-select control with the
  exact public errors. A one-worker frozen `src/ui/multi-select.ts:88-97` pass killed all 16
  selected mutants. Exact signatures matched all 16 original full-run results: five original
  Survived and two NoCoverage mutants became Killed, while nine original kills remained Killed. The
  complete frozen function also has one original Killed block mutant outside this narrow selection.
  Embedded source SHA-256 `f938a6f6580dd0f1b448920b44245805bec9efc41f7f32b3076654f32ed62d9a` matches
  the frozen and main trees. `preliminary/mutation-multiselect-control.json` is selected for final
  linkage. The archive now has 65 preliminary reports and 51 selected frozen-source reports.
- Multi Select pointer click guard: main and isolated owning suites passed 13/13 after checking
  enabled-option clicks, ignored background and disabled-option clicks, stable selection/focus, and
  no window error event during event dispatch. The first repaired-tool one-worker pass on frozen
  `src/ui/multi-select.ts:730` classified five RuntimeError and five Survived among ten mutants; the
  refined pass classified seven Killed and three Survived. Exact signatures matched all ten original
  events: original IDs 42859-42862 changed from RuntimeError to Killed, three original kills
  remained Killed, and original IDs 42864, 42866, and 42867 remain Survived. These three remained
  open after that pass rather than being presumed equivalent. Both reports embed the frozen/main
  source hash above; only `preliminary/mutation-multiselect-click.json` is selected for final
  linkage. The archive now has 67 preliminary reports and 52 selected frozen-source reports.
- Input OTP authored slot identity: main and isolated owning suites passed 15/15 after adding six
  authored HTML slots alongside unrelated HTML and SVG children, then setting a complete code. The
  one-worker repaired-tool pass over frozen `src/ui/input-otp.ts:157` classified seven mutants:
  three Killed and four Timeout. Exact signatures match the seven original events: the three
  original Survived predicates are Killed; original ID 37583 remained Timeout, and original IDs
  37585, 37588, and 37589 changed from RuntimeError to Timeout. These four remain open. Embedded
  source SHA-256 `51d887bb1dcbd053ee97e93487d77b21f22adc90cc0850ac1967c75f2dee67b3` matches the
  frozen and main trees. `preliminary/mutation-input-otp-slots.json` is selected for final linkage.
  The archive now has 68 preliminary reports and 53 selected frozen-source reports. Main and
  isolated tests, targeted ESLint, TypeScript, and Prettier checks passed.
- Multi Select rendered disabled click: a first 14-test probe reenabled the native `legacy` option
  while its rendered counterpart remained disabled, but the component correctly treated that native
  change as stale and skipped the handler; the same three mutants survived. The refined test instead
  marks an otherwise enabled rendered `api` option `aria-disabled="true"` without changing the
  native option. Main and isolated suites passed 14/14. The one-worker frozen line-730 rerun killed
  all ten selected mutants. Exact signatures match the ten original events: original IDs 42864,
  42866, and 42867 changed from Survived to Killed; original IDs 42859-42862 changed from
  RuntimeError to Killed; three original kills remained Killed. The embedded source SHA-256
  `f938a6f6580dd0f1b448920b44245805bec9efc41f7f32ed62d9a` matches frozen and main trees. The two new
  probes remain in the isolated checkout; only the final
  `preliminary/mutation-multiselect-click-aria-disabled.json` report is selected for linkage.
  Earlier click passes remain archived. The archive now has 69 preliminary reports and 53 selected
  frozen-source reports.
- CSP bare-`$` probe: the original stream has three surviving mutants on
  `src/csp/evaluator.ts:407-408`. Two temporary `$root` cases passed in the main and isolated
  13-test owning suite, but a one-worker frozen rerun left all three survivors unchanged. The branch
  is the bare `$` binding, while the accepted CSP corpus already tests `$root.length`. The duplicate
  `$root` cases were removed. The source-matched no-kill report is archived as
  `preliminary/mutation-csp-dollar-binding-probe.json` but is not selected for final linkage; the
  three original survivors remain open without an equivalence claim. The archive now has 70
  preliminary reports and 53 selected reports.
- Declarative visibility and object-class boundaries: the main owning suite passed 48/48 after
  adding a false-to-true-to-false `data-show` transition, an ignored null class value, and class-key
  removal. The frozen checkout failed only the two newer fractional-duration cases because its
  source predates the separate parser correction; the focused config excludes exactly those two
  unrelated tests and passes 46/46. A one-worker frozen `src/declarative.ts:427-439` pass classified
  14 mutants: 13 Killed and one Survived. Exact source signatures matched all 14 original events:
  original IDs 9689, 9699, 9700, 9701, and 9703 changed from Survived to Killed; ID 9704 changed
  from NoCoverage to Killed; ID 9702 remains Survived; seven original kills stayed Killed. The
  embedded source SHA-256 `baae867b0d5a32097e2a720a773586556319cc2cbd4729f577d5bb31e6eb7db3` matches
  the frozen source. Main `src/declarative.ts` differs because of the separately verified
  fractional-duration fix, so the exact mutant signature links this frozen follow-up to the full
  report. The first 12-mutant pass and expanded 14-mutant pass are archived; only
  `preliminary/mutation-declarative-visibility-class.json` is selected for final linkage. The
  archive now has 72 preliminary reports and 54 selected frozen-source reports.
- Declarative native disabled state: the main owning suite passes 49/49 after checking
  `data-attr:disabled` through false, true, false, null, and undefined against both jQuery's
  attribute value and the native `:disabled` state. The frozen checkout passes 47 cases and skips
  only the two fractional-duration cases requiring the separately corrected parser. A one-worker
  pass over frozen `src/declarative.ts:451-453` killed all 17 selected mutants. Exact source
  signatures matched all 17 original events: original IDs 9732, 9734, 9736, 9740, and 9742 changed
  from Survived to Killed, and the other twelve stayed Killed. The embedded source SHA-256
  `baae867b0d5a32097e2a720a773586556319cc2cbd4729f577d5bb31e6eb7db3` matches the frozen source. The
  first 16-kill/one-survivor pass and final 17-kill pass are both archived; only
  `preliminary/mutation-declarative-attr.json` is selected for final linkage. The archive now has 74
  preliminary reports and 55 selected frozen-source reports.
- Declarative bound style clearing: the main owning suite passes 50/50 after checking a styled
  element through concrete, null, and undefined values against its native `style.color`. The frozen
  checkout passes 48 cases and skips only the two unrelated fractional-duration cases. A one-worker
  pass over frozen `src/declarative.ts:463-466` killed all 11 selected mutants. Exact source
  signatures matched all 11 original events: original ID 9762 changed from Survived to Killed, ID
  9764 changed from NoCoverage to Killed, and the other nine stayed Killed. The embedded source
  SHA-256 `baae867b0d5a32097e2a720a773586556319cc2cbd4729f577d5bb31e6eb7db3` matches the frozen
  source. `preliminary/mutation-declarative-style.json` is selected for final linkage. The archive
  now has 75 preliminary reports and 56 selected frozen-source reports.
- Computed attribute lifecycle: a new rendered-output case failed before the correction because
  removing `data-computed:total` restored `state.total` from 4 to 9 while `data-text` stayed at 4.
  The reactive proxy does not observe direct descriptor replacement, so `src/reactivity.ts` now
  exposes targeted key notification and `src/declarative.ts` calls it after installing and restoring
  the descriptor. The main owning suite passes 54/54 and the adjacent declarative and reactivity
  suites passed 71/71 before the final two computed boundary cases were added. The corrected
  isolated checkout passes 69/69 declarative and CSP computed cases. The frozen checkout passes 66
  cases and skips only the two fractional-duration cases and this corrected-source rendered-output
  regression. Its one-worker `src/declarative.ts:359-378` pass killed all 18 selected mutants. Exact
  signatures matched all 18 original events: original IDs 9594, 9600, 9602, and 9606 changed from
  Survived to Killed; the other fourteen stayed Killed. Embedded source SHA-256
  `baae867b0d5a32097e2a720a773586556319cc2cbd4729f577d5bb31e6eb7db3` matches the frozen source. A
  separate corrected-source one-worker pass killed all 13 selected mutants across the descriptor
  notification path; its embedded source SHA-256 values are
  `a093b220f5e8cffd5d8e9b1da29cd055032418c3da55eda166f7cbcdd32c1e82` for `src/declarative.ts` and
  `7488960ab69e12e89083ab8d14dc5c4939756e190184366c05176c7ccb873444` for `src/reactivity.ts`,
  matching the main tree. Earlier focused, corrected, and the coverage-selection-off two-mutant
  probe reports remain archived; only `preliminary/mutation-declarative-computed-expanded.json` is
  selected for final linkage. The archive now has 81 preliminary reports and 57 selected
  frozen-source reports.
- Core reactive dependencies: the owning suite passes 12/12 after checking reads outside an effect,
  branch-switch cleanup, later writes after stop, no-op and rejected writes, and present versus
  absent property deletion. The isolated frozen baseline also passes 12/12. A one-worker pass over
  frozen `src/reactivity.ts:64-88,125-132` classified 30 selected mutants: 29 Killed and one
  Survived. Exact signatures match all 30 original events. Original IDs 19352, 19353, 19354, 19375,
  19403, 19405, 19408, 19409, 19410, and 19411 changed from Survived to Killed; ID 19371 remains
  Survived, and the other nineteen stayed Killed. The survivor can duplicate an internal
  dependency-list entry; no equivalence claim is made. The embedded source SHA-256
  `63ccbc63f9604012b41b1d488c697ff8b71c4a96716488c4bac8c7ce19a76be4` matches the frozen source. The
  first narrow pass is archived separately; only `preliminary/mutation-reactivity-boundaries.json`
  is selected for final linkage. The archive now has 83 preliminary reports and 58 selected
  frozen-source reports.
- Stopped reactive effects: the same owning and isolated frozen suites pass 12/12, including direct
  invocation of a runner after `stop()`. A one-worker pass over frozen `src/reactivity.ts:170-175`
  classified seven selected mutants: four Killed and three Survived. Exact signatures match all
  seven original events. Original ID 19425 changed from Survived to Killed; the other six retained
  their original statuses. The surviving cleanup and guard mutations remain open without an
  equivalence claim. The embedded source SHA-256
  `63ccbc63f9604012b41b1d488c697ff8b71c4a96716488c4bac8c7ce19a76be4` matches the frozen source. The
  initial stop pass is archived separately; only `preliminary/mutation-reactivity-stop.json` is
  selected for final linkage. The archive now has 85 preliminary reports and 59 selected
  frozen-source reports.
- Questionnaire revalidation: the isolated one-worker repaired-tool probe of frozen
  `src/ui/questionnaire.ts:1000-1001` initially classified five mutants as two Killed, one Survived,
  and two RuntimeError. All 108 owning questionnaire cases passed. A duplicate authored question
  value on an already enhanced root now has a synchronous rejection case; the main owning suite
  passes 10/10 and the isolated three-file baseline passes 109/109. The rerun classified three
  Killed and the same two RuntimeError. Exact signatures match all five original events: original ID
  46659 changed from Survived to Killed; IDs 46656 and 46657 remain RuntimeError, and IDs 46655 and
  46658 remain Killed. The errors occur outside a test run even with the repaired reporter; neither
  is counted as Killed. Embedded source SHA-256
  `328466b426738ab29651863243e8e75ad437c19cba1b259fcb3bfb54833fd196` matches the frozen and main
  source. Both reports and logs are archived; only `preliminary/mutation-questionnaire-errors.json`
  is selected for final linkage. The archive now has 87 preliminary reports and 60 selected
  frozen-source reports.
- Questionnaire authored value: the owning suite now passes 12/12 with cases for surrounding spaces
  and removal of optional `data-value` on an existing root; the isolated three-file baseline passes
  111/111. A one-worker pass over frozen `src/ui/questionnaire.ts:1002-1004` classified nine
  selected mutants: eight Killed and one Survived. Exact signatures match all nine original events.
  Original IDs 46660, 46661, 46662, 46664, and 46665 changed from Survived to Killed; IDs 46663,
  46666, and 46668 stayed Killed; ID 46667 remains Survived. The remaining mutation makes the same
  authored value reassign the current index and has no demonstrated behavioral difference; no
  equivalence claim is made. The embedded source SHA-256
  `328466b426738ab29651863243e8e75ad437c19cba1b259fcb3bfb54833fd196` matches the frozen and main
  source. The first value-path pass is archived separately; only
  `preliminary/mutation-questionnaire-value.json` is selected for final linkage. The archive now has
  89 preliminary reports and 61 selected frozen-source reports.
- Sidebar value reflection and runner error: the main and isolated owning suites pass 8/8 with an
  assertion that a trigger click reflects `data-value="collapsed"`. A one-worker repaired-tool pass
  over frozen `src/ui/sidebar.ts:134-135` classified three selected mutants: one Killed, one
  Timeout, and one RuntimeError. Exact signatures match all three original events. Original ID 50186
  remains RuntimeError; the repaired reason identifies a MutationObserver feedback loop and Stryker
  hit-count limit when the value-write guard is forced true. Original ID 50187 remains Killed; ID
  50188 was Killed in the original full run but reaches the hit limit in this narrower follow-up, so
  its original result is retained. Embedded source SHA-256
  `517a1dac5819253bc978a75fb218b5fb8c5a695848c0342b5b5365221d365faf` matches frozen and main source.
  The initial focused report is archived separately; only `preliminary/mutation-sidebar-error.json`
  is selected for final linkage. The archive now has 91 preliminary reports and 62 selected
  frozen-source reports.
- Select disabled-option pointer movement: the main and isolated owning suites pass 9/9. A
  one-worker pass over frozen `src/ui/select.ts:302-304` classified eleven selected mutants: ten
  Killed and one Survived. All eleven exact source locations, operators, and replacements match the
  original full-run events. Original IDs 49162, 49163, 49165, 49167, and 49168 changed from Survived
  to Killed; the remaining ID 49159 stays Survived on the separate undefined-value branch. The
  focused source SHA-256 `4fdca570ca62cc48636b20e7bb730c18c3bff6ac1943a81060780a4dd0d2988a` matches
  the frozen and main source. `preliminary/mutation-select-pointer.json` is selected for final
  linkage. The archive now has 92 preliminary reports and 63 selected frozen-source reports.
- Select initial active option: the expanded main and isolated owning suites pass 12/12. A first
  eight-mutant frozen pass killed four original survivors; an enabled non-first native value and a
  list with no enabled options exposed the remaining branches. The final one-worker pass over
  `src/ui/select.ts:318-320` kills all eight selected mutants. Original IDs 49182, 49184, 49185,
  49186, 49187, and 49188 changed from Survived to Killed; IDs 49181 and 49183 stayed Killed. Exact
  source locations, operators, and replacements match all eight original events. The no-enabled case
  calls the public API directly so a mutant's thrown error is attributed to that test rather than
  reported as an out-of-test-run error from an event listener. Both reports are archived; only
  `preliminary/mutation-select-initial.json` is selected for final linkage. The archive now has 94
  preliminary reports and 64 selected frozen-source reports.
- Select form reset notifications: the first owning run failed because the test reset the form
  before the pending `data-bind` update from the preceding API selection settled. Awaiting
  `$.star.nextUpdate()` made the pre-reset value stable; the expanded main and isolated owning
  suites then passed 15/15. Cases check one change event that is not cancelable, with old and new
  values, no second change on an unchanged reset, and no stale native input when the change callback
  starts a newer selection or silently edits the native value. A one-worker pass over frozen
  `src/ui/select.ts:619-622` killed all eleven selected mutants. Original IDs 49701, 49702, 49703,
  49705, 49706, 49707, 49709, and 49710 changed from Survived to Killed; IDs 49708, 49711, and 49713
  stayed Killed. All eleven exact source signatures match the original events. The source SHA-256
  `4fdca570ca62cc48636b20e7bb730c18c3bff6ac1943a81060780a4dd0d2988a` matches frozen and main source.
  The initial report is archived separately; only `preliminary/mutation-select-reset.json` is
  selected for final linkage. The archive now has 96 preliminary reports and 65 selected
  frozen-source reports.
- Select named action arguments: the main and isolated owning suites pass 17/17. An implicit
  one-value action, an explicit native root element, a missing value after either root form, and a
  wrong-kind element target distinguish the public action overloads. A one-worker pass over frozen
  `src/ui/select.ts:872-874` killed all twelve selected mutants. Original IDs 50047, 50048, 50050,
  50052, 50053, 50054, and 50055 changed from Survived to Killed; the other five remained Killed.
  All twelve exact source signatures match the original events. The source SHA-256
  `4fdca570ca62cc48636b20e7bb730c18c3bff6ac1943a81060780a4dd0d2988a` matches frozen and main source.
  The first action report is archived separately; only `preliminary/mutation-select-action.json` is
  selected for final linkage. The archive now has 98 preliminary reports and 66 selected
  frozen-source reports.
- Provisional runtime-error audit: at 50,302 emitted mutant events, 120 had the original
  `RuntimeError` status: 118 report Stryker's `errorToString` serializer failure and two
  Questionnaire mutants report out-of-test-run errors. Before the Toggle follow-up, 76 exact error
  signatures appeared in selected frozen-source reports; 44 had no selected rerun. These are
  investigation counts, not a change to the original denominator or status.
- Toggle Group runner-error diagnosis: frozen `src/ui/toggle.ts` and both owning test files have
  matching main and isolated SHA-256 values; the isolated baseline passed 89/89. A one-worker
  repaired-tool pass over lines 220-227, 243-244, and 356-358 classified 29 selected mutants. Exact
  source signatures match all ten original Toggle `RuntimeError` events. Nine remain `RuntimeError`
  with a repaired Stryker hit-count-limit trace; ID 55829 reaches `Timeout`. Inspection of the
  mutated guards indicates repeated generated-input or state-attribute writes can retrigger
  enhancement until the instrumentation limit. No original error is relabeled as a kill.
  `preliminary/mutation-toggle-errors.json` is selected for final linkage. The archive now has 99
  preliminary reports and 67 selected frozen-source reports.
- Tags Input runner-error diagnosis: frozen `src/ui/tags-input.ts` and four owning test files have
  matching main and isolated SHA-256 values; the isolated baseline passed 173/173. The first
  one-worker selection omitted block mutant 53290 because its span ended at line 191. Extending that
  selection to lines 187-192 produced a 27-mutant repaired-tool report matching all seven original
  Tags Input `RuntimeError` signatures. IDs 53277, 53282, 53284, 53287, 53290, and 53301 become
  `Timeout`; inspection of their mutated guards indicates repeated generated-input or
  reflected-state writes. ID 53558 remains `RuntimeError`, now with a direct null `dataset` access
  after a mutated remove-button guard. No original error is relabeled as a kill. The first report is
  archived separately; only `preliminary/mutation-tags-errors.json` is selected for final linkage.
  The archive now has 101 preliminary reports and 68 selected frozen-source reports.
- Sortable runner-error diagnosis: frozen `src/ui/sortable.ts` and its two owning test files match
  the main-tree SHA-256 values; the isolated baseline passed 94/94. A one-worker repaired-tool pass
  over lines 516-519 and 586-588 classified 18 selected mutants and matched all four original
  `RuntimeError` signatures exactly. IDs 51315 and 51316 still error when a mutated event-target
  guard lets an undefined target reach `.closest()`; IDs 51451 and 51452 still error when a mutated
  drag-transfer guard lets an absent transfer object reach `.setData()`. No original error is
  relabeled as a kill. `preliminary/mutation-sortable-errors.json` is selected for final linkage;
  the archive now has 102 preliminary reports and 69 selected frozen-source reports.
- Remaining Multi Select runner-error diagnosis: frozen `src/ui/multi-select.ts` matches main
  source, and the expanded primary test was copied into the isolated checkout before its 254/254
  baseline. A one-worker repaired-tool pass over lines 286-289 and 750-752 classified 17 selected
  mutants and matched all three previously uncovered original error signatures. IDs 42187 and 42194
  remain `RuntimeError` because changing option-identity `.every()` checks to `.some()` lets a stale
  record reach resource acquisition; ID 42899 remains `RuntimeError` when removing optional chaining
  lets an absent delegated button value reach `.dataset`. No original error is relabeled as a kill.
  `preliminary/mutation-multiselect-errors.json` is selected for final linkage. The archive now has
  103 preliminary reports and 70 selected frozen-source reports.
- Provisional error-coverage checkpoint at 52,681 emitted events: 127 original `RuntimeError`
  statuses were present; 100 had exact signatures in the 70 selected frozen-source follow-ups and 27
  remained unmatched. Six new Tree errors clustered at one expansion guard. These counts are
  provisional and leave the original classifications unchanged.
- Tree runner-error diagnosis: frozen `src/ui/tree.ts` and both owning test files match main-tree
  SHA-256 values; the isolated baseline passed 236/236. A one-worker repaired-tool pass over lines
  295-297 classified eleven selected mutants and matched all six original Tree `RuntimeError`
  signatures. IDs 58703-58708 remain `RuntimeError`: mutating the missing-group guard lets an
  undefined group reach the later `.hidden` write. No original error is relabeled as a kill.
  `preliminary/mutation-tree-errors.json` is selected for final linkage. The archive now has 104
  preliminary reports and 71 selected frozen-source reports.
- Grouped UI runner-error diagnosis: frozen Stepper, Tabs, Rating, and Hover Card source and nine
  owning test files match main-tree SHA-256 values; the isolated baseline passed 420/420. A
  one-worker repaired-tool pass classified 64 selected mutants and matched all 12 targeted original
  `RuntimeError` signatures. Two Stepper guard mutations time out, while its invalid-selector
  mutation remains `RuntimeError`. Three Tabs reflection mutants hit an observer-loop limit. Three
  Rating and three Hover Card mutants dereference values after their guards or optional chains are
  changed. No original error is relabeled as a kill. `preliminary/mutation-grouped-ui-errors.json`
  is selected for final linkage. The archive now has 105 preliminary reports and 72 selected
  frozen-source reports.
- Remaining UI runner-error diagnosis: frozen Feed, Form, Input OTP, Number Field, Time Picker,
  Toolbar, and Tree source and all 19 owning test files match main-tree SHA-256 values; the isolated
  baseline passed 1,286/1,286. A one-worker repaired-tool pass classified 53 selected mutants and
  matched all 12 targeted original `RuntimeError` signatures. Two Input OTP reflection mutations
  time out. Feed and Time Picker dereference unavailable DOM methods, Form dereferences a missing
  record, Number Field and Toolbar hit observer-loop limits, and Tree mutations cause invalid
  selectors or a missing target dereference. No original error is relabeled as a kill.
  `preliminary/mutation-remaining-ui-errors.json` is selected for final linkage. The archive now has
  106 preliminary reports and 73 selected frozen-source reports.
- Provisional error-linkage checkpoint at 53,748 tested mutants: 131 original `RuntimeError` events
  were present, and every one had an exact signature in the 73 selected frozen-source reports. This
  linkage explains the original statuses; it does not replace the full report or relabel the errors
  as killed. New errors may still appear before the run completes.
- At 53,987 tested mutants, a fresh scan found the same 131 original `RuntimeError` events. All 131
  exact file, location, operator, and replacement signatures appear in the now 80 selected
  frozen-source follow-ups. This remains provisional until the complete report is validated; no
  original error status is relabeled from this scan.
- Runtime root-event routing: `test/runtime.test.ts` now checks a direct event on the `&` root and
  rejects a click from an unrelated child under a delegated selector. Main and isolated owning
  suites pass 31/31; frozen `src/runtime.ts` has the same SHA-256
  `52c13a64af43b190a735a149233b1989a3988e0198462b73274158be481dbd8b` in both trees. A one-worker
  rerun over lines 409-412 killed all six selected mutants. Original IDs 20702-20705 changed from
  Survived to Killed, while IDs 20706-20707 changed from NoCoverage to Killed. The first five-kill
  report is archived separately; only `preliminary/mutation-runtime-root-event.json` is selected for
  final linkage. The archive now has 108 preliminary reports and 74 selected frozen-source reports.
- Signal-patch boundaries: main and isolated `test/patch.test.ts` pass 22/22 after asserting that
  `onlyIfMissing` preserves existing values under null and nested-object patches while filling
  absent nested leaves. Frozen `src/patch.ts` has SHA-256
  `47328c4d62fbc53fde0035323e45d314222723222defe5076e3e8b591e59a6f6` in both trees. A one-worker
  rerun over lines 26-35 matched all 18 original signatures: IDs 15539, 15541, 15551, and 15552
  changed from Survived to Killed; one originally Killed mutant timed out in the focused run. The
  original statuses remain unchanged. `preliminary/mutation-patch-boundaries.json` is selected for
  final linkage. The archive now has 109 preliminary reports and 75 selected frozen-source reports.
- Selector-free patch target IDs: main and isolated `test/patch.test.ts` pass 24/24 after checking
  root-ID replacement even when an external duplicate ID is returned first by the document lookup,
  and rejecting an ID found only outside the application. The frozen source hash above still matches
  both trees. The one-worker final rerun over lines 73-77 killed all seven selected mutants:
  original IDs 15591, 15593, and 15595 changed from Survived to Killed; four original kills stayed
  Killed. Two narrower reports are archived separately. The second duplicate-ID fixture initially
  left jsdom's lookup pointed at the root; the corrected fixture asserts that it points outside
  before the patch. Only `preliminary/mutation-patch-target-id.json` is selected for final linkage.
  The archive now has 112 preliminary reports and 76 selected frozen-source reports.
- Malformed SVG rejection: main and isolated `test/patch.test.ts` pass 25/25 after rejecting an
  unterminated SVG fragment before changing the target. Frozen `src/patch.ts` still matches the
  source hash above. A one-worker rerun over lines 59-61 matched and killed all four original
  signatures: ID 15577 changed from Survived to Killed, ID 15580 changed from NoCoverage to Killed,
  and two original kills stayed Killed. `preliminary/mutation-patch-malformed.json` is selected for
  final linkage. The archive now has 113 preliminary reports and 77 selected frozen-source reports.
- Selector-free mixed IDs: the existing patch test now includes an unmatched nonempty ID before a
  matching ID and asserts that only the matching node changes. It also keeps text and a no-ID node
  in the input. Main and isolated owning suites pass 25/25; the frozen `src/patch.ts` hash above is
  unchanged. A one-worker rerun over lines 220-223 killed all four selected mutants. Original ID
  15777 changed from Survived to Killed; original IDs 15775, 15776, and 15779 stayed Killed. The
  source-bound `preliminary/mutation-patch-mixed-id.json` is selected for final linkage. The archive
  now has 114 preliminary reports and 78 selected frozen-source reports.
- Unowned-document patch transactions: a same-realm document without a registered kernel now runs
  replace, selector-free morph, and remove patches successfully. Main and isolated owning suites
  pass 26/26. The frozen `src/patch.ts` hash above is unchanged. A one-worker rerun of lines 100,
  160, and 192 killed all three selected mutants; original IDs 15617, 15691, and 15748 changed from
  Survived to Killed. The first focused attempt used single-line glob syntax that Stryker did not
  recognize; its failed dry-run log is archived, and the corrected line-range run produced the
  source-bound `preliminary/mutation-patch-unowned.json` selected for final linkage. The archive now
  has 115 preliminary reports and 79 selected frozen-source reports.
- Selector-required patch modes: the owning test now rejects `inner`, `append`, `prepend`, `before`,
  and `after` without a selector, leaving the target unchanged. Main and isolated suites pass 31/31.
  The frozen `src/patch.ts` hash above is unchanged. A one-worker rerun over lines 142-146 selected
  22 mutants: 19 Killed and three Survived. All five original survivors in this range, IDs 15649,
  15657, 15658, 15659, and 15664, are now Killed. The three surviving focused mutants were already
  Killed in the original full run; the original classifications remain authoritative. A sixth
  original Killed signature at line 142 extended beyond the selected line range and was not rerun.
  `preliminary/mutation-patch-selector-mode.json` is selected for final linkage. The archive now has
  116 preliminary reports and 80 selected frozen-source reports.
- Patch equivalence review: original Survived IDs 15570-15573 change only the MIME type passed to
  `DOMParser` for an SVG or MathML wrapper. The
  [HTML Standard](https://html.spec.whatwg.org/multipage/dynamic-markup-insertion.html#domparser)
  routes both `image/svg+xml` and `application/xml` to the same XML parser. The wrapper supplies the
  namespace, and `parseFragment()` observes only parser errors and child nodes, not the parsed
  document's content type. Original Survived ID 15645 changes `[]` to a nonempty array only for
  selector-based `remove`; the selector branch overwrites targets, and the remove branch returns
  before reading `nodes`. Individual source-bound rationales are in
  `.git/jqstar/mutation-audit/reviewed-equivalents.json` (SHA-256
  `a374f8a130c26fac8d4536648451c3ee3566e6d076fa3fbe512420f9c0f7ee5a`). These five reviews are
  provisional until the final disposition builder validates their original signatures and statuses.
- Doctor open-failure cleanup: `test/doctor-data.test.mjs` now removes a file after successful path
  resolution and checks that `MetadataReader.read()` reports `JQS_INPUT_INVALID` when the later open
  fails. Main and isolated owning suites pass 8/8; the four affected doctor suites pass 133/133
  together. Frozen `bin/doctor/data.mjs` still has SHA-256
  `832c560b58314c390ad8835b86e0f9725ad7f98e6bba98d4500adbe053874759` in both trees. A one-worker
  rerun of line 185 killed the exact original OptionalChaining survivor ID 677. Original
  RuntimeError ID 676 at line 184 remains unchanged. The source-bound
  `preliminary/mutation-doctor-data-open.json` is selected for final linkage; the archive now has
  117 preliminary reports and 81 selected frozen-source reports.
- Doctor input and resource boundaries: the owning suite now accepts ordinary spaces and exact path,
  file-size, file-count, workspace-file, cumulative-byte, and directory-entry limits while rejecting
  the next item. It also rejects malformed UTF-8 and BOM-prefixed JSON. Main and isolated suites
  pass 11/11; the four affected doctor suites pass 136/136. Frozen `bin/doctor/data.mjs` still
  matches the source hash above. The first one-worker pass over lines 30, 52, 160-161, 164, 176-178,
  and 203 classified 39 Killed and three Survived; it is archived separately. After the workspace
  and BOM cases, the final 42-mutant pass classified 41 Killed and one Survived. Exact original
  signatures show 19 original Survived and one NoCoverage now Killed; original ID 638, which changes
  the allocation from `Math.min` to `Math.max`, remains Survived and open because it changes memory
  use. `preliminary/mutation-doctor-data-limits.json` is selected for final linkage. The archive now
  has 119 preliminary reports and 82 selected frozen-source reports.
- Doctor control-loop equivalence review: original Survived ID 406 changes `index < value.length` to
  `index <= value.length`. On the extra iteration, `charCodeAt(length)` returns `NaN`, which
  satisfies neither control-character comparison; the following increment exits the loop. The locked
  Node probe confirmed those comparisons. An individual rationale is in the reviewed-equivalents
  file with the updated SHA-256 above, pending final source-signature and status validation.
- Doctor path and canonical safety: the owning suite now sorts object keys inside arrays, rejects a
  symlink to the root's immediate parent, and refuses a symlink swapped in after path resolution on
  platforms with `O_NOFOLLOW`. Main and isolated suites pass 12/12; the four affected doctor suites
  pass 137/137. Frozen `bin/doctor/data.mjs` still matches the source hash above. The first
  one-worker pass over lines 70-74, 83, and 155 classified 22 Killed and six Survived; the corrected
  pass classified 24 Killed and four Survived. Original IDs 504, 506, 519-521, and 617 changed from
  Survived to Killed. IDs 495 and 497 remain Survived but have individual equivalence rationales: an
  empty relative suffix already passes every fallback containment condition, and the literal added
  by ID 497 passes those same conditions. IDs 511 and 618 remain open because Windows-style parent
  traversal and blocking FIFO behavior may differ. The first pass is archived separately;
  `preliminary/mutation-doctor-data-safety.json` is selected for final linkage. The review file now
  has SHA-256 `a374f8a130c26fac8d4536648451c3ee3566e6d076fa3fbe512420f9c0f7ee5a`. The archive has
  121 preliminary reports and 83 selected frozen-source reports.
- Doctor allocation resource boundary: the main doctor-data suite passes 13/13. An isolated
  current-source Vitest fixture passes and fails under the sole `Math.min` to `Math.max` change. A
  one-worker frozen-source Stryker pass on line 164 killed all three mutants, including the original
  Survived ID 638 signature; `bin/doctor/data.mjs` retains SHA-256
  `832c560b58314c390ad8835b86e0f9725ad7f98e6bba98d4500adbe053874759`. The source-bound report
  `preliminary/mutation-doctor-data-allocation.json` (SHA-256
  `dcafdb3632cf35069705a70b322964eed6a4f309ec58d65d0450f5939f45f9a5`) is selected for final linkage.
  All 122 preliminary report hashes and the 84 selected names validate.
- Document listener signal-getter retirement: the 50-case owning suite passes on both main and
  frozen `src/kernel.ts` (SHA-256
  `bf0ad1a77056e692809f861416fbadc51bdc086ee1b613a3194f12a8cdabdc40`). A one-worker frozen-source
  pass selected only line 911 and killed the exact original static Survived ID 14909 signature.
  Without the post-getter check, setup called native `removeEventListener` once for a listener that
  had never been added. The source-bound `preliminary/mutation-listener-signal.json` report has
  SHA-256 `f6214489f5f39ff3519b53f2ace85ca557e6b5f5e70d003d4999285c6d7a7e5f`; all 123 preliminary
  hashes and 85 selected frozen-source reports validate for final linkage. The neighboring original
  ID 14913, which assigns an undefined signal property, remains Survived; no equivalence claim is
  made for custom event targets.
- Listener fixture typecheck and rerun: the signal getter now returns a real `AbortSignal` after
  disposing its kernel. Main and isolated owning suites still pass 50/50, `npm run typecheck`
  passes, and a second one-worker frozen line-911 pass still kills original Survived ID 14909. The
  earlier report remains archived; `preliminary/mutation-listener-signal-typed.json` (SHA-256
  `a5e7877263a95eceb0d86eead9b54b7198a34d96bb0f62750d95413964b958da`) is selected for final linkage.
  The preliminary archive now has 127 reports, with 88 selected.
- Observation freeze equivalence review: original static Survived IDs 15133-15142 at
  `src/observation.ts:244-246` match the frozen source SHA-256
  `4b22e83558434c6698aaf5c6d3375a6340ee64706a1b831faa5eedfcf78e3052`. Each owner is frozen in
  `trackApplication()` before `freezeRecord()` receives it, and each request metadata object is
  frozen by the request factory before emission. Failed error metadata is also frozen by
  `diagnosticError()` before emission. On locked Node 26.8.1, `Object.freeze(undefined)` returns
  without error, so forcing the request or failed branch on unrelated records has no effect. Ten
  individual rationales were added to `reviewed-equivalents.json` (SHA-256
  `a374f8a130c26fac8d4536648451c3ee3566e6d076fa3fbe512420f9c0f7ee5a`). All ten matching frozen event
  records report `Survived` at the expected lines; full-report signature and status validation
  remains pending.
- Overlapping action-scope cleanup: `test/observation.test.ts` now settles an outer action while an
  inner action shares its context, checks the inner request parent ID, then confirms a request after
  inner settlement has no parent ID. Main and isolated owning suites pass 23/23. A one-worker pass
  over frozen `src/observation.ts:472` classified all four mutants Killed, matching original static
  Survived IDs 15335-15338. The archived report is
  `preliminary/mutation-observation-action-scopes.json` (SHA-256
  `b622ff7d46beec3d5f8434c3a46e68588430f0427e8d8d165ee74c783662ea03`); the original full-run
  statuses remain unchanged. The preliminary archive now has 124 reports, with 86 selected for
  source-bound final linkage.
- Persistence field-codec boundaries: `test/persist-data.test.ts` now accepts exactly 128 distinct
  fields, a 256-character path, distinct unsorted declarations, and a valid `undefined.child` path;
  it rejects 129 fields, non-string paths, malformed leading/trailing characters, and
  reverse-ordered parent/child overlap. Main and isolated owning suites pass 43/43. A one-worker
  pass over frozen `src/persist/codec.ts:26-40` classified all 64 mutants Killed. Exact source,
  location, operator, and replacement matching to the emitted full-run events finds 12 original
  Survived mutants now Killed, with all 64 selected original events matched. The archived report is
  `preliminary/mutation-persist-codec-boundaries.json` (SHA-256
  `464440a5bfbdbb4734b5e9a282df4137814f49d796b47cd3a464fd1b2b2698c9`); the original full-run
  statuses remain unchanged. The preliminary archive now has 129 reports, with 89 selected for
  source-bound final linkage.
- Persistence option normalization: `test/persist-data.test.ts` now asserts the default
  `flushOnDispose: true`, preserves explicit `false`, and rejects an invalid codec ID. Main and
  isolated owning suites pass 43/43. A one-worker frozen `src/persist/envelope.ts:33,71` pass killed
  all three selected mutants, matching original Survived IDs 16899, 16965, and 16966. The archived
  report is `preliminary/mutation-persist-envelope-options.json` (SHA-256
  `f86b225f9afab4fa65140bd9ab9af3891ad1ab19ad0819e6b784f2c47d8cd95c`). Original statuses remain in
  the unchanged full-run denominator.
- Persistence envelope boundaries: `test/persist-data.test.ts` checks zero and invalid clock values,
  equal saved/expiry time, malformed revision origin, mismatched codec identity, missing or throwing
  migration, optional checkpoint, and migration output size. Main and isolated owning suites pass
  44/44; `npm run typecheck` passes. The first one-worker frozen pass classified 42 mutants as 33
  Killed, eight Survived, and one NoCoverage; the expanded second pass classified 38 Killed and four
  Survived. All 42 source/location/operator/replacement signatures match original events. Eight
  original Survived mutants became Killed; the other four original survivors, IDs 16987, 17106,
  17122, and 17127, have individual equivalence rationales (review file SHA-256
  `a374f8a130c26fac8d4536648451c3ee3566e6d076fa3fbe512420f9c0f7ee5a`). The first report remains
  archived under `preliminary/mutation-persist-envelope-boundaries-initial.json` (SHA-256
  `a27d17d99be0b26bf87f6edc8ea92ebd26304a85ebbd9ee3b819574d102051b2`); the selected final report is
  `preliminary/mutation-persist-envelope-boundaries.json` (SHA-256
  `ddebacd52fc6364fe3b3abcb90db086dd673db6169ebb7085c8a828915458136`). The preliminary archive has
  133 reports, with 91 selected for final linkage; original full-run statuses remain unchanged.
- Stable plugin version ranges: `test/plugin.test.ts` now accepts multi-digit major, minor, and
  patch versions, trims a padded caret range, rejects alphabetic version segments, and checks the
  version-specific and unsupported composite-range diagnostics. Main and isolated owning suites pass
  60/60; `npm run typecheck` passes. The first frozen one-worker pass over
  `src/plugin.ts:140,193-201` classified 36 mutants as 28 Killed, seven Survived, and one
  NoCoverage. The expanded pass killed all 36. Exact source/location/operator/replacement matching
  to the original event stream links five original Survived, three Timeout, and one NoCoverage
  mutant to focused kills. The initial report remains archived at
  `preliminary/mutation-plugin-ranges-initial.json` (SHA-256
  `24a9eb9108091423adc4fbee20922cd6e6960e169ddf6ee5cbe6bcbe3733242e`); the selected final report is
  `preliminary/mutation-plugin-ranges.json` (SHA-256
  `7a1ce0557c3b76610c75d0fcd6c02b4ecce943c4d1e0b3ebb7899c7ebbf59436`). The preliminary archive has
  134 reports, with 92 selected for final linkage. Original full-run statuses are preserved.
- Plugin name boundaries: `test/plugin.test.ts` now rejects leading/trailing punctuation in ordinary
  and official plugin names, and installs an official single-segment name. Main and isolated owning
  suites pass 61/61; `npm run typecheck` passes. The first one-worker frozen `src/plugin.ts:138-139`
  pass classified 17 Killed and one Survived; the expanded pass killed all 18. Exact
  source/location/operator/replacement matching links four original Survived regex-anchor mutants to
  focused kills. The initial report remains at `preliminary/mutation-plugin-names-initial.json`
  (SHA-256 `55811e485b9e958ffe8c043e3ef8683d5bcdf7d692718392a40376d83dc94003`); the selected report
  is `preliminary/mutation-plugin-names.json` (SHA-256
  `c52f303385b4c2d2cfc96833a4068c1dfdec873ee5dc87a19a812e217ec39c11`). The preliminary archive has
  134 reports, with 92 selected; original full-run statuses are preserved.
- Contradictory plugin ordering: `test/plugin.test.ts` now refuses a candidate that lists the same
  target in `before` and `after`, without invoking its installer or retaining the plugin. Main and
  isolated owning suites pass 62/62; `npm run typecheck` passes. A one-worker frozen
  `src/plugin.ts:290-291` pass killed all four selected mutants. Exact signatures link original
  Survived ID 17579, Timeout ID 17577, and NoCoverage ID 17580 to focused kills. The selected report
  is `preliminary/mutation-plugin-order-conflict.json` (SHA-256
  `c24be2489857ecffc95a4422b1bd4e875b938a03972f6d700ed3ed6acdab8e64`). The archive now has 134
  reports, with 92 selected; original full-run statuses remain unchanged.
- Select option-click cancellation and commit: `test/ui-select.test.ts` now checks that canceling
  `before-change` leaves the popup open with the previous native value and that a successful option
  click commits and closes it. The main and isolated owning suites pass 19/19; `npm run typecheck`
  passes. A one-worker pass over frozen `src/ui/select.ts:602` killed all seven selected mutants,
  matching original Survived IDs 49679-49685 by source, location, operator, and replacement. The
  embedded and frozen source SHA-256 are both
  `4fdca570ca62cc48636b20e7bb730c18c3bff6ac1943a81060780a4dd0d2988a`. The selected report is
  `preliminary/mutation-select-option-cancel.json` (SHA-256
  `d9422b445035e71428486654cf64511cd3b2064c43b89f0f500eb62e47d6aaf0`). The archive now has 135
  reports, with 93 selected; the original full-run statuses remain unchanged.
- Select option-click fast gate: `nice -n 15 npm run quality:fast` passed all six gates after the
  frozen follow-up was archived, including 76/76 Chromium component cases and the selected static
  checks. Report `.git/jqstar/runs/2026-09-25T02-22-58-041Z-4779/report.json` has identical start
  and end fingerprint `6f6f492b2ae69409a63cf78fab5c2755a782616dae901bc4467f164c513e5edc` across 948
  files. Code-phase validation passed against that matching report before this evidence edit. The
  final delivery check remains pending after the full audit and jQuery support decision.
- Dynamic backend-request input rejection: `test/fetch.test.ts` now checks missing, non-string,
  empty, and whitespace-only `@get` URLs plus non-object options before any fetch. Main and isolated
  owning suites pass 18/18; `npm run typecheck` passes. A one-worker frozen `src/fetch.ts:587-590`
  pass killed all 17 selected mutants. Exact original signatures link seven Survived and four
  NoCoverage mutants to focused kills; six original Killed statuses stayed Killed. Embedded, frozen,
  and main source SHA-256 are all
  `61e7b1417b84f35006b8715417484105a84b2887a4e467a9df0dcad5d675113f`. The selected report is
  `preliminary/mutation-fetch-dynamic-inputs.json` (SHA-256
  `c46dfca49de1b6887a5ce85abe6551b0d931209188669c81a31a29d4fbb795c3`). The archive now has 136
  reports, with 94 selected; original full-run statuses remain unchanged.
- Current-tree delivery checkpoint: `nice -n 15 npm run check` passed all 12 enforced gates,
  including 76/76 Chromium component cases, package and release quality, browser quality, and the
  browser detector self-test. The browser matrix passed 563/563 in each desktop engine plus 28/28
  environment cases, with no failure, flake, or skip. Report
  `.git/jqstar/runs/2026-09-25T02-31-49-196Z-15133/report.json` has identical start/end fingerprint
  `bb180fe288805efe75b3548e1a5d8b78114e2aeff64ad1870e936831542881da` over 948 files and an eligible
  delivery receipt. The full mutation run remained live and the watchdog reported at least 64% free
  memory during the concurrent check. Code-phase ticket validation rejected this report because that
  phase requires a passing `fast` report; the final Code tree will need its own fast validation.
  This delivery result predates the jQuery support decision, so the final tree still needs
  `npm run check`.
- Interim error audit at 39,200 unique emitted mutants: the parser found zero incomplete events,
  26,431 Killed, 2,860 NoCoverage, 9,465 Survived, 358 Timeout, and 86 RuntimeError. All 86 errors
  have the same known Stryker `errorToString` failure, so they remain unresolved in the frozen audit
  until a source-matched repaired-tool rerun or a direct disposition; no error is counted as Killed
  from this observation alone.
- Interim event analysis at 43,959 unique mutants found zero incomplete event files: 29,716 Killed,
  2,860 NoCoverage, 10,911 Survived, 381 Timeout, and 91 RuntimeError. Eighty-nine runtime errors
  carry the known Stryker serializer failure; the two Questionnaire errors above report an
  out-of-test-run failure. These provisional categories remain unchanged until a complete
  source-bound report is available.
- Fast gate after the Combobox and Data Table cases: `nice -n 15 npm run quality:fast` passed ticket
  workflow, runner self-tests, dependency research, formatting, browser components, and static-fast.
  Report: `.git/jqstar/runs/2026-09-24T18-22-51-536Z-77175/report.json`. This evidence edit changes
  the working-tree fingerprint; rerun the required gate on the final Code tree.
- Fast gate after the OTP slot and Multi Select rendered-disabled cases:
  `nice -n 15 npm run quality:fast` passed ticket workflow, runner self-tests, dependency research,
  formatting, all 76 Chromium component cases with no failure/retry/skip, and static-fast. Report:
  `.git/jqstar/runs/2026-09-24T20-15-57-729Z-14839/report.json`; start and end fingerprints both
  `1d63ee85351bce3e2c1f1ded9f6034dbda0491161eaadb6cd9ad3fd1517f88b7` across 948 files. This ticket
  evidence edit changes the working-tree fingerprint. Repeat the required gate on the final Code
  tree and validate the ticket against that matching report.
- Fast gate after declarative attribute and style cases: `nice -n 15 npm run quality:fast` passed
  ticket workflow, runner self-tests, dependency research, formatting, browser components, and
  static-fast. Report: `.git/jqstar/runs/2026-09-24T20-46-28-884Z-31266/report.json`; its start and
  end fingerprints both equal `434fabb70fc526705e09481801bc08f57342f5d8fc984a5f5c9b8a499d8112d6`
  across 948 files. The browser proof selected and passed all 76 Chromium component cases with zero
  failures, retries, or skips. This evidence edit changes the tree fingerprint; the final Code tree
  still needs its own matching gate.
- Computed-descriptor fast gate: the first `nice -n 15 npm run quality:fast` run failed only its
  spelling check because CSpell did not recognize a term for enumerable state keys in this ticket;
  the other static checks and all 76 Chromium component cases passed. Failed report:
  `.git/jqstar/runs/2026-09-24T21-02-12-429Z-43301/report.json`. Replacing the word with
  `state-key enumeration` made the targeted CSpell check pass. A full rerun passed all six gates,
  including 76/76 browser cases with no failure, retry, or skip. Passing report:
  `.git/jqstar/runs/2026-09-24T21-06-23-013Z-52168/report.json`; start and end fingerprints both
  `bed9c67195a74e0c662289e27702c287e4f5ff6affd117e08dd60dc3eaa3b9eb` across 948 files. Code-phase
  ticket validation passed against that matching report before this evidence edit. The final Code
  tree needs its own matching gate after the full audit and jQuery work.
- Reactive-dependency fast gate: `nice -n 15 npm run quality:fast` passed all six gates after the
  direct stopped-runner case and archive updates. Its report is
  `.git/jqstar/runs/2026-09-24T21-21-17-007Z-63948/report.json`; start and end fingerprints both
  `4247f61d688192da7a2f08e44462b9905fc0226c0863111e89b89b0776dfdef7` across 948 files. Code-phase
  ticket validation passed against that matching report before this evidence edit. The final Code
  tree still needs its own matching gate.
- Sidebar-reflection fast gate: `nice -n 15 npm run quality:fast` passed all six gates after the
  Sidebar `data-value` assertion and archived error probe, including 76/76 Chromium component cases.
  Report: `.git/jqstar/runs/2026-09-24T21-59-34-109Z-97199/report.json`; start and end fingerprints
  both `c4f9846a37b5b2258ebbb114e006726f46ae1bb9258e57e346bc7bb7ead6e355` across 948 files.
  Code-phase ticket validation passed against that matching report before this evidence edit. The
  final Code tree still needs its own matching gate.
- Questionnaire authored-value fast gate: `nice -n 15 npm run quality:fast` passed all six gates
  after the whitespace and removed-value cases and archive updates, including 76/76 Chromium
  component cases. Report: `.git/jqstar/runs/2026-09-24T21-49-27-656Z-86561/report.json`; start and
  end fingerprints both `6ee0e0617db06a7b7a05252cba83bd9ebd3b5e0d33304d10c77979d6ef71e4fe` across
  948 files. Code-phase ticket validation passed against that matching report before this evidence
  edit. The final Code tree still needs its own matching gate.
- Questionnaire-validation fast gate: `nice -n 15 npm run quality:fast` passed all six gates after
  the duplicate-value test and archive updates, including 76/76 Chromium component cases. Report:
  `.git/jqstar/runs/2026-09-24T21-35-56-105Z-75405/report.json`; start and end fingerprints both
  `8656bf0e97a4915cceb6cb18b50965e65dd1dc742c99c34e59867546b081564a` across 948 files. Code-phase
  ticket validation passed against that matching report before this evidence edit. The final Code
  tree still needs its own matching gate.
- Select active-option fast gate: `nice -n 15 npm run quality:fast` passed all six gates after the
  pointer and initial-option cases and archived reruns. The Chromium component proof selected and
  passed 76/76 cases with zero failures, retries, or skips. Report:
  `.git/jqstar/runs/2026-09-24T22-14-26-197Z-9710/report.json`; start and end fingerprints both
  `e4ef21761f3c8a69b8acd521725552a33710186d6e550a96c80769919dd1cb49` across 948 files. Code-phase
  ticket validation passed against that matching report before this evidence edit. The final Code
  tree still needs its own matching gate.
- Select reset fast-gate correction: the first `nice -n 15 npm run quality:fast` run passed its
  first five gates, including 76/76 Chromium component cases, but static-fast failed two exact
  checks. The new test added two non-null assertions above its fixed allowance, and this ticket used
  an unknown spelling for an event that cannot be canceled. Replacing those assertions with guarded
  form lookups and using plain wording made the targeted lint-boundary and CSpell checks pass. The
  owning Select suite passes 15/15 after the correction. Failed report:
  `.git/jqstar/runs/2026-09-24T22-23-30-473Z-20034/report.json`; the completed rerun is recorded
  below.
- Select reset fast-gate rerun: `nice -n 15 npm run quality:fast` passed all six gates, including
  76/76 Chromium component cases with zero failure, retry, or skip. Report:
  `.git/jqstar/runs/2026-09-24T22-28-44-504Z-29080/report.json`; start and end fingerprints both
  `1305e7509a7e99f6ebd0ced131c4eb17dd7132ca56195d3c85a8575e54cb155e` across 948 files. Code-phase
  ticket validation passed against that matching report before this evidence edit. The final Code
  tree still needs its own matching gate after the full audit and jQuery work.
- Select named-action fast gate: `nice -n 15 npm run quality:fast` passed all six gates after the
  two action cases and archived reruns. The Chromium component proof selected and passed 76/76 cases
  without failure, retry, or skip. Report:
  `.git/jqstar/runs/2026-09-24T22-36-41-134Z-38843/report.json`; start and end fingerprints both
  `180876f33407eff96a6c8cd210406674022765a0781b6a0737d5cbe6ee5e1974` across 948 files. Code-phase
  ticket validation passed against that matching report before this evidence edit. The final Code
  tree still needs its own matching gate after the full audit and jQuery work.
- Patch follow-up fast gate: the first low-priority `npm run quality:fast` attempt passed five
  gates, including 76/76 Chromium components, but failed `static-fast` because four new test-only
  non-null assertions raised `test/patch.test.ts` above its exact lint allowance. Failed report:
  `.git/jqstar/runs/2026-09-24T23-57-36-046Z-75295/report.json`. An explicit test-root lookup
  removed those assertions without raising the allowance. The owning patch suite passes 31/31;
  typecheck, ESLint, and the direct lint-boundary check pass. The rerun passed all six fast gates,
  including 76/76 Chromium components, with report
  `.git/jqstar/runs/2026-09-25T00-02-46-097Z-84447/report.json` and matching start/end fingerprint
  `9f93365ecde2e85b57083e29e82a651a689b464d83aa3a4334a6c4c1219561be` across 948 files. This evidence
  edit makes the working-tree fingerprint newer; final Code validation still requires its own
  matching gate after the audit and jQuery work.
- Doctor-data follow-up fast gate: `nice -n 15 npm run quality:fast` passed all six gates after the
  removal-race and exact-boundary cases, including 76/76 Chromium components. Report:
  `.git/jqstar/runs/2026-09-25T00-18-51-919Z-96159/report.json`; start and end fingerprints both
  `734fb9a733deda09ccaf4075ed9e28b050e9fae836ed959fd2bad27d667e5ec6` across 948 files. Code-phase
  ticket validation passed against that matching report before this evidence edit. The final Code
  tree still needs its own matching gate after the full audit and jQuery work.
- Event signature preflight: all 31,513 emitted `onMutantTested` events at the checkpoint had
  distinct source-path, location, operator, and replacement signatures. This supports the queued
  linker design for processed mutants; the complete report must still pass the same uniqueness check
  after the runner exits.
- Expanded signature preflight at 39,342 events: all emitted original signatures were unique. Across
  52 selected frozen-source reports, 8,542 of 8,673 selected mutant instances matched exact emitted
  signatures; 131 selected instances across five source files had no event yet. For example, the
  original stream had 587 Project Browser results against 650 selected in its focused report and 648
  doctor-rules results against 658 selected. These are incomplete-stream gaps, not accepted links or
  exclusions. The complete report must match every selected signature before the queued linker and
  disposition builder can pass. Snapshot:
  `.git/jqstar/mutation-audit/event-signature-preflight.json`.
- Expanded event-signature preflight at 40,319 original events: all emitted signatures remain
  unique, with no incomplete event files. Among 53 selected source-matched reports, 8,549 of 8,680
  selected mutant instances match exact emitted signatures; 131 remain absent across five files. Of
  the 131 instances, 111 are static mutants and 20 are dynamic Observation mutants on lines 243-246.
  The missing set is unchanged from the earlier checkpoint despite additional events, so final
  linkage remains conditional on the complete JSON report. Snapshot:
  `.git/jqstar/mutation-audit/event-signature-preflight-current.json`.
- Static-phase scheduling explains the slow full-run estimate. The original full-run log records
  3,404 static mutants (6% of the denominator) estimated by Stryker to consume 70% of execution
  time. In the pinned Stryker executor, `reloadEnvironmentLast` sorts environment-reloading plans
  after hot-swappable plans; static plans require a full reload. At 40,328 emitted events, none has
  `static: true`. This explains why the 111 missing static follow-up instances are pending. The
  remaining 20 Observation signatures are also pending, but their scheduling cause is not yet
  established; the final JSON remains authoritative.
- Resource checkpoint at about 5h52m: 31,695 of 56,731 mutants had events. Eight workers consumed
  about 797% combined CPU and 3.93 GiB RSS; the latest watchdog sample reported 72% memory free,
  5.43 GiB total runner RSS, and no threshold hit. Event files occupied 421 MiB with 85 GiB disk
  available. Stryker's roughly 25h33m remaining estimate is provisional.
- Resource checkpoint at about 6h50m: the original runner PID 41813 and watchdog PID 41862 remained
  live with 36,633 of 56,731 mutants classified. The latest watchdog sample reported 75% free
  memory, 6.42 GiB total runner RSS, and no threshold hit. Event files occupied 517 MiB. Stryker's
  roughly 24h27m remaining estimate is provisional and includes uneven work across source files.
- Resource checkpoint at about 7h12m: the same runner, watchdog, and both queued follow-ups remained
  live with 38,676 of 56,731 mutants classified. Eight workers consumed about 906% combined CPU; the
  latest watchdog sample reported 72% free memory, 5.08 GiB total runner RSS, and no threshold hit.
  Event files occupied 533 MiB with 85 GiB disk available. Stryker's roughly 25h16m remaining
  estimate remains provisional.
- Final-reporter size preflight at 34,546 events: the running JSON and HTML reporters stringify the
  completed report, while Stryker's report builder replaces repeated test names with short test IDs.
  A systematic sample of 691 emitted events shrank from 6.89 MB to 0.57 MB after an analogous ID
  substitution, suggesting roughly 45 MiB of compact mutant data at the frozen 56,731 count. This is
  a capacity estimate, not final-report evidence. The event archive occupied 473 MiB and disk still
  had about 85 GiB available; the watchdog reported 74% free memory and no threshold hit.
- UI lifecycle scope cleanup review: four frozen line-236 mutants survived with 2,831 related tests.
  A proposed same-Document two-kernel handoff test failed at the kernel's explicit unique-Document
  claim; it was removed and the original scoped-observer suite passed 31/31. Kernel disposal
  releases that claim only after UI resource cleanup, and the plugin host installs `uiPlugin` once
  per kernel. Concurrent scope replacement is unreachable through the supported API. Skipping the
  deletion may still retain an inactive scope while its Document remains alive, so these mutants
  remain open rather than being marked equivalent without a reliable lifetime observation.
- Preliminary `nice -n 15 npm run check` held the same 948-file source fingerprint at start and
  interruption. Before the browser gate was stopped to add the allocation test, 76 Chromium
  components, the property suite, self-hosted, release, and most static/package checks passed.
  Semgrep timed out on `e2e/components.spec.ts` with zero findings; direct full Semgrep with
  `--timeout 30` passed all 287 targets with all six rules under the audit load. Package quality
  measured a 559,006-byte UMD, a 634,881-byte root import, and a 67,623-byte stores gzip import. The
  current-base budget ratchet and Mobile measurement now bind those exact values; the dedicated
  `nice -n 15 npm run test:package:quality` rerun passed all 13 checks, including three browser
  engines. Four affected contract files passed 57/57, and the five doctor suites passed 146/146. A
  standalone static-delivery rerun passed Semgrep but could not run metrics and lint boundaries
  without the top-level runner's scope file; the final top-level `npm run check` remains required.
- Current-tree fast gate: `nice -n 15 npm run quality:fast` passed all six gates, including 76/76
  Chromium components and 23/23 selected static checks. Report:
  `.git/jqstar/runs/2026-09-25T01-23-10-896Z-75738/report.json`; start and end fingerprints both
  equal `61d98ee2a86cc591e44d3374400e97b61f7e82f26ae84a35aec66a7a34df5c24` across 948 files. The
  ticket Code-phase validator passed against that report before this evidence edit. The final
  delivery check remains pending after the jQuery compatibility decision.
- CSP array-boundary follow-up: the main `test/csp-engine.test.ts` suite passed 13/13 after adding a
  two-digit index and a negative `.at()` position with a misleading `"-1"` property; typecheck and
  Prettier passed. The frozen one-worker Stryker pass classified all 48 selected mutants: 31 Killed,
  16 Survived, and one NoCoverage. Exact location, operator, replacement, and embedded-source
  comparisons against the earlier report found four Survived-to-Killed changes and no regression. A
  second case proved indexed state objects remain writable while `.at()` results from state and
  argument arrays remain read-only. The main suite passed 14/14, typecheck and Prettier passed, and
  the frozen rerun classified 34 Killed, 13 Survived, and one NoCoverage. Three more exact mutants
  changed from Survived to Killed with no regression. The embedded source SHA-256 remains
  `6e44fa552cdf58ee138658eb0d13d5be6f2c4f5debbd626350c264c1b7776668`. The selected report is
  `preliminary/mutation-csp-array-write-boundary.json`, SHA-256
  `2e83679584c8b32633f3ae36f0e00f14b55d6073e4de87a705ef13ab2e73a05a`; both earlier focused reports
  stay archived. Original event files confirm that IDs 6795, 6806-6808, and 7532-7534 were all
  Survived in the full run and are Killed by exact location, operator, and replacement in this
  frozen-source follow-up. All 138 preliminary report hashes verified, with 94 selected for final
  linkage.
- Current-tree fast gate after the CSP cases: `nice -n 15 npm run quality:fast` passed all six
  enforced gates, including 76/76 Chromium components, with no failed, flaky, or skipped browser
  tests. Report: `.git/jqstar/runs/2026-09-25T03-38-34-273Z-77416/report.json`; start and end
  fingerprints both equal `e697b46997e29246dccb808ce89fd0286f57e6171d1bf01743d179aeb7988734` across
  948 files. Code-phase ticket validation passed against that matching report before this evidence
  edit. The final delivery gate remains pending after the full audit and jQuery 3.7.1 decision.
- Protocol cleanup follow-up: the main and frozen `test/protocol.test.ts` suites passed 48/48 after
  checking unrelated and owning namespace cleanup plus stale cleanup after reinstall. Typecheck and
  Prettier passed. A one-worker pass classified all 20 frozen `src/protocol.ts:855-865` mutants as
  Killed. The embedded source SHA-256
  `eebac0c761216bad5efed4a3c5dc7c0b0c2b6e59af21b5980ac2a2b921c8b351` matches the main and frozen
  source. Exact original event files confirm IDs 19193-19194 and 19200-19208 were Survived in the
  full run and are Killed by this report. Archived `preliminary/mutation-protocol-cleanup.json`,
  SHA-256 `4faa1beb631f93c4e41f8c101ac23da2d1da4780b931e4603eddfb2fe4e73d27`. All 139 preliminary
  hashes and five tool hashes verified; 95 frozen-source reports are selected for final linkage. The
  full report has not completed.
- Protocol matcher follow-up: the main `test/protocol.test.ts` suite passed 51/51 with equal exact,
  equal suffix, distinct same-kind, and both cross-kind orders; typecheck passed. The one-worker
  frozen `src/protocol.ts:261-269` pass classified all 48 mutants: 41 Killed and seven Survived,
  with no timeouts or uncovered mutants. Exact source/location/operator/replacement matching against
  the original event files found 21 Timeout-to-Killed and three NoCoverage-to-Killed changes; 17
  original kills remained Killed. The seven remaining mutants are reviewed individually as
  equivalent because normalized matcher kinds are exhausted by the earlier returns. The embedded
  source SHA-256 is `eebac0c761216bad5efed4a3c5dc7c0b0c2b6e59af21b5980ac2a2b921c8b351`. Archived
  `preliminary/mutation-protocol-overlap.json`, SHA-256
  `288323ae12b63e5729af3a6b994cb3849729c282e2adab0a92c55f40e4ad3d52`. The 36 individual equivalent
  reviews have SHA-256 `504f984fd27373382bea53e75bc9c13971f14eb793aab5f3cc7e54edc61a3ef5`. All 140
  preliminary report hashes and five tool hashes verified; 96 frozen-source reports are selected for
  final linkage. The original full-run statuses remain unchanged.
- Disposition timeout-review guard: the builder now accepts an original Timeout equivalence review
  only if a source-matched focused follow-up is Survived. Synthetic positive and negative probes
  passed: two accepted cases retained their original labels, while a timeout without a rerun, a
  focused RuntimeError timeout, and an original RuntimeError were rejected. The existing doctor
  self-test still classifies all 309 original non-killed mutants, closing 307 by focused kills and
  two by individual equivalence reviews. The frozen and archived builder hashes both equal
  `0f764f88765caba95f2b16f23abd4b46387bc297aa08b546456e2f325dcd32a3`; the five-tool SHA-256 manifest
  verifies. This permits the two source-reviewed protocol Timeout mutants without relabeling their
  original statuses.
- Final-analysis input preflight: all 96 selected reports parsed, classified 9,457 focused mutants,
  and matched the frozen source bytes across 108 embedded file entries; none contains a pending
  status. All 36 individual reviews reference original non-killed events: 34 Survived and two
  Timeout. Each reviewed Timeout has exactly one selected source-bound Survived follow-up. This
  verifies the inputs, while complete denominator and disposition validation still await the full
  JSON report.
- Preserved-root runtime follow-up: five lifecycle cases pass in the main runtime suite (36/36),
  covering retained mounted descendants, skipped new mounts inside preserved roots, retained backend
  requests while sibling requests cancel, unmount-only rules, and destruction in a mount callback.
  Typecheck and Prettier pass. A one-worker frozen-source pass classified all 31
  `src/runtime.ts:210-218` and `:482-489` mutants: 28 Killed and three Survived. Exact original
  event matching found 13 Survived-to-Killed changes; IDs 20461 and 20790 are individually reviewed
  as equivalent because `Element.contains(self)` makes the neighboring self-equality operand
  redundant. ID 20778 remains open for the final disposition. The embedded source SHA-256
  `52c13a64af43b190a735a149233b1989a3988e0198462b73274158be481dbd8b` matches both checkouts.
  Archived `preliminary/mutation-runtime-preserved-roots.json`, SHA-256
  `0fbdee863c069ee3c923144413d32b942ddc734e9f0d9b4570fa5660066b34b6`. All 141 preliminary hashes and
  five tool hashes verify; 97 reports are selected. The 38 individual equivalence reviews have
  SHA-256 `6acc73de22bd40beaf7de459f3e9c8d44d29901886b969af239819f18d955736`.
- Updated final-analysis input preflight: all 97 selected reports parsed, classified 9,488 focused
  mutants, and matched frozen source bytes across 109 embedded file entries. All statuses are final,
  the 38 equivalent-review IDs are unique, and the frozen manifest covers 136 source files. The
  subsequent full report and disposition validation passed as recorded below.
- Preserved-request test fixture follow-up: targeted ESLint caught unsafe default stringification of
  a possible `Request` argument in the new fetch spy. The fixture now reads `Request.url`
  explicitly. `npx eslint test/runtime.test.ts --max-warnings=0`, Prettier, the 36-case runtime
  suite, `npm run typecheck`, `npm run lint:markdown`, and `npm run lint:spelling` pass. This
  changes only the test fixture, so the archived source-matched mutation result and original
  denominator remain valid.
- Equivalent-review linkage preflight: scanned the live event files for all 38 reviewed original
  IDs, then matched all selected follow-ups by full source location, mutator, and replacement.
  Thirty-three reviews have a source-matched Survived rerun; five rely on their original Survived
  result and individual source rationale. Neither of the two reviewed original Timeout mutants lacks
  a Survived rerun, and no reviewed mutant has a Killed result in any selected follow-up. The
  earlier start-position-only probe conflated distinct mutation spans and was discarded.
- Changed-file ledger preflight: all 47 current tracked or untracked worktree paths appear in the
  changed-file ledgers of this audit and ticket 0057. This check covers the present worktree; ticket
  0057's product changes and final ledger review remain pending its matrix result.
- Complete full mutation run: Stryker 10.0.0 finished in 1,117 minutes 36 seconds and wrote 82-MB
  JSON and HTML reports. The final JSON has all 56,731 generated mutants: 38,814 Killed, 14,233
  Survived, 2,860 NoCoverage, 693 Timeout, and 131 RuntimeError, with zero Pending or Ignored. The
  progress line reported 56,729 tested because two entries were not in its executed-count display;
  the report is the denominator authority. The watchdog's 112 samples showed 61–80% free memory and
  no resource stop.
- Final-report validator correction: Stryker selected 136 files but emitted JSON entries for only
  the 123 files with mutants. The first queued analyzer rejected the 13 omissions and stopped the
  jQuery matrix queue. The corrected analyzer requires those exact 13 paths, verifies their frozen
  SHA-256 hashes directly, includes zero-mutant rows, and still requires exactly 56,731 classified
  mutants with no Pending or Ignored status. No original report, mutation scope, or denominator
  changed. Its archived tool hash was refreshed before the successful rerun.
- Final analysis:
  `NODE_OPTIONS=--max-old-space-size=4096 .git/jqstar/mutation-audit/tools/run-final-analysis.zsh /private/tmp/jqstar-mutation-5DqMc1`
  passed. It linked 97 selected focused reports by exact mutant signature and built 17,917 original
  non-killed dispositions: 1,415 Killed in focused reruns, 38 Reviewed equivalent, and 16,464 Open.
  Open labels are 13,499 Survived, 2,172 NoCoverage, 666 Timeout, and 127 RuntimeError. The
  archive's eight final files pass SHA-256 verification in
  `.git/jqstar/mutation-audit/final-verification.log`.
- Fast-gate lint follow-up: the first post-audit fast run passed its other five gates and all 76
  Chromium component cases but rejected 17 new runtime and four new protocol test non-null
  assertions against the exact lint-boundary ledger. Replaced those newly added assertions with a
  small explicit required-fixture guard in each owning test file. The 87 focused protocol/runtime
  cases, Prettier, and `node scripts/quality/check-lint-boundaries.mjs` now pass without increasing
  an allowance. The repeated fast run passed as recorded below; final delivery remains pending.
- Repeated current-tree fast gate: `.git/jqstar/runs/2026-09-25T07-38-58-658Z-52608/report.json`
  passed all six enforced gates, including 76/76 Chromium components and the exact lint-boundary
  check. Both tickets 0053 and 0057 passed Code-phase validation against its matching start/end
  fingerprint before moving to Test.
- Clean delivery: `npm run check` passed all 12 enforced gates in
  `.git/jqstar/runs/2026-09-25T08-00-31-214Z-99515/report.json`, including 14/14 package checks and
  1,717/1,717 browser cases, with matching 949-file fingerprints and an eligible receipt. Both
  tickets passed Test-phase validation against that report before documentation completion.
- Post-analysis mutation confirmation: copied the two corrected owning test files into the frozen
  follow-up checkout and reran `stryker.protocol-cleanup.config.mjs` and
  `stryker.runtime-preserve.config.mjs` with one worker each. All 20 protocol and all 31 runtime
  mutant signatures retained exactly their archived statuses. Their two JSON reports and SHA-256
  manifest are under `.git/jqstar/mutation-audit/post-analysis/`; this verification does not replace
  or alter the selected 97 reports or original full-run denominator.

### Inspection ledger

| Finding                                                                                                       | Resolution                                                                                                                                                                                                                                                  |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Earlier instruction deferred mutation execution                                                               | The later user instruction explicitly authorized this run, as recorded in Plan.                                                                                                                                                                             |
| Unlocking Stryker in the project install changed 124 locked dependencies                                      | Restored exact locked packages and moved Stryker into a separate pinned tool directory.                                                                                                                                                                     |
| Root-realm `localStorage` was undefined on Node 26                                                            | Made the Resizable test use its document window and a deterministic storage double.                                                                                                                                                                         |
| jsdom ignored a spy on the `Window` constructor getter                                                        | Used a proxy on the test document host and restored it after the assertion.                                                                                                                                                                                 |
| Stryker instrumentation changed source bytes and inserted source-to-code text                                 | Excluded the CSP source inventory suite and one source-scan case only from this audit; ordinary quality gates still run them.                                                                                                                               |
| Focused configuration validation left five reachable survivors                                                | Added cases for whitespace metadata, current-directory output, legacy version, and named diagnostic; the focused rerun killed all 64 covered mutants. The other 304 were not exercised by that test file.                                                   |
| Configuration module had 304 mutants uncovered by validation-only tests                                       | Included the owning migration suite and added plan validation, file identity, time-of-check race, no-op, and boundary cases. The final targeted report has 366 killed and zero uncovered.                                                                   |
| Doctor mutant 233 removed `value.mode < 0`                                                                    | Equivalent in `validatePlan`: any negative mode caught by the bitmask check is already rejected; a negative mode that evades it cannot equal the nonnegative masked raw mode later.                                                                         |
| Doctor mutant 236 removed the unsafe mode-bit check                                                           | Equivalent in `validatePlan`: an unsafe `before.mode` cannot equal the later masked raw mode; an unsafe `after.mode` cannot equal a valid `before.mode`. Both paths still reject.                                                                           |
| Decimal debounce argument truncated at a second dot                                                           | Confirmed by a failing 49ms behavior assertion; parsing now splits at the first dot and retains `0.05s`. The owning test and documented contract pass.                                                                                                      |
| Computed descriptor replacement left rendered bindings stale                                                  | A failing rendered-output case showed restored state `9` while `data-text` stayed at `4`. Targeted key notification after installing or restoring the descriptor fixes both transitions.                                                                    |
| Scalar workspace declaration silently skipped                                                                 | Confirmed by a failing filesystem-backed test; a present workspace value must now be an array or record. The owning and CLI cases pass, and `docs/UPGRADES.md` states the scan error.                                                                       |
| Ten Toggle Group mutants reported serializer errors                                                           | The repaired-tool pass matched all ten original signatures. Nine reach a mutation-induced instrumentation hit limit and one times out; the original error labels remain open.                                                                               |
| Seven Tags Input mutants reported serializer errors                                                           | The repaired-tool pass matched all seven original signatures. Six time out under mutation-induced DOM churn; one throws after its remove-button guard is mutated. Original labels remain open.                                                              |
| Four Sortable mutants reported serializer errors                                                              | The repaired-tool pass matched all four original signatures. Mutated guards let absent event or drag-transfer values reach DOM methods; original error labels remain open.                                                                                  |
| Three remaining Multi Select mutants reported serializer errors                                               | The repaired-tool pass matched all three original signatures. Altered option identity admits a stale record; removed optional chaining dereferences an absent value. Original labels remain open.                                                           |
| Six Tree mutants reported serializer errors                                                                   | The repaired-tool pass matched all six original signatures. Mutated expansion guards let a missing group reach a later property write; original error labels remain open.                                                                                   |
| Twelve Stepper, Tabs, Rating, and Hover Card mutants reported serializer errors                               | The repaired-tool pass matched all 12 original signatures. Two time out; the others trigger observer feedback, an invalid selector, or dereferences after mutated guards. Original labels remain open.                                                      |
| Twelve Feed, Form, Input OTP, Number Field, Time Picker, Toolbar, and Tree mutants reported serializer errors | The repaired-tool pass matched all 12 original signatures. Two time out; the others dereference absent DOM values, form records, or targets; produce invalid selectors; or hit observer feedback limits. Original labels remain open.                       |
| Root and delegated runtime events lacked routing assertions                                                   | Added a root `&` event case and an unrelated-child control. The frozen focused pass killed all six selected mutants, including four original survivors and two originally uncovered mutations.                                                              |
| Existing signals under `onlyIfMissing` lacked null and nested-object boundary checks                          | Added a public signal-patch contract case. Four original survivors are Killed by the frozen focused rerun; one already Killed mutant times out only in that narrower pass.                                                                                  |
| Selector-free target-ID lookup lacked root and external-scope cases                                           | Added a root-preference case with a verified external duplicate-ID precondition and a refusal case for outside-only IDs. The frozen focused pass killed three original survivors and all seven selected mutants.                                            |
| Malformed SVG fragments were not asserted at the parser boundary                                              | Added a rejection case that preserves the target. The frozen focused pass killed the original parser-error guard survivor and one previously uncovered markup-error mutation.                                                                               |
| Selector-free patches lacked an unmatched nonempty-ID case                                                    | Added an unmatched ID alongside a matching ID in the public patch test. The frozen focused pass killed the original survivor that removed the unmatched-target guard.                                                                                       |
| Unowned-document patches lacked successful transaction cases                                                  | Added a same-realm detached-document sequence for replace, morph, and remove. The frozen focused pass killed all three original optional transaction-call survivors.                                                                                        |
| A parent-realm call into an iframe failed during Idiomorph morphing                                           | The experiment exposed Idiomorph's `instanceof Node` check against its caller realm. The focused contract uses a same-realm unowned document; independent iframe applications load their own bundle. Cross-realm calls from the parent remain a limitation. |
| Selector-required patch modes lacked rejection cases                                                          | Added public no-selector cases for five patch modes. The frozen focused pass killed all five original survivors in the selection guard, with three previously Killed mutants surviving the narrower focused runner.                                         |

| Five patch survivors change only unused data or XML MIME choice | Reviewed IDs 15570-15573 and
15645 individually against the frozen source and the HTML Standard. The final disposition builder
must still validate their original signatures and Survived statuses. |

| Doctor reader cleanup masked an open failure when optional chaining was removed | Added a
deterministic removal race after path resolution. The frozen focused pass killed the original
optional-cleanup survivor; the separate original cleanup RuntimeError remains open. |

| Doctor input bounds accepted no exact-limit positive cases | Added space, maximum-length path,
exact file/byte/workspace/directory allowances, and malformed UTF-8/BOM cases. The frozen focused
pass killed 19 original survivors and one originally uncovered mutant. A later frozen
allocation-focused pass killed the original ID 638 signature. |

| Doctor control loop tests one extra string index under mutation | Reviewed original ID 406
individually: the extra `charCodeAt(length)` is `NaN`, so it cannot trigger either control-character
condition. Final disposition validation remains pending. |

| Doctor path safety missed exact-parent and swapped-symlink inputs | Added immediate-parent
rejection and an `O_NOFOLLOW` race case, plus canonical array ordering. The frozen pass killed six
original survivors; two root-suffix mutations are reviewed equivalent, while Windows/FIFO guards
stay open. |

| Disposed signal getters could reach native removal before registration | Added an owning listener
acquisition case that observes no native removal when the `signal` getter disposes the kernel. The
frozen focused pass killed original static survivor ID 14909 without changing production source. |

| Ten observation freezes were repeated after construction | Reviewed IDs 15133-15142 against frozen
owner, request, and error creation paths, plus the locked Node behavior for freezing undefined. Each
has an individual rationale pending full-report validation. |

| Overlapping action cleanup could lose or retain a request parent | Added an owning observation
case that settles an outer action while an inner scope remains active, then checks request parenting
both before and after inner settlement. The frozen focused pass killed original survivors
15335-15338. |

| Field-codec limits and overlapping paths were weakly tested | Added accepted maximum field/path
cases, distinct multi-field encoding, and malformed or reverse-ordered path rejection. The frozen
focused pass killed 12 original survivors across validation and overlap detection. |

| Persistence options did not assert codec identity or disposal defaults | Added rejected codec ID
and accepted default/explicit flush values. The frozen focused pass killed three original survivors.
|

| Envelope clock, expiry, revision, and migration boundaries lacked direct cases | Added public
reader, clock, and migration assertions. Eight original survivors were killed in the focused pass;
four remaining original survivors received individual source-based equivalence reviews. |

| Plugin range parsing and rejection lacked exact boundary assertions | Added multi-digit stable
versions, padded ranges, malformed segments, and specific rejection messages. The focused pass
killed five original survivors, three timeouts, and one uncovered mutant. |

| Plugin name patterns could accept leading or trailing punctuation | Added rejection cases for
ordinary and official names and a valid official single-segment case. The frozen focused pass killed
four original regex-anchor survivors. |

| A plugin could specify both ordering directions for one target without a direct case | Added a
transactional rejection assertion, including no installer call or retained plugin. The focused pass
killed an original survivor, timeout, and uncovered mutant in that guard. |

| Canceling a Select option click could still close the popup | Added canceled and committed click
cases. The frozen focused pass killed all seven original survivors in the option-click close guard.
|

| Malformed dynamic request arguments lacked direct rejections | Added URL and options cases with a
no-fetch assertion. The frozen focused pass killed seven original survivors and four uncovered
mutants in the public `@get` validation path. |

| CSP arrays lacked multi-digit index and negative-position boundary cases | Added a real index 10
and an own `"-1"` property that `.at()` must ignore when the position is outside the array. The
source-matched focused pass killed four original survivors. A separate direct-index versus `.at()`
write test killed three more original survivors. The remaining guards stay open for final
disposition. |

| Protocol plugin cleanup lacked default and reinstall lifecycle checks | Added two namespace
cleanup cases. One preserves or restores the selected default according to which namespace is
removed; the other keeps a stale cleanup from removing a later installation. The frozen focused pass
killed 11 original survivors and all 20 selected mutants. |

| Protocol matcher overlap had timeouts and missing same-kind cases | Added equal exact/suffix
rejections and distinct-pair acceptance in both cross-kind orders. The frozen focused pass killed 21
original timeouts and three uncovered mutants. Seven survivors have individual equivalence reviews
based on exhaustive normalized matcher kinds. |

| Original Timeout labels could not use a proven focused equivalence review | Required a
source-matched focused Survived result before accepting a Timeout review. The builder retains the
original label and rejects absent, erroring, or unmatched follow-ups. |

| Preserved-root lifecycle guards survived despite owning runtime tests | Added direct mount,
release, request cancellation, unmount-only, and destruction cases. The source-matched focused pass
killed 13 original survivors; two redundant self-containment guards have individual equivalence
reviews, and one ownership guard remains open. |

| The preserved-request fetch spy used default stringification for a possible `Request` | Read its
`url` property explicitly; targeted lint, the owning 36-case suite, and typecheck pass. |

## Document

### Documentation changed

`README.md` documents fractional event duration syntax and computed attribute replacement.
`docs/UPGRADES.md` documents malformed workspace declarations as doctor scan errors.
`docs/TESTING.md` records the declarative, reactivity, doctor discovery, input-limit, allocation,
path-safety, open-failure, document-listener, Menubar, Multi Select, Select, runtime event-routing
and preserved-root lifecycle, signal-patch, protocol cleanup and matcher overlap, element
target-scope, malformed-SVG, selector-free mixed-ID, unowned-document, and selector-required mode
regression coverage with their owning suites. Its final audit section states the complete original
counts, the 97 source-matched focused reports, 38 individual equivalence reviews, 16,464 remaining
open outcomes, resource cost, and process-runner limits. `docs/tickets/ROADMAP.md` records the later
authorization and completed one-time audit. Mutation testing remains outside canonical gates.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                             | Result |
| ----- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------ |
| AC-01 | The later user authorization and waived 0033 prerequisite are recorded in Plan and the roadmap.                                                                                      | Pass   |
| AC-02 | The frozen source/toolchain manifest and Plan validation precede the complete eight-worker run.                                                                                      | Pass   |
| AC-03 | The archived 56,731-mutant JSON/HTML, 136 source hashes, 97 linked follow-ups, and 17,917-entry non-killed disposition register pass source and SHA-256 checks.                      | Pass   |
| AC-04 | Confirmed defects have focused reruns; 1,415 original non-killed mutants are newly killed, 38 equivalent reviews are individual, and corrected test guards keep 51 focused statuses. | Pass   |
| AC-05 | `docs/TESTING.md` states counts and limits; `npm run check` passes 12/12 delivery gates with 1,717/1,717 browser cases and an eligible receipt.                                      | Pass   |

### Completion audit

The original report retains every generated mutant and all non-killed labels. Its killed fraction is
38,814/56,731 (68.42%); this is a descriptive fraction, not a passing threshold. The 16,464 open
dispositions remain visible for future test and analysis work and are not relabeled as fixes. The
only production corrections are the confirmed declarative, reactivity, and doctor changes recorded
above; their owning suites and focused mutation reruns pass. The final delivery report
`2026-09-25T08-00-31-214Z-99515` passes all 12 gates with matching 949-file fingerprints and an
eligible receipt. All five criteria have direct evidence.

Status: Complete

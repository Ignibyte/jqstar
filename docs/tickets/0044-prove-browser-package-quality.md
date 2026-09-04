---
id: 0044
title: Prove browser, accessibility, package, and release quality
status: done
created: 2026-08-30
updated: 2026-09-04
---

# 0044: Prove browser, accessibility, package, and release quality

## Plan

### Problem

The current browser suite runs only Chromium, retries failures twice in CI, and exercises the demo
development server. The package smoke scripts do not yet provide one consolidated contract for
public API changes, type resolution, bundle contents, tree shaking, sizes, accessibility states,
browser engines, generated output, clean installation, or release reproducibility.

### Current evidence

- `playwright.config.ts` defines only a desktop Chromium project.
- CI retries are set to two, and no `failOnFlakyTests` option turns retry-passes red.
- Axe checks run inside the component browser suite.
- Ticket 0004 plans real installed-tarball ESM, CommonJS, TypeScript, browser, UMD, and tree-shaking
  consumers.
- Ticket 0014 plans a runner-neutral public test package and real external plugins.
- Playwright supports Chromium, Firefox, WebKit, device projects, repeat runs, no-test refusal, and
  failing a build when a test passes only on retry.
- PR 1 delivery run `33805631434` passed all 13 package-release hardening tests, but the integrated
  green-control detector compared their colorized Vitest output without removing terminal control
  codes and therefore reported a false failure.

### Scope

- Add blocking desktop Chromium, Firefox, and WebKit projects for shared browser behavior.
- Add selected mobile/touch, reduced-motion, forced-color, zoom, and JavaScript-disabled projects
  based on component and feature contracts.
- Set `failOnFlakyTests` in CI. Retries may gather diagnostics but cannot turn a first-attempt
  failure into green.
- Add scheduled repeat and randomized-order runs with seed, shard, worker, browser, and trace data.
- Expand accessibility evidence to keyboard-only operation, focus order and restoration, accessible
  names/descriptions, ARIA state, live announcements, touch targets, zoom/reflow, contrast, reduced
  motion, and axe across initial, open, loading, error, updated, and disabled states.
- Define manual NVDA and VoiceOver release charters for complex grids, dialogs, menus, comboboxes,
  drag/drop, navigation, and live server updates.
- Add repeated mount, enhancement, patch, removal, and disposal browser fixtures with listener,
  observer, timer, request, focus, and owned-root assertions.
- Run network abort, delay, disconnect, malformed response, retry, redirect, conflict, and partial
  stream cases against the proof server.
- Build the exact tarball and run ticket-0004 consumers plus `publint`, `@arethetypeswrong/cli`, API
  Extractor reports, export-map checks, and declaration comparisons.
- Add hard bundle and CSS size budgets, core tree-shaking sentinels, dependency sentinels, and
  deterministic generated-output comparison.
- Verify clean `npm ci`, build reproducibility, package manifest/checksum, SBOM, provenance
  eligibility, licenses, and supported Node/npm/browser versions.
- Add deterministic performance budgets for bundle bytes, DOM node counts, listener/observer counts,
  request/query counts, patch counts, and bounded operations. Keep noisy wall-clock benchmarks in a
  controlled trend lane until their variance is measured.
- Run the self-hosted server and copy-in registry from the packed artifact, not source-adjacent
  build output.

### Out of scope

- Claiming that automated axe checks replace assistive-technology testing.
- Supporting every historical browser or mobile device.
- Passing flaky tests by increasing retries or timeouts without a root-cause ticket.
- Using unstable wall-clock microbenchmarks as hard PR gates before variance is established.
- Publishing the package or provenance record without explicit release authorization.

### Dependencies

- Tickets 0004 and 0041 through 0043.

### Decisions

- On 2026-08-30 the user explicitly authorized tickets 0041 through 0044 as one coordinated
  implementation batch. Their dependencies govern final closure order, not whether coding may
  overlap.
- Treat the generated npm tarball, not source-adjacent output, as the package test subject.
- Keep shared behavior blocking in Chromium, Firefox, and WebKit, with named conditional projects
  for environment-specific promises and a non-empty selection check for every project.
- Run the repeated browser matrix before the repository-wide mutation sweep. The full mutation audit
  historically drove sustained host load and macOS indexing work that could starve later WebKit
  navigation. Ticket 0048 removed that sweep. Repeated-browser quality remains enforced with the
  same retries, timeouts, worker count, and partial-shard refusal.
- Fail retry-passes through Playwright's flaky-test contract instead of increasing retries or
  timeouts to obtain green results.
- Gate deterministic byte, DOM, listener, observer, timer, request, and mutation counts; retain
  wall-clock measurements as trend evidence until their variance supports a hard threshold.
- Publish distinct ESM and CommonJS declaration conditions from one API Extractor rollup so each
  runtime format resolves matching types.
- Record ticket-0013 core tree-shaking and ticket-0014 external-plugin/testing checks as named
  pre-1.0 non-applicability, never as silently omitted coverage, until those public exports exist.
- Make repeated browser tests independent of mutable proof-backend revision and assignment state.
  Seed the access-manager contract explicitly and assert runtime revisions relative to the response,
  so repeat order and retained diagnostics cannot create false failures.
- Seed Data Table selection from authored checked controls only during initial enhancement. A server
  morph may preserve a checkbox's checked property while changing its row identity; later row
  configuration must treat the component record, not the morphed control, as selection authority.
- Ratify the documentation-aware unpacked package ceiling from the first exact-tree measurement
  using the existing next-4-KiB rule. Re-measure after the final ticket and public-documentation
  edits, while the budget is still an uncommitted first baseline, and set both package-byte ceilings
  to the smallest enclosing 4-KiB boundaries. This is initial-baseline ratification, not
  post-ratification headroom.
- Ship only the four user-facing guides linked from the package README. Keep repository brain,
  workflow, quality, accessibility-release, and ticket documents in the source repository. Bind the
  tarball to the exact public-document set so internal evidence edits do not change the product
  artifact.
- Keep the API Extractor drift test bounded, but size its child and outer timeouts from hosted Linux
  evidence. A clean Ubuntu run completed five of eight expected extractor entry points before the
  old 15-second build cap, so corrected limits must allow all eight passes without weakening the
  changed-signature assertion.
- Normalize terminal control codes before applying detector patterns to subprocess output. Keep the
  exact exit-code and complete-test-count requirements so presentation differences cannot create a
  false red or false green result.

### Acceptance criteria

- [x] [AC-01] Chromium, Firefox, and WebKit are blocking for shared behavior, with conditional
      projects covering every documented mobile, touch, motion, color, zoom, and no-JavaScript
      promise.
- [x] [AC-02] A test that fails once and passes on retry still fails delivery with its trace
      retained.
- [x] [AC-03] Required browser selections cannot pass with zero collected tests or an unmatched path
      rule.
- [x] [AC-04] Accessibility tests cover documented states and interactions, and release-critical
      complex widgets have recorded NVDA or VoiceOver charters.
- [x] [AC-05] Repeated enhancement and disposal leave no duplicate owned listeners, observers,
      timers, requests, roots, or focus side effects.
- [x] [AC-06] Network and server fixtures cover abort, delay, disconnect, malformed data, retry,
      redirect, conflict, and partial streams where supported.
- [ ] [AC-07] The exact tarball passes every format, TypeScript resolution, UMD/CDN, browser,
      external plugin, QUnit, tree-shaking, export-map, declaration, `publint`, and Are the Types
      Wrong fixture promised by 1.0.
- [x] [AC-08] API Extractor reports make public API changes explicit and reviewed.
- [x] [AC-09] Bundle, CSS, DOM, ownership, request, query, patch, and generated-output budgets are
      enforced and ratchet-only.
- [x] [AC-10] A clean checkout produces a reproducible artifact manifest and checksum and records
      SBOM, provenance eligibility, license, Node/npm, and browser evidence.
- [x] [AC-11] Every browser, accessibility, package, performance, and release selector has a
      sabotage case proving the gate detects drift or vacuity.

### Design

Run the smallest browser matrix that proves a change during iteration, then run every required
project before delivery. Keep deterministic structural budgets in the delivery gate and noisy
performance trend data in a dedicated environment until a stable threshold is measured.

Treat the packed artifact as the product. Source-level imports can remain a focused developer test
but cannot satisfy installed-consumer or release claims.

### Risks

- Three-browser component suites can be expensive. Use project selection and sharding, but make
  selector liveness part of the gate.
- Browser retries can hide shared-state pollution. Fail flaky outcomes and retain the first failure
  trace.
- API report and bundle snapshots can become rubber-stamped churn. Require a ticket decision for
  public API or budget changes.
- Manual accessibility checks can go stale. Record versions, environment, charter steps, and the
  exact release candidate.

### Planned files

- `playwright.config.ts`, `e2e/components.spec.ts`, `e2e/quality-contracts.spec.ts`,
  `e2e/fixtures/network-proof-server.mjs`
- `scripts/quality-browser.mjs`, `scripts/quality-package.mjs`, `scripts/quality-release.mjs`,
  `scripts/quality-0044-self-test.mjs`, `scripts/build-types.mjs`,
  `scripts/smoke-package-files.mjs`, `scripts/quality/package-release-contracts.mjs`,
  `scripts/quality/lib/process.mjs`
- `quality/gates.mjs`, `test/quality-runner.test.mjs`, `test/package-release-hardening.test.mjs`
- `vitest.config.ts` for clean-checkout source aliases used by public-boundary tests.
- `config/api-extractor.json`, `config/quality-budgets.json`, `etc/jquery-star.api.md`
- `schema/browser-report.schema.json`, `schema/package-report.schema.json`,
  `schema/release-report.schema.json`, `schema/quality-budgets.schema.json`,
  `schema/quality-0044-self-test-report.schema.json`
- `src/ui/data-table.ts`, `test/ui-data-table.test.ts`, `src/ui/theme.css`
- `docs/accessibility/RELEASE_CHARTERS.md`, `docs/PROJECT.md`, `docs/TESTING.md`,
  `docs/QUALITY_PROGRAM.md`
- `package.json`, `package-lock.json`, `tsconfig.build.json`

### Verification plan

- Run selection sabotage and the full project matrix from a clean packed-artifact consumer.
- Force one retry-pass, one empty selection, one browser-specific failure, one axe failure, one
  ownership leak, one API drift, and one size regression and prove each gate is red.
- Run package consumers under every supported TypeScript, Node, browser, and loading mode.
- Rebuild twice from clean checkouts and compare normalized manifests and bytes.
- Run delivery and full-audit gates plus `git diff --check`.
- Run the focused API Extractor drift test on a clean Linux-equivalent checkout and prove the
  deliberate overload change still exits nonzero with the changed-signature diagnostic.

## Code

### Changed-file ledger

| File                                                                                                          | Purpose                                                                                                           |
| ------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `playwright.config.ts`                                                                                        | Define blocking desktop and conditional browser projects with flaky-test failure.                                 |
| `e2e/components.spec.ts`                                                                                      | Keep shared form, display, and clipboard assertions portable across all three browser engines.                    |
| `e2e/quality-contracts.spec.ts`                                                                               | Prove conditional browser, accessibility, no-JavaScript, ownership, and network contracts.                        |
| `e2e/fixtures/network-proof-server.mjs`                                                                       | Supply deterministic abort, delay, disconnect, malformed, retry, redirect, conflict, and partial-stream fixtures. |
| `scripts/quality-browser.mjs`                                                                                 | Enforce non-empty browser project selection and emit browser evidence.                                            |
| `quality/gates.mjs`, `test/quality-runner.test.mjs`                                                           | Run repeated browsers before full mutation and lock that ordering in the canonical-mode contract.                 |
| `scripts/quality/lib/process.mjs`                                                                             | Expose bounded process-group execution to the API drift integration test.                                         |
| `scripts/quality-package.mjs`                                                                                 | Validate the packed public API, types, exports, sizes, and consumer behavior.                                     |
| `scripts/smoke-package-files.mjs`                                                                             | Make the compatibility package smoke enforce the same exact public-guide roster.                                  |
| `scripts/quality-release.mjs`                                                                                 | Build reproducible tarballs, manifests, checksums, SBOM, and release evidence.                                    |
| `scripts/quality-0044-self-test.mjs`                                                                          | Sabotage browser, package, API, budget, and release selectors and require red outcomes.                           |
| `scripts/build-types.mjs`                                                                                     | Roll up package declarations and emit matched ESM and CommonJS type entry points.                                 |
| `scripts/quality/budget-ratchet.mjs`                                                                          | Reject removed or loosened numeric ceilings against the immutable delivery base.                                  |
| `scripts/quality/package-release-contracts.mjs`                                                               | Fix exact check sets, status rules, and the public package-document roster.                                       |
| `config/api-extractor.json`                                                                                   | Define the reviewed public API report contract.                                                                   |
| `config/quality-budgets.json`                                                                                 | Store ratchet-only package, CSS, DOM, ownership, request, patch, and output budgets.                              |
| `etc/jquery-star.api.md`                                                                                      | Record the generated public TypeScript API surface.                                                               |
| `schema/browser-report.schema.json`, `schema/package-report.schema.json`, `schema/release-report.schema.json` | Bind passing evidence to exact projects, checks, counts, and engine versions.                                     |
| `schema/quality-budgets.schema.json`, `schema/quality-0044-self-test-report.schema.json`                      | Validate budget policy and the exact detector-control roster.                                                     |
| `test/package-release-hardening.test.mjs`                                                                     | Sabotage ordered checks, report status, workspaces, budgets, package documents, engine evidence, and API drift.   |
| `vitest.config.ts`                                                                                            | Resolve every JavaScript public export to source during clean unit execution.                                     |
| `src/ui/data-table.ts`, `test/ui-data-table.test.ts`                                                          | Prevent morphed checked state from selecting a new row identity and retain an exact regression.                   |
| `src/ui/theme.css`                                                                                            | Make touch targets, reduced motion, and forced-color focus behavior observable across conditional projects.       |
| `docs/accessibility/RELEASE_CHARTERS.md`                                                                      | Define manual NVDA and VoiceOver release checks.                                                                  |
| `docs/TESTING.md`                                                                                             | Document browser, package, accessibility, performance, and release gates.                                         |
| `docs/QUALITY_PROGRAM.md`                                                                                     | Record ticket-0044 commands and evidence.                                                                         |
| `docs/PROJECT.md`                                                                                             | Define the exact user-guide portion of the npm release shape.                                                     |
| `package.json`                                                                                                | Expose quality commands and pack only the four README-linked public guides.                                       |
| `package-lock.json`                                                                                           | Lock the added package-quality tools.                                                                             |
| `tsconfig.build.json`                                                                                         | Emit raw declarations for API Extractor without exposing extensionless imports as the public entry point.         |

### Measured baseline

- Latest immutable delivery artifact: 316 files, 1,969,066 packed bytes, and 6,483,449 unpacked
  bytes within 1,970,176 and 6,483,968 byte ceilings. `package-report.json` records the exact
  non-self-referential measurement.
- The exact public-document file list contains 261 files, measures 1,852,528 packed and 6,069,206
  unpacked bytes after the final public README edits, and contains only `BACKEND.md`,
  `COMPONENT_ARCHITECTURE.md`, `COMPONENT_RESEARCH.md`, and `SELF_HOSTING.md` beneath `docs/`. The
  ratified ceilings are 1,855,488 packed bytes, 6,070,272 unpacked bytes, and 265 files.
- ESM, CommonJS/UMD, and CSS: 491,435, 387,855, and 169,239 bytes.
- Installed root-import consumer bundle: 467,249 bytes.
- Repeated enhancement on Chromium, Firefox, and WebKit: 2,263 baseline DOM nodes, one owned active
  observer, one owned active listener, zero owned timers or requests, 1,141 queries, and four patch
  mutations across mount, destroy, remount, and second destroy. Both disposal cycles return owned
  listeners, observers, timers, requests, roots, and DOM-node delta to zero.
- Headroom: next 4 KiB package boundary, next 1 KiB bundle boundary, next five-file boundary, next
  100-node boundary, next even observer/timer count, and exact zero for zero-delta measurements.
  Environment variables cannot loosen these ceilings.

### Design changes

- Repeated browser cases establish or derive mutable backend state instead of assuming a fresh
  process-wide revision for every repeat.
- Data Table selection is seeded from authored checked rows once. Later DOM patches reconcile new
  controls from the record's selected IDs, preventing morph-preserved checked state from changing
  selection ownership.
- Publishing the broad `docs` directory made internal ticket evidence part of the product artifact
  and its size ratchet. The package now ships exactly the four guides linked from its README. The
  exact detector rejects missing and extra packaged documentation, including `docs/README.md`, and
  the smaller 261-file measurement establishes the final first baseline.
- The second canonical full audit reproduced a host-pressure failure rather than an assertion
  failure. After the three-hour mutation sweep, WebKit stalled on blank initial navigations while
  the Vite server answered in 0.21 seconds and the host load average exceeded 70. The affected tests
  passed 10 of 10 times in isolation before the host became saturated. Sequential shard trials
  degraded as more WebKit processes were launched, and an eight-worker trial saturated every first
  navigation, so both workarounds were rejected and removed. Full-audit order now runs the unchanged
  browser matrix before full mutation.

## Test

| Command                                                                             | Result                | Evidence                                                                                                                                                                                           |
| ----------------------------------------------------------------------------------- | --------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npx playwright test … --project=desktop-webkit` for the three repaired focus cases | Pass, 3 tests         | WebKit sidebar, toast, and navigation keyboard cases passed in 7.68 seconds.                                                                                                                       |
| `JQS_BROWSER_SEED=430044 npm run test:browser:quality`                              | Pass, 239 executions  | Eight projects selected and executed 239 tests with zero failed, flaky, or skipped; `.git/jqstar/standalone/ticket-0044/browser-report.json`.                                                      |
| `npm run test:package:quality`                                                      | Pass, 13 checks       | The installed tarball passed build, API, formats, types, QUnit, Vite, registry, and Chromium/Firefox/WebKit consumer checks.                                                                       |
| `npm run test:release:quality`                                                      | Pass, 7 checks        | Two independent `npm ci` workspaces produced the same 316-file manifest and checksum with zero generated-output changes.                                                                           |
| `npm run test:quality:0044`                                                         | Pass, 16 checks       | The isolated detector/control roster passed with retained retry and Playwright artifacts.                                                                                                          |
| `npx vitest run test/package-release-hardening.test.mjs`                            | Pass, 8 tests         | Check-set, status, workspace, budget-ratchet, browser-evidence, jQuery API drift, and the loaded-host subprocess allowance passed.                                                                 |
| Ajv 2020 validation of all four reports                                             | Pass                  | Browser, package, release, and self-test evidence matched the committed schemas.                                                                                                                   |
| `npm run quality:fast`                                                              | Pass                  | Run `2026-08-30T19-45-06-407Z-45616` passed five enforced gates and current-tree Code-phase validation.                                                                                            |
| `npm run quality:full-audit`                                                        | Expected repair fail  | Run `2026-08-31T01-09-34-157Z-23187` found repeat-order assumptions in three browser cases and measured the unpacked tarball 826 bytes above the provisional ceiling.                              |
| Three-browser focused repeat (`--repeat-each=2`)                                    | Pass, 18 executions   | Virtual selection, access assignment, and control-plane streaming passed twice in Chromium, Firefox, and WebKit with no retries.                                                                   |
| `JQS_BROWSER_REPEAT_EACH=2 JQS_BROWSER_SEED=430044 npm run test:browser:quality`    | Pass, 478 executions  | All eight projects executed 239 selected tests twice with zero failures, flakes, skips, or retries.                                                                                                |
| `npm run test:package:quality`                                                      | Pass, 13 checks       | Canonical delivery measured the 316-file tarball at 1,969,066 packed and 6,483,449 unpacked bytes and passed every installed consumer.                                                             |
| `npm run quality:full-audit`                                                        | Repair fail           | Run `2026-08-31T04-58-57-044Z-87453` passed every gate except repeated browser quality; WebKit recorded four retry-passes after blank-document `page.goto` stalls.                                 |
| Retry-free WebKit full repeat                                                       | Reproduced            | The 156-test run stalled at executions 49, 73, 127, and 151; each initial navigation and context teardown timed out, while the next fresh process resumed normally.                                |
| Focused WebKit repeat (`--repeat-each=5`)                                           | Pass, 10 executions   | The two tests named by the canonical report passed in isolation, proving their assertions were not the cause of the process-level navigation stalls.                                               |
| First batched WebKit repeat                                                         | Repair fail           | Both 39-execution axe-heavy shards stalled on execution 25; both functional shards passed, proving the process bound must account for workload rather than only the first 49-navigation failure.   |
| Lower-bound and parallel WebKit trials                                              | Rejected              | A later sequential process stalled on its 13th navigation, while eight concurrent workers stalled on all eight initial navigations. Both changed execution semantics without curing host pressure. |
| `npx vitest run test/package-release-hardening.test.mjs --reporter=verbose`         | Pass, 8 tests         | API Extractor drift sabotage completed in 9.79 seconds under the loaded host and passed with its explicit 30-second subprocess-test allowance.                                                     |
| `npm pack --ignore-scripts --dry-run --json`                                        | Pass, 261 files       | The final public-document package measured 1,852,528 packed and 6,069,206 unpacked bytes and contained exactly the four README-linked public guides.                                               |
| Ticket 0045's first `npm run quality:delivery`                                      | Expected repair fail  | Run `2026-08-31T14-27-02-980Z-70490` passed 12 gates and proved both provisional package-byte ceilings were crossed before first-baseline ratification.                                            |
| `npm run test:package:quality` after final baseline ratification                    | Pass, 13 checks       | The 261-file package passed both next-4-KiB byte ceilings plus every installed API, format, type, browser, QUnit, and registry check.                                                              |
| Ticket 0045's second `npm run quality:delivery`                                     | Expected repair fail  | Run `2026-08-31T14-43-40-394Z-5070` retained a mobile retry-pass caused by visibility changing between Playwright selection and geometry measurement.                                              |
| Atomic mobile target repeat and sabotage                                            | Pass, 20; red control | Twenty retry-free executions passed; the unchanged sabotage still rejected a rendered 85.15625-pixel control against its 10,000-pixel sentinel.                                                    |
| `npm run test:quality:0044` after atomic mobile repair                              | Pass, 16 detectors    | All browser, package, API, budget, and release sabotage/control pairs remained live.                                                                                                               |
| Ticket 0045's repaired `npm run quality:delivery`                                   | Pass, 13 gates        | Run `2026-08-31T15-06-12-375Z-44248` passed package and browser quality plus every other enforced delivery gate.                                                                                   |
| Final documentation-aware `npm run quality:delivery`                                | Pass, 13 gates        | Run `2026-08-31T15-21-08-168Z-69566` reproduced the 261-file artifact in two independent clean-install workspaces with SHA-256 `e49fc740be710222d9260d551a1dacf284e2e34accd3c4b6efbc5d6330c66c58`. |
| `npm run quality:delivery`                                                          | Pass                  | Run `2026-08-31T15-21-08-168Z-69566` passed all 13 enforced delivery gates and wrote an eligible receipt for the unchanged tree.                                                                   |
| Ticket 0004 installed-consumer `npm run quality:delivery`                           | Pass, 13 gates        | Run `2026-08-31T18-13-11-338Z-43975` added peer refusals and module/UMD boot-dispose proof in Chromium, Firefox, and WebKit while preserving the 13-check package report.                          |
| Focused package-document contract test                                              | Pass, 1 test          | The exact roster accepted all four public guides and rejected both a missing guide and an injected internal ticket path.                                                                           |
| Package/release hardening without the API subprocess case                           | Pass, 8 tests         | Exact documents, side effects, mandatory build, check status, independent workspaces, budget ratchets, and package/release report refusals passed on the current tree.                             |
| Focused API Extractor drift test on the saturated host                              | Inconclusive          | `build-types` exceeded one minute while macOS load stayed above 100; Vitest reached its 30-second allowance during fixture copy, before the sabotage configuration or assertion ran.               |
| Focused process timeout/refusal test                                                | Pass, 1 test          | The shared runner timed out a hung process, reaped its process group, and kept killed and missing-tool outcomes red.                                                                               |
| PR 1 hosted delivery run `33800660841`                                              | Fail, actionable      | The API Extractor build child reached five successful entry points before its 15-second cap; the drift subprocess and changed-signature assertion did not run.                                     |
| Focused API Extractor drift test after Linux timeout repair                         | Pass, 1 test          | All eight entry-point reports built and deliberate jQuery overload drift remained red; the test completed in 7.98 seconds within 60/30/120-second bounds.                                          |
| PR 1 hosted delivery run `33805631434`                                              | Fail, actionable      | All 13 package hardening tests passed in 25.61 seconds, but ANSI control codes prevented the raw-output detector from matching the complete test count.                                            |
| `npm run test:quality:0044` after terminal-output normalization                     | Pass, 16 detectors    | The complete detector roster passed; the package hardening green control forces color, strips terminal control codes for matching, and still requires all 13 tests and a zero exit code.           |
| PR 1 hosted delivery run `33810252990`                                              | Pass, 12 gates        | Clean Ubuntu passed browser, package, release, and all 16 detector/control checks. Artifact `quality-delivery-1` retained the schema-valid reports, logs, and eligible receipt.                    |
| PR 1 final hosted delivery run `33818434101`                                        | Pass, 12 gates        | Clean Ubuntu passed browser, package, release, and all 16 detector/control checks on one unchanged 602-file fingerprint. Artifact `quality-delivery-1` retained the eligible receipt.              |

Useful red history is retained. The first full matrix took 368.15 seconds and found three
WebKit-specific focus assumptions. After their focused repair, the second full matrix took 306.21
seconds and went red because two tests passed only on retry while the shared Vite server reloaded.
An uninterrupted run proved all eight projects without retries. The first integrated package run
rejected the stale packed-byte ceiling after new schemas and documentation entered the tarball. The
measured boundary was updated under the first-baseline rule, and the next run passed all 13 checks.
The final documentation-aware package and release measurements passed on one unchanged tree.

### Inspection ledger

| Finding                                                                                                                                                        | Resolution                                                                                                                                                               |
| -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A browser shard could execute only part of the required matrix and still produce a local green result.                                                         | `quality-browser.mjs` refuses `JQS_E2E_SHARD` until an all-shard aggregator can prove the complete matrix.                                                               |
| Selected-test counts did not prove that the listed tests executed and passed.                                                                                  | Every project now records selected, executed, passed, failed, flaky, and skipped counts. Passing requires exact execution with zero flakes or skips.                     |
| Package consumers used only Chromium and a build-skip environment variable could reuse stale output.                                                           | The bypass was removed. Installed ESM and UMD consumers run in Chromium, Firefox, and WebKit with recorded versions.                                                     |
| Release reproducibility reused one prepared workspace.                                                                                                         | The gate creates two distinct source copies and runs a separate `npm ci`, build, and pack in each.                                                                       |
| API Extractor did not cover the appended jQuery global augmentation.                                                                                           | Reportable `JQueryStarJQuery` and `JQueryStarJQueryStatic` interfaces now generate the final global bridge and appear in the reviewed API report.                        |
| Package and browser ceilings existed without an immutable-base comparison or generated-output count.                                                           | The budget schema and ratchet reject removed or increased ceilings. Release evidence records a zero-file generated-output budget and result.                             |
| Repeating the desktop suite reused backend revisions and assignments, while a morphed checked row could acquire a second identity.                             | Seed mutable access state, assert runtime results relative to returned revisions, and make the Data Table record authoritative after initial enhancement.                |
| The final documentation-aware tarball exceeded the provisional unpacked ceiling by 826 bytes.                                                                  | Ratify the first exact-tree measurement at the next 4-KiB boundary under the ticket's existing first-baseline rule.                                                      |
| Full mutation left the host load above 70 before the repeated WebKit lane, causing blank initial navigations while Vite remained responsive.                   | Run repeated browsers before full mutation and lock their stage relationship in `test/quality-runner.test.mjs`; retries, timeouts, and shard refusal stay unchanged.     |
| The API Extractor drift test first inherited Vitest's five-second default, then used synchronous subprocesses that the 30-second wrapper could not terminate.  | Use the quality runner's process-group helper with 15-second build and 10-second drift caps inside the 30-second test allowance; timeout is red and children are reaped. |
| Final ticket and public-documentation edits crossed both provisional package-byte ceilings before the first baseline was committed.                            | Record the exact dry-run measurement and ratify only the next 4-KiB packed and unpacked boundaries under the existing first-baseline rule.                               |
| The `files` manifest packed all 47 internal tickets and every project-brain document even though the release contract promises only user-facing documentation. | Replace the broad `docs` entry with the four README-linked guides and make an exact-document detector reject missing or extra packaged guides.                           |
| A passing `exports-and-files` report could replace its evidence with any JSON value and still satisfy the package-report schema.                               | Require the exact root/CSS exports, package version, and four-guide roster; schema sabotage removes and injects documentation entries.                                   |
| The integrated detector self-test still expected eight package hardening tests after the exact public-document test raised the suite to nine.                  | Update the green-control detector to require all nine tests; the delivery failure remains recorded and no receipt is accepted from the stale expectation.                |
| The mobile audit selected a transiently visible control, then measured it after Message Scroller set `hidden`, producing a retry-pass.                         | Select semantic/computed visibility and measure geometry in one browser task; do not filter on geometry, and keep flaky outcomes red.                                    |
| Clean Ubuntu needs more than 15 seconds to build all eight API Extractor entry points.                                                                         | Build, drift, and outer limits are 60, 30, and 120 seconds; nonzero drift and changed-signature assertions remain mandatory and pass locally.                            |
| The hosted package hardening control passed all 13 tests but its raw colorized summary did not match the plain-text detector.                                  | Strip terminal control codes before detector matching and force color in the green control so this presentation path is exercised on every platform.                     |

## Document

### Documentation changed

- `docs/TESTING.md` documents blocking projects, package consumers, isolated trace paths, run IDs,
  report names, and repeated-audit evidence.
- `docs/QUALITY_PROGRAM.md` records the stable commands, measured budgets, headroom rule, evidence
  location, report modes, and release order.
- `docs/PROJECT.md` names the four README-linked user guides as the complete packaged documentation
  set.
- `docs/accessibility/RELEASE_CHARTERS.md` defines release-candidate NVDA and VoiceOver charters.

### Acceptance evidence

| ID    | Outcome              | Evidence                                                                                                                                                                                                                                                                                                           |
| ----- | -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| AC-01 | Pass                 | `browser-report.json` selects all eight named projects and records 239 selected, executed, and passing tests with zero failed, flaky, or skipped.                                                                                                                                                                  |
| AC-02 | Pass                 | The `retry-pass-is-red` self-test plants a first-attempt failure, matches Playwright's flaky result, and retains its trace.                                                                                                                                                                                        |
| AC-03 | Pass                 | The `browser-empty-selection` self-test requires the missing project and the wrapper's own failure message.                                                                                                                                                                                                        |
| AC-04 | Pass                 | `e2e/components.spec.ts` and `e2e/quality-contracts.spec.ts` cover keyboard, focus, names, ARIA, updated/error/open/disabled states, axe, touch, motion, color, and zoom; `docs/accessibility/RELEASE_CHARTERS.md` records the manual release procedure.                                                           |
| AC-05 | Pass                 | All three desktop projects complete two mount/disposal cycles at 2,263 baseline DOM nodes. Owned listeners, observers, timers, requests, roots, and DOM-node delta return to zero after each disposal.                                                                                                             |
| AC-06 | Pass                 | The shared network test passes abort, delay, disconnect, malformed, retry, redirect, conflict, and partial-stream fixtures; its sabotage changes the named retry result.                                                                                                                                           |
| AC-07 | Approved-Disposition | Ticket 0004 completes the current-root installed consumer harness, including peer refusals and three-browser boot/dispose. The not-yet-published `jquery-star/core`, external-plugin, and testing contracts remain explicitly owned by tickets 0013 and 0014. Ticket 0044 does not declare or test future exports. |
| AC-08 | Pass                 | `etc/jquery-star.api.md` covers the reportable API and the generated jQuery global bridge. The drift test changes a jQuery overload and requires API Extractor's changed-signature detector.                                                                                                                       |
| AC-09 | Pass                 | Schema-validated ceilings cover package bytes/files, exact public documents, bundles, consumer bundle, DOM, ownership, requests, queries, patches, and zero generated-output changes. Immutable-base and document-roster sabotage pass.                                                                            |
| AC-10 | Pass                 | Run `2026-08-31T15-21-08-168Z-69566` performed two independent clean installs and reproduced the corrected 261-file public-document artifact with one SHA-256; SBOM, provenance eligibility, licenses, toolchain, browsers, and packed self-hosting passed.                                                        |
| AC-11 | Pass                 | `self-test-report.json` records 16 detector/control checks. Focused hardening also removes and injects package-document evidence, and the report schema rejects both cases.                                                                                                                                        |

### Completion audit

The focused browser, package, release, and detector reports are green and schema-valid. Ticket 0004
fulfills the current installed-consumer dependency. AC-07 has an approved disposition for future
exports owned by tickets 0013 and 0014. Manual assistive-technology execution remains a release
candidate task under ticket 0017; AC-04 requires the recorded charters that already exist.

Hosted delivery run `33818434101` passed the repaired package-hardening detector and every browser,
package, release, and self-test gate. Tickets 0041, 0042, and 0043 are complete. Every acceptance
criterion has direct evidence or an approved disposition, and no dependency remains.

Status: Complete

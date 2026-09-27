---
id: 0057
title: Verify and support jQuery 3.7.1
status: done
created: 2026-09-24
updated: 2026-09-25
---

# 0057: Verify and support jQuery 3.7.1

## Plan

### Problem

jQStar currently declares `jquery >=4.0.0 <5`, which rejects applications still using jQuery 3.7.1
even if the runtime behaves correctly there. The user asked us to research useful older versions,
determine whether a shim is needed, and test 3.7.1 after the authorized mutation audit.

### Current evidence

- The package, installed-consumer harness, public compatibility guidance, ecosystem matrix, and
  doctor contracts explicitly treat jQuery 3.7.1 as incompatible. The package harness proves npm
  strict peer resolution rejects it.
- Exact peer-range assertions also appear in `quality/public-baseline.json`,
  `quality/release-contract.json`, `quality/jquery-ecosystem.json`, `bin/doctor/compatibility.json`,
  `schema/public-baseline.schema.json`, `schema/release-contract.schema.json`, and
  `schema/package-report.schema.json`. The UI and Mobile migration fixtures pin 4.0.0 as their
  reference version and need not change merely because the peer range broadens.
- A full current-tree search also finds the range in `MIGRATING_TO_1.md`,
  `test/jquery-ecosystem-contract.test.ts`, `test/package-release-hardening.test.mjs`, and the
  generated agent-content/public example files. Regenerate those examples from the updated source
  documentation if the range changes. `CHANGELOG.md` is a historical release record, while the mock
  navigation plugin is an independent fixture with its own peer claim; review both rather than
  replacing every occurrence blindly.
- Exploratory built-core and UMD probes under jQuery 3.7.1 passed, including Chromium, Firefox, and
  WebKit, but these are not yet a complete installed-package compatibility matrix.
- [jQuery's support policy](https://jquery.com/support/) says 3.x receives critical security and bug
  fixes. The [official release index](https://releases.jquery.com/) lists 3.7.1 as the latest stable
  3.x release and shows no module asset for that branch. Its
  [4.0 upgrade guide](https://jquery.com/upgrade-guide/4.0/) describes public API removals and
  behavior changes that require testing, not an assumed shim.
- A source inventory found only `jQuery.fn`, `jQuery.Event`, `jQuery.data`, and `jQuery.removeData`
  as static jQuery touchpoints; runtime/declarative calls use collection methods such as `.each`,
  `.get`, `.on`, `.off`, `.trigger`, `.val`, `.text`, `.html`, `.toggle`,
  `.toggleClass(className, state)`, `.attr`, `.prop`, and `.css`. jQStar's `camelCase` is local
  code, not the `jQuery.camelCase` API removed in 4.0. The
  [jQuery event object](https://api.jquery.com/category/event-object/),
  [data](https://api.jquery.com/jQuery.data/),
  [removeData](https://api.jquery.com/jQuery.removeData/), [toggle](https://api.jquery.com/toggle/),
  and [toggleClass](https://api.jquery.com/toggleClass/) documentation confirms these signatures
  predate 3.7.1. In particular, jQStar passes a class name with the boolean state, not the
  boolean-only `.toggleClass()` signature removed in 4.0. This inventory suggests no shim, but the
  installed-package matrix must verify behavior.
- The official
  [jQuery 3.7.1 package manifest](https://github.com/jquery/jquery/blob/3.7.1/package.json) lists
  `dist/jquery.js` as its main entry and has no module export. A read-only
  `npm pack jquery@3.7.1 --dry-run --json` inventory found 125 published files and no `dist-module/`
  files. The existing package browser proof serves
  `node_modules/jquery/dist-module/jquery.module.js`, so it cannot run unchanged with 3.7.1. This is
  a distribution-format difference, not evidence that a jQStar runtime API needs a shim.
- A fresh live-contract inventory finds the exact peer floor in `package.json` and the root lockfile
  entry; `quality/public-baseline.json`, `quality/release-contract.json`,
  `quality/jquery-ecosystem.json`, and `bin/doctor/compatibility.json`; the public-baseline,
  release-contract, and package-report schemas; `scripts/quality-package.mjs`;
  `test/jquery-ecosystem-contract.test.ts`, `test/package-release-hardening.test.mjs`, and doctor
  fixtures; plus `README.md`, `docs/COMPATIBILITY.md`, `docs/JQUERY_ECOSYSTEM.md`, and
  `docs/TESTING.md`. The ecosystem entry's `testedVersions` must include both exact tested versions
  if support is proven. Existing jQuery 4 pins in UI/Mobile migration fixtures and historical
  decision tickets describe those specific examples; they are not the package's live support floor
  and should retain their exact evidence.
- The current package proof already serves `/jquery.js` for UMD consumers, but maps
  `/jquery-module.js` to jQuery 4's `dist-module` file in both `scripts/quality-package.mjs` and
  `scripts/quality/csp-proof-server.mjs`. The CSP fixture imports `/jquery-module.js` directly,
  while the other browser pages reach it through import maps. An exact 3.7.1 browser run therefore
  needs one temporary adapter at that path and must pass its path to the CSP proof handler as well.
  The installed-consumer block also hardcodes jQuery 4 and treats a strict jQuery 3.7.1 peer install
  as an expected failure; the candidate matrix must keep that existing negative check separate from
  its relaxed-metadata runtime consumer.
- A temporary adapter draft at `.git/jqstar/jquery-3.7.1-candidate/jquery-module.js` imports the
  external UMD file, checks that the browser exposed one jQuery 3.7.1 instance, and exports it.
  `node --check` passes; its SHA-256 is
  `94cb0cab639b555c3d92a42733704321087958353f4456b06739d6af4e114620`. No browser or
  installed-package result is inferred from this syntax check.
- A temporary one-off matrix harness at `.git/jqstar/jquery-3.7.1-candidate/run-matrix.mjs` was
  prepared before execution. It packs the original package, verifies strict npm rejection under the
  current peer range, repacks a metadata-only candidate with `>=3.7.1 <5`, compares every packed
  file except `package.json` byte for byte, verifies that only the jQuery peer range changed in the
  installed manifest, and installs it with exact `jquery@3.7.1` under strict peer resolution. Its
  Node ESM/CommonJS and Chromium/Firefox/WebKit module, UMD, and strict-CSP legs exercise jQuery
  identity, reactive signals/events, UI toggle and Carousel `data-part` slots, and the Datastar
  request profile. The CSP page uses only an external module and `script-src 'self'` so the adapter
  import is tested under a real policy. The report records the installed jQuery and browser
  versions, Playwright, Node, npm, and both tarball digests. `node --check` passes; the script
  SHA-256 was `c59ba6f37a0889aebeb22c21ea2d8f2bb379230b5805aa5f0722d121e51d282b`. At preparation
  time this supplied no runtime result. The queue was restarted after strengthening the candidate
  file comparison and updating its pinned harness hash; its PID and watcher start time were checked
  live.
- The one-off matrix was queued behind ticket 0053's final-analysis watcher. The first analyzer
  rejected 13 zero-mutant file omissions in Stryker's JSON, so that queue stopped without running
  jQuery 3.7.1. After correcting and successfully rerunning the report analysis, the matrix ran
  manually at low priority with the same frozen candidate approach.
- The completed ticket 0053 report covers all 56,731 generated mutants. Its first validator run
  found that Stryker's JSON omits 13 zero-mutant source files; the corrected validator requires
  their exact names and checks their frozen hashes. The complete report, 97 linked focused reports,
  and 17,917 original non-killed dispositions passed verification and have archived SHA-256 checks.
  The original queued matrix stopped when that first validator failed; it did not run prematurely.
- A manual low-priority execution of the pinned candidate matrix passed strict installed npm
  resolution, Node ESM and CommonJS, and browser module, UMD, and strict-CSP behavior with exact
  jQuery 3.7.1. The browsers were Chromium 151.0.7922.34, Firefox 153.0, and WebKit 26.5. All
  behavior assertions covered identity, signals/events, UI Toggle and Carousel slots, and the
  Datastar request profile. The report is `.git/jqstar/jquery-3.7.1-candidate/matrix-report.json`.
  The first browser attempt surfaced a Firefox favicon CSP console error after the behavior
  assertions passed; adding a self-hosted empty favicon and `img-src 'self'` to the fixture yielded
  the all-pass rerun. This is a harness fix, not a jQStar compatibility shim. The final harness
  SHA-256 is `0e2cfd59079a8ed310a99ceb2fa0ac706831ef85c9bd659c1754ed287de4bca9`.
- The
  [official jQuery 3.7.0 release](https://blog.jquery.com/2023/05/11/jquery-3-7-0-released-staying-in-order/)
  confirms an npm-published version immediately below the proposed 3.7.1 floor. The permanent
  strict-peer rejection case uses exact 3.7.0; the candidate matrix's 3.7.1 rejection records the
  original peer contract.
- Ticket 0053's full mutation audit preceded the requested 3.7.1 verification. This ticket stayed
  planned until that audit completed.

### Scope

- Run the built and installed package against exact `jquery@3.7.1` using strict npm peer resolution,
  ESM and browser UMD entry points, representative core, UI, and Datastar behavior, and the existing
  cross-browser engines. Include the application-owned jQuery identity and `$` versus `$name`
  boundary.
- If the matrix passes, broaden the peer floor to 3.7.1, preserve 4.0.0 as the primary development
  version, and add permanent 3.7.1 compatibility evidence to the package gate. Update all exact
  peer-range contracts, schemas, tests, and public/brain documentation.
- If a 3.7.1-only failure is found, isolate the jQuery API difference. Add only a narrowly scoped
  compatibility adaptation with a failing behavioral test; use no global monkey patch. If safe
  support is not justified, retain the peer range and document the failure.
- Keep the jQuery version in the published support claim tied to tested versions. Preserve the
  existing required non-mutation quality gates.

### Out of scope

- Supporting jQuery 1.x, 2.x, or an untested lower 3.x release.
- Vendoring, replacing, or globally patching jQuery.
- Changing `$` from real jQuery or treating `$name` as a jQuery object.
- Running mutation testing in ordinary development or release gates.

### Acceptance criteria

- [x] [AC-01] An exact 3.7.1 installed-consumer and cross-browser matrix records passes and failures
      with package, source, browser, and tool versions.
- [x] [AC-02] Any support claim is matched by the peer range, permanent package checks, public docs,
      and ecosystem/doctor contracts; a failing matrix leaves the range unchanged with an
      evidence-backed disposition.
- [x] [AC-03] Any compatibility adaptation has a focused regression test and no global jQuery patch;
      if none is needed, evidence explicitly records that conclusion.
- [x] [AC-04] `npm run check` passes on the final tree and the ticket's changed-file, command,
      inspection, and documentation ledgers are complete.

### Design

Start with a temporary strict consumer of the built tarball so the current peer rejection is
observed. A temporary candidate package may relax only the peer metadata to enable the runtime
matrix without claiming public support. Exercise core signals/events, the UI plugin and slots,
Datastar request integration, and UMD loading in Chromium, Firefox, and WebKit with jQuery 3.7.1.
Compare with the existing 4.0.0 baseline. Fix an actual incompatibility before changing the peer
range. The permanent package test should verify both supported versions and reject exact 3.7.0 as
the immediate unsupported boundary.

For the browser ESM leg, serve the 3.7.1 UMD file once and use a temporary test-harness module that
exports the resulting global jQuery under the same import-map name. Also exercise the published UMD
entry directly and the Node/bundler ESM path. Document the need for a script/adapter in direct
native-browser ESM consumers if the matrix passes; do not ship or globally install a jQuery patch.
The package proof's strict-CSP page imports `/jquery-module.js` directly from
`e2e/fixtures/csp-proof/app.js`. Its proof server currently serves that path as jQuery 4's
`dist-module` file and does not serve `/jquery.js`; the 3.7.1 harness must supply both the classic
published file and the temporary adapter for this page as well as the other import-map pages. Verify
that loading the UMD file as the adapter's side-effect module works under the strict policy; if it
does not, load it as a separate external classic script before the module without inline code.

The existing `installed-consumer` package check is a broad jQuery 4 proof: it installs plugin
fixtures with their own peer declarations, runs Node and QUnit consumers, and feeds the browser and
bundle checks. Add a separate strict jQuery 3.7.1 consumer check for the older-peer contract and
representative runtime/browser behavior, while preserving that broad jQuery 4 check. Keep the
published package as the subject in both checks, and record the exact installed version in each
report. Change the current 3.7.1 rejection expectation to a lower-version boundary check after the
peer floor is broadened.

The package report schema fixes the order of 13 checks, and its hardening tests address the existing
checks by index. Append the jQuery 3.7.1 check after those 13 checks, update the exact check-name
contract and report schema, and add a schema sabotage case for missing or wrong 3.7.1 evidence.

### Decisions

- Use 3.7.1 as the proposed lower floor because it was the user-requested version. Do not infer
  support for lower 3.x releases from one version.
- Use exact 3.7.0 for the strict negative peer case once the floor changes. Its published npm
  version is documented by the jQuery project, and it directly probes the proposed lower bound.
- Keep jQuery 4.0.0 as the development dependency. The application continues to own one real peer.
- Execute the candidate matrix after the mutation audit report and its dispositions validate.

### Risks

The current package harness deliberately rejects 3.7.1 and several documentation and schema
contracts embed the same peer floor. Changing only `package.json` would make an unsupported claim.
The candidate matrix must cover built consumers and browsers before the claim changes.

### Verification plan

Validate this Plan. After ticket 0053, run strict installation, the candidate runtime matrix, and
focused package/contract tests. Then run `npm run quality:fast`, validate Code, run `npm run check`,
validate Test, update public and brain docs, and complete the ticket audit.

### Planned files

- `package.json`, `package-lock.json`, and peer-range contract fixtures: align the claim if proven.
- `quality/public-baseline.json`, `quality/release-contract.json`, `quality/jquery-ecosystem.json`,
  `bin/doctor/compatibility.json`, and their schemas: align exact range and tested-version contracts
  if proven.
- `scripts/quality-package.mjs`: retain a strict installed-consumer matrix at 3.7.1 and 4.0.0.
- `scripts/quality/jquery-371-consumer.mjs`, package-report schema, program-audit check policy, and
  release proof: bind the permanent 3.7.1 result to the same packed tarball.
- jQuery UI/Mobile migration fixtures and downstream ticket digests: refresh references to the
  changed ecosystem matrix without changing their pinned jQuery 4 migration examples.
- `test/` compatibility and contract cases: verify behavior and exact range expectations.
- `src/`: only if the matrix reveals an actual 3.7.1 incompatibility.
- `README.md`, `docs/COMPATIBILITY.md`, `docs/JQUERY_ECOSYSTEM.md`, `docs/TESTING.md`, and linked
  policy schemas: explain the supported peer floor, tested versions, and any limit. Update
  `MIGRATING_TO_1.md` and regenerate agent-content/public example files if their source text
  changes.
- This ticket: record decisions, evidence, and completion.

## Code

### Changed-file ledger

| File                                                                                                       | Purpose                                                                               |
| ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| This ticket                                                                                                | Record design, matrix evidence, changes, gates, and completion.                       |
| `.git/jqstar/jquery-3.7.1-candidate/run-matrix.mjs`, `jquery-module.js`, and queue script                  | Preserve the temporary metadata-only candidate, browser adapter, and gated execution. |
| `.git/jqstar/jquery-3.7.1-candidate/README.md`                                                             | Explain temporary browser loading and evidence.                                       |
| `package.json`, `package-lock.json`                                                                        | Broaden only the jQuery peer floor; keep jQuery 4 as the development dependency.      |
| `quality/public-baseline.json`, `quality/release-contract.json`, `quality/jquery-ecosystem.json`           | Align public, release, and tested-version claims.                                     |
| `quality/jquery-ui-migration.json`, `quality/jquery-mobile-migration.json`                                 | Refresh source-matrix digests while retaining their exact migration fixture versions. |
| `bin/doctor/compatibility.json`                                                                            | Update supported range and authority digests.                                         |
| `schema/public-baseline.schema.json`, `schema/release-contract.schema.json`                                | Require the supported peer range.                                                     |
| `schema/package-report.schema.json`, `schema/jquery-ui-migration.schema.json`                              | Require 14 exact package checks and the refreshed migration matrix digest.            |
| `scripts/quality-package.mjs`, `scripts/quality/package-release-contracts.mjs`                             | Keep jQuery 4 proof, reject 3.7.0, and append the 3.7.1 check.                        |
| `scripts/quality/jquery-371-consumer.mjs`                                                                  | Prove strict installed Node, UMD, module, and CSP behavior in three browsers.         |
| `scripts/program-audit/detector-policy.mjs`, `scripts/release/prove.mjs`                                   | Bind detector and release proof to the added check and tarball digest.                |
| `test/jquery-ecosystem-contract.test.ts`, `test/doctor.test.mjs`                                           | Check the range, exact tested versions, digest links, and 3.7.0 doctor boundary.      |
| `test/package-release-hardening.test.mjs`, `test/program-audit-detector.test.mjs`                          | Check report structure, sabotage cases, and exact detector check list.                |
| `test/fixtures/doctor-consumer.mjs`                                                                        | Use exact 3.7.0 for the installed doctor's unsupported lockfile boundary.             |
| `README.md`, `MIGRATING_TO_1.md`, `docs/COMPATIBILITY.md`, `docs/JQUERY_ECOSYSTEM.md`                      | State the support floor, exact tests, and browser loading limit.                      |
| `docs/TESTING.md`                                                                                          | Document permanent exact 3.7.1 package evidence and the completed mutation audit.     |
| `example/docs/compatibility/index.html`                                                                    | Update the public support floor.                                                      |
| `example/agent-content.generated.json`, `example/public/jqstar-agent-index.json`                           | Regenerate agent indexes from the updated public page.                                |
| `example/public/llms-full.txt`                                                                             | Regenerate full public agent text.                                                    |
| `docs/tickets/0014-publish-testing-conformance.md`, `docs/tickets/0032-add-package-upgrade-diagnostics.md` | Refresh downstream ecosystem source digests.                                          |
| `docs/tickets/0039-publish-jquery-ui-migration.md`, `docs/tickets/0040-publish-jquery-mobile-migration.md` | Refresh downstream ecosystem source digests without changing migration scope.         |
| `docs/tickets/ROADMAP.md`                                                                                  | Link the completed audit to the exact 3.7.1 support ticket.                           |

### Design changes

The candidate matrix found no jQStar runtime API incompatibility. The only adapter is a browser test
fixture for jQuery 3.7.1's published UMD distribution; application code and jQStar runtime code need
no shim. Keep the direct UMD path and add a permanent exact-version installed-consumer check before
broadening the public peer range.

## Test

| Command                                                                                                                                   | Result | Evidence                                                                                                                                                                                                                                                                                                                     |
| ----------------------------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run ticket:validate -- --phase plan --ticket docs/tickets/0057-verify-jquery-3-7-1-support.md`                                       | Pass   | The planned ticket validates before product changes.                                                                                                                                                                                                                                                                         |
| `node --check .git/jqstar/jquery-3.7.1-candidate/run-matrix.mjs` and `zsh -n .git/jqstar/jquery-3.7.1-candidate/queue-after-mutation.zsh` | Pass   | Temporary harness and queue syntax check.                                                                                                                                                                                                                                                                                    |
| `shasum -a 256` on the candidate harness and adapter                                                                                      | Pass   | The initial hashes were `c59ba6f37a0889aebeb22c21ea2d8f2bb379230b5805aa5f0722d121e51d282b` and `94cb0cab639b555c3d92a42733704321087958353f4456b06739d6af4e114620`. The browser fixture correction changed only the harness to `0e2cfd59079a8ed310a99ceb2fa0ac706831ef85c9bd659c1754ed287de4bca9`; the queue pin was updated. |
| Ticket 0053 final analyzer and SHA-256 verification                                                                                       | Pass   | Complete 56,731-mutant report, 97 signature-linked focused reports, 17,917 dispositions, and eight checksummed archived files.                                                                                                                                                                                               |
| First low-priority candidate matrix                                                                                                       | Fail   | Strict npm, metadata comparison, Node consumers, and browser behavior passed; Firefox logged a favicon CSP block on the otherwise successful CSP page. This was a fixture-only failure.                                                                                                                                      |
| Corrected low-priority candidate matrix                                                                                                   | Pass   | Six checks; exact installed 3.7.1 and module, UMD, CSP proofs in Chromium 151.0.7922.34, Firefox 153.0, and WebKit 26.5. Report under `.git/jqstar/jquery-3.7.1-candidate/`.                                                                                                                                                 |
| Standalone `scripts/quality/jquery-371-consumer.mjs` against the candidate tarball                                                        | Pass   | Strict installed Node ESM/CommonJS and three-engine browser proof returned exact peer, tarball digest, and version evidence.                                                                                                                                                                                                 |
| First focused four-file Vitest run                                                                                                        | Fail   | Five doctor fixtures still used newly supported 3.7.1 as the negative boundary; ecosystem downstream tickets retained the old digest. Both were corrected.                                                                                                                                                                   |
| Focused four-file Vitest rerun                                                                                                            | Pass   | 128/128 tests across ecosystem, package hardening, doctor, and program-audit detector suites.                                                                                                                                                                                                                                |
| `npm run build:agent-content`                                                                                                             | Pass   | Regenerated public agent index and text from the updated compatibility page; the index is 189,973 bytes under its 190,000-byte limit.                                                                                                                                                                                        |
| First `npm run quality:fast`                                                                                                              | Fail   | Five gates passed, including 76/76 Chromium components. Static lint-boundary checks found non-null assertions in ticket 0053's protocol and runtime tests; those tests now use explicit fixture guards.                                                                                                                      |
| Focused runtime/protocol tests and lint-boundary check                                                                                    | Pass   | 87/87 tests; exact lint-boundary check and targeted Prettier pass with unchanged allowances.                                                                                                                                                                                                                                 |
| Second `npm run quality:fast`                                                                                                             | Pass   | Six enforced gates, including 76/76 Chromium components; report `2026-09-25T07-38-58-658Z-52608` has matching start/end fingerprints.                                                                                                                                                                                        |
| Code-phase validation for tickets 0053 and 0057                                                                                           | Pass   | Both validate against the matching fast report before moving to Test.                                                                                                                                                                                                                                                        |
| First `npm run check`                                                                                                                     | Fail   | Package quality passed 13 checks, including the 3.7.1 consumer, but its installed doctor fixture still expected 3.7.1 to fail. The runner completed other gates and was stopped through its signal handler to save resources.                                                                                                |
| `npm run test:package:quality` after the doctor fixture correction                                                                        | Pass   | All 14 checks passed for the current packed package, including strict 3.7.1 Node and three-browser proofs and exact 3.7.0 rejection.                                                                                                                                                                                         |
| Clean `npm run check`                                                                                                                     | Pass   | Report `2026-09-25T08-00-31-214Z-99515`: 12/12 enforced gates, 14/14 package checks, 1,717/1,717 browser cases, matching 949-file fingerprints, eligible receipt.                                                                                                                                                            |
| Test-phase validation for tickets 0053 and 0057                                                                                           | Pass   | Both validate against the passing delivery report before documentation completion.                                                                                                                                                                                                                                           |

| Command                                        | Result | Evidence                                                                                                                            |
| ---------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                         | Pass   | Run `2026-09-25T07-38-58-658Z-52608`: six gates, including 76/76 component cases.                                                   |
| `npm run quality:delivery` via `npm run check` | Pass   | Run `2026-09-25T08-00-31-214Z-99515`: 12 gates, including 14/14 package checks, 1,717/1,717 browser cases, and an eligible receipt. |

### Inspection ledger

| Finding                                                  | Resolution                                                                                                                              |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 3.7.1 has no published native browser module             | The package gate uses a local test-only adapter for that distribution; no runtime shim or global jQuery patch is shipped.               |
| Firefox requested a favicon on the strict-CSP proof page | The fixture serves an empty same-origin icon and permits same-origin images while keeping `script-src 'self'` and `default-src 'none'`. |
| Exact lower-bound doctor fixtures assumed 3.7.1 failed   | Changed incompatible direct, workspace, and lockfile fixtures to exact 3.7.0; retained a compatible separate transitive 3.7.1 example.  |
| Ecosystem digest is a downstream contract                | Refreshed doctor, migration fixture/schema, and four downstream ticket digests after changing the exact tested-version list.            |
| Installed doctor consumer still rejected 3.7.1           | Moved its one negative lockfile fixture to exact 3.7.0; the permanent 3.7.1 package check had already passed.                           |

## Document

### Documentation changed

`README.md`, `MIGRATING_TO_1.md`, `docs/COMPATIBILITY.md`, and `docs/JQUERY_ECOSYSTEM.md` state the
tested peer floor. `docs/TESTING.md` describes the exact installed 3.7.1 package proof and the
completed mutation audit. The public compatibility example and generated agent-content text now
state the same range. The detailed browser-module distribution limit is in `docs/COMPATIBILITY.md`.
`docs/tickets/ROADMAP.md` records the completed audit and this dependent support verification.

### Acceptance evidence

| ID    | Evidence                                                                                                                                                                                                                                  | Result |
| ----- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| AC-01 | The candidate matrix records strict npm, metadata-only package comparison, Node ESM/CommonJS, and module/UMD/CSP behavior in Chromium 151.0.7922.34, Firefox 153.0, and WebKit 26.5, with source revision, versions, and tarball digests. | Pass   |
| AC-02 | `package.json` and the lockfile claim `>=3.7.1 <5`; the 14-check package gate proves exact 3.7.1 and 4.0.0 while rejecting 3.7.0, and ecosystem/doctor schemas, digests, and public docs agree.                                           | Pass   |
| AC-03 | The only adapter loads jQuery 3.7.1's published UMD file in the browser test harness. The strict-CSP, module, and UMD checks pass in three engines; no `src/` jQuery shim or global patch was added.                                      | Pass   |
| AC-04 | `npm run check` passes all 12 delivery gates with 1,717 browser cases and an eligible receipt. The changed-file, command, inspection, and documentation ledgers are complete.                                                             | Pass   |

### Completion audit

The exact 3.7.1 matrix and permanent package gate support the peer-floor change. The new browser
adapter is test-only and addresses the published distribution format, not a jQStar runtime API
incompatibility. The development dependency remains jQuery 4.0.0. The final delivery report
`2026-09-25T08-00-31-214Z-99515` has matching source fingerprints and no failed, flaky, or skipped
browser cases. All four acceptance criteria have direct evidence.

Status: Complete

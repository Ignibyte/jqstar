# Testing strategy

## Current browser-first policy

Fast quality runs the Chromium Component Lab suite and requires at least 76 selected and executed
cases, all passing without retries or skips. Delivery also runs all eight browser projects; full
audit repeats cross-engine browser execution. UI changes should add observable interaction,
native-form, keyboard, server or accessibility checks in the browser. Focused direct tests remain
available for parsers, protocol, package, security and failure paths that browser checks cannot
efficiently prove. The broad Vitest suite and coverage percentages are no longer automatic gates.
`npm test` runs that same fast browser suite. `npm run test:unit` remains an optional direct
command. `npm run test:coverage` records diagnostic percentages and uncovered code without a 100%
delivery target. Mutation testing stays outside the active toolchain under tickets 0048 and 0053.
Ticket 0056's standalone `npm test` report selects and executes all 76 Chromium cases with zero
failed, flaky or skipped. Delivery report `2026-09-24T07-10-52-807Z-82457/report.json` passes all 12
gates, including 1,717 browser cases across eight projects, on a matching 944-file fingerprint. The
dated reports below retain the earlier policy and transition evidence.

The first green browser-first delivery run, `2026-09-24T05-25-23-228Z-18075/report.json`, passes all
12 gates on matching 943-file fingerprints and writes a receipt. It executes 76 Component Lab cases
and 1,717 cases across eight browser projects with no failure, flake or skip. Installed package
quality passes 13 checks, release passes seven, and all 16 detector controls pass. Ticket 0055
records the source-map deduplication and narrow measured size-limit reset that cleared inherited
package failures.

The first browser-first `npm run check` report `2026-09-24T03-29-18-780Z-17137/report.json` passes
the 76-case component gate and all 1,717 cases across eight browser projects. Property, static,
self-hosted and release checks pass. The run remains red on the three existing package-size limits
and the package-budget detector isolation control; no delivery receipt was written. Standalone
coverage diagnostics pass with 5,059 direct cases and retain 54 changed-code misses as findings,
without a percentage gate.

Full `npm run check` report `2026-09-24T01-32-50-157Z-66628/report.json` has matching start/end
933-file fingerprint `31898c4b02097f34d19a0f60e3fa2ba96df0c68c4b5fb76284948460f757c8de`. Format,
5,051 units, property, static, self-hosted, release and all 1,717 browser cases pass across eight
projects, including 563 per desktop engine without failure, retry or skip. Coverage fails 54
changed-code checks in 34 files, with 899 uncovered changed lines and 69 functions. Packed bytes
(3,417,476), Mobile UMD (558,894) and installed root bundle (634,769) exceed fixed limits;
package-budget isolation is the only failed detector control among sixteen. No delivery receipt
follows.

The shared floating-state continuation adds seven unit cases across Tooltip, Hover Card, Popover,
Menu and Context Menu. They check external native hide/show, reflected state and trigger ARIA,
duplicate lifecycle suppression, outside dismissal, and Popover/Hover Card restoration of a lost
native overlay with focus and resize positioning. The full shared suite passes 122 tests; a selected
actual-browser case passes in Chromium, Firefox and WebKit for Popover and Hover Card native events.
TypeScript and focused ESLint pass. Standalone delivery-mode coverage remains red but improves from
56 checks in 34 files to 54 in 34, with uncovered changed lines 937 to 899 and functions 73 to 69.
Fixed package limits and wider audit criteria remain open.

Full `npm run check` report `2026-09-24T00-44-21-973Z-66209/report.json` has matching start/end
933-file fingerprint `71c9d9acbacc350d92755680611e5c0389b68562390e447d75288673c7a47153`. Format,
5,044 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 per desktop engine without failure, retry or skip. Coverage fails 56
changed-code checks in 34 files, with 937 uncovered changed lines and 73 functions. Packed bytes
(3,417,318), Mobile UMD (558,894) and installed root bundle (634,769) exceed fixed limits;
package-budget isolation is the only failed detector control among sixteen. No delivery receipt
follows.

The coverage evaluator now attributes a changed multiline `const` header to raw statement counters
inside its own initializer. The report records those statement IDs, lines and hit counts; zero-hit
and unrelated mappings still fail. Six direct positive/negative controls pass, as does the
independent program-audit comparison (101 focused tests total). A retained-raw replay and the full
standalone `npm run test:coverage` agree: 40 executed headers in 19 files receive evidence;
changed-code failures fall from 75 in 35 files to 56 in 34, with 937 uncovered changed lines and 73
functions unchanged. The uninitialized `src/kernel.ts` field remains an unmapped executable line.

Full `npm run check` report `2026-09-23T23-55-50-488Z-65952/report.json` has matching start/end
933-file fingerprint `48c097feb1b0674803d45bc65c7341f3429fac463b12c01a2dc5a85c7169951d`. Format,
5,038 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 per desktop engine without failure, retry or skip. Coverage fails 75
changed-code checks in 35 files, with 937 uncovered changed lines and 73 functions. Packed bytes
(3,417,197), Mobile UMD (558,894) and installed root bundle (634,769) exceed fixed limits;
package-budget isolation is the only failed detector control among sixteen. No delivery receipt
follows.

The Form `clear-errors` and native Menu interaction audit adds one original-resolver public
negative: a wrong-kind input plus valid field names cleared the nearby form instead of rejecting.
The corrected Form, Menu and Context Menu suites pass 29 tests. One selected browser case passes in
Chromium, Firefox and WebKit for unchanged native custom validity, Menu disabled-item exploration,
ContextMenu-key invocation and canceled touch long-press. A native popover state-sync case verifies
Menu state and `aria-expanded` after external toggles. TypeScript, focused ESLint and the
lint-boundary ratchet pass. Standalone delivery-mode coverage retains 75 failed checks across 35
files, while uncovered changed lines fall from 965 to 937 and functions from 77 to 73. Fixed package
limits and wider audit criteria remain open.

Full `npm run check` report `2026-09-23T23-00-43-821Z-58338/report.json` has matching start/end
933-file fingerprint `c0b92ce1edaf173a30e021c8af8eeef7158b675c86ce1e51af8930eabdd6444b`. Format,
5,031 units, property, static, self-hosted, release and all 1,714 browser cases pass, including 562
per desktop engine without failure, retry or skip. Coverage fails 75 changed-code checks in 35
files, with 965 uncovered lines and 77 functions. Packed bytes (3,417,139), Mobile UMD (558,894) and
installed root bundle (634,769) exceed fixed limits; package-budget isolation is the only failed
detector control among sixteen. No delivery receipt follows.

The structural native-action regression covers Dialog, Form reset and server errors, Collapsible,
Accordion, Menu, Context Menu and Toggle toggle/press. Nine direct public probes fail on the
original source when a wrong-kind element redirects or is misread as an overload value. The
corrected six component suites pass 46 tests, and one selected browser case passes in Chromium,
Firefox and WebKit. The browser case checks unchanged native dialog, form validity/value,
disclosure, menu and pressed state after rejection, then matching-root controls. Standalone
delivery-mode coverage still fails 75 checks across 35 changed source files, but uncovered changed
lines fall from 974 to 964 and uncovered functions from 79 to 77.

The corrected fast run `2026-09-23T22-57-30-642Z-43847/report.json` passes six lanes and 5,031 units
on a matching 933-file fingerprint. The initial fast run found a generated API Extractor warning
line-reference mismatch; its checked-in snapshot now matches the generated report.

Full `npm run check` report `2026-09-23T22-05-28-440Z-41196/report.json` has matching start/end
933-file fingerprint `c1c0bfe1a18acaa65107e2cb21080005d19f21e8f942b4dfa14c31f1042f5202`. Format,
5,022 units, property, static, self-hosted, release and all 1,711 browser cases pass, including 561
per desktop engine without failure, retry or skip. Coverage remains red at 75 changed-code failures
across 35 files. Package quality reports packed bytes 3,417,612 against 3,174,000, Mobile UMD
558,929 against 462,311 reviewed bytes, and installed root bundle 634,857 against 542,720.
Package-budget is the sole failed detector control of sixteen; no delivery receipt is eligible.
Direct build measurements also exceed the unchanged unpacked, UI ESM/CommonJS, raw UMD and CSS caps;
the package check stops before reporting those separately.

The additional explicit-native-element audit covers ten wrong-kind action redirects in Combobox,
Tabs, Data Table, Chart, Tooltip, Carousel, Hover Card, Select, Popover and File Upload, plus
matching-root/value overloads in Tree, Carousel and File Upload. All 13 new public cases fail on the
original source. The corrected eleven-suite selection passes 87 tests, TypeScript and focused ESLint
pass, and one selected real-browser case passes in Chromium, Firefox and WebKit. That case checks
native form values, tree expansion, tab panels, carousel slides, file input state and popover state.
Standalone delivery-mode coverage remains red with 75 changed-code failures in 35 files, but
uncovered changed lines drop from 985 to 974 and functions from 81 to 79. Fast report
`2026-09-23T21-59-09-250Z-12003/report.json` passes all six lanes and 5,022 units on matching
933-file fingerprint `581e01a9ea5ba568112b70bdd4bec0853f0f85faa12e26c6c4bbe8fc1df50724`. Fixed
package limits and the full delivery failures above remain open for this wave.

Full `npm run check` report `2026-09-23T21-10-29-609Z-23479/report.json` has matching start/end
933-file fingerprint `a9095ecf9e13991ecffea94cf358196e942f945eb43c86ca53e74214d5c68a5b`. Format,
5,009 units, property, static, self-hosted, release and all 1,708 browser cases pass. The eight
browser projects include 560 cases in each desktop engine, without failure, retry or skip. Coverage
remains red with 75 changed-code failures across 35 source files. Packed bytes (3,417,751), Mobile
UMD (559,168 versus 462,311) and installed root bundle (635,321 versus 542,720) exceed fixed limits.
Package-budget isolation is the only failed detector control of sixteen, and no delivery receipt is
eligible.

The remaining explicit-element action audit covers Transfer List, Log Viewer, JSON Viewer,
Pagination, Message Scroller and Countdown. Six original-source public wrong-kind cases fail, and a
separate native-root `follow(root, false)` case fails before correction. The corrected six-suite
selection passes 43 tests. One selected real-browser case passes in Chromium, Firefox and WebKit,
checking wrong-kind rejection, matching and implicit actions, native Transfer List form values, JSON
disclosure, log and pagination state, follow choice and a running timer. TypeScript and focused
ESLint pass. Standalone delivery-mode coverage improves from 76 to 75 changed-code failures across
the same 35 files. Other changed-code paths and fixed package limits still block delivery.

Full `npm run check` report `2026-09-23T20-20-59-893Z-21133/report.json` starts and ends on matching
933-file fingerprint `598e998e4ce4b3a89a218ec57179f32222559f6911c71e03448030173f274740`. Format,
5,002 units, property, static, self-hosted, release and all 1,705 browser cases pass, with 559 per
desktop engine and no failure, retry or skip. Coverage fails 76 changed-code checks in 35 of 60
changed source files. Packed bytes (3,417,931), Mobile UMD (559,332) and installed root bundle
(635,618) exceed fixed limits; package-budget isolation is the only failed detector control among
sixteen. No delivery receipt follows.

Color Picker and Editable now reject wrong-kind native element targets in their named actions. Two
original-source public negatives fail; the corrected focused component selection passes 21 tests,
and the broader four-suite selection passes 266. The new tests also cover authored disabled swatch
state, disabled native color changes, context-dependent color rejection, an authored patch during
native normalization, replacement-controller acquisition, non-element delegated events, and Editable
selection, validity and native change reentry. One selected actual-browser case passes in Chromium,
Firefox and WebKit for explicit, implicit and wrong-kind actions with native form values. Standalone
delivery-mode coverage drops from 77 failures in 36 changed source files to 76 in 35: Color Picker
clears; Editable retains four defensive pre-operation stale-controller guards. Fixed package limits
and the other changed-code files remain.

The corrected full `npm run check` report `2026-09-23T19-21-50-667Z-9825/report.json` starts and
ends on matching 933-file fingerprint
`b7d5f872fc12f13592c448f34bf7ad835252191e7c2fd5164d39c46de685865a`. Format, 4,991 units, property,
static, self-hosted, release and all 1,705 browser cases pass, with 559 per desktop engine and no
failure, retry or skip. Coverage still fails 77 changed-code checks across 36 of 60 changed source
files. Packed bytes (3,418,078), Mobile UMD (559,386) and installed root bundle (635,716) exceed
fixed limits; package-budget isolation is the only failed detector control among sixteen. No
delivery receipt follows. The first full report `2026-09-23T18-44-45-373Z-42853/report.json` caught
three unformatted audit paragraphs; they were corrected before the repeated full run.

Password Field and Sidebar have direct public tests for wrong-kind native action targets, matching
and implicit forms, visibility reentry, replacement listeners, mobile backdrop focus and storage
callback reentry. Two original-source negatives fail while 13 controls pass; the corrected two-file
selection passes 20 cases. Standalone delivery-mode coverage reduces failures from 80 across 37
files to 77 in 36, clearing Password Field; Sidebar retains one defensive stale-controller line. The
selected native-element browser case passes once in Chromium, Firefox and WebKit with native
password value/visibility, Sidebar state and wrong-kind rejection. Fixed package and remaining
changed-code checks still block delivery.

`test/ui-sidebar.test.ts` now also checks that a trigger click reflects the documented collapsed
value in `data-value`. Its owning suite passes eight cases. A frozen-source one-worker mutation
probe of the value-write condition confirms that forcing the write on every enhancement reaches a
MutationObserver feedback loop and Stryker's hit-count limit. That original runner error remains
open; the production guard and source are unchanged.

The shared UI lifecycle and preserved-focus audit adds native-host tests for reset cancellation
reentry, combined acquisition/cleanup failures, detached-Document rejection and disposal during
focus-listener registration. The two focused suites pass 41 cases. Standalone delivery-mode coverage
falls from 81 to 80 changed-code failures across 37 files. `src/ui/lifecycle.ts` retains an
uncovered default no-op cleanup function and `src/kernel.ts` an uninitialized class field absent
from V8 maps; these entries are recorded for principled resolution rather than a call made only to
raise coverage. The remaining coverage and fixed package limits still block delivery.

The next native-element action wave covers Input OTP, Search Field, Tags Input, Stepper and Multi
Select through 39 focused tests. Five direct public negatives fail before source correction while 21
controls pass; the corrected selection passes. Standalone delivery-mode coverage reduces
changed-code failures from 87 across 39 files to 81 across 37, clearing Search Field and Tags Input.
The selected actual-browser case passes once in Chromium, Firefox and WebKit, checking native form
values, selection, Stepper state, an implicit value and wrong-component rejection. Input OTP,
Stepper, Multi Select, the other changed sources and fixed package limits remain open.

Full `npm run check` report `2026-09-23T17-38-59-853Z-28268/report.json` starts and ends on matching
933-file fingerprint `216b3cd48bcc4d3e06bd9943f7b31e780202c394e37369f04703ef47c6c884e9`. Format,
4,980 units, property, static, self-hosted, release and all 1,705 browser cases pass, with 559 per
desktop engine and no failure, flake or skip. Coverage still fails 81 changed-code checks across 37
of 60 changed source files. Packed bytes (3,417,532), Mobile UMD (559,441) and installed root bundle
(635,815) exceed fixed limits; package-budget isolation is the only failed detector control among
sixteen. No delivery receipt follows.

Number Field, Time Picker, Rating, Toggle/Toggle Group and Toolbar now have direct tests for
element-target named actions, wrong-component rejection and retained implicit forms. Their focused
44-case selection also checks native change reentry, listener replacement, time-step fallback and
keyboard/focus boundaries. Full standalone delivery-mode coverage reduces changed-code failures from
93 in 44 source files to 87 in 39; the five targeted files clear. One selected browser case passes
in Chromium, Firefox and WebKit with native value/focus controls and no retry or skip. Owner 0006
and full-program ticket 0033 retain the remaining coverage and package blockers.

The full `npm run check` report `2026-09-23T16-37-46-727Z-28545/report.json` starts and ends on
matching 933-file fingerprint `49226d997b79b2ac335a31c475aa820eb04c223570d72c1ef5407182e0b74274`.
Format, 4,962 units, property, static, self-hosted, release and all 1,705 browser cases pass, with
559 per desktop engine and no failure, flake or skip. Coverage still fails 87 changed-code checks
across 39 of 60 changed source files. Packed bytes (3,417,336), Mobile UMD (559,527) and installed
root bundle (636,018) exceed fixed limits; package-budget isolation is the sole failed detector
control among sixteen. No delivery receipt follows.

The focused Clipboard write, floating ownership and Pagination tests cover owner cancellation at
host callbacks, floating handoff/reentrant reconciliation and named actions receiving an element.
The three-file selection passes 128 tests. A full standalone `npm run test:coverage` run reduces
changed-code failures from 96 in 47 source files to 93 in 44; these three files now clear. The other
changed-source coverage failures remain delivery blockers, and the fixed global floors and threshold
ratchet are unchanged. The owner ticket is 0006 and the full-program ticket is 0033.

The corrected full `npm run check` report `2026-09-23T15-12-21-834Z-21004/report.json` binds these
tests to a matching 933-file fingerprint
`351d1d9da3efe73ae7446a8ddcc83bd85ff094214856e698d3fd32df37ae2627`. Format, 4,942 units, property,
static, self-hosted, release and all 1,702 browser cases pass; each desktop engine passes 558 cases
without failure, flake or skip. Coverage still fails 93 changed-code checks across 44 of 60 changed
source files. Packed bytes (3,416,696), Mobile UMD (559,623) and installed root bundle (636,122)
exceed fixed limits; package-budget isolation is the only failed detector control among sixteen. No
delivery receipt follows.

The opt-in actual-host UI test in `e2e/interoperability-ui-lifecycle.spec.ts` runs four pinned
Turbo/htmx versions under Chromium, Firefox and WebKit. It observes Countdown timer release at the
native outgoing removal call, incoming server-rendered enhancement and preserved neighbor identity.
The selected twelve cases and existing 30-case host baseline pass on a fresh build; saved no-bridge
negatives fail the timing assertion while host rendering succeeds. This is the first resource-family
host proof, not the complete UI/generic/Datastar coexistence matrix. The matching 928-file
`npm run check` report `2026-09-23T05-27-52-448Z-6211/report.json` passes all 1,654 eight-project
browser cases with no skips or flakes, but fails inherited changed-code coverage, three fixed
package-size limits and package-budget detector isolation. It issues no delivery receipt.

The second opt-in actual-host test, `e2e/interoperability-ui-scroller.spec.ts`, checks Message
Scroller observer disconnect and viewport/button listener release at native Turbo/htmx removal. It
also checks no detached events, new incoming resources/events and preserved neighbor identity. Its
twelve cases pass across the two pinned versions of both hosts and three desktop engines; the
combined baseline, Countdown and Message Scroller selection passes 54 cases. Saved no-bridge
diagnostics fail the exact resource timing assertion. The matching 929-file fast report passes all
gates and 4,927 units. `npm run check` report `2026-09-23T06-22-37-775Z-4099/report.json` passes all
1,666 eight-project browser cases, 546 per desktop engine, with no failures, skips or flakes. It
remains red on 96 inherited changed-code coverage failures, three fixed package-size limits and
package-budget detector isolation. It issues no delivery receipt. The two actual-host UI specs now
require the instrumented native method itself to change the old root from connected to detached. The
54-case combined selection and a separate twelve-case Countdown rerun pass after that test-only
hardening. The tightened snapshot's `npm run check` report
`2026-09-23T07-05-16-938Z-98065/report.json` passes all 1,666 browser cases with no failures, skips
or flakes. The unchanged coverage, fixed package-size and package-budget detector gates remain red;
there is no delivery receipt.

The third opt-in actual-host test, `e2e/interoperability-ui-pointer.spec.ts`, keeps a trusted
Resizable drag active through real Turbo and htmx replacement. It verifies the outgoing three window
pointer listeners and actual capture release before the native call disconnects the old root, then
checks no detached mutation and a working new trusted drag on the incoming root. It also checks
preserved neighbor identity and input value. All twelve pinned host/version/engine cases and the
66-case combined baseline/UI selection pass without retries, skips or flakes. Saved no-bridge
diagnostics for one version of each host render successfully but fail the cleanup timing assertion.
The matching 930-file `npm run check` report `2026-09-23T08-11-31-064Z-12902/report.json` passes all
1,678 browser cases across eight projects, 550 per desktop engine. It still fails 96 inherited
changed-code coverage checks, three fixed package sizes and package-budget detector isolation, so
there is no delivery receipt. Other asynchronous UI families and generic JSON/HTML and SDK SSE host
paths remained open at that checkpoint.

The opt-in actual-host backend selection in `e2e/interoperability-backend.spec.ts` runs declarative
`core.generic` JSON/HTML and official-SDK Datastar SSE requests before and after real Turbo/htmx
replacement. It checks wire headers and signal query, patched signals and HTML, active inserted
directives, one lifecycle completion per action, outgoing destruction before native detachment,
incoming enhancement, and preserved neighbor identity/value. All twelve cases pass across pinned
host versions and Chromium, Firefox and WebKit; the combined host selection passes 78. Two saved
no-bridge Chromium diagnostics render successfully but fail the before-removal ownership assertion.
A first Turbo probe also found duplicate directive handling when an outer application and the
backend child were both started. `test/declarative-nested-application.test.ts` now checks both boot
orders, later insertion, child signal and directive updates, native movement, preserved patch,
ordinary removal, outer destruction, page-wide boot and the named component control. The backend
spec keeps its twelve single-app cases and adds twelve `nested=1` cases, all passing across the
three desktop engines. They check outer state isolation and child request/action ownership through
real host replacement. Two `nested=1` no-bridge Chromium diagnostics render the host result but
leave the outgoing child live after native removal. The earlier matching 931-file `npm run check`
report `2026-09-23T12-24-53-903Z-32528/report.json` passes all 1,690 browser cases across eight
projects, 554 per desktop engine, with no failures, flakes or skips. It still fails 96 changed-code
checks, three fixed package-size limits and package-budget detector isolation; no delivery receipt
follows. Cancellation/error combinations and the complete common matrix remain open.

The subsequent 932-file delivery report `2026-09-23T13-35-36-553Z-47216/report.json` has matching
start/end fingerprint `eb2d4ad1d3e82795c5638312de882c20f67f24bdf1d264949c0aea4e2073cb83`. It passes
4,933 units and 1,702 browser cases across eight projects, 558 per desktop engine, with no browser
failure, flake or skip. Coverage reports 96 changed-code failures across 47 of 60 changed source
files, though `src/declarative.ts` has no uncovered changed executable line or function. Packed
bytes (3,416,436), Mobile UMD (559,623) and installed root bundle (636,122) exceed fixed limits;
package-budget detector isolation fails among fifteen passing controls. No receipt follows.

Run `node test/document-retention-browser.mjs` from the repository root for the bounded Chromium
retention check. It reuses the browser ownership fixtures for all 50 UI families, plus all six
ownership modes in nine active-record families, and adds 39 core-only idle, application, plugin
listener, document listener and observer exercises. After disposal it requires all 247 captured
frame Documents and a weakly referenced control to collect within twelve explicit CDP GC cycles; a
held control must survive. All 143 fixture behavior controls must pass. The test uses an ephemeral
loopback Vite server and restores instrumentation before exit. It measures those source-fixture
paths in Chromium; other browser heaps, cross-plugin application combinations and long-run memory
behavior need separate evidence. Saved injected-retention negatives prove that one held UI or core
Document makes the check fail.

The expanded test passes four consecutive runs with all 247 Documents collected on the first GC. The
matching 927-file tree passes fast and the eight-project delivery browser matrix (1,642 cases, zero
failures, flakes or skips). `npm run check` still fails changed-code coverage, fixed package size
limits and the package-budget detector isolation control; this heap check is bounded evidence, not a
delivery receipt.

The Menubar selector regression in `test/ui-menubar-selector.test.ts` covers local values beginning
with `#`, two-argument class targets, one-argument external targets, an unrelated earlier selector
match and invalid, child-Menu and foreign-document targets. Its saved pre-correction run has four
failures and one passing compatibility control. A follow-up negative confirms that a missing target
in a two-argument local action must fail. The real-browser document fixture checks exact value,
explicit action and facade selection, native popup state and focus in Chromium, Firefox and WebKit.
The owning `test/ui-menubar.test.ts` suite also checks that an outside press preserves the focused
top-level trigger's tab stop when another menu closes, and that opening a child through the Menu API
updates the tab stop. Its focused frozen-source mutation rerun killed six of nine original survivors
on the menu-event synchronization line; the other three remain open for review. Focused
Menubar/Menu/document tests and the complete gates remain separate evidence layers. The bounded
Menubar checkpoint passes 4,927 units, all six fast/23 static gates, 1,248 complete
document/component browser cases and 30 actual Turbo/htmx baseline cases on one source fingerprint.
The isolated build verifies all entries and source maps; twelve API reports match their baselines.
Fixed package-size budgets, the full host matrix and delivery still require passing evidence. The
later package delivery run verifies installed module, type, QUnit and browser consumers, while
failing fixed packed, UMD-reference and root-bundle checks. The first delivery browser gate is
blocked before tests by orphaned fixture ports; after cleanup the standalone eight-project browser
quality run passes 1,642 cases on the same documented-tree fingerprint. Changed-code coverage still
fails across the inherited dirty scope, so neither independent result is a delivery receipt.

Vitest and coverage-v8 use the same pinned 4.1.11 version. Coverage runs keep the explicit
production-census include/exclude patterns so unimported production files remain in the denominator.
The optional coverage diagnostic checks that roster, raw hit maps and executed test evidence; its
recorded thresholds are no longer release scores. Test, property and coverage configurations retain
the two-worker default. The Vitest 4 migration removes obsolete `minWorkers` and `coverage.all`
settings without narrowing these checks.

Changed function headers absent from V8 statement maps require positive function hits and positive
default-argument hits where applicable. Function hits cannot cover an unmapped body statement or
override a zero statement counter. An isolated identifier declaration without an initializer is
recorded explicitly when V8 omits it; executable initializers and adjacent statements still require
coverage. Positive and failing detector fixtures verify these rules.

Persistence lifecycle tests include adapter reads that synchronously deliver a newer revision or
invoke missing/expired-data recovery during repair. They compare stored bytes, live values, status,
write counts and disposal identity to prevent stale repair writes and resurrection after recovery.

## Offline package doctor

`test/doctor.test.mjs` exercises npm, pnpm, and Yarn metadata resolution, workspaces, aliases,
incompatible direct versus separate transitive packages, bounded scans, schemas, and output privacy.
`test/doctor-migrations.test.mjs` covers dry runs, atomic apply, repeat no-ops, exact rollback,
permission/identity/content drift, symlinks, concurrent writers, and failures around file creation
and replacement. Signal tests exercise the same interruption handlers without terminating Vitest.
The two doctor properties retain 100 generated cases; the durable filesystem round trip has a
30-second test timeout because it includes actual file and directory flushes.

`test/doctor-consumer.test.mjs` runs the real CLI with preload guards that reject network calls,
child processes, and writes in read-only modes. Positive controls prove those guards reject each
forbidden effect. Metadata and application-file snapshots independently prove no writes. The package
gate copies that same fixture into an isolated tarball consumer and executes its installed CLI.
`test/doctor-contract.test.mjs` checks rule provenance, schemas, support/entrypoint agreement, and
negative controls for stale digests, ranges, exports, duplicate codes, and documentation links. The
static JSON gate also validates the shipped rule manifest and its authority hashes.

## Evidence layers

| Layer              | Location                          | Proves                                                                   |
| ------------------ | --------------------------------- | ------------------------------------------------------------------------ |
| Unit               | `test/ui-*.test.ts`               | Controller state, events, validation, and DOM contracts.                 |
| Block integration  | `test/*-block.test.ts`            | Block actions consume official SDK events and survive patches.           |
| Server integration | `test/server.test.ts`             | HTTP methods, validation, response content, SSE fields, and headers.     |
| Browser behavior   | `e2e/components.spec.ts`          | Real focus, keyboard, layout, network, and patch enhancement.            |
| Accessibility      | `e2e/components.spec.ts` with axe | Automated violations in relevant closed/open/updated states.             |
| Deployment smoke   | `scripts/smoke-*.mjs`             | Built artifacts, standalone routes, service files, and package contents. |

## Required workflow

Run focused tests while coding. Before a ticket leaves Code, run:

```sh
npm run quality:fast
```

Before a ticket moves to Document, run:

```sh
npm run quality:delivery
```

Record commands and exact results in the ticket. A green unit test does not prove browser focus,
responsive layout, SDK streaming, or deployment behavior. Use the layer that observes the claimed
behavior. `npm run check` remains a compatibility alias for the delivery gate. Release candidates
also run `npm run quality:full-audit`.

Phase validation reads the full report contract rather than trusting a copied status string. Code
closure requires a current fast report; Test closure requires the exact current delivery report and
receipt. After documentation and the `done` status are recorded, rerun delivery because those edits
invalidate the earlier receipt. Acceptance criteria use stable `[AC-NN]` IDs and exactly one
matching evidence row each.

## Website route coverage

`test/site-structure.test.mjs` enumerates the actual `example/**/index.html` pages and compares that
census with Vite's build entries, the public source-test roster, and the documentation browser
roster. It rejects an omitted or duplicated route and requires the shared entry script on each
public guide. The Component Lab has its own explicit entry and remains part of the build census.

`e2e/site.spec.ts` directly loads every documentation page in Chromium, Firefox, and WebKit. Each
route must show its heading and current navigation, switch theme, search for a component, and open
and close mobile navigation with focus restored. Adding a guide requires extending these rosters; a
build entry alone does not provide behavioral coverage.

The source checks also compare the homepage and download candidate statements with `package.json`
and the release contract. The generated home record must state the same version as its corpus
metadata. The browser home proof observes the visible candidate badge.

## Agent corpus and WebMCP

`test/agent-content.test.mjs` rebuilds the corpus twice, checks every generated byte, compares
package and registry metadata, enforces size and provenance limits, and runs the checked-in
retrieval evaluations. `test/webmcp.test.ts` checks the five schemas, annotations, stable envelopes,
citations, runtime validation, cancellation, prompt-shaped input, repeat registration, rollback, and
unsupported-browser no-op behavior.

`e2e/fixtures/webmcp-harness.ts` supplies the draft `document.modelContext.registerTool` boundary in
routine Chromium, Firefox, and WebKit CI. `e2e/site.spec.ts` verifies registration on every public
route and invokes source-backed tools in the page. This is a standards-shaped harness, not evidence
that those browser builds ship WebMCP. Native-support evidence must name the supporting browser or
standards test build separately; unsupported and JavaScript-disabled projects must remain green.

`npm run test:webmcp:native` launches the pinned Chromium with its WebMCP experimental feature, uses
the browser's real `getTools()` and `executeTool()` implementation, and does not install the CI
harness. It checks a secure origin-keyed page, the complete registered catalog, and a cited
component result. Keep the minimum version aligned with Chromium's documented developer-trial
milestone.

Deployment smoke checks inspect the root build, `/jqstar/` base-path build, loose server, packaged
archive, MIME types, GET and HEAD behavior, and npm package inclusion for the guide, both text
files, and JSON index. Regenerate the corpus before running any of these checks so a stale artifact
fails at the source boundary.

## jQuery ecosystem evidence

`quality/jquery-ecosystem.json` is the dated, schema-validated record for jQuery Core, Migrate, UI,
Mobile, Sizzle, and QUnit. `test/jquery-ecosystem-contract.test.ts` checks the sole jQuery peer,
exact installed QUnit consumer, absence of legacy runtimes and standalone Sizzle, complete policy
catalog for jQuery UI, product naming, trademark-review surfaces, and downstream ticket digests. The
record expires on 2027-03-03 and fails closed after that date. Refresh primary sources and every
downstream digest before extending the expiry. See [JQUERY_ECOSYSTEM.md](JQUERY_ECOSYSTEM.md) for
the human-readable decisions.

## jQuery UI migration evidence

`quality/jquery-ui-migration.json` maps 72 unique official jQuery UI 1.14 API URLs exactly once,
records the four migration classes, pins jQuery 4.0.0 and UI 1.14.2, compares project-editor and
command-toolbar slices, and applies the frozen no-adapter scorecard. Its unit test verifies the
source-matrix digest, schema, installed asset sizes, lockfile classification, counterpart paths,
measurement calculations, and forbidden production imports. Its property test permutes the full
inventory and generates missing, duplicate, and unknown assignments.

`e2e/jquery-ui-migration.spec.ts` loads the real installed UI runtime/base theme beside packaged
jQStar output. Chromium, Firefox, and WebKit cover disjoint data, events, focus, dialog, tabs,
autocomplete, sort, forms, explicit destroy, server replacement, sibling identity, and separate
documents. Mobile touch, reduced motion, forced colors, and JavaScript-disabled projects cover the
fallback paths. The suite records four inherited serious/critical axe rules across seven legacy
nodes and requires zero such findings in native and partially migrated islands.

Package quality rejects jQuery UI from runtime dependency fields, packed paths, the clean consumer
tree, and every entry graph. The root checkout keeps `jquery-ui@1.14.2` only as an exact development
fixture. See [JQUERY_UI_MIGRATION.md](JQUERY_UI_MIGRATION.md) for the migration and rollback steps.

## jQuery Mobile migration evidence

`quality/jquery-mobile-migration.json` records the exact ticket-0038 digest, archived package
identity, 95 official API URLs, 60 unique data attributes and 122 contexts, ten transitions, extra
behaviors, nine modern owners, bridge outcomes, two application worksheets, exact reference-app
measurements, and the no-runtime result. Contract tests validate its closed schema, one-to-one
assignments, package/lock/install/source absence, official-SDK generation, fixture measurements, and
package-quality assertions. Property tests permute assignments and generate missing, duplicate, and
unknown values.

`e2e/jquery-mobile-migration.spec.ts` runs four shared scenarios in Chromium, Firefox, and WebKit,
plus mobile/zoom, reduced-motion, forced-colors, and JavaScript-disabled scenarios. The 16
executions cover direct routes and reloads, GET search/local filtering, native dialog and tabs,
official-SDK status patching, validation, submitter override, conflict, redirect, multipart file,
history/scroll/focus, pointer cancellation and one activation, touch targets, orientation, 200% text
with 200% zoom, slow/error documents, offline messaging, and axe.

Package quality rejects jQuery Mobile from every dependency field, packed runtime/theme/icon/source
path, clean consumer tree, and root/core/testing/CSP/Datastar/Turbo/htmx graph. Unlike the UI
migration fixture, the archived package is never installed or executed. See
[JQUERY_MOBILE_MIGRATION.md](JQUERY_MOBILE_MIGRATION.md) for the triage, migration, and rollback
steps.

## Self-hosted database recovery

`test/self-hosting-recovery.test.mjs` executes the backup and restore shell blocks from
`docs/SELF_HOSTING.md` against temporary SQLite files. It verifies backup contents, clean and abrupt
shutdown recovery, exact failed-state preservation, optional sidecars, unique archives, directory
and restored-file modes, and failure before restart. The backup directory must name the service
owner/group, and an absent backup must fail before the service stops. Service, account and HTTP
commands are isolated substitutes; SQLite backup, shell error handling and file operations run for
real. These tests do not establish a Linux systemd deployment or change a production database.

## Coverage and generated inputs

The production denominator is `quality/production-census.json`, not a broad source glob. Run its
fail-closed classification check directly with:

```sh
npm run quality:census
npm run test:coverage
```

Coverage includes unexecuted runtime, server, and executable registry modules. Declarations and
type-only modules are checked semantically; process entrypoints, templates, styles, CLI, deployment,
and automation map to their named package, browser, self-hosted, schema, or static evidence. The
committed global and subsystem floors are historical diagnostic references. Changed executable line
and function misses are reported for investigation, without a 100% delivery gate. Changed source
lines can have runtime coverage, module-linkage evidence, or type/format classification.
Requirement-to-test mappings are checked against Vitest's machine report and must identify exactly
one executed passing test.

Both the raw-hit and per-file summary rosters must exactly match every census file classified for
coverage, even with no changed source files. Missing, unexpected or duplicate normalized paths and
an empty expected roster fail. The report records all three path lists. Handwritten negative
controls remove an unchanged file from either report, add an excluded file or alias, and reject
passing report envelopes without a successful roster check. The final program audit retains its
independent source, counter and summary validation.

The census compiles each covered or explicitly type-only TypeScript module to check its runtime
classification. A covered module that emits no runtime JavaScript fails, as does a type-only
exclusion that gains an executable export or side-effect import. Comments are ignored for this
classification; declaration files are never treated as executable input. The type-only paths retain
`typecheck` evidence, and the source-census test compares every configured coverage include/exclude
with its declared classification. Synthetic empty-report counters are not executable coverage.

Delivery properties use a stable seed; audit properties generate and report a new seed:

```sh
npm run test:property
npm run test:property:audit
```

`test-results/quality/property-gate.json` records the seed, run count, replay request, and any
shrunk counterexample for a standalone run. The audit uses `property-audit-gate.json`. Under the
canonical runner these records live in the run's `.git/jqstar/.../evidence/` directory. Promote
discovered counterexamples to `test/property/regressions.json` and retain a named regression test. A
replay names one known property and must be consumed by that property exactly once. An unknown ID,
unused replay path, or replay consumed by more than one property fails even if Vitest is green. All
property suites, including UI and Mobile migration inventories, use the shared helper so the
requested seed and run count appear in each property's evidence. Explicit per-property run-count
overrides are recorded separately from the command's requested count. Source policy rejects direct
`fc.assert` or `fc.check` calls in property test files that bypass that recorder.

Mutation testing is deliberately excluded from the repository and every normal quality mode. It may
be reconsidered only through an explicitly requested quality ticket.

## Expression-engine conformance

`test/expression-engine-conformance.ts` is the shared engine matrix. Its six stable cases cover
values and statements, `$` and `$name`, every authored context family, real jQuery calls, committed
plugin helpers with fixed-binding protection, named actions with arguments, asynchronous values and
statements, and structured compile, synchronous, and asynchronous errors with source locations. The
trusted JavaScript factory runs the complete matrix in `test/expression-engine.test.ts`.
`test/fixtures/csp/conformance-map.json` assigns every stable case an exact-parity or CSP-equivalent
downstream ID. `test/csp-contract.test.ts` validates that mapping and replays the finite positive
vectors through the trusted engine where exact parity is claimed. Tickets 0034 and 0035 must consume
those IDs rather than creating an unrelated evaluator contract.

Run the frozen grammar, schema, boundary, adversarial, public-inventory, and parity checks with:

```sh
npm run test:csp-contract
```

`npm run csp:inventory` rewrites the five generated corpus, context, and conformance artifacts after
an intentional public-source or contract change. A stale artifact is otherwise a test failure. The
combined digest printed by the validator identifies the complete versioned input set. Context IDs
are checked bidirectionally: every case reference must resolve and every recipe must be exercised.

The implementation proof lives in `test/csp-tokenizer.test.ts`, `test/csp-parser.test.ts`, and
`test/csp-engine.test.ts`. Those suites run every accepted program, every compile/evaluate
rejection, exact spans and one-past limits, immutable AST shape, capability transitions, hostile
accessors/proxies/thenables, async disposal, cache eviction, and real kernel lifecycle integration.
Inspection regressions also prove fixed jQuery arity/primitive arguments, non-invocation of
callback/conversion hooks and state setters, uniform inert-data classification, raw-result failure
ordering, cancellation liveness, and array boundaries: a two-digit index resolves while an
out-of-range negative `.at()` position cannot read an own `"-1"` property. Indexed state objects
remain writable, while `.at()` results from state and argument arrays remain read-only.
`test/property/csp.property.test.ts` adds seeded bounded UTF-16 parser totality, finite
arithmetic-model parity, and isolated signal-write properties. `e2e/csp-engine.spec.ts` runs the
engine and foreign-realm boundaries in Chromium, Firefox, and WebKit. The source-policy gate rejects
a CSP import of the trusted compiler or inline quality suppressions.

Package quality adds the public proof. It packs `jquery-star/csp`, resolves its ESM, CommonJS,
NodeNext, and Bundler contracts, then runs the complete frozen corpus through both installed code
formats. Parsed source and emitted graphs reject the trusted compiler and source-to-code constructs.
Negative canaries keep each detector live. A dedicated exact-tarball application receives one strict
response-header policy without `unsafe-eval` or inline script permission and runs in Chromium,
Firefox, and WebKit. It covers declarative state and computed values, actions and helpers, jQuery,
UI, generic JSON/HTML, official-SDK Datastar patches, cancellation, errors, replacement, axe, native
no-JavaScript controls, early policy events and reports, and exact disposal. Its bounded report
binds package, grammar, corpus, source, tarball, bundle, browser, and header identity.

Each engine also executes reduced-motion, forced-colors, and zoom/reflow profiles against that same
installed proof. The profiles require direct computed output `2 → 4 → 16`, keyboard activation,
focus and pressed-state behavior, two independently owned applications, repeated enhancement,
unchanged headers, zero handled runtime errors, and complete cleanup. The jQuery error listener
attaches before installation; a separate browser control emits an error at that point and proves
that the listener and refusal check detect it. The closed report requires every profile and rejects
missing observations, duplicate profiles, wrong computed values, layout overflow, and retained
resources.

The no-JavaScript proof follows the native link and submits the GET form to real 200 responses. It
checks the escaped submitted value, response policy, and absence of script requests. Named outputs
and the Run server update and cleanup button support the separate CSP steps in both
[assistive-technology charters](accessibility/RELEASE_CHARTERS.md). These automated results do not
establish screen-reader behavior; the exact candidate still needs both real manual records.

After a current passing delivery, `npm run proof:csp` starts the same strict-policy routes and
snapshotted assets for manual testing. It requires the exact tested tarball checksum and retains the
artifact, receipt, package report and asset-hash session record under `.git/jqstar/manual-csp/`.
This command neither substitutes source imports for the tarball nor creates passing manual records.

Focused kernel and installer tests prove that an engine object belongs to only one kernel, public
cache clearing does not touch the compatibility engine, and disposal runs once and invalidates both
new compilation and retained evaluators. API Extractor and the public-baseline suite review the
factory, installer option, evaluator, location, and error types.

## Plugin transaction conformance

`test/plugin.test.ts`, `test/registry.test.ts`, and `test/directive.test.ts` cover stable version
ranges, manifest validation, dependency and ordering graphs, deterministic ties,
missing/incompatible dependencies, cycles, reserved and overlapping namespaces,
action/directive/helper collisions, matcher and helper-path validation, typed facades, object
identity, registrar closure, reentrancy, asynchronous-installer rejection, atomic publication,
reverse rollback, and aggregated cleanup failures.

Kernel and installed-runtime tests cover structural lock timing, both application modes, pre-commit
hook failure, hook-triggered destruction, explicit destruction, patch removal, failed application
destruction, kernel disposal, exact-once cleanup, legacy action replacement, and claimed-namespace
protection. `test/directive-application.test.ts` covers priority, helper resolution, parsing,
mount/update/remount, invalid capability use, owned effects/tasks, direct and Idiomorph replacement,
failure aggregation, and exact-once cleanup. `test/property/plugin.property.test.ts` generates caret
boundaries, dependency chains/cycles, matcher overlaps, and helper-path overlaps under the recorded
seed/replay contract. Plugin, directive, kernel, registry and runtime changes use browser or focused
direct evidence for their observable contracts; coverage misses remain optional diagnostics.

Directive rollback regressions use public core/plugin/application calls for failed task factories,
destruction during mount/update/effect/task callbacks, registered and returned cleanup, stopped
descendant enhancement, retained capabilities and late rejection after kernel disposal. An explicit
test capability wrapper also destroys the owner while kernel task registration returns, verifying
detachment, error preservation and an empty task barrier even when the returned release throws.

The same public plugin/application fixture checks built-in `data-effect`, `data-show` and model
binding initialization. If an initial expression or native model-write handler destroys its owner,
subsequent state changes cannot rerun the effect and native input cannot update destroyed state.
Active controls retain ordinary reactivity and input handling; the registered `data-text` control
uses the existing directive cleanup path.

Package quality resolves the plugin API value and public plugin/directive/helper types from ESM,
CommonJS, QUnit, NodeNext, and Bundler consumers. Those consumers register a helper and directive,
render through the shipped expression engine, and prove cleanup. Installed module and UMD pages run
the same contract before destroying an application in Chromium, Firefox, and WebKit. API Extractor,
the exact public baseline/schema, raw bundle ceilings, and the immutable budget ratchet remain
blocking.

## Operation-observation conformance

`test/observation.test.ts` covers action results and exact thrown-value identity, behavior and
attribute applications, kernel and application scopes, stable delivery snapshots, idempotent
unsubscribe, observer failure containment, retries, progress, direct root requests, parent IDs,
sensitive-field omission, and cancellation propagation. `test/plugin.test.ts` proves observer
transaction commit, rollback, and disposal. `test/kernel.test.ts` checks subscription owners in the
resource ledger.

`test/property/observation.property.test.ts` generates successful and failed action sequences plus
request progress and terminal sequences. It requires one start and one terminal record under one
identity, frozen JSON round trips, ignored duplicate terminals, and query/fragment omission under
the recorded seed/replay contract. Existing fetch, runtime, declarative, expression, Datastar, and
public-baseline tests remain the compatibility proof for legacy event ordering and live payloads.

## Request-middleware conformance

`test/request-middleware.test.ts` covers plugin-qualified deterministic order, invalid and cyclic
constraints, transactional commit/rollback/cleanup, recursively frozen descriptors, detached
callback receivers, guarded duplicate and late `next()` calls, exact downstream outcome identity,
branded short-circuit/cancellation, hostile thrown values, abort detachment, final request policy,
and malformed metadata. It requires no dispatch after a rejected descriptor or stale outcome.

`test/request-middleware-integration.test.ts` runs a real kernel, plugin, declarative application,
operation observer, and fetch boundary. It proves one middleware invocation and one operation ID
across retry, reuse of the validated URL/header/private body, distinct short-circuit/cancellation/
failure terminals, pending/error cleanup, application-owned abort, blocked late dispatch, and kernel
disposal. `test/plugin.test.ts` covers atomic publication and reverse cleanup; `test/fetch.test.ts`
retains URL-encoded, multipart, and completed-response retry compatibility.

`test/request-lifecycle.test.ts` exercises public core applications in both modes. It proves shared
controller cleanup after a sibling succeeds or fails, application/kernel teardown, caller abort and
independent roots with distinct controllers. `test/runtime.test.ts` checks debounce ownership after
replacement, firing, reentrant scheduling and destruction, including release before action
execution.

`test/property/request-middleware.property.test.ts` generates acyclic constraint graphs and
descriptor edit/short-circuit sequences under the normal seed/replay contract. Every generated edge
must be honored, dispatch happens at most once, and cleanup removes all definitions. Changed-line
coverage diagnostics record missed executable lines and functions without a delivery target.

Package quality compiles and executes request middleware through installed ESM, CommonJS, QUnit,
TypeScript NodeNext/Bundler, module-browser, and UMD-browser consumers. Those cases use only the
root package and check the public errors and operation identity. Browser consumers execute in
Chromium, Firefox, and WebKit. API Extractor and the exact public baseline review every descriptor,
outcome, callback, registrar, and error declaration. Mutation testing remains excluded.

## Protocol-profile conformance

`test/protocol.test.ts` covers official and external profile registration, plugin namespace and
reserved-ID rules, equal and distinct exact/suffix matcher overlap in both orders, atomic
commit/rollback/disposal, frozen request input, default-profile restoration and stale-cleanup
isolation, the bounded writer, generic and Datastar request bytes, deterministic response selection,
empty responses, exactly one text or stream claim, progress, cancellation, abort detachment, closed
late capabilities, and zero active body owners after every terminal path.

`test/protocol-datastar.test.ts` runs real kernels and attribute applications in separate document
realms. It proves the generic profile has no Datastar header, query, implicit state, SSE preference,
response-hint behavior, event, or event interpretation. It also proves Datastar CRLF/LF parsing,
split UTF-8, comments, multiline data, IDs, retry fields, unknown events, incremental signal and
element patches, failure after a committed patch, application-owned abort, one terminal operation,
and a plugin profile reaching the same middleware descriptor and operation ID.

`test/property/protocol.property.test.ts` generates method/parameter/payload matrices, exact/suffix
overlaps, body-claim sequences, and arbitrary byte boundaries under the normal replay contract.
Existing `test/fetch.test.ts`, `test/sse.test.ts`, and `test/datastar-sdk.test.ts` freeze the root
Datastar bytes, legacy events, parser utilities, and official SDK interoperability. The proof server
continues to generate Datastar SSE only through `@starfederation/datastar-sdk`.

Package quality selects `core.generic` and `core.datastar` from the installed root tarball in ESM,
CommonJS, QUnit, module and UMD browsers, and the TypeScript NodeNext/Bundler declarations. It
checks that generic requests contain no Datastar bytes, Datastar requests retain them, all three
public protocol error classes resolve, and plugin profile types compile. Chromium, Firefox, and
WebKit run the installed browser cases. Mutation testing is not part of this evidence.

## Modular, render, and disposal conformance

`test/modular-entrypoints.test.ts` proves import purity, explicit core identity, generic-only core,
official Datastar/UI composition, failed UI rollback, reserved jQuery UI names, and independent UI
installation in two document realms. API Extractor reviews root, core, UI, and Datastar separately;
the modular type consumers prove that importing core types does not augment unrelated jQuery.

## Shared-store conformance

`test/stores.test.ts` covers import/install identity, descriptor-safe cloning, definition ownership,
late namespace reactivity, ordinary method receivers, atomic transactions, subscription batching,
setup rollback, value-free observations, terminal disposal, and `$store` separation. The same suite
mounts behavior and declarative roots against trusted and CSP engines, defines their common store
after mount, destroys one root, and verifies that the sibling and store remain active.

`test/stores-lifecycle.test.ts` covers disposal during initial effects, selectors, listeners, tasks
and value factories, synchronous setup abort, retained-context refusal, immediate late cleanup,
ownership failures, reverse rollback, sibling isolation and normal idempotent disposal. The initial
16-case run reproduced 13 failures against the original source. Its expanded controls also cover
lifetime transfer failure, disposal triggered by operation observation, recursive name/definition
reservation, retry and transaction interruption.

`test/property/stores.property.test.ts` generates bounded graphs and transaction rollback values
under the standard replay contract. Accepted graphs clone without changing caller input. Generated
reserved fields at any depth must reject without publishing a store name or changing that input. The
generator remains unfiltered; a retained counterexample and a nested rejection property cover all
twelve reserved fields. `e2e/stores.spec.ts` repeats the two-root lifecycle in real Chromium,
Firefox, and WebKit realms with live-region output. Package quality resolves ESM, CommonJS,
NodeNext, and Bundler declarations, runs installed consumers, and records the optional store graph's
raw and gzip sizes while proving store code remains absent from every earlier entry.

`test/render-adapter.test.ts` covers wrong-document/disconnected inputs, marked and caller-supplied
preservation, repeated/overlapping removal boundaries, deepest-first exact-once teardown, incoming
boot, mutation failure, missing promised roots, focus/value/handler/state identity, terminal reuse,
and disposal of an abandoned operation. `test/property/render-adapter.property.test.ts` runs 100
generated nested-boundary/preservation/terminal sequences under the standard replay contract. The
shared Playwright proof repeats retained identity, state, value, focus, handler, outgoing cleanup,
and incoming boot in Chromium, Firefox, and WebKit.

Kernel and modular tests cover successful, repeated, recursive, partially failing, and reinstalled
disposal. They require one frozen JSON-safe report, the same memoized report/error identity, every
cleanup attempt, no remaining ownership, and typed aggregate failure. Mutation testing is not part
of this ticket or the default workflow.

## External navigation baseline

`quality/external-bridge-contract.json` is the schema-validated Turbo and htmx compatibility
manifest. `test/external-render-contract.test.ts` checks its exact package aliases, tarballs,
integrity values, version policy, total mapping IDs, downstream assignments, public import boundary,
lifecycle transitions, overlap rejection, cleanup deduplication, failure settlement, preservation
matching, redaction, concurrent disposal, and a real public render-adapter commit.
`test/property/external-render-contract.property.test.ts` generates unique preservation matches and
disjoint terminal operation sequences. `test/property/turbo-bridge.property.test.ts` generates
bounded no-mutation traces and disjoint Frame completion orders.
`test/property/htmx-bridge.property.test.ts` generates bounded request-only traces and disjoint
mutation completion orders against the shipped htmx bridge.

`e2e/interoperability-baseline.spec.ts` uses the actual Turbo 8.0.21/8.0.23 and htmx 2.0.0/2.0.10
packages through a same-origin progressive server fixture. The desktop Chromium, Firefox, and WebKit
projects each run both version boundaries. The suite covers native JavaScript-disabled links and
forms, Turbo document/Frame/form/history/cache/cancel/no-content/error paths, and htmx
inner/outer/delete/adjacent/out-of-band/none/boost/history/form/cancel/no-content/error paths.
Semantic records contain event categories and relative order only. They exclude URLs, content, form
data, response data, DOM objects, and timing.

The Turbo and htmx cases install their matching jQStar bridge for both supported boundary packages.
They prove that jQStar adds one ownership transaction per real mutation without changing host
requests, mutation, history, forms, focus, or JavaScript-disabled behavior. The htmx bridge cases
also prove inner, outer, delete, adjacent, out-of-band, none, boost, history, cancellation, failure,
preservation, repeated enhancement, and disposal behavior. See
[`INTEROPERABILITY.md`](INTEROPERABILITY.md) for the event mappings and version-update process.

## Published harness and conformance

`jquery-star/testing` is a stable, side-effect-free ESM/CommonJS entry for package consumers. It
imports no DOM implementation or runner and does no import-time document, jQuery, fetch, listener,
observer, plugin, or suite work. The caller supplies one Window/Document realm and its jQuery peer.
`assertStarDOMRealm()` rejects mixed ownership. `withStarDOMRealm()` is an optional process-wide
lease for packages that require ambient browser constructors; it snapshots only `STAR_DOM_GLOBALS`,
rejects overlap before mutation, attempts every reverse restoration, and preserves callback and
cleanup failures. A failed deletion of an originally absent property counts as a restoration
failure. If caller code makes an installed global non-configurable, the lease reports that failure
after restoring the other globals and releases its process lease.

`createStarHarness()` creates an explicit core installation and exposes only public applications,
state, operation snapshots, native/jQuery event triggering, plugin installation, finite task
registration, bounded settling, root destruction, and terminal disposal. Setup failure disposes a
partially claimed core and restores fetch. Disposal remains idempotent after success or failure and
consumes only the public `StarDisposalReport`; it does not inspect kernel collections.

`flush({ maxRounds, timeoutMs })` waits for the public enhancement barrier, queued fixture
deliveries, and finite harness tasks, including transitive registered work. It never claims to drain
arbitrary timers, animation loops, third-party promises, or real-network work. A `StarFlushError`
carries a JSON-safe diagnostic containing rounds, elapsed time, and only owned
operation/request/task IDs and stable owners. Do not put state, markup, headers, bodies, callbacks,
or DOM nodes into task owners.

When enhancement or response settlement rejects during deadline waiting, the harness preserves an
existing Error object. Other rejection values are wrapped in an Error with the original cause.

`createResponseController()` consumes exact FIFO expectations with no passthrough. Unit and
installed-package cases cover JSON, HTML, empty, HTTP error, network error, delay, retry, abort,
method/URL/header/body capture, mismatch, unexpected calls, leftover expectations, setup failure,
and exact fetch descriptor restoration. Explicit release and controller disposal report a failed
removal of an originally absent `fetch` property; disposal still attempts every other target. Abort
and delayed fixtures remove their own signal listeners on cancellation, including controller
disposal, without aborting caller signals or removing caller listeners. A failed timer cancellation
still rejects the request with `AbortError`, prevents later fixture delivery and reports the timer
failure after attempting sibling cleanup. Native signal inspection and nested-delay regressions
cover those ownership paths. `jquery-star/datastar/testing` remains separate and uses the official
SDK for valid success, ordered multi-event, chunked, retry, failure, and abort streams; only fixed
inert malformed bytes are written directly.

`runCoreConformance()` and `runPluginConformance()` own runner-neutral named cases and immutable
reports. The latter covers repeated facade identity, exercise/use, failed-install rollback,
idempotent disposal, and public failed-cleanup reporting. The same exported functions and separately
packed external plugin run in Vitest, a plain installed Node DOM consumer, installed QUnit, and
Chromium/Firefox/WebKit. The mock-navigation package separately consumes only the public render
adapter and proves outgoing cleanup, `data-jqs-preserve` identity/value/focus, incoming boot, and
one correlated operation ID across success and failure.

Package quality additionally checks ESM, CommonJS, NodeNext, Bundler, export-map refusal, package
contents, publint, Are the Types Wrong, graph exclusions, sentinels, and raw/gzip budgets. Its Turbo
and htmx consumers install the optional peers, create the explicit bridges, and prove each host is
absent from its built bridge graph. Generic testing must not contain Datastar, DOM implementations,
test runners, or fixture packages; root, core, UI, Datastar, CSP, and testing consumers must not
contain Turbo or htmx bridge/host code.

The delivery-quality browser and package checks are stricter than the developer smoke commands:

```sh
npm run test:browser:quality
npm run test:package:quality
```

The browser command refuses an empty project selection and runs shared behavior in Chromium,
Firefox, and WebKit. Named projects cover mobile touch, reduced motion, forced colors, 200% zoom,
and JavaScript-disabled HTML. CI retries retain diagnostics, but `failOnFlakyTests` makes a test
that passes only on retry fail the gate. After retries, the first failed test stops that project so
a broken browser launch cannot restart once per selected test. Partial shards are refused until an
all-shard result aggregator exists.

`npm run test:e2e` prepares the self-hosted assets and both research fixtures before starting
Playwright. The browser quality runner and detector harness use the same preparation. Build and
installation failures stop execution and name the failed preparation step; they are outside the
unchanged 60-second HTTP readiness check. Quality selection and direct `npx playwright test --list`
do not build. For repeated direct `npx playwright test` invocations, first run
`node scripts/prepare-browser-fixtures.mjs` after source changes or a clean checkout. Each
preparation step has a ten-minute execution bound.

Mobile migration unit tests compare source-file bytes and lines without requiring a prior build. The
enforced package contents check compares the extracted UMD byte size with the reviewed Mobile
reference measurement, rejecting missing or mismatched artifacts.

Every browser project writes its test results, retained traces, and HTML report to a distinct
directory under `JQS_QUALITY_RUN_DIRECTORY`. The JSON report records those paths, the quality run
ID, seed, worker settings, selected and executed counts, pass/fail/flaky/skip counts, and execution
mode. A passing project must execute exactly `selectedTests * repeat` tests with zero failures,
flakes, or skips. Full audit sets `JQS_BROWSER_REPEAT_EACH` above one and uses a safe
`JQS_BROWSER_REPORT_NAME` basename so repeated evidence cannot overwrite the delivery report. The
canonical full audit uses this repeated browser matrix as its cross-engine stability proof.

Project execution allows 900 seconds per repetition, so the canonical repeated audit allows 1,800
seconds for twice the selected tests. The per-test and HTTP-readiness limits remain 60 seconds; the
outer repeated-browser gate remains 90 minutes. Isolated logs retain the configured process bound,
elapsed time, exit code, signal, and timeout flag. A timeout, signal, spawn failure, missing report,
or incomplete execution count fails the gate, including when a process reports exit zero.

The package command builds the self-hosted artifact, packs it, installs the tarball outside the
repository, and exercises root/core/UI/Datastar ESM, CommonJS, TypeScript NodeNext and Bundler
resolution, browser module and root UMD loading, QUnit, Vite bundling, the CLI registry, API
Extractor, publint, and Are the Types Wrong. The core consumer executes an application, generic
request, render transaction, explicit incoming boot, and public disposal while graph inspection
proves UI, Datastar, registry, server, and later optional modules are absent. The installed browser
consumers run in Chromium, Firefox, and WebKit. Each module and UMD page boots one declarative
application, reads its rendered state, disposes it, and records the engine version. The positive
Node consumers install jQuery 4. A separate strict consumer installs exact jQuery 3.7.1 from the
same tarball and exercises Node ESM and CommonJS plus module, UMD, and strict-CSP pages in Chromium,
Firefox, and WebKit. Its native-browser module page uses a test-only adapter for jQuery 3.7.1's
published UMD file. An isolated missing-peer consumer must fail to import `jquery-star`, and a
strict install with jQuery 3.7.0 must fail with npm's peer resolution error. The build step is
mandatory. Source-adjacent imports do not satisfy this check.

Each installed-package browser must launch within 30 seconds and finish its proof within 90 seconds.
Cleanup has a separate 5-second bound. A stalled engine is killed and reported by name so the
package gate cannot retain a browser until the outer quality timeout.

Before a release candidate, run:

```sh
npm run test:release:quality
npm run test:quality:0044
```

The release gate copies the source into two distinct workspaces. Each workspace runs its own
`npm ci`, build, and pack. The gate compares every packed file and the tarball checksum, enforces a
zero changed-file generated-output budget, emits a CycloneDX SBOM and production-license inventory,
records provenance eligibility and the installed Node/npm/TypeScript/Playwright/browser versions,
installs the result, and boots the packaged self-hosted server. It does not publish. The self-test
runs 16 exact detector and control checks covering selection, shard refusal, retry-passes,
accessibility, ownership, network handling, conditional browser promises, package budgets, API
drift, release reproducibility, and report contracts.

A detector control must finish normally: a red control requires a positive integer exit and a green
control requires zero. A signal, timeout, spawn error or missing exit makes the check fail even when
the expected diagnostic was printed. Focused process tests exercise actual successful, failed,
killed, timed-out and missing-executable children. The report schema also rejects passing records
whose exit contradicts the expected outcome.

Each release run owns one `jqstar-release-quality-*` directory under the operating-system temp root.
The runner removes that directory after a pass or failure and before exiting on SIGHUP, SIGINT, or
SIGTERM. Release checks must never sweep another concurrent run's directory.

`config/quality-budgets.json` is schema-validated. Every numeric ceiling is compared with the
immutable delivery base. Removing a ceiling or increasing it fails. The first revision that adds the
file is recorded as the baseline instead of pretending a historical comparison occurred.

Manual NVDA and VoiceOver evidence for release-critical widgets follows
[the assistive-technology release charters](accessibility/RELEASE_CHARTERS.md).

## Data Table test matrix

`test/ui-data-table-cost.test.ts` counts native row text reads at 12, 24 and 48 rows on initial
enhancement, page changes and repeated enhancement. It separately bounds whole-root selector
queries, checks native visible rows and pages, stops notifications after synchronous source/part
mutation during an output write, and verifies transaction observer disconnection after success and
setup failure. These are deterministic operation counts, not a wall-clock benchmark. The saved
negative records 1,776/5,856 page reads at 12/24 rows and 500 whole-root queries for 24 rows; the
corrected diagnostic records 36/72 and 18. The complete browser checkpoint is recorded below;
delivery remains required. The real-browser document fixture repeats the cost and native-page
controls at 12, 24 and 48 rows in Chromium, Firefox and WebKit. Public observer fault tests cover
native observe-then-throw rollback and preserving the primary error when disconnect also fails. The
bounded 925-file checkpoint passes 4,920 units, all fast/static gates and 1,245 browser cases across
three engines. `verify-data-table-cost.mjs` under the ignored September 19 audit directory binds the
selection, source maps, declaration/API outputs and terminal fingerprint. The same source passes 30
existing actual Turbo/htmx baseline cases; generic/UI host conformance, installed package consumers,
fixed budgets and full delivery remain open.

Data Table and its server-driven blocks require evidence for:

- native table, header, caption, and checkbox semantics
- sorting direction and canonical server ordering
- ordered multi-sort construction, priorities, and allowlist normalization
- search and faceted filters
- page clamping and page-size changes
- grouping, aggregates, row expansion, and optimistic edit conflicts
- selection stability across page and virtual-window patches
- visible, ordered, pinned, reload-persistent columns and readable mobile overflow
- migration idempotence, durable reopen, deterministic seeding, and query budgets
- bounded virtual-window responses and DOM row counts
- loading, empty, and request-error presentation
- repeated enhancement after Datastar replaces rows or Pagination
- keyboard operation and automated accessibility in initial and updated states

## Persistence evidence

`test/persist-lifecycle.test.ts` disposes the kernel or attachment from synchronous setup and
operation callbacks. It checks callback order, late subscription cleanup, owned/borrowed adapters,
cleanup failures, terminal reports and stopped status listeners. Public application-start cases
prove refused hydration commit and absent attachment publication. Live controls cover ordinary
hydration and the requested final disposal flush.

`test/persist*.test.ts` uses one adapter conformance suite for memory, local, session, and custom
adapters, plus canonical data, codec, envelope, migration, recovery, scheduling, and disposal tests.
Property tests generate JSON ordering, revision permutations, and edit/corruption/recovery
sequences. Generated prototype keys at any depth must fail encoding and stored-data parsing;
accepted preferences must preserve canonical ordering and JSON round-trip values, including JSON's
normalization of negative zero to zero. Canonical re-encoding must be stable and caller input must
remain unchanged. Separate nested prototype-key and negative-zero regressions retain the hosted
counterexamples without discarding generated inputs. `e2e/persist.spec.ts` exercises three engines
with actual same-origin pages: hydration before UI, reload, local sharing, session partitioning,
clock-controlled expiry, failures, and disposal flush. Package consumers exercise ESM, CommonJS,
NodeNext, Bundler, QUnit, and the installed browser entry. Optional graph checks reject persistence
code from consumers that do not import it.

The persistence lifecycle suite also tracks the actual default memory adapter allocated through its
factory. A final attachment write triggers kernel disposal; the test requires default-adapter
cleanup despite the reentrant attachment error, repeated terminal error reporting, released
listeners and retained error codes if memory cleanup also fails.

## Resource strategy comparison

Ticket 0020's unshipped Project Inspector uses one markup and scenario driver for server SDK
patches, an exact private query-core adapter and a minimal native cache. See the frozen contract and
reproduction steps in [RESOURCE_STRATEGY.md](decisions/RESOURCE_STRATEGY.md). The closed dataset is
`quality/resource-strategy.json`; contract tests recompute scores, sensitivity and fixture digests.

Run `npm run research:resources:prepare` before direct focused tests on a clean checkout. It
verifies or installs the exact private dependency with scripts disabled, then builds isolated
research entries. All canonical quality modes run its `--install-only` step before browser/static
checks. Root installation and published consumers do not acquire a query-core dependency.

The focused unit files are `test/resource-strategy{,-server,-contract}.test.*`. The common
Playwright suite is `e2e/resource-strategy.spec.ts`: desktop Chromium, Firefox and WebKit plus
mobile, reduced motion, forced colors, zoom and JavaScript-disabled profiles. Assertions cover
racing selection, consumer teardown, canonical writes/conflicts, accessible state, preserved roots,
identity change and terminal cleanup. Timing collection runs separately with five fresh contexts per
engine and strategy; it records origin reads and settled DOM latency, including browser HTTP cache
differences. Measurement and scoring commands write the reviewed dataset only when passed
`--record`.

## Native navigation decision evidence

Ticket 0023 compares ordinary documents with JavaScript disabled/enabled and the exact supported
Turbo/htmx versions in Chromium, Firefox and WebKit. `quality/navigation-decision.json` freezes 28
scenarios and indexes every failed, partial and passing raw archive. Canonical JSON validation
checks compressed/decoded hashes, closed fields and exact summaries. The final comparison contains
30 rows and 840 flows; configured candidates pass all applicable assertions and terminal ownership
checks. Research code remains outside production imports and packed files.

`npm run research:navigation:measure -- --record` uses one locally packed installed artifact and
refuses changed fixture inputs without an explicit `--amend` reason. The measurement baselines run
before enhanced candidates. `node scripts/score-navigation-decision.mjs` verifies the complete
matrix and reproduces ratings, weight sensitivity and optional-scenario exclusions. Raw package
costs and graphs live in `quality/evidence/navigation-costs.json`; unbuilt native estimates have
null byte/execution measurements.

The normal `e2e/navigation-decision.spec.ts` suite reuses the driver for nine regression scenarios
across all six candidates, plus axe on ordinary/error documents for each JavaScript candidate. The
complete matrix and supplemental launch-policy probe remain decision evidence rather than being
silently replaced by this smaller regression set. The decision documents the rapid Turbo history,
pre-header browser write retry, older htmx private-entry and handled Firefox pageerror boundaries.
No manual assistive-technology, browser-chrome or cache-performance claim follows from these tests.

For current program-audit navigation evidence, use
`node scripts/program-audit/run-navigation.mjs --artifact <ordinary prepared tarball>` after the
separate preparation command. It runs all 840 flows against verified installed assets and retains
host-default observations and declared no-JavaScript exclusions. A frozen manifest and independent
parent process record bind the raw result to the source, tools, artifact and execution interval.
`test/program-audit-navigation-execution.test.mjs` checks stale preparation, lock and graph
substitutions, complete row selection, browser cleanup, interrupted processes and exclusive
immutable recording. The existing navigation adapter tests continue to check every assertion and
cleanup contract. Neither the component result nor its synthetic unit fixtures replace the two real
assistive-technology charters or the complete final program audit.

`test/program-audit-navigation-index.test.mjs` checks the component index against independent
source, artifact, browser, process and time expectations. Its disk fixtures exercise actual bounded
manifest/process/log/schema/report loading, including empty logs, changed bytes, contradictory
process results and complete historical raw observations. Only the separately tested preparation
reader is replaced in those fixtures. Historical raw reports under synthetic process envelopes are
test inputs, not current acceptance evidence. The maintained reader refuses development evidence
when final acceptance is requested and returns immutable data for exact navigation selectors.

## Inspection evidence

Ticket 0031's `test/inspection-decision.test.mjs` validates two controlled installed registry
application investigations across Chromium, Firefox, and WebKit. The saved snapshots/traces must
match the public schema, fixture hashes, diagnosed failures, corrections, and terminal cleanup.
`npm run research:inspection:measure` reproduces both investigations from a current locally packed
artifact and records isolated browser/version/import-graph evidence. These runs establish diagnostic
sufficiency for the tested questions; they are not independent usability or accessibility studies.
Package quality separately rejects a DevTools export, runtime, or packed research artifact.

`test/inspection.test.ts` checks post-boot attachment, default-off ownership, shared leases, closed
schemas, service inventories, policy expiry/revocation, transactional metadata and contained cleanup
failures. `test/inspection-redaction.test.ts` exercises hostile data and 50,000 observations.
`test/property/inspection.property.test.ts` generates retention, disclosure and expiry sequences
under the standard seeded replay contract.

`test/fixtures/inspection-conformance.mjs` runs against source and exact installed ESM/CommonJS,
QUnit and Chromium/Firefox/WebKit artifacts. It includes six official plugins, four count summaries,
200 actions, both bridge observation kinds and terminal cleanup. Bridge host doubles exercise their
public lifecycle events; the existing real-host bridge suites retain transport/lifecycle coverage.
Installed graph checks measure inspector-only, core plus inspector and CSP plus inspector bundles,
reject trusted code in the CSP composition, and reject inspection sentinels in unrelated consumers.

## Detached declarative cleanup

`test/declarative-detached.test.ts` removes owned nodes and destroys their application or kernel
before observer delivery. It checks normal and throwing directive cleanup, native and jQuery
listeners, model input, repeated destruction and a live sibling after scoped patch removal. The four
teardown cases fail against the prior source; the scoped sibling control already passes.

## Conformance case cleanup

`test/conformance-cleanup.test.ts` checks task failure with normal and throwing cleanup in each core
case, plus early failure in the optional cleanup-plugin case. All cases share harness ownership and
release it after completion or early failure. A distinct cleanup failure is retained with the
original work error; terminal error identity and expected plugin-cleanup results remain intact.
Passing core/plugin controls retain their existing named results. The caller owns the DOM realm
supplied by the harness factory.

## Plugin setup interruption

`test/plugin-lifecycle.test.ts` exercises public-core installation and application hooks that start
applications, destroy their application or dispose the kernel during setup. Assertions check
publication refusal, no later callbacks, returned and earlier cleanup, original/cleanup error
retention, provisional resources before activation and an observer whose ownership acquisition
fails. Successful listeners and observers remain active until disposal; cancellation during
acquisition releases the completed registration exactly once. The original source fails ten of the
initial twelve cases, while two rollback controls already pass.

## UI re-enhancement evidence

`test/scoped-resource-lifecycle.test.ts` exercises render, native removal, preservation, adoption,
cleanup reentry/errors and overlapping boundaries. `test/plugin-lifecycle.test.ts` verifies staged
scope forwarding and unavailable-scope rollback. `test/ui-resource-lifecycle.test.ts` exercises
Carousel, Countdown and Message Scroller removal and preservation, every retained facade method
after disposal/reinstallation, failed-install rollback, disposal inside an event callback and timer
isolation across two documents. These are focused evidence for ticket 0006's ongoing controller
enrollment; they do not substitute for the remaining families or full package and delivery gates.

`test/ui-controller-resource-lifecycle.test.ts` extends this matrix to native fields, copy
controllers, navigation, toggles, Stepper, Editable and the viewers. It exercises connected render
boundaries, native removal, disposal, exact preservation, reacquisition, callback disposal, native
reset cancellation, pending copy settlement, modal cleanup, Sidebar media/shortcut ownership, queued
Log Viewer scrolling, JSON serialization and interrupted listener acquisition. Existing
part-replacement and form-association suites remain required alongside these resource regressions.

`test/ui-form-pointer-resource-lifecycle.test.ts` exercises Form, Resizable, File Upload, Sortable,
Input OTP and Tags Input through native removal, render barriers, preservation and disposal. It
covers queued resets/invalid events, external form controls, pointer-capture rollback and two-window
cleanup, temporary ordering, reacquisition and callback interruption. Scoped kernel cases require
new detached resources to survive earlier removals and reject acquisition interrupted by observer
setup or removal cleanup. The Form association suite distinguishes cancellation of a pre-cleanup
notification from validation after a detached form is explicitly acquired again.

`test/ui-floating-resource-lifecycle.test.ts` exercises Tooltip, Hover Card, Popover, Dropdown Menu,
Context Menu and Menubar across removal, preservation, disposal and reacquisition. It checks actual
timer cancellation, two-document ownership and viewport geometry, native listeners, panel cleanup,
authored Tooltip description tokens, interrupted native popover/focus/selection callbacks,
replacement enhancement, sibling transitions and pending work through unchanged enhancement.
Add/remove-before-delivery cases require automatic enhancement to skip retired nodes and verify that
explicit detached acquisition still works.

`test/ui-choice-resource-lifecycle.test.ts` covers Color Picker, Time Picker, Multi Select, Select
and Combobox. It verifies captured reset cancellation, current reset preservation, native/form/label
and option listener cleanup, floating/inline panels, callback disposal, reacquisition and document
isolation.

`test/ui-collection-resource-lifecycle.test.ts` covers Tree, Transfer List and Feed. Public probes
check physical listener/timer/observer cleanup, exact preservation, connected moves, reacquisition,
part replacement and event/focus disposal. Tree retains current typeahead and isolates timer cleanup
by document; Transfer List rebinds changed button operations. Feed cases reject superseded observer
delivery, stop pending focus/scrolling, handle interrupted or reentrant observer setup and teardown,
and isolate observer ownership across documents.

`test/ui-calendar-document.test.ts` uses independent iframe installations and genuine foreign Date
objects. It covers foreign facades/actions, automatic enhancement, both adoption disposal orders,
open Popover handoff, stable days, current grids/inputs/labels, callback and live-write ordering,
interrupted rendering, setup reentry, canceled/constrained activation, event detail mutation, ISO
years below 100 and adopted native resets. The document-ownership browser matrix adds all four
families in six modes, including real foreign Dates, native keyboard focus and FormData/reset
behavior in Chromium, Firefox and WebKit. Existing Calendar/range native and accessibility cases
remain controls. This source-level proof does not replace actual host or installed-package tests.

`test/ui-data-resource-lifecycle.test.ts` covers Chart and Data Table cleanup, preservation,
reacquisition and two-document isolation. It checks interrupted/reentrant rendering and sorting,
canceled outer operations, table/plot replacement, stable off-page selection and initial seeding,
native listener setup interrupted by disposal or failure, and complete cleanup with retained error
evidence. Realm fixtures use their supplied window's specialized table/cell/SVG constructors.

`test/ui-chart-table-document.test.ts` adds independent iframe installations without global realm
replacement. It covers automatic enhancement, foreign facades and implicit/selector/element actions,
both adoption disposal orders, native output identity, current/nested parts, callback and DOM-write
ordering, constrained/canceled native activation, cleanup reentry, interrupted setup and retry.
Configuration/source patches without enhancement must stop stale sorting. Canceled sort proposals
remain readable without reordering rows. Failed initial validation cannot retain partial selection,
and adopted applications cannot invoke the source installation's actions. The reporting browser
matrix runs both families through six ownership modes in Chromium, Firefox and WebKit, alongside
existing native sorting/selection, backend Chart refresh and automated accessibility controls.

`test/ui-questionnaire-resource-lifecycle.test.ts` covers physical listener/reset cancellation,
preserved and unchanged enhancement, form reassociation, part replacement, default/submitted/native
state after reacquisition, and callback disposal or newer work. It exercises native invalid events,
answer input/change loops, thrown dispatch, focus/scrolling, submit propagation, interrupted timer
and listener setup, cleanup failures and reentrant enhancement. Two-document fixtures check native
fieldset detection, generated skip ownership and captured timer cleanup.

`test/ui-toast-resource-lifecycle.test.ts` covers captured native listeners, dismissal and
announcement timers, viewport-owned announcements after ordinary dismissal, scoped removal,
preservation, duration reacquisition and permanently dismissed nodes. It exercises nested/canceled
dismissal, replacement/reentrant binding, focus/removal disposal, failed generated markup,
interrupted native setup, complete cleanup sweeps, pointer ownership/cancellation and overlapping
pause causes. Document fixtures verify target rejection, F8 filtering, isolated recovery focus and
show after an ambient realm lease ends. These tests do not replace actual screen-reader
observations.

The Password Field and Chart unit suites replace individual native/control/output parts, run public
UI enhancement and wait for `whenEnhanced()`. They check current-part behavior, inert detached
listeners, preserved unchanged-tree state and retry after a canceled replacement render. Code Block
cases complete or reject a pending copy after replacing its status and code, requiring a current
announcement and the original copied text. Clipboard cases force legacy selection/copy success,
refusal and thrown failures, then require removal of only the temporary textarea. These source
regressions supplement the installed browser and native-form contracts; a focused pass does not
replace the complete delivery matrix.

`test/ui-copy-document.test.ts` checks Clipboard and Code Block in independent windows through
explicit, automatic and named-action paths. It covers current parts and descriptions, before-copy
cancellation and constraints, request ordering, adoption before and after pending completion,
remaining reset time, provisional resources and complete cleanup. Browser copy capabilities are
stubbed per window; these tests never use the user's real clipboard. Controls also preserve Code
Block's initial state and both families' authored status text, original promise results and error
identity. Legacy selection, refused copy and thrown selection/copy all leave authored textareas
connected and remove only the temporary control.

The document browser fixture exercises both copy families in Chromium, Firefox and WebKit with
owning-window API receivers and events, replacement parts, reentry, adopted pending work, render
preservation, removal, legacy fallback and Clipboard deadlines. Existing component tests retain
native form, exact JSON copy, keyboard and automated accessibility coverage. These browser checks
supplement the full delivery and manual accessibility requirements.

### Native form listener ownership

`test/ui-form-ownership.test.ts` checks listener registration through the public enhancement API for
Search Field, Rating, Color Picker, Time Picker, File Upload and Multi Select, with Select and
Combobox as unchanged controls. Repeated child replacement must leave one listener; root moves,
explicit `form` changes and missing form associations must release the exact old form binding. A
Search Field behavior case verifies one event from the current control and form, no event from the
former form, and preservation of its native value during movement. Existing component suites
continue to verify value, reset, native form, action and keyboard behavior. These tests establish
listener ownership after completed enhancement, without claiming immediate collection of removed DOM
or cancellation of browser work outside that owner.

### Rendered-part controller replacement

`test/ui-rendered-parts-lifecycle.test.ts` verifies replaced and late File Upload lists, replaced
Multi Select tags, changed option labels and disabled removal controls, and stable rendered children
after unchanged enhancement. Native and fallback popover cases verify that replacing open content or
its native control releases the former floating element, search timer and active-record viewport
work even with a before-close veto. Tests observe rendered output, timer cancellation and public
resize behavior; they do not infer heap collection from a WeakMap.

`test/ui-multi-select.test.ts` also removes an authored status and re-enhances the root. The
replacement status is a generated `p` with live-region metadata; generated content and tags are
`div` elements. A focused frozen-source mutation pass kills six original survivors on the generated
tag selection. Two other mutants on that line return the same `div` for every allowed part and are
reviewed as equivalent individually in ticket 0053. The same owning suite checks ArrowUp and
ArrowDown wrapping around a disabled final option while leaving the native selection unchanged. Its
focused frozen-source pass kills all seven selected enabled-option filter mutants, including four
original survivors. It also checks the generated disabled option's `aria-disabled="true"` and empty
`data-disabled` attributes. A focused pass kills four original survivors on that rendering branch;
one originally killed mutant times out in the focused rerun and retains its original classification.
The owning suite also rejects a nested select, a wrong direct control element, a select with the
wrong `data-part`, and a select without `multiple`. Its frozen-source control-validation pass kills
five original survivors and two originally uncovered mutants while retaining nine original kills.
Pointer cases also verify that an enabled option click changes selection, while clicks on the
listbox background or a disabled option leave selection and focus unchanged and emit no window
error. The test captures jsdom's error event during dispatch so a removed null guard fails as a test
instead of surfacing only as a runner error. Its repaired-tool frozen-source pass kills four
original runner-error mutants. A further case marks an otherwise enabled rendered option
`aria-disabled="true"`, then verifies that clicking it leaves the native selection and active option
unchanged. The source-matched rerun kills all ten click-guard mutants, including the last three
original survivors.

`test/ui-input-otp.test.ts` also checks that six authored HTML slot elements retain their identity
and receive the code characters when unrelated HTML and SVG children appear in the slots container.
Its one-worker frozen-source pass kills three original survivors in the slot filter. The other four
mutants on that line time out in the focused run and remain open; a timeout is not credited as a
test kill.

### Queued native reset replacement

The rendered-part lifecycle suite also has six Rating, Color Picker and Time Picker reset cases.
Three reproduce a native form reset followed by control replacement and completed enhancement before
the deferred callback executes; both reflected and native replacement values must survive. Three
live-controller controls reset edited values to native defaults across unchanged enhancement. These
tests check stale callback effects, without treating a still-running browser task as canceled.

### Number Field native part replacement

`test/ui-number-field.test.ts` replaces all parts and each individual input/increment/decrement
part, then verifies current native stepping, public value operations, exact ARIA control identity
and inert detached input/change/button events after enhancement. The unchanged-parts case retains
the input identity and value and emits one lifecycle change. The original four replacement failures
are retained; the corrected combined UI/patch/behavior set passes 166 cases across 17 suites.

### Viewer parts and deferred following

`test/ui-viewer-lifecycle.test.ts` replaces JSON Viewer source/tree/status and Log Viewer
entries/viewport/filter/pause/status individually and together. It checks current API output and
ARIA, inert detached native events, exact listener removal, retained pause/follow state, stable
empty JSON rendering and replacement error output. Pending-scroll cases disable following, pause,
detach or replace the viewport before the microtask. The original implementation fails 17 of the 19
new cases; the corrected focused viewer set passes all 32 cases. The empty-source regression is
detached and does not claim to reproduce an attached observer feedback loop.

`test/ui-viewer-document.test.ts` adds 70 public document and continuation cases for JSON Viewer and
Log Viewer. It covers independent-window facades/actions/automatic enhancement, root targets,
adoption in both disposal orders, native branch and pause/follow preservation, current and nested
parts, serializer return/throw, changed depth/expansion, interrupted branch/render setters,
append/clear reentry, input getters, listener setup/cleanup, canceled/disabled native filters,
queued scroll ownership and collision-free generated entry IDs after trimming. The first public run
has 50 failures/nine passes; three additional action/ID negatives are recorded before their
corrections. Two further negatives cover expansion requests made during tree insertion and a later
configuration change. The render marker is released independently of commit rollback. All 227
focused viewer/resource controls and four CSP contract tests pass.

The document browser fixture adds 36 viewer cases across Chromium, Firefox and WebKit. They use
native details, scrolling, owning-window events, declarative actions, adoption, replacement,
serializer/lifecycle reentry and preserved/ordinary removal. Six existing control-plane cases retain
backend/SDK-stream and automated accessibility coverage. The 42-case focused browser selection
passes with no skips or flakes and all 126 startup inputs verified. After the render-marker
correction, full integration passes 2,680 tests in 99 files. The final browser matrix passes 864
cases with zero skips, flakes or unexpected results: 822 document cases across 38 families and 42
existing controls. All three engines pass 288 cases and all 126 source/911 worktree inputs verify at
terminal. Actual hosts, semantic review and manual accessibility remain separate requirements.

### Floating documents and preserved native focus

At the Popover checkpoint, `test/ui-floating-document.test.ts` promoted both twelve-case discovery
groups and extended Popover coverage to 38 cases. All Popover cases passed; the remaining 20
Tooltip, Hover Card, Menu, Context Menu and Menubar cases failed as ordinary public tests without
exclusions. The later Tooltip checkpoint below supersedes those counts. Popover covers foreign
facades/actions, current parts, both adoption/disposal orders, retained open state/focus, generated
versus authored names, nested controls, native constraints, cancellation, newer operations through
setup/cleanup/events/geometry/focus, provisional acquisition and complete cleanup.

Native-method stubs do not prove browser acceptance. Eighteen Popover browser executions exercise
actual beforetoggle cancellation, superseded and no-op native transitions, late toggle delivery,
authored native hiding and immediate reopening, private actions, current ownership and preserved
removal. They also verify current parts and listener retirement. The action fixture ends its
application-owned declarative listener before checking retirement of a UI-owned native listener. A
native Chromium trace exposes focusout before detachment and an ineffective focus call before UI
enhancement restores the panel.

`test/ui-preserved-focus.test.ts` adds nine kernel cases for focus readiness after enhancement,
newer focus/render ownership, deliberate blur, removed/adopted/disposed targets, deferred errors and
provisional focus-listener release. The focused kernel/bridge selection passes 113 cases across six
files. The targeted real-browser selection passes all 33 Popover ownership and existing
Popover/Calendar/date-form behavior and accessibility cases across Chromium, Firefox and WebKit. The
full document matrix passes 462 cases across 29 families; complete integration passes 2,291 and
fails 20 across 97 files. Final fast evidence is recorded with ticket 0006. Full family/host
conformance, manual accessibility and actual delivery remain required.

At the preceding Tooltip checkpoint, the public floating suite had 99 cases: all 44 Tooltip and 39
Popover cases pass, while sixteen cases in Hover Card, Menu, Context Menu and Menubar remain
failing. Tooltip tests cover foreign actions/automatic enhancement, retained open state without
moving focus, exact pending opening/closing deadlines across adoption in either disposal order,
canceled and late timer work, provisional timer/listener acquisition, complete cleanup, native
acceptance/no-op/supersession, current constraints/parts and generated versus authored description
IDs. A failing cleanup-reentry control proves the generated token must be released before hiding
native content acquires a new owner. Two facade controls prove immediate native close before toggle
delivery in Tooltip and Popover; another prevents timer cancellation from resuming stale native
toggle state.

Thirty new Tooltip browser executions cover six ownership modes and four delayed adoption/disposal
combinations per engine. Deadline cases wrap the destination's real timer registration only long
enough to inspect its remaining delay, then let native scheduling and native Popover state prove
completion. Both immediate authored native show/close and hide/reopen are checked. Existing Tooltip
hover/focus/Escape and accessibility cases run with the complete ownership matrix. The first broad
run was interrupted when the three native-state follow-up negatives were found; its skipped cases
provide no acceptance. The corrected full run passes 498 browser cases: 492 document executions
across 30 families and six existing Tooltip controls. Complete integration passes 2,336/fails
sixteen across 97 files. Current bindings and fast evidence are recorded with ticket 0006.

The Hover Card/shared-native checkpoint extends that suite to 147 cases: 135 pass, including all 38
Hover Card, 44 Tooltip and 39 Popover cases plus twelve cross-kind handoff and two native recovery
controls. Twelve Menu, Context Menu and Menubar cases remain failing without exclusions. All six
directed handoffs between Popover, Tooltip and Hover Card run during native opening and closing and
assert exactly one accepted notification from the new owner. A failing real-browser matrix
established that nested native opening is rejected while the previous call is still running;
content-wide native-call ownership and deferred completion correct that behavior.

Hover Card controls cover retained interactive focus and deadlines, current scoped titles, authored
names, dismissal focus suppression, deliberate later focus, canceled/nested interaction,
constraints, provisional acquisition and complete cleanup. Chromium exposed a preserved-removal
departure timer that ran after detachment; a public negative reproduces the lost open state. Its
correction retains explicitly detached activation. The initial browser selection preserves 62
passes/ten failures: nine stem from moving focus outside a zero-delay adopted card without
subsequent pointer entry; one is the verified Chromium timer bug. The corrected native selection
passes all 72 cases across three engines, including unchanged composed-surface keyboard and
accessibility controls.

Complete UI/DOM/kernel/bridge and Access Manager integration passes 2,388/fails twelve across 97
files. TypeScript, focused ESLint and the unchanged 341-file/298-count lint ratchet pass. The full
570-case browser matrix and the complete written checkpoint's fast report are bound separately in
ticket 0006's evidence directory. No focused result closes the remaining family, actual host, manual
accessibility, package-budget, semantic review or delivery requirements.

### Menu, Context Menu and Menubar ownership follow-up

The expanded public floating document suite passes all 272 cases. Menu/Context Menu controls cover
current parts/items/groups, selection constraints and default prevention, scoped native events,
sibling cancellation/reentry, current geometry, focus, remaining search/long-press deadlines and
provisional acquisition/cleanup. All 20 directed handoffs between the five floating kinds run during
native opening and closing with one accepted notification from the new owner. Menubar controls cover
foreign facade/action/automatic enhancement, adoption in both disposal orders, current child parts,
roving state, callback supersession, inherited constraints, canceled/nested events, inactive item
exploration and resource acquisition failures.

The focused eight-file selection passes 435 cases and the complete 97-file integration passes 2,525.
The first Menubar implementation passed its 270 public cases before two additional inactive-item
navigation controls exposed another bug; all 272 now pass. Older resource controls paired fake
timers with a real Date clock and sometimes missed a timer whose remaining delay was one millisecond
shorter. Date now shares the fake clock, preserving deterministic acquisition/cleanup assertions.

Initial native selections pass 183 Menu/handoff cases and 90 Menu/Context Menu/Menubar cases,
including unchanged behavior and accessibility controls. The first full matrix was interrupted after
the two public navigation negatives, and its 125 passes/619 skips do not establish acceptance. The
final matrix passes all 744 cases: 720 document cases across 34 families and 24 component controls,
with zero failures, skips or flakes. All 125 startup input hashes and the report hash verify at
terminal. Ticket 0006 records the evidence. Current TypeScript and the 341-file/295-entry ratchet
pass without an increased allowance. Full-family, actual-host, manual-accessibility, fixed-budget
and delivery work remain.

### Disclosure and Editable part handoff

`test/ui-disclosure-editable-lifecycle.test.ts` checks exact summary click/keydown removal and
native details behavior after summary/content replacement. Editable cases replace each part and all
parts, check current API/native-key output and public event `control`, preserve committed values and
replacement drafts while editing, and verify unchanged listener counts and explicit root values.
Original source fails 12 of 14 cases. A private-field rename accidentally changed the public event
field; the added event assertions reproduce seven failures before restoring `control`. The final
focused set includes the existing disclosure/editable/toggle/feed and patch/lifecycle suites.

### Frame documents and adopted UI roots

`test/dom-realm.test.ts` and `test/ui-document-ownership.test.ts` add 51 cases for native identity,
foreign-document targets, explicit and automatic enhancement, private actions, adopted reactive
controls, destination reacquisition and render boundaries. Invalid objects and wrong-document
targets remain rejected. The first controller group is Countdown, Carousel, Message Scroller and
Dialog; these tests do not cover every family.

`e2e/ui-document-ownership.spec.ts` uses independent same-origin frames without a global realm
lease. Its first 54 cases across the three desktop engines cover those four controllers,
owning-window events, native Dialog modality through preserved movement and Carousel
focus/user-pause state on adoption. The first browser attempt exposed lost Dialog modality and a
WebKit Carousel enhancement loop caused by repeated disabled writes; its interrupted report remains
failure evidence. The corrected suite has no failed, skipped or flaky cases. Current full delivery
and the remaining families/host matrix are separate requirements.

`test/ui-native-field-document.test.ts` adds 70 public cases for Number Field, Password Field,
Search Field and Rating. They cover foreign targets/actions, adoption and immediate facade
reacquisition, destination events, native state retention, provisional listener/timer setup, failing
cleanup, reset cancellation, current parts and transitions superseded by newer callbacks or native
constraints. The same browser fixture adds 66 executions for these four families, including native
interactions after source disposal, preserved movement and owning-document reset behavior. The
combined browser suite has 120 executions across Chromium, Firefox and WebKit. These eight families
do not establish adoption or lifetime correctness for every other family.

`test/ui-token-toggle-document.test.ts` adds 80 cases for Input OTP, Tags Input, Toggle and Toggle
Group: owning-frame facades/actions, automatic enhancement, immediate adopted-root reacquisition,
destination events, stable bindings/generated nodes, cleanup failure/reentry, current parts and
constraints, native reset work, composition/selection and superseded notifications. Positive
controls retain completion during unchanged focus/enhancement and native reset semantics for
generated form values. The document browser fixture adds 54 executions for these four families,
including Input OTP reset cancellation and Toggle Group's roving focus. The combined suite has 174
executions across twelve families in Chromium, Firefox and WebKit; the other families and full host
matrix remain separate audit requirements.

`test/ui-navigation-document.test.ts` adds 70 cases for Tabs, Toolbar, Pagination and Sidebar:
foreign facades/actions, automatic enhancement, immediate adoption, destination events, exact
bindings, interrupted acquisition, complete cleanup and reentry, current parts and newer callbacks.
It checks manual tab focus, native Toolbar text selection/arrows, Pagination modifier clicks and
Sidebar's captured media/storage/shortcut ownership and retained desktop preference. The same
browser fixture adds 54 executions, including native iframe viewport transitions and focus return
with source disposal both before and after destination acquisition. Those executions extend the
suite to 228 cases across sixteen families; other families and the complete host matrix remain
separate.

`test/ui-disclosure-step-document.test.ts` adds 79 cases for Collapsible, Accordion, Editable and
Stepper. They cover foreign facades/actions, automatic enhancement, immediate adopted-root
reacquisition, destination events, stable bindings, interrupted setup, complete cleanup/reentry,
current parts and superseded callbacks. Native cases include pending toggle notification, summary
links and late click cancellation, sibling exclusion, retained drafts/selection, composing keys,
textarea Enter, completion state and validation after callback changes. The document browser fixture
adds 72 executions for all four families, bringing the matrix to 300 across twenty families and
three engines. That matrix includes real native named-details behavior and draft/completion
retention with disposal before or after destination acquisition. Full family and host conformance
remain separate requirements.

`test/ui-choice-time-document.test.ts` currently has 240 passing cases. Its 39 Time Picker cases
cover foreign facades/actions, automatic enhancement, adopted controls, destination event
constructors, native state retention, exact bindings, callback revisions, constraints, nested
presets, inherited disabling, interrupted acquisition, complete cleanup/reentry and native reset
ownership. The 53 Select cases additionally cover generated option/binding identity, uncommitted
exploration, typeahead, sibling cancellation/reentry, current native constraints, popup completion,
stale geometry and cleanup continuations. The 70 Combobox cases cover those ownership boundaries
plus query/value separation, original input defaults, draft selection/composition, manual filtering,
loading/minimum length, native edits during synthetic notifications and captured inline transitions.
Its 78 Multi Select cases additionally prove captured parts and ownership, stable generated
options/tags, retained exploration/typeahead, locked disabled selections, max/required constraints,
exact native event handling, generated labels, current optgroup structure, nested controls and
complete resource/notification cleanup. The previously failing foreign-target/adoption cases for all
four families now pass. Complete family and host conformance remain separate requirements.

The document browser fixture adds 18 executions each for Time Picker, Select, Combobox and Multi
Select across Chromium, Firefox and WebKit. Select and Combobox exercise actual native popover
cancellation and preservation, disabled choices, keyboard exploration, forms and immediate adopted
ownership. Combobox also covers text selection/composition, original reset defaults after hidden
value writes, silent native values and native-to-inline transitions. Multi Select also proves
disabled native FormData exclusion, required validity after clear, max/select-all behavior,
generated tags, native focus and reset defaults. Its native FormData assertion runs in real browsers
because jsdom includes disabled selected options in submission. Time Picker covers native form
submission/reset, source disposal before or after destination acquisition, immediate facade
acquisition, preservation and removal. Full family and host conformance remain pending.

### Color Picker, File Upload, Tree and Transfer List document ownership

`test/ui-color-file-tree-transfer-document.test.ts` promotes the next four-family discovery group.
Its 54 Color Picker cases cover foreign facades/actions, automatic and immediate adopted ownership,
native/default/submitted values, draft selection/composition, exact parts/listeners, native and
component events, callbacks, root patches, disabled controls/swatches, canceled transitions, reset
work and cleanup. All Color Picker cases pass. The later Tree checkpoint below supersedes the
original Tree failures. The final Transfer List checkpoint below closes the recorded four-family
failures.

The browser fixture adds 18 Color Picker cases across Chromium, Firefox and WebKit. It verifies
native alpha/color-space normalization, CSS-wide keyword rejection, FormData and native resets,
implicit/explicit actions, draft preservation, composition, current ownership, newer cancellation
and preserved/removal behavior. A native parser negative fails in all three engines before its
correction. The File Upload checkpoint expands the matrix to 408 cases across 26 families. Later
Tree evidence follows; every remaining family and cross-cutting/actual-host requirement stays
enrolled.

At the File Upload checkpoint, the public document suite has 113 cases: all 51 File Upload and 54
Color Picker cases pass, with eight Tree and Transfer List failures. File Upload adds native File
identity, silent clearing, stable rows/listeners, private actions, disposal orders, draft drag
state, form/reset ownership, unavailable controls, callback constraints, protected event arrays,
nested parts, provisional cleanup and native-write continuation checks. Controller fixtures use
explicit arrays where jsdom lacks DataTransfer; those assertions do not establish real FileList or
submission.

Eighteen new File Upload browser executions prove real FileList identity, same-metadata replacement
contents in FormData, native drop/removal/clear, absence of a shadow files property, native reset
and cancellation, actions, preserved rows/drag state and adopted ownership. The complete matrix
passes 408 cases across 26 families and three engines at that checkpoint. The six ignored Tree
continuation/resource negatives were then promoted into the public suite before its correction.

At the Tree checkpoint, this public group has 168 cases: all 59 Tree, 51 File Upload and 54 Color
Picker cases pass, and four Transfer List ownership cases still fail. Tree covers document/actions,
current parts and hierarchy, stable exploration/search, both adoption/disposal orders, original
query expiry, generated/authored names, constraints, nested controls, provisional
registration/timers, cleanup failures and newer operations during acquisition, before events and
native focus. The original six ignored negatives and later continuation failures were promoted and
corrected.

Eighteen Tree browser executions verify native focus, retained/expired typeahead, current labels,
composition, both private-action forms, visible bulk selection, canceled/newer work, disposal and
render preservation. The final complete matrix passes 426 cases across 27 families and three
engines. Complete UI/DOM/kernel/bridge integration passes 2,175/fails four across 94 files. At that
point, eight ignored Transfer List continuation/resource negatives remain to be promoted; the next
checkpoint below records their promotion and correction.

The Transfer List checkpoint brings this public group to **231 passing cases**: 67 Transfer List, 59
Tree, 51 File Upload and 54 Color Picker. It preserves native membership/order separately from
highlights/defaults and proves current parts, root patches versus silent native changes, both form
owners, canceled/superseded resets, generated/authored disabling, copied event arrays, component/
native callback revisions, provisional acquisition and complete cleanup. Stale-control negatives
assert actual native option lists and remove corrupted fixtures before asynchronous enhancement. An
isolated jsdom check shows stale selectedOptions after reset; controller reads use option.selected.

Eighteen Transfer List browser cases prove real FormData and disabled exclusion, native resets and
external forms, retained nodes/highlights/defaults, SVG/option/Enter interaction, private actions,
replacement, cancellation, newer work and preservation/removal. The complete current matrix passes
**444 cases across 28 families and three engines**. Full UI/DOM/kernel/bridge integration passes
**2,244 cases across 95 files**, including Access Manager’s official SDK flow. All six styled native
button operations, SVG descendants and nested controller exclusion pass in the public suite; the
browser fixture uses registry styling markers. The remaining 22 browser families and every
cross-cutting/actual-host requirement stay enrolled. Twelve ignored floating-component discovery
cases fail with valid fixtures and must become public regressions before their runtime correction.

### Carousel and Message Scroller resource ownership

`test/ui-carousel-scroller-resource-lifecycle.test.ts` exercises 42 public Carousel and Message
Scroller cases: interrupted timer/listener/observer acquisition, complete cleanup after failures,
error preservation, stale callbacks, cleanup reentry, retained pause/follow/unread/message identity,
unchanged enhancement, swipe continuity and callback interruption during selection, scrolling and
focus. Normal focus recovery remains a positive control. Observer fault injection targets the
controller observer after kernel ownership is established; kernel observer acquisition is a separate
boundary. Existing family, removal/preservation and Feed/Scroller tests remain required.

### Countdown output and clock ownership

`test/ui-countdown-resource-lifecycle.test.ts` adds 19 public cases for late interval acquisition,
shared provisional scheduling, setup/cancellation failure and reentry, superseded ticks, event
disposal/restarts, old-document retirement, owning-window events and deadline retention after kernel
replacement. The initial 15-case negative suite fails all cases; its logs also retain two Vitest
reporting errors. Escaped callbacks are drained between negative fixtures to avoid carrying a stale
clock into the next test. The corrected implementation passes those cases and four further
reentry/retention probes. This evidence covers old-document retirement on native adoption;
acceptance of adopted roots by the destination's complete UI facade remains a separate cross-cutting
concern.

`test/ui-countdown-lifecycle.test.ts` checks current time/value/status after individual and complete
part replacement, current completion output and unchanged detached nodes. A controlled-clock case
removes a running root, advances the disconnected tick, reinserts and enhances it, then observes
rendered time before the public state getter can refresh it. Repeated enhancement keeps one timer;
paused/completed controls remain unscheduled. Original source fails eight of ten cases. The
corrected isolated UI/patch/lifecycle set passes 101 cases, with current root delivery still
required.

### Tabs callbacks and Dialog generated labels

`test/ui-tabs-dialog-lifecycle.test.ts` checks renamed trigger values through click, focus and
Enter, current panel replacement, removed trigger inactivity and one request after repeated
enhancement. Dialog cases replace/remove title and description, preserve initial and later authored
ARIA, honor an authored label and retain one native cancel callback. Original source fails nine of
11 cases. The corrected isolated set passes 96 cases across nine suites; root delivery remains a
separate requirement after integration.

### Input OTP and Tags Input part ownership

`test/ui-otp-tags-lifecycle.test.ts` replaces native input/output/status parts individually and
together, then checks current public/native operations, current status and inert detached controls.
OTP cases preserve the public event `control` field, completion and root-value normalization. Tags
Input cases verify hidden-input serialization, native add/remove behavior, copied-list cache
invalidation and stable children across unchanged enhancement. Original source fails nine of ten
cases. The corrected isolated set passes 97 cases across eleven suites; current root proof remains
required after integration.

### Native Form association and floating title references

`test/ui-form-association.test.ts` covers external input/select/textarea validity, Field messages,
first-invalid focus, native edit clearing, server errors, disabled clearing and reset. It also
checks dynamic reassociation, unrelated controls, singular contained handling, detached local forms
and document-host disposal. `test/ui-floating-labels.test.ts` covers Popover and Hover Card title
replacement/removal, cloned content, authored labels supplied before or after enhancement and
current open events after repeated enhancement. Original source fails 16 of these 23 cases. Current
full delivery remains required in addition to the focused regression result.

### Feed associations and deferred Message Scroller writes

`test/ui-feed-scroller-lifecycle.test.ts` covers initial and appended-message scrolling after native
unfollow, disconnection, still-following controls and current part replacement. Explicit latest
recovers following after native pause. Feed cases replace/remove title and description separately
and together, preserve initial/later authored references, honor aria-label and retain authored
associations on replacement articles. Original source fails 11 of 17 cases; the corrected isolated
set passes 86 cases across seven suites. Current root delivery is a separate requirement.

The OTP lifecycle follow-up covers native maxlength and default-length fallback on replacement
inputs, current public focus and canceled native edits restoring current values. It addresses the
predecessor changed-code coverage gaps with supported behavior. Form's never-invoked local cleanup
closure is removed; external document-host disposal remains covered by the association suite.

### Resizable sessions and Transfer List string identity

`test/ui-resizable-lifecycle.test.ts` replaces current panels/handles, checks current keyboard and
public sizing, validates changed anatomy/panel count and observes exact session listener lifetime.
It covers pointer completion/cancel, replacement capture release, unchanged dragging, disconnection
and replacing a prior pointer session. `test/ui-transfer-list-values.test.ts` distinguishes one
separator-containing value from two values through public set and root patching, preserves native
hidden inputs and verifies unchanged/canceled operations. All 13 cases fail original source. The
corrected combined set passes 84 cases across eight suites; complete root delivery remains required.

### Canceled component transitions

`test/ui-transition-cancellation.test.ts` cancels public, previous-button and step-trigger moves
from a completed Stepper, then checks preserved state after enhancement and a later accepted move. A
canceled-completion control remains active. Menubar cases cancel child close through public API,
Escape and Tab, verify open state/value after enhancement, and then permit normal closure. Six of
seven cases fail original source. The corrected combined focused set passes 97 cases across ten
suites; complete root verification remains required.

### Sortable preview and value identity

Five additional detached-form cases check nested Sortable submission and exact generated-input
identity through parent movement, enhancement, submission-name removal, child movement and matching
field names/values. Four fail before the ownership correction. These tests make no claim about
attached mutation-observer feedback or immediate root-disposal cleanup.

`test/ui-sortable-lifecycle.test.ts` covers separator-containing values through public movement,
root patching, native drop and Escape restoration, checking both DOM order and hidden inputs. It
also replaces lists/items during preview, checks detached callback inactivity and current native
operations, and preserves an unchanged reordered preview until cancellation. Six of seven cases fail
original source; corrected focused and complete root results are recorded by owner 0006.

### Navigation bridge disposal during enhancement

`test/bridge-disposal-lifecycle.test.ts` invokes direct and observer-triggered disposal while core
enhancement is settling, and htmx disposal after commit but before host settlement. It checks
memoized promises, terminal outcomes, idle barriers, ignored later host events and untouched host
methods. Prepared/removing htmx and delayed Turbo renderer completion/rejection are controls. Five
of nine cases fail original source; all nine pass within the corrected 53-case bridge/render set.
These injected-event tests supplement the installed-host browser matrix and complete delivery.

The additional htmx case reports a host failure from the post-mutation observation before normal
commit resumes. It requires one terminal failure with no second adapter-settlement error. The
corrected combined set passes 54 cases across four suites, with every changed bridge line/function
covered by the focused repository evaluator; full delivery remains separate.

### Imported navigation decisions during corrections

The Mobile migration contract checks the decided browser/bridge navigation outcome, the exact
approved choice list, owner-ticket existence and current ESM/CommonJS/declaration export targets. A
lifecycle correction may reopen an implementation ticket without revoking that navigation choice.
Its changing phase is not imported approval evidence. The correction still requires all owner gates,
and the final program audit still requires every prerequisite ticket to be terminal.

### Final source-pass UI regressions

`test/ui-popup-lifecycle.test.ts` uses independent real jQuery/document installations to check
same-document sibling closure, cancellation and cross-document isolation. It also checks current
native labels, copied/generated references, authored ARIA and fallback transitions. Nine label cases
fail before correction, while the earlier three isolation failures are retained separately. Existing
Dialog, Feed, Popover and Hover Card suites cover the shared comparison migration.

`test/ui-native-reset-lifecycle.test.ts` checks canceled native resets, control replacement/removal,
form movement, current reset controls and Questionnaire callback handoff. It preserves submitted
state after cancellation and resets safely when the original default question is removed. The first
18-case run has fifteen failures and three live controls; later Skip/default cases extend it.

`test/ui-identity-constraints.test.ts` inserts new identified options/items around existing authored
nodes, rejects disabled Tree activation and verifies Data Table bulk selection, disabled counts and
selected IDs across replaced manual pages. Six original failures and one paging control are
retained. The removed historical row-ID collection is a source ownership finding, not a heap
measurement.

`test/ui-calendar-lifecycle.test.ts` covers native picker control/calendar replacement, unchanged
and copied-marker grids, and deferred focus after closing or replacing controls, calendars and
Popovers. The corrected original twelve cases pass; two later ownership failures arise when a
calendar moves into a replacement closed Popover. Current focused and complete delivery results
belong to owner 0006; fixture setup failures are retained and never count as negative product proof.

`test/ui-calendar-resource-lifecycle.test.ts` covers scoped removal, preservation and native
listener cleanup for Calendar, Range Calendar and both pickers. Its 84 cases also exercise selection
and month callback disposal/reentry, replacement, constraints, interrupted acquisition, cleanup
failure sweeping, roving-focus reacquisition, native reset timing, empty values, reversed ranges,
form reassociation and two-document creation/focus/reset timers. Deferred focus and native
notification chains must stop after retirement or newer work; unchanged enhancement keeps current
bindings. The initial probe records 30 failures and eight controls. Later probes expose native
reset, ambient constructor, constraint revision, empty reset and reversed-native-range failures.
Owner 0006 keeps their logs and separates fixture corrections from product failures. These tests do
not replace actual-host conformance, fixed bundle measurements or complete delivery.

### Form document and native validation continuation

`test/ui-form-document.test.ts` covers independent local/foreign installations, adoption in both
cleanup orders, application-root actions, canceled/current/newer resets, provisional listener
rollback, acquisition/cleanup reentry, native write and error/option getter ordering, current native
associations, replaced parts, authored validity and description ownership. Read-only inspection
remains a positive control during submission. The 71-case suite preserves its original 54-failure
negative and follow-up four-, two- and six-failure logs in the ignored September 19 audit directory.
The latest focused run passes 161 cases across the public Form, primary, association, resource and
CSP suites. Types and focused lint pass.

The existing document-ownership browser fixture/spec adds Form in explicit, automatic, action,
adopted, source-disposed-first and facade modes. It proves real FormData, requestSubmit, external
association, reset cancellation/supersession, native property shadowing by fields named reset,
checkValidity, reportValidity and elements, owner-window events, replaced controls, preservation and
removal. jsdom's manually shadowed properties are supplementary evidence; the real engines prove
native named-property behavior. The first targeted run passes 27 cases including nine existing
native/accessibility controls, with 914 hashes unchanged. It precedes final ownership fixes and
therefore requires fresh current-input browser/fast verification before checkpoint acceptance.

### Questionnaire document and native form continuation

`test/ui-questionnaire-document.test.ts` has 65 public cases covering independent documents,
adoption in both cleanup orders, root-as-application actions, current fieldsets/controls, nested
controller boundaries, source/default changes, canceled navigation/shortcuts/submission, inherited
constraints, reset ordering, acquisition reentry and native answer writes. Proposed-value inspection
without early DOM changes remains a positive control. The resource preservation fixture now returns
to the active question before dispatching input; events inside inactive inert questions have their
own negative assertion. A newer Next request supersedes an older queued native reset, while the
unchanged-enhancement reset control remains. Explicit tabindex preserves native fieldset focus.

The focused family/resource/reset/popup/CSP selection passes 144 cases across six files. TypeScript
passes. Initial public 53-failure and follow-up source/focus failures remain under
`ui-questionnaire-document-*` in the ignored September 19 audit directory. The targeted browser
selection passes 24 cases, with all 915 worktree hashes unchanged at terminal: 18 new document cases
and six existing Questionnaire/native/accessibility controls across Chromium, Firefox and WebKit. It
proves actual fieldsets, keyboard/skip behavior, FormData, canceled/superseded resets, disabled
constraints, requestSubmit field shadowing, events from the current window, preservation and
removal. A fixture lint correction replaces FormData entry stringification with exact entry
comparisons. Fresh full browser and fast reports must match final documented inputs before
checkpoint acceptance.

The current Questionnaire owning suite also rejects duplicate `data-value` entries patched into an
already enhanced root, selects a whitespace-padded authored value, and retains selection when that
optional value is removed. The owning suite passes 12 cases, and the isolated three-file baseline
passes 111. Frozen-source one-worker mutation follow-ups kill the original validation-call survivor
at `src/ui/questionnaire.ts:1001` and five original authored-value survivors at lines 1002–1003. One
value condition still survives, and two guard mutations still produce runner errors outside a test
run; all remain open.

### Toast document and interaction continuation

`test/ui-toast-document.test.ts` contains 84 cases covering local and independent foreign documents,
both adoption cleanup orders, owning-window events, application-root and explicit element actions,
canceled native/jQuery interactions, nested controller boundaries, current parts and source changes,
initial/live-write disposal, option getters, cleanup reentry, labels, focus and target constraints.
The original negative has 45 failures and 17 controls. Follow-up negatives preserve four
focus/parent failures and six target-constraint failures. The earlier clear test lacked an
enhanced-root precondition; its corrected version proves the failure before the fix.

The focused selection retains primary, resource, label and CSP controls. The six browser modes cover
explicit and automatic enhancement, actions, adoption, source disposal before adoption and facade
reacquisition. Existing F8/pause/Escape/swipe and accessibility tests remain selected in all three
engines. The first 24-case browser pass predates the final named-target correction. Full browser and
fast acceptance must bind the final documented inputs. All logs are retained under
`.git/jqstar/program-audit/quality-refresh-2026-09-19/ui-toast-*`.

### Feed document and native-loading continuation

`test/ui-feed-document.test.ts` contains 108 cases covering local/foreign documents, adoption,
application-root and explicit element actions, cancellation and constraints, current source/parts,
article labels, callback/getter ordering, provisional setup and late observer cleanup. The fresh
76-case public negative reproduced 71 failures and five controls. Follow-up negatives preserve six
source/acquisition failures, two observe-after-disposal errors and two ID-target/default-message
failures. The final focused selection passes 203 tests across the Feed primary, document, deferred
lifecycle, collection-resource, floating-label and native DOM-realm suites.

The six browser modes exercise explicit/automatic enhancement, named actions, adoption, disposal
before adoption and facade reacquisition. They check native More-button application loading,
keyboard boundaries and pending focus, current labels/state, owner events, real observer delivery,
render preservation and outgoing-root retirement. Existing backend pagination and accessibility
controls remain selected. The first run has six Chromium failures at an incorrect entry-realm
assertion. The isolated diagnostic proves real delivery, the exact sentinel and completion in all
engines: Chromium creates entries in the callback realm; Firefox/WebKit use the observer realm. The
corrected fixture checks native entry identity in either realm and the exact current target. All 24
focused browser cases pass. Type checking then required testing the two constructors through an
array to avoid a false impossible-type narrowing; final full checks bind that equivalent form.

Evidence is retained under `.git/jqstar/program-audit/quality-refresh-2026-09-19/ui-feed-*`. Full
browser/fast acceptance must match the final documented input snapshot. Earlier Toast acceptance is
historical after Feed edits. No full delivery, bundle, API, installed-package, performance or heap
acceptance follows from these focused checks.

The first full Feed fast report finds two additional contract failures while its matching browser
cohort passes all 1,086 cases. The corrected private observer-cleanup field avoids the runtime-only
minification list. The browser uses native attribute setup for its test-only click expression,
matching the existing action fixtures while retaining real declarative loading. The frozen public
expression inventory remains unchanged. Both contract tests join the focused selection: all 208
cases pass. Final acceptance requires new complete fast/browser evidence on the corrected snapshot.

The final identity review adds twelve public cases for ordinary append, removal/append, prepend,
external authored collisions, detached-subtree collisions and native title/description lookup in
both documents. The public negative has ten failures and 98 passing controls. A guarded local
allocator preserves authored IDs and uses unused suffixes for generated identifiers. All 220
focused/contract tests pass. The browser fixture also removes an article before appending and checks
unique IDs, retained article identity and native label resolution in all six modes.

### Resizable and Sortable document continuation

The Sortable document suite now has 90 cases. Eight same- and foreign-Document native drag cases
check handle-only starts, plain-text transfer and move effect, visible preview with unchanged
FormData, list-background commit, dragend cancellation, disabled/nested origins and a vetoed drop.
The established trusted drag after Document adoption still passes in desktop Chromium, Firefox and
WebKit; it checks real event trust, transfer data, drop, state and native form order. The synthetic
document events isolate transaction branches, while the browser case verifies the native drag path.

The preceding public document suites contained 68 Resizable and 82 Sortable cases. The initial
98-case negative has 89 failures and nine controls. Follow-ups cover input/event snapshots,
reentrant storage and native writes, provisional capture, error-sweeping cleanup, current anatomy
and item values, list-background drop, exact leading-hash values, nested controls, generated IDs and
keyboard focus. The combined primary/document/lifecycle/resource/realm/private-property selection
passes 267 tests in nine files. Types, browser fixtures and complete fast evidence are tracked by
owner 0006.

Six document modes per controller exercise explicit/automatic setup, root actions, both adoption
orders and facade acquisition in Chromium, Firefox and WebKit. Together with the established native
layout/workflow/accessibility controls, all 45 cases pass after correcting keyboard focus loss.
Additional trusted pointer and HTML drag interactions exercise adopted controls in real browsers.
The first trusted-drag diagnostic proves drop and native form order but reads DataTransfer before
the delegated handler; its observer is moved after delegation. No native drag implementation is
replaced with a synthetic test stub. All six trusted interaction cases now pass; typecheck and the
352-file lint boundary inventory pass unchanged. Final acceptance requires the complete browser and
fast reports to match one frozen input set. Current status and report paths are recorded in owner
0006 and its audit evidence ledger.

## First scoped observer acquisition

The shared suite in test/scoped-observer-acquisition.test.ts has 28 cases covering constructor and
getter failure/disposal, real late mutation delivery, queued callbacks, setup/cleanup error
retention, newer observer/map ownership, native removal, connection changes and installed controller
behavior. It verifies the native callback receiver and arguments, exact disconnect counts, and an
early-open Popover cleanup control. The initial corrected 20-case negative has fourteen failures/six
controls.

The replacement suite in test/ui-first-scope-replacement.test.ts covers all 49 families behind the
44 ownUIRecord call sites, plus five whole-root floating replacements. It verifies that replacement
setup completes and captured old parts remain untouched. An older interrupted acquisition may reject
with the documented unavailable-root error; arbitrary failures are not accepted. Countdown uses its
separate scope path and remains in the complete 50-family browser matrix. The existing navigation
and disclosure/step document suites add eight first-acquisition request controls.

Current focused verification passes 482 tests in 13 suites and 431 floating-control tests in ten
additional suites. Eighteen new browser cases pass across Chromium, Firefox and WebKit: late native
observation after disposal on return and throw; newer Resizable, Pagination and Stepper requests;
replacement handle ownership; retained observer count; and subsequent native DOM interactions. The
complete browser selection now contains 1,155 cases, preserving the earlier 50-family matrix and 93
component controls. These focused results are not full-checkpoint acceptance. Owner 0006 binds fresh
complete browser, fast/static and build evidence to the final documented input set.

### Document listener acquisition coverage

The public document-listener-acquisition suite exercises native registration rollback, mutable
capture options, method/option getter retirement, deterministic setup/cleanup errors, retired
callback injection, duplicate identity, native once/passive/signal behavior, replacement during
removal and nested registration. Installed-plugin controls include late native listener and observer
setup followed by disposal on both return and throw. Passing observer controls do not imply an
observer implementation change. The 50-case owning suite also checks that a `signal` option getter
which disposes the kernel cannot trigger native removal for a listener that was never added. A
one-worker frozen-source pass killed the original `src/kernel.ts:911` call-removal survivor. The
getter returns a real `AbortSignal` for the typed options contract; a second frozen pass retained
the same kill.

The document browser suite includes eighteen listener scenarios per engine. Six acquisition modes
verify actual native non-delivery after cleanup. Six identity modes cover duplicates, once, abort,
replacement during removal and both nested native registration orders. The options case compares 28
native/owned wheel-cancellation results on Window, Document, body and a regular element, then checks
getter order/receiver and actual once delivery. These use real Chromium, Firefox and WebKit
EventTargets; deliberate method wrappers expose interruption and do not claim ordinary native APIs
invoke arbitrary application callbacks. The preceding document-listener checkpoint selected 1,209
cases, including all 50 document families and 93 existing component controls. The staged plugin
cases expand the current selection to 1,242 cases, 414 per engine. Selection alone is not
acceptance: fast/browser/build evidence must bind the same saved files. The staged plugin checkpoint
does so on 924 input hashes: 4,909 units, 3,484 integration assertions, all fast/static gates, 1,242
browser passes and twelve isolated declaration/API reports. The verifier and result are
`verify-plugin-listener.mjs` and `plugin-listener-verified-checkpoint.json` in the ignored September
19 audit directory. Fixed package budgets and installed-consumer/delivery evidence remain open.

Five getter cases per engine exercise method/capture/once/passive/signal replacement, each with and
without a previously completed native owner. The public suite adds duplicate native-call reentry and
verifies that older pending handles cannot revoke newer ownership.

Staged plugin cancellation has separate public suites for cancellation during native add, method and
options getters, duplicate ownership, replacement listeners, exact resource accounting, and combined
native setup/cleanup failures. The original promoted tests fail nine cases with five controls on the
previous source; the corrected focused kernel/plugin/lifecycle selection passes 177 cases in six
files. Eleven browser scenarios per engine exercise ordinary cancellation, each getter (including a
value that is not callable), native add return/throw and completed/canceled duplicates. All 33 pass
in Chromium, Firefox and WebKit with zero skips or flakes. This focused result precedes the full
current-tree quality gate.

## Declarative event duration regression

`test/declarative.test.ts` checks all eight documented keyboard event modifiers against matching and
nonmatching keys. It also uses fake time to distinguish `debounce.0.05s` from an immediate call, to
verify unitless milliseconds and the 250ms fallback for invalid prefixes or suffixes, and to check
`throttle.0.05s` at the 49ms and 50ms boundaries. The fractional debounce case failed before the
parser preserved the complete argument after the first dot; the owning suite now passes 47 cases.
The nested-application and detached-cleanup suites pass another eleven cases after this correction.

The owning suite also starts `data-show` false, toggles it both ways, ignores a non-object
`data-class` value, and removes classes when keys disappear from the bound object. Its frozen-source
one-worker rerun kills six originally surviving or uncovered directive mutants; one condition on
class removal still survives and remains open. The suite also checks `data-attr:disabled` through
false, true, null, and undefined against the native button state. That frozen-source pass kills five
original survivors and all 17 selected attribute mutants. A bound color style also clears when its
value becomes null or undefined, then applies another concrete value. Its frozen-source pass kills
one original survivor and one originally uncovered mutant, with all 11 selected style mutants
killed. The suite also covers computed attribute removal and replacement, restoration of an earlier
signal, rendered binding updates, empty names, error location, and enumeration. The rendered output
stayed at `4` after the underlying signal returned to `9` before the computed descriptor change
notified its dependents. With that correction, the main owning suite passes 54 cases. The
frozen-source follow-up kills four original computed-setup survivors and all 18 selected mutants;
the separate corrected-source pass kills all 13 mutants in the descriptor notification path. Its
frozen checkout skips only the rendered-value regression and two duration cases that require the
separately corrected source.

## Reactive dependency regression

`test/reactivity.test.ts` checks reads outside an effect, branch-dependent subscriptions, no-op and
rejected writes, deletion of present and absent keys, stopped effects after later writes, and direct
invocation of a stopped runner. Its frozen-source one-worker pass killed ten original survivors
across dependency cleanup, write notification, and property deletion. One duplicate
dependency-registration mutation remains open; that pass killed 29 of 30 selected mutants. A
separate stopped-effect pass killed one more original survivor and four of seven selected mutants;
three cleanup or guard mutants remain open. The owning and isolated frozen suites pass 12 cases.

## Select navigation and reset regression

`test/ui-select.test.ts` opens the native-backed Select, moves its active option with a pointer, and
checks that moving over a disabled option leaves the enabled option active without committing a new
form value. It also checks initial focus with a selected disabled value, a selected enabled value
later in the list, and no enabled options. Form-reset cases check change detail, cancelability,
unchanged resets, and suppression of stale input after a change callback starts newer work or
silently edits the native value. Named-action cases check implicit values, explicit element roots,
missing values, and wrong-kind targets. The main and frozen owning suites pass 17 cases. One-worker
frozen reruns kill five original survivors in the pointer active-option guard, six in initial
active-option choice, eight in reset notifications, and seven in named-action argument handling. A
separate undefined-value mutation remains open. These focused results supplement the unchanged
full-run denominator.

## Doctor discovery input regression

`test/doctor-discovery.test.mjs` exercises workspace expansion and installed package enumeration on
temporary filesystems. A scalar `workspaces` declaration was silently skipped before the new input
guard; the owning test failed on that behavior and now confirms `JQS_INPUT_INVALID`. The suite also
checks accepted workspace arrays, pnpm workspace patterns, ignored directories, duplicate package
aliases, and scan bounds. The five affected doctor suites pass 146 cases together.

## Doctor open-failure regression

`test/doctor-data.test.mjs` removes a file after path resolution and before `MetadataReader.read()`
opens it. The reader must report `JQS_INPUT_INVALID` without masking it during cleanup. The owning
suite passes 13 cases. A one-worker frozen-source rerun of `bin/doctor/data.mjs:185` killed the
original optional-cleanup survivor; the separate original cleanup `RuntimeError` remains open.

## Doctor input and resource limits

`test/doctor-data.test.mjs` accepts ordinary spaces and exact path, file-size, file-count,
workspace-file, cumulative-byte, and directory-entry limits, then checks the next item is rejected.
It also rejects malformed UTF-8 and BOM-prefixed JSON. The reader must avoid allocating the full
configured file limit for a small file. The four affected doctor suites pass 138 cases. An initial
one-worker frozen-source pass over the limit checks killed 19 original survivors and one originally
uncovered mutant. A later pass over `bin/doctor/data.mjs:164` killed all three allocation mutants,
including the original `Math.min` to `Math.max` survivor.

## Doctor path and canonical safety

`test/doctor-data.test.mjs` sorts object keys inside arrays, rejects a symlink to the scan root's
immediate parent, and, where `O_NOFOLLOW` is available, rejects a symlink swapped in after path
resolution. The owning suite passes 13 cases; four related doctor suites pass 138. A one-worker
frozen-source pass over `bin/doctor/data.mjs:70-74`, `:83`, and `:155` killed six original
survivors. Two redundant root-suffix mutations are reviewed individually; Windows-style parent
traversal and nonblocking FIFO guards remain open.

## Runtime root event routing regression

`test/runtime.test.ts` checks that a UI rule using `&` handles an event on the application root. Its
delegated-action case also clicks an unrelated child and verifies that a selector-bound action does
not run for that child. The owning suite passes 31 cases. A one-worker frozen-source rerun of
`src/runtime.ts:409-412` kills all six selected mutants, including four original survivors and two
originally uncovered mutations. The narrower first pass is retained separately; both cases run
against the frozen source without changing the original full-run denominator.

## Runtime preserved-root lifecycle regression

`test/runtime.test.ts` also checks that releasing a tree retains mounted elements and active backend
requests inside a preserved root while releasing siblings. Remounting skips both already mounted
descendants and new matching descendants under that root. Separate cases check an unmount-only UI
rule and destruction from a mount callback. The runtime suite passes 36 cases. A one-worker
frozen-source pass over `src/runtime.ts:210-218` and `:482-489` killed 13 original survivors. Two
surviving self-equality mutations are individually reviewed as equivalent because
`Element.contains(self)` remains true; one mounted-ownership guard remains open. The original
full-run statuses and denominator are retained.

## Signal patch boundary regression

`test/patch.test.ts` checks `onlyIfMissing` with existing scalar and null-removal targets, existing
nested values, a missing nested object, and an absent null key. The owning suite passes 22 cases. A
one-worker frozen-source pass over `src/patch.ts:26-35` matched all 18 original mutants and killed
four original survivors in the null and nested-object guards. It classified 17 Killed and one
Timeout; that timed-out mutant was already Killed in the original full run, whose status remains the
denominator authority.

## Selector-free patch target scope

`test/patch.test.ts` also patches its application root by ID when another element with the same ID
appears earlier in the document. It verifies the document lookup returns the external element first,
then confirms the patch still replaces the supplied root. A separate case rejects an ID match that
exists only outside the application. The owning suite passes 24 cases. A one-worker frozen-source
pass over `src/patch.ts:73-77` kills all seven selected mutants, including three original survivors
in root preference and containment. Two narrower passes remain archived because the first lacked
duplicate-ID coverage and the second fixture did not actually shadow the root in jsdom.

## Malformed SVG patch rejection

`test/patch.test.ts` rejects an unterminated SVG fragment before it can change the selected target.
The owning suite passes 25 cases. A one-worker frozen-source pass over `src/patch.ts:59-61` killed
all four selected mutants, including one original survivor that removed the parser-error guard and
one originally uncovered markup-error mutation.

## Selector-free patches with mixed IDs

`test/patch.test.ts` supplies text, a no-ID element, an unmatched nonempty ID, and a matching ID in
one selector-free patch. Only the matching element changes; the unmatched element is not inserted.
The owning suite passes 25 cases. A one-worker frozen-source pass over `src/patch.ts:220-223` killed
all four selected mutants, including the original survivor that removed the unmatched-target guard.

## Unowned-document patch transactions

`test/patch.test.ts` runs replace, selector-free morph, and remove patches in a same-realm document
without a registered kernel. The owning suite passes 26 cases. A one-worker frozen-source pass over
`src/patch.ts:100`, `src/patch.ts:160`, and `src/patch.ts:192` killed all three original survivors
that required a transaction where one was absent.

## Selector-required element patch modes

`test/patch.test.ts` rejects `inner`, `append`, `prepend`, `before`, and `after` without a selector
and checks that the target remains unchanged. The owning suite passes 31 cases. A one-worker
frozen-source pass over `src/patch.ts:142-146` killed all five original survivors in the mode guard.
Three other mutants survived this narrower pass but were already Killed in the original full run.

## Select option-click commit and cancellation

`test/ui-select.test.ts` checks that an option click with canceled `before-change` leaves the native
value and open popup intact, while a committed click changes the value and closes the popup. The
owning suite passes 19 cases. A one-worker frozen-source pass over `src/ui/select.ts:602` killed all
seven selected mutants, which were all Survived in the original full-run event stream. The frozen
source and embedded report bytes have the same SHA-256; the full-run denominator remains unchanged.

## Dynamic backend-request argument rejection

`test/fetch.test.ts` rejects missing, non-string, empty, and whitespace-only dynamic `@get` URLs and
non-object options before a request reaches `fetch`. The owning suite passes 18 cases. A one-worker
frozen-source pass over `src/fetch.ts:587-590` killed all 17 selected mutants, including seven
original survivors and four originally uncovered mutations. The original full-run denominator is
unchanged.

## Overlapping action observation scopes

`test/observation.test.ts` settles an outer action while an inner action shares its context. A
request remains parented to the inner action, and a later request has no parent after the inner
action settles. The owning suite passes 23 cases. A one-worker frozen-source pass over
`src/observation.ts:472` killed all four original survivors in the action-scope cleanup guard.

## Persistence field-codec boundaries

`test/persist-data.test.ts` accepts 128 distinct fields, a 256-character path, two distinct fields
in unsorted order, and a valid `undefined.child` path. It rejects 129 fields, non-string paths,
malformed leading or trailing characters, and a parent/child overlap declared in reverse order. The
owning suite passes 43 cases. A one-worker frozen-source pass over `src/persist/codec.ts:26-40`
killed all 64 selected mutants, including 12 original survivors matched by source and mutation
signature. The original full-run denominator remains unchanged.

The same owning suite checks that persistence options reject an invalid codec identifier, default to
`flushOnDispose: true`, and preserve an explicit `false`. A one-worker frozen-source pass over
`src/persist/envelope.ts:33,71` killed all three original survivors at those lines.

The suite also checks zero and invalid clock values, an expiry equal to save time, malformed
revision origins, mismatched codec identity, and migration failure, checkpoint, and output-size
behavior. It passes 44 cases. A second one-worker frozen-source pass over the affected envelope
lines killed eight more original survivors. Four remaining mutations are individually reviewed as
equivalent in the mutation audit: the object-type guard is followed by exact named-field checks, the
missing-migration path produces the same migration error through the pipeline, and equality is
handled before both revision comparisons.

## Stable plugin version ranges

`test/plugin.test.ts` accepts multi-digit stable version segments and padded caret ranges, rejects
letters in any version segment, and checks precise diagnostics for invalid versions and composite
ranges. The owning suite passes 62 cases. A one-worker frozen-source pass over
`src/plugin.ts:140,193-201` killed all 36 selected mutants. Exact signature matching links five
original survivors, three original timeouts, and one originally uncovered mutant to those kills; the
original full-run classifications remain visible in its report.

The same suite rejects leading/trailing punctuation in ordinary and official plugin names and
accepts an official single-segment name. A separate one-worker frozen-source pass over
`src/plugin.ts:138-139` killed all 18 selected mutants, including four original survivors in the
name-pattern anchors.

A candidate that places the same target in both `before` and `after` fails before installation and
does not remain in the host. A one-worker frozen-source pass over `src/plugin.ts:290-291` killed all
four selected mutants, including one original survivor, one timeout, and one uncovered mutant.

## Final mutation audit

The one-time, full-scope Stryker 10.0.0 audit of the frozen 2026-09-24 source generated 56,731
mutants across 136 selected source files and finished in 18 hours 38 minutes with eight workers. Its
final JSON reports 38,814 Killed, 14,233 Survived, 2,860 NoCoverage, 693 Timeout, and 131
RuntimeError; none are Pending or Ignored. Stryker's JSON contains 123 files with mutants and omits
13 selected files with zero reported mutants. The validator checks every selected source hash and
the exact omitted-file list. The resource watchdog observed 61–80% free memory without a stop.

The preserved report is the denominator authority. Signature-linked, source-matched results from 97
focused reports close 1,415 original non-killed mutants; 38 further mutants have individual
equivalence reviews. The disposition register retains 16,464 open original outcomes: 13,499
Survived, 2,172 NoCoverage, 666 Timeout, and 127 RuntimeError. An open mutant marks a remaining test
or analysis gap; it is not by itself proof of a product defect. The audit also used separate
command-runner passes for CLI and built-server entry points that the full Vitest process could not
cover. Ticket 0053 records the source-bound reports, confirmed fixes, selected follow-ups,
equivalence reasoning, and limits. Local machine and HTML reports are kept under
`.git/jqstar/mutation-audit/final/` and are not shipped with the package.

Mutation testing remains outside `npm run check` and the ordinary delivery and release gates.

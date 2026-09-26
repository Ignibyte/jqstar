# Program audit evidence

## Package-size reconciliation

Ticket 0055's first package candidate externalizes 30 repeated source texts from built maps into
`dist/sources/`. An actual extracted tarball verifies all 30 file digests and 88 map references.
Package quality measures 3,091,755 packed bytes, 9,898,789 unpacked bytes and 297 files, within the
unchanged 3,174,000 packed, 11,184,000 unpacked and 324-file allowances. The expanded UI graph
cannot meet the older runtime ceilings by map deduplication or minifier tuning. Ticket 0055 records
nine measured one-time size transitions: four shipped bundles, the installed root consumer and four
compressed modular consumers. The ratchet allows only those old/new pairs. The actual package run
passes all 13 checks, including ESM/CommonJS/TypeScript/QUnit and Chromium/Firefox/WebKit consumers;
the release run passes seven checks and reproducible tarballs. Delivery report
`2026-09-24T05-25-23-228Z-18075/report.json` passes all 12 gates on matching 943-file fingerprints,
including the 16-control detector suite and all 1,717 browser cases across eight projects. It writes
a receipt; the ticket workflow requires another delivery run after final documentation edits.

## Browser-first verification policy

Full `npm run check` report `2026-09-24T03-29-18-780Z-17137/report.json` starts and ends on the same
939-file fingerprint `97e1397f4ead47bdc2f9be2b6a28763438838f8aea06edb8233756efdcccb08c`. The
Chromium component gate passes all 76 selected cases, and the eight-project browser matrix passes
all 1,717 cases, including 563 per desktop engine, without failure, retry or skip. Ticket, runner,
format, property, static, self-hosted and release gates also pass. Package quality still fails three
inherited size checks: 3,417,877 packed bytes against 3,174,000 allowed, 558,894 Mobile UMD bytes
against 462,311 reviewed, and 634,769 installed-root bytes against 542,720. The package-budget
isolation control is the only failed detector of sixteen because all three package checks are
already red. No delivery receipt is eligible.

Ticket 0054 changes the active quality roster: fast runs the Chromium Component Lab suite with exact
execution evidence without retries; delivery also runs all eight browser projects, and full audit
repeats cross-engine browser tests. Broad unit and coverage score gates are no longer mandatory.
Focused direct tests and optional coverage diagnostics remain available. Mutation testing remains
out of the active workflow under tickets 0048 and 0053. The dated reports below were produced under
the earlier quality roster. The independent final program-audit adapters still encode that older
coverage requirement and must be reconciled before the unfinished program audit can close.

The standalone `npm run test:coverage` diagnostic passes after executing 5,059 Vitest cases and
classifying 118 runtime coverage files. It records 96.96% global line coverage and 54 changed-code
misses without turning those scores into a delivery failure. Fast report
`2026-09-24T03-26-40-348Z-8282/report.json` passes six gates with 76 selected and executed Component
Lab cases, all passing without retry or skip. The final documented-tree fast report is recorded in
the local quality-run index after these edits.

## September 23 Sortable native drag transaction continuation

Full `npm run check` report `2026-09-24T02-21-51-421Z-81002/report.json` starts and ends on the same
933-file fingerprint `d7546e2e72717d62505fcd145e7904d279e1e81dd8a7cc6f8d8db280e66c49a3`. The run
passes 5,059 units, property, self-hosted, release and all 1,717 browser cases across eight
projects, including 563 per desktop engine without failure, retry or skip. Coverage fails 54
changed-code checks in 34 files, with 877 uncovered changed lines and 63 functions. Package quality
reports 3,417,651 packed bytes against 3,174,000 allowed, a 558,894-byte Mobile UMD against 462,311
reviewed, and a 634,769-byte installed root against 542,720. Package-budget remains the sole failed
detector of sixteen. Format and static spelling also fail on two documentation edits made after the
preceding passing fast report; both are corrected in the final documentation revision and verified
by a new fast report. No delivery receipt is eligible.

Owner 0006 adds eight same- and foreign-Document Sortable native drag transaction cases. The 90-case
document suite passes; a selected trusted drag after Document adoption passes in desktop Chromium,
Firefox and WebKit. The tests cover transfer setup, preview-only order, native form values,
background drop, drag cancellation, disabled and nested origins, and a vetoed commit. Sortable's
uncovered changed lines fall from 84 to 62 and functions from eight to two; across the library
uncovered changed lines fall from 899 to 877 and functions from 69 to 63. Production source, fixed
budgets and public signatures remain unchanged. Wider program criteria stay open.

## September 23 external native floating-state continuation

Full `npm run check` report `2026-09-24T01-32-50-157Z-66628/report.json` starts and ends on the same
933-file fingerprint `31898c4b02097f34d19a0f60e3fa2ba96df0c68c4b5fb76284948460f757c8de`. Format,
5,051 units, property, static, self-hosted, release and all 1,717 browser cases pass across eight
projects, including 563 in each desktop engine without failure, retry or skip. Coverage fails 54
changed-code checks in 34 files, with 899 uncovered changed lines and 69 functions. Package quality
reports 3,417,476 packed bytes against 3,174,000 combined allowances, a 558,894-byte Mobile UMD
against 462,311 reviewed bytes, and a 634,769-byte installed root bundle against 542,720.
Package-budget isolation is the sole failed detector control of sixteen; no delivery receipt is
eligible.

Owner 0006 adds shared direct tests for external native hide/show in Tooltip, Hover Card, Popover,
Menu and Context Menu, and lost-overlay restoration with focus and viewport positioning in Popover
and Hover Card. The shared suite passes 122 tests; one actual-browser case passes in Chromium,
Firefox and WebKit for native Popover and Hover Card events, state, trigger ARIA and outside
dismissal. TypeScript and focused ESLint pass. Standalone delivery-mode coverage still fails 54
checks in 34 files, but uncovered changed lines fall from 937 to 899 and functions from 73 to 69. No
production source or fixed quality limit changes in this wave. Package sizes and wider program
criteria remain open.

## September 23 multiline initializer coverage attribution

Full `npm run check` report `2026-09-24T00-44-21-973Z-66209/report.json` starts and ends on the same
933-file fingerprint `71c9d9acbacc350d92755680611e5c0389b68562390e447d75288673c7a47153`. Format,
5,044 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 in each desktop engine without failure, retry or skip. Coverage fails 56
changed-code checks in 34 files, with 937 uncovered changed lines and 73 functions. Package quality
reports 3,417,318 packed bytes against 3,174,000 combined allowances, a 558,894-byte Mobile UMD
against 462,311 reviewed bytes, and a 634,769-byte installed root bundle against 542,720.
Package-budget isolation is the sole failed detector control of sixteen; no delivery receipt is
eligible.

The coverage evaluator now maps a changed multiline `const` declaration header to executed raw
statement counters inside that declaration's initializer and records the exact statement IDs, lines
and counts. Direct controls keep zero-hit, absent-map, unrelated-statement and explicit-zero headers
red; the focused quality and independent audit suites pass 101 tests. Retained-raw replay and full
standalone `npm run test:coverage` agree: 40 headers in 19 files gain hit evidence, reducing
changed-code failures from 75 in 35 files to 56 in 34. The remaining uninitialized `src/kernel.ts`
field has no mapped hit; 937 uncovered changed lines and 73 functions remain unchanged. Fixed
package-size failures and wider program criteria remain open.

## September 23 Form and native Menu interaction continuation

Full `npm run check` report `2026-09-23T23-55-50-488Z-65952/report.json` starts and ends on the same
933-file fingerprint `48c097feb1b0674803d45bc65c7341f3429fac463b12c01a2dc5a85c7169951d`. Format,
5,038 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 in each desktop engine without failure, retry or skip. Coverage still fails
75 changed-code checks in 35 files, with 937 uncovered changed lines and 73 functions. Package
quality reports 3,417,197 packed bytes against 3,174,000 combined allowances, a 558,894-byte Mobile
UMD against 462,311 reviewed bytes, and a 634,769-byte installed root bundle against 542,720.
Package-budget isolation is the sole failed detector control of sixteen because the other package
failures remain present. No delivery receipt is eligible.

Owner 0006 adds direct public evidence for Form `clear-errors` with a wrong-kind explicit element
and valid field names: restoring the old resolver makes the action clear the nearby form instead of
rejecting. The corrected three component suites pass 29 tests; one selected real-browser case passes
in Chromium, Firefox and WebKit for native validity, Menu focus constraints, ContextMenu-key
invocation and canceled touch long-press. Menu also reflects external native popover state and
`aria-expanded` without extra lifecycle notifications. TypeScript, focused ESLint and the fixed
lint-boundary ratchet pass. Standalone delivery-mode coverage still fails 75 checks in 35 files, but
uncovered changed lines fall from 965 to 937 and functions from 77 to 73. The prior fixed package
overruns and full-program criteria remain open.

## September 23 structural explicit-action routing

Full `npm run check` report `2026-09-23T23-00-43-821Z-58338/report.json` starts and ends on the same
933-file fingerprint `c0b92ce1edaf173a30e021c8af8eeef7158b675c86ce1e51af8930eabdd6444b`. Format,
5,031 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 in each desktop engine without failure, retry or skip. Coverage fails 75
changed-code checks across 35 files, with 965 uncovered changed lines and 77 functions. Package
quality reports 3,417,139 packed bytes against 3,174,000 combined allowances, a 558,894-byte Mobile
UMD against 462,311 reviewed bytes, and a 634,769-byte installed root bundle against 542,720.
Package-budget isolation is the sole failed detector control of sixteen because the two other
existing package failures remain present. No delivery receipt is eligible.

Owner 0006 tests Dialog, Form, Collapsible, Accordion, Menu, Context Menu and Toggle named actions.
Eight original-source public probes fail for wrong-kind element redirects and a separate Toggle
`press` probe fails from target/value misclassification. The narrow five-controller correction uses
existing kind-aware resolvers and recognizes an explicit element in Form `set-errors` and Toggle
`press`. The six corrected component suites pass 46 tests, TypeScript and focused ESLint pass, and
one selected native-browser case passes in Chromium, Firefox and WebKit. The fixed package limits
and wider program criteria remain open. Standalone delivery-mode coverage retains 75 failed checks
across 35 changed source files, while uncovered changed lines fall from 974 to 964 and uncovered
functions from 79 to 77. Disclosure, Form, Dialog and Menu each gain direct coverage of their
corrected action boundary.

Fast report `2026-09-23T22-57-30-642Z-43847/report.json` passes all six lanes and 5,031 units on
matching 933-file fingerprint `91d719c848c312248d9c1a40fd215c838d6ede3ac4c763c4422d2cb82594d555`.
The preceding fast report failed one API Extractor line-reference snapshot; its generated report was
refreshed without changing declarations. The full delivery result is recorded above.

## September 23 additional explicit-action routing

Full `npm run check` report `2026-09-23T22-05-28-440Z-41196/report.json` starts and ends on the same
933-file fingerprint `c1c0bfe1a18acaa65107e2cb21080005d19f21e8f942b4dfa14c31f1042f5202`. Format,
5,022 units, property, static, self-hosted, release and all 1,711 browser cases pass across eight
projects, including 561 per desktop engine without failure, retry or skip. Coverage still fails 75
changed-code checks across 35 files. Package quality reports 3,417,612 packed bytes against
3,174,000 combined allowances, a 558,929-byte Mobile UMD against 462,311 reviewed bytes, and a
634,857-byte installed root bundle against 542,720. Package-budget is the sole failed detector
control of sixteen. No delivery receipt is eligible.

Direct comparison of that build with unchanged `config/quality-budgets.json` also finds masked
limits: 11,738,486 unpacked bytes against 11,184,000, UI ESM 409,772 and CommonJS 408,122 against
318,464 each, raw UMD 558,929 against 464,896, and CSS 170,066 against 169,984. The package budget
check stops at packed bytes, so these are artifact measurements, not additional reported gate
statuses. Its 265 files remain within the 324-file cap.

Owner 0006 corrects explicit native-element routing in ten more UI action resolvers and native-root
target/value overloads in Tree, Carousel and File Upload. Thirteen new public tests fail against the
original source, proving ten wrong-kind redirects and three overload failures. The corrected eleven
component suites pass 87 tests; TypeScript and focused ESLint pass. One selected browser case passes
in Chromium, Firefox and WebKit, checking rejection and native form, tree, tab, carousel, file and
popover state. Standalone delivery-mode coverage executes the inventory and retains 75 failing
changed-code checks across 35 files, while uncovered changed lines fall from 985 to 974 and
uncovered changed functions from 81 to 79. Fast report `2026-09-23T21-59-09-250Z-12003/report.json`
passes all six lanes and 5,022 units on matching 933-file fingerprint
`581e01a9ea5ba568112b70bdd4bec0853f0f85faa12e26c6c4bbe8fc1df50724`. Fixed package limits, other
audit criteria and the full delivery failures above remain open for this wave.

## September 23 remaining explicit-action routing

Full `npm run check` report `2026-09-23T21-10-29-609Z-23479/report.json` starts and ends on the same
933-file fingerprint `a9095ecf9e13991ecffea94cf358196e942f945eb43c86ca53e74214d5c68a5b`. Format,
5,009 units, property, static, self-hosted, release and all 1,708 browser cases pass; the browser
run covers eight projects, including 560 cases in each desktop engine, with no failure, retry or
skip. Coverage fails 75 changed-code checks across 35 source files. Packed bytes (3,417,751), Mobile
UMD (559,168 versus 462,311) and installed root bundle (635,321 versus 542,720) exceed the fixed
package limits. Package-budget isolation is the sole failed detector control among sixteen. The
report has no eligible delivery receipt.

Fast report `2026-09-23T21-07-02-306Z-8804/report.json` passes all six lanes and 5,009 units on
matching 933-file start/end fingerprint
`4bfa78d79e38e6515c25be13dc078ef0c7e560f4d04c4718ffbff832bbe824b2`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; the full delivery result is recorded above.

Owner 0006 corrects wrong-kind HTMLElement redirects in Transfer List, Log Viewer, JSON Viewer,
Pagination, Message Scroller and Countdown named actions, plus Message Scroller's matching native
root target/value overload. Six original-source wrong-kind cases and the separate
`follow(root, false)` case fail before correction. The corrected six-suite selection passes 43
tests, TypeScript and focused ESLint pass, and one selected browser case passes in Chromium, Firefox
and WebKit with native form, disclosure, log, pagination, follow and timer state. Standalone
delivery-mode coverage improves from 76 to 75 changed-code failures across 35 source files. Fixed
package limits, the other changed sources and wider program criteria remain open.

## September 23 Color Picker and Editable continuation

Full `npm run check` report `2026-09-23T20-20-59-893Z-21133/report.json` has matching start/end
933-file fingerprint `598e998e4ce4b3a89a218ec57179f32222559f6911c71e03448030173f274740`. Format,
5,002 units, property, static, self-hosted, release and all 1,705 browser cases pass, including 559
per desktop engine without failure, retry or skip. Coverage fails 76 changed-code checks in 35 of 60
changed source files. Packed bytes (3,417,931), Mobile UMD (559,332) and installed root bundle
(635,618) exceed fixed limits. Package-budget is the only failed detector control among sixteen; no
delivery receipt is issued. Full-program acceptance remains open.

Fast report `2026-09-23T20-17-52-346Z-6504/report.json` passes all six lanes and 5,002 units on
matching 933-file start/end fingerprint
`46816f1495c82ec2515ddb1ed8017cf9bec507ca39048e4e35ea13181b50ef4c`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; full delivery is still required.

Owner 0006 fixes wrong-kind native element targets in Color Picker and Editable named actions. Two
direct public negatives fail on the original source; 21 corrected focused cases pass. New native
behavior tests cover authored disabled swatches, disabled input updates, CSS keyword rejection,
server-patch reentry, listener replacement, non-element delegated clicks, and Editable selection,
validity and change-event reentry. The four related suites pass 266 cases. The selected browser case
passes in Chromium, Firefox and WebKit for explicit, implicit, wrong-kind and native form behavior.
TypeScript and focused ESLint pass. Standalone delivery-mode coverage improves from 77 failures in
36 changed source files to 76 in 35, clearing Color Picker; Editable retains four defensive
stale-controller entry checks. Fixed package limits, other changed sources, wider program criteria
and exact-tree fast/full delivery remain open.

## September 23 Password Field and Sidebar continuation

The corrected full `npm run check` report `2026-09-23T19-21-50-667Z-9825/report.json` has matching
start/end 933-file fingerprint `b7d5f872fc12f13592c448f34bf7ad835252191e7c2fd5164d39c46de685865a`.
Format, 4,991 units, property, static, self-hosted, release and all 1,705 browser cases pass, with
559 per desktop engine and no failure, retry or skip. Coverage fails 77 changed-code checks in 36 of
60 changed source files. Packed bytes (3,418,078), Mobile UMD (559,386) and installed root bundle
(635,716) exceed fixed limits; package-budget is the sole failed detector control among sixteen. No
delivery receipt follows. The first full report `2026-09-23T18-44-45-373Z-42853/report.json` caught
three unformatted audit paragraphs, corrected with Prettier and a passing standalone
`npm run format:check` before the repeated full run.

The combined tree passes all six `npm run quality:fast` lanes and 4,991 units in
`2026-09-23T18-41-43-096Z-28287/report.json`, with matching 933-file start/end fingerprint
`5b15e06b338a7bfaab9bd27e1edd54273f1fb63cef17a6a3e004eb7104aa3786`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; full delivery is still required.

Owner 0006 corrects wrong-kind native element targets in Password Field and Sidebar named actions.
Two original-source public negatives fail while 13 controls pass; the corrected focused selection
passes 20 cases. The new cases check native type re-enhancement, newer visibility reentry, replaced
listener ownership, mobile backdrop focus and storage callback invalidation. Full standalone
delivery-mode coverage executes its inventory and falls from 80 failures in 37 files to 77 in 36,
clearing Password Field. Sidebar retains one defensive stale-controller line. One selected browser
case passes in Chromium, Firefox and WebKit with native password and Sidebar state, implicit actions
and wrong-kind rejection. TypeScript, focused ESLint and the unchanged lint-boundary ratchet pass;
the first focused ESLint run caught three redundant boolean comparisons in the browser fixture and
they were corrected. Fixed package limits, the other changed sources, wider program criteria and
exact-tree delivery remain open.

## September 23 shared lifecycle and preserved-focus continuation

Owner 0006 tests reset cancellation reentry, combined UI acquisition/cleanup failures,
detached-Document rejection and owner disposal during native preserved-focus listener registration.
Both focused suites pass 41 cases; TypeScript, focused ESLint and the unchanged lint-boundary
ratchet pass. Full standalone delivery-mode coverage executes its inventory and reduces the backlog
from 81 to 80 changed-code failures across 37 files. The two targeted owners retain only a default
no-op function and an uninitialized class field absent from V8 maps. Those entries need a principled
measurement or source-contract resolution; no placeholder-only test or budget change is made. Fixed
package limits, the other changed sources, wider program criteria and exact-tree delivery remain
open.

## September 23 native value-action and coverage continuation

Owner 0006 corrects native root targets in Input OTP, Search Field, Tags Input, Stepper and Multi
Select value-bearing named actions. Five direct public negatives fail before the correction while 21
controls pass; 39 focused cases now pass. Full standalone delivery-mode coverage executes its suite
and falls from 87 failures in 39 files to 81 in 37. Search Field and Tags Input clear; Input OTP,
Stepper and Multi Select retain measured changed-code entries. One selected real-browser case passes
in Chromium, Firefox and WebKit, checking native form values, selected options, Stepper state, an
implicit value and wrong-component rejection. TypeScript, focused ESLint and the unchanged
lint-boundary ratchet pass. Fixed package limits, the other changed sources, wider program criteria
and exact-tree delivery remain open.

Fast report `2026-09-23T17-35-10-849Z-13542/report.json` passes all six lanes and 4,980 units on
matching 933-file fingerprint `058b6e5997c8733f2b0694d9db4bcfcd30d8a78ae266f7e733a180b2d84acf76`.
Owner 0006 and umbrella 0033 pass Code-phase validation; full delivery is still required.

Full `npm run check` report `2026-09-23T17-38-59-853Z-28268/report.json` has matching start/end
933-file fingerprint `216b3cd48bcc4d3e06bd9943f7b31e780202c394e37369f04703ef47c6c884e9`. Format,
4,980 units, property, static, self-hosted, release and all 1,705 browser cases pass, including 559
per desktop engine without failure, flake or skip. Coverage fails 81 changed-code checks in 37 of 60
changed source files. Packed (3,417,532), Mobile UMD (559,441) and installed root bundle (635,815)
exceed fixed limits; package-budget isolation is the sole failed detector control among sixteen. The
run issues no delivery receipt and program acceptance remains open.

## September 23 native-control action and coverage continuation

Owner 0006 corrects explicit native element targets in the Number Field, Time Picker, Rating,
Toggle, Toggle Group and Toolbar named-action overloads. Five direct public negatives fail before
the correction while 24 controls pass; the corrected focused selection passes 44 cases. Full
standalone delivery-mode coverage executes its suite and falls from 93 failures in 44 files to 87
in 39. All five targeted sources now clear. A selected real-browser case passes in Chromium, Firefox
and WebKit, checking native values, Toolbar focus, an implicit form and wrong-component rejection.
TypeScript and focused ESLint pass. Fixed package limits, the other 39 changed sources, broader
program criteria and exact-tree delivery remain open.

Fast report `2026-09-23T16-32-48-871Z-13629/report.json` passes all six lanes and 4,962 units on
matching 933-file fingerprint `4a9521d58b2efb5fb74a119d6fdca61b71af6418dc71744b1b7314941934c24e`.
Owner 0006 and umbrella 0033 pass Code-phase validation; complete delivery is still required.

Full `npm run check` report `2026-09-23T16-37-46-727Z-28545/report.json` has matching start/end
933-file fingerprint `49226d997b79b2ac335a31c475aa820eb04c223570d72c1ef5407182e0b74274`. Format,
4,962 units, property, static, self-hosted, release and all 1,705 browser cases pass, including 559
per desktop engine without failure, flake or skip. Coverage fails 87 changed-code checks in 39 of 60
changed source files. Packed (3,417,336), Mobile UMD (559,527) and installed root bundle (636,018)
exceed fixed limits; package-budget isolation is the sole failed detector control among sixteen. The
run issues no delivery receipt and program acceptance remains open.

## September 23 changed-code coverage recovery

Owner 0006 adds direct Clipboard write cancellation, floating owner handoff/reconciliation and
Pagination element-target action tests. The focused 128 tests, TypeScript and focused ESLint pass.
Standalone delivery-mode coverage on the full unit inventory reduces changed-code failures from 96
across 47 source files to 93 across 44. All three targeted files now clear without a production,
threshold or package-budget change. The remaining changed-source coverage and three fixed package
size overruns still prevent full-program acceptance; exact-tree fast and `npm run check` evidence
follows in the owner/umbrella ledger.

Fast report `2026-09-23T14-33-47-425Z-41290/report.json` passes all six lanes and 4,942 units on
matching 933-file fingerprint `80b36bfc5ae534c6907e4b453f9fdf8c9278d0c0e36715666247a36577720056`;
the owner and umbrella tickets pass Code-phase validation against it. The corrected full
`npm run check` report `2026-09-23T15-12-21-834Z-21004/report.json` starts and ends on matching
933-file fingerprint `351d1d9da3efe73ae7446a8ddcc83bd85ff094214856e698d3fd32df37ae2627`. Format,
4,942 units, property, static, self-hosted, release and all 1,702 browser cases pass, including 558
per desktop engine without failure, flake or skip. Coverage still fails 93 changed-code checks in 44
of 60 changed source files. Fixed packed (3,416,696), Mobile UMD (559,623) and installed root bundle
(636,122) limits fail; package-budget isolation is the only failed detector control among sixteen.
There is no delivery receipt or full-audit acceptance.

## September 23 actual-host UI Countdown continuation

Owner 0016 adds an opt-in UI installation to the real Turbo/htmx fixture and a server-rendered
incoming Countdown. A fresh all-entry build and complete TypeScript pass. The selected twelve
version/engine cases pass with timer cleanup before native outgoing removal, new incoming timer and
preserved neighbor identity; the existing 30-case host baseline also passes. Two no-bridge negatives
render successfully but fail before-removal cleanup. The exact 928-file delivery run
`2026-09-23T05-27-52-448Z-6211/report.json` passes all 1,654 browser cases across eight projects,
with no failures, skips or flakes. It remains red on 96 inherited changed-code coverage checks,
three unchanged package size limits and the package-budget detector isolation control; its other 15
detector controls pass. There is no receipt. This is one timer-family slice. The remaining UI
resource families and actual-host generic JSON/HTML and SDK SSE remained open at that checkpoint.

Owner 0016 adds a second actual-host slice for Message Scroller. Its content observer and two UI
listeners release before native Turbo/htmx removal; the detached root stops reporting new messages
and Latest actions, and the incoming root acquires distinct live resources. Twelve pinned
host/version/engine cases pass, as does the 54-case combined host selection. Two no-bridge Chromium
diagnostics fail the timing assertion after the host removes the root. Pointer and other
asynchronous UI paths, generic JSON/HTML and SDK SSE remained open at that checkpoint.

That 929-file tree passes all fast gates and 4,927 units in
`2026-09-23T06-19-06-627Z-88701/report.json`. Full `npm run check` report
`2026-09-23T06-22-37-775Z-4099/report.json` starts and ends on matching fingerprint
`4dfe1d00b51324252d4a434e2712071f3b12833391aa5bd125f7fd802ef14b86` and passes all 1,666 browser
cases across eight projects without failures, skips or flakes. Coverage remains red on 96
changed-code checks in 59 inherited files. Package quality fails the unchanged packed, Mobile UMD
and root-bundle size limits (3,413,403, 559,198 and 635,719 bytes respectively); package-budget
detector isolation is the only failed control among sixteen. There is no delivery receipt or
full-audit acceptance.

Both actual-host UI specs now require the instrumented native call itself to change the old root
from connected to detached. The 54-case combined selection and twelve-case Countdown rerun pass in
three engines after this test-only tightening. The tightened snapshot's fast report
`2026-09-23T07-02-30-808Z-83440/report.json` passes all gates and 4,927 units. Full `npm run check`
report `2026-09-23T07-05-16-938Z-98065/report.json` starts and ends on matching 929-file fingerprint
`78046212cd320bdd1aa937a52352d370f54bc221eb733938e843a98fe540375a` and passes all 1,666 browser
cases without failures, skips or flakes. Coverage still fails 96 changed-code checks in 59 inherited
files; package quality fails the unchanged three fixed size limits and the package-budget detector
isolation control. The other 15 controls pass. No delivery receipt or full-audit acceptance follows.

Owner 0016 adds a third actual-host UI resource slice for an active Resizable drag. All twelve
pinned Turbo/htmx version and desktop-engine cases pass: the three outgoing window pointer listeners
and real capture release before the native connected-to-detached call, no later move changes the
detached root, and the incoming root completes a new trusted drag. The preserved neighbor keeps its
identity and input value. The combined baseline, Countdown, Message Scroller and pointer selection
passes 66 cases without retries, skips or flakes. Turbo 8.0.21 and htmx 2.0.0 no-bridge Chromium
diagnostics render but fail the cleanup timing assertion. The matching 930-file `npm run check`
report `2026-09-23T08-11-31-064Z-12902/report.json` passes all 1,678 browser cases across eight
projects. It still fails 96 changed-code coverage checks in 59 inherited files, three fixed
package-size limits and package-budget detector isolation; the other fifteen controls pass. No
delivery receipt or full-audit acceptance follows.

The preceding packed artifact measures 3,413,555 bytes against 3,174,000 combined allowances. The
559,198-byte UMD exceeds both the 462,311-byte reviewed Mobile measurement and 464,896-byte raw cap;
the 635,719-byte installed root bundle exceeds 542,720 bytes. Isolated UMD minifier probes reproduce
the baseline and save at most about 8 KB, far short of the UMD gap. The 37 packaged maps contain
about 968 KB of separately gzipped embedded sources, but those sources are absent from the package,
so removing them would degrade installed source maps. No packaging or budget change follows from
these measurements. Changed-code coverage and package-size correction remain open.

Owner 0016 adds a fourth actual-host slice for generic JSON/HTML and official-SDK Datastar SSE.
Twelve pinned host/version/engine cases pass, and the combined baseline, three UI resource slices
and backend selection passes 78 without retries, skips or flakes. Real requests run before and after
host replacement; generic requests omit Datastar headers and implicit signals, SDK requests include
current signals and stream preference, patches keep inserted directives live, and each request
completes once. The outgoing application is destroyed before native detachment, the incoming one
works, and the preserved neighbor retains node/value identity. Turbo 8.0.21 and htmx 2.0.0 no-bridge
Chromium diagnostics render but fail the ownership timing assertion.

The first Turbo backend probe also exposed nested declarative ownership: an existing `#main`
application and its child both handled the child's directive, so a Datastar request serialized outer
`count: 2` while the child displayed `count: 8`. Owner 0006 reproduced this in both boot orders and
scoped plain-root declarative scans, mutation updates and cleanup to each plain `data-jqs` island
while keeping page-wide `$.star.boot()` scope. The backend fixture now retains the single-app
control and adds an outer-app `nested=1` mode. All 24 selected host cases pass across both pinned
versions of each host and three desktop engines, with child-only requests before and after
replacement and unchanged outer state. Two nested no-bridge Chromium variants render their host
result but leave the outgoing child live after native removal. Explicitly booted named component
roots remain unproved. The earlier matching 931-file `npm run check` report
`2026-09-23T12-24-53-903Z-32528/report.json` starts and ends on fingerprint
`c48b8ae5288284bbf0cf34914003227be85be11bf5f20879fe1ca329fe7e5665`. All 1,690 browser cases pass
across eight projects, 554 per desktop engine. Coverage fails 96 changed-code checks across 47 of 59
changed source files; package quality fails the fixed packed size (3,414,397), Mobile UMD (559,198)
and installed root bundle (635,719) limits. Package-budget detector isolation fails alongside those
baseline errors; the other fifteen controls pass. No delivery receipt or full-audit acceptance
follows. Remaining async/error host paths also stay open.

The nested-island correction's fast report `2026-09-23T13-32-36-307Z-32671/report.json` passes 4,933
units and all six lanes; Code-phase ticket validation matches that tree. Full `npm run check` report
`2026-09-23T13-35-36-553Z-47216/report.json` starts and ends on the same 932-file fingerprint
`eb2d4ad1d3e82795c5638312de882c20f67f24bdf1d264949c0aea4e2073cb83`. All 1,702 browser cases pass
across eight projects, 558 per desktop engine. Coverage fails 96 changed-code checks across 47 of 60
changed source files, although `src/declarative.ts` itself has complete changed executable
line/function coverage. The fixed packed (3,416,436), UMD (559,623) and installed root bundle
(636,122) limits fail. Package-budget detector isolation fails among fifteen passing controls, so
there is no receipt or full-audit acceptance.

## September 22 core document-retention continuation

Owner 0006 extends the standalone Chromium GC command with 39 core-only exercises: idle, behavior
and declarative applications, plugin/document listener paths and first observer acquisition. The
tracked command passes one initial and three repeat runs: 143 fixture controls pass and all 247
disposed Documents (208 UI, 39 core) collect on the first explicit GC. The weakly referenced
detached control collects and the strongly held control survives. Separate injected strong
references make `resizable` and `core/idle` retention fail. This is bounded source-fixture proof;
other engines, cross-plugin combinations, long-run heap behavior and complete delivery remain open.

The expanded 927-file tree passes 4,927 units and six fast/23 static gates in
`2026-09-23T04-25-39-616Z-78632/report.json`. `npm run check` on the same unchanged fingerprint
passes all 1,642 eight-project browser cases, plus release, property, self-hosted and static
delivery gates, but fails 96 changed-code coverage checks, three fixed package-size checks and the
package-budget detector isolation control. The other 15 detector controls pass. No delivery receipt
or full-audit acceptance follows. A package dry run matches the 3,412,820-byte/265-file artifact;
the size failures are not caused by an accidental additional file.

## September 22 retained-document measurement continuation

Owner 0006 promotes a read-only GC diagnostic to `test/document-retention-browser.mjs`. Four
consecutive public runs pass 104 existing ownership exercises: one for each of 50 UI families, plus
all six modes for nine families with module-level active-record Sets. Each run captures 208 disposed
source/destination Documents by WeakRef and collects all 208 on the first explicit Chromium GC. A
weakly referenced detached control collects while a strongly held control survives. An ignored
injected strong-reference copy fails on a retained `resizable` Document. This initial UI-only
source-fixture evidence did not cover core Documents, Firefox/WebKit heaps or long-run profiles.
Fixed budgets, changed-code coverage, full hosts, manual accessibility and delivery remain open. The
previous delivery report predates the tracked test and remains historical.

## September 22 Menubar selector continuation

Owner 0006's validated Plan now has a public negative: four selector cases fail and one existing
action-form control passes. A local `#tools` menu value collides with a target ID, a two-argument
class selector is read as a value, the installed facade stops at an unrelated first match, and an
invalid target leaks a selector-engine error. Menubar action resolution now prioritizes an exact
local menu value for one-argument calls and treats two arguments as an explicit target/value pair.
Its installed document guard selects the first HTML Menubar matching a string and preserves document
ownership. A further two-argument missing-target negative failed before correction; seven selector
cases and 59 Menubar/Menu/document tests now pass. The new native browser case passes in all three
engines. The first complete browser run was stopped when that edge was found and is not accepted
evidence. The corrected 926-file checkpoint then passes 4,927 units and all six fast/23 static
gates, plus 1,248 complete document/component browser cases (416 per engine, zero skips, flakes or
errors). Its verifier binds 3,502 integration assertions in 113 files, 108 mapped sources/293
source-map contents, an all-entry build, twelve unchanged API reports and 262 declaration outputs to
fingerprint `da0c1aba560ac19180d160e52fbfabdb3c11bf9100ea584bcd3f81bb9317afe2`. The actual
Turbo/htmx baseline adds 30 passes on that same source. Installed consumers, generic/UI host
conformance and delivery remain open. Fixed limits still exceed by 1,089 core gzip, 774 CSP gzip,
1,203 CSP Brotli, 870 stores gzip, 92,999 root raw, 92,002 UI ESM, 90,310 UI CommonJS and 94,302 UMD
bytes. No ceiling or public signature changed. Subsequent documentation edits make this checkpoint
historical for final delivery.

The documented 926-file tree then passes another 4,927-unit fast run with all six fast/23 static
gates (`2026-09-23T03-06-24-632Z-37701/report.json`). `npm run check` starts and ends on its
fingerprint `f0db70bb8f12fdcc7a3cc99bc616793cd6b54a385da6d41f09620f8ea68d1cd0`, but fails four
delivery gates. Changed-code coverage reports 96 failures across 59 inherited changed files; the
fixed threshold ratchet, production roster and test evidence mapping pass. Package quality passes
its API report, installed consumers, QUnit, browser consumers, publint and type profiles, but fails
the 3,412,820-byte packed budget, stale reviewed UMD size and 635,719-byte installed root bundle
against 542,720. Release quality and the other delivery gates pass. The delivery browser gate
executes zero tests because an orphaned fixture server holds port 4174. After clearing the six
orphaned fixture ports, the standalone full browser quality matrix passes 1,642 cases across all
eight projects, with no skips, flakes or errors on that same fingerprint. The detector self-test's
retry fixture also passes after port cleanup; its package-budget fixture remains red because three
baseline package checks fail where the detector expects one isolated failure. These independent
passes do not create a delivery receipt or close the full audit. Further documentation edits make
the delivery report historical for the final tree.

## September 22 Data Table cost continuation

Owner 0006's validated Plan promotes deterministic native DOM cost controls. The pre-correction
suite fails four cost cases with one native-page control: doubling rows from 12 to 24 raises
row-text reads from 1,032 to 3,504 on enhancement and from 1,776 to 5,856 on a page action; that
page also makes 500 whole-root selector queries. The controller now uses a transaction-scoped native
mutation signal to rescan captured rows and controls only when relevant source/part DOM changes. A
follow-up negative catches a stale notification after an invalidated check; the corrected guard
latches that invalidation and disconnects on both completion and error. The first 129-case focused
selection passes. The same 12/24-row diagnostic now counts 24/48 enhancement reads, 36/72 page reads
and 18 root queries on the 24-row page. The public test also checks growth through 48 rows. This is
source-bound evidence; three-engine browser, exact-tree fast/static, fixed budgets, installed
packages and full delivery remain open. No ceiling or allowance increases.

An added observer negative shows two setup/cleanup failures: a native observe that registers then
throws must disconnect, and a later cleanup failure must retain the earlier setup error. The
corrected focused run passes 131 tests/four suites. The real-browser selection passes 24 cases,
eight per engine, including measured 12/24/48-row growth, native page output, document ownership and
the component workflow. This focused-only status predates the complete checkpoint below;
installed-package proof and fixed-budget delivery remain open.

The 925-file bounded checkpoint passes 4,920 units, all six fast/23 static gates and 1,245 browser
cases (415 per engine, zero skips/flakes/errors). Its verifier binds 3,495 integration assertions in
112 files, the complete case selection, isolated all-entry build/maps, twelve declaration/API
reports and 262 declaration outputs to fingerprint
`b4009d7d97a6426d5eb47704adb9a5eac8d71a68017ba09fa055e144144f7293`. An additional 30-case actual
Turbo/htmx baseline passes on that same source, but generic/UI host coverage remains open. Fixed
limits still fail: UI ESM and UMD exceed raw ceilings by 91,194 and 93,494 bytes; core gzip and CSP
Brotli exceed by 1,089 and 1,203. AC-39 remains unchecked pending installed-package, coverage and
full delivery. Subsequent documentation edits make this checkpoint historical for final delivery.

## September 22 staged plugin listener continuation

The document-listener checkpoint is accepted on 922 unchanged inputs: 4,892 units, 3,467 integration
assertions in 109 files, six fast/23 static passes and 1,209 browser passes, 403 per engine with no
skips/flakes/errors. The verifier binds the saved isolated all-entry build, source maps,
declarations and twelve API reports. This bounded evidence is historical after the staged plugin
edits and does not close the full program audit.

Owner 0006's next validated Plan addresses cancellation while a staged plugin listener is inside
native setup. Promoted public tests reproduce nine failures with five passing controls. The private
Kernel/plugin acquisition predicate now stops canceled native work after method and options getters,
suppresses synchronous dispatch during native add, removes late registrations and preserves an
earlier completed duplicate or newer replacement. The public host signature stays unchanged. The
corrected focused selection passes 177 tests in six files; 33 actual browser cases pass, eleven per
engine, including getter cancellation with a value that is not callable, native return/throw and
duplicate ownership. Complete type checks and focused lint pass. The first fast run passed 4,906
units but failed one ticket spelling word; it predates the final method-getter correction. That
focused evidence is retained as diagnostic history.

The corrected checkpoint now passes 4,909 units, all six fast/23 static gates and the complete
1,242-case browser selection (414 per engine, zero skips/flakes/errors). Its verifier binds 924
unchanged input hashes, 3,484 integration assertions/111 files, the isolated all-entry build/maps,
twelve declaration/API reports and 262 declaration outputs to fingerprint
`fdf0b1d48b9286db68b1d741726bc4ce6bc5beb88a30e1810157cabcd37666d8`. AC-38 is verified on that
bounded source. Installed-package and delivery proof remain open; fixed core gzip and CSP Brotli
limits are exceeded by 1,089 and 1,203 bytes in the isolated measurement. Subsequent documentation
edits make the checkpoint historical for final delivery.

Data Table cost, Menubar selector ambiguity, retained-document/heap work, actual Turbo/htmx hosts,
fixed size overruns, installed packages, semantic source/public-claim review, manual accessibility
and npm run check/full delivery remain required. Tickets 0006/0033 stay coding.

## September 21 shared first-scope acquisition continuation

The 50-family Resizable/Sortable checkpoint is accepted on 919 inputs, with 4,753 units and 1,137
browser cases passing. It becomes historical after this separate shared correction. Owner 0006
validated the Plan before promoting the typed 20-case negative (fourteen failures/six controls).
Kernel observers now own provisional lifetimes, suppress retired callbacks, preserve setup/cleanup
errors and retain the newer removal observer. UI records publish usable cleanup before acquisition.
Follow-up negatives exposed stale Pagination/Stepper values, replaced-part writes, missed removal
during initial observation and cleanup writes by uninitialized floating controls. Those corrections
remain within the recorded extensions to the owner Plan.

Focused verification passes 482 tests in 13 suites, 431 floating tests in ten additional suites and
18 new three-engine browser cases. The replacement suite covers 49 families behind all 44 helper
call sites plus five whole-root floating replacements. The first full fast run records 4,834 passes
and three cleanup failures, plus two lint failures; all are retained with their corrections in the
ticket. Fresh complete fast/static, 1,155 browser cases and all-entry build/source-map evidence must
bind the final documented tree before accepting this shared checkpoint. No full-audit criterion is
closed, and no budget, lint allowance, API baseline or frozen CSP inventory is increased.

Data Table cost, Menubar selector ambiguity, retained-document/heap work, actual Turbo/htmx hosts,
fixed size overruns, declarations/API/installed packages, semantic source/public-claim review,
manual accessibility and npm run check/full delivery remain required. Tickets 0006/0033 stay coding.

## September 21 Resizable and Sortable continuation

The accepted Feed checkpoint passed 4,603 units, all six fast/23 static gates and 1,086 browser
cases on 917 frozen inputs. Owner 0006 then promoted the remaining two document families under a
validated Plan. Their 98-case public negative reproduced 89 failures with nine controls. Current
suites have 150 public cases and 267 focused passes. Both controllers now use native document
ownership, current parts and source state, guarded requests, copied event arrays and provisional
resources. Follow-up fixes include pointer capture after part replacement, valid alternating
anatomy, native list-background drop, duplicate patched values, preview/button coordination and
keyboard focus.

The first established browser controls exposed Sortable focus loss in all three engines. The
corrected 45-case selection passes six modes per family plus native layout/workflow/accessibility
controls. All six trusted native pointer/HTML drag adoption cases pass. The complete 50-family
browser/fast checkpoint must match one frozen input set before acceptance. Earlier full-checkpoint
evidence is historical after these edits. Tickets 0006/0033 remain coding. Shared acquisition,
performance/heap, real host matrices, fixed bundle ceilings, current package/API proof, semantic
source/claim review, manual accessibility and actual npm run check/full delivery remain open. No
budget, API baseline or CSP inventory is raised.

## September 21 Feed document continuation

Owner 0006 implements Feed under its validated Toast/Feed Plan. The fresh public negative has 71
failures/five controls; the suite now contains 108 cases. Fixes cover native document/part
ownership, reflected source reads, request ordering, authored constraints, generated article labels,
provisional acquisition and late observer cleanup. A follow-up regression preserves ID-target-only
failure actions with the default message. The focused selection passes 203 tests. The final broader
integration run passes 3,194 tests across 105 files.

All 24 focused browser cases pass across Chromium, Firefox and WebKit. The first Chromium failures
were an entry-realm assumption, with delivery, sentinel identity and completion already correct. The
retained diagnostic distinguishes callback and observer realms; the fixture accepts both native
entry prototypes and still checks the current target. The final type-safe form and documentation
must pass the full frozen-input browser and fast gates before accepting Feed. The last accepted
Toast checkpoint passed 4,495 units, six fast/23 static gates and 1,062 browser cases across 47
families. Its evidence is historical after these edits.

The expanded browser selection covers 48 families, plus the existing Feed loading/accessibility
controls. Resizable and Sortable remain in this document pass. All 50 families still require
cross-cutting review. Shared acquisition findings, Data Table performance, actual Turbo/htmx hosts,
fixed bundle ceilings, current declaration/API/installed-package proof, semantic source and claim
review, manual accessibility and actual npm run check/full delivery remain open. No budget, API
baseline, exclusion or frozen CSP inventory increase/change. Two obsolete Feed lint allowances are
removed; none increase. Tickets 0006/0033 remain coding.

The first frozen Feed browser run passes 1,086 cases with zero skips/flakes and 917 matching inputs.
The matching fast report `2026-09-21T18-32-24-347Z-70511` passes all 23 static gates but finds two
unit contract failures: a Feed field collides with private runtime minification, and a test-only
inline click binding changes the frozen public expression inventory. Owner 0006 renames the private
field and constructs that binding using the existing native fixture setup pattern. The declarative
native-button action is retained. Both contracts and all 208 selected tests pass after correction;
the inventory, scanner and minification allowlist remain unchanged. Fresh complete browser/fast
reports and the second isolated build must bind the corrected documented tree before acceptance.

## September 21 Toast document continuation

Owner 0006 implements Toast current-document operations under its validated Toast/Feed Plan. The
public suite now has 84 cases. The original 45-failure negative and subsequent focus/parent and
constraint failures remain recorded. Fixes preserve native/jQuery cancellation, direct programmatic
access, current parts, nested-controller boundaries, authored labels, timers, focus, announcement
expiry and both adoption cleanup orders. The first focused run passed 129 assertions but failed on
an unhandled invalid-markup error; validation now precedes attachment. A type error required
checking both native and jQuery cancellation APIs. Follow-up verification passed 145 focused tests,
3,092 integration tests and 24 three-engine browser tests before the final target-constraint
correction.

The browser matrix now includes Toast in six modes and selects its existing native/accessibility
controls. Fresh final focused, integration, lint, browser and fast checks must bind the final
documented files before accepting this checkpoint. Questionnaire's accepted report
`2026-09-21T17-24-37-120Z-11009` is historical after these edits. The preceding 46-family checkpoint
passed 4,411 units and 1,038 browser cases. No shared helper, public signature, API baseline, lint
allowance, budget or frozen CSP inventory changed in this Toast continuation.

Feed, Resizable and Sortable remain in the document pass. All 50 families still require
cross-cutting review, including shared acquisition failures. Data Table performance, actual
Turbo/htmx hosts, fixed bundle ceilings, current package/API/install proof, semantic source/claim
review, manual accessibility and actual npm run check/full delivery remain open. Tickets 0006/0033
stay coding.

## September 21 Questionnaire document continuation

Owner 0006 corrects Questionnaire document/part ownership, current native writes, request ordering,
reset supersession, named actions and native submission when a field shadows requestSubmit. It
preserves proposed-value inspection, cancelable navigation, authored disabled buttons, native
validation and form values. The public suite has 65 cases; all 144 focused/resource/reset/popup/CSP
tests pass. Types pass. Targeted browser proof passes 24 cases across three engines with zero
skips/flakes and all 915 worktree hashes verified at completion. A later fixture lint correction
uses exact FormData entry comparisons. Fresh full browser/fast checks must bind the final documented
tree before accepting the checkpoint. The browser cohort now covers 46 families and includes the
existing Questionnaire native/accessibility controls.

After that acceptance, Toast, Feed, Resizable and Sortable remain in this document-ownership pass.
All 50 families still require cross-cutting review. Fixed bundle limits, actual Turbo/htmx hosts,
current declaration/API and installed-package proof, source/claim review, manual accessibility and
actual npm run check/full delivery remain required. Prior Form build measurements are historical
after these edits. No shared helper, public signature, API baseline, budget or CSP inventory
changes. Lint allowances may only decrease. Preserve all negative and intermediate results. Owner
0006 and umbrella 0033 stay coding.

The first full checks pass 4,411 unit tests and all 1,038 browser cases (346 per engine, zero
skips/flakes), with all 915 worktree inputs verified. Fast fails only its exact lint inventory:
Questionnaire removed two non-null assertions and added an unnecessary condition through an
incorrect ancestor cast. The correction uses the existing native root guard and reduces the non-null
allowance from nine to seven. No allowance is increased. Fresh final checks must match this
corrected documented tree before acceptance. The preserved first report is
`2026-09-21T17-07-37-725Z-76439` under `.git/jqstar/runs/`.

Toast and Feed review now has 40 failing assertions and four passing controls across two isolated
probes. The next validated owner 0006 Plan covers cancellation, current parts/source, document and
action resolution, callback ordering, acquisition rollback and adoption while preserving existing
timer/announcement/observer/native behavior. No Toast or Feed source change is included yet.

## September 21 Form document continuation

The Calendar checkpoint is accepted: 4,275 units, 2,891 integration tests and 996 browser cases pass
on matching source/worktree fingerprints. Form now uses captured documents, provisional listeners,
current native associations and guarded requests. It preserves canceled/newer reset work, reacquires
adopted roots, supports native method/collection names as fields, and protects authored validity and
descriptions. The public suite contains 71 cases; 161 focused/resource/CSP tests pass. Types and
focused lint pass. The first targeted browser run passes 27 cases across all three engines, with all
914 worktree inputs unchanged at completion. That run precedes the final ownership corrections, so
fresh browser and fast evidence must match the documented tree before acceptance.

The six-mode browser matrix now includes Form and preserves all earlier families and component
controls. Questionnaire is the next implementation in owner 0006's validated continuation Plan. Form
still needs its final checkpoint; Questionnaire, Toast, Feed, Resizable and Sortable remain. All
cross-cutting, actual-host, fixed-budget, package/API/install, source/claim, manual accessibility
and actual npm run check/full delivery requirements remain open. Prior isolated build measurements
are historical after these source changes. No public signature, shared helper, allowance, budget or
CSP inventory changes. Original and follow-up negatives remain in the owner ledger.

## September 21 Calendar and Date Picker continuation

Owner 0006 corrects foreign element/Date acceptance, current parts, request and event ordering,
guarded rendering/native writes, action ownership and open Popover handoff for Calendar, Range
Calendar, Date Picker and Date Range Picker. The new public suite contains 136 cases; all 633
focused/resource/CSP tests pass. Earlier integration passes 2,881 cases across 101 files before the
last event-ordering and live-constraint regressions. The targeted browser selection passes 81 cases
across all three engines, with zero skips/flakes and all 127 source plus 913 worktree inputs
verified at completion. That result precedes the final event-ordering correction and private
callback lint fix. Fresh integration, types/lint, the complete browser cohort and fast verification
must be bound to the final documented tree in the continuation state before accepting the
checkpoint.

The complete browser cohort adds 72 document cases and 12 existing Calendar/native/accessibility
controls to the preceding cohort, covering 44 families. Form, Questionnaire, Toast, Feed, Resizable
and Sortable remain, along with cross-cutting properties of all 50 families. Earlier build sizes are
historical after these source edits. Fixed package budgets, actual Turbo/htmx hosts, current
declaration/API and installed-package checks, semantic source/claim review, manual accessibility and
actual npm run check/delivery remain required. No allowance, budget, public API or CSP digest
changes. Negative and interrupted evidence remains in the owner ledger.

## September 21 Chart and Data Table continuation

Owner 0006 corrects document/action ownership, current parts, callback continuation and interrupted
render/setup recovery for Chart and Data Table. All 75 new public cases and 258 focused/CSP tests
pass. Complete integration passes 2,755 tests across 100 files. The targeted browser run passes all
48 cases, without skips or flakes, across Chromium, Firefox and WebKit. All 127 source inputs and
912 worktree files verify at completion. Types, lint and the unchanged 286-entry allowance inventory
pass. The complete cohort contains 858 document cases across 40 families plus 54 existing component
controls; terminal full-cohort and fast evidence belongs in the continuation state before accepting
the checkpoint. Preserve the original and follow-up negative logs.

The current isolated build exceeds fixed limits by 309 bytes for core gzip, 451 for CSP Brotli, 107
for stores gzip, 62,202 for the root consumer, 62,343 for UI ESM, 60,890 for UI CommonJS and 62,717
for UMD. All entries and configurations remain intact. This provides no installed-package,
declaration/API or full delivery acceptance. Ten remaining families, cross-cutting review, actual
Turbo/htmx hosts, source/public-claim review, manual accessibility and actual npm run check/delivery
remain required. Pending source hashes do not count as completed semantic review.

## September 19 JSON Viewer and Log Viewer continuation

Owner 0006 corrects foreign document/action paths, current parts, retained native disclosure and
pause/follow state, serializer/lifecycle ordering, provisional listener/scroll ownership and
capacity-trimmed generated IDs. Public negatives record 50 failures, followed by three action/ID
failures before their corrections. The expanded 70-case public suite and all 227 focused tests pass;
the 42-case native/server/accessibility selection passes in Chromium, Firefox and WebKit with all
126 inputs verified at terminal.

Complete integration passes **2,680 tests across 99 files**. The final browser cohort passes **864
cases** with zero skips, flakes or unexpected results: 822 document cases across 38 families plus 42
existing component controls, 288 per engine. All 126 source inputs and 911 worktree files remain
unchanged during execution. The two interrupted attempts remain diagnostic evidence. A follow-up
JSON render-marker negative records 68 passes/two failures before correction; both public expansion
directions and browser recovery now pass. TypeScript, lint and the reduced 344-file/286-entry
allowance inventory pass. The fresh fast report and exact documented-tree fingerprint belong in
`ui-lifetime-continuation-state.json` before accepting this checkpoint.

An isolated build uses the unchanged runtime configurations and every entry. Its 120 source and 74
output hashes verify, with all 108 represented source-map contents matching; root distribution files
remain unchanged. Fixed excesses remain: core gzip 309 bytes, CSP Brotli 451, stores gzip 107, root
consumer raw 57,825, UI ESM 57,869, UI CommonJS 56,413 and UMD 58,273. This preview supplies no
installed-package, declaration/API or delivery acceptance.

Chart and Data Table source/contract review produces 20 isolated diagnostic failures, including a
listener-churn observation and an adoption case that stops at its part guard. Public promotion,
expanded positive/negative coverage and owner corrections remain. Actual host bootstraps currently
install core and a bridge; the UI/Datastar coexistence harness uses a synthetic coordinator. Those
scopes still need the complete actual-host matrix. Remaining families, fixed ceilings, semantic
review, manual accessibility and actual npm run check/delivery remain open. No API, allowance or
ceiling is increased.

## September 19 Clipboard and Code Block continuation

Owner 0006 now uses one private copy controller for owning-document transport, live source/output
parts, authored descriptions, request ordering, adoption and provisional button/reset cleanup.
Public APIs and named actions retain their signatures. Focused copy verification passes 224 tests,
including 85 new document/resource cases; complete integration passes 2,610 across 98 files.

The first 78-case browser selection has 77 passes and one Firefox navigation error during concurrent
fixture preparation; its trace and 126-input binding remain diagnostic evidence. After preparation
finishes, the complete stable-file matrix passes **822 cases**, with zero skips, flakes or failures:
786 document cases across 36 families plus 36 existing component controls. Each browser passes 274
cases, and all 126 startup hashes verify at terminal. TypeScript, focused lint and the reduced
343-file/288-entry lint ratchet pass. Seven obsolete allowances are removed; none is added.

A current built-distribution preview verifies 120 source and 337 distribution hashes; all 108
runtime files represented by source maps match their sources. It still exceeds fixed limits by 309
bytes for core gzip, 451 for CSP Brotli, 107 for stores gzip, 54,443 for the root consumer, 54,403
for UI ESM, 53,001 for UI CommonJS and 54,882 for root UMD. This is a preview, not installed-package
acceptance. No ceiling or graph rule changes.

JSON Viewer and Log Viewer are next. Complete source and contract reads led to ten bound isolated
probe failures: foreign facades/actions, serializer reentry, current source/entries, render-depth
changes, callback ordering and interrupted listener cleanup. Public promotion and expanded
regressions are required before changing those controllers. These failures remain open.

The full audit remains active: remaining families, actual Turbo/htmx hosts, fixed package budgets,
semantic review, manual accessibility and actual npm run check/delivery are still required. Pending
hash refreshes do not award completed semantic-review credit.

Owner 0006 corrects Menu, Context Menu and Menubar document/resource ownership and callback
continuations. All 272 public floating cases pass, including all five floating kinds' native
handoffs. Focused verification passes 435 cases; complete UI/DOM/kernel/bridge and Access Manager
integration passes 2,525 across 97 files. No failures are excluded.

Menu kinds retain accepted open state, focus, context position and remaining search/long-press time
across adoption. Shared native ownership defers completion until acceptance. Current parts,
selection/group identity, live constraints and newer requests govern continuations. Menubar owns
resources before acquisition, refreshes children through the destination installation, preserves
roving value/deadlines, and stops older child-call loops and focus work. Inactive menu items retain
horizontal exploration. Stable value reflection no longer feeds the enhancement observer.

Targeted native selections pass 183 and 90 cases across the three engines with 125 inputs verified
at completion. A superseded full run was intentionally interrupted after two public navigation
negatives: 125 passes/619 skips provide no full-matrix acceptance. The corrected full matrix passes
all 744 cases: 720 document cases across 34 families plus 24 existing component controls, without
skips or flakes. All 125 startup input hashes and the report hash verify at terminal. TypeScript,
focused lint and the reduced 341-file/295-entry ratchet pass. Negative tests, the observer-loop
worker error and fake-clock corrections remain in the evidence ledger.

All remaining families, actual Turbo/htmx host matrices, fixed distribution/package ceilings,
semantic source/claim review, manual accessibility and actual npm run check/delivery remain open.
Owner 0006 stays coding with AC-34 through AC-37 unchecked. Pending hash refreshes add no completed
semantic-review credit. No public API, lint allowance or fixed ceiling is increased.

The preceding Hover Card checkpoint follows.

Owner 0006 now corrects Hover Card document/resource ownership and shared native content handoff
with Popover and Tooltip. The public floating suite has 147 cases: 135 pass and twelve Menu, Context
Menu and Menubar cases remain failing. Complete UI/DOM/kernel/bridge and Access Manager integration
passes 2,388/fails twelve across 97 files. There are no test exclusions.

Hover Card retains interactive focus and remaining deadlines across adoption, owns provisional
listener/timer cleanup, refreshes current scoped titles, and respects constraints and newer
requests. Dismissal focus does not reopen the card or consume later deliberate focus. A native
Chromium removal trace exposed a departure timer erasing preserved open state while detached; the
correction passes a public negative and an explicitly detached activation control.

A weak native content-owner index now coordinates Popover, Tooltip and Hover Card. Native calls in
progress defer new platform work and revision-bound completion callbacks until acceptance can be
read. Cross-kind handoff retains the current owner's state and emits one accepted notification. The
first native matrix's six opening failures and the Hover Card selection's ten failures remain
recorded, including the distinction between fixture departure and the verified timer defect. The
corrected 72-case native/behavior/accessibility selection passes in all three engines without skips
or flakes. The full 570-case matrix covers 558 document cases across 31 families plus twelve
existing Tooltip/composed-surface controls; its terminal report and 125-input binding are recorded
with ticket 0006's checkpoint evidence.

TypeScript, focused ESLint and the unchanged 341-file/298-count lint ratchet pass. Fresh fast and
exact-tree fingerprints are recorded in the ignored continuation state. Prior Tooltip fast/browser
bindings are historical. Owner remains coding with AC-34 through AC-37 unchecked. All remaining
family/actual-host, fixed-budget, semantic source/claim and actual npm run check/delivery work stays
open. Menu/Context Menu/Menubar are next; complete sources and family tests were re-read and the
Plan requires new public negatives before runtime edits. Pending source/claim hashes add no
completed semantic-review credit. No public API, lint allowance or fixed ceiling is increased.

The preceding Tooltip checkpoint follows.

Owner 0006 now corrects Tooltip document/resource ownership, retained interaction deadlines and
native-state continuation. The public floating suite has 99 cases: all 44 Tooltip and 39 Popover
cases pass; sixteen Hover Card, Menu, Context Menu and Menubar cases remain failing. Focused
verification passes 221/fails sixteen across six files. Complete UI/kernel/bridge and Access Manager
integration passes 2,336/fails sixteen across 97 files. These remain failed gates without
exclusions.

All 498 browser cases pass in Chromium, Firefox and WebKit: 492 document-ownership executions across
30 families and six existing Tooltip behavior/accessibility controls. There are no failures, skips
or flakes, and all 125 startup input hashes plus the result hash verify at terminal. Targeted runs
passed 30 Tooltip cases and then 102 Tooltip/Popover/choice controls. A preceding full run was
interrupted after three native-state negatives were validated; its 169 passes/329 skips provide no
acceptance, and its input/report binding remains preserved.

Tooltip now owns listeners and timers before acquisition, captures current document/direct parts,
retains open/pointer/focus state and resumes only the remaining delay after adoption. Canceled timer
callbacks cannot affect a replacement interaction. Generated description IDs follow current content
and cleanup removes only runtime tokens before native hiding can acquire another owner. Ordinary
disposal remains silent and Tooltip does not move focus. Both Tooltip and Popover now read settled
native state before immediate facade close following authored native show, while newer no-op
requests during native calls still supersede older work. Tooltip toggle handling also guards against
newer state requested while canceling a timer.

TypeScript, focused lint and the unchanged ratchet pass: 341 TypeScript files/298 exact counts. No
shared helper, public signature, lint allowance or fixed ceiling changes. The complete written
checkpoint's fast result and fingerprint are recorded in the ignored continuation state; prior
Popover fast/browser bindings are historical. Owner 0006 remains coding with AC-34 through AC-37
unchecked. Sixteen public failures, all remaining family/actual-host, fixed-budget, semantic
source/claim and actual npm run check/delivery requirements stay open. Hover Card is next. Its
source and family tests were re-read; possible native-content handoff across controller kinds is an
unvalidated candidate requiring a public negative before any shared extraction. Refreshed pending
hashes add no completed semantic-review credit.

The preceding Popover checkpoint follows.

Owner 0006 now corrects Popover document/resource ownership and the kernel's preserved-focus
ordering. All 38 Popover cases pass in the 58-case floating public suite; 20 Tooltip, Hover Card,
Menu, Context Menu and Menubar cases remain failing. Focused floating/Calendar verification passes
274/fails 20 across seven files. Complete UI/kernel/bridge and Access Manager integration passes
2,291/fails 20 across 97 files. These remain failed gates without exclusions.

All 462 document browser cases across 29 families pass in Chromium, Firefox and WebKit, with no
failures/skips/flakes and all 124 startup input hashes verified at terminal. The targeted native
Popover and existing Popover/Calendar/date-form behavior and accessibility selection also passed all
33 cases before the final lint-only kernel correction. Browser negatives exposed native rejection,
late toggle/no-op transition handling, preserved panel loss and Chromium focus restoration before UI
enhancement. The kernel now retries an ineffective preserved-focus call once after enhancement,
subject to current render/document/target and unchanged focus. Nine generic focus cases and the
kernel/bridge selection pass all 113 cases. Explicit blur and newer focus remain respected.

Popover publishes captured resources before native listener setup, retains open state and owned
focus across adoption, scopes current titles and parts, and checks newer intent after native/event/
geometry/focus callbacks. Native interrupted calls reconcile with the current content owner.
Ordinary disposal remains silent and closed. TypeScript and focused lint pass; the ratchet remains
298 exact counts across 341 TypeScript files, with no new allowances or public signatures.

The prior Transfer List fast report is historical. Fresh fast evidence is bound to this written
checkpoint in the ignored continuation state; no current passing fast or delivery is claimed while
20 public failures remain. Tooltip is next, followed by Hover Card, Menu, Context Menu and Menubar.
All remaining family/actual-host, fixed-budget, semantic source/claim and npm run check/delivery
requirements stay open. Owner 0006 remains coding with AC-34 through AC-37 unchecked. Refreshed
pending hashes add no semantic-review credit.

The preceding Transfer List checkpoint follows.

Owner 0006 now corrects Transfer List document/resource ownership. All 231 public Color Picker, File
Upload, Tree and Transfer List cases pass, including 67 Transfer List cases. Focused verification
passes 297 cases across five files; complete UI/kernel/bridge and Access Manager integration passes
2,244 across 95 files. This closes the four-family group's recorded ownership failures.

All 444 document browser cases across 28 families pass in Chromium, Firefox and WebKit, without
failures/skips/flakes, with 124 input hashes verified at terminal. Transfer List retains native
membership/order, option nodes/highlights/defaults and generated fields through adoption and
preservation. Explicit root patches remain authoritative. Native reset restores highlights and
button state without reverting membership; both native form owners, external forms and cancellation
are covered. Disabled membership is protected, generated FormData reflects native disabling,
callbacks cannot alter pending arrays or resume older work, and provisional cleanup releases every
resource. TypeScript and focused lint pass. The ratchet passes 339 files / 298 exact counts after
removing thirteen unused non-null assertions. Native styled buttons remain owned parts, including
SVG targets; nested controllers remain separate. The unreferenced internal reset helper is removed.
No new helper, public signature or increased budget.

The next ignored twelve-case probe exposes foreign facade and adopted-trigger failures in Popover,
Tooltip, Hover Card, Menu, Context Menu and Menubar. The final valid fixture has no unhandled
errors; initial coordinate-signature and interactive Tooltip fixture mistakes remain recorded. All
five controllers and shared floating code were read, along with the resource/label suites. Promote
the valid cases and complete family/action/transition test review before runtime edits. All
remaining family/host, fixed-budget, semantic source/claim and actual npm run check/delivery work
stays open. The first final fast run failed Access Manager and unused-code. Those failures are
corrected; eight styled-button/block negative cases and all intermediate evidence remain recorded.
The repeated final quality:fast report is bound to the complete written tree in continuation state.
Owner 0006 remains coding with AC-34 through AC-37 unchecked; refreshed pending hashes add no
semantic-review credit.

The preceding Tree checkpoint follows.

Owner 0006 now corrects Tree document/resource ownership. All 59 Tree, 51 File Upload and 54 Color
Picker public cases pass in the 168-case group; four Transfer List ownership cases still fail.
Focused verification passes 229/fails four across four files. Complete UI/kernel/bridge integration
passes 2,175/fails four across 94 files. These remain failed gates without test exclusions.

All 426 document browser cases across 27 families pass in Chromium, Firefox and WebKit, without
failures/skips/flakes, with 124 input hashes verified at terminal. Tree retains selection,
expansion, active exploration and typeahead expiry across adoption and preservation. Current parts,
owning-window events, generated versus authored names, nested native controls, live constraints,
callback revisions and provisional resource cleanup are covered together. Follow-up negatives also
correct ancestor expansion order, direct DOM patches during callbacks/setup and disabled toggles.
TypeScript, focused lint and the unchanged ratchet pass (339 TypeScript files / 299 exact counts).
No shared helper, public signature, new exception or budget increase belongs to this checkpoint.

Eight ignored Transfer List probes fail without unhandled errors. They expose stale membership and
native notification work, mutable pending event arrays, changed native constraints, sticky generated
ARIA, overwritten authored disabling, provisional setup leakage and incomplete cleanup. Promote
those cases before runtime edits. The Multi Select fast report `2026-09-19T18-23-02-300Z-98321`
remains historical. Current fast, actual npm run check, complete family/host conformance, fixed
budgets and semantic source/claim review remain required. Owner 0006 stays coding with AC-34 through
AC-37 unchecked; refreshed pending hashes add no semantic-review credit.

The preceding File Upload checkpoint follows.

Owner 0006 now corrects File Upload document/resource ownership. All 51 File Upload and 54 Color
Picker cases pass in the 113-case public group; eight Tree and Transfer List cases remain failing.
Focused verification passes 201/fails eight across five files. Complete UI/kernel/bridge integration
passes 2,116/fails eight across 94 files. These remain failed gates while the two controllers are
still in implementation.

All 408 document browser cases across 26 families pass in Chromium, Firefox and WebKit, without
failures/skips/flakes, with 124 input hashes verified at terminal. File Upload preserves actual File
identity and native submission, reuses rows independently of content identity, respects silent
native clearing and resets, retains drag state through adoption/preservation and protects callback
and resource continuations. Real FileList/FormData proof checks replacement contents and the absence
of a shadow files property. TypeScript and focused lint pass. The ratchet passes 339 TypeScript
files / 299 exact counts after removing the allowance for three unused conditions. No shared helper,
public signature or budget increase belongs to this checkpoint.

Six ignored Tree probes expose newer selection overwritten by before-select continuation, changed
disabling ignored during collapse, a late typeahead timer, composition focus theft, partial setup
leakage and incomplete cleanup. Promote them before editing Tree. The Multi Select fast report
`2026-09-19T18-23-02-300Z-98321` remains historical. Current fast, actual npm run check, complete
family/host conformance, fixed budgets and semantic source/claim review remain required. Owner 0006
stays coding with AC-34 through AC-37 unchecked; refreshed hashes add no semantic-review credit.

The preceding Color Picker checkpoint follows.

Owner 0006 now corrects Color Picker document/resource ownership. The new 66-case public group
passes all 54 Color Picker cases plus one File Upload control; eleven File Upload, Tree and Transfer
List failures remain. Complete UI/kernel/bridge integration passes 2,066/fails eleven across 94
files. This is a failed gate while the other three controllers remain in implementation.

All 390 document browser cases across 25 families pass in Chromium, Firefox and WebKit, without
failures/skips/flakes, with 124 input hashes verified at terminal. Color Picker retains native
values/defaults and text drafts/composition through adoption, uses owning-window events, honors
newer callbacks and root patches, and owns provisional listener/reset cleanup. A three-engine
negative exposed CSS-wide keywords becoming native black fallback; the correction preserves native
literal color support while rejecting those values. TypeScript and focused lint pass. The ratchet
passes 339 TypeScript files / 300 exact counts after removing one unused condition allowance. No
shared helper, public signature or budget increase belongs to this checkpoint.

The preceding Multi Select fast run `2026-09-19T18-23-02-300Z-98321` passed six gates and 3,397
units with matching 905-file fingerprints. It was independently verified before these new changes
and is now historical. Current fast, actual npm run check, the remaining controllers, full
family/host conformance, fixed budgets and semantic source/claim review stay open. Owner 0006
remains coding with AC-34 through AC-37 unchecked. Refreshed pending hashes add no semantic credit.

The preceding Multi Select checkpoint follows.

Owner 0006 now corrects Multi Select document/resource ownership. All 240 public Select, Combobox,
Multi Select and Time Picker cases pass, including 78 Multi Select cases. Focused verification
passes 379 cases across six files; complete UI/kernel/bridge integration passes 2,011 across 93
files. These tests close the previously recorded four-family document failures without claiming
completion of the full family or host audit.

All 372 document browser cases across 24 families pass in Chromium, Firefox and WebKit, with zero
failures/skips/flakes and 124 captured input hashes verified at terminal. Multi Select retains
native selection/defaults, generated nodes and exploration across adoption, respects disabled
selected options and current maximums, and reconciles callback/resource/native popup work. Native
FormData exclusion of disabled choices is proved in real browsers; jsdom differs at that boundary.
TypeScript, focused lint and the ratchet pass (338 TypeScript files / 301 exact counts). Multi
Select removes one non-null assertion allowance and reduces unnecessary conditions from three to
one. No allowance or budget increase, shared-helper change or public signature change.

The next Color Picker/File Upload/Tree/Transfer List probe has seven failures and one passing
control: all four foreign facades reject their own targets; Color Picker, Tree and Transfer List
lose immediate adopted interactions after source disposal. File Upload's simple adopted change
passes. These ignored discovery cases must become public regressions before runtime changes. The
fast-gate refresh is tracked in owner 0006 and the continuation evidence; actual npm run check,
complete family/host conformance, fixed budgets and semantic source/claim review remain required.
Owner 0006 stays coding with AC-34 through AC-37 unchecked. Hash refresh adds no semantic credit.

The preceding Combobox checkpoint follows.

Owner 0006 now corrects Combobox document/resource ownership alongside Select and Time Picker. The
four-family public suite has 166 cases: all 70 Combobox, 53 Select and 39 Time Picker cases pass;
four Multi Select foreign-target/adoption cases remain failing. Final focused verification passes
321/fails four across seven files. Complete UI/kernel/bridge integration passes 1,933/fails four
across 93 files. These remain failed gates while Multi Select is still in implementation.

All 354 document browser cases across 23 families pass in Chromium, Firefox and WebKit, with zero
failures/skips/flakes and 124 captured inputs verified at terminal. Combobox retains original reset
defaults, query drafts, selection/composition, native hidden values and active exploration through
adoption and source disposal. Its native popover, callback and resource continuations honor current
ownership. TypeScript, focused lint and the unchanged ratchet pass (338 TypeScript files / 302 exact
counts). No shared-helper, public signature, lint allowance or budget change belongs to this
checkpoint. Prior fast `2026-09-19T17-18-21-470Z-45288` remains historical. Current fast, actual
`npm run check`, the remaining controller, complete family/host conformance, fixed budgets and
semantic source/claim review remain required. Ticket 0006 stays coding with AC-34 through AC-37
unchecked. Hash refresh adds no semantic-review credit.

The preceding Select checkpoint follows.

Owner 0006 now corrects Select document/resource ownership as well as Time Picker. The four-family
public suite has 100 cases: 53 Select and 39 Time Picker cases pass, while eight Combobox/Multi
Select foreign-target/adoption cases remain failing. Final focused verification passes 256/fails
eight across seven files. Complete UI/kernel/bridge integration passes 1,863/fails eight across 93
files; this remains a failed gate.

All 336 document browser cases across 22 families pass in Chromium, Firefox and WebKit on the final
Select source, without failures/skips/flakes, with 124 captured input hashes verified at terminal.
Select preserves native popover visibility through retained movement, active exploration, native
selection/defaults and callback ordering. TypeScript, focused lint and the unchanged ratchet pass
(338 TypeScript files / 302 exact counts). No allowance or budget increases. Current fast, actual
`npm run check`, the remaining two controllers, full family/host conformance and semantic
source/claim review stay open. Ticket 0006 remains coding with AC-34 through AC-37 unchecked.

The preceding Time Picker checkpoint follows.

Owner 0006 has started the Select/Combobox/Multi Select/Time Picker document group. Time Picker now
passes 39 targeted public cases, 189 existing family/resource cases and 18 browser executions across
Chromium, Firefox and WebKit. The browser result binds 124 verified source/configuration inputs.
TypeScript, focused lint and the unchanged immutable ratchet pass (338 TypeScript files / 302 exact
counts). The four-family public suite initially fails 46 of 51 cases and retains twelve open Select,
Combobox and Multi Select failures after the Time Picker correction.

The complete UI/kernel/bridge run passes 1,810 and fails those twelve cases across 93 files. It is
not a passing gate. Current fast, the complete browser group and actual `npm run check` remain
pending. The preceding fast `2026-09-19T17-18-21-470Z-45288` and 300-case browser report below are
historical after these source/fixture changes. Complete family/host conformance, fixed budgets,
semantic source/claim review and delivery remain required. Owner 0006 stays coding with AC-34
through AC-37 unchecked; the full audit goal remains active.

The preceding disclosure/step checkpoint follows.

Owner 0006 corrects Collapsible, Accordion, Editable and Stepper document/resource ownership with 79
new public regressions. Native details/summary defaults and pending toggle notifications remain
intact; Accordion callbacks can supersede older sibling work. Editable retains committed/draft
values and selection across source disposal, and Stepper retains completion and checks validation
continuations. Focused verification passes 232 cases; complete UI/kernel/bridge integration passes
1,771 in 92 files. All 300 document browser cases across twenty families and three engines pass
without failures/skips/flakes, with 124 captured input hashes verified at terminal.

TypeScript and focused lint pass. The immutable ratchet passes 337 TypeScript files / 302 exact
counts after lowering Stepper's existing non-null assertion allowance from eight to six. No
allowance increases, public signature changes or fixed budget changes. Fast
`2026-09-19T17-18-21-470Z-45288` passes six gates and all 3,157 units with zero failed/pending cases
on matching 904-file fingerprints. Only result documentation follows the terminal gate. The next
Select/Combobox/Multi Select/Time Picker probe has eight failures: each rejects its own foreign
target and loses simple native behavior after adoption and source disposal. Owner 0006 records the
next Plan. The full family/host audit, fixed budgets, semantic source/claim review and actual
delivery remain open. Hash refresh grants no completed semantic-review credit.

Owner 0006 corrects Tabs, Toolbar, Pagination and Sidebar document/resource ownership. Seventy new
public cases cover foreign facades/actions, native adoption, exact bindings, interrupted setup,
complete cleanup/reentry, current parts and superseded callbacks. Focused verification passes 225
cases; complete UI/kernel/bridge integration passes 1,692 cases in 91 files. All 228 document
browser cases across sixteen families and three engines pass with zero failures/skips/flakes and 124
source hashes verified at terminal. Native Sidebar viewport transitions, retained desktop preference
and accepted-close focus return are included. TypeScript, lint and the unchanged ratchet pass (336
TypeScript files / 302 exact counts).

Final fast `2026-09-19T17-03-43-833Z-27619` passes six gates and all 3,078 units with zero
failed/pending cases on matching 903-file fingerprints. Only result documentation follows that
terminal gate. The next Collapsible/Accordion/Editable/Stepper probe has six failures and four
controls: all four foreign facades reject their targets, and both disclosures lose immediate native
summary cancellation after adoption and source disposal. Owner 0006 records the next Plan. Complete
family/host conformance, fixed budgets, source/claim semantic review and current full delivery
remain open. Hash refresh grants no completed semantic-review credit.

The preceding group corrects Input OTP, Tags Input, Toggle and Toggle Group document/resource
ownership. Eighty new public cases cover frame/adoption behavior, stable bindings, current parts,
provisional setup and complete cleanup, callback revisions, native reset and retained focus/state.
The final focused suite passes 232 cases; integration before the last two reset controls passes
1,620 in 90 files. All 174 browser cases across twelve families and three engines pass, with 124
source/configuration input hashes verified at terminal. TypeScript, focused lint and the unchanged
ratchet pass. Final fast `2026-09-19T16-48-57-334Z-9908` passes all six gates and 3,008 units with
zero failed/pending cases on matching 902-file fingerprints, including the final two native-reset
controls. Five next-group failures remain in Tabs, Toolbar, Pagination and Sidebar, alongside three
passing adoption controls. The full audit remains active.

The native-field follow-up corrects Number Field, Password Field, Search Field and Rating ownership
across frame documents and adoption. Seventy new public cases cover destination events/resources,
retained native state, form resets and stale callback continuations. Integration passes 1,542 cases
in 89 files; TypeScript, focused lint and the unchanged ratchet pass. Final fast
`2026-09-19T16-35-22-391Z-91661` passes all six gates and 2,928 unit tests on matching 901-file
fingerprints. All 120 browser cases pass without failures/skips/flakes in
`ui-native-field-browser-verified/results.json`, with all 124 captured input hashes verified at
terminal. Both results cover the final readonly Search Field submission correction. A next-group
probe finds six failures across Input OTP, Tags Input, Toggle and Toggle Group, with two simple
adopted native interactions passing. Owner 0006 records the next Plan; the full program audit
remains incomplete.

Ticket [0033](tickets/0033-audit-full-library-program.md) remains in progress. Owner 0006 has
enrolled all 50 controller families and continues cross-cutting review. The preceding group
corrected DOM identity and kernel/UI document boundaries, then verifies Countdown, Carousel, Message
Scroller and Dialog across independent frames and adoption. Fifty-one new unit cases cover this
first group. The final integration passes 1,472 cases in 88 files; the browser matrix passes all 54
cases in Chromium, Firefox and WebKit without failures/skips/flakes. TypeScript, focused lint and
the unchanged immutable ratchet pass. The browser suite also fixes Dialog modality after preserved
movement, repeated Carousel disabled writes in WebKit and focus-pause state across adoption. Fast
verification now passes six gates and all 2,858 units on matching 900-file fingerprints
(`2026-09-19T16-21-16-823Z-59758`). The API report only updates a warning line. The browser rerun
after fixture type references passes all 54 cases with 124 input hashes verified at terminal. That
group then exposed eight native-field failures: Number Field, Password Field, Search Field and
Rating each reject their own frame target and lose adopted native behavior after source disposal.
The native-field follow-up above corrects those eight failures. Other families, complete host
conformance, fixed budgets, source/claim semantic review and current full delivery remain required.

The preceding Carousel/Message Scroller fast `2026-09-19T15-57-04-145Z-26085` passed all six gates
and 2,807 units with matching 896-file fingerprints. It predates this document-ownership group. The
original Chromium foreign Countdown target/enhancement/adoption counterexamples now pass in
`ui-realm-document-browser-result.json`, bound to 83 bundle inputs. The separate testing realm lease
still cannot redefine protected browser window; ordinary independent document support does not
require that lease. The first full browser attempt was interrupted after a WebKit timeout and has
failures/skips; only the corrected final 54-case matrix supplies passing browser evidence.

The preceding Countdown fast `2026-09-19T15-33-15-546Z-92219` passed six gates and 2,765 unit tests
on a matching 895-file fingerprint. It does not cover the subsequent Carousel/Message Scroller
changes. The preceding source-bound Chromium diagnostic recorded Countdown's foreign-document facade
rejecting its own element from the parent realm while foreign Toast succeeds. It also rejected
explicit foreign-root enhancement and destination-facade access to an adopted root; the first group
above now corrects those specific counterexamples. Native DOM identity probes pass in all three
supported engines, including adopted nodes and invalid-object rejection; they establish feasibility,
not completed UI conformance. Owner 0006 retains the same-origin frame/adoption review. All
cross-cutting ownership, source/claim semantic review, fixed budgets, actual-host matrices and
current full delivery remain required.

Calendar fast `2026-09-19T15-20-42-173Z-75442` passed all six gates and 2,746 units on a matching
894-file fingerprint before the Countdown correction. Its 84 public lifecycle cases remain in the
current integration suite. That report does not cover the latest Countdown changes. Full
cross-cutting ownership/adoption review, fixed bundle budgets, actual-host matrices, source/claim
refresh and current full delivery remain required. Build/API/bundle evidence below predates
Calendar, Questionnaire, Toast, Countdown and the latest Carousel/Message Scroller/shared-helper
correction. The isolated realm-identity proof explains Vitest's mutable global-window alias;
independent browser windows and destination-facade adoption still need direct evidence.

Corrected Toast fast `2026-09-19T15-03-40-708Z-57525` passes all six gates and 2,662 units with no
pending cases on an unchanged 893-file fingerprint. The initial run failed one stale runtime
service/observer inventory; its correction passes the exact inventory and all other tests. Source,
tests and guidance are covered by the final fast run; later checkpoint edits only record results.
Build/API/bundle reports below predate Questionnaire and Toast and require refresh before delivery.

Questionnaire fast `2026-09-19T14-45-23-815Z-25584` passes all six gates and 2,620 units with no
pending cases on an unchanged 892-file fingerprint. Final focused verification passes 81 cases in
five files, including the last cleanup-reentry case. Source/tests/guidance are covered by the fast
run; later checkpoint edits only record results. Earlier build, API and bundle reports below predate
Questionnaire and require refresh before delivery acceptance.

Fast `2026-09-19T14-35-11-205Z-9257` passes all six gates and 2,586 units on an unchanged 891-file
fingerprint, including the two final retained-state cases. Builds, API generation and CSP graph
exclusions pass. That source-bound preview exceeds core gzip by 117 bytes, CSP Brotli by 352 and
root raw by 7,624; UI ESM/CommonJS and root UMD also exceed fixed limits. Source, tests and API
reports for the preceding Chart/Data Table cohort are covered by that fast run. Complete delivery
and audit acceptance remain unproven. Earlier reports below describe preceding cohorts.

Collection fast `2026-09-17T18-00-59-196Z-2189` passes all six gates and 2,556 unit cases on an
unchanged 890-file fingerprint. Sequential API generation and both distribution builds pass. Fresh
source-bound previews exceed core gzip by 117 bytes, CSP Brotli by 352 and root raw by 7,292; UI
ESM/CommonJS and root UMD also exceed fixed limits. All measured source hashes match and CSP graph
exclusions pass. These results verify the implementation checkpoint, not complete delivery.

The preceding choice cohort adds Color Picker, Time Picker, Multi Select, Select and Combobox.
Corrected fast run `2026-09-17T17-49-21-737Z-84471` passes all six gates and 2,502 unit cases on an
unchanged 889-file fingerprint. The prior run failed the lint ratchet; three unnecessary optional
accesses were removed without increasing an allowance. The collection changes postdate that fast
report. Owner 0006 retains all failing probes, fixture corrections and changed-file evidence.

Both choice distribution builds pass. That source-bound preview exceeds core gzip by 117 bytes, CSP
Brotli by 352 and root raw size by 6,424; UI ESM/CommonJS and root UMD also exceed fixed limits.
Those measurements precede the collection cohort and do not prove installed-package acceptance. No
ceiling or graph exclusion has changed.

The preceding September 17 delivery `2026-09-17T15-48-23-507Z-72866` passes all thirteen gates on an
unchanged 882-file fingerprint: 2,057 unit cases, all 116 production coverage files, 487 browser
cases without failures/skips/flakes, thirteen package checks, seven release checks and all detector
controls. Actual Test validation passes for 0002, 0006, 0019, 0031, 0036, 0037 and 0052 before
documentation edits. Earlier failed and interrupted runs remain recorded and grant no closure.

Owner 0052 corrects the tool advisories, V8 map differences and missing coverage-roster detection
without lowering a floor or narrowing a suite. Both raw-hit and summary rosters must exactly match
the filesystem census, even under an empty changed scope. A real 116-file control passes; removing
unchanged Sidebar and recomputing summaries fails. Owner 0002 corrects backup directory ownership
and preserves the main database with its recovery files before restore. Nine tests execute the
published shell blocks on temporary SQLite databases, including abrupt shutdown and failures before
restart. Owner 0019's repair/recovery reentry corrections and owner 0031's refreshed no-go decision
also pass full verification. These owners record their Document-phase closure separately.

Generic UI resource lifetime remains unresolved under 0006 and common contract owner 0016, with
0036/0037 awaiting the completed coexistence matrix. The original Countdown and Carousel probes
retained timers across public removal/disposal; Message Scroller retained observer delivery and
effects. The `quality-refresh-2026-09-17/ui-retained-facade-before.json` probe starts with no
controllers, disposes the kernel, then proves that the retained UI facade creates new
timers/observers on fresh roots and continues Carousel and Message Scroller effects. Cleanup must
cover late acquisition as well as existing resources. Preserve exact roots, native moves, document
isolation, re-enhancement and fixed bundle limits when implementing the correction.

The earlier thirteen-module UI source batch is included in that delivery. Its root builds,
declarations and API checks pass; UI ESM is 317,243 bytes and root UMD is 462,311 bytes. All 109
runtime sources had a first semantic review, with source/review hashes verified after the
persistence and htmx deltas. The new helper adds a 110th runtime source and the present
lifecycle/API changes require fresh reviews and bindings. Draft claim review covers 1,094 authored
units across 27 public sources; 47 sources remain. This includes refreshed coverage/recovery
interpretations, the persistence website page and both Datastar declaration reports. Final census
regeneration, immutable evidence bindings, remaining findings and manual checks still prevent a
complete audit verdict.

Tickets 0035 and 0039 still require actual screen-reader observations. Ticket 0017's GitHub
private-reporting setting change awaits separate authorization. Ticket 0053 remains the explicitly
deferred mutation audit; no mutation tool was installed or run. Other completed correction records
remain in their owning tickets. A later commit requires a delivery receipt for its exact tree;
Document-phase edits follow the passing implementation report above.

Run `node scripts/program-audit/inventory.mjs` to create a review inventory under
`.git/jqstar/program-audit/inventories/<digest>/`. The command records all 53 tickets, requires all
51 prerequisite tickets to be terminal, and derives their criteria plus the expansion plan's
criteria. It refuses unfinished prerequisites rather than producing a new acceptance inventory. It
also captures authored Markdown and HTML units from the exact public, project-brain, website, and
API source list in `quality/program-audit/inputs.json`. New or missing input files require explicit
review of that list.

The inventory is a planning artifact. Every extracted claim candidate starts unreviewed. Prose,
examples, headings, and declarations require semantic review to identify every promise and its
evidence. Extraction does not prove that the promises are complete or supported. A workspace with
uncommitted changes can produce this inventory, but it cannot provide the final immutable release
manifest. Repeating the same inventory refuses to overwrite its previous files.

Evidence adapters in `scripts/program-audit/` check named executed unit assertions, browser tests,
generated properties, static gates, installed-package and release checks, and exact source excerpts.
They reject missing or duplicate selectors, required skips, browser retries, expected failures,
stale source identities, different toolchains, and execution outside the frozen audit interval. A
green aggregate result cannot replace a named executed assertion. Installed-package citations also
require the exact Chromium, Firefox and WebKit versions from the independently frozen manifest for
both general and CSP consumers; schema-valid version substitutions fail.

Release citations require all seven named checks to pass. They bind two independent installs and
builds to the frozen tarball digest, file count, tool versions and historical comparison commit,
with zero generated-output changes. SBOM, licenses, packed-site results and provenance records must
also agree. A `release` requirement cannot be satisfied by a `package` citation or documentation.
Provenance eligibility records a capability and does not authorize publication. The final execution
index must bind the parent release gate's interval because its individual checks have no timestamps.
Final orchestration will use the release command's existing `JQS_QUALITY_FORCE_ALL=1` setting for
both quality modes. Ordinary conditional skips remain valid delivery history but cannot satisfy the
final audit's required gate roster.

`createReportLoader()` verifies report byte counts and SHA-256 digests against explicit references,
then validates the JSON against schema bytes identified by the frozen input inventory. It returns
immutable data. Nine report kinds use existing producer schemas; internal Node, Vitest, Playwright
execution and selection schemas and two raw coverage schemas validate the upstream fields consumed
by the adapters. A valid schema does not mean tests passed: named execution checks still reject
unsuccessful or incomplete runs. Connecting the loader to the final immutable manifest, execution
index, and reviewed mappings remains unfinished.

Node workflow evidence uses `node-reporter.mjs` and `selectNodeTest()`. The reporter preserves flat
Node test outcomes, source paths, file summaries, counts and execution identity. The selector
requires an independently frozen exact source/name roster, matching Node and run identities, the
parent execution interval, nonempty matching counts and no failed, cancelled, skipped or todo tests.
Nested tests and sources outside the declared root are rejected. Final orchestration must freeze the
source-derived roster before invocation and verify the supervised process exit independently; the
report cannot supply its own expected identity or interval.

Coverage evidence uses `selectCoverage()` with summary and hit-map artifacts loaded against their
frozen internal schemas. It recomputes all file and aggregate metrics, checks exact production and
source-digest rosters, validates counter/map identities and source locations, and bounds statement
expansion before evaluating changed lines. Coverage execution must match the entire independently
collected test roster, including the multiplicity of parameterized cases with equal display names.
Every assertion must pass inside the supervised coverage interval. Individual named-test citations
still require a unique match.

The selector binds the parent command, npm version, time limit, source scope, policy and immutable
threshold baseline to independent expectations. It compares the producer report with a fresh
evaluation of the raw evidence. Literal selectors are `denominator`, `delivery-floors`,
`stabilization-floors`, `threshold-ratchet`, `changed-production` and `executed-requirements`.
Delivery evidence cannot satisfy stabilization floors; an empty changed-production scope returns
`not-measured`. Source, unit and static citations cannot replace measured coverage evidence. Final
orchestration must freeze all schemas, inputs and collected tests before execution and bind the
validated parent quality envelope and execution index. Retained-report compatibility tests do not
establish that final acceptance.

Detector evidence uses `selectDetector()`. Every exact control-name selection validates all sixteen
controls together, including nine raw browser failures and their indexed traces, eight deliberate
empty selections, eight complete green listings, and the intended package, release and API failures.
The deliberate retry must fail once, pass once and remain flaky. Its trace must belong to the failed
attempt. The adapter checks the frozen source, tools, invocation, project policy and parent
interval, and reconciles summary counts and diagnostics with the raw child reports.

The separate internal Playwright selection schema permits empty listings. Green listings must match
the entire independently frozen test roster. Listing records have zero attempts and are never
counted as passing executions. `loadBinaryArtifact()` applies the existing bounded file protections
to trace bytes and returns immutable digest, size and signature metadata. Traces must be nonempty
ZIP artifacts; the adapter does not unpack or execute them. API comparison permits only CRLF-to-LF
normalization and preserves both original byte identities. A `detector` requirement cannot be
satisfied by source, unit, browser or coverage citations. Final orchestration must collect expected
cases before invocation and bind every child artifact to the validated parent execution.
Retained-report checks are compatibility evidence, not final acceptance.

Navigation evidence uses the frozen decision schema's raw measurement definition. A decision
document or the ordinary nine-scenario browser subset cannot satisfy that contract. The adapter
requires all 840 flow records across thirty candidate/configuration/browser rows and every named
assertion. All 498 applicable configured flows must pass; six declared no-JavaScript exclusions
remain exclusions. Host-default failures stay recorded as observations. Artifact, fixture,
dependency, bundle and tool identities must match the frozen expectations, and successful flows must
show complete cleanup. Navigation selectors are literal JSON arrays containing the candidate,
browser and scenario ID, and select only configured executed passes. The read-only component
executor below supplies its own frozen inputs and supervised parent interval.
`loadNavigationExecution()` binds that component index to independently frozen inputs, source,
ordinary tarball, browsers, Node executable and execution interval. It verifies the separate process
record, every log and raw-report reference, the complete raw matrix and its computed summary, and
unchanged prepared inputs before and after loading. Returned observations and selector context are
immutable. Callers must explicitly identify development or final evidence; final evidence requires a
clean source. The whole-program manifest and acceptance matrix remain unfinished.

Run the full navigation component after preparing the installed candidates separately:

```sh
node scripts/prepare-navigation-decision.mjs --force
node scripts/program-audit/run-navigation.mjs \
  --artifact .git/jqstar/navigation-decision/jquery-star-1.1.0.tgz
```

The audit executor only reads the prepared build, ordinary tarball and digest-named alias, root
lock, fixture inputs and six installed bundles. It refuses stale preparation rather than rebuilding
it. It records actual browser versions and every source/schema/artifact identity before a fixed
child command executes all thirty rows. The child serves a verified temporary asset snapshot,
preserves host-default failures and closes browsers/server before removing its owned snapshot. The
parent checks the actual process outcome, input stability, raw schema and complete navigation
selector.

Immutable manifests, individual completed rows, logs, raw results and the process/index records live
under `.git/jqstar/program-audit/navigation-executions/`. A failure retains diagnostics and cannot
produce a passing execution index. The command does not update `quality/navigation-decision.json`.
Its result is a navigation component result, not the complete program verdict. A mutable development
workspace is recorded explicitly; final program acceptance still requires a clean frozen candidate.

Browser selectors may use a unique spec title or a JSON array containing every parent suite title
followed by the spec title. The latter distinguishes equal titles in separate groups. Missing or
duplicate matches fail. All selectors are literal strings, including embedded asterisks; they never
expand patterns. Empty selectors and a bare wildcard are rejected.

Text evidence must be bounded regular UTF-8 files beneath the selected root. Binary trace metadata
uses the same file boundary without decoding the bytes as text. The reader refuses symbolic links,
traversal, changed files, and digest mismatches. Snapshots use exclusive creation, deterministic
JSON, and read-only file permissions. Their digests detect later changes. File modes are protection
against accidental editing, not a guarantee against a user who controls the filesystem. The reader
is not a sandbox against another privileged process changing ancestor directories concurrently.

Both real [assistive-technology charters](accessibility/RELEASE_CHARTERS.md) remain required for the
final candidate. Records must identify the exact tarball, commit, quality receipt, supported tool
versions, tester, date, profile, and observations for every step. VoiceOver records include the
Quick Nav setting for each step. The validator checks completeness and identity. It cannot prove
that a person performed the test. Synthetic test records and automated accessibility checks do not
count as manual evidence.

The final audit still needs reviewed mappings for every requirement and public claim, a clean source
freeze, both complete quality modes, verified current subordinate reports, declined-feature decision
and absence proof, and the two manual records. The inventory command does not build, publish, change
tickets, or execute mutation tooling.

### September 21 document listener continuation

The shared observer/UI acquisition checkpoint is verified: 4,843 units, six fast/23 static gates,
3,418 integration assertions in 108 files, and all 1,155 browser cases pass against 921 matching
inputs. The all-entry isolated build and source maps match that snapshot. This evidence is
historical after the listener continuation's edits and does not close full-audit criteria.

Owner 0006 now corrects document listener acquisition and identity. The promoted 30-case negative
has seventeen failures/thirteen controls. Two nested-option follow-ups expose a further provisional
identity failure; the correction separates pending registrations while preserving completed native
duplicates. The expanded 37-case suite and 186-test kernel/plugin/bridge selection pass. All 39
focused actual-browser cases pass, including 28 native/owned passive-default comparisons per engine.
Complete types pass after fixture corrections (41598 exit 0); final whole-tree gates still require
bound verification. The isolated all-entry measurement records every unchanged fixed budget overrun;
no ceiling or entry is omitted.

Data Table cost, Menubar ambiguity, retained documents/heap, actual generic/UI Turbo and htmx hosts,
fixed budgets, declaration/API/package/installed-consumer proof, full semantic source/claim review,
manual accessibility and actual npm run check/full delivery remain open. Tickets 0006/0033 remain
coding. No commit, push, publication, external message or mutation-tool run is part of this work.

The next complete fast run passes 4,880 units and all gates, but subsequent getter replacement
regressions prevent accepting that snapshot. Twelve public follow-ups fail with thirty-seven
controls. Acquisition ordering corrects them; 198 focused tests, 54 actual-browser cases, complete
types and lint now pass. The final selection is 1,209 browser cases; final whole-tree acceptance
remains pending. Both interrupted browser runs and prior passing reports remain historical.

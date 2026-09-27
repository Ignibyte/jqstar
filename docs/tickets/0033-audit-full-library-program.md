---
id: 0033
title: Audit the full library program
status: coding
created: 2026-08-30
updated: 2026-09-23
---

# 0033: Audit the full library program

## Plan

### Browser-first policy update (2026-09-23)

Ticket 0054 supersedes this umbrella audit's earlier mandatory 100% changed-code and all-unit
delivery checks. Browser component behavior is now the primary UI proof. Focused direct tests and
optional coverage diagnostics remain available; the final program-audit mappings must be reconciled
with this policy before 0033 closes. Historical coverage measurements below remain dated evidence,
not current delivery blockers. Package budgets, full browser proof, manual accessibility and other
unfinished program criteria remain open.

Owner 0006 audits Sortable's native drag transaction on the matching 54-failure, 34-file delivery
baseline. Direct same- and foreign-Document events must establish valid and invalid `dragstart`,
transfer payload and effect, `dragover` preview with stable FormData, committed background drop,
`dragend` cancellation, canceled `before-change`, and nested-controller isolation. The existing
trusted three-engine browser drag remains a required control. The planned ledger is the Sortable
document suite, any proven owner source fix, owner/umbrella tickets, COMPONENT_ARCHITECTURE, TESTING
and PROGRAM_AUDIT. Validate Plan before edits; compare focused, coverage, exact-tree fast and full
delivery without changing fixed limits or public signatures. Wider audit criteria remain open.

Owner 0006 opens a shared floating-state audit on the matching 56-failure, 34-file delivery
baseline. Require direct external native hide/show evidence for Tooltip, Hover Card, Popover, Menu
and Context Menu: reflected state and contract-defined trigger ARIA, no duplicate lifecycle
notifications and retained outside dismissal. Popover and Hover Card also need focus and geometry
evidence when stable enhancement restores a lost native overlay. One selected actual-browser case
must verify external hide/show in Chromium, Firefox and WebKit. The planned ledger is the shared
floating resource test, selected browser fixture/spec, any proven owner source correction,
owner/umbrella tickets, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT. Validate Plan before
edits; compare focused, coverage, exact-tree fast and full delivery without changing signatures or
fixed limits. Wider program criteria remain open.

### Multiline initializer coverage-map attribution (2026-09-23)

The matching delivery report `2026-09-23T23-55-50-488Z-65952/report.json` fails 75 changed-code
checks in 35 files. Nineteen files have 40 changed `const` declaration headers reported as
runtime-emitting but absent from coverage maps. Raw V8/Istanbul statement maps place executed
initializer statements on the following lines for each of those declarations; the separate
uninitialized class field in `src/kernel.ts` remains without a mapped hit. This is a coverage
evidence attribution gap, not permission to lower a floor or exempt executable code. Attribute a
multiline declaration header only to statement counters whose mapped start lies inside its own
initializer syntax; retain an explicit zero counter on the header, treat an all-zero initializer as
uncovered, and keep unrelated or unmapped declarations failed. Record the source line, mapped
statement IDs/lines and hit count in the report for audit. Preserve complete roster, changed-line,
function, threshold and detector contracts.

Planned ledger: `scripts/quality/coverage-report.mjs`, `schema/coverage-report.schema.json`,
`test/quality/quality-gates.test.mjs`, `test/program-audit-coverage.test.mjs`, this ticket,
`docs/QUALITY_PROGRAM.md`, `docs/TESTING.md` and `docs/PROGRAM_AUDIT.md`. The independent
program-audit fixture must include the new evidence field so its strict raw-report comparison
remains intact. Validate Plan before changing the evaluator. Run positive and
zero/omitted/unrelated/explicit-zero controls, focused quality tests, a replay against retained raw
coverage and the complete standalone coverage gate, then exact-tree fast and full `npm run check`.
Compare the original 75/35 failures and 937 uncovered lines/73 functions without changing package
budgets or other audit criteria. This is umbrella audit progress; owner 0052 remains terminal and is
not reopened.

Owner 0006 opens a Form clear-errors and native Menu interaction audit on the matching 75-failure,
35-file full delivery baseline. Require a direct wrong-kind `clear-errors` target with valid names
to prove no nearby native validity is cleared, plus matching-root, selector and implicit controls.
Exercise documented ContextMenu-key, canceled touch long-press, and native versus authored disabled
focus behavior in Menu/Context Menu through public state and events. Menu also needs a direct
native-popover `toggle` state-sync check. The planned ledger is the three component tests, selected
browser fixture/spec, any proved source fix, owner/umbrella tickets, COMPONENT_ARCHITECTURE, TESTING
and PROGRAM_AUDIT. Validate Plan before edits; compare focused, coverage, fast and full delivery
evidence without changing fixed limits or public signatures. Wider program criteria remain open.

Owner 0006 opens an explicit native-element target audit for Dialog, Form, Disclosure, Menu/Context
Menu and Toggle on the matching 75-failure, 35-file delivery baseline. These action resolvers may
fall through from wrong-kind HTMLElement arguments to an implicit local component. Form `set-errors`
and Toggle `press` also need target/value overload probes. Require public original-source negatives
and matching-element, selector and implicit controls before source correction. The planned ledger is
five source modules, six component test files, selected actual browser fixture/spec, owner/umbrella
tickets, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT. The fast release check also adds
`etc/jquery-star-ui.api.md` to refresh an existing warning line reference after the Dialog edit,
without a public API declaration change. Validate Plan before edits; compare focused, coverage, fast
and full delivery without changing fixed budgets or public signatures. Wider program criteria remain
open.

Eight original-source public cases fail across six suites, and the separate Toggle `press`
non-button overload probe fails. Owner 0006 has direct redirect and target/value evidence for the
planned correction.

Owner 0006 opens an additional explicit HTMLElement action audit on the matching 75-failure, 35-file
delivery baseline. Combobox, Tabs, Data Table, Chart, Tooltip, Carousel, Hover Card, Select, Popover
and File Upload can redirect a wrong-kind native target to a nearby implicit component. Require
original-source public negatives and matching-element, selector and implicit controls before
correcting each existing resolver. Tree, Carousel and File Upload target/value overloads need direct
native-root probes. The planned ledger is their eleven controller/test pairs, selected
actual-browser fixture/spec, owner/umbrella tickets, COMPONENT_ARCHITECTURE, TESTING and
PROGRAM_AUDIT. Validate Plan before edits; compare focused, coverage, fast and full delivery without
changing fixed budgets, signatures or lint allowances. Other program criteria remain open.

Tree's action registration currently rejects a native-root/value call before its resolver runs; that
family needs overload evidence, while the simple named actions in the other families expose the
redirect. Carousel `go` and File Upload `remove` need separate overload evidence.

The original-source selection fails all thirteen new cases across eleven suites: ten actual
redirects and three native-root/value overloads. Owner 0006 now has direct evidence for the planned
correction.

Owner 0006 audits explicit HTMLElement routing in Transfer List, Log Viewer, JSON Viewer,
Pagination, Message Scroller and Countdown on the 76-failure, 35-file delivery baseline. Require
public wrong-kind negatives and matching-element, selector and implicit controls before narrow
resolver fixes. Message Scroller `follow` needs a direct element target/value probe. Preserve each
native form, focus, announcement, timer and ownership contract. The planned ledger is the six
controller/test pairs, selected three-engine browser fixture/spec, owner/umbrella tickets,
COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT. Validate Plan before edits; compare focused,
coverage, fast and full delivery evidence without changing fixed budgets, signatures or lint
allowances. Other audit criteria remain open.

Six original-source public wrong-kind element cases fail, and the separate matching native root
`follow(root, false)` case fails. They confirm redirected nearby actions and Message Scroller's
target/value misclassification before the narrow owner correction.

Owner 0006 opens a Color Picker and Editable explicit-target audit on the corrected 77-failure,
36-file delivery baseline. Reproduce wrong-kind HTMLElement redirects through public named actions
with matching-element, selector and implicit controls before a narrow existing-resolver correction.
Exercise native color disabled/validation boundaries and Editable focus, selection, validity and
change reentry only through observable behavior. The planned ledger is their component tests, proven
controller fixes, selected browser fixture/spec, owner/umbrella tickets, COMPONENT_ARCHITECTURE,
TESTING and PROGRAM_AUDIT. Validate Plan before edits; keep signatures, fixed budgets and the rest
of the audit unchanged. Focused, coverage, fast and full delivery checks must compare against 77/36.
Full-program acceptance remains open.

The two original-source public negatives fail: both wrong-kind element actions redirect to their
nearby implicit component. The planned resolver correction is supported by direct behavior evidence.

Owner 0006 adds a Password Field and Sidebar audit wave after the shared-lifecycle fast pass. Their
named action resolvers appear to redirect an explicit wrong-kind HTMLElement to a nearby implicit
component. Require direct public negatives and matching-element, `#id` and implicit controls before
a narrow source correction. Add native visibility reentry/replacement and mobile backdrop/focus
cases, then compare focused and delivery coverage with the 80/37 baseline. The planned ledger is the
two component tests, any proved owner source fix, owner/umbrella tickets, COMPONENT_ARCHITECTURE,
TESTING and PROGRAM_AUDIT. Validate Plan before edits; keep fixed thresholds, package limits and
remaining audit criteria open.

The two new owner negatives fail while 13 controls pass: the wrong-kind element action resolves to
the caller's implicit component. The planned correction is supported by public behavior evidence.

The corrected owner focus passes 20 cases and standalone delivery-mode coverage falls from 80
failures in 37 files to 77 in 36. Password Field clears; Sidebar retains one defensive line. Owner
0006 adds the existing native-element browser fixture/spec to this wave's ledger for both components
and wrong-kind rejection across desktop engines. Other criteria stay open.

Owner 0006 opens a shared lifecycle/preserved-focus audit wave on the matching 81-failure, 37-file
delivery baseline. Exercise reset cancellation reentry, dual-failure UI acquisition,
detached-Document rejection and disposal at the native preserved-focus listener checkpoint through
the existing scoped-observer and focus tests. Correct source only if a direct behavior test fails.
The planned ledger is those two tests, any proved `src/ui/lifecycle.ts` or `src/kernel.ts` fix,
owner/umbrella tickets, TESTING and PROGRAM_AUDIT. Validate Plan before edits; run focused,
coverage, fast and complete delivery checks without changing fixed thresholds or package budgets.
The other audit criteria remain open.

Owner 0006 opens the next native-element action wave on the matching 87-failure, 39-file delivery
baseline. Input OTP, Search Field, Tags Input, Stepper and Multi Select have target/value named
actions that appear to treat an explicit root element as an implicit value, despite element-capable
facades. Require direct public negatives and retained `#id`/implicit/wrong-kind controls before a
source correction. The planned ledger is their five test and controller files, owner/umbrella
tickets, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT. Validate Plan before edits, then run
focused, changed-code coverage, fast and complete delivery checks without changing any fixed
threshold or package budget. Other audit criteria remain open.

The first five owner negatives fail with 21 existing controls passing. Each element target is
misclassified as an implicit value and resolves `undefined`; the planned source correction is now
supported by direct public-action evidence.

The corrected 35-case focus and subsequent behavior cases reduce standalone delivery-mode coverage
to 81 failures in 37 files, clearing Search Field and Tags Input. Owner 0006 adds the existing
native-element browser fixture and selected spec to this wave's ledger for the five target/value
action families, native values, implicit form and mismatched-root rejection across desktop engines.
The three other targeted files and all wider audit criteria remain open.

Owner 0006 opens the next changed-code coverage wave for Number Field, Time Picker, Rating, Toggle
and Toolbar on the 93-failure, 44-file delivery baseline. Exercise observable native-event
cancellation, reentrant replacement, focus boundaries and element-target named actions, correcting
source only for reproduced faults. Keep the fixed coverage/package limits and all other audit
criteria. The planned ledger is their five existing test files, any proved source correction, owner
and umbrella tickets, TESTING and PROGRAM_AUDIT. Validate the Plan before edits, then run focused,
coverage, fast and complete delivery checks against the same failure categories.

The first direct action probe fails in all five new element-target cases while 24 existing controls
pass. Owner 0006 now plans a narrow resolver correction for explicit element targets in the five
controller action overloads, retaining implicit value/amount and `#id` forms. Add mismatched-target
negatives, then compare focused and delivery evidence without changing any fixed budget.

The same Toggle source also has a Toggle Group select/toggle element-target ambiguity. Owner 0006
extends the existing Toggle file/test ledger to cover that path and a foreign-element negative,
without broadening the public API beyond the facade's existing element target.

The corrected five-file wave clears its targeted sources in full changed-code coverage and leaves 87
failures across 39 files. Add one selected actual-browser fixture/spec for element-target actions
and native value/focus controls across the desktop engines before fast and full delivery. Owner 0006
adds those two e2e files to its ledger; package limits and other audit requirements remain fixed.

The first owner 0006 coverage wave adds behavior tests without production changes. A standalone
delivery-mode coverage run reduces the changed-code failure count from 96 across 47 files to 93
across 44: Clipboard write, floating ownership and Pagination now clear. Full exact-tree delivery
remains required, and the other 44 files plus fixed package overruns keep umbrella acceptance open.

Owner 0006 begins a changed-code coverage recovery wave on the current 96-failure, 47-file backlog.
The first bounded cluster exercises Clipboard cancellation during host callbacks, floating-content
owner handoff/reconciliation and Pagination's element-target action, with no threshold or package
budget change. Add direct behavior evidence, correct only reproduced faults, and compare the same
coverage report categories before claiming any reduction. Planned changes are the focused tests, any
proven source fix, owner/umbrella tickets, TESTING and PROGRAM_AUDIT. Validate Plan before edits,
then run focused, changed-code, fast and complete delivery checks; the remaining coverage and
package failures keep full-program acceptance open.

Owner 0006's plain nested-application correction now passes direct regression. Extend the opt-in
actual-host backend matrix with a separate `nested=1` mode under owner 0016. Check child-only
requests and outer state across pinned Turbo/htmx versions and desktop engines, while retaining the
single-app control. Record selected and full-delivery evidence without treating this slice as full
common-matrix or audit closure.

### September 23 actual-host backend coexistence continuation

Owner 0016 opens a pinned Turbo/htmx browser slice for core generic JSON/HTML and official-SDK
Datastar SSE through real same-origin responses before and after host replacement. It will require
generic request isolation, SDK protocol use, live patched directives, before-native-removal outgoing
application destruction, incoming enhancement, preserved neighbor identity, and no-bridge timing
negatives. The active-pointer and earlier UI slices remain evidence for separate resource families.
Error/cancellation combinations, remaining asynchronous UI families, fixed size and coverage gates,
and all whole-program acceptance remain open.

The first Turbo backend probe also found duplicate directive handling when `#main` and an opt-in
backend child were both applications. The Datastar request serialized the outer `count: 2` after the
child displayed `count: 8`; htmx's un-nested child serialized `count: 8`. The transport fixture will
use one backend application per outgoing/incoming boundary while owner 0006 investigates the
separate nested-application ownership failure. No full-audit acceptance follows from isolating the
fixture.

The tracked backend selection passes twelve pinned host/version/engine cases; the combined baseline,
three UI slices and backend selection passes 78. Real generic JSON/HTML and SDK SSE requests run
before and after host replacement, with distinct profile headers and query bytes, patched
directives, one request completion each, preserved neighbor identity, and outgoing application
destruction before native removal. Turbo 8.0.21 and htmx 2.0.0 no-bridge Chromium diagnostics render
but fail that ownership timing assertion. Owner 0006 has a validated Plan for the independent
nested-app finding. Full delivery and common-matrix closure remain open.

Fast report `2026-09-23T12-22-01-861Z-17907/report.json` passes all six lanes. Full `npm run check`
report `2026-09-23T12-24-53-903Z-32528/report.json` starts and ends on the matching 931-file
fingerprint `c48b8ae5288284bbf0cf34914003227be85be11bf5f20879fe1ca329fe7e5665`. The browser gate
passes all 1,690 cases across eight projects, 554 per desktop engine, without failures, flakes or
skips. Coverage fails 96 changed-code checks spanning 47 of 59 changed source files. Package quality
fails three fixed limits: 3,414,397 packed bytes, 559,198-byte Mobile UMD and 635,719-byte installed
root bundle. Package-budget detector isolation fails alongside those baseline errors; the other
fifteen controls pass. No delivery receipt or umbrella acceptance follows.

### September 23 package-size measurement and pointer-host continuation

The preceding package report fails three unchanged limits: 3,413,555 packed bytes versus 3,174,000
combined allowances, 559,198-byte UMD versus 462,311 reviewed Mobile measurement (and 464,896 raw
UMD cap), and 635,719-byte installed root bundle versus 542,720. The package contains 265 files. An
isolated UMD build reproduces 559,198 bytes; function hoisting grows it, approved private property
mangle reaches only 554,922, and an exploratory modern/unsafe/top-level/mangle combination reaches
551,030. None closes the 97 KB UMD gap. Embedded source text in 37 maps accounts for about 968 KB of
separately gzipped content, but removing it would break useful installed source maps because `src/`
and bundled dependency sources are not packaged. No minifier, map, budget or package file-list
change is accepted from this measurement. A measured source-level or source-map packaging Plan
remains necessary; the package blockers are open.

Owner 0016 opens a third actual-host UI slice for an active Resizable pointer drag through Turbo and
htmx replacement. It will verify release of window pointer listeners and capture before the native
connected-to-detached call, no detached mutation, new incoming drag, preserved identity and
no-bridge timing negatives across twelve pinned host/version/engine cases. The other asynchronous
families and generic/Datastar host traffic stay open.

The tracked pointer selection passes all twelve cases. The combined actual-host baseline, Countdown,
Message Scroller and pointer selection passes 66 cases across Chromium, Firefox and WebKit without
retries, skips or flakes. Real capture and the three drag listeners release before the native
disconnecting call; the detached root remains inert and the incoming Resizable completes a new
trusted drag. Turbo 8.0.21 and htmx 2.0.0 no-bridge diagnostics render but fail the same cleanup
timing assertion. Full delivery on this snapshot remains pending; this does not close the common
host matrix or the package and coverage blockers.

Fast report `2026-09-23T08-07-35-086Z-97413/report.json` passes all six lanes. Full `npm run check`
report `2026-09-23T08-11-31-064Z-12902/report.json` starts and ends on the matching 930-file
fingerprint `4549ffeec61b8baa365dcacd5439983d1fa846309774604b405c86e69b080ff8`. All 1,678
eight-project browser cases pass, 550 per desktop engine. Coverage still fails 96 changed-code
checks in 59 inherited files; package quality fails packed size 3,413,833 bytes, UMD 559,198 bytes
and installed root bundle 635,719 bytes against fixed limits. Package-budget detector isolation
fails alongside these baseline errors; the other fifteen controls pass. No delivery receipt or
umbrella acceptance follows.

### September 23 actual-host UI resource continuation

Owner 0016 opens a second Plan for actual-host Message Scroller observer and listener ownership. It
will require disconnect and listener release before native removal, no detached message events, new
incoming resources and preserved neighbor identity across all twelve pinned host/version/engine
cases. Countdown remains the first completed slice. The remaining pointer/asynchronous and
generic/Datastar host paths stay open.

The tracked Message Scroller selection passes all twelve cases. The observer disconnects and the
viewport/button listeners release before the native host removal; the detached root stops emitting
messages and Latest actions, and the incoming root acquires distinct live resources. Turbo and htmx
no-bridge Chromium negatives fail the exact before-removal assertion. The prior host baseline,
Countdown and Message Scroller selections pass 54 combined cases across three engines. The expanded
929-file tree passes all fast gates and 4,927 units in `2026-09-23T06-19-06-627Z-88701/report.json`.
Full `npm run check` report `2026-09-23T06-22-37-775Z-4099/report.json` starts and ends on matching
fingerprint `4dfe1d00b51324252d4a434e2712071f3b12833391aa5bd125f7fd802ef14b86` and passes all 1,666
eight-project browser cases with no failures, skips or flakes. It remains red on 96 changed-code
coverage failures in 59 inherited files, three fixed package-size limits and the package-budget
detector isolation control. The other 15 controls pass. There is no delivery receipt; the full
common matrix and all umbrella criteria remain open.

Both actual-host UI specs now require the instrumented native method itself to change the outgoing
root from connected to detached. The 54-case combined matrix and twelve-case Countdown rerun pass
with this stricter criterion. The tightened snapshot's fast report
`2026-09-23T07-02-30-808Z-83440/report.json` passes every gate and 4,927 units. Full `npm run check`
report `2026-09-23T07-05-16-938Z-98065/report.json` starts and ends on the matching 929-file
fingerprint `78046212cd320bdd1aa937a52352d370f54bc221eb733938e843a98fe540375a`. The eight-project
browser gate passes all 1,666 cases with no failures, skips or flakes. Coverage still fails 96
changed-code checks in 59 inherited files; package quality fails the three fixed size limits and its
detector isolation control. The other 15 detector controls pass. No delivery receipt or umbrella
acceptance follows.

The prior 30-case Turbo/htmx baseline has no installed UI plugin. Owner 0016 opens a validated Plan
to add an opt-in actual-host Countdown resource case across both pinned versions of both hosts and
all three desktop engines. A read-only current-dist probe passes twelve transitions with timer
release before the native outgoing removal, new incoming enhancement and permanent/preserved
neighbor identity; no-bridge negatives fail that timing assertion while the host still renders.
Owners 0036/0037 record their version-specific scope. This is one timer-family slice of the common
coexistence matrix. Observer, listener, pointer, async, generic JSON/HTML and SDK SSE under actual
hosts, fixed package budgets, coverage and complete delivery remain open.

The validated owner Plan now has a tracked opt-in host fixture and selected browser proof. A fresh
all-entry build passes; all twelve new Countdown cases and the existing 30-case Turbo/htmx baseline
pass across Chromium, Firefox and WebKit, with no skips or flakes. The two no-bridge negatives fail
the before-removal timer assertion while the hosts still render. Owner 0016 records the changed-file
ledger; downstream 0036/0037 keep their full coexistence criteria open. Fast report
`2026-09-23T05-25-10-674Z-91111/report.json` passes all gates and 4,927 units. `npm run check`
report `2026-09-23T05-27-52-448Z-6211/report.json` starts and ends on the same 928-file fingerprint
`f4e40272669fb80ade224b793607865db61c944864fbf8ccfcbf81370f95ad97` and passes all 1,654 browser
cases with no skips or flakes. Coverage still fails 96 changed-code checks in 59 inherited files.
Package quality fails the unchanged packed, Mobile UMD and root-bundle size limits; its detector
isolation control is the only failed self-test. There is no delivery receipt.

### September 22 core document-collection continuation

Owner 0006's 927-file UI heap checkpoint passes 4,927 units and all six fast/23 static gates. An
ignored core-only probe adds 39 disposed Documents from idle, behavior and declarative applications,
plugin/document listeners and first observer acquisition. Three sequential runs pass the fixture
behavior controls and collect all 39 on the first explicit Chromium GC. Owner 0006 opens a Plan to
promote these into the existing 208-document tracked test, for 247 exact document weak references
and the same strong/weak controls and twelve-cycle limit. This remains a bounded Chromium proof;
cross-plugin combinations, long-run heap, other engines and final program gates stay open.

The tracked combined command now passes one initial and three repeat runs with 247 of 247 disposed
Documents collected after the first Chromium GC: 208 UI and 39 core-only documents. All 143 fixture
controls pass, the weakly referenced detached control collects and the strongly held control stays.
Separate injected strong references to UI `resizable` and `core/idle` cause named retention
failures. Owner 0006 records the changed-file ledger and remaining limits. The expanded 927-file
tree passes 4,927 units and all six fast/23 static gates under
`2026-09-23T04-25-39-616Z-78632/report.json`. The same fingerprint reaches full delivery in
`2026-09-23T04-28-38-245Z-93163/report.json`: eight browser projects pass 1,642 cases with zero
skips/flakes/errors, while coverage fails 96 changed-code checks in 59 inherited files, package
quality fails three fixed size limits and the package-budget detector is the only failed self-test
control. Fifteen other detector controls and the release, property, static and self-hosted gates
pass. There is no delivery receipt or final acceptance.

### September 22 retained-document measurement continuation

Owner 0006 opens a Plan to promote an ignored Chromium GC diagnostic into a repeatable standalone
test. The diagnostic already exercises 50 controller families and 100 disposed documents, plus all
six modes for nine active-record families and 108 more documents. A held detached document survives
while the weakly referenced documents collect after explicit GC. The tracked test will reuse current
ownership fixtures, bind an ephemeral loopback Vite server and pinned Chromium, and keep the
twelve-cycle collection limit and cleanup controls. This is source-fixture, Chromium-only heap
evidence; generic kernel and longer-run heap work, other engines, fixed budgets, coverage and full
delivery remain open. The owner ledger includes the new standalone test, both tickets, TESTING and
PROGRAM_AUDIT.

The tracked test now passes four consecutive runs: 104 ownership exercises capture and collect 208
disposed Documents on the first explicit Chromium GC, with weakly referenced and held controls
behaving as expected. A saved injected strong-reference diagnostic fails on the retained `resizable`
Document. Owner 0006 records the commands and limits. This does not close the generic or
full-program heap criteria.

### September 22 Menubar selector continuation

Owner 0006 opens a validated measurement-first Plan after the bounded Data Table checkpoint.
`@ui.menubar.open|focus` currently treats any first string beginning with `#` as a target even when
it is a local menu value, while a two-argument class/attribute selector is treated as an implicit
value. The string facade also stops at an unrelated first selector match. Promote public negatives
and controls before correcting Menubar resolution. The owner ledger includes its new selector suite,
Menubar source, one browser fixture/spec control per engine, component/testing/program docs and both
tickets. Preserve native focus, child ownership, exact values, the public signature and every fixed
budget. All program criteria remain open.

The public negative has four failures and one passing control. Owner 0006 corrected action
disambiguation in Menubar and installed-facade string selection in the document lifecycle guard; it
extended the planned ledger to include `src/ui/lifecycle.ts`. The six-case selector suite and
58-case Menubar/Menu/document selection pass. One native case per Chromium, Firefox and WebKit
passes value, action target, facade target, focus and popup controls. Full current-tree gates and
delivery still determine audit acceptance.

A follow-up local two-argument negative exposed a missing target silently selecting the local
Menubar. Owner 0006 corrected it and invalid-selector normalization without changing the action
signature; seven selector cases and 59 focused Menubar/Menu/document cases now pass. The first
complete browser run was stopped when this edge appeared and cannot bind final source evidence.

The final frozen 926-file Menubar checkpoint passes 4,927 units, six fast/23 static gates and 1,248
browser cases (416 per engine, zero skips/flakes/errors). Owner 0006's verifier binds 3,502
integration assertions/113 files, all-entry maps, twelve unchanged declaration/API reports and 262
outputs to fingerprint `da0c1aba560ac19180d160e52fbfabdb3c11bf9100ea584bcd3f81bb9317afe2`. An
additional 30-case actual Turbo/htmx baseline passes on that source. Fixed size overruns remain,
including 92,002 UI ESM and 94,302 UMD raw bytes. Installed consumers, full hosts, retained
documents/heap, coverage, manual accessibility, semantic claims and `npm run check`/delivery remain
open; no umbrella criterion is closed.

The documented 926-file tree passes a fresh 4,927-unit fast run, but `npm run check` fails on an
unchanged fingerprint: changed-code coverage reports 96 failures in 59 inherited changed files,
package quality fails packed, UMD-reference and root-bundle limits, and its browser and detector
gates are initially affected by orphaned fixture ports. Installed consumers, release, property,
static delivery and self-hosted gates pass. With ports clear, standalone browser quality passes
1,642 cases across all eight projects; the detector retry fixture passes, leaving only its
package-budget isolation failure. No delivery receipt or full-audit acceptance follows from these
independent passes. Owner 0006 records exact reports and remaining work.

### September 22 Data Table cost continuation

Owner 0006 records a new measurement-first Plan after the verified staged listener checkpoint.
`sourceGuard` currently rereads every row in calls made within row loops, so unchanged page and
enhancement work may grow faster than the row count. Promote a deterministic row-read diagnostic at
two table sizes, retain its negative, then correct only the confirmed cost while preserving
synchronous replacement and native behavior. The owner ledger covers the new public cost suite, Data
Table source if needed, both tickets and affected testing/program documentation. Existing
family/browser controls, fast/static, fixed budgets and later installed-package/full delivery remain
required. This Plan does not close any umbrella criterion.

The owner Plan also adds one actual-browser cost/output control per engine to the document fixture
and spec. Its row-read and root-query measurements must agree with the source-level bounds.

The first selected browser run passes 24 cases, eight per engine. Before full proof, owner 0006
extends the observer rollback Plan for an instrumented observe-then-throw and cleanup failure after
another error; the public negative must preserve both errors and disconnect provisional work.

The five-case public diagnostic now has four failures and one native-page control. Doubling rows
from 12 to 24 increases page row-text reads from 1,776 to 5,856; a 24-row page makes 500 whole-root
selector queries. Owner 0006 records a transaction-scoped observer/dirty-snapshot design before
source edits, with synchronous mutation and cleanup controls. The measured negative remains saved.

The correction now uses a short-lived native observer, cheap per-call ownership/settings checks and
full source/part scans when relevant DOM changes. A follow-up negative proves invalidation must
latch after a synchronous row edit or replacement. The first focused selection passes 129 tests/four
suites, including observer cleanup after success/error. The diagnostic drops 12/24-row page text
reads from 1,776/5,856 to 36/72 and 24-row whole-root queries from 500 to 18. Type, lint,
three-engine browser, exact-tree fast/static and fixed-budget evidence must still bind the final
documented source; no full-audit criterion is closed.

The observer setup/cleanup negative adds two failures: registered-then-throw observe work was not
disconnected, and cleanup failure hid the primary setup error. Both are corrected without a new
public API. The final focused run passes 131 tests; all 24 selected Chromium/Firefox/WebKit cost,
document ownership and native component cases pass. This focused-only status predates the complete
checkpoint below; installed-package, budgets and delivery evidence remain open.

The bounded Data Table checkpoint now passes 4,920 units, all six fast/23 static gates and 1,245
browser cases (415 per engine, zero skips/flakes/errors) on 925 matching files. Owner 0006's
verifier binds 3,495 integration assertions/112 files, all-entry maps, twelve declaration/API
reports and 262 declaration outputs. The same source passes the existing actual Turbo/htmx baseline
(30 cases, ten per engine); generic/UI host conformance remains untested. Fixed size excesses
remain, including 91,194 UI ESM and 93,494 UMD raw bytes. No ceiling, API baseline or allowance
changes. AC-39 and all umbrella acceptance criteria remain open pending package/coverage/full
delivery and the broader audit.

### September 22 staged plugin listener cancellation continuation

The previous document-listener checkpoint is now bound to 922 matching inputs: 4,892 units, 3,467
integration assertions in 109 files, all fast/static gates, and 1,209 browser passes (403 per
engine, zero skips/flakes/errors). The verifier also binds its isolated all-entry build, source maps
and twelve current declaration/API reports. This is a bounded checkpoint; all final program criteria
remain open.

Owner 0006 extends its validated lifecycle Plan for staged plugin cancellation. Three of five public
diagnostics and six of nine actual-browser executions fail on current production. A further six
getter/native-add cases all fail before correction. Its private acquisition capability keeps the
public host signature and native callback identity; the isolated prototype passes 179 focused tests
and source/test type checks. Promote the public unit and browser regressions, implement the private
Kernel/plugin coordination, then repeat exact-tree full verification. The owner changed-file ledger
includes both sources, two new public suites, the browser fixture/spec, README, ownership/testing
and program docs, and tickets 0006/0033. Fixed budgets, actual hosts, package consumers,
source/public-claim review, manual accessibility and full delivery remain required.

The tracked correction now passes 177 focused tests in six files, complete type checks and focused
lint. The 33-case actual-browser selection passes eleven cases per engine without skips or flakes,
including canceled method lookup returning a value that is not callable. Public pre-correction tests
retain nine failures/five controls, plus three later method-getter failures. The first fast run
passes 4,906 units but fails one ticket spelling word and predates the last source correction. Owner
0006 records the implementation ledger and exact paths. These results do not replace full
current-tree fast/browser/build/package checks or any final program requirement.

The corrected 924-file checkpoint now passes 4,909 units, all six fast/23 static gates and 1,242
browser cases (414 per engine, zero skips/flakes/errors). Owner 0006's verifier binds 3,484
integration assertions in 111 files, the exact selection, isolated all-entry build/maps, twelve
declaration/API reports and 262 declaration outputs to fingerprint
`fdf0b1d48b9286db68b1d741726bc4ce6bc5beb88a30e1810157cabcd37666d8`. AC-38 has direct source/browser
proof. Fixed size overruns remain, including 1,089 core gzip and 1,203 CSP Brotli bytes. Installed
consumers, actual Turbo/htmx hosts, performance/heap, semantic review, manual accessibility and
`npm run check`/full delivery remain open; ticket 0033 stays coding. The prior focused and failed
fast runs remain diagnostic history.

### September 21 document listener acquisition continuation

The second full fast run passes 4,880 units and all gates, but fresh getter replacement probes
prevent accepting that checkpoint. Twelve new public failures expose older cleanup claiming a newer
registration from native method/options getters or duplicate native-call reentry. Acquisition order
now protects those paths. All 49 listener cases, 198 focused tests, 54 browser cases, complete types
and lint pass; final 1,209-case whole-tree verification remains pending. Prior artifacts are
historical.

Implementation now includes captured options, provisional ownership, guarded native callbacks and
replacement-safe identities. All 37 listener cases and 186 focused tests pass; 39 actual-browser
cases pass. Two nested-options negatives led to separate pending identities. New browser fixture
type errors are corrected; complete types pass (41598 exit 0). The final matrix selects 1,194 cases;
passing selection/focused evidence does not yet accept the current whole-tree checkpoint.

The shared observer/UI checkpoint passes 4,843 units, six fast/23 static gates and all 1,155 browser
cases on 921 matching inputs. The verifier checks exact selection, all three engines, integration
assertions and unchanged all-entry build/maps. Owner 0006 now plans document listener acquisition:
seventeen failures/thirteen controls in an expanded native diagnostic, with twelve failures/three
controls independently reproduced in real browsers. Registration rollback, capture identity,
duplicate callbacks, options, provisional ownership and replacement-safe cleanup require correction.

Planned ledger: owner 0006, this umbrella, src/kernel.ts, the new public listener suite, document
browser fixture/spec, README and ownership/testing/program documentation. Preserve staged plugin
observer controls; no observer change is inferred. Validate owner 0006's Plan before implementation.
All full-audit criteria and remaining performance, hosts, budgets, package/API, semantic review,
manual accessibility and npm run check/full delivery requirements remain open. Status stays coding.

### September 21 shared first-scope acquisition continuation

The accepted 50-family checkpoint passes 4,753 units, all six fast/23 static gates and 1,137
three-engine browser cases. All 919 saved inputs matched before owner 0006 promoted the separate
shared acquisition Plan. The 20-case typed diagnostic has fourteen failures and six controls,
including actual late native observer delivery and a lost public Resizable request. This work
addresses provisional observer ownership, newer removal-observer retention, setup/cleanup error
preservation and provisional UI map publication. All 44 helper call sites require continuation
review; the helper alone cannot establish controller correctness.

Changed-file ledger begins with owner 0006 and this umbrella record. Planned implementation:
src/kernel.ts, src/ui/lifecycle.ts and test/scoped-observer-acquisition.test.ts; affected lifecycle
and testing documentation follows verified behavior. Preserve earlier checkpoint evidence as
historical. Full source/claim review, performance/heap, actual hosts, fixed budgets,
package/API/install, manual accessibility and npm run check/full delivery remain open. All
full-audit criteria remain unchecked, and both tickets remain coding.

Implementation now includes provisional UI cleanup, Pagination/Stepper request preservation, eight
retired-controller guards, connection-state validation and initialization-aware cleanup in four
floating controllers. The changed-file ledger also includes the two existing navigation/step
document suites, the new 49-family/five-floating replacement suite and both document browser files.
Public/brain documentation records these contracts. Current focused evidence is 482 tests in 13
suites, 431 floating tests in ten suites and 18 browser cases across all three engines. The first
complete fast run has 4,834 passes/three failures and two lint failures; corrections are recorded in
owner 0006. Acceptance still requires the final documented tree's full fast/static, 1,155 browser
cases and unchanged all-entry build/maps. The previously accepted checkpoint remains historical.

### September 21 Resizable and Sortable document continuation

Owner 0006 promoted its validated Plan and the remaining 98 public document regressions after the
accepted Feed checkpoint (4,603 units/1,086 browser cases on 917 inputs). The fresh negative records
89 failures and nine controls. Resizable and Sortable now use native owner documents/windows,
current parts and source state, guarded requests, copied event arrays and provisional cleanup.
Follow-up coverage brings the public suites to 150 cases and the combined focused selection to 267
passes. A real-browser keyboard focus regression was reproduced in Chromium/Firefox/WebKit and
corrected; the 45-case family/control selection now passes. All six trusted native dragging cases
pass. The complete 50-family checkpoint requires matching browser/fast input hashes before
acceptance. No full audit acceptance is claimed.

Changed-file ledger: owner 0006; both controllers and private UI factory calls; both new public
suites; document browser fixture/spec; README, component/ownership/testing/program documentation;
this umbrella record. Current code remains under owner 0006's Plan. All ACs below remain unchecked.
Shared acquisition, performance/heap, hosts, immutable budgets, package/API/install evidence,
semantic review, manual accessibility and npm run check/full delivery retain their original scope.

### September 21 Feed document continuation

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

### September 21 Toast document continuation

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

### September 21 Questionnaire document continuation

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

The first full checks pass 4,411 units and 1,038 browser cases, with 915 unchanged worktree inputs.
Fast fails only the exact lint inventory. Owner 0006's validated correction replaces an incorrect
non-null action ancestor cast with the existing native root guard and reduces the obsolete non-null
allowance from nine to seven. No allowance increases. Preserve the failed fast report
`2026-09-21T17-07-37-725Z-76439` and passing browser report; fresh checks must bind the corrected
documented tree. Toast/Feed review adds 40 failing diagnostic assertions and four controls with a
validated implementation Plan in owner 0006. Their source remains unchanged pending Questionnaire
acceptance. All original audit requirements remain open.

### September 21 Form document continuation

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

### September 21 Calendar and Date Picker continuation

Owner 0006 corrects foreign document/Date handling, current parts, request and event continuation,
guarded render/native writes, action ownership and open Popover handoff for all four Calendar and
picker families. Public coverage contains 136 cases, with all 633 focused/resource/CSP tests
passing. Earlier integration passes 2,881 cases across 101 files. Targeted browser proof passes 81
cases across Chromium, Firefox and WebKit, without skips/flakes, with all 127 source inputs and 913
worktree files verified at terminal. Two later event-ordering regressions require an internal event
ownership check to stop duplicate picker notifications, and a private callback needs a lint wrapper.
Fresh integration, types/lint, the complete browser cohort and fast report must bind the final
documented tree before checkpoint acceptance. Preserve every negative result.

Browser coverage adds four families in six modes and the existing Calendar/native/accessibility
controls. Six families remain: Form, Questionnaire, Toast, Feed, Resizable and Sortable. This does
not complete cross-cutting review, actual host matrices, current declaration/API or installed
package checks, semantic source/claim review, manual accessibility or full npm run check/delivery.
Earlier isolated sizes are historical after Calendar edits; fixed budgets remain enforced. No public
signature, shared resource helper, lint allowance or CSP inventory changes. Owner 0006 remains
coding with its full acceptance scope intact.

### September 21 Chart and Data Table continuation

Owner 0006 corrects captured document/action ownership, current parts and callback continuation for
Chart and Data Table. Chart retains unchanged native output and retries interrupted rendering. Data
Table keeps current listeners, original row order, selected IDs and initial-only seed history; it
respects canceled/constrained activation and newer sorting, filtering or paging. Partial initial
selection cannot survive failed validation. Read-only proposed-sort inspection cannot commit rows.
Private actions remain bound to their installation document after application adoption.

All 75 public regressions and 258 focused/CSP tests pass. Complete integration passes 2,755 tests
across 100 files. The targeted browser selection passes all 48 cases across Chromium, Firefox and
WebKit, with zero skips/flakes and all 127 source plus 912 worktree inputs verified at terminal.
TypeScript, focused lint and the unchanged 286-entry allowance inventory pass across 345 TypeScript
files. Initial and follow-up negatives remain in the owner ledger. The complete browser cohort now
contains 858 document cases across 40 families plus 54 existing component controls; its terminal
result and fresh fast report must be bound to the documented worktree before checkpoint acceptance.

An isolated build retains all entries and fixed configurations. Current excesses remain: core gzip
309 bytes, CSP Brotli 451, stores gzip 107, root consumer raw 62,202, UI ESM 62,343, UI CommonJS
60,890 and UMD 62,717. This preview is not installed-package, declaration/API or delivery
acceptance. Ten families, cross-cutting properties, actual Turbo/htmx host matrices, semantic
source/claim review, manual accessibility and actual npm run check/delivery remain. No budget, API
or allowance is expanded; owner 0006 remains coding with AC-34 through AC-37 unchecked.

### September 19 JSON Viewer and Log Viewer continuation

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

### September 19 Clipboard and Code Block continuation

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

### September 19 Menu, Context Menu and Menubar checkpoint

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

### September 19 Hover Card and shared native ownership checkpoint

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

### September 19 Tooltip and settled native-state checkpoint

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

### September 19 Popover and preserved-focus checkpoint

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

### September 19 Transfer List implementation checkpoint

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

### September 19 Tree implementation checkpoint

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

### September 19 File Upload implementation checkpoint

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

### September 19 Color Picker implementation checkpoint

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

### September 19 Multi Select implementation checkpoint

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

### September 19 Combobox implementation checkpoint

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

### September 19 Select implementation checkpoint

Owner 0006 corrects Select document/resource ownership and adds 49 public cases. The four-family
suite now has 100 cases: all 53 Select and 39 Time Picker cases pass; eight Combobox/Multi Select
foreign-target/adoption failures remain. Final focused verification passes 256/fails eight across
seven files, and complete UI/kernel/bridge integration passes 1,863/fails eight across 93 files.
These are failed gates while the two remaining controllers are still in implementation.

All 336 browser cases across 22 families pass in Chromium, Firefox and WebKit after the final
cleanup-continuation guards, without failures/skips/flakes. The verified report binds 124 current
inputs. The first Select browser run exposed lost native popover visibility after preserved
movement; the correction restores it without resetting exploration and honors native cancellation.
TypeScript, focused lint and the unchanged ratchet pass (338 TypeScript files / 302 exact counts).
No public signature, lint allowance, budget or acceptance criterion changes. Prior fast
`2026-09-19T17-18-21-470Z-45288` remains historical. Current fast, actual delivery, complete
family/host conformance, fixed budgets and semantic source/claim review remain required. Hash
refresh adds no semantic-review credit.

### September 19 Time Picker implementation checkpoint

Owner 0006 has started the planned Select/Combobox/Multi Select/Time Picker group. The new 51-case
public suite initially fails 46 cases. Time Picker now passes all 39 targeted cases plus 189
existing family/resource cases. Its 18 browser executions pass in Chromium, Firefox and WebKit with
124 captured input hashes verified at terminal. TypeScript, focused lint and the unchanged immutable
ratchet pass (338 TypeScript files / 302 exact counts).

The complete UI/kernel/bridge run passes 1,810 and fails 12 across 93 files. All twelve failures are
the still-open Select, Combobox and Multi Select foreign-target/adoption cases. The group remains in
implementation. Prior fast `2026-09-19T17-18-21-470Z-45288` and the preceding 300-case browser run
predate the new source/fixture changes. Current fast, complete browser verification, actual
delivery, the full family/host audit, fixed budgets and semantic source/claim review remain
required. Hash refresh adds no semantic-review credit. No scope or acceptance criterion is reduced.

### September 19 disclosure, editable and stepper document checkpoint

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

### September 19 navigation document checkpoint

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

### September 19 Input OTP, Tags Input and toggle document checkpoint

Owner 0006 corrects Input OTP, Tags Input, Toggle and Toggle Group document/resource ownership, with
80 new public cases. The final focused suite passes 232 cases; integration before the last two
native-reset controls passes 1,620 cases in 90 files. All 174 document browser cases pass across
twelve families and three engines, with 124 captured input hashes verified at terminal. TypeScript,
focused lint and the unchanged ratchet pass. Final fast `2026-09-19T16-48-57-334Z-9908` passes all
six gates and 3,008 units with zero failed/pending cases on matching 902-file fingerprints; it
includes the last two native-reset controls. No public signature, lint allowance or fixed budget
changes. The next Tabs/Toolbar/Pagination/Sidebar probe has five failures and three passing adoption
controls, recorded in owner 0006's Plan. Complete family/host conformance, budgets, semantic
source/claim review and full delivery remain open.

### September 19 native-field document checkpoint

Owner 0006 corrects document/adoption and resource ownership for Number Field, Password Field,
Search Field and Rating, with 70 new public regressions. The integration passes 1,542 cases in 89
files. TypeScript, focused lint and the unchanged ratchet pass (334 TypeScript files / 302 exact
counts). The first expanded browser run passes 120 cases across eight families and three engines;
the final rerun also passes all 120 cases after the interrupted-setup rejection and constraint
checks, with all 124 input hashes verified at terminal. Final fast `2026-09-19T16-35-22-391Z-91661`
passes six gates and all 2,928 units with zero failures/pending tests and matching 901-file
fingerprints. Final browser evidence is `ui-native-field-browser-verified/results.json`, after
restoring readonly Search Field submission. No public API, lint allowance or fixed budget changes.
The next Input OTP/Tags Input/Toggle/Toggle Group diagnostic has six failures and two passing
adoption controls; owner 0006 records its Plan. The remaining full audit stays open.

### September 19 document-ownership checkpoint

Owner 0006 corrects DOM identity and kernel/UI document boundaries, plus the first four-controller
frame/adoption group: Countdown, Carousel, Message Scroller and Dialog. Fifty-one new unit cases
cover native identity, facades, actions, enhancement, adopted controls and render boundaries. Real
browser tests additionally fix lost Dialog modality through preserved movement, WebKit's Carousel
enhancement loop and focus-pause retention on adoption. The final 54-case matrix passes in Chromium,
Firefox and WebKit without failures/skips/flakes; the final integration passes 1,472 cases in 88
files. TypeScript, focused lint and the unchanged lint ratchet pass. Original Chromium
frame/adoption counterexamples now pass. Corrected fast `2026-09-19T16-21-16-823Z-59758` passes all
six gates and all 2,858 unit tests with zero failed/pending cases on matching 900-file fingerprints
(`8012ae3915f5a289fec2c7bb90cc45e7b1ce0d80f413390c163f3d89505d28de`). Canonical API generation
passes with only the warning line update. The browser rerun after explicit fixture type references
passes all 54 cases in `ui-document-browser-verified/results.json`, with all 124 input hashes
verified at terminal. Full delivery and Code/Test closure remain pending. Other families, complete
host conformance, fixed budgets, semantic source/claim refresh and current full delivery remain
open. The interrupted first browser attempt and all negative tests remain in owner 0006's ledger.

### September 19 Carousel and Message Scroller checkpoint

Owner 0006 corrects provisional timeout/listener/observer acquisition, complete failing cleanup and
stale continuations in Carousel and Message Scroller. Shared internal resource helpers preserve both
setup and cleanup errors. Unchanged enhancement retains work and bindings; weak retained state
preserves explicit pause/follow/unread and message identity through reacquisition. Carousel commits
selection only after a current accepted event, and normal focus recovery still emits change.
Forty-two new public cases pass with the existing family/resource tests (86 cases in five files).
TypeScript and focused lint pass. The original five ignored acquisition probes now pass. Full
integration passes 1,384 cases in 85 files and the unchanged lint ratchet passes 329 TypeScript
files with 302 exact file/rule counts. Initial fast `2026-09-19T15-54-07-908Z-11639` passes all
2,807 units and static checks but fails six documentation formatting checks; a complete corrected
run follows. The corrected `2026-09-19T15-57-04-145Z-26085` run passes all six gates and all 2,807
units with zero failures/pending cases and matching 896-file fingerprints. All 50 families remain
enrolled; source/claim semantic review, fixed budgets, real frame/adoption behavior, actual-host
matrices and current full delivery remain required. The refreshed Chromium diagnostic still rejects
the foreign Countdown target, explicit foreign root enhancement and destination access to an adopted
root. The latter retains its origin prototype while its ownerDocument changes. A separate
three-engine native DOM probe establishes a possible identity-check correction; it does not prove UI
conformance. Owner 0006 records the complete frame and adoption Plan. Earlier build/bundle evidence
still predates these source edits.

### September 19 Countdown cross-cutting checkpoint

Owner 0006 fixes the separately reproduced Countdown interval leak and related shared-clock
reentry/retirement paths. Nineteen public regressions cover provisional acquisition, native setup
and cancellation failures, stale callbacks, completion reentry, kernel replacement, retained
deadlines and owning-document behavior. The final UI/kernel/bridge/harness integration passes 1,342
tests in 84 files; TypeScript, focused lint and the unchanged immutable lint ratchet pass. The
original ignored Countdown probe now passes. Fast `2026-09-19T15-33-15-546Z-92219` passes all six
gates and 2,765 units, with zero failed/pending cases and matching 895-file fingerprints. All 50
families remain enrolled, but provisional acquisition, callbacks and adoption across all families,
fixed budgets, source/claim refresh, actual-host conformance and current full delivery remain open.
Old-document Countdown retirement is tested; destination-facade adoption acceptance and independent
browser-window behavior are not established by these tests. Five subsequent isolated probes fail
Carousel/Message Scroller timeout, listener and observer acquisition; owner 0006 records their next
Plan. A current-source Chromium 151.0.7922.34 diagnostic passes foreign-document Toast ownership but
rejects Countdown's own foreign target from the parent realm. It also records that the testing realm
lease cannot redefine the browser's protected `window`. These are separate results. The
independent-document failure must be resolved against the explicit same-origin frame contract.

### September 19 Calendar checkpoint

Owner 0006 enrolls Calendar, Range Calendar and both date pickers, bringing scoped enrollment to 50
families. Eighty-four new public cases cover removal/preservation, retained focus, interrupted
setup, complete cleanup, event reentry, current parts, native reset ownership, empty native values,
normalized ranges and document isolation. The focused four-file suite passes 108 cases.
UI/kernel/scoped-resource/bridge-disposal integration passes 1,269 cases in 80 files. Fast
verification passes all six gates and 2,746 units with no failed/pending cases in
`2026-09-19T15-20-42-173Z-75442`, with a matching 894-file source fingerprint. The additional
Turbo/htmx/harness suite passes 54 cases. The lint inventory removes Calendar's two obsolete
unnecessary-condition uses without increasing allowances. Enrollment does not close cross-cutting
ownership review, actual-host conformance, fixed budgets, source/claim review or current full
delivery. Build/API/bundle evidence still predates Questionnaire, Toast and Calendar. A separate
executed probe proves Countdown can retain an interval acquired during disposal; owner 0006 records
the next corrective Plan. The realm-identity control establishes the Vitest global constructor alias
but does not close independent-window or adoption review.

### September 19 Toast checkpoint

Owner 0006 adds scoped Toast ownership, bringing enrollment to 46 families. Forty-two public cases
cover exact listeners, timer and announcement ownership, preserved display duration, interrupted
setup, callback reentry/disposal, partial-markup rollback, swipe capture, composed pauses and
document isolation. Ordinary dismissal retains its viewport-owned announcement for ten seconds;
scope disposal releases it. All 1,226 UI/kernel/bridge cases pass in 82 files. Type checking,
focused lint and the unchanged lint ratchet pass. Calendar, Range Calendar, Date Picker and Date
Range Picker remain, alongside cross-cutting review, fixed budgets, host conformance and current
full delivery. The overlapping local-facade/foreign-realm guard probe remains for cross-cutting
review; foreign show after its realm lease ends passes. Prior build/API and bundle measurements now
predate Questionnaire and Toast. No audit closure is claimed.

Corrected fast `2026-09-19T15-03-40-708Z-57525` passes all six gates and 2,662 units without pending
cases on unchanged 893-file fingerprint
`36bfc06f85e79367d21e3a62df7ba9ac356b62850bb5a6656e65c6ca2ed613c7`. The initial fast failed one
runtime service/observer inventory that still expected Toast's former cleanup/observer; its exact
replacement passes 72 focused cases and the full fast suite. Owner 0006 retains the failed run and
correction. Subsequent ticket/PROGRAM_AUDIT edits record results only. Actual Code/Test closure,
current delivery and full audit acceptance remain pending.

### September 19 Questionnaire checkpoint

Owner 0006 adds scoped Questionnaire ownership, bringing enrollment to 45 families. Thirty-four
public regressions cover captured listener/timer cleanup, preserved resets, form reassociation,
replacement markup, native/default/submitted state and interrupted or reentrant transitions. The
broader UI/kernel/bridge integration passes 1,183 cases in 81 files before the last cleanup-reentry
case. Calendar and its pickers and Toast remain. Full host conformance, cross-cutting review, fixed
bundle budgets, current installed-package/delivery evidence and source/claim refresh remain open.
Fast `2026-09-19T14-45-23-815Z-25584` passes all six gates and 2,620 units with no pending cases on
unchanged 892-file fingerprint `fec3d1289ad0a01ead2b28d2f6085a0f18bca277c71910f3c7af1fbeeb0779d4`.
The final focused suite passes 81 tests across five files, including all 34 Questionnaire cases.
Subsequent edits only record results. Prior Chart/Data Table measurements remain historical after
this source change; no ceiling or graph exclusion changes. Actual Code/Test closure and audit
acceptance remain pending.

### September 19 Chart and Data Table checkpoint

Owner 0006 adds scoped Chart records and Data Table listener ownership, bringing enrollment to 44
families. The 30 public regressions cover cleanup/preservation, interrupted and reentrant renders
and sorts, table/plot replacement, off-page selection and seed history, provisional listener setup,
cleanup errors and two-document isolation. The UI/kernel/bridge integration passes 1,148 cases in 80
files. Native table checks and SVG creation use the owning document. Calendar and its pickers,
Questionnaire and Toast remain. The complete host matrix, source/claim reviews, fixed bundle
budgets, installed-package checks and current full delivery are still required. Owner 0006 retains
all negative probes and fixture corrections; earlier fast and bundle evidence below predates this
cohort.

Fast `2026-09-19T14-35-11-205Z-9257` passes all six gates and all 2,586 units with no pending cases
on unchanged 891-file fingerprint
`9eacf22282565a1980362015c2923112c21f0121deec10e0c63f3741ffe191be`. Both builds, API generation and
CSP graph exclusions pass. Fresh source-bound previews exceed core gzip by 117 bytes, CSP Brotli by
352 and root raw by 7,624; UI ESM/CommonJS and root UMD still need reduction. Owner 0006 records
exact values and failure/correction history. Source/test/API changes are covered; subsequent
checkpoint edits record results only. No full delivery or completed audit is claimed.

### September 17 scoped-resource implementation checkpoint

Owner 0006 has enrolled 42 controller families in scoped resource cleanup. The latest cohort adds
Tree, Transfer List and Feed, with 54 public regressions for captured native listeners, typeahead,
observer ownership, preservation, replacement and callback disposal/reentry. Calendar, Chart, Data
Table, Questionnaire and Toast remain, alongside cross-cutting ownership review and actual-host
matrices. The helper adds a 110th runtime source; historical 109-source reviews require refresh.

Collection fast `2026-09-17T18-00-59-196Z-2189` passes all six gates and all 2,556 units on
unchanged 890-file fingerprint `6a4c46b9dc30be7331de277139fb8f1d7d53e2a0bae9622b886a1e8965d0c5e9`.
Both distribution builds and sequential API generation pass. Fresh source-bound measurements still
exceed core gzip by 117 bytes, CSP Brotli by 352 and root raw by 7,292; UI ESM/CommonJS and root UMD
also need reduction. CSP graph exclusions pass. Source/test/API changes are covered by this fast
report; subsequent checkpoint edits record results only. Full acceptance remains unproven.

The preceding choice cohort enrolls Color Picker, Time Picker, Multi Select, Select and Combobox.
Fast `2026-09-17T17-49-21-737Z-84471` passes all six gates and 2,502 unit cases with no pending
cases on unchanged 889-file fingerprint
`e0979fd571730a7516bf1e86ae7a8865c75a5242330dfbee36bea2c87a5b9b6c`. Its predecessor failed the lint
ratchet; the three unnecessary optional accesses were removed without increasing the allowance. The
collection changes postdate this report and require new verification. Both choice builds pass; their
preview exceeds core gzip by 117 bytes, CSP Brotli by 352 and root raw by 6,424. UI ESM, CommonJS
and root UMD also exceed fixed limits. These previews do not replace installed-package acceptance.
Owner 0006 retains exact measurements and all failure/correction history.

Complete controller ownership, fixed budgets, host conformance, fresh source/claim reviews,
installed-package checks and current full delivery remain required. The historical delivery below
does not cover this extension. No audit closure, commit or publication is authorized by these
implementation checkpoints.

### September 17 verified correction checkpoint

Delivery `2026-09-17T15-48-23-507Z-72866` passes all thirteen gates, 2,057 unit cases, the complete
116-file coverage roster and 487 browser cases without skips/failures/flakes, on one unchanged
882-file fingerprint. Current receipt and actual Test validation pass for 0002, 0006, 0019, 0031,
0036, 0037 and 0052 before the documentation phase. Owners 0002/0019/0052 complete their backup,
repair and quality corrections; 0031 retains its refreshed no-go decision. Their Document records
carry current criterion-level evidence and preserve historical failures.

The complete roster negative control now rejects a missing unchanged Sidebar in both reports. Nine
runbook tests execute actual shell/SQLite/file operations with isolated account/service/HTTP
substitutes and prove backup contents, recovery-file preservation and failure stopping. Public
analyzer counts are corrected to the observed 315 TypeScript files and 303 exact file/rule entries.
No floor, classification or mutation boundary changes.

The generic UI owner remains open. A new source-bound public probe,
`quality-refresh-2026-09-17/ui-retained-facade-before.json`, disposes an empty installation and then
uses its retained facade on fresh roots. Both controllers acquire timers, Message Scroller observes
a later message, and Carousel advances after disposal. This extends the existing Countdown, Carousel
and Message Scroller cleanup findings: the correction must also reject late acquisition. The
live/staged document-host distinction and current bundle headroom are recorded in
`quality-refresh-2026-09-17/ui-lifecycle-next.md` for the owning Plan extension. No generic runtime
fix is claimed by these probes or the passing full gate.

All 109 source/review hashes remain verified. Draft claim review now covers 1,094 authored units
across 27 sources, with 47 sources remaining. The three added sources are the persistence website
page and both Datastar API reports; prior interpretations are archived. Final immutable candidate
bindings, remaining source claims, generic UI/common-host matrices and actual screen-reader
observations remain required. This checkpoint does not close 0033 or authorize a commit/publication.

### Problem

The program is complete only when the stable platform and every approved optional track satisfy the
original user-facing goal. A large green test suite is not proof that every promise shipped, that
declined work has a credible alternative, that the public website describes the same artifact, or
that package graphs exclude optional and archived runtimes.

The final audit must resist two opposite errors: relabeling unfinished work complete because it was
not exercised, and forcing every conditional idea into the library after its evidence chose a
smaller solution. It needs a frozen requirement inventory, direct current evidence, and a rule for
reopening the owning ticket when reality no longer matches its record.

### Current evidence

- docs/LIBRARY_EXPANSION_PLAN.md defines the program invariants, product position, capability
  tracks, quality expectations, and completion criteria.
- docs/tickets/ROADMAP.md orders stable, conditional, ecosystem, website, and later release tracks.
- Tickets 0001–0052 are the decision/change records (excluding this audit itself). Resource,
  navigation, and DevTools tracks may legitimately finish done or declined, but not remain
  planned/coding/testing/documenting/blocked.
- Ticket 0017 audits the stable 1.0 artifact. Tickets 0018–0032 add later optional services and
  upgrade tooling; this ticket audits the whole program rather than weakening the 1.0 boundary.
- Tickets 0038–0040 own ecosystem stewardship and migration. Tickets 0046 and 0049 own the jQStar
  website, reference match, and final public naming record.
- Tickets 0041–0044 define fail-closed static, coverage/property, browser, package, reproducibility,
  and release evidence. Ticket 0048 explicitly removed mutation testing from the required workflow.
- Ticket reports and receipts bind quality to an exact tree, but documentation links, compatibility
  claims, declined-surface absence, and requirement traceability still require a separate audit.

### Activation gate

The 2026-09-06 user request adds quality-review ticket 0052 as a prerequisite and explicitly defers
mutation execution to 0053. Inventory 0053 as planned follow-up assurance outside this audit's
completion prerequisites. Do not run mutation tooling or claim mutation evidence in this audit.

Do not begin the final evidence run until every prerequisite ticket is terminal and no owning ticket
reports pending acceptance work. Freeze the exact source reference, lockfile, toolchain, browser
versions, compatibility matrices, package name/version, public naming decision, and complete ordered
ticket inventory in an immutable audit manifest. Plan-validate this ticket against that inventory.

If any prerequisite is not terminal or its evidence no longer matches the source/artifact, stop the
audit and reopen that owning ticket in the correct phase. Do not patch product behavior, acceptance
criteria, or documentation under this umbrella ticket to make the audit pass.

### Scope

- Derive a versioned jqstar-program-audit/1 requirement matrix from the expansion plan, roadmap,
  AGENTS boundaries, public README/site claims, package exports, support/security/deprecation/
  migration policies, and every terminal ticket criterion. Give each row a stable ID, owner ticket,
  requirement text, disposition, evidence type, exact evidence location, artifact/source identity,
  freshness, and audit result.
- Record the complete ticket inventory. Done rows require every checked acceptance criterion to have
  current direct Pass evidence. Declined rows require the named parent decision, a supported
  alternative that meets the underlying need, and package/source/API/graph proof that no partial or
  misleading public surface shipped.
- Audit core invariants: real jQuery and signal naming, native HTML/data-jqs/data-part/state
  attributes, registry-versus-src ownership, official Datastar SDK use, transactional lifecycle,
  exactly-once cleanup, public disposal, injected expressions, plugins/directives/helpers,
  observations/middleware/profiles, modular entrypoints, testing, and CSP.
- Audit the UI/catalog and website as products: reference-matched jQStar homepage/docs/component
  lab, front-and-center framework position, real jQStar implementation rather than React,
  no-JavaScript content/navigation, public naming/package/CLI/domain distinction, accessibility,
  responsive behavior, metadata/assets, and published examples that run against the audited
  artifact.
- Audit interoperability and ecosystem stewardship: Turbo/htmx supported ranges, DOM replacement,
  jQuery Core peer matrix, QUnit testing boundary, opt-in Migrate guidance, jQuery UI
  coexistence/map, jQuery Mobile no-runtime migration, Sizzle disposition, archived-runtime absence,
  trademark-safe independent wording, and no unsupported official-successor claim.
- Audit stores/persistence and each approved resource/navigation/inspection/DevTools/doctor outcome.
  Verify optional entrypoint isolation, per-kernel ownership, bounds, redaction, cancellation,
  concurrency, identity, fallback, disposal, and browser behavior. For no-package decisions, verify
  the documented external/server/native alternative from the representative application.
- Build from a clean, committed, immutable source reference with the exact lockfile and pinned
  supported toolchain. Produce two fresh byte-identical builds/tarballs in independent owned temp
  roots, verify cleanup on success/failure/signal, and bind their digests, contents, provenance, and
  size reports to the audit manifest without writing self-referential data into the artifact.
- Install the exact tarball into isolated ESM/CJS/type/UMD-as-supported, Node, QUnit, bundler,
  server-rendered, CSP, Turbo, htmx, ecosystem migration, CLI, and browser consumers. Consumers must
  not resolve repository source or dev dependencies and must verify package/version/export identity.
- Run supported Chromium, Firefox, and WebKit matrices for functionality, accessibility, keyboard,
  focus, scroll/history, storage, network/fallback, lifecycle/replacement, responsive/mobile, zoom,
  forced colors, reduced motion, CSP, no-JavaScript, and website reference proof as applicable.
- Recompute root/core/optional entrypoint graphs, public API declarations, production source census,
  coverage/property/static/security results, tree shaking, duplicate dependencies, license/package
  contents, archived-runtime/forbidden-framework absence, and compressed/uncompressed size deltas
  against the frozen approved baselines.
- Audit every public claim and link against the exact artifact and terminal decision. Record
  remaining experimental APIs, explicit non-goals, unsupported environments, deprecations, breaking
  changes, migrations, size changes, and future proposals without presenting them as complete or
  supported.
- Produce a deterministic human report and machine matrix in an out-of-tree immutable audit
  directory. It may aggregate existing exact receipts/reports only after verifying source/artifact/
  toolchain identity and freshness. A missing, stale, ambiguous, narrowed, skipped-required, or
  indirect item fails the row.
- Treat the final audit as read-only toward product behavior. It may add/fix audit fixtures,
  schemas, report generation, and truthful documentation only when those do not conceal a product
  mismatch. Any source/package/runtime/API behavior mismatch reopens its owner ticket.

### Out of scope

- External npm/GitHub/domain publication, Git tag/release creation, signing, uploading artifacts,
  contacting OpenJS, committing/pushing, or changing hosted infrastructure without separate user
  authorization.
- Implementing a declined feature, weakening criteria/budgets/timeouts/browser coverage, accepting a
  skipped required gate, updating baselines to current regressions, or rerunning mutation testing.
- Calling optional work complete because no test imported it or calling a documentation link proof
  of runtime behavior.

### Dependencies

- Every roadmap ticket whose outcome contributes to the audited program. At minimum: tickets
  0001–0019, decision tickets 0020 and 0023, approved/declined children 0021–0022 and 0024–0029,
  0030–0032, 0034–0052. Ticket 0031 must be done or declined.
- All conditional tickets must be terminal before this audit starts.

### Acceptance criteria

- [ ] [AC-01] A frozen jqstar-program-audit/1 manifest identifies the clean immutable source,
      lockfile/toolchain/browsers, package/version/name/domain decision, baselines, complete ordered
      ticket inventory, and every derived program requirement before evidence execution.
- [ ] [AC-02] Every prerequisite ticket is terminal. Each done criterion maps exactly once to
      current direct evidence; each declined ticket maps to its parent decision, proven supported
      alternative, and source/export/type/graph absence proof. No
      planned/coding/testing/documenting/blocked or unmapped criterion remains.
- [ ] [AC-03] Core architecture/invariants, lifecycle/ownership/disposal, extensions, operations/
      requests/profiles, modular packages, testing, CSP, and Datastar SDK boundaries each have exact
      source, API, package, test, and documentation evidence from the audited identity.
- [ ] [AC-04] The public jQStar website/home/docs/component lab is built with the audited jQStar
      artifact, matches the approved reference contract, leads with the framework position, works
      without JavaScript where promised, passes accessibility/responsive/browser proof, and uses the
      final product/package/CLI/domain naming consistently.
- [ ] [AC-05] Turbo/htmx, jQuery Core, QUnit, Migrate, jQuery UI, jQuery Mobile, and Sizzle rows
      state exact supported versions/dispositions. Migration/coexistence fixtures pass, archived
      runtimes and forbidden frameworks are absent, and wording makes no unapproved
      official-successor claim.
- [ ] [AC-06] Stores/persistence and every approved resource/navigation/inspection/DevTools/doctor
      service prove optional graph isolation, public package contracts, ownership/bounds/privacy/
      cancellation/fallback/disposal, reference need, and supported-browser behavior. No-package
      outcomes prove the selected alternative against the same need.
- [ ] [AC-07] Two independent clean builds and tarballs are byte-identical with matching digests,
      contents, API/types, graphs, sizes, licenses/provenance, package identity, and owned-temp
      cleanup after success/failure/signal. Reports live outside and do not alter the artifact
      fingerprint.
- [ ] [AC-08] Exact-tarball isolated consumers pass every approved module/type/UMD, Node/QUnit,
      bundler, CSP, server, bridge, ecosystem, CLI, deployment, and browser case without repository
      source/dev-dependency fallback.
- [ ] [AC-09] Chromium/Firefox/WebKit and required no-JavaScript/accessibility matrices pass
      functionality, keyboard/screen reader, focus, scroll/history, storage/network, lifecycle/
      replacement, responsive/zoom/forced-colors/reduced-motion, CSP, and website cases with no
      reduced timeout/assertion/browser scope.
- [ ] [AC-10] Public API/type/schema snapshots, source census, coverage/property/static/security,
      dependency/license/package contents, tree shaking, root/core/optional graphs,
      archived-runtime/ forbidden-framework scans, and exact size budgets pass against frozen
      approved baselines.
- [ ] [AC-11] Every README/site/API/architecture/backend/testing/security/support/compatibility/
      migration/deprecation/release claim and link matches the exact artifact. Experiments,
      non-goals, unsupported environments, breaking changes, and future work remain visibly labeled.
- [ ] [AC-12] The machine matrix and human report are deterministic, immutable, out-of-tree, and
      bind every result to source/artifact/tool identity. Missing, stale, ambiguous, indirect,
      skipped-required, or identity-mismatched evidence fails closed and reopens the owner.
- [ ] [AC-13] Full delivery and audit gates, npm run check, all ticket Plan/Code/Test/Document
      validations, link/schema/spelling checks, and git diff --check pass on the unchanged audited
      closure without mutation testing.
- [ ] [AC-14] The audit reports no required code, test, documentation, packaging, decision,
      evidence, cleanup, naming, or migration work remaining. It performs no
      publish/tag/sign/upload/push/domain or governance action without separate authorization.

### Design

A generator first converts authoritative plans/tickets/manifests into a frozen row inventory; it
does not discover requirements by looking only at available tests. Evidence adapters then validate
typed reports and exact identities for each row. The generator rejects duplicate, missing, circular,
or unknown ticket/criterion references and produces both JSON and a human table from one data model.

Evidence has a strength hierarchy: exact artifact/browser/package/runtime proof, exact source/static
proof, schema-valid decision evidence, and documentation. A weaker type cannot satisfy a row that
promises stronger behavior. Aggregate reports are indexes, not proof, until every referenced report
is present, current, schema-valid, and bound to the same source/artifact.

The audit runs in owned temporary roots with cleanup registered before work begins. Final reports
are written to a separate immutable directory keyed by source and tarball digest. Product mismatches
are routed back to the owning ticket so this ticket cannot become an overly broad final-change
bucket.

### Decisions

- Completion is requirement-driven, not test-count-driven.
- Done and declined are both valid only with their different exact evidence contracts.
- Final proof uses a clean immutable source and exact tarball, never an ambient dirty workspace.
- Optional exclusions and archived-runtime absence are tested as positively as shipped features.
- The audit does not change product behavior or authorize an external release.
- Mutation testing remains excluded unless a future user-requested ticket restores it.

### Activation design recorded 2026-09-06

The prerequisite baseline is committed and pushed as `6bdc789aef23ae161ede524947e622e46a25a01f`,
tree `b9bfb578359cfb39f35feddfc91463066eb3efd1`. All 51 prerequisites are terminal. Strict
derivation finds 588 prerequisite criteria and 25 program criteria. It must retain a criterion whose
text begins after its ID on the next line, as 0034 AC-06 does; the initial space-only planning
parser missed that row and is superseded. Declined tickets receive the same complete
criterion/evidence validation as done tickets.

The clean prerequisite candidate is `jquery-star-1.1.0.tgz`, SHA-256
`69dac90139e8b47bdd89749487b65085e863901f0c9c6def516036794d3e11a3`. Preparatory release run
`2026-09-06T04-47-10-924Z-27110` reproduced its 257 files and 3,165,124 packed bytes in two
independent clean clones. This is an implementation baseline, not the final program-audit verdict.
`.git/jqstar/program-audit/implementation-baseline.json` records the immutable prerequisite source,
artifact, baseline hashes, and complete ticket/program inventory. Freeze the final audited source
again after the audit implementation and documentation are ready.

Implement separate requirement derivation, evidence validation, and report orchestration modules.
Keep internal audit schemas and reviewed mappings under `quality/program-audit/` so audit tooling
does not enter or change the public package. Inventory authoritative public/brain/site/API inputs as
well as ticket criteria. Each reviewed mapping states required evidence kinds, exact selectors,
source locations and its rationale. A generic green suite, a weaker documentation reference, or an
incomplete mapping must not silently satisfy a behavior requirement.

Reuse the existing clean release preparation and proof adapters for immutable source, toolchain,
two-build artifact and quality/subordinate report identities. Verify every referenced file and
digest, and expand unit/property/browser selectors to the actual named executed results. Require
current decision, supported-alternative, source/export/type/graph evidence for declined work. Write
deterministic JSON and a human report outside the artifact with exclusive creation. Unknown,
duplicate, stale, ambiguous, weaker, skipped-required and unmapped evidence stays a failure.

Manual accessibility remains an explicit unresolved input. No executed NVDA/Windows or
VoiceOver/Safari records were found in repository/release evidence or GitHub issue searches. The
Computer Use skill requires a `node_repl` tool that this session does not expose, so no live
VoiceOver action was performed. Synthetic schema controls are not assistive-technology evidence.
Require both real charter records to match the exact candidate and receipt, with environment,
tester/date/profile, all steps, observations, and per-step VoiceOver Quick Nav settings. Do not
relabel an old-artifact record or treat axe as spoken-output proof. Structural validators establish
record completeness and identity; they cannot establish the truth of a human attestation or replace
semantic review of requirement-to-test mappings.

The existing Node 24 Ubuntu full-audit workflow was dispatched for the prerequisite commit as run
`34012438886`. Its result is separate from the local Node 26 delivery evidence and is not yet a
program-audit acceptance result. No mutation tooling, publication, tag, or hosted configuration
change is part of this work.

### Security and accessibility

- Audit artifacts can contain paths, logs, URLs, environment data, and fixture secrets. Schemas
  allowlist fields, redact local paths/secrets, cap logs, and keep intentional canaries synthetic.
  Reports include no credentials, tokens, cookies, private HTML, or user data.
- Build/test consumers have network and write canaries appropriate to their contract and use owned
  bounded temp roots. No audit command executes untrusted downloaded project code outside the exact
  locked dependency/install contract.
- Accessibility claims require semantic/browser evidence; visual snapshots or axe alone cannot prove
  keyboard, focus, announcements, reduced motion, zoom, and no-JavaScript behavior.

### Prerequisite regression found 2026-09-06

The direct mapping review of 0002 AC-12 exposed a real stale-window race. Completing requests for
offsets 80 then 0 restores the older offset 0. Source review confirms the echoed request number has
no suppression check, and generic cancellation uses the distinct serialized query URL. The isolated
regression fixture fails its final `80` assertion with actual `0` after the newer response has
already succeeded. Initial hidden-directory and module-alias harness failures are retained
separately and are not counted as product evidence.

Ticket 0002 is reopened to Plan under this audit's owner-correction rule. Final program acceptance
is stopped until that owner closes again. The first review inventory
`54d99b6e9e3efb9c08ef47f501f14da06b7bece4fa3a2f57d937b13e2484367b` contains 613 requirements and
3,560 unreviewed authored units; it predates the reopening and is not a final verdict. Fast run
`2026-09-06T05-05-05-029Z-34926` passed all six gates and 1,218 unit tests. The following delivery
run was deliberately interrupted after the product defect was reproduced and cannot authorize a
commit. Keep the actual inventory command's rejection of unfinished prerequisites while making its
unit test verify that rejection during an owning-ticket correction.

### Disposal prerequisite failure found 2026-09-06

Direct 0013 AC-14 review found that an unprintable thrown object escapes disposal-report formatting,
skips later cleanup, and retains a service. The isolated `disposal-value.test.ts` fails all three
public assertions; its fixture and JSON evidence remain under `.git/jqstar/program-audit/`. Owner
0013 now includes the correction and leaves AC-14 unchecked. Delivery
`2026-09-06T06-04-04-409Z-6542` passed all 13 gates, but that does not resolve this newly reproduced
contract failure. Final acceptance remains stopped until the owner fixes and verifies it.

### Hosted prerequisite failures found 2026-09-06

Hosted full audit `34012438886` failed on Node `v24.20.0`/Ubuntu. Unit and coverage tests lacked a
required built UMD artifact; the installed core consumer exceeded its gzip ceiling by 113 bytes; and
configured browser servers failed readiness before tests could execute. Several failure-detector
controls also failed because of those real faults. Ticket 0052 is reopened to Plan to diagnose and
correct the quality setup and supported-environment results without reducing coverage or budgets.
Reports are retained under `.git/jqstar/hosted-audit-34012438886/`. They are failing evidence, not
program acceptance proof. The earlier Node 26 local delivery remains evidence only for its own
source and environment.

### Owner correction checkpoint, 2026-09-06

Owners 0002 and 0013 closed after current delivery and their Document validations in commit
`fc3622a`. The subsequent `e6a57ca` correction fixes the shared research fixture's zoom overflow and
the persistence property expectation. Its local delivery `2026-09-06T12-30-22-478Z-89670` passes
1,254 unit tests, all 484 browser cases, 13 package checks and seven release checks. The resource
comparison additionally passes 87 browser cases and 45 fresh measurements without changing its
decision. Owner 0020's Document closure now passes.

Direct shared-store requirement review reproduced a second property expectation mismatch with seed
`430043`, path `5887:2:12:11:10`, and reserved field `el`. Owner 0052 records the failing replay,
independent generated acceptance/rejection correction, passing 56-case replay and fresh 1,256-test
fast gate. Hosted run `34034049302` still audits the preceding committed source. The new test
correction needs delivery and hosted verification before 0052 can close.

There are 189 planning requirement mappings under `.git/jqstar/program-audit/`, including twelve new
bridge rows with 101 verified literal selectors. These are reviewed candidate citations, not current
frozen acceptance results. The final manifest/execution index, remaining mappings, whole
public-claim review and actual manual accessibility records are still required. Final program
acceptance remains pending; no mutation command has run.

### Risks

- A huge matrix can hide missing mappings. Enforce unique machine IDs, owner/criterion completeness,
  schema validation, and deterministic summaries.
- Stale receipts can look green. Bind every report to source/tree/tarball/tool/browser identity and
  reject mutable latest-report shortcuts.
- Final-doc edits can invalidate the tested fingerprint. Finish truthful docs before the final exact
  run, then run all closure validation against an unchanged identity.
- Optional decisions can be abused to shrink scope. Require proof that the chosen alternative serves
  the same representative need and that no misleading partial surface remains.
- Full audits consume substantial time and disk. Reuse only identity-valid evidence, cap logs/temp
  roots, and guarantee cleanup; never restore mutation testing as an expensive default.

### Verification plan

- Schema/property-test requirement derivation, duplicate/missing mappings, evidence strength,
  identity/freshness, terminal status, declined absence, report determinism, redaction, and cleanup.
- Execute focused owning-ticket checks first; reopen mismatches before spending the complete audit.
- From the frozen clean source, run two independent builds, exact tarball consumers, all supported
  browsers/accessibility/no-JavaScript cases, static/security/coverage/property/package/release/
  deployment/site/migration matrices, and temp-cleanup fault injection.
- Complete truthful documentation, freeze the final identity, then run quality:delivery,
  quality:full-audit, npm run check, all ticket validators, link/schema/spelling, and diff checks
  without mutation testing.

### Report loading and exact browser selectors, 2026-09-06

Add a loader that verifies each report's recorded byte count and SHA-256 before parsing, validates
against schema bytes recorded in the frozen input inventory, and returns recursively frozen data.
Keep integrity/shape validation separate from execution acceptance in the named evidence adapters.
Use existing producer schemas for eight report kinds and internal bounded-shape schemas for the
locked Vitest and Playwright formats. Reject missing or altered inputs, alternate schema paths,
unknown report kinds, malformed JSON, excessive structure, and symbolic links without echoing
private report contents. Final manifest and execution-index integration remain required.

Real Playwright reports contain identical S13 titles beneath three Project Inspector groups. Add
exact JSON array selectors containing every suite title and the spec title, while retaining unique
bare-title selectors. Missing or duplicate paths remain errors. Selectors are literal strings;
permit embedded asterisks in actual names or source excerpts, reject a bare wildcard, and never
expand a pattern. Isolated prototypes passed real reports and negative controls before integration.

Planned files: `scripts/program-audit/reports.mjs`, the evidence/mapping adapters, two internal raw
report schemas, maintained loader/selector tests, `docs/PROGRAM_AUDIT.md`, and this ledger. No
runtime, package export, quality threshold, or mutation behavior changes under this integration.

### Release evidence integration, 2026-09-06

Promote the isolated release adapter into `scripts/program-audit/release.mjs`. Require all seven
named release checks, the exact frozen tarball digest and file count, two independent installs and
builds, zero generated-output changes, and the frozen historical comparison commit. Match Node, npm,
TypeScript, Playwright and all browser versions to the predeclared environment. Require SBOM,
license, packed-site and consistent provenance evidence. Provenance eligibility is a recorded
capability, not permission to publish.

Add a distinct `release` evidence kind to the mapping schema and validator so package or
documentation citations cannot replace reproducibility proof. Maintained synthetic controls must
reject stale identities, different toolchains/artifacts/bases, incomplete checks, shared dependency
installs, changed outputs and incomplete packed-site results. Bind the fixture to the real producer
schema. The existing hash-bound loader supplies schema-valid immutable reports; final
execution-index integration must additionally bind the release gate's interval because individual
release checks do not carry timestamps. This step does not claim final acceptance or begin the final
evidence run.

Planned files: the new release adapter and focused test, mapping validator/schema,
`docs/PROGRAM_AUDIT.md`, and this ticket. No runtime or package changes are required.

Final orchestration will reuse the existing `JQS_QUALITY_FORCE_ALL=1` CLI setting from
`scripts/release/candidate.mjs` for both full-audit and delivery. The frozen expected gate roster
still requires every gate to execute successfully. Ordinary delivery reports with legitimate
conditional skips remain historical compatibility references, not final program acceptance.

### Complete navigation evidence integration, 2026-09-06

The standard navigation browser suite selects nine of the frozen contract's 28 scenarios. Promote
the reviewed raw-measurement adapter into `scripts/program-audit/navigation.mjs` so that smaller
suite cannot satisfy the full decision contract. Require all thirty candidate/configuration/browser
rows and every named scenario assertion. All 498 applicable configured flows must pass; only the six
declared no-JavaScript NAV-20/NAV-24 exclusions may be unexecuted. Preserve host-default failures as
observations of configurations the decision does not recommend.

Bind the raw report to the frozen contract, fixture inputs, exact artifact, dependency lock,
prepared bundle graphs and browser/tool versions. Require successful configured-flow disposal, zero
unhandled script errors and no script requests in no-JavaScript flows. Literal selectors use
`[candidate, browser, scenario]` and accept only configured executed passes. Add a distinct
`navigation` mapping kind so ordinary browser or documentation citations cannot replace it.

Extend the existing report loader with the frozen navigation schema's raw `measurement` definition.
The decision document itself must not validate as execution evidence. Existing file, JSON size,
depth, node and immutable-read limits remain unchanged. Historical full-report compatibility and
negative controls precede integration; maintained tests must retain that distinction from final
candidate proof. The final execution index must bind the parent interval because raw measurements
record only their creation time. A read-only full-driver executor and final manifest integration
remain required; do not use the measurement CLI that rewrites the tracked decision dataset.

Planned files: the navigation adapter and focused test, report loader and its test, mapping
validator/schema, `docs/PROGRAM_AUDIT.md`, and this ticket. Repair the historical 0020 command table
by keeping its rows inside the existing table, then verify the formatter preserves the repair. This
changes audit tooling and documentation only.

### Installed browser identity and newly reproduced CSP gaps, 2026-09-06

Require the package adapter to compare both installed-consumer browser rosters and exact versions
against an independently frozen three-browser manifest. A schema-valid report with changed browser
versions must fail, including when every named package check still reports a pass. The prepared
integration passes ten focused tests, thirteen historical selectors, and nine schema-valid negative
controls. Historical compatibility is not final acceptance. Planned files are the package evidence
adapter, its existing tests, this ticket, and `docs/PROGRAM_AUDIT.md`.

The actual strict-policy fixture exposed three additional gaps. Its enlarged native input causes
horizontal overflow in Chromium, Firefox, and WebKit; its native link/form destinations return 404;
and `$double` stays empty with `CSP_CAPABILITY_ACCESSOR` because declarative computed signals are
implemented as getters that the evaluator refuses. The package proof checked ordinary signals but
never asserted this computed output or captured `jquery-star:error` events. General browser profiles
cannot substitute for executing the CSP fixture in those profiles.

Reopen 0034 for the evaluator/declarative integration and 0035 for installed computed/error checks,
real native navigation/submission, and conditional accessibility proof. Preserve accessor refusal
for application data and require a narrowly owned computed capability; the precise integration must
be verified before implementation. The current package, size, grammar, security, and manual evidence
requirements remain in force. Final program acceptance waits for both owners to close again.
Diagnostic records under `.git/jqstar/program-audit/csp-ac08-review/` bind the historical installed
`cb9a2c52039fdb5c6e0f564b0fe6299f69c3c2739f53b5c2e0eb4c8548ca2a6c` artifact and are not final
candidate evidence.

### Planned files

- Program-audit generator, evidence adapters, schemas, immutable manifest/report types, and bounded
  owned-temp orchestration.
- Requirement/ticket/criterion/declined-alternative matrices and exact-artifact consumer manifests.
- Audit fixtures for identity mismatch, stale/missing/indirect evidence, graph absence, redaction,
  cleanup, and deterministic reporting.
- Final public/project documentation corrections and ticket evidence only after owning behavior
  already matches.
- This ticket's changed-file, command, report, and criterion evidence ledgers.
- `scripts/program-audit/requirements.mjs`, evidence/manual adapters, and command orchestration.
- `quality/program-audit/` internal schemas, expected inventories, and reviewed requirement
  mappings.
- `test/program-audit*.test.mjs` and generated property cases for malformed or stale evidence.
- Internal audit usage guidance and the project-brain index, without changing public behavior.

### Named Node-test evidence integration, 2026-09-06

The quality-runner and ticket-workflow gate executes Node built-in tests, while the audit currently
selects only Vitest unit records. Add a bounded structured Node reporter and named selector; a
passing aggregate or a source excerpt cannot replace a named executed test. Isolated probes executed
all 34 current Node cases and proved 25 semantic refusal controls, 12 closed-schema controls and
five actual producer/loader scenarios. Three further process probes reject nested tests, missing run
identities and tests outside the declared source directory before any valid report is emitted. These
are implementation evidence, not final program acceptance.

Keep the report schema under `quality/program-audit/` so audit-only metadata does not change
published package bytes. Register it with the existing hash-bound report loader. Require an
independently frozen exact source/name roster, supported Node and run identities, the parent
execution interval, nonempty matching global/file counts and zero failed, cancelled, skipped or todo
cases. Nested suites are outside the current flat source contract and must fail instead of being
silently flattened. The final executor must separately require a successful supervised process exit
and freeze the source-derived roster before invocation; report fields cannot supply their own
expected identity.

Planned files: `scripts/program-audit/node-reporter.mjs`, `scripts/program-audit/node-evidence.mjs`,
`quality/program-audit/node-test-report.schema.json`, `scripts/program-audit/reports.mjs`,
meaningful producer/loader and selector tests, `docs/PROGRAM_AUDIT.md`, and this ticket. Canonical
quality modes and mutation policy stay unchanged.

Manual evidence assembly must preserve the actual tested source and receipt. If closing prerequisite
0035 changes Git identity before the final audit freeze, the final manifest must independently prove
exact artifact and fixture equivalence or require fresh manual observations. Never rewrite a
tester's record to an identity that was not tested.

### Coverage evidence integration, 2026-09-06

Ticket 0043 now closes the corrected production census after actual raw coverage verification. Add a
named `coverage` evidence kind and composed selector rather than substituting an aggregate quality
status or unit-test source for measured coverage. Read-only prototypes accepted the actual 116-file
report, all 1,359 executed assertions across 158 source files and all 28 required mappings. They
rejected 25 raw/schema/source controls, twelve executed-roster controls and 21 composed identity,
policy, mode and selector controls. The sources, prototypes, schemas and results are retained under
`.git/jqstar/program-audit/coverage-evidence-plan/` as integration evidence.

Register bounded internal summary and hit-map schemas with the existing hash-bound report loader.
Freeze expected production paths, source bytes/digests, source root, scope and fingerprint, coverage
mode, thresholds, immutable comparison commit and policy bytes, and required-test manifest before
execution. Recompute every file and aggregate metric from the raw counters; require exact counter
and map identities, valid source locations, branch counter/location agreement and bounded statement
expansion. Reject missing/extra files, invalid counters, inconsistent summaries, missing source,
foreign paths and mismatched source digests. Unmeasured branch-true summary metadata cannot become a
numeric coverage claim.

Collect the complete Vitest coverage test roster before invocation, freeze its bytes and source
identity, and compare it with every executed assertion. Require exact nonempty counts, passed
outcomes, canonical source paths, title/ancestry/full-name agreement and the actual supervised
coverage interval. Preserve exact multiplicity where parameterized cases share a display name; three
current persistence cases do so. This does not weaken the unique named-test citation contract. The
prototype collected during an already-running outer delivery and is therefore compatibility proof
only. Final orchestration must perform collection before execution and independently verify its
process result and the unchanged source.

Reuse the maintained coverage evaluator, executed-requirement checker and threshold-ratchet
evaluator on validated relative-path views. Bind the actual parent coverage gate to the
independently frozen command, npm version and time limit, and the validated quality envelope and
execution index. Compare the entire producer evaluation with the independent result. Supported
literal selectors are `denominator`, `delivery-floors`, `stabilization-floors`, `threshold-ratchet`,
`changed-production` and `executed-requirements`. Delivery cannot satisfy stabilization floors. An
empty changed-production scope returns its named `not-measured` result, never an invented 100%.

Planned files: `scripts/program-audit/coverage-maps.mjs`,
`scripts/program-audit/coverage-execution.mjs`, `scripts/program-audit/coverage.mjs`,
`scripts/program-audit/reports.mjs`, `scripts/program-audit/requirements.mjs`,
`quality/program-audit/mappings.schema.json`, `quality/program-audit/coverage-summary.schema.json`,
`quality/program-audit/coverage-hits.schema.json`, `test/program-audit-coverage.test.mjs`,
`test/program-audit-reports.test.mjs`, `docs/PROGRAM_AUDIT.md`, and this ticket. The final manifest
must capture the added schema identities alongside its other frozen inputs. Canonical quality modes,
coverage thresholds, published schemas and mutation policy remain unchanged.

Verification uses independent small coverage fixtures plus the real retained producer reports.
Exercise changed and unchanged source scopes, roots different from the audit checkout, exact raw
math and locations, missing/extra collected cases with adjusted totals, hidden assertion failures,
source/command/baseline mismatch, inappropriate mode substitution and empty required evidence.
Integrate loader/schema refusals and mapping-strength checks, then run focused, fast and complete
delivery validation. The final acceptance run and pending manual/hosted/reference proof remain
separate requirements.

### Detector evidence integration, 2026-09-06

The corrected ticket-0044 recorder now rejects interrupted and otherwise unsuccessful child
processes. The final audit still needs a distinct `detector` evidence kind that validates every
executed control together before resolving one literal control name. Source excerpts and aggregate
green statuses cannot replace these observations.

Read-only prototypes against corrected delivery `2026-09-06T19-26-03-660Z-27019` validate all
sixteen summary entries, all nine browser failure/retry records and their traces, eight empty
selections, eight successful project listings, and the two deliberately failing package/release
reports. They reject 31 browser/trace cases, nineteen selection cases, thirty summary/parent/child
cases and eleven API-artifact cases. The prototype files, hash-bound references, schema identities
and results are retained under `.git/jqstar/program-audit/detector-evidence-plan/`. These are
integration evidence, not final audit acceptance. The configured browser roster contains nine
projects, including native WebMCP; the canonical detector listing runs the eight ordinary quality
projects. Preserve that distinction.

Freeze the detector producer/helper, fixture source, full sixteen-control policy, all source and
artifact roots, project/test/title rosters, command arguments, tools, time limits, API baseline and
expected child-report paths before invocation. The final execution index supplies immutable report
and binary artifact references. Validate the parent quality envelope and the actual selected,
enforced, successfully completed detector gate against the frozen command, npm version and timeout.
Require matching run identity and intervals. Every control must retain its exact expected red/green
outcome, detector pattern, positive red or zero green exit, evidence flags and artifact directory.
Compare summary counts and diagnostics with their raw child observations, not merely a matching
summary pattern. No wildcard, missing, duplicated or unknown selector is accepted.

Browser failure proof loads the existing raw Playwright execution schema and requires the exact
fixture path, title, selected project, configured project roster, command, version and output paths.
Check finite parent-contained intervals, one selected spec/test, no unexpected runner errors or
annotations, exact aggregate and attempt outcomes, and the intended assertion in the raw error from
the frozen fixture source. Check its source coordinates. Ordinary failures have one failed attempt
and no retries. The deliberate retry has a failed first attempt followed by one successful retry,
remains flaky, and retains its failure trace. Keep the source root and evidence root distinct;
independently indexed producer paths bind report attachments to their frozen artifact references.
Every reported trace must match a separately indexed, bounded regular binary artifact beneath the
frozen run root, with matching bytes/digest and ZIP signature. Preserve current UTF-8 text-reader
behavior while sharing its path, symlink, bound and concurrent-change protections with a binary
reader. Do not execute or unpack trace contents.

The reduced-motion assertion retains the actual list of active elements. Its raw error is 335,129
characters in the retained report, larger than the first prototype's 262,144-character bound. The
updated bound is 1,048,576 characters inside the unchanged 32 MiB report limit. The original refusal
log remains retained; this is an adapter bound correction, not a product failure. Retain a test that
refuses an over-bound message and preserve direct raw error checking rather than output-tail checks.

Add an internal Playwright selection schema that permits an empty suite list. Keep execution schemas
and named execution selectors unchanged. Validate both aggregate selection reports and all eight raw
project listings, expected paths, source/tool/command/project identities and parent intervals. Empty
selection must contain zero selected tests and only the intended `No tests found` error in each
project. Green selection must exactly match the independently frozen complete case roster and
nonzero per-project counts. List records have zero attempts and Playwright represents them as
skipped; they are selections, never passed test executions. The prototype uses the independently
retained main browser execution as compatibility expectations; final orchestration must collect and
freeze those expectations before invoking the detector.

Package and release failure reports must contain the complete independently expected check rosters,
only the intended named failure, no errors or extra failures, and the actual failure diagnostic. The
API-drift control must retain the literal corrupted comparison baseline, configuration tied to the
frozen entry and output paths, and a generated API report matching the frozen public baseline apart
from CRLF-to-LF comparison. Preserve the distinct original byte digests. The retained public
baseline has 125 LF-only lines among CRLF lines while the generated report uses CRLF throughout;
normalizing line endings alone makes their text identical. Do not rewrite either artifact or claim
byte equality. Green hardening checks retain the exact approved command and fifteen-test
expectation; its individual assertions are also covered by the separately validated complete unit
execution.

Planned files: `scripts/program-audit/detector.mjs`, `scripts/program-audit/detector-browser.mjs`,
`scripts/program-audit/detector-selection.mjs`, `scripts/program-audit/detector-policy.mjs`,
`scripts/program-audit/files.mjs`, `scripts/program-audit/reports.mjs`,
`scripts/program-audit/requirements.mjs`, `quality/program-audit/mappings.schema.json`,
`quality/program-audit/playwright-selection-report.schema.json`,
`test/program-audit-detector.test.mjs`, `test/program-audit-reports.test.mjs`,
`test/program-audit-evidence.test.mjs`, `docs/PROGRAM_AUDIT.md`, and this ticket. Add the selection
schema to all independently frozen schema inventories. Published schemas, the corrected producer,
quality modes, thresholds, dependencies and mutation policy stay unchanged.

Verification uses independent synthetic summary/browser/selection/child fixtures and real retained
producer reports. Exercise every refusal above, source and artifact substitution, unsafe/changed/
empty/oversized binary files, altered trace digests, invalid UTF-8 under the existing text reader,
missing/extra selected cases with adjusted counts, contradictory summary/raw records, API baseline
or configuration drift, and attempts to replace detector evidence with weaker kinds. Validate the
complete composed selector and raw loader integration, then focused lint/tests, fast quality,
Code-phase validation and complete delivery. All fifty-one prerequisite closures, the immutable
final manifest/index/orchestrator, current final executions and actual manual/reference/hosted proof
remain separate acceptance requirements. Mutation tooling remains deferred and unexecuted.

### Supervised full-navigation execution, 2026-09-06

The maintained navigation selector validates retained reports, but no maintained command yet runs
its full scope without modifying the decision file. Add a separate audit executor that reads the
existing prepared installed-package assets. It must never invoke the decision measurement command,
rebuild a stale preparation, update a tracked decision, or run mutation tooling.

Before browser scenarios, freeze the source commit/fingerprint and dirty-state flag, current fixture
and decision/schema hashes, the complete prepared build record, exact tarball and six bundle byte
identities, dependency identities against the root lock, actual Node/Playwright/browser versions,
and all thirty candidate/configuration/browser rows. An explicit ordinary candidate tarball input
must have the same bytes as the navigation preparation's digest-named alias. Preparation is a
separate earlier action. Missing, changed or mismatched preparation fails before measurement.

A parent process writes the immutable navigation manifest before invoking a fixed child command. The
child rechecks frozen inputs, serves the verified asset bytes from its own owned temporary snapshot,
runs all 28 scenarios for each of 30 rows, and retains raw observations. It must keep host default
failures as observations, execute every configured case, preserve six declared no-JavaScript
exclusions, and use the existing driver without reduced assertions, selectors, timeouts or browsers.
The parent independently checks exit/signal/timeout/spawn failure, source and artifact stability,
raw schema, and the full maintained navigation validator before writing the execution index. The
index binds the manifest, raw report and logs by digest/byte count to the supervised command's
start/end interval. Failure retains diagnostic evidence and cannot create a passing index.

This command supplies one component of the final program audit. A dirty development source must be
explicitly recorded as mutable and cannot become the final clean program manifest. Final program
assembly, all prerequisite closures, semantic claim review and actual manual records remain
required.

Planned files: `scripts/program-audit/navigation-inputs.mjs`,
`scripts/program-audit/navigation-runner.mjs`, `scripts/program-audit/run-navigation.mjs`,
`test/program-audit-navigation-execution.test.mjs`, `docs/PROGRAM_AUDIT.md`, `docs/TESTING.md`, this
ticket and the roadmap checkpoint. Verification: independent input/process refusal controls, all
existing navigation adapter tests, actual current-artifact 840-flow execution with immutable
before/after inputs, focused lint, fast and complete delivery gates. Keep failures and corrections
in the Test and inspection ledgers.

### Navigation execution index integration, 2026-09-06

The full navigation component now passes its actual 840-flow execution. Add a maintained reader that
binds its execution index to independently frozen program expectations before accepting named
navigation evidence. Expectations must explicitly distinguish development evidence from final proof,
identify the complete prepared input snapshot, source, ordinary artifact, browser versions, Node
executable and permitted execution interval. Final proof refuses a mutable source.

Validate exact index, manifest and process shapes, fixed command and time limit, successful process
termination, chronological bounds, canonical sibling paths, digest/byte references, and the separate
process record. Read logs even when empty. Load all raw navigation observations through the frozen
schema and existing full-matrix validator, compare their computed summary, and recheck the prepared
source/artifact snapshot before and after loading. Return immutable validated evidence and preserve
its original source identity. Do not rewrite a historical run to the current commit.

Planned files: `scripts/program-audit/navigation-execution.mjs`,
`test/program-audit-navigation-index.test.mjs`, `docs/PROGRAM_AUDIT.md`, `docs/TESTING.md`, and this
ticket. Verification uses independent index/manifest/process fixtures, altered identity/time/path/
process controls, actual bounded file reads with complete historical raw navigation observations,
and an explicitly labeled historical compatibility probe. Existing preparation, executor and
full-matrix tests remain required, followed by fast, complete delivery and phase checks. This reader
completes navigation evidence loading; the whole-program manifest, execution and acceptance report
remain separate unfinished work.

### Plan extension: testing-guide coverage wording (2026-09-06)

Semantic review of all 124 authored units in `docs/TESTING.md` confirms that its plugin section
attributes changed-branch enforcement to a gate that checks changed executable lines/functions and
aggregate branch floors. Align that sentence with `docs/QUALITY_PROGRAM.md` and
`scripts/quality/coverage-report.mjs`. Planned files are `docs/TESTING.md` and this ticket; preserve
all thresholds, behavior, source classifications and detector checks. Validate the Plan, inspect the
exact corrected claim, format, validate tickets and include the change in the next complete
delivery. The finding is retained in `claim-review/testing-coverage-wording-finding.json`.

### Plan extension: package-size correction (2026-09-06)

The latest full delivery rejects the corrected lifecycle's packed size and installed core gzip size.
Keep all fixed budgets and shipped contents. Ticket 0006 owns the shared cloning and private
event-option refactor. Enable Terser's documented `hoist_funs` compression in `vite.config.ts`: it
moves function declarations before use without enabling unsafe transformations. The existing module
formats, browser target, property-mangling allowlist, diagnostics and sourcemaps remain. Isolated
ordinary Vite consumers measure 63,106 gzip bytes with hoisting alone and 62,984 with the selected
source refactor. Other investigated refactors and minifier settings remain unapplied.

Planned files: `vite.config.ts`, `docs/DEVELOPMENT.md`, `quality/jquery-mobile-migration.json`, this
ticket and `docs/tickets/ROADMAP.md`. Build the actual package, update only the Mobile reference
app's measured UMD byte field from that artifact, and verify installed consumers, API/types, graphs,
all browsers, packed and bundle limits, package-budget detector isolation and complete delivery.
Retain failures and measured identities. A source-only size experiment cannot authorize closure or
commit. Mutation testing remains deferred.

### Coordinated CSP build plan (2026-09-06)

Owner 0035 replaces the duplicated separate CSP distribution with shared neutral runtime chunks;
owner 0014 reuses its equivalent harness error helper to retain the testing entry-file limit.
Planned files are `vite.config.ts`, removal of `vite.csp.config.ts`, `package.json`,
`quality/production-census.json`, `src/testing/harness.ts`, the CSP/architecture/development/testing
guides, owners 0014/0035, this ticket and the roadmap. Generated agent files may refresh through the
existing generator only if their source bindings change. Existing raw/compressed/packed budgets, API
declarations, module formats, source maps and documentation remain required.

Preserve the two rejected circular chunk layouts and their `Function` scan failures. The selected
isolated layout passes both CSP graph scans, all entry-file budgets, core gzip 62,967 and CSP Brotli
38,979. Current actual package proof remains failed until rebuilt and installed. Require the full
package/API/type/browser/graph/corpus/detector and reproducibility checks, then complete delivery
and owner acceptance. Keep manual accessibility and the remaining program audit open.

### Behavior lifecycle follow-up plan (2026-09-06)

The current runtime review confirms behavior startup can retain effects, returned mount cleanup and
an observer after a callback destroys its application. Full teardown also misses mounts detached
before observer delivery. Owner 0006 records the correction and new public regression plan before
Code. Planned files are its runtime, new behavior lifecycle tests, public/brain ownership guidance,
owner ledgers and roadmap, plus generated bindings and actual Mobile UMD measurement if changed.
Retain the source probes and private prototype as separate evidence, and repeat current size and
complete delivery checks without weakening any ceiling or acceptance criterion.

### CSP literal-policy sharing plan (2026-09-06)

Owner 0035 records a source correction for the remaining CSP compressed-size limit: share the fixed
literal-argument method set and merge the identical `html` predicate while retaining the complete
arity table and unknown-method refusal. The selected private build fits both core and CSP limits.
Update its evaluator, architecture/ownership guidance, owner ledgers and roadmap, then verify the
current frozen CSP contract, installed package, coverage and complete delivery. Do not credit
unapplied alternatives or private builds as final acceptance.

### Detached declarative cleanup correction plan (2026-09-06)

The refreshed ownership review finds that full declarative root cleanup excludes owned elements
already removed from the DOM. The public reproduction retains a custom directive cleanup and a
window event after application/kernel teardown. Owner 0006 returns to planned and will make full
root cleanup cover detached records while keeping ordinary subtree containment and preservation. It
owns the new negative-to-positive application/kernel, error and live-sibling tests plus affected
public/brain documentation. Retain current-source probe identities and the interrupted delivery.
Finish the targeted source review and repeat focused, fast, coverage, installed-package and complete
delivery validation before any owner closure or receipt-based commit.

### Conformance runner ownership correction plan (2026-09-06)

The testing source review finds a retained harness after the last core conformance case fails. Owner
0014 returns to planned to dispose that harness, plus the optional cleanup-failing-plugin case on
early failure. Preserve named cases, original error identity and distinct cleanup errors. The
current public reproduction proves the harness still accepts new application work after the runner
reports failure. Keep the source/bundle record and negative controls, then require focused, fast,
coverage, installed-package and full delivery proof. This is an additional ownership finding; it
does not replace the pending declarative cleanup correction or final program requirements.

### Conformance allocation correction plan (2026-09-06)

The installed combined corrections pass twelve checks but exceed the testing CommonJS entry limit by
176 bytes. Owner 0014 returns to planned to share all six case harness lifetimes through one
internal helper. Its tests will also cover combined work/cleanup errors in each core case, retaining
both errors instead of the older finally precedence. Keep public signatures, case rosters and all
budgets unchanged. Record negative tests, focused checks and a fresh exact package/delivery result.

## Code

Owner 0006 adds eight same- and foreign-Document Sortable native drag cases in the document suite.
They verify transfer setup, preview versus native submission, accepted/background drop, drag
cancellation, invalid origins, nested isolation and a vetoed commit. The existing trusted
three-engine drag remains the browser control. Owner/umbrella tickets and COMPONENT_ARCHITECTURE,
TESTING and PROGRAM_AUDIT carry the evidence; production source and fixed limits remain unchanged.

### September 23 external native floating-state continuation

Owner 0006 adds five external native-toggle and two lost-overlay refresh unit cases in the shared
floating resource suite, plus one selected actual-browser Popover/Hover Card case across desktop
engines. Owner/umbrella tickets, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT document the
measured behavior. No production source, public signature or fixed quality limit changes.

### September 23 multiline initializer coverage attribution

Changed-file ledger: `scripts/quality/coverage-report.mjs` attributes a changed declaration header
only to counters starting inside its own multiline initializer, preserving explicit header hits and
recording IDs, lines and counts. `schema/coverage-report.schema.json` accepts the audit evidence
field. `test/quality/quality-gates.test.mjs` adds positive and zero/unrelated/explicit-zero
controls; `test/program-audit-coverage.test.mjs` retains strict independent report comparison. This
ticket, QUALITY_PROGRAM, TESTING and PROGRAM_AUDIT record the result. Production sources, coverage
floors, package budgets and other audit contracts are unchanged.

### September 23 Form and native Menu interaction boundary

Owner 0006 adds Form, Menu and Context Menu component tests for explicit-target rejection, native
versus authored disabled exploration, keyboard/touch invocation and native popover state. The
selected browser fixture/spec covers actual native validity and interaction in all desktop engines.
Owner/umbrella tickets, COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT document the scope and
evidence. No production behavior, public signature or fixed quality limit changes.

### September 23 structural explicit-action routing

Owner 0006 validates explicit native element targets in Dialog, Form, Disclosure, Menu and Toggle,
including Form and Toggle target/value overloads. Six component test files and one selected
three-engine browser fixture/spec cover wrong-kind rejection and valid native state. The five source
modules, tests, generated `etc/jquery-star-ui.api.md` line reference, owner/umbrella tickets,
COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT form this wave's changed-file ledger. Public
signatures and fixed quality limits remain unchanged.

### September 23 additional explicit-action routing

Owner 0006 validates explicit native targets in ten action resolvers and corrects Tree, Carousel and
File Upload target/value overloads. Their eleven component tests hold original-source public
negatives and matching, selector and implicit controls. One selected actual-browser fixture/spec
checks six representative families and native form, panel, file, tree and focus state in desktop
engines. COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the measured evidence. Public
signatures and fixed quality limits remain unchanged.

### September 23 remaining explicit-action routing

Owner 0006 validates explicit native element targets in six controllers and corrects Message
Scroller's element target/value overload, with direct public negatives in their component tests. One
selected browser fixture/spec covers all six in the desktop engines. COMPONENT_ARCHITECTURE, TESTING
and PROGRAM_AUDIT record the contract and measured gate change. Fixed budgets and public signatures
remain unchanged.

### September 23 Color Picker and Editable target audit

Owner 0006 corrects wrong-kind native element targets in Color Picker and Editable named actions,
adds direct native-boundary tests in their component suites, and extends the selected three-engine
browser fixture/spec. COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the contract and
measured gate change. Fixed budgets and public facade signatures remain unchanged.

### September 23 Password Field and Sidebar target audit

Owner 0006 corrects wrong-kind element-target actions in Password Field and Sidebar, adds direct
native-boundary tests in the two component files, and extends one selected three-engine browser
fixture/spec. COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record the contract and measured
gate change. Fixed budgets and public facade signatures remain unchanged.

### September 23 shared lifecycle and preserved-focus audit

Owner 0006 adds direct native-host lifecycle and transactional-focus tests in the scoped-observer
and preserved-focus suites. TESTING and PROGRAM_AUDIT record the measured coverage delta and the
remaining V8 map/default no-op entries. Production code and fixed budgets are unchanged.

### September 23 native value-action targets and coverage

Owner 0006 corrects explicit native-element targets in Input OTP, Search Field, Tags Input, Stepper
and Multi Select named actions, adds direct and native-boundary cases in their five test files, and
extends one selected real-browser fixture/spec. COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT
carry the contract and measured gate change. Public facade signatures and all fixed quality budgets
remain unchanged.

### September 23 native-control action and coverage wave

Owner 0006 corrects explicit element-target actions in Number Field, Time Picker, Rating, Toggle,
Toggle Group and Toolbar, adds public lifecycle/focus tests in the five existing unit files, and
adds a selected real-browser fixture/spec. COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT record
the contract and measured gate change. Fixed thresholds, budgets and public facade signatures stay
unchanged.

### September 23 changed-code coverage wave

Owner 0006 adds the Clipboard, floating ownership and Pagination behavior tests and records the
three-file coverage reduction. TESTING and PROGRAM_AUDIT carry the full-gate evidence. Production
source, public API, thresholds, package budgets and allowances are unchanged.

### September 23 nested declarative host slice

Changed-file ledger: owner 0006 changes `src/declarative.ts` and adds
`test/declarative-nested-application.test.ts`; owner 0016 extends the actual-host backend fixture
and spec with a separate `nested=1` mode. ARCHITECTURE, RUNTIME_OWNERSHIP, BACKEND,
INTEROPERABILITY, TESTING, PROGRAM_AUDIT and tickets 0006/0016/0033/0036/0037 describe the scope. No
public API, supported host range or fixed quality budget changes.

Coordinated-build implementation: `vite.config.ts` now owns CSP with the other modular entries; its
runtime dependency traversal prevents shared helpers from reconnecting CSP to the trusted compiler.
The separate CSP config and package build step are removed, and the production census reflects that
removal. The equivalent harness error helper and public/brain serving/build guidance are updated
under owners 0014 and 0035. Existing graph and size checks remain unchanged.

### Changed-file ledger

| File                                                                                                                                            | Purpose                                                                                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `scripts/program-audit/requirements.mjs`                                                                                                        | Derive every declared ticket/program criterion, enforce the expected roster, and validate exact evidence mappings.                                                                     |
| `scripts/program-audit/contracts.mjs`                                                                                                           | Shared bounded fields, closed objects, safe relative paths, timestamps, and digest validation.                                                                                         |
| `scripts/program-audit/manual-evidence.mjs`                                                                                                     | Check exact candidate/receipt and frozen environment identities, complete charter steps, and per-step Quick Nav settings with fixed diagnostics.                                       |
| `scripts/program-audit/evidence.mjs`                                                                                                            | Resolve named unit/browser/property/static/package/source proof; reject wrong identities, missing/duplicate results, skips, retries, and insufficient executions.                      |
| `scripts/program-audit/files.mjs`                                                                                                               | Bounded regular UTF-8 reads, digest checks, symbolic-link refusal, deterministic exclusive snapshots, and bounded output cleanup.                                                      |
| `scripts/program-audit/claims.mjs`                                                                                                              | Extract authored Markdown and HTML claim candidates before evidence selection; preserve code examples and duplicate occurrences.                                                       |
| `scripts/program-audit/inventory.mjs`                                                                                                           | Produce a schema-valid review inventory outside the artifact, with complete source inputs and an explicit unresolved-work list.                                                        |
| `scripts/program-audit/node-reporter.mjs`, `scripts/program-audit/node-evidence.mjs`                                                            | Record bounded flat Node outcomes and select named passing tests against an independent roster and execution identity.                                                                 |
| `quality/program-audit/node-test-report.schema.json`, `test/program-audit-node.test.mjs`                                                        | Close the Node report shape and reject missing, duplicate, stale or incomplete test and file records.                                                                                  |
| `scripts/program-audit/reports.mjs`                                                                                                             | Validate frozen report/schema identities and bounded JSON, then return immutable data for named execution checks.                                                                      |
| `scripts/program-audit/coverage-maps.mjs`, `scripts/program-audit/coverage-execution.mjs`, `scripts/program-audit/coverage.mjs`                 | Verify raw coverage math, source geometry, the complete collected test roster, and independently bound coverage policy and execution.                                                  |
| `quality/program-audit/coverage-summary.schema.json`, `quality/program-audit/coverage-hits.schema.json`, `test/program-audit-coverage.test.mjs` | Bound internal raw evidence and exercise source, counter, roster, mode, policy, and supervision refusal cases.                                                                         |
| `scripts/program-audit/release.mjs`                                                                                                             | Require complete release checks for the frozen artifact, independent builds, historical comparison, toolchain and supporting evidence.                                                 |
| `scripts/program-audit/navigation.mjs`                                                                                                          | Validate the full raw navigation matrix, exact configured assertions and identity, explicit exclusions, and terminal cleanup.                                                          |
| `test/program-audit-navigation.test.mjs`                                                                                                        | Keep historical full-report compatibility and negative controls for identity, completeness, assertions, cleanup and stronger evidence requirements.                                    |
| `test/program-audit-release.test.mjs`                                                                                                           | Reject incomplete, stale, inconsistent or weaker release evidence; bind synthetic report and mapping controls to the maintained schemas.                                               |
| `quality/program-audit/{vitest,playwright}-report.schema.json`                                                                                  | Validate the upstream report fields consumed by the adapters without treating a valid schema as a passing test run.                                                                    |
| `test/program-audit-reports.test.mjs`                                                                                                           | Exercise digest/size/schema mismatch, unsafe files, private error handling, structural limits, immutable results, and unsuccessful executions.                                         |
| `quality/program-audit/inputs.json` and internal schemas                                                                                        | Fix the 53-ticket roster, 613 requirement count, 74 claim source files, 22 baseline inputs, and closed inventory/mapping structures.                                                   |
| `test/program-audit*.test.mjs`                                                                                                                  | Exercise incomplete/ambiguous/stale/weaker evidence, identity mismatch, file boundaries, immutable output, and actual repository inventory.                                            |
| `test/property/program-audit.property.test.mjs`                                                                                                 | Generated roster/order/wrapping and duplicate claim occurrence controls using the existing property runner.                                                                            |
| `docs/PROGRAM_AUDIT.md` and `docs/README.md`                                                                                                    | Explain the internal commands, evidence boundaries, and remaining integration/manual review work.                                                                                      |
| This ticket                                                                                                                                     | Keep the baseline, design, changed files, verification results, and unresolved acceptance work current.                                                                                |
| `scripts/program-audit/detector.mjs`, `scripts/program-audit/detector-policy.mjs`                                                               | Validate all sixteen control summaries and child observations together before selecting one exact detector name.                                                                       |
| `scripts/program-audit/detector-browser.mjs`, `scripts/program-audit/detector-selection.mjs`                                                    | Verify raw failed/retried browser assertions and complete unexecuted selection rosters with exact source, tool, invocation and artifact identities.                                    |
| `scripts/program-audit/files.mjs`, `scripts/program-audit/reports.mjs` (detector integration)                                                   | Share bounded safe file reads with immutable binary metadata; bind binary artifacts and the separate selection schema to explicit frozen references.                                   |
| `quality/program-audit/playwright-selection-report.schema.json`                                                                                 | Permit deliberate empty selections in an internal listing-only schema while retaining the strict execution schema.                                                                     |
| `test/program-audit-detector.test.mjs`                                                                                                          | Independently construct complete control fixtures and reject missing, contradictory, stale or weaker observations, including retry trace ownership and selection policy.               |
| `test/program-audit-reports.test.mjs`, `test/program-audit-evidence.test.mjs` (detector integration)                                            | Exercise bounded binary references, immutable metadata, unsafe and replaced files, strict text decoding and separation of empty selections from executed tests.                        |
| `scripts/program-audit/navigation-inputs.mjs`                                                                                                   | Bind the current fixture, root lock, prepared installed graphs, six bundle byte identities and ordinary/digest-named tarballs before execution.                                        |
| `scripts/program-audit/navigation-runner.mjs`                                                                                                   | Execute all thirty complete rows from a verified owned asset snapshot and retain immutable rows with browser/server cleanup.                                                           |
| `scripts/program-audit/run-navigation.mjs`                                                                                                      | Freeze a component manifest before a supervised child and validate its actual process, source identity verification, raw schema and complete result before writing an execution index. |
| `test/program-audit-navigation-execution.test.mjs`                                                                                              | Independent preparation, graph/lock, full-selection, failure/cleanup, process and immutable-record controls.                                                                           |
| `scripts/program-audit/navigation-execution.mjs`                                                                                                | Bind the component index, manifest, process, logs and complete raw observations to independent frozen expectations, with current input verification and immutable results.             |
| `test/program-audit-navigation-index.test.mjs`                                                                                                  | Independent index/process identity controls and actual bounded file/schema/raw-report loading, including stale input and contradictory evidence refusal.                               |
| `docs/TESTING.md`                                                                                                                               | Explain navigation index controls, the single replaced preparation reader in disk fixtures, and historical versus current evidence.                                                    |

The mapping validator and `quality/program-audit/mappings.schema.json` now distinguish release
evidence from installed-package evidence. `docs/PROGRAM_AUDIT.md` records that distinction and the
remaining parent-gate interval integration.

The package adapter now requires an independently frozen browser-version roster and checks both
general and CSP installed consumers against it. Its focused tests reject missing or duplicate
engines, failures, wrong versions, and incomplete expected identities without echoing version
canaries. `docs/PROGRAM_AUDIT.md` records this boundary.

Navigation now has a separate evidence kind in the same mapping validator/schema. The report loader
selects the raw measurement definition from the frozen producer schema, with an explicit test
rejecting the decision document as execution proof. File and JSON limits are unchanged.

Formatting repair in `docs/tickets/0020-prove-resource-strategy.md` restores two historical Test
command rows to valid Markdown without changing their evidence or the completed decision.

Additional audit fixture maintenance: `test/release-candidate-contract.test.mjs` now verifies the
existing readiness rejection when an owner is reopened, allowing its corrective unit tests to run.
The candidate preparation function still requires every declared prerequisite to be done.

### Design changes

The package-size correction adds documented function-declaration hoisting in `vite.config.ts` and
explains it in `docs/DEVELOPMENT.md`. Ticket 0006 owns source consolidation. The selected isolated
consumer measures 62,984 gzip bytes; installed-package verification and the actual Mobile UMD
measurement are pending. Fixed budgets and existing runtime guarantees remain unchanged.

The activation Plan passed before maintained audit code was added. The preliminary inventory parser
missed 0034 AC-06 because its description starts on the next line. Strict count reconciliation
exposed the omission; derivation now retains the criterion and an explicit regression case. Internal
audit code and synthetic control records are distinct from final program acceptance evidence.

The inventory command deliberately produces `jqstar-program-audit-inventory/1` with
`review-required` status. It is not the final `jqstar-program-audit/1` manifest or verdict. Authored
Markdown/HTML units include supporting text and examples that still need semantic classification.
The complete input roster is checked before extraction, and every candidate starts unreviewed. The
report loader now verifies recorded bytes and schema identities. Its final manifest/index
integration, reviewed mappings, declined-service decisions/absence integration, and clean-source
orchestration remain unfinished. No current criterion has been relabeled complete.

## Test

Owner 0006's Sortable document suite passes 90 cases, with eight new native-drag cases across two
Documents. TypeScript, focused ESLint, Prettier and the existing trusted drag in all three desktop
browser engines pass. Standalone delivery-mode coverage remains red at 54 checks in 34 files, while
uncovered changed lines improve from 899 to 877 and functions from 69 to 63; Sortable itself
improves from 84/8 to 62/2. Exact-tree fast report `2026-09-24T02-19-05-914Z-66609/report.json`
passes all six lanes and 5,059 units. Full `npm run check` report
`2026-09-24T02-21-51-421Z-81002/report.json` has matching 933-file start/end fingerprints and passes
5,059 units, property, self-hosted, release and 1,717 browser cases without failure, retry or skip.
Coverage remains red at 54 checks in 34 files with 877 uncovered lines and 63 functions. Package
size fails its three fixed checks; package-budget is the only failed detector of sixteen. Two
documentation formatting/spelling faults added after the fast pass are corrected before final fast
verification. No delivery receipt is eligible.

### September 23 external native floating-state wave

Full `npm run check` report `2026-09-24T01-32-50-157Z-66628/report.json` starts and ends on matching
933-file fingerprint `31898c4b02097f34d19a0f60e3fa2ba96df0c68c4b5fb76284948460f757c8de`. Format,
5,051 units, property, static, self-hosted, release and all 1,717 browser cases pass across eight
projects, including 563 per desktop engine without failure, retry or skip. Coverage fails 54 checks
in 34 files, with 899 uncovered changed lines and 69 functions. Packed bytes 3,417,476, Mobile UMD
558,894 and installed root bundle 634,769 exceed fixed limits. Package-budget is the sole failed
detector control of sixteen; no delivery receipt or umbrella acceptance follows.

Fast report `2026-09-24T01-29-32-040Z-52009/report.json` passes all six lanes and 5,051 units on
matching 933-file fingerprint `1b62fc07d0ec35753b2a7e450f858ebef9ca3788ff1f446dc18870d733533b88`.
Owner 0006 and umbrella 0033 pass Code-phase validation against it. The subsequent ticket evidence
edit will be included in the full delivery input.

The shared suite passes 122 tests; TypeScript and focused ESLint pass. One actual-browser case
passes in Chromium, Firefox and WebKit for Popover and Hover Card native events, state, trigger ARIA
and outside dismissal. Standalone delivery-mode coverage still fails 54 checks in 34 files, while
uncovered changed lines fall from 937 to 899 and functions from 73 to 69. The fast and full results
are recorded above; fixed package limits and umbrella acceptance remain open.

### September 23 multiline initializer coverage attribution

Full `npm run check` report `2026-09-24T00-44-21-973Z-66209/report.json` starts and ends on matching
933-file fingerprint `71c9d9acbacc350d92755680611e5c0389b68562390e447d75288673c7a47153`. Format,
5,044 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 per desktop engine without failure, retry or skip. Coverage fails 56 checks
in 34 files, with 937 uncovered changed lines and 73 functions. Packed bytes 3,417,318, Mobile UMD
558,894 and installed root bundle 634,769 exceed fixed limits. Package-budget is the sole failed
detector control of sixteen; no delivery receipt or umbrella acceptance follows.

Fast report `2026-09-24T00-41-17-391Z-51661/report.json` passes all six lanes and 5,044 units on
matching 933-file fingerprint `079de4e41aea7ab9d79825479e935a5b4c8261dbe11757c854d672d75955cbf7`.
This umbrella ticket passes Code-phase validation against it. The subsequent ticket evidence edit
will be included in the full delivery input.

The Plan validator passes before the evaluator edit. The pre-correction selected controls fail three
cases, including the expected false missing-map result for an executed multiline initializer
(`.git/jqstar/multiline-coverage-negative.log`). After correction, the two focused quality and
independent-audit suites pass 101 tests; focused ESLint passes. The retained raw-coverage replay
(`.git/jqstar/multiline-coverage-replay.json`) and full standalone `npm run test:coverage`
(`.git/jqstar/multiline-coverage-standalone-gate.json`) agree: 40 changed declaration headers in 19
files have raw initializer hit evidence, leaving 56 failed changed-code checks in 34 files, 937
uncovered changed lines and 73 functions. The `src/kernel.ts` uninitialized class field remains
unmapped. The standalone command exits one because coverage is still incomplete. The exact-tree fast
and full results are recorded above; package failures and wider umbrella criteria remain open.

### September 23 Form and native Menu interaction wave

Full `npm run check` report `2026-09-23T23-55-50-488Z-65952/report.json` starts and ends on matching
933-file fingerprint `48c097feb1b0674803d45bc65c7341f3429fac463b12c01a2dc5a85c7169951d`. Format,
5,038 units, property, static, self-hosted, release and all 1,714 browser cases pass across eight
projects, including 562 per desktop engine without failure, retry or skip. Coverage fails 75 checks
in 35 files, with 937 uncovered changed lines and 73 functions. Packed bytes 3,417,197, Mobile UMD
558,894 and installed root bundle 634,769 exceed fixed limits. Package-budget is the sole failed
detector control of sixteen; no delivery receipt or umbrella acceptance follows.

The original Form resolver fails a direct `clear-errors` wrong-kind target plus valid field names
probe by clearing the nearby form. The corrected three-suite selection passes 29 tests; TypeScript,
focused ESLint and the lint-boundary ratchet pass. One selected browser case passes in Chromium,
Firefox and WebKit for native validity, Menu focus and Context Menu invocation/cancellation.
Standalone delivery-mode coverage still fails 75 checks across 35 files, while uncovered changed
lines fall from 965 to 937 and functions from 77 to 73. The fast and full delivery results are
recorded here; fixed package limits and umbrella acceptance remain open.

### September 23 structural explicit-action wave

Full `npm run check` report `2026-09-23T23-00-43-821Z-58338/report.json` has matching start/end
933-file fingerprint `c0b92ce1edaf173a30e021c8af8eeef7158b675c86ce1e51af8930eabdd6444b`. Format,
5,031 units, property, static, self-hosted, release and all 1,714 browser cases pass, including 562
per desktop engine without failure, retry or skip. Coverage still fails 75 checks in 35 files, with
965 uncovered lines and 77 functions. Packed bytes 3,417,139, Mobile UMD 558,894 and installed root
bundle 634,769 exceed fixed limits; package-budget isolation is the only failed detector control of
sixteen. No delivery receipt is eligible, and umbrella acceptance remains open.

Eight direct original-source wrong-kind cases and one separate Toggle `press` overload case fail
before correction. The corrected six-suite run passes 46 tests, TypeScript and focused ESLint pass,
and the selected native browser case passes in Chromium, Firefox and WebKit. Standalone delivery
coverage retains 75 failures across 35 changed source files, while uncovered changed lines fall from
974 to 964 and functions from 79 to 77. Exact-tree fast and full results are recorded above. Wider
audit acceptance remains open.

The first fast report `2026-09-23T22-53-42-349Z-29482/report.json` passes five lanes and fails one
unit release check because the generated UI API report's existing warning moved from line 667
to 670. The checked-in generated snapshot is refreshed; the passing repeat fast run follows.

The repeat fast report `2026-09-23T22-57-30-642Z-43847/report.json` passes six lanes and 5,031 units
with matching 933-file fingerprint
`91d719c848c312248d9c1a40fd215c838d6ede3ac4c763c4422d2cb82594d555`. The full delivery result is
recorded above.

### September 23 additional explicit-action wave

Full `npm run check` report `2026-09-23T22-05-28-440Z-41196/report.json` starts and ends on matching
933-file fingerprint `c1c0bfe1a18acaa65107e2cb21080005d19f21e8f942b4dfa14c31f1042f5202`. Format,
5,022 units, property, static, self-hosted, release and all 1,711 browser cases pass across eight
projects, including 561 per desktop engine without failure, retry or skip. Coverage fails 75
changed-code checks across 35 files. Package quality reports packed bytes 3,417,612 against
3,174,000, Mobile UMD 558,929 against 462,311 reviewed bytes, and installed root bundle 634,857
against 542,720. Package-budget is the sole failed detector control of sixteen; no delivery receipt
is eligible. Direct comparison with unchanged `config/quality-budgets.json` also shows masked
unpacked, UI ESM/CommonJS, raw UMD and CSS caps. Umbrella acceptance remains open.

Thirteen new public cases fail on original source across eleven suites, proving ten wrong-kind
redirects and three matching native-root/value overload failures. The corrected eleven-suite run
passes 87 tests; TypeScript and focused ESLint pass. One selected browser case passes in Chromium,
Firefox and WebKit without retry or skip. Standalone delivery-mode coverage remains at 75 failing
changed-code checks across 35 files, while uncovered lines fall from 985 to 974 and functions from
81 to 79. Fast report `2026-09-23T21-59-09-250Z-12003/report.json` passes all six lanes and 5,022
units on matching 933-file fingerprint
`581e01a9ea5ba568112b70bdd4bec0853f0f85faa12e26c6c4bbe8fc1df50724`. Full delivery, other changed
sources and the fixed package limits above remain open.

### September 23 remaining explicit-action wave

Full `npm run check` report `2026-09-23T21-10-29-609Z-23479/report.json` has matching start/end
933-file fingerprint `a9095ecf9e13991ecffea94cf358196e942f945eb43c86ca53e74214d5c68a5b`. Format,
5,009 units, property, static, self-hosted, release and all 1,708 browser cases pass across eight
projects; each desktop engine passes 560 without failure, retry or skip. Coverage remains red with
75 changed-code failures across 35 files. Packed bytes (3,417,751), Mobile UMD (559,168 versus
462,311) and installed root bundle (635,321 versus 542,720) exceed fixed limits. Package-budget
isolation is the sole failed detector control of sixteen. The report has no eligible delivery
receipt; umbrella acceptance remains open.

Fast report `2026-09-23T21-07-02-306Z-8804/report.json` passes all six lanes and 5,009 units on
matching 933-file start/end fingerprint
`4bfa78d79e38e6515c25be13dc078ef0c7e560f4d04c4718ffbff832bbe824b2`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; the full delivery result is recorded above.

Six original-source wrong-kind action tests fail, plus the separate matching root
`follow(root, false)` test. The corrected six-suite selection passes 43 tests; TypeScript and
focused ESLint pass. The selected actual-browser case passes in Chromium, Firefox and WebKit without
retry or skip. Standalone delivery-mode coverage reduces changed-code failures from 76 to 75 across
the same 35 files. Other changed sources and fixed package limits keep umbrella acceptance open.

### September 23 Color Picker and Editable target wave

Full `npm run check` report `2026-09-23T20-20-59-893Z-21133/report.json` has matching start/end
933-file fingerprint `598e998e4ce4b3a89a218ec57179f32222559f6911c71e03448030173f274740`. Format,
5,002 units, property, static, self-hosted, release and all 1,705 browser cases pass, including 559
per desktop engine without failure, retry or skip. Coverage fails 76 changed-code checks in 35 of 60
changed source files. Packed bytes (3,417,931), Mobile UMD (559,332) and installed root bundle
(635,618) exceed fixed limits. Package-budget is the only failed detector control among sixteen; no
delivery receipt is issued and umbrella acceptance remains open.

Fast report `2026-09-23T20-17-52-346Z-6504/report.json` passes all six lanes and 5,002 units on
matching 933-file start/end fingerprint
`46816f1495c82ec2515ddb1ed8017cf9bec507ca39048e4e35ea13181b50ef4c`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; full delivery is still required.

Two original-source public negatives fail. The corrected two-suite selection passes 21 cases and the
four related suites pass 266. TypeScript, focused ESLint and the unchanged lint-boundary ratchet
pass after replacing one new test non-null assertion with an explicit fixture guard. Standalone
delivery-mode coverage reduces changed-code failures from 77 in 36 files to 76 in 35, clearing Color
Picker; Editable retains four defensive stale-controller entry guards. The selected browser case
passes in Chromium, Firefox and WebKit without retry or skip. Matching fast and full delivery
reports remain necessary; other changed sources and fixed package limits keep umbrella acceptance
open.

### September 23 Password Field and Sidebar target wave

The corrected full `npm run check` report `2026-09-23T19-21-50-667Z-9825/report.json` has matching
start/end 933-file fingerprint `b7d5f872fc12f13592c448f34bf7ad835252191e7c2fd5164d39c46de685865a`.
Format, 4,991 units, property, static, self-hosted, release and all 1,705 browser cases pass, with
559 per desktop engine and no failure, retry or skip. Coverage fails 77 changed-code checks in 36 of
60 changed source files. Packed bytes (3,418,078), Mobile UMD (559,386) and installed root bundle
(635,716) exceed fixed limits; package-budget is the sole failed detector control among sixteen. No
delivery receipt follows. The first full report `2026-09-23T18-44-45-373Z-42853/report.json` also
caught three unformatted audit paragraphs; Prettier and `npm run format:check` corrected them before
the repeated full run.

The combined tree passes all six `npm run quality:fast` lanes and 4,991 units in
`2026-09-23T18-41-43-096Z-28287/report.json`, with matching 933-file start/end fingerprint
`5b15e06b338a7bfaab9bd27e1edd54273f1fb63cef17a6a3e004eb7104aa3786`. Owner 0006 and umbrella 0033
pass Code-phase validation against it; full delivery is still required.

Two original-source public negatives fail while 13 controls pass. The corrected 20-case focused
selection, TypeScript, focused ESLint and unchanged lint-boundary ratchet pass. Standalone
delivery-mode coverage reduces failures from 80 in 37 files to 77 in 36, clearing Password Field;
Sidebar retains one defensive stale-controller line. The selected browser case passes in Chromium,
Firefox and WebKit with no retry or skip. Owner 0006 records corrected focus and storage test
fixtures and the browser-fixture ESLint correction. Matching fast and full delivery reports remain
necessary; other changed sources and fixed package limits keep umbrella acceptance open.

### September 23 shared lifecycle and preserved-focus wave

The two focused suites pass 41 cases with TypeScript, focused ESLint and unchanged lint-boundary
ratchet checks. Standalone delivery-mode coverage reduces failures from 81 to 80 across the same 37
files. Reset cancellation reentry, dual-failure UI resource acquisition and disposal during native
focus-listener registration are exercised. The default no-op cleanup function and an uninitialized
class field still appear in the gate and require a principled coverage-map or source-contract
resolution; owner 0006 does not write a test solely to execute a placeholder. Fast and full delivery
remain pending, as do the other coverage and fixed package-size blockers.

### September 23 native value-action and coverage wave

Five original-source public negatives fail while 21 controls pass. The corrected 39-case focused
selection, TypeScript, focused ESLint and unchanged lint-boundary ratchet pass. Standalone
delivery-mode coverage reduces failures from 87 in 39 files to 81 in 37, clearing Search Field and
Tags Input. Input OTP, Stepper and Multi Select retain measured gaps. The selected browser case
passes in Chromium, Firefox and WebKit with no retry or skip. A matching fast and full delivery
report remain necessary; the other changed sources and fixed package limits keep umbrella acceptance
open.

Fast report `2026-09-23T17-35-10-849Z-13542/report.json` passes all six lanes and 4,980 units on
matching 933-file fingerprint `058b6e5997c8733f2b0694d9db4bcfcd30d8a78ae266f7e733a180b2d84acf76`.
Owner 0006 and umbrella 0033 pass Code-phase validation; full delivery and remaining program
criteria stay open.

Full `npm run check` report `2026-09-23T17-38-59-853Z-28268/report.json` has matching start/end
933-file fingerprint `216b3cd48bcc4d3e06bd9943f7b31e780202c394e37369f04703ef47c6c884e9`. Format,
4,980 units, property, static, self-hosted, release and 1,705 browser cases pass, including 559 per
desktop engine without failure, flake or skip. Coverage fails 81 changed-code checks in 37 of 60
changed source files. Fixed packed (3,417,532), Mobile UMD (559,441) and installed root bundle
(635,815) limits fail; package-budget isolation is the sole failed detector control among sixteen.
No receipt or umbrella acceptance follows.

### September 23 native-control action and coverage wave

The five public element-action negatives fail before correction, with 24 existing controls passing.
The corrected 44-case focused selection, TypeScript and focused ESLint pass. Full standalone
delivery-mode coverage reduces changed-code failures from 93 in 44 files to 87 in 39, clearing all
five targeted sources. The selected browser case passes in Chromium, Firefox and WebKit with no
retry or skip. A matching fast and full delivery report remain necessary; the other 39 changed
source files and fixed package limits keep umbrella acceptance open.

The first fast run of this wave found new non-null assertion counts in five tests. Owner 0006
replaced those assertions with explicit fixture checks; the focused tests and unchanged
lint-boundary ratchet pass. The failed fast report remains in the owner ledger pending a fresh fast
checkpoint.

Fast report `2026-09-23T16-32-48-871Z-13629/report.json` passes all six lanes and 4,962 units on
matching 933-file fingerprint `4a9521d58b2efb5fb74a119d6fdca61b71af6418dc71744b1b7314941934c24e`.
Owner 0006 and umbrella 0033 pass Code-phase validation. Full delivery and the remaining program
criteria stay open.

Full `npm run check` report `2026-09-23T16-37-46-727Z-28545/report.json` has matching start/end
933-file fingerprint `49226d997b79b2ac335a31c475aa820eb04c223570d72c1ef5407182e0b74274`. Format,
4,962 units, property, static, self-hosted, release and 1,705 browser cases pass, including 559 per
desktop engine without failure, flake or skip. Coverage fails 87 changed-code checks in 39 of 60
changed source files. Fixed packed (3,417,336), Mobile UMD (559,527) and installed root bundle
(636,018) limits fail; package-budget isolation is the only failed detector control among sixteen.
No receipt or umbrella acceptance follows.

### September 23 changed-code coverage wave

The owner ticket records 128 focused passes, a standalone coverage reduction from 96 failures in 47
files to 93 in 44, and a six-lane, 4,942-unit fast pass on 933 matching files. The corrected full
`npm run check` report `2026-09-23T15-12-21-834Z-21004/report.json` starts and ends on fingerprint
`351d1d9da3efe73ae7446a8ddcc83bd85ff094214856e698d3fd32df37ae2627` with 933 files. Format, units,
property, static, self-hosted, release and all 1,702 browser cases pass, including 558 per desktop
engine without failure, flake or skip. Coverage still fails 93 changed-code checks across 44 of 60
changed source files. Fixed packed (3,416,696), Mobile UMD (559,623) and root bundle (636,122)
limits fail; package-budget isolation is the only failed detector control among sixteen. There is no
receipt or umbrella acceptance.

### September 23 nested declarative host evidence

The direct negative failed in both boot orders before correction; the first fast run then found
three page-wide boot failures. The narrowed rule passes six direct cases and 51 focused
core/CSP/patch cases. The rebuilt bundle passes all 24 single/nested backend cases and the 90-case
combined host selection across three desktop engines, without retries, flakes or skips. The nested
mode checks outer state isolation, child request/action ownership and real replacement. Two
temporary nested no-bridge Chromium variants render the host result but leave the outgoing child
live after native removal. Full delivery, named-component explicit boot and broader common-matrix
combinations remain open.

The current fast report `2026-09-23T13-32-36-307Z-32671/report.json` passes 4,933 units and all six
lanes; Code-phase validation passes on its exact fingerprint. Full `npm run check` report
`2026-09-23T13-35-36-553Z-47216/report.json` starts and ends on the matching 932-file fingerprint
`eb2d4ad1d3e82795c5638312de882c20f67f24bdf1d264949c0aea4e2073cb83`. Its eight browser projects pass
all 1,702 cases, 558 per desktop engine. Coverage fails 96 changed-code checks across 47 of 60
changed source files, while the new `src/declarative.ts` lines and functions are covered. Package
quality fails packed bytes 3,416,436, UMD 559,623 and installed root bundle 636,122; package-budget
detector isolation fails among fifteen passing controls. No receipt or program acceptance follows.

Final documentation run `2026-09-07T02-13-50-146Z-150` passes unit, coverage, property, format and
workflow checks but fails spelling on one word in ticket 0009. The wording now says mutation testing
remains deferred. After the failure was confirmed, the runner received SIGTERM; later gates were not
executed and no receipt was issued. The corrected final tree requires a fresh complete delivery run.

| Command                                                              | Result | Evidence                                                                                                                                                                                                                                                                                                                                                                                                         |
| -------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JQS_QUALITY_FORCE_ALL=1 npm run check` (invokes `quality:delivery`) | Pass   | `2026-09-07T01-53-29-076Z-39380/report.json`: all 13 enforced gates pass with matching 858-file fingerprint `c053e7f45e868a3f5e29824b29610eeaaec1da8b27f97ada8b4a51b834691121`. All 1,642 unit tests, 487 browser tests, 13 installed-package checks, seven release checks and 16 detector controls pass. Coverage reports no uncovered changed executable lines or functions in the nine changed runtime files. |
| Installed package sizes from that delivery run                       | Pass   | `package-report.json`: testing CommonJS/ESM are 12,975/12,988 bytes, core consumer is 62,991 gzip bytes and CSP consumer is 38,983 Brotli bytes. Existing 13,000/63,000/39,000 limits are unchanged.                                                                                                                                                                                                             |
| Actual Test phase validation for owners 0006, 0009 and 0014          | Pass   | `ownership-census/current-batch-test-validation.log`: all three validators pass against that exact delivery report before moving to Document. The final documentation and status changes require a new matching delivery receipt before commit.                                                                                                                                                                  |

| Command                                                                 | Result | Evidence                                                                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `JQS_QUALITY_FORCE_ALL=1 npm run quality:fast` (shared case correction) | Pass   | `2026-09-07T01-50-50-116Z-26250/report.json`: all six gates and 1,642 unit tests pass with zero failures or pending cases. Start/end fingerprint `de5b1c1e725d368bd1f15f790d4332492e08d00862cbca2db608589cb7cfb82d` matches across 858 files. |
| Owner 0014 Code validation against that exact fast report               | Pass   | Actual phase validation passed before moving 0014 to testing. Current installed-package, coverage and full delivery proof remain required.                                                                                                    |

Fast run `2026-09-07T01-48-13-397Z-13196` passes 1,642 unit tests and every gate except formatting.
The shortened aggregate label changes Prettier's line layout in `src/testing/conformance.ts`;
formatting is corrected without a semantic change. The failed report is retained and a complete
passing fast run is still required before Code closure.

The final shared-case implementation passes 53 focused testing-helper cases, including all three
core cases with normal and throwing cleanup. The two combined-error cases first fail against the
prior finally-based source, while seven controls pass. The actual build now emits `testing.cjs` at
12,975 and `testing.js` at 12,988 bytes, both within the unchanged 13,000-byte limits. Earlier
shared builds at 13,053/13,066 and 12,994/13,007 remain recorded as insufficient. Inlining the
single-use cleanup helper, sharing the native freeze reference, retaining an unset disposal flag and
shortening the new aggregate label preserve report shapes and both error identities. The plugin
factory keeps its original method receiver, and synchronous cases still clean up synchronously.
Current fast, coverage, installed-package and complete delivery remain required.

Installed run `detached-conformance-installed-4b167b4` passes twelve of thirteen checks. The only
failure is `dist/testing.cjs` at 13,176 bytes against its unchanged 13,000-byte limit. All three
browsers and consumer graph budgets pass. All 41 input identities remain unchanged during execution.
Owner 0014 owns the shared case cleanup correction; the failed package report remains retained.

Fast run `2026-09-07T01-35-41-017Z-92774` passes all six gates and 1,638 unit tests with matching
858-file fingerprints. Owners 0006 and 0014 pass actual Code validation before returning to testing.
The current consumer preview measures core gzip 62,991 and CSP Brotli 38,983 within unchanged
limits; installed-package execution, current coverage and full delivery remain pending. The
architecture, ownership and testing claim records are deliberately refreshed with archived prior
records and exact unchanged-unit checks: 20 sources and 818 authored units are semantically
reviewed. Final direct evidence remains unproven.

The combined build passes and its actual UMD is 463,263 bytes. The Mobile measurement is updated
under owner 0006's validated manifest extension. Conformance cleanup now passes 49 focused cases,
including the same-terminal-error control. Focused ESLint initially rejected a missing caught cause
and unnecessary type assertion; the corrected source passes without rule changes. The complete
testing implementation source review now covers five more runtime files, bringing ownership review
to 46 of 109. These counts and focused results do not establish final acceptance.

The declarative correction passes 88 focused lifecycle/patch tests after four negative teardown
cases and a passing live-sibling control. A malformed initial control is separately retained and
corrected before source changes. The conformance correction passes 48 focused testing-helper cases
after three negative ownership regressions and one passing control. Both source/bundle probes and
test reports are retained under `ownership-census/`. Current fast, changed-code coverage,
installed-package budgets and full delivery remain open.

Delivery `2026-09-07T01-23-08-047Z-63863` is an intentional SIGTERM error after the detached
declarative cleanup defect was reproduced. Six gates pass, including 1,628 tests and delivery static
analysis. Coverage is interrupted; subsequent gates do not run. The matching-fingerprint report has
no receipt. Probe records under `ownership-census/declarative-detached-*` show zero custom cleanup
calls after application and kernel teardown, with a remaining window listener. Owner 0006 must
correct and verify this before final acceptance.

Corrected fast run `2026-09-07T01-20-28-576Z-50719` passes all six gates and 1,628 unit tests with
matching 856-file fingerprints. Owner 0035 passes the actual Code validator against that report
before returning to testing. Current installed-package proof passes all thirteen checks;
changed-code coverage, complete delivery, remaining source review and final program acceptance are
still required. No delivery receipt is issued by fast verification.

Fast run `2026-09-07T01-18-31-719Z-37831` passes all 1,628 unit tests and five of six gates. Static
analysis fails only the spelling check on one word in owner 0035's allocation plan. The wording is
corrected without changing a dictionary or rule. The failure remains recorded and Code closure
requires a passing repeat.

Installed run `csp-literal-policy-installed-4b167b4` passes all thirteen checks for the combined
behavior and CSP corrections. Its 265-file tarball is 2,869,763 packed bytes with digest
`13143443ea894021b3a51acf15fe3ea750959329c5966313595c52011d7c697d`; core gzip is 62,998 and CSP
Brotli is 38,992. API/types, both CSP graphs, all consumer budgets and Chromium/Firefox/WebKit pass.
All 38 snapshotted changed inputs remain unchanged throughout execution. Records are retained under
`ownership-census/csp-literal-policy-installed/`. The architecture/ownership claim refresh now
covers 810 authored units across the same 20 sources; the evaluator's exact static-policy delta is
separately reviewed with historical census offsets explicitly retained. These are development
records. Current fast, changed-code coverage, complete delivery and final audit acceptance remain
pending.

The CSP literal-policy correction passes 40 focused tests and the separate four-test frozen contract
command, with the existing contract digest and case inventories unchanged. Focused ESLint succeeds.
Its recovered build log completes declarations and CSS; the original process exit was not retained.
The UMD bytes and hash match the behavior correction. The selected private preview measures core
gzip 62,998 and CSP Brotli 38,992, but current installed-package execution, fast, changed-code
coverage and complete delivery are still required. Evidence remains under
`ownership-census/csp-literal-policy-*`. The new static-policy documentation also requires an
explicit refresh of the architecture, ownership and evaluator review records before final evidence
binding.

Behavior follow-up fast run `2026-09-07T00-57-56-093Z-17895` passes all six gates and 1,628 unit
tests. Owner 0006 passes Code validation before returning to testing. The build, focused ESLint and
agent generation pass. Current consumer preview measures core gzip 62,998 and CSP Brotli 39,055; the
latter exceeds its unchanged 39,000-byte ceiling. Three additional CSP chunk layouts and four
compiler/source-sharing variants did not satisfy both limits and remain unapplied. Current actual
installed-package, changed-code coverage and full delivery remain required.

The behavior correction passes 116 focused tests across five suites. All seven new public
regressions first failed against the unchanged runtime; their negative and passing records remain
under `ownership-census/behavior-lifecycle-{negative,focused}.*`. The source now stops late setup,
immediately releases returned mount cleanup after record removal and releases detached mounts during
root destruction. Current fast, coverage, rebuilt package sizes and complete delivery remain open.

Delivery `2026-09-07T00-44-32-365Z-72294` was deliberately stopped with SIGTERM after the new
behavior lifecycle defects were reproduced. Eleven gates passed, including 1,621 unit tests,
changed-code coverage, static analysis, thirteen package checks and seven release checks. The
browser gate was interrupted and the detector gate did not start. The runner records `error` with
matching start/end fingerprints and no receipt. Preserve that result; the forthcoming behavior
correction requires fresh complete delivery.

Installed-package run `shared-runtime-installed-4b167b4` passes all thirteen checks against the
coordinated build. The 265-file archive is 2,869,140 packed and 9,930,485 unpacked bytes; core gzip
is 62,967 and CSP Brotli is 38,979, within unchanged limits. API/types, ESM/CommonJS/QUnit,
Chromium/Firefox/WebKit, parsed CSP graphs, every optional consumer bundle and copy-in registry
checks pass. All 36 snapshotted changed-file identities remain unchanged throughout execution.
Evidence is `ownership-census/shared-runtime-installed/package-report.json` with the corresponding
input snapshot. This replaces the earlier package failures for the current build; full delivery,
current changed-code coverage, reproducibility and detector verification remain required.

Corrected fast run `2026-09-07T00-39-45-843Z-56060` passes all six gates and 1,621 unit tests. Its
start/end fingerprint is `dab37305752a564ff0530caa6b3a91976929c84907ef9f9c79a65c150b85764a` across
855 files after staging the planned config deletion. Owners 0014 and 0035 pass actual Code
validation against that report before moving to testing. This fast result supplies no delivery
receipt; installed-package validation and complete delivery remain required.

Fast run `2026-09-07T00-35-53-404Z-42795` passes all 1,621 unit tests and five of six gates. Its
source-policy scan fails while opening the removed `vite.csp.config.ts`, which was still in Git's
index. Stage that planned deletion so the scanner sees the intended file roster. The direct
source-policy rerun passes 679 files without changing any policy rule. Preserve the failed report; a
fresh complete fast run was required and passes as recorded above. Installed-package validation
remains required.

Coordinated-build follow-up passes the actual build, API/declaration extraction, all individual
bundle-file budgets and both complete CSP emitted-graph scans. Seven focused suites pass 55 tests.
The UMD digest and measured Mobile reference field remain unchanged. Agent-content regeneration
passes through the maintained command. Current installed-package, changed-code coverage and complete
delivery evidence remain pending; the prior failed package report stays retained.

Corrected coverage passes for all 125 changed executable lines and 25 changed functions, with no
uncovered/unexplained changes, all 28 executed requirement mappings, and passing global/subsystem
floors and immutable threshold comparison. Raw reports and 30 unchanged input hashes are retained in
`ownership-census/package-size-coverage-passed/`. This standalone pass does not resolve the packed
or CSP Brotli size failures and supplies no delivery receipt.

The first size-refactor coverage run reports one uncovered changed line, `src/fetch.ts:91`, for
nested request-state path initialization. Tests, global/subsystem floors and all 28 executed
requirement mappings pass. Owner 0006 adds a public pending/error state test before rerunning the
unchanged coverage contract; original raw reports are retained.

Standalone package run `package-size-installed-4b167b4` fails two of thirteen checks: packed size
3,176,621 exceeds the combined 3,174,000-byte allowance, and CSP consumer Brotli size 39,046 exceeds
39,000. The installed core raw/gzip assertions pass before that CSP failure. Other package checks,
including API/types, isolated consumers, QUnit, Chromium/Firefox/WebKit, Mobile UMD identity and
registry copying pass. All 29 input hashes remain unchanged. Preserve
`ownership-census/package-size-installed/package-report.json`; do not treat this standalone run as
delivery or claim later bundle assertions executed after the CSP failure. Investigate the separate
CSP/UMD compression and retained sourcemap sizes before repeating package validation.

Package-size correction: seven focused suites pass 153 tests, and `npm run build` passes. The actual
UMD artifact measures 463,097 bytes (SHA-256
`887fd2794f8aa0de7f7d1200aa6c107bae2c53275ed902d638b70049e7afc46b`), and
`quality/jquery-mobile-migration.json` now records that value. The local build measurement is
retained in `ownership-census/package-size-umd-measurement.json`; installed package sizes and
complete delivery remain pending. No fixed limit changed.

The package-size correction passes fast run `2026-09-07T00-13-54-546Z-15329`: all six selected gates
and 1,620 unit tests, unchanged fingerprint
`629cc01ec800fbb83a349344f00162fe527fa62685ca4c7cfa4949833164c4ca` across 856 files. Owner 0006
passes actual Code validation and returns to testing. Subsequent phase/evidence edits require new
delivery. Semantic review of the two added architecture/development claims brings the reviewed
authored-unit count to 802 across 20 of 74 sources, with final acceptance still pending.

| Command                                                                      | Result              | Evidence                                                                                                                                                                                                                                                                                                                      |
| ---------------------------------------------------------------------------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run quality:fast`                                                       | Pass                | Run `2026-09-06T21-34-49-277Z-19979`: all five selected gates and 1,567 unit tests pass. The unchanged workflow self-test is explicitly skipped. Exact Code validation passes before this ledger update.                                                                                                                      |
| `JQS_QUALITY_FORCE_ALL=1 npm run check` (invokes `npm run quality:delivery`) | Pass                | Run `2026-09-06T19-59-38-133Z-2581`: all thirteen gates, 1,414 unit tests, 487 browser tests, thirteen package checks, seven release checks and sixteen detectors. Its matching receipt passed before these ledger and Plan edits.                                                                                            |
| Current coverage adapter probe                                               | Pass                | `coverage-evidence-plan/current-adapter-probe.json`: five selectors and 21 refusal cases; all 1,414 tests were collected before invocation, and their source digests and the 843-file startup fingerprint match. Empty changed scope remains `not-measured`.                                                                  |
| Detector integration prototypes                                              | Pass                | Nine raw browser controls/traces, sixteen project listings, all sixteen summaries, package/release failures and API artifacts; 91 refusal cases across four probes. These are integration checks, not final audit acceptance.                                                                                                 |
| Maintained detector, coverage, report and file tests (initial)               | Pass                | `detector-evidence-plan/maintained-focused-initial.log`: 117 tests across four files, including 41 detector cases.                                                                                                                                                                                                            |
| Independent detector review controls (before correction)                     | Fail, corrected     | `detector-evidence-plan/maintained-review-controls-before-fix.log`: seven controls exposed acceptance of a retry trace on the passed attempt and six altered listing configuration fields. The adapter now requires the failed attempt's trace and exact listing supervision, project identity, source directory and timeout. |
| Maintained detector composition against retained real reports                | Pass                | `detector-evidence-plan/maintained-probe.json`: all sixteen selectors and fifteen refusal cases, with nine hash-bound nonempty ZIP traces and all raw child reports loaded through frozen schema references. Final immutable execution remains required.                                                                      |
| Test-phase validator against the 19:59 delivery                              | Failed: ledger gaps | `coverage-evidence-plan/adapter-test-validation.log` records the missing formal fast-check row and inspection ledger. The prose had passing results, but did not meet the required structure. This update adds both sections; a new matching delivery report is required after the edits.                                     |
| Navigation integration first fast run                                        | Fail, corrected     | `2026-09-06T21-05-40-187Z-43858`: unit and code analysis pass; formatting, one extra blank line and one spelling issue fail documentation checks. The documents are formatted and the wording corrected before repeating the fast gate.                                                                                       |
| Navigation execution Plan validator                                          | Pass                | Full installed matrix, separate preparation, frozen component manifest, supervised process/index and unchanged decision boundary recorded before code.                                                                                                                                                                        |
| Navigation executor and existing adapter tests                               | Pass                | `navigation-execution-focused.log`: 76 tests, including 40 new preparation, graph, selection, process, cleanup and immutable-record controls.                                                                                                                                                                                 |
| Navigation executor focused ESLint                                           | Pass                | All three new automation modules and the new test file pass the maintained rules.                                                                                                                                                                                                                                             |
| Navigation component complete delivery                                       | Pass                | Run `2026-09-06T21-09-59-648Z-57385`: all thirteen gates. Actual Test validation and matching receipt pass before and after staging. All eight paths committed and pushed as `3ed84e6`; this receipt is historical after that commit.                                                                                         |
| Navigation component execution                                               | Pass                | `navigation-executions/2026-09-06T21-09-59.956Z-X8xlyG/execution.json`: 840 flows, 498 configured passes, six exclusions and 72 retained host-default failures. All indexed hashes agree and the owned asset snapshot is removed. This was a mutable development source, not final program acceptance.                        |
| Navigation index Plan validation                                             | Pass                | Independent frozen expectations, strict index/process/file validation, immutable results and final clean-source refusal recorded before implementation.                                                                                                                                                                       |
| Navigation index, executor and raw adapter tests                             | Pass                | `navigation-index-focused.log`: 139 tests, including 63 new index and file-loading controls. Complete historical raw observations exercise the maintained schema and navigation selector.                                                                                                                                     |
| Navigation index focused ESLint                                              | Pass                | New index reader and test file pass maintained lint rules.                                                                                                                                                                                                                                                                    |
| Previous exact-tree complete delivery                                        | Pass                | `2026-09-06T20-34-46-930Z-77599`: all thirteen gates, 1,464 unit and 487 browser tests, thirteen package/seven release checks and sixteen detectors. Matching receipt and actual Test validation pass before commit `daa9970`, now pushed. This is historical evidence for that batch.                                        |

Fast run `2026-09-06T20-32-00-811Z-64051` passes all six selected gates and 1,464 unit tests. Exact
Code-phase validation against that report passes before this ledger update. The finalized ledger and
implementation still require a matching complete delivery report and Test-phase validation. Logs are
`detector-evidence-plan/maintained-fast.log` and `maintained-code-validation.log`.

The reviewed detector integration passes 123 focused tests across the detector, coverage, report
loader and file-boundary suites, including 47 detector tests. The seven newly added review controls
failed before correction and pass afterward. Focused ESLint also passes. The composed
retained-report probe still passes all sixteen selectors, fifteen refusal controls and nine trace
references after the stricter retry and listing checks. Logs are
`detector-evidence-plan/maintained-focused-reviewed.log`, `maintained-lint-reviewed.log` and
`maintained-probe-reviewed.log`. These results validate the adapter; they do not close the final
program audit or authorize delivery of subsequent edits.

Current planning mappings cover 577 of 613 requirements with 5,885 citations. Thirty-six
requirements, semantic claim review and final immutable execution remain unfinished; sixteen manual
references still await actual records. These are verified planning selectors, not final audit
acceptance.

The maintained coverage adapter and raw report loader pass 63 focused tests using handwritten
source, raw counters and expected reports. These exercise both policy modes, changed and unchanged
source scopes, a source root outside this checkout, source/counter/location/summary mismatches,
bounded expansion, complete test-roster multiplicity, hidden failures, altered supervision and
policy identities, schema/hash mismatches, and weaker evidence substitutions. The first focused
ESLint run found three computed-key deletes in test refusal fixtures; replacing them with
`Reflect.deleteProperty()` preserves the refusal cases and satisfies the existing rule.

The retained full delivery report also passes all five applicable selectors and 21 composed refusal
controls through the maintained hash-bound loader, including both raw coverage schemas. It covers
116 source files and 1,359 executed assertions. `changed-production` remains `not-measured` for that
scope. The original test collection occurred during that historical outer run, so this proves
adapter compatibility only. Final orchestration still must freeze the collection before execution.
Results are retained as `coverage-evidence-plan/adapter-focused-initial.log` and
`coverage-evidence-plan/maintained-adapter-probe.json` under the ignored program-audit directory.

Fast `2026-09-06T19-56-41-269Z-88477` passes all six selected gates and 1,414 unit tests. Exact
Code-phase validation passes before this evidence update. The coverage integration is ready for
complete delivery verification; ticket 0033 remains coding while detector evidence, reviewed
mappings and final orchestration remain unfinished. Mutation execution stays deferred.

Earlier planning covered 517 of 613 requirements with 4,692 citations. Refreshed CSP and
static-quality mappings pass their selectors against delivery `2026-09-06T17-32-22-094Z-2586`;
twelve manual references at that checkpoint awaited two real records. Eight mutation-removal rows
have 53 validated citations. A separate read-only inspection finds no former Stryker paths,
dependency, npm command or active implementation reference and no retained package or release
workspace. Historical reclaimed-byte measurements remain historical.

The maintained Node reporter, selector, closed schema and loader integration pass ten focused tests.
These include five actual producer/loader scenarios, three actual reporter refusal scenarios and
independent roster/identity/count/interval controls. Focused ESLint passes. Final source-roster
freezing and execution-index integration remain required; these tests do not establish program
acceptance. The actual maintained reporter also executes all 34 current workflow tests. Its
source/name roster, schema digests and command are recorded before invocation; the loader and
selector accept every named result against the independently recorded process interval and zero exit
status. The report and execution record remain under `node-evidence-plan/`.

Fast `2026-09-06T17-54-28-563Z-63873` passes all six gates and 1,347 unit tests. Code validation
passes against that exact report before this evidence update. Ticket 0033 remains coding because the
final orchestration, mappings and manual evidence are still incomplete. The following delivery run
verifies this implementation batch and documentation; it is not the final program audit.

Delivery `2026-09-06T17-32-22-094Z-2586` passes all thirteen gates, including 1,343 unit tests, 487
browser cases, thirteen package checks and seven release checks. Its 831-file start/end fingerprint
is `f49200c41d318019ee032ce5551c5f2ec7d3276ca2d7bf15ba84557d22d71876`. Test validation and receipt
verification pass before the actual manual-server command and commit. The automated three-engine
command smoke passes against the exact package after replacing premature main-world readiness
evaluation with DOM observation in the ignored smoke script. No screen-reader pass is claimed. The
verified correction is pushed as `ac9f9bd`; later auditor edits require fresh delivery.

Delivery `2026-09-06T17-09-48-357Z-25355` passes twelve gates, including all 1,341 unit tests and
487 browser cases, but its final detector rejects a stale fourteen-test expectation after fifteen
hardening cases pass. Owner 0035 records and corrects that expectation. Direct audit also found its
HTML fixture outside the canonical HTML command; 0035 now enrolls it and verifies all current HTML
paths plus invalid/corrected markup. The static-source citations are now refreshed against the
corrected complete run above. No program acceptance verdict or mutation result is claimed.

Delivery `2026-09-06T15-57-46-593Z-71119` passes all thirteen gates, 1,334 unit tests, 487 browser
cases and sixteen detector controls, with matching start/end fingerprints. The CSP correction is
committed and pushed as `5ee0ada`; Test and Document validation close owners 0034 and 0052.
Installed CSP proof under 0035 remains open. Source review reopens 0045 because the README lost its
seven priorities, and the existing canonical homepage test lacks direct narrow-home layout
assertions.

Delivery `2026-09-06T16-35-46-844Z-42041` passes all twelve selected gates, 1,334 unit tests, 487
browser cases, thirteen package checks, seven release checks and sixteen detector controls. The
unchanged runner self-test is explicitly skipped. Receipt and Test validation pass before Document
closes 0045. The current package artifact is
`c309e20b418b89417d9bfbea598ada1709bdc083e063a3408d50dea761e9f5a3`.

Current planning mappings contain 469 requirements and 4,161 exact citations. All nine 0045 rows now
have 32 valid selectors, including the restored README lists and the three-engine narrow-home case.
The 0035 Plan now activates the expanded installed proof after nine isolated profile cases, three
native pairs and three early-listener controls pass. Five real browser faults and thirty report
refusal controls are rejected as expected. These diagnostics guide implementation; complete
maintained verification and both real assistive-technology records remain required.

Earlier planning mappings contained 468 requirements and 4,159 exact citations. The new 0045
candidates have 30 valid selectors, but AC-02 remains absent and AC-03 awaits the maintained
narrow-home assertions. Updated 0034 mappings add computed ownership, shared budgets, native-model
parity and both internal CSP cases in every desktop engine: all 251 citations resolve against the
completed delivery. Refreshing the inherited grammar excerpt to include the documented owned-getter
boundary also passes all 108 ticket-0015 citations. These are planning checks, not the final frozen
verdict; 145 requirements, semantic claim review, immutable execution and the two real manual
records remain.

Owner 0034 now contains the maintained computed-ownership correction, bounded dependent evaluation,
first-failure retention, and shared native model handling. Focused proof passes 109 cases, strict
types, ESLint and the unchanged lint ratchet. The source core consumer is 62,969 gzip bytes, below
the 63,000-byte ceiling. The audit also found the old CSP digest was not bound to the actual six
manifests; the contract test now checks that equality. Full delivery and owner closure remain
pending. Owner 0035 still owns expanded installed strict-policy, native and accessibility evidence.

Installed-browser identity delivery `2026-09-06T14-32-53-767Z-25056` passes all eleven selected
gates, 1,316 unit tests and 484 browser cases. The unchanged runner and 0044 detector checks were
explicitly skipped. Receipt verification passed before commit `05d9110`, now pushed. Owner 0034 has
an isolated computed-ownership prototype and bounded-work controls; integration and final installed
proof remain required. Hosted full audit `34039155609` still tracks the preceding quality correction
`09d6109`.

Fast run `2026-09-06T14-29-51-928Z-12176` passed unit and all other selected checks but failed on
one unrecognized word in the new 0035 prose. Reworded that sentence without a dictionary or rule
change; repeat fast verification before Code validation and delivery.

The maintained package browser-identity integration passes seventeen focused audit/release-contract
tests and ESLint. The real historical package report passes all thirteen selectors; nine
schema-valid identity controls are refused. Nineteen historical mapping probes pass after adding
explicit expected versions and refreshing one reviewed documentation excerpt for the newly recorded
repetition budget. These remain compatibility checks, not final semantic acceptance. Plan validation
passed for 0033 and the reopened 0034/0035 correction records.

Quality-correction delivery `2026-09-06T14-07-22-596Z-50023` passes all thirteen gates, 1,313 unit
tests, 484 browser cases, thirteen package checks and seven release checks. Owner 0052 Test
validation and exact receipt verification passed before commit `09d6109`, which is pushed. Hosted
full audit `34039155609` is running against that exact commit. The preceding c5 hosted run
`34035393474` ended with only its repeated-browser gate failing; its randomized property gate
passed. The newer run includes the repetition budget and recorded property fixes.

Navigation/release integration delivery `2026-09-06T13-39-35-777Z-50559` passes all twelve executed
gates, 1,299 unit tests, 484 browser cases, thirteen package checks and seven release checks. The
unchanged 0044 detector was conditionally skipped. The matching receipt verified the exact worktree
before commit `3c9a0e4`. This is implementation evidence, not the final program audit.

Hosted prerequisite run `34034049302` found a persistence negative-zero property mismatch and an
incomplete repeated WebKit run at its single-repetition process bound. Owner 0052 records both
retained failures and returns to Code for quality-test corrections. Hosted run `34035393474` still
tracks the preceding committed source; it cannot establish acceptance of these new corrections.

The navigation integration passes 64 focused audit tests and ESLint, including 36 navigation
controls and a raw-schema loader check. Plan validation passed before these changes. The retained
historical report contains thirty rows, 840 flows, 498 configured passes, six declared no-JavaScript
exclusions and 72 host-default failures. These checks establish adapter behavior and producer
compatibility, not current-candidate navigation acceptance. The 0020 historical command rows now
remain separate table rows after formatting.

The preceding release-adapter delivery `2026-09-06T13-19-02-124Z-92160` passed all twelve executed
gates, 1,262 unit tests, 484 browser cases, thirteen package checks and seven release checks. The
unchanged 0044 detector was conditionally skipped. Its tarball remains
`a79bb89456c89c08f847d89153a03d3a99f38e35cf750d77999319b7b63a63eb`. Fresh fast and delivery
verification must cover the navigation integration and corrected ledger before commit.

Planning mappings now cover 460 requirements with 4,065 exact citations. The latest 26 migration
criteria add 269 citations; eight references explicitly await real manual accessibility records. The
remaining 153 requirements, semantic claim review and final execution/manual evidence remain
required. Selector compatibility does not establish that a criterion is fully exercised, as the CSP
computed and accessibility findings demonstrate.

Release integration fast run `2026-09-06T13-16-07-075Z-79212` passes all six gates and 1,262 unit
tests. Code validation accepted that exact report. The maintained release adapter also accepts all
seven named checks in retained delivery `2026-09-06T12-56-58-360Z-43424`; this establishes producer
compatibility without relabeling historical evidence as a final audit. Full delivery remains
required for the current integration and ledger.

The preceding delivery passed 1,256 unit tests, 484 browser cases, 13 package checks and seven
release checks, followed by owner 0052's Test validation. Its six corrected files are committed and
pushed as `c5c7797`. Hosted full audit `34035393474` is running against that exact commit; 0052
remains testing. Owner 0020 is done. Planning mappings now cover 378 requirements with 3,114 exact
citations, including sixteen stable-release rows whose schema and selector probes pass. Remaining
requirements, claim review, manifest/index integration, complete current navigation proof and both
manual accessibility records are still required.

Delivery `2026-09-06T06-34-06-391Z-92532` passed all 13 gates before the report-loader integration
and was committed as `c3b957e`. This verifies the prior auditor implementation and owner
corrections; it is not the final program verdict. The loader prototype accepted eleven real report
shapes and seven negative controls, and all five isolated loader tests passed. Maintained
integration passes all 21 focused audit tests and ESLint. Official Node 24 fast run
`2026-09-06T06-59-48-361Z-54578` passes all six gates and 1,249 unit tests. Fresh delivery remains
required for these changes.

| Command                                                  | Result                                      | Evidence                                                                                                                                                                                                   |
| -------------------------------------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Plan validator for 0033 before maintained implementation | Pass                                        | Activation design and immutable prerequisite baseline recorded before Code.                                                                                                                                |
| Release integration Plan validator                       | Pass                                        | Seven-check release contract, separate evidence kind and remaining parent-gate integration recorded before implementation.                                                                                 |
| Focused audit tests and ESLint after release integration | Pass, 27 cases                              | Six new release controls join the 21 existing audit controls; the release fixture validates against the producer schema. This is auditor verification, not final program acceptance.                       |
| Focused Vitest audit tests                               | Pass, 18 cases                              | Requirement/mapping/manual checks; named report adapters; file boundaries; actual full repository inventory; two generated property cases. These are auditor controls, not final program acceptance proof. |
| Focused ESLint                                           | Initial failure corrected; subsequent pass  | Replaced a control-character regular expression with explicit character-code checks. No rule or scope was weakened.                                                                                        |
| `npm run check` for this audit implementation            | Interrupted after a reproduced owner defect | Run `2026-09-06T05-06-50-063Z-47835` passed unit, coverage, and static checks before SIGINT. It has no delivery receipt. Ticket 0002 must be corrected first.                                              |
| Node 24 hosted full-audit run `34012438886`              | Failed; 0052 reopened                       | Clean built-asset setup, core gzip budget, and browser-server readiness failures are retained in `.git/jqstar/hosted-audit-34012438886/`.                                                                  |
| Real NVDA/Windows and VoiceOver/Safari charters          | Missing                                     | No executed current-artifact records were found. User location question is pending; synthetic fixtures are excluded.                                                                                       |

### Inspection ledger

| Finding                                                                                                                  | Resolution                                                                                                                                                                            | Evidence                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Coverage reports must agree with raw counts and the complete independently collected test roster.                        | The maintained adapter validates all 116 runtime files and 1,414 actual assertions against a collection completed before the 19:59 delivery.                                          | `coverage-evidence-plan/current-adapter-probe.json` and `adapter-collection-record.json`; source fingerprint and every collected test-source digest match. |
| The passing run does not by itself establish final program acceptance.                                                   | Ticket 0033 remains in progress; detector integration, final manifest/index/orchestration, reviewed claims and mappings, and actual manual/reference/hosted evidence remain required. | The Plan, open prerequisite tickets 0017/0035/0039, and the explicit limitations in the probe records.                                                     |
| Test-phase validation could not find the formal fast command row or inspection ledger among the historical prose.        | Added the required structured sections and retained the failed validation log.                                                                                                        | `coverage-evidence-plan/adapter-test-validation.log`; repeat phase validation against the next matching complete delivery.                                 |
| A reduced-motion detector assertion exceeds the initial prototype error bound; API snapshots use different line endings. | The validated prototype permits a bounded 1 MiB error within the existing report limit. API text comparison normalizes only CRLF while preserving both original hashes.               | `detector-evidence-plan/browser-prototype-before-error-bound.log`, `browser-prototype-probe.json` and `api-prototype-probe.json`.                          |
| A trace attached to the successful retry or altered raw listing configuration could satisfy the initial adapter.         | Bind trace ownership to the failed attempt and verify raw listing workers, shard, flaky policy, project IDs, source directories and timeouts.                                         | Seven independent failing controls are retained in `detector-evidence-plan/maintained-review-controls-before-fix.log`.                                     |
| The research measurement command updates its tracked decision even without the recording option.                         | Added a separate executor that only reads preparation and stores its full result in the audit output directory.                                                                       | Direct inspection of `scripts/measure-navigation-decision.mjs`; the new runner never imports or invokes it.                                                |
| The ordinary browser suite covers nine scenarios, while the full decision requires twenty-eight per row.                 | The executor supplies no subset or timeout override and validates all thirty rows through the maintained full-navigation adapter.                                                     | Independent 30-row invocation test and existing 840-flow/498-pass/six-exclusion adapter controls.                                                          |
| Navigation component indexes were not yet bound to independent program expectations.                                     | Added a maintained reader for source, artifact, process, interval, file and complete raw-result identities.                                                                           | 63 new controls and 139 combined navigation tests pass; actual component composition and complete delivery follow this finalized ledger.                   |

## Document

COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT now state the external native floating-state and
lost-overlay restoration contract, with shared and actual-browser evidence. The remaining program
criteria stay open.

QUALITY_PROGRAM and TESTING now describe the evidence attribution and its fail-closed controls.
PROGRAM_AUDIT records the 75-to-56 reduction and the remaining work. This umbrella ticket stays
coding until the other coverage, package, installed-consumer and full-program criteria close.

COMPONENT_ARCHITECTURE, TESTING and PROGRAM_AUDIT now state the element-target action contract and
the measured five-file reduction. The remaining program criteria stay open.

TESTING and PROGRAM_AUDIT now state this measured three-file reduction and the corrected exact-tree
delivery result. The remaining coverage, package and detector requirements keep the full-program
criteria open.

The public and brain docs now distinguish plain nested application islands from named component
markers and describe the opt-in real-host backend proof. This is a bounded audit slice; no full
program acceptance or receipt follows from the selected cases.

### Documentation changed

`docs/PROGRAM_AUDIT.md` documents the internal review inventory, direct evidence adapters, file
boundaries, manual-record limitations, and unfinished work. `docs/README.md` links this guidance.
Public package/runtime contracts are unchanged.

### Acceptance evidence

Pending implementation.

### Completion audit

Pending.

The supported-toolchain gzip comparison also reopened owner 0013: identical baseline JavaScript
exceeded its existing budget with official Node 24 compression. Its current extraction shares
internal value checks and browser-owned header policy. The compiled diagnostic is under budget;
installed-package and full delivery evidence remain pending. Owners 0002, 0013, and 0052 must close
before this audit can accept final prerequisite inventory.

A comparison with the retained real package report found an adapter schema-name mismatch hidden by
its small synthetic control. `selectPackage` and its control used `jqstar-package-report/1`; the
actual producer and schema require `jqstar-package-quality/1`. Correct the adapter and bind the
control identifier to the repository schema. The reproduced refusal is retained as
`.git/jqstar/program-audit/package-adapter-schema-mismatch.json`. This is an audit-tool development
correction; the historical report remains historical and is not final program evidence.

Fast run `2026-09-06T05-58-16-310Z-69053` passed unit and every other enforced check except one
spelling finding in the preceding development note. The wording was corrected without changing a
rule or dictionary. Repeat fast verification before the next phase transition.

### Website correction discovered during evidence review (2026-09-06)

The nested-base current-source probe found zero script tags on the jQuery UI migration page.
Chromium, Firefox, and WebKit reproduced inactive theme, search, and mobile-menu controls; an
immutable in-memory injection of the actual built modules restored all three controls in each
engine. Source and browser route rosters omitted this page and additional newer guides. The
reproduction, failed broad probe, and Plan validation are retained in
`.git/jqstar/program-audit/site-base-plan/`. Ticket 0039 is reopened before the maintained
correction. Current website acceptance remains unproven until its expanded census and behavior
checks pass.

Node-evidence delivery run `2026-09-06T17-56-32-372Z-79864` passed twelve gates and explicitly
skipped the unchanged ticket-0044 detector suite. It ran 1,347 unit, 487 browser, 13 package, and
seven release checks and authorized commit `5ecba25bcc9cdff73c6ab938f44c1ab477d415ec`, now confirmed
on the remote branch. An attempted whole-ticket Test validation was rejected for the missing formal
Code fast-result row and nonempty inspection ledger. This ticket remains in Code; the incremental
commit's delivery receipt does not close the unfinished program audit or its Test phase.

The 0039 correction passes 22 focused unit/contract/property/corpus tests and 30 website browser
checks. Root and nested static builds each pass 24 direct routes with and without JavaScript and
shared controls on all 22 documentation pages in three engines. Final delivery and owner closure
remain outstanding. Root screenshots were inspected without claiming comparison to the missing
original references. Planning mappings now cover 536 of 613 requirements with 5,170 citations; 77
remain unmapped. Sixteen manual references await the same two real assistive-technology records.
These counts are preparation progress, not accepted final audit evidence.

The homepage copy audit also found `jQStar 1.0.0 release candidate` in the authored home and its
three generated corpus copies, while the release authority and download guide identify 1.1.0. Ticket
0051 is reopened before correcting that statement and adding independent source/corpus version
checks. Current corpus route coverage was separately verified: all 24 HTML routes have a reviewed
page record. This does not resolve the contradictory version statement.

Delivery `2026-09-06T18-25-17-167Z-42076` is terminal Error after deliberate SIGINT. Its ticket
workflow gate had already rejected the 0039 fast-result table beneath a subheading; the record is
now directly below `## Test`. Eight other selected gates passed, including package quality, before
release interruption. Browser and detector gates did not run, and no delivery receipt was issued.
The corrected website batch will run the full gate again after the 0051 correction.

The 0051 correction now passes 36 focused source, corpus, release-candidate, WebMCP and migration
checks. Both candidate-statement assertions failed before the change. The one-line homepage edit and
normal corpus regeneration now agree with the existing 1.1.0 release authority. The stopped 0039 run
remains recorded as Error; its partial evidence is not a receipt or final program pass.

Combined fast run `2026-09-06T18-33-38-682Z-72779` passes five selected gates and 1,349 unit tests,
with the unchanged runner self-test explicitly skipped. Both 0039 and 0051 pass exact Code
validation and are in Test. The repeated root/nested probes bind current source fingerprints and
asset digests, observe the corrected candidate badge, and pass all 24 routes and 22 shared-control
routes in three engines. The current desktop home render was inspected; original-reference
comparison remains unclaimed. Full combined delivery verification and both owners' Test/Document
closure remain required.

### Current delivery and closure findings (2026-09-06)

Combined delivery `2026-09-06T18-36-18-416Z-79694` passed all thirteen gates on one unchanged
fingerprint. It records 1,349 unit tests, 487 browser passes without failures, skips or flaky
results, 13 package checks, seven release checks and sixteen detector controls. The matching receipt
and both corrective Test phase validations passed before the following documentation changes. Ticket
0051's candidate-copy correction can close; 0039 remains in Test because its original AC-06 requires
actual screen-reader observations, which are still absent.

Current full per-project browser reports resolve the earlier combined-report ambiguity. All 245
website and WebMCP citations across 23 additional candidate rows pass the maintained selectors and
hash-bound schema loader. Planning now covers 559 of 613 requirements with 5,415 citations; 54
remain unmapped. Original-reference comparison, sixteen references to the two real manual records,
complete semantic claim review and final immutable execution remain outstanding.

Two independent current-state checks reopen their owners. The actual detector recorder accepts a
SIGTERM child with a null exit after its expected diagnostic, falsely marking a red control passed.
Ticket 0044 returns to Plan for strict process-result handling and schema consistency. The complete
ordinary control run does not disprove this reproduced failure mode. Separately, GitHub's live
private-vulnerability-reporting setting returns disabled although SECURITY.md directs users to that
form. Ticket 0017 returns to Plan; the bounded enabling action awaits separate governance approval.
No repository setting, advisory, message, publication or mutation tool was changed by these probes.

The 0044 process-result correction passed its reopening Plan before implementation. Its actual
production recorder now refuses signals, timeouts, spawn errors and contradictory exits, even with
the expected diagnostic. Six new process/schema tests and fifteen existing package/release hardening
tests pass. Fast `2026-09-06T18-59-55-273Z-40747` passes all six gates and 1,355 unit tests; exact
Code validation passed before 0044 entered Test. The current correction still needs its full
sixteen-control delivery execution and final owner closure. The separate 0017 reporting setting
remains unchanged pending authorization.

### Detector closure and semantic census finding (2026-09-06)

Delivery `2026-09-06T19-02-35-591Z-53871` passes all thirteen gates, including 1,355 unit tests, 487
browser passes and all sixteen corrected detector controls. Its unchanged-tree receipt and 0044 Test
validation passed before documentation edits; Document validation closes that correction. Current
installed consumers also fulfill 0044's former future-export disposition through completed 0013
and 0014. Actual assistive-technology records remain separate outstanding requirements.

Fourteen program-level candidate rows add 423 verified direct citations, including legacy event
identity, bounded observations, installed extension contracts and historical full-navigation
selectors. Planning now maps 573 of 613 requirements with 5,838 citations; forty remain unmapped.
These planning reports do not establish the final independently frozen execution or public-claim
review.

The actual coverage hit maps expose synthetic covered function/branch counters for seven type-only
modules. The maintained semantic compiler helper confirms that none emits runtime JavaScript, but
the census labels them as coverage. A separate comment-only input also proves that retained comments
can be mistaken for runtime emission. Ticket 0043 returns to Plan for exact exclusions and semantic
validation in both directions. Coverage floors and runtime/type contracts remain unchanged; a fresh
raw report must prove the corrected denominator. Original findings and the proposed repair are
retained under `.git/jqstar/program-audit/coverage-evidence-plan/`.

The 0043 correction now passes its Plan, fifteen focused gate tests, the actual 443-artifact census,
and fast run `2026-09-06T19-24-03-304Z-14028` with all six gates and 1,359 unit tests. Exact Code
validation passed before entering Test. Coverage now selects 116 runtime files, and the pure
semantic validator rejects erased-code coverage, executable type exclusions and missing sources. The
corrected full raw coverage measurement and final owner closure remain pending.

### Coverage correction closure and adapter proof (2026-09-06)

Delivery `2026-09-06T19-26-03-660Z-27019` passed all thirteen gates on one unchanged fingerprint:
1,359 unit tests, 487 browser passes, thirteen package checks, seven release checks and sixteen
detector controls. Its matching receipt and exact 0043 Test validation passed before documentation
edits; Document validation then closed 0043. The reproduced artifact remains
`8ef13f0d0b2a7a1512c84bd2ad15f956cefbca73c87af2e14c96752b56ab8715` with 257 files.

The corrected report measures 33,566 lines/statements (31,724 covered), 2,806 functions (2,622
covered) and 13,011 branches (11,058 covered). The seven removed synthetic records each had one
credited function and branch; earlier zero-hit wording was incorrect and is corrected from the
preserved raw reports. All 116 retained runtime sources match the commit, with identical
statement/function maps and covered states and identical uncovered branch locations. A few
already-covered V8 ranges differ between runs; their raw measurements remain intact. Current floors
pass, while twelve stricter stabilization target metrics remain below target.

The three coverage prototypes and two internal schema drafts now pass actual report compatibility,
including five named selector results and 58 combined refusal controls. A separately collected
1,359-case list matches the complete execution while preserving the three repeated persistence case
labels. These are integration probes, not final frozen audit acceptance. The validated Plan
refinement above governs maintaining this adapter next. No mutation testing was installed or run.

### Navigation integration checkpoint (2026-09-06)

Commit `daa9970` is pushed with the verified coverage/detector batch. The ignored planning index now
contains 602 of 613 requirements and 6,418 citations; eighteen references still await the same two
real manual records. These counts describe reviewed mapping candidates, not accepted final evidence.
The final manifest/complete execution index, eleven remaining mappings, semantic public-claim
review, current hosted/prerequisite/reference evidence and real manual records are unfinished.

The separate current Node 24 navigation preparation completes and produces the same candidate digest
as the prior verified delivery: `8ef13f0d0b2a7a1512c84bd2ad15f956cefbca73c87af2e14c96752b56ab8715`,
3,168,982 packed bytes. The maintained input loader validates 138 input references, fifteen schemas,
six installed bundles and thirty required rows before scenarios. Logs remain in
`navigation-preparation-current.log` and `navigation-execution-focused.log`. The actual complete
navigation component run and matching delivery were pending at that checkpoint. The subsequent
840-flow component and thirteen-gate delivery pass are recorded above and committed as `3ed84e6`.

### Navigation index checkpoint (2026-09-06)

The maintained index reader and its 63 controls pass alongside the 76 existing navigation tests.
Fast run `2026-09-06T21-34-49-277Z-19979` passes all five selected gates and all 1,567 unit tests;
the unchanged quality-runner self-test is explicitly skipped. Actual Code validation passes against
that exact report before this ledger update. The next complete delivery and actual component-index
probe will verify the finalized five-file batch. The final whole-program manifest and report, eight
remaining requirement mappings, public-claim review, real accessibility records, original references
and prerequisite closure remain unfinished. Mutation testing remains deferred.

### Navigation index verification and public-guide correction (2026-09-06)

Delivery `2026-09-06T21-37-11-727Z-26802` passes all thirteen gates, including 1,567 unit and 487
browser tests, thirteen package checks, seven release checks and sixteen detector controls. Actual
Test validation and matching receipt checks pass before and after staging. The five files were
committed and pushed as `5d74334`; the receipt retains its original pre-commit identity. The current
development navigation run also passes through the maintained index reader: 840 flows, 498
configured passes, six declared exclusions and 72 retained host-default failures. Five actual
refusal controls reject changed inputs, artifact, interval or index, and attempted final use of the
mutable development run. This component proof does not complete the final program audit.

Draft semantic review now covers twelve of 74 public-source files and 344 authored units. The 605 of
613 requirement mappings remain planning candidates. Reviewing the release and migration guides
found two documentation errors: manual delivery can skip release-required gates, and modular core
already defaults to generic requests. Owner 0017's validated Plan now covers both corrections in the
three public guides. Its prerequisite and final-candidate criteria remain pending alongside the
private-reporting approval. Original references and real accessibility records remain required.

The corrected fast run `2026-09-06T21-07-41-367Z-50541` passes 1,504 unit tests and all five
selected gates. The unchanged workflow self-test is recorded as a conditional skip, not a pass.
Exact Code validation passes before this ledger update. A direct wrong-artifact invocation is also
refused before browser execution (`navigation-wrong-artifact.log`). The matching full navigation
component and forced complete delivery results will be retained under their own immutable run
directories.

### Ownership review and testing restoration finding (2026-09-06)

The guide batch passed complete delivery `2026-09-06T22-01-29-764Z-96643`, exact receipt and Test
validation, and was committed/pushed as `b133b25`. Draft semantic review covers nineteen of 74
public sources and 673 authored units; the 605 of 613 requirement mappings remain planning records.

The ownership review now records every current `src/` path and conservative variable/class-field
candidates, including closure references. Twenty-three of 109 runtime sources have explicit reviews:
eleven foundational files and twelve entry or CSP support files. The candidate list does not prove
complete mutable ownership; caller-managed compatibility helpers and the complete remaining source
review still require final interpretation.

A direct isolated-process probe found that `withStarDOMRealm()` reports success when deletion of an
originally absent global returns false. Both response-controller restoration paths have the same
reproduced defect. Owner 0014 returned to a validated Plan before code changes. Its correction adds
explicit failed-removal reporting, full remaining cleanup and callback-error preservation, with
actual non-configurable-property regressions. The owner ticket must close before the final
inventory. Mutation testing, real accessibility records, original references and private-reporting
approval remain separate unresolved work.

The corrected batch passes 38 focused tests and fast run `2026-09-06T22-38-12-350Z-72785` with all
1,572 unit tests and all five selected gates. The unchanged runner self-test explicitly skips. Owner
0014 passes Code validation against that exact report and moves to testing; complete delivery and
final closure remain required. Earlier generated-corpus and CSP inventory failures remain in the
owner ledger with their corrections; no budget, grammar or coverage threshold was relaxed.

### Response cancellation finding (2026-09-06)

The restoration correction passed full forced delivery `2026-09-06T22-44-39-527Z-6366`, all thirteen
enforced gates and exact receipt/Test validation before commit `4b167b4`. Continued ownership review
confirms that abort and delayed response fixtures retain their signal listener after controller
disposal. An injected timer cancellation failure also permits the disposed timer to invoke its
response factory. Owner 0014 returns to Plan before correcting both paths. Exact public-API probes
and controls are retained in `ownership-census/response-cancellation-finding.json`. The ownership
census remains 38/109 inspected; confirmed findings are not acceptance. The request controller,
debounce-record and directive-registration findings still require owners 0006/0009 to reopen. Final
manual accessibility, reference and release evidence remains outstanding; mutation testing remains
deferred.

### Lifecycle owner reopening (2026-09-06)

Owners 0006 and 0009 return to planned with unchecked criteria and explicit implementation/test
scopes for the confirmed shared-controller, debounce-record and directive-registration defects.
Their prior closures remain historical. Owner 0014's response-cancellation correction passes 45
focused tests and independent native-signal/timer probes. Its first fast run passes 1,579 unit tests
but rejects increased non-null assertions; the extended Plan replaces them with explicit fetch setup
checks and removes the obsolete allowance. Full correction verification remains required.

### Verified lifecycle corrections and next owner (2026-09-06)

Owners 0014 and 0006 pass Code validation against fast run `2026-09-06T23-15-18-323Z-88354`: all six
gates and 1,600 unit tests pass, with an unchanged 856-file fingerprint. Both move to testing;
complete delivery and acceptance remain pending. Owner 0009's public reentrant-setup probe also
confirms skipped provisional/returned cleanup and later enhancement after application destruction.
Its Plan now covers that ordering defect before source edits. The exact probe is
`ownership-census/directive-reentrant-finding.json`.

### Directive rollback correction implemented (2026-09-06)

Owner 0009 implements the validated provisional-cleanup and task/effect registration rollback Plan.
Ten regressions reject the original source, which is restored exactly after the negative control.
The fixed source passes 100 focused tests across four suites. Public core/application tests cover
reentrant destruction and failed task creation; explicit capability injection covers release during
kernel task registration and a throwing detach. The owner remains coding pending fast, coverage and
full delivery. Source-review identities must be refreshed before final program acceptance.

### Combined lifecycle corrections enter full verification (2026-09-06)

Fast run `2026-09-06T23-26-05-896Z-7785` passes all six gates and 1,610 unit tests with a matching
856-file fingerprint. Owner 0009 passes Code validation and moves to testing alongside 0006/0014.
Independent current-source probes confirm task cancellation, stopped effects, cleanup during
reentrant teardown and no later descendant enhancement. Complete delivery and owner acceptance
remain pending; mutation testing remains deferred.

### Combined delivery failure (2026-09-06)

Forced delivery `2026-09-06T23-28-19-460Z-20892` finishes with eleven passing gates and two
failures. All 1,610 unit tests, 487 browser cases, coverage, properties, static checks and seven
release checks pass. Coverage measures all 96 changed executable lines and sixteen changed
functions, with no uncovered or unexplained changes. Package quality rejects 3,175,232 packed bytes
against 3,174,000, 63,203 core gzip bytes against 63,000, and the stale Mobile UMD reference
(463,011 versus actual 463,830 bytes). The package-budget detector also fails because these
unrelated package errors remain alongside its deliberate failure. The other fifteen detector
controls pass. Source fingerprints match throughout; no delivery receipt is eligible. Preserve the
failed report and correct the implementation/measurement within unchanged budgets before repeating
full delivery.

### Semantic review and built-in lifecycle follow-up (2026-09-06)

Semantic review now covers twenty of 74 sources and 799 authored units. Ownership, architecture and
backend records were refreshed against exact current sources while preserving their historical
records. The testing-guide review identifies the coverage wording correction above. These are draft
interpretations, not final direct evidence or acceptance. Ownership review remains 38/109.

Additional actual public-API probes confirm initial-effect leaks in built-in `data-effect`,
`data-show` and `data-bind`. The model case also retains input handling after destruction. Owner
0006's extended Plan reopens AC-01 and covers both effect and model registration before code. The
small shared-clone/private-member size experiments do not meet the core budget and have not been
promoted. Original references, actual accessibility records, final program assembly and
private-reporting authorization remain pending; mutation testing has not been run.

### Built-in correction focused and fast results (2026-09-06)

The built-in initial-registration correction passes all 108 focused tests and fresh source-bundled
public probes. `data-effect` and `data-show` no longer run after owner destruction; model state
updates no longer write the destroyed input and native input cannot update its state. Retained
effect counts are zero. Source changes keep the existing callback and diagnostic behavior.

Fast run `2026-09-06T23-51-17-189Z-80588` passes all 1,618 unit tests and typed/static code checks,
but fails the ticket and spelling gates. Inserting a subheading before the main Test table hid the
existing fast rows from the documented section reader. The failure note now remains plain text in
the main Test section. The spelling correction uses ordinary prose instead of an unrecognized word.
No validator or spelling allowance changed. A corrected fast run remains required.

The ownership/testing semantic records now bind the corrected sources: twenty reviewed sources, 800
authored units and 54 remaining sources. Earlier records are preserved. Final direct evidence,
package size, owner acceptance and whole-program completion remain pending.

### Built-in correction returns to testing (2026-09-06)

Corrected fast run `2026-09-06T23-54-22-242Z-93737` passes all six gates and 1,618 unit tests with
unchanged 856-file fingerprint `ce08adb4…e49f0`. Actual Code validation for 0006 passes against that
exact report before its return to testing. The phase/ledger edits follow that run and require later
matching delivery. Current changed-code coverage and package-size/measurement correction remain
outstanding. No delivery receipt or owner completion is claimed.

### Built-in correction coverage (2026-09-06)

Standalone coverage passes all 104 changed executable lines and eighteen changed functions with no
uncovered or unexplained changes. All 28 requirement mappings identify executed passing tests;
global coverage is 94.52% lines/statements, 93.44% functions and 85.05% branches. The unchanged
subsystem and historical-floor checks pass. Exact raw reports and current input hashes are retained
in `ownership-census/builtin-registration-coverage/`. This is coverage evidence only; the known
package failures still require correction before a matching complete delivery and owner closure.

### Plugin and store review resumed (2026-09-08)

The worktree resumes from clean commit `c5269db`. The retained source review covers 46 of 109
runtime files and twenty public sources with 818 authored units. Fresh public-core probes reveal
plugin activation after disposal, continued application hooks after destruction/disposal, omitted
staged-resource rollback and a store setup effect that survives disposal. Owners 0008 and 0018
return to Plan before implementation. Exact probes and source identities are retained under
`ownership-census/resume-2026-09-08/`. These findings prevent final acceptance; no final evidence
run or mutation tooling starts. The remaining source/public-claim review and external evidence stay
open.

### Plugin correction reaches testing (2026-09-08)

Fast `2026-09-08T13-11-08-222Z-35005` passes all six gates and 1,659 unit tests. Exact Code
validation passes for owner 0008 and the inventory-only 0035 pin refresh. Expanded focused proof
passes 144 cases. Public probes show stopped later hooks, refused publication and returned/staged
cleanup. Ownership review now covers 47 of 109 sources after adding the directive registry review;
changed kernel/CSP review identities still need refresh. Owner 0018's six additional setup-boundary
probes extend its validated Plan. Complete delivery, owner closure and the final program audit
remain unfinished; no mutation tooling runs.

### Store correction and complete delivery result (2026-09-08)

Delivery `2026-09-08T13-13-33-365Z-48105` finishes on one unchanged 859-file fingerprint with eleven
passing gates. Its 1,659 unit and 487 browser tests, changed-code coverage and seven release checks
pass. The package browser assertion and detector baseline both reject one stale CSP digest literal;
owner 0035 records and corrects it. Owner 0018's provisional setup-lifetime correction passes 55
focused cases, including 22 new lifecycle cases, and is integrated from an isolated checkout after
the original delivery finishes. New fast and delivery evidence remain required.

The source review now covers 48 of 109 files. The plugin review and kernel/CSP source identities are
refreshed. A retained comparison proves the conformance-helper hash change is formatting only; all
48 reviewed identities match current source before the store correction. Claim review covers 20
sources and 820 authored units after plugin documentation review. The new store documentation and
implementation need their own review refresh. These remain draft interpretations, not final
acceptance evidence. Owners 0008, 0018 and 0035 and the full program audit remain open.

### Integrated corrections enter complete verification (2026-09-08)

Owner 0018 also corrects confirmed recursive name/definition publication and transaction commit
after disposal. The before/after public probes and 61 focused tests cover these additions. Fast
`2026-09-08T13-40-13-597Z-23188` passes all six gates and 1,687 unit tests on one unchanged 860-file
fingerprint; actual Code validation passes for owners 0008, 0018 and 0035. Owner 0018 enters
testing. All package ceilings and lint/coverage policies remain fixed.

Source review now covers 49 of 109 files, including `src/stores.ts`, with all current source hashes
verified. Claim review covers 20 sources and 821 authored units. The two changed store lifecycle
units and one new testing unit have explicit interpretations; all other IDs/text are unchanged.
Public store guidance, README and program-audit guidance remain in the unreviewed roster. Exact
current complete delivery and final immutable audit evidence remain outstanding.

### Delivery results and continued source review (2026-09-08)

Delivery `2026-09-08T13-42-53-776Z-36345` terminates with 11 of 13 gates passing and the unchanged
860-file fingerprint `07e2803817e2555147c4b4afe41f10be9568c6726d6d0311f5eec4ab5651ddea`. All 1,687
unit tests, 487 browser cases, 13 installed-package checks, seven release checks and detector
self-tests pass. Coverage rejects one unmapped declaration in the store cleanup helper; the ticket
validator cannot see owner 0018's passing fast table below a subsection. Both corrections were
prepared separately and integrated after the run ended. The isolated exact coverage run proves 17
hits on the corrected declaration, 40 passing store tests and unchanged package size ceilings.
Current fast, Code validation and complete delivery still remain required.

Draft semantic review now covers 58 of 109 runtime files, adding the six inspection modules and
persistence codec/data/envelope modules. The store declaration review identity is refreshed. All
source hashes are checked against current files. Claim review covers 21 sources and 859 authored
units after 38 explicit store-guide interpretations; all retain pending final evidence. Earlier
counts are historical checkpoints, not current acceptance.

New public probes confirm a listener left behind when persistence setup disposes its kernel, legacy
clipboard temporary DOM left behind after `execCommand` throws, and password-field/chart failures
after child-part replacement. Evidence is retained under
`.git/jqstar/program-audit/ownership-census/resume-2026-09-08/`. Owner 0019's reopening Plan passed
in the separate checkout; its persistence correction is under focused verification. UI owner
planning and all final acceptance remain pending. These sources receive no completed review credit
yet.

### Persistence correction and guide review (2026-09-08)

Owner 0019's reopened Plan and application-start extension pass validation before runtime changes.
The integrated attachment correction passes fast `2026-09-08T14-08-47-430Z-11571` with all six gates
and 1,716 unit tests; actual Code validation passes for 0008, 0018, 0019 and 0035. Owner 0018
returns to Test. A direct adapter probe then confirms late subscription cleanup and returned values
after wrapper disposal. The validated owner extension adds post-callback checks and immediate
cleanup handoff. All six new adapter cases fail original source and pass after correction; combined
persistence/store verification passes 156 cases. Current fast/Code and full delivery remain
required.

Claim review now covers 22 sources and 896 authored units. Two explicit new ownership/testing
paragraphs and all 35 persistence-guide units have individual interpretations. All current reviewed
source and record hashes match. Source ownership remains 58 of 109 files: the envelope checkpoint
has its own reviewed delta, while full persistence facade/adapter/attachment and UI source review
remain open. The source-wide and claim-wide final evidence cannot be inferred from these draft
checkpoints. No mutation tooling, commit or publication occurred.

### Complete verification starts for persistence correction (2026-09-08)

Fast `2026-09-08T14-12-42-342Z-25118` passes all six gates and 1,722 unit tests on matching 862-file
fingerprint `7498e867483a86bd78f1544cacb7b745a98682be660797c9e23653c7ed56412e`. Actual Code
validation executes successfully for owners 0008, 0018, 0019 and 0035. Persistence enters Test. The
next full run must cover the exact integrated sources and preserve every failure. The separate
owner-0006 UI correction Plan validates; no UI source is changed yet. Draft review remains 58
runtime sources and 896 authored units across 22 documentation sources.

### Green delivery and selective follow-up integration (2026-09-08)

Delivery `2026-09-08T14-15-52-232Z-38476` passes all 13 gates on unchanged fingerprint
`94a419d86cec0fc16bb5f8ec6203fc1fd7aef6fd997ba34c6e8fd290b0d7994d` across 862 files: 1,722 unit
tests, every changed executable line/function, 487 browser cases, all 13 installed-package checks,
seven release checks and detector self-tests. Actual Test validation then passes for owners
0008/0018 before Document changes. Both complete current acceptance evidence and pass Document
validation; owner 0018's first Document validation required the direct Test table to name the actual
quality:delivery alias. That failure and correction remain recorded. Both owner corrections are
done.

Owner 0006's validated UI Plan and owner 0019's validated facade-disposal extension are selectively
integrated after this green run ends. UI replacements and pending Code Block copies pass 63 focused
UI/patch/behavior cases; facade cleanup and other persistence/store cases pass 158. Earlier combined
coverage execution passes 219 before the final two Code Block tests/source change. Earlier runtime
builds remain under every fixed size ceiling. These are focused development results; current root
fast/Code and complete delivery are required. Source/claim review remains draft, and the new docs
must receive explicit unit interpretations before their hashes are called current.

### Integrated follow-up passes Code verification (2026-09-08)

Fast `2026-09-08T14-42-18-303Z-14009` passes all six gates and 1,740 unit tests on fingerprint
`ee02f19e72e485fb25795e93035cc0894db55fdcfcc967026c12f5828bdb196e` across 862 files. Actual Code
validation executes and passes for 0006, 0019 and 0035 before the Test documentation update. Owners
0006 and 0019 enter Test. The preceding fast run passed units but failed duplicated historical
headings and one spelling item in owner 0006; both documentation corrections retain the failed run.

Claim review now contains 902 authored units across 22 sources: six newly authored ownership,
testing and persistence units have explicit interpretations; all previous IDs/text are unchanged.
Current source/review hashes match. The component guide, README and program guide remain in the
unreviewed roster. Runtime-source review remains 58 of 109 files; source-wide and immutable final
audit evidence remain open. The next complete delivery checks the integrated follow-up tree.

### Native form and rendered-part ownership checkpoint (2026-09-08)

Completed delivery `2026-09-08T14-46-59-585Z-27573` retains matching start/end fingerprint
`c96f03f921f8d4f4c61a491be3bbb4e464a3f10fc2fd96b33b7749d7ed17b9cb` for 862 files. Eleven of 13 gates
pass, including 1,740 units, changed-code coverage and all 487 browser cases. Package validation and
its package-budget detector fixture fail on the same stale Mobile UMD measurement; the complete
report remains retained and grants no receipt or Test closure.

Further public probes find native form listener ownership defects in six UI controllers, stale File
Upload list and Multi Select tag rendering, and a replaced active Multi Select record that still
receives viewport work. Owner 0006 extends and validates Plan before each correction; 25 of 41 form
tests and all seven rendered-part tests fail their original behavior. The final combined
UI/patch/behavior set passes 152 cases across 16 suites. Focused lint and document spelling/markdown
pass. The first proposed form fix regressed native-value retention during form movement; retaining
and rebinding the existing same-part controller resolves it. Failed evidence remains preserved.

The six-source correction, two new test files and component/ownership/testing docs are now
integrated in the root after actual Plan validation. Isolated UMD is 463,352 bytes; UI ESM is
318,287 and CJS 317,149 bytes, all inside unchanged limits. The Mobile reference measurement is
corrected to the actual UMD size. Current root fast/Code and complete delivery are next; owners 0006
and 0019 remain open. No commit, publication or mutation tooling was performed.

Source review now covers 74 of 109 runtime files. New records cover three persistence sources, five
UI part sources, two UI helpers and six form-related sources; reviewed current hashes match.
Authored review now covers 908 units across 22 sources, including six explicitly interpreted
form/rendered-part units. The complete current candidate census, remaining 35 sources, remaining
public claims and immutable final evidence are still required. Deferred native-reset callbacks
remain an explicit follow-up review question, with no cancellation or heap-collection claim inferred
from form listener cleanup.

### Queued native reset correction (2026-09-08)

Root fast `2026-09-08T15-09-05-176Z-88743` passes all 1,788 units and static checks; formatting
alone fails in five edited Markdown files. Start/end fingerprints match across 864 files. The
formatter correction and complete failed report are retained.

The pending-reset source question now yields a public reproduction in Rating, Color Picker and Time
Picker: a queued former-controller callback overwrites replacement native values after completed
enhancement. Owner 0006 extends and validates Plan before adding current-record guards. Three
replacement tests fail original behavior; the three current-controller controls pass. The corrected
combined set passes 158 cases across 16 suites, and focused lint and the complete root
JavaScript/type/API build pass. Actual UMD is 463,437 bytes, UI ESM 318,372 and CJS 317,234 bytes,
inside unchanged limits; the recorded Mobile measurement matches. Current full proof is pending.

All 74 reviewed runtime source hashes are refreshed and verified. Claim review contains 911 units
across 22 sources: three added reset interpretations and two exact whitespace-only replacements from
formatting. Other controllers' deferred reset work remains an explicit unfinished source-review
question. No final acceptance, physical browser-task cancellation or collection proof is inferred.

### Number Field correction and review checkpoint (2026-09-08)

Fast `2026-09-08T15-16-15-237Z-3790` passes all six gates and 1,794 unit cases with identical
start/end fingerprint `61e8b127bd379850235fb40c0799df8b3aa0a0c9f7ec6a090613d85ba28eb8e0` across 864
files. That proves the queued-reset predecessor; no later Number Field code is included.

The complete Number Field source review and public probe confirm stale native parts after
re-enhancement. Owner 0006 validates an AC-09 Plan extension before fixing the early existing-record
return and omitted native change listener cleanup. Four new replacement cases fail original code;
the final UI/patch/behavior set passes 166 cases across 17 suites, focused lint passes, and the
complete root JavaScript/type/API build passes. UMD is 463,503 bytes, UI ESM 318,438 and CJS 317,300
bytes, within unchanged limits. The current Mobile reference measurement matches the root build.
Public component, ownership and testing documents describe the exact handoff.

Source review now covers 76 of 109 runtime files, including Number Field and Pagination; all
reviewed current source and record hashes match. Claim review contains 914 units across 22 sources,
with three explicitly interpreted Number Field additions and unchanged earlier IDs/text. The
remaining 33 runtime sources, public claim roster and immutable/manual evidence still prevent final
program acceptance. Current fast and full proof for the integrated Number Field correction are next.

### Viewer correction and review checkpoint (2026-09-08)

Fast `2026-09-08T15-23-06-500Z-18189` passes all six gates and 1,799 units on matching 864-file
fingerprint `cefc5c153a44658680f8e83177a4a8dbb8de921e40ee2171f67a33ca6654be91`. It includes Number
Field, before the next confirmed viewer defects returned owner 0006 to Plan. No current viewer
Code/Test closure is claimed from that predecessor.

JSON Viewer retained old parts and repeatedly rendered unchanged empty source. Log Viewer retained
old parts/listeners and applied a queued follow scroll after following was disabled. Owner 0006
validated AC-13 and corrected current part handoff, exact native listener release, normalized empty
JSON caching and deferred current-state checks. The new lifecycle suite fails 17 of 19 cases against
original code. Final focused UI/patch/behavior proof passes 198 cases across 20 suites, focused
ESLint and the full root JavaScript/type/API build pass. The first two size measurements exceed UI
ESM by 75 and 32 bytes; equivalent private record bookkeeping and one inlined helper bring current
UI ESM to 318,435, CJS to 317,297 and UMD to 463,500 within unchanged limits. The Mobile measurement
now records current UMD. Negative, intermediate and final evidence remain in the current audit
artifact directory.

Source review covers 78 of 109 runtime files. Claim review covers 918 units across 22 sources, with
four explicitly interpreted viewer additions and unchanged earlier units. All reviewed source and
record hashes match. These are draft semantic reviews: the remaining 31 runtime sources, 52 claim
sources, final immutable evidence and manual observations remain open. Current fast/Code and full
verification of the integrated UI and persistence corrections are next.

### Disclosure and Editable correction checkpoint (2026-09-08)

Viewer fast `2026-09-08T15-35-01-663Z-34774` passes all 1,818 units on matching 865-file fingerprint
`d2f094eb8aca0a240b55a9ca4610b9d79b966ef179b2a7e440733c60df3b9024`. Its only failed check requires
reducing JSON Viewer's now-unused redundant-condition allowance from three to two. Owner 0006
validates the next Plan before reducing that exact count and correcting the new Disclosure/Editable
findings. The detached old summary still emitted before-open, and Editable set still wrote detached
old parts. Original source fails 12 of 14 new regressions. Inspection catches an unintended public
event-field rename; seven added assertions reproduce it before the original `control` field is
restored. Declaration generation also catches a circular cleanup return type; an explicit `void`
callback annotation resolves it. All intermediate failures remain recorded.

Final focused proof passes 95 cases across 10 suites, focused ESLint, exact lint-boundary validation
and the full root JavaScript/type/API build. Current UMD is 463,412 bytes, UI ESM 318,347 and CJS
317,209 within unchanged budgets; the Mobile measurement is current. Source review now covers 81 of
109 runtime files, including Disclosure, Editable and Toggle. Claim review covers 922 units across
22 sources, with four explicitly interpreted additions and earlier units unchanged. All reviewed
source and record hashes match. Feed has been read, but its per-controller intersection observer
remains a lifetime review question without formal source credit. An earlier checkpoint update script
stopped on a missing paragraph substring after updating owner 0006; this checkpoint now records the
actual completed reviews.

Fast `2026-09-08T15-41-32-485Z-49295` passes all six gates and 1,832 unit tests with matching
866-file fingerprint `4e100cba7d3f92386e5c4b34a55976172ab0914e7725d1cd44be3f5517ecc429`. Actual Code
validation passes for owners 0006, 0019 and 0035 against that report before tracked
phase/documentation changes. Owner 0006 advances to testing and current full delivery is next. The
remaining 28 runtime sources, 52 claim sources and manual/immutable evidence remain open.

`countdown-parts-before.json` confirms the next source-review defect: after replaced parts and
completed enhancement, public start writes old detached seconds while the current seconds stays
empty. A controlled interval probe removes the root, runs the scheduled tick (which clears the
clock), reinserts and enhances the running countdown, and observes zero scheduled timers while its
state remains running with 45 seconds left. Countdown source is unchanged; no formal source credit
or correction is claimed. Prepare its owner Plan before changing behavior, preserving the current
full-run tree while continuing independent review.

### 2026-09-08 integrated Countdown, association and label review

Delivery `2026-09-08T15-44-03-102Z-62441` ends with 12 of 13 gates passing. All 1,832 units, all 487
browser cases, 13 package checks, seven release checks and detector self-tests pass. Only the
Editable placeholder function fails changed-function coverage. Start/end fingerprint is
`3754a3f22d13abdb7d367e8b16414ab0720f14d9f0a9cb2e950482192abef0a4` across 866 files. No receipt or
Test closure is claimed from that result.

Owner 0006 plans and integrates Countdown, Tabs/Dialog, Input OTP/Tags Input and the placeholder
removal after that run ends. Further public probes confirm native external Form controls are ignored
and floating title references remain stale. AC-18/19 Plan passes before fixes in their owner; 16 of
23 new cases fail original source and seven controls pass. The corrected Form/floating set passes 61
cases, production types and lint. Root JavaScript/type/API build passes after updating only the
existing API warning's source location. UMD is 463,042 bytes, UI ESM 317,980 and CJS 316,842, within
unchanged limits; Mobile measured metadata matches. Exact lint boundaries pass for 305 TypeScript
files and 304 file/rule counts. All failures and corrections remain under the current audit
directory.

Source review records 91 of 109 files, including eight newly reviewed UI sources and current
Editable/floating deltas; previous records are preserved. All current source/review hashes verify.
Claim review records 936 units across 22 sources after fourteen individual new interpretations with
no removed units. The remaining 18 runtime sources, 52 public sources, complete current census,
immutable execution/mapping evidence and real manual records remain open. Current combined fast/Code
and full/Test proof are next. No final audit acceptance or publication is implied.

Fast `2026-09-08T16-13-07-195Z-26520` passes all six gates and 1,886 unit tests on matching 871-file
fingerprint `d0dd7816c63d9e033176cfbc09cff98867d5954ed91a736ea82061820614bfd4`. Actual Code
validation passes for owners 0006, 0019 and 0035 before these tracked updates. Owner 0006 enters
testing and full delivery follows. Read-only continuation confirms two further owner-0006 issues in
`feed-scroller-before.json`: a queued Message Scroller scroll overrides a native unfollow, and Feed
article labels retain removed title/description IDs. Their owner Plan and correction remain next;
they are not credited as resolved by this predecessor verification.

### 2026-09-08 integrated remaining UI corrections

Delivery `2026-09-08T16-15-36-329Z-39703` finishes with twelve of thirteen gates passing. All 1,886
unit tests, 487 browser cases, thirteen package checks, seven release checks and detector tests
pass. Only unused Form cleanup and native OTP branches fail coverage. Start/end fingerprint
`e402e829bac05abe9ea048f0ecb25c390e8723b6466845e9289969b74ea460dc` matches across 871 files. This
failed report grants no Test closure or receipt.

Owner 0006 integrates the planned Feed/Scroller, Form/OTP, Resizable/Transfer List, cancellation and
Sortable corrections after the full run ends and root Plan passes. Stable isolated coverage passes
119 cases and the repository evaluator covers all changed lines/functions across nine selected
modules; this is not complete denominator or delivery evidence. A subsequent detached native-form
probe confirms parent Sortable rendering removes nested generated inputs. AC-26 Plan precedes the
closest-root filter; four of five new cases fail before correction. All 25 current root focused
cases pass, including the twelve Sortable lifecycle cases. Root JavaScript/types/API build and
standard lint boundaries pass. UMD 463,274, UI ESM 318,227 and CJS 317,074 remain within unchanged
budgets; Mobile metadata matches the actual build.

Draft review now covers 99 of 109 runtime sources and 958 authored units across 22 public sources.
All current reviewed source and record hashes verify; earlier records remain archived. Twenty-two
new claim units receive individual interpretations with no earlier units removed. Ten runtime
sources, 52 public sources, final census/bindings and immutable/manual evidence remain open. Fresh
fast/Code and complete full/Test verification are next; the umbrella grants no final acceptance.

Fast `2026-09-08T16-50-37-681Z-30674` passes all six gates and 1,940 unit tests on matching 876-file
fingerprint `33b30c7f70d1a19d422fc7e11c5860120726770307e957b4a98d2c6220548095`. Actual Code
validators pass for 0006, 0019 and 0035 before tracked updates; owner 0006 returns to testing and
complete delivery follows. Two earlier fast failures are retained: the same ticket spelling issue
persisted through an incorrectly targeted first edit and is now corrected.

Read-only bridge review confirms further disposal defects in `bridge-disposal-before.json`: htmx
waits for a host event after removing its listener, and Turbo throws when disposal encounters core
settlement. Owners 0036/0037 have validated reopening Plans and isolated corrections with five
original failures and 53 passing focused tests. Those changes are not in this root fast report;
current source review credit and final acceptance for the bridges remain pending integration and
verification. Root remains unchanged during the next full delivery.

### 2026-09-08 complete source pass and bridge integration

Delivery `2026-09-08T16-53-32-481Z-44155` passes every enforced gate: 1,940 unit cases, 487 browser
cases, full changed-code coverage, 13 package checks, seven release checks and detector self-tests.
Its 876-file start/end fingerprint is
`fc83d419cf48f197ce5fdab3c7416496f170c728da128418fbd8ff51c2f911db`. Actual Test validation passes
for owners 0006, 0019 and 0035 before any tracked edits. Owner 0019's Document validator first
rejects a missing direct delivery table row; the same executed report is added and both documenting
and done validations pass. Its reopened persistence criteria and completion audit are resolved.
Owner 0006 remains open for the final UI findings; 0035 still requires manual evidence.

The final ten source reads complete the first 109-source semantic pass. Retained public probes
confirm generated labels, cross-document Menu closure, obsolete Select/Combobox resets, duplicated
Combobox/Tree IDs, replaced picker callbacks/cache markers, Questionnaire stale callbacks and
canceled submitted state, disabled Tree activation and Data Table bulk selection. Historical row-ID
retention is also recorded from Data Table source. Owner 0006's extended Plan through AC-33 passes
in the isolated checkout; these additional UI changes have not begun.

Owners 0036/0037 now integrate only their reviewed bridge source/test/guide files after root Plan
validation. The normal root JavaScript/type/API build passes; htmx ESM is 17,969 and Turbo ESM 8,156
bytes within unchanged limits. All 54 focused bridge/render cases and their changed-code evaluator
pass. A new current fast/Code/full/Test sequence remains required. Previous UI delivery does not
cover this integration. No publication, external messages, mutation execution or source commit is
performed.

Source review records are refreshed for the integrated bridge delta, with all 109 current hashes
verified. Seven added ownership/testing units receive explicit interpretations, bringing draft claim
review to 965 authored units across 22 sources. All reviewed source/record hashes match; 52 public
sources, remaining owner corrections, final census and immutable/manual evidence are still pending.

The first bridge fast run `2026-09-08T17-16-43-355Z-7070` fails one of 1,950 unit cases, with all
five other gates passing. Mobile authority uses the mutable bridge ticket phase as imported
approval, creating a circular gate during mandatory reopening. Owner 0040 reopens AC-10/AC-13 with a
validated Plan: retain the decided browser/bridge outcome and exact choices, verify current package
export targets, and preserve every correction/final-audit gate. All 65 focused contract/bridge cases
pass. The requested property path was mistakenly plural and selected no property cases; run the
actual `test/property/jquery-mobile-migration.property.test.ts` before fresh fast/full verification.
Two new test-guide units are explicitly interpreted, bringing draft review to 967 units/22 sources.

Fast `2026-09-08T17-24-34-188Z-34093` passes all six gates and 1,950 unit tests on matching 877-file
fingerprint `e0dbec97889fffe1524f635645c70f8be5ee970440b1b17700998d9e423924a5`. Actual Code
validation passes for owners 0036, 0037 and 0040 before tracked edits. The prior retry passed all
units but rejected the obsolete non-null allowance and one ticket spelling word; those are corrected
without increasing any allowance. Mobile properties pass all three cases. The owners now enter
testing and a complete current delivery follows. Final UI fixes remain in the isolated checkout and
are not covered by this root report.

### Current bridge delivery and final UI integration (2026-09-08)

Delivery `2026-09-08T17-27-26-764Z-47398` passes all 13 gates: 1,950 units, 487 browser cases,
changed-code coverage, properties, static checks, 13 package checks, seven release checks and
detector self-tests. Start/end fingerprint is
`f6e6ec7b3a6db152491b0806b13c356f3daf94ef18e67d07fe3030692a613725` over 877 files. Actual Test
commands for 0036/0037/0040 pass before tracked edits. Mobile owner 0040 completes Document; the
bridges retain an open common UI coexistence finding.

The public `ui-removal-contract-before.json` reproduction uses real jQuery, core, UI and render
adapter APIs with a controlled interval scheduler. Countdown's interval survives beforeRemove and
commit until a detached tick, and survives kernel disposal while connected. Preserved live-node
controls keep their clock. This contradicts the interoperability promise that controllers clean
before removal; the current Toggle-only coexistence test does not establish all resource cleanup.
Owner 0006/common contract 0016 must correct and verify the behavior, followed by the actual host
matrices. No runtime fix belongs in umbrella 0033.

The final thirteen-module UI batch is integrated only after root Plan validation, with four new
lifecycle suites and three guide updates. Current isolated coverage passes 525 cases in 67 suites
and all changed executable lines/functions. Types, lint and boundary checks pass without increased
allowances. Root build measures UI ESM 317,243 bytes, CommonJS 316,105 and UMD 462,311, below fixed
limits. The first normal API check fails only for its existing warning moving from source line 610
to 583; the exact generated relative-path report is adopted and the declaration/API rerun passes.
Current root fast and full delivery follow; predecessor green evidence does not cover this batch.

All 109 runtime source hashes and review records now match after explicit correction
interpretations. The first refresh script omits Toast and correctly fails the global hash assertion
before publishing its index; the missing interpretation is added and all hashes reverified. Original
records remain archived. Public review reaches 1,026 units across 23 sources, including 49
interoperability units, ten new guide units and three rewritten ownership paragraphs. The 51
remaining public sources, final census/bindings, manual accessibility and other acceptance
prerequisites remain open. Seven linked upstream pages are retained with retrieval time and hashes;
the public fetch fallback records the web tool's revoked-token failure without treating it as source
proof.

### September 17 continuation: verification and toolchain correction

The saved fast report still matches the resumed worktree and actual Code validation passes for 0006.
Delivery `2026-09-17T14-37-33-953Z-21874` passes all 2,005 units, coverage and properties. It fails
the newly edited ticket ledger/format and current dependency security checks. The run is
deliberately interrupted during self-hosted verification; remaining gates that did not start are
errors. This result supplies no delivery receipt. Owner 0006 corrects its ledger and extra blank
line.

Owner 0052 reopens with a validated Plan for the reported Vitest and TOML tool dependencies. Exact
Vitest/coverage-v8 4.1.11 and a markdownlint-cli2-only `smol-toml` 1.7.1 override install
successfully. Both dependency scanners and TypeScript checks pass. Full current verification remains
required. The Countdown cleanup finding still needs its owner correction; this toolchain change does
not resolve UI lifecycle work or complete the program audit. Previous source/claim review hashes
must be refreshed for any later authored changes before final acceptance.
